/**
 * LeaderboardPanel — Student-facing cohort leaderboard  (GDD §6.4)
 *
 * Reads the cohort_leaderboard view via GET /api/cohorts/:cohortId/leaderboard
 * (src/server/cohortRouter.ts) and shows rank, display name, total score, and
 * average efficiency. Renders nothing unless the instructor has enabled the
 * leaderboard for the cohort (InstructorDashboard).
 */

import { useEffect, useState } from 'react';
import { fetchCohortLeaderboard } from '@api/leaderboard';
import type { CohortLeaderboardData } from '@api/leaderboard';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface LeaderboardPanelProps {
  apiUrl: string;
  cohortId: string;
  lang: Lang;
}

export function LeaderboardPanel({ apiUrl, cohortId, lang }: LeaderboardPanelProps) {
  const [data, setData] = useState<CohortLeaderboardData | null>(null);

  useEffect(() => {
    fetchCohortLeaderboard(apiUrl, cohortId)
      .then(setData)
      .catch(err => {
        console.error('[leaderboard-panel] failed to load leaderboard', err);
      });
  }, [apiUrl, cohortId]);

  if (!data || !data.enabled) return null;

  return (
    <section style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#2E2E2E' }}>{t('leaderboardPanelTitle', lang)}</h2>

      {data.entries.length === 0 ? (
        <div style={{ color: '#595959', fontSize: 13 }}>{t('noDataMsg', lang)}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#595959', borderBottom: '1px solid #D6DCE4' }}>
              <th style={{ padding: '6px 8px' }}>{t('rankLabel', lang)}</th>
              <th style={{ padding: '6px 8px' }}>{t('playerLabel', lang)}</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('totalScoreLabel', lang)}</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('avgEfficiencyLabel', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map(entry => (
              <tr key={`${entry.rank}-${entry.displayName}`} style={{ borderBottom: '1px solid #D6DCE4' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700 }}>{entry.rank}</td>
                <td style={{ padding: '6px 8px' }}>{entry.displayName}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{entry.totalScore}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {entry.avgEfficiency !== null ? entry.avgEfficiency.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
