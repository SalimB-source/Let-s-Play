/**
 * La marée de mana : la recharge du tour rallume les orbes en cascade.
 * node scripts/rpg-mana-maree-check.mjs
 *
 * À chaque nouveau tour, la réserve de mana revient à son maximum. Plutôt que
 * dix allumages simultanés, les orbes disponibles s'illuminent de gauche à
 * droite avec une petite vague (40 ms d'écart par emplacement). La piste porte
 * `is-maree` le temps de la vague ; elle ne se déclenche que quand la réserve
 * REMONTE (une dépense la fait descendre), jamais au premier rendu, et jamais
 * en mouvement réduit. Le rendu jsdom réel couvre la structure des orbes et
 * l'index de cascade ; la feuille et le câblage React sont relus à part.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');

// ── 1. La piste, rendue pour de vrai ───────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-mana-maree-smoke.jsx', outDir: 'node_modules/.cache/rpg-mana-maree', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendrePisteMana } = await import('../node_modules/.cache/rpg-mana-maree/rpg-mana-maree-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendrePisteMana()}</body></html>`);
try {
  const piste = window.document.querySelector('.rpg-flux-track');
  assert.ok(piste, 'la piste de mana est rendue');
  assert.equal(piste.classList.contains('is-maree'), false,
    'aucune marée au premier rendu : la référence s’initialise à la réserve courante');

  const slots = [...piste.querySelectorAll('.rpg-flux-track__slot')];
  assert.equal(slots.length, 10, 'dix emplacements fixes, acquis ou non');
  slots.forEach((slot, index) => {
    assert.match(slot.getAttribute('style') ?? '', new RegExp(`--mana-slot:\\s*${index}`),
      `l’orbe ${index} porte son index de cascade`);
    assert.equal(slot.getAttribute('data-mana-slot'), String(index + 1), 'son numéro d’orbe suit (base 1)');
  });
  const allumees = piste.querySelectorAll('.rpg-flux-track__slot.is-lit');
  assert.equal(allumees.length, 4, 'les quatre mana acquis sont allumés');
  const vides = piste.querySelectorAll('.rpg-flux-track__slot.is-empty');
  assert.equal(vides.length, 6, 'les six emplacements non acquis restent vides');
  assert.equal(piste.getAttribute('data-mana-disponible'), '4', 'la réserve annonce son mana disponible');
} finally {
  window.close();
}

// ── 2. La feuille : une vague en cascade, rien que transform/opacité ────────
assert.match(css, /\.rpg-flux-track\.is-maree \.rpg-flux-track__slot\.is-lit\s*\{[^}]*animation:\s*rpg-mana-maree calc\(\.4s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.7, \.35, 1\) both;[^}]*animation-delay:\s*calc\(calc\(var\(--mana-slot, 0\) \* 40ms\) \* var\(--rpg-anim-scale, 1\)\);/s,
  'pendant la marée, chaque orbe allumé hérite de la vague, décalée de 40 ms par emplacement');
assert.match(css, /@keyframes rpg-mana-maree\s*\{/, 'l’animation de la marée existe');
const debutImages = css.indexOf('@keyframes rpg-mana-maree');
const finImages = css.indexOf('@media (prefers-reduced-motion: reduce)', debutImages);
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés forment un bloc borné');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(top|left|right|bottom|width|height|margin):/,
  'la marée n’anime aucune propriété de mise en page');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-flux-track\.is-maree \.rpg-flux-track__slot\.is-lit \{ animation: none; \}\s*\}/,
  'en mouvement réduit, la cascade se fige : les orbes gardent leur état, sans le geste');

// ── 3. Le composant : la marée ne se lève que quand la réserve remonte ──────
assert.match(page, /const precedentDispoRef = useRef\(disponible\);/,
  'la réserve du rendu précédent est mémorisée');
assert.match(page, /if \(disponible > precedentDispoRef\.current && !animationsReduites\(\)\) \{\s*setMaree\(true\);/,
  'une recharge (la disponibilité augmente) lève la marée, jamais une dépense, jamais en mouvement réduit');
assert.match(page, /precedentDispoRef\.current = disponible;/, 'la référence suit la réserve à chaque rendu');
assert.match(page, /timerMareeRef\.current = window\.setTimeout\(\(\) => setMaree\(false\), dureeAnimation\(DUREE_MAREE_MANA\)\);/,
  'la classe de marée se retire toute seule au bout de la cascade');
assert.match(page, /rpg-flux-track--\$\{cote\}\$\{maree \? ' is-maree' : ''\}/, 'la piste ne porte is-maree que le temps de la vague');
assert.match(page, /style=\{\{ '--mana-slot': index \}\}/, 'chaque orbe expose son index à la feuille');
assert.match(page, /const DUREE_MAREE_MANA = 800;/, 'la durée couvre les dix orbes : 9 × 40 ms de décalage plus la vague');

console.log('✓ Marée de mana : à la recharge du tour, les orbes disponibles se rallument de gauche à droite en cascade (40 ms d’écart), seulement quand la réserve remonte, jamais au premier rendu ni en mouvement réduit — index --mana-slot par orbe, animation transform/opacité seule, classe is-maree temporaire et minuterie annulée au démontage');
