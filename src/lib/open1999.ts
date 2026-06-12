import type {
  ConversionReport,
  Open1999CategorySummary,
  Open1999DistrictSummary,
  Open1999Hotspot,
  Open1999Record,
  Open1999ServiceGroup,
  Open1999TimeSummary
} from '../types/open1999';

export const SERVICE_GROUPS: Open1999ServiceGroup[] = [
  'waste_cleaning',
  'noise_pollution',
  'environment_pollution',
  'road_traffic',
  'streetlight',
  'water',
  'animal',
  'tree_park',
  'drainage_flooding',
  'other'
];

export const TAIPEI_DISTRICTS = [
  '中正區',
  '大同區',
  '中山區',
  '松山區',
  '大安區',
  '萬華區',
  '信義區',
  '士林區',
  '北投區',
  '內湖區',
  '南港區',
  '文山區'
] as const;

export const TAIPEI_DISTRICT_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  中正區: { latitude: 25.0324, longitude: 121.5199 },
  大同區: { latitude: 25.0634, longitude: 121.513 },
  中山區: { latitude: 25.0642, longitude: 121.5335 },
  松山區: { latitude: 25.0497, longitude: 121.5778 },
  大安區: { latitude: 25.0268, longitude: 121.543 },
  萬華區: { latitude: 25.033, longitude: 121.497 },
  信義區: { latitude: 25.033, longitude: 121.5668 },
  士林區: { latitude: 25.095, longitude: 121.5246 },
  北投區: { latitude: 25.131, longitude: 121.501 },
  內湖區: { latitude: 25.0837, longitude: 121.5924 },
  南港區: { latitude: 25.0327, longitude: 121.6112 },
  文山區: { latitude: 24.9886, longitude: 121.5736 }
};

const SERVICE_GROUP_RULES: Array<{ group: Open1999ServiceGroup; keywords: string[] }> = [
  { group: 'waste_cleaning', keywords: ['大型廢棄物', '無主垃圾', '垃圾清運'] },
  { group: 'noise_pollution', keywords: ['噪音'] },
  { group: 'environment_pollution', keywords: ['污染'] },
  {
    group: 'road_traffic',
    keywords: ['道路', '坑洞', '散落物', '油漬', '交通號誌', '交通標誌', '人孔蓋', '道路掏空', '邊坡坍方', '橋梁', '隧道', '地下道', '涵洞']
  },
  { group: 'streetlight', keywords: ['路燈'] },
  { group: 'water', keywords: ['無水', '漏水'] },
  { group: 'animal', keywords: ['動物救援'] },
  { group: 'tree_park', keywords: ['路樹', '河濱公園', '自行車道', '自行車道'] },
  { group: 'drainage_flooding', keywords: ['雨水下水道', '側溝', '積淹水', '路面積淹水'] }
];

export function emptyServiceGroupCounts(): Record<Open1999ServiceGroup, number> {
  return Object.fromEntries(SERVICE_GROUPS.map((group) => [group, 0])) as Record<Open1999ServiceGroup, number>;
}

