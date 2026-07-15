/**
 * Tests for the Problem Library per-user progress summary.
 * Run: npx vitest src/server/libraryStats.test.ts
 */

import { describe, it, expect } from 'vitest';
import { computeProblemSummaries, type ProblemRow, type UserSessionRow } from './libraryStats';

const PROBLEMS: ProblemRow[] = [
  { id: 'p-kinematics-01', domain: 'physics', difficulty: 'intermediate', titleEn: 'Kinematics Chain', titleFr: 'Chaîne Cinématique', isTrap: false },
  { id: 'p-stoich-01', domain: 'chemistry', difficulty: 'beginner', titleEn: 'Stoichiometry Basics', titleFr: 'Bases de Stoechiométrie', isTrap: false },
];

describe('computeProblemSummaries', () => {
  it('marks a problem completed and reports the most recent score', () => {
    const sessions: UserSessionRow[] = [
      { problemId: 'p-kinematics-01', outcome: 'stuck', finalScore: 200, startedAt: new Date('2026-06-01T10:00:00Z') },
      { problemId: 'p-kinematics-01', outcome: 'win', finalScore: 900, startedAt: new Date('2026-06-03T10:00:00Z') },
    ];

    const [kinematics] = computeProblemSummaries(PROBLEMS, sessions);
    expect(kinematics).toEqual({
      id: 'p-kinematics-01',
      domain: 'physics',
      difficulty: 'intermediate',
      title: 'Kinematics Chain',
      title_fr: 'Chaîne Cinématique',
      completed: true,
      previousScore: 900,
      isTrap: false,
    });
  });

  it('reports completed=false and previousScore=null for an untouched problem', () => {
    const [, stoich] = computeProblemSummaries(PROBLEMS, []);
    expect(stoich).toEqual({
      id: 'p-stoich-01',
      domain: 'chemistry',
      difficulty: 'beginner',
      title: 'Stoichiometry Basics',
      title_fr: 'Bases de Stoechiométrie',
      completed: false,
      previousScore: null,
      isTrap: false,
    });
  });

  it('does not mark a problem completed if every session ended "stuck"', () => {
    const sessions: UserSessionRow[] = [
      { problemId: 'p-stoich-01', outcome: 'stuck', finalScore: 150, startedAt: new Date('2026-06-01T10:00:00Z') },
      { problemId: 'p-stoich-01', outcome: 'stuck', finalScore: 300, startedAt: new Date('2026-06-02T10:00:00Z') },
    ];

    const [, stoich] = computeProblemSummaries(PROBLEMS, sessions);
    expect(stoich?.completed).toBe(false);
    expect(stoich?.previousScore).toBe(300);
  });

  it('returns an empty array for no problems', () => {
    expect(computeProblemSummaries([], [])).toEqual([]);
  });
});
