// Vérifie qu'aucune carte morte ne reste sur le champ de bataille du Sablier
// du temps : duels entiers joués par un pilote automatique, relance de partie
// pendant le tour du sorcier, et retour d'arrière-plan avec minuteries perdues.
//
//   npm run check:rpg-ghosts          # les graines par défaut
//   node scripts/rpg-ghost-check.mjs 7 12 30
//   RPG_FUZZ_TRACE=1 node scripts/rpg-ghost-check.mjs 5
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Sonde de test : la page expose l'état du moteur pour que les invariants
// comparent la table affichée et la vérité du duel. Le jeu n'est pas modifié,
// l'ajout n'existe que dans ce build de test.
const sonde = {
  name: 'rpg-duel-probe',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('RpgDuelPage.jsx')) return null;
    const ancre = '  const duel = duelRef.current;';
    if (!code.includes(ancre)) throw new Error('ancre de sonde introuvable dans RpgDuelPage.jsx');
    return code.replace(ancre, `${ancre}\n  if (typeof window !== 'undefined') window.__RPG_DUEL__ = duel;`);
  },
};

const graines = process.argv.slice(2).map(Number).filter((valeur) => Number.isFinite(valeur));

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  plugins: [sonde],
  build: { ssr: 'scripts/rpg-ghost-smoke.jsx', outDir: 'node_modules/.cache/rpg-ghost', emptyOutDir: true },
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
  const { checkRpgGhosts } = await import('../node_modules/.cache/rpg-ghost/rpg-ghost-smoke.js');
  await checkRpgGhosts(assert, graines.length ? { graines } : {});
  console.log('✓ Aucune carte morte ne reste sur la table (duels, relance, retour de veille)');
} finally {
  dom.window.close();
}
