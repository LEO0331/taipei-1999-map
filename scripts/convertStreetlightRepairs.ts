import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import {
  buildStreetlightRecord,
  buildStreetlightSummary,
  deduplicateStreetlightRecords,
  STREETLIGHT_SOURCE,
  STREETLIGHT_SOURCE_AGENCY
} from '../src/lib/streetlight';
import type { Open1999Record } from '../src/types/open1999';
import type { ServiceRecordsSummary, StreetlightRepairRecord } from '../src/types/streetlight';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/streetlight-repairs');
const publicDataDir = path.join(root, 'public/data');

async function main(): Promise<void> {
  await mkdir(rawDir, { recursive: true });
  await mkdir(publicDataDir, { recursive: true });
  const files = (await readdir(rawDir)).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
  const parsedRecords: StreetlightRepairRecord[] = [];
  const warnings: string[] = [];
  let inputRows = 0;
  let skippedRows = 0;

  for (const file of files) {
    const rows = Papa.parse<Record<string, unknown>>(await readCsvText(path.join(rawDir, file)), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
      transform: (value) => (typeof value === 'string' ? value.trim() : value)
    }).data;
    inputRows += rows.length;
    for (const row of rows) {
      const record = buildStreetlightRecord(trimKeys(row), file);
      if (record) parsedRecords.push(record);
      else skippedRows += 1;
    }
  }

  const deduped = deduplicateStreetlightRecords(parsedRecords);
  const summary = buildStreetlightSummary(deduped.records);
  await writeJson('streetlight-repairs.json', deduped.records, false);
  await writeJson('streetlight-repair-summary.json', summary);
  await writeJson('service-records-summary.json', await buildServiceSummary(deduped.records));
  await mergeConversionReport({
    source: STREETLIGHT_SOURCE,
    sourceAgency: STREETLIGHT_SOURCE_AGENCY,
    sourceFiles: files,
    inputRows,
    outputRecords: deduped.records.length,
    skippedRows,
    duplicateRows: deduped.duplicates,
    conflictReportIdExamples: deduped.conflicts,
    invalidDistrictExamples: examples(deduped.records.filter((record) => record.districtStatus === 'invalid').map((record) => record.districtRaw)),
    outsideTaipeiDistrictExamples: examples(deduped.records.filter((record) => record.districtStatus === 'outside_taipei').map((record) => record.districtRaw)),
    parseWarningExamples: examples(deduped.records.filter((record) => !record.reportedAt).map((record) => record.reportedAtRaw)),
    warnings
  });
  console.log(`Converted ${deduped.records.length}/${inputRows} streetlight records from ${files.length} CSV file(s).`);
}

async function readCsvText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const utf8 = buffer.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8.includes('查報序號') && typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('big5').decode(buffer);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

function trimKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().replace(/^\uFEFF/, ''), value]));
}

async function buildServiceSummary(streetlight: StreetlightRepairRecord[]): Promise<ServiceRecordsSummary> {
  const open1999 = await readJson<Open1999Record[]>('open1999-records.json', []);
  const serviceGroupCounts = new Map<string, number>();
  open1999.forEach((record) => serviceGroupCounts.set(record.serviceGroup, (serviceGroupCounts.get(record.serviceGroup) ?? 0) + 1));
  const top1999ServiceGroup = [...serviceGroupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const issueCounts = new Map<string, number>();
  streetlight.forEach((record) => record.issueTypes.forEach((type) => issueCounts.set(type, (issueCounts.get(type) ?? 0) + 1)));
  return {
    open1999DispatchRecordCount: open1999.length,
    streetlightRepairRecordCount: streetlight.length,
    streetlightRelated1999Count: open1999.filter((record) => record.serviceGroup === 'streetlight').length,
    top1999ServiceGroup,
    topStreetlightIssueType: [...issueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as ServiceRecordsSummary['topStreetlightIssueType']
  };
}

async function mergeConversionReport(streetlightRepair: unknown): Promise<void> {
  const existing = await readJson<Record<string, unknown>>('conversion-report.json', {});
  await writeJson('conversion-report.json', { ...existing, generatedAt: new Date().toISOString(), streetlightRepair });
}

async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(publicDataDir, fileName), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function examples(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, 20) as string[];
}

async function writeJson(fileName: string, value: unknown, pretty = true): Promise<void> {
  await writeFile(path.join(publicDataDir, fileName), `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
