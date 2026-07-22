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
} from "./types";
import {
  addDays,
  calendarDaysBetween,
  dateAtMinutes,
  daysSince,
  formatDateKey,
  MONTH_LABELS_SHORT,
  parseDateKey,
  startOfDay,
} from "./time";

export const SHARE_OPTIONS: { value: ShareMethod; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "telegram", label: "Telegram" },
  { value: "message", label: "Messages" },
  { value: "other", label: "Other" },
];

export const RHYTHM_OPTIONS: {
  value: CatchUpRhythm;
  label: string;
  days: number;
}[] = [
  { value: "weekly", label: "About weekly", days: 7 },
  { value: "monthly", label: "About monthly", days: 30 },
  { value: "quarterly", label: "Every three months", days: 90 },
  { value: "custom", label: "Custom", days: 45 },
  { value: "none", label: "No schedule", days: 0 },
];

export const ACTIVITY_OPTIONS = [
  "drinks",
  "dinner",
  "coffee",
  "walk",
  "games",
  "catch up",
] as const;

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  not_invited: "Not invited",
  waiting: "Waiting",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  new_time: "New time",
  moved: "Moved",
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Draft",
  waiting: "Waiting",
  on: "It’s on",
  needs_time: "Needs another time",
  done: "Done",
  cancelled: "Cancelled",
};

export function rhythmDays(friend: Friend): number | null {
  if (friend.rhythm === "none") {
    return null;
  }
  if (friend.rhythm === "custom") {
    return Math.max(1, friend.customDays || 45);
  }
  return (
    RHYTHM_OPTIONS.find((option) => option.value === friend.rhythm)?.days ??
    null
  );
}

/** Cadence baseline: lastMetAt, else createdAt — never treat “no catch-up logged” as overdue on day one. */
export function catchUpBaselineIso(friend: Friend): string {
  return friend.lastMetAt ?? friend.createdAt;
}

export function catchUpStatus(
  friend: Friend,
  now = new Date(),
): FriendCatchUpStatus {
  const days = rhythmDays(friend);
  if (days === null) {
    return "none";
  }
  const since = daysSince(catchUpBaselineIso(friend), now);
  if (since === null) {
    return "none";
  }
  if (since >= days) {
    return "due";
  }
  if (since >= days * 0.7) {
    return "soon";
  }
  return "none";
}

export function catchUpLabel(
  status: FriendCatchUpStatus,
  friend?: Friend,
): string {
  if (status === "due") {
    return "Due";
  }
  if (status === "soon") {
    return "Soon";
  }
  if (friend && friend.rhythm === "none") {
    return "No schedule";
  }
  return "On track";
}

