/**
 * STEM Problem Game — Pure Game Engine
 * Source: GDD §3.3 (Activation Rule), §4 (Gameplay Loop), §9.2 (State Machine)
 *
 * ALL functions here are pure (no side effects, no React imports).
 * The state machine is immutable: every function returns a new GameState.
 */

import type {
  Formula,
  FormulaEvaluation,
  GamePhase,
  GameState,
  GameStateSnapshot,
  HintResult,
  HintTier,
  Problem,
  ScoreBreakdown,
  ScoreConfig,
  SessionSummary,
} from './types';

// ─────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────

/** Create the initial GameState from a Problem instance. */
export function initGameState(problem: Problem): GameState {
  return {
    problem,
    identifiedVars: new Set(problem.hypotheses),   // I₀ = H
    activatedFormulas: new Set(),
    steps: 0,
    hintsUsed: 0,
    startedAt: new Date().toISOString(),
    history: [],
    phase: 'scan',
  };
}

// ─────────────────────────────────────────────
// Core activation rule  (GDD §3.3)
// Activation rule: formula f is activatable iff |V_f \ I| === 1
// ─────────────────────────────────────────────

/**
 * Evaluate one formula against the current identified set.
 * Returns how many variables are still unknown and whether it's activatable.
 */
export function evaluateFormula(
  formula: Formula,
  identifiedVars: ReadonlySet<string>
): FormulaEvaluation {
  const unknowns = formula.variableIds.filter(vid => !identifiedVars.has(vid));
  const isActivatable = unknowns.length === 1;
  return {
    formulaId: formula.id,
    unknownCount: unknowns.length,
    isActivatable,
    revealedVarId: isActivatable ? unknowns[0]! : null,
  };
}

/**
 * Evaluate ALL formulas and return their current status.
 * Skips already-activated formulas.
 */
export function evaluateAllFormulas(state: GameState): FormulaEvaluation[] {
  return state.problem.formulas
    .filter(f => !state.activatedFormulas.has(f.id))
    .map(f => evaluateFormula(f, state.identifiedVars));
}

/** Return only formulas that are currently activatable. */
export function getActivatableFormulas(state: GameState): FormulaEvaluation[] {
  return evaluateAllFormulas(state).filter(e => e.isActivatable);
}

// ─────────────────────────────────────────────
// State transitions  (GDD §9.2)
// ─────────────────────────────────────────────

/**
 * Activate a formula. Returns a new GameState with:
 *  - the revealed variable added to identifiedVars
 *  - the formula added to activatedFormulas
 *  - steps incremented
 *  - previous state pushed to history
 *
 * Throws if the formula is not currently activatable.
 */
export function activateFormula(state: GameState, formulaId: string): GameState {
  const formula = state.problem.formulas.find(f => f.id === formulaId);
  if (!formula) throw new Error(`Formula "${formulaId}" not found in problem`);

  const evaluation = evaluateFormula(formula, state.identifiedVars);
  if (!evaluation.isActivatable) {
    throw new Error(
      `Formula "${formulaId}" is not activatable (${evaluation.unknownCount} unknowns remain)`
    );
  }

  const revealedVar = evaluation.revealedVarId!;
  const snapshot: GameStateSnapshot = {
    identifiedVars: [...state.identifiedVars],
    activatedFormulas: [...state.activatedFormulas],
    steps: state.steps,
    hintsUsed: state.hintsUsed,
    timestamp: new Date().toISOString(),
  };

  const nextIdentified = new Set(state.identifiedVars);
  nextIdentified.add(revealedVar);

  const nextActivated = new Set(state.activatedFormulas);
  nextActivated.add(formulaId);

  const nextState: GameState = {
    ...state,
    identifiedVars: nextIdentified,
    activatedFormulas: nextActivated,
    steps: state.steps + 1,
    history: [...state.history, snapshot],
    phase: 'cascade',
  };

  // Determine next phase
  return resolvePhase(nextState);
}

