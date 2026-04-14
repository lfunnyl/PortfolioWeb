import { useState, useEffect, useMemo } from 'react';
import { PortfolioRow, SplitEntry, DividendEntry } from '../types/asset';
import { getAssetDefinitions } from '../services/priceService';
import { loadSplits, addSplit, removeSplit, applySplitToEntries, undoSplitFromEntries } from '../utils/storage';

interface AdvancedViewProps {
  rows: PortfolioRow[];
  dividends: DividendEntry[];
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
  onEntriesChanged: () => void;
}

function fmtCurr(n: number, curr = 'TRY') {
  return (curr === 'TRY' ? '₺' : '$') + n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ── Sektör & Bölge etiketleri ─────────────────────────────── */
const SECTOR_MAP: Record<string, string> = {
  BTC:'Kripto', ETH:'Kripto', BNB:'Kripto', SOL:'Kripto', XRP:'Kripto',
  DOGE:'Kripto', ADA:'Kripto', AVAX:'Kripto', TRX:'Kripto', LINK:'Kripto',
  XAU:'Emtia', XAG:'Emtia',
  USD:'Döviz', EUR:'Döviz', GBP:'Döviz', CHF:'Döviz',
  THYAO:'Havacılık', EREGL:'Çelik', SASA:'Kimya', TUPRS:'Enerji',
  ASELS:'Savunma', KCHOL:'Holding',
  AAPL:'Teknoloji', TSLA:'Otomotiv', NVDA:'Teknoloji',
  AMZN:'E-Ticaret', MSFT:'Teknoloji',
};

const REGION_MAP: Record<string, string> = {
  BTC:'Global', ETH:'Global', BNB:'Global', SOL:'Global', XRP:'Global',
  DOGE:'Global', ADA:'Global', AVAX:'Global', TRX:'Global', LINK:'Global',
  XAU:'Global', XAG:'Global',
  USD:'ABD', EUR:'Avrupa', GBP:'İngiltere', CHF:'İsviçre',
  THYAO:'Türkiye', EREGL:'Türkiye', SASA:'Türkiye', TUPRS:'Türkiye',
  ASELS:'Türkiye', KCHOL:'Türkiye',
  AAPL:'ABD', TSLA:'ABD', NVDA:'ABD', AMZN:'ABD', MSFT:'ABD',
};

/* ── BIST Temettü Takvimi (statik, yaklaşık) ───────────────── */
const DIVIDEND_CALENDAR: Record<string, { period: string; months: number[] }> = {
  THYAO: { period: 'Nis-Haz, Eki-Kas', months: [4,5,6,10,11] },
  EREGL: { period: 'Mar-May', months: [3,4,5] },
  SASA:  { period: 'Nis-Haz', months: [4,5,6] },
  TUPRS: { period: 'May-Haz', months: [5,6] },
  ASELS: { period: 'Nis-Haz', months: [4,5,6] },
  KCHOL: { period: 'Nis-Haz', months: [4,5,6] },
};

function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

export function AdvancedView({ rows, dividends, displayCurrency = 'TRY', usdRate = 1, onEntriesChanged }: AdvancedViewProps) {
  const [splits, setSplits] = useState<SplitEntry[]>(() => loadSplits());
  const [splitAsset, setSplitAsset] = useState('');
  const [splitRatio, setSplitRatio] = useState('');
  const [splitDate, setSplitDate] = useState('');
  const [splitNote, setSplitNote] = useState('');
  const [splitMsg, setSplitMsg] = useState('');
  const [benchmarkData, setBenchmarkData] = useState<{sp500: number|null; xu100: number|null}>({ sp500: null, xu100: null });
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  // Bug fix #2: now → useMemo ile sabitlendi, sonsuz render riski giderildi
  const now = useMemo(() => new Date(), []);

  // Benchmark çekme (Yahoo Finance proxy)
  useEffect(() => {
    async function fetchBenchmark() {
      setBenchmarkLoading(true);
      const symbols = ['^GSPC', '^XU100.IS'];
      const yahooQuery = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
      
      const fetchPaths = [
        `/api/yahoo/v7/finance/quote?symbols=${symbols.join(',')}`, // Vite local proxy
        `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooQuery)}`,
        `https://corsproxy.io/?${encodeURIComponent(yahooQuery)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooQuery)}`
      ];

      for (const path of fetchPaths) {
        try {
          const res = await fetch(path, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) continue;
          const data = await res.json();
          const results = data?.quoteResponse?.result ?? [];
          if (results.length === 0) continue; // Boş döndüyse diğerine geç
          
          const sp = results.find((r: any) => r.symbol === '^GSPC');
          const xu = results.find((r: any) => r.symbol === '^XU100.IS');
          setBenchmarkData({
            sp500: sp?.regularMarketChangePercent ?? null,
            xu100: xu?.regularMarketChangePercent ?? null,
          });
          break;
        } catch { continue; }
      }
      setBenchmarkLoading(false);
    }
    fetchBenchmark();
  }, []);

  // Sektör dağılımı
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const sector = SECTOR_MAP[r.assetId] ?? SECTOR_MAP[r.assetDef.symbol] ?? 'Diğer';
      map[sector] = (map[sector] || 0) + r.currentValueTRY;
    });
    const total = Object.values(map).reduce((s,v) => s+v, 0);
    return Object.entries(map).map(([s,v]) => ({ sector:s, value:v, pct: total>0?(v/total)*100:0 }))
      .sort((a,b) => b.value - a.value);
  }, [rows]);

  // Coğrafi bölge dağılımı
  const regionData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const region = REGION_MAP[r.assetId] ?? REGION_MAP[r.assetDef.symbol] ?? 'Diğer';
      map[region] = (map[region] || 0) + r.currentValueTRY;
    });
    const total = Object.values(map).reduce((s,v) => s+v, 0);
    return Object.entries(map).map(([r,v]) => ({ region:r, value:v, pct: total>0?(v/total)*100:0 }))
      .sort((a,b) => b.value - a.value);
  }, [rows]);

  // Temettü tahmini
  const divEstimate = useMemo(() => {
    if (dividends.length === 0) return null;
    const oneYearAgo = new Date(now.getFullYear()-1, now.getMonth(), now.getDate());
    const recentDivs = dividends.filter(d => new Date(d.date) >= oneYearAgo);
    const totalYearlyTRY = recentDivs.reduce((s,d) => s+d.amountTRY, 0);
    return {
      yearly: displayCurrency === 'USD' ? totalYearlyTRY / usdRate : totalYearlyTRY,
      monthly: displayCurrency === 'USD' ? totalYearlyTRY / 12 / usdRate : totalYearlyTRY / 12,
    };
  }, [dividends, displayCurrency, usdRate, now]);

  // Gün sayaçları
  const dayCounters = useMemo(() =>
    rows.map(r => {
      const d = r.purchaseDatePartial;
      if (!d?.year) return { ...r, days: null };
      const buyDate = new Date(d.year, (d.month ?? 1) - 1, d.day ?? 1);
      const days = Math.floor((now.getTime() - buyDate.getTime()) / 86400000);
      return { ...r, days };
    }).filter(r => r.days !== null).sort((a,b) => (b.days??0) - (a.days??0))
  , [rows]);

  // Temettü takvimi
  const calendarRows = useMemo(() => {
    const currentMonth = now.getMonth() + 1;
    return rows
      .filter(r => DIVIDEND_CALENDAR[r.assetId] || DIVIDEND_CALENDAR[r.assetDef.symbol?.replace('.IS','')])
      .map(r => {
        const key = r.assetId in DIVIDEND_CALENDAR ? r.assetId : r.assetDef.symbol?.replace('.IS','');
        const cal = DIVIDEND_CALENDAR[key!];
        const isUpcoming = cal?.months.some(m => m >= currentMonth && m <= currentMonth + 3);
        return { ...r, cal, isUpcoming };
      });
  }, [rows]);

  // Split işlemleri
  function handleAddSplit() {
    if (!splitAsset || !splitRatio || Number(splitRatio) <= 0) {
      setSplitMsg('Lütfen varlık ve geçerli bir oran girin.'); return;
    }
    const split: SplitEntry = {
      id: generateId(),
      assetId: splitAsset,
      date: splitDate || new Date().toISOString().split('T')[0],
      ratio: Number(splitRatio),
      note: splitNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addSplit(split);
    const affected = applySplitToEntries(split);
    setSplits(loadSplits());
    onEntriesChanged();
    setSplitMsg(`✅ Split uygulandı — ${affected.length} girdi güncellendi.`);
    setSplitAsset(''); setSplitRatio(''); setSplitDate(''); setSplitNote('');
  }

  function handleUndoSplit(s: SplitEntry) {
    undoSplitFromEntries(s);
    removeSplit(s.id);
    setSplits(loadSplits());
    onEntriesChanged();
  }

  const defs = getAssetDefinitions();
  const portfolioAssetIds = Array.from(new Set(rows.map(r => r.assetId)));
  const SECTOR_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#ec4899'];

  return (
    <div className="advanced-view">

      {/* ── Benchmark ──────────────────────────────── */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">📊 Benchmark Karşılaştırması</h3>
        {benchmarkLoading ? (
          <div className="skeleton-line" style={{ height: 40, borderRadius: 8 }} />
        ) : (
          <div className="benchmark-grid">
            {(() => {
              const totalCostTRY = rows.reduce((s,r) => s+r.totalCostTRY, 0);
              const totalValueTRY = rows.reduce((s,r) => s+r.currentValueTRY, 0);
              const portfolioPct = totalCostTRY > 0 ? ((totalValueTRY - totalCostTRY) / totalCostTRY) * 100 : 0;
              const items = [
                { label: '📈 Portföyünüz', pct: portfolioPct, sub: 'Toplam getiri (alıştan bugüne)', highlight: true },
                { label: '🇺🇸 S&P 500', pct: benchmarkData.sp500, sub: 'Bugünkü değişim %' },
                { label: '🇹🇷 BIST 100', pct: benchmarkData.xu100, sub: 'Bugünkü değişim %' },
              ];
              return items.map(item => (
                <div key={item.label} className={`benchmark-card ${item.highlight ? 'bench-main' : ''}`}>
                  <div className="bench-label">{item.label}</div>
                  <div className={`bench-pct ${item.pct !== null && item.pct >= 0 ? 'profit' : 'loss'}`}>
                    {item.pct !== null ? `${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(2)}%` : '—'}
                  </div>
                  <div className="bench-sub">{item.sub}</div>
                </div>
              ));
            })()}
          </div>
        )}
        {!benchmarkLoading && benchmarkData.sp500 === null && (
          <p className="adv-hint">💡 Benchmark verisi şu an alınamadı (proxy sınırı). Portföy getiriniz hesaplanmaktadır.</p>
        )}
      </div>

      {/* ── Sektör & Bölge Dağılımı ─────────────────── */}
      <div className="adv-two-col">
        <div className="glass-card adv-section">
          <h3 className="adv-title">🏭 Sektör Dağılımı</h3>
          <div className="dist-bars">
            {sectorData.map((s, i) => (
              <div key={s.sector} className="dist-row">
                <span className="dist-label">{s.sector}</span>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: `${s.pct}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                </div>
                <span className="dist-pct">{s.pct.toFixed(1)}%</span>
                <span className="dist-val">{fmtCurr(displayCurrency === 'USD' ? s.value/usdRate : s.value, displayCurrency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card adv-section">
          <h3 className="adv-title">🌍 Coğrafi Bölge</h3>
          <div className="dist-bars">
            {regionData.map((r, i) => (
              <div key={r.region} className="dist-row">
                <span className="dist-label">{r.region}</span>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: `${r.pct}%`, background: SECTOR_COLORS[(i+3) % SECTOR_COLORS.length] }} />
                </div>
                <span className="dist-pct">{r.pct.toFixed(1)}%</span>
                <span className="dist-val">{fmtCurr(displayCurrency === 'USD' ? r.value/usdRate : r.value, displayCurrency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Temettü Tahmini ─────────────────────────── */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">💰 Temettü Tahmin Paneli</h3>
        {divEstimate ? (
          <div className="div-estimate-grid">
            <div className="div-estimate-card">
              <span className="div-e-label">Yıllık Temettü Tahmini</span>
              <span className="div-e-value profit">{fmtCurr(divEstimate.yearly, displayCurrency)}</span>
              <span className="div-e-sub">Son 12 ay temettü ortalaması</span>
            </div>
            <div className="div-estimate-card">
              <span className="div-e-label">Aylık Ortalama</span>
              <span className="div-e-value" style={{ color: '#a78bfa' }}>{fmtCurr(divEstimate.monthly, displayCurrency)}</span>
              <span className="div-e-sub">Pasif gelir tahmini</span>
            </div>
          </div>
        ) : (
          <p className="adv-hint">📋 Temettü verisi yok. "Temettüler" sekmesinden gerçekleşen temettü ödemelerini ekleyerek tahmin oluşturun.</p>
        )}
      </div>

      {/* ── Temettü Takvimi ─────────────────────────── */}
      {calendarRows.length > 0 && (
        <div className="glass-card adv-section">
          <h3 className="adv-title">📅 Temettü Takvimi (BIST)</h3>
          <div className="div-calendar">
            {calendarRows.map(r => (
              <div key={r.id} className={`div-cal-item ${r.isUpcoming ? 'div-cal-upcoming' : ''}`}>
                <span className="div-cal-icon">{r.assetDef.icon}</span>
                <div>
                  <div className="div-cal-name">{r.assetDef.name}</div>
                  <div className="div-cal-period">{r.cal?.period}</div>
                </div>
                {r.isUpcoming && <span className="div-cal-badge">Yaklaşıyor</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gün Sayacı ──────────────────────────────── */}
      {dayCounters.length > 0 && (
        <div className="glass-card adv-section">
          <h3 className="adv-title">⏱️ Pozisyon Yaşı</h3>
          <div className="day-counter-list">
            {dayCounters.map(r => {
              const days = r.days ?? 0;
              const color = days > 365 ? '#10b981' : days > 90 ? '#f59e0b' : '#64748b';
              const label = days > 365 ? `${(days/365).toFixed(1)} yıl` : days > 30 ? `${Math.floor(days/30)} ay` : `${days} gün`;
              return (
                <div key={r.id} className="day-counter-row">
                  <span className="day-icon">{r.assetDef.icon}</span>
                  <span className="day-name">{r.assetDef.name}</span>
                  <div className="day-bar-track">
                    <div className="day-bar-fill" style={{ width: `${Math.min(days/730*100, 100)}%`, background: color }} />
                  </div>
                  <span className="day-label" style={{ color }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hisse Bölünme Yöneticisi ────────────────── */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">✂️ Hisse Bölünme (Split) Yöneticisi</h3>
        <p className="adv-hint">Split eklenince ilgili varlığın tüm girdilerinde miktar ve fiyat otomatik güncellenir.</p>
        <div className="split-form">
          <select value={splitAsset} onChange={e => setSplitAsset(e.target.value)}>
            <option value="">Varlık seçin...</option>
            {portfolioAssetIds.map(id => {
              const def = defs.find(d => d.id === id);
              return <option key={id} value={id}>{def?.icon} {def?.name} ({def?.symbol})</option>;
            })}
          </select>
          <input type="number" placeholder="Oran (örn: 2 = 2:1 split)" min="0.01" step="0.01"
            value={splitRatio} onChange={e => setSplitRatio(e.target.value)} />
          <input type="date" value={splitDate} onChange={e => setSplitDate(e.target.value)} />
          <input type="text" placeholder="Not (opsiyonel)" value={splitNote} onChange={e => setSplitNote(e.target.value)} />
          <button className="btn-submit" style={{ marginTop: 0 }} onClick={handleAddSplit}>✂️ Uygula</button>
        </div>
        {splitMsg && <div className="adv-msg">{splitMsg}</div>}

        {splits.length > 0 && (
          <div className="split-history">
            <div className="split-history-title">Uygulanan Bölünmeler</div>
            {splits.map(s => {
              const def = defs.find(d => d.id === s.assetId);
              return (
                <div key={s.id} className="split-row">
                  <span>{def?.icon} {def?.name}</span>
                  <span>{s.ratio}:1</span>
                  <span>{s.date}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.note ?? '—'}</span>
                  <button className="btn-action btn-delete" onClick={() => handleUndoSplit(s)} title="Geri Al">↩️</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
