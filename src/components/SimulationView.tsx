import { useState, useMemo, useCallback } from 'react';
import { PortfolioRow, PortfolioSnapshot } from '../types/asset';
import { fmtCurr, fmtCompact, fmtPct, toDisplay } from '../utils/format';
import { FormattedNumberInput } from './FormattedNumberInput';

interface SimulationViewProps {
  rows: PortfolioRow[];
  snapshots: PortfolioSnapshot[];
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

type SimTab = 'dca' | 'target' | 'portfolio' | 'withdrawal' | 'montecarlo';

const SIM_TABS: { key: SimTab; label: string; icon: string }[] = [
  { key: 'dca',        label: 'DCA Simülatörü',        icon: '🔄' },
  { key: 'portfolio',  label: 'Portföy Büyümesi',       icon: '📈' },
  { key: 'target',     label: 'Hedefe Kaç Ay?',         icon: '🎯' },
  { key: 'withdrawal', label: 'Çekilme Planı',          icon: '🏖️' },
  { key: 'montecarlo', label: 'Monte Carlo',            icon: '🎲' },
];

// ─── Yardımcı ───────────────────────────────────────────────
function fv(monthly: number, months: number, annualRate: number): number {
  const r = annualRate / 12;
  return r > 0
    ? monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
    : monthly * months;
}

const MINI_BAR_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316'
];

