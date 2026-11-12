import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

for (const mode of ['clic', 'glisser']) test(`deux victimes : seule une case sacrifiée accepte l'invocation par ${mode}`, async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour } = await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser = () => { duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }); return duel; };
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (button) => {
      assert.ok(button, 'bouton présent'); assert.equal(button.disabled, false, 'bouton actif');
      await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); rpgFinDeTour(duel); duel.joueur.main = ['ashigaru-des-braises'];
    const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
    assert.ok(a && b); rpgFinDeTour(duel); rpgFinDeTour(duel); duel.joueur.main = ['orochi'];
    await act(async () => root.render(React.createElement(Board, props)));
    const carte = () => [...document.querySelectorAll('.moba__card')].find((node) => node.textContent.includes('Orochi'));
    const slot = (lane, position) => document.querySelector(`[data-moba-lane="${lane}"][data-moba-side="joueur"][data-moba-slot="${position}"]`);
    await click(carte()); await click(slot('left', 0).querySelector('button')); await click(slot('right', 1).querySelector('button'));
    assert.match(document.querySelector('.moba__sacrifice-hint').textContent, /2\/2/);
    assert.match(document.querySelector('.moba__sacrifice-hint').textContent, /case d’une victime/);
    assert.equal(slot('center', 0).querySelector('button').disabled, true, 'une case libre ne peut être choisie');
    assert.equal(slot('left', 0).querySelector('button').disabled, false);
    assert.equal(slot('right', 1).querySelector('button').disabled, false);
    if (mode === 'clic') await click(slot('right', 1).querySelector('button'));
    else {
      const drag = (element, type) => { const event = new dom.window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'dataTransfer', { value: { setData() {}, effectAllowed: '', dropEffect: '' } }); return act(async () => element.dispatchEvent(event)); };
      await drag(carte(), 'dragstart');
      await drag(slot('center', 0), 'drop'); assert.ok(!duel.mobaCreatureEnAttente, 'pas de dépôt sur une case vide');
      await drag(carte(), 'dragstart'); await drag(slot('right', 1), 'drop');
    }
    assert.deepEqual(duel.mobaCreatureEnAttente?.sacrificeIds, [a.id, b.id]);
    assert.equal(duel.mobaCreatureEnAttente?.laneId, 'right'); assert.equal(duel.mobaCreatureEnAttente?.slot, 1);
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
