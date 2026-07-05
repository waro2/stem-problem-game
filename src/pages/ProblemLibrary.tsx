/**
 * ProblemLibrary — Filterable problem catalog  (GDD §5)
 * Grid of all problems, filterable by domain and difficulty, showing a
 * "completed" badge and the player's previous score for each problem.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { fetchProblemLibrary } from '@api/library';
import type { ProblemSummary } from '@api/library';
import type { Domain, Difficulty } from '@game/types';
import { computeUnlockedIds } from '@game/progression';
import { getCompletedProblemIds } from '@game/progressionStorage';
import { t, tf, domainLabel, difficultyLabel } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

const DOMAINS: readonly Domain[] = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'];
const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

const DOMAIN_EMOJI: Record<Domain, string> = {
  physics: '⚡',
  chemistry: '⚗️',
  mathematics: '📐',
  biology: '🧬',
  engineering: '⚙️',
};

const DOMAIN_COLOR: Record<Domain, string> = {
  physics:     '#1565C0',
  chemistry:   '#2E7D32',
  mathematics: '#6A1B9A',
  biology:     '#AD1457',
  engineering: '#E65100',
};

interface ProblemLibraryProps {
  apiUrl: string;
  userId: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  /** Called when the player picks a problem to play. */
  onSelectProblem?: (problemId: string) => void;
}

export function ProblemLibrary({ apiUrl, userId, lang, onLangChange, onSelectProblem }: ProblemLibraryProps) {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');

  useEffect(() => {
    fetchProblemLibrary(apiUrl, userId)
      .then(setProblems)
      .catch(err => {
        console.error('[problem-library] failed to load data', err);
        setError(true);
      });
  }, [apiUrl, userId]);

  const filtered = useMemo(() => {
    if (!problems) return [];
    return problems.filter(
      p => (!activeDomain || p.domain === activeDomain) && (difficultyFilter === 'all' || p.difficulty === difficultyFilter)
    );
  }, [problems, activeDomain, difficultyFilter]);

  const unlockedIds = useMemo(() => {
    if (!problems) return new Set<string>();
    const completedIds = new Set(getCompletedProblemIds());
    for (const p of problems) {
      if (p.completed) completedIds.add(p.id);
    }
    return computeUnlockedIds(problems.map(p => p.id), completedIds);
  }, [problems]);

  const domainStats = useMemo(() => {
    if (!problems) return {} as Record<Domain, { total: number; completed: number }>;
    const stats = {} as Record<Domain, { total: number; completed: number }>;
    for (const domain of DOMAINS) stats[domain] = { total: 0, completed: 0 };
    for (const p of problems) {
      stats[p.domain].total++;
      if (p.completed) stats[p.domain].completed++;
    }
    return stats;
  }, [problems]);

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
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('problemLibraryTitle', lang)}</h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 1000, margin: '0 auto' }}>
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

        {!error && !problems && (
          <div style={{ color: '#595959', fontSize: 14 }}>{t('loading', lang)}</div>
        )}

        {problems && (
          <>
            {/* Domain cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {DOMAINS.map(domain => {
                const stats = domainStats[domain];
                const color = DOMAIN_COLOR[domain];
                const isActive = activeDomain === domain;
                const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                return (
                  <button
                    key={domain}
                    onClick={() => setActiveDomain(isActive ? null : domain)}
                    style={{
                      border: `2px solid ${isActive ? color : '#E8ECF0'}`,
                      borderRadius: 10,
                      background: isActive ? `${color}12` : '#fff',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{DOMAIN_EMOJI[domain]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? color : '#2E2E2E' }}>
                      {domainLabel(domain, lang)}
                    </span>
                    <span style={{ fontSize: 11, color: '#595959' }}>
                      {tf('libraryProblemsCount', lang)(stats.total)}
                    </span>
                    {/* Progress bar */}
                    <div style={{ height: 4, borderRadius: 2, background: '#E8ECF0', overflow: 'hidden', marginTop: 2 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Difficulty filter */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <FilterSelect
                label={t('difficultyFilterLabel', lang)}
                value={difficultyFilter}
                onChange={v => setDifficultyFilter(v as Difficulty | 'all')}
                allLabel={t('allDifficultiesOption', lang)}
                options={DIFFICULTIES.map(d => ({ value: d, label: difficultyLabel(d, lang) }))}
              />
            </div>

            {filtered.length === 0 ? (
              <div style={{ color: '#595959', fontSize: 13 }}>{t('noResultsMsg', lang)}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {filtered.map(problem => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    lang={lang}
                    locked={!unlockedIds.has(problem.id)}
                    onSelect={onSelectProblem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: T | 'all';
  onChange: (value: T | 'all') => void;
  allLabel: string;
  options: { value: T; label: string }[];
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#595959' }}>
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value as T | 'all')}
        style={{
          border: '1px solid #D6DCE4',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 13,
          background: '#fff',
          color: '#2E2E2E',
        }}
      >
        <option value="all">{allLabel}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProblemCard({
  problem,
  lang,
  locked,
  onSelect,
}: {
  problem: ProblemSummary;
  lang: Lang;
  locked: boolean;
  onSelect: ((problemId: string) => void) | undefined;
}) {
  const title = lang === 'fr' ? problem.title_fr : problem.title;
  const clickable = !locked && !!onSelect;

  return (
    <div
      onClick={clickable ? () => onSelect!(problem.id) : undefined}
      title={locked ? t('lockedMsg', lang) : undefined}
      style={{
        background: locked ? '#F0F1F3' : '#fff',
        border: '1px solid #D6DCE4',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: clickable ? 'pointer' : 'default',
        opacity: locked ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
        <span style={{ color: '#2E75B6', fontWeight: 700, textTransform: 'uppercase' }}>{domainLabel(problem.domain, lang)}</span>
        <span style={{ color: '#595959' }}>{difficultyLabel(problem.difficulty, lang)}</span>
      </div>

      <h3 style={{ margin: 0, fontSize: 15, color: '#2E2E2E' }}>{title}</h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: 12, color: '#595959' }}>
          {problem.previousScore !== null ? `${t('previousScoreLabel', lang)}: ${problem.previousScore}` : '—'}
        </span>
        {locked ? (
          <span
            style={{
              border: '1px solid #A6A6A6',
              background: '#E8E9EB',
              color: '#595959',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {t('lockedBadge', lang)}
          </span>
        ) : (
          problem.completed && (
            <span
              style={{
                border: '1px solid #70AD47',
                background: '#F0FBF0',
                color: '#70AD47',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {t('completedBadge', lang)}
            </span>
          )
        )}
      </div>
    </div>
  );
}
