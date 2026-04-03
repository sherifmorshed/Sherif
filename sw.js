const CACHE_NAME = 'well-lookup-cache-v41';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './xlsx.full.min.js'
];

// Install — cache app shell immediately, activate right away
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // activate instantly, don't wait for old SW to die
});

// Activate — delete old caches, take control of all clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // take control without reload
  );
});

// Fetch — stale-while-revalidate:
//   1. Serve from cache instantly (fast load)
//   2. Fetch from network in background and update cache
//   3. Next visit gets the fresh version
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);

      // Fetch fresh copy in background regardless
      const networkFetch = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null);

      // Return cached immediately if available, otherwise wait for network
      if (cached) {
        // Kick off background refresh but don't wait for it
        event.waitUntil(networkFetch);
        return cached;
      }

      // No cache yet — wait for network
      const response = await networkFetch;
      if (response) return response;

      // Both failed — fallback to index.html for document requests
      if (event.request.destination === 'document') {
        return cache.match('./index.html');
      }

      // Final safety net — never return undefined
      return new Response('', { status: 504, statusText: 'Offline / Not Cached' });
    })
  );
});
