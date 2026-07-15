/**
 * STEM Problem Game — Problem Library data contract
 * Source: GDD §5 (UI Design)
 *
 * Shared between src/server/problemsRouter.ts (producer) and
 * src/pages/ProblemLibrary.tsx (consumer).
 */

import type { Domain, Difficulty } from '../game/types';

export interface ProblemSummary {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  title: string;
  title_fr: string;
  /** True iff the user has at least one winning session on this problem. */
  completed: boolean;
  /** Final score of the user's most recent completed session, or null if never attempted. */
  previousScore: number | null;
  /** Intentionally unsolvable — visible only to instructors/admins. */
  isTrap: boolean;
}

/** Fetch the problem library, annotated with the given user's progress. */
export async function fetchProblemLibrary(apiUrl: string, userId: string): Promise<ProblemSummary[]> {
  const res = await fetch(`${apiUrl}/api/problems?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Failed to fetch problem library: ${res.status}`);
  return res.json() as Promise<ProblemSummary[]>;
}
