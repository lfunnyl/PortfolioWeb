import { useState, useMemo } from 'react';
import { PortfolioRow } from '../types/asset';
import { fmtCurr, toDisplay } from '../utils/format';
import { ReportModal } from './ReportModal';
import { AssetCard, CATEGORY_LABELS, WeightBar, formatPartialDate, formatQuantity, daysSince } from './table/AssetCard';

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

export function AssetTable({ rows, isPriceLoading, onDelete, onEdit, onSell, displayCurrency = 'TRY', usdRate = 1 }: AssetTableProps) {
  const [viewMode,    setViewMode]    = useState<ViewMode>('table');
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortCol,     setSortCol]     = useState<SortCol>('value');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [pinned,      setPinned]      = useState<Set<string>>(new Set());
  const [reportState, setReportState] = useState<{ open: boolean; symbol: string; name: string }>({ open: false, symbol: '', name: '' });

  const C = displayCurrency as 'TRY' | 'USD';
  const conv = (n: number) => toDisplay(n, C, usdRate);
  const totalValue = rows.reduce((s, r) => s + r.currentValueTRY, 0);

  const categories = useMemo(() => Array.from(new Set(rows.map(r => r.assetDef.category))), [rows]);
  const groups = useMemo(() => Array.from(new Set(rows.map(r => r.portfolioGroup ?? 'Diğer').filter(Boolean))), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.assetDef.name.toLowerCase().includes(q)
      || r.assetDef.symbol.toLowerCase().includes(q)
      || (r.broker ?? '').toLowerCase().includes(q)
      || (r.portfolioGroup ?? '').toLowerCase().includes(q)
      || (r.note ?? '').toLowerCase().includes(q);
    return matchSearch
      && (catFilter === 'all' || r.assetDef.category === catFilter)
      && (groupFilter === 'all' || (r.portfolioGroup ?? 'Diğer') === groupFilter);
  }), [rows, search, catFilter, groupFilter]);

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

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function togglePin(id: string) {
    setPinned(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span style={{ color: 'var(--border)', marginLeft: 3 }}>⇅</span>;
    return <span style={{ color: 'var(--accent)', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function Th({ col, label, align = 'right' }: { col: SortCol; label: string; align?: string }) {
    return (
      <th className={`sortable align-${align}`} onClick={() => toggleSort(col)}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
        {label}<SortIcon col={col} />
      </th>
    );
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
        <div className="asset-search-wrap">
          <span className="asset-search-icon">🔍</span>
          <input className="asset-search" placeholder="Varlık, sembol, broker, grup ara..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="asset-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="asset-filter-chips">
          <button className={`asset-chip ${catFilter === 'all' ? 'chip-active' : ''}`} onClick={() => setCatFilter('all')}>🌐 Tümü</button>
          {categories.map(cat => {
            const c = CATEGORY_LABELS[cat];
            return (
              <button key={cat} className={`asset-chip ${catFilter === cat ? 'chip-active' : ''}`}
                onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
                style={catFilter === cat ? { background: c?.color + '25', borderColor: c?.color + '60', color: c?.color } : {}}>
                {c?.icon} {c?.label ?? cat}
              </button>
            );
          })}
        </div>

        {groups.length > 0 && (
          <div className="asset-filter-chips">
            <button className={`asset-chip ${groupFilter === 'all' ? 'chip-active' : ''}`} onClick={() => setGroupFilter('all')}>📁 Tüm Gruplar</button>
            {groups.map(g => (
              <button key={g} className={`asset-chip ${groupFilter === g ? 'chip-active' : ''}`}
                onClick={() => setGroupFilter(groupFilter === g ? 'all' : g)}>{g}</button>
            ))}
          </div>
        )}

        <div className="asset-view-toggle">
          <button className={`view-tog-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Tablo">⊞</button>
          <button className={`view-tog-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Kart">⊟</button>
        </div>
      </div>

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
                            <span className="cat-mini-badge" style={{ background: catInfo.color + '18', color: catInfo.color }}>
                              {catInfo.icon ?? ''} {CATEGORY_LABELS[row.assetDef.category]?.label ?? ''}
                            </span>
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
                      {isPriceLoading && row.currentPriceTRY === 0
                        ? <span className="skeleton-line" style={{ width: 60, display: 'inline-block' }} />
                        : fmtCurr(conv(row.currentPriceTRY), C)}
                    </td>
                    <td className="align-right">{fmtCurr(conv(row.totalCostTRY), C)}</td>
                    <td className="align-right"><strong>{fmtCurr(conv(row.currentValueTRY), C)}</strong></td>
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
                          <button className="btn-action" onClick={() => setReportState({ open: true, symbol: row.assetDef.symbol, name: row.assetDef.name })} title="Rapor">📄</button>
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

          {sorted.length > 0 && (
            <div className="table-footer-summary">
              <span>📊 {sorted.length} varlık</span>
              <span>Toplam Değer: <strong>{fmtCurr(conv(sorted.reduce((s, r) => s + r.currentValueTRY, 0)), C)}</strong></span>
              <span>Toplam Maliyet: <strong>{fmtCurr(conv(sorted.reduce((s, r) => s + r.totalCostTRY, 0)), C)}</strong></span>
              <span className={sorted.reduce((s, r) => s + r.profitLossTRY, 0) >= 0 ? 'profit' : 'loss'}>
                Net K/Z: <strong>{fmtCurr(conv(sorted.reduce((s, r) => s + r.profitLossTRY, 0)), C)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── KART GÖRÜNÜMÜ ── */}
      {viewMode === 'card' && (
        <div className="asset-cards-grid">
          {sorted.map(row => (
            <AssetCard key={row.id} row={row} totalValue={totalValue}
              onEdit={onEdit} onSell={onSell} onDelete={onDelete}
              onReport={(s, n) => setReportState({ open: true, symbol: s, name: n })}
              displayCurrency={displayCurrency} usdRate={usdRate}
              pinned={pinned.has(row.id)} onPin={togglePin} />
          ))}
        </div>
      )}

      {sorted.length === 0 && rows.length > 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Arama sonucu bulunamadı.</p>
          <button className="btn-cancel" style={{ marginTop: '0.5rem' }}
            onClick={() => { setSearch(''); setCatFilter('all'); setGroupFilter('all'); }}>
            Filtreleri Temizle
          </button>
        </div>
      )}

      {reportState.open && (
        <ReportModal symbol={reportState.symbol} name={reportState.name}
          onClose={() => setReportState({ open: false, symbol: '', name: '' })} />
      )}
    </div>
  );
}
