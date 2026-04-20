import { useState, useEffect } from 'react';
import { fetchAiSummary } from '../services/newsService';

interface AiNewsAssistantProps {
  tickers?: string[];
}

export function AiNewsAssistant({ tickers = [] }: AiNewsAssistantProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAiSummary(tickers)
      .then(setSummary)
      .catch(() => setSummary("Hata oluştu."))
      .finally(() => setLoading(false));
  }, [tickers]);

  return (
    <div style={{
      background: 'linear-gradient(145deg, var(--bg-1), var(--bg-2))',
      border: '1px solid rgba(139, 92, 246, 0.3)', // Purple tone for AI
      borderRadius: 'var(--radius)',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(139, 92, 246, 0.05)'
    }} className="glass-card">
      
      {/* Decorative Blur Background Element */}
      <div style={{
        position: 'absolute',
        top: '-50%', left: '-20%',
        width: '200px', height: '200px',
        background: 'rgba(139, 92, 246, 0.15)',
        filter: 'blur(50px)',
        borderRadius: '50%',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.2rem' }}>✨</span>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700
          }}>
            Yapay Zeka Günün Özeti
          </h3>
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#8b5cf6',
            fontWeight: 'bold'
          }}>Gemini 2.5 Flash</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton-line" style={{ width: '100%', height: '14px', background: 'rgba(139, 92, 246, 0.1)' }} />
            <div className="skeleton-line" style={{ width: '90%', height: '14px', background: 'rgba(139, 92, 246, 0.1)' }} />
            <div className="skeleton-line" style={{ width: '60%', height: '14px', background: 'rgba(139, 92, 246, 0.1)' }} />
          </div>
        ) : (
          <div style={{ 
            fontSize: '0.9rem', 
            lineHeight: 1.6, 
            color: 'var(--text)', 
            whiteSpace: 'pre-wrap' 
          }}>
            {summary}
          </div>
        )}
      </div>
    </div>
  );
}
