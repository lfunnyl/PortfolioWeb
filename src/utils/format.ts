import { PartialDate, QuantityUnit } from '../types/asset';

// ─── ID / Dönüşüm Yardımcıları ───────────────────────────────────────────────

/** Benzersiz ID üretir. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Kısmi tarih → ISO string (eksik kısımlar 01 kabul edilir). */
export function partialToIso(p: PartialDate): string {
  if (!p.year) return '';
  return `${p.year}-${String(p.month ?? 1).padStart(2, '0')}-${String(p.day ?? 1).padStart(2, '0')}`;
}

/** ISO string → kısmi tarih. */
export function isoToPartial(iso: string): PartialDate {
  if (!iso) return {};
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** Metal miktarını gram'a dönüştürür. */
export function toGram(qty: number, unit: QuantityUnit): number {
  if (unit === 'kg') return qty * 1000;
  if (unit === 'troy_oz') return qty * 31.1035;
  return qty;
}

/** TRY → görüntüleme para birimi dönüşümü. */
export function toDisplay(n: number, curr: 'TRY' | 'USD', usdRate: number): number {
  return curr === 'USD' ? n / usdRate : n;
}

// ─── Para & Sayı Formatlama ──────────────────────────────────────────────────

/** Sayıyı Türk lirası biçiminde formatlar. */
export function fmtTRY(n: number): string {
  return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Sayıyı para birimi seçimine göre formatlar. */
export function fmtCurr(n: number, curr: 'TRY' | 'USD' = 'TRY'): string {
  return (curr === 'TRY' ? '₺' : '$') +
    n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Yüzde formatlar (işaret dahil). */
export function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/**
 * Büyük sayıları kısaltır: 1.500.000 → ₺1,5M / $1.5M
 * Opsiyonel curr: 'TRY' veya 'USD'
 */
export function fmtCompact(n: number, curr: 'TRY' | 'USD' = 'TRY'): string {
  const sym = curr === 'TRY' ? '₺' : '$';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(1)}Myr`;
  if (abs >= 1_000_000)     return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}${sym}${(abs / 1_000).toFixed(1)}B`;
  return fmtCurr(n, curr);
}

/**
 * Sayıyı ondalık basamak sayısıyla formatlar.
 * @param decimals - varsayılan 2
 */
export function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
