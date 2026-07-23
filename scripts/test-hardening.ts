/**
 * Hardening tests: storage matrix, wipe races, media URI, move, export cleanup.
 * Run via npm test.
 */
import assert from "node:assert/strict";

import {
  markInviteSentState,
  markPlanDoneState,
  moveFriendToSlotState,
  removeFriend,
  updateAvailabilityRule,
  updateInvitationTextState,
  type AvailabilityInput,
} from "../src/domain/mutations";
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
import {
  BACKUP_KEY,
  clearAppData,
  exportAppDataJson,
  loadAppData,
  saveAppData,
  STORAGE_KEY,
  type StorageAdapter,
} from "../src/persistence/storage";
import { deferred, WriteQueue } from "../src/persistence/writeQueue";
import { resolveOwnedMediaExtension } from "../src/services/mediaUri";
import { shareJsonExportWithIo } from "../src/services/exportShareCore";
import {
  createFakeReminderIo,
  ReminderCoordinator,
} from "../src/services/reminderCoordinator";
import { normalizeAttendedFriendIds } from "../src/persistence/migrate";

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

function basePlan(partial: Partial<Plan> & Pick<Plan, "id">): Plan {
  return {
    title: "Catch up",
    activity: "",
    place: "",
    note: "",
    startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
    endAt: new Date(2026, 6, 23, 20, 0).toISOString(),
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
    calendarExport: null,
    ...partial,
  };
}

function memoryAdapter(
  initial: Record<string, string | null> = {},
): StorageAdapter & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>();
  for (const [key, value] of Object.entries(initial)) {
    if (value !== null) store.set(key, value);
  }
  return {
    store,
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    multiRemove: async (keys) => {
      for (const key of keys) store.delete(key);
    },
  };
}

function validPayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    onboardingComplete: true,
    friends: [
      { id: "a", name: "Ana", rhythm: "monthly", createdAt: now.toISOString() },
    ],
    availability: [],
    skipped: [],
    plans: [],
    catchUps: [],
    settings: {},
    ...overrides,
  });
}

