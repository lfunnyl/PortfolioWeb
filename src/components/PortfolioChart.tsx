import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PortfolioRow } from '../types/asset';

interface PortfolioChartProps {
  rows: PortfolioRow[];
  displayCurrency: 'TRY' | 'USD';
  usdRate: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

function fmtCurr(n: number, curr = 'TRY') {
  return (curr === 'TRY' ? '₺' : '$') + n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function PortfolioChart({ rows, displayCurrency, usdRate }: PortfolioChartProps) {
  const data = useMemo(() => {
    // Toplam değerleri Varlık tipine göre grupla (örn. Bitcoin, Altın vs.)
    const grouped = rows.reduce((acc, row) => {
      const val = displayCurrency === 'USD' ? row.currentValueTRY / usdRate : row.currentValueTRY;
      const key = row.assetDef.name;
      if (val > 0) {
        acc[key] = (acc[key] || 0) + val;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Büyükten küçüğe
  }, [rows, displayCurrency, usdRate]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-muted)' }}>Portföy Dağılımı</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                
                return percent > 0.05 ? (
                  <text x={x} y={y} fill="white" fontSize={11} textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                ) : null;
              }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(val: number) => fmtCurr(val, displayCurrency)} 
              itemStyle={{ color: 'var(--text)' }}
              contentStyle={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
