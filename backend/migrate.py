"""
Mevcut veritabanı şemasını güncel modellere göre yükseltir.
Eksik tablolar ve sütunlar eklenir; mevcut veriler korunur.
Railway startup komutundan önce çalıştırılır.
"""
import logging
from sqlalchemy import inspect, text
from database import engine, Base
import models  # tüm modelleri yükle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    logger.info(f"Mevcut tablolar: {existing_tables}")

    # Eksik tabloları oluştur (mevcut olanları dokunmaz)
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Eksik tablolar oluşturuldu.")

    # Mevcut tablolara eksik sütunları ekle
    with engine.begin() as conn:
        # users tablosundaki sütunları kontrol et
        if "users" in existing_tables:
            existing_cols = [col["name"] for col in inspector.get_columns("users")]
            logger.info(f"users sütunları: {existing_cols}")

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

    logger.info("🎉 Migrasyon tamamlandı.")


if __name__ == "__main__":
    migrate()
