// Vérif « maintien des flèches » : garder ← / → (ou Q / D) enfoncé enchaîne les
// changements de voie tout seul, jusqu'à la relâche.
//
// Le monde est le vrai `createCityRushWorld` (faux WebGLRenderer, voies ouvertes
// au pilote et carré de carambolage neutralisé par le lanceur — voir son
// en-tête) et les commandes passent par de **vrais événements clavier**
// dispatchés sur les écouteurs `window` posés par le moteur : aucun
// `world.action()` direct, c'est donc la chaîne d'entrée du joueur qui est
// mesurée, image par image (60 Hz), via `world.lane` exposé par le lanceur.
//
// Le calendrier attendu est celui du clavier système : l'écart part à l'image
// même de la pression, le **deuxième** attend le délai de répétition
// (`STEER_HOLD_FIRST_DELAY` = 0,26 s), les suivants s'enchaînent à la cadence
// (`STEER_HOLD_LANE_INTERVAL` = 0,18 s). Six comportements sont vérifiés :
//   · une pression isolée ne fait **qu'un** écart, même tenue 1,2 s ;
//   · le maintien enchaîne les écarts au calendrier ci-dessus, jusqu'au bord de
//     la chaussée, sans marteler la touche ;
//   · la **relâche** arrête net le maintien (aucun écart fantôme ensuite) ;
//   · la répétition native du clavier (`event.repeat`) n'accélère rien ;
//   · les deux flèches enfoncées : la dernière pressée gagne, et la relâcher
//     rend la main à l'autre ; Q et D tiennent les mêmes directions que les
//     flèches, sans doublonner la cadence ni se couper l'un l'autre ;
//   · compte à rebours, pause ou fenêtre perdue : aucune touche ne reste
//     coincée, et le volant répond de nouveau à la pression suivante.
//
// Chaque scénario repart d'un `reset()` : quelques centaines de mètres tout au
// plus, donc aucun tremplin ne vient suspendre le volant en plein saut.
const BASE_SEED = Number(process.env.CITY_RUSH_STEER_HOLD_SEED || 20261006) >>> 0;
let seed = BASE_SEED;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const ctx2d = () => {
  const g = { addColorStop() {} };
  return {
    canvas: { width: 512, height: 512 },
    fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, lineCap: '', lineJoin: '',
    font: '', textAlign: '', textBaseline: '', filter: '', shadowBlur: 0, shadowColor: '',
    globalCompositeOperation: 'source-over',
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {}, strokeText() {},
    drawImage() {}, clip() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    arcTo() {}, resetTransform() {}, transform() {}, setTransform() {}, putImageData() {},
    setLineDash() {},
    createLinearGradient() { return g; }, createRadialGradient() { return g; },
    createPattern() { return null; },
    measureText() { return { width: 10 }; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }; },
    roundRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); },
  };
};
const makeCanvas = () => ({
  width: 1, height: 1, style: {},
  getContext: (kind) => (kind === '2d' ? ctx2d() : null),
  addEventListener() {}, removeEventListener() {},
  toDataURL: () => '',
});

// Les écouteurs posés sur `window` par le moteur (keydown / keyup / blur) sont
// capturés ici : la vérif y injecte de vrais événements clavier.
const listeners = { window: {}, document: {} };
globalThis.ImageData = class ImageData {
  constructor(data, width, height) {
    if (typeof data === 'number') {
      this.width = data; this.height = width;
      this.data = new Uint8ClampedArray(data * width * 4);
    } else {
      this.data = data; this.width = width; this.height = height;
    }
  }
};
globalThis.window = {
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener(t, f) { (listeners.window[t] ||= []).push(f); },
  removeEventListener() {},
  location: { href: 'http://localhost/', origin: 'http://localhost' },
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {} }),
  createElementNS: (_ns, tag) => globalThis.document.createElement(tag),
  addEventListener(t, f) { (listeners.document[t] ||= []).push(f); },
  removeEventListener() {},
  body: { appendChild() {}, removeChild() {}, style: {} },
  documentElement: { style: {} },
  hidden: false,
  visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-smoke', maxTouchPoints: 0 }, configurable: true });
