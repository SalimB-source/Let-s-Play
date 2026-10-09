// Mission 1 : vrai monde three.js, seules les sorties GPU sont remplacées.
// Ni dégâts, ni trafic, ni IA ne sont neutralisés. Deux courses complètes.
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

// Ancre du retour de `createCityRushWorld` : le harnais du bot s'y greffe.
const WORLD_RETURN_ANCHOR = '    get distance() { return distance; },\n';
// Le bot lit la règle de voie du volant au lieu de la recopier : un appui vers
// une voie fermée (voiture à côté, distance de sécurité) est refusé par action().
// Le bot s'abstient alors, comme sur la base où un tel appui ne faisait rien.
const HARNESS_ACCESS = `    // Harnais « mission-run » : la même règle de voie que action().
    get harness() {
      return {
        steerRefused(name) {
          const next = cityRushLaneAfterAction(playerLane, name, laneCount, { airborne: playerJumpState.active });
          return next !== playerLane && !canEnterLane('player', next);
        },
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
      name: 'mission-fake-webgl-renderer',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('ViceCityWorld')) {
          if (!code.includes(WORLD_RETURN_ANCHOR)) {
            throw new Error('ancre du retour du monde introuvable dans ViceCityWorld — mettre à jour le lanceur de la vérif mission-run');
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
  await server.ssrLoadModule('/scripts/city-rush-mission-run-entry.jsx');
} catch (e) {
  console.error('VÉRIF ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
