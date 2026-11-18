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

export function rollPayday(
  currentToday: string,
  nextPayday: string,
  paydayDay: number | null
): { nextPayday: string; rolled: boolean } {
  if (daysBetween(currentToday, nextPayday) > 0) {
    return { nextPayday, rolled: false };
  }

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
