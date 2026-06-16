/**
 * Tests for the IndexedDB-backed offline event queue persistence.
 * Run: npx vitest src/api/eventDb.test.ts
 *
 * IndexedDB doesn't exist in the default Node test environment, so a
 * minimal in-memory fake (single object store, autoIncrement keys) is
 * installed before each test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addEvent, getAllEvents, removeEvents } from './eventDb';
import type { GameEvent } from './events';

interface FakeRequest<T> {
  result: T | null;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface FakeCursor {
  key: number;
  value: GameEvent;
  continue: () => void;
}

function installFakeIndexedDb(): void {
  const data = new Map<number, GameEvent>();
  let nextKey = 1;

  const objectStore = {
    add(value: GameEvent): FakeRequest<number> {
      const key = nextKey++;
      data.set(key, value);
      const request: FakeRequest<number> = { result: null, error: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        request.result = key;
        request.onsuccess?.();
      });
      return request;
    },
    delete(key: number): void {
      data.delete(key);
    },
    openCursor(): FakeRequest<FakeCursor | null> {
      const entries = [...data.entries()];
      let index = 0;
      const request: FakeRequest<FakeCursor | null> = { result: null, error: null, onsuccess: null, onerror: null };
      const advance = () => {
        const entry = entries[index];
        request.result = entry
          ? { key: entry[0], value: entry[1], continue: () => { index++; queueMicrotask(advance); } }
          : null;
        request.onsuccess?.();
      };
      queueMicrotask(advance);
      return request;
    },
  };

  const transaction = {
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    objectStore: () => objectStore,
  };

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => objectStore,
    close: () => {},
    transaction: () => {
      queueMicrotask(() => transaction.oncomplete?.());
      return transaction;
    },
  };

  const fakeIndexedDb = {
    open: (): FakeRequest<typeof db> & { onupgradeneeded: (() => void) | null } => {
      const request = { result: null as (typeof db) | null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null } as FakeRequest<typeof db> & { onupgradeneeded: (() => void) | null };
      queueMicrotask(() => {
        request.result = db;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };

  globalThis.indexedDB = fakeIndexedDb as unknown as IDBFactory;
}

beforeEach(() => {
  installFakeIndexedDb();
});

const sampleEvent: GameEvent = {
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

describe('eventDb', () => {
  it('returns an empty list when nothing has been persisted', async () => {
    expect(await getAllEvents()).toEqual([]);
  });

  it('persists an event and returns it with a generated key', async () => {
    const key = await addEvent(sampleEvent);
    expect(key).not.toBeNull();

    const stored = await getAllEvents();
    expect(stored).toEqual([{ key, event: sampleEvent }]);
  });

  it('preserves insertion order across multiple events', async () => {
    const first = await addEvent(sampleEvent);
    const second = await addEvent({ ...sampleEvent, problemId: 'p-kinematics-02' });

    const stored = await getAllEvents();
    expect(stored.map(s => s.key)).toEqual([first, second]);
  });

  it('removes events by key', async () => {
    const first = await addEvent(sampleEvent);
    const second = await addEvent({ ...sampleEvent, problemId: 'p-kinematics-02' });

    await removeEvents([first!]);

    const stored = await getAllEvents();
    expect(stored).toEqual([{ key: second, event: { ...sampleEvent, problemId: 'p-kinematics-02' } }]);
  });
});
