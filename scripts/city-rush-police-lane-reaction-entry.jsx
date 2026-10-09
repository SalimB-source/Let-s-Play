// Vérif « la police suit l'écart de voie avec une seconde de retard » : le
// contrat du délai de réaction latérale (`CITY_RUSH_POLICE_LANE_REACTION_DELAY`),
// mesuré sur de vraies courses.
//
// En mode Poursuite (escouade en piste dès le départ), le pilote change de voie
// toutes les ~1,3 s dès qu'une berline roule près de lui. Pour chaque écart, on
// regarde les berlines **engagées** — à moins de 45 m, dans la voie du pilote ou
// une voie à côté — et on mesure le temps que met la première d'entre elles à se
// rabattre d'une voie vers la nouvelle voie du pilote :
//   · la **médiane** de ces réactions doit atteindre le délai des règles — la
//     fenêtre pendant laquelle le pilote peut surprendre l'escouade et la
//     dépasser, au lieu d'être suivi à la trace ;
//   · la poursuite doit **quand même converger** : une majorité d'écarts sont
//     suivis dans les trois secondes, le délai ne gèle pas la chasse (un nouvel
//     écart ne relance pas le minuteur).
//
// Le hasard est figé (graine fixe) : la vérif rejoue les mêmes courses.
const BASE_SEED = Number(process.env.CITY_RUSH_POLICE_REACTION_SEED || 20261009) >>> 0;
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
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS, cityRushLaneConfig,
  cityRushCarMaxHealth,
  CITY_RUSH_POLICE_LANE_REACTION_DELAY, CITY_RUSH_POLICE_PURSUIT_REFLEX,
} = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_POLICE_REACTION_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const runsArg = process.argv.find((a) => a.startsWith('--runs='))?.slice(7);
const RUNS = Math.max(1, Number(process.env.CITY_RUSH_POLICE_REACTION_RUNS || runsArg || 2));
const VERBOSE = process.env.CITY_RUSH_POLICE_REACTION_VERBOSE === '1';
// Deux tours suffisent : l'escouade est en piste dès le départ en mode Poursuite.
const TEST_LAPS = Math.min(CITY_RUSH_LAPS, 2);

// ── Ce que la vérif mesure ──────────────────────────────────────────────────
// Une berline **engagée** a le pilote pour cible (`targetId`), roule dans sa
// voie et à moins de 60 m de lui : c'est la seule dont le rabattement se voie,
// une unité réservée à un rival ne réagit pas à notre écart. Après chaque écart, on attend
// `HOLD_SECONDS` avant le suivant, pour mesurer un délai isolé — et pour que la
// berline ait le temps de venir, sinon on ne mesurerait qu'un pilote qui
// zigzague plus vite que la poursuite.
const ENGAGE_RANGE = 60;
const HOLD_SECONDS = 3;
const STEER_EVERY_FRAMES = Math.round((HOLD_SECONDS + 1) * 30);
// Plancher du délai : une berline ne peut pas se rabattre avant la fin de sa
// seconde de réaction (marge d'une image).
const FREEZE_FLOOR = CITY_RUSH_POLICE_LANE_REACTION_DELAY - 0.1;
// Fenêtre de convergence : délai de réaction + minuteur de décision de la
// berline (0,34 à 0,58 s) + une voie à parcourir. Au-delà, l'écart est compté
// « non suivi ».
const FOLLOW_CAP = 4;
const MIN_EVENTS = 4;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

let races = 0;
// Deux séries : `reactions`, le temps que met une berline qui tenait la voie du
// pilote à le suivre dans la nouvelle (le délai se lit là) ; `follows`, le temps
// que met une berline quelconque de la poursuite à se retrouver dans sa voie (la
// convergence se lit là — une berline restée derrière ne se rabat pas toujours,
// une voiture de course devant elle la dissuade de s'y coller).
const reactions = [];
const reactedWho = [];
const follows = [];
const violations = [];

