/**
 * Vérification de l'interface de Vice City Rush — `npm run check:city-rush-ui`.
 *
 * Monte la vraie page (`/jeu/vice-city-rush`) dans jsdom ; seul le moteur 3D est
 * remplacé par une doublure (scripts/city-rush-world-stub.jsx), car jsdom n'a pas
 * de WebGL. Le scénario est dans scripts/city-rush-ui-smoke.jsx : choix de la
 * difficulté des rivaux, mémorisation d'une visite à l'autre, records par ville
 * et par niveau, touche Entrée.
 *
 * Ce contrôle dit que la logique de la page est juste ; il ne dit rien de
 * l'aspect (mise en page, couleurs) : pour cela, ouvrir le jeu dans un vrai
 * navigateur (`npm run dev`).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'city-rush-world-stub.jsx');

// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'city-rush-ui-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/city-rush-ui-smoke.jsx', outDir: 'node_modules/.cache/city-rush-ui', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkCityRushUi } = await import('../node_modules/.cache/city-rush-ui/city-rush-ui-smoke.js');
let summary;
try { summary = await checkCityRushUi(assert); } finally { dom.window.close(); }

// Garde-fou de source : changer de niveau ne doit pas reconstruire la ville (caméra d'accueil
// relancée, ~0,2 s de blocage à chaque clic). Seuls la ville et la voiture la reconstruisent ;
// le niveau passe par `setDifficulty`. La doublure ci-dessus ne peut pas le vérifier.
const worldSource = readFileSync(path.join(root, 'src', 'games', 'ViceCityWorld.jsx'), 'utf8');
const creation = worldSource.slice(worldSource.indexOf('createCityRushWorld(mountRef.current'));
const creationDeps = /\n  \}, \[([^\]]*)\]\);/.exec(creation)?.[1];
assert.ok(creationDeps, 'effet de création du monde introuvable dans ViceCityWorld.jsx');
assert.ok(!/difficulty/i.test(creationDeps), `le monde ne doit pas être reconstruit quand le niveau change (dépendances : ${creationDeps})`);
assert.match(worldSource, /useEffect\(\(\) => \{\s*worldRef\.current\?\.setDifficulty\(difficulty\);\s*\}, \[difficulty\]\);/, 'le niveau doit être appliqué à chaud par setDifficulty');

console.log(`check:city-rush-ui ✓ — ${summary} · le niveau s'applique à chaud, sans reconstruire la ville`);
process.exit(0);
