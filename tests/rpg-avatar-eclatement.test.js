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

import { DUREE_ECLATEMENT_MAX, DUREE_REPLIQUE, GRILLE_ECLATS, creerEclatsAvatar, ECLATS_AVATAR, NOMBRE_ECLATS } from '../src/games/rpgAvatarEclats.js';
import { REPLIQUES_DEFAITE, REPLIQUE_DEFAITE_GENERIQUE, repliqueDefaite } from '../src/games/rpgRepliquesDefaite.js';
import { RPG_AVATARS_DUEL_IDS } from '../src/games/rpgDuelAvatars.js';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const plateauCss = lire('rpg-avatars-plateau.css');
const eclatCss = lire('rpg-avatar-eclatement.css');
const composant = lire('RpgAvatarEclatement.jsx');
const generateur = lire('rpgAvatarEclats.js');
const duel = lire('RpgDuelPage.jsx');
const combatCss = lire('rpg-battle.css');
const scriptMobile = readFileSync(new URL('../scripts/rpg-avatars-mobile-check.mjs', import.meta.url), 'utf8');

/** Le bloc CSS complet à partir d'un index (accolades équilibrées). */
const blocCss = (css, depart) => {
  let profondeur = 0;
  for (let i = css.indexOf('{', depart); i < css.length; i += 1) {
    if (css[i] === '{') profondeur += 1;
    else if (css[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return css.slice(depart, i + 1);
    }
  }
  return css.slice(depart);
};

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
    assert.match(html, /class="rpg-avatar-eclatement\b/);
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
    // Avec une réplique, le premier rendu est celui de la phrase : le
    // personnage est encore debout, aucun éclat n'est encore là.
    const avecReplique = renderToStaticMarkup(React.createElement(Eclatement, {
      image: '/Let-s-Play/sablier-story/avatars/avatar-salem.webp?v=duel-tetes-1',
      camp: 'ennemi',
      replique: repliqueDefaite('ifrit-ergs'),
    }));
    assert.match(avecReplique, /rpg-avatar-eclatement__replique/);
    assert.match(avecReplique, /data-phase="replique"/);
    assert.ok(avecReplique.includes(repliqueDefaite('ifrit-ergs')), 'la phrase du personnage est rendue');
    assert.equal((avecReplique.match(/<i /g) ?? []).length, 0, 'aucun éclat pendant la réplique');
    assert.doesNotMatch(avecReplique, /__cratere/, 'le cratère n’existe pas avant l’explosion');
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
    assert.equal(host.querySelectorAll('.rpg-avatar-eclatement__eclat').length, 0, 'plus aucun éclat en vol');
    assert.equal(host.querySelectorAll('.rpg-avatar-eclatement').length, 2,
      'les calques restent : le cratère est la trace du perdant');
    assert.equal(host.querySelectorAll('.rpg-avatar-eclatement__cratere').length, 2);
    assert.equal(host.querySelectorAll('[data-phase="cratere"]').length, 2);
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
  assert.match(eclatCss, /animation:\s*rpg-avatar-eclat-vol calc\(var\(--duree\) \* var\(--rpg-anim-scale, 1\)\)/,
    'le vol des éclats suit le réglage de vitesse, comme les gestes qui l’attendent');
  assert.match(eclatCss, /container-type:\s*inline-size/, 'cqw résolu sur le disque');
  assert.match(eclatCss, /background-color:\s*#d7ad61/, 'chaque morceau est opaque');
  assert.match(eclatCss, /background-size:\s*var\(--rpg-eclat-taille\) var\(--rpg-eclat-taille\)/, 'tranches synchronisées avec la grille');
  assert.match(eclatCss, /left:\s*calc\(var\(--col\) \* var\(--rpg-eclat-case\)\)/);
  assert.match(eclatCss, /var\(--col\) \* var\(--rpg-eclat-position\)/);
  assert.doesNotMatch(corpsDe(eclatCss, '.rpg-avatar-eclatement__eclat {'), /filter:|box-shadow:/, 'pas de filtre ni ombre par éclat');
  assert.match(eclatCss, /clip-path: polygon/);
  assert.match(eclatCss, /pointer-events:\s*none/, 'le calque n’intercepte aucun clic');
  assert.match(eclatCss, /\.rpg-overlay--apres-eclat \{[^}]*calc\(\(var\(--rpg-replique-delai, 0ms\) \+ var\(--rpg-eclat-maxi, 1900ms\) \+ 380ms\) \* var\(--rpg-anim-scale, 1\)\)/s,
    'l’écran de fin attend la réplique, la fin de l’éclatement, puis une courte pause');

  // Le minuteur qui démonte les éclats et le style posé par la page parlent de
  // la même durée, tous deux à l'échelle du réglage de vitesse.
  assert.match(composant, /import \{ dureeAnimation \} from '\.\/rpgAnimations\.js';/);
  assert.match(composant, /setTimeout\(\(\) => setEclate\(true\), dureeAnimation\(attente\)\)/,
    'les éclats prennent le relais à la fin de la réplique');
  assert.match(composant, /setTimeout\(\(\) => setTermine\(true\), dureeAnimation\(attente \+ DUREE_ECLATEMENT_MAX\)\)/,
    'le cratère reste après le dernier éclat : seul le vol est démonté');
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
  // Le disque, le portrait et les ornements s'effacent quand les éclats
  // arrivent, jamais pendant la réplique : l'effacement est retardé par
  // `--rpg-replique-delai`.
  assert.match(plateauCss, /avatar\.is-eclatant > img[\s\S]{0,240}?avatar\.is-eclatant::before[\s\S]{0,240}?avatar\.is-eclatant::after \{[^}]*animation: rpg-avatar-efface-coup[^}]*var\(--rpg-replique-delai, 0ms\)/s);
  assert.match(plateauCss, /@keyframes rpg-avatar-efface-coup \{\s*from \{ opacity: 1; \}\s*to \{ opacity: 0; \}/,
    'le portrait s’efface d’un coup sec à l’instant du premier éclat');
  assert.match(plateauCss, /--rpg-eclat-portee:/, 'le disque d’éclatement suit la taille de la plaque');
});

test('la table attend la réplique puis l’éclatement avant de s’étendre', () => {
  // La page publie les deux durées : la phrase, puis le vol des éclats.
  assert.match(duel, /import \{ DUREE_ECLATEMENT_MAX, DUREE_REPLIQUE \} from '\.\/rpgAvatarEclats\.js';/);
  assert.match(duel, /'--rpg-eclat-maxi': `\$\{DUREE_ECLATEMENT_MAX\}ms`/, 'la feuille et le composant partagent la même durée');
  assert.match(duel, /'--rpg-replique-delai': `\$\{DUREE_REPLIQUE\}ms`/, 'la durée de la réplique est publiée à la feuille');
  assert.match(duel, /data-eclat-actif=\{eclatementActif \? 'true' : undefined\}/, 'la table sait qu’un éclatement est en cours');
  // Le territoire du gagnant s'étend après la phrase et l'éclatement, pas pendant.
  assert.match(combatCss, /\.card-table--decoupee\[data-eclat-actif\] \{[^}]*transition-delay: calc\(\(var\(--rpg-replique-delai, 0ms\) \+ var\(--rpg-eclat-maxi, 1900ms\)\) \* var\(--rpg-anim-scale, 1\)\);/s,
    'l’extension du plateau attend le dernier éclat');
  assert.match(combatCss, /\.card-table\[data-eclat-actif\] \.rpg-plateau-lisere \{[^}]*transition-delay: calc\(\(var\(--rpg-replique-delai, 0ms\) \+ var\(--rpg-eclat-maxi, 1900ms\)\) \* var\(--rpg-anim-scale, 1\)\);/s);
  assert.match(combatCss, /\[data-vainqueur="sorcier"\] \.rpg-wizard-plate--joueur \{\s*animation-delay: calc\(\(var\(--rpg-replique-delai, 0ms\) \+ var\(--rpg-eclat-maxi, 1900ms\)\) \* var\(--rpg-anim-scale, 1\)\);/,
    'le camp vaincu ne pâlit qu’une fois ses éclats retombés');
});

test('le perdant dit sa phrase, puis laisse un cratère rond', () => {
  // La réplique : une bulle par camp, du côté libre du plateau.
  assert.match(eclatCss, /\.rpg-avatar-eclatement__replique \{[^}]*max-width: min\(230px, 46vw\)/s,
    'la bulle reste lisible sans envahir la table');
  assert.match(eclatCss, /\[data-camp="ennemi"\] \.rpg-avatar-eclatement__replique \{ top: calc\(100% \+ 26px\); \}/,
    'camp adverse : la bulle descend sous la jauge de vie');
  assert.match(eclatCss, /\[data-camp="joueur"\] \.rpg-avatar-eclatement__replique \{ bottom: calc\(100% \+ 6px\); \}/,
    'camp du joueur : la bulle monte');
  assert.match(eclatCss, /animation: rpg-avatar-replique-vie calc\(var\(--rpg-replique-delai, 1600ms\) \* var\(--rpg-anim-scale, 1\)\)/,
    'la bulle vit exactement le temps de la phrase');
  // Le cratère : rond, sous l'avatar, sans propriété de mise en page animée.
  const cratere = corpsDe(eclatCss, '.rpg-avatar-eclatement__cratere {');
  assert.match(cratere, /border-radius: 50%;/, 'une marque ronde');
  assert.match(cratere, /left: 50%;[\s\S]*width: 138%;/, 'posée sous le disque, un peu plus large que lui');
  assert.doesNotMatch(cratere, /(top|right|margin|padding|font-size):\s*[^v]/, 'aucun déplacement de mise en page');
  assert.match(eclatCss, /@keyframes rpg-avatar-cratere-nait/);
  assert.match(eclatCss, /@keyframes rpg-avatar-replique-vie/);
  // Le composant, lui, garde le cratère après le vol des éclats.
  assert.match(composant, /\{eclate && <span className="rpg-avatar-eclatement__cratere" \/>\}/);
  assert.match(composant, /\{eclate && !termine && ECLATS_AVATAR\.map/);
  assert.match(composant, /data-phase=\{termine \? 'cratere' : eclate \? 'eclats' : 'replique'\}/);
});

test('chaque avatar du plateau a sa dernière phrase, jamais vide', () => {
  assert.equal(DUREE_REPLIQUE, 1600, 'une phrase courte : la fin de duel ne s’éternise pas');
  for (const [id, ligne] of Object.entries(REPLIQUES_DEFAITE)) {
    assert.ok(RPG_AVATARS_DUEL_IDS.includes(id), `${id} est bien un avatar du plateau`);
    assert.ok(ligne.length >= 20 && ligne.length <= 70, `${id} : phrase courte (${ligne.length} caractères)`);
    assert.doesNotMatch(ligne, /^\s|\s$|\s{2}/, `${id} : pas d'espace parasite`);
    assert.equal(repliqueDefaite(id), ligne);
  }
  assert.ok(Object.keys(REPLIQUES_DEFAITE).length >= 30, 'la tour entière a sa réplique');
  assert.match(REPLIQUE_DEFAITE_GENERIQUE, /\S/);
  assert.equal(repliqueDefaite('avatar-inconnu'), REPLIQUE_DEFAITE_GENERIQUE,
    'un avatar sans réplique dédiée ne laisse jamais de bulle vide');
  // La page choisit la réplique du camp qui éclate, jamais celle du gagnant.
  assert.match(duel, /const repliqueAdverse = repliqueDefaite\(personnageSorcier \?\? 'ifrit-ergs'\);/);
  assert.match(duel, /const repliqueJoueur = repliqueDefaite\(avatarDeProfil\(profilJoueur\)\?\.id \?\? 'salem'\);/);
  assert.match(duel, /<RpgAvatarEclatement image=\{avatarPlateauAdverse\} camp="ennemi" replique=\{repliqueAdverse\} \/>/);
  assert.match(duel, /<RpgAvatarEclatement image=\{avatarPlateauJoueur\} camp="joueur" replique=\{repliqueJoueur\} \/>/);
});

test('le médaillon du perdant s’atténue sans quitter sa place', () => {
  // Les plaques sont centrées par `translateX(-50%)` : une animation de
  // transform l'écraserait et le médaillon partirait sur le côté.
  const iKeyframesPlaque = combatCss.indexOf('@keyframes rpg-victoire-plateau-sable');
  assert.ok(iKeyframesPlaque > 0, 'la plaque a sa propre animation');
  const keyframesPlaque = blocCss(combatCss, iKeyframesPlaque);
  assert.doesNotMatch(keyframesPlaque, /transform|translate|scale|rotate/, 'aucun déplacement du médaillon');
  assert.match(keyframesPlaque, /100% \{ opacity: \.22; \}/);
  const reglesPlaques = combatCss.slice(
    combatCss.indexOf('.card-table[data-vainqueur="joueur"] .rpg-wizard-plate--ennemi,'),
    iKeyframesPlaque);
  assert.match(reglesPlaques, /animation: rpg-victoire-plateau-sable calc\(1s \* var\(--rpg-anim-scale, 1\)\)/);
  assert.match(reglesPlaques, /\.card-table\[data-vainqueur="sorcier"\] \.rpg-wizard-plate--joueur \{/);
  // Les rangées, elles, gardent leur affaissement.
  const rangees = combatCss.slice(
    combatCss.indexOf('.card-table[data-vainqueur="joueur"] .card-row--ennemi,'),
    combatCss.indexOf('@keyframes rpg-victoire-sable'));
  assert.match(rangees, /animation: rpg-victoire-sable calc\(1s \* var\(--rpg-anim-scale, 1\)\)/);
  assert.doesNotMatch(rangees, /rpg-wizard-plate/, 'les plaques ne sont plus dans la règle qui se déplace');
});

test('les avatars du plateau ont été agrandis d’un seul cran', () => {
  assert.match(plateauCss, /--rpg-avatar-plateau: clamp\(84px, 10\.4vw, 140px\);/);
  assert.match(plateauCss, /--rpg-eclat-portee: calc\(var\(--rpg-avatar-plateau\) \* \.82\);/,
    'le disque d’éclatement suit le médaillon agrandi');
  assert.match(plateauCss, /--rpg-avatar-height: clamp\(56px, calc\(var\(--duel-card\) \* 1\.2\), 96px\);/);
  assert.match(plateauCss, /--rpg-eclat-portee: calc\(var\(--rpg-avatar-height\) \* \.82\);/);
  assert.doesNotMatch(plateauCss, /9\.5vw, 128px/, 'plus aucune taille d’avatar en dur ailleurs');
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
