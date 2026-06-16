/**
 * STEM Problem Game — Strict Zod schema for incoming analytics events
 * Source: GDD §8.1 (Event Schema) — mirrors the GameEvent union in src/api/events.ts
 *
 * Used by validateEvent.ts to validate untrusted JSON from POST /api/events
 * before persistence. Stricter than a plain type-guard: rejects negative or
 * non-integer values for fields that are conceptually counts/steps.
 */

import { z } from 'zod';

const DOMAINS = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'] as const;
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const PLATFORMS = ['web', 'ios', 'android'] as const;
const OUTCOMES = ['win', 'stuck'] as const;

const BaseEventFields = {
  /** Pseudonymous UUID — never a real name or email */
  userId: z.string().min(1),
  problemId: z.string().min(1),
  timestamp: z.string().datetime(),
};

const SessionStartEventSchema = z.object({
  type: z.literal('session_start'),
  ...BaseEventFields,
  difficulty: z.enum(DIFFICULTIES),
  domain: z.enum(DOMAINS),
  platform: z.enum(PLATFORMS),
  hypothesisCount: z.number().int().nonnegative(),
  conclusionCount: z.number().int().nonnegative(),
  variableCount: z.number().int().nonnegative(),
  formulaCount: z.number().int().nonnegative(),
});

const FormulaActivatedEventSchema = z.object({
  type: z.literal('formula_activated'),
  ...BaseEventFields,
  formulaId: z.string().min(1),
  stepNumber: z.number().int().nonnegative(),
  varsBefore: z.array(z.string()),
  varRevealed: z.string(),
  timeSinceLast: z.number().nonnegative(),
  activatableCount: z.number().int().nonnegative(),
});

const HintUsedEventSchema = z.object({
  type: z.literal('hint_used'),
  ...BaseEventFields,
  hintTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stepNumber: z.number().int().nonnegative(),
  activatableCount: z.number().int().nonnegative(),
  currentVars: z.array(z.string()),
});

const ProblemCompletedEventSchema = z.object({
  type: z.literal('problem_completed'),
  ...BaseEventFields,
  outcome: z.enum(OUTCOMES),
  totalSteps: z.number().int().nonnegative(),
  optimalSteps: z.number().int().nonnegative(),
  timeElapsedSeconds: z.number().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  finalScore: z.number().nonnegative(),
  stepEfficiencyRatio: z.number().nonnegative(),
  activationPath: z.array(z.string()),
});

const SessionEndEventSchema = z.object({
  type: z.literal('session_end'),
  ...BaseEventFields,
  problemsAttempted: z.number().int().nonnegative(),
  problemsCompleted: z.number().int().nonnegative(),
  totalTimeSeconds: z.number().nonnegative(),
});

/** Discriminated union mirroring GameEvent — see src/api/events.ts */
export const GameEventSchema = z.discriminatedUnion('type', [
  SessionStartEventSchema,
  FormulaActivatedEventSchema,
  HintUsedEventSchema,
  ProblemCompletedEventSchema,
  SessionEndEventSchema,
]);

/** Expected shape of a POST /api/events request body: `{ events: GameEvent[] }`. */
export const EventBatchSchema = z.object({
  events: z.array(GameEventSchema),
});
