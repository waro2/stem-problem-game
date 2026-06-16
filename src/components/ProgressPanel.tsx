/**
 * ProgressPanel — Right panel of the web UI  (GDD §5.1, §6.2, §6.3)
 * Shows live score, progress toward the conclusions C, and the hint system.
 */

import React from 'react';
import type { GameState, HintTier } from '@game/types';
import { computeScore } from '@game/engine';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface ProgressPanelProps {
  gameState: GameState;
  /** Seconds elapsed since session start, ticked by the parent component */
  elapsedSeconds: number;
  onRequestHint: (tier: HintTier) => void;
  /** When true, hint buttons are disabled (e.g. during the guided tutorial). */
  hintsDisabled?: boolean;
  lang?: Lang;
}

const HINT_TIERS: { tier: HintTier; key: 'hintTier1' | 'hintTier2' | 'hintTier3' }[] = [
  { tier: 1, key: 'hintTier1' },
  { tier: 2, key: 'hintTier2' },
  { tier: 3, key: 'hintTier3' },
];

export function ProgressPanel({ gameState, elapsedSeconds, onRequestHint, hintsDisabled = false, lang = 'fr' }: ProgressPanelProps) {
  const { problem, identifiedVars, steps, hintsUsed, phase } = gameState;

  const totalGoals = problem.conclusions.length;
  const identifiedGoals = problem.conclusions.filter(c => identifiedVars.has(c)).length;
  const progressPct = totalGoals === 0 ? 0 : Math.round((identifiedGoals / totalGoals) * 100);

  const score = computeScore(gameState, elapsedSeconds);
  const isOver = phase === 'win' || phase === 'stuck';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: '#595959' }}>
        {t('panelProgress', lang)}
      </h3>

      {/* Progress bar toward conclusions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span>{t('goalsLabel', lang)}</span>
          <span>{identifiedGoals} / {totalGoals}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          style={{ height: 10, borderRadius: 5, background: '#E7E9EC', overflow: 'hidden' }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: progressPct === 100 ? '#70AD47' : '#2E75B6',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        <Stat label={t('scoreLabel', lang)} value={score.total} bold />
        <Stat label={t('stepsLabel', lang)} value={`${steps} (${t('optimalLabel', lang)}: ${problem.optimalSteps})`} />
        <Stat label={t('hintsLabel', lang)} value={hintsUsed} />
      </div>

      {/* Outcome banner */}
      {phase === 'win' && (
        <Banner color="#70AD47" background="#F0FBF0">
          {t('winTitle', lang)}
        </Banner>
      )}
      {phase === 'stuck' && (
        <Banner color="#C00000" background="#FBEEEE">
          <div style={{ fontWeight: 700 }}>{t('stuckTitle', lang)}</div>
          <div style={{ fontWeight: 400, fontSize: 12, marginTop: 4 }}>{t('stuckMsg', lang)}</div>
        </Banner>
      )}

      {/* Hint system */}
      {!isOver && (
        <div>
          <div style={{ fontSize: 12, color: '#595959', marginBottom: 6 }}>{t('hintButton', lang)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {HINT_TIERS.map(({ tier, key }) => (
              <button
                key={tier}
                onClick={() => onRequestHint(tier)}
                disabled={hintsDisabled}
                style={{
                  background: '#fff',
                  border: `1px solid ${hintsDisabled ? '#D6DCE4' : '#2E75B6'}`,
                  color: hintsDisabled ? '#BFBFBF' : '#2E75B6',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: hintsDisabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >
                {t(key, lang)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#595959' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function Banner({ color, background, children }: { color: string; background: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        background,
        color,
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}
