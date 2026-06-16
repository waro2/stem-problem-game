/**
 * SummaryScreen — End-of-session overlay  (GDD §6.5)
 * Shown after a win or stuck outcome: final score breakdown,
 * steps vs. par (optimal), elapsed time, and a Replay action.
 */

import React from 'react';
import type { Formula, Problem, SessionSummary } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface SummaryScreenProps {
  summary: SessionSummary;
  problem: Problem;
  onReplay: () => void;
  onOpenConcept?: (formula: Formula) => void;
  lang?: Lang;
}

export function SummaryScreen({ summary, problem, onReplay, onOpenConcept, lang = 'fr' }: SummaryScreenProps) {
  const { outcome, totalSteps, optimalSteps, elapsedSeconds, hintsUsed, score, activationPath } = summary;
  const isWin = outcome === 'win';
  const accentColor = isWin ? '#70AD47' : '#C00000';
  const accentBackground = isWin ? '#F0FBF0' : '#FBEEEE';
  const unactivatedFormula = !isWin
    ? problem.formulas.find(f => !activationPath.includes(f.id) && f.conceptName)
    : undefined;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(46, 46, 46, 0.45)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          minWidth: 320,
          maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            border: `2px solid ${accentColor}`,
            background: accentBackground,
            color: accentColor,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 18,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {isWin ? t('winTitle', lang) : t('stuckTitle', lang)}
        </div>

        <h2 style={{ margin: '0 0 16px', fontSize: 14, textTransform: 'uppercase', color: '#595959', textAlign: 'center' }}>
          {t('summaryTitle', lang)}
        </h2>

        {/* Score breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 16 }}>
          <Row label={t('scoreBaseLabel', lang)} value={`+${score.base}`} />
          <Row label={t('scoreStepPenaltyLabel', lang)} value={formatPenalty(score.stepPenalty)} />
          <Row label={t('scoreHintPenaltyLabel', lang)} value={formatPenalty(score.hintPenalty)} />
          <Row label={t('scoreTimeBonusLabel', lang)} value={`+${Math.round(score.timeBonus)}`} />
          <div style={{ borderTop: '1px solid #D6DCE4', margin: '4px 0' }} />
          <Row label={t('scoreTotalLabel', lang)} value={score.total} bold />
        </div>

        {/* Steps vs. par + hints + time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 24 }}>
          <Row label={t('stepsLabel', lang)} value={totalSteps} />
          <Row label={t('parLabel', lang)} value={optimalSteps} />
          <Row label={t('hintsLabel', lang)} value={hintsUsed} />
          <Row label={t('timeLabel', lang)} value={formatDuration(elapsedSeconds)} />
        </div>

        {unactivatedFormula && onOpenConcept && (
          <button
            onClick={() => onOpenConcept(unactivatedFormula)}
            style={{
              display: 'block',
              width: '100%',
              background: 'none',
              border: '1px solid #2E75B6',
              color: '#2E75B6',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            {t('conceptLinkLabel', lang)}{' '}
            {lang === 'fr' ? unactivatedFormula.conceptName_fr : unactivatedFormula.conceptName}
          </button>
        )}

        <button
          onClick={onReplay}
          style={{
            display: 'block',
            width: '100%',
            background: '#2E75B6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('replayButton', lang)}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: bold ? 15 : 13 }}>
      <span style={{ color: bold ? '#2E2E2E' : '#595959', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPenalty(value: number): string {
  return value === 0 ? '0' : `-${value}`;
}
