/**
 * ResearchDashboard — Read-only research view  (GDD §8.3, §6.4)
 * Shows completion rate by domain, average score over time, and the
 * cohort leaderboard, fed by GET /api/research/dashboard.
 */

import React, { useEffect, useState } from 'react';
import { fetchResearchDashboard, fetchSessionsExportCsv } from '@api/research';
import type { ResearchDashboardData, DomainCompletionRow, ScoreHistoryPoint, LeaderboardRow, MetricTrend, TrendSeries } from '@api/research';
import { t, domainLabel } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

interface ResearchDashboardProps {
  apiUrl: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export function ResearchDashboard({ apiUrl, lang, onLangChange }: ResearchDashboardProps) {
  const [data, setData] = useState<ResearchDashboardData | null>(null);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    fetchResearchDashboard(apiUrl)
      .then(setData)
      .catch(err => {
        console.error('[research-dashboard] failed to load data', err);
        setError(true);
      });
  }, [apiUrl]);

  const handleExportCsv = async () => {
    setExporting(true);
    setExportError(false);
    try {
      const blob = await fetchSessionsExportCsv(apiUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sessions_export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[research-dashboard] failed to export sessions CSV', err);
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#F5F6F8' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#fff',
          borderBottom: '1px solid #D6DCE4',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('researchDashboardTitle', lang)}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            style={{
              border: '1px solid #2E75B6',
              background: '#fff',
              color: '#2E75B6',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
            }}
          >
            {t('exportCsvButton', lang)}
          </button>
          <LangSwitch lang={lang} onChange={onLangChange} />
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 900, margin: '0 auto' }}>
        {error && (
          <div
            style={{
              border: '2px solid #C00000',
              background: '#FBEEEE',
              color: '#C00000',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
            }}
          >
            {t('dashboardErrorMsg', lang)}
          </div>
        )}

        {exportError && (
          <div
            style={{
              border: '2px solid #C00000',
              background: '#FBEEEE',
              color: '#C00000',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
            }}
          >
            {t('exportCsvErrorMsg', lang)}
          </div>
        )}

        {!error && !data && (
          <div style={{ color: '#595959', fontSize: 14 }}>{t('loading', lang)}</div>
        )}

        {data && (
          <>
            <Section title={t('domainCompletionTitle', lang)}>
              {data.domainCompletion.length === 0 ? (
                <NoData lang={lang} />
              ) : (
                <DomainCompletionList rows={data.domainCompletion} lang={lang} />
              )}
            </Section>

            <Section title={t('scoreHistoryTitle', lang)}>
              {data.scoreHistory.length === 0 ? (
                <NoData lang={lang} />
              ) : (
                <ScoreLineChart data={data.scoreHistory} />
              )}
            </Section>

            <Section title={t('cohortLeaderboardTitle', lang)}>
              {data.cohortLeaderboard.length === 0 ? (
                <NoData lang={lang} />
              ) : (
                <LeaderboardTable rows={data.cohortLeaderboard} lang={lang} />
              )}
            </Section>

            <Section title={t('stepEfficiencyTrendTitle', lang)}>
              <MetricTrendChart trend={data.stepEfficiencyTrend} lang={lang} formatValue={formatPercent} />
            </Section>

            <Section title={t('hintDecayTrendTitle', lang)}>
              <MetricTrendChart trend={data.hintDecayTrend} lang={lang} formatValue={formatNumber} />
            </Section>

            <Section title={t('domainCompletionTrendTitle', lang)}>
              <MetricTrendChart trend={data.domainCompletionTrend} lang={lang} formatValue={formatPercent} />
            </Section>

            <Section title={t('cascadeRecognitionTrendTitle', lang)}>
              <MetricTrendChart trend={data.cascadeRecognitionTrend} lang={lang} formatValue={formatSeconds} />
            </Section>

            <Section title={t('scoreTrajectoryTrendTitle', lang)}>
              <MetricTrendChart trend={data.scoreTrajectoryTrend} lang={lang} formatValue={formatNumber} />
            </Section>

            <Section title={t('stuckRateTrendTitle', lang)}>
              <MetricTrendChart trend={data.stuckRateTrend} lang={lang} formatValue={formatPercent} />
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#2E2E2E' }}>{title}</h2>
      {children}
    </section>
  );
}

