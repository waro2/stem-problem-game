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
