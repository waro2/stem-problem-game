/**
 * Tests for achievement/badge unlock rules.
 * Run: npx vitest src/game/achievements.test.ts
 */

import { describe, it, expect } from 'vitest';
import { isParAchieved, isLightningSpeed, computeMasteredDomains } from './achievements';
import type { SessionSummary } from './types';

const BASE_SUMMARY: SessionSummary = {
  problemId: 'p-1',
  outcome: 'win',
  totalSteps: 3,
  optimalSteps: 3,
  elapsedSeconds: 30,
  hintsUsed: 0,
  score: { base: 1000, stepPenalty: 60, hintPenalty: 0, timeBonus: 140, total: 1080 },
  activationPath: ['f1', 'f2', 'f3'],
};

describe('isParAchieved', () => {
  it('is true when totalSteps equals optimalSteps on a win', () => {
    expect(isParAchieved(BASE_SUMMARY)).toBe(true);
  });

  it('is false when totalSteps exceeds optimalSteps', () => {
    expect(isParAchieved({ ...BASE_SUMMARY, totalSteps: 5 })).toBe(false);
  });

  it('is false on a "stuck" outcome even with matching steps', () => {
    expect(isParAchieved({ ...BASE_SUMMARY, outcome: 'stuck' })).toBe(false);
  });
});

describe('isLightningSpeed', () => {
  it('is true when the session was won in under 60 seconds', () => {
    expect(isLightningSpeed({ ...BASE_SUMMARY, elapsedSeconds: 59 })).toBe(true);
  });

  it('is false at exactly 60 seconds', () => {
    expect(isLightningSpeed({ ...BASE_SUMMARY, elapsedSeconds: 60 })).toBe(false);
  });

  it('is false when over 60 seconds', () => {
    expect(isLightningSpeed({ ...BASE_SUMMARY, elapsedSeconds: 90 })).toBe(false);
  });

  it('is false on a "stuck" outcome even if fast', () => {
    expect(isLightningSpeed({ ...BASE_SUMMARY, outcome: 'stuck', elapsedSeconds: 10 })).toBe(false);
  });
});

describe('computeMasteredDomains', () => {
  const PROBLEMS = [
    { id: 'phys-1', domain: 'physics' as const },
    { id: 'phys-2', domain: 'physics' as const },
    { id: 'chem-1', domain: 'chemistry' as const },
  ];

  it('returns no mastered domains when nothing is completed', () => {
    expect(computeMasteredDomains(PROBLEMS, new Set())).toEqual(new Set());
  });

  it('does not mark a domain mastered until all its problems are completed', () => {
    expect(computeMasteredDomains(PROBLEMS, new Set(['phys-1']))).toEqual(new Set());
  });

  it('marks a domain mastered once all its problems are completed', () => {
    expect(computeMasteredDomains(PROBLEMS, new Set(['phys-1', 'phys-2']))).toEqual(new Set(['physics']));
  });

  it('can mark multiple domains mastered', () => {
    expect(computeMasteredDomains(PROBLEMS, new Set(['phys-1', 'phys-2', 'chem-1']))).toEqual(
      new Set(['physics', 'chemistry'])
    );
  });

  it('returns an empty set for an empty catalog', () => {
    expect(computeMasteredDomains([], new Set())).toEqual(new Set());
  });
});
