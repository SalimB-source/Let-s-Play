// Vérification du tour guidé « Vice City Rush » : le monde est construit pour
// de vrai (faux WebGLRenderer) en mode tutoriel, puis la boucle est pompée à
// 30 Hz **sans jamais appeler `world.action`** — la voiture doit jouer les dix
// mini-tutos toute seule, chacun se terminer par un tic vert après avoir
// réellement effectué son action en piste, et la police ne doit apparaître
// qu'à partir de la leçon des tirs.
//   node scripts/city-rush-tutorial-run-check.mjs
//   CITY_RUSH_TUTORIAL_SEED=42 node scripts/city-rush-tutorial-run-check.mjs
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
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-tutorial-check', maxTouchPoints: 0 }, configurable: true });
globalThis.self = globalThis;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

// rAF piloté manuellement : frames à 30 Hz, temps virtuel.
const rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
let virtualFrame = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  cityRushRaceDistance,
} = await import('../src/games/cityRushRules.js');
const {
  CITY_RUSH_TUTORIAL_LESSON_IDS,
  CITY_RUSH_TUTORIAL_POLICE_FROM_ID,
  CITY_RUSH_TUTORIAL_STEP_DURATION_MS,
} = await import('../src/games/cityRushTutorial.js');

const FRAME_MS = 1000 / 30;
const MAX_FRAMES = 30 * 300; // 5 minutes virtuelles : large marge
// Trois tirages par défaut : le trafic, les bonus et les mires de police sont
// aléatoires — un tour guidé ne doit se terminer que par chance.
const SEEDS = process.env.CITY_RUSH_TUTORIAL_SEED
  ? [(Number(process.env.CITY_RUSH_TUTORIAL_SEED) >>> 0) || 1]
  : [7, 42, 2026];

const ACTION_BY_ID = {
  steering: 'steer',
  speed: 'clean-line',
  magazine: 'shoot',
  boost: 'boost',
  bazooka: 'bazooka',
  police: 'dodge',
  garage: 'garage',
  health: 'health',
  ramp: 'ramp',
  modes: 'debrief',
};

