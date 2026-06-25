import { TAIPEI_DISTRICT_CENTROIDS, TAIPEI_DISTRICTS, normalizeFullWidth } from './open1999';
import type { DistrictStatus, StreetlightIssueType, StreetlightRepairRecord, StreetlightRepairSummary } from '../types/streetlight';

export const STREETLIGHT_SOURCE = '臺北市路燈維修資料';
export const STREETLIGHT_SOURCE_AGENCY = '臺北市政府工務局公園路燈工程管理處';
export const STREETLIGHT_ISSUE_TYPES: StreetlightIssueType[] = ['light_out', 'always_on', 'wire_or_electrical', 'pole_or_fixture_damage', 'cover_or_lamp_damage', 'multiple_lights', 'urgent', 'unclear', 'other'];

const DISTRICT_NORMALIZATION: Record<string, string> = Object.fromEntries([
  ...TAIPEI_DISTRICTS.map((district) => [district.replace('區', ''), district]),
  ...TAIPEI_DISTRICTS.map((district) => [district, district])
]);

const OUTSIDE_TAIPEI = new Set(['非台北市域', '非臺北市域', '新店', '新店區']);
const ISSUE_PATTERNS: Array<{ issueType: StreetlightIssueType; patterns: RegExp[] }> = [
  { issueType: 'urgent', patterns: [/緊急案件/, /緊急/] },
  { issueType: 'light_out', patterns: [/不亮/, /失明/, /熄滅/, /燈不亮/, /未亮/] },
  { issueType: 'always_on', patterns: [/一直亮/, /白天.*亮/, /未關/, /長亮/, /日間.*亮/] },
  { issueType: 'wire_or_electrical', patterns: [/電線/, /外露/, /垂落/, /漏電/, /火花/, /電擊/] },
  { issueType: 'pole_or_fixture_damage', patterns: [/燈桿/, /傾斜/, /歪/, /倒/, /斷裂/, /基座/] },
  { issueType: 'cover_or_lamp_damage', patterns: [/燈罩/, /蓋子/, /蓋板/, /破損/, /掉落/, /脫落/, /燈泡/] },
  { issueType: 'multiple_lights', patterns: [/\d+\s*盞/, /\d+\s*失/, /多盞/, /整排/, /整條/] }
];

export function cleanText(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = normalizeFullWidth(String(value)).trim();
  if (!text || text.toLowerCase() === 'nan') return undefined;
  return text;
}

