import { useState, useEffect } from 'react';
import { DividendEntry } from '../types/asset';
import { AssetEntry } from '../types/asset';
import { addDividend } from '../utils/storage';
import { getAssetDefinitions } from '../services/priceService';
import { FormattedNumberInput } from './FormattedNumberInput';

interface DividendFormProps {
  entries: AssetEntry[];
  onDividendAdded: (d: DividendEntry) => void;
  usdRate?: number;
}

type DivCurrency = 'TRY' | 'USD';

function generateId() {
  return 'div_' + Math.random().toString(36).slice(2, 9) + Date.now();
}

export function DividendForm({ entries, onDividendAdded, usdRate = 1 }: DividendFormProps) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<DivCurrency>('TRY');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const defs = getAssetDefinitions();

  // entries değişince (örn: cloud pull sonrası) assetId'yi güncelle
  useEffect(() => {
    if (!assetId && entries.length > 0) {
      setAssetId(entries[0].assetId);
    }
  }, [entries, assetId]);

  // Benzersiz assetId'leri al (portföydeki varlıklar)
  const uniqueAssets = Array.from(new Set(entries.map(e => e.assetId)))
    .map(id => defs.find(d => d.id === id))
    .filter(Boolean);

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Geçerli bir tutar girin'); return; }
    if (!assetId) { setError('Portföyünüzden bir varlık seçin'); return; }
    setError('');

    const amountRaw = Number(amount);
    const amountTRY = currency === 'USD' ? amountRaw * usdRate : amountRaw;

    const div: DividendEntry = {
      id: generateId(),
      assetId,
      amountRaw,
      amountTRY,
      currency: currency as any,
      date,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addDividend(div);
    onDividendAdded(div);

    setAmount(''); setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="btn-add" onClick={() => setOpen(true)} style={{ marginBottom: '1rem' }}>
        + Temettü Ekle
      </button>
    );
  }

  return (
    <div className="glass-card form-card" style={{ marginBottom: '1rem' }}>
      <div className="form-header">
        <h2>💰 Temettü Geliri Ekle</h2>
        <button className="btn-close" onClick={() => setOpen(false)}>✕</button>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label>Hisse / Varlık</label>
          <select value={assetId} onChange={e => setAssetId(e.target.value)}>
            <option value="">— Varlık seçin —</option>
            {uniqueAssets.map(d => d && (
              <option key={d.id} value={d.id}>{d.icon} {d.name} ({d.symbol})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tutar</label>
          <div className="price-row">
            <select className="currency-select" value={currency} onChange={e => setCurrency(e.target.value as DivCurrency)}>
              <option value="TRY">₺ TRY</option>
              <option value="USD">$ USD</option>
            </select>
            <FormattedNumberInput
              placeholder="Örn: 1.250"
              value={amount}
              onChange={setAmount}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Tarih</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Not <span className="optional-tag">opsiyonel</span></label>
          <input type="text" placeholder="Örn: 2024 Yılı Temettüsü" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {error && <span className="form-error">{error}</span>}

        <button type="submit" className="btn-submit">✅ Temettüyü Kaydet</button>
      </form>
    </div>
  );
}
