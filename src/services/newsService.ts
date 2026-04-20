import { apiUrl } from '../utils/api';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category: 'crypto' | 'stock_tr' | 'stock_us' | 'forex' | 'general';
  sentiment_score?: number;
  sentiment_label?: string;
}

export async function fetchFinanceNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(apiUrl('/news?query=finance'));
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.news || [];
    
    return items.map((item: any) => ({
      title: item.title,
      link: item.url,
      source: item.source,
      pubDate: item.date,
      category: 'general',
      sentiment_score: item.sentiment_score,
      sentiment_label: item.sentiment_label
    }));
  } catch (e) {
    console.error("Haberler backend'den cekilemedi", e);
    return [];
  }
}

export async function fetchAiSummary(tickers: string[] = []): Promise<string> {
  try {
    const res = await fetch(apiUrl('/news/ai-summary'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tickers })
    });
    if (!res.ok) return "Yapay zeka özeti şu an yüklenemiyor.";
    const data = await res.json();
    return data.summary || "Özet bulunamadı.";
  } catch (e) {
    console.error("AI Özeti cekilemedi", e);
    return "Yapay zeka özeti sistemi şu an kullanılamıyor.";
  }
}
