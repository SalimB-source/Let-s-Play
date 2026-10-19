/**
 * Les créatures posées sur la table sont droites.
 * node scripts/rpg-table-droite-check.mjs
 *
 * L'éventail — et ses petites inclinaisons — n'appartient qu'à la main. Une
 * carte JOUÉE se pose droite, des deux côtés de la table. Le contrôle tient
 * les trois endroits qui pourraient la pencher : la variable d'inclinaison
 * `--tilt` (retirée des cartes de la table) ; la règle de repos de
 * `.rpg-card`, qui ne tourne plus la face ; et les rangées du duel, qui ne
 * transmettent plus d'angle. Il vérifie aussi ce qui reste voulu : la main
 * garde son éventail (`--hand-fan`), et un attaquant déclaré garde sa
 * bascule de 15°.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── 0. Le rendu réel, des deux côtés ────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-table-droite-smoke.jsx', outDir: 'node_modules/.cache/rpg-table-droite', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartesTable } = await import('../node_modules/.cache/rpg-table-droite/rpg-table-droite-smoke.js');
const rendu = rendreCartesTable();

for (const [cote, html] of Object.entries(rendu)) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  try {
    const carte = dom.window.document.querySelector('.rpg-card');
    assert.ok(carte, `${cote} : la carte est rendue`);
    assert.doesNotMatch(carte.getAttribute('style') ?? '', /--tilt/,
      `${cote} : aucune inclinaison d'éventail n'est posée sur la carte de la table`);
    assert.doesNotMatch(carte.getAttribute('style') ?? '', /rotate\(/,
      `${cote} : le style de la carte ne la fait pas tourner`);
    assert.equal(carte.getAttribute('data-combat-tilted'), 'false',
      `${cote} : hors combat, la carte n'est pas déclarée inclinée`);
  } finally {
    dom.window.close();
  }
}

// ── 1. Le source : plus d'angle sur la table, l'éventail reste dans la main ──
const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const duel = lire('RpgDuelPage.jsx');
const battleCss = lire('rpg-battle.css');

assert.doesNotMatch(duel, /const TILTS = \[/,
  'la table ne tire plus ses angles d’un catalogue d’inclinaisons');
const tableCard = duel.slice(duel.indexOf('export function TableCard'), duel.indexOf('function HoverCardPreview('));
assert.doesNotMatch(tableCard, /\btilt\b/, 'la carte de la table n’accepte plus d’angle d’éventail');
assert.doesNotMatch(tableCard, /--tilt/, 'et ne pose plus de variable d’inclinaison');
assert.doesNotMatch(duel, /tilt=\{TILTS/, 'aucune rangée du duel ne transmet d’inclinaison');
// La main, elle, garde son éventail — c'est une autre variable, un autre rendu.
assert.match(duel, /'--hand-fan': eventail,/, 'la main conserve son éventail');
assert.match(battleCss, /--hand-fan-angle: calc\(var\(--hand-fan, 0\) \* var\(--hand-fan-step\)\);/,
  'et son pas d’angle, propre à la main');

// ── 2. La feuille : la carte posée ne tourne pas ────────────────────────────
assert.match(battleCss, /\.rpg-card \{[^}]*transform:\s*none;/s,
  'au repos, une carte de la table ne tourne pas');
assert.match(battleCss, /\.rpg-card:hover \{\s*transform:\s*translateY\(-6px\);\s*\}/,
  'survoler une carte la soulève, sans la pencher');
assert.match(battleCss, /\.rpg-card\.is-active \{\s*transform:\s*translateY\(-10px\);/,
  'une carte active monte, droite');
assert.doesNotMatch(battleCss, /var\(--tilt/,
  'plus aucune règle ne lit un angle d’éventail sur la table');
assert.match(battleCss, /\.rpg-card\.is-down \{[^}]*transform:\s*rotate\(-7deg\) translateY\(8px\);/s,
  'une carte tombée garde sa propre inclinaison de repos, fixe');

// ── 3. Ce qui reste voulu : l'attaquant déclaré penche ─────────────────────
assert.match(battleCss, /\.rpg-card\[data-combat-tilted="true"\] \{\s*transform:\s*rotate\(15deg\) !important;/,
  'un attaquant déclaré garde sa bascule de 15° — un état de combat, pas une pose');

console.log('✓ Table droite : les créatures jouées, des deux côtés, ne portent plus l’inclinaison d’éventail de la main (`--tilt` retiré, `.rpg-card` sans rotation, rangées sans angle) ; la main garde son éventail (`--hand-fan`) et l’attaquant déclaré sa bascule de 15°');
