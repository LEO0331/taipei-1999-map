import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { TAIPEI_DISTRICTS, TAIPEI_DISTRICT_CENTROIDS } from '../lib/open1999';
import { STREETLIGHT_ISSUE_TYPES } from '../lib/streetlight';
import { type Language } from '../lib/i18n';
import { useStreetlightData } from '../hooks/useStreetlightData';
import type { StreetlightIssueType, StreetlightRepairRecord } from '../types/streetlight';

const issueLabels: Record<Language, Record<StreetlightIssueType, string>> = {
  zh: {
    light_out: '路燈不亮',
    always_on: '白天長亮',
    wire_or_electrical: '電線或電氣問題',
    pole_or_fixture_damage: '燈桿或設備損壞',
    cover_or_lamp_damage: '燈罩或燈具損壞',
    multiple_lights: '多盞路燈',
    urgent: '緊急字樣',
    unclear: '描述不明',
    other: '其他'
  },
  en: {
    light_out: 'Light out',
    always_on: 'Always on',
    wire_or_electrical: 'Wire or electrical issue',
    pole_or_fixture_damage: 'Pole or fixture damage',
    cover_or_lamp_damage: 'Cover or lamp damage',
    multiple_lights: 'Multiple lights',
    urgent: 'Urgent keyword',
    unclear: 'Unclear description',
    other: 'Other'
  }
};

const copy = {
  zh: {
    title: '路燈維修',
    subtitle: '探索臺北市路燈維修查報紀錄，依行政區、日期與故障描述分類整理。',
    notice: '路燈維修資料未提供官方經緯度，地圖以行政區彙總呈現，不代表精確故障位置或即時故障狀態。',
    disclaimer: '路燈維修資料為歷史查報與維修相關公開資料，並不代表即時故障狀態、目前是否已修復、維修績效或道路安全程度。實際路燈故障、維修進度與最新狀態請以主管機關及官方通報系統為準。',
    derived: '故障類型為系統依文字描述衍生分類，並非官方分類。',
    search: '搜尋查報序號、行政區、地點、故障情形或道路名稱',
    year: '年度',
    district: '行政區',
    issueType: '故障類型',
    urgentOnly: '僅顯示緊急字樣',
    all: '全部',
    records: '紀錄數',
    unique: '不重複查報序號數',
    dateRange: '日期範圍',
    latest: '最新查報日期',
    topDistrict: '紀錄最多行政區',
    topIssue: '最多故障類型',
    urgent: '緊急字樣紀錄數',
    invalidDistrict: '行政區無效或缺漏',
    missingIssue: '故障描述缺漏',
    byYear: '各年度路燈維修紀錄數',
    byMonth: '各月份路燈維修紀錄數',
    byDistrict: '各行政區路燈維修紀錄數',
    byIssue: '各故障類型紀錄數',
    byHour: '各小時查報紀錄數',
    roadNames: '常見道路名稱',
    table: '資料表',
    reportId: '查報序號',
    reportedAt: '查報日期',
    location: '查報地點',
    issue: '故障情形'
  },
  en: {
    title: 'Streetlight Repairs',
    subtitle: 'Explore Taipei streetlight repair report records by district, date, and issue description.',
    notice: 'Streetlight repair data does not provide official coordinates. The map shows district-level summaries and does not represent exact issue locations or real-time outage status.',
    disclaimer: 'Streetlight repair data is historical public data related to reported and repaired streetlight issues. It does not represent real-time outage status, whether an issue has already been fixed, repair performance, or road safety level. Actual streetlight issues, repair progress, and latest status should be verified with official authorities and reporting systems.',
    derived: 'Issue types are derived from text descriptions by the system and are not official categories.',
    search: 'Search report ID, district, location, issue description, or road name',
    year: 'Year',
    district: 'District',
    issueType: 'Issue type',
    urgentOnly: 'Urgent keyword only',
    all: 'All',
    records: 'Record count',
    unique: 'Unique report ID count',
    dateRange: 'Date range',
    latest: 'Latest report date',
    topDistrict: 'Top district by record count',
    topIssue: 'Most common issue type',
    urgent: 'Urgent keyword records',
    invalidDistrict: 'Invalid or missing district',
    missingIssue: 'Missing issue description',
    byYear: 'Streetlight repairs by year',
    byMonth: 'Streetlight repairs by month',
    byDistrict: 'Streetlight repairs by district',
    byIssue: 'Streetlight repairs by issue type',
    byHour: 'Streetlight records by hour',
    roadNames: 'Top road names',
    table: 'Data table',
    reportId: 'Report ID',
    reportedAt: 'Reported date',
    location: 'Reported location',
    issue: 'Issue description'
  }
};

