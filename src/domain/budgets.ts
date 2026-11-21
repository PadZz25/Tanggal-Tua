import { daysBetween } from './dates';
import { formatHeroShort } from './money';
import { getPeriodRange, type PeriodRange } from './summary';
import type { Budget, Category, Transaction } from './types';

export const MIN_BUDGET_AMOUNT = 1_000;
export const MAX_BUDGET_AMOUNT = 1_000_000_000;

export type BudgetStatus = 'aman' | 'hampir' | 'habis';
export type BudgetCrossing = 'hampir' | 'habis' | null;

export interface BudgetEvaluation {
  budget: Budget;
  range: PeriodRange;
  spent: number;
  remaining: number;
  ratio: number;
  status: BudgetStatus;
  daysLeftInPeriod: number;
  perHari: number;
  perHariText: string | null;
  statusText: string;
}

export function detectCrossing(
  spentBefore: number,
  spentAfter: number,
  amount: number
): BudgetCrossing {
  if (amount <= 0 || spentAfter <= spentBefore) return null;
  const wasHabis = spentBefore >= amount;
  const nowHabis = spentAfter >= amount;
  if (!wasHabis && nowHabis) {
    return 'habis';
  }

  const wasHampir = spentBefore * 5 >= amount * 4;
  const nowHampir = spentAfter * 5 >= amount * 4;
  if (!wasHampir && nowHampir) {
    return 'hampir';
  }

  return null;
}

export function evaluateBudget(
  budget: Budget,
  transactions: ReadonlyArray<
    Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'> & {
      goalId?: string | null;
    }
  >,
  today: string
): BudgetEvaluation {
  const range = getPeriodRange(budget.period, today);
  let spent = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.goalId) continue;
    if (tx.categoryId !== budget.categoryId) continue;
    if (tx.date < range.start || tx.date > range.end) continue;
    spent += tx.amount;
  }

  const remaining = budget.amount - spent;
  const ratio = budget.amount > 0 ? spent / budget.amount : 0;

  let status: BudgetStatus;
  if (spent >= budget.amount) {
    status = 'habis';
  } else if (spent * 5 >= budget.amount * 4) {
    status = 'hampir';
  } else {
    status = 'aman';
  }

  const daysLeftInPeriod = Math.max(1, daysBetween(today, range.end) + 1);
  const perHari =
    remaining > 0
      ? Math.floor(Math.floor(remaining / daysLeftInPeriod) / 1_000) * 1_000
      : 0;
  const perHariText =
    remaining > 0 && perHari > 0
      ? `sekitar ${formatHeroShort(perHari)} per hari`
      : null;

  let statusText: string;
  if (status === 'aman') {
    statusText = `Sisa ${formatHeroShort(remaining)} dari ${formatHeroShort(budget.amount)}`;
  } else if (status === 'hampir') {
    statusText = `Hampir habis: sisa ${formatHeroShort(remaining)}`;
  } else if (remaining === 0) {
    statusText = 'Anggaran habis';
  } else {
    statusText = `Lewat ${formatHeroShort(Math.abs(remaining))} dari anggaran`;
  }

  return {
    budget,
    range,
    spent,
    remaining,
    ratio,
    status,
    daysLeftInPeriod,
    perHari,
    perHariText,
    statusText,
  };
}

export function evaluateAllBudgets(
  budgets: readonly Budget[],
  transactions: ReadonlyArray<
    Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'> & {
      goalId?: string | null;
    }
  >,
  today: string
): BudgetEvaluation[] {
  return budgets
    .map((b) => evaluateBudget(b, transactions, today))
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      if (b.spent !== a.spent) return b.spent - a.spent;
      return a.budget.categoryId.localeCompare(b.budget.categoryId);
    });
}

export function formatBudgetCrossingToast(
  crossing: Exclude<BudgetCrossing, null>,
  categoryName: string,
  remaining: number
): string {
  if (crossing === 'hampir') {
    return `Anggaran ${categoryName} tinggal ${formatHeroShort(Math.max(0, remaining))}.`;
  }
  if (remaining < 0) {
    return `Anggaran ${categoryName} sudah lewat ${formatHeroShort(Math.abs(remaining))}. Tidak apa-apa, kita pantau.`;
  }
  return `Anggaran ${categoryName} sudah habis. Tidak apa-apa, kita pantau.`;
}

export function evaluateBudgetCrossingForNewTx(params: {
  budgets: readonly Budget[];
  transactionsBefore: ReadonlyArray<
    Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'> & {
      goalId?: string | null;
    }
  >;
  createdTx: Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'> & {
    goalId?: string | null;
  };
  categoryMap: ReadonlyMap<string, Pick<Category, 'id' | 'name'>>;
  today: string;
}): string | null {
  const { budgets, transactionsBefore, createdTx, categoryMap, today } = params;
  if (createdTx.type !== 'expense' || createdTx.goalId || !createdTx.categoryId) {
    return null;
  }

  const budget = budgets.find((b) => b.categoryId === createdTx.categoryId);
  if (!budget) return null;

  const beforeEval = evaluateBudget(budget, transactionsBefore, today);
  if (
    createdTx.date < beforeEval.range.start ||
    createdTx.date > beforeEval.range.end
  ) {
    return null;
  }

  const spentAfter = beforeEval.spent + createdTx.amount;
  const crossing = detectCrossing(beforeEval.spent, spentAfter, budget.amount);
  if (!crossing) return null;

  const categoryName = categoryMap.get(budget.categoryId)?.name ?? 'Kategori';
  return formatBudgetCrossingToast(
    crossing,
    categoryName,
    budget.amount - spentAfter
  );
}

export function formatBudgetHomeAlert(
  evaluations: readonly BudgetEvaluation[],
  categoryMap: ReadonlyMap<string, Pick<Category, 'id' | 'name'>>
): string | null {
  const alerts = evaluations.filter(
    (e) => e.status === 'hampir' || e.status === 'habis'
  );
  if (alerts.length === 0) return null;

  return alerts
    .slice(0, 2)
    .map((e) => {
      const catName = categoryMap.get(e.budget.categoryId)?.name ?? 'Kategori';
      if (e.status === 'hampir') {
        return `${catName} hampir habis`;
      }
      if (e.remaining < 0) {
        return `${catName} lewat ${formatHeroShort(Math.abs(e.remaining))}`;
      }
      return `${catName} habis`;
    })
    .join(' · ');
}
