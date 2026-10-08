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
  'check:rpg-ui ✓ — nouvelle partie : duel de sorciers sur la table en bois, table vide au départ et 5 cartes piochées en images 4:5, '
  + 'joueur à 50 PV face au sorcier à 60 (puissance 2), créature posée en payant le sable, mal d’invocation expliqué, '
  + 'tour du sorcier adverse joué tout seul (il pose ses cartes), mur de créatures qui bloque la frappe directe, '
  + 'et créature prête (liseré doré) au tour suivant.',
);
process.exit(0);
