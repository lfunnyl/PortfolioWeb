import { useState, useEffect, useCallback } from 'react';
import { fetchAllPrices, PriceMap } from '../services/priceService';

const REFRESH_MS = 60_000;
const PRICE_CACHE_KEY = 'portfolio_price_cache_v1';

interface UseLivePricesResult {
  prices: PriceMap;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
  refresh: () => void;
}

/** Önbelleği localStorage'dan yükle */
function loadCachedPrices(): PriceMap {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PriceMap;
  } catch { return {}; }
}

/** Önbelleği localStorage'a kaydet */
function saveCachedPrices(prices: PriceMap): void {
  try { localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(prices)); } catch { /* full */ }
}

export function useLivePrices(assetIds: string[]): UseLivePricesResult {
  // Bug fix #9: Açılışta cache'den fiyatları yükle, API gelmeden önce 0 gösterme
  const [prices, setPrices]           = useState<PriceMap>(() => loadCachedPrices());
  const [isLoading, setIsLoading]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const key = assetIds.slice().sort().join(',');

  const doFetch = useCallback(async () => {
    if (assetIds.length === 0) return;
    // Bug fix Visibility API: Sekme gizliyse fetch yapmaz
    if (document.visibilityState === 'hidden') return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllPrices(assetIds);
      setPrices((prev) => {
        const merged = { ...prev, ...data };
        saveCachedPrices(merged); // Her başarılı çekimde cache güncelle
        return merged;
      });
      setLastUpdated(new Date());
    } catch (e) {
      setError('Fiyatlar alınamadı. İnternet bağlantınızı kontrol edin.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { doFetch(); }, [doFetch]);

  useEffect(() => {
    if (assetIds.length === 0) return;
    const timer = setInterval(doFetch, REFRESH_MS);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doFetch]);

  // Bug fix Visibility API: Sekme tekrar görünür olunca yenile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') doFetch();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [doFetch]);

  return { prices, isLoading, lastUpdated, error, refresh: doFetch };
}
