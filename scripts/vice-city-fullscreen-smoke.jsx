/**
 * Entrée SSR utilisée par scripts/vice-city-fullscreen-check.mjs —
 * `npm run check:vice-city-fullscreen`.
 *
 * Joue le plein écran de Vice City Rush dans jsdom, avec la vraie page
 * (`/jeu/vice-city-rush`) : seul le moteur 3D est remplacé par une doublure
 * (scripts/vice-city-world-stub.jsx). jsdom n'a pas de Fullscreen API : on en
 * installe une doublure qui répond comme un navigateur (la demande aboutit un
 * instant plus tard, puis `fullscreenchange` part), qu'on peut aussi faire
 * refuser, faire attendre (`hold`) ou fermer « de l'extérieur » (Échap).
 *
 *   0. Plein écran « de base » : l'interface se lance en plein écran (couche
 *      fixe `is-immersive` posée au montage, sans geste) ; le premier geste du
 *      joueur demande le plein écran natif ; le bouton de la barre le referme.
 *   1. Plein écran demandé : il reste en changeant d'écran d'intro, pendant le
 *      compte à rebours, la course et l'arrivée (le jeu ne le referme pas de
 *      lui-même).
 *   2. Si le navigateur referme le plein écran (Échap, geste « retour ») en
 *      pleine course, la course passe en pause ; « REPRENDRE » rend l'écran
 *      quitté — la course, ou le compte à rebours.
 *   3. Touche F : ouvre et referme ; F majuscule aussi ; Ctrl/Cmd/Alt + F (le
 *      navigateur garde sa recherche), touche maintenue et saisie de texte sont
 *      ignorés.
 *   4. Sans Fullscreen API (iPhone, iframe) : la couche fixe seule suffit, F la
 *      referme sans appeler `exitFullscreen`.
 *   5. Double bascule avant la réponse du navigateur : rien ne reste en plein
 *      écran natif avec la mise en page fenêtrée.
 *   6. Sortie en cours : la mise en page plein écran reste tant que le
 *      navigateur n'a pas fini (la piste ne rétrécit pas dans une fenêtre encore
 *      plein écran), une nouvelle bascule est ignorée, et un navigateur muet est
 *      rattrapé par le délai de sécurité.
 *   7. Téléphone (pointeur grossier) et application Android : le lancement d'une
 *      course demande le plein écran natif dans le geste, et cette ouverture
 *      automatique se referme à l'arrivée (retour à la page).
 *   8. Quitter la page en plein écran rend le navigateur et le verrou.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { worldProbe } from './vice-city-world-stub.jsx';

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
    <MemoryRouter initialEntries={[entry]}>
      <ViceCityRushPage />
    </MemoryRouter>,
  ));
  await act(async () => { await sleep(30); });
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

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
const shellOf = (node) => node.querySelector('.city-rush-shell');
const toggleOf = (node) => node.querySelector('.city-rush-top-actions .city-rush-fullscreen-button');
// Les vignettes font avancer le parcours de lancement : mode → course → voiture.
const modeCardOf = (node, index = 0) => node.querySelectorAll('.city-rush-mode-card')[index];
const cityCardOf = (node, index = 0) => node.querySelectorAll('.city-rush-city-card')[index];
const carCardOf = (node, index = 0) => node.querySelectorAll('.city-rush-car-card')[index];
const resumeOf = (node) => node.querySelector('.city-rush-pause-overlay .city-rush-start-button');
// Écran de préparation : la fenêtre porte `is-intro` et prend la hauteur du hub
// (les vignettes de mode ne sont pas enfermées dans une zone défilante).
const viewportOf = (node) => node.querySelector('.city-rush-viewport');
const introHubOf = (node) => node.querySelector('.city-rush-intro:not(.city-rush-story-cinematic)');

/** Plein écran de la coque du jeu : natif, couche fixe, verrou, bouton de la barre. */
const shellState = (node, api) => ({
  native: api.element !== null && api.element === shellOf(node),
  layer: shellOf(node).classList.contains('is-immersive'),
  locked: locked(),
  pressed: toggleOf(node).getAttribute('aria-pressed'),
});

const mark = (api) => ({ requests: api.requests, exits: api.exits });
// Jamais d'élément DOM dans une assertion : en cas d'échec, Node inspecterait tout le graphe de
// jsdom (des Go de mémoire) au lieu d'afficher le message. On compare des booléens.
const nothingNative = (api) => api.element === null;
const since = (api, before) => ({ requests: api.requests - before.requests, exits: api.exits - before.exits });

