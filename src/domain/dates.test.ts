import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  defaultNextPayday,
  formatHistoryDayHeader,
  formatShortDate,
  rollPayday,
} from './dates';

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
});
