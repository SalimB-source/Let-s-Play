import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-story-narrative-smoke.jsx', outDir: 'node_modules/.cache/rpg-story-narrative', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkRpgStoryNarrative, checkRpgStoryPoses, checkRpgStoryStorageDenied } = await import('../node_modules/.cache/rpg-story-narrative/rpg-story-narrative-smoke.js');
  await checkRpgStoryNarrative(assert);
  await checkRpgStoryStorageDenied(assert);
  await checkRpgStoryPoses(assert);
} finally {
  dom.window.close();
}
console.log('✓ La Dernière Liste : scènes, vraie victoire/défaite, migration, reprise, choix, épilogue, journal sans effet, portraits canoniques et stockage refusé');
console.log('✓ La Dernière Liste : les poses alternatives suivent la situation (référence en cours de scène, garde avant le duel, décision posée au lecteur, détente après) et retombent proprement');
