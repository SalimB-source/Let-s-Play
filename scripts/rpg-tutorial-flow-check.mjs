import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-tutorial-smoke.jsx', outDir: 'node_modules/.cache/rpg-tutorial', emptyOutDir: true },
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
// jsdom n’a pas de périphérique audio ; le parcours teste les gestes du duel.
for (const methode of ['play', 'pause', 'load']) {
  dom.window.HTMLMediaElement.prototype[methode] = () => methode === 'play' ? Promise.resolve() : undefined;
}

try {
  const {
    checkRpgTutorial,
    checkRpgTutorialCombat,
    checkRpgTutorialEau,
    checkRpgTutorialAutresLecons,
    checkRpgCardGuide,
  } = await import('../node_modules/.cache/rpg-tutorial/rpg-tutorial-smoke.js');
  await checkRpgTutorial(assert);
  await checkRpgTutorialCombat(assert);
  await checkRpgTutorialEau(assert);
  await checkRpgTutorialAutresLecons(assert);
  await checkRpgCardGuide(assert);
} finally {
  dom.window.close();
}

console.log('✓ Tutoriels du Sablier : choix des leçons, parcours complet des 5 leçons, fin de leçon sans laisser la partie ouverte, récompense unique et guide des cartes');
