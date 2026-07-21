/**
 * Serializes AsyncStorage writes so rapid mutations cannot complete out of order.
 * Wipe generation invalidates in-flight writers so they cannot repopulate after wipe.
 */
export type PersistFn = (payload: string) => Promise<void>;

export class WriteQueue {
  private chain: Promise<void> = Promise.resolve();
  private generation = 0;
  private lastError: string | null = null;

  get error(): string | null {
    return this.lastError;
  }

  get wipeGeneration(): number {
    return this.generation;
  }

  /** Bump generation so older queued writes become no-ops. */
  invalidate(): void {
    this.generation += 1;
    this.lastError = null;
  }

  enqueue(write: (generation: number) => Promise<void>): Promise<void> {
    const gen = this.generation;
    const run = async () => {
      if (gen !== this.generation) {
        return;
      }
      try {
        await write(gen);
        if (gen === this.generation) {
          this.lastError = null;
        }
      } catch (error) {
        if (gen === this.generation) {
          this.lastError = error instanceof Error ? error.message : 'Could not save.';
        }
        // Do not rethrow — failed writes must not poison later queued writes.
      }
    };
    this.chain = this.chain.then(run, run);
    return this.chain;
  }
}

/** Pure helper for tests: apply sequential updaters against a snapshot. */
export function applyUpdaters<T>(
  initial: T,
  updaters: Array<(current: T) => T>,
): T {
  return updaters.reduce((current, updater) => updater(current), initial);
}
