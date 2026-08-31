import { useMemo, useState } from 'react';
import { formatDate, formatMonth, formatQuarter, type Language } from '../lib/i18n';
import { useStopResumeWorkData } from '../hooks/useStopResumeWorkData';
import type { ConstructionStopResumeWorkRecord, StopWorkReasonCategory, StopWorkScopeCategory } from '../types/stopResumeWork';

const reasonLabels: Record<Language, Record<StopWorkReasonCategory, string>> = {
  zh: { fall_prevention: '墜落防止', scaffold: '施工架', opening_or_edge: '開口或邊緣', electrical: '電氣', lifting_equipment: '起重吊掛', excavation: '開挖', fire_or_hot_work: '火源或熱作', machinery: '機械設備', protective_equipment: '個人防護具', other: '其他', unknown: '未知' },
  en: { fall_prevention: 'Fall prevention', scaffold: 'Scaffold', opening_or_edge: 'Opening or edge', electrical: 'Electrical', lifting_equipment: 'Lifting equipment', excavation: 'Excavation', fire_or_hot_work: 'Fire or hot work', machinery: 'Machinery', protective_equipment: 'Personal protective equipment', other: 'Other', unknown: 'Unknown' }
};

const scopeLabels: Record<Language, Record<StopWorkScopeCategory, string>> = {
  zh: { entire_site: '全區', scaffold: '施工架', exterior_wall: '外牆', opening_or_edge: '開口或邊緣', floor_or_area: '樓層或區域', equipment: '設備', other: '其他', unknown: '未知' },
  en: { entire_site: 'Entire site', scaffold: 'Scaffold', exterior_wall: 'Exterior wall', opening_or_edge: 'Opening or edge', floor_or_area: 'Floor or area', equipment: 'Equipment', other: 'Other', unknown: 'Unknown' }
};

