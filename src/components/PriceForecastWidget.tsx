import { useState } from 'react';
import { PortfolioRow } from '../types/asset';
import { apiUrl } from '../utils/api';

interface ForecastPoint {
  date: string;
  price: number;
  lower?: number;
  upper?: number;
}

interface ForecastResult {
  ticker: string;
  alpha: number;
  current_price: number;
  forecast_end_price: number;
  forecast_change_pct: number;
  confidence: number;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  error?: string;
}

interface Props {
  rows: PortfolioRow[];
}

export function PriceForecastWidget({ rows }: Props) {
  const [selectedTicker, setSelectedTicker] = useState('');
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzableRows = Array.from(
    new Map(rows.filter(r => r.assetDef.stockKey).map(r => [r.assetId, r])).values()
  );

  async function runForecast() {
    if (!selectedTicker) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/prices/forecast/${encodeURIComponent(selectedTicker)}?days=${days}`), {
        signal: AbortSignal.timeout(30000),
      });
      const data: ForecastResult = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError('Tahmin alınırken bir hata oluştu. Backend bağlantısını kontrol edin.');
    } finally {
      setLoading(false);
    }
  }

  // Basit SVG sparkline çizici
  function renderChart(history: ForecastPoint[], forecast: ForecastPoint[]) {
    const all = [...history, ...forecast];
    const prices = all.map(p => p.price);
    const minP = Math.min(...prices) * 0.995;
    const maxP = Math.max(...prices) * 1.005;
    const range = maxP - minP || 1;

    const W = 700, H = 200;

    function toX(i: number, total: number) { return (i / (total - 1)) * W; }
    function toY(p: number) { return H - ((p - minP) / range) * H; }

    const hLen = history.length;
    const fLen = forecast.length;
    const total = hLen + fLen;

    // CI bant polyon
    const upperPoints = forecast.map((f, i) => `${toX(hLen + i, total)},${toY(f.upper ?? f.price)}`).join(' ');
    const lowerPointsRev = [...forecast].reverse().map((f, i) => `${toX(total - 1 - i, total)},${toY(f.lower ?? f.price)}`).join(' ');
    const ciPolygon = upperPoints && lowerPointsRev ? `${upperPoints} ${lowerPointsRev}` : '';

    // Geçmiş çizgisi
    const histPath = history.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i, total)},${toY(p.price)}`).join(' ');
    // Tahmin çizgisi
    const forecastPath = forecast.map((p, i) => `${i === 0 ? `M${toX(hLen - 1, total)},${toY(history[hLen - 1].price)} L` : 'L'}${toX(hLen + i, total)},${toY(p.price)}`).join(' ');

    const changePos = result!.forecast_change_pct >= 0;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '200px', display: 'block' }}>
        {/* CI Bant */}
        {ciPolygon && (
          <polygon
            points={ciPolygon}
            fill={changePos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)'}
          />
        )}
        {/* Dikey ayraç çizgisi */}
        <line
          x1={toX(hLen - 1, total)} y1={0}
          x2={toX(hLen - 1, total)} y2={H}
          stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4 3"
        />
        {/* Geçmiş */}
        <path d={histPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
        {/* Tahmin */}
        <path d={forecastPath} fill="none" stroke={changePos ? '#10b981' : '#ef4444'} strokeWidth={2} strokeDasharray="5 3" />
      </svg>
    );
  }

  const changePos = result ? result.forecast_change_pct >= 0 : true;

  return (
    <div className="glass-card adv-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 className="adv-title" style={{ margin: 0 }}>🔮 Fiyat Öngörü Motoru</h3>
          <p className="adv-hint" style={{ marginTop: '0.3rem' }}>
            Üstel yumuşatma (SES + Drift) ile tahmin — %90 güven aralığı
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}> · İstatistiksel gösterge, yatırım tavsiyesi değildir</span>
          </p>
        </div>
      </div>

      {/* Kontroller */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Varlık Seçin</label>
          <select
            value={selectedTicker}
            onChange={e => setSelectedTicker(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">-- Varlık seçin --</option>
            {analyzableRows.map(r => (
              <option key={r.assetId} value={r.assetDef.stockKey!}>
                {r.assetDef.icon} {r.assetDef.name} ({r.assetDef.symbol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Tahmin Günü</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={14}>14 gün</option>
            <option value={30}>30 gün</option>
            <option value={60}>60 gün</option>
            <option value={90}>90 gün</option>
          </select>
        </div>
        <button
          className="btn-primary"
          onClick={runForecast}
          disabled={loading || !selectedTicker}
          style={{ padding: '0.55rem 1.2rem', alignSelf: 'flex-end' }}
        >
          {loading ? '⏳ Hesaplanıyor...' : '🔮 Tahmin Üret'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
          ❌ {error}
        </div>
      )}

      {analyzableRows.length === 0 && (
        <p className="adv-hint" style={{ textAlign: 'center', padding: '2rem' }}>
          Portföyünüzde tahmin yapılabilecek hisse senedi bulunamadı.
        </p>
      )}

      {result && !loading && (
        <>
          {/* KPI bar */}
          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap',
            padding: '1rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${changePos ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            marginBottom: '1rem'
          }}>
            {[
              { label: 'Mevcut Fiyat', val: result.current_price.toLocaleString('tr-TR', { maximumFractionDigits: 4 }), color: '#94a3b8' },
              { label: `${days} Gün Sonra (Tahmin)`, val: result.forecast_end_price.toLocaleString('tr-TR', { maximumFractionDigits: 4 }), color: changePos ? '#10b981' : '#ef4444' },
              { label: 'Beklenen Değişim', val: `${changePos ? '+' : ''}${result.forecast_change_pct.toFixed(2)}%`, color: changePos ? '#10b981' : '#ef4444' },
              { label: 'Model Alpha (α)', val: result.alpha.toFixed(2), color: '#a78bfa' },
              { label: 'Güven Aralığı', val: `%${result.confidence}`, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{ flex: '1 1 140px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Grafik */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>── Geçmiş (60 gün)</span>
              <span style={{ color: changePos ? '#10b981' : '#ef4444' }}>- - Tahmin ({days} gün, %90 CI)</span>
            </div>
            {renderChart(result.history, result.forecast)}
          </div>

          {/* Tahmin tablosu (ilk ve son 5) */}
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none' }}>
              📋 Detaylı Tahmin Verileri (ilk & son 5 gün)
            </summary>
            <div className="table-wrapper" style={{ marginTop: '0.5rem' }}>
              <table className="asset-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tahmin Fiyatı</th>
                    <th>Alt Sınır (%90)</th>
                    <th>Üst Sınır (%90)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...result.forecast.slice(0, 5), ...result.forecast.slice(-5)].map((p, i) => (
                    <tr key={i} className="asset-row">
                      <td>{p.date}</td>
                      <td className="mono" style={{ color: changePos ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {p.price.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="mono" style={{ color: '#ef4444', opacity: 0.7 }}>
                        {p.lower?.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) ?? '—'}
                      </td>
                      <td className="mono" style={{ color: '#10b981', opacity: 0.7 }}>
                        {p.upper?.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
