import type { StreetlightRepairRecord, StreetlightRepairSummary } from '../types/streetlight';
import { fetchDataJson, peekDataJson } from '../lib/dataCache';
import { loadPartitionedRecords, peekPartitionedRecords } from '../lib/recordPartitions';
import { useDataFile, useStaticData } from './useStaticData';

export function useStreetlightData(year = 'all', fullRecords = false) {
  const summary = useDataFile<StreetlightRepairSummary>('streetlight-repair-summary.json');
  const records = useStaticData(`streetlight:${fullRecords ? year : 'preview'}`, () => fullRecords
    ? loadPartitionedRecords<StreetlightRepairRecord>('streetlight', year === 'all' ? undefined : [year])
    : fetchDataJson<StreetlightRepairRecord[]>('streetlight-preview.json'), fullRecords
    ? peekPartitionedRecords<StreetlightRepairRecord>('streetlight', year === 'all' ? undefined : [year])
    : peekDataJson<StreetlightRepairRecord[]>('streetlight-preview.json'));
  return {
    records: records.value ?? [], summary: summary.value,
    loading: records.loading || (!fullRecords && summary.loading), error: records.error ?? summary.error,
    retry: () => { records.retry(); summary.retry(); }
  };
}
