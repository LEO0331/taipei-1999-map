import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_PAGE = 'https://data.taipei/dataset/detail?id=a8104214-5416-48d3-8006-c22c18a90283';
const DATASET_ID = 'a8104214-5416-48d3-8006-c22c18a90283';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data/raw/public-works-construction-audit-records');
const indexPath = path.join(rawDir, 'resource-index.json');

type ResourceIndex = {
  generatedAt: string;
  datasetPage: string;
  resources: Array<{ id: string; url: string; resourceName: string; fileName: string; downloadedAt: string; sha256: string; bytes: number; rowCount: number; encoding: 'utf8'; notes?: string[] }>;
  warnings: string[];
};

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  await mkdir(rawDir, { recursive: true });
  const index = await readIndex();
  const resources = await discoverResources().catch((error) => {
    index.warnings.push(String(error));
    return [];
  });
  for (const resource of resources) {
    const url = `https://data.taipei/api/v1/dataset/${resource.id}?scope=resourceAquire`;
    try {
      const rows = await fetchRows(url);
      if (!rows.length) continue;
      const csv = toCsv(rows);
      const bytes = Buffer.from(csv);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const fileName = `${sanitize(resource.name)}-${resource.id}.csv`;
      const filePath = path.join(rawDir, fileName);
      const previous = index.resources.find((item) => item.id === resource.id);
      if (!force && previous?.sha256 === sha256 && existsSync(filePath)) {
        console.log(`Unchanged ${fileName}`);
        continue;
      }
      await writeFile(filePath, csv);
      const next = { id: resource.id, url, resourceName: resource.name, fileName, downloadedAt: new Date().toISOString(), sha256, bytes: bytes.length, rowCount: rows.length, encoding: 'utf8' as const };
      const existing = index.resources.findIndex((item) => item.id === resource.id);
      if (existing >= 0) index.resources[existing] = next;
      else index.resources.push(next);
      console.log(`Downloaded ${fileName} (${rows.length} rows)`);
    } catch (error) {
      index.warnings.push(`${resource.name}: ${String(error)}`);
    }
  }
  index.generatedAt = new Date().toISOString();
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

async function discoverResources(): Promise<Array<{ id: string; name: string }>> {
  const html = await (await fetch(DATASET_PAGE)).text();
  const ids = [...new Set([...html.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)].map(([id]) => id).filter((id) => id !== DATASET_ID))];
  return ids.map((id) => ({ id, name: resourceNameNearId(html, id) ?? `臺北市政府施工查核情形一覽表_${id}` }));
}

function resourceNameNearId(html: string, id: string): string | undefined {
  const index = html.indexOf(id);
  const window = index >= 0 ? html.slice(Math.max(0, index - 800), index + 800) : '';
  const match = window.match(/臺北市政府施工查核情形一覽表[^"<]{0,40}/);
  return match?.[0].replace(/\\u[\da-f]{4}/gi, '').trim();
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
  const headers = ['序號', '工程名稱', '主辦單位', '契約金額-千元', '設計單位', '監造單位', '承造廠商', '專案管理', '查核日期', '通知方式', '評分', '廠商扣點數', '監造扣點數', 'PCM扣點數', '備註'];
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => cell(row[header] ?? row[header.replace('-', '－')] ?? row[header.toLowerCase()])).join(',')).join('\n')}\n`;
}

function cell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 90);
}

async function readIndex(): Promise<ResourceIndex> {
  try {
    return JSON.parse(await readFile(indexPath, 'utf8')) as ResourceIndex;
  } catch {
    return { generatedAt: new Date().toISOString(), datasetPage: DATASET_PAGE, resources: [], warnings: [] };
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
