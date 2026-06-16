/**
 * Instructor Dashboard — cohort roster & score config  (GDD §6.4, §6.2)
 *
 * Pure functions that turn raw rows from cohorts/sessions into the views
 * shown on src/pages/InstructorDashboard.tsx:
 *  - per-student average score and per-domain completion rate
 *  - score config overrides (Cohort.scoreConfig), merged with defaults
 */

import type { Domain, GameOutcome, ScoreConfig } from '../game/types';
import { DEFAULT_SCORE_CONFIG } from '../game/types';
import type { CohortStudentRow } from '../api/instructor';

function average(values: ReadonlyArray<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

// ─────────────────────────────────────────────
// Cohort roster
// ─────────────────────────────────────────────

export interface CohortMember {
  id: string;
  name: string | null;
}

export interface CohortSessionRow {
  userId: string;
  domain: Domain;
  outcome: GameOutcome | null;
  finalScore: number | null;
}

/** Pair each cohort member with their average score and per-domain completion rate. */
export function computeCohortStudentRows(
  members: readonly CohortMember[],
  sessions: readonly CohortSessionRow[]
): CohortStudentRow[] {
  const sessionsByUser = new Map<string, CohortSessionRow[]>();
  for (const session of sessions) {
    const group = sessionsByUser.get(session.userId);
    if (group) group.push(session);
    else sessionsByUser.set(session.userId, [session]);
  }

  return members.map(member => {
    const userSessions = sessionsByUser.get(member.id) ?? [];

    const byDomain = new Map<Domain, CohortSessionRow[]>();
    for (const session of userSessions) {
      const group = byDomain.get(session.domain);
      if (group) group.push(session);
      else byDomain.set(session.domain, [session]);
    }

    const domainCompletion = [...byDomain.entries()].map(([domain, group]) => ({
      domain,
      completionRate: group.filter(s => s.outcome === 'win').length / group.length,
    }));

    return {
      userId: member.id,
      displayName: member.name ?? member.id,
      avgScore: average(userSessions.map(s => s.finalScore)),
      sessionsPlayed: userSessions.length,
      domainCompletion,
    };
  });
}

// ─────────────────────────────────────────────
// Score config overrides  (Cohort.scoreConfig JSON, GDD §6.2)
// ─────────────────────────────────────────────

const SCORE_CONFIG_KEYS = ['maxScore', 'stepPenalty', 'hintPenalty', 'timeBonusBase', 'timeBonusRate'] as const;

/** Merge a cohort's stored score config overrides with the GDD defaults. */
export function mergeScoreConfig(overrides: unknown): ScoreConfig {
  if (typeof overrides !== 'object' || overrides === null) return DEFAULT_SCORE_CONFIG;

  const record = overrides as Record<string, unknown>;
  const merged = { ...DEFAULT_SCORE_CONFIG };
  for (const key of SCORE_CONFIG_KEYS) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      merged[key] = value;
    }
  }
  return merged;
}

/** Validate a full ScoreConfig submitted by an instructor, or null if invalid. */
export function parseScoreConfig(input: unknown): ScoreConfig | null {
  if (typeof input !== 'object' || input === null) return null;

  const record = input as Record<string, unknown>;
  const result: Partial<ScoreConfig> = {};
  for (const key of SCORE_CONFIG_KEYS) {
    const value = record[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    result[key] = value;
  }
  return result as ScoreConfig;
}
