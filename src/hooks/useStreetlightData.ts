import { useEffect, useState } from 'react';
import type { ServiceRecordsSummary, StreetlightRepairRecord, StreetlightRepairSummary } from '../types/streetlight';

type StreetlightData = {
  records: StreetlightRepairRecord[];
  summary?: StreetlightRepairSummary;
  serviceSummary?: ServiceRecordsSummary;
  loading: boolean;
};

export function useStreetlightData(): StreetlightData {
  const [data, setData] = useState<StreetlightData>({ records: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<StreetlightRepairRecord[]>(dataUrl('streetlight-repairs.json'), []),
      fetchJson<StreetlightRepairSummary | undefined>(dataUrl('streetlight-repair-summary.json'), undefined),
      fetchJson<ServiceRecordsSummary | undefined>(dataUrl('service-records-summary.json'), undefined)
    ]).then(([records, summary, serviceSummary]) => {
      if (!cancelled) setData({ records, summary, serviceSummary, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

function dataUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}data/${fileName}`;
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    return response.ok ? ((await response.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}
