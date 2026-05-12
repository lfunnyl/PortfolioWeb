from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import engine, Base
from routers import portfolio, prices, news, auth, connectors, options
from core.config import settings
import os
import logging

# Loglama ayarla — Railway loglarında görünür
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tabloları veritabanında oluştur
from sqlalchemy import inspect, text

# migrate.py ile şemayı güncelle (Railway ilk başlatma için kritik)
try:
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    # Eksik tabloları oluştur
    Base.metadata.create_all(bind=engine)
    # users tablosuna eksik sütunları ekle
    if "users" in existing_tables:
        existing_cols = [col["name"] for col in inspector.get_columns("users")]
        with engine.begin() as conn:
            if "hashed_password" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR"))
                logger.info("✅ users.hashed_password sütunu eklendi.")
            if "is_verified" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT TRUE"))
                logger.info("✅ users.is_verified sütunu eklendi.")
            if "is_active" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                logger.info("✅ users.is_active sütunu eklendi.")
            if "created_at" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
                logger.info("✅ users.created_at sütunu eklendi.")
    logger.info("✅ Veritabanı şeması başarıyla güncellendi.")
except Exception as e:
    logger.error(f"❌ Veritabanı başlatma hatası: {e}")
    raise

# ── Rate Limiter ──────────────────────────────────────────────────────────────
# IP başına dakikada 60 genel istek, auth routerı için daha kısıtlı
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="PortfolioWeb API",
    description="Çok Kullanıcılı Fintech Portföy Platformu",
    version="2.0.0",
    # Production'da Swagger UI'ı gizle
    docs_url="/api/docs" if os.getenv("ENVIRONMENT", "development") != "production" else None,
    redoc_url=None,
)

# ── Rate limit hata yönetimi ──────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Production'da ALLOWED_ORIGINS env değişkenine domain ekle
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://portfolio-web-sooty-kappa.vercel.app"
).split(",")

# Vercel URL'sini her halükarda CORS'a dahil et
if "https://portfolio-web-sooty-kappa.vercel.app" not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append("https://portfolio-web-sooty-kappa.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(prices.router, prefix="/api/prices", tags=["Prices"])
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(connectors.router, prefix="/api/connectors", tags=["Connectors"])
app.include_router(options.router,    prefix="/api/options",    tags=["Options"])

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "version": "2.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "db_type": engine.name,
    }
