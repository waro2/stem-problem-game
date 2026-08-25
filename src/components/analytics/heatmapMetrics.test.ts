import { describe, it, expect } from 'vitest';
import { isoWeek, deriveWeeksFromSessions, computeHeatmapCells, heatmapCellColor } from './heatmapMetrics';
import type { StudentSessionRow } from '@api/instructor';

function session(overrides: Partial<StudentSessionRow> = {}): StudentSessionRow {
  return {
    id: 's-1',
    domain: 'physics',
    outcome: 'win',
    totalSteps: 4,
    optimalSteps: 3,
    hintsUsed: 0,
    finalScore: 900,
    stepEfficiencyRatio: 0.75,
    timeElapsedSeconds: 120,
    startedAt: '2026-02-16T00:00:00.000Z', // Monday of ISO week 2026-W08
    completedAt: '2026-02-16T00:05:00.000Z',
    ...overrides,
  };
}

describe('isoWeek', () => {
  it('formats a Monday as the start of its ISO week', () => {
    expect(isoWeek('2026-02-16T00:00:00.000Z')).toBe('2026-W08');
  });

  it('places the last days of December in week 1 of the following year when applicable', () => {
    // 2025-12-29 is a Monday and belongs to ISO week 2026-W01.
    expect(isoWeek('2025-12-29T00:00:00.000Z')).toBe('2026-W01');
  });
});

describe('deriveWeeksFromSessions', () => {
  it('returns distinct weeks sorted ascending, capped to the requested count', () => {
    const sessions = [
      session({ startedAt: '2026-02-16T00:00:00.000Z' }), // W08
      session({ startedAt: '2026-02-23T00:00:00.000Z' }), // W09
      session({ startedAt: '2026-02-16T12:00:00.000Z' }), // W08 (dup)
      session({ startedAt: '2026-03-02T00:00:00.000Z' }), // W10
    ];
    expect(deriveWeeksFromSessions(sessions, 2)).toEqual(['2026-W09', '2026-W10']);
  });
});

describe('computeHeatmapCells', () => {
  it('averages scores per (domain, week) cell and normalizes by 1200', () => {
    const sessions = [
      session({ domain: 'physics', startedAt: '2026-02-16T00:00:00.000Z', finalScore: 600 }),
      session({ domain: 'physics', startedAt: '2026-02-17T00:00:00.000Z', finalScore: 1200 }),
    ];
    const cells = computeHeatmapCells(sessions, ['physics'], ['2026-W08']);
    expect(cells).toEqual([{ domain: 'physics', week: '2026-W08', avgScoreNorm: 0.75 }]);
  });

  it('produces a null cell when no session falls in that (domain, week)', () => {
    const cells = computeHeatmapCells([], ['physics'], ['2026-W08']);
    expect(cells).toEqual([{ domain: 'physics', week: '2026-W08', avgScoreNorm: null }]);
  });

  it('ignores sessions with a null finalScore', () => {
    const sessions = [session({ finalScore: null })];
    const cells = computeHeatmapCells(sessions, ['physics'], ['2026-W08']);
    expect(cells[0]!.avgScoreNorm).toBeNull();
  });
});

describe('heatmapCellColor', () => {
  it('returns the neutral grey for null (no data)', () => {
    expect(heatmapCellColor(null)).toBe('#F0EFE8');
  });

  it('returns the red tint below the 0.4 mastery threshold', () => {
    expect(heatmapCellColor(0.1)).toBe('#F7C1C1');
  });

  it('interpolates along the blue scale at the mastery threshold', () => {
    expect(heatmapCellColor(0.4)).toBe('rgb(148, 183, 217)');
  });

  it('interpolates to the strong blue at 1', () => {
    expect(heatmapCellColor(1)).toBe('rgb(24, 95, 165)');
  });
});
