/** Vérifie le rendu du bris de verre sans dépendre des règles des cartes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-bouclier-smoke.jsx', outDir: 'node_modules/.cache/rpg-bouclier-verre', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const { rendreCartesBouclier } = await import('../node_modules/.cache/rpg-bouclier-verre/rpg-bouclier-smoke.js');
const rendus = rendreCartesBouclier();
for (const [nom, brise] of [['impactPartiel', false], ['impactBrise', true], ['lumiereTouchee', true]]) {
  const dom = new JSDOM(rendus[nom]);
  const impact = dom.window.document.querySelector('.rpg-bouclier-impact');
  assert.ok(impact, `${nom} possède un impact`);
  assert.equal(impact.querySelectorAll('.rpg-bouclier-impact__eclat').length, 6);
  assert.equal(impact.querySelectorAll('.rpg-bouclier-verre__fragment').length, brise ? 12 : 0);
  assert.equal(Boolean(impact.querySelector('.rpg-bouclier-verre__fissures')), brise);
  if (nom === 'lumiereTouchee') assert.ok(impact.classList.contains('rpg-bouclier-impact--lumiere'));
  dom.window.close();
}
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
assert.match(css, /@keyframes rpg-bouclier-verre-eclatement/);
assert.match(css, /\.rpg-bouclier-verre \{[^}]*pointer-events: none;/s);
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-bouclier-impact \{ display: none; \}/);
console.log('Bris de verre du bouclier : rendu et styles vérifiés.');
