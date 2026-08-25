/**
 * DomainHeatmap — mastery (avg score) per domain × ISO week, rendered as a
 * hand-rolled SVG grid (no charting library, consistent with the rest of the
 * research/instructor dashboards).
 */

import { useState } from 'react';
import type { Domain } from '@game/types';
import type { StudentSessionRow } from '@api/instructor';
import { computeHeatmapCells, heatmapCellColor, deriveWeeksFromSessions } from './heatmapMetrics';
import { domainLabel, t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface DomainHeatmapProps {
  sessions: StudentSessionRow[];
  /** ISO weeks to render as columns. Defaults to the 8 most recent weeks present in `sessions`. */
  weeks?: string[];
  lang?: Lang;
}

const CELL_W = 28;
const CELL_H = 22;
const CELL_GAP = 4;
const LABEL_W = 110;
const HEADER_H = 20;
const DEFAULT_WEEK_COUNT = 8;

export function DomainHeatmap({ sessions, weeks, lang = 'fr' }: DomainHeatmapProps) {
  const [hovered, setHovered] = useState<{ domain: Domain; week: string; value: number | null } | null>(null);

  const domains = [...new Set(sessions.map(s => s.domain))].sort();
  const resolvedWeeks = weeks ?? deriveWeeksFromSessions(sessions, DEFAULT_WEEK_COUNT);

  if (sessions.length === 0 || domains.length === 0 || resolvedWeeks.length === 0) {
    return <div style={{ color: '#595959', fontSize: 13 }}>{t('noDataMsg', lang)}</div>;
  }

  const cells = computeHeatmapCells(sessions, domains, resolvedWeeks);
  const cellByKey = new Map(cells.map(c => [`${c.domain}|${c.week}`, c]));

  const gridWidth = LABEL_W + resolvedWeeks.length * (CELL_W + CELL_GAP);
  const gridHeight = HEADER_H + domains.length * (CELL_H + CELL_GAP);

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={gridWidth} height={gridHeight} style={{ display: 'block' }}>
          {resolvedWeeks.map((week, wi) => (
            <text
              key={week}
              x={LABEL_W + wi * (CELL_W + CELL_GAP) + CELL_W / 2}
              y={HEADER_H - 6}
              fontSize={9}
              textAnchor="middle"
              fill="#595959"
            >
              {week.slice(6)}
            </text>
          ))}

          {domains.map((domain, di) => (
            <g key={domain}>
              <text x={0} y={HEADER_H + di * (CELL_H + CELL_GAP) + CELL_H / 2 + 4} fontSize={11} fill="#2E2E2E">
                {domainLabel(domain, lang)}
              </text>
              {resolvedWeeks.map((week, wi) => {
                const value = cellByKey.get(`${domain}|${week}`)?.avgScoreNorm ?? null;
                return (
                  <rect
                    key={week}
                    x={LABEL_W + wi * (CELL_W + CELL_GAP)}
                    y={HEADER_H + di * (CELL_H + CELL_GAP)}
                    width={CELL_W}
                    height={CELL_H}
                    rx={3}
                    fill={heatmapCellColor(value)}
                    stroke="#D6DCE4"
                    onMouseEnter={() => setHovered({ domain, week, value })}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div style={{ fontSize: 12, color: '#2E2E2E', marginTop: 6, minHeight: 16 }}>
        {hovered
          ? `${domainLabel(hovered.domain, lang)} · ${hovered.week} · ${t('heatmapScoreLabel', lang)} : ${
              hovered.value !== null ? `${Math.round(hovered.value * 100)}%` : '—'
            }`
          : ' '}
      </div>

      <HeatmapLegend lang={lang} />
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────

function HeatmapLegend({ lang }: { lang: Lang }) {
  const gradientId = 'domain-heatmap-gradient';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 11, color: '#595959' }}>
      <svg width={120} height={12}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E6F1FB" />
            <stop offset="100%" stopColor="#185FA5" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={120} height={12} rx={3} fill={`url(#${gradientId})`} />
      </svg>
      <span>0% → 100%</span>
      <LegendSwatch color="#F7C1C1" label={t('heatmapLowMasteryLegend', lang)} />
      <LegendSwatch color="#F0EFE8" label={t('heatmapNoDataLegend', lang)} />
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid #D6DCE4', display: 'inline-block' }} />
      {label}
    </div>
  );
}
