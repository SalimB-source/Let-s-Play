import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Thème d'affichage — trois valeurs, une seule source de vérité.
 *
 *   • `dark`  : l'identité d'origine du site (néon violet/cyan sur nuit). C'est
 *               le défaut.
 *   • `light` : le thème clair, posé sur du papier (src/theme.css).
 *
 * L'habillage temporaire `vice` (GTA 6) a été retiré : il ne reste du skin que
 * la clé d'art du héros, servie par `src/theme/viceTheme.js`. Un `lp-theme`
 * encore réglé sur `vice` retombe tout seul sur le sombre, sans intervention.
 *
 * L'attribut est écrit avant le premier rendu par un script en ligne dans
 * index.html (même clé, même liste, même défaut) : sans lui, la page
 * s'afficherait dans un thème puis basculerait dans l'autre, ce qui produit un
 * flash très visible.
 *
 * Un choix explicite du visiteur est mémorisé dans `lp-theme` et c'est lui
 * qu'on relit au démarrage ; à défaut, le site s'ouvre en sombre.
 */

const STORAGE_KEY = 'lp-theme';
const THEMES = ['dark', 'light'];
const SITE_DEFAULT = 'dark';

/** Couleur de la barre du navigateur (mobile) par thème. */
const THEME_COLORS = { dark: '#05060f', light: '#f7f8fc' };

const ThemeContext = createContext({
  theme: SITE_DEFAULT,
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  // Applique le thème au document. Seuls les changements explicites
  // (`setTheme`, `toggleTheme`) écrivent dans `lp-theme` — c'est aussi ce que
  // fait `?theme=` au premier chargement.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // La barre de navigation du navigateur (mobile) suit la couleur de page.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark));
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

  const remember = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* navigation privée : on garde le thème pour la session seulement */
    }
    setThemeState(next);
  }, []);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) remember(next);
  }, [remember]);

  const toggleTheme = useCallback(() => {
    remember(theme === 'light' ? 'dark' : 'light');
  }, [remember, theme]);

  const value = useMemo(
    () => ({
      theme,
      isLight: theme === 'light',
      setTheme,
      toggleTheme,
    }),
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
  // `?theme=light` force le thème le temps d'une visite :
  // pratique pour partager un lien de recette, ou pour imprimer une page en
  // clair.
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
  return defaultTheme();
}

/**
 * Thème par défaut d'une visite sans choix explicite : le sombre.
 *
 * DOIT RESTER ALIGNÉ sur le script de démarrage d'`index.html`.
 */
export function defaultTheme() {
  return SITE_DEFAULT;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { STORAGE_KEY as THEME_STORAGE_KEY, THEMES };
