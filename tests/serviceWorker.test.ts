import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker(update = false) {
  const handlers: Record<string, (event: any) => void> = {};
  const entries = new Map<string, Response>();
  const key = (request: string | Request) => typeof request === 'string' ? request : request.url;
  const cache = {
    match: vi.fn(async (request: Request) => entries.get(key(request))),
    put: vi.fn(async (request: Request, response: Response) => { entries.set(key(request), response); }),
    addAll: vi.fn(async () => undefined)
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['taipei-1999-map-v2', 'unrelated', 'taipei-1999-map-v3-test-version']),
    delete: vi.fn(async () => true)
  };
  const navigate = vi.fn(async () => undefined);
  const clients = {
    claim: vi.fn(async () => undefined),
    matchAll: vi.fn(async () => [{ url: 'https://example.test/map/', navigate }])
  };
  const fetch = vi.fn(async () => new Response('fresh'));
  runInNewContext(readFileSync('public/sw.js', 'utf8').replace('__DATA_VERSION__', 'test-version'), {
    URL, Response, caches, fetch,
    self: {
      registration: { scope: 'https://example.test/map/', active: update ? {} : undefined },
      location: { origin: 'https://example.test' }, clients,
      skipWaiting: vi.fn(async () => undefined),
      addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; }
    }
  });
  async function lifecycle(name: string) {
    let pending: Promise<unknown> | undefined;
    handlers[name]({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  }
  async function request(path: string, destination = '', cacheMode = 'default') {
    const pending: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers.fetch({
      request: { url: `https://example.test/map/${path}`, method: 'GET', mode: 'cors', destination, cache: cacheMode },
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => { response = promise; }
    });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  return { entries, cache, caches, fetch, clients, navigate, lifecycle, request };
}

describe('service worker data caching', () => {
  it('does not precache datasets or reload the first visit', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    expect(sw.cache.addAll).toHaveBeenCalledWith(['/map/', '/map/manifest.webmanifest']);
    await sw.lifecycle('activate');
    expect(sw.navigate).not.toHaveBeenCalled();
    expect(sw.caches.delete).toHaveBeenCalledExactlyOnceWith('taipei-1999-map-v2');
  });

  it('refreshes clients when upgrading', async () => {
    const sw = worker(true);
    await sw.lifecycle('activate');
    expect(sw.navigate).toHaveBeenCalledWith('https://example.test/map/');
  });

  it('serves the current version from cache without another network request', async () => {
    const sw = worker();
    const path = 'data/records.json?v=test-version';
    expect(await (await sw.request(path))?.text()).toBe('fresh');
    expect(await (await sw.request(path))?.text()).toBe('fresh');
    expect(sw.fetch).toHaveBeenCalledTimes(1);
  });

  it('never caches mismatched versions and keeps scripts network-first', async () => {
    const sw = worker();
    await sw.request('data/records.json?v=old-version');
    expect(sw.cache.put).not.toHaveBeenCalled();
    await sw.request('assets/app.js', 'script');
    await sw.request('assets/app.js', 'script');
    expect(sw.fetch).toHaveBeenCalledTimes(3);
  });

  it('retries HTTP errors rather than persisting them in the data cache', async () => {
    const sw = worker();
    sw.fetch.mockResolvedValueOnce(new Response('error', { status: 503 }));
    await sw.request('data/records.json?v=test-version');
    expect(sw.cache.put).not.toHaveBeenCalled();
    await sw.request('data/records.json?v=test-version');
    expect(sw.fetch).toHaveBeenCalledTimes(2);
  });

  it('replaces malformed cached data when the client retries with cache reload', async () => {
    const sw = worker();
    const path = 'data/records.json?v=test-version';
    sw.entries.set(`https://example.test/map/${path}`, new Response('malformed'));
    expect(await (await sw.request(path))?.text()).toBe('malformed');
    expect(await (await sw.request(path, '', 'reload'))?.text()).toBe('fresh');
    expect(await (await sw.request(path))?.text()).toBe('fresh');
    expect(sw.fetch).toHaveBeenCalledTimes(1);
  });
});
