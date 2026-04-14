import { useState, useMemo } from 'react';
import { PortfolioRow } from '../types/asset';
import { fmtCurr, fmtNum, toDisplay } from '../utils/format';
import { ReportModal } from './ReportModal';

interface AssetTableProps {
  rows: PortfolioRow[];
  isPriceLoading: boolean;
  onDelete: (id: string) => void;
  onEdit:   (id: string) => void;
  onSell:   (id: string) => void;
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

type SortCol = 'name' | 'date' | 'qty' | 'buyPrice' | 'currentPrice' | 'cost' | 'value' | 'pnl' | 'pnlPct' | 'weight';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'card';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  crypto:   { label: 'Kripto',  icon: '₿',   color: '#f59e0b' },
  metal:    { label: 'Metal',   icon: '🥇',  color: '#eab308' },
  forex:    { label: 'Döviz',   icon: '💱',  color: '#06b6d4' },
  stock_tr: { label: 'BIST',   icon: '🇹🇷', color: '#3b82f6' },
  stock_us: { label: 'ABD',    icon: '🇺🇸', color: '#8b5cf6' },
};

function formatPartialDate(row: PortfolioRow): string {
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

function formatQuantity(row: PortfolioRow): string {
  const unit = row.quantityUnit;
  if (!unit || unit === 'adet') return fmtNum(row.quantity, row.quantity < 100 ? 4 : 2);
  return `${fmtNum(row.quantity, 2)} g`;
}

function daysSince(row: PortfolioRow): number | null {
  const p = row.purchaseDatePartial;
  let iso = '';
  if (p?.year) {
    iso = `${p.year}-${String(p.month ?? 1).padStart(2,'0')}-${String(p.day ?? 1).padStart(2,'0')}`;
  } else if (row.purchaseDate) {
    iso = row.purchaseDate.split('T')[0];
  }
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86400000);
}

