/**
 * Le retournement 3D du bouton « Fin du tour » au nouveau tour du joueur.
 * node scripts/rpg-fin-tour-retourne-check.mjs
 *
 * Le geste le plus répété du duel doit avoir un retour net : à chaque fois que
 * la main revient au joueur, le libellé du bouton se retourne en 3D (rotation Y
 * de 90° à 0). Le flip porte sur le libellé, jamais sur le bouton, pour ne pas
 * combattre le survol ni l'état désactivé. Pur effet de geste : aucun état du
 * duel n'en dépend, le premier rendu et les duels neufs ne jouent rien, et le
 * mouvement réduit le supprime. Le bouton n'est pas exporté seul : la feuille et
 * le câblage React sont relus à part, comme les autres effets de page.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. La feuille : un retournement 3D isolé sur le libellé ────────────────
assert.match(css, /\.rpg-btn--endturn__label\s*\{\s*display:\s*inline-block;\s*\}/,
  'le libellé est un boîtier propre pour la rotation 3D');
assert.match(css, /\.rpg-btn--endturn\.is-tour-neuf \.rpg-btn--endturn__label\s*\{[^}]*animation:\s*rpg-fin-de-tour-retourne calc\(\.48s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.4, \.2, \.25, 1\) both;/s,
  'le flip ne s’allume que pendant la classe is-tour-neuf, sur le libellé seul');
const debutKeyframes = css.indexOf('@keyframes rpg-fin-de-tour-retourne');
assert.ok(debutKeyframes > 0, 'l’animation du retournement existe');
let profondeur = 0;
let finKeyframes = -1;
for (let i = css.indexOf('{', debutKeyframes); i < css.length; i += 1) {
  if (css[i] === '{') profondeur += 1;
  if (css[i] === '}') {
    profondeur -= 1;
    if (profondeur === 0) { finKeyframes = i; break; }
  }
}
const keyframes = css.slice(debutKeyframes, finKeyframes);
assert.match(keyframes, /rotateY\(90deg\)/, 'le geste commence de profil (90°)');
assert.match(keyframes, /rotateY\(0deg\)/, 'et se termine face au joueur (0°)');
assert.match(keyframes, /perspective\(440px\)/, 'la rotation reste dans une perspective fixe');
assert.doesNotMatch(keyframes, /(top|left|right|bottom|width|height|margin):/,
  'le retournement n’anime aucune propriété de mise en page');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-btn--endturn\.is-tour-neuf \.rpg-btn--endturn__label \{ animation: none; \}\s*\}/,
  'en mouvement réduit, le bouton ne se retourne pas');

// ── 2. Le composant : le flip suit le changement de tour, rien d'autre ─────
assert.match(page, /const \[flipTourNeuf, setFlipTourNeuf\] = useState\(false\);/,
  'l’état du flip est binaire et éteint par défaut');
assert.match(page, /const tourPrecedentFlipRef = useRef\(null\);/,
  'le tour précédent est mémorisé pour détecter le changement');
assert.match(page, /const timerFlipRef = useRef\(null\);/, 'la minuterie du geste est annulable');
assert.match(page, /const DUREE_FLIP_TOUR = 480;/, 'le geste dure 480 ms, sous la seconde de décision');
// L’effet lit le duel par sa réf. : pas de dépendance inline à la constante
// `duel` (zone morte temporelle), et le premier rendu reste silencieux.
const effet = page.slice(page.indexOf('Le bouton « Fin du tour » se retourne'), page.indexOf('Abordage : chaque créature'));
assert.match(effet, /const duelCourant = duelRef\.current;/, 'l’effet lit le duel courant par sa réf.');
assert.match(effet, /if \(tourPrecedentFlipRef\.current === null\) \{\s*tourPrecedentFlipRef\.current = tour;\s*return;/s,
  'le premier rendu initialise la réf. sans jouer le flip');
assert.match(effet, /if \(tour !== 'joueur' \|\| animationsReduites\(\)\) return;/,
  'le flip ne part que pour un nouveau tour du joueur, et jamais en mouvement réduit');
assert.match(effet, /setFlipTourNeuf\(true\);/, 'le tour du joueur allume la classe');
assert.match(effet, /window\.setTimeout\(\(\) => setFlipTourNeuf\(false\), dureeAnimation\(DUREE_FLIP_TOUR\)\)/,
  'la classe s’éteint toute seule au bout du geste');

// ── 3. Le bouton : classe conditionnelle et libellé retournable ────────────
assert.match(page, /className=\{`rpg-btn rpg-btn--endturn\$\{flipTourNeuf \? ' is-tour-neuf' : ''\}`\}/,
  'le bouton reçoit is-tour-neuf uniquement pendant le geste');
assert.match(page, /<span className="rpg-btn--endturn__label">⧗ Fin du tour<\/span>/,
  'le texte du bouton vit dans le libellé qui porte la rotation');

// ── 4. Aucune minuterie orpheline, et le duel neuf repart propre ───────────
assert.match(page, /useEffect\(\(\) => \(\) => \{\s*if \(timerFlipRef\.current\) window\.clearTimeout\(timerFlipRef\.current\);\s*\}, \[\]\);/,
  'le démontage de la page annule la minuterie du flip');
const reset = page.slice(page.indexOf('setFlipTourNeuf(false);') - 260, page.indexOf('setFlipTourNeuf(false);') + 220);
assert.match(reset, /window\.clearTimeout\(timerFlipRef\.current\)/, 'un duel neuf annule la minuterie');
assert.match(reset, /tourPrecedentFlipRef\.current = duelRef\.current\?\.tour \?\? null;/,
  'un duel neuf réarme la référence de tour : pas de flip hérité du duel précédent');

console.log('✓ Retournement du bouton Fin du tour : à chaque nouveau tour du joueur, le libellé se retourne en 3D (rotateY 90°→0, 480 ms) sur un boîtier isolé du bouton — geste pur sans état de duel, silencieux au premier rendu, sur les duels neufs et en mouvement réduit, minuterie annulée au démontage et au reset');
