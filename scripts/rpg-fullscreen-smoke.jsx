/**
 * Entrée SSR utilisée par scripts/rpg-fullscreen-check.mjs —
 * `npm run check:rpg-fullscreen`.
 *
 * Joue le plein écran du Sablier dans jsdom, avec la vraie page
 * (`/jeu/sablier-de-bab-el`) : le menu (Jouer, Histoire, Decks, Catalogue) et le
 * duel. jsdom n'a pas de Fullscreen API : on en installe une doublure qui répond
 * comme un navigateur (la demande aboutit un instant plus tard, puis
 * `fullscreenchange` part), qu'on peut aussi faire refuser.
 *
 *   1. Ouverture : la page reste dans la page — ni plein écran natif, ni couche
 *      fixe, ni verrou de défilement (aucune demande au montage).
 *   2. Le bouton du menu demande le plein écran natif sur la coque du jeu — pas
 *      sur `<html>` : le site entier ne part pas en plein écran, seul le
 *      Sablier — et un second appui revient à la page.
 *   3. Un toucher ordinaire ne demande rien, et lancer une partie à la souris
 *      (jsdom n'a pas de pointeur grossier) reste dans la page : rien n'est
 *      forcé sur ordinateur.
 *   4. **Au doigt** (pointeur grossier : téléphone, tablette, application) :
 *      lancer une partie demande le plein écran natif dans le geste — c'est la
 *      seule condition sous laquelle le navigateur accepte ensuite
 *      `screen.orientation.lock('landscape')`, qui couche la partie dans le
 *      paysage. Le nœud de la coque survit au changement d'écran : le même nœud
 *      reste en plein écran pendant le duel, bouton de la barre allumé.
 *   5. Démontage : le verrou de défilement est rendu et le plein écran refermé.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

async function mountPage() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(<RpgDuelPage rng={() => 0.999} />));
  await act(async () => { await sleep(20); });
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

const click = (element) => act(async () => { element.click(); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });

/** Appuie sur une touche depuis `target` ; rend l'évènement pour lire `defaultPrevented`. */
async function press(key, init = {}, target = window) {
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  await act(async () => { target.dispatchEvent(event); });
  return event;
}

/** Un doigt (ou une souris) qui se pose dans le jeu. */
const touch = (element) => act(async () => {
  element.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
});

/** Pointeur grossier (téléphone, tablette, application) : `matchMedia` répond
 * oui à `(pointer: coarse)` et non à tout le reste. jsdom n'implémente pas
 * `matchMedia` : sans la doublure, la page se croit à la souris. */
function installCoarsePointer() {
  const original = window.matchMedia;
  window.matchMedia = (query) => ({
    matches: /pointer:\s*coarse/.test(String(query)),
    media: String(query),
    onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
    dispatchEvent() { return false; },
  });
  return () => {
    if (original === undefined) delete window.matchMedia;
    else window.matchMedia = original;
  };
}

/**
 * Fullscreen API de remplacement. `element` est l'élément en plein écran ;
 * `requests` et `exits` comptent les appels. `refuse` : la demande est rejetée.
 * `browserExit()` : le navigateur referme de lui-même (Échap, geste « retour »).
 */
function installFullscreenApi() {
  const api = { element: null, requests: 0, exits: 0, refuse: false };
  const later = (work) => new Promise((resolve) => queueMicrotask(() => { work(); resolve(); }));
  const changed = () => document.dispatchEvent(new window.Event('fullscreenchange'));
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => api.element });
  window.HTMLElement.prototype.requestFullscreen = function requestFullscreen() {
    api.requests += 1;
    if (api.refuse) return Promise.reject(new TypeError('Fullscreen request denied'));
    return later(() => { api.element = this; changed(); });
  };
  document.exitFullscreen = function exitFullscreen() {
    api.exits += 1;
    if (!api.element) return Promise.reject(new TypeError('Document not active'));
    return later(() => { api.element = null; changed(); });
  };
  api.browserExit = () => act(async () => { api.element = null; changed(); await sleep(5); });
  api.uninstall = () => {
    delete document.fullscreenElement;
    delete document.exitFullscreen;
    delete window.HTMLElement.prototype.requestFullscreen;
  };
  return api;
}

// ── Lecture de la page ──────────────────────────────────────────────────────

const OPEN = { native: true, layer: true, locked: true, pressed: 'true' };
const LAYER_ONLY = { native: false, layer: true, locked: true, pressed: 'true' };
const CLOSED = { native: false, layer: false, locked: false, pressed: 'false' };

