import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CivicDecisionDashboard from '../src/components/CivicDecisionDashboard';
import { useDataFile } from '../src/hooks/useStaticData';
import { CIVIC_MAPPING_VERSION, CIVIC_TOPICS } from '../src/lib/civicCategoryMapping';
import { TAIPEI_DISTRICTS } from '../src/lib/open1999';
import type { CivicSnapshot } from '../src/types/civicDecision';

vi.mock('../src/hooks/useStaticData', () => ({ useDataFile: vi.fn() }));
const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
function fixture(): CivicSnapshot {
  return {
    schemaVersion: 1, datasetId: 'test-dispatch', version: 'ui-fixture-1', mappingVersion: CIVIC_MAPPING_VERSION,
    generatedAt: '2026-07-01T00:00:00Z', processingVersion: 'test-1',
    sources: months.map((month) => ({ id: month, url: 'https://data.taipei/example', provider: 'Taipei City', file: `${month}.csv`, period: month, publishedAt: null, retrievedAt: null, processedAt: '2026-07-01T00:00:00Z', sha256: 'a'.repeat(64), originalSha256: 'a'.repeat(64), encoding: 'utf8', schema: ['派工項目'], inputRows: 10000, validRows: 10000, duplicates: 0, invalidDates: 0, unknownDistrict: 0, maskedGeography: 0, status: 'complete', reasons: [] })),
    months: months.map((month) => ({ month, status: 'complete', reasons: [] })),
    cells: months.flatMap((month, i) => TAIPEI_DISTRICTS.flatMap((district) => CIVIC_TOPICS.flatMap((topic) => topic.items.map((item) => ({ month, district, topic: topic.id, item, count: i < 3 ? 5 : 10, suppressed: false }))))),
    quality: { inputRows: 60000, acceptedRows: 60000, duplicates: 0, invalidRows: 0, unknownDistrict: 0, unrecognizedItems: [], suppressedCells: 0, capApplied: false, notes: [] }
  };
}
function load(snapshot: CivicSnapshot) { vi.mocked(useDataFile).mockReturnValue({ key: 'snapshot', value: snapshot, loading: false, retry: vi.fn() }); }
const render = (language: 'zh' | 'en' = 'zh') => renderToStaticMarkup(createElement(CivicDecisionDashboard, { language }));
beforeEach(() => vi.clearAllMocks());

describe('civic decision dashboard', () => {
  it('provides loading and retry states before any decision controls', () => {
    vi.mocked(useDataFile).mockReturnValue({ key: 'snapshot', value: undefined, loading: true, retry: vi.fn() });
    expect(render()).toContain('正在載入資料');
    vi.mocked(useDataFile).mockReturnValue({ key: 'snapshot', value: undefined, loading: false, error: 'network', retry: vi.fn() });
    expect(render('en')).toContain('Retry');
    expect(render('en')).not.toContain('Maximum review candidates');
  });
  it('rejects malformed runtime snapshots before rendering analysis', () => {
    load({ ...fixture(), schemaVersion: 2 } as unknown as CivicSnapshot);
    expect(render()).toContain('決策資料驗證失敗');
    expect(render()).not.toContain('匯出摘要 JSON');
  });
  it('renders bilingual sections, filters, rules, fixed-population sensitivity and exports', () => {
    load(fixture());
    const zh = render();
    expect(zh).toContain('民生通報決策分析');
    expect(zh).toContain('近期分析');
    expect(zh).toContain('官方派工項目');
    expect(zh).toContain('重設預設門檻');
    expect(zh).toContain('紀錄量、持續性、可比較基期與成長門檻均符合');
    expect(zh).toContain('匯出摘要 JSON');
    expect(zh).toContain('匯出調查清單 CSV');
    const en = render('en');
    for (const section of ['Policy Problem &amp; Data Status', 'Historical Trends', 'Service Category Analysis', 'District Investigation Priorities', 'Review Capacity Scenarios', 'Assumption Sensitivity', 'Decision Briefing', 'Evidence, Limitations &amp; Agency Context']) expect(en).toContain(section);
    expect(en).toContain('Monthly');
    expect(en).toContain('Quarterly (selected months only)');
    expect(en).toContain('Maximum review candidates');
    expect(en).toContain('Unknown');
    expect(en).toContain('Source population, periods and mapping remain fixed');
    expect(en).not.toContain('originalAddress');
    expect(en).not.toContain('leaflet');
  });
  it('shows insufficient evidence, incomplete source statuses and an empty shortlist', () => {
    const snapshot = fixture();
    snapshot.months.forEach((month) => { month.status = 'unknown'; month.reasons = ['Original resource not verified']; });
    snapshot.sources.forEach((source) => { source.status = 'unknown'; source.originalSha256 = null; });
    snapshot.months.push({ month: '2026-07', status: 'missing', reasons: ['No retained resource'] });
    load(snapshot);
    const html = render('en');
    expect(html).toContain('Unknown completeness');
    expect(html).toContain('Missing');
    expect(html).toContain('Insufficient evidence');
    expect(html).toContain('Empty shortlist');
    expect(html).toContain('Rodent-specific analysis is unavailable');
  });
  it('withholds trend totals containing a suppressed or absent aggregate cell', () => {
    const snapshot = fixture();
    const suppressed = snapshot.cells.find((cell) => cell.month === '2026-01' && cell.topic === 'environment_pollution')!;
    suppressed.suppressed = true; suppressed.count = null; snapshot.quality.suppressedCells = 1;
    snapshot.cells = snapshot.cells.filter((cell) => !(cell.month === '2026-02' && cell.district === '中正區' && cell.item === '污染舉發'));
    load(snapshot);
    const html = render('en');
    expect(html).toContain('2026-01</th><td>2026-01</td><td>Unavailable / suppressed');
    expect(html).toContain('2026-02</th><td>2026-02</td><td>Unavailable / suppressed');
    expect(html).toContain('Show all candidates and evidence exclusions');
    expect(html).toContain('Selected monthly cells are suppressed; all derived metrics are withheld.');
  });
});
