/**
 * IndexedDB persistence for the offline event queue  (GDD §9.4)
 *
 * Backs src/api/events.ts: events that can't be sent immediately are
 * written here and re-sent once connectivity returns. Degrades to a
 * no-op when IndexedDB is unavailable (e.g. the test environment) —
 * the in-memory queue in events.ts still works, just without
 * persistence across reloads.
 */

import type { GameEvent } from './events';

const DB_NAME = 'stem_game_events';
const DB_VERSION = 1;
const STORE_NAME = 'pending_events';

export interface StoredEvent {
  key: number;
  event: GameEvent;
}

function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Persist an event and return its generated key, or null if IndexedDB is unavailable. */
export async function addEvent(event: GameEvent): Promise<number | null> {
  if (!isAvailable()) return null;
  const db = await openDb();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).add(event);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Load every persisted event, in insertion order. */
export async function getAllEvents(): Promise<StoredEvent[]> {
  if (!isAvailable()) return [];
  const db = await openDb();
  try {
    return await new Promise<StoredEvent[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).openCursor();
      const results: StoredEvent[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push({ key: cursor.key as number, event: cursor.value as GameEvent });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Remove the given persisted events by key. */
export async function removeEvents(keys: number[]): Promise<void> {
  if (!isAvailable() || keys.length === 0) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const key of keys) store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
