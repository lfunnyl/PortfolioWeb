import { useState, useEffect } from 'react';
import { FinancialGoal, getGoals, saveGoal, deleteGoal, GOAL_PRESETS } from '../utils/goals';
import { fmtCurr, fmtCompact } from '../utils/format';

interface GoalTrackerProps {
  totalPortfolioTRY: number;
  displayCurrency?: 'TRY' | 'USD';
  usdRate?: number;
}

function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export function GoalTracker({ totalPortfolioTRY, displayCurrency = 'TRY', usdRate = 1 }: GoalTrackerProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '🎯', target: '' });

  const C = displayCurrency as 'TRY' | 'USD';
  const conv = (n: number) => C === 'USD' ? n / usdRate : n;

  useEffect(() => { setGoals(getGoals()); }, []);

  function handleSave() {
    if (!form.name || !form.target) return;
    const goal: FinancialGoal = {
      id: generateId(),
      name: form.name,
      emoji: form.emoji,
      targetAmount: Number(form.target.replace(/\./g, '')),
      createdAt: new Date().toISOString(),
    };
    saveGoal(goal);
    setGoals(getGoals());
    setForm({ name: '', emoji: '🎯', target: '' });
    setAdding(false);
  }

  function handleDelete(id: string) {
    deleteGoal(id);
    setGoals(getGoals());
  }

  function handlePreset(p: typeof GOAL_PRESETS[0]) {
    setForm({ name: p.name, emoji: p.emoji, target: String(p.target) });
  }

  return (
    <div className="goal-tracker">
      <div className="goal-header">
        <div>
          <h3 className="goal-title">🎯 Finansal Hedef Takibi</h3>
          <p className="goal-subtitle">Hedeflerine ne kadar yakınsın?</p>
        </div>
        <button className="goal-add-btn" onClick={() => setAdding(v => !v)}>
          {adding ? '✕ İptal' : '+ Hedef Ekle'}
        </button>
      </div>

      {adding && (
        <div className="goal-form-card">
          <div className="gt-presets-block">
            <p className="gt-presets-label">Hazır Şablonlar:</p>
            <div className="gt-presets-list">
              {GOAL_PRESETS.map(p => (
                <button key={p.name} className="goal-preset-btn" onClick={() => handlePreset(p)}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="gt-form-grid">
            <input
              className="gt-emoji-input"
              value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2}
            />
            <input placeholder="Hedef adı (örn: Ev Almak)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="gt-target-wrap">
              <input placeholder="Hedef Tutar (TRY)" value={form.target} type="number"
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                className="gt-target-input" />
              <button className="btn-submit" style={{ padding: '0 1rem', marginTop: 0 }} onClick={handleSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 && !adding && (
        <div className="goal-empty">
          <span>🎯</span>
          <p>Henüz hedef eklenmedi. \"+ Hedef Ekle\" ile finansal hedeflerini tanımla.</p>
        </div>
      )}

      <div className="goal-list">
        {goals.map(goal => {
          const current = totalPortfolioTRY; // tüm portföyden karşılanaı
          const pct = Math.min(100, (current / goal.targetAmount) * 100);
          const remaining = Math.max(0, goal.targetAmount - current);
          const achieved = current >= goal.targetAmount;

          return (
            <div key={goal.id} className={`goal-card ${achieved ? 'goal-achieved' : ''}`}>
              <div className="goal-card-header">
                <div className="goal-card-identity">
                  <span className="goal-emoji">{goal.emoji}</span>
                  <div>
                    <div className="goal-name">{goal.name}</div>
                    <div className="goal-target-label">Hedef: <strong>{fmtCurr(conv(goal.targetAmount), C)}</strong></div>
                  </div>
                </div>
                <div className="gt-actions-wrap">
                  {achieved && <span className="goal-badge-done">✅ Ulaşıldı!</span>}
                  <button className="btn-action btn-delete" onClick={() => handleDelete(goal.id)} title="Sil">✕</button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="goal-progress-wrap">
                <div className="goal-progress-bar">
                  <div
                    className="goal-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: achieved
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : pct > 75 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                        : pct > 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                    }}
                  />
                </div>
                <span className="goal-progress-pct">{pct.toFixed(1)}%</span>
              </div>

              <div className="goal-card-stats">
                <div className="goal-stat">
                  <span>Mevcut</span>
                  <strong className="profit">{fmtCompact(conv(current), C)}</strong>
                </div>
                {!achieved && (
                  <div className="goal-stat">
                    <span>Kalan</span>
                    <strong style={{ color: 'var(--text-muted)' }}>{fmtCompact(conv(remaining), C)}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
