import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import {
  buildConstructionAuditRecord,
  buildConstructionAuditSummary,
  cleanText,
  CONSTRUCTION_AUDIT_SOURCE,
  CONSTRUCTION_AUDIT_SOURCE_AGENCY,
  deduplicateConstructionAuditRecords
} from '../src/lib/constructionAudit';
import type { PublicWorksConstructionAuditRecord } from '../src/types/constructionAudit';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/public-works-construction-audit-records');
const publicDataDir = path.join(root, 'public/data');

async function main(): Promise<void> {
  await mkdir(rawDir, { recursive: true });
  await mkdir(publicDataDir, { recursive: true });
  const files = (await readdir(rawDir)).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
  const index = await readJson<{ resources?: Array<{ fileName: string; resourceName: string; url: string; rowCount: number; downloadedAt: string; bytes: number; encoding: string }> }>(path.join(rawDir, 'resource-index.json'), {});
  const records: PublicWorksConstructionAuditRecord[] = [];
  const warnings: string[] = [];
  let inputRows = 0;
  let skippedRows = 0;

  for (const file of files) {
    const resourceName = index.resources?.find((resource) => resource.fileName === file)?.resourceName ?? file.replace(/-[0-9a-f-]{36}\.csv$/i, '');
    const rows = Papa.parse<Record<string, unknown>>(await readCsvText(path.join(rawDir, file)), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
      transform: (value) => (typeof value === 'string' ? value.trim() : value)
    }).data.map(trimKeys);
    inputRows += rows.length;
    for (const row of rows) {
      const record = buildConstructionAuditRecord(row, resourceName);
      if (record) records.push(record);
      else skippedRows += 1;
    }
  }

  const deduped = deduplicateConstructionAuditRecords(records);
  const summary = buildConstructionAuditSummary(deduped.records);
  const latest = [...deduped.records].sort((a, b) => (b.auditDate ?? '').localeCompare(a.auditDate ?? '')).slice(0, 50);
  await writeJson('public-works-construction-audit-records.json', deduped.records);
  await writeJson('public-works-construction-audit-summary.json', summary);
  await writeJson('public-works-construction-audit-latest.json', latest);
  await writeJson('taipei-1999-dashboard-summary.json', await buildDashboardSummary(summary));
  await mergeConversionReport({
    source: CONSTRUCTION_AUDIT_SOURCE,
    sourceAgency: CONSTRUCTION_AUDIT_SOURCE_AGENCY,
    sourceFiles: files,
    resources: index.resources ?? [],
    inputRows,
    outputRecords: deduped.records.length,
    skippedRows,
    duplicateRows: deduped.duplicateRows,
    duplicateProjectNameExamples: deduped.duplicateProjectNames,
    duplicateFallbackKeyExamples: deduped.duplicateFallbackKeys,
    invalidDateExamples: examples(records.filter((record) => !record.auditDate).map((record) => record.auditDateRaw)),
    invalidNumberExamples: examples(records.flatMap((record) => [record.contractAmountThousandNtd === undefined ? record.projectName : undefined])),
    warnings
  });
  console.log(`Converted ${deduped.records.length}/${inputRows} construction audit records from ${files.length} CSV file(s).`);
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

async function buildDashboardSummary(constructionAudit: ReturnType<typeof buildConstructionAuditSummary>) {
  const existing = await readJson<Record<string, unknown>>(path.join(publicDataDir, 'service-records-summary.json'), {});
  return { ...existing, constructionAudit };
}

async function mergeConversionReport(constructionAudit: unknown): Promise<void> {
  const existing = await readJson<Record<string, unknown>>(path.join(publicDataDir, 'conversion-report.json'), {});
  await writeJson('conversion-report.json', { ...existing, generatedAt: new Date().toISOString(), constructionAudit });
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
