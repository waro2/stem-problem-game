/**
 * Research Dashboard — read-only aggregates  (GDD §8.3, §6.4)
 *
 * Pure functions that turn raw rows from problem_stats / sessions / users
 * into the three views shown on src/pages/ResearchDashboard.tsx:
 *  - completion rate per domain
 *  - average score over time
 *  - cohort leaderboard (mirrors the cohort_leaderboard SQL view)
 */

import type { Domain, Difficulty, GameOutcome } from '../game/types';
import type { DomainCompletionRow, ScoreHistoryPoint, LeaderboardRow, TrendPoint, TrendSeries, MetricTrend } from '../api/research';

function average(values: ReadonlyArray<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

// ─────────────────────────────────────────────
// Completion rate by domain
// ─────────────────────────────────────────────

export interface ProblemDomainStats {
  domain: Domain;
  totalAttempts: number;
  totalCompletions: number;
}

/** Roll problem_stats up to one completion rate per domain (attempts-weighted). */
export function computeDomainCompletion(rows: readonly ProblemDomainStats[]): DomainCompletionRow[] {
  const groups = new Map<Domain, ProblemDomainStats[]>();
  for (const row of rows) {
    const group = groups.get(row.domain);
    if (group) group.push(row);
    else groups.set(row.domain, [row]);
  }

  return [...groups.entries()].map(([domain, group]) => {
    const totalAttempts = group.reduce((sum, r) => sum + r.totalAttempts, 0);
    const totalCompletions = group.reduce((sum, r) => sum + r.totalCompletions, 0);
    return {
      domain,
      totalAttempts,
      totalCompletions,
      completionRate: totalAttempts > 0 ? totalCompletions / totalAttempts : null,
    };
  });
}

// ─────────────────────────────────────────────
// Score over time
// ─────────────────────────────────────────────

export interface SessionScorePoint {
  startedAt: Date;
  finalScore: number;
}

/** Average final score per day, ordered chronologically. */
export function computeScoreHistory(sessions: readonly SessionScorePoint[]): ScoreHistoryPoint[] {
  const groups = new Map<string, number[]>();
  for (const session of sessions) {
    const date = session.startedAt.toISOString().slice(0, 10);
    const group = groups.get(date);
    if (group) group.push(session.finalScore);
    else groups.set(date, [session.finalScore]);
  }

  return [...groups.entries()]
    .map(([date, scores]) => ({
      date,
      avgScore: scores.reduce((sum, v) => sum + v, 0) / scores.length,
      sessionCount: scores.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─────────────────────────────────────────────
// Cohort leaderboard  (mirrors the cohort_leaderboard SQL view)
// ─────────────────────────────────────────────

export interface LeaderboardSession {
  userId: string;
  finalScore: number | null;
  stepEfficiencyRatio: number | null;
}

export interface CohortUser {
  id: string;
  name: string | null;
  cohortName: string | null;
}

/** Sum of finalScore across winning sessions, per user — highest first. */
export function computeCohortLeaderboard(
  sessions: readonly LeaderboardSession[],
  users: readonly CohortUser[]
): LeaderboardRow[] {
  const userById = new Map(users.map(u => [u.id, u]));

  const groups = new Map<string, LeaderboardSession[]>();
  for (const session of sessions) {
    const group = groups.get(session.userId);
    if (group) group.push(session);
    else groups.set(session.userId, [session]);
  }

  const rows = [...groups.entries()].map(([userId, group]) => {
    const user = userById.get(userId);
    return {
      userId,
      displayName: user?.name ?? userId,
      cohortName: user?.cohortName ?? null,
      totalScore: group.reduce((sum, r) => sum + (r.finalScore ?? 0), 0),
      sessionsPlayed: group.length,
      avgEfficiency: average(group.map(r => r.stepEfficiencyRatio)),
    };
  });

  return rows.sort((a, b) => b.totalScore - a.totalScore);
}

// ─────────────────────────────────────────────
// Per-student / per-cohort trend metrics (GDD §8.3)
// ─────────────────────────────────────────────

/** A user with their cohort membership, used to build per-cohort trend series. */
export interface UserGroupInfo {
  id: string;
  name: string | null;
  cohortId: string | null;
  cohortName: string | null;
}

/** One completed session, as needed by the session-based trend metrics. */
export interface SessionTrendRow {
  userId: string;
  startedAt: Date;
  outcome: GameOutcome | null;
  finalScore: number | null;
  stepEfficiencyRatio: number | null;
  hintsUsed: number;
}

/** One `formula_activated` event, as needed by the cascade recognition trend. */
export interface ActivationTimingRow {
  userId: string;
  receivedAt: Date;
  /** Seconds since the previous activation (or session start) — GDD §8.1. */
  timeSinceLast: number;
}

/**
 * Bucket rows by day and average `getValue(row)`, once per student and once
 * per cohort. Rows for which `getValue` returns null are excluded from the
 * metric (e.g. sessions without a recorded outcome).
 */
function buildMetricTrend<T>(
  rows: readonly T[],
  users: readonly UserGroupInfo[],
  getUserId: (row: T) => string,
  getDate: (row: T) => Date,
  getValue: (row: T) => number | null
): MetricTrend {
  const userById = new Map(users.map(u => [u.id, u]));
  const cohortNameById = new Map<string, string | null>();
  for (const user of users) {
    if (user.cohortId && !cohortNameById.has(user.cohortId)) {
      cohortNameById.set(user.cohortId, user.cohortName);
    }
  }

  const studentBuckets = new Map<string, Map<string, number[]>>();
  const cohortBuckets = new Map<string, Map<string, number[]>>();

  for (const row of rows) {
    const value = getValue(row);
    if (value === null) continue;

    const userId = getUserId(row);
    const date = getDate(row).toISOString().slice(0, 10);
    addSample(studentBuckets, userId, date, value);

    const cohortId = userById.get(userId)?.cohortId ?? null;
    if (cohortId) addSample(cohortBuckets, cohortId, date, value);
  }

  return {
    byStudent: toTrendSeries(studentBuckets, userId => userById.get(userId)?.name ?? userId),
    byCohort: toTrendSeries(cohortBuckets, cohortId => cohortNameById.get(cohortId) ?? cohortId),
  };
}

function addSample(buckets: Map<string, Map<string, number[]>>, groupId: string, date: string, value: number): void {
  let byDate = buckets.get(groupId);
  if (!byDate) {
    byDate = new Map();
    buckets.set(groupId, byDate);
  }
  const values = byDate.get(date);
  if (values) values.push(value);
  else byDate.set(date, [value]);
}

function toTrendSeries(
  buckets: Map<string, Map<string, number[]>>,
  groupLabel: (groupId: string) => string | null
): TrendSeries[] {
  return [...buckets.entries()].map(([groupId, byDate]) => ({
    groupId,
    groupLabel: groupLabel(groupId) ?? groupId,
    points: [...byDate.entries()]
      .map(([date, values]): TrendPoint => ({
        date,
        value: values.reduce((sum, v) => sum + v, 0) / values.length,
        sampleSize: values.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));
}

/** Step Efficiency Ratio: optimalSteps / totalSteps, averaged per day (GDD §6.2). */
export function computeStepEfficiencyTrend(
  sessions: readonly SessionTrendRow[],
  users: readonly UserGroupInfo[]
): MetricTrend {
  return buildMetricTrend(sessions, users, s => s.userId, s => s.startedAt, s => s.stepEfficiencyRatio);
}

/** Hint Decay Rate: average hints used per session, per day (GDD §6.3). */
export function computeHintDecayTrend(
  sessions: readonly SessionTrendRow[],
  users: readonly UserGroupInfo[]
): MetricTrend {
  return buildMetricTrend(sessions, users, s => s.userId, s => s.startedAt, s => s.hintsUsed);
}

/** Domain Completion Rate: daily win rate (1 = win, 0 = stuck). */
export function computeDomainCompletionTrend(
  sessions: readonly SessionTrendRow[],
  users: readonly UserGroupInfo[]
): MetricTrend {
  return buildMetricTrend(sessions, users, s => s.userId, s => s.startedAt, s =>
    s.outcome === null ? null : s.outcome === 'win' ? 1 : 0
  );
}

/** Cascade Recognition Speed: average Δt (seconds) between activations, per day (GDD §8.1). */
export function computeCascadeRecognitionTrend(
  activations: readonly ActivationTimingRow[],
  users: readonly UserGroupInfo[]
): MetricTrend {
  return buildMetricTrend(activations, users, a => a.userId, a => a.receivedAt, a => a.timeSinceLast);
}

/** Score Trajectory: average final score per day. */
export function computeScoreTrajectoryTrend(
  sessions: readonly SessionTrendRow[],
  users: readonly UserGroupInfo[]
): MetricTrend {
  return buildMetricTrend(sessions, users, s => s.userId, s => s.startedAt, s => s.finalScore);
}

/** Stuck Rate: daily proportion of sessions ending in 'stuck' (1 = stuck, 0 = win). */
export function computeStuckRateTrend(
  sessions: readonly SessionTrendRow[],
  users: readonly UserGroupInfo[]
): MetricTrend {
  return buildMetricTrend(sessions, users, s => s.userId, s => s.startedAt, s =>
    s.outcome === null ? null : s.outcome === 'stuck' ? 1 : 0
  );
}

// ─────────────────────────────────────────────
// CSV export (GDD §8.4 — anonymised, no PII)
// ─────────────────────────────────────────────

export interface SessionExportRow {
  problemId: string;
  domain: Domain;
  difficulty: Difficulty;
  outcome: GameOutcome | null;
  stepEfficiencyRatio: number | null;
  hintsUsed: number;
  finalScore: number | null;
}

const SESSIONS_CSV_HEADER = 'problem_id,domain,difficulty,outcome,step_efficiency_ratio,hints_used,final_score';

/** Quote a CSV field per RFC 4180 if it contains a comma, quote, or newline. */
function csvField(value: string | number | null): string {
  if (value === null) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Build an anonymised CSV export of completed sessions — no user/PII columns (GDD §8.4). */
export function buildSessionsCsv(rows: readonly SessionExportRow[]): string {
  const lines = rows.map(r =>
    [r.problemId, r.domain, r.difficulty, r.outcome, r.stepEfficiencyRatio, r.hintsUsed, r.finalScore]
      .map(csvField)
      .join(',')
  );
  return [SESSIONS_CSV_HEADER, ...lines].join('\n');
}
