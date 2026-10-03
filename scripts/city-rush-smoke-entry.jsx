// Smoke « Vice City Rush » : exécute createCityRushWorld (vrai code) avec un
// faux WebGLRenderer, pompe la boucle animate à 30 Hz et joue une course
// complète (5 tours × 600 m) pour chaque ville demandée. Chaque ville se joue à un
// niveau de difficulté différent (Facile, Normal, Difficile en rotation : `--all`
// les exerce tous) ; `--difficulty=easy|normal|hard` impose le même à toutes.
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

// rAF piloté manuellement : on pompe des frames à 30 Hz avec un temps virtuel.
let rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS, CITY_RUSH_LAP_LENGTH, CITY_RUSH_DISTANCE, CITY_RUSH_POWER_RULES,
  CITY_RUSH_DIFFICULTIES, normalizeCityRushDifficulty,
  CITY_RUSH_LANE_X, CITY_RUSH_CAR_GAP,
} = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const countVisible = (scene) => {
  let meshes = 0;
  let triangles = 0;
  scene.traverse((o) => {
    if (!o.visible) return;
    let p = o.parent;
    while (p) { if (!p.visible) return; p = p.parent; }
    if (o.isMesh || o.isPoints || o.isLine) {
      meshes += 1;
      const geo = o.geometry;
      if (geo?.index) triangles += geo.index.count / 3;
      else if (geo?.attributes?.position) triangles += geo.attributes.position.count / 3;
    }
  });
  return { meshes, triangles: Math.round(triangles) };
};

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_SMOKE_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const difficultyArg = process.argv.find((a) => a.startsWith('--difficulty='))?.slice(13);
if (difficultyArg && normalizeCityRushDifficulty(difficultyArg) !== difficultyArg) {
  fail(`--difficulty inconnu « ${difficultyArg} »`, CITY_RUSH_DIFFICULTIES.map((mode) => mode.id));
}
// Le niveau d'une ville ne dépend que d'elle : `--city=tokyo` rejoue celui de `--all`.
const difficultyFor = (city) => difficultyArg || CITY_RUSH_DIFFICULTIES[Math.max(0, CITY_RUSH_CITIES.indexOf(city)) % CITY_RUSH_DIFFICULTIES.length].id;

// Bande-son : le monde ne connaît qu'une ref. On y glisse un compteur — pas
// de Web Audio ici, mais la certitude qu'une course complète déclenche bien
// moteur, feux, tours, tirs et arrivée, et que l'hélicoptère est toujours
// éteint (un rotor qui tourne dans le vide s'entendrait jusqu'à la page
// d'accueil).
const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff',
];

let totalPickups = 0;
// L'escouade du dernier tour doit coller au leader sur les cinq circuits. Seuils
// calibrés sur 200 courses de ce même pilote (5 villes × 40, hasard non
// fixé) : avec le dégagement du trafic, au pire 104 m de retard et 73 % du
// tour dans les 60 m ; engluée derrière un camion, elle allait jusqu'à 314 m
// de retard et ne passait que 17 % du tour dans les 60 m. Marges larges.
const POLICE_ENGAGE_RANGE = 60; // m
const POLICE_MIN_ENGAGED_SHARE = 0.5;
const POLICE_MAX_LAG = 175; // m

