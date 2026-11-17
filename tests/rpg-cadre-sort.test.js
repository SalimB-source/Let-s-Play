import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { CARD_FRAME_COLORS, RPG_ASCENSION_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';

const lire = (chemin) => readFileSync(new URL(`../src/games/${chemin}`, import.meta.url), 'utf8');

test('les créatures et héros sont sans cadre SVG, les autres cartes le conservent', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Cadre } = await vite.ssrLoadModule('/src/games/RpgCadreCarte.jsx');
    const cadre = /class="rpg-cadre-carte rpg-cadre-carte--sablier"(?: style="[^"]*")? aria-hidden="true"/;
    for (const carte of [...RPG_DUEL_CARDS, ...RPG_ASCENSION_CARDS, ...['magie', 'arme', 'creature', 'hero', 'terrain', 'site'].map(kind => ({ kind }))]) {
      const html = renderToStaticMarkup(React.createElement(Cadre, { carte }));
      if (['creature', 'hero'].includes(carte.kind)) assert.equal(html, '', carte.id ?? carte.kind);
      else assert.match(html, cadre, carte.id ?? carte.kind);
    }
    assert.equal(renderToStaticMarkup(React.createElement(Cadre)), '');
    assert.equal(renderToStaticMarkup(React.createElement(Cadre, { carte: {} })), '');
  } finally {
    await vite.close();
  }
});

test('la table, le mulligan et les aperçus retirent seulement le cadre des créatures', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const { TableCard, HoverCardPreview, RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const doc = (element) => new JSDOM(renderToStaticMarkup(element)).window.document;
    for (const id of ['chien-du-guet', 'feriel', 'gardien-de-la-porte-ardente', RPG_ASCENSION_CARDS[0].id]) {
      const carte = cardById(id);
      const entite = { id: 'c1', carteId: id, name: carte.name, atk: carte.atk, def: carte.def, pv: carte.def, pvMax: carte.def, ready: true };
      for (const moba of [null, { className: 'moba__slot' }]) {
        const table = doc(React.createElement(TableCard, { entite, cote: 'joueur', moba }));
        assert.ok(table.querySelector('.rpg-card__img'), id);
        assert.equal(table.querySelector('.rpg-card > .rpg-cadre-carte'), null, id);
      }
      for (const variante of ['', 'catalogue', 'appui-long']) {
        const face = doc(React.createElement(HoverCardPreview, { carte, entite, variante })).querySelector('.rpg-hover-card-preview__face');
        assert.ok(face?.querySelector('img'), id);
        assert.equal(face.querySelector(':scope > .rpg-cadre-carte'), null, id);
      }
      const mulligan = doc(React.createElement(RPG_RENDU_MOBA.CarteMulligan, { carte, index: 0, onBasculer: () => {} }));
      assert.equal(mulligan.querySelector('.rpg-cadre-carte'), null, id);
    }
    for (const id of ['trait-de-braise', 'armure-de-cendres', 'sabre-maudit', 'source-de-bimini']) {
      const carte = cardById(id);
      for (const variante of ['', 'catalogue', 'appui-long']) {
        const apercu = doc(React.createElement(HoverCardPreview, { carte, variante }));
        // Le survol rapide des non-créatures est volontairement textuel.
        if (variante) assert.ok(apercu.querySelector('.rpg-hover-card-preview__face > .rpg-cadre-carte'), `${id} ${variante}`);
      }
      const mulligan = doc(React.createElement(RPG_RENDU_MOBA.CarteMulligan, { carte, index: 0, onBasculer: () => {} }));
      assert.ok(mulligan.querySelector('.rpg-cadre-carte'), id);
    }
  } finally { await vite.close(); }
});