function MiniBar({ label, value, max, color, suffix = '' }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
      <span style={{ width: 110, color: 'var(--text-dim)', fontSize: '0.75rem', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ width: 80, textAlign: 'right', fontWeight: 700, color }}>{suffix}{fmtCompact(value)}</span>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────
export function SimulationView({ rows, snapshots, displayCurrency = 'TRY', usdRate = 1 }: SimulationViewProps) {
  const [activeTab, setActiveTab] = useState<SimTab>('dca');

  const totalPortfolioTRY = rows.reduce((s, r) => s + r.currentValueTRY, 0);
  const totalCostTRY = rows.reduce((s, r) => s + r.totalCostTRY, 0);
  const portfolioReturnPct = totalCostTRY > 0 ? ((totalPortfolioTRY - totalCostTRY) / totalCostTRY) * 100 : 0;

  const conv = useCallback((n: number) => toDisplay(n, displayCurrency, usdRate), [displayCurrency, usdRate]);
  const C = displayCurrency;

  return (
    <div className="simulation-view">
      {/* Header Banner */}
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

      {/* Sekme Seçici */}
      <div className="sim-tabs">
        {SIM_TABS.map(t => (
          <button
            key={t.key}
            className={`sim-tab-btn ${activeTab === t.key ? 'sim-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* İçerik */}
      <div className="sim-content">
        {activeTab === 'dca'        && <DCASimulator       conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'portfolio'  && <PortfolioGrowth    conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'target'     && <TargetCalculator   conv={conv} C={C} />}
        {activeTab === 'withdrawal' && <WithdrawalPlanner  conv={conv} C={C} totalPortfolioTRY={totalPortfolioTRY} />}
        {activeTab === 'montecarlo' && <MonteCarloSim      conv={conv} C={C} snapshots={snapshots} totalPortfolioTRY={totalPortfolioTRY} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 1. DCA Simülatörü — Düzenli yatırım büyüme projeksiyonu
// ══════════════════════════════════════════════════════════════
function DCASimulator({ conv, C, totalPortfolioTRY }: { conv: (n:number)=>number; C: 'TRY'|'USD'; totalPortfolioTRY: number }) {
  const [monthly,    setMonthly]    = useState('5000');
  const [months,     setMonths]     = useState('60');
  const [growth,     setGrowth]     = useState('20');
  const [inflation,  setInflation]  = useState('45');
  const [startWith,  setStartWith]  = useState(false);

  const result = useMemo(() => {
    const m = Number(monthly) || 0;
    const n = Number(months)  || 0;
    const r = (Number(growth) || 0) / 100;
    const inf = (Number(inflation) || 0) / 100;
    const initial = startWith ? totalPortfolioTRY : 0;

    if (m <= 0 || n <= 0) return null;

    // Nominal (aylık bileşik)
    const nominalFV = fv(m, n, r) + initial * Math.pow(1 + r/12, n);
    const totalInvested = m * n + initial;
    const gain = nominalFV - totalInvested;

    // Enflasyona göre düzenlenmiş (reel getiri)
    const realRate = ((1 + r) / (1 + inf)) - 1;
    const realFV = fv(m, n, realRate) + initial * Math.pow(1 + realRate/12, n);

    // Yıllık tablo
    const yearRows: { year: number; invested: number; nominal: number; real: number }[] = [];
    for (let y = 1; y <= Math.min(Math.ceil(n/12), 30); y++) {
      const ym = y * 12;
      const nominY = fv(m, Math.min(ym, n), r) + initial * Math.pow(1 + r/12, Math.min(ym, n));
      const realY   = fv(m, Math.min(ym, n), realRate) + initial * Math.pow(1 + realRate/12, Math.min(ym, n));
      yearRows.push({ year: y, invested: m * Math.min(ym, n) + initial, nominal: nominY, real: realY });
    }

    return { nominalFV, totalInvested, gain, realFV, realGain: realFV - totalInvested, gainPct: totalInvested > 0 ? (gain/totalInvested)*100 : 0, yearRows, months: n };
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
        <div className="sim-input-group">
          <label>Aylık Yatırım (TRY)</label>
          <FormattedNumberInput value={monthly} onChange={setMonthly} placeholder="5.000" />
        </div>
        <div className="sim-input-group">
          <label>Süre (Ay)</label>
          <input type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="60" min="1" max="360" />
        </div>
        <div className="sim-input-group">
          <label>Yıllık Beklenen Getiri %</label>
          <input type="number" value={growth} onChange={e => setGrowth(e.target.value)} placeholder="20" step="0.5" />
        </div>
        <div className="sim-input-group">
          <label>Yıllık Enflasyon % (TÜFE)</label>
          <input type="number" value={inflation} onChange={e => setInflation(e.target.value)} placeholder="45" step="0.5" />
        </div>
        {totalPortfolioTRY > 0 && (
          <div className="sim-input-group sim-checkbox-group">
            <label>
              <input type="checkbox" checked={startWith} onChange={e => setStartWith(e.target.checked)} />
              Mevcut portföyden başla ({fmtCurr(conv(totalPortfolioTRY), C)})
            </label>
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="sim-result-cards">
            <div className="sim-res-card sim-res-main">
              <span className="sim-res-label">Nominal Gelecek Değer</span>
              <span className="sim-res-value profit">{fmtCurr(conv(result.nominalFV), C)}</span>
              <span className="sim-res-sub">{Math.floor(result.months/12)} yıl {result.months%12} ay sonra</span>
            </div>
            <div className="sim-res-card">
              <span className="sim-res-label">Toplam Yatırım</span>
              <span className="sim-res-value">{fmtCurr(conv(result.totalInvested), C)}</span>
            </div>
            <div className="sim-res-card sim-res-gain">
              <span className="sim-res-label">Bileşik Kazanç</span>
              <span className="sim-res-value" style={{ color: '#a78bfa' }}>+{fmtCurr(conv(result.gain), C)}</span>
              <span className="sim-res-sub profit">+{result.gainPct.toFixed(1)}%</span>
            </div>
            <div className="sim-res-card sim-res-real">
              <span className="sim-res-label">Reel Değer (Enfl. Düzeltilmiş)</span>
              <span className="sim-res-value" style={{ color: '#f97316' }}>{fmtCurr(conv(result.realFV), C)}</span>
              <span className="sim-res-sub" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Bugünün alım gücüyle</span>
            </div>
          </div>

          {/* Yıllık Büyüme Çubuğu */}
          <div className="sim-year-chart">
            <div className="sim-year-chart-title">📊 Yıllık Büyüme Projeksiyonu</div>
            {result.yearRows.map((row, i) => (
              <MiniBar
                key={row.year}
                label={`${row.year}. Yıl`}
                value={conv(row.nominal)}
                max={conv(maxBar)}
                color={MINI_BAR_COLORS[i % MINI_BAR_COLORS.length]}
                suffix={C === 'TRY' ? '₺' : '$'}
              />
            ))}
          </div>

          {/* Karşılaştırma tablosu */}
          <div className="sim-comparison-table">
            <div className="sim-comparison-title">📋 Nominal vs Reel Karşılaştırma</div>
            <table className="asset-table">
              <thead>
                <tr><th>Yıl</th><th>Toplam Yatırım</th><th>Nominal Değer</th><th>Nominal Kazanç</th><th>Reel Değer</th></tr>
              </thead>
              <tbody>
                {result.yearRows.map(row => (
                  <tr key={row.year} className="asset-row">
                    <td>{row.year}. Yıl</td>
                    <td className="mono">{fmtCompact(conv(row.invested), C)}</td>
                    <td className="mono profit"><strong>{fmtCompact(conv(row.nominal), C)}</strong></td>
                    <td className="mono" style={{ color: '#a78bfa' }}>+{fmtCompact(conv(row.nominal - row.invested), C)}</td>
                    <td className="mono" style={{ color: '#f97316' }}>{fmtCompact(conv(row.real), C)}</td>
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

// ══════════════════════════════════════════════════════════════
// 2. Portföy Büyüme Simülatörü — Mevcut portföyü büyüt
// ══════════════════════════════════════════════════════════════
function PortfolioGrowth({ conv, C, totalPortfolioTRY }: { conv: (n:number)=>number; C: 'TRY'|'USD'; totalPortfolioTRY: number }) {
  const [initial,  setInitial]  = useState(String(Math.round(totalPortfolioTRY)));
  const [years,    setYears]    = useState('10');
  const [growth,   setGrowth]   = useState('20');
  const [monthly,  setMonthly]  = useState('0');

  const scenarios = useMemo(() => {
    const P = Number(initial) || 0;
    const n = Number(years)   || 0;
    const m = Number(monthly) || 0;
    if (P <= 0 && m <= 0) return null;

    const RATES = [
      { label: 'Kötümser', rate: (Number(growth)-10)/100, color: '#ef4444' },
      { label: 'Beklenen', rate: Number(growth)/100,     color: '#3b82f6' },
      { label: 'İyimser',  rate: (Number(growth)+10)/100, color: '#10b981' },
    ];

    return RATES.map(s => {
      const r = s.rate;
      const months = n * 12;
      const fvPortfolio = P * Math.pow(1 + r/12, months);
      const fvDCA = fv(m, months, r);
      const total = fvPortfolio + fvDCA;
      const invested = P + m * months;
      return { ...s, total, invested, gain: total - invested, gainPct: invested > 0 ? ((total-invested)/invested)*100 : 0 };
    });
  }, [initial, years, growth, monthly]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">📈</span>
        <div>
          <h3 className="sim-panel-title">Portföy Büyüme Simülatörü</h3>
          <p className="sim-panel-desc">Mevcut portföyün X yıl sonra ne kadar olur? 3 senaryoyu karşılaştır.</p>
        </div>
      </div>

      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Başlangıç Değeri (TRY)</label>
          <FormattedNumberInput value={initial} onChange={setInitial} placeholder="100.000" />
          {totalPortfolioTRY > 0 && (
            <button className="sim-use-current" onClick={() => setInitial(String(Math.round(totalPortfolioTRY)))}>
              Mevcut portföyü kullan ({fmtCompact(conv(totalPortfolioTRY), C)})
            </button>
          )}
        </div>
        <div className="sim-input-group">
          <label>Süre (Yıl)</label>
          <input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="40" />
        </div>
        <div className="sim-input-group">
          <label>Beklenen Yıllık Getiri %</label>
          <input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" />
        </div>
        <div className="sim-input-group">
          <label>+ Aylık Ek Katkı (TRY)</label>
          <FormattedNumberInput value={monthly} onChange={setMonthly} placeholder="0" />
        </div>
      </div>

      {scenarios && (
        <div className="scenario-cards">
          {scenarios.map(s => (
            <div key={s.label} className="scenario-card" style={{ borderColor: s.color + '44', background: s.color + '08' }}>
              <div className="scenario-label" style={{ color: s.color }}>{s.label}</div>
              <div className="scenario-rate" style={{ color: 'var(--text-muted)' }}>%{(s.rate*100).toFixed(0)} yıllık</div>
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

// ══════════════════════════════════════════════════════════════
// 3. Hedefe Ulaşma Hesaplayıcısı
// ══════════════════════════════════════════════════════════════
function TargetCalculator({ conv, C }: { conv: (n:number)=>number; C: 'TRY'|'USD' }) {
  const [target,   setTarget]   = useState('1000000');
  const [current,  setCurrent]  = useState('0');
  const [monthly,  setMonthly]  = useState('5000');
  const [growth,   setGrowth]   = useState('20');

  const result = useMemo(() => {
    const T = Number(target)  || 0;
    const P = Number(current) || 0;
    const m = Number(monthly) || 0;
    const r = (Number(growth) || 0) / 100 / 12;
    if (T <= 0 || m <= 0) return null;

    // Aylık bileşik büyüme ile kaç ay? (binary search ile)
    let lo = 1, hi = 600, mid = 0;
    for (let i = 0; i < 60; i++) {
      mid = Math.floor((lo + hi) / 2);
      const val = P * Math.pow(1+r, mid) + (r > 0 ? m * ((Math.pow(1+r, mid)-1)/r)*(1+r) : m*mid);
      if (val >= T) hi = mid; else lo = mid + 1;
    }
    const months = hi;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const totalInvested = P + m * months;
    const gain = T - totalInvested;

    // Alternatif: ne kadar yatırmalı hedef 12 ayda?
    // Basit: monthly2 = (T - P*(1+r)^12) / FV_factor_12
    const factor12 = r > 0 ? ((Math.pow(1+r,12)-1)/r)*(1+r) : 12;
    const monthly12 = Math.max(0, (T - P * Math.pow(1+r, 12)) / factor12);

    return { months, years, remMonths, totalInvested, gain, monthly12, achievable: months <= 600 };
  }, [target, current, monthly, growth]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">🎯</span>
        <div>
          <h3 className="sim-panel-title">Hedefe Kaç Ay?</h3>
          <p className="sim-panel-desc">Hedef bir portföy değerine ulaşmak için kaç ay gerekiyor?</p>
        </div>
      </div>

      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Hedef Portföy Değeri (TRY)</label>
          <FormattedNumberInput value={target} onChange={setTarget} placeholder="1.000.000" />
          <div className="sim-quick-btns">
            {[500_000, 1_000_000, 5_000_000, 10_000_000].map(v => (
              <button key={v} className="sim-quick-btn" onClick={() => setTarget(String(v))}>
                {fmtCompact(v)}
              </button>
            ))}
          </div>
        </div>
        <div className="sim-input-group">
          <label>Mevcut Birikim (TRY)</label>
          <FormattedNumberInput value={current} onChange={setCurrent} placeholder="0" />
        </div>
        <div className="sim-input-group">
          <label>Aylık Katkı (TRY)</label>
          <FormattedNumberInput value={monthly} onChange={setMonthly} placeholder="5.000" />
        </div>
        <div className="sim-input-group">
          <label>Yıllık Getiri %</label>
          <input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" />
        </div>
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
                <div className="target-stat">
                  <span>Toplam Yatıracağın</span>
                  <strong>{fmtCurr(conv(result.totalInvested), C)}</strong>
                </div>
                <div className="target-stat">
                  <span>Bileşik Kazanç</span>
                  <strong className={result.gain >= 0 ? 'profit' : 'loss'}>{result.gain >= 0 ? '+' : ''}{fmtCurr(conv(result.gain), C)}</strong>
                </div>
                <div className="target-stat">
                  <span>12 Ayda Hedefe Ulaşmak İçin</span>
                  <strong style={{ color: '#f59e0b' }}>{fmtCurr(conv(result.monthly12), C)}/ay</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="adv-hint">⚠️ Bu parametrelerle hedefe 50 yıl içinde ulaşılamıyor. Katkıyı artır veya getiri beklentisini yükselt.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 4. Çekilme Planı (Emeklilik Simülatörü)
// ══════════════════════════════════════════════════════════════
function WithdrawalPlanner({ conv, C, totalPortfolioTRY }: { conv: (n:number)=>number; C: 'TRY'|'USD'; totalPortfolioTRY: number }) {
  const [nest,       setNest]       = useState(String(Math.round(totalPortfolioTRY)));
  const [withdrawal, setWithdrawal] = useState('20000');
  const [growth,     setGrowth]     = useState('15');

  const result = useMemo(() => {
    const N = Number(nest)       || 0;
    const W = Number(withdrawal) || 0;
    const r = (Number(growth) || 0) / 100 / 12;
    if (N <= 0 || W <= 0) return null;

    // Portföy ne kadar dayanır?
    let balance = N;
    let month = 0;
    const timeline: { month: number; balance: number }[] = [{ month: 0, balance: N }];
    while (balance > 0 && month < 600) {
      balance = balance * (1 + r) - W;
      month++;
      if (month % 12 === 0) timeline.push({ month, balance: Math.max(0, balance) });
    }

    // "4% kuralı" çekilme
    const safeWithdrawal4pct = N * 0.04 / 12;
    // Süresiz çekilme için gereken nest (W = N*r)
    const neededForForever = r > 0 ? W / r : Infinity;

    return {
      lasts: balance <= 0 ? month : null,
      lastsYears: balance <= 0 ? Math.floor(month / 12) : null,
      infinite: balance > 0,
      timeline,
      safeWithdrawal4pct,
      neededForForever,
    };
  }, [nest, withdrawal, growth]);

  return (
    <div className="sim-panel">
      <div className="sim-panel-header">
        <span className="sim-panel-icon">🏖️</span>
        <div>
          <h3 className="sim-panel-title">Çekilme Planı (Emeklilik Simülatörü)</h3>
          <p className="sim-panel-desc">Birikiminden aylık çekersen kaç yıl dayanır?</p>
        </div>
      </div>

      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Toplam Birikim (TRY)</label>
          <FormattedNumberInput value={nest} onChange={setNest} />
          {totalPortfolioTRY > 0 && (
            <button className="sim-use-current" onClick={() => setNest(String(Math.round(totalPortfolioTRY)))}>
              Mevcut portföyü kullan
            </button>
          )}
        </div>
        <div className="sim-input-group">
          <label>Aylık Çekilecek Tutar (TRY)</label>
          <FormattedNumberInput value={withdrawal} onChange={setWithdrawal} />
        </div>
        <div className="sim-input-group">
          <label>Portföy Yıllık Getiri %</label>
          <input type="number" value={growth} onChange={e => setGrowth(e.target.value)} step="0.5" />
        </div>
      </div>

      {result && (
        <>
          <div className="withdrawal-result">
            {result.infinite ? (
              <div className="withdrawal-infinite">
                <span className="withdrawal-icon profit">∞</span>
                <div>
                  <div className="withdrawal-main-text profit">Sonsuza dek çekebilirsin!</div>
                  <div className="withdrawal-sub">Portföy getirisi çekilenden fazla büyüyor.</div>
                </div>
              </div>
            ) : (
              <div className="withdrawal-finite">
                <span className="withdrawal-icon loss">⏳</span>
                <div>
                  <div className="withdrawal-main-text">{result.lastsYears} yıl dayanır</div>
                  <div className="withdrawal-sub">{result.lasts} ay sonra portföy tükenir.</div>
                </div>
              </div>
            )}
          </div>
          <div className="withdrawal-tips">
            <div className="withdrawal-tip">
              <span>🛡️ 4% Kuralı'na Göre Güvenli Aylık Çekilme:</span>
              <strong>{fmtCurr(conv(result.safeWithdrawal4pct), C)}/ay</strong>
            </div>
            <div className="withdrawal-tip">
              <span>♾️ Süresiz Çekmek İçin Gereken Birikim:</span>
              <strong>{result.neededForForever === Infinity ? '—' : fmtCurr(conv(result.neededForForever), C)}</strong>
            </div>
          </div>
          <div className="sim-year-chart" style={{ marginTop: '1rem' }}>
            <div className="sim-year-chart-title">📊 Portföy Erimesi</div>
            {result.timeline.slice(0, 20).map((t) => (
              <MiniBar
                key={t.month}
                label={`${Math.floor(t.month/12)}. Yıl`}
                value={conv(t.balance)}
                max={conv(Number(nest))}
                color={t.balance > Number(nest) * 0.5 ? '#10b981' : t.balance > Number(nest) * 0.2 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 5. Monte Carlo Simülasyonu
// ══════════════════════════════════════════════════════════════
function MonteCarloSim({ conv, C, snapshots, totalPortfolioTRY }: {
  conv: (n:number)=>number; C: 'TRY'|'USD';
  snapshots: PortfolioSnapshot[];
  totalPortfolioTRY: number;
}) {
  const [initial,  setInitial]  = useState(String(Math.round(totalPortfolioTRY || 100000)));
  const [monthly,  setMonthly]  = useState('5000');
  const [years,    setYears]    = useState('10');
  const [runs,     setRuns]     = useState(500);
  const [simResult, setSimResult] = useState<null | {
    p10: number; p25: number; p50: number; p75: number; p90: number;
    successRate: number; totalInvested: number;
  }>(null);
  const [running, setRunning] = useState(false);

  // Tarihsel getiri ve volatilite snapshot'lardan
  const { meanReturn, stdDev } = useMemo(() => {
    if (snapshots.length < 5) return { meanReturn: 0.20, stdDev: 0.30 };
    const vals = snapshots.map(s => s.totalValueTRY);
    const rets: number[] = [];
    for (let i = 1; i < vals.length; i++) {
      if (vals[i-1] > 0) rets.push((vals[i]-vals[i-1])/vals[i-1]);
    }
    if (rets.length < 3) return { meanReturn: 0.20, stdDev: 0.30 };
    const mean = rets.reduce((s,r) => s+r, 0) / rets.length;
    const variance = rets.reduce((s,r) => s+(r-mean)**2, 0) / rets.length;
    return {
      meanReturn: mean * 252, // yıllıklaştır
      stdDev: Math.sqrt(variance) * Math.sqrt(252),
    };
  }, [snapshots]);

  function runSimulation() {
    setRunning(true);
    setTimeout(() => {
      const P = Number(initial) || 0;
      const m = Number(monthly) || 0;
      const n = Number(years)   || 1;
      const months = n * 12;
      const totalInvested = P + m * months;

      // Box-Muller normal dağılım
      function randNorm(mean: number, std: number): number {
        const u1 = Math.random(), u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + std * z;
      }

      const monthlyMean = meanReturn / 12;
      const monthlyStd  = stdDev / Math.sqrt(12);
      const results: number[] = [];

      for (let sim = 0; sim < runs; sim++) {
        let bal = P;
        for (let mo = 0; mo < months; mo++) {
          const r = randNorm(monthlyMean, monthlyStd);
          bal = bal * (1 + r) + m;
        }
        results.push(Math.max(0, bal));
      }

      results.sort((a, b) => a - b);
      const pct = (p: number) => results[Math.floor((p / 100) * results.length)];
      const successRate = results.filter(r => r >= totalInvested).length / results.length * 100;

      setSimResult({
        p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90),
        successRate, totalInvested,
      });
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
            {runs} farklı rastgele piyasa senaryosu çalıştırılır. Güven aralıkları hesaplanır.
            {snapshots.length >= 5 && <span style={{color:'#10b981'}}> Tarihsel verinizden: µ={fmtPct(meanReturn)}, σ={fmtPct(stdDev)} kullanılıyor.</span>}
          </p>
        </div>
      </div>

      <div className="sim-inputs">
        <div className="sim-input-group">
          <label>Başlangıç Değeri (TRY)</label>
          <FormattedNumberInput value={initial} onChange={setInitial} />
        </div>
        <div className="sim-input-group">
          <label>Aylık Katkı (TRY)</label>
          <FormattedNumberInput value={monthly} onChange={setMonthly} />
        </div>
        <div className="sim-input-group">
          <label>Süre (Yıl)</label>
          <input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="30" />
        </div>
        <div className="sim-input-group">
          <label>Simülasyon Sayısı</label>
          <select value={runs} onChange={e => setRuns(Number(e.target.value))}>
            <option value={200}>200 (Hızlı)</option>
            <option value={500}>500 (Dengeli)</option>
            <option value={1000}>1000 (Hassas)</option>
            <option value={2000}>2000 (Çok Hassas)</option>
          </select>
        </div>
      </div>

      <button
        className="btn-submit sim-run-btn"
        onClick={runSimulation}
        disabled={running}
        style={{ margin: '0.5rem 0 1rem' }}
      >
        {running ? '⏳ Hesaplanıyor...' : `🎲 ${runs} Senaryo Çalıştır`}
      </button>

      {simResult && !running && (
        <>
          <div className="mc-result-grid">
            {[
              { label: 'En Kötü %10', pct: 'p10', value: simResult.p10, color: '#ef4444' },
              { label: 'Alt Çeyrek %25', pct: 'p25', value: simResult.p25, color: '#f97316' },
              { label: 'Medyan %50', pct: 'p50', value: simResult.p50, color: '#3b82f6', highlight: true },
              { label: 'Üst Çeyrek %75', pct: 'p75', value: simResult.p75, color: '#10b981' },
              { label: 'En İyi %90', pct: 'p90', value: simResult.p90, color: '#8b5cf6' },
            ].map(item => (
              <div key={item.pct} className={`mc-card ${item.highlight ? 'mc-main' : ''}`} style={{ borderColor: item.color + '44' }}>
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
                🏆 Başarı Oranı — Yatırımın üzerinde kar eden senaryo:
                <strong style={{ color: simResult.successRate > 70 ? '#10b981' : simResult.successRate > 40 ? '#f59e0b' : '#ef4444', marginLeft: '0.5rem' }}>
                  %{simResult.successRate.toFixed(1)}
                </strong>
              </div>
              <div className="mc-success-bar">
                <div className="mc-success-fill" style={{
                  width: `${simResult.successRate}%`,
                  background: simResult.successRate > 70 ? '#10b981' : simResult.successRate > 40 ? '#f59e0b' : '#ef4444'
                }} />
              </div>
            </div>
            <p className="adv-hint" style={{ marginTop: '0.5rem' }}>
              ℹ️ Monte Carlo her çalıştırmada farklı sonuç verebilir — istatistiksel olasılık göstergesidir, garanti değildir.
              {snapshots.length < 5 && ' Daha güvenilir sonuç için 5+ günlük portföy geçmişi gerekir.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
