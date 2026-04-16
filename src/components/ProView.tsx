import { useState, useMemo, useEffect } from 'react';
import { PortfolioRow, PortfolioSnapshot, AssetEntry, SaleEntry } from '../types/asset';
import { getAssetDefinitions } from '../services/priceService';
import { loadOptions, saveOptions as storageSaveOptions } from '../utils/storage';
import { apiUrl } from '../utils/api';

interface ProViewProps {
  rows: PortfolioRow[];
  snapshots: PortfolioSnapshot[];
  entries: AssetEntry[];
  sales: SaleEntry[];
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

function fmt(n: number) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtCurr(n: number, curr = 'TRY') {
  return (curr === 'TRY' ? '₺' : '$') + n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface OptionEntry {
  id: string;
  assetId: string;
  type: 'call' | 'put';
  strike: number;
  premium: number;
  expiry: string;
  qty: number;
  note?: string;
  livePrice?: number;    // Backend'den çekilen canlı son prim
  livePriceLoading?: boolean;
}

function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

export function ProView({ rows, snapshots, entries, sales, displayCurrency = 'TRY', usdRate = 1 }: ProViewProps) {
  // ── Opsiyon state ──────────────────────────────────────────────
  const [options, setOptions] = useState<OptionEntry[]>(() => loadOptions());
  const [optAsset, setOptAsset] = useState('');
  const [optType, setOptType] = useState<'call'|'put'>('call');
  const [optStrike, setOptStrike] = useState('');
  const [optPremium, setOptPremium] = useState('');
  const [optExpiry, setOptExpiry] = useState('');
  const [optQty, setOptQty] = useState('');
  const [optNote, setOptNote] = useState('');
  const [optExpirations, setOptExpirations] = useState<string[]>([]);
  const [optExpLoading, setOptExpLoading] = useState(false);

  // Varlık seçildiğinde backend'den vade tarihlerini çek
  useEffect(() => {
    if (!optAsset) { setOptExpirations([]); return; }
    const defs = getAssetDefinitions();
    const def = defs.find(d => d.id === optAsset);
    // yfinance ticker'ı bul — sadece hisse/ETF için opsiyon var
    const ticker = def?.yfinanceTicker ?? optAsset.toUpperCase();
    setOptExpLoading(true);
    setOptExpirations([]);
    setOptExpiry('');
    fetch(apiUrl(`/options/${ticker}/expirations`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.expirations) setOptExpirations(data.expirations);
      })
      .catch(() => { /* sessiz hata — tarih manuel girilebilir */ })
      .finally(() => setOptExpLoading(false));
  }, [optAsset]);


  // ── DCA Simülatör state ────────────────────────────────────────

  const [simMonthly, setSimMonthly] = useState('');
  const [simMonths, setSimMonths] = useState('12');
  const [simGrowth, setSimGrowth] = useState('10');

  // ── Rebalancing state ──────────────────────────────────────────
  const [targetWeights, setTargetWeights] = useState<Record<string,number>>({
    crypto: 40, metal: 20, forex: 10, stock_tr: 15, stock_us: 15
  });

  const defs = getAssetDefinitions();

  // ══ Sharpe Ratio & Max Drawdown ════════════════════════════════
  const riskMetrics = useMemo(() => {
    if (snapshots.length < 10) return null;
    const values = snapshots.map(s => s.totalValueTRY);
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] > 0) returns.push((values[i] - values[i-1]) / values[i-1]);
    }
    if (returns.length < 5) return null;
    const mean = returns.reduce((s,r) => s+r, 0) / returns.length;
    const variance = returns.reduce((s,r) => s + (r-mean)**2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    // TCMB Politika faizi ~%45/yıl → günlük risk-free ≈ 0.45/365
    const riskFreeDaily = 0.45 / 365;
    const sharpe = stdDev > 0 ? ((mean - riskFreeDaily) / stdDev) * Math.sqrt(252) : 0;

    // Max Drawdown
    let peak = values[0];
    let maxDD = 0;
    for (const v of values) {
      if (v > peak) peak = v;
      const dd = peak > 0 ? (peak - v) / peak : 0;
      if (dd > maxDD) maxDD = dd;
    }
    const portfolioPct = values[0] > 0 ? ((values[values.length-1] - values[0]) / values[0]) * 100 : 0;
    return { sharpe, maxDD: maxDD*100, portfolioPct, dataPoints: snapshots.length };
  }, [snapshots]);

  // ══ FIFO Vergi Matrahı ════════════════════════════════════════
  const fifoTax = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSales = sales.filter(s => new Date(s.saleDate).getFullYear() === currentYear);
    if (yearSales.length === 0) return null;

    let totalRealizedPnL = 0;
    const rows_: Array<{ assetId: string; saleDate: string; qty: number; salePriceTRY: number; costTRY: number; pnlTRY: number }> = [];

    // Her assetId için girdileri FIFO sırala
    const groupedEntries = entries.reduce((acc, e) => {
      (acc[e.assetId] = acc[e.assetId] || []).push(e);
      return acc;
    }, {} as Record<string, AssetEntry[]>);

    yearSales.forEach(sale => {
      const assetEntries = (groupedEntries[sale.assetId] || [])
        .sort((a,b) => (a.purchaseDate || '').localeCompare(b.purchaseDate || ''));
      
      let remaining = sale.saleQuantity;
      let costBasis = 0;
      for (const entry of assetEntries) {
        if (remaining <= 0) break;
        const used = Math.min(entry.quantity, remaining);
        costBasis += used * entry.purchasePriceTRY;
        remaining -= used;
      }
      const revenue   = sale.salePriceTRY * sale.saleQuantity;
      const feeTRY    = sale.feeTRY ?? 0;
      const pnl       = revenue - costBasis - feeTRY;
      totalRealizedPnL += pnl;
      rows_.push({
        assetId: sale.assetId,
        saleDate: sale.saleDate,
        qty: sale.saleQuantity,
        salePriceTRY: sale.salePriceTRY,
        costTRY: costBasis,
        pnlTRY: pnl,
      });
    });

    // %0.1 BSMV + %0 vergi (bireysel yatırımcı — 2 yıl üstü muaf)
    const bsmv = Math.max(0, totalRealizedPnL) * 0.001;
    return { rows: rows_, totalPnL: totalRealizedPnL, bsmv, year: currentYear };
  }, [sales, entries]);

  // ══ DCA Simülatörü ════════════════════════════════════════════
  const simResult = useMemo(() => {
    if (!simMonthly || !simMonths || !simGrowth) return null;
    const monthly = Number(simMonthly);
    const months = Number(simMonths);
    const annualRate = Number(simGrowth) / 100;
    const monthlyRate = annualRate / 12;
    // FV = P × ((1+r)^n - 1) / r
    const fv = monthlyRate > 0
      ? monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : monthly * months;
    const totalInvested = monthly * months;
    return {
      fv: displayCurrency === 'USD' ? fv / usdRate : fv,
      totalInvested: displayCurrency === 'USD' ? totalInvested / usdRate : totalInvested,
      gain: displayCurrency === 'USD' ? (fv - totalInvested) / usdRate : fv - totalInvested,
      months,
    };
  }, [simMonthly, simMonths, simGrowth, displayCurrency, usdRate]);

  // ══ Yeniden Dengeleme ════════════════════════════════════════
  const rebalanceResult = useMemo(() => {
    const totalValue = rows.reduce((s,r) => s + r.currentValueTRY, 0);
    if (totalValue === 0) return [];
    const currentByCat: Record<string, number> = {};
    rows.forEach(r => { currentByCat[r.assetDef.category] = (currentByCat[r.assetDef.category] || 0) + r.currentValueTRY; });
    const totalTarget = Object.values(targetWeights).reduce((s,v) => s+v, 0);
    return Object.entries(targetWeights).map(([cat, targetPct]) => {
      const target = (targetPct / totalTarget) * totalValue;
      const current = currentByCat[cat] || 0;
      const diff = target - current;
      return { cat, current, target, diff };
    }).sort((a,b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [rows, targetWeights]);

  const totalTargetWeight = Object.values(targetWeights).reduce((s,v) => s+v, 0);
  const catLabels: Record<string,string> = {
    crypto:'₿ Kripto', metal:'🥇 Metal', forex:'💵 Döviz', stock_tr:'🇹🇷 BIST', stock_us:'🇺🇸 ABD'
  };

  // ── Opsiyon fonksiyonları ──────────────────────────────────────
  function saveOptions(opts: OptionEntry[]) {
    storageSaveOptions(opts);
    setOptions(opts);
  }
  function handleAddOption() {
    if (!optAsset || !optStrike || !optPremium || !optExpiry || !optQty) return;
    const opt: OptionEntry = {
      id: generateId(), assetId: optAsset, type: optType,
      strike: Number(optStrike), premium: Number(optPremium),
      expiry: optExpiry, qty: Number(optQty), note: optNote.trim() || undefined,
    };
    saveOptions([...options, opt]);
    setOptAsset(''); setOptStrike(''); setOptPremium(''); setOptExpiry(''); setOptQty(''); setOptNote('');
  }
  function handleDeleteOption(id: string) { saveOptions(options.filter(o => o.id !== id)); }

  const portfolioAssetIds = Array.from(new Set(rows.map(r => r.assetId)));

  return (
    <div className="pro-view">
      <div className="pro-badge-bar">
        <span className="pro-badge">⭐ PRO</span>
        <span className="pro-subtitle">İleri Düzey Finansal Analiz</span>
      </div>

      {/* ══ Sharpe & Max Drawdown ═════════════════════════════════ */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">📉 Volatilite & Risk Metrikleri</h3>
        {!riskMetrics ? (
          <div className="adv-hint">
            ⏳ Risk metrikleri için en az 10 günlük portföy snapshot'ı gerekiyor.
            ({snapshots.length}/10 gün kayıt mevcut — uygulamayı her gün açtığınızda bu sayı artacak.)
          </div>
        ) : (
          <>
            <div className="risk-grid">
              <div className={`risk-card ${riskMetrics.sharpe > 1 ? 'risk-good' : riskMetrics.sharpe > 0 ? 'risk-ok' : 'risk-bad'}`}>
                <span className="risk-label">Sharpe Ratio</span>
                <span className="risk-value">{riskMetrics.sharpe.toFixed(2)}</span>
                <span className="risk-sub">
                  {riskMetrics.sharpe > 2 ? '🟢 Mükemmel' : riskMetrics.sharpe > 1 ? '🟡 İyi' : riskMetrics.sharpe > 0 ? '🟠 Kabul edilebilir' : '🔴 Zayıf'}
                  {' '}(Risk-free: %45 TCMB)
                </span>
              </div>
              <div className={`risk-card ${riskMetrics.maxDD < 10 ? 'risk-good' : riskMetrics.maxDD < 25 ? 'risk-ok' : 'risk-bad'}`}>
                <span className="risk-label">Max Drawdown</span>
                <span className="risk-value loss">-{riskMetrics.maxDD.toFixed(2)}%</span>
                <span className="risk-sub">Tepe noktadan en derin düşüş</span>
              </div>
              <div className="risk-card">
                <span className="risk-label">Toplam Getiri</span>
                <span className={`risk-value ${riskMetrics.portfolioPct >= 0 ? 'profit' : 'loss'}`}>
                  {riskMetrics.portfolioPct >= 0 ? '+' : ''}{riskMetrics.portfolioPct.toFixed(2)}%
                </span>
                <span className="risk-sub">{riskMetrics.dataPoints} günlük veri</span>
              </div>
            </div>
            <p className="adv-hint">ℹ️ Hesaplama mevcut snapshot geçmişi üzerinden yapılmaktadır. Daha uzun geçmiş = daha güvenilir sonuç.</p>
          </>
        )}
      </div>

      {/* ══ FIFO Vergi Matrahı ════════════════════════════════════ */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">🧾 FIFO Vergi Matrahı ({new Date().getFullYear()})</h3>
        {!fifoTax ? (
          <div className="adv-hint">Bu yıl gerçekleştirilen satış kaydı bulunamadı.</div>
        ) : (
          <>
            <div className="fifo-summary">
              <div className={`fifo-total ${fifoTax.totalPnL >= 0 ? 'profit' : 'loss'}`}>
                Realize Edilen Net K/Z: {fifoTax.totalPnL >= 0 ? '+' : ''}{fmtCurr(displayCurrency === 'USD' ? fifoTax.totalPnL/usdRate : fifoTax.totalPnL, displayCurrency)}
              </div>
              {fifoTax.totalPnL > 0 && (
                <div className="fifo-tax">
                  Tahmini BSMV (%0.1): {fmtCurr(displayCurrency === 'USD' ? fifoTax.bsmv/usdRate : fifoTax.bsmv, displayCurrency)}
                  <span className="adv-hint" style={{ marginLeft: '0.5rem' }}>
                    (2+ yıl tutulan hisseler için stopaj muafiyeti uygulanabilir)
                  </span>
                </div>
              )}
            </div>
            <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
              <table className="asset-table">
                <thead>
                  <tr>
                    <th>Varlık</th><th>Satış Tarihi</th><th>Miktar</th>
                    <th>Maliyet (FIFO)</th><th>Satış Geliri</th><th>Net K/Z</th>
                  </tr>
                </thead>
                <tbody>
                  {fifoTax.rows.map((r, i) => {
                    const def = defs.find(d => d.id === r.assetId);
                    const conv = (n: number) => displayCurrency === 'USD' ? n/usdRate : n;
                    return (
                      <tr key={i} className="asset-row">
                        <td>{def?.icon} {def?.name ?? r.assetId}</td>
                        <td className="mono">{new Date(r.saleDate).toLocaleDateString('tr-TR')}</td>
                        <td className="mono">{fmt(r.qty)}</td>
                        <td className="mono">{fmtCurr(conv(r.costTRY), displayCurrency)}</td>
                        <td className="mono">{fmtCurr(conv(r.salePriceTRY * r.qty), displayCurrency)}</td>
                        <td className={r.pnlTRY >= 0 ? 'profit' : 'loss'}>
                          {r.pnlTRY >= 0 ? '+' : ''}{fmtCurr(conv(r.pnlTRY), displayCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ══ DCA Simülatörü ═════════════════════════════════════ */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">🔄 DCA Simülatörü</h3>
        <p className="adv-hint">Her ay düzenli yatırım yaparsan portföyün ne olur?</p>
        <div className="sim-form">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Aylık Katkı (TRY)</label>
            <input type="number" placeholder="Örn: 5000" value={simMonthly}
              onChange={e => setSimMonthly(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Süre (Ay)</label>
            <input type="number" min="1" max="360" placeholder="12" value={simMonths}
              onChange={e => setSimMonths(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tahmini Yıllık Getiri %</label>
            <input type="number" min="0" max="200" step="0.5" placeholder="10" value={simGrowth}
              onChange={e => setSimGrowth(e.target.value)} />
          </div>
        </div>

        {simResult && (
          <div className="sim-result">
            <div className="sim-card">
              <span className="sim-label">Toplam Yatırım</span>
              <span className="sim-value">{fmtCurr(simResult.totalInvested, displayCurrency)}</span>
            </div>
            <div className="sim-card sim-highlight">
              <span className="sim-label">Gelecek Değer ({simResult.months} ay sonra)</span>
              <span className="sim-value profit">{fmtCurr(simResult.fv, displayCurrency)}</span>
            </div>
            <div className="sim-card">
              <span className="sim-label">Bileşik Getiri Kazancı</span>
              <span className="sim-value" style={{ color: '#a78bfa' }}>+{fmtCurr(simResult.gain, displayCurrency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ══ Yeniden Dengeleme ══════════════════════════════════ */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">⚖️ Yeniden Dengeleme Hesaplayıcısı</h3>
        <p className="adv-hint">
          Hedef dağılımı belirleyin, sistem size ne almanız/satmanız gerektiğini söylesin.
          {totalTargetWeight !== 100 && <span style={{color:'var(--loss)', marginLeft:'0.5rem'}}>
            ⚠️ Toplam: {totalTargetWeight}% (100 olmalı)
          </span>}
        </p>
        <div className="rebal-weights">
          {Object.entries(targetWeights).map(([cat, w]) => (
            <div key={cat} className="rebal-weight-row">
              <span className="rebal-cat">{catLabels[cat]}</span>
              <input type="number" min="0" max="100" value={w}
                onChange={e => setTargetWeights(prev => ({...prev, [cat]: Number(e.target.value)}))} />
              <span style={{ color: 'var(--text-muted)'  }}>%</span>
            </div>
          ))}
        </div>

        {rebalanceResult.length > 0 && totalTargetWeight === 100 && (
          <div className="rebal-result">
            {rebalanceResult.map(r => {
              const conv = (n: number) => displayCurrency === 'USD' ? n/usdRate : n;
              const isOver = r.diff < 0;
              return (
                <div key={r.cat} className={`rebal-row ${isOver ? 'rebal-sell' : 'rebal-buy'}`}>
                  <span className="rebal-cat-label">{catLabels[r.cat]}</span>
                  <span>Mevcut: {fmtCurr(conv(r.current), displayCurrency)}</span>
                  <span>Hedef: {fmtCurr(conv(r.target), displayCurrency)}</span>
                  <span className={isOver ? 'loss' : 'profit'}>
                    {isOver ? `▼ ${fmtCurr(conv(Math.abs(r.diff)), displayCurrency)} SAT` : `▲ ${fmtCurr(conv(r.diff), displayCurrency)} AL`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Opsiyon Özet Kartı ════════════════════════════════ */}
      <div className="glass-card adv-section">
        <h3 className="adv-title">📋 Opsiyon Takibi</h3>
        <p className="adv-hint">Pozisyon ekleyin — vade tarihleri backend'den otomatik yüklenir.</p>
        <div className="opt-form">
          <select value={optAsset} onChange={e => setOptAsset(e.target.value)}>
            <option value="">Dayanak varlık...</option>
            {portfolioAssetIds.map(id => {
              const def = defs.find(d => d.id === id);
              return <option key={id} value={id}>{def?.icon} {def?.name}</option>;
            })}
          </select>
          <select value={optType} onChange={e => setOptType(e.target.value as 'call'|'put')}>
            <option value="call">📈 Call (Al)</option>
            <option value="put">📉 Put (Sat)</option>
          </select>
          <input type="number" placeholder="Strike (kullanım fiyatı)" value={optStrike}
            onChange={e => setOptStrike(e.target.value)} />
          <input type="number" placeholder="Prim" value={optPremium}
            onChange={e => setOptPremium(e.target.value)} />
          <input type="number" placeholder="Kontrat adedi" value={optQty}
            onChange={e => setOptQty(e.target.value)} />
          {optExpirations.length > 0 ? (
            <select
              value={optExpiry}
              onChange={e => setOptExpiry(e.target.value)}
              style={{ color: optExpiry ? 'inherit' : 'var(--text-muted)' }}
            >
              <option value="">Vade tarihi seç...</option>
              {optExpirations.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              value={optExpiry}
              onChange={e => setOptExpiry(e.target.value)}
              placeholder={optExpLoading ? 'Yükleniyor...' : 'Vade tarihi (manuel)'}
              disabled={optExpLoading}
            />
          )}

          <input type="text" placeholder="Not (opsiyonel)" value={optNote}
            onChange={e => setOptNote(e.target.value)} />
          <button className="btn-submit" style={{ marginTop: 0 }} onClick={handleAddOption}>+ Ekle</button>
        </div>

        {options.length > 0 && (
          <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
            <table className="asset-table">
              <thead>
                <tr><th>Varlık</th><th>Tür</th><th>Strike</th><th>Prim</th><th>Adet</th><th>Vade</th><th>Not</th><th></th></tr>
              </thead>
              <tbody>
                {options.map(o => {
                  const def = defs.find(d => d.id === o.assetId);
                  const daysLeft = Math.ceil((new Date(o.expiry).getTime() - Date.now()) / 86400000);
                  return (
                    <tr key={o.id} className="asset-row">
                      <td>{def?.icon} {def?.name}</td>
                      <td><span className={o.type === 'call' ? 'profit' : 'loss'}>{o.type === 'call' ? '📈 Call' : '📉 Put'}</span></td>
                      <td className="mono">{fmtCurr(o.strike)}</td>
                      <td className="mono">{fmtCurr(o.premium)}</td>
                      <td className="mono">{o.qty}</td>
                      <td className="mono" style={{ color: daysLeft < 0 ? 'var(--loss)' : daysLeft < 30 ? '#f59e0b' : 'inherit' }}>
                        {o.expiry} {daysLeft < 0 ? '(Süresi doldu)' : `(${daysLeft}g kaldı)`}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize:'0.78rem' }}>{o.note ?? '—'}</td>
                      <td><button className="btn-action btn-delete" onClick={() => handleDeleteOption(o.id)}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
