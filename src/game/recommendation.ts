/**
 * Adaptive problem selection  (GDD §8.3 — Aggregates, §5 — UI Design)
 *
 * Reads the student's per-domain performance (student_domain_stats),
 * identifies the domain where they are weakest, and recommends the next
 * not-yet-completed problem in that domain.
 *
 * Pure functions only — no side effects, no imports from React.
 */

import type { Domain } from './types';
import type { ProblemSummary } from '../api/library';

/** One row of student_domain_stats for a single (user, domain) pair. */
export interface DomainStat {
  domain: Domain;
  avgScore: number | null;
  completionRate: number | null;
  problemsAttempted: number;
}

const ALL_DOMAINS: readonly Domain[] = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'];

/**
 * Pick the domain where the student is performing worst.
 *
 * A domain the student has never attempted has no avgScore — it is treated
 * as the weakest possible (the student has made zero progress there), so
 * unexplored domains are recommended before refining already-attempted ones.
 * Among attempted domains, the lowest avgScore wins. Ties are broken by
 * the fixed domain order above.
 */
export function getWeakestDomain(stats: readonly DomainStat[]): Domain {
  const byDomain = new Map(stats.map(s => [s.domain, s]));

  let weakest: Domain = ALL_DOMAINS[0]!;
  let weakestScore = Infinity;

  for (const domain of ALL_DOMAINS) {
    const score = byDomain.get(domain)?.avgScore ?? -Infinity;
    if (score < weakestScore) {
      weakestScore = score;
      weakest = domain;
    }
  }

  return weakest;
}

/**
 * Recommend the next problem to play within a domain: the first
 * not-yet-completed problem in catalog order, or null if every problem
 * in that domain has already been completed.
 */
export function recommendNextProblem(domain: Domain, problems: readonly ProblemSummary[]): ProblemSummary | null {
  return problems.find(p => p.domain === domain && !p.completed) ?? null;
}
