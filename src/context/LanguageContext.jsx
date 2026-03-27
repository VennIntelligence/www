import { createContext, useEffect, useState } from 'react';

export const LanguageContext = createContext(null);

const LANGUAGE_STORAGE_KEY = 'vennai-lang';

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage === 'en' || storedLanguage === 'zh') {
    return storedLanguage;
  }

  return window.navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function applyDocumentLanguage(lang) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.dataset.language = lang;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const setLang = (nextLanguage) => {
    if ((nextLanguage !== 'en' && nextLanguage !== 'zh') || nextLanguage === lang) {
      return;
    }

    setLangState(nextLanguage);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
