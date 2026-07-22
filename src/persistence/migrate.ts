import type {
  AppData,
  AppSettings,
  AvailabilityKind,
  AvailabilityRule,
  CatchUpRhythm,
  Friend,
  InviteStatus,
  Plan,
  PlanFriend,
  PlanStatus,
  Recurrence,
  ShareMethod,
  SkippedOccurrence,
} from "../domain/types";
import { defaultSettings } from "../domain/types";

export const SCHEMA_VERSION = 3;

const SHARE_METHODS: ShareMethod[] = [
  "whatsapp",
  "sms",
  "telegram",
  "message",
  "other",
];
const RHYTHMS: CatchUpRhythm[] = [
  "weekly",
  "monthly",
  "quarterly",
  "custom",
  "none",
];
const INVITE_STATUSES: InviteStatus[] = [
  "not_invited",
  "waiting",
  "yes",
  "maybe",
  "no",
  "new_time",
  "moved",
];
const PLAN_STATUSES: PlanStatus[] = [
  "draft",
  "waiting",
  "on",
  "needs_time",
  "done",
  "cancelled",
];
const KINDS: AvailabilityKind[] = ["recurring", "oneoff"];
const RECURRENCES: Recurrence[] = ["weekly", "biweekly", "daily"];
const TONES = ["warm", "casual", "playful"] as const;

export type LoadResult =
  | { ok: true; data: AppData; warnings: string[]; healedFromBackup?: boolean }
  | {
      ok: false;
      reason: "corrupt" | "unreadable" | "incompatible" | "missing";
      message: string;
      raw: string | null;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampMinutes(value: number): number {
  return Math.max(0, Math.min(24 * 60, Math.round(value)));
}

function clampDay(value: number): number {
  return Math.max(0, Math.min(6, Math.round(value)));
}

function todayKey(): string {
  const now = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function emptyAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboardingComplete: false,
    friends: [],
    availability: [],
    skipped: [],
    plans: [],
    settings: defaultSettings(),
  };
}

function parseSettings(value: unknown): AppSettings {
  const base = defaultSettings();
  if (!isRecord(value)) return base;
  const start = Math.max(
    0,
    Math.min(
      23,
      asNumber(value.calendarDayStartHour, base.calendarDayStartHour),
    ),
  );
  let end = Math.max(
    1,
    Math.min(24, asNumber(value.calendarDayEndHour, base.calendarDayEndHour)),
  );
  if (end <= start) end = Math.min(24, start + 1);
  const duration = asNumber(
    value.defaultDurationMinutes,
    base.defaultDurationMinutes,
  );
  return {
    notificationsEnabled: asBool(
      value.notificationsEnabled,
      base.notificationsEnabled,
    ),
    notifyFreeSlots: asBool(value.notifyFreeSlots, base.notifyFreeSlots),
    notifyCatchUpDue: asBool(value.notifyCatchUpDue, base.notifyCatchUpDue),
    notifyWaitingFollowUp: asBool(
      value.notifyWaitingFollowUp,
      base.notifyWaitingFollowUp,
    ),
    notifyPlanTomorrow: asBool(
      value.notifyPlanTomorrow,
      base.notifyPlanTomorrow,
    ),
    notifyAskIfHappened: asBool(
      value.notifyAskIfHappened,
      base.notifyAskIfHappened,
    ),
    defaultDurationMinutes: [30, 60, 90, 120, 180].includes(duration)
      ? duration
      : base.defaultDurationMinutes,
    firstDayOfWeek: clampDay(
      asNumber(value.firstDayOfWeek, base.firstDayOfWeek),
    ),
    timeFormat24h: asBool(value.timeFormat24h, base.timeFormat24h),
    calendarDayStartHour: start,
    calendarDayEndHour: end,
    showReminderNames: asBool(value.showReminderNames, base.showReminderNames),
  };
}

function parseFriend(value: unknown, warnings: string[]): Friend | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !value.name.trim()
  ) {
    warnings.push("Dropped a friend with missing id or name.");
    return null;
  }
  const createdAt = asString(value.createdAt, new Date().toISOString());
  return {
    id: value.id,
    name: value.name.trim(),
    photoUri: asNullableString(value.photoUri),
    phone: asString(value.phone),
    shareMethod: asEnum(value.shareMethod, SHARE_METHODS, "message"),
    rhythm: asEnum(value.rhythm, RHYTHMS, "monthly"),
    customDays: Math.max(1, asNumber(value.customDays, 45)),
    lastMetAt: (() => {
      const raw = asNullableString(value.lastMetAt);
      if (raw === null) return null;
      return isIsoDate(raw) ? raw : null;
    })(),
    createdAt: isIsoDate(createdAt) ? createdAt : new Date().toISOString(),
  };
}

