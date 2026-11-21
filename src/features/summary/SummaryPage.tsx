import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { LoadFailureScreen } from '../../components/layout/AppErrorBoundary';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { UI_STRINGS } from '../../domain/copy';
import { pickPrimaryActiveGoal } from '../../domain/goals';
import { generateInsights } from '../../domain/insights';
import { formatFull, formatHeroShort } from '../../domain/money';
import { computeGoalSaved } from '../../domain/savings';
import {
  canGoNextPeriod,
  canGoPreviousPeriod,
  comparePeriods,
  getPeriodRange,
  shiftPeriod,
  summarize,
  type PeriodKind,
} from '../../domain/summary';
import type { AppLiveState } from '../../hooks/useHomeState';
import { CategoryDonutChart } from './CategoryDonutChart';
import { DailyExpenseChart } from './DailyExpenseChart';
import { InsightsCard } from './InsightsCard';

interface SummaryPageProps {
  live: AppLiveState;
}

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parsePeriodParam(raw: string | null): PeriodKind {
  return raw === 'bulan' ? 'month' : 'week';
}

function toPeriodParam(kind: PeriodKind): 'minggu' | 'bulan' {
  return kind === 'month' ? 'bulan' : 'minggu';
}

export function SummaryPage({ live }: SummaryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const kind = parsePeriodParam(searchParams.get('periode'));
  const rawDate = searchParams.get('tanggal');
  const anchorDate =
    rawDate && DATE_PARAM_REGEX.test(rawDate) ? rawDate : live.today;

  const range = useMemo(
    () => getPeriodRange(kind, anchorDate),
    [kind, anchorDate]
  );
  const previousRange = useMemo(() => shiftPeriod(range, -1), [range]);

  const currentSummary = useMemo(
    () =>
      summarize(
        live.transactions,
        range,
        live.today,
        live.settings.openingDate
      ),
    [live.transactions, range, live.today, live.settings.openingDate]
  );

  const previousSummary = useMemo(
    () =>
      summarize(
        live.transactions,
        previousRange,
        live.today,
        live.settings.openingDate
      ),
    [live.transactions, previousRange, live.today, live.settings.openingDate]
  );

  const comparison = useMemo(
    () => comparePeriods(currentSummary, previousSummary, live.today),
    [currentSummary, previousSummary, live.today]
  );

  const insights = useMemo(
    () =>
      generateInsights({
        transactions: live.transactions,
        currentSummary,
        previousRange,
        categoryMap: live.categoryMap,
        today: live.today,
        openingDate: live.settings.openingDate,
        currentBalance: live.homeState.currentBalance,
        daysLeft: live.homeState.daysLeft,
      }),
    [
      live.transactions,
      currentSummary,
      previousRange,
      live.categoryMap,
      live.today,
      live.settings.openingDate,
      live.homeState.currentBalance,
      live.homeState.daysLeft,
    ]
  );

  if (live.error) {
    return <LoadFailureScreen message={live.error} />;
  }

  if (live.isLoading) {
    return (
      <div
        aria-busy="true"
        className="flex flex-1 flex-col items-center justify-center gap-3 py-12"
      >
        <Mascot mood="smile" size={44} />
        <p className="text-[14px] font-semibold text-[var(--muted)]">
          Menyiapkan ringkasan keuanganmu...
        </p>
      </div>
    );
  }

  const canPrev = canGoPreviousPeriod(range, live.settings.openingDate);
  const canNext = canGoNextPeriod(range, live.today);
  const activeGoalsCount = live.goals.filter((g) => g.status === 'active').length;
  const primaryGoal = pickPrimaryActiveGoal(live.goals);
  const primaryGoalSaved = primaryGoal
    ? computeGoalSaved(live.transactions, primaryGoal.id)
    : 0;

  const handleSelectKind = (nextKind: PeriodKind) => {
    setSearchParams({
      periode: toPeriodParam(nextKind),
      tanggal: anchorDate,
    });
  };

  const handleShift = (delta: -1 | 1) => {
    const shifted = shiftPeriod(range, delta);
    setSearchParams({
      periode: toPeriodParam(kind),
      tanggal: shifted.start,
    });
  };

  const formattedNet =
    currentSummary.net > 0
      ? `+${formatFull(currentSummary.net)}`
      : formatFull(currentSummary.net);

  return (
    <div className="flex flex-1 flex-col space-y-4 py-4">
      <header className="space-y-3">
        <h1 className="text-[20px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
          {UI_STRINGS.summaryTitle}
        </h1>

        <div
          role="group"
          aria-label="Pilih rentang ringkasan"
          className="grid grid-cols-2 gap-1.5 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-1"
        >
          {(
            [
              { id: 'week', label: UI_STRINGS.summaryPeriodWeek },
              { id: 'month', label: UI_STRINGS.summaryPeriodMonth },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={kind === opt.id}
              onClick={() => handleSelectKind(opt.id)}
              style={
                kind === opt.id
                  ? {
                      backgroundColor: 'var(--primary)',
                      color: 'var(--on-primary)',
                    }
                  : undefined
              }
              className={`min-h-[44px] rounded-[14px] text-[13px] font-extrabold transition-colors ${
                kind === opt.id
                  ? ''
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => handleShift(-1)}
            aria-label="Periode sebelumnya"
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--border-soft)] disabled:opacity-35"
          >
            <ChevronLeft size={20} strokeWidth={2.3} aria-hidden="true" />
          </button>

          <p
            data-testid="summary-period-label"
            className="text-[15px] font-extrabold text-[var(--ink)]"
          >
            {range.label}
          </p>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => handleShift(1)}
            aria-label="Periode berikutnya"
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--border-soft)] disabled:opacity-35"
          >
            <ChevronRight size={20} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>
      </header>

      {currentSummary.txCount === 0 && currentSummary.saved === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center">
          <Mascot mood="smile" size={52} />
          <p className="mt-3 text-[14px] font-semibold text-[var(--muted)]">
            {UI_STRINGS.emptySummary}
          </p>
        </div>
      ) : (
        <>
          {/* Kartu angka */}
          <section
            aria-label="Angka ringkasan periode"
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div>
              <p className="text-[13px] font-bold text-[var(--muted)]">
                {UI_STRINGS.summaryTotalExpense}
              </p>
              <p
                data-testid="summary-total-expense"
                className="tabular-nums mt-0.5 text-[30px] font-extrabold leading-tight tracking-[-0.8px] text-[var(--ink)]"
              >
                {formatFull(currentSummary.totalExpense)}
              </p>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-[var(--border-soft)] pt-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--muted)]">
                  {UI_STRINGS.summaryTotalIncome}
                </p>
                <p
                  data-testid="summary-total-income"
                  className="tabular-nums mt-0.5 whitespace-nowrap text-[14px] font-extrabold text-[var(--ink)]"
                >
                  {formatFull(currentSummary.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--muted)]">
                  {UI_STRINGS.summaryNet}
                </p>
                <p
                  data-testid="summary-net"
                  className="tabular-nums mt-0.5 whitespace-nowrap text-[14px] font-extrabold text-[var(--ink)]"
                >
                  {formattedNet}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--muted)]">
                  {UI_STRINGS.summaryAvgPerDay}
                </p>
                <p
                  data-testid="summary-avg-per-day"
                  className="tabular-nums mt-0.5 whitespace-nowrap text-[14px] font-extrabold text-[var(--ink)]"
                >
                  {formatFull(currentSummary.avgPerDay)}
                </p>
              </div>
            </div>

            {currentSummary.saved !== 0 && (
              <p
                data-testid="summary-saved"
                className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2.5 text-[13px]"
              >
                <span className="font-bold text-[var(--muted)]">Ditabung{' '}</span>
                <span className="tabular-nums font-extrabold text-[var(--ink)]">
                  {formatFull(currentSummary.saved)}
                </span>
              </p>
            )}

            {comparison.text && (
              <p
                data-testid="summary-comparison-text"
                className="mt-3 rounded-[14px] bg-[var(--bg)] px-3 py-2 text-[13px] font-semibold text-[var(--ink)]"
              >
                {comparison.text}
              </p>
            )}
          </section>

          <InsightsCard insights={insights} />

          <CategoryDonutChart
            range={range}
            totalExpense={currentSummary.totalExpense}
            byCategory={currentSummary.byCategory}
            categoryMap={live.categoryMap}
          />

          <DailyExpenseChart
            kind={kind}
            today={live.today}
            dailyTotals={currentSummary.dailyTotals}
          />
        </>
      )}

      <section
        aria-labelledby="summary-goals-heading"
        className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-tint)] text-[var(--primary)]"
            >
              <Target size={16} strokeWidth={2.2} />
            </span>
            <h2
              id="summary-goals-heading"
              className="text-[15px] font-extrabold text-[var(--ink)]"
            >
              Target tabungan
            </h2>
          </div>
          <Link
            to="/target"
            className="inline-flex min-h-[44px] items-center rounded-xl px-2 text-[13px] font-bold text-[var(--primary)] hover:underline"
          >
            {activeGoalsCount > 0 ? 'Kelola target' : 'Atur target'}
          </Link>
        </div>

        {primaryGoal ? (
          <Link to={`/target/${primaryGoal.id}`} className="mt-2.5 block space-y-2">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate font-bold text-[var(--ink)]">
                {primaryGoal.name}
              </span>
              <span className="tabular-nums shrink-0 font-bold text-[var(--muted)]">
                {formatHeroShort(primaryGoalSaved)} /{' '}
                {formatHeroShort(primaryGoal.targetAmount)}
              </span>
            </div>
            <ProgressBar
              usedRatio={Math.min(1, primaryGoalSaved / primaryGoal.targetAmount)}
            />
            {activeGoalsCount > 1 && (
              <p className="text-[12px] font-medium text-[var(--muted)]">
                +{activeGoalsCount - 1} target aktif lainnya
              </p>
            )}
          </Link>
        ) : (
          <p className="mt-2 text-[13px] font-medium text-[var(--muted)]">
            Sisihkan pelan-pelan untuk tujuanmu tanpa mengganggu jatah hari ini.
          </p>
        )}
      </section>
    </div>
  );
}

export default SummaryPage;
