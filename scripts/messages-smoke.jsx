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
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import { FriendsProvider } from '../src/friends/FriendsContext';
import { MessagesProvider } from '../src/messages/MessagesContext';
import SocialDock from '../src/social/SocialDock';
import Layout from '../src/components/Layout';
import Auth from '../src/pages/Auth';
import Profile from '../src/pages/Profile';
import MessagesPage from '../src/messages/MessagesPage';
import { DEMO_PROFILES } from '../src/auth/demoProfiles';
import { readDemoMessages } from '../src/messages/messagesApi';
import { InboxView, ThreadView } from '../src/messages/MessagesTabs';
import { RequestsTab } from '../src/friends/FriendsTabs';
import { messagesText } from '../src/messages/messagesCopy';
import { callsText } from '../src/messages/callsCopy';
import { friendsText } from '../src/friends/friendsCopy';
// Fixtures : réinjecte les personas de démonstration dans le registre de
// l'application (livré vide) avant tout rendu — voir scripts/demoFixtures.js.
import { DEMO_PROFILE_FIXTURES, seedDemoProfiles } from './demoFixtures';

seedDemoProfiles();

export { DEMO_PROFILES, DEMO_PROFILE_FIXTURES };
export { DEMO_INITIAL_STATE, findDemoPlayer } from '../src/friends/demoRoster';
export { friendsCopy } from '../src/friends/friendsCopy';
export { socialCopy } from '../src/social/socialCopy';
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
  applyDemoClear,
  applyDemoDelete,
  applyDemoIncoming,
  applyDemoRead,
  applyDemoReply,
  applyDemoReport,
  applyDemoSend,
  applyDemoUnblock,
  applyReadReceipt,
  clearThreadLocal,
  conversationKey,
  deleteMessage,
  demoThreads,
  describeSupabaseError,
  isAfterClear,
  isBlockedError,
  isMissingMessagesTable,
  isRateLimitedError,
  isRequiresFriendshipError,
  markThreadReadLocal,
  mergeUnread,
  normalizeMessage,
  peersFromKey,
  prepareBody,
  removeMessage,
  removeMessageById,
  sortThreadsByActivity,
  threadsFromRows,
  totalUnread,
  unreadFromRows,
  writeDemoMessages,
} from '../src/messages/messagesApi';
export { describeMessagesError, messageSuggestions, messagesCopy, pseudoLabel, reasonLabel } from '../src/messages/messagesCopy';
export { callsText } from '../src/messages/callsCopy';
export { readDemoMessages };
// Les deux vues de la messagerie sont exportées telles quelles : `check:messages`
// les rend seules (`renderInboxView` / `renderThreadView` ci-dessous) avec un
// pseudo volontairement en casse mixte — les gamertags des fixtures sont déjà
// en majuscules, donc l'application seule ne prouverait rien.
export { InboxView, ThreadView };

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
export function createApp(path, { lang = 'fr' } = {}) {
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
              AchievementProvider,
              null,
              React.createElement(
                Layout,
                null,
                React.createElement(
                  Routes,
                  null,
                  React.createElement(Route, { path: '/auth', element: React.createElement(Auth) }),
                  React.createElement(Route, { path: '/messages', element: React.createElement(MessagesPage) }),
                  React.createElement(Route, { path: '/messages/:peerId', element: React.createElement(MessagesPage) }),
                  React.createElement(Route, { path: '/profile/:userId', element: React.createElement(Profile) }),
                ),
              ),
              React.createElement(SocialDock, null),
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * Rendu SSR de `path` dans `lang`, avec (ou sans) persona de démonstration
 * connectée, la fenêtre sociale unifiée fermée / ouverte sur la liste /
 * ouverte sur une discussion. `dockOpen` ouvre du côté messagerie
 * (`letsplay_messages_open`), `friendsOpen` du côté amis
 * (`letsplay_friends_dock_open`) : la fenêtre s'ouvre si l'un des deux.
 */
export function renderApp(path, { lang = 'fr', demoKey = null, dockOpen = false, friendsOpen = false, activePeer = null } = {}) {
  const entries = {
    letsplay_messages_open: dockOpen ? '1' : '0',
    letsplay_friends_dock_open: friendsOpen ? '1' : '0',
  };
  if (activePeer) entries.letsplay_messages_active = activePeer;
  if (demoKey) entries[DEMO_STORAGE_KEY] = JSON.stringify(DEMO_PROFILE_FIXTURES[demoKey]);
  globalThis.window = { localStorage: makeStorage(entries) };
  return renderToString(createApp(path, { lang }));
}

/**
 * Rendu SSR d'une vue de messagerie **seule**, avec des données fabriquées.
 * `check:messages` y passe un pseudo en casse mixte pour vérifier qu'il
 * s'affiche en majuscules dans la liste, chez les joueurs bloqués et dans la
 * discussion — sans monter la pile complète de l'application.
 */
export function renderInboxView(conversations, { lang = 'fr', blocked = [], friends = [] } = {}) {
  globalThis.window = { localStorage: makeStorage() };
  return renderToString(React.createElement(
    MemoryRouter,
    { initialEntries: ['/messages'] },
    React.createElement(InboxView, {
      t: messagesText(lang),
      ft: friendsText(lang),
      friends,
      lang,
      conversations,
      blocked,
      isOnline: (peerId) => Boolean(friends.find((friend) => friend.id === peerId)?.online),
      profileLabel: friendsText(lang).profileShort,
      onOpen: () => {},
      onUnblock: () => {},
    }),
  ));
}

export function renderThreadView(profile, { lang = 'fr', messages = [], blocked = false, canWrite = true } = {}) {
  globalThis.window = { localStorage: makeStorage() };
  return renderToString(React.createElement(
    MemoryRouter,
    { initialEntries: [`/messages/${profile.id}`] },
    React.createElement(ThreadView, {
      peerId: profile.id,
      t: messagesText(lang),
      ft: friendsText(lang),
      ct: callsText(lang),
      lang,
      thread: { messages },
      profile,
      online: true,
      blocked,
      reported: false,
      canWrite,
      onBack: () => {},
      onSend: () => {},
      onDelete: () => {},
      onClear: () => {},
      onBlock: () => {},
      onUnblock: () => {},
      onReport: () => {},
      onCall: () => {},
    }),
  ));
}

/**
 * Rendu SSR de l'onglet **Demandes** de la fenêtre sociale, seul, avec des
 * données fabriquées. `check:messages` y passe un pseudo en casse mixte pour
 * vérifier qu'il ressort en majuscules — même règle que le reste de la
 * messagerie — sans monter la pile complète de l'application. (La liste des
 * amis, elle, vit dans la boîte de réception : voir `renderInboxView`.)
 */
export function renderRequestsTab({ incoming = [], outgoing = [], lang = 'fr' } = {}) {
  globalThis.window = { localStorage: makeStorage() };
  return renderToString(React.createElement(
    MemoryRouter,
    { initialEntries: ['/messages?tab=requests'] },
    React.createElement(RequestsTab, {
      incoming,
      outgoing,
      t: friendsText(lang),
      lang,
      accept: () => {},
      decline: () => {},
      cancel: () => {},
    }),
  ));
}

/** Clic réel (DOM) : annulation, confirmation, disparition puis rechargement. */
export async function checkClearInteraction(assert) {
  const user = DEMO_PROFILE_FIXTURES.vortex;
  const peer = 'demo-player-3105';
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user));
  window.scrollTo = () => {};
  const node = document.createElement('div');
  document.body.append(node);
  let root = createRoot(node);
  const bubbles = () => node.querySelectorAll('.messages-bubble-row').length;
  const click = async (selector) => {
    const button = node.querySelector(selector);
    assert.ok(button, `${selector} présent`);
    await act(async () => button.click());
  };

  try {
    await act(async () => root.render(createApp(`/messages/${peer}`, { lang: 'fr' })));
    const before = bubbles();
    assert.ok(before > 0, 'le fil démo contient des messages');
    const prompts = [];
    window.confirm = (text) => { prompts.push(text); return false; };
    await click('.messages-tool-more');
    await click('.messages-more-item[aria-label="Effacer la conversation"]');
    assert.equal(bubbles(), before, 'annuler conserve le fil');
    assert.equal(prompts.length, 1, 'l’effacement demande confirmation');
    assert.match(prompts[0], /pour toi uniquement.*resteront visibles pour l’autre personne/i);

    window.confirm = (text) => { prompts.push(text); return true; };
    await click('.messages-tool-more');
    await click('.messages-more-item[aria-label="Effacer la conversation"]');
    assert.equal(bubbles(), 0, 'le fil effacé est immédiatement vide');
    assert.ok(node.textContent.includes('Aucun message pour l’instant'), 'la discussion reste ouverte');
    const state = readDemoMessages(user);
    assert.equal(state.threads[peer], undefined, 'le fil effacé reste absent du stockage de ce joueur');
    assert.ok(state.threads['demo-player-4820']?.length > 0, 'les autres discussions sont intactes');
    await act(async () => root.unmount());
    root = createRoot(node);
    await act(async () => root.render(createApp(`/messages/${peer}`, { lang: 'fr' })));
    assert.equal(bubbles(), 0, 'le fil reste vide après remontage');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}

