from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# SQLite kullanılıyorsa Multithreading check hatasını atlamak için ek ayar gerekir
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL, connect_args=connect_args
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
