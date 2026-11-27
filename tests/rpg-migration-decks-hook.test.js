import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('chargement local : les decks et un ancien coffret restauré sont migrés et persistés', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { useDecksSablier } = await server.ssrLoadModule('/src/games/useDecksSablier.js');
    const { AuthContext } = await server.ssrLoadModule('/src/auth/AuthContext.jsx');
    const { RPG_DECKS_THEMATIQUES } = await server.ssrLoadModule('/src/games/rpgDecksThematiques.js');
    const { RPG_DECKS_MAISON_STORAGE_KEY } = await server.ssrLoadModule('/src/games/rpgDeckBuilder.js');
    const { RPG_COFFRET_STORAGE_KEY } = await server.ssrLoadModule('/src/games/rpgCoffretBienvenue.js');
    const cardIds = [...RPG_DECKS_THEMATIQUES[0].cardIds];
    cardIds[0] = 'rapport-du-greffier';
    const deck = { id: 'maison-test', nom: 'Ancien', cardIds, majLe: '2024-01-01T00:00:00.000Z' };
    window.localStorage.setItem(RPG_DECKS_MAISON_STORAGE_KEY, JSON.stringify({ decks: [deck], supprimes: [] }));
    let etat;
    function App() { etat = useDecksSablier(); return null; }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    assert.ok(!etat.decksMaison[0].cardIds.includes('rapport-du-greffier'));
    assert.equal(etat.decksMaison[0].migrationSorts[0].retire, 'rapport-du-greffier');
    assert.ok(!JSON.parse(window.localStorage.getItem(RPG_DECKS_MAISON_STORAGE_KEY)).decks[0].cardIds.includes('rapport-du-greffier'));
    await act(async () => root.unmount()); root = null;
    window.localStorage.clear();
    const coffret = { id: 'ancien', nom: 'Coffret ancien', couleur: 'sable', cardIds, mythiqueId: cardIds[1], raresIds: cardIds.slice(2, 5) };
    window.localStorage.setItem(RPG_COFFRET_STORAGE_KEY, JSON.stringify({ coffrets: [coffret], choisi: coffret.id }));
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(App)));
    const restaure = etat.decksMaison.find(d => d.id === 'maison-ancien');
    assert.ok(restaure);
    assert.ok(!restaure.cardIds.includes('rapport-du-greffier'));
    assert.equal(restaure.migrationSorts[0].retire, 'rapport-du-greffier');
    assert.ok(!JSON.parse(window.localStorage.getItem(RPG_DECKS_MAISON_STORAGE_KEY)).decks[0].cardIds.includes('rapport-du-greffier'));
    await act(async () => root.unmount()); root = null;
    window.localStorage.clear();
    window.localStorage.setItem(RPG_DECKS_MAISON_STORAGE_KEY, JSON.stringify({ decks: [deck], supprimes: [] }));
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(AuthContext.Provider,
      { value: { user: { id: 'compte-hors-ligne' }, loading: false } }, React.createElement(App))));
    assert.equal(etat.statutSync, 'horsligne');
    assert.deepEqual(etat.decksMaison[0].cardIds, cardIds, 'pas de migration avant la lecture du compte');
    assert.deepEqual(JSON.parse(window.localStorage.getItem(RPG_DECKS_MAISON_STORAGE_KEY)).decks[0].cardIds, cardIds);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
