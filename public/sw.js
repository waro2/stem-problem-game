/**
 * STEM Problem Game — Offline problem cache  (GDD §9.4)
 *
 * Caches problem definitions (/problems/<domain>-*.json) for offline play,
 * keeping at most MAX_PER_DOMAIN problems per domain (oldest evicted first).
 */

const CACHE_NAME = 'stem-problems-v1';
const MAX_PER_DOMAIN = 20;
const DOMAINS = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'];
const PROBLEM_PATH_RE = /^\/problems\/.+\.json$/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

/** Extract the domain from a problem filename, e.g. "physics-kinematics-01.json" -> "physics". */
function domainOf(pathname) {
  const file = pathname.split('/').pop() || '';
  const prefix = file.split('-')[0];
  return DOMAINS.includes(prefix) ? prefix : null;
}

/** Evict the oldest cached problems for `domain` beyond MAX_PER_DOMAIN. */
async function trimDomainCache(cache, domain) {
  const keys = await cache.keys();
  const domainKeys = keys.filter((request) => domainOf(new URL(request.url).pathname) === domain);
  // cache.keys() returns entries in insertion order, so the front is oldest.
  while (domainKeys.length > MAX_PER_DOMAIN) {
    const oldest = domainKeys.shift();
    await cache.delete(oldest);
  }
}

/** Network-first, falling back to the cache when offline; caches successful responses. */
async function handleProblemRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const domain = domainOf(new URL(request.url).pathname);
      await cache.put(request, response.clone());
      if (domain) await trimDomainCache(cache, domain);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && PROBLEM_PATH_RE.test(url.pathname)) {
    event.respondWith(handleProblemRequest(event.request));
  }
});
