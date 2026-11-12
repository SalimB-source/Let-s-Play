import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MOBA_DECKS } from '../src/games/rpgMobaLocal.js';
import { MOBA_PLATEAUX, MOBA_PLATEAU_PAR_DEFAUT } from '../src/games/rpgMobaPlateaux.js';
import { RPG_PLATEAU_MUSIC_FILES } from '../src/games/rpgPlateauMusic.js';

test('les cinq décors conservent le format de la carte à trois voies', async () => {
  assert.equal(MOBA_PLATEAU_PAR_DEFAUT.id, 'trois-voies');
  assert.deepEqual(MOBA_PLATEAUX.map(({ id }) => id), ['trois-voies', 'port-des-corsaires', 'erg-des-ksour', 'lac-gele-viking', 'temple-du-nil-egyptien']);
  for (const plateau of MOBA_PLATEAUX) assert.ok(RPG_PLATEAU_MUSIC_FILES[plateau.musique], plateau.nom);
  const images = await Promise.all(MOBA_PLATEAUX.map(({ fichier }) => readFile(new URL(`../public/${fichier}`, import.meta.url))));
  for (const image of images) {
    assert.equal(image.toString('ascii', 0, 4), 'RIFF');
    assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  }
  // Même canevas et mêmes proportions ; la disposition 2 / 1 / 2 reste en CSS/JS.
  const dimensions = (image) => [image.readUInt16LE(26) & 0x3fff, image.readUInt16LE(28) & 0x3fff];
  for (const image of images.slice(1)) assert.deepEqual(dimensions(image), dimensions(images[0]));
});

test('le choix du lac gelé s’applique du préparatif au duel, sans modifier les voies', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    const deck = { ...MOBA_DECKS[0], id: 'deck-viking', name: 'Mon deck viking' };
    await act(async () => root.render(React.createElement(Board, { decksMaison: [deck], onQuitter: () => {} })));
    const options = [...document.querySelectorAll('.moba__plateau-option')];
    assert.equal(options.length, 5);
    assert.equal(options[0].getAttribute('aria-pressed'), 'true');
    const optionViking = options.find((option) => option.textContent.includes('Lac gelé viking'));
    assert.match(optionViking.querySelector('img').src, /sablier-moba\/lac-gele-viking\.webp$/);
    await act(async () => optionViking.click());
    const terrain = document.querySelector('.moba');
    assert.equal(terrain.dataset.mobaPlateau, 'lac-gele-viking');
    assert.match(terrain.style.getPropertyValue('--moba-map'), /sablier-moba\/lac-gele-viking\.webp/);
    assert.equal(optionViking.getAttribute('aria-pressed'), 'true');
    assert.equal(options[0].getAttribute('aria-pressed'), 'false');
    assert.deepEqual([...document.querySelectorAll('.moba__lane')].map((lane) => lane.querySelectorAll('[data-moba-position]').length), [4, 2, 4]);
    const start = [...document.querySelectorAll('.moba__setup-actions button')].find((button) => button.textContent.includes('Commencer le duel'));
    assert.equal(start.disabled, false);
    await act(async () => start.click());
    assert.ok(document.querySelector('[aria-label="Votre main de départ"]'));
    assert.equal(document.querySelector('.moba').dataset.mobaPlateau, 'lac-gele-viking');
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    assert.equal(document.querySelector('.moba').dataset.mobaPlateau, 'lac-gele-viking');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('le Temple du Nil se choisit sans changer les trois voies ni le deck', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    root = createRoot(document.getElementById('root'));
    const deck = { ...MOBA_DECKS[0], id: 'deck-egyptien', name: 'Mon deck égyptien' };
    await act(async () => root.render(React.createElement(Board, { decksMaison: [deck], onQuitter: () => {} })));
    const options = [...document.querySelectorAll('.moba__plateau-option')];
    assert.equal(options.length, 5);
    const optionNil = options.find((option) => option.textContent.includes('Temple du Nil'));
    assert.match(optionNil.querySelector('img').src, /sablier-moba\/temple-du-nil-egyptien\.webp$/);
    await act(async () => optionNil.click());
    const terrain = document.querySelector('.moba');
    assert.equal(terrain.dataset.mobaPlateau, 'temple-du-nil-egyptien');
    assert.match(terrain.style.getPropertyValue('--moba-map'), /sablier-moba\/temple-du-nil-egyptien\.webp/);
    assert.deepEqual(options.map((option) => option.getAttribute('aria-pressed')), ['false', 'false', 'false', 'false', 'true']);
    assert.deepEqual([...document.querySelectorAll('.moba__lane')].map((lane) => lane.querySelectorAll('[data-moba-position]').length), [4, 2, 4]);
    const start = [...document.querySelectorAll('.moba__setup-actions button')].find((button) => button.textContent.includes('Commencer le duel'));
    assert.equal(start.disabled, false);
    await act(async () => start.click());
    assert.ok(document.querySelector('[aria-label="Votre main de départ"]'));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    assert.equal(document.querySelector('.moba').dataset.mobaPlateau, 'temple-du-nil-egyptien');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('le port et les ksour se sélectionnent aussi en duel libre, sans changer les emplacements', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const deck = { ...MOBA_DECKS[0], id: 'deck-nouvelles-cartes', name: 'Mon deck' };
    for (const plateau of MOBA_PLATEAUX.filter(({ id }) => ['port-des-corsaires', 'erg-des-ksour'].includes(id))) {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(React.createElement(Board, { decksMaison: [deck], onQuitter: () => {} })));
      const choix = [...document.querySelectorAll('.moba__plateau-option')].find((option) => option.textContent.includes(plateau.nom));
      assert.ok(choix, plateau.nom);
      await act(async () => choix.click());
      assert.equal(choix.getAttribute('aria-pressed'), 'true');
      assert.equal(document.querySelector('.moba').dataset.mobaPlateau, plateau.id);
      assert.match(document.querySelector('.moba').style.getPropertyValue('--moba-map'), new RegExp(plateau.fichier));
      assert.deepEqual([...document.querySelectorAll('.moba__lane')].map((lane) => lane.querySelectorAll('[data-moba-position]').length), [4, 2, 4]);
      await act(async () => [...document.querySelectorAll('.moba__setup-actions button')].find((button) => button.textContent.includes('Commencer le duel')).click());
      assert.ok(document.querySelector('[aria-label="Votre main de départ"]'));
      assert.equal(document.querySelector('.moba').dataset.mobaPlateau, plateau.id);
      await act(async () => root.unmount());
      root = null;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
