/**
 * Domain × week mastery heatmap — pure grouping and color logic feeding
 * DomainHeatmap.tsx (SVG rendering only, no external chart lib).
 */

import type { Domain } from '@game/types';
import type { StudentSessionRow } from '@api/instructor';

/** Matches the GDD §6.2 score ceiling (S_MAX + max timeBonus). */
const SCORE_MAX = 1200;

const NO_DATA_COLOR = '#F0EFE8';
const LOW_MASTERY_COLOR = '#F7C1C1';
const LOW_MASTERY_THRESHOLD = 0.4;
const SCALE_FROM = '#E6F1FB';
const SCALE_TO = '#185FA5';

export interface HeatmapCell {
  domain: Domain;
  /** ISO 8601 week, e.g. "2026-W08". */
  week: string;
  /** avgScore / 1200, or null when no session falls in this cell. */
  avgScoreNorm: number | null;
}

/** ISO 8601 week string ("YYYY-Www") for an ISO date string. */
export function isoWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** The `count` most recent distinct ISO weeks present in the sessions, oldest first. */
export function deriveWeeksFromSessions(sessions: readonly StudentSessionRow[], count: number): string[] {
  const weeks = [...new Set(sessions.map(s => isoWeek(s.startedAt)))].sort();
  return weeks.slice(-count);
}

/** Group sessions into (domain, week) cells and average their score, normalized to 0–1. */
export function computeHeatmapCells(
  sessions: readonly StudentSessionRow[],
  domains: readonly Domain[],
  weeks: readonly string[]
): HeatmapCell[] {
  const scoresByKey = new Map<string, number[]>();
  for (const s of sessions) {
    if (s.finalScore === null) continue;
    const key = `${s.domain}|${isoWeek(s.startedAt)}`;
    const group = scoresByKey.get(key);
    if (group) group.push(s.finalScore);
    else scoresByKey.set(key, [s.finalScore]);
  }

  const cells: HeatmapCell[] = [];
  for (const domain of domains) {
    for (const week of weeks) {
      const scores = scoresByKey.get(`${domain}|${week}`);
      cells.push({
        domain,
        week,
        avgScoreNorm: scores ? scores.reduce((sum, v) => sum + v, 0) / scores.length / SCORE_MAX : null,
      });
    }
  }
  return cells;
}

/** Cell fill color: grey for no data, red tint below the mastery threshold, else a blue scale. */
export function heatmapCellColor(value: number | null): string {
  if (value === null) return NO_DATA_COLOR;
  if (value < LOW_MASTERY_THRESHOLD) return LOW_MASTERY_COLOR;
  return interpolateColor(SCALE_FROM, SCALE_TO, Math.min(1, Math.max(0, value)));
}

function interpolateColor(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
