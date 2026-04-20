import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { addEntry } from '../utils/storage';
import { getAssetDefinitions } from '../services/priceService';
import { AssetEntry } from '../types/asset';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface Connector {
  id?: number;
  provider: string;
  name: string;
  apiKey?: string;
  apiSecret?: string;
  walletAddress?: string;
  isActive: boolean;
}

interface SyncedBalance {
  provider: string;
  asset: string;
  quantity: number;
}

type ProviderMeta = {
  label: string;
  icon: string;
  color: string;
  type: 'api' | 'wallet';
  hint: string;
};

const PROVIDERS: Record<string, ProviderMeta> = {
  binance: {
    label: 'Binance',
    icon: '🟡',
    color: '#f0b90b',
    type: 'api',
    hint: 'Yalnızca okuma (read-only) API anahtarı oluşturmanız önerilir.',
  },
  metamask: {
    label: 'MetaMask / EVM Cüzdanı',
    icon: '🦊',
    color: '#e2761b',
    type: 'wallet',
    hint: 'Cüzdan adresinizi girin. Özel anahtar (private key) asla istenmez.',
  },
  etherscan: {
    label: 'Ethereum Cüzdanı',
    icon: '⬡',
    color: '#627eea',
    type: 'wallet',
    hint: 'Public Ethereum adresinizi girin (0x…).',
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function ConnectorView() {
  const { token, isAuthenticated } = useAuth();

  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [syncedBalances, setSyncedBalances] = useState<SyncedBalance[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [provider, setProvider] = useState('binance');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const selectedMeta = PROVIDERS[provider];
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ── Fetch existing connectors ──────────────────────────────────────────────
  async function fetchConnectors() {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(apiUrl('/connectors/'), { headers: authHeaders });
      if (res.ok) setConnectors(await res.json());
    } catch (e) {
      console.error('Bağlantılar alınamadı:', e);
    }
  }

  useEffect(() => { fetchConnectors(); }, [isAuthenticated]);

  // ── Add connector ──────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const body: Connector = {
        provider,
        name: name.trim() || selectedMeta.label,
        apiKey: selectedMeta.type === 'api' ? apiKey : undefined,
        apiSecret: selectedMeta.type === 'api' ? apiSecret : undefined,
        walletAddress: selectedMeta.type === 'wallet' ? walletAddress : undefined,
        isActive: true,
      };
      const res = await fetch(apiUrl('/connectors/'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage({ text: 'Bağlantı başarıyla eklendi!', type: 'ok' });
        setShowAddForm(false);
        setName(''); setApiKey(''); setApiSecret(''); setWalletAddress('');
        fetchConnectors();
      } else {
        const err = await res.json();
        setMessage({ text: err.detail || 'Eklenemedi.', type: 'err' });
      }
    } catch {
      setMessage({ text: 'Sunucu bağlantı hatası.', type: 'err' });
    } finally {
      setLoading(false);
    }
  }

  // ── Delete connector ───────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm('Bu bağlantıyı silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(apiUrl(`/connectors/${id}`), { method: 'DELETE', headers: authHeaders });
      if (res.ok) fetchConnectors();
    } catch { /* silent */ }
  }

  // ── Trigger sync ───────────────────────────────────────────────────────────
  async function handleSync() {
    setSyncLoading(true);
    setSyncedBalances([]);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/connectors/trigger-sync'), {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setSyncedBalances(data);
        setMessage({ text: `${data.length} adet bakiye verisi çekildi!`, type: 'ok' });
      } else {
        setMessage({ text: 'Senkronizasyon başarısız.', type: 'err' });
      }
    } catch {
      setMessage({ text: 'Sunucu bağlantı hatası.', type: 'err' });
    } finally {
      setSyncLoading(false);
    }
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="glass-card adv-section" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
        <h3 style={{ marginBottom: '0.5rem' }}>Cüzdan & Broker Bağlantıları</h3>
        <p className="adv-hint">Bu özelliği kullanmak için önce giriş yapmanız gerekiyor.</p>
      </div>
    );
  }

  return (
    <div className="pro-view">
      <div className="pro-badge-bar">
        <span className="pro-badge">🔗 CÜZDANLAR</span>
        <span className="pro-subtitle">Otomatik Bakiye Takibi</span>
      </div>

      {/* ══ Info Banner ══════════════════════════════════════════════════════ */}
      <div className="glass-card adv-section" style={{ borderLeft: '3px solid #f0b90b' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          🛡️ <strong>Güvenlik:</strong> API anahtarlarınız sunucuya kaydedilmeden önce{' '}
          <strong>AES-256 şifrelemesiyle (Fernet)</strong> korunmaktadır. Özel anahtar (Private Key)
          asla istenmez ve saklanmaz. Binance için yalnızca <strong>"Okuma" yetkili</strong> API anahtarı oluşturmanızı öneririz.
        </p>
      </div>

      {/* ══ Connector List ═══════════════════════════════════════════════════ */}
      <div className="glass-card adv-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="adv-title" style={{ marginBottom: 0 }}>Aktif Bağlantılar</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {connectors.length > 0 && (
              <button
                className="btn-primary"
                onClick={handleSync}
                disabled={syncLoading}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              >
                {syncLoading ? '⏳ Senkronize ediliyor...' : '⚡ Tümünü Senkronize Et'}
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => setShowAddForm(v => !v)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', background: showAddForm ? '#4b5563' : undefined }}
            >
              {showAddForm ? '✕ İptal' : '+ Bağlantı Ekle'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            background: message.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: message.type === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${message.type === 'ok' ? '#10b98140' : '#ef444440'}`,
          }}>
            {message.type === 'ok' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {connectors.length === 0 && !showAddForm ? (
          <p className="adv-hint" style={{ textAlign: 'center', padding: '2rem 0' }}>
            Henüz bağlantı yok. "+ Bağlantı Ekle" ile başlayın.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {connectors.map(conn => {
              const meta = PROVIDERS[conn.provider] ?? { label: conn.provider, icon: '🔌', color: '#94a3b8' };
              return (
                <div key={conn.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${meta.color}40`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{conn.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {meta.label}
                        {conn.walletAddress && ` · ${conn.walletAddress.slice(0, 8)}…${conn.walletAddress.slice(-6)}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '99px',
                      background: conn.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)',
                      color: conn.isActive ? '#10b981' : '#6b7280',
                    }}>
                      {conn.isActive ? '● Aktif' : '○ Pasif'}
                    </span>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => conn.id && handleDelete(conn.id)}
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Add Form ═════════════════════════════════════════════════════════ */}
      {showAddForm && (
        <div className="glass-card adv-section">
          <h3 className="adv-title">Yeni Bağlantı Ekle</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Provider Selection */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Platform / Sağlayıcı</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {Object.entries(PROVIDERS).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProvider(key)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: `1px solid ${provider === key ? meta.color : 'var(--border)'}`,
                      background: provider === key ? `${meta.color}20` : 'transparent',
                      color: provider === key ? meta.color : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: provider === key ? 600 : 400,
                      transition: 'all 0.2s',
                    }}
                  >
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.4rem 0 0' }}>
                ℹ️ {selectedMeta.hint}
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Bağlantı Adı (İsteğe Bağlı)</label>
              <input
                type="text"
                placeholder={`Örn: ${selectedMeta.label} Ana hesabım`}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {selectedMeta.type === 'api' ? (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>API Anahtarı (Key)</label>
                  <input
                    type="text"
                    required
                    placeholder="API Key..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>API Gizli Anahtar (Secret)</label>
                  <input
                    type="password"
                    required
                    placeholder="API Secret..."
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cüzdan Adresi</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '0.5rem' }}>
              {loading ? '⏳ Kaydediliyor...' : '🔗 Bağlantıyı Kaydet'}
            </button>
          </form>
        </div>
      )}

      {/* ══ Synced Balances ══════════════════════════════════════════════════ */}
      {syncedBalances.length > 0 && (
        <div className="glass-card adv-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="adv-title" style={{ marginBottom: 0 }}>📊 Çekilen Bakiyeler</h3>
            <button
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              onClick={() => {
                const defs = getAssetDefinitions();
                let addedCount = 0;

                syncedBalances.forEach(b => {
                  if (b.quantity <= 0) return;
                  // Binance returns 'BTC', we map to 'BTC' crypto or 'XAU' etc.
                  let match = defs.find(d => d.symbol === b.asset || d.id === b.asset);
                  if (!match && b.asset === 'ETH') match = defs.find(d => d.id === 'ETH');

                  if (match) {
                    const entry: AssetEntry = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      assetId: match.id,
                      quantity: b.quantity,
                      purchasePriceTRY: 0,
                      purchaseDate: new Date().toISOString().split('T')[0],
                      createdAt: new Date().toISOString(),
                      broker: PROVIDERS[b.provider]?.label || b.provider,
                      note: 'Otomatik Senkronizasyon'
                    };
                    addEntry(entry);
                    addedCount++;
                  }
                });

                setMessage({ text: `${addedCount} adet varlık portföye yüklendi!`, type: 'ok' });
              }}
            >
              📥 Tümünü Portföye Ekle
            </button>
          </div>
          <p className="adv-hint" style={{ marginTop: '0.5rem' }}>
            Bu veriler portföyünüze otomatik yüklenmedi. İnceleyip "Tümünü Portföye Ekle" butonu ile senkronize edebilirsiniz. (Maliyetler 0 ₺ olarak eklenecektir, sonradan düzenleyebilirsiniz).
          </p>
          <div className="table-wrapper">
            <table className="asset-table">
              <thead>
                <tr><th>Platform</th><th>Varlık</th><th>Miktar</th></tr>
              </thead>
              <tbody>
                {syncedBalances
                  .filter(b => b.quantity > 0.000001)
                  .map((b, i) => (
                    <tr key={i} className="asset-row">
                      <td>{PROVIDERS[b.provider]?.icon ?? '🔌'} {PROVIDERS[b.provider]?.label ?? b.provider}</td>
                      <td><strong>{b.asset}</strong></td>
                      <td className="mono">{b.quantity.toFixed(8)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
