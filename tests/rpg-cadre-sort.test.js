import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { RPG_ASCENSION_CARDS, RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

const lire = (chemin) => readFileSync(new URL(`../src/games/${chemin}`, import.meta.url), 'utf8');

test('chaque carte reçoit le cadre correspondant à son type', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Cadre } = await vite.ssrLoadModule('/src/games/RpgCadreCarte.jsx');
    for (const [kind, type] of [['magie', 'magie'], ['arme', 'arme'], ['creature', 'creature'], ['hero', 'creature'], ['terrain', null], ['site', null]]) {
      const carte = RPG_DUEL_CARDS.find((c) => c.kind === kind) ?? { kind };
      const html = renderToStaticMarkup(React.createElement(Cadre, { carte }));
      if (type) assert.match(html, new RegExp(`class="rpg-cadre-carte rpg-cadre-carte--${type}" aria-hidden="true"`));
      else assert.equal(html, '', kind);
    }
    for (const carte of RPG_ASCENSION_CARDS) {
      assert.equal(renderToStaticMarkup(React.createElement(Cadre, { carte })), '', carte.id);
    }
    for (const kind of ['hero', 'magie', 'arme', 'site']) {
      const html = renderToStaticMarkup(React.createElement(Cadre, { carte: { kind, ascension: {} } }));
      assert.doesNotMatch(html, /rpg-cadre-carte--ascension/, kind);
    }
    assert.equal(renderToStaticMarkup(React.createElement(Cadre)), '');
  } finally {
    await vite.close();
  }
});

test('le cadre suit l’illustration dans les faces du jeu, sans intercepter les interactions', () => {
  const duel = lire('RpgDuelPage.jsx');
  for (const art of ['cardArt(carte)} alt={`Illustration de ${carte.name}`}', 'estEnFurie ? cardArtFurie(carte) : cardArt(carte)', 'className="rpg-mulligan__img"', 'className="rpg-hand__img"', 'className={`rpg-card__img']) {
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
  for (const type of ['magie', 'arme', 'creature']) {
    assert.match(css, new RegExp(`:has\\(> \\.rpg-cadre-carte--${type}\\) \\{\\s*--rpg-cadre-decoupe: polygon\\(`));
  }
  assert.doesNotMatch(css, /cadre-ascension\.svg|rpg-cadre-carte--ascension/);
  assert.doesNotMatch(css, /decoupes-cartes\.svg|--rpg-cadre-decoupe:\s*url\(/);
  for (const type of ['sorts', 'arme', 'creature']) {
    assert.match(css, new RegExp(`cadre-${type}\\.svg`));
    assert.match(lire(`assets/cadre-${type}.svg`), /viewBox="0 0 179\.24 256\.06" preserveAspectRatio="none"/);
  }
});

test('les SVG utilisés sont les dessins du commit, hormis leur adaptation au ratio des faces', () => {
  for (const [source, dest] of [['Cadre sorts.svg', 'sorts'], ['Cadre arme.svg', 'arme'], ['Cadre créature.svg', 'creature']]) {
    const original = readFileSync(new URL(`../public/${source}`, import.meta.url), 'utf8');
    assert.equal(lire(`assets/cadre-${dest}.svg`), original.replace('viewBox="0 0 179.24 256.06"', 'viewBox="0 0 179.24 256.06" preserveAspectRatio="none"'));
  }
});


test('les vues de secours de la réserve et du rituel restent sans cadre', () => {
  assert.doesNotMatch(lire('RpgReserveAscension.jsx'), /<RpgCadreCarte/);
});
