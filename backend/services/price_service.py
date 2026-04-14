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

def fetch_bulk_prices(db: Session, asset_ids: list[str]) -> dict:
    CACHE_DURATION = timedelta(minutes=15)
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
    tickers_to_fetch = []
    asset_to_ticker = {}
    for aid in need_fetch:
        t = get_yfinance_ticker(aid)
        if t:
            tickers_to_fetch.append(t)
            asset_to_ticker[aid] = t
            
    is_usd_conversion_needed = any(a in tickers_to_fetch for a in ["AAPL", "BTC-USD", "GC=F"]) or any(not t.endswith(".IS") and not t.endswith("TRY=X") for t in tickers_to_fetch)
    usd_try_rate = 1.0

    if is_usd_conversion_needed and "TRY=X" not in tickers_to_fetch:
        tickers_to_fetch.append("TRY=X")

    # 3. Yfinance Fast Download
    if tickers_to_fetch:
        tickers_str = " ".join(set(tickers_to_fetch))
        try:
            # We use history to stay within yfinance limits effectively
            data = yf.download(tickers_str, period="1d", group_by="ticker", progress=False)
            
            # Extract USD/TRY rate
            if "TRY=X" in data and not data["TRY=X"].empty:
                usd_try_rate = float(data["TRY=X"]["Close"].iloc[-1])
            elif "TRY=X" == tickers_str and not data.empty:
                usd_try_rate = float(data["Close"].iloc[-1])
                
            for aid in need_fetch:
                t = asset_to_ticker.get(aid)
                price = 0.0
                if t:
                    try:
                        # yf.download structure depends on number of tickers
                        if len(set(tickers_to_fetch)) == 1:
                            if not data.empty:
                                price = float(data["Close"].iloc[-1])
                        else:
                            if t in data and not data[t].empty:
                                price = float(data[t]["Close"].iloc[-1])
                    except Exception as e:
                        pass
                
                # Conversions to TRY 
                if aid in ["XAU", "XAG", "XPT", "XPD"]:
                    price = (price * usd_try_rate) / 31.1035 # Troy Oz to Gram in TRY
                elif t and (t.endswith("-USD") or t in ["AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "GOOGL", "META", "NFLX", "PLTR", "COIN", "MSTR", "AMD", "INTC", "JPM", "BAC", "V", "MA", "DIS", "BABA", "UBER", "SPOT", "SHOP", "SQ", "PYPL", "CRM", "ADBE", "ORCL", "IBM", "WMT", "KO", "PEP", "SBUX", "MCD", "XOM", "BRK-B"]):
                    price = price * usd_try_rate
                
                if price > 0:
                    result[aid] = price
                    cached = db.query(models.PriceCache).filter(models.PriceCache.asset_id == aid).first()
                    if cached:
                        cached.price = price
                        cached.updated_at = now
                    else:
                        db.add(models.PriceCache(asset_id=aid, price=price, updated_at=now))
        except Exception as e:
            print("YFinance fetch error:", e)

    db.commit()
    return result
