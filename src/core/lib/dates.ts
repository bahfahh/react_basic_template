/** Date helpers on plain `YYYY-MM-DD` strings, computed in UTC to avoid timezone drift. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const d = toUtc(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function dayOfWeek(date: string): number {
  return toUtc(date).getUTCDay();
}

export function weekdayLabel(date: string): string {
  return WEEKDAY_ZH[dayOfWeek(date)];
}

export function isWeekendOrHoliday(date: string, holidays: string[]): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6 || holidays.includes(date);
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function formatDateZh(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}（${weekdayLabel(date).slice(1)}）`;
}