for (let run = 0; run < RUNS; run += 1) {
  seed = (BASE_SEED + run * 7919) >>> 0;
  for (const city of cities) {
    // La coque la plus solide du garage : la vérif mesure des écarts de voie,
    // pas la survie du pilote, et une course qui s'arrête à la première rafale
    // ne laisserait rien à mesurer.
    const car = [...CITY_RUSH_CARS]
      .sort((a, b) => cityRushCarMaxHealth(b) - cityRushCarMaxHealth(a))[0];
    // Les voies du parcours (le Ring n'en a que deux) : le pilote automatique
    // reste dans le sens de la course.
    const lanes = cityRushLaneConfig(city);
    const callbacks = { errors: [], huds: [], finish: null };
    const audioStub = new Proxy({}, { get: () => () => {} });
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
      error: (e) => { callbacks.errors.push(e); console.error('CALLBACK ERROR:', e); },
      hud: (h) => { callbacks.huds.push(h); },
      finish: (r) => { callbacks.finish = r; },
      effect: () => {},
    }), car.id, { current: audioStub }, null, TEST_LAPS, true);

    world.setPhase('countdown');
    for (let i = 0; i < 95; i += 1) stepFrame();
    world.setPhase('playing');
    world.start();

    let frames = 0;
    const maxFrames = 240 * 60;
    let steerDir = 1;
    let steersIssued = 0;
    let runEvents = 0;
    const openEvents = [];

    while (!callbacks.finish && frames < maxFrames) {
      const before = callbacks.huds.at(-1);
      const beforeLane = before ? before.playerLane : null;
      // Un coup de volant isolé, puis la voie est tenue : c'est le délai de la
      // berline qu'on mesure, pas un balayage permanent.
      if (frames >= 90 && frames % STEER_EVERY_FRAMES === 0 && before) {
        const playerDistance = Number(before.distance) || 0;
        const engaged = (before.police || []).some((police) => (
          police.targetId === 'player'
          && Number(police.lane) === beforeLane
          && Math.abs((Number(police.rawDistance) || 0) - playerDistance) <= ENGAGE_RANGE
        ));
        let nextLane = before.playerLane + steerDir;
        if (!lanes.forwardLanes.includes(nextLane)) {
          steerDir = -steerDir;
          nextLane = before.playerLane + steerDir;
        }
        if (engaged && lanes.forwardLanes.includes(nextLane)) {
          world.action(nextLane < before.playerLane ? 'left' : 'right');
          steersIssued += 1;
        }
      }
      stepFrame();
      const hud = callbacks.huds.at(-1);
      frames += 1;
      if (!hud) continue;
      const now = virtualNow;
      const playerDistance = Number(hud.distance) || 0;
      const rows = (hud.police || []).map((police) => ({
        id: police.id,
        lane: Number(police.lane),
        gap: (Number(police.rawDistance) || 0) - playerDistance,
      }));

      // L'écart a eu lieu : on ouvre le dossier des berlines qui tenaient la
      // voie du pilote, jugées sur l'image d'avant (celle qu'elles avaient en
      // main). Pour chacune, on attend qu'elle entre dans la nouvelle voie.
      // Le HUD n'est émis que toutes les 100 ms (`emitHud`) : la ligne de base
      // des berlines est donc prise sur **cette** image, la même que celle qui
      // révèle l'écart, et non sur la précédente — sinon une berline qui avait
      // changé de voie avant l'écart passait pour une réaction instantanée.
      if (beforeLane !== null && beforeLane !== hud.playerLane && before) {
        // Deux motifs ne relèvent pas du choix de voie et sont écartés : la
        // charge de face des SUV à cinq étoiles, qui verrouille la voie du
        // pilote par conception (`cityRushSuvChargeLocked`), et la patrouille
        // du contresens en demi-tour après un choc frontal.
        const hunting = (hud.police || [])
          .filter((police) => police.targetId === 'player'
            && !police.turnedAround
            && !String(police.id).startsWith('rally-suv-charge')
            && Math.abs((Number(police.rawDistance) || 0) - playerDistance) <= ENGAGE_RANGE);
        const engaged = hunting
          .filter((police) => Number(police.lane) === beforeLane)
          .map((police) => ({ id: police.id, reactedAt: null }));
        if (engaged.length) {
          openEvents.push({
            at: now,
            engaged,
            // Convergence : seulement les berlines qui n'y sont pas déjà.
            hunting: hunting
              .filter((police) => Number(police.lane) !== hud.playerLane)
              .map((police) => ({ id: police.id, followedAt: null })),
            newLane: hud.playerLane,
          });
          runEvents += 1;
        }
      }

      for (const event of openEvents) {
        if (event.closed) continue;
        // `virtualNow` est en millisecondes : la réaction, elle, se lit en
        // secondes, comme le délai des règles.
        const elapsed = (now - event.at) / 1000;
        for (const unit of event.engaged) {
          if (unit.reactedAt !== null) continue;
          const row = rows.find((candidate) => candidate.id === unit.id);
          if (!row || !Number.isFinite(row.lane)) continue;
          if (row.lane === event.newLane) { unit.reactedAt = elapsed; unit.reactedId = row.id; }
        }
        for (const unit of event.hunting) {
          if (unit.followedAt !== null) continue;
          const row = rows.find((candidate) => candidate.id === unit.id);
          if (!row || !Number.isFinite(row.lane)) continue;
          if (row.lane === event.newLane) unit.followedAt = elapsed;
        }
        if (elapsed > FOLLOW_CAP) {
          event.closed = true;
          const fastest = event.engaged.reduce((best, unit) => ((unit.reactedAt ?? FOLLOW_CAP) < (best.reactedAt ?? FOLLOW_CAP) ? unit : best), event.engaged[0]);
          reactedWho.push(`${(fastest.reactedAt ?? FOLLOW_CAP).toFixed(2)}:${fastest.reactedId || 'aucune'}`);
          reactions.push(Math.min(...event.engaged.map((unit) => unit.reactedAt ?? FOLLOW_CAP)));
          follows.push(event.hunting.length
            ? Math.min(...event.hunting.map((unit) => unit.followedAt ?? FOLLOW_CAP))
            : FOLLOW_CAP);
        }
      }
    }

    races += 1;
    if (VERBOSE) {
      const end = callbacks.finish ? (callbacks.finish.destroyed ? 'épave' : 'arrivée') : 'inachevée';
      console.log(`[${city.id}#${run}] ${(frames / 30).toFixed(0)} s (${end}) · ${steersIssued} coup(s) de volant · ${runEvents} écart(s) mesuré(s) · rabattements ${(reactedWho.slice(-runEvents).join(' ')) || '—'} · voies reprises ${(follows.slice(-runEvents).map((t) => t.toFixed(2)).join(' ')) || '—'}`);
    }
    if (callbacks.errors.length) violations.push(`[${city.id}#${run}] erreurs`, callbacks.errors);
    world.destroy();
  }
}

