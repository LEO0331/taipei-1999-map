import { useState } from 'react';
import { translations, type Language } from './lib/i18n';
import { Open1999, defaultOpen1999Filters, type MapMode } from './components/Open1999';
import { StreetlightRepairs } from './components/StreetlightRepairs';
import { ConstructionAudits } from './components/ConstructionAudits';
import { StopResumeWork } from './components/StopResumeWork';

type ActiveModule = 'open1999' | 'streetlight' | 'constructionAudit' | 'stopResumeWork';

export function App() {
  const [language, setLanguage] = usePersistedLanguage();
  const [activeModule, setActiveModule] = useState<ActiveModule>('open1999');
  const [filters, setFilters] = useState(defaultOpen1999Filters);
  const [mode, setMode] = useState<MapMode>('district');
  const t = translations[language];
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

        {activeModule === 'stopResumeWork' ? <StopResumeWork language={language} />
          : activeModule === 'constructionAudit' ? <ConstructionAudits language={language} />
          : activeModule === 'streetlight' ? <StreetlightRepairs language={language} />
          : <Open1999 language={language} filters={filters} setFilters={setFilters} mode={mode} setMode={setMode} />}
      </main>
      <footer>{t.footer}</footer>
    </div>
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
