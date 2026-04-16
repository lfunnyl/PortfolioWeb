import { useState, useEffect } from 'react';
import { AssetEntry, AssetDefinition, Currency, QuantityUnit, PartialDate } from '../types/asset';
import { getAssetDefinitions } from '../services/priceService';
import { fetchHistoricalPrice } from '../services/historicalPriceService';
import { addEntry, updateEntry, addCustomAsset } from '../utils/storage';
import { generateId, partialToIso, isoToPartial, toGram } from '../utils/format';

type CategoryFilter = 'all' | 'crypto' | 'metal' | 'forex' | 'stock_tr' | 'stock_us';

interface FormState {
  assetId: string;
  categoryFilter: CategoryFilter;
  year: string; month: string; day: string;
  quantity: string; totalAmount: string; inputMode: 'qty' | 'total';
  quantityUnit: QuantityUnit;
  priceRaw: string; feeRaw: string; currency: Currency;
  customName: string; customSymbol: string;
  note: string; broker: string; portfolioGroup: string;
  errors: Record<string, string>;
  isFetchingPrice: boolean;
}

/** Asset form state + logic hook. Keeps AssetForm.tsx clean (UI only). */
export function useAssetForm(
  onEntryAdded: (e: AssetEntry) => void,
  onEntryUpdated?: (e: AssetEntry) => void,
  editEntry?: AssetEntry | null,
  onClose?: () => void,
) {
  const [open, setOpen] = useState(false);
  const [defs, setDefs] = useState<AssetDefinition[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const initialAssetId = () => getAssetDefinitions()[0]?.id ?? '';

  const [state, setState] = useState<FormState>({
    assetId: initialAssetId(),
    categoryFilter: 'all',
    year: '', month: '', day: '',
    quantity: '', totalAmount: '', inputMode: 'qty',
    quantityUnit: 'gram',
    priceRaw: '', feeRaw: '', currency: 'TRY',
    customName: '', customSymbol: '',
    note: '', broker: '', portfolioGroup: '',
    errors: {},
    isFetchingPrice: false,
  });

  const set = (patch: Partial<FormState>) => setState(prev => ({ ...prev, ...patch }));

  // Düzenleme modunda formu doldur
  useEffect(() => {
    if (!editEntry) return;
    const partial = editEntry.purchaseDatePartial ?? isoToPartial(editEntry.purchaseDate);
    set({
      assetId: editEntry.assetId,
      year:  partial.year  ? String(partial.year)  : '',
      month: partial.month ? String(partial.month) : '',
      day:   partial.day   ? String(partial.day)   : '',
      quantity:     String(editEntry.quantity),
      quantityUnit: (editEntry.quantityUnit as QuantityUnit) ?? 'gram',
      priceRaw:     String(editEntry.purchasePriceRaw ?? editEntry.purchasePriceTRY),
      feeRaw:       editEntry.feeRaw ? String(editEntry.feeRaw) : '',
      currency:     (editEntry.purchaseCurrency as Currency) ?? 'TRY',
      note:         editEntry.note ?? '',
      broker:       editEntry.broker ?? '',
      portfolioGroup: editEntry.portfolioGroup ?? '',
    });
    setOpen(true);
  }, [editEntry]);

  // Form açıldığında asset'leri yükle
  useEffect(() => {
    if (open) { setDefs(getAssetDefinitions()); setConfirmDeleteId(null); }
  }, [open]);

  const selectedDef = state.assetId === '_custom_' ? undefined : defs.find(a => a.id === state.assetId);
  const isMetal = selectedDef?.category === 'metal';
  const filteredDefs = state.categoryFilter === 'all' ? defs : defs.filter(a => a.category === state.categoryFilter);

  function handleCategoryChange(cat: CategoryFilter) {
    const filtered = cat === 'all' ? defs : defs.filter(a => a.category === cat);
    const newAssetId = filtered.length > 0 && !filtered.find(a => a.id === state.assetId)
      ? filtered[0].id : state.assetId;
    set({ categoryFilter: cat, assetId: newAssetId });
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (state.assetId === '_custom_') {
      if (!state.customName.trim())   e.customName   = 'Hisse adı gerekli';
      if (!state.customSymbol.trim()) e.customSymbol = 'Sembol/Kod gerekli';
    }
    if (state.inputMode === 'qty') {
      if (!state.quantity || Number(state.quantity) <= 0) e.qty = 'Geçerli bir miktar girin';
    } else {
      if (!state.totalAmount || Number(state.totalAmount) <= 0) e.totalAmount = 'Geçerli bir toplam tutar girin';
    }
    if (!state.priceRaw || Number(state.priceRaw) <= 0) e.price = 'Geçerli bir fiyat girin';
    if (state.feeRaw && Number(state.feeRaw) < 0) e.fee = 'Komisyon negatif olamaz';

    const y = state.year  ? Number(state.year)  : null;
    const m = state.month ? Number(state.month) : null;
    const d = state.day   ? Number(state.day)   : null;
    if (y !== null && (y < 1900 || y > 2100)) e.year = 'Geçerli bir yıl girin (1900-2100)';
    if (m !== null) {
      if (!state.year)       e.month = 'Ay girmek için önce yıl gerekli';
      else if (m < 1 || m > 12) e.month = '1-12 arası bir ay girin';
    }
    if (d !== null) {
      if (!state.month)      e.day = 'Gün girmek için önce ay gerekli';
      else if (d < 1 || d > 31) e.day = '1-31 arası bir gün girin';
    }
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { set({ errors: errs }); return; }

    const partial: PartialDate = {
      year:  state.year  ? Number(state.year)  : undefined,
      month: state.month ? Number(state.month) : undefined,
      day:   state.day   ? Number(state.day)   : undefined,
    };
    const isoDate = partialToIso(partial);

    let finalAssetId = state.assetId;
    if (state.assetId === '_custom_') {
      const isTurk = state.customSymbol.trim().toUpperCase().endsWith('.IS');
      const newDef: AssetDefinition = {
        id: 'cust_' + Date.now(),
        name: state.customName.trim(),
        symbol: state.customSymbol.trim().toUpperCase(),
        icon: isTurk ? '🇹🇷' : '🌐',
        category: isTurk ? 'stock_tr' : 'stock_us',
        stockKey: state.customSymbol.trim().toUpperCase(),
      };
      addCustomAsset(newDef);
      finalAssetId = newDef.id;
    }

    const rawQty = state.inputMode === 'qty'
      ? Number(state.quantity)
      : Number(state.totalAmount) / Number(state.priceRaw);
    const stdQty = isMetal ? toGram(rawQty, state.quantityUnit) : rawQty;
    const fee = state.feeRaw ? Number(state.feeRaw) : 0;

    const shared = {
      assetId: finalAssetId,
      purchaseDate: isoDate,
      purchaseDatePartial: partial,
      quantity: stdQty,
      quantityUnit: isMetal ? state.quantityUnit : 'adet' as QuantityUnit,
      purchasePriceTRY: Number(state.priceRaw),
      purchasePriceRaw: Number(state.priceRaw),
      purchaseCurrency: state.currency,
      feeRaw: fee > 0 ? fee : undefined,
      note: state.note.trim() || undefined,
      broker: state.broker.trim() || undefined,
      portfolioGroup: state.portfolioGroup || undefined,
    };

    if (editEntry) {
      const updated: AssetEntry = { ...editEntry, ...shared };
      updateEntry(editEntry.id, updated);
      onEntryUpdated?.(updated);
    } else {
      const entry: AssetEntry = { ...shared, id: generateId(), createdAt: new Date().toISOString() };
      addEntry(entry);
      onEntryAdded(entry);
    }

    resetForm(); handleClose();
  }

  function resetForm() {
    setState(prev => ({
      ...prev,
      assetId: initialAssetId(), categoryFilter: 'all',
      year: '', month: '', day: '',
      quantity: '', totalAmount: '', priceRaw: '', feeRaw: '',
      customName: '', customSymbol: '', note: '', broker: '', portfolioGroup: '',
      currency: 'TRY', quantityUnit: 'gram', inputMode: 'qty',
      errors: {}, isFetchingPrice: false,
    }));
  }

  async function handleAutoFetchPrice() {
    if (!selectedDef) return;
    set({ isFetchingPrice: true, errors: { ...state.errors, price: '' } });
    try {
      const p = await fetchHistoricalPrice(selectedDef, state.year, state.month, state.day);
      if (p && p > 0) {
        set({
          priceRaw: p.toFixed(4),
          currency: selectedDef.category === 'stock_us' ? 'USD' : 'TRY',
          isFetchingPrice: false,
        });
      } else {
        set({ errors: { ...state.errors, price: 'Otomatik fiyat bulunamadı. Lütfen manuel yazın.' }, isFetchingPrice: false });
      }
    } catch {
      set({ errors: { ...state.errors, price: 'Fiyat sunucusuna bağlanılamadı.' }, isFetchingPrice: false });
    }
  }

  function handleClose() { setOpen(false); onClose?.(); }

  return {
    open, setOpen, state, set, defs, setDefs,
    confirmDeleteId, setConfirmDeleteId,
    selectedDef, isMetal, filteredDefs,
    handleCategoryChange, handleSubmit, handleClose,
    handleAutoFetchPrice,
  };
}
