export type MonthStatus = 'complete' | 'partial' | 'missing' | 'schema-inconsistent' | 'unknown';
export type CivicMonth = { month: string; status: MonthStatus; reasons: string[] };
export type CivicCell = { month: string; district: string; topic: string; item: string; count: number | null; suppressed: boolean };
export type CivicSource = {
  id: string | null; url: string | null; provider: string; file: string; period: string | null;
  publishedAt: string | null; retrievedAt: string | null; processedAt: string;
  sha256: string; originalSha256: string | null; encoding: string; schema: string[];
  inputRows: number; validRows: number; duplicates: number; invalidDates: number;
  unknownDistrict: number; maskedGeography: number; status: MonthStatus; reasons: string[];
};
export type CivicSnapshot = {
  schemaVersion: 1; datasetId: string; version: string; mappingVersion: string;
  generatedAt: string; processingVersion: string; sources: CivicSource[];
  months: CivicMonth[]; cells: CivicCell[];
  quality: { inputRows: number; acceptedRows: number; duplicates: number; invalidRows: number; unknownDistrict: number; unrecognizedItems: string[]; suppressedCells: number; capApplied: boolean; notes: string[] };
};
export type CivicThresholds = { minRecent: number; minActiveMonths: number; minBaseline: number; growthPercent: number };
export type CivicSelection = { recent: string[]; previous: string[]; topic: string; item: string; district: string };
export type CivicCandidate = {
  district: string; topic: string; recent: number | null; previous: number | null;
  monthlyRate: number | null; absoluteChange: number | null; relativeChange: number | null;
  activeMonths: number | null; tier: 'A' | 'B' | 'C' | 'insufficient'; reasons: string[]; suppressed: boolean;
};
export type CivicScenario = {
  populationKey: string; selection: CivicSelection; thresholds: CivicThresholds; capacity: number | null;
  candidates: CivicCandidate[]; shortlist: CivicCandidate[];
  metrics: { eligible: number; shortlisted: number; representedRecords: number; districts: number; excluded: number };
};
