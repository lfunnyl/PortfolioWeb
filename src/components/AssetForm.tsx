import React, { useState, useEffect } from 'react';
import { getAssetDefinitions } from '../services/priceService';
import { fetchHistoricalPrice } from '../services/historicalPriceService';
import { AssetEntry, Currency, PartialDate, QuantityUnit, AssetDefinition } from '../types/asset';
import { addEntry, updateEntry, addCustomAsset, removeCustomAsset } from '../utils/storage';
import { searchYahooFinance } from '../services/searchService';
import { FormattedNumberInput } from './FormattedNumberInput';

interface AssetFormProps {
  onEntryAdded: (entry: AssetEntry) => void;
  onEntryUpdated?: (entry: AssetEntry) => void;
  editEntry?: AssetEntry | null;
  onClose?: () => void;
  forceOpen?: boolean;
}

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'TRY', label: 'Türk Lirası',    symbol: '₺' },
  { value: 'USD', label: 'ABD Doları',      symbol: '$' },
  { value: 'EUR', label: 'Euro',            symbol: '€' },
  { value: 'GBP', label: 'Sterlin',         symbol: '£' },
];

const METAL_UNITS: { value: QuantityUnit; label: string }[] = [
  { value: 'gram',    label: 'Gram (g)' },
  { value: 'kg',      label: 'Kilogram (kg)' },
  { value: 'troy_oz', label: 'Troy Ons (oz t)' },
];

