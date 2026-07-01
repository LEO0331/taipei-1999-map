import { useEffect, useState } from 'react';
import type { ConstructionStopResumeWorkRecord, ConstructionStopResumeWorkSummary } from '../types/stopResumeWork';

type State = {
  records: ConstructionStopResumeWorkRecord[];
  summary?: ConstructionStopResumeWorkSummary;
  loading: boolean;
  error?: string;
};

export function useStopResumeWorkData(): State {
  const [state, setState] = useState<State>({ records: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<ConstructionStopResumeWorkRecord[]>('construction-stop-resume-work-records.json', []),
      fetchJson<ConstructionStopResumeWorkSummary | undefined>('construction-stop-resume-work-summary.json', undefined)
    ])
      .then(([records, summary]) => {
        if (!cancelled) setState({ records, summary, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ records: [], loading: false, error: String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

async function fetchJson<T>(fileName: string, fallback: T): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${fileName}`);
  return response.ok ? ((await response.json()) as T) : fallback;
}
