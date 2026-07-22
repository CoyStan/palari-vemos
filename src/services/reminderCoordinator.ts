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

export type ScheduleOptions = {
  /**
   * Force a full reschedule even if this revision already ran.
   * Used on AppState foreground so consumed one-shots can be replaced.
   */
  reconcile?: boolean;
};

/**
 * Serialized reminder scheduling with a wipe/startFresh barrier.
 * Same-revision calls coalesce while queued/in-flight, but reconcile
 * always runs a fresh pass after the barrier is clear.
 */
export class ReminderCoordinator {
  private chain: Promise<void> = Promise.resolve();
  private generation = 0;
  private revision = 0;
  /** Revision currently queued or running (coalesce key). */
  private pendingRevision: number | null = null;
  /** Last revision that completed a successful schedule (non-reconcile skip). */
  private lastSuccessfulRevision: number | null = null;
  private inFlight = 0;
  private resetting = false;
  private scheduledIds: string[] = [];
  private lastError: string | null = null;

  constructor(private readonly io: ReminderIo) {}

  get wipeGeneration(): number {
    return this.generation;
  }

  get currentRevision(): number {
    return this.revision;
  }

  get isResetting(): boolean {
    return this.resetting;
  }

  get error(): string | null {
    return this.lastError;
  }

  /** Invalidate pending/in-flight schedule work (does not cancel OS reminders yet). */
  invalidate(): void {
    this.generation += 1;
    this.pendingRevision = null;
    this.lastSuccessfulRevision = null;
  }

  /** Enter wipe/startFresh barrier — schedule/reconcile become no-ops. */
  beginReset(): void {
    this.resetting = true;
    this.invalidate();
  }

  /**
   * Queue a reschedule. Older revisions no-op.
   * Without reconcile, coalesces duplicate same-revision work while pending.
   * With reconcile, always enqueues a fresh pass (after barrier clears).
   */
  schedule(
    data: AppData,
    revision?: number,
    options?: ScheduleOptions,
  ): Promise<void> {
    if (this.resetting) {
      return Promise.resolve();
    }

    const genAtEnqueue = this.generation;
    const reconcile = options?.reconcile === true;
    let targetRevision = this.revision;
    if (typeof revision === "number") {
      if (revision < this.revision) {
        return Promise.resolve();
      }
      this.revision = revision;
      targetRevision = revision;
    }

    if (
      !reconcile &&
      this.lastSuccessfulRevision === targetRevision &&
      this.pendingRevision !== targetRevision
    ) {
      return Promise.resolve();
    }

    if (!reconcile && this.pendingRevision === targetRevision) {
      return this.chain;
    }

    this.pendingRevision = targetRevision;

    const run = async () => {
      if (this.resetting || genAtEnqueue !== this.generation) {
        if (this.pendingRevision === targetRevision) {
          this.pendingRevision = null;
        }
        return;
      }
      if (targetRevision < this.revision) {
        if (this.pendingRevision === targetRevision) {
          this.pendingRevision = null;
        }
        return;
      }

      this.inFlight += 1;
      try {
        if (!data.settings.notificationsEnabled) {
          if (this.resetting || genAtEnqueue !== this.generation) return;
          await this.io.cancelAll();
          this.scheduledIds = [];
          this.lastError = null;
          if (genAtEnqueue === this.generation && !this.resetting) {
            this.lastSuccessfulRevision = targetRevision;
          }
          return;
        }

        const granted = await this.io.ensurePermission();
        if (this.resetting || genAtEnqueue !== this.generation) return;
        if (targetRevision < this.revision) return;
        if (!granted) {
          await this.io.cancelAll();
          this.scheduledIds = [];
          this.lastError = null;
          if (genAtEnqueue === this.generation && !this.resetting) {
            this.lastSuccessfulRevision = targetRevision;
          }
          return;
        }

        await this.io.cancelAll();
        if (this.resetting || genAtEnqueue !== this.generation) return;
        if (targetRevision < this.revision) return;

        const specs = buildReminderSpecs(data, this.io.now());
        const ids: string[] = [];
        for (const spec of specs) {
          if (this.resetting || genAtEnqueue !== this.generation) return;
          const id = await this.io.schedule({
            title: spec.title,
            body: spec.body,
            triggerAt: spec.triggerAt,
          });
          ids.push(id);
        }
        if (this.resetting || genAtEnqueue !== this.generation) return;
        this.scheduledIds = ids;
        this.lastError = null;
        this.lastSuccessfulRevision = targetRevision;
      } catch (error) {
        if (!this.resetting && genAtEnqueue === this.generation) {
          this.lastError =
            error instanceof Error
              ? error.message
              : "Could not update reminders.";
        }
      } finally {
        this.inFlight -= 1;
        if (this.pendingRevision === targetRevision) {
          this.pendingRevision = null;
        }
      }
    };

    this.chain = this.chain.then(run, run);
    return this.chain;
  }

  /** Foreground reconciliation — must run even if revision is unchanged. */
  reconcile(data: AppData, revision?: number): Promise<void> {
    return this.schedule(data, revision, { reconcile: true });
  }

  /**
   * Wipe/startFresh: raise barrier, drain in-flight work, cancel OS reminders,
   * then clear the barrier. Optional phase hooks for deterministic tests.
   */
  async resetAndCancel(phases?: {
    afterBarrierRaised?: () => Promise<void>;
    afterDrain?: () => Promise<void>;
  }): Promise<void> {
    this.beginReset();
    if (phases?.afterBarrierRaised) {
      await phases.afterBarrierRaised();
    }
    await this.chain.catch(() => undefined);
    while (this.inFlight > 0) {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (phases?.afterDrain) {
      await phases.afterDrain();
    }
    try {
      await this.io.cancelAll();
      this.scheduledIds = [];
      this.lastError = null;
      this.lastSuccessfulRevision = null;
    } finally {
      this.resetting = false;
    }
  }

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
  permissionGranted: boolean;
  nowDate: Date;
  cancelGate: ReturnType<typeof deferred<void>> | null;
};

/** Build a coordinator with deferred fake IO for tests. */
export function createFakeReminderIo(
  initialNow = new Date("2026-07-21T12:00:00.000Z"),
): FakeReminderIo {
  let cancelled = 0;
  let scheduled: FakeReminderIo["scheduled"] = [];
  let permissionGranted = true;
  let nowDate = initialNow;
  let cancelGate: ReturnType<typeof deferred<void>> | null = null;
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
    get permissionGranted() {
      return permissionGranted;
    },
    set permissionGranted(value: boolean) {
      permissionGranted = value;
    },
    get nowDate() {
      return nowDate;
    },
    set nowDate(value: Date) {
      nowDate = value;
    },
    get cancelGate() {
      return cancelGate;
    },
    set cancelGate(value) {
      cancelGate = value;
    },
    cancelAll: async () => {
      if (cancelGate) {
        await cancelGate.promise;
      }
      cancelled += 1;
      scheduled = [];
    },
    schedule: async (input) => {
      const id = `n_${seq++}`;
      scheduled.push({ ...input, id });
      return id;
    },
    ensurePermission: async () => permissionGranted,
    now: () => nowDate,
  };
  return io;
}
