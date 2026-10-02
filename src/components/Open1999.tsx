import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { aggregateByCategory, aggregateByDay, aggregateByDistrict, aggregateByHotspot, aggregateByHour, SERVICE_GROUPS, TAIPEI_DISTRICTS } from '../lib/open1999';
import { formatDate, formatHour, serviceGroupLabel, translations, type Language } from '../lib/i18n';
import { filterOpen1999Records } from '../lib/filtering';
import { useOpen1999Data } from '../hooks/useOpen1999Data';
import { DataLoading } from './DataLoading';
import type { Open1999Record, Open1999ServiceGroup } from '../types/open1999';


export type MapMode = 'district' | 'hotspot' | 'list';
type TimePeriod = 'all' | 'morning' | 'afternoon' | 'evening' | 'late';
type DayType = 'all' | 'weekday' | 'weekend';

export type Filters = {
  startDate: string;
  endDate: string;
  district: string;
  serviceGroup: 'all' | Open1999ServiceGroup;
  serviceItem: string;
  timePeriod: TimePeriod;
  dayType: DayType;
  search: string;
};

const timePeriods: Array<{ value: TimePeriod; zh: string; en: string }> = [
  { value: 'all', zh: '全部', en: 'All day' },
  { value: 'morning', zh: '上午 06:00-11:59', en: 'Morning 06:00-11:59' },
  { value: 'afternoon', zh: '下午 12:00-16:59', en: 'Afternoon 12:00-16:59' },
  { value: 'evening', zh: '晚間 17:00-20:59', en: 'Evening 17:00-20:59' },
  { value: 'late', zh: '深夜 21:00-05:59', en: 'Late night 21:00-05:59' }
];

export const defaultOpen1999Filters: Filters = { startDate: '', endDate: '', district: 'all', serviceGroup: 'all', serviceItem: 'all', timePeriod: 'all', dayType: 'all', search: '' };

