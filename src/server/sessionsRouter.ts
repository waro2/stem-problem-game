/**
 * POST /api/sessions — persist a completed game session
 * Source: GDD §8.1 (Session data), §8.2 (Server Architecture)
 *
 * Requires a valid Supabase Bearer token. The userId is taken from the
 * verified JWT (`req.authUser.id`), not from the request body, so a user
 * can only create sessions for themselves.
 */

import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { Platform, GameOutcome } from '../game/types';
import { requireAuth, type AuthenticatedRequest } from './authMiddleware';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface SessionDatabase {
  session: {
    create: (args: {
      data: Prisma.SessionCreateInput;
    }) => Promise<{ id: string }>;
  };
}

interface SessionBody {
  problemId?: unknown;
  platform?: unknown;
  outcome?: unknown;
  totalSteps?: unknown;
  optimalSteps?: unknown;
  timeElapsedSeconds?: unknown;
  hintsUsed?: unknown;
  finalScore?: unknown;
  stepEfficiencyRatio?: unknown;
  activationPath?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
}

const VALID_PLATFORMS: readonly Platform[] = ['web', 'ios', 'android'];
const VALID_OUTCOMES: readonly GameOutcome[] = ['win', 'stuck'];

function parseBody(body: unknown): {
  problemId: string;
  platform: Platform;
  outcome: GameOutcome;
  totalSteps: number;
  optimalSteps: number;
  timeElapsedSeconds: number;
  hintsUsed: number;
  finalScore: number;
  stepEfficiencyRatio: number;
  activationPath: string[];
  startedAt: Date;
  completedAt: Date;
} | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as SessionBody;

  if (typeof b.problemId !== 'string' || !b.problemId) return null;
  if (!VALID_PLATFORMS.includes(b.platform as Platform)) return null;
  if (!VALID_OUTCOMES.includes(b.outcome as GameOutcome)) return null;
  if (typeof b.totalSteps !== 'number' || b.totalSteps < 0) return null;
  if (typeof b.optimalSteps !== 'number' || b.optimalSteps < 0) return null;
  if (typeof b.timeElapsedSeconds !== 'number' || b.timeElapsedSeconds < 0) return null;
  if (typeof b.hintsUsed !== 'number' || b.hintsUsed < 0) return null;
  if (typeof b.finalScore !== 'number') return null;
  if (typeof b.stepEfficiencyRatio !== 'number') return null;
  if (!Array.isArray(b.activationPath) || !b.activationPath.every(x => typeof x === 'string')) return null;

  const startedAt = typeof b.startedAt === 'string' ? new Date(b.startedAt) : null;
  const completedAt = typeof b.completedAt === 'string' ? new Date(b.completedAt) : null;
  if (!startedAt || isNaN(startedAt.getTime())) return null;
  if (!completedAt || isNaN(completedAt.getTime())) return null;

  return {
    problemId: b.problemId,
    platform: b.platform as Platform,
    outcome: b.outcome as GameOutcome,
    totalSteps: b.totalSteps,
    optimalSteps: b.optimalSteps,
    timeElapsedSeconds: b.timeElapsedSeconds,
    hintsUsed: b.hintsUsed,
    finalScore: b.finalScore,
    stepEfficiencyRatio: b.stepEfficiencyRatio,
    activationPath: b.activationPath as string[],
    startedAt,
    completedAt,
  };
}

export function createSessionsRouter(db: SessionDatabase, jwtSecret: string): Router {
  const router = Router();

  router.post('/api/sessions', requireAuth(jwtSecret), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUser!.id;

    const parsed = parseBody(req.body);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid session payload' });
      return;
    }

    try {
      const session = await db.session.create({
        data: {
          user: { connect: { id: userId } },
          problem: { connect: { id: parsed.problemId } },
          platform: parsed.platform,
          outcome: parsed.outcome,
          totalSteps: parsed.totalSteps,
          optimalSteps: parsed.optimalSteps,
          timeElapsedSeconds: parsed.timeElapsedSeconds,
          hintsUsed: parsed.hintsUsed,
          finalScore: parsed.finalScore,
          stepEfficiencyRatio: parsed.stepEfficiencyRatio,
          activationPath: parsed.activationPath,
          startedAt: parsed.startedAt,
          completedAt: parsed.completedAt,
        },
      });
      res.status(201).json({ id: session.id });
    } catch (err) {
      console.error('[sessions] failed to create session', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  return router;
}
