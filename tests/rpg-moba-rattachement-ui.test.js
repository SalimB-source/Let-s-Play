import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';

test('le plateau propose les deux voies après la conquête centrale et affiche le rattachement choisi', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
    mobaInfliger(duel.moba, 'joueur', 'center', 10);
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, initialiser: () => duel })));
    const dialog = document.querySelector('[aria-label="Choisir une voie latérale"]');
    assert.ok(dialog);
    assert.equal(dialog.closest('[inert]'), null, 'le choix est accessible même lorsque le plateau est désactivé');
    assert.equal(dialog.querySelectorAll('button').length, 2);
    const button = [...dialog.querySelectorAll('button')].find((item) => item.textContent.includes('droite'));
    assert.ok(button);
    await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.equal(document.querySelector('[aria-label="Choisir une voie latérale"]'), null);
    assert.deepEqual(duel.moba.centerJoined, { side: 'joueur', laneId: 'right' });
    assert.match(document.querySelectorAll('.moba__lane')[1].textContent, /droite/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
