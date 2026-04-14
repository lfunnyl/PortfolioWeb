import { useMemo } from 'react';
import { PortfolioRow } from '../types/asset';

interface SummaryCardProps {
  rows: PortfolioRow[];
  isPriceLoading?: boolean;
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
  totalDividendTRY?: number;
}

function fmt(n: number, currency: 'TRY'|'USD') {
  return (currency === 'TRY' ? '₺' : '$') + n.toLocaleString(currency === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(n: number, currency: 'TRY'|'USD') {
  const sym = currency === 'TRY' ? '₺' : '$';
  if (Math.abs(n) >= 1_000_000) return `${sym}${(n/1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `${sym}${(n/1_000).toFixed(1)}K`;
  return fmt(n, currency);
}

export function SummaryCard({ rows, isPriceLoading, displayCurrency = 'TRY', usdRate = 1, totalDividendTRY = 0 }: SummaryCardProps) {
  // DCA: Her benzersiz assetId için ağırlıklı ortalama maliyet
  const dcaMap = useMemo(() => {
    const map: Record<string, { totalCost: number; totalQty: number; name: string; icon: string }> = {};
    rows.forEach(r => {
      const id = r.assetId;
      if (!map[id]) map[id] = { totalCost: 0, totalQty: 0, name: r.assetDef.name, icon: r.assetDef.icon };
      map[id].totalCost += r.totalCostTRY;
      map[id].totalQty  += r.quantity;
    });
    return Object.entries(map).map(([id, v]) => ({
      id,
      name: v.name,
      icon: v.icon,
      avgCostTRY: v.totalQty > 0 ? v.totalCost / v.totalQty : 0,
      totalQty: v.totalQty,
    }));
  }, [rows]);

  // Portföy grubu bazlı özet
  const groupSummary = useMemo(() => {
    const map: Record<string, { value: number; cost: number }> = {};
    rows.forEach(r => {
      const entry = r as any;
      const g = entry.portfolioGroup || '';
      if (!g) return;
      if (!map[g]) map[g] = { value: 0, cost: 0 };
      map[g].value += r.currentValueTRY;
      map[g].cost  += r.totalCostTRY;
    });
    return Object.entries(map).map(([g, v]) => ({
      group: g, value: v.value, cost: v.cost,
      pnlPct: v.cost > 0 ? ((v.value - v.cost) / v.cost) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="glass-card welcome-card">
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚀</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Portföyüne Hoş Geldin!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
            Kripto, hisse senedi, döviz ve kıymetli madenlerini tek bir yerde takip et.
            <br/>Aşağıdaki <strong>"+ Varlık Ekle"</strong> butonuna basarak ilk yatırımını ekle!
          </p>
        </div>
      </div>
    );
  }

  let totalValue = rows.reduce((s, r) => s + r.currentValueTRY, 0);
  let totalCost  = rows.reduce((s, r) => s + r.totalCostTRY, 0);

  if (displayCurrency === 'USD') {
    totalValue /= usdRate;
    totalCost /= usdRate;
  }

  const totalPnL    = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isProfit    = totalPnL >= 0;

  const divDisplay     = displayCurrency === 'USD' ? totalDividendTRY / usdRate : totalDividendTRY;
  const totalNetReturn = totalPnL + divDisplay;
  const netReturnPct   = totalCost > 0 ? (totalNetReturn / totalCost) * 100 : 0;

  const sorted = [...rows].sort((a, b) => b.profitLossPct - a.profitLossPct);
  const best   = sorted[0];
  const worst  = sorted[sorted.length - 1];

  const categoryCount: Record<string, number> = {};
  rows.forEach(r => {
    const cat = r.assetDef.category;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const loading = isPriceLoading && totalValue === 0;

  return (
    <div className="summary-grid">
      {/* Toplam Portföy Değeri */}
      <div className="glass-card summary-card summary-main">
        <span className="summary-label">Toplam Portföy Değeri</span>
        {loading
          ? <span className="skeleton summary-skeleton">——————————</span>
          : <span className="summary-value" style={{ fontSize: '1.6rem' }}>{fmt(totalValue, displayCurrency)}</span>}
        <div className="summary-breakdown">
          {Object.entries(categoryCount).map(([cat, count]) => {
            const labels: Record<string, string> = { crypto: '₿ Kripto', metal: '🥇 Metal', forex: '💵 Döviz', stock_tr: '🇹🇷 BIST', stock_us: '🇺🇸 ABD' };
            return <span key={cat} className="category-chip">{labels[cat] ?? cat} ({count})</span>;
          })}
        </div>
      </div>

      {/* Toplam Maliyet + DCA (tek varlık) */}
      <div className="glass-card summary-card">
        <span className="summary-label">Toplam Maliyet</span>
        <span className="summary-value secondary">{fmt(totalCost, displayCurrency)}</span>
        {dcaMap.length === 1 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
            📐 DCA Ort: {fmt(displayCurrency === 'USD' ? dcaMap[0].avgCostTRY / usdRate : dcaMap[0].avgCostTRY, displayCurrency)} / adet
          </span>
        )}
      </div>

      {/* Gerçekleşmemiş K/Z */}
      <div className={`glass-card summary-card ${isProfit ? 'profit-card' : 'loss-card'}`}>
        <span className="summary-label">Gerçekleşmemiş Kar / Zarar</span>
        {loading
          ? <span className="skeleton summary-skeleton">——————————</span>
          : <>
              <span className={`summary-value ${isProfit ? 'profit' : 'loss'}`}>
                {isProfit ? '▲ +' : '▼ '}{fmt(totalPnL, displayCurrency)}
              </span>
              <span className={`summary-pct ${isProfit ? 'profit' : 'loss'}`}>
                {isProfit ? '+' : ''}{totalPnLPct.toFixed(2)}%
              </span>
            </>}
      </div>

      {/* Net Toplam Getiri */}
      {(totalPnL !== 0 || divDisplay > 0) && (
        <div className="glass-card summary-card net-return-card">
          <span className="summary-label">⚡ Net Toplam Getiri</span>
          {loading
            ? <span className="skeleton summary-skeleton">——————————</span>
            : <>
                <span className={`summary-value ${totalNetReturn >= 0 ? 'profit' : 'loss'}`}>
                  {totalNetReturn >= 0 ? '+' : ''}{fmt(totalNetReturn, displayCurrency)}
                </span>
                <span className={`summary-pct ${netReturnPct >= 0 ? 'profit' : 'loss'}`}>
                  {netReturnPct >= 0 ? '+' : ''}{netReturnPct.toFixed(2)}%
                  {divDisplay > 0 && (
                    <span style={{ color: '#10b981', marginLeft: '0.4rem', fontSize: '0.7rem' }}>
                      +{fmtCompact(divDisplay, displayCurrency)} temettü
                    </span>
                  )}
                </span>
              </>}
        </div>
      )}

      {/* Temettü */}
      {totalDividendTRY > 0 && (
        <div className="glass-card summary-card">
          <span className="summary-label">💰 Toplam Temettü Geliri</span>
          <span className="summary-value" style={{ color: '#10b981' }}>{fmt(divDisplay, displayCurrency)}</span>
        </div>
      )}

      {/* En İyi / Kötü */}
      {best && (
        <div className="glass-card summary-card">
          <span className="summary-label">🏆 En İyi Performans</span>
          <span className="summary-value secondary">
            {best.assetDef.icon} {best.assetDef.name}
            <span className="profit" style={{ marginLeft: '0.5rem' }}>+{best.profitLossPct.toFixed(2)}%</span>
          </span>
          {worst && worst.id !== best.id && (
            <span className="summary-pct" style={{ marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {worst.assetDef.icon} {worst.assetDef.name}
                <span className="loss" style={{ marginLeft: '0.4rem' }}>{worst.profitLossPct.toFixed(2)}%</span>
              </span>
            </span>
          )}
        </div>
      )}

      {/* DCA Özet — Birden fazla varlık */}
      {dcaMap.length > 1 && (
        <div className="glass-card summary-card dca-card" style={{ gridColumn: '1 / -1' }}>
          <span className="summary-label">📐 DCA Ortalama Maliyet (Tüm Varlıklar)</span>
          <div className="dca-list">
            {dcaMap.map(d => (
              <div key={d.id} className="dca-item">
                <span className="dca-icon">{d.icon}</span>
                <span className="dca-name">{d.name}</span>
                <span className="dca-avg">{fmt(displayCurrency === 'USD' ? d.avgCostTRY / usdRate : d.avgCostTRY, displayCurrency)}</span>
                <span className="dca-qty">({d.totalQty.toFixed(4)} adet)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portföy Grubu Özeti */}
      {groupSummary.length > 0 && (
        <div className="glass-card summary-card" style={{ gridColumn: '1 / -1' }}>
          <span className="summary-label">📁 Portföy Grubu Özeti</span>
          <div className="group-summary-list">
            {groupSummary.map(g => (
              <div key={g.group} className="group-summary-item">
                <span className="group-name">{g.group}</span>
                <span className="group-value">{fmtCompact(displayCurrency === 'USD' ? g.value / usdRate : g.value, displayCurrency)}</span>
                <span className={`group-pnl ${g.pnlPct >= 0 ? 'profit' : 'loss'}`}>
                  {g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
