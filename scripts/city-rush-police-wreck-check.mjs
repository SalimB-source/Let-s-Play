// Lanceur de la vérif « carcasse de berline de police » : charge le vrai monde
// three.js avec un WebGLRenderer factice et joue des courses en mode Poursuite
// (escouade en piste dès le départ) jusqu'à abattre une berline, puis suit son
// agonie image par image : tête-à-queue de deux tours en ralentissant,
// explosion à l'arrêt, carcasse calcinée laissée en piste, en feu.
//   node scripts/city-rush-police-wreck-check.mjs            (une ville)
//   node scripts/city-rush-police-wreck-check.mjs --all      (les cinq villes)
//   node scripts/city-rush-police-wreck-check.mjs --runs=2   (deux courses par ville)
// Le hasard est figé : une course rejouée reste identique. Seule précondition
// de test : le chargeur du pilote est garni au départ, pour que la destruction
// arrive dans chaque ville sans attendre la trouvaille d'un bonus rouge (5 %
// des objets, et le hasard décide). Les règles du jeu, elles, le font partir
// sans arme (`CITY_RUSH_POLICE_START_CHARGES` vaut aussi pour le pilote).
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
            // Précondition de test : le chargeur du pilote d'essai est garni
            // (70 balles, dix chargeurs) au départ comme au rejeu, pour abattre
            // une berline dans chaque ville sans attendre un bonus rouge — les
            // balles perdues dans les rivaux comptent. Les deux affectations
            // terminées par un point-virgule sont celles du pilote (déclaration
            // et `reset`) ; les rivaux et la police gardent leur inventaire.
            code: code
              .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
              .replaceAll(
                'createCityRushInventory();',
                '{ ...createCityRushInventory(), [CITY_RUSH_POWERS.PISTOL]: 70 };',
              ),
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
  await server.ssrLoadModule('/scripts/city-rush-police-wreck-entry.jsx');
} catch (e) {
  console.error('VÉRIF CARCASSE DE POLICE ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
