/* ============================================
   THE MOTHER SUITE — Service Worker
   Stale-while-revalidate caching strategy
   ============================================ */

const CACHE_NAME = 'mother-suite-v1';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  './index.html',
  './css/shared.css',
  './js/shared.js',
  './js/pwa.js',
  './manifest.json',
];

// ── Install: pre-cache core assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: remove stale caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for static assets ─────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (fonts, Firebase CDN, etc.)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always hit the network for API calls
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);

      // Fetch fresh copy in the background and update cache
      const fetchPromise = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Serve cached immediately if available, otherwise wait for network
      return cached || fetchPromise || new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      });
    })
  );
});

// ── Skip waiting message (for update flow) ──────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
