import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Papa from 'papaparse';
import { extractDistrict, normalizeServiceItem, parseDate, parseTime, TAIPEI_DISTRICTS } from '../src/lib/open1999';
import { CIVIC_MAPPING_VERSION, CIVIC_TOPICS, classifyCivicItem } from '../src/lib/civicCategoryMapping';
import type { CivicSnapshot, CivicSource, CivicMonth } from '../src/types/civicDecision';
import { validateSnapshot } from '../src/lib/civicDecision';

export const DATASET_ID = 'b796f87a-0ed8-4e57-89f6-225a4941b1ed';
export const PROCESSING_VERSION = 'civic-etl-1.0.0';
const HEADERS = ['案件編號', '派工項目', '案件地址', '立案日期', '立案時間'];
export const sha256 = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');
type Entry = { id: string; url: string; fileName: string; downloadedAt: string; sha256: string; period?: string; publishedAt?: string; encoding?: string; originalBytes?: boolean; expectedBytes?: number; expectedRows?: number; monthlyContract?: boolean };
type Index = { resources: Entry[] };

/** Download immutable original monthly files; never replace an audited raw file. */
export async function acquireOfficialMonths(rawDir: string, limit = 6): Promise<void> {
  const get = async (url: string) => { const response = await fetch(url, { signal: AbortSignal.timeout(60000) }); if (!response.ok) throw new Error(`Official source HTTP ${response.status}`); return response; };
  const catalogueUrl = `https://data.taipei/api/frontstage/tpeod/dataset.view?id=${DATASET_ID}`;
  const catalogueBytes = Buffer.from(await (await get(catalogueUrl)).arrayBuffer());
  const catalogue = JSON.parse(catalogueBytes.toString('utf8')).payload;
  const resources = (catalogue.resources as Array<{ rid: string; url: string; file_name: string; encoding: string; size: number; last_modified: string }>).map((resource) => ({ ...resource, period: resource.file_name.match(/(20\d{2})(\d{2})/)?.slice(1).join('-') })).filter((resource) => resource.period && resource.period < new Date().toISOString().slice(0, 7)).sort((a, b) => b.period!.localeCompare(a.period!)).slice(0, limit);
  if (resources.length !== limit) throw new Error('Insufficient official monthly catalogue entries');
  const stage = path.join(rawDir, 'civic-staged');
  await mkdir(stage, { recursive: true });
  const downloadedAt = new Date().toISOString();
  const entries: Entry[] = [];
  for (const resource of resources) {
    const url = new URL(resource.url, 'https://data.taipei').href;
    const bytes = Buffer.from(await (await get(url)).arrayBuffer());
    if (bytes.length !== Number(resource.size)) throw new Error(`Catalogue byte size mismatch: ${resource.rid}`);
    const digest = sha256(bytes);
    const fileName = `civic-staged/${resource.rid}-${digest}.csv`;
    try { await writeFile(path.join(rawDir, fileName), bytes, { flag: 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; if (sha256(await readFile(path.join(rawDir, fileName))) !== digest) throw new Error('Immutable staged content mismatch'); }
    entries.push({ id: resource.rid, url, fileName, downloadedAt, sha256: digest, period: resource.period, publishedAt: resource.last_modified ? `${resource.last_modified.replace(' ', 'T')}+08:00` : undefined, encoding: resource.encoding, originalBytes: true, expectedBytes: Number(resource.size), monthlyContract: true });
  }
  await writeFile(path.join(stage, `catalogue-${sha256(catalogueBytes)}.json`), catalogueBytes, { flag: 'wx' }).catch((error) => { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; });
  await writeFile(path.join(stage, 'index.json'), JSON.stringify({ catalogueUrl, catalogueSha256: sha256(catalogueBytes), downloadedAt, coverageEnd: catalogue.coverage_temporal_end, resources: entries }, null, 2));
}

export function decodeSource(bytes: Buffer, encoding?: string): { text: string; encoding: string } {
  if (encoding?.toLowerCase() === 'big5') return { text: new TextDecoder('big5', { fatal: true }).decode(bytes), encoding: 'Big5' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' }; }
  catch { return { text: new TextDecoder('big5', { fatal: true }).decode(bytes), encoding: 'Big5' }; }
}

export function auditCompleteness(input: { schemaValid: boolean; integrity: boolean; monthlyContract: boolean; period: string | null; rows: number; invalid: number; outsidePeriod: boolean; expectedRows?: number; future: boolean }): { status: CivicSource['status']; reasons: string[] } {
  if (!input.schemaValid) return { status: 'schema-inconsistent', reasons: ['required-schema-mismatch'] };
  if (!input.integrity) return { status: 'unknown', reasons: ['source-revision-or-byte-integrity-mismatch'] };
  if (input.future || input.outsidePeriod || input.invalid || input.rows === 0 || (input.expectedRows !== undefined && input.expectedRows !== input.rows)) return { status: 'partial', reasons: ['incomplete-or-invalid-month-resource'] };
  if (!input.monthlyContract || !input.period) return { status: 'unknown', reasons: ['no-authoritative-whole-month-or-pagination-attestation'] };
  return { status: 'complete', reasons: ['official-whole-month-file-byte-length-schema-period-validated'] };
}

export function monthRange(first: string, last: string): string[] {
  const result: string[] = [];
  let date = new Date(`${first}-01T00:00:00Z`);
  while (date.toISOString().slice(0, 7) <= last) { result.push(date.toISOString().slice(0, 7)); date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)); }
  return result;
}

export function protectSmallCells(cells: CivicSnapshot['cells']): CivicSnapshot['cells'] {
  const protectedCells = cells.map((cell) => ({ ...cell, suppressed: cell.suppressed || (cell.count !== null && cell.count > 0 && cell.count < 5), count: cell.count !== null && cell.count > 0 && cell.count < 5 ? null : cell.count }));
  const sparseMonths = new Set(protectedCells.filter((cell) => cell.suppressed).map((cell) => cell.month));
  for (const month of sparseMonths) {
    // Hide an additional large cell; source totals cannot isolate a single primary suppression.
    const complement = protectedCells.filter((cell) => cell.month === month && !cell.suppressed && cell.count !== null && cell.count >= 5).sort((a, b) => b.count! - a.count! || a.district.localeCompare(b.district) || a.item.localeCompare(b.item))[0];
    if (complement) { complement.count = null; complement.suppressed = true; }
    else for (const cell of protectedCells) {
      if (cell.month === month) { cell.count = null; cell.suppressed = true; }
    }
  }
  return protectedCells;
}

/** One resource in memory at a time; only hashed IDs and fixed aggregate counters survive it. */
export async function auditOpen1999Coverage(rawDir: string, now = new Date().toISOString()): Promise<CivicSnapshot> {
  const index: Index = JSON.parse(await readFile(path.join(rawDir, 'resource-index.json'), 'utf8'));
  let staged: Index = { resources: [] };
  try { staged = JSON.parse(await readFile(path.join(rawDir, 'civic-staged', 'index.json'), 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const entries = new Map(index.resources.map((entry) => [entry.fileName, entry]));
  // Audit every retained file; immutable originals alone supply their verified month populations.
  const files = (await readdir(rawDir)).filter((name) => name.endsWith('.csv')).sort();
  for (const entry of staged.resources) { entries.set(entry.fileName, entry); files.push(entry.fileName); }
  files.sort((a, b) => Number(b.startsWith('civic-staged/')) - Number(a.startsWith('civic-staged/')) || a.localeCompare(b));
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  const months = new Map<string, CivicMonth>();
  const sources: CivicSource[] = [];
  const unrecognized = new Set<string>();
  for (const file of files) {
    const entry = entries.get(file);
    const bytes = await readFile(path.join(rawDir, file));
    const decoded = decodeSource(bytes, entry?.encoding);
    const parsed = Papa.parse<Record<string, string>>(decoded.text, { header: true, skipEmptyLines: 'greedy', transformHeader: (key) => key.replace(/^\uFEFF/, '').trim() });
    const schema = parsed.meta.fields ?? [];
    const source: CivicSource = { id: entry?.id ?? null, url: entry?.url ?? null, provider: '臺北市政府研究發展考核委員會', file: path.basename(file), period: entry?.period ?? null, publishedAt: entry?.publishedAt ?? null, retrievedAt: entry?.downloadedAt ?? null, processedAt: now, sha256: sha256(bytes), originalSha256: entry?.originalBytes ? sha256(bytes) : null, encoding: decoded.encoding, schema, inputRows: parsed.data.length, validRows: 0, duplicates: 0, invalidDates: 0, unknownDistrict: 0, maskedGeography: 0, status: 'unknown', reasons: [] };
    const observedMonths = new Set<string>();
    let unmapped = false;
    let invalid = parsed.errors.length;
    for (const row of parsed.data) {
      let month: string;
      try { month = parseDate(row['立案日期'] ?? '').slice(0, 7); if (!row['立案時間']?.trim()) throw new Error('missing time'); parseTime(row['立案時間']); } catch { source.invalidDates++; invalid++; continue; }
      observedMonths.add(month);
      const item = normalizeServiceItem(row['派工項目'] ?? '');
      const id = row['案件編號']?.trim();
      if (!id || !item) { invalid++; continue; }
      const digest = sha256(id);
      if (seen.has(digest)) { source.duplicates++; continue; }
      seen.add(digest); source.validRows++;
      const address = row['案件地址'] ?? '';
      const district = extractDistrict(address);
      if (!district) source.unknownDistrict++;
      if (!address.trim() || /[*＊○Ｏ遮隱]/.test(address)) source.maskedGeography++;
      const topic = classifyCivicItem(item);
      if (!topic) { unmapped = true; unrecognized.add(item); continue; }
      if (!district) continue;
      if (!entry?.originalBytes && staged.resources.some((resource) => resource.period === month)) continue;
      const key = `${month}|${district}|${topic}|${item}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (!source.period && observedMonths.size === 1) source.period = [...observedMonths][0];
    const health = auditCompleteness({ schemaValid: HEADERS.every((key) => schema.includes(key)) && schema.length === HEADERS.length, integrity: (!entry || entry.sha256 === source.sha256) && (entry?.expectedBytes === undefined || entry.expectedBytes === bytes.length), monthlyContract: !!entry?.monthlyContract && !!entry.originalBytes, period: entry?.period ?? null, rows: source.inputRows, invalid, outsidePeriod: !!entry?.period && [...observedMonths].some((month) => month !== entry.period), expectedRows: entry?.expectedRows, future: !!entry?.period && entry.period >= now.slice(0, 7) });
    source.status = health.status; source.reasons = health.reasons;
    if (!entry?.originalBytes) source.reasons.push('retained-api-reserialization-original-download-hash-unavailable');
    if (source.unknownDistrict) source.reasons.push('unknown-district-excluded-from-district-analysis');
    if (source.duplicates) source.reasons.push('duplicate-case-ids-removed-before-aggregation');
    if (unmapped) source.reasons.push('unmapped-dispatch-labels-excluded-review-category-version');
    if (!entry?.originalBytes && [...observedMonths].some((month) => staged.resources.some((resource) => resource.period === month))) source.reasons.push('superseded-period-excluded-from-aggregates');
    const affected = new Set([...observedMonths, ...(entry?.period ? [entry.period] : [])]);
    for (const month of affected) {
      const previous = months.get(month);
      if (!entry?.originalBytes && staged.resources.some((resource) => resource.period === month)) continue;
      const status = previous && previous.status !== source.status ? 'unknown' : source.status;
      months.set(month, { month, status, reasons: [...new Set([...(previous?.reasons ?? []), ...source.reasons])] });
    }
    sources.push(source);
  }
  const ordered = [...months.keys()].sort();
  const coverage = ordered.length ? monthRange(ordered[0], ordered.at(-1)!).map((month) => months.get(month) ?? { month, status: 'missing' as const, reasons: ['no-source-resource'] }) : [];
  let cells: CivicSnapshot['cells'] = [];
  for (const month of coverage) for (const district of TAIPEI_DISTRICTS) for (const topic of CIVIC_TOPICS) for (const item of topic.items) {
    if (month.status === 'missing') continue;
    const count = counts.get(`${month.month}|${district}|${topic.id}|${item}`) ?? 0;
    cells.push({ month: month.month, district, topic: topic.id, item, count: count > 0 && count < 5 ? null : count, suppressed: count > 0 && count < 5 });
  }
  cells = protectSmallCells(cells);
  const quality = { inputRows: sources.reduce((n, source) => n + source.inputRows, 0), acceptedRows: cells.reduce((n, cell) => n + (cell.count ?? 0), 0), duplicates: sources.reduce((n, source) => n + source.duplicates, 0), invalidRows: sources.reduce((n, source) => n + source.inputRows - source.validRows - source.duplicates, 0), unknownDistrict: sources.reduce((n, source) => n + source.unknownDistrict, 0), unrecognizedItems: [...unrecognized].sort(), suppressedCells: cells.filter((cell) => cell.suppressed).length, capApplied: false, notes: ['Aggregated before browser record cap; no exact case locations or IDs published.', 'Only fixed month/district/item cells published. Counts 1–4 and one largest complementary cell per affected month are null. If no complementary count >=5 exists, all cells including zeros in that month are withheld. No overlapping topic/district/month totals published.', 'acceptedRows counts only publishable cells, excludes suppressed records; source row totals cover all categories including excluded items and unknown geography, not suppressed-cell marginal totals.', 'Complete means complete published monthly file, not complete citizen petitions or verified harms.', 'Unmapped labels are excluded; label changes require explicit mapping review.'] };
  const content = { schemaVersion: 1 as const, datasetId: DATASET_ID, mappingVersion: CIVIC_MAPPING_VERSION, processingVersion: PROCESSING_VERSION, sources, months: coverage, cells, quality };
  const version = sha256(JSON.stringify({ ...content, sources: sources.map(({ processedAt: _processed, ...source }) => source) }));
  return { ...content, version, generatedAt: now };
}

export async function writeSnapshot(rawDir: string, output: string): Promise<CivicSnapshot> {
  const snapshot = await auditOpen1999Coverage(rawDir);
  if (!snapshot.sources.length) throw new Error('No source files; preserving previous known-good snapshot');
  if (snapshot.sources.some((source) => source.status === 'schema-inconsistent' || (source.originalSha256 !== null && source.reasons.includes('source-revision-or-byte-integrity-mismatch')))) throw new Error('Source schema or authoritative original integrity validation failed; preserving previous known-good snapshot');
  validateSnapshot(snapshot);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, `${JSON.stringify(snapshot)}\n`);
  const { rename } = await import('node:fs/promises');
  await rename(`${output}.tmp`, output);
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  auditOpen1999Coverage(path.resolve('data/raw/open1999')).then((snapshot) => console.log(JSON.stringify({ sources: snapshot.sources.length, months: snapshot.months, quality: snapshot.quality }, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
}
