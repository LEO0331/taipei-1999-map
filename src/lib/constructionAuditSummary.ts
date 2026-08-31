import type { ConstructionAuditScoreBand, PublicWorksConstructionAuditRecord, PublicWorksConstructionAuditSummary } from '../types/constructionAudit';

export function buildConstructionAuditSummary(records: PublicWorksConstructionAuditRecord[]): PublicWorksConstructionAuditSummary {
  const scores = records.map((record) => record.auditScore).filter((value) => value !== undefined).sort((a, b) => a! - b!) as number[];
  const amounts = records.map((record) => record.contractAmountThousandNtd).filter((value) => value !== undefined) as number[];
  const deductions = records.filter((record) => record.totalDeductionPoints !== undefined);
  return {
    totalRecords: records.length,
    minAuditDate: sorted(records.map((record) => record.auditDate))[0],
    maxAuditDate: sorted(records.map((record) => record.auditDate)).at(-1),
    latestAuditQuarter: sorted(records.map((record) => record.auditQuarter ?? record.resourceQuarterKey)).at(-1),
    uniqueProjectCount: new Set(records.map((record) => record.projectNameNormalized ?? record.projectName)).size,
    responsibleAgencyCount: countUnique(records.map((record) => record.responsibleAgencyNormalized)),
    contractorCount: countUnique(records.map((record) => record.contractorNormalized)),
    designUnitCount: countUnique(records.map((record) => record.designUnitNormalized)),
    supervisionUnitCount: countUnique(records.map((record) => record.supervisionUnitNormalized)),
    projectManagementUnitCount: countUnique(records.map((record) => record.projectManagementUnitNormalized)),
    recordsWithAuditScore: scores.length,
    recordsWithContractAmount: amounts.length,
    recordsWithDeductionPoints: deductions.length,
    recordsWithNotes: records.filter((record) => record.hasNotes).length,
    totalContractAmountThousandNtd: sum(amounts),
    averageContractAmountThousandNtd: average(amounts),
    averageAuditScore: average(scores),
    medianAuditScore: scores.length ? scores[Math.floor(scores.length / 2)] : undefined,
    totalContractorDeductionPoints: sumDefined(records.map((record) => record.contractorDeductionPoints)),
    totalSupervisionDeductionPoints: sumDefined(records.map((record) => record.supervisionDeductionPoints)),
    totalPcmDeductionPoints: sumDefined(records.map((record) => record.pcmDeductionPoints)),
    totalDeductionPoints: sumDefined(records.map((record) => record.totalDeductionPoints)),
    byAuditQuarter: grouped(records, (record) => record.auditQuarter ?? record.resourceQuarterKey, 'auditQuarter').sort((a, b) => a.auditQuarter.localeCompare(b.auditQuarter)).slice(-24),
    byResponsibleAgency: grouped(records, (record) => record.responsibleAgency, 'responsibleAgency').slice(0, 20),
    byContractor: grouped(records, (record) => record.contractor, 'contractor').slice(0, 20),
    byScoreBand: ['excellent', 'good', 'fair', 'needs_attention', 'missing', 'unknown'].map((auditScoreBand) => ({ auditScoreBand: auditScoreBand as ConstructionAuditScoreBand, count: records.filter((record) => record.auditScoreBand === auditScoreBand).length })),
    byNotificationMethod: countRows(records.map((record) => record.notificationMethod), 'notificationMethod').slice(0, 20)
  };
}

function grouped<T extends string>(records: PublicWorksConstructionAuditRecord[], keyFn: (record: PublicWorksConstructionAuditRecord) => string | undefined, keyName: T): Array<Record<T, string> & { recordCount: number; averageAuditScore?: number; totalContractAmountThousandNtd?: number; totalDeductionPoints?: number }> {
  const map = new Map<string, PublicWorksConstructionAuditRecord[]>();
  records.forEach((record) => {
    const key = keyFn(record);
    if (key) map.set(key, [...(map.get(key) ?? []), record]);
  });
  return [...map.entries()]
    .map(([key, rows]) => ({ [keyName]: key, recordCount: rows.length, averageAuditScore: average(rows.map((row) => row.auditScore).filter((value) => value !== undefined) as number[]), totalContractAmountThousandNtd: sumDefined(rows.map((row) => row.contractAmountThousandNtd)), totalDeductionPoints: sumDefined(rows.map((row) => row.totalDeductionPoints)) }) as Record<T, string> & { recordCount: number; averageAuditScore?: number; totalContractAmountThousandNtd?: number; totalDeductionPoints?: number })
    .sort((a, b) => b.recordCount - a.recordCount);
}

function countRows<T extends string>(values: Array<string | undefined>, keyName: T): Array<Record<T, string> & { count: number }> {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach((value) => map.set(value!, (map.get(value!) ?? 0) + 1));
  return [...map.entries()].map(([key, count]) => ({ [keyName]: key, count }) as Record<T, string> & { count: number }).sort((a, b) => b.count - a.count);
}

function countUnique(values: Array<string | undefined>): number {
  return new Set(values.filter(Boolean)).size;
}

function sorted(values: Array<string | undefined>): string[] {
  return values.filter(Boolean).sort() as string[];
}

function sum(values: number[]): number | undefined {
  return values.length ? Number(values.reduce((total, value) => total + value, 0).toFixed(2)) : undefined;
}

function sumDefined(values: Array<number | undefined>): number | undefined {
  return sum(values.filter((value) => value !== undefined) as number[]);
}

function average(values: number[]): number | undefined {
  return values.length ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2)) : undefined;
}
