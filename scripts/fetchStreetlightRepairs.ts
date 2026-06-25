import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_PAGE = 'https://data.taipei/dataset/detail?id=0219b559-c9e4-4efe-93f0-9961360bd7bf';
const KNOWN_RESOURCE_IDS = ['0219b559-c9e4-4efe-93f0-9961360bd7bf'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/streetlight-repairs');
const indexPath = path.join(rawDir, 'resource-index.json');

type ResourceIndex = { generatedAt: string; datasetPage: string; resources: Array<{ id: string; url: string; fileName: string; downloadedAt: string; sha256: string; bytes: number }> };

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  await mkdir(rawDir, { recursive: true });
  const discoveredIds = await discoverResourceIds().catch((): string[] => []);
  const ids = new Set([...discoveredIds, ...KNOWN_RESOURCE_IDS]);
  const index = await readIndex();
  for (const id of ids) {
    const url = `https://data.taipei/api/v1/dataset/${id}?scope=resourceAquire`;
    const rows = await fetchRows(url).catch(() => []);
    if (!rows.length) continue;
    const csv = toCsv(rows);
    const bytes = Buffer.from(csv);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const fileName = `streetlight-repairs-${id}.csv`;
    const filePath = path.join(rawDir, fileName);
    const previous = index.resources.find((item) => item.id === id);
    if (!force && previous?.sha256 === sha256 && existsSync(filePath)) {
      console.log(`Unchanged ${fileName}`);
      continue;
    }
    await writeFile(filePath, csv);
    const next = { id, url, fileName, downloadedAt: new Date().toISOString(), sha256, bytes: bytes.length };
    const existing = index.resources.findIndex((item) => item.id === id);
    if (existing >= 0) index.resources[existing] = next;
    else index.resources.push(next);
    console.log(`Downloaded ${fileName} (${rows.length} rows)`);
  }
  index.generatedAt = new Date().toISOString();
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

async function discoverResourceIds(): Promise<string[]> {
  const html = await (await fetch(DATASET_PAGE)).text();
  return [...html.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)]
    .map(([id]) => id)
    .filter((id) => id !== '0219b559-c9e4-4efe-93f0-9961360bd7bf');
}

async function fetchRows(url: string): Promise<Array<Record<string, unknown>>> {
  const first = await (await fetch(`${url}&limit=1000&offset=0`)).json();
  const result = first?.result;
  if (!result?.results?.length) return [];
  const rows = [...result.results];
  const limit = Number(result.limit ?? 1000) || 1000;
  const total = Number(result.count ?? rows.length);
  for (let offset = limit; offset < total; offset += limit) {
    const page = await (await fetch(`${url}&limit=${limit}&offset=${offset}`)).json();
    if (!page?.result?.results?.length) break;
    rows.push(...page.result.results);
  }
  return rows;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = ['查報序號', '行政區', '查報地點', '故障情形', '查報日期'];
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => cell(row[header])).join(',')).join('\n')}\n`;
}

function cell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function readIndex(): Promise<ResourceIndex> {
  try {
    return JSON.parse(await readFile(indexPath, 'utf8')) as ResourceIndex;
  } catch {
    return { generatedAt: new Date().toISOString(), datasetPage: DATASET_PAGE, resources: [] };
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