function parseAvailability(
  value: unknown,
  warnings: string[],
): AvailabilityRule | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    warnings.push("Dropped an availability rule with missing id.");
    return null;
  }
  const kind = asEnum(value.kind, KINDS, "recurring");
  let startMinutes = clampMinutes(asNumber(value.startMinutes, 18 * 60));
  let endMinutes = clampMinutes(asNumber(value.endMinutes, 20 * 60));
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(24 * 60, startMinutes + 60);
  }
  const daysOfWeek = Array.isArray(value.daysOfWeek)
    ? value.daysOfWeek
        .filter((day): day is number => typeof day === "number")
        .map(clampDay)
        .filter((day, index, all) => all.indexOf(day) === index)
    : [];
  const startDate = asString(value.startDate, todayKey());
  const oneOffDate = asNullableString(value.oneOffDate);
  if (kind === "oneoff" && (!oneOffDate || !isDateKey(oneOffDate))) {
    warnings.push(`Dropped one-time availability ${value.id}: missing date.`);
    return null;
  }
  return {
    id: value.id,
    kind,
    label: asString(value.label, kind === "oneoff" ? "One-time" : "Free time"),
    daysOfWeek: kind === "oneoff" ? [] : daysOfWeek,
    startMinutes,
    endMinutes,
    recurrence: asEnum(value.recurrence, RECURRENCES, "weekly"),
    startDate: isDateKey(startDate) ? startDate : todayKey(),
    endDate: (() => {
      const raw = asNullableString(value.endDate);
      return raw && isDateKey(raw) ? raw : null;
    })(),
    oneOffDate: kind === "oneoff" ? oneOffDate : null,
    enabled: value.enabled !== false,
    createdAt: asString(value.createdAt, new Date().toISOString()),
  };
}

function parsePlanFriend(
  value: unknown,
  friendIds: Set<string>,
  planStatus: PlanStatus,
  warnings: string[],
): PlanFriend | null {
  if (!isRecord(value) || typeof value.friendId !== "string") {
    return null;
  }
  const friendId = value.friendId;
  const snapshot = asNullableString(value.displayNameSnapshot);
  const isSnapshotRow = friendId.startsWith("gone_");
  const known = friendIds.has(friendId);

  if (!known && !isSnapshotRow) {
    if ((planStatus === "done" || planStatus === "cancelled") && snapshot) {
      return {
        friendId: `gone_${friendId}`,
        status: asEnum(value.status, INVITE_STATUSES, "yes"),
        invitationText: asString(value.invitationText),
        inviteTone: asEnum(value.inviteTone, TONES, "warm"),
        invitationCustomized: asBool(value.invitationCustomized, false),
        sentAt: asNullableString(value.sentAt),
        displayNameSnapshot: snapshot,
      };
    }
    warnings.push(`Removed plan invitee ${friendId}: friend missing.`);
    return null;
  }

  return {
    friendId,
    status: asEnum(value.status, INVITE_STATUSES, "not_invited"),
    invitationText: asString(value.invitationText),
    inviteTone: asEnum(value.inviteTone, TONES, "warm"),
    invitationCustomized: asBool(value.invitationCustomized, false),
    sentAt: asNullableString(value.sentAt),
    displayNameSnapshot: snapshot,
  };
}

/** Map attendance IDs onto current plan friend rows, including gone_ tombstones. */
export function normalizeAttendedFriendIds(
  rawIds: string[],
  friends: PlanFriend[],
): string[] {
  const friendIds = new Set(friends.map((item) => item.friendId));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of rawIds) {
    let normalized = id;
    if (!friendIds.has(id) && friendIds.has(`gone_${id}`)) {
      normalized = `gone_${id}`;
    }
    if (!friendIds.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function isTerminalStatus(status: PlanStatus): boolean {
  return status === "done" || status === "cancelled";
}

function parsePlan(
  value: unknown,
  friendIds: Set<string>,
  warnings: string[],
): Plan | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.startAt !== "string"
  ) {
    warnings.push("Dropped a plan with missing id or start time.");
    return null;
  }
  if (!isIsoDate(value.startAt)) {
    warnings.push(`Dropped plan ${value.id}: invalid startAt.`);
    return null;
  }
  let status = asEnum(value.status, PLAN_STATUSES, "draft");
  const endAt = asString(value.endAt, value.startAt);
  const friends = Array.isArray(value.friends)
    ? value.friends
        .map((item) => parsePlanFriend(item, friendIds, status, warnings))
        .filter((item): item is PlanFriend => item !== null)
    : [];

  const attendedFriendIds = Array.isArray(value.attendedFriendIds)
    ? normalizeAttendedFriendIds(
        value.attendedFriendIds.filter(
          (id): id is string => typeof id === "string",
        ),
        friends,
      )
    : [];

  const activeParticipants = friends.filter((item) => item.status !== "moved");
  if (!isTerminalStatus(status) && activeParticipants.length === 0) {
    warnings.push(
      `Cancelled plan ${value.id}: no remaining participants after migration.`,
    );
    status = "cancelled";
  }

  return {
    id: value.id,
    title: asString(value.title, "Catch up"),
    activity: asString(value.activity),
    place: asString(value.place),
    note: asString(value.note),
    startAt: value.startAt,
    endAt: isIsoDate(endAt) ? endAt : value.startAt,
    availabilityKey: asNullableString(value.availabilityKey),
    friends,
    status,
    memoryNote: asString(value.memoryNote),
    memoryPhotoUri: asNullableString(value.memoryPhotoUri),
    attendedFriendIds,
    completedAt: asNullableString(value.completedAt),
    cancelledAt:
      status === "cancelled"
        ? (asNullableString(value.cancelledAt) ?? new Date().toISOString())
        : asNullableString(value.cancelledAt),
    createdAt: asString(value.createdAt, new Date().toISOString()),
    updatedAt: asString(value.updatedAt, new Date().toISOString()),
  };
}

