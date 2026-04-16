// ─── Para Birimleri ─────────────────────────────────────────────
export const CURRENCIES = [
  { value: 'TRY' as const, label: 'Türk Lirası',  symbol: '₺' },
  { value: 'USD' as const, label: 'ABD Doları',    symbol: '$' },
  { value: 'EUR' as const, label: 'Euro',          symbol: '€' },
  { value: 'GBP' as const, label: 'Sterlin',       symbol: '£' },
];

// ─── Metal Birimleri ─────────────────────────────────────────────
export const METAL_UNITS = [
  { value: 'gram'    as const, label: 'Gram (g)' },
  { value: 'kg'      as const, label: 'Kilogram (kg)' },
  { value: 'troy_oz' as const, label: 'Troy Ons (oz t)' },
];

// ─── Kategori Filtreleri ─────────────────────────────────────────
export const CATEGORY_OPTIONS = [
  { value: 'all'      as const, label: 'Tümü',            icon: '🌐' },
  { value: 'crypto'   as const, label: 'Kripto Paralar',   icon: '💰' },
  { value: 'metal'    as const, label: 'Değerli Metaller', icon: '🥇' },
  { value: 'forex'    as const, label: 'Döviz',            icon: '💵' },
  { value: 'stock_tr' as const, label: 'BIST Hisseleri',   icon: '🇹🇷' },
  { value: 'stock_us' as const, label: 'ABD Hisseleri',    icon: '🇺🇸' },
];

// ─── Aracı Kurumlar ─────────────────────────────────────────────
export const BROKER_LIST: { group: string; items: string[] }[] = [
  {
    group: 'Kripto Borsaları',
    items: ['Binance', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'KuCoin', 'Gate.io', 'Bitget', 'MEXC', 'BtcTurk', 'Paribu', 'Icrypex', 'Bitfinex'],
  },
  {
    group: 'Türkiye Aracı Kurumları',
    items: ['Garanti BBVA Yatırım', 'AK Yatırım', 'Yapı Kredi Yatırım', 'Deniz Yatırım', 'Midas', 'Gedik Yatırım', 'Ata Yatırım', 'Tacirler', 'Ziraat Yatırım', 'Halk Yatırım', 'QNB Finansinvest', 'TEB Yatırım'],
  },
  {
    group: 'Uluslararası Aracı Kurumlar',
    items: ['Interactive Brokers (IBKR)', 'eToro', 'Degiro', 'Revolut', 'Trading 212', 'Saxo Bank', 'Charles Schwab', 'Fidelity', 'Vanguard'],
  },
];
