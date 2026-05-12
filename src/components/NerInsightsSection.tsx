import { useState } from 'react';
import { PortfolioRow } from '../types/asset';
import { apiUrl } from '../utils/api';

interface NerEntity {
  ticker: string;
  phrase: string;
  in_portfolio: boolean;
  indirect: boolean;
}

interface IndirectAlert {
  portfolio_ticker: string;
  related_entity: string;
  message: string;
}

interface NerResult {
  total_found: number;
  portfolio_hits: NerEntity[];
  other_entities: NerEntity[];
  indirect_alerts: IndirectAlert[];
}

interface Props {
  rows: PortfolioRow[];
}

const EXAMPLE_TEXTS = [
  "Apple's iPhone sales in China fell sharply due to Huawei competition, while TSMC reported strong demand for advanced chips from Nvidia.",
  "Federal Reserve raised interest rates by 25bps. Bitcoin fell 3% while Gold surged. THYAO secured new aircraft orders boosting Turkish Airlines.",
  "Tesla announced new lithium battery supply deal as Solana blockchain sees record transaction volume. Bitcoin hits new all-time high.",
  "Microsoft acquires AI startup, Berkshire Hathaway reports strong earnings. TUPRS crude oil margins compress due to dollar strength.",
];

export function NerInsightsSection({ rows }: Props) {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<NerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portfolioTickers = Array.from(new Set(rows.map(r => r.assetDef.symbol?.replace('.IS', '').replace('.E', '') || r.assetId)));

  async function analyze() {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(apiUrl('/news/ner'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, portfolio_tickers: portfolioTickers }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error('API hatası');
      setResult(await res.json());
    } catch {
      setError('NER analizi başarısız oldu. Backend bağlantısını kontrol edin.');
    } finally {
      setLoading(false);
    }
  }

  const hasResults = result && (result.portfolio_hits.length > 0 || result.other_entities.length > 0 || result.indirect_alerts.length > 0);

  return (
    <div className="glass-card adv-section">
      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="adv-title" style={{ margin: 0 }}>🕵️ Haber NER Analizi</h3>
          <p className="adv-hint" style={{ marginTop: '0.3rem', lineHeight: 1.5 }}>
            Haber metnindeki şirket/varlık isimlerini (Named Entity Recognition) çıkarır.
            Portföyünüzle örtüşen ya da dolaylı tedarik zinciri bağlantısı olan varlıkları tespit eder.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {EXAMPLE_TEXTS.slice(0, 2).map((t, i) => (
            <button
              key={i}
              className="btn-action"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', opacity: 0.8 }}
              onClick={() => setInputText(t)}
            >
              Örnek {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Metin alanı + buton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Analiz edilecek haber metnini buraya yapıştırın (İngilizce veya Türkçe)..."
          rows={4}
          style={{
            width: '100%', resize: 'vertical', padding: '0.75rem',
            borderRadius: '8px', border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
            fontSize: '0.85rem', lineHeight: 1.6, boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={analyze}
            disabled={loading || !inputText.trim()}
            style={{ padding: '0.55rem 1.2rem' }}
          >
            {loading ? '⏳ Analiz Ediliyor...' : '🔍 Varlıkları Tespit Et'}
          </button>
          {inputText && (
            <button
              className="btn-action btn-delete"
              onClick={() => { setInputText(''); setResult(null); setError(null); }}
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
            >
              ✕ Temizle
            </button>
          )}
          {portfolioTickers.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Portföyde {portfolioTickers.length} varlık izleniyor: {portfolioTickers.slice(0, 5).join(', ')}{portfolioTickers.length > 5 ? '...' : ''}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem', marginTop: '1rem' }}>
          ❌ {error}
        </div>
      )}

      {/* Sonuçlar */}
      {result && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Portföydeki varlıklar */}
          {result.portfolio_hits.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🟢 Portföyünüzdeki Varlıklar ({result.portfolio_hits.length} adet)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {result.portfolio_hits.map((e, i) => (
                  <span key={i} style={{
                    padding: '0.3rem 0.7rem', borderRadius: '99px', fontSize: '0.8rem',
                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600,
                  }}>
                    {e.ticker}
                    <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: '0.3rem' }}>"{e.phrase}"</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dolaylı uyarılar */}
          {result.indirect_alerts.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚠️ Dolaylı Tedarik Zinciri Uyarıları
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {result.indirect_alerts.map((alert, i) => (
                  <div key={i} style={{
                    padding: '0.6rem 0.9rem', borderRadius: '8px',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                    fontSize: '0.82rem', lineHeight: 1.5,
                  }}>
                    <strong style={{ color: '#f59e0b' }}>{alert.portfolio_ticker}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>→</span>
                    <span style={{ color: 'var(--text)', marginLeft: '0.5rem' }}>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diğer varlıklar */}
          {result.other_entities.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📌 Haberdeki Diğer Varlıklar ({result.other_entities.length} adet)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {result.other_entities.map((e, i) => (
                  <span key={i} style={{
                    padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.78rem',
                    background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                    border: '1px solid rgba(148,163,184,0.2)',
                  }}>
                    {e.ticker}
                    <span style={{ opacity: 0.6, marginLeft: '0.25rem' }}>"{e.phrase}"</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {!hasResults && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              🔍 Metinde tanınan bir varlık/şirket bulunamadı. Daha uzun veya farklı bir metin deneyin.
            </div>
          )}

          {/* Özet satırı */}
          <div style={{
            padding: '0.5rem 0.75rem', borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            fontSize: '0.75rem', color: 'var(--text-muted)',
          }}>
            Toplam <strong style={{ color: 'var(--text)' }}>{result.total_found}</strong> varlık tespit edildi —
            <span style={{ color: '#10b981' }}> {result.portfolio_hits.length} portföyde</span>,
            <span style={{ color: '#f59e0b' }}> {result.indirect_alerts.length} dolaylı uyarı</span>,
            <span style={{ color: '#94a3b8' }}> {result.other_entities.length} diğer</span>
          </div>
        </div>
      )}
    </div>
  );
}
