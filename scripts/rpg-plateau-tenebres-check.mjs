/**
 * Les deux plateaux des Ténèbres, vérifiés sur la vraie page du duel montée dans
 * jsdom (`scripts/rpg-plateau-tenebres-smoke.jsx`) : la Balance des Heures ouvre
 * sa partie sur les dalles de la Nécropole, le tribunal de la Nécropole siège
 * dans la salle du trône du Palais, et leurs deux terrains se répondent.
 * Complète `tests/rpg-plateaux.test.js` (le catalogue, le tirage et les fonds
 * 4K) et `npm run check:rpg-table-3d` (les ambiances du décor 3D).
 *
 * Usage : node scripts/rpg-plateau-tenebres-check.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-plateau-tenebres-smoke.jsx', outDir: 'node_modules/.cache/rpg-plateau-tenebres', emptyOutDir: true },
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
  const { checkPlateauxTenebres } = await import('../node_modules/.cache/rpg-plateau-tenebres/rpg-plateau-tenebres-smoke.js');
  await checkPlateauxTenebres(assert);
} finally {
  dom.window.close();
}

// Les deux peintures livrées : en 4K, au ratio 3:2 de tous les fonds, et sans
// métadonnée d'éditeur ni signature (l'interface du jeu se superpose toujours).
const plateauSource = readFileSync(new URL('../src/games/rpgPlateaux.js', import.meta.url), 'utf8');
const tailleJpeg = (octets) => {
  for (let i = 2; i < octets.length;) {
    const marqueur = octets[i + 1];
    if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
      return { hauteur: octets.readUInt16BE(i + 5), largeur: octets.readUInt16BE(i + 7) };
    }
    i += 2 + octets.readUInt16BE(i + 2);
  }
  return null;
};
for (const { id, fichier } of [
  { id: 'necropole-des-dalles', fichier: 'plateau-necropole-des-dalles.jpg' },
  { id: 'palais-du-pharaon', fichier: 'plateau-palais-du-pharaon.jpg' },
]) {
  const url = new URL(`../public/${fichier}`, import.meta.url);
  assert.ok(existsSync(url), `le fond ${fichier} est livré dans public/`);
  const octets = readFileSync(url);
  assert.doesNotMatch(octets.toString('latin1'), /Photoshop|GIMP|Duparcq|signature|watermark|Adobe|exiftool|Canva/i,
    `le fond ${fichier} ne porte ni métadonnée d'éditeur ni signature`);
  assert.deepEqual(tailleJpeg(octets), { hauteur: 2560, largeur: 3840 },
    `la peinture de ${id} est livrée en 4K 3:2, comme les autres fonds`);
  assert.match(plateauSource, new RegExp(`id: '${id}'[\\s\\S]*?fichier: '${fichier.replace(/\./g, '\\.')}'`),
    `${id} est déclaré dans le catalogue avec son fond`);
}
assert.match(plateauSource, /RPG_PLATEAUX_PAR_DECK = \{[\s\S]*?'balance-des-heures': 'necropole-des-dalles'/,
  'la Balance des Heures est rattachée à son terrain dans le catalogue');
assert.match(plateauSource, /'juges-de-la-necropole': 'palais-du-pharaon'/,
  'le tribunal de la Nécropole est rattaché au Palais du Pharaon');

console.log('Plateaux des Ténèbres du Sablier : toutes les vérifications passent.');
process.exit(0);
