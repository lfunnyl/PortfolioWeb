export async function searchYahooFinance(query: string) {
  if (!query) return [];
  
  // Önce Vite Proxy'sini deniyoruz (Lokelde doğrudan senin internetinle Yahoo'ya bağlanır, limitlere takılmaz)
  const localProxyUrl = `/api/yahoo/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  
  try {
    const res = await fetch(localProxyUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.quotes) {
        return data.quotes.filter((q: any) => q.isYahooFinance);
      }
    }
  } catch (err) {
    console.warn("Vite Proxy başarısız oldu, dış sunuculara geçiliyor...");
  }

  // Olur da canlıya (production) alınırsa diye harici proxy'ler yedek olarak bekler
  const directUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  const CORS_PROXIES = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(directUrl), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.quotes) {
        return data.quotes.filter((q: any) => q.isYahooFinance);
      }
    } catch {
      continue;
    }
  }
  return [];
}
