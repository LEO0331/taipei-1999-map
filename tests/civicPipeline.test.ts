import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { auditCompleteness, auditOpen1999Coverage, monthRange, protectSmallCells, sha256, writeSnapshot } from '../scripts/auditOpen1999Coverage';
import { CIVIC_MAPPING_VERSION, CIVIC_TOPICS, classifyCivicItem } from '../src/lib/civicCategoryMapping';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });
const valid = { schemaValid: true, integrity: true, monthlyContract: true, period: '2026-06', rows: 20, invalid: 0, outsidePeriod: false, future: false };

describe('authoritative completeness evidence', () => {
  it('requires a whole-month contract rather than observed dates', () => {
    expect(auditCompleteness(valid).status).toBe('complete');
    expect(auditCompleteness({ ...valid, monthlyContract: false }).status).toBe('unknown');
    expect(auditCompleteness({ ...valid, expectedRows: 21 }).status).toBe('partial');
    expect(auditCompleteness({ ...valid, future: true }).status).toBe('partial');
    expect(auditCompleteness({ ...valid, outsidePeriod: true }).status).toBe('partial');
    expect(auditCompleteness({ ...valid, invalid: 1 }).status).toBe('partial');
    expect(auditCompleteness({ ...valid, integrity: false }).reasons).toContain('source-revision-or-byte-integrity-mismatch');
    expect(auditCompleteness({ ...valid, schemaValid: false }).status).toBe('schema-inconsistent');
    expect(auditCompleteness({ ...valid, rows: 0 }).status).toBe('partial');
  });
  it('enumerates missing months without replacing them with zero', () => {
    expect(monthRange('2025-12', '2026-03')).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
  });
});

describe('reviewed category semantics', () => {
  it('uses exact labels, five disjoint topics, and versioned mapping', () => {
    expect(CIVIC_TOPICS).toHaveLength(5);
    const items = CIVIC_TOPICS.flatMap((topic) => topic.items);
    expect(new Set(items).size).toBe(items.length);
    expect(CIVIC_MAPPING_VERSION).toBe('civic-exact-items-1.0.0');
    expect(classifyCivicItem('污染舉發')).toBe('environment_pollution');
    expect(classifyCivicItem('大型廢棄物清運聯繫')).toBe('waste_cleaning');
    expect(classifyCivicItem('污染舉發鼠患')).toBeUndefined();
    expect(classifyCivicItem('動物救援')).toBeUndefined();
    expect(classifyCivicItem('新服務')).toBeUndefined();
  });
});

