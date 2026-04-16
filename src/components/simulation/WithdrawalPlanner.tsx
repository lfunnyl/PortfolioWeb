import { useState, useMemo } from 'react';
import { fmtCurr } from '../../utils/format';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { MiniBar, SimProps } from './simUtils';

interface Props extends SimProps { totalPortfolioTRY: number; }

export function WithdrawalPlanner({ conv, C, totalPortfolioTRY }: Props) {
  const [nest,       setNest]       = useState(String(Math.round(totalPortfolioTRY)));
  const [withdrawal, setWithdrawal] = useState('20000');
  const [growth,     setGrowth]     = useState('15');

  const result = useMemo(() => {
    const N = Number(nest)       || 0;
    const W = Number(withdrawal) || 0;
    const r = (Number(growth) || 0) / 100 / 12;
    if (N <= 0 || W <= 0) return null;

    let balance = N, month = 0;
    const timeline: { month: number; balance: number }[] = [{ month: 0, balance: N }];
    while (balance > 0 && month < 600) {
      balance = balance * (1 + r) - W;
      month++;
      if (month % 12 === 0) timeline.push({ month, balance: Math.max(0, balance) });
    }
    return {
      lasts: balance <= 0 ? month : null,
      lastsYears: balance <= 0 ? Math.floor(month / 12) : null,
      infinite: balance > 0,
      timeline,
      safeWithdrawal4pct: N * 0.04 / 12,
      neededForForever: r > 0 ? W / r : Infinity,
    };
  }, [nest, withdrawal, growth]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">🏖️</span>
        <div><h3 className="sim-panel-title">Çekilme Planı (Emeklilik Simülatörü)</h3><p className="sim-panel-desc">Birikiminden aylık çekersen kaç yıl dayanır?</p></div>
      </div>
      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Toplam Birikim (TRY)</label>
          <FormattedNumberInput value={nest} onChange={setNest} />
          {totalPortfolioTRY > 0 && <button className="sim-use-current" onClick={() => setNest(String(Math.round(totalPortfolioTRY)))}>Mevcut portföyü kullan</button>}
        </div>
        <div className="sim-input-group"><label>Aylık Çekilecek Tutar (TRY)</label><FormattedNumberInput value={withdrawal} onChange={setWithdrawal} /></div>
        <div className="sim-input-group"><label>Portföy Yıllık Getiri %</label><input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" /></div>
      </div>
      {result && (
        <>
          <div className="withdrawal-result">
            {result.infinite ? (
              <div className="withdrawal-infinite">
                <span className="withdrawal-icon profit">∞</span>
                <div><div className="withdrawal-main-text profit">Sonsuza dek çekebilirsin!</div><div className="withdrawal-sub">Portföy getirisi çekilenden fazla büyüyor.</div></div>
              </div>
            ) : (
              <div className="withdrawal-finite">
                <span className="withdrawal-icon loss">⏳</span>
                <div><div className="withdrawal-main-text">{result.lastsYears} yıl dayanır</div><div className="withdrawal-sub">{result.lasts} ay sonra portföy tükenir.</div></div>
              </div>
            )}
          </div>
          <div className="withdrawal-tips">
            <div className="withdrawal-tip"><span>🛡️ 4% Kuralı'na Göre Güvenli Aylık Çekilme:</span><strong>{fmtCurr(conv(result.safeWithdrawal4pct), C)}/ay</strong></div>
            <div className="withdrawal-tip"><span>♾️ Süresiz Çekmek İçin Gereken Birikim:</span><strong>{result.neededForForever === Infinity ? '—' : fmtCurr(conv(result.neededForForever), C)}</strong></div>
          </div>
          <div className="sim-year-chart" style={{ marginTop: '1rem' }}>
            <div className="sim-year-chart-title">📊 Portföy Erimesi</div>
            {result.timeline.slice(0, 20).map(t => (
              <MiniBar key={t.month} label={`${Math.floor(t.month / 12)}. Yıl`} value={conv(t.balance)} max={conv(Number(nest))}
                color={t.balance > Number(nest) * 0.5 ? '#10b981' : t.balance > Number(nest) * 0.2 ? '#f59e0b' : '#ef4444'} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
