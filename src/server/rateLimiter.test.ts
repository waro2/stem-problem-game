/**
 * Unit tests for the in-memory fixed-window rate limiter.
 * Run: npx vitest src/server/rateLimiter.test.ts
 */

import { describe, it, expect } from 'vitest';
import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
  it('allows consumption up to the limit', () => {
    const limiter = new RateLimiter(100, 60_000);
    const now = 0;
    expect(limiter.wouldExceed('user-1', 100, now)).toBe(false);
    limiter.consume('user-1', 100, now);
    expect(limiter.wouldExceed('user-1', 1, now)).toBe(true);
  });

  it('accumulates consumption within the same window', () => {
    const limiter = new RateLimiter(100, 60_000);
    const now = 0;
    limiter.consume('user-1', 60, now);
    limiter.consume('user-1', 39, now + 1000);
    expect(limiter.wouldExceed('user-1', 1, now + 2000)).toBe(false);
    expect(limiter.wouldExceed('user-1', 2, now + 2000)).toBe(true);
  });

  it('resets the window once it expires', () => {
    const limiter = new RateLimiter(100, 60_000);
    const now = 0;
    limiter.consume('user-1', 100, now);
    expect(limiter.wouldExceed('user-1', 100, now + 59_999)).toBe(true);
    expect(limiter.wouldExceed('user-1', 100, now + 60_000)).toBe(false);
  });

  it('tracks each key independently', () => {
    const limiter = new RateLimiter(100, 60_000);
    const now = 0;
    limiter.consume('user-1', 100, now);
    expect(limiter.wouldExceed('user-1', 1, now)).toBe(true);
    expect(limiter.wouldExceed('user-2', 100, now)).toBe(false);
  });

  it('rejects a single request that alone exceeds the limit', () => {
    const limiter = new RateLimiter(100, 60_000);
    expect(limiter.wouldExceed('user-1', 101, 0)).toBe(true);
  });
});
