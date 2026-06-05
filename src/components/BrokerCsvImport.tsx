import { useState, useRef } from 'react';
import { AssetEntry } from '../types/asset';
import { DEFAULT_ASSET_DEFINITIONS } from '../services/priceService';
import { addEntry } from '../utils/storage';

/** Desteklenen broker formatları */
const BROKER_TEMPLATES = [
  {
    id: 'garanti',
    name: 'Garanti BBVA Yatırım',
    icon: '🟡',
    hint: 'TEFAS / Garanti yatırım işlem geçmişi CSV',
    columns: { symbol: 'Hisse', quantity: 'Adet', price: 'Ortalama Maliyet', date: 'İşlem Tarihi', type: 'İşlem Tipi' },
    buyKeyword: 'ALIŞ',
    dateFormat: 'dd.MM.yyyy',
  },
  {
    id: 'yapikredi',
    name: 'Yapı Kredi Yatırım',
    icon: '🔵',
    hint: 'Yapı Kredi e-yatirim işlem CSV',
    columns: { symbol: 'Sembol', quantity: 'Miktar', price: 'Fiyat', date: 'Tarih', type: 'İşlem' },
    buyKeyword: 'AL',
    dateFormat: 'dd.MM.yyyy',
  },
  {
    id: 'midas',
    name: 'Midas',
    icon: '🟠',
    hint: 'Midas işlem geçmişi CSV (USD hisseler)',
    columns: { symbol: 'Sembol', quantity: 'Adet', price: 'Fiyat (USD)', date: 'Tarih', type: 'Tip' },
    buyKeyword: 'buy',
    dateFormat: 'yyyy-MM-dd',
  },
  {
    id: 'binance',
    name: 'Binance',
    icon: '🟡',
    hint: 'Binance spot işlem geçmişi CSV',
    columns: { symbol: 'Pair', quantity: 'Executed', price: 'Price', date: 'Date(UTC)', type: 'Side' },
    buyKeyword: 'BUY',
    dateFormat: 'yyyy-MM-dd HH:mm:ss',
  },
  {
    id: 'generic',
    name: 'Genel Format (Manuel Eşleme)',
    icon: '📋',
    hint: 'Herhangi bir CSV — sütunları kendiniz eşleyebilirsiniz',
    columns: { symbol: '', quantity: '', price: '', date: '', type: '' },
    buyKeyword: '',
    dateFormat: '',
  },
];

function parseDate(str: string): string {
  if (!str) return new Date().toISOString();
  // dd.MM.yyyy
  const m1 = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m1) return new Date(`${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`).toISOString();
  // yyyy-MM-dd
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return new Date(str).toISOString();
  return new Date().toISOString();
}

function parseNum(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
}

function findAssetId(symbol: string): string | null {
  const clean = symbol.toUpperCase().replace('.IS', '').trim();
  const found = DEFAULT_ASSET_DEFINITIONS.find(
    a => a.symbol.replace('.IS','').toUpperCase() === clean || a.id.toUpperCase() === clean
  );
  return found?.id ?? null;
}

interface ParseResult {
  matched: AssetEntry[];
  skipped: Array<{ row: string; reason: string }>;
}

