import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { RPG_ASCENSION_CARDS, RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

const lire = (chemin) => readFileSync(new URL(`../src/games/${chemin}`, import.meta.url), 'utf8');

test('toutes les cartes utilisent le cadre des créatures', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Cadre } = await vite.ssrLoadModule('/src/games/RpgCadreCarte.jsx');
    const cadre = /class="rpg-cadre-carte rpg-cadre-carte--creature" aria-hidden="true"/;
    for (const carte of [...RPG_DUEL_CARDS, ...RPG_ASCENSION_CARDS, ...['magie', 'arme', 'creature', 'hero', 'terrain', 'site'].map(kind => ({ kind }))]) {
      assert.match(renderToStaticMarkup(React.createElement(Cadre, { carte })), cadre, carte.id ?? carte.kind);
    }
    assert.equal(renderToStaticMarkup(React.createElement(Cadre)), '');
    assert.equal(renderToStaticMarkup(React.createElement(Cadre, { carte: {} })), '');
  } finally {
    await vite.close();
  }
});

test('le cadre suit l’illustration dans les faces du jeu, sans intercepter les interactions', () => {
  const duel = lire('RpgDuelPage.jsx');
  for (const art of ['cardArt(carte)} alt={`Illustration de ${carte.name}`}', 'estEnFurie ? cardArtFurie(carte) : (entite?.art ?? cardArt(carte))', 'className="rpg-mulligan__img"', 'className="rpg-hand__img"', 'className={`rpg-card__img']) {
    const start = duel.indexOf(art);
    const frame = duel.indexOf('<RpgCadreCarte carte={carte} />', start);
    assert.ok(start >= 0 && frame > start && frame - start < 300, art);
  }
  for (const fichier of ['RpgMobaBoard.jsx', 'RpgDeckAtelier.jsx', 'RpgCardGuide.jsx', 'RpgBoosterOuverture.jsx']) {
    assert.match(lire(fichier), /<RpgCadreCarte carte=\{(?:carte|card|cardById\(entity\.carteId\))\} \/>/, fichier);
  }
  const css = lire('rpg-cadre-carte.css');
  assert.match(css, /z-index:\s*1/);
  assert.match(css, /> img:has\(\+ \.rpg-cadre-carte\)\s*\{\s*clip-path:\s*var\(--rpg-cadre-decoupe\)/);
  assert.match(css, /rpg-card\.rpg-carte-bouclier > \.rpg-cadre-carte \{ scale: 1/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /mask:\s*var\(--rpg-ecusson-masque\)/);
  // Les illustrations ne doivent plus dépendre d'un SVG externe pour être
  // visibles : chaque découpe reste une forme CSS autonome, avec repli naturel
  // sur l'image entière si le navigateur ne reconnaît pas polygon().
  assert.match(css, /:has\(> \.rpg-cadre-carte--creature\) \{\s*--rpg-cadre-decoupe: polygon\(/);
  assert.doesNotMatch(css, /decoupes-cartes\.svg|--rpg-cadre-decoupe:\s*url\(/);
  assert.match(css, /cadre-creature\.svg/);
  assert.doesNotMatch(css, /cadre-(?:ascension|sorts|arme)\.svg/);
  assert.match(lire('assets/cadre-creature.svg'), /viewBox="0 0 179\.24 256\.06" preserveAspectRatio="none"/);
});

test('les SVG utilisés sont les dessins du commit, hormis leur adaptation au ratio des faces', () => {
  for (const [source, dest] of [['Cadre sorts.svg', 'sorts'], ['Cadre arme.svg', 'arme'], ['Cadre créature.svg', 'creature']]) {
    const original = readFileSync(new URL(`../public/${source}`, import.meta.url), 'utf8');
    assert.equal(lire(`assets/cadre-${dest}.svg`), original.replace('viewBox="0 0 179.24 256.06"', 'viewBox="0 0 179.24 256.06" preserveAspectRatio="none"'));
  }
});


test('les vues de secours de la réserve et du rituel utilisent aussi le cadre', () => {
  const reserve = lire('RpgReserveAscension.jsx');
  assert.match(reserve, /rpg-ascension-preview-fallback-art[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{carte\} \/>/);
  assert.match(reserve, /rpg-ascension-ritual-art[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{carte\} \/>/);
  assert.match(reserve, /rpg-ascension-card-fallback[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{c\} \/>/);
  assert.equal((lire('RpgDuelPage.jsx').match(/<img src=\{cardArt\(terrain\.carteId\)\} alt="" \/>\s*<RpgCadreCarte carte=\{carte\} \/>/g) ?? []).length, 2);
});
