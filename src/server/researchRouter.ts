/**
 * GET /api/research/dashboard — Research Dashboard data
 * Source: GDD §8.3 (Aggregates), §6.4 (Cohort leaderboard)
 *
 * Read-only: serves the three views shown on
 * src/pages/ResearchDashboard.tsx from problem_stats, sessions, and users.
 */

import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { Domain, Difficulty, GameOutcome } from '../game/types';
import type { ResearchDashboardData } from '../api/research';
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
  type UserGroupInfo,
  type SessionTrendRow,
  type ActivationTimingRow,
} from './researchStats';

/**
 * Extra `session.findMany` shape needed by the CSV export route. Kept as its
 * own interface (intersected into ResearchDatabase below) — PrismaClient's
 * generic `findMany` is only assignable to an intersection of single-signature
 * overloads, not to a single property declared with multiple call signatures.
 */
export interface ResearchSessionsExportDatabase {
  session: {
    findMany: (args: {
      where: { completedAt: { not: null } };
      select: {
        problemId: true;
        outcome: true;
        stepEfficiencyRatio: true;
        hintsUsed: true;
        finalScore: true;
        problem: { select: { domain: true; difficulty: true } };
      };
    }) => Promise<
      {
        problemId: string;
        outcome: GameOutcome | null;
        stepEfficiencyRatio: number | null;
        hintsUsed: number;
        finalScore: number | null;
        problem: { domain: Domain; difficulty: Difficulty };
      }[]
    >;
  };
}

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export type ResearchDatabase = {
  problemStats: {
    findMany: (args: {
      select: { problemId: true; totalAttempts: true; totalCompletions: true; problem: { select: { domain: true } } };
    }) => Promise<{ problemId: string; totalAttempts: number; totalCompletions: number; problem: { domain: Domain } }[]>;
  };
  session: {
    findMany: (args: {
      where: { completedAt: { not: null } };
      select: { userId: true; finalScore: true; stepEfficiencyRatio: true; outcome: true; startedAt: true; hintsUsed: true };
    }) => Promise<
      {
        userId: string;
        finalScore: number | null;
        stepEfficiencyRatio: number | null;
        outcome: GameOutcome | null;
        startedAt: Date;
        hintsUsed: number;
      }[]
    >;
  };
  user: {
    findMany: (args: {
      where: { deletedAt: null };
      select: { id: true; name: true; email: true; cohort: { select: { id: true; name: true } } };
    }) => Promise<{ id: string; name: string | null; email: string; cohort: { id: string; name: string } | null }[]>;
  };
  event: {
    findMany: (args: {
      where: { eventType: 'formula_activated' };
      select: { userId: true; receivedAt: true; payload: true };
    }) => Promise<{ userId: string; receivedAt: Date; payload: Prisma.JsonValue }[]>;
  };
} & ResearchSessionsExportDatabase;

/** Extract the `timeSinceLast` field from a formula_activated event payload (GDD §8.1). */
function extractTimeSinceLast(payload: Prisma.JsonValue): number | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)['timeSinceLast'];
  return typeof value === 'number' ? value : null;
}

export function createResearchRouter(db: ResearchDatabase): Router {
  const router = Router();

  router.get('/api/research/dashboard', async (_req: Request, res: Response) => {
    try {
      const [problemStats, sessions, users, activations] = await Promise.all([
        db.problemStats.findMany({
          select: { problemId: true, totalAttempts: true, totalCompletions: true, problem: { select: { domain: true } } },
        }),
        db.session.findMany({
          where: { completedAt: { not: null } },
          select: { userId: true, finalScore: true, stepEfficiencyRatio: true, outcome: true, startedAt: true, hintsUsed: true },
        }),
        db.user.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true, email: true, cohort: { select: { id: true, name: true } } },
        }),
        db.event.findMany({
          where: { eventType: 'formula_activated' },
          select: { userId: true, receivedAt: true, payload: true },
        }),
      ]);

      const groupUsers: UserGroupInfo[] = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        cohortId: u.cohort?.id ?? null,
        cohortName: u.cohort?.name ?? null,
      }));

      const sessionTrendRows: SessionTrendRow[] = sessions.map(s => ({
        userId: s.userId,
        startedAt: s.startedAt,
        outcome: s.outcome,
        finalScore: s.finalScore,
        stepEfficiencyRatio: s.stepEfficiencyRatio,
        hintsUsed: s.hintsUsed,
      }));

      const activationRows: ActivationTimingRow[] = activations
        .map(e => ({ userId: e.userId, receivedAt: e.receivedAt, timeSinceLast: extractTimeSinceLast(e.payload) }))
        .filter((r): r is ActivationTimingRow => r.timeSinceLast !== null);

      const data: ResearchDashboardData = {
        domainCompletion: computeDomainCompletion(
          problemStats.map(p => ({
            domain: p.problem.domain,
            totalAttempts: p.totalAttempts,
            totalCompletions: p.totalCompletions,
          }))
        ),
        scoreHistory: computeScoreHistory(
          sessions
            .filter((s): s is typeof s & { finalScore: number } => s.finalScore !== null)
            .map(s => ({ startedAt: s.startedAt, finalScore: s.finalScore }))
        ),
        cohortLeaderboard: computeCohortLeaderboard(
          sessions
            .filter(s => s.outcome === 'win')
            .map(s => ({ userId: s.userId, finalScore: s.finalScore, stepEfficiencyRatio: s.stepEfficiencyRatio })),
          users.map(u => ({ id: u.id, name: u.name, email: u.email, cohortName: u.cohort?.name ?? null }))
        ),
        stepEfficiencyTrend: computeStepEfficiencyTrend(sessionTrendRows, groupUsers),
        hintDecayTrend: computeHintDecayTrend(sessionTrendRows, groupUsers),
        domainCompletionTrend: computeDomainCompletionTrend(sessionTrendRows, groupUsers),
        cascadeRecognitionTrend: computeCascadeRecognitionTrend(activationRows, groupUsers),
        scoreTrajectoryTrend: computeScoreTrajectoryTrend(sessionTrendRows, groupUsers),
        stuckRateTrend: computeStuckRateTrend(sessionTrendRows, groupUsers),
      };

      res.status(200).json(data);
    } catch (err) {
      console.error('[research] failed to load dashboard data', err);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  });

  // Anonymised CSV export of completed sessions — no user id, name, or email (GDD §8.4).
  router.get('/api/research/export/sessions.csv', async (_req: Request, res: Response) => {
    try {
      const sessions = await db.session.findMany({
        where: { completedAt: { not: null } },
        select: {
          problemId: true,
          outcome: true,
          stepEfficiencyRatio: true,
          hintsUsed: true,
          finalScore: true,
          problem: { select: { domain: true, difficulty: true } },
        },
      });

      const csv = buildSessionsCsv(sessions.map(s => ({
        problemId: s.problemId,
        domain: s.problem.domain,
        difficulty: s.problem.difficulty,
        outcome: s.outcome,
        stepEfficiencyRatio: s.stepEfficiencyRatio,
        hintsUsed: s.hintsUsed,
        finalScore: s.finalScore,
      })));

      res
        .status(200)
        .set('Content-Type', 'text/csv; charset=utf-8')
        .set('Content-Disposition', 'attachment; filename="sessions_export.csv"')
        .send(csv);
    } catch (err) {
      console.error('[research] failed to export sessions CSV', err);
      res.status(500).json({ error: 'Failed to export sessions CSV' });
    }
  });

  return router;
}
