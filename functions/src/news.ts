/**
 * Haber Cloud Functions — Python news_service.py mantığı TypeScript'e taşındı.
 * VADER duygu analizi yerine basit kural bazlı sentiment kullanılıyor.
 * AI özeti için Gemini API (Google AI SDK) kullanılıyor.
 */
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// ── CORS ──────────────────────────────────────────────────────────────────
function setCors(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Basit sentiment analizi (kural bazlı) ─────────────────────────────────
const POSITIVE_WORDS = ['surge','rally','gain','rise','up','bull','profit','growth',
  'positive','strong','beat','record','high','boost','recovery','yükseliş','artış',
  'kazanç','güçlü','rekor','toparlanma'];
const NEGATIVE_WORDS = ['crash','fall','drop','decline','bear','loss','negative','weak',
  'miss','low','risk','concern','sell','düşüş','kayıp','zayıf','risk','satış','kötü'];

function analyzeSentiment(text: string): { score: number; label: string } {
  if (!text) return { score: 0, label: 'Nötr ⚪' };
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score++;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score--;
  if (score > 0) return { score: Math.min(score * 0.2, 1), label: 'Pozitif 🟢' };
  if (score < 0) return { score: Math.max(score * 0.2, -1), label: 'Negatif 🔴' };
  return { score: 0, label: 'Nötr ⚪' };
}

// ── GET /newsGet?query=BTC ────────────────────────────────────────────────
export const newsGet = onRequest(
  { region: 'europe-west1', memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    let query = (req.query.query as string) || 'SPY';
    if (['', 'finance', 'genel'].includes(query.toLowerCase())) query = 'SPY';

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const ticker = yahooFinance.search(query, { quotesCount: 0, newsCount: 5 });
      const searchResult = await ticker;
      const newsItems = (searchResult as any).news ?? [];

      const parsed = newsItems.slice(0, 5).map((item: any) => {
        const title = item.title ?? 'Haber Başlığı';
        const sentiment = analyzeSentiment(title);
        return {
          title,
          source: item.publisher ?? 'Yahoo Finance',
          url:    item.link ?? '#',
          date:   item.providerPublishTime
            ? new Date(item.providerPublishTime * 1000).toISOString().slice(0, 16).replace('T', ' ')
            : new Date().toISOString().slice(0, 16).replace('T', ' '),
          sentiment_score: sentiment.score,
          sentiment_label: sentiment.label,
        };
      });

      if (parsed.length === 0) {
        parsed.push({
          title: `${query} hakkında anlık haber bulunamadı.`,
          source: 'Sistem', url: '#',
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          sentiment_score: 0, sentiment_label: 'Nötr ⚪',
        });
      }

      res.json({ query, news: parsed });
    } catch (e) {
      logger.error('newsGet hatası:', e);
      res.json({
        query,
        news: [{
          title: `${query} haberleri çekilirken hata oluştu.`,
          source: 'Sistem', url: '#',
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          sentiment_score: 0, sentiment_label: 'Nötr ⚪',
        }],
      });
    }
  }
);

