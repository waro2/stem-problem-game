/**
 * STEM Problem Game — Runtime validation for incoming problem definitions
 * Source: GDD §3 (Mathematical model), §9.3 (Solvability pre-check)
 *
 * Pure functions: validate untrusted JSON from POST /api/problems before
 * the solvability check (validateSolvability in src/game/engine.ts) and
 * persistence.
 */

import type { Problem, Variable, Formula } from '../game/types';
import { DOMAINS, DIFFICULTIES, isString, isStringArray, isOneOf } from './validators';

/** Author-supplied subset of a Problem — `optimalSteps` and `solvable` are computed server-side. */
export type ProblemInput = Omit<Problem, 'optimalSteps' | 'solvable'>;

function isVariable(v: unknown): v is Variable {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isString(o.id) &&
    isString(o.label) &&
    isString(o.label_fr) &&
    isOneOf(o.domain, DOMAINS) &&
    (o.unit === undefined || isString(o.unit))
  );
}

function isFormula(v: unknown): v is Formula {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isString(o.id) &&
    isString(o.expression) &&
    (o.expression_fr === undefined || isString(o.expression_fr)) &&
    isStringArray(o.variableIds) &&
    (o.conceptName === undefined || isString(o.conceptName)) &&
    (o.conceptName_fr === undefined || isString(o.conceptName_fr))
  );
}

/**
 * Validate a POST /api/problems request body against the Problem shape
 * (minus the server-computed `optimalSteps` and `solvable` fields).
 * Returns null if the body is malformed.
 */
export function parseProblemInput(body: unknown): ProblemInput | null {
  if (typeof body !== 'object' || body === null) return null;
  const v = body as Record<string, unknown>;

  if (
    !isString(v.id) ||
    !isOneOf(v.domain, DOMAINS) ||
    !isOneOf(v.difficulty, DIFFICULTIES) ||
    !isString(v.title) ||
    !isString(v.title_fr) ||
    !Array.isArray(v.variables) ||
    !v.variables.every(isVariable) ||
    !Array.isArray(v.formulas) ||
    !v.formulas.every(isFormula) ||
    !isStringArray(v.hypotheses) ||
    !isStringArray(v.conclusions)
  ) {
    return null;
  }

  return {
    id: v.id,
    domain: v.domain,
    difficulty: v.difficulty,
    title: v.title,
    title_fr: v.title_fr,
    variables: v.variables,
    formulas: v.formulas,
    hypotheses: v.hypotheses,
    conclusions: v.conclusions,
    isTrap: typeof v.isTrap === 'boolean' ? v.isTrap : false,
  };
}
