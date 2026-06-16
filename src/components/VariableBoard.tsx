/**
 * VariableBoard — Left panel of the web UI  (GDD §5.1)
 * Displays every variable in V with its current status:
 *  - Known / Unknown (identifiedVars membership)
 *  - Goal (member of the conclusions set C)
 *  - Newly identified (highlighted right after an activation)
 */

import React from 'react';
import type { Variable } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface VariableBoardProps {
  variables: Variable[];
  identifiedVars: ReadonlySet<string>;
  hypotheses: string[];
  conclusions: string[];
  /** Variable ID revealed by the most recent activation, for a brief highlight */
  newlyIdentifiedVarId?: string | null;
  lang?: Lang;
}

export function VariableBoard({
  variables,
  identifiedVars,
  hypotheses,
  conclusions,
  newlyIdentifiedVarId = null,
  lang = 'fr',
}: VariableBoardProps) {
  const hypothesisSet = new Set(hypotheses);
  const goalSet = new Set(conclusions);

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, textTransform: 'uppercase', color: '#595959' }}>
        {t('panelVariables', lang)}
      </h3>
      <div role="list" aria-label={t('panelVariables', lang)} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {variables.map(variable => (
          <VariableCard
            key={variable.id}
            variable={variable}
            isIdentified={identifiedVars.has(variable.id)}
            isHypothesis={hypothesisSet.has(variable.id)}
            isGoal={goalSet.has(variable.id)}
            isNewlyFound={newlyIdentifiedVarId === variable.id}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

// ── Individual card ──────────────────────────────────────────────────────────

interface VariableCardProps {
  variable: Variable;
  isIdentified: boolean;
  isHypothesis: boolean;
  isGoal: boolean;
  isNewlyFound: boolean;
  lang: Lang;
}

function VariableCard({
  variable, isIdentified, isHypothesis, isGoal, isNewlyFound, lang,
}: VariableCardProps) {
  const label = lang === 'fr' ? variable.label_fr : variable.label;

  const statusText = isNewlyFound
    ? t('varNewlyFound', lang)
    : isIdentified
    ? t('varKnown', lang)
    : isGoal
    ? t('varGoal', lang)
    : t('varUnknown', lang);

  const icon = isNewlyFound ? '✨' : isIdentified ? '✓' : isGoal ? '🎯' : '❓';

  const borderColor = isNewlyFound
    ? '#F4B942'
    : isIdentified
    ? '#70AD47'
    : isGoal
    ? '#2E75B6'
    : '#D6DCE4';

  const background = isNewlyFound
    ? '#FFFDF5'
    : isIdentified
    ? '#F0FBF0'
    : isGoal
    ? '#EEF5FC'
    : '#FAFAFA';

  return (
    <div
      role="listitem"
      aria-label={`${t('variableAriaPrefix', lang)} ${variable.id}: ${label} — ${statusText}`}
      title={isHypothesis ? t('varHypothesisTooltip', lang) : undefined}
      className={isNewlyFound ? 'flash-blue' : undefined}
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 110,
        background,
        boxShadow: isNewlyFound ? '0 0 0 3px rgba(244,185,66,0.3)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>
        {icon} {variable.id}
        {variable.unit && (
          <span style={{ fontWeight: 400, fontSize: 11, color: '#595959' }}> ({variable.unit})</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#404040', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#8C8C8C', marginTop: 4, textTransform: 'uppercase' }}>
        {statusText}
      </div>
    </div>
  );
}
