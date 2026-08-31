import { describe, expect, it } from 'vitest';
import { formatDate, formatHour, formatMonth, formatQuarter, translations } from '../src/lib/i18n';

describe('localized display formatting', () => {
  it('formats dates, months, quarters, and hours for Chinese users', () => {
    expect(formatDate('2026-03-31', 'zh')).toBe('2026年3月31日');
    expect(formatMonth('2026-03', 'zh')).toBe('2026年3月');
    expect(formatQuarter('2026-Q1', 'zh')).toBe('2026年第1季');
    expect(formatHour(9, 'zh')).toBe('9時');
  });

  it('keeps the English display format separate', () => {
    expect(formatDate('2026-03-31', 'en')).toBe('2026-03-31');
    expect(formatMonth('2026-03', 'en')).toBe('2026-03');
    expect(formatQuarter('2026-Q1', 'en')).toBe('2026-Q1');
    expect(formatHour(9, 'en')).toBe('9:00');
  });

  it('does not expose the English app kicker in Chinese mode', () => {
    expect(translations.zh.openData).toBe('1999 公開資料');
    expect(translations.zh.dataModule).toBe('資料模組');
    expect(translations.zh.mapMode).toBe('地圖模式');
  });
});
