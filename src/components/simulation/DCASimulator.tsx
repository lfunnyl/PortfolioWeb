import { useState, useMemo } from 'react';
import { fmtCurr, fmtCompact } from '../../utils/format';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { fv, MiniBar, MINI_BAR_COLORS, SimProps } from './simUtils';

interface Props extends SimProps { totalPortfolioTRY: number; }

export function DCASimulator({ conv, C, totalPortfolioTRY }: Props) {
  const [monthly,   setMonthly]   = useState('5000');
  const [months,    setMonths]    = useState('60');
  const [growth,    setGrowth]    = useState('20');
  const [inflation, setInflation] = useState('45');
  const [startWith, setStartWith] = useState(false);

  const result = useMemo(() => {
    const m   = Number(monthly) || 0;
    const n   = Number(months)  || 0;
    const r   = (Number(growth) || 0) / 100;
    const inf = (Number(inflation) || 0) / 100;
    const initial = startWith ? totalPortfolioTRY : 0;
    if (m <= 0 || n <= 0) return null;

    const nominalFV    = fv(m, n, r) + initial * Math.pow(1 + r / 12, n);
    const totalInvested = m * n + initial;
    const gain         = nominalFV - totalInvested;
    const realRate     = ((1 + r) / (1 + inf)) - 1;
    const realFV       = fv(m, n, realRate) + initial * Math.pow(1 + realRate / 12, n);

    const yearRows: { year: number; invested: number; nominal: number; real: number }[] = [];
    for (let y = 1; y <= Math.min(Math.ceil(n / 12), 30); y++) {
      const ym = y * 12;
      yearRows.push({
        year: y,
        invested: m * Math.min(ym, n) + initial,
        nominal: fv(m, Math.min(ym, n), r) + initial * Math.pow(1 + r / 12, Math.min(ym, n)),
        real:    fv(m, Math.min(ym, n), realRate) + initial * Math.pow(1 + realRate / 12, Math.min(ym, n)),
      });
    }
    return { nominalFV, totalInvested, gain, realFV, gainPct: totalInvested > 0 ? (gain / totalInvested) * 100 : 0, yearRows, months: n };
  }, [monthly, months, growth, inflation, startWith, totalPortfolioTRY]);

  const maxBar = result ? Math.max(...result.yearRows.map(r => r.nominal)) : 1;

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">🔄</span>
        <div>
          <h3 className="sim-panel-title">DCA (Dollar-Cost Averaging) Simülatörü</h3>
          <p className="sim-panel-desc">Her ay düzenli yatırım yaparak portföyünün nasıl büyüyeceğini gör.</p>
        </div>
      </div>

      <div className="sim-inputs">
        <div className="sim-input-group"><label>Aylık Yatırım (TRY)</label><FormattedNumberInput value={monthly} onChange={setMonthly} placeholder="5.000" /></div>
        <div className="sim-input-group"><label>Süre (Ay)</label><input type="number" value={months} onChange={e => setMonths(e.target.value)} min="1" max="360" /></div>
        <div className="sim-input-group"><label>Yıllık Beklenen Getiri %</label><input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" /></div>
        <div className="sim-input-group"><label>Yıllık Enflasyon % (TÜFE)</label><input type="number" value={inflation} onChange={e => setInflation(e.target.value)} step="0.5" /></div>
        {totalPortfolioTRY > 0 && (
          <div className="sim-input-group sim-checkbox-group">
            <label><input type="checkbox" checked={startWith} onChange={e => setStartWith(e.target.checked)} />
              Mevcut portföyden başla ({fmtCurr(conv(totalPortfolioTRY), C)})
            </label>
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="sim-result-cards">
            <div className="sim-res-card sim-res-main"><span className="sim-res-label">Nominal Gelecek Değer</span><span className="sim-res-value profit">{fmtCurr(conv(result.nominalFV), C)}</span><span className="sim-res-sub">{Math.floor(result.months/12)} yıl {result.months%12} ay sonra</span></div>
            <div className="sim-res-card"><span className="sim-res-label">Toplam Yatırım</span><span className="sim-res-value">{fmtCurr(conv(result.totalInvested), C)}</span></div>
            <div className="sim-res-card sim-res-gain"><span className="sim-res-label">Bileşik Kazanç</span><span className="sim-res-value" style={{color:'#a78bfa'}}>+{fmtCurr(conv(result.gain), C)}</span><span className="sim-res-sub profit">+{result.gainPct.toFixed(1)}%</span></div>
            <div className="sim-res-card sim-res-real"><span className="sim-res-label">Reel Değer (Enfl. Düzeltilmiş)</span><span className="sim-res-value" style={{color:'#f97316'}}>{fmtCurr(conv(result.realFV), C)}</span></div>
          </div>
          <div className="sim-year-chart">
            <div className="sim-year-chart-title">📊 Yıllık Büyüme Projeksiyonu</div>
            {result.yearRows.map((row, i) => (
              <MiniBar key={row.year} label={`${row.year}. Yıl`} value={conv(row.nominal)} max={conv(maxBar)} color={MINI_BAR_COLORS[i % MINI_BAR_COLORS.length]} suffix={C === 'TRY' ? '₺' : '$'} />
            ))}
          </div>
          <div className="sim-comparison-table">
            <div className="sim-comparison-title">📋 Nominal vs Reel Karşılaştırma</div>
            <table className="asset-table">
              <thead><tr><th>Yıl</th><th>Toplam Yatırım</th><th>Nominal Değer</th><th>Nominal Kazanç</th><th>Reel Değer</th></tr></thead>
              <tbody>
                {result.yearRows.map(row => (
                  <tr key={row.year} className="asset-row">
                    <td>{row.year}. Yıl</td>
                    <td className="mono">{fmtCompact(conv(row.invested), C)}</td>
                    <td className="mono profit"><strong>{fmtCompact(conv(row.nominal), C)}</strong></td>
                    <td className="mono" style={{color:'#a78bfa'}}>+{fmtCompact(conv(row.nominal - row.invested), C)}</td>
                    <td className="mono" style={{color:'#f97316'}}>{fmtCompact(conv(row.real), C)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
