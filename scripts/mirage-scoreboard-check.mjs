import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// jsdom n'a pas de WebGL : le moteur 3D est remplacé par un double qui n'affiche rien et laisse
// le test franchir la ligne d'arrivée (voir scripts/mirage-world-stub.jsx).
const worldStub = fileURLToPath(new URL('./mirage-world-stub.jsx', import.meta.url));
// `build()` (contrairement à la CLI des autres checks, lancée dans un processus enfant) fixe
// NODE_ENV=production dans CE processus : React chargerait alors sa version de production, sans
// `act`. On restaure la valeur d'origine avant d'importer le bundle.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  resolve: { alias: [{ find: /^\.\/MirageWorld$/, replacement: worldStub }] },
  build: { ssr: 'scripts/mirage-scoreboard-smoke.jsx', outDir: 'node_modules/.cache/mirage-scoreboard', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkMirageScoreboard } = await import('../node_modules/.cache/mirage-scoreboard/mirage-scoreboard-smoke.js');
try {
  await checkMirageScoreboard(assert);
} finally {
  dom.window.close();
}
console.log('check:mirage-scoreboard ✓ — tableau des positions de fin de course : composant (ordre, médailles, ligne TOI, temps / retards / distance restante, colonne des points, hors ligne, fantôme de défi) ; Duel (overlay d’arrivée classé, victoire et défaite, lien de défi) ; Coupe (son écran d’arrivée reste seul, sans le tableau du duel) ; En ligne (fenêtre de résultats, classement provisoire puis final en direct, focus et Échap, même classement dans le salon, sortie du salon).');
// Les salons locaux ouvrent un BroadcastChannel (comme le ferait un second onglet) qui garderait le processus en vie.
process.exit(0);
