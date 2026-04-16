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
import { useLivePrices }    from './hooks/useLivePrices';
import { loadEntries, removeEntry, loadSales, loadDividends, removeDividend, loadSnapshots, saveSnapshot } from './utils/storage';
import { getAssetById }     from './services/priceService';
import { AssetEntry, PortfolioRow, SaleEntry, DividendEntry, PortfolioSnapshot } from './types/asset';
import './index.css';

type Tab = 'portfolio' | 'sales' | 'dividends' | 'advanced' | 'pro' | 'comparison' | 'simulation' | 'news' | 'connectors';

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

  const activeAssetIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.assetId))),
    [entries]
  );

  const { prices, isLoading, lastUpdated, error, refresh } = useLivePrices(activeAssetIds);

  const usdRate = prices['USD'] ?? 1;

  const rows: PortfolioRow[] = useMemo(() => {
    return entries
      .map((entry) => {
        // Bug fix #4: null assertion kaldırıldı — bilinmeyen varlık filtre edilir
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
      />
      <main className="main-content">
        {error && <div className="error-banner">⚠️ {error}</div>}

        <div className="tabs-bar">
          <button className={`tab-btn ${activeTab === 'portfolio' ? 'tab-active' : ''}`} onClick={() => setActiveTab('portfolio')}>
            📈 Portföyüm <span className="tab-badge">{entries.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'sales' ? 'tab-active' : ''}`} onClick={() => setActiveTab('sales')}>
            💰 Satışlar <span className="tab-badge">{sales.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'dividends' ? 'tab-active' : ''}`} onClick={() => setActiveTab('dividends')}>
            🏦 Temettüler
            {totalDividendTRY > 0 && <span className="tab-badge" style={{ background: '#10b981' }}>{dividends.length}</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'advanced' ? 'tab-active' : ''}`} onClick={() => setActiveTab('advanced')}>
            🔬 Gelişmiş
          </button>
          <button className={`tab-btn pro-tab ${activeTab === 'pro' ? 'tab-active' : ''}`} onClick={() => setActiveTab('pro')}>
            ⭐ Pro
          </button>
          <button className={`tab-btn ${activeTab === 'comparison' ? 'tab-active' : ''}`} onClick={() => setActiveTab('comparison')}>
            ⚖️ Kıyaslama
          </button>
          <button className={`tab-btn sim-tab ${activeTab === 'simulation' ? 'tab-active' : ''}`} onClick={() => setActiveTab('simulation')}>
            🔮 Simülasyon
          </button>
          <button className={`tab-btn ${activeTab === 'news' ? 'tab-active' : ''}`} onClick={() => setActiveTab('news')}>
            📰 Haberler
          </button>
          <button className={`tab-btn ${activeTab === 'connectors' ? 'tab-active' : ''}`} onClick={() => setActiveTab('connectors')}>
            🔗 Cüzdanlar
          </button>
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
            <div className="portfolio-charts-row">
              <PerformanceChart snapshots={snapshots} displayCurrency={displayCurrency} usdRate={usdRate} />
              <PortfolioPieChart rows={rows} displayCurrency={displayCurrency} usdRate={usdRate} />
            </div>
            <PortfolioChart rows={rows} displayCurrency={displayCurrency} usdRate={usdRate} />
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
