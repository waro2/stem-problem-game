/**
 * Cognitive profile metrics — pure calculations feeding CognitiveRadarChart.
 * Every metric is normalized to the 0–1 range so they can share one radar axis.
 */

import type { StudentSessionRow } from '@api/instructor';

/** Time elapsed above this threshold scores zero on the "Vitesse" axis. */
const SPEED_THRESHOLD_SECONDS = 300;

/** Matches the GDD §6.2 score ceiling (S_MAX + max timeBonus). */
const SCORE_MAX = 1200;

export interface CognitiveMetrics {
  reussite: number;
  efficacite: number;
  autonomie: number;
  metacognition: number;
  vitesse: number;
  scoreNorm: number;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Derive the 6-axis cognitive profile from a student's raw session history. */
export function computeCognitiveMetrics(sessions: readonly StudentSessionRow[]): CognitiveMetrics {
  if (sessions.length === 0) {
    return { reussite: 0, efficacite: 0, autonomie: 0, metacognition: 0, vitesse: 0, scoreNorm: 0 };
  }

  const reussite = sessions.filter(s => s.completedAt !== null).length / sessions.length;

  const efficacyValues = sessions
    .map(s => s.stepEfficiencyRatio ?? (s.optimalSteps !== null && s.totalSteps ? s.optimalSteps / s.totalSteps : null))
    .filter((v): v is number => v !== null);
  const efficacite = clamp01(average(efficacyValues));

  const autonomie = sessions.filter(s => s.hintsUsed === 0).length / sessions.length;

  const metacognitionValues = sessions
    .filter((s): s is StudentSessionRow & { totalSteps: number } => s.totalSteps !== null && s.totalSteps > 0)
    .map(s => clamp01(1 - s.hintsUsed / s.totalSteps));
  const metacognition = average(metacognitionValues);

  const timeValues = sessions.map(s => s.timeElapsedSeconds).filter((v): v is number => v !== null);
  const avgTime = average(timeValues);
  const vitesse = 1 - Math.min(avgTime / SPEED_THRESHOLD_SECONDS, 1);

  const scoreValues = sessions.map(s => s.finalScore).filter((v): v is number => v !== null);
  const scoreNorm = clamp01(average(scoreValues) / SCORE_MAX);

  return { reussite, efficacite, autonomie, metacognition, vitesse, scoreNorm };
}