export function Open1999({ language, filters, setFilters, mode, setMode }: { language: Language; filters: Filters; setFilters: Dispatch<SetStateAction<Filters>>; mode: MapMode; setMode: Dispatch<SetStateAction<MapMode>> }) {
  const t = translations[language];
  const fullRecords = Boolean(filters.startDate || filters.endDate || filters.district !== 'all' || filters.serviceGroup !== 'all' || filters.serviceItem !== 'all' || filters.timePeriod !== 'all' || filters.dayType !== 'all' || filters.search.trim());
  const data = useOpen1999Data(fullRecords, filters.startDate, filters.endDate);
  const dateBounds = { start: data.report?.period?.start.slice(0, 10) ?? '', end: data.report?.period?.end.slice(0, 10) ?? '' };
  const effectiveFilters = useMemo(() => ({ ...filters, startDate: filters.startDate || dateBounds.start, endDate: filters.endDate || dateBounds.end }), [filters, dateBounds.start, dateBounds.end]);
  const filteredRecords = useMemo(() => filterOpen1999Records(data.records, effectiveFilters, language), [data.records, effectiveFilters, language]);
  const districtSummary = useMemo(() => fullRecords ? aggregateByDistrict(filteredRecords) : data.districts, [fullRecords, filteredRecords, data.districts]);
  const hotspotSummary = useMemo(() => fullRecords ? aggregateByHotspot(filteredRecords).slice(0, 100) : data.hotspots, [fullRecords, filteredRecords, data.hotspots]);
  const categorySummary = useMemo(() => fullRecords ? aggregateByCategory(filteredRecords) : data.categories, [fullRecords, filteredRecords, data.categories]);
  const daySummary = useMemo(() => fullRecords ? aggregateByDay(filteredRecords) : data.time?.byDay ?? [], [fullRecords, filteredRecords, data.time]);
  const hourSummary = useMemo(() => fullRecords ? aggregateByHour(filteredRecords) : data.time?.byHour ?? [], [fullRecords, filteredRecords, data.time]);
  const serviceItems = useMemo(() => [...new Set(data.categories.filter((row) => filters.serviceGroup === 'all' || row.serviceGroup === filters.serviceGroup).flatMap((row) => Object.keys(row.byServiceItem)))].sort(), [data.categories, filters.serviceGroup]);
  const items = useMemo(() => fullRecords ? topServiceItems(filteredRecords) : summaryServiceItems(data.categories), [fullRecords, filteredRecords, data.categories]);
  const stats = {
    topDistrict: districtSummary[0]?.district ?? '—',
    topGroup: [...categorySummary].sort((a, b) => b.totalCount - a.totalCount).find((row) => row.totalCount > 0)?.serviceGroup,
    topItem: items[0]?.label ?? '—',
    busiestDay: formatDate([...daySummary].sort((a, b) => b.count - a.count)[0]?.date, language),
    busiestHour: hourSummary.length ? formatHour([...hourSummary].sort((a, b) => b.count - a.count)[0].hour, language) : '—'
  };
  const totalRecords = fullRecords ? filteredRecords.length : data.report?.outputRecords;
  const weekdayRows = fullRecords ? [
    { type: 'weekday', count: filteredRecords.filter((record) => record.weekday > 0 && record.weekday < 6).length },
    { type: 'weekend', count: filteredRecords.filter((record) => record.weekday === 0 || record.weekday === 6).length }
  ] : data.time?.weekdayVsWeekend ?? [];

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'serviceGroup' ? { serviceItem: 'all' } : {}) }));
  }

  return (<>
        <DataLoading loading={data.loading} error={data.error} retry={data.retry} language={language} />
        <section className="notice-band">
          <strong>{t.dataMinimizationNotice}</strong>
          <span>{t.dataDisclaimer}</span>
        </section>

        <section className="workspace">
          <aside className="filters">
            <label>
              {t.dateRange}
              <span className="date-row">
                <input type="date" value={effectiveFilters.startDate} min={dateBounds.start} max={dateBounds.end} onChange={(event) => updateFilter('startDate', event.target.value)} />
                <input type="date" value={effectiveFilters.endDate} min={dateBounds.start} max={dateBounds.end} onChange={(event) => updateFilter('endDate', event.target.value)} />
              </span>
            </label>
            <label>
              {t.district}
              <select value={filters.district} onChange={(event) => updateFilter('district', event.target.value)}>
                <option value="all">{t.all}</option>
                {TAIPEI_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.serviceGroup}
              <select value={filters.serviceGroup} onChange={(event) => updateFilter('serviceGroup', event.target.value as Filters['serviceGroup'])}>
                <option value="all">{t.all}</option>
                {SERVICE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {serviceGroupLabel(group, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.serviceItem}
              <select value={filters.serviceItem} onChange={(event) => updateFilter('serviceItem', event.target.value)}>
                <option value="all">{t.all}</option>
                {serviceItems.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.timePeriod}
              <select value={filters.timePeriod} onChange={(event) => updateFilter('timePeriod', event.target.value as TimePeriod)}>
                {timePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period[language]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.weekdayWeekend}
              <select value={filters.dayType} onChange={(event) => updateFilter('dayType', event.target.value as DayType)}>
                <option value="all">{t.all}</option>
                <option value="weekday">{language === 'zh' ? '平日' : 'Weekday'}</option>
                <option value="weekend">{language === 'zh' ? '週末' : 'Weekend'}</option>
              </select>
            </label>
            <label>
              {t.search}
              <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder={t.searchPlaceholder} />
            </label>
          </aside>

          <section className="map-panel">
            <div className="mode-toggle" role="tablist" aria-label={t.mapMode}>
              {[
                ['district', t.districtMap],
                ['hotspot', t.hotspotMap],
                ['list', t.listView]
              ].map(([value, label]) => (
                <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value as MapMode)} type="button">
                  {label}
                </button>
              ))}
            </div>
            {mode === 'list' ? (
              <RecordList records={filteredRecords} language={language} />
            ) : (
              <Open1999Map mode={mode} districts={districtSummary} hotspots={hotspotSummary} language={language} period={`${formatDate(effectiveFilters.startDate, language)} - ${formatDate(effectiveFilters.endDate, language)}`} />
            )}
          </section>
        </section>

        <section className="dashboard" hidden={data.loading || Boolean(data.error)}>
          <div className="section-heading">
            <h2>{t.overview}</h2>
            <span>
              {data.loading && fullRecords ? '…' : `${totalRecords?.toLocaleString() ?? '…'} ${t.records}`}
              {data.report?.period ? ` · ${t.sourcePeriod}: ${formatDate(data.report.period.start, language)} - ${formatDate(data.report.period.end, language)}` : ''}
            </span>
          </div>
          <div className="summary-grid">
            <SummaryCard label={t.totalRequests} value={data.recordsLoading && fullRecords ? '…' : totalRecords?.toLocaleString() ?? '…'} />
            <SummaryCard label={t.topDistrict} value={stats.topDistrict} />
            <SummaryCard label={t.topServiceGroup} value={stats.topGroup ? serviceGroupLabel(stats.topGroup, language) : '—'} />
            <SummaryCard label={t.topServiceItem} value={stats.topItem} />
            <SummaryCard label={t.busiestDay} value={stats.busiestDay} />
            <SummaryCard label={t.busiestHour} value={stats.busiestHour} />
          </div>
          <div className="chart-grid">
            <BarChart title={t.requestsByDay} rows={daySummary.slice(-31).map((row) => ({ label: formatDate(row.date, language), count: row.count }))} />
            <BarChart title={t.requestsByHour} rows={hourSummary.map((row) => ({ label: formatHour(row.hour, language), count: row.count }))} compact />
            <BarChart title={t.requestsByDistrict} rows={districtSummary.map((row) => ({ label: row.district, count: row.totalCount }))} />
            <BarChart title={t.requestsByServiceGroup} rows={categorySummary.map((row) => ({ label: serviceGroupLabel(row.serviceGroup, language), count: row.totalCount }))} />
            <BarChart title={t.topServiceItems} rows={items.slice(0, 10)} />
            <BarChart
              title={t.weekdayVsWeekend}
              rows={weekdayRows.map((row) => ({ label: row.type === 'weekday' ? t.weekday : t.weekend, count: row.count }))}
            />
          </div>
        </section>
  </>);
}

