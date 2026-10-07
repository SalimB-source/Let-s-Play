// `npm run check:city-rush-bazooka` — simulation réelle avec un faux
// WebGLRenderer : deux entrepôts par course (30 % puis 65 %) ramassés sur Vice
// City, deux hangars vérifiés sur les **huit cartes** (reflétés hors de la
// chaussée en conduite à gauche), projectile droit et reset d’inventaire.
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
  setPixelRatio(ratio) { this._ratio = ratio; }
  getPixelRatio() { return this._ratio; }
  setSize(width, height) { this._size.width = width; this._size.height = height; }
  getSize(target) { target.width = this._size.width; target.height = this._size.height; return target; }
  setClearColor() {}
  clear() {}
  render(scene, camera) {
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
  plugins: [{
    name: 'vice-city-bazooka-fake-webgl',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('ViceCityWorld')) {
        return { code: code.replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)('), map: null };
      }
      if (id.includes('cityRushRules')) {
        const anchor = '  collision: 1, // choc contre une voiture : un carré pour le pilote';
        if (!code.includes(anchor)) throw new Error('ancre du harnais collision introuvable dans cityRushRules');
        return {
          code: code.replace(anchor, '  collision: 0, // test bazooka : collision sans dégât de coque')
            .replace("'suv-collision': 2,", "'suv-collision': 0,"),
          map: null,
        };
      }
      return undefined;
    },
  }],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-bazooka-entry.jsx');
} catch (error) {
  console.error('VÉRIF BAZOOKA ÉCHOUÉE :');
  console.error(error);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
