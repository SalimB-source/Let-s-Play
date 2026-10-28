/**
 * La lueur dorée du Lien.
 *
 * Une carte liée dont l'ancre mythique tient une place sur la rangée du joueur
 * porte un renfort : elle doit se voir avant d'être jouée. Les contrôles
 * ci-dessous tiennent le signal — la classe sur la carte en main et sur la
 * carte posée sur la table, sa donnée d'accessibilité, et le style doré, qui ne
 * doit jamais se confondre avec la lueur de jouabilité d'une mythique.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(ROOT, 'src/games/RpgDuelPage.jsx'), 'utf8');
const battleCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-battle.css'), 'utf8');

function corpsDe(selecteurs) {
  const motif = new RegExp(`(?:^|\\n)${selecteurs}\\s*\\{([^}]*)\\}`, 'g');
  const blocs = [...battleCss.matchAll(motif)].map((m) => m[1]);
  assert.ok(blocs.length > 0, `règle introuvable : ${selecteurs}`);
  return blocs.join('\n');
}

test('Lueur dorée : la carte en main calcule son Lien et s’allume', () => {
  assert.match(
    page,
    /const lienActifMain = baseJouable\s*\n?\s*&& Boolean\(carte\.lien\)\s*\n?\s*&& lienSatisfait\(carte, duel\.joueur\.creatures\)/,
    'la main doit calculer le Lien de chaque carte contre la rangée du joueur, et seulement pour une carte jouable',
  );
  assert.match(
    page,
    /lienActifMain \? 'is-lien-actif' : ''/,
    'la carte en main doit porter la classe is-lien-actif quand son ancre est en jeu',
  );
  assert.match(
    page,
    /data-lien-actif=\{lienActifMain \? 'true' : undefined\}/,
    'la lueur doit être lisible par les tests et les outils, pas seulement par l’œil',
  );
});

test('Lueur dorée : la carte posée sur la table s’allume aussi', () => {
  assert.match(
    page,
    /const lienActifSurTable = \(entite, camp\) => \{[\s\S]{0,400}?lienSatisfait\(arme, duel\[camp\]\?\.creatures \?\? \[\]\)/,
    'une arme liée posée doit interroger le Lien de sa propre carte, du côté de son camp',
  );
  assert.match(page, /lienActif \? 'is-lien-actif' : ''/, 'TableCard doit peindre la classe');
  assert.match(page, /lienActif=\{lienActifSurTable\(entite, 'joueur'\)\}/);
  assert.match(page, /lienActif=\{lienActifSurTable\(entite, 'sorcier'\)\}/);
});

test('Le sceau du Lien : un filet d’or à l’intérieur, pas un halo', () => {
  const or = corpsDe('\\.rpg-hand__card\\.is-lien-actif,\\s*\\n\\.rpg-card\\.is-lien-actif');
  assert.match(or, /outline:\s*2px solid rgba\(242, 201, 76/, 'le filet du Lien est doré');
  assert.match(or, /outline-offset:\s*-5px/, 'le filet se peint à l’intérieur de la face');
  assert.match(or, /animation:\s*rpg-lien-dore/, 'le filet respire');
  // Le halo et la couleur du filet d'élément appartiennent au jeu : le Lien
  // s'y ajoute, il ne les remplace pas.
  assert.doesNotMatch(or, /box-shadow/, 'le Lien ne prend pas le halo de jouabilité');
  assert.doesNotMatch(or, /border-color/, 'la couleur d’élément du cadre ne bouge pas');
  assert.doesNotMatch(or, /filter:/, 'le Lien ne retouche pas la lumière de la carte');
  assert.match(battleCss, /@keyframes rpg-lien-dore/);
  assert.match(
    battleCss,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-hand__card\.is-lien-actif,\s*\n\s*\.rpg-card\.is-lien-actif \{ animation: none !important; \}/,
    'le filet se fige pour qui refuse le mouvement',
  );
});

test('Lueur dorée : elle ne remplace pas la lueur de jouabilité d’une mythique', () => {
  // Deux informations différentes : « cette carte se joue maintenant » (halo
  // blanc, or pour une mythique) et « cette carte est renforcée par son ancre »
  // (filet doré du Lien). La seconde ne doit pas effacer la première : les
  // classes cohabitent, et le filet est en `outline` pour ça.
  const main = page.slice(page.indexOf("'rpg-hand__card rpg-hand__card--img'"));
  const bloc = main.slice(0, main.indexOf("].filter(Boolean).join(' ')"));
  assert.match(bloc, /mythiqueJouable \? 'is-mythique-jouable' : ''/);
  assert.match(bloc, /lienActifMain \? 'is-lien-actif' : ''/);
  // Et le filet ne s'allume que sur une carte réellement jouable : un cadre
  // doré sur une carte éteinte promettrait une action impossible.
  assert.match(
    page,
    /const lienActifMain = baseJouable/,
    'la lueur en main est conditionnée par la jouabilité',
  );
});
