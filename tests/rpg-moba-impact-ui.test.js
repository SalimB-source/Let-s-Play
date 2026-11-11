import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('une attaque individuelle résolue affiche un impact non interactif et annonce les dégâts', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // JSDOM n'a pas de moteur de placement ; fournir des dimensions non nulles.
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 };
  };
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const props = { onQuitter: () => {}, initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 })) };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => { assert.ok(button); assert.equal(button.disabled, false); await act(async () => button.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises']; duel.sorcier.main = [];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    attaquant.ready = true; attaquant.atk = 3;
    await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    assert.ok(duel.combatDeclare);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });
    const svg = document.querySelector('.moba__impact-cinema');
    assert.ok(svg); assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.ok(svg.querySelector('.moba__impact-trail'));
    assert.equal(svg.querySelector('.moba__impact-number').textContent, '−3');
    assert.match(document.querySelector('.moba__combat-result').textContent, /voie gauche : 3 dégâts/);
    assert.equal(duel.combatDeclare, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
