import { useEffect, useState } from 'react';
import { getTickerAndIndustryNews, MarketauxNews } from '../services/marketauxService';
import { generatePrintStyles, getSentimentColor } from '../utils/printUtils';

interface ReportModalProps {
  symbol: string;
  name: string;
  onClose: () => void;
}

export function ReportModal({ symbol, name, onClose }: ReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickerNews, setTickerNews] = useState<MarketauxNews[]>([]);
  const [industryNews, setIndustryNews] = useState<MarketauxNews[]>([]);
  const [industry, setIndustry] = useState('');

  useEffect(() => {
    // Inject print styles dynamically
    const styleEl = document.createElement('style');
    styleEl.innerHTML = generatePrintStyles();
    document.head.appendChild(styleEl);
    
    getTickerAndIndustryNews(symbol)
      .then(res => {
        setTickerNews(res.tickerNews);
        setIndustryNews(res.industryNews);
        setIndustry(res.industry);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      document.head.removeChild(styleEl);
    };
  }, [symbol]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Modal Header (Not Printed) */}
        <div className="print-btn-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📄 Gündem Raporu ({symbol})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handlePrint} disabled={loading || !!error} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>🖨️ Yazdır / PDF İndir</button>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text)', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer' }}>✕ Kapat</button>
          </div>
        </div>

        {/* Modal Content (Printed) */}
        <div id="print-report" style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          <div className="report-header">
            <h1 className="report-title">Gündem Raporu</h1>
            <div className="report-meta">
              <strong>Varlık:</strong> {name} ({symbol})<br/>
              {industry && <><strong style={{marginTop: '4px', display:'inline-block'}}>Sektör:</strong> {industry}<br/></>}
              <strong style={{marginTop: '4px', display:'inline-block'}}>Oluşturulma Tarihi:</strong> {new Date().toLocaleString('tr-TR')}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              ⏳ Haberler Marketaux API üzerinden getiriliyor...<br/>
              (Bu işlem birkaç saniye sürebilir)
            </div>
          ) : error ? (
            <div style={{ background: '#ef444422', color: '#ef4444', padding: '1rem', borderLeft: '4px solid #ef4444' }}>
              ❌ Hata: {error}
            </div>
          ) : (
            <>
              {/* Şirket Haberleri */}
              <div className="section-title">ŞİRKET HABERLERİ ({tickerNews.length} haber)</div>
              {tickerNews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Bu hisse için yakın zamanda haber bulunamadı.</p>
              ) : (
                tickerNews.map((news, idx) => (
                  <div key={news.uuid} className="news-item">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#1a1a2e', color: 'white', padding: '2px 6px', fontSize: '10px', borderRadius: '3px', marginTop: '2px' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <h4 className="news-title">{news.title}</h4>
                        <div className="news-meta">
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: getSentimentColor(news.relevance_score || 0), marginRight: '4px' }}></span>
                          {news.source} • {new Date(news.published_at).toLocaleString('tr-TR')}
                        </div>
                        <div className="news-desc">{news.description || news.snippet}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Sektör Haberleri */}
              {industry && (
                <>
                  <div className="section-title">SEKTÖR HABERLERİ ({industryNews.length} haber)</div>
                  {industryNews.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Bu sektör için yakın zamanda haber bulunamadı.</p>
                  ) : (
                    industryNews.map((news, idx) => (
                      <div key={news.uuid} className="news-item">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <div style={{ background: '#1a1a2e', color: 'white', padding: '2px 6px', fontSize: '10px', borderRadius: '3px', marginTop: '2px' }}>
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div>
                            <h4 className="news-title">{news.title}</h4>
                            <div className="news-meta">
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: getSentimentColor(news.relevance_score || 0), marginRight: '4px' }}></span>
                              {news.source} • {new Date(news.published_at).toLocaleString('tr-TR')}
                            </div>
                            <div className="news-desc">{news.description || news.snippet}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
              
              {/* Footer */}
              <div style={{ marginTop: '40px', paddingTop: '10px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#666', textAlign: 'center' }}>
                Bu rapor eğitim/araştırma amacıdır. Yatırım tavsiyesi değildir.<br/>
                Haberler Marketaux API tarafından çekilmektedir.
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
