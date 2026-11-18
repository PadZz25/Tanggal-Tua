import { useEffect, useState } from 'react';
import { today } from '../domain/dates';

declare global {
  interface Window {
    __TANGGAL_TUA_TODAY__?: string;
  }
}

function getEffectiveToday(): string {
  if (typeof window !== 'undefined' && window.__TANGGAL_TUA_TODAY__) {
    return window.__TANGGAL_TUA_TODAY__;
  }
  return today();
}

export function useToday(): string {
  const [currentToday, setCurrentToday] = useState<string>(() => getEffectiveToday());

  useEffect(() => {
    const syncToday = () => {
      const next = getEffectiveToday();
      setCurrentToday((prev) => (prev !== next ? next : prev));
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncToday();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', syncToday);
    window.addEventListener('tanggal-tua-clock-change', syncToday);

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      50
    );
    const msUntilMidnight = Math.max(1_000, nextMidnight.getTime() - now.getTime());

    const timer = window.setTimeout(() => {
      syncToday();
    }, msUntilMidnight);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', syncToday);
      window.removeEventListener('tanggal-tua-clock-change', syncToday);
      window.clearTimeout(timer);
    };
  }, [currentToday]);

  return currentToday;
}