globalThis.self = globalThis;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

let rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const { CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LANE_X } = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 60;
const FRAME_S = FRAME_MS / 1000;
// Calendrier joué par le moteur : l'écart de la pression est immédiat, le
// deuxième attend le délai de répétition, les suivants la cadence. Un écart
// part à la première image où le compte à rebours est écoulé, d'où la
// tolérance de deux images (l'arrondi se cumule d'un cran à l'autre).
const FIRST_DELAY = 0.26;
const INTERVAL = 0.18;
const TOLERANCE = FRAME_S * 2;
const changeSchedule = (count) => Array.from({ length: count }, (_, index) => (
  index === 0 ? 0 : FIRST_DELAY + (index - 1) * INTERVAL
));
// Nombre d'écarts attendus dans une fenêtre, hors bord de chaussée.
const changesWithin = (seconds) => (
  seconds < FIRST_DELAY ? 1 : 2 + Math.floor((seconds - FIRST_DELAY) / INTERVAL)
);

const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const fireKey = (type, key, extra = {}) => {
  const handlers = listeners.window[type] || [];
  if (!handlers.length) fail(`aucun écouteur « ${type} » posé par le moteur`);
  const event = { key, repeat: false, preventDefault() {}, stopPropagation() {}, target: null, ...extra };
  for (const handler of handlers) handler(event);
};
const loseFocus = () => {
  const handlers = listeners.window.blur || [];
  if (!handlers.length) fail('aucun écouteur « blur » posé par le moteur');
  for (const handler of handlers) handler({});
};

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_STEER_HOLD_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const LANE_COUNT = CITY_RUSH_LANE_X.length;