export function StreetlightRepairs({ language }: { language: Language }) {
  const data = useStreetlightData();
  const t = copy[language];
  const [filters, setFilters] = useState({ year: 'all', district: 'all', issueType: 'all', urgentOnly: false, search: '' });
  const filtered = useMemo(() => filterRecords(data.records, filters), [data.records, filters]);
  const districtRows = useMemo(() => aggregateDistricts(filtered), [filtered]);
  const maxDistrict = Math.max(1, ...districtRows.map((row) => row.recordCount));
  const topDistrict = data.summary?.byDistrict[0];
  const topIssue = data.summary?.byIssueType.find((row) => row.count > 0);

  return (
    <>
      <section className="notice-band">
        <strong>{t.notice}</strong>
        <span>{t.disclaimer}</span>
        <span>{t.derived}</span>
      </section>

      <section className="workspace">
        <aside className="filters">
          <label>
            {t.year}
            <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
              <option value="all">{t.all}</option>
              {data.summary?.byYear.map((row) => <option key={row.year} value={row.year}>{row.year}</option>)}
            </select>
          </label>
          <label>
            {t.district}
            <select value={filters.district} onChange={(event) => setFilters({ ...filters, district: event.target.value })}>
              <option value="all">{t.all}</option>
              {TAIPEI_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <label>
            {t.issueType}
            <select value={filters.issueType} onChange={(event) => setFilters({ ...filters, issueType: event.target.value })}>
              <option value="all">{t.all}</option>
              {STREETLIGHT_ISSUE_TYPES.map((type) => <option key={type} value={type}>{issueLabels[language][type]}</option>)}
            </select>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={filters.urgentOnly} onChange={(event) => setFilters({ ...filters, urgentOnly: event.target.checked })} />
            {t.urgentOnly}
          </label>
          <label>
            {language === 'zh' ? '搜尋' : 'Search'}
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder={t.search} />
          </label>
        </aside>

        <section className="map-panel">
          <MapContainer center={[25.055, 121.55]} zoom={12} minZoom={10} scrollWheelZoom className="map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {districtRows.map((row) => (
              <CircleMarker key={row.district} center={[row.latitude, row.longitude]} radius={10 + (row.recordCount / maxDistrict) * 34} pathOptions={{ color: '#854d0e', fillColor: '#facc15', fillOpacity: 0.5, weight: 2 }}>
                <Popup>
                  <strong>{t.title}</strong>
                  <p>{row.district} · {row.recordCount.toLocaleString()} {t.records}</p>
                  <p>{t.urgent}: {row.urgentRecordCount.toLocaleString()}</p>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </section>
      </section>

      <section className="dashboard">
        <div className="section-heading">
          <h2>{t.title}</h2>
          <span>{data.loading ? '...' : `${filtered.length.toLocaleString()} ${t.records}`}</span>
        </div>
        <div className="summary-grid">
          <Summary label={t.records} value={(data.summary?.totalRecords ?? 0).toLocaleString()} />
          <Summary label={t.unique} value={(data.summary?.uniqueReportIdCount ?? 0).toLocaleString()} />
          <Summary label={t.dateRange} value={`${data.summary?.minReportedAt?.slice(0, 10) ?? '—'} - ${data.summary?.maxReportedAt?.slice(0, 10) ?? '—'}`} />
          <Summary label={t.latest} value={data.summary?.maxReportedAt?.slice(0, 10) ?? '—'} />
          <Summary label={t.topDistrict} value={topDistrict?.district ?? '—'} />
          <Summary label={t.topIssue} value={topIssue ? issueLabels[language][topIssue.issueType] : '—'} />
          <Summary label={t.urgent} value={(data.summary?.urgentRecordCount ?? 0).toLocaleString()} />
          <Summary label={t.invalidDistrict} value={(data.summary?.invalidDistrictCount ?? 0).toLocaleString()} />
          <Summary label={t.missingIssue} value={(data.summary?.missingIssueDescriptionCount ?? 0).toLocaleString()} />
        </div>
        <div className="chart-grid">
          <Bars title={t.byYear} rows={data.summary?.byYear.map((row) => ({ label: String(row.year), count: row.recordCount })) ?? []} />
          <Bars title={t.byMonth} rows={data.summary?.byMonth.slice(-24).map((row) => ({ label: row.periodKey, count: row.recordCount })) ?? []} />
          <Bars title={t.byDistrict} rows={data.summary?.byDistrict.map((row) => ({ label: row.district, count: row.recordCount })) ?? []} />
          <Bars title={t.byIssue} rows={data.summary?.byIssueType.map((row) => ({ label: issueLabels[language][row.issueType], count: row.count })) ?? []} />
          <Bars title={t.byHour} rows={data.summary?.byHour.map((row) => ({ label: String(row.hour), count: row.recordCount })) ?? []} />
          <Bars title={t.roadNames} rows={data.summary?.byRoadName.slice(0, 10).map((row) => ({ label: row.roadName, count: row.recordCount })) ?? []} />
        </div>
        <StreetlightTable records={filtered.slice(0, 100)} language={language} />
      </section>
    </>
  );
}

function filterRecords(records: StreetlightRepairRecord[], filters: { year: string; district: string; issueType: string; urgentOnly: boolean; search: string }) {
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

function aggregateDistricts(records: StreetlightRepairRecord[]) {
  return TAIPEI_DISTRICTS.map((district) => {
    const districtRecords = records.filter((record) => record.district === district);
    return { district, ...TAIPEI_DISTRICT_CENTROIDS[district], recordCount: districtRecords.length, urgentRecordCount: districtRecords.filter((record) => record.isUrgent).length };
  }).filter((row) => row.recordCount > 0);
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="summary-card"><span>{label}</span><strong>{value}</strong></div>;
}

function Bars({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="chart">
      <h3>{title}</h3>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div><i style={{ width: `${(row.count / max) * 100}%` }} /></div>
          <b>{row.count.toLocaleString()}</b>
        </div>
      ))}
    </section>
  );
}

function StreetlightTable({ records, language }: { records: StreetlightRepairRecord[]; language: Language }) {
  const t = copy[language];
  return (
    <section className="chart">
      <h3>{t.table}</h3>
      <div className="record-list streetlight-table">
        {records.map((record) => (
          <article key={record.id}>
            <div>
              <strong>{record.reportId}</strong>
              <span>{record.issueTypes.map((type) => issueLabels[language][type]).join(', ')}</span>
            </div>
            <p>{record.district ?? record.districtStatus} · {record.reportedLocationMasked ?? '—'}</p>
            <p>{record.issueDescription ?? '—'}</p>
            <time>{record.reportedDate ?? record.reportedAtRaw}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
