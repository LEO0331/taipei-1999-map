import { createHash } from 'node:crypto';
import { TAIPEI_DISTRICTS } from './open1999';
import type { ConstructionStopResumeWorkRecord, ConstructionStopResumeWorkSummary, StopWorkReasonCategory, StopWorkScopeCategory } from '../types/stopResumeWork';

export const STOP_RESUME_WORK_SOURCE = '臺北市停復工公開資訊';
export const STOP_RESUME_WORK_SOURCE_AGENCY = '臺北市政府勞動局勞動檢查處';

const STOP_WORK_KEYWORDS = {
  fallPrevention: ['防墜', '墜落', '安全帶', '安全網', '防墜設施'],
  scaffold: ['施工架', '鷹架'],
  openingEdge: ['開口', '邊緣', '護欄', '護蓋'],
  electrical: ['感電', '電線', '配電', '電氣', '漏電'],
  liftingEquipment: ['吊', '吊掛', '起重'],
  excavation: ['開挖', '擋土', '土方', '支撐']
};

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'nan', 'null'].includes(text.toLowerCase()) ? text : undefined;
}

export function normalizeText(raw: unknown): string | undefined {
  return cleanText(raw)?.replace(/\s+/g, ' ');
}

export function parseIntegerText(raw: unknown): number | undefined {
  const text = cleanText(raw)?.replace(/,/g, '');
  if (!text) return undefined;
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) ? value : undefined;
}

export function parseTaiwanCompactDate(raw: unknown): { raw?: string; date?: string; year?: number; month?: number; monthKey?: string; quarter?: string; warning?: string } {
  const text = cleanText(raw);
  if (!text) return {};
  const compact = text.match(/^\d{6}$/)
    ? text.match(/^(\d{3})(\d{1})(\d{2})$/)
    : text.match(/^\d{7}$/)
      ? text.match(/^(\d{3})(\d{2})(\d{2})$/)
      : text.match(/^\d{8}$/)
        ? text.match(/^(\d{4})(\d{2})(\d{2})$/)
        : undefined;
  const match = compact ?? text.match(/^(\d{2,4})年(\d{1,2})月(\d{1,2})日/) ?? text.match(/^(\d{2,4})\D(\d{1,2})\D(\d{1,2})/);
  if (!match) return { raw: text, warning: text };
  const sourceYear = Number(match[1]);
  const year = sourceYear < 1911 ? sourceYear + 1911 : sourceYear;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { raw: text, warning: text };
  const monthKey = `${year}-${pad(month)}`;
  return { raw: text, date: `${monthKey}-${pad(day)}`, year, month, monthKey, quarter: `${year}-Q${Math.ceil(month / 3)}` };
}

export function deriveDaysUntilResumeOrReview(stopWorkDate?: string, resumeOrReviewDate?: string): { daysUntilResumeOrReview?: number; warning?: string } {
  if (!stopWorkDate || !resumeOrReviewDate) return {};
  const days = Math.round((Date.parse(resumeOrReviewDate) - Date.parse(stopWorkDate)) / 86400000);
  return days < 0 ? { daysUntilResumeOrReview: days, warning: `${stopWorkDate}|${resumeOrReviewDate}` } : { daysUntilResumeOrReview: days };
}

export function includesAny(text: string | undefined, keywords: string[]): boolean {
  return !!text && keywords.some((keyword) => text.includes(keyword));
}

export function classifyStopWorkReason(raw: string | undefined): StopWorkReasonCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (includesAny(text, STOP_WORK_KEYWORDS.fallPrevention)) return 'fall_prevention';
  if (includesAny(text, STOP_WORK_KEYWORDS.scaffold)) return 'scaffold';
  if (includesAny(text, STOP_WORK_KEYWORDS.openingEdge)) return 'opening_or_edge';
  if (includesAny(text, STOP_WORK_KEYWORDS.electrical)) return 'electrical';
  if (includesAny(text, STOP_WORK_KEYWORDS.liftingEquipment)) return 'lifting_equipment';
  if (includesAny(text, STOP_WORK_KEYWORDS.excavation)) return 'excavation';
  if (includesAny(text, ['火', '焊', '切割'])) return 'fire_or_hot_work';
  if (includesAny(text, ['機械', '機具', '設備'])) return 'machinery';
  if (includesAny(text, ['防護具', '安全帽', '個人防護'])) return 'protective_equipment';
  return 'other';
}

export function classifyStopWorkScope(raw: string | undefined): StopWorkScopeCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (includesAny(text, ['全區', '全場', '全工區'])) return 'entire_site';
  if (includesAny(text, STOP_WORK_KEYWORDS.scaffold)) return 'scaffold';
  if (text.includes('外牆')) return 'exterior_wall';
  if (includesAny(text, ['開口', '邊緣'])) return 'opening_or_edge';
  if (includesAny(text, ['樓', '區'])) return 'floor_or_area';
  if (includesAny(text, ['設備', '機具'])) return 'equipment';
  return 'other';
}

export function parsePossibleDistrictFromText(record: { projectName?: string; stopWorkScope?: string; stopWorkReason?: string }): string | undefined {
  const text = `${record.projectName ?? ''} ${record.stopWorkScope ?? ''} ${record.stopWorkReason ?? ''}`;
  return TAIPEI_DISTRICTS.find((district) => text.includes(district));
}

