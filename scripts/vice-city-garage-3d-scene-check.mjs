/**
 * `npm run check:city-rush-garage-3d-scene`
 *
 * Vérifie la scène 3D du garage pour de vrai, là où `check:city-rush-garage-3d`
 * ne voit que son repli (jsdom n'a pas de WebGL) : le module `three` est remplacé
 * par une doublure (`scripts/vice-city-garage-3d-three-stub.mjs`) dont le
 * renderer est factice. La scène se construit donc entièrement — cabine, néon,
 * plateau tournant, outillage, voiture modélisée — et chaque image rendue est
 * consignée, ce qui permet d'inspecter la scène et la caméra.
 *
 * L'essentiel porte sur le cadrage : le plateau et la voiture doivent remplir le
 * cadre, sur un écran large comme sur un téléphone, et la caméra doit rester
 * dans la cabine même au recul maximal.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_RECUL_LABEL = 13; // mis en miroir dans le harnais (`MAX_RECUL`)
const stub = path.join(root, 'scripts', 'vice-city-garage-3d-three-stub.mjs');

// `three` pointe sur la doublure : tout three.js réel, sauf le renderer.
// La construction de Vite touche à `NODE_ENV` : on le rend ensuite, sinon les
// imports suivants (React et son `act`) ne résolvent pas la bonne variante.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [
    {
      name: 'vice-city-garage-3d-three-stub',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source !== 'three') return null;
        if (importer && path.resolve(importer) === stub) return null;
        return stub;
      },
    },
  ],
  build: {
    ssr: path.join(root, 'scripts', 'vice-city-garage-3d-scene-smoke.jsx'),
    outDir: 'node_modules/.cache/vice-city-garage-3d-scene',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'vice-city-garage-3d-scene-smoke.js' } },
  },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/vice-city-rush',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.matchMedia = dom.window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
// L'observateur de redimensionnement garde son rappel : le harnais le déclenche
// pour simuler un écran qui change de taille, comme le fait un navigateur.
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    globalThis.__roCallback = this.callback;
  }

  unobserve() {}

  disconnect() {}
}
globalThis.ResizeObserver = FakeResizeObserver;
globalThis.IntersectionObserver = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};
globalThis.__fireResize = () => globalThis.__roCallback?.();

const { checkViceCityGarage3dScene } = await import('../node_modules/.cache/vice-city-garage-3d-scene/vice-city-garage-3d-scene-smoke.js');
let code = 0;
try {
  const info = await checkViceCityGarage3dScene(assert);
  console.log(
    `check:city-rush-garage-3d-scene ✓ — la salle d’exposition se construit sans GPU (${info.mesh} maillages, ${info.images} images) : ` +
    `la ${info.voiture} tourne sur son plateau, le plateau occupe ~92 % de la largeur du cadre et la voiture ` +
    `${(info.partLarge * 100).toFixed(0)} % ; sur un téléphone la caméra recule jusqu'à ${MAX_RECUL_LABEL} m pour qu'une ` +
    `voiture entière passe (${(info.partTelephone * 100).toFixed(0)} % de la largeur) ; changer de voiture remonte la scène ; ` +
    `le cadrage « vitrine » de l'écran-titre dézoome la même salle (voiture à ${(info.partVitrine * 100).toFixed(0)} % du cadre).`,
  );
} catch (error) {
  code = 1;
  console.error(`check:city-rush-garage-3d-scene ✗ — ${error.message}`);
}

process.exit(code);
