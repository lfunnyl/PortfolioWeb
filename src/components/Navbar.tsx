import { exportData, importData } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { AuthModal } from './AuthModal';
import { apiUrl } from '../utils/api';

interface NavbarProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  displayCurrency: 'TRY' | 'USD';
  onToggleCurrency: () => void;
}

export function Navbar({ isLoading, lastUpdated, onRefresh, displayCurrency, onToggleCurrency }: NavbarProps) {
  const { isAuthenticated, user, logout, token } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

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
          alert("Veriler başarıyla yüklendi! Sayfa yenileniyor...");
          window.location.reload();
        } else {
          alert("Geçersiz yedek dosyası!");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function handleCloudSave() {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    try {
      const dataStr = exportData();
      const payload = JSON.parse(dataStr);
      const syncPayload = {
        entries: payload.entries || [],
        sales: payload.sales || [],
        dividends: payload.dividends || [],
        options: payload.options || []
      };
      
      const res = await fetch(apiUrl('/portfolio/sync'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(syncPayload)
      });
      
      if (res.ok) {
        alert("Portföyünüz başarıyla bulut veritabanına kaydedildi! ✅");
      } else if (res.status === 401) {
        alert("Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
        logout();
      } else {
        alert("Buluta kaydetme başarısız oldu. API detaylarını kontrol edin.");
      }
    } catch (e) {
      alert("Bağlantı hatası: Backend sunucusu (run.py) çalışıyor mu?");
    }
  }

  async function handleCloudLoad() {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await fetch(apiUrl('/portfolio/sync'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        
        const importPayload = {
          entries: data.entries || [],
          sales: data.sales || [],
          dividends: data.dividends || [],
          options: data.options || []
        };
        
        if (importData(JSON.stringify(importPayload))) {
          alert("Buluttan veriler başarıyla cihaza yüklendi! Sayfa yenileniyor... ☁️");
          window.location.reload();
        } else {
          alert("Gelen veri yapısı kabul edilmedi.");
        }
      } else if (res.status === 401) {
        alert("Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
        logout();
      } else {
        alert("Buluttan veri çekilemedi. API detaylarını kontrol edin.");
      }
    } catch (e) {
      alert("Bağlantı hatası: Backend sunucusu (run.py) çalışıyor mu?");
    }
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">◈</span>
          <span className="navbar-title">PortföyTakip</span>
        </div>
        <div className="navbar-right">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👤 {user?.email}</span>
              <button className="btn-text" onClick={logout} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Çıkış</button>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setShowAuthModal(true)} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', marginRight: '1rem' }}>
              Giriş Yap
            </button>
          )}

          <div style={{ height: '24px', width: '1px', background: 'var(--border)', marginRight: '1rem' }}></div>

          <button className="btn-currency-toggle" onClick={handleCloudSave} title="Buluta Kaydet" style={{ background: 'transparent', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', marginRight: '4px' }}>
            ☁️ Buluta Yaz
          </button>
          <button className="btn-currency-toggle" onClick={handleCloudLoad} title="Buluttan Getir" style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', cursor: 'pointer', marginRight: '16px' }}>
            ☁️ Buluttan Çek
          </button>
        
        <button className="btn-currency-toggle" onClick={handleExport} title="Verileri Yedekle" style={{ background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }}>
          💾 Yedekle
        </button>
        <button className="btn-currency-toggle" onClick={handleImport} title="Verileri Yükle" style={{ background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '8px' }}>
          📂 Yükle
        </button>
        <button
          className="btn-currency-toggle"
          onClick={onToggleCurrency}
          title="Para Birimini Değiştir"
        >
          {displayCurrency === 'TRY' ? '₺ TRY' : '$ USD'}
        </button>
        {timeStr && (
          <span className="navbar-updated">
            Son güncelleme: <strong>{timeStr}</strong>
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
    </>
  );
}
