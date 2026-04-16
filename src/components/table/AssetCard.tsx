import { PortfolioRow } from '../../types/asset';
import { fmtCurr, fmtNum, toDisplay } from '../../utils/format';

// ─── Paylaşılan Sabitler ─────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  crypto:   { label: 'Kripto', icon: '₿',   color: '#f59e0b' },
  metal:    { label: 'Metal',  icon: '🥇',  color: '#eab308' },
  forex:    { label: 'Döviz',  icon: '💱',  color: '#06b6d4' },
  stock_tr: { label: 'BIST',  icon: '🇹🇷', color: '#3b82f6' },
  stock_us: { label: 'ABD',   icon: '🇺🇸', color: '#8b5cf6' },
};

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────

export function formatPartialDate(row: PortfolioRow): string {
  const p = row.purchaseDatePartial;
  if (!p || (!p.day && !p.month && !p.year)) {
    return row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString('tr-TR') : '—';
  }
  const parts: string[] = [];
  if (p.day)   parts.push(String(p.day).padStart(2, '0'));
  if (p.month) parts.push(String(p.month).padStart(2, '0'));
  if (p.year)  parts.push(String(p.year));
  return parts.join('/');
}

export function formatQuantity(row: PortfolioRow): string {
  const unit = row.quantityUnit;
  if (!unit || unit === 'adet') return fmtNum(row.quantity, row.quantity < 100 ? 4 : 2);
  return `${fmtNum(row.quantity, 2)} g`;
}

export function daysSince(row: PortfolioRow): number | null {
  const p = row.purchaseDatePartial;
  let iso = '';
  if (p?.year) {
    iso = `${p.year}-${String(p.month ?? 1).padStart(2, '0')}-${String(p.day ?? 1).padStart(2, '0')}`;
  } else if (row.purchaseDate) {
    iso = row.purchaseDate.split('T')[0];
  }
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ─── Mini Alt Bileşenler ─────────────────────────────────────────

export function PnLBar({ pct }: { pct: number }) {
  const clamped = Math.max(-100, Math.min(100, pct));
  const isPositive = clamped >= 0;
  const width = `${Math.abs(clamped)}%`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width, height: '100%', borderRadius: 2,
          background: isPositive ? '#10b981' : '#ef4444',
          marginLeft: isPositive ? '50%' : `calc(50% - ${width})`,
          transition: 'all 0.5s ease',
        }} />
      </div>
    </div>
  );
}

export function WeightBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── AssetCard ───────────────────────────────────────────────────

interface AssetCardProps {
  row: PortfolioRow;
  totalValue: number;
  onEdit: (id: string) => void;
  onSell: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (symbol: string, name: string) => void;
  displayCurrency: string;
  usdRate: number;
  pinned: boolean;
  onPin: (id: string) => void;
}

export function AssetCard({ row, totalValue, onEdit, onSell, onDelete, onReport, displayCurrency, usdRate, pinned, onPin }: AssetCardProps) {
  const C = displayCurrency as 'TRY' | 'USD';
  const conv = (n: number) => toDisplay(n, C, usdRate);
  const isProfit = row.profitLossTRY >= 0;
  const weight = totalValue > 0 ? (row.currentValueTRY / totalValue) * 100 : 0;
  const catInfo = CATEGORY_LABELS[row.assetDef.category] ?? { color: '#64748b', label: '', icon: '' };
  const days = daysSince(row);

  return (
    <div className={`asset-card-premium ${pinned ? 'asset-card-pinned' : ''}`} style={{ borderLeft: `3px solid ${catInfo.color}40` }}>
      <div className="acp-header">
        <div className="acp-identity">
          <span className="acp-icon">{row.assetDef.icon}</span>
          <div>
            <div className="acp-name">{row.assetDef.name}</div>
            <div className="acp-meta">
              <span className="acp-badge" style={{ background: catInfo.color + '22', color: catInfo.color }}>{catInfo.icon} {catInfo.label}</span>
              {row.portfolioGroup && <span className="acp-badge-group">{row.portfolioGroup}</span>}
              {row.broker && <span className="acp-badge-broker">🏦 {row.broker}</span>}
            </div>
          </div>
        </div>
        <div className="acp-actions">
          {(row.assetDef.category === 'stock_tr' || row.assetDef.category === 'stock_us') && (
            <button className="btn-action" onClick={() => onReport(row.assetDef.symbol, row.assetDef.name)} title="Gündem / PDF Rapor">📄</button>
          )}
          <button className={`acp-pin-btn ${pinned ? 'pinned' : ''}`} onClick={() => onPin(row.id)} title={pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}>📌</button>
          <button className="btn-action btn-edit" onClick={() => onEdit(row.id)} title="Düzenle">✏️</button>
          <button className="btn-action btn-sell" onClick={() => onSell(row.id)} title="Sat">💰</button>
          <button className="btn-action btn-delete" onClick={() => onDelete(row.id)} title="Sil">✕</button>
        </div>
      </div>

      <div className="acp-values">
        <div className="acp-val-main">
          <span className="acp-val-label">Güncel Değer</span>
          <span className="acp-val-num">{fmtCurr(conv(row.currentValueTRY), C)}</span>
        </div>
        <div className="acp-val-block">
          <span className="acp-val-label">K / Z</span>
          <span className={`acp-val-pnl ${isProfit ? 'profit' : 'loss'}`}>
            {isProfit ? '+' : ''}{fmtCurr(conv(row.profitLossTRY), C)}
          </span>
        </div>
        <div className="acp-val-block">
          <span className="acp-val-label">Getiri %</span>
          <span className={`acp-pct-badge ${isProfit ? 'acp-profit' : 'acp-loss'}`}>
            {isProfit ? '▲ +' : '▼ '}{Math.abs(row.profitLossPct).toFixed(2)}%
          </span>
        </div>
      </div>

      <PnLBar pct={row.profitLossPct} />

      <div className="acp-details">
        <div className="acp-detail-item">
          <span className="acp-detail-label">Miktar</span>
          <span className="acp-detail-val">{formatQuantity(row)}</span>
        </div>
        <div className="acp-detail-item">
          <span className="acp-detail-label">Alış Fiyatı</span>
          <span className="acp-detail-val">{fmtCurr(conv(row.purchasePriceTRY), C)}</span>
        </div>
        <div className="acp-detail-item">
          <span className="acp-detail-label">Güncel Fiyat</span>
          <span className="acp-detail-val">{fmtCurr(conv(row.currentPriceTRY), C)}</span>
        </div>
        <div className="acp-detail-item">
          <span className="acp-detail-label">Maliyet</span>
          <span className="acp-detail-val">{fmtCurr(conv(row.totalCostTRY), C)}</span>
        </div>
        {formatPartialDate(row) !== '—' && (
          <div className="acp-detail-item">
            <span className="acp-detail-label">Alış Tarihi</span>
            <span className="acp-detail-val">
              {formatPartialDate(row)}
              {days !== null && days > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '0.7rem' }}>({days}g)</span>}
            </span>
          </div>
        )}
        {row.note && (
          <div className="acp-detail-item" style={{ gridColumn: '1/-1' }}>
            <span className="acp-detail-label">📝 Not</span>
            <span className="acp-detail-val" style={{ color: 'var(--text-muted)' }}>{row.note}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portföy Ağırlığı</span>
        <WeightBar pct={weight} color={catInfo.color} />
      </div>
    </div>
  );
}
