/**
 * `npm run check:city-rush-touge`
 *
 * Le tōgé du Mont Haruna est le neuvième parcours de Vice City Rush et la
 * seule route de montagne : chaussée étroite (6,40 m) de nuit, huit épingles,
 * aucun bazooka ni mini-garage, dérapage contrôlé. Comme le parcours
 * mexicain et le Ring, il a besoin de deux filets :
 *   • `npm run check:city-rush-smoke` joue une course complète sur les neuf
 *     parcours (villes, routes ET circuits) — c'est lui attrape un plantage
 *     du décor ;
 *   • ce contrôle regarde l'interface : la carte du tōgé est proposée et
 *     débloquée après le Ring, sa miniature existe sur le disque et pointe
 *     dessus, la plaque de route annonce les 13,8 km en descente, le garage
 *     annonce la montagne, et le départ lance le monde sur `touge` sans
 *     afficher d'erreur moteur.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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
    name: 'vice-city-touge-ui-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-touge-ui-smoke.jsx', outDir: 'node_modules/.cache/vice-city-touge-ui', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

// La miniature affichée doit être un fichier réel du dépôt : une image absente
// laisse la carte du parcours sur son cadre vide.
const thumb = path.join(root, 'public', 'touge-thumb.jpg');
assert.ok(existsSync(thumb), 'public/touge-thumb.jpg est livré au dépôt');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityTougeUi } = await import(
  path.join(root, 'node_modules/.cache/vice-city-touge-ui/vice-city-touge-ui-smoke.js')
);
let code = 0;
try {
  await checkViceCityTougeUi(assert);
  console.log('check:city-rush-touge ✓ — la route MONT HARUNA · TŌGE est proposée et débloquée, sa miniature est celle du fichier livré, la plaque annonce 13,8 km en descente limitée à 40 km/h, le garage annonce la montagne et le départ lance le monde sur touge sans erreur moteur.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
