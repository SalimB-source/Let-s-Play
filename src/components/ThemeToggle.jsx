import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Bascule clair / sombre — version morphing.
 * Les deux icônes coexistent et se transforment l'une en l'autre
 * (rotation + scale + opacité) pour un effet premium.
 */

function SunIcon() {
  return (
    <svg
      className="theme-toggle-icon theme-toggle-icon-sun"
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 .9v2.1M8 13v2.1M.9 8h2.1M13 8h2.1M2.98 2.98l1.5 1.5M11.52 11.52l1.5 1.5M13.02 2.98l-1.5 1.5M4.48 11.52l-1.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="theme-toggle-icon theme-toggle-icon-moon"
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M13.4 10.2A5.9 5.9 0 0 1 5.8 2.6a5.9 5.9 0 1 0 7.6 7.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle() {
  const { isLight, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const copy = t.nav.theme || {};
  const label = isLight ? copy.toDark || 'Switch to dark' : copy.toLight || 'Switch to light';
  const short = isLight ? copy.dark || 'Dark' : copy.light || 'Light';

  return (
    <button
      type="button"
      className={`theme-toggle ${isLight ? 'is-light' : 'is-dark'}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <SunIcon />
        <MoonIcon />
      </span>
      <span className="theme-toggle-label">{short}</span>
    </button>
  );
}
