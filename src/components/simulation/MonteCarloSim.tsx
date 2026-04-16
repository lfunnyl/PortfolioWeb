import { useState, useMemo } from 'react';
import { PortfolioSnapshot } from '../../types/asset';
import { fmtCurr, fmtCompact, fmtPct } from '../../utils/format';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { SimProps } from './simUtils';

interface Props extends SimProps {
  snapshots: PortfolioSnapshot[];
  totalPortfolioTRY: number;
}

export function MonteCarloSim({ conv, C, snapshots, totalPortfolioTRY }: Props) {
  const [initial,   setInitial]   = useState(String(Math.round(totalPortfolioTRY || 100000)));
  const [monthly,   setMonthly]   = useState('5000');
  const [years,     setYears]     = useState('10');
  const [runs,      setRuns]      = useState(500);
  const [simResult, setSimResult] = useState<null | { p10: number; p25: number; p50: number; p75: number; p90: number; successRate: number; totalInvested: number }>(null);
  const [running,   setRunning]   = useState(false);

  const { meanReturn, stdDev } = useMemo(() => {
    if (snapshots.length < 5) return { meanReturn: 0.20, stdDev: 0.30 };
    const vals = snapshots.map(s => s.totalValueTRY);
    const rets: number[] = [];
    for (let i = 1; i < vals.length; i++) {
      if (vals[i - 1] > 0) rets.push((vals[i] - vals[i - 1]) / vals[i - 1]);
    }
    if (rets.length < 3) return { meanReturn: 0.20, stdDev: 0.30 };
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
    return { meanReturn: mean * 252, stdDev: Math.sqrt(variance) * Math.sqrt(252) };
  }, [snapshots]);

  function runSimulation() {
    setRunning(true);
    setTimeout(() => {
      const P = Number(initial) || 0;
      const m = Number(monthly) || 0;
      const n = Number(years)   || 1;
      const months = n * 12;
      const totalInvested = P + m * months;
      const monthlyMean = meanReturn / 12;
      const monthlyStd  = stdDev / Math.sqrt(12);

      function randNorm(mean: number, std: number) {
        const u1 = Math.random(), u2 = Math.random();
        return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }

      const results: number[] = [];
      for (let sim = 0; sim < runs; sim++) {
        let bal = P;
        for (let mo = 0; mo < months; mo++) bal = bal * (1 + randNorm(monthlyMean, monthlyStd)) + m;
        results.push(Math.max(0, bal));
      }
      results.sort((a, b) => a - b);
      const pct = (p: number) => results[Math.floor((p / 100) * results.length)];
      setSimResult({ p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90), successRate: results.filter(r => r >= totalInvested).length / results.length * 100, totalInvested });
      setRunning(false);
    }, 100);
  }

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">🎲</span>
        <div>
          <h3 className="sim-panel-title">Monte Carlo Simülasyonu</h3>
          <p className="sim-panel-desc">
            {runs} farklı rastgele piyasa senaryosu çalıştırılır.
            {snapshots.length >= 5 && <span style={{ color: '#10b981' }}> Tarihsel verinizden: µ={fmtPct(meanReturn)}, σ={fmtPct(stdDev)}</span>}
          </p>
        </div>
      </div>
      <div className="sim-inputs">
        <div className="sim-input-group"><label>Başlangıç Değeri (TRY)</label><FormattedNumberInput value={initial} onChange={setInitial} /></div>
        <div className="sim-input-group"><label>Aylık Katkı (TRY)</label><FormattedNumberInput value={monthly} onChange={setMonthly} /></div>
        <div className="sim-input-group"><label>Süre (Yıl)</label><input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="30" /></div>
        <div className="sim-input-group">
          <label>Simülasyon Sayısı</label>
          <select value={runs} onChange={e => setRuns(Number(e.target.value))}>
            <option value={200}>200 (Hızlı)</option><option value={500}>500 (Dengeli)</option>
            <option value={1000}>1000 (Hassas)</option><option value={2000}>2000 (Çok Hassas)</option>
          </select>
        </div>
      </div>
      <button className="btn-submit sim-run-btn" onClick={runSimulation} disabled={running} style={{ margin: '0.5rem 0 1rem' }}>
        {running ? '⏳ Hesaplanıyor...' : `🎲 ${runs} Senaryo Çalıştır`}
      </button>
      {simResult && !running && (
        <>
          <div className="mc-result-grid">
            {[
              { label: 'En Kötü %10',    value: simResult.p10, color: '#ef4444' },
              { label: 'Alt Çeyrek %25', value: simResult.p25, color: '#f97316' },
              { label: 'Medyan %50',     value: simResult.p50, color: '#3b82f6', highlight: true },
              { label: 'Üst Çeyrek %75', value: simResult.p75, color: '#10b981' },
              { label: 'En İyi %90',     value: simResult.p90, color: '#8b5cf6' },
            ].map((item, i) => (
              <div key={i} className={`mc-card ${item.highlight ? 'mc-main' : ''}`} style={{ borderColor: item.color + '44' }}>
                <span className="mc-label">{item.label}</span>
                <span className="mc-value" style={{ color: item.color }}>{fmtCurr(conv(item.value), C)}</span>
                <span className="mc-sub" style={{ color: item.value >= simResult.totalInvested ? '#10b981' : '#ef4444' }}>
                  {item.value >= simResult.totalInvested ? '+' : ''}{fmtCompact(conv(item.value - simResult.totalInvested), C)}
                </span>
              </div>
            ))}
          </div>
          <div className="mc-success" style={{ marginTop: '1rem' }}>
            <div className="mc-success-bar-wrap">
              <div className="mc-success-label">
                🏆 Başarı Oranı:
                <strong style={{ color: simResult.successRate > 70 ? '#10b981' : simResult.successRate > 40 ? '#f59e0b' : '#ef4444', marginLeft: '0.5rem' }}>
                  %{simResult.successRate.toFixed(1)}
                </strong>
              </div>
              <div className="mc-success-bar">
                <div className="mc-success-fill" style={{ width: `${simResult.successRate}%`, background: simResult.successRate > 70 ? '#10b981' : simResult.successRate > 40 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
            <p className="adv-hint" style={{ marginTop: '0.5rem' }}>
              ℹ️ Monte Carlo istatistiksel olasılık göstergesidir, garanti değildir.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
