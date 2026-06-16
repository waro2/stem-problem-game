/**
 * Achievements / badges — unlock rules (GDD §6)
 *
 * Three badge types:
 *  - "domainMastered"  — every problem in a domain has been completed
 *  - "parAchieved"     — a problem was solved in exactly its optimal step count
 *  - "lightningSpeed"  — a problem was solved in under 60 seconds
 *
 * Pure functions only — no side effects, no imports from React.
 */

import type { Domain, SessionSummary } from './types';

const LIGHTNING_SPEED_THRESHOLD_SECONDS = 60;

/** True iff the session was won using exactly the optimal number of steps. */
export function isParAchieved(summary: SessionSummary): boolean {
  return summary.outcome === 'win' && summary.totalSteps === summary.optimalSteps;
}

/** True iff the session was won in under 60 seconds. */
export function isLightningSpeed(summary: SessionSummary): boolean {
  return summary.outcome === 'win' && summary.elapsedSeconds < LIGHTNING_SPEED_THRESHOLD_SECONDS;
}

export interface ProblemDomainRow {
  id: string;
  domain: Domain;
}

/** A domain is "mastered" once every one of its catalog problems has been completed. */
export function computeMasteredDomains(
  problems: readonly ProblemDomainRow[],
  completedIds: ReadonlySet<string>
): Set<Domain> {
  const idsByDomain = new Map<Domain, string[]>();
  for (const problem of problems) {
    const ids = idsByDomain.get(problem.domain);
    if (ids) ids.push(problem.id);
    else idsByDomain.set(problem.domain, [problem.id]);
  }

  const mastered = new Set<Domain>();
  for (const [domain, ids] of idsByDomain) {
    if (ids.every(id => completedIds.has(id))) {
      mastered.add(domain);
    }
  }
  return mastered;
}
