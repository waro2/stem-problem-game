/**
 * Tests for GET /api/research/dashboard.
 * Run: npx vitest src/server/researchRouter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';
import type { ResearchDashboardData } from '../api/research';

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

describe('GET /api/research/dashboard', () => {
  beforeEach(async () => {
    await start({
      problemStats: {
        findMany: vi.fn().mockResolvedValue([
          { problemId: 'p-kinematics-01', totalAttempts: 10, totalCompletions: 5, problem: { domain: 'physics' } },
        ]),
      },
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            userId: 'user-1',
            finalScore: 1000,
            stepEfficiencyRatio: 1,
            outcome: 'win',
            startedAt: new Date('2026-06-01T10:00:00Z'),
            hintsUsed: 2,
          },
        ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'user-1', name: 'Alice', cohort: { id: 'cohort-A', name: 'Class A' } },
        ]),
      },
      event: {
        findMany: vi.fn().mockResolvedValue([
          { userId: 'user-1', receivedAt: new Date('2026-06-01T10:05:00Z'), payload: { type: 'formula_activated', timeSinceLast: 5 } },
        ]),
      },
    } as unknown as Database);
  });

  it('returns the three aggregated views', async () => {
    const res = await fetch(`${baseUrl}/api/research/dashboard`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as ResearchDashboardData;
    expect(data.domainCompletion).toEqual([
      { domain: 'physics', totalAttempts: 10, totalCompletions: 5, completionRate: 0.5 },
    ]);
    expect(data.scoreHistory).toEqual([
      { date: '2026-06-01', avgScore: 1000, sessionCount: 1 },
    ]);
    expect(data.cohortLeaderboard).toEqual([
      { userId: 'user-1', displayName: 'Alice', cohortName: 'Class A', totalScore: 1000, sessionsPlayed: 1, avgEfficiency: 1 },
    ]);
  });

  it('returns the 6 GDD trend metrics, broken down per student and per cohort', () => {
    return fetch(`${baseUrl}/api/research/dashboard`)
      .then(res => res.json())
      .then((data: ResearchDashboardData) => {
        const studentSeries = (trend: ResearchDashboardData['stepEfficiencyTrend']) => trend.byStudent[0];
        const cohortSeries = (trend: ResearchDashboardData['stepEfficiencyTrend']) => trend.byCohort[0];

        expect(studentSeries(data.stepEfficiencyTrend)).toEqual({
          groupId: 'user-1', groupLabel: 'Alice', points: [{ date: '2026-06-01', value: 1, sampleSize: 1 }],
        });
        expect(cohortSeries(data.stepEfficiencyTrend)).toEqual({
          groupId: 'cohort-A', groupLabel: 'Class A', points: [{ date: '2026-06-01', value: 1, sampleSize: 1 }],
        });

        expect(studentSeries(data.hintDecayTrend)?.points).toEqual([{ date: '2026-06-01', value: 2, sampleSize: 1 }]);
        expect(studentSeries(data.domainCompletionTrend)?.points).toEqual([{ date: '2026-06-01', value: 1, sampleSize: 1 }]);
        expect(studentSeries(data.cascadeRecognitionTrend)?.points).toEqual([{ date: '2026-06-01', value: 5, sampleSize: 1 }]);
        expect(studentSeries(data.scoreTrajectoryTrend)?.points).toEqual([{ date: '2026-06-01', value: 1000, sampleSize: 1 }]);
        expect(studentSeries(data.stuckRateTrend)?.points).toEqual([{ date: '2026-06-01', value: 0, sampleSize: 1 }]);
      });
  });
});

describe('GET /api/research/dashboard — failure', () => {
  beforeEach(async () => {
    await start({
      problemStats: { findMany: vi.fn().mockRejectedValue(new Error('connection refused')) },
      session: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      event: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as Database);
  });

  it('returns 500 when the database read fails', async () => {
    const res = await fetch(`${baseUrl}/api/research/dashboard`);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/research/export/sessions.csv', () => {
  beforeEach(async () => {
    await start({
      problemStats: { findMany: vi.fn().mockResolvedValue([]) },
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            problemId: 'p-kinematics-01',
            outcome: 'win',
            stepEfficiencyRatio: 1,
            hintsUsed: 2,
            finalScore: 940,
            problem: { domain: 'physics', difficulty: 'intermediate' },
          },
          {
            problemId: 'p-stoich-01',
            outcome: 'stuck',
            stepEfficiencyRatio: null,
            hintsUsed: 0,
            finalScore: null,
            problem: { domain: 'chemistry', difficulty: 'beginner' },
          },
        ]),
      },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      event: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as Database);
  });

  it('returns an anonymised CSV export with no user/PII columns', async () => {
    const res = await fetch(`${baseUrl}/api/research/export/sessions.csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('sessions_export.csv');

    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines[0]).toBe('problem_id,domain,difficulty,outcome,step_efficiency_ratio,hints_used,final_score');
    expect(lines[1]).toBe('p-kinematics-01,physics,intermediate,win,1,2,940');
    expect(lines[2]).toBe('p-stoich-01,chemistry,beginner,stuck,,0,');
  });
});

describe('GET /api/research/export/sessions.csv — failure', () => {
  beforeEach(async () => {
    await start({
      problemStats: { findMany: vi.fn().mockResolvedValue([]) },
      session: { findMany: vi.fn().mockRejectedValue(new Error('connection refused')) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      event: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as Database);
  });

  it('returns 500 when the database read fails', async () => {
    const res = await fetch(`${baseUrl}/api/research/export/sessions.csv`);
    expect(res.status).toBe(500);
  });
});
