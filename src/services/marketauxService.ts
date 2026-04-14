export interface MarketauxNews {
  uuid: string;
  title: string;
  description: string;
  snippet: string;
  url: string;
  image_url: string;
  language: string;
  published_at: string;
  source: string;
  relevance_score: number;
  entities: Array<{ symbol: string; name: string; type: string; industry: string }>;
}

const BASE = "https://api.marketaux.com/v1";

function getToken() {
  return (import.meta as any).env.VITE_MARKETAUX_API_TOKEN || '';
}

async function fetchMarketaux(path: string, params: Record<string, string>) {
  const token = getToken();
  if (!token) {
    throw new Error("Marketaux API Token eksik. Lütfen .env dosyanıza VITE_MARKETAUX_API_TOKEN ekleyin.");
  }
  
  const url = new URL(`${BASE}${path}`);
  url.searchParams.append("api_token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.append(k, v);
  }

  const res = await fetch(url.toString());
  if (res.status === 401) throw new Error("Marketaux 401: Geçersiz API Token.");
  if (res.status === 429) throw new Error("Marketaux 429: API kotası aşıldı.");
  if (!res.ok) throw new Error(`Marketaux API Hatası: ${res.status}`);
  return res.json();
}

export async function searchMarketauxEntity(query: string, isSymbol = false) {
  const params: Record<string, string> = { page: "1" };
  if (isSymbol) {
    params.symbols = query;
  } else {
    params.search = query;
  }
  
  const data = await fetchMarketaux("/entity/search", params);
  return data.data || [];
}

export async function getMarketauxNews(params: Record<string, string>): Promise<MarketauxNews[]> {
  const defaultParams = {
    filter_entities: "true",
    must_have_entities: "true",
    group_similar: "false",
    language: "en",
    sort: "published_at",
    limit: "5",
  };
  
  const data = await fetchMarketaux("/news/all", { ...defaultParams, ...params });
  return data.data || [];
}

export async function getTickerAndIndustryNews(symbol: string) {
  // First find entity to get industry
  let industry = "";
  try {
    const rawSymbol = symbol.split('.')[0]; // remove .IS etc for Marketaux search
    const entities = await searchMarketauxEntity(rawSymbol, true);
    if (entities && entities.length > 0) {
      industry = entities[0].industry;
    }
  } catch (e) {
    console.error("Entity search error:", e);
  }

  const tickerNews = await getMarketauxNews({ symbols: symbol.split('.')[0] }).catch(() => []);
  const industryNews = industry ? await getMarketauxNews({ industries: industry }).catch(() => []) : [];

  return { tickerNews, industryNews, industry };
}
