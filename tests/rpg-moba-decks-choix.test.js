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

test('les douze thèmes précèdent les decks personnels et restent sélectionnables', async () => {
  const ui = await setup();
  const valide = deck('maison-valide', 'Mon deck créé');
  const autre = deck('maison-autre', 'Mon autre deck', MOBA_DECKS[1]);
  const invalide = { ...valide, id: 'maison-invalide', name: 'Deck incomplet', cardIds: [] };
  try {
    await ui.render([invalide, valide, autre]);
    const maison = ui.button('Mon deck créé'), second = ui.button('Mon autre deck'), interdit = ui.button('Deck incomplet');
    assert.equal(document.querySelectorAll('.moba__booster').length, MOBA_DECKS.length + 3);
    assert.deepEqual([...document.querySelectorAll('.moba__booster')].slice(0, MOBA_DECKS.length)
      .map((button) => button.querySelector('.moba__booster-name').textContent), MOBA_DECKS.map((theme) => theme.name));
    assert.equal(document.querySelector('.moba__setup-details'), null);
    assert.equal(document.querySelector('.moba__opponent-deck'), null);
    assert.equal(maison.getAttribute('aria-pressed'), 'true', 'un deck personnel existant reste le choix par défaut');
    assert.equal(ui.button(MOBA_DECKS[0].name).getAttribute('aria-pressed'), 'false');
    assert.equal(interdit.disabled, true);
    assert.match(maison.textContent, /Personnel/);
    assert.match(interdit.closest('.moba__booster-item').textContent, /30 cartes exigées/);
    assert.ok(maison.querySelector('.moba__booster-face img')); assert.ok(maison.querySelector('.moba__booster-edge'));
    for (const theme of MOBA_DECKS.filter(d => d.id.startsWith('ascension-'))) {
      const bouton = ui.button(theme.name);
      assert.ok(bouton.querySelector('img').getAttribute('src').includes(theme.boxArt));
      await act(async () => bouton.click());
      assert.equal(bouton.getAttribute('aria-pressed'), 'true');
      assert.equal(ui.button('Commencer le duel').disabled, false);
    }
    await act(async () => ui.button(MOBA_DECKS[0].name).click());
    assert.equal(ui.button(MOBA_DECKS[0].name).getAttribute('aria-pressed'), 'true', 'le thème est sélectionnable');
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

test('sans deck personnel les douze thèmes permettent de jouer et de créer un deck maison', async () => {
  const ui = await setup();
  try {
    await ui.render();
    assert.equal(document.querySelectorAll('.moba__booster').length, 12);
    assert.equal(ui.button('Commencer le duel').disabled, false);
    assert.equal(document.querySelector('.moba__setup-empty'), null);
    await act(async () => ui.button('Personnaliser le deck').click());
    assert.ok(document.querySelector('[aria-label="Composer le deck de Vous"]'));
    assert.equal(ui.button('Utiliser ce deck').disabled, false, 'le thème sélectionné sert de point de départ à la personnalisation');
    await act(async () => ui.button('Annuler').click());
    await ui.render([{ ...deck('invalid', 'Invalide'), cardIds: [] }]);
    assert.equal(ui.button('Commencer le duel').disabled, false, 'un deck personnel incomplet ne masque pas les thèmes jouables');
    assert.equal(ui.button('Invalide').disabled, true);
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
