import { beforeEach, describe, expect, it, vi } from 'vitest';
import { partitionRecords } from '../scripts/buildRecordPartitions';

const { fetchDataJson } = vi.hoisted(() => ({ fetchDataJson: vi.fn() }));
vi.mock('../src/lib/dataCache', () => ({ fetchDataJson }));

const records = [
  { id: 'a', year: 2026 },
  { id: 'b', year: 2025 },
  { id: 'undated' },
  { id: 'c', year: 2026 },
  { id: 'd', year: 2025 }
];

beforeEach(() => {
  vi.resetModules();
  fetchDataJson.mockReset();
  const { files } = partitionRecords('open1999', records);
  fetchDataJson.mockImplementation(async (file: string) => {
    const content = files.get(file);
    if (content === undefined) throw new Error(`Missing ${file}`);
    return JSON.parse(content);
  });
});

describe('static record partitions', () => {
  it('retains each row once with its original position and creates a limited preview', () => {
    const input = Array.from({ length: 305 }, (_, index) => ({ id: index, year: index % 2 ? 2025 : 2026 }));
    const { manifest, files } = partitionRecords('open1999', input);
    expect(manifest.totalRecords).toBe(305);
    expect(manifest.partitions.reduce((count, partition) => count + partition.count, 0)).toBe(305);
    const positions = manifest.partitions.flatMap((partition) => JSON.parse(files.get(partition.file)!).indices);
    expect(positions.sort((a, b) => a - b)).toEqual(input.map((_, index) => index));
    expect(JSON.parse(files.get('open1999-preview.json')!)).toEqual(input.slice(0, 300));
  });

  it('reconstructs complete source order, including interleaved years and undated records', async () => {
    const { loadPartitionedRecords } = await import('../src/lib/recordPartitions');
    expect(await loadPartitionedRecords('open1999')).toEqual(records);
  });

  it('downloads only selected partitions and keeps original ordering', async () => {
    const { loadPartitionedRecords } = await import('../src/lib/recordPartitions');
    expect(await loadPartitionedRecords('open1999', ['2026'])).toEqual([records[0], records[3]]);
    expect(fetchDataJson.mock.calls.map(([file]) => file)).toEqual(['open1999-records-manifest.json', 'open1999-records/2026.json']);
    expect(await loadPartitionedRecords('open1999', ['2030'])).toEqual([]);
  });

  it('reuses in-flight requests and assembled arrays for equivalent year selections', async () => {
    const { loadPartitionedRecords, peekPartitionedRecords } = await import('../src/lib/recordPartitions');
    const first = loadPartitionedRecords('open1999', ['2026', '2025', '2026']);
    const second = loadPartitionedRecords('open1999', ['2025', '2026']);
    expect(first).toBe(second);
    const assembled = await first;
    expect(peekPartitionedRecords('open1999', ['2026', '2025'])).toBe(assembled);
    expect(await loadPartitionedRecords('open1999', ['2025', '2026'])).toBe(assembled);
    expect(fetchDataJson).toHaveBeenCalledTimes(3);
  });

  it('retries failed selections and rejects missing or overlapping record positions', async () => {
    const { loadPartitionedRecords } = await import('../src/lib/recordPartitions');
    fetchDataJson.mockRejectedValueOnce(new Error('offline'));
    await expect(loadPartitionedRecords('open1999')).rejects.toThrow('offline');
    expect(await loadPartitionedRecords('open1999')).toEqual(records);
    fetchDataJson.mockImplementation(async (file: string) => file.endsWith('manifest.json')
      ? { schemaVersion: 1, totalRecords: 2, partitions: [{ year: '2024', file: 'broken.json', count: 2 }] }
      : { indices: [0, 0], records: [{ id: 1 }, { id: 2 }] });
    await expect(loadPartitionedRecords('streetlight')).rejects.toThrow('Invalid record partition order');
  });

  it('uses reportedYear for streetlight partitions and keeps undated rows for all-year views', () => {
    const { manifest, files } = partitionRecords('streetlight', [{ reportedYear: 2024 }, {}, { reportedYear: 2023 }]);
    expect(manifest.partitions.map((partition) => partition.year)).toEqual(['2024', null, '2023']);
    expect(JSON.parse(files.get('streetlight-records/undated.json')!)).toEqual({ indices: [1], records: [{}] });
  });
});
