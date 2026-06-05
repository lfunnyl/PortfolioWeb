/**
 * Firebase Cloud Functions — Ana giriş noktası
 * Tüm HTTP endpoint'leri buradan export edilir.
 */
import * as admin from 'firebase-admin';
import { pricesBulk, priceHistorical, priceChart, priceSignals, priceForecast } from './prices';
import { newsGet, newsAiSummary, newsNer } from './news';

admin.initializeApp();

// ── Fiyat Servisleri ──────────────────────────────────────────────────────
export { pricesBulk, priceHistorical, priceChart, priceSignals, priceForecast };

// ── Haber Servisleri ──────────────────────────────────────────────────────
export { newsGet, newsAiSummary, newsNer };
