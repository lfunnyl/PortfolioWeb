import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type AuthView = 'login' | 'register' | 'verify_sent' | 'forgot' | 'forgot_sent';

interface AuthModalProps {
  onClose: () => void;
}

const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{
      background: 'linear-gradient(145deg, #0d1525, #0a1020)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '22px',
      padding: '2rem',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
      animation: 'slideUp 0.22s ease',
      position: 'relative',
    }}>
      {children}
    </div>
  </div>
);

const Input = ({ label, type = 'text', value, onChange, placeholder, extra }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; extra?: React.ReactNode;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
    <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5a6885' }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '12px',
          color: '#eef2ff',
          padding: '0.7rem 0.95rem',
          fontSize: '0.95rem',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'all 0.18s',
          paddingRight: extra ? '44px' : undefined,
          boxSizing: 'border-box',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'rgba(79,142,247,0.6)';
          e.target.style.boxShadow = '0 0 0 3px rgba(79,142,247,0.15)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'rgba(255,255,255,0.09)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {extra}
    </div>
  </div>
);

// Firebase hata kodlarını Türkçeye çevir
function firebaseErrorToTurkish(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Bu e-posta adresi zaten kayıtlı.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/weak-password': 'Şifre çok zayıf. En az 6 karakter olmalı.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
    'auth/wrong-password': 'Hatalı şifre. Lütfen tekrar deneyin.',
    'auth/invalid-credential': 'Hatalı e-posta veya şifre.',
    'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen bir süre bekleyin.',
    'auth/network-request-failed': 'İnternet bağlantınızı kontrol edin.',
    'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
  };
  return map[code] || 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register, sendPasswordReset } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── GİRİŞ YAP ────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(firebaseErrorToTurkish(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── KAYIT OL ─────────────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      setLoading(false); return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      setLoading(false); return;
    }

    try {
      await register(email, password);
      setView('verify_sent');
    } catch (err: any) {
      setError(firebaseErrorToTurkish(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── ŞİFREMİ UNUTTUM ──────────────────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await sendPasswordReset(email);
      setView('forgot_sent');
    } catch (err: any) {
      setError(firebaseErrorToTurkish(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── BUTONLAR ─────────────────────────────────────────────────────────────
  const SubmitBtn = ({ children }: { children: React.ReactNode }) => (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', padding: '0.82rem',
        background: loading ? 'rgba(79,142,247,0.4)' : 'linear-gradient(135deg, #4f8ef7, #8b5cf6)',
        border: 'none', borderRadius: '13px',
        color: '#fff', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : '0 4px 20px rgba(79,142,247,0.35)',
        transition: 'all 0.18s', letterSpacing: '0.02em',
        marginTop: '0.5rem',
      }}
    >
      {loading ? '⏳ İşlem yapılıyor...' : children}
    </button>
  );

  const TextBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', color: '#5a6885',
      fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
      padding: '0.3rem 0', transition: 'color 0.15s',
    }}
      onMouseEnter={e => (e.target as HTMLButtonElement).style.color = '#8899b8'}
      onMouseLeave={e => (e.target as HTMLButtonElement).style.color = '#5a6885'}
    >
      {children}
    </button>
  );

  const CloseBtn = () => (
    <button onClick={onClose} style={{
      position: 'absolute', top: '1.2rem', right: '1.2rem',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px', color: '#5a6885', cursor: 'pointer',
      width: '28px', height: '28px', fontSize: '0.9rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}>✕</button>
  );

  const Logo = () => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.4rem', color: '#4f8ef7', filter: 'drop-shadow(0 0 8px rgba(79,142,247,0.4))' }}>◈</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PortföyTakip</span>
      </div>
    </div>
  );

  // ── E-POSTA DOĞRULAMA / ŞİFRE SIFIRLA GÖNDER EKRANI ─────────────────────
  if (view === 'verify_sent' || view === 'forgot_sent') {
    return (
      <Modal onClose={onClose}>
        <CloseBtn />
        <Logo />
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {view === 'verify_sent' ? '📬' : '🔑'}
          </div>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.1rem', color: '#eef2ff' }}>
            {view === 'verify_sent' ? 'E-postanızı Kontrol Edin' : 'Link Gönderildi'}
          </h3>
          <p style={{ color: '#5a6885', lineHeight: 1.7, fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            {view === 'verify_sent'
              ? <><strong style={{ color: '#8899b8' }}>{email}</strong> adresine doğrulama linki gönderdik. Doğruladıktan sonra giriş yapabilirsiniz.</>
              : <>Eğer <strong style={{ color: '#8899b8' }}>{email}</strong> kayıtlıysa, şifre sıfırlama linki gönderildi.</>
            }
          </p>
        </div>
        <button
          onClick={() => { setView('login'); setError(''); }}
          style={{
            width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: '13px',
            color: '#8899b8', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >← Giriş sayfasına dön</button>
      </Modal>
    );
  }

  // ── ŞİFREMİ UNUTTUM EKRANI ───────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <Modal onClose={onClose}>
        <CloseBtn />
        <Logo />
        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.15rem', color: '#eef2ff' }}>Şifremi Unuttum</h3>
        <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Kayıtlı E-posta" type="email" value={email} onChange={setEmail} placeholder="email@adresiniz.com" />
          {error && <div style={{ background: 'rgba(245,73,90,0.1)', border: '1px solid rgba(245,73,90,0.25)', borderRadius: '10px', padding: '0.6rem 0.85rem', color: '#fda4af', fontSize: '0.83rem' }}>⚠ {error}</div>}
          <SubmitBtn>📩 Sıfırlama Linki Gönder</SubmitBtn>
          <TextBtn onClick={() => { setView('login'); setError(''); }}>← Giriş sayfasına dön</TextBtn>
        </form>
      </Modal>
    );
  }

  // ── GİRİŞ / KAYIT EKRANI ─────────────────────────────────────────────────
  const isLogin = view === 'login';
  return (
    <Modal onClose={onClose}>
      <CloseBtn />
      <Logo />

      {/* Tab */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '3px', marginBottom: '1.5rem' }}>
        {(['login', 'register'] as const).map(v => (
          <button key={v} type="button" onClick={() => { setView(v); setError(''); }}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '9px', border: 'none',
              background: view === v ? 'rgba(79,142,247,0.2)' : 'transparent',
              color: view === v ? '#60a5fa' : '#5a6885',
              fontSize: '0.84rem', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              transition: 'all 0.18s',
            }}>
            {v === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        ))}
      </div>

      <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input label="E-posta" type="email" value={email} onChange={setEmail} placeholder="email@adresiniz.com" />
        <Input
          label={`Şifre${!isLogin ? ' (en az 6 karakter)' : ''}`}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          extra={
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#5a6885', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
              {showPassword ? '👁' : '🔒'}
            </button>
          }
        />
        {!isLogin && (
          <Input label="Şifre Tekrar" type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={setPasswordConfirm} placeholder="••••••••" />
        )}

        {error && (
          <div style={{ background: 'rgba(245,73,90,0.1)', border: '1px solid rgba(245,73,90,0.25)', borderRadius: '10px', padding: '0.6rem 0.85rem', color: '#fda4af', fontSize: '0.83rem' }}>
            ⚠ {error}
          </div>
        )}

        <SubmitBtn>{isLogin ? '→ Giriş Yap' : '🚀 Hesap Oluştur'}</SubmitBtn>

        {isLogin && (
          <div style={{ textAlign: 'right' }}>
            <TextBtn onClick={() => { setView('forgot'); setError(''); }}>Şifremi unuttum</TextBtn>
          </div>
        )}
      </form>
    </Modal>
  );
}
