import { useEffect, useState } from 'react';
import { UI_STRINGS } from '../../domain/copy';
import {
  formatShortDate,
  formatWeekdayShortDate,
  getIsoWeekday,
  parseDateParts,
  WEEKDAY_OPTIONS,
} from '../../domain/dates';
import { formatFull, formatHeroShort } from '../../domain/money';
import type { DailyTotal, PeriodKind } from '../../domain/summary';

interface DailyExpenseChartProps {
  kind: PeriodKind;
  today: string;
  dailyTotals: DailyTotal[];
}

const MONTH_LABELED_DAYS = new Set([1, 5, 10, 15, 20, 25, 30]);

function formatSelectedDayCaption(item: DailyTotal): string {
  return `${formatWeekdayShortDate(item.date)} · ${formatHeroShort(item.expense)}`;
}

function pickInitialSelectedDate(dailyTotals: DailyTotal[], today: string): string {
  const hasToday = dailyTotals.find((d) => d.date === today);
  if (hasToday) return hasToday.date;

  let maxItem = dailyTotals[0];
  for (const item of dailyTotals) {
    if (maxItem && item.expense > maxItem.expense) {
      maxItem = item;
    }
  }
  return maxItem?.date ?? '';
}

export function DailyExpenseChart({
  kind,
  today,
  dailyTotals,
}: DailyExpenseChartProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    pickInitialSelectedDate(dailyTotals, today)
  );

  useEffect(() => {
    setSelectedDate(pickInitialSelectedDate(dailyTotals, today));
  }, [dailyTotals, today]);

  const maxExpense = Math.max(
    1,
    ...dailyTotals.map((d) => d.expense)
  );
  const selectedItem =
    dailyTotals.find((d) => d.date === selectedDate) ?? dailyTotals[0];

  return (
    <section
      aria-labelledby="summary-daily-heading"
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <h2
        id="summary-daily-heading"
        className="text-[15px] font-extrabold text-[var(--ink)]"
      >
        {UI_STRINGS.summaryDailyTitle}
      </h2>

      <div
        role="group"
        aria-label="Grafik batang pengeluaran per hari"
        className={`mt-4 flex h-[156px] items-end ${
          kind === 'week' ? 'gap-2' : 'gap-[2px]'
        }`}
      >
        {dailyTotals.map((item) => {
          const { day } = parseDateParts(item.date);
          const isToday = item.date === today;
          const isFuture = item.date > today;
          const isSelected = item.date === selectedDate;
          const heightPct =
            item.expense > 0
              ? Math.max(8, Math.round((item.expense / maxExpense) * 100))
              : 0;

          const axisLabel =
            kind === 'week'
              ? WEEKDAY_OPTIONS[getIsoWeekday(item.date) - 1]?.short ?? ''
              : MONTH_LABELED_DAYS.has(day)
                ? String(day)
                : '';

          const fullDayLabel = formatSelectedDayCaption(item);

          return (
            <button
              key={item.date}
              type="button"
              onClick={() => setSelectedDate(item.date)}
              onFocus={() => setSelectedDate(item.date)}
              aria-pressed={isSelected}
              aria-label={fullDayLabel}
              className="group flex h-full min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            >
              <span className="relative flex w-full flex-1 items-end justify-center">
                {isFuture ? (
                  <span
                    aria-hidden="true"
                    className={`h-full rounded-t-[6px] border border-dashed border-[var(--border)] opacity-60 ${
                      kind === 'week' ? 'w-7 max-w-full' : 'w-full'
                    }`}
                  />
                ) : item.expense > 0 ? (
                  <span
                    aria-hidden="true"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: isToday ? 'var(--primary)' : 'var(--muted)',
                    }}
                    className={`rounded-t-[6px] transition-[height] duration-300 ease-out ${
                      kind === 'week' ? 'w-7 max-w-full' : 'w-full'
                    } ${
                      isSelected
                        ? 'ring-2 ring-[var(--ink)] ring-offset-1 ring-offset-[var(--surface)]'
                        : 'opacity-85 group-hover:opacity-100'
                    }`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      backgroundColor: isToday
                        ? 'var(--primary-tint)'
                        : 'var(--border-soft)',
                    }}
                    className={`h-[4px] rounded-full ${
                      kind === 'week' ? 'w-7 max-w-full' : 'w-full'
                    } ${
                      isSelected ? 'ring-2 ring-[var(--ink)]' : ''
                    }`}
                  />
                )}
              </span>

              <span
                aria-hidden="true"
                className={`h-4 text-[10px] leading-4 ${
                  isToday
                    ? 'font-extrabold text-[var(--primary)]'
                    : isSelected
                      ? 'font-extrabold text-[var(--ink)]'
                      : 'font-semibold text-[var(--muted)]'
                }`}
              >
                {axisLabel}
              </span>
            </button>
          );
        })}
      </div>

      {selectedItem && (
        <p
          data-testid="daily-chart-caption"
          className="mt-3 rounded-[14px] bg-[var(--bg)] px-3 py-2 text-center text-[13px] font-bold text-[var(--ink)]"
        >
          {formatSelectedDayCaption(selectedItem)}
        </p>
      )}

      <table className="visually-hidden">
        <caption>Daftar pengeluaran harian pada periode ini</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Pengeluaran</th>
          </tr>
        </thead>
        <tbody>
          {dailyTotals.map((item) => (
            <tr key={`row-${item.date}`}>
              <td>{formatShortDate(item.date)}</td>
              <td>{formatFull(item.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
