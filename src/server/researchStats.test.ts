/**
 * Tests for the Research Dashboard aggregation functions.
 * Run: npx vitest src/server/researchStats.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  computeDomainCompletion,
  computeScoreHistory,
  computeCohortLeaderboard,
  computeStepEfficiencyTrend,
  computeHintDecayTrend,
  computeDomainCompletionTrend,
  computeCascadeRecognitionTrend,
  computeScoreTrajectoryTrend,
  computeStuckRateTrend,
  buildSessionsCsv,
  type ProblemDomainStats,
  type SessionScorePoint,
  type LeaderboardSession,
  type CohortUser,
  type UserGroupInfo,
  type SessionTrendRow,
  type ActivationTimingRow,
  type SessionExportRow,
} from './researchStats';

describe('computeDomainCompletion', () => {
  it('rolls up attempts and completions per domain, attempts-weighted', () => {
    const rows: ProblemDomainStats[] = [
      { domain: 'physics', totalAttempts: 10, totalCompletions: 5 },
      { domain: 'physics', totalAttempts: 10, totalCompletions: 10 },
      { domain: 'chemistry', totalAttempts: 4, totalCompletions: 1 },
    ];

    const result = computeDomainCompletion(rows);
    expect(result).toHaveLength(2);

    const physics = result.find(r => r.domain === 'physics');
    expect(physics).toEqual({
      domain: 'physics',
      totalAttempts: 20,
      totalCompletions: 15,
      completionRate: 0.75,
    });

    const chemistry = result.find(r => r.domain === 'chemistry');
    expect(chemistry).toEqual({
      domain: 'chemistry',
      totalAttempts: 4,
      totalCompletions: 1,
      completionRate: 0.25,
    });
  });

  it('returns null completion rate when a domain has zero attempts', () => {
    const rows: ProblemDomainStats[] = [
      { domain: 'biology', totalAttempts: 0, totalCompletions: 0 },
    ];

    const [stats] = computeDomainCompletion(rows);
    expect(stats?.completionRate).toBeNull();
  });

  it('returns an empty array for no rows', () => {
    expect(computeDomainCompletion([])).toEqual([]);
  });
});

describe('computeScoreHistory', () => {
  it('averages final scores per day and sorts chronologically', () => {
    const sessions: SessionScorePoint[] = [
      { startedAt: new Date('2026-06-02T10:00:00Z'), finalScore: 800 },
      { startedAt: new Date('2026-06-01T08:00:00Z'), finalScore: 1000 },
      { startedAt: new Date('2026-06-01T20:00:00Z'), finalScore: 600 },
    ];

    const result = computeScoreHistory(sessions);
    expect(result).toEqual([
      { date: '2026-06-01', avgScore: 800, sessionCount: 2 },
      { date: '2026-06-02', avgScore: 800, sessionCount: 1 },
    ]);
  });

  it('returns an empty array for no sessions', () => {
    expect(computeScoreHistory([])).toEqual([]);
  });
});

describe('computeCohortLeaderboard', () => {
  it('sums scores per user and sorts highest first, attaching cohort info', () => {
    const sessions: LeaderboardSession[] = [
      { userId: 'user-1', finalScore: 500, stepEfficiencyRatio: 0.8 },
      { userId: 'user-1', finalScore: 600, stepEfficiencyRatio: 1 },
      { userId: 'user-2', finalScore: 1200, stepEfficiencyRatio: 0.9 },
    ];
    const users: CohortUser[] = [
      { id: 'user-1', name: 'Alice', cohortName: 'Class A' },
      { id: 'user-2', name: 'Bob', cohortName: 'Class B' },
    ];

    const result = computeCohortLeaderboard(sessions, users);
    expect(result).toEqual([
      { userId: 'user-2', displayName: 'Bob', cohortName: 'Class B', totalScore: 1200, sessionsPlayed: 1, avgEfficiency: 0.9 },
      { userId: 'user-1', displayName: 'Alice', cohortName: 'Class A', totalScore: 1100, sessionsPlayed: 2, avgEfficiency: 0.9 },
    ]);
  });

  it('falls back to the userId when the user has no display name', () => {
    const sessions: LeaderboardSession[] = [
      { userId: 'user-3', finalScore: 700, stepEfficiencyRatio: null },
    ];

    const [stats] = computeCohortLeaderboard(sessions, []);
    expect(stats).toMatchObject({ userId: 'user-3', displayName: 'user-3', cohortName: null, avgEfficiency: null });
  });

  it('treats a null finalScore as zero when summing totals', () => {
    const sessions: LeaderboardSession[] = [
      { userId: 'user-1', finalScore: null, stepEfficiencyRatio: null },
    ];

    const [stats] = computeCohortLeaderboard(sessions, []);
    expect(stats?.totalScore).toBe(0);
  });

  it('returns an empty array for no sessions', () => {
    expect(computeCohortLeaderboard([], [])).toEqual([]);
  });
});

// ── Per-student / per-cohort trend metrics (GDD §8.3) ──────────────────────

const USERS: UserGroupInfo[] = [
  { id: 'user-1', name: 'Alice', cohortId: 'cohort-A', cohortName: 'Class A' },
  { id: 'user-2', name: 'Bob', cohortId: 'cohort-A', cohortName: 'Class A' },
  { id: 'user-3', name: null, cohortId: 'cohort-B', cohortName: 'Class B' },
  { id: 'user-4', name: 'Dana', cohortId: null, cohortName: null },
];

describe('computeStepEfficiencyTrend', () => {
  it('averages stepEfficiencyRatio per day, per student and per cohort', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: 900, stepEfficiencyRatio: 0.8, hintsUsed: 1 },
      { userId: 'user-2', startedAt: new Date('2026-06-01T09:00:00Z'), outcome: 'win', finalScore: 700, stepEfficiencyRatio: 0.6, hintsUsed: 2 },
      { userId: 'user-1', startedAt: new Date('2026-06-02T08:00:00Z'), outcome: 'win', finalScore: 950, stepEfficiencyRatio: 1, hintsUsed: 0 },
    ];

    const trend = computeStepEfficiencyTrend(sessions, USERS);

    const alice = trend.byStudent.find(s => s.groupId === 'user-1');
    expect(alice?.points).toEqual([
      { date: '2026-06-01', value: 0.8, sampleSize: 1 },
      { date: '2026-06-02', value: 1, sampleSize: 1 },
    ]);

    const cohortA = trend.byCohort.find(s => s.groupId === 'cohort-A');
    expect(cohortA?.groupLabel).toBe('Class A');
    expect(cohortA?.points).toEqual([
      { date: '2026-06-01', value: 0.7, sampleSize: 2 },
      { date: '2026-06-02', value: 1, sampleSize: 1 },
    ]);
  });

  it('excludes sessions with a null stepEfficiencyRatio', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'stuck', finalScore: 200, stepEfficiencyRatio: null, hintsUsed: 3 },
    ];
    expect(computeStepEfficiencyTrend(sessions, USERS).byStudent).toEqual([]);
  });

  it('returns empty trends for no sessions', () => {
    expect(computeStepEfficiencyTrend([], USERS)).toEqual({ byStudent: [], byCohort: [] });
  });
});

describe('computeHintDecayTrend', () => {
  it('averages hintsUsed per day', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: 900, stepEfficiencyRatio: 0.8, hintsUsed: 3 },
      { userId: 'user-1', startedAt: new Date('2026-06-02T08:00:00Z'), outcome: 'win', finalScore: 950, stepEfficiencyRatio: 1, hintsUsed: 0 },
    ];

    const trend = computeHintDecayTrend(sessions, USERS);
    const alice = trend.byStudent.find(s => s.groupId === 'user-1');
    expect(alice?.points.map(p => p.value)).toEqual([3, 0]);
  });
});

describe('computeDomainCompletionTrend', () => {
  it('computes the daily win rate (1 = win, 0 = stuck)', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: 900, stepEfficiencyRatio: 0.8, hintsUsed: 1 },
      { userId: 'user-1', startedAt: new Date('2026-06-01T09:00:00Z'), outcome: 'stuck', finalScore: 200, stepEfficiencyRatio: null, hintsUsed: 3 },
    ];

    const trend = computeDomainCompletionTrend(sessions, USERS);
    const alice = trend.byStudent.find(s => s.groupId === 'user-1');
    expect(alice?.points).toEqual([{ date: '2026-06-01', value: 0.5, sampleSize: 2 }]);
  });
});

describe('computeCascadeRecognitionTrend', () => {
  it('averages timeSinceLast (Δt between activations) per day', () => {
    const activations: ActivationTimingRow[] = [
      { userId: 'user-1', receivedAt: new Date('2026-06-01T08:00:00Z'), timeSinceLast: 4 },
      { userId: 'user-1', receivedAt: new Date('2026-06-01T08:00:10Z'), timeSinceLast: 10 },
    ];

    const trend = computeCascadeRecognitionTrend(activations, USERS);
    const alice = trend.byStudent.find(s => s.groupId === 'user-1');
    expect(alice?.points).toEqual([{ date: '2026-06-01', value: 7, sampleSize: 2 }]);
  });
});

describe('computeScoreTrajectoryTrend', () => {
  it('averages finalScore per day', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: 800, stepEfficiencyRatio: 0.8, hintsUsed: 1 },
      { userId: 'user-1', startedAt: new Date('2026-06-01T09:00:00Z'), outcome: 'win', finalScore: 1000, stepEfficiencyRatio: 1, hintsUsed: 0 },
    ];

    const trend = computeScoreTrajectoryTrend(sessions, USERS);
    const alice = trend.byStudent.find(s => s.groupId === 'user-1');
    expect(alice?.points).toEqual([{ date: '2026-06-01', value: 900, sampleSize: 2 }]);
  });

  it('excludes sessions with a null finalScore', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: null, stepEfficiencyRatio: null, hintsUsed: 0 },
    ];
    expect(computeScoreTrajectoryTrend(sessions, USERS).byStudent).toEqual([]);
  });
});

describe('computeStuckRateTrend', () => {
  it('computes the daily stuck rate (1 = stuck, 0 = win)', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-1', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'stuck', finalScore: 200, stepEfficiencyRatio: null, hintsUsed: 3 },
      { userId: 'user-1', startedAt: new Date('2026-06-01T09:00:00Z'), outcome: 'win', finalScore: 900, stepEfficiencyRatio: 0.8, hintsUsed: 1 },
    ];

    const trend = computeStuckRateTrend(sessions, USERS);
    const alice = trend.byStudent.find(s => s.groupId === 'user-1');
    expect(alice?.points).toEqual([{ date: '2026-06-01', value: 0.5, sampleSize: 2 }]);
  });
});

describe('per-cohort grouping for trend metrics', () => {
  it('omits users without a cohort from byCohort but keeps them in byStudent', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-4', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: 1000, stepEfficiencyRatio: 1, hintsUsed: 0 },
    ];

    const trend = computeScoreTrajectoryTrend(sessions, USERS);
    expect(trend.byStudent).toHaveLength(1);
    expect(trend.byCohort).toEqual([]);
  });

  it('falls back to the user/cohort id as label when names are missing', () => {
    const sessions: SessionTrendRow[] = [
      { userId: 'user-3', startedAt: new Date('2026-06-01T08:00:00Z'), outcome: 'win', finalScore: 500, stepEfficiencyRatio: 0.5, hintsUsed: 0 },
    ];

    const trend = computeScoreTrajectoryTrend(sessions, USERS);
    expect(trend.byStudent[0]?.groupLabel).toBe('user-3');
    expect(trend.byCohort[0]?.groupLabel).toBe('Class B');
  });
});

describe('buildSessionsCsv', () => {
  it('builds a header row plus one anonymised row per session, with no user/PII columns', () => {
    const rows: SessionExportRow[] = [
      { problemId: 'p-kinematics-01', domain: 'physics', difficulty: 'intermediate', outcome: 'win', stepEfficiencyRatio: 1, hintsUsed: 2, finalScore: 940 },
      { problemId: 'p-stoich-01', domain: 'chemistry', difficulty: 'beginner', outcome: 'stuck', stepEfficiencyRatio: null, hintsUsed: 0, finalScore: null },
    ];

    const csv = buildSessionsCsv(rows);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('problem_id,domain,difficulty,outcome,step_efficiency_ratio,hints_used,final_score');
    expect(lines[1]).toBe('p-kinematics-01,physics,intermediate,win,1,2,940');
    expect(lines[2]).toBe('p-stoich-01,chemistry,beginner,stuck,,0,');
    expect(lines).toHaveLength(3);
  });

  it('returns only the header row when there are no sessions', () => {
    expect(buildSessionsCsv([])).toBe('problem_id,domain,difficulty,outcome,step_efficiency_ratio,hints_used,final_score');
  });
});
