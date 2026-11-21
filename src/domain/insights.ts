import { addDays, daysBetween, formatDateRangeLabel } from './dates';
import { formatFull, formatHeroShort } from './money';
import type { PeriodRange, PeriodSummary } from './summary';
import type { Category, Transaction } from './types';

export type InsightRule = 'R1' | 'R2' | 'R3' | 'R4';

export interface InsightItem {
  id: string;
  rule: InsightRule;
  text: string;
  explanation: string;
}

export interface GenerateInsightsParams {
  transactions: ReadonlyArray<
    Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'> & {
      goalId?: string | null;
    }
  >;
  currentSummary: PeriodSummary;
  previousRange: PeriodRange;
  categoryMap: ReadonlyMap<string, Pick<Category, 'id' | 'name'>>;
  today: string;
  openingDate: string;
  currentBalance: number;
  daysLeft: number;
}

function sumExpensesByCategoryInWindow(
  transactions: GenerateInsightsParams['transactions'],
  start: string,
  end: string
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.goalId) continue;
    if (tx.date < start || tx.date > end) continue;
    const catId = tx.categoryId ?? 'cat-lainnya-expense';
    totals.set(catId, (totals.get(catId) ?? 0) + tx.amount);
  }
  return totals;
}

function buildR4Projection(params: GenerateInsightsParams): InsightItem | null {
  const { transactions, currentSummary, today, openingDate, currentBalance, daysLeft } =
    params;
  const { range } = currentSummary;
  const isOngoing = today >= range.start && today <= range.end;
  if (!isOngoing || daysLeft <= 0) return null;

  const sevenDaysAgo = addDays(today, -6);
  const windowStart = sevenDaysAgo > openingDate ? sevenDaysAgo : openingDate;
  if (windowStart > today) return null;

  let sum7 = 0;
  const activeDates = new Set<string>();

  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.goalId) continue;
    if (tx.date < windowStart || tx.date > today) continue;
    sum7 += tx.amount;
    if (tx.amount > 0) {
      activeDates.add(tx.date);
    }
  }

  if (activeDates.size < 3) return null;

  const daysCounted = daysBetween(windowStart, today) + 1;
  const avg = Math.floor(sum7 / daysCounted);
  if (avg <= 0) return null;

  const safeBalance = Math.max(currentBalance, 0);
  const daysCovered = Math.floor(safeBalance / avg);

  const text =
    daysCovered >= daysLeft
      ? `Dengan pengeluaran rata-rata ${formatHeroShort(avg)}/hari, uangmu cukup sampai kiriman (${daysLeft} hari lagi).`
      : `Dengan rata-rata ${formatHeroShort(avg)}/hari, uangmu cukup untuk ${daysCovered} hari, sedangkan kiriman ${daysLeft} hari lagi.`;

  const explanation = `Total pengeluaran ${daysCounted} hari terakhir sebesar ${formatFull(sum7)} (rata-rata ${formatFull(avg)}/hari) dibandingkan sisa uangmu ${formatFull(safeBalance)} dengan jarak kiriman ${daysLeft} hari lagi.`;

  return {
    id: `r4-${today}`,
    rule: 'R4',
    text,
    explanation,
  };
}

