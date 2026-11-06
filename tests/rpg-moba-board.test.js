import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('local board renders six health values and can pass a turn', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    let left = false;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => { left = true; } })));
    assert.equal(document.querySelectorAll('.moba__health strong').length, 6);
    assert.equal(document.querySelectorAll('.moba__lane').length, 3);
    assert.equal(document.querySelectorAll('.moba__slot').length, 10);
    const click = async (button) => act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    await click([...document.querySelectorAll('.moba__choice button')].find((b) => b.textContent === 'neige'));
    assert.match(document.querySelector('.moba__status').textContent, /neige 1/);
    await click([...document.querySelectorAll('.moba__controls button')].find((b) => b.textContent === 'Fin du tour'));
    assert.match(document.querySelector('[role=dialog]').textContent, /Joueur 2/);
    await click(document.querySelector('[role=dialog] button'));
    assert.match(document.querySelector('.moba__status').textContent, /Joueur 2/);
    await click(document.querySelector('.moba__header button'));
    assert.equal(left, true);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
