/**
 * STEM Problem Game — Problem Loader
 * Source: GDD §3 (Mathematical model), §9.2 (State Machine)
 *
 * Fetches a problem definition (public/problems/*.json), validates its
 * structure with the Zod schema in src/game/problemSchema.ts, and loads
 * it into the Zustand store (src/game/store.ts).
 */

import type { Problem } from './types';
import { parseProblem } from './problemSchema';
import { useGameStore } from './store';

/**
 * Fetch the problem JSON at `url`, validate it, and inject it into the
 * game store via loadProblem(). Returns the validated Problem.
 *
 * Throws if the request fails or the JSON doesn't match the Problem schema
 * (ProblemValidationError, see src/game/problemSchema.ts).
 */
export async function loadProblemFromUrl(url: string): Promise<Problem> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch problem at ${url}: ${res.status}`);
  }

  const json: unknown = await res.json();
  const problem = parseProblem(json);

  useGameStore.getState().loadProblem(problem);
  return problem;
}
