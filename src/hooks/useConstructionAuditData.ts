import type { PublicWorksConstructionAuditRecord, PublicWorksConstructionAuditSummary } from '../types/constructionAudit';
import { useDataFile } from './useStaticData';

export function useConstructionAuditData() {
  const records = useDataFile<PublicWorksConstructionAuditRecord[]>('public-works-construction-audit-records.json');
  const summary = useDataFile<PublicWorksConstructionAuditSummary>('public-works-construction-audit-summary.json');
  return {
    records: records.value ?? [], summary: summary.value,
    loading: records.loading, error: records.error ?? summary.error,
    retry: () => { records.retry(); summary.retry(); }
  };
}
