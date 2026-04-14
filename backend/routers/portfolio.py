from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from dependencies import get_current_user
from datetime import datetime

router = APIRouter()

def get_user_portfolio(db: Session, user: models.User):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == user.id).first()
    if not portfolio:
        portfolio = models.Portfolio(user_id=user.id, name="Ana Portföy")
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
    return portfolio

@router.get("/sync", response_model=schemas.SyncPayload)
def sync_get(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Buluttan sadece aktif kullanıcıya ait verileri çeker.
    """
    portfolio = get_user_portfolio(db, current_user)
    
    entries = db.query(models.AssetEntry).filter(models.AssetEntry.portfolio_id == portfolio.id).all()
    sales = db.query(models.SaleEntry).filter(models.SaleEntry.portfolio_id == portfolio.id).all()
    divs = db.query(models.DividendEntry).filter(models.DividendEntry.portfolio_id == portfolio.id).all()
    options = db.query(models.OptionEntry).filter(models.OptionEntry.portfolio_id == portfolio.id).all()
    
    return {"entries": entries, "sales": sales, "dividends": divs, "options": options}

@router.post("/sync")
def sync_post(payload: schemas.SyncPayload, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Kullanıcının verilerini portföyüne kaydeder.
    """
    portfolio = get_user_portfolio(db, current_user)
    
    # Mevcut verileri temizle (bu kullanıcıya ait olanları)
    db.query(models.AssetEntry).filter(models.AssetEntry.portfolio_id == portfolio.id).delete()
    db.query(models.SaleEntry).filter(models.SaleEntry.portfolio_id == portfolio.id).delete()
    db.query(models.DividendEntry).filter(models.DividendEntry.portfolio_id == portfolio.id).delete()
    db.query(models.OptionEntry).filter(models.OptionEntry.portfolio_id == portfolio.id).delete()
    
    for e in payload.entries:
        data = e.model_dump()
        data["portfolio_id"] = portfolio.id
        db_e = models.AssetEntry(**data)
        db.add(db_e)
        
    for s in payload.sales:
        data = s.model_dump()
        data["portfolio_id"] = portfolio.id
        db_s = models.SaleEntry(**data)
        db.add(db_s)
        
    for d in payload.dividends:
        data = d.model_dump()
        data["portfolio_id"] = portfolio.id
        db_d = models.DividendEntry(**data)
        db.add(db_d)

    for o in (payload.options or []):
        data = o.model_dump()
        data["portfolio_id"] = portfolio.id
        # createdAt mapping if missing
        if "created_at" not in data or not data["created_at"]:
            data["created_at"] = datetime.now().isoformat()
        db_o = models.OptionEntry(**data)
        db.add(db_o)
        
    db.commit()
    return {"status": "ok", "message": "Bulut veritabanı başarıyla eşitlendi!"}
