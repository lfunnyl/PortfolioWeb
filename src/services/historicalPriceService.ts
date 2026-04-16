import { AssetDefinition } from '../types/asset';

// Yıl, ay, gün bilgilerini güvenli bir tarihe (Date nesnesine) çevirir (Girilmemişse yıl ortasını/başını veya bugünü baz alır)
function buildDateFromPartial(year?: string, month?: string, day?: string): Date {
  const y = year ? parseInt(year) : new Date().getFullYear();
  // Eğer sadece yıl girilmişse, o yılın 1 Temmuz'unu (ortası) baz al (ortalama bir değer vermesi için).
  // Eğer ay girilmişse, gün girilmemişse ayın 15'ini baz al.
  const m = month ? parseInt(month) - 1 : (year ? 6 : new Date().getMonth());
  const d = day ? parseInt(day) : (year && !month ? 1 : (month && !day ? 15 : new Date().getDate()));
  return new Date(y, m, d);
}

// 1. Kripto (CoinGecko)
async function fetchCryptoHistorical(def: AssetDefinition, date: Date): Promise<number | null> {
  if (!def.coingeckoId) return null;
  // CoinGecko API format: DD-MM-YYYY
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  
  const url = `https://api.coingecko.com/api/v3/coins/${def.coingeckoId}/history?date=${dd}-${mm}-${yyyy}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data?.market_data?.current_price?.try || null;
  } catch (err) {
    console.error('Crypto history err:', err);
    return null;
  }
}

import { apiUrl } from './apiConfig';

// 2. Hisse Senetleri (Yahoo Finance - Backend Üzerinden)
async function fetchStockHistorical(def: AssetDefinition, date: Date): Promise<number | null> {
  if (!def.stockKey) return null;
  
  const dateStr = date.toISOString().split('T')[0];
  const url = apiUrl(`/prices/historical/${encodeURIComponent(def.stockKey)}?date=${dateStr}`);
  
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.price > 0 ? data.price : null;
  } catch (err) {
    console.warn("Backend historical price fetch failed: ", err);
    return null;
  }
}

// 3. Döviz ve Metal Kuru (Open.ER veya benzeri) (Zorlu)
// Not: Ücretsiz bir api olan frankfurter.app geçmiş döviz kurlarını verir.
async function fetchForexHistorical(currencyCode: string, date: Date): Promise<number | null> {
  // frankfurter.app API format: YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];
  const url = `https://api.frankfurter.app/${dateStr}?from=USD`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    // 1 USD = X TRY, 1 USD = Y EUR. 
    // def = TRY karşılığı aranıyor (yani 1 USD = usdTry). 
    // Eğer EUR istenirse 1 EUR = usdTry / usdEur.
    const rates = data.rates;
    if (!rates) return null;

    const usdTry = rates['TRY'] || 1;
    if (currencyCode === 'USD') return usdTry; // 1 USD'nin TRY değeri
    
    // 1 Euro arıyorsak
    const usdTarget = rates[currencyCode];
    if (usdTarget && usdTry) {
        return usdTry / usdTarget;
    }
    return null;
  } catch (err) {
    console.error('Forex history err:', err);
    return null;
  }
}

export async function fetchHistoricalPrice(def: AssetDefinition, year?: string, month?: string, day?: string): Promise<number | null> {
  const targetDate = buildDateFromPartial(year, month, day);

  if (def.category === 'crypto') {
    return await fetchCryptoHistorical(def, targetDate);
  } else if (def.category === 'stock_tr' || def.category === 'stock_us') {
    const rawPrice = await fetchStockHistorical(def, targetDate);
    if (!rawPrice) return null;
    
    // Eğer ABD hissesi ise (USD), tarihsel kurla (veya güncel kurla) TRY'ye çevrilmeli midir?
    // Kullanıcı zaten "Alış Fiyatını (USD)" veya "Alış Fiyatını (TRY)" olarak forma girecek.
    // Biz saf fiyatı dönelim, UI'da setCurrency('USD') yaparak ABD hissesi olduğunu belirtebiliriz.
    return rawPrice;
  } else if (def.category === 'forex') {
    return await fetchForexHistorical(def.forexKey || 'USD', targetDate);
  } else if (def.category === 'metal') {
    // Kıymetli madenlerin gram tarihsel fiyatının formülü: (Ons * USD/TRY) / 31.1
    // pax-gold ve silver-token CoinGecko'da doğrudan TRY cinsinden değer döner.
    const priceTRYPerOz = await fetchCryptoHistorical(def, targetDate);
    if (priceTRYPerOz) {
      return priceTRYPerOz / 31.1035; // Ons'tan Gram'a çevrim
    }
    return null;
  }

  return null;
}
