/** Gelecek değer hesabı: aylık katkı * bileşik büyüme. */
export function fv(monthly: number, months: number, annualRate: number): number {
  const r = annualRate / 12;
  return r > 0
    ? monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
    : monthly * months;
}

export const MINI_BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316',
];

export function MiniBar({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
      <span style={{ width: 110, color: 'var(--text-dim)', fontSize: '0.75rem', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ width: 80, textAlign: 'right', fontWeight: 700, color }}>
        {suffix}{value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(0)}B` : value.toFixed(0)}
      </span>
    </div>
  );
}

export type SimProps = {
  conv: (n: number) => number;
  C: 'TRY' | 'USD';
};
