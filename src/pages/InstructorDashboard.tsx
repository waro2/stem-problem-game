/**
 * InstructorDashboard — Cohort roster & score config  (GDD §6.4, §6.2)
 * Protected: only renders for users with role === 'instructor'.
 * Shows each student's average score and per-domain completion rate, and
 * lets the instructor adjust the cohort's score penalties/bonuses.
 */

import React, { useEffect, useState } from 'react';
import { fetchInstructorDashboard, updateScoreConfig, updateLeaderboardEnabled } from '@api/instructor';
import type { InstructorDashboardData, CohortStudentRow } from '@api/instructor';
import type { Domain, ScoreConfig, UserRole } from '@game/types';
import { DEFAULT_SCORE_CONFIG } from '@game/types';
import { t, domainLabel } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

interface InstructorDashboardProps {
  apiUrl: string;
  cohortId: string;
  role: UserRole;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function InstructorDashboard({ apiUrl, cohortId, role, lang, onLangChange }: InstructorDashboardProps) {
  const [data, setData] = useState<InstructorDashboardData | null>(null);
  const [error, setError] = useState(false);
  const [scoreConfig, setScoreConfig] = useState<ScoreConfig>(DEFAULT_SCORE_CONFIG);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [leaderboardSaveStatus, setLeaderboardSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    if (role !== 'instructor') return;

    fetchInstructorDashboard(apiUrl, cohortId)
      .then(d => {
        setData(d);
        setScoreConfig(d.scoreConfig);
        setLeaderboardEnabled(d.leaderboardEnabled);
      })
      .catch(err => {
        console.error('[instructor-dashboard] failed to load data', err);
        setError(true);
      });
  }, [apiUrl, cohortId, role]);

  if (role !== 'instructor') {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#F5F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 24, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 18, color: '#2E2E2E' }}>{t('accessDeniedTitle', lang)}</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#595959' }}>{t('accessDeniedMsg', lang)}</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setSaveStatus('saving');
    updateScoreConfig(apiUrl, cohortId, scoreConfig)
      .then(saved => {
        setScoreConfig(saved);
        setSaveStatus('saved');
      })
      .catch(err => {
        console.error('[instructor-dashboard] failed to save score config', err);
        setSaveStatus('error');
      });
  };

  const handleLeaderboardToggle = (enabled: boolean) => {
    setLeaderboardEnabled(enabled);
    setLeaderboardSaveStatus('saving');
    updateLeaderboardEnabled(apiUrl, cohortId, enabled)
      .then(result => {
        setLeaderboardEnabled(result.leaderboardEnabled);
        setLeaderboardSaveStatus('saved');
      })
      .catch(err => {
        console.error('[instructor-dashboard] failed to save leaderboard setting', err);
        setLeaderboardEnabled(!enabled);
        setLeaderboardSaveStatus('error');
      });
  };

  const domains = data ? [...new Set(data.students.flatMap(s => s.domainCompletion.map(d => d.domain)))] : [];

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
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>
          {t('instructorDashboardTitle', lang)}{data ? ` — ${data.cohortName}` : ''}
        </h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
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

        {!error && !data && (
          <div style={{ color: '#595959', fontSize: 14 }}>{t('loading', lang)}</div>
        )}

