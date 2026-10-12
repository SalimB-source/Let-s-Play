import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Plein écran du Sablier : la page réelle montée dans jsdom (menu, mode
// Histoire, duel) avec une Fullscreen API de remplacement, plus la lecture des
// sources pour les règles qui ne se jouent pas dans un rendu.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/rpg-fullscreen', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkRpgFullscreen } = await import('../node_modules/.cache/rpg-fullscreen/rpg-fullscreen-smoke.js');
try {
  await checkRpgFullscreen(assert);
} finally {
  dom.window.close();
}

// ── Les règles écrites dans les sources ─────────────────────────────────────
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const paysage = readFileSync(new URL('../src/games/rpgLandscape.js', import.meta.url), 'utf8');

assert.match(page, /const shellRef = useRef\(null\);[\s\S]*?useGameFullscreen\(shellRef\)/,
  'la page branche le moteur de plein écran partagé sur la coque du jeu');
assert.match(page, /entrerPleinEcran\(\{ pinned: true, native: false \}\);/,
  'le plein écran de base (couche fixe) est posé au montage, sans geste, et reste épinglé');
assert.match(page, /window\.addEventListener\('pointerdown', upgrade, true\);\s*\n\s*window\.addEventListener\('keydown', upgrade, true\);/,
  'le premier geste du joueur — clic ou touche — demande le plein écran natif');
assert.match(page, /if \(nativeFullscreenElement\(\)\) return;\s*\n\s*if \(vientDunChampDeSaisie\(event\.target\)\) return;/,
  'le geste qui demande le natif ignore un plein écran déjà posé et les champs de saisie');
assert.match(page, /if \(String\(event\.key \|\| ''\)\.toLowerCase\(\) === 'escape'\) return;/,
  'Échap — qui referme le plein écran dans le navigateur — ne le rouvre pas dans la foulée');
assert.match(page, /isFullscreenShortcut\(event\)[\s\S]*?basculerPleinEcran\(\);/,
  'la touche F bascule le plein écran, comme dans les jeux d’arcade');
assert.match(page, /ref=\{shellRef\}\s*\n\s*className=\{`rpg-battle rpg-battle--menu\$\{pleinEcran \? ' is-immersive' : ''\}`\}/,
  'le menu (l’interface d’avant-partie) porte la couche plein écran');
assert.match(page, /ref=\{shellRef\}\s*\n\s*className=\{`rpg-battle\$\{viewport\.mobile \? ' rpg-battle--touch' : ''\}\$\{pleinEcran \? ' is-immersive' : ''\}`\}/,
  'le duel porte la même couche, sur le même nœud');
assert.match(page, /const demanderPleinEcranEtPaysage = \(\) => \{\s*\n\s*entrerPleinEcran\(\{ pinned: true \}\);\s*\n\s*landscapeRef\.current\?\.enter\(\{ fullscreen: false \}\);/,
  'lancer une partie demande le plein écran dans le geste ; le paysage ne s’occupe que de l’orientation');
assert.doesNotMatch(page, /landscapeRef\.current\?\.enter\(\)/,
  'plus aucun lancement ne laisse la session de paysage demander (puis refermer) le plein écran');
assert.match(page, /fullscreen=\{pleinEcran\}\s*\n\s*onToggleFullscreen=\{basculerPleinEcran\}/,
  'le menu reçoit l’état du plein écran et son bouton');
assert.match(page, /className=\{`rpg-mode-menu__fullscreen\$\{fullscreen \? ' is-on' : ''\}`\}[\s\S]*?aria-pressed=\{Boolean\(fullscreen\)\}[\s\S]*?title=\{fullscreen \? 'Quitter le plein écran \(F\)' : 'Plein écran \(F\)'\}/,
  'le bouton du menu annonce son état, son rôle et la touche F');
assert.match(page, /className=\{`rpg-duel-nav__fullscreen\$\{pleinEcran \? ' is-on' : ''\}`\}[\s\S]*?onClick=\{basculerPleinEcran\}[\s\S]*?aria-pressed=\{pleinEcran\}/,
  'la barre du duel a le même bouton, à côté du son');
assert.equal(page.match(/FullscreenIcon exit=/g)?.length, 2,
  'l’icône SVG partagée équipe le menu et le duel (deux boutons, pas de glyphe ⛶)');

assert.match(paysage, /export function createRpgLandscapeSession/,
  'la session de paysage existe toujours');
assert.match(paysage, /function attendrePleinEcran\(doc, timeoutMs = FULLSCREEN_WAIT_MS\)/,
  'la session attend le plein écran de la page avant de verrouiller l’orientation');
assert.match(paysage, /const attente = attendrePleinEcran\(doc\);\s*\n\s*if \(attente\) await attente;/,
  'l’attente ne rend la main que si le plein écran peut arriver');
assert.match(paysage, /if \(ownsFullscreen\) exitNativeFullscreen\(doc\);/,
  'la session ne referme que le plein écran qu’elle possède');

assert.match(battleCss, /body\.game-immersive-lock \{ overflow: hidden; overscroll-behavior: none; \}/,
  'le verrou de défilement est déclaré par le jeu lui-même, pas seulement par les jeux d’arcade');
assert.match(battleCss, /\.rpg-battle\.is-immersive \{ overscroll-behavior: none; \}/,
  'la couche plein écran coupe tout rebond de bord');
assert.match(battleCss, /\.rpg-mode-menu__fullscreen \{[\s\S]*?min-height: 45px;/,
  'le bouton du menu a la hauteur de la barre des modes, les deux restent alignés');
assert.match(battleCss, /\.rpg-mode-menu__fullscreen:hover,\s*\n\.rpg-mode-menu__fullscreen:focus-visible,\s*\n\.rpg-mode-menu__fullscreen\.is-on \{\s*\n\s*border-color: rgba\(231, 191, 101, \.48\);/,
  'le bouton du menu s’allume du même laiton que la barre des modes quand le plein écran est voulu');
assert.match(battleCss, /\.rpg-mode-menu__fullscreen \.rpg-fullscreen-icon \{ width: 16px; height: 16px; \}/,
  'l’icône du menu est calibrée');
assert.match(battleCss, /\.rpg-duel-nav__fullscreen \{\s*\n\s*min-width: 32px;\s*\n\s*padding: 6px 8px;/,
  'le bouton du duel reprend pied pour pied le gabarit du bouton son');
assert.doesNotMatch(battleCss, /\.rpg-battle--touch \.rpg-duel-nav__fullscreen/,
  'au doigt, le bouton du duel ne s’élargit pas : la colonne de navigation est bornée à 200 px en paysage');
assert.match(battleCss, /\.rpg-mode-menu__header \{\s*\n\s*display: grid;\s*\n\s*grid-template-columns: minmax\(0, 1fr\) auto;\s*\n\s*grid-template-areas: "brand fullscreen" "modes modes";/s,
  'sur téléphone, le bouton plein écran monte à côté du titre et la barre des modes garde toute la largeur');
assert.match(battleCss, /\.rpg-mode-menu__brand \{ min-width: 0; margin-right: auto; \}/,
  'sur grand écran, le bouton plein écran reste collé à la barre des modes');

console.log('check:rpg-fullscreen ✓ — plein écran du Sablier, sur ordinateur comme sur téléphone : l’interface se lance en plein écran de base (la coque fixe `.rpg-battle` porte `is-immersive` dès le montage, menu Jouer, mode Histoire, decks et catalogue compris, sans geste), le plein écran natif part au premier clic ou à la première touche et porte sur la coque du jeu — pas sur toute la page du site ; lancer un duel, un étage de l’Histoire ou « Reprendre » le redemande dans le geste, le même nœud traversant les écrans, donc le retour au menu ne referme rien (la session de paysage ne possède plus le plein écran : elle l’attend avant de verrouiller l’orientation) ; bouton du menu et bouton de la barre du duel, touche F (F majuscule compris, Ctrl/Cmd/Alt + F et touche maintenue laissés au navigateur, « f » tapé dans un champ ignoré), sortie du navigateur (Échap, geste « retour » d’Android) suivie par la page avec un jeu qui reste jouable et un relancement qui rouvre l’écran ; repli sans Fullscreen API (iPhone, iframe) ou sur demande refusée : la couche fixe seule couvre tout le viewport ; démontage : le verrou de défilement est rendu et le plein écran refermé.');
process.exit(0);
