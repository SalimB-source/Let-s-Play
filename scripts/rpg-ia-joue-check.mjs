// Vérification du tour de l'IA du Sablier — le sorcier doit réellement jouer
// après la fin de tour du joueur. Deux angles :
//   1. le scénario jsdom rend la table, le joueur rend la main, et l'on attend
//      une action du sorcier dans le journal ;
//   2. le source : les refs du journal des blessures vivent dans `RpgDuelPage`,
//      au même endroit que `animerModificationsChamp` qui les lit — une ref
//      restée dans un composant frère lève un `ReferenceError` silencieux au
//      premier geste animé et fige la chaîne du tour adverse.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-ia-joue-smoke.jsx', outDir: 'node_modules/.cache/rpg-ia-joue', emptyOutDir: true },
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
  const { checkRpgIaJoue } = await import('../node_modules/.cache/rpg-ia-joue/rpg-ia-joue-smoke.js');
  await checkRpgIaJoue(assert);
} finally {
  dom.window.close();
}

// ── Le source : la ref lue par l'animation est déclarée dans la page ────────
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const indexPage = page.indexOf('export default function RpgDuelPage');
const indexComposantSfx = page.indexOf('function SfxReactifsDuel');
const indexDeclaration = page.indexOf('const journalBlessuresRef = useRef(');
const indexLecture = page.indexOf('journalBlessuresRef.current.duel === duel');

assert.ok(indexPage >= 0, 'la page du duel existe');
assert.ok(indexComposantSfx >= 0 && indexComposantSfx < indexPage, 'le composant des sons précède la page');
assert.ok(indexDeclaration > indexPage,
  'la ref du journal des blessures est déclarée dans RpgDuelPage — la laisser dans SfxReactifsDuel casse le tour du sorcier');
assert.ok(indexLecture > indexDeclaration,
  'l’animation des blessures lit la ref après sa déclaration');

console.log('check:rpg-ia-joue ✓ le sorcier joue après la fin de tour, et sa chaîne ne casse plus');
