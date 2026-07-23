/**
 * /api/problems — Problem authoring, solvability gate, and library listing
 * Source: GDD §9.3 (Solvability pre-check), §8.2 (Server Architecture), §5 (UI Design)
 *
 * POST validates the request body against the Problem schema, then runs
 * validateSolvability() (src/game/engine.ts) before persisting: an
 * unsolvable problem (conclusions not reachable from the hypotheses) is
 * rejected with 400 and never written to PostgreSQL.
 *
 * GET returns the problem catalog annotated with the requesting user's
 * progress (completed flag + previous score) for src/pages/ProblemLibrary.tsx.
 */

import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { Problem, Domain, Difficulty, GameOutcome } from '../game/types';
import { validateSolvability, computeOptimalSteps } from '../game/engine';
import { parseProblemInput, type ProblemInput } from './validateProblem';
import { computeProblemSummaries } from './libraryStats';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface ProblemWriter {
  problem: {
    upsert: (args: {
      where: { id: string };
      create: Prisma.ProblemCreateInput;
      update: Prisma.ProblemUpdateInput;
    }) => Promise<{ id: string }>;
  };
}

/** Full problem row returned from DB (variables/formulas stored as Json). */
interface ProblemRow {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  titleEn: string;
  titleFr: string;
  variables: unknown;
  formulas: unknown;
  hypotheses: string[];
  conclusions: string[];
  optimalSteps: number;
  solvable: boolean;
  isTrap: boolean;
}

/** Minimal slice of PrismaClient needed to list the problem library. */
export interface ProblemLibraryDatabase {
  problem: {
    findMany: (args: {
      select: { id: true; domain: true; difficulty: true; titleEn: true; titleFr: true; isTrap: true };
    }) => Promise<{ id: string; domain: Domain; difficulty: Difficulty; titleEn: string; titleFr: string; isTrap: boolean }[]>;
    findUnique: (args: { where: { id: string } }) => Promise<ProblemRow | null>;
  };
  session: {
    findMany: (args: {
      where: { userId: string; outcome: { not: null } };
      select: { problemId: true; outcome: true; finalScore: true; startedAt: true };
    }) => Promise<{ problemId: string; outcome: GameOutcome | null; finalScore: number | null; startedAt: Date }[]>;
  };
}

export function createProblemsRouter(db: ProblemWriter & ProblemLibraryDatabase): Router {
  const router = Router();

  router.get('/api/problems', async (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

    try {
      const [problems, sessions] = await Promise.all([
        db.problem.findMany({ select: { id: true, domain: true, difficulty: true, titleEn: true, titleFr: true, isTrap: true } }),
        userId
          ? db.session.findMany({
              where: { userId, outcome: { not: null } },
              select: { problemId: true, outcome: true, finalScore: true, startedAt: true },
            })
          : Promise.resolve([]),
      ]);

      res.status(200).json(computeProblemSummaries(problems, sessions));
    } catch (err) {
      console.error('[problems] failed to load problem library', err);
      res.status(500).json({ error: 'Failed to load problem library' });
    }
  });

  router.get('/api/problems/:id', async (req: Request, res: Response) => {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing problem id' });
      return;
    }
    try {
      const row = await db.problem.findUnique({ where: { id } });
      if (!row) {
        res.status(404).json({ error: 'Problem not found' });
        return;
      }
      const { titleFr, titleEn, hypotheses, conclusions, ...rest } = row as any;
      res.json({
        ...rest,
        title: titleEn,
        title_fr: titleFr,
        given: hypotheses,
        target: conclusions,
      });
    } catch (err) {
      console.error('[problems] failed to load problem by id', err);
      res.status(500).json({ error: 'Failed to load problem' });
    }
  });

  router.post('/api/problems', async (req: Request, res: Response) => {
    const input = parseProblemInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'Invalid request body: expected a Problem definition' });
      return;
    }

    // Trap problems are intentionally unsolvable — skip the solvability gate.
    const isTrap = input.isTrap === true;
    if (!isTrap) {
      const candidate: Problem = { ...input, optimalSteps: 0, solvable: true };
      if (!validateSolvability(candidate)) {
        res.status(400).json({ error: 'Problem is not solvable: conclusions are not reachable from the hypotheses' });
        return;
      }
    }

    const optimalSteps = isTrap ? 0 : computeOptimalSteps({ ...input, optimalSteps: 0, solvable: true });
    const row = toProblemRow(input, optimalSteps);

    try {
      const saved = await db.problem.upsert({ where: { id: input.id }, create: row, update: row });
      res.status(201).json({ id: saved.id, optimalSteps, solvable: true });
    } catch (err) {
      console.error('[problems] failed to persist problem', err);
      res.status(500).json({ error: 'Failed to persist problem' });
    }
  });

  return router;
}

function toProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    domain: row.domain,
    difficulty: row.difficulty,
    title: row.titleEn,
    title_fr: row.titleFr,
    variables: row.variables as Problem['variables'],
    formulas: row.formulas as Problem['formulas'],
    hypotheses: row.hypotheses,
    conclusions: row.conclusions,
    optimalSteps: row.optimalSteps,
    solvable: true,
    isTrap: row.isTrap,
  };
}

function toProblemRow(input: ProblemInput, optimalSteps: number): Prisma.ProblemCreateInput {
  return {
    id: input.id,
    domain: input.domain,
    difficulty: input.difficulty,
    titleEn: input.title,
    titleFr: input.title_fr,
    variables: input.variables as unknown as Prisma.InputJsonValue,
    formulas: input.formulas as unknown as Prisma.InputJsonValue,
    hypotheses: input.hypotheses,
    conclusions: input.conclusions,
    optimalSteps,
    solvable: true,
    isTrap: input.isTrap ?? false,
  };
}
