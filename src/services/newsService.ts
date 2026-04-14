import { apiUrl } from '../utils/api';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category: 'crypto' | 'stock_tr' | 'stock_us' | 'forex' | 'general';
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
      category: 'general'
    }));
  } catch (e) {
    console.error("Haberler backend'den cekilemedi", e);
    return [];
  }
}
