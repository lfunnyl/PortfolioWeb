import os
import yfinance as yf
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

# ─── NLP ve Yapay Zeka Kütüphaneleri ───
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from google import genai
from google.genai import types

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str):
    """Metnin duygu durumunu analiz eder ve etiket döndürür."""
    if not text:
        return {"score": 0.0, "label": "Nötr ⚪"}
    
    # vaderSentiment İngilizce çalıştığı için haber başlıkları için idealdir.
    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    
    if compound >= 0.05:
        return {"score": compound, "label": "Pozitif 🟢"}
    elif compound <= -0.05:
        return {"score": compound, "label": "Negatif 🔴"}
    else:
        return {"score": compound, "label": "Nötr ⚪"}

def fetch_news(db: Session, query: str):
    CACHE_DURATION = timedelta(hours=1)
    now = datetime.utcnow()
    
    # 1. Check SQLite Cache
    cached = db.query(models.NewsCache).filter(models.NewsCache.query == query).first()
    if cached and (now - cached.updated_at) < CACHE_DURATION:
        return cached.news_data
        
    # 2. Fetch using YFinance
    try:
        if query.lower() in ["", "finance", "genel"]:
            query = "SPY"
            
        ticker = yf.Ticker(query)
        news_items = ticker.news
        
        parsed_news = []
        for item in news_items[:5]:
            title = item.get("title", "Haber Başlığı")
            sentiment = analyze_sentiment(title)
            
            parsed_news.append({
                "title": title,
                "source": item.get("publisher", "Yahoo Finance"),
                "url": item.get("link", "#"),
                "date": datetime.fromtimestamp(item.get("providerPublishTime", 0)).strftime("%Y-%m-%d %H:%M"),
                "sentiment_score": sentiment["score"],
                "sentiment_label": sentiment["label"]
            })
            
        if not parsed_news:
            parsed_news = [{"title": f"{query} hakkında anlık haber bulunamadı.", "source": "Sistem", "url": "#", "date": now.strftime("%Y-%m-%d %H:%M"), "sentiment_score": 0.0, "sentiment_label": "Nötr ⚪"}]
    except Exception as e:
        parsed_news = [{"title": f"{query} haberleri çekilirken hata oluştu.", "source": "Sistem", "url": "#", "date": now.strftime("%Y-%m-%d %H:%M"), "sentiment_score": 0.0, "sentiment_label": "Nötr ⚪"}]

    # 3. Update DB
    if cached:
        cached.news_data = parsed_news
        cached.updated_at = now
    else:
        new_cache = models.NewsCache(query=query, news_data=parsed_news, updated_at=now)
        db.add(new_cache)
        
    db.commit()
    return parsed_news


def generate_ai_summary(db: Session, tickers: list[str]) -> str:
    """Belirtilen hisselerin son haberlerini toplayıp Gemini LLM ile analiz eder."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "⚠️ Yapay zeka özeti için .env dosyasına GEMINI_API_KEY eklemeniz gerekmektedir."
        
    all_news_texts = []
    
    # Eğer hisse verilmediyse genel piyasa özeti çıkar
    if not tickers:
        tickers = ["SPY", "QQQ"]
        
    for ticker in tickers[:3]: # En fazla 3 hisse gönderelim ki token veya süre patlamasın
        news = fetch_news(db, ticker)
        for h in news[:3]:
            # Haber listesi
            all_news_texts.append(f"[{ticker}] {h['title']} (Duygu: {h.get('sentiment_label', 'Nötr')})")
            
    if not all_news_texts:
        return "Analiz edilecek yeterli haber bulunamadı."
        
    compiled_text = "\n".join(all_news_texts)
    
    prompt = f"""Sen profesyonel bir portföy yöneticisi ve veri bilimcisisin. 
Aşağıda portföyümdeki (veya piyasadaki) bazı varlıklar için yayınlanmış en son haber başlıklarını ve basit duygu analiz skorlarını veriyorum. 
Lütfen bu verileri okuyup, yatırımcı için tek paragraflık, net, profesyonel ve içgörü dolu bir 'Günün Özeti' çıkar. 
Piyasa hissiyatını (Bullish/Bearish vb.) değerlendirmeyi unutma.

Haberler:
{compiled_text}
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"AI özetlemesi sırasında bir hata oluştu: {str(e)}"
