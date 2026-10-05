// Vérif « épave de la coque » : barre de vie à zéro = course perdue.
//
// Reprend le vrai `createCityRushWorld` (faux WebGLRenderer), court une course
// standard de six tours avec l'escouade en piste dès le départ, et conduit le
// pilote le plus rapide en tête pour tester les contacts policiers sur le
// dernier tour : chaque carambolage abîme la police d'un point sans entamer la
// coque du joueur. Si un tir vide la barre, l'épave reste testée aussi.
//
// Si des tirs finissent par épuiser la coque, trois choses sont vérifiées
// image par image :
//   · la voiture **tourne sur elle-même** (lacet cumulé, deux tours complets) ;
//   · elle **fume** (le pool de fumée est visible) et **s'arrête** (vitesse 0) ;
//   · la course est **perdue** (fin de course `destroyed`, pilote dernier, pas
//     de distance totale parcourue) et l'épave ne se produit qu'au dernier tour.
// Si les tirs n'épuisent pas la coque, le smoke valide quand même les contacts :
// ils enlèvent un point de vie à la police, jamais au joueur.
//
// Le hasard est figé (graine fixe) : la vérif rejoue la même course.
const BASE_SEED = Number(process.env.CITY_RUSH_WRECK_SEED || 20261004) >>> 0;
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

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LANE_X, CITY_RUSH_POWERS,
  CITY_RUSH_LAPS,
} = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const { CITY_RUSH_WRECK_SECONDS, CITY_RUSH_PLAYER_HEALTH } = await import('../src/games/cityRushRules.js');

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_WRECK_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const RUNS = Math.max(1, Number(process.env.CITY_RUSH_WRECK_RUNS || (process.argv.find((a) => a.startsWith('--runs='))?.slice(7)) || 3));
const VERBOSE = process.env.CITY_RUSH_WRECK_VERBOSE === '1';

const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff',
];

let races = 0;
let wrecks = 0;
let violations = 0;
let policeRamHitsTotal = 0;

