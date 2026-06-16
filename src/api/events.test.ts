/**
 * Tests for the offline-first event queue (src/api/events.ts).
 * Run: npx vitest src/api/events.test.ts
 *
 * src/api/eventDb.ts (IndexedDB persistence) is mocked — its own
 * behaviour is covered by src/api/eventDb.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionStartEvent } from './events';

const { addEvent, getAllEvents, removeEvents } = vi.hoisted(() => ({
  addEvent: vi.fn(),
  getAllEvents: vi.fn(),
  removeEvents: vi.fn(),
}));

vi.mock('./eventDb', () => ({ addEvent, getAllEvents, removeEvents }));

import { initEventClient, emitEvent, flushEvents, subscribeToPendingEvents, setAnalyticsConsent } from './events';

const sampleEvent: SessionStartEvent = {
  type: 'session_start',
  userId: 'user-1',
  problemId: 'p-kinematics-01',
  timestamp: '2026-06-12T00:00:00.000Z',
  difficulty: 'intermediate',
  domain: 'physics',
  platform: 'web',
  hypothesisCount: 2,
  conclusionCount: 1,
  variableCount: 5,
  formulaCount: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  getAllEvents.mockResolvedValue([]);
  addEvent.mockResolvedValue(1);
  removeEvents.mockResolvedValue(undefined);
  globalThis.fetch = vi.fn();
  globalThis.window = new EventTarget() as unknown as Window & typeof globalThis;
  setAnalyticsConsent(true);
});

describe('subscribeToPendingEvents', () => {
  it('reports 0 and never updates before initEventClient() is called', () => {
    const counts: number[] = [];
    const unsubscribe = subscribeToPendingEvents(c => counts.push(c));
    expect(counts).toEqual([0]);
    unsubscribe();
  });
});

describe('emitEvent', () => {
  it('warns and does not throw before initEventClient() is called', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => emitEvent(sampleEvent)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});

describe('EventQueue', () => {
  it('persists pushed events to IndexedDB and updates the pending count', () => {
    initEventClient('http://api.test');

    const counts: number[] = [];
    subscribeToPendingEvents(c => counts.push(c));

    emitEvent(sampleEvent);

    expect(counts).toEqual([0, 1]);
    expect(addEvent).toHaveBeenCalledWith(sampleEvent);
  });

  it('flushes to the server and clears persisted events on success', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    initEventClient('http://api.test');

    const counts: number[] = [];
    subscribeToPendingEvents(c => counts.push(c));
    emitEvent(sampleEvent);

    await flushEvents();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://api.test/api/events',
      expect.objectContaining({ method: 'POST' })
    );
    expect(removeEvents).toHaveBeenCalledWith([1]);
    expect(counts.at(-1)).toBe(0);
  });

  it('keeps events queued when the flush request fails', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    initEventClient('http://api.test');

    const counts: number[] = [];
    subscribeToPendingEvents(c => counts.push(c));
    emitEvent(sampleEvent);

    await flushEvents();

    expect(removeEvents).not.toHaveBeenCalled();
    expect(counts.at(-1)).toBe(1);
  });

  it('flushes automatically when the browser comes back online', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    initEventClient('http://api.test');
    emitEvent(sampleEvent);

    globalThis.window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => expect(removeEvents).toHaveBeenCalledWith([1]));
  });
});

describe('setAnalyticsConsent', () => {
  it('blocks emitEvent while consent is refused', () => {
    initEventClient('http://api.test');
    setAnalyticsConsent(false);

    const counts: number[] = [];
    subscribeToPendingEvents(c => counts.push(c));
    emitEvent(sampleEvent);

    expect(addEvent).not.toHaveBeenCalled();
    expect(counts).toEqual([0]);
  });

  it('resumes emitEvent once consent is granted', () => {
    initEventClient('http://api.test');
    setAnalyticsConsent(false);
    emitEvent(sampleEvent);

    setAnalyticsConsent(true);
    emitEvent(sampleEvent);

    expect(addEvent).toHaveBeenCalledTimes(1);
    expect(addEvent).toHaveBeenCalledWith(sampleEvent);
  });
});
