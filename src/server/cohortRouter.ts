/**
 * GET /api/cohorts/:cohortId/leaderboard — Student-facing cohort leaderboard
 * Source: GDD §6.4 (Cohort leaderboard)
 *
 * Mirrors the cohort_leaderboard SQL view. Only returns ranked entries when
 * the instructor has enabled the leaderboard for the cohort (see
 * src/server/instructorRouter.ts PUT .../leaderboard); otherwise responds
 * with `{ enabled: false, entries: [] }` so the LeaderboardPanel renders
 * nothing without leaking scores.
 */

import { Router, type Request, type Response } from 'express';
import type { GameOutcome } from '../game/types';
import type { CohortLeaderboardData } from '../api/leaderboard';
import { computeCohortLeaderboardEntries } from './leaderboardStats';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface CohortLeaderboardDatabase {
  cohort: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; leaderboardEnabled: true; members: { select: { id: true; name: true; email: true } } };
    }) => Promise<{
      id: string;
      leaderboardEnabled: boolean;
      members: { id: string; name: string | null; email: string }[];
    } | null>;
  };
  session: {
    findMany: (args: {
      where: { userId: { in: string[] }; outcome: GameOutcome };
      select: { userId: true; finalScore: true; stepEfficiencyRatio: true };
    }) => Promise<{ userId: string; finalScore: number | null; stepEfficiencyRatio: number | null }[]>;
  };
}

export function createCohortRouter(db: CohortLeaderboardDatabase): Router {
  const router = Router();

  router.get('/api/cohorts/:cohortId/leaderboard', async (req: Request, res: Response) => {
    const cohortId = req.params['cohortId'] ?? '';

    try {
      const cohort = await db.cohort.findUnique({
        where: { id: cohortId },
        select: { id: true, leaderboardEnabled: true, members: { select: { id: true, name: true, email: true } } },
      });
      if (!cohort) {
        res.status(404).json({ error: 'Cohort not found' });
        return;
      }

      if (!cohort.leaderboardEnabled) {
        const data: CohortLeaderboardData = { enabled: false, entries: [] };
        res.status(200).json(data);
        return;
      }

      const memberIds = cohort.members.map(m => m.id);
      const sessions = memberIds.length
        ? await db.session.findMany({
            where: { userId: { in: memberIds }, outcome: 'win' },
            select: { userId: true, finalScore: true, stepEfficiencyRatio: true },
          })
        : [];

      const data: CohortLeaderboardData = {
        enabled: true,
        entries: computeCohortLeaderboardEntries(cohort.members, sessions),
      };
      res.status(200).json(data);
    } catch (err) {
      console.error('[cohort] failed to load leaderboard', err);
      res.status(500).json({ error: 'Failed to load leaderboard' });
    }
  });

  return router;
}
