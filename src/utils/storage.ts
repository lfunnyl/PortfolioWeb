import { AssetEntry, SaleEntry, AssetDefinition, DividendEntry, PortfolioSnapshot, SplitEntry, OptionEntry } from '../types/asset';

const ENTRIES_KEY       = 'portfolio_entries_v1';
const SALES_KEY         = 'portfolio_sales_v1';
const CUSTOM_ASSETS_KEY = 'custom_assets_v1';
const DIVIDENDS_KEY     = 'portfolio_dividends_v1';
const SNAPSHOTS_KEY     = 'portfolio_snapshots_v1';
const SPLITS_KEY        = 'portfolio_splits_v1';
const OPTIONS_KEY       = 'portfolio_options_v1';


/* ─── CUSTOM ASSETS ─────────────────────────────────────────────── */

export function loadCustomAssets(): AssetDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ASSETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AssetDefinition[];
  } catch {
    return [];
  }
}

export function saveCustomAssets(assets: AssetDefinition[]): void {
  localStorage.setItem(CUSTOM_ASSETS_KEY, JSON.stringify(assets));
}

export function addCustomAsset(asset: AssetDefinition): void {
  const assets = loadCustomAssets();
  if (!assets.some(a => a.id === asset.id || a.stockKey === asset.stockKey)) {
    assets.push(asset);
    saveCustomAssets(assets);
  }
}

export function removeCustomAsset(id: string): void {
  const assets = loadCustomAssets().filter(a => a.id !== id);
  saveCustomAssets(assets);
}

/* ─── ENTRIES ───────────────────────────────────────────────────── */

export function loadEntries(): AssetEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AssetEntry[];
  } catch {
    return [];
  }
}

export function saveEntries(entries: AssetEntry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function addEntry(entry: AssetEntry): void {
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
}

export function updateEntry(id: string, partial: Partial<AssetEntry>): void {
  const entries = loadEntries().map((e) =>
    e.id === id ? { ...e, ...partial } : e
  );
  saveEntries(entries);
}

export function removeEntry(id: string): void {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
}

/* ─── SALES ─────────────────────────────────────────────────────── */

export function loadSales(): SaleEntry[] {
  try {
    const raw = localStorage.getItem(SALES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SaleEntry[];
  } catch {
    return [];
  }
}

export function saveSales(sales: SaleEntry[]): void {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

export function addSale(sale: SaleEntry): void {
  const sales = loadSales();
  sales.push(sale);
  saveSales(sales);
}

export function removeSale(id: string): void {
  const sales = loadSales().filter((s) => s.id !== id);
  saveSales(sales);
}

/* ─── DIVIDENDS ─────────────────────────────────────────────────── */

export function loadDividends(): DividendEntry[] {
  try {
    const raw = localStorage.getItem(DIVIDENDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DividendEntry[];
  } catch { return []; }
}

export function saveDividends(divs: DividendEntry[]): void {
  localStorage.setItem(DIVIDENDS_KEY, JSON.stringify(divs));
}

export function addDividend(div: DividendEntry): void {
  const divs = loadDividends();
  divs.push(div);
  saveDividends(divs);
}

export function removeDividend(id: string): void {
  const divs = loadDividends().filter((d) => d.id !== id);
  saveDividends(divs);
}

/* ─── PORTFOLIO SNAPSHOTS ───────────────────────────────────────── */

export function loadSnapshots(): PortfolioSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PortfolioSnapshot[];
  } catch { return []; }
}

export function saveSnapshot(snap: PortfolioSnapshot): void {
  const snaps = loadSnapshots();
  const today = snap.date.split('T')[0];
  const idx = snaps.findIndex((s) => s.date.split('T')[0] === today);
  if (idx >= 0) {
    snaps[idx] = snap;
  } else {
    snaps.push(snap);
    if (snaps.length > 365) snaps.shift();
  }
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
}

/* ─── SPLITS ────────────────────────────────────────────────────── */

export function loadSplits(): SplitEntry[] {
  try {
    const raw = localStorage.getItem(SPLITS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SplitEntry[];
  } catch { return []; }
}

export function saveSplits(splits: SplitEntry[]): void {
  localStorage.setItem(SPLITS_KEY, JSON.stringify(splits));
}

export function addSplit(split: SplitEntry): void {
  const splits = loadSplits();
  splits.push(split);
  saveSplits(splits);
}

export function removeSplit(id: string): void {
  const splits = loadSplits().filter(s => s.id !== id);
  saveSplits(splits);
}

/* ─── OPTIONS ───────────────────────────────────────────────────── */

export function loadOptions(): OptionEntry[] {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OptionEntry[];
  } catch { return []; }
}

export function saveOptions(opts: OptionEntry[]): void {
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts));
}

export function addOption(opt: OptionEntry): void {
  const opts = loadOptions();
  opts.push(opt);
  saveOptions(opts);
}

export function removeOption(id: string): void {
  const opts = loadOptions().filter(o => o.id !== id);
  saveOptions(opts);
}


/**
 * Split'i portföy girdilerine uygular:
 * miktar *= ratio, purchasePriceTRY /= ratio, purchasePriceRaw /= ratio
 * Etkilenen entry id'lerini döner.
 */
export function applySplitToEntries(split: SplitEntry): string[] {
  const entries = loadEntries();
  const affected: string[] = [];
  const updated = entries.map(e => {
    if (e.assetId !== split.assetId) return e;
    affected.push(e.id);
    return {
      ...e,
      quantity: e.quantity * split.ratio,
      purchasePriceTRY: e.purchasePriceTRY / split.ratio,
      purchasePriceRaw: e.purchasePriceRaw ? e.purchasePriceRaw / split.ratio : undefined,
    };
  });
  saveEntries(updated);
  return affected;
}

/**
 * Split'i geri alır: miktar /= ratio, fiyatlar *= ratio
 */
export function undoSplitFromEntries(split: SplitEntry): void {
  const entries = loadEntries();
  const updated = entries.map(e => {
    if (e.assetId !== split.assetId) return e;
    return {
      ...e,
      quantity: e.quantity / split.ratio,
      purchasePriceTRY: e.purchasePriceTRY * split.ratio,
      purchasePriceRaw: e.purchasePriceRaw ? e.purchasePriceRaw * split.ratio : undefined,
    };
  });
  saveEntries(updated);
}

/* ─── EXPORT / IMPORT (BACKUP) ──────────────────────────────────── */

export function exportData(): string {
  const data = {
    entries: loadEntries(),
    sales: loadSales(),
    dividends: loadDividends(),
    customAssets: loadCustomAssets(),
    snapshots: loadSnapshots(),
    splits: loadSplits(),
    options: loadOptions(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    if (data.entries) saveEntries(data.entries);
    if (data.sales) saveSales(data.sales);
    if (data.dividends) saveDividends(data.dividends);
    if (data.customAssets) saveCustomAssets(data.customAssets);
    if (data.snapshots) {
      // Doğrudan yazarız
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(data.snapshots));
    }
    if (data.splits) saveSplits(data.splits);
    if (data.options) saveOptions(data.options);
    return true;
  } catch (e) {
    return false;
  }
}
