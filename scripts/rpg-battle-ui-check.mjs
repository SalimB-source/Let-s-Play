import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface du prototype RPG : la page est construite puis
// rendue dans jsdom, où l'on ouvre le combat, joue un coup et répond à un
// télégraphe. `pretendToBeVisual` est indispensable : le minuteur de réaction
// utilise requestAnimationFrame.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-battle-smoke.jsx', outDir: 'node_modules/.cache/rpg-battle', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/veilleurs-dahaggar',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkRpgBattle } = await import('../node_modules/.cache/rpg-battle/rpg-battle-smoke.js');
try {
  await checkRpgBattle(assert);
} finally {
  dom.window.close();
}
console.log(
  'check:rpg-ui ✓ — écran de combat : les trois difficultés (de l’information, pas des réflexes), '
  + 'ouverture du combat (4 compagnons avec portrait peint, étages, segments de Nom, sable au sol, Astrolabe, ordre des tours en visages), '
  + 'intention annoncée sur chaque ennemi avec portrait, aucune option de parade ni d’esquive, coup joué et tracé au journal, '
  + 'les cinq réponses proposées (garde, barrage, récolte, souffle, reposition), première vague gagnée en jouant '
  + 'pour de vrai, palier suivant enchaîné et permutation avec la réserve présente.',
);
process.exit(0);
