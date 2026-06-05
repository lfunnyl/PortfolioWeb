import { useState, useCallback } from 'react';
import { AppNotification } from '../hooks/useNotifications';

const TYPE_STYLES: Record<AppNotification['type'], { border: string; bg: string; icon: string }> = {
  danger:  { border: 'rgba(245,73,90,0.5)',   bg: 'rgba(245,73,90,0.1)',   icon: '🚨' },
  warning: { border: 'rgba(245,158,11,0.5)',  bg: 'rgba(245,158,11,0.1)',  icon: '⚠️' },
  success: { border: 'rgba(16,217,130,0.5)',  bg: 'rgba(16,217,130,0.1)', icon: '✅' },
  info:    { border: 'rgba(79,142,247,0.5)',  bg: 'rgba(79,142,247,0.1)',  icon: 'ℹ️' },
};

interface Props {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 9000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      maxWidth: '360px',
      width: '100%',
      pointerEvents: 'none',
    }}>
      {notifications.map((n) => {
        const s = TYPE_STYLES[n.type];
        return (
          <div
            key={n.id}
            style={{
              background: `var(--bg-2)`,
              border: `1px solid ${s.border}`,
              borderLeft: `4px solid ${s.border}`,
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              animation: 'notifSlideIn 0.3s ease',
              pointerEvents: 'auto',
              backdropFilter: 'blur(12px)',
              backgroundColor: `color-mix(in srgb, var(--bg-2) 85%, transparent)`,
            }}
          >
            <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                {n.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                {n.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(n.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0 0.2rem',
                lineHeight: 1,
                flexShrink: 0,
                marginTop: '-2px',
              }}
              title="Kapat"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Kullanımı kolaylaştıran state hook ──────────────────────────────────────
export function useToastState() {
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const addNotifications = useCallback((notifs: AppNotification[]) => {
    setToasts(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const newOnes = notifs.filter(n => !existingIds.has(n.id));
      return [...prev, ...newOnes];
    });
    // Her bildirim 8 saniye sonra otomatik kapanır
    notifs.forEach(n => {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== n.id));
      }, 8000);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addNotifications, dismiss };
}
