export const DAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export const DAY_LABELS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_LABELS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Visible calendar hours (inclusive start, exclusive end for grid rows). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;
export const HOUR_HEIGHT = 56;

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * UTC calendar ordinal (days since Unix epoch UTC midnight).
 * Safe across DST when both dates are normalized via local startOfDay first,
 * then compared in UTC-year-month-day space.
 */
export function utcCalendarOrdinal(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

/** Whole calendar days between two local calendar dates (DST-safe). */
export function calendarDaysBetween(from: Date, to: Date): number {
  return (
    utcCalendarOrdinal(startOfDay(to)) - utcCalendarOrdinal(startOfDay(from))
  );
}

export function startOfWeek(date: Date, firstDayOfWeek = 0): Date {
  const result = startOfDay(date);
  const diff = (result.getDay() - firstDayOfWeek + 7) % 7;
  result.setDate(result.getDate() - diff);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function dateAtMinutes(dateKey: string, minutes: number): Date {
  const date = parseDateKey(dateKey);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

export function daysSince(
  isoDate: string | null,
  now = new Date(),
): number | null {
  if (!isoDate) {
    return null;
  }
  return Math.max(0, calendarDaysBetween(new Date(isoDate), now));
}

export function formatDayHeading(date: Date): string {
  const day = DAY_LABELS_LONG[date.getDay()] ?? "";
  const month = MONTH_LABELS_SHORT[date.getMonth()] ?? "";
  return `${day} · ${month} ${date.getDate()}`;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekTitle(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const startMonth = MONTH_LABELS_SHORT[weekStart.getMonth()] ?? "";
  const endMonth = MONTH_LABELS_SHORT[end.getMonth()] ?? "";
  if (weekStart.getMonth() === end.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`;
}

export function formatDayTitle(date: Date): string {
  const day = DAY_LABELS_LONG[date.getDay()] ?? "";
  const month = MONTH_LABELS_SHORT[date.getMonth()] ?? "";
  return `${day}, ${month} ${date.getDate()}`;
}
