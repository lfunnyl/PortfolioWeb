from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_verified = Column(Boolean, default=False)  # E-posta doğrulandı mı?
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    portfolios = relationship("Portfolio", back_populates="user")

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    
    user = relationship("User", back_populates="portfolios")
    entries = relationship("AssetEntry", back_populates="portfolio")
    sales = relationship("SaleEntry", back_populates="portfolio")
    dividends = relationship("DividendEntry", back_populates="portfolio")
    options = relationship("OptionEntry", back_populates="portfolio")
    connectors = relationship("BrokerConnector", back_populates="portfolio")

class AssetEntry(Base):
    __tablename__ = "asset_entries"
    id = Column(String, primary_key=True, index=True) # UUID (frontend'in ürettiği id)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    asset_id = Column(String, index=True)
    purchase_date = Column(String) 
    purchase_date_partial = Column(JSON, nullable=True)
    quantity = Column(Float)
    quantity_unit = Column(String, nullable=True)
    purchase_price_try = Column(Float)
    purchase_price_raw = Column(Float, nullable=True)
    purchase_currency = Column(String, nullable=True)
    fee_raw = Column(Float, nullable=True)
    fee_try = Column(Float, nullable=True)
    fee_currency = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(String)
    broker = Column(String, nullable=True)
    portfolio_group = Column(String, nullable=True)
    
    portfolio = relationship("Portfolio", back_populates="entries")

class SaleEntry(Base):
    __tablename__ = "sale_entries"
    id = Column(String, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    asset_entry_id = Column(String, nullable=True)
    asset_id = Column(String, index=True)
    sale_date = Column(String)
    sale_date_partial = Column(JSON, nullable=True)
    sale_quantity = Column(Float)
    sale_price_try = Column(Float)
    sale_price_raw = Column(Float, nullable=True)
    sale_currency = Column(String, nullable=True)
    fee_raw = Column(Float, nullable=True)
    fee_try = Column(Float, nullable=True)
    fee_currency = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(String)
    portfolio = relationship("Portfolio", back_populates="sales")

class DividendEntry(Base):
    __tablename__ = "dividend_entries"
    id = Column(String, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    asset_id = Column(String, index=True)
    amount_raw = Column(Float)
    amount_try = Column(Float)
    currency = Column(String)
    date = Column(String)
    note = Column(Text, nullable=True)
    created_at = Column(String)
    portfolio = relationship("Portfolio", back_populates="dividends")

class Snapshot(Base):
    __tablename__ = "snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    total_value_try = Column(Float)
    date = Column(String)

class CustomAsset(Base):
    __tablename__ = "custom_assets"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    symbol = Column(String)
    icon = Column(String)
    category = Column(String)
    coingecko_id = Column(String, nullable=True)
    metal_key = Column(String, nullable=True)
    forex_key = Column(String, nullable=True)
    stock_key = Column(String, nullable=True)

class SplitEntry(Base):
    __tablename__ = "split_entries"
    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, index=True)
    date = Column(String)
    ratio = Column(Float)
    note = Column(Text, nullable=True)
    created_at = Column(String)

class OptionEntry(Base):
    __tablename__ = "option_entries"
    id = Column(String, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    asset_id = Column(String, index=True) # Underlaying asset
    type = Column(String) # 'call' or 'put'
    strike = Column(Float)
    premium = Column(Float)
    expiry = Column(String)
    quantity = Column(Float)
    note = Column(Text, nullable=True)
    created_at = Column(String)
    
    portfolio = relationship("Portfolio", back_populates="options")

class BrokerConnector(Base):
    __tablename__ = "broker_connectors"
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    provider = Column(String) # 'binance', 'metamask', 'etherscan', etc.
    name = Column(String) # User friendly name (e.g. "Main Binance Account")
    api_key = Column(String, nullable=True) # Encrypted
    api_secret = Column(String, nullable=True) # Encrypted
    wallet_address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    portfolio = relationship("Portfolio", back_populates="connectors")

# İlerisi için önbellek (DB bazlı caching gerekirse)
class PriceCache(Base):
    __tablename__ = "price_cache"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String, unique=True, index=True)
    price = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow)

class NewsCache(Base):
    __tablename__ = "news_cache"
    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, unique=True, index=True)
    news_data = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow)