function parseSkipped(
  value: unknown,
  ruleIds: Set<string>,
): SkippedOccurrence | null {
  if (!isRecord(value)) return null;
  const ruleId = asString(value.ruleId);
  const date = asString(value.date);
  if (!ruleId || !isDateKey(date) || !ruleIds.has(ruleId)) return null;
  return { ruleId, date };
}

/**
 * Current-schema documents must include top-level arrays/objects.
 * Legacy (no schemaVersion) stays tolerant.
 */
function currentSchemaShapeInvalid(parsed: Record<string, unknown>): boolean {
  if (typeof parsed.schemaVersion !== "number") return false;
  if (parsed.schemaVersion > SCHEMA_VERSION) return false;
  if (!Array.isArray(parsed.friends)) return true;
  if (!Array.isArray(parsed.availability)) return true;
  if (!Array.isArray(parsed.skipped)) return true;
  if (!Array.isArray(parsed.plans)) return true;
  if (parsed.settings !== undefined && !isRecord(parsed.settings)) return true;
  return false;
}

/** Migrate any stored payload (versioned or legacy) into validated AppData. */
export function migrateAndValidate(raw: string | null): LoadResult {
  if (raw === null || raw === "") {
    return { ok: true, data: emptyAppData(), warnings: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      reason: "corrupt",
      message: "Your saved data could not be read (invalid JSON).",
      raw,
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: "corrupt",
      message: "Your saved data has an unexpected shape.",
      raw,
    };
  }

  if (
    typeof parsed.schemaVersion === "number" &&
    parsed.schemaVersion > SCHEMA_VERSION
  ) {
    return {
      ok: false,
      reason: "incompatible",
      message: `This save was written by a newer So, When? (schema ${parsed.schemaVersion}). Update the app to open it.`,
      raw,
    };
  }

  if (currentSchemaShapeInvalid(parsed)) {
    return {
      ok: false,
      reason: "corrupt",
      message: "Your saved data is missing required fields.",
      raw,
    };
  }

  const warnings: string[] = [];
  const friends = Array.isArray(parsed.friends)
    ? parsed.friends
        .map((item) => parseFriend(item, warnings))
        .filter((item): item is Friend => item !== null)
    : [];
  const friendIds = new Set(friends.map((friend) => friend.id));

  const availability = Array.isArray(parsed.availability)
    ? parsed.availability
        .map((item) => parseAvailability(item, warnings))
        .filter((item): item is AvailabilityRule => item !== null)
    : [];
  const ruleIds = new Set(availability.map((rule) => rule.id));

  const skippedRaw = Array.isArray(parsed.skipped) ? parsed.skipped : [];
  const skipped: SkippedOccurrence[] = [];
  const skipKeys = new Set<string>();
  for (const item of skippedRaw) {
    const skip = parseSkipped(item, ruleIds);
    if (!skip) continue;
    const key = `${skip.ruleId}|${skip.date}`;
    if (skipKeys.has(key)) continue;
    skipKeys.add(key);
    skipped.push(skip);
  }

  const plans = Array.isArray(parsed.plans)
    ? parsed.plans
        .map((item) => parsePlan(item, friendIds, warnings))
        .filter((item): item is Plan => item !== null)
    : [];

  const onboardingComplete =
    asBool(parsed.onboardingComplete, false) || friends.length > 0;

  return {
    ok: true,
    data: {
      schemaVersion: SCHEMA_VERSION,
      onboardingComplete,
      friends,
      availability,
      skipped,
      plans,
      settings: parseSettings(parsed.settings),
    },
    warnings,
  };
}

/** True when raw is missing (fresh install), not corrupt. */
export function isAbsentRaw(raw: string | null): boolean {
  return raw === null || raw === "";
}
