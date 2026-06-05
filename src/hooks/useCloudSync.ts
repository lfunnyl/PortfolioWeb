/**
 * useCloudSync — Firebase Firestore ile otomatik iki yönlü bulut senkronizasyonu.
 *
 * Veri yapısı (Firestore):
 *   users/{uid}/portfolio (tek doküman — tüm portföy verisi)
 *     → entries:   AssetEntry[]
 *     → sales:     SaleEntry[]
 *     → dividends: DividendEntry[]
 *     → options:   OptionEntry[]
 *     → updatedAt: string
 *
 * Çalışma prensibi:
 *  1. Kullanıcı giriş yaptığında → Firestore'dan çek (pull), LocalStorage'a yaz, UI'ı yenile
 *  2. entries/sales/dividends değiştiğinde → 3 sn debounce sonra Firestore'a kaydet (push)
 *  3. Kullanıcı çıkış yaptığında → sync durdur
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  loadEntries, loadSales, loadDividends, loadOptions,
  importData,
} from '../utils/storage';
import { AssetEntry, SaleEntry, DividendEntry } from '../types/asset';

export type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'ok' | 'error';

interface UseCloudSyncOptions {
  entries:   AssetEntry[];
  sales:     SaleEntry[];
  dividends: DividendEntry[];
  onDataLoaded: () => void;
}

export function useCloudSync({ entries, sales, dividends, onDataLoaded }: UseCloudSyncOptions) {
  const { user, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncError,  setSyncError]  = useState<string | null>(null);
  const pushTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPulledRef = useRef(false);

  /** Firestore döküman referansı — uid bazlı */
  const getPortfolioRef = useCallback(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid, 'data', 'portfolio');
  }, [user]);

  // ── Firestore'dan Çek (Pull) ──────────────────────────────────────────────
  const pull = useCallback(async () => {
    const ref = getPortfolioRef();
    if (!ref) return;

    setSyncStatus('pulling');
    setSyncError(null);
    try {
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const hasCloudData =
          (data.entries?.length   ?? 0) > 0 ||
          (data.sales?.length     ?? 0) > 0 ||
          (data.dividends?.length ?? 0) > 0;

        if (hasCloudData) {
          importData(JSON.stringify({
            entries:   data.entries   ?? [],
            sales:     data.sales     ?? [],
            dividends: data.dividends ?? [],
            options:   data.options   ?? [],
          }));
          onDataLoaded();
        }
      }

      setSyncStatus('ok');
      setLastSynced(new Date());
    } catch (e: any) {
      console.error('Firestore pull hatası:', e);
      setSyncStatus('error');
      setSyncError('Buluttan çekilemedi.');
    }
  }, [getPortfolioRef, onDataLoaded]);

  // ── Firestore'a Kaydet (Push) ─────────────────────────────────────────────
  const push = useCallback(async () => {
    const ref = getPortfolioRef();
    if (!ref || !isAuthenticated) return;

    setSyncStatus('pushing');
    setSyncError(null);
    try {
      const payload = {
        entries:   loadEntries(),
        sales:     loadSales(),
        dividends: loadDividends(),
        options:   loadOptions(),
        updatedAt: new Date().toISOString(),
      };

      // merge: true → belgenin diğer alanlarını silmez
      await setDoc(ref, payload, { merge: true });

      setSyncStatus('ok');
      setLastSynced(new Date());
    } catch (e: any) {
      console.error('Firestore push hatası:', e);
      setSyncStatus('error');
      setSyncError('Buluta kaydedilemedi.');
    }
  }, [getPortfolioRef, isAuthenticated]);

  // ── Giriş yapılınca bir kez Pull ──────────────────────────────────────────
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

  // ── Veri değişince debounced Push (3 sn) ─────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !hasPulledRef.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      push();
    }, 3000);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, sales, dividends, isAuthenticated]);

  const manualPush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    push();
  }, [push]);

  const manualPull = useCallback(() => {
    pull();
  }, [pull]);

  return { syncStatus, lastSynced, syncError, manualPush, manualPull };
}
