import { describe, expect, it } from 'vitest';
import { filterOpen1999Records, filterStreetlightRecords, filterConstructionAuditRecords, filterStopResumeRecords } from '../src/lib/filtering';
import { buildStreetlightSummary } from '../src/lib/streetlight';
import { buildConstructionAuditSummary } from '../src/lib/constructionAuditSummary';
import { buildStopResumeWorkSummary } from '../src/lib/stopResumeWorkSummary';
import type { Open1999Record } from '../src/types/open1999';
import type { StreetlightRepairRecord } from '../src/types/streetlight';
import type { PublicWorksConstructionAuditRecord } from '../src/types/constructionAudit';
import type { ConstructionStopResumeWorkRecord } from '../src/types/stopResumeWork';

describe('project-wide filtering', () => {
  it('applies all 1999 filters together, including localized group search', () => {
    const records = [
      openRecord({ id: 'morning', serviceGroup: 'water', serviceItem: '漏水', createdDate: '2026-01-05', hour: 8, weekday: 1 }),
      openRecord({ id: 'weekend', serviceGroup: 'water', serviceItem: '漏水', createdDate: '2026-01-10', hour: 8, weekday: 6 }),
      openRecord({ id: 'afternoon', serviceGroup: 'water', serviceItem: '漏水', createdDate: '2026-01-05', hour: 14, weekday: 1 })
    ];
    expect(filterOpen1999Records(records, { startDate: '2026-01-01', endDate: '2026-01-07', district: '大安區', serviceGroup: 'water', serviceItem: 'all', timePeriod: 'morning', dayType: 'weekday', search: '自來水' }, 'zh').map((record) => record.id)).toEqual(['morning']);
  });

  it('applies streetlight year, district, issue, urgency, and search filters with AND semantics', () => {
    const records = [
      streetlightRecord({ reportId: 'match', reportedYear: 2024, district: '北投區', issueTypes: ['light_out'], isUrgent: true, issueDescription: '路燈不亮' }),
      streetlightRecord({ reportId: 'wrong-year', reportedYear: 2023, district: '北投區', issueTypes: ['light_out'], isUrgent: true }),
      streetlightRecord({ reportId: 'wrong-issue', reportedYear: 2024, district: '北投區', issueTypes: ['always_on'], isUrgent: true })
    ];
    const filtered = filterStreetlightRecords(records, { year: '2024', district: '北投區', issueType: 'light_out', urgentOnly: true, search: '路燈不亮' });
    expect(filtered.map((record) => record.reportId)).toEqual(['match']);
    expect(buildStreetlightSummary(filtered)).toMatchObject({ totalRecords: 1, urgentRecordCount: 1 });
  });

  it('applies construction audit year, quarter, score, deduction, notes, and search filters', () => {
    const records = [
      auditRecord({ id: 'match', auditYear: 2026, auditQuarter: '2026-Q1', resourceQuarterKey: '2026-Q1', auditScoreBand: 'good', totalDeductionPoints: 1, hasNotes: true, notes: '備註甲' }),
      auditRecord({ id: 'wrong-score', auditYear: 2026, auditQuarter: '2026-Q1', auditScoreBand: 'excellent', totalDeductionPoints: undefined, hasNotes: true, notes: '備註甲' }),
      auditRecord({ id: 'wrong-quarter', auditYear: 2026, auditQuarter: '2026-Q2', resourceQuarterKey: '2026-Q2', auditScoreBand: 'good', totalDeductionPoints: 1, hasNotes: true, notes: '備註甲' })
    ];
    const filtered = filterConstructionAuditRecords(records, { year: '2026', quarter: '2026-Q1', sourceQuarter: '2026-Q1', agency: 'all', contractor: 'all', scoreBand: 'good', hasDeduction: true, hasNotes: true, search: '備註甲' });
    expect(filtered.map((record) => record.id)).toEqual(['match']);
    expect(buildConstructionAuditSummary(filtered)).toMatchObject({ totalRecords: 1, averageAuditScore: 85, recordsWithDeductionPoints: 1, recordsWithNotes: 1 });
  });

  it('applies stop/resume year, category, missing-date, keyword, and search filters', () => {
    const records = [
      stopResumeRecord({ id: 'match', stopWorkYear: 2026, stopWorkQuarter: '2026-Q1', stopWorkReasonCategory: 'fall_prevention', stopWorkScopeCategory: 'scaffold', isMissingResumeOrReviewDate: true, hasFallPreventionKeyword: true, stopWorkReason: '防墜措施不足' }),
      stopResumeRecord({ id: 'has-resume', stopWorkYear: 2026, stopWorkQuarter: '2026-Q1', stopWorkReasonCategory: 'fall_prevention', stopWorkScopeCategory: 'scaffold', isMissingResumeOrReviewDate: false, hasFallPreventionKeyword: true, stopWorkReason: '防墜措施不足' }),
      stopResumeRecord({ id: 'wrong-quarter', stopWorkYear: 2026, stopWorkQuarter: '2026-Q2', stopWorkReasonCategory: 'fall_prevention', stopWorkScopeCategory: 'scaffold', isMissingResumeOrReviewDate: true, hasFallPreventionKeyword: true, stopWorkReason: '防墜措施不足' })
    ];
    const filtered = filterStopResumeRecords(records, { year: '2026', quarter: '2026-Q1', entity: '測試營造', reasonCategory: 'fall_prevention', scopeCategory: 'scaffold', missingResume: true, fallPrevention: true, search: '防墜' });
    expect(filtered.map((record) => record.id)).toEqual(['match']);
    expect(buildStopResumeWorkSummary(filtered)).toMatchObject({ totalRecords: 1, recordsMissingResumeOrReviewDate: 1 });
  });
});

