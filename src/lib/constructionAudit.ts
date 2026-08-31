import { createHash } from 'node:crypto';
import { TAIPEI_DISTRICTS } from './open1999';
import type { ConstructionAuditScoreBand, PublicWorksConstructionAuditRecord } from '../types/constructionAudit';

export const CONSTRUCTION_AUDIT_SOURCE = '臺北市政府施工查核情形一覽表';
export const CONSTRUCTION_AUDIT_SOURCE_AGENCY = '臺北市政府工務局';

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'nan', 'null'].includes(text.toLowerCase()) ? text : undefined;
}

export function normalizeText(raw: unknown): string | undefined {
  return cleanText(raw)?.replace(/\s+/g, ' ');
}

export function parseNumericText(raw: unknown): number | undefined {
  const text = cleanText(raw)?.replace(/,/g, '').replace(/[千元分點]/g, '');
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function parseContractAmountThousandNtd(raw: unknown): { contractAmountThousandNtd?: number; contractAmountNtd?: number; warning?: string } {
  const contractAmountThousandNtd = parseNumericText(raw);
  if (contractAmountThousandNtd === undefined) return cleanText(raw) ? { warning: String(raw) } : {};
  return { contractAmountThousandNtd, contractAmountNtd: contractAmountThousandNtd * 1000 };
}

export function parseTaiwanDate(raw: unknown): { raw?: string; date?: string; year?: number; month?: number; monthKey?: string; quarter?: string; warning?: string } {
  const text = cleanText(raw);
  if (!text) return {};
  const compact = text.match(/^\d{7}$/) ? text.match(/^(\d{3})(\d{2})(\d{2})$/) : text.match(/^\d{8}$/) ? text.match(/^(\d{4})(\d{2})(\d{2})$/) : undefined;
  const match = compact ?? text.match(/^(\d{2,4})年(\d{1,2})月(\d{1,2})日/) ?? text.match(/^(\d{2,4})\D(\d{1,2})\D(\d{1,2})/);
  if (!match) return { raw: text, warning: text };
  const sourceYear = Number(match[1]);
  const year = sourceYear < 1911 ? sourceYear + 1911 : sourceYear;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { raw: text, warning: text };
  const monthKey = `${year}-${pad(month)}`;
  return { raw: text, date: `${monthKey}-${pad(day)}`, year, month, monthKey, quarter: `${year}-Q${Math.ceil(month / 3)}` };
}

export function parseResourceQuarterFromName(resourceName: string): Pick<PublicWorksConstructionAuditRecord, 'resourceQuarterRaw' | 'resourceRocYear' | 'resourceYear' | 'resourceQuarter' | 'resourceQuarterKey'> & { warning?: string } {
  const match = resourceName.match(/(\d{2,3})年第?\s*([1-4])季/);
  if (!match) return { warning: resourceName };
  const resourceRocYear = Number(match[1]);
  const resourceQuarter = Number(match[2]) as 1 | 2 | 3 | 4;
  const resourceYear = resourceRocYear + 1911;
  return { resourceQuarterRaw: match[0], resourceRocYear, resourceYear, resourceQuarter, resourceQuarterKey: `${resourceYear}-Q${resourceQuarter}` };
}

export function classifyConstructionAuditScoreBand(score: number | undefined): ConstructionAuditScoreBand {
  if (score === undefined) return 'missing';
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score < 70) return 'needs_attention';
  return 'unknown';
}

export function deriveTotalDeductionPoints(record: { contractorDeductionPoints?: number; supervisionDeductionPoints?: number; pcmDeductionPoints?: number }): number | undefined {
  const values = [record.contractorDeductionPoints, record.supervisionDeductionPoints, record.pcmDeductionPoints].filter((value) => value !== undefined);
  return values.length ? values.reduce((sum, value) => sum + value!, 0) : undefined;
}

export function parsePossibleDistrictFromProjectNameOrNotes(record: { projectName?: string; notes?: string }): string | undefined {
  const text = `${record.projectName ?? ''} ${record.notes ?? ''}`;
  return TAIPEI_DISTRICTS.find((district) => text.includes(district));
}

