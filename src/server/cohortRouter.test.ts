/**
 * Tests for the student-facing cohort leaderboard endpoint.
 * Run: npx vitest src/server/cohortRouter.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';
import type { CohortLeaderboardData } from '../api/leaderboard';

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

describe('GET /api/cohorts/:cohortId/leaderboard', () => {
  it('returns 404 when the cohort does not exist', async () => {
    await start({
      cohort: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
      session: { findMany: vi.fn() },
    } as unknown as Database);

    const res = await fetch(`${baseUrl}/api/cohorts/missing/leaderboard`);
    expect(res.status).toBe(404);
  });

  it('returns enabled: false with no entries when the instructor has not enabled the leaderboard', async () => {
    await start({
      cohort: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cohort-1',
          leaderboardEnabled: false,
          members: [{ id: 'user-1', name: 'Alice' }],
        }),
        update: vi.fn(),
      },
      session: { findMany: vi.fn() },
    } as unknown as Database);

    const res = await fetch(`${baseUrl}/api/cohorts/cohort-1/leaderboard`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as CohortLeaderboardData;
    expect(data).toEqual({ enabled: false, entries: [] });
  });

  it('returns ranked entries when the leaderboard is enabled', async () => {
    await start({
      cohort: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'cohort-1',
          leaderboardEnabled: true,
          members: [
            { id: 'user-1', name: 'Alice' },
            { id: 'user-2', name: 'Bob' },
          ],
        }),
        update: vi.fn(),
      },
      session: {
        findMany: vi.fn().mockResolvedValue([
          { userId: 'user-1', finalScore: 900, stepEfficiencyRatio: 0.8 },
          { userId: 'user-2', finalScore: 700, stepEfficiencyRatio: 0.6 },
        ]),
      },
    } as unknown as Database);

    const res = await fetch(`${baseUrl}/api/cohorts/cohort-1/leaderboard`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as CohortLeaderboardData;
    expect(data).toEqual({
      enabled: true,
      entries: [
        { rank: 1, displayName: 'Alice', totalScore: 900, avgEfficiency: 0.8 },
        { rank: 2, displayName: 'Bob', totalScore: 700, avgEfficiency: 0.6 },
      ],
    });
  });
});
