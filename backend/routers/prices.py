from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from pydantic import BaseModel
from typing import List
import asyncio
from services.price_service import fetch_bulk_prices

router = APIRouter()

class AssetMapRequest(BaseModel):
    asset_ids: List[str]

@router.websocket("/ws")
async def websocket_prices(websocket: WebSocket, assets: str):
    await websocket.accept()
    asset_list = [a.strip() for a in assets.split(",")]
    if not asset_list:
        await websocket.close()
        return

    try:
        while True:
            # Perform blocking DB/API ops in a thread if needed, but since it's a loop it's okay for now.
            db = SessionLocal()
            try:
                # WebSocket üzerinden her 1 dakikada bir cache yenilemeye zorla (daha taze fiyatlar)
                prices = fetch_bulk_prices(db, asset_list, cache_minutes=1)
                await websocket.send_json(prices)
            finally:
                db.close()
            # 15 saniyede bir fiyatları gönder
            await asyncio.sleep(15)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print("WebSocket Error:", e)
        try:
            await websocket.close()
        except:
            pass

@router.post("/bulk")
def get_prices_bulk(request: AssetMapRequest, db: Session = Depends(get_db)):
    """
    Belirtilen varlıkların en güncel TRY fiyatlarını (önbellek veya yfinance üzerinden) döndürür.
    """
    return fetch_bulk_prices(db, request.asset_ids)

@router.get("/{asset_id}")
def get_price(asset_id: str, db: Session = Depends(get_db)):
    res = fetch_bulk_prices(db, [asset_id])
    return {"asset_id": asset_id, "current_price": res.get(asset_id, 0.0)}

@router.get("/historical/{ticker}")
def get_historical_price(ticker: str, date: str):
    """
    Fetches the historical close price for a given ticker and date (YYYY-MM-DD).
    Returns raw price without currency conversions.
    """
    import yfinance as yf
    from datetime import datetime, timedelta
    import pandas as pd
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        dt_start = dt - timedelta(days=5) # 5 days backward to find last closing price relative to date
        dt_end = dt + timedelta(days=5) 
        data = yf.download(ticker, start=dt_start.strftime("%Y-%m-%d"), end=dt_end.strftime("%Y-%m-%d"), progress=False)
        if not data.empty:
            close_data = data["Close"]
            if isinstance(close_data, pd.DataFrame):
                series = close_data.iloc[:, 0].dropna()
            else:
                series = close_data.dropna()
                
            past_series = series[:date]
            if not past_series.empty:
                val = past_series.iloc[-1]
            else:
                val = series.iloc[0]
            return {"ticker": ticker, "date": date, "price": float(val)}
    except Exception as e:
        print(f"Historical error for {ticker}:", e)
    return {"ticker": ticker, "date": date, "price": 0.0}

@router.get("/chart/{ticker}")
def get_chart_data(ticker: str, range: str = "1mo"):
    """
    Fetches chart data for a given ticker and range.
    Expected output: list of {"date": "YYYY-MM-DD", "price": 123.45}
    """
    import yfinance as yf
    import pandas as pd
    
    # Map frontend TimeRange if needed, else assume yf range is provided
    # frontend TimeRange: '1W' = '5d', '1M' = '1mo', '3M' = '3mo', '6M' = '6mo', '1Y' = '1y', 'YTD' = 'ytd'
    range_map = {
        '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', 'YTD': 'ytd'
    }
    yf_range = range_map.get(range, range)
    interval = '1d'

    result = []
    try:
        data = yf.download(ticker, period=yf_range, interval=interval, progress=False)
        if not data.empty:
            close_data = data["Close"]
            if isinstance(close_data, pd.DataFrame):
                series = close_data.iloc[:, 0].dropna()
            else:
                series = close_data.dropna()
                
            for dt, val in series.items():
                result.append({
                    "date": dt.strftime("%Y-%m-%d"),
                    "price": float(val)
                })
    except Exception as e:
        pass
    return result

