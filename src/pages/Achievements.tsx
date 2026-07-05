/**
 * Achievements — Badge showcase  (GDD §6)
 * Displays the player's unlocked badges:
 *  - "Domain Mastered"  — every problem in a domain is completed
 *  - "Par Achieved"     — a problem solved in the optimal number of steps
 *  - "Lightning Speed"  — a problem solved in under 60 seconds
 */

import React, { useEffect, useMemo, useState } from 'react';
import { fetchProblemLibrary } from '@api/library';
import type { ProblemSummary } from '@api/library';
import type { Domain } from '@game/types';
import { computeMasteredDomains } from '@game/achievements';
import { getCompletedProblemIds } from '@game/progressionStorage';
import { getUnlockedBadges, markDomainMastered } from '@game/achievementsStorage';
import { t, tf, domainLabel } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

const AMBER = '#EF9F27';
import { LangSwitch } from '@components/GameScreen';

const DOMAINS: readonly Domain[] = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'];

interface AchievementsProps {
  apiUrl: string;
  userId: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export function Achievements({ apiUrl, userId, lang, onLangChange }: AchievementsProps) {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [badgesVersion, setBadgesVersion] = useState(0);

  useEffect(() => {
    fetchProblemLibrary(apiUrl, userId)
      .then(setProblems)
      .catch(err => {
        console.error('[achievements] failed to load data', err);
        setError(true);
      });
  }, [apiUrl, userId]);

  const masteredDomains = useMemo(() => {
    if (!problems) return new Set<Domain>();
    const completedIds = new Set(getCompletedProblemIds());
    for (const problem of problems) {
      if (problem.completed) completedIds.add(problem.id);
    }
    return computeMasteredDomains(problems.map(p => ({ id: p.id, domain: p.domain })), completedIds);
  }, [problems]);

  // Persist any newly-mastered domains so the badge survives reloads.
  useEffect(() => {
    if (masteredDomains.size === 0) return;
    const unlocked = getUnlockedBadges();
    let changed = false;
    for (const domain of masteredDomains) {
      if (!unlocked.domainMastered.has(domain)) {
        markDomainMastered(domain);
        changed = true;
      }
    }
    if (changed) setBadgesVersion(v => v + 1);
  }, [masteredDomains]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const badges = useMemo(() => getUnlockedBadges(), [badgesVersion]); // badgesVersion is a version-bump trigger, not a closure ref

  const parProblems = useMemo(
    () => (problems ?? []).filter(p => badges.parAchieved.has(p.id)),
    [problems, badges]
  );
  const speedProblems = useMemo(
    () => (problems ?? []).filter(p => badges.lightningSpeed.has(p.id)),
    [problems, badges]
  );

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
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('achievementsTitle', lang)}</h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: 24, maxWidth: 1000, margin: '0 auto' }}>
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

        {!error && !problems && <div style={{ color: '#595959', fontSize: 14 }}>{t('loading', lang)}</div>}

        {problems && (
          <>
            {/* Global progress bar */}
            {(() => {
              const total = DOMAINS.length + parProblems.length + speedProblems.length;
              const unlocked = badges.domainMastered.size + badges.parAchieved.size + badges.lightningSpeed.size;
              const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#595959' }}>
                    {tf('achievementProgressLabel', lang)(unlocked, total)}
                  </span>
                  <div style={{ height: 8, borderRadius: 4, background: '#E8ECF0', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: AMBER, borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })()}

            <Section title={t('badgeDomainMasteredTitle', lang)}>
              <BadgeGrid>
                {DOMAINS.map(domain => (
                  <BadgeCard
                    key={domain}
                    title={domainLabel(domain, lang)}
                    description={t('badgeDomainMasteredDesc', lang)}
                    unlocked={badges.domainMastered.has(domain)}
                    lang={lang}
                  />
                ))}
              </BadgeGrid>
            </Section>

            <Section title={t('badgeParAchievedTitle', lang)}>
              {parProblems.length === 0 ? (
                <div style={{ color: '#595959', fontSize: 13 }}>{t('noBadgesMsg', lang)}</div>
              ) : (
                <BadgeGrid>
                  {parProblems.map(problem => (
                    <BadgeCard
                      key={problem.id}
                      title={lang === 'fr' ? problem.title_fr : problem.title}
                      description={t('badgeParAchievedDesc', lang)}
                      unlocked
                      lang={lang}
                    />
                  ))}
                </BadgeGrid>
              )}
            </Section>

            <Section title={t('badgeLightningSpeedTitle', lang)}>
              {speedProblems.length === 0 ? (
                <div style={{ color: '#595959', fontSize: 13 }}>{t('noBadgesMsg', lang)}</div>
              ) : (
                <BadgeGrid>
                  {speedProblems.map(problem => (
                    <BadgeCard
                      key={problem.id}
                      title={lang === 'fr' ? problem.title_fr : problem.title}
                      description={t('badgeLightningSpeedDesc', lang)}
                      unlocked
                      lang={lang}
                    />
                  ))}
                </BadgeGrid>
              )}
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
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 15, color: '#2E2E2E' }}>{title}</h2>
      {children}
    </section>
  );
}

function BadgeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {children}
    </div>
  );
}

function BadgeCard({
  title,
  description,
  unlocked,
  lang,
}: {
  title: string;
  description: string;
  unlocked: boolean;
  lang: Lang;
}) {
  return (
    <div
      style={{
        background: unlocked ? '#fff' : '#F0F1F3',
        border: `1px solid ${unlocked ? '#FFD966' : '#D6DCE4'}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: unlocked ? 1 : 0.6,
      }}
    >
      <div style={{ fontSize: 28 }}>{unlocked ? '🏆' : '🔒'}</div>
      <h3 style={{ margin: 0, fontSize: 14, color: '#2E2E2E' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 12, color: '#595959' }}>{description}</p>
      {!unlocked && (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#A6A6A6' }}>{t('badgeLockedStatus', lang)}</span>
      )}
    </div>
  );
}
