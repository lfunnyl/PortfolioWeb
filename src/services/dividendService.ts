import { AssetEntry } from '../types/asset';
import { getAssetDefinitions } from '../services/priceService';

export interface DetectedDividend {
  assetId: string;
  entryId: string;
  stockKey: string;
  assetName: string;
  assetIcon: string;
  date: string;
  amountPerShare: number;
  quantity: number;
  totalAmount: number;     // orijinal para biriminde
  totalAmountTRY: number;
  currency: string;
}

async function fetchDividendsForStock(
  stockKey: string,
  fromUnix: number
): Promise<{ date: string; amount: number; currency: string }[]> {
  const toTs = Math.floor(Date.now() / 1000);
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stockKey}?period1=${fromUnix}&period2=${toTs}&interval=1d&events=dividends`;

  const proxies = [
    `/api/yahoo/v8/finance/chart/${stockKey}?period1=${fromUnix}&period2=${toTs}&interval=1d&events=dividends`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const dividends = result?.events?.dividends;
      const currency = result?.meta?.currency ?? 'USD';

      if (!dividends) return [];

      return Object.values(dividends).map((d: any) => ({
        date: new Date(d.date * 1000).toISOString().split('T')[0],
        amount: d.amount,
        currency,
      }));
    } catch {
      continue;
    }
  }
  throw new Error('Temettü verisi alınamadı');
}

export async function detectDividendsForEntries(
  entries: AssetEntry[],
  usdRate: number
): Promise<DetectedDividend[]> {
  const defs = getAssetDefinitions();
  const detected: DetectedDividend[] = [];

  // Sadece hisse senetleri için
  const stockEntries = entries.filter(e => {
    const def = defs.find(d => d.id === e.assetId);
    return def && (def.category === 'stock_tr' || def.category === 'stock_us');
  });

  // Aynı hisse için tekrarlı çekişi önle
  const fetched: Record<string, { date: string; amount: number; currency: string }[]> = {};

  for (const entry of stockEntries) {
    const def = defs.find(d => d.id === entry.assetId);
    if (!def?.stockKey) continue;

    // Alış tarihi → Unix timestamp
    const partial = entry.purchaseDatePartial;
    const purchaseDate = partial?.year
      ? new Date(
          partial.year,
          (partial.month ?? 1) - 1,
          partial.day ?? 1
        )
      : new Date(entry.purchaseDate || Date.now() - 365 * 86400_000);
    const fromUnix = Math.floor(purchaseDate.getTime() / 1000);

    // Aynı sembol için tekrar çekme
    if (!fetched[def.stockKey]) {
      try {
        fetched[def.stockKey] = await fetchDividendsForStock(def.stockKey, fromUnix);
      } catch {
        fetched[def.stockKey] = [];
      }
    }

    const divs = fetched[def.stockKey].filter(d => d.date >= purchaseDate.toISOString().split('T')[0]);

    for (const div of divs) {
      const isUSD = div.currency !== 'TRY';
      const totalAmount  = div.amount * entry.quantity;
      const totalAmountTRY = isUSD ? totalAmount * usdRate : totalAmount;

      detected.push({
        assetId:       entry.assetId,
        entryId:       entry.id,
        stockKey:      def.stockKey,
        assetName:     def.name,
        assetIcon:     def.icon,
        date:          div.date,
        amountPerShare: div.amount,
        quantity:      entry.quantity,
        totalAmount,
        totalAmountTRY,
        currency:      div.currency,
      });
    }
  }

  // Tarihe göre sırala, yeniden eskiye
  return detected.sort((a, b) => b.date.localeCompare(a.date));
}
