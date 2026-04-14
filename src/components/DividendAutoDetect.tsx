import { useState } from 'react';
import { AssetEntry, DividendEntry } from '../types/asset';
import { detectDividendsForEntries, DetectedDividend } from '../services/dividendService';
import { addDividend } from '../utils/storage';

interface DividendAutoDetectProps {
  entries: AssetEntry[];
  usdRate: number;
  existingDividends: DividendEntry[];
  onDividendsAdded: (divs: DividendEntry[]) => void;
}

function generateId() {
  return 'div_' + Math.random().toString(36).slice(2, 9) + Date.now();
}

export function DividendAutoDetect({ entries, usdRate, existingDividends, onDividendsAdded }: DividendAutoDetectProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [detected, setDetected] = useState<DetectedDividend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errMsg, setErrMsg] = useState('');

  async function handleDetect() {
    setStatus('loading');
    setDetected([]);
    setErrMsg('');
    try {
      const all = await detectDividendsForEntries(entries, usdRate);

      // Zaten kaydedilmiş olanları filtrele (assetId + date eşleşmesi)
      const existing = new Set(existingDividends.map(d => `${d.assetId}_${d.date}`));
      const fresh = all.filter(d => !existing.has(`${d.assetId}_${d.date}`));

      setDetected(fresh);
      setSelected(new Set(fresh.map((_, i) => String(i))));
      setStatus('done');
    } catch {
      setErrMsg('Temettü verisi alınırken hata oluştu. İnternet bağlantısını kontrol edin.');
      setStatus('error');
    }
  }

  function toggleSelect(idx: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function handleImport() {
    const toAdd = detected
      .filter((_, i) => selected.has(String(i)))
      .map(d => ({
        id: generateId(),
        assetId: d.assetId,
        amountRaw: d.totalAmount,
        amountTRY: d.totalAmountTRY,
        currency: d.currency as any,
        date: d.date,
        note: `Hisse başı ${d.amountPerShare.toFixed(4)} ${d.currency} × ${d.quantity.toFixed(4)} adet`,
        createdAt: new Date().toISOString(),
      } as DividendEntry));

    toAdd.forEach(addDividend);
    onDividendsAdded(toAdd);
    setDetected([]);
    setStatus('idle');
  }

  const stockEntries = entries.filter(e => {
    // sadece hisse tipi olanlar için göster
    return e.assetId;
  });
  const hasStocks = stockEntries.length > 0;

  return (
    <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>🔍 Otomatik Temettü Tespiti</h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Hisselerindeki temettü ödemelerini Yahoo Finance'ten otomatik çeker.
          </p>
        </div>
        <button
          onClick={handleDetect}
          disabled={status === 'loading' || !hasStocks}
          style={{
            padding: '0.4rem 0.9rem',
            background: status === 'loading' ? 'var(--bg-2)' : 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
        >
          {status === 'loading' ? '⏳ Tarıyor...' : '✨ Temettüleri Tara'}
        </button>
      </div>

      {!hasStocks && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Portföyünde hisse senedi bulunmadığından otomatik tarama yapılamaz.
        </p>
      )}

      {status === 'error' && (
        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ⚠️ {errMsg}
        </div>
      )}

      {status === 'done' && detected.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ✅ Yeni temettü bulunamadı. Zaten kaydettiklerinden farklı bir kayıt yok.
        </p>
      )}

      {status === 'done' && detected.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {detected.length} yeni temettü tespit edildi. Eklemek istediklerini seç:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
            {detected.map((d, i) => (
              <label
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: selected.has(String(i)) ? 'rgba(16,185,129,0.08)' : 'var(--bg-2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${selected.has(String(i)) ? '#10b98133' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(String(i))}
                  onChange={() => toggleSelect(String(i))}
                  style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '1.1rem' }}>{d.assetIcon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.assetName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {d.date} · {d.quantity.toFixed(2)} adet × {d.amountPerShare.toFixed(4)} {d.currency}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#10b981', fontWeight: 700 }}>
                    ₺{d.totalAmountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {d.currency !== 'TRY' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {d.currency === 'USD' ? '$' : ''}{d.totalAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: selected.size === 0 ? 'var(--bg-2)' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ✅ {selected.size} Temettüyü Ekle
            </button>
            <button
              onClick={() => { setDetected([]); setStatus('idle'); }}
              style={{ padding: '0.5rem 1rem', background: 'var(--bg-2)', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
