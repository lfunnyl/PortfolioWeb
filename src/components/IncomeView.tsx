import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../utils/api';
import { AssetEntry } from '../types/asset';
import { useAuth } from '../context/AuthContext';

interface IncomeStream {
  id: number;
  name: string;
  type: 'rent' | 'deposit' | 'other';
  amount: number;
  currency: string;
  interest_rate?: number;
  start_date?: string;
  end_date?: string;
  asset_id?: string;
  note?: string;
  deposit_calc?: {
    days_elapsed: number;
    accrued_interest: number;
    monthly_estimate: number;
    total_value: number;
    is_matured: boolean;
  };
}

interface AutoDividend {
  ticker: string;
  date: string;
  amount_per_share: number;
  quantity: number;
  total_raw: number;
  currency: string;
  total_try: number;
}

interface IncomeSummary {
  monthly_total_try: number;
  annual_estimate_try: number;
  stream_count: number;
  breakdown: { id: number; name: string; type: string; monthly_estimate_try: number }[];
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  rent:    { label: 'Kira Geliri',     icon: '🏠', color: '#10b981' },
  deposit: { label: 'Mevduat Faizi',  icon: '🏦', color: '#3b82f6' },
  other:   { label: 'Diğer Gelir',    icon: '💼', color: '#f59e0b' },
};

interface IncomeViewProps {
  entries: AssetEntry[];
  usdRate: number;
}

