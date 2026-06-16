/**
 * Nightly aggregation job  (GDD §8.3 — Aggregates)
 *
 * Reads completed sessions (one row per problem attempt) and refreshes the
 * two aggregate tables:
 *  - student_domain_stats: per (user, domain) progress summary
 *  - problem_stats:        per-problem difficulty/engagement summary
 *
 * Pure functions (computeStudentDomainStats, computeProblemStats) take a
 * plain array of session records and return the rows to upsert — they have
 * no dependency on Prisma and are unit-tested directly.
 * aggregateNightlyStats() wires those pure functions to the database.
 */

import type { Prisma } from '@prisma/client';
import type { Domain, GameOutcome } from '../../game/types';

// ─────────────────────────────────────────────
// Pure aggregation
// ─────────────────────────────────────────────

export interface SessionRecord {
  userId: string;
  problemId: string;
  domain: Domain;
  outcome: GameOutcome | null;
  totalSteps: number | null;
  hintsUsed: number;
  finalScore: number | null;
  stepEfficiencyRatio: number | null;
  timeElapsedSeconds: number | null;
  startedAt: Date;
}

export interface StudentDomainStatsRow {
  userId: string;
  domain: Domain;
  problemsAttempted: number;
  problemsCompleted: number;
  totalSessions: number;
  avgScore: number | null;
  avgEfficiency: number | null;
  avgHintsPerProb: number | null;
  completionRate: number | null;
  lastPlayedAt: Date | null;
}

export interface ProblemStatsRow {
  problemId: string;
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number | null;
  avgScore: number | null;
  avgSteps: number | null;
  avgTimeSeconds: number | null;
  avgHints: number | null;
  p50Efficiency: number | null;
}

function average(values: ReadonlyArray<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function median(values: ReadonlyArray<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1]! + nums[mid]!) / 2 : nums[mid]!;
}

/** Group sessions by (userId, domain) and summarise progress per domain. */
export function computeStudentDomainStats(sessions: readonly SessionRecord[]): StudentDomainStatsRow[] {
  const groups = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const key = `${session.userId}::${session.domain}`;
    const group = groups.get(key);
    if (group) group.push(session);
    else groups.set(key, [session]);
  }

  return [...groups.values()].map(rows => {
    const { userId, domain } = rows[0]!;
    const attemptedProblems = new Set(rows.map(r => r.problemId));
    const completedProblems = new Set(rows.filter(r => r.outcome === 'win').map(r => r.problemId));

    return {
      userId,
      domain,
      problemsAttempted: attemptedProblems.size,
      problemsCompleted: completedProblems.size,
      totalSessions: rows.length,
      avgScore: average(rows.map(r => r.finalScore)),
      avgEfficiency: average(rows.map(r => r.stepEfficiencyRatio)),
      avgHintsPerProb: average(rows.map(r => r.hintsUsed)),
      completionRate: attemptedProblems.size > 0 ? completedProblems.size / attemptedProblems.size : null,
      lastPlayedAt: rows.reduce<Date | null>(
        (latest, r) => (!latest || r.startedAt > latest ? r.startedAt : latest),
        null
      ),
    };
  });
}

/** Group sessions by problemId and summarise difficulty/engagement per problem. */
export function computeProblemStats(sessions: readonly SessionRecord[]): ProblemStatsRow[] {
  const groups = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const group = groups.get(session.problemId);
    if (group) group.push(session);
    else groups.set(session.problemId, [session]);
  }

  return [...groups.entries()].map(([problemId, rows]) => {
    const completions = rows.filter(r => r.outcome === 'win').length;

    return {
      problemId,
      totalAttempts: rows.length,
      totalCompletions: completions,
      completionRate: rows.length > 0 ? completions / rows.length : null,
      avgScore: average(rows.map(r => r.finalScore)),
      avgSteps: average(rows.map(r => r.totalSteps)),
      avgTimeSeconds: average(rows.map(r => r.timeElapsedSeconds)),
      avgHints: average(rows.map(r => r.hintsUsed)),
      p50Efficiency: median(rows.map(r => r.stepEfficiencyRatio)),
    };
  });
}

// ─────────────────────────────────────────────
// Database wiring
// ─────────────────────────────────────────────

interface SessionQueryRow {
  userId: string;
  problemId: string;
  outcome: GameOutcome | null;
  totalSteps: number | null;
  hintsUsed: number;
  finalScore: number | null;
  stepEfficiencyRatio: number | null;
  timeElapsedSeconds: number | null;
  startedAt: Date;
  problem: { domain: Domain };
}

/** Minimal slice of PrismaClient this job needs — keeps it easy to mock in tests. */
export interface StatsDatabase {
  session: {
    findMany: (args: {
      where: { completedAt: { not: null } };
      select: {
        userId: true;
        problemId: true;
        outcome: true;
        totalSteps: true;
        hintsUsed: true;
        finalScore: true;
        stepEfficiencyRatio: true;
        timeElapsedSeconds: true;
        startedAt: true;
        problem: { select: { domain: true } };
      };
    }) => Promise<SessionQueryRow[]>;
  };
  studentDomainStats: {
    upsert: (args: {
      where: { userId_domain: { userId: string; domain: Domain } };
      create: Prisma.StudentDomainStatsCreateInput;
      update: Prisma.StudentDomainStatsUpdateInput;
    }) => Promise<unknown>;
  };
  problemStats: {
    upsert: (args: {
      where: { problemId: string };
      create: Prisma.ProblemStatsUncheckedCreateInput;
      update: Prisma.ProblemStatsUncheckedUpdateInput;
    }) => Promise<unknown>;
  };
}

/** Refresh student_domain_stats and problem_stats from completed sessions. */
export async function aggregateNightlyStats(db: StatsDatabase): Promise<void> {
  const rows = await db.session.findMany({
    where: { completedAt: { not: null } },
    select: {
      userId: true,
      problemId: true,
      outcome: true,
      totalSteps: true,
      hintsUsed: true,
      finalScore: true,
      stepEfficiencyRatio: true,
      timeElapsedSeconds: true,
      startedAt: true,
      problem: { select: { domain: true } },
    },
  });

  const sessions: SessionRecord[] = rows.map(row => ({
    userId: row.userId,
    problemId: row.problemId,
    domain: row.problem.domain,
    outcome: row.outcome,
    totalSteps: row.totalSteps,
    hintsUsed: row.hintsUsed,
    finalScore: row.finalScore,
    stepEfficiencyRatio: row.stepEfficiencyRatio,
    timeElapsedSeconds: row.timeElapsedSeconds,
    startedAt: row.startedAt,
  }));

  for (const stats of computeStudentDomainStats(sessions)) {
    await db.studentDomainStats.upsert({
      where: { userId_domain: { userId: stats.userId, domain: stats.domain } },
      create: stats,
      update: stats,
    });
  }

  for (const stats of computeProblemStats(sessions)) {
    await db.problemStats.upsert({
      where: { problemId: stats.problemId },
      create: stats,
      update: stats,
    });
  }
}
