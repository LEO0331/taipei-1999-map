export type Open1999ServiceGroup =
  | 'waste_cleaning'
  | 'noise_pollution'
  | 'environment_pollution'
  | 'road_traffic'
  | 'streetlight'
  | 'water'
  | 'animal'
  | 'tree_park'
  | 'drainage_flooding'
  | 'other';

export type Open1999Record = {
  id: string;
  caseId: string;
  serviceItem: string;
  serviceGroup: Open1999ServiceGroup;
  originalAddress?: string;
  displayLocation: string;
  district?: string;
  road?: string;
  createdDate: string;
  createdTime: string;
  createdAt: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  sourceFile: string;
};

export type Open1999DistrictSummary = {
  district: string;
  latitude: number;
  longitude: number;
  totalCount: number;
  byServiceGroup: Record<Open1999ServiceGroup, number>;
  byServiceItem: Record<string, number>;
};

export type Open1999Hotspot = {
  id: string;
  district: string;
  displayLocation: string;
  latitude?: number;
  longitude?: number;
  totalCount: number;
  byServiceGroup: Record<Open1999ServiceGroup, number>;
  byServiceItem: Record<string, number>;
  years: number[];
  months: string[];
};

export type Open1999CategorySummary = {
  serviceGroup: Open1999ServiceGroup;
  totalCount: number;
  byServiceItem: Record<string, number>;
};

export type Open1999TimeSummary = {
  byDay: Array<{ date: string; count: number }>;
  byHour: Array<{ hour: number; count: number }>;
  byMonth: Array<{ month: string; count: number }>;
  weekdayVsWeekend: Array<{ type: 'weekday' | 'weekend'; count: number }>;
};

export type ConversionReport = {
  generatedAt: string;
  sourceFiles: string[];
  inputRecords: number;
  outputRecords: number;
  skippedRecords: number;
  period?: { start: string; end: string };
  notes: string[];
};
