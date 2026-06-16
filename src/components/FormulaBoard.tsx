/**
 * FormulaBoard — Centre panel of the web UI  (GDD §5.1)
 * Displays all formula cards with their activation state.
 * Activatable formulas pulse and show an Activate button.
 */

import React, { useState } from 'react';
import type { Formula } from '@game/types';
import type { FormulaEvaluation } from '@game/types';
import { t, tf, format } from '@i18n/strings';

/** Horizontal drag distance (px) required to trigger a swipe-activate. */
const SWIPE_THRESHOLD = 60;

interface FormulaBoardProps {
  formulas: Formula[];
  evaluations: FormulaEvaluation[];
  activatedFormulas: ReadonlySet<string>;
  /** Formula ID activated by the most recent step, for a brief golden halo (0.5s) */
  newlyActivatedFormulaId?: string | null;
  /** Enable swipe-to-activate on activatable cards (mobile layout) */
  swipeToActivate?: boolean;
  /** When true, all activation controls (button + swipe) are disabled. */
  disabled?: boolean;
  onActivate: (formulaId: string) => void;
  lang?: 'fr' | 'en';
}

export function FormulaBoard({
  formulas,
  evaluations,
  activatedFormulas,
  newlyActivatedFormulaId = null,
  swipeToActivate = false,
  disabled = false,
  onActivate,
  lang = 'fr',
}: FormulaBoardProps) {
  const evalMap = new Map(evaluations.map(e => [e.formulaId, e]));

  // Sort: activatable first, then locked, then done
  const sorted = [...formulas].sort((a, b) => {
    const ea = evalMap.get(a.id);
    const eb = evalMap.get(b.id);
    const doneA = activatedFormulas.has(a.id) ? 2 : 0;
    const doneB = activatedFormulas.has(b.id) ? 2 : 0;
    const activeA = ea?.isActivatable ? -1 : 0;
    const activeB = eb?.isActivatable ? -1 : 0;
    return (doneA + activeA) - (doneB + activeB);
  });

  return (
    <div role="group" aria-label={t('panelFormulas', lang)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(formula => {
        const ev = evalMap.get(formula.id);
        const isDone = activatedFormulas.has(formula.id);
        const isActivatable = ev?.isActivatable ?? false;
        const expr = lang === 'fr' && formula.expression_fr
          ? formula.expression_fr
          : formula.expression;

        return (
          <FormulaCard
            key={formula.id}
            formula={formula}
            expression={expr}
            evaluation={ev}
            isDone={isDone}
            isActivatable={isActivatable}
            isNewlyActivated={newlyActivatedFormulaId === formula.id}
            swipeToActivate={swipeToActivate}
            disabled={disabled}
            onActivate={onActivate}
            lang={lang}
          />
        );
      })}
    </div>
  );
}

// ── Individual card ──────────────────────────────────────────────────────────

interface FormulaCardProps {
  formula: Formula;
  expression: string;
  evaluation?: FormulaEvaluation | undefined;
  isDone: boolean;
  isActivatable: boolean;
  isNewlyActivated: boolean;
  swipeToActivate: boolean;
  disabled: boolean;
  onActivate: (id: string) => void;
  lang: 'fr' | 'en';
}

function FormulaCard({
  formula, expression, evaluation, isDone, isActivatable, isNewlyActivated, swipeToActivate, disabled, onActivate, lang,
}: FormulaCardProps) {
  const label = t('activateButton', lang);
  const unknownMsg = tf('unknownsRemaining', lang)(evaluation?.unknownCount ?? 0);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = React.useRef(0);

  const canSwipe = swipeToActivate && isActivatable && !disabled;
  // Operable: this card's primary action (activation) can be triggered right now —
  // drives both the click/keyboard handlers and the role="button" vs role="group" choice.
  const operable = isActivatable && !disabled;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipe) return;
    touchStartX.current = e.touches[0]!.clientX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canSwipe || !dragging) return;
    const delta = e.touches[0]!.clientX - touchStartX.current;
    setDragX(Math.max(0, delta));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!canSwipe) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      // Swallow the synthetic click that follows touchend so the card's
      // onClick doesn't activate the formula a second time.
      e.preventDefault();
      onActivate(formula.id);
    }
    setDragX(0);
  };

  const handleClick = () => {
    if (operable) onActivate(formula.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!operable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(formula.id);
    }
  };

  const stateLabel = isDone
    ? t('formulaActivated', lang)
    : isActivatable
    ? t('formulaActivatable', lang)
    : t('formulaLocked', lang);

  const detailLabel = isDone
    ? null
    : isActivatable
    ? format(t('formulaReveals', lang), evaluation?.revealedVarId ?? '')
    : unknownMsg;

  const ariaLabel = [`${t('formulaAriaPrefix', lang)} ${formula.id}: ${expression}`, stateLabel, detailLabel]
    .filter((part): part is string => part !== null)
    .join(' — ');

  return (
    <div
      role={operable ? 'button' : 'group'}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={isActivatable && disabled ? true : undefined}
      onClick={operable ? handleClick : undefined}
      onKeyDown={handleKeyDown}
      className={isNewlyActivated ? 'golden-halo' : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        border: isDone
          ? '2px solid #70AD47'
          : isActivatable
          ? '2px solid #F4B942'
          : '1px solid #D6DCE4',
        borderRadius: 8,
        padding: '10px 14px',
        background: isDone ? '#F0FBF0' : isActivatable ? '#FFFDF5' : '#FAFAFA',
        opacity: isDone ? 0.7 : 1,
        boxShadow: isActivatable ? '0 0 0 3px rgba(244,185,66,0.3)' : 'none',
        transform: dragX > 0 ? `translateX(${dragX}px)` : undefined,
        transition: dragging ? 'none' : 'all 0.2s',
        touchAction: canSwipe ? 'pan-y' : undefined,
        cursor: operable ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
        {isDone ? '✓ ' : isActivatable ? '⚡ ' : '🔒 '}
        {formula.id}: <span style={{ fontFamily: 'monospace' }}>{expression}</span>
      </div>

      {!isDone && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#595959' }}>
            {detailLabel}
          </span>
          {isActivatable && !swipeToActivate && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              disabled={disabled}
              style={{
                background: disabled ? '#D6DCE4' : '#C55A11',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 14px',
                fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 12,
              }}
            >
              {label}
            </button>
          )}
        </div>
      )}

      {canSwipe && (
        <div style={{ fontSize: 11, color: '#C55A11', marginTop: 6, textAlign: 'right' }}>
          {t('swipeToActivate', lang)}
        </div>
      )}

      {formula.conceptName && isActivatable && (
        <div style={{ fontSize: 11, color: '#2E75B6', marginTop: 4 }}>
          💡 {lang === 'fr' ? formula.conceptName_fr : formula.conceptName}
        </div>
      )}
    </div>
  );
}
