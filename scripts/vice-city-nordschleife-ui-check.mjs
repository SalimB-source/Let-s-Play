/**
 * `npm run check:city-rush-nordschleife`
 *
 * Le Nürburgring Nordschleife est le huitième parcours de Vice City Rush et le
 * seul circuit permanent : piste étroite (9,20 m) à sens unique, aucun véhicule
 * en face, relief et tracé réels du Ring. Comme le parcours mexicain, il a
 * besoin de deux filets :
 *   • `npm run check:city-rush-smoke` joue une course complète sur les huit
 *     parcours (villes ET routes) — c'est lui attrape un plantage du décor ;
 *   • ce contrôle regarde l'interface : la carte du Ring est proposée et
 *     débloquée après la campagne mexicaine, sa miniature existe sur le disque
 *     et pointe dessus, la plaque de route annonce les 20 832 km en sens
 *     horaire, le garage annonce le circuit, et le départ lance le monde sur
 *     `nordschleife` sans afficher d'erreur moteur.
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
    name: 'vice-city-nordschleife-ui-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-nordschleife-ui-smoke.jsx', outDir: 'node_modules/.cache/vice-city-nordschleife-ui', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

// La miniature affichée doit être un fichier réel du dépôt : une image absente
// laisse la carte du parcours sur son cadre vide.
const thumb = path.join(root, 'public', 'nordschleife-thumb.jpg');
assert.ok(existsSync(thumb), 'public/nordschleife-thumb.jpg est livré au dépôt');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityNordschleifeUi } = await import(
  path.join(root, 'node_modules/.cache/vice-city-nordschleife-ui/vice-city-nordschleife-ui-smoke.js')
);
let code = 0;
try {
  await checkViceCityNordschleifeUi(assert);
  console.log('check:city-rush-nordschleife ✓ — le circuit NÜRBURGRING NORDSCHLEIFE est proposé et débloqué, sa miniature est celle du fichier livré, la plaque annonce 20 832 km en sens horaire, le garage annonce le Ring et le départ lance le monde sur nordschleife sans erreur moteur.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
