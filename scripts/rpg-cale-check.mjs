/**
 * La prisonnière derrière son capteur (Abordage, set Lettres de Marque).
 * node scripts/rpg-cale-check.mjs
 *
 * Sur la TABLE, la carte de la créature détenue se glisse DERRIÈRE son
 * ravisseur : elle dépasse par le haut et la droite, inclinée, assombrie,
 * derrière les chaînes, son nom en haut de la carte visible sur la bande qui
 * dépasse — le bouton du capteur la recouvre, on ne lit d'elle que ce qui
 * dépasse. Dans la FICHE du capteur (clic droit, appui), les deux créatures
 * sont EMPILÉES en perspective, tournées vers la gauche : la prisonnière
 * derrière, fortement inclinée et décalée à gauche, le capteur devant,
 * légèrement incliné. Décoratif partout : rien à cliquer, tout se lit déjà
 * dans l'aria du capteur ; sans prise, le DOM reste celui d'avant.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── 0. Le rendu réel ────────────────────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-cale-smoke.jsx', outDir: 'node_modules/.cache/rpg-cale', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCales } = await import('../node_modules/.cache/rpg-cale/rpg-cale-smoke.js');
const rendu = rendreCales();

const documentDe = (html) => new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document;

// ── 1. Sur la table : la carte prisonnière DERRIÈRE le capteur ─────────────
for (const [nom, cas] of [['capitaine', rendu.capitaine], ['capitaineEnnemi', rendu.capitaineEnnemi]]) {
  const doc = documentDe(cas.html);
  const pile = doc.querySelector('.rpg-card-prison');
  assert.ok(pile, `${nom} : le capteur vit dans son wrapper de prison`);
  const prisonniere = pile.querySelector('.rpg-card__prisonniere');
  const capteur = pile.querySelector('.rpg-card');
  assert.ok(prisonniere && capteur, `${nom} : la pile contient la prisonnière et le capteur`);
  assert.ok(prisonniere.previousElementSibling === null && capteur.previousElementSibling === prisonniere,
    `${nom} : la prisonnière vient AVANT le bouton du capteur dans le DOM — elle est dessous`);
  assert.equal(prisonniere.getAttribute('aria-hidden'), 'true',
    `${nom} : la carte détenue est décorative — l'aria du capteur dit déjà la cale`);
  assert.match(prisonniere.querySelector('.rpg-card__prisonniere-art')?.getAttribute('src') ?? '',
    /\/cards\/fennec-des-decombres\.jpg(\?|$)/,
    `${nom} : la carte détenue montre sa peinture`);
  assert.equal(prisonniere.querySelector('.rpg-card__prisonniere-nom')?.textContent, 'Fennec des décombres',
    `${nom} : le nom de la détenue est imprimé en haut de sa carte`);
  assert.ok(prisonniere.querySelector('.rpg-card__prisonniere-chaine')?.textContent.includes('⛓'),
    `${nom} : les chaînes barrent la carte détenue`);
  assert.equal(capteur.getAttribute('data-prisonniere'), 'fennec-des-decombres',
    `${nom} : le bouton du capteur porte la détenue pour la fiche`);
  assert.ok(capteur.querySelector('[data-compteur="cale"]'),
    `${nom} : le losange ⛓ de la cale reste sur le capteur`);
  assert.match(capteur.getAttribute('aria-label') ?? '', /Cotre de course/,
    `${nom} : le capteur lui-même est bien rendu — son aria le nomme`);
  assert.match(capteur.getAttribute('aria-label') ?? '', /cale : détient Fennec des décombres/,
    `${nom} : l'aria du capteur complète la carte détenue, il ne la remplace pas`);
}

// ── 2. Sans cale : le DOM reste celui d'avant ──────────────────────────────
const docLibre = documentDe(rendu.libre.html);
assert.equal(docLibre.querySelector('.rpg-card-prison'), null,
  'sans prise en cale, aucun wrapper de prison — une carte, un bouton');
assert.equal(docLibre.querySelector('.rpg-card__prisonniere'), null,
  'sans prise en cale, aucune carte derrière');
assert.equal(docLibre.querySelector('[data-compteur="cale"]'), null,
  'sans prise en cale, pas de losange ⛓ non plus');

// ── 3. La fiche du capteur : les deux créatures empilées en perspective ────
const docFiche = documentDe(rendu.fiche.html);
const empile = docFiche.querySelector('.rpg-hover-card-preview__empile--caale');
assert.ok(empile, 'la fiche du capteur empile les deux créatures');
const faces = [...empile.querySelectorAll(':scope > .rpg-hover-card-preview__face')];
assert.equal(faces.length, 2, 'deux faces dans la pile : la prisonnière et le capteur');
const facePrisonniere = faces[0];
const faceCapteur = faces[1];
assert.ok(facePrisonniere.classList.contains('rpg-hover-card-preview__face--prisonniere'),
  'la face de derrière est celle de la prisonnière');
assert.equal(facePrisonniere.getAttribute('aria-hidden'), 'true',
  'la face détenue est décorative dans la fiche');
assert.equal(facePrisonniere.getAttribute('data-prisonniere'), 'fennec-des-decombres',
  'la face de derrière porte la détenue');
assert.match(facePrisonniere.querySelector('img')?.getAttribute('src') ?? '',
  /\/cards\/fennec-des-decombres\.jpg(\?|$)/,
  'la fiche montre la peinture de la détenue');
assert.equal(facePrisonniere.querySelector('.rpg-hover-card-preview__prison-nom')?.textContent,
  'Fennec des décombres', 'le nom de la détenue est imprimé sur sa face');
assert.ok(facePrisonniere.querySelector('.rpg-hover-card-preview__prison-chaine')?.textContent.includes('⛓'),
  'les chaînes barrent la face détenue');
assert.ok(!faceCapteur.classList.contains('rpg-hover-card-preview__face--prisonniere'),
  'la face de devant est celle du capteur');
assert.match(docFiche.querySelector('.rpg-hover-card-preview')?.getAttribute('aria-label') ?? '',
  /détient Fennec des décombres en sa cale/,
  'l’aria de la fiche dit la détention');

const docFicheLibre = documentDe(rendu.ficheLibre.html);
assert.equal(docFicheLibre.querySelector('.rpg-hover-card-preview__empile--caale'), null,
  'sans prisonnière, la fiche n’empile rien');
assert.equal(docFicheLibre.querySelectorAll('.rpg-hover-card-preview__face').length, 1,
  'sans prisonnière, la fiche montre une seule face');

// ── 4. La feuille de style tient le décor ─────────────────────────────────
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const blocPile = css.slice(css.indexOf('.rpg-card-prison {'), css.indexOf('.rpg-card__prisonniere-nom'));
assert.match(blocPile, /position:\s*absolute/, 'la carte détenue se place dans la pile du capteur');
assert.match(blocPile, /top:\s*-9%/, 'elle dépasse du capteur par le haut');
assert.match(blocPile, /left:\s*8%/, 'et par la droite');
assert.match(blocPile, /z-index:\s*0/, 'elle vit SOUS le bouton du capteur');
assert.match(css, /\.rpg-card-prison > \.rpg-card \{\s*z-index:\s*1;/, 'le capteur la recouvre');
assert.match(blocPile, /pointer-events:\s*none/, 'rien à cliquer : la rançon reste au bouton d’action');
assert.match(blocPile, /transform:\s*rotate\(2\.6deg\)/, 'la carte détenue arrive inclinée, glissée derrière');
assert.match(css, /@keyframes rpg-prisonniere-arrivee/, 'la carte détenue anime son arrivée derrière le capteur');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-card__prisonniere \{\s*animation: none;/,
  'en mouvement réduit, la carte détenue apparaît sans animation');

const blocFiche = css.slice(css.indexOf('.rpg-hover-card-preview__empile'), css.indexOf('.rpg-hover-card-preview__face {'));
assert.match(blocFiche, /\.rpg-hover-card-preview__empile--caale \{\s*perspective:/,
  'la pile de la fiche vit en perspective');
assert.match(blocFiche, /transform:\s*rotateY\(-26deg\) translateX\(-6%\)/,
  'la prisonnière est tournée vers la gauche et décalée à gauche');
assert.match(blocFiche, /:not\(\.rpg-hover-card-preview__face--prisonniere\) \{\s*position:\s*relative;\s*z-index:\s*1;\s*transform:\s*rotateY\(-8deg\)/,
  'le capteur devant reste lisible, incliné vers la gauche lui aussi');
assert.match(blocFiche, /filter:\s*brightness\(\.72\)/, 'la prisonnière est assombrie : elle est détenue');

console.log('✓ La prisonnière se glisse DERRIÈRE son capteur — et la fiche empile les deux créatures, en perspective vers la gauche.');
