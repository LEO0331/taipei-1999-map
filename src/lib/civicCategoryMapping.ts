import { normalizeServiceItem } from './open1999';

export const CIVIC_MAPPING_VERSION = 'civic-exact-items-1.0.0';
export const CIVIC_TOPICS = [
  { id: 'waste_cleaning', zh: '廢棄物與清潔服務', en: 'Waste and sanitation', items: ['大型廢棄物清運聯繫', '鄰里無主垃圾清運'], rationale: 'Recorded collection requests; bulky-waste collection does not establish illegal dumping or a hazard.' },
  { id: 'environment_pollution', zh: '污染相關派工', en: 'Pollution-related dispatch', items: ['污染舉發'], rationale: 'Broad pollution reporting; no pollutant, severity or rodent finding is established.' },
  { id: 'noise_pollution', zh: '噪音舉發', en: 'Noise reports', items: ['場所與設施噪音舉發'], rationale: 'Recorded facility-noise dispatch activity; not a verified exposure measurement.' },
  { id: 'road_cleaning', zh: '道路與公共空間維護', en: 'Road and public-space maintenance', items: ['道路散落物或油漬處理', '市區道路坑洞處理'], rationale: 'Explicit road maintenance items; unrelated transport and animal-rescue categories are excluded.' },
  { id: 'drainage', zh: '排水與環境維護', en: 'Drainage maintenance', items: ['雨水下水道側溝清淤', '路面積淹水'], rationale: 'Recorded drain cleaning and surface-water reports; does not establish health risk.' }
];

/** Exact reviewed labels only: new terminology requires a mapping revision. */
export function classifyCivicItem(item: string): string | undefined {
  const normalized = normalizeServiceItem(item);
  return CIVIC_TOPICS.find((topic) => topic.items.includes(normalized))?.id;
}
