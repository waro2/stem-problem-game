/**
 * STEM Problem Game — Runtime validation for incoming analytics events
 * Source: GDD §8.1 (Event Schema) — mirrors the GameEvent union in src/api/events.ts
 *
 * Validates untrusted JSON from POST /api/events before persistence using
 * the strict Zod schema defined in eventSchema.ts.
 */

import type { GameEvent } from '../api/events';
import { GameEventSchema, EventBatchSchema } from './eventSchema';

/** Validate a single decoded JSON value as a GameEvent (discriminated by `type`). */
export function isGameEvent(value: unknown): value is GameEvent {
  return GameEventSchema.safeParse(value).success;
}

/**
 * Validate a POST /api/events request body, expected shape: `{ events: GameEvent[] }`.
 * Returns null if the body is malformed or any event fails validation.
 */
export function parseEventBatch(body: unknown): GameEvent[] | null {
  const result = EventBatchSchema.safeParse(body);
  if (!result.success) return null;
  return result.data.events as GameEvent[];
}
