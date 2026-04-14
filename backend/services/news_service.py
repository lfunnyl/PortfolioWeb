import yfinance as yf
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

def fetch_news(db: Session, query: str):
    CACHE_DURATION = timedelta(hours=1)
    now = datetime.utcnow()
    
    # 1. Check SQLite Cache
    cached = db.query(models.NewsCache).filter(models.NewsCache.query == query).first()
    if cached and (now - cached.updated_at) < CACHE_DURATION:
        return cached.news_data
        
    # 2. Fetch using YFinance (completely free, robust)
    try:
        # Piyasalar hakkında genel bir sorgu gelirse, piyasaları yansıtan büyük kağıtları baz al
        if query.lower() in ["", "finance", "genel"]:
            query = "SPY" # S&P 500 ETF is great for general news
            
        ticker = yf.Ticker(query)
        news_items = ticker.news
        
        parsed_news = []
        for item in news_items[:5]: # Take top 5 news
            parsed_news.append({
                "title": item.get("title", "Haber Başlığı"),
                "source": item.get("publisher", "Yahoo Finance"),
                "url": item.get("link", "#"),
                "date": datetime.fromtimestamp(item.get("providerPublishTime", 0)).strftime("%Y-%m-%d %H:%M")
            })
            
        if not parsed_news:
            parsed_news = [{"title": f"{query} hakkında anlık haber bulunamadı.", "source": "Sistem", "url": "#", "date": now.strftime("%Y-%m-%d %H:%M")}]
    except Exception as e:
        parsed_news = [{"title": f"{query} haberleri çekilirken hata oluştu.", "source": "Sistem", "url": "#", "date": now.strftime("%Y-%m-%d %H:%M")}]

    # 3. Update DB
    if cached:
        cached.news_data = parsed_news
        cached.updated_at = now
    else:
        new_cache = models.NewsCache(query=query, news_data=parsed_news, updated_at=now)
        db.add(new_cache)
        
    db.commit()
    
    return parsed_news
