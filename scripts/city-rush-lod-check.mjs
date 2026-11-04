/**
 * Vérifie les niveaux de détail de Vice City Rush dans une **vraie course**,
 * avec un renderer factice : `npm run check:city-rush-lod`.
 *
 * Le LOD n'est pas une règle de dessin abstraite — il doit se voir dans la
 * boucle. Pour chaque parcours, on joue une course et on compte ce que la scène
 * demande vraiment au renderer :
 *
 *   - avant l'image, chaque véhicule de trafic est passé en `near` (le cas
 *     historique) et l'on compte ce qu'une image coûterait ;
 *   - on laisse ensuite la boucle choisir les niveaux, et l'on recompte.
 *
 * Les contrôles portent sur ce qui compte :
 *
 *   1. le gain : la même image demande **strictement moins** de maillages
 *      qu'avec le trafic en pleine définition, sur les neuf parcours ;
 *   2. la règle : le véhicule le plus proche du joueur reste en `near`, ceux
 *      qui sont au-delà de la brume sont en `far` — et jamais l'inverse ;
 *   3. rien de ce qui se joue ne bouge : la distance, la voie et la vitesse des
 *      véhicules sont identiques avec et sans LOD à la même image.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Le renderer factice : il ne dessine pas, il compte ─────────────────────
class FakeWebGLRenderer {
  constructor() {
    this.domElement = {
      style: {}, width: 1280, height: 720, className: '',
      setAttribute() {}, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      setPointerCapture() {}, remove() {},
      getContext: () => null,
    };
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true };
    this.info = { render: { calls: 0, triangles: 0, frame: 0 }, memory: { geometries: 0, textures: 0 } };
    this.capabilities = {
      isWebGL2: true, precision: 'highp', maxTextures: 16,
      maxCubemapSize: 16384, maxTextureSize: 16384, maxSamples: 4,
      getMaxAnisotropy: () => 4,
    };
    this.extensions = { has: () => false, get: () => null, init: () => {} };
    this.autoClear = true;
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.outputColorSpace = 'srgb';
    this.xr = { enabled: false };
    this.state = { buffers: { stencil: { setFunc() {}, setTest() {} } } };
    this._ratio = 1;
    this._target = null;
  }
  getContext() { return { canvas: { width: 1, height: 1 } }; }
  setPixelRatio(ratio) { this._ratio = ratio; }
  getPixelRatio() { return this._ratio; }
  setSize() {}
  getSize(vector) { vector.width = 1280; vector.height = 720; return vector; }
  // Ce que le vrai renderer expose et que la boucle de la course interroge :
  // `capabilities.getMaxAnisotropy`, `extensions.get`, `setAnimationLoop`, etc.
  setAnimationLoop() {}
  getRenderTargetValue() { return null; }
  getRenderTarget() { return this._target; }
  setRenderTarget(target) { this._target = target || null; }
  getClearColor(color) { return color; }
  getClearAlpha() { return 1; }
  setClearColor() {}
  setClearAlpha() {}
  clear() {}
  compile() {}
  dispose() {}
  render(scene, camera) {
    // Ce que le GPU devrait dessiner, mesuré comme le ferait `renderer.info`.
    let meshes = 0;
    let triangles = 0;
    scene.traverseVisible((object) => {
      if (!object.isMesh && !object.isSprite && !object.isLine) return;
      meshes += 1;
      const geometry = object.geometry;
      if (geometry?.attributes?.position) {
        const count = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
        triangles += Math.round(count * (object.isInstancedMesh ? object.count : 1));
      }
    });
    globalThis.__lastFrameStats = { meshes, triangles };
    scene?.updateMatrixWorld?.();
    camera?.updateMatrixWorld?.();
    globalThis.__smokeCamera = camera;
  }
}
globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

// ── Le harnais de course ───────────────────────────────────────────────────
globalThis.__cityRushFrame = null;
globalThis.requestAnimationFrame = (callback) => { globalThis.__cityRushFrame = callback; return 1; };
globalThis.cancelAnimationFrame = () => {};

const gradient = { addColorStop() {} };
const ctx2d = () => new Proxy({}, {
  get: (_target, key) => {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'getImageData') return (x, y, width, height) => ({ data: new Uint8ClampedArray(Math.max(1, width * height) * 4) });
    if (key === 'canvas') return { width: 1, height: 1 };
    return () => {};
  },
  set: () => true,
});
const makeCanvas = () => ({
  width: 1, height: 1, style: {},
  getContext: (kind) => (kind === '2d' ? ctx2d() : null),
  addEventListener() {}, removeEventListener() {}, setAttribute() {},
  toDataURL: () => '',
});
globalThis.window = {
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  addEventListener() {}, removeEventListener() {},
  location: { href: 'http://localhost/jeu/vice-city-rush' },
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {} }),
  createElementNS: () => makeCanvas(),
  addEventListener() {}, removeEventListener() {},
  body: { appendChild() {}, removeChild() {} },
  hidden: false,
  visibilityState: 'visible',
};
globalThis.performance = globalThis.performance || { now: () => Date.now() };

// La boucle de la course est pompée à la main (pas de vraie frame sans GPU).
globalThis.__pumpFrames = (count = 1, step = 1 / 30) => {
  let time = performance.now();
  for (let index = 0; index < count; index += 1) {
    time += step * 1000;
    globalThis.__cityRushFrame?.(time);
  }
};

const server = await createServer({
  root,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } },
  plugins: [{
    name: 'fake-webgl-renderer',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('ViceCityWorld')) return undefined;
      return { code: code.replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)('), map: null };
    },
  }],
});

let exitCode = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-lod-check.jsx');
} catch (error) {
  console.error('check:city-rush-lod ✗');
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  await server.close();
}
process.exit(exitCode);
