import { useEffect, useRef, useCallback } from 'react';
import { PortfolioRow, DividendEntry } from '../types/asset';

export interface AppNotification {
  id: string;
  type: 'warning' | 'success' | 'info' | 'danger';
  title: string;
  message: string;
  timestamp: Date;
}

// Tek oturum başına bir kez göster bayrağı
const SHOWN_KEY = 'notif_shown_ids';
function getShownIds(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(SHOWN_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function markShown(id: string) {
  const ids = getShownIds();
  ids.add(id);
  sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...ids]));
}

// ── Hedef eşiği kontrolü ────────────────────────────────────────────────────
function checkGoals(totalTRY: number): AppNotification[] {
  const notifs: AppNotification[] = [];
  try {
    const goals: Array<{ id: string; name: string; targetAmount: number }> =
      JSON.parse(localStorage.getItem('portfolio_goals') ?? '[]');

    for (const g of goals) {
      const pct = totalTRY / g.targetAmount;
      const milestones = [0.25, 0.5, 0.75, 0.9, 1.0];
      for (const m of milestones) {
        if (pct >= m) {
          const notifId = `goal_${g.id}_${m}`;
          if (!getShownIds().has(notifId)) {
            const isComplete = m === 1.0;
            notifs.push({
              id: notifId,
              type: isComplete ? 'success' : 'info',
              title: isComplete ? '🎯 Hedefe Ulaştın!' : `🎯 Hedef %${m * 100} Tamamlandı`,
              message: `"${g.name}" hedefinin %${Math.round(pct * 100)}'ine ulaştın.`,
              timestamp: new Date(),
            });
          }
        }
      }
    }
  } catch { /* ignore */ }
  return notifs;
}

// ── Sert düşüş kontrolü ─────────────────────────────────────────────────────
function checkSharpDrops(rows: PortfolioRow[]): AppNotification[] {
  const notifs: AppNotification[] = [];
  for (const row of rows) {
    if (row.isLoading) continue;
    if (row.profitLossPct <= -15) {
      const notifId = `drop_${row.id}_${Math.floor(row.profitLossPct / 5) * 5}`;
      if (!getShownIds().has(notifId)) {
        notifs.push({
          id: notifId,
          type: 'danger',
          title: `⚠️ Sert Düşüş: ${row.assetDef.symbol}`,
          message: `${row.assetDef.name} değeri %${Math.abs(row.profitLossPct).toFixed(1)} zararda.`,
          timestamp: new Date(),
        });
      }
    }
  }
  return notifs;
}

// ── Temettü hatırlatıcısı ────────────────────────────────────────────────────
function checkDividendReminders(dividends: DividendEntry[]): AppNotification[] {
  const notifs: AppNotification[] = [];
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear  = today.getFullYear();

  // Son 12 ay içinde aynı ay temettü alan varlıklar → bu ay da alabilir uyarısı
  const monthMap = new Map<string, number>();
  for (const d of dividends) {
    const date = new Date(d.date);
    if (date.getFullYear() === currentYear - 1 && date.getMonth() + 1 === currentMonth) {
      monthMap.set(d.assetId, (monthMap.get(d.assetId) ?? 0) + d.amountTRY);
    }
  }
  for (const [assetId, amount] of monthMap.entries()) {
    const notifId = `div_reminder_${assetId}_${currentYear}_${currentMonth}`;
    if (!getShownIds().has(notifId)) {
      notifs.push({
        id: notifId,
        type: 'info',
        title: '🏦 Temettü Hatırlatıcısı',
        message: `Geçen yıl bu ay "${assetId}" için ≈${amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺ temettü almıştınız.`,
        timestamp: new Date(),
      });
    }
  }
  return notifs;
}

// ── Ana hook ─────────────────────────────────────────────────────────────────
interface UseNotificationsProps {
  rows: PortfolioRow[];
  dividends: DividendEntry[];
  totalPortfolioTRY: number;
  onNotifications: (notifs: AppNotification[]) => void;
}

export function useNotifications({
  rows,
  dividends,
  totalPortfolioTRY,
  onNotifications,
}: UseNotificationsProps) {
  // Sadece fiyatlar yüklenince çalıştır
  const pricesLoaded = rows.length > 0 && rows.every(r => !r.isLoading);
  const ranRef = useRef(false);

  const run = useCallback(() => {
    const all: AppNotification[] = [
      ...checkSharpDrops(rows),
      ...checkGoals(totalPortfolioTRY),
      ...checkDividendReminders(dividends),
    ];
    if (all.length > 0) {
      all.forEach(n => markShown(n.id));
      onNotifications(all);
    }
  }, [rows, dividends, totalPortfolioTRY, onNotifications]);

  useEffect(() => {
    if (!pricesLoaded) return;
    if (ranRef.current) return;
    ranRef.current = true;
    // Kısa gecikme ile çalıştır (sayfa yüklenmesini bekle)
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, [pricesLoaded, run]);
}
