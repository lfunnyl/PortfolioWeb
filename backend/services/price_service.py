import yfinance as yf
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

def get_yfinance_ticker(asset_id: str) -> str:
    asset_id_upper = asset_id.upper()
    if asset_id_upper == "TRY_CASH":
        return None
    elif asset_id_upper in ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "TRX", "LINK", "DOT", "MATIC", "LTC", "SHIB", "UNI", "ATOM", "XLM", "ETC", "BCH", "ALGO", "VET", "FIL", "ICP", "APT", "ARB", "OP", "SUI", "NEAR", "INJ", "PEPE", "TON", "RENDER", "FET", "AAVE", "MKR"]:
        return f"{asset_id_upper}-USD"
    elif asset_id_upper == "XAU": return "GC=F" # Gold
    elif asset_id_upper == "XAG": return "SI=F" # Silver
    elif asset_id_upper == "XPT": return "PL=F" # Platinum
    elif asset_id_upper == "XPD": return "PA=F" # Palladium
    elif asset_id_upper in ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD", "CNY"]:
        if asset_id_upper == "USD":
            return "TRY=X"
        return f"{asset_id_upper}TRY=X"
    else:
        US_STOCKS = ["AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "GOOGL", "META", "NFLX", "PLTR", "COIN", "MSTR", "AMD", "INTC", "JPM", "BAC", "V", "MA", "DIS", "BABA", "UBER", "SPOT", "SHOP", "SQ", "PYPL", "CRM", "ADBE", "ORCL", "IBM", "WMT", "KO", "PEP", "SBUX", "MCD", "XOM", "BRK-B"]
        if asset_id_upper in US_STOCKS:
            return asset_id_upper
        if not asset_id_upper.endswith(".IS") and len(asset_id_upper) <= 5 and asset_id_upper.isalpha():
            return f"{asset_id_upper}.IS"
        return asset_id_upper

def fetch_bulk_prices(db: Session, asset_ids: list[str], cache_minutes: int = 15) -> dict:
    CACHE_DURATION = timedelta(minutes=cache_minutes)
    now = datetime.utcnow()
    result = {"TRY_CASH": 1.0}
    need_fetch = []

    # 1. DB Cache Check
    for aid in asset_ids:
        if aid == "TRY_CASH": continue
        cached = db.query(models.PriceCache).filter(models.PriceCache.asset_id == aid).first()
        if cached and (now - cached.updated_at) < CACHE_DURATION:
            result[aid] = cached.price
        else:
            need_fetch.append(aid)

    if not need_fetch:
        return result

    # 2. Collect Tickers
    asset_to_ticker = {}
    for aid in need_fetch:
        t = get_yfinance_ticker(aid)
        if t:
            asset_to_ticker[aid] = t

    tickers_to_fetch = list(set(asset_to_ticker.values()))

    needs_usd = any(
        not t.endswith(".IS") and not t.endswith("TRY=X") and not t.endswith("=X")
        for t in tickers_to_fetch
    )
    if needs_usd and "TRY=X" not in tickers_to_fetch:
        tickers_to_fetch.append("TRY=X")

    usd_try_rate = 1.0

    # 3. yfinance Download — sağlam multi-index parse
    if tickers_to_fetch:
        tickers_str = " ".join(tickers_to_fetch)
        try:
            import pandas as pd
            raw = yf.download(tickers_str, period="2d", progress=False, auto_adjust=True)

            def safe_close(ticker_sym: str) -> float:
                """MultiIndex veya düz DataFrame'den Close değerini çıkarır."""
                try:
                    if isinstance(raw.columns, pd.MultiIndex):
                        # ('Close', 'THYAO.IS') şeklinde
                        if ("Close", ticker_sym) in raw.columns:
                            series = raw[("Close", ticker_sym)].dropna()
                            if not series.empty:
                                return float(series.iloc[-1])
                    else:
                        # Tek ticker indirildiyse düz columns
                        if "Close" in raw.columns:
                            series = raw["Close"].dropna()
                            if not series.empty:
                                return float(series.iloc[-1])
                except Exception:
                    pass
                return 0.0

            # USD/TRY kuru
            usd_try_rate = safe_close("TRY=X") or 1.0

            for aid in need_fetch:
                t = asset_to_ticker.get(aid)
                price = 0.0
                if t:
                    price = safe_close(t)

                    # TRY'ye çevir
                    if aid in ["XAU", "XAG", "XPT", "XPD"]:
                        price = (price * usd_try_rate) / 31.1035  # troy oz → gram TRY
                    elif t and (
                        t.endswith("-USD") or
                        t in ["AAPL","TSLA","NVDA","AMZN","MSFT","GOOGL","META","NFLX",
                               "PLTR","COIN","MSTR","AMD","INTC","JPM","BAC","V","MA",
                               "DIS","BABA","UBER","SPOT","SHOP","SQ","PYPL","CRM",
                               "ADBE","ORCL","IBM","WMT","KO","PEP","SBUX","MCD","XOM","BRK-B"]
                    ):
                        price = price * usd_try_rate

                # Cache'i güncelle
                if price > 0:
                    result[aid] = price
                cached_row = db.query(models.PriceCache).filter(models.PriceCache.asset_id == aid).first()
                if cached_row:
                    if price > 0:
                        cached_row.price = price
                    cached_row.updated_at = now
                else:
                    db.add(models.PriceCache(asset_id=aid, price=price, updated_at=now))

        except Exception as e:
            print("YFinance fetch error:", e)

    db.commit()
    return result