/** Warm last-met copy — no guilt framing. Never claims you have never met. */
export function lastMetLabel(
  lastMetAt: string | null,
  now = new Date(),
): string {
  const days = daysSince(lastMetAt, now);
  if (days === null) {
    return "No catch-ups logged";
  }
  if (days === 0) {
    return "Caught up today";
  }
  if (days === 1) {
    return "Caught up yesterday";
  }
  if (days < 14) {
    return `Caught up ${days} days ago`;
  }
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1
      ? "Caught up about a week ago"
      : `Caught up about ${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months <= 1
    ? "Caught up about a month ago"
    : `Caught up about ${months} months ago`;
}

export function sortFriendsForPicker(
  friends: Friend[],
  plans: Plan[],
  now = new Date(),
): Friend[] {
  const upcomingFriendIds = new Set(
    plans
      .filter((plan) => plan.status !== "done" && plan.status !== "cancelled")
      .filter((plan) => new Date(plan.startAt).getTime() >= now.getTime())
      .flatMap((plan) => plan.friends.map((item) => item.friendId)),
  );

  return [...friends].sort((a, b) => {
    const aDue = catchUpStatus(a, now) === "due" ? 0 : 1;
    const bDue = catchUpStatus(b, now) === "due" ? 0 : 1;
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

export function computePlanStatus(friends: Plan["friends"]): PlanStatus {
  if (friends.length === 0) {
    return "draft";
  }
  const active = friends.filter((item) => item.status !== "moved");
  if (active.length === 0) {
    return "cancelled";
  }
  const anyYes = active.some((item) => item.status === "yes");
  if (anyYes) {
    return "on";
  }
  const allBlocked = active.every(
    (item) => item.status === "no" || item.status === "new_time",
  );
  if (allBlocked) {
    return "needs_time";
  }
  const anyWaiting = active.some(
    (item) => item.status === "waiting" || item.status === "maybe",
  );
  if (anyWaiting) {
    return "waiting";
  }
  const anyInvited = active.some((item) => item.status !== "not_invited");
  return anyInvited ? "waiting" : "draft";
}

export function buildInviteText(input: {
  name: string;
  startAt: string;
  endAt?: string;
  activity?: string;
  place?: string;
  timeFormat24h: boolean;
  tone?: InviteTone;
}): string {
  const name = input.name.trim() || "there";
  const when = formatPlanWhen(input.startAt, input.timeFormat24h, input.endAt);
  const activity = input.activity?.trim();
  const place = input.place?.trim();
  const tone = input.tone ?? "warm";

  if (tone === "casual") {
    if (activity && place) {
      return `Hey ${name} — ${activity} at ${place}, ${when}. In?`;
    }
    if (activity) {
      return `Hey ${name} — ${activity} ${when}. You free?`;
    }
    return `Hey ${name} — I’m free ${when}. Want to catch up?`;
  }

  if (tone === "playful") {
    if (activity && place) {
      return `${name} — ${activity} at ${place}, ${when}. Sounds good?`;
    }
    if (activity) {
      return `${name} — ${activity}, ${when}. Want to?`;
    }
    return `Hey ${name} — I’m free ${when}. You’re the first person I thought of.`;
  }

  if (activity && place) {
    return `Hey ${name} — I’m thinking ${activity} at ${place}, ${when}. Are you in?`;
  }
  if (activity) {
    return `Hey ${name} — I’m thinking ${activity}, ${when}. Want to meet?`;
  }
  return `Hey ${name} — I’m free ${when}. Want to catch up?`;
}

export function formatPlanWhen(
  iso: string,
  timeFormat24h: boolean,
  endIso?: string,
): string {
  const date = new Date(iso);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = days[date.getDay()] ?? "";
  const month = MONTH_LABELS_SHORT[date.getMonth()] ?? "";
  const dayNum = date.getDate();
  const year = date.getFullYear();
  const nowYear = new Date().getFullYear();
  const startMin = date.getHours() * 60 + date.getMinutes();
  let timePart = formatClock(startMin, timeFormat24h);
  if (endIso) {
    const end = new Date(endIso);
    const endMin = end.getHours() * 60 + end.getMinutes();
    timePart = `${formatClock(startMin, timeFormat24h)}–${formatClock(endMin, timeFormat24h)}`;
  }
  const datePart =
    year !== nowYear
      ? `${day}, ${month} ${dayNum}, ${year}`
      : `${day}, ${month} ${dayNum}`;
  return `${datePart} from ${timePart}`;
}

export function formatClock(minutes: number, timeFormat24h: boolean): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const mm = m.toString().padStart(2, "0");
  if (timeFormat24h) {
    return `${h.toString().padStart(2, "0")}:${mm}`;
  }
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${mm} ${suffix}`;
}

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function isActivePlan(plan: Plan): boolean {
  return plan.status !== "cancelled" && plan.status !== "done";
}

export function proposePlanWindow(
  windowStartAt: string,
  windowEndAt: string,
  defaultDurationMinutes: number,
): { startAt: string; endAt: string } {
  const startMs = new Date(windowStartAt).getTime();
  const windowEndMs = new Date(windowEndAt).getTime();
  const durationMs = Math.max(30, defaultDurationMinutes) * 60_000;
  const endMs = Math.min(windowEndMs, startMs + durationMs);
  return {
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(Math.max(startMs + 30 * 60_000, endMs)).toISOString(),
  };
}

