/**
 * STEM Problem Game — Adaptive Recommendation data contract
 * Source: GDD §8.3 (Aggregates)
 *
 * Shared between src/server/studentRouter.ts (producer) and
 * src/game/store.ts (consumer).
 */

import type { Domain } from '../game/types';

export interface StudentDomainStatsRow {
  domain: Domain;
  problemsAttempted: number;
  problemsCompleted: number;
  avgScore: number | null;
  avgEfficiency: number | null;
  completionRate: number | null;
}

/** Fetch the student's per-domain performance (student_domain_stats). */
export async function fetchStudentDomainStats(apiUrl: string, userId: string): Promise<StudentDomainStatsRow[]> {
  const res = await fetch(`${apiUrl}/api/students/${encodeURIComponent(userId)}/domain-stats`);
  if (!res.ok) throw new Error(`Failed to fetch student domain stats: ${res.status}`);
  return res.json() as Promise<StudentDomainStatsRow[]>;
}
