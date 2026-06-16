/**
 * Tests for achievements localStorage persistence.
 * Run: npx vitest src/game/achievementsStorage.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getUnlockedBadges, markParAchieved, markLightningSpeed, markDomainMastered } from './achievementsStorage';

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

describe('getUnlockedBadges', () => {
  it('returns empty sets when nothing has been stored', () => {
    expect(getUnlockedBadges()).toEqual({
      domainMastered: new Set(),
      parAchieved: new Set(),
      lightningSpeed: new Set(),
    });
  });

  it('returns empty sets for corrupted JSON', () => {
    localStorage.setItem('stem_game_badges', '{not json');
    expect(getUnlockedBadges()).toEqual({
      domainMastered: new Set(),
      parAchieved: new Set(),
      lightningSpeed: new Set(),
    });
  });
});

describe('markParAchieved', () => {
  it('persists a par-achieved badge for a problem', () => {
    markParAchieved('p-1');
    expect(getUnlockedBadges().parAchieved).toEqual(new Set(['p-1']));
  });

  it('does not duplicate an already-unlocked badge', () => {
    markParAchieved('p-1');
    markParAchieved('p-1');
    expect(getUnlockedBadges().parAchieved).toEqual(new Set(['p-1']));
  });
});

describe('markLightningSpeed', () => {
  it('persists a lightning-speed badge for a problem', () => {
    markLightningSpeed('p-1');
    expect(getUnlockedBadges().lightningSpeed).toEqual(new Set(['p-1']));
  });
});

describe('markDomainMastered', () => {
  it('persists a domain-mastered badge', () => {
    markDomainMastered('physics');
    expect(getUnlockedBadges().domainMastered).toEqual(new Set(['physics']));
  });

  it('keeps badge categories independent', () => {
    markParAchieved('p-1');
    markLightningSpeed('p-2');
    markDomainMastered('chemistry');

    expect(getUnlockedBadges()).toEqual({
      domainMastered: new Set(['chemistry']),
      parAchieved: new Set(['p-1']),
      lightningSpeed: new Set(['p-2']),
    });
  });
});
