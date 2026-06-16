/**
 * DeductionReplay — Step-by-step playback of a solution path  (GDD §6.5)
 * Replays summary.activationPath against the problem's initial state,
 * animating each activation in order with play/pause/speed controls.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Problem } from '@game/types';
import { buildReplaySteps } from '@game/replay';
import { evaluateAllFormulas } from '@game/engine';
import { t, tf } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { VariableBoard } from './VariableBoard';
import { FormulaBoard } from './FormulaBoard';

/** Playback speed multipliers offered to the player. */
const SPEEDS: readonly number[] = [0.5, 1, 2, 4];

/** Time (ms) each step is shown at 1× speed. */
const BASE_STEP_DURATION_MS = 1500;

interface DeductionReplayProps {
  problem: Problem;
  /** Ordered list of formula IDs, e.g. summary.activationPath. */
  activationPath: readonly string[];
  lang?: Lang;
}

export function DeductionReplay({ problem, activationPath, lang = 'fr' }: DeductionReplayProps) {
  const steps = useMemo(() => buildReplaySteps(problem, activationPath), [problem, activationPath]);
  const lastIndex = steps.length - 1;

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  // Auto-advance through the cascade while playing.
  useEffect(() => {
    if (!playing) return;
    if (currentStep >= lastIndex) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setCurrentStep(s => Math.min(s + 1, lastIndex)), BASE_STEP_DURATION_MS / speed);
    return () => clearTimeout(id);
  }, [playing, currentStep, lastIndex, speed]);

  const step = steps[currentStep]!;
  const evaluations = useMemo(() => evaluateAllFormulas(step.state), [step.state]);

  const togglePlay = () => {
    if (currentStep >= lastIndex) setCurrentStep(0);
    setPlaying(p => !p);
  };

  const goToStep = (index: number) => {
    setPlaying(false);
    setCurrentStep(Math.max(0, Math.min(lastIndex, index)));
  };

  const stepDescription = step.activatedFormulaId
    ? `${t('deductionStepActivated', lang)} ${step.activatedFormulaId} — ${t('deductionReveals', lang)} ${step.revealedVarId}`
    : t('deductionStepInitial', lang);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16, color: '#2E2E2E' }}>{t('deductionReplayTitle', lang)}</h2>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          aria-label={t('replayPrevStep', lang)}
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0}
          style={controlButtonStyle(currentStep === 0)}
        >
          ⏮
        </button>

        <button
          aria-label={playing ? t('replayPause', lang) : t('replayPlay', lang)}
          onClick={togglePlay}
          style={controlButtonStyle(false, true)}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <button
          aria-label={t('replayNextStep', lang)}
          onClick={() => goToStep(currentStep + 1)}
          disabled={currentStep >= lastIndex}
          style={controlButtonStyle(currentStep >= lastIndex)}
        >
          ⏭
        </button>

        <input
          type="range"
          min={0}
          max={lastIndex}
          value={currentStep}
          onChange={e => goToStep(Number(e.target.value))}
          style={{ flex: 1, minWidth: 120 }}
        />

        <span style={{ fontSize: 12, color: '#595959', minWidth: 70, textAlign: 'right' }}>
          {tf('replayStepIndicator', lang)(currentStep, lastIndex)}
        </span>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#595959' }}>{t('replaySpeedLabel', lang)}</span>
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                border: '1px solid #2E75B6',
                background: speed === s ? '#2E75B6' : '#fff',
                color: speed === s ? '#fff' : '#2E75B6',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Current step description */}
      <div
        style={{
          border: '1px solid #D6DCE4',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          color: '#2E2E2E',
          background: '#FAFAFA',
        }}
      >
        {stepDescription}
      </div>

      {/* State at this step */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <VariableBoard
          variables={problem.variables}
          identifiedVars={step.state.identifiedVars}
          hypotheses={problem.hypotheses}
          conclusions={problem.conclusions}
          newlyIdentifiedVarId={step.revealedVarId}
          lang={lang}
        />
        <FormulaBoard
          formulas={problem.formulas}
          evaluations={evaluations}
          activatedFormulas={step.state.activatedFormulas}
          newlyActivatedFormulaId={step.activatedFormulaId}
          disabled
          onActivate={() => {}}
          lang={lang}
        />
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function controlButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    border: '1px solid #2E75B6',
    background: disabled ? '#D6DCE4' : primary ? '#2E75B6' : '#fff',
    color: disabled ? '#8C8C8C' : primary ? '#fff' : '#2E75B6',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 16,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
