const CACHE_NAME = 'taipei-1999-map-v1';
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => undefined)));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
