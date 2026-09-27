/**
 * Entrée SSR utilisée par scripts/calls-check.mjs.
 *
 * Rend la page de messagerie (/messages, /messages/:peerId) et le hub (/auth)
 * avec la vraie pile de l'application — LanguageProvider + AuthProvider +
 * FriendsProvider + MessagesProvider + CallsProvider + AchievementProvider +
 * Layout + SocialDock + CallOverlays — et ré-exporte la logique pure du
 * module d'appels (configuration ICE, événements de signalisation, durées,
 * erreurs de média, textes) pour la vérifier sans navigateur.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import { FriendsProvider } from '../src/friends/FriendsContext';
import { MessagesProvider } from '../src/messages/MessagesContext';
import { CallsProvider } from '../src/messages/CallsContext';
import CallOverlays from '../src/messages/CallOverlays';
import SocialDock from '../src/social/SocialDock';
import Layout from '../src/components/Layout';
import Auth from '../src/pages/Auth';
import Profile from '../src/pages/Profile';
import MessagesPage from '../src/messages/MessagesPage';
import { DEMO_PROFILES } from '../src/auth/demoProfiles';
// Fixtures : réinjecte les personas de démonstration dans le registre de
// l'application (livré vide) avant tout rendu — voir scripts/demoFixtures.js.
import { DEMO_PROFILE_FIXTURES, seedDemoProfiles } from './demoFixtures';
import { makeStorage } from './messages-smoke.jsx';

seedDemoProfiles();

export { DEMO_PROFILES, DEMO_PROFILE_FIXTURES };
export { DEMO_INITIAL_STATE, findDemoPlayer } from '../src/friends/demoRoster';
export {
  CALL_KINDS,
  CONNECT_TIMEOUT_MS,
  DISCONNECT_GRACE_MS,
  ENDED_TOAST_MS,
  END_BUSY,
  END_CANCELLED,
  END_DECLINED,
  END_FAILED,
  END_HUNG_UP,
  END_LOST,
  END_NO_ANSWER,
  INCOMING_TIMEOUT_MS,
  OUTGOING_TIMEOUT_MS,
  RING_DEDUP_MS,
  classifyMediaError,
  createCallId,
  formatDuration,
  iceServersFromEnv,
  inboxChannelFor,
  isCallEvent,
  makeCallEvent,
  normalizeCallKind,
} from '../src/messages/callsCore';
export {
  callBlockLabel,
  callStatusLabel,
  callSummaryText,
  callsCopy,
  callsText,
  describeCallError,
} from '../src/messages/callsCopy';

const DEMO_STORAGE_KEY = 'letsplay_auth_demo_profile';

/** Élément racine de l'application pour `path` (routes utiles au module).
 *  La langue passe par la **prop `lang`** du provider — depuis que le site
 *  est publié en français seul, plus rien ne lit `localStorage`. */
export function createApp(path, lang = 'fr') {
  return React.createElement(
    LanguageProvider,
    { lang },
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
              CallsProvider,
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
                    React.createElement(Route, { path: '/messages', element: React.createElement(MessagesPage) }),
                    React.createElement(Route, { path: '/messages/:peerId', element: React.createElement(MessagesPage) }),
                    React.createElement(Route, { path: '/auth', element: React.createElement(Auth) }),
                    React.createElement(Route, { path: '/profile/:userId', element: React.createElement(Profile) }),
                  ),
                ),
                React.createElement(SocialDock, null),
                React.createElement(CallOverlays, null),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * Rendu SSR de `path` dans `lang`, avec (ou sans) persona de démonstration
 * connectée et discussion ouverte (`activePeer`). Mêmes clés de stockage que
 * l'application (langue, fenêtre sociale, discussion active, persona).
 */
export function renderApp(path, { lang = 'fr', demoKey = null, dockOpen = false, activePeer = null } = {}) {
  const entries = {
    letsplay_messages_open: dockOpen ? '1' : '0',
    letsplay_friends_dock_open: '0',
  };
  if (activePeer) entries.letsplay_messages_active = activePeer;
  if (demoKey) entries[DEMO_STORAGE_KEY] = JSON.stringify(DEMO_PROFILE_FIXTURES[demoKey]);
  globalThis.window = { localStorage: makeStorage(entries) };
  return renderToString(createApp(path, lang));
}
