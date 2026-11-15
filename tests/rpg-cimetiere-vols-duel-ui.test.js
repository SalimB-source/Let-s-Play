import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('duel PvP : un choix de réanimation déclenche le vol vers la créature posée', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
  const anciennes = Object.fromEntries(keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve(); dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    const cim = this.classList.contains('rpg-card-pile__stack');
    const left = cim ? 10 : 410, top = cim ? 100 : 300;
    return { left, top, width: 80, height: 100, right: left + 80, bottom: top + 100 };
  };
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  let root;
  try {
    const { default: Page } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel, rpgLancerMagie } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const { rpgPvpVue, rpgPvpAppliquer } = await vite.ssrLoadModule('/src/games/rpgPvp.js');
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], modeMana: 'essai', pvp: true });
    duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
    duel.joueur.main = ['reanimation']; duel.joueur.cimetiere = ['ureus-du-seuil'];
    assert.ok(rpgLancerMagie(duel, 'joueur', 'reanimation').ok);
    const intentions = [];
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: rpgPvpVue(duel, 'joueur'), seq: 1, code: 'TEST', onIntention: async (i) => { intentions.push(i); assert.ok(rpgPvpAppliquer(duel, 'joueur', i).ok); return { etat: rpgPvpVue(duel, 'joueur'), seq: 2 }; }, onQuitter() {}, onAbandon() {} } })));
    assert.equal(document.querySelector('[data-rpg-cimetiere-vol]'), null);
    const choix = document.querySelector('.rpg-renfort-choix__carte'); assert.ok(choix);
    await act(async () => choix.click());
    const vol = document.querySelector('[data-rpg-cimetiere-vol="joueur-jeu"]');
    assert.ok(vol); assert.equal(vol.style.getPropertyValue('--vol-dx'), '400px');
    assert.equal(vol.style.getPropertyValue('--vol-dy'), '200px');
    assert.equal(intentions[0].type, 'choisir-renfort');
    assert.ok(document.querySelector('.rpg-card--equipe[data-card-id="ureus-du-seuil"]'));
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, value] of Object.entries(anciennes)) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; }
  }
});
