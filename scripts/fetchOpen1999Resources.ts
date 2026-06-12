import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ResourceIndex = {
  generatedAt: string;
  datasetPage: string;
  resources: Array<{
    id: string;
    url: string;
    fileName: string;
    downloadedAt: string;
    sha256: string;
    bytes: number;
  }>;
};

const DATASET_PAGE = 'https://data.taipei/dataset/detail?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed';
const KNOWN_RESOURCE_IDS = ['9b2d0333-e8ee-4055-915b-d06ba67b0879'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/open1999');
const indexPath = path.join(rawDir, 'resource-index.json');

async function main(): Promise<void> {
  await mkdir(rawDir, { recursive: true });
  const resourceIds = new Set(KNOWN_RESOURCE_IDS);
  const pageHtml = await fetchText(DATASET_PAGE).catch(() => '');
  for (const id of discoverResourceIds(pageHtml)) resourceIds.add(id);

  const existing = await readIndex();
  const resources: ResourceIndex['resources'] = [...existing.resources];

  for (const id of resourceIds) {
    const apiUrl = `https://data.taipei/api/v1/dataset/${id}?scope=resourceAquire`;
    const rows = await fetchApiRows(apiUrl);
    if (!rows.length) continue;
    const csv = rowsToCsv(rows);
    const bytes = Buffer.from(csv, 'utf8');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const fileName = `open1999-${id}.csv`;
    const filePath = path.join(rawDir, fileName);
    const previous = resources.find((resource) => resource.id === id);
    if (previous?.sha256 === sha256 && existsSync(filePath)) {
      console.log(`Unchanged ${fileName}`);
      continue;
    }
    await writeFile(filePath, csv, 'utf8');
    const entry = { id, url: apiUrl, fileName, downloadedAt: new Date().toISOString(), sha256, bytes: bytes.length };
    const index = resources.findIndex((resource) => resource.id === id);
    if (index >= 0) resources[index] = entry;
    else resources.push(entry);
    console.log(`Downloaded ${fileName} (${rows.length} rows)`);
  }

  const nextIndex: ResourceIndex = { generatedAt: new Date().toISOString(), datasetPage: DATASET_PAGE, resources };
  await writeFile(indexPath, `${JSON.stringify(nextIndex, null, 2)}\n`, 'utf8');

  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn('npm', ['run', 'convert:data'], { cwd: root, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`conversion exited ${code}`))));
  });
}

async function fetchApiRows(apiUrl: string): Promise<Array<Record<string, unknown>>> {
  const first = await fetchJson(`${apiUrl}&limit=1000&offset=0`);
  const result = first?.result;
  if (!result?.results?.length) return [];
  const rows = [...result.results];
  const total = Number(result.count ?? rows.length);
  const limit = Number(result.limit ?? 1000) || 1000;
  for (let offset = limit; offset < total; offset += limit) {
    const page = await fetchJson(`${apiUrl}&limit=${limit}&offset=${offset}`);
    if (!page?.result?.results?.length) break;
    rows.push(...page.result.results);
  }
  return rows;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.text();
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.json();
}

function discoverResourceIds(html: string): string[] {
  return [...html.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)]
    .map(([id]) => id)
    .filter((id) => id !== 'b796f87a-0ed8-4e57-89f6-225a4941b1ed');
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  const headers = ['案件編號', '派工項目', '案件地址', '立案日期', '立案時間'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
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
