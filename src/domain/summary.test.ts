import { describe, expect, it } from 'vitest';
import {
  canGoNextPeriod,
  canGoPreviousPeriod,
  comparePeriods,
  getPeriodRange,
  shiftPeriod,
  summarize,
} from './summary';
import type { Transaction } from './types';

function makeTx(
  overrides: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>
): Transaction {
  return {
    id: crypto.randomUUID(),
    categoryId: overrides.type === 'adjustment' ? null : 'cat-makan',
    goalId: null,
    note: 'Test',
    occurredAt: `${overrides.date}T10:00:00.000Z`,
    source: 'quick',
    createdAt: `${overrides.date}T10:00:00.000Z`,
    updatedAt: `${overrides.date}T10:00:00.000Z`,
    ...overrides,
  };
}

describe('summary domain pure functions (0.3.0 Tugas 2)', () => {
  describe('getPeriodRange & shiftPeriod', () => {
    it('computes Monday-Sunday week ranges within the same month', () => {
      // 2026-11-18 is Wednesday -> Mon 16 Nov to Sun 22 Nov
      const range = getPeriodRange('week', '2026-11-18');
      expect(range).toEqual({
        kind: 'week',
        start: '2026-11-16',
        end: '2026-11-22',
        label: '16\u201322 Nov',
      });
    });

    it('formats cross-month and cross-year week ranges cleanly', () => {
      // 2026-10-30 (Fri) -> Mon 26 Okt to Sun 1 Nov
      const crossMonth = getPeriodRange('week', '2026-10-30');
      expect(crossMonth).toEqual({
        kind: 'week',
        start: '2026-10-26',
        end: '2026-11-01',
        label: '26 Okt\u20131 Nov',
      });

      // 2026-12-31 (Thu) -> Mon 28 Des to Sun 3 Jan 2027
      const crossYear = getPeriodRange('week', '2026-12-31');
      expect(crossYear).toEqual({
        kind: 'week',
        start: '2026-12-28',
        end: '2027-01-03',
        label: '28 Des\u20133 Jan',
      });

      const shiftedForward = shiftPeriod(crossYear, 1);
      expect(shiftedForward.start).toBe('2027-01-04');
      expect(shiftedForward.end).toBe('2027-01-10');
    });

    it('handles leap-year February (2024) and regular February (2026)', () => {
      const febLeap = getPeriodRange('month', '2024-02-15');
      expect(febLeap).toEqual({
        kind: 'month',
        start: '2024-02-01',
        end: '2024-02-29',
        label: 'Februari 2024',
      });

      const febRegular = getPeriodRange('month', '2026-02-10');
      expect(febRegular).toEqual({
        kind: 'month',
        start: '2026-02-01',
        end: '2026-02-28',
        label: 'Februari 2026',
      });

      expect(shiftPeriod(febRegular, -2)).toEqual({
        kind: 'month',
        start: '2025-12-01',
        end: '2025-12-31',
        label: 'Desember 2025',
      });
    });

    it('checks previous/next navigation boundary helpers accurately', () => {
      const currentWeek = getPeriodRange('week', '2026-11-18'); // 16-22 Nov
      expect(canGoNextPeriod(currentWeek, '2026-11-18')).toBe(false);
      expect(canGoPreviousPeriod(currentWeek, '2026-11-16')).toBe(false); // prev ends 15 Nov < 16 Nov
      expect(canGoPreviousPeriod(currentWeek, '2026-11-15')).toBe(true);
    });
  });

  describe('summarize', () => {
    it('includes boundary-date transactions and strictly excludes adjustment type', () => {
      const range = getPeriodRange('week', '2026-11-18'); // 16-22 Nov
      const txs = [
        makeTx({ type: 'expense', amount: 10_000, date: '2026-11-15', categoryId: 'cat-makan' }), // before
        makeTx({ type: 'expense', amount: 20_000, date: '2026-11-16', categoryId: 'cat-makan' }), // start boundary
        makeTx({ type: 'expense', amount: 30_000, date: '2026-11-22', categoryId: 'cat-jajan' }), // end boundary
        makeTx({ type: 'income', amount: 100_000, date: '2026-11-18', categoryId: 'cat-kiriman-ortu' }),
        makeTx({ type: 'adjustment', amount: -50_000, date: '2026-11-18' }), // excluded
        makeTx({ type: 'adjustment', amount: 90_000, date: '2026-11-19' }), // excluded
        makeTx({ type: 'expense', amount: 40_000, date: '2026-11-23', categoryId: 'cat-makan' }), // after
      ];

      const summary = summarize(txs, range, '2026-11-25', '2026-11-01');
      expect(summary.totalExpense).toBe(50_000);
      expect(summary.totalIncome).toBe(100_000);
      expect(summary.net).toBe(50_000);
      expect(summary.txCount).toBe(3);
      expect(summary.dailyTotals).toHaveLength(7);
      expect(summary.dailyTotals[0]).toEqual({ date: '2026-11-16', expense: 20_000 });
      expect(summary.dailyTotals[6]).toEqual({ date: '2026-11-22', expense: 30_000 });
    });

    it('ensures byCategory percentages sum to exactly 100 across tricky rounding cases (largest remainder)', () => {
      const range = getPeriodRange('week', '2026-11-18');

      // Case A: 3 equal thirds (33.33% each)
      const thirds = summarize(
        [
          makeTx({ type: 'expense', amount: 10_000, date: '2026-11-16', categoryId: 'cat-makan' }),
          makeTx({ type: 'expense', amount: 10_000, date: '2026-11-16', categoryId: 'cat-jajan' }),
          makeTx({ type: 'expense', amount: 10_000, date: '2026-11-16', categoryId: 'cat-transport' }),
        ],
        range,
        '2026-11-18',
        '2026-11-01'
      );
      expect(thirds.byCategory.reduce((s, c) => s + c.percent, 0)).toBe(100);
      expect(thirds.byCategory.map((c) => c.percent)).toEqual([34, 33, 33]);

      // Case B: 7 equal slices (14.2857% each)
      const cats = [
        'cat-makan',
        'cat-jajan',
        'cat-transport',
        'cat-kosan',
        'cat-paketan',
        'cat-kuliah',
        'cat-belanja',
      ];
      const sevenths = summarize(
        cats.map((categoryId) =>
          makeTx({ type: 'expense', amount: 10_000, date: '2026-11-16', categoryId })
        ),
        range,
        '2026-11-18',
        '2026-11-01'
      );
      expect(sevenths.byCategory.reduce((s, c) => s + c.percent, 0)).toBe(100);
      expect(sevenths.byCategory.map((c) => c.percent)).toEqual([15, 15, 14, 14, 14, 14, 14]);

      // Case C: skewed values (1, 1, 1, 7)
      const skewed = summarize(
        [
          makeTx({ type: 'expense', amount: 7_000, date: '2026-11-16', categoryId: 'cat-makan' }),
          makeTx({ type: 'expense', amount: 1_000, date: '2026-11-16', categoryId: 'cat-jajan' }),
          makeTx({ type: 'expense', amount: 1_000, date: '2026-11-16', categoryId: 'cat-transport' }),
          makeTx({ type: 'expense', amount: 1_000, date: '2026-11-16', categoryId: 'cat-kosan' }),
        ],
        range,
        '2026-11-18',
        '2026-11-01'
      );
      expect(skewed.byCategory.reduce((s, c) => s + c.percent, 0)).toBe(100);
      expect(skewed.byCategory[0].categoryId).toBe('cat-makan');
      expect(skewed.byCategory[0].percent).toBe(70);
    });

    it('calculates daysCounted and avgPerDay for ongoing, past, and openingDate-clamped periods', () => {
      const weekRange = getPeriodRange('week', '2026-11-18'); // 16-22 Nov
      const txs = [
        makeTx({ type: 'expense', amount: 60_000, date: '2026-11-18', categoryId: 'cat-makan' }),
      ];

      // Ongoing week on Wed 18 Nov, openingDate before start -> 3 days (16, 17, 18)
      const ongoing = summarize(txs, weekRange, '2026-11-18', '2026-11-01');
      expect(ongoing.daysCounted).toBe(3);
      expect(ongoing.avgPerDay).toBe(20_000);

      // Ongoing week on Wed 18 Nov, clamped by openingDate = 17 Nov -> 2 days (17, 18)
      const clamped = summarize(txs, weekRange, '2026-11-18', '2026-11-17');
      expect(clamped.daysCounted).toBe(2);
      expect(clamped.avgPerDay).toBe(30_000);

      // Past week (today = 25 Nov), openingDate = 1 Nov -> full 7 days
      const past = summarize(txs, weekRange, '2026-11-25', '2026-11-01');
      expect(past.daysCounted).toBe(7);
      expect(past.avgPerDay).toBe(Math.floor(60_000 / 7));
    });

    it('returns zeroed metrics for an empty period', () => {
      const range = getPeriodRange('month', '2026-11-18');
      const empty = summarize([], range, '2026-11-18', '2026-11-01');
      expect(empty.totalExpense).toBe(0);
      expect(empty.totalIncome).toBe(0);
      expect(empty.net).toBe(0);
      expect(empty.txCount).toBe(0);
      expect(empty.byCategory).toEqual([]);
      expect(empty.avgPerDay).toBe(0);
    });
  });

  describe('comparePeriods (fair same-elapsed-days comparison)', () => {
    it('compares an ongoing Wednesday (3 days) only against the first 3 days of previous week', () => {
      const today = '2026-11-18'; // Wednesday
      const currWeek = getPeriodRange('week', today); // 16-22 Nov
      const prevWeek = shiftPeriod(currWeek, -1); // 9-15 Nov

      const txs = [
        // Previous week: Mon 9 (50rb), Tue 10 (30rb), Wed 11 (20rb) -> first 3 days = 100rb
        // Thu 12 (500rb) -> must NOT be included in fair comparison on Wednesday!
        makeTx({ type: 'expense', amount: 50_000, date: '2026-11-09' }),
        makeTx({ type: 'expense', amount: 30_000, date: '2026-11-10' }),
        makeTx({ type: 'expense', amount: 20_000, date: '2026-11-11' }),
        makeTx({ type: 'expense', amount: 500_000, date: '2026-11-12' }),
        // Current week: Mon 16 (60rb), Wed 18 (60rb) -> first 3 days = 120rb
        makeTx({ type: 'expense', amount: 60_000, date: '2026-11-16' }),
        makeTx({ type: 'expense', amount: 60_000, date: '2026-11-18' }),
      ];

      const currSummary = summarize(txs, currWeek, today, '2026-11-01');
      const prevSummary = summarize(txs, prevWeek, today, '2026-11-01');

      const comparison = comparePeriods(currSummary, prevSummary, today);
      expect(comparison.previousTotal).toBe(100_000);
      expect(comparison.currentTotal).toBe(120_000);
      expect(comparison.deltaPct).toBe(20);
      expect(comparison.text).toBe('Naik 20% dari minggu lalu (Rp 120rb vs Rp 100rb)');
    });

    it('returns "Hampir sama" when absolute difference is strictly under 5%', () => {
      const today = '2026-11-25';
      const currWeek = getPeriodRange('week', '2026-11-18'); // past week
      const prevWeek = shiftPeriod(currWeek, -1);

      const txs = [
        makeTx({ type: 'expense', amount: 100_000, date: '2026-11-10' }),
        makeTx({ type: 'expense', amount: 103_000, date: '2026-11-17' }),
      ];

      const comparison = comparePeriods(
        summarize(txs, currWeek, today, '2026-11-01'),
        summarize(txs, prevWeek, today, '2026-11-01'),
        today
      );
      expect(comparison.deltaPct).toBe(3);
      expect(comparison.text).toBe('Hampir sama dengan minggu lalu');
    });

    it('returns deltaPct = null when previousTotal is 0', () => {
      const today = '2026-11-18';
      const currMonth = getPeriodRange('month', today);
      const prevMonth = shiftPeriod(currMonth, -1);

      const txs = [makeTx({ type: 'expense', amount: 80_000, date: '2026-11-18' })];
      const comparison = comparePeriods(
        summarize(txs, currMonth, today, '2026-11-01'),
        summarize(txs, prevMonth, today, '2026-11-01'),
        today
      );

      expect(comparison.previousTotal).toBe(0);
      expect(comparison.currentTotal).toBe(80_000);
      expect(comparison.deltaPct).toBeNull();
    });
  });
});
