import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { viceCopy } from '../theme/viceTheme';

/**
 * Bascule clair / sombre — version morphing.
 * Les deux icônes coexistent et se transforment l'une en l'autre
 * (rotation + scale + opacité) pour un effet premium.
 *
 * Depuis le passage en habillage « Vice City » (thème `vice`, voir
 * src/theme/vice.css), le bouton porte LE RETOUR au thème normal : quand la
 * peau est active, il affiche une néon rose + le libellé « Retour », et un clic
 * rend au site son apparence d'origine. C'est le seul chemin de sortie
 * nécessaire — la peau est temporaire, elle ne doit jamais piéger le visiteur.
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

/** Palmier + soleil : l'icône de l'habillage temporaire.
 *  Exportée : la pastille d'entrée du tiroir (Layout.jsx) porte le même
 *  pictogramme — une seule définition du palmier pour tout le site. */
export function PalmIcon() {
  return (
    <svg
      className="theme-toggle-icon theme-toggle-icon-palm"
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8.4 14.4c-.5-3.1-.2-6.4.8-9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.2 5.2C7.9 3.4 6.1 2.6 3.7 3c1.9.2 3.3.9 4.3 2.1M9.2 5.2C9.4 3.1 10.6 1.7 12.9 1.3c-1.4 1-2.2 2.1-2.5 3.6M9.2 5.2c-1.9-.5-3.6 0-4.9 1.4 1.6-.4 2.9-.3 4.2.3M9.2 5.2c1.8-.2 3.3.4 4.4 1.9-1.6-.5-2.9-.5-4.1 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle() {
  const { isLight, isVice, toggleTheme, toggleVice } = useTheme();
  const { t, lang } = useLanguage();
  const copy = t.nav.theme || {};
  const vice = viceCopy[lang] || viceCopy.fr;

  // Habillage temporaire : le bouton devient la sortie de secours.
  if (isVice) {
    return (
      <button
        type="button"
        className="theme-toggle is-vice"
        onClick={toggleVice}
        aria-label={vice.exit}
        aria-pressed="true"
        title={vice.exit}
      >
        <span className="theme-toggle-track" aria-hidden="true">
          <PalmIcon />
        </span>
        <span className="theme-toggle-label">{copy.exitShort || 'Retour'}</span>
      </button>
    );
  }

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
