/**
 * Entrée SSR utilisée par scripts/mirage-fullscreen-check.mjs —
 * `npm run check:mirage-fullscreen`.
 *
 * Joue le plein écran de Mirage Rush dans jsdom, avec la vraie page (/jeu) et la
 * vraie fenêtre de course en ligne : seul le moteur 3D est remplacé par une
 * doublure (scripts/mirage-world-stub.jsx). jsdom n'a pas de Fullscreen API : on
 * en installe une doublure qui répond comme un navigateur (la demande aboutit un
 * instant plus tard, puis `fullscreenchange` part), qu'on peut aussi faire
 * refuser, faire attendre (`hold`) ou fermer « de l'extérieur » (Échap).
 *
 *   0. Plein écran « de base » : l'interface se lance en plein écran (couche
 *      fixe posée au montage, sans geste) ; le premier geste du joueur demande
 *      le plein écran natif ; le bouton de la barre le referme.
 *   1. Ordinateur : une fois le plein écran de base quitté, le clic sur une
 *      carte de map ne touche pas à l'écran.
 *   2. « LANCER EN PLEIN ÉCRAN » (Rapide, puis Coupe) : plein écran natif sur la
 *      coque du jeu, couche fixe, verrou de défilement, bouton de la barre
 *      allumé. Le navigateur le referme (Échap) : la course passe en pause, la
 *      page se remet en forme, et Échap reprend.
 *   3. Touche F : ouvre et ferme ; F majuscule aussi ; Ctrl/Cmd/Alt + F (le
 *      navigateur garde sa recherche), touche maintenue et saisie de texte
 *      sont ignorés.
 *   4. Un plein écran demandé à la main reste en revenant à l'intro et en
 *      relançant ; le bouton de la barre le ferme.
 *   5. Toucher une map En ligne depuis le plein écran le referme (la page
 *      devient le lobby) ; F ne fait rien dans le lobby.
 *   6. Sans Fullscreen API (iPhone, iframe) : la couche fixe seule suffit, F la
 *      referme sans appeler `exitFullscreen`.
 *   7. Double bascule avant la réponse du navigateur : rien ne reste en plein
 *      écran natif avec la mise en page fenêtrée.
 *   8. Sortie en cours : la mise en page plein écran reste tant que le navigateur
 *      n'a pas fini (la piste ne rétrécit pas dans une fenêtre encore plein
 *      écran), une nouvelle bascule est ignorée, et un navigateur muet est
 *      rattrapé par le délai de sécurité.
 *   9. Téléphone (pointeur grossier) et application Android : le clic sur une
 *      carte ouvre le plein écran natif tout seul, sans second bouton ; le
 *      plein écran de base reste au retour à l'intro ; sorti à la main, un
 *      nouveau clic sur une carte le rouvre.
 *  10. Course en ligne : bouton et touche F sur la fenêtre de course, plein
 *      écran refermé quand la fenêtre disparaît (arrivée). La fenêtre de course
 *      ne part jamais en plein écran de base (la coquille n'existe pas).
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import MirageRushPage from '../src/games/MirageRushPage';
import { resetLocalRoomsForTests } from '../src/games/mirageRooms';
import { worldProbe } from './mirage-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

// Les délais du compte à rebours (≈ 3 s) et le délai de sécurité d'une sortie de plein
// écran (1 s) sont raccourcis ; `state.max` peut être relevé le temps d'un test qui doit
// observer l'attente d'une sortie.
function patchTimers() {
  const original = window.setTimeout;
  const state = { max: 10 };
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, state.max), ...args);
  return { state, restore: () => { window.setTimeout = original; } };
}

async function mountPage(entry) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <MirageRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await act(async () => { await sleep(30); });
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

// Horloge `performance` : `Date.now` est décalé dans le test En ligne.
async function until(read, label, timeout = 5000) {
  const start = performance.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await act(async () => { await sleep(10); });
  }
}

const click = (el) => act(async () => { el.click(); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });

/** Appuie sur une touche ; rend l'évènement pour lire `defaultPrevented`. */
async function press(key, init = {}, target = window) {
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  await act(async () => { target.dispatchEvent(event); });
  return event;
}

