import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { aggregateByCategory, aggregateByDay, aggregateByDistrict, aggregateByHotspot, aggregateByHour, SERVICE_GROUPS, TAIPEI_DISTRICTS } from './lib/open1999';
import { formatDate, formatHour, serviceGroupLabel, translations, type Language } from './lib/i18n';
import { filterOpen1999Records } from './lib/filtering';
import { useOpen1999Data } from './hooks/useOpen1999Data';
import { StreetlightRepairs } from './components/StreetlightRepairs';
import { ConstructionAudits } from './components/ConstructionAudits';
import { StopResumeWork } from './components/StopResumeWork';
import type { Open1999Record, Open1999ServiceGroup } from './types/open1999';

type MapMode = 'district' | 'hotspot' | 'list';
type ActiveModule = 'open1999' | 'streetlight' | 'constructionAudit' | 'stopResumeWork';
type TimePeriod = 'all' | 'morning' | 'afternoon' | 'evening' | 'late';
type DayType = 'all' | 'weekday' | 'weekend';

type Filters = {
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

export function App() {
  const data = useOpen1999Data();
  const [language, setLanguage] = usePersistedLanguage();
  const [mode, setMode] = useState<MapMode>('district');
  const [activeModule, setActiveModule] = useState<ActiveModule>('open1999');
  const t = translations[language];
  const dateBounds = useMemo(() => getDateBounds(data.records), [data.records]);
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: '',
    district: 'all',
    serviceGroup: 'all',
    serviceItem: 'all',
    timePeriod: 'all',
    dayType: 'all',
    search: ''
  });

  const effectiveFilters = {
    ...filters,
    startDate: filters.startDate || dateBounds.start,
    endDate: filters.endDate || dateBounds.end
  };
  const filteredRecords = useMemo(() => filterOpen1999Records(data.records, effectiveFilters, language), [data.records, effectiveFilters, language]);
  const districtSummary = useMemo(() => aggregateByDistrict(filteredRecords), [filteredRecords]);
  const hotspotSummary = useMemo(() => aggregateByHotspot(filteredRecords).slice(0, 100), [filteredRecords]);
  const categorySummary = useMemo(() => aggregateByCategory(filteredRecords), [filteredRecords]);
  const daySummary = useMemo(() => aggregateByDay(filteredRecords), [filteredRecords]);
  const hourSummary = useMemo(() => aggregateByHour(filteredRecords), [filteredRecords]);
  const serviceItems = useMemo(() => uniqueServiceItems(data.records, filters.serviceGroup), [data.records, filters.serviceGroup]);
  const stats = useMemo(() => buildStats(filteredRecords, language), [filteredRecords, language]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'serviceGroup' ? { serviceItem: 'all' } : {}) }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="kicker">{t.openData}</p>
          <h1>{t.appTitle}</h1>
          <p>{activeModule === 'streetlight' ? t.streetlightSubtitle : activeModule === 'constructionAudit' ? t.constructionAuditSubtitle : activeModule === 'stopResumeWork' ? t.stopResumeWorkSubtitle : t.appSubtitle}</p>
        </div>
        <button className="language-toggle" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')} type="button">
          {language === 'zh' ? 'EN' : '繁中'}
        </button>
      </header>

      <main>
        <div className="mode-toggle module-toggle" role="tablist" aria-label={t.dataModule}>
          <button className={activeModule === 'open1999' ? 'active' : ''} onClick={() => setActiveModule('open1999')} type="button">
            {t.dispatch1999}
          </button>
          <button className={activeModule === 'streetlight' ? 'active' : ''} onClick={() => setActiveModule('streetlight')} type="button">
            {t.streetlightRepairs}
          </button>
          <button className={activeModule === 'constructionAudit' ? 'active' : ''} onClick={() => setActiveModule('constructionAudit')} type="button">
            {t.constructionAudits}
          </button>
          <button className={activeModule === 'stopResumeWork' ? 'active' : ''} onClick={() => setActiveModule('stopResumeWork')} type="button">
            {t.stopResumeWork}
          </button>
        </div>

        {activeModule === 'stopResumeWork' ? (
          <StopResumeWork language={language} />
        ) : activeModule === 'constructionAudit' ? (
          <ConstructionAudits language={language} />
        ) : activeModule === 'streetlight' ? (
          <StreetlightRepairs language={language} />
        ) : (
          <>
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

        <section className="dashboard">
          <div className="section-heading">
            <h2>{t.overview}</h2>
            <span>
              {data.loading ? t.noData : `${filteredRecords.length.toLocaleString()} ${t.records}`}
              {data.report?.period ? ` · ${t.sourcePeriod}: ${formatDate(data.report.period.start, language)} - ${formatDate(data.report.period.end, language)}` : ''}
            </span>
          </div>
          <div className="summary-grid">
            <SummaryCard label={t.totalRequests} value={filteredRecords.length.toLocaleString()} />
            <SummaryCard label={t.topDistrict} value={stats.topDistrict} />
            <SummaryCard label={t.topServiceGroup} value={stats.topGroup} />
            <SummaryCard label={t.topServiceItem} value={stats.topItem} />
            <SummaryCard label={t.busiestDay} value={stats.busiestDay} />
            <SummaryCard label={t.busiestHour} value={stats.busiestHour} />
          </div>
          <div className="chart-grid">
            <BarChart title={t.requestsByDay} rows={daySummary.slice(-31).map((row) => ({ label: formatDate(row.date, language), count: row.count }))} />
            <BarChart title={t.requestsByHour} rows={hourSummary.map((row) => ({ label: formatHour(row.hour, language), count: row.count }))} compact />
            <BarChart title={t.requestsByDistrict} rows={districtSummary.map((row) => ({ label: row.district, count: row.totalCount }))} />
            <BarChart title={t.requestsByServiceGroup} rows={categorySummary.map((row) => ({ label: serviceGroupLabel(row.serviceGroup, language), count: row.totalCount }))} />
            <BarChart title={t.topServiceItems} rows={topServiceItems(filteredRecords).slice(0, 10)} />
            <BarChart
              title={t.weekdayVsWeekend}
              rows={[
                { label: t.weekday, count: filteredRecords.filter((record) => record.weekday > 0 && record.weekday < 6).length },
                { label: t.weekend, count: filteredRecords.filter((record) => record.weekday === 0 || record.weekday === 6).length }
              ]}
            />
          </div>
        </section>
          </>
        )}
      </main>

      <footer>{t.footer}</footer>
    </div>
  );
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

