import { useEffect, useState } from 'react';
import type {
  ConversionReport,
  Open1999CategorySummary,
  Open1999DistrictSummary,
  Open1999Hotspot,
  Open1999Record,
  Open1999TimeSummary
} from '../types/open1999';

type Open1999Data = {
  records: Open1999Record[];
  districts: Open1999DistrictSummary[];
  categories: Open1999CategorySummary[];
  hotspots: Open1999Hotspot[];
  time: Open1999TimeSummary;
  report?: ConversionReport;
  loading: boolean;
};

const emptyTime: Open1999TimeSummary = {
  byDay: [],
  byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
  byMonth: [],
  weekdayVsWeekend: [
    { type: 'weekday', count: 0 },
    { type: 'weekend', count: 0 }
  ]
};

export function useOpen1999Data(): Open1999Data {
  const [data, setData] = useState<Open1999Data>({
    records: [],
    districts: [],
    categories: [],
    hotspots: [],
    time: emptyTime,
    loading: true
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<Open1999Record[]>('/data/open1999-records.json', []),
      fetchJson<Open1999DistrictSummary[]>('/data/open1999-district-summary.json', []),
      fetchJson<Open1999CategorySummary[]>('/data/open1999-category-summary.json', []),
      fetchJson<Open1999Hotspot[]>('/data/open1999-hotspots.json', []),
      fetchJson<Open1999TimeSummary>('/data/open1999-time-summary.json', emptyTime),
      fetchJson<ConversionReport | undefined>('/data/conversion-report.json', undefined)
    ]).then(([records, districts, categories, hotspots, time, report]) => {
      if (!cancelled) setData({ records, districts, categories, hotspots, time, report, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
