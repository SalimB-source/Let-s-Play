import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('le terrain MOBA continu garde ses trois voies et ses commandes', async () => {
  const image = await readFile(new URL('../public/sablier-moba/champ-des-trois-voies-berges.webp', import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  const css = await readFile(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  assert.match(css, /var\(--moba-map\) center \/ 100% 100% no-repeat/);
  assert.match(css, /@media \(max-width: 700px\) and \(orientation: portrait\)\s*\{[^}]*\.moba\s*\{[^}]*background-size:\s*145% 100%/s);
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { onQuitter: () => {} })));
    assert.match(document.querySelector('.moba').style.getPropertyValue('--moba-map'), /sablier-moba\/champ-des-trois-voies-berges\.webp/);
    const lanes = [...document.querySelectorAll('.moba__lane')];
    assert.deepEqual(lanes.map((lane) => lane.getAttribute('aria-label')), ['Voie gauche', 'Voie centrale', 'Voie droite']);
    assert.deepEqual(lanes.map((lane) => lane.querySelectorAll('[data-moba-position]').length), [4, 2, 4]);
    const click = async (button) => { assert.ok(button && !button.disabled); await act(async () => button.click()); };
    await click([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Commencer le duel')));
    await click([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Garder ma main')));
    assert.ok(document.querySelector('.moba__choice button'));
    await click(document.querySelector('.moba__choice button'));
    assert.equal(document.querySelector('.moba__choice'), null);
    assert.equal(document.querySelectorAll('.moba__lane').length, 3);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