const shellOf = (node) => node.querySelector('.rpg-battle');
const menuToggleOf = (node) => node.querySelector('.rpg-mode-menu__fullscreen');
const duelToggleOf = (node) => node.querySelector('.rpg-duel-nav__fullscreen');
const toggleOf = (node) => menuToggleOf(node) ?? duelToggleOf(node);
const menuTabOf = (node, label) => [...node.querySelectorAll('.rpg-mode-menu__switch button')]
  .find((button) => squash(button.textContent).includes(label));
const storyTowerOf = (node) => node.querySelector('.rpg-story-tower');
const storyFloorOf = (node) => node.querySelector('.rpg-story-floor.is-next:not(:disabled)');
const duelMenuButtonOf = (node) => [...node.querySelectorAll('.rpg-duel-nav button')]
  .find((button) => squash(button.textContent) === 'Menu');
// Le bouton principal de l'écran Jouer ouvre le mode Histoire : une partie
// rapide se démarre depuis l'onglet Deck (« Jouer avec ce deck »).
const lancerDuel = async (node) => {
  await click(menuTabOf(node, 'Deck'));
  await settle();
  await click(node.querySelector('.rpg-deck-choice__button'));
  await settle();
  await click(node.querySelector('.rpg-deck-detail__play'));
  await settle();
};

/** Plein écran de la coque : natif, couche fixe, verrou de défilement, bouton allumé. */
const stateOf = (node, api) => ({
  native: api.element !== null && api.element === shellOf(node),
  layer: shellOf(node).classList.contains('is-immersive'),
  locked: document.body.classList.contains('game-immersive-lock'),
  pressed: toggleOf(node)?.getAttribute('aria-pressed') ?? null,
});

const counts = (api) => ({ requests: api.requests, exits: api.exits });
const since = (api, before) => ({ requests: api.requests - before.requests, exits: api.exits - before.exits });

export async function checkRpgFullscreen(assert) {
  window.localStorage.clear();
  const api = installFullscreenApi();
  try {
    const { node, unmount } = await mountPage();
    assert.deepEqual(stateOf(node, api), CLOSED, 'le Sablier s’ouvre dans la page, sans couche ni plein écran natif');
    assert.deepEqual(counts(api), { requests: 0, exits: 0 }, 'aucune demande native au montage');

    // Le plein écran reste disponible sur demande explicite.
    await click(menuToggleOf(node));
    await settle();
    assert.deepEqual(stateOf(node, api), OPEN, 'le bouton permet toujours de demander explicitement le plein écran');
    await click(menuToggleOf(node));
    await settle();
    assert.deepEqual(stateOf(node, api), CLOSED, 'le bouton permet de revenir à la page');

    // Ni un geste ordinaire ni le lancement d’une partie ne demandent le natif.
    await touch(shellOf(node));
    await settle();
    assert.deepEqual(stateOf(node, api), CLOSED, 'un toucher ordinaire ne déclenche pas le plein écran');
    await lancerDuel(node);
    await settle();
    assert.deepEqual(stateOf(node, api), CLOSED, 'le lancement du duel reste dans la page');
    assert.equal(shellOf(node).dataset.scene, 'duel', 'la partie est bien lancée');
    await unmount();
    assert.equal(api.element, null, 'quitter la page ferme un éventuel plein écran');

    // Au doigt (téléphone, tablette, application), lancer une partie demande le
    // plein écran natif dans le geste : c'est la seule condition sous laquelle
    // le navigateur accepte `screen.orientation.lock('landscape')` — la partie
    // se couche dans le paysage.
    const restaurerPointeur = installCoarsePointer();
    try {
      const telephone = await mountPage();
      const avant = counts(api);
      await lancerDuel(telephone.node);
      await settle();
      assert.deepEqual(stateOf(telephone.node, api), OPEN, 'au doigt, le lancement du duel demande le plein écran natif sur la coque');
      assert.deepEqual(since(api, avant), { requests: 1, exits: 0 }, 'une seule demande, dans le geste du lancement');
      assert.equal(shellOf(telephone.node).dataset.scene, 'duel', 'la partie est bien lancée');
      await telephone.unmount();
      assert.equal(api.element, null, 'quitter la page ferme le plein écran du duel');
    } finally {
      restaurerPointeur();
    }
    api.uninstall();
  } finally {
    api.uninstall();
    document.body.classList.remove('game-immersive-lock');
  }
}
