import { useMemo } from 'react';
import { PortfolioRow } from '../types/asset';
import { realProfitLossPct, cumulativeInflation, TUIK_INFLATION } from '../utils/inflation';
import { fmtPct } from '../utils/format';

interface RealReturnProps {
  rows: PortfolioRow[];
}

export function RealReturnSection({ rows }: RealReturnProps) {
  const currentYear = new Date().getFullYear();

  const enriched = useMemo(() => {
    return rows
      .filter(r => r.currentPriceTRY > 0 && r.totalCostTRY > 0)
      .map(row => {
        const partialYear = row.purchaseDatePartial?.year;
        const isoYear = row.purchaseDate ? new Date(row.purchaseDate).getFullYear() : null;
        const purchaseYear = partialYear ?? isoYear ?? currentYear;

        const cumInfl = cumulativeInflation(purchaseYear, currentYear);
        const nominalPct = row.profitLossPct;
        const realPct = realProfitLossPct(row.purchasePriceTRY, row.currentPriceTRY, purchaseYear);
        const inflationImpact = nominalPct - realPct;

        return { row, purchaseYear, cumInfl, nominalPct, realPct, inflationImpact };
      })
      .sort((a, b) => a.realPct - b.realPct);
  }, [rows, currentYear]);

  const totalNominalPct = useMemo(() => {
    const totalCost  = rows.reduce((s, r) => s + r.totalCostTRY, 0);
    const totalValue = rows.reduce((s, r) => s + r.currentValueTRY, 0);
    return totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  }, [rows]);

  // Portföy ortalama gerçek enflasyon (ağırlıklı maliyet bazlı)
  const avgCumInflation = useMemo(() => {
    if (enriched.length === 0) return 1;
    const totalCost = enriched.reduce((s, e) => s + e.row.totalCostTRY, 0);
    return enriched.reduce((s, e) => s + e.cumInfl * (e.row.totalCostTRY / totalCost), 0);
  }, [enriched]);

  const totalRealPct = ((1 + totalNominalPct / 100) / avgCumInflation - 1) * 100;
  const infErosion  = totalNominalPct - totalRealPct;

  if (rows.length === 0) return null;

  return (
    <div className="real-return-section">
      <div className="rr-header">
        <h3 className="rr-title">📉 Enflasyondan Arındırılmış Gerçek Getiri</h3>
        <p className="rr-subtitle">
          Kaynak: TÜİK TÜFE verileri. Manşet kâr yanılgısını gör — paranın alım gücü ne kadar değişti?
        </p>
      </div>

      {/* Özet Kartları */}
      <div className="rr-summary-cards">
        <div className="rr-card">
          <span className="rr-card-label">Manşet (Nominal) Getiri</span>
          <span className={`rr-card-value ${totalNominalPct >= 0 ? 'profit' : 'loss'}`}>
            {fmtPct(totalNominalPct)}
          </span>
          <span className="rr-card-hint">Fiyat artışı × maliyet</span>
        </div>
        <div className="rr-card rr-card-main">
          <span className="rr-card-label">Gerçek (Reel) Getiri</span>
          <span className={`rr-card-value ${totalRealPct >= 0 ? 'profit' : 'loss'}`}>
            {fmtPct(totalRealPct)}
          </span>
          <span className="rr-card-hint">Enflasyon düşüldükten sonra</span>
        </div>
        <div className="rr-card rr-card-warn">
          <span className="rr-card-label">Enflasyon Etkisi (Çalınan Getiri)</span>
          <span className="rr-card-value rr-val-warn">
            {infErosion > 0 ? '-' : '+'}{Math.abs(infErosion).toFixed(2)}%
          </span>
          <span className="rr-card-hint">Ort. kümülatif enflasyon: ×{avgCumInflation.toFixed(2)}</span>
        </div>
      </div>

      {/* Varlık Bazlı Tablo */}
      <div className="rr-table-wrap">
        <table className="asset-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Varlık</th>
              <th>Alış Yılı</th>
              <th>Birikimli Enflasyon</th>
              <th>Nominal K/Z %</th>
              <th>Reel K/Z %</th>
              <th>Enflasyon Etkisi</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map(({ row, purchaseYear, cumInfl, nominalPct, realPct, inflationImpact }) => (
              <tr key={row.id} className="asset-row">
                <td className="asset-name-cell">
                  <span className="asset-icon-sm">{row.assetDef.icon}</span>
                  <strong>{row.assetDef.name}</strong>
                  <span className="asset-symbol" style={{ marginLeft: '0.4rem' }}>{row.assetDef.symbol}</span>
                </td>
                <td className="align-right">{purchaseYear}</td>
                <td className="align-right">×{cumInfl.toFixed(2)}</td>
                <td className={`align-right ${nominalPct >= 0 ? 'profit' : 'loss'}`}>
                  {fmtPct(nominalPct)}
                </td>
                <td className={`align-right ${realPct >= 0 ? 'profit' : 'loss'}`} style={{ fontWeight: 700 }}>
                  {fmtPct(realPct)}
                </td>
                <td className="align-right rr-impact">
                  {inflationImpact > 0 ? '-' : '+'}{Math.abs(inflationImpact).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TÜİK Referans */}
      <div className="rr-source-bar">
        <span>📊 TÜİK Yıllık TÜFE Referansı:</span>
        <div className="rr-infl-list">
          {Object.entries(TUIK_INFLATION).map(([year, pct]) => (
            <span key={year} className="rr-infl-badge">
              {year}: <strong>%{pct}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
