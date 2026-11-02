import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-tempete-foudre-smoke.jsx', outDir: 'node_modules/.cache/rpg-tempete-foudre', emptyOutDir: true } });
const { rendreEclairs } = await import('../node_modules/.cache/rpg-tempete-foudre/rpg-tempete-foudre-smoke.js');
for (const [couleur, html] of Object.entries(rendreEclairs())) {
  const racine = new JSDOM(html).window.document.querySelector('.rpg-eclair-marteau');
  assert.ok(racine); assert.equal(racine.classList.contains('rpg-eclair-marteau--braise'), couleur === 'braise');
  assert.ok(racine.querySelector('.rpg-eclair-marteau__eclair--coeur'));
}
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
assert.match(page, /animation\.type === 'tempete-foudre'/);
assert.match(page, /idsTempeteFoudre\.has\(entite\.entityId\)/);
assert.match(page, /tempeteBraise: idsTempeteFoudre\.has\(entite\.entityId\) && entite\.camp === 'joueur'/);
console.log('Éclairs Neige et Braise : rendu et liaison au signal vérifiés.');
