import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Plugin } from 'vite';
import type { RecordDataset, RecordPartition, RecordPartitionManifest } from '../src/lib/recordPartitions';

const sources: Record<RecordDataset, { file: string; yearField: string; previewCount: number }> = {
  open1999: { file: 'open1999-records.json', yearField: 'year', previewCount: 300 },
  streetlight: { file: 'streetlight-repairs.json', yearField: 'reportedYear', previewCount: 100 }
};

export function partitionRecords<T extends Record<string, unknown>>(dataset: RecordDataset, records: T[]) {
  const chunks = new Map<string | null, RecordPartition<T>>();
  records.forEach((record, index) => {
    const value = record[sources[dataset].yearField];
    const year = typeof value === 'number' && Number.isInteger(value) && value > 0 ? String(value) : null;
    const chunk = chunks.get(year) ?? { indices: [], records: [] };
    chunk.indices.push(index);
    chunk.records.push(record);
    chunks.set(year, chunk);
  });
  const files = new Map<string, string>();
  const manifest: RecordPartitionManifest = { schemaVersion: 1, totalRecords: records.length, partitions: [] };
  for (const [year, chunk] of chunks) {
    const file = `${dataset}-records/${year ?? 'undated'}.json`;
    files.set(file, JSON.stringify(chunk));
    manifest.partitions.push({ year, file, count: chunk.records.length });
  }
  files.set(`${dataset}-records-manifest.json`, JSON.stringify(manifest));
  files.set(`${dataset}-preview.json`, JSON.stringify(records.slice(0, sources[dataset].previewCount)));
  return { manifest, files };
}

/** Generated output stays out of the source tree; dev serves identical virtual data paths. */
export function staticDataPlugin(root: string): { version: string; plugin: Plugin } {
  const sourceDirectory = resolve(root, 'public/data');
  const fileNames = readdirSync(sourceDirectory).filter((name) => name.endsWith('.json')).sort();
  const fingerprint = createHash('sha256');
  // Output schema/preview changes also invalidate cached generated data.
  fingerprint.update(readFileSync(resolve(root, 'scripts/buildRecordPartitions.ts')));
  for (const file of fileNames) {
    fingerprint.update(file);
    fingerprint.update(readFileSync(resolve(sourceDirectory, file)));
  }
  const version = fingerprint.digest('hex').slice(0, 16);
  let generated: Map<string, string> | undefined;
  let outputDirectory = resolve(root, 'dist');
  const generate = () => {
    if (generated) return generated;
    generated = new Map();
    for (const dataset of Object.keys(sources) as RecordDataset[]) {
      const records = JSON.parse(readFileSync(resolve(sourceDirectory, sources[dataset].file), 'utf8')) as Record<string, unknown>[];
      for (const [file, content] of partitionRecords(dataset, records).files) generated.set(file, content);
    }
    const hotspots = JSON.parse(readFileSync(resolve(sourceDirectory, 'open1999-hotspots.json'), 'utf8')) as { totalCount: number }[];
    generated.set('open1999-hotspots-preview.json', JSON.stringify(hotspots.sort((a, b) => b.totalCount - a.totalCount).slice(0, 100)));
    return generated;
  };
  const versionWorker = (content: string) => content.replaceAll('__DATA_VERSION__', version);
  return {
    version,
    plugin: {
      name: 'static-record-partitions',
      configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir); },
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = (request.url ?? '').split('?')[0];
          if (pathname.endsWith('/sw.js')) {
            response.setHeader('Content-Type', 'text/javascript');
            response.end(versionWorker(readFileSync(resolve(root, 'public/sw.js'), 'utf8')));
            return;
          }
          const dataPrefix = `${server.config.base}data/`;
          if (!pathname.startsWith(dataPrefix)) return next();
          const fileName = pathname.slice(dataPrefix.length);
          // Ordinary source files are served by Vite without generating large datasets.
          if (!fileName.includes('-preview.json') && !fileName.includes('-records-manifest.json') && !fileName.includes('-records/')) return next();
          const content = generate().get(fileName);
          if (content === undefined) return next();
          response.setHeader('Content-Type', 'application/json');
          response.end(content);
        });
      },
      writeBundle() {
        for (const [file, content] of generate()) {
          const target = resolve(outputDirectory, 'data', file);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, content);
        }
        // Compact copied public JSON as well, without changing checked-in source data.
        for (const file of fileNames) {
          const content = JSON.parse(readFileSync(resolve(sourceDirectory, file), 'utf8'));
          writeFileSync(resolve(outputDirectory, 'data', file), JSON.stringify(content));
        }
        const worker = resolve(outputDirectory, 'sw.js');
        if (existsSync(worker)) writeFileSync(worker, versionWorker(readFileSync(worker, 'utf8')));
      }
    }
  };
}
