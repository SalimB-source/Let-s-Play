/**
 * Entrée SSR utilisée par scripts/auth-popup-check.mjs.
 *
 * Rend le pop-up d'authentification (`/auth`, `/register`) et la barre de
 * navigation avec la vraie pile de l'application — LanguageProvider +
 * AuthProvider + MemoryRouter — pour vérifier que chaque URL ouvre bien le
 * formulaire qu'elle annonce : le bouton « S'inscrire » de la navigation doit
 * montrer le formulaire d'inscription, pas celui de connexion.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import Layout from '../src/components/Layout';
import Auth from '../src/pages/Auth';

// Helpers purs de la page (résolution du mode depuis l'URL) — réexportés pour
// que la vérification les teste directement, sans navigateur.
export { AUTH_MODES, modeFromSearch, readAuthMode } from '../src/pages/Auth';

const LANG_STUBS = {};

/**
 * LanguageProvider lit la langue active dans `localStorage` pendant le rendu :
 * on installe un `window` minimal, comme scripts/i18n-smoke.jsx.
 */
function withLang(lang, render) {
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === 'lang' || key === 'letsplay-lang' ? lang : (LANG_STUBS[key] ?? null)),
      setItem() {},
    },
  };
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { language: lang };
  }
  try {
    return render();
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

// Entrée de route au format accepté par MemoryRouter : seul `/auth?mode=signup`
// (chemin + requête) doit être distingué, le hash des liens de commentaires
// (`/auth#comments`) restant valide.
function entryFor({ pathname, search = '', hash = '' }) {
  return { pathname, search, hash };
}

/**
 * Rend la page d'authentification à l'URL demandée. `initialMode` reproduit la
 * route `/register` (qui passe la prop au lieu du paramètre d'URL).
 */
export function renderAuth({ pathname = '/auth', search = '', hash = '', initialMode } = {}) {
  return withLang('en', () => renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [entryFor({ pathname, search, hash })] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '*',
              element: React.createElement(Auth, { initialMode }),
            }),
          ),
        ),
      ),
    ),
  ));
}

/**
 * Rend la barre de navigation pour lire ses boutons de compte. Sans `session`
 * on obtient le visiteur (« Log in » / « Register ») ; avec une session
 * Supabase factice, le membre connecté (pastille + bouton « Log out »).
 */
export function renderNav({ session = null } = {}) {
  return withLang('en', () => renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        AuthProvider,
        { initialSession: session },
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/news'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '*',
              element: React.createElement(Layout, null, React.createElement('div')),
            }),
          ),
        ),
      ),
    ),
  ));
}
