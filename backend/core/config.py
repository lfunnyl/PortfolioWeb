from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PortfolioWeb API"
    DATABASE_URL: str = "sqlite:///./portfolio_v2.db"
    MARKETAUX_API_KEY: str = ""
    
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 saat

    # E-posta (SMTP)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@portfolioweb.app"
    MAIL_FROM_NAME: str = "PortfolioWeb"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Frontend URL (doğrulama linklerinde kullanılır)
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()

