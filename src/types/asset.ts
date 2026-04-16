export type AssetCategory = 'crypto' | 'metal' | 'forex' | 'stock_tr' | 'stock_us' | 'cash';

export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type QuantityUnit = 'adet' | 'gram' | 'kg' | 'troy_oz';

export interface AssetDefinition {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  category: AssetCategory;
  coingeckoId?: string;
  metalKey?: string;
  forexKey?: string;
  stockKey?: string;
  yfinanceTicker?: string;
}

/** Kısmi tarih — kullanıcı sadece bir kısmını bilebilir */
export interface PartialDate {
  day?: number;   // 1-31
  month?: number; // 1-12
  year?: number;  // ör. 2024
}

export interface AssetEntry {
  id: string;
  assetId: string;
  /** ISO 8601 — geriye dönük uyumluluk için tutulur, yeni kayıtlarda boş olabilir */
  purchaseDate: string;
  /** Kullanıcının girdiği kısmi tarih bilgisi */
  purchaseDatePartial?: PartialDate;
  quantity: number;
  /** Kullanıcının girdiği birim (metal için gram/kg/troy_oz, diğerleri için 'adet') */
  quantityUnit?: QuantityUnit;
  /** Her zaman TRY cinsinden hesaplanmış alış fiyatı (1 birim başına) */
  purchasePriceTRY: number;
  /** Kullanıcının orijinal girişi */
  purchasePriceRaw?: number;
  purchaseCurrency?: Currency;
  /** Komisyon/Masraf tutarı (kullanıcının girdiği birimde) */
  feeRaw?: number;
  /** Komisyon/Masraf tutarı (TRY karşılığı) */
  feeTRY?: number;
  feeCurrency?: Currency;
  note?: string;
  createdAt: string;
  /** Aracı kurum / platform (Binance, IBKR, Garanti vb.) */
  broker?: string;
  /** Portföy grubu (Ana, Kripto, Hisse, Altın, Emeklilik vb.) */
  portfolioGroup?: string;
}

export interface SaleEntry {
  id: string;
  assetEntryId: string; // hangi AssetEntry'den satış
  assetId: string;
  saleDate: string;
  saleDatePartial?: PartialDate;
  /** Satılan miktar (AssetEntry quantityUnit birimi cinsinden) */
  saleQuantity: number;
  /** Satış fiyatı — TRY/birim */
  salePriceTRY: number;
  salePriceRaw?: number;
  saleCurrency?: Currency;
  /** Satış için girilen komisyon (kullanıcının girdiği birimde) */
  feeRaw?: number;
  /** Satış komisyonu (TRY karşılığı) */
  feeTRY?: number;
  feeCurrency?: Currency;
  note?: string;
  createdAt: string;
}

export interface LivePrice {
  assetId: string;
  priceTRY: number;
  priceUSD?: number;
  updatedAt: string;
}

export interface PortfolioRow extends AssetEntry {
  assetDef: AssetDefinition;
  currentPriceTRY: number;
  totalCostTRY: number;
  currentValueTRY: number;
  profitLossTRY: number;
  profitLossPct: number;
  isLoading: boolean;
}
export interface DividendEntry {
  id: string;
  assetId: string;
  amountRaw: number;
  amountTRY: number;
  currency: Currency;
  date: string;
  note?: string;
  createdAt: string;
}

export interface PortfolioSnapshot {
  date: string;       // ISO 8601
  totalValueTRY: number;
}

/** Hisse bölünmesi (Split) kaydı */
export interface SplitEntry {
  id: string;
  assetId: string;
  date: string;       // ISO 8601
  /** Oran: 2 means 2:1 split (miktar 2x, fiyat /2) */
  ratio: number;
  note?: string;
  createdAt: string;
}

export interface OptionEntry {
  id: string;
  assetId: string;
  type: 'call' | 'put';
  strike: number;
  premium: number;
  expiry: string;
  qty: number;
  note?: string;
  createdAt?: string;
}

