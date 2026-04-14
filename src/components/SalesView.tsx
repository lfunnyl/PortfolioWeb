
import { SaleEntry, AssetDefinition } from '../types/asset';
import { removeSale } from '../utils/storage';
import { getAssetDefinitions } from '../services/priceService';

interface SalesViewProps {
  sales: SaleEntry[];
  onSaleRemoved: (id: string) => void;
  // asset.id -> alis fiyati TRY
  entryPrices: Record<string, number>;
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtCurr(n: number, curr = 'TRY') {
  return (curr === 'TRY' ? '₺' : '$') + n.toLocaleString(curr === 'TRY' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSaleDate(sale: SaleEntry): string {
  const p = sale.saleDatePartial;
  if (!p || (!p.day && !p.month && !p.year)) {
    return sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '—';
  }
  const parts: string[] = [];
  if (p.day)   parts.push(String(p.day).padStart(2, '0'));
  if (p.month) parts.push(String(p.month).padStart(2, '0'));
  if (p.year)  parts.push(String(p.year));
  return parts.join('/');
}

function formatSalePrice(sale: SaleEntry, displayCurrency: 'TRY' | 'USD' = 'TRY', usdRate: number = 1): string {
  const price = displayCurrency === 'USD' ? sale.salePriceTRY / usdRate : sale.salePriceTRY;
  return fmtCurr(price, displayCurrency);
}

export function SalesView({ sales, onSaleRemoved, entryPrices, displayCurrency = 'TRY', usdRate = 1 }: SalesViewProps) {
  if (sales.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📭</span>
        <p>Henüz satış kaydı bulunmuyor.</p>
      </div>
    );
  }

  function handleDelete(id: string) {
    removeSale(id);
    onSaleRemoved(id);
  }

  // Toplam İstatistikler
  const totalRevenueTRY = sales.reduce((s, x) => s + (x.saleQuantity * x.salePriceTRY), 0);
  let totalCostTRY    = 0;
  let totalFeeTRY     = 0;

  sales.forEach((x) => {
    const costPrice = entryPrices[x.assetEntryId] ?? 0;
    totalCostTRY += costPrice * x.saleQuantity;
    totalFeeTRY += x.feeTRY ?? 0;
  });

  const rawProfitLossTRY = totalRevenueTRY - totalCostTRY - totalFeeTRY;

  const totalRevenue = displayCurrency === 'USD' ? totalRevenueTRY / usdRate : totalRevenueTRY;
  const totalCost    = displayCurrency === 'USD' ? totalCostTRY / usdRate : totalCostTRY;
  const totalPnL     = displayCurrency === 'USD' ? rawProfitLossTRY / usdRate : rawProfitLossTRY;
  const isProfit     = totalPnL >= 0;

  return (
    <div className="sales-section">
      <div className="sales-summary glass-card">
        <div className="summary-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div className="summary-card">
            <span className="summary-label">Toplam Satış Geliri</span>
            <span className="summary-value highlight">{fmtCurr(totalRevenue, displayCurrency)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Maliyet Tutarı</span>
            <span className="summary-value" style={{color: 'var(--loss)'}}>-{fmtCurr(totalCost, displayCurrency)}</span>
          </div>
          <div className={`summary-card ${isProfit ? 'profit-card' : 'loss-card'}`}>
            <span className="summary-label">Realize Edilen Kâr/Zarar</span>
            <span className={`summary-value ${isProfit ? 'profit' : 'loss'}`}>
              {isProfit ? '+' : ''}{fmtCurr(totalPnL, displayCurrency)}
            </span>
          </div>
          <div className="glass-card summary-card">
            <span className="summary-label">Toplam Satış</span>
            <span className="summary-value secondary">{sales.length} kayıt</span>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="asset-table">
          <thead>
            <tr>
              <th>Varlık</th>
              <th>Satış Tarihi</th>
              <th>Miktar</th>
              <th>Alış Fiyatı</th>
              <th>Satış Fiyatı</th>
              <th>Toplam Gelir</th>
              <th>Kar / Zarar</th>
              <th>Not</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const assetDef: AssetDefinition | undefined = getAssetDefinitions().find((a) => a.id === sale.assetId);
              const buyPriceTRY = entryPrices[sale.assetEntryId] ?? 0;
              const feeTRY = sale.feeTRY ?? 0;
              
              const revenueTRY = sale.salePriceTRY * sale.saleQuantity;
              const costTRY    = buyPriceTRY * sale.saleQuantity;
              const pnlTRY     = revenueTRY - costTRY - feeTRY;
              
              const displayRevenue = displayCurrency === 'USD' ? revenueTRY / usdRate : revenueTRY;
              const displayPnL     = displayCurrency === 'USD' ? pnlTRY / usdRate : pnlTRY;
              const displayBuyPrice = displayCurrency === 'USD' ? buyPriceTRY / usdRate : buyPriceTRY;
              const isPProfit  = pnlTRY >= 0;

              return (
                <tr key={sale.id} className="asset-row">
                  <td>
                    <div className="asset-name-cell">
                      <span className="asset-icon">{assetDef?.icon ?? '?'}</span>
                      <div>
                        <span className="asset-name">{assetDef?.name ?? sale.assetId}</span>
                        <span className="asset-symbol">{assetDef?.symbol ?? ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{formatSaleDate(sale)}</td>
                  <td className="mono">{fmt(sale.saleQuantity, 4)}</td>
                  <td className="mono">{buyPriceTRY > 0 ? fmtCurr(displayBuyPrice, displayCurrency) : '—'}</td>
                  <td className="mono">{formatSalePrice(sale, displayCurrency, usdRate)}</td>
                  <td className="mono">{fmtCurr(displayRevenue, displayCurrency)}</td>
                  <td>
                    <div className={`pnl-cell ${isPProfit ? 'profit' : 'loss'}`}>
                      <span className="pnl-amount">{isPProfit ? '+' : ''}{fmtCurr(displayPnL, displayCurrency)}</span>
                    </div>
                  </td>
                  <td className="sale-note">{sale.note ?? '—'}</td>
                  <td>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(sale.id)}
                      title="Satışı sil"
                    >✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
