/**
 * STEM Problem Game — Analytics Event Schema & Client
 * Source: GDD §8.1 (Event Schema), §8.2 (Server Architecture)
 *
 * Every meaningful player action emits a typed event to POST /api/events
 */

import type { Domain, Difficulty, GameOutcome, HintTier, Platform } from '../game/types';
import { addEvent as persistEvent, getAllEvents, removeEvents } from './eventDb';

// ─────────────────────────────────────────────
// Event union type
// ─────────────────────────────────────────────

export type GameEvent =
  | SessionStartEvent
  | FormulaActivatedEvent
  | HintUsedEvent
  | ProblemCompletedEvent
  | SessionEndEvent;

// ─────────────────────────────────────────────
// Individual event types  (GDD §8.1)
// ─────────────────────────────────────────────

interface BaseEvent {
  /** Pseudonymous UUID — never a real name or email */
  userId: string;
  problemId: string;
  timestamp: string; // ISO 8601
}

export interface SessionStartEvent extends BaseEvent {
  type: 'session_start';
  difficulty: Difficulty;
  domain: Domain;
  platform: Platform;
  hypothesisCount: number;
  conclusionCount: number;
  variableCount: number;
  formulaCount: number;
}

export interface FormulaActivatedEvent extends BaseEvent {
  type: 'formula_activated';
  formulaId: string;
  stepNumber: number;
  /** Variable IDs identified before this activation */
  varsBefore: string[];
  /** The variable ID revealed by this activation */
  varRevealed: string;
  /** Seconds since the previous activation (or session start) */
  timeSinceLast: number;
  /** Number of simultaneously activatable formulas at the time of choice */
  activatableCount: number;
}

export interface HintUsedEvent extends BaseEvent {
  type: 'hint_used';
  hintTier: HintTier;
  stepNumber: number;
  activatableCount: number;
  /** Variable IDs identified at the time the hint was requested */
  currentVars: string[];
}

export interface ProblemCompletedEvent extends BaseEvent {
  type: 'problem_completed';
  outcome: GameOutcome;
  totalSteps: number;
  optimalSteps: number;
  timeElapsedSeconds: number;
  hintsUsed: number;
  finalScore: number;
  stepEfficiencyRatio: number; // optimalSteps / totalSteps
  activationPath: string[];    // ordered formula IDs
}

export interface SessionEndEvent extends BaseEvent {
  type: 'session_end';
  problemsAttempted: number;
  problemsCompleted: number;
  totalTimeSeconds: number;
}

// ─────────────────────────────────────────────
// Event queue (offline-first)
// Events are batched and sent; if offline, persisted to IndexedDB and
// retried in the background (timer) and on the browser's 'online' event.
// ─────────────────────────────────────────────

const BATCH_INTERVAL_MS = 30_000; // 30 seconds

interface QueuedEvent {
  /** IndexedDB key, or null while the persistence write is still in flight. */
  key: number | null;
  event: GameEvent;
}

