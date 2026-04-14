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