function PnLBar({ pct }: { pct: number }) {
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

function WeightBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── Kart Görünümü ──────────────────────────────────
function AssetCard({ row, totalValue, onEdit, onSell, onDelete, onReport, displayCurrency, usdRate, pinned, onPin }:{
  row: PortfolioRow;
  totalValue: number;
  onEdit: (id:string)=>void;
  onSell: (id:string)=>void;
  onDelete: (id:string)=>void;
  onReport: (symbol: string, name: string) => void;
  displayCurrency: string;
  usdRate: number;

  pinned: boolean;
  onPin: (id:string)=>void;
}) {
  const C = displayCurrency as 'TRY'|'USD';
  const conv = (n: number) => toDisplay(n, C, usdRate);
  const isProfit = row.profitLossTRY >= 0;
  const weight = totalValue > 0 ? (row.currentValueTRY / totalValue) * 100 : 0;
  const catInfo = CATEGORY_LABELS[row.assetDef.category] ?? { color: '#64748b', label: '', icon: '' };
  const days = daysSince(row);

  return (
    <div className={`asset-card-premium ${pinned ? 'asset-card-pinned' : ''}`} style={{ borderLeft: `3px solid ${catInfo.color}40` }}>
      {/* Üst Kısım */}
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


      {/* Değer Bölümü */}
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

      {/* P&L Bar */}
      <PnLBar pct={row.profitLossPct} />

      {/* Alt Detay */}
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
            <span className="acp-detail-val">{formatPartialDate(row)}{days !== null && days > 0 && <span style={{color:'var(--text-muted)',marginLeft:'4px',fontSize:'0.7rem'}}>({days}g)</span>}</span>
          </div>
        )}
        {row.note && (
          <div className="acp-detail-item" style={{ gridColumn: '1/-1' }}>
            <span className="acp-detail-label">📝 Not</span>
            <span className="acp-detail-val" style={{ color: 'var(--text-muted)' }}>{row.note}</span>
          </div>
        )}
      </div>

      {/* Portföy Ağırlığı */}
      <div style={{ marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portföy Ağırlığı</span>
        <WeightBar pct={weight} color={catInfo.color} />
      </div>
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────
export function AssetTable({ rows, isPriceLoading, onDelete, onEdit, onSell, displayCurrency = 'TRY', usdRate = 1 }: AssetTableProps) {
  const [viewMode,   setViewMode]   = useState<ViewMode>('table');
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [groupFilter,setGroupFilter]= useState('all');
  const [sortCol,    setSortCol]    = useState<SortCol>('value');
  const [sortDir,    setSortDir]    = useState<SortDir>('desc');
  const [pinned,     setPinned]     = useState<Set<string>>(new Set());
  const [reportState, setReportState] = useState<{ open: boolean, symbol: string, name: string }>({ open: false, symbol: '', name: '' });

  const C = displayCurrency as 'TRY'|'USD';
  const conv = (n: number) => toDisplay(n, C, usdRate);

  const totalValue = rows.reduce((s, r) => s + r.currentValueTRY, 0);

  // Filtre sonuçları
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || r.assetDef.name.toLowerCase().includes(q)
        || r.assetDef.symbol.toLowerCase().includes(q)
        || (r.broker ?? '').toLowerCase().includes(q)
        || (r.portfolioGroup ?? '').toLowerCase().includes(q)
        || (r.note ?? '').toLowerCase().includes(q);
      const matchCat = catFilter === 'all' || r.assetDef.category === catFilter;
      const matchGroup = groupFilter === 'all' || (r.portfolioGroup ?? 'Diğer') === groupFilter;
      return matchSearch && matchCat && matchGroup;
    });
  }, [rows, search, catFilter, groupFilter]);

  // Sıralama
  const sorted = useMemo(() => {
    const mul = sortDir === 'asc' ? 1 : -1;
    const pinnedRows = filtered.filter(r => pinned.has(r.id));
    const rest = filtered.filter(r => !pinned.has(r.id)).sort((a, b) => {
      switch (sortCol) {
        case 'name':         return mul * a.assetDef.name.localeCompare(b.assetDef.name, 'tr');
        case 'date':         return mul * (a.purchaseDate ?? '').localeCompare(b.purchaseDate ?? '');
        case 'qty':          return mul * (a.quantity - b.quantity);
        case 'buyPrice':     return mul * (a.purchasePriceTRY - b.purchasePriceTRY);
        case 'currentPrice': return mul * (a.currentPriceTRY - b.currentPriceTRY);
        case 'cost':         return mul * (a.totalCostTRY - b.totalCostTRY);
        case 'value':        return mul * (a.currentValueTRY - b.currentValueTRY);
        case 'pnl':          return mul * (a.profitLossTRY - b.profitLossTRY);
        case 'pnlPct':       return mul * (a.profitLossPct - b.profitLossPct);
        case 'weight':       return mul * (a.currentValueTRY - b.currentValueTRY);
        default:             return 0;
      }
    });
    return [...pinnedRows, ...rest];
  }, [filtered, sortCol, sortDir, pinned]);

  // Mevcut filtre seçenekleri
  const categories = useMemo(() => Array.from(new Set(rows.map(r => r.assetDef.category))), [rows]);
  const groups = useMemo(() => Array.from(new Set(rows.map(r => r.portfolioGroup ?? 'Diğer').filter(Boolean))), [rows]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }
  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span style={{ color: 'var(--border)', marginLeft: 3 }}>⇅</span>;
    return <span style={{ color: 'var(--accent)', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }
  function Th({ col, label, align = 'right' }: { col: SortCol; label: string; align?: string }) {
    return (
      <th className={`sortable align-${align}`} onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
        {label}<SortIcon col={col} />
      </th>
    );
  }

  function togglePin(id: string) {
    setPinned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">◈</span>
        <p>Henüz varlık eklenmedi.</p>
        <p className="empty-sub">Yukarıdaki "+ Varlık Ekle" butonuyla portföyünüzü oluşturun.</p>
      </div>
    );
  }

  return (
    <div className="asset-table-wrap">
      {/* ── Araç Çubuğu ── */}
      <div className="asset-toolbar">
        {/* Arama */}
        <div className="asset-search-wrap">
          <span className="asset-search-icon">🔍</span>
          <input
            className="asset-search"
            placeholder="Varlık, sembol, broker, grup ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="asset-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        {/* Kategori Filtresi */}
        <div className="asset-filter-chips">
          <button className={`asset-chip ${catFilter === 'all' ? 'chip-active' : ''}`} onClick={() => setCatFilter('all')}>
            🌐 Tümü
          </button>
          {categories.map(cat => {
            const c = CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                className={`asset-chip ${catFilter === cat ? 'chip-active' : ''}`}
                onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
                style={catFilter === cat ? { background: c?.color + '25', borderColor: c?.color + '60', color: c?.color } : {}}
              >
                {c?.icon} {c?.label ?? cat}
              </button>
            );
          })}
        </div>

        {/* Grup Filtresi */}
        {groups.length > 0 && (
          <div className="asset-filter-chips">
            <button className={`asset-chip ${groupFilter === 'all' ? 'chip-active' : ''}`} onClick={() => setGroupFilter('all')}>
              📁 Tüm Gruplar
            </button>
            {groups.map(g => (
              <button key={g} className={`asset-chip ${groupFilter === g ? 'chip-active' : ''}`} onClick={() => setGroupFilter(groupFilter === g ? 'all' : g)}>
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Görünüm Modu */}
        <div className="asset-view-toggle">
          <button className={`view-tog-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Tablo Görünümü">⊞</button>
          <button className={`view-tog-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Kart Görünümü">⊟</button>
        </div>
      </div>

      {/* Sonuç sayısı */}
      {(search || catFilter !== 'all' || groupFilter !== 'all') && (
        <div className="filter-result-info">
          {sorted.length} / {rows.length} varlık gösteriliyor
          {pinned.size > 0 && <span className="pin-info"> · 📌 {pinned.size} sabitlenmiş</span>}
        </div>
      )}

      {/* ── TABLO GÖRÜNÜMÜ ── */}
      {viewMode === 'table' && (
        <div className="table-wrapper">
          <table className="asset-table">
            <thead>
              <tr>
                <Th col="name" label="Varlık" align="left" />
                <Th col="date" label="Tarih" />
                <Th col="qty" label="Miktar" />
                <Th col="buyPrice" label="Alış Fiyatı" />
                <Th col="currentPrice" label="Güncel Fiyat" />
                <Th col="cost" label="Maliyet" />
                <Th col="value" label="Güncel Değer" />
                <Th col="pnlPct" label="K/Z %" />
                <Th col="weight" label="Ağırlık" />
                <th style={{ textAlign: 'center' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const isProfit = row.profitLossTRY >= 0;
                const weight = totalValue > 0 ? (row.currentValueTRY / totalValue) * 100 : 0;
                const catInfo = CATEGORY_LABELS[row.assetDef.category] ?? { color: '#64748b' };
                const days = daysSince(row);
                return (
                  <tr key={row.id} className={`asset-row${pinned.has(row.id) ? ' row-pinned' : ''}`}>
                    <td className="asset-name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className={`pin-mini ${pinned.has(row.id) ? 'pinned' : ''}`} onClick={() => togglePin(row.id)} title="Sabitle">📌</button>
                        <span className="asset-icon-sm">{row.assetDef.icon}</span>
                        <div>
                          <div className="asset-name-row">
                            <strong className="asset-name">{row.assetDef.name}</strong>
                            <span className="asset-symbol">{row.assetDef.symbol}</span>
                          </div>
                          <div className="asset-sub-badges">
                            <span className="cat-mini-badge" style={{ background: catInfo.color + '18', color: catInfo.color }}>{catInfo.icon ?? ''} {CATEGORY_LABELS[row.assetDef.category]?.label ?? ''}</span>
                            {row.portfolioGroup && <span className="group-mini-badge">{row.portfolioGroup}</span>}
                            {row.broker && <span className="broker-mini-badge">🏦 {row.broker}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="date-cell">
                      <div>{formatPartialDate(row)}</div>
                      {days !== null && days > 0 && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{days} gün</div>}
                    </td>
                    <td className="align-right">
                      <div>{formatQuantity(row)}</div>
                      {row.note && <div className="row-note" title={row.note}>📝</div>}
                      {row.feeRaw && <div className="row-note" title={`Masraf: ${row.feeRaw}`}>💸</div>}
                    </td>
                    <td className="align-right">{fmtCurr(conv(row.purchasePriceTRY), C)}</td>
                    <td className="align-right">
                      <div>{isPriceLoading && row.currentPriceTRY === 0 ? <span className="skeleton-line" style={{width:60,display:'inline-block'}} /> : fmtCurr(conv(row.currentPriceTRY), C)}</div>
                    </td>
                    <td className="align-right">{fmtCurr(conv(row.totalCostTRY), C)}</td>
                    <td className="align-right">
                      <strong>{fmtCurr(conv(row.currentValueTRY), C)}</strong>
                    </td>
                    <td className="align-right">
                      <div className={`pnl-main-val ${isProfit ? 'profit' : 'loss'}`}>
                        {isProfit ? '▲ +' : '▼ '}{Math.abs(row.profitLossPct).toFixed(2)}%
                      </div>
                      <div className={`pnl-sub-val ${isProfit ? 'profit' : 'loss'}`}>
                        {isProfit ? '+' : ''}{fmtCurr(conv(row.profitLossTRY), C)}
                      </div>
                    </td>
                    <td className="align-right" style={{ minWidth: 100 }}>
                      <WeightBar pct={weight} color={catInfo.color} />
                    </td>
                    <td>
                      <div className="action-btns">
                        {(row.assetDef.category === 'stock_tr' || row.assetDef.category === 'stock_us') && (
                          <button className="btn-action" onClick={() => setReportState({ open: true, symbol: row.assetDef.symbol, name: row.assetDef.name })} title="Gündem / PDF Rapor">📄</button>
                        )}
                        <button className="btn-action btn-edit" onClick={() => onEdit(row.id)} title="Düzenle">✏️</button>
                        <button className="btn-action btn-sell" onClick={() => onSell(row.id)} title="Sat">💰</button>
                        <button className="btn-action btn-delete" onClick={() => onDelete(row.id)} title="Sil">✕</button>
                      </div>
                    </td>
                  </tr>

                );
              })}
            </tbody>
          </table>

          {/* Tablo Alt Özeti */}
          {sorted.length > 0 && (
            <div className="table-footer-summary">
              <span>📊 {sorted.length} varlık</span>
              <span>Toplam Değer: <strong>{fmtCurr(conv(sorted.reduce((s,r)=>s+r.currentValueTRY,0)), C)}</strong></span>
              <span>Toplam Maliyet: <strong>{fmtCurr(conv(sorted.reduce((s,r)=>s+r.totalCostTRY,0)), C)}</strong></span>
              <span className={sorted.reduce((s,r)=>s+r.profitLossTRY,0)>=0?'profit':'loss'}>
                Net K/Z: <strong>{fmtCurr(conv(sorted.reduce((s,r)=>s+r.profitLossTRY,0)), C)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── KART GÖRÜNÜMÜ ── */}
      {viewMode === 'card' && (
        <div className="asset-cards-grid">
          {sorted.map(row => (
            <AssetCard
              key={row.id}
              row={row}
              totalValue={totalValue}
              onEdit={onEdit}
              onSell={onSell}
              onDelete={onDelete}
              onReport={(s, n) => setReportState({ open: true, symbol: s, name: n })}
              displayCurrency={displayCurrency}
              usdRate={usdRate}

              pinned={pinned.has(row.id)}
              onPin={togglePin}
            />
          ))}
        </div>
      )}

      {sorted.length === 0 && rows.length > 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Arama sonucu bulunamadı.</p>
          <button className="btn-cancel" style={{marginTop:'0.5rem'}} onClick={() => { setSearch(''); setCatFilter('all'); setGroupFilter('all'); }}>
            Filtreleri Temizle
          </button>
        </div>
      )}

      {reportState.open && (
        <ReportModal 
          symbol={reportState.symbol} 
          name={reportState.name} 
          onClose={() => setReportState({ open: false, symbol: '', name: '' })} 
        />
      )}
    </div>
  );
}
