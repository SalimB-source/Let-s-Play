// Vérif d'intégration des armes Vice City Rush : seuls les bonus rouges et les
// boosts sont collectables, les voitures non policières n'utilisent pas d'autre
// tir ; l'attaque d'hélicoptère est absente. Le scénario rejoue aussi une course
// pour vérifier que reset() ne réactive pas cette frappe supprimée.

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

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS, CITY_RUSH_LANE_X,
  CITY_RUSH_POWER_RULES, CITY_RUSH_POWERS, CITY_RUSH_PICKUPS,
  CITY_RUSH_POLICE_COUNT,
  selectCityRushRacers,
} = await import('../src/games/cityRushRules.js');

const BASE_SEED = Number(process.env.CITY_RUSH_WEAPONS_SEED || process.env.CITY_RUSH_BLUE_SHOT_SEED || 20261004) >>> 0;
let seed = BASE_SEED;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff',
];
const cityArg = process.argv.find((arg) => arg.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_WEAPONS_ALL === '1' || process.env.CITY_RUSH_BLUE_SHOT_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((city) => city.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const RACE_LAPS = Math.max(3, Math.floor(Number(process.env.CITY_RUSH_WEAPONS_LAPS || process.env.CITY_RUSH_BLUE_SHOT_LAPS) || 3));
const RUNS = Math.max(1, Math.floor(Number(process.env.CITY_RUSH_WEAPONS_RUNS || process.env.CITY_RUSH_BLUE_SHOT_RUNS || process.argv.find((arg) => arg.startsWith('--runs='))?.slice(7) || 1)));
const VERBOSE = process.env.CITY_RUSH_WEAPONS_VERBOSE === '1';
const forbiddenShotEffects = new Set([
  'blue-shot-hit', 'blue-shot-hit-player', 'blue-shot-miss', 'rival-blue-shot',
  'rival-radio', 'radio-no-target', 'radio-busy',
]);

for (let run = 0; run < RUNS; run += 1) {
  for (const [cityIndex, city] of cities.entries()) {
    seed = (BASE_SEED + run * 7919 + cityIndex * 104729) >>> 0;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const car = CITY_RUSH_CARS[(cityIndex + run) % CITY_RUSH_CARS.length];
    const callbacks = { errors: [], huds: [], effects: [], pickups: [], finish: null };
    const audioCalls = {};
    const audioStub = {};
    for (const name of AUDIO_METHODS) audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
    const mount = {
      clientWidth: 1280, clientHeight: 720,
      getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
      appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
      ownerDocument: globalThis.document,
      querySelector: () => null,
      classList: { add() {}, remove() {} },
      style: {},
    };

    const roster = selectCityRushRacers({ cityId: city.id, carId: car.id, runId: run, playerDriverId: 'camila' });
    let world;
    try {
      // policeFromStart : vérifier l'absence de frappe d'hélicoptère dès le départ.
      world = createCityRushWorld(mount, city, () => ({
        error: (error) => { callbacks.errors.push(error); console.error('CALLBACK ERROR:', error); },
        hud: (hud) => { callbacks.huds.push(hud); },
        finish: (result) => { callbacks.finish = result; },
        effect: (effect) => { callbacks.effects.push(effect); },
        pickup: (pickup) => { callbacks.pickups.push(pickup); },
      }), car.id, { current: audioStub }, roster, RACE_LAPS, true);
    } catch (error) {
      console.error(`[${city.id}] createCityRushWorld A LEVÉ :`);
      console.error(error);
      process.exit(1);
    }

    const scene = world.scene;
    const pickupSlots = [];
    scene.traverse((object) => {
      if (object.userData?.icon && object.userData?.ring && object.userData?.beam && object.userData?.halo) pickupSlots.push(object);
    });
    if (!pickupSlots.length) fail(`[${city.id}] aucun bonus trouvé dans la scène`);
    const runFrames = (count, label) => {
      for (let frame = 0; frame < count; frame += 1) {
        try { stepFrame(); } catch (error) {
          console.error(`[${city.id}] FRAME ${frame} (${label}) A LEVÉ :`);
          console.error(error);
          process.exit(1);
        }
      }
    };
    const startRace = () => {
      world.reset();
      world.setPhase('countdown');
      for (const count of [3, 2, 1]) { world.setCountdown(count); runFrames(8, `countdown ${count}`); }
      world.setCountdown(0);
      runFrames(8, 'go');
      world.setPhase('playing');
      world.start();
    };

    world.setPhase('intro');
    runFrames(12, 'intro');
    startRace();
    const firstRaceStart = callbacks.effects.length;
    const redType = CITY_RUSH_POWERS.PISTOL;
    let actionsDisabledChecked = false;
    let steeringCooldown = 0;
    const slotWorld = new THREE.Vector3();
    const laneOfX = (x) => {
      let lane = 0;
      let closest = Infinity;
      CITY_RUSH_LANE_X.forEach((laneX, index) => {
        const delta = Math.abs(laneX - x);
        if (delta < closest) { closest = delta; lane = index; }
      });
      return lane;
    };

    let frames = 0;
    // 12 minutes virtuelles : la course standard fait maintenant 8 400 m.
    const maxFrames = 30 * 720;
    while (!callbacks.finish && frames < maxFrames) {
      const hud = callbacks.huds.at(-1);
      if (hud && !actionsDisabledChecked) {
        // Le bleu et le tir d'hélicoptère ne sont plus des actions du pilote.
        world.action(CITY_RUSH_POWERS.BLUE_SHOT);
        world.action(CITY_RUSH_POWERS.RADIO);
        actionsDisabledChecked = true;
      }
      if (hud && (hud.inventory?.[redType] || 0) > 0) {
        world.action(redType);
      } else if (hud && steeringCooldown <= 0) {
        // Aller chercher un bonus rouge visible, sans jamais suivre un ancien
        // pickup bleu/jaune. Le boost au sol reste librement collectable.
        let best = null;
        for (const slot of pickupSlots) {
          if (!slot.visible || ![CITY_RUSH_PICKUPS.BOOST, redType].includes(slot.userData.type)) continue;
          slot.getWorldPosition(slotWorld);
          const ahead = (3.1 - slotWorld.z) / 0.72;
          if (ahead < 2 || ahead > 90) continue;
          const candidate = { ahead, lane: laneOfX(slotWorld.x), type: slot.userData.type };
          if (!best || (candidate.type === redType && best.type !== redType) || candidate.ahead < best.ahead) best = candidate;
        }
        if (best && best.lane !== hud.playerLane) {
          world.action(best.lane < hud.playerLane ? 'left' : 'right');
          steeringCooldown = 10;
        }
      }
      steeringCooldown = Math.max(0, steeringCooldown - 1);
      runFrames(1, `course f${frames}`);
      frames += 1;
    }
    if (!callbacks.finish) fail(`[${city.id}] arrivée jamais atteinte après ${(frames / 30).toFixed(0)} s virtuelles`);
    if (callbacks.errors.length) fail(`[${city.id}] erreurs remontées`, callbacks.errors);

    const firstRaceEffects = callbacks.effects.slice(firstRaceStart);
    const arrivals = firstRaceEffects.filter((effect) => effect.type === 'police-arrival');
    if (arrivals.length !== 1 || arrivals[0].count !== CITY_RUSH_POLICE_COUNT) {
      fail(`[${city.id}] l'escouade n'est pas arrivée exactement une fois`, arrivals);
    }
    const arrivalCars = arrivals[0]?.armed || [];
    if (arrivalCars.length !== CITY_RUSH_POLICE_COUNT || arrivalCars.some((police) => police[redType])) {
      fail(`[${city.id}] une berline arrive avec sa mitrailleuse déjà chargée`, arrivalCars);
    }
    if (arrivals[0].helicopterAvailable !== false) fail(`[${city.id}] l'attaque d'hélicoptère doit être désactivée`, arrivals[0]);

    const helicopterCalls = firstRaceEffects.filter((effect) => effect.type === 'radio' || effect.type === 'missile-hit');
    if (helicopterCalls.length) fail(`[${city.id}] une attaque d'hélicoptère a encore été déclenchée`, helicopterCalls);
    if (audioCalls.missileLaunch || audioCalls.helicopterStart || audioCalls.helicopterStop) {
      fail(`[${city.id}] un son d'attaque d'hélicoptère a encore été joué`, audioCalls);
    }
    const forbidden = firstRaceEffects.filter((effect) => forbiddenShotEffects.has(effect.type));
    if (forbidden.length) fail(`[${city.id}] un tir bleu ou un hélicoptère d'IA non policier a été déclenché`, forbidden);
    const unexpectedPickups = callbacks.pickups.filter((pickup) => ![CITY_RUSH_PICKUPS.BOOST, redType].includes(pickup.type));
    if (unexpectedPickups.length) fail(`[${city.id}] un pickup bleu/jaune a été collecté`, unexpectedPickups);
    const redPickups = callbacks.pickups.filter((pickup) => pickup.type === redType);
    if (redPickups.some((pickup) => pickup.chargeCost !== 7 || pickup.progress !== 7 || pickup.ammo !== 7)) {
      fail(`[${city.id}] un bonus rouge ne recharge pas les sept balles de la mitrailleuse`, redPickups);
    }
    if (!actionsDisabledChecked) fail(`[${city.id}] les actions interdites du pilote n'ont pas été vérifiées`);
    if (audioCalls.gunshot) fail(`[${city.id}] un tir bleu a encore joué le son de pistolet`, audioCalls);
    if (!audioCalls.machineGun) fail(`[${city.id}] la course n'a déclenché aucune rafale rouge`, audioCalls);
    if (audioCalls.missileLaunch || audioCalls.helicopterStart || audioCalls.helicopterStop) {
      fail(`[${city.id}] une attaque aérienne n'est pas totalement désactivée`, audioCalls);
    }
    // Le carré du carambolage est neutralisé par le lanceur (voir son en-tête) :
    // aucun `player-hit` de collision ne doit donc apparaître, et la barre reste
    // intacte pendant les six tours du pilote d'essai.
    const accidentalPlayerCollisionHits = firstRaceEffects.filter((effect) => effect.type === 'player-hit' && ['collision', 'suv-collision'].includes(effect.source));
    if (accidentalPlayerCollisionHits.length) {
      fail(`[${city.id}] un carambolage a retiré de la vie au joueur malgré la neutralisation du lanceur`, accidentalPlayerCollisionHits);
    }
    const ramHits = firstRaceEffects.filter((effect) => effect.type === 'police-hit' && ['collision', 'suv-collision'].includes(effect.source));
    if (ramHits.some((effect) => effect.damage !== 1)) {
      fail(`[${city.id}] un carambolage n'a pas retiré exactement un point à la police`, ramHits);
    }
    // Le tir rouge est une arme d'usure, jamais une frappe massive : chaque
    // balle qui touche une berline de police, un adversaire ou le pilote
    // n'emporte **qu'un seul carré**. Le `damage` remonté par un impact est le
    // delta réel de la barre de vie (`cityRushPoliceDamage`,
    // `cityRushPlayerDamage`) : l'exiger à 1 vérifie donc le barème jusque dans
    // le monde three.js, pas seulement dans les règles pures.
    const redHits = firstRaceEffects.filter((effect) => {
      if (effect.source !== redType) return false;
      return effect.type === 'police-hit' || effect.type === 'pistol' || effect.type === 'player-hit';
    });
    const redPoliceHits = redHits.filter((effect) => effect.type === 'police-hit');
    const redRacerHits = redHits.filter((effect) => effect.type === 'pistol');
    const redPlayerHits = redHits.filter((effect) => effect.type === 'player-hit');
    const fatRedHits = redHits.filter((effect) => Number(effect.damage) !== 1);
    if (fatRedHits.length) {
      fail(`[${city.id}] un tir rouge a retiré plus d'un carré (voiture de police, adversaire ou pilote)`, fatRedHits);
    }
    for (const effect of redHits) {
      const maxHealth = Number(effect.maxHealth);
      const health = Number(effect.health);
      if (!Number.isFinite(health) || !Number.isFinite(maxHealth) || health < 0 || health > maxHealth) {
        fail(`[${city.id}] un impact de tir rouge laisse une barre de vie hors de ses bornes`, effect);
      }
    }
    if (VERBOSE) {
      console.log(`[${city.id}] balles rouges : ${redPoliceHits.length} sur la police, ${redRacerHits.length} sur les pilotes, ${redPlayerHits.length} encaissées — 1 carré chacune`);
    }

    // reset() ne doit ni rappeler un hélicoptère, ni réactiver un ancien missile.
    const beforeReplay = callbacks.effects.length;
    startRace();
    runFrames(240, 'reset sans attaque aérienne');
    const replayEffects = callbacks.effects.slice(beforeReplay);
    const replayArrivals = replayEffects.filter((effect) => effect.type === 'police-arrival');
    const replayHelicopterCalls = replayEffects.filter((effect) => effect.type === 'radio' || effect.type === 'missile-hit');
    if (replayArrivals.length !== 1 || replayHelicopterCalls.length) {
      fail(`[${city.id}] reset() a réactivé une attaque aérienne`, { replayArrivals, replayHelicopterCalls });
    }
    if (audioCalls.missileLaunch || audioCalls.helicopterStart || audioCalls.helicopterStop) {
      fail(`[${city.id}] le rejeu a réactivé les sons d'attaque aérienne`, audioCalls);
    }
    const replayForbidden = replayEffects.filter((effect) => forbiddenShotEffects.has(effect.type));
    if (replayForbidden.length) fail(`[${city.id}] le replay a réactivé un tir supprimé`, replayForbidden);

    console.log(`[${city.id}#${run + 1}] OK · ${frames} frames · ${redPickups.length} bonus rouges rares · ${redPoliceHits.length} balle(s) rouge(s) sur la police à 1 carré chacune · attaque d'hélicoptère désactivée · reset validé`);
    if (VERBOSE) console.log(`[${city.id}] effets course :`, [...new Set(firstRaceEffects.map((effect) => effect.type))]);
    world.destroy();
  }
}

console.log(`VÉRIF ARMES VICE CITY RUSH OK — ${cities.length} ville(s) × ${RUNS} courses · ${RACE_LAPS} tours · aucune attaque d'hélicoptère`);
process.exit(0);
