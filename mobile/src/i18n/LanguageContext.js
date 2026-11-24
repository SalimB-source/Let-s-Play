import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LANGS, TRANSLATIONS } from './translations';

const LANG_STORAGE_KEY = 'letsplay_mobile_lang';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('fr');

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY)
      .then((saved) => {
        if (SUPPORTED_LANGS.includes(saved)) setLangState(saved);
      })
      .catch(() => {});
  }, []);

  const setLang = (next) => {
    const normalized = SUPPORTED_LANGS.includes(next) ? next : 'fr';
    setLangState(normalized);
    AsyncStorage.setItem(LANG_STORAGE_KEY, normalized).catch(() => {});
  };

  const cycleLang = () => {
    const idx = SUPPORTED_LANGS.indexOf(lang);
    setLang(SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length]);
  };

  const isRTL = lang === 'ar';

  const value = useMemo(
    () => ({
      lang,
      setLang,
      cycleLang,
      isRTL,
      t: TRANSLATIONS[lang] || TRANSLATIONS.fr,
      textAlign: isRTL ? 'right' : 'left',
      rowDirection: isRTL ? 'row-reverse' : 'row',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    }),
    [lang, isRTL],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
