import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('plateau épuré : voies accessibles et consignes disponibles seulement pendant une action', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    const click = async (el) => { assert.ok(el); await act(async () => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    await click(document.querySelector('.moba__mulligan .moba__primary'));
    assert.equal(document.querySelector('.moba__status'), null);
    assert.equal(document.querySelector('.moba__directive'), null);
    assert.equal(document.querySelector('.moba__lanehead'), null);
    assert.deepEqual([...document.querySelectorAll('.moba__lane')].map((lane) => lane.getAttribute('aria-label')), ['Voie gauche', 'Voie centrale', 'Voie droite']);
    assert.match(document.querySelector('.moba__controls').textContent, /Phase principale/);
    assert.ok([...document.querySelectorAll('.moba__controls button')].some((button) => button.textContent.includes('Fin du tour')));
    duel.joueur.main = ['ashigaru-des-braises'];
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector('.moba__card'));
    assert.match(document.querySelector('.moba__controls .moba__hint').textContent, /Choisissez une case/);
    await click(document.querySelector('.moba__controls .moba__cancel-choice'));
    assert.equal(document.querySelector('.moba__directive'), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
