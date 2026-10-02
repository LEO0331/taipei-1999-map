const DATA_VERSION = '__DATA_VERSION__';
const CACHE_NAME = `taipei-1999-map-v3-${DATA_VERSION}`;
const CACHE_PREFIX = 'taipei-1999-map-';
const scopePath = new URL(self.registration.scope).pathname;
const isUpdate = Boolean(self.registration.active);
const ASSETS = ['', 'manifest.webmanifest'].map((asset) => `${scopePath}${asset}`);

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
      .then(() => isUpdate ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }) : [])
      .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url).catch(() => undefined))))
  );
});

async function cacheResponse(request, response) {
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  const isData = requestUrl.pathname.startsWith(`${scopePath}data/`);
  const isVersionedData = isData && requestUrl.searchParams.get('v') === DATA_VERSION;

  if (isVersionedData) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = event.request.cache === 'reload' ? undefined : await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        event.waitUntil(cacheResponse(event.request, response).catch(() => undefined));
        return response;
      })
    );
    return;
  }

  // A previous build's version must never cache the current deployment's data.
  if (isData && requestUrl.searchParams.has('v')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isRefreshableAppAsset = event.request.mode === 'navigate' ||
    ['script', 'style'].includes(event.request.destination) || isData;
  if (isRefreshableAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          event.waitUntil(cacheResponse(event.request, response).catch(() => undefined));
          return response;
        })
        .catch(async () => (await caches.open(CACHE_NAME)).match(event.request).then((cached) => cached ?? Response.error()))
    );
    return;
  }

  event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(event.request)).then((cached) => cached ?? fetch(event.request)));
});
