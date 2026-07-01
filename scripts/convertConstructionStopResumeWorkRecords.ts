import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { buildStopResumeWorkRecord, buildStopResumeWorkSummary, cleanText, deduplicateStopResumeWorkRecords, STOP_RESUME_WORK_SOURCE, STOP_RESUME_WORK_SOURCE_AGENCY } from '../src/lib/stopResumeWork';
import type { ConstructionStopResumeWorkRecord } from '../src/types/stopResumeWork';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/construction-stop-resume-work-records');
const publicDataDir = path.join(root, 'public/data');

async function main(): Promise<void> {
  await mkdir(rawDir, { recursive: true });
  await mkdir(publicDataDir, { recursive: true });
  const files = (await readdir(rawDir)).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
  const records: ConstructionStopResumeWorkRecord[] = [];
  let inputRows = 0;
  let skippedRows = 0;

  for (const file of files) {
    const rows = Papa.parse<Record<string, unknown>>(await readCsvText(path.join(rawDir, file)), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
      transform: (value) => (typeof value === 'string' ? value.trim() : value)
    }).data.map(trimKeys);
    inputRows += rows.length;
    for (const row of rows) {
      const record = buildStopResumeWorkRecord(row);
      if (record) records.push(record);
      else skippedRows += 1;
    }
  }

  const deduped = deduplicateStopResumeWorkRecords(records);
  const summary = buildStopResumeWorkSummary(deduped.records);
  const latest = [...deduped.records].sort((a, b) => (b.stopWorkDate ?? '').localeCompare(a.stopWorkDate ?? '')).slice(0, 50);
  await writeJson('construction-stop-resume-work-records.json', deduped.records);
  await writeJson('construction-stop-resume-work-summary.json', summary);
  await writeJson('construction-stop-resume-work-latest.json', latest);
  await writeJson('taipei-1999-dashboard-summary.json', await buildDashboardSummary(summary));
  await mergeConversionReport({
    source: STOP_RESUME_WORK_SOURCE,
    sourceAgency: STOP_RESUME_WORK_SOURCE_AGENCY,
    officialSourceAgency: '勞動局勞檢處',
    sourceFiles: files,
    inputRows,
    outputRecords: deduped.records.length,
    skippedRows,
    duplicateRows: deduped.duplicateRows,
    duplicateProjectNameExamples: deduped.duplicateProjectNames,
    duplicateBusinessEntityExamples: deduped.duplicateBusinessEntities,
    duplicateFallbackKeyExamples: deduped.duplicateFallbackKeys,
    invalidStopWorkDateExamples: examples(records.filter((record) => !record.stopWorkDate).map((record) => record.stopWorkDateRaw)),
    invalidResumeOrReviewDateExamples: examples(records.filter((record) => record.resumeOrReviewDateRaw && !record.resumeOrReviewDate).map((record) => record.resumeOrReviewDateRaw)),
    earlierResumeOrReviewExamples: examples(records.filter((record) => (record.daysUntilResumeOrReview ?? 0) < 0).map((record) => `${record.stopWorkDate}|${record.resumeOrReviewDate}`)),
    missingResumeOrReviewDateCount: summary.recordsMissingResumeOrReviewDate
  });
  console.log(`Converted ${deduped.records.length}/${inputRows} stop/resume work records from ${files.length} CSV file(s).`);
}

async function readCsvText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const utf8 = buffer.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8.includes('工程名稱') && typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('big5').decode(buffer);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

function trimKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().replace(/^\uFEFF/, ''), typeof value === 'string' ? cleanText(value) : value]));
}

async function buildDashboardSummary(stopResumeWork: ReturnType<typeof buildStopResumeWorkSummary>) {
  const existing = await readJson<Record<string, unknown>>(path.join(publicDataDir, 'taipei-1999-dashboard-summary.json'), {});
  return { ...existing, stopResumeWork };
}

async function mergeConversionReport(stopResumeWork: unknown): Promise<void> {
  const existing = await readJson<Record<string, unknown>>(path.join(publicDataDir, 'conversion-report.json'), {});
  await writeJson('conversion-report.json', { ...existing, generatedAt: new Date().toISOString(), stopResumeWork });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function examples(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, 20) as string[];
}

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await writeFile(path.join(publicDataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
