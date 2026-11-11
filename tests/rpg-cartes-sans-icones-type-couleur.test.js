import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const lire = f => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');

test('les faces du catalogue, main, terrain, mulligan, guide et MOBA gardent les effets mais pas les repères de couleur ou type', async () => {
  for (const fichier of ['RpgDuelPage.jsx', 'RpgMobaBoard.jsx', 'RpgCardGuide.jsx']) {
    const source = lire(fichier);
    assert.doesNotMatch(source, /<CardElementBadge|<SortSceau/, fichier);
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
      assert.doesNotMatch(html, /rpg-card-element-badge|rpg-sort-sceau/);
      assert.match(html, /rpg-mana-cost/);
      assert.match(html, /rpg-hover-card-preview__details/);
    }
    const garde = renderToStaticMarkup(React.createElement(RPG_RENDU_MOBA.HoverCardPreview, { carte: cardById('garde-du-trone-givre'), variante: 'annonce' }));
    assert.match(garde, /rpg-card-icones/, 'les icônes de capacités restent visibles');
  } finally { await server.close(); }
});
