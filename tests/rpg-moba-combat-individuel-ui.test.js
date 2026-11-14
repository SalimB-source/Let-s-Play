import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('les sorts révisés restent jouables sur les deux rendus MOBA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    root = createRoot(document.getElementById('root'));
    for (const rendu of [{ TableCard: RPG_RENDU_MOBA.TableCard }, RPG_RENDU_MOBA]) {
      await act(async () => root.render(React.createElement(Board, { initialiser, rendu, onQuitter: () => {} })));
      const start = document.querySelector('.moba__mulligan .moba__primary');
      if (start) await act(async () => start.click());
      duel.joueur.main = ['embuscade', 'appat-de-la-meute'];
      await act(async () => root.render(React.createElement(Board, { initialiser, rendu, onQuitter: () => {} })));
      const buttons = [...document.querySelectorAll('.moba__hand button.moba__card')];
      assert.equal(buttons.length, 2);
      for (const button of buttons) {
        assert.equal(button.disabled, false);
        assert.doesNotMatch(button.getAttribute('aria-label') ?? button.title, /Injouable en MOBA/);
      }
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