function parseCSV(
  text: string,
  colMap: { symbol: string; quantity: string; price: string; date: string; type: string },
  buyKeyword: string,
  broker: string,
  usdRate: number,
  isUSD: boolean,
): ParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { matched: [], skipped: [] };

  const headers = lines[0].split(/[;,\t]/).map(h => h.replace(/"/g, '').trim());

  const idx = (col: string) => {
    if (!col) return -1;
    const i = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
    return i;
  };

  const iSym  = idx(colMap.symbol);
  const iQty  = idx(colMap.quantity);
  const iPrc  = idx(colMap.price);
  const iDate = idx(colMap.date);
  const iType = idx(colMap.type);

  const matched: AssetEntry[] = [];
  const skipped: Array<{ row: string; reason: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cells = raw.split(/[;,\t]/).map(c => c.replace(/"/g, '').trim());

    const typeVal = iType >= 0 ? cells[iType] ?? '' : '';
    if (buyKeyword && !typeVal.toUpperCase().includes(buyKeyword.toUpperCase())) {
      skipped.push({ row: raw.slice(0, 80), reason: 'Alış işlemi değil (satış/diğer)' });
      continue;
    }

    const symbolRaw = iSym >= 0 ? cells[iSym] ?? '' : '';
    const assetId = findAssetId(symbolRaw.split('/')[0]);
    if (!assetId) {
      skipped.push({ row: raw.slice(0, 80), reason: `"${symbolRaw}" desteklenen varlıklar listesinde bulunamadı` });
      continue;
    }

    const qty   = parseNum(iQty  >= 0 ? cells[iQty]  : '');
    const price = parseNum(iPrc  >= 0 ? cells[iPrc]  : '');
    const date  = iDate >= 0 ? parseDate(cells[iDate]) : new Date().toISOString();

    if (qty <= 0 || price <= 0) {
      skipped.push({ row: raw.slice(0, 80), reason: 'Adet veya fiyat geçersiz' });
      continue;
    }

    const priceTRY = isUSD ? price * usdRate : price;

    const entry: AssetEntry = {
      id: `csv_${Date.now()}_${i}`,
      assetId,
      purchaseDate: date,
      quantity: qty,
      quantityUnit: 'adet',
      purchasePriceTRY: priceTRY,
      purchasePriceRaw: price,
      purchaseCurrency: isUSD ? 'USD' : 'TRY',
      broker,
      createdAt: new Date().toISOString(),
    };
    matched.push(entry);
  }

  return { matched, skipped };
}

// ── Bileşen ───────────────────────────────────────────────────────────────────
interface Props {
  usdRate: number;
  onImported: (entries: AssetEntry[]) => void;
}

export function BrokerCsvImport({ usdRate, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(BROKER_TEMPLATES[0]);
  const [csvText, setCsvText] = useState('');
  const [isUSD, setIsUSD] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [colMap, setColMap] = useState<typeof BROKER_TEMPLATES[0]['columns']>(BROKER_TEMPLATES[0].columns);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleBrokerChange(id: string) {
    const b = BROKER_TEMPLATES.find(t => t.id === id) ?? BROKER_TEMPLATES[0];
    setSelectedBroker(b);
    setColMap(b.columns);
    setIsUSD(id === 'midas' || id === 'binance');
    setResult(null);
    setStep('upload');
    setCsvText('');
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCsvText(ev.target?.result as string ?? '');
      setResult(null);
      setStep('upload');
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function handleParse() {
    if (!csvText.trim()) return;
    const r = parseCSV(csvText, colMap, selectedBroker.buyKeyword, selectedBroker.name, usdRate, isUSD);
    setResult(r);
    setStep('preview');
  }

  function handleConfirm() {
    if (!result) return;
    result.matched.forEach(e => addEntry(e));
    onImported(result.matched);
    setOpen(false);
    setStep('upload');
    setCsvText('');
    setResult(null);
  }

  if (!open) {
    return (
      <button
        id="broker-csv-import-btn"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'linear-gradient(135deg, rgba(79,142,247,0.15), rgba(139,92,246,0.1))',
          border: '1px solid rgba(79,142,247,0.35)', borderRadius: '10px',
          color: '#93c5fd', padding: '0.55rem 1.1rem',
          fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
        onMouseLeave={e => (e.currentTarget.style.filter = '')}
      >
        📥 Broker CSV Aktar
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: '18px', padding: '1.75rem', maxWidth: '640px', width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.2s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>📥 Broker CSV Aktarımı</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Aracı kurum işlem geçmişini otomatik içe aktar
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>×</button>
        </div>

        {step === 'upload' && (
          <>
            {/* Broker Seçimi */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Aracı Kurum</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {BROKER_TEMPLATES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleBrokerChange(b.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.4rem 0.85rem', borderRadius: '8px',
                      border: selectedBroker.id === b.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedBroker.id === b.id ? 'rgba(79,142,247,0.15)' : 'var(--surface)',
                      color: selectedBroker.id === b.id ? '#93c5fd' : 'var(--text-muted)',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {b.icon} {b.name}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                💡 {selectedBroker.hint}
              </div>
            </div>

            {/* Para Birimi */}
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fiyat Para Birimi:</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.83rem' }}>
                <input type="radio" name="cur" checked={!isUSD} onChange={() => setIsUSD(false)} /> ₺ TRY
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.83rem' }}>
                <input type="radio" name="cur" checked={isUSD} onChange={() => setIsUSD(true)} /> $ USD
              </label>
              {isUSD && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  (1 USD = {usdRate.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺)
                </span>
              )}
            </div>

            {/* Genel format için kolon eşleme */}
            {selectedBroker.id === 'generic' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>📋 Sütun İsimleri (CSV başlıklarıyla aynı olmalı)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {(['symbol','quantity','price','date','type'] as const).map(key => (
                    <div key={key}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase' }}>
                        {{ symbol: 'Sembol', quantity: 'Adet', price: 'Fiyat', date: 'Tarih', type: 'İşlem Tipi' }[key]}
                      </div>
                      <input
                        value={colMap[key]}
                        onChange={e => setColMap(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={key}
                        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: '0.8rem', fontFamily: 'inherit' }}
                      />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase' }}>Alış Anahtar Kelimesi</div>
                    <input
                      value={selectedBroker.buyKeyword}
                      onChange={e => setSelectedBroker(prev => ({ ...prev, buyKeyword: e.target.value }))}
                      placeholder="örn: ALIŞ, BUY"
                      style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: '0.8rem', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dosya Yükleme */}
            <div
              style={{
                border: '2px dashed rgba(79,142,247,0.35)', borderRadius: '14px',
                padding: '2rem', textAlign: 'center', cursor: 'pointer',
                background: 'rgba(79,142,247,0.04)', marginBottom: '1rem',
                transition: 'all 0.2s',
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setCsvText(ev.target?.result as string ?? '');
                reader.readAsText(file, 'utf-8');
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>
                {csvText ? '✅ Dosya yüklendi' : 'CSV dosyasını buraya sürükle veya tıkla'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {csvText
                  ? `${csvText.split('\n').length - 1} satır okundu`
                  : '.csv / .txt formatı desteklenir'
                }
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            {/* Ya da manuel yapıştır */}
            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                📋 Ya da CSV metnini manuel yapıştır
              </summary>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Hisse;Adet;Fiyat;Tarih;İşlem&#10;THYAO;100;230,5;20.05.2025;ALIŞ"
                rows={5}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'monospace', resize: 'vertical' }}
              />
            </details>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '0.88rem', cursor: 'pointer' }}>
                İptal
              </button>
              <button
                onClick={handleParse}
                disabled={!csvText.trim()}
                style={{
                  flex: 2, padding: '0.7rem', borderRadius: '10px', border: 'none',
                  background: csvText.trim() ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--surface)',
                  color: csvText.trim() ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: csvText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                🔍 Analiz Et
              </button>
            </div>
          </>
        )}

        {step === 'preview' && result && (
          <>
            {/* Özet */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(16,217,130,0.1)', border: '1px solid rgba(16,217,130,0.3)', borderRadius: '10px', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10d982' }}>{result.matched.length}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>İşlem eşleşti</div>
              </div>
              <div style={{ background: 'rgba(245,73,90,0.08)', border: '1px solid rgba(245,73,90,0.25)', borderRadius: '10px', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f5495a' }}>{result.skipped.length}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Satır atlandı</div>
              </div>
            </div>

            {/* Eşleşen işlemler */}
            {result.matched.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10d982', marginBottom: '0.4rem' }}>✅ Aktarılacak İşlemler</div>
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {result.matched.map((e, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.7rem', background: 'var(--surface)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600 }}>{e.assetId}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{e.quantity} adet</span>
                      <span style={{ color: '#93c5fd', fontWeight: 700 }}>
                        {e.purchasePriceTRY.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {new Date(e.purchaseDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Atlanan satırlar */}
            {result.skipped.length > 0 && (
              <details style={{ marginBottom: '1rem' }}>
                <summary style={{ fontSize: '0.78rem', color: '#f5495a', cursor: 'pointer' }}>
                  ⚠️ {result.skipped.length} satır atlandı (tıkla için detayları gör)
                </summary>
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {result.skipped.map((s, i) => (
                    <div key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.3rem 0.5rem', background: 'rgba(245,73,90,0.05)', borderRadius: '6px' }}>
                      <span style={{ color: '#fda4af' }}>{s.reason}</span>
                      {' → '}<code style={{ opacity: 0.6 }}>{s.row}</code>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setStep('upload')} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '0.88rem', cursor: 'pointer' }}>
                ← Geri
              </button>
              <button
                onClick={handleConfirm}
                disabled={result.matched.length === 0}
                style={{
                  flex: 2, padding: '0.7rem', borderRadius: '10px', border: 'none',
                  background: result.matched.length > 0 ? 'linear-gradient(135deg, #10d982, #059669)' : 'var(--surface)',
                  color: result.matched.length > 0 ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: result.matched.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                ✅ {result.matched.length} İşlemi Portföye Ekle
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
