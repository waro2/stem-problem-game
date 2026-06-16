/**
 * Tests for the nightly aggregation job.
 * Run: npx vitest src/server/jobs/aggregateStats.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  computeStudentDomainStats,
  computeProblemStats,
  aggregateNightlyStats,
  type SessionRecord,
  type StatsDatabase,
} from './aggregateStats';

function session(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    userId: 'user-1',
    problemId: 'p-kinematics-01',
    domain: 'physics',
    outcome: 'win',
    totalSteps: 3,
    hintsUsed: 0,
    finalScore: 1000,
    stepEfficiencyRatio: 1,
    timeElapsedSeconds: 30,
    startedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('computeStudentDomainStats', () => {
  it('summarises completion rate, averages, and last-played date per (user, domain)', () => {
    const sessions: SessionRecord[] = [
      session({
        problemId: 'p-kinematics-01',
        outcome: 'win',
        finalScore: 1000,
        stepEfficiencyRatio: 1,
        hintsUsed: 0,
        startedAt: new Date('2026-06-01T10:00:00Z'),
      }),
      session({
        problemId: 'p-kinematics-02',
        outcome: 'stuck',
        finalScore: 400,
        stepEfficiencyRatio: 0.5,
        hintsUsed: 2,
        startedAt: new Date('2026-06-03T10:00:00Z'),
      }),
    ];

    const [stats] = computeStudentDomainStats(sessions);
    expect(stats).toEqual({
      userId: 'user-1',
      domain: 'physics',
      problemsAttempted: 2,
      problemsCompleted: 1,
      totalSessions: 2,
      avgScore: 700,
      avgEfficiency: 0.75,
      avgHintsPerProb: 1,
      completionRate: 0.5,
      lastPlayedAt: new Date('2026-06-03T10:00:00Z'),
    });
  });

  it('keeps users and domains in separate buckets', () => {
    const sessions: SessionRecord[] = [
      session({ userId: 'user-1', domain: 'physics' }),
      session({ userId: 'user-1', domain: 'chemistry' }),
      session({ userId: 'user-2', domain: 'physics' }),
    ];

    const stats = computeStudentDomainStats(sessions);
    expect(stats).toHaveLength(3);
    expect(stats.map(s => `${s.userId}::${s.domain}`).sort()).toEqual([
      'user-1::chemistry',
      'user-1::physics',
      'user-2::physics',
    ]);
  });

  it('returns an empty array for no sessions', () => {
    expect(computeStudentDomainStats([])).toEqual([]);
  });

  it('treats a problem completed in any session as "completed" even if other attempts were stuck', () => {
    const sessions: SessionRecord[] = [
      session({ problemId: 'p-1', outcome: 'stuck', finalScore: 200, stepEfficiencyRatio: 0.4 }),
      session({ problemId: 'p-1', outcome: 'win', finalScore: 900, stepEfficiencyRatio: 0.9 }),
    ];

    const [stats] = computeStudentDomainStats(sessions);
    expect(stats?.problemsAttempted).toBe(1);
    expect(stats?.problemsCompleted).toBe(1);
    expect(stats?.completionRate).toBe(1);
    expect(stats?.totalSessions).toBe(2);
  });
});

describe('computeProblemStats', () => {
  it('summarises attempts, completions, and the median efficiency per problem', () => {
    const sessions: SessionRecord[] = [
      session({ problemId: 'p-1', outcome: 'win', totalSteps: 3, timeElapsedSeconds: 20, hintsUsed: 0, stepEfficiencyRatio: 1, finalScore: 1000 }),
      session({ problemId: 'p-1', outcome: 'win', totalSteps: 4, timeElapsedSeconds: 40, hintsUsed: 1, stepEfficiencyRatio: 0.75, finalScore: 900 }),
      session({ problemId: 'p-1', outcome: 'stuck', totalSteps: 5, timeElapsedSeconds: 60, hintsUsed: 2, stepEfficiencyRatio: 0.5, finalScore: 200 }),
    ];

    const [stats] = computeProblemStats(sessions);
    expect(stats).toEqual({
      problemId: 'p-1',
      totalAttempts: 3,
      totalCompletions: 2,
      completionRate: 2 / 3,
      avgScore: 700,
      avgSteps: 4,
      avgTimeSeconds: 40,
      avgHints: 1,
      p50Efficiency: 0.75,
    });
  });

  it('groups sessions by problemId independently', () => {
    const sessions: SessionRecord[] = [
      session({ problemId: 'p-1' }),
      session({ problemId: 'p-2' }),
    ];

    const stats = computeProblemStats(sessions);
    expect(stats.map(s => s.problemId).sort()).toEqual(['p-1', 'p-2']);
  });

  it('returns null aggregates when no session has a value for a field', () => {
    const sessions: SessionRecord[] = [
      session({ problemId: 'p-1', finalScore: null, totalSteps: null, timeElapsedSeconds: null, stepEfficiencyRatio: null }),
    ];

    const [stats] = computeProblemStats(sessions);
    expect(stats).toMatchObject({
      avgScore: null,
      avgSteps: null,
      avgTimeSeconds: null,
      p50Efficiency: null,
    });
  });
});

describe('aggregateNightlyStats', () => {
  it('reads completed sessions and upserts both stats tables', async () => {
    const studentUpsert = vi.fn().mockResolvedValue({});
    const problemUpsert = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      {
        userId: 'user-1',
        problemId: 'p-kinematics-01',
        outcome: 'win',
        totalSteps: 3,
        hintsUsed: 0,
        finalScore: 1000,
        stepEfficiencyRatio: 1,
        timeElapsedSeconds: 30,
        startedAt: new Date('2026-06-01T10:00:00Z'),
        problem: { domain: 'physics' },
      },
    ]);

    const db = {
      session: { findMany },
      studentDomainStats: { upsert: studentUpsert },
      problemStats: { upsert: problemUpsert },
    } as unknown as StatsDatabase;

    await aggregateNightlyStats(db);

    expect(findMany).toHaveBeenCalledWith({
      where: { completedAt: { not: null } },
      select: expect.objectContaining({ userId: true, problem: { select: { domain: true } } }),
    });

    expect(studentUpsert).toHaveBeenCalledTimes(1);
    const [{ where, create }] = studentUpsert.mock.calls[0]!;
    expect(where).toEqual({ userId_domain: { userId: 'user-1', domain: 'physics' } });
    expect(create).toMatchObject({ userId: 'user-1', domain: 'physics', problemsAttempted: 1, problemsCompleted: 1 });

    expect(problemUpsert).toHaveBeenCalledTimes(1);
    const [{ where: problemWhere, create: problemCreate }] = problemUpsert.mock.calls[0]!;
    expect(problemWhere).toEqual({ problemId: 'p-kinematics-01' });
    expect(problemCreate).toMatchObject({ problemId: 'p-kinematics-01', totalAttempts: 1, totalCompletions: 1 });
  });

  it('does nothing when there are no completed sessions', async () => {
    const studentUpsert = vi.fn();
    const problemUpsert = vi.fn();
    const db = {
      session: { findMany: vi.fn().mockResolvedValue([]) },
      studentDomainStats: { upsert: studentUpsert },
      problemStats: { upsert: problemUpsert },
    } as unknown as StatsDatabase;

    await aggregateNightlyStats(db);

    expect(studentUpsert).not.toHaveBeenCalled();
    expect(problemUpsert).not.toHaveBeenCalled();
  });
});
