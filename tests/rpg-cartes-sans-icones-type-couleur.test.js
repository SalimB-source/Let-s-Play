import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const lire = f => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');

test('les faces gardent les effets et les sceaux de sorts, sans repères de couleur', async () => {
  for (const fichier of ['RpgDuelPage.jsx', 'RpgMobaBoard.jsx', 'RpgCardGuide.jsx']) {
    const source = lire(fichier);
    assert.doesNotMatch(source, /<CardElementBadge/, fichier);
    assert.match(source, /<SortSceau/, fichier);
  }
  const atelier = lire('RpgDeckAtelier.jsx');
  const cout = atelier.slice(atelier.indexOf('function Cout('), atelier.indexOf('function trierCatalogue('));
  assert.doesNotMatch(cout, /<Pip/);
  assert.match(cout, /cardColorCost/);
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardById } = await server.ssrLoadModule('/src/games/rpgCards.js');
    for (const id of ['ashigaru-des-braises', 'trait-de-braise', 'javelot-du-beffroi', 'garde-du-trone-givre']) {
      const html = renderToStaticMarkup(React.createElement(RPG_RENDU_MOBA.HoverCardPreview, { carte: cardById(id), variante: 'annonce' }));
      assert.doesNotMatch(html, /rpg-card-element-badge/);
      if (id === 'trait-de-braise') assert.match(html, /rpg-sort-sceau--rapide/);
      else assert.doesNotMatch(html, /rpg-sort-sceau/);
      assert.match(html, /rpg-mana-cost/);
      assert.match(html, /rpg-hover-card-preview__details/);
    }
    for (const [id, famille] of [['trait-de-braise', 'rapide'], ['eau-de-la-source', 'sorcellerie']]) {
      const carte = cardById(id);
      for (const Component of [RPG_RENDU_MOBA.CarteMulligan, RPG_RENDU_MOBA.HoverCardPreview]) {
        const html = renderToStaticMarkup(React.createElement(Component, { carte, variante: 'annonce', onBasculer() {} }));
        assert.match(html, new RegExp(`rpg-sort-sceau--${famille}`));
        assert.match(html, /rpg-sort-sigil/);
      }
    }
    const garde = renderToStaticMarkup(React.createElement(RPG_RENDU_MOBA.HoverCardPreview, { carte: cardById('garde-du-trone-givre'), variante: 'annonce' }));
    assert.match(garde, /rpg-card-icones/, 'les icônes de capacités restent visibles');
  } finally { await server.close(); }
});
