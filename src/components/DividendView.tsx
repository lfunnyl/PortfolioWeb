import { DividendEntry } from '../types/asset';
import { removeDividend } from '../utils/storage';
import { getAssetDefinitions } from '../services/priceService';
import { fmtCurr, toDisplay } from '../utils/format';

interface DividendViewProps {
  dividends: DividendEntry[];
  onRemoved: (id: string) => void;
  displayCurrency: 'TRY' | 'USD';
  usdRate: number;
}

export function DividendView({ dividends, onRemoved, displayCurrency, usdRate }: DividendViewProps) {
  const defs = getAssetDefinitions();
  const total = dividends.reduce((s, d) => s + d.amountTRY, 0);
  // Bug fix #3: toDisplay fonksiyonu ile döviz dönüşümü düzgün yapılıyor
  const displayTotal = toDisplay(total, displayCurrency, usdRate);

  if (dividends.length === 0) {
    return (
      <div className="empty-state">
        <p>💰 Henüz temettü kaydı yok.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Toplam Temettü Geliri</span>
        <span style={{ fontWeight: 700, fontSize: '1.3rem', color: '#10b981' }}>
          {fmtCurr(displayTotal, displayCurrency)}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="asset-table">
          <thead>
            <tr>
              <th>Varlık</th>
              <th>Tarih</th>
              <th>Tutar</th>
              <th>Not</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...dividends].sort((a, b) => b.date.localeCompare(a.date)).map(div => {
              const def = defs.find(d => d.id === div.assetId);
              // Bug fix #3: toDisplay ile dönüşüm doğru yapılıyor
              const displayAmt = toDisplay(div.amountTRY, displayCurrency, usdRate);
              return (
                <tr key={div.id}>
                  <td>
                    <span style={{ marginRight: '0.4rem' }}>{def?.icon}</span>
                    {def?.name ?? div.assetId}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{div.date}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>
                    {fmtCurr(displayAmt, displayCurrency)}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{div.note ?? '—'}</td>
                  <td>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => { removeDividend(div.id); onRemoved(div.id); }}
                      title="Sil"
                    >🗑</button>
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
