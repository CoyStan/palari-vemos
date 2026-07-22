/**
 * Domain + persistence tests. Run: npm test
 */
import assert from "node:assert/strict";

import {
  buildInviteText,
  buildTimeline,
  catchUpStatus,
  defaultOneOffPlanSlot,
  intervalsOverlap,
  proposePlanWindow,
  rhythmDays,
  slotIsBooked,
} from "../src/domain/model";
import {
  completeOnboardingState,
  createPlanState,
  lookAroundFirst,
  markPlanDoneState,
  skipOccurrenceOnce,
  updateSettings,
} from "../src/domain/mutations";
import {
  buildReminderSpecs,
  CATCH_UP_NUDGE_WEEKS,
} from "../src/domain/reminders";
import { calendarDaysBetween, daysSince, startOfDay } from "../src/domain/time";
import type {
  AppData,
  ConcreteSlot,
  Friend,
  Plan,
  PlanFriend,
} from "../src/domain/types";
import {
  emptyAppData,
  migrateAndValidate,
  SCHEMA_VERSION,
} from "../src/persistence/migrate";
import { applyUpdaters } from "../src/persistence/writeQueue";

const now = new Date("2026-07-21T12:00:00.000Z");

function friend(
  partial: Partial<Friend> & Pick<Friend, "id" | "name">,
): Friend {
  return {
    photoUri: null,
    phone: "",
    shareMethod: "message",
    rhythm: "weekly",
    customDays: 45,
    lastMetAt: null,
    createdAt: now.toISOString(),
    ...partial,
  };
}

function planFriend(
  friendId: string,
  status: PlanFriend["status"],
): PlanFriend {
  return {
    friendId,
    status,
    invitationText: "",
    inviteTone: "warm",
    invitationCustomized: false,
    sentAt: null,
    displayNameSnapshot: null,
  };
}

assert.equal(
  rhythmDays(friend({ id: "1", name: "Ana", rhythm: "none" })),
  null,
);
assert.equal(
  catchUpStatus(
    friend({
      id: "1",
      name: "Ana",
      lastMetAt: null,
      createdAt: now.toISOString(),
    }),
    now,
  ),
  "none",
);
assert.equal(
  catchUpStatus(
    friend({
      id: "1",
      name: "Ana",
      lastMetAt: null,
      createdAt: "2026-01-01T12:00:00.000Z",
      rhythm: "monthly",
    }),
    now,
  ),
  "due",
);

assert.equal(intervalsOverlap(19 * 60, 22 * 60, 20 * 60, 21 * 60), true);
assert.equal(intervalsOverlap(19 * 60, 22 * 60, 22 * 60, 23 * 60), false);

