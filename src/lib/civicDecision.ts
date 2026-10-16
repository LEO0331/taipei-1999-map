import { CIVIC_MAPPING_VERSION, CIVIC_TOPICS } from './civicCategoryMapping';
import { TAIPEI_DISTRICTS } from './open1999';
import type { CivicCandidate, CivicScenario, CivicSelection, CivicSnapshot, CivicThresholds } from '../types/civicDecision';

export const METHODOLOGY_ID = 'civic-investigation-priority-v1';
export const DEFAULT_THRESHOLDS: CivicThresholds = { minRecent: 10, minActiveMonths: 2, minBaseline: 5, growthPercent: 25 };
const statuses = ['complete', 'partial', 'missing', 'schema-inconsistent', 'unknown'];
const validMonth = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const ordinal = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
const topicById = (id: string) => CIVIC_TOPICS.find((topic) => topic.id === id);
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function object(value: unknown, keys: string[], name: string) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `Invalid ${name}`);
  const actual = Object.keys(value);
  assert(actual.length === keys.length && actual.every((key) => keys.includes(key)), `Unexpected or missing ${name} fields`);
}
const string = (value: unknown) => typeof value === 'string';
const nullableString = (value: unknown) => value === null || string(value);
const integer = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const strings = (value: unknown) => Array.isArray(value) && value.every(string);

/** Runtime allowlist: rejects record-level fields and incompatible snapshot/mapping versions. */
export function validateSnapshot(snapshot: CivicSnapshot): void {
  object(snapshot, ['schemaVersion','datasetId','version','mappingVersion','generatedAt','processingVersion','sources','months','cells','quality'], 'snapshot');
  assert(snapshot.schemaVersion === 1 && snapshot.mappingVersion === CIVIC_MAPPING_VERSION, 'Unsupported snapshot or mapping version');
  assert([snapshot.datasetId,snapshot.version,snapshot.generatedAt,snapshot.processingVersion].every((v) => string(v) && v.length > 0), 'Invalid snapshot identity');
  assert(Array.isArray(snapshot.sources) && Array.isArray(snapshot.months) && Array.isArray(snapshot.cells), 'Invalid snapshot arrays');
  for (const source of snapshot.sources) {
    object(source, ['id','url','provider','file','period','publishedAt','retrievedAt','processedAt','sha256','originalSha256','encoding','schema','inputRows','validRows','duplicates','invalidDates','unknownDistrict','maskedGeography','status','reasons'], 'source');
    assert([source.id,source.url,source.period,source.publishedAt,source.retrievedAt,source.originalSha256].every(nullableString), 'Invalid nullable source metadata');
    assert(source.period === null || validMonth(source.period), 'Invalid source period');
    assert([source.provider,source.file,source.processedAt,source.sha256,source.encoding].every(string), 'Invalid source metadata');
    assert(/^[a-f0-9]{64}$/i.test(source.sha256) && (source.originalSha256 === null || /^[a-f0-9]{64}$/i.test(source.originalSha256)), 'Invalid source hash');
    assert([source.inputRows,source.validRows,source.duplicates,source.invalidDates,source.unknownDistrict,source.maskedGeography].every(integer), 'Invalid source counts');
    assert(source.validRows <= source.inputRows && statuses.includes(source.status) && strings(source.schema) && strings(source.reasons), 'Invalid source quality');
  }
  const months = new Set<string>();
  for (const month of snapshot.months) {
    object(month, ['month','status','reasons'], 'month');
    assert(validMonth(month.month) && !months.has(month.month) && statuses.includes(month.status) && strings(month.reasons), 'Invalid or duplicate month');
    months.add(month.month);
    if (month.status === 'complete') {
      const sources = snapshot.sources.filter((source) => source.period === month.month && !source.reasons.includes('superseded-period-excluded-from-aggregates'));
      assert(sources.length > 0 && sources.every((source) => source.status === 'complete' && source.originalSha256 !== null), 'Complete month requires verified original sources');
    }
  }
  const keys = new Set<string>();
  for (const cell of snapshot.cells) {
    object(cell, ['month','district','topic','item','count','suppressed'], 'cell');
    assert(months.has(cell.month) && TAIPEI_DISTRICTS.some((district) => district === cell.district), 'Invalid cell geography or month');
    assert(topicById(cell.topic)?.items.includes(cell.item), 'Unverified cell mapping');
    assert(typeof cell.suppressed === 'boolean' && (cell.suppressed ? cell.count === null : integer(cell.count) && (cell.count === 0 || cell.count! >= 5)), 'Invalid disclosure protection');
    const key = JSON.stringify([cell.month,cell.district,cell.topic,cell.item]);
    assert(!keys.has(key), 'Duplicate aggregate cell'); keys.add(key);
  }
  object(snapshot.quality, ['inputRows','acceptedRows','duplicates','invalidRows','unknownDistrict','unrecognizedItems','suppressedCells','capApplied','notes'], 'quality');
  const q = snapshot.quality;
  assert([q.inputRows,q.acceptedRows,q.duplicates,q.invalidRows,q.unknownDistrict,q.suppressedCells].every(integer) && q.acceptedRows <= q.inputRows && typeof q.capApplied === 'boolean' && strings(q.unrecognizedItems) && strings(q.notes), 'Invalid quality report');
  assert(q.suppressedCells === snapshot.cells.filter((cell) => cell.suppressed).length, 'Suppression count mismatch');
}

