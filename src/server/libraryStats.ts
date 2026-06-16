/**
 * Problem Library — per-user progress summary  (GDD §5)
 *
 * Pure function that pairs the problem catalog with one user's session
 * history to build the cards shown on src/pages/ProblemLibrary.tsx:
 *  - "completed" badge (at least one winning session)
 *  - previous score (most recent completed session)
 */

import type { Domain, Difficulty, GameOutcome } from '../game/types';
import type { ProblemSummary } from '../api/library';

export interface ProblemRow {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  titleEn: string;
  titleFr: string;
}

export interface UserSessionRow {
  problemId: string;
  outcome: GameOutcome | null;
  finalScore: number | null;
  startedAt: Date;
}

/** Pair each problem with the user's completion status and most recent score. */
export function computeProblemSummaries(
  problems: readonly ProblemRow[],
  sessions: readonly UserSessionRow[]
): ProblemSummary[] {
  const sessionsByProblem = new Map<string, UserSessionRow[]>();
  for (const session of sessions) {
    const group = sessionsByProblem.get(session.problemId);
    if (group) group.push(session);
    else sessionsByProblem.set(session.problemId, [session]);
  }

  return problems.map(problem => {
    const problemSessions = sessionsByProblem.get(problem.id) ?? [];
    const completed = problemSessions.some(s => s.outcome === 'win');
    const latest = [...problemSessions].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

    return {
      id: problem.id,
      domain: problem.domain,
      difficulty: problem.difficulty,
      title: problem.titleEn,
      title_fr: problem.titleFr,
      completed,
      previousScore: latest?.finalScore ?? null,
    };
  });
}
