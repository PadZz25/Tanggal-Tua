import type { PaydayRepeat, PaydayWeekday } from './types';

const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const DAYS_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;
const EN_DASH = '\u2013';

export const WEEKDAY_OPTIONS: ReadonlyArray<{
  value: PaydayWeekday;
  short: string;
  full: string;
}> = [
  { value: 1, short: 'Sen', full: 'Senin' },
  { value: 2, short: 'Sel', full: 'Selasa' },
  { value: 3, short: 'Rab', full: 'Rabu' },
  { value: 4, short: 'Kam', full: 'Kamis' },
  { value: 5, short: 'Jum', full: 'Jumat' },
  { value: 6, short: 'Sab', full: 'Sabtu' },
  { value: 7, short: 'Min', full: 'Minggu' },
];

export interface PaydaySchedule {
  paydayRepeat: PaydayRepeat;
  paydayDay: number | null;
  paydayWeekday: PaydayWeekday | null;
}

const MS_PER_DAY = 86_400_000;

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(now: Date = new Date()): string {
  return toDateString(now);
}

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  return { year: y, month: m, day: d };
}

export function daysInMonth(year: number, month1To12: number): number {
  return new Date(year, month1To12, 0).getDate();
}

export function daysBetween(fromDate: string, toDate: string): number {
  const f = parseDateParts(fromDate);
  const t = parseDateParts(toDate);
  const utcFrom = Date.UTC(f.year, f.month - 1, f.day);
  const utcTo = Date.UTC(t.year, t.month - 1, t.day);
  return Math.round((utcTo - utcFrom) / MS_PER_DAY);
}

export function addDays(dateStr: string, deltaDays: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const dt = new Date(year, month - 1, day + deltaDays);
  return toDateString(dt);
}

export function formatShortDate(dateStr: string): string {
  const { month, day } = parseDateParts(dateStr);
  const monthLabel = MONTHS_SHORT_ID[month - 1] ?? '';
  return `${day} ${monthLabel}`;
}

export function formatHistoryDayHeader(dateStr: string, currentToday: string): string {
  if (dateStr === currentToday) return 'Hari ini';
  if (dateStr === addDays(currentToday, -1)) return 'Kemarin';
  const { year, month, day } = parseDateParts(dateStr);
  const dt = new Date(year, month - 1, day);
  const dayName = DAYS_SHORT_ID[dt.getDay()];
  const monthName = MONTHS_SHORT_ID[month - 1];
  return `${dayName}, ${day} ${monthName}`;
}

export function defaultNextPayday(currentToday: string): string {
  const { year, month } = parseDateParts(currentToday);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

export function getIsoWeekday(dateStr: string): PaydayWeekday {
  const { year, month, day } = parseDateParts(dateStr);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as PaydayWeekday;
}

export function getNextWeeklyPayday(
  currentToday: string,
  paydayWeekday: PaydayWeekday
): string {
  const todayWeekday = getIsoWeekday(currentToday);
  const rawDelta = (paydayWeekday - todayWeekday + 7) % 7;
  // Today itself never counts as next payday, so same-weekday shifts +7 days.
  const deltaDays = rawDelta === 0 ? 7 : rawDelta;
  return addDays(currentToday, deltaDays);
}

export function formatWeekdayShortDate(dateStr: string): string {
  const weekday = getIsoWeekday(dateStr);
  const fullName = WEEKDAY_OPTIONS[weekday - 1]?.full ?? '';
  return `${fullName}, ${formatShortDate(dateStr)}`;
}

export function formatDateRangeLabel(start: string, end: string): string {
  const s = parseDateParts(start);
  const e = parseDateParts(end);
  if (s.month === e.month && s.year === e.year) {
    const monthPart = formatShortDate(end).split(' ')[1] ?? '';
    return `${s.day}${EN_DASH}${e.day} ${monthPart}`;
  }
  return `${formatShortDate(start)}${EN_DASH}${formatShortDate(end)}`;
}

export function rollPayday(
  currentToday: string,
  nextPayday: string,
  scheduleOrDay: PaydaySchedule | number | null
): { nextPayday: string; rolled: boolean } {
  if (daysBetween(currentToday, nextPayday) > 0) {
    return { nextPayday, rolled: false };
  }

  const schedule: PaydaySchedule =
    typeof scheduleOrDay === 'object' && scheduleOrDay !== null
      ? scheduleOrDay
      : {
          paydayRepeat: scheduleOrDay !== null ? 'monthly' : 'none',
          paydayDay: scheduleOrDay,
          paydayWeekday: null,
        };

  if (schedule.paydayRepeat === 'none') {
    return { nextPayday, rolled: false };
  }

  if (schedule.paydayRepeat === 'weekly') {
    const weekday =
      schedule.paydayWeekday !== null &&
      schedule.paydayWeekday >= 1 &&
      schedule.paydayWeekday <= 7
        ? schedule.paydayWeekday
        : getIsoWeekday(nextPayday);
    return {
      nextPayday: getNextWeeklyPayday(currentToday, weekday),
      rolled: true,
    };
  }

  const { paydayDay } = schedule;
  if (paydayDay === null || paydayDay < 1 || paydayDay > 31) {
    return { nextPayday, rolled: false };
  }

  const { year, month } = parseDateParts(currentToday);
  const clampDate = (y: number, m: number): string => {
    const maxDay = daysInMonth(y, m);
    const targetDay = Math.min(paydayDay, maxDay);
    return `${y}-${String(m).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  };

  const candidateThisMonth = clampDate(year, month);
  if (daysBetween(currentToday, candidateThisMonth) > 0) {
    return { nextPayday: candidateThisMonth, rolled: true };
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return { nextPayday: clampDate(nextYear, nextMonth), rolled: true };
}
