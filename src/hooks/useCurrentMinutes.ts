import { useEffect, useState } from 'react';
import { getCurrentLocalMinutes } from '../domain/reminder';

declare global {
  interface Window {
    __TANGGAL_TUA_NOW_MINUTES__?: number;
  }
}

export function resolveCurrentMinutes(): number {
  if (
    typeof window !== 'undefined' &&
    typeof window.__TANGGAL_TUA_NOW_MINUTES__ === 'number' &&
    Number.isFinite(window.__TANGGAL_TUA_NOW_MINUTES__)
  ) {
    return window.__TANGGAL_TUA_NOW_MINUTES__;
  }
  return getCurrentLocalMinutes();
}

/**
 * Tracks the current time-of-day in minutes, refreshing on foreground focus/visibility
 * changes and every 30s so an open app triggers the daily reminder once the time passes.
 */
export function useCurrentMinutes(): number {
  const [minutes, setMinutes] = useState<number>(() => resolveCurrentMinutes());

  useEffect(() => {
    const sync = () => {
      setMinutes(resolveCurrentMinutes());
    };

    sync();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };

    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', handleVisibility);
    const intervalId = window.setInterval(sync, 30_000);

    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, []);

  return minutes;
}
