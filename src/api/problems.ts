/**
 * STEM Problem Game — Problem authoring data contract
 * Source: GDD §9.3 (Solvability pre-check), §5 (UI Design)
 *
 * Shared between src/server/problemsRouter.ts (producer) and
 * src/pages/ProblemEditor.tsx (consumer).
 */

import type { Problem } from '../game/types';

/** Author-supplied subset of a Problem — `optimalSteps` and `solvable` are computed server-side. */
export type ProblemDraft = Omit<Problem, 'optimalSteps' | 'solvable'>;

export interface CreateProblemResponse {
  id: string;
  optimalSteps: number;
  solvable: true;
}

/**
 * Fetch a full problem definition by ID from the DB via the API.
 * Returns null if the problem is not found in the DB (404).
 * Throws for other HTTP errors.
 */
type RawFormula = {
  variableIds?: string[];
  vars?: string[];
  expression?: string;
  expression_fr?: string;
  exprEN?: string;
  exprFR?: string;
  [key: string]: unknown;
};

export async function fetchProblemById(apiUrl: string, problemId: string): Promise<Problem | null> {
  const res = await fetch(`${apiUrl}/api/problems/${encodeURIComponent(problemId)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to fetch problem ${problemId}: ${res.status}`);
  }
  const raw = await res.json();
  return {
    ...raw,
    hypotheses:  raw.hypotheses  ?? raw.given   ?? [],
    conclusions: raw.conclusions ?? raw.target  ?? [],
    title:    raw.title    ?? raw.titleEn ?? '',
    title_fr: raw.title_fr ?? raw.titleFr ?? '',
    formulas: ((raw.formulas ?? []) as RawFormula[]).map((f) => ({
      ...f,
      variableIds:   f.variableIds   ?? f.vars   ?? [],
      expression:    f.expression    ?? f.exprEN  ?? f.exprFR ?? '',
      expression_fr: f.expression_fr ?? f.exprFR  ?? f.exprEN ?? '',
    })),
  } as Problem;
}

/** Submit a new problem definition. The server re-runs validateSolvability() before persisting. */
export async function createProblem(apiUrl: string, draft: ProblemDraft): Promise<CreateProblemResponse> {
  const res = await fetch(`${apiUrl}/api/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to create problem: ${res.status}`);
  }
  return res.json() as Promise<CreateProblemResponse>;
}