const plan710: Plan = {
  id: "p1",
  title: "Catch up",
  activity: "",
  place: "",
  note: "",
  startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
  endAt: new Date(2026, 6, 23, 22, 0).toISOString(),
  availabilityKey: "avail:2026-07-23:1140",
  friends: [planFriend("a", "yes")],
  status: "on",
  memoryNote: "",
  memoryPhotoUri: null,
  attendedFriendIds: [],
  completedAt: null,
  cancelledAt: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const slot89: ConcreteSlot = {
  key: "x",
  ruleId: "r",
  date: "2026-07-23",
  startMinutes: 20 * 60,
  endMinutes: 21 * 60,
  startAt: new Date(2026, 6, 23, 20, 0).toISOString(),
  endAt: new Date(2026, 6, 23, 21, 0).toISOString(),
  label: "free",
};
assert.equal(slotIsBooked(slot89, [plan710]), true);

const slot1011: ConcreteSlot = {
  ...slot89,
  startMinutes: 22 * 60,
  endMinutes: 23 * 60,
  startAt: new Date(2026, 6, 23, 22, 0).toISOString(),
  endAt: new Date(2026, 6, 23, 23, 0).toISOString(),
};
assert.equal(slotIsBooked(slot1011, [plan710]), false);
assert.equal(
  slotIsBooked(slot89, [{ ...plan710, status: "cancelled" }]),
  false,
);

const window = proposePlanWindow(
  new Date(2026, 6, 23, 19, 0).toISOString(),
  new Date(2026, 6, 23, 22, 0).toISOString(),
  60,
);
assert.equal(new Date(window.startAt).getHours(), 19);
assert.equal(new Date(window.endAt).getHours(), 20);

const invite = buildInviteText({
  name: "Ana",
  startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
  endAt: new Date(2026, 6, 23, 21, 0).toISOString(),
  timeFormat24h: false,
});
assert.ok(invite.includes("Ana"));
assert.ok(!invite.includes("Attendance mandatory"));

assert.equal(
  calendarDaysBetween(
    startOfDay(new Date(2026, 2, 7)),
    startOfDay(new Date(2026, 2, 9)),
  ),
  2,
);
assert.equal(
  daysSince(
    startOfDay(new Date(2026, 2, 7)).toISOString(),
    startOfDay(new Date(2026, 2, 9)),
  ),
  2,
);

const legacy = JSON.stringify({
  onboardingComplete: true,
  friends: [
    { id: "f1", name: "Ana", rhythm: "monthly", createdAt: now.toISOString() },
  ],
  availability: [],
  skipped: [],
  plans: [],
  settings: {},
});
const migrated = migrateAndValidate(legacy);
assert.equal(migrated.ok, true);
if (migrated.ok) {
  assert.equal(migrated.data.schemaVersion, SCHEMA_VERSION);
  assert.equal(migrated.data.friends[0]?.name, "Ana");
}
assert.equal(migrateAndValidate("{not json").ok, false);

let data: AppData = emptyAppData();
data = applyUpdaters(data, [
  (d) => updateSettings(d, { timeFormat24h: true }),
  (d) => updateSettings(d, { defaultDurationMinutes: 60 }),
]);
assert.equal(data.settings.timeFormat24h, true);
assert.equal(data.settings.defaultDurationMinutes, 60);

data = completeOnboardingState(
  emptyAppData(),
  {
    friend: {
      name: "Ana",
      photoUri: null,
      phone: "",
      shareMethod: "message",
      rhythm: "monthly",
      customDays: 45,
      lastMetAt: null,
    },
    availability: null,
  },
  (prefix) => `${prefix}_1`,
);
assert.equal(data.friends.length, 1);
assert.equal(data.friends[0]?.name, "Ana");
assert.equal(data.availability.length, 0);
assert.equal(lookAroundFirst(emptyAppData()).onboardingComplete, true);
assert.equal(lookAroundFirst(emptyAppData()).friends.length, 0);

data = skipOccurrenceOnce(data, "r1", "2026-07-23");
data = skipOccurrenceOnce(data, "r1", "2026-07-23");
assert.equal(data.skipped.length, 1);

const slot: ConcreteSlot = {
  key: "avail:2026-07-23:1140",
  ruleId: "avail",
  date: "2026-07-23",
  startMinutes: 19 * 60,
  endMinutes: 22 * 60,
  startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
  endAt: new Date(2026, 6, 23, 22, 0).toISOString(),
  label: "free",
};
const withFriend = completeOnboardingState(
  emptyAppData(),
  {
    friend: {
      name: "Ana",
      photoUri: null,
      phone: "",
      shareMethod: "message",
      rhythm: "monthly",
      customDays: 45,
      lastMetAt: null,
    },
  },
  (p) => `${p}_x`,
);
const created = createPlanState(
  withFriend,
  slot,
  [withFriend.friends[0]!.id],
  {
    title: "",
    activity: "",
    place: "",
    note: "",
  },
  (p) => `${p}_p`,
);
assert.equal(created.ok, true);
if (created.ok) {
  const conflict = createPlanState(
    created.data,
    slot,
    [withFriend.friends[0]!.id],
    {
      title: "",
      activity: "",
      place: "",
      note: "",
    },
    (p) => `${p}_p2`,
  );
  assert.equal(conflict.ok, false);
  const done = markPlanDoneState(created.data, created.plan.id, [
    withFriend.friends[0]!.id,
  ]);
  assert.equal(
    done.plans.find((p) => p.id === created.plan.id)?.status,
    "done",
  );
  assert.equal(done.friends[0]?.lastMetAt, created.plan.startAt);
}

const timeline = buildTimeline(
  [friend({ id: "a", name: "Ana" })],
  [
    { ...plan710, status: "done" },
    {
      ...plan710,
      id: "p2",
      status: "on",
      startAt: new Date(2026, 6, 24, 19, 0).toISOString(),
      endAt: new Date(2026, 6, 24, 21, 0).toISOString(),
    },
  ],
  [],
  new Date(2026, 6, 21, 12, 0),
);
assert.ok(
  !timeline.some((item) => item.type === "plan" && item.plan.status === "done"),
);

const specs = buildReminderSpecs(
  {
    ...emptyAppData(),
    settings: {
      ...emptyAppData().settings,
      notificationsEnabled: true,
      notifyPlanTomorrow: true,
      notifyCatchUpDue: true,
      notifyAskIfHappened: true,
    },
    plans: [
      {
        ...plan710,
        startAt: new Date(2026, 6, 24, 19, 0).toISOString(),
        endAt: new Date(2026, 6, 24, 21, 0).toISOString(),
      },
    ],
  },
  new Date(2026, 6, 22, 12, 0),
);
assert.ok(specs.length >= 1);
assert.ok(specs.every((s) => !s.body.toLowerCase().includes("ana")));

{
  const dueFriends = [
    {
      id: "aaron",
      name: "Aaron",
      photoUri: null,
      phone: "",
      shareMethod: "message" as const,
      rhythm: "weekly" as const,
      customDays: 45,
      lastMetAt: "2020-01-01T12:00:00.000Z",
      createdAt: "2026-01-01T12:00:00.000Z",
    },
    {
      id: "bella",
      name: "Bella",
      photoUri: null,
      phone: "",
      shareMethod: "message" as const,
      rhythm: "weekly" as const,
      customDays: 45,
      lastMetAt: "2020-01-01T12:00:00.000Z",
      createdAt: "2026-01-01T12:00:00.000Z",
    },
  ];
  const catchUpSpecs = buildReminderSpecs(
    {
      ...emptyAppData(),
      settings: {
        ...emptyAppData().settings,
        notificationsEnabled: true,
        notifyCatchUpDue: true,
        notifyPlanTomorrow: false,
        notifyAskIfHappened: false,
        showReminderNames: true,
      },
      friends: dueFriends,
    },
    new Date(2026, 6, 21, 12, 0),
  );
  const catchUps = catchUpSpecs.filter((s) => s.key.startsWith("catchup:"));
  assert.equal(catchUps.length, CATCH_UP_NUDGE_WEEKS);
  assert.ok(catchUps.some((s) => s.body.includes("Aaron")));
  assert.ok(catchUps.some((s) => s.body.includes("Bella")));
  assert.ok(
    catchUps[0]!.triggerAt.getTime() < catchUps[1]!.triggerAt.getTime(),
  );
}

{
  const slot = defaultOneOffPlanSlot(new Date(2026, 6, 21, 12, 0), 60);
  assert.equal(slot.ruleId, null);
  assert.ok(slot.key.startsWith("oneoff:"));
  assert.ok(
    new Date(slot.startAt).getTime() > new Date(2026, 6, 21, 12, 0).getTime(),
  );
}

console.log("all tests: ok");
