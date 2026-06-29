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
import type { InstructorDashboardData } from '../api/instructor';
import { computeCohortStudentRows, mergeScoreConfig, parseScoreConfig } from './instructorStats';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface InstructorDatabase {
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
}

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
