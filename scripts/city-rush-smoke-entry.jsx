// Smoke « Vice City Rush » : exécute createCityRushWorld (vrai code) avec un
// faux WebGLRenderer, pompe la boucle animate à 30 Hz et joue une course
// complète pour chaque ville demandée : 5 tours, soit quatre boucles de 600 m
// puis un grand dernier tour de 1 200 m (deux boucles, le portique est recroisé
// à mi-parcours) — 3 600 m en tout.
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
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS, CITY_RUSH_LAP_LENGTH, CITY_RUSH_FINAL_LAP_LENGTH, CITY_RUSH_POWER_RULES,
  CITY_RUSH_LANE_X, CITY_RUSH_CAR_GAP, CITY_RUSH_POLICE_COUNT, CITY_RUSH_POWERS, CITY_RUSH_PICKUPS,
  CITY_RUSH_PLAYER_HEALTH,
  CITY_RUSH_FINAL_LAP_LOOPS, cityRushRaceDistance, selectCityRushRacers,
} = await import('../src/games/cityRushRules.js');

// Tours de la course jouée : 5 par défaut (la plus longue, 3 600 m) ;
// `CITY_RUSH_SMOKE_LAPS=4` joue un Circuit (3 000 m). Au moins 3 : en dessous,
// la course est trop courte pour que le pilote d'essai croise l'escouade du
// dernier tour et ramasse un bonus de chaque couleur.
const RACE_LAPS = Math.max(3, Math.floor(Number(process.env.CITY_RUSH_SMOKE_LAPS) || CITY_RUSH_LAPS));
// Le smoke joue du hasard (trafic, bonus, dérapages). Par défaut, chaque
// course est différente ; `CITY_RUSH_SMOKE_SEED=42 npm run check:city-rush-smoke`
// fige le tirage et rend un échec reproductible — c'est ainsi qu'on tranche
// entre une régression et un scénario malchanceux.
if (typeof process !== 'undefined' && process.env && process.env.CITY_RUSH_SMOKE_SEED) {
  let smokeSeed = (Number(process.env.CITY_RUSH_SMOKE_SEED) >>> 0) || 1;
  Math.random = () => {
    smokeSeed = (smokeSeed * 1664525 + 1013904223) >>> 0;
    return smokeSeed / 4294967296;
  };
}

const RACE_DISTANCE = cityRushRaceDistance(RACE_LAPS);
// La ligne où commence le grand dernier tour : avant elle, l'hélico
// d'observation n'a rien à faire dans le ciel.
const FINAL_LAP_START = (RACE_LAPS - 1) * CITY_RUSH_LAP_LENGTH;

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
// Total, sur toutes les villes, des tirs droits bleus de la police arrivés sur
// le joueur (information seule : la berline tire quand elle veut).
let policeBlueHitTotal = 0;

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

// L'escouade du dernier tour doit coller au leader sur les cinq circuits. Seuils
// calibrés sur ce même pilote (5 villes, hasard non fixé) : avec le dégagement
// du trafic, au pire 104 m de retard et 73 % du tour dans les 60 m sur le
// dernier tour de 600 m ; engluée derrière un camion, elle allait jusqu'à
// 314 m de retard et ne passait que 17 % du tour dans les 60 m. Le dernier tour
// compte maintenant 1 200 m (l'escouade y reste deux fois plus longtemps, ~42 s
// au lieu de ~21 s) : sur plus de 700 courses, au pire 164 m de retard et 61 %
// du tour dans les 60 m, d'où un retard toléré porté de 175 à 200 m.
const POLICE_ENGAGE_RANGE = 60; // m
const POLICE_MIN_ENGAGED_SHARE = 0.5;
const POLICE_MAX_LAG = 200; // m

