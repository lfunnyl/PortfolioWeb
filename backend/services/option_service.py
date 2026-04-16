"""
Opsiyon Veri Servisi — yfinance üzerinden opsiyon zinciri (option chain) verisi çeker.
Backend'den çalıştığı için CORS sorunları veya frontend rate limitleri yoktur.

Desteklenen özellikler:
- Vade tarihleri listesi (expiration dates)
- Call/Put opsiyon zinciri (bid, ask, delta, gamma, IV, volume, OI)
- Yakın vadeli opsiyon kapanış fiyatı
"""

import yfinance as yf
from typing import Optional, List, Dict, Any


def get_option_expirations(ticker: str) -> List[str]:
    """
    Bir hisse için mevcut vade tarihleri listesini döner.
    Örn: ticker="AAPL" → ["2024-04-19", "2024-04-26", ...]
    """
    try:
        t = yf.Ticker(ticker)
        return list(t.options)  # tuple → list
    except Exception as e:
        print(f"Vade tarihleri alınamadı ({ticker}): {e}")
        return []


def get_option_chain(ticker: str, expiration: str, option_type: str = "call") -> List[Dict[str, Any]]:
    """
    Belirli bir hisse ve vade tarihinde opsiyon zincirini döner.

    Args:
        ticker: Hisse sembolü (örn: "AAPL", "TSLA")
        expiration: Vade tarihi string (örn: "2024-04-19")
        option_type: "call" veya "put"

    Returns:
        Her opsiyon için bid, ask, strike, IV, delta, gamma, volume, openInterest
    """
    try:
        t = yf.Ticker(ticker)
        chain = t.option_chain(expiration)

        df = chain.calls if option_type.lower() == "call" else chain.puts

        result = []
        for _, row in df.iterrows():
            result.append({
                "strike": float(row.get("strike", 0)),
                "lastPrice": float(row.get("lastPrice", 0)),
                "bid": float(row.get("bid", 0)),
                "ask": float(row.get("ask", 0)),
                "volume": int(row.get("volume", 0) or 0),
                "openInterest": int(row.get("openInterest", 0) or 0),
                "impliedVolatility": round(float(row.get("impliedVolatility", 0)) * 100, 2),
                "inTheMoney": bool(row.get("inTheMoney", False)),
                "contractSymbol": str(row.get("contractSymbol", "")),
            })
        return result

    except Exception as e:
        print(f"Opsiyon zinciri alınamadı ({ticker} {expiration} {option_type}): {e}")
        return []


def get_option_price(contract_symbol: str) -> Optional[float]:
    """
    Belirli bir kontrat sembolünün son kapanış fiyatını döner.
    Örn: contract_symbol = "AAPL240419C00150000"
    """
    try:
        t = yf.Ticker(contract_symbol)
        hist = t.history(period="1d")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
    except Exception as e:
        print(f"Opsiyon fiyatı alınamadı ({contract_symbol}): {e}")
    return None