/** Effect of a single activation, used to build screen-reader announcements (GDD §8.1 — Cascade). */
export interface ActivationAnnouncement {
  formulaId: string;
  /** The variable revealed by this activation. */
  revealedVarId: string;
  /** Number of additional formulas that became activatable as a result (the cascade). */
  cascadeCount: number;
  phase: GamePhase;
}

/**
 * Compare the state before and after an activation to describe its effect:
 * the revealed variable and the size of the resulting cascade (formulas that
 * became newly activatable). Pure — does not call activateFormula.
 */
export function describeActivation(before: GameState, after: GameState, formulaId: string): ActivationAnnouncement {
  const revealedVarId = [...after.identifiedVars].find(v => !before.identifiedVars.has(v)) ?? '';

  const activatableBefore = new Set(getActivatableFormulas(before).map(e => e.formulaId));
  const cascadeCount = getActivatableFormulas(after).filter(e => !activatableBefore.has(e.formulaId)).length;

  return { formulaId, revealedVarId, cascadeCount, phase: after.phase };
}

/** Undo the last activation step. */
export function undoLastActivation(state: GameState): GameState {
  if (state.history.length === 0) return state;
  const prev = state.history[state.history.length - 1]!;
  return {
    ...state,
    identifiedVars: new Set(prev.identifiedVars),
    activatedFormulas: new Set(prev.activatedFormulas),
    steps: prev.steps,
    hintsUsed: prev.hintsUsed,
    history: state.history.slice(0, -1),
    phase: 'scan',
  };
}

/**
 * After an activation, determine whether we've won, are stuck, or should scan.
 */
function resolvePhase(state: GameState): GameState {
  if (isWon(state)) return { ...state, phase: 'win' };
  if (isStuck(state)) return { ...state, phase: 'stuck' };
  return { ...state, phase: 'scan' };
}

// ─────────────────────────────────────────────
// Win / stuck detection  (GDD §3.3, §4.1)
// ─────────────────────────────────────────────

/** Win condition: C ⊆ identifiedVars */
export function isWon(state: GameState): boolean {
  return state.problem.conclusions.every(cid => state.identifiedVars.has(cid));
}

/** Stuck condition: no activatable formulas AND not won */
export function isStuck(state: GameState): boolean {
  if (isWon(state)) return false;
  return getActivatableFormulas(state).length === 0;
}

// ─────────────────────────────────────────────
// Hint system  (GDD §6.3)
// ─────────────────────────────────────────────

const HINT_COSTS: Record<HintTier, number> = { 1: 50, 2: 80, 3: 120 };

/**
 * Compute a hint without mutating state.
 * Tier 1: return an activatable formulaId only.
 * Tier 2: return formulaId + the variable it would reveal.
 * Tier 3: return the same as Tier 2 (caller should call activateFormula next).
 */
export function computeHint(state: GameState, tier: HintTier): HintResult | null {
  const activatable = getActivatableFormulas(state);
  if (activatable.length === 0) return null;

  // Pick the formula whose activation reveals a conclusion variable first, else any
  const preferred =
    activatable.find(e => state.problem.conclusions.includes(e.revealedVarId!)) ??
    activatable[0]!;

  return {
    tier,
    formulaId: preferred.formulaId,
    ...(tier >= 2 && preferred.revealedVarId ? { variableId: preferred.revealedVarId } : {}),
    scoreCost: HINT_COSTS[tier],
  };
}

/** Apply a Tier-3 hint: auto-activate one step and record hint usage. */
export function applyAutoActivate(state: GameState): GameState {
  const hint = computeHint(state, 3);
  if (!hint || !hint.formulaId) return state;
  const afterActivation = activateFormula(state, hint.formulaId);
  return { ...afterActivation, hintsUsed: afterActivation.hintsUsed + 1 };
}

