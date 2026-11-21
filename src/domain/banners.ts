import { daysBetween, formatShortDate, parseDateParts } from './dates';

export type HomeBannerKind =
  | 'payday'
  | 'reminder'
  | 'budget'
  | 'ios-install'
  | 'backup';

export interface ShouldShowBackupReminderParams {
  transactionsCount: number;
  lastExportAt: string | null;
  backupSnoozeUntil: string | null;
  today: string;
}

/**
 * Shows the backup banner when at least 10 transactions exist, the user is not
 * inside a 7-day snooze window, and no export happened in the last 30 days.
 */
export function shouldShowBackupReminder(
  params: ShouldShowBackupReminderParams
): boolean {
  const { transactionsCount, lastExportAt, backupSnoozeUntil, today } = params;
  if (transactionsCount < 10) return false;
  if (backupSnoozeUntil && today < backupSnoozeUntil) return false;
  if (!lastExportAt) return true;

  const exportDate = lastExportAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exportDate)) return true;

  return daysBetween(exportDate, today) > 30;
}

export function formatLastBackupLabel(
  lastExportAt: string | null,
  currentToday: string
): string {
  if (!lastExportAt) return 'Belum pernah';
  const dateStr = lastExportAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Belum pernah';

  const { year } = parseDateParts(dateStr);
  const formattedDate = `${formatShortDate(dateStr)} ${year}`;
  const diff = daysBetween(dateStr, currentToday);
  if (diff <= 0) {
    return `${formattedDate} (hari ini)`;
  }
  return `${formattedDate} (${diff} hari lalu)`;
}

export interface PickHomeBannerInput {
  payday: boolean;
  reminder: boolean;
  budget: boolean;
  iosInstall: boolean;
  backup: boolean;
}

/**
 * Enforces the single-banner rule on Home with fixed priority:
 * payday > reminder > budget > ios-install > backup.
 */
export function pickHomeBanner(
  candidates: PickHomeBannerInput
): HomeBannerKind | null {
  if (candidates.payday) return 'payday';
  if (candidates.reminder) return 'reminder';
  if (candidates.budget) return 'budget';
  if (candidates.iosInstall) return 'ios-install';
  if (candidates.backup) return 'backup';
  return null;
}
