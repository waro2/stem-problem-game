/**
 * Tests for the instructor dashboard API.
 * Run: npx vitest src/server/instructorRouter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';
import type { InstructorDashboardData } from '../api/instructor';
import { DEFAULT_SCORE_CONFIG } from '../game/types';

let server: Server;
let baseUrl: string;

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

describe('GET /api/instructor/cohorts/:cohortId/dashboard', () => {
  beforeEach(async () => {
    await start({
      cohort: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cohort-1',
          name: 'Class A',
          scoreConfig: { stepPenalty: 30 },
          leaderboardEnabled: true,
          members: [{ id: 'user-1', name: 'Alice', email: 'alice@example.com' }],
        }),
        update: vi.fn(),
      },
      session: {
        findMany: vi.fn().mockResolvedValue([
          { userId: 'user-1', finalScore: 900, outcome: 'win', problem: { domain: 'physics' } },
          { userId: 'user-1', finalScore: 300, outcome: 'stuck', problem: { domain: 'physics' } },
        ]),
      },
    } as unknown as Database);
  });

  it('returns the cohort roster with completion rates and merged score config', async () => {
    const res = await fetch(`${baseUrl}/api/instructor/cohorts/cohort-1/dashboard`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as InstructorDashboardData;
    expect(data.cohortName).toBe('Class A');
    expect(data.students).toEqual([
      {
        userId: 'user-1',
        displayName: 'Alice',
        avgScore: 600,
        sessionsPlayed: 2,
        domainCompletion: [{ domain: 'physics', completionRate: 0.5 }],
      },
    ]);
    expect(data.scoreConfig).toEqual({ ...DEFAULT_SCORE_CONFIG, stepPenalty: 30 });
    expect(data.leaderboardEnabled).toBe(true);
  });
});

describe('GET /api/instructor/cohorts/:cohortId/dashboard — not found', () => {
  beforeEach(async () => {
    await start({
      cohort: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
      session: { findMany: vi.fn() },
    } as unknown as Database);
  });

  it('returns 404 when the cohort does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/instructor/cohorts/missing/dashboard`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/instructor/cohorts/:cohortId/score-config', () => {
  beforeEach(async () => {
    await start({
      cohort: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'cohort-1', scoreConfig: { stepPenalty: 15, hintPenalty: 40 } }),
      },
      session: { findMany: vi.fn() },
    } as unknown as Database);
  });

  it('persists a valid score config and returns it merged with defaults', async () => {
    const res = await fetch(`${baseUrl}/api/instructor/cohorts/cohort-1/score-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...DEFAULT_SCORE_CONFIG, stepPenalty: 15, hintPenalty: 40 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ...DEFAULT_SCORE_CONFIG, stepPenalty: 15, hintPenalty: 40 });
  });

  it('rejects an invalid score config with 400', async () => {
    const res = await fetch(`${baseUrl}/api/instructor/cohorts/cohort-1/score-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepPenalty: -5 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/instructor/cohorts/:cohortId/leaderboard', () => {
  beforeEach(async () => {
    await start({
      cohort: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'cohort-1', scoreConfig: null, leaderboardEnabled: true }),
      },
      session: { findMany: vi.fn() },
    } as unknown as Database);
  });

  it('persists the leaderboard enabled flag', async () => {
    const res = await fetch(`${baseUrl}/api/instructor/cohorts/cohort-1/leaderboard`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ leaderboardEnabled: true });
  });

  it('rejects a non-boolean "enabled" value with 400', async () => {
    const res = await fetch(`${baseUrl}/api/instructor/cohorts/cohort-1/leaderboard`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: 'yes' }),
    });
    expect(res.status).toBe(400);
  });
});
