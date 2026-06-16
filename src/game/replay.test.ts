/**
 * Tests for deduction replay step reconstruction.
 * Run: npx vitest src/game/replay.test.ts
 */

import { describe, it, expect } from 'vitest';
import { buildReplaySteps } from './replay';
import type { Problem } from './types';

// Variables: d, v, t, a, F, m
// Formulas:  f1: d=v*t (d,v,t), f2: F=m*a (F,m,a), f3: a=v/t (a,v,t)
// H = {d, v, m}   C = {F}
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

describe('buildReplaySteps', () => {
  it('starts at step 0 with only the hypotheses identified', () => {
    const steps = buildReplaySteps(KINEMATICS, ['f1', 'f3', 'f2']);

    expect(steps[0]!.state.identifiedVars).toEqual(new Set(['d', 'v', 'm']));
    expect(steps[0]!.activatedFormulaId).toBeNull();
    expect(steps[0]!.revealedVarId).toBeNull();
  });

  it('produces one step per activation, in order', () => {
    const steps = buildReplaySteps(KINEMATICS, ['f1', 'f3', 'f2']);

    expect(steps).toHaveLength(4); // initial + 3 activations
    expect(steps.map(s => s.activatedFormulaId)).toEqual([null, 'f1', 'f3', 'f2']);
  });

  it('reveals the correct variable at each step', () => {
    const steps = buildReplaySteps(KINEMATICS, ['f1', 'f3', 'f2']);

    expect(steps[1]!.revealedVarId).toBe('t');
    expect(steps[2]!.revealedVarId).toBe('a');
    expect(steps[3]!.revealedVarId).toBe('F');
  });

  it('accumulates identifiedVars and activatedFormulas across steps', () => {
    const steps = buildReplaySteps(KINEMATICS, ['f1', 'f3', 'f2']);

    expect(steps[3]!.state.identifiedVars).toEqual(new Set(['d', 'v', 'm', 't', 'a', 'F']));
    expect(steps[3]!.state.activatedFormulas).toEqual(new Set(['f1', 'f3', 'f2']));
  });

  it('reaches phase "win" on the final step once C ⊆ identifiedVars', () => {
    const steps = buildReplaySteps(KINEMATICS, ['f1', 'f3', 'f2']);

    expect(steps[3]!.state.phase).toBe('win');
  });

  it('returns just the initial step for an empty activation path', () => {
    const steps = buildReplaySteps(KINEMATICS, []);

    expect(steps).toHaveLength(1);
    expect(steps[0]!.state.identifiedVars).toEqual(new Set(KINEMATICS.hypotheses));
  });
});
