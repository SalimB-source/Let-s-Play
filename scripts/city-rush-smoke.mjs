// ════════════════════════════════════════════════════════════════════
// Smoke « Vice City Rush » : construit le monde pour de vrai (décor de la
// boucle, zone de départ, voitures, trafic) avec un WebGLRenderer factice,
// joue une course complète (6 tours, dont un grand dernier tour de 2 400 m)
// en pompant la boucle animate, et échoue si une frame lève une exception, si
// les passages de ligne ne sont pas détectés ou si l'arrivée n'est jamais
// atteinte.
//   node scripts/city-rush-smoke.mjs            (ville par défaut : vice-city)
//   node scripts/city-rush-smoke.mjs --all      (tous les parcours jouables)
// `--all` joue les sept parcours de CITY_RUSH_COURSES : les cinq villes ET les
// deux routes (Route 66, campagne mexicaine). Le décor de ces routes est
// entièrement distinct (ranchos, agaves, chapelles) : les exclure laissait
// passer des plantages de construction du monde — c'est arrivé sur la
// chapelle du Mexique, dont l'appel à addTree passait un argument de trop.
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
    // Pas de GPU : on met tout de même à jour les matrices monde comme le
    // ferait un vrai rendu, pour que localToWorld() des voitures soit juste.
    this.renderCalls += 1;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    // La caméra réelle est exposée au harnais : il peut projeter un nœud à
    // l'écran et vérifier qu'un élément est bien *visible* (dans le cadre), pas
    // seulement `visible === true`.
    globalThis.__smokeCamera = camera;
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
            code: code.replaceAll('new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)('),
            map: null,
          };
        }
        // Précondition de course longue : le pilote d'essai percute le trafic et
        // la police exprès (riposte policière, face-à-face contrôlé, barrages)
        // et empile donc les carambolages. Le carré perdu au contact est
        // neutralisé ici — le maximum HUD reste quinze, la barre reste pleine —
        // pour que la course aille au bout de ses six tours et que tous les
        // autres systèmes restent mesurés. Le barème du carambolage est vérifié
        // par les tests purs et par `check:city-rush-wreck`, qui joue le vrai
        // coût sur une barre d'une cellule.
        if (id.includes('cityRushRules')) {
          const anchor = '  collision: 1, // choc contre une voiture : un carré pour le pilote';
          if (!code.includes(anchor)) {
            throw new Error('ancre du carambolage introuvable dans cityRushRules — mettre à jour le lanceur du smoke');
          }
          return {
            code: code.replace(anchor, '  collision: 0, // harnais : carré du carambolage neutralisé')
              .replace("'suv-collision': 2,", "'suv-collision': 0,"),
            map: null,
          };
        }
        return undefined;
      },
    },
  ],
});

const smokeSeed = process.env.CITY_RUSH_SMOKE_SEED;
if (smokeSeed) console.log(`graine fixée : ${smokeSeed} (même tirage à chaque passage)`);

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-smoke-entry.jsx');
} catch (e) {
  console.error('SMOKE FAILED (chargement) :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
