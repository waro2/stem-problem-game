/**
 * Tests for the problem loader (src/game/problemLoader.ts).
 * Run: npx vitest src/game/problemLoader.test.ts
 *
 * Like store.test.ts, this needs a localStorage polyfill before the store
 * module (and therefore problemLoader, which imports it) is loaded.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { ProblemValidationError } from './problemSchema';

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

const VALID_PROBLEM = {
  id: 'p-kinematics-01',
  domain: 'physics',
  difficulty: 'intermediate',
  title: 'Kinematics Chain',
  title_fr: 'Chaîne Cinématique',
  variables: [
    { id: 'd', label: 'distance', label_fr: 'distance', unit: 'm', domain: 'physics' },
    { id: 'v', label: 'velocity', label_fr: 'vitesse', unit: 'm/s', domain: 'physics' },
    { id: 't', label: 'time', label_fr: 'temps', unit: 's', domain: 'physics' },
  ],
  formulas: [
    { id: 'f1', expression: 'd = v · t', variableIds: ['d', 'v', 't'] },
  ],
  hypotheses: ['d', 'v'],
  conclusions: ['t'],
  optimalSteps: 1,
  solvable: true,
};

let useGameStore: typeof import('./store').useGameStore;
let loadProblemFromUrl: typeof import('./problemLoader').loadProblemFromUrl;

function mockFetchJson(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  }));
}

beforeAll(async () => {
  globalThis.localStorage = createMemoryStorage();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  ({ useGameStore } = await import('./store'));
  ({ loadProblemFromUrl } = await import('./problemLoader'));
});

beforeEach(() => {
  useGameStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadProblemFromUrl', () => {
  it('fetches, validates, and injects a valid problem into the store', async () => {
    mockFetchJson(VALID_PROBLEM);

    const problem = await loadProblemFromUrl('/problems/physics-kinematics-01.json');

    expect(problem).toEqual(VALID_PROBLEM);
    expect(useGameStore.getState().gameState?.problem).toEqual(VALID_PROBLEM);
    expect(useGameStore.getState().gameState?.phase).toBe('scan');
  });

  it('throws and does not touch the store when the response is not ok', async () => {
    mockFetchJson(null, false, 404);

    await expect(loadProblemFromUrl('/problems/missing.json')).rejects.toThrow('404');
    expect(useGameStore.getState().gameState).toBeNull();
  });

  it('throws ProblemValidationError and does not touch the store for malformed JSON', async () => {
    const { title: _title, ...incomplete } = VALID_PROBLEM;
    mockFetchJson(incomplete);

    await expect(loadProblemFromUrl('/problems/broken.json')).rejects.toThrow(ProblemValidationError);
    expect(useGameStore.getState().gameState).toBeNull();
  });
});
