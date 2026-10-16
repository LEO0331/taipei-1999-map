import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireOfficialMonths, writeSnapshot } from './auditOpen1999Coverage';

export { writeSnapshot } from './auditOpen1999Coverage';

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  (async () => {
    if (process.argv.includes('--refresh')) await acquireOfficialMonths(path.resolve('data/raw/open1999'));
    return writeSnapshot(path.resolve('data/raw/open1999'), path.resolve('public/data/civic-decision/snapshot.json'));
  })().then((snapshot) => console.log(JSON.stringify({ version: snapshot.version, sources: snapshot.sources.length, months: snapshot.months.length, complete: snapshot.months.filter((month) => month.status === 'complete').map((month) => month.month), quality: snapshot.quality }))).catch((error) => { console.error(error); process.exitCode = 1; });
}
