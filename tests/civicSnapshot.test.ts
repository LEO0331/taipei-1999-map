import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildScenario, createBriefing, defaultSelection, DEFAULT_THRESHOLDS, shortlistCsv, validateSnapshot } from '../src/lib/civicDecision';
import type { CivicSnapshot } from '../src/types/civicDecision';

const snapshot = JSON.parse(readFileSync('public/data/civic-decision/snapshot.json', 'utf8')) as CivicSnapshot;

describe('published civic evidence', () => {
  it('validates the real asset and requires six adjacent verified original publications', () => {
    expect(() => validateSnapshot(snapshot)).not.toThrow();
    const selection = defaultSelection(snapshot);
    expect(selection.previous).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(selection.recent).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(snapshot.quality.capApplied).toBe(false);
    expect(snapshot.sources.filter((source) => source.status === 'complete')).toHaveLength(6);
    expect(snapshot.cells.every((cell) => cell.count === null || cell.count === 0 || cell.count >= 5)).toBe(true);
    expect(snapshot.sources.some((source) => source.status === 'unknown')).toBe(true);
  });

  it('reproduces the documented source-backed pollution comparison and aggregate exports', () => {
    const selection = { ...defaultSelection(snapshot), topic: 'environment_pollution' };
    const scenario = buildScenario(snapshot, selection, DEFAULT_THRESHOLDS, 5);
    expect(scenario.metrics).toEqual({ eligible: 12, shortlisted: 5, representedRecords: 1334, districts: 5, excluded: 0 });
    expect(scenario.shortlist.map(({ district, tier, recent, previous }) => ({ district, tier, recent, previous }))).toEqual([
      { district: '松山區', tier: 'A', recent: 289, previous: 201 },
      { district: '文山區', tier: 'A', recent: 217, previous: 144 },
      { district: '南港區', tier: 'A', recent: 167, previous: 126 },
      { district: '信義區', tier: 'B', recent: 287, previous: 231 },
      { district: '中山區', tier: 'B', recent: 374, previous: 333 }
    ]);
    const exported = JSON.stringify(createBriefing(snapshot, scenario)) + shortlistCsv(scenario, snapshot);
    expect(exported).not.toMatch(/originalAddress|caseId|displayLocation|latitude|longitude|severityScore|resolvedCases/);
    expect(exported).toContain('civic-investigation-priority-v1');
    const incomplete = buildScenario(snapshot, { ...selection, previous: ['2026-01', '2026-02', '2026-03'], recent: ['2026-04', '2026-05', '2026-06'] });
    expect(incomplete.shortlist).toEqual([]);
  });
});
