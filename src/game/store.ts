/**
 * STEM Problem Game — Zustand Store
 * Source: GDD §9.2 (State Machine)
 *
 * Wraps the pure engine functions with React-friendly state management.
 * All mutations call engine functions and replace state immutably.
 */

import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import type { GameState, Platform, Problem, HintTier } from './types';
import type { Lang } from '../i18n/strings';
import { t, format } from '../i18n/strings';
import {
  initGameState,
  activateFormula,
  undoLastActivation,
  applyAutoActivate,
  computeHint,
  recordHintUsed,
  evaluateAllFormulas,
  getActivatableFormulas,
  describeActivation,
  buildSessionSummary,
} from './engine';
import type { ActivationAnnouncement } from './engine';
import type { FormulaEvaluation, SessionSummary, HintResult } from './types';
import { emitEvent, flushEvents, Events } from '../api/events';
import { markProblemCompleted } from './progressionStorage';
import { isParAchieved, isLightningSpeed } from './achievements';
import { markParAchieved, markLightningSpeed } from './achievementsStorage';
import { fetchStudentDomainStats } from '../api/recommendation';
import { fetchProblemLibrary, type ProblemSummary } from '../api/library';
import { getWeakestDomain, recommendNextProblem } from './recommendation';

// ─────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────

interface GameStore {
  // State
  gameState: GameState | null;
  userId: string;
  lang: Lang;
  sessionStartTime: number | null;
  summary: SessionSummary | null;
  lastHint: HintResult | null;
  /** Current tutorial step (1-4), or null when inactive/completed. */
  tutorialStep: number | null;
  /** Next problem suggested by the adaptive selection algorithm, or null if none. */
  recommendedProblem: ProblemSummary | null;
  /** Number of analytics events queued but not yet confirmed sent (GDD §9.4). */
  pendingEventCount: number;
  /** Latest screen-reader announcement (cascade activations, win/stuck), or null. */
  announcement: string | null;

  // Derived (computed on demand)
  getAllEvaluations: () => FormulaEvaluation[];
  getActivatable: () => FormulaEvaluation[];

  // Actions
  setLang: (lang: Lang) => void;
  loadProblem: (problem: Problem) => void;
  activate: (formulaId: string) => void;
  requestHint: (tier: HintTier) => void;
  undo: () => void;
  endSession: () => void;
  reset: () => void;
  nextTutorialStep: () => void;
  skipTutorial: () => void;
  loadRecommendation: (apiUrl: string) => Promise<void>;
  /** Switch the active userId, e.g. after linking the anonymous device to a real account. */
  setUserId: (userId: string) => void;
  /** Update the count of unsent analytics events, driving the "⟳ pending" badge. */
  setPendingEventCount: (count: number) => void;
}

// ─────────────────────────────────────────────
// Screen-reader announcements (GDD §8.1 — Cascade)
// ─────────────────────────────────────────────

/** Build the localized screen-reader announcement for an activation, including any cascade. */
function formatAnnouncement(ann: ActivationAnnouncement, lang: Lang): string {
  const parts = [
    format(t('announceFormulaActivated', lang), ann.formulaId),
    format(t('announceVariableRevealed', lang), ann.revealedVarId),
  ];
  if (ann.cascadeCount > 0) {
    parts.push(format(t('announceCascade', lang), ann.cascadeCount));
  }
  if (ann.phase === 'win') {
    parts.push(t('announceWin', lang));
  } else if (ann.phase === 'stuck') {
    parts.push(t('announceStuck', lang));
  }
  return parts.join(' ');
}

// ─────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────

const TUTORIAL_DONE_KEY = 'stem_game_tutorial_done';