export function parseReportedAt(raw: string | undefined): {
  reportedAt?: string;
  reportedYear?: number;
  reportedMonth?: number;
  reportedDate?: string;
  reportedHour?: number;
  reportedWeekday?: number;
  isWeekend?: boolean;
  warning?: string;
} {
  const text = cleanText(raw);
  if (!text) return { warning: 'missing reported date' };
  const normalized = text.replace(/\//g, '-').replace(' ', 'T');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return { warning: `unsupported date: ${text}` };
  const [, y, m, d, h, minute, s = '00'] = match;
  const date = new Date(`${y}-${m}-${d}T${h}:${minute}:${s}+08:00`);
  if (Number.isNaN(date.getTime())) return { warning: `invalid date: ${text}` };
  const reportedDate = `${y}-${m}-${d}`;
  const reportedHour = Number(h);
  const reportedWeekday = date.getDay();
  return {
    reportedAt: `${reportedDate}T${h}:${minute}:${s}+08:00`,
    reportedYear: Number(y),
    reportedMonth: Number(m),
    reportedDate,
    reportedHour,
    reportedWeekday,
    isWeekend: reportedWeekday === 0 || reportedWeekday === 6
  };
}

export function normalizeTaipeiDistrict(raw: unknown): { districtRaw?: string; district?: string; districtStatus: DistrictStatus; warning?: string } {
  const districtRaw = cleanText(raw);
  if (!districtRaw) return { districtStatus: 'missing' };
  const cleaned = districtRaw.replace(/[?？]+$/g, '');
  const district = DISTRICT_NORMALIZATION[cleaned];
  if (district) return { districtRaw, district, districtStatus: districtRaw === district ? 'valid' : 'normalized', warning: districtRaw !== cleaned ? `normalized noisy district: ${districtRaw}` : undefined };
  if (OUTSIDE_TAIPEI.has(cleaned)) return { districtRaw, districtStatus: 'outside_taipei' };
  return { districtRaw, districtStatus: 'invalid' };
}

export function classifyStreetlightIssueTypes(issueDescription: string | undefined): StreetlightIssueType[] {
  const text = cleanText(issueDescription);
  if (!text) return ['unclear'];
  const matches = ISSUE_PATTERNS.filter((entry) => entry.patterns.some((pattern) => pattern.test(text))).map((entry) => entry.issueType);
  return matches.length ? matches : ['other'];
}

export function maskReportedLocation(raw: string | undefined): string | undefined {
  const text = cleanText(raw);
  if (!text) return undefined;
  return text.replace(/(\d+(?:之\d+)?)(號)/g, '***$2').replace(/(\d+)(樓|F|f).*/g, '***$2');
}

export function extractRoadName(location: string | undefined): string | undefined {
  const text = cleanText(location);
  const matches = text?.match(/[\u4e00-\u9fa5A-Za-z0-9]+(?:路|街|大道|巷|弄|橋|高架|公園)(?:[一二三四五六七八九十0-9]+段)?/g);
  return matches?.at(-1)?.replace(/^.*[市區里鄰]/, '');
}

export function buildStreetlightRecord(row: Record<string, unknown>, sourceFileName: string): StreetlightRepairRecord | undefined {
  const reportId = cleanText(row['查報序號']);
  const reportedAtRaw = cleanText(row['查報日期']);
  if (!reportId || !reportedAtRaw) return undefined;
  const districtInfo = normalizeTaipeiDistrict(row['行政區']);
  const reportedLocation = cleanText(row['查報地點']);
  const issueDescription = cleanText(row['故障情形']);
  const issueTypes = classifyStreetlightIssueTypes(issueDescription);
  return {
    id: `${reportId}-${sourceFileName}`.replace(/[^\p{Letter}\p{Number}]+/gu, '-'),
    module: 'streetlight_repair',
    sourceFileName,
    reportId,
    districtRaw: districtInfo.districtRaw,
    district: districtInfo.district,
    districtStatus: districtInfo.districtStatus,
    reportedLocation,
    reportedLocationMasked: maskReportedLocation(reportedLocation),
    roadName: extractRoadName(reportedLocation),
    issueDescription,
    issueTypes,
    isUrgent: issueTypes.includes('urgent'),
    reportedAtRaw,
    ...parseReportedAt(reportedAtRaw),
    source: STREETLIGHT_SOURCE,
    sourceAgency: STREETLIGHT_SOURCE_AGENCY
  };
}

export function deduplicateStreetlightRecords(records: StreetlightRepairRecord[]): { records: StreetlightRepairRecord[]; duplicates: number; conflicts: string[] } {
  const seen = new Map<string, StreetlightRepairRecord>();
  const conflicts: string[] = [];
  let duplicates = 0;
  for (const record of records) {
    const key = [record.reportId, record.reportedAtRaw, record.reportedLocation, record.issueDescription].map((part) => cleanText(part) ?? '').join('|');
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    const sameId = [...seen.values()].find((existing) => existing.reportId === record.reportId);
    if (sameId) conflicts.push(record.reportId);
    seen.set(key, record);
  }
  return { records: [...seen.values()], duplicates, conflicts: [...new Set(conflicts)].slice(0, 20) };
}

export function buildStreetlightSummary(records: StreetlightRepairRecord[]): StreetlightRepairSummary {
  const dated = records.filter((record) => record.reportedAt);
  const validDistricts = records.filter((record) => record.district);
  return {
    totalRecords: records.length,
    uniqueReportIdCount: new Set(records.map((record) => record.reportId)).size,
    minReportedAt: dated.map((record) => record.reportedAt!).sort()[0],
    maxReportedAt: dated.map((record) => record.reportedAt!).sort().at(-1),
    yearCount: new Set(dated.map((record) => record.reportedYear)).size,
    districtCount: new Set(validDistricts.map((record) => record.district)).size,
    invalidDistrictCount: records.filter((record) => ['invalid', 'missing', 'outside_taipei'].includes(record.districtStatus)).length,
    missingLocationCount: records.filter((record) => !record.reportedLocation).length,
    missingIssueDescriptionCount: records.filter((record) => !record.issueDescription).length,
    urgentRecordCount: records.filter((record) => record.isUrgent).length,
    byYear: toRows(countBy(dated, (record) => String(record.reportedYear)), 'year'),
    byMonth: monthRows(dated),
    byDistrict: districtRows(validDistricts),
    byIssueType: issueRows(records),
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, recordCount: dated.filter((record) => record.reportedHour === hour).length })),
    byWeekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, recordCount: dated.filter((record) => record.reportedWeekday === weekday).length })),
    byRoadName: toRows(countBy(records.filter((record) => record.roadName), (record) => record.roadName!), 'roadName').filter((row) => row.recordCount >= 3).slice(0, 30)
  };
}

function countBy<T>(records: T[], key: (record: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  records.forEach((record) => counts.set(key(record), (counts.get(key(record)) ?? 0) + 1));
  return counts;
}

function toRows(map: Map<string, number>, keyName: 'year' | 'roadName'): any[] {
  return [...map.entries()]
    .map(([key, recordCount]) => ({ [keyName]: keyName === 'year' ? Number(key) : key, recordCount }))
    .sort((a, b) => keyName === 'year' ? Number(a.year) - Number(b.year) : b.recordCount - a.recordCount);
}

function monthRows(records: StreetlightRepairRecord[]): StreetlightRepairSummary['byMonth'] {
  return [...countBy(records, (record) => `${record.reportedYear}-${String(record.reportedMonth).padStart(2, '0')}`).entries()]
    .map(([periodKey, recordCount]) => {
      const [year, month] = periodKey.split('-').map(Number);
      return { periodKey, year, month, recordCount, urgentRecordCount: records.filter((record) => record.isUrgent && record.reportedYear === year && record.reportedMonth === month).length };
    })
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

function districtRows(records: StreetlightRepairRecord[]): StreetlightRepairSummary['byDistrict'] {
  return [...countBy(records, (record) => record.district!).entries()]
    .map(([district, recordCount]) => ({
      district,
      latitude: TAIPEI_DISTRICT_CENTROIDS[district].latitude,
      longitude: TAIPEI_DISTRICT_CENTROIDS[district].longitude,
      recordCount,
      urgentRecordCount: records.filter((record) => record.district === district && record.isUrgent).length,
      topIssueTypes: issueRows(records.filter((record) => record.district === district)).slice(0, 3)
    }))
    .sort((a, b) => b.recordCount - a.recordCount);
}

function issueRows(records: StreetlightRepairRecord[]): StreetlightRepairSummary['byIssueType'] {
  const counts = new Map<StreetlightIssueType, number>();
  records.forEach((record) => record.issueTypes.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1)));
  return STREETLIGHT_ISSUE_TYPES.map((issueType) => ({ issueType, count: counts.get(issueType) ?? 0 })).sort((a, b) => b.count - a.count);
}
