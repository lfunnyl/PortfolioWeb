import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { PortfolioSnapshot } from '../types/asset';

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  displayCurrency: 'TRY' | 'USD';
  usdRate: number;
}

type Range = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGES: { label: string; key: Range; days: number }[] = [
  { label: '1H',  key: '1W',  days: 7 },
  { label: '1A',  key: '1M',  days: 30 },
  { label: '3A',  key: '3M',  days: 90 },
  { label: '6A',  key: '6M',  days: 180 },
  { label: '1Y',  key: '1Y',  days: 365 },
  { label: 'Tüm', key: 'ALL', days: 99999 },
];

export function PerformanceChart({ snapshots, displayCurrency, usdRate }: PerformanceChartProps) {
  const [range, setRange] = useState<Range>('1M');

  const data = useMemo(() => {
    const days = RANGES.find(r => r.key === range)?.days ?? 30;
    const cutoff = Date.now() - days * 86400_000;

    return snapshots
      .filter(s => new Date(s.date).getTime() >= cutoff)
      .map(s => ({
        date: s.date.split('T')[0],
        value: displayCurrency === 'USD'
          ? parseFloat((s.totalValueTRY / usdRate).toFixed(2))
          : parseFloat(s.totalValueTRY.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [snapshots, range, displayCurrency, usdRate]);

  if (data.length < 2) return null;

  const currSymbol = displayCurrency === 'TRY' ? '₺' : '$';

  // Kazanç/Kayıp yüzdesi (ilk ve son)
  const first = data[0].value;
  const last  = data[data.length - 1].value;
  const pct   = first > 0 ? ((last - first) / first) * 100 : 0;
  const isPos = pct >= 0;

  return (
    <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>Performans Grafiği</h3>
          <span style={{ fontSize: '0.85rem', color: isPos ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {isPos ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}% ({isPos ? '+' : ''}{currSymbol}{(last - first).toLocaleString('tr-TR', { maximumFractionDigits: 0 })})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '0.2rem 0.55rem',
                fontSize: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: range === r.key ? 'var(--accent)' : 'var(--bg-2)',
                color: range === r.key ? 'white' : 'var(--text-muted)',
                fontWeight: range === r.key ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >{r.label}</button>
          ))}
        </div>
      </div>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={d => d.slice(5)} // MM-DD
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => currSymbol + v.toLocaleString('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })}
              width={65}
            />
            <Tooltip
              formatter={(v: number) => [`${currSymbol}${v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Portföy Değeri']}
              contentStyle={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPos ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
