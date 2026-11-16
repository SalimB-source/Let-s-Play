/** Rond doré PLEIN et éclatement en mille morceaux de l'avatar du perdant.
 *  Aucun PNG transparent : le disque est un laiton opaque dessiné en CSS, et
 *  les éclats sont des tranches du WebP déjà livré, pas un nouvel asset. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

import { GRILLE_ECLATS, creerEclatsAvatar, ECLATS_AVATAR, NOMBRE_ECLATS } from '../src/games/rpgAvatarEclats.js';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const plateauCss = lire('rpg-avatars-plateau.css');
const eclatCss = lire('rpg-avatar-eclatement.css');
const composant = lire('RpgAvatarEclatement.jsx');
const generateur = lire('rpgAvatarEclats.js');
const duel = lire('RpgDuelPage.jsx');
const scriptMobile = readFileSync(new URL('../scripts/rpg-avatars-mobile-check.mjs', import.meta.url), 'utf8');

/** Le corps d'une règle CSS, sans ses commentaires. */
const corpsDe = (css, marqueur) => {
  const i = css.indexOf(marqueur);
  assert.ok(i >= 0, `${marqueur} existe`);
  return css.slice(i, css.indexOf('}', i));
};

test('le rond doré de l’avatar est rempli complètement, sans PNG transparent', () => {
  const disque = corpsDe(plateauCss, '.rpg-wizard-plate__avatar::before {');
  assert.match(disque, /background-color:\s*#d7ad61;/, 'fond opaque partout');
  assert.match(disque, /background-image:\s*radial-gradient\(/, 'relief de laiton en CSS');
  assert.doesNotMatch(disque, /background:\s*transparent|rgba\(0, ?0, ?0, ?0\)/, 'plus de centre transparent');
  assert.match(disque, /border:\s*3px solid #d7ad61/, 'le cercle doré reste');
  // Aucun fichier image nouveau, et surtout aucun PNG transparent.
  for (const [nom, source] of [
    ['rpg-avatars-plateau.css', plateauCss], ['rpg-avatar-eclatement.css', eclatCss],
    ['RpgAvatarEclatement.jsx', composant], ['rpgAvatarEclats.js', generateur],
    ['RpgDuelPage.jsx', duel],
  ]) {
    assert.doesNotMatch(source, /\.png|data:image\/png|image\/png/i, `${nom} : aucun PNG`);
    assert.doesNotMatch(source, /background:\s*transparent[^;]*!important/i, `${nom} : aucune transparence forcée du disque`);
  }
  // Le WebP détouré déjà livré est réutilisé, pas remplacé.
  assert.match(duel, /avatarDuel\(/, 'le portrait du plateau vient toujours du registre existant');
  assert.equal(readFileSync(new URL('../scripts/rpg-avatars-mobile-check.mjs', import.meta.url), 'utf8').includes('rgb(215, 173, 97)'), true,
    'la vérification navigateur attend désormais le disque rempli');
  assert.doesNotMatch(scriptMobile, /centre transparent/);
});

test('un millier de morceaux, tous dans le disque, déterministes et sans NaN', () => {
  assert.equal(GRILLE_ECLATS, 36, 'grille 36 × 36');
  assert.ok(NOMBRE_ECLATS >= 1000 && NOMBRE_ECLATS <= 1100,
    `${NOMBRE_ECLATS} éclats : « mille morceaux »`);
  assert.equal(ECLATS_AVATAR.length, NOMBRE_ECLATS);
  assert.deepEqual(creerEclatsAvatar(), creerEclatsAvatar(), 'aucun hasard non reproductible');

  const ids = new Set();
  for (const eclat of ECLATS_AVATAR) {
    assert.ok(!ids.has(eclat.id), `identifiant unique ${eclat.id}`);
    ids.add(eclat.id);
    assert.ok(eclat.forme >= 0 && eclat.forme <= 3, 'une des quatre découpes');
    const { style } = eclat;
    for (const cle of ['--col', '--ligne', '--x', '--y', '--r', '--d', '--duree', '--teinte']) {
      assert.ok(style[cle] !== undefined, `${cle} présent`);
      assert.doesNotMatch(String(style[cle]), /NaN|Infinity|undefined/, `${cle} fini`);
    }
    const nx = ((Number(style['--col']) + .5) / GRILLE_ECLATS) * 2 - 1;
    const ny = ((Number(style['--ligne']) + .5) / GRILLE_ECLATS) * 2 - 1;
    assert.ok(Math.hypot(nx, ny) <= 1, 'aucun éclat ne vient d’un coin hors du cercle');
    assert.match(style['--x'], /cqw$/, 'portée proportionnelle au disque');
    assert.match(style['--y'], /cqw$/);
    assert.match(style['--r'], /deg$/);
    assert.match(style['--d'], /ms$/);
    assert.match(style['--duree'], /ms$/);
  }
  assert.doesNotMatch(generateur, /Math\.random/, 'trajectoires reproductibles');
});

test('le composant rend tous les éclats et reste décoratif', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: Eclatement } = await vite.ssrLoadModule('/src/games/RpgAvatarEclatement.jsx');
    const html = renderToStaticMarkup(React.createElement(Eclatement, {
      image: '/Let-s-Play/sablier-story/avatars/avatar-salem.webp?v=duel-tetes-1', camp: 'joueur',
    }));
    assert.equal((html.match(/<i /g) ?? []).length, NOMBRE_ECLATS, 'tous les morceaux sont rendus');
    assert.match(html, /class="rpg-avatar-eclatement"/);
    assert.match(html, /aria-hidden="true"/, 'purement décoratif');
    assert.match(html, /data-camp="joueur"/);
    assert.match(html, /--rpg-eclat-image:url\(&quot;.*avatar-salem\.webp/, 'tranches du portrait existant');
    assert.match(html, /--col:\d+|--col:0/, 'variables de découpe');
    assert.match(html, /--x:[-0-9.]+cqw/, 'trajectoire individuelle');
    assert.match(html, /rpg-avatar-eclatement__flash/, 'éclair initial');
    assert.equal(renderToStaticMarkup(React.createElement(Eclatement, { image: null })), '',
      'sans portrait, aucun calque');
    assert.equal(html, renderToStaticMarkup(React.createElement(Eclatement, {
      image: '/Let-s-Play/sablier-story/avatars/avatar-salem.webp?v=duel-tetes-1', camp: 'joueur',
    })), 'rendu stable d’un appel à l’autre');
  } finally { await vite.close(); }
});

test('l’animation est individuelle, l’écran de fin attend, le mouvement réduit court-circuite', () => {
  assert.match(eclatCss, /@keyframes rpg-avatar-eclat-vol/);
  assert.match(eclatCss, /translate:\s*var\(--x\) var\(--y\)/, 'chaque éclat a sa trajectoire');
  assert.match(eclatCss, /rotate:\s*var\(--r\)/);
  assert.match(eclatCss, /animation:\s*rpg-avatar-eclat-vol var\(--duree\)/);
  assert.match(eclatCss, /container-type:\s*inline-size/, 'cqw résolu sur le disque');
  assert.match(eclatCss, /background-color:\s*#d7ad61/, 'chaque morceau est opaque');
  assert.match(eclatCss, /background-size:\s*3600% 3600%/, '36 × 36 tranches du portrait');
  assert.match(eclatCss, /clip-path: polygon/);
  assert.match(eclatCss, /pointer-events:\s*none/, 'le calque n’intercepte aucun clic');
  assert.match(eclatCss, /\.rpg-overlay--apres-eclat \{[^}]*1420ms/s, 'l’écran de fin attend l’éclatement');
  assert.match(eclatCss, /prefers-reduced-motion: reduce[\s\S]*?display: none/s);
  assert.match(eclatCss, /\.rpg-battle\.is-reduced \.rpg-avatar-eclatement \{ display: none; \}/);
});

test('seul l’avatar du perdant éclate, à la fin du duel', () => {
  assert.match(duel, /import RpgAvatarEclatement from '\.\/RpgAvatarEclatement\.jsx';/);
  assert.match(duel, /const eclatementActif = Boolean\(vainqueur\) && !rpgAnimationsReduites\(animReduite\);/);
  assert.match(duel, /const eclatementPlateauEnnemi = eclatementActif && vainqueur !== 'sorcier';/,
    'victoire du joueur → le sorcier éclate');
  assert.match(duel, /const eclatementPlateauJoueur = eclatementActif && vainqueur !== 'joueur';/,
    'défaite du joueur → son avatar éclate');
  assert.match(duel, /rpg-wizard-plate__avatar--ennemi\$\{eclatementPlateauEnnemi \? ' is-eclatant' : ''\}/);
  assert.match(duel, /rpg-wizard-plate__avatar--joueur\$\{eclatementPlateauJoueur \? ' is-eclatant' : ''\}/);
  assert.match(duel, /eclatementPlateauEnnemi && <RpgAvatarEclatement image=\{avatarPlateauAdverse\} camp="ennemi"/);
  assert.match(duel, /eclatementPlateauJoueur && <RpgAvatarEclatement image=\{avatarPlateauJoueur\} camp="joueur"/);
  assert.match(duel, /\$\{eclatementActif \? ' rpg-overlay--apres-eclat' : ''\}/);
  // Le disque, le portrait et les ornements s'effacent quand les éclats arrivent.
  assert.match(plateauCss, /avatar\.is-eclatant > img[\s\S]{0,200}?avatar\.is-eclatant::before[\s\S]{0,200}?avatar\.is-eclatant::after \{[^}]*opacity: 0;/s);
  assert.match(plateauCss, /--rpg-eclat-portee:/, 'le disque d’éclatement suit la taille de la plaque');
});

test('une démonstration autonome permet de revoir l’éclatement', () => {
  const html = readFileSync(new URL('../scripts/rpg-avatar-eclatement.html', import.meta.url), 'utf8');
  const demo = readFileSync(new URL('../scripts/rpg-avatar-eclatement-smoke.jsx', import.meta.url), 'utf8');
  assert.match(html, /rpg-avatar-eclatement-smoke\.jsx/, 'la page charge la démo');
  assert.match(demo, /import RpgAvatarEclatement from '\.\.\/src\/games\/RpgAvatarEclatement\.jsx';/);
  assert.match(demo, /is-eclatant/, 'le disque s’efface quand les éclats arrivent');
  assert.match(demo, /Rejouer/, 'un bouton relance l’animation');
  assert.match(demo, /avatar-salem\.webp/, 'le portrait existant, aucun asset nouveau');
  assert.doesNotMatch(demo, /\.png/i);
});