// ─── Aracı Kurum Listesi ─────────────────────────────────────
const BROKER_LIST: { group: string; items: string[] }[] = [
  {
    group: 'Kripto Borsaları',
    items: ['Binance', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'KuCoin', 'Gate.io', 'Bitget', 'MEXC', 'BtcTurk', 'Paribu', 'Icrypex', 'Bitfinex'],
  },
  {
    group: 'Türkiye Aracı Kurumları',
    items: ['Garanti BBVA Yatırım', 'AK Yatırım', 'Yapı Kredi Yatırım', 'Deniz Yatırım', 'Midas', 'Gedik Yatırım', 'Ata Yatırım', 'Tacirler', 'Ziraat Yatırım', 'Halk Yatırım', 'QNB Finansinvest', 'TEB Yatırım'],
  },
  {
    group: 'Uluslararası Aracı Kurumlar',
    items: ['Interactive Brokers (IBKR)', 'eToro', 'Degiro', 'Revolut', 'Trading 212', 'Saxo Bank', 'Charles Schwab', 'Fidelity', 'Vanguard'],
  },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function partialToIso(p: PartialDate): string {
  if (!p.year) return '';
  const y = p.year;
  const m = p.month ?? 1;
  const d = p.day   ?? 1;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isoToPartial(iso: string): PartialDate {
  if (!iso) return {};
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function toGram(qty: number, unit: QuantityUnit): number {
  if (unit === 'kg')      return qty * 1000;
  if (unit === 'troy_oz') return qty * 31.1035;
  return qty;
}

// ─── BrokerCombo: Seç veya kendin yaz ────────────────────────
function BrokerCombo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const CUSTOM_VAL = '__custom__';
  // Mevcut value listede mi?
  const allItems = BROKER_LIST.flatMap(g => g.items);
  const isCustom = value !== '' && !allItems.includes(value);
  const [showCustom, setShowCustom] = React.useState(isCustom);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === CUSTOM_VAL) {
      setShowCustom(true);
      onChange('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <select value={showCustom ? CUSTOM_VAL : (value || '')} onChange={handleSelect}>
        <option value="">— Seçiniz —</option>
        {BROKER_LIST.map(group => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_VAL}>✏️ Diğer — kendiniz yazın</option>
      </select>
      {showCustom && (
        <input
          type="text"
          placeholder="Kurum adını yazın..."
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
          style={{ marginTop: 2 }}
        />
      )}
    </div>
  );
}

type CategoryFilter = 'all' | 'crypto' | 'metal' | 'forex' | 'stock_tr' | 'stock_us';


const CATEGORY_OPTIONS: { value: CategoryFilter; label: string; icon: string }[] = [
  { value: 'all',      label: 'Tümü',            icon: '🌐' },
  { value: 'crypto',   label: 'Kripto Paralar',   icon: '💰' },
  { value: 'metal',    label: 'Değerli Metaller', icon: '🥇' },
  { value: 'forex',    label: 'Döviz',            icon: '💵' },
  { value: 'stock_tr', label: 'BIST Hisseleri',   icon: '🇹🇷' },
  { value: 'stock_us', label: 'ABD Hisseleri',    icon: '🇺🇸' },
];

export function AssetForm({ onEntryAdded, onEntryUpdated, editEntry, onClose, forceOpen }: AssetFormProps) {
  const [open, setOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [assetId,      setAssetId]      = useState(getAssetDefinitions()[0].id);
  const [year,         setYear]         = useState('');
  const [month,        setMonth]        = useState('');
  const [day,          setDay]          = useState('');
  const [quantity,     setQuantity]     = useState('');
  const [totalAmount,  setTotalAmount]  = useState('');
  const [inputMode,    setInputMode]    = useState<'qty' | 'total'>('qty');

  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('gram');
  const [priceRaw,     setPriceRaw]     = useState('');
  const [feeRaw,       setFeeRaw]       = useState('');
  const [currency,     setCurrency]     = useState<Currency>('TRY');
  
  const [customName,   setCustomName]   = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  
  const [note,         setNote]         = useState('');
  const [broker,       setBroker]       = useState('');
  const [portfolioGroup, setPortfolioGroup] = useState('');
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const isEditMode = !!editEntry;

  useEffect(() => {
    if (editEntry) {
      setAssetId(editEntry.assetId);
      const partial = editEntry.purchaseDatePartial ?? isoToPartial(editEntry.purchaseDate);
      setYear( partial.year  ? String(partial.year)  : '');
      setMonth(partial.month ? String(partial.month) : '');
      setDay(  partial.day   ? String(partial.day)   : '');
      setQuantity(String(editEntry.quantity));
      setQuantityUnit((editEntry.quantityUnit as QuantityUnit) ?? 'gram');
      setPriceRaw(String(editEntry.purchasePriceRaw ?? editEntry.purchasePriceTRY));
      setFeeRaw(editEntry.feeRaw ? String(editEntry.feeRaw) : '');
      setCurrency((editEntry.purchaseCurrency as Currency) ?? 'TRY');
      setNote(editEntry.note ?? '');
      setBroker(editEntry.broker ?? '');
      setPortfolioGroup(editEntry.portfolioGroup ?? '');
      setOpen(true);
    }
  }, [editEntry]);

  const [defs, setDefs] = useState<AssetDefinition[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open || forceOpen) {
      setDefs(getAssetDefinitions());
      setConfirmDeleteId(null);
    }
  }, [open, forceOpen]);

  // Kategori filtresine göre varlıkları filtrele
  const filteredDefs = categoryFilter === 'all' ? defs : defs.filter(a => a.category === categoryFilter);

  function handleCategoryChange(cat: CategoryFilter) {
    setCategoryFilter(cat);
    // Seçili varlık yeni kategoride değilse, ilk uygun varlığa geç
    const filtered = cat === 'all' ? defs : defs.filter(a => a.category === cat);
    if (filtered.length > 0 && !filtered.find(a => a.id === assetId)) {
      setAssetId(filtered[0].id);
    }
  }
  const selectedDef = assetId === '_custom_' ? undefined : defs.find((a) => a.id === assetId);
  const isMetal     = selectedDef?.category === 'metal';

  function validate() {
    const e: Record<string, string> = {};
    if (assetId === '_custom_') {
      if (!customName.trim()) e.customName = 'Hisse adı gerekli';
      if (!customSymbol.trim()) e.customSymbol = 'Sembol/Kod gerekli';
    }

    if (inputMode === 'qty') {
      if (!quantity || Number(quantity) <= 0) e.qty   = 'Geçerli bir miktar girin';
    } else {
      if (!totalAmount || Number(totalAmount) <= 0) e.totalAmount = 'Geçerli bir toplam tutar girin';
    }

    if (!priceRaw || Number(priceRaw) <= 0) e.price = 'Geçerli bir fiyat girin';
    if (feeRaw && Number(feeRaw) < 0) e.fee = 'Komisyon negatif olamaz';

    const y = year  ? Number(year)  : null;
    const m = month ? Number(month) : null;
    const d = day   ? Number(day)   : null;

    if (y !== null && (y < 1900 || y > 2100)) e.year  = 'Geçerli bir yıl girin (1900-2100)';
    if (m !== null) {
      if (!year)              e.month = 'Ay girmek için önce yıl gerekli';
      else if (m < 1 || m > 12) e.month = '1-12 arası bir ay girin';
    }
    if (d !== null) {
      if (!month)             e.day = 'Gün girmek için önce ay gerekli';
      else if (d < 1 || d > 31) e.day = '1-31 arası bir gün girin';
    }
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const partial: PartialDate = {
      year:  year  ? Number(year)  : undefined,
      month: month ? Number(month) : undefined,
      day:   day   ? Number(day)   : undefined,
    };
    const isoDate = partialToIso(partial);

    let finalAssetId = assetId;

    if (assetId === '_custom_') {
      const isTurk = customSymbol.trim().toUpperCase().endsWith('.IS');
      const newDef: AssetDefinition = {
        id: 'cust_' + Date.now(),
        name: customName.trim(),
        symbol: customSymbol.trim().toUpperCase(),
        icon: isTurk ? '🇹🇷' : '🌐',
        category: isTurk ? 'stock_tr' : 'stock_us',
        stockKey: customSymbol.trim().toUpperCase(),
      };
      addCustomAsset(newDef);
      finalAssetId = newDef.id;
    }

    const rawPrice = Number(priceRaw);
    const standardizedFee = feeRaw ? Number(feeRaw) : 0;

    let rawQty = 0;
    if (inputMode === 'qty') {
      rawQty = Number(quantity);
    } else {
      rawQty = Number(totalAmount) / rawPrice;
    }

    const stdQty   = isMetal ? toGram(rawQty, quantityUnit) : rawQty;
    const priceTRY = rawPrice;

    if (isEditMode && editEntry) {
      const updated: AssetEntry = {
        ...editEntry,
        assetId:             finalAssetId,
        purchaseDate:        isoDate,
        purchaseDatePartial: partial,
        quantity:            stdQty,
        quantityUnit:        isMetal ? quantityUnit : 'adet',
        purchasePriceTRY:    priceTRY,
        purchasePriceRaw:    rawPrice,
        purchaseCurrency:    currency,
        feeRaw:              standardizedFee > 0 ? standardizedFee : undefined,
        note:                note.trim() || undefined,
        broker:              broker.trim() || undefined,
        portfolioGroup:      portfolioGroup || undefined,
      };
      updateEntry(editEntry.id, updated);
      onEntryUpdated?.(updated);
    } else {
      const entry: AssetEntry = {
        id:                  generateId(),
        assetId:             finalAssetId,
        purchaseDate:        isoDate,
        purchaseDatePartial: partial,
        quantity:            stdQty,
        quantityUnit:        isMetal ? quantityUnit : 'adet',
        purchasePriceTRY:    priceTRY,
        purchasePriceRaw:    rawPrice,
        purchaseCurrency:    currency,
        feeRaw:              standardizedFee > 0 ? standardizedFee : undefined,
        note:                note.trim() || undefined,
        broker:              broker.trim() || undefined,
        portfolioGroup:      portfolioGroup || undefined,
        createdAt:           new Date().toISOString(),
      };
      addEntry(entry);
      onEntryAdded(entry);
    }

    resetForm();
    handleClose();
  }

  function resetForm() {
    setAssetId(getDefaultAssetId());
    setYear(''); setMonth(''); setDay('');
    setQuantity(''); setTotalAmount(''); setPriceRaw(''); setNote(''); setFeeRaw('');
    setCustomName(''); setCustomSymbol('');
    setCurrency('TRY'); setQuantityUnit('gram'); setInputMode('qty');
    setBroker(''); setPortfolioGroup('');
    setErrors({});
    setIsFetchingPrice(false);
  }

  async function handleAutoFetchPrice() {
    if (!selectedDef) return;
    setIsFetchingPrice(true);
    setErrors(prev => ({ ...prev, price: '' }));
    
    try {
      const p = await fetchHistoricalPrice(selectedDef, year, month, day);
      if (p && p > 0) {
        setPriceRaw(p.toFixed(4));
        if (selectedDef.category === 'stock_us') {
          setCurrency('USD');
        } else {
          setCurrency('TRY');
        }
      } else {
        setErrors(prev => ({...prev, price: 'Otomatik fiyat bulunamadı (Tarih çok eski olabilir). Lütfen manuel yazın.'}));
      }
    } catch (err) {
      setErrors(prev => ({...prev, price: 'Fiyat sunucusuna bağlanılamadı.'}));
    } finally {
      setIsFetchingPrice(false);
    }
  }

  async function handleSearchStocks() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchYahooFinance(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }

  function handleConfirmCustomDelete() {
    removeCustomAsset(assetId);
    const newDefs = getAssetDefinitions();
    setDefs(newDefs);
    setAssetId(newDefs[0]?.id || '');
    setConfirmDeleteId(null);
  }

  function getDefaultAssetId() {
    const list = getAssetDefinitions();
    return list.length > 0 ? list[0].id : '';
  }

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  const monthDisabled = !year;
  const dayDisabled   = !year || !month;

  const currSymbol = CURRENCIES.find((c) => c.value === currency)?.symbol ?? '₺';

  return (
    <div className="form-section">
      {!open && !forceOpen ? (
        <button className="btn-add" onClick={() => setOpen(true)}>
          + Varlık Ekle
        </button>
      ) : (
        <div className="glass-card form-card">
          <div className="form-header">
            <h2>{isEditMode ? '✏️ Varlığı Düzenle' : 'Yeni Varlık Ekle'}</h2>
            <button className="btn-close" onClick={handleClose}>✕</button>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Kategori Filtresi */}
            <div className="form-group">
              <label>Kategori</label>
              <div className="category-filter-bar">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`category-filter-btn ${categoryFilter === cat.value ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat.value)}
                    disabled={isEditMode}
                    title={cat.label}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Varlık Seçimi */}
            <div className="form-group">
              <label>Varlık</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={isEditMode} style={{ flex: 1 }}>
                  {categoryFilter === 'all' ? (
                    <>
                      <optgroup label="💰 Kripto Paralar">
                        {defs.filter(a => a.category === 'crypto').map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🥇 Değerli Metaller">
                        {defs.filter(a => a.category === 'metal').map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                        ))}
                      </optgroup>
                      <optgroup label="💵 Döviz">
                        {defs.filter(a => a.category === 'forex').map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🇹🇷 Hisse Senetleri (BIST)">
                        {defs.filter(a => a.category === 'stock_tr').map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🇺🇸 Hisse Senetleri (ABD)">
                        {defs.filter(a => a.category === 'stock_us').map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    filteredDefs.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                    ))
                  )}
                  <optgroup label="Diğer">
                    <option value="_custom_">✨ Farklı Bir Hisse Ekle (Manuel)</option>
                  </optgroup>
                </select>
                {assetId.startsWith('cust_') && !isEditMode && (
                  confirmDeleteId === assetId ? (
                    <div style={{display:'flex', gap:'4px'}}>
                       <button type="button" onClick={handleConfirmCustomDelete} className="btn-action" style={{ padding: '0.6rem 0.8rem', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Emin misin?</button>
                       <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn-action" style={{ padding: '0.6rem 0.8rem', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>İptal</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteId(assetId)} className="btn-action btn-delete" style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }} title="Özel varlığı listeden kalıcı sil">🗑️ Sil</button>
                  )
                )}
              </div>
              {isEditMode && <span className="form-hint">Düzenleme modunda varlık tipi değiştirilemez</span>}
            </div>


            {assetId === '_custom_' && (
              <div className="form-group custom-asset-box">
                <label>✨ Global Hisse Arama (BIST, NASDAQ, NYSE vb.)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Hisse adı veya sembolü ara (Örn: Apple, TSLA, ASELS)" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchStocks();
                      }
                    }}
                  />
                  <button type="button" onClick={handleSearchStocks} disabled={isSearching} className="btn-magic" style={{ padding: '0 1rem', background: 'var(--accent)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                    {isSearching ? '⏳' : '🔍 Ara'}
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
                    {searchResults.map((res: any, idx: number) => (
                      <div 
                        key={idx} 
                        style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => {
                          setCustomName(res.longname || res.shortname || res.symbol);
                          setCustomSymbol(res.symbol);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{res.longname || res.shortname}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.exchange} • {res.quoteType}</span>
                        </div>
                        <span style={{ background: 'var(--accent)22', color: 'var(--accent)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{res.symbol}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                   <div>
                     <input type="text" placeholder="Hisse Şirket Adı" value={customName} onChange={(e)=>setCustomName(e.target.value)} className={errors.customName ? 'input-error' : ''} />
                   </div>
                   <div>
                     <input type="text" placeholder="Sembol (DOAS.IS, AAPL vb.)" value={customSymbol} onChange={(e)=>setCustomSymbol(e.target.value)} className={errors.customSymbol ? 'input-error' : ''} />
                   </div>
                </div>
                {(errors.customName || errors.customSymbol) && <span className="form-error">Hisse adı ve sembolü boş bırakılamaz. Türk hisseleri için sonuna .IS ekleyiniz.</span>}
                <span className="form-hint">Eğer arama ile bulduysanız doğrudan kaydedebilirsiniz. Bu hisse sistemde kalıcı olarak saklanacaktır.</span>
              </div>
            )}


            <div className="form-group">
              <label>Alış Tarihi <span className="optional-tag">opsiyonel</span></label>
              <div className="date-partial-row">
                <div className="date-partial-field date-year-field">
                  <span className="date-field-label">Yıl</span>
                  <input
                    type="number" placeholder="2024"
                    min="1900" max="2100" value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      if (!e.target.value) { setMonth(''); setDay(''); }
                    }}
                    className={errors.year ? 'input-error' : ''}
                  />
                  {errors.year && <span className="form-error">{errors.year}</span>}
                </div>
                <div className="date-partial-field">
                  <span className={`date-field-label ${monthDisabled ? 'label-disabled' : ''}`}>Ay</span>
                  <input
                    type="number" placeholder="1-12"
                    min="1" max="12" value={month}
                    disabled={monthDisabled}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      if (!e.target.value) setDay('');
                    }}
                    className={errors.month ? 'input-error' : ''}
                  />
                  {errors.month && <span className="form-error">{errors.month}</span>}
                </div>
                <div className="date-partial-field">
                  <span className={`date-field-label ${dayDisabled ? 'label-disabled' : ''}`}>Gün</span>
                  <input
                    type="number" placeholder="1-31"
                    min="1" max="31" value={day}
                    disabled={dayDisabled}
                    onChange={(e) => setDay(e.target.value)}
                    className={errors.day ? 'input-error' : ''}
                  />
                  {errors.day && <span className="form-error">{errors.day}</span>}
                </div>
              </div>
              <span className="form-hint">
                {!year ? 'Yılı girerek başlayın — ay ve gün isteğe bağlı' :
                 !month ? 'Yalnızca yıl kaydedilecek — ay ve gün isteğe bağlı' :
                 !day   ? 'Yıl ve ay kaydedilecek — gün isteğe bağlı' :
                          'Tam tarih girildi'}
              </span>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Miktar Girişi
                {!isMetal && (
                  <div className="qty-toggle">
                    <button type="button" className={inputMode === 'qty' ? 'active' : ''} onClick={() => setInputMode('qty')}>Lot/Adet</button>
                    <button type="button" className={inputMode === 'total' ? 'active' : ''} onClick={() => setInputMode('total')}>Toplam Tutar</button>
                  </div>
                )}
              </label>
              
              {inputMode === 'qty' ? (
                <div className="qty-row">
                  <FormattedNumberInput
                    placeholder="Örn: 100"
                    value={quantity}
                    onChange={setQuantity}
                    className={errors.qty ? 'input-error' : ''}
                  />
                  {isMetal ? (
                    <select value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value as QuantityUnit)}>
                      {METAL_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="unit-badge">{selectedDef?.symbol ?? customSymbol}</span>
                  )}
                </div>
              ) : (
                <div className="qty-row">
                  <span className="unit-badge">{currSymbol}</span>
                  <FormattedNumberInput
                    placeholder="Örn: 25.000"
                    value={totalAmount}
                    onChange={setTotalAmount}
                    className={errors.totalAmount ? 'input-error' : ''}
                  />
                </div>
              )}
              {errors.qty && <span className="form-error">{errors.qty}</span>}
              {errors.totalAmount && <span className="form-error">{errors.totalAmount}</span>}
              {inputMode === 'total' && priceRaw && totalAmount && (
                <span className="form-hint">Eklenecek tahmini Lot sayısı: {(Number(totalAmount) / Number(priceRaw)).toFixed(4)}</span>
              )}
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Alış Fiyatı <span className="form-hint-inline">/ birim</span></span>
                {selectedDef && (
                  <button 
                    type="button" 
                    onClick={handleAutoFetchPrice} 
                    disabled={isFetchingPrice}
                    className={`btn-magic ${isFetchingPrice ? 'loading' : ''}`}
                    title="Seçilen tarihin geçmiş fiyatını internetten bul"
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {isFetchingPrice ? '⏳ Bulunuyor...' : '✨ Fiyatı İnternetten Bul'}
                  </button>
                )}
              </label>
              <div className="price-row">
                <select
                  className="currency-select"
                  value={currency}
                  disabled={isFetchingPrice}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.symbol} {c.value}</option>
                  ))}
                </select>
                <FormattedNumberInput
                  placeholder={`Örn: ${currency === 'TRY' ? '3.500' : '100'}`}
                  value={priceRaw}
                  onChange={setPriceRaw}
                  disabled={isFetchingPrice}
                  className={errors.price ? 'input-error' : ''}
                />
              </div>
              {errors.price && <span className="form-error">{errors.price}</span>}
              {currency !== 'TRY' && (
                <span className="form-hint">
                  {currSymbol} cinsinden kaydedildi — kar/zarar hesabı için güncel kur kullanılır
                </span>
              )}
            </div>

            {/* Komisyon Tutarı */}
            <div className="form-group">
              <label>Alım Komisyonu / Masrafı <span className="optional-tag">opsiyonel</span></label>
              <div className="price-row">
                <span className="unit-badge">{currSymbol}</span>
                <FormattedNumberInput
                  placeholder="Örn: 25,50"
                  value={feeRaw}
                  onChange={setFeeRaw}
                  className={errors.fee ? 'input-error' : ''}
                />
              </div>
              {errors.fee && <span className="form-error">{errors.fee}</span>}
            </div>

            {/* Not */}
            <div className="form-group">
              <label>Not <span className="optional-tag">opsiyonel</span></label>
              <input
                type="text" placeholder="Örn: Binance alımı"
                value={note} onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Aracı Kurum & Portföy Grubu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* BROKER — combo (liste + serbest metin) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Aracı Kurum <span className="optional-tag">opsiyonel</span></label>
                <BrokerCombo value={broker} onChange={setBroker} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Portföy Grubu <span className="optional-tag">opsiyonel</span></label>
                <select value={portfolioGroup} onChange={(e) => setPortfolioGroup(e.target.value)}>
                  <option value="">Seçiniz...</option>
                  <option value="Ana Portföy">📊 Ana Portföy</option>
                  <option value="Kripto">💰 Kripto</option>
                  <option value="Hisse">📈 Hisse</option>
                  <option value="Altın & Metal">🥇 Altın & Metal</option>
                  <option value="Döviz">💵 Döviz</option>
                  <option value="Emeklilik">🏖️ Emeklilik</option>
                  <option value="Kısa Vade">⚡ Kısa Vade</option>
                  <option value="Uzun Vade">🌱 Uzun Vade</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-submit">
              {isEditMode ? '💾 Güncelle' : '✅ Portföye Ekle'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
