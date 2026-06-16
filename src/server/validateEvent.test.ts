/**
 * Unit tests for runtime validation of incoming analytics events.
 * Run: npx vitest src/server/validateEvent.test.ts
 */

import { describe, it, expect } from 'vitest';
import { isGameEvent, parseEventBatch } from './validateEvent';
import { Events } from '../api/events';

const SESSION_START = Events.sessionStart('user-1', 'p-kinematics-01', {
  difficulty: 'intermediate',
  domain: 'physics',
  platform: 'web',
  hypothesisCount: 3,
  conclusionCount: 1,
  variableCount: 6,
  formulaCount: 3,
});

const FORMULA_ACTIVATED = Events.formulaActivated('user-1', 'p-kinematics-01', {
  formulaId: 'f1',
  stepNumber: 1,
  varsBefore: ['d', 'v', 'm'],
  varRevealed: 't',
  timeSinceLast: 4.2,
  activatableCount: 1,
});

const HINT_USED = Events.hintUsed('user-1', 'p-kinematics-01', {
  hintTier: 2,
  stepNumber: 0,
  activatableCount: 1,
  currentVars: ['d', 'v', 'm'],
});

const PROBLEM_COMPLETED = Events.problemCompleted('user-1', 'p-kinematics-01', {
  outcome: 'win',
  totalSteps: 3,
  optimalSteps: 3,
  timeElapsedSeconds: 42.5,
  hintsUsed: 0,
  finalScore: 1115,
  stepEfficiencyRatio: 1,
  activationPath: ['f1', 'f3', 'f2'],
});

const SESSION_END = Events.sessionEnd('user-1', 'p-kinematics-01', {
  problemsAttempted: 1,
  problemsCompleted: 1,
  totalTimeSeconds: 42.5,
});

describe('isGameEvent', () => {
  it.each([
    ['session_start', SESSION_START],
    ['formula_activated', FORMULA_ACTIVATED],
    ['hint_used', HINT_USED],
    ['problem_completed', PROBLEM_COMPLETED],
    ['session_end', SESSION_END],
  ])('accepts a well-formed %s event', (_label, event) => {
    expect(isGameEvent(event)).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isGameEvent(null)).toBe(false);
    expect(isGameEvent('session_start')).toBe(false);
    expect(isGameEvent(42)).toBe(false);
  });

  it('rejects an unknown event type', () => {
    expect(isGameEvent({ ...SESSION_START, type: 'page_view' })).toBe(false);
  });

  it('rejects an event missing a base field', () => {
    const { userId: _userId, ...rest } = SESSION_START;
    expect(isGameEvent(rest)).toBe(false);
  });

  it('rejects an event with a field of the wrong type', () => {
    expect(isGameEvent({ ...FORMULA_ACTIVATED, stepNumber: '1' })).toBe(false);
  });

  it('rejects an enum field outside its allowed values', () => {
    expect(isGameEvent({ ...SESSION_START, domain: 'history' })).toBe(false);
    expect(isGameEvent({ ...HINT_USED, hintTier: 4 })).toBe(false);
    expect(isGameEvent({ ...PROBLEM_COMPLETED, outcome: 'draw' })).toBe(false);
  });

  it('rejects a string array field containing non-strings', () => {
    expect(isGameEvent({ ...FORMULA_ACTIVATED, varsBefore: ['d', 1] })).toBe(false);
  });
});

describe('parseEventBatch', () => {
  it('parses a valid batch of mixed event types', () => {
    const batch = parseEventBatch({ events: [SESSION_START, FORMULA_ACTIVATED, SESSION_END] });
    expect(batch).toHaveLength(3);
    const [first] = batch ?? [];
    expect(first?.type).toBe('session_start');
  });

  it('returns an empty array for an empty batch', () => {
    expect(parseEventBatch({ events: [] })).toEqual([]);
  });

  it('returns null when "events" is missing or not an array', () => {
    expect(parseEventBatch({})).toBeNull();
    expect(parseEventBatch({ events: 'nope' })).toBeNull();
    expect(parseEventBatch(null)).toBeNull();
    expect(parseEventBatch('nope')).toBeNull();
  });

  it('returns null if any event in the batch is invalid', () => {
    const batch = parseEventBatch({ events: [SESSION_START, { type: 'session_start' }] });
    expect(batch).toBeNull();
  });
});
