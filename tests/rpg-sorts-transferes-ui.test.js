import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('Conquête : un ancien sort dans le deck se retire mais ne peut pas être ajouté', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  // React's legacy input polyfill expects these IE hooks when loaded before JSDOM.
  dom.window.HTMLElement.prototype.attachEvent = () => {};
  dom.window.HTMLElement.prototype.detachEvent = () => {};
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Editor } = await server.ssrLoadModule('/src/games/RpgMobaDeckEditor.jsx');
    const { RPG_DECKS_THEMATIQUES } = await server.ssrLoadModule('/src/games/rpgDecksThematiques.js');
    const deck = { ...RPG_DECKS_THEMATIQUES[0], cardIds: [...RPG_DECKS_THEMATIQUES[0].cardIds] };
    deck.cardIds[0] = 'rapport-du-greffier';
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Editor, { deck, joueur: 'Vous', onCancel() {}, onSave() {} })));
    const ajout = document.querySelector('[aria-label="Ajouter Rapport du greffier"]');
    const retrait = document.querySelector('[aria-label="Retirer Rapport du greffier"]');
    assert.ok(ajout?.disabled); assert.ok(retrait && !retrait.disabled);
    assert.match(document.querySelector('.moba__editor-summary').textContent, /capacité de créature.*remplacez/i);
    await act(async () => retrait.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.equal(document.querySelector('[aria-label="Retirer Rapport du greffier"]'), null);
    assert.match(document.querySelector('.moba__editor-summary').textContent, /29 \/ 30/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
