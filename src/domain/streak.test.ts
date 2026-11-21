import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  getBrokenStreakCopy,
  getFirstLogTodayCopy,
  resolveStreakMilestone,
} from './streak';
import type { DayMark, Transaction } from './types';

function txOn(
  date: string,
  type: Transaction['type'] = 'expense',
  goalId: string | null = null
): Pick<Transaction, 'type' | 'date' | 'goalId'> {
  return { type, date, goalId };
}

function noSpend(date: string): DayMark {
  return { date, kind: 'no_spend', createdAt: `${date}T20:00:00.000Z` };
}

describe('streak domain contract (1.0.0 Tugas 4)', () => {
  it('counts consecutive days across month boundary and counts savings transactions while ignoring adjustments', () => {
    const res = computeStreak({
      today: '2026-12-02',
      transactions: [
        txOn('2026-11-29', 'expense'),
        txOn('2026-11-30', 'income'),
        txOn('2026-12-01', 'expense', 'goal-1'), // savings tx counts
        txOn('2026-12-02', 'adjustment'), // adjustment alone must NOT count
      ],
      dayMarks: [],
    });

    expect(res.isLoggedToday).toBe(false);
    expect(res.isPendingToday).toBe(true);
    expect(res.currentStreak).toBe(3); // 29, 30 Nov, 1 Dec waiting today
    expect(res.longestStreak).toBe(3);
    expect(res.last14Days).toHaveLength(14);
    expect(res.last14Days[13]).toEqual({
      date: '2026-12-02',
      logged: false,
      isToday: true,
    });
  });

  it('distinguishes waiting streak (yesterday logged) vs broken streak (gap day) and offers gentle copy', () => {
    const broken = computeStreak({
      today: '2026-11-18',
      transactions: [
        txOn('2026-11-10'),
        txOn('2026-11-11'),
        txOn('2026-11-12'),
        txOn('2026-11-13'),
        txOn('2026-11-14'),
        // gap on 15, 16, 17
      ],
      dayMarks: [],
    });

    expect(broken.currentStreak).toBe(0);
    expect(broken.isPendingToday).toBe(false);
    expect(broken.longestStreak).toBe(5);
    expect(getBrokenStreakCopy(broken.longestStreak)).toBe(
      'Streak terpanjangmu 5 hari. Mulai lagi hari ini?'
    );
  });

  it('bridges streak seamlessly with dayMark no_spend and backfilling yesterday', () => {
    // 16 Nov logged, 17 Nov no_spend mark, 18 Nov today logged -> streak 3
    const withMark = computeStreak({
      today: '2026-11-18',
      transactions: [txOn('2026-11-16'), txOn('2026-11-18')],
      dayMarks: [noSpend('2026-11-17')],
    });
    expect(withMark.currentStreak).toBe(3);
    expect(withMark.isLoggedToday).toBe(true);

    // Backfill yesterday: 15 Nov logged, 18 Nov today logged (streak 1), then user backfills 16 & 17 -> 4
    const beforeBackfill = computeStreak({
      today: '2026-11-18',
      transactions: [txOn('2026-11-15'), txOn('2026-11-18')],
      dayMarks: [],
    });
    expect(beforeBackfill.currentStreak).toBe(1);

    const afterBackfill = computeStreak({
      today: '2026-11-18',
      transactions: [
        txOn('2026-11-15'),
        txOn('2026-11-16'),
        txOn('2026-11-17'),
        txOn('2026-11-18'),
      ],
      dayMarks: [],
    });
    expect(afterBackfill.currentStreak).toBe(4);
  });

  it('triggers milestone strictly once per milestone and resets baseline after streak breaks', () => {
    // Reach milestone 3
    const reach3 = resolveStreakMilestone({
      prevStreak: 2,
      nextStreak: 3,
      lastCelebratedStreak: 0,
    });
    expect(reach3).toEqual({
      milestoneReached: 3,
      nextLastCelebratedStreak: 3,
    });

    // Second transaction on same day (streak still 3) -> does NOT trigger again
    const secondTx = resolveStreakMilestone({
      prevStreak: 3,
      nextStreak: 3,
      lastCelebratedStreak: 3,
    });
    expect(secondTx).toEqual({
      milestoneReached: null,
      nextLastCelebratedStreak: 3,
    });

    // Streak breaks later (prevStreak drops to 0) -> resets baseline so rebuilding to 3 celebrates again
    const startOver = resolveStreakMilestone({
      prevStreak: 0,
      nextStreak: 1,
      lastCelebratedStreak: 3,
    });
    expect(startOver).toEqual({
      milestoneReached: null,
      nextLastCelebratedStreak: 0,
    });

    const reach3Again = resolveStreakMilestone({
      prevStreak: 2,
      nextStreak: 3,
      lastCelebratedStreak: 0,
    });
    expect(reach3Again).toEqual({
      milestoneReached: 3,
      nextLastCelebratedStreak: 3,
    });

    expect(getFirstLogTodayCopy('2026-11-18', 5)).toMatch(/5 hari|ke-5/i);
  });
});