export function buildStopResumeWorkRecord(row: Record<string, unknown>): ConstructionStopResumeWorkRecord | undefined {
  const projectName = cleanText(row['工程名稱']);
  const businessEntityName = cleanText(row['事業單位名稱']);
  if (!projectName || !businessEntityName) return undefined;
  const stop = parseTaiwanCompactDate(row['停工日期']);
  const resume = parseTaiwanCompactDate(row['復工或復工審查日期']);
  const duration = deriveDaysUntilResumeOrReview(stop.date, resume.date);
  const stopWorkScope = cleanText(row['停工範圍']);
  const stopWorkReason = cleanText(row['停工原因']);
  const sourceSequenceNumber = parseIntegerText(row['序號']);
  const hashInput = [sourceSequenceNumber, projectName, businessEntityName, stop.raw].map((value) => normalizeText(value) ?? '').join('|');
  return {
    id: createHash('sha1').update(hashInput).digest('hex').slice(0, 16),
    module: 'construction_stop_resume_work_records',
    sourceSequenceNumber,
    projectName,
    projectNameNormalized: normalizeText(projectName),
    businessEntityName,
    businessEntityNameNormalized: normalizeText(businessEntityName),
    stopWorkDateRaw: stop.raw,
    stopWorkDate: stop.date,
    stopWorkYear: stop.year,
    stopWorkMonth: stop.month,
    stopWorkMonthKey: stop.monthKey,
    stopWorkQuarter: stop.quarter,
    resumeOrReviewDateRaw: resume.raw,
    resumeOrReviewDate: resume.date,
    resumeOrReviewYear: resume.year,
    resumeOrReviewMonth: resume.month,
    resumeOrReviewMonthKey: resume.monthKey,
    resumeOrReviewQuarter: resume.quarter,
    daysUntilResumeOrReview: duration.daysUntilResumeOrReview,
    hasResumeOrReviewDate: resume.date !== undefined,
    isMissingResumeOrReviewDate: resume.date === undefined,
    stopWorkScope,
    stopWorkScopeNormalized: normalizeText(stopWorkScope),
    stopWorkScopeCategory: classifyStopWorkScope(stopWorkScope),
    stopWorkReason,
    stopWorkReasonNormalized: normalizeText(stopWorkReason),
    stopWorkReasonCategory: classifyStopWorkReason(stopWorkReason),
    hasFallPreventionKeyword: includesAny(stopWorkReason, STOP_WORK_KEYWORDS.fallPrevention),
    hasScaffoldKeyword: includesAny(`${stopWorkScope ?? ''} ${stopWorkReason ?? ''}`, STOP_WORK_KEYWORDS.scaffold),
    hasOpeningEdgeKeyword: includesAny(stopWorkReason, STOP_WORK_KEYWORDS.openingEdge),
    hasElectricalKeyword: includesAny(stopWorkReason, STOP_WORK_KEYWORDS.electrical),
    hasLiftingEquipmentKeyword: includesAny(stopWorkReason, STOP_WORK_KEYWORDS.liftingEquipment),
    hasExcavationKeyword: includesAny(stopWorkReason, STOP_WORK_KEYWORDS.excavation),
    possibleDistrict: parsePossibleDistrictFromText({ projectName, stopWorkScope, stopWorkReason }),
    sourceRecordHash: createHash('sha256').update(JSON.stringify(row)).digest('hex'),
    source: STOP_RESUME_WORK_SOURCE,
    sourceAgency: STOP_RESUME_WORK_SOURCE_AGENCY
  };
}

export function deduplicateStopResumeWorkRecords(records: ConstructionStopResumeWorkRecord[]): { records: ConstructionStopResumeWorkRecord[]; duplicateRows: number; duplicateProjectNames: string[]; duplicateBusinessEntities: string[]; duplicateFallbackKeys: string[] } {
  const seen = new Set<string>();
  const projectCounts = new Map<string, number>();
  const entityCounts = new Map<string, number>();
  const fallbackCounts = new Map<string, number>();
  const output: ConstructionStopResumeWorkRecord[] = [];
  let duplicateRows = 0;
  for (const record of records) {
    const primary = [record.sourceSequenceNumber, record.projectName, record.businessEntityName, record.stopWorkDateRaw].map((value) => normalizeText(value) ?? '').join('|');
    const fallback = [record.projectName, record.businessEntityName, record.stopWorkDateRaw, record.stopWorkScope].map((value) => normalizeText(value) ?? '').join('|');
    projectCounts.set(record.projectNameNormalized ?? record.projectName, (projectCounts.get(record.projectNameNormalized ?? record.projectName) ?? 0) + 1);
    entityCounts.set(record.businessEntityNameNormalized ?? record.businessEntityName, (entityCounts.get(record.businessEntityNameNormalized ?? record.businessEntityName) ?? 0) + 1);
    fallbackCounts.set(fallback, (fallbackCounts.get(fallback) ?? 0) + 1);
    if (seen.has(primary)) duplicateRows += 1;
    else {
      seen.add(primary);
      output.push(record);
    }
  }
  return { records: output, duplicateRows, duplicateProjectNames: duplicateKeys(projectCounts), duplicateBusinessEntities: duplicateKeys(entityCounts), duplicateFallbackKeys: duplicateKeys(fallbackCounts) };
}

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

function duplicateKeys(map: Map<string, number>): string[] {
  return [...map.entries()].filter(([, count]) => count > 1).map(([key]) => key).slice(0, 20);
}

function sorted(values: Array<string | undefined>): string[] {
  return values.filter(Boolean).sort() as string[];
}

function average(values: number[]): number | undefined {
  return values.length ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2)) : undefined;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
