import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('sceau d’arme pour les deux représentations, sans changer les sceaux de magie', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { SortSceau, SortSocle } = await server.ssrLoadModule('/src/games/rpgSortSignature.jsx');
    const { RPG_DUEL_CARDS, carteEstArme, magieFamille } = await server.ssrLoadModule('/src/games/rpgCards.js');
    const face = (carte) => renderToStaticMarkup(React.createElement(SortSceau, { carte, className: 'rpg-hand__sceau' }));
    const armes = RPG_DUEL_CARDS.filter(carteEstArme);
    assert.ok(armes.some((carte) => carte.kind === 'arme'));
    assert.ok(armes.some((carte) => carte.id === 'sabre-maudit' && carte.kind === 'magie'));
    for (const carte of armes) {
      assert.match(face(carte), /rpg-sort-sceau--arme/);
      assert.match(face(carte), /rpg-arme-sigil/);
      assert.doesNotMatch(face(carte), /rpg-sort-sceau--(?:rapide|sorcellerie)/);
      assert.equal(magieFamille(carte), null);
      assert.equal(renderToStaticMarkup(React.createElement(SortSocle, { carte })), '');
    }
    assert.match(face({ kind: 'magie', instant: true }), /rpg-sort-sceau--rapide/);
    assert.match(face({ kind: 'magie', instant: false }), /rpg-sort-sceau--sorcellerie/);
    for (const kind of ['creature', 'hero', 'site', 'terrain']) assert.equal(face({ kind }), '');
    const duel = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
    assert.match(duel, /<SortSceau carte=\{carte\} className="rpg-hand__sceau rpg-hand__sort" \/>/);
    assert.doesNotMatch(duel, /familleSort && <SortSceau/);
    const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
    assert.match(css, /\.rpg-hand__sceau\.rpg-sort-sceau--arme\s*\{\s*bottom: 24%/);
  } finally {
    await server.close();
  }
});
