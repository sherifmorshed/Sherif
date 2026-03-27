const CACHE_NAME = 'sherif-wells-v1';
const ASSETS = [
  '/Sherif/',
  '/Sherif/index.html',
  '/Sherif/manifest.json',
  '/Sherif/icon.png'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch Assets from Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
