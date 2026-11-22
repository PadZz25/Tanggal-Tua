import type { Transaction } from './types';

export const GOAL_TX_LOCKED_MESSAGE =
  'Transaksi ini terkait target tabungan. Ubah dari halaman Target.';

export type GoalTxValidation =
  | { ok: true }
  | { ok: false; error: string };

export function computeGoalSaved(
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amount' | 'goalId'>>,
  goalId: string
): number {
  let saved = 0;
  for (const tx of transactions) {
    if (tx.goalId !== goalId) continue;
    if (tx.type === 'expense') {
      saved += tx.amount;
    } else if (tx.type === 'income') {
      saved -= tx.amount;
    }
  }
  return saved;
}

export function validateGoalDeposit(
  amount: number,
  currentBalance: number
): GoalTxValidation {
  if (!Number.isInteger(amount) || amount < 1) {
    return { ok: false, error: 'Masukkan nominal minimal Rp 1.' };
  }
  const available = Math.max(currentBalance, 0);
  if (amount > available) {
    return { ok: false, error: 'Uangmu belum cukup untuk disisihkan segitu' };
  }
  return { ok: true };
}

export function validateGoalWithdraw(
  amount: number,
  saved: number
): GoalTxValidation {
  if (!Number.isInteger(amount) || amount < 1) {
    return { ok: false, error: 'Masukkan nominal minimal Rp 1.' };
  }
  if (amount > saved) {
    return {
      ok: false,
      error: 'Nominal penarikan melebihi dana yang sudah disisihkan.',
    };
  }
  return { ok: true };
}

export function canDeleteGoalTransaction(
  transactions: ReadonlyArray<Pick<Transaction, 'id' | 'type' | 'amount' | 'goalId'>>,
  goalId: string,
  txId: string
): boolean {
  const remaining = transactions.filter((tx) => tx.id !== txId);
  return computeGoalSaved(remaining, goalId) >= 0;
}

export function isLinkedGoalTransaction(
  tx: Pick<Transaction, 'goalId'>,
  existingGoalIds: ReadonlySet<string>
): boolean {
  return Boolean(tx.goalId && existingGoalIds.has(tx.goalId));
}
