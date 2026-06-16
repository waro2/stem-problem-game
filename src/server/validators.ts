/**
 * STEM Problem Game — Shared primitive validators
 * Small type-guard helpers used by validateEvent.ts and validateProblem.ts
 * to check untrusted JSON from incoming requests.
 */

import type { Domain, Difficulty } from '../game/types';

export const DOMAINS: readonly Domain[] = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'];
export const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

export function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

export function isOneOf<T extends string | number>(v: unknown, options: readonly T[]): v is T {
  return (options as readonly unknown[]).includes(v);
}