const waitForIntroStep = (node, label) => until(() => {
  const active = node.querySelector('.city-rush-stepper-item.is-active');
  return active && squash(active.textContent).includes(label) ? active : null;
}, `l’écran « ${label} » de l’intro`);
const waitForCountdown = (node) => until(() => node.querySelector('.city-rush-countdown'), 'le compte à rebours');
const waitForRace = (node) => until(() => node.querySelector('.city-rush-hud-top'), 'le départ de la course');
const waitForPause = (node) => until(() => node.querySelector('.city-rush-pause-overlay'), 'la pause');
const waitForResult = (node) => until(() => node.querySelector('.city-rush-result-overlay'), 'l’écran d’arrivée');

/** Écran MODE → VILLE → GARAGE : chaque vignette ouvre l'étape suivante. */
async function openGarage(node) {
  await waitForIntroStep(node, 'MODE');
  await click(modeCardOf(node));
  await waitForIntroStep(node, 'VILLE');
  await click(cityCardOf(node));
  await waitForIntroStep(node, 'GARAGE');
}

/** Fin de course, décidée par le test : le vrai moteur appelle `onFinish` à l'arrivée. */
async function finishRace(node, result = {}) {
  await waitForRace(node);
  await act(async () => {
    worldProbe.props.onFinish({
      city: 'vice-city',
      rank: 1,
      duration: 118.42,
      score: 1250,
      pickups: 6,
      winner: 'Nico Vega',
      laps: 3,
      ...result,
    });
  });
  await waitForResult(node);
}

