/**
 * Tests for adaptive problem selection.
 * Run: npx vitest src/game/recommendation.test.ts
 */

import { describe, it, expect } from 'vitest';
import { getWeakestDomain, recommendNextProblem } from './recommendation';
import type { DomainStat } from './recommendation';
import type { ProblemSummary } from '../api/library';

describe('getWeakestDomain', () => {
  it('picks the domain with the lowest avgScore', () => {
    const stats: DomainStat[] = [
      { domain: 'physics', avgScore: 800, completionRate: 1, problemsAttempted: 4 },
      { domain: 'chemistry', avgScore: 400, completionRate: 0.5, problemsAttempted: 2 },
      { domain: 'mathematics', avgScore: 900, completionRate: 1, problemsAttempted: 3 },
      { domain: 'biology', avgScore: 700, completionRate: 1, problemsAttempted: 1 },
      { domain: 'engineering', avgScore: 750, completionRate: 1, problemsAttempted: 1 },
    ];

    expect(getWeakestDomain(stats)).toBe('chemistry');
  });

  it('treats a never-attempted domain as weaker than any attempted domain', () => {
    const stats: DomainStat[] = [
      { domain: 'physics', avgScore: 100, completionRate: 0.1, problemsAttempted: 5 },
      { domain: 'chemistry', avgScore: 950, completionRate: 1, problemsAttempted: 3 },
      // mathematics, biology, engineering: no stats at all
    ];

    expect(getWeakestDomain(stats)).toBe('mathematics');
  });

  it('falls back to the first domain when the student has no stats at all', () => {
    expect(getWeakestDomain([])).toBe('physics');
  });
});

describe('recommendNextProblem', () => {
  const PROBLEMS: ProblemSummary[] = [
    { id: 'p-chem-01', domain: 'chemistry', difficulty: 'beginner', title: 'A', title_fr: 'A', completed: true, previousScore: 1000, isTrap: false },
    { id: 'p-chem-02', domain: 'chemistry', difficulty: 'intermediate', title: 'B', title_fr: 'B', completed: false, previousScore: null, isTrap: false },
    { id: 'p-chem-03', domain: 'chemistry', difficulty: 'advanced', title: 'C', title_fr: 'C', completed: false, previousScore: null, isTrap: false },
    { id: 'p-phys-01', domain: 'physics', difficulty: 'beginner', title: 'D', title_fr: 'D', completed: false, previousScore: null, isTrap: false },
  ];

  it('recommends the first not-yet-completed problem in the target domain', () => {
    expect(recommendNextProblem('chemistry', PROBLEMS)?.id).toBe('p-chem-02');
  });

  it('returns null when every problem in the domain is already completed', () => {
    const allDone = PROBLEMS.map(p => ({ ...p, completed: true }));
    expect(recommendNextProblem('chemistry', allDone)).toBeNull();
  });

  it('returns null when the domain has no problems at all', () => {
    expect(recommendNextProblem('biology', PROBLEMS)).toBeNull();
  });
});
