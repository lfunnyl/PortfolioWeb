import { useState, useMemo } from 'react';
import { PortfolioRow } from '../types/asset';
import { fmtCurr, fmtPct, toDisplay } from '../utils/format';

interface TaxHarvestingProps {
  rows: PortfolioRow[];
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

export function TaxHarvestingSection({ rows, displayCurrency = 'TRY', usdRate = 1 }: TaxHarvestingProps) {
  const [taxRate, setTaxRate] = useState<string>('15');

  const C = displayCurrency as 'TRY' | 'USD';
  const conv = (n: number) => toDisplay(n, C, usdRate);

  const { losses, totalGain, totalLoss } = useMemo(() => {
    const validRows = rows.filter(r => r.currentPriceTRY > 0 && r.totalCostTRY > 0);
    const lossesArr: PortfolioRow[] = [];
    let tGain = 0;
    let tLoss = 0;

    for (const r of validRows) {
      if (r.profitLossTRY > 0) {
        tGain += r.profitLossTRY;
      } else if (r.profitLossTRY < 0) {
        lossesArr.push(r);
        tLoss += Math.abs(r.profitLossTRY);
      }
    }

    lossesArr.sort((a, b) => a.profitLossTRY - b.profitLossTRY); // En fazla kayıp olan en üstte (negatif sıralama)

    return { losses: lossesArr, totalGain: tGain, totalLoss: tLoss };
  }, [rows]);

  const taxRateNum = (Number(taxRate) || 0) / 100;
  const potentialTaxSavings = totalLoss * taxRateNum;
  const taxableGainBeforeHarvest = totalGain;
  
  const estimatedTaxBefore = taxableGainBeforeHarvest * taxRateNum;

  if (rows.length === 0) return null;

  return (
    <div className="tax-harvesting-section th-section">
      <div className="th-header-wrap">
        <div>
          <h3 className="th-title">🧠 Akıllı Vergi Hasadı (Tax-Loss Harvesting)</h3>
          <p className="th-subtitle">
            Portföyündeki zararları realize ederek, kâr üzerinden ödeyeceğin vergileri nasıl minimize edebileceğini keşfet.
          </p>
        </div>
        <div className="th-tax-input-wrap">
          <label className="th-tax-label">Vergi Oranı %:</label>
          <input 
            type="number" 
            value={taxRate} 
            onChange={e => setTaxRate(e.target.value)} 
            className="th-tax-input"
          />
        </div>
      </div>

      <div className="th-summary-grid">
        <div className="th-card">
          <span className="th-card-label">Gerçekleşmemiş Kâr</span>
          <span className="th-card-val profit">
            {fmtCurr(conv(totalGain), C)}
          </span>
          <span className="th-card-sub">Bu kâr satıldığında tahmini {fmtCurr(conv(estimatedTaxBefore), C)} vergi doğar.</span>
        </div>
        
        <div className="th-card">
          <span className="th-card-label">Gerçekleşmemiş Zarar</span>
          <span className="th-card-val loss">
            {fmtCurr(conv(-totalLoss), C)}
          </span>
          <span className="th-card-sub">Zarardaki varlıkların toplamı.</span>
        </div>

        <div className="th-card th-card-green">
          <span className="th-card-label th-card-label-green">Tahmini Vergi Tasarrufu</span>
          <span className="th-card-val th-card-val-green">
            {fmtCurr(conv(potentialTaxSavings), C)}
          </span>
          <span className="th-card-sub th-card-sub-green">Eğer tüm zararlar bugün realize edilirse.</span>
        </div>
      </div>

      <div className="th-candidates-wrap">
        <h4 className="th-candidates-title">✂️ Hasat Adayları (En Çok Zararda Olanlar)</h4>
        
        {losses.length === 0 ? (
          <div className="th-empty">
            Harika! Portföyünde zararda olan bir varlık bulunmuyor. Hasat edilecek bir zarar yok.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="asset-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Varlık</th>
                  <th className="align-right">Kayıp Yüzdesi</th>
                  <th className="align-right">Gerçekleşmemiş Zarar</th>
                  <th className="align-right">Sağlanacak Vergi Tasarrufu</th>
                </tr>
              </thead>
              <tbody>
                {losses.map(row => {
                  const savings = Math.abs(row.profitLossTRY) * taxRateNum;
                  return (
                    <tr key={row.id} className="asset-row">
                      <td className="asset-name-cell">
                        <span className="asset-icon-sm">{row.assetDef.icon}</span>
                        <strong>{row.assetDef.name}</strong>
                        <span className="asset-symbol" style={{ marginLeft: '0.4rem' }}>{row.assetDef.symbol}</span>
                      </td>
                      <td className="align-right loss">{fmtPct(row.profitLossPct)}</td>
                      <td className="align-right loss">{fmtCurr(conv(row.profitLossTRY), C)}</td>
                      <td className="align-right th-savings">{fmtCurr(conv(savings), C)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="th-info">
        <strong>BİLGİ:</strong> Vergi hesaplamaları ülkelere ve varlık türlerine (Hisse Senedi, Kripto, Yurtdışı vs.) göre farklılık gösterir. Verilmiş olan bu araç yasal bir beyan teşkil etmez, sadece kâr maksimizasyonu / vergi optimizasyonu için stratejik bir simülasyondur. Zarar satışı yaparken "Wash-Sale" (Hemen geri alma cezası) kurallarına dikkat ediniz.
      </div>
    </div>
  );
}
