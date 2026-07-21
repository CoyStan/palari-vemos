import type {
  AvailabilityRule,
  CatchUpRhythm,
  ConcreteSlot,
  Friend,
  FriendCatchUpStatus,
  InviteStatus,
  InviteTone,
  Plan,
  PlanStatus,
  ShareMethod,
  SkippedOccurrence,
} from './types';
import {
  addDays,
  dateAtMinutes,
  daysSince,
  formatDateKey,
  parseDateKey,
  startOfDay,
} from './time';

export const SHARE_OPTIONS: { value: ShareMethod; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'message', label: 'Messages' },
  { value: 'other', label: 'Other' },
];

export const RHYTHM_OPTIONS: { value: CatchUpRhythm; label: string; days: number }[] = [
  { value: 'weekly', label: 'About weekly', days: 7 },
  { value: 'monthly', label: 'About monthly', days: 30 },
  { value: 'quarterly', label: 'Every three months', days: 90 },
  { value: 'custom', label: 'Custom', days: 45 },
  { value: 'none', label: 'No schedule', days: 0 },
];

export const ACTIVITY_OPTIONS = [
  'drinks',
  'dinner',
  'coffee',
  'walk',
  'games',
  'catch up',
] as const;

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  not_invited: 'Not invited',
  waiting: 'Waiting',
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
  new_time: 'New time',
  moved: 'Moved',
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Draft',
  waiting: 'Waiting',
  on: 'It’s on',
  needs_time: 'Needs another time',
  done: 'Done',
  cancelled: 'Cancelled',
};

export function rhythmDays(friend: Friend): number | null {
  if (friend.rhythm === 'none') {
    return null;
  }
  if (friend.rhythm === 'custom') {
    return Math.max(1, friend.customDays || 45);
  }
  return RHYTHM_OPTIONS.find((option) => option.value === friend.rhythm)?.days ?? null;
}

export function catchUpStatus(friend: Friend, now = new Date()): FriendCatchUpStatus {
  const days = rhythmDays(friend);
  if (days === null) {
    return 'none';
  }
  const since = daysSince(friend.lastMetAt, now);
  if (since === null) {
    return 'due';
  }
  if (since >= days) {
    return 'due';
  }
  if (since >= days * 0.7) {
    return 'soon';
  }
  return 'none';
}

export function catchUpLabel(status: FriendCatchUpStatus, friend?: Friend): string {
  if (status === 'due') {
    return 'Due';
  }
  if (status === 'soon') {
    return 'Soon';
  }
  if (friend && friend.rhythm === 'none') {
    return 'No schedule';
  }
  return 'On track';
}

