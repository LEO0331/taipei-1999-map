import { useMemo, useState } from 'react';
import { formatDate, formatQuarter, type Language } from '../lib/i18n';
import { buildConstructionAuditSummary } from '../lib/constructionAuditSummary';
import { filterConstructionAuditRecords } from '../lib/filtering';
import { useConstructionAuditData } from '../hooks/useConstructionAuditData';
import type { ConstructionAuditScoreBand, PublicWorksConstructionAuditRecord } from '../types/constructionAudit';

const scoreBandLabels: Record<Language, Record<ConstructionAuditScoreBand, string>> = {
  zh: { excellent: '90分以上', good: '80-89分', fair: '70-79分', needs_attention: '70分以下', missing: '無評分', unknown: '未知' },
  en: { excellent: '90 and above', good: '80-89', fair: '70-79', needs_attention: 'Below 70', missing: 'Missing score', unknown: 'Unknown' }
};

const copy = {
  zh: {
    title: '施工查核情形一覽表',
    subtitle: '整理臺北市政府工程施工查核公開資料，包含工程名稱、主辦單位、契約金額、設計單位、監造單位、承造廠商、專案管理、查核日期、通知方式、評分與扣點數，作為市政服務與公共工程監督背景資料。',
    notice: '施工查核情形一覽表未提供官方經緯度、地址、道路或行政區欄位。本模組以工程查核紀錄、日期、單位、廠商、契約金額、評分與扣點數進行統計，不顯示地圖點位，也不自動連結1999案件。',
    disclaimer: '施工查核情形一覽表為臺北市公開資料中的政府工程施工查核紀錄，僅供查詢來源欄位與統計整理，不代表即時施工進度、工程完成狀態、建物安全判定、施工安全保證、廠商品質排名、法律責任認定、採購違失判定、公共安全警示或官方背書。',
    compare: '1999案件與施工查核資料性質不同。1999案件通常反映民眾通報、陳情或派工處理；施工查核情形則反映政府工程查核紀錄。兩者不應在沒有可靠共同鍵的情況下直接合併或推論因果關係。',
    all: '全部',
    search: '搜尋工程名稱、主辦單位、廠商、監造單位、專案管理或備註',
    searchLabel: '搜尋',
    auditYear: '查核年度',
    auditQuarter: '查核季別',
    sourceQuarter: '來源季別',
    responsibleAgency: '主辦單位',
    contractor: '承造廠商',
    scoreBand: '評分區間',
    hasDeduction: '有扣點',
    hasNotes: '有備註',
    records: '施工查核紀錄數',
    latestQuarter: '最新查核季別',
    projects: '不重複工程數',
    agencies: '主辦單位數',
    contractors: '承造廠商數',
    totalAmount: '契約金額合計',
    averageAmount: '平均契約金額',
    averageScore: '平均評分',
    deductionRecords: '有扣點紀錄數',
    totalDeduction: '扣點數合計',
    topAgency: '查核最多主辦單位',
    topContractor: '查核最多承造廠商',
    byQuarter: '各季施工查核紀錄數',
    byAgency: '各主辦單位查核紀錄數',
    byContractor: '各承造廠商查核紀錄數',
    byScore: '評分分布',
    byNotification: '通知方式分布',
    deductionByType: '各類扣點數',
    table: '查核清冊',
    auditDate: '查核日期',
    projectName: '工程名稱',
    amount: '契約金額',
    supervisionUnit: '監造單位',
    score: '評分',
    deductions: '扣點數合計',
    deductionContractor: '廠商',
    deductionSupervision: '監造',
    deductionProjectManagement: '專案管理'
  },
  en: {
    title: 'Public Works Construction Audit Records',
    subtitle: 'Explore Taipei City Government public works construction audit records, including project name, responsible agency, contract amount, design unit, supervision unit, contractor, project management unit, audit date, notification method, score, and deduction points as civic service and public works oversight context.',
    notice: 'Construction audit records do not provide official coordinates, addresses, roads, or district fields. This module summarizes audit records, dates, agencies, contractors, contract amounts, scores, and deduction points. It does not show map points and does not automatically link records to 1999 cases.',
    disclaimer: 'Construction audit records are Taipei public-data records of government public works construction audits for source-field lookup and statistical organization only. They do not represent real-time construction progress, project completion status, building-safety determination, construction-safety guarantee, contractor quality ranking, legal liability determination, procurement violation determination, public-safety alert, or official endorsement.',
    compare: '1999 cases and construction audit records have different meanings. 1999 cases usually reflect citizen reports, petitions, or dispatch handling, while construction audit records reflect formal government public works audit records. They should not be directly merged or used to infer causation without reliable shared keys.',
    all: 'All',
    search: 'Search project name, agency, contractor, supervision unit, project management, or notes',
    searchLabel: 'Search',
    auditYear: 'Audit year',
    auditQuarter: 'Audit quarter',
    sourceQuarter: 'Source quarter',
    responsibleAgency: 'Responsible agency',
    contractor: 'Contractor',
    scoreBand: 'Score band',
    hasDeduction: 'Has deduction points',
    hasNotes: 'Has notes',
    records: 'Construction audit record count',
    latestQuarter: 'Latest audit quarter',
    projects: 'Unique project count',
    agencies: 'Responsible agency count',
    contractors: 'Contractor count',
    totalAmount: 'Total contract amount',
    averageAmount: 'Average contract amount',
    averageScore: 'Average audit score',
    deductionRecords: 'Records with deduction points',
    totalDeduction: 'Total deduction points',
    topAgency: 'Top responsible agency by audit count',
    topContractor: 'Top contractor by audit count',
    byQuarter: 'Audit record count by quarter',
    byAgency: 'Audit record count by responsible agency',
    byContractor: 'Audit record count by contractor',
    byScore: 'Audit score distribution',
    byNotification: 'Notification method distribution',
    deductionByType: 'Deduction points by type',
    table: 'Audit Directory',
    auditDate: 'Audit date',
    projectName: 'Project name',
    amount: 'Contract amount',
    supervisionUnit: 'Supervision unit',
    score: 'Score',
    deductions: 'Total deduction points',
    deductionContractor: 'Contractor',
    deductionSupervision: 'Supervision',
    deductionProjectManagement: 'Project management (PCM)'
  }
};

