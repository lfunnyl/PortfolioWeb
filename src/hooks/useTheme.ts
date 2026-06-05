import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

const DARK_VARS = {
  '--bg':            '#060a12',
  '--bg-2':          '#0a1020',
  '--bg-3':          '#0f1829',
  '--surface':       'rgba(255, 255, 255, 0.035)',
  '--surface-hover': 'rgba(255, 255, 255, 0.065)',
  '--border':        'rgba(255, 255, 255, 0.07)',
  '--border-bright': 'rgba(255, 255, 255, 0.14)',
  '--text':          '#eef2ff',
  '--text-muted':    '#5a6885',
  '--text-dim':      '#8899b8',
};

const LIGHT_VARS = {
  '--bg':            '#f0f4ff',
  '--bg-2':          '#ffffff',
  '--bg-3':          '#e8eef8',
  '--surface':       'rgba(0, 0, 0, 0.04)',
  '--surface-hover': 'rgba(0, 0, 0, 0.08)',
  '--border':        'rgba(0, 0, 0, 0.10)',
  '--border-bright': 'rgba(0, 0, 0, 0.20)',
  '--text':          '#0f172a',
  '--text-muted':    '#64748b',
  '--text-dim':      '#334155',
};

function applyTheme(mode: ThemeMode) {
  const vars = mode === 'dark' ? DARK_VARS : LIGHT_VARS;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // body background-image
  if (mode === 'light') {
    document.body.style.backgroundImage =
      'radial-gradient(ellipse at 15% 0%, rgba(79,142,247,0.07) 0%, transparent 45%), ' +
      'radial-gradient(ellipse at 85% 5%, rgba(139,92,246,0.05) 0%, transparent 40%)';
  } else {
    document.body.style.backgroundImage =
      'radial-gradient(ellipse at 15% 0%, rgba(79,142,247,0.12) 0%, transparent 45%), ' +
      'radial-gradient(ellipse at 85% 5%, rgba(139,92,246,0.09) 0%, transparent 40%), ' +
      'radial-gradient(ellipse at 50% 100%, rgba(16,217,130,0.05) 0%, transparent 50%)';
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme') as ThemeMode | null;
    if (saved) return saved;
    // Sistem tercihi
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    localStorage.setItem('app_theme', mode);
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return { theme, setTheme, toggleTheme };
}
