/**
 * Tests for problem progression unlock rules.
 * Run: npx vitest src/game/progression.test.ts
 */

import { describe, it, expect } from 'vitest';
import { computeUnlockedIds, isUnlocked } from './progression';

const ORDER = ['p-1', 'p-2', 'p-3', 'p-4'];

describe('computeUnlockedIds', () => {
  it('unlocks only the first problem when nothing is completed', () => {
    expect(computeUnlockedIds(ORDER, new Set())).toEqual(new Set(['p-1']));
  });

  it('unlocks the next problem once the previous one is completed', () => {
    expect(computeUnlockedIds(ORDER, new Set(['p-1']))).toEqual(new Set(['p-1', 'p-2']));
  });

  it('unlocks every problem up to the first uncompleted one', () => {
    expect(computeUnlockedIds(ORDER, new Set(['p-1', 'p-2']))).toEqual(new Set(['p-1', 'p-2', 'p-3']));
  });

  it('unlocks the whole catalog once all but the last are completed', () => {
    expect(computeUnlockedIds(ORDER, new Set(['p-1', 'p-2', 'p-3']))).toEqual(new Set(ORDER));
  });

  it('does not skip ahead when a later problem is completed out of order', () => {
    expect(computeUnlockedIds(ORDER, new Set(['p-3']))).toEqual(new Set(['p-1']));
  });

  it('returns an empty set for an empty catalog', () => {
    expect(computeUnlockedIds([], new Set())).toEqual(new Set());
  });
});

describe('isUnlocked', () => {
  it('reports true for the first problem regardless of completion', () => {
    expect(isUnlocked('p-1', ORDER, new Set())).toBe(true);
  });

  it('reports false for a problem whose predecessor is not completed', () => {
    expect(isUnlocked('p-2', ORDER, new Set())).toBe(false);
  });

  it('reports true once the predecessor is completed', () => {
    expect(isUnlocked('p-2', ORDER, new Set(['p-1']))).toBe(true);
  });
});