/** Warm last-met copy — no guilt framing. */
export function lastMetLabel(lastMetAt: string | null, now = new Date()): string {
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
    return `Met ${days} days ago`;
  }
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'Met about a week ago' : `Met about ${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months <= 1 ? 'Met about a month ago' : `Met about ${months} months ago`;
}

export function sortFriendsForPicker(friends: Friend[], plans: Plan[], now = new Date()): Friend[] {
  const upcomingFriendIds = new Set(
    plans
      .filter((plan) => plan.status !== 'done' && plan.status !== 'cancelled')
      .filter((plan) => new Date(plan.startAt).getTime() >= now.getTime())
      .flatMap((plan) => plan.friends.map((item) => item.friendId)),
  );

  return [...friends].sort((a, b) => {
    const aDue = catchUpStatus(a, now) === 'due' ? 0 : 1;
    const bDue = catchUpStatus(b, now) === 'due' ? 0 : 1;
    if (aDue !== bDue) {
      return aDue - bDue;
    }
    const aFree = upcomingFriendIds.has(a.id) ? 1 : 0;
    const bFree = upcomingFriendIds.has(b.id) ? 1 : 0;
    if (aFree !== bFree) {
      return aFree - bFree;
    }
    return a.name.localeCompare(b.name);
  });
}

export function computePlanStatus(friends: Plan['friends']): PlanStatus {
  if (friends.length === 0) {
    return 'draft';
  }
  const active = friends.filter((item) => item.status !== 'moved');
  if (active.length === 0) {
    return 'cancelled';
  }
  const anyYes = active.some((item) => item.status === 'yes');
  if (anyYes) {
    return 'on';
  }
  const allBlocked = active.every((item) => (
    item.status === 'no' || item.status === 'new_time'
  ));
  if (allBlocked) {
    return 'needs_time';
  }
  const anyWaiting = active.some((item) => item.status === 'waiting' || item.status === 'maybe');
  if (anyWaiting) {
    return 'waiting';
  }
  const anyInvited = active.some((item) => item.status !== 'not_invited');
  return anyInvited ? 'waiting' : 'draft';
}

export function buildInviteText(input: {
  name: string;
  startAt: string;
  activity?: string;
  place?: string;
  timeFormat24h: boolean;
  tone?: InviteTone;
}): string {
  const name = input.name.trim() || 'there';
  const when = formatPlanWhen(input.startAt, input.timeFormat24h);
  const activity = input.activity?.trim();
  const place = input.place?.trim();
  const tone = input.tone ?? 'warm';

  if (tone === 'casual') {
    if (activity && place) {
      return `Yo ${name} — ${activity} at ${place} ${when}. In?`;
    }
    if (activity) {
      return `Yo ${name} — ${activity} ${when}. You down?`;
    }
    return `Yo ${name} — I’m free ${when}. Hang?`;
  }

  if (tone === 'playful') {
    if (activity && place) {
      return `${name}. ${activity} at ${place}. ${when}. This is happening, right?`;
    }
    if (activity) {
      return `Official business, ${name}: ${activity}, ${when}. Attendance mandatory (please).`;
    }
    return `${name}! A wild free spot appeared: ${when}. You’re the first person I thought of. Coming?`;
  }

  if (activity && place) {
    return `Hey ${name}! I’m thinking ${activity} at ${place} ${when}. Are you in?`;
  }
  if (activity) {
    return `Hey ${name}! I’m thinking ${activity} ${when}. Want to meet?`;
  }
  return `Hey ${name}! So, when? I’m free ${when}. Want to meet?`;
}

/**
 * One gentle, self-knowledge-only observation for the top of When.
 * Never guilt, never red — at most one line, or nothing.
 */
export function buildInsight(friends: Friend[], plans: Plan[], now = new Date()): string | null {
  if (friends.length === 0) {
    return null;
  }
  const upcoming = plans.filter((plan) => (
    plan.status !== 'done'
    && plan.status !== 'cancelled'
    && new Date(plan.startAt).getTime() >= now.getTime()
  ));

  const dueAlone = friends
    .filter((friend) => catchUpStatus(friend, now) === 'due')
    .filter((friend) => !upcoming.some((plan) => plan.friends.some(
      (item) => item.friendId === friend.id && item.status !== 'moved',
    )))
    .sort((a, b) => (daysSince(b.lastMetAt, now) ?? 9999) - (daysSince(a.lastMetAt, now) ?? 9999))[0];

  if (dueAlone) {
    return `${dueAlone.name} would probably love to hear from you — ${lastMetLabel(dueAlone.lastMetAt, now).toLowerCase()}.`;
  }

  const recentWeekend = plans.some((plan) => {
    const day = new Date(plan.startAt).getDay();
    const gap = Math.abs(now.getTime() - new Date(plan.startAt).getTime());
    return (day === 0 || day === 6) && gap < 45 * 24 * 60 * 60 * 1000;
  });
  if (!recentWeekend) {
    return 'You haven’t planned a weekend in a while — a slow Saturday could be lovely.';
  }

  if (upcoming.length === 0) {
    return 'Nothing on the horizon — a good week to change that.';
  }
  return null;
}

export function formatPlanWhen(iso: string, timeFormat24h: boolean): string {
  const date = new Date(iso);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[date.getDay()] ?? '';
  const minutes = date.getHours() * 60 + date.getMinutes();
  return `${day} at ${formatClock(minutes, timeFormat24h)}`;
}

export function formatClock(minutes: number, timeFormat24h: boolean): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const mm = m.toString().padStart(2, '0');
  if (timeFormat24h) {
    return `${h.toString().padStart(2, '0')}:${mm}`;
  }
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${mm} ${suffix}`;
}