for (const [cityIndex, city] of cities.entries()) {
  seed = (BASE_SEED + cityIndex * 104729) >>> 0;
  const mount = {
    clientWidth: 1280, clientHeight: 720,
    getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
    appendChild() {}, removeChild() {},
    addEventListener() {}, removeEventListener() {},
    ownerDocument: globalThis.document,
    querySelector: () => null,
    classList: { add() {}, remove() {} },
    style: {},
  };
  const audioStub = new Proxy({}, { get: () => () => {} });
  // Sprint : ni rival ni escouade, et le lanceur ouvre toutes les voies au
  // pilote — la course ne dépend que de son volant, image par image.
  const world = createCityRushWorld(mount, city, () => ({
    error: (message) => fail(`[${city.id}] erreur du moteur`, message),
    hud: () => {},
    finish: () => {},
    effect: () => {},
  }), CITY_RUSH_CARS[0].id, { current: audioStub }, null, 3, false, 'sprint');

  // ── Harnais de mesure ─────────────────────────────────────────────────────
  // Chaque scénario note la voie du pilote après chaque événement clavier et
  // après chaque image : `changes` donne l'instant et le sens de chaque écart.
  const startScenario = () => {
    world.reset();
    world.setPhase('playing');
    world.start();
    stepFrame();
    return { lastLane: world.lane, changes: [], t0: virtualNow };
  };
  const note = (state) => {
    const lane = world.lane;
    if (lane === state.lastLane) return;
    state.changes.push({ at: (virtualNow - state.t0) / 1000, from: state.lastLane, to: lane });
    state.lastLane = lane;
  };
  const pressKey = (state, key, extra) => { fireKey('keydown', key, extra); note(state); };
  const releaseKey = (state, key) => { fireKey('keyup', key); note(state); };
  const run = (state, seconds, onFrame = null) => {
    const frames = Math.max(1, Math.round(seconds / FRAME_S));
    for (let index = 0; index < frames; index += 1) {
      onFrame?.(index, (virtualNow - state.t0) / 1000);
      stepFrame();
      note(state);
    }
  };
  // Le calendrier complet du maintien : écart immédiat, délai de répétition,
  // puis cadence — à deux images près.
  const checkSchedule = (state, label, from = 0) => {
    const expected = changeSchedule(state.changes.length - from);
    state.changes.slice(from).forEach((change, index) => {
      const drift = change.at - expected[index];
      // Chaque cran arrondit à l'image supérieure : la dérive admise grandit
      // d'une image par écart.
      if (Math.abs(drift) > FRAME_S * (index + 2)) {
        fail(`[${city.id}] ${label} : écart ${index + 1} hors calendrier (${change.at.toFixed(3)} s, attendu ${expected[index].toFixed(3)} s)`,
          state.changes);
      }
    });
  };
  const checkDirection = (state, direction, label, from = 0) => {
    for (const change of state.changes.slice(from)) {
      const expected = direction === 'left' ? change.from - 1 : change.from + 1;
      if (change.to !== expected) fail(`[${city.id}] ${label} : écart dans le mauvais sens`, change);
    }
  };

  // La direction testée est celle qui a de la place : à droite de la grille en
  // conduite à droite (voie 4 sur 6), on tient la gauche — et l'inverse à
  // Londres ou sur la Shuto, où la grille est reflétée.
  const startLane = startScenario().lastLane;
  const mainDirection = startLane >= LANE_COUNT / 2 ? 'left' : 'right';
  const otherDirection = mainDirection === 'left' ? 'right' : 'left';
  const mainKey = mainDirection === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const otherKey = otherDirection === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const step = mainDirection === 'left' ? -1 : 1;
  const room = mainDirection === 'left' ? startLane : LANE_COUNT - 1 - startLane;
  const edgeLane = mainDirection === 'left' ? 0 : LANE_COUNT - 1;
  if (room < 3) fail(`[${city.id}] la grille de départ ne laisse pas assez de voies pour mesurer le calendrier`, { startLane, room });

  // ── 1. Une pression isolée ne fait qu'un écart ────────────────────────────
  {
    const state = startScenario();
    pressKey(state, mainKey);
    releaseKey(state, mainKey);
    if (state.changes.length !== 1 || state.changes[0].to !== startLane + step) {
      fail(`[${city.id}] la pression immédiate ne décale pas d'une voie`, state.changes);
    }
    // Un appui long de 1,2 s relâché aussitôt ne vaut pas mieux qu'une pichenette
    // : sans maintien, le délai de répétition n'est jamais atteint.
    run(state, 1.2);
    if (state.changes.length !== 1) {
      fail(`[${city.id}] une pression relâchée continue de décaler la voiture`, state.changes);
    }
  }

  // ── 2. Le maintien enchaîne les écarts jusqu'au bord de la chaussée ───────
  {
    const state = startScenario();
    pressKey(state, mainKey); // jamais relâchée dans ce scénario
    run(state, 1.05); // de quoi avaler les quatre voies disponibles
    if (state.changes.length !== room) {
      fail(`[${city.id}] le maintien n'a pas enchaîné les ${room} écarts disponibles`, state.changes);
    }
    checkSchedule(state, 'maintien');
    checkDirection(state, mainDirection, 'maintien');
    if (world.lane !== edgeLane) fail(`[${city.id}] le maintien ne mène pas au bord de la chaussée`, world.lane);
    // Au bord, la touche reste enfoncée sans effet : ni erreur, ni écart.
    const atEdge = state.changes.length;
    run(state, 0.6);
    if (state.changes.length !== atEdge) fail(`[${city.id}] le maintien décale encore au bord de la chaussée`, state.changes.slice(atEdge));
    // La relâche arrête tout, définitivement.
    releaseKey(state, mainKey);
    run(state, 0.6);
    if (state.changes.length !== atEdge) fail(`[${city.id}] des écarts fantômes après la relâche`, state.changes.slice(atEdge));
  }

  // ── 3. La répétition native du clavier n'accélère rien ────────────────────
  {
    const state = startScenario();
    pressKey(state, mainKey);
    // Le système renvoie l'événement à chaque image tant que la touche reste
    // enfoncée : le moteur l'ignore (`event.repeat`) et garde son calendrier.
    run(state, 0.5, () => fireKey('keydown', mainKey, { repeat: true }));
    const expected = Math.min(room, changesWithin(0.5));
    if (state.changes.length !== expected) {
      fail(`[${city.id}] la répétition native change le calendrier (${state.changes.length} écarts, attendu ${expected})`, state.changes);
    }
    checkSchedule(state, 'répétition native');
    checkDirection(state, mainDirection, 'répétition native');
    releaseKey(state, mainKey);
  }

  // ── 4. Les deux flèches enfoncées : la dernière pressée gagne ─────────────
  {
    const state = startScenario();
    pressKey(state, mainKey);
    run(state, FIRST_DELAY + 0.06); // l'écart immédiat, puis celui du délai
    const beforeFlip = world.lane;
    const logged = state.changes.length;
    pressKey(state, otherKey); // l'autre flèche s'ajoute, la première reste enfoncée
    if (world.lane !== beforeFlip - step) {
      fail(`[${city.id}] la seconde flèche ne reprend pas la main immédiatement`, { beforeFlip, lane: world.lane });
    }
    run(state, FIRST_DELAY + INTERVAL + 0.1);
    const flipped = state.changes.slice(logged);
    if (flipped.length < 3) fail(`[${city.id}] le maintien ne suit pas la dernière flèche pressée`, flipped);
    checkDirection(state, otherDirection, 'dernière flèche pressée', logged);
    // Relâcher la dernière rend la main à celle qui reste enfoncée.
    releaseKey(state, otherKey);
    const beforeHandBack = state.changes.length;
    run(state, INTERVAL * 2 + 0.1);
    const handedBack = state.changes.slice(beforeHandBack);
    if (!handedBack.length) fail(`[${city.id}] relâcher une flèche arrête le maintien de l'autre`, state.changes);
    checkDirection(state, mainDirection, 'flèche encore enfoncée', beforeHandBack);
    // Les deux relâches arrêtent tout.
    releaseKey(state, mainKey);
    const afterRelease = state.changes.length;
    run(state, 0.6);
    if (state.changes.length !== afterRelease) fail(`[${city.id}] le maintien survit aux deux relâches`, state.changes.slice(afterRelease));
  }

  // ── 5. Q et D tiennent les mêmes directions que les flèches ───────────────
  {
    const azerty = mainDirection === 'left' ? 'q' : 'd';
    const azertyOther = otherDirection === 'left' ? 'q' : 'd';
    const state = startScenario();
    pressKey(state, azerty);
    run(state, FIRST_DELAY + 0.06); // l'écart immédiat, puis celui du délai
    if (state.changes.length !== 2) fail(`[${city.id}] « ${azerty} » maintenu n'enchaîne pas les écarts`, state.changes);
    checkSchedule(state, `maintien de ${azerty}`);
    checkDirection(state, mainDirection, `maintien de ${azerty}`);
    // La flèche et sa lettre tiennent la même direction : la seconde touche ne
    // relance ni écart immédiat, ni délai, ni cadence plus serrée — le
    // calendrier continue comme si elle n'avait pas été pressée.
    pressKey(state, mainKey);
    if (world.lane !== state.changes.at(-1).to) {
      fail(`[${city.id}] flèche + lettre sur la même direction font deux écarts`, { lane: world.lane, changes: state.changes });
    }
    run(state, INTERVAL + 0.05);
    if (state.changes.length !== 3) {
      fail(`[${city.id}] flèche + lettre sur la même direction doublent la cadence`, state.changes);
    }
    checkSchedule(state, `maintien de ${azerty} + flèche`);
    // Relâcher un doublon ne coupe pas le maintien : l'autre touche tient
    // toujours la même direction (Q relâché, ← encore enfoncé).
    releaseKey(state, mainKey);
    run(state, INTERVAL + 0.05);
    if (state.changes.length !== 4) {
      fail(`[${city.id}] relâcher un doublon coupe le maintien de l'autre touche`, state.changes);
    }
    checkSchedule(state, `maintien de ${azerty} après relâche de la flèche`);
    // Relâcher la dernière touche arrête tout.
    releaseKey(state, azerty);
    const afterBoth = state.changes.length;
    run(state, 0.5);
    if (state.changes.length !== afterBoth) fail(`[${city.id}] le maintien survit à la relâche de Q/D`, state.changes.slice(afterBoth));
    // La lettre opposée fonctionne aussi, en pression simple.
    const state2 = startScenario();
    pressKey(state2, azertyOther);
    releaseKey(state2, azertyOther);
    run(state2, 0.6);
    if (state2.changes.length !== 1 || state2.changes[0].to !== startLane - step) {
      fail(`[${city.id}] « ${azertyOther} » ne décale pas d'une voie vers ${otherDirection}`, state2.changes);
    }
  }

  // ── 6. Hors course : aucune touche ne reste coincée ───────────────────────
  {
    // Compte à rebours : le moteur n'est pas actif, la touche ne fait rien — et
    // ne doit pas se déclencher toute seule au feu vert.
    world.reset();
    world.setPhase('countdown');
    const before = world.lane;
    fireKey('keydown', mainKey);
    for (let index = 0; index < 30; index += 1) stepFrame();
    if (world.lane !== before) fail(`[${city.id}] la touche agit pendant le compte à rebours`, { before, after: world.lane });
    world.setPhase('playing');
    world.start();
    for (let index = 0; index < 40; index += 1) stepFrame();
    if (world.lane !== before) fail(`[${city.id}] une touche tenue au compte à rebours décale au feu vert`, { before, after: world.lane });
    fireKey('keyup', mainKey);

    // Pause : le maintien s'arrête et ne repart pas à la reprise.
    const state = startScenario();
    pressKey(state, mainKey);
    run(state, FIRST_DELAY + 0.06);
    world.pause();
    const atPause = state.changes.length;
    run(state, 0.8);
    if (state.changes.length !== atPause) fail(`[${city.id}] le maintien continue en pause`, state.changes.slice(atPause));
    world.start();
    run(state, 0.8);
    if (state.changes.length !== atPause) fail(`[${city.id}] le maintien repart tout seul après la pause`, state.changes.slice(atPause));
    releaseKey(state, mainKey);
    // Une nouvelle pression répond de nouveau.
    pressKey(state, mainKey);
    releaseKey(state, mainKey);
    run(state, 0.3);
    if (state.changes.length !== atPause + 1) fail(`[${city.id}] le volant ne répond plus après la pause`, state.changes.slice(atPause));

    // Fenêtre perdue (Alt-Tab) : la touche lâche tout, comme la pause.
    const state2 = startScenario();
    pressKey(state2, mainKey);
    run(state2, FIRST_DELAY + 0.06);
    loseFocus();
    const atBlur = state2.changes.length;
    run(state2, 0.8);
    if (state2.changes.length !== atBlur) fail(`[${city.id}] le maintien continue après la perte de la fenêtre`, state2.changes.slice(atBlur));
    releaseKey(state2, mainKey);
  }

  world.destroy();
  console.log(`[${city.id}] OK — départ voie ${startLane}, maintien vers la ${mainDirection} : ${room} écarts (délai ${FIRST_DELAY} s puis ${INTERVAL} s), relâche nette, Q/D alignés, aucune touche coincée`);
}
console.log('VÉRIF MAINTIEN DES FLÈCHES OK');
