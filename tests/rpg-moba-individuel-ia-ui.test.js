import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('l’IA attaque une créature et le joueur répond sans choisir de bloqueur', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    root = createRoot(document.getElementById('root'));
    const props = { initialiser, onQuitter: () => {} };
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (el) => { assert.ok(el); assert.equal(el.disabled, false); await act(async () => el.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const cible = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
    const attacker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    attacker.ready = true; attacker.atk = 3; attacker.pv = 5; attacker.pvMax = 5; attacker.def = 5;
    duel.sorcier.main = []; duel.joueur.main = [];
    await render();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    assert.equal(duel.combatDeclare?.cibleIndividuelle?.cibleId, cible.id);
    assert.equal(document.querySelector(`[data-moba-entity="${cible.id}"] button`).disabled, true);
    const passer = [...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent.includes('Passer et résoudre l’attaque'));
    await click(passer);
    assert.equal(duel.combatDeclare, null);
    assert.equal(duel.joueur.creatures.some((e) => e.id === cible.id), false);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
