import { daysBetween } from './dates';
import type {
  AllowanceCalculation,
  HomeStateKind,
  HomeStateResult,
  MascotMood,
  Transaction,
} from './types';

export const DEFAULT_TANGGAL_TUA_THRESHOLD = 30_000;

export function computeBalances(params: {
  openingBalance: number;
  openingDate: string;
  today: string;
  transactions: ReadonlyArray<
    Pick<Transaction, 'type' | 'amount' | 'date'> & { goalId?: string | null }
  >;
}): { currentBalance: number; spentToday: number } {
  let currentBalance = params.openingBalance;
  let spentToday = 0;

  for (const tx of params.transactions) {
    if (tx.date >= params.openingDate) {
      if (tx.type === 'income') {
        currentBalance += tx.amount;
      } else if (tx.type === 'expense') {
        currentBalance -= tx.amount;
      } else if (tx.type === 'adjustment') {
        currentBalance += tx.amount;
      }
    }

    if (tx.date === params.today && tx.type === 'expense' && !tx.goalId) {
      spentToday += tx.amount;
    }
  }

  return { currentBalance, spentToday };
}

export function computeAllowance(params: {
  currentBalance: number;
  spentToday: number;
  daysLeft: number;
}): AllowanceCalculation {
  const { currentBalance, spentToday, daysLeft } = params;
  const startOfDayBalance = currentBalance + spentToday;

  if (daysLeft <= 0 || startOfDayBalance <= 0) {
    return {
      dailyAllowance: 0,
      remainingToday: -spentToday,
      usedRatio: 1,
    };
  }

  const dailyAllowance = Math.floor(startOfDayBalance / daysLeft);
  const remainingToday = dailyAllowance - spentToday;
  const usedRatio =
    dailyAllowance === 0 ? 1 : Math.min(1, Math.max(0, spentToday / dailyAllowance));

  return {
    dailyAllowance,
    remainingToday,
    usedRatio,
  };
}

export function getMascotMood(state: HomeStateKind): MascotMood {
  switch (state) {
    case 'normal':
    case 'fresh':
    case 'payday-needed':
      return 'smile';
    case 'tanggal-tua':
      return 'flat';
    case 'over':
      return 'oops';
    case 'broke':
      return 'sleepy';
  }
}

export function getHomeState(params: {
  today: string;
  nextPayday: string;
  currentBalance: number;
  spentToday: number;
  tanggalTuaThreshold?: number;
}): HomeStateResult {
  const threshold = params.tanggalTuaThreshold ?? DEFAULT_TANGGAL_TUA_THRESHOLD;
  const daysLeft = daysBetween(params.today, params.nextPayday);
  const { currentBalance, spentToday } = params;
  const startOfDayBalance = currentBalance + spentToday;

  if (daysLeft <= 0) {
    return {
      state: 'payday-needed',
      mood: 'smile',
      daysLeft: Math.max(0, daysLeft),
      currentBalance,
      spentToday,
      dailyAllowance: 0,
      remainingToday: 0,
      usedRatio: 0,
    };
  }

  if (startOfDayBalance <= 0) {
    return {
      state: 'broke',
      mood: 'sleepy',
      daysLeft,
      currentBalance,
      spentToday,
      dailyAllowance: 0,
      remainingToday: 0,
      usedRatio: 1,
    };
  }

  const allowance = computeAllowance({ currentBalance, spentToday, daysLeft });

  let state: HomeStateKind;
  if (allowance.remainingToday < 0) {
    state = 'over';
  } else if (
    allowance.dailyAllowance < threshold ||
    allowance.remainingToday <= 0.2 * allowance.dailyAllowance
  ) {
    state = 'tanggal-tua';
  } else if (spentToday === 0) {
    state = 'fresh';
  } else {
    state = 'normal';
  }

  return {
    state,
    mood: getMascotMood(state),
    daysLeft,
    currentBalance,
    spentToday,
    ...allowance,
  };
}