for (const [index, city] of cities.entries()) {
  const car = CITY_RUSH_CARS[index % CITY_RUSH_CARS.length];
  const difficulty = difficultyFor(city);
  const callbacks = {
    ready: 0, errors: [], huds: [], laps: [], effects: [], pickups: [], finish: null,
  };
  const audioCalls = {};
  const audioStub = {};
  for (const name of AUDIO_METHODS) {
    audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
  }
  const audioRef = { current: audioStub };
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

  const t0 = Date.now();
  let world;
  try {
    world = createCityRushWorld(mount, city, () => ({
      ready: () => { callbacks.ready += 1; },
      error: (e) => { callbacks.errors.push(e); console.error('CALLBACK ERROR:', e); },
      hud: (h) => { callbacks.huds.push(h); },
      finish: (r) => { callbacks.finish = r; },
      pickup: (p) => { callbacks.pickups.push(p); },
      effect: (e) => { callbacks.effects.push(e); },
      lap: (l) => { callbacks.laps.push(l); },
    }), car.id, audioRef, null, CITY_RUSH_LAPS, false, difficulty);
  } catch (e) {
    console.error(`[${city.id}] createCityRushWorld A LEVÉ :`);
    console.error(e);
    process.exit(1);
  }
  const buildMs = Date.now() - t0;
  const api = Object.keys(world);
  for (const key of ['start', 'pause', 'reset', 'action', 'setPhase', 'setCountdown', 'setDifficulty', 'destroy']) {
    if (typeof world[key] !== 'function') fail(`API manquante : ${key}`, api);
  }
  // Niveau : pris à la création, changeable à chaud (sans reconstruire), jamais invalide.
  if (world.difficulty !== difficulty) fail(`niveau à la création : ${world.difficulty} au lieu de ${difficulty}`);
  for (const [asked, expected] of [['hard', 'hard'], ['easy', 'easy'], ['pas-un-niveau', 'normal'], [difficulty, difficulty]]) {
    world.setDifficulty(asked);
    if (world.difficulty !== expected) fail(`setDifficulty(${asked}) → ${world.difficulty} au lieu de ${expected}`);
  }

  const scene = world.scene || null;
  // Éclatement et réapparition des bonus : le pool d'effets vit dans la scène,
  // et chaque bonus ramassé doit éclater puis réapparaître 0,1 s (3 frames à
  // 30 Hz) plus tard sur sa rangée.
  const burstNodes = [];
  const pickupSlots = [];
  // Berlines de police du trafic : le pilote d'essai les vise pour provoquer le
  // scénario « on percute un agent » (voir la boucle de course).
  const policeTrafficNodes = [];
  scene?.traverse((object) => {
    if (object.name === 'pickup-burst') burstNodes.push(object);
    if (object.name === 'traffic-police') policeTrafficNodes.push(object);
    if (object.userData?.icon && object.userData?.ring && object.userData?.beam && object.userData?.halo) {
      pickupSlots.push(object);
    }
  });
  let burstFrames = 0;
  let respawnedPickups = 0;
  const slotWatch = new Map();
  const runFrames = (n, label) => {
    for (let i = 0; i < n; i++) {
      try { stepFrame(); } catch (e) {
        console.error(`[${city.id}] FRAME ${i} (${label}) A LEVÉ :`);
        console.error(e);
        process.exit(1);
      }
    }
  };

  // Intro : caméra orbitale, voitures au ralenti.
  world.setPhase('intro');
  runFrames(45, 'intro');
  // ready() est émis par le wrapper React, pas par le monde : on vérifie le HUD initial.
  if (!callbacks.huds.length) fail('aucun HUD émis après la construction (reset initial)');
  const introStats = scene ? countVisible(scene) : null;

  // Compte à rebours : 3 → 2 → 1 → GO.
  world.reset();
  world.setPhase('countdown');
  for (const n of [3, 2, 1]) { world.setCountdown(n); runFrames(24, `countdown ${n}`); }
  world.setCountdown(0);
  runFrames(16, 'go');

  // Course : on accélère en continu, et on tape sur l’action de temps en temps.
  world.setPhase('playing');
  world.start();
  const hudBefore = callbacks.huds.length;
  const lapSeen = new Set();
  let frames = 0;
  let maxVisible = 0;
  let maxTriangles = 0;
  const maxFrames = 30 * 240; // 4 minutes virtuelles, large.
  let steer = 'left';
  let slowFrames = 0;
  let launchesSeen = 0;
  let lastLaunchFrame = 0;
  // Escouade de police : première image où elle apparaît dans le HUD, temps
  // passé en piste et temps passé devant notre joueur.
  let firstPoliceHud = null;
  let policeHudFrames = 0;
  let policeAheadFrames = 0;
  let policeClosestGap = Infinity;
  let policeBeacons = 0;
  // L'escouade doit rester dans la course : images où la berline la plus proche
  // est dans la zone du leader, et retard maximal de la mieux placée sur lui.
  let policeEngagedFrames = 0;
  let policeMaxLag = 0;
  let policeWorstLag = null;
  // Images où l'escouade du dernier tour est réellement en piste : le partage
  // d'engagement se juge sur elle, pas sur la police du trafic rappelée.
  let policeSquadFrames = 0;
  let policeStunFrames = 0;
  // Quelques images où l'escouade lâche le leader, pour diagnostiquer l'échec.
  const policeLooseSamples = [];
  // Barrage : frames où une berline freine devant le leader, et pire écart
  // mesuré entre une berline et un pilote qui se chevauchent latéralement
  // (les berlines sont solides : elles ne doivent jamais être traversées).
  let policeBlockadeFrames = 0;
  let policeWorstOverlap = Infinity;
  // Écart minimal entre une berline et un rival : information seule, la porte
  // de solidité ne concerne que la voiture du pilote.
  let policeAiOverlap = Infinity;
  // Images où la berline et le pilote se chevauchent latéralement : sans cela
  // la porte de solidité ne serait jamais exercée (et passerait à vide).
  let policePlayerOverlapFrames = 0;
  // Police du trafic rappelée par un contact : frames en chasse et frames
  // passées devant le joueur qu'elle poursuit.
  let ralliedHudFrames = 0;
  let ralliedAheadFrames = 0;
  let ralliedBlockadeFrames = 0;
  let worstPair = null;

  while (!callbacks.finish && frames < maxFrames) {
    const hud = callbacks.huds[callbacks.huds.length - 1];
    // Pilote naïf : si on traîne derrière le trafic, on tente de changer de voie ;
    // on déclenche chaque pouvoir dès qu'il est chargé. Tant qu'aucun contact
    // n'a eu lieu, il vise délibérément une berline de police du trafic : c'est
    // le seul moyen d'éprouver la riposte policière de façon déterministe.
    const rallyContactSeen = callbacks.effects.some((effect) => effect.type === 'police-rally');
    let rallyTarget = null;
    if (!rallyContactSeen && frames > 150) {
      for (const node of policeTrafficNodes) {
        if (!node.visible || node.position.z > 3.1 - 6) continue;
        if (!rallyTarget || node.position.z > rallyTarget.position.z) rallyTarget = node;
      }
    }
    if (hud && hud.speed < 70) slowFrames += 1; else slowFrames = 0;
    if (slowFrames > 12 && !rallyTarget) {
      world.action(steer);
      steer = steer === 'left' ? 'right' : 'left';
      slowFrames = 0;
    }
    if (rallyTarget && hud && frames % 4 === 0) {
      let targetLane = hud.playerLane;
      let closest = Infinity;
      CITY_RUSH_LANE_X.forEach((x, index) => {
        const delta = Math.abs(x - rallyTarget.position.x);
        if (delta < closest) { closest = delta; targetLane = index; }
      });
      if (targetLane !== hud.playerLane) world.action(targetLane < hud.playerLane ? 'left' : 'right');
    }
    if (hud && frames % 15 === 0) {
      for (const type of ['cash', 'blue-shot', 'pistol', 'radio']) {
        if ((hud.inventory?.[type] || 0) >= (CITY_RUSH_POWER_RULES[type]?.chargeCost ?? 99)) world.action(type);
      }
    }
    runFrames(1, `course f${frames}`);
    frames += 1;
    if ((audioCalls.missileLaunch || 0) !== launchesSeen) { launchesSeen = audioCalls.missileLaunch || 0; lastLaunchFrame = frames; }
    if (burstNodes.some((node) => node.visible)) burstFrames += 1;
    for (const slot of pickupSlots) {
      const parentZ = slot.parent?.position.z ?? 0;
      const prev = slotWatch.get(slot);
      if (prev) {
        const recycled = parentZ < prev.parentZ - 5;
        if (recycled) {
          slotWatch.set(slot, { visible: slot.visible, parentZ, hiddenAt: null });
        } else if (prev.visible && !slot.visible) {
          slotWatch.set(slot, { visible: false, parentZ, hiddenAt: frames });
        } else if (!prev.visible && slot.visible && prev.hiddenAt !== null) {
          const delayFrames = frames - prev.hiddenAt;
          // 3 frames = 0,1 s à 30 Hz (ou un multiple de 3 si une voiture
          // suivante reprend le bonus sur la frame exacte de sa réapparition).
          if (delayFrames < 3 || delayFrames % 3 !== 0) {
            fail(`un bonus a réapparu après ${delayFrames} frames au lieu d’un multiple de 3 (0,1 s à 30 Hz)`);
          }
          respawnedPickups += 1;
          slotWatch.set(slot, { visible: true, parentZ, hiddenAt: null });
        } else {
          slotWatch.set(slot, { visible: slot.visible, parentZ, hiddenAt: prev.hiddenAt });
        }
      } else {
        slotWatch.set(slot, { visible: slot.visible, parentZ, hiddenAt: null });
      }
    }
    if (hud?.lap) lapSeen.add(hud.lap);
    if (hud?.police?.length) {
      // L'escouade du dernier tour, distincte de la police du trafic rappelée
      // par un contact (`rallied`) : le suivi d'engagement ne juge qu'elle.
      const squadCars = hud.police.filter((car) => !car.rallied);
      if (!firstPoliceHud && squadCars.length) firstPoliceHud = hud;
      policeHudFrames += 1;
      // Une berline sonnée par un tir du joueur est hors course quelques
      // secondes : la juger « décrochée » fausserait la mesure du harnais.
      if (squadCars.length && squadCars.some((car) => !(car.stunLeft > 0))) policeSquadFrames += 1;
      if (squadCars.length && squadCars.every((car) => car.stunLeft > 0)) policeStunFrames += 1;
      const hudLeader = Math.max(hud.distance || 0, ...(hud.racers || []).map((racer) => racer.distance || 0));
      for (const car of hud.police) {
        const gap = (car.distance || 0) - (hud.distance || 0);
        if (gap > 0 && gap < 80) policeAheadFrames += 1;
        policeClosestGap = Math.min(policeClosestGap, Math.abs((car.distance || 0) - hudLeader));
        if (car.mode) policeBeacons += 1;
        if (car.blocking || car.mode === 'blockade') policeBlockadeFrames += 1;
        if (car.rallied) {
          ralliedHudFrames += 1;
          if (car.blocking || car.mode === 'blockade') ralliedBlockadeFrames += 1;
          const playerGap = (Number.isFinite(Number(car.rawDistance)) ? Number(car.rawDistance) : Number(car.distance)) - (hud.distance || 0);
          if (playerGap > 0 && playerGap < 60) ralliedAheadFrames += 1;
        }
        // Collision : la solidité des berlines se juge sur la voiture du
        // pilote — c'est elle qui ne doit jamais en traverser une. Deux
        // rivaux peuvent se croiser au mètre près pendant un rabattement
        // d'IA (à 300 m derrière, hors champ) : l'écart est relevé à part,
        // en information, et ne bloque pas la ville.
        const carX = Number(car.x);
        const carDistance = Number.isFinite(Number(car.rawDistance)) ? Number(car.rawDistance) : Number(car.distance);
        for (const racer of hud.racers || []) {
          const racerX = Number(racer.x);
          if (!Number.isFinite(carX) || !Number.isFinite(racerX)) continue;
          if (Math.abs(carX - racerX) > 1.6) continue;
          const racerDistance = Number.isFinite(Number(racer.rawDistance)) ? Number(racer.rawDistance) : Number(racer.distance);
          if (!Number.isFinite(carDistance) || !Number.isFinite(racerDistance)) continue;
          // La police du trafic rappelée percute volontairement le pilote
          // qu'elle chasse : ce rattrapage est le seul contact toléré.
          const contactCatchUp = car.rallied && (carDistance - racerDistance) < CITY_RUSH_CAR_GAP;
          const overlapNow = contactCatchUp ? Infinity : Math.abs(carDistance - racerDistance);
          if (!racer.isPlayer) {
            if (overlapNow < policeAiOverlap) policeAiOverlap = overlapNow;
            continue;
          }
          policePlayerOverlapFrames += 1;
          if (overlapNow < policeWorstOverlap) {
            policeWorstOverlap = overlapNow;
            worstPair = {
              frame: frames, city: city.id, car: car.id, rallied: Boolean(car.rallied), mode: car.mode,
              carDist: carDistance, carX, carLane: car.lane, blocking: Boolean(car.blocking),
              racer: racer.id, racerDist: racerDistance, racerX, racerLane: racer.lane,
              delta: carDistance - racerDistance,
            };
          }
        }
      }
      const squadGap = squadCars.length
        ? Math.min(...squadCars.map((car) => Math.abs((car.distance || 0) - hudLeader)))
        : Infinity;
      if (squadGap <= POLICE_ENGAGE_RANGE) policeEngagedFrames += 1;
      else if (squadCars.length && policeLooseSamples.length < 8) {
        policeLooseSamples.push({
          frame: frames,
          gap: Math.round(squadGap),
          leader: Math.round(hudLeader),
          player: Math.round(hud.distance || 0),
          squad: squadCars.map((car) => `${car.id}@${car.distance}/${car.mode || '?'}${car.stunLeft > 0 ? '/SONNÉE' : car.slowLeft > 0 ? '/ralentie' : ''}`).join(' '),
        });
      }
      const lag = squadCars.length ? hudLeader - Math.max(...squadCars.map((car) => car.distance || 0)) : 0;
      if (lag > policeMaxLag) {
        policeMaxLag = lag;
        policeWorstLag = {
          frame: frames,
          hudLeader,
          player: hud.distance,
          police: squadCars.map((car) => `${car.id}@${car.distance}${car.mode ? '/' + car.mode : ''}`).join(' '),
        };
      }
    }
    if (scene && frames % 30 === 0) {
      const stats = countVisible(scene);
      maxVisible = Math.max(maxVisible, stats.meshes);
      maxTriangles = Math.max(maxTriangles, stats.triangles);
    }
  }
  const raceSeconds = (frames * FRAME_MS) / 1000;
  if (!callbacks.finish) fail(`arrivée jamais atteinte après ${raceSeconds.toFixed(0)} s virtuelles`, callbacks.huds.at(-1));
  if (callbacks.huds.length <= hudBefore) fail('aucun HUD émis pendant la course');
  if (callbacks.errors.length) fail('erreurs remontées', callbacks.errors);

  const finish = callbacks.finish;
  if (finish.laps !== CITY_RUSH_LAPS) fail('finish.laps ≠ CITY_RUSH_LAPS', finish);
  if (finish.difficulty !== difficulty) fail(`finish.difficulty : ${finish.difficulty} au lieu de ${difficulty}`, finish);
  if (!Array.isArray(finish.racers) || finish.racers.length < 2) fail('finish.racers invalide', finish);
  const lastHud = callbacks.huds.at(-1);
  for (const field of ['lap', 'laps', 'lapProgress', 'lapDistance', 'lapLength', 'distance', 'speed', 'rank', 'racers']) {
    if (!(field in lastHud)) fail(`champ HUD manquant : ${field}`, Object.keys(lastHud));
  }
  if (lastHud.laps !== CITY_RUSH_LAPS || lastHud.lapLength !== CITY_RUSH_LAP_LENGTH) fail('HUD laps/lapLength incohérents', lastHud);
  const playerLaps = callbacks.laps.map((l) => l.lap);
  const winnerIsPlayer = finish.racers?.find((r) => r.player)?.rank === 1 || finish.rank === 1;
  if (winnerIsPlayer) {
    const expectedLaps = Array.from({ length: CITY_RUSH_LAPS - 1 }, (_, i) => i + 2);
    const joined = playerLaps.join(',');
    if (joined !== expectedLaps.join(',') && joined !== [...expectedLaps, CITY_RUSH_LAPS + 1].join(',')) {
      fail(`passages de ligne du joueur inattendus (attendu tours ${expectedLaps.join(', ')})`, callbacks.laps);
    }
    const finalLapEffect = callbacks.effects.find((e) => e.type === 'final-lap');
    if (!finalLapEffect) fail('effet final-lap jamais émis', callbacks.effects.map((e) => e.type));
    if (![...lapSeen].includes(CITY_RUSH_LAPS)) fail('le HUD n’a jamais affiché le dernier tour', [...lapSeen]);
  } else if (!callbacks.laps.length && !callbacks.effects.some((e) => e.type === 'rival-final-lap')) {
    fail('aucun passage de ligne détecté (ni joueur ni rival)', callbacks.effects.map((e) => e.type));
  }
  // Bande-son : le moteur suit la course image par image, les feux sonnent
  // quatre fois (3 · 2 · 1 · GO), le joueur passe deux lignes et l'arrivée ne
  // sonne qu'une fois.
  if ((audioCalls.engine || 0) < frames) fail('le moteur n’est pas piloté à chaque image', audioCalls);
  // Quatre au premier départ (3 · 2 · 1 · GO) ; le rejeu en remet un.
  if ((audioCalls.countdownBeep || 0) < 4) fail('les feux de départ n’ont pas sonné 3 · 2 · 1 · GO', audioCalls);
  if (audioCalls.finish !== 1) fail('la fanfare d’arrivée n’a pas sonné une fois', audioCalls);
  if ((audioCalls.lap || 0) !== callbacks.laps.length) fail('un passage de ligne sur deux est muet', audioCalls);
  // Un missile encore en vol au moment du drapeau à damier est coupé net par
  // l'arrivée : au plus une frappe peut rester sans explosion (jamais l'inverse), et
  // lancée dans la seconde qui précède l'arrivée. Une berline de police détruite
  // explose elle aussi : le compte attendu des explosions couvre missiles et
  // berlines abattues. (Exiger l'égalité stricte faisait échouer le smoke une fois
  // sur vingt : un pilote qui franchit la ligne pendant qu'un rival le vise.)
  const destroyedPolice = callbacks.effects.filter((effect) => effect.type === 'police-destroyed').length;
  const expectedExplosions = (audioCalls.missileLaunch || 0) + destroyedPolice;
  const unexploded = expectedExplosions - (audioCalls.explosion || 0);
  const lastLaunchAge = ((frames - lastLaunchFrame) * FRAME_MS) / 1000;
  if (unexploded < 0 || unexploded > 1 || (unexploded === 1 && lastLaunchAge > 1)) {
    fail('un missile ou une berline sans explosion (ou l’inverse)', { ...audioCalls, destroyedPolice, dernierMissileAvantLArrivee: `${lastLaunchAge.toFixed(2)} s` });
  }
  // Un missile suppose un hélicoptère ; une frappe avortée par l'arrivée ou
  // par `reset()` compte un démarrage de plus que de missiles, jamais
  // l'inverse. Et chaque rotor démarré finit éteint.
  if ((audioCalls.helicopterStart || 0) < (audioCalls.missileLaunch || 0)) fail('un missile sans hélicoptère', audioCalls);
  if ((audioCalls.helicopterStop || 0) < (audioCalls.helicopterStart || 0)) fail('un rotor n’a pas été éteint', audioCalls);
  // Chaque bonus ramassé sonne, ni plus ni moins. (Ce pilote ne change de voie que
  // pour doubler : il peut très bien n'en ramasser aucun, le bip n'est exigé que
  // pour les bonus pris ; le chemin du ramassage est vérifié sur l'ensemble des villes.)
  if ((audioCalls.pickup || 0) !== callbacks.pickups.length) {
    fail('un bonus ramassé sur deux est muet (ou l’inverse)', { bips: audioCalls.pickup || 0, bonus: callbacks.pickups.length });
  }
  totalPickups += callbacks.pickups.length;

  const maxDistance = Math.max(...finish.racers.map((r) => r.distance ?? 0));
  if (maxDistance < CITY_RUSH_DISTANCE - 1) fail('le vainqueur n’a pas parcouru toute la distance', finish.racers);
  if (maxVisible > 600) fail(`trop de meshes visibles : ${maxVisible}`);
  if (callbacks.pickups.length && !burstNodes.length) fail('aucun objet d’éclatement de bonus dans la scène');
  if (callbacks.pickups.length && !burstFrames) fail('bonus ramassés sans aucun éclatement visible', callbacks.pickups.length);
  if (callbacks.pickups.length && !respawnedPickups) fail('aucun bonus ramassé n’a réapparu après 0,1 s', callbacks.pickups.length);
  // Escouade de police du dernier tour : deux berlines, entrées derrière le
  // leader, jamais classées, sirène allumée puis éteinte.
  const policeArrivals = callbacks.effects.filter((effect) => effect.type === 'police-arrival');
  if (policeArrivals.length !== 1) fail('l’escouade de police n’entre pas exactement une fois en piste', policeArrivals);
  if (!firstPoliceHud) fail('aucune berline de police dans le HUD pendant la course');
  // Barre de vie : chaque berline expose ses points de vie au HUD (pleins à
  // l'entrée en piste), et une berline détruite les a bien eus avant l'explosion.
  for (const hud of callbacks.huds) {
    for (const car of hud.police || []) {
      if (!Number.isFinite(car.health) || !Number.isFinite(car.maxHealth)) {
        fail('une berline de police du HUD n’a pas de barre de vie', car);
      }
    }
  }
  const destroyedPoliceEffects = callbacks.effects.filter((effect) => effect.type === 'police-destroyed');
  for (const effect of destroyedPoliceEffects) {
    const seen = callbacks.huds
      .map((hud) => (hud.police || []).find((car) => car.name === effect.police))
      .filter(Boolean);
    if (!seen.length) fail('une berline détruite n’est jamais apparue dans le HUD', effect);
    if (!(seen[0].health >= 1 && seen[0].health <= seen[0].maxHealth)) {
      fail('une berline détruite n’avait pas de vie cohérente dans le HUD', seen[0]);
    }
  }
  // Escouade du dernier tour (`police-*`) et police du trafic rappelée par un
  // contact (`rally-traffic-*`) partagent la même liste ; l'escouade reste
  // limitée à deux berlines et n'entre jamais devant le leader.
  const squadCars = firstPoliceHud.police.filter((car) => String(car.id).startsWith('police-'));
  if (squadCars.length > 2) fail('plus de deux berlines d’escouade en piste', firstPoliceHud.police);
  if (firstPoliceHud.police.length > 5) fail('plus de cinq poursuivants en piste', firstPoliceHud.police);
  const leaderDistance = Math.max(firstPoliceHud.distance || 0, ...(firstPoliceHud.racers || []).map((racer) => racer.distance || 0));
  for (const car of squadCars) {
    if (car.distance > leaderDistance + 2) fail('une berline entre en piste devant le leader', { leaderDistance, car });
    if (car.distance < leaderDistance - 140) fail('une berline entre trop loin derrière le leader', { leaderDistance, car });
  }
  // La police du trafic : un contact l'a rappelée, elle chasse son pilote, et
  // elle rentre dans le rang au drapeau à damier.
  const rallies = callbacks.effects.filter((effect) => effect.type === 'police-rally');
  const ralliedInHud = new Set();
  for (const hud of callbacks.huds) {
    for (const car of hud.police || []) if (car.rallied) ralliedInHud.add(car.id);
  }
  if (!ralliedInHud.size && rallies.length) fail('une berline rappelée n’apparaît jamais dans le HUD', rallies);
  if (ralliedInHud.size !== rallies.length) {
    fail(`${rallies.length} contact(s) pour ${ralliedInHud.size} berline(s) rappelée(s) en piste`, [...ralliedInHud]);
  }
  for (const car of rallies) {
    if (car.police !== 'POLICE ROUTIÈRE') fail('une berline rappelée n’est pas identifiée comme police routière', car);
  }
  const ralliedIds = [...ralliedInHud];
  if (ralliedHudFrames < 60) fail('la police routière rappelée ne tient pas la chasse', ralliedHudFrames);
  if (ralliedAheadFrames < 60) fail('la police routière rappelée ne se porte jamais devant le pilote qu’elle chasse', ralliedAheadFrames);
  if (!ralliedBlockadeFrames) fail('la police routière rappelée ne s’est jamais mise en barrage devant le pilote');
  if ((lastHud.police || []).some((car) => ralliedIds.includes(car.id))) {
    fail('une berline rappelée reste en piste après l’arrivée', lastHud.police);
  }
  if (policeHudFrames < 30) fail('l’escouade ne tient pas la piste', policeHudFrames);
  if (!(policeClosestGap <= 30)) fail(`l’escouade reste à ${policeClosestGap} m du leader`, policeClosestGap);
  // Sur chaque circuit, l'escouade reste dans le sillage du leader au lieu de
  // s'enliser derrière le trafic lent : sinon elle décroche de 100 à 300 m, sort
  // de l'écran et le dernier tour n'a plus de police que dans le HUD.
  const policeEngagedShare = policeEngagedFrames / Math.max(1, policeSquadFrames);
  if (policeEngagedShare < POLICE_MIN_ENGAGED_SHARE) {
    fail(`l’escouade n’est dans les ${POLICE_ENGAGE_RANGE} m du leader que ${(policeEngagedShare * 100).toFixed(0)} % du dernier tour`, { policeEngagedFrames, policeSquadFrames, samples: policeLooseSamples });
  }
  if (policeMaxLag > POLICE_MAX_LAG) fail(`l’escouade décroche de ${policeMaxLag.toFixed(0)} m derrière le leader`, { policeMaxLag, limit: POLICE_MAX_LAG, worst: policeWorstLag });
  // Barrage roulant : au moins une berline freine devant le leader, et la page
  // le raconte. Les berlines sont solides : jamais dans un pilote.
  if (!policeBlockadeFrames) fail('aucune berline ne s’est mise en barrage devant le leader');
  if (!callbacks.effects.some((effect) => effect.type === 'police-block')) {
    fail('le barrage police n’a jamais été annoncé à la page', callbacks.effects.map((e) => e.type));
  }
  if (!policePlayerOverlapFrames) fail('aucune berline n’est jamais passée à hauteur du pilote : la solidité n’a pas été éprouvée');
  if (!(policeWorstOverlap >= CITY_RUSH_CAR_GAP - 1.5)) {
    fail(`le pilote traverse une berline solide : écart ${policeWorstOverlap.toFixed(2)} m < ${CITY_RUSH_CAR_GAP} m`, worstPair);
  }
  if (!rallies.length) fail('aucune berline de police du trafic n’a été rappelée par un contact');

  if ((firstPoliceHud.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le classement du HUD');
  if ((finish.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le tableau d’arrivée');
  if (lastHud.police?.length) fail('l’escouade reste en piste après l’arrivée', lastHud.police);
  if (!audioCalls.policeSiren) fail('la sirène de police n’a jamais sonné', audioCalls);

  const automaticCash = callbacks.pickups.filter((pickup) => pickup.type === 'cash' && pickup.autoActivated).length;
  if (callbacks.pickups.some((pickup) => pickup.autoActivated && !CITY_RUSH_POWER_RULES[pickup.type]?.automatic)) {
    fail('un bonus manuel a été signalé comme activation automatique', callbacks.pickups.filter((pickup) => pickup.autoActivated));
  }
  if ((audioCalls.boost || 0) < automaticCash) fail('un boost vert chargé ne s’est pas activé automatiquement', { automaticCash, audioCalls });
  const blueShotEffects = new Set(['blue-shot-hit', 'blue-shot-hit-player', 'blue-shot-miss', 'rival-blue-shot']);
  const blueShotsUsed = callbacks.effects.filter((effect) => blueShotEffects.has(effect.type)).length;
  if (!blueShotsUsed) fail('aucun tir droit bleu n’a été testé', callbacks.effects);
  if (!audioCalls.gunshot) fail('un tir droit bleu a été utilisé sans bruit de coup de feu', { blueShotsUsed, audioCalls });


  // Fin de course : la caméra tourne, le départ fait la fête, pas d’exception.
  world.setPhase('finished');
  runFrames(60, 'finished');
  // Rejouer : reset + nouveau départ sans fuite d’état.
  world.reset();
  world.setPhase('countdown');
  world.setCountdown(3);
  runFrames(10, 'replay countdown');
  const hudAfterReset = callbacks.huds.at(-1);
  if (hudAfterReset.lap !== 1 || hudAfterReset.distance > 1) fail('reset() ne remet pas la course au tour 1', hudAfterReset);

  try { world.destroy(); } catch (e) { console.error('destroy() a levé :', e); process.exit(1); }
  if (rafQueue.size) fail('rAF encore planifié après destroy()', rafQueue.size);

  const effectTypes = [...new Set(callbacks.effects.map((e) => e.type))];
  console.log(
    `[${city.id}] OK (${difficulty}) — build ${buildMs} ms · course ${raceSeconds.toFixed(1)} s virtuelles / ${frames} frames` +
    ` · tours joueur ${playerLaps.join('→') || '—'} · rang ${finish.rank}` +
    ` · HUD ${callbacks.huds.length} · bonus ${callbacks.pickups.length} (éclatés ${burstFrames} f) · effets ${effectTypes.join('/')}` +
    ` · police ${firstPoliceHud ? `entrée à ${firstPoliceHud.police.map((car) => car.distance).join('/')} m (leader ${Math.round(leaderDistance)}) · ${policeSquadFrames} f en piste · ${policeAheadFrames} f devant · plus près ${policeClosestGap.toFixed(1)} m · à ≤ ${POLICE_ENGAGE_RANGE} m ${(policeEngagedFrames / Math.max(1, policeSquadFrames) * 100).toFixed(0)} % · retard max ${policeMaxLag.toFixed(0)} m · ${policeBlockadeFrames} f en barrage${policeStunFrames ? ` · ${policeStunFrames} f sonnée` : ''}` : 'jamais entrée'}` +
    ` · police routière ${rallies.length} contact(s) · ${ralliedHudFrames} f en chasse · ${ralliedAheadFrames} f devant le joueur · ${ralliedBlockadeFrames} f en barrage` +
    ` · écart mini berline/pilote ${Number.isFinite(policeWorstOverlap) ? policeWorstOverlap.toFixed(1) : '—'} m` +
    ` (${policePlayerOverlapFrames} f de recouvrement · rival ${Number.isFinite(policeAiOverlap) ? policeAiOverlap.toFixed(1) : '—'} m)` +

    (introStats ? ` · intro ${introStats.meshes} meshes / ${introStats.triangles} tris` : '') +
    ` · max visibles ${maxVisible} meshes / ${maxTriangles} tris` +
    ` · sons ${AUDIO_METHODS.filter((name) => audioCalls[name]).map((name) => `${name} ${audioCalls[name]}`).join(' / ')}`,
  );
}
if (cities.length > 1 && !totalPickups) fail('aucun bonus ramassé dans aucune des villes : le chemin du ramassage n’a pas été exercé');
console.log(`SMOKE OK — ${cities.length} ville(s), ${CITY_RUSH_LAPS} tours × ${CITY_RUSH_LAP_LENGTH} m`);
process.exit(0);
