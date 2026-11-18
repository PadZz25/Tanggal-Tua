import { useEffect } from 'react';
import type { ThemePreference } from '../domain/types';

export const THEME_STORAGE_KEY = 'tanggal-tua-theme';

export function applyThemeToDocument(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;

  try {
    if (theme === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Ignore storage block in strict private mode
  }

  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);

  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', theme === 'system' ? 'light dark' : theme);
  }
}

export function useTheme(theme: ThemePreference): void {
  useEffect(() => {
    applyThemeToDocument(theme);

    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyThemeToDocument('system');
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);
}
