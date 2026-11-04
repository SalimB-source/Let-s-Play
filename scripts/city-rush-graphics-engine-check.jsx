/**
 * Vérification « moteur » de RENDU : CINÉMA — appelée par
 * `scripts/city-rush-graphics-check.mjs`, sans GPU.
 *
 * three.js est **réel** ici (scène, lumières, matériaux, vraies passes
 * `EffectComposer`/`UnrealBloomPass`/`OutputPass`), seul `WebGLRenderer` est
 * factice : il consigne ses appels, ce qui permet de vérifier l'ordre des
 * passes, la cible de chacun, et que le rétroviseur du cockpit — une passe
 * imbriquée dans le rendu de la scène — ne détourne pas le reste de l'image.
 *
 *   1. la chaîne : cible → halo → écran, à la bonne taille et au bon ratio ;
 *   2. une course complète en cinéma : chaque image passe par la chaîne, le
 *      halo est réglé sur l'ambiance du parcours, et le passage à STANDARD en
 *      pleine course démonte la chaîne sans lever ;
 *   3. la qualité allégée refuse le cinéma (le choix est conservé côté page).
 */
import * as THREE from 'three';
import assert from 'node:assert/strict';
import { cityRushCinemaSettings, createCityRushPostChain } from '../src/games/cityRushPost.js';
import { CITY_RUSH_CARS, CITY_RUSH_COURSES } from '../src/games/cityRushRules.js';
import { cityRushTheme } from '../src/games/cityRushThemes.js';

// ── Le renderer factice ────────────────────────────────────────────────────
// Il expose ce que la chaîne interroge (taille, ratio, capacités, extensions)
// et enregistre chaque `render` / `setRenderTarget`, dans l'ordre.
function makeFakeRenderer({ pixelRatio = 1, halfFloat = true } = {}) {
  const calls = [];
  let target = null;
  let ratio = pixelRatio;
  const size = { width: 1280, height: 720 };
  const renderer = {
    calls,
    capabilities: { isWebGL2: true, maxSamples: 4 },
    extensions: {
      has: (name) => halfFloat && (name === 'EXT_color_buffer_half_float' || name === 'EXT_color_buffer_float'),
      get: () => null,
    },
    shadowMap: { enabled: true, autoUpdate: true, type: 0 },
    autoClear: true,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.15,
    outputColorSpace: THREE.SRGBColorSpace,
    getPixelRatio: () => ratio,
    setPixelRatio: (value) => { ratio = value; },
    getSize: (vector) => vector.set(size.width, size.height),
    setSize: (width, height) => { size.width = width; size.height = height; },
    getRenderTarget: () => target,
    setRenderTarget: (next) => {
      target = next || null;
      calls.push({ kind: 'target', target });
    },
    render: (scene, camera) => {
      calls.push({
        kind: 'render',
        target,
        targetName: target?.texture?.name || null,
        scene,
        camera,
        exposure: renderer.toneMappingExposure,
      });
      if (scene?.updateMatrixWorld) scene.updateMatrixWorld();
    },
    clear: () => {},
    getClearColor: (color) => color,
    getClearAlpha: () => 1,
    setClearColor: () => {},
    setClearAlpha: () => {},
    compile: () => {},
    dispose: () => {},
    state: { buffers: { stencil: { setFunc: () => {}, setTest: () => {} } } },
  };
  return renderer;
}

