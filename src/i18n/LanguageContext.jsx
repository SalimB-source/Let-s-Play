import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations, languages } from './translations';

const STORAGE_KEY = 'letsplay-lang';

function detectInitialLang() {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) return stored;
  } catch (e) { /* ignore */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  if (translations[nav]) return nav;
  return 'en';
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  const meta = languages.find((l) => l.code === lang) || languages[0];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }, [lang, meta.dir]);

  const setLang = (code) => {
    if (translations[code]) setLangState(code);
  };

  const value = useMemo(() => ({
    lang,
    dir: meta.dir,
    setLang,
    t: translations[lang],
    languages,
  }), [lang, meta.dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