export function normalizeFullWidth(raw: string): string {
  return raw
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[－–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseDate(raw: string): string {
  const normalized = normalizeFullWidth(raw).replace(/[.-]/g, '/');
  const compact = normalized.replace(/\D/g, '');
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{8}$/.test(compact)) {
    year = Number(compact.slice(0, 4));
    month = Number(compact.slice(4, 6));
    day = Number(compact.slice(6, 8));
  } else if (/^\d{7}$/.test(compact)) {
    year = Number(compact.slice(0, 3)) + 1911;
    month = Number(compact.slice(3, 5));
    day = Number(compact.slice(5, 7));
  } else {
    const parts = normalized.split('/').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`Unsupported date: ${raw}`);
    year = parts[0] < 1911 ? parts[0] + 1911 : parts[0];
    month = parts[1];
    day = parts[2];
  }

  assertValidDate(year, month, day, raw);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseTime(raw: string): string {
  const normalized = normalizeFullWidth(raw);
  const digits = normalized.replace(/\D/g, '');
  let hour = 0;
  let minute = 0;
  let second = 0;

  if (normalized.includes(':')) {
    const [h = '0', m = '0', s = '0'] = normalized.split(':');
    hour = Number(h);
    minute = Number(m);
    second = Number(s);
  } else if (digits.length <= 2) {
    hour = Number(digits || '0');
  } else {
    const padded = digits.padStart(4, '0');
    hour = Number(padded.slice(0, 2));
    minute = Number(padded.slice(2, 4));
    second = Number(padded.slice(4, 6) || '0');
  }

  if ([hour, minute, second].some((part) => Number.isNaN(part))) throw new Error(`Unsupported time: ${raw}`);
  return `${pad(Math.min(hour, 23))}:${pad(Math.min(minute, 59))}:${pad(Math.min(second, 59))}`;
}

export function buildCreatedAt(date: string, time: string): string {
  return `${date}T${time}+08:00`;
}

export function extractDistrict(address: string): string | undefined {
  const normalized = normalizeAddress(address);
  return TAIPEI_DISTRICTS.find((district) => normalized.includes(district));
}

export function extractRoadOrBroadLocation(address: string): string | undefined {
  const district = extractDistrict(address);
  const withoutDistrict = normalizeAddress(address)
    .replace(/^台北市|^臺北市/, '')
    .replace(district ?? '', '')
    .trim();
  const beforeFloor = withoutDistrict.replace(/\d+\s*(樓|F|f).*/, '');
  const intersectionMatch = beforeFloor.match(/^(.+?(?:路|街|大道|巷|橋|公園|市場|車站|捷運站)(?:[一二三四五六七八九十]+段)?)[-－—](.+?(?:路|街|大道|巷|橋|公園|市場|車站|捷運站)(?:[一二三四五六七八九十]+段)?)/);
  if (intersectionMatch) return `${intersectionMatch[1]}－${intersectionMatch[2]}`;

  const roadMatch = beforeFloor.match(/([^\d\s,，;；()（）]*(?:路|街|大道)(?:[一二三四五六七八九十]+段)?)/);
  if (roadMatch) return roadMatch[1];

  const broadMatch = beforeFloor.match(/([^\d\s,，;；()（）]*(?:公園|市場|車站|捷運站|橋|河濱|地下道|隧道|廣場))/);
  return broadMatch?.[1];
}

export function maskPrivateAddress(address: string): string {
  const district = extractDistrict(address);
  const road = extractRoadOrBroadLocation(address);
  if (district && road) return `${district} ${road}`;
  if (district) return district;
  return road ?? '未標示地點';
}

export function normalizeServiceItem(raw: string): string {
  return normalizeFullWidth(raw).replace(/\s+/g, '');
}

export function classifyServiceGroup(serviceItem: string): Open1999ServiceGroup {
  const normalized = normalizeServiceItem(serviceItem);
  return SERVICE_GROUP_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))?.group ?? 'other';
}

export function buildOpen1999Record(row: Record<string, unknown>, sourceFile: string, index: number): Open1999Record | undefined {
  const trimmed = trimRowKeys(row);
  const caseId = normalizeFullWidth(String(trimmed['案件編號'] ?? '')).trim();
  const serviceItem = normalizeServiceItem(String(trimmed['派工項目'] ?? ''));
  const originalAddress = normalizeAddress(String(trimmed['案件地址'] ?? ''));
  const rawDate = String(trimmed['立案日期'] ?? '');
  const rawTime = String(trimmed['立案時間'] ?? '');
  if (!caseId || !serviceItem || !rawDate) return undefined;

  const createdDate = parseDate(rawDate);
  const createdTime = parseTime(rawTime || '00:00');
  const createdAt = buildCreatedAt(createdDate, createdTime);
  const created = new Date(createdAt);
  const district = extractDistrict(originalAddress);
  const road = extractRoadOrBroadLocation(originalAddress);
  const serviceGroup = classifyServiceGroup(serviceItem);

  return {
    id: `${sourceFile.replace(/\W+/g, '-')}-${caseId || index}`,
    caseId,
    serviceItem,
    serviceGroup,
    originalAddress,
    displayLocation: maskPrivateAddress(originalAddress),
    district,
    road,
    createdDate,
    createdTime,
    createdAt,
    year: created.getFullYear(),
    month: created.getMonth() + 1,
    day: created.getDate(),
    weekday: created.getDay(),
    hour: Number(createdTime.slice(0, 2)),
    sourceFile
  };
}

export function aggregateByDistrict(records: Open1999Record[]): Open1999DistrictSummary[] {
  const summaries = new Map<string, Open1999DistrictSummary>();
  for (const record of records) {
    if (!record.district) continue;
    const centroid = TAIPEI_DISTRICT_CENTROIDS[record.district];
    if (!centroid) continue;
    const summary =
      summaries.get(record.district) ??
      {
        district: record.district,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        totalCount: 0,
        byServiceGroup: emptyServiceGroupCounts(),
        byServiceItem: {}
      };
    summary.totalCount += 1;
    summary.byServiceGroup[record.serviceGroup] += 1;
    summary.byServiceItem[record.serviceItem] = (summary.byServiceItem[record.serviceItem] ?? 0) + 1;
    summaries.set(record.district, summary);
  }
  return [...summaries.values()].sort((a, b) => b.totalCount - a.totalCount);
}

