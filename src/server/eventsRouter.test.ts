/**
 * Tests for POST /api/events.
 * Run: npx vitest src/server/eventsRouter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';
import { Events } from '../api/events';

const SESSION_START = Events.sessionStart('user-1', 'p-kinematics-01', {
  difficulty: 'intermediate',
  domain: 'physics',
  platform: 'web',
  hypothesisCount: 3,
  conclusionCount: 1,
  variableCount: 6,
  formulaCount: 3,
});

let server: Server;
let baseUrl: string;
let createMany: ReturnType<typeof vi.fn>;

function start(db: Database) {
  const app = createApp(db);
  return new Promise<void>(resolve => {
    server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

describe('POST /api/events', () => {
  beforeEach(async () => {
    createMany = vi.fn().mockResolvedValue({ count: 1 });
    await start({ event: { createMany } } as unknown as Database);
  });

  it('accepts a valid batch and persists it', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [SESSION_START] }),
    });

    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({ accepted: 1 });

    expect(createMany).toHaveBeenCalledTimes(1);
    const [{ data }] = createMany.mock.calls[0]!;
    expect(data).toEqual([
      {
        userId: 'user-1',
        problemId: 'p-kinematics-01',
        eventType: 'session_start',
        payload: SESSION_START,
        platform: 'web',
        receivedAt: SESSION_START.timestamp,
      },
    ]);
  });

  it('returns 202 without touching the DB for an empty batch', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    });

    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({ accepted: 0 });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('rejects a malformed body with 400', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ type: 'session_start' }] }),
    });

    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('rejects a body that is not an event batch with 400', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });

    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('sets platform to null for non-session_start events', async () => {
    const hint = Events.hintUsed('user-1', 'p-kinematics-01', {
      hintTier: 1,
      stepNumber: 0,
      activatableCount: 1,
      currentVars: ['d', 'v', 'm'],
    });

    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [hint] }),
    });

    const [{ data }] = createMany.mock.calls[0]!;
    expect(data[0].platform).toBeNull();
  });

  it('rejects a numeric field with a fractional value where an integer is expected', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ ...SESSION_START, hypothesisCount: 1.5 }] }),
    });

    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('rejects a negative count field', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ ...SESSION_START, variableCount: -1 }] }),
    });

    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('blocks a cross-site POST (CSRF protection)', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ events: [SESSION_START] }),
    });

    expect(res.status).toBe(403);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('allows a same-origin POST', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ events: [SESSION_START] }),
    });

    expect(res.status).toBe(202);
  });
});

describe('POST /api/events — rate limiting', () => {
  beforeEach(async () => {
    createMany = vi.fn().mockResolvedValue({ count: 1 });
    await start({ event: { createMany } } as unknown as Database);
  });

  it('returns 429 once a userId exceeds 100 events/minute', async () => {
    const hint = Events.hintUsed('rate-limited-user', 'p-kinematics-01', {
      hintTier: 1,
      stepNumber: 0,
      activatableCount: 1,
      currentVars: ['d', 'v', 'm'],
    });

    const fullBatch = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: Array.from({ length: 100 }, () => hint) }),
    });
    expect(fullBatch.status).toBe(202);

    const oneMore = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [hint] }),
    });
    expect(oneMore.status).toBe(429);
  });

  it('does not rate-limit other users', async () => {
    const hint = Events.hintUsed('user-a', 'p-kinematics-01', {
      hintTier: 1,
      stepNumber: 0,
      activatableCount: 1,
      currentVars: ['d', 'v', 'm'],
    });

    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: Array.from({ length: 100 }, () => hint) }),
    });

    const otherUserHint = { ...hint, userId: 'user-b' };
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [otherUserHint] }),
    });
    expect(res.status).toBe(202);
  });
});

describe('POST /api/events — persistence failure', () => {
  beforeEach(async () => {
    createMany = vi.fn().mockRejectedValue(new Error('connection refused'));
    await start({ event: { createMany } } as unknown as Database);
  });

  it('returns 500 when the database write fails', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [SESSION_START] }),
    });

    expect(res.status).toBe(500);
  });
});
