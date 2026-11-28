import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('la carte nue conserve ses clics pendant le départ de son arme', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const ancienWindow = globalThis.window, ancienDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { useArmesRetirees } = await server.ssrLoadModule('/src/games/RpgOrnements.jsx');
    let clics = 0;
    const entite = { id: 'a', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, arme: { carteId: 'takouba-des-pistes', durabilite: 1 } };
    const duel = { joueur: { creatures: [entite] }, sorcier: { creatures: [] } };
    function Plateau() {
      const effets = useArmesRetirees(duel, duel);
      return React.createElement(TableCard, { entite, cote: 'joueur', armeDepartFx: effets['joueur:a'], onClick: () => clics++ });
    }
    root = createRoot(document.getElementById('root'));
    const render = () => act(async () => root.render(React.createElement(Plateau)));
    await render(); assert.equal(document.querySelector('[data-arme-depart]'), null);
    entite.arme = null; await render();
    assert.ok(document.querySelector('button.rpg-card [data-arme-depart="takouba-des-pistes"]'));
    assert.equal(document.querySelector('.rpg-card__arme-derriere'), null, 'le fantôme ne remplace pas une arme interactive');
    await act(async () => document.querySelector('button.rpg-card').click()); assert.equal(clics, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = ancienWindow; globalThis.document = ancienDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
