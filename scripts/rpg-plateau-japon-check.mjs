/**
 * Le plateau japonais du Sablier, vérifié sur la vraie page du duel montée dans
 * jsdom (`scripts/rpg-plateau-japon-smoke.jsx`) : le deck du Serment du Soleil
 * rouge ouvre sa partie et la table se couvre de l'estampe du sanctuaire.
 * Complète `tests/rpg-plateaux.test.js` (le catalogue et le tirage) et
 * `npm run check:rpg-table-3d-ui` (le rendu WebGL, dans Chromium).
 *
 * Usage : node scripts/rpg-plateau-japon-check.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-plateau-japon-smoke.jsx', outDir: 'node_modules/.cache/rpg-plateau-japon', emptyOutDir: true },
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
  const { checkPlateauJapon } = await import('../node_modules/.cache/rpg-plateau-japon/rpg-plateau-japon-smoke.js');
  await checkPlateauJapon(assert);
} finally {
  dom.window.close();
}

// La peinture livrée : en 4K, au ratio 3:2 de tous les fonds, et sans texte ni
// métadonnée d'éditeur (l'interface du jeu se superpose toujours).
const plateauSource = readFileSync(new URL('../src/games/rpgPlateaux.js', import.meta.url), 'utf8');
const fichier = new URL('../public/plateau-sanctuaire-du-soleil-rouge.jpg', import.meta.url);
assert.ok(existsSync(fichier), 'le fond du sanctuaire est livré dans public/');
const octets = readFileSync(fichier);
assert.doesNotMatch(octets.toString('latin1'), /Photoshop|GIMP|Duparcq|signature|watermark|Adobe|exiftool|Canva/i,
  'le fond du sanctuaire ne porte ni métadonnée d’éditeur ni signature');
// Dimensions JPEG : le marqueur SOF0 (0xC0) donne hauteur puis largeur.
let taille = null;
for (let i = 2; i < octets.length;) {
  if (octets[i + 1] >= 0xc0 && octets[i + 1] <= 0xc3) {
    taille = { hauteur: octets.readUInt16BE(i + 5), largeur: octets.readUInt16BE(i + 7) };
    break;
  }
  i += 2 + octets.readUInt16BE(i + 2);
}
assert.deepEqual(taille, { hauteur: 2560, largeur: 3840 }, 'l’estampe est livrée en 4K, comme les autres fonds');
assert.match(plateauSource, /RPG_PLATEAUX_PAR_DECK = \{[\s\S]*?'serment-du-soleil-rouge': 'sanctuaire-du-soleil-rouge'/,
  'le deck japonais est bien rattaché à son terrain dans le catalogue');

console.log('Plateau japonais du Sablier : toutes les vérifications passent.');
process.exit(0);