export function defaultSelection(snapshot: CivicSnapshot): CivicSelection {
  validateSnapshot(snapshot);
  const complete = snapshot.months.filter((month) => month.status === 'complete').map((month) => month.month).sort();
  const suffix: string[] = [];
  for (let i = complete.length - 1; i >= 0 && suffix.length < 6; i--) {
    if (suffix.length && ordinal(suffix[0]) - ordinal(complete[i]) !== 1) break;
    suffix.unshift(complete[i]);
  }
  return { recent: suffix.slice(-3), previous: suffix.length === 6 ? suffix.slice(0,3) : [], topic: 'all', item: 'all', district: 'all' };
}

function periodProblems(snapshot: CivicSnapshot, selection: CivicSelection): string[] {
  const { recent, previous } = selection;
  if (!recent.length || recent.length !== previous.length) return ['Equal nonempty comparison periods are required; descriptive evidence only.'];
  const combined = [...previous, ...recent];
  if (new Set(combined).size !== combined.length || !combined.every(validMonth) || combined.some((month, i) => i > 0 && ordinal(month) !== ordinal(combined[i-1]) + 1)) return ['Comparison periods must be contiguous, ordered, adjacent and nonoverlapping.'];
  if (combined.some((month) => snapshot.months.find((entry) => entry.month === month)?.status !== 'complete')) return ['Required source months are missing, partial, inconsistent or unverified.'];
  return [];
}