/**
 * Fullscreen API de remplacement. `element` est l'élément en plein écran ; `requests` et
 * `exits` comptent les appels. `refuse` : la demande est rejetée. `hold` : le navigateur ne
 * répond pas tout de suite, `release()` termine ce qui attend. `browserExit()` : le
 * navigateur referme de lui-même (Échap, geste « retour » d'Android).
 */
function installFullscreenApi() {
  const api = { element: null, requests: 0, exits: 0, refuse: false, hold: false, pending: [] };
  const later = (work) => new Promise((resolve) => {
    const run = () => { work(); resolve(); };
    if (api.hold) api.pending.push(run);
    else queueMicrotask(run);
  });
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
  api.browserExit = () => act(async () => { api.element = null; changed(); });
  api.release = () => act(async () => {
    api.hold = false;
    api.pending.splice(0).forEach((run) => run());
    await sleep(5);
  });
  api.uninstall = () => {
    delete document.fullscreenElement;
    delete document.exitFullscreen;
    delete window.HTMLElement.prototype.requestFullscreen;
  };
  return api;
}

// ── Lecture de la page ──────────────────────────────────────────────────────

const OPEN = { native: true, layer: true, locked: true, pressed: 'true' };
const CLOSED = { native: false, layer: false, locked: false, pressed: 'false' };
const LAYER_ONLY = { native: false, layer: true, locked: true, pressed: 'true' };

const locked = () => document.body.classList.contains('game-immersive-lock');
const shellOf = (node) => node.querySelector('.mirage-game-shell');
const toggleOf = (node) => node.querySelector('.mirage-game-controls-top .mirage-fullscreen-button');
const launchFullscreenOf = (node) => node.querySelector('.mirage-stage-actions .mirage-fullscreen-launch');
// Le lancement se fait au clic sur la carte d'une map (plus de bouton « LANCER »).
const mapCardOf = (node) => node.querySelector('.mirage-stage-picker .mirage-map-card:not(:disabled)');
const startOf = (node) => node.querySelector('.mirage-stage-actions .mirage-start-button');
const backOf = (node) => node.querySelector('.mirage-back-game-button');

/** Plein écran de la coque du jeu : natif, couche fixe, verrou, bouton de la barre. */
const shellState = (node, api) => ({
  native: api.element !== null && api.element === shellOf(node),
  layer: shellOf(node).classList.contains('is-immersive'),
  locked: locked(),
  pressed: toggleOf(node).getAttribute('aria-pressed'),
});

/** Plein écran de la fenêtre de course en ligne (le fond de la fenêtre de résultats porte la même classe : on part du dialogue). */
const popupState = (node, api) => {
  const backdrop = node.querySelector('.mirage-game-popup')?.parentElement;
  return {
    native: api.element !== null && api.element === backdrop,
    layer: Boolean(backdrop?.classList.contains('is-immersive')),
    locked: locked(),
    pressed: node.querySelector('.mirage-game-popup .mirage-fullscreen-button')?.getAttribute('aria-pressed'),
  };
};

const mark = (api) => ({ requests: api.requests, exits: api.exits });
// Jamais d'élément DOM dans une assertion : en cas d'échec, Node inspecterait tout le graphe de
// jsdom (des Go de mémoire) au lieu d'afficher le message. On compare des booléens.
const nothingNative = (api) => api.element === null;
const since = (api, before) => ({ requests: api.requests - before.requests, exits: api.exits - before.exits });

const waitForIntroStep = (node, step) => until(() => node.querySelector(`.mirage-intro-overlay.is-${step}-step`), `l’écran « ${step} » de l’intro`);
const waitForCountdown = (node) => until(() => node.querySelector('.mirage-countdown-overlay'), 'le compte à rebours');
const waitForRace = (node) => until(() => node.querySelector('.mirage-hud'), 'le départ de la course');
const waitForPause = (node) => until(() => node.querySelector('.mirage-pause-overlay'), 'la pause');

