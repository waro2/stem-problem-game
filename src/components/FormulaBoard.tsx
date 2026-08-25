/**
 * FormulaBoard — Centre panel of the web UI  (GDD §5.1)
 * "Mode défi maximal": every formula looks identical and offers the same
 * "Activer" button, whether or not it's actually activatable right now —
 * the player reasons from the problem statement, not from a visual cue.
 * Wrong guesses are handled by the store (penalty) and surfaced here as a
 * brief red flash on the clicked card.
 */

import React, { useEffect, useState } from 'react';
import type { Formula } from '@game/types';
import type { FormulaEvaluation } from '@game/types';
import { t } from '@i18n/strings';

/** Horizontal drag distance (px) required to trigger a swipe-activate. */
const SWIPE_THRESHOLD = 60;

/** How long the red "incorrect" flash stays on the clicked card (ms). */
const ERROR_FLASH_DURATION = 800;

interface FormulaBoardProps {
  formulas: Formula[];
  evaluations: FormulaEvaluation[];
  activatedFormulas: ReadonlySet<string>;
  /** Formula ID activated by the most recent step, for a brief golden halo (0.5s) */
  newlyActivatedFormulaId?: string | null;
  /** Enable swipe-to-activate on all not-yet-done cards (mobile layout) */
  swipeToActivate?: boolean;
  /** When true, all activation controls (button + swipe) are disabled. */
  disabled?: boolean;
  /** Most recent failed activation attempt ("mode défi maximal"), if any, for the red flash. */
  errorFlash?: { formulaId: string; key: number } | null;
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
  errorFlash = null,
  onActivate,
  lang = 'fr',
}: FormulaBoardProps) {
  const evalMap = new Map(evaluations.map(e => [e.formulaId, e]));

  // Sort: not-yet-done formulas keep their declared order (no activatable cue), done ones sink to the bottom.
  const sorted = [...formulas].sort((a, b) => {
    const doneA = activatedFormulas.has(a.id) ? 1 : 0;
    const doneB = activatedFormulas.has(b.id) ? 1 : 0;
    return doneA - doneB;
  });

  return (
    <div role="group" aria-label={t('panelFormulas', lang)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(formula => {
        const ev = evalMap.get(formula.id);
        const isDone = activatedFormulas.has(formula.id);
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
            isNewlyActivated={newlyActivatedFormulaId === formula.id}
            swipeToActivate={swipeToActivate}
            disabled={disabled}
            errorFlashKey={errorFlash?.formulaId === formula.id ? errorFlash.key : null}
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
  isNewlyActivated: boolean;
  swipeToActivate: boolean;
  disabled: boolean;
  /** Non-null key means: this card was just guessed wrong — flash red. */
  errorFlashKey: number | null;
  onActivate: (id: string) => void;
  lang: 'fr' | 'en';
}

function FormulaCard({
  formula, expression, isDone, isNewlyActivated, swipeToActivate, disabled, errorFlashKey, onActivate, lang,
}: FormulaCardProps) {
  const label = t('activateButton', lang);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = React.useRef(0);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (errorFlashKey === null) return;
    setFlashing(true);
    const timeout = setTimeout(() => setFlashing(false), ERROR_FLASH_DURATION);
    return () => clearTimeout(timeout);
  }, [errorFlashKey]);

  // Operable: this card's primary action (activation attempt) can be triggered right now —
  // every not-yet-done card is operable, regardless of whether it's truly activatable.
  const operable = !isDone && !disabled;
  const canSwipe = swipeToActivate && operable;

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

  const stateLabel = isDone ? t('formulaActivated', lang) : t('formulaAvailable', lang);
  const ariaLabel = `${t('formulaAriaPrefix', lang)} ${formula.id}: ${expression} — ${stateLabel}`;

  return (
    <div
      role={operable ? 'button' : 'group'}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={!isDone && disabled ? true : undefined}
      onClick={operable ? handleClick : undefined}
      onKeyDown={handleKeyDown}
      className={isNewlyActivated ? 'golden-halo' : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        border: isDone
          ? '2px solid #70AD47'
          : flashing
          ? '1.5px solid #E05555'
          : '1px solid #D6DCE4',
        borderRadius: 8,
        padding: '10px 14px',
        background: isDone ? '#F0FBF0' : flashing ? '#FFF0F0' : '#FAFAFA',
        opacity: isDone ? 0.7 : 1,
        transform: dragX > 0 ? `translateX(${dragX}px)` : undefined,
        transition: dragging ? 'none' : 'all 0.2s',
        touchAction: canSwipe ? 'pan-y' : undefined,
        cursor: operable ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
        {isDone ? '✓ ' : ''}
        {formula.id}: <span style={{ fontFamily: 'monospace' }}>{expression}</span>
      </div>

      {!isDone && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span />
          {!swipeToActivate && (
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

      {formula.conceptName && !isDone && (
        <div style={{ fontSize: 11, color: '#2E75B6', marginTop: 4 }}>
          💡 {lang === 'fr' ? formula.conceptName_fr : formula.conceptName}
        </div>
      )}
    </div>
  );
}
