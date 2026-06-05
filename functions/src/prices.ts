/**
 * Fiyat Cloud Functions — yfinance'in TypeScript karşılığı yahoo-finance2 kullanılıyor.
 * Python backend'deki price_service.py + prices.py mantığı buraya taşındı.
 */
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// ── Yardımcı: asset_id → Yahoo Finance ticker ─────────────────────────────
function getYahooTicker(assetId: string): string | null {
  const id = assetId.toUpperCase();
  if (id === 'TRY_CASH') return null;

  const CRYPTOS = ['BTC','ETH','BNB','SOL','XRP','DOGE','ADA','AVAX','TRX','LINK',
    'DOT','MATIC','LTC','SHIB','UNI','ATOM','XLM','ETC','BCH','ALGO','VET','FIL',
    'ICP','APT','ARB','OP','SUI','NEAR','INJ','PEPE','TON','RENDER','FET','AAVE','MKR'];
  if (CRYPTOS.includes(id)) return `${id}-USD`;

  if (id === 'XAU') return 'GC=F';
  if (id === 'XAG') return 'SI=F';
  if (id === 'XPT') return 'PL=F';
  if (id === 'XPD') return 'PA=F';

  const FX: Record<string, string> = {
    USD: 'TRY=X', EUR: 'EURTRY=X', GBP: 'GBPTRY=X',
    CHF: 'CHFTRY=X', JPY: 'JPYTRY=X', CAD: 'CADTRY=X',
    AUD: 'AUDTRY=X', CNY: 'CNYTRY=X',
  };
  if (FX[id]) return FX[id];

  const US_STOCKS = ['AAPL','TSLA','NVDA','AMZN','MSFT','GOOGL','META','NFLX',
    'PLTR','COIN','MSTR','AMD','INTC','JPM','BAC','V','MA','DIS','BABA','UBER',
    'SPOT','SHOP','SQ','PYPL','CRM','ADBE','ORCL','IBM','WMT','KO','PEP','SBUX',
    'MCD','XOM','BRK-B'];
  if (US_STOCKS.includes(id)) return id;

  // BIST hisseleri
  if (!id.endsWith('.IS') && id.length <= 5 && /^[A-Z]+$/.test(id)) {
    return `${id}.IS`;
  }
  return id;
}

// ── CORS headers ──────────────────────────────────────────────────────────
function setCors(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── POST /pricesBulk  { asset_ids: string[] } → { [id]: number } ─────────
export const pricesBulk = onRequest(
  { region: 'europe-west1', memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const assetIds: string[] = req.body?.asset_ids ?? [];
    const result: Record<string, number> = { TRY_CASH: 1.0 };

    try {
      const tickerMap: Record<string, string> = {};
      for (const aid of assetIds) {
        if (aid === 'TRY_CASH') continue;
        const t = getYahooTicker(aid);
        if (t) tickerMap[aid] = t;
      }

      const uniqueTickers = [...new Set(Object.values(tickerMap))];
      if (!uniqueTickers.includes('TRY=X') &&
          uniqueTickers.some(t => !t.endsWith('.IS') && !t.endsWith('TRY=X') && !t.endsWith('=X'))) {
        uniqueTickers.push('TRY=X');
      }

      // Paralel fiyat çekme
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const priceMap: Record<string, number> = {};
      await Promise.allSettled(
        uniqueTickers.map(async (ticker) => {
          try {
            const quote = await yahooFinance.quote(ticker);
            const price = quote?.regularMarketPrice ?? 0;
            priceMap[ticker] = price;
          } catch {
            priceMap[ticker] = 0;
          }
        })
      );

      const usdTry = priceMap['TRY=X'] || 1.0;

      for (const aid of assetIds) {
        if (aid === 'TRY_CASH') continue;
        const ticker = tickerMap[aid];
        if (!ticker) continue;
        let price = priceMap[ticker] ?? 0;

        // TRY'ye çevir
        if (['XAU','XAG','XPT','XPD'].includes(aid.toUpperCase())) {
          price = (price * usdTry) / 31.1035; // troy oz → gram TRY
        } else if (ticker && (
          ticker.endsWith('-USD') ||
          ['AAPL','TSLA','NVDA','AMZN','MSFT','GOOGL','META','NFLX',
           'PLTR','COIN','MSTR','AMD','INTC','JPM','BAC','V','MA','DIS',
           'BABA','UBER','SPOT','SHOP','SQ','PYPL','CRM','ADBE','ORCL',
           'IBM','WMT','KO','PEP','SBUX','MCD','XOM','BRK-B'].includes(ticker)
        )) {
          price = price * usdTry;
        }

        if (price > 0) result[aid] = price;
      }

      res.json(result);
    } catch (e) {
      logger.error('pricesBulk hatası:', e);
      res.status(500).json({ error: 'Fiyatlar çekilemedi.' });
    }
  }
);

// ── GET /priceHistorical?ticker=THYAO&date=2024-01-15 ─────────────────────
export const priceHistorical = onRequest(
  { region: 'europe-west1', memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const { ticker, date } = req.query as Record<string, string>;
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const dt     = new Date(date);
      const dtStart = new Date(dt); dtStart.setDate(dtStart.getDate() - 5);
      const dtEnd   = new Date(dt); dtEnd.setDate(dtEnd.getDate() + 5);

      const data = await yahooFinance.historical(ticker, {
        period1: dtStart.toISOString().split('T')[0],
        period2: dtEnd.toISOString().split('T')[0],
      });

      const past = data.filter(d => new Date(d.date) <= dt);
      const row  = past.length > 0 ? past[past.length - 1] : data[0];
      res.json({ ticker, date, price: row?.close ?? 0 });
    } catch (e) {
      res.json({ ticker, date, price: 0 });
    }
  }
);