test('atelier, guide et Souk partagent le même retrait sélectif', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: Atelier } = await vite.ssrLoadModule('/src/games/RpgDeckAtelier.jsx');
    const { default: Guide } = await vite.ssrLoadModule('/src/games/RpgCardGuide.jsx');
    const { default: Booster } = await vite.ssrLoadModule('/src/games/RpgBoosterOuverture.jsx');
    const doc = (element) => new JSDOM(renderToStaticMarkup(element)).window.document;
    const art = (carte) => `/cartes/${typeof carte === 'string' ? carte : carte.id}.jpg`;
    const atelier = doc(React.createElement(Atelier, { artUrl: art, onEnregistrer: () => {}, onAnnuler: () => {} }));
    for (const [id, cadre] of [['chien-du-guet', false], ['feriel', false], ['trait-de-braise', true], ['armure-de-cendres', true]]) {
      const face = atelier.querySelector(`.rpg-atelier__carte[data-card-id="${id}"] .rpg-atelier__carte-art`);
      assert.ok(face?.querySelector('img'), id);
      assert.equal(Boolean(face.querySelector('.rpg-cadre-carte')), cadre, id);
    }
    const guide = doc(React.createElement(Guide, { cardArt: art, onExit: () => {} }));
    for (const face of guide.querySelectorAll('.rpg-card-guide__example')) {
      assert.ok(face.querySelector('img'));
      assert.equal(face.querySelector('.rpg-cadre-carte'), null);
      if (['creature', 'hero'].includes(face.className.match(/rpg-card-guide__example--(\S+)/)?.[1])) {
        assert.doesNotMatch(face.className, /rpg-card--frame-/);
      }
    }
    assert.ok(guide.querySelectorAll('.rpg-card-guide__example').length);
    const guideCss = lire('rpg-card-guide.css');
    assert.match(guideCss, /\.rpg-card-guide__example--creature,[\s\S]*?\.rpg-card-guide__example--hero,[\s\S]*?border-width: 0 !important;[\s\S]*?background-size: 100% 100%, 0 0, 0 0 !important;/,
      'créatures et héros du guide ne reçoivent pas la bordure colorée');
    assert.match(guideCss, /\.rpg-card-guide__example--creature,\s*\.rpg-card-guide__example--hero\s*\{[^}]*box-shadow: 0 12px 30px rgba\(0, 0, 0, \.48\);/s,
      'aucun halo intérieur de cadre ne reste sur le guide');
    const ids = ['chien-du-guet', 'feriel', 'trait-de-braise', 'armure-de-cendres', 'sabre-maudit', 'chien-du-guet', 'feriel'];
    const souk = doc(React.createElement(Booster, { ouverture: { cartes: ids.map((id) => ({ id })) }, cardArt: art, onFermer: () => {} }));
    for (const [id, cadre] of [['chien-du-guet', false], ['feriel', false], ['trait-de-braise', true], ['armure-de-cendres', true], ['sabre-maudit', true]]) {
      const face = souk.querySelector(`.rpg-souk__carte[data-card-id="${id}"]`);
      assert.ok(face?.querySelector('img'), id);
      assert.equal(Boolean(face.querySelector('.rpg-cadre-carte')), cadre, id);
    }
  } finally { await vite.close(); }
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
      for (const kind of ['magie', 'arme', 'terrain', 'site']) {
        assert.equal(svg({ kind, element }), attendu, `${kind} ${element}`);
      }
    }
    const hybride = { kind: 'magie', colors: ['tenebres', 'braise', 'eau', 'braise'] };
    const dessin = svg(hybride);
    assert.equal(dessin, svg({ ...hybride, colors: ['eau', 'tenebres', 'braise'] }), 'ordre canonique et doublons');
    assert.match(dessin, /gradientUnits="userSpaceOnUse"/);
    const teintes = [...dessin.matchAll(/stop-color="(#[a-f0-9]+)"/gi)].map(m => m[1]);
    assert.deepEqual(teintes, ['braise', 'eau', 'tenebres'].flatMap(e => [CARD_FRAME_COLORS[e].color, CARD_FRAME_COLORS[e].color]));
    assert.equal(dessin.replace(/<linearGradient[^]*?<\/linearGradient>/, '').replaceAll('url(#cadre-elements)', '#ffd60b'), source, 'seules les couleurs du SVG changent');
    assert.doesNotMatch(html({ kind: 'arme' }), /style=/, 'sans élément, repli sur le dessin doré');
    assert.doesNotMatch(html({ kind: 'magie', element: 'inconnu' }), /style=/);
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
  const bouclier = lire('rpg-bouclier.css');
  assert.doesNotMatch(bouclier, /--rpg-ecusson|mask-image|clip-path|background-image|border\s*:/,
    'le Défenseur ne réintroduit aucune forme de cadre');
  assert.match(bouclier, /\.rpg-card\.rpg-carte-bouclier \{[^}]*scale: var\(--rpg-defenseur-echelle\);/s,
    'le repère Défenseur conserve sa mise en page');
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

test('les vues de secours passent par le composant de cadre sélectif', () => {
  const reserve = lire('RpgReserveAscension.jsx');
  assert.match(reserve, /rpg-ascension-preview-fallback-art[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{carte\} \/>/);
  assert.match(reserve, /rpg-ascension-ritual-art[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{carte\} \/>/);
  assert.match(reserve, /rpg-ascension-card-fallback[\s\S]*?<img[^>]+\/><RpgCadreCarte carte=\{c\} \/>/);
  assert.equal((lire('RpgDuelPage.jsx').match(/<img src=\{cardArt\(terrain\.carteId\)\} alt="" \/>\s*<RpgCadreCarte carte=\{carte\} \/>/g) ?? []).length, 2);
});
