/**
 * L'essai **WebGPU** se juge sur une seule question, et elle se répond sans
 * carte graphique : la scène contient-elle encore du **GLSL d'auteur** ?
 * `npm run check:city-rush-webgpu`.
 *
 * three.js compile la scène en WGSL pour le backend WebGPU. Les matériaux de
 * bibliothèque (Standard, Lambert, Phong, Basic, Points, Line, Sprite) sont
 * convertis — les quelques variantes qu'il ne sait pas traduire sont signalées
 * par un `console.error` du type « Material … is not compatible ». Un
 * `ShaderMaterial` écrit à la main, lui, n'a pas d'équivalent : il tombe en
 * matériau vide, et l'objet disparaît de l'image.
 *
 * On construit donc une course **par parcours**, avec un renderer marqué WebGPU
 * (aucun GPU n'est ouvert : le renderer est factice), et l'on inspecte tout ce
 * que la scène demanderait de compiler :
 *
 *   1. le ciel est le dôme **peint**, pas le dôme de shader ;
 *   2. aucun `ShaderMaterial` ni `RawShaderMaterial` ne subsiste ;
 *   3. chaque type de matériau présent fait partie de ceux que three.js traduit,
 *      et le compte est publié pour qu'on voie ce qui reste à couvrir.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Le renderer factice, marqué WebGPU ─────────────────────────────────────
// Il ne dessine pas : le monde ne fait que poser sa scène et l'interroger. Le
// drapeau `isCityRushWebGpu` est ce que le monde lit pour choisir le ciel peint.
class FakeWebGLRenderer {
  constructor() {
    this.domElement = {
      style: {}, width: 1280, height: 720, className: '',
      setAttribute() {}, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      setPointerCapture() {}, remove() {},
      getContext: () => null,
    };
    this.isCityRushWebGpu = true;
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true };
    this.info = { render: { calls: 0, triangles: 0, frame: 0 }, memory: { geometries: 0, textures: 0 } };
    this.capabilities = {
      isWebGL2: false, precision: 'highp', maxTextures: 16,
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
  }
  getContext() { return { canvas: { width: 1, height: 1 } }; }
  setPixelRatio(ratio) { this._ratio = ratio; }
  getPixelRatio() { return this._ratio; }
  setSize() {}
  getSize(vector) { vector.width = 1280; vector.height = 720; return vector; }
  getRenderTarget() { return null; }
  setRenderTarget() {}
  getClearColor(color) { return color; }
  getClearAlpha() { return 1; }
  setClearColor() {}
  setClearAlpha() {}
  clear() {}
  compile() {}
  dispose() {}
  setAnimationLoop() {}
  render(scene, camera) {
    scene?.updateMatrixWorld?.();
    camera?.updateMatrixWorld?.();
    globalThis.__smokeCamera = camera;
  }
}
globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

// ── Le DOM minimal d'un onglet de jeu ─────────────────────────────────────
globalThis.__cityRushFrame = null;
globalThis.requestAnimationFrame = (callback) => { globalThis.__cityRushFrame = callback; return 1; };
globalThis.cancelAnimationFrame = () => {};

const gradient = { addColorStop() {} };
const ctx2d = () => new Proxy({}, {
  get: (_target, key) => {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'getImageData') return (x, y, width, height) => ({ data: new Uint8ClampedArray(Math.max(1, width * height) * 4) });
    if (key === 'createImageData') return (width, height) => ({ data: new Uint8ClampedArray(Math.max(1, width * height) * 4), width, height });
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
  await server.ssrLoadModule('/scripts/city-rush-webgpu-entry.jsx');
} catch (error) {
  console.error('check:city-rush-webgpu ✗');
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  await server.close();
}
process.exit(exitCode);
