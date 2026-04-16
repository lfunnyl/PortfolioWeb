/**
 * Türkiye TÜİK/ENAG yıllık enflasyon verileri (%).
 * Kaynak: Resmi TÜİK TÜFE yıllık değişim ortalamaları.
 * Gerektiğinde güncellenmek üzere sabit dizi olarak tutulur.
 */
export const TUIK_INFLATION: Record<number, number> = {
  2015: 7.67,
  2016: 7.78,
  2017: 11.14,
  2018: 16.33,
  2019: 15.18,
  2020: 12.28,
  2021: 19.60,
  2022: 72.31,
  2023: 64.77,
  2024: 58.94,
  2025: 42.00, // Tahmini / yılın ilk çeyreği ortalaması
};

/** Belirli bir yılın enflasyon oranını döndürür. Bilinmiyorsa 2024 değerini kullanır. */
export function getInflationRate(year: number): number {
  return TUIK_INFLATION[year] ?? TUIK_INFLATION[2024] ?? 58.94;
}

/**
 * Alış tarihi ile bugün arasındaki kümülatif enflasyonu hesaplar.
 * @param purchaseYear - Alış yılı
 * @param currentYear - Güncel yıl
 * @returns Kümülatif enflasyon çarpanı (örn. 2.5 → %150 enflasyon olmuş)
 */
export function cumulativeInflation(purchaseYear: number, currentYear: number): number {
  let factor = 1;
  for (let y = purchaseYear; y < currentYear; y++) {
    factor *= 1 + getInflationRate(y) / 100;
  }
  return factor;
}

/**
 * Nominal getiriyi reel (enflasyondan arındırılmış) getiriye çevirir.
 * Fisher denklemi: Reel = ((1 + nominal) / (1 + enflasyon)) - 1
 */
export function nominalToReal(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/**
 * Bir varlığın reel K/Z yüzdesini hesaplar.
 * Alış fiyatını kümülatif enflasyona göre günceller,
 * gerçek alım gücü kaybını/kazancını hesaplar.
 */
export function realProfitLossPct(
  purchasePriceTRY: number,
  currentPriceTRY: number,
  purchaseYear: number,
): number {
  const currentYear = new Date().getFullYear();
  const cumInfl = cumulativeInflation(purchaseYear, currentYear);
  // Enflasyona göre güncellenmiş alış "eşdeğer" fiyatı
  const inflAdjustedCost = purchasePriceTRY * cumInfl;
  return ((currentPriceTRY - inflAdjustedCost) / inflAdjustedCost) * 100;
}
