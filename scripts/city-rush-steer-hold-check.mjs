// ════════════════════════════════════════════════════════════════════
// Vérif « maintien des flèches » de Vice City Rush : garder ← / → (ou
// Q / D) enfoncé enchaîne les changements de voie tout seul, à cadence
// régulière, jusqu'à la relâche — une pression isolée n'en fait qu'un.
//
// Le monde est construit pour de vrai (faux WebGLRenderer) et les commandes
// passent par de **vrais événements clavier** dispatchés sur les écouteurs que
// le moteur pose sur `window` : jamais de `world.action()` direct, c'est donc
// la chaîne d'entrée du joueur qui est mesurée, image par image.
//
// Trois ancres sont neutralisées pour isoler le volant (comme les autres
// harnais neutralisent les dégâts de leur pilote d'essai) :
//   · le monde expose `lane` (la voie du pilote) à côté de `distance`, pour
//     lire la voie à **chaque image** au lieu du HUD, émis au plus tous les
//     100 ms — la cadence du maintien (0,18 s) se mesure alors à l'image près ;
//   · `canEnterLane` ouvre toutes les voies au pilote : une voiture de trafic
//     qui ferme une voie fausserait la mesure de la cadence. Le blocage d'une
//     voie reste vérifié par le smoke de course (`check:city-rush-smoke`) ;
//   · le carré du carambolage passe à 0, pour que le pilote d'essai — qui
//     traverse le trafic au lieu de l'éviter — n'aille pas en épave. Le barème
//     réel est tenu par les tests purs et `check:city-rush-wreck`.
//
//   node scripts/city-rush-steer-hold-check.mjs            (vice-city)
//   node scripts/city-rush-steer-hold-check.mjs --all      (les cinq villes)
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
    // Pas de GPU : les matrices monde sont tout de même mises à jour, comme le
    // ferait un vrai rendu.
    this.renderCalls += 1;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
  }
  compile() {}
  dispose() {}
}

globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

// Ancres patchées par le harnais. Si l'une disparaît du source, la vérif
// s'arrête net au lieu de mesurer autre chose que ce qu'elle annonce.
const LANE_GETTER_ANCHOR = '    get distance() { return distance; },\n';
const CAN_ENTER_LANE_ANCHOR = '  function canEnterLane(actorId, targetLane) {\n';
const COLLISION_ANCHOR = '  collision: 1, // choc contre une voiture : un carré pour le pilote';

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
          if (!code.includes(LANE_GETTER_ANCHOR) || !code.includes(CAN_ENTER_LANE_ANCHOR)) {
            throw new Error('ancres du monde introuvables dans ViceCityWorld — mettre à jour le lanceur de la vérif maintien des flèches');
          }
          return {
            code: code
              .replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)(')
              // Harnais : la voie du pilote, lisible à chaque image.
              .replace(
                LANE_GETTER_ANCHOR,
                `${LANE_GETTER_ANCHOR}    get lane() { return playerLane; }, // harnais : la voie du pilote, image par image\n`,
              )
              // Harnais : aucune voie fermée pour le pilote, la cadence du
              // maintien se mesure sans les aléas du trafic.
              .replace(
                CAN_ENTER_LANE_ANCHOR,
                `${CAN_ENTER_LANE_ANCHOR}    if (actorId === 'player') return true; // harnais : route ouverte au pilote d'essai\n`,
              ),
            map: null,
          };
        }
        if (id.includes('cityRushRules')) {
          if (!code.includes(COLLISION_ANCHOR)) {
            throw new Error('ancre du carambolage introuvable dans cityRushRules — mettre à jour le lanceur de la vérif maintien des flèches');
          }
          return {
            code: code.replace(COLLISION_ANCHOR, '  collision: 0, // harnais : carré du carambolage neutralisé'),
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
  await server.ssrLoadModule('/scripts/city-rush-steer-hold-entry.jsx');
} catch (e) {
  console.error('VÉRIF MAINTIEN DES FLÈCHES ÉCHOUÉE (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
