/**
 * Entrée SSR utilisée par scripts/messages-check.mjs.
 *
 * Rend le hub joueur (/auth) et un profil public de la communauté de
 * démonstration avec la vraie pile de l'application — LanguageProvider +
 * AuthProvider + FriendsProvider + MessagesProvider + AchievementProvider +
 * Layout — et ré-exporte la logique pure du module messagerie (clés de
 * conversation, lignes → discussions, non-lus, gestes de démonstration) pour
 * la vérifier sans DOM.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import { FriendsProvider } from '../src/friends/FriendsContext';
import FriendsDock from '../src/friends/FriendsDock';
import { MessagesProvider } from '../src/messages/MessagesContext';
import MessagesDock from '../src/messages/MessagesDock';
import Layout from '../src/components/Layout';
import Auth from '../src/pages/Auth';
import Profile from '../src/pages/Profile';
import { DEMO_PROFILES } from '../src/auth/demoProfiles';

export { DEMO_PROFILES };
export { DEMO_INITIAL_STATE, findDemoPlayer } from '../src/friends/demoRoster';
export { friendsCopy } from '../src/friends/friendsCopy';
export {
  DEMO_INCOMING,
  DEMO_REPLIES,
  DEMO_THREADS,
  demoReplyFor,
  dueDemoIncoming,
  seedDemoThreadState,
} from '../src/messages/demoThreads';
export {
  MESSAGE_MAX_LENGTH,
  REPORT_REASONS,
  appendMessage,
  applyDemoBlock,
  applyDemoIncoming,
  applyDemoRead,
  applyDemoReply,
  applyDemoReport,
  applyDemoSend,
  applyDemoUnblock,
  applyReadReceipt,
  conversationKey,
  demoThreads,
  isBlockedError,
  isMissingMessagesTable,
  isRateLimitedError,
  isRequiresFriendshipError,
  markThreadReadLocal,
  mergeUnread,
  normalizeMessage,
  peersFromKey,
  prepareBody,
  sortThreadsByActivity,
  threadsFromRows,
  totalUnread,
  unreadFromRows,
} from '../src/messages/messagesApi';
export { messagesCopy, reasonLabel } from '../src/messages/messagesCopy';

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

/** Élément racine de l'application pour `path` (routes utiles au module). */
export function createApp(path) {
  return React.createElement(
    LanguageProvider,
    null,
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          FriendsProvider,
          null,
          React.createElement(
            MessagesProvider,
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
              React.createElement(MessagesDock, null),
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * Rendu SSR de `path` dans `lang`, avec (ou sans) persona de démonstration
 * connectée, la fenêtre de messagerie fermée / ouverte sur la liste / ouverte
 * sur une discussion.
 */
export function renderApp(path, { lang = 'fr', demoKey = null, dockOpen = false, activePeer = null } = {}) {
  const entries = {
    'letsplay-lang': lang,
    letsplay_messages_open: dockOpen ? '1' : '0',
  };
  if (activePeer) entries.letsplay_messages_active = activePeer;
  if (demoKey) entries[DEMO_STORAGE_KEY] = JSON.stringify(DEMO_PROFILES[demoKey]);
  globalThis.window = { localStorage: makeStorage(entries) };
  return renderToString(createApp(path));
}
