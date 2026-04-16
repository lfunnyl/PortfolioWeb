import React from 'react';
import { AssetEntry, QuantityUnit } from '../types/asset';
import { removeCustomAsset } from '../utils/storage';
import { getAssetDefinitions } from '../services/priceService';
import { CURRENCIES, METAL_UNITS, CATEGORY_OPTIONS } from '../constants/formConstants';
import { FormattedNumberInput } from './FormattedNumberInput';
import { BrokerCombo } from './form/BrokerCombo';
import { PartialDateInput } from './form/PartialDateInput';
import { CustomAssetSearch } from './form/CustomAssetSearch';
import { useAssetForm } from '../hooks/useAssetForm';

interface AssetFormProps {
  onEntryAdded: (entry: AssetEntry) => void;
  onEntryUpdated?: (entry: AssetEntry) => void;
  editEntry?: AssetEntry | null;
  onClose?: () => void;
  forceOpen?: boolean;
}

export function AssetForm({ onEntryAdded, onEntryUpdated, editEntry, onClose, forceOpen }: AssetFormProps) {
  const {
    open, setOpen, state, set, defs, setDefs,
    confirmDeleteId, setConfirmDeleteId,
    selectedDef, isMetal, filteredDefs,
    handleCategoryChange, handleSubmit, handleClose, handleAutoFetchPrice,
  } = useAssetForm(onEntryAdded, onEntryUpdated, editEntry, onClose);

  const isEditMode = !!editEntry;
  const currSymbol = CURRENCIES.find(c => c.value === state.currency)?.symbol ?? '₺';

  function handleConfirmCustomDelete() {
    removeCustomAsset(state.assetId);
    const newDefs = getAssetDefinitions();
    setDefs(newDefs);
    set({ assetId: newDefs[0]?.id || '' });
    setConfirmDeleteId(null);
  }

  return (
    <div className="form-section">
      {!open && !forceOpen ? (
        <button className="btn-add" onClick={() => setOpen(true)}>+ Varlık Ekle</button>
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
                {CATEGORY_OPTIONS.map(cat => (
                  <button key={cat.value} type="button" disabled={isEditMode}
                    className={`category-filter-btn ${state.categoryFilter === cat.value ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat.value)} title={cat.label}>
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
                <select value={state.assetId} onChange={e => set({ assetId: e.target.value })}
                  disabled={isEditMode} style={{ flex: 1 }}>
                  {state.categoryFilter === 'all' ? (
                    <>
                      {(['crypto','metal','forex','stock_tr','stock_us'] as const).map(cat => (
                        <optgroup key={cat} label={CATEGORY_OPTIONS.find(c => c.value === cat)?.icon + ' ' + CATEGORY_OPTIONS.find(c => c.value === cat)?.label}>
                          {defs.filter(a => a.category === cat).map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>
                          ))}
                        </optgroup>
                      ))}
                    </>
                  ) : (
                    filteredDefs.map(a => <option key={a.id} value={a.id}>{a.name} ({a.symbol}) {a.icon}</option>)
                  )}
                  <optgroup label="Diğer">
                    <option value="_custom_">✨ Farklı Bir Hisse Ekle (Manuel)</option>
                  </optgroup>
                </select>

                {state.assetId.startsWith('cust_') && !isEditMode && (
                  confirmDeleteId === state.assetId ? (
                    <div style={{ display:'flex', gap:'4px' }}>
                      <button type="button" onClick={handleConfirmCustomDelete} className="btn-action"
                        style={{ padding:'0.6rem 0.8rem', background:'#ef4444', color:'white', borderRadius:'4px', border:'none', cursor:'pointer', fontWeight:600 }}>
                        Emin misin?
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn-action"
                        style={{ padding:'0.6rem 0.8rem', background:'transparent', color:'var(--text)', border:'1px solid var(--border)', borderRadius:'4px', cursor:'pointer' }}>
                        İptal
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteId(state.assetId)} className="btn-action btn-delete"
                      style={{ padding:'0.6rem 0.8rem', background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:'4px', cursor:'pointer' }}
                      title="Özel varlığı listeden kalıcı sil">🗑️ Sil</button>
                  )
                )}
              </div>
              {isEditMode && <span className="form-hint">Düzenleme modunda varlık tipi değiştirilemez</span>}
            </div>

            {/* Özel Hisse Arama */}
            {state.assetId === '_custom_' && (
              <CustomAssetSearch
                customName={state.customName} customSymbol={state.customSymbol}
                onNameChange={v => set({ customName: v })} onSymbolChange={v => set({ customSymbol: v })}
                errors={state.errors}
              />
            )}

            {/* Tarih */}
            <PartialDateInput
              year={state.year} month={state.month} day={state.day}
              onYearChange={v => set({ year: v })} onMonthChange={v => set({ month: v })} onDayChange={v => set({ day: v })}
              errors={state.errors}
            />

            {/* Miktar */}
            <div className="form-group">
              <label style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                Miktar Girişi
                {!isMetal && (
                  <div className="qty-toggle">
                    <button type="button" className={state.inputMode === 'qty' ? 'active' : ''} onClick={() => set({ inputMode: 'qty' })}>Lot/Adet</button>
                    <button type="button" className={state.inputMode === 'total' ? 'active' : ''} onClick={() => set({ inputMode: 'total' })}>Toplam Tutar</button>
                  </div>
                )}
              </label>
              {state.inputMode === 'qty' ? (
                <div className="qty-row">
                  <FormattedNumberInput placeholder="Örn: 100" value={state.quantity} onChange={v => set({ quantity: v })} className={state.errors.qty ? 'input-error' : ''} />
                  {isMetal ? (
                    <select value={state.quantityUnit} onChange={e => set({ quantityUnit: e.target.value as QuantityUnit })}>
                      {METAL_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  ) : (
                    <span className="unit-badge">{selectedDef?.symbol ?? state.customSymbol}</span>
                  )}
                </div>
              ) : (
                <div className="qty-row">
                  <span className="unit-badge">{currSymbol}</span>
                  <FormattedNumberInput placeholder="Örn: 25.000" value={state.totalAmount} onChange={v => set({ totalAmount: v })} className={state.errors.totalAmount ? 'input-error' : ''} />
                </div>
              )}
              {state.errors.qty && <span className="form-error">{state.errors.qty}</span>}
              {state.errors.totalAmount && <span className="form-error">{state.errors.totalAmount}</span>}
              {state.inputMode === 'total' && state.priceRaw && state.totalAmount && (
                <span className="form-hint">Eklenecek tahmini Lot: {(Number(state.totalAmount) / Number(state.priceRaw)).toFixed(4)}</span>
              )}
            </div>

            {/* Alış Fiyatı */}
            <div className="form-group">
              <label style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>Alış Fiyatı <span className="form-hint-inline">/ birim</span></span>
                {selectedDef && (
                  <button type="button" onClick={handleAutoFetchPrice} disabled={state.isFetchingPrice}
                    className={`btn-magic ${state.isFetchingPrice ? 'loading' : ''}`}
                    style={{ fontSize:'0.8rem', padding:'0.2rem 0.5rem', background:'var(--accent)', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' }}>
                    {state.isFetchingPrice ? '⏳ Bulunuyor...' : '✨ Fiyatı İnternetten Bul'}
                  </button>
                )}
              </label>
              <div className="price-row">
                <select className="currency-select" value={state.currency} disabled={state.isFetchingPrice}
                  onChange={e => set({ currency: e.target.value as any })}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.symbol} {c.value}</option>)}
                </select>
                <FormattedNumberInput placeholder={`Örn: ${state.currency === 'TRY' ? '3.500' : '100'}`}
                  value={state.priceRaw} onChange={v => set({ priceRaw: v })} disabled={state.isFetchingPrice}
                  className={state.errors.price ? 'input-error' : ''} />
              </div>
              {state.errors.price && <span className="form-error">{state.errors.price}</span>}
            </div>

            {/* Komisyon */}
            <div className="form-group">
              <label>Alım Komisyonu / Masrafı <span className="optional-tag">opsiyonel</span></label>
              <div className="price-row">
                <span className="unit-badge">{currSymbol}</span>
                <FormattedNumberInput placeholder="Örn: 25,50" value={state.feeRaw} onChange={v => set({ feeRaw: v })} className={state.errors.fee ? 'input-error' : ''} />
              </div>
              {state.errors.fee && <span className="form-error">{state.errors.fee}</span>}
            </div>

            {/* Not */}
            <div className="form-group">
              <label>Not <span className="optional-tag">opsiyonel</span></label>
              <input type="text" placeholder="Örn: Binance alımı" value={state.note} onChange={e => set({ note: e.target.value })} />
            </div>

            {/* Aracı Kurum & Portföy Grubu */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Aracı Kurum <span className="optional-tag">opsiyonel</span></label>
                <BrokerCombo value={state.broker} onChange={v => set({ broker: v })} />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Portföy Grubu <span className="optional-tag">opsiyonel</span></label>
                <select value={state.portfolioGroup} onChange={e => set({ portfolioGroup: e.target.value })}>
                  <option value="">Seçiniz...</option>
                  {['Ana Portföy','Kripto','Hisse','Altın & Metal','Döviz','Emeklilik','Kısa Vade','Uzun Vade'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
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
