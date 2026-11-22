import type { Transaction, TransactionSource, TransactionType } from '../../domain/types';
import { db } from '../db';
import { TransactionSchema } from '../schemas';

export async function getAllTransactions(): Promise<Transaction[]> {
  const items = await db.transactions.toArray();
  return items.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.occurredAt.localeCompare(a.occurredAt);
  });
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  goalId?: string | null;
  note: string;
  date: string;
  source: TransactionSource;
  occurredAt?: string;
}): Promise<Transaction> {
  const nowIso = new Date().toISOString();
  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: input.type,
    amount: Math.trunc(input.amount),
    categoryId: input.type === 'adjustment' ? null : input.categoryId,
    goalId: input.goalId ?? null,
    note: input.note.trim().slice(0, 80) || (input.type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
    date: input.date,
    occurredAt: input.occurredAt ?? nowIso,
    source: input.source,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  TransactionSchema.parse(tx);
  await db.transactions.put(tx);
  return tx;
}

export async function updateTransaction(
  id: string,
  patch: Partial<
    Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'goalId' | 'note' | 'date'>
  >
): Promise<Transaction | null> {
  const existing = await db.transactions.get(id);
  if (!existing) return null;

  const nextType = patch.type ?? existing.type;
  const updated: Transaction = {
    ...existing,
    ...patch,
    amount: patch.amount !== undefined ? Math.trunc(patch.amount) : existing.amount,
    note:
      patch.note !== undefined
        ? patch.note.trim().slice(0, 80) ||
          (nextType === 'income' ? 'Pemasukan' : 'Pengeluaran')
        : existing.note,
    updatedAt: new Date().toISOString(),
  };

  TransactionSchema.parse(updated);
  await db.transactions.put(updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function restoreTransaction(tx: Transaction): Promise<void> {
  TransactionSchema.parse(tx);
  await db.transactions.put(tx);
}

export async function createBalanceAdjustment(params: {
  targetBalance: number;
  currentBalance: number;
  date: string;
}): Promise<Transaction | null> {
  const delta = Math.trunc(params.targetBalance) - Math.trunc(params.currentBalance);
  if (delta === 0) return null;

  return createTransaction({
    type: 'adjustment',
    amount: delta,
    categoryId: null,
    note: 'Koreksi saldo',
    date: params.date,
    source: 'form',
  });
}
