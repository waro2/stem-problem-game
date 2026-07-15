/**
 * STEM Problem Game — Core Domain Types
 * Source: Game Design Document §3 (Mathematical Foundation)
 *
 * T = (V, F)   — Theory
 * P = (T, H, C) — Problem instance
 */

// ─────────────────────────────────────────────
// Enumerations
// ─────────────────────────────────────────────

export type Domain =
  | 'physics'
  | 'chemistry'
  | 'mathematics'
  | 'biology'
  | 'engineering';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type Platform = 'web' | 'ios' | 'android';

export type Language = 'fr' | 'en';

export type HintTier = 1 | 2 | 3;

export type GameOutcome = 'win' | 'stuck';

export type UserRole = 'student' | 'instructor' | 'researcher' | 'admin';

// ─────────────────────────────────────────────
// Theory: V — Variables
// ─────────────────────────────────────────────

/** A single variable in the theory T = (V, F) */
export interface Variable {
  /** Unique identifier, e.g. "v", "F", "resistance" */
  id: string;
  /** Human-readable label in English */
  label: string;
  /** Human-readable label in French */
  label_fr: string;
  /** Physical/mathematical unit, e.g. "m/s", "N", "Ω" */
  unit?: string;
  /** STEM domain this variable belongs to */
  domain: Domain;
}

// ─────────────────────────────────────────────
// Theory: F — Formulas
// ─────────────────────────────────────────────

/** A single formula in the theory T = (V, F).
 *  Represented as a row in the binary matrix M[f][v].
 *  M[f][v] = 1  ⟺  formula f involves variable v
 */
export interface Formula {
  /** Unique identifier, e.g. "f1" */
  id: string;
  /** Symbolic expression, e.g. "d = v * t" */
  expression: string;
  /** Symbolic expression in French notation if different */
  expression_fr?: string;
  /** The set of variable IDs this formula involves (= row of the binary matrix) */
  variableIds: string[];
  /** Optional concept name for the learning library link */
  conceptName?: string;
  conceptName_fr?: string;
}

// ─────────────────────────────────────────────
// Problem Instance: P = (T, H, C)
// ─────────────────────────────────────────────

/** A complete problem instance served to the player */
export interface Problem {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  /** Title shown in the UI */
  title: string;
  title_fr: string;

  // Theory T = (V, F)
  variables: Variable[];
  formulas: Formula[];

  // Problem-specific subsets
  /** H ⊆ V — variable IDs known at game start */
  hypotheses: string[];
  /** C ⊆ V — variable IDs the player must identify to win */
  conclusions: string[];

  /** Minimum number of activations to win (used for efficiency scoring) */
  optimalSteps: number;
  /** Pre-validated: server confirmed C is reachable from H */
  solvable: true;
  /** Intentionally unsolvable trap problem — correctly reaching stuck = win */
  isTrap?: boolean;
}

// ─────────────────────────────────────────────
// Game State (client-side, immutable)
// GDD §9.2 — State Machine
// ─────────────────────────────────────────────

/** Immutable snapshot of a game session.
 *  All transitions produce a new GameState (never mutate in place).
 */
export interface GameState {
  problem: Problem;

  /** I ⊆ V — currently identified variable IDs */
  identifiedVars: ReadonlySet<string>;

  /** Formula IDs that have been activated */
  activatedFormulas: ReadonlySet<string>;

  /** Number of activation steps taken */
  steps: number;

  hintsUsed: number;

  /** ISO timestamp of session start */
  startedAt: string;

  /** Ordered history for undo/replay */
  history: ReadonlyArray<GameStateSnapshot>;

  /** Current phase of the loop */
  phase: GamePhase;
}

export type GamePhase = 'setup' | 'scan' | 'activate' | 'cascade' | 'win' | 'stuck';

/** Lightweight snapshot used in history (avoids nesting full Problem repeatedly) */
export interface GameStateSnapshot {
  identifiedVars: string[];
  activatedFormulas: string[];
  steps: number;
  hintsUsed: number;
  timestamp: string;
}

// ─────────────────────────────────────────────
// Derived / computed types
// ─────────────────────────────────────────────

/** Result of evaluating all formulas against current state */
export interface FormulaEvaluation {
  formulaId: string;
  /** Number of unidentified variables in this formula */
  unknownCount: number;
  /** true iff unknownCount === 1 */
  isActivatable: boolean;
  /** The single unknown variable ID if activatable, else null */
  revealedVarId: string | null;
}

/** Hint response from the engine */
export interface HintResult {
  tier: HintTier;
  /** Formula highlighted by tier 1 & 2 hints */
  formulaId?: string;
  /** Variable revealed by tier 2 hint */
  variableId?: string;
  scoreCost: number;
}

// ─────────────────────────────────────────────
// Scoring  (GDD §6.2)
// ─────────────────────────────────────────────

export interface ScoreBreakdown {
  base: number;          // S_MAX = 1000
  stepPenalty: number;   // steps * S_STEP (20)
  hintPenalty: number;   // hints * S_HINT (50)
  timeBonus: number;     // max(0, 200 - elapsedSeconds * 2)
  total: number;
}

export interface ScoreConfig {
  maxScore: number;      // default 1000
  stepPenalty: number;   // default 20
  hintPenalty: number;   // default 50
  timeBonusBase: number; // default 200
  timeBonusRate: number; // default 2  (pts/second deducted)
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  maxScore: 1000,
  stepPenalty: 20,
  hintPenalty: 50,
  timeBonusBase: 200,
  timeBonusRate: 2,
};

// ─────────────────────────────────────────────
// Session summary  (GDD §6.5)
// ─────────────────────────────────────────────

export interface SessionSummary {
  problemId: string;
  outcome: GameOutcome;
  totalSteps: number;
  optimalSteps: number;
  elapsedSeconds: number;
  hintsUsed: number;
  score: ScoreBreakdown;
  /** Ordered list of formula IDs in activation order */
  activationPath: string[];
}
