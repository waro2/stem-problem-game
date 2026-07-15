/**
 * Tests for the Problem JSON schema.
 * Run: npx vitest src/game/problemSchema.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseProblem, ProblemValidationError } from './problemSchema';

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
  isTrap: false,
};

describe('parseProblem', () => {
  it('accepts a valid problem definition', () => {
    expect(parseProblem(VALID_PROBLEM)).toEqual(VALID_PROBLEM);
  });

  it('accepts variables without an optional unit', () => {
    const problem = {
      ...VALID_PROBLEM,
      variables: VALID_PROBLEM.variables.map(({ unit: _unit, ...rest }) => rest),
    };
    expect(parseProblem(problem)).toEqual(problem);
  });

  it('rejects a missing required field', () => {
    const { title: _title, ...incomplete } = VALID_PROBLEM;
    expect(() => parseProblem(incomplete)).toThrow(ProblemValidationError);
  });

  it('rejects an invalid domain enum value', () => {
    const invalid = { ...VALID_PROBLEM, domain: 'astrology' };
    expect(() => parseProblem(invalid)).toThrow(ProblemValidationError);
  });

  it('rejects an invalid difficulty enum value', () => {
    const invalid = { ...VALID_PROBLEM, difficulty: 'impossible' };
    expect(() => parseProblem(invalid)).toThrow(ProblemValidationError);
  });

  it('rejects solvable: false', () => {
    const invalid = { ...VALID_PROBLEM, solvable: false };
    expect(() => parseProblem(invalid)).toThrow(ProblemValidationError);
  });

  it('rejects a formula with a non-string variableIds entry', () => {
    const invalid = {
      ...VALID_PROBLEM,
      formulas: [{ id: 'f1', expression: 'd = v · t', variableIds: ['d', 'v', 42] }],
    };
    expect(() => parseProblem(invalid)).toThrow(ProblemValidationError);
  });

  it('rejects a non-object value', () => {
    expect(() => parseProblem(null)).toThrow(ProblemValidationError);
    expect(() => parseProblem('not a problem')).toThrow(ProblemValidationError);
  });

  it('includes the field path in the error message', () => {
    const invalid = { ...VALID_PROBLEM, domain: 'astrology' };
    try {
      parseProblem(invalid);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemValidationError);
      expect((err as ProblemValidationError).message).toContain('domain');
    }
  });
});
