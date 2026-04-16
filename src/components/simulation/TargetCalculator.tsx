import { useState, useMemo } from 'react';
import { fmtCurr, fmtCompact } from '../../utils/format';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { SimProps } from './simUtils';

export function TargetCalculator({ conv, C }: SimProps) {
  const [target,  setTarget]  = useState('1000000');
  const [current, setCurrent] = useState('0');
  const [monthly, setMonthly] = useState('5000');
  const [growth,  setGrowth]  = useState('20');

  const result = useMemo(() => {
    const T = Number(target)  || 0;
    const P = Number(current) || 0;
    const m = Number(monthly) || 0;
    const r = (Number(growth) || 0) / 100 / 12;
    if (T <= 0 || m <= 0) return null;
    let lo = 1, hi = 600, mid = 0;
    for (let i = 0; i < 60; i++) {
      mid = Math.floor((lo + hi) / 2);
      const val = P * Math.pow(1 + r, mid) + (r > 0 ? m * ((Math.pow(1 + r, mid) - 1) / r) * (1 + r) : m * mid);
      if (val >= T) hi = mid; else lo = mid + 1;
    }
    const months = hi;
    const factor12 = r > 0 ? ((Math.pow(1 + r, 12) - 1) / r) * (1 + r) : 12;
    return {
      months, years: Math.floor(months / 12), remMonths: months % 12,
      totalInvested: P + m * months, gain: T - (P + m * months),
      monthly12: Math.max(0, (T - P * Math.pow(1 + r, 12)) / factor12),
      achievable: months <= 600,
    };
  }, [target, current, monthly, growth]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">🎯</span>
        <div><h3 className="sim-panel-title">Hedefe Kaç Ay?</h3><p className="sim-panel-desc">Hedef bir portföy değerine ulaşmak için kaç ay gerekiyor?</p></div>
      </div>
      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Hedef Portföy Değeri (TRY)</label>
          <FormattedNumberInput value={target} onChange={setTarget} placeholder="1.000.000" />
          <div className="sim-quick-btns">
            {[500_000, 1_000_000, 5_000_000, 10_000_000].map(v => (
              <button key={v} className="sim-quick-btn" onClick={() => setTarget(String(v))}>{fmtCompact(v)}</button>
            ))}
          </div>
        </div>
        <div className="sim-input-group"><label>Mevcut Birikim (TRY)</label><FormattedNumberInput value={current} onChange={setCurrent} placeholder="0" /></div>
        <div className="sim-input-group"><label>Aylık Katkı (TRY)</label><FormattedNumberInput value={monthly} onChange={setMonthly} placeholder="5.000" /></div>
        <div className="sim-input-group"><label>Yıllık Getiri %</label><input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" /></div>
      </div>
      {result && (
        <div className="target-result">
          {result.achievable ? (
            <>
              <div className="target-main-card">
                <div className="target-months-big">{result.years > 0 ? `${result.years} yıl` : ''} {result.remMonths > 0 ? `${result.remMonths} ay` : ''}</div>
                <div className="target-label">ile {fmtCurr(conv(Number(target)), C)} hedefine ulaşırsın</div>
              </div>
              <div className="target-stats">
                <div className="target-stat"><span>Toplam Yatıracağın</span><strong>{fmtCurr(conv(result.totalInvested), C)}</strong></div>
                <div className="target-stat"><span>Bileşik Kazanç</span><strong className={result.gain >= 0 ? 'profit' : 'loss'}>{result.gain >= 0 ? '+' : ''}{fmtCurr(conv(result.gain), C)}</strong></div>
                <div className="target-stat"><span>12 Ayda Hedefe Ulaşmak İçin</span><strong style={{color:'#f59e0b'}}>{fmtCurr(conv(result.monthly12), C)}/ay</strong></div>
              </div>
            </>
          ) : (
            <div className="adv-hint">⚠️ Bu parametrelerle hedefe 50 yıl içinde ulaşılamıyor.</div>
          )}
        </div>
      )}
    </div>
  );
}