// ── GET /priceChart?ticker=BTC&range=1M ──────────────────────────────────
export const priceChart = onRequest(
  { region: 'europe-west1', memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const { ticker, range = '1mo' } = req.query as Record<string, string>;
    const rangeMap: Record<string, string> = {
      '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', 'YTD': 'ytd'
    };
    const yRange = rangeMap[range] ?? range;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const data = await yahooFinance.historical(ticker, { period1: getPeriodStart(yRange) });
      const result = data.map(d => ({
        date:  d.date.toISOString().split('T')[0],
        price: d.close ?? 0,
      }));
      res.json(result);
    } catch {
      res.json([]);
    }
  }
);

function getPeriodStart(range: string): string {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case '5d':  d.setDate(d.getDate() - 5); break;
    case '1mo': d.setMonth(d.getMonth() - 1); break;
    case '3mo': d.setMonth(d.getMonth() - 3); break;
    case '6mo': d.setMonth(d.getMonth() - 6); break;
    case '1y':  d.setFullYear(d.getFullYear() - 1); break;
    case 'ytd': d.setMonth(0); d.setDate(1); break;
    default:    d.setMonth(d.getMonth() - 1);
  }
  return d.toISOString().split('T')[0];
}

// ── GET /priceSignals?ticker=THYAO ────────────────────────────────────────
export const priceSignals = onRequest(
  { region: 'europe-west1', memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const { ticker } = req.query as Record<string, string>;
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const data = await yahooFinance.historical(ticker, {
        period1: oneYearAgo.toISOString().split('T')[0],
        interval: '1d',
      });

      if (data.length < 30) {
        res.json({ error: 'Yeterli veri yok' });
        return;
      }

      const closes  = data.map(d => d.close ?? 0).filter(v => v > 0);
      const volumes = data.map(d => d.volume ?? 0);

      // RSI (14)
      const rsi = calcRSI(closes, 14);

      // MACD (12, 26, 9)
      const ema12 = calcEMA(closes, 12);
      const ema26 = calcEMA(closes, 26);
      const macdLine = ema12.map((v, i) => v - ema26[i]);
      const signalLine = calcEMA(macdLine, 9);
      const histogram = macdLine.map((v, i) => v - signalLine[i]);

      // SMA 50/200
      const sma50  = calcSMA(closes, 50);
      const sma200 = calcSMA(closes, 200);

      // Bollinger (20)
      const sma20  = calcSMA(closes, 20);
      const std20  = calcSTD(closes, 20);
      const bbUpper = sma20.map((v, i) => v + std20[i] * 2);
      const bbLower = sma20.map((v, i) => v - std20[i] * 2);

      const n  = closes.length - 1;
      const n1 = n - 1;
      const cur  = closes[n];
      const rsiVal   = rsi[n];
      const macdVal  = macdLine[n];
      const sigVal   = signalLine[n];
      const histVal  = histogram[n];

      // Sinyaller
      const rsiSignal = rsiVal >= 70 ? 'SAT (Aşırı Alım)' : rsiVal <= 30 ? 'AL (Aşırı Satım)' : 'NÖTR';

      let macdSignal = 'NÖTR';
      if (macdLine[n] > signalLine[n] && macdLine[n1] <= signalLine[n1]) macdSignal = 'GÜÇLÜ AL (Yukarı Kesişim)';
      else if (macdLine[n] < signalLine[n] && macdLine[n1] >= signalLine[n1]) macdSignal = 'GÜÇLÜ SAT (Aşağı Kesişim)';
      else if (histVal > 0) macdSignal = 'AL (Trend Pozitif)';
      else macdSignal = 'SAT (Trend Negatif)';

      const high52 = Math.max(...closes);
      const low52  = Math.min(...closes);

      let maCross = 'NÖTR';
      if (sma50[n] && sma200[n]) {
        if (sma50[n] > sma200[n] && sma50[n1] <= sma200[n1]) maCross = '🎉 GOLDEN CROSS (Boğa Piyasası)';
        else if (sma50[n] < sma200[n] && sma50[n1] >= sma200[n1]) maCross = '⚠️ DEATH CROSS (Ayı Piyasası)';
        else if (sma50[n] > sma200[n]) maCross = 'Pozitif (50 MA > 200 MA)';
        else maCross = 'Negatif (50 MA < 200 MA)';
      }

      const avgVol20  = volumes.slice(-20).reduce((a,b) => a+b, 0) / 20;
      const curVol    = volumes[n];
      const volAnomaly = curVol > avgVol20 * 2
        ? `Aşırı Hacim (${(curVol/avgVol20).toFixed(1)}x artış)`
        : curVol > avgVol20 * 1.5 ? 'Yüksek Hacim' : 'Normal';

      const bbWidth = sma20[n] > 0
        ? ((bbUpper[n] - bbLower[n]) / sma20[n]) * 100
        : 0;
      let bbSignal = 'Normal';
      if (bbWidth < 5) bbSignal = 'Sıkışma (Sert hareket yaklaşıyor)';
      else if (cur > bbUpper[n]) bbSignal = 'Üst Bandı Kırdı';
      else if (cur < bbLower[n]) bbSignal = 'Alt Bandı Kırdı';

      let score = 0;
      if (rsiSignal.includes('AL')) score++; else if (rsiSignal.includes('SAT')) score--;
      if (macdSignal.includes('GÜÇLÜ AL')) score += 2; else if (macdSignal.includes('AL')) score++;
      else if (macdSignal.includes('GÜÇLÜ SAT')) score -= 2; else if (macdSignal.includes('SAT')) score--;
      if (maCross.includes('GOLDEN')) score += 3; else if (maCross.includes('DEATH')) score -= 3;
      else if (maCross.includes('Pozitif')) score++; else if (maCross.includes('Negatif')) score--;

      const overall = score >= 3 ? 'GÜÇLÜ AL' : score > 0 ? 'AL' : score <= -3 ? 'GÜÇLÜ SAT' : score < 0 ? 'SAT' : 'NÖTR';

      res.json({
        ticker, price: cur, overall_signal: overall,
        details: {
          rsi:      { value: round(rsiVal), signal: rsiSignal },
          macd:     { macd_line: round(macdVal), signal_line: round(sigVal), histogram: round(histVal), signal: macdSignal },
          high_52w: { value: round(high52), dist_pct: round(((high52 - cur) / high52) * 100) },
          ma_cross: maCross,
          vol_anomaly: volAnomaly,
          bollinger: bbSignal,
        },
      });
    } catch (e) {
      logger.error('priceSignals hatası:', e);
      res.json({ error: String(e) });
    }
  }
);

