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

test('Lueur dorée : le style est un or chaud, animé mais respectueux', () => {
  const or = corpsDe('\\.rpg-hand__card\\.is-lien-actif,\\s*\\n\\.rpg-card\\.is-lien-actif');
  assert.match(or, /border-color:\s*#f2c94c/, 'le liseré du Lien est doré');
  assert.match(or, /box-shadow:[\s\S]*rgba\(242, 201, 76/, 'le halo du Lien est doré');
  assert.match(or, /animation:\s*rpg-lien-dore/, 'la lueur respire');
  assert.match(battleCss, /@keyframes rpg-lien-dore/);
  assert.match(
    battleCss,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-hand__card\.is-lien-actif,\s*\n\s*\.rpg-card\.is-lien-actif \{ animation: none !important; \}/,
    'la lueur se fige pour qui refuse le mouvement',
  );
});

test('Lueur dorée : elle ne remplace pas la lueur de jouabilité d’une mythique', () => {
  // Deux informations différentes : « cette carte se joue maintenant » (or de
  // Kyûbi) et « cette carte est renforcée par son ancre » (or du Lien). La
  // seconde ne doit pas effacer la première : les classes cohabitent.
  const main = page.slice(page.indexOf("'rpg-hand__card rpg-hand__card--img'"));
  const bloc = main.slice(0, main.indexOf("].filter(Boolean).join(' ')"));
  assert.match(bloc, /mythiqueJouable \? 'is-mythique-jouable' : ''/);
  assert.match(bloc, /lienActifMain \? 'is-lien-actif' : ''/);
  // Et le liseré ne s'allume que sur une carte réellement jouable : une carte
  // dorée mais éteinte promettrait une action impossible.
  assert.match(
    page,
    /const lienActifMain = baseJouable/,
    'la lueur en main est conditionnée par la jouabilité',
  );
});
