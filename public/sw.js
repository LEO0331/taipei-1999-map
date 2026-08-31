const CACHE_NAME = 'taipei-1999-map-v2';
const CACHE_PREFIX = 'taipei-1999-map-';
const scopePath = new URL(self.registration.scope).pathname;
const ASSETS = [
  '',
  'manifest.webmanifest',
  'data/open1999-records.json',
  'data/open1999-district-summary.json',
  'data/open1999-category-summary.json',
  'data/open1999-hotspots.json',
  'data/open1999-time-summary.json',
  'data/streetlight-repairs.json',
  'data/streetlight-repair-summary.json',
  'data/service-records-summary.json',
  'data/public-works-construction-audit-records.json',
  'data/public-works-construction-audit-summary.json',
  'data/public-works-construction-audit-latest.json',
  'data/construction-stop-resume-work-records.json',
  'data/construction-stop-resume-work-summary.json',
  'data/construction-stop-resume-work-latest.json',
  'data/taipei-1999-dashboard-summary.json',
  'data/conversion-report.json'
].map((asset) => `${scopePath}${asset}`);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url).catch(() => undefined))))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const isRefreshableAppAsset = requestUrl.origin === self.location.origin && (
    event.request.mode === 'navigate' ||
    ['script', 'style'].includes(event.request.destination) ||
    requestUrl.pathname.includes('/data/')
  );

  if (isRefreshableAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached ?? Response.error()))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