async function main() {
  // --- load matrix ---
  {
    const empty = await loadAppData(memoryAdapter());
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.friends.length, 0);
  }

  {
    const adapter = memoryAdapter({ [STORAGE_KEY]: validPayload() });
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, true);
    if (loaded.ok) assert.equal(loaded.data.friends[0]?.name, "Ana");
  }

  {
    const adapter = memoryAdapter({
      [STORAGE_KEY]: "{not-json",
      [BACKUP_KEY]: validPayload({
        friends: [
          {
            id: "b",
            name: "Bea",
            rhythm: "monthly",
            createdAt: now.toISOString(),
          },
        ],
      }),
    });
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.healedFromBackup, true);
      assert.equal(loaded.data.friends[0]?.name, "Bea");
      assert.ok(adapter.store.get(STORAGE_KEY)?.includes("Bea"));
    }
  }

  {
    const adapter = memoryAdapter({
      [BACKUP_KEY]: validPayload({
        friends: [
          {
            id: "c",
            name: "Cam",
            rhythm: "monthly",
            createdAt: now.toISOString(),
          },
        ],
      }),
    });
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.healedFromBackup, true);
      assert.equal(loaded.data.friends[0]?.name, "Cam");
    }
  }

  {
    const adapter = memoryAdapter({ [STORAGE_KEY]: "{broken" });
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, false);
  }

  {
    const adapter = memoryAdapter({
      [STORAGE_KEY]: "{broken",
      [BACKUP_KEY]: "also-broken",
    });
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, false);
  }

  {
    const future = migrateAndValidate(
      validPayload({ schemaVersion: SCHEMA_VERSION + 5 }),
    );
    assert.equal(future.ok, false);
    if (!future.ok) assert.equal(future.reason, "incompatible");
  }

  {
    const withDrop = migrateAndValidate(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        friends: [
          { id: "x" },
          { id: "a", name: "Ana", createdAt: now.toISOString() },
        ],
        availability: [],
        skipped: [],
        plans: [],
        settings: {},
      }),
    );
    assert.equal(withDrop.ok, true);
    if (withDrop.ok) {
      assert.ok(withDrop.warnings.some((w) => w.includes("Dropped a friend")));
      assert.equal(withDrop.data.friends.length, 1);
    }
  }

  // --- wipe race: exclusive clear is last; in-flight deferred save cannot leave data ---
  {
    const adapter = memoryAdapter({
      [STORAGE_KEY]: validPayload(),
      [BACKUP_KEY]: validPayload(),
    });
    const queue = new WriteQueue();
    const gate = deferred<void>();

    const savePromise = queue.enqueue(async (generation) => {
      await gate.promise;
      if (generation !== queue.wipeGeneration || queue.isResetting) {
        return;
      }
      await adapter.setItem(STORAGE_KEY, validPayload({ marker: "stale" }));
      await adapter.setItem(BACKUP_KEY, validPayload({ marker: "stale" }));
    });

    // Start exclusive wipe while save is blocked on the gate.
    const wipePromise = (async () => {
      await Promise.resolve();
      await queue.runExclusive(async () => {
        await adapter.multiRemove([STORAGE_KEY, BACKUP_KEY]);
      });
    })();

    await Promise.resolve();
    gate.resolve();
    await Promise.all([savePromise, wipePromise]);

    assert.equal(adapter.store.has(STORAGE_KEY), false);
    assert.equal(adapter.store.has(BACKUP_KEY), false);
  }

  {
    const adapter = memoryAdapter();
    const queue = new WriteQueue();
    const gate = deferred<void>();
    let wrote = false;

    void queue.enqueue(async () => {
      await gate.promise;
      await adapter.setItem(STORAGE_KEY, "should-not-stick");
      wrote = true;
    });

    await Promise.resolve();
    const wipe = queue.runExclusive(async () => {
      await adapter.multiRemove([STORAGE_KEY, BACKUP_KEY]);
    });
    gate.resolve();
    await wipe;
    // Even if a naive write ran before clear, exclusive clear is last.
    assert.equal(adapter.store.has(STORAGE_KEY), false);
    void wrote;
  }

  // --- media URI extension ---
  assert.equal(
    resolveOwnedMediaExtension({
      sourceUri: "content://media/external/images/1",
      mimeType: "image/png",
    }),
    "png",
  );
  assert.equal(
    resolveOwnedMediaExtension({
      sourceUri: "file:///tmp/photo.JPEG",
      mimeType: null,
    }),
    "jpg",
  );
  assert.equal(
    resolveOwnedMediaExtension({
      sourceUri: "content://evil/path/photo.exe",
      mimeType: null,
    }),
    "jpg",
  );
  assert.equal(
    resolveOwnedMediaExtension({ sourceUri: "ftp://x/a.gif", mimeType: null }),
    null,
  );
  assert.equal(
    resolveOwnedMediaExtension({
      sourceUri: "https://x/a.webp",
      mimeType: null,
    }),
    "webp",
  );

  // --- export cleanup always runs ---
  {
    let deleted: string | null = null;
    await shareJsonExportWithIo("{}", {
      writeTemp: async () => "file:///tmp/export.json",
      deleteTemp: async (uri) => {
        deleted = uri;
      },
      isAvailable: async () => true,
      shareFile: async () => {
        throw new Error("user cancelled");
      },
      shareText: async () => undefined,
    });
    assert.equal(deleted, "file:///tmp/export.json");
  }

  {
    let deleted: string | null = null;
    const result = await shareJsonExportWithIo('{"ok":true}', {
      writeTemp: async () => "file:///tmp/export2.json",
      deleteTemp: async (uri) => {
        deleted = uri;
      },
      isAvailable: async () => false,
      shareFile: async () => undefined,
      shareText: async () => undefined,
    });
    assert.equal(result.ok, true);
    assert.equal(deleted, "file:///tmp/export2.json");
  }

  // --- attendance + remove friend cancels sole plan ---
  {
    let data: AppData = {
      ...emptyAppData(),
      friends: [
        friend({ id: "a", name: "Ana" }),
        friend({ id: "b", name: "Bea" }),
      ],
      plans: [
        basePlan({
          id: "p1",
          friends: [planFriend("a", "yes"), planFriend("b", "yes")],
          status: "on",
        }),
      ],
    };
    data = markPlanDoneState(data, "p1", ["a"]);
    const done = data.plans[0]!;
    assert.equal(done.status, "done");
    assert.deepEqual(done.attendedFriendIds, ["a"]);
    assert.equal(
      data.friends.find((f) => f.id === "a")?.lastMetAt,
      done.startAt,
    );
    assert.equal(data.friends.find((f) => f.id === "b")?.lastMetAt, null);

    data = removeFriend(data, "a");
    const after = data.plans[0]!;
    assert.ok(after.friends.some((f) => f.friendId.startsWith("gone_")));
    assert.ok(after.attendedFriendIds.some((id) => id.startsWith("gone_")));
  }

  {
    let data: AppData = {
      ...emptyAppData(),
      friends: [friend({ id: "a", name: "Ana" })],
      plans: [
        basePlan({
          id: "solo",
          friends: [planFriend("a", "waiting")],
          status: "waiting",
        }),
      ],
    };
    data = removeFriend(data, "a");
    assert.equal(data.plans[0]?.status, "cancelled");
    assert.equal(data.friends.length, 0);
  }

  // --- move flow ---
  {
    const slotAlt: ConcreteSlot = {
      key: "avail:2026-07-24:1140",
      ruleId: "r",
      date: "2026-07-24",
      startMinutes: 19 * 60,
      endMinutes: 22 * 60,
      startAt: new Date(2026, 6, 24, 19, 0).toISOString(),
      endAt: new Date(2026, 6, 24, 22, 0).toISOString(),
      label: "free",
    };
    const sameSlot: ConcreteSlot = {
      key: "avail:2026-07-23:1140",
      ruleId: "r",
      date: "2026-07-23",
      startMinutes: 19 * 60,
      endMinutes: 22 * 60,
      startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
      endAt: new Date(2026, 6, 23, 22, 0).toISOString(),
      label: "free",
    };
    const occupied: ConcreteSlot = {
      key: "avail:2026-07-25:1140",
      ruleId: "r",
      date: "2026-07-25",
      startMinutes: 19 * 60,
      endMinutes: 22 * 60,
      startAt: new Date(2026, 6, 25, 19, 0).toISOString(),
      endAt: new Date(2026, 6, 25, 22, 0).toISOString(),
      label: "free",
    };

    const soloData: AppData = {
      ...emptyAppData(),
      settings: { ...emptyAppData().settings, defaultDurationMinutes: 60 },
      friends: [friend({ id: "a", name: "Ana" })],
      plans: [
        basePlan({
          id: "src",
          friends: [planFriend("a", "yes")],
          startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
          endAt: new Date(2026, 6, 23, 20, 0).toISOString(),
        }),
      ],
    };

    const same = moveFriendToSlotState(
      soloData,
      "src",
      "a",
      sameSlot,
      (p) => `${p}_n`,
    );
    assert.equal(same.ok, false);
    if (!same.ok) assert.equal(same.reason, "same_slot");

    const moved = moveFriendToSlotState(
      soloData,
      "src",
      "a",
      slotAlt,
      (p) => `${p}_n`,
    );
    assert.equal(moved.ok, true);
    if (moved.ok) {
      assert.equal(moved.sourceCancelled, true);
      assert.equal(moved.newPlan.friends[0]?.friendId, "a");
      const old = moved.data.plans.find((p) => p.id === "src");
      assert.equal(old?.status, "cancelled");
    }

    const groupData: AppData = {
      ...soloData,
      friends: [
        friend({ id: "a", name: "Ana" }),
        friend({ id: "b", name: "Bea" }),
      ],
      plans: [
        basePlan({
          id: "group",
          friends: [planFriend("a", "yes"), planFriend("b", "yes")],
          startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
          endAt: new Date(2026, 6, 23, 20, 0).toISOString(),
        }),
      ],
    };
    const groupMove = moveFriendToSlotState(
      groupData,
      "group",
      "a",
      slotAlt,
      (p) => `${p}_g`,
    );
    assert.equal(groupMove.ok, true);
    if (groupMove.ok) {
      assert.equal(groupMove.sourceCancelled, false);
      const source = groupMove.data.plans.find((p) => p.id === "group");
      assert.ok(
        source?.friends.some((f) => f.friendId === "a" && f.status === "moved"),
      );
      assert.ok(
        source?.friends.some((f) => f.friendId === "b" && f.status === "yes"),
      );
    }

    const busy: AppData = {
      ...soloData,
      plans: [
        ...soloData.plans,
        basePlan({
          id: "other",
          availabilityKey: occupied.key,
          startAt: new Date(2026, 6, 25, 19, 0).toISOString(),
          endAt: new Date(2026, 6, 25, 20, 0).toISOString(),
          friends: [planFriend("b", "yes")],
        }),
      ],
      friends: [
        friend({ id: "a", name: "Ana" }),
        friend({ id: "b", name: "Bea" }),
      ],
    };
    const conflict = moveFriendToSlotState(
      busy,
      "src",
      "a",
      occupied,
      (p) => `${p}_c`,
    );
    assert.equal(conflict.ok, false);
    if (!conflict.ok) assert.equal(conflict.reason, "conflict");
  }

  // --- recurring availability preserves startDate ---
  {
    const data: AppData = {
      ...emptyAppData(),
      availability: [
        {
          id: "r1",
          kind: "recurring",
          label: "Biweekly",
          daysOfWeek: [2],
          startMinutes: 19 * 60,
          endMinutes: 21 * 60,
          recurrence: "biweekly",
          startDate: "2026-06-01",
          endDate: "2026-12-01",
          oneOffDate: null,
          enabled: true,
          createdAt: now.toISOString(),
        },
      ],
    };
    const input: AvailabilityInput = {
      kind: "recurring",
      label: "Biweekly evenings",
      daysOfWeek: [2],
      startMinutes: 18 * 60,
      endMinutes: 20 * 60,
      recurrence: "biweekly",
      startDate: "2026-07-21",
      endDate: null,
      oneOffDate: null,
      enabled: true,
    };
    const updated = updateAvailabilityRule(data, "r1", input);
    assert.equal(updated.availability[0]?.startDate, "2026-06-01");
    assert.equal(updated.availability[0]?.endDate, "2026-12-01");
    assert.equal(updated.availability[0]?.startMinutes, 18 * 60);
  }

  // saveAppData smoke
  {
    const adapter = memoryAdapter();
    await saveAppData(emptyAppData(), adapter);
    assert.ok(adapter.store.get(STORAGE_KEY));
    assert.ok(adapter.store.get(BACKUP_KEY));
  }

  // --- expanded storage matrix ---
  {
    // Future primary + valid older backup => incompatible, zero writes
    const adapter = memoryAdapter({
      [STORAGE_KEY]: validPayload({ schemaVersion: SCHEMA_VERSION + 2 }),
      [BACKUP_KEY]: validPayload({
        friends: [
          {
            id: "a",
            name: "Ana",
            rhythm: "monthly",
            createdAt: now.toISOString(),
          },
        ],
      }),
    });
    const before = new Map(adapter.store);
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, false);
    if (!loaded.ok) assert.equal(loaded.reason, "incompatible");
    assert.deepEqual(
      [...adapter.store.entries()].sort(),
      [...before.entries()].sort(),
    );
  }

  {
    // Corrupt primary + future backup => incompatible, zero writes
    const adapter = memoryAdapter({
      [STORAGE_KEY]: "{not-json",
      [BACKUP_KEY]: validPayload({ schemaVersion: SCHEMA_VERSION + 3 }),
    });
    const before = adapter.store.get(BACKUP_KEY);
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, false);
    if (!loaded.ok) assert.equal(loaded.reason, "incompatible");
    assert.equal(adapter.store.get(BACKUP_KEY), before);
    assert.equal(adapter.store.get(STORAGE_KEY), "{not-json");
  }

  {
    // Primary missing + backup read failure => not empty install
    const adapter: StorageAdapter & { store: Map<string, string> } = {
      store: new Map(),
      getItem: async (key) => {
        if (key === BACKUP_KEY) throw new Error("io fail");
        return null;
      },
      setItem: async (key, value) => {
        adapter.store.set(key, value);
      },
      multiRemove: async (keys) => {
        for (const key of keys) adapter.store.delete(key);
      },
    };
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, false);
    if (!loaded.ok) assert.equal(loaded.reason, "unreadable");
  }

  {
    // Primary IO fail + valid backup => recover with warning
    const adapter: StorageAdapter & { store: Map<string, string> } = {
      store: new Map([
        [
          BACKUP_KEY,
          validPayload({
            friends: [
              {
                id: "z",
                name: "Zoe",
                rhythm: "monthly",
                createdAt: now.toISOString(),
              },
            ],
          }),
        ],
      ]),
      getItem: async (key) => {
        if (key === STORAGE_KEY) throw new Error("primary io");
        return adapter.store.get(key) ?? null;
      },
      setItem: async (key, value) => {
        adapter.store.set(key, value);
      },
      multiRemove: async (keys) => {
        for (const key of keys) adapter.store.delete(key);
      },
    };
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.healedFromBackup, true);
      assert.equal(loaded.data.friends[0]?.name, "Zoe");
      assert.ok(adapter.store.get(STORAGE_KEY)?.includes("Zoe"));
    }
  }

  {
    // Current-schema malformed (missing arrays) must not suppress valid backup
    const malformed = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      onboardingComplete: true,
    });
    const adapter = memoryAdapter({
      [STORAGE_KEY]: malformed,
      [BACKUP_KEY]: validPayload({
        friends: [
          {
            id: "m",
            name: "Mo",
            rhythm: "monthly",
            createdAt: now.toISOString(),
          },
        ],
      }),
    });
    const loaded = await loadAppData(adapter);
    assert.equal(loaded.ok, true);
    if (loaded.ok) {
      assert.equal(loaded.healedFromBackup, true);
      assert.equal(loaded.data.friends[0]?.name, "Mo");
    }
    const alone = migrateAndValidate(malformed);
    assert.equal(alone.ok, false);
    if (!alone.ok) assert.equal(alone.reason, "corrupt");
  }

  {
    // Attendance tombstone normalization
    const friends = [planFriend("gone_a", "yes")];
    assert.deepEqual(
      normalizeAttendedFriendIds(["a", "gone_a", "missing"], friends),
      ["gone_a"],
    );
  }

  {
    // Ghost active plan with no participants is cancelled
    const ghost = migrateAndValidate(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        friends: [],
        availability: [],
        skipped: [],
        plans: [
          {
            id: "ghost",
            startAt: new Date(2026, 6, 23, 19, 0).toISOString(),
            endAt: new Date(2026, 6, 23, 20, 0).toISOString(),
            friends: [{ friendId: "missing", status: "yes" }],
            status: "on",
          },
        ],
        settings: {},
      }),
    );
    assert.equal(ghost.ok, true);
    if (ghost.ok) {
      assert.equal(ghost.data.plans[0]?.status, "cancelled");
    }
  }

  // --- invitation integrity ---
  {
    let data: AppData = {
      ...emptyAppData(),
      friends: [friend({ id: "a", name: "Ana" })],
      plans: [
        basePlan({
          id: "p1",
          friends: [planFriend("a", "yes")],
          status: "on",
        }),
      ],
    };
    data = markInviteSentState(data, "p1", "a", false);
    assert.equal(data.plans[0]?.friends[0]?.status, "yes");

    data = {
      ...data,
      plans: [
        basePlan({
          id: "p2",
          friends: [
            { ...planFriend("a", "waiting"), sentAt: now.toISOString() },
          ],
          status: "waiting",
        }),
      ],
    };
    data = markInviteSentState(data, "p2", "a", false);
    assert.equal(data.plans[0]?.friends[0]?.status, "not_invited");
  }

  {
    let data: AppData = {
      ...emptyAppData(),
      friends: [friend({ id: "a", name: "Ana" })],
      plans: [
        basePlan({
          id: "p1",
          friends: [
            {
              ...planFriend("a", "not_invited"),
              invitationText: "Hello Ana",
              invitationCustomized: false,
            },
          ],
        }),
      ],
    };
    data = updateInvitationTextState(data, "p1", "a", "Hello Ana", false);
    assert.equal(data.plans[0]?.friends[0]?.invitationCustomized, false);
    data = updateInvitationTextState(
      data,
      "p1",
      "a",
      "Hello Ana — coffee?",
      true,
    );
    assert.equal(data.plans[0]?.friends[0]?.invitationCustomized, true);
  }

  // --- reminder coordinator ---
  {
    const io = createFakeReminderIo();
    const coord = new ReminderCoordinator(io);
    const enabled = {
      ...emptyAppData(),
      settings: {
        ...emptyAppData().settings,
        notificationsEnabled: true,
        notifyPlanTomorrow: true,
      },
      plans: [
        basePlan({
          id: "p1",
          startAt: new Date(2026, 6, 24, 19, 0).toISOString(),
          endAt: new Date(2026, 6, 24, 20, 0).toISOString(),
        }),
      ],
    };

    await coord.schedule(enabled, 1);
    const firstCount = io.scheduled.length;
    assert.ok(firstCount >= 1);
    await coord.schedule(enabled, 1);
    assert.equal(io.scheduled.length, firstCount); // same revision: no duplicates

    io.holdNextCancel = true;
    io.gate = deferred<void>();
    const stale = coord.schedule(enabled, 2);
    await Promise.resolve();
    const resetP = coord.resetAndCancel();
    io.gate.resolve();
    await resetP;
    await stale;
    assert.equal(io.scheduled.length, 0);

    // Older revision cannot overwrite newer after a fresh schedule
    const io2 = createFakeReminderIo();
    const coord2 = new ReminderCoordinator(io2);
    await coord2.schedule(enabled, 5);
    const mid = io2.scheduled.length;
    assert.ok(mid >= 1);
    await coord2.schedule(enabled, 3); // older
    assert.equal(io2.scheduled.length, mid);
  }

  // --- schema v4 export includes catchUps; wipe clears it ---
  {
    const withCatchUps: AppData = {
      ...emptyAppData(),
      onboardingComplete: true,
      friends: [friend({ id: "a", name: "Ana" })],
      catchUps: [
        {
          id: "c1",
          friendId: "a",
          date: "2026-07-18",
          createdAt: now.toISOString(),
        },
      ],
    };
    const json = await exportAppDataJson(withCatchUps);
    const parsed = JSON.parse(json) as AppData;
    assert.equal(parsed.schemaVersion, SCHEMA_VERSION);
    assert.equal(parsed.catchUps.length, 1);

    const adapter = memoryAdapter({
      [STORAGE_KEY]: json,
      [BACKUP_KEY]: json,
    });
    await clearAppData(adapter);
    assert.equal(adapter.store.get(STORAGE_KEY), undefined);
    assert.equal(adapter.store.get(BACKUP_KEY), undefined);
  }

  console.log("hardening tests: ok");
  process.stdout.write("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
