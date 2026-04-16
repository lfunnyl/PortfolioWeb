from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
from typing import List
from services.price_service import fetch_bulk_prices

router = APIRouter()

class AssetMapRequest(BaseModel):
    asset_ids: List[str]

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
        dt_end = dt + timedelta(days=5) # 5 day margin for weekend gap
        data = yf.download(ticker, start=dt.strftime("%Y-%m-%d"), end=dt_end.strftime("%Y-%m-%d"), progress=False)
        if not data.empty:
            close_data = data["Close"]
            if isinstance(close_data, pd.DataFrame):
                val = close_data[ticker].dropna().iloc[0]
            else:
                val = close_data.dropna().iloc[0]
            return {"ticker": ticker, "date": date, "price": float(val)}
    except Exception as e:
        pass
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
                series = close_data[ticker].dropna()
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