// ── 1. La chaîne, seule ────────────────────────────────────────────────────
{
  const renderer = makeFakeRenderer({ pixelRatio: 1.5 });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  const settings = cityRushCinemaSettings({ daylight: false, glow: 1 });
  const chain = createCityRushPostChain({ renderer, scene, camera, width: 1280, height: 720, settings });

  assert.equal(chain.halfFloat, true, 'la cible est flottante quand la carte le donne');
  assert.equal(chain.samples, 4, 'la cible porte le MSAA (le canvas ne l’applique plus)');
  assert.equal(chain.bloomPass.threshold, settings.threshold, 'le seuil du halo suit l’ambiance');
  assert.equal(chain.bloomPass.strength, settings.strength);

  renderer.calls.length = 0;
  chain.render(1 / 60);
  const renders = renderer.calls.filter((call) => call.kind === 'render');
  // Une image = la scène **une fois**, puis les passes plein écran du halo
  // (luminosité, cinq niveaux de flou × deux directions, composition) et la
  // sortie. Aucune ne redessine la scène : c'est le post-traitement, pas une
  // seconde passe de géométrie.
  const sceneRenders = renders.filter((call) => call.scene === scene);
  assert.equal(sceneRenders.length, 1, 'la scène de la course est dessinée une seule fois par image');
  // Le composer échange ses deux cibles à chaque image (rt1 ⇄ rt2).
  assert.match(sceneRenders[0].targetName || '', /^EffectComposer\.rt[12]$/, 'elle entre par une cible du composer (HDR)');
  assert.notEqual(sceneRenders[0].target, null, 'la scène n’est plus dessinée droit dans l’écran');
  const screenRenders = renders.filter((call) => call.target === null);
  assert.equal(screenRenders.length, 1, 'une seule passe finale écrit dans l’écran (OutputPass)');
  assert.equal(renders[renders.length - 1], screenRenders[0], 'et c’est la dernière de l’image');
  assert.ok(renders.length >= 12, `le halo fait ses passes plein écran (${renders.length} rendus au total)`);

  // Taille : la cible suit la taille CSS × le pixel ratio du renderer.
  chain.setSize(640, 360, 2);
  assert.equal(chain.bloomPass.resolution.x, 1280, 'le halo suit la résolution effective');
  assert.equal(chain.bloomPass.resolution.y, 720);
  chain.dispose();
}

// ── 1b. Le rétroviseur du cockpit ne vole pas la cible du composer ────────
// `renderCockpitMirror` dessine dans sa propre cible **pendant** le
// RenderPass. Sans `withRenderPass`, le `setRenderTarget(null)` final laisserait
// la suite de l'image (ciel, trafic, route) sortir de la chaîne cinéma.
{
  const renderer = makeFakeRenderer();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  const chain = createCityRushPostChain({ renderer, scene, camera, width: 1280, height: 720 });
  const mirror = new THREE.WebGLRenderTarget(320, 80);
  mirror.texture.name = 'cockpit-mirror';
  const stack = [];
  // La règle exacte de `ViceCityWorld.withRenderPass`.
  const withRenderPass = (target, draw) => {
    stack.push(renderer.getRenderTarget());
    try {
      renderer.setRenderTarget(target);
      draw();
    } finally {
      renderer.setRenderTarget(stack.pop() ?? null);
    }
  };
  // On rejoue la boucle de la course : miroir juste avant le rendu principal.
  renderer.calls.length = 0;
  withRenderPass(mirror, () => renderer.render(scene, camera));
  chain.render(1 / 60);
  const [mirrorRender, composerRender] = renderer.calls.filter((call) => call.kind === 'render');
  assert.equal(mirrorRender.targetName, 'cockpit-mirror', 'le miroir dessine dans sa cible');
  assert.match(composerRender.targetName || '', /^EffectComposer\.rt[12]$/, 'puis la scène repart dans la cible du composer');
  assert.equal(renderer.getRenderTarget(), null, 'la cible du renderer est rendue à la fin de l’image');
  chain.dispose();
  mirror.dispose();
}

// ── 2. Une course en cinéma, avec le faux renderer du lanceur ──────────────
// `scripts/city-rush-graphics-check.mjs` a réécrit `new THREE.WebGLRenderer(`
// dans `ViceCityWorld.jsx` (impossible d'assigner un module ESM) : le monde se
// construit donc pour de vrai, avec un renderer factice instrumenté.
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');

// Un DOM minimal pour la partie moteur (jsdom a été refermé après l'interface) :
// toiles 2D muettes, aucun évènement, aucun média.
if (typeof globalThis.window === 'undefined' || !globalThis.window.addEventListener) {
  const gradient = { addColorStop() {} };
  const ctx2d = () => new Proxy({}, {
    get: (_target, key) => {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      if (key === 'measureText') return () => ({ width: 10 });
      if (key === 'getImageData') return (x, y, width, height) => ({ data: new Uint8ClampedArray(Math.max(1, width * height) * 4) });
      if (key === 'canvas') return { width: 1, height: 1 };
      return () => {};
    },
    set: () => true,
  });
  const makeCanvas = () => ({
    width: 1, height: 1, style: {},
    getContext: (kind) => (kind === '2d' ? ctx2d() : null),
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    toDataURL: () => '',
  });
  globalThis.window = {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    location: { href: 'http://localhost/jeu/vice-city-rush' },
  };
  globalThis.document = {
    createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {} }),
    createElementNS: () => makeCanvas(),
    addEventListener() {}, removeEventListener() {},
    body: { appendChild() {}, removeChild() {} },
    hidden: false,
    visibilityState: 'visible',
  };
  globalThis.navigator = globalThis.navigator || { userAgent: 'node' };
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
}