        {data && (
          <>
            <Section title={t('studentsSectionTitle', lang)}>
              {data.students.length === 0 ? (
                <NoData lang={lang} />
              ) : (
                <StudentsTable students={data.students} domains={domains} lang={lang} />
              )}
            </Section>

            <Section title={t('scoreConfigSectionTitle', lang)}>
              <ScoreConfigForm
                config={scoreConfig}
                onChange={setScoreConfig}
                onSave={handleSave}
                saveStatus={saveStatus}
                lang={lang}
              />
            </Section>

            <Section title={t('leaderboardSectionTitle', lang)}>
              <LeaderboardToggle
                enabled={leaderboardEnabled}
                onChange={handleLeaderboardToggle}
                saveStatus={leaderboardSaveStatus}
                lang={lang}
              />
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

function StudentsTable({ students, domains, lang }: { students: CohortStudentRow[]; domains: Domain[]; lang: Lang }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: '#595959', borderBottom: '1px solid #D6DCE4' }}>
          <th style={{ padding: '6px 8px' }}>{t('playerLabel', lang)}</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('avgScoreLabel', lang)}</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('sessionsPlayedLabel', lang)}</th>
          {domains.map(domain => (
            <th key={domain} style={{ padding: '6px 8px', textAlign: 'right' }}>
              {domainLabel(domain, lang)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {students.map(student => (
          <tr key={student.userId} style={{ borderBottom: '1px solid #D6DCE4' }}>
            <td style={{ padding: '6px 8px' }}>{student.displayName}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
              {student.avgScore !== null ? Math.round(student.avgScore) : '—'}
            </td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{student.sessionsPlayed}</td>
            {domains.map(domain => {
              const rate = student.domainCompletion.find(d => d.domain === domain)?.completionRate ?? null;
              return (
                <td key={domain} style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {rate !== null ? `${Math.round(rate * 100)}%` : '—'}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const SCORE_CONFIG_FIELDS: { key: keyof ScoreConfig; labelKey: 'scoreConfigMaxScoreLabel' | 'scoreConfigStepPenaltyLabel' | 'scoreConfigHintPenaltyLabel' | 'scoreConfigTimeBonusBaseLabel' | 'scoreConfigTimeBonusRateLabel' }[] = [
  { key: 'maxScore', labelKey: 'scoreConfigMaxScoreLabel' },
  { key: 'stepPenalty', labelKey: 'scoreConfigStepPenaltyLabel' },
  { key: 'hintPenalty', labelKey: 'scoreConfigHintPenaltyLabel' },
  { key: 'timeBonusBase', labelKey: 'scoreConfigTimeBonusBaseLabel' },
  { key: 'timeBonusRate', labelKey: 'scoreConfigTimeBonusRateLabel' },
];

function ScoreConfigForm({
  config, onChange, onSave, saveStatus, lang,
}: {
  config: ScoreConfig;
  onChange: (config: ScoreConfig) => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  lang: Lang;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {SCORE_CONFIG_FIELDS.map(({ key, labelKey }) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#595959' }}>
            {t(labelKey, lang)}
            <input
              type="number"
              min={0}
              value={config[key]}
              onChange={e => onChange({ ...config, [key]: Number(e.target.value) })}
              style={{ border: '1px solid #D6DCE4', borderRadius: 6, padding: '6px 8px', fontSize: 14 }}
            />
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          style={{
            border: '1px solid #2E75B6',
            background: '#2E75B6',
            color: '#fff',
            borderRadius: 6,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {t('scoreConfigSaveButton', lang)}
        </button>

        {saveStatus === 'saved' && (
          <span style={{ fontSize: 13, color: '#70AD47' }}>{t('scoreConfigSavedMsg', lang)}</span>
        )}
        {saveStatus === 'error' && (
          <span style={{ fontSize: 13, color: '#C00000' }}>{t('scoreConfigErrorMsg', lang)}</span>
        )}
      </div>
    </div>
  );
}

function LeaderboardToggle({
  enabled, onChange, saveStatus, lang,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  saveStatus: SaveStatus;
  lang: Lang;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2E2E2E', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange(e.target.checked)}
          disabled={saveStatus === 'saving'}
        />
        {t('enableLeaderboardLabel', lang)}
      </label>

      {saveStatus === 'saved' && (
        <span style={{ fontSize: 13, color: '#70AD47' }}>{t('leaderboardSavedMsg', lang)}</span>
      )}
      {saveStatus === 'error' && (
        <span style={{ fontSize: 13, color: '#C00000' }}>{t('leaderboardErrorMsg', lang)}</span>
      )}
    </div>
  );
}