/**
 * Clic réel (DOM) sur la bulle de suggestions : elle ouvre avec la
 * discussion, un clic remplit le champ sans rien envoyer, elle se referme
 * (au choix comme à la frappe) et revient à la réouverture.
 *
 * Les comptages servent d'assertions plutôt que les nœuds eux-mêmes : en
 * cas d'échec, `assert` inspecte alors un simple nombre au lieu de l'arbre
 * React/jsdom (l'inspection d'un tel nœud peut coûter très cher).
 */
export async function checkSuggestionInteraction(assert) {
  const user = DEMO_PROFILE_FIXTURES.vortex;
  const peer = 'demo-player-3105';
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user));
  window.scrollTo = () => {};
  const node = document.createElement('div');
  document.body.append(node);
  let root = createRoot(node);
  const suggestCount = () => node.querySelectorAll('.messages-suggest').length;
  const chips = () => [...node.querySelectorAll('.messages-suggest-chip')];
  const textarea = () => node.querySelector('.messages-composer textarea');
  const bubbleRows = () => node.querySelectorAll('.messages-bubble-row').length;
  const click = async (element) => { await act(async () => element.click()); };
  // Saisie contrôlée React : passer par le setter natif, sinon React prend
  // la valeur pour inchangée et « input » ne déclenche aucun onChange.
  const typeIn = async (value) => {
    const area = textarea();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      setter.call(area, value);
      area.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };

  try {
    await act(async () => root.render(createApp(`/messages/${peer}`, { lang: 'fr' })));
    assert.equal(suggestCount(), 1, 'la bulle de suggestions ouvre avec la discussion');
    assert.equal(chips().length, 3, 'trois suggestions sont proposées');

    // Un clic place le texte dans le champ : rien n'est envoyé tout seul.
    const before = bubbleRows();
    const first = chips()[0];
    const label = first.textContent;
    await click(first);
    assert.equal(textarea().value, label, 'le clic remplit le champ');
    assert.equal(bubbleRows(), before, 'aucun message n’est parti sans validation');
    assert.equal(node.querySelector('.messages-send').disabled, false, 'le champ est prêt à envoyer');
    assert.equal(suggestCount(), 0, 'la bulle se referme après le choix');

    // Effacer le brouillon ne fait pas revenir la bulle : le choix est pris.
    await typeIn('');
    assert.equal(suggestCount(), 0, 'effacer le brouillon ne fait pas revenir la bulle');

    // Réouvrir la discussion : la bulle revient, comme à toute première visite.
    await act(async () => root.unmount());
    root = createRoot(node);
    await act(async () => root.render(createApp(`/messages/${peer}`, { lang: 'fr' })));
    assert.equal(suggestCount(), 1, 'la bulle revient à la réouverture de la discussion');

    // Taper soi-même referme la bulle pour de bon.
    await typeIn('Salut');
    assert.equal(suggestCount(), 0, 'la première frappe referme la bulle');
    await typeIn('');
    assert.equal(suggestCount(), 0, 'la bulle reste fermée après effacement');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