// ── POST /newsAiSummary { tickers: string[] } ─────────────────────────────
export const newsAiSummary = onRequest(
  { region: 'europe-west1', memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const tickers: string[] = req.body?.tickers ?? ['SPY', 'QQQ'];
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.json({ summary: '⚠️ AI özeti için GEMINI_API_KEY ortam değişkeni ayarlanmamış.' });
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const allTexts: string[] = [];
      for (const ticker of tickers.slice(0, 3)) {
        const searchResult = await yahooFinance.search(ticker, { quotesCount: 0, newsCount: 3 });
        const news = (searchResult as any).news ?? [];
        for (const item of news.slice(0, 3)) {
          const title = item.title ?? '';
          const sentiment = analyzeSentiment(title);
          allTexts.push(`[${ticker}] ${title} (Duygu: ${sentiment.label})`);
        }
      }

      if (allTexts.length === 0) {
        res.json({ summary: 'Analiz edilecek yeterli haber bulunamadı.' });
        return;
      }

      const prompt = `Sen profesyonel bir portföy yöneticisi ve veri bilimcisisin. 
Aşağıda portföyümdeki bazı varlıklar için yayınlanmış en son haber başlıklarını ve duygu skorlarını veriyorum.
Lütfen bu verileri okuyup yatırımcı için tek paragraflık, net, profesyonel ve içgörü dolu bir 'Günün Özeti' çıkar.
Piyasa hissiyatını (Bullish/Bearish) değerlendirmeyi unutma.

Haberler:
${allTexts.join('\n')}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data: any = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'AI özeti üretilemedi.';
      res.json({ summary: text });
    } catch (e) {
      logger.error('newsAiSummary hatası:', e);
      res.json({ summary: `AI özetlemesi sırasında bir hata oluştu: ${String(e)}` });
    }
  }
);

// ── POST /newsNer { text, portfolio_tickers } ─────────────────────────────
// NER (Named Entity Recognition) tamamen statik mantık — API gerektirmiyor
export const newsNer = onRequest(
  { region: 'europe-west1', memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const text: string = req.body?.text ?? '';
    const portfolioTickers: string[] = (req.body?.portfolio_tickers ?? []).map((t: string) => t.toUpperCase());

    const ENTITY_MAP: Record<string, string> = {
      'apple': 'AAPL', 'aapl': 'AAPL', 'tesla': 'TSLA', 'tsla': 'TSLA',
      'nvidia': 'NVDA', 'nvda': 'NVDA', 'microsoft': 'MSFT', 'msft': 'MSFT',
      'amazon': 'AMZN', 'amzn': 'AMZN', 'google': 'GOOGL', 'alphabet': 'GOOGL',
      'googl': 'GOOGL', 'meta': 'META', 'facebook': 'META', 'netflix': 'NFLX',
      'türk hava': 'THYAO', 'thy': 'THYAO', 'thyao': 'THYAO',
      'ereğli': 'EREGL', 'erdemir': 'EREGL', 'eregl': 'EREGL',
      'sabancı': 'SAHOL', 'sahol': 'SAHOL', 'koç': 'KCHOL', 'kchol': 'KCHOL',
      'tüpraş': 'TUPRS', 'tupras': 'TUPRS', 'aselsan': 'ASELS',
      'garanti': 'GARAN', 'garan': 'GARAN', 'akbank': 'AKBNK',
      'bitcoin': 'BTC', 'btc': 'BTC', 'ethereum': 'ETH', 'eth': 'ETH',
      'solana': 'SOL', 'binance coin': 'BNB', 'bnb': 'BNB', 'ripple': 'XRP',
      'gold': 'XAU', 'altın': 'XAU', 'silver': 'XAG', 'gümüş': 'XAG',
      'dolar': 'USD', 'dollar': 'USD', 'euro': 'EUR',
      'fed': '__FED__', 'federal reserve': '__FED__',
    };

    const INDIRECT_MAP: Record<string, string[]> = {
      'TSLA': ['LTHM','ARM'], 'AAPL': ['TSM','SSNLF','ARM'], 'NVDA': ['TSM','ARM'],
      'THYAO': ['XAU','USD'], 'TUPRS': ['XAU','USD'],
    };

    const textLower = text.toLowerCase();
    const foundEntities: Record<string, any> = {};

    for (const [phrase, ticker] of Object.entries(ENTITY_MAP)) {
      if (textLower.includes(phrase) && !foundEntities[ticker]) {
        foundEntities[ticker] = { ticker, phrase, in_portfolio: portfolioTickers.includes(ticker), indirect: false };
      }
    }

    const rawTickers = text.match(/\b([A-Z]{2,6})\b/g) ?? [];
    for (const rt of rawTickers) {
      if (portfolioTickers.includes(rt) && !foundEntities[rt]) {
        foundEntities[rt] = { ticker: rt, phrase: rt, in_portfolio: true, indirect: false };
      }
    }

    const indirectAlerts: any[] = [];
    for (const pt of portfolioTickers) {
      for (const dep of (INDIRECT_MAP[pt] ?? [])) {
        if (foundEntities[dep]) {
          indirectAlerts.push({
            portfolio_ticker: pt,
            related_entity: dep,
            message: `Haberde geçen '${foundEntities[dep].phrase}' (${dep}), portföyünüzdeki ${pt} ile dolaylı tedarik zinciri ilişkisi taşıyor.`,
          });
        }
      }
    }

    const entities = Object.values(foundEntities);
    res.json({
      total_found: entities.length,
      portfolio_hits: entities.filter((e: any) => e.in_portfolio),
      other_entities: entities.filter((e: any) => !e.in_portfolio),
      indirect_alerts: indirectAlerts,
    });
  }
);
