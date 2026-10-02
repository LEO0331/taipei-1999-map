import type { ConversionReport, Open1999CategorySummary, Open1999DistrictSummary, Open1999Hotspot, Open1999Record, Open1999TimeSummary } from '../types/open1999';
import { fetchDataJson, peekDataJson } from '../lib/dataCache';
import { loadPartitionedRecords, peekPartitionedRecords } from '../lib/recordPartitions';
import { useDataFile, useStaticData } from './useStaticData';

export function useOpen1999Data(fullRecords = false, startDate = '', endDate = '') {
  const districts = useDataFile<Open1999DistrictSummary[]>('open1999-district-summary.json');
  const categories = useDataFile<Open1999CategorySummary[]>('open1999-category-summary.json');
  const hotspots = useDataFile<Open1999Hotspot[]>('open1999-hotspots-preview.json');
  const time = useDataFile<Open1999TimeSummary>('open1999-time-summary.json');
  const report = useDataFile<ConversionReport>('conversion-report.json');
  const firstYear = (startDate || report.value?.period?.start || '').slice(0, 4);
  const lastYear = (endDate || report.value?.period?.end || '').slice(0, 4);
  const years = firstYear && lastYear
    ? Array.from({ length: Math.max(0, Number(lastYear) - Number(firstYear) + 1) }, (_, i) => String(Number(firstYear) + i))
    : undefined;
  const records = useStaticData(`open1999:${fullRecords ? `${startDate}:${endDate}` : 'preview'}`, async () => {
    if (!fullRecords) return fetchDataJson<Open1999Record[]>('open1999-preview.json');
    let selectedYears = years;
    if ((startDate || endDate) && selectedYears === undefined) {
      const bounds = await fetchDataJson<ConversionReport>('conversion-report.json');
      const start = Number((startDate || bounds.period?.start || '').slice(0, 4));
      const end = Number((endDate || bounds.period?.end || '').slice(0, 4));
      if (!start || !end) throw new Error('Missing dataset date bounds');
      selectedYears = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => String(start + index));
    }
    return loadPartitionedRecords<Open1999Record>('open1999', selectedYears);
  }, fullRecords
    ? ((startDate || endDate) && years === undefined ? undefined : peekPartitionedRecords<Open1999Record>('open1999', years))
    : peekDataJson<Open1999Record[]>('open1999-preview.json'));
  const requests = [districts, categories, hotspots, time, report, records];
  return {
    records: records.value ?? [], districts: districts.value ?? [], categories: categories.value ?? [],
    hotspots: hotspots.value ?? [], time: time.value, report: report.value,
    loading: requests.some((request) => request.loading), recordsLoading: records.loading,
    error: requests.find((request) => request.error)?.error,
    retry: () => requests.forEach((request) => request.retry())
  };
}
