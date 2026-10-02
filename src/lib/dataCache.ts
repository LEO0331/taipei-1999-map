declare const __DATA_VERSION__: string;

const values = new Map<string, unknown>();
const requests = new Map<string, Promise<unknown>>();
const bypassCache = new Set<string>();

/** Reuse parsed datasets and requests while switching between dashboard tabs. */
export function fetchDataJson<T>(fileName: string): Promise<T> {
  if (values.has(fileName)) return Promise.resolve(values.get(fileName) as T);
  const pending = requests.get(fileName);
  if (pending) return pending as Promise<T>;

  const url = `${import.meta.env.BASE_URL}data/${fileName}?v=${encodeURIComponent(__DATA_VERSION__)}`;
  const response = bypassCache.delete(fileName) ? fetch(url, { cache: 'reload' }) : fetch(url);
  const request = response
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load ${fileName}: HTTP ${response.status}`);
      return response.json().catch((error) => {
        // A successful HTTP response can still contain invalid JSON. Retry from
        // the network rather than repeatedly parsing that service-worker entry.
        bypassCache.add(fileName);
        throw error;
      }) as Promise<T>;
    })
    .then((value) => {
      values.set(fileName, value);
      return value;
    })
    .finally(() => requests.delete(fileName));
  requests.set(fileName, request);
  return request;
}

export function peekDataJson<T>(fileName: string): T | undefined {
  return values.get(fileName) as T | undefined;
}