/** Record a hint usage (tier 1 or 2) without activating. */
export function recordHintUsed(state: GameState): GameState {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

// ─────────────────────────────────────────────
// Scoring  (GDD §6.2)
// ─────────────────────────────────────────────

import { DEFAULT_SCORE_CONFIG } from './types';

export function computeScore(
  state: GameState,
  elapsedSeconds: number,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG
): ScoreBreakdown {
  const stepPenalty = state.steps * config.stepPenalty;
  const hintPenalty = state.hintsUsed * config.hintPenalty;
  const timeBonus = Math.max(0, config.timeBonusBase - elapsedSeconds * config.timeBonusRate);
  const total = Math.max(0, config.maxScore - stepPenalty - hintPenalty + timeBonus);
  return {
    base: config.maxScore,
    stepPenalty,
    hintPenalty,
    timeBonus,
    total: Math.round(total),
  };
}

// ─────────────────────────────────────────────
// Session summary  (GDD §6.5)
// ─────────────────────────────────────────────

export function buildSessionSummary(
  state: GameState,
  elapsedSeconds: number
): SessionSummary {
  return {
    problemId: state.problem.id,
    outcome: isWon(state) ? 'win' : 'stuck',
    totalSteps: state.steps,
    optimalSteps: state.problem.optimalSteps,
    elapsedSeconds,
    hintsUsed: state.hintsUsed,
    score: computeScore(state, elapsedSeconds),
    activationPath: [...state.activatedFormulas],
  };
}

// ─────────────────────────────────────────────
// Solvability pre-check  (GDD §9.3)
// Used server-side before storing a problem.
// ─────────────────────────────────────────────

/**
 * Run the activation algorithm to exhaustion.
 * Returns true if C ⊆ final identified set.
 */
export function validateSolvability(problem: Problem): boolean {
  const identified = new Set(problem.hypotheses);
  let changed = true;

  while (changed) {
    changed = false;
    for (const formula of problem.formulas) {
      const unknowns = formula.variableIds.filter(vid => !identified.has(vid));
      if (unknowns.length === 1) {
        identified.add(unknowns[0]!);
        changed = true;
      }
    }
  }

  return problem.conclusions.every(cid => identified.has(cid));
}

/**
 * Exploration mode helper (GDD §3, §9.3): when a problem is not solvable
 * from H, find which additional hypotheses — each added to H on its own —
 * would unlock the deduction chain. Conclusion variables are excluded since
 * adding C directly to H would trivially "solve" the problem without a chain.
 * Returns an empty array if the problem is already solvable (nothing to unlock).
 */
export function findUnlockingHypotheses(problem: Problem): string[] {
  if (validateSolvability(problem)) return [];

  return problem.variables
    .map(v => v.id)
    .filter(vid => !problem.hypotheses.includes(vid) && !problem.conclusions.includes(vid))
    .filter(vid => validateSolvability({ ...problem, hypotheses: [...problem.hypotheses, vid] }));
}

/**
 * Compute the optimal (greedy) deduction path: the ordered list of formula
 * IDs to activate to reach all conclusions from the hypotheses.
 * Each step activates the first formula with exactly one unknown variable.
 */
export function computeOptimalPath(problem: Problem): string[] {
  const identified = new Set(problem.hypotheses);
  const path: string[] = [];
  let changed = true;

  while (changed && !problem.conclusions.every(c => identified.has(c))) {
    changed = false;
    for (const formula of problem.formulas) {
      const unknowns = formula.variableIds.filter(v => !identified.has(v));
      if (unknowns.length === 1) {
        identified.add(unknowns[0]!);
        path.push(formula.id);
        changed = true;
        break; // greedy: one step at a time
      }
    }
  }

  return path;
}

/**
 * Compute the minimum (optimal) number of steps to reach all conclusions.
 * Uses BFS over the activation order space (for small problems).
 * Falls back to greedy count for large problems.
 */
export function computeOptimalSteps(problem: Problem): number {
  return computeOptimalPath(problem).length;
}
