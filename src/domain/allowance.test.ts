import { describe, expect, it } from 'vitest';
import { computeAllowance, computeBalances, getHomeState } from './allowance';

describe('allowance & getHomeState domain contract (Section 5.2 & 5.3)', () => {
  it('Case 1 (Normal): today=2026-11-18, nextPayday=2026-12-01, currentBalance=816000, spentToday=29000', () => {
    const res = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: 816_000,
      spentToday: 29_000,
    });

    expect(res.daysLeft).toBe(13);
    expect(res.dailyAllowance).toBe(65_000);
    expect(res.remainingToday).toBe(36_000);
    expect(res.state).toBe('normal');
    expect(res.mood).toBe('smile');
  });

  it('Case 2 (Tanggal tua): daysLeft=4, currentBalance=166000, spentToday=42000 -> dailyAllowance=52000, remainingToday=10000 (19.2%)', () => {
    const res = getHomeState({
      today: '2026-11-27',
      nextPayday: '2026-12-01',
      currentBalance: 166_000,
      spentToday: 42_000,
    });

    expect(res.daysLeft).toBe(4);
    expect(res.dailyAllowance).toBe(52_000);
    expect(res.remainingToday).toBe(10_000);
    expect(res.state).toBe('tanggal-tua');
    expect(res.mood).toBe('flat');
  });

  it('Case 3 (Lewat jatah / over): daysLeft=4, currentBalance=148000, spentToday=60000 -> dailyAllowance=52000, remainingToday=-8000', () => {
    const res = getHomeState({
      today: '2026-11-27',
      nextPayday: '2026-12-01',
      currentBalance: 148_000,
      spentToday: 60_000,
    });

    expect(res.daysLeft).toBe(4);
    expect(res.dailyAllowance).toBe(52_000);
    expect(res.remainingToday).toBe(-8_000);
    expect(res.usedRatio).toBe(1);
    expect(res.state).toBe('over');
    expect(res.mood).toBe('oops');
  });

  it('Case 4 (Hari baru / fresh): currentBalance=845000, spentToday=0, daysLeft=13 -> dailyAllowance=65000, remainingToday=65000', () => {
    const res = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: 845_000,
      spentToday: 0,
    });

    expect(res.daysLeft).toBe(13);
    expect(res.dailyAllowance).toBe(65_000);
    expect(res.remainingToday).toBe(65_000);
    expect(res.usedRatio).toBe(0);
    expect(res.state).toBe('fresh');
    expect(res.mood).toBe('smile');
  });

  it('Case 5 (Saldo minus / broke): currentBalance=-20000, spentToday=0 -> dailyAllowance=0, state=broke', () => {
    const res = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: -20_000,
      spentToday: 0,
    });

    expect(res.dailyAllowance).toBe(0);
    expect(res.state).toBe('broke');
    expect(res.mood).toBe('sleepy');
  });

  it('Case 6 (Kiriman hari ini / lewat): nextPayday <= today -> state=payday-needed', () => {
    const sameDay = getHomeState({
      today: '2026-12-01',
      nextPayday: '2026-12-01',
      currentBalance: 500_000,
      spentToday: 0,
    });
    expect(sameDay.state).toBe('payday-needed');

    const pastDay = getHomeState({
      today: '2026-12-02',
      nextPayday: '2026-12-01',
      currentBalance: 500_000,
      spentToday: 0,
    });
    expect(pastDay.state).toBe('payday-needed');
  });

  it('handles daysLeft=1 and low dailyAllowance < threshold (30000) as tanggal-tua even when spentToday=0', () => {
    const res = getHomeState({
      today: '2026-11-30',
      nextPayday: '2026-12-01',
      currentBalance: 25_000,
      spentToday: 0,
    });

    expect(res.daysLeft).toBe(1);
    expect(res.dailyAllowance).toBe(25_000);
    expect(res.state).toBe('tanggal-tua');
  });

  it('preserves dailyAllowance when adding expenses on the same day', () => {
    const before = computeAllowance({
      currentBalance: 845_000,
      spentToday: 0,
      daysLeft: 13,
    });
    const afterExpense = computeAllowance({
      currentBalance: 845_000 - 18_000,
      spentToday: 18_000,
      daysLeft: 13,
    });

    expect(before.dailyAllowance).toBe(65_000);
    expect(afterExpense.dailyAllowance).toBe(65_000);
    expect(afterExpense.remainingToday).toBe(47_000);
  });

  it('computes currentBalance and spentToday accurately from transaction list', () => {
    const balances = computeBalances({
      openingBalance: 500_000,
      openingDate: '2026-11-10',
      today: '2026-11-18',
      transactions: [
        { type: 'expense', amount: 20_000, date: '2026-11-15' },
        { type: 'income', amount: 100_000, date: '2026-11-16' },
        { type: 'adjustment', amount: -5_000, date: '2026-11-17' },
        { type: 'expense', amount: 18_000, date: '2026-11-18' },
        { type: 'income', amount: 50_000, date: '2026-11-18' },
      ],
    });

    expect(balances.currentBalance).toBe(607_000);
    expect(balances.spentToday).toBe(18_000);
  });

  it('computes dailyAllowance cleanly with weekly daysLeft in 1..7', () => {
    const weeklyState = getHomeState({
      today: '2026-11-21',
      nextPayday: '2026-11-28',
      currentBalance: 210_000,
      spentToday: 0,
    });
    expect(weeklyState.daysLeft).toBe(7);
    expect(weeklyState.dailyAllowance).toBe(30_000);
    expect(weeklyState.state).toBe('fresh');

    const oneDayLeft = computeAllowance({
      currentBalance: 45_000,
      spentToday: 0,
      daysLeft: 1,
    });
    expect(oneDayLeft.dailyAllowance).toBe(45_000);
  });
});
