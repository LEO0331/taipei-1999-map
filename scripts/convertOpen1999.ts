import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import {
  aggregateByCategory,
  aggregateByDistrict,
  aggregateByHotspot,
  aggregateByTime,
  buildConversionReport,
  buildOpen1999Record
} from '../src/lib/open1999';
import type { Open1999Record } from '../src/types/open1999';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/open1999');
const publicDataDir = path.join(root, 'public/data');
const publicRecordLimit = Number(process.env.OPEN1999_PUBLIC_RECORD_LIMIT ?? '150000');

async function main(): Promise<void> {
  await mkdir(rawDir, { recursive: true });
  await mkdir(publicDataDir, { recursive: true });

  const files = (await readdir(rawDir)).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
  const records: Open1999Record[] = [];
  let inputRecords = 0;
  let skippedRecords = 0;

  for (const file of files) {
    const content = await readCsvText(path.join(rawDir, file));
    const parsed = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, '')
    });
    inputRecords += parsed.data.length;
    parsed.data.forEach((row, index) => {
      try {
        const record = buildOpen1999Record(row, file, index);
        if (record) records.push(record);
        else skippedRecords += 1;
      } catch {
        skippedRecords += 1;
      }
    });
  }

  const publicRecords = records
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, publicRecordLimit > 0 ? publicRecordLimit : undefined)
    .map(({ originalAddress: _originalAddress, ...record }) => record);
  const report = buildConversionReport(publicRecords, files, inputRecords, skippedRecords);
  report.notes.push(
    `Raw CSV rows retained locally under data/raw/open1999. Public JSON contains ${publicRecords.length.toLocaleString()} sanitized latest records for mobile performance.`
  );
  await writeJson('open1999-records.json', publicRecords);
  await writeJson('open1999-district-summary.json', aggregateByDistrict(publicRecords));
  await writeJson('open1999-category-summary.json', aggregateByCategory(publicRecords));
  await writeJson('open1999-hotspots.json', aggregateByHotspot(publicRecords));
  await writeJson('open1999-time-summary.json', aggregateByTime(publicRecords));
  await writeJson('conversion-report.json', report);

  console.log(`Converted ${publicRecords.length}/${inputRecords} records from ${files.length} CSV file(s).`);
  if (skippedRecords) console.log(`Skipped ${skippedRecords} incomplete or unsupported row(s).`);
}

async function readCsvText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const utf8 = buffer.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8.includes('案件編號') && typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('big5').decode(buffer);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await writeFile(path.join(publicDataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
