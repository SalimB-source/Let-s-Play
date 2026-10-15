// ════════════════════════════════════════════════════════════════════
// Vérif « vue cockpit » de Vice City Rush : le vrai monde three.js (faux
// WebGLRenderer) joue le compte à rebours et le début de course en vue
// cockpit, puis bascule en poursuite et revient, et finit sur une épave.
//
// Le faux renderer sait, lui, viser une cible de rendu : le rétroviseur
// intérieur passe donc par son vrai chemin (cible, caméra arrière, voiture du
// joueur masquée, ombres figées) et le harnais vérifie chacun de ces points.
//
// Deux ancres sont patchées, comme les autres harnais :
//   · `canEnterLane` ouvre toutes les voies au pilote d'essai : le volant se
//     mesure sur un vrai écart, jamais refusé par le trafic ;
//   · `forceWreck()` rejoint l'API du monde : l'épave (barre de vie à zéro)
//     se déclenche à la demande, sans jouer une course entière ; `harnessRacers`
//     et `harnessPlayerX` permettent de poser un rival sur la voiture du pilote.
//
//   node scripts/city-rush-cockpit-check.mjs          (quatre parcours)
//   node scripts/city-rush-cockpit-check.mjs --all    (les neuf parcours)
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
    this.shadowMap = { enabled: true, type: 0, autoUpdate: true };
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
    // Journal des rendus : la cible visée, la caméra, et l'état de la scène
    // au moment du rendu (le harnais y lit le passage du rétroviseur).
    this.target = null;
    this.renders = [];
  }
  getContext() { return ctxStub; }
  setPixelRatio(r) { this._ratio = r; }
  getPixelRatio() { return this._ratio; }
  setSize(w, h) { this._size.width = w; this._size.height = h; }
  getSize(t) { t.width = this._size.width; t.height = this._size.height; return t; }
  setClearColor() {}
  setRenderTarget(target) { this.target = target; }
  getRenderTarget() { return this.target; }
  clear() {}
  render(scene, camera) {
    this.renderCalls += 1;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    const hook = globalThis.__cockpitRenderHook;
    if (hook) hook({ renderer: this, scene, camera, target: this.target });
  }
  compile() {}
  dispose() {}
}

globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

const DISTANCE_ANCHOR = '    get distance() { return distance; },\n';
const CAN_ENTER_LANE_ANCHOR = '  function canEnterLane(actorId, targetLane) {\n';

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
        if (!code.includes(DISTANCE_ANCHOR) || !code.includes(CAN_ENTER_LANE_ANCHOR)) {
          throw new Error('ancres du monde introuvables dans ViceCityWorld — mettre à jour le lanceur de la vérif cockpit');
        }
        return {
          code: code
            .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
            .replace(DISTANCE_ANCHOR, `${DISTANCE_ANCHOR}    forceWreck() { wreckPlayer(); }, // harnais : épave à la demande\n    get harnessRacers() { return racers; }, // harnais : rivaux posés à la main\n    get harnessPlayerX() { return playerX; },\n    get harnessPlayerLane() { return playerLane; },\n`)
            .replace(
              CAN_ENTER_LANE_ANCHOR,
              `${CAN_ENTER_LANE_ANCHOR}    if (actorId === 'player') return true; // harnais : route ouverte au pilote d'essai\n`,
            ),
          map: null,
        };
      },
    },
  ],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-cockpit-entry.jsx');
} catch (e) {
  console.error('VÉRIF COCKPIT ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
