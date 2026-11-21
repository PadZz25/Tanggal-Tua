import { describe, expect, it } from 'vitest';
import { computeAllowance, computeBalances } from './allowance';
import { addDays } from './dates';
import {
  computeGoalMetrics,
  detectGoalMilestone,
  pickPrimaryActiveGoal,
  previewGoalDepositAllowance,
} from './goals';
import { SYSTEM_CATEGORY_SAVING_ID } from './parser/keywords';
import type { Goal, Transaction } from './types';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    name: 'Laptop kuliah',
    targetAmount: 3_000_000,
    startDate: '2026-11-01',
    deadline: addDays('2026-11-18', 70),
    status: 'active',
    lastMilestone: 0,
    createdAt: '2026-11-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeGoalDeposit(amount: number, goalId = 'goal-1'): Transaction {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    amount,
    categoryId: SYSTEM_CATEGORY_SAVING_ID,
    goalId,
    note: 'Sisihkan',
    date: '2026-11-18',
    occurredAt: '2026-11-18T10:00:00.000Z',
    source: 'form',
    createdAt: '2026-11-18T10:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
  };
}

describe('goals domain contract (1.0.0 Tugas 5)', () => {
  it('computes mandatory suggestion numbers: target 3jt, saved 600rb, daysLeft 70 -> perWeek 240rb, dailyEffect 34rb', () => {
    const today = '2026-11-18';
    const goal = makeGoal();
    const metrics = computeGoalMetrics({
      goal,
      transactions: [makeGoalDeposit(600_000)],
      today,
      currentDailyAllowance: 100_000,
    });

    expect(metrics.saved).toBe(600_000);
    expect(metrics.remaining).toBe(2_400_000);
    expect(metrics.daysLeft).toBe(70);
    expect(metrics.perWeek).toBe(240_000);
    expect(metrics.dailyEffect).toBe(34_000);
    expect(metrics.isHeavy).toBe(false);
  });

  it('flags heavy goal when perWeek > 50% of weekly dailyAllowance and hides suggestion once achieved', () => {
    const today = '2026-11-18';
    const goal = makeGoal();

    // dailyAllowance 50rb -> 7 * 50rb * 0.5 = 175rb < 240rb -> heavy
    const heavy = computeGoalMetrics({
      goal,
      transactions: [makeGoalDeposit(600_000)],
      today,
      currentDailyAllowance: 50_000,
    });
    expect(heavy.isHeavy).toBe(true);

    // Achieved goal (saved >= target) hides recommendations
    const achieved = computeGoalMetrics({
      goal,
      transactions: [makeGoalDeposit(3_000_000)],
      today,
      currentDailyAllowance: 50_000,
    });
    expect(achieved.isAchieved).toBe(true);
    expect(achieved.perWeek).toBeNull();
    expect(achieved.perMonth).toBeNull();
    expect(achieved.dailyEffect).toBeNull();
  });

  it('evaluates neutral track statuses (Lebih cepat, Di jalur, Sedikit tertinggal) against elapsed days', () => {
    // startDate 1 Nov, deadline 21 Nov (20 days total); today 11 Nov -> 10 elapsed -> expected = 50% = 1.500.000
    const goal = makeGoal({
      startDate: '2026-11-01',
      deadline: '2026-11-21',
      targetAmount: 3_000_000,
    });
    const today = '2026-11-11';

    expect(
      computeGoalMetrics({
        goal,
        transactions: [makeGoalDeposit(1_650_000)],
        today,
        currentDailyAllowance: 80_000,
      }).trackStatus
    ).toBe('Lebih cepat dari rencana');

    expect(
      computeGoalMetrics({
        goal,
        transactions: [makeGoalDeposit(1_500_000)],
        today,
        currentDailyAllowance: 80_000,
      }).trackStatus
    ).toBe('Di jalur');

    expect(
      computeGoalMetrics({
        goal,
        transactions: [makeGoalDeposit(1_000_000)],
        today,
        currentDailyAllowance: 80_000,
      }).trackStatus
    ).toBe('Sedikit tertinggal');
  });

  it('matches live allowance preview with computeAllowance after saving deposit transaction', () => {
    const preview = previewGoalDepositAllowance({
      currentBalance: 845_000,
      spentToday: 0,
      daysLeft: 13,
      depositAmount: 130_000,
    });
    expect(preview).toEqual({ beforeDaily: 65_000, afterDaily: 55_000 });

    const actualBalances = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: [makeGoalDeposit(130_000)],
    });
    const actualAllowance = computeAllowance({
      ...actualBalances,
      daysLeft: 13,
    });
    expect(actualAllowance.dailyAllowance).toBe(preview.afterDaily);
  });

  it('detects milestones 25/50/75/100 once per milestone and picks nearest-deadline active goal', () => {
    expect(detectGoalMilestone(749_000, 3_000_000, 0)).toBeNull();
    expect(detectGoalMilestone(750_000, 3_000_000, 0)).toBe(25);
    expect(detectGoalMilestone(900_000, 3_000_000, 25)).toBeNull();
    expect(detectGoalMilestone(3_000_000, 3_000_000, 75)).toBe(100);
    expect(detectGoalMilestone(3_000_000, 3_000_000, 100)).toBeNull();

    const picked = pickPrimaryActiveGoal([
      makeGoal({ id: 'g-done', deadline: '2026-11-20', status: 'completed' }),
      makeGoal({ id: 'g-late', deadline: '2026-12-30', status: 'active' }),
      makeGoal({ id: 'g-soon', deadline: '2026-12-05', status: 'active' }),
    ]);
    expect(picked?.id).toBe('g-soon');
  });
});