export function buildScenario(snapshot: CivicSnapshot, selection: CivicSelection, thresholds: CivicThresholds = DEFAULT_THRESHOLDS, capacity: number | null = 5): CivicScenario {
  validateSnapshot(snapshot);
  object(selection, ['recent','previous','topic','item','district'], 'selection');
  assert(Array.isArray(selection.recent) && Array.isArray(selection.previous), 'Invalid period selection');
  assert(selection.recent.every(validMonth) && selection.previous.every(validMonth), 'Invalid selected month');
  assert(selection.topic === 'all' || topicById(selection.topic), 'Unknown topic selection');
  assert(selection.district === 'all' || TAIPEI_DISTRICTS.some((district) => district === selection.district), 'Unknown district selection');
  const topics = CIVIC_TOPICS.filter((topic) => selection.topic === 'all' || topic.id === selection.topic);
  assert(selection.item === 'all' || topics.some((topic) => topic.items.includes(selection.item)), 'Unknown item selection');
  object(thresholds, ['minRecent','minActiveMonths','minBaseline','growthPercent'], 'thresholds');
  assert(Object.values(thresholds).every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0) && Number.isInteger(thresholds.minActiveMonths) && thresholds.minActiveMonths <= 3, 'Invalid thresholds (persistence is specified per three months)');
  assert(capacity === null || integer(capacity), 'Invalid capacity');
  const problems = periodProblems(snapshot, selection);
  const cellMap = new Map(snapshot.cells.map((cell) => [JSON.stringify([cell.month,cell.district,cell.topic,cell.item]), cell]));
  const candidates: CivicCandidate[] = [];
  for (const district of TAIPEI_DISTRICTS.filter((district) => selection.district === 'all' || district === selection.district)) for (const topic of topics) {
    const items = topic.items.filter((item) => selection.item === 'all' || selection.item === item);
    if (!items.length) continue;
    const cells = [...selection.previous,...selection.recent].flatMap((month) => items.map((item) => cellMap.get(JSON.stringify([month,district,topic.id,item]))));
    const suppressed = cells.some((cell) => cell?.suppressed);
    const reasons = [...problems];
    if (cells.some((cell) => !cell)) reasons.push('Required aggregate cells are absent; absence is not zero.');
    if (suppressed) reasons.push('Selected monthly cells are suppressed; all derived metrics are withheld.');
    const base: CivicCandidate = { district, topic: topic.id, recent: null, previous: null, monthlyRate: null, absoluteChange: null, relativeChange: null, activeMonths: null, tier: 'insufficient', reasons, suppressed };
    if (reasons.length) { candidates.push(base); continue; }
    const sums = (months: string[]) => months.map((month) => items.reduce((sum, item) => sum + cellMap.get(JSON.stringify([month,district,topic.id,item]))!.count!, 0));
    const recentMonthly = sums(selection.recent);
    const recent = recentMonthly.reduce((a,b) => a+b,0), previous = sums(selection.previous).reduce((a,b) => a+b,0);
    if (recent + previous === 0) { base.reasons.push('No valid records in this selected source scope.'); candidates.push(base); continue; }
    const absoluteChange = recent - previous, relativeChange = previous > 0 ? absoluteChange / previous * 100 : null;
    const activeMonths = recentMonthly.filter((count) => count > 0).length;
    const scale = selection.recent.length / 3;
    const volume = recent >= thresholds.minRecent * scale;
    const persistence = activeMonths >= Math.ceil(thresholds.minActiveMonths * scale);
    const growth = previous > 0 && previous >= thresholds.minBaseline * scale && relativeChange! >= thresholds.growthPercent;
    const tier = volume && persistence && growth ? 'A' : (volume && persistence) || growth ? 'B' : 'C';
    const explanation = tier === 'A' ? 'Volume, persistence, comparable baseline and growth thresholds all met.' : tier === 'B' ? volume && persistence ? 'Volume and persistence thresholds met; full A growth evidence is not met.' : 'Comparable baseline and growth thresholds met; A volume or persistence is not met.' : 'Comparable observations exist; A and B thresholds are not met.';
    candidates.push({ ...base, recent, previous, monthlyRate: recent / selection.recent.length, absoluteChange, relativeChange, activeMonths, tier, reasons: [explanation, ...(previous === 0 ? ['Zero baseline: percentage change is unavailable.'] : []), ...(scale !== 1 ? ['Extended/shorter periods: volume and baseline thresholds scale by months/3; persistence rounds up after the same scaling.'] : [])] });
  }
  const tierOrder = { A: 0, B: 1, C: 2, insufficient: 3 };
  const descending = (a: number | null, b: number | null) => a === null ? b === null ? 0 : 1 : b === null ? -1 : b-a;
  candidates.sort((a,b) => tierOrder[a.tier]-tierOrder[b.tier] || descending(a.absoluteChange,b.absoluteChange) || descending(a.monthlyRate,b.monthlyRate) || descending(a.activeMonths,b.activeMonths) || compareText(a.district,b.district) || compareText(a.topic,b.topic));
  const eligible = candidates.filter((candidate) => candidate.tier !== 'insufficient');
  const shortlist = capacity === null ? eligible : eligible.slice(0,capacity);
  return { populationKey: JSON.stringify([snapshot.datasetId,snapshot.version,snapshot.mappingVersion,selection.previous,selection.recent,selection.district,selection.topic,selection.item]), selection: { ...selection, recent: [...selection.recent], previous: [...selection.previous] }, thresholds: { ...thresholds }, capacity, candidates, shortlist, metrics: { eligible: eligible.length, shortlisted: shortlist.length, representedRecords: shortlist.reduce((sum,candidate) => sum+candidate.recent!,0), districts: new Set(shortlist.map((candidate) => candidate.district)).size, excluded: candidates.length-eligible.length } };
}

