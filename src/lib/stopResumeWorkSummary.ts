import type { ConstructionStopResumeWorkRecord, ConstructionStopResumeWorkSummary, StopWorkReasonCategory, StopWorkScopeCategory } from '../types/stopResumeWork';

export function buildStopResumeWorkSummary(records: ConstructionStopResumeWorkRecord[]): ConstructionStopResumeWorkSummary {
  const durations = records.map((record) => record.daysUntilResumeOrReview).filter((value) => value !== undefined && value >= 0).sort((a, b) => a! - b!) as number[];
  return {
    totalRecords: records.length,
    minStopWorkDate: sorted(records.map((record) => record.stopWorkDate))[0],
    maxStopWorkDate: sorted(records.map((record) => record.stopWorkDate)).at(-1),
    latestStopWorkMonth: sorted(records.map((record) => record.stopWorkMonthKey)).at(-1),
    uniqueProjectCount: new Set(records.map((record) => record.projectNameNormalized ?? record.projectName)).size,
    uniqueBusinessEntityCount: new Set(records.map((record) => record.businessEntityNameNormalized ?? record.businessEntityName)).size,
    recordsWithResumeOrReviewDate: records.filter((record) => record.hasResumeOrReviewDate).length,
    recordsMissingResumeOrReviewDate: records.filter((record) => record.isMissingResumeOrReviewDate).length,
    averageDaysUntilResumeOrReview: average(durations),
    medianDaysUntilResumeOrReview: durations.length ? durations[Math.floor(durations.length / 2)] : undefined,
    maxDaysUntilResumeOrReview: durations.at(-1),
    byStopWorkMonth: grouped(records, (record) => record.stopWorkMonthKey, 'stopWorkMonthKey').sort((a, b) => a.stopWorkMonthKey.localeCompare(b.stopWorkMonthKey)).slice(-60),
    byStopWorkQuarter: grouped(records, (record) => record.stopWorkQuarter, 'stopWorkQuarter').sort((a, b) => a.stopWorkQuarter.localeCompare(b.stopWorkQuarter)).slice(-24),
    byBusinessEntity: groupEntities(records).slice(0, 20),
    byProject: groupProjects(records).slice(0, 20),
    byStopWorkReasonCategory: reasonCategories.map((stopWorkReasonCategory) => ({ stopWorkReasonCategory, count: records.filter((record) => record.stopWorkReasonCategory === stopWorkReasonCategory).length })),
    byStopWorkScopeCategory: scopeCategories.map((stopWorkScopeCategory) => ({ stopWorkScopeCategory, count: records.filter((record) => record.stopWorkScopeCategory === stopWorkScopeCategory).length })),
    topReasonKeywords: keywordRows(records.map((record) => record.stopWorkReason)),
    topScopeKeywords: keywordRows(records.map((record) => record.stopWorkScope))
  };
}

const reasonCategories: StopWorkReasonCategory[] = ['fall_prevention', 'scaffold', 'opening_or_edge', 'electrical', 'lifting_equipment', 'excavation', 'fire_or_hot_work', 'machinery', 'protective_equipment', 'other', 'unknown'];
const scopeCategories: StopWorkScopeCategory[] = ['entire_site', 'scaffold', 'exterior_wall', 'opening_or_edge', 'floor_or_area', 'equipment', 'other', 'unknown'];

function grouped<T extends string>(records: ConstructionStopResumeWorkRecord[], keyFn: (record: ConstructionStopResumeWorkRecord) => string | undefined, keyName: T): Array<Record<T, string> & { recordCount: number; missingResumeOrReviewDateCount: number; averageDaysUntilResumeOrReview?: number }> {
  const map = new Map<string, ConstructionStopResumeWorkRecord[]>();
  records.forEach((record) => {
    const key = keyFn(record);
    if (key) map.set(key, [...(map.get(key) ?? []), record]);
  });
  return [...map.entries()].map(([key, rows]) => ({ [keyName]: key, recordCount: rows.length, missingResumeOrReviewDateCount: rows.filter((row) => row.isMissingResumeOrReviewDate).length, averageDaysUntilResumeOrReview: average(rows.map((row) => row.daysUntilResumeOrReview).filter((value) => value !== undefined && value >= 0) as number[]) }) as Record<T, string> & { recordCount: number; missingResumeOrReviewDateCount: number; averageDaysUntilResumeOrReview?: number });
}

function groupEntities(records: ConstructionStopResumeWorkRecord[]) {
  return grouped(records, (record) => record.businessEntityName, 'businessEntityName')
    .map((row) => ({ ...row, uniqueProjectCount: new Set(records.filter((record) => record.businessEntityName === row.businessEntityName).map((record) => record.projectNameNormalized)).size }))
    .sort((a, b) => b.recordCount - a.recordCount);
}

function groupProjects(records: ConstructionStopResumeWorkRecord[]) {
  const map = new Map<string, ConstructionStopResumeWorkRecord[]>();
  records.forEach((record) => map.set(record.projectName, [...(map.get(record.projectName) ?? []), record]));
  return [...map.entries()].map(([projectName, rows]) => ({ projectName, recordCount: rows.length, businessEntityName: rows[0]?.businessEntityName, firstStopWorkDate: sorted(rows.map((row) => row.stopWorkDate))[0], latestStopWorkDate: sorted(rows.map((row) => row.stopWorkDate)).at(-1), missingResumeOrReviewDateCount: rows.filter((row) => row.isMissingResumeOrReviewDate).length })).sort((a, b) => b.recordCount - a.recordCount);
}

function keywordRows(values: Array<string | undefined>): Array<{ keyword: string; count: number }> {
  const keywords = ['防墜', '墜落', '安全帶', '安全網', '施工架', '鷹架', '開口', '邊緣', '護欄', '護蓋', '感電', '吊掛', '開挖'];
  return keywords.map((keyword) => ({ keyword, count: values.filter((value) => value?.includes(keyword)).length })).filter((row) => row.count > 0).sort((a, b) => b.count - a.count).slice(0, 20);
}

function sorted(values: Array<string | undefined>): string[] {
  return values.filter(Boolean).sort() as string[];
}

function average(values: number[]): number | undefined {
  return values.length ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2)) : undefined;
}
