import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { VICE_NOTICE_KEY, VICE_THEME, isViceCampaignOn } from './viceTheme';

/**
 * Thème d'affichage — trois valeurs, une seule source de vérité.
 *
 *   • `dark`  : l'identité d'origine du site (néon violet/cyan sur nuit). C'est
 *               le défaut.
 *   • `light` : le thème clair, posé sur du papier (src/theme.css).
 *   • `vice`  : l'HABILLAGE TEMPORAIRE aux couleurs de GTA 6 / Vice City
 *               (src/theme/vice.css) — rose néon, aqua, jaune sur nuit violette.
 *
 * Les trois se partagent la même clé `localStorage` et le même attribut
 * `data-theme` sur <html> : ajouter la peau n'a pas créé un second mécanisme
 * de thème à côté du premier, sinon les deux se seraient battus au démarrage.
 *
 * `vice` est un thème SOMBRE. Tout le code qui ne connaît que deux états
 * (`isLight`) continue donc de fonctionner sans retouche : la peau se pose
 * *par-dessus* le sombre, elle ne s'y substitue pas.
 *
 * L'attribut est écrit avant le premier rendu par un script en ligne dans
 * index.html (même clé, même liste, même défaut) : sans lui, la page
 * s'afficherait dans un thème puis basculerait dans l'autre, ce qui produit un
 * flash très visible.
 *
 * DÉFAUT DE LA CAMPAGNE : pendant la fenêtre de sortie de GTA 6 (voir
 * VICE_CAMPAIGN dans viceTheme.js), l'habillage `vice` est le thème proposé par
 * défaut — sinon il ne serait vu que par qui va le chercher. Un choix
 * explicite du visiteur (même « sombre ») reste prioritaire : il est mémorisé
 * dans `lp-theme` et c'est lui qu'on relit.
 */

const STORAGE_KEY = 'lp-theme';
const THEMES = ['dark', 'light', VICE_THEME];
const SITE_DEFAULT = 'dark';

/** Couleur de la barre du navigateur (mobile) par thème. */
const THEME_COLORS = { dark: '#05060f', light: '#f7f8fc', [VICE_THEME]: '#140a20' };

const ThemeContext = createContext({
  theme: SITE_DEFAULT,
  isLight: false,
  isVice: false,
  setTheme: () => {},
  toggleTheme: () => {},
  toggleVice: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  // Applique le thème au document et mémorise le choix.
  //
  // Le thème par défaut de la campagne n'est PAS mémorisé : tant que le
  // visiteur n'a rien choisi, il doit continuer à suivre le défaut (et donc
  // revenir tout seul au sombre quand la campagne se termine). Seuls les
  // changements explicites (`setTheme`, `toggleTheme`, `toggleVice`) écrivent
  // dans `lp-theme` — c'est aussi ce que fait `?theme=` au premier chargement.
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

  /**
   * Bascule l'habillage temporaire. Depuis le clair, on repart du sombre :
   * la peau n'a pas de variante claire, et un retour au clair doit rester un
   * clic (voir `setTheme` juste au-dessus).
   */
  const toggleVice = useCallback(() => {
    remember(theme === VICE_THEME ? 'dark' : VICE_THEME);
  }, [remember, theme]);

  const value = useMemo(
    () => ({
      theme,
      isLight: theme === 'light',
      isVice: theme === VICE_THEME,
      setTheme,
      toggleTheme,
      toggleVice,
    }),
    [theme, setTheme, toggleTheme, toggleVice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Thème initial, dans l'ordre :
 *   1. ce que le script de démarrage a déjà posé sur <html> (source fiable) ;
 *   2. le choix mémorisé ;
 *   3. le défaut du site — ou l'habillage temporaire pendant sa campagne.
 */
function readInitialTheme() {
  if (typeof document === 'undefined') return SITE_DEFAULT;
  // `?theme=light` (ou `?theme=vice`) force le thème le temps d'une visite :
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
 * Thème par défaut d'une visite sans choix explicite : l'habillage temporaire
 * pendant sa fenêtre de campagne (voir VICE_CAMPAIGN), le sombre sinon.
 *
 * DOIT RESTER ALIGNÉ sur le script de démarrage d'`index.html`.
 */
export function defaultTheme(now = new Date()) {
  return isViceCampaignOn(now) ? VICE_THEME : SITE_DEFAULT;
}

/**
 * Avis de l'habillage : affiché une fois, refermable, et mémorisé.
 *
 * Pourquoi un état à part du thème : l'avis n'est pas un réglage d'apparence,
 * c'est une information de service (peau temporaire + mention non officielle).
 * Le refermer ne doit pas éteindre l'habillage, et inversement.
 */
export function useViceNotice() {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(VICE_NOTICE_KEY) === 'hidden';
    } catch {
      return false;
    }
  });

  const hide = useCallback(() => {
    setHidden(true);
    try {
      window.localStorage.setItem(VICE_NOTICE_KEY, 'hidden');
    } catch {
      /* navigation privée : il revient à la visite suivante */
    }
  }, []);

  return { hidden, hide };
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { STORAGE_KEY as THEME_STORAGE_KEY, THEMES };
