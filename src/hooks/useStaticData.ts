import { useEffect, useState } from 'react';
import { fetchDataJson, peekDataJson } from '../lib/dataCache';

// A new selection never exposes rows from the previous selection while it loads.
export function useStaticData<T>(key: string, load: () => Promise<T>, cached?: T) {
  const [result, setResult] = useState<{ key: string; value?: T; error?: string }>({ key });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (cached !== undefined) { setResult({ key, value: cached }); return; }
    setResult({ key });
    load().then(
      (value) => { if (!cancelled) setResult({ key, value }); },
      (error) => { if (!cancelled) setResult({ key, error: String(error) }); }
    );
    return () => { cancelled = true; };
    // key identifies the request; load closures may change every render.
  }, [key, attempt]);
  const current = cached !== undefined ? { key, value: cached } : result.key === key ? result : { key };
  return { ...current, loading: current.value === undefined && !current.error, retry: () => setAttempt((value) => value + 1) };
}

export function useDataFile<T>(file: string) {
  const cached = peekDataJson<T>(file);
  const result = useStaticData(file, () => fetchDataJson<T>(file), cached);
  return { ...result, value: result.value ?? cached, loading: result.loading && cached === undefined };
}
