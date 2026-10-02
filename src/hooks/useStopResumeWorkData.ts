import type { ConstructionStopResumeWorkRecord, ConstructionStopResumeWorkSummary } from '../types/stopResumeWork';
import { useDataFile } from './useStaticData';

export function useStopResumeWorkData() {
  const records = useDataFile<ConstructionStopResumeWorkRecord[]>('construction-stop-resume-work-records.json');
  const summary = useDataFile<ConstructionStopResumeWorkSummary>('construction-stop-resume-work-summary.json');
  return {
    records: records.value ?? [], summary: summary.value,
    loading: records.loading, error: records.error ?? summary.error,
    retry: () => { records.retry(); summary.retry(); }
  };
}
