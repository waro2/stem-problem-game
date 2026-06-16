/**
 * Registers the offline problem cache Service Worker  (GDD §9.4)
 * See public/sw.js — caches up to 20 problems per domain for offline play.
 */

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('[sw] registration failed', err);
    });
  });
}
