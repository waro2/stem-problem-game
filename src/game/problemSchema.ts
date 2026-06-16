/**
 * STEM Problem Game — Zod schema for Problem JSON files
 * Source: GDD §3 (Mathematical model)
 *
 * Mirrors the Problem/Variable/Formula shapes in src/game/types.ts.
 * Used by src/game/problemLoader.ts to validate untrusted JSON fetched
 * from public/problems/ at runtime.
 */

import { z } from 'zod';
import type { Problem } from './types';

const DOMAINS = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'] as const;
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

const VariableSchema = z.object({
  id: z.string(),
  label: z.string(),
  label_fr: z.string(),
  unit: z.string().optional(),
  domain: z.enum(DOMAINS),
});

const FormulaSchema = z.object({
  id: z.string(),
  expression: z.string(),
  expression_fr: z.string().optional(),
  variableIds: z.array(z.string()),
  conceptName: z.string().optional(),
  conceptName_fr: z.string().optional(),
});

export const ProblemSchema = z.object({
  id: z.string(),
  domain: z.enum(DOMAINS),
  difficulty: z.enum(DIFFICULTIES),
  title: z.string(),
  title_fr: z.string(),
  variables: z.array(VariableSchema),
  formulas: z.array(FormulaSchema),
  hypotheses: z.array(z.string()),
  conclusions: z.array(z.string()),
  optimalSteps: z.number(),
  solvable: z.literal(true),
});

/** Thrown by parseProblem() when a problem JSON file fails schema validation. */
export class ProblemValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super(`Invalid problem definition: ${issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
    this.name = 'ProblemValidationError';
  }
}

/**
 * Validate untrusted JSON against the Problem schema.
 * Throws ProblemValidationError if the data doesn't match.
 */
export function parseProblem(json: unknown): Problem {
  const result = ProblemSchema.safeParse(json);
  if (!result.success) {
    throw new ProblemValidationError(result.error.issues);
  }
  // zod's `.optional()` infers `T | undefined`, which differs from this
  // project's `exactOptionalPropertyTypes` (`T?`) for optional fields —
  // safe to assert since a successful parse never produces explicit
  // `undefined` values (JSON has no `undefined`).
  return result.data as Problem;
}