/** Écran 01 → écran 02 du mode `index` (0 Rapide, 1 Duel, 2 Coupe, 3 En ligne) : les cartes à toucher. */
async function openStage(node, index) {
  const intro = await waitForIntroStep(node, 'mode');
  await click(intro.querySelectorAll('.mirage-mode-action')[index]);
  await waitForIntroStep(node, 'stage');
  await until(() => mapCardOf(node), 'les cartes de map de l’écran 02');
}

export async function checkMirageFullscreen(assert) {
  window.localStorage.clear();
  const api = installFullscreenApi();
  const timers = patchTimers();
  try {
    // ── 0-5. Ordinateur ─────────────────────────────────────────────────────
    {
      const { node, unmount } = await mountPage('/jeu');
      // 0. Plein écran « de base » : la couche fixe couvre tout le viewport dès
      // l'ouverture de la page ; le natif attend le premier geste du joueur
      // (le navigateur refuse une demande hors geste).
      assert.deepEqual(shellState(node, api), LAYER_ONLY, 'l’interface se lance en plein écran de base (couche fixe)');
      assert.equal(api.requests, 0, 'aucune demande native avant un geste du joueur');
      const toggle = toggleOf(node);
      assert.ok(toggle, 'le bouton « Plein écran » est dans la barre du jeu dès l’intro');
      assert.equal(toggle.getAttribute('aria-pressed'), 'true', 'le bouton de la barre reflète le plein écran de base');
      assert.equal(toggle.getAttribute('aria-label'), 'Plein écran');
      assert.equal(squash(toggle.textContent), 'PLEIN ÉCRAN');
      assert.ok(toggle.querySelector('svg.game-fullscreen-icon'), 'icône dessinée en SVG (pas de glyphe absent des polices)');
      assert.match(toggle.title, /\(F\)/, 'l’infobulle annonce la touche F');
      assert.ok(!launchFullscreenOf(node), 'déjà en plein écran : pas de bouton « LANCER EN PLEIN ÉCRAN »');

      // Le premier geste du joueur demande le plein écran natif.
      await act(async () => {
        node.querySelector('.mirage-mode-action').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
      });
      await settle();
      assert.deepEqual(shellState(node, api), OPEN, 'le premier geste ouvre le plein écran natif');
      assert.equal(api.requests, 1, 'une demande native au premier geste');

      // Sortie explicite : la suite vérifie les commandes depuis la page en fenêtre.
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'le bouton de la barre referme le plein écran de base');

      // 1. Une fois le plein écran quitté, toucher une carte ne le rouvre pas, sur ordinateur.
      await openStage(node, 0);
      const secondary = launchFullscreenOf(node);
      assert.equal(startOf(node), null, 'plus de bouton « LANCER LA PARTIE » : la carte est le bouton');
      assert.ok(mapCardOf(node), 'les cartes de map sont affichées');
      assert.ok(node.querySelector('.mirage-picker-hint'), 'la consigne annonce que le clic lance la partie');
      assert.ok(secondary, 'plein écran quitté : un second bouton lance directement en plein écran');
      assert.match(squash(secondary.textContent), /^LANCER EN PLEIN ÉCRAN$/);
      assert.equal(secondary.disabled, false, 'actif dès que le moteur est prêt');
      assert.ok(!secondary.classList.contains('mirage-start-button'), 'bouton à part : le lancement direct en plein écran reste une option');
      assert.ok(node.querySelector('.mirage-intro-overlay kbd') && /F\s*plein écran/i.test(squash(node.querySelector('.mirage-intro-overlay').textContent)), 'le rappel « F plein écran » figure dans les commandes');
      await click(mapCardOf(node));
      await waitForRace(node);
      assert.deepEqual(shellState(node, api), CLOSED, 'le clic sur une carte : la course part dans la page');
      assert.equal(api.requests, 1, 'aucune nouvelle demande de plein écran sans qu’on l’ait faite');
      await click(backOf(node));
      await waitForIntroStep(node, 'mode');

      // 2. « LANCER EN PLEIN ÉCRAN » : natif + couche fixe + verrou, la course part.
      await openStage(node, 0);
      const beforeLaunch = mark(api);
      await click(launchFullscreenOf(node));
      assert.deepEqual(shellState(node, api), OPEN, 'plein écran natif sur la coque, couche fixe, verrou, bouton allumé');
      assert.deepEqual(since(api, beforeLaunch), { requests: 1, exits: 0 });
      assert.equal(toggleOf(node).querySelector('svg path').getAttribute('d').startsWith('M6 2'), true, 'l’icône passe à « réduire »');
      assert.ok(!launchFullscreenOf(node), 'le second bouton disparaît une fois en plein écran');
      await waitForCountdown(node);
      await waitForRace(node);
      assert.deepEqual(shellState(node, api), OPEN, 'toujours en plein écran pendant la course');

      // Le navigateur referme (Échap, geste « retour ») : la course se met en pause.
      const beforeExit = mark(api);
      await api.browserExit();
      await waitForPause(node);
      assert.deepEqual(shellState(node, api), CLOSED, 'la page reprend sa forme, le verrou est levé');
      assert.deepEqual(since(api, beforeExit), { requests: 0, exits: 0 }, 'sortie venue du navigateur : on ne rappelle pas exitFullscreen');
      await press('Escape');
      await until(() => !node.querySelector('.mirage-pause-overlay') && node.querySelector('.mirage-hud'), 'la reprise');
      assert.deepEqual(shellState(node, api), CLOSED, 'Échap reprend la course dans la page');

      // 3. Touche F.
      let before = mark(api);
      const f = await press('f');
      assert.deepEqual(shellState(node, api), OPEN, 'F ouvre le plein écran en pleine course');
      assert.equal(f.defaultPrevented, true);
      assert.deepEqual(since(api, before), { requests: 1, exits: 0 });
      await press('f');
      assert.deepEqual(shellState(node, api), CLOSED, 'F referme');
      assert.deepEqual(since(api, before), { requests: 1, exits: 1 });
      assert.ok(node.querySelector('.mirage-hud') && !node.querySelector('.mirage-pause-overlay'), 'F n’a pas mis la course en pause (c’est un choix du joueur, pas une sortie du navigateur)');

      await press('F');
      assert.deepEqual(shellState(node, api), OPEN, 'F majuscule (Maj ou verrouillage) aussi');
      const ignored = [
        ['touche maintenue', { repeat: true }],
        ['Ctrl + F', { ctrlKey: true }],
        ['Cmd + F', { metaKey: true }],
        ['Alt + F', { altKey: true }],
      ];
      for (const [label, init] of ignored) {
        const event = await press('f', init);
        assert.deepEqual(shellState(node, api), OPEN, `${label} : plein écran inchangé`);
        assert.equal(event.defaultPrevented, false, `${label} : le navigateur garde son raccourci`);
      }
      const field = document.createElement('input');
      document.body.append(field);
      await press('f', {}, field);
      field.remove();
      assert.deepEqual(shellState(node, api), OPEN, 'taper un « f » dans un champ ne bascule rien');
      await press('f');
      assert.deepEqual(shellState(node, api), CLOSED);

      // 4. Plein écran demandé : il reste en revenant à l'intro et en relançant.
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), OPEN, 'le bouton de la barre ouvre');
      before = mark(api);
      await click(backOf(node));
      await waitForIntroStep(node, 'mode');
      assert.deepEqual(shellState(node, api), OPEN, 'RETOUR au choix du mode : le plein écran demandé reste');
      await openStage(node, 0);
      assert.ok(!launchFullscreenOf(node), 'déjà en plein écran : pas de second bouton');
      await click(mapCardOf(node));
      await waitForRace(node);
      assert.deepEqual(shellState(node, api), OPEN, 'relancer garde le plein écran');
      assert.deepEqual(since(api, before), { requests: 0, exits: 0 }, 'sans nouvelle demande au navigateur');
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'le bouton de la barre referme');
      assert.equal(since(api, before).exits, 1);

      // 5. Lobby EN LIGNE depuis le plein écran : refermé ; F ne fait rien dans le lobby.
      resetLocalRoomsForTests({ seed: false });
      await click(backOf(node));
      await waitForIntroStep(node, 'mode');
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), OPEN);
      await openStage(node, 3);
      before = mark(api);
      await click(mapCardOf(node));
      await until(() => !shellOf(node), 'le lobby remplace la page de jeu');
      await settle();
      assert.equal(nothingNative(api), true, 'ouvrir les salons referme le plein écran');
      assert.equal(locked(), false, 'et lève le verrou de défilement');
      assert.equal(since(api, before).exits, 1);
      before = mark(api);
      await press('f');
      assert.deepEqual(since(api, before), { requests: 0, exits: 0 }, 'F ne fait rien dans le lobby (pas de course à agrandir)');
      await unmount();
    }

    // 2 bis. Coupe : plein écran de base dès l'ouverture ; « LANCER EN PLEIN
    // ÉCRAN » (une fois le plein écran quitté) lance la coupe en plein écran.
    {
      const { node, unmount } = await mountPage('/jeu?mode=cup');
      assert.deepEqual(shellState(node, api), LAYER_ONLY, 'Coupe : l’interface se lance aussi en plein écran de base');
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'sortie explicite pour retrouver le bouton de lancement');
      await until(() => launchFullscreenOf(node), 'le bouton de plein écran de la coupe');
      await click(launchFullscreenOf(node));
      assert.deepEqual(shellState(node, api), OPEN, 'Coupe : plein écran');
      await waitForCountdown(node);
      assert.match(squash(node.querySelector('.mirage-countdown-overlay .mirage-overlay-kicker').textContent), /COURSE 1 \/ 3/, 'c’est bien la première course de la coupe');
      await waitForRace(node);
      assert.deepEqual(shellState(node, api), OPEN);
      await unmount();
      assert.deepEqual([nothingNative(api), locked()], [true, false], 'quitter la page referme le plein écran et lève le verrou');
    }

    // ── 6-8. Cas limites du navigateur ──────────────────────────────────────
    {
      const { node, unmount } = await mountPage('/jeu');
      await openStage(node, 0);

      // 6. Sans Fullscreen API (demande refusée) : la couche fixe seule suffit.
      // Le plein écran de base est posé au montage : on le quitte, puis on le
      // redemande pendant que le navigateur refuse.
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'le bouton de la barre referme le plein écran de base');
      api.refuse = true;
      let before = mark(api);
      await click(toggleOf(node));
      await settle();
      assert.deepEqual(shellState(node, api), LAYER_ONLY, 'demande refusée : le jeu occupe quand même tout l’écran');
      await press('f');
      assert.deepEqual(shellState(node, api), CLOSED, 'F referme la couche fixe');
      assert.deepEqual(since(api, before), { requests: 2, exits: 0 }, 'sans plein écran natif, pas d’appel à exitFullscreen (une demande refusée par geste)');
      api.refuse = false;

      // 7. Double bascule avant la réponse du navigateur.
      api.hold = true;
      before = mark(api);
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), LAYER_ONLY, 'la couche fixe est posée tout de suite');
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'refermée aussitôt');
      await api.release();
      assert.equal(nothingNative(api), true, 'quand le navigateur répond enfin, on ne reste pas en plein écran natif');
      assert.deepEqual(shellState(node, api), CLOSED);
      assert.deepEqual(since(api, before), { requests: 1, exits: 1 }, 'la demande tardive est annulée par une sortie');

      // 8. Sortie en cours : la mise en page plein écran reste jusqu'à la fin.
      timers.state.max = 500;
      await click(toggleOf(node));
      await settle();
      assert.deepEqual(shellState(node, api), OPEN);
      api.hold = true;
      before = mark(api);
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), { ...OPEN }, 'sortie en cours : le navigateur est encore en plein écran, la mise en page aussi (pas de saut)');
      assert.deepEqual(since(api, before), { requests: 0, exits: 1 });
      await click(toggleOf(node));
      await press('f');
      assert.deepEqual(shellState(node, api), OPEN, 'une bascule pendant la sortie est ignorée');
      assert.deepEqual(since(api, before), { requests: 0, exits: 1 }, 'pas de nouvelle demande pendant la sortie');
      await api.release();
      assert.deepEqual(shellState(node, api), CLOSED, 'fin de la sortie : la page reprend sa forme');

      // Navigateur muet : le délai de sécurité rend la page quand même.
      timers.state.max = 500;
      await click(toggleOf(node));
      await settle();
      assert.deepEqual(shellState(node, api), OPEN);
      api.hold = true;
      timers.state.max = 10;
      await click(toggleOf(node));
      await settle(60);
      assert.deepEqual(shellState(node, api), { native: true, layer: false, locked: false, pressed: 'false' }, 'sans fullscreenchange, le délai de sécurité remet la page en forme (le navigateur, lui, n’a pas encore répondu)');
      await api.release();
      assert.deepEqual(shellState(node, api), CLOSED, 'l’évènement tardif ne rouvre ni ne pause rien');
      timers.state.max = 10;
      await unmount();
      assert.deepEqual([nothingNative(api), locked()], [true, false], 'rien ne traîne après la page');
    }

    // ── 9. Téléphone et application Android ─────────────────────────────────
    const devices = [
      ['téléphone (pointeur grossier)', () => {
        window.matchMedia = (query) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {} });
      }, () => { delete window.matchMedia; }],
      ['application Android (pont LetsPlayAndroid)', () => { window.LetsPlayAndroid = {}; }, () => { delete window.LetsPlayAndroid; }],
    ];
    for (const [label, install, uninstall] of devices) {
      install();
      try {
        const { node, unmount } = await mountPage('/jeu');
        assert.deepEqual(shellState(node, api), LAYER_ONLY, `${label} : l’interface se lance en plein écran de base (couche fixe)`);
        await openStage(node, 0);
        assert.ok(!launchFullscreenOf(node), `${label} : pas de second bouton, toucher une carte ouvre déjà le plein écran`);
        const before = mark(api);
        await click(mapCardOf(node));
        assert.deepEqual(shellState(node, api), OPEN, `${label} : toucher une carte ouvre le plein écran natif tout seul`);
        assert.equal(since(api, before).requests, 1);
        await waitForRace(node);
        await click(backOf(node));
        await waitForIntroStep(node, 'mode');
        await settle();
        assert.deepEqual(shellState(node, api), OPEN, `${label} : plein écran de base — il reste au retour à l’intro`);
        assert.equal(since(api, before).exits, 0, `${label} : aucune sortie demandée au navigateur`);

        // Sorti à la main, le plein écran se referme ; un nouveau clic sur une
        // carte le rouvre (téléphone et application lancent toujours en plein écran).
        await click(toggleOf(node));
        assert.deepEqual(shellState(node, api), CLOSED, `${label} : le bouton de la barre referme`);
        await openStage(node, 0);
        await click(mapCardOf(node));
        await waitForRace(node);
        assert.deepEqual(shellState(node, api), OPEN, `${label} : le lancement rouvre le plein écran`);
        await unmount();
      } finally {
        uninstall();
      }
    }

    // ── 10. Course en ligne : fenêtre de course ─────────────────────────────
    timers.restore();
    // Même méthode que check:mirage-scoreboard : on avance l'horloge du salon d'un coup plutôt
    // que d'attendre les 5 s de départ.
    const realNow = Date.now.bind(Date);
    let skew = 0;
    Date.now = () => realNow() + skew;
    resetLocalRoomsForTests({ seed: false });
    const online = await mountPage('/jeu?mode=online');
    try {
      const byText = (selector, text) => [...online.node.querySelectorAll(selector)].find((el) => squash(el.textContent).includes(text));
      await click(byText('button', 'CRÉER ROOM'));
      await click(byText('button', 'CRÉER LA ROOM'));
      await until(() => online.node.querySelector('.mirage-room-header-panel'), 'le salon est créé', 8000);
      await click(byText('button', 'SE METTRE PRÊT'));
      const launch = await until(() => {
        const button = online.node.querySelector('.mirage-launch-party-btn');
        return button && !button.disabled ? button : null;
      }, 'le bouton de lancement est actif', 8000);
      await click(launch);
      await until(() => online.node.querySelector('.mirage-game-popup'), 'la fenêtre de course s’ouvre', 8000);
      skew = 6000;
      await until(() => squash(online.node.querySelector('.mirage-game-popup')?.textContent).includes('COURSE EN COURS'), 'la course démarre', 8000);

      const toggle = () => online.node.querySelector('.mirage-game-popup .mirage-fullscreen-button');
      assert.ok(toggle(), 'la barre de la fenêtre de course porte le bouton « Plein écran »');
      assert.equal(toggle().getAttribute('aria-label'), 'Plein écran');
      assert.equal(toggle().closest('.mirage-popup-actions') === online.node.querySelector('.mirage-popup-leave-button').closest('.mirage-popup-actions'), true, 'groupé avec « QUITTER LA ROOM »');
      assert.deepEqual(popupState(online.node, api), CLOSED, 'la fenêtre s’ouvre en fenêtre : le départ vient du serveur, sans geste du joueur');

      let before = mark(api);
      await click(toggle());
      assert.deepEqual(popupState(online.node, api), OPEN, 'le bouton met la fenêtre de course en plein écran (natif sur son arrière-plan)');
      assert.deepEqual(since(api, before), { requests: 1, exits: 0 });
      await press('f');
      assert.deepEqual(popupState(online.node, api), CLOSED, 'F referme');
      await press('f');
      assert.deepEqual(popupState(online.node, api), OPEN, 'F rouvre');
      const typing = document.createElement('input');
      document.body.append(typing);
      await press('f', {}, typing);
      typing.remove();
      assert.deepEqual(popupState(online.node, api), OPEN, 'F tapé dans un champ est ignoré');
      const keep = await press('f', { ctrlKey: true });
      assert.equal(keep.defaultPrevented, false);
      assert.deepEqual(popupState(online.node, api), OPEN, 'Ctrl + F : recherche du navigateur, rien ne bascule');
      assert.ok(online.node.querySelector('.mirage-game-popup'), 'la course continue en plein écran');
      assert.ok(squash(online.node.querySelector('.mirage-game-popup').textContent).includes('COURSE EN COURS'));

      // Sortie du navigateur : la course en ligne ne s'arrête pas, la fenêtre reste ouverte.
      await api.browserExit();
      assert.deepEqual(popupState(online.node, api), CLOSED, 'Échap : on retrouve la fenêtre');
      assert.ok(squash(online.node.querySelector('.mirage-game-popup').textContent).includes('COURSE EN COURS'), 'sans pause : une course en ligne continue');
      await click(toggle());
      assert.deepEqual(popupState(online.node, api), OPEN);

      // L'arrivée ferme la fenêtre de course : le plein écran ne lui survit pas (les résultats
      // s'ouvrent dans la page, hors de l'élément en plein écran).
      before = mark(api);
      await act(async () => {
        worldProbe.props.onFinish({ mode: 'online', score: 2150, gems: 12, duration: 50, distance: 800, lane: 1, jump: 0 });
      });
      await until(() => online.node.querySelector('.mirage-results-dialog'), 'la fenêtre de résultats s’ouvre', 8000);
      await settle();
      assert.ok(!online.node.querySelector('.mirage-game-popup'), 'la fenêtre de course a disparu');
      assert.equal(nothingNative(api), true, 'à l’arrivée, le plein écran est refermé : les résultats sont visibles');
      assert.equal(locked(), false);
      assert.equal(since(api, before).exits, 1);
    } finally {
      Date.now = realNow;
      await online.unmount();
    }
    assert.deepEqual([nothingNative(api), locked()], [true, false], 'rien ne traîne en fin de test');
  } finally {
    timers.restore();
    api.uninstall();
  }
}
