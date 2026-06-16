/**
 * Tests for progression localStorage persistence.
 * Run: npx vitest src/game/progressionStorage.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCompletedProblemIds, markProblemCompleted } from './progressionStorage';

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  } as unknown as Storage;
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
});

describe('getCompletedProblemIds', () => {
  it('returns an empty set when nothing has been stored', () => {
    expect(getCompletedProblemIds()).toEqual(new Set());
  });

  it('returns an empty set for corrupted JSON', () => {
    localStorage.setItem('stem_game_completed_problems', '{not json');
    expect(getCompletedProblemIds()).toEqual(new Set());
  });

  it('returns an empty set for a non-array value', () => {
    localStorage.setItem('stem_game_completed_problems', JSON.stringify({ foo: 'bar' }));
    expect(getCompletedProblemIds()).toEqual(new Set());
  });
});

describe('markProblemCompleted', () => {
  it('persists a completed problem id', () => {
    markProblemCompleted('p-1');
    expect(getCompletedProblemIds()).toEqual(new Set(['p-1']));
  });

  it('accumulates multiple completed problem ids', () => {
    markProblemCompleted('p-1');
    markProblemCompleted('p-2');
    expect(getCompletedProblemIds()).toEqual(new Set(['p-1', 'p-2']));
  });

  it('does not duplicate an already-completed problem id', () => {
    markProblemCompleted('p-1');
    markProblemCompleted('p-1');
    expect(getCompletedProblemIds()).toEqual(new Set(['p-1']));
  });
});