for (const [index, city] of cities.entries()) {
  const car = CITY_RUSH_CARS[index % CITY_RUSH_CARS.length];
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
    }), car.id, audioRef, null, RACE_LAPS);
  } catch (e) {
    console.error(`[${city.id}] createCityRushWorld A LEVÉ :`);
    console.error(e);
    process.exit(1);
  }
  const buildMs = Date.now() - t0;
  const api = Object.keys(world);
  for (const key of ['start', 'pause', 'reset', 'action', 'setPhase', 'setCountdown', 'destroy']) {
    if (typeof world[key] !== 'function') fail(`API manquante : ${key}`, api);
  }

  const scene = world.scene || null;
  // Éclatement et réapparition des bonus : le pool d'effets vit dans la scène,
  // et chaque bonus ramassé doit éclater puis réapparaître 0,1 s (3 frames à
  // 30 Hz) plus tard sur sa rangée.
  const burstNodes = [];
  const pickupSlots = [];
  let slowZoneNodes = 0;
  // Berlines de police du trafic : le pilote d'essai les vise pour provoquer le
  // scénario « on percute un agent » (voir la boucle de course).
  const policeTrafficNodes = [];
  // Les voitures de course sont maintenant fermées et sans mesh de personnage ;
  // le pilote reste uniquement dans les métadonnées utilisées par le classement.
  const visibleDriverMeshes = [];
  const racerCars = [];
  // L'hélico d'observation du dernier tour (celui qui suit le pilote sans
  // jamais tirer) : un seul appareil, avec son pod caméra.
  const watchHeliNodes = [];
  scene?.traverse((object) => {
    if (object.name === 'watch-helicopter') watchHeliNodes.push(object);
    if (object.name === 'pickup-burst') burstNodes.push(object);
    if (object.name === 'traffic-police') policeTrafficNodes.push(object);
    if (object.userData?.type === 'slow-zone') slowZoneNodes += 1;
    if (object.userData?.kind === 'racer') racerCars.push(object);
    if (object.isMesh && /driver|face|helmet|torso|forearm/i.test(object.name || '')) visibleDriverMeshes.push(object.name);
    if (object.userData?.icon && object.userData?.ring && object.userData?.beam && object.userData?.halo && object.userData?.pad) {
      pickupSlots.push(object);
    }
  });
  // Les voitures de course sont fermées (aucun personnage visible) et portent
  // leur modèle 3D dédié : c'est l'état voulu par les modèles modernisés.
  if (visibleDriverMeshes.length) fail('un personnage est encore visible dans une voiture', visibleDriverMeshes);
  if (racerCars.length < 3) fail('les trois voitures de course ne sont pas construites', racerCars.length);
  if (racerCars.some((car) => !car.userData.driverId)) fail('l’identité pilote manque aux métadonnées du HUD', racerCars.map((car) => car.userData.driverId));
  if (racerCars.some((car) => !car.userData.archetype)) fail('une voiture n’a pas de modèle 3D dédié', racerCars.map((car) => car.userData.profileId));
  // L'hélico d'observation du dernier tour, construit une seule fois.
  if (watchHeliNodes.length !== 1) fail('l’hélico d’observation n’est pas construit une seule fois', watchHeliNodes.length);
  const watchHeli = watchHeliNodes[0];
  for (const part of ['rotor', 'tailRotor', 'beacon', 'pod']) {
    if (!watchHeli.userData?.[part]) fail(`l’hélico d’observation n’a pas de ${part}`, Object.keys(watchHeli.userData || {}));
  }
  if (watchHeli.visible) fail('l’hélico d’observation est visible avant la course');
  // La voiture du pilote et le pool de fumée : l'épave (barre à zéro) doit
  // tourner sur elle-même *dans sa fumée* avant de s'arrêter.
  const playerNode = racerCars.find((car) => car.userData.player) || null;
  if (!playerNode) fail('la voiture du pilote est introuvable dans la scène');
  const smokeNode = scene?.getObjectByName('smoke') || null;
  if (!smokeNode) fail('le pool de fumée est introuvable dans la scène');
  const visibleSmoke = () => smokeNode.children.filter((child) => child.visible).length;
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
  if (slowZoneNodes) fail('une zone d’huile ou de ralentissement est encore rendue', slowZoneNodes);
  if (!pickupSlots.some((slot) => slot.userData.type === CITY_RUSH_PICKUPS.BOOST)) fail('aucun pad turbo vert n’est placé sur la piste');
  const introStats = scene ? countVisible(scene) : null;

  // Changement de pilote au garage : le HUD et les métadonnées des trois
  // voitures suivent le roster ; les carrosseries restent vides.
  const driverBefore = racerCars.map((car) => car.userData.driverId);
  // Le joueur choisit Camila : le pilote associé au joueur doit être actualisé,
  // sans rebâtir ni peupler la voiture — les rivaux gardent chacun leur fiche.
  const nextRoster = selectCityRushRacers({ cityId: city.id, carId: car.id, runId: 7, playerDriverId: 'camila' });
  world.setRoster(nextRoster);
  const driverAfter = racerCars.map((car) => car.userData.driverId);
  if (driverAfter[0] === driverBefore[0]) {
    fail('la voiture du joueur n’a pas suivi le changement de pilote', { driverBefore, driverAfter, roster: nextRoster.map((r) => `${r.id}:${r.driverId}`) });
  }
  nextRoster.forEach((entry, index) => {
    if (driverAfter[index] !== entry.driverId) {
      fail(`les métadonnées de la voiture ${index} ne correspondent pas au roster`, { attendu: entry.driverId, trouve: driverAfter[index] });
    }
  });

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
  // Dernier tour : le compteur de tour court sur toute sa longueur (1 200 m) —
  // « mètres du tour = distance − début du dernier tour », à l'arrondi près — et
  // ne retombe pas à zéro quand on recroise le portique à mi-parcours, qui n'est
  // pas une nouvelle boucle. (La distance du pilote peut reculer de quelques
  // mètres sous un choc : on ne juge donc pas une jauge « croissante ».)
  let finalLapHudFrames = 0;
  let finalLapBadGauge = 0;
  let finalLapBadLength = 0;
  const finalLapGaugeSamples = [];
  let frames = 0;
  let maxVisible = 0;
  let maxTriangles = 0;
  // 5 minutes virtuelles, large : la course de 3 600 m la plus longue de 200
  // essais (police sur tout le dernier tour de 1 200 m) a duré 185 s.
  const maxFrames = 30 * 300;
  let steer = 'left';
  let slowFrames = 0;
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
  // Hélico d'observation : frames visibles au dernier tour, avant (interdit),
  // et rotation du rotor entre deux images (il doit vivre, pas planer figé).
  let watchHeliFinalLapFrames = 0;
  let watchHeliEarlyFrames = 0;
  let watchHeliRotorTurns = 0;
  let watchHeliRotorLast = watchHeli.userData.rotor.rotation.y;
  let watchHeliPodSwing = 0;
  let watchHeliPodLast = watchHeli.userData.pod.rotation.y;
  // Cadrage : la position de l'appareil projetée à l'écran par la vraie caméra
  // de poursuite. `visible === true` ne suffit pas — un hélico hors champ ou
  // caché sous les cartes du HUD est invisible pour le joueur.
  const watchHeliNdc = new THREE.Vector3();
  let watchHeliSettleFrames = 0;
  let watchHeliFramedFrames = 0;
  let watchHeliNdcYSum = 0;
  let watchHeliNdcYMin = Infinity;
  let watchHeliNdcYMax = -Infinity;
  let watchHeliNdcXMax = 0;
  let watchHeliCruiseYSum = 0;
  let watchHeliCruiseSamples = 0;
  // Rentrées après un tunnel : l'appareil s'efface sous les voûtes de la Shuto
  // et revient à la sortie. Tokyo doit en compter au moins une.
  let watchHeliReturns = 0;
  let watchHeliWasVisible = false;
  let watchHeliVisibleAge = 0;
  let watchHeliMeasuredFrames = 0;
  // La bande de ciel visible : sous les cartes du HUD (0,72 en coordonnée
  // écran) et au-dessus de la route (0,30), à l'intérieur du cadre en largeur.
  const WATCH_HELI_BAND_Y_MIN = 0.3;
  const WATCH_HELI_BAND_Y_MAX = 0.72;
  const WATCH_HELI_BAND_X_MAX = 0.85;
  // Barre de vie du pilote : carrés consommés par les effets, cohérence des
  // dégâts annoncés, et santé active seulement une fois l'escouade en piste.
  let healthHitEffects = 0;
  let healthHitsBySource = {};
  // Épave : barre à zéro. La voiture part en toupie dans sa fumée et la course
  // est perdue. On mesure la rotation cumulée, la fumée et la chute de vitesse.
  let wreckEffects = 0;
  let wreckSpinTurns = 0;
  let wreckSpinLast = 0;
  let wreckSmokeFrames = 0;
  let wreckMaxSpeed = null;
  let wreckLastSpeed = null;
  let wreckFrames = 0;
  let healthCubes = 0;
  const finishNotes = [];
  let healthBadDamage = 0;

  while (!callbacks.finish && frames < maxFrames) {
    const hud = callbacks.huds[callbacks.huds.length - 1];
    if (frames === 0) world.action('left'); // provoque un face-à-face contrôlé dans la voie inverse
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
    if (slowFrames > 12 && !rallyTarget && frames > 110) {
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
    // Hélico d'observation : visible seulement au dernier tour, et il tourne.
    // Le HUD est étranglé (une émission toutes les 100 ms) : on juge la
    // visibilité sur la distance du monde, exacte à l'image.
    if (watchHeliFinalLapFrames > 0 && watchHeli.visible && !watchHeliWasVisible) watchHeliReturns += 1;
    watchHeliWasVisible = watchHeli.visible;
    if (watchHeli.visible) {
      if (world.distance >= FINAL_LAP_START - 1) watchHeliFinalLapFrames += 1;
      else watchHeliEarlyFrames += 1;
      const rotorNow = watchHeli.userData.rotor.rotation.y;
      if (rotorNow > watchHeliRotorLast) watchHeliRotorTurns += 1;
      watchHeliRotorLast = rotorNow;
      const podNow = watchHeli.userData.pod.rotation.y;
      if (Math.abs(podNow - watchHeliPodLast) > 1e-6) watchHeliPodSwing += 1;
      watchHeliPodLast = podNow;
    }
    if (hud && frames % 15 === 0) {
      for (const type of [CITY_RUSH_POWERS.BLUE_SHOT, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.RADIO]) {
        if ((hud.inventory?.[type] || 0) >= (CITY_RUSH_POWER_RULES[type]?.chargeCost ?? 99)) world.action(type);
      }
    }
    runFrames(1, `course f${frames}`);
    // Le cadrage se juge après l'image, caméra à jour. On laisse passer le
    // temps de rapprochement (1,5 s) *de chaque apparition* : l'appareil revient
    // de haut après un tunnel, ces images-là ne disent rien du vol de croisière.
    watchHeliVisibleAge = watchHeli.visible ? watchHeliVisibleAge + 1 : 0;
    if (watchHeli.visible && world.distance >= FINAL_LAP_START - 1 && globalThis.__smokeCamera) {
      watchHeliSettleFrames += 1;
      if (watchHeliVisibleAge > 48) {
        watchHeliMeasuredFrames += 1;
        watchHeliNdc.copy(watchHeli.position).project(globalThis.__smokeCamera);
        const ndcY = watchHeliNdc.y;
        watchHeliNdcYSum += ndcY;
        watchHeliNdcYMin = Math.min(watchHeliNdcYMin, ndcY);
        watchHeliNdcYMax = Math.max(watchHeliNdcYMax, ndcY);
        watchHeliNdcXMax = Math.max(watchHeliNdcXMax, Math.abs(watchHeliNdc.x));
        watchHeliCruiseYSum += watchHeli.position.y;
        watchHeliCruiseSamples += 1;
        if (ndcY >= WATCH_HELI_BAND_Y_MIN && ndcY <= WATCH_HELI_BAND_Y_MAX && Math.abs(watchHeliNdc.x) <= WATCH_HELI_BAND_X_MAX) {
          watchHeliFramedFrames += 1;
        }
      }
    }
    // Épave en cours : la toupie, la fumée et la chute de vitesse.
    if (wreckEffects > 0 && !callbacks.finish) {
      wreckFrames += 1;
      const spinNow = playerNode.rotation.y;
      if (spinNow > wreckSpinLast) wreckSpinTurns += 1;
      wreckSpinLast = spinNow;
      if (visibleSmoke() >= 3) wreckSmokeFrames += 1;
      const speedNow = world.speed;
      if (Number.isFinite(speedNow)) {
        wreckMaxSpeed = wreckMaxSpeed === null ? speedNow : Math.max(wreckMaxSpeed, speedNow);
        wreckLastSpeed = speedNow;
      }
    }
    frames += 1;
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
    if (hud && hud.lap === hud.laps) {
      finalLapHudFrames += 1;
      // (Recalé derrière la ligne par un choc frontal, le joueur est à 0 m du tour.)
      const expectedLapDistance = Math.max(0, Math.min(CITY_RUSH_FINAL_LAP_LENGTH, hud.distance - (RACE_LAPS - 1) * CITY_RUSH_LAP_LENGTH));
      if (Math.abs(hud.lapDistance - expectedLapDistance) > 1) {
        finalLapBadGauge += 1;
        if (finalLapGaugeSamples.length < 5) finalLapGaugeSamples.push({ frame: frames, distance: hud.distance, lapDistance: hud.lapDistance, expectedLapDistance, lapProgress: hud.lapProgress });
      }
      if (hud.lapLength !== CITY_RUSH_FINAL_LAP_LENGTH || hud.lapDistance > hud.lapLength) finalLapBadLength += 1;
    }
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
  if (typeof console !== 'undefined' && process.env.CITY_RUSH_SMOKE_VERBOSE) console.log('épave mesurée :', { wreckFrames, wreckSpinTurns, wreckSmokeFrames, wreckLastSpeed });
  if (callbacks.errors.length) fail('erreurs remontées', callbacks.errors);

  const finish = callbacks.finish;
  const oncomingImpacts = callbacks.effects.filter((effect) => effect.type === 'traffic-impact' && effect.oncoming && effect.pushedAside && effect.pushDirection === 'left');
  if (!oncomingImpacts.length) fail('aucune collision frontale n’a poussé la voiture touchée vers la gauche', callbacks.effects.filter((effect) => effect.type === 'traffic-impact'));
  if (finish.laps !== RACE_LAPS) fail('finish.laps ≠ nombre de tours de la course', finish);
  if (!Array.isArray(finish.racers) || finish.racers.length !== 3) fail('chaque course doit finir avec exactement trois pilotes', finish.racers);
  if (!Array.isArray(callbacks.huds.at(-1)?.racers) || callbacks.huds.at(-1).racers.length !== 3) {
    fail('le HUD ne contient pas exactement trois pilotes', callbacks.huds.at(-1));
  }
  const lastHud = callbacks.huds.at(-1);
  for (const field of ['lap', 'laps', 'lapProgress', 'lapDistance', 'lapLength', 'distance', 'speed', 'rank', 'racers']) {
    if (!(field in lastHud)) fail(`champ HUD manquant : ${field}`, Object.keys(lastHud));
  }
  // Au dernier tour, la « longueur du tour » du HUD est celle du grand tour.
  const expectedLapLength = lastHud.lap >= RACE_LAPS ? CITY_RUSH_FINAL_LAP_LENGTH : CITY_RUSH_LAP_LENGTH;
  if (lastHud.laps !== RACE_LAPS || lastHud.lapLength !== expectedLapLength) fail('HUD laps/lapLength incohérents', lastHud);
  if (lastHud.totalDistance !== RACE_DISTANCE) fail('HUD totalDistance ≠ distance de la course', lastHud);
  if (finalLapBadGauge) fail(`le compteur du dernier tour est faux sur ${finalLapBadGauge} images (il doit courir sur 1 200 m)`, { finalLapHudFrames, samples: finalLapGaugeSamples });
  if (finalLapBadLength) fail('longueur de tour incohérente au dernier tour (attendu 1 200 m, compteur ≤ longueur)', { finalLapBadLength, finalLapHudFrames });
  if ([...lapSeen].some((lap) => lap < 1 || lap > RACE_LAPS)) fail('le HUD a affiché un tour hors course', [...lapSeen]);
  // Passages de ligne du joueur : les débuts de tour 2 … LAPS, puis (au plus) un
  // point de passage au milieu du grand dernier tour — il ne lance aucun tour.
  const checkpoints = callbacks.laps.filter((l) => l.checkpoint);
  const playerLaps = callbacks.laps.filter((l) => !l.checkpoint).map((l) => l.lap);
  const expectedRemaining = RACE_DISTANCE - RACE_LAPS * CITY_RUSH_LAP_LENGTH;
  if (checkpoints.length > 1) fail('plus d’un point de passage au dernier tour', checkpoints);
  for (const checkpoint of checkpoints) {
    if (checkpoint.lap !== RACE_LAPS || !checkpoint.final || checkpoint.remaining !== expectedRemaining) {
      fail('point de passage incohérent (dernier tour, reste à courir)', { checkpoint, expectedRemaining });
    }
  }
  // Le point de passage vient après le début du dernier tour, jamais avant.
  const lapOrder = callbacks.laps.map((l) => (l.checkpoint ? 'C' : l.lap));
  if (checkpoints.length && lapOrder.at(-1) !== 'C') fail('le point de passage précède un début de tour', lapOrder);
  if (callbacks.laps.some((l) => l.lap > l.laps)) fail('un passage de ligne annonce un tour au-delà de la course', callbacks.laps);
  if (callbacks.laps.some((l) => !l.checkpoint && l.remaining !== RACE_DISTANCE - (l.lap - 1) * CITY_RUSH_LAP_LENGTH)) {
    fail('le reste à courir annoncé à un passage de ligne est faux', callbacks.laps);
  }
  const checkpointEffects = callbacks.effects.filter((e) => e.type === 'lap-checkpoint');
  if (checkpointEffects.length !== checkpoints.length) fail('effet lap-checkpoint et passage de ligne divergent', { checkpointEffects, checkpoints });
  // Les débuts de tour se suivent : 2, 3, 4 … sans doublon ni saut.
  if (playerLaps.some((lap, i) => lap !== i + 2)) fail('les débuts de tour ne se suivent pas (2, 3, 4 …)', callbacks.laps);
  // Une ligne est annoncée si, et seulement si, le joueur est allé jusque-là
  // (15 m de marge : le HUD n'est émis que toutes les 120 ms). Lignes 1 …
  // LAPS − 1 : débuts de tour ; au-delà : points de passage du dernier tour.
  const playerReach = Math.max(...callbacks.huds.map((h) => h.distance || 0));
  const callbackLines = Array.from({ length: RACE_LAPS - 2 + CITY_RUSH_FINAL_LAP_LOOPS }, (_, i) => (i + 1) * CITY_RUSH_LAP_LENGTH);
  const surelyCrossed = callbackLines.filter((at) => at + 15 <= playerReach).length;
  const maybeCrossed = callbackLines.filter((at) => at - 15 <= playerReach).length;
  if (callbacks.laps.length < surelyCrossed || callbacks.laps.length > maybeCrossed) {
    fail(`passages de ligne annoncés (${callbacks.laps.length}) incohérents avec la distance du joueur (${playerReach} m)`, { surelyCrossed, maybeCrossed, laps: callbacks.laps });
  }
  const winnerIsPlayer = finish.racers?.find((r) => r.player)?.rank === 1 || finish.rank === 1;
  if (winnerIsPlayer) {
    const expectedLaps = Array.from({ length: RACE_LAPS - 1 }, (_, i) => i + 2);
    const joined = playerLaps.join(',');
    if (joined !== expectedLaps.join(',') && joined !== [...expectedLaps, RACE_LAPS + 1].join(',')) {
      fail(`passages de ligne du joueur inattendus (attendu tours ${expectedLaps.join(', ')})`, callbacks.laps);
    }
    const finalLapEffect = callbacks.effects.find((e) => e.type === 'final-lap');
    if (!finalLapEffect) fail('effet final-lap jamais émis', callbacks.effects.map((e) => e.type));
    if (![...lapSeen].includes(RACE_LAPS)) fail('le HUD n’a jamais affiché le dernier tour', [...lapSeen]);
    // Le vainqueur recroise le portique au milieu du dernier tour : un point de
    // passage, et un seul.
    if (checkpoints.length !== 1) fail('le vainqueur n’a pas passé le point de passage du dernier tour', callbacks.laps);
  } else if (!callbacks.laps.length && !callbacks.effects.some((e) => e.type === 'rival-final-lap')) {
    fail('aucun passage de ligne détecté (ni joueur ni rival)', callbacks.effects.map((e) => e.type));
  }
  // Bande-son : le moteur suit la course image par image, les feux sonnent
  // quatre fois (3 · 2 · 1 · GO), chaque passage de ligne du joueur a sa cloche
  // (point de passage compris) et l'arrivée ne sonne qu'une fois.
  if ((audioCalls.engine || 0) < frames) fail('le moteur n’est pas piloté à chaque image', audioCalls);
  // Quatre au premier départ (3 · 2 · 1 · GO) ; le rejeu en remet un.
  if ((audioCalls.countdownBeep || 0) < 4) fail('les feux de départ n’ont pas sonné 3 · 2 · 1 · GO', audioCalls);
  if (audioCalls.finish !== 1) fail('la fanfare d’arrivée n’a pas sonné une fois', audioCalls);
  if ((audioCalls.lap || 0) !== callbacks.laps.length) fail('un passage de ligne sur deux est muet', audioCalls);
  // Un missile encore en vol au moment du drapeau à damier est coupé net par
  // l'arrivée : au plus une frappe peut rester sans explosion (jamais
  // l'inverse). Une berline de police détruite explose elle aussi : le compte
  // attendu des explosions couvre missiles et berlines abattues.
  const destroyedPolice = callbacks.effects.filter((effect) => effect.type === 'police-destroyed').length;
  const expectedExplosions = (audioCalls.missileLaunch || 0) + destroyedPolice;
  if ((audioCalls.explosion || 0) > expectedExplosions || expectedExplosions - (audioCalls.explosion || 0) > 1) {
    fail('un missile ou une berline sans explosion (ou l’inverse)', audioCalls);
  }
  // Un missile suppose un hélicoptère ; une frappe avortée par l'arrivée ou
  // par `reset()` compte un démarrage de plus que de missiles, jamais
  // l'inverse. Et chaque rotor démarré finit éteint.
  if ((audioCalls.helicopterStart || 0) < (audioCalls.missileLaunch || 0)) fail('un missile sans hélicoptère', audioCalls);
  if ((audioCalls.helicopterStop || 0) < (audioCalls.helicopterStart || 0)) fail('un rotor n’a pas été éteint', audioCalls);
  if (!audioCalls.pickup) fail('aucun bip de ramassage alors que des bonus ont été pris', audioCalls);

  const maxDistance = Math.max(...finish.racers.map((r) => r.distance ?? 0));
  if (finish.destroyed) {
    // Course perdue sur une épave : le pilote n'a pas fini, il est dernier, et
    // la voiture s'est arrêtée après avoir tourné dans sa fumée.
    if (wreckEffects !== 1) fail('la course est perdue sans un unique effet d’épave', { wreckEffects, finish });
    if (finish.rank !== finish.racers.length) fail('une épave n’est pas classée dernière', { rank: finish.rank, racers: finish.racers.length });
    if (finish.racers.at(-1)?.id !== 'player') fail('le pilote détruit n’est pas en fin de tableau d’arrivée', finish.racers.map((r) => r.id));
    if (!(maxDistance < RACE_DISTANCE - 1)) fail('une course perdue ne peut pas avoir couvert la distance totale', { maxDistance, RACE_DISTANCE });
    // La course ne peut plus se clore sur la ligne d'un rival pendant la toupie
    // (garde `!playerWrecked`) : une épave va au bout de ses 3,2 s.
    if (wreckSpinTurns < 60) fail(`l’épave n’a tourné que sur ${wreckSpinTurns} images`, wreckSpinTurns);
    if (wreckSmokeFrames < 30) fail(`l’épave ne fume pas (${wreckSmokeFrames} images avec de la fumée)`, wreckSmokeFrames);
    if (wreckFrames < 60) fail(`l’épave ne dure que ${wreckFrames} images`, wreckFrames);
    if (!(wreckLastSpeed !== null && wreckLastSpeed < 1)) fail(`l’épave ne s’arrête pas (${wreckLastSpeed} m/s)`, {
      maxSpeed: wreckMaxSpeed, lastSpeed: wreckLastSpeed, frames: wreckFrames,
    });
    finishNotes.push('course perdue sur une épave (barre de vie à zéro)');
  } else {
    if (wreckEffects) fail('une épave a été comptée sur une course gagnée/terminée', wreckEffects);
    if (maxDistance < RACE_DISTANCE - 1) fail('le vainqueur n’a pas parcouru toute la distance', finish.racers);
  }
  if (maxVisible > 600) fail(`trop de meshes visibles : ${maxVisible}`);
  if (callbacks.pickups.length && !burstNodes.length) fail('aucun objet d’éclatement de bonus dans la scène');
  if (callbacks.pickups.length && !burstFrames) fail('bonus ramassés sans aucun éclatement visible', callbacks.pickups.length);
  if (callbacks.pickups.length && !respawnedPickups) fail('aucun bonus ramassé n’a réapparu après 0,1 s', callbacks.pickups.length);
  // Escouade de police du dernier tour : deux berlines, entrées derrière le
  // leader armées (bleu et rouge chargés, jaune vide), jamais classées,
  // sirène allumée puis éteinte.
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
  if (squadCars.length !== CITY_RUSH_POLICE_COUNT) {
    fail(`${squadCars.length} berline(s) d’escouade en piste au lieu de ${CITY_RUSH_POLICE_COUNT}`, firstPoliceHud.police);
  }
  if (firstPoliceHud.police.length > CITY_RUSH_POLICE_COUNT + 3) fail('trop de poursuivants en piste', firstPoliceHud.police);
  // Berlines armées : l'escouade entre en piste avec le tir bleu et la rafale
  // rouge chargés, jamais l’hélicoptère (jaune), qu’il faut voler sur la route.
  // Le contrôle se fait sur l'annonce d'arrivée, avant la première rafale.
  const arrivalCars = policeArrivals[0]?.armed || [];
  if (arrivalCars.length !== CITY_RUSH_POLICE_COUNT) {
    fail(`${arrivalCars.length} berline(s) annoncée(s) armée(s) au lieu de ${CITY_RUSH_POLICE_COUNT}`, policeArrivals[0]);
  }
  for (const car of arrivalCars) {
    if (!car[CITY_RUSH_POWERS.BLUE_SHOT]) fail('une berline entre en piste sans tir bleu chargé', car);
    if (!car[CITY_RUSH_POWERS.PISTOL]) fail('une berline entre en piste sans rafale rouge chargée', car);
    if (car[CITY_RUSH_POWERS.RADIO]) fail('une berline entre en piste avec l’hélicoptère chargé', car);
  }
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
  // L'hélico d'observation : absent avant le dernier tour, présent pendant
  // (rotors et pod animés), et il s'efface après l'arrivée.
  if (watchHeliEarlyFrames) fail(`l’hélico d’observation est visible sur ${watchHeliEarlyFrames} images avant le dernier tour`);
  if (watchHeliFinalLapFrames < 60) fail(`l’hélico d’observation ne suit le pilote que ${watchHeliFinalLapFrames} images du dernier tour`);
  if (watchHeliRotorTurns < 60) fail('le rotor de l’hélico d’observation ne tourne pas', watchHeliRotorTurns);
  if (watchHeliPodSwing < 30) fail('le pod caméra de l’hélico d’observation ne balaie pas', watchHeliPodSwing);
  // L'appareil doit être visible *dans le cadre* : ni hors champ, ni écrasé
  // contre le bord supérieur, ni caché sous les cartes du HUD.
  const watchHeliMeasured = watchHeliMeasuredFrames;
  if (watchHeliMeasured < 60) {
    fail(`le cadrage de l’hélico d’observation n’est mesurable que sur ${watchHeliMeasured} images`, watchHeliSettleFrames);
  }
  const watchHeliFramedShare = watchHeliFramedFrames / Math.max(1, watchHeliMeasured);
  if (watchHeliFramedShare < 0.85) {
    fail(`l’hélico d’observation sort de la bande de ciel visible sur ${((1 - watchHeliFramedShare) * 100).toFixed(0)} % du dernier tour`, {
      yMin: watchHeliNdcYMin, yMax: watchHeliNdcYMax, xMax: watchHeliNdcXMax, band: [WATCH_HELI_BAND_Y_MIN, WATCH_HELI_BAND_Y_MAX, WATCH_HELI_BAND_X_MAX],
    });
  }
  if (watchHeliNdcYMax > 0.8) {
    fail(`l’hélico d’observation frôle le haut du cadre (${watchHeliNdcYMax.toFixed(2)}) — il passe sous les cartes du HUD`, { yMin: watchHeliNdcYMin, yMax: watchHeliNdcYMax });
  }
  if (watchHeliNdcYMin < 0.15) {
    fail(`l’hélico d’observation descend dans la circulation (${watchHeliNdcYMin.toFixed(2)})`, { yMin: watchHeliNdcYMin, yMax: watchHeliNdcYMax });
  }
  // Sous les voûtes de la Shuto, il n'y a pas de ciel : l'appareil s'efface et
  // doit revenir une fois ressorti (sinon il volerait dans le tunnel).
  if (city.id === 'tokyo' && watchHeliReturns < 1) {
    fail('l’hélico d’observation ne rentre jamais après un tunnel', { watchHeliReturns, finalLapFrames: watchHeliFinalLapFrames });
  }
  if (watchHeliEarlyFrames && watchHeliFinalLapFrames < 60) {
    fail('l’hélico d’observation suit le pilote hors du dernier tour', { watchHeliEarlyFrames, watchHeliFinalLapFrames });
  }
  // La barre de vie du pilote : pleine à l'apparition (escouade en piste),
  // jamais au-dessus du maximum, jamais croissante, et chaque tir encaissé
  // retire exactement ce que le barème annonce.
  // Toutes les émissions du HUD sont gardées : la barre de vie du pilote doit
  // apparaître (dernier tour), pleine, bornée, et ne jamais remonter.
  const healthHuds = callbacks.huds.filter((entry) => entry.playerHealthActive);
  if (!healthHuds.length) fail('la barre de vie du pilote n’apparaît jamais');
  if (Number(healthHuds[0].playerHealth) !== Number(healthHuds[0].playerHealthMax)) {
    fail('la barre de vie du pilote n’est pas pleine à l’apparition', healthHuds[0]);
  }
  let healthBadBounds = 0;
  let healthRiseFrames = 0;
  let healthPrevious = null;
  for (const entry of healthHuds) {
    const value = Number(entry.playerHealth);
    const max = Number(entry.playerHealthMax);
    if (!Number.isFinite(value) || !Number.isFinite(max) || value < 0 || value > max) healthBadBounds += 1;
    if (healthPrevious !== null && value > healthPrevious) healthRiseFrames += 1;
    healthPrevious = value;
  }
  if (healthBadBounds) fail(`la barre de vie du pilote sort de ses bornes sur ${healthBadBounds} images`);
  if (healthRiseFrames) fail(`la barre de vie du pilote remonte sur ${healthRiseFrames} images`);
  // Elle n'apparaît qu'au dernier tour du pilote — jamais avant, et jamais
  // après l'arrivée (les tours du HUD sont ceux du pilote).
  const healthOutsideFinalLap = healthHuds.filter((entry) => (entry.lap || 1) < (entry.laps || 1));
  if (healthOutsideFinalLap.length) {
    fail('la barre de vie du pilote apparaît avant son dernier tour', healthOutsideFinalLap[0]);
  }
  if (lastHud.playerHealthActive) fail('la barre de vie du pilote reste après l’arrivée', lastHud.playerHealth);
  let runningHealth = null;
  for (const effect of callbacks.effects) {
    if (effect.type === 'player-wrecked') wreckEffects += 1;
    if (effect.type === 'player-health') {
      if (effect.maxHealth !== CITY_RUSH_PLAYER_HEALTH) fail('la barre de vie du pilote n’a pas son maximum', effect);
      runningHealth = effect.health;
      if (runningHealth !== CITY_RUSH_PLAYER_HEALTH) fail('la barre de vie du pilote ne part pas pleine', effect);
      continue;
    }
    if (effect.type !== 'player-hit') continue;
    healthHitEffects += 1;
    healthHitsBySource[effect.source] = (healthHitsBySource[effect.source] || 0) + 1;
    // Un carambolage ne se compte que si la berline est DEVANT le pilote : une
    // berline repliée derrière lui pour tirer ne fait que le suivre.
    if (effect.source === 'collision' && !(Number(effect.gap) > 0)) {
      healthBadDamage += 1;
      fail('un carambolage est compté avec une berline restée derrière le pilote', effect);
    }
    if (runningHealth === null) { healthBadDamage += 1; continue; }
    // Le barème donne le coût brut (bleu 1 · rouge 2 · choc 1) ; la barre, elle,
    // s'arrête à zéro : un rouge tiré sur le dernier carré n'en retire qu'un.
    const cost = effect.source === 'pistol' ? 2 : 1;
    const expected = Math.min(cost, runningHealth);
    if (effect.damage !== expected) healthBadDamage += 1;
    runningHealth = Math.max(0, runningHealth - effect.damage);
    if (runningHealth !== effect.health) healthBadDamage += 1;
    if (effect.health === 0) healthCubes += 1;
  }
  if (healthBadDamage) fail('un dégât encaissé par le pilote ne suit pas le barème (bleu 1 · rouge 2 · choc 1)', healthBadDamage);

  if ((firstPoliceHud.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le classement du HUD');
  if ((finish.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le tableau d’arrivée');
  if (lastHud.police?.length) fail('l’escouade reste en piste après l’arrivée', lastHud.police);
  if (!audioCalls.policeSiren) fail('la sirène de police n’a jamais sonné', audioCalls);

  const groundBoosts = callbacks.pickups.filter((pickup) => pickup.type === CITY_RUSH_PICKUPS.BOOST);
  if (!groundBoosts.length) fail('le pilote n’a pas ramassé de pad turbo pendant la course', callbacks.pickups);
  if (groundBoosts.some((pickup) => !pickup.autoActivated || pickup.chargeCost !== 1)) {
    fail('un pad turbo ne s’est pas activé automatiquement au ramassage', groundBoosts);
  }
  if ((audioCalls.boost || 0) < groundBoosts.length) fail('un pad turbo ramassé n’a pas déclenché son boost sonore', { groundBoosts: groundBoosts.length, audioCalls });
  const bluePickups = callbacks.pickups.filter((pickup) => pickup.type === CITY_RUSH_POWERS.BLUE_SHOT);
  if (!bluePickups.length || bluePickups.some((pickup) => pickup.chargeCost !== 1 || pickup.progress < 1)) {
    fail('un unique bonus bleu ne charge pas un tir droit', bluePickups);
  }
  if (callbacks.pickups.some((pickup) => pickup.autoActivated && pickup.type !== CITY_RUSH_PICKUPS.BOOST && !CITY_RUSH_POWER_RULES[pickup.type]?.automatic)) {
    fail('un pouvoir manuel a été signalé comme activation automatique', callbacks.pickups.filter((pickup) => pickup.autoActivated));
  }
  const blueShotEffects = new Set(['blue-shot-hit', 'blue-shot-hit-player', 'blue-shot-miss', 'rival-blue-shot']);
  const blueShotsUsed = callbacks.effects.filter((effect) => blueShotEffects.has(effect.type)).length;
  if (!blueShotsUsed) fail('aucun tir droit bleu n’a été testé', callbacks.effects);
  if (!audioCalls.gunshot) fail('un tir droit bleu a été utilisé sans bruit de coup de feu', { blueShotsUsed, audioCalls });


  // Fin de course : la caméra tourne, le départ fait la fête, pas d’exception.
  world.setPhase('finished');
  runFrames(60, 'finished');
  // L'hélico d'observation quitte la scène : il monte, puis s'efface. La
  // comparaison porte sur son altitude de croisière — la route monte et descend
  // d'une ville à l'autre, une hauteur absolue ne veut rien dire.
  const watchHeliCruiseY = watchHeliCruiseSamples ? watchHeliCruiseYSum / watchHeliCruiseSamples : 0;
  if (watchHeli.visible && watchHeli.position.y < watchHeliCruiseY + 6) {
    fail('l’hélico d’observation ne s’éloigne pas après l’arrivée', { y: watchHeli.position.y, cruiseY: watchHeliCruiseY });
  }
  runFrames(90, 'finished');
  if (watchHeli.visible) fail('l’hélico d’observation reste en scène après l’arrivée', watchHeli.position.toArray());
  // Rejouer : reset + nouveau départ sans fuite d’état.
  world.reset();
  world.setPhase('countdown');
  world.setCountdown(3);
  runFrames(10, 'replay countdown');
  const hudAfterReset = callbacks.huds.at(-1);
  if (hudAfterReset.lap !== 1 || hudAfterReset.distance > 1) fail('reset() ne remet pas la course au tour 1', hudAfterReset);
  if (watchHeli.visible) fail('l’hélico d’observation reste dans le ciel après reset()');
  if (hudAfterReset.playerHealthActive || hudAfterReset.playerHealth !== null) {
    fail('la barre de vie du pilote survit à reset()', hudAfterReset.playerHealth);
  }

  try { world.destroy(); } catch (e) { console.error('destroy() a levé :', e); process.exit(1); }
  if (rafQueue.size) fail('rAF encore planifié après destroy()', rafQueue.size);

  const effectTypes = [...new Set(callbacks.effects.map((e) => e.type))];
  // Tirs droits bleus partis d'une berline et arrivés sur le joueur : les
  // berlines entrent en piste bleu chargé, l'information est reportée telle
  // quelle — leur tir ne se commande pas, on ne peut pas l'exiger d'un circuit.
  const policeBlueHits = callbacks.effects.filter((e) => e.type === 'blue-shot-hit-player' && /^POLICE/.test(String(e.attacker))).length;
  policeBlueHitTotal += policeBlueHits;
  console.log(
    `[${city.id}] OK — build ${buildMs} ms · course ${raceSeconds.toFixed(1)} s virtuelles / ${frames} frames` +
    ` · tours joueur ${playerLaps.join('→') || '—'} · rang ${finish.rank}` +
    ` · HUD ${callbacks.huds.length} · bonus ${callbacks.pickups.length} (éclatés ${burstFrames} f) · effets ${effectTypes.join('/')}` +
    ` · police ${firstPoliceHud ? `entrée à ${firstPoliceHud.police.map((car) => car.distance).join('/')} m (leader ${Math.round(leaderDistance)}) · ${policeSquadFrames} f en piste · ${policeAheadFrames} f devant · plus près ${policeClosestGap.toFixed(1)} m · à ≤ ${POLICE_ENGAGE_RANGE} m ${(policeEngagedFrames / Math.max(1, policeSquadFrames) * 100).toFixed(0)} % · retard max ${policeMaxLag.toFixed(0)} m · ${policeBlockadeFrames} f en barrage${policeStunFrames ? ` · ${policeStunFrames} f sonnée` : ''}` : 'jamais entrée'}` +
    ` · police routière ${rallies.length} contact(s) · ${ralliedHudFrames} f en chasse · ${ralliedAheadFrames} f devant le joueur · ${ralliedBlockadeFrames} f en barrage` +
    ` · écart mini berline/pilote ${Number.isFinite(policeWorstOverlap) ? policeWorstOverlap.toFixed(1) : '—'} m` +
    ` · hélico d’observation ${watchHeliFinalLapFrames} f (${watchHeliReturns} rentrée(s) de tunnel · rotor ${watchHeliRotorTurns} tours · cadre y ${watchHeliNdcYMin.toFixed(2)}–${watchHeliNdcYMax.toFixed(2)}, moy ${(watchHeliNdcYSum / Math.max(1, watchHeliMeasured)).toFixed(2)} · x ≤ ${watchHeliNdcXMax.toFixed(2)} · ${(watchHeliFramedFrames / Math.max(1, watchHeliMeasured) * 100).toFixed(0)} % dans la bande)` +
    ` · barre de vie du pilote ${healthHuds.length} HUD · ${healthHitEffects} touche(s) subie(s) (bleu ${healthHitsBySource['blue-shot'] || 0} · rouge ${healthHitsBySource.pistol || 0} · carambolage ${healthHitsBySource.collision || 0}) · ${healthCubes} passage(s) à zéro` +
    ` (${policePlayerOverlapFrames} f de recouvrement · rival ${Number.isFinite(policeAiOverlap) ? policeAiOverlap.toFixed(1) : '—'} m)` +

    (introStats ? ` · intro ${introStats.meshes} meshes / ${introStats.triangles} tris` : '') +
    ` · max visibles ${maxVisible} meshes / ${maxTriangles} tris` +
    ` · sons ${AUDIO_METHODS.filter((name) => audioCalls[name]).map((name) => `${name} ${audioCalls[name]}`).join(' / ')}`,
  );
}
console.log(`SMOKE OK — ${cities.length} ville(s), ${RACE_LAPS} tours (${RACE_DISTANCE} m, dernier tour ${CITY_RUSH_FINAL_LAP_LENGTH} m) · tirs bleus de la police sur le joueur ${policeBlueHitTotal}`);
process.exit(0);
