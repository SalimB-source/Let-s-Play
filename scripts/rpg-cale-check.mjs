/**
 * La prisonnière visible sur le capteur (Abordage, set Lettres de Marque).
 * node scripts/rpg-cale-check.mjs
 *
 * Une fois la prise faite, la créature détenue quittait la table : son nom ne
 * vivait que dans le tooltip du losange ⛓ et le bouton de rançon. Désormais
 * sa MINI-FACE se glisse sous le coin haut-droit du capteur et dépasse du
 * cadre — inclinée, assombrie, derrière les chaînes, son nom au bas de la
 * miniature — dans les deux camps. Décorative : rien à cliquer, tout se lit
 * déjà dans l'aria du capteur ; la miniature passe sous le bouton de capacité
 * activée et sous les losanges de compteurs ; le losange ⛓ reste ; et une
 * créature sans cale ne montre rien. En mouvement réduit, la miniature
 * n'anime plus son arrivée.
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

const racineDe = (html) => new JSDOM(`<!doctype html><html><body>${html}</body></html>`)
  .window.document.querySelector('.rpg-card');

// ── 1. La mini-face de la prisonnière, sur le capteur des deux camps ───────
for (const [nom, cas] of [['capitaine', rendu.capitaine], ['capitaineEnnemi', rendu.capitaineEnnemi]]) {
  const racine = racineDe(cas.html);
  const mini = racine.querySelector('.rpg-card__prisonniere');
  assert.ok(mini, `${nom} : la mini-face de la prisonnière est rendue sur le capteur`);
  assert.equal(mini.getAttribute('aria-hidden'), 'true',
    `${nom} : la miniature est décorative — l'aria du capteur dit déjà la cale`);
  assert.equal(mini.getAttribute('data-prisonniere'), 'fennec-des-decombres',
    `${nom} : la miniature porte l'identifiant de la détenue`);
  assert.match(mini.querySelector('.rpg-card__prisonniere-art')?.getAttribute('src') ?? '',
    /\/cards\/fennec-des-decombres\.jpg(\?|$)/,
    `${nom} : la miniature montre la peinture de la détenue`);
  assert.equal(mini.querySelector('.rpg-card__prisonniere-nom')?.textContent, 'Fennec des décombres',
    `${nom} : le nom de la détenue est imprimé au bas de la miniature`);
  assert.ok(mini.querySelector('.rpg-card__prisonniere-chaine')?.textContent.includes('⛓'),
    `${nom} : les chaînes barrent la miniature`);
  assert.ok(racine.querySelector('[data-compteur="cale"]'),
    `${nom} : le losange ⛓ de la cale reste sur le capteur`);
  assert.match(racine.getAttribute('aria-label') ?? '', /cale : détient Fennec des décombres/,
    `${nom} : l'aria du capteur complète la miniature, il ne la remplace pas`);
}

// ── 2. Une créature sans cale ne montre rien ───────────────────────────────
const libre = racineDe(rendu.libre.html);
assert.equal(libre.querySelector('.rpg-card__prisonniere'), null,
  'sans prise en cale, aucune miniature ne dépasse du cadre');
assert.equal(libre.querySelector('[data-compteur="cale"]'), null,
  'sans prise en cale, pas de losange ⛓ non plus');

// ── 3. La feuille de style tient le décor ─────────────────────────────────
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const bloc = css.slice(css.indexOf('.rpg-card__prisonniere {'), css.indexOf('.rpg-card__prisonniere-art'));
assert.match(bloc, /position:\s*absolute/, 'la miniature se place au coin du capteur');
assert.match(bloc, /top:\s*-15%/, 'elle DÉPASSE du cadre par le haut');
assert.match(bloc, /right:\s*-8%/, 'et par la droite');
assert.match(bloc, /z-index:\s*3/, 'elle passe sous le bouton de capacité activée (z-index 4) et les losanges (z-index 5)');
assert.match(bloc, /pointer-events:\s*none/, 'rien à cliquer : la rançon reste au bouton d’action');
assert.match(bloc, /transform:\s*rotate\(-9deg\)/, 'la miniature arrive inclinée, glissée sous le coin');
assert.match(bloc, /overflow:\s*hidden/, 'son contenu (art, nom) est rogné au cadre de la miniature');
assert.ok(css.includes('@keyframes rpg-prisonniere-arrivee'),
  'la miniature anime son arrivée sous le coin du capteur');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-card__prisonniere \{\s*animation: none;/,
  'en mouvement réduit, la miniature apparaît sans animation');

console.log('✓ La prisonnière de la cale se voit sur le capteur — mini-face, chaînes et nom, dans les deux camps.');
