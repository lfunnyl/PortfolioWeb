import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { importData } from '../utils/storage';

type AuthView = 'login' | 'register' | 'verify_sent' | 'forgot' | 'forgot_sent';

interface AuthModalProps {
  onClose: () => void;
}

// ── Ortak container ──────────────────────────────────────────────────────
const Modal = ({ children }: { children: React.ReactNode }) => (
  <div className="modal-overlay">
    <div className="glass-card modal-content" style={{ maxWidth: '400px', width: '90%' }}>
      {children}
    </div>
  </div>
);

export function AuthModal({ onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('username', email);
      fd.append('password', password);
      const res = await fetch(apiUrl('/auth/login'), { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        login(data.access_token, email);
        
        // Giriş başarılı olunca hemen portföyü çek
        try {
           const syncRes = await fetch(apiUrl('/portfolio/sync'), {
               headers: { 'Authorization': `Bearer ${data.access_token}` }
           });
           if (syncRes.ok) {
               const syncData = await syncRes.json();
               const importPayload = {
                 entries: syncData.entries || [],
                 sales: syncData.sales || [],
                 dividends: syncData.dividends || [],
                 options: syncData.options || []
               };
               importData(JSON.stringify(importPayload));
           }
        } catch(e) {}
        
        onClose();
        window.location.reload(); // Değişikliklerin anında görünmesi için
      } else {
        const err = await res.json();
        // E-posta doğrulanmamış özel hata
        if (res.status === 403) {
          setError('E-posta adresiniz doğrulanmadı. Gelen kutunuzu kontrol edin.');
        } else {
          setError(err.detail || 'Giriş yapılamadı.');
        }
      }
    } catch { setError('Sunucu bağlantı hatası.'); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    if (password.length < 8) { setError('Şifre en az 8 karakter olmalıdır.'); setLoading(false); return; }
    if (password !== passwordConfirm) { setError('Şifreler eşleşmiyor.'); setLoading(false); return; }
    try {
      const res = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setView('verify_sent');
      } else {
        const err = await res.json();
        setError(err.detail || 'Kayıt yapılamadı.');
      }
    } catch { setError('Sunucu bağlantı hatası.'); }
    finally { setLoading(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await fetch(apiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setView('forgot_sent');
    } catch { setError('Sunucu bağlantı hatası.'); }
    finally { setLoading(false); }
  }

  async function handleResendVerification() {
    setLoading(true);
    try {
      await fetch(apiUrl('/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      alert('Doğrulama e-postası tekrar gönderildi!');
    } finally { setLoading(false); }
  }



  // ── Görünümler ────────────────────────────────────────────────────────────

  if (view === 'verify_sent') {
    return (
      <Modal>
        <div className="modal-header">
          <h3>✉️ E-postanızı Kontrol Edin</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📬</div>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 1rem' }}>
            <strong>{email}</strong> adresine doğrulama linki gönderdik.<br />
            Linke tıkladıktan sonra giriş yapabilirsiniz.
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            E-posta gelmediyse spam klasörünü kontrol edin.
          </p>
          <button
            className="btn-text"
            disabled={loading}
            onClick={handleResendVerification}
            style={{ fontSize: '0.85rem', color: '#a78bfa', marginTop: '0.5rem' }}
          >
            {loading ? 'Gönderiliyor...' : '↩ Tekrar gönder'}
          </button>
        </div>
        <button className="btn-primary" onClick={() => setView('login')}>
          Giriş sayfasına dön
        </button>
      </Modal>
    );
  }

  if (view === 'forgot_sent') {
    return (
      <Modal>
        <div className="modal-header">
          <h3>🔑 Şifre Sıfırlama</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📬</div>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Eğer <strong>{email}</strong> ile kayıtlı bir hesap varsa,<br />
            şifre sıfırlama linki gönderildi.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setView('login')}>
          Giriş sayfasına dön
        </button>
      </Modal>
    );
  }

  if (view === 'forgot') {
    return (
      <Modal>
        <div className="modal-header">
          <h3>🔑 Şifremi Unuttum</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label>Kayıtlı E-posta Adresiniz</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@adresiniz.com" />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Gönderiliyor...' : '📩 Sıfırlama Linki Gönder'}
          </button>
          <button type="button" className="btn-text"
            onClick={() => setView('login')}
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ← Giriş sayfasına dön
          </button>
        </form>
      </Modal>
    );
  }

  // ── Ana Görünüm: Login / Register ──────────────────────────────────────────
  const isLogin = view === 'login';
  return (
    <Modal>
      <div className="modal-header">
        <h3>{isLogin ? '🔐 Üye Girişi' : '🚀 Hızlı Kayıt'}</h3>
        <button className="btn-close" onClick={onClose}>&times;</button>
      </div>

      <form onSubmit={isLogin ? handleLogin : handleRegister}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div className="form-group">
          <label>E-posta</label>
          <input type="email" required value={email}
            onChange={e => setEmail(e.target.value)} placeholder="email@adresiniz.com" />
        </div>
        <div className="form-group" style={{ position: 'relative' }}>
          <label>Şifre {!isLogin && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(en az 8 karakter)</span>}</label>
          <input type={showPassword ? "text" : "password"} required value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: '40px' }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '10px', top: '34px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}>
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {!isLogin && (
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Şifre Tekrar</label>
            <input type={showPassword ? "text" : "password"} required value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)} placeholder="••••••••" style={{ paddingRight: '40px' }} />
          </div>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '0.25rem' }}>
          {loading ? 'İşlem yapılıyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
        </button>

        {isLogin && (
          <button type="button" className="btn-text"
            onClick={() => setView('forgot')}
            style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Şifremi unuttum
          </button>
        )}

        <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }} />

        <button type="button" className="btn-text"
          onClick={() => { setView(isLogin ? 'register' : 'login'); setError(''); }}
          style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isLogin ? 'Hesabınız yok mu? → Kayıt olun' : 'Zaten hesabınız var mı? → Giriş yapın'}
        </button>
      </form>
    </Modal>
  );
}
