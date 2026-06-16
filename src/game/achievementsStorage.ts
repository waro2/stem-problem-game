/**
 * Achievements / badges — localStorage persistence (GDD §6, §9.4)
 *
 * Tracks which badges (src/game/achievements.ts) a player has unlocked,
 * so they survive reloads without a server round-trip.
 */

import type { Domain } from './types';

const BADGES_KEY = 'stem_game_badges';

interface StoredBadges {
  domainMastered: Domain[];
  parAchieved: string[];
  lightningSpeed: string[];
}

export interface UnlockedBadges {
  domainMastered: ReadonlySet<Domain>;
  parAchieved: ReadonlySet<string>;
  lightningSpeed: ReadonlySet<string>;
}

const EMPTY: StoredBadges = { domainMastered: [], parAchieved: [], lightningSpeed: [] };

function readStored(): StoredBadges {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY;
    const o = parsed as Record<string, unknown>;

    return {
      domainMastered: Array.isArray(o.domainMastered) ? o.domainMastered.filter((d): d is Domain => typeof d === 'string') : [],
      parAchieved: Array.isArray(o.parAchieved) ? o.parAchieved.filter((id): id is string => typeof id === 'string') : [],
      lightningSpeed: Array.isArray(o.lightningSpeed) ? o.lightningSpeed.filter((id): id is string => typeof id === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

function writeStored(stored: StoredBadges): void {
  try {
    localStorage.setItem(BADGES_KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable or full — badges simply won't persist
  }
}

/** Read all badges the player has unlocked so far. */
export function getUnlockedBadges(): UnlockedBadges {
  const stored = readStored();
  return {
    domainMastered: new Set(stored.domainMastered),
    parAchieved: new Set(stored.parAchieved),
    lightningSpeed: new Set(stored.lightningSpeed),
  };
}

/** Record that the player achieved "par" (optimal steps) on the given problem. */
export function markParAchieved(problemId: string): void {
  const stored = readStored();
  if (!stored.parAchieved.includes(problemId)) {
    writeStored({ ...stored, parAchieved: [...stored.parAchieved, problemId] });
  }
}

/** Record that the player solved the given problem in under 60 seconds. */
export function markLightningSpeed(problemId: string): void {
  const stored = readStored();
  if (!stored.lightningSpeed.includes(problemId)) {
    writeStored({ ...stored, lightningSpeed: [...stored.lightningSpeed, problemId] });
  }
}

/** Record that the player completed every problem in the given domain. */
export function markDomainMastered(domain: Domain): void {
  const stored = readStored();
  if (!stored.domainMastered.includes(domain)) {
    writeStored({ ...stored, domainMastered: [...stored.domainMastered, domain] });
  }
}
