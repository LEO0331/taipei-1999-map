import type { Open1999ServiceGroup } from '../types/open1999';

export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    appTitle: '台北1999派工地圖',
    openData: '1999 公開資料',
    dataModule: '資料模組',
    mapMode: '地圖模式',
    search: '搜尋',
    weekday: '平日',
    weekend: '週末',
    topGroups: '主要服務類型',
    topItems: '主要派工項目',
    appSubtitle: '探索台北市政府1999派工案件的時間、行政區與類型分布',
    dispatch1999: '1999 派工',
    streetlightRepairs: '路燈維修',
    constructionAudits: '施工查核',
    stopResumeWork: '停復工資訊',
    streetlightSubtitle: '探索臺北市路燈維修查報紀錄，依行政區、日期與故障描述分類整理。',
    constructionAuditSubtitle: '整理臺北市政府工程施工查核公開資料，作為市政服務與公共工程監督背景資料。',
    stopResumeWorkSubtitle: '整理臺北市遭勞動檢查處處分停工案件公開資料，作為公共工程與勞動安全監督背景資料。',
    all: '全部',
    district: '行政區',
    serviceGroup: '服務類型',
    serviceItem: '派工項目',
    dateRange: '日期範圍',
    timePeriod: '時段',
    weekdayWeekend: '平日／週末',
    searchPlaceholder: '搜尋派工項目、行政區或地點',
    districtMap: '行政區分布',
    hotspotMap: '熱點地圖',
    listView: '清單',
    totalRequests: '派工案件數',
    topDistrict: '案件數最多行政區',
    topServiceGroup: '主要服務類型',
    topServiceItem: '主要派工項目',
    busiestDay: '案件數最多日期',
    busiestHour: '案件數最多時段',
    overview: '派工資料概覽',
    requestsByDay: '每日案件數',
    requestsByHour: '各小時案件數',
    requestsByDistrict: '各行政區案件數',
    requestsByServiceGroup: '各服務類型案件數',
    topServiceItems: '前十大派工項目',
    weekdayVsWeekend: '平日與週末',
    records: '筆紀錄',
    noData: '尚未載入資料',
    sourcePeriod: '資料期間',
    dataMinimizationNotice: '本網站僅呈現彙整或遮蔽後的位置資訊，不顯示完整住址。',
    dataDisclaimer: '本資料為1999派工案件紀錄，案件數不代表問題嚴重程度或即時狀態。',
    footer: '資料來源：臺北市公開資料中的1999市民服務案件、派工或維修相關資料、公共工程施工查核紀錄、停復工公開資訊與其他市政服務背景資料。資料僅供資料探索、歷史趨勢觀察與市政服務背景分析使用，不構成即時案件狀態、即時施工狀態、目前是否停工或復工、工程完成狀態、建物安全判定、施工安全保證、法律責任認定、公共安全警示、法律意見、保險建議、投資或不動產判斷。最新與正式資訊請以臺北市政府、各主管機關、1999市民熱線、勞動檢查處、裁罰公告及官方系統為準。',
    wasteCleaning: '廢棄物與清潔',
    noisePollution: '噪音',
    environmentPollution: '污染',
    roadTraffic: '道路與交通設施',
    streetlight: '路燈',
    water: '自來水',
    animal: '動物救援',
    treePark: '路樹與公園',
    drainageFlooding: '排水與積淹水',
    other: '其他'
  },
  en: {
    appTitle: 'Taipei 1999 Service Request Map',
    openData: '1999 Open Data',
    dataModule: 'Data module',
    mapMode: 'Map mode',
    search: 'Search',
    weekday: 'Weekday',
    weekend: 'Weekend',
    topGroups: 'Top service types',
    topItems: 'Top dispatch items',
    appSubtitle: 'Explore the time, district, and category distribution of Taipei 1999 dispatched service requests',
    dispatch1999: '1999 Dispatch',
    streetlightRepairs: 'Streetlight Repairs',
    constructionAudits: 'Construction Audits',
    stopResumeWork: 'Stop / Resume Work',
    streetlightSubtitle: 'Explore Taipei streetlight repair report records by district, date, and issue description.',
    constructionAuditSubtitle: 'Explore Taipei City Government public works construction audit records as civic service and public works oversight context.',
    stopResumeWorkSubtitle: 'Explore Taipei construction-site stop-work penalty public records as public works and labor-safety oversight context.',
    all: 'All',
    district: 'District',
    serviceGroup: 'Service Type',
    serviceItem: 'Dispatch Item',
    dateRange: 'Date Range',
    timePeriod: 'Time Period',
    weekdayWeekend: 'Weekday / Weekend',
    searchPlaceholder: 'Search service item, district, or location',
    districtMap: 'District Map',
    hotspotMap: 'Hotspot Map',
    listView: 'List',
    totalRequests: 'Service requests',
    topDistrict: 'Top district',
    topServiceGroup: 'Top service type',
    topServiceItem: 'Top dispatch item',
    busiestDay: 'Busiest day',
    busiestHour: 'Busiest hour',
    overview: 'Service Request Overview',
    requestsByDay: 'Requests by day',
    requestsByHour: 'Requests by hour',
    requestsByDistrict: 'Requests by district',
    requestsByServiceGroup: 'Requests by service type',
    topServiceItems: 'Top 10 dispatch items',
    weekdayVsWeekend: 'Weekday vs weekend',
    records: 'records',
    noData: 'No data loaded',
    sourcePeriod: 'Source period',
    dataMinimizationNotice: 'This site only shows aggregated or masked location information and does not display full residential addresses.',
    dataDisclaimer: 'This dataset records 1999 dispatched service requests. Counts do not represent severity or real-time status.',
    footer: 'Data sources: Taipei public-data records related to 1999 citizen-service cases, dispatch or repair-related records, public works construction audit records, construction stop / resume work records, and other civic-service context data. The data is for data exploration, historical trend observation, and civic-service context analysis only and does not constitute real-time case status, real-time construction status, whether a site is currently stopped or resumed, project completion status, building-safety determination, construction-safety guarantee, legal liability determination, public-safety alerts, legal advice, insurance advice, investment decisions, or real-estate decisions. Latest and official information should be verified with Taipei City Government, competent authorities, the 1999 citizen hotline, the Labor Inspection Office, penalty announcements, and official systems.',
    wasteCleaning: 'Waste & Cleaning',
    noisePollution: 'Noise',
    environmentPollution: 'Pollution',
    roadTraffic: 'Roads & Traffic Facilities',
    streetlight: 'Streetlights',
    water: 'Water',
    animal: 'Animal Rescue',
    treePark: 'Trees & Parks',
    drainageFlooding: 'Drainage & Flooding',
    other: 'Other'
  }
} as const;

export function serviceGroupLabel(group: Open1999ServiceGroup, language: Language): string {
  const keyByGroup: Record<Open1999ServiceGroup, keyof typeof translations.zh> = {
    waste_cleaning: 'wasteCleaning',
    noise_pollution: 'noisePollution',
    environment_pollution: 'environmentPollution',
    road_traffic: 'roadTraffic',
    streetlight: 'streetlight',
    water: 'water',
    animal: 'animal',
    tree_park: 'treePark',
    drainage_flooding: 'drainageFlooding',
    other: 'other'
  };
  return translations[language][keyByGroup[group]];
}

export function formatDate(value: string | undefined, language: Language): string {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || language === 'en') return value;
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

export function formatMonth(value: string | undefined, language: Language): string {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match || language === 'en') return value;
  return `${match[1]}年${Number(match[2])}月`;
}

export function formatQuarter(value: string | undefined, language: Language): string {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-Q([1-4])$/);
  if (!match || language === 'en') return value;
  return `${match[1]}年第${match[2]}季`;
}

export function formatHour(value: number, language: Language): string {
  return language === 'zh' ? `${value}時` : `${value}:00`;
}
