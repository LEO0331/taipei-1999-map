import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpen1999Data } from '../src/hooks/useOpen1999Data';
import { useDataFile, useStaticData } from '../src/hooks/useStaticData';
import { fetchDataJson } from '../src/lib/dataCache';
import { loadPartitionedRecords } from '../src/lib/recordPartitions';

vi.mock('../src/hooks/useStaticData', () => ({ useDataFile: vi.fn(), useStaticData: vi.fn() }));
vi.mock('../src/lib/dataCache', () => ({ fetchDataJson: vi.fn(), peekDataJson: () => undefined }));
vi.mock('../src/lib/recordPartitions', () => ({ loadPartitionedRecords: vi.fn(), peekPartitionedRecords: () => undefined }));
let load: () => Promise<unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDataFile).mockReturnValue({ key: '', value: undefined, loading: true, retry: vi.fn() });
  vi.mocked(useStaticData).mockImplementation((key, request) => {
    load = request;
    return { key, value: undefined, loading: true, retry: vi.fn() };
  });
  vi.mocked(loadPartitionedRecords).mockResolvedValue([]);
});

describe('on-demand 1999 data selection', () => {
  it('requests only the small preview for the default view', async () => {
    vi.mocked(fetchDataJson).mockResolvedValue([]);
    useOpen1999Data();
    await load();
    expect(fetchDataJson).toHaveBeenCalledExactlyOnceWith('open1999-preview.json');
    expect(loadPartitionedRecords).not.toHaveBeenCalled();
  });

  it('waits for the missing upper date bound instead of downloading every year', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(fetchDataJson).mockReturnValue(new Promise((done) => { resolve = done; }));
    useOpen1999Data(true, '2026-01-01');
    const pending = load();
    expect(loadPartitionedRecords).not.toHaveBeenCalled();
    resolve({ period: { start: '2025-07-07', end: '2026-05-31' } });
    await pending;
    expect(loadPartitionedRecords).toHaveBeenCalledExactlyOnceWith('open1999', ['2026']);
  });

  it('restricts an early upper-bound filter to the matching years', async () => {
    vi.mocked(fetchDataJson).mockResolvedValue({ period: { start: '2025-07-07', end: '2026-05-31' } });
    useOpen1999Data(true, '', '2025-12-31');
    await load();
    expect(loadPartitionedRecords).toHaveBeenCalledExactlyOnceWith('open1999', ['2025']);
  });

  it('does not need the report when both selected date bounds are already known', async () => {
    useOpen1999Data(true, '2026-01-01', '2026-04-30');
    await load();
    expect(fetchDataJson).not.toHaveBeenCalled();
    expect(loadPartitionedRecords).toHaveBeenCalledExactlyOnceWith('open1999', ['2026']);
  });
});
