/**
 * Prototype « feel » de L'Arcade Éternelle — vérification du rendu et de la page.
 * ============================================================================
 * jsdom n'a ni WebGL ni canvas 2D : on remplace le contexte 2D par une doublure
 * qui enregistre les appels. Ça suffit à couvrir ce qui casse en vrai — une
 * fonction renommée, une variable oubliée, un état non prévu — et à vérifier
 * une règle de la charte artistique : **aucun dégradé** dans le décor (des
 * aplats, rien d'autre).
 *
 * Le script vérifie aussi que la page se construit et se rend (vite en mode
 * SSR + `renderToString`), et que le HUD, les surcouches (K.O., victoire) et le
 * mode mesures se peignent sans exception.
 *
 * Usage : `npm run check:arcade-feel-ui`.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// 1. La page se construit et se rend
// ---------------------------------------------------------------------------

const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  build: {
    ssr: 'src/games/ArcadeFeelPrototype.jsx',
    outDir: 'node_modules/.cache/arcade-feel',
    emptyOutDir: true,
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server'] },
  },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

// ---------------------------------------------------------------------------
// 2. Un navigateur minimal (jsdom + doublure de canvas 2D)
// ---------------------------------------------------------------------------

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/arcade-eternelle' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// `globalThis.navigator` n'est pas modifiable dans Node 22 : on le redéfinit.
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const drawCalls = { total: 0, byName: {} };

function fakeContext2D() {
  const record = (name) => {
    drawCalls.total += 1;
    drawCalls.byName[name] = (drawCalls.byName[name] || 0) + 1;
  };
  const base = {
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {},
    ellipse() {},
    rect() {},
    clip() {},
    fill() {},
    stroke() {},
    translate() {},
    rotate() {},
    scale() {},
    setTransform() {},
    resetTransform() {},
    fillRect: () => record('fillRect'),
    strokeRect: () => record('strokeRect'),
    clearRect: () => record('clearRect'),
    drawImage: () => record('drawImage'),
    fillText: () => record('fillText'),
    strokeText: () => record('strokeText'),
    measureText: (text) => ({ width: String(text).length * 6 }),
    createLinearGradient: () => {
      record('createLinearGradient'); // la charte l'interdit : le test le compte
      return { addColorStop() {} };
    },
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData() {},
  };
  return new Proxy(base, {
    get: (target, key) => (key in target ? target[key] : undefined),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
}

dom.window.HTMLCanvasElement.prototype.getContext = function getContext() {
  if (!this.__ctx) this.__ctx = fakeContext2D();
  return this.__ctx;
};

const consoleError = console.error;
console.error = (...args) => {
  if (/Not implemented: HTMLCanvasElement/.test(String(args[0]))) return;
  consoleError(...args);
};

// ---------------------------------------------------------------------------
// 3. La page rendue (SSR) contient bien la scène et ses panneaux
// ---------------------------------------------------------------------------

const { renderToString } = await import('react-dom/server');
const { default: ArcadeFeelPrototype } = await import('../node_modules/.cache/arcade-feel/ArcadeFeelPrototype.js');
const { createElement } = await import('react');

const html = renderToString(createElement(ArcadeFeelPrototype));
for (const needle of ['arcade-feel-canvas', 'LE PUITS SEC', 'Réglage mesuré', 'Ce qu’il faut juger']) {
  assert.ok(html.includes(needle), `la page doit contenir « ${needle} »`);
}

// ---------------------------------------------------------------------------
// 4. Le rendu peint 600 images de jeu sans broncher
// ---------------------------------------------------------------------------

const { ROOMS, createState, step, heldInput, measureFeel } = await import('../src/games/arcadeFeel.js');
const { createPainter, VIEW_W, VIEW_H, ART } = await import('../src/games/arcadeFeelArt.js');

const room = ROOMS['feel-01'];
const state = createState('feel-01');
const painter = createPainter(room);
const ctx = fakeContext2D();

assert.equal(VIEW_W, 640);
assert.equal(VIEW_H, 360);
assert.ok(painter.bake && painter.bake.width === room.width * 32, 'le décor doit être cuit à la taille de la salle');

// entrées pseudo-aléatoires déterministes, comme le test de robustesse du moteur
let seed = 20261007;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const prev = { jump: false, attack: false, dash: false };

for (let frame = 0; frame < 600; frame += 1) {
  const jump = rnd() < 0.2;
  const attack = rnd() < 0.28;
  const dash = rnd() < 0.1;
  const patch = {
    left: rnd() < 0.26,
    right: rnd() < 0.42,
    down: rnd() < 0.14,
    jump,
    attack,
    dash,
    jumpPressed: jump && !prev.jump,
    attackPressed: attack && !prev.attack,
    dashPressed: dash && !prev.dash,
    dodgePressed: rnd() < 0.06,
    sprint: rnd() < 0.4,
  };
  prev.jump = jump;
  prev.attack = attack;
  prev.dash = dash;
  step(state, heldInput(patch));
  painter.paint(ctx, state, { dt: 1 / 60, debug: frame % 200 > 150, fps: 60 });
}

assert.ok(drawCalls.byName.drawImage >= 600, `le décor cuit doit être blitté à chaque image (${drawCalls.byName.drawImage})`);
assert.ok(drawCalls.byName.fillRect > 500, `le HUD et les personnages doivent être peints (${drawCalls.byName.fillRect})`);
assert.ok(drawCalls.byName.fillText > 100, `le HUD doit écrire du texte (${drawCalls.byName.fillText})`);
assert.equal(drawCalls.byName.createLinearGradient || 0, 0, 'charte : aplats francs, aucun dégradé');
assert.ok(painter.particles.length <= 260, 'les particules restent bornées');
assert.ok(painter.pops.length <= 12, 'les onomatopées restent bornées');

// --- surcouches : K.O. et victoire se peignent aussi ----------------------
const koState = createState('feel-01');
koState.phase = 'dead';
koState.respawnTimer = 0.5;
painter.paint(ctx, koState, { dt: 1 / 60 });

const winState = createState('feel-01');
winState.phase = 'victory';
winState.stats.clearedIn = 42.5;
winState.hero.hp = 2;
painter.paint(ctx, winState, { dt: 1 / 60 });

// --- le sable se peint enfoncé -------------------------------------------
const sandState = createState('feel-01');
sandState.hero.x = 24.2;
sandState.hero.y = 15;
for (let i = 0; i < 40; i += 1) step(sandState, heldInput());
assert.ok(sandState.hero.sandDepth > 0, 'le héros doit s’enfoncer dans le sable');
painter.paint(ctx, sandState, { dt: 1 / 60 });

// --- les mesures affichées par la page sont celles du moteur --------------
const tuning = measureFeel();
for (const [key, value] of Object.entries(tuning)) {
  assert.ok(Number.isFinite(value), `measureFeel.${key} doit être un nombre`);
}
assert.ok(tuning.jumpHeld > 3 && tuning.jumpHeld < 3.6, `hauteur de saut tenue = ${tuning.jumpHeld}`);
assert.ok(tuning.jumpTap < tuning.jumpHeld * 0.75, 'le saut relâché doit être nettement plus court');
assert.ok(tuning.run1s > 5.5 && tuning.run1s < 6.7, `course en 1 s = ${tuning.run1s}`);
assert.ok(tuning.sprint1s > tuning.run1s + 1.5, 'le sprint doit aller plus vite que la course');
// Palette du héros : deux nuances ajustées au rendu, documentées en charte §9 bis
// (le noir plein faisait un trou sans silhouette, le rouille se fondait dans le
// sable). L'encre, elle, ne bouge pas : c'est la règle non négociable n° 1.
assert.equal(ART.ink, '#50493D', 'l’encre chaude de la charte, sans exception');
assert.equal(ART.heroJacket, '#2B2C31', 'veste : charte #232324 éclaircie d’un cran (charte §9 bis)');
assert.equal(ART.heroScarf, '#9C4E2E', 'écharpe : brique franche (charte §9 bis)');
assert.equal(ART.heroShirt, '#EDE2D2', 'tee-shirt clair : la réserve de lumière, inchangée');

console.log('prototype du feel — rendu vérifié :');
console.log(`  images peintes      ${drawCalls.byName.drawImage}`);
console.log(`  appels de tracé     ${drawCalls.total}`);
console.log(`  texte HUD           ${drawCalls.byName.fillText}`);
console.log(`  hauteur de saut     ${tuning.jumpHeld.toFixed(2)} tuiles tenues / ${tuning.jumpTap.toFixed(2)} relâchées`);
console.log(`  course / sprint     ${tuning.run1s.toFixed(2)} / ${tuning.sprint1s.toFixed(2)} tuiles en 1 s`);
