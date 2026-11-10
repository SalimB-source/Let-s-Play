import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MOBA_DECKS } from '../src/games/rpgMobaLocal.js';

async function setup() {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  dom.window.HTMLElement.prototype.attachEvent = () => {}; dom.window.HTMLElement.prototype.detachEvent = () => {};
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const root = createRoot(document.getElementById('root'));
  return {
    render: async (decksMaison = []) => act(async () => root.render(React.createElement(Board, { onQuitter: () => {}, decksMaison }))),
    button: (name) => [...document.querySelectorAll('button')].find((item) => item.textContent.includes(name)),
    cleanup: async () => { await act(async () => root.unmount()); await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT; },
  };
}
const deck = (id, name, source = MOBA_DECKS[0]) => ({ ...source, id, name });

test('seuls les decks personnels sont sélectionnables, les blocs récapitulatifs ont disparu', async () => {
  const ui = await setup();
  const valide = deck('maison-valide', 'Mon deck créé');
  const autre = deck('maison-autre', 'Mon autre deck', MOBA_DECKS[1]);
  const invalide = { ...valide, id: 'maison-invalide', name: 'Deck incomplet', cardIds: [] };
  try {
    await ui.render([invalide, valide, autre]);
    const maison = ui.button('Mon deck créé'), second = ui.button('Mon autre deck'), interdit = ui.button('Deck incomplet');
    assert.equal(document.querySelectorAll('.moba__booster').length, 3);
    assert.equal(document.querySelector('[aria-label="Decks MOBA"]'), null);
    assert.equal(document.querySelector('.moba__setup-details'), null);
    assert.equal(document.querySelector('.moba__opponent-deck'), null);
    assert.equal(maison.getAttribute('aria-pressed'), 'true'); assert.equal(interdit.disabled, true);
    assert.match(interdit.closest('.moba__booster-item').textContent, /30 cartes exigées/);
    assert.ok(maison.querySelector('.moba__booster-face img')); assert.ok(maison.querySelector('.moba__booster-edge'));
    await act(async () => second.click());
    assert.equal(second.getAttribute('aria-pressed'), 'true'); assert.equal(maison.getAttribute('aria-pressed'), 'false');
    await ui.render([invalide, valide, { ...autre, cardIds: [] }]);
    assert.equal(ui.button('Commencer le duel').disabled, true);
    assert.match(document.querySelector('.moba__setup-warning').textContent, /30 cartes exigées/);
    await act(async () => maison.click());
    assert.equal(ui.button('Commencer le duel').disabled, false);
    await act(async () => ui.button('Commencer le duel').click());
    assert.ok(document.querySelector('[aria-label="Votre main de départ"]'));
  } finally { await ui.cleanup(); }
});

test('sans deck personnel jouable il faut en créer un, sans démarrage silencieux avec un deck MOBA', async () => {
  const ui = await setup();
  try {
    await ui.render();
    assert.equal(document.querySelectorAll('.moba__booster').length, 0);
    assert.equal(ui.button('Commencer le duel').disabled, true);
    assert.match(document.querySelector('.moba__setup-empty').textContent, /créez-en un/i);
    await act(async () => ui.button('Créer un deck').click());
    assert.ok(document.querySelector('[aria-label="Composer le deck de Vous"]'));
    assert.match(document.querySelector('.moba__editor-summary').textContent, /0 \/ 30/);
    assert.equal(ui.button('Utiliser ce deck').disabled, true);
    await act(async () => ui.button('Annuler').click());
    await ui.render([{ ...deck('invalid', 'Invalide'), cardIds: [] }]);
    assert.equal(ui.button('Commencer le duel').disabled, true);
  } finally { await ui.cleanup(); }
});

test('la personnalisation reste utilisable et se présente sur la même rangée', async () => {
  const ui = await setup();
  try {
    await ui.render([deck('maison', 'Mon deck')]);
    await act(async () => ui.button('Personnaliser le deck').click());
    assert.equal(ui.button('Utiliser ce deck').disabled, false);
    await act(async () => ui.button('Utiliser ce deck').click());
    assert.equal(ui.button('Deck personnalisé').getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('.moba__booster-list').length, 1);
    await act(async () => ui.button('Mon deck').click());
    assert.equal(ui.button('Mon deck').getAttribute('aria-pressed'), 'true');
    assert.equal(ui.button('Deck personnalisé'), undefined);
  } finally { await ui.cleanup(); }
});
