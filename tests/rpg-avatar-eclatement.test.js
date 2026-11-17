/** Rond doré PLEIN et éclatement de l'avatar du perdant.
 *  Aucun PNG transparent : le disque est un laiton opaque dessiné en CSS, et
 *  les éclats sont des tranches du WebP déjà livré, pas un nouvel asset. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

import { DUREE_ECLATEMENT_MAX, GRILLE_ECLATS, creerEclatsAvatar, ECLATS_AVATAR, NOMBRE_ECLATS } from '../src/games/rpgAvatarEclats.js';

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

test('un nombre limité de morceaux, tous dans le disque, déterministes et sans NaN', () => {
  assert.equal(GRILLE_ECLATS, 14, 'grille 14 × 14');
  assert.equal(NOMBRE_ECLATS, 156, 'budget de particules par avatar');
  assert.equal(ECLATS_AVATAR.length, NOMBRE_ECLATS);
  assert.deepEqual(creerEclatsAvatar(), creerEclatsAvatar(), 'aucun hasard non reproductible');

  const ids = new Set();
  for (const eclat of ECLATS_AVATAR) {
    assert.ok(!ids.has(eclat.id), `identifiant unique ${eclat.id}`);
    ids.add(eclat.id);
    assert.ok(eclat.forme >= 0 && eclat.forme <= 3, 'une des quatre découpes');
    const { style } = eclat;
    for (const cle of ['--col', '--ligne', '--x', '--y', '--r', '--d', '--duree']) {
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
    assert.ok(parseInt(style['--d'], 10) + parseInt(style['--duree'], 10) <= DUREE_ECLATEMENT_MAX,
      'le nettoyage attend la fin du vol');
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
    assert.ok(html.includes(`--rpg-eclat-case:${100 / GRILLE_ECLATS}%`));
    assert.ok(html.includes(`--rpg-eclat-position:${100 / (GRILLE_ECLATS - 1)}%`));
    assert.ok(html.includes(`--rpg-eclat-taille:${GRILLE_ECLATS * 100}%`));
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

test('en cas de double chute les éclats sont nettoyés et peuvent être rejoués', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>');
  const anciens = Object.fromEntries(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map((cle) => [cle, globalThis[cle]]));
  const ancienSetTimeout = globalThis.setTimeout;
  const ancienClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let prochainId = 0;
  let root;
  try {
    const { default: Eclatement } = await vite.ssrLoadModule('/src/games/RpgAvatarEclatement.jsx');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.setTimeout = (callback, delai, ...args) => {
      if (delai !== DUREE_ECLATEMENT_MAX) return ancienSetTimeout(callback, delai, ...args);
      const id = ++prochainId;
      timers.set(id, callback);
      return id;
    };
    globalThis.clearTimeout = (id) => {
      if (timers.has(id)) timers.delete(id);
      else ancienClearTimeout(id);
    };
    const host = document.getElementById('root');
    root = createRoot(host);
    const scene = (cle) => React.createElement(React.Fragment, null,
      ...['joueur', 'ennemi'].map((camp) => React.createElement('span', {
        key: camp, className: 'rpg-wizard-plate__avatar is-eclatant',
      }, React.createElement(Eclatement, { key: cle, image: `/${camp}.webp`, camp }))),
      React.createElement('div', { className: 'rpg-overlay rpg-overlay--apres-eclat' },
        React.createElement('button', null, 'Rejouer')));
    await act(async () => root.render(scene(1)));
    assert.equal(host.querySelectorAll('.rpg-avatar-eclatement__eclat').length, 2 * NOMBRE_ECLATS);
    assert.equal(timers.size, 2);
    await act(async () => {
      for (const rappel of [...timers.values()]) rappel();
    });
    assert.equal(host.querySelectorAll('.rpg-avatar-eclatement').length, 0);
    assert.equal(host.querySelectorAll('.is-eclatant').length, 2, 'les portraits restent masqués');
    assert.equal(host.querySelector('.rpg-overlay button').textContent, 'Rejouer');
    await act(async () => root.render(scene(2)));
    assert.equal(host.querySelectorAll('.rpg-avatar-eclatement__eclat').length, 2 * NOMBRE_ECLATS);
    assert.equal(timers.size, 2, 'les anciens timers sont annulés au démontage');
    await act(async () => root.unmount());
    root = null;
    assert.equal(timers.size, 0, 'aucun timer restant après démontage');
  } finally {
    if (root) await act(async () => root.unmount());
    globalThis.setTimeout = ancienSetTimeout;
    globalThis.clearTimeout = ancienClearTimeout;
    for (const [cle, valeur] of Object.entries(anciens)) {
      if (valeur === undefined) delete globalThis[cle];
      else globalThis[cle] = valeur;
    }
    dom.window.close();
    await vite.close();
  }
});

test('l’animation est individuelle, l’écran de fin attend, le mouvement réduit court-circuite', () => {
  assert.match(eclatCss, /@keyframes rpg-avatar-eclat-vol/);
  assert.match(eclatCss, /translate:\s*var\(--x\) var\(--y\)/, 'chaque éclat a sa trajectoire');
  assert.match(eclatCss, /rotate:\s*var\(--r\)/);
  assert.match(eclatCss, /animation:\s*rpg-avatar-eclat-vol var\(--duree\)/);
  assert.match(eclatCss, /container-type:\s*inline-size/, 'cqw résolu sur le disque');
  assert.match(eclatCss, /background-color:\s*#d7ad61/, 'chaque morceau est opaque');
  assert.match(eclatCss, /background-size:\s*var\(--rpg-eclat-taille\) var\(--rpg-eclat-taille\)/, 'tranches synchronisées avec la grille');
  assert.match(eclatCss, /left:\s*calc\(var\(--col\) \* var\(--rpg-eclat-case\)\)/);
  assert.match(eclatCss, /var\(--col\) \* var\(--rpg-eclat-position\)/);
  assert.doesNotMatch(corpsDe(eclatCss, '.rpg-avatar-eclatement__eclat {'), /filter:|box-shadow:/, 'pas de filtre ni ombre par éclat');
  assert.match(eclatCss, /clip-path: polygon/);
  assert.match(eclatCss, /pointer-events:\s*none/, 'le calque n’intercepte aucun clic');
  assert.match(eclatCss, /\.rpg-overlay--apres-eclat \{[^}]*1420ms/s, 'l’écran de fin attend l’éclatement');
  assert.match(eclatCss, /prefers-reduced-motion: reduce[\s\S]*?display: none/s);
  assert.match(eclatCss, /prefers-reduced-motion: reduce[\s\S]*?\.rpg-overlay--apres-eclat \{ animation: none; opacity: 1; visibility: visible; \}/);
  assert.match(eclatCss, /\.rpg-battle\.is-reduced \.rpg-avatar-eclatement \{ display: none; \}/);
  assert.match(eclatCss, /\.rpg-battle\.is-reduced \.rpg-overlay--apres-eclat \{ animation: none; opacity: 1; visibility: visible; \}/);
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
