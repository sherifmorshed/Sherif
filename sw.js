const CACHE_NAME = 'well-lookup-cache-v44';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './xlsx.full.min.js'
];

// Install — cache app shell, but do NOT skipWaiting automatically.
// The new SW waits until the app explicitly approves activation.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  // No self.skipWaiting() here — user controls when to activate.
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
