import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let thumbnailBytes = 0;
for (const id of ['desert', 'western', 'prairie', 'sardinia', 'alger', 'japan', 'ramparts', 'infinity', 'airbase', 'snakeway']) {
  const image = readFileSync(new URL(`../src/games/assets/maps/${id}.webp`, import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF', `${id} est un fichier WebP`);
  assert.equal(image.toString('ascii', 8, 12), 'WEBP', `${id} est un fichier WebP`);
  assert.ok(image.length < 50 * 1024, `${id} reste sous 50 Kio`);
  thumbnailBytes += image.length;
}
assert.ok(thumbnailBytes < 330 * 1024, 'les dix miniatures restent sous 330 Kio au total');

execFileSync('npx', ['vite', 'build', '--ssr', 'scripts/mirage-flow-smoke.jsx', '--outDir', 'node_modules/.cache/mirage-flow', '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// btoa / atob / TextEncoder natifs de Node 22 suffisent (encodage du lien de défi).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkMirageFlow } = await import('../node_modules/.cache/mirage-flow/mirage-flow-smoke.js');
try { await checkMirageFlow(assert); } finally { dom.window.close(); }
console.log('check:mirage-flow ✓ — Mirage Rush ouvre sur de vrais boutons RUÉE / DUEL / COUPE / EN LIGNE, puis affiche les 10 maps à l’écran suivant ; le sélecteur de COUPE propose quatre boutons 3D sans détailler les parcours et met en avant jusqu’à 30 / 30 / 40 / 50 OR (10 OR par victoire) ; Paramètres regroupe La communauté, Ton cavalier, Boutique et Informations ; Boutique propose Cloud et son chocobo en accès temporaire universel avec prix habituel de 280 OR, en plus de Gyro à 200 OR ; ?mode=cup ouvre la coupe ; le lobby EN LIGNE garde ses 4 boutons de mode (COUPE ramène à la coupe) ; un défi verrouille sa map ; piste du téléphone à trois voies, deux rivaux et coupe à trois cavaliers alignés ; sur écran tactile, les consignes parlent glissement, aucune touche de clavier et aucune croix directionnelle ni losange de manette, remplacés par la barre d’objets du PC.');
