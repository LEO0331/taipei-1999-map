import { describe, expect, it } from 'vitest';
import {
  buildConstructionAuditRecord,
  classifyConstructionAuditScoreBand,
  deduplicateConstructionAuditRecords,
  deriveTotalDeductionPoints,
  parseContractAmountThousandNtd,
  parsePossibleDistrictFromProjectNameOrNotes,
  parseResourceQuarterFromName,
  parseTaiwanDate
} from '../src/lib/constructionAudit';

describe('construction audit conversion helpers', () => {
  it('parses ROC and Gregorian dates without coercing invalid dates', () => {
    expect(parseTaiwanDate('115/03/31')).toMatchObject({ date: '2026-03-31', year: 2026, monthKey: '2026-03', quarter: '2026-Q1' });
    expect(parseTaiwanDate('20260331')).toMatchObject({ date: '2026-03-31' });
    expect(parseTaiwanDate('115/02/31')).toMatchObject({ warning: '115/02/31' });
  });

  it('parses resource quarter names and contract amount units', () => {
    expect(parseResourceQuarterFromName('臺北市政府施工查核情形一覽表_115年第1季')).toMatchObject({ resourceRocYear: 115, resourceYear: 2026, resourceQuarter: 1, resourceQuarterKey: '2026-Q1' });
    expect(parseContractAmountThousandNtd('1,234千元')).toMatchObject({ contractAmountThousandNtd: 1234, contractAmountNtd: 1234000 });
  });

  it('classifies score bands and sums only defined deduction fields', () => {
    expect(classifyConstructionAuditScoreBand(90)).toBe('excellent');
    expect(classifyConstructionAuditScoreBand(69.9)).toBe('needs_attention');
    expect(classifyConstructionAuditScoreBand(undefined)).toBe('missing');
    expect(deriveTotalDeductionPoints({ contractorDeductionPoints: 0, pcmDeductionPoints: 2 })).toBe(2);
    expect(deriveTotalDeductionPoints({})).toBeUndefined();
  });

  it('only tags explicit Taipei district names as possible districts', () => {
    expect(parsePossibleDistrictFromProjectNameOrNotes({ projectName: '大安區道路改善工程' })).toBe('大安區');
    expect(parsePossibleDistrictFromProjectNameOrNotes({ projectName: '忠孝東路道路改善工程' })).toBeUndefined();
  });

  it('builds and deduplicates records without collapsing repeated projects on different dates', () => {
    const first = buildConstructionAuditRecord(row('1', '115/03/31'), '臺北市政府施工查核情形一覽表_115年第1季')!;
    const duplicate = buildConstructionAuditRecord(row('1', '115/03/31'), '臺北市政府施工查核情形一覽表_115年第1季')!;
    const later = buildConstructionAuditRecord(row('1', '115/04/01'), '臺北市政府施工查核情形一覽表_115年第2季')!;
    const result = deduplicateConstructionAuditRecords([first, duplicate, later]);
    expect(first).toMatchObject({ module: 'public_works_construction_audit_records', auditDate: '2026-03-31', auditScoreBand: 'good', totalDeductionPoints: 1 });
    expect(result.records).toHaveLength(2);
    expect(result.duplicateRows).toBe(1);
    expect(result.duplicateProjectNames).toContain('大安區道路改善工程');
  });
});

function row(sequence: string, auditDate: string) {
  return {
    序號: sequence,
    工程名稱: '大安區道路改善工程',
    主辦單位: '工務局',
    '契約金額-千元': '1,000',
    設計單位: '設計公司',
    監造單位: '監造公司',
    承造廠商: '營造公司',
    專案管理: 'PCM公司',
    查核日期: auditDate,
    通知方式: '預先通知',
    評分: '85',
    廠商扣點數: '1',
    監造扣點數: '-',
    PCM扣點數: '0',
    備註: ''
  };
}
