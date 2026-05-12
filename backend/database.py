from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# SQLite kullanılıyorsa Multithreading check hatasını atlamak için ek ayar gerekir
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# SQLAlchemy 1.4+ requires postgresql:// instead of postgres://
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    db_url, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Bağımlılık (Dependency) olarak DB oturumu sağlayan fonksiyon"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
