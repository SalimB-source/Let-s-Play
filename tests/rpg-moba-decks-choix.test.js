import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MOBA_DECKS } from '../src/games/rpgMobaLocal.js';

test('le joueur choisit un deck créé compatible et l’IA reçoit un deck de tour au hasard', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document, random = Math.random;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Math.random = () => 0;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const valide = { ...MOBA_DECKS[0], id: 'maison-valide', name: 'Mon deck créé' };
    const invalide = { ...valide, id: 'maison-invalide', name: 'Deck incomplet', cardIds: [] };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, decksMaison: [valide, invalide] })));
    const select = document.querySelector('.moba__deck-choice--joueur select');
    assert.ok(select.querySelector('option[value="maison-valide"]:not(:disabled)'));
    assert.ok(select.querySelector('option[value="maison-invalide"]:disabled'));
    assert.match(document.querySelector('.moba__deck-choice--sorcier').textContent, /deck de tour.*aléatoire/i);
    assert.equal(document.querySelector('.moba__deck-choice--sorcier select'), null);
    await act(async () => { select.value = 'maison-valide'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.equal(select.value, 'maison-valide');
    const start = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Commencer le duel'));
    await act(async () => start.click());
    assert.ok(document.querySelector('[aria-label="Votre main de départ"]'));
    assert.deepEqual([...document.querySelectorAll('.moba__health-bar')].map((bar) => bar.getAttribute('aria-valuemax')), ['20','20','10','10','20','20']);
    assert.deepEqual([...document.querySelectorAll('.moba__health-bar i')].map((bar) => bar.style.width), ['100%','100%','100%','100%','100%','100%']);
  } finally {
    if (root) await act(async () => root.unmount());
    Math.random = random; await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
