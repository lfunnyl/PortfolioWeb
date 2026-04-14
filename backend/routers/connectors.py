from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from dependencies import get_current_user
from core.encryption import encrypt_value
from services.wallet_service import WalletService
from routers.portfolio import get_user_portfolio

router = APIRouter()

@router.get("/", response_model=list[schemas.BrokerConnectorBase])
def get_connectors(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = get_user_portfolio(db, current_user)
    return db.query(models.BrokerConnector).filter(models.BrokerConnector.portfolio_id == portfolio.id).all()

@router.post("/")
def add_connector(connector: schemas.BrokerConnectorBase, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = get_user_portfolio(db, current_user)
    
    # Encrypt keys before saving
    api_key_enc = encrypt_value(connector.api_key) if connector.api_key else None
    api_secret_enc = encrypt_value(connector.api_secret) if connector.api_secret else None
    
    db_conn = models.BrokerConnector(
        portfolio_id=portfolio.id,
        provider=connector.provider,
        name=connector.name,
        api_key=api_key_enc,
        api_secret=api_secret_enc,
        wallet_address=connector.wallet_address,
        is_active=connector.is_active
    )
    db.add(db_conn)
    db.commit()
    db.refresh(db_conn)
    return {"status": "ok", "id": db_conn.id}

@router.delete("/{connector_id}")
def delete_connector(connector_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = get_user_portfolio(db, current_user)
    db_conn = db.query(models.BrokerConnector).filter(
        models.BrokerConnector.id == connector_id,
        models.BrokerConnector.portfolio_id == portfolio.id
    ).first()
    
    if not db_conn:
        raise HTTPException(status_code=404, detail="Bağlantı bulunamadı.")
    
    db.delete(db_conn)
    db.commit()
    return {"status": "ok"}

@router.post("/trigger-sync")
def trigger_wallet_sync(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Triggers all active connectors to fetch balances and return a unified list of assets found.
    """
    portfolio = get_user_portfolio(db, current_user)
    connectors = db.query(models.BrokerConnector).filter(
        models.BrokerConnector.portfolio_id == portfolio.id,
        models.BrokerConnector.is_active == True
    ).all()
    
    all_balances = []
    for conn in connectors:
        balances = WalletService.sync_connector(conn)
        for b in balances:
            all_balances.append({
                "provider": conn.provider,
                "asset": b['asset'],
                "quantity": b.get('free', 0) + b.get('locked', 0)
            })
            
    return all_balances