@router.get("/signals/{ticker}")
def get_technical_signals(ticker: str):
    """
    Calculates advanced Technical Signals including RSI, MACD, Golden Cross, Bollinger Bands, and Volume Anomalies.
    """
    import yfinance as yf
    import pandas as pd
    import numpy as np
    
    try:
        # Fetch 1-year of data to have enough history for 200-day MA and 52W High/Low
        data = yf.download(ticker, period="1y", interval="1d", progress=False)
        if data.empty:
            return {"error": "No data"}
            
        # Extract Close and Volume
        if isinstance(data["Close"], pd.DataFrame):
            df_close = data["Close"].iloc[:, [0]].dropna()
            df_close.columns = ["Close"]
            df_vol = data["Volume"].iloc[:, [0]].dropna()
            df_vol.columns = ["Volume"]
            df = df_close.join(df_vol)
        else:
            df = pd.DataFrame({
                "Close": data["Close"].dropna(),
                "Volume": data["Volume"].dropna()
            })
            
        # --- RSI (14) ---
        delta = df["Close"].diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)
        avg_gain = gain.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
        rs = avg_gain / avg_loss
        df["RSI"] = 100 - (100 / (1 + rs))
        
        # --- MACD (12, 26, 9) ---
        ema12 = df["Close"].ewm(span=12, adjust=False).mean()
        ema26 = df["Close"].ewm(span=26, adjust=False).mean()
        df["MACD"] = ema12 - ema26
        df["Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
        df["Histogram"] = df["MACD"] - df["Signal"]

        # --- Moving Averages (50, 200) for Golden/Death Cross ---
        df["SMA_50"] = df["Close"].rolling(window=50).mean()
        df["SMA_200"] = df["Close"].rolling(window=200).mean()

        # --- Bollinger Bands (20) ---
        df["SMA_20"] = df["Close"].rolling(window=20).mean()
        df["BB_std"] = df["Close"].rolling(window=20).std()
        df["BB_upper"] = df["SMA_20"] + (df["BB_std"] * 2)
        df["BB_lower"] = df["SMA_20"] - (df["BB_std"] * 2)

        # --- Volume Anomaly ---
        df["Vol_Avg_20"] = df["Volume"].rolling(window=20).mean()

        # Extract last valid rows
        last_row = df.iloc[-1]
        prev_row = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
        
        # --- Calculate Metrics & Signals ---
        current_price = float(last_row["Close"])

        # 1. RSI Signal
        rsi_val = float(last_row["RSI"]) if not pd.isna(last_row["RSI"]) else 50.0
        rsi_signal = "NÖTR"
        if rsi_val >= 70: rsi_signal = "SAT (Aşırı Alım)"
        elif rsi_val <= 30: rsi_signal = "AL (Aşırı Satım)"

        # 2. MACD Signal
        macd_val = float(last_row["MACD"]) if not pd.isna(last_row["MACD"]) else 0.0
        signal_val = float(last_row["Signal"]) if not pd.isna(last_row["Signal"]) else 0.0
        hist_val = float(last_row["Histogram"]) if not pd.isna(last_row["Histogram"]) else 0.0
        macd_signal = "NÖTR"
        if last_row["MACD"] > last_row["Signal"] and prev_row["MACD"] <= prev_row["Signal"]:
            macd_signal = "GÜÇLÜ AL (Yukarı Kesişim)"
        elif last_row["MACD"] < last_row["Signal"] and prev_row["MACD"] >= prev_row["Signal"]:
            macd_signal = "GÜÇLÜ SAT (Aşağı Kesişim)"
        elif hist_val > 0: macd_signal = "AL (Trend Pozitif)"
        else: macd_signal = "SAT (Trend Negatif)"

        # 3. 52-Week High / Drawdown Tracking
        high_52w = float(df["Close"].max())
        low_52w = float(df["Close"].min())
        dist_to_high = ((high_52w - current_price) / high_52w) * 100
        
        # 4. Golden / Death Cross
        ma_cross = "NÖTR"
        if not pd.isna(last_row["SMA_50"]) and not pd.isna(last_row["SMA_200"]):
            if last_row["SMA_50"] > last_row["SMA_200"] and prev_row["SMA_50"] <= prev_row["SMA_200"]:
                ma_cross = "🎉 GOLDEN CROSS (Boğa Piyasası)"
            elif last_row["SMA_50"] < last_row["SMA_200"] and prev_row["SMA_50"] >= prev_row["SMA_200"]:
                ma_cross = "⚠️ DEATH CROSS (Ayı Piyasası)"
            elif last_row["SMA_50"] > last_row["SMA_200"]:
                ma_cross = "Pozitif (50 MA > 200 MA)"
            else:
                ma_cross = "Negatif (50 MA < 200 MA)"

        # 5. Volume Anomaly
        vol_anomaly = "Normal"
        curr_vol = float(last_row["Volume"])
        avg_vol = float(last_row["Vol_Avg_20"])
        if curr_vol > avg_vol * 2:
            vol_anomaly = f"Aşırı Hacim ({round(curr_vol/avg_vol, 1)}x artış)"
        elif curr_vol > avg_vol * 1.5:
            vol_anomaly = f"Yüksek Hacim"

        # 6. Bollinger Squeeze (Daralma)
        bb_width = 0.0
        bb_signal = "Normal"
        if not pd.isna(last_row["BB_upper"]) and not pd.isna(last_row["BB_lower"]):
            bb_width = float((last_row["BB_upper"] - last_row["BB_lower"]) / last_row["SMA_20"]) * 100
            if bb_width < 5.0: # Arbitrary threshold for tight squeeze
                bb_signal = "Sıkışma (Sert hareket yaklaşıyor)"
            elif current_price > last_row["BB_upper"]:
                bb_signal = "Üst Bandı Kırdı"
            elif current_price < last_row["BB_lower"]:
                bb_signal = "Alt Bandı Kırdı"

        # Overall trend simplification
        score = 0
        if "AL" in rsi_signal: score += 1
        elif "SAT" in rsi_signal: score -= 1
        
        if "GÜÇLÜ AL" in macd_signal: score += 2
        elif "AL" in macd_signal: score += 1
        elif "GÜÇLÜ SAT" in macd_signal: score -= 2
        elif "SAT" in macd_signal: score -= 1

        if "GOLDEN CROSS" in ma_cross: score += 3
        elif "DEATH CROSS" in ma_cross: score -= 3
        elif "Pozitif" in ma_cross: score += 1
        elif "Negatif" in ma_cross: score -= 1

        overall = "NÖTR"
        if score >= 3: overall = "GÜÇLÜ AL"
        elif score > 0: overall = "AL"
        elif score <= -3: overall = "GÜÇLÜ SAT"
        elif score < 0: overall = "SAT"
            
        return {
            "ticker": ticker,
            "price": current_price,
            "overall_signal": overall,
            "details": {
                "rsi": { "value": round(rsi_val, 2), "signal": rsi_signal },
                "macd": { "macd_line": round(macd_val, 2), "signal_line": round(signal_val, 2), "histogram": round(hist_val, 2), "signal": macd_signal },
                "high_52w": { "value": round(high_52w, 2), "dist_pct": round(dist_to_high, 2) },
                "ma_cross": ma_cross,
                "vol_anomaly": vol_anomaly,
                "bollinger": bb_signal
            }
        }
        
    except Exception as e:
        return {"error": str(e)}


@router.get("/forecast/{ticker}")
def get_price_forecast(ticker: str, days: int = 30):
    """
    Single Exponential Smoothing + Drift ile fiyat tahmini.
    Bootstrapped %90 guven araligi. Ek kutüphane gerektirmez.
    """
    import yfinance as yf
    import pandas as pd
    import numpy as np

    try:
        data = yf.download(ticker, period="1y", interval="1d", progress=False)
        if data.empty:
            return {"error": "Veri bulunamadi"}

        close = data["Close"]
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]
        close = close.dropna()

        if len(close) < 30:
            return {"error": "Yeterli veri yok (min 30 gun)"}

        vals = close.values.astype(float)

        def ses_forecast(series, alpha, h):
            level = series[0]
            for v in series[1:]:
                level = alpha * v + (1 - alpha) * level
            drift = float(np.mean(np.diff(series[-20:]))) if len(series) >= 20 else 0.0
            return [level + drift * i for i in range(1, h + 1)]

        best_alpha, best_mse = 0.3, float("inf")
        for a in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
            preds = [ses_forecast(vals[:i], a, 1)[0] for i in range(20, len(vals))]
            actuals = list(vals[20:])
            mse = float(np.mean((np.array(preds) - np.array(actuals)) ** 2))
            if mse < best_mse:
                best_mse, best_alpha = mse, a

        forecast_vals = ses_forecast(vals, best_alpha, days)

        fitted = [ses_forecast(vals[:i], best_alpha, 1)[0] for i in range(1, len(vals))]
        residuals = vals[1:] - np.array(fitted)
        std_res = float(np.std(residuals))
        z90 = 1.645
        lower = [f - z90 * std_res * (i + 1) ** 0.5 for i, f in enumerate(forecast_vals)]
        upper = [f + z90 * std_res * (i + 1) ** 0.5 for i, f in enumerate(forecast_vals)]

        last_date = close.index[-1]
        future_dates = pd.bdate_range(start=last_date, periods=days + 1)[1:]

        hist_slice = close.tail(60)
        history = [
            {"date": str(d.date()), "price": round(float(v), 4)}
            for d, v in zip(hist_slice.index, hist_slice.values)
        ]
        forecast = [
            {
                "date": str(d.date()),
                "price": round(float(p), 4),
                "lower": round(float(l), 4),
                "upper": round(float(u), 4),
            }
            for d, p, l, u in zip(future_dates, forecast_vals, lower, upper)
        ]

        current_price = float(vals[-1])
        forecast_end  = forecast_vals[-1]
        change_pct    = ((forecast_end - current_price) / current_price) * 100

        return {
            "ticker": ticker,
            "alpha": round(best_alpha, 2),
            "current_price": round(current_price, 4),
            "forecast_end_price": round(forecast_end, 4),
            "forecast_change_pct": round(change_pct, 2),
            "confidence": 90,
            "history": history,
            "forecast": forecast,
        }

    except Exception as e:
        return {"error": str(e)}

