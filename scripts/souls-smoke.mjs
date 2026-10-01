// ════════════════════════════════════════════════════════════════════
// Smoke « La Cendre » : exécute makeWorld() pour de vrai (modèles,
// collisions, animation, post-traitement) avec un WebGLRenderer factice,
// pompe la boucle animate, et échoue si une frame lève une exception
// ou si la première frame (callbacks.ready) n'est jamais atteinte.
//   node scripts/souls-smoke.mjs
// ════════════════════════════════════════════════════════════════════
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── WebGLRenderer factice : assez d'API pour composer/PMREM/passe
// (aucun appel GPU réel — render() ne fait rien) ────────────────────
const ctxStub = {
  canvas: { width: 1, height: 1 },
  getExtension: () => null,
  getParameter: () => 0,
  isContextLost: () => false,
  drawingBufferWidth: 1,
  drawingBufferHeight: 1,
};

class FakeWebGLRenderer {
  constructor(opts = {}) {
    this.domElement = {
      style: {}, width: 1280, height: 720, className: '',
      setAttribute() {}, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      requestPointerLock() {}, remove() {},
      getContext: () => null,
    };
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true };
    this.info = { render: { calls: 0, triangles: 0, frame: 0 }, memory: { geometries: 0, textures: 0 } };
    this.capabilities = {
      isWebGL2: true, precision: 'highp', maxTextures: 16,
      maxCubemapSize: 16384, maxTextureSize: 16384, maxSamples: 4,
      uvAxes: [0, 1, 0], inversePixelRatio: 1, pixelRatio: 1,
      getMaxAnisotropy: () => 4,
      getPrecision: () => ({ precision: 'highp', maxAnisotropy: 4, maxSamples: 4 }),
      extensions: { get: () => null },
    };
    this.extensions = { has: () => false, get: () => null, init: () => {} };
    this.state = {
      buffers: {
        color: { setMask() {}, setClear() {}, setLocked() {} },
        depth: {
          getReversed: () => false,
          setTest() {}, setWrite() {}, setFunc() {}, setClear() {},
          setLocked() {}, init() {}, setFlipSided() {},
        },
        stencil: { setTest() {}, setWrite() {}, setFunc() {}, setLocked() {} },
      },
    };
    this.autoClear = true;
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.outputColorSpace = 'srgb';
    this.debug = { checkShaderErrors: true };
    this.xr = { enabled: false };
    this._ratio = opts.pixelRatio || 1;
    this._size = { width: 1, height: 1 };
    this._rt = null;
  }
  getContext() { return ctxStub; }
  setPixelRatio(r) { this._ratio = r; }
  getPixelRatio() { return this._ratio; }
  setSize(w, h) { this._size.width = w; this._size.height = h; }
  getSize(t) { t.width = this._size.width; t.height = this._size.height; return t; }
  setRenderTarget(rt) { this._rt = rt; }
  getRenderTarget() { return this._rt; }
  getActiveCubeFace() { return 0; }
  getActiveMipmapLevel() { return 0; }
  getClearColor(t) { return t.setRGB(0, 0, 0); }
  getClearAlpha() { return 1; }
  setClearColor() {}
  setClearAlpha() {}
  clear() {}
  render() {}
  compile() {}
  compileAsync() { return Promise.resolve(); }
  resetState() {}
  dispose() {}
}

globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

const server = await createServer({
  root,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } },
  plugins: [
    {
      name: 'fake-webgl-renderer',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('SoulsWorld')) {
          return {
            code: code
              .replaceAll(
                'new THREE.WebGLRenderer(',
                'new (globalThis.__FakeWebGLRenderer)(',
              )
              // Expose makeWorld au banc de test (module privé sinon).
              .concat('\nexport { makeWorld };\n'),
            map: null,
          };
        }
      },
    },
    {
      name: 'propre-pas-de-hmr',
      configureServer(c) { c.middlewares.use((_req, res, next) => next()); },
    },
  ],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/souls-smoke-entry.jsx');
} catch (e) {
  console.error('SMOKE FAILED (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
