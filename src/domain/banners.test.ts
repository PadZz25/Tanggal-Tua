import { describe, expect, it } from 'vitest';
import {
  formatLastBackupLabel,
  pickHomeBanner,
  shouldShowBackupReminder,
} from './banners';

describe('home banner priority and backup reminder', () => {
  it('picks strictly one banner according to priority payday > reminder > budget > ios-install > backup', () => {
    expect(
      pickHomeBanner({
        payday: true,
        reminder: true,
        budget: true,
        iosInstall: true,
        backup: true,
      })
    ).toBe('payday');

    expect(
      pickHomeBanner({
        payday: false,
        reminder: true,
        budget: true,
        iosInstall: true,
        backup: true,
      })
    ).toBe('reminder');

    expect(
      pickHomeBanner({
        payday: false,
        reminder: false,
        budget: true,
        iosInstall: true,
        backup: true,
      })
    ).toBe('budget');

    expect(
      pickHomeBanner({
        payday: false,
        reminder: false,
        budget: false,
        iosInstall: true,
        backup: true,
      })
    ).toBe('ios-install');

    expect(
      pickHomeBanner({
        payday: false,
        reminder: false,
        budget: false,
        iosInstall: false,
        backup: true,
      })
    ).toBe('backup');

    expect(
      pickHomeBanner({
        payday: false,
        reminder: false,
        budget: false,
        iosInstall: false,
        backup: false,
      })
    ).toBeNull();
  });

  it('triggers backup reminder only when >= 10 transactions, > 30 days stale or never backed up, and not snoozed', () => {
    expect(
      shouldShowBackupReminder({
        transactionsCount: 9,
        lastExportAt: null,
        backupSnoozeUntil: null,
        today: '2026-11-22',
      })
    ).toBe(false);

    expect(
      shouldShowBackupReminder({
        transactionsCount: 10,
        lastExportAt: null,
        backupSnoozeUntil: null,
        today: '2026-11-22',
      })
    ).toBe(true);

    expect(
      shouldShowBackupReminder({
        transactionsCount: 12,
        lastExportAt: '2026-10-23T10:00:00.000Z',
        backupSnoozeUntil: null,
        today: '2026-11-22',
      })
    ).toBe(false);

    expect(
      shouldShowBackupReminder({
        transactionsCount: 12,
        lastExportAt: '2026-10-22T10:00:00.000Z',
        backupSnoozeUntil: null,
        today: '2026-11-22',
      })
    ).toBe(true);

    expect(
      shouldShowBackupReminder({
        transactionsCount: 12,
        lastExportAt: '2026-10-22T10:00:00.000Z',
        backupSnoozeUntil: '2026-11-29',
        today: '2026-11-28',
      })
    ).toBe(false);

    expect(
      shouldShowBackupReminder({
        transactionsCount: 12,
        lastExportAt: '2026-10-22T10:00:00.000Z',
        backupSnoozeUntil: '2026-11-29',
        today: '2026-11-29',
      })
    ).toBe(true);
  });

  it('formats last backup date in compact Indonesian format', () => {
    expect(formatLastBackupLabel(null, '2026-11-21')).toBe('Belum pernah');
    expect(
      formatLastBackupLabel('2026-11-12T08:00:00.000Z', '2026-11-21')
    ).toBe('12 Nov 2026 (9 hari lalu)');
    expect(
      formatLastBackupLabel('2026-11-21T08:00:00.000Z', '2026-11-21')
    ).toBe('21 Nov 2026 (hari ini)');
  });
});
