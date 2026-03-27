const CACHE_NAME = 'sherif-wells-cache-v2';
const assets = [
  '/Sherif/',
  '/Sherif/index.html',
  '/Sherif/manifest.json',
  '/Sherif/icon.png',
  '/Sherif/sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
