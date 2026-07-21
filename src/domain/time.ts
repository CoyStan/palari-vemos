import type { ContactOption, PriorityOption } from './types';

export const CONTACT_OPTIONS: ContactOption[] = [
  { value: 'message', label: 'Text / message' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 5, label: 'Highest', hint: 'Invite often' },
  { value: 4, label: 'High', hint: 'Prefer when picking' },
  { value: 3, label: 'Medium', hint: 'A steady place in the mix' },
  { value: 2, label: 'Low', hint: 'When it fits' },
  { value: 1, label: 'Lowest', hint: 'Rarely first in line' },
];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_LABELS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Visible calendar hours (inclusive start, exclusive end for grid rows). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;
export const HOUR_HEIGHT = 56;

export function contactLabel(method: ContactOption['value']): string {
  return CONTACT_OPTIONS.find((option) => option.value === method)?.label ?? 'Message';
}

export function priorityLabel(priority: number): string {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label
    ?? 'Medium';
}

export function clampPriority(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${pad2(m)} ${suffix}`;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function dateAtMinutes(dateKey: string, minutes: number): Date {
  const date = parseDateKey(dateKey);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

export function daysSince(isoDate: string | null, now = new Date()): number | null {
  if (!isoDate) {
    return null;
  }
  const then = new Date(isoDate);
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** Warm, non-judgmental line about when you last connected. */
export function lastSeenLine(lastMetAt: string | null, now = new Date()): string {
  const days = daysSince(lastMetAt, now);
  if (days === null) {
    return 'Not met yet';
  }
  if (days === 0) {
    return 'Met today';
  }
  if (days === 1) {
    return 'Met yesterday';
  }
  if (days < 14) {
    return `Last met ${days} days ago`;
  }
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'Last met about a week ago' : `Last met about ${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months <= 1 ? 'Last met about a month ago' : `Last met about ${months} months ago`;
}

export function formatSlotRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const day = DAY_LABELS_LONG[start.getDay()] ?? '';
  const dateLabel = `${day}, ${start.getMonth() + 1}/${start.getDate()}`;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  return `${dateLabel} · ${minutesToLabel(startMin)} – ${minutesToLabel(endMin)}`;
}
