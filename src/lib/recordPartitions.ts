import { fetchDataJson } from './dataCache';

export type RecordDataset = 'open1999' | 'streetlight';
export type RecordPartitionManifest = {
  schemaVersion: 1;
  totalRecords: number;
  partitions: Array<{ year: string | null; file: string; count: number }>;
};
export type RecordPartition<T> = { indices: number[]; records: T[] };

const selections = new Map<string, Promise<unknown[]>>();
const loadedSelections = new Map<string, unknown[]>();

function selectionKey(dataset: RecordDataset, years?: string[]): string {
  return JSON.stringify([dataset, years === undefined ? null : [...new Set(years)].sort()]);
}

export function peekPartitionedRecords<T>(dataset: RecordDataset, years?: string[]): T[] | undefined {
  return loadedSelections.get(selectionKey(dataset, years)) as T[] | undefined;
}

/** Load only requested years, or every partition (including undated rows) when omitted. */
export function loadPartitionedRecords<T>(dataset: RecordDataset, years?: string[]): Promise<T[]> {
  const selectedYears = years === undefined ? undefined : [...new Set(years)].sort();
  const key = selectionKey(dataset, selectedYears);
  let result = selections.get(key);
  if (!result) {
    result = loadRecords<T>(dataset, selectedYears).then((records) => {
      loadedSelections.set(key, records);
      return records;
    });
    selections.set(key, result);
    result.catch(() => selections.delete(key));
  }
  return result as Promise<T[]>;
}

async function loadRecords<T>(dataset: RecordDataset, years?: string[]): Promise<T[]> {
  const manifest = await fetchDataJson<RecordPartitionManifest>(`${dataset}-records-manifest.json`);
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported record partition manifest');
  const selected = manifest.partitions.filter((partition) => years === undefined || (partition.year !== null && years.includes(partition.year)));
  const chunks = await Promise.all(selected.map((partition) => fetchDataJson<RecordPartition<T>>(partition.file)));
  // Sparse slots restore source order even when years are interleaved in the original file.
  const ordered = new Array<T>(manifest.totalRecords);
  chunks.forEach((chunk, partitionIndex) => {
    if (chunk.records.length !== selected[partitionIndex].count || chunk.indices.length !== chunk.records.length) {
      throw new Error('Incomplete record partition');
    }
    chunk.records.forEach((record, index) => {
      const position = chunk.indices[index];
      if (!Number.isInteger(position) || position < 0 || position >= manifest.totalRecords || position in ordered) {
        throw new Error('Invalid record partition order');
      }
      ordered[position] = record;
    });
  });
  const records = ordered.filter(() => true);
  if (years === undefined && records.length !== manifest.totalRecords) throw new Error('Incomplete record dataset');
  return records;
}