function Open1999Map({ mode, districts, hotspots, language, period }: { mode: MapMode; districts: ReturnType<typeof aggregateByDistrict>; hotspots: ReturnType<typeof aggregateByHotspot>; language: Language; period: string }) {
  const max = Math.max(1, ...districts.map((district) => district.totalCount), ...hotspots.map((hotspot) => hotspot.totalCount));
  return (
    <MapContainer center={[25.055, 121.55]} zoom={12} minZoom={10} scrollWheelZoom className="map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {mode === 'district' &&
        districts.map((district) => (
          <CircleMarker key={district.district} center={[district.latitude, district.longitude]} radius={10 + (district.totalCount / max) * 34} pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.48, weight: 2 }}>
            <Popup>
              <PopupContent title={district.district} count={district.totalCount} groups={district.byServiceGroup} items={district.byServiceItem} language={language} period={period} />
            </Popup>
          </CircleMarker>
        ))}
      {mode === 'hotspot' &&
        hotspots.map((hotspot) => (
          <CircleMarker key={hotspot.id} center={[hotspot.latitude ?? 25.055, hotspot.longitude ?? 121.55]} radius={6 + (hotspot.totalCount / max) * 22} pathOptions={{ color: '#be123c', fillColor: '#fb7185', fillOpacity: 0.42, weight: 2 }}>
            <Popup>
              <PopupContent title={hotspot.displayLocation} count={hotspot.totalCount} groups={hotspot.byServiceGroup} items={hotspot.byServiceItem} language={language} period={period} />
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

function PopupContent({ title, count, groups, items, language, period }: { title: string; count: number; groups: Record<Open1999ServiceGroup, number>; items: Record<string, number>; language: Language; period: string }) {
  return (
    <div className="popup-content">
      <strong>{title}</strong>
      <span>{count.toLocaleString()} {translations[language].records}</span>
      <small>{period}</small>
      <strong>{translations[language].topGroups}</strong>
      <ol>
        {topEntries(groups, 3).map(([group, value]) => (
          <li key={group}>{serviceGroupLabel(group as Open1999ServiceGroup, language)} · {value}</li>
        ))}
      </ol>
      <strong>{translations[language].topItems}</strong>
      <ol>
        {topEntries(items, 5).map(([item, value]) => (
          <li key={item}>{item} · {value}</li>
        ))}
      </ol>
    </div>
  );
}

function RecordList({ records, language }: { records: Open1999Record[]; language: Language }) {
  return (
    <div className="record-list">
      {records.slice(0, 300).map((record) => (
        <article key={record.id}>
          <div>
            <strong>{record.serviceItem}</strong>
            <span>{serviceGroupLabel(record.serviceGroup, language)}</span>
          </div>
          <p>{record.district ?? '—'} · {record.displayLocation}</p>
      <time>{formatDate(record.createdDate, language)} {record.createdTime.slice(0, 5)}</time>
        </article>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function BarChart({ title, rows, compact = false }: { title: string; rows: Array<{ label: string; count: number }>; compact?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className={`chart ${compact ? 'compact' : ''}`}>
      <h3>{title}</h3>
      <div>
        {rows.map((row) => (
          <div className="bar-row" key={row.label}>
            <span>{row.label}</span>
            <div><i style={{ width: `${(row.count / max) * 100}%` }} /></div>
            <b>{row.count.toLocaleString()}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function topServiceItems(records: Open1999Record[]): Array<{ label: string; count: number }> {
  const counts: Record<string, number> = {};
  records.forEach((record) => {
    counts[record.serviceItem] = (counts[record.serviceItem] ?? 0) + 1;
  });
  return topEntries(counts, 999).map(([label, count]) => ({ label, count }));
}

function summaryServiceItems(categories: ReturnType<typeof aggregateByCategory>) {
  const counts: Record<string, number> = {};
  categories.forEach((category) => Object.entries(category.byServiceItem).forEach(([item, count]) => { counts[item] = (counts[item] ?? 0) + count; }));
  return topEntries(counts, 999).map(([label, count]) => ({ label, count }));
}

function topEntries<T extends string>(record: Record<T, number>, limit: number): Array<[T, number]> {
  return (Object.entries(record) as Array<[T, number]>).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, limit);
}
