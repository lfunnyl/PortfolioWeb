from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.news_service import fetch_news

router = APIRouter()

@router.get("/")
def get_asset_news(query: str = "", db: Session = Depends(get_db)):
    news = fetch_news(db, query)
    return {"query": query, "news": news}
