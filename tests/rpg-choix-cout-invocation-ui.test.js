import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('PvP et MOBA : le joueur choisit ou annule le coût de son invocation', { timeout: 120000 }, async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
  const anciennes = Object.fromEntries(keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve(); dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  let root;
  const click = async (el, label) => { assert.ok(el, label); await act(async () => el.click()); };
  try {
    const { default: Page } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { rpgNouveauDuel } = await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const { rpgPvpVue, rpgPvpAppliquer } = await vite.ssrLoadModule('/src/games/rpgPvp.js');
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], modeMana: 'essai', pvp: true });
    duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
    duel.joueur.main = ['veuve-des-urnes', 'ecueil', 'contresort-des-abimes'];
    const intentions = [];
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Page, { pvp: { vue: rpgPvpVue(duel, 'joueur'), seq: 1, code: 'TEST', onIntention: async (i) => { intentions.push(i); assert.ok(rpgPvpAppliquer(duel, 'joueur', i).ok); return { etat: rpgPvpVue(duel, 'joueur'), seq: 2 }; }, onQuitter() {}, onAbandon() {} } })));
    const carte = () => document.querySelector('.rpg-hand__card[data-card-id="veuve-des-urnes"]');
    await click(carte(), 'carte PvP');
    assert.ok(document.querySelector('.rpg-choix-cout'));
    assert.equal(intentions.length, 0);
    await click(document.querySelector('.rpg-choix-cout__actions button:last-child'), 'annuler PvP');
    assert.equal(document.querySelector('.rpg-choix-cout'), null); assert.equal(intentions.length, 0);
    await click(carte(), 'carte PvP après annulation');
    const options = [...document.querySelectorAll('.rpg-choix-cout__carte')];
    assert.equal(options.length, 2); assert.match(options[1].textContent, /Contresort des abîmes/i);
    assert.match(document.querySelector('.rpg-choix-cout__description').textContent, /défausser de votre main/);
    assert.match(options[1].querySelector('img').getAttribute('src'), /cards\/contresort-des-abimes\.jpg/);
    assert.equal(options[1].getAttribute('aria-pressed'), 'false');
    assert.equal(document.querySelector('.rpg-choix-cout__confirmer').disabled, true);
    await click(options[1], 'seconde magie');
    assert.equal(options[1].getAttribute('aria-pressed'), 'true');
    assert.ok(options[1].classList.contains('is-selected'));
    assert.equal(document.querySelector('.rpg-choix-cout__confirmer').disabled, false);
    await click(document.querySelector('.rpg-choix-cout__actions button:first-child'), 'confirmer PvP');
    await click(document.querySelector('[data-creature-slot-choix="true"]'), 'emplacement PvP');
    assert.equal(intentions[0]?.choixCoutInvocation, 'contresort-des-abimes');
    assert.deepEqual(duel.joueur.cimetiere, ['contresort-des-abimes']);
    await act(async () => root.unmount()); root = null;

    const { default: Board } = await vite.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await vite.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let moba;
    const props = { initialiser: () => (moba = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 })), onQuitter() {}, rendu: RPG_RENDU_MOBA, sonActif: false };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'), 'mulligan MOBA');
    moba.joueur.main = ['lecteur-du-dernier-nom']; moba.joueur.cimetiere = ['chien-du-guet', 'momie-de-lin'];
    await render(); await click(document.querySelector('.moba__hand [data-card-id="lecteur-du-dernier-nom"]'), 'carte MOBA');
    const slot = () => document.querySelector('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="0"] button');
    await click(slot(), 'case MOBA');
    assert.deepEqual(moba.joueur.cimetiere, ['chien-du-guet', 'momie-de-lin']);
    await click(document.querySelector('.rpg-choix-cout__actions button:last-child'), 'annuler MOBA');
    assert.deepEqual(moba.joueur.cimetiere, ['chien-du-guet', 'momie-de-lin']);
    await click(slot(), 'case MOBA après annulation');
    const choix = [...document.querySelectorAll('.rpg-choix-cout__carte')]; assert.equal(choix.length, 2);
    assert.match(document.querySelector('.rpg-choix-cout__description').textContent, /exiler de votre cimetière/);
    assert.match(choix[1].textContent, /Momie de lin/i); await click(choix[1], 'seconde créature');
    await click(document.querySelector('.rpg-choix-cout__actions button:first-child'), 'confirmer MOBA');
    assert.deepEqual(moba.joueur.cimetiere, ['chien-du-guet']); assert.deepEqual(moba.joueur.exil, ['momie-de-lin']);
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [key, value] of Object.entries(anciennes)) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; }
  }
});
