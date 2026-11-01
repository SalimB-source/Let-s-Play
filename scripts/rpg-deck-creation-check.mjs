// Vérification d'interface du nouveau parcours de création de deck :
// seuil à deux portes (assistée / manuelle), assistant en trois étapes
// (l'invite de texte lue par l'IA, puis les couleurs, puis le style aggro /
// contrôle / mix) générant un deck de cartes possédées, et atelier manuel
// minimaliste à filtres repliés.
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-deck-creation-smoke.jsx', outDir: 'node_modules/.cache/rpg-deck-creation', emptyOutDir: true },
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

const { checkRpgDeckCreation } = await import('../node_modules/.cache/rpg-deck-creation/rpg-deck-creation-smoke.js');
try {
  await checkRpgDeckCreation(assert);
} finally {
  dom.window.close();
}

console.log('✓ Création de deck : seuil assistée/manuelle, assistant invite de texte (IA) → couleurs → style (aggro, contrôle, mix) avec génération dans la collection, atelier manuel minimaliste et enregistrement');
