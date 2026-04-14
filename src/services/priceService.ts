import { AssetDefinition } from '../types/asset';
import { apiUrl } from '../utils/api';

import { loadCustomAssets } from '../utils/storage';

export const DEFAULT_ASSET_DEFINITIONS: AssetDefinition[] = [
  // ── Kripto Paralar (35 adet) ────────────────────────────────
  { id: 'BTC',    name: 'Bitcoin',              symbol: 'BTC',    icon: '₿',  category: 'crypto', coingeckoId: 'bitcoin' },
  { id: 'ETH',    name: 'Ethereum',             symbol: 'ETH',    icon: 'Ξ',  category: 'crypto', coingeckoId: 'ethereum' },
  { id: 'BNB',    name: 'BNB',                  symbol: 'BNB',    icon: '⬡',  category: 'crypto', coingeckoId: 'binancecoin' },
  { id: 'SOL',    name: 'Solana',               symbol: 'SOL',    icon: '◎',  category: 'crypto', coingeckoId: 'solana' },
  { id: 'XRP',    name: 'XRP',                  symbol: 'XRP',    icon: '✕',  category: 'crypto', coingeckoId: 'ripple' },
  { id: 'DOGE',   name: 'Dogecoin',             symbol: 'DOGE',   icon: 'Ð',  category: 'crypto', coingeckoId: 'dogecoin' },
  { id: 'ADA',    name: 'Cardano',              symbol: 'ADA',    icon: '₳',  category: 'crypto', coingeckoId: 'cardano' },
  { id: 'AVAX',   name: 'Avalanche',            symbol: 'AVAX',   icon: '🔺', category: 'crypto', coingeckoId: 'avalanche-2' },
  { id: 'TRX',    name: 'TRON',                 symbol: 'TRX',    icon: '◈',  category: 'crypto', coingeckoId: 'tron' },
  { id: 'LINK',   name: 'Chainlink',            symbol: 'LINK',   icon: '🔗', category: 'crypto', coingeckoId: 'chainlink' },
  { id: 'DOT',    name: 'Polkadot',             symbol: 'DOT',    icon: '⚫', category: 'crypto', coingeckoId: 'polkadot' },
  { id: 'MATIC',  name: 'Polygon',              symbol: 'MATIC',  icon: '🔷', category: 'crypto', coingeckoId: 'matic-network' },
  { id: 'LTC',    name: 'Litecoin',             symbol: 'LTC',    icon: 'Ł',  category: 'crypto', coingeckoId: 'litecoin' },
  { id: 'SHIB',   name: 'Shiba Inu',            symbol: 'SHIB',   icon: '🐕', category: 'crypto', coingeckoId: 'shiba-inu' },
  { id: 'UNI',    name: 'Uniswap',              symbol: 'UNI',    icon: '🦄', category: 'crypto', coingeckoId: 'uniswap' },
  { id: 'ATOM',   name: 'Cosmos',               symbol: 'ATOM',   icon: '⚛', category: 'crypto', coingeckoId: 'cosmos' },
  { id: 'XLM',    name: 'Stellar',              symbol: 'XLM',    icon: '⭐', category: 'crypto', coingeckoId: 'stellar' },
  { id: 'ETC',    name: 'Ethereum Classic',     symbol: 'ETC',    icon: '💎', category: 'crypto', coingeckoId: 'ethereum-classic' },
  { id: 'BCH',    name: 'Bitcoin Cash',         symbol: 'BCH',    icon: '₿',  category: 'crypto', coingeckoId: 'bitcoin-cash' },
  { id: 'ALGO',   name: 'Algorand',             symbol: 'ALGO',   icon: '△',  category: 'crypto', coingeckoId: 'algorand' },
  { id: 'VET',    name: 'VeChain',              symbol: 'VET',    icon: '✔',  category: 'crypto', coingeckoId: 'vechain' },
  { id: 'FIL',    name: 'Filecoin',             symbol: 'FIL',    icon: '🗄', category: 'crypto', coingeckoId: 'filecoin' },
  { id: 'ICP',    name: 'Internet Computer',    symbol: 'ICP',    icon: '🌐', category: 'crypto', coingeckoId: 'internet-computer' },
  { id: 'APT',    name: 'Aptos',                symbol: 'APT',    icon: '🅰',  category: 'crypto', coingeckoId: 'aptos' },
  { id: 'ARB',    name: 'Arbitrum',             symbol: 'ARB',    icon: '🔵', category: 'crypto', coingeckoId: 'arbitrum' },
  { id: 'OP',     name: 'Optimism',             symbol: 'OP',     icon: '🔴', category: 'crypto', coingeckoId: 'optimism' },
  { id: 'SUI',    name: 'Sui',                  symbol: 'SUI',    icon: '💧', category: 'crypto', coingeckoId: 'sui' },
  { id: 'NEAR',   name: 'NEAR Protocol',        symbol: 'NEAR',   icon: '🌙', category: 'crypto', coingeckoId: 'near' },
  { id: 'INJ',    name: 'Injective',            symbol: 'INJ',    icon: '💉', category: 'crypto', coingeckoId: 'injective-protocol' },
  { id: 'PEPE',   name: 'Pepe',                 symbol: 'PEPE',   icon: '🐸', category: 'crypto', coingeckoId: 'pepe' },
  { id: 'TON',    name: 'Toncoin',              symbol: 'TON',    icon: '💎', category: 'crypto', coingeckoId: 'the-open-network' },
  { id: 'RENDER', name: 'Render',               symbol: 'RENDER', icon: '🎨', category: 'crypto', coingeckoId: 'render-token' },
  { id: 'FET',    name: 'Fetch.ai',             symbol: 'FET',    icon: '🤖', category: 'crypto', coingeckoId: 'fetch-ai' },
  { id: 'AAVE',   name: 'Aave',                 symbol: 'AAVE',   icon: '👻', category: 'crypto', coingeckoId: 'aave' },
  { id: 'MKR',    name: 'Maker',                symbol: 'MKR',    icon: '🏭', category: 'crypto', coingeckoId: 'maker' },

  // ── Nakit & Mevduat ─────────────────────────────────────────
  { id: 'TRY_CASH', name: 'Türk Lirası (Nakit/Faiz)', symbol: 'TRY', icon: '₺', category: 'cash' },

  // ── Değerli Metaller (4 adet) ───────────────────────────────
  { id: 'XAU',  name: 'Altin',               symbol: 'XAU',  icon: '🥇', category: 'metal',  coingeckoId: 'pax-gold' },
  { id: 'XAG',  name: 'Gumus',               symbol: 'XAG',  icon: '🥈', category: 'metal',  coingeckoId: 'silver-token' },
  { id: 'XPT',  name: 'Platin',              symbol: 'XPT',  icon: '⬜', category: 'metal',  coingeckoId: 'platinum' },
  { id: 'XPD',  name: 'Paladyum',            symbol: 'XPD',  icon: '🔲', category: 'metal',  coingeckoId: 'palladium' },

  // ── Döviz (8 adet) ──────────────────────────────────────────
  { id: 'USD',  name: 'Amerikan Dolari',     symbol: 'USD',  icon: '$',  category: 'forex',  forexKey: 'USD' },
  { id: 'EUR',  name: 'Euro',                symbol: 'EUR',  icon: '€',  category: 'forex',  forexKey: 'EUR' },
  { id: 'GBP',  name: 'Ingiliz Sterlini',   symbol: 'GBP',  icon: '£',  category: 'forex',  forexKey: 'GBP' },
  { id: 'CHF',  name: 'Isvicre Frangi',     symbol: 'CHF',  icon: 'Fr', category: 'forex',  forexKey: 'CHF' },
  { id: 'JPY',  name: 'Japon Yeni',          symbol: 'JPY',  icon: '¥',  category: 'forex',  forexKey: 'JPY' },
  { id: 'CAD',  name: 'Kanada Dolari',       symbol: 'CAD',  icon: 'C$', category: 'forex',  forexKey: 'CAD' },
  { id: 'AUD',  name: 'Avustralya Dolari',   symbol: 'AUD',  icon: 'A$', category: 'forex',  forexKey: 'AUD' },
  { id: 'CNY',  name: 'Cin Yuani',           symbol: 'CNY',  icon: '¥',  category: 'forex',  forexKey: 'CNY' },

  // ── BIST Hisseleri (40 adet) ────────────────────────────────
  { id: 'THYAO', name: 'Turk Hava Yollari',  symbol: 'THYAO.IS', icon: '✈', category: 'stock_tr', stockKey: 'THYAO.IS' },
  { id: 'EREGL', name: 'Eregli Demir Celik', symbol: 'EREGL.IS', icon: '🏭', category: 'stock_tr', stockKey: 'EREGL.IS' },
  { id: 'SASA',  name: 'SASA Polyester',     symbol: 'SASA.IS',  icon: '🧵', category: 'stock_tr', stockKey: 'SASA.IS' },
  { id: 'TUPRS', name: 'Tupras',             symbol: 'TUPRS.IS', icon: '🛢', category: 'stock_tr', stockKey: 'TUPRS.IS' },
  { id: 'ASELS', name: 'Aselsan',            symbol: 'ASELS.IS', icon: '📡', category: 'stock_tr', stockKey: 'ASELS.IS' },
  { id: 'KCHOL', name: 'Koc Holding',        symbol: 'KCHOL.IS', icon: '🏢', category: 'stock_tr', stockKey: 'KCHOL.IS' },
  { id: 'GARAN', name: 'Garanti BBVA',       symbol: 'GARAN.IS', icon: '🏦', category: 'stock_tr', stockKey: 'GARAN.IS' },
  { id: 'AKBNK', name: 'Akbank',             symbol: 'AKBNK.IS', icon: '🏦', category: 'stock_tr', stockKey: 'AKBNK.IS' },
  { id: 'YKBNK', name: 'Yapi Kredi',         symbol: 'YKBNK.IS', icon: '🏦', category: 'stock_tr', stockKey: 'YKBNK.IS' },
  { id: 'ISCTR', name: 'Is Bankasi C',       symbol: 'ISCTR.IS', icon: '🏦', category: 'stock_tr', stockKey: 'ISCTR.IS' },
  { id: 'BIMAS', name: 'BIM Birlesik',       symbol: 'BIMAS.IS', icon: '🛒', category: 'stock_tr', stockKey: 'BIMAS.IS' },
  { id: 'MGROS', name: 'Migros Ticaret',     symbol: 'MGROS.IS', icon: '🛍', category: 'stock_tr', stockKey: 'MGROS.IS' },
  { id: 'FROTO', name: 'Ford Otomotiv',      symbol: 'FROTO.IS', icon: '🚗', category: 'stock_tr', stockKey: 'FROTO.IS' },
  { id: 'TOASO', name: 'Tofas Oto.',         symbol: 'TOASO.IS', icon: '🚙', category: 'stock_tr', stockKey: 'TOASO.IS' },
  { id: 'KOZAL', name: 'Koza Altin',         symbol: 'KOZAL.IS', icon: '⛏', category: 'stock_tr', stockKey: 'KOZAL.IS' },
  { id: 'PGSUS', name: 'Pegasus',            symbol: 'PGSUS.IS', icon: '✈', category: 'stock_tr', stockKey: 'PGSUS.IS' },
  { id: 'SAHOL', name: 'Sabanci Holding',    symbol: 'SAHOL.IS', icon: '🏗', category: 'stock_tr', stockKey: 'SAHOL.IS' },
  { id: 'SISE',  name: 'Sise Cam',           symbol: 'SISE.IS',  icon: '🔷', category: 'stock_tr', stockKey: 'SISE.IS' },
  { id: 'TAVHL', name: 'TAV Havalimanlar',   symbol: 'TAVHL.IS', icon: '🛫', category: 'stock_tr', stockKey: 'TAVHL.IS' },
  { id: 'TCELL', name: 'Turkcell',           symbol: 'TCELL.IS', icon: '📱', category: 'stock_tr', stockKey: 'TCELL.IS' },
  { id: 'TTKOM', name: 'Turk Telekom',       symbol: 'TTKOM.IS', icon: '📞', category: 'stock_tr', stockKey: 'TTKOM.IS' },
  { id: 'EKGYO', name: 'Emlak Konut GYO',    symbol: 'EKGYO.IS', icon: '🏠', category: 'stock_tr', stockKey: 'EKGYO.IS' },
  { id: 'ENKAI', name: 'Enka Insaat',        symbol: 'ENKAI.IS', icon: '🏗', category: 'stock_tr', stockKey: 'ENKAI.IS' },
  { id: 'HEKTS', name: 'Hektas',             symbol: 'HEKTS.IS', icon: '🌿', category: 'stock_tr', stockKey: 'HEKTS.IS' },
  { id: 'LOGO',  name: 'Logo Yazilim',       symbol: 'LOGO.IS',  icon: '💻', category: 'stock_tr', stockKey: 'LOGO.IS' },
  { id: 'OTKAR', name: 'Otokar',             symbol: 'OTKAR.IS', icon: '🚌', category: 'stock_tr', stockKey: 'OTKAR.IS' },
  { id: 'PETKM', name: 'Petkim',             symbol: 'PETKM.IS', icon: '🧪', category: 'stock_tr', stockKey: 'PETKM.IS' },
  { id: 'SELEC', name: 'Selcuk Ecza',        symbol: 'SELEC.IS', icon: '💊', category: 'stock_tr', stockKey: 'SELEC.IS' },
  { id: 'SKBNK', name: 'Sekerbank',          symbol: 'SKBNK.IS', icon: '🏦', category: 'stock_tr', stockKey: 'SKBNK.IS' },
  { id: 'SOKM',  name: 'Sok Marketler',      symbol: 'SOKM.IS',  icon: '🛒', category: 'stock_tr', stockKey: 'SOKM.IS' },
  { id: 'TATGD', name: 'Tat Gida',           symbol: 'TATGD.IS', icon: '🍅', category: 'stock_tr', stockKey: 'TATGD.IS' },
  { id: 'TSKB',  name: 'TSKB',               symbol: 'TSKB.IS',  icon: '🏛', category: 'stock_tr', stockKey: 'TSKB.IS' },
  { id: 'ULKER', name: 'Ulker Biskuvi',      symbol: 'ULKER.IS', icon: '🍪', category: 'stock_tr', stockKey: 'ULKER.IS' },
  { id: 'VESTL', name: 'Vestel Elektronik',  symbol: 'VESTL.IS', icon: '📺', category: 'stock_tr', stockKey: 'VESTL.IS' },
  { id: 'ZOREN', name: 'Zorlu Enerji',       symbol: 'ZOREN.IS', icon: '⚡', category: 'stock_tr', stockKey: 'ZOREN.IS' },
  { id: 'AEFES', name: 'Anadolu Efes',       symbol: 'AEFES.IS', icon: '🍺', category: 'stock_tr', stockKey: 'AEFES.IS' },
  { id: 'ARCLK', name: 'Arcelik',            symbol: 'ARCLK.IS', icon: '🏠', category: 'stock_tr', stockKey: 'ARCLK.IS' },
  { id: 'CCOLA', name: 'Coca-Cola Icecek',   symbol: 'CCOLA.IS', icon: '🥤', category: 'stock_tr', stockKey: 'CCOLA.IS' },
  { id: 'DOAS',  name: 'Dogus Otomotiv',     symbol: 'DOAS.IS',  icon: '🚗', category: 'stock_tr', stockKey: 'DOAS.IS' },
  { id: 'KONTR', name: 'Kontur',             symbol: 'KONTR.IS', icon: '🔩', category: 'stock_tr', stockKey: 'KONTR.IS' },

  // ── ABD Hisseleri (35 adet) ─────────────────────────────────
  { id: 'AAPL',  name: 'Apple Inc.',          symbol: 'AAPL',  icon: '🍎', category: 'stock_us', stockKey: 'AAPL' },
  { id: 'TSLA',  name: 'Tesla Inc.',          symbol: 'TSLA',  icon: '⚡', category: 'stock_us', stockKey: 'TSLA' },
  { id: 'NVDA',  name: 'NVIDIA Corp.',        symbol: 'NVDA',  icon: '🖥', category: 'stock_us', stockKey: 'NVDA' },
  { id: 'AMZN',  name: 'Amazon.com',          symbol: 'AMZN',  icon: '📦', category: 'stock_us', stockKey: 'AMZN' },
  { id: 'MSFT',  name: 'Microsoft Corp.',     symbol: 'MSFT',  icon: '🪟', category: 'stock_us', stockKey: 'MSFT' },
  { id: 'GOOGL', name: 'Alphabet (Google)',   symbol: 'GOOGL', icon: '🔍', category: 'stock_us', stockKey: 'GOOGL' },
  { id: 'META',  name: 'Meta Platforms',      symbol: 'META',  icon: '👍', category: 'stock_us', stockKey: 'META' },
  { id: 'NFLX',  name: 'Netflix Inc.',        symbol: 'NFLX',  icon: '🎬', category: 'stock_us', stockKey: 'NFLX' },
  { id: 'PLTR',  name: 'Palantir Technolgies',symbol: 'PLTR',  icon: '🔮', category: 'stock_us', stockKey: 'PLTR' },
  { id: 'COIN',  name: 'Coinbase Global',     symbol: 'COIN',  icon: '🪙', category: 'stock_us', stockKey: 'COIN' },
  { id: 'MSTR',  name: 'MicroStrategy',       symbol: 'MSTR',  icon: '₿',  category: 'stock_us', stockKey: 'MSTR' },
  { id: 'AMD',   name: 'AMD',                 symbol: 'AMD',   icon: '💻', category: 'stock_us', stockKey: 'AMD' },
  { id: 'INTC',  name: 'Intel Corp.',         symbol: 'INTC',  icon: '🔵', category: 'stock_us', stockKey: 'INTC' },
  { id: 'JPM',   name: 'JPMorgan Chase',      symbol: 'JPM',   icon: '🏦', category: 'stock_us', stockKey: 'JPM' },
  { id: 'BAC',   name: 'Bank of America',     symbol: 'BAC',   icon: '🏦', category: 'stock_us', stockKey: 'BAC' },
  { id: 'V',     name: 'Visa Inc.',           symbol: 'V',     icon: '💳', category: 'stock_us', stockKey: 'V' },
  { id: 'MA',    name: 'Mastercard',          symbol: 'MA',    icon: '💳', category: 'stock_us', stockKey: 'MA' },
  { id: 'DIS',   name: 'Walt Disney',         symbol: 'DIS',   icon: '🏰', category: 'stock_us', stockKey: 'DIS' },
  { id: 'BABA',  name: 'Alibaba Group',       symbol: 'BABA',  icon: '🛍', category: 'stock_us', stockKey: 'BABA' },
  { id: 'UBER',  name: 'Uber Technologies',   symbol: 'UBER',  icon: '🚗', category: 'stock_us', stockKey: 'UBER' },
  { id: 'SPOT',  name: 'Spotify Technology',  symbol: 'SPOT',  icon: '🎵', category: 'stock_us', stockKey: 'SPOT' },
  { id: 'SHOP',  name: 'Shopify Inc.',        symbol: 'SHOP',  icon: '🛒', category: 'stock_us', stockKey: 'SHOP' },
  { id: 'SQ',    name: 'Block Inc.',          symbol: 'SQ',    icon: '🔲', category: 'stock_us', stockKey: 'SQ' },
  { id: 'PYPL',  name: 'PayPal Holdings',     symbol: 'PYPL',  icon: '💰', category: 'stock_us', stockKey: 'PYPL' },
  { id: 'CRM',   name: 'Salesforce',          symbol: 'CRM',   icon: '☁', category: 'stock_us', stockKey: 'CRM' },
  { id: 'ADBE',  name: 'Adobe Inc.',          symbol: 'ADBE',  icon: '🎨', category: 'stock_us', stockKey: 'ADBE' },
  { id: 'ORCL',  name: 'Oracle Corp.',        symbol: 'ORCL',  icon: '🔴', category: 'stock_us', stockKey: 'ORCL' },
  { id: 'IBM',   name: 'IBM',                 symbol: 'IBM',   icon: '🔵', category: 'stock_us', stockKey: 'IBM' },
  { id: 'WMT',   name: 'Walmart Inc.',        symbol: 'WMT',   icon: '🛒', category: 'stock_us', stockKey: 'WMT' },
  { id: 'KO',    name: 'Coca-Cola Co.',       symbol: 'KO',    icon: '🥤', category: 'stock_us', stockKey: 'KO' },
  { id: 'PEP',   name: 'PepsiCo Inc.',        symbol: 'PEP',   icon: '🥤', category: 'stock_us', stockKey: 'PEP' },
  { id: 'SBUX',  name: 'Starbucks Corp.',     symbol: 'SBUX',  icon: '☕', category: 'stock_us', stockKey: 'SBUX' },
  { id: 'MCD',   name: "McDonald's Corp.",    symbol: 'MCD',   icon: '🍔', category: 'stock_us', stockKey: 'MCD' },
  { id: 'XOM',   name: 'ExxonMobil Corp.',    symbol: 'XOM',   icon: '⛽', category: 'stock_us', stockKey: 'XOM' },
  { id: 'BRKB',  name: 'Berkshire Hathaway B',symbol: 'BRK-B', icon: '🎩', category: 'stock_us', stockKey: 'BRK-B' },
];

export function getAssetDefinitions(): AssetDefinition[] {
  const all = [...DEFAULT_ASSET_DEFINITIONS, ...loadCustomAssets()];
  const cryptos = all.filter(a => a.category === 'crypto');
  const others = all.filter(a => a.category !== 'crypto').sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  return [...cryptos, ...others];
}

export function getAssetById(id: string): AssetDefinition | undefined {
  return getAssetDefinitions().find((a) => a.id === id);
}

export type PriceMap = Record<string, number>;


export async function fetchAllPrices(assetIds: string[]): Promise<PriceMap> {
  if (!assetIds || assetIds.length === 0) return {};
  
  try {
    const res = await fetch(apiUrl('/prices/bulk'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_ids: assetIds })
    });
    
    if (!res.ok) throw new Error('Backend fiyat servisine erisilemedi');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Backend fiyat cekme hatasi:", err);
    return {};
  }
}
