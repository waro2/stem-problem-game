/**
 * STEM Problem Game — Research Dashboard data contract
 * Source: GDD §8.3 (Aggregates), §6.4 (Cohort leaderboard)
 *
 * Shared between src/server/researchRouter.ts (producer) and
 * src/pages/ResearchDashboard.tsx (consumer).
 */

import type { Domain } from '../game/types';

export interface DomainCompletionRow {
  domain: Domain;
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number | null;
}

export interface ScoreHistoryPoint {
  /** ISO date (YYYY-MM-DD) — sessions are bucketed by day. */
  date: string;
  avgScore: number;
  sessionCount: number;
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  cohortName: string | null;
  totalScore: number;
  sessionsPlayed: number;
  avgEfficiency: number | null;
}

/** One day's aggregated value for a single student or cohort. */
export interface TrendPoint {
  /** ISO date (YYYY-MM-DD) — values are bucketed by day. */
  date: string;
  value: number;
  /** Number of sessions/events the value was averaged over. */
  sampleSize: number;
}

/** Daily trend for one student or cohort. */
export interface TrendSeries {
  /** User id (per-student series) or cohort id (per-cohort series). */
  groupId: string;
  groupLabel: string;
  points: TrendPoint[];
}

/** A research metric broken down both per-student and per-cohort (GDD §8.3). */
export interface MetricTrend {
  byStudent: TrendSeries[];
  byCohort: TrendSeries[];
}

export interface ResearchDashboardData {
  domainCompletion: DomainCompletionRow[];
  scoreHistory: ScoreHistoryPoint[];
  cohortLeaderboard: LeaderboardRow[];
  /** Step Efficiency Ratio — optimalSteps / totalSteps, averaged per day (GDD §8.3, §6.2). */
  stepEfficiencyTrend: MetricTrend;
  /** Hint Decay Rate — average hints used per session, per day (GDD §8.3, §6.3). */
  hintDecayTrend: MetricTrend;
  /** Domain Completion Rate — daily win rate (GDD §8.3). */
  domainCompletionTrend: MetricTrend;
  /** Cascade Recognition Speed — average Δt (seconds) between activations, per day (GDD §8.1, §8.3). */
  cascadeRecognitionTrend: MetricTrend;
  /** Score Trajectory — average final score per day (GDD §8.3, §6.2). */
  scoreTrajectoryTrend: MetricTrend;
  /** Stuck Rate — daily proportion of sessions ending in 'stuck' (GDD §8.3, §4.1). */
  stuckRateTrend: MetricTrend;
}

/** Fetch the read-only aggregates shown on the Research Dashboard. */
export async function fetchResearchDashboard(apiUrl: string): Promise<ResearchDashboardData> {
  const res = await fetch(`${apiUrl}/api/research/dashboard`);
  if (!res.ok) throw new Error(`Failed to fetch research dashboard: ${res.status}`);
  return res.json() as Promise<ResearchDashboardData>;
}

/** URL of the anonymised CSV export of completed sessions (GDD §8.4 — no PII). */
export function sessionsExportCsvUrl(apiUrl: string): string {
  return `${apiUrl}/api/research/export/sessions.csv`;
}

/** Fetch the anonymised CSV export of completed sessions as a Blob (GDD §8.4 — no PII). */
export async function fetchSessionsExportCsv(apiUrl: string): Promise<Blob> {
  const res = await fetch(sessionsExportCsvUrl(apiUrl));
  if (!res.ok) throw new Error(`Failed to fetch sessions CSV export: ${res.status}`);
  return res.blob();
}
