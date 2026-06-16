/**
 * Deduction replay — step-by-step reconstruction of a solution path
 * Source: GDD §3 (Activation rule), §6.5 (Session summary)
 *
 * Replays a SessionSummary's activationPath against a Problem, producing
 * one GameState snapshot per step so the UI can animate the cascade.
 *
 * Pure functions only — no side effects, no imports from React.
 */

import type { GameState, Problem } from './types';
import { initGameState, activateFormula } from './engine';

export interface ReplayStep {
  /** GameState after this step (step 0 is the initial state: I₀ = H). */
  state: GameState;
  /** Formula activated to reach this step, or null for the initial step. */
  activatedFormulaId: string | null;
  /** Variable revealed by that activation, or null for the initial step. */
  revealedVarId: string | null;
}

/**
 * Build one ReplayStep per entry in activationPath, starting from the
 * problem's initial state (step 0).
 */
export function buildReplaySteps(problem: Problem, activationPath: readonly string[]): ReplayStep[] {
  let state = initGameState(problem);
  const steps: ReplayStep[] = [{ state, activatedFormulaId: null, revealedVarId: null }];

  for (const formulaId of activationPath) {
    const before = state.identifiedVars;
    state = activateFormula(state, formulaId);
    const revealedVarId = [...state.identifiedVars].find(v => !before.has(v)) ?? null;
    steps.push({ state, activatedFormulaId: formulaId, revealedVarId });
  }

  return steps;
}
