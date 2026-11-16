import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

const lire = (chemin) => readFileSync(new URL(`../src/games/${chemin}`, import.meta.url), 'utf8');

test('le cadre est décoratif et réservé aux sorts, jamais aux armes ni aux créatures', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Cadre } = await vite.ssrLoadModule('/src/games/RpgCadreSort.jsx');
    for (const kind of ['magie', 'arme', 'creature', 'hero', 'terrain', 'site']) {
      const carte = RPG_DUEL_CARDS.find((c) => c.kind === kind);
      const html = renderToStaticMarkup(React.createElement(Cadre, { carte: carte ?? { kind } }));
      if (kind === 'magie') assert.match(html, /class="rpg-cadre-sort" aria-hidden="true"/);
      else assert.equal(html, '', kind);
    }
    assert.equal(renderToStaticMarkup(React.createElement(Cadre)), '');
  } finally {
    await vite.close();
  }
});

test('le cadre est placé après l’art dans les faces et sous les repères', () => {
  const duel = lire('RpgDuelPage.jsx');
  for (const art of ['cardArt(carte)} alt={`Illustration de ${carte.name}`}', 'estEnFurie ? cardArtFurie(carte) : cardArt(carte)', 'className="rpg-mulligan__img"', 'className="rpg-hand__img"']) {
    const start = duel.indexOf(art);
    const frame = duel.indexOf('<RpgCadreSort carte={carte} />', start);
    assert.ok(start >= 0 && frame > start && frame - start < 220, art);
  }
  for (const fichier of ['RpgMobaBoard.jsx', 'RpgDeckAtelier.jsx', 'RpgCardGuide.jsx', 'RpgBoosterOuverture.jsx']) {
    assert.match(lire(fichier), /<RpgCadreSort carte=\{(?:carte|card)\} \/>/, fichier);
  }
  const css = lire('rpg-cadre-sort.css');
  assert.match(css, /z-index:\s*1/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /cadre-sorts\.svg/);
  assert.match(lire('assets/cadre-sorts.svg'), /preserveAspectRatio="none"/);
});
