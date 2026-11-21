import { describe, expect, it } from 'vitest';
import {
  detectCrossing,
  evaluateAllBudgets,
  evaluateBudget,
  evaluateBudgetCrossingForNewTx,
  formatBudgetCrossingToast,
  formatBudgetHomeAlert,
} from './budgets';
import { DEFAULT_CATEGORIES } from './parser/keywords';
import type { Budget, Transaction } from './types';

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    categoryId: 'cat-jajan',
    period: 'month',
    amount: 300_000,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeExpense(
  amount: number,
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    amount,
    categoryId: 'cat-jajan',
    goalId: null,
    note: 'Kopi',
    date: '2026-11-18',
    occurredAt: '2026-11-18T10:00:00.000Z',
    source: 'quick',
    createdAt: '2026-11-18T10:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
    ...overrides,
  };
}

const categoryMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

describe('budgets domain contract (1.0.0 Tugas 6)', () => {
  it('follows all mandatory evaluation examples for Jajan monthly 300rb on 18 Nov (daysLeft=13)', () => {
    const today = '2026-11-18';
    const budget = makeBudget({ categoryId: 'cat-jajan', period: 'month', amount: 300_000 });

    // 180.000 -> aman, sisa 120.000, perHari 9.000
    const ev180 = evaluateBudget(budget, [makeExpense(180_000)], today);
    expect(ev180.daysLeftInPeriod).toBe(13);
    expect(ev180.status).toBe('aman');
    expect(ev180.remaining).toBe(120_000);
    expect(ev180.perHari).toBe(9_000);
    expect(ev180.perHariText).toBe('sekitar Rp 9rb per hari');
    expect(ev180.statusText).toBe('Sisa Rp 120rb dari Rp 300rb');

    // 240.000 -> hampir (exact 80%)
    const ev240 = evaluateBudget(budget, [makeExpense(240_000)], today);
    expect(ev240.status).toBe('hampir');
    expect(ev240.remaining).toBe(60_000);

    // 250.000 -> hampir, sisa 50.000, perHari 3.000
    const ev250 = evaluateBudget(budget, [makeExpense(250_000)], today);
    expect(ev250.status).toBe('hampir');
    expect(ev250.remaining).toBe(50_000);
    expect(ev250.perHari).toBe(3_000);
    expect(ev250.statusText).toBe('Hampir habis: sisa Rp 50rb');

    // 300.000 -> habis exact
    const ev300 = evaluateBudget(budget, [makeExpense(300_000)], today);
    expect(ev300.status).toBe('habis');
    expect(ev300.remaining).toBe(0);
    expect(ev300.perHariText).toBeNull();
    expect(ev300.statusText).toBe('Anggaran habis');

    // 325.000 -> habis, "Lewat Rp 25rb"
    const ev325 = evaluateBudget(budget, [makeExpense(325_000)], today);
    expect(ev325.status).toBe('habis');
    expect(ev325.remaining).toBe(-25_000);
    expect(ev325.perHariText).toBeNull();
    expect(ev325.statusText).toBe('Lewat Rp 25rb dari anggaran');
  });

  it('excludes weekly/other-month out-of-range transactions, adjustments, and goal transactions', () => {
    const today = '2026-11-18'; // week is 16-22 Nov
    const weeklyBudget = makeBudget({ categoryId: 'cat-makan', period: 'week', amount: 150_000 });
    const txs = [
      makeExpense(80_000, { categoryId: 'cat-makan', date: '2026-11-15' }), // prior week -> excluded
      makeExpense(50_000, { categoryId: 'cat-makan', date: '2026-11-17' }), // in week -> included
      makeExpense(90_000, { categoryId: 'cat-makan', date: '2026-11-18', goalId: 'g-1' }), // goalId -> excluded
      makeExpense(40_000, { categoryId: 'cat-makan', date: '2026-11-18', type: 'adjustment' }), // adjustment -> excluded
      makeExpense(60_000, { categoryId: 'cat-jajan', date: '2026-11-18' }), // wrong cat -> excluded
    ];

    const ev = evaluateBudget(weeklyBudget, txs, today);
    expect(ev.spent).toBe(50_000);
    expect(ev.remaining).toBe(100_000);
    expect(ev.daysLeftInPeriod).toBe(5); // 18..22 Nov
  });

  it('detects threshold crossings strictly when newly crossed and formats friendly toast & home alert', () => {
    expect(detectCrossing(230_000, 250_000, 300_000)).toBe('hampir');
    expect(detectCrossing(290_000, 310_000, 300_000)).toBe('habis');
    expect(detectCrossing(250_000, 270_000, 300_000)).toBeNull();
    expect(detectCrossing(300_000, 320_000, 300_000)).toBeNull();

    expect(formatBudgetCrossingToast('hampir', 'Jajan', 40_000)).toBe(
      'Anggaran Jajan tinggal Rp 40rb.'
    );
    expect(formatBudgetCrossingToast('habis', 'Jajan', -5_000)).toBe(
      'Anggaran Jajan sudah lewat Rp 5rb. Tidak apa-apa, kita pantau.'
    );

    const budget = makeBudget({ categoryId: 'cat-jajan', amount: 300_000 });
    const toastMsg = evaluateBudgetCrossingForNewTx({
      budgets: [budget],
      transactionsBefore: [makeExpense(230_000)],
      createdTx: makeExpense(20_000),
      categoryMap,
      today: '2026-11-18',
    });
    expect(toastMsg).toBe('Anggaran Jajan tinggal Rp 50rb.');

    // Combined evaluation & Home alert text
    const evals = evaluateAllBudgets(
      [
        makeBudget({ categoryId: 'cat-jajan', amount: 100_000 }),
        makeBudget({ categoryId: 'cat-makan', amount: 100_000 }),
      ],
      [
        makeExpense(85_000, { categoryId: 'cat-jajan' }),
        makeExpense(125_000, { categoryId: 'cat-makan' }),
      ],
      '2026-11-18'
    );
    expect(evals[0].budget.categoryId).toBe('cat-makan'); // highest ratio first
    expect(formatBudgetHomeAlert(evals, categoryMap)).toBe(
      'Makan lewat Rp 25rb · Jajan hampir habis'
    );
  });
});
