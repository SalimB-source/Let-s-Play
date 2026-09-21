/**
 * Entrée SSR utilisée par scripts/friends-check.mjs.
 *
 * Rend le hub joueur (/auth), un profil public de la communauté de
 * démonstration et la fenêtre d'amis avec la vraie pile de l'application —
 * LanguageProvider + AuthProvider + FriendsProvider + AchievementProvider +
 * Layout — et ré-exporte la logique pure du module amis (relations, actions
 * de démonstration, présence scriptée, recherche) pour la vérifier sans DOM.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import { FriendsProvider } from '../src/friends/FriendsContext';
import FriendsDock from '../src/friends/FriendsDock';
import Layout from '../src/components/Layout';
import Auth from '../src/pages/Auth';
import Profile from '../src/pages/Profile';
import { DEMO_PROFILES } from '../src/auth/demoProfiles';

export { DEMO_PROFILES };
export {
  DEMO_COMMUNITY,
  DEMO_INITIAL_STATE,
  DEMO_PLAYERS,
  demoPresence,
  findDemoPlayer,
  isDemoPlayerId,
} from '../src/friends/demoRoster';
export {
  applyDemoAction,
  demoRelations,
  isRecentlySeen,
  normalizeProfile,
  readDemoFriendState,
  relationsFromRows,
  sanitizeSearch,
  searchDemoPlayers,
  PRESENCE_STALE_MS,
} from '../src/friends/friendsApi';
export { friendsCopy, fill } from '../src/friends/friendsCopy';

const DEMO_STORAGE_KEY = 'letsplay_auth_demo_profile';

/** Stockage local minimal, comme dans les autres scripts de vérification. */
export function makeStorage(entries = {}) {
  const store = new Map(Object.entries(entries));
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}

/** Élément racine de l'application pour `path` (routes utiles au module amis). */
export function createApp(path, { initialSession = null } = {}) {
  return React.createElement(
    LanguageProvider,
    null,
    React.createElement(
      AuthProvider,
      initialSession ? { initialSession } : null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          FriendsProvider,
          null,
          React.createElement(
            AchievementProvider,
            null,
            React.createElement(
              Layout,
              null,
              React.createElement(
                Routes,
                null,
                React.createElement(Route, { path: '/auth', element: React.createElement(Auth) }),
                React.createElement(Route, { path: '/profile/:userId', element: React.createElement(Profile) }),
              ),
            ),
            React.createElement(FriendsDock, null),
          ),
        ),
      ),
    ),
  );
}

/**
 * Rendu SSR de `path` dans `lang`, avec (ou sans) persona de démonstration
 * connectée, la fenêtre d'amis ouverte ou fermée.
 */
export function renderApp(path, { lang = 'fr', demoKey = null, dockOpen = false } = {}) {
  const entries = { 'letsplay-lang': lang, letsplay_friends_dock_open: dockOpen ? '1' : '0' };
  if (demoKey) entries[DEMO_STORAGE_KEY] = JSON.stringify(DEMO_PROFILES[demoKey]);
  globalThis.window = { localStorage: makeStorage(entries) };
  return renderToString(createApp(path));
}
