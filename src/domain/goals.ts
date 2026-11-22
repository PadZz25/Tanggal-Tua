import { computeAllowance } from './allowance';
import { daysBetween } from './dates';
import { computeGoalSaved } from './savings';
import type { Goal, GoalMilestone, Transaction } from './types';

export const MIN_GOAL_TARGET = 10_000;
export const MAX_GOAL_TARGET = 1_000_000_000;
export const MAX_ACTIVE_GOALS = 3;
export const GOAL_MILESTONES: readonly Exclude<GoalMilestone, 0>[] = [25, 50, 75, 100];

export type GoalTrackStatus =
  | 'Lebih cepat dari rencana'
  | 'Di jalur'
  | 'Sedikit tertinggal';

export interface GoalMetrics {
  saved: number;
  remaining: number;
  percent: number;
  isAchieved: boolean;
  isPastDeadline: boolean;
  daysLeft: number;
  perWeek: number | null;
  perMonth: number | null;
  dailyEffect: number | null;
  isHeavy: boolean;
  trackStatus: GoalTrackStatus;
  expectedSaved: number;
  elapsedDays: number;
  totalDays: number;
}

function roundUpThousand(value: number): number {
  if (value <= 0) return 0;
  return Math.ceil(value / 1_000) * 1_000;
}

function roundDownThousandIfLarge(value: number): number {
  if (value <= 0) return 0;
  if (value < 1_000) return value;
  return Math.floor(value / 1_000) * 1_000;
}

export function computeGoalMetrics(params: {
  goal: Goal;
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amount' | 'goalId'>>;
  today: string;
  currentDailyAllowance: number;
}): GoalMetrics {
  const { goal, transactions, today, currentDailyAllowance } = params;
  const saved = computeGoalSaved(transactions, goal.id);
  const remaining = goal.targetAmount - saved;
  const percent = Math.min(
    100,
    Math.max(0, Math.floor((saved * 100) / goal.targetAmount))
  );
  const isAchieved = saved >= goal.targetAmount;
  const rawDaysLeft = daysBetween(today, goal.deadline);
  const isPastDeadline = rawDaysLeft <= 0;
  const daysLeft = isPastDeadline ? 0 : rawDaysLeft;

  let perWeek: number | null = null;
  let perMonth: number | null = null;
  let dailyEffect: number | null = null;
  let isHeavy = false;

  if (remaining > 0 && !isPastDeadline) {
    const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
    perWeek = roundUpThousand(remaining / weeksLeft);

    const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
    perMonth = roundUpThousand(remaining / monthsLeft);

    dailyEffect = roundDownThousandIfLarge(Math.floor(perWeek / 7));
    isHeavy =
      currentDailyAllowance > 0 && perWeek > 0.5 * 7 * currentDailyAllowance;
  }

  const totalDays = Math.max(1, daysBetween(goal.startDate, goal.deadline));
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, daysBetween(goal.startDate, today))
  );
  const expectedSaved = Math.floor((goal.targetAmount * elapsedDays) / totalDays);

  let trackStatus: GoalTrackStatus;
  if (expectedSaved === 0) {
    trackStatus = saved > 0 ? 'Lebih cepat dari rencana' : 'Di jalur';
  } else if (saved * 10 >= expectedSaved * 11) {
    trackStatus = 'Lebih cepat dari rencana';
  } else if (saved * 10 >= expectedSaved * 9) {
    trackStatus = 'Di jalur';
  } else {
    trackStatus = 'Sedikit tertinggal';
  }

  return {
    saved,
    remaining,
    percent,
    isAchieved,
    isPastDeadline,
    daysLeft,
    perWeek,
    perMonth,
    dailyEffect,
    isHeavy,
    trackStatus,
    expectedSaved,
    elapsedDays,
    totalDays,
  };
}

export function previewGoalDepositAllowance(params: {
  currentBalance: number;
  spentToday: number;
  daysLeft: number;
  depositAmount: number;
}): { beforeDaily: number; afterDaily: number } {
  const before = computeAllowance({
    currentBalance: params.currentBalance,
    spentToday: params.spentToday,
    daysLeft: params.daysLeft,
  });
  const after = computeAllowance({
    currentBalance: params.currentBalance - Math.max(0, params.depositAmount),
    spentToday: params.spentToday,
    daysLeft: params.daysLeft,
  });
  return {
    beforeDaily: before.dailyAllowance,
    afterDaily: after.dailyAllowance,
  };
}

export function detectGoalMilestone(
  saved: number,
  targetAmount: number,
  lastMilestone: GoalMilestone
): Exclude<GoalMilestone, 0> | null {
  if (targetAmount <= 0 || saved <= 0) return null;
  let reached: Exclude<GoalMilestone, 0> | null = null;
  for (const milestone of GOAL_MILESTONES) {
    if (milestone > lastMilestone && saved * 100 >= targetAmount * milestone) {
      reached = milestone;
    }
  }
  return reached;
}

export function computeHighestMilestoneReached(
  saved: number,
  targetAmount: number
): GoalMilestone {
  if (targetAmount <= 0 || saved <= 0) return 0;
  let highest: GoalMilestone = 0;
  for (const milestone of GOAL_MILESTONES) {
    if (saved * 100 >= targetAmount * milestone) {
      highest = milestone;
    }
  }
  return highest;
}

export function validateGoalInput(input: {
  name: string;
  targetAmount: number | null;
  deadline: string;
  today: string;
}):
  | { ok: true; name: string; targetAmount: number; deadline: string }
  | { ok: false; error: string } {
  const trimmedName = input.name.trim();
  if (!trimmedName || trimmedName.length > 40) {
    return {
      ok: false,
      error: 'Nama target wajib diisi (1 sampai 40 karakter).',
    };
  }
  if (
    input.targetAmount === null ||
    !Number.isInteger(input.targetAmount) ||
    input.targetAmount < MIN_GOAL_TARGET ||
    input.targetAmount > MAX_GOAL_TARGET
  ) {
    return {
      ok: false,
      error: 'Nominal target antara Rp 10.000 sampai Rp 1.000.000.000.',
    };
  }
  if (!input.deadline || daysBetween(input.today, input.deadline) < 1) {
    return {
      ok: false,
      error: 'Tanggal target harus setelah hari ini.',
    };
  }
  return {
    ok: true,
    name: trimmedName,
    targetAmount: Math.trunc(input.targetAmount),
    deadline: input.deadline,
  };
}

export function pickPrimaryActiveGoal(goals: readonly Goal[]): Goal | null {
  const active = goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => {
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      return a.createdAt.localeCompare(b.createdAt);
    });
  return active[0] ?? null;
}