describe('privacy-safe uncapped ETL', () => {
  it('suppresses sparse and complementary cells so a source total cannot isolate a count', () => {
    const cells = protectSmallCells([1, 5, 12].map((count, index) => ({ month: '2026-06', district: `district-${index}`, topic: 'waste_cleaning', item: '大型廢棄物清運聯繫', count, suppressed: false })));
    expect(cells.map((cell) => cell.count)).toEqual([null, 5, null]);
    expect(cells.filter((cell) => cell.suppressed)).toHaveLength(2);
  });
  it('withholds every cell including known zeros when no safe complementary positive cell exists', () => {
    const cells = protectSmallCells([1, 0, 0].map((count, index) => ({ month: '2026-06', district: `district-${index}`, topic: 'waste_cleaning', item: '大型廢棄物清運聯繫', count, suppressed: false })));
    expect(cells.every((cell) => cell.suppressed && cell.count === null)).toBe(true);
    expect(cells.some((cell) => cell.count === 0)).toBe(false);
  });
  it('deduplicates, validates timestamps, fills safe zeros and keeps raw text out of public output', async () => {
    const parent = path.resolve('.omx', 'pipeline-tests');
    await mkdir(parent, { recursive: true });
    const dir = await mkdtemp(path.join(parent, 'fixture-')); dirs.push(dir);
    const csv = '案件編號,派工項目,案件地址,立案日期,立案時間\n' + Array.from({ length: 6 }, (_, index) => `private-id-${index},大型廢棄物清運聯繫,大安區秘密街123號5樓,20260601,120000`).join('\n') + '\nprivate-id-0,大型廢棄物清運聯繫,大安區秘密街123號5樓,20260601,120000\nbad,污染舉發,中正區秘密街,20260230,120000\n';
    await writeFile(path.join(dir, 'fixture.csv'), csv);
    await writeFile(path.join(dir, 'resource-index.json'), JSON.stringify({ resources: [{ id: 'resource', url: 'https://data.taipei/example', fileName: 'fixture.csv', downloadedAt: '2026-07-01T00:00:00Z', sha256: sha256(csv) }] }));
    const snapshot = await auditOpen1999Coverage(dir, '2026-10-16T00:00:00Z');
    expect(snapshot.quality.duplicates).toBe(1);
    expect(snapshot.quality.invalidRows).toBe(1);
    expect(snapshot.quality.capApplied).toBe(false);
    expect(snapshot.sources[0].originalSha256).toBeNull();
    expect(snapshot.months[0].status).toBe('partial');
    expect(snapshot.cells.find((cell) => cell.district === '大安區' && cell.item === '大型廢棄物清運聯繫')?.count).toBe(6);
    expect(snapshot.cells.find((cell) => cell.district === '中正區')?.count).toBe(0);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toMatch(/秘密街|private-id|123號|originalAddress|latitude|longitude/);
    const repeat = await auditOpen1999Coverage(dir, '2026-10-17T00:00:00Z');
    expect(repeat.version).toBe(snapshot.version);
    expect(repeat.mappingVersion).toBe(CIVIC_MAPPING_VERSION);
  });
  it('reports empty inputs without manufacturing complete months', async () => {
    const parent = path.resolve('.omx', 'pipeline-tests'); await mkdir(parent, { recursive: true });
    const dir = await mkdtemp(path.join(parent, 'empty-')); dirs.push(dir);
    await writeFile(path.join(dir, 'resource-index.json'), '{"resources":[]}');
    const snapshot = await auditOpen1999Coverage(dir);
    expect(snapshot.months).toEqual([]); expect(snapshot.cells).toEqual([]);
  });
  it('keeps retained revisions out of the verified original monthly population and preserves known-good files on failure', async () => {
    const parent = path.resolve('.omx', 'pipeline-tests'); await mkdir(parent, { recursive: true });
    const dir = await mkdtemp(path.join(parent, 'revision-')); dirs.push(dir);
    await mkdir(path.join(dir, 'civic-staged'));
    const header = '案件編號,派工項目,案件地址,立案日期,立案時間\n';
    const original = header + Array.from({ length: 5 }, (_, index) => `case-${index},大型廢棄物清運聯繫,大安區秘密街,20260601,120000`).join('\n') + '\n';
    const retained = original + 'legacy-extra,大型廢棄物清運聯繫,大安區秘密街,20260601,120000\n';
    await writeFile(path.join(dir, 'legacy.csv'), retained);
    await writeFile(path.join(dir, 'resource-index.json'), JSON.stringify({ resources: [{ id: 'legacy', fileName: 'legacy.csv', sha256: sha256(retained), url: 'https://data.taipei/legacy', downloadedAt: '2026-07-01T00:00:00Z' }] }));
    await writeFile(path.join(dir, 'civic-staged', 'original.csv'), original);
    await writeFile(path.join(dir, 'civic-staged', 'index.json'), JSON.stringify({ resources: [{ id: 'official', fileName: 'civic-staged/original.csv', sha256: sha256(original), originalBytes: true, monthlyContract: true, period: '2026-06', expectedBytes: Buffer.byteLength(original), url: 'https://data.taipei/official', downloadedAt: '2026-07-01T00:00:00Z' }] }));
    const snapshot = await auditOpen1999Coverage(dir, '2026-10-16T00:00:00Z');
    expect(snapshot.months[0].status).toBe('complete');
    expect(snapshot.sources.find((source) => source.id === 'legacy')?.reasons).toContain('superseded-period-excluded-from-aggregates');
    expect(snapshot.cells.find((cell) => cell.district === '大安區' && cell.item === '大型廢棄物清運聯繫')?.count).toBe(5);
    const output = path.join(dir, 'snapshot.json');
    await writeSnapshot(dir, output);
    const previous = await readFile(output, 'utf8');
    await writeFile(path.join(dir, 'civic-staged', 'original.csv'), original + 'changed');
    await expect(writeSnapshot(dir, output)).rejects.toThrow(/preserving previous known-good/);
    expect(await readFile(output, 'utf8')).toBe(previous);
  });
});