/** Build a ConcreteSlot that is not tied to an availability rule. */
export function makeOneOffSlot(
  startAt: string | Date,
  endAt: string | Date,
  label = "One-off",
): ConcreteSlot {
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const end = typeof endAt === "string" ? new Date(endAt) : endAt;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return {
    key: `oneoff:${start.toISOString()}`,
    ruleId: null,
    date: formatDateKey(start),
    startMinutes,
    endMinutes,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    label,
  };
}

/**
 * Default when for a direct “Make a plan” — tomorrow evening, local time.
 * Availability remains optional suggestions, not a gate.
 */
export function defaultOneOffPlanSlot(
  now = new Date(),
  durationMinutes = 60,
): ConcreteSlot {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  if (start.getTime() <= now.getTime()) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(
    start.getTime() + Math.max(30, durationMinutes) * 60_000,
  );
  return makeOneOffSlot(start, end);
}

export function slotConflictsWithPlans(
  startAt: string,
  endAt: string,
  plans: Plan[],
  options?: {
    availabilityKey?: string | null;
    excludePlanId?: string | null;
  },
): boolean {
  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  return plans.some((plan) => {
    if (!isActivePlan(plan)) return false;
    if (options?.excludePlanId && plan.id === options.excludePlanId)
      return false;
    if (
      options?.availabilityKey &&
      plan.availabilityKey === options.availabilityKey
    ) {
      return true;
    }
    return intervalsOverlap(
      startMs,
      endMs,
      new Date(plan.startAt).getTime(),
      new Date(plan.endAt).getTime(),
    );
  });
}

/** True when an active plan overlaps this availability window. */
export function slotIsBooked(
  slot: ConcreteSlot,
  plans: Plan[],
  excludePlanId?: string | null,
): boolean {
  return slotConflictsWithPlans(slot.startAt, slot.endAt, plans, {
    availabilityKey: slot.key,
    excludePlanId: excludePlanId ?? null,
  });
}

/**
 * Suggest plan-sized free windows for scheduling with someone.
 * Prefer distinct days; carve longer free blocks into chunks; look ahead
 * far enough to usually return at least `count` options.
 */
