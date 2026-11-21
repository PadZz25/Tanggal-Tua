import { describe, expect, it } from 'vitest';
import { generateInsights } from './insights';
import { DEFAULT_CATEGORIES } from './parser/keywords';
import { getPeriodRange, shiftPeriod, summarize } from './summary';
import type { Transaction } from './types';

function makeTx(
  overrides: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>
): Transaction {
  return {
    id: crypto.randomUUID(),
    categoryId: overrides.type === 'adjustment' ? null : 'cat-jajan',
    goalId: null,
    note: 'Catatan',
    occurredAt: `${overrides.date}T10:00:00.000Z`,
    source: 'quick',
    createdAt: `${overrides.date}T10:00:00.000Z`,
    updatedAt: `${overrides.date}T10:00:00.000Z`,
    ...overrides,
  };
}

const categoryMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

describe('rule-based insights domain (1.0.0 Tugas 3)', () => {
  it('R1: produces exact category change copy for fair comparison (120rb vs 100rb -> naik 20%)', () => {
    // 2026-11-18 is Wednesday -> ongoing week Mon 16..Wed 18 (3 days) vs Mon 9..Wed 11 (3 days)
    const today = '2026-11-18';
    const currentRange = getPeriodRange('week', today);
    const previousRange = shiftPeriod(currentRange, -1);

    const txs = [
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-10', categoryId: 'cat-jajan' }),
      // Thu 12 must NOT be counted on Wed 18 fair comparison
      makeTx({ type: 'expense', amount: 400_000, date: '2026-11-12', categoryId: 'cat-jajan' }),
      makeTx({ type: 'expense', amount: 120_000, date: '2026-11-17', categoryId: 'cat-jajan' }),
    ];

    const currentSummary = summarize(txs, currentRange, today, '2026-11-01');
    const insights = generateInsights({
      transactions: txs,
      currentSummary,
      previousRange,
      categoryMap,
      today,
      openingDate: '2026-11-01',
      currentBalance: 500_000,
      daysLeft: 13,
    });

    const r1 = insights.find((i) => i.rule === 'R1');
    expect(r1?.text).toBe(
      'Jajan minggu ini naik 20% dari minggu lalu (Rp 120rb vs Rp 100rb)'
    );
    expect(r1?.explanation).toContain('Rp 120.000');
    expect(r1?.explanation).toContain('Rp 100.000');
  });

  it('R1: respects minimum weekly/monthly thresholds and <20% cutoff, caps at max 2 sorted by |diff|', () => {
    const today = '2026-11-25'; // past week check
    const currentRange = getPeriodRange('week', '2026-11-18');
    const previousRange = shiftPeriod(currentRange, -1);

    const txs = [
      // Below weekly 20rb threshold (10rb vs 15rb = +50%) -> skipped
      makeTx({ type: 'expense', amount: 10_000, date: '2026-11-10', categoryId: 'cat-transport' }),
      makeTx({ type: 'expense', amount: 15_000, date: '2026-11-17', categoryId: 'cat-transport' }),
      // Small change <20% (100rb vs 115rb = +15%) -> skipped
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-10', categoryId: 'cat-makan' }),
      makeTx({ type: 'expense', amount: 115_000, date: '2026-11-17', categoryId: 'cat-makan' }),
      // Qualifies: Paketan 50rb -> 25rb (diff 25rb)
      makeTx({ type: 'expense', amount: 50_000, date: '2026-11-10', categoryId: 'cat-paketan' }),
      makeTx({ type: 'expense', amount: 25_000, date: '2026-11-17', categoryId: 'cat-paketan' }),
      // Qualifies: Belanja 100rb -> 160rb (diff 60rb)
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-10', categoryId: 'cat-belanja' }),
      makeTx({ type: 'expense', amount: 160_000, date: '2026-11-17', categoryId: 'cat-belanja' }),
      // Qualifies: Kuliah 80rb -> 40rb (diff 40rb)
      makeTx({ type: 'expense', amount: 80_000, date: '2026-11-10', categoryId: 'cat-kuliah' }),
      makeTx({ type: 'expense', amount: 40_000, date: '2026-11-17', categoryId: 'cat-kuliah' }),
    ];

    const currentSummary = summarize(txs, currentRange, today, '2026-11-01');
    const insights = generateInsights({
      transactions: txs,
      currentSummary,
      previousRange,
      categoryMap,
      today,
      openingDate: '2026-11-01',
      currentBalance: 500_000,
      daysLeft: 6,
    });

    const r1s = insights.filter((i) => i.rule === 'R1');
    expect(r1s).toHaveLength(2);
    expect(r1s[0].id).toBe('r1-cat-belanja');
    expect(r1s[0].text).toContain('Belanja minggu ini naik 60%');
    expect(r1s[1].id).toBe('r1-cat-kuliah');
    expect(r1s[1].text).toContain('Kuliah minggu ini turun 50%');

    // Monthly threshold (50rb): 30rb -> 45rb should NOT trigger R1 in monthly period
    const monthRange = getPeriodRange('month', '2026-11-18');
    const prevMonthRange = shiftPeriod(monthRange, -1);
    const monthTxs = [
      makeTx({ type: 'expense', amount: 30_000, date: '2026-10-10', categoryId: 'cat-jajan' }),
      makeTx({ type: 'expense', amount: 45_000, date: '2026-11-10', categoryId: 'cat-jajan' }),
    ];
    const monthInsights = generateInsights({
      transactions: monthTxs,
      currentSummary: summarize(monthTxs, monthRange, '2026-11-25', '2026-10-01'),
      previousRange: prevMonthRange,
      categoryMap,
      today: '2026-11-25',
      openingDate: '2026-10-01',
      currentBalance: 400_000,
      daysLeft: 6,
    });
    expect(monthInsights.some((i) => i.rule === 'R1')).toBe(false);
  });

  it('R2: picks top category >= 30% and breaks ties alphabetically by category name', () => {
    const today = '2026-11-18';
    const range = getPeriodRange('month', today);
    const prevRange = shiftPeriod(range, -1);

    const txs = [
      // Makan (50%) vs Jajan (50%) -> alphabetical tie-break picks "Jajan" before "Makan"
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-18', categoryId: 'cat-makan' }),
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-18', categoryId: 'cat-jajan' }),
    ];

    const insights = generateInsights({
      transactions: txs,
      currentSummary: summarize(txs, range, today, '2026-11-18'),
      previousRange: prevRange,
      categoryMap,
      today,
      openingDate: '2026-11-18',
      currentBalance: 400_000,
      daysLeft: 13,
    });

    const r2 = insights.find((i) => i.rule === 'R2');
    expect(r2?.text).toBe('Jajan jadi pengeluaran terbesar bulan ini: 50% (Rp 100rb).');
  });

  it('R4: follows mandatory projection examples (210.788, avg 30rb -> sufficient; avg 35rb -> 6 days) and hides on past periods', () => {
    const today = '2026-11-24'; // Tue, daysLeft = 7 (1 Dec)
    const weekRange = getPeriodRange('week', today);
    const prevWeekRange = shiftPeriod(weekRange, -1);

    // Total 210.000 over 7 days ending 2026-11-24 across >= 3 distinct days -> avg = 30.000
    const sufficientTxs = [
      makeTx({ type: 'expense', amount: 70_000, date: '2026-11-18' }),
      makeTx({ type: 'expense', amount: 70_000, date: '2026-11-20' }),
      makeTx({ type: 'expense', amount: 70_000, date: '2026-11-24' }),
      // Goal savings & adjustment must NOT inflate avg
      makeTx({ type: 'expense', amount: 500_000, date: '2026-11-24', goalId: 'goal-1' }),
    ];

    const enoughInsights = generateInsights({
      transactions: sufficientTxs,
      currentSummary: summarize(sufficientTxs, weekRange, today, '2026-11-01'),
      previousRange: prevWeekRange,
      categoryMap,
      today,
      openingDate: '2026-11-01',
      currentBalance: 210_788,
      daysLeft: 7,
    });
    expect(enoughInsights[0].rule).toBe('R4');
    expect(enoughInsights[0].text).toBe(
      'Dengan pengeluaran rata-rata Rp 30rb/hari, uangmu cukup sampai kiriman (7 hari lagi).'
    );

    // Total 245.000 over 7 days -> avg = 35.000, floor(210788 / 35000) = 6 days < 7 days
    const tightTxs = [
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-18' }),
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-20' }),
      makeTx({ type: 'expense', amount: 45_000, date: '2026-11-24' }),
    ];
    const tightInsights = generateInsights({
      transactions: tightTxs,
      currentSummary: summarize(tightTxs, weekRange, today, '2026-11-01'),
      previousRange: prevWeekRange,
      categoryMap,
      today,
      openingDate: '2026-11-01',
      currentBalance: 210_788,
      daysLeft: 7,
    });
    expect(tightInsights[0].text).toBe(
      'Dengan rata-rata Rp 35rb/hari, uangmu cukup untuk 6 hari, sedangkan kiriman 7 hari lagi.'
    );

    // Past period must NOT emit R4
    const pastRange = shiftPeriod(weekRange, -1);
    const pastInsights = generateInsights({
      transactions: sufficientTxs,
      currentSummary: summarize(sufficientTxs, pastRange, today, '2026-11-01'),
      previousRange: shiftPeriod(pastRange, -1),
      categoryMap,
      today,
      openingDate: '2026-11-01',
      currentBalance: 210_788,
      daysLeft: 7,
    });
    expect(pastInsights.some((i) => i.rule === 'R4')).toBe(false);
  });

  it('returns empty array when period has insufficient data and orders max 3 items by R4 -> R1 -> R2 -> R3', () => {
    const today = '2026-11-18';
    const range = getPeriodRange('week', today);
    const prevRange = shiftPeriod(range, -1);

    // Only 1 elapsed day (openingDate == today), no expenses -> zero insights
    const empty = generateInsights({
      transactions: [],
      currentSummary: summarize([], range, today, today),
      previousRange: prevRange,
      categoryMap,
      today,
      openingDate: today,
      currentBalance: 500_000,
      daysLeft: 13,
    });
    expect(empty).toEqual([]);

    // Trigger R4 + 2x R1 + R2 + R3 -> strictly slices top 3 in priority order R4, R1, R1
    const richTxs = [
      makeTx({ type: 'expense', amount: 100_000, date: '2026-11-10', categoryId: 'cat-jajan' }),
      makeTx({ type: 'expense', amount: 50_000, date: '2026-11-11', categoryId: 'cat-makan' }),
      makeTx({ type: 'expense', amount: 120_000, date: '2026-11-16', categoryId: 'cat-jajan' }),
      makeTx({ type: 'expense', amount: 90_000, date: '2026-11-17', categoryId: 'cat-makan' }),
      makeTx({ type: 'expense', amount: 15_000, date: '2026-11-18', categoryId: 'cat-transport' }),
    ];
    const capped = generateInsights({
      transactions: richTxs,
      currentSummary: summarize(richTxs, range, today, '2026-11-01'),
      previousRange: prevRange,
      categoryMap,
      today,
      openingDate: '2026-11-01',
      currentBalance: 500_000,
      daysLeft: 13,
    });
    expect(capped).toHaveLength(3);
    expect(capped.map((i) => i.rule)).toEqual(['R4', 'R1', 'R1']);
  });
});