const copy = {
  zh: {
    title: '停復工公開資訊',
    subtitle: '整理臺北市遭勞動檢查處處分停工案件公開資料，包含工程名稱、事業單位名稱、停工日期、復工或復工審查日期、停工範圍與停工原因，作為公共工程與勞動安全監督背景資料。',
    notice: '停復工公開資訊未提供官方經緯度、地址、道路或行政區欄位。本模組以工程名稱、事業單位、停工日期、復工或復工審查日期、停工範圍與停工原因進行統計，不顯示地圖點位，也不自動連結1999案件。',
    disclaimer: '停復工公開資訊為臺北市公開資料中遭勞動檢查處處分停工案件之公開紀錄，僅供查詢來源欄位與統計整理，不代表即時施工狀態、目前是否停工、目前是否復工、工地精確位置、建物安全判定、施工安全保證、廠商品質排名、法律責任認定、公共安全警示、投資建議或官方背書。',
    compare: '1999案件與停復工公開資訊資料性質不同。1999案件通常反映民眾通報、陳情或派工處理；停復工公開資訊則反映勞動檢查處對工地停工處分及復工或復工審查日期之公開紀錄。兩者不應在沒有可靠共同鍵的情況下直接合併或推論因果關係。',
    all: '全部',
    searchLabel: '搜尋',
    search: '搜尋工程名稱、事業單位、停工範圍、停工原因或日期',
    year: '停工年度',
    quarter: '停工季別',
    entity: '事業單位',
    reasonCategory: '停工原因類別',
    scopeCategory: '停工範圍類別',
    missingResume: '缺少復工或審查日期',
    fallPrevention: '墜落防止',
    records: '停工紀錄數',
    latestMonth: '最新停工月份',
    projects: '不重複工程數',
    entities: '事業單位數',
    withResume: '有復工或審查日期紀錄',
    withoutResume: '缺少復工或審查日期紀錄',
    avgDays: '平均復工或審查天數',
    medianDays: '中位復工或審查天數',
    topReason: '最多停工原因類別',
    topScope: '最多停工範圍類別',
    topEntity: '紀錄最多事業單位',
    topProject: '紀錄最多工程',
    byMonth: '各月停工紀錄數',
    byQuarter: '各季停工紀錄數',
    byReason: '停工原因類別分布',
    byScope: '停工範圍類別分布',
    byEntity: '停工紀錄最多事業單位',
    byProject: '停工紀錄最多工程',
    resumeSplit: '有無復工或審查日期',
    keywordTrend: '安全關鍵字',
    table: '工程清冊',
    stopDate: '停工日期',
    resumeDate: '復工或復工審查日期',
    projectName: '工程名稱',
    businessEntity: '事業單位名稱',
    scope: '停工範圍',
    reason: '停工原因',
    days: '復工或審查天數'
  },
  en: {
    title: 'Construction Stop / Resume Work Records',
    subtitle: 'Explore Taipei public records of construction-site cases subject to stop-work penalties by the labor inspection authority, including project name, business entity, stop-work date, resume-work or resume-review date, stop-work scope, and stop-work reason as public works and labor-safety oversight context.',
    notice: 'Construction stop / resume work records do not provide official coordinates, addresses, roads, or district fields. This module summarizes project names, business entities, stop-work dates, resume-work or resume-review dates, stop-work scopes, and stop-work reasons. It does not show map points and does not automatically link records to 1999 cases.',
    disclaimer: 'Construction stop / resume work public information is Taipei public-data record information about construction-site cases subject to stop-work penalties by the labor inspection authority. It does not represent real-time construction status, whether a site is currently stopped, whether a site has currently resumed work, exact site location, building-safety determination, construction-safety guarantee, contractor quality ranking, legal liability determination, public-safety alert, investment advice, or official endorsement.',
    compare: '1999 cases and construction stop / resume work records have different meanings. 1999 cases usually reflect citizen reports, petitions, or dispatch handling, while stop / resume work records reflect public records of labor-inspection stop-work penalties and resume-work or resume-review dates for construction sites. They should not be directly merged or used to infer causation without reliable shared keys.',
    all: 'All',
    searchLabel: 'Search',
    search: 'Search project name, business entity, stop-work scope, reason, or date',
    year: 'Stop-work year',
    quarter: 'Stop-work quarter',
    entity: 'Business entity',
    reasonCategory: 'Stop-work reason category',
    scopeCategory: 'Stop-work scope category',
    missingResume: 'Missing resume / review date',
    fallPrevention: 'Fall prevention',
    records: 'Stop-work record count',
    latestMonth: 'Latest stop-work month',
    projects: 'Unique project count',
    entities: 'Business entity count',
    withResume: 'Records with resume / review date',
    withoutResume: 'Records missing resume / review date',
    avgDays: 'Average days until resume / review',
    medianDays: 'Median days until resume / review',
    topReason: 'Top stop-work reason category',
    topScope: 'Top stop-work scope category',
    topEntity: 'Top business entity by record count',
    topProject: 'Top project by record count',
    byMonth: 'Stop-work record count by month',
    byQuarter: 'Stop-work record count by quarter',
    byReason: 'Stop-work reason category distribution',
    byScope: 'Stop-work scope category distribution',
    byEntity: 'Top business entities by stop-work record count',
    byProject: 'Top projects by stop-work record count',
    resumeSplit: 'Records with / without resume or review date',
    keywordTrend: 'Safety keywords',
    table: 'Project Directory',
    stopDate: 'Stop-work date',
    resumeDate: 'Resume / review date',
    projectName: 'Project name',
    businessEntity: 'Business entity',
    scope: 'Stop-work scope',
    reason: 'Stop-work reason',
    days: 'Days until resume / review'
  }
};

