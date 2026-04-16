import { useState, useCallback } from 'react';
import { PortfolioRow, PortfolioSnapshot } from '../types/asset';
import { fmtCurr, fmtPct, toDisplay } from '../utils/format';
import {
  DCASimulator,
  DRIPSimulator,
  PortfolioGrowth,
  TargetCalculator,
  WithdrawalPlanner,
  MonteCarloSim
} from './simulation';

interface SimulationViewProps {
  rows: PortfolioRow[];
  snapshots: PortfolioSnapshot[];
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

type SimTab = 'dca' | 'drip' | 'target' | 'portfolio' | 'withdrawal' | 'montecarlo';

const SIM_TABS: { key: SimTab; label: string; icon: string }[] = [
  { key: 'dca', label: 'DCA Simülatörü', icon: '🔄' },
  { key: 'drip', label: 'DRIP Kar Topu', icon: '❄️' },
  { key: 'portfolio', label: 'Portföy Büyümesi', icon: '📈' },
  { key: 'target', label: 'Hedefe Kaç Ay?', icon: '🎯' },
  { key: 'withdrawal', label: 'Çekilme Planı', icon: '🏖️' },
  { key: 'montecarlo', label: 'Monte Carlo', icon: '🎲' },
];

export function SimulationView({ rows, snapshots, displayCurrency = 'TRY', usdRate = 1 }: SimulationViewProps) {
  const [activeTab, setActiveTab] = useState<SimTab>('dca');

  const totalPortfolioTRY = rows.reduce((s, r) => s + r.currentValueTRY, 0);
  const totalCostTRY = rows.reduce((s, r) => s + r.totalCostTRY, 0);
  const portfolioReturnPct = totalCostTRY > 0 ? ((totalPortfolioTRY - totalCostTRY) / totalCostTRY) * 100 : 0;

  const conv = useCallback((n: number) => toDisplay(n, displayCurrency, usdRate), [displayCurrency, usdRate]);
  const C = displayCurrency;

  return (
    <div className="simulation-view">
      <div className="sim-header-banner">
        <div className="sim-header-left">
          <span className="sim-main-icon">🔮</span>
          <div>
            <h2 className="sim-title">Finansal Simülasyon Merkezi</h2>
            <p className="sim-subtitle">Geleceğini tasarla — farklı senaryoları karşılaştır</p>
          </div>
        </div>
        {totalPortfolioTRY > 0 && (
          <div className="sim-portfolio-stat">
            <span className="sim-stat-label">Mevcut Portföyün</span>
            <span className="sim-stat-value">{fmtCurr(conv(totalPortfolioTRY), C)}</span>
            <span className={`sim-stat-pct ${portfolioReturnPct >= 0 ? 'profit' : 'loss'}`}>
              {fmtPct(portfolioReturnPct)} getiri
            </span>
          </div>
        )}
      </div>

      <div className="sim-tabs">
        {SIM_TABS.map(t => (
          <button key={t.key}
            className={`sim-tab-btn ${activeTab === t.key ? 'sim-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="sim-content">
        {activeTab === 'dca' && <DCASimulator conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'drip' && <DRIPSimulator conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'portfolio' && <PortfolioGrowth conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'target' && <TargetCalculator conv={conv} C={C} />}
        {activeTab === 'withdrawal' && <WithdrawalPlanner conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'montecarlo' && <MonteCarloSim conv={conv} C={C} snapshots={snapshots} totalPortfolioTRY={totalPortfolioTRY} />}
      </div>
    </div>
  );
}
