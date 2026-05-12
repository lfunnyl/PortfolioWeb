"""
Pasif Gelir Akışları (Income Streams) Router
- Kira Geliri      → Manuel giriş, aylık birikimli hesaplama
- Mevduat Faizi    → Anapara + faiz oranı, otomatik vade faiz hesabı
- Hisse Temettüsü  → Yahoo Finance'ten otomatik çekme
- Kripto Staking   → Binance API'den otomatik çekme (varsa connector)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import yfinance as yf
import pandas as pd
from datetime import datetime, date, timedelta
import json

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class IncomeStreamCreate(BaseModel):
    name: str
    type: str           # 'rent' | 'deposit' | 'dividend_auto' | 'staking_auto' | 'other'
    amount: float       # Aylık tutar (kira) veya anapara (mevduat)
    currency: str = "TRY"
    # Mevduat için ek alanlar
    interest_rate: Optional[float] = None   # Yıllık faiz oranı (%)
    start_date: Optional[str] = None        # Başlangıç tarihi (YYYY-MM-DD)
    end_date: Optional[str] = None          # Vade tarihi (mevduat)
    # Hisse/Kripto bağlantısı
    asset_id: Optional[str] = None          # Hangi ticker'a bağlı (temettü için)
    note: Optional[str] = None

class IncomeStreamOut(IncomeStreamCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ── Helper: Mevduat faiz hesabı ───────────────────────────────────────────────
def calc_deposit_income(amount: float, rate_annual: float, start: date, end_date_str: Optional[str]) -> dict:
    """Günlük faiz birikimini hesaplar (Basit Faiz)."""
    today = date.today()
    end = date.fromisoformat(end_date_str) if end_date_str else today
    effective_end = min(end, today)
    days = max(0, (effective_end - start).days)
    daily_rate = rate_annual / 100 / 365
    accrued = amount * daily_rate * days
    monthly_est = amount * daily_rate * 30
    return {
        "days_elapsed": days,
        "accrued_interest": round(accrued, 2),
        "monthly_estimate": round(monthly_est, 2),
        "total_value": round(amount + accrued, 2),
        "is_matured": date.today() > end if end_date_str else False,
    }


# ── Helper: Yahoo Finance temettü çekme ──────────────────────────────────────
def fetch_dividends_yahoo(ticker: str, quantity: float, usd_try: float, months: int = 12) -> list:
    """Son N ay içindeki temettü ödemelerini çeker."""
    try:
        t = yf.Ticker(ticker)
        divs = t.dividends
        if divs is None or divs.empty:
            return []
        cutoff = pd.Timestamp.now(tz='UTC') - pd.DateOffset(months=months)
        recent = divs[divs.index >= cutoff]
        results = []
        for dt, amount_per_share in recent.items():
            total = float(amount_per_share) * quantity
            currency = "USD" if not ticker.endswith(".IS") else "TRY"
            total_try = total * usd_try if currency == "USD" else total
            results.append({
                "date": str(dt.date()),
                "amount_per_share": round(float(amount_per_share), 6),
                "quantity": quantity,
                "total_raw": round(total, 4),
                "currency": currency,
                "total_try": round(total_try, 2),
            })
        return results
    except Exception as e:
        print(f"Yahoo dividend error for {ticker}: {e}")
        return []


# ── CRUD Endpoints ────────────────────────────────────────────────────────────

@router.get("/streams", response_model=List[dict])
def get_income_streams(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Kullanıcının tüm gelir akışlarını döndürür."""
    rows = db.query(models.IncomeStream).filter(models.IncomeStream.user_id == current_user.id).all()
    result = []
    for r in rows:
        d = {
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "amount": r.amount,
            "currency": r.currency,
            "interest_rate": r.interest_rate,
            "start_date": r.start_date,
            "end_date": r.end_date,
            "asset_id": r.asset_id,
            "note": r.note,
        }
        # Mevduat için otomatik faiz hesabı
        if r.type == "deposit" and r.interest_rate and r.start_date:
            start = date.fromisoformat(r.start_date)
            d["deposit_calc"] = calc_deposit_income(r.amount, r.interest_rate, start, r.end_date)
        result.append(d)
    return result


@router.post("/streams", status_code=201)
def create_income_stream(body: IncomeStreamCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stream = models.IncomeStream(
        user_id=current_user.id,
        name=body.name,
        type=body.type,
        amount=body.amount,
        currency=body.currency,
        interest_rate=body.interest_rate,
        start_date=body.start_date,
        end_date=body.end_date,
        asset_id=body.asset_id,
        note=body.note,
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return {"id": stream.id, "message": "Gelir akışı oluşturuldu."}


@router.delete("/streams/{stream_id}")
def delete_income_stream(stream_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stream = db.query(models.IncomeStream).filter(
        models.IncomeStream.id == stream_id,
        models.IncomeStream.user_id == current_user.id
    ).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Gelir akışı bulunamadı.")
    db.delete(stream)
    db.commit()
    return {"message": "Silindi."}


# ── Otomatik Temettü Taraması ─────────────────────────────────────────────────
@router.post("/auto/dividends")
def auto_fetch_dividends(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Portföydeki hisseler için son 12 aydaki temettüleri Yahoo Finance'ten çeker.
    body: { "assets": [{"ticker": "AAPL", "quantity": 10}], "usd_try": 32.5 }
    """
    assets = body.get("assets", [])
    usd_try = float(body.get("usd_try", 35.0))
    all_dividends = []

    for asset in assets:
        ticker = asset.get("ticker", "")
        quantity = float(asset.get("quantity", 0))
        if not ticker or quantity <= 0:
            continue
        divs = fetch_dividends_yahoo(ticker, quantity, usd_try)
        for d in divs:
            d["ticker"] = ticker
            all_dividends.append(d)

    # Tarihe göre sırala
    all_dividends.sort(key=lambda x: x["date"], reverse=True)
    return {"dividends": all_dividends, "count": len(all_dividends)}


# ── Özet: Aylık Pasif Gelir Tahmini ──────────────────────────────────────────
@router.get("/summary")
def get_income_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Tüm gelir akışlarının aylık tahmini özetini döndürür."""
    streams = db.query(models.IncomeStream).filter(models.IncomeStream.user_id == current_user.id).all()
    monthly_total = 0.0
    breakdown = []

    for s in streams:
        monthly = 0.0
        if s.type == "rent":
            monthly = s.amount  # Zaten aylık tutar
        elif s.type == "deposit" and s.interest_rate and s.start_date:
            start = date.fromisoformat(s.start_date)
            calc = calc_deposit_income(s.amount, s.interest_rate, start, s.end_date)
            monthly = calc["monthly_estimate"]
        elif s.type == "other":
            monthly = s.amount

        monthly_total += monthly
        breakdown.append({
            "id": s.id,
            "name": s.name,
            "type": s.type,
            "monthly_estimate_try": round(monthly, 2),
        })

    return {
        "monthly_total_try": round(monthly_total, 2),
        "annual_estimate_try": round(monthly_total * 12, 2),
        "stream_count": len(streams),
        "breakdown": breakdown,
    }
