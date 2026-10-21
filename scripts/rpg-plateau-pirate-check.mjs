/**
 * Le Navire Pirate du Sablier et sa piste `stepanbel_pirates_main-01.mp3`,
 * vérifiés sur la vraie table du duel montée dans jsdom (solo et PvP).
 *
 * Usage : node scripts/rpg-plateau-pirate-check.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: {
    ssr: 'scripts/rpg-plateau-pirate-smoke.jsx',
    outDir: 'node_modules/.cache/rpg-plateau-pirate',
    emptyOutDir: true,
  },
});
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
  const { checkPlateauPirate } = await import('../node_modules/.cache/rpg-plateau-pirate/rpg-plateau-pirate-smoke.js');
  await checkPlateauPirate(assert);
} finally {
  dom.window.close();
}

const plateauUrl = new URL('../public/plateau-navire-pirate.jpg', import.meta.url);
assert.ok(existsSync(plateauUrl), 'le fond public/plateau-navire-pirate.jpg est livré');
const octets = readFileSync(plateauUrl);
assert.doesNotMatch(
  octets.toString('latin1'),
  /Photoshop|GIMP|Duparcq|signature|watermark|Adobe|exiftool|Canva/i,
  'le fond du navire pirate ne porte ni métadonnée d’éditeur ni filigrane',
);

let taille = null;
for (let i = 2; i < octets.length;) {
  if (octets[i] !== 0xff) { i += 1; continue; }
  const m = octets[i + 1];
  if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
    taille = { hauteur: octets.readUInt16BE(i + 5), largeur: octets.readUInt16BE(i + 7) };
    break;
  }
  i += 2 + octets.readUInt16BE(i + 2);
}
assert.deepEqual(taille, { hauteur: 2560, largeur: 3840 },
  'la peinture du navire pirate est livrée en 4K 3:2 (3840×2560)');

const audioUrl = new URL('../public/audio/stepanbel_pirates_main-01.mp3', import.meta.url);
assert.ok(existsSync(audioUrl), 'la piste public/audio/stepanbel_pirates_main-01.mp3 est livrée');
assert.equal(readFileSync(audioUrl).length, 3049104,
  'la piste stepanbel_pirates_main-01.mp3 est intacte au dernier octet');

console.log('Plateau du Navire Pirate et musique pirate : toutes les vérifications passent.');
process.exit(0);
