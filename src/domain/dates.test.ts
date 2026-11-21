import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  defaultNextPayday,
  formatHistoryDayHeader,
  formatShortDate,
  formatWeekdayShortDate,
  getIsoWeekday,
  getNextWeeklyPayday,
  rollPayday,
} from './dates';
import type { PaydayWeekday } from './types';

describe('dates domain functions', () => {
  it('computes calendar daysBetween correctly (18 Nov to 1 Dec = 13 days)', () => {
    expect(daysBetween('2026-11-18', '2026-12-01')).toBe(13);
    expect(daysBetween('2026-11-18', '2026-11-19')).toBe(1);
    expect(daysBetween('2026-11-18', '2026-11-18')).toBe(0);
    expect(daysBetween('2026-12-28', '2027-01-05')).toBe(8);
  });

  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDays('2026-11-18', -1)).toBe('2026-11-17');
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('formats short dates in Indonesian', () => {
    expect(formatShortDate('2026-12-01')).toBe('1 Des');
    expect(formatShortDate('2026-11-18')).toBe('18 Nov');
    expect(formatShortDate('2026-08-05')).toBe('5 Agu');
  });

  it('formats history day headers relative to today', () => {
    expect(formatHistoryDayHeader('2026-11-18', '2026-11-18')).toBe('Hari ini');
    expect(formatHistoryDayHeader('2026-11-17', '2026-11-18')).toBe('Kemarin');
    expect(formatHistoryDayHeader('2026-11-10', '2026-11-18')).toBe('Sel, 10 Nov');
  });

  it('computes default next payday as 1st of next month', () => {
    expect(defaultNextPayday('2026-11-18')).toBe('2026-12-01');
    expect(defaultNextPayday('2026-12-15')).toBe('2027-01-01');
  });

  it('rolls recurring payday across 30-day months, February, and year boundaries', () => {
    // Payday not yet reached: keep as is
    expect(rollPayday('2026-11-18', '2026-12-01', 1)).toEqual({
      nextPayday: '2026-12-01',
      rolled: false,
    });

    // Payday reached today (1 Dec), roll to 1 Jan next year
    expect(rollPayday('2026-12-01', '2026-12-01', 1)).toEqual({
      nextPayday: '2027-01-01',
      rolled: true,
    });

    // PaydayDay = 31 when rolling into a 30-day month (April)
    expect(rollPayday('2026-03-31', '2026-03-31', 31)).toEqual({
      nextPayday: '2026-04-30',
      rolled: true,
    });

    // PaydayDay = 31 when rolling into February non-leap year
    expect(rollPayday('2026-01-31', '2026-01-31', 31)).toEqual({
      nextPayday: '2026-02-28',
      rolled: true,
    });
  });

  it('computes next weekly payday strictly after today (1..7 days) for all 7 weekdays, cross-month, and cross-year', () => {
    // 2026-11-21 is Saturday (weekday = 6)
    expect(getIsoWeekday('2026-11-21')).toBe(6);

    const expectedFromSaturday: Record<PaydayWeekday, string> = {
      1: '2026-11-23', // Monday (+2)
      2: '2026-11-24', // Tuesday (+3)
      3: '2026-11-25', // Wednesday (+4)
      4: '2026-11-26', // Thursday (+5)
      5: '2026-11-27', // Friday (+6)
      6: '2026-11-28', // Saturday (+7, today excluded)
      7: '2026-11-22', // Sunday (+1)
    };

    for (const [wd, expectedDate] of Object.entries(expectedFromSaturday)) {
      const weekday = Number(wd) as PaydayWeekday;
      const next = getNextWeeklyPayday('2026-11-21', weekday);
      expect(next).toBe(expectedDate);
      const diff = daysBetween('2026-11-21', next);
      expect(diff).toBeGreaterThanOrEqual(1);
      expect(diff).toBeLessThanOrEqual(7);
    }

    // Friday -> Saturday = +1 day
    expect(getNextWeeklyPayday('2026-11-20', 6)).toBe('2026-11-21');
    expect(daysBetween('2026-11-20', '2026-11-21')).toBe(1);

    // Cross month (Nov -> Dec) & February leap vs non-leap
    expect(getNextWeeklyPayday('2026-11-28', 6)).toBe('2026-12-05');
    expect(getNextWeeklyPayday('2024-02-27', 4)).toBe('2024-02-29'); // leap Feb 29 (Thu)
    expect(getNextWeeklyPayday('2026-02-26', 1)).toBe('2026-03-02'); // non-leap Feb -> Mar

    // Cross year boundaries
    expect(getNextWeeklyPayday('2026-12-31', 5)).toBe('2027-01-01'); // Thu -> Fri
    expect(getNextWeeklyPayday('2026-12-28', 1)).toBe('2027-01-04'); // Mon -> Mon +7

    // Format weekday + short date
    expect(formatWeekdayShortDate('2026-11-28')).toBe('Sabtu, 28 Nov');
  });

  it('rolls weekly payday when reached or missed by multiple weeks, while leaving none unchanged', () => {
    // Not yet reached -> unchanged
    expect(
      rollPayday('2026-11-21', '2026-11-28', {
        paydayRepeat: 'weekly',
        paydayDay: null,
        paydayWeekday: 6,
      })
    ).toEqual({
      nextPayday: '2026-11-28',
      rolled: false,
    });

    // Reached exact day -> +7
    expect(
      rollPayday('2026-11-28', '2026-11-28', {
        paydayRepeat: 'weekly',
        paydayDay: null,
        paydayWeekday: 6,
      })
    ).toEqual({
      nextPayday: '2026-12-05',
      rolled: true,
    });

    // App unopened for 3+ weeks (missed 2026-11-21, opened 2026-12-13 Sun) -> rolls to next Saturday > today
    expect(
      rollPayday('2026-12-13', '2026-11-21', {
        paydayRepeat: 'weekly',
        paydayDay: null,
        paydayWeekday: 6,
      })
    ).toEqual({
      nextPayday: '2026-12-19',
      rolled: true,
    });

    // App opened exactly 3 weeks later (2026-12-12 Sat) -> rolls to next Saturday (+7)
    expect(
      rollPayday('2026-12-12', '2026-11-21', {
        paydayRepeat: 'weekly',
        paydayDay: null,
        paydayWeekday: 6,
      })
    ).toEqual({
      nextPayday: '2026-12-19',
      rolled: true,
    });

    // Mode 'none' never auto-rolls
    expect(
      rollPayday('2026-12-01', '2026-11-28', {
        paydayRepeat: 'none',
        paydayDay: null,
        paydayWeekday: null,
      })
    ).toEqual({
      nextPayday: '2026-11-28',
      rolled: false,
    });
  });
});
