import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { buildScenario, createBriefing, DEFAULT_THRESHOLDS, defaultSelection, sensitivity, shortlistCsv, validateSnapshot } from '../src/lib/civicDecision';
import { CIVIC_MAPPING_VERSION } from '../src/lib/civicCategoryMapping';
import type { CivicSelection, CivicSnapshot } from '../src/types/civicDecision';

const months = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const selection: CivicSelection = { previous:months.slice(0,3),recent:months.slice(3),district:'中正區',topic:'environment_pollution',item:'all' };
function fixture(previous = [5,0,0], recent = [5,5,5]): CivicSnapshot {
  return { schemaVersion:1,datasetId:'taipei-1999-dispatch',version:'fixture-1',mappingVersion:CIVIC_MAPPING_VERSION,generatedAt:'2026-07-01T00:00:00Z',processingVersion:'fixture-etl-1',
    sources:months.map((month) => ({id:month,url:'https://data.taipei/example',provider:'Taipei City',file:`${month}.csv`,period:month,publishedAt:null,retrievedAt:null,processedAt:'2026-07-01T00:00:00Z',sha256:'a'.repeat(64),originalSha256:'a'.repeat(64),encoding:'utf-8',schema:['案件編號','派工項目','案件地址','立案日期','立案時間'],inputRows:100,validRows:100,duplicates:0,invalidDates:0,unknownDistrict:0,maskedGeography:0,status:'complete',reasons:[]})),
    months:months.map((month) => ({month,status:'complete',reasons:[]})),cells:months.map((month,i) => ({month,district:'中正區',topic:'environment_pollution',item:'污染舉發',count:[...previous,...recent][i],suppressed:false})),
    quality:{inputRows:600,acceptedRows:600,duplicates:0,invalidRows:0,unknownDistrict:0,unrecognizedItems:[],suppressedCells:0,capApplied:false,notes:[]}
  };
}
const candidate = (snapshot = fixture(), chosen = selection, thresholds = DEFAULT_THRESHOLDS) => buildScenario(snapshot,chosen,thresholds).candidates[0];

