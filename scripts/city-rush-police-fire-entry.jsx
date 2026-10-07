// Vérif « le pilote perd de la vie sous les rafales » : le contrat de la
// poursuite, mesuré sur de vraies courses.
//
// Trois choses sont vérifiées, en mode Poursuite (escouade en piste dès le
// départ) avec un pilote qui garde sa voie — le pire cas, celui qui ne se
// décale jamais :
//   · la police **tire sur les pilotes** : au moins une rafale touche le
//     joueur, et la barre perd exactement une cellule par impact ;
//   · la police **ne se tire jamais dessus** : aucune berline n'est détruite
//     par une autre berline (l'escouade roule en file ; la liste des cibles
//     d'un tireur policier exclut la police) ;
//   · la fureur reste **lisible et esquivable** : une berline qui vise le
//     joueur annonce sa mire (`aim` dans le HUD) avant la rafale, et le temps
//     d'alignement est bien celui des règles.
//
// Le hasard est figé (graine fixe) : la vérif rejoue la même course.
const BASE_SEED = Number(process.env.CITY_RUSH_POLICE_FIRE_SEED || 20261005) >>> 0;
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
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LANE_X, CITY_RUSH_POWERS,
  CITY_RUSH_LAPS, CITY_RUSH_POLICE_AIM_TIME, cityRushCarMaxHealth,
  CITY_RUSH_POLICE_AIM_TOLERANCE, CITY_RUSH_POLICE_HEALTH, cityRushPoliceMaxHealth, cityRushPoliceAimHold,
  cityRushPoliceAimReady, cityRushHealthPickupRepair, cityRushMiniGarageRepair,
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
const all = process.argv.includes('--all') || process.env.CITY_RUSH_POLICE_FIRE_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const runsArg = process.argv.find((a) => a.startsWith('--runs='))?.slice(7);
const RUNS = Math.max(1, Number(process.env.CITY_RUSH_POLICE_FIRE_RUNS || runsArg || 2));
// Par défaut la poursuite démarre au premier mètre (le cas qui exerce le tir) ;
// `--circuit` rejoue le mode Circuit, escouade au dernier tour seulement.
const PURSUIT_FROM_START = !process.argv.includes('--circuit');
const VERBOSE = process.env.CITY_RUSH_POLICE_FIRE_VERBOSE === '1';
// Trois tours : assez pour que l'escouade trouve un bonus rouge et ouvre le
// feu, sans allonger la vérif.
const TEST_LAPS = Math.min(CITY_RUSH_LAPS, 3);
const isPoliceId = (id) => typeof id === 'string' && (id.startsWith('police') || id.startsWith('rally-'));

let races = 0;
let playerHits = 0;
let aimedFrames = 0;
let policeFriendlyFire = 0;
const violations = [];

