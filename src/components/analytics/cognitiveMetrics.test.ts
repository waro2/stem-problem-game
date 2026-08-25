import { describe, it, expect } from 'vitest';
import { computeCognitiveMetrics } from './cognitiveMetrics';
import type { StudentSessionRow } from '@api/instructor';

function session(overrides: Partial<StudentSessionRow> = {}): StudentSessionRow {
  return {
    id: 's-1',
    domain: 'physics',
    outcome: 'win',
    totalSteps: 4,
    optimalSteps: 3,
    hintsUsed: 0,
    finalScore: 900,
    stepEfficiencyRatio: 0.75,
    timeElapsedSeconds: 120,
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:05:00.000Z',
    ...overrides,
  };
}

describe('computeCognitiveMetrics', () => {
  it('returns all zeros for an empty session list', () => {
    expect(computeCognitiveMetrics([])).toEqual({
      reussite: 0,
      efficacite: 0,
      autonomie: 0,
      metacognition: 0,
      vitesse: 0,
      scoreNorm: 0,
    });
  });

  it('computes réussite as the share of sessions with a completedAt', () => {
    const sessions = [session({ completedAt: '2026-01-01T00:05:00.000Z' }), session({ completedAt: null })];
    expect(computeCognitiveMetrics(sessions).reussite).toBe(0.5);
  });

  it('averages stepEfficiencyRatio for efficacité, falling back to optimalSteps/totalSteps when absent', () => {
    const sessions = [
      session({ stepEfficiencyRatio: 1 }),
      session({ stepEfficiencyRatio: null, optimalSteps: 2, totalSteps: 4 }),
    ];
    expect(computeCognitiveMetrics(sessions).efficacite).toBeCloseTo(0.75, 5);
  });

  it('computes autonomie as the share of sessions with zero hints used', () => {
    const sessions = [session({ hintsUsed: 0 }), session({ hintsUsed: 2 }), session({ hintsUsed: 0 })];
    expect(computeCognitiveMetrics(sessions).autonomie).toBeCloseTo(2 / 3, 5);
  });

  it('computes métacognition as 1 - hintsUsed/totalSteps, ignoring sessions without steps', () => {
    const sessions = [
      session({ hintsUsed: 1, totalSteps: 4 }),
      session({ hintsUsed: 0, totalSteps: null }),
    ];
    expect(computeCognitiveMetrics(sessions).metacognition).toBeCloseTo(0.75, 5);
  });

  it('caps vitesse at 0 when average time exceeds the 300s threshold', () => {
    const sessions = [session({ timeElapsedSeconds: 600 })];
    expect(computeCognitiveMetrics(sessions).vitesse).toBe(0);
  });

  it('gives vitesse = 1 for an instant session', () => {
    const sessions = [session({ timeElapsedSeconds: 0 })];
    expect(computeCognitiveMetrics(sessions).vitesse).toBe(1);
  });

  it('clamps scoreNorm to 1 when the average score exceeds the 1200 ceiling', () => {
    const sessions = [session({ finalScore: 1200 }), session({ finalScore: 1200 })];
    expect(computeCognitiveMetrics(sessions).scoreNorm).toBe(1);
  });

  it('ignores null finalScore values when averaging scoreNorm', () => {
    const sessions = [session({ finalScore: 600 }), session({ finalScore: null })];
    expect(computeCognitiveMetrics(sessions).scoreNorm).toBeCloseTo(0.5, 5);
  });
});
