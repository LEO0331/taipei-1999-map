import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { staticDataPlugin } from '../scripts/buildRecordPartitions';

it('invalidates deployment data cache when nested civic snapshot changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'civic-cache-'));
  try {
    mkdirSync(join(root, 'public/data/civic-decision'), { recursive: true });
    mkdirSync(join(root, 'scripts'));
    writeFileSync(join(root, 'scripts/buildRecordPartitions.ts'), readFileSync('scripts/buildRecordPartitions.ts'));
    const snapshot = join(root, 'public/data/civic-decision/snapshot.json');
    writeFileSync(snapshot, '{"version":"first"}');
    const first = staticDataPlugin(root).version;
    writeFileSync(snapshot, '{"version":"second"}');
    expect(staticDataPlugin(root).version).not.toBe(first);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
