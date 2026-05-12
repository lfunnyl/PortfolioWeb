import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllPrices, PriceMap } from '../services/priceService';
import { apiUrl } from '../utils/api';

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
  const [prices, setPrices]           = useState<PriceMap>(() => loadCachedPrices());
  const [isLoading, setIsLoading]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const key = assetIds.slice().sort().join(',');

  const doFetch = useCallback(async () => {
    if (assetIds.length === 0) return;
    if (document.visibilityState === 'hidden') return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllPrices(assetIds);
      setPrices((prev) => {
        const merged = { ...prev, ...data };
        saveCachedPrices(merged);
        return merged;
      });
      setLastUpdated(new Date());
    } catch (e) {
      setError('Fiyatlar alınamadı. İnternet bağlantınızı kontrol edin.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // İlk yükleme
  useEffect(() => { doFetch(); }, [doFetch]);

  // WebSocket Entegrasyonu (Push)
  useEffect(() => {
    if (assetIds.length === 0) return;
    
    const wsUrl = apiUrl('/prices/ws').replace(/^http/, 'ws') + '?assets=' + encodeURIComponent(key);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as PriceMap;
        setPrices(prev => {
          const merged = { ...prev, ...data };
          saveCachedPrices(merged);
          return merged;
        });
        setLastUpdated(new Date());
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    ws.onerror = () => {
      // Sessizce HTTP fallback'e (doFetch) devam etmesini sağlayabiliriz
      console.warn('WebSocket bağlantı hatası, HTTP kullanılacak.');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [key]);

  // HTTP Fallback (Eğer WS çökerse veya bağlanmazsa)
  useEffect(() => {
    if (assetIds.length === 0) return;
    const timer = setInterval(() => {
      // Eğer WebSocket kapalıysa manuel çek (Fallback)
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        doFetch();
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [doFetch]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') doFetch();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [doFetch]);

  return { prices, isLoading, lastUpdated, error, refresh: doFetch };
}
