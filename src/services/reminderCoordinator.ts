import type { AppData } from "../domain/types";
import { buildReminderSpecs } from "../domain/reminders";
import { deferred } from "../persistence/writeQueue";

export type ReminderIo = {
  cancelAll: () => Promise<void>;
  schedule: (input: {
    title: string;
    body: string;
    triggerAt: Date;
  }) => Promise<string>;
  ensurePermission: () => Promise<boolean>;
  now: () => Date;
};

/**
 * Serialized reminder scheduling. Latest revision wins; wipe generation
 * invalidates in-flight work so stale jobs cannot cancel or schedule after reset.
 */
export class ReminderCoordinator {
  private chain: Promise<void> = Promise.resolve();
  private generation = 0;
  private revision = 0;
  private lastScheduledRevision: number | null = null;
  private inFlight = 0;
  private scheduledIds: string[] = [];

  constructor(private readonly io: ReminderIo) {}

  get wipeGeneration(): number {
    return this.generation;
  }

  get currentRevision(): number {
    return this.revision;
  }

  /** Invalidate pending/in-flight schedule work (does not cancel OS reminders yet). */
  invalidate(): void {
    this.generation += 1;
    this.lastScheduledRevision = null;
  }

  /**
   * Queue a reschedule. Older revisions no-op. Same revision after a successful
   * schedule does not create duplicates.
   */
  schedule(data: AppData, revision?: number): Promise<void> {
    const genAtEnqueue = this.generation;
    let targetRevision = this.revision;
    if (typeof revision === "number") {
      if (revision < this.revision) {
        return Promise.resolve();
      }
      this.revision = revision;
      targetRevision = revision;
    }

    const run = async () => {
      if (genAtEnqueue !== this.generation) return;
      if (targetRevision < this.revision) return;
      if (this.lastScheduledRevision === targetRevision) return;

      this.inFlight += 1;
      try {
        if (!data.settings.notificationsEnabled) {
          if (genAtEnqueue !== this.generation) return;
          await this.io.cancelAll();
          this.scheduledIds = [];
          if (genAtEnqueue === this.generation) {
            this.lastScheduledRevision = targetRevision;
          }
          return;
        }

        const granted = await this.io.ensurePermission();
        if (genAtEnqueue !== this.generation) return;
        if (targetRevision < this.revision) return;
        if (!granted) {
          await this.io.cancelAll();
          this.scheduledIds = [];
          this.lastScheduledRevision = targetRevision;
          return;
        }

        await this.io.cancelAll();
        if (genAtEnqueue !== this.generation) return;
        if (targetRevision < this.revision) return;

        const specs = buildReminderSpecs(data, this.io.now());
        const ids: string[] = [];
        for (const spec of specs) {
          if (genAtEnqueue !== this.generation) return;
          const id = await this.io.schedule({
            title: spec.title,
            body: spec.body,
            triggerAt: spec.triggerAt,
          });
          ids.push(id);
        }
        if (genAtEnqueue !== this.generation) return;
        this.scheduledIds = ids;
        this.lastScheduledRevision = targetRevision;
      } finally {
        this.inFlight -= 1;
      }
    };

    this.chain = this.chain.then(run, run);
    return this.chain;
  }

  /**
   * For wipe/startFresh: invalidate, drain in-flight schedule work, then cancel OS reminders.
   */
  async resetAndCancel(): Promise<void> {
    this.invalidate();
    await this.chain.catch(() => undefined);
    while (this.inFlight > 0) {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await this.io.cancelAll();
    this.scheduledIds = [];
    this.lastScheduledRevision = null;
  }

  /** Test helper: ids scheduled by the last successful run. */
  getScheduledIdsForTests(): string[] {
    return [...this.scheduledIds];
  }
}

export type FakeReminderIo = ReminderIo & {
  cancelled: number;
  scheduled: Array<{
    title: string;
    body: string;
    triggerAt: Date;
    id: string;
  }>;
  gate: ReturnType<typeof deferred<void>>;
  holdNextCancel: boolean;
};

/** Build a coordinator with deferred fake IO for tests. */
export function createFakeReminderIo(): FakeReminderIo {
  const gateBox = { current: deferred<void>() };
  gateBox.current.resolve();
  let cancelled = 0;
  let scheduled: FakeReminderIo["scheduled"] = [];
  let holdNextCancel = false;
  let seq = 0;

  const io: FakeReminderIo = {
    get cancelled() {
      return cancelled;
    },
    set cancelled(value: number) {
      cancelled = value;
    },
    get scheduled() {
      return scheduled;
    },
    set scheduled(value) {
      scheduled = value;
    },
    get holdNextCancel() {
      return holdNextCancel;
    },
    set holdNextCancel(value: boolean) {
      holdNextCancel = value;
    },
    get gate() {
      return gateBox.current;
    },
    set gate(value) {
      gateBox.current = value;
    },
    cancelAll: async () => {
      if (holdNextCancel) {
        await gateBox.current.promise;
      }
      cancelled += 1;
      scheduled = [];
    },
    schedule: async (input) => {
      const id = `n_${seq++}`;
      scheduled.push({ ...input, id });
      return id;
    },
    ensurePermission: async () => true,
    now: () => new Date("2026-07-21T12:00:00.000Z"),
  };
  return io;
}
