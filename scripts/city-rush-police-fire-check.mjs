// Lanceur de la vérif « la police tire sur les pilotes » : charge le vrai monde
// three.js avec un WebGLRenderer factice et joue des courses en mode Poursuite
// (escouade en piste dès le départ) avec un pilote qui ne se décale jamais.
//   node scripts/city-rush-police-fire-check.mjs            (une ville, 3 courses)
//   node scripts/city-rush-police-fire-check.mjs --all      (les cinq villes)
//   node scripts/city-rush-police-fire-check.mjs --runs=2   (deux courses par ville)
// Le hasard est figé : une course rejouée reste identique. Le lanceur arme
// uniquement les berlines du module chargé par ce smoke (chargeur de sept
// balles au départ), pour que la ligne de tir soit éprouvée sans dépendre de la
// trouvaille d'un bonus rouge : les règles du jeu, elles, les font entrer sans
// charge (`CITY_RUSH_POLICE_START_CHARGES`).
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
            code: code
              .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
              // Précondition de test : l'escouade entre armée, pour vérifier la
              // ligne de tir et la mire sans attendre qu'une berline rafle un
              // bonus rouge (8 % des objets, et le hasard décide).
              // (sept balles, comme `CITY_RUSH_PISTOL_AMMO_PER_PICKUP`).
              .replaceAll('createCityRushPoliceInventory()', '({ pistol: 7 })'),
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
  await server.ssrLoadModule('/scripts/city-rush-police-fire-entry.jsx');
} catch (e) {
  console.error('VÉRIF TIR POLICE ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
