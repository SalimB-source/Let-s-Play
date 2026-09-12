import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations, languages } from './translations';

const STORAGE_KEY = 'letsplay-lang';

// Dictionary used as the safety net when a key has not been translated yet.
const BASE_LANG = 'en';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-merges a language dictionary on top of the base dictionary so that any
 * key missing from a translation falls back to the base language instead of
 * being `undefined`.
 *
 * Without this, a partially translated dictionary crashes every page that reads
 * the missing key (`t.news.million.coverAlt` throws when `t.news.million` is
 * undefined), which is exactly how the News page went blank for FR / AR.
 */
function withBaseFallback(dict, base, path = '') {
  if (!isPlainObject(dict)) return dict;
  const hasBase = isPlainObject(base);
  const merged = {};
  // Walk the union of both key sets so keys absent from `dict` are inherited.
  const keys = new Set([...Object.keys(dict), ...(hasBase ? Object.keys(base) : [])]);
  for (const key of keys) {
    const value = dict[key];
    const fallback = hasBase ? base[key] : undefined;
    const keyPath = path ? `${path}.${key}` : key;

    if (isPlainObject(value) && isPlainObject(fallback)) {
      merged[key] = withBaseFallback(value, fallback, keyPath);
    } else if (value === undefined || value === null || value === '') {
      if (fallback === undefined) {
        merged[key] = value;
        continue;
      }
      if (import.meta.env?.DEV) {
        console.warn(`[i18n] "${keyPath}" is not translated — falling back to "${BASE_LANG}"`);
      }
      merged[key] = fallback;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function buildDictionary(lang) {
  const dict = translations[lang];
  const base = translations[BASE_LANG];
  if (!dict) return base;
  if (!base || lang === BASE_LANG) return dict;
  return withBaseFallback(dict, base);
}

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
    t: buildDictionary(lang),
    languages,
  }), [lang, meta.dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
