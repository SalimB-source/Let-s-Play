import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Plein écran du Sablier : la page réelle montée dans jsdom (menu, mode
// Histoire, duel) avec une Fullscreen API de remplacement, plus la lecture des
// sources pour les règles qui ne se jouent pas dans un rendu.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/rpg-fullscreen', emptyOutDir: true },
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

const { checkRpgFullscreen } = await import('../node_modules/.cache/rpg-fullscreen/rpg-fullscreen-smoke.js');
try {
  await checkRpgFullscreen(assert);
} finally {
  dom.window.close();
}

// ── La page ne force le plein écran qu’au doigt, dans le geste du lancement ─
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(page, /entrerPleinEcran\(\{ pinned: true, native: false \}\)/,
  'aucune couche immersive n’est posée automatiquement au montage');
assert.doesNotMatch(page, /addEventListener\('pointerdown', upgrade/,
  'un toucher ordinaire ne déclenche pas le plein écran natif');
assert.match(page, /const demanderPleinEcranEtPaysage = \(\) => \{\s*\n\s*const veutPaysage = Boolean\(window\.LetsPlayAndroid\)\s*\n\s*\|\| Boolean\(window\.matchMedia\?\.\('\(pointer: coarse\)'\)\.matches\);\s*\n\s*if \(veutPaysage\) entrerPleinEcran\(\);\s*\n\s*landscapeRef\.current\?\.enter\(\{ fullscreen: false \}\);/,
  'au doigt, lancer une partie demande le plein écran natif dans le geste puis verrouille le paysage ; sur ordinateur, rien');
assert.match(page, /onToggleFullscreen=\{basculerPleinEcran\}/,
  'le bouton laisse le plein écran disponible sur demande explicite');
console.log('check:rpg-fullscreen ✓ — le Sablier s’ouvre dans la page ; au doigt, le lancement demande le plein écran natif puis le paysage ; le bouton explicite reste disponible.');
process.exit(0);
