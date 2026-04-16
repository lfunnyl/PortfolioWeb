"""
Opsiyon API Router — Frontend'in opsiyon verisi çektiği endpoint'ler.
Tüm veri yfinance üzerinden backend'de çekilir (CORS/rate-limit sorunu yok).
"""

from fastapi import APIRouter, HTTPException
from services.option_service import (
    get_option_expirations,
    get_option_chain,
    get_option_price,
)

router = APIRouter()


@router.get("/{ticker}/expirations")
def option_expirations(ticker: str):
    """
    Bir hisse için mevcut opsiyon vade tarihlerini döner.
    Örn: GET /api/options/AAPL/expirations
    """
    dates = get_option_expirations(ticker.upper())
    if not dates:
        raise HTTPException(status_code=404, detail=f"{ticker} için vade tarihi bulunamadı.")
    return {"ticker": ticker.upper(), "expirations": dates}


@router.get("/{ticker}/chain")
def option_chain(ticker: str, expiration: str, type: str = "call"):
    """
    Belirli hisse ve vade için opsiyon zincirini döner.
    Örn: GET /api/options/AAPL/chain?expiration=2024-04-19&type=call

    type: "call" veya "put"
    """
    if type.lower() not in ("call", "put"):
        raise HTTPException(status_code=400, detail="type parametresi 'call' veya 'put' olmalı.")

    chain = get_option_chain(ticker.upper(), expiration, type)
    if not chain:
        raise HTTPException(
            status_code=404,
            detail=f"{ticker} {expiration} {type} için opsiyon verisi bulunamadı."
        )
    return {"ticker": ticker.upper(), "expiration": expiration, "type": type, "chain": chain}


@router.get("/contract/{symbol}/price")
def contract_price(symbol: str):
    """
    Belirli bir opsiyon kontrakt sembolünün son fiyatını döner.
    Örn: GET /api/options/contract/AAPL240419C00150000/price
    """
    price = get_option_price(symbol.upper())
    if price is None:
        raise HTTPException(status_code=404, detail=f"{symbol} için fiyat alınamadı.")
    return {"symbol": symbol.upper(), "lastPrice": price}
