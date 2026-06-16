/**
 * Unit tests for the pure game engine.
 * Run: npx vitest src/game/engine.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  initGameState,
  evaluateFormula,
  getActivatableFormulas,
  activateFormula,
  describeActivation,
  isWon,
  isStuck,
  computeScore,
  validateSolvability,
  findUnlockingHypotheses,
  computeOptimalPath,
  computeOptimalSteps,
} from './engine';
import type { Problem } from './types';

// ── Fixture: kinematics problem (GDD example) ──────────────────────────────
// Variables: d, v, t, a, F, m
// Formulas:  f1: d=v*t (d,v,t), f2: F=m*a (F,m,a), f3: a=v/t (a,v,t)
// H = {d, v}   C = {F}
// Chain: f1 → t → f3 → a → f2 → F
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

// ── Tests ──────────────────────────────────────────────────────────────────

describe('initGameState', () => {
  it('seeds identifiedVars from hypotheses', () => {
    const state = initGameState(KINEMATICS);
    expect(state.identifiedVars.has('d')).toBe(true);
    expect(state.identifiedVars.has('v')).toBe(true);
    expect(state.identifiedVars.has('m')).toBe(true);
    expect(state.identifiedVars.has('t')).toBe(false);
  });

  it('starts with 0 steps and phase=scan', () => {
    const state = initGameState(KINEMATICS);
    expect(state.steps).toBe(0);
    expect(state.phase).toBe('scan');
  });
});

describe('evaluateFormula — activation rule |V_f \\ I| = 1', () => {
  it('marks f1 as activatable when d and v are known', () => {
    const state = initGameState(KINEMATICS);
    const result = evaluateFormula(KINEMATICS.formulas[0]!, state.identifiedVars);
    expect(result.isActivatable).toBe(true);
    expect(result.revealedVarId).toBe('t');
    expect(result.unknownCount).toBe(1);
  });

  it('marks f2 as NOT activatable initially (a is unknown)', () => {
    const state = initGameState(KINEMATICS);
    const result = evaluateFormula(KINEMATICS.formulas[1]!, state.identifiedVars);
    expect(result.isActivatable).toBe(false);
    expect(result.unknownCount).toBe(2); // F and a unknown, m is known via H
  });
});

describe('activateFormula', () => {
  it('identifies the revealed variable', () => {
    const s0 = initGameState(KINEMATICS);
    const s1 = activateFormula(s0, 'f1');
    expect(s1.identifiedVars.has('t')).toBe(true);
    expect(s1.steps).toBe(1);
  });

  it('pushes previous state to history', () => {
    const s0 = initGameState(KINEMATICS);
    const s1 = activateFormula(s0, 'f1');
    expect(s1.history).toHaveLength(1);
    expect(s1.history[0]!.steps).toBe(0);
  });

  it('throws if formula is not activatable', () => {
    const s0 = initGameState(KINEMATICS);
    expect(() => activateFormula(s0, 'f2')).toThrow();
  });

  it('cascades: f1 → t → f3 becomes activatable', () => {
    const s0 = initGameState(KINEMATICS);
    const s1 = activateFormula(s0, 'f1'); // reveals t
    const activatable = getActivatableFormulas(s1).map(e => e.formulaId);
    expect(activatable).toContain('f3');
  });
});

describe('describeActivation', () => {
  it('describes the revealed variable and resulting cascade for f1', () => {
    const s0 = initGameState(KINEMATICS);
    const s1 = activateFormula(s0, 'f1'); // reveals t, unlocks f3
    const ann = describeActivation(s0, s1, 'f1');
    expect(ann.formulaId).toBe('f1');
    expect(ann.revealedVarId).toBe('t');
    expect(ann.cascadeCount).toBe(1); // f3 becomes newly activatable
    expect(ann.phase).toBe('scan');
  });

  it('describes a single-formula cascade for f3', () => {
    let s = initGameState(KINEMATICS);
    s = activateFormula(s, 'f1'); // reveals t
    const before = s;
    s = activateFormula(s, 'f3'); // reveals a, unlocks f2
    const ann = describeActivation(before, s, 'f3');
    expect(ann.revealedVarId).toBe('a');
    expect(ann.cascadeCount).toBe(1); // f2 becomes newly activatable
    expect(ann.phase).toBe('scan');
  });

  it('reports zero cascade and phase=win for the final activation', () => {
    let s = initGameState(KINEMATICS);
    s = activateFormula(s, 'f1'); // reveals t
    s = activateFormula(s, 'f3'); // reveals a
    const before = s;
    s = activateFormula(s, 'f2'); // reveals F ← conclusion, wins
    const ann = describeActivation(before, s, 'f2');
    expect(ann.revealedVarId).toBe('F');
    expect(ann.cascadeCount).toBe(0);
    expect(ann.phase).toBe('win');
  });
});

describe('win condition', () => {
  it('is not won at start', () => {
    const s0 = initGameState(KINEMATICS);
    expect(isWon(s0)).toBe(false);
  });

  it('is won after full chain f1 → f3 → f2', () => {
    let s = initGameState(KINEMATICS);
    s = activateFormula(s, 'f1'); // t
    s = activateFormula(s, 'f3'); // a
    s = activateFormula(s, 'f2'); // F ← conclusion
    expect(isWon(s)).toBe(true);
    expect(s.phase).toBe('win');
  });
});

describe('isStuck', () => {
  it('is not stuck with activatable formulas', () => {
    expect(isStuck(initGameState(KINEMATICS))).toBe(false);
  });
});

describe('computeScore', () => {
  it('returns base + full time bonus for 0 steps and 0 hints at t=0', () => {
    const s = initGameState(KINEMATICS);
    const score = computeScore(s, 0);
    expect(score.base).toBe(1000);
    expect(score.stepPenalty).toBe(0);
    expect(score.hintPenalty).toBe(0);
    expect(score.timeBonus).toBe(200);
    expect(score.total).toBe(1200); // 1000 - 0 - 0 + 200
  });

  it('applies a step penalty of S_STEP per activation', () => {
    const s = { ...initGameState(KINEMATICS), steps: 3, hintsUsed: 0 };
    const score = computeScore(s, 0);
    expect(score.stepPenalty).toBe(60); // 3 * 20
    expect(score.total).toBe(1140); // 1000 - 60 + 200
  });

  it('applies a hint penalty of S_HINT per hint used', () => {
    const s = { ...initGameState(KINEMATICS), steps: 0, hintsUsed: 2 };
    const score = computeScore(s, 0);
    expect(score.hintPenalty).toBe(100); // 2 * 50
    expect(score.total).toBe(1100); // 1000 - 100 + 200
  });

  it('reduces the time bonus as elapsed time increases', () => {
    const s = initGameState(KINEMATICS);
    const score = computeScore(s, 50);
    expect(score.timeBonus).toBe(100); // 200 - 50*2
    expect(score.total).toBe(1100); // 1000 - 0 - 0 + 100
  });

  it('floors the time bonus at 0 once elapsed time exceeds the bonus window', () => {
    const s = initGameState(KINEMATICS);
    const score = computeScore(s, 200);
    expect(score.timeBonus).toBe(0);
    expect(score.total).toBe(1000);
  });

  it('floors the total score at 0 when penalties exceed base + time bonus', () => {
    const s = { ...initGameState(KINEMATICS), steps: 100, hintsUsed: 10 };
    const score = computeScore(s, 200);
    // 1000 - 2000 - 500 + 0 = -1500 → floored at 0
    expect(score.total).toBe(0);
  });

  it('rounds the total score to the nearest integer', () => {
    const s = initGameState(KINEMATICS);
    const score = computeScore(s, 1.25);
    expect(score.timeBonus).toBe(197.5); // 200 - 1.25*2
    expect(score.total).toBe(1198); // round(1197.5)
  });

  it('respects a custom ScoreConfig', () => {
    const s = { ...initGameState(KINEMATICS), steps: 2, hintsUsed: 1 };
    const customConfig = {
      maxScore: 500,
      stepPenalty: 10,
      hintPenalty: 25,
      timeBonusBase: 50,
      timeBonusRate: 1,
    };
    const score = computeScore(s, 10, customConfig);
    expect(score.base).toBe(500);
    expect(score.stepPenalty).toBe(20); // 2 * 10
    expect(score.hintPenalty).toBe(25); // 1 * 25
    expect(score.timeBonus).toBe(40);   // 50 - 10*1
    expect(score.total).toBe(495);      // 500 - 20 - 25 + 40
  });
});

describe('validateSolvability', () => {
  it('returns true for the kinematics problem', () => {
    expect(validateSolvability(KINEMATICS)).toBe(true);
  });

  it('returns false for an unsolvable problem', () => {
    const unsolvable: Problem = {
      ...KINEMATICS,
      hypotheses: ['d'], // v is unknown — f1 has 2 unknowns, chain breaks
    };
    expect(validateSolvability(unsolvable)).toBe(false);
  });
});

describe('findUnlockingHypotheses', () => {
  it('finds the single additional hypothesis that unlocks the chain', () => {
    // H = {d, v} — missing 'm', so f2 (F = m*a) can never activate
    const missingMass: Problem = { ...KINEMATICS, hypotheses: ['d', 'v'] };
    expect(validateSolvability(missingMass)).toBe(false);
    expect(findUnlockingHypotheses(missingMass)).toEqual(['m']);
  });

  it('excludes conclusion variables from candidates', () => {
    const missingMass: Problem = { ...KINEMATICS, hypotheses: ['d', 'v'] };
    expect(findUnlockingHypotheses(missingMass)).not.toContain('F');
  });

  it('returns an empty array when no single hypothesis unlocks the chain', () => {
    // H = {d} — two variables (v, m) are missing, no single addition suffices
    const unsolvable: Problem = { ...KINEMATICS, hypotheses: ['d'] };
    expect(findUnlockingHypotheses(unsolvable)).toEqual([]);
  });

  it('returns an empty array when the problem is already solvable', () => {
    expect(findUnlockingHypotheses(KINEMATICS)).toEqual([]);
  });
});

describe('computeOptimalPath', () => {
  it('returns the greedy activation order for the kinematics problem', () => {
    // H = {d, v, m} → f1 reveals t → f3 reveals a → f2 reveals F
    expect(computeOptimalPath(KINEMATICS)).toEqual(['f1', 'f3', 'f2']);
  });

  it('returns an empty path when the conclusions are already known', () => {
    const trivial: Problem = { ...KINEMATICS, hypotheses: ['d', 'v', 'm', 'F'] };
    expect(computeOptimalPath(trivial)).toEqual([]);
  });

  it('returns a partial path when the problem is unsolvable', () => {
    const unsolvable: Problem = { ...KINEMATICS, hypotheses: ['d'] };
    expect(computeOptimalPath(unsolvable)).toEqual([]);
  });
});

describe('computeOptimalSteps', () => {
  it('returns the length of the optimal path', () => {
    expect(computeOptimalSteps(KINEMATICS)).toBe(3);
  });
});