for (let run = 0; run < RUNS; run += 1) {
  seed = (BASE_SEED + run * 7919) >>> 0;
  for (const city of cities) {
    // La supercar du garage : sept carrés de coque seulement (voir
    // `cityRushCarMaxHealth`), le pire cas pour la barre du pilote.
    const car = CITY_RUSH_CARS.at(-1);
    const carMaxHealth = cityRushCarMaxHealth(car);
    const callbacks = { errors: [], huds: [], effects: [], finish: null };
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
      effect: (e) => { callbacks.effects.push(e); },
    }), car.id, { current: audioStub }, null, TEST_LAPS, PURSUIT_FROM_START);

    const miniGarages = world.scene.children.filter((object) => object.name === 'city-rush-mini-garage');
    world.setPhase('countdown');
    for (let i = 0; i < 95; i += 1) stepFrame();
    if (miniGarages.some((garage) => garage.visible) || callbacks.huds.at(-1)?.miniGaragesActive) {
      violations.push(`[${city.id}#${run}] les garages apparaissent au compte à rebours en Poursuite`);
    }
    world.setPhase('playing');
    world.start();

    let frames = 0;
    const maxFrames = 240 * 60;
    let health = carMaxHealth;
    let lastHealth = null;
    let runAimFrames = 0;
    while (!callbacks.finish && frames < maxFrames) {
      const hud = callbacks.huds.at(-1);
      if (hud) {
        if (Number.isFinite(Number(hud.playerHealth))) lastHealth = Number(hud.playerHealth);
        // Une berline qui vise le joueur : la mire doit être annoncée et
        // progresser d'après les règles, jamais d'un coup.
        for (const police of hud.police || []) {
          if (police.aimTargetId !== 'player' || !(Number(police.aim) > 0)) continue;
          runAimFrames += 1;
          if (Number(police.aim) > 1) {
            violations.push(`[${city.id}#${run}] la mire dépasse 1 (${police.aim})`);
          }
          if (!cityRushPoliceAimReady(police.aim * CITY_RUSH_POLICE_AIM_TIME - 0.001)
            && police.aim >= 1) {
            violations.push(`[${city.id}#${run}] rafale tirée sans alignement complet`);
          }
        }
      }
      // Pilote du pire cas : il ne se décale jamais (il reste dans sa voie).
      stepFrame();
      const nextHud = callbacks.huds.at(-1);
      // L'unique porte est celle de mi-course : elle se dresse au milieu du
      // parcours. Une fois servie, le compteur ne doit plus se rallumer.
      const midRaceUsed = callbacks.effects.some((effect) => effect.type === 'mini-garage-used');
      if (midRaceUsed && nextHud?.miniGaragesActive) {
        violations.push(`[${city.id}#${run}] le compteur reste allumé après le passage au mini-garage en Poursuite`);
      }
      frames += 1;
    }
    aimedFrames += runAimFrames;

    const hits = callbacks.effects.filter((effect) => effect.type === 'player-hit');
    playerHits += hits.length;
    // Chaque impact retire exactement une cellule, et le HUD suit la barre.
    let tracked = carMaxHealth;
    let healthSeries = null;
    for (const effect of callbacks.effects) {
      if (effect.type === 'player-health') {
        tracked = effect.health;
        if (effect.maxHealth !== carMaxHealth) {
          violations.push(`[${city.id}#${run}] la barre ne démarre pas à ${carMaxHealth} cellules (coque de ${car.name})`);
        }
        healthSeries = effect.health;
        continue;
      }
      if (effect.type === 'player-health-pickup') {
        // Le « + » rouge répare la coque réelle ; le prochain tir doit donc
        // être comparé au nouveau stock de vie, pas à la valeur avant pickup.
        if (effect.healthBefore !== tracked
          || effect.health !== cityRushHealthPickupRepair(tracked, carMaxHealth)) {
          violations.push(`[${city.id}#${run}] le bonus de vie ne répare pas la coque du pilote`, effect);
        }
        tracked = effect.health;
        continue;
      }
      if (effect.type === 'mini-garage-used') {
        // L'unique porte est celle de mi-course : elle répare la coque réelle,
        // une seule fois par course, sans jamais dépasser sa résistance.
        if (effect.healthBefore !== tracked
          || effect.health !== cityRushMiniGarageRepair(tracked, carMaxHealth)) {
          violations.push(`[${city.id}#${run}] le garage ne répare pas la coque du pilote`, effect);
        }
        tracked = effect.health;
        continue;
      }
      if (effect.type !== 'player-hit') continue;
      const maximumDamage = effect.source === 'suv-collision' ? 2 : 1;
      const expectedDamage = Math.min(maximumDamage, Math.max(0, Number(tracked) || 0));
      const expectedHealth = Math.max(0, tracked - expectedDamage);
      if (effect.damage !== expectedDamage || effect.health !== expectedHealth) {
        violations.push(`[${city.id}#${run}] les dégâts de l’impact ne correspondent pas à sa catégorie`, JSON.stringify({ tracked, expectedDamage, effect }));
      }
      tracked = effect.health;
    }
    if (lastHealth !== null && lastHealth !== tracked) {
      violations.push(`[${city.id}#${run}] le HUD de vie ne suit pas les impacts`, { lastHealth, tracked });
    }
    // Aucune berline détruite par une autre berline : les tirs de la police ne
    // prennent pour cibles que les pilotes (le bug de tir ami vidait les
    // chargeurs dans le pare-chocs de la berline précédente).
    for (const effect of callbacks.effects) {
      if (effect.type !== 'police-destroyed') continue;
      if (isPoliceId(effect.attackerId)) {
        policeFriendlyFire += 1;
        violations.push(`[${city.id}#${run}] une berline a détruit une autre berline`, effect);
      }
      if (!Number.isFinite(effect.maxHealth) || effect.maxHealth !== cityRushPoliceMaxHealth(effect.vehicleType)) {
        violations.push(`[${city.id}#${run}] une berline n’a pas ses six cases de vie`, effect);
      }
    }
    if (callbacks.errors.length) violations.push(`[${city.id}#${run}] erreurs`, callbacks.errors);
    races += 1;
    if (VERBOSE) {
      console.log(`[${city.id}#${run}] ${(frames / 30).toFixed(0)} s · impacts joueur ${hits.length} · mire ${runAimFrames} images · vie finale ${tracked} · destructions ${callbacks.effects.filter((e) => e.type === 'police-destroyed').length}`);
    }
    world.destroy();
  }
}

// Le cœur du contrat : sous les rafales, le pilote perd bien des carrés.
if (!playerHits) violations.push('aucune rafale n’a touché le pilote en poursuite');
// …mais la mire est annoncée avant chaque rafale, sinon le danger serait
// invisible et l'esquive impossible.
if (!aimedFrames) violations.push('aucune berline n’a annoncé sa mire au joueur');
if (policeFriendlyFire) violations.push('des tirs entre berlines ont eu lieu');

if (violations.length) fail(`${violations.length} entorse(s) au contrat du tir policier`, { races, playerHits, aimedFrames, violations: violations.slice(0, 8) });
console.log(`VÉRIF TIR POLICE OK — ${races} course(s) en poursuite, ${playerHits} impact(s) sur le pilote, ${aimedFrames} image(s) de mire annoncée, aucune berline détruite par une autre (mire ${CITY_RUSH_POLICE_AIM_TIME} s · tolérance latérale ${CITY_RUSH_POLICE_AIM_TOLERANCE} m · ${cityRushPoliceAimHold({ aim: 0, aligned: true, dt: CITY_RUSH_POLICE_AIM_TIME })} · police ${CITY_RUSH_POLICE_HEALTH} carrés · graine ${BASE_SEED}).`);
process.exit(0);
