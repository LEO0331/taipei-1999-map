const CACHE_NAME = 'taipei-1999-map-v1';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/data/open1999-records.json',
  '/data/open1999-district-summary.json',
  '/data/open1999-category-summary.json',
  '/data/open1999-hotspots.json',
  '/data/open1999-time-summary.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => undefined)));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