/** True when an active plan already covers this availability slot. */
export function slotIsBooked(slot: ConcreteSlot, plans: Plan[]): boolean {
  return plans.some((plan) => {
    if (plan.status === 'cancelled' || plan.status === 'done') {
      return false;
    }
    const planDate = formatDateKey(new Date(plan.startAt));
    if (planDate !== slot.date) {
      return false;
    }
    const startMin = new Date(plan.startAt).getHours() * 60 + new Date(plan.startAt).getMinutes();
    return Math.abs(startMin - slot.startMinutes) < 30;
  });
}

export function expandAvailability(
  rules: AvailabilityRule[],
  skipped: SkippedOccurrence[],
  from: Date,
  dayCount: number,
): ConcreteSlot[] {
  const slots: ConcreteSlot[] = [];
  const skipSet = new Set(skipped.map((item) => `${item.ruleId}:${item.date}`));
  const start = startOfDay(from);

  for (let offset = 0; offset < dayCount; offset += 1) {
    const day = addDays(start, offset);
    const dateKey = formatDateKey(day);
    const dow = day.getDay();

    for (const rule of rules) {
      if (!rule.enabled || rule.endMinutes <= rule.startMinutes) {
        continue;
      }
      if (rule.endDate && dateKey > rule.endDate) {
        continue;
      }
      if (dateKey < rule.startDate) {
        continue;
      }

      let matches = false;
      if (rule.kind === 'oneoff') {
        matches = rule.oneOffDate === dateKey;
      } else if (rule.daysOfWeek.includes(dow)) {
        if (rule.recurrence === 'daily' || rule.recurrence === 'weekly') {
          matches = true;
        } else if (rule.recurrence === 'biweekly') {
          const startDate = parseDateKey(rule.startDate);
          const diffDays = Math.floor(
            (startOfDay(day).getTime() - startOfDay(startDate).getTime()) / 86400000,
          );
          matches = Math.floor(diffDays / 7) % 2 === 0;
        }
      }

      if (!matches) {
        continue;
      }
      if (skipSet.has(`${rule.id}:${dateKey}`)) {
        continue;
      }

      const startAt = dateAtMinutes(dateKey, rule.startMinutes).toISOString();
      const endAt = dateAtMinutes(dateKey, rule.endMinutes).toISOString();
      slots.push({
        key: `${rule.id}:${dateKey}:${rule.startMinutes}`,
        ruleId: rule.id,
        date: dateKey,
        startMinutes: rule.startMinutes,
        endMinutes: rule.endMinutes,
        startAt,
        endAt,
        label: rule.label || 'You’re free',
      });
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export type TimelineItem =
  | { type: 'availability'; sortAt: string; slot: ConcreteSlot }
  | { type: 'plan'; sortAt: string; plan: Plan }
  | { type: 'due_friend'; sortAt: string; friend: Friend };

export function buildTimeline(
  friends: Friend[],
  plans: Plan[],
  slots: ConcreteSlot[],
  now = new Date(),
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const bookedKeys = new Set<string>();

  for (const plan of plans) {
    if (plan.status === 'cancelled') {
      continue;
    }
    items.push({ type: 'plan', sortAt: plan.startAt, plan });
    const planDate = formatDateKey(new Date(plan.startAt));
    const startMin = new Date(plan.startAt).getHours() * 60 + new Date(plan.startAt).getMinutes();
    for (const slot of slots) {
      if (slot.date === planDate && Math.abs(slot.startMinutes - startMin) < 30) {
        bookedKeys.add(slot.key);
      }
    }
  }

  for (const slot of slots) {
    if (bookedKeys.has(slot.key)) {
      continue;
    }
    if (new Date(slot.endAt).getTime() < now.getTime()) {
      continue;
    }
    items.push({ type: 'availability', sortAt: slot.startAt, slot });
  }

  for (const friend of friends) {
    if (catchUpStatus(friend, now) === 'due') {
      items.push({
        type: 'due_friend',
        sortAt: now.toISOString(),
        friend,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.type === 'due_friend' && b.type !== 'due_friend') {
      return -1;
    }
    if (b.type === 'due_friend' && a.type !== 'due_friend') {
      return 1;
    }
    return a.sortAt.localeCompare(b.sortAt);
  });
}
