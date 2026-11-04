/**
 * Vérifie « RENDU : CINÉMA » de Vice City Rush — côté interface **et** côté
 * moteur, sans GPU.
 *
 * 1. interface (jsdom, moteur 3D doublé comme les autres fumées) : l'entrée
 *    RENDU de l'écran-titre, la touche V, l'écran de pause, la préférence gardée
 *    sur l'appareil, la valeur transmise au monde, et l'aveu de la qualité
 *    allégée (`window.LetsPlayAndroid` → « NON DISPO ICI ») ;
 * 2. chaîne réelle (vraies passes three.js, renderer factice) : la scène passe
 *    par la cible, le halo et la sortie — et le rétroviseur du cockpit, rendu
 *    dans sa propre cible, ne détourne pas le reste de l'image ;
 * 3. course complète en cinéma : le vrai `createCityRushWorld` se construit et
 *    dessine ses images par la chaîne ; passer à STANDARD en pleine course la
 *    démonte ; la qualité allégée refuse le cinéma.
 *
 * `new THREE.WebGLRenderer(` est réécrit à la volée dans `ViceCityWorld.jsx`
 * (comme `city-rush-smoke.mjs`) : un module ESM ne se réécrit pas de
 * l'extérieur.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build, createServer } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// ── 1. Interface dans jsdom ────────────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'city-rush-graphics-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: {
    ssr: 'scripts/city-rush-graphics-ui-smoke.jsx',
    outDir: 'node_modules/.cache/city-rush-graphics-ui',
    emptyOutDir: true,
  },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/vice-city-rush',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let exitCode = 0;
try {
  const { checkCityRushGraphicsUi } = await import('../node_modules/.cache/city-rush-graphics-ui/city-rush-graphics-ui-smoke.js');
  await checkCityRushGraphicsUi(assert);
  console.log('check:city-rush-graphics (interface) ✓ — RENDU passe de STANDARD à CINÉMA à l’écran-titre (entrée et touche V) et sur l’écran de pause, le choix est gardé sur l’appareil et transmis au monde ; la qualité allégée l’annonce « NON DISPO ICI » sans effacer le choix.');
} catch (error) {
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  dom.window.close();
}

// ── 2 et 3. La chaîne réelle et une course, avec un renderer factice ───────
// Le faux renderer est posé sur `globalThis` avant le chargement du monde ; le
// transform ci-dessous remplace `new THREE.WebGLRenderer(` par son
// constructeur, et chaque passe est consignée dans `__fakeRendererCalls`.
globalThis.__fakeRendererCalls = [];

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
    // Une carte récente : cible flottante disponible → chaîne en HDR.
    this.extensions = {
      has: (name) => name === 'EXT_color_buffer_half_float' || name === 'EXT_color_buffer_float',
      get: () => null,
      init: () => {},
    };
    this.autoClear = true;
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.outputColorSpace = 'srgb';
    this.xr = { enabled: false };
    this.state = { buffers: { stencil: { setFunc() {}, setTest() {} } } };
    this._ratio = 1;
    this._size = { width: 1280, height: 720 };
    this._target = null;
  }
  getContext() { return { canvas: { width: 1, height: 1 } }; }
  setPixelRatio(ratio) { this._ratio = ratio; }
  getPixelRatio() { return this._ratio; }
  setSize(width, height) { this._size = { width, height }; }
  getSize(vector) { vector.width = this._size.width; vector.height = this._size.height; return vector; }
  getRenderTarget() { return this._target; }
  setRenderTarget(target) {
    this._target = target || null;
    globalThis.__fakeRendererCalls.push({ kind: 'target', target: this._target });
  }
  getClearColor(color) { return color; }
  getClearAlpha() { return 1; }
  setClearColor() {}
  setClearAlpha() {}
  clear() {}
  compile() {}
  dispose() {}
  render(scene, camera) {
    globalThis.__fakeRendererCalls.push({
      kind: 'render',
      scene,
      camera,
      target: this._target,
      targetName: this._target?.texture?.name || null,
      exposure: this.toneMappingExposure,
    });
    // Pas de GPU : on met tout de même les matrices monde à jour, comme le
    // ferait un vrai rendu (les voitures s'en servent).
    scene?.updateMatrixWorld?.();
    camera?.updateMatrixWorld?.();
  }
}
globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

// La boucle de la course se pompe à la main : `requestAnimationFrame` capture
// la fonction `update`, et le harnais l'appelle avec des horodatages croissants.
globalThis.__cityRushRaf = null;
globalThis.requestAnimationFrame = (callback) => { globalThis.__cityRushRaf = callback; return 1; };
globalThis.cancelAnimationFrame = () => {};

if (exitCode === 0) {
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
  try {
    await server.ssrLoadModule('/scripts/city-rush-graphics-engine-check.jsx');
  } catch (error) {
    console.error('check:city-rush-graphics (moteur) ✗');
    console.error(error?.stack || error?.message || error);
    exitCode = 1;
  } finally {
    await server.close();
  }
  if (exitCode === 0) {
    console.log('check:city-rush-graphics (moteur) ✓ — en CINÉMA la scène passe par la cible du composer et la chaîne finit dans l’écran, le rétroviseur du cockpit ne vole pas la cible, le passage à STANDARD en pleine course démonte la chaîne, et la qualité allégée refuse le cinéma.');
  }
}

process.exit(exitCode);
