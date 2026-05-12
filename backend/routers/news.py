from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from services.news_service import fetch_news, generate_ai_summary

router = APIRouter()

class TickersRequest(BaseModel):
    tickers: list[str] = []

class NerRequest(BaseModel):
    text: str
    portfolio_tickers: list[str] = []

@router.get("/")
def get_asset_news(query: str = "", db: Session = Depends(get_db)):
    news = fetch_news(db, query)
    return {"query": query, "news": news}

@router.post("/ai-summary")
def get_ai_summary(payload: TickersRequest, db: Session = Depends(get_db)):
    summary = generate_ai_summary(db, payload.tickers)
    return {"summary": summary}

@router.post("/ner")
def extract_entities(payload: NerRequest):
    """
    Haber metnindeki ticker/şirket isimlerini (NER) regex + küratif sözlük ile çıkarır.
    Portföydeki tickerlarla kesişim bularak 'dolaylı etki' uyarısı üretir.
    """
    import re

    text = payload.text
    portfolio = [t.upper() for t in payload.portfolio_tickers]

    # ── Küratif varlık/şirket sözlüğü (isim → ticker) ──────────────────────
    ENTITY_MAP = {
        # ABD Hisseleri
        "apple": "AAPL", "aapl": "AAPL",
        "tesla": "TSLA", "tsla": "TSLA",
        "nvidia": "NVDA", "nvda": "NVDA",
        "microsoft": "MSFT", "msft": "MSFT",
        "amazon": "AMZN", "amzn": "AMZN",
        "google": "GOOGL", "alphabet": "GOOGL", "googl": "GOOGL",
        "meta": "META", "facebook": "META",
        "netflix": "NFLX", "nflx": "NFLX",
        "berkshire": "BRK-B",
        "jpmorgan": "JPM", "jp morgan": "JPM",
        "exxon": "XOM",
        # BIST
        "türk hava": "THYAO", "thy": "THYAO", "thyao": "THYAO", "turkish airlines": "THYAO",
        "ereğli": "EREGL", "erdemir": "EREGL", "eregl": "EREGL",
        "sabancı": "SAHOL", "sahol": "SAHOL",
        "koç": "KCHOL", "kchol": "KCHOL",
        "tüpraş": "TUPRS", "tupras": "TUPRS", "tuprs": "TUPRS",
        "aselsan": "ASELS", "asels": "ASELS",
        "sasa": "SASA",
        "garanti": "GARAN", "garan": "GARAN",
        "akbank": "AKBNK", "akbnk": "AKBNK",
        "yapı kredi": "YKBNK", "ykbnk": "YKBNK",
        # Kripto
        "bitcoin": "BTC", "btc": "BTC",
        "ethereum": "ETH", "eth": "ETH",
        "solana": "SOL", "sol": "SOL",
        "binance coin": "BNB", "bnb": "BNB",
        "ripple": "XRP", "xrp": "XRP",
        # Emtia / Döviz
        "gold": "XAU", "altın": "XAU", "xau": "XAU",
        "silver": "XAG", "gümüş": "XAG",
        "dolar": "USD", "dollar": "USD",
        "euro": "EUR",
        # Tedarik Zinciri / Sektörel
        "lithium": "LTHM", "lityum": "LTHM",
        "tsmc": "TSM", "samsung": "SSNLF",
        "arm": "ARM",
        "fed": "__FED__", "federal reserve": "__FED__",
        "ecb": "__ECB__", "merkez bankası": "__TCMB__",
    }

    # Bağlam açıklamaları (dolaylı etki)
    INDIRECT_MAP = {
        "TSLA":  ["LTHM", "ARM"],        # Lityum, Çip mimarisi
        "AAPL":  ["TSM", "SSNLF", "ARM"],
        "NVDA":  ["TSM", "ARM"],
        "THYAO": ["XAU", "USD"],         # Yakıt maliyeti dövize bağlı
        "TUPRS": ["XAU", "USD"],
    }

    text_lower = text.lower()
    found_entities = {}

    # 1. Sözlük tabanlı eşleşme
    for phrase, ticker in ENTITY_MAP.items():
        if phrase in text_lower:
            if ticker not in found_entities:
                found_entities[ticker] = {"ticker": ticker, "phrase": phrase, "in_portfolio": ticker in portfolio, "indirect": False}

    # 2. Büyük harf ticker regex (AAPL, BTC vb.)
    raw_tickers = re.findall(r'\b([A-Z]{2,6})\b', text)
    for rt in raw_tickers:
        # Filtrele: bilinen varlıklar ya da portföydekiler
        if rt in portfolio and rt not in found_entities:
            found_entities[rt] = {"ticker": rt, "phrase": rt, "in_portfolio": True, "indirect": False}

    # 3. Dolaylı etki hesapla
    indirect_alerts = []
    for portfolio_ticker in portfolio:
        deps = INDIRECT_MAP.get(portfolio_ticker, [])
        for dep in deps:
            if dep in found_entities:
                indirect_alerts.append({
                    "portfolio_ticker": portfolio_ticker,
                    "related_entity": dep,
                    "message": f"Haberde geçen '{found_entities[dep]['phrase']}' ({dep}), portföyünüzdeki {portfolio_ticker} ile dolaylı tedarik zinciri ilişkisi taşıyor."
                })

    entities = list(found_entities.values())
    portfolio_hits = [e for e in entities if e["in_portfolio"]]
    other_hits = [e for e in entities if not e["in_portfolio"]]

    return {
        "total_found": len(entities),
        "portfolio_hits": portfolio_hits,
        "other_entities": other_hits,
        "indirect_alerts": indirect_alerts,
    }