// ── GET /priceForecast?ticker=BTC&days=30 ─────────────────────────────────
export const priceForecast = onRequest(
  { region: 'europe-west1', memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const { ticker, days: daysStr = '30' } = req.query as Record<string, string>;
    const days = parseInt(daysStr, 10);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { default: yahooFinance } = await import('yahoo-finance2');
      const data = await yahooFinance.historical(ticker, { period1: oneYearAgo.toISOString().split('T')[0] });
      const vals = data.map(d => d.close ?? 0).filter(v => v > 0);

      if (vals.length < 30) { res.json({ error: 'Yeterli veri yok (min 30 gün)' }); return; }

      const sesF = (series: number[], alpha: number, h: number) => {
        let level = series[0];
        for (const v of series.slice(1)) level = alpha * v + (1 - alpha) * level;
        const diffs = series.slice(-20).map((v,i,a) => i > 0 ? v - a[i-1] : 0).slice(1);
        const drift = diffs.reduce((a,b) => a+b, 0) / diffs.length || 0;
        return Array.from({ length: h }, (_, i) => level + drift * (i + 1));
      };

      let bestAlpha = 0.3, bestMse = Infinity;
      for (const a of [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]) {
        const preds = vals.slice(20).map((_,i) => sesF(vals.slice(0, i+20), a, 1)[0]);
        const actuals = vals.slice(20);
        const mse = preds.reduce((s,p,i) => s + (p - actuals[i])**2, 0) / preds.length;
        if (mse < bestMse) { bestMse = mse; bestAlpha = a; }
      }

      const forecastVals = sesF(vals, bestAlpha, days);
      const fitted = vals.slice(1).map((_,i) => sesF(vals.slice(0, i+1), bestAlpha, 1)[0]);
      const residuals = vals.slice(1).map((v,i) => v - fitted[i]);
      const stdRes = Math.sqrt(residuals.reduce((s,r) => s + r**2, 0) / residuals.length);
      const z90 = 1.645;

      const lastDate = data[data.length - 1].date;
      const futureDates: string[] = [];
      let d = new Date(lastDate);
      while (futureDates.length < days) {
        d = new Date(d); d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) futureDates.push(d.toISOString().split('T')[0]);
      }

      const history = data.slice(-60).map(row => ({
        date:  row.date.toISOString().split('T')[0],
        price: round(row.close ?? 0, 4),
      }));
      const forecast = forecastVals.map((p, i) => ({
        date:  futureDates[i],
        price: round(p, 4),
        lower: round(p - z90 * stdRes * Math.sqrt(i+1), 4),
        upper: round(p + z90 * stdRes * Math.sqrt(i+1), 4),
      }));

      const curPrice = vals[vals.length - 1];
      const fEnd = forecastVals[forecastVals.length - 1];
      res.json({
        ticker, alpha: bestAlpha,
        current_price: round(curPrice, 4),
        forecast_end_price: round(fEnd, 4),
        forecast_change_pct: round(((fEnd - curPrice) / curPrice) * 100, 2),
        confidence: 90, history, forecast,
      });
    } catch (e) {
      res.json({ error: String(e) });
    }
  }
);

// ── Matematik yardımcıları ────────────────────────────────────────────────
function round(v: number, d = 2) { return Math.round(v * 10**d) / 10**d; }

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = new Array(data.length).fill(0);
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) result[i] = data[i] * k + result[i-1] * (1-k);
  return result;
}

function calcSMA(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return 0;
    return data.slice(i - period + 1, i + 1).reduce((a,b) => a+b, 0) / period;
  });
}

function calcSTD(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return 0;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a,b) => a+b, 0) / period;
    return Math.sqrt(slice.reduce((s,v) => s + (v - mean)**2, 0) / period);
  });
}

function calcRSI(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(50);
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i-1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = gains.slice(1, period+1).reduce((a,b) => a+b, 0) / period;
  let avgLoss = losses.slice(1, period+1).reduce((a,b) => a+b, 0) / period;
  for (let i = period; i < data.length; i++) {
    avgGain = (avgGain * (period-1) + gains[i]) / period;
    avgLoss = (avgLoss * (period-1) + losses[i]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs);
  }
  return result;
}
