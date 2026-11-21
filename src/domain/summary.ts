import {
  addDays,
  daysBetween,
  daysInMonth,
  formatDateRangeLabel,
  parseDateParts,
} from './dates';
import { formatHeroShort } from './money';
import type { Transaction } from './types';

export type PeriodKind = 'week' | 'month';

export interface PeriodRange {
  kind: PeriodKind;
  start: string;
  end: string;
  label: string;
}

export interface DailyTotal {
  date: string;
  expense: number;
}

export interface CategoryTotal {
  categoryId: string;
  amount: number;
  percent: number;
}

export interface PeriodSummary {
  range: PeriodRange;
  totalExpense: number;
  totalIncome: number;
  net: number;
  saved: number;
  dailyTotals: DailyTotal[];
  byCategory: CategoryTotal[];
  avgPerDay: number;
  daysCounted: number;
  txCount: number;
}

export interface PeriodComparison {
  previousTotal: number;
  currentTotal: number;
  deltaPct: number | null;
  text: string | null;
}

const MONTHS_FULL_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function getPeriodRange(kind: PeriodKind, anchorDate: string): PeriodRange {
  const { year, month, day } = parseDateParts(anchorDate);

  if (kind === 'month') {
    const lastDay = daysInMonth(year, month);
    const start = `${year}-${pad2(month)}-01`;
    const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    const monthName = MONTHS_FULL_ID[month - 1] ?? '';
    return {
      kind: 'month',
      start,
      end,
      label: `${monthName} ${year}`,
    };
  }

  // Week starts on Monday (weekStartsOn: 1)
  const dt = new Date(year, month - 1, day);
  const jsDay = dt.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const offsetFromMonday = (jsDay + 6) % 7;
  const start = addDays(anchorDate, -offsetFromMonday);
  const end = addDays(start, 6);

  return {
    kind: 'week',
    start,
    end,
    label: formatDateRangeLabel(start, end),
  };
}

export function shiftPeriod(range: PeriodRange, delta: number): PeriodRange {
  if (range.kind === 'week') {
    const shiftedStart = addDays(range.start, delta * 7);
    return getPeriodRange('week', shiftedStart);
  }

  const { year, month } = parseDateParts(range.start);
  const zeroBasedMonth = year * 12 + (month - 1) + delta;
  const targetYear = Math.floor(zeroBasedMonth / 12);
  const targetMonth = ((zeroBasedMonth % 12) + 12) % 12 + 1;
  return getPeriodRange('month', `${targetYear}-${pad2(targetMonth)}-01`);
}

export function canGoPreviousPeriod(range: PeriodRange, openingDate: string): boolean {
  const prev = shiftPeriod(range, -1);
  return prev.end >= openingDate;
}

export function canGoNextPeriod(range: PeriodRange, today: string): boolean {
  return range.end < today;
}

function allocateLargestRemainderPercents(
  items: Array<{ categoryId: string; amount: number }>,
  total: number
): CategoryTotal[] {
  if (items.length === 0 || total <= 0) return [];

  const quotas = items.map((item, index) => {
    const exact = (item.amount / total) * 100;
    const floorVal = Math.floor(exact);
    return {
      index,
      categoryId: item.categoryId,
      amount: item.amount,
      floorVal,
      remainder: exact - floorVal,
    };
  });

  const floorSum = quotas.reduce((sum, q) => sum + q.floorVal, 0);
  const leftover = 100 - floorSum;

  const ranked = [...quotas].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.index - b.index;
  });

  const bonusSet = new Set(ranked.slice(0, leftover).map((q) => q.index));

  return quotas.map((q) => ({
    categoryId: q.categoryId,
    amount: q.amount,
    percent: q.floorVal + (bonusSet.has(q.index) ? 1 : 0),
  }));
}