export function ConstructionAudits({ language }: { language: Language }) {
  const data = useConstructionAuditData();
  const t = copy[language];
  const [filters, setFilters] = useState({ year: 'all', quarter: 'all', sourceQuarter: 'all', agency: 'all', contractor: 'all', scoreBand: 'all', hasDeduction: false, hasNotes: false, search: '' });
  const filtered = useMemo(() => filterConstructionAuditRecords(data.records, filters), [data.records, filters]);
  const summary = useMemo(() => buildConstructionAuditSummary(filtered), [filtered]);
  const options = useMemo(() => buildOptions(data.records), [data.records]);
  const topAgency = summary.byResponsibleAgency[0];
  const topContractor = summary.byContractor[0];
  const deductionRows = [
    { label: t.deductionContractor, count: summary.totalContractorDeductionPoints ?? 0 },
    { label: t.deductionSupervision, count: summary.totalSupervisionDeductionPoints ?? 0 },
    { label: t.deductionProjectManagement, count: summary.totalPcmDeductionPoints ?? 0 }
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
          <Select label={t.auditYear} value={filters.year} options={options.years} all={t.all} onChange={(year) => setFilters({ ...filters, year })} />
          <Select label={t.auditQuarter} value={filters.quarter} options={options.auditQuarters} labels={formatQuarterLabels(options.auditQuarters, language)} all={t.all} onChange={(quarter) => setFilters({ ...filters, quarter })} />
          <Select label={t.sourceQuarter} value={filters.sourceQuarter} options={options.sourceQuarters} labels={formatQuarterLabels(options.sourceQuarters, language)} all={t.all} onChange={(sourceQuarter) => setFilters({ ...filters, sourceQuarter })} />
          <Select label={t.responsibleAgency} value={filters.agency} options={options.agencies} all={t.all} onChange={(agency) => setFilters({ ...filters, agency })} />
          <Select label={t.contractor} value={filters.contractor} options={options.contractors} all={t.all} onChange={(contractor) => setFilters({ ...filters, contractor })} />
          <Select label={t.scoreBand} value={filters.scoreBand} options={Object.keys(scoreBandLabels[language])} labels={scoreBandLabels[language]} all={t.all} onChange={(scoreBand) => setFilters({ ...filters, scoreBand })} />
          <label className="check-row"><input type="checkbox" checked={filters.hasDeduction} onChange={(event) => setFilters({ ...filters, hasDeduction: event.target.checked })} />{t.hasDeduction}</label>
          <label className="check-row"><input type="checkbox" checked={filters.hasNotes} onChange={(event) => setFilters({ ...filters, hasNotes: event.target.checked })} />{t.hasNotes}</label>
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
          <Summary label={t.records} value={summary.totalRecords.toLocaleString()} />
          <Summary label={t.latestQuarter} value={formatQuarter(summary.latestAuditQuarter, language)} />
          <Summary label={t.projects} value={summary.uniqueProjectCount.toLocaleString()} />
          <Summary label={t.agencies} value={summary.responsibleAgencyCount.toLocaleString()} />
          <Summary label={t.contractors} value={summary.contractorCount.toLocaleString()} />
          <Summary label={t.totalAmount} value={formatMoney(summary.totalContractAmountThousandNtd, language)} />
          <Summary label={t.averageAmount} value={formatMoney(summary.averageContractAmountThousandNtd, language)} />
          <Summary label={t.averageScore} value={formatNumber(summary.averageAuditScore)} />
          <Summary label={t.deductionRecords} value={summary.recordsWithDeductionPoints.toLocaleString()} />
          <Summary label={t.totalDeduction} value={formatNumber(summary.totalDeductionPoints)} />
          <Summary label={t.topAgency} value={topAgency?.responsibleAgency ?? '-'} />
          <Summary label={t.topContractor} value={topContractor?.contractor ?? '-'} />
        </div>

        <div className="chart-grid">
          <Bars title={t.byQuarter} rows={summary.byAuditQuarter.map((row) => ({ label: formatQuarter(row.auditQuarter, language), count: row.recordCount }))} />
          <Bars title={t.byAgency} rows={summary.byResponsibleAgency.slice(0, 12).map((row) => ({ label: row.responsibleAgency, count: row.recordCount }))} />
          <Bars title={t.byContractor} rows={summary.byContractor.slice(0, 12).map((row) => ({ label: row.contractor, count: row.recordCount }))} />
          <Bars title={t.byScore} rows={summary.byScoreBand.map((row) => ({ label: scoreBandLabels[language][row.auditScoreBand], count: row.count }))} />
          <Bars title={t.byNotification} rows={summary.byNotificationMethod.map((row) => ({ label: row.notificationMethod, count: row.count }))} />
          <Bars title={t.deductionByType} rows={deductionRows} />
        </div>

        <section className="chart">
          <h3>{t.table}</h3>
          <div className="audit-table">
            {filtered.slice(0, 120).map((record) => (
              <article key={record.id}>
                <div><strong>{record.projectName}</strong><span>{formatDate(record.auditDate ?? record.auditDateRaw, language)}</span></div>
                <p>{t.responsibleAgency}: {record.responsibleAgency ?? '-'} · {t.contractor}: {record.contractor ?? '-'}</p>
                <p>{t.amount}: {formatMoney(record.contractAmountThousandNtd, language)} · {t.supervisionUnit}: {record.supervisionUnit ?? '-'} · {t.score}: {formatNumber(record.auditScore)} · {t.deductions}: {formatNumber(record.totalDeductionPoints)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

function buildOptions(records: PublicWorksConstructionAuditRecord[]) {
  return {
    years: unique(records.map((record) => record.auditYear && String(record.auditYear))),
    auditQuarters: unique(records.map((record) => record.auditQuarter)),
    sourceQuarters: unique(records.map((record) => record.resourceQuarterKey)),
    agencies: unique(records.map((record) => record.responsibleAgency)).slice(0, 80),
    contractors: unique(records.map((record) => record.contractor)).slice(0, 80)
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

function formatMoney(thousandNtd: number | undefined, language: Language): string {
  if (thousandNtd === undefined) return '-';
  const amount = Math.round(thousandNtd).toLocaleString();
  return language === 'zh' ? `${amount} 千元` : `${amount}k NTD`;
}