export async function checkViceCityFullscreen(assert) {
  window.localStorage.clear();
  const api = installFullscreenApi();
  const timers = patchTimers();
  try {
    // ── 0-3. Ordinateur ─────────────────────────────────────────────────────
    {
      const { node, unmount } = await mountPage('/jeu/vice-city-rush');
      // 0. Plein écran « de base » : la couche fixe couvre tout le viewport dès
      // l'ouverture de la page ; le natif attend le premier geste du joueur
      // (le navigateur refuse une demande hors geste).
      assert.deepEqual(shellState(node, api), LAYER_ONLY, 'l’interface se lance en plein écran de base (couche fixe)');
      assert.equal(api.requests, 0, 'aucune demande native avant un geste du joueur');
      assert.equal(shellOf(node).id, 'vice-city-rush-console', 'c’est la coque du jeu qui occupe l’écran');
      const toggle = toggleOf(node);
      assert.ok(toggle, 'le bouton « Plein écran » est dans la barre du jeu dès l’intro');
      assert.equal(toggle.getAttribute('aria-pressed'), 'true', 'le bouton de la barre reflète le plein écran de base');
      assert.equal(toggle.getAttribute('aria-label'), 'Plein écran');
      assert.equal(squash(toggle.textContent), 'PLEIN ÉCRAN');
      assert.ok(toggle.querySelector('svg.game-fullscreen-icon'), 'icône dessinée en SVG (pas de glyphe absent des polices)');
      assert.match(toggle.title, /\(F\)/, 'l’infobulle annonce la touche F');
      assert.match(squash(node.querySelector('.city-rush-intro-foot').textContent), /F · PLEIN ÉCRAN/, 'le rappel « F · PLEIN ÉCRAN » figure dans les commandes');
      assert.equal(viewportOf(node).classList.contains('is-intro'), true, 'la fenêtre porte « is-intro » pendant la préparation (le hub prend sa hauteur)');
      assert.ok(introHubOf(node), 'le hub de préparation est dans la fenêtre');

      // Le premier geste du joueur demande le plein écran natif.
      await act(async () => {
        node.querySelector('.city-rush-stepper-item').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
      });
      await settle();
      assert.deepEqual(shellState(node, api), OPEN, 'le premier geste ouvre le plein écran natif');
      assert.equal(api.requests, 1, 'une demande native au premier geste');

      await click(node.querySelector('.city-rush-story-banner'));
      assert.ok(node.querySelector('.city-rush-story-cinematic'), 'la bannière histoire entière est cliquable');
      await click(node.querySelector('.city-rush-story-cinematic .city-rush-text-button'));
      await waitForIntroStep(node, 'MODE');

      // Le bouton de la barre referme le plein écran.
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'le bouton de la barre referme le plein écran');
      assert.equal(nothingNative(api), true, 'le navigateur a rendu l’écran');

      // 1. Plein écran demandé : il reste à travers l'intro, la course et l'arrivée.
      const field = document.createElement('input');
      document.body.append(field);
      await press('f', {}, field);
      field.remove();
      assert.deepEqual(shellState(node, api), CLOSED, 'taper un « f » dans un champ ne bascule rien');
      let before = mark(api);
      const f = await press('f');
      assert.deepEqual(shellState(node, api), OPEN, 'F ouvre le plein écran');
      assert.equal(f.defaultPrevented, true, 'F est bien le raccourci du jeu');
      assert.deepEqual(since(api, before), { requests: 1, exits: 0 });
      assert.equal(toggleOf(node).querySelector('svg path').getAttribute('d').startsWith('M6 2'), true, 'l’icône passe à « réduire »');

      await waitForIntroStep(node, 'MODE');
      await click(modeCardOf(node, 1));
      await waitForIntroStep(node, 'VILLE');
      assert.deepEqual(shellState(node, api), OPEN, 'la vignette de mode ouvre directement les courses');
      assert.equal(cityCardOf(node, 0).disabled, false, 'Vice City est ouvert au départ');
      assert.equal(cityCardOf(node, 1).disabled, true, 'New York reste verrouillé avant la première arrivée');
      await click(cityCardOf(node, 0));
      await waitForIntroStep(node, 'GARAGE');
      assert.deepEqual(shellState(node, api), OPEN, 'la vignette de course ouvre directement le garage');
      assert.equal(carCardOf(node, 0).disabled, false, 'la citadine offerte est disponible');
      assert.equal(carCardOf(node, 1).disabled, true, 'les voitures payantes restent verrouillées sans billets');
      const alternatePilot = node.querySelector('.city-rush-driver-pill:not(.is-player)');
      assert.ok(alternatePilot, 'le choix du pilote reste accessible avant le lancement par voiture');
      const chosenPilotName = alternatePilot.querySelector('.city-rush-driver-pill-copy b').firstChild.textContent;
      await click(alternatePilot);
      before = mark(api);
      await click(carCardOf(node, 0));
      assert.equal(worldProbe.props.cityId, 'vice-city', 'la course de départ est bien Vice City');
      assert.equal(worldProbe.props.carId, 'city-hatch', 'la citadine offerte est la voiture de départ');
      assert.equal(worldProbe.props.raceLaps, 1, 'le mode choisi est appliqué à la course');
      assert.equal(worldProbe.props.roster.find((racer) => racer.isPlayer)?.name, chosenPilotName, 'le pilote choisi avant la voiture est conservé');
      assert.equal(viewportOf(node).classList.contains('is-intro'), false, 'la fenêtre reprend sa hauteur de course au lancement');
      await waitForCountdown(node);
      assert.deepEqual(shellState(node, api), OPEN, 'toujours en plein écran pendant le compte à rebours');
      await waitForRace(node);
      assert.deepEqual(shellState(node, api), OPEN, 'et pendant la course');
      assert.deepEqual(since(api, before), { requests: 0, exits: 0 }, 'aucune nouvelle demande au navigateur : on y est déjà');

      await finishRace(node);
      assert.deepEqual(shellState(node, api), OPEN, 'un plein écran demandé reste à l’arrivée (le jeu ne le referme pas de lui-même)');
      assert.equal(node.querySelector('.city-rush-cash-reward'), null, 'une arrivée en Sprint ne crédite aucun billet vert');
      assert.match(squash(node.querySelector('.city-rush-course-unlocked-notice').textContent), /NEW YORK/, 'la prochaine course est débloquée à l’arrivée');
      assert.equal(since(api, before).exits, 0);

      // 2. Échap du navigateur en pleine course : la course passe en pause.
      await click(node.querySelector('.city-rush-result-overlay .city-rush-start-button'));
      await waitForRace(node);
      let mark_ = mark(api);
      await api.browserExit();
      await waitForPause(node);
      assert.deepEqual(shellState(node, api), CLOSED, 'la page reprend sa forme, le verrou est levé');
      assert.deepEqual(since(api, mark_), { requests: 0, exits: 0 }, 'sortie venue du navigateur : on ne rappelle pas exitFullscreen');
      assert.match(squash(node.querySelector('.city-rush-pause-overlay').textContent), /COURSE SUSPENDUE/, 'la course est bien suspendue');
      await click(resumeOf(node));
      await waitForRace(node);
      assert.ok(!node.querySelector('.city-rush-pause-overlay'), 'REPRENDRE relance la course');

      // Même chose pendant le compte à rebours : REPRENDRE rend le compte à rebours.
      await click(node.querySelector('.city-rush-top-button.is-quiet'));
      await waitForIntroStep(node, 'MODE');
      await press('f');
      assert.deepEqual(shellState(node, api), OPEN, 'F rouvre le plein écran depuis l’intro');
      await openGarage(node);
      await click(carCardOf(node));
      await waitForCountdown(node);
      await api.browserExit();
      await waitForPause(node);
      await click(resumeOf(node));
      await waitForCountdown(node);
      assert.ok(!node.querySelector('.city-rush-pause-overlay'), 'REPRENDRE rend le compte à rebours quitté, pas une course lancée sans décompte');
      await waitForRace(node);

      // 3. Touche F : ouvre, referme ; Ctrl/Cmd/Alt + F, touche maintenue ignorés.
      before = mark(api);
      await press('f');
      assert.deepEqual(shellState(node, api), OPEN, 'F rouvre le plein écran en pleine course');
      assert.deepEqual(since(api, before), { requests: 1, exits: 0 });
      await press('f');
      assert.deepEqual(shellState(node, api), CLOSED, 'F referme');
      assert.ok(node.querySelector('.city-rush-hud-top') && !node.querySelector('.city-rush-pause-overlay'), 'F n’a pas mis la course en pause (c’est un choix du joueur, pas une sortie du navigateur)');
      await press('F');
      assert.deepEqual(shellState(node, api), OPEN, 'F majuscule (Maj ou verrouillage) aussi');
      for (const [label, init] of [
        ['touche maintenue', { repeat: true }],
        ['Ctrl + F', { ctrlKey: true }],
        ['Cmd + F', { metaKey: true }],
        ['Alt + F', { altKey: true }],
      ]) {
        before = mark(api);
        const event = await press('f', init);
        assert.deepEqual(shellState(node, api), OPEN, `${label} : plein écran inchangé`);
        assert.equal(event.defaultPrevented, false, `${label} : le navigateur garde son raccourci`);
        assert.deepEqual(since(api, before), { requests: 0, exits: 0 }, `${label} : aucun appel au navigateur`);
      }
      await press('f');
      assert.deepEqual(shellState(node, api), CLOSED);
      await unmount();
      assert.deepEqual([nothingNative(api), locked()], [true, false], 'quitter la page referme le plein écran et lève le verrou');
    }

    // ── 4-6. Cas limites du navigateur ──────────────────────────────────────
    {
      const { node, unmount } = await mountPage('/jeu/vice-city-rush');
      await waitForIntroStep(node, 'MODE');
      await click(toggleOf(node));
      assert.deepEqual(shellState(node, api), CLOSED, 'le bouton de la barre referme le plein écran de base');

      // 4. Sans Fullscreen API (demande refusée) : la couche fixe seule suffit.
      api.refuse = true;
      let before = mark(api);
      await click(toggleOf(node));
      await settle();
      assert.deepEqual(shellState(node, api), LAYER_ONLY, 'demande refusée : le jeu occupe quand même tout l’écran');
      assert.equal(nothingNative(api), true, 'aucun plein écran natif');
      await press('f');
      assert.deepEqual(shellState(node, api), CLOSED, 'F referme la couche fixe');
      assert.deepEqual(since(api, before), { requests: 2, exits: 0 }, 'sans plein écran natif, pas d’appel à exitFullscreen (une demande refusée par geste)');
      api.refuse = false;

      // 5. Double bascule avant la réponse du navigateur.
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

      // 6. Sortie en cours : la mise en page plein écran reste jusqu'à la fin.
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
      assert.deepEqual(shellState(node, api), CLOSED, 'l’évènement tardif ne rouvre ni ne remet en plein écran');
      timers.state.max = 10;
      await unmount();
      assert.deepEqual([nothingNative(api), locked()], [true, false], 'rien ne traîne après la page');
    }

    // ── 7. Téléphone et application Android ─────────────────────────────────
    const devices = [
      ['téléphone (pointeur grossier)', () => {
        window.matchMedia = (query) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {} });
      }, () => { delete window.matchMedia; }],
      ['application Android (pont LetsPlayAndroid)', () => { window.LetsPlayAndroid = {}; }, () => { delete window.LetsPlayAndroid; }],
    ];
    for (const [label, install, uninstall] of devices) {
      install();
      try {
        const { node, unmount } = await mountPage('/jeu/vice-city-rush');
        assert.deepEqual(shellState(node, api), LAYER_ONLY, `${label} : l’interface se lance en plein écran de base (couche fixe)`);
        await waitForIntroStep(node, 'MODE');
        // Sorti à la main, puis un lancement de course : le plein écran revient
        // dans le geste (l'ouverture automatique, elle, se referme à l'arrivée).
        await click(toggleOf(node));
        assert.deepEqual(shellState(node, api), CLOSED, `${label} : le bouton de la barre referme`);
        await openGarage(node);
        const before = mark(api);
        await click(carCardOf(node));
        assert.deepEqual(shellState(node, api), OPEN, `${label} : la vignette de voiture lance la course et rouvre le plein écran natif`);
        assert.equal(since(api, before).requests, 1, `${label} : la demande part dans le geste`);
        await finishRace(node);
        await settle();
        assert.deepEqual(shellState(node, api), CLOSED, `${label} : le plein écran automatique se referme à l’arrivée`);
        assert.equal(since(api, before).exits, 1, `${label} : la sortie est demandée au navigateur`);
        await unmount();
      } finally {
        uninstall();
      }
    }
    assert.deepEqual([nothingNative(api), locked()], [true, false], 'rien ne traîne en fin de test');
  } finally {
    timers.restore();
    api.uninstall();
  }
}
