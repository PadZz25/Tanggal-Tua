import { addDays } from './dates';
import type { DayMark, Transaction } from './types';

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export interface StreakDayPoint {
  date: string;
  logged: boolean;
  isToday: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  isLoggedToday: boolean;
  isPendingToday: boolean;
  last14Days: StreakDayPoint[];
}

export function collectLoggedDates(
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'date'>>,
  dayMarks: ReadonlyArray<Pick<DayMark, 'date' | 'kind'>>
): Set<string> {
  const logged = new Set<string>();

  for (const tx of transactions) {
    if (tx.type === 'expense' || tx.type === 'income') {
      logged.add(tx.date);
    }
  }

  for (const mark of dayMarks) {
    if (mark.kind === 'no_spend') {
      logged.add(mark.date);
    }
  }

  return logged;
}

export function computeStreak(params: {
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'date'>>;
  dayMarks: ReadonlyArray<Pick<DayMark, 'date' | 'kind'>>;
  today: string;
}): StreakSummary {
  const { transactions, dayMarks, today } = params;
  const loggedDates = collectLoggedDates(transactions, dayMarks);

  const isLoggedToday = loggedDates.has(today);
  const yesterday = addDays(today, -1);
  const isPendingToday = !isLoggedToday && loggedDates.has(yesterday);

  let currentStreak = 0;
  let cursor = isLoggedToday ? today : isPendingToday ? yesterday : null;
  while (cursor && loggedDates.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Only consider dates <= today for longestStreak so stray future marks never count
  const sortedDates = Array.from(loggedDates)
    .filter((d) => d <= today)
    .sort();

  let longestStreak = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const d of sortedDates) {
    if (prevDate && addDays(prevDate, 1) === d) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) {
      longestStreak = run;
    }
    prevDate = d;
  }

  const last14Days: StreakDayPoint[] = [];
  for (let offset = -13; offset <= 0; offset++) {
    const date = addDays(today, offset);
    last14Days.push({
      date,
      logged: loggedDates.has(date),
      isToday: date === today,
    });
  }

  return {
    currentStreak,
    longestStreak,
    isLoggedToday,
    isPendingToday,
    last14Days,
  };
}

export function resolveStreakMilestone(params: {
  prevStreak: number;
  nextStreak: number;
  lastCelebratedStreak: number;
}): {
  milestoneReached: StreakMilestone | null;
  nextLastCelebratedStreak: number;
} {
  const { prevStreak, nextStreak, lastCelebratedStreak } = params;
  // Reset baseline to current streak if streak broke earlier
  const effectiveBaseline =
    prevStreak < lastCelebratedStreak ? prevStreak : lastCelebratedStreak;

  if (nextStreak <= prevStreak) {
    return {
      milestoneReached: null,
      nextLastCelebratedStreak: Math.min(effectiveBaseline, nextStreak),
    };
  }

  const crossed = STREAK_MILESTONES.filter(
    (m) => m <= nextStreak && m > effectiveBaseline
  );
  if (crossed.length > 0) {
    const highest = crossed[crossed.length - 1];
    return {
      milestoneReached: highest,
      nextLastCelebratedStreak: highest,
    };
  }

  return {
    milestoneReached: null,
    nextLastCelebratedStreak: effectiveBaseline,
  };
}

function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getFirstLogTodayCopy(today: string, currentStreak: number): string {
  if (currentStreak <= 1) {
    const starters = [
      'Tercatat! Langkah pertama hari ini.',
      'Sip, catatan hari ke-1 tersimpan.',
    ] as const;
    return starters[hashDate(today) % starters.length];
  }

  const multiDay = [
    `Tercatat! Hari ke-${currentStreak} berturut-turut.`,
    `Mantap! Sudah ${currentStreak} hari berturut-turut.`,
  ] as const;
  return multiDay[hashDate(today) % multiDay.length];
}

export function getMilestoneCelebrationCopy(milestone: StreakMilestone): {
  heroMessage: string;
  toastMessage: string;
} {
  return {
    heroMessage: `Keren! Streak ${milestone} hari berturut-turut terjaga.`,
    toastMessage: `Keren! Streak ${milestone} hari berturut-turut.`,
  };
}

export function getBrokenStreakCopy(longestStreak: number): string {
  return `Streak terpanjangmu ${longestStreak} hari. Mulai lagi hari ini?`;
}
