import { useState, useMemo } from 'react';
import { fmtCurr, fmtCompact, fmtPct } from '../../utils/format';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { SimProps } from './simUtils';

interface Props extends SimProps { totalPortfolioTRY: number; }

export function DRIPSimulator({ conv, C, totalPortfolioTRY }: Props) {
  const [initial,  setInitial]  = useState(String(Math.round(totalPortfolioTRY || 100000)));
  const [years,    setYears]    = useState('20');
  const [growth,   setGrowth]   = useState('10');
  const [divYield, setDivYield] = useState('5');

  const result = useMemo(() => {
    const P = Number(initial) || 0;
    const n = Number(years)   || 0;
    const g = (Number(growth) || 0) / 100;
    const d = (Number(divYield) || 0) / 100;

    if (P <= 0 || n <= 0) return null;

    const timeline: { year: number; noDripAssets: number; noDripCash: number; withDrip: number }[] = [];
    let noDripBal = P;
    let noDripCash = 0;
    let withDripBal = P;

    for (let y = 1; y <= n; y++) {
      const yearDiv = noDripBal * d;
      noDripCash += yearDiv;
      noDripBal = noDripBal * (1 + g);
      
      withDripBal = withDripBal * (1 + g + d);

      if (y <= 10 || y % 5 === 0 || y === n) {
        timeline.push({ year: y, noDripAssets: noDripBal, noDripCash, withDrip: withDripBal });
      }
    }

    const { noDripAssets, noDripCash: finalNoDripCash, withDrip } = timeline[timeline.length - 1];

    return {
      timeline,
      noDripTotal: noDripAssets + finalNoDripCash,
      noDripAssets,
      noDripCash: finalNoDripCash,
      withDrip,
      dripAdvantage: withDrip - (noDripAssets + finalNoDripCash),
      dripAdvantagePct: (withDrip - (noDripAssets + finalNoDripCash)) / (noDripAssets + finalNoDripCash) * 100
    };
  }, [initial, years, growth, divYield]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">❄️</span>
        <div>
          <h3 className="sim-panel-title">DRIP (Temettü Yeniden Yatırım) Kar Topu Etkisi</h3>
          <p className="sim-panel-desc">Temettüleri/faizleri harcamak yerine tekrar hisseye/varlığa yatırdığınızda uzun vadeli bileşik getirinin inanılmaz gücünü görün.</p>
        </div>
      </div>
      
      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Başlangıç Değeri (TRY)</label>
          <FormattedNumberInput value={initial} onChange={setInitial} />
          {totalPortfolioTRY > 0 && <button className="sim-use-current" onClick={() => setInitial(String(Math.round(totalPortfolioTRY)))}>Mevcut portföyü kullan</button>}
        </div>
        <div className="sim-input-group"><label>Süre (Yıl)</label><input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="50" /></div>
        <div className="sim-input-group"><label>Yıllık Değer Artışı %</label><input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" /></div>
        <div className="sim-input-group"><label>Yıllık Temettü/Faiz % (Verim)</label><input type="number" value={divYield} onChange={e => setDivYield(e.target.value)} step="0.1" /></div>
      </div>

      {result && (
        <>
          <div className="scenario-cards ds-cards">
            <div className="scenario-card ds-card-off">
              <div className="scenario-label ds-label-off">Temettüyü Harca (DRIP Kapalı)</div>
              <div className="scenario-total ds-val-off">
                {fmtCurr(conv(result.noDripAssets), C)} <span className="ds-asset-label">Varlık</span>
              </div>
              <div className="scenario-gain ds-gain-off">
                + {fmtCurr(conv(result.noDripCash), C)} <span className="ds-cash-label">(Nakit Toplanan)</span>
              </div>
              <div className="scenario-invested ds-invested-off">
                Toplam Varlık + Nakit: <strong className="ds-invested-val">{fmtCurr(conv(result.noDripTotal), C)}</strong>
              </div>
            </div>

            <div className="scenario-card ds-card-on">
              <span className="ds-badge">KAR TOPU ETKİSİ</span>
              <div className="scenario-label ds-label-on">Temettüyü Yeniden Yatır (DRIP Açık)</div>
              <div className="scenario-total ds-val-on">
                {fmtCurr(conv(result.withDrip), C)}
              </div>
              <div className="scenario-gain">
                <span className="profit">Fark: +{fmtCurr(conv(result.dripAdvantage), C)}</span>
                <span style={{ color: '#f59e0b', marginLeft: '0.4rem' }}>(+{fmtPct(result.dripAdvantagePct)})</span>
              </div>
              <div className="scenario-invested ds-invested-on">
                Sadece yeniden yatırım yaparak sağlanan ekstra kazanç.
              </div>
            </div>
          </div>

          <div className="sim-year-chart">
            <div className="sim-year-chart-title">📊 Yıllara Göre Varlık Değeri Karşılaştırması</div>
            {result.timeline.slice(0, 15).map(row => (
              <div key={row.year} className="ds-chart-row">
                <div className="ds-chart-info">
                  <span>{row.year}. Yıl</span>
                  <div className="ds-chart-vals">
                    <span>Kapalı: {fmtCompact(conv(row.noDripAssets), C)}</span>
                    <span className="ds-val-on-sm">Açık: {fmtCompact(conv(row.withDrip), C)}</span>
                  </div>
                </div>
                <div className="ds-bar-wrap">
                   <div className="ds-bar-off" style={{ width: `${Math.min(100, (row.noDripAssets / result.timeline[result.timeline.length - 1].withDrip) * 100)}%` }} />
                </div>
                <div className="ds-bar-wrap">
                   <div className="ds-bar-on" style={{ width: `${Math.min(100, (row.withDrip / result.timeline[result.timeline.length - 1].withDrip) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
