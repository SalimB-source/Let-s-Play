// Vérification du bandeau d'ouverture de tour du Sablier — « Votre tour » /
// « Tour de l'adversaire » pendant 1,5 s à chaque bascule de tour. Rendu jsdom
// réel (la durée est chronométrée), puis lectures du source et de la feuille.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-turn-banner-smoke.jsx', outDir: 'node_modules/.cache/rpg-turn-banner', emptyOutDir: true },
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

try {
  const { checkRpgTurnBanner } = await import('../node_modules/.cache/rpg-turn-banner/rpg-turn-banner-smoke.js');
  await checkRpgTurnBanner(assert);
} finally {
  dom.window.close();
}

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

// ── Le contrat de temps : une seule source pour la durée ────────────────────
assert.match(battlePage, /const RPG_ANNONCE_TOUR_DUREE = 1500;/,
  'la durée du bandeau est fixée à 1,5 s, en un seul endroit');
assert.match(battlePage, /'--rpg-annonce-tour-duree': `\$\{RPG_ANNONCE_TOUR_DUREE\}ms`/,
  'la même durée descend jusqu’à la feuille de style, qui l’anime');
assert.match(battleCss, /animation:\s*rpg-annonce-tour var\(--rpg-annonce-tour-duree,\s*1\.5s\)/,
  'le fondu de sortie du bandeau suit la durée du jeu, pas une seconde valeur en dur');

// ── Ce qui déclenche le bandeau, et ce qui le tait ──────────────────────────
assert.match(battlePage, /const campDuTour = duel\?\.tour \?\? null;/,
  'le bandeau lit le camp qui a la main dans le duel');
assert.match(battlePage, /if \(!campDuTour \|\| ecran !== 'partie' \|\| voletMulliganOuvert \|\| duelTermine\) \{\s*setAnnonceTour\(null\);/s,
  'pas de bandeau hors de la table, pendant le mulligan, ni sur un duel terminé');
assert.match(battlePage, /if \(dejaAnnonce\.session === session && dejaAnnonce\.camp === campDuTour\) return undefined;/,
  'un camp déjà annoncé ne se réannonce pas tant que le tour n’a pas basculé');
assert.match(battlePage, /annonceTourRef\.current = \{ session, camp: campDuTour \};/,
  'le témoin garde la session du duel : une partie neuve s’annonce même sur le même camp');
assert.match(battlePage, /\}, \[campDuTour, ecran, voletMulliganOuvert, duelTermine\]\);/,
  'le bandeau se déclenche sur la bascule du tour, l’écran, le mulligan et la fin du duel');
assert.match(battlePage, /setAnnonceTour\(\(courant\) => \(courant\?\.token === token \? null : courant\)\);/,
  'seul le bandeau du tour en cours se retire : une minuterie en retard n’efface pas le suivant');

// ── Le rendu : une plaque nommée, sans geste capté ──────────────────────────
const annonceTour = battlePage.slice(battlePage.indexOf('function AnnonceTour('), battlePage.indexOf('/* ── Boîtier de deck en 3D'));
assert.ok(annonceTour.length > 300, 'le bandeau est un composant dédié, entre l’annonce de sort et le boîtier de deck');
assert.match(annonceTour, /className="rpg-annonce-tour"[\s\S]{0,220}?role="status"[\s\S]{0,120}?aria-live="polite"/,
  'le bandeau est une zone d’état annoncée poliment aux lecteurs d’écran');
assert.match(annonceTour, /joueur \? 'Votre tour' : 'Tour de l’adversaire'/,
  'les deux libellés sont ceux du jeu : « Votre tour » et « Tour de l’adversaire »');
assert.match(annonceTour, /key=\{annonce\.token\}/,
  'chaque bandeau neuf porte sa clé : le fondu rejoue à chaque tour');
assert.match(battlePage, /<AnnonceTour annonce=\{annonceTour\} \/>/,
  'la table rend le bandeau du tour en cours');
assert.match(battleCss, /\.rpg-annonce-tour\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*46;[^}]*place-content:\s*center;[^}]*pointer-events:\s*none;/s,
  'le bandeau se pose au centre de la table et ne capte aucun geste');
assert.match(battleCss, /\.rpg-annonce-tour__bandeau\.is-joueur\s*\{\s*border-color:[^}]*color:\s*#ffe887;\s*\}/,
  'le tour du joueur parle en or, comme la pastille de tour');
assert.match(battleCss, /\.rpg-annonce-tour__bandeau\.is-sorcier\s*\{\s*border-color:[^}]*color:\s*#ffc19e;\s*\}/,
  'le tour du sorcier parle en braise, comme la pastille de tour');
assert.match(battleCss, /\.rpg-annonce-tour__bandeau\s*\{[^}]*animation:\s*rpg-annonce-tour/s,
  'le bandeau entre et sort par son propre fondu');
assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-annonce-tour__bandeau \{ animation-name: rpg-annonce-tour-fondu; \}/s,
  'en mouvement réduit, le bandeau se contente d’apparaître et de disparaître');

console.log('✓ Bandeau d’ouverture de tour : « Votre tour » au joueur, « Tour de l’adversaire » au sorcier — 1,5 s chacun, teinte du camp, posé sur la table sans capter un geste, muet pendant le mulligan et sur un duel terminé');
