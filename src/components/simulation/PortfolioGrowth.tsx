import { useState, useMemo } from 'react';
import { fmtCurr, fmtCompact, fmtPct } from '../../utils/format';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { fv, SimProps } from './simUtils';

interface Props extends SimProps { totalPortfolioTRY: number; }

export function PortfolioGrowth({ conv, C, totalPortfolioTRY }: Props) {
  const [initial, setInitial] = useState(String(Math.round(totalPortfolioTRY)));
  const [years,   setYears]   = useState('10');
  const [growth,  setGrowth]  = useState('20');
  const [monthly, setMonthly] = useState('0');

  const scenarios = useMemo(() => {
    const P = Number(initial) || 0;
    const n = Number(years)   || 0;
    const m = Number(monthly) || 0;
    if (P <= 0 && m <= 0) return null;
    const RATES = [
      { label: 'Kötümser', rate: (Number(growth) - 10) / 100, color: '#ef4444' },
      { label: 'Beklenen', rate: Number(growth) / 100,        color: '#3b82f6' },
      { label: 'İyimser',  rate: (Number(growth) + 10) / 100, color: '#10b981' },
    ];
    return RATES.map(s => {
      const months = n * 12;
      const total  = P * Math.pow(1 + s.rate / 12, months) + fv(m, months, s.rate);
      const invested = P + m * months;
      return { ...s, total, invested, gain: total - invested, gainPct: invested > 0 ? ((total - invested) / invested) * 100 : 0 };
    });
  }, [initial, years, growth, monthly]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">📈</span>
        <div><h3 className="sim-panel-title">Portföy Büyüme Simülatörü</h3><p className="sim-panel-desc">Mevcut portföyün X yıl sonra ne kadar olur? 3 senaryoyu karşılaştır.</p></div>
      </div>
      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Başlangıç Değeri (TRY)</label>
          <FormattedNumberInput value={initial} onChange={setInitial} placeholder="100.000" />
          {totalPortfolioTRY > 0 && <button className="sim-use-current" onClick={() => setInitial(String(Math.round(totalPortfolioTRY)))}>Mevcut portföyü kullan ({fmtCompact(conv(totalPortfolioTRY), C)})</button>}
        </div>
        <div className="sim-input-group"><label>Süre (Yıl)</label><input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="40" /></div>
        <div className="sim-input-group"><label>Beklenen Yıllık Getiri %</label><input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" /></div>
        <div className="sim-input-group"><label>+ Aylık Ek Katkı (TRY)</label><FormattedNumberInput value={monthly} onChange={setMonthly} placeholder="0" /></div>
      </div>
      {scenarios && (
        <div className="scenario-cards">
          {scenarios.map(s => (
            <div key={s.label} className="scenario-card" style={{ borderColor: s.color + '44', background: s.color + '08' }}>
              <div className="scenario-label" style={{ color: s.color }}>{s.label}</div>
              <div className="scenario-rate" style={{ color: 'var(--text-muted)' }}>%{(s.rate * 100).toFixed(0)} yıllık</div>
              <div className="scenario-total" style={{ color: s.color }}>{fmtCurr(conv(s.total), C)}</div>
              <div className="scenario-gain">
                <span className="profit">+{fmtCompact(conv(s.gain), C)}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({fmtPct(s.gainPct)})</span>
              </div>
              <div className="scenario-invested">Yatırım: {fmtCompact(conv(s.invested), C)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
