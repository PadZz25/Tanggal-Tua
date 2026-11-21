import { describe, expect, it } from 'vitest';
import { parseTimeToMinutes, shouldShowDailyReminder } from './reminder';
import type { DayMark, Transaction } from './types';

describe('daily reminder domain logic', () => {
  const baseParams = {
    enabled: true,
    reminderTime: '20:00',
    currentMinutes: 20 * 60 + 5,
    today: '2026-11-22',
    dismissedDate: null as string | null,
    transactions: [] as Array<Pick<Transaction, 'type' | 'date'>>,
    dayMarks: [] as Array<Pick<DayMark, 'date' | 'kind'>>,
  };

  it('parses valid HH:mm strings and rejects invalid values', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('20:15')).toBe(1215);
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
    expect(parseTimeToMinutes('bad')).toBeNull();
  });

  it('hides when disabled or before target hour', () => {
    expect(shouldShowDailyReminder({ ...baseParams, enabled: false })).toBe(false);
    expect(
      shouldShowDailyReminder({ ...baseParams, currentMinutes: 19 * 60 + 59 })
    ).toBe(false);
    expect(
      shouldShowDailyReminder({ ...baseParams, currentMinutes: 20 * 60 })
    ).toBe(true);
  });

  it('hides once today has an expense or income transaction, but still shows for adjustment-only', () => {
    expect(
      shouldShowDailyReminder({
        ...baseParams,
        transactions: [{ type: 'expense', date: '2026-11-22' }],
      })
    ).toBe(false);
    expect(
      shouldShowDailyReminder({
        ...baseParams,
        transactions: [{ type: 'income', date: '2026-11-22' }],
      })
    ).toBe(false);
    expect(
      shouldShowDailyReminder({
        ...baseParams,
        transactions: [{ type: 'adjustment', date: '2026-11-22' }],
      })
    ).toBe(true);
  });

  it('hides when today has a no_spend dayMark', () => {
    expect(
      shouldShowDailyReminder({
        ...baseParams,
        dayMarks: [{ date: '2026-11-22', kind: 'no_spend' }],
      })
    ).toBe(false);
  });

  it('hides when dismissed today, and re-appears on the next day', () => {
    expect(
      shouldShowDailyReminder({
        ...baseParams,
        dismissedDate: '2026-11-22',
      })
    ).toBe(false);
    expect(
      shouldShowDailyReminder({
        ...baseParams,
        today: '2026-11-23',
        dismissedDate: '2026-11-22',
      })
    ).toBe(true);
  });
});
