/**
 * Integration tests for the Zustand game store (src/game/store.ts).
 * Run: npx vitest src/game/store.test.ts
 *
 * The store reads/writes localStorage when it's first created (userId,
 * tutorial flag), which doesn't exist in the default Node test environment.
 * A minimal in-memory polyfill is installed before the store module is
 * (dynamically) imported.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { isWon, validateSolvability } from './engine';
import { getCompletedProblemIds } from './progressionStorage';
import { getUnlockedBadges } from './achievementsStorage';
import type { Problem } from './types';

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

let useGameStore: typeof import('./store').useGameStore;

beforeAll(async () => {
  globalThis.localStorage = createMemoryStorage();
  // emitEvent() warns when no EventQueue has been initialised — silence it.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  ({ useGameStore } = await import('./store'));
});

// ── Fixture: kinematics problem (GDD example) ──────────────────────────────
// Variables: d, v, t, a, F, m
// Formulas:  f1: d=v*t (d,v,t), f2: F=m*a (F,m,a), f3: a=v/t (a,v,t)
// H = {d, v, m}   C = {F}
// Chain: f1 → t → f3 → a → f2 → F  (all 3 formulas activated)
const KINEMATICS: Problem = {
  id: 'p-kinematics-01',
  domain: 'physics',
  difficulty: 'intermediate',
  title: 'Kinematics Chain',
  title_fr: 'Chaîne Cinématique',
  variables: [
    { id: 'd', label: 'distance', label_fr: 'distance', unit: 'm', domain: 'physics' },
    { id: 'v', label: 'velocity', label_fr: 'vitesse', unit: 'm/s', domain: 'physics' },
    { id: 't', label: 'time', label_fr: 'temps', unit: 's', domain: 'physics' },
    { id: 'a', label: 'acceleration', label_fr: 'accélération', unit: 'm/s²', domain: 'physics' },
    { id: 'F', label: 'force', label_fr: 'force', unit: 'N', domain: 'physics' },
    { id: 'm', label: 'mass', label_fr: 'masse', unit: 'kg', domain: 'physics' },
  ],
  formulas: [
    { id: 'f1', expression: 'd = v * t', variableIds: ['d', 'v', 't'] },
    { id: 'f2', expression: 'F = m * a', variableIds: ['F', 'm', 'a'] },
    { id: 'f3', expression: 'a = v / t', variableIds: ['a', 'v', 't'] },
  ],
  hypotheses: ['d', 'v', 'm'],
  conclusions: ['F'],
  optimalSteps: 3,
  solvable: true,
};

/** Repeatedly activate the first activatable formula until none remain. */
function activateAllFormulas(): void {
  for (;;) {
    const activatable = useGameStore.getState().getActivatable();
    const next = activatable[0];
    if (!next) return;
    useGameStore.getState().activate(next.formulaId);
  }
}

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('useGameStore — full playthrough', () => {
  it('initialises from hypotheses with phase "scan" on loadProblem', () => {
    useGameStore.getState().loadProblem(KINEMATICS);

    const { gameState, summary } = useGameStore.getState();
    expect(gameState).not.toBeNull();
    expect(gameState!.phase).toBe('scan');
    expect(gameState!.identifiedVars).toEqual(new Set(['d', 'v', 'm']));
    expect(gameState!.activatedFormulas.size).toBe(0);
    expect(gameState!.steps).toBe(0);
    expect(summary).toBeNull();
  });

  it('reaches phase "win" once every formula has been activated', () => {
    useGameStore.getState().loadProblem(KINEMATICS);

    activateAllFormulas();

    const { gameState } = useGameStore.getState();
    expect(gameState!.phase).toBe('win');
    expect(gameState!.activatedFormulas.size).toBe(KINEMATICS.formulas.length);
    expect(gameState!.steps).toBe(KINEMATICS.formulas.length);

    // C ⊆ identifiedVars (win condition, GDD §3)
    for (const conclusion of KINEMATICS.conclusions) {
      expect(gameState!.identifiedVars.has(conclusion)).toBe(true);
    }

    // All variables end up identified for this fully-connected theory.
    expect(gameState!.identifiedVars.size).toBe(KINEMATICS.variables.length);
  });

  it('builds a winning session summary once the cascade completes', () => {
    useGameStore.getState().loadProblem(KINEMATICS);

    activateAllFormulas();

    const { summary } = useGameStore.getState();
    expect(summary).not.toBeNull();
    expect(summary!.outcome).toBe('win');
    expect(summary!.totalSteps).toBe(KINEMATICS.formulas.length);
    expect(summary!.activationPath).toHaveLength(KINEMATICS.formulas.length);
    expect(summary!.hintsUsed).toBe(0);
  });
});