function usePersistedLanguage(): [Language, (language: Language) => void] {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('language') === 'en' ? 'en' : 'zh'));
  const setLanguage = (next: Language) => {
    localStorage.setItem('language', next);
    setLanguageState(next);
  };
  return [language, setLanguage];
}

function getDateBounds(records: Open1999Record[]): { start: string; end: string } {
  const dates = records.map((record) => record.createdDate).sort();
  const today = new Date().toISOString().slice(0, 10);
  return { start: dates[0] ?? today, end: dates[dates.length - 1] ?? today };
}

function uniqueServiceItems(records: Open1999Record[], group: Filters['serviceGroup']): string[] {
  return [...new Set(records.filter((record) => group === 'all' || record.serviceGroup === group).map((record) => record.serviceItem))].sort();
}

function topServiceItems(records: Open1999Record[]): Array<{ label: string; count: number }> {
  const counts: Record<string, number> = {};
  records.forEach((record) => {
    counts[record.serviceItem] = (counts[record.serviceItem] ?? 0) + 1;
  });
  return topEntries(counts, 999).map(([label, count]) => ({ label, count }));
}

function buildStats(records: Open1999Record[], language: Language) {
  const districts = aggregateByDistrict(records);
  const categories = aggregateByCategory(records)
    .filter((category) => category.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);
  const items = topServiceItems(records);
  const days = aggregateByDay(records).sort((a, b) => b.count - a.count);
  const hours = aggregateByHour(records).sort((a, b) => b.count - a.count);
  return {
    topDistrict: districts[0]?.district ?? '—',
    topGroup: categories[0] ? serviceGroupLabel(categories[0].serviceGroup, language) : '—',
    topItem: items[0]?.label ?? '—',
    busiestDay: formatDate(days[0]?.date, language),
    busiestHour: hours[0] ? formatHour(hours[0].hour, language) : '—'
  };
}

function topEntries<T extends string>(record: Record<T, number>, limit: number): Array<[T, number]> {
  return (Object.entries(record) as Array<[T, number]>).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, limit);
}
