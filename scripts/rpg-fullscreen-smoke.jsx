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
 *   4. **Au doigt** (pointeur grossier : téléphone, tablette, application), le
 *      plein écran est **obligatoire** : la couche immersive est posée dès le
 *      montage (aucune demande native, le navigateur l'exigerait dans un geste),
 *      le premier appui demande le plein écran natif, et **aucun bouton ne
 *      permet d'en sortir** — ni au menu, ni dans la barre du duel.
 *   5. Une sortie imposée par le navigateur (geste « retour » d'Android, Échap)
 *      est rattrapée : la couche immersive revient aussitôt, le natif repart au
 *      geste suivant. La partie ne retombe jamais dans une fenêtre.
 *   6. Démontage : le verrou de défilement est rendu et le plein écran refermé.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { installerDeckMaisonDeTest } from './rpg-duel-start.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

// 26 cartes Sable/Eau conformes à `rpgValiderDeck` : sans deck maison,
// l'étagère du menu est vide (`RPG_DECKS`) et aucune partie ne peut se lancer.
const REMPLISSAGE = [
  'tercio-de-cuivre',
  'pilote-de-la-carreira',
  'le-renegat',
  'negociant-des-ranscons',
  'galion-de-la-flotte',
  'le-routier',
  'le-grand-debarquement',
  'haut-fond',
  'vipere-de-verre',
  'lettre-de-marque',
  'grappin-d-abordage',
  'baton-des-citernes',
  'cotre-de-course',
].flatMap((id) => [id, id]);
const DECK_JOUEUR = [...REMPLISSAGE, 'kenshi-de-la-forge', 'kenshi-de-la-forge', 'mousse-des-galiotes', 'mousse-des-galiotes'];

async function mountPage() {
  installerDeckMaisonDeTest(DECK_JOUEUR, 'maison-plein-ecran');
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_JOUEUR} rng={() => 0.999} />));
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
/** Attend qu'un sélecteur apparaisse dans la page (les volets s'ouvrent en deux temps). */
async function attendre(node, selecteur) {
  for (let essai = 0; essai < 40; essai += 1) {
    const trouve = node.querySelector(selecteur);
    if (trouve) return trouve;
    await settle(10);
  }
  return null;
}

const lancerDuel = async (node) => {
  await click(menuTabOf(node, 'Deck'));
  await settle();
  const boitier = await attendre(node, '.rpg-deck-choice__button');
  if (boitier) await click(boitier);
  await settle();
  const lancer = await attendre(node, '.rpg-deck-detail__play');
  if (lancer) await click(lancer);
  await settle();
  return Boolean(lancer);
};

/** Plein écran de la coque : natif, couche fixe, verrou de défilement, bouton allumé. */
const stateOf = (node, api) => ({
  native: api.element !== null && api.element === shellOf(node),
  layer: shellOf(node).classList.contains('is-immersive'),
  locked: document.body.classList.contains('game-immersive-lock'),
  pressed: toggleOf(node)?.getAttribute('aria-pressed') ?? null,
});
/** Même état, mais sans bouton : au doigt, il n'en existe aucun. */
const LAYER_LOCKED = { native: false, layer: true, locked: true, pressed: null };
const LAYER_LOCKED_NATIVE = { native: true, layer: true, locked: true, pressed: null };

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

    // Au doigt (téléphone, tablette, application), le plein écran est
    // OBLIGATOIRE : la couche immersive est posée dès le montage, le natif part
    // au premier geste, et aucun bouton ne permet d'en sortir.
    const restaurerPointeur = installCoarsePointer();
    try {
      const avantTelephone = counts(api);
      const telephone = await mountPage();
      assert.deepEqual(stateOf(telephone.node, api), LAYER_LOCKED,
        'au doigt, le jeu occupe tout l’écran dès le montage — sans geste, et sans plein écran natif');
      assert.deepEqual(since(api, avantTelephone), { requests: 0, exits: 0 },
        'aucune demande native au montage : le navigateur l’exigerait dans un geste');
      assert.equal(menuToggleOf(telephone.node), null,
        'le menu n’offre aucun bouton de plein écran au doigt : il n’y a pas de sortie');
      assert.equal(telephone.node.querySelectorAll('.rpg-duel-nav__fullscreen').length, 0,
        'la barre du duel non plus');

      // Le premier appui demande le plein écran natif, dans le geste.
      const avantGeste = counts(api);
      await touch(shellOf(telephone.node));
      await settle();
      assert.deepEqual(stateOf(telephone.node, api), LAYER_LOCKED_NATIVE,
        'au premier appui, le plein écran natif part dans le geste');
      assert.deepEqual(since(api, avantGeste), { requests: 1, exits: 0 },
        'une seule demande native : la couche immersive, elle, était déjà là');

      // Un second appui ne redemande rien : le plein écran est déjà ouvert.
      const avantSecond = counts(api);
      await touch(shellOf(telephone.node));
      await settle();
      assert.deepEqual(since(api, avantSecond), { requests: 0, exits: 0 },
        'tant que le plein écran natif tient, aucun appui ne le redemande');

      // Le navigateur referme (geste « retour ») : la partie ne retombe pas dans
      // une fenêtre, la couche immersive revient aussitôt.
      await api.browserExit();
      await settle();
      assert.deepEqual(stateOf(telephone.node, api), LAYER_LOCKED,
        'une sortie imposée par le navigateur est rattrapée : le jeu reste plein écran');
      const avantRetour = counts(api);
      await touch(shellOf(telephone.node));
      await settle();
      assert.deepEqual(stateOf(telephone.node, api), LAYER_LOCKED_NATIVE,
        'au geste suivant, le plein écran natif repart');
      assert.equal(since(api, avantRetour).requests, 1, 'une nouvelle demande, dans ce geste-là');

      // Lancer une partie ne change rien : on y est déjà.
      const avantPartie = counts(api);
      await lancerDuel(telephone.node);
      await settle();
      assert.deepEqual(stateOf(telephone.node, api), LAYER_LOCKED_NATIVE,
        'au doigt, la partie se joue en plein écran, comme le menu');
      assert.deepEqual(since(api, avantPartie), { requests: 0, exits: 0 },
        'le lancement ne redemande rien : le plein écran est déjà tenu');
      assert.equal(shellOf(telephone.node).dataset.scene, 'duel', 'la partie est bien lancée');
      assert.equal(telephone.node.querySelector('.rpg-duel-nav__fullscreen'), null,
        'pendant le duel, la barre ne propose toujours aucune sortie');

      // La touche F ne referme rien au doigt.
      const touche = await press('f');
      await settle();
      assert.equal(touche.defaultPrevented, false, 'au doigt, F n’est plus la bascule du plein écran');
      assert.deepEqual(stateOf(telephone.node, api), LAYER_LOCKED_NATIVE,
        'et le plein écran reste ouvert');

      await telephone.unmount();
      assert.equal(api.element, null, 'quitter la page ferme le plein écran du duel');
      assert.equal(document.body.classList.contains('game-immersive-lock'), false,
        'et rend le défilement de la page');
    } finally {
      restaurerPointeur();
    }
    api.uninstall();
  } finally {
    api.uninstall();
    document.body.classList.remove('game-immersive-lock');
  }
}
