import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CARD_FRAME_COLORS, RPG_ASCENSION_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS } from '../src/games/rpgCards.js';

const lire = (chemin) => readFileSync(new URL(`../src/games/${chemin}`, import.meta.url), 'utf8');

test('toutes les cartes utilisent le cadre Le Sablier', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Cadre } = await vite.ssrLoadModule('/src/games/RpgCadreCarte.jsx');
    const cadre = /class="rpg-cadre-carte rpg-cadre-carte--sablier"(?: style="[^"]*")? aria-hidden="true"/;
    for (const carte of [...RPG_DUEL_CARDS, ...RPG_ASCENSION_CARDS, ...['magie', 'arme', 'creature', 'hero', 'terrain', 'site'].map(kind => ({ kind }))]) {
      assert.match(renderToStaticMarkup(React.createElement(Cadre, { carte })), cadre, carte.id ?? carte.kind);
    }
    assert.equal(renderToStaticMarkup(React.createElement(Cadre)), '');
    assert.equal(renderToStaticMarkup(React.createElement(Cadre, { carte: {} })), '');
  } finally {
    await vite.close();
  }
});

test('la couleur suit les éléments et les hybrides conservent chaque couleur', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Cadre } = await vite.ssrLoadModule('/src/games/RpgCadreCarte.jsx');
    const html = (carte) => renderToStaticMarkup(React.createElement(Cadre, { carte }));
    const svg = (carte) => decodeURIComponent(html(carte).match(/data:image\/svg\+xml,([^&"\s]+)/)?.[1] ?? '');
    const source = lire('assets/cadre-le-sablier.svg');
    for (const element of RPG_ELEMENTS) {
      const attendu = source.replaceAll('#ffd60b', CARD_FRAME_COLORS[element].color);
      for (const kind of ['creature', 'hero', 'magie', 'arme', 'terrain', 'site']) {
        assert.equal(svg({ kind, element }), attendu, `${kind} ${element}`);
      }
    }
    const hybride = { kind: 'creature', colors: ['tenebres', 'braise', 'eau', 'braise'] };
    const dessin = svg(hybride);
    assert.equal(dessin, svg({ ...hybride, colors: ['eau', 'tenebres', 'braise'] }), 'ordre canonique et doublons');
    assert.match(dessin, /gradientUnits="userSpaceOnUse"/);
    const teintes = [...dessin.matchAll(/stop-color="(#[a-f0-9]+)"/gi)].map(m => m[1]);
    assert.deepEqual(teintes, ['braise', 'eau', 'tenebres'].flatMap(e => [CARD_FRAME_COLORS[e].color, CARD_FRAME_COLORS[e].color]));
    assert.equal(dessin.replace(/<linearGradient[^]*?<\/linearGradient>/, '').replaceAll('url(#cadre-elements)', '#ffd60b'), source, 'seules les couleurs du SVG changent');
    assert.doesNotMatch(html({ kind: 'creature' }), /style=/, 'sans élément, repli sur le dessin doré');
    assert.doesNotMatch(html({ kind: 'creature', element: 'inconnu' }), /style=/);
  } finally { await vite.close(); }
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
  assert.match(lire('rpg-bouclier.css'), /\.rpg-cadre-carte, \.rpg-card__img/);
  assert.match(css, /pointer-events:\s*none/);
  assert.doesNotMatch(css, /--rpg-ecusson-masque/);
  // Les illustrations ne doivent plus dépendre d'un SVG externe pour être
  // visibles : chaque découpe reste une forme CSS autonome, avec repli naturel
  // sur l'image entière si le navigateur ne reconnaît pas polygon().
  assert.match(css, /:has\(> \.rpg-cadre-carte--sablier\) \{\s*--rpg-cadre-decoupe: polygon\(/);
  assert.doesNotMatch(css, /decoupes-cartes\.svg|--rpg-cadre-decoupe:\s*url\(/);
  assert.match(css, /cadre-le-sablier\.svg/);
  assert.doesNotMatch(css, /cadre-(?:ascension|sorts|arme|creature)\.svg/);
  assert.match(lire('assets/cadre-le-sablier.svg'), /viewBox="0 0 179\.24 256\.06" preserveAspectRatio="none"/);
});

test('le dessin utilisé est celui du commit, adapté au ratio des faces', () => {
  const original = readFileSync(new URL('../public/Cadre Le sablier.svg', import.meta.url), 'utf8');
  assert.equal(lire('assets/cadre-le-sablier.svg'), original.replace('viewBox="0 0 179.24 256.06"', 'viewBox="0 0 179.24 256.06" preserveAspectRatio="none"'));
});

test('les anciens fichiers de cadres de cartes sont supprimés', async () => {
  const { existsSync } = await import('node:fs');
  for (const chemin of ['public/Cadre arme.svg', 'public/Cadre créature.svg', 'public/Cadre créatures Ascension.svg', 'public/Cadre sorts.svg', 'src/games/assets/cadre-arme.svg', 'src/games/assets/cadre-creature.svg', 'src/games/assets/cadre-sorts.svg']) {
    assert.equal(existsSync(new URL(`../${chemin}`, import.meta.url)), false, chemin);
  }
});

test('les vues de secours de la réserve et du rituel utilisent aussi le cadre', () => {
  const reserve = lire('RpgReserveAscension.jsx');
  assert.match(reserve, /rpg-ascension-preview-fallback-art[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{carte\} \/>/);
  assert.match(reserve, /rpg-ascension-ritual-art[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{carte\} \/>/);
  assert.match(reserve, /rpg-ascension-card-fallback[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{c\} \/>/);
  assert.equal((lire('RpgDuelPage.jsx').match(/<img src=\{cardArt\(terrain\.carteId\)\} alt="" \/>\s*<RpgCadreCarte carte=\{carte\} \/>/g) ?? []).length, 2);
});
