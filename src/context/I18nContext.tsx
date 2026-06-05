import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type Language = 'tr' | 'en';

// ── Çeviri sözlüğü ───────────────────────────────────────────────────────────
const translations = {
  tr: {
    // Navbar
    appName: 'PortföyTakip',
    refresh: 'Fiyatları Yenile',
    login: '🔐 Giriş Yap',
    logout: 'Çıkış',
    cloudReady: 'Bulut hazır',
    syncing: 'Senkronize ediliyor…',
    synced: 'Senkronize',
    syncError: 'Sync hatası',
    // Tabs
    portfolio: 'Portföyüm',
    sales: 'Satışlar',
    dividends: 'Temettüler',
    income: 'Gelir Akışı',
    advanced: 'Gelişmiş',
    pro: 'Pro Analiz',
    comparison: 'Kıyaslama',
    simulation: 'Simülasyon',
    news: 'Haberler',
    connectors: 'Cüzdanlar',
    // Summary
    totalValue: 'Toplam Değer',
    totalCost: 'Toplam Maliyet',
    profitLoss: 'Kâr / Zarar',
    assets: 'varlık',
    // Table
    asset: 'Varlık',
    quantity: 'Miktar',
    buyPrice: 'Alış Fiyatı',
    currentPrice: 'Güncel Fiyat',
    currentValue: 'Güncel Değer',
    change: 'Değişim',
    actions: 'İşlemler',
    // Buttons
    add: 'Ekle',
    edit: 'Düzenle',
    delete: 'Sil',
    sell: 'Sat',
    save: 'Kaydet',
    cancel: 'İptal',
    close: 'Kapat',
    // Messages
    noAssets: 'Henüz varlık eklenmedi',
    addFirst: 'İlk varlığınızı ekleyin',
    loading: 'Yükleniyor…',
    // Forms
    selectAsset: 'Varlık Seç',
    buyDate: 'Alış Tarihi',
    broker: 'Aracı Kurum',
    note: 'Not',
    fee: 'Komisyon',
    currency: 'Para Birimi',
    // Dark mode
    darkMode: 'Karanlık Mod',
    lightMode: 'Aydınlık Mod',
    // Language
    language: 'Dil',
  },
  en: {
    // Navbar
    appName: 'PortfolioTracker',
    refresh: 'Refresh Prices',
    login: '🔐 Sign In',
    logout: 'Sign Out',
    cloudReady: 'Cloud ready',
    syncing: 'Syncing…',
    synced: 'Synced',
    syncError: 'Sync error',
    // Tabs
    portfolio: 'Portfolio',
    sales: 'Sales',
    dividends: 'Dividends',
    income: 'Income',
    advanced: 'Advanced',
    pro: 'Pro Analysis',
    comparison: 'Comparison',
    simulation: 'Simulation',
    news: 'News',
    connectors: 'Wallets',
    // Summary
    totalValue: 'Total Value',
    totalCost: 'Total Cost',
    profitLoss: 'Profit / Loss',
    assets: 'assets',
    // Table
    asset: 'Asset',
    quantity: 'Quantity',
    buyPrice: 'Buy Price',
    currentPrice: 'Current Price',
    currentValue: 'Current Value',
    change: 'Change',
    actions: 'Actions',
    // Buttons
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    sell: 'Sell',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    // Messages
    noAssets: 'No assets added yet',
    addFirst: 'Add your first asset',
    loading: 'Loading…',
    // Forms
    selectAsset: 'Select Asset',
    buyDate: 'Buy Date',
    broker: 'Broker',
    note: 'Note',
    fee: 'Commission',
    currency: 'Currency',
    // Dark mode
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    // Language
    language: 'Language',
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'tr',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() =>
    (localStorage.getItem('app_lang') as Language) ?? 'tr'
  );

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem('app_lang', l);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return (translations[lang] as any)[key] ?? (translations.tr as any)[key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
