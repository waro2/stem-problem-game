/**
 * Cohort leaderboard ranking  (mirrors the cohort_leaderboard SQL view, GDD §6.4)
 *
 * Pure aggregation used by src/server/cohortRouter.ts: sums final scores
 * and averages step-efficiency across each member's winning sessions, then
 * ranks members highest-score-first. Ties share the same rank (SQL RANK()
 * semantics) and members with no winning sessions are excluded.
 */

import type { LeaderboardEntry } from '../api/leaderboard';

export interface LeaderboardMember {
  id: string;
  name: string | null;
}

/** A single winning session — callers should pre-filter to outcome === 'win'. */
export interface LeaderboardSessionRow {
  userId: string;
  finalScore: number | null;
  stepEfficiencyRatio: number | null;
}

function average(values: ReadonlyArray<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

export function computeCohortLeaderboardEntries(
  members: readonly LeaderboardMember[],
  sessions: readonly LeaderboardSessionRow[]
): LeaderboardEntry[] {
  const nameById = new Map(members.map(m => [m.id, m.name]));

  const groups = new Map<string, LeaderboardSessionRow[]>();
  for (const session of sessions) {
    const group = groups.get(session.userId);
    if (group) group.push(session);
    else groups.set(session.userId, [session]);
  }

  const rows = [...groups.entries()].map(([userId, group]) => ({
    userId,
    displayName: nameById.get(userId) ?? userId,
    totalScore: group.reduce((sum, r) => sum + (r.finalScore ?? 0), 0),
    avgEfficiency: average(group.map(r => r.stepEfficiencyRatio)),
  }));

  rows.sort((a, b) => b.totalScore - a.totalScore);

  let rank = 0;
  let lastScore: number | null = null;
  return rows.map((row, index) => {
    if (row.totalScore !== lastScore) {
      rank = index + 1;
      lastScore = row.totalScore;
    }
    return {
      rank,
      displayName: row.displayName,
      totalScore: row.totalScore,
      avgEfficiency: row.avgEfficiency,
    };
  });
}