for (let run = 0; run < RUNS; run += 1) {
  seed = (BASE_SEED + run * 7919) >>> 0;
  for (const [index, city] of cities.entries()) {
    const car = CITY_RUSH_CARS.at(-1); // joueur volontairement en tête : la police vise sa voiture
    const callbacks = { errors: [], huds: [], effects: [], finish: null };
    const audioCalls = {};
    const audioStub = {};
    for (const name of AUDIO_METHODS) audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
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

    // Course standard plus longue : la coque s'active au dernier tour, tandis
    // que la Poursuite fait entrer la police dès les premiers mètres.
    const world = createCityRushWorld(mount, city, () => ({
      error: (e) => { callbacks.errors.push(e); console.error('CALLBACK ERROR:', e); },
      hud: (h) => { callbacks.huds.push(h); },
      finish: (r) => { callbacks.finish = r; },
      effect: (e) => { callbacks.effects.push(e); },
    }), car.id, { current: audioStub }, null, CITY_RUSH_LAPS, true);

    const scene = world.scene;
    let playerNode = null;
    let smokeNode = null;
    scene.traverse((object) => {
      if (object.userData?.kind === 'racer' && object.userData.player) playerNode = object;
      if (object.name === 'smoke') smokeNode = object;
    });
    if (!playerNode) fail('le cabriolet du pilote est introuvable dans la scène');
    if (!smokeNode) fail('le pool de fumée est introuvable dans la scène');
    const visibleSmoke = () => smokeNode.children.filter((child) => child.visible).length;

    world.setPhase('countdown');
    for (let i = 0; i < 95; i += 1) stepFrame(); // compte à rebours de 3,1 s
    world.setPhase('playing');
    world.start();

    let frames = 0;
    let wrecked = false;
    let wreckFrames = 0;
    let wreckSpinTurns = 0;
    let wreckSpinLast = 0;
    let wreckSmokeFrames = 0;
    let wreckSpeedSum = 0;
    let wreckLastMeasuredSpeed = null;
    let wreckFirstLap = null;
    let healthSeen = null;
    let maxFrames = 720 * 30; // 12 min virtuelles pour atteindre et tester le dernier tour (course de 8 400 m)
    const request = (action) => world.action(action);

    while (!callbacks.finish && frames < maxFrames) {
      const hud = callbacks.huds[callbacks.huds.length - 1];
      if (hud && Number.isFinite(Number(hud.playerHealth))) healthSeen = Number(hud.playerHealth);
      if (!wrecked) {
        // Chasse à la berline : on se cale dans la voie de la plus proche qui
        // est devant nous, pour la percuter ; sinon on zigzague dans le trafic.
        const squad = (hud?.police || []).filter((police) => !String(police.id).startsWith('rally-'));
        const playerDistance = Number(hud?.distance) || 0;
        const armedPolice = squad
          .filter((police) => police.armed?.[CITY_RUSH_POWERS.PISTOL])
          .filter((police) => Math.abs((Number(police.rawDistance) || 0) - playerDistance) < 120)
          .sort((a, b) => Math.abs((Number(a.rawDistance) || 0) - playerDistance)
            - Math.abs((Number(b.rawDistance) || 0) - playerDistance));
        const ahead = squad
          .filter((police) => (Number(police.rawDistance) || 0) - playerDistance > -6)
          .sort((a, b) => (Number(a.rawDistance) || 0) - (Number(b.rawDistance) || 0));
        // Si une berline a chargé l'AK-47, rester sur sa voie pour valider que
        // ses rafales peuvent toucher le joueur ; sinon aller la chercher pour
        // lui infliger des petits dégâts de collision.
        const target = armedPolice[0] || ahead[0] || null;
        if (target && frames % 3 === 0 && Number.isFinite(Number(hud?.playerLane))) {
          const targetLane = CITY_RUSH_LANE_X.reduce((best, x, lane) => (
            Math.abs(x - Number(target.x)) < Math.abs(CITY_RUSH_LANE_X[best] - Number(target.x)) ? lane : best
          ), 0);
          if (targetLane !== hud.playerLane) request(targetLane < hud.playerLane ? 'left' : 'right');
        }
      }
      stepFrame();
      frames += 1;
      if (callbacks.effects.some((effect) => effect.type === 'player-wrecked')) {
        if (!wrecked) {
          wrecked = true;
          wreckSpinLast = playerNode.rotation.y;
          wreckFirstLap = callbacks.huds.at(-1)?.lap ?? null;
        }
        wreckFrames += 1;
        const spinNow = playerNode.rotation.y;
        if (spinNow > wreckSpinLast) wreckSpinTurns += 1;
        wreckSpinLast = spinNow;
        if (visibleSmoke() >= 3) wreckSmokeFrames += 1;
        const speedNow = world.speed;
        if (Number.isFinite(speedNow)) wreckSpeedSum = Math.max(wreckSpeedSum, speedNow);
        wreckLastMeasuredSpeed = speedNow;
      }
    }

    races += 1;
    if (callbacks.errors.length) { violations += 1; console.error('ERREURS', callbacks.errors); }
    const playerRamDamage = callbacks.effects.filter((effect) => effect.type === 'player-hit' && effect.source === 'collision');
    const policeRamHits = callbacks.effects.filter((effect) => effect.type === 'police-hit' && effect.source === 'collision');
    policeRamHitsTotal += policeRamHits.length;
    if (playerRamDamage.length) {
      violations += 1;
      console.error(`[${city.id}#${run}] le contact policier a retiré de la vie au joueur`, playerRamDamage);
    }
    if (!policeRamHits.length) {
      violations += 1;
      console.error(`[${city.id}#${run}] aucun carambolage policier n’a été testé`);
    }
    if (policeRamHits.some((effect) => effect.damage !== 1)) {
      violations += 1;
      console.error(`[${city.id}#${run}] un carambolage n’a pas retiré exactement un point à la police`, policeRamHits);
    }
    if (!wrecked) {
      if (VERBOSE) {
        const armedFrames = callbacks.huds.filter((hud) => (hud.police || []).some((police) => police.armed?.[CITY_RUSH_POWERS.PISTOL])).length;
        console.log(`[${city.id}#${run}] pas d’épave : contacts policiers sans dégât au joueur · coque ${healthSeen}`, {
          finishRank: callbacks.finish?.rank,
          policeArmedFrames: armedFrames,
          redPickups: callbacks.effects.filter((effect) => effect.type === 'police-steal').length,
          machineGunSounds: audioCalls.machineGun || 0,
          playerHits: callbacks.effects.filter((effect) => effect.type === 'player-hit'),
          incomingPistolHits: callbacks.effects.filter((effect) => effect.type === 'pistol-hit-player'),
          policeRamHits,
        });
      }
      world.destroy();
      continue;
    }
    wrecks += 1;
    const finish = callbacks.finish;
    const lastSpeed = world.speed;
    const checks = [
      [finish?.destroyed === true, 'la course perdue n’est pas marquée détruite', finish && { destroyed: finish.destroyed, rank: finish.rank }],
      [finish?.rank === finish?.racers?.length, 'l’épave n’est pas classée dernière', finish && { rank: finish.rank, racers: finish.racers?.length }],
      [finish?.racers?.at(-1)?.id === 'player', 'le pilote détruit n’est pas en fin de tableau', finish?.racers?.map((r) => r.id)],
      [wreckFirstLap === CITY_RUSH_LAPS, 'l’épave ne se déclare pas sur le dernier tour', { wreckFirstLap, expected: CITY_RUSH_LAPS }],
      // La course ne peut plus se clore sur la ligne d'un rival pendant la
      // toupie (garde `!playerWrecked` dans la boucle) : une épave va toujours
      // au bout de ses 3,2 s.
      [wreckFrames >= 60, `l’épave ne dure que ${wreckFrames} images`, { wreckFrames }],
      [wreckSpinTurns >= 60, `l’épave n’a tourné que ${wreckSpinTurns} images`, { wreckSpinTurns }],
      [wreckSmokeFrames >= 30, `l’épave ne fume pas (${wreckSmokeFrames} images)`, { wreckSmokeFrames }],
      [Number.isFinite(lastSpeed) && lastSpeed < 1, `l’épave ne s’arrête pas (${lastSpeed} m/s)`, { lastSpeed }],
      [Number(healthSeen) === 0, 'la barre n’est pas à zéro au moment de l’épave', { healthSeen }],
      [audioCalls.explosion > 0, 'l’épave ne fait aucun bruit d’explosion', audioCalls],
      [wreckLastMeasuredSpeed !== null && wreckLastMeasuredSpeed <= wreckSpeedSum, 'l’épave ne ralentit pas', { wreckLastMeasuredSpeed, wreckSpeedSum }],
    ];
    for (const [ok, msg, extra] of checks) {
      if (!ok) { violations += 1; console.error(`[${city.id}#${run}] ÉCHEC : ${msg}`, extra ?? ''); }
    }
    if (VERBOSE || run === 0) {
      console.log(`[${city.id}#${run}] épave en ${(frames / 30).toFixed(1)} s · toupie ${wreckSpinTurns} images · fumée ${wreckSmokeFrames} images · vitesse au choc ${wreckSpeedSum.toFixed(1)} m/s · dernière mesure ${Number(wreckLastMeasuredSpeed).toFixed(2)} m/s (${CITY_RUSH_WRECK_SECONDS} s d’épave) · coque ${CITY_RUSH_PLAYER_HEALTH} carrés`);
    }
    world.destroy();
  }
}

if (violations) fail(`${violations} entorse(s) au contrat de l’épave`, { races, wrecks });
console.log(`VÉRIF COQUE/POLICE OK — ${races} course(s), ${policeRamHitsTotal} carambolage(s) validé(s), aucun dégât de contact sur le joueur${wrecks ? `, ${wrecks} épave(s) vérifiée(s)` : ''} (barre ${CITY_RUSH_PLAYER_HEALTH} carrés, graine ${BASE_SEED}).`);
process.exit(0);
