/**
 * STEM Problem Game — Cohort Leaderboard data contract  (GDD §6.4)
 *
 * Shared between src/server/cohortRouter.ts (producer, mirrors the
 * cohort_leaderboard SQL view) and src/components/LeaderboardPanel.tsx
 * (consumer). The leaderboard is only populated when the instructor has
 * enabled it for the cohort (InstructorDashboard).
 */

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalScore: number;
  avgEfficiency: number | null;
}

export interface CohortLeaderboardData {
  /** Whether the instructor has enabled the leaderboard for this cohort. */
  enabled: boolean;
  /** Empty when `enabled` is false. */
  entries: LeaderboardEntry[];
}

/** Fetch the ranked leaderboard for a cohort, if the instructor has enabled it. */
export async function fetchCohortLeaderboard(apiUrl: string, cohortId: string): Promise<CohortLeaderboardData> {
  const res = await fetch(`${apiUrl}/api/cohorts/${encodeURIComponent(cohortId)}/leaderboard`);
  if (!res.ok) throw new Error(`Failed to fetch cohort leaderboard: ${res.status}`);
  return res.json() as Promise<CohortLeaderboardData>;
}
