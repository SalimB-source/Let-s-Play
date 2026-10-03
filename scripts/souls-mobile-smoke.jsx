/**
 * Entrée utilisée par scripts/souls-mobile-check.mjs — `npm run check:souls-mobile`.
 *
 * Joue la page de La Cendre dans jsdom, avec le vrai écran (intro, HUD, pause,
 * écran de rotation, manette tactile) et une doublure de moteur 3D
 * (scripts/souls-world-stub.jsx) qui enregistre les actions reçues.
 *
 *   0. Téléphone debout : la page se couche (verrou demandé au montage, pont
 *      Android appelé), la couche plein écran est posée sans geste, l'écran
 *      « TOURNEZ VOTRE APPAREIL » s'affiche et la légende est celle du doigt.
 *   1. « JOUER QUAND MÊME » : le conseil se tait.
 *   2. Lancement : le geste ouvre le plein écran natif, le verrou paysage est
 *      rejoué (Chrome Android ne l'honore qu'en plein écran), la manette
 *      apparaît — stick à gauche, six boutons à droite.
 *   3. Les boutons envoient leurs actions au moteur (`touchAction`), le stick
 *      envoie sa poussée (`touchMove`) et son relâchement remet le chevalier
 *      à l'arrêt.
 *   4. Pause au doigt : l'écran de pause propose les montées de niveau.
 *   5. Page quittée : l'orientation est rendue (pont Android « auto », unlock).
 *   6. Ordinateur : pas de manette, pas d'écran de rotation, pas de pont, et
 *      la page garde son cadre (le plein écran reste au bouton de la barre).
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SoulsPage from '../src/games/SoulsPage';
import { worldProbe } from './souls-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

const click = (element) => act(async () => { element.click(); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });

/** Appuie sur un bouton de la manette comme un doigt : `pointerdown`. */
async function tap(element) {
  await act(async () => {
    element.dispatchEvent(new window.PointerEvent('pointerdown', {
      pointerId: 11, pointerType: 'touch', bubbles: true, cancelable: true,
    }));
  });
}

async function until(read, label, timeout = 4000) {
  const start = performance.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await settle(10);
  }
}

async function mount(entry) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <MemoryRouter initialEntries={[entry]}>
      <SoulsPage />
    </MemoryRouter>,
  ));
  await settle(30);
  return {
    node,
    unmount: async () => { await act(async () => root.unmount()); node.remove(); },
  };
}

const define = (target, key, value) => Object.defineProperty(target, key, { configurable: true, writable: true, value });

/**
 * Installe un appareil : écran, pointeur, Screen Orientation API, pont Android
 * et une Fullscreen API minimale (jsdom n'en a pas). `phone: false` décrit un
 * ordinateur — pointeur fin, grand écran, pas de pont.
 */
function installDevice({ phone = true, portrait = true, androidBridge = true } = {}) {
  const state = { locks: [], unlocks: 0, bridge: [], element: null, requests: 0, exits: 0 };
  const sized = () => (portrait ? [390, 844] : [844, 390]);

  const applySize = () => {
    const [width, height] = phone ? sized() : [1280, 800];
    define(window, 'innerWidth', width);
    define(window, 'innerHeight', height);
    define(window.screen, 'width', width);
    define(window.screen, 'height', height);
  };
  applySize();
  define(window.navigator, 'maxTouchPoints', phone ? 5 : 0);

  window.matchMedia = (query) => ({
    matches: phone && query.includes('coarse'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });

  define(window.screen, 'orientation', {
    lock: (value) => { state.locks.push(value); return Promise.resolve(); },
    unlock: () => { state.unlocks += 1; },
  });
  if (androidBridge) {
    define(window, 'LetsPlayAndroid', { setGameOrientation: (mode) => state.bridge.push(mode) });
  }

  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => state.element });
  window.HTMLElement.prototype.requestFullscreen = function requestFullscreen() {
    state.requests += 1;
    state.element = this;
    document.dispatchEvent(new window.Event('fullscreenchange'));
    return Promise.resolve();
  };
  document.exitFullscreen = () => {
    state.exits += 1;
    state.element = null;
    document.dispatchEvent(new window.Event('fullscreenchange'));
    return Promise.resolve();
  };

  return {
    state,
    /** Le téléphone tourne : la fenêtre change de forme. */
    rotate: async () => {
      const [width, height] = sized();
      define(window, 'innerWidth', height);
      define(window, 'innerHeight', width);
      await act(async () => {
        window.dispatchEvent(new window.Event('resize'));
        window.dispatchEvent(new window.Event('orientationchange'));
      });
    },
    uninstall: () => {
      delete window.matchMedia;
      delete window.screen.orientation;
      delete window.LetsPlayAndroid;
      delete document.fullscreenElement;
      delete window.HTMLElement.prototype.requestFullscreen;
      delete document.exitFullscreen;
    },
  };
}

