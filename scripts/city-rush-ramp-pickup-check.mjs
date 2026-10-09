// ════════════════════════════════════════════════════════════════════
// Vérif de Vice City Rush : le fusil à pompe bleu n'est posé que sur les
// tremplins, en course, et se ramasse en franchissant son tremplin. Sprint,
// course sans armes et tutoriel n'en reçoivent aucun. Le monde est construit
// pour de vrai avec un faux WebGLRenderer.
// Comme le lanceur des armes, ce harnais neutralise le carré que le pilote perd
// au carambolage (ancre `collision: 1` dans `cityRushRules.js`), pour que le
// pilote d'essai aille au bout de chaque course.
//   node scripts/city-rush-ramp-pickup-check.mjs            (vice-city)
//   node scripts/city-rush-ramp-pickup-check.mjs --all      (5 villes)
// ════════════════════════════════════════════════════════════════════
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
    this._ratio = opts.pixelRatio || 1;
    this._size = { width: 1, height: 1 };
    this.renderCalls = 0;
  }
  getContext() { return ctxStub; }
  setPixelRatio(r) { this._ratio = r; }
  getPixelRatio() { return this._ratio; }
  setSize(w, h) { this._size.width = w; this._size.height = h; }
  getSize(t) { t.width = this._size.width; t.height = this._size.height; return t; }
  setClearColor() {}
  clear() {}
  render(scene, camera) {
    // Pas de GPU : on met tout de même à jour les matrices monde comme le
    // ferait un vrai rendu, pour que getWorldPosition() des bonus soit juste.
    this.renderCalls += 1;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
  }
  compile() {}
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
        if (id.includes('ViceCityWorld')) {
          return {
            code: code.replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)('),
            map: null,
          };
        }
        // Le pilote d'essai percute le trafic et la police pendant six tours :
        // le carré du carambolage est neutralisé pour qu'il aille au bout de la
        // course (voir l'en-tête du lanceur).
        if (id.includes('cityRushRules')) {
          const anchor = '  collision: 1, // choc contre une voiture : un carré pour le pilote';
          if (!code.includes(anchor)) {
            throw new Error('ancre du carambolage introuvable dans cityRushRules — mettre à jour le lanceur city-rush-ramp-pickup-check.mjs');
          }
          return {
            code: code.replace(anchor, '  collision: 0, // harnais : carré du carambolage neutralisé')
              .replace("'suv-collision': 2,", "'suv-collision': 0,"),
            map: null,
          };
        }
        return undefined;
      },
    },
  ],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-ramp-pickup-entry.jsx');
} catch (e) {
  console.error('VÉRIF BLEU SUR TREMPLINS ÉCHOUÉE :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
