import React, { useState } from 'react';
import { getAssetDefinitions } from '../services/priceService';
import { AssetEntry, Currency, SaleEntry, PartialDate } from '../types/asset';
import { addSale } from '../utils/storage';
import { FormattedNumberInput } from './FormattedNumberInput';

interface SaleFormProps {
  entry: AssetEntry;
  onSaleAdded: (sale: SaleEntry) => void;
  onClose: () => void;
  /** Güncel piyasa fiyatı (TRY/birim) — tablodaki currentPriceTRY */
  currentPriceTRY?: number;
}

const CURRENCIES: { value: Currency; symbol: string; label: string }[] = [
  { value: 'TRY', symbol: '₺', label: 'TRY' },
  { value: 'USD', symbol: '$', label: 'USD' },
  { value: 'EUR', symbol: '€', label: 'EUR' },
  { value: 'GBP', symbol: '£', label: 'GBP' },
];

function generateId(): string {
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function partialToIso(p: PartialDate): string {
  if (!p.year) return new Date().toISOString().split('T')[0];
  const m = p.month ?? 1;
  const d = p.day   ?? 1;
  return `${p.year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function SaleForm({ entry, onSaleAdded, onClose, currentPriceTRY = 0 }: SaleFormProps) {
  const assetDef = getAssetDefinitions().find((a) => a.id === entry.assetId)!;
  const isMetal  = assetDef.category === 'metal';
  const unitLabel = isMetal ? 'gram' : assetDef.symbol;

  const maxQty     = entry.quantity;
  const buyPrice   = entry.purchasePriceTRY;
  const hasLivePrice = currentPriceTRY > 0;

  // Eğer piyasa fiyatı varsa: tahmini kar/zarar göster
  const livePnl        = hasLivePrice ? ((currentPriceTRY - buyPrice) / buyPrice) * 100 : null;
  const livePnlPositive = livePnl !== null && livePnl >= 0;

  const [year,      setYear]      = useState('');
  const [month,     setMonth]     = useState('');
  const [day,       setDay]       = useState('');
  const [qty,       setQty]       = useState('');
  const [priceRaw,  setPriceRaw]  = useState(hasLivePrice ? String(Math.round(currentPriceTRY)) : '');
  const [feeRaw,    setFeeRaw]    = useState('');
  const [currency,  setCurrency]  = useState<Currency>('TRY');
  const [note,      setNote]      = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const monthDisabled = !year;
  const dayDisabled   = !year || !month;

  // Anlık hesaplamalar
  const qtyNum   = Number(qty)      || 0;
  const priceNum = Number(priceRaw) || 0;
  const feeNum   = Number(feeRaw)   || 0;
  const revenue  = qtyNum * priceNum;
  const cost     = qtyNum * buyPrice;
  const pnl      = revenue - cost - feeNum;
  const showCalc = qtyNum > 0 && priceNum > 0;

  function validate() {
    const e: Record<string, string> = {};
    if (!qty || qtyNum <= 0)          e.qty   = 'Geçerli bir miktar girin';
    if (qtyNum > maxQty)              e.qty   = `Maksimum ${fmt(maxQty, 4)} ${unitLabel} satabilirsiniz`;
    if (!priceRaw || priceNum <= 0)   e.price = 'Geçerli bir satış fiyatı girin';
    if (feeRaw && feeNum < 0)         e.fee   = 'Komisyon negatif olamaz';

    const y = year  ? Number(year)  : null;
    const m = month ? Number(month) : null;
    const d = day   ? Number(day)   : null;
    if (y !== null && (y < 1900 || y > 2100)) e.year  = 'Geçerli bir yıl girin';
    if (m !== null && (!year || m < 1 || m > 12)) e.month = month && !year ? 'Önce yıl girin' : '1-12 arası';
    if (d !== null && (!month || d < 1 || d > 31)) e.day  = day && !month ? 'Önce ay girin' : '1-31 arası';
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

    const sale: SaleEntry = {
      id:              generateId(),
      assetEntryId:    entry.id,
      assetId:         entry.assetId,
      saleDate:        partialToIso(partial),
      saleDatePartial: partial,
      saleQuantity:    qtyNum,
      salePriceTRY:    priceNum,
      salePriceRaw:    priceNum,
      saleCurrency:    currency,
      feeRaw:          feeNum > 0 ? feeNum : undefined,
      note:            note.trim() || undefined,
      createdAt:       new Date().toISOString(),
    };

    addSale(sale);
    onSaleAdded(sale);
    onClose();
  }

  function handleSellAll() {
    setQty(String(maxQty));
    if (hasLivePrice) setPriceRaw(String(Math.round(currentPriceTRY)));
  }

  const currSym = CURRENCIES.find((c) => c.value === currency)?.symbol ?? '₺';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box glass-card">

        {/* Başlık */}
        <div className="form-header">
          <div>
            <h2>💰 Satış Ekle</h2>
            <p className="modal-subtitle">
              {assetDef.icon} {assetDef.name} ({assetDef.symbol})
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Varlık bilgi kartı */}
        <div className="sale-info-card">
          <div className="sale-info-row">
            <div className="sale-info-item">
              <span className="sale-info-label">Mevcut Miktar</span>
              <span className="sale-info-value">{fmt(maxQty, 4)} {unitLabel}</span>
            </div>
            <div className="sale-info-item">
              <span className="sale-info-label">Alış Fiyatı</span>
              <span className="sale-info-value">₺{fmt(buyPrice)}</span>
            </div>
            {hasLivePrice && (
              <>
                <div className="sale-info-item">
                  <span className="sale-info-label">Güncel Fiyat</span>
                  <span className="sale-info-value">₺{fmt(currentPriceTRY)}</span>
                </div>
                <div className="sale-info-item">
                  <span className="sale-info-label">Anlık Durum</span>
                  <span className={`sale-info-value pnl-badge ${livePnlPositive ? 'profit' : 'loss'}`}>
                    {livePnlPositive ? '▲' : '▼'} {livePnl !== null ? fmt(Math.abs(livePnl)) : '—'}%
                  </span>
                </div>
              </>
            )}
          </div>
          {hasLivePrice && (
            <button type="button" className="btn-sell-all" onClick={handleSellAll}>
              Tamamını Sat — Piyasa Fiyatıyla Doldur
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Satış Tarihi — Yıl→Ay→Gün */}
          <div className="form-group">
            <label>Satış Tarihi <span className="optional-tag">opsiyonel</span></label>
            <div className="date-partial-row">
              <div className="date-partial-field date-year-field">
                <span className="date-field-label">Yıl</span>
                <input type="number" placeholder="2024" min="1900" max="2100" value={year}
                  onChange={(e) => { setYear(e.target.value); if (!e.target.value) { setMonth(''); setDay(''); } }}
                  className={errors.year ? 'input-error' : ''} />
                {errors.year && <span className="form-error">{errors.year}</span>}
              </div>
              <div className="date-partial-field">
                <span className={`date-field-label ${monthDisabled ? 'label-disabled' : ''}`}>Ay</span>
                <input type="number" placeholder="1-12" min="1" max="12" value={month}
                  disabled={monthDisabled}
                  onChange={(e) => { setMonth(e.target.value); if (!e.target.value) setDay(''); }}
                  className={errors.month ? 'input-error' : ''} />
                {errors.month && <span className="form-error">{errors.month}</span>}
              </div>
              <div className="date-partial-field">
                <span className={`date-field-label ${dayDisabled ? 'label-disabled' : ''}`}>Gün</span>
                <input type="number" placeholder="1-31" min="1" max="31" value={day}
                  disabled={dayDisabled}
                  onChange={(e) => setDay(e.target.value)}
                  className={errors.day ? 'input-error' : ''} />
                {errors.day && <span className="form-error">{errors.day}</span>}
              </div>
            </div>
          </div>

          {/* Satılan miktar */}
          <div className="form-group">
            <label>Satılan Miktar ({unitLabel})</label>
            <div className="qty-row">
              <input
                type="number" placeholder={`Maks. ${fmt(maxQty, 4)}`}
                min="0" max={maxQty} step="any" value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={errors.qty ? 'input-error' : ''}
              />
            </div>
            <div className="qty-quick-btns">
              <button type="button" onClick={() => setQty(String(maxQty * 0.25))}>%25</button>
              <button type="button" onClick={() => setQty(String(maxQty * 0.50))}>%50</button>
              <button type="button" onClick={() => setQty(String(maxQty * 0.75))}>%75</button>
              <button type="button" onClick={() => setQty(String(maxQty))}>Maks</button>
            </div>
            {errors.qty && <span className="form-error">{errors.qty}</span>}
          </div>

          {/* Satış fiyatı + Para birimi */}
          <div className="form-group">
            <label>Satış Fiyatı <span className="form-hint-inline">/ birim</span></label>
            <div className="price-row">
              <select className="currency-select" value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>
                ))}
              </select>
              <FormattedNumberInput
                value={priceRaw}
                onChange={setPriceRaw}
                placeholder="Satış fiyatı"
                className={errors.price ? 'input-error' : ''}
              />
              {hasLivePrice && (
                <button type="button" className="btn-live-price"
                  onClick={() => { setCurrency('TRY'); setPriceRaw(String(Math.round(currentPriceTRY))); }}
                  title="Güncel piyasa fiyatını kullan">
                  ↺ Piyasa
                </button>
              )}
            </div>
            {errors.price && <span className="form-error">{errors.price}</span>}
          </div>

          {/* Satış Komisyonu */}
          <div className="form-group">
            <label>Satış Komisyonu / Masrafı <span className="optional-tag">opsiyonel</span></label>
            <div className="price-row">
              <span className="unit-badge">{currSym}</span>
              <FormattedNumberInput
                value={feeRaw}
                onChange={setFeeRaw}
                placeholder="Örn: 15,00"
                className={errors.fee ? 'input-error' : ''}
              />
            </div>
            {errors.fee && <span className="form-error">{errors.fee}</span>}
          </div>

          {/* Anlık hesap önizlemesi */}
          {showCalc && (
            <div className={`sale-preview ${pnl >= 0 ? 'preview-profit' : 'preview-loss'}`}>
              <div className="preview-row">
                <span>Satış Geliri</span>
                <span>{currSym}{fmt(revenue)}</span>
              </div>
              <div className="preview-row">
                <span>Maliyet</span>
                <span>₺{fmt(cost)}</span>
              </div>
              {feeNum > 0 && (
                <div className="preview-row">
                  <span>Komisyon</span>
                  <span className="loss">- {currSym}{fmt(feeNum)}</span>
                </div>
              )}
              <div className="preview-row preview-total">
                <span>Net {pnl >= 0 ? 'Kâr' : 'Zarar'}</span>
                <span className={pnl >= 0 ? 'profit' : 'loss'}>
                  {pnl >= 0 ? '+' : ''}₺{fmt(pnl, 2)}
                </span>
              </div>
            </div>
          )}

          {/* Not */}
          <div className="form-group">
            <label>Not <span className="optional-tag">opsiyonel</span></label>
            <input type="text" placeholder="Örn: Binance'de satıldı" value={note}
              onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>İptal</button>
            <button type="submit" className="btn-submit btn-sell-submit">💰 Satışı Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}