export function aggregateByHotspot(records: Open1999Record[]): Open1999Hotspot[] {
  const summaries = new Map<string, Open1999Hotspot>();
  for (const record of records) {
    if (!record.district || !record.displayLocation) continue;
    const key = `${record.district}|${record.displayLocation}`;
    const centroid = TAIPEI_DISTRICT_CENTROIDS[record.district];
    const summary =
      summaries.get(key) ??
      {
        id: key.replace(/[^\p{Letter}\p{Number}]+/gu, '-'),
        district: record.district,
        displayLocation: record.displayLocation,
        latitude: centroid?.latitude,
        longitude: centroid?.longitude,
        totalCount: 0,
        byServiceGroup: emptyServiceGroupCounts(),
        byServiceItem: {},
        years: [],
        months: []
      };
    summary.totalCount += 1;
    summary.byServiceGroup[record.serviceGroup] += 1;
    summary.byServiceItem[record.serviceItem] = (summary.byServiceItem[record.serviceItem] ?? 0) + 1;
    addUnique(summary.years, record.year);
    addUnique(summary.months, `${record.year}-${pad(record.month)}`);
    summaries.set(key, summary);
  }
  return [...summaries.values()]
    .map((hotspot, index) => ({ ...hotspot, ...offsetHotspot(hotspot, index) }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

export function aggregateByCategory(records: Open1999Record[]): Open1999CategorySummary[] {
  const summaries = new Map<Open1999ServiceGroup, Open1999CategorySummary>();
  for (const record of records) {
    const summary = summaries.get(record.serviceGroup) ?? {
      serviceGroup: record.serviceGroup,
      totalCount: 0,
      byServiceItem: {}
    };
    summary.totalCount += 1;
    summary.byServiceItem[record.serviceItem] = (summary.byServiceItem[record.serviceItem] ?? 0) + 1;
    summaries.set(record.serviceGroup, summary);
  }
  return SERVICE_GROUPS.map((group) => summaries.get(group) ?? { serviceGroup: group, totalCount: 0, byServiceItem: {} });
}

export function aggregateByDay(records: Open1999Record[]): Array<{ date: string; count: number }> {
  return countBy(records, (record) => record.createdDate).map(([date, count]) => ({ date, count }));
}

export function aggregateByHour(records: Open1999Record[]): Array<{ hour: number; count: number }> {
  const counts = countBy(records, (record) => String(record.hour));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts.find(([key]) => Number(key) === hour)?.[1] ?? 0 }));
}

export function aggregateByTime(records: Open1999Record[]): Open1999TimeSummary {
  const byMonth = countBy(records, (record) => `${record.year}-${pad(record.month)}`).map(([month, count]) => ({ month, count }));
  const weekdayCount = records.filter((record) => record.weekday > 0 && record.weekday < 6).length;
  return {
    byDay: aggregateByDay(records),
    byHour: aggregateByHour(records),
    byMonth,
    weekdayVsWeekend: [
      { type: 'weekday', count: weekdayCount },
      { type: 'weekend', count: records.length - weekdayCount }
    ]
  };
}

export function buildConversionReport(records: Open1999Record[], sourceFiles: string[], inputRecords: number, skippedRecords: number): ConversionReport {
  const dates = records.map((record) => record.createdDate).sort();
  return {
    generatedAt: new Date().toISOString(),
    sourceFiles,
    inputRecords,
    outputRecords: records.length,
    skippedRecords,
    period: dates.length ? { start: dates[0], end: dates[dates.length - 1] } : undefined,
    notes: [
      'Public UI should use displayLocation and summaries, not originalAddress.',
      'Coordinates are district centroids unless a cached anonymized hotspot coordinate is available.'
    ]
  };
}

function normalizeAddress(raw: string): string {
  return normalizeFullWidth(raw)
    .replace(/[臺]/g, '台')
    .replace(/\s+/g, '')
    .replace(/-/g, '－');
}

function trimRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().replace(/^\uFEFF/, ''), value]));
}

function countBy<T>(items: T[], getKey: (item: T) => string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function offsetHotspot(hotspot: Open1999Hotspot, index: number): Pick<Open1999Hotspot, 'latitude' | 'longitude'> {
  if (!hotspot.latitude || !hotspot.longitude) return {};
  const angle = (index % 16) * (Math.PI / 8);
  const radius = 0.003 + (index % 5) * 0.0007;
  return {
    latitude: hotspot.latitude + Math.sin(angle) * radius,
    longitude: hotspot.longitude + Math.cos(angle) * radius
  };
}

function addUnique<T>(items: T[], item: T): void {
  if (!items.includes(item)) items.push(item);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function assertValidDate(year: number, month: number, day: number, raw: string): void {
  const nextYear = new Date().getFullYear() + 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    year >= 2000 &&
    year <= nextYear &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!valid) throw new Error(`Unsupported date: ${raw}`);
}
