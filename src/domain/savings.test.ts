import { describe, expect, it } from 'vitest';
import { computeAllowance, computeBalances } from './allowance';
import {
  SYSTEM_CATEGORY_SAVING_ID,
  SYSTEM_CATEGORY_WITHDRAW_ID,
} from './parser/keywords';
import {
  canDeleteGoalTransaction,
  computeGoalSaved,
  validateGoalDeposit,
  validateGoalWithdraw,
} from './savings';
import type { Transaction } from './types';

function makeGoalTx(
  overrides: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>
): Transaction {
  return {
    id: crypto.randomUUID(),
    categoryId:
      overrides.type === 'expense'
        ? SYSTEM_CATEGORY_SAVING_ID
        : SYSTEM_CATEGORY_WITHDRAW_ID,
    goalId: 'goal-1',
    note: 'Sisihkan',
    occurredAt: `${overrides.date}T09:00:00.000Z`,
    source: 'form',
    createdAt: `${overrides.date}T09:00:00.000Z`,
    updatedAt: `${overrides.date}T09:00:00.000Z`,
    ...overrides,
  };
}

describe('savings money rules contract (1.0.0 Tugas 2)', () => {
  it('follows the mandatory allowance example: 845rb / 13d -> sisihkan 130rb -> 55rb -> tarik 130rb -> 65rb', () => {
    const initial = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: [],
    });
    expect(
      computeAllowance({ ...initial, daysLeft: 13 }).dailyAllowance
    ).toBe(65_000);

    // Deposit 130.000 ke target
    const depositTx = makeGoalTx({
      type: 'expense',
      amount: 130_000,
      date: '2026-11-18',
    });
    const afterDeposit = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: [depositTx],
    });
    expect(afterDeposit.currentBalance).toBe(715_000);
    expect(afterDeposit.spentToday).toBe(0);
    expect(
      computeAllowance({ ...afterDeposit, daysLeft: 13 }).dailyAllowance
    ).toBe(55_000);

    // Withdraw 130.000 kembali ke saldo
    const withdrawTx = makeGoalTx({
      type: 'income',
      amount: 130_000,
      date: '2026-11-18',
    });
    const afterWithdraw = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: [depositTx, withdrawTx],
    });
    expect(afterWithdraw.currentBalance).toBe(845_000);
    expect(afterWithdraw.spentToday).toBe(0);
    expect(
      computeAllowance({ ...afterWithdraw, daysLeft: 13 }).dailyAllowance
    ).toBe(65_000);
  });

  it('validates deposit against available balance and withdraw against goal saved balance', () => {
    expect(validateGoalDeposit(130_000, 845_000)).toEqual({ ok: true });
    expect(validateGoalDeposit(845_001, 845_000)).toEqual({
      ok: false,
      error: 'Uangmu belum cukup untuk disisihkan segitu',
    });
    expect(validateGoalDeposit(1_000, -20_000)).toEqual({
      ok: false,
      error: 'Uangmu belum cukup untuk disisihkan segitu',
    });
    expect(validateGoalDeposit(0, 100_000).ok).toBe(false);

    expect(validateGoalWithdraw(50_000, 130_000)).toEqual({ ok: true });
    expect(validateGoalWithdraw(130_001, 130_000).ok).toBe(false);
  });

  it('prevents deleting a goal deposit if remaining saved total would drop below zero', () => {
    const txs = [
      makeGoalTx({ id: 'd1', type: 'expense', amount: 100_000, date: '2026-11-18' }),
      makeGoalTx({ id: 'd2', type: 'expense', amount: 50_000, date: '2026-11-18' }),
      makeGoalTx({ id: 'w1', type: 'income', amount: 120_000, date: '2026-11-18' }),
    ];

    expect(computeGoalSaved(txs, 'goal-1')).toBe(30_000);
    // Deleting d1 leaves 50rb - 120rb = -70rb -> disallowed
    expect(canDeleteGoalTransaction(txs, 'goal-1', 'd1')).toBe(false);
    // Deleting w1 leaves 150rb >= 0 -> allowed
    expect(canDeleteGoalTransaction(txs, 'goal-1', 'w1')).toBe(true);
    // Deleting d2 leaves 100rb - 120rb = -20rb -> disallowed
    expect(canDeleteGoalTransaction(txs, 'goal-1', 'd2')).toBe(false);
  });
});
