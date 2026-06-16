/**
 * Unit tests for runtime validation of incoming problem definitions.
 * Run: npx vitest src/server/validateProblem.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseProblemInput } from './validateProblem';

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
    {
      id: 'f1',
      expression: 'd = v · t',
      variableIds: ['d', 'v', 't'],
      conceptName: 'Uniform motion',
    },
  ],
  hypotheses: ['d', 'v'],
  conclusions: ['t'],
};

describe('parseProblemInput', () => {
  it('accepts a well-formed problem definition', () => {
    expect(parseProblemInput(VALID_PROBLEM)).toEqual(VALID_PROBLEM);
  });

  it('rejects non-objects', () => {
    expect(parseProblemInput(null)).toBeNull();
    expect(parseProblemInput('p-kinematics-01')).toBeNull();
    expect(parseProblemInput(42)).toBeNull();
  });

  it('rejects a missing required field', () => {
    const { title_fr: _title_fr, ...rest } = VALID_PROBLEM;
    expect(parseProblemInput(rest)).toBeNull();
  });

  it('rejects an enum field outside its allowed values', () => {
    expect(parseProblemInput({ ...VALID_PROBLEM, domain: 'history' })).toBeNull();
    expect(parseProblemInput({ ...VALID_PROBLEM, difficulty: 'impossible' })).toBeNull();
  });

  it('rejects a malformed variable', () => {
    expect(parseProblemInput({ ...VALID_PROBLEM, variables: [{ id: 'd' }] })).toBeNull();
    expect(parseProblemInput({ ...VALID_PROBLEM, variables: [{ ...VALID_PROBLEM.variables[0], domain: 'history' }] })).toBeNull();
  });

  it('rejects a malformed formula', () => {
    expect(parseProblemInput({ ...VALID_PROBLEM, formulas: [{ id: 'f1', expression: 'd = v · t', variableIds: ['d', 1] }] })).toBeNull();
    expect(parseProblemInput({ ...VALID_PROBLEM, formulas: [{ id: 'f1', variableIds: ['d', 'v', 't'] }] })).toBeNull();
  });

  it('rejects a string array field containing non-strings', () => {
    expect(parseProblemInput({ ...VALID_PROBLEM, hypotheses: ['d', 1] })).toBeNull();
    expect(parseProblemInput({ ...VALID_PROBLEM, conclusions: 'not-an-array' })).toBeNull();
  });
});
