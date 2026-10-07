// Lanceur de la vérif « les rivaux aussi sont pourchassés » : charge le vrai
// monde three.js avec un WebGLRenderer factice et joue des courses **Circuit**
// complètes (l'escouade entre au dernier tour du joueur) avec un pilote qui
// garde sa voie.
//   node scripts/city-rush-rival-police-check.mjs                (une ville, 2 courses)
//   node scripts/city-rush-rival-police-check.mjs --all          (tous les parcours)
//   node scripts/city-rush-rival-police-check.mjs --runs=2       (deux courses par ville)
//   node scripts/city-rush-rival-police-check.mjs --leader-only  (motif du premier)
//   node scripts/city-rush-rival-police-check.mjs --pursuit      (police dès le départ)
// Le hasard est figé : une course rejouée reste identique. En mode normal, le
// lanceur ne touche à rien : les deux motifs de poursuite arrivent d'eux-mêmes
// (carambolage d'un rival avec une berline, et tête de course au dernier tour).
// `--leader-only` retire les berlines de police du **flot** (précondition de
// test) pour mesurer le seul déclencheur « premier du dernier tour » : un rival
// ne peut alors ouvrir son dossier que par cette règle ou par un carambolage
// avec l'escouade, au dernier tour.
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
    // Pas de GPU, mais les matrices monde sont mises à jour comme au vrai rendu.
    this.renderCalls += 1;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
  }
  compile() {}
  dispose() {}
}

globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

const LEADER_ONLY = process.argv.includes('--leader-only')
  || process.env.CITY_RUSH_RIVAL_POLICE_LEADER_ONLY === '1';

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
          let out = code
            .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(');
          if (LEADER_ONLY) {
            out = out.replace(
              ': allowedTrafficTypes;',
              ': (nonPoliceTrafficTypes.length ? nonPoliceTrafficTypes : allowedTrafficTypes);',
            );
          }
          return { code: out, map: null };
        }
        return undefined;
      },
    },
  ],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-rival-police-entry.jsx');
} catch (e) {
  console.error('VÉRIF POURSUITE DES RIVAUX ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
