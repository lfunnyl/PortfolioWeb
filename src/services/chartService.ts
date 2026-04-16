import { AssetDefinition } from '../types/asset';
import { getAssetDefinitions } from './priceService';
import { apiUrl } from './apiConfig';

export interface ChartDataPoint {
  date: string;
  price: number;
}

// Zaman aralığı tipimiz
export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD';

// Yahoo Finance için range karşılıkları
const YAHOO_RANGE: Record<TimeRange, string> = {
  '1W': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  '1Y': '1y',
  'YTD': 'ytd'
};

// CoinGecko için geçmiş gün sayısı
const CG_DAYS: Record<TimeRange, string> = {
  '1W': '7',
  '1M': '30',
  '3M': '90',
  '6M': '180',
  '1Y': '365',
  'YTD': Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000).toString()
};

async function fetchYahooChart(def: AssetDefinition, range: TimeRange): Promise<ChartDataPoint[]> {
  if (!def.stockKey) return [];
  
  const url = apiUrl(`/prices/chart/${encodeURIComponent(def.stockKey)}?range=${range}`);
  
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data; // already in format {date: string, price: number}[]
  } catch (err) {
    console.warn("Backend chart fetch failed: ", err);
    return [];
  }
}

async function fetchCoinGeckoChart(def: AssetDefinition, range: TimeRange): Promise<ChartDataPoint[]> {
  if (!def.coingeckoId) return [];
  const days = CG_DAYS[range];
  
  const url = `https://api.coingecko.com/api/v3/coins/${def.coingeckoId}/market_chart?vs_currency=try&days=${days}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const prices: [number, number][] = data.prices;
    if (!prices) return [];

    const points: ChartDataPoint[] = prices.map(p => ({
      date: new Date(p[0]).toISOString().split('T')[0],
      price: def.category === 'metal' ? p[1] / 31.1035 : p[1]
    }));
    
    // Aynı gün içindeki çoklu veriyi (saatlik vs) teke düşür
    const dailyMap = new Map<string, number>();
    points.forEach(p => dailyMap.set(p.date, p.price));
    
    return Array.from(dailyMap.entries()).map(([k, v]) => ({ date: k, price: v })).sort((a,b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function fetchHistoricalChartData(assetId: string, range: TimeRange): Promise<ChartDataPoint[]> {
   const def = getAssetDefinitions().find(a => a.id === assetId);
   if (!def) return [];

   if (def.category === 'crypto' || def.category === 'metal') {
      return fetchCoinGeckoChart(def, range);
   } else if (def.category === 'stock_tr' || def.category === 'stock_us') {
      return fetchYahooChart(def, range);
   } else if (def.category === 'forex') {
       // Döviz için ücretsiz historical grafiği şimdilik Yahoo EURTRY=X / USDTRY=X üzerinden alabiliriz
       const fxMap: Record<string, string> = {
         'USD': 'TRY=X',
         'EUR': 'EURTRY=X',
         'GBP': 'GBPTRY=X',
         'CHF': 'CHFTRY=X'
       };
       const proxyDef: AssetDefinition = {
          ...def,
          stockKey: fxMap[def.forexKey || 'USD'] || 'TRY=X'
       };
       return fetchYahooChart(proxyDef, range);
   }
   return [];
}