function NoData({ lang }: { lang: Lang }) {
  return <div style={{ color: '#595959', fontSize: 13 }}>{t('noDataMsg', lang)}</div>;
}

function DomainCompletionList({ rows, lang }: { rows: DomainCompletionRow[]; lang: Lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(row => (
        <div key={row.domain}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: '#2E2E2E' }}>{domainLabel(row.domain, lang)}</span>
            <span style={{ color: '#595959' }}>
              {row.completionRate !== null ? `${Math.round(row.completionRate * 100)}%` : '—'}
              {' · '}
              {row.totalCompletions}/{row.totalAttempts} {t('attemptsLabel', lang)}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#F5F6F8', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(row.completionRate ?? 0) * 100}%`,
                background: '#70AD47',
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const CHART_PADDING = 32;

function ScoreLineChart({ data }: { data: ScoreHistoryPoint[] }) {
  const scores = data.map(d => d.avgScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? CHART_WIDTH / 2
        : CHART_PADDING + (i / (data.length - 1)) * (CHART_WIDTH - 2 * CHART_PADDING);
    const y = CHART_HEIGHT - CHART_PADDING - ((d.avgScore - minScore) / range) * (CHART_HEIGHT - 2 * CHART_PADDING);
    return { x, y, d };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} style={{ width: '100%', height: 'auto' }}>
      <line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} stroke="#D6DCE4" />
      <line x1={CHART_PADDING} y1={CHART_PADDING} x2={CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} stroke="#D6DCE4" />
      <path d={path} fill="none" stroke="#2E75B6" strokeWidth={2} />
      {points.map(p => (
        <circle key={p.d.date} cx={p.x} cy={p.y} r={3} fill="#2E75B6" />
      ))}
      {points[0] && (
        <text x={points[0].x} y={CHART_HEIGHT - CHART_PADDING + 16} fontSize={10} fill="#595959">
          {points[0].d.date}
        </text>
      )}
      {points.length > 1 && (
        <text x={points[points.length - 1]!.x} y={CHART_HEIGHT - CHART_PADDING + 16} fontSize={10} fill="#595959" textAnchor="end">
          {points[points.length - 1]!.d.date}
        </text>
      )}
      <text x={CHART_PADDING - 6} y={CHART_PADDING} fontSize={10} fill="#595959" textAnchor="end">
        {Math.round(maxScore)}
      </text>
      <text x={CHART_PADDING - 6} y={CHART_HEIGHT - CHART_PADDING} fontSize={10} fill="#595959" textAnchor="end">
        {Math.round(minScore)}
      </text>
    </svg>
  );
}

// ── Trend metrics (GDD §8.3) — per-student / per-cohort line charts ──────────

