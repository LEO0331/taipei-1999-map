import { useEffect, useState } from 'react';
import type { PublicWorksConstructionAuditRecord, PublicWorksConstructionAuditSummary } from '../types/constructionAudit';

type State = {
  records: PublicWorksConstructionAuditRecord[];
  summary?: PublicWorksConstructionAuditSummary;
  loading: boolean;
  error?: string;
};

export function useConstructionAuditData(): State {
  const [state, setState] = useState<State>({ records: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<PublicWorksConstructionAuditRecord[]>('public-works-construction-audit-records.json', []),
      fetchJson<PublicWorksConstructionAuditSummary | undefined>('public-works-construction-audit-summary.json', undefined)
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
