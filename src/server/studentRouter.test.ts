/**
 * Tests for GET /api/students/:userId/domain-stats.
 * Run: npx vitest src/server/studentRouter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';
import type { StudentDomainStatsRow } from '../api/recommendation';

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

describe('GET /api/students/:userId/domain-stats', () => {
  beforeEach(async () => {
    await start({
      studentDomainStats: {
        findMany: vi.fn().mockResolvedValue([
          {
            domain: 'chemistry',
            problemsAttempted: 2,
            problemsCompleted: 1,
            avgScore: 400,
            avgEfficiency: 0.5,
            completionRate: 0.5,
          },
        ]),
      },
    } as unknown as Database);
  });

  it('returns the domain stats for the requested user', async () => {
    const res = await fetch(`${baseUrl}/api/students/user-1/domain-stats`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as StudentDomainStatsRow[];
    expect(data).toEqual([
      { domain: 'chemistry', problemsAttempted: 2, problemsCompleted: 1, avgScore: 400, avgEfficiency: 0.5, completionRate: 0.5 },
    ]);
  });
});

describe('GET /api/students/:userId/domain-stats — failure', () => {
  beforeEach(async () => {
    await start({
      studentDomainStats: { findMany: vi.fn().mockRejectedValue(new Error('connection refused')) },
    } as unknown as Database);
  });

  it('returns 500 when the database read fails', async () => {
    const res = await fetch(`${baseUrl}/api/students/user-1/domain-stats`);
    expect(res.status).toBe(500);
  });
});