const mount = {
  clientWidth: 1280,
  clientHeight: 720,
  getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
  appendChild() {},
  removeChild() {},
  addEventListener() {},
  removeEventListener() {},
  ownerDocument: globalThis.document,
  querySelector: () => null,
  classList: { add() {}, remove() {} },
  style: {},
};

const city = CITY_RUSH_COURSES[0];
const car = CITY_RUSH_CARS[0];
const graphicsStates = [];
const makeWorld = (mode, cloneLite = false) => createCityRushWorld(
  mount,
  city,
  () => ({
    hud: () => {},
    finish: () => {},
    pickup: () => {},
    effect: () => {},
    lap: () => {},
    tutorial: () => {},
    graphics: (state) => graphicsStates.push(state),
  }),
  car.id,
  null,
  null,
  1,
  false,
  'laps',
  null,
  false,
  mode,
);

const world = makeWorld('cinema');
assert.equal(world.graphicsMode, 'cinema', 'le rendu demandé est retenu dès la construction');
assert.ok(world.postChain, 'la chaîne est montée');
const theme = cityRushTheme(city.id);
const expected = cityRushCinemaSettings({ daylight: Boolean(theme.daylight), glow: theme.glow ?? 1 });
assert.equal(world.postChain.bloomPass.threshold, expected.threshold, 'le halo prend l’ambiance du parcours');
assert.equal(world.postChain.bloomPass.strength, expected.strength);

// L'image de course : trois images de la boucle, lues dans l'instrumentation du
// faux renderer. La scène doit passer par la cible du composer, jamais par
// l'écran, et la dernière passe doit écrire dans l'écran.
globalThis.__fakeRendererCalls.length = 0;
world.start();
// Trois images de la boucle réelle (celle que `requestAnimationFrame` appelle).
const pump = () => globalThis.__cityRushRaf?.(performance.now());
for (let frame = 0; frame < 3; frame += 1) pump();
const calls = globalThis.__fakeRendererCalls.filter((call) => call.kind === 'render');
assert.ok(calls.length > 0, 'la boucle dessine (le faux renderer consigne chaque passe)');
const sceneCalls = calls.filter((call) => call.scene === world.scene);
assert.ok(sceneCalls.length > 0, 'la scène est dessinée');
assert.ok(sceneCalls.every((call) => call.target !== null), 'en cinéma, la scène n’est jamais dessinée droit dans l’écran');
assert.ok(
  calls.filter((call) => call.target === null).length > 0,
  'la chaîne finit bien par écrire dans l’écran',
);

// Le passage à STANDARD en pleine course démonte la chaîne, sans lever.
graphicsStates.length = 0;
assert.equal(world.setGraphics('standard'), false, 'STANDARD démonte la chaîne');
assert.equal(world.postChain, null, 'plus de chaîne en standard');
assert.equal(graphicsStates.at(-1)?.active, false, 'le monde publie l’état réel (inactif)');
globalThis.__fakeRendererCalls.length = 0;
pump();
const standardCalls = globalThis.__fakeRendererCalls.filter((call) => call.kind === 'render');
assert.ok(
  standardCalls.some((call) => call.target === null && call.scene === world.scene),
  'en standard, la scène repart droit dans l’écran',
);
assert.equal(world.setGraphics('cinema'), true, 'CINÉMA remonte la chaîne à chaud');
assert.equal(graphicsStates.at(-1)?.active, true, 'le monde publie l’état réel (actif)');
assert.equal(world.setGraphics('n-importe-quoi'), false, 'une valeur inconnue retombe sur le standard');
assert.equal(world.graphicsMode, 'standard');
world.destroy();

// ── 3. Qualité allégée : pas de chaîne cinéma ─────────────────────────────
globalThis.window.LetsPlayAndroid = {};
try {
  const liteWorld = makeWorld('cinema');
  assert.equal(liteWorld.lite, true, 'la coque Android est reconnue comme qualité allégée');
  assert.equal(liteWorld.postChain, null, 'le cinéma n’est pas monté sur une machine allégée');
  assert.equal(liteWorld.graphicsMode, 'standard', 'le monde retombe sur le rendu standard');
  assert.equal(liteWorld.setGraphics('cinema'), false, 'le cinéma reste refusé à chaud');
  liteWorld.destroy();
} finally {
  delete globalThis.window.LetsPlayAndroid;
}