describe('useGameStore — edge cases', () => {
  it('ends an unsolvable problem with phase "stuck" and a "stuck" summary', () => {
    // P is never involved in any formula, so it can never be identified —
    // the conclusion C = {P} is unreachable from H (GDD §9.3).
    const UNSOLVABLE: Problem = {
      ...KINEMATICS,
      id: 'p-unsolvable-01',
      variables: [
        ...KINEMATICS.variables,
        { id: 'P', label: 'power', label_fr: 'puissance', unit: 'W', domain: 'physics' },
      ],
      conclusions: ['P'],
    };
    expect(validateSolvability(UNSOLVABLE)).toBe(false);

    useGameStore.getState().loadProblem(UNSOLVABLE);
    activateAllFormulas();

    const { gameState, summary } = useGameStore.getState();
    expect(gameState!.phase).toBe('stuck');
    expect(gameState!.identifiedVars.has('P')).toBe(false);
    expect(summary).not.toBeNull();
    expect(summary!.outcome).toBe('stuck');
  });

  it('undo after a win reverts to phase "scan" and un-identifies the revealed conclusion', () => {
    useGameStore.getState().loadProblem(KINEMATICS);
    activateAllFormulas();
    expect(useGameStore.getState().gameState!.phase).toBe('win');

    useGameStore.getState().undo();

    const { gameState } = useGameStore.getState();
    expect(gameState!.phase).toBe('scan');
    expect(gameState!.activatedFormulas.size).toBe(KINEMATICS.formulas.length - 1);
    expect(gameState!.steps).toBe(KINEMATICS.formulas.length - 1);
    // F (the conclusion) was revealed by the activation that just got undone.
    expect(gameState!.identifiedVars.has('F')).toBe(false);
    expect(isWon(gameState!)).toBe(false);
  });

  it('a tier-3 hint on the last activatable formula auto-completes the win', () => {
    useGameStore.getState().loadProblem(KINEMATICS);
    useGameStore.getState().activate('f1'); // reveals t
    useGameStore.getState().activate('f3'); // reveals a — only f2 (reveals F) remains activatable

    useGameStore.getState().requestHint(3);

    const { gameState, lastHint, summary } = useGameStore.getState();
    expect(lastHint).toEqual({ tier: 3, formulaId: 'f2', variableId: 'F', scoreCost: 120 });

    expect(gameState!.phase).toBe('win');
    expect(gameState!.hintsUsed).toBe(1);
    expect(gameState!.activatedFormulas.has('f2')).toBe(true);
    expect(gameState!.identifiedVars.has('F')).toBe(true);

    // Reaching "win" auto-ends the session, even though the last step was a hint.
    expect(summary).not.toBeNull();
    expect(summary!.outcome).toBe('win');
    expect(summary!.hintsUsed).toBe(1);
    expect(summary!.score.hintPenalty).toBe(50); // S_HINT (GDD §6.2) — flat per hint, regardless of tier
  });
});

describe('useGameStore — progression', () => {
  it('marks the problem as completed in localStorage on win', () => {
    const PROBLEM: Problem = { ...KINEMATICS, id: 'p-kinematics-progression-01' };
    expect(getCompletedProblemIds().has(PROBLEM.id)).toBe(false);

    useGameStore.getState().loadProblem(PROBLEM);
    activateAllFormulas();

    expect(getCompletedProblemIds().has(PROBLEM.id)).toBe(true);
  });

  it('does not mark the problem as completed when stuck', () => {
    const UNSOLVABLE: Problem = {
      ...KINEMATICS,
      id: 'p-unsolvable-02',
      variables: [
        ...KINEMATICS.variables,
        { id: 'P', label: 'power', label_fr: 'puissance', unit: 'W', domain: 'physics' },
      ],
      conclusions: ['P'],
    };

    useGameStore.getState().loadProblem(UNSOLVABLE);
    activateAllFormulas();

    expect(getCompletedProblemIds().has(UNSOLVABLE.id)).toBe(false);
  });
});

describe('useGameStore — badges', () => {
  it('unlocks parAchieved and lightningSpeed badges on an optimal, fast win', () => {
    const PROBLEM: Problem = { ...KINEMATICS, id: 'p-kinematics-badges-01' };

    useGameStore.getState().loadProblem(PROBLEM);
    activateAllFormulas();

    const badges = getUnlockedBadges();
    expect(badges.parAchieved.has(PROBLEM.id)).toBe(true);
    expect(badges.lightningSpeed.has(PROBLEM.id)).toBe(true);
  });

  it('does not unlock the parAchieved badge when the win exceeds the optimal step count', () => {
    const PROBLEM: Problem = { ...KINEMATICS, id: 'p-kinematics-badges-02', optimalSteps: 1 };

    useGameStore.getState().loadProblem(PROBLEM);
    activateAllFormulas();

    expect(useGameStore.getState().summary!.outcome).toBe('win');
    expect(getUnlockedBadges().parAchieved.has(PROBLEM.id)).toBe(false);
  });

  it('does not unlock any badge when the problem ends "stuck"', () => {
    const UNSOLVABLE: Problem = {
      ...KINEMATICS,
      id: 'p-unsolvable-badges-01',
      variables: [
        ...KINEMATICS.variables,
        { id: 'P', label: 'power', label_fr: 'puissance', unit: 'W', domain: 'physics' },
      ],
      conclusions: ['P'],
    };

    useGameStore.getState().loadProblem(UNSOLVABLE);
    activateAllFormulas();

    const badges = getUnlockedBadges();
    expect(badges.parAchieved.has(UNSOLVABLE.id)).toBe(false);
    expect(badges.lightningSpeed.has(UNSOLVABLE.id)).toBe(false);
  });
});