export default function IncomeView({ entries, usdRate }: IncomeViewProps) {
  const { token } = useAuth();
  const [streams, setStreams]       = useState<IncomeStream[]>([]);
  const [summary, setSummary]       = useState<IncomeSummary | null>(null);
  const [autoDivs, setAutoDivs]     = useState<AutoDividend[]>([]);
  const [divLoading, setDivLoading] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState<'streams' | 'dividends'>('streams');

  // Form state
  const [form, setForm] = useState({
    name: '', type: 'rent', amount: '', currency: 'TRY',
    interest_rate: '', start_date: new Date().toISOString().slice(0, 10),
    end_date: '', note: '',
  });

  const headers = () => ({ Authorization: `Bearer ${token}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [streamsRes, summaryRes] = await Promise.all([
        fetch(apiUrl('/income/streams'), { headers: headers() }),
        fetch(apiUrl('/income/summary'), { headers: headers() }),
      ]);
      if (streamsRes.ok) setStreams(await streamsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const body: any = {
      name: form.name,
      type: form.type,
      amount: parseFloat(form.amount),
      currency: form.currency,
      note: form.note || undefined,
      start_date: form.start_date || undefined,
    };
    if (form.type === 'deposit') {
      body.interest_rate = parseFloat(form.interest_rate);
      body.end_date = form.end_date || undefined;
    }
    try {
      const res = await fetch(apiUrl('/income/streams'), {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', type: 'rent', amount: '', currency: 'TRY', interest_rate: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', note: '' });
        load();
      }
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bu gelir akışını silmek istiyor musunuz?')) return;
    await fetch(apiUrl(`/income/streams/${id}`), { method: 'DELETE', headers: headers() });
    load();
  }

  async function handleFetchDividends() {
    setDivLoading(true);
    try {
      // Portföydeki hisseleri filtrele
      const stockEntries = entries.filter(e =>
        !['BTC','ETH','SOL','BNB','XRP','DOGE','ADA','AVAX','XAU','XAG','USD','EUR','TRY_CASH'].includes(e.assetId.toUpperCase())
      );
      const assetMap: Record<string, number> = {};
      for (const e of stockEntries) {
        if (!assetMap[e.assetId]) assetMap[e.assetId] = 0;
        assetMap[e.assetId] += e.quantity;
      }
      const assets = Object.entries(assetMap).map(([ticker, quantity]) => ({ ticker, quantity }));
      if (assets.length === 0) { alert('Portföyünüzde hisse senedi bulunamadı.'); setDivLoading(false); return; }

      const res = await fetch(apiUrl('/income/auto/dividends'), {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets, usd_try: usdRate }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoDivs(data.dividends || []);
      }
    } catch (e) { console.error(e); }
    setDivLoading(false);
  }

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>
      {/* Özet Kartlar */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <SummaryCard icon="💰" label="Aylık Tahmini Gelir" value={`₺${fmt(summary.monthly_total_try)}`} color="#10b981" />
          <SummaryCard icon="📅" label="Yıllık Tahmini Gelir" value={`₺${fmt(summary.annual_estimate_try)}`} color="#3b82f6" />
          <SummaryCard icon="🔁" label="Aktif Gelir Akışı" value={`${summary.stream_count} adet`} color="#f59e0b" />
        </div>
      )}

      {/* Tab Geçiş */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {(['streams', 'dividends'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600,
            background: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? 'white' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.18s',
          }}>
            {tab === 'streams' ? '💰 Gelir Akışları' : '📈 Otomatik Temettü'}
          </button>
        ))}
      </div>

      {/* — Tab: Gelir Akışları — */}
      {activeTab === 'streams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Düzenli Gelir Akışlarım</h3>
            <button onClick={() => setShowForm(!showForm)} style={{
              padding: '0.4rem 0.9rem', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
            }}>
              {showForm ? '✕ Kapat' : '+ Yeni Ekle'}
            </button>
          </div>

          {/* Yeni Gelir Akışı Formu */}
          {showForm && (
            <form onSubmit={handleAdd} style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '14px',
              padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <FormField label="Gelir Adı" required>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    placeholder="Örn: Kadıköy Dairesi" required style={inputStyle} />
                </FormField>
                <FormField label="Tür">
                  <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={inputStyle}>
                    <option value="rent">🏠 Kira Geliri</option>
                    <option value="deposit">🏦 Mevduat Faizi</option>
                    <option value="other">💼 Diğer Aylık Gelir</option>
                  </select>
                </FormField>
                <FormField label={form.type === 'deposit' ? 'Anapara (₺)' : 'Aylık Tutar (₺)'} required>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                    placeholder="0" required min={0} style={inputStyle} />
                </FormField>
                <FormField label="Başlangıç Tarihi">
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} style={inputStyle} />
                </FormField>
                {form.type === 'deposit' && <>
                  <FormField label="Yıllık Faiz Oranı (%)">
                    <input type="number" value={form.interest_rate} onChange={e => setForm(f => ({...f, interest_rate: e.target.value}))}
                      placeholder="Örn: 45" step={0.01} style={inputStyle} />
                  </FormField>
                  <FormField label="Vade Bitiş Tarihi">
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} style={inputStyle} />
                  </FormField>
                </>}
                <FormField label="Not (İsteğe Bağlı)">
                  <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))}
                    placeholder="Not..." style={inputStyle} />
                </FormField>
              </div>
              <button type="submit" style={{
                padding: '0.6rem', background: '#10b981', color: 'white',
                border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
              }}>
                ✅ Gelir Akışı Ekle
              </button>
            </form>
          )}

          {/* Gelir Akışları Listesi */}
          {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Yükleniyor...</p>}
          {!loading && streams.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
              <p>Henüz gelir akışı eklenmedi.</p>
              <p style={{ fontSize: '0.8rem' }}>Kira gelirinizi veya mevduat faizinizi ekleyin.</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {streams.map(s => {
              const meta = TYPE_LABELS[s.type] || TYPE_LABELS.other;
              return (
                <div key={s.id} style={{
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '1rem 1.25rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderLeft: `4px solid ${meta.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {meta.label}
                        {s.type === 'deposit' && s.interest_rate && ` · %${s.interest_rate} yıllık faiz`}
                        {s.start_date && ` · ${s.start_date} tarihinden beri`}
                      </div>
                      {s.type === 'deposit' && s.deposit_calc && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.2rem' }}>
                          Birikmiş Faiz: ₺{fmt(s.deposit_calc.accrued_interest)} · Toplam: ₺{fmt(s.deposit_calc.total_value)}
                          {s.deposit_calc.is_matured && ' · ⚠️ Vade Doldu!'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: meta.color, fontWeight: 700, fontSize: '1rem' }}>
                        ₺{fmt(s.type === 'deposit' && s.deposit_calc ? s.deposit_calc.monthly_estimate : s.amount)}
                        <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ay</span>
                      </div>
                      {s.type === 'deposit' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Anapara: ₺{fmt(s.amount)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(s.id)} style={{
                      background: 'transparent', border: 'none', color: '#ef4444',
                      cursor: 'pointer', fontSize: '1rem', padding: '0.25rem',
                    }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* — Tab: Otomatik Temettü — */}
      {activeTab === 'dividends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>📈 Otomatik Temettü Taraması</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Portföyündeki hisseler için son 12 aydaki temettüleri Yahoo Finance'ten otomatik çeker.
              </p>
            </div>
            <button onClick={handleFetchDividends} disabled={divLoading} style={{
              padding: '0.45rem 1rem', background: divLoading ? 'var(--bg-2)' : 'var(--accent)',
              color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600,
              cursor: divLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
            }}>
              {divLoading ? '⏳ Tarıyor...' : '✨ Temettüleri Tara'}
            </button>
          </div>

          {autoDivs.length === 0 && !divLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <p>Yukarıdaki butona basarak portföyünüzdeki hisseler için<br />otomatik temettü taraması başlatın.</p>
            </div>
          )}

          {autoDivs.length > 0 && (
            <>
              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#10b981',
              }}>
                ✅ {autoDivs.length} adet temettü ödeme kaydı bulundu.
                Toplam: ₺{fmt(autoDivs.reduce((s, d) => s + d.total_try, 0))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {autoDivs.map((d, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '0.75rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.ticker}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {d.date} · {d.quantity.toFixed(2)} adet × {d.amount_per_share.toFixed(4)} {d.currency}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#10b981', fontWeight: 700 }}>₺{fmt(d.total_try)}</div>
                      {d.currency !== 'TRY' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {d.currency === 'USD' ? '$' : ''}{d.total_raw.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: `1px solid var(--border)`,
      borderRadius: '14px', padding: '1rem 1.25rem',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '1.25rem', color }}>{value}</div>
    </div>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text)', padding: '0.55rem 0.8rem',
  fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', width: '100%',
};