export const CIVIC_LIMITATIONS = [
  'Historical recorded dispatch frequency is not underlying problem incidence, severity, verified environmental harm or confirmed rodent infestation.',
  'Reporting reflects access, public awareness, service definitions, exposure and source coverage; no population adjustment or statistical significance is claimed.',
  'Investigation slots are analytical assumptions, not official assignments, cases resolved, citizens served or intervention outcomes.',
  'Monthly item cells below five are suppressed; any selected suppressed cell withholds the whole candidate. No complementary totals or raw case identifiers are exported.',
  'District aggregation cannot establish an allegation about a property, business, market or individual.'
];

export function createBriefing(snapshot: CivicSnapshot, scenario: CivicScenario, generatedAt = new Date().toISOString()) {
  const verified = buildScenario(snapshot,scenario.selection,scenario.thresholds,scenario.capacity);
  assert(verified.populationKey === scenario.populationKey, 'Scenario population/version mismatch');
  return { title: 'Civic Investigation Briefing / 民生通報調查建議摘要', policyQuestion: 'Which historical district/topic dispatch patterns warrant further investigation within available review slots?', methodology: METHODOLOGY_ID, dataset: { id: snapshot.datasetId, version: snapshot.version, mappingVersion: snapshot.mappingVersion, processingVersion: snapshot.processingVersion, snapshotGeneratedAt: snapshot.generatedAt }, generatedAt, sourcePeriod: snapshot.months.map(({month,status,reasons}) => ({month,status,reasons:[...reasons]})), sources: snapshot.sources.map((source) => ({...source, schema:[...source.schema],reasons:[...source.reasons]})), geographicCoverage: 'Taipei City, district level only', scenario: verified, quality: {...snapshot.quality, notes:[...snapshot.quality.notes],unrecognizedItems:[...snapshot.quality.unrecognizedItems]}, assumptions: ['Illustrative editable triage thresholds; no official government decision.', 'Equal complete adjacent periods; extended-period count and persistence thresholds normalized per three months.'], limitations: [...CIVIC_LIMITATIONS], verificationQuestions: ['Can the source provider attest month completeness and classification consistency?', 'What agency or field evidence explains the observed dispatch pattern?', 'Is any authoritative rodent-specific evidence available? This dataset does not establish it.'] };
}