export function buildConstructionAuditRecord(row: Record<string, unknown>, resourceName: string): PublicWorksConstructionAuditRecord | undefined {
  const projectName = cleanText(row['工程名稱']);
  if (!projectName) return undefined;
  const resourceQuarter = parseResourceQuarterFromName(resourceName);
  const auditDate = parseTaiwanDate(row['查核日期']);
  const contractAmount = parseContractAmountThousandNtd(row['契約金額-千元'] ?? row['契約金額－千元']);
  const contractorDeductionPoints = parseNumericText(row['廠商扣點數']);
  const supervisionDeductionPoints = parseNumericText(row['監造扣點數']);
  const pcmDeductionPoints = parseNumericText(row['PCM扣點數'] ?? row['pcm扣點數']);
  const totalDeductionPoints = deriveTotalDeductionPoints({ contractorDeductionPoints, supervisionDeductionPoints, pcmDeductionPoints });
  const auditScore = parseNumericText(row['評分']);
  const responsibleAgency = cleanText(row['主辦單位']);
  const designUnit = cleanText(row['設計單位']);
  const supervisionUnit = cleanText(row['監造單位']);
  const contractor = cleanText(row['承造廠商']);
  const projectManagementUnit = cleanText(row['專案管理']);
  const notificationMethod = cleanText(row['通知方式']);
  const notes = cleanText(row['備註']);
  const sourceSequenceNumber = parseNumericText(row['序號']);
  const hashInput = [resourceName, sourceSequenceNumber, projectName, auditDate.raw ?? cleanText(row['查核日期'])].map((value) => normalizeText(value) ?? '').join('|');
  return {
    id: createHash('sha1').update(hashInput).digest('hex').slice(0, 16),
    module: 'public_works_construction_audit_records',
    resourceName,
    ...resourceQuarter,
    sourceSequenceNumber,
    projectName,
    projectNameNormalized: normalizeText(projectName),
    responsibleAgency,
    responsibleAgencyNormalized: normalizeText(responsibleAgency),
    ...contractAmount,
    designUnit,
    designUnitNormalized: normalizeText(designUnit),
    supervisionUnit,
    supervisionUnitNormalized: normalizeText(supervisionUnit),
    contractor,
    contractorNormalized: normalizeText(contractor),
    projectManagementUnit,
    projectManagementUnitNormalized: normalizeText(projectManagementUnit),
    auditDateRaw: auditDate.raw,
    auditDate: auditDate.date,
    auditYear: auditDate.year,
    auditMonth: auditDate.month,
    auditMonthKey: auditDate.monthKey,
    auditQuarter: auditDate.quarter,
    notificationMethod,
    notificationMethodNormalized: normalizeText(notificationMethod),
    auditScore,
    auditScoreBand: classifyConstructionAuditScoreBand(auditScore),
    contractorDeductionPoints,
    supervisionDeductionPoints,
    pcmDeductionPoints,
    totalDeductionPoints,
    hasContractorDeductionPoints: contractorDeductionPoints !== undefined,
    hasSupervisionDeductionPoints: supervisionDeductionPoints !== undefined,
    hasPcmDeductionPoints: pcmDeductionPoints !== undefined,
    notes,
    hasNotes: notes !== undefined,
    possibleProjectLocationText: [projectName, notes].filter(Boolean).join(' '),
    possibleDistrict: parsePossibleDistrictFromProjectNameOrNotes({ projectName, notes }),
    sourceRecordHash: createHash('sha256').update(JSON.stringify(row)).digest('hex'),
    source: CONSTRUCTION_AUDIT_SOURCE,
    sourceAgency: CONSTRUCTION_AUDIT_SOURCE_AGENCY
  };
}

export function deduplicateConstructionAuditRecords(records: PublicWorksConstructionAuditRecord[]): { records: PublicWorksConstructionAuditRecord[]; duplicateRows: number; duplicateProjectNames: string[]; duplicateFallbackKeys: string[] } {
  const seen = new Set<string>();
  const projectCounts = new Map<string, number>();
  const fallbackCounts = new Map<string, number>();
  const output: PublicWorksConstructionAuditRecord[] = [];
  let duplicateRows = 0;
  for (const record of records) {
    const primary = [record.resourceName, record.sourceSequenceNumber, record.projectName, record.auditDateRaw].map((value) => normalizeText(value) ?? '').join('|');
    const fallback = [record.projectName, record.responsibleAgency, record.contractor, record.auditDateRaw].map((value) => normalizeText(value) ?? '').join('|');
    projectCounts.set(record.projectNameNormalized ?? record.projectName, (projectCounts.get(record.projectNameNormalized ?? record.projectName) ?? 0) + 1);
    fallbackCounts.set(fallback, (fallbackCounts.get(fallback) ?? 0) + 1);
    if (seen.has(primary)) duplicateRows += 1;
    else {
      seen.add(primary);
      output.push(record);
    }
  }
  return {
    records: output,
    duplicateRows,
    duplicateProjectNames: duplicateKeys(projectCounts),
    duplicateFallbackKeys: duplicateKeys(fallbackCounts)
  };
}

export { buildConstructionAuditSummary } from './constructionAuditSummary';

function duplicateKeys(map: Map<string, number>): string[] {
  return [...map.entries()].filter(([, count]) => count > 1).map(([key]) => key).slice(0, 20);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
