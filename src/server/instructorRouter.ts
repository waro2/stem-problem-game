/**
 * /api/instructor/cohorts/:cohortId — Instructor Dashboard
 * Source: GDD §6.4 (Cohort leaderboard), §6.2 (Score formula)
 *
 * GET  returns the cohort roster (per-student avg score + per-domain
 *      completion rate) and the cohort's score config (merged with defaults).
 * PUT  updates the cohort's score config overrides (adjustable penalties).
 */

import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { Domain, GameOutcome } from '../game/types';
import type { InstructorDashboardData, StudentSessionRow } from '../api/instructor';
import { computeCohortStudentRows, mergeScoreConfig, parseScoreConfig } from './instructorStats';

/**
 * Extra `session.findMany` shape needed by the student-detail sessions route.
 * Kept as its own interface (intersected into InstructorDatabase below) —
 * PrismaClient's generic `findMany` is only assignable to an intersection of
 * single-signature overloads, not to a single property declared with
 * multiple call signatures.
 */
export interface InstructorStudentSessionsDatabase {
  session: {
    findMany: (args: {
      where: { userId: string };
      select: {
        id: true;
        outcome: true;
        totalSteps: true;
        optimalSteps: true;
        hintsUsed: true;
        finalScore: true;
        stepEfficiencyRatio: true;
        timeElapsedSeconds: true;
        startedAt: true;
        completedAt: true;
        problem: { select: { domain: true } };
      };
      orderBy: { startedAt: 'asc' };
    }) => Promise<
      {
        id: string;
        outcome: GameOutcome | null;
        totalSteps: number | null;
        optimalSteps: number | null;
        hintsUsed: number;
        finalScore: number | null;
        stepEfficiencyRatio: number | null;
        timeElapsedSeconds: number | null;
        startedAt: Date;
        completedAt: Date | null;
        problem: { domain: Domain };
      }[]
    >;
  };
}

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export type InstructorDatabase = {
  cohort: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; name: true; scoreConfig: true; leaderboardEnabled: true; members: { select: { id: true; name: true; email: true } } };
    }) => Promise<{
      id: string;
      name: string;
      scoreConfig: Prisma.JsonValue | null;
      leaderboardEnabled: boolean;
      members: { id: string; name: string | null; email: string }[];
    } | null>;
    update: (args: {
      where: { id: string };
      data: { scoreConfig?: Prisma.InputJsonValue; leaderboardEnabled?: boolean };
    }) => Promise<{ id: string; scoreConfig: Prisma.JsonValue | null; leaderboardEnabled: boolean }>;
  };
  session: {
    findMany: (args: {
      where: { userId: { in: string[] } };
      select: { userId: true; finalScore: true; outcome: true; problem: { select: { domain: true } } };
    }) => Promise<
      { userId: string; finalScore: number | null; outcome: GameOutcome | null; problem: { domain: Domain } }[]
    >;
  };
} & InstructorStudentSessionsDatabase;

export function createInstructorRouter(db: InstructorDatabase): Router {
  const router = Router();

  router.get('/api/instructor/cohorts/:cohortId/dashboard', async (req: Request, res: Response) => {
    const cohortId = req.params['cohortId'] ?? '';

    try {
      const cohort = await db.cohort.findUnique({
        where: { id: cohortId },
        select: { id: true, name: true, scoreConfig: true, leaderboardEnabled: true, members: { select: { id: true, name: true, email: true } } },
      });
      if (!cohort) {
        res.status(404).json({ error: 'Cohort not found' });
        return;
      }

      const memberIds = cohort.members.map(m => m.id);
      const sessions = memberIds.length
        ? await db.session.findMany({
            where: { userId: { in: memberIds } },
            select: { userId: true, finalScore: true, outcome: true, problem: { select: { domain: true } } },
          })
        : [];

      const data: InstructorDashboardData = {
        cohortId: cohort.id,
        cohortName: cohort.name,
        students: computeCohortStudentRows(
          cohort.members,
          sessions.map(s => ({ userId: s.userId, domain: s.problem.domain, outcome: s.outcome, finalScore: s.finalScore }))
        ),
        scoreConfig: mergeScoreConfig(cohort.scoreConfig),
        leaderboardEnabled: cohort.leaderboardEnabled,
      };

      res.status(200).json(data);
    } catch (err) {
      console.error('[instructor] failed to load cohort dashboard', err);
      res.status(500).json({ error: 'Failed to load cohort dashboard' });
    }
  });

  router.get('/api/instructor/cohorts/:cohortId/students/:studentId/sessions', async (req: Request, res: Response) => {
    const cohortId = req.params['cohortId'] ?? '';
    const studentId = req.params['studentId'] ?? '';

    try {
      const cohort = await db.cohort.findUnique({
        where: { id: cohortId },
        select: { id: true, name: true, scoreConfig: true, leaderboardEnabled: true, members: { select: { id: true, name: true, email: true } } },
      });
      if (!cohort || !cohort.members.some(m => m.id === studentId)) {
        res.status(404).json({ error: 'Student not found in this cohort' });
        return;
      }

      const sessions = await db.session.findMany({
        where: { userId: studentId },
        select: {
          id: true,
          outcome: true,
          totalSteps: true,
          optimalSteps: true,
          hintsUsed: true,
          finalScore: true,
          stepEfficiencyRatio: true,
          timeElapsedSeconds: true,
          startedAt: true,
          completedAt: true,
          problem: { select: { domain: true } },
        },
        orderBy: { startedAt: 'asc' },
      });

      const rows: StudentSessionRow[] = sessions.map(s => ({
        id: s.id,
        domain: s.problem.domain,
        outcome: s.outcome,
        totalSteps: s.totalSteps,
        optimalSteps: s.optimalSteps,
        hintsUsed: s.hintsUsed,
        finalScore: s.finalScore,
        stepEfficiencyRatio: s.stepEfficiencyRatio,
        timeElapsedSeconds: s.timeElapsedSeconds,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      }));

      res.status(200).json(rows);
    } catch (err) {
      console.error('[instructor] failed to load student sessions', err);
      res.status(500).json({ error: 'Failed to load student sessions' });
    }
  });

  router.put('/api/instructor/cohorts/:cohortId/score-config', async (req: Request, res: Response) => {
    const cohortId = req.params['cohortId'] ?? '';

    const config = parseScoreConfig(req.body);
    if (!config) {
      res.status(400).json({ error: 'Invalid score config: expected non-negative numeric maxScore, stepPenalty, hintPenalty, timeBonusBase, timeBonusRate' });
      return;
    }

    try {
      const updated = await db.cohort.update({
        where: { id: cohortId },
        data: { scoreConfig: config as unknown as Prisma.InputJsonValue },
      });
      res.status(200).json(mergeScoreConfig(updated.scoreConfig));
    } catch (err) {
      console.error('[instructor] failed to update score config', err);
      res.status(500).json({ error: 'Failed to update score config' });
    }
  });

  router.put('/api/instructor/cohorts/:cohortId/leaderboard', async (req: Request, res: Response) => {
    const cohortId = req.params['cohortId'] ?? '';

    const enabled = (req.body as { enabled?: unknown } | undefined)?.enabled;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Invalid request: expected boolean "enabled"' });
      return;
    }

    try {
      const updated = await db.cohort.update({
        where: { id: cohortId },
        data: { leaderboardEnabled: enabled },
      });
      res.status(200).json({ leaderboardEnabled: updated.leaderboardEnabled });
    } catch (err) {
      console.error('[instructor] failed to update leaderboard setting', err);
      res.status(500).json({ error: 'Failed to update leaderboard setting' });
    }
  });

  return router;
}
