import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navbar }           from './components/Navbar';
import { AssetForm }        from './components/AssetForm';
import { AssetTable }       from './components/AssetTable';
import { SummaryCard }      from './components/SummaryCard';
import { PortfolioChart }   from './components/PortfolioChart';
import { PortfolioPieChart } from './components/PortfolioPieChart';
import { PerformanceChart } from './components/PerformanceChart';
import { SaleForm }         from './components/SaleForm';
import { SalesView }        from './components/SalesView';
import { DividendForm }     from './components/DividendForm';
import { DividendView }     from './components/DividendView';
import { DividendAutoDetect } from './components/DividendAutoDetect';
import { NewsView }         from './components/NewsView';
import { AdvancedView }       from './components/AdvancedView';
import { ProView }            from './components/ProView';
import { SimulationView }     from './components/SimulationView';
import { ComparisonView }     from './components/ComparisonView';
import { ConnectorView }      from './components/ConnectorView';
import { GoalTracker }        from './components/GoalTracker';
import { RealReturnSection }  from './components/RealReturnSection';
import { TaxHarvestingSection } from './components/TaxHarvestingSection';
import { TechnicalSignalsSection } from './components/TechnicalSignalsSection';
import { PriceForecastWidget }    from './components/PriceForecastWidget';
import { NerInsightsSection }     from './components/NerInsightsSection';
import { useLivePrices }    from './hooks/useLivePrices';
import { useCloudSync }     from './hooks/useCloudSync';
import { loadEntries, removeEntry, loadSales, loadDividends, removeDividend, loadSnapshots, saveSnapshot } from './utils/storage';
import { getAssetById }     from './services/priceService';
import { AssetEntry, PortfolioRow, SaleEntry, DividendEntry, PortfolioSnapshot } from './types/asset';
import './index.css';

type Tab = 'portfolio' | 'sales' | 'dividends' | 'advanced' | 'pro' | 'comparison' | 'simulation' | 'news' | 'connectors';
type AppMode = 'simple' | 'pro';

// Hangi sekmeler hangi modda görünür
const SIMPLE_TABS: Tab[] = ['portfolio', 'sales', 'dividends', 'news'];
const PRO_TABS:    Tab[] = ['portfolio', 'sales', 'dividends', 'advanced', 'pro', 'comparison', 'simulation', 'news', 'connectors'];