export function StopResumeWork({ language }: { language: Language }) {
  const data = useStopResumeWorkData();
  const t = copy[language];
  const [filters, setFilters] = useState({ year: 'all', quarter: 'all', entity: 'all', reasonCategory: 'all', scopeCategory: 'all', missingResume: false, fallPrevention: false, search: '' });
  const filtered = useMemo(() => filterRecords(data.records, filters), [data.records, filters]);
  const options = useMemo(() => buildOptions(data.records), [data.records]);
  const topReason = data.summary?.byStopWorkReasonCategory.find((row) => row.count > 0);
  const topScope = data.summary?.byStopWorkScopeCategory.find((row) => row.count > 0);
  const topEntity = data.summary?.byBusinessEntity[0];
  const topProject = data.summary?.byProject[0];
  const keywordRows = [
    { label: t.fallPrevention, count: data.records.filter((record) => record.hasFallPreventionKeyword).length },
    { label: reasonLabels[language].scaffold, count: data.records.filter((record) => record.hasScaffoldKeyword).length },
    { label: reasonLabels[language].opening_or_edge, count: data.records.filter((record) => record.hasOpeningEdgeKeyword).length }
  ];

  return (
    <>
      <section className="notice-band">
        <strong>{t.notice}</strong>
        <span>{t.disclaimer}</span>
        <span>{t.compare}</span>
      </section>

      <section className="workspace">
        <aside className="filters">
          <Select label={t.year} value={filters.year} options={options.years} all={t.all} onChange={(year) => setFilters({ ...filters, year })} />
          <Select label={t.quarter} value={filters.quarter} options={options.quarters} labels={formatQuarterLabels(options.quarters, language)} all={t.all} onChange={(quarter) => setFilters({ ...filters, quarter })} />
          <Select label={t.entity} value={filters.entity} options={options.entities} all={t.all} onChange={(entity) => setFilters({ ...filters, entity })} />
          <Select label={t.reasonCategory} value={filters.reasonCategory} options={Object.keys(reasonLabels[language])} labels={reasonLabels[language]} all={t.all} onChange={(reasonCategory) => setFilters({ ...filters, reasonCategory })} />
          <Select label={t.scopeCategory} value={filters.scopeCategory} options={Object.keys(scopeLabels[language])} labels={scopeLabels[language]} all={t.all} onChange={(scopeCategory) => setFilters({ ...filters, scopeCategory })} />
          <label className="check-row"><input type="checkbox" checked={filters.missingResume} onChange={(event) => setFilters({ ...filters, missingResume: event.target.checked })} />{t.missingResume}</label>
          <label className="check-row"><input type="checkbox" checked={filters.fallPrevention} onChange={(event) => setFilters({ ...filters, fallPrevention: event.target.checked })} />{t.fallPrevention}</label>
          <label>{t.searchLabel}<input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder={t.search} /></label>
        </aside>

        <section className="map-panel no-map-panel">
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
          <strong>{data.loading ? '...' : `${filtered.length.toLocaleString()} ${language === 'zh' ? '筆' : 'records'}`}</strong>
        </section>
      </section>

      <section className="dashboard">
        <div className="summary-grid">
          <Summary label={t.records} value={(data.summary?.totalRecords ?? 0).toLocaleString()} />
          <Summary label={t.latestMonth} value={formatMonth(data.summary?.latestStopWorkMonth, language)} />
          <Summary label={t.projects} value={(data.summary?.uniqueProjectCount ?? 0).toLocaleString()} />
          <Summary label={t.entities} value={(data.summary?.uniqueBusinessEntityCount ?? 0).toLocaleString()} />
          <Summary label={t.withResume} value={(data.summary?.recordsWithResumeOrReviewDate ?? 0).toLocaleString()} />
          <Summary label={t.withoutResume} value={(data.summary?.recordsMissingResumeOrReviewDate ?? 0).toLocaleString()} />
          <Summary label={t.avgDays} value={formatNumber(data.summary?.averageDaysUntilResumeOrReview)} />
          <Summary label={t.medianDays} value={formatNumber(data.summary?.medianDaysUntilResumeOrReview)} />
          <Summary label={t.topReason} value={topReason ? reasonLabels[language][topReason.stopWorkReasonCategory] : '-'} />
          <Summary label={t.topScope} value={topScope ? scopeLabels[language][topScope.stopWorkScopeCategory] : '-'} />
          <Summary label={t.topEntity} value={topEntity?.businessEntityName ?? '-'} />
          <Summary label={t.topProject} value={topProject?.projectName ?? '-'} />
        </div>

        <div className="chart-grid">
          <Bars title={t.byMonth} rows={data.summary?.byStopWorkMonth.slice(-24).map((row) => ({ label: formatMonth(row.stopWorkMonthKey, language), count: row.recordCount })) ?? []} />
          <Bars title={t.byQuarter} rows={data.summary?.byStopWorkQuarter.map((row) => ({ label: formatQuarter(row.stopWorkQuarter, language), count: row.recordCount })) ?? []} />
          <Bars title={t.byReason} rows={data.summary?.byStopWorkReasonCategory.map((row) => ({ label: reasonLabels[language][row.stopWorkReasonCategory], count: row.count })) ?? []} />
          <Bars title={t.byScope} rows={data.summary?.byStopWorkScopeCategory.map((row) => ({ label: scopeLabels[language][row.stopWorkScopeCategory], count: row.count })) ?? []} />
          <Bars title={t.byEntity} rows={data.summary?.byBusinessEntity.slice(0, 12).map((row) => ({ label: row.businessEntityName, count: row.recordCount })) ?? []} />
          <Bars title={t.byProject} rows={data.summary?.byProject.slice(0, 12).map((row) => ({ label: row.projectName, count: row.recordCount })) ?? []} />
          <Bars title={t.resumeSplit} rows={[{ label: t.withResume, count: data.summary?.recordsWithResumeOrReviewDate ?? 0 }, { label: t.withoutResume, count: data.summary?.recordsMissingResumeOrReviewDate ?? 0 }]} />
          <Bars title={t.keywordTrend} rows={keywordRows} />
        </div>

        <section className="chart">
          <h3>{t.table}</h3>
          <div className="audit-table">
            {filtered.slice(0, 120).map((record) => (
              <article key={record.id}>
                <div><strong>{record.projectName}</strong><span>{formatDate(record.stopWorkDate, language)}{record.stopWorkDate ? '' : record.stopWorkDateRaw ? ` (${record.stopWorkDateRaw})` : ''}</span></div>
                <p>{t.businessEntity}: {record.businessEntityName} · {t.resumeDate}: {formatDate(record.resumeOrReviewDate, language)}</p>
                <p>{t.scope}: {record.stopWorkScope ?? '-'} · {t.reason}: {record.stopWorkReason ?? '-'} · {t.days}: {formatNumber(record.daysUntilResumeOrReview)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

function filterRecords(records: ConstructionStopResumeWorkRecord[], filters: { year: string; quarter: string; entity: string; reasonCategory: string; scopeCategory: string; missingResume: boolean; fallPrevention: boolean; search: string }) {
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

function buildOptions(records: ConstructionStopResumeWorkRecord[]) {
  return {
    years: unique(records.map((record) => record.stopWorkYear && String(record.stopWorkYear))),
    quarters: unique(records.map((record) => record.stopWorkQuarter)),
    entities: unique(records.map((record) => record.businessEntityName)).slice(0, 120)
  };
}

function formatQuarterLabels(values: string[], language: Language): Record<string, string> {
  return Object.fromEntries(values.map((value) => [value, formatQuarter(value, language)]));
}

function Select({ label, value, options, all, labels, onChange }: { label: string; value: string; options: string[]; all: string; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="all">{all}</option>{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}</select></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="summary-card"><span>{label}</span><strong>{value}</strong></div>;
}

function Bars({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <section className="chart"><h3>{title}</h3>{rows.map((row) => <div className="bar-row" key={row.label}><span>{row.label}</span><div><i style={{ width: `${(row.count / max) * 100}%` }} /></div><b>{formatNumber(row.count)}</b></div>)}</section>;
}

function unique(values: Array<string | number | undefined>): string[] {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? '-' : value.toLocaleString();
}
