/**
 * useCloudSync — Otomatik iki yönlü bulut senkronizasyonu
 *
 * Çalışma prensibi:
 *  1. Kullanıcı giriş yaptığında → buluttan çek (pull), LocalStorage'a yaz, UI'ı yenile
 *  2. entries/sales/dividends değiştiğinde → 3 sn debounce sonra buluta kaydet (push)
 *  3. Kullanıcı çıkış yaptığında → sync durdur
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import {
  loadEntries, loadSales, loadDividends, loadOptions,
  importData,
} from '../utils/storage';
import { AssetEntry, SaleEntry, DividendEntry } from '../types/asset';

export type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'ok' | 'error';

interface UseCloudSyncOptions {
  entries: AssetEntry[];
  sales: SaleEntry[];
  dividends: DividendEntry[];
  onDataLoaded: () => void;   // LocalStorage güncellendikten sonra App state'ini tazele
}

export function useCloudSync({ entries, sales, dividends, onDataLoaded }: UseCloudSyncOptions) {
  const { token, isAuthenticated, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPulledRef = useRef(false);  // Aynı oturumda iki kez pull yapmayı önle

  // ── Buluttan Çek (Pull) ──────────────────────────────────────────────────
  const pull = useCallback(async () => {
    if (!token) return;
    setSyncStatus('pulling');
    setSyncError(null);
    try {
      const res = await fetch(apiUrl('/portfolio/sync'), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Sadece bulutta veri varsa LocalStorage'ı güncelle
      const hasCloudData = (data.entries?.length ?? 0) > 0
        || (data.sales?.length ?? 0) > 0
        || (data.dividends?.length ?? 0) > 0;

      if (hasCloudData) {
        importData(JSON.stringify({
          entries: data.entries ?? [],
          sales: data.sales ?? [],
          dividends: data.dividends ?? [],
          options: data.options ?? [],
        }));
        onDataLoaded();
      }

      setSyncStatus('ok');
      setLastSynced(new Date());
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError('Buluttan çekilemedi.');
    }
  }, [token, logout, onDataLoaded]);

  // ── Buluta Kaydet (Push) ─────────────────────────────────────────────────
  const push = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setSyncStatus('pushing');
    setSyncError(null);
    try {
      const payload = {
        entries: loadEntries(),
        sales: loadSales(),
        dividends: loadDividends(),
        options: loadOptions(),
      };

      const res = await fetch(apiUrl('/portfolio/sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSyncStatus('ok');
      setLastSynced(new Date());
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError('Buluta kaydedilemedi.');
    }
  }, [token, isAuthenticated, logout]);

  // ── Giriş yapılınca bir kez Pull ────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && !hasPulledRef.current) {
      hasPulledRef.current = true;
      pull();
    }
    if (!isAuthenticated) {
      hasPulledRef.current = false;
      setSyncStatus('idle');
      setLastSynced(null);
    }
  }, [isAuthenticated, pull]);

  // ── Veri değişince debounced Push (3 sn) ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !hasPulledRef.current) return;  // pull bitmeden push etme

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      push();
    }, 3000);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, sales, dividends, isAuthenticated]);

  // Manuel tetikleyiciler
  const manualPush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    push();
  }, [push]);

  const manualPull = useCallback(() => {
    pull();
  }, [pull]);

  return { syncStatus, lastSynced, syncError, manualPush, manualPull };
}
