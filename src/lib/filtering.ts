import { serviceGroupLabel, type Language } from './i18n';
import type { Open1999Record, Open1999ServiceGroup } from '../types/open1999';
import type { StreetlightIssueType, StreetlightRepairRecord } from '../types/streetlight';
import type { PublicWorksConstructionAuditRecord } from '../types/constructionAudit';
import type { ConstructionStopResumeWorkRecord } from '../types/stopResumeWork';

export type Open1999Filters = {
  startDate: string;
  endDate: string;
  district: string;
  serviceGroup: 'all' | Open1999ServiceGroup;
  serviceItem: string;
  timePeriod: 'all' | 'morning' | 'afternoon' | 'evening' | 'late';
  dayType: 'all' | 'weekday' | 'weekend';
  search: string;
};

export function filterOpen1999Records(records: Open1999Record[], filters: Open1999Filters, language: Language): Open1999Record[] {
  const query = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.startDate && record.createdDate < filters.startDate) return false;
    if (filters.endDate && record.createdDate > filters.endDate) return false;
    if (filters.district !== 'all' && record.district !== filters.district) return false;
    if (filters.serviceGroup !== 'all' && record.serviceGroup !== filters.serviceGroup) return false;
    if (filters.serviceItem !== 'all' && record.serviceItem !== filters.serviceItem) return false;
    if (!matchesTimePeriod(record.hour, filters.timePeriod)) return false;
    if (filters.dayType === 'weekday' && (record.weekday === 0 || record.weekday === 6)) return false;
    if (filters.dayType === 'weekend' && record.weekday > 0 && record.weekday < 6) return false;
    if (!query) return true;
    const haystack = [record.serviceItem, serviceGroupLabel(record.serviceGroup, language), record.district, record.displayLocation, record.road].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export type StreetlightFilters = { year: string; district: string; issueType: string; urgentOnly: boolean; search: string };

export function filterStreetlightRecords(records: StreetlightRepairRecord[], filters: StreetlightFilters): StreetlightRepairRecord[] {
  const query = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.year !== 'all' && String(record.reportedYear) !== filters.year) return false;
    if (filters.district !== 'all' && record.district !== filters.district) return false;
    if (filters.issueType !== 'all' && !record.issueTypes.includes(filters.issueType as StreetlightIssueType)) return false;
    if (filters.urgentOnly && !record.isUrgent) return false;
    if (!query) return true;
    return [record.reportId, record.district, record.reportedLocationMasked, record.issueDescription, record.roadName, record.issueTypes.join(' ')].join(' ').toLowerCase().includes(query);
  });
}

export type ConstructionAuditFilters = { year: string; quarter: string; sourceQuarter: string; agency: string; contractor: string; scoreBand: string; hasDeduction: boolean; hasNotes: boolean; search: string };

export function filterConstructionAuditRecords(records: PublicWorksConstructionAuditRecord[], filters: ConstructionAuditFilters): PublicWorksConstructionAuditRecord[] {
  const query = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.year !== 'all' && String(record.auditYear) !== filters.year) return false;
    if (filters.quarter !== 'all' && record.auditQuarter !== filters.quarter) return false;
    if (filters.sourceQuarter !== 'all' && record.resourceQuarterKey !== filters.sourceQuarter) return false;
    if (filters.agency !== 'all' && record.responsibleAgency !== filters.agency) return false;
    if (filters.contractor !== 'all' && record.contractor !== filters.contractor) return false;
    if (filters.scoreBand !== 'all' && record.auditScoreBand !== filters.scoreBand) return false;
    if (filters.hasDeduction && record.totalDeductionPoints === undefined) return false;
    if (filters.hasNotes && !record.hasNotes) return false;
    if (!query) return true;
    return [record.projectName, record.responsibleAgency, record.designUnit, record.supervisionUnit, record.contractor, record.projectManagementUnit, record.notificationMethod, record.notes, record.auditDate].join(' ').toLowerCase().includes(query);
  });
}

export type StopResumeFilters = { year: string; quarter: string; entity: string; reasonCategory: string; scopeCategory: string; missingResume: boolean; fallPrevention: boolean; search: string };

export function filterStopResumeRecords(records: ConstructionStopResumeWorkRecord[], filters: StopResumeFilters): ConstructionStopResumeWorkRecord[] {
  const query = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.year !== 'all' && String(record.stopWorkYear) !== filters.year) return false;
    if (filters.quarter !== 'all' && record.stopWorkQuarter !== filters.quarter) return false;
    if (filters.entity !== 'all' && record.businessEntityName !== filters.entity) return false;
    if (filters.reasonCategory !== 'all' && record.stopWorkReasonCategory !== filters.reasonCategory) return false;
    if (filters.scopeCategory !== 'all' && record.stopWorkScopeCategory !== filters.scopeCategory) return false;
    if (filters.missingResume && !record.isMissingResumeOrReviewDate) return false;
    if (filters.fallPrevention && !record.hasFallPreventionKeyword) return false;
    if (!query) return true;
    return [record.projectName, record.businessEntityName, record.stopWorkScope, record.stopWorkReason, record.stopWorkDate, record.resumeOrReviewDate].join(' ').toLowerCase().includes(query);
  });
}

function matchesTimePeriod(hour: number, period: Open1999Filters['timePeriod']): boolean {
  if (period === 'all') return true;
  if (period === 'morning') return hour >= 6 && hour < 12;
  if (period === 'afternoon') return hour >= 12 && hour < 17;
  if (period === 'evening') return hour >= 17 && hour < 21;
  return hour >= 21 || hour < 6;
}
