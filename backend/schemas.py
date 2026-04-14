from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PasswordResetRequest(BaseModel):
    token: str
    new_password: str


class AssetEntryBase(BaseModel):
    id: str
    asset_id: str = Field(alias="assetId")
    purchase_date: str = Field(alias="purchaseDate")
    purchase_date_partial: Optional[Dict[str, Any]] = Field(None, alias="purchaseDatePartial")
    quantity: float
    quantity_unit: Optional[str] = Field(None, alias="quantityUnit")
    purchase_price_try: float = Field(alias="purchasePriceTRY")
    purchase_price_raw: Optional[float] = Field(None, alias="purchasePriceRaw")
    purchase_currency: Optional[str] = Field(None, alias="purchaseCurrency")
    fee_raw: Optional[float] = Field(None, alias="feeRaw")
    fee_try: Optional[float] = Field(None, alias="feeTRY")
    fee_currency: Optional[str] = Field(None, alias="feeCurrency")
    note: Optional[str] = None
    created_at: str = Field(alias="createdAt")
    broker: Optional[str] = None
    portfolio_group: Optional[str] = Field(None, alias="portfolioGroup")

    model_config = ConfigDict(populate_by_name=True)

class AssetEntryCreate(AssetEntryBase):
    portfolio_id: Optional[int] = None

class AssetEntryOut(AssetEntryBase):
    portfolio_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SaleEntryBase(BaseModel):
    id: str
    asset_entry_id: Optional[str] = Field(None, alias="assetEntryId")
    asset_id: str = Field(alias="assetId")
    sale_date: str = Field(alias="saleDate")
    sale_date_partial: Optional[Dict[str, Any]] = Field(None, alias="saleDatePartial")
    sale_quantity: float = Field(alias="saleQuantity")
    sale_price_try: float = Field(alias="salePriceTRY")
    sale_price_raw: Optional[float] = Field(None, alias="salePriceRaw")
    sale_currency: Optional[str] = Field(None, alias="saleCurrency")
    fee_raw: Optional[float] = Field(None, alias="feeRaw")
    fee_try: Optional[float] = Field(None, alias="feeTRY")
    fee_currency: Optional[str] = Field(None, alias="feeCurrency")
    note: Optional[str] = None
    created_at: str = Field(alias="createdAt")
    
    model_config = ConfigDict(populate_by_name=True)

class SaleEntryCreate(SaleEntryBase):
    portfolio_id: Optional[int] = None

class SaleEntryOut(SaleEntryBase):
    portfolio_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DividendEntryBase(BaseModel):
    id: str
    asset_id: str = Field(alias="assetId")
    amount_raw: float = Field(alias="amountRaw")
    amount_try: float = Field(alias="amountTRY")
    currency: str
    date: str
    note: Optional[str] = None
    created_at: str = Field(alias="createdAt")
    
    model_config = ConfigDict(populate_by_name=True)

class DividendEntryCreate(DividendEntryBase):
    portfolio_id: Optional[int] = None

class DividendEntryOut(DividendEntryBase):
    portfolio_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class OptionEntryBase(BaseModel):
    id: str
    asset_id: str = Field(alias="assetId")
    type: str
    strike: float
    premium: float
    expiry: str
    quantity: float = Field(alias="qty")
    note: Optional[str] = None
    created_at: Optional[str] = Field(None, alias="createdAt")
    
    model_config = ConfigDict(populate_by_name=True)

class BrokerConnectorBase(BaseModel):
    id: Optional[int] = None
    provider: str
    name: str
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    wallet_address: Optional[str] = Field(None, alias="walletAddress")
    is_active: bool = Field(True, alias="isActive")
    
    model_config = ConfigDict(populate_by_name=True)

class SyncPayload(BaseModel):
    entries: List[AssetEntryCreate]
    sales: List[SaleEntryCreate]
    dividends: List[DividendEntryCreate]
    options: Optional[List[OptionEntryBase]] = []
    connectors: Optional[List[BrokerConnectorBase]] = []


