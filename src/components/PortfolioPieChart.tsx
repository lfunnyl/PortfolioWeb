import { useMemo } from 'react';
import { PortfolioRow } from '../types/asset';

interface PieProps {
  rows: PortfolioRow[];
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  crypto:   '#f59e0b',
  metal:    '#eab308',
  forex:    '#3b82f6',
  stock_tr: '#10b981',
  stock_us: '#8b5cf6',
};

const CATEGORY_LABELS: Record<string, string> = {
  crypto:   '₿ Kripto',
  metal:    '🥇 Metal',
  forex:    '💵 Döviz',
  stock_tr: '🇹🇷 BIST',
  stock_us: '🇺🇸 ABD Hisse',
};

function fmtCurr(n: number, curr = 'TRY') {
  return (curr === 'TRY' ? '₺' : '$') +
    n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function PortfolioPieChart({ rows, displayCurrency = 'TRY', usdRate = 1 }: PieProps) {
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const cat = r.assetDef.category;
      map[cat] = (map[cat] || 0) + r.currentValueTRY;
    });
    const totalTRY = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([cat, valueTRY]) => ({
        cat,
        valueTRY,
        value: displayCurrency === 'USD' ? valueTRY / usdRate : valueTRY,
        pct: totalTRY > 0 ? (valueTRY / totalTRY) * 100 : 0,
        color: CATEGORY_COLORS[cat] ?? '#64748b',
        label: CATEGORY_LABELS[cat] ?? cat,
      }))
      .sort((a, b) => b.valueTRY - a.valueTRY);
  }, [rows, displayCurrency, usdRate]);

  // Portfolio grubu bazlı dağılım
  const groupData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const g = (r as any).portfolioGroup || 'Diğer';
      map[g] = (map[g] || 0) + r.currentValueTRY;
    });
    const totalTRY = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([group, valueTRY]) => ({
        group,
        value: displayCurrency === 'USD' ? valueTRY / usdRate : valueTRY,
        pct: totalTRY > 0 ? (valueTRY / totalTRY) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rows, displayCurrency, usdRate]);

  if (categoryData.length === 0) return null;

  // SVG Donut chart
  const SIZE = 200;
  const RADIUS = 80;
  const HOLE = 50;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  let cumAngle = -Math.PI / 2; // Saat 12'den başla
  const slices = categoryData.map(d => {
    const angle = (d.pct / 100) * Math.PI * 2;
    const startA = cumAngle;
    const endA = cumAngle + angle;
    cumAngle = endA;

    const x1 = cx + RADIUS * Math.cos(startA);
    const y1 = cy + RADIUS * Math.sin(startA);
    const x2 = cx + RADIUS * Math.cos(endA);
    const y2 = cy + RADIUS * Math.sin(endA);
    const ix1 = cx + HOLE * Math.cos(endA);
    const iy1 = cy + HOLE * Math.sin(endA);
    const ix2 = cx + HOLE * Math.cos(startA);
    const iy2 = cy + HOLE * Math.sin(startA);

    const largeArc = angle > Math.PI ? 1 : 0;
    const path = [
      `M ${x1} ${y1}`,
      `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${HOLE} ${HOLE} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    const midA = startA + angle / 2;
    const labelR = RADIUS + 18;
    const lx = cx + labelR * Math.cos(midA);
    const ly = cy + labelR * Math.sin(midA);

    return { ...d, path, lx, ly, midA };
  });

  return (
    <div className="glass-card pie-chart-card">
      <h3 className="chart-title">📊 Portföy Dağılımı</h3>
      <div className="pie-chart-layout">
        {/* SVG Donut */}
        <div className="pie-svg-wrap">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              {slices.map(s => (
                <radialGradient key={s.cat + '_g'} id={`grad_${s.cat}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.65" />
                </radialGradient>
              ))}
            </defs>
            {slices.map(s => (
              <path
                key={s.cat}
                d={s.path}
                fill={`url(#grad_${s.cat})`}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1.5"
                className="pie-slice"
              />
            ))}
            {/* Merkez metin */}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#f0f4ff" fontSize="11" fontWeight="600">Portföy</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="9">Dağılımı</text>
          </svg>
        </div>

        {/* Legend */}
        <div className="pie-legend">
          {categoryData.map(d => (
            <div key={d.cat} className="pie-legend-item">
              <span className="pie-legend-dot" style={{ background: d.color }} />
              <span className="pie-legend-label">{d.label}</span>
              <span className="pie-legend-pct">{d.pct.toFixed(1)}%</span>
              <span className="pie-legend-val">{fmtCurr(d.value, displayCurrency)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Portföy Grubu Çubuk Grafiği */}
      {groupData.some(g => g.group !== 'Diğer') && (
        <div className="group-bars">
          <div className="group-bars-title">📁 Portföy Grubu Dağılımı</div>
          {groupData.map(g => (
            <div key={g.group} className="group-bar-row">
              <span className="group-bar-label">{g.group}</span>
              <div className="group-bar-track">
                <div
                  className="group-bar-fill"
                  style={{ width: `${g.pct}%` }}
                />
              </div>
              <span className="group-bar-pct">{g.pct.toFixed(1)}%</span>
              <span className="group-bar-val">{fmtCurr(g.value, displayCurrency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
