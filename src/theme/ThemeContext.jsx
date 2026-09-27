import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Thème clair / sombre.
 *
 * Le sombre est l'identité d'origine du site : c'est le défaut. Le clair est
 * un choix explicite de l'utilisateur, mémorisé dans `localStorage`.
 *
 * L'attribut `data-theme` est posé sur <html>. Un script en ligne dans
 * index.html le pose *avant* le premier rendu (à partir du même localStorage) :
 * sans lui, la page s'afficherait en sombre puis basculerait en clair, ce qui
 * produit un flash très visible. `ThemeContext` ne fait donc que reprendre la
 * valeur déjà en place, puis la maintenir.
 *
 * Pour suivre le réglage du système au lieu du sombre par défaut, remplacer
 * `SITE_DEFAULT` par `prefers-color-scheme` (voir `readInitialTheme`).
 */

const STORAGE_KEY = 'lp-theme';
const THEMES = ['dark', 'light'];
const SITE_DEFAULT = 'dark';

const ThemeContext = createContext({
  theme: SITE_DEFAULT,
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  // Applique le thème au document et mémorise le choix.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* navigation privée : on garde le thème pour la session seulement */
    }
    // La barre de navigation du navigateur (mobile) suit la couleur de page.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', theme === 'light' ? '#f7f8fc' : '#05060f'));
  }, [theme]);

  // Un autre onglet a changé le thème : on s'aligne.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      if (THEMES.includes(event.newValue)) setThemeState(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({ theme, isLight: theme === 'light', setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Thème initial, dans l'ordre :
 *   1. ce que le script de démarrage a déjà posé sur <html> (source fiable) ;
 *   2. le choix mémorisé ;
 *   3. le défaut du site.
 */
function readInitialTheme() {
  if (typeof document === 'undefined') return SITE_DEFAULT;
  // `?theme=light` force le thème le temps d'une visite : pratique pour
  // partager un lien de recette, ou pour imprimer une page en clair.
  try {
    const query = new URLSearchParams(window.location.search).get('theme');
    if (THEMES.includes(query)) return query;
  } catch {
    /* pas de window.location exploitable */
  }
  const preset = document.documentElement.getAttribute('data-theme');
  if (THEMES.includes(preset)) return preset;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(stored)) return stored;
  } catch {
    /* localStorage indisponible */
  }
  // Pour suivre le système : return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return SITE_DEFAULT;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { STORAGE_KEY as THEME_STORAGE_KEY };
