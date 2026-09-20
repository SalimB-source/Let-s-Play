/**
 * Entrée SSR utilisée par scripts/achievements-check.mjs.
 *
 * Rend la page /achievements (et le hub /auth) avec la vraie pile de
 * l'application — LanguageProvider + AuthProvider + AchievementProvider +
 * Layout — pour vérifier que l'affichage correspond bien à l'état enregistré
 * sur l'appareil, dans les trois langues.
 *
 * `storedState` simule la progression d'un joueur déjà enregistrée dans
 * `localStorage` : le rendu doit alors montrer les succès débloqués et le bon
 * niveau, sans aucune action supplémentaire.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import AchievementTracker from '../src/achievements/AchievementTracker';
import Layout from '../src/components/Layout';
import Achievements from '../src/pages/Achievements';
import Auth from '../src/pages/Auth';
import { DEMO_PROFILES } from '../src/auth/demoProfiles';

export const STORAGE_KEY = 'letsplay_achievements_v1';
const DEMO_STORAGE_KEY = 'letsplay_auth_demo_profile';

function render(path, Page, lang, storedState, { demo = false } = {}) {
  const store = new Map();
  store.set('letsplay-lang', lang);
  if (storedState) store.set(STORAGE_KEY, JSON.stringify(storedState));
  // Progression ET session de démonstration : c'est le cas du visiteur qui
  // explore le hub après avoir cliqué sur « Explorer le compte démo ».
  if (demo) store.set(DEMO_STORAGE_KEY, JSON.stringify(DEMO_PROFILES.vortex));

  // LanguageProvider et AchievementProvider lisent le stockage pendant le
  // rendu : on fournit un localStorage minimal, comme le font déjà les autres
  // scripts de vérification du dépôt.
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };

  const html = renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(
            AchievementProvider,
            null,
            React.createElement(
              Layout,
              null,
              React.createElement(AchievementTracker, null),
              React.createElement(
                Routes,
                null,
                React.createElement(Route, { path, element: React.createElement(Page) })
              )
            )
          )
        )
      )
    )
  );

  return { html, store };
}

/** Page /achievements pour une langue, avec (ou sans) progression enregistrée. */
export function achievementsPage(lang, storedState = null) {
  return render('/achievements', Achievements, lang, storedState);
}

/** Hub joueur /auth — `{ demo: true }` simule l'aperçu de démonstration. */
export function authHub(lang, storedState = null, options = {}) {
  return render('/auth', Auth, lang, storedState, options);
}
