// Lanceur de la vérif « choc latéral » (voir `city-rush-side-bump-entry.jsx`).
//   node scripts/city-rush-side-bump-check.mjs                 (le parcours Vice City)
//   node scripts/city-rush-side-bump-check.mjs --all           (les huit parcours)
//   node scripts/city-rush-side-bump-check.mjs --city=nordschleife
// Graine : CITY_RUSH_SIDE_BUMP_SEED=… (défaut 20261009).
//
// Le monde est le vrai `createCityRushWorld`, avec un faux WebGLRenderer (pas de
// GPU dans le sandbox). Le lanceur ajoute une seule chose au moteur : un accès
// `harness` en lecture/écriture sur les voitures et la voie du pilote, pour
// poser une voiture à côté du pilote et lire le résultat. Les règles jouées
// restent celles du jeu : aucune voie n'est ouverte de force.
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
    // Pas de GPU : les matrices monde sont tout de même mises à jour.
    this.renderCalls += 1;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
  }
  compile() {}
  dispose() {}
}

globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

// Ancre du retour de `createCityRushWorld` : l'accès `harness` s'y greffe.
const WORLD_RETURN_ANCHOR = '    get distance() { return distance; },\n';
const HARNESS_ACCESS = `    // Harnais « choc latéral » : voitures, voies et pilote, lus et posés à la main.
    get harness() {
      return {
        trafficCars, oncomingCars, racers, patrolCars, policeCars, ralliedCars,
        forwardLanes, oncomingLanes, laneCount,
        get lane() { return playerLane; },
        get health() { return playerHealth; },
        get distance() { return distance; },
        get wanted() { return wantedLevel; },
        laneX: (lane) => laneX(lane),
        placeLane(lane) { playerLane = lane; playerX = laneX(lane); },
      };
    },
`;

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
          if (!code.includes(WORLD_RETURN_ANCHOR)) {
            throw new Error('ancre du retour du monde introuvable dans ViceCityWorld — mettre à jour le lanceur de la vérif choc latéral');
          }
          return {
            code: code
              .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
              .replace(WORLD_RETURN_ANCHOR, `${WORLD_RETURN_ANCHOR}${HARNESS_ACCESS}`),
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
  await server.ssrLoadModule('/scripts/city-rush-side-bump-entry.jsx');
} catch (e) {
  console.error('VÉRIF CHOC LATÉRAL ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
