import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageSwitcher({ variant = 'nav' }) {
  const { lang, setLang, languages, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = languages.find((l) => l.code === lang) || languages[0];

  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (code) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div className={`lang-switch lang-switch-${variant}`} ref={rootRef}>
      <button
        type="button"
        className="lang-switch-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.nav.langAria}
      >
        <span aria-hidden="true" className="lang-switch-icon">◈</span>
        {current.label}
      </button>
      <div className={open ? 'lang-switch-menu open' : 'lang-switch-menu'} role="listbox">
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            role="option"
            aria-selected={l.code === lang}
            className={l.code === lang ? 'lang-switch-option active' : 'lang-switch-option'}
            onClick={() => choose(l.code)}
          >
            <span className="lang-switch-code">{l.label}</span>
            <span className="lang-switch-name">{l.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