export function suggestSlotsForScheduling(
  rules: AvailabilityRule[],
  skipped: SkippedOccurrence[],
  plans: Plan[],
  options?: {
    count?: number;
    durationMinutes?: number;
    from?: Date;
  },
): ConcreteSlot[] {
  const count = options?.count ?? 3;
  const duration = Math.max(30, options?.durationMinutes ?? 60);
  const from = options?.from ?? startOfDay(new Date());

  const carve = (
    window: ConcreteSlot,
    startMinutes: number,
  ): ConcreteSlot | null => {
    const endMinutes = Math.min(window.endMinutes, startMinutes + duration);
    if (endMinutes - startMinutes < 30) {
      return null;
    }
    const candidate: ConcreteSlot = {
      key: `${window.ruleId ?? "free"}:${window.date}:${startMinutes}`,
      ruleId: window.ruleId,
      date: window.date,
      startMinutes,
      endMinutes,
      startAt: dateAtMinutes(window.date, startMinutes).toISOString(),
      endAt: dateAtMinutes(window.date, endMinutes).toISOString(),
      label: window.label,
    };
    if (slotIsBooked(candidate, plans)) {
      return null;
    }
    return candidate;
  };

  const collect = (dayCount: number): ConcreteSlot[] => {
    const windows = expandAvailability(rules, skipped, from, dayCount)
      .filter(
        (slot) =>
          !slotIsBooked(slot, plans) &&
          slot.endMinutes - slot.startMinutes >= 30,
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

    const picks: ConcreteSlot[] = [];
    const usedDays = new Set<string>();

    // Pass 1: one suggestion per day, at the start of each free window.
    for (const window of windows) {
      if (picks.length >= count) {
        break;
      }
      if (usedDays.has(window.date)) {
        continue;
      }
      const pick = carve(window, window.startMinutes);
      if (pick) {
        picks.push(pick);
        usedDays.add(window.date);
      }
    }

    // Pass 2: fill remaining from later starts inside longer windows.
    if (picks.length < count) {
      for (const window of windows) {
        if (picks.length >= count) {
          break;
        }
        let cursor = window.startMinutes + duration;
        while (cursor + 30 <= window.endMinutes && picks.length < count) {
          const pick = carve(window, cursor);
          if (pick && !picks.some((item) => item.key === pick.key)) {
            picks.push(pick);
          }
          cursor += duration;
        }
      }
    }

    return picks.slice(0, count);
  };

  const first = collect(21);
  if (first.length >= count) {
    return first;
  }
  return collect(42);
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
      if (rule.kind === "oneoff") {
        matches = rule.oneOffDate === dateKey;
      } else if (rule.daysOfWeek.includes(dow)) {
        if (rule.recurrence === "daily" || rule.recurrence === "weekly") {
          matches = true;
        } else if (rule.recurrence === "biweekly") {
          const startDate = parseDateKey(rule.startDate);
          const diffDays = calendarDaysBetween(startDate, day);
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
        label: rule.label || "You’re free",
      });
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export type TimelineItem =
  | { type: "availability"; sortAt: string; slot: ConcreteSlot }
  | { type: "plan"; sortAt: string; plan: Plan }
  | { type: "catch_up"; sortAt: string; friend: Friend }
  | { type: "did_it_happen"; sortAt: string; plan: Plan };

/**
 * Home list: future active plans + future unbooked free times.
 * Optional: one recently ended unresolved plan; at most one catch-up nudge (not chronological).
 */
export function buildTimeline(
  friends: Friend[],
  plans: Plan[],
  slots: ConcreteSlot[],
  now = new Date(),
  options?: { spotlightPlanId?: string | null },
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const nowMs = now.getTime();
  const spotlightId = options?.spotlightPlanId ?? null;

  for (const plan of plans) {
    if (!isActivePlan(plan)) continue;
    if (spotlightId && plan.id === spotlightId) continue;
    if (new Date(plan.endAt).getTime() < nowMs) continue;
    items.push({ type: "plan", sortAt: plan.startAt, plan });
  }

  for (const slot of slots) {
    if (slotIsBooked(slot, plans)) continue;
    if (new Date(slot.endAt).getTime() < nowMs) continue;
    items.push({ type: "availability", sortAt: slot.startAt, slot });
  }

  items.sort((a, b) => a.sortAt.localeCompare(b.sortAt));

  const unresolved = plans
    .filter(
      (plan) =>
        isActivePlan(plan) &&
        new Date(plan.endAt).getTime() < nowMs &&
        new Date(plan.endAt).getTime() > nowMs - 3 * 24 * 60 * 60 * 1000 &&
        (plan.status === "on" || plan.status === "waiting"),
    )
    .sort((a, b) => b.endAt.localeCompare(a.endAt))[0];

  if (unresolved) {
    items.unshift({
      type: "did_it_happen",
      sortAt: unresolved.endAt,
      plan: unresolved,
    });
  }

  const upcomingFriendIds = new Set(
    plans
      .filter(
        (plan) =>
          isActivePlan(plan) && new Date(plan.startAt).getTime() >= nowMs,
      )
      .flatMap((plan) => plan.friends.map((item) => item.friendId)),
  );
  const nudge = friends
    .filter((friend) => catchUpStatus(friend, now) === "due")
    .filter((friend) => !upcomingFriendIds.has(friend.id))
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  if (nudge) {
    items.push({ type: "catch_up", sortAt: now.toISOString(), friend: nudge });
  }

  return items;
}
