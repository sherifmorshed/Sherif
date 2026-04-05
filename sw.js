const CACHE_NAME = 'well-lookup-cache-v44';

// Critical — SW install fails if any of these can't be cached
const CORE_SHELL = [
  './index.html',
  './xlsx.full.min.js'
];

// Non-critical — cached best-effort; failure won't abort install
const OPTIONAL_SHELL = [
  './',
  './manifest.json',
  './icon.png',
  './icon-192.png'
];

// Install — cache core files (must succeed) + optional files (best-effort)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Core files must all cache — if any fail, install fails
      await cache.addAll(CORE_SHELL);
      // Optional files cached individually — failures are tolerated
      await Promise.allSettled(
        OPTIONAL_SHELL.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Optional asset not cached:', url, err)
          )
        )
      );
    })
  );
  // No self.skipWaiting() — controlled via message
});

// Activate — clean old caches and claim clients.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Message listener — app sends {type:'SKIP_WAITING'} when user taps the banner.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — stale-while-revalidate
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);

      const networkFetch = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null);

      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      const response = await networkFetch;
      if (response) return response;

      if (event.request.destination === 'document') {
        return cache.match('./index.html');
      }

      return new Response('', { status: 504, statusText: 'Offline / Not Cached' });
    })
  );
});
