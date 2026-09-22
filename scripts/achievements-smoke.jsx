/**
 * Entrée SSR utilisée par scripts/achievements-check.mjs.
 *
 * Rend le panneau des succès du profil (et le hub /auth) avec la vraie pile
 * de l'application — LanguageProvider + AuthProvider + AchievementProvider +
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
import { AchievementProvider, AchievementsContext } from '../src/achievements/AchievementContext';
import { STORAGE_KEY, scopeForUser } from '../src/achievements/storage';
import AchievementPopup from '../src/achievements/AchievementPopup';
import AchievementTracker from '../src/achievements/AchievementTracker';
import Layout from '../src/components/Layout';
import Auth from '../src/pages/Auth';
import { DEMO_PROFILES } from '../src/auth/demoProfiles';

export const STORAGE_KEY_LEGACY = STORAGE_KEY;
// La progression est rangée par joueur : clé « invité » pour l'appareil,
// clé propre à chaque compte pour le cache de sa copie serveur.
const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const DEMO_STORAGE_KEY = 'letsplay_auth_demo_profile';

// Compte réellement connecté (session Supabase) : contrairement aux personas de
// démonstration, ses métadonnées ne portent ni XP ni niveau — seule la
// progression des succès le fait monter.
const REAL_ACCOUNT = {
  id: 'real-player-0001',
  email: 'joueur@letsplay.dz',
  created_at: '2025-03-04T09:15:00.000Z',
  user_metadata: { gamertag: 'JOUEUR_DZ', fullName: 'Joueur Connecté' },
};

// Cache local du compte : la clé propre à ce joueur (`…:u:<id>`).
const ACCOUNT_STORAGE_KEY = `${STORAGE_KEY}:${scopeForUser(REAL_ACCOUNT.id)}`;

function render(path, Page, lang, storedState, { demo = false, account = false, deviceGuest = false } = {}) {
  const store = new Map();
  store.set('letsplay-lang', lang);
  // `deviceGuest` : la progression est laissée sur la clé invité de l'appareil
  // pendant qu'un COMPTE NEUF est connecté — c'est le scénario « création d'un
  // compte sur un appareil où l'on a déjà joué » : aucune fuite possible.
  const stateKey = account && !deviceGuest ? ACCOUNT_STORAGE_KEY : GUEST_STORAGE_KEY;
  if (storedState) store.set(stateKey, JSON.stringify(storedState));
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

  // `account: true` monte la session d'un compte Supabase réel : le hub rendu
  // est alors celui d'un joueur connecté, pas l'aperçu de démonstration.
  const authProps = account ? { initialSession: { user: REAL_ACCOUNT } } : null;

  const html = renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        AuthProvider,
        authProps,
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

/** Le panneau de succès rendu dans le profil joueur. */
export function profileAchievements(lang, storedState = null, options = {}) {
  return render('/auth', Auth, lang, storedState, options);
}

/**
 * Compte tout juste créé, sur un appareil où l'on a DÉJÀ joué : sa progression
 * (niveau, succès) doit partir de zéro — la progression de l'appareil ne lui
 * est pas prêtée, et un compte n'a pas de cache tant que le serveur n'a rien.
 * `storedState` simule la progression laissée par le précédent joueur.
 */
export function freshAccountOnPlayedDevice(lang, storedState = null) {
  return render('/auth', Auth, lang, storedState, { account: true, deviceGuest: true });
}

/**
 * Hub joueur /auth.
 * `{ demo: true }` simule l'aperçu de démonstration, `{ account: true }` rend
 * le hub d'un compte Supabase réellement connecté.
 */
export function authHub(lang, storedState = null, options = {}) {
  return render('/auth', Auth, lang, storedState, options);
}

/**
 * Notifications de déblocage (bas à droite), montées avec une file donnée.
 *
 * Les toasts n'apparaissent qu'après une action (ils sont alimentés par
 * l'état React) : pour les vérifier en SSR, on les rend avec un contexte
 * simulé qui contient exactement la file qu'un joueur verrait après une
 * action.
 *
 * @param {string} lang langue de l'interface
 * @param {{ notifications?: Array<{id: string, levelUp?: {from: number, to: number}|null}> }} [options]
 */
export function achievementPopup(lang, { notifications = [] } = {}) {
  const store = new Map();
  store.set('letsplay-lang', lang);
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };

  const value = {
    ready: true,
    state: {},
    summary: {},
    notifications,
    dismissNotification() {},
    dismissAllNotifications() {},
    track() {},
    reset() {},
    synced: false,
  };

  return renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/news'] },
        React.createElement(
          AchievementsContext.Provider,
          { value },
          React.createElement(AchievementPopup, null)
        )
      )
    )
  );
}
