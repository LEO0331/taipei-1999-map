import type { Language } from '../lib/i18n';

export function DataLoading({ loading, error, retry, language }: { loading: boolean; error?: string; retry: () => void; language: Language }) {
  if (error) return <p role="alert">{language === 'zh' ? '資料載入失敗，請重試。' : 'Data could not be loaded. Please retry.'} <button type="button" onClick={retry}>{language === 'zh' ? '重試' : 'Retry'}</button></p>;
  if (loading) return <p role="status">{language === 'zh' ? '正在載入資料…' : 'Loading data…'}</p>;
  return null;
}
