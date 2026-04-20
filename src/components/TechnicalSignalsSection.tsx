import { useState } from 'react';
import { PortfolioRow } from '../types/asset';
import { apiUrl } from '../utils/api';

interface TechnicalSignalsSectionProps {
  rows: PortfolioRow[];
}

interface SignalData {
  ticker: string;
  price: number;
  overall_signal: string;
  details: {
      rsi: { value: number; signal: string };
      macd: { macd_line: number; signal_line: number; histogram: number; signal: string };
      high_52w: { value: number; dist_pct: number };
      ma_cross: string;
      vol_anomaly: string;
      bollinger: string;
  };
}

export function TechnicalSignalsSection({ rows }: TechnicalSignalsSectionProps) {
  const [signals, setSignals] = useState<Record<string, SignalData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzableRows = Array.from(
    new Map(rows.filter(r => r.assetDef.stockKey).map(r => [r.assetId, r])).values()
  );

  async function fetchSignals() {
    setLoading(true);
    setError(null);
    try {
      const newSignals: Record<string, SignalData> = {};
      const promises = analyzableRows.map(async (row) => {
         const ticker = row.assetDef.stockKey;
         if (!ticker) return;
         try {
             const res = await fetch(apiUrl(`/prices/signals/${encodeURIComponent(ticker)}`), { signal: AbortSignal.timeout(12000) });
             if (res.ok) {
                 const data = await res.json();
                 if (!data.error) {
                     newSignals[row.assetId] = data;
                 }
             }
         } catch (e) { console.warn(e); }
      });
      await Promise.all(promises);
      setSignals(newSignals);
    } catch (err) {
      setError('Sinyaller hesaplanırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  const getSignalColor = (sig: string) => {
    if (!sig) return '#9ca3af';
    if (sig.includes('GÜÇLÜ AL') || sig.includes('GOLDEN CROSS')) return '#10b981';
    if (sig.includes('AL') || sig.includes('Pozitif')) return '#34d399';
    if (sig.includes('GÜÇLÜ SAT') || sig.includes('DEATH CROSS')) return '#ef4444';
    if (sig.includes('SAT') || sig.includes('Negatif')) return '#f87171';
    if (sig.includes('Sıkışma') || sig.includes('Aşırı Hacim')) return '#f59e0b';
    return '#9ca3af';
  };

  return (
    <div className="glass-card adv-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
         <div>
            <h3 className="adv-title" style={{ margin: 0 }}>🚦 İleri Düzey Sinyal İstihbaratı</h3>
            <p className="adv-hint" style={{ marginTop: '0.4rem', lineHeight: '1.4' }}>
              Portföyünüzdeki varlıkların arkasındaki gelişmiş matematiksel anomaliler (Momentum, Hacim, Trend) <br/>
              <span style={{fontSize: '0.75rem', opacity: 0.7}}>RSI, MACD, Golden/Death Cross, Bollinger Sıkışması ve Anormal Hacim taraması. (Tavsiye Değildir)</span>
            </p>
         </div>
         <button className="btn-primary" onClick={fetchSignals} disabled={loading || analyzableRows.length === 0} style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
            {loading ? '⏳ Veriler İşleniyor...' : '🔄 Derin Tarama Başlat'}
         </button>
      </div>
      
      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      {analyzableRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Portföyünüzde analize uygun bir hisse senedi (BIST veya Yurtdışı) bulunamadı.
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="asset-table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Varlık</th>
                <th>Aşırı Alım/Satım (RSI)</th>
                <th>Hareketli Ortalamalar</th>
                <th>Volatilite & Hacim</th>
                <th>Genel Eğilim</th>
              </tr>
            </thead>
            <tbody>
              {analyzableRows.map(row => {
                const sig = signals[row.assetId];
                if (!sig) return (
                    <tr key={row.id} className="asset-row">
                        <td><strong>{row.assetDef.name}</strong> <span style={{ fontSize:'0.75rem', color:'var(--text-muted)'}}>{row.assetDef.symbol}</span></td>
                        <td colSpan={4} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.2rem' }}>
                           Derin tarama işlemi yapılmadı
                        </td>
                    </tr>
                );

                return (
                  <tr key={row.id} className="asset-row">
                    <td>
                        <strong>{row.assetDef.name}</strong> <br/>
                        <span style={{ fontSize:'0.75rem', color:'var(--text-muted)'}}>{row.assetDef.symbol}</span>
                    </td>
                    <td>
                        <div style={{ fontWeight: 'bold', color: getSignalColor(sig.details.rsi.signal) }}>{sig.details.rsi.signal}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Değer: {sig.details.rsi.value.toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                           Zirve Uzaklığı: %{sig.details.high_52w.dist_pct.toFixed(1)}
                        </div>
                    </td>
                    <td>
                        <div style={{ fontWeight: 'bold', color: getSignalColor(sig.details.ma_cross), fontSize: '0.8rem' }}>{sig.details.ma_cross}</div>
                        <div style={{ fontWeight: 'bold', color: getSignalColor(sig.details.macd.signal), fontSize: '0.8rem', marginTop: '4px' }}>MACD: {sig.details.macd.signal}</div>
                    </td>
                    <td>
                        <div style={{ fontWeight: 'bold', color: getSignalColor(sig.details.bollinger), fontSize: '0.8rem' }}>BB: {sig.details.bollinger}</div>
                        <div style={{ fontWeight: 'bold', color: getSignalColor(sig.details.vol_anomaly), fontSize: '0.8rem', marginTop: '4px' }}>Hacim: {sig.details.vol_anomaly}</div>
                    </td>
                    <td>
                        <span style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            background: `${getSignalColor(sig.overall_signal)}15`,
                            color: getSignalColor(sig.overall_signal),
                            border: `1px solid ${getSignalColor(sig.overall_signal)}50`
                        }}>
                            {sig.overall_signal}
                        </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