const seedRandom = (seed) => {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const stepFrame = () => {
  const queue = [...rafQueue.values()];
  rafQueue.clear();
  virtualFrame += 1;
  virtualNow += FRAME_MS;
  for (const cb of queue) cb(virtualNow);
};

const seconds = (value) => `${(value / 1000).toFixed(1)} s`;

class TutorialFailure extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

function runTour(seed) {
  seedRandom(seed);
  const city = CITY_RUSH_COURSES.find((course) => course.id === 'vice-city') || CITY_RUSH_COURSES[0];
  const car = CITY_RUSH_CARS[0];
  const callbacks = { huds: [], effects: [], pickups: [], lessons: [], finishes: [] };
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

  const world = createCityRushWorld(mount, city, () => ({
    hud: (hud) => callbacks.huds.push(hud),
    pickup: (pickup) => callbacks.pickups.push(pickup),
    effect: (effect) => callbacks.effects.push(effect),
    tutorial: (event) => callbacks.lessons.push({ ...event, frame: virtualFrame, at: virtualNow }),
    finish: (result) => callbacks.finishes.push({ ...result, frame: virtualFrame }),
  }), car.id, null, null, 1, false, 'laps', null, true);

  try {
    world.setPhase('playing');
    world.start();

    const firstFrame = virtualFrame;
    while (!callbacks.finishes.length && virtualFrame - firstFrame < MAX_FRAMES) stepFrame();
    const driven = virtualNow;

    const fail = (message, detail) => { throw new TutorialFailure(message, detail); };
    const assertLessonOrder = (actual, label) => {
      const same = actual.length === CITY_RUSH_TUTORIAL_LESSON_IDS.length
        && actual.every((id, index) => id === CITY_RUSH_TUTORIAL_LESSON_IDS[index]);
      if (!same) fail(`${label} dans le désordre`, { attendu: CITY_RUSH_TUTORIAL_LESSON_IDS, obtenu: actual });
    };

    // ── 1. La démonstration joue les dix leçons, dans l'ordre ────────────
    const starts = callbacks.lessons.filter((event) => event.type === 'lesson-start');
    const ticks = callbacks.lessons.filter((event) => event.type === 'lesson-complete');
    const completions = callbacks.lessons.filter((event) => event.type === 'complete');
    if (starts.length !== CITY_RUSH_TUTORIAL_LESSON_IDS.length) {
      fail(`la démonstration a lancé ${starts.length} leçons sur ${CITY_RUSH_TUTORIAL_LESSON_IDS.length}`, starts.map((event) => event.id));
    }
    if (ticks.length !== CITY_RUSH_TUTORIAL_LESSON_IDS.length) {
      fail(`la démonstration a réussi ${ticks.length} leçons sur ${CITY_RUSH_TUTORIAL_LESSON_IDS.length}`, ticks.map((event) => event.id));
    }
    if (completions.length !== 1) fail('le tour guidé ne s’est pas terminé', completions);
    assertLessonOrder(starts.map((event) => event.id), 'leçons lancées');
    assertLessonOrder(ticks.map((event) => event.id), 'leçons réussies');

    // ── 2. Chaque tic vert vient d'une action réellement effectuée ───────
    // `lastAction` est publié par le moteur au moment exact de la réussite : il
    // porte l'action de la leçon, jamais celle d'une autre ni celle du chien de
    // garde qui aurait coupé court.
    for (const tick of ticks) {
      const expectedAction = ACTION_BY_ID[tick.id];
      if (expectedAction === 'debrief') continue;
      const hud = callbacks.huds.filter((entry) => entry.tutorial && entry.tutorial.lessonId === tick.id).at(-1);
      const lastAction = hud?.tutorial?.lastAction;
      if (lastAction !== expectedAction) {
        fail(`le tic vert de « ${tick.id} » ne suit pas l’action ${expectedAction}`, { lastAction, frame: tick.frame });
      }
    }

    // Preuves directes, en piste, de quelques actions :
    const effectsByType = (type) => callbacks.effects.filter((effect) => effect.type === type);
    const lanes = callbacks.huds.map((hud) => hud.playerLane).filter((lane) => Number.isFinite(lane));
    let laneChanges = 0;
    for (let index = 1; index < lanes.length; index += 1) if (lanes[index] !== lanes[index - 1]) laneChanges += 1;
    if (laneChanges < 2) fail('la voiture ne s’est pas décalée toute seule', laneChanges);
    if (!effectsByType('ramp-jump').length) fail('la démonstration n’a jamais pris de tremplin');
    if (!effectsByType('mini-garage-used').length) fail('la démonstration n’a pas traversé le mini-garage');
    if (callbacks.pickups.length < 2) fail('la démonstration n’a rien ramassé', callbacks.pickups.length);
    const boostSeen = callbacks.pickups.some((pickup) => pickup.type === 'boost');
    if (!boostSeen) fail('la démonstration n’a pas ramassé l’éclair vert');
    if (!effectsByType('bazooka-fired').length) fail('la démonstration n’a pas tiré de roquette');
    // La mitrailleuse : le chargeur rouge est ramassé, puis consommé par le tir
    // automatique de la démonstration — l'inventaire du HUD en porte la trace.
    const pistolTimeline = callbacks.huds.map((hud) => Number(hud.inventory?.pistol) || 0);
    if (Math.max(...pistolTimeline) <= 0) fail('la démonstration n’a jamais chargé la mitrailleuse');
    const shotFired = pistolTimeline.some((value, index) => index > 0 && pistolTimeline[index - 1] > 0 && value < pistolTimeline[index - 1]);
    if (!shotFired) fail('la démonstration n’a jamais tiré à l’AK-47');
    if (!effectsByType('police-aim').length) fail('la leçon police n’a produit aucune mire');

    // ── 3. La route reste vide de police jusqu'à la leçon des tirs ───────
    const policeFromIndex = CITY_RUSH_TUTORIAL_LESSON_IDS.indexOf(CITY_RUSH_TUTORIAL_POLICE_FROM_ID);
    const beforeShooting = callbacks.huds.filter((hud) => (hud.tutorial?.lessonIndex ?? 0) < policeFromIndex);
    if (!beforeShooting.length) fail('aucune image avant la leçon des tirs');
    const policeBefore = beforeShooting.filter((hud) => (hud.police || []).length > 0 || (hud.wantedLevel || 0) > 0);
    if (policeBefore.length) {
      fail(`la police apparaît avant la leçon des tirs (${policeBefore.length} images)`, {
        police: policeBefore[0].police?.length, stars: policeBefore[0].wantedLevel, distance: policeBefore[0].distance,
      });
    }
    const policeAfter = callbacks.huds.filter((hud) => (hud.tutorial?.lessonIndex ?? 0) >= policeFromIndex && (hud.police || []).length > 0);
    if (!policeAfter.length) fail('la police n’entre jamais en piste après la leçon des tirs');

    // ── 4. Chaque leçon a tenu sa fiche au moins le temps de lecture ─────
    for (let index = 0; index < ticks.length; index += 1) {
      const hold = ticks[index].at - starts[index].at;
      if (hold < CITY_RUSH_TUTORIAL_STEP_DURATION_MS - 40) {
        fail(`la fiche « ${ticks[index].id} » n’est restée que ${seconds(hold)}`);
      }
    }

    // ── 5. La course d'entraînement se termine, sur la ligne ─────────────
    const finish = callbacks.finishes[0];
    if (!finish) fail('la course d’entraînement ne s’est jamais terminée');
    if (finish.rank !== 1) fail('le pilote seul de l’entraînement n’est pas premier', finish.rank);
    if (finish.racers.length !== 1) fail('la course d’entraînement n’est pas solo', finish.racers.map((racer) => racer.id));
    const raceDistance = cityRushRaceDistance(1);
    if (finish.distance < raceDistance - 5) {
      fail(`la course d’entraînement s’est arrêtée avant l’arrivée (${finish.distance} m sur ${raceDistance})`);
    }

    return {
      ticks: ticks.length,
      duration: seconds(driven),
      frames: virtualFrame - firstFrame,
      distance: finish.distance,
    };
  } finally {
    world.destroy();
  }
}

const reports = [];
let failures = 0;
for (const seed of SEEDS) {
  try {
    reports.push({ seed, ...runTour(seed) });
  } catch (error) {
    failures += 1;
    console.error(`ÉCHEC (graine ${seed}) : ${error.message}`);
    if (error.detail !== undefined) console.error(error.detail);
    if (!(error instanceof TutorialFailure)) console.error(error.stack || error);
  }
}

if (failures) {
  console.error(`check:city-rush-tutorial-run ✗ — ${failures} tirage(s) sur ${SEEDS.length} n’ont pas joué le tour guidé jusqu’au bout.`);
  process.exit(3);
}
const summary = reports.map((report) => `graine ${report.seed} : ${report.ticks} tics en ${report.duration} (${report.distance} m, ${report.frames} images)`).join(' · ');
console.log(`check:city-rush-tutorial-run ✓ — la voiture joue seule les ${reports[0].ticks} mini-tutos, chacun validé en piste par son action, la police n’entre qu’à la leçon des tirs, et le tour se termine sur la ligne. ${summary}`);