describe('civic deterministic decision engine', () => {
  it('selects six latest contiguous verified complete months and skips an unverified latest month', () => {
    const snapshot = fixture(); snapshot.months.push({month:'2026-07',status:'partial',reasons:['cap']});
    expect(defaultSelection(snapshot)).toEqual({...selection,topic:'all',district:'all'});
    snapshot.months[2].status = 'missing';
    expect(defaultSelection(snapshot).previous).toEqual([]);
    expect(defaultSelection(snapshot).recent).toEqual(months.slice(3));
  });
  it('produces A with reproducible count, rate, persistence and growth', () => {
    expect(candidate()).toMatchObject({tier:'A',recent:15,previous:5,monthlyRate:5,activeMonths:3,absoluteChange:10,relativeChange:200});
    expect(candidate(fixture([20,0,0],[10,10,5]))).toMatchObject({tier:'A',relativeChange:25});
    expect(candidate(fixture([5,0,0],[5,5,0]))).toMatchObject({tier:'A',activeMonths:2});
  });
  it('implements both B branches and C without conflating growth and persistence', () => {
    expect(candidate(fixture([10,10,10],[5,5,0])).tier).toBe('B');
    expect(candidate(fixture([10,10,10],[5,5,0])).relativeChange).toBeCloseTo(-100*2/3);
    expect(candidate(fixture([5,0,0],[0,0,10]))).toMatchObject({tier:'B',activeMonths:1});
    expect(candidate(fixture([5,5,5],[5,0,0]))).toMatchObject({tier:'C',absoluteChange:-10});
  });
  it('does not manufacture percentages for zero baseline or evidence from zero records', () => {
    expect(candidate(fixture([0,0,0],[5,5,0]))).toMatchObject({tier:'B',relativeChange:null});
    expect(candidate(fixture([0,0,0],[0,0,0]))).toMatchObject({tier:'insufficient',recent:null});
  });
  it('enforces configurable thresholds and capacity zero, bounded and unlimited', () => {
    expect(candidate(fixture(),selection,{...DEFAULT_THRESHOLDS,minRecent:20,growthPercent:500})).toMatchObject({tier:'C'});
    expect(buildScenario(fixture(),selection,DEFAULT_THRESHOLDS,0).shortlist).toEqual([]);
    expect(buildScenario(fixture(),selection,DEFAULT_THRESHOLDS,null).metrics).toMatchObject({eligible:1,shortlisted:1,representedRecords:15,districts:1});
    expect(() => buildScenario(fixture(),selection,DEFAULT_THRESHOLDS,-1)).toThrow('capacity');
  });
  it.each(['partial','unknown','missing','schema-inconsistent'] as const)('withholds comparable metrics for %s months and capped partial periods', (status) => {
    const snapshot = fixture(); snapshot.months[0].status = status; snapshot.quality.capApplied = true;
    expect(candidate(snapshot)).toMatchObject({tier:'insufficient',recent:null,previous:null});
  });
  it('rejects unequal, overlapping, reversed or noncontiguous comparisons', () => {
    for (const selected of [{...selection,previous:months.slice(0,2)},{...selection,recent:months.slice(2,5)},{...selection,recent:[months[3],months[5],months[4]]},{...selection,previous:['2025-10','2025-11','2025-12']}]) {
      expect(candidate(fixture(),selected).tier).toBe('insufficient');
    }
  });
  it('supports longer complete equal periods with disclosed per-three-month normalization', () => {
    const snapshot = fixture();
    for (const month of ['2026-07','2026-08']) {
      snapshot.months.push({month,status:'complete',reasons:[]}); snapshot.sources.push({...snapshot.sources[0],id:month,period:month});
      snapshot.cells.push({...snapshot.cells[0],month,count:5});
    }
    const result = candidate(snapshot,{...selection,previous:months.slice(0,4),recent:['2026-05','2026-06','2026-07','2026-08']});
    expect(result.tier).toBe('A'); expect(result.reasons.join()).toContain('thresholds scale');
  });
  it('never treats an absent cell as zero and propagates suppression to every metric', () => {
    const snapshot = fixture(); snapshot.cells.pop();
    expect(candidate(snapshot)).toMatchObject({tier:'insufficient',recent:null});
    const suppressed = fixture(); suppressed.cells[0].suppressed = true; suppressed.cells[0].count = null; suppressed.quality.suppressedCells = 1;
    expect(candidate(suppressed)).toMatchObject({tier:'insufficient',suppressed:true,recent:null,previous:null,monthlyRate:null,absoluteChange:null,relativeChange:null,activeMonths:null});
    expect(createBriefing(suppressed,buildScenario(suppressed,selection)).scenario.shortlist).toEqual([]);
  });
  it('uses stable district identifiers to break fully tied metrics regardless of cell order', () => {
    const snapshot = fixture(); snapshot.cells.push(...snapshot.cells.map((cell) => ({...cell,district:'大同區'}))); snapshot.cells.reverse();
    const result = buildScenario(snapshot,{...selection,district:'all'});
    expect(result.shortlist.map((row) => row.district)).toEqual(['中正區','大同區']);
    expect(result.metrics.excluded).toBe(10);
  });
  it('keeps source population fixed in deterministic sensitivity scenarios', () => {
    const snapshot = fixture(); const result = sensitivity(snapshot,selection);
    expect(result).toEqual(sensitivity(snapshot,selection));
    expect(new Set(result.map((entry) => entry.scenario.populationKey)).size).toBe(1);
    expect(result.find((entry) => entry.id === 'default')?.changes[0].status).toBe('unchanged');
    expect(result.map((entry) => entry.id)).toEqual(['default','less-restrictive','more-restrictive','capacity-5','capacity-10']);
  });
  it('explains shortlist inclusion, exclusion and tier changes at a fixed capacity', () => {
    const snapshot = fixture([20,0,0],[10,10,5]);
    snapshot.cells.push(...fixture([0,0,0],[10,10,10]).cells.map((cell) => ({...cell,district:'大同區'})));
    const results = sensitivity(snapshot,{...selection,district:'all'},DEFAULT_THRESHOLDS,1);
    const strict = results.find((result) => result.id === 'more-restrictive')!;
    expect(strict.scenario.shortlist[0].district).toBe('大同區');
    expect(strict.changes.find((change) => change.district === '中正區')).toMatchObject({beforeTier:'A',afterTier:'B',status:'excluded'});
    expect(strict.changes.find((change) => change.district === '大同區')).toMatchObject({status:'included'});
  });
  it('rejects invalid snapshots, mapping/schema revisions, private fields and duplicates', () => {
    const mutations = [
      (s:CivicSnapshot) => { s.schemaVersion = 2 as 1; },
      (s:CivicSnapshot) => { s.mappingVersion = 'unreviewed'; },
      (s:CivicSnapshot) => { s.cells.push({...s.cells[0]}); },
      (s:CivicSnapshot) => { s.cells[0].item = '鼠患'; },
      (s:CivicSnapshot) => { s.cells[0].count = 4; },
      (s:CivicSnapshot) => { Object.assign(s.cells[0],{originalAddress:'private street'}); },
      (s:CivicSnapshot) => { Object.assign(s.sources[0],{caseId:'private-id'}); },
      (s:CivicSnapshot) => { s.sources[0].originalSha256 = null; },
      (s:CivicSnapshot) => { s.sources[0].status = 'schema-inconsistent'; },
      (s:CivicSnapshot) => { s.months.push({...s.months[0]}); }
    ];
    for (const mutate of mutations) { const snapshot = fixture(); mutate(snapshot); expect(() => validateSnapshot(snapshot)).toThrow(); }
  });
  it('retains superseded legacy provenance only when a verified original month remains', () => {
    const snapshot = fixture();
    snapshot.sources.push({...snapshot.sources[0],status:'unknown',originalSha256:null,reasons:['superseded-period-excluded-from-aggregates']});
    expect(() => validateSnapshot(snapshot)).not.toThrow();
    snapshot.sources.shift();
    expect(() => validateSnapshot(snapshot)).toThrow('verified original');
  });
  it('exports aggregate evidence, metadata and no raw identifiers, and checks version mismatch', () => {
    const snapshot = fixture(), scenario = buildScenario(snapshot,selection);
    const briefing = createBriefing(snapshot,scenario,'2026-07-02T00:00:00Z');
    expect(briefing.generatedAt).toBe('2026-07-02T00:00:00Z');
    expect(briefing.methodology).toBe('civic-investigation-priority-v1');
    expect(briefing.dataset.mappingVersion).toBe(CIVIC_MAPPING_VERSION);
    expect(JSON.stringify(briefing)).not.toMatch(/originalAddress|caseId|latitude|longitude|severityScore|resolvedCases/);
    expect(shortlistCsv(scenario)).toContain('environment_pollution');
    expect(shortlistCsv(scenario)).not.toMatch(/caseId|originalAddress/);
    expect(shortlistCsv(scenario,snapshot)).toContain('source_metadata_json');
    expect(shortlistCsv(scenario,snapshot)).toContain('fixture-1');
    snapshot.version = 'new-revision'; expect(() => createBriefing(snapshot,scenario)).toThrow('mismatch');
  });
  it('escapes spreadsheet formulas and quotes in aggregate text', () => {
    const scenario = buildScenario(fixture(),selection);
    scenario.shortlist[0].reasons = ['=HYPERLINK("https://example.com")'];
    expect(shortlistCsv(scenario)).toContain("'=HYPERLINK");
    expect(shortlistCsv(scenario)).toContain('""https://example.com""');
  });
  it('includes scenario quality exclusions and capacity metrics in CSV, including empty shortlists', () => {
    const snapshot = fixture();
    for (const capacity of [0,5]) {
      const scenario = buildScenario(snapshot,{...selection,district:'all'},DEFAULT_THRESHOLDS,capacity);
      const csv = Papa.parse<Record<string,string>>(shortlistCsv(scenario,snapshot),{header:true});
      expect(csv.errors).toEqual([]);
      expect(JSON.parse(csv.data[0].scenario_metrics_json)).toEqual(scenario.metrics);
      expect(JSON.parse(csv.data[0].scenario_metrics_json).excluded).toBe(11);
    }
  });
  it('handles an empty snapshot with no invented candidates', () => {
    const snapshot = fixture(); snapshot.sources=[]; snapshot.months=[]; snapshot.cells=[];
    const scenario = buildScenario(snapshot,defaultSelection(snapshot));
    expect(scenario.shortlist).toEqual([]); expect(scenario.metrics.representedRecords).toBe(0);
  });
});
