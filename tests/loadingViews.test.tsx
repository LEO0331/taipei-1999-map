import { readFileSync } from 'node:fs';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StreetlightRepairs } from '../src/components/StreetlightRepairs';
import { ConstructionAudits } from '../src/components/ConstructionAudits';
import { StopResumeWork } from '../src/components/StopResumeWork';
import { Open1999, defaultOpen1999Filters } from '../src/components/Open1999';
import { useStreetlightData } from '../src/hooks/useStreetlightData';
import { useConstructionAuditData } from '../src/hooks/useConstructionAuditData';
import { useStopResumeWorkData } from '../src/hooks/useStopResumeWorkData';
import { useOpen1999Data } from '../src/hooks/useOpen1999Data';

vi.mock('../src/hooks/useStreetlightData', () => ({ useStreetlightData: vi.fn() }));
vi.mock('../src/hooks/useConstructionAuditData', () => ({ useConstructionAuditData: vi.fn() }));
vi.mock('../src/hooks/useStopResumeWorkData', () => ({ useStopResumeWorkData: vi.fn() }));
vi.mock('../src/hooks/useOpen1999Data', () => ({ useOpen1999Data: vi.fn() }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  CircleMarker: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  Popup: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  TileLayer: () => null
}));

const json = (file: string) => JSON.parse(readFileSync(`public/data/${file}`, 'utf8'));
const streetlightSummary = json('streetlight-repair-summary.json');
const auditSummary = json('public-works-construction-audit-summary.json');
const stopSummary = json('construction-stop-resume-work-summary.json');
const report = json('conversion-report.json');

beforeEach(() => {
  vi.mocked(useStreetlightData).mockReturnValue({ records: [], summary: streetlightSummary, loading: false, error: undefined, retry: vi.fn() });
  vi.mocked(useConstructionAuditData).mockReturnValue({ records: [], summary: auditSummary, loading: true, error: undefined, retry: vi.fn() });
  vi.mocked(useStopResumeWorkData).mockReturnValue({ records: [], summary: stopSummary, loading: true, error: undefined, retry: vi.fn() });
  vi.mocked(useOpen1999Data).mockReturnValue({ records: [], districts: json('open1999-district-summary.json'), categories: json('open1999-category-summary.json'), hotspots: [], time: json('open1999-time-summary.json'), report, loading: false, recordsLoading: false, error: undefined, retry: vi.fn() });
});

describe('summary-first dashboard rendering', () => {
  it('shows full streetlight totals even before preview rows are available', () => {
    const html = renderToStaticMarkup(<StreetlightRepairs language="zh" />);
    expect(html).toContain(`<strong>${streetlightSummary.totalRecords.toLocaleString()}</strong>`);
    expect(html).toContain('2021年1月1日');
    expect(useStreetlightData).toHaveBeenCalledWith('all', false);
  });

  it('keeps partial preview statistics hidden and offers retry when the summary fails', () => {
    vi.mocked(useStreetlightData).mockReturnValue({ records: [], summary: undefined, loading: false, error: 'offline', retry: vi.fn() });
    const html = renderToStaticMarkup(<StreetlightRepairs language="zh" />);
    expect(html).toContain('class="dashboard" hidden=""');
    expect(html).toContain('資料載入失敗');
    expect(html).toContain('重試');
  });

  it('renders construction and stop/resume summaries while detailed records are still loading', () => {
    expect(renderToStaticMarkup(<ConstructionAudits language="en" />)).toContain(`<strong>${auditSummary.totalRecords.toLocaleString()}</strong>`);
    const html = renderToStaticMarkup(<StopResumeWork language="zh" />);
    expect(html).toContain(`<strong>${stopSummary.totalRecords.toLocaleString()}</strong>`);
    expect(html).not.toContain('<h3>安全關鍵字</h3>');
  });

  it('renders full 1999 counts and date bounds independently of preview records', () => {
    const html = renderToStaticMarkup(<Open1999 language="zh" filters={defaultOpen1999Filters} setFilters={vi.fn()} mode="district" setMode={vi.fn()} />);
    expect(html).toContain(`<strong>${report.outputRecords.toLocaleString()}</strong>`);
    expect(html).toContain(`value="${report.period.start.slice(0, 10)}"`);
    expect(useOpen1999Data).toHaveBeenCalledWith(false, '', '');
  });

  it('loads filtered 1999 records and hides aggregates while that selection is pending', () => {
    vi.mocked(useOpen1999Data).mockReturnValue({ records: [], districts: [], categories: [], hotspots: [], time: undefined, report, loading: true, recordsLoading: true, error: undefined, retry: vi.fn() });
    const html = renderToStaticMarkup(<Open1999 language="en" filters={{ ...defaultOpen1999Filters, startDate: '2026-01-01' }} setFilters={vi.fn()} mode="district" setMode={vi.fn()} />);
    expect(useOpen1999Data).toHaveBeenCalledWith(true, '2026-01-01', '');
    expect(html).toContain('class="dashboard" hidden=""');
    expect(html).toContain('Loading data');
  });
});
