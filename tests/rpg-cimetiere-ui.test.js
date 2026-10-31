import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const page = readFileSync('src/games/RpgDuelPage.jsx', 'utf8');
const css = readFileSync('src/games/rpg-battle.css', 'utf8');
const mobile = readFileSync('src/games/rpg-mobile.css', 'utf8');

test('le cimetière expose chaque carte au clic droit sans titre supplémentaire', async () => {
  await build({ logLevel: 'error', build: { ssr: 'src/games/RpgDuelPage.jsx', outDir: 'node_modules/.cache/rpg-cimetiere-test', emptyOutDir: true } });
  const { CimetiereCarousel } = await import('../node_modules/.cache/rpg-cimetiere-test/RpgDuelPage.js');
  const html = renderToStaticMarkup(React.createElement(CimetiereCarousel, {
    cartes: ['chien-du-guet', 'dune-marchante', 'chien-du-guet'], campLabel: 'VOTRE', onClose() {},
  }));
  const document = new JSDOM(html).window.document;
  const cards = [...document.querySelectorAll('.rpg-graveyard-carousel__item')];
  assert.deepEqual(cards.map((card) => card.dataset.cardId), ['chien-du-guet', 'dune-marchante', 'chien-du-guet']);
  assert.ok(cards.every((card) => card.getAttribute('aria-label')));
  assert.equal(document.querySelector('.rpg-graveyard-carousel__name'), null);
  assert.ok(cards.every((card) => card.querySelector('.rpg-hover-card-preview--graveyard')));
  assert.match(page, /const surMenuContextuel = \(event\) => \{[\s\S]*?closest\?\.\('\[data-card-id\]'\)[\s\S]*?ouvrirApercuCatalogue\(carte/);
  assert.match(css, /\.rpg-hover-card-preview--graveyard\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(page, /if \(apercuCatalogue\) fermerApercuCatalogue\(\);\s*else if \(apercuAppui\) fermerApercuAppui\(\);\s*else if \(cimetiereOuvert\) fermerCimetiere\(\);/);
});

test('les cartes du cimetière sont agrandies et restent défilables sur mobile', () => {
  assert.match(css, /--rpg-graveyard-card-width:\s*clamp\(104px,\s*30dvh,\s*168px\)/);
  assert.match(css, /\.rpg-graveyard-carousel__item\s*\{[^}]*flex:\s*0 0 var\(--rpg-graveyard-card-width\)/s);
  assert.match(css, /\.rpg-graveyard-carousel__cards\s*\{[^}]*overflow-x:\s*auto/s);
  assert.doesNotMatch(mobile, /rpg-graveyard-carousel__item\s*\{[^}]*62px/s);
});
