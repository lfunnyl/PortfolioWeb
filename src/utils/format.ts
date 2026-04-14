/**
 * Ortak para birimi ve sayı biçimlendirici yardımcıları.
 * Tüm bileşenlerde bu dosyadan import edilmeli, dosya başında tekrar tanımlanmamalı.
 */

export type DisplayCurrency = 'TRY' | 'USD';

/** ₺1.234,56 veya $1,234.56 */
export function fmtCurr(n: number, curr: DisplayCurrency = 'TRY', decimals = 2): string {
  const sym = curr === 'TRY' ? '₺' : '$';
  return sym + n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Kısa format: ₺1,2M / ₺340K / ₺123 */
export function fmtCompact(n: number, curr: DisplayCurrency = 'TRY'): string {
  const sym = curr === 'TRY' ? '₺' : '$';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sym}${(n / 1_000).toFixed(1)}K`;
  return fmtCurr(n, curr);
}

/** Yüzde: +12.34% */
export function fmtPct(n: number, signed = true): string {
  const s = signed && n > 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

/** Düz sayı: 1.234,56 */
export function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Dövize göre n'yi görüntülenecek değere dönüştür */
export function toDisplay(tryAmount: number, curr: DisplayCurrency, usdRate: number): number {
  return curr === 'USD' ? tryAmount / usdRate : tryAmount;
}
