import { useState, useEffect } from 'react';
import { fetchFinanceNews, NewsItem } from '../services/newsService';
import { AiNewsAssistant } from './AiNewsAssistant';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  crypto:   { label: 'Kripto',  icon: '₿', color: '#f59e0b' },
  stock_tr: { label: 'BIST',    icon: '🇹🇷', color: '#3b82f6' },
  stock_us: { label: 'ABD',     icon: '🇺🇸', color: '#8b5cf6' },
  forex:    { label: 'Döviz',   icon: '💱', color: '#06b6d4' },
  general:  { label: 'Genel',   icon: '📰', color: '#6b7280' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Az önce';
  if (mins < 60)  return `${mins} dk önce`;
  if (hours < 24) return `${hours} saat önce`;
  return `${days} gün önce`;
}

export function NewsView() {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<string>('all');

  useEffect(() => {
    fetchFinanceNews()
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? news : news.filter(n => n.category === filter);

  return (
    <div>
      <AiNewsAssistant tickers={['SPY', 'BTC-USD']} />
      
      {/* Filtre Butonları */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '0.35rem 0.8rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: filter === 'all' ? 'var(--accent)' : 'var(--bg-2)',
            color: filter === 'all' ? 'white' : 'var(--text-muted)',
            fontWeight: filter === 'all' ? 700 : 400, fontSize: '0.8rem', transition: 'all 0.15s',
          }}
        >📰 Tümü</button>
        {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'general').map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '0.35rem 0.8rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: filter === key ? val.color : 'var(--bg-2)',
              color: filter === key ? 'white' : 'var(--text-muted)',
              fontWeight: filter === key ? 700 : 400, fontSize: '0.8rem', transition: 'all 0.15s',
            }}
          >{val.icon} {val.label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card skeleton-card" style={{ height: '80px', padding: '1rem' }}>
              <div className="skeleton-line" style={{ width: '70%', height: '14px', marginBottom: '0.5rem' }} />
              <div className="skeleton-line" style={{ width: '40%', height: '12px' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <p>📰 Şu an haber bulunamadı. İnternet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filtered.map((item, i) => {
            const cat = CATEGORY_LABELS[item.category] ?? CATEGORY_LABELS.general;
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-card"
                style={{
                  display: 'block', textDecoration: 'none', color: 'inherit',
                  padding: '0.9rem 1rem', borderRadius: 'var(--radius)',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      margin: 0, fontSize: '0.9rem', fontWeight: 600,
                      lineHeight: 1.4, color: 'var(--text)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{item.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      {item.source && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.source}</span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6 }}>·</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(item.pubDate)}</span>
                      
                      {item.sentiment_label && (
                        <>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6 }}>·</span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 600,
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            background: item.sentiment_label.includes('Pozitif') ? 'rgba(34, 197, 94, 0.1)' : 
                                        item.sentiment_label.includes('Negatif') ? 'rgba(239, 68, 68, 0.1)' : 
                                        'rgba(156, 163, 175, 0.1)',
                            color: item.sentiment_label.includes('Pozitif') ? '#22c55e' : 
                                   item.sentiment_label.includes('Negatif') ? '#ef4444' : 
                                   '#9ca3af',
                          }}>
                            {item.sentiment_label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                    padding: '0.2rem 0.5rem', borderRadius: '12px',
                    background: cat.color + '22', color: cat.color,
                  }}>
                    {cat.icon} {cat.label}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
