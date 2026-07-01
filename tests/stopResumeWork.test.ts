import { describe, expect, it } from 'vitest';
import {
  buildStopResumeWorkRecord,
  classifyStopWorkReason,
  classifyStopWorkScope,
  deduplicateStopResumeWorkRecords,
  deriveDaysUntilResumeOrReview,
  parsePossibleDistrictFromText,
  parseTaiwanCompactDate
} from '../src/lib/stopResumeWork';

describe('stop/resume work conversion helpers', () => {
  it('parses ROC compact dates and preserves invalid dates', () => {
    expect(parseTaiwanCompactDate('1100504')).toMatchObject({ date: '2021-05-04', year: 2021, monthKey: '2021-05', quarter: '2021-Q2' });
    expect(parseTaiwanCompactDate('110314')).toMatchObject({ date: '2021-03-14' });
    expect(parseTaiwanCompactDate('1150427')).toMatchObject({ date: '2026-04-27' });
    expect(parseTaiwanCompactDate('110/05/04')).toMatchObject({ date: '2021-05-04' });
    expect(parseTaiwanCompactDate('1100231')).toMatchObject({ warning: '1100231' });
  });

  it('calculates resume/review duration without inferring current status', () => {
    expect(deriveDaysUntilResumeOrReview('2021-05-04', '2021-05-17')).toEqual({ daysUntilResumeOrReview: 13 });
    expect(deriveDaysUntilResumeOrReview('2021-05-17', '2021-05-04')).toMatchObject({ daysUntilResumeOrReview: -13, warning: '2021-05-17|2021-05-04' });
    expect(deriveDaysUntilResumeOrReview('2021-05-04', undefined)).toEqual({});
  });

  it('classifies reason and scope categories from source text', () => {
    expect(classifyStopWorkReason('未設安全網及安全帶')).toBe('fall_prevention');
    expect(classifyStopWorkReason('施工架未防護')).toBe('scaffold');
    expect(classifyStopWorkReason('配電設備有感電危害')).toBe('electrical');
    expect(classifyStopWorkScope('全區外牆施工架')).toBe('entire_site');
    expect(classifyStopWorkScope('外牆施工架')).toBe('scaffold');
  });

  it('only tags explicit Taipei district names', () => {
    expect(parsePossibleDistrictFromText({ projectName: '大安區新建工程' })).toBe('大安區');
    expect(parsePossibleDistrictFromText({ projectName: '大安路新建工程' })).toBeUndefined();
  });

  it('builds records and deduplicates exact repeated source rows', () => {
    const first = buildStopResumeWorkRecord(row('1', '1100504', '1100517'))!;
    const duplicate = buildStopResumeWorkRecord(row('1', '1100504', '1100517'))!;
    const later = buildStopResumeWorkRecord(row('1', '1100601', ''))!;
    const result = deduplicateStopResumeWorkRecords([first, duplicate, later]);
    expect(first).toMatchObject({ stopWorkDate: '2021-05-04', resumeOrReviewDate: '2021-05-17', daysUntilResumeOrReview: 13, hasResumeOrReviewDate: true, isMissingResumeOrReviewDate: false, hasFallPreventionKeyword: true });
    expect(later).toMatchObject({ hasResumeOrReviewDate: false, isMissingResumeOrReviewDate: true });
    expect(result.records).toHaveLength(2);
    expect(result.duplicateRows).toBe(1);
    expect(result.duplicateProjectNames).toContain('大安區新建工程');
  });
});

function row(sequence: string, stopWorkDate: string, resumeDate: string) {
  return {
    序號: sequence,
    工程名稱: '大安區新建工程',
    事業單位名稱: '測試營造股份有限公司',
    停工日期: stopWorkDate,
    復工或復工審查日期: resumeDate,
    停工範圍: '全區外牆施工架',
    停工原因: '外牆施工架開口無防護、未設安全帶'
  };
}