class EventQueue {
  private queue: QueuedEvent[] = [];
  private pendingWrites: Promise<void>[] = [];
  private ready: Promise<void>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private apiUrl: string;
  private listeners = new Set<(pendingCount: number) => void>();

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.ready = this.restoreFromIndexedDb();
    this.startBatchTimer();
    this.listenForReconnect();
  }

  /** Add an event to the local queue. Never throws. */
  push(event: GameEvent): void {
    const entry: QueuedEvent = { key: null, event };
    this.queue.push(entry);
    this.notify();
    this.pendingWrites.push(
      persistEvent(event).then(key => { entry.key = key; })
    );
  }

  /** Flush queue to server. Call on session_end, page unload, or reconnect. */
  async flush(): Promise<void> {
    await this.ready;
    if (this.pendingWrites.length > 0) {
      await Promise.all(this.pendingWrites);
      this.pendingWrites = [];
    }
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    try {
      const resp = await fetch(`${this.apiUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch.map(entry => entry.event) }),
      });
      if (resp.ok) {
        this.queue = this.queue.filter(entry => !batch.includes(entry));
        const keys = batch.map(entry => entry.key).filter((key): key is number => key !== null);
        await removeEvents(keys);
        this.notify();
      }
    } catch {
      // Network unavailable — events remain queued (offline mode, GDD §9.4)
    }
  }

  /** Subscribe to changes in the number of unsent events. Called immediately with the current count. */
  subscribe(listener: (pendingCount: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.queue.length);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.queue.length);
  }

  private startBatchTimer(): void {
    this.timer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
  }

  /** Retry immediately when connectivity returns, so the "pending" badge clears promptly. */
  private listenForReconnect(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.flush());
  }

  /**
   * Prepend events persisted in a previous session to the queue. Runs
   * asynchronously, so events pushed before this resolves are kept —
   * already-persisted entries (matched by key) are not duplicated.
   */
  private async restoreFromIndexedDb(): Promise<void> {
    const stored = await getAllEvents();
    const knownKeys = new Set(this.queue.map(entry => entry.key).filter((key): key is number => key !== null));
    const restored = stored
      .filter(({ key }) => !knownKeys.has(key))
      .map(({ key, event }) => ({ key, event }));
    this.queue = [...restored, ...this.queue];
    this.notify();
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

let _queue: EventQueue | null = null;

/**
 * GDPR analytics consent (GDD §8.4). Defaults to allowed so anonymous play
 * (no account, no consent prompt) keeps working as before; set to false
 * while an authenticated user's consent decision is pending or refused.
 */
let _analyticsConsent = true;

export function initEventClient(apiUrl: string): void {
  _queue = new EventQueue(apiUrl);
}

/** Set whether analytics events may be emitted (GDD §8.4 GDPR consent). */
export function setAnalyticsConsent(granted: boolean): void {
  _analyticsConsent = granted;
}

export function emitEvent(event: GameEvent): void {
  if (!_analyticsConsent) return;
  if (!_queue) {
    console.warn('[events] EventQueue not initialised. Call initEventClient() first.');
    return;
  }
  _queue.push(event);
}

export async function flushEvents(): Promise<void> {
  await _queue?.flush();
}

/**
 * Subscribe to the number of events queued but not yet confirmed sent.
 * Used to drive the "⟳ pending" badge (GDD §9.4). Returns an unsubscribe
 * function; if called before initEventClient(), reports 0 and never updates.
 */
export function subscribeToPendingEvents(listener: (pendingCount: number) => void): () => void {
  if (!_queue) {
    listener(0);
    return () => {};
  }
  return _queue.subscribe(listener);
}

// ─────────────────────────────────────────────
// Convenience builders (type-safe, timestamp auto-set)
// ─────────────────────────────────────────────

function ts(): string {
  return new Date().toISOString();
}

export const Events = {
  sessionStart: (
    userId: string,
    problemId: string,
    payload: Omit<SessionStartEvent, 'type' | 'userId' | 'problemId' | 'timestamp'>
  ): SessionStartEvent => ({ type: 'session_start', userId, problemId, timestamp: ts(), ...payload }),

  formulaActivated: (
    userId: string,
    problemId: string,
    payload: Omit<FormulaActivatedEvent, 'type' | 'userId' | 'problemId' | 'timestamp'>
  ): FormulaActivatedEvent => ({ type: 'formula_activated', userId, problemId, timestamp: ts(), ...payload }),

  hintUsed: (
    userId: string,
    problemId: string,
    payload: Omit<HintUsedEvent, 'type' | 'userId' | 'problemId' | 'timestamp'>
  ): HintUsedEvent => ({ type: 'hint_used', userId, problemId, timestamp: ts(), ...payload }),

  problemCompleted: (
    userId: string,
    problemId: string,
    payload: Omit<ProblemCompletedEvent, 'type' | 'userId' | 'problemId' | 'timestamp'>
  ): ProblemCompletedEvent => ({ type: 'problem_completed', userId, problemId, timestamp: ts(), ...payload }),

  sessionEnd: (
    userId: string,
    problemId: string,
    payload: Omit<SessionEndEvent, 'type' | 'userId' | 'problemId' | 'timestamp'>
  ): SessionEndEvent => ({ type: 'session_end', userId, problemId, timestamp: ts(), ...payload }),
};
