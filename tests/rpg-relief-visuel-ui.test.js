import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

test('la lumière du sort se rejoue sur chaque annonce, sans altérer son texte', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    root = createRoot(document.getElementById('root'));
    const annonce = { carteId: 'le-grand-debarquement', token: 1, cible: { nom: 'Champ de bataille' } };
    const render = async (a) => act(async () => root.render(React.createElement(RPG_RENDU_MOBA.SpellAnnouncement, { annonce: a })));
    await render(annonce);
    const lumiere = document.querySelector('.rpg-lumiere-sort');
    assert.ok(lumiere);
    assert.equal(lumiere.getAttribute('aria-hidden'), 'true');
    assert.match(document.querySelector('[role="status"]').getAttribute('aria-label'), /Champ de bataille/);
    assert.ok(document.querySelector('[role="status"]').style.getPropertyValue('--rpg-lumiere-fond'));
    await render(annonce);
    assert.equal(document.querySelector('.rpg-lumiere-sort'), lumiere);
    await render({ ...annonce, token: 2 });
    assert.notEqual(document.querySelector('.rpg-lumiere-sort'), lumiere);
    await act(async () => root.unmount()); root = null;
    assert.equal(document.querySelector('.rpg-lumiere-sort'), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
