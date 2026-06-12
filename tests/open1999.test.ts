import { describe, expect, it } from 'vitest';
import {
  aggregateByDistrict,
  aggregateByHotspot,
  buildCreatedAt,
  classifyServiceGroup,
  extractDistrict,
  extractRoadOrBroadLocation,
  maskPrivateAddress,
  normalizeFullWidth,
  parseDate,
  parseTime
} from '../src/lib/open1999';
import type { Open1999Record } from '../src/types/open1999';

describe('Open1999 normalization', () => {
  it('normalizes full-width digits and spaces', () => {
    expect(normalizeFullWidth('１２３　ＡＢＣ')).toBe('123 ABC');
  });

  it('parses Gregorian and ROC date strings into ISO dates', () => {
    expect(parseDate('2026/04/09')).toBe('2026-04-09');
    expect(parseDate('1150409')).toBe('2026-04-09');
  });

  it('rejects malformed dates instead of emitting impossible public dates', () => {
    expect(() => parseDate('63202108')).toThrow('Unsupported date');
    expect(() => parseDate('2026/21/08')).toThrow('Unsupported date');
  });

  it('parses compact and colon time strings', () => {
    expect(parseTime('0930')).toBe('09:30:00');
    expect(parseTime('18:07')).toBe('18:07:00');
  });

  it('builds a local ISO datetime from parsed date and time', () => {
    expect(buildCreatedAt('2026-04-09', '09:30:00')).toBe('2026-04-09T09:30:00+08:00');
  });
});

describe('Open1999 privacy-preserving address handling', () => {
  it('extracts Taipei districts from addresses', () => {
    expect(extractDistrict('台北市大安區信義路四段６０之８０號6樓')).toBe('大安區');
    expect(extractDistrict('中山區復興北路２０４號四樓之3')).toBe('中山區');
  });

  it('extracts only broad road or intersection text', () => {
    expect(extractRoadOrBroadLocation('大安區信義路四段６０之８０號6樓')).toBe('信義路四段');
    expect(extractRoadOrBroadLocation('大同區民族西路-重慶北路三段')).toBe('民族西路－重慶北路三段');
  });

  it('masks private address details before public display', () => {
    expect(maskPrivateAddress('大安區信義路四段６０之８０號6樓')).toBe('大安區 信義路四段');
    expect(maskPrivateAddress('中山區復興北路２０４號四樓之3')).toBe('中山區 復興北路');
    expect(maskPrivateAddress('大同區民族西路-重慶北路三段')).toBe('大同區 民族西路－重慶北路三段');
  });
});

describe('Open1999 grouping and aggregation', () => {
  it('classifies dispatch items into service groups', () => {
    expect(classifyServiceGroup('道路坑洞')).toBe('road_traffic');
    expect(classifyServiceGroup('路燈故障')).toBe('streetlight');
    expect(classifyServiceGroup('未分類事項')).toBe('other');
  });

  it('aggregates records by district and hotspot without exact addresses', () => {
    const records: Open1999Record[] = [
      makeRecord('1', '大安區', '大安區 信義路四段', '道路坑洞', 'road_traffic'),
      makeRecord('2', '大安區', '大安區 信義路四段', '路燈故障', 'streetlight'),
      makeRecord('3', '中山區', '中山區 復興北路', '噪音稽查', 'noise_pollution')
    ];

    expect(aggregateByDistrict(records)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          district: '大安區',
          totalCount: 2,
          byServiceGroup: expect.objectContaining({ road_traffic: 1, streetlight: 1 })
        })
      ])
    );
    expect(aggregateByHotspot(records)[0]).toEqual(
      expect.objectContaining({
        district: '大安區',
        displayLocation: '大安區 信義路四段',
        totalCount: 2
      })
    );
  });
});

function makeRecord(
  id: string,
  district: string,
  displayLocation: string,
  serviceItem: string,
  serviceGroup: Open1999Record['serviceGroup']
): Open1999Record {
  return {
    id,
    caseId: id,
    serviceItem,
    serviceGroup,
    originalAddress: `${displayLocation}99號9樓`,
    displayLocation,
    district,
    road: displayLocation.replace(`${district} `, ''),
    createdDate: '2026-04-09',
    createdTime: '09:30:00',
    createdAt: '2026-04-09T09:30:00+08:00',
    year: 2026,
    month: 4,
    day: 9,
    weekday: 4,
    hour: 9,
    sourceFile: 'test.csv'
  };
}
