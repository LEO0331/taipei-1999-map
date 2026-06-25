export type ServiceDataModule = 'open_1999_dispatch' | 'streetlight_repair';

export type StreetlightIssueType =
  | 'light_out'
  | 'always_on'
  | 'wire_or_electrical'
  | 'pole_or_fixture_damage'
  | 'cover_or_lamp_damage'
  | 'multiple_lights'
  | 'urgent'
  | 'unclear'
  | 'other';

export type DistrictStatus = 'valid' | 'normalized' | 'missing' | 'invalid' | 'outside_taipei';

export type StreetlightRepairRecord = {
  id: string;
  module: 'streetlight_repair';
  sourceFileName?: string;
  reportId: string;
  districtRaw?: string;
  district?: string;
  districtStatus: DistrictStatus;
  reportedLocation?: string;
  reportedLocationMasked?: string;
  roadName?: string;
  issueDescription?: string;
  issueTypes: StreetlightIssueType[];
  isUrgent: boolean;
  reportedAtRaw: string;
  reportedAt?: string;
  reportedYear?: number;
  reportedMonth?: number;
  reportedDate?: string;
  reportedHour?: number;
  reportedWeekday?: number;
  isWeekend?: boolean;
  source: string;
  sourceAgency: string;
};

export type StreetlightRepairSummary = {
  totalRecords: number;
  uniqueReportIdCount: number;
  minReportedAt?: string;
  maxReportedAt?: string;
  yearCount: number;
  districtCount: number;
  invalidDistrictCount: number;
  missingLocationCount: number;
  missingIssueDescriptionCount: number;
  urgentRecordCount: number;
  byYear: Array<{ year: number; recordCount: number }>;
  byMonth: Array<{ periodKey: string; year: number; month: number; recordCount: number; urgentRecordCount: number }>;
  byDistrict: Array<{
    district: string;
    latitude: number;
    longitude: number;
    recordCount: number;
    urgentRecordCount: number;
    topIssueTypes: Array<{ issueType: StreetlightIssueType; count: number }>;
  }>;
  byIssueType: Array<{ issueType: StreetlightIssueType; count: number }>;
  byHour: Array<{ hour: number; recordCount: number }>;
  byWeekday: Array<{ weekday: number; recordCount: number }>;
  byRoadName: Array<{ roadName: string; recordCount: number }>;
};

export type ServiceRecordsSummary = {
  open1999DispatchRecordCount: number;
  streetlightRepairRecordCount: number;
  streetlightRelated1999Count: number;
  top1999ServiceGroup?: string;
  topStreetlightIssueType?: StreetlightIssueType;
};
