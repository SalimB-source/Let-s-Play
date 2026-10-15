// ════════════════════════════════════════════════════════════════════
// Vérif « conduite libre » de Vice City Rush (`npm run check:city-rush-free-drive`).
// Le vrai monde three.js (faux WebGLRenderer, pas de GPU dans le sandbox) est
// piloté au volant libre par de **vrais événements** : touches ← / → (et Q / D)
// sur `window`, glissés du doigt sur le canvas (pointerdown / pointermove /
// pointerup). Voir `city-rush-free-drive-entry.jsx` pour la liste des
// comportements vérifiés.
//
// Le lanceur ajoute une seule chose au moteur : un accès `harness` en
// lecture/écriture sur les voitures, les structures et le pilote, pour poser
// une voiture à côté du pilote, un tremplin ou un garage devant lui, et lire
// le résultat. Les règles jouées restent celles du jeu.
//
//   node scripts/city-rush-free-drive-check.mjs            (quatre parcours)
//   node scripts/city-rush-free-drive-check.mjs --all      (les neuf parcours)
//   node scripts/city-rush-free-drive-check.mjs --city=london
// Graine : CITY_RUSH_FREE_DRIVE_SEED=… (défaut 20261015).
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
    // Le canvas garde ses écouteurs : la vérif y injecte de vrais gestes.
    const listeners = {};
    this.domElement = {
      style: {}, width: 1280, height: 720, clientWidth: 1280, clientHeight: 720, className: '',
      listeners,
      setAttribute() {}, removeAttribute() {},
      addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
      removeEventListener(type, handler) {
        listeners[type] = (listeners[type] || []).filter((item) => item !== handler);
      },
      setPointerCapture() {}, remove() {},
      getContext: () => null,
    };
    globalThis.__freeDriveCanvas = this.domElement;
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
  setRenderTarget() {}
  getRenderTarget() { return null; }
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

// Ancre du retour de `createCityRushWorld` : l'accès `harness` s'y greffe.
const WORLD_RETURN_ANCHOR = '    get distance() { return distance; },\n';
const HARNESS_ACCESS = `    // Harnais « conduite libre » : pilote, voitures et structures, lus et posés à la main.
    get harness() {
      return {
        trafficCars, oncomingCars, racers, patrolCars, ramps, miniGarages, bazookaWarehouses,
        forwardLanes, oncomingLanes, laneCount, bazookaPickupLane,
        get lane() { return playerLane; },
        get x() { return playerX; },
        get lateral() { return playerLateralSpeed; },
        get heading() { return playerFreeHeading; },
        get steerAngle() { return playerFreeSteer; },
        get steerTarget() { return playerSteerTarget; },
        get cleanLine() { return playerCleanLineTime; },
        get distance() { return distance; },
        get speed() { return currentSpeed; },
        get jumping() { return Boolean(playerJumpState.active); },
        get yaw() { return playerSteerYaw; },
        get steerVisual() { return playerSteerVisual; },
        get stun() { return playerStunLeft; },
        bounds: () => ({ ...freeSteerBounds() }),
        halfWidth: () => playerCollisionWidth() / 2,
        halfLength: FREE_DRIVE_HALF_LENGTH,
        laneX: (lane) => laneX(lane),
        structures: () => freeStructures(playerCollisionWidth() / 2),
        curvature: () => freeRoadCurvature(distance),
        place(x) {
          playerX = x;
          playerLane = cityRushFreeLaneForX(x, playerLane, courseLaneXs, 0);
          playerLateralSpeed = 0;
          playerFreeHeading = 0;
          playerFreeSteer = 0;
          playerSteerTarget = null;
        },
        aim(x) { playerSteerTarget = Number(x); },
        warp(d) { distance = Math.max(0, Number(d) || 0); },
        stunFor(seconds) { playerStunLeft = seconds; playerStunTotal = seconds; },
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
        if (!id.includes('ViceCityWorld')) return undefined;
        if (!code.includes(WORLD_RETURN_ANCHOR)) {
          throw new Error('ancre du retour du monde introuvable dans ViceCityWorld — mettre à jour le lanceur de la vérif conduite libre');
        }
        return {
          code: code
            .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
            .replace(WORLD_RETURN_ANCHOR, `${WORLD_RETURN_ANCHOR}${HARNESS_ACCESS}`),
          map: null,
        };
      },
    },
  ],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-free-drive-entry.jsx');
} catch (e) {
  console.error('VÉRIF CONDUITE LIBRE ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