const TREND_COLORS = ['#2E75B6', '#70AD47', '#C00000', '#FFC000', '#7030A0', '#1F9999'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

function formatSeconds(value: number): string {
  return `${(Math.round(value * 10) / 10)}s`;
}

function MetricTrendChart({ trend, lang, formatValue }: { trend: MetricTrend; lang: Lang; formatValue: (value: number) => string }) {
  const [groupBy, setGroupBy] = useState<'student' | 'cohort'>('student');

  if (trend.byStudent.length === 0 && trend.byCohort.length === 0) return <NoData lang={lang} />;

  const series = groupBy === 'student' ? trend.byStudent : trend.byCohort;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <ToggleButton active={groupBy === 'student'} label={t('byStudentLabel', lang)} onClick={() => setGroupBy('student')} />
        <ToggleButton active={groupBy === 'cohort'} label={t('byCohortLabel', lang)} onClick={() => setGroupBy('cohort')} />
      </div>
      {series.length === 0 ? <NoData lang={lang} /> : <TrendLineChart series={series} formatValue={formatValue} />}
    </div>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '1px solid #2E75B6',
        background: active ? '#2E75B6' : '#fff',
        color: active ? '#fff' : '#2E75B6',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function TrendLineChart({ series, formatValue }: { series: TrendSeries[]; formatValue: (value: number) => string }) {
  const dates = [...new Set(series.flatMap(s => s.points.map(p => p.date)))].sort();
  const values = series.flatMap(s => s.points.map(p => p.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const x = (date: string): number => {
    const i = dates.indexOf(date);
    return dates.length === 1
      ? CHART_WIDTH / 2
      : CHART_PADDING + (i / (dates.length - 1)) * (CHART_WIDTH - 2 * CHART_PADDING);
  };
  const y = (value: number): number =>
    CHART_HEIGHT - CHART_PADDING - ((value - minValue) / range) * (CHART_HEIGHT - 2 * CHART_PADDING);

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} style={{ width: '100%', height: 'auto' }}>
        <line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} stroke="#D6DCE4" />
        <line x1={CHART_PADDING} y1={CHART_PADDING} x2={CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} stroke="#D6DCE4" />
        {series.map((s, i) => {
          const color = TREND_COLORS[i % TREND_COLORS.length]!;
          const path = s.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${x(p.date)} ${y(p.value)}`).join(' ');
          return (
            <g key={s.groupId}>
              <path d={path} fill="none" stroke={color} strokeWidth={2} />
              {s.points.map(p => (
                <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.5} fill={color} />
              ))}
            </g>
          );
        })}
        {dates[0] && (
          <text x={CHART_PADDING} y={CHART_HEIGHT - CHART_PADDING + 16} fontSize={10} fill="#595959">
            {dates[0]}
          </text>
        )}
        {dates.length > 1 && (
          <text x={CHART_WIDTH - CHART_PADDING} y={CHART_HEIGHT - CHART_PADDING + 16} fontSize={10} fill="#595959" textAnchor="end">
            {dates[dates.length - 1]}
          </text>
        )}
        <text x={CHART_PADDING - 6} y={CHART_PADDING} fontSize={10} fill="#595959" textAnchor="end">
          {formatValue(maxValue)}
        </text>
        <text x={CHART_PADDING - 6} y={CHART_HEIGHT - CHART_PADDING} fontSize={10} fill="#595959" textAnchor="end">
          {formatValue(minValue)}
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        {series.map((s, i) => (
          <div key={s.groupId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#595959' }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: TREND_COLORS[i % TREND_COLORS.length],
                display: 'inline-block',
              }}
            />
            {s.groupLabel}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardTable({ rows, lang }: { rows: LeaderboardRow[]; lang: Lang }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: '#595959', borderBottom: '1px solid #D6DCE4' }}>
          <th style={{ padding: '6px 8px' }}>{t('rankLabel', lang)}</th>
          <th style={{ padding: '6px 8px' }}>{t('playerLabel', lang)}</th>
          <th style={{ padding: '6px 8px' }}>{t('cohortLabel', lang)}</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('totalScoreLabel', lang)}</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('sessionsPlayedLabel', lang)}</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('avgEfficiencyLabel', lang)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.userId} style={{ borderBottom: '1px solid #D6DCE4' }}>
            <td style={{ padding: '6px 8px', fontWeight: 700 }}>{i + 1}</td>
            <td style={{ padding: '6px 8px' }}>{row.displayName}</td>
            <td style={{ padding: '6px 8px', color: '#595959' }}>{row.cohortName ?? '—'}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{row.totalScore}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.sessionsPlayed}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
              {row.avgEfficiency !== null ? row.avgEfficiency.toFixed(2) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
