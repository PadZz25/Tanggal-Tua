import { MAX_BUDGET_AMOUNT, MIN_BUDGET_AMOUNT } from '../../domain/budgets';
import {
  SYSTEM_CATEGORY_SAVING_ID,
  SYSTEM_CATEGORY_WITHDRAW_ID,
} from '../../domain/parser/keywords';
import type { Budget, BudgetPeriod } from '../../domain/types';
import { db } from '../db';
import { BudgetSchema } from '../schemas';

export async function getAllBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

export async function upsertBudget(input: {
  categoryId: string;
  period: BudgetPeriod;
  amount: number;
}): Promise<Budget> {
  if (
    !input.categoryId ||
    input.categoryId === SYSTEM_CATEGORY_SAVING_ID ||
    input.categoryId === SYSTEM_CATEGORY_WITHDRAW_ID
  ) {
    throw new Error('Anggaran hanya berlaku untuk kategori pengeluaran biasa.');
  }

  const category = await db.categories.get(input.categoryId);
  if (category && (category.kind !== 'expense' || category.isSystem)) {
    throw new Error('Anggaran hanya berlaku untuk kategori pengeluaran biasa.');
  }

  if (
    !Number.isInteger(input.amount) ||
    input.amount < MIN_BUDGET_AMOUNT ||
    input.amount > MAX_BUDGET_AMOUNT
  ) {
    throw new Error('Nominal anggaran harus antara Rp 1.000 sampai Rp 1.000.000.000.');
  }

  const nowIso = new Date().toISOString();
  const existing = await db.budgets.get(input.categoryId);

  const budget: Budget = {
    categoryId: input.categoryId,
    period: input.period,
    amount: Math.trunc(input.amount),
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  BudgetSchema.parse(budget);
  await db.budgets.put(budget);
  return budget;
}

export async function deleteBudget(categoryId: string): Promise<void> {
  await db.budgets.delete(categoryId);
}