function App() {
  const [entries,      setEntries]      = useState<AssetEntry[]>(() => loadEntries());
  const [sales,        setSales]        = useState<SaleEntry[]>(() => loadSales());
  const [dividends,    setDividends]    = useState<DividendEntry[]>(() => loadDividends());
  const [snapshots,    setSnapshots]    = useState<PortfolioSnapshot[]>(() => loadSnapshots());
  const [activeTab,    setActiveTab]    = useState<Tab>('portfolio');
  const [editingEntry, setEditingEntry] = useState<AssetEntry | null>(null);
  const [sellingEntry, setSellingEntry] = useState<AssetEntry | null>(null);
  const [sellingPriceTRY, setSellingPriceTRY] = useState<number>(0);
  const [displayCurrency, setDisplayCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [appMode, setAppMode] = useState<AppMode>(() => {
    return (localStorage.getItem('app_mode') as AppMode) ?? 'simple';
  });

  const visibleTabs = appMode === 'simple' ? SIMPLE_TABS : PRO_TABS;

  function toggleMode() {
    setAppMode(prev => {
      const next: AppMode = prev === 'simple' ? 'pro' : 'simple';
      localStorage.setItem('app_mode', next);
      // Aktif sekme pro modda yoksa portföye dön
      if (next === 'simple' && !SIMPLE_TABS.includes(activeTab)) {
        setActiveTab('portfolio');
      }
      return next;
    });
  }


  const activeAssetIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.assetId))),
    [entries]
  );

  const { prices, isLoading, lastUpdated, error, refresh } = useLivePrices(activeAssetIds);

  const usdRate = prices['USD'] ?? 1;

  // ── Cloud Sync ─────────────────────────────────────────────────────────────
  const handleDataLoaded = useCallback(() => {
    setEntries(loadEntries());
    setSales(loadSales());
    setDividends(loadDividends());
  }, []);

  const { syncStatus, lastSynced, syncError, manualPush, manualPull } = useCloudSync({
    entries,
    sales,
    dividends,
    onDataLoaded: handleDataLoaded,
  });

  // ── Auth & Email Verifications (Routing Interceptor) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const pathname = window.location.pathname;

    if (token) {
      import('./utils/api').then(({ apiUrl }) => {
        if (pathname === '/verify-email') {
          fetch(apiUrl(`/auth/verify-email?token=${token}`))
            .then(res => res.json())
            .then(data => alert(data.message || data.detail || 'E-posta doğrulama tamamlandı.'))
            .catch(() => alert('Sunucu ile iletişim kurulamadı.'))
            .finally(() => window.history.replaceState({}, document.title, "/"));
        } else if (pathname === '/reset-password') {
          const newPassword = prompt("Lütfen yeni şifrenizi girin (en az 8 karakter):");
          if (newPassword && newPassword.length >= 8) {
            fetch(apiUrl('/auth/reset-password'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, new_password: newPassword })
            }).then(res => res.json())
              .then(data => alert(data.message || data.detail || 'Şifre güncellendi.'))
              .catch(() => alert('Sunucu ile iletişim kurulamadı.'))
              .finally(() => window.history.replaceState({}, document.title, "/"));
          } else {
            alert('Geçersiz şifre, işlem iptal edildi.');
            window.history.replaceState({}, document.title, "/");
          }
        }
      });
    }
  }, []);

  const rows: PortfolioRow[] = useMemo(() => {
    return entries
      .map((entry) => {
        const assetDef = getAssetById(entry.assetId);
        if (!assetDef) return null;
        const currentPriceTRY = prices[entry.assetId] ?? 0;
        const entryFee        = entry.feeRaw ?? 0;
        const totalCostTRY    = (entry.purchasePriceTRY * entry.quantity) + entryFee;
        const currentValueTRY = currentPriceTRY * entry.quantity;
        const profitLossTRY   = currentValueTRY - totalCostTRY;
        const profitLossPct   = totalCostTRY > 0 ? (profitLossTRY / totalCostTRY) * 100 : 0;
        return { ...entry, assetDef, currentPriceTRY, totalCostTRY, currentValueTRY, profitLossTRY, profitLossPct, isLoading };
      })
      .filter((r): r is PortfolioRow => r !== null);
  }, [entries, prices, isLoading]);

  useEffect(() => {
    if (isLoading || rows.length === 0) return;
    const totalValueTRY = rows.reduce((s, r) => s + r.currentValueTRY, 0);
    if (totalValueTRY <= 0) return;
    const snap: PortfolioSnapshot = { date: new Date().toISOString(), totalValueTRY };
    saveSnapshot(snap);
    setSnapshots(loadSnapshots());
  }, [rows, isLoading]);

  const entryPrices = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => { map[e.id] = e.purchasePriceTRY; });
    return map;
  }, [entries]);

  function handleEntryAdded(entry: AssetEntry) { setEntries(prev => [...prev, entry]); }
  function handleEntryUpdated(updated: AssetEntry) {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingEntry(null);
  }
  function handleDelete(id: string) { removeEntry(id); setEntries(prev => prev.filter(e => e.id !== id)); }
  function handleEdit(id: string) { setEditingEntry(entries.find(e => e.id === id) ?? null); }
  function handleSell(id: string) {
    const entry = entries.find(e => e.id === id) ?? null;
    const row   = rows.find(r => r.id === id);
    setSellingEntry(entry);
    setSellingPriceTRY(row?.currentPriceTRY ?? 0);
  }
  function handleSaleAdded(sale: SaleEntry) { setSales(prev => [...prev, sale]); setSellingEntry(null); }
  function handleSaleRemoved(id: string) { setSales(prev => prev.filter(s => s.id !== id)); }
  function handleDividendAdded(d: DividendEntry) { setDividends(prev => [...prev, d]); }
  function handleDividendRemoved(id: string) { removeDividend(id); setDividends(prev => prev.filter(d => d.id !== id)); }
  const handleEntriesChanged = useCallback(() => { setEntries(loadEntries()); }, []);

  const totalDividendTRY = dividends.reduce((s, d) => s + d.amountTRY, 0);

  return (
    <div className="app">
      <Navbar
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        displayCurrency={displayCurrency}
        onToggleCurrency={() => setDisplayCurrency(p => p === 'TRY' ? 'USD' : 'TRY')}
        syncStatus={syncStatus}
        lastSynced={lastSynced}
        syncError={syncError}
        onManualPush={manualPush}
        onManualPull={manualPull}
      />
      <main className="main-content">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* ── Mod Toggle + Sekme Çubuğu ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>

          {/* Sekmeler */}
          <div className="tabs-bar" style={{ borderBottom: 'none', flex: 1, flexWrap: 'nowrap' }}>
            {visibleTabs.map(tab => {
              const META: Record<Tab, { label: string; icon: string; badge?: React.ReactNode }> = {
                portfolio:  { label: 'Portföyüm',   icon: '📈', badge: <span className="tab-badge">{entries.length}</span> },
                sales:      { label: 'Satışlar',     icon: '💰', badge: <span className="tab-badge">{sales.length}</span> },
                dividends:  { label: 'Temettüler',   icon: '🏦', badge: totalDividendTRY > 0 ? <span className="tab-badge" style={{ background: '#10b981' }}>{dividends.length}</span> : undefined },
                advanced:   { label: 'Gelişmiş',     icon: '🔬' },
                pro:        { label: 'Pro Analiz',   icon: '⭐' },
                comparison: { label: 'Kıyaslama',    icon: '⚖️' },
                simulation: { label: 'Simülasyon',   icon: '🔮' },
                news:       { label: 'Haberler',     icon: '📰' },
                connectors: { label: 'Cüzdanlar',    icon: '🔗' },
              };
              const m = META[tab];
              return (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {m.icon} {m.label} {m.badge}
                </button>
              );
            })}
          </div>

          {/* Basit / Pro Toggle */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: '4px', paddingLeft: '12px' }}>
            <button
              onClick={toggleMode}
              title={appMode === 'simple' ? 'Pro moda geç' : 'Basit moda dön'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: appMode === 'pro' ? '1px solid #f59e0b' : '1px solid var(--border)',
                background: appMode === 'pro'
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(234,179,8,0.08))'
                  : 'var(--surface)',
                color: appMode === 'pro' ? '#fbbf24' : 'var(--text-muted)',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.25s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {appMode === 'simple' ? (
                <><span>✦ Basit</span><span style={{ opacity: 0.5, fontSize: '0.7rem' }}>→ Pro</span></>
              ) : (
                <><span>⭐ Pro</span><span style={{ opacity: 0.6, fontSize: '0.7rem' }}>→ Basit</span></>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'portfolio' && (
          <>
            <SummaryCard
              rows={rows}
              isPriceLoading={isLoading}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
              totalDividendTRY={totalDividendTRY}
            />

            {/* Pro modda: Tüm grafikler görünür */}
            {appMode === 'pro' && (
              <>
                <div className="portfolio-charts-row">
                  <PerformanceChart snapshots={snapshots} displayCurrency={displayCurrency} usdRate={usdRate} />
                  <PortfolioPieChart rows={rows} displayCurrency={displayCurrency} usdRate={usdRate} />
                </div>
                <PortfolioChart rows={rows} displayCurrency={displayCurrency} usdRate={usdRate} />
              </>
            )}

            {/* Basit modda: sadece pasta grafik (kolay anlaşılır) */}
            {appMode === 'simple' && rows.length > 0 && (
              <PortfolioPieChart rows={rows} displayCurrency={displayCurrency} usdRate={usdRate} />
            )}

            <AssetForm
              onEntryAdded={handleEntryAdded}
              onEntryUpdated={handleEntryUpdated}
              editEntry={editingEntry}
              onClose={() => setEditingEntry(null)}
            />
            <section className="table-section">
              <div className="section-header">
                <h2>Portföyüm</h2>
                <span className="entry-count">{entries.length} varlık</span>
              </div>
              <AssetTable
                rows={rows}
                isPriceLoading={isLoading}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSell={handleSell}
                displayCurrency={displayCurrency}
                usdRate={usdRate}
              />
            </section>

            {/* Basit modda Pro tanıtım kartı */}
            {appMode === 'simple' && (
              <div
                className="glass-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.06))',
                  border: '1px solid rgba(245,158,11,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.5rem', gap: '1rem', flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fbbf24', marginBottom: '0.25rem' }}>
                    ⭐ Pro Analiz Araçlarına Ulaş
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Teknik göstergeler (RSI/MACD), Monte Carlo simülasyonu, fiyat tahmini ve çok daha fazlası
                  </div>
                </div>
                <button
                  onClick={toggleMode}
                  style={{
                    padding: '0.5rem 1.2rem', borderRadius: '20px', border: '1px solid #f59e0b',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,179,8,0.1))',
                    color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  Pro Moda Geç →
                </button>
              </div>
            )}
          </>
        )}


        {activeTab === 'sales' && (
          <section className="table-section">
            <div className="section-header">
              <h2>Satış Geçmişi</h2>
              <span className="entry-count">{sales.length} kayıt</span>
            </div>
            <SalesView sales={sales} onSaleRemoved={handleSaleRemoved} entryPrices={entryPrices} displayCurrency={displayCurrency} usdRate={usdRate} />
          </section>
        )}

        {activeTab === 'dividends' && (
          <section className="table-section">
            <div className="section-header">
              <h2>Temettü Gelirleri</h2>
              <span className="entry-count">{dividends.length} kayıt</span>
            </div>
            <DividendAutoDetect entries={entries} usdRate={usdRate} existingDividends={dividends} onDividendsAdded={(newDivs) => setDividends(prev => [...prev, ...newDivs])} />
            <DividendForm entries={entries} onDividendAdded={handleDividendAdded} />
            <DividendView dividends={dividends} onRemoved={handleDividendRemoved} displayCurrency={displayCurrency} usdRate={usdRate} />
          </section>
        )}

        {activeTab === 'advanced' && (
          <section className="table-section">
            <div className="section-header">
              <h2>🔬 Gelişmiş Analiz</h2>
              <span className="entry-count">Faz 2</span>
            </div>
            <AdvancedView
              rows={rows}
              dividends={dividends}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
              onEntriesChanged={handleEntriesChanged}
            />
            <RealReturnSection
              rows={rows}
            />
            <GoalTracker
              totalPortfolioTRY={rows.reduce((s, r) => s + r.currentValueTRY, 0)}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
            />
            <TaxHarvestingSection
              rows={rows}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
            />
          </section>
        )}

        {activeTab === 'pro' && (
          <section className="table-section">
            <div className="section-header">
              <h2>⭐ Pro Sürüm</h2>
              <span className="entry-count pro-badge-small">İleri Düzey</span>
            </div>
            <ProView
              rows={rows}
              snapshots={snapshots}
              entries={entries}
              sales={sales}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
            />
            <TechnicalSignalsSection rows={rows} />
            <PriceForecastWidget rows={rows} />
          </section>
        )}

        {activeTab === 'simulation' && (
          <section className="table-section">
            <div className="section-header">
              <h2>🔮 Finansal Simülasyon</h2>
              <span className="entry-count" style={{ color: '#8b5cf6' }}>5 Senaryo</span>
            </div>
            <SimulationView
              rows={rows}
              snapshots={snapshots}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
            />
          </section>
        )}

        {activeTab === 'comparison' && (
          <section className="table-section">
            <div className="section-header">
              <h2>⚖️ Varlık Kıyaslama ve Analiz</h2>
              <span className="entry-count" style={{ background: '#3b82f6', color: 'white' }}>% Karşılaştırmalı</span>
            </div>
            <ComparisonView
              rows={rows}
              snapshots={snapshots}
              displayCurrency={displayCurrency}
              usdRate={usdRate}
            />
          </section>
        )}

        {activeTab === 'news' && (
          <section className="table-section">
            <div className="section-header">
              <h2>Finansal Haberler</h2>
              <span className="entry-count">Kripto · BIST · ABD · Döviz</span>
            </div>
            <NerInsightsSection rows={rows} />
            <NewsView />
          </section>
        )}

        {activeTab === 'connectors' && (
          <section className="table-section">
            <div className="section-header">
              <h2>🔗 Cüzdan & Broker Bağlantıları</h2>
              <span className="entry-count" style={{ background: '#f0b90b22', color: '#f0b90b' }}>Otomatik Senkronizasyon</span>
            </div>
            <ConnectorView />
          </section>
        )}
      </main>

      {sellingEntry && (
        <SaleForm entry={sellingEntry} onSaleAdded={handleSaleAdded} onClose={() => setSellingEntry(null)} currentPriceTRY={sellingPriceTRY} />
      )}
    </div>
  );
}

export default App;
