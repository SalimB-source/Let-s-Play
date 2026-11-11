import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';

for (const side of ['joueur', 'sorcier']) {
  test(`centre conquis par ${side} : aucun dialogue ni fusion des jauges`, async () => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
      assert.ok(mobaInfliger(duel.moba, side, 'center', 15).conquered);
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser: () => duel })));
      assert.equal(document.querySelector('[aria-label="Choisir une voie latérale"]'), null);
      const group = document.querySelector('.moba__lanes');
      assert.equal(group.dataset.mobaJoinedLane, undefined);
      assert.equal(group.dataset.mobaJoinedSide, side);
      const [left, center, right] = group.querySelectorAll('.moba__lane');
      assert.equal(center.querySelector(`.moba__side--${side} .moba__health`), null);
      for (const flank of [left, right]) {
        const gauge = flank.querySelector(`.moba__side--${side} [role="progressbar"]`);
        assert.equal(gauge.getAttribute('aria-valuemax'), '20');
        assert.equal(gauge.getAttribute('aria-valuenow'), '20');
        assert.doesNotMatch(gauge.getAttribute('aria-label'), /centrale/);
      }
    } finally {
      if (root) await act(async () => root.unmount());
      await server.close(); dom.window.close();
      globalThis.window = oldWindow; globalThis.document = oldDocument;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}

test('une frappe directe depuis le centre permet de choisir le flanc', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { mobaInfliger } = await server.ssrLoadModule('/src/games/rpgMoba.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Board, props)));
    const click = async (el) => { assert.ok(el); await act(async () => el.click()); };
    await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
    duel.joueur.main = ['ashigaru-des-braises'];
    const attaquant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
    assert.ok(attaquant);
    attaquant.ready = true;
    assert.ok(mobaInfliger(duel.moba, 'joueur', 'center', 15).conquered);
    await render(); await click(document.querySelector(`[data-moba-entity="${attaquant.id}"] button`));
    const buttons = [...document.querySelectorAll('.moba__controls button')];
    assert.ok(buttons.some((b) => /Attaquer directement.*gauche/i.test(b.textContent)));
    const droite = buttons.find((b) => /Attaquer directement.*droite/i.test(b.textContent));
    await click(droite);
    assert.equal(duel.combatDeclare?.cibleIndividuelle?.voie, 'right');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