/** Aggregate-only CSV. Quotes and spreadsheet formula prefixes are escaped. */
export function shortlistCsv(scenario: CivicScenario, snapshot?: CivicSnapshot): string {
  const briefing = snapshot ? createBriefing(snapshot, scenario) : null;
  const safeScenario = briefing?.scenario ?? scenario;
  const escape = (value: unknown) => { let text = value == null ? '' : String(value); if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"','""') + '"'; };
  const header = ['methodology','population','recent_months','previous_months','capacity','min_recent','min_active_months','min_baseline','growth_percent','district','topic','tier','recent','previous','monthly_rate','absolute_change','relative_change_percent','active_months','suppressed','reasons'];
  const metadataHeaders = ['dataset_id','dataset_version','mapping_version','snapshot_generated_at','export_generated_at','source_metadata_json','month_status_json','quality_json','limitations_json','scenario_metrics_json'];
  const metadata = briefing ? [briefing.dataset.id,briefing.dataset.version,briefing.dataset.mappingVersion,briefing.dataset.snapshotGeneratedAt,briefing.generatedAt,JSON.stringify(briefing.sources),JSON.stringify(briefing.sourcePeriod),JSON.stringify(briefing.quality),JSON.stringify(briefing.limitations),JSON.stringify(safeScenario.metrics)] : [...Array(metadataHeaders.length - 1).fill(''),JSON.stringify(safeScenario.metrics)];
  const prefix = [METHODOLOGY_ID,safeScenario.populationKey,safeScenario.selection.recent.join('|'),safeScenario.selection.previous.join('|'),safeScenario.capacity,safeScenario.thresholds.minRecent,safeScenario.thresholds.minActiveMonths,safeScenario.thresholds.minBaseline,safeScenario.thresholds.growthPercent];
  const rows = safeScenario.shortlist.map((candidate) => [...prefix,candidate.district,candidate.topic,candidate.tier,candidate.recent,candidate.previous,candidate.monthlyRate,candidate.absoluteChange,candidate.relativeChange,candidate.activeMonths,candidate.suppressed,candidate.reasons.join(' '),...metadata].map(escape).join(','));
  // Retain source/quality disclosure even when there is no eligible shortlist.
  if (!rows.length) rows.push([...prefix,'','','insufficient','','','','','','','','No eligible investigation shortlist.',...metadata].map(escape).join(','));
  return '\uFEFF' + [[...header,...metadataHeaders].map(escape).join(','),...rows].join('\r\n');
}

export type CivicSensitivityEntry = { id: string; label: string; scenario: CivicScenario; changes: Array<{ district: string; topic: string; beforeTier: CivicCandidate['tier']; afterTier: CivicCandidate['tier']; beforeRank: number | null; afterRank: number | null; status: 'included' | 'excluded' | 'changed' | 'unchanged'; reason: string }> };
/** All scenarios retain the exact snapshot, mapping and selection population. Ranks are shortlist ranks. */
export function sensitivity(snapshot: CivicSnapshot, selection: CivicSelection, thresholds: CivicThresholds = DEFAULT_THRESHOLDS, capacity: number | null = 5): CivicSensitivityEntry[] {
  const baseline = buildScenario(snapshot,selection,thresholds,capacity);
  const variants = [
    { id:'default',label:'Default assumptions',thresholds:DEFAULT_THRESHOLDS,capacity },
    { id:'less-restrictive',label:'Less restrictive assumptions',thresholds:{minRecent:thresholds.minRecent*0.8,minActiveMonths:Math.max(0,thresholds.minActiveMonths-1),minBaseline:thresholds.minBaseline*0.8,growthPercent:thresholds.growthPercent*0.8},capacity },
    { id:'more-restrictive',label:'More restrictive assumptions',thresholds:{minRecent:thresholds.minRecent*1.2,minActiveMonths:Math.min(3,thresholds.minActiveMonths+1),minBaseline:thresholds.minBaseline*1.2,growthPercent:thresholds.growthPercent*1.2},capacity },
    { id:'capacity-5',label:'Five review slots',thresholds,capacity:5 },
    { id:'capacity-10',label:'Ten review slots',thresholds,capacity:10 }
  ];
  const key = (candidate: CivicCandidate) => JSON.stringify([candidate.district,candidate.topic]);
  return variants.map((variant) => {
    const scenario = buildScenario(snapshot,selection,variant.thresholds,variant.capacity);
    return { id:variant.id,label:variant.label,scenario,changes:baseline.candidates.map((before) => {
      const after = scenario.candidates.find((candidate) => key(candidate) === key(before))!;
      const oldIndex = baseline.shortlist.findIndex((candidate) => key(candidate) === key(before)), newIndex = scenario.shortlist.findIndex((candidate) => key(candidate) === key(before));
      const status = oldIndex < 0 && newIndex >= 0 ? 'included' : oldIndex >= 0 && newIndex < 0 ? 'excluded' : before.tier !== after.tier || oldIndex !== newIndex ? 'changed' : 'unchanged';
      return {district:before.district,topic:before.topic,beforeTier:before.tier,afterTier:after.tier,beforeRank:oldIndex<0?null:oldIndex+1,afterRank:newIndex<0?null:newIndex+1,status,reason:status === 'unchanged' ? 'Tier and shortlist rank unchanged under these assumptions.' : variant.id.startsWith('capacity-') ? `Available review slots changed to ${variant.capacity}; source evidence and tiers remain fixed.` : `${variant.label}: ${after.reasons.join(' ')}`};
    }) };
  });
}
