from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from services.news_service import fetch_news, generate_ai_summary

router = APIRouter()

class TickersRequest(BaseModel):
    tickers: list[str] = []

@router.get("/")
def get_asset_news(query: str = "", db: Session = Depends(get_db)):
    news = fetch_news(db, query)
    return {"query": query, "news": news}

@router.post("/ai-summary")
def get_ai_summary(payload: TickersRequest, db: Session = Depends(get_db)):
    summary = generate_ai_summary(db, payload.tickers)
    return {"summary": summary}
