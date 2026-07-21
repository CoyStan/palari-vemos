/**
 * Serializes AsyncStorage writes and exclusive reset (wipe/startFresh).
 * Pending commits become no-ops after invalidate; exclusive ops wait for
 * already-started work, then run clear as the final step.
 */
export class WriteQueue {
  private chain: Promise<void> = Promise.resolve();
  private generation = 0;
  private lastError: string | null = null;
  private resetting = false;
  private inFlight = 0;

  get error(): string | null {
    return this.lastError;
  }

  get wipeGeneration(): number {
    return this.generation;
  }

  get isResetting(): boolean {
    return this.resetting;
  }

  /** Bump generation so older queued writes become no-ops. */
  invalidate(): void {
    this.generation += 1;
  }

  /**
   * Queue a save. No-ops if generation changed or a reset is running.
   * Returns after this write attempt finishes (success or caught failure).
   */
  enqueue(write: (generation: number) => Promise<void>): Promise<void> {
    if (this.resetting) {
      return Promise.resolve();
    }
    const gen = this.generation;
    const run = async () => {
      if (gen !== this.generation || this.resetting) {
        return;
      }
      this.inFlight += 1;
      try {
        await write(gen);
        if (gen === this.generation && !this.resetting) {
          this.lastError = null;
        }
      } catch (error) {
        if (gen === this.generation && !this.resetting) {
          this.lastError =
            error instanceof Error ? error.message : "Could not save.";
        }
      } finally {
        this.inFlight -= 1;
      }
    };
    this.chain = this.chain.then(run, run);
    return this.chain;
  }

  /**
   * Exclusive wipe/startFresh: invalidate pending work, wait for in-flight
   * saves to finish, then run `resetOp` as the final storage mutation.
   */
  async runExclusive(resetOp: () => Promise<void>): Promise<void> {
    this.resetting = true;
    this.invalidate();
    this.lastError = null;
    try {
      // Drain the chain so any already-started write finishes (as a no-op save).
      await this.chain.catch(() => undefined);
      // Extra tick if a write incremented inFlight after chain settled.
      while (this.inFlight > 0) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await resetOp();
      this.lastError = null;
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : "Could not reset data.";
      throw error;
    } finally {
      this.resetting = false;
    }
  }
}

/** Pure helper for tests: apply sequential updaters against a snapshot. */
export function applyUpdaters<T>(
  initial: T,
  updaters: Array<(current: T) => T>,
): T {
  return updaters.reduce((current, updater) => updater(current), initial);
}

/** Test helper: deferred promise that resolves when you call resolve(). */
export function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
