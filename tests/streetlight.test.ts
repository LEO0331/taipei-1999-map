import { describe, expect, it } from 'vitest';
import {
  classifyStreetlightIssueTypes,
  deduplicateStreetlightRecords,
  extractRoadName,
  maskReportedLocation,
  normalizeTaipeiDistrict,
  parseReportedAt
} from '../src/lib/streetlight';
import type { StreetlightRepairRecord } from '../src/types/streetlight';

describe('streetlight repair conversion helpers', () => {
  it('parses Taipei local reported datetimes', () => {
    expect(parseReportedAt('2024/12/31 22:12')).toMatchObject({
      reportedAt: '2024-12-31T22:12:00+08:00',
      reportedYear: 2024,
      reportedMonth: 12,
      reportedDate: '2024-12-31',
      reportedHour: 22
    });
  });

  it('normalizes district noise and outside Taipei values', () => {
    expect(normalizeTaipeiDistrict('大安')).toMatchObject({ district: '大安區', districtStatus: 'normalized' });
    expect(normalizeTaipeiDistrict('北投?')).toMatchObject({ district: '北投區', districtStatus: 'normalized' });
    expect(normalizeTaipeiDistrict('新店')).toMatchObject({ districtStatus: 'outside_taipei' });
    expect(normalizeTaipeiDistrict('--')).toMatchObject({ districtStatus: 'invalid' });
  });

  it('classifies multiple issue types without using them as severity', () => {
    expect(classifyStreetlightIssueTypes('緊急案件 電線外露 路燈不亮')).toEqual(['urgent', 'light_out', 'wire_or_electrical']);
    expect(classifyStreetlightIssueTypes(undefined)).toEqual(['unclear']);
  });

  it('masks house numbers and extracts road names', () => {
    expect(maskReportedLocation('民生東路4段56巷3弄17號')).toBe('民生東路4段56巷3弄***號');
    expect(extractRoadName('臺北市北投區長安里008鄰光明路129號')).toBe('光明路');
  });

  it('deduplicates identical reports and records conflicting report IDs', () => {
    const first = record('1', '光明路129號', '路燈不亮');
    const duplicate = { ...first, id: 'duplicate' };
    const conflict = record('1', '信義路二段86巷', '白天一直亮');
    const result = deduplicateStreetlightRecords([first, duplicate, conflict]);
    expect(result.records).toHaveLength(2);
    expect(result.duplicates).toBe(1);
    expect(result.conflicts).toEqual(['1']);
  });
});

function record(reportId: string, reportedLocation: string, issueDescription: string): StreetlightRepairRecord {
  return {
    id: reportId,
    module: 'streetlight_repair',
    reportId,
    districtStatus: 'valid',
    district: '北投區',
    reportedLocation,
    issueDescription,
    issueTypes: ['light_out'],
    isUrgent: false,
    reportedAtRaw: '2024-01-01T00:00:00',
    source: '臺北市路燈維修資料',
    sourceAgency: '臺北市政府工務局公園路燈工程管理處'
  };
}