const names = () => worldProbe.actions.map(([name]) => name);
const lastAction = () => worldProbe.actions.at(-1);
const padOf = (node) => node.querySelector('.souls-touch');
const buttonOf = (node, id) => node.querySelector(`.souls-touch-button-${id}`);
const rotateOf = (node) => node.querySelector('.souls-rotate');

export async function checkSoulsMobile(assert) {
  const device = installDevice({ phone: true, portrait: true });
  const { state } = device;
  let page = null;
  try {
    page = await mount('/jeu/la-cendre');
    const { node } = page;
    const shell = node.querySelector('.souls-game-shell');

    // 0. Téléphone debout : l'écran réclame le paysage et le montre.
    assert.equal(shell.classList.contains('is-immersive'), true, 'la couche plein écran est posée dès l’ouverture');
    assert.equal(document.body.classList.contains('game-immersive-lock'), true, 'le défilement est verrouillé');
    assert.deepEqual(state.locks, ['landscape'], 'le paysage est demandé dès le montage');
    assert.deepEqual(state.bridge, ['landscape'], 'l’activité Android est couchée tout de suite');
    assert.equal(Boolean(rotateOf(node)), true, 'debout, l’écran « tournez votre appareil » s’affiche');
    assert.ok(squash(node.querySelector('.souls-rotate').textContent).includes('TOURNEZ VOTRE APPAREIL'));
    assert.ok(squash(node.querySelector('.souls-overlay-keys').textContent).includes('STICK'), 'la légende d’intro est celle du doigt');
    assert.equal(Boolean(padOf(node)), false, 'pas de manette avant la partie');
    assert.equal(Boolean(node.querySelector('.souls-lock-hint')), false, 'aucun conseil de souris sur un écran tactile');

    // 1. « Jouer quand même » : le conseil se tait pour la session.
    await click(node.querySelector('.souls-rotate .souls-ghost-button'));
    assert.equal(Boolean(rotateOf(node)), false, 'le conseil a été écarté');

    // 2. Lancement : plein écran natif dans le geste, verrou rejoué, manette.
    const before = state.locks.length;
    const startButton = node.querySelector('.souls-start-button');
    // Un doigt d'abord : c'est le geste qui ouvre le plein écran natif (et qui
    // peut verrouiller l'orientation — Chrome Android l'exige).
    await tap(startButton);
    assert.equal(state.element === shell, true, 'le premier geste ouvre le plein écran natif');
    await click(startButton);
    assert.ok(state.locks.length > before, 'le verrou paysage est rejoué à l’entrée en plein écran');
    assert.ok(names().includes('launch'), 'la partie démarre');
    const pad = await until(() => padOf(node), 'la manette tactile');
    assert.equal(pad.querySelectorAll('.souls-touch-button').length, 6, 'six boutons, comme une manette');
    assert.equal(Boolean(pad.querySelector('.souls-touch-stick')), true, 'le stick est là');
    assert.ok(buttonOf(node, 'dodge').classList.contains('is-big'), 'la roulade est le gros bouton, sous le pouce droit');

    // 3. Les gestes arrivent au moteur.
    await tap(buttonOf(node, 'light'));
    assert.deepEqual(lastAction(), ['touchAction', 'light']);
    await tap(buttonOf(node, 'dodge'));
    assert.deepEqual(lastAction(), ['touchAction', 'dodge']);
    await click(buttonOf(node, 'flask'));
    assert.deepEqual(lastAction(), ['touchAction', 'flask'], 'le clavier (detail 0) passe aussi');

    const stick = pad.querySelector('.souls-touch-stick');
    const send = (type, x, y) => act(async () => {
      stick.dispatchEvent(new window.PointerEvent(type, {
        clientX: x, clientY: y, pointerId: 21, pointerType: 'touch', bubbles: true, cancelable: true,
      }));
    });
    await send('pointerdown', 58, 0); // à fond vers la droite (la base est au coin dans jsdom)
    const push = lastAction();
    assert.equal(push[0], 'touchMove');
    assert.equal(push[1].x, 1);
    assert.equal(push[1].magnitude, 1);
    assert.equal(push[1].run, true, 'stick à fond : le chevalier court');
    await send('pointerup', 58, 0);
    const released = lastAction();
    assert.deepEqual([released[0], released[1].x, released[1].magnitude], ['touchMove', 0, 0], 'le doigt levé arrête le chevalier');

    // 4. Pause au doigt : les niveaux se montent depuis l'écran de pause.
    await click(node.querySelector('.souls-pause-button'));
    await until(() => node.querySelector('.souls-level-up'), 'les boutons de niveau de la pause');
    assert.equal(Boolean(padOf(node)), false, 'la manette laisse la place à l’écran de pause');
    await click(node.querySelector('.souls-level-up-row .souls-ghost-button'));
    assert.deepEqual(lastAction(), ['level', 'vit']);
    await click(node.querySelector('.souls-overlay-actions .souls-start-button'));
    assert.ok(names().includes('launch'), 'la partie reprend');

    // Le téléphone tourne : là, le verrou a réussi, le conseil n'a plus lieu d'être.
    await device.rotate();
    assert.equal(Boolean(rotateOf(node)), false, 'couché, plus de conseil');

    // 5. Page quittée : le téléphone retrouve son orientation.
    await page.unmount();
    page = null;
    assert.equal(state.bridge.at(-1), 'auto', 'l’activité Android reprend l’orientation du téléphone');
    assert.ok(state.unlocks >= 1, 'le verrou navigateur est relâché');
  } finally {
    if (page) await page.unmount();
    device.uninstall();
  }

  // 6. Ordinateur : rien de tout ça.
  const desktop = installDevice({ phone: false, androidBridge: false });
  try {
    const machine = await mount('/jeu/la-cendre');
    const shell = machine.node.querySelector('.souls-game-shell');
    assert.equal(shell.classList.contains('is-immersive'), false, 'sur ordinateur, la page garde son cadre');
    assert.equal(Boolean(rotateOf(machine.node)), false, 'pas d’écran de rotation');
    assert.equal(Boolean(padOf(machine.node)), false, 'pas de manette');
    assert.equal(desktop.state.locks.length, 0, 'aucun verrou d’orientation demandé');
    assert.equal(Boolean(machine.node.querySelector('.souls-lock-hint')), false, 'le conseil souris attend le lancement');
    await click(machine.node.querySelector('.souls-start-button'));
    await until(() => machine.node.querySelector('.souls-lock-hint'), 'le conseil « cliquer pour capturer »');
    assert.equal(Boolean(padOf(machine.node)), false, 'toujours pas de manette en jeu');

    // Le bouton de la barre reste la porte du plein écran sur ordinateur.
    await click(machine.node.querySelector('.souls-fullscreen-button'));
    assert.equal(desktop.state.element === shell, true, 'le bouton couche la coquille');
    assert.equal(shell.classList.contains('is-immersive'), true);
    await machine.unmount();
  } finally {
    desktop.uninstall();
  }
}
