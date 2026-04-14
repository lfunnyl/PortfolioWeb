import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { PortfolioRow, PortfolioSnapshot } from '../types/asset';
import { fetchHistoricalChartData, TimeRange, ChartDataPoint } from '../services/chartService';

interface ComparisonViewProps {
  rows: PortfolioRow[];
  snapshots: PortfolioSnapshot[];
  displayCurrency: 'TRY' | 'USD';
  usdRate: number;
}

const RANGES: { label: string; key: TimeRange; title: string }[] = [
  { label: '1H',  key: '1W',  title: 'Son 1 Hafta' },
  { label: '1A',  key: '1M',  title: 'Son 1 Ay' },
  { label: '3A',  key: '3M',  title: 'Son 3 Ay' },
  { label: '6A',  key: '6M',  title: 'Son 6 Ay' },
  { label: 'YTD', key: 'YTD', title: 'Yılbaşından Bugüne' },
  { label: '1Y',  key: '1Y',  title: 'Son 1 Yıl' }
];

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
  '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#6366f1'
];

export function ComparisonView({ rows, snapshots, displayCurrency, usdRate }: ComparisonViewProps) {
  const [range, setRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [assetKeys, setAssetKeys] = useState<string[]>([]);
  const [error, setError] = useState('');

  const currSymbol = displayCurrency === 'TRY' ? '₺' : '$';

  // 1. Snapshot tabanlı Toplam Portföy Grafiği
  const portfolioData = useMemo(() => {
    let days = 30;
    if (range === '1W') days = 7;
    if (range === '3M') days = 90;
    if (range === '6M') days = 180;
    if (range === '1Y') days = 365;
    if (range === 'YTD') days = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400_000);

    const cutoff = Date.now() - days * 86400_000;
    
    return snapshots
      .filter(s => new Date(s.date).getTime() >= cutoff)
      .map(s => ({
        date: s.date.split('T')[0],
        value: displayCurrency === 'USD'
          ? parseFloat((s.totalValueTRY / usdRate).toFixed(2))
          : parseFloat(s.totalValueTRY.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [snapshots, range, displayCurrency, usdRate]);

  // 2. Varlıkların göreceli (%) kıyaslama verileri
  useEffect(() => {
    async function loadComparison() {
      setLoading(true);
      setError('');
      
      try {
        const uniqueIds = Array.from(new Set(rows.map(r => r.assetId)));
        const allFetched: Record<string, ChartDataPoint[]> = {};
        const keyNames: string[] = [];

        // Hepsini çek
        await Promise.all(uniqueIds.map(async (id) => {
           const def = rows.find(r => r.assetId === id)?.assetDef;
           if (!def) return;
           const pts = await fetchHistoricalChartData(id, range);
           if (pts.length > 0) {
              allFetched[def.symbol] = pts;
              keyNames.push(def.symbol);
           }
        }));

        setAssetKeys(keyNames);

        // Tarihleri birleştir ve normalize et
        const dateMap = new Map<string, any>();
        
        // Önce tüm tarih setini topla
        keyNames.forEach(sym => {
           allFetched[sym].forEach(pt => {
              if (!dateMap.has(pt.date)) {
                  dateMap.set(pt.date, { date: pt.date });
              }
           });
        });

        const sortedDates = Array.from(dateMap.keys()).sort();

        // Her sembol için ilk fiyatı bul (%0 noktası)
        const firstPrices: Record<string, number> = {};
        keyNames.forEach(sym => {
           if (allFetched[sym].length > 0) {
               firstPrices[sym] = allFetched[sym][0].price;
           }
        });

        // Noktaları doldur (Boş günleri son fiyatla doldur forward-fill)
        const lastKnown: Record<string, number> = {};
        
        sortedDates.forEach(date => {
           const rowObj = dateMap.get(date);
           keyNames.forEach(sym => {
              const pts = allFetched[sym];
              const match = pts.find(p => p.date === date);
              if (match) {
                 lastKnown[sym] = match.price;
              }
              
              if (lastKnown[sym] && firstPrices[sym]) {
                 rowObj[sym] = parseFloat((((lastKnown[sym] - firstPrices[sym]) / firstPrices[sym]) * 100).toFixed(2));
              } else {
                 rowObj[sym] = 0;
              }
           });
        });

        setChartData(Array.from(dateMap.values()).sort((a,b) => a.date.localeCompare(b.date)));
      } catch (e) {
        setError("Veriler hazırlanırken hata oluştu. Proxy geçikmesi olabilir.");
      } finally {
        setLoading(false);
      }
    }
    
    if (rows.length > 0) {
      loadComparison();
    }
  }, [rows, range]);

  return (
    <div className="simulation-view">
      {/* Üst Kısım: Zaman Dilimi Seçici */}
      <div className="sim-header-banner" style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-3))', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="sim-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚖️</span> Portföy ve Varlık Kıyaslama
            </h2>
            <p className="sim-subtitle">Varlıklarının spesifik zaman aralıklarındaki yüzdesel değişimlerini ve toplam portföyünü karşılaştır.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-2)', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: range === r.key ? 'var(--accent)' : 'transparent',
                  color: range === r.key ? 'white' : 'var(--text-muted)',
                  fontWeight: range === r.key ? 600 : 500,
                  transition: 'all 0.2s',
                }}
              >{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="adv-two-col" style={{ marginTop: '1.5rem' }}>
        
        {/* SOL: Toplam Portföy Büyümesi */}
        <div className="glass-card adv-section" style={{ flex: 1 }}>
          <h3 className="adv-title">📈 {RANGES.find(r => r.key === range)?.title} - Toplam Varlık Değişimi</h3>
          <p className="sim-panel-desc" style={{ marginBottom: '1rem' }}>Snapshot verilerinize dayanarak gün gün portföy toplamınızın artış/azalışı.</p>
          
          {portfolioData.length < 2 ? (
            <div className="adv-hint" style={{ marginTop: '2rem' }}>
              ℹ️ Seçilen tarih aralığında yeterli cüzdan kaydı (snapshot) bulunmuyor. Kapsamı genişletmeyi deneyin.
            </div>
          ) : (
            <div style={{ height: 350, width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioData} margin={{ top: 10, right: 10, bottom: 5, left: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    tickFormatter={d => d.slice(5)} 
                    axisLine={false} tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    tickFormatter={v => currSymbol + v.toLocaleString('tr-TR', { notation: 'compact' })} 
                    axisLine={false} tickLine={false} 
                  />
                  <Tooltip
                    formatter={(v: number) => [`${currSymbol}${v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Portföy Değeri']}
                    labelFormatter={d => `Tarih: ${d}`}
                    contentStyle={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={false} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 }}>
                Dönem İçi Getiri: <span className={portfolioData[portfolioData.length-1].value >= portfolioData[0].value ? 'profit' : 'loss'}>
                  {portfolioData[portfolioData.length-1].value >= portfolioData[0].value ? '+' : ''}
                  {currSymbol}{(portfolioData[portfolioData.length-1].value - portfolioData[0].value).toLocaleString('tr-TR')}
                </span>
                <span style={{color:'var(--text-muted)', fontSize: '0.85rem', marginLeft:'0.5rem'}}> 
                  ({(((portfolioData[portfolioData.length-1].value - portfolioData[0].value) / portfolioData[0].value) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SAĞ: Varlık Başı Yüzdelik Yarış Grafiği */}
        <div className="glass-card adv-section" style={{ flex: 1.5 }}>
          <h3 className="adv-title">🏁 {RANGES.find(r => r.key === range)?.title} - Varlıklar Arası Getiri (%)</h3>
          <p className="sim-panel-desc" style={{ marginBottom: '1rem' }}>Aynı zaman diliminde yatırımlarınızın birbiriyle rekabeti. (0 noktasından başlar)</p>
          
          {loading ? (
             <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                ⏳ İnternetten geçmiş veriler indiriliyor...
             </div>
          ) : error ? (
            <div className="adv-hint" style={{ marginTop: '2rem', color: '#ef4444' }}>⚠️ {error}</div>
          ) : chartData.length < 2 ? (
             <div className="adv-hint" style={{ marginTop: '2rem' }}>🌐 Seçili periyotta varlıklar için yeterli fiyat geçmişi bulunamadı.</div>
          ) : (
            <div style={{ height: 380, width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    tickFormatter={d => d.slice(5)} 
                    axisLine={false} tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                    tickFormatter={v => `${v}%`} 
                    axisLine={false} tickLine={false} 
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => {
                      const sign = v >= 0 ? '+' : '';
                      return [`${sign}${v}%`, name];
                    }}
                    labelFormatter={d => `Tarih: ${d}`}
                    contentStyle={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem', marginTop: '10px' }} />
                  
                  {assetKeys.map((keyName, i) => (
                    <Line 
                      key={keyName}
                      type="monotone" 
                      dataKey={keyName} 
                      name={keyName}
                      stroke={COLORS[i % COLORS.length]} 
                      strokeWidth={2} 
                      dot={false} 
                      activeDot={{ r: 4 }} 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              
              {/* Lider Tablosu */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                {assetKeys.map((k, i) => {
                   const first = chartData[0][k];
                   const last = chartData[chartData.length-1][k];
                   const pct = last - first;
                   return (
                     <div key={k} style={{ 
                        border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', 
                        display: 'flex', flexDirection: 'column', alignItems: 'center' 
                     }}>
                        <span style={{ fontSize: '0.8rem', color: COLORS[i % COLORS.length], fontWeight: 600 }}>{k}</span>
                        <span className={pct >= 0 ? 'profit' : 'loss'} style={{ fontSize: '1rem', fontWeight: 700 }}>
                           {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                        </span>
                     </div>
                   );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
