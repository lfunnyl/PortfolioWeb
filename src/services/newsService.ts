import { functionUrl } from '../utils/api';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category: 'crypto' | 'stock_tr' | 'stock_us' | 'forex' | 'general';
  sentiment_score?: number;
  sentiment_label?: string;
}

export async function fetchFinanceNews(query = 'finance'): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${functionUrl('newsGet')}?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.news || [];
    
    return items.map((item: any) => ({
      title:           item.title,
      link:            item.url,
      source:          item.source,
      pubDate:         item.date,
      category:        'general',
      sentiment_score: item.sentiment_score,
      sentiment_label: item.sentiment_label,
    }));
  } catch (e) {
    console.error('Haberler Cloud Function\'dan çekilemedi', e);
    return [];
  }
}

export async function fetchAiSummary(tickers: string[] = []): Promise<string> {
  try {
    const res = await fetch(functionUrl('newsAiSummary'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
    });
    if (!res.ok) return 'Yapay zeka özeti şu an yüklenemiyor.';
    const data = await res.json();
    return data.summary || 'Özet bulunamadı.';
  } catch (e) {
    console.error('AI Özeti çekilemedi', e);
    return 'Yapay zeka özeti sistemi şu an kullanılamıyor.';
  }
}

export async function fetchNerAnalysis(text: string, portfolioTickers: string[] = []) {
  try {
    const res = await fetch(functionUrl('newsNer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, portfolio_tickers: portfolioTickers }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('NER analizi çekilemedi', e);
    return null;
  }
}
