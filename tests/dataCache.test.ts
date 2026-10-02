import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

declare const __DATA_VERSION__: string;

describe('shared parsed data cache', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('__DATA_VERSION__', 'test-version');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shares in-flight downloads and parsed results across consumers', async () => {
    const json = vi.fn().mockResolvedValue([{ id: 1 }]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchDataJson, peekDataJson } = await import('../src/lib/dataCache');
    expect(peekDataJson('records.json')).toBeUndefined();
    const first = fetchDataJson('records.json');
    const second = fetchDataJson('records.json');
    expect(first).toBe(second);
    const records = await first;
    expect(await fetchDataJson('records.json')).toBe(records);
    expect(peekDataJson('records.json')).toBe(records);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/data/records.json?v=${encodeURIComponent(__DATA_VERSION__)}`);
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('evicts failed requests so returning to a tab can retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([1]) });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchDataJson, peekDataJson } = await import('../src/lib/dataCache');
    await expect(fetchDataJson('records.json')).rejects.toThrow('HTTP 503');
    expect(peekDataJson('records.json')).toBeUndefined();
    expect(await fetchDataJson('records.json')).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('also retries malformed JSON and uses the configured deployment base', async () => {
    vi.stubEnv('BASE_URL', '/taipei-1999-map/');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.reject(new SyntaxError('bad JSON')) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ count: 2 }) });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const { fetchDataJson } = await import('../src/lib/dataCache');
      await expect(fetchDataJson('summary.json')).rejects.toThrow('bad JSON');
      expect(await fetchDataJson('summary.json')).toEqual({ count: 2 });
      expect(fetchMock).toHaveBeenLastCalledWith(`/taipei-1999-map/data/summary.json?v=${encodeURIComponent(__DATA_VERSION__)}`, { cache: 'reload' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
