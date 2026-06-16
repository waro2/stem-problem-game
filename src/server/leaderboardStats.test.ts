/**
 * Tests for cohort leaderboard ranking.
 * Run: npx vitest src/server/leaderboardStats.test.ts
 */

import { describe, it, expect } from 'vitest';
import { computeCohortLeaderboardEntries } from './leaderboardStats';
import type { LeaderboardMember, LeaderboardSessionRow } from './leaderboardStats';

describe('computeCohortLeaderboardEntries', () => {
  const members: LeaderboardMember[] = [
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' },
    { id: 'user-3', name: null },
    { id: 'user-4', name: 'Dana' },
  ];

  it('ranks members by total score, highest first', () => {
    const sessions: LeaderboardSessionRow[] = [
      { userId: 'user-1', finalScore: 900, stepEfficiencyRatio: 0.8 },
      { userId: 'user-2', finalScore: 700, stepEfficiencyRatio: 0.6 },
    ];

    const entries = computeCohortLeaderboardEntries(members, sessions);

    expect(entries).toEqual([
      { rank: 1, displayName: 'Alice', totalScore: 900, avgEfficiency: 0.8 },
      { rank: 2, displayName: 'Bob', totalScore: 700, avgEfficiency: 0.6 },
    ]);
  });

  it('sums scores and averages efficiency across multiple sessions per member', () => {
    const sessions: LeaderboardSessionRow[] = [
      { userId: 'user-1', finalScore: 900, stepEfficiencyRatio: 0.8 },
      { userId: 'user-1', finalScore: 600, stepEfficiencyRatio: 0.4 },
    ];

    const entries = computeCohortLeaderboardEntries(members, sessions);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.rank).toBe(1);
    expect(entries[0]!.displayName).toBe('Alice');
    expect(entries[0]!.totalScore).toBe(1500);
    expect(entries[0]!.avgEfficiency).toBeCloseTo(0.6);
  });

  it('gives tied scores the same rank, dense-rank style (SQL RANK())', () => {
    const sessions: LeaderboardSessionRow[] = [
      { userId: 'user-1', finalScore: 900, stepEfficiencyRatio: 0.8 },
      { userId: 'user-2', finalScore: 900, stepEfficiencyRatio: 0.7 },
      { userId: 'user-4', finalScore: 800, stepEfficiencyRatio: 0.5 },
    ];

    const entries = computeCohortLeaderboardEntries(members, sessions);

    expect(entries.map(e => e.rank)).toEqual([1, 1, 3]);
  });

  it('falls back to the user id as display name when the member has no name', () => {
    const sessions: LeaderboardSessionRow[] = [{ userId: 'user-3', finalScore: 500, stepEfficiencyRatio: 0.5 }];

    const entries = computeCohortLeaderboardEntries(members, sessions);

    expect(entries[0]!.displayName).toBe('user-3');
  });

  it('excludes members with no winning sessions', () => {
    const sessions: LeaderboardSessionRow[] = [{ userId: 'user-1', finalScore: 900, stepEfficiencyRatio: 0.8 }];

    const entries = computeCohortLeaderboardEntries(members, sessions);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.displayName).toBe('Alice');
  });

  it('returns null avgEfficiency when efficiency data is missing', () => {
    const sessions: LeaderboardSessionRow[] = [{ userId: 'user-1', finalScore: 900, stepEfficiencyRatio: null }];

    const entries = computeCohortLeaderboardEntries(members, sessions);

    expect(entries[0]!.avgEfficiency).toBeNull();
  });

  it('returns an empty array when there are no sessions', () => {
    expect(computeCohortLeaderboardEntries(members, [])).toEqual([]);
  });
});
