import { collectLoggedDates } from './streak';
import type { DayMark, Transaction } from './types';

export const REMINDER_DISMISSED_STORAGE_KEY = 'tanggal-tua-reminder-dismissed-date';

/**
 * Parses "HH:mm" into total minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function getCurrentLocalMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export interface ShouldShowDailyReminderParams {
  enabled: boolean;
  reminderTime: string;
  currentMinutes: number;
  today: string;
  dismissedDate: string | null;
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'date'>>;
  dayMarks: ReadonlyArray<Pick<DayMark, 'date' | 'kind'>>;
}

/**
 * Determines whether the in-app daily reminder card should appear on Home:
 * active, past or at reminderTime, not dismissed today, and today is still unlogged.
 */
export function shouldShowDailyReminder(
  params: ShouldShowDailyReminderParams
): boolean {
  const {
    enabled,
    reminderTime,
    currentMinutes,
    today,
    dismissedDate,
    transactions,
    dayMarks,
  } = params;

  if (!enabled) return false;
  if (dismissedDate === today) return false;

  const targetMinutes = parseTimeToMinutes(reminderTime);
  if (targetMinutes === null || currentMinutes < targetMinutes) {
    return false;
  }

  const loggedDates = collectLoggedDates(transactions, dayMarks);
  return !loggedDates.has(today);
}

let memoryDismissedDate: string | null = null;

export function readDismissedReminderDate(): string | null {
  if (typeof window === 'undefined') return memoryDismissedDate;
  try {
    if (typeof window.localStorage?.getItem === 'function') {
      return window.localStorage.getItem(REMINDER_DISMISSED_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors in private mode
  }
  return memoryDismissedDate;
}

export function writeDismissedReminderDate(date: string): void {
  memoryDismissedDate = date;
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.localStorage?.setItem === 'function') {
      window.localStorage.setItem(REMINDER_DISMISSED_STORAGE_KEY, date);
    }
  } catch {
    // Ignore storage access errors in private mode
  }
}

export function clearDismissedReminderDate(): void {
  memoryDismissedDate = null;
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.localStorage?.removeItem === 'function') {
      window.localStorage.removeItem(REMINDER_DISMISSED_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors in private mode
  }
}
