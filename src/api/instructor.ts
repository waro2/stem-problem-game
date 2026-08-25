/**
 * STEM Problem Game — Instructor Dashboard data contract
 * Source: GDD §6.4 (Cohort leaderboard), §6.2 (Score formula)
 *
 * Shared between src/server/instructorRouter.ts (producer) and
 * src/pages/InstructorDashboard.tsx (consumer).
 */

import type { Domain, GameOutcome, ScoreConfig } from '../game/types';

export interface StudentDomainCompletion {
  domain: Domain;
  completionRate: number | null;
}

export interface CohortStudentRow {
  userId: string;
  displayName: string;
  avgScore: number | null;
  sessionsPlayed: number;
  domainCompletion: StudentDomainCompletion[];
}

export interface InstructorDashboardData {
  cohortId: string;
  cohortName: string;
  students: CohortStudentRow[];
  scoreConfig: ScoreConfig;
  /** Whether the student-facing LeaderboardPanel is enabled for this cohort. */
  leaderboardEnabled: boolean;
}

/** Fetch the cohort roster, per-domain completion rates, and score config. */
export async function fetchInstructorDashboard(apiUrl: string, cohortId: string): Promise<InstructorDashboardData> {
  const res = await fetch(`${apiUrl}/api/instructor/cohorts/${encodeURIComponent(cohortId)}/dashboard`);
  if (!res.ok) throw new Error(`Failed to fetch instructor dashboard: ${res.status}`);
  return res.json() as Promise<InstructorDashboardData>;
}

/** Persist adjusted score penalties/bonuses for a cohort. */
export async function updateScoreConfig(apiUrl: string, cohortId: string, config: ScoreConfig): Promise<ScoreConfig> {
  const res = await fetch(`${apiUrl}/api/instructor/cohorts/${encodeURIComponent(cohortId)}/score-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Failed to update score config: ${res.status}`);
  return res.json() as Promise<ScoreConfig>;
}

/** Enable or disable the student-facing LeaderboardPanel for a cohort. */
export async function updateLeaderboardEnabled(apiUrl: string, cohortId: string, enabled: boolean): Promise<{ leaderboardEnabled: boolean }> {
  const res = await fetch(`${apiUrl}/api/instructor/cohorts/${encodeURIComponent(cohortId)}/leaderboard`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`Failed to update leaderboard setting: ${res.status}`);
  return res.json() as Promise<{ leaderboardEnabled: boolean }>;
}

/** One raw session row for a single student, used by the cognitive radar chart and domain heatmap. */
export interface StudentSessionRow {
  id: string;
  domain: Domain;
  outcome: GameOutcome | null;
  totalSteps: number | null;
  optimalSteps: number | null;
  hintsUsed: number;
  finalScore: number | null;
  stepEfficiencyRatio: number | null;
  timeElapsedSeconds: number | null;
  startedAt: string;
  completedAt: string | null;
}

/** Fetch every session played by one student in a cohort, ordered oldest-first. */
export async function fetchStudentSessions(apiUrl: string, cohortId: string, studentId: string): Promise<StudentSessionRow[]> {
  const res = await fetch(
    `${apiUrl}/api/instructor/cohorts/${encodeURIComponent(cohortId)}/students/${encodeURIComponent(studentId)}/sessions`
  );
  if (!res.ok) throw new Error(`Failed to fetch student sessions: ${res.status}`);
  return res.json() as Promise<StudentSessionRow[]>;
}