/** localStorage key for the anonymous device id, used to link pre-login progress to a real account. */
export const ANONYMOUS_USER_ID_KEY = 'stem_game_user_id';

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  userId: getOrCreateUserId(),
  lang: 'fr',
  sessionStartTime: null,
  summary: null,
  lastHint: null,
  tutorialStep: isTutorialDone() ? null : 1,
  recommendedProblem: null,
  pendingEventCount: 0,
  announcement: null,

  getAllEvaluations: () => {
    const gs = get().gameState;
    return gs ? evaluateAllFormulas(gs) : [];
  },

  getActivatable: () => {
    const gs = get().gameState;
    return gs ? getActivatableFormulas(gs) : [];
  },

  setLang: (lang) => set({ lang }),

  loadProblem: (problem) => {
    const gs = initGameState(problem);
    const now = Date.now();
    set({
      gameState: gs,
      sessionStartTime: now,
      summary: null,
      lastHint: null,
      tutorialStep: isTutorialDone() ? null : 1,
      announcement: null,
    });

    emitEvent(Events.sessionStart(get().userId, problem.id, {
      difficulty: problem.difficulty,
      domain: problem.domain,
      platform: ((): Platform => {
        const p = Capacitor.getPlatform();
        return p === 'ios' || p === 'android' ? p : 'web';
      })(),
      hypothesisCount: problem.hypotheses.length,
      conclusionCount: problem.conclusions.length,
      variableCount: problem.variables.length,
      formulaCount: problem.formulas.length,
    }));
  },

  activate: (formulaId) => {
    const { gameState, userId, sessionStartTime } = get();
    if (!gameState) return;

    const varsBefore = [...gameState.identifiedVars];
    const timeSinceLast = sessionStartTime
      ? (Date.now() - sessionStartTime) / 1000
      : 0;
    const activatableCount = getActivatableFormulas(gameState).length;

    const next = activateFormula(gameState, formulaId);
    const ann = describeActivation(gameState, next, formulaId);

    emitEvent(Events.formulaActivated(userId, gameState.problem.id, {
      formulaId,
      stepNumber: next.steps,
      varsBefore,
      varRevealed: ann.revealedVarId,
      timeSinceLast,
      activatableCount,
    }));

    set({ gameState: next, announcement: formatAnnouncement(ann, get().lang) });

    // Auto-end session if won or stuck
    if (next.phase === 'win' || next.phase === 'stuck') {
      get().endSession();
    }

    // Advance the guided tutorial as the player progresses through activations.
    const { tutorialStep } = get();
    if (tutorialStep !== null) {
      if (next.phase === 'win' || next.phase === 'stuck') {
        markTutorialDone();
        set({ tutorialStep: null });
      } else if (tutorialStep === 2 || tutorialStep === 3) {
        set({ tutorialStep: tutorialStep + 1 });
      }
    }
  },

  requestHint: (tier) => {
    const { gameState, userId } = get();
    if (!gameState) return;

    const hint = computeHint(gameState, tier);
    if (!hint) return;

    emitEvent(Events.hintUsed(userId, gameState.problem.id, {
      hintTier: tier,
      stepNumber: gameState.steps,
      activatableCount: getActivatableFormulas(gameState).length,
      currentVars: [...gameState.identifiedVars],
    }));

    if (tier === 3) {
      const next = applyAutoActivate(gameState);
      const ann = describeActivation(gameState, next, hint.formulaId!);
      set({ gameState: next, lastHint: hint, announcement: formatAnnouncement(ann, get().lang) });
      if (next.phase === 'win' || next.phase === 'stuck') get().endSession();
    } else {
      const next = recordHintUsed(gameState);
      set({ gameState: next, lastHint: hint });
    }
  },

  undo: () => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: undoLastActivation(gameState), lastHint: null });
  },

  endSession: () => {
    const { gameState, userId, sessionStartTime } = get();
    if (!gameState) return;

    const elapsedSeconds = sessionStartTime
      ? (Date.now() - sessionStartTime) / 1000
      : 0;
    const summary = buildSessionSummary(gameState, elapsedSeconds);

    emitEvent(Events.problemCompleted(userId, gameState.problem.id, {
      outcome: summary.outcome,
      totalSteps: summary.totalSteps,
      optimalSteps: summary.optimalSteps,
      timeElapsedSeconds: summary.elapsedSeconds,
      hintsUsed: summary.hintsUsed,
      finalScore: summary.score.total,
      stepEfficiencyRatio: summary.optimalSteps / Math.max(1, summary.totalSteps),
      activationPath: summary.activationPath,
    }));
    void flushEvents();

    if (summary.outcome === 'win') {
      markProblemCompleted(gameState.problem.id);
      if (isParAchieved(summary)) markParAchieved(gameState.problem.id);
      if (isLightningSpeed(summary)) markLightningSpeed(gameState.problem.id);
    }

    set({ summary });
  },

  reset: () => set({ gameState: null, summary: null, lastHint: null, sessionStartTime: null, announcement: null }),

  nextTutorialStep: () => {
    const { tutorialStep } = get();
    if (tutorialStep === null) return;
    if (tutorialStep >= 4) {
      markTutorialDone();
      set({ tutorialStep: null });
    } else {
      set({ tutorialStep: tutorialStep + 1 });
    }
  },

  skipTutorial: () => {
    markTutorialDone();
    set({ tutorialStep: null });
  },

  setUserId: (userId) => set({ userId }),

  setPendingEventCount: (count) => set({ pendingEventCount: count }),

  loadRecommendation: async (apiUrl) => {
    const { userId } = get();

    try {
      const [domainStats, problems] = await Promise.all([
        fetchStudentDomainStats(apiUrl, userId),
        fetchProblemLibrary(apiUrl, userId),
      ]);

      const weakestDomain = getWeakestDomain(domainStats);
      set({ recommendedProblem: recommendNextProblem(weakestDomain, problems) });
    } catch (err) {
      console.error('[store] failed to load recommendation', err);
    }
  },
}));

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

function getOrCreateUserId(): string {
  const existing = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(ANONYMOUS_USER_ID_KEY, id);
  return id;
}

function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
}

function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_DONE_KEY, '1');
}
