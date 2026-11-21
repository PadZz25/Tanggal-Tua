import { Check } from 'lucide-react';
import { useId, type KeyboardEvent } from 'react';
import { UI_STRINGS } from '../../domain/copy';
import {
  addDays,
  daysBetween,
  formatWeekdayShortDate,
  getNextWeeklyPayday,
  WEEKDAY_OPTIONS,
} from '../../domain/dates';
import type { PaydayRepeat, PaydayWeekday } from '../../domain/types';

interface PaydayScheduleControlProps {
  today: string;
  paydayRepeat: PaydayRepeat;
  paydayWeekday: PaydayWeekday;
  nextPayday: string;
  dateInputId: string;
  dateLabel: string;
  dateError?: string | null;
  onRepeatChange: (next: PaydayRepeat) => void;
  onWeekdayChange: (day: PaydayWeekday) => void;
  onDateChange: (dateStr: string) => void;
}

const REPEAT_OPTIONS: ReadonlyArray<{ id: PaydayRepeat; label: string }> = [
  { id: 'none', label: UI_STRINGS.paydayRepeatNone },
  { id: 'weekly', label: UI_STRINGS.paydayRepeatWeekly },
  { id: 'monthly', label: UI_STRINGS.paydayRepeatMonthly },
];

export function PaydayScheduleControl({
  today,
  paydayRepeat,
  paydayWeekday,
  nextPayday,
  dateInputId,
  dateLabel,
  dateError = null,
  onRepeatChange,
  onWeekdayChange,
  onDateChange,
}: PaydayScheduleControlProps) {
  const repeatLabelId = useId();
  const weekdayLabelId = useId();

  const weeklyNextPayday = getNextWeeklyPayday(today, paydayWeekday);
  const weeklyDaysLeft = daysBetween(today, weeklyNextPayday);
  const dateDaysLeft = nextPayday ? daysBetween(today, nextPayday) : 0;

  const handleRepeatKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = REPEAT_OPTIONS[(index + 1) % REPEAT_OPTIONS.length];
      onRepeatChange(next.id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev =
        REPEAT_OPTIONS[(index - 1 + REPEAT_OPTIONS.length) % REPEAT_OPTIONS.length];
      onRepeatChange(prev.id);
    }
  };

  const handleWeekdayKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = WEEKDAY_OPTIONS[(index + 1) % WEEKDAY_OPTIONS.length];
      onWeekdayChange(next.value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev =
        WEEKDAY_OPTIONS[
          (index - 1 + WEEKDAY_OPTIONS.length) % WEEKDAY_OPTIONS.length
        ];
      onWeekdayChange(prev.value);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <span
          id={repeatLabelId}
          className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]"
        >
          {UI_STRINGS.paydayRepeatLabel}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={repeatLabelId}
          className="grid grid-cols-3 gap-1.5"
        >
          {REPEAT_OPTIONS.map((option, idx) => {
            const isChecked = paydayRepeat === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isChecked}
                onClick={() => onRepeatChange(option.id)}
                onKeyDown={(e) => handleRepeatKeyDown(e, idx)}
                style={
                  isChecked
                    ? {
                        backgroundColor: 'var(--primary)',
                        color: 'var(--on-primary)',
                        borderColor: 'var(--primary)',
                      }
                    : undefined
                }
                className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-[16px] border px-2 text-[13px] font-extrabold transition-colors ${
                  isChecked
                    ? 'shadow-sm'
                    : 'border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--border-soft)]'
                }`}
              >
                {isChecked && (
                  <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                )}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {paydayRepeat === 'weekly' ? (
        <div className="space-y-2.5">
          <div>
            <span
              id={weekdayLabelId}
              className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]"
            >
              {UI_STRINGS.paydayWeekdayLabel}
            </span>
            <div
              role="radiogroup"
              aria-labelledby={weekdayLabelId}
              className="grid grid-cols-4 gap-2"
            >
              {WEEKDAY_OPTIONS.map((day, idx) => {
                const isChecked = paydayWeekday === day.value;
                return (
                  <button
                    key={day.value}
                    type="button"
                    role="radio"
                    aria-checked={isChecked}
                    aria-label={day.full}
                    onClick={() => onWeekdayChange(day.value)}
                    onKeyDown={(e) => handleWeekdayKeyDown(e, idx)}
                    style={
                      isChecked
                        ? {
                            backgroundColor: 'var(--primary)',
                            color: 'var(--on-primary)',
                            borderColor: 'var(--primary)',
                          }
                        : undefined
                    }
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-[16px] border px-2 text-[13px] font-extrabold transition-colors ${
                      isChecked
                        ? 'shadow-sm'
                        : 'border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--border-soft)]'
                    }`}
                  >
                    {isChecked && (
                      <Check size={13} strokeWidth={2.6} aria-hidden="true" />
                    )}
                    <span>{day.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p
            data-testid="payday-weekly-preview"
            aria-live="polite"
            className="rounded-[14px] bg-[var(--bg)] px-3 py-2 text-[13px] font-bold text-[var(--primary)]"
          >
            {UI_STRINGS.paydayWeeklyPreviewPrefix}{' '}
            {formatWeekdayShortDate(weeklyNextPayday)} ({weeklyDaysLeft} hari lagi)
          </p>
        </div>
      ) : (
        <div>
          <label
            htmlFor={dateInputId}
            className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]"
          >
            {dateLabel}
          </label>
          <input
            id={dateInputId}
            type="date"
            min={addDays(today, 1)}
            value={nextPayday}
            onChange={(e) => onDateChange(e.target.value)}
            required
            className="min-h-[50px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-bold text-[var(--ink)]"
          />
          {dateDaysLeft > 0 && (
            <p className="mt-1.5 px-1 text-[13px] font-bold text-[var(--primary)]">
              {dateDaysLeft} hari lagi dari hari ini
            </p>
          )}
          {dateError && (
            <p role="alert" className="mt-1.5 px-1 text-[13px] font-bold text-[var(--warm-ink)]">
              {dateError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
