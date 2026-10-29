#!/usr/bin/env node
/**
 * Écran d'entrée du Sablier — scripts/rpg-entry-choice-check.mjs
 * --------------------------------------------------------------
 * `npm run check:rpg-entry-choice` : vérifie, sans navigateur, les promesses de
 * l'écran qui accueille `/jeu/sablier-de-bab-el` :
 *
 *   - la route passe bien par l'écran d'entrée, et le duel reste paresseux
 *     (rien des ~740 Ko de `RpgDuelPage` n'est téléchargé avant le choix) ;
 *   - les trois portes existent : téléchargements Windows et Android, et navigateur ;
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
import { JSDOM } from 'jsdom';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (relatif) => readFileSync(join(RACINE, relatif), 'utf8');

let reussites = 0;
const ok = (message) => { reussites += 1; console.log(`  ✓ ${message}`); };

console.log('1. La route passe par l’écran d’entrée');
const routeur = lire('src/main.jsx');
assert.match(
  routeur,
  /<Route path="\/jeu\/sablier-de-bab-el" element=\{<PaysageSablier><GameLoadBoundary jeu="Le Sablier"><Suspense[\s\S]{0,140}?><RpgEntryChoice variantesPlateaux \/><\/Suspense><\/GameLoadBoundary><\/PaysageSablier>\} \/>/,
  'la route du Sablier ne monte plus RpgEntryChoice sous GameLoadBoundary',
);
assert.match(routeur, /const RpgEntryChoice = lazy\(\(\) => import\('\.\/games\/RpgEntryChoice'\)\);/,
  'RpgEntryChoice doit rester un chunk paresseux');
assert.doesNotMatch(routeur, /const RpgDuelPage = lazy/,
  'le duel ne doit plus être importé directement par le routeur');
ok('route → RpgEntryChoice (paresseux), duel tiré seulement après le choix');

console.log('2. Les trois portes');
const entree = lire('src/games/RpgEntryChoice.jsx');
assert.match(entree, /Télécharger pour Windows/, 'porte Windows absente');
assert.match(entree, /Télécharger sur Android/, 'porte Android absente');
assert.match(entree, /Jouer dans le navigateur/, 'porte navigateur absente');
assert.match(entree, /releases\/tag\/apk/, 'lien de repli de téléchargement Android absent');
assert.match(entree, /browser_download_url/, 'le bouton Android ne pointe pas sur l’APK publiée');
assert.match(entree, /const RpgDuelPage = lazy\(\(\) => importerAvecReprise\(\(\) => import\('\.\/RpgDuelPage'\)\)\);/,
  'le duel doit être tiré par l’écran d’entrée, pas avant, et retenté en cas de coupure');
assert.match(entree, /import '\.\/rpg-entry-choice\.css';/, 'feuille de style non importée');
ok('trois portes, lien APK Android, duel paresseux, styles importés');

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
// L'écran d'entrée reste affiché sur téléphone. Le doigt n'y sert plus qu'à
// l'invite de rotation (`portraitAuDoigt`), pas à sauter l'écran.
const ecranInutile = entree.slice(
  entree.indexOf('export function ecranInutile'),
  entree.indexOf('function portraitAuDoigt'),
);
assert.ok(ecranInutile.length > 0, 'ecranInutile introuvable dans RpgEntryChoice');
assert.doesNotMatch(ecranInutile, /pointer: coarse/,
  'le téléphone ne doit plus sauter l’écran : les deux portes s’affichent partout hors coque/APK');
assert.match(entree, /ENTREE_CHOIX_CLE = 'letsplay_sablier_entree_v1'/, 'clé du choix retenu absente');
assert.match(entree, /localStorage\.setItem\(ENTREE_CHOIX_CLE, 'jeu'\)/, 'le choix retenu n’est pas écrit');
ok('coque PC, APK et choix retenu entrent directement ; téléphone inclus, en une colonne');

console.log('5. Aucun écran noir quand un fichier du jeu manque');
assert.match(routeur,
  /<Route path="\/jeu\/sablier-de-bab-el\/defi" element=\{<PaysageSablier><GameLoadBoundary jeu="Le Sablier"><Suspense[\s\S]{0,160}?><RpgPvpSalon \/><\/Suspense><\/GameLoadBoundary><\/PaysageSablier>\} \/>/,
  'le salon du duel en ligne doit être protégé par le même filet');
assert.match(routeur, /import GameLoadBoundary from '\.\/games\/GameLoadBoundary\.jsx';/,
  'GameLoadBoundary doit être importé par le routeur');
assert.match(entree, /<GameLoadBoundary jeu="Le Sablier">/,
  'le duel monté après le choix doit être enveloppé par le filet');
const filet = lire('src/games/GameLoadBoundary.jsx');
assert.match(filet, /getDerivedStateFromError/, 'le filet ne retient pas l’erreur');
assert.match(filet, /a pas pu se charger/, 'le filet n’explique pas la panne au joueur');
assert.match(filet, /window\.location\.reload\(\)/, 'le filet ne propose pas de recharger la page');
assert.match(filet, /import '\.\/game-load-boundary\.css';/, 'filet sans feuille de style');
const retry = lire('src/games/chargementJeu.js');
assert.match(retry, /export async function importerAvecReprise/, 'reprise du téléchargement absente');
assert.match(retry, /throw derniereErreur/, 'la reprise doit remonter la dernière erreur');
assert.match(lire('src/games/game-load-boundary.css'), /border-radius: 18px;/, 'feuille du filet vide');
ok('filet + reprise : le duel se recharge, sinon un écran explique la panne');

console.log('6. Styles');
const styles = lire('src/games/rpg-entry-choice.css');
assert.match(styles, /url\('\.\.\/\.\.\/public\/sablier-de-bab-el-keyart\.jpg'\)/,
  'le keyart doit passer par public/ pour respecter la base du build');
assert.match(styles, /@media \(max-width: 720px\)/, 'pas de repli une colonne');

const dom = new JSDOM(`<!doctype html><html><head><style>${styles}</style></head><body>
  <div class="rpg-entry-choice" style="background-image:none">
    <div class="rpg-entry-choice__carte">
      <div class="rpg-entry-choice__choix">
        <a class="rpg-entry-choice__option rpg-entry-choice__option--pc" href="#">
          <svg class="rpg-entry-choice__logo"></svg>
          <span class="rpg-entry-choice__option-titre">Télécharger pour Windows</span>
          <span class="rpg-entry-choice__option-texte">Texte PC</span>
          <span class="rpg-entry-choice__option-meta">Meta PC</span>
        </a>
        <a class="rpg-entry-choice__option rpg-entry-choice__option--android" href="#">
          <svg class="rpg-entry-choice__logo"></svg>
          <span class="rpg-entry-choice__option-titre">Télécharger sur Android</span>
          <span class="rpg-entry-choice__option-texte">Texte Android</span>
          <span class="rpg-entry-choice__option-meta">Meta Android</span>
        </a>
        <button type="button" class="rpg-entry-choice__option rpg-entry-choice__option--web">
          <svg class="rpg-entry-choice__logo"></svg>
          <span class="rpg-entry-choice__option-titre">Jouer dans le navigateur</span>
        </button>
      </div>
    </div>
  </div>
</body></html>`);
const styleDe = (sel) => dom.window.getComputedStyle(dom.window.document.querySelector(sel));
assert.equal(styleDe('.rpg-entry-choice__option--pc').backgroundColor, 'rgb(255, 255, 255)',
  'la carte PC doit avoir un fond blanc');
assert.equal(styleDe('.rpg-entry-choice__option--pc .rpg-entry-choice__logo').color, 'rgb(0, 120, 212)',
  'le logo Windows de la carte PC doit être bleu');
assert.equal(styleDe('.rpg-entry-choice__option--pc .rpg-entry-choice__option-titre').color, 'rgb(15, 23, 42)',
  'le titre de la carte PC doit être foncé pour rester lisible sur fond blanc');
assert.equal(styleDe('.rpg-entry-choice__option--android').backgroundColor, 'rgb(22, 138, 63)',
  'la carte Android doit avoir un fond vert');
assert.equal(styleDe('.rpg-entry-choice__option--android .rpg-entry-choice__logo').color, 'rgb(255, 255, 255)',
  'le logo Android doit être blanc');
assert.equal(styleDe('.rpg-entry-choice__option--android .rpg-entry-choice__option-titre').color, 'rgb(255, 255, 255)',
  'le titre de la carte Android doit être blanc');
assert.equal(styleDe('.rpg-entry-choice__option--web .rpg-entry-choice__logo').color, 'rgb(232, 183, 92)',
  'la carte navigateur garde son logo doré');
ok('keyart via public/, carte PC blanche + logo bleu, carte Android verte + logo blanc, repli une colonne');

console.log('');
console.log('7. Le Sablier s’ouvre en paysage, écran d’entrée compris');
const paysage = lire('src/games/PaysageSablier.jsx');
assert.match(paysage, /createRpgLandscapeSession/, 'la route ne tient pas de session de paysage');
assert.match(paysage, /enter\(\{ fullscreen: false \}\)/, 'la route ne réclame pas le paysage à l’ouverture');
assert.match(paysage, /return \(\) => paysage\.leave\(\)/, 'la route ne rend pas l’écran en sortant');
assert.match(routeur, /import PaysageSablier from '\.\/games\/PaysageSablier';/,
  'PaysageSablier doit être importé par le routeur');
const invite = lire('src/games/InvitePaysage.jsx');
assert.match(entree, /import InvitePaysage, \{ usePortraitAuDoigt \} from '\.\/InvitePaysage\.jsx';/,
  'l’écran d’entrée n’utilise pas l’invite partagée');
assert.match(entree, /variante="bandeau"/, 'l’écran d’entrée n’invite pas à tourner l’appareil');
assert.match(invite, /rpg-rotate-prompt--bandeau/, 'la variante bandeau a disparu de l’invite');
assert.match(invite, /requestNativeFullscreen\(document\.documentElement\)/,
  'le bouton de l’invite doit demander le plein écran dans le geste');
assert.match(lire('src/games/rpg-entry-choice.css'), /\.rpg-rotate-prompt--bandeau \{/,
  'l’invite de l’écran d’entrée n’a pas de style');
assert.match(lire('src/games/rpgLandscape.js'), /setPaysageSablier/,
  'le pont Android doit s’appeler setPaysageSablier');
ok('route enveloppée, invite de rotation sur l’écran d’entrée, pont Android renommé');

console.log(`check:rpg-entry-choice — ${reussites} vérifications, aucune en échec.`);
