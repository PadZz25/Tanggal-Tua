import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { UI_STRINGS } from '../../domain/copy';
import { formatHeroShort, formatShort } from '../../domain/money';
import type { CategoryTotal, PeriodRange } from '../../domain/summary';
import type { Category } from '../../domain/types';
import { getCategoryChartColor } from './chartColors';

interface CategoryDonutChartProps {
  range: PeriodRange;
  totalExpense: number;
  byCategory: CategoryTotal[];
  categoryMap: Map<string, Category>;
}

const SIZE = 180;
const STROKE_WIDTH = 26;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_PX = 2;

export function CategoryDonutChart({
  range,
  totalExpense,
  byCategory,
  categoryMap,
}: CategoryDonutChartProps) {
  if (totalExpense <= 0 || byCategory.length === 0) {
    return (
      <section
        aria-labelledby="summary-cat-heading"
        className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h2
          id="summary-cat-heading"
          className="text-[15px] font-extrabold text-[var(--ink)]"
        >
          {UI_STRINGS.summaryCategoryTitle}
        </h2>
        <p className="mt-4 py-6 text-center text-[14px] font-semibold text-[var(--muted)]">
          {UI_STRINGS.summaryNoExpense}
        </p>
      </section>
    );
  }

  const hasMultipleSlices = byCategory.length > 1;
  const segments = byCategory.reduce<
    Array<{
      item: CategoryTotal;
      color: string;
      dashLength: number;
      offset: number;
      startAngleDeg: number;
    }>
  >((acc, item) => {
    const prevEndFraction =
      acc.length > 0
        ? acc.reduce((sum, seg) => sum + seg.item.amount / totalExpense, 0)
        : 0;
    const fraction = item.amount / totalExpense;
    const rawArc = fraction * CIRCUMFERENCE;
    const dashLength = hasMultipleSlices
      ? Math.max(1.5, rawArc - GAP_PX)
      : CIRCUMFERENCE;
    const offset = -prevEndFraction * CIRCUMFERENCE;
    const startAngleDeg = prevEndFraction * 360 - 90;

    acc.push({
      item,
      color: getCategoryChartColor(item.categoryId),
      dashLength,
      offset,
      startAngleDeg,
    });
    return acc;
  }, []);

  const ariaSummaryParts = byCategory.map((item) => {
    const catName = categoryMap.get(item.categoryId)?.name ?? 'Lainnya';
    return `${catName} ${item.percent}%`;
  });
  const donutAriaLabel = `Pengeluaran ${range.label}: ${ariaSummaryParts.join(', ')}`;

  return (
    <section
      aria-labelledby="summary-cat-heading"
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <h2
        id="summary-cat-heading"
        className="text-[15px] font-extrabold text-[var(--ink)]"
      >
        {UI_STRINGS.summaryCategoryTitle}
      </h2>

      <div className="mt-4 flex justify-center">
        <div className="relative flex items-center justify-center">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={donutAriaLabel}
            className="overflow-visible"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--surface)"
              strokeWidth={STROKE_WIDTH}
            />
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              {segments.map((seg) => (
                <circle
                  key={seg.item.categoryId}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${seg.dashLength} ${CIRCUMFERENCE - seg.dashLength}`}
                  strokeDashoffset={seg.offset}
                  className="transition-[stroke-dasharray,stroke-dashoffset] duration-300 ease-out"
                />
              ))}
            </g>
            {hasMultipleSlices &&
              segments.map((seg) => {
                const rad = (seg.startAngleDeg * Math.PI) / 180;
                const innerR = RADIUS - STROKE_WIDTH / 2 - 1;
                const outerR = RADIUS + STROKE_WIDTH / 2 + 1;
                const x1 = SIZE / 2 + innerR * Math.cos(rad);
                const y1 = SIZE / 2 + innerR * Math.sin(rad);
                const x2 = SIZE / 2 + outerR * Math.cos(rad);
                const y2 = SIZE / 2 + outerR * Math.sin(rad);
                return (
                  <line
                    key={`sep-${seg.item.categoryId}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--surface)"
                    strokeWidth={GAP_PX}
                  />
                );
              })}
          </svg>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          >
            <span className="text-[11px] font-bold text-[var(--muted)]">
              {UI_STRINGS.summaryTotalExpense}
            </span>
            <span className="mt-0.5 text-[20px] font-extrabold leading-tight tracking-[-0.5px] text-[var(--ink)]">
              {formatHeroShort(totalExpense)}
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-[var(--border-soft)]">
        {byCategory.map((item) => {
          const category = categoryMap.get(item.categoryId);
          const catName = category?.name ?? 'Lainnya';
          const color = getCategoryChartColor(item.categoryId);
          const historyHref = `/riwayat?kategori=${encodeURIComponent(item.categoryId)}&dari=${range.start}&sampai=${range.end}`;

          return (
            <li key={item.categoryId}>
              <Link
                to={historyHref}
                className="flex min-h-[52px] items-center justify-between gap-2 rounded-[16px] px-2 py-2 transition-colors hover:bg-[var(--border-soft)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: color }}
                    className="h-3 w-3 shrink-0 rounded-full"
                  />
                  <CategoryIcon
                    iconName={category?.icon ?? 'MoreHorizontal'}
                    tone={category?.tone ?? 'lainnya'}
                    size={32}
                  />
                  <span className="truncate text-[14px] font-bold text-[var(--ink)]">
                    {catName}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-[14px] font-extrabold text-[var(--ink)]">
                    {formatShort(item.amount)}
                  </span>
                  <span className="tabular-nums min-w-[38px] text-right text-[13px] font-bold text-[var(--muted)]">
                    {item.percent}%
                  </span>
                  <ChevronRight
                    size={16}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    className="text-[var(--muted)]"
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
