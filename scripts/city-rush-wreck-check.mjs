// Lanceur du smoke coque/police : charge le vrai monde three.js avec un
// WebGLRenderer factice, joue le **vrai barème du carambolage** (un carré pour
// le pilote, un point pour la berline percutée, répit partagé entre deux
// carrés) et vérifie l'animation d'épave quand la coque tombe à zéro.
//   node scripts/city-rush-wreck-check.mjs            (une ville)
//   node scripts/city-rush-wreck-check.mjs --all      (les cinq villes)
//   node scripts/city-rush-wreck-check.mjs --runs=5   (cinq courses par ville)
// Le pilote d'essai démarre avec trois cellules (maxHealth reste 15) : assez
// pour enchaîner deux carambolages espacés par le répit avant l'épave, assez
// peu pour l'atteindre en une trentaine de secondes. La barre pleine est
// couverte par les tests de règles et le smoke de course.
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
            // Précondition de test : trois cellules restantes pour vérifier le
            // barème du carambolage (deux carrés espacés par le répit au moins)
            // puis l'épave rapidement. Le plafond affiché reste quinze, et les
            // autres tests valident le démarrage plein et le retrait d'une
            // cellule par tir.
            code: code
              .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
              .replaceAll('playerHealth = CITY_RUSH_PLAYER_HEALTH;', 'playerHealth = 3;'),
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
  await server.ssrLoadModule('/scripts/city-rush-wreck-entry.jsx');
} catch (e) {
  console.error('VÉRIF ÉPAVE ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
