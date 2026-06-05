import { exportData, importData } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { AuthModal } from './AuthModal';
import { SyncStatus } from '../hooks/useCloudSync';
import { useI18n } from '../context/I18nContext';
import type { ThemeMode } from '../hooks/useTheme';

interface NavbarProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  displayCurrency: 'TRY' | 'USD';
  onToggleCurrency: () => void;
  // Cloud sync
  syncStatus?: SyncStatus;
  lastSynced?: Date | null;
  syncError?: string | null;
  onManualPush?: () => void;
  onManualPull?: () => void;
  // Theme & Lang
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

// Sync durumu görsel bilgileri
const SYNC_META: Record<SyncStatus, { icon: string; label: string; color: string }> = {
  idle:    { icon: '☁️',  label: 'Bulut hazır',        color: '#64748b' },
  pulling: { icon: '⬇️',  label: 'Veriler çekiliyor…', color: '#3b82f6' },
  pushing: { icon: '⬆️',  label: 'Kaydediliyor…',      color: '#8b5cf6' },
  ok:      { icon: '✅',  label: 'Senkronize',          color: '#10b981' },
  error:   { icon: '⚠️',  label: 'Sync hatası',         color: '#f59e0b' },
};

export function Navbar({
  isLoading, lastUpdated, onRefresh, displayCurrency, onToggleCurrency,
  syncStatus = 'idle', lastSynced, syncError, onManualPush, onManualPull,
  theme = 'dark', onToggleTheme,
}: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const { lang, setLang } = useI18n();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const syncMeta = SYNC_META[syncStatus];
  const isPulsing = syncStatus === 'pulling' || syncStatus === 'pushing';

  function handleExport() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_yedek_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const text = re.target?.result as string;
        if (importData(text)) {
          alert('Veriler başarıyla yüklendi! Sayfa yenileniyor…');
          window.location.reload();
        } else {
          alert('Geçersiz yedek dosyası!');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <>
      <header className="navbar">
        {/* ── Sol: Logo ── */}
        <div className="navbar-brand">
          <span className="navbar-logo">◈</span>
          <span className="navbar-title">PortföyTakip</span>
        </div>

        {/* ── Sağ: Tüm kontroller ── */}
        <div className="navbar-right">

          {/* Cloud Sync Göstergesi */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                if (!isAuthenticated) { setShowAuthModal(true); return; }
                setShowSyncMenu(v => !v);
              }}
              title={syncError ?? syncMeta.label}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.7rem', borderRadius: '20px', cursor: 'pointer',
                border: `1px solid ${syncMeta.color}55`,
                background: `${syncMeta.color}12`,
                color: syncMeta.color,
                fontSize: '0.75rem', fontWeight: 600,
                transition: 'all 0.2s',
                animation: isPulsing ? 'pulse-soft 1.2s ease-in-out infinite' : 'none',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{syncMeta.icon}</span>
              <span style={{ display: 'none' }} className="sync-label-md">{syncMeta.label}</span>
              {isAuthenticated && lastSynced && syncStatus === 'ok' && (
                <span style={{ opacity: 0.65 }}>
                  {lastSynced.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>

            {/* Dropdown menü */}
            {showSyncMenu && isAuthenticated && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '0.5rem', zIndex: 999,
                  minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.3rem 0.5rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                  ☁️ Bulut Senkronizasyonu
                </div>
                {syncError && (
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b', padding: '0.3rem 0.5rem', marginBottom: '0.3rem' }}>
                    ⚠️ {syncError}
                  </div>
                )}
                <button
                  onClick={() => { onManualPush?.(); setShowSyncMenu(false); }}
                  disabled={isPulsing}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.82rem', cursor: 'pointer' }}
                  className="sync-menu-item"
                >
                  ⬆️ Şimdi Buluta Kaydet
                </button>
                <button
                  onClick={() => { onManualPull?.(); setShowSyncMenu(false); }}
                  disabled={isPulsing}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.82rem', cursor: 'pointer' }}
                  className="sync-menu-item"
                >
                  ⬇️ Buluttan Veri Çek
                </button>
                <div style={{ height: '1px', background: 'var(--border)', margin: '0.4rem 0' }} />
                <button
                  onClick={() => { handleExport(); setShowSyncMenu(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.82rem', cursor: 'pointer' }}
                  className="sync-menu-item"
                >
                  💾 JSON Yedek İndir
                </button>
                <button
                  onClick={() => { handleImport(); setShowSyncMenu(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.82rem', cursor: 'pointer' }}
                  className="sync-menu-item"
                >
                  📂 JSON Yedek Yükle
                </button>
              </div>
            )}
          </div>

          <div style={{ height: '20px', width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />

          {/* Auth Bölümü */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                👤 {user?.email}
              </span>
              <button
                className="btn-text"
                onClick={logout}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--text-muted)' }}
              >
                Çıkış
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setShowAuthModal(true)}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
            >
              🔐 Giriş Yap
            </button>
          )}

          <div style={{ height: '20px', width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />

          {/* Para birimi */}
          <button className="btn-currency-toggle" onClick={onToggleCurrency} title="Para Birimini Değiştir">
            {displayCurrency === 'TRY' ? '₺ TRY' : '$ USD'}
          </button>

          {/* Dil Seçici */}
          <button
            id="lang-toggle-btn"
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            title={lang === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
            style={{
              padding: '0.3rem 0.6rem', borderRadius: '20px', cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700,
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
          </button>

          {/* Tema Toggle */}
          {onToggleTheme && (
            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          {/* Fiyat güncelleme zamanı + refresh */}
          {timeStr && (
            <span className="navbar-updated">
              <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>Son: </span>
              <strong>{timeStr}</strong>
            </span>
          )}
          <button
            className={`btn-refresh ${isLoading ? 'spinning' : ''}`}
            onClick={onRefresh}
            disabled={isLoading}
            title="Fiyatları Yenile"
          >
            ↻
          </button>
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Sync menüyü dışarı tıklayınca kapat */}
      {showSyncMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          onClick={() => setShowSyncMenu(false)}
        />
      )}
    </>
  );
}
