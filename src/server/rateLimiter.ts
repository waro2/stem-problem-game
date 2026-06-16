/**
 * STEM Problem Game — In-memory fixed-window rate limiter
 * Source: GDD §8.2 (Server Architecture) — caps analytics ingestion at
 * EVENTS_PER_MINUTE_LIMIT events/minute per userId on POST /api/events.
 */

/** Max events accepted per userId within ONE_MINUTE_MS. */
export const EVENTS_PER_MINUTE_LIMIT = 100;
export const ONE_MINUTE_MS = 60_000;

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window counter keyed by an arbitrary string (here: userId).
 * `now` is an explicit parameter throughout so tests can simulate time
 * passing without real delays.
 */
export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  private remaining(key: string, now: number): number {
    const w = this.windows.get(key);
    if (!w || now >= w.resetAt) return this.limit;
    return this.limit - w.count;
  }

  /** True if consuming `amount` for `key` right now would exceed the limit. */
  wouldExceed(key: string, amount: number, now: number = Date.now()): boolean {
    return amount > this.remaining(key, now);
  }

  /** Record the consumption of `amount` units for `key`. Does not check the limit. */
  consume(key: string, amount: number, now: number = Date.now()): void {
    const w = this.windows.get(key);
    if (!w || now >= w.resetAt) {
      this.windows.set(key, { count: amount, resetAt: now + this.windowMs });
    } else {
      w.count += amount;
    }
  }
}