function openRecord(overrides: Partial<Open1999Record> = {}): Open1999Record {
  return { id: 'open', caseId: 'open', serviceItem: '案件', serviceGroup: 'other', displayLocation: '大安區 信義路', district: '大安區', road: '信義路', createdDate: '2026-01-05', createdTime: '08:00:00', createdAt: '2026-01-05T08:00:00+08:00', year: 2026, month: 1, day: 5, weekday: 1, hour: 8, sourceFile: 'test.csv', ...overrides };
}

function streetlightRecord(overrides: Partial<StreetlightRepairRecord> = {}): StreetlightRepairRecord {
  return { id: 'streetlight', module: 'streetlight_repair', reportId: 'report', districtStatus: 'valid', district: '北投區', reportedLocationMasked: '北投區 光明路', issueTypes: ['light_out'], isUrgent: false, reportedAtRaw: '2024-01-01T08:00:00', reportedYear: 2024, reportedDate: '2024-01-01', issueDescription: '路燈故障', source: '臺北市路燈維修資料', sourceAgency: '臺北市政府工務局公園路燈工程管理處', ...overrides };
}

function auditRecord(overrides: Partial<PublicWorksConstructionAuditRecord> = {}): PublicWorksConstructionAuditRecord {
  return { id: 'audit', module: 'public_works_construction_audit_records', resourceName: 'test', resourceQuarterKey: '2026-Q1', projectName: '測試工程', responsibleAgency: '測試機關', contractor: '測試廠商', auditDate: '2026-03-01', auditYear: 2026, auditQuarter: '2026-Q1', auditScore: 85, auditScoreBand: 'good', hasContractorDeductionPoints: true, hasSupervisionDeductionPoints: false, hasPcmDeductionPoints: false, hasNotes: false, sourceRecordHash: 'hash', source: '臺北市政府施工查核情形一覽表', sourceAgency: '臺北市政府工務局', ...overrides };
}

function stopResumeRecord(overrides: Partial<ConstructionStopResumeWorkRecord> = {}): ConstructionStopResumeWorkRecord {
  return { id: 'stop', module: 'construction_stop_resume_work_records', projectName: '測試工程', businessEntityName: '測試營造', stopWorkDate: '2026-01-01', stopWorkYear: 2026, stopWorkQuarter: '2026-Q1', stopWorkReasonCategory: 'fall_prevention', stopWorkScopeCategory: 'scaffold', stopWorkReason: '防墜措施不足', stopWorkScope: '施工架', hasResumeOrReviewDate: false, isMissingResumeOrReviewDate: true, hasFallPreventionKeyword: true, hasScaffoldKeyword: true, hasOpeningEdgeKeyword: false, hasElectricalKeyword: false, hasLiftingEquipmentKeyword: false, hasExcavationKeyword: false, sourceRecordHash: 'hash', source: '臺北市停復工公開資訊', sourceAgency: '臺北市政府勞動局勞動檢查處', ...overrides };
}