const measuredEvents = reactions.length;
if (measuredEvents < MIN_EVENTS) {
  violations.push(`trop peu d'écarts mesurés (${measuredEvents} sur ${MIN_EVENTS} attendus) : la vérif n'a rien pu conclure`);
}
// Le délai se lit sur les berlines qui sont **effectivement revenues** : une
// berline restée dans son coin (valeur au plafond) ne prouve rien, ni pour le
// délai ni contre lui.
const reacted = reactions.filter((time) => time < FOLLOW_CAP);
const medianReaction = reacted.length ? median(reacted) : 0;
if (reacted.length < 2) {
  violations.push(`trop peu de berlines revenues (${reacted.length}) : le délai de réaction n'a pas pu être mesuré`);
}
if (medianReaction && medianReaction < FREEZE_FLOOR) {
  violations.push(`la police suit l'écart de voie trop vite : médiane ${medianReaction.toFixed(2)} s pour un délai des règles de ${CITY_RUSH_POLICE_LANE_REACTION_DELAY} s`);
}
const medianFollow = measuredEvents ? median(follows) : FOLLOW_CAP;
if (measuredEvents && medianFollow > FOLLOW_CAP) {
  violations.push(`la poursuite ne converge plus : aucune berline ne reprend la voie du pilote sous ${FOLLOW_CAP} s (médiane ${medianFollow.toFixed(2)} s)`);
}

if (violations.length) {
  fail(`${violations.length} entorse(s) au contrat du délai de réaction latérale`, {
    races,
    measuredEvents,
    revenus: reacted.length,
    medianReaction,
    medianFollow,
    rabattements: reactions.map((t) => Number(t.toFixed(2))),
    voiesReprises: follows.map((t) => Number(t.toFixed(2))),
    violations: violations.slice(0, 6),
  });
}
console.log(`VÉRIF RÉACTION POLICE OK — ${races} course(s), ${measuredEvents} écart(s) de voie mesuré(s), ${reacted.length} berline(s) revenues : médiane de rabattement ${medianReaction.toFixed(2)} s (délai des règles ${CITY_RUSH_POLICE_LANE_REACTION_DELAY} s + minuteur de décision, réflexe de poursuite ${CITY_RUSH_POLICE_PURSUIT_REFLEX} s), la poursuite reprend la voie du pilote en ${medianFollow.toFixed(2)} s (graine ${BASE_SEED}).`);
process.exit(0);
