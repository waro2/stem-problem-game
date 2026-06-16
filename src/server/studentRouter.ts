/**
 * GET /api/students/:userId/domain-stats — Adaptive selection input
 * Source: GDD §8.3 (Aggregates)
 *
 * Read-only: serves student_domain_stats rows for one user, consumed by
 * src/game/store.ts to recommend the next problem (src/game/recommendation.ts).
 */

import { Router, type Request, type Response } from 'express';
import type { Domain } from '../game/types';
import type { StudentDomainStatsRow } from '../api/recommendation';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface StudentStatsDatabase {
  studentDomainStats: {
    findMany: (args: {
      where: { userId: string };
      select: {
        domain: true;
        problemsAttempted: true;
        problemsCompleted: true;
        avgScore: true;
        avgEfficiency: true;
        completionRate: true;
      };
    }) => Promise<
      {
        domain: Domain;
        problemsAttempted: number;
        problemsCompleted: number;
        avgScore: number | null;
        avgEfficiency: number | null;
        completionRate: number | null;
      }[]
    >;
  };
}

export function createStudentRouter(db: StudentStatsDatabase): Router {
  const router = Router();

  router.get('/api/students/:userId/domain-stats', async (req: Request, res: Response) => {
    const userId = req.params['userId'] ?? '';

    try {
      const stats = await db.studentDomainStats.findMany({
        where: { userId },
        select: {
          domain: true,
          problemsAttempted: true,
          problemsCompleted: true,
          avgScore: true,
          avgEfficiency: true,
          completionRate: true,
        },
      });

      const data: StudentDomainStatsRow[] = stats;
      res.status(200).json(data);
    } catch (err) {
      console.error('[students] failed to load domain stats', err);
      res.status(500).json({ error: 'Failed to load domain stats' });
    }
  });

  return router;
}
