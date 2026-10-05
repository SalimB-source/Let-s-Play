/**
 * `npm run check:city-rush-mexico`
 *
 * Le parcours mexicain de Vice City Rush — CARRETERA DEL SOL, la route de
 * campagne entre Zacatecas et San Luis Potosí — est le dernier de la carrière
 * et le seul à avoir un décor de plein jour (ranchos, agaves, chapelle). Il
 * était le seul parcours qu'aucune vérification ne construisait : la chapelle
 * de son repère appelait `addTree` avec un argument de trop, et la course
 * plantait à la construction du monde (« random is not a function ») sans que
 * rien ne le signale.
 *
 * Deux filets recouvrent maintenant ce parcours :
 *   • `npm run check:city-rush-smoke` joue une course complète sur les huit
 *     parcours (villes ET routes) — c'est lui attrape le plantage du décor ;
 *   • ce contrôle regarde l'interface : la carte du Mexique est proposée,
 *     débloquée, sa miniature existe sur le disque et pointe dessus, le garage
 *     annonce bien la CARRETERA FEDERAL 45, et le départ lance le monde sur le
 *     bon parcours sans afficher d'erreur moteur.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : le moteur 3D est remplacé par une doublure qui
// garde les props de la page. La page, elle, est la vraie.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-mexico-ui-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-mexico-ui-smoke.jsx', outDir: 'node_modules/.cache/vice-city-mexico-ui', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

// La miniature affichée doit être un fichier réel du dépôt : une image absente
// laisse la carte du parcours sur son cadre vide.
const thumb = path.join(root, 'public', 'mexico-countryside-thumb.jpg');
assert.ok(existsSync(thumb), 'public/mexico-countryside-thumb.jpg est livré au dépôt');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityMexicoUi } = await import(
  path.join(root, 'node_modules/.cache/vice-city-mexico-ui/vice-city-mexico-ui-smoke.js')
);
let code = 0;
try {
  await checkViceCityMexicoUi(assert);
  console.log('check:city-rush-mexico ✓ — le parcours CARRETERA DEL SOL est proposé et débloqué, sa miniature est celle du fichier livré, le garage annonce la CARRETERA FEDERAL 45 et le départ lance le monde sur mexico-countryside sans erreur moteur.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