export function summarize(
  transactions: ReadonlyArray<
    Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'> & {
      goalId?: string | null;
    }
  >,
  range: PeriodRange,
  today: string,
  openingDate: string
): PeriodSummary {
  const totalDaysInRange = daysBetween(range.start, range.end) + 1;
  const dailyExpenseMap = new Map<string, number>();

  for (let i = 0; i < totalDaysInRange; i++) {
    dailyExpenseMap.set(addDays(range.start, i), 0);
  }

  let totalExpense = 0;
  let totalIncome = 0;
  let saved = 0;
  let txCount = 0;
  const categoryTotalsMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== 'expense' && tx.type !== 'income') continue;
    if (tx.date < range.start || tx.date > range.end) continue;

    if (tx.goalId) {
      saved += tx.type === 'expense' ? tx.amount : -tx.amount;
      continue;
    }

    txCount += 1;
    if (tx.type === 'expense') {
      totalExpense += tx.amount;
      dailyExpenseMap.set(tx.date, (dailyExpenseMap.get(tx.date) ?? 0) + tx.amount);
      const catId = tx.categoryId ?? 'cat-lainnya-expense';
      categoryTotalsMap.set(catId, (categoryTotalsMap.get(catId) ?? 0) + tx.amount);
    } else {
      totalIncome += tx.amount;
    }
  }

  const dailyTotals: DailyTotal[] = [];
  for (let i = 0; i < totalDaysInRange; i++) {
    const d = addDays(range.start, i);
    dailyTotals.push({ date: d, expense: dailyExpenseMap.get(d) ?? 0 });
  }

  const sortedCategories = Array.from(categoryTotalsMap.entries())
    .filter(([, amount]) => amount > 0)
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.categoryId.localeCompare(b.categoryId);
    });

  const byCategory = allocateLargestRemainderPercents(sortedCategories, totalExpense);

  const effectiveStart = range.start > openingDate ? range.start : openingDate;
  const effectiveEnd = today < range.end ? today : range.end;

  let daysCounted = 0;
  if (effectiveStart <= effectiveEnd) {
    daysCounted = daysBetween(effectiveStart, effectiveEnd) + 1;
  }

  const avgPerDay = daysCounted > 0 ? Math.floor(totalExpense / daysCounted) : 0;

  return {
    range,
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    saved,
    dailyTotals,
    byCategory,
    avgPerDay,
    daysCounted,
    txCount,
  };
}

export function comparePeriods(
  current: PeriodSummary,
  previous: PeriodSummary,
  today: string
): PeriodComparison {
  const isOngoing = today >= current.range.start && today <= current.range.end;

  let currentTotal = current.totalExpense;
  let previousTotal = previous.totalExpense;

  if (isOngoing) {
    const elapsedDays = daysBetween(current.range.start, today) + 1;
    const clampedPrevDays = Math.min(elapsedDays, previous.dailyTotals.length);
    currentTotal = current.dailyTotals
      .slice(0, elapsedDays)
      .reduce((sum, d) => sum + d.expense, 0);
    previousTotal = previous.dailyTotals
      .slice(0, clampedPrevDays)
      .reduce((sum, d) => sum + d.expense, 0);
  }

  const periodUnit = current.range.kind === 'week' ? 'minggu' : 'bulan';

  if (previousTotal === 0) {
    return {
      previousTotal: 0,
      currentTotal,
      deltaPct: null,
      text:
        currentTotal > 0
          ? `Belum ada catatan pengeluaran di ${periodUnit} lalu`
          : null,
    };
  }

  const rawPct = ((currentTotal - previousTotal) / previousTotal) * 100;
  const deltaPct = Math.round(rawPct);

  if (Math.abs(rawPct) < 5) {
    return {
      previousTotal,
      currentTotal,
      deltaPct,
      text: `Hampir sama dengan ${periodUnit} lalu`,
    };
  }

  const direction = currentTotal > previousTotal ? 'Naik' : 'Turun';
  const absPct = Math.abs(deltaPct);

  return {
    previousTotal,
    currentTotal,
    deltaPct,
    text: `${direction} ${absPct}% dari ${periodUnit} lalu (${formatHeroShort(currentTotal)} vs ${formatHeroShort(previousTotal)})`,
  };
}
