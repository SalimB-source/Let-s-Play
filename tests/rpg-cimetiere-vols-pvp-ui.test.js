import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

for (const side of ['joueur', 'sorcier']) test(`PvP : retour du cimetière vers la main ${side} depuis une vue distante`, async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/jeu/sablier-de-bab-el/defi/ABCDEF12', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
  const anciennes = Object.fromEntries(keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve(); dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    const cim = this.classList.contains('rpg-card-pile__stack');
    const left = cim ? 20 : 350, top = cim ? 100 : 400;
    return { left, top, width: 80, height: 100, right: left + 80, bottom: top + 100 };
  };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  let root;
  try {
    const { default: Page } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const { rpgPvpVue } = await vite.ssrLoadModule('/src/games/rpgPvp.js');
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], modeMana: 'essai', pvp: true });
    duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true; duel.tour = side;
    duel[side].main = ['scribe-de-la-liste']; duel[side].cimetiere = ['chien-du-guet'];
    const scribe = rpgJouerCreature(duel, side, 'scribe-de-la-liste').entite; assert.ok(scribe);
    const pvp = { vue: rpgPvpVue(duel, 'joueur'), seq: 1, code: 'ABCDEF12', onIntention: async () => ({ ok: true }), onQuitter() {}, onAbandon() {} };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Page, { pvp: { ...pvp } })));
    await render();
    assert.equal(document.querySelector('[data-rpg-cimetiere-vol]'), null, 'pas de mouvement à la connexion');
    rpgBlesserCreature(duel, side, scribe.id, 99);
    pvp.vue = rpgPvpVue(duel, 'joueur'); pvp.seq = 2;
    await render();
    const vol = document.querySelector(`[data-rpg-cimetiere-vol="${side}-main"]`);
    assert.ok(vol, 'le retour est animé après synchronisation');
    assert.equal(vol.style.getPropertyValue('--vol-dx'), '330px');
    if (side === 'sorcier') assert.match(vol.querySelector('img').src, /dos-de-carte/, 'la main adverse reste cachée');
    else assert.match(vol.querySelector('img').src, /chien-du-guet/);
    await render();
    assert.equal(document.querySelectorAll('[data-rpg-cimetiere-vol]').length, 1, 'la même vue ne relance pas le vol');
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, value] of Object.entries(anciennes)) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; }
  }
});
