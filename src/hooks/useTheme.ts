import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('jfo-theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    localStorage.setItem('jfo-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.classList.toggle('light', next === 'light');
    window.dispatchEvent(new CustomEvent('jfo-theme-change', { detail: next }));
  };

  return { theme, toggle, isDark: theme === 'dark' };
}
