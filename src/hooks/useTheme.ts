import { useEffect } from 'react';
import type { ThemePreference } from '../domain/types';

export const THEME_STORAGE_KEY = 'tanggal-tua-theme';

export function normalizeThemePreference(value: unknown): ThemePreference {
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'light' || lower === 'dark' || lower === 'system') {
      return lower;
    }
  }
  return 'system';
}

export function resolveEffectiveTheme(theme: ThemePreference): 'light' | 'dark' {
  const normalized = normalizeThemePreference(theme);
  if (normalized === 'light' || normalized === 'dark') {
    return normalized;
  }

  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return prefersDark ? 'dark' : 'light';
}

export function applyThemeToDocument(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const normalized = normalizeThemePreference(theme);

  try {
    if (normalized === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    }
  } catch {
    // Ignore storage block in strict private mode
  }

  const resolved = resolveEffectiveTheme(normalized);
  document.documentElement.setAttribute('data-theme', resolved);

  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', normalized === 'system' ? 'light dark' : normalized);
  }
}

export function useTheme(theme: ThemePreference): void {
  const normalized = normalizeThemePreference(theme);

  useEffect(() => {
    applyThemeToDocument(normalized);

    if (
      normalized !== 'system' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyThemeToDocument('system');
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [normalized]);
}