function buildR1CategoryChanges(params: GenerateInsightsParams): InsightItem[] {
  const { transactions, currentSummary, previousRange, categoryMap, today } = params;
  const { range } = currentSummary;
  const isOngoing = today >= range.start && today <= range.end;
  const periodUnit = range.kind === 'week' ? 'minggu' : 'bulan';
  const minThreshold = range.kind === 'week' ? 20_000 : 50_000;

  const currentWindowStart = range.start;
  const currentWindowEnd = isOngoing ? today : range.end;
  const elapsedDays = daysBetween(currentWindowStart, currentWindowEnd) + 1;

  const prevTotalDays = daysBetween(previousRange.start, previousRange.end) + 1;
  const prevWindowStart = previousRange.start;
  const prevWindowEnd = isOngoing
    ? addDays(previousRange.start, Math.min(elapsedDays, prevTotalDays) - 1)
    : previousRange.end;

  const curByCat = sumExpensesByCategoryInWindow(
    transactions,
    currentWindowStart,
    currentWindowEnd
  );
  const prevByCat = sumExpensesByCategoryInWindow(
    transactions,
    prevWindowStart,
    prevWindowEnd
  );

  const candidates: Array<{
    catId: string;
    catName: string;
    curAmount: number;
    prevAmount: number;
    absDiff: number;
    pct: number;
  }> = [];

  for (const [catId, prevAmount] of prevByCat.entries()) {
    if (prevAmount <= 0) continue;
    const curAmount = curByCat.get(catId) ?? 0;
    if (Math.max(curAmount, prevAmount) < minThreshold) continue;

    const absDiff = Math.abs(curAmount - prevAmount);
    if (absDiff * 5 < prevAmount) continue; // < 20%

    const catName = categoryMap.get(catId)?.name ?? 'Lainnya';
    const pct = Math.round((absDiff / prevAmount) * 100);
    candidates.push({ catId, catName, curAmount, prevAmount, absDiff, pct });
  }

  candidates.sort((a, b) => {
    if (b.absDiff !== a.absDiff) return b.absDiff - a.absDiff;
    if (b.curAmount !== a.curAmount) return b.curAmount - a.curAmount;
    return a.catName.localeCompare(b.catName, 'id');
  });

  return candidates.slice(0, 2).map((item) => {
    const dir = item.curAmount > item.prevAmount ? 'naik' : 'turun';
    const text = `${item.catName} ${periodUnit} ini ${dir} ${item.pct}% dari ${periodUnit} lalu (${formatHeroShort(item.curAmount)} vs ${formatHeroShort(item.prevAmount)})`;
    const curRangeDesc = formatDateRangeLabel(currentWindowStart, currentWindowEnd);
    const prevRangeDesc = formatDateRangeLabel(prevWindowStart, prevWindowEnd);
    const explanation = `Pengeluaran ${item.catName} pada ${curRangeDesc} sebesar ${formatFull(item.curAmount)} dibandingkan ${prevRangeDesc} sebesar ${formatFull(item.prevAmount)} (${dir} ${formatFull(item.absDiff)}, atau ${item.pct}%).`;

    return {
      id: `r1-${item.catId}`,
      rule: 'R1',
      text,
      explanation,
    };
  });
}

function buildR2TopCategory(params: GenerateInsightsParams): InsightItem | null {
  const { currentSummary, categoryMap } = params;
  if (currentSummary.totalExpense <= 0 || currentSummary.byCategory.length === 0) {
    return null;
  }

  const periodUnit = currentSummary.range.kind === 'week' ? 'minggu' : 'bulan';
  const sorted = currentSummary.byCategory
    .map((item) => ({
      ...item,
      name: categoryMap.get(item.categoryId)?.name ?? 'Lainnya',
    }))
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name, 'id');
    });

  const top = sorted[0];
  if (top.amount * 10 < currentSummary.totalExpense * 3) {
    return null;
  }

  return {
    id: `r2-${top.categoryId}`,
    rule: 'R2',
    text: `${top.name} jadi pengeluaran terbesar ${periodUnit} ini: ${top.percent}% (${formatHeroShort(top.amount)}).`,
    explanation: `Dari total pengeluaran ${formatFull(currentSummary.totalExpense)} pada ${periodUnit} ini, ${top.name} mencatat ${formatFull(top.amount)} (${top.percent}%).`,
  };
}

function buildR3ZeroSpendDays(params: GenerateInsightsParams): InsightItem | null {
  const { currentSummary, today, openingDate } = params;
  const { range, dailyTotals, totalExpense } = currentSummary;

  const effectiveStart = range.start > openingDate ? range.start : openingDate;
  const effectiveEnd = today < range.end ? today : range.end;
  if (effectiveStart > effectiveEnd) return null;

  const elapsedDays = daysBetween(effectiveStart, effectiveEnd) + 1;
  if (elapsedDays < 2) return null;

  const zeroDays = dailyTotals.filter(
    (d) => d.date >= effectiveStart && d.date <= effectiveEnd && d.expense === 0
  ).length;
  if (zeroDays < 1) return null;

  const periodUnit = range.kind === 'week' ? 'minggu' : 'bulan';
  const rangeLabel = formatDateRangeLabel(effectiveStart, effectiveEnd);

  return {
    id: `r3-${range.start}`,
    rule: 'R3',
    text: `Ada ${zeroDays} hari tanpa pengeluaran ${periodUnit} ini.`,
    explanation: `Dari ${elapsedDays} hari yang sudah berjalan (${rangeLabel}), tercatat ${zeroDays} hari tanpa pengeluaran sama sekali dengan total keluar ${formatFull(totalExpense)}.`,
  };
}

export function generateInsights(params: GenerateInsightsParams): InsightItem[] {
  const items: InsightItem[] = [];

  const r4 = buildR4Projection(params);
  if (r4) items.push(r4);

  items.push(...buildR1CategoryChanges(params));

  const r2 = buildR2TopCategory(params);
  if (r2) items.push(r2);

  const r3 = buildR3ZeroSpendDays(params);
  if (r3) items.push(r3);

  return items.slice(0, 3);
}
