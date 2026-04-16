export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;   // TRY
  currentAmount?: number; // opsiyonel: portföy değerinden otomatik alınabilir
  emoji: string;
  deadline?: string;      // ISO date, opsiyonel
  createdAt: string;
}

const STORAGE_KEY = 'financial_goals';

export function getGoals(): FinancialGoal[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveGoal(goal: FinancialGoal): void {
  const goals = getGoals().filter(g => g.id !== goal.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...goals, goal]));
}

export function deleteGoal(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getGoals().filter(g => g.id !== id)));
}

export const GOAL_PRESETS = [
  { name: 'Ev Almak',          emoji: '🏠', target: 5_000_000 },
  { name: 'Araba',             emoji: '🚗', target: 2_000_000 },
  { name: 'Emeklilik Fonu',    emoji: '🏖️', target: 10_000_000 },
  { name: 'Eğitim Fonu',       emoji: '🎓', target: 1_500_000 },
  { name: 'Acil Durum Fonu',   emoji: '🛡️', target: 500_000  },
  { name: 'Seyahat',           emoji: '✈️', target: 200_000  },
  { name: 'Yatırım Sermayesi', emoji: '💼', target: 3_000_000 },
];
