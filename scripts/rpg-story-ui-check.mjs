import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface du mode Histoire : tours, étages verrouillés,
// lancement d'un étage (sorcier, puissance et profil), navigation et progression.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-story-smoke.jsx', outDir: 'node_modules/.cache/rpg-story', emptyOutDir: true },
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

const { checkRpgStory } = await import('../node_modules/.cache/rpg-story/rpg-story-smoke.js');
try {
  await checkRpgStory(assert);
} finally {
  dom.window.close();
}

const pageSource = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
assert.match(pageSource, /marquerEtageVaincu\(progression, histoireEtageId\)/,
  'la victoire en mode Histoire est enregistrée dans la progression');
assert.match(pageSource, /Étage suivant/, 'la victoire propose l’étage suivant');
assert.match(pageSource, /Recommencer l’étage/, 'la défaite permet de rejouer l’étage');
assert.match(pageSource, /Tour terminée/, 'le sommet annonce la fin de la tour');

console.log('✓ Mode Histoire : tours, verrous, lancement, identité du sorcier, retour menu et progression');
