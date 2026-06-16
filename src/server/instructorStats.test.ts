/**
 * Tests for instructor dashboard aggregation.
 * Run: npx vitest src/server/instructorStats.test.ts
 */

import { describe, it, expect } from 'vitest';
import { computeCohortStudentRows, mergeScoreConfig, parseScoreConfig } from './instructorStats';
import type { CohortMember, CohortSessionRow } from './instructorStats';
import { DEFAULT_SCORE_CONFIG } from '../game/types';

describe('computeCohortStudentRows', () => {
  const members: CohortMember[] = [
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: null },
  ];

  const sessions: CohortSessionRow[] = [
    { userId: 'user-1', domain: 'physics', outcome: 'win', finalScore: 900 },
    { userId: 'user-1', domain: 'physics', outcome: 'stuck', finalScore: 300 },
    { userId: 'user-1', domain: 'chemistry', outcome: 'win', finalScore: 800 },
  ];

  it('computes average score and session count per student', () => {
    const rows = computeCohortStudentRows(members, sessions);

    const alice = rows.find(r => r.userId === 'user-1')!;
    expect(alice.displayName).toBe('Alice');
    expect(alice.sessionsPlayed).toBe(3);
    expect(alice.avgScore).toBeCloseTo((900 + 300 + 800) / 3);
  });

  it('computes per-domain completion rate', () => {
    const rows = computeCohortStudentRows(members, sessions);

    const alice = rows.find(r => r.userId === 'user-1')!;
    const physics = alice.domainCompletion.find(d => d.domain === 'physics')!;
    const chemistry = alice.domainCompletion.find(d => d.domain === 'chemistry')!;
    expect(physics.completionRate).toBeCloseTo(0.5); // 1 win / 2 attempts
    expect(chemistry.completionRate).toBe(1);
  });

  it('falls back to the user id as display name and reports no sessions for inactive members', () => {
    const rows = computeCohortStudentRows(members, sessions);

    const bob = rows.find(r => r.userId === 'user-2')!;
    expect(bob.displayName).toBe('user-2');
    expect(bob.sessionsPlayed).toBe(0);
    expect(bob.avgScore).toBeNull();
    expect(bob.domainCompletion).toEqual([]);
  });
});

describe('mergeScoreConfig', () => {
  it('returns the defaults when there are no overrides', () => {
    expect(mergeScoreConfig(null)).toEqual(DEFAULT_SCORE_CONFIG);
    expect(mergeScoreConfig(undefined)).toEqual(DEFAULT_SCORE_CONFIG);
  });

  it('applies valid numeric overrides on top of the defaults', () => {
    expect(mergeScoreConfig({ stepPenalty: 30, hintPenalty: 100 })).toEqual({
      ...DEFAULT_SCORE_CONFIG,
      stepPenalty: 30,
      hintPenalty: 100,
    });
  });

  it('ignores invalid override values', () => {
    expect(mergeScoreConfig({ stepPenalty: -5, hintPenalty: 'lots', maxScore: 1200 })).toEqual({
      ...DEFAULT_SCORE_CONFIG,
      maxScore: 1200,
    });
  });
});

describe('parseScoreConfig', () => {
  it('accepts a complete, valid score config', () => {
    const input = { maxScore: 1200, stepPenalty: 25, hintPenalty: 60, timeBonusBase: 250, timeBonusRate: 1.5 };
    expect(parseScoreConfig(input)).toEqual(input);
  });

  it('rejects a config missing a required field', () => {
    const { maxScore, ...incomplete } = DEFAULT_SCORE_CONFIG;
    void maxScore;
    expect(parseScoreConfig(incomplete)).toBeNull();
  });

  it('rejects negative or non-numeric values', () => {
    expect(parseScoreConfig({ ...DEFAULT_SCORE_CONFIG, stepPenalty: -1 })).toBeNull();
    expect(parseScoreConfig({ ...DEFAULT_SCORE_CONFIG, hintPenalty: 'a lot' })).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(parseScoreConfig(null)).toBeNull();
    expect(parseScoreConfig('config')).toBeNull();
  });
});
