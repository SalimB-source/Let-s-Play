import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const css = readFileSync('src/games/rpg-battle.css', 'utf8');

test('le cimetière affiche les cartes récentes, les noms, les filtres et le détail', async () => {
  await build({ logLevel: 'error', build: { ssr: 'src/games/RpgDuelPage.jsx', outDir: 'node_modules/.cache/rpg-cimetiere-test', emptyOutDir: true } });
  const { CimetiereCarousel } = await import('../node_modules/.cache/rpg-cimetiere-test/RpgDuelPage.js');
  const html = renderToStaticMarkup(React.createElement(CimetiereCarousel, {
    cartes: ['chien-du-guet', 'dune-marchante', 'chien-du-guet'], campLabel: 'VOTRE', onClose() {},
  }));
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__item').length, 3);
  assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__name').length, 3);
  assert.equal(document.querySelectorAll('.rpg-graveyard-carousel__filters button').length, 4);
  assert.ok(document.querySelector('.rpg-graveyard-carousel__details h2'));
  assert.ok(document.querySelector('[aria-label="Fermer le cimetière"]'));
  assert.match(css, /\.rpg-graveyard-carousel__cards\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /@media \(max-width: 600px\)/);
});
