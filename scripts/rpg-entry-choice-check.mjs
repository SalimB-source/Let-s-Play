#!/usr/bin/env node
/**
 * Écran d'entrée du Sablier — scripts/rpg-entry-choice-check.mjs
 * --------------------------------------------------------------
 * `npm run check:rpg-entry-choice` : vérifie, sans navigateur, les promesses de
 * l'écran qui accueille `/jeu/sablier-de-bab-el` :
 *
 *   - la route passe bien par l'écran d'entrée, et le duel reste paresseux
 *     (rien des ~740 Ko de `RpgDuelPage` n'est téléchargé avant le choix) ;
 *   - les deux portes existent : téléchargement Windows et navigateur ;
 *   - l'écran s'efface là où il n'a rien à proposer (coque PC, APK, téléphone,
 *     choix retenu) — sinon il barrerait la route de joueurs qui n'ont pas de
 *     choix à faire ;
 *   - le lien de téléchargement pointe vers un asset au nom **fixe** de la
 *     Release `desktop`, et le workflow publie bien ce nom fixe — sans cela le
 *     bouton mourrait en 404 à chaque changement de version.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (relatif) => readFileSync(join(RACINE, relatif), 'utf8');

let reussites = 0;
const ok = (message) => { reussites += 1; console.log(`  ✓ ${message}`); };

console.log('1. La route passe par l’écran d’entrée');
const routeur = lire('src/main.jsx');
assert.match(
  routeur,
  /<Route path="\/jeu\/sablier-de-bab-el" element=\{<Suspense[\s\S]{0,140}?><RpgEntryChoice variantesPlateaux \/><\/Suspense>\} \/>/,
  'la route du Sablier ne monte plus RpgEntryChoice',
);
assert.match(routeur, /const RpgEntryChoice = lazy\(\(\) => import\('\.\/games\/RpgEntryChoice'\)\);/,
  'RpgEntryChoice doit rester un chunk paresseux');
assert.doesNotMatch(routeur, /const RpgDuelPage = lazy/,
  'le duel ne doit plus être importé directement par le routeur');
ok('route → RpgEntryChoice (paresseux), duel tiré seulement après le choix');

console.log('2. Les deux portes');
const entree = lire('src/games/RpgEntryChoice.jsx');
assert.match(entree, /Télécharger pour Windows/, 'porte Windows absente');
assert.match(entree, /Jouer dans le navigateur/, 'porte navigateur absente');
assert.match(entree, /const RpgDuelPage = lazy\(\(\) => import\('\.\/RpgDuelPage'\)\);/,
  'le duel doit être tiré par l’écran d’entrée, pas avant');
assert.match(entree, /import '\.\/rpg-entry-choice\.css';/, 'feuille de style non importée');
ok('deux portes, duel paresseux, styles importés');

console.log('3. Lien de téléchargement permanent');
assert.match(
  entree,
  /releases\/download\/desktop\/le-sablier-de-bab-el-setup\.exe/,
  'le bouton doit viser l’asset au nom fixe de la Release « desktop »',
);
assert.match(entree, /releases\/tag\/desktop/, 'lien « toutes les versions » absent');
const workflow = lire('.github/workflows/desktop-windows.yml');
assert.match(workflow, /cp "le-sablier-de-bab-el-\$\{VERSION\}-setup\.exe" le-sablier-de-bab-el-setup\.exe/,
  'le workflow ne publie plus la copie au nom fixe : le bouton du site casserait');
ok('asset au nom fixe publié par la CI, bouton et lien Release cohérents');

console.log('4. L’écran s’efface quand il n’a rien à proposer');
assert.match(entree, /win\.letsPlayDesktop/, 'la coque PC doit sauter l’écran');
assert.match(entree, /win\.LetsPlayAndroid/, 'l’APK Android doit sauter l’écran');
assert.match(entree, /\(pointer: coarse\), \(max-width: 820px\)/, 'le téléphone doit sauter l’écran');
assert.match(entree, /ENTREE_CHOIX_CLE = 'letsplay_sablier_entree_v1'/, 'clé du choix retenu absente');
assert.match(entree, /localStorage\.setItem\(ENTREE_CHOIX_CLE, 'jeu'\)/, 'le choix retenu n’est pas écrit');
ok('coque PC, APK, téléphone et choix retenu entrent directement dans le duel');

console.log('5. Styles');
const styles = lire('src/games/rpg-entry-choice.css');
assert.match(styles, /url\('\.\.\/\.\.\/public\/sablier-de-bab-el-keyart\.jpg'\)/,
  'le keyart doit passer par public/ pour respecter la base du build');
assert.match(styles, /@media \(max-width: 720px\)/, 'pas de repli une colonne');
ok('keyart via public/ (base respectée), repli une colonne');

console.log('');
console.log(`check:rpg-entry-choice — ${reussites} vérifications, aucune en échec.`);
