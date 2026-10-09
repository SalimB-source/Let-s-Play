// Smoke « Vice City Rush » : exécute createCityRushWorld (vrai code) avec un
// faux WebGLRenderer, pompe la boucle animate à 30 Hz et joue une course
// complète pour chaque ville demandée : 6 tours, soit cinq boucles de 1 200 m
// puis un grand dernier tour de 2 400 m (deux boucles, le portique est recroisé
// à mi-parcours) — 8 400 m en tout.
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
let virtualFrame = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_COURSES, CITY_RUSH_CARS, CITY_RUSH_LAPS, CITY_RUSH_LAP_LENGTH, CITY_RUSH_FINAL_LAP_LENGTH, CITY_RUSH_POWER_RULES,
  CITY_RUSH_LANE_X, CITY_RUSH_CAR_GAP, CITY_RUSH_SCROLL_SCALE, CITY_RUSH_TRAFFIC_CAR_GAP, CITY_RUSH_POLICE_COUNT, CITY_RUSH_POWERS, CITY_RUSH_PICKUPS,
  CITY_RUSH_POLICE_TRAFFIC_TYPES,
  CITY_RUSH_MINI_GARAGE_COUNT, CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT, CITY_RUSH_MINI_GARAGE_WIDTH,
  CITY_RUSH_HEALTH_PICKUP_RESTORE, cityRushMiniGarageAvailable, cityRushMiniGarageLanes,
  CITY_RUSH_MINI_GARAGE_HUD_RANGE,
  cityRushMiniGarageTrackDistances, cityRushMiniGarageMidRaceDistance, cityRushMiniGarageWantedLevel,
  CITY_RUSH_PLAYER_HEALTH, cityRushPoliceMaxHealth, CITY_RUSH_POLICE_COLLISION_COOLDOWN, cityRushCarMaxHealth,
  CITY_RUSH_POLICE_TURNAROUND_DURATION,
  CITY_RUSH_WANTED_MAX_STARS, CITY_RUSH_SPIKE_BLOCK_STARS, CITY_RUSH_SPIKE_BLOCK_LEAD, CITY_RUSH_SPIKE_BLOCK_COOLDOWN,
  CITY_RUSH_SPIKE_LANES, CITY_RUSH_SPIKE_SLOW_DURATION, CITY_RUSH_SPIKE_SLOW_FACTOR, cityRushSpikeLanes,
  CITY_RUSH_SUV_CHARGE_COUNT, CITY_RUSH_SUV_CHARGE_TYPE, CITY_RUSH_SUV_CHARGE_ALERT_RANGE,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP, CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP, cityRushActiveWeapon,
  CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP, CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
  CITY_RUSH_FINAL_LAP_LOOPS, cityRushRaceDistance, selectCityRushRacers, cityRushLaneConfig,
  CITY_RUSH_ONCOMING_BONUS_MAX,
  CITY_RUSH_PLAYER_SPEED, CITY_RUSH_TRACK_BOOST_SPEED_FACTOR, CITY_RUSH_CLEAN_LINE_MAX_BONUS,
  cityRushCoursePace,
} = await import('../src/games/cityRushRules.js');

// Tours de la course jouée : 6 par défaut (8 400 m) ;
// `CITY_RUSH_SMOKE_LAPS=4` joue une course de 6 000 m. Au moins 3 : en dessous,
// la course est trop courte pour exercer l'escouade du dernier tour et les
// charges rouges de mitrailleuse.
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
// L'unique portique de service de la course jouée : la porte de mi-course.
const MINI_GARAGE_TRACK_DISTANCES = cityRushMiniGarageTrackDistances({ laps: RACE_LAPS });

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
// Voie d'une voiture du trafic : le monde la publie (`userData.lane`), sinon on
// la déduit de l'abscisse — fiable seulement sur une chaussée droite.
const trafficNodeGap = (node, worldDistance) => {
  const published = Number(node?.userData?.trackDistance);
  if (Number.isFinite(published)) return published - worldDistance;
  return (3.1 - Number(node?.position.z || 3.1)) / CITY_RUSH_SCROLL_SCALE;
};
const trafficNodeLane = (node, courseLanes) => {
  const published = Number(node?.userData?.lane);
  if (Number.isFinite(published) && published >= 0 && published < courseLanes.laneCount) return published;
  let closest = 0;
  let best = Infinity;
  for (let index = 0; index < courseLanes.laneCount; index += 1) {
    const delta = Math.abs(courseLanes.laneX(index) - node.position.x);
    if (delta < best) { best = delta; closest = index; }
  }
  return closest;
};
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualFrame += 1;
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const countVisible = (scene, { detail = false } = {}) => {
  let meshes = 0;
  let triangles = 0;
  // Dépassement du budget de scène : le détail par branche dit d'où viennent
  // les maillages en trop (trafic, escouade, décor de la ville…). Il n'est
  // calculé que lorsque la mesure demandée le réclame.
  const groups = detail ? new Map() : null;
  scene.traverse((o) => {
    if (!o.visible) return;
    let p = o.parent;
    while (p) { if (!p.visible) return; p = p.parent; }
    if (o.isMesh || o.isPoints || o.isLine) {
      meshes += 1;
      if (groups) {
        let root = o;
        while (root.parent && root.parent !== scene) root = root.parent;
        const key = root.name || root.userData?.kind || root.userData?.type || root.type;
        groups.set(key, (groups.get(key) || 0) + 1);
      }
      const geo = o.geometry;
      if (geo?.index) triangles += geo.index.count / 3;
      else if (geo?.attributes?.position) triangles += geo.attributes.position.count / 3;
    }
  });
  return {
    meshes,
    triangles: Math.round(triangles),
    groups: groups ? [...groups].sort((a, b) => b[1] - a[1]).slice(0, 8) : null,
  };
};

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_SMOKE_ALL === '1';
// Tous les parcours jouables, routes comprises : sans elles, un décor propre
// à une route (ranchos mexicains, chapelle, station de la 66) n'était jamais
// construit et un plantage passait entre les mailles du filet.
const courses = all ? CITY_RUSH_COURSES : [CITY_RUSH_COURSES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_COURSES[0]];
// Échantillon de voitures pour les parcours, avec la nouvelle compacte
// intermédiaire pour vérifier aussi sa présence dans le monde 3D réel.
const smokeCarIds = ['nova-18-gt', 'vice-roadster', 'turbo-gt', 'muscle-86', 'night-comet'];
// Bande-son : le monde ne connaît qu'une ref. On y glisse un compteur — pas
// de Web Audio ici, mais la certitude qu'une course complète déclenche bien
// moteur, feux, tours, tirs et arrivée ; aucun rotor d'attaque ni missile ne part.
const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'shotgun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff', 'garageRepair',
];

// L'escouade du dernier tour doit rester dans le sillage du joueur sur tous les
// parcours. La voiture de chasse la plus proche doit être à moins de 80 m sur
// au moins 40 % du dernier tour, approcher à 30 m au moins une fois et ne jamais
// décrocher de plus de 200 m. Ces seuils portent sur les positions réelles du
// HUD, avec l'escouade ciblant toujours le joueur (pas le leader éventuel).
// Rattrapage civil : au-delà de ces seuils, un pilote qui n'a rien percuté sur
// un parcours sans contresens a laissé passer une occasion franche (30 m gagnés
// sur 45 images, soit 1,5 s de fermeture).
const CIVIL_RAM_MIN_CLOSING = 30; // m
const CIVIL_RAM_MIN_FRAMES = 45;
const POLICE_ENGAGE_RANGE = 80; // m
const POLICE_MIN_ENGAGED_SHARE = 0.4;
const POLICE_MAX_LAG = 200; // m

for (const [index, city] of courses.entries()) {
  const carId = smokeCarIds[index % smokeCarIds.length];
  const car = CITY_RUSH_CARS.find((profile) => profile.id === carId) || CITY_RUSH_CARS[0];
  // Voies du parcours : le pilote automatique s'y réfère pour viser le
  // contresens (à gauche ou à droite selon le pays) et pour se rabattre.
  const courseLanes = cityRushLaneConfig(city);
  const callbacks = {
    ready: 0, errors: [], huds: [], laps: [], effects: [], pickups: [], finish: null,
    // Chaque passage en mini-garage est suivi du premier HUD émis ensuite :
    // c'est sur cette image que se vérifie le relâchement de la poursuite.
    garageChecks: [], awaitingGarage: null,
  };
  // Les contacts de police sont légitimes : le pilote inflige 1 dégât à la
  // berline, et en encaisse un carré. On retient leur frame pour ne pas
  // signaler l'intervalle de collision comme un passage à travers une voiture
  // solide.
  const policeCollisionFrames = new Map();
  // Recul mécanique : un choc frontal recale la voiture qui le subit derrière
  // l'adversaire (`distance = oncoming.distance - solidGap`). Une berline qui
  // suivait de près se retrouve alors dans son pare-chocs — ce n'est pas le
  // pilote qui l'a traversée. On mémorise l'image de chaque recul, par voiture.
  const shoveFrames = new Map();
  const lastRacerDistances = new Map();
  // Montages de herse, dans l'ordre : le délai de la règle doit séparer deux
  // barrages, et le franchissement doit venir après la pose.
  const spikeDeployFrames = [];
  // Un choc frontal recule le pilote derrière la voiture qu'il vient de
  // heurter (`applyOncomingImpact` recale sa distance). Une berline qui le
  // suivait de près se retrouve alors à moins de `CITY_RUSH_CAR_GAP` : ce n'est
  // pas un passage à travers une voiture solide, c'est le pilote qui a reculé.
  // On retient la frame de chaque face-à-face pour l'épargner à la mesure.
  let oncomingShoveFrame = -Infinity;
  const audioCalls = {};
  const audioStub = {};
  for (const name of AUDIO_METHODS) {
    audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
  }
  const audioRef = { current: audioStub };
  // L'épave du pilote (barre de vie à zéro) : chaque effet `player-wrecked`
  // marque le début de la toupie, et la course se clôt sur `finish.destroyed`.
  let wreckEffects = 0;
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
      hud: (h) => {
        callbacks.huds.push(h);
        if (callbacks.awaitingGarage && !callbacks.awaitingGarage.nextHud) {
          callbacks.awaitingGarage.nextHud = h;
          callbacks.awaitingGarage = null;
        }
      },
      finish: (r) => { callbacks.finish = r; },
      pickup: (p) => { callbacks.pickups.push(p); },
      effect: (e) => {
        callbacks.effects.push(e);
        if (e.type === 'police-hit' && e.source === 'collision') {
          policeCollisionFrames.set(e.police, virtualFrame);
        }
        if (e.type === 'traffic-impact' && e.oncoming && e.isPlayer) {
          oncomingShoveFrame = virtualFrame;
        }
        if (e.type === 'police-spike-block' && e.stage === 'deploy') spikeDeployFrames.push(virtualFrame);
        if (e.type === 'mini-garage-used') {
          // Berlines aux trousses du pilote à l'instant du passage : c'est de
          // celles-là que le garage doit débarrasser la course.
          const chasersBefore = (callbacks.huds.at(-1)?.police || [])
            .filter((car) => car.targetId === 'player');
          const check = { effect: e, nextHud: null, chasersBefore: chasersBefore.length };
          callbacks.garageChecks.push(check);
          callbacks.awaitingGarage = check;
        }
        // Compté à la source : les contrôles d'arrivée lisent `wreckEffects`.
        if (e.type === 'player-wrecked') wreckEffects += 1;
      },
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

  // Rythme du parcours : le monde applique `pace` (voir `cityRushCoursePace`) à
  // la pointe du pilote comme à tout ce qui roule — le Ring est le seul
  // parcours ralenti, les villes et les routes gardent la pointe du garage. Un
  // `paced()` oublié dans la boucle se lit ici, pas à l'œil nu.
  const coursePace = cityRushCoursePace(city);
  const historicTopSpeed = CITY_RUSH_PLAYER_SPEED * car.powerMultiplier;
  if (Math.abs(world.topSpeed - historicTopSpeed * coursePace) > 1e-9) {
    fail('la pointe du monde ne suit pas le rythme du parcours', {
      parcours: city.id, rythme: coursePace, pointeMonde: world.topSpeed, attendue: historicTopSpeed * coursePace,
    });
  }
  if (coursePace < 1 && world.topSpeed >= historicTopSpeed) {
    fail(`un parcours à rythme ${coursePace} doit défiler plus lentement qu'au rythme historique`, {
      parcours: city.id, pointeMonde: world.topSpeed, pointeHistorique: historicTopSpeed,
    });
  }
  // Plafond du compteur : la pointe du parcours, multipliée par tous les bonus
  // de vitesse empilables (bonus turbo, ligne propre, contresens). Au-delà, une
  // vitesse du monde échappe au rythme du parcours.
  const hudSpeedCeiling = world.topSpeed * CITY_RUSH_TRACK_BOOST_SPEED_FACTOR
    * CITY_RUSH_CLEAN_LINE_MAX_BONUS * CITY_RUSH_ONCOMING_BONUS_MAX * 3.6 + 1;
  let maxHudSpeed = 0;

  const scene = world.scene || null;
  // Éclatement et réapparition des bonus : le pool d'effets vit dans la scène,
  // et chaque bonus ramassé doit éclater puis réapparaître 0,1 s (3 frames à
  // 30 Hz) plus tard sur sa rangée.
  const burstNodes = [];
  const pickupSlots = [];
  const miniGarageNodes = [];
  let slowZoneNodes = 0;
  // Occasions nettes de carambolage civil : mètres gagnés sur une voiture lente
  // de sa propre voie, à une allure qui ferme vraiment (voir la vérification du
  // trafic, à la fin de la course). C'est ce compteur qui distingue « le pilote
  // n'a jamais eu l'occasion » de « le pilote a laissé passer sa chance ».
  let civilClosingMeters = 0;
  let civilChanceFrames = 0;
  // Berlines de police du trafic : le pilote d'essai les vise pour provoquer le
  // scénario « on percute un agent » (voir la boucle de course). Les autres
  // voitures lentes sont gardées à part : sur un circuit sans contresens, le
  // pilote doit aussi éprouver le carambolage civil, et un pilote qui se
  // contente d'esquiver n'en provoquait plus aucun.
  const policeTrafficNodes = [];
  const civilTrafficNodes = [];
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
    if (object.name === 'city-rush-mini-garage') miniGarageNodes.push(object);
    if (String(object.name).startsWith('traffic-')) {
      if (CITY_RUSH_POLICE_TRAFFIC_TYPES.includes(object.name.slice('traffic-'.length))) {
        policeTrafficNodes.push(object);
      } else {
        civilTrafficNodes.push(object);
      }
    }
    if (object.userData?.type === 'slow-zone') slowZoneNodes += 1;
    if (object.userData?.kind === 'racer') racerCars.push(object);
    if (object.isMesh && /driver|face|helmet|torso|forearm/i.test(object.name || '')) visibleDriverMeshes.push(object.name);
    if (object.userData?.kind === 'city-rush-pickup') pickupSlots.push(object);
  });
  // Les voitures de course sont fermées (aucun personnage visible) et portent
  // leur modèle 3D dédié : c'est l'état voulu par les modèles modernisés.
  if (visibleDriverMeshes.length) fail('un personnage est encore visible dans une voiture', visibleDriverMeshes);
  if (racerCars.length < 3) fail('les trois voitures de course ne sont pas construites', racerCars.length);
  if (racerCars.some((car) => !car.userData.driverId)) fail('l’identité pilote manque aux métadonnées du HUD', racerCars.map((car) => car.userData.driverId));
  if (racerCars.some((car) => !car.userData.archetype)) fail('une voiture n’a pas de modèle 3D dédié', racerCars.map((car) => car.userData.profileId));
  // Les parcours qui ferment la porte (le tōgé du Mont Haruna) ne doivent
  // avoir **aucun** mini-garage : les autres gardent l'unique porte de mi-course.
  const garageExpected = cityRushMiniGarageAvailable({ sprint: false, course: city });
  if (garageExpected && miniGarageNodes.length !== CITY_RUSH_MINI_GARAGE_COUNT) {
    fail(`la carte ne contient pas exactement ${CITY_RUSH_MINI_GARAGE_COUNT} mini-garage(s)`, miniGarageNodes.length);
  }
  if (!garageExpected && miniGarageNodes.length) {
    fail('la carte devrait être sans mini-garage', miniGarageNodes.length);
  }
  const expectedGarageLanes = cityRushMiniGarageLanes(city);
  if (miniGarageNodes.some((garage) => garage.userData.kind !== 'mini-garage'
    || garage.userData.lane !== expectedGarageLanes[0]
    || JSON.stringify(garage.userData.lanes) !== JSON.stringify(expectedGarageLanes))) {
    fail('le mini-garage ne couvre pas les deux voies centrales', miniGarageNodes.map((garage) => garage.userData));
  }
  if (garageExpected) {
    const garageRoof = miniGarageNodes[0]?.getObjectByName('mini-garage-roof');
    const garageHealthPlus = miniGarageNodes[0]?.getObjectByName('mini-garage-health-plus');
    if (!garageRoof || garageRoof.geometry.parameters.width < CITY_RUSH_MINI_GARAGE_WIDTH
      || !garageHealthPlus || Math.abs(miniGarageNodes[0].position.x) > 1e-6) {
      fail('le mini-garage n’est pas élargi, centré et surmonté d’un plus rouge', {
        width: garageRoof?.geometry?.parameters?.width,
        centerX: miniGarageNodes[0]?.position.x,
        healthPlus: Boolean(garageHealthPlus),
      });
    }
    if (miniGarageNodes.some((garage, index) => garage.visible
      || garage.userData.trackDistance !== MINI_GARAGE_TRACK_DISTANCES[index])) {
      fail('le mini-garage doit être masqué et ancré à mi-course dès la construction', miniGarageNodes.map((garage) => garage.userData));
    }
  }
  // Une seule porte, à la moitié du parcours : celle du dernier tour n'existe
  // plus, aucun portique ne doit donc tomber sur le grand dernier tour.
  if (Math.abs(MINI_GARAGE_TRACK_DISTANCES[0] - cityRushRaceDistance(RACE_LAPS) / 2) > 1e-9) {
    fail('la porte de mi-course ne tombe pas à la moitié du parcours', MINI_GARAGE_TRACK_DISTANCES);
  }
  if (MINI_GARAGE_TRACK_DISTANCES.some((distance) => distance >= FINAL_LAP_START)) {
    fail('un mini-garage se dresse encore sur le dernier tour', MINI_GARAGE_TRACK_DISTANCES);
  }
  if (cityRushMiniGarageMidRaceDistance({ laps: RACE_LAPS }) !== MINI_GARAGE_TRACK_DISTANCES[0]) {
    fail('la porte de mi-course ne suit pas la moitié du parcours', MINI_GARAGE_TRACK_DISTANCES);
  }
  let miniGarageVisibleFrames = 0;
  // Images où la porte est en vue *avant* son repère : la seule fenêtre où le
  // pilote peut encore la prendre à mi-course.
  let miniGarageApproachFrames = 0;
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
  // Image du plus gros budget de scène : détail des branches en cause.
  let visibleBudgetSample = null;
  let burstFrames = 0;
  // Rangées de bonus devant le pilote : la route ne doit jamais en manquer.
  let rowAheadFrames = 0;
  let rowStarvedFrames = 0;
  let rowFrontGapMin = Infinity;
  let rowFrontGapMax = 0;
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
  if (callbacks.huds[0]?.wantedLevel !== 0) {
    fail('une course normale ne démarre pas à zéro étoile', callbacks.huds[0]);
  }
  if (garageExpected && callbacks.huds[0]?.miniGaragesRemaining !== CITY_RUSH_MINI_GARAGE_COUNT) {
    fail('le HUD ne réserve pas l’unique mini-garage de la course', callbacks.huds[0]);
  }
  if (callbacks.huds[0]?.miniGaragesActive || miniGarageNodes.some((garage) => garage.visible)) {
    fail('les mini-garages ou leur compteur apparaissent avant la course');
  }
  if (slowZoneNodes) fail('une zone d’huile ou de ralentissement est encore rendue', slowZoneNodes);
  // Le turbo vert est un cercle peint sur la chaussée : rien ne flotte au-dessus
  // du bitume, le disque est posé à plat sur sa voie et son anneau respire.
  const boostSlots = pickupSlots.filter((slot) => slot.userData.type === CITY_RUSH_PICKUPS.BOOST);
  if (!boostSlots.length) fail('aucun cercle turbo vert n’est placé sur la piste');
  if (boostSlots.some((slot) => !slot.userData.pad?.visible || slot.userData.icon?.visible || slot.position.y > 0.5)) {
    fail('le bonus turbo vert doit être posé au sol, sans icône flottante', boostSlots.map((slot) => ({
      y: slot.position.y,
      icon: slot.userData.icon?.visible,
      pad: slot.userData.pad?.visible,
      type: slot.userData.type,
    })));
  }
  const floatingSlots = pickupSlots.filter((slot) => slot.userData.icon?.visible);
  if (floatingSlots.some((slot) => slot.userData.type === CITY_RUSH_PICKUPS.BOOST)) {
    fail('un bonus turbo vert flotte encore au-dessus de la chaussée', floatingSlots.map((slot) => slot.userData.type));
  }
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
  if (callbacks.huds.at(-1)?.wantedLevel !== 0) {
    fail('reset() ne remet pas les étoiles à zéro pour la course suivante', callbacks.huds.at(-1));
  }
  if ((garageExpected && callbacks.huds.at(-1)?.miniGaragesRemaining !== CITY_RUSH_MINI_GARAGE_COUNT)
    || callbacks.huds.at(-1)?.miniGaragesActive
    || miniGarageNodes.some((garage) => garage.userData.used || garage.visible)) {
    fail('reset() ne réarme pas le mini-garage pour la course suivante', {
      hud: callbacks.huds.at(-1), garages: miniGarageNodes.map((garage) => garage.userData),
    });
  }
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
  // 12 minutes virtuelles, large : la course standard de 8 400 m garde une
  // marge (les essais sur la boucle doublée tournent autour de 6 à 7 minutes).
  const maxFrames = 30 * 720;
  let steer = 'left';
  let slowFrames = 0;
  // Escouade de police : première image où elle apparaît dans le HUD, temps
  // passé en piste et temps passé devant notre joueur.
  let firstPoliceHud = null;
  let policeHudFrames = 0;
  let policeAheadFrames = 0;
  let policeClosestGap = Infinity;
  let policeBeacons = 0;
  // L'escouade doit rester dans la course : images où au moins une berline
  // poursuit le joueur de près, et pire retard de la voiture la mieux placée.
  let policeEngagedFrames = 0;
  let policeMaxLag = 0;
  // Dernier point connu de chaque berline de l'escouade : vitesse du pire
  // décrochage (voir `policeWorstLag`).
  const policeSpeedWatch = new Map();
  let policeWorstLag = null;
  // Images où l'escouade du dernier tour est réellement en piste : le partage
  // d'engagement se juge sur elle, pas sur la police du trafic rappelée.
  let policeSquadFrames = 0;
  let policeStunFrames = 0;
  // Quelques images où l'escouade lâche le joueur, pour diagnostiquer l'échec.
  const policeLooseSamples = [];
  // Barrage : frames où une berline freine devant sa cible, et pire écart
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
  // Une berline qui se retrouve dans le pare-chocs **arrière** d'un pilote ne
  // prouve pas une traversée : le recul mécanique d'un choc frontal l'y dépose,
  // et la berline ne recule pas d'elle-même. Un collage qui dure, en revanche,
  // est un vrai défaut : on le compte, par couple, image par image.
  const rearOverlapStreaks = new Map();
  let rearOverlapWorst = null;
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
  // L'appareil doit revenir **une fois la voûte franchie** : s'il reste caché
  // jusqu'à l'arrivée, c'est que le pilote termine sous la voûte, et le
  // manquement n'en est pas un. On compte donc les images de ciel dégagé
  // passées sous la voûte : au-delà d'une seconde à découvert sans rentrée, la
  // règle est bien violée.
  let watchHeliHiddenInFinalLap = false;
  let watchHeliOpenSkyFrames = 0;
  // Fenêtre utile du dernier tour : les images où le pilote roule à découvert.
  // Sous la Shuto, l'appareil s'efface légitimement sous les voûtes — les
  // seuils absolus (60 images de vol, 64 de cadrage) n'ont alors plus de sens,
  // et c'est la part des images à découvert qui juge le suivi.
  let openSkyFinalLapFrames = 0;
  let openSkyHiddenFinalLapFrames = 0;
  let finalLapFrames = 0;
  let watchHeliWasVisible = false;
  let watchHeliVisibleAge = 0;
  let watchHeliMeasuredFrames = 0;
  // La bande de ciel visible : sous les cartes du HUD (0,72 en coordonnée
  // écran) et au-dessus de la route (0,30), à l'intérieur du cadre en largeur.
  const WATCH_HELI_BAND_Y_MIN = 0.3;
  const WATCH_HELI_BAND_Y_MAX = 0.72;
  const WATCH_HELI_BAND_X_MAX = 0.85;
  // Barre de vie du pilote : les quinze cellules sont actives au départ ;
  // contrôle de chaque dégât annoncé et de ses bornes HUD.
  let healthHitEffects = 0;
  let healthHitsBySource = {};
  // Épave : barre à zéro. La voiture part en toupie dans sa fumée et la course
  // est perdue. On mesure la rotation cumulée, la fumée et la chute de vitesse.
  let wreckSpinTurns = 0;
  let wreckSpinLast = 0;
  let wreckSmokeFrames = 0;
  let wreckMaxSpeed = null;
  let wreckLastSpeed = null;
  let wreckFrames = 0;
  let healthCubes = 0;
  const finishNotes = [];
  let healthBadDamage = 0;

  // Distance **exacte** atteinte par le pilote : le HUD arrondit la sienne au
  // mètre (`hud.distance`), et une course qui s'arrête à 5 999,8 m y lit
  // « 6 000 m ». Le monde, lui, ouvre le dernier tour sur la distance exacte :
  // le harnais juge le rendez-vous de l'escouade sur la même mesure, sinon il
  // réclame une escouade qu'une course arrêtée juste sous la ligne n'a jamais
  // appelée.
  let playerExactReach = 0;
  while (!callbacks.finish && frames < maxFrames) {
    playerExactReach = Math.max(playerExactReach, world.distance || 0);
    const hud = callbacks.huds[callbacks.huds.length - 1];
    // Les voies du contresens dépendent du pays (à gauche en Amérique et en
    // France, à droite à Londres et sur la Shuto) : le pilote automatique suit
    // la configuration du parcours, jamais un numéro de voie codé en dur.
    const oncomingSteer = courseLanes.driveSide === 'left' ? 'right' : 'left';
    const raceSteer = courseLanes.driveSide === 'left' ? 'left' : 'right';
    const playerInOncoming = hud ? courseLanes.oncomingLanes.includes(hud.playerLane) : false;
    if (frames === 0 || frames === 1) world.action(oncomingSteer); // provoque un face-à-face contrôlé dans la voie inverse
    // Pilote naïf : si on traîne derrière le trafic, on tente de changer de voie ;
    // on déclenche chaque pouvoir dès qu'il est chargé. Tant qu'aucun contact
    // n'a eu lieu, il vise délibérément une berline de police du trafic : c'est
    // le seul moyen d'éprouver la riposte policière de façon déterministe.
    const rallyContactSeen = callbacks.effects.some((effect) => effect.type === 'police-rally');
    const oncomingSeen = callbacks.effects.some((effect) => effect.type === 'traffic-impact' && effect.oncoming);
    // On cherche le face-à-face tant qu'il n'a pas eu lieu : un tremplin pris en
    // route peut désormais immobiliser le volant quelques secondes, la fenêtre
    // n'est donc plus bornée aux premières images. Un parcours **sans
    // contresens** — le Ring se joue en sens unique — n'a rien à chercher : la
    // règle tirait alors vers la voie inverse toutes les quatre images, à
    // contresens du rabattement vers le portique de mi-course qu'elle
    // empêchait d'atteindre.
    const huntsOncoming = courseLanes.oncomingLanes.length > 0;
    if (huntsOncoming && !oncomingSeen && !playerInOncoming && frames % 4 === 0) {
      world.action(oncomingSteer);
    } else if (oncomingSeen && playerInOncoming && frames % 4 === 0) {
      world.action(raceSteer);
    }
    let rallyTarget = null;
    let rallyGap = Infinity;
    if (!rallyContactSeen && frames > 30) {
      for (const node of policeTrafficNodes) {
        if (!node.visible) continue;
        // La distance de piste est publiée par le monde : la hauteur à
        // l'écran, elle, dépend du groupe auquel la voiture appartient.
        const gap = trafficNodeGap(node, world.distance);
        if (!(gap > 0) || gap > 60) continue;
        if (gap < rallyGap) { rallyGap = gap; rallyTarget = node; }
      }
    }
    // Même logique pour le carambolage civil, mais seulement là où rien ne
    // vient d'en face : ailleurs, le face-à-face obligatoire l'éprouve déjà, et
    // viser une voiture lente y ferait courir le pilote après un contresens.
    const civilContactSeen = callbacks.effects.some((effect) => effect.type === 'traffic-impact' && !effect.oncoming);
    let civilTarget = null;
    let civilTargetGap = Infinity;
    if (!civilContactSeen && !rallyTarget && courseLanes.oncomingLanes.length === 0 && frames > 30 && hud) {
      for (const node of civilTrafficNodes) {
        if (!node.visible) continue;
        const gap = trafficNodeGap(node, world.distance);
        // Une cible de carambolage : devant, proche, et dans la voie du pilote
        // (c'est la voie qu'il tient déjà — inutile de se rabattre pour aller
        // percuter une voiture qu'on ne croise pas).
        if (!(gap > CITY_RUSH_TRAFFIC_CAR_GAP) || gap > 45) continue;
        if (trafficNodeLane(node, courseLanes) !== hud.playerLane) continue;
        if (gap < civilTargetGap) { civilTargetGap = gap; civilTarget = node; }
      }
    }
    if (hud) maxHudSpeed = Math.max(maxHudSpeed, hud.speed);
    // Le seuil de « on traîne » suit le rythme du parcours : sur le Ring, la
    // même voiture roule plus lentement sans être en difficulté.
    if (hud && hud.speed < 70 * coursePace) slowFrames += 1; else slowFrames = 0;
    if (slowFrames > 12 && !rallyTarget && !civilTarget && frames > 110) {
      world.action(steer);
      steer = steer === 'left' ? 'right' : 'left';
      slowFrames = 0;
    }
    if (rallyTarget && hud && frames % 4 === 0) {
      // Les voies du parcours, pas les six voies historiques : sur la piste
      // resserrée du Ring, une abscisse de voie urbaine désignerait la voie
      // opposée et le pilote automatique se rabattrait du mauvais côté.
      const targetLane = trafficNodeLane(rallyTarget, courseLanes);
      if (targetLane !== hud.playerLane) world.action(targetLane < hud.playerLane ? 'left' : 'right');
    }
    // La mire d'une berline dans le dos est annoncée environ une seconde avant
    // la rafale : le pilote automatique se décale pour la casser, comme la page
    // l'enseigne au joueur. Sans cette esquive, la coque se vide avant le
    // dernier tour et les vérifications du scénario (escouade, barrage, hélico)
    // n'auraient plus d'objet. L'esquive n'entre en jeu qu'une fois la riposte
    // policière éprouvée : la phase de contact délibéré reste, elle, naïve.
    // Le carambolage civil prime quand la voiture lente est juste devant : un
    // pilote qui se dérobe à chaque mire ne percute jamais le trafic, et la
    // vérification du parcours sans contresens n'a plus rien à mesurer. La
    // fenêtre est courte (30 m) : le reste de la course, l'esquive des mires
    // reste la règle, comme la page l'enseigne au joueur.
    const civilRamGap = civilTarget ? trafficNodeGap(civilTarget, world.distance) : Infinity;
    const rammingNow = civilRamGap > 0 && civilRamGap < 30;
    const aimedCar = rallyContactSeen && !rammingNow && hud
      ? (hud.police || []).find((car) => car.aimTargetId === 'player' && (Number(car.aim) || 0) > 0.3)
      : null;
    if (aimedCar && frames % 4 === 0) {
      let aimedLane = hud.playerLane;
      let aimedDelta = Infinity;
      for (let index = 0; index < courseLanes.laneCount; index += 1) {
        const delta = Math.abs(courseLanes.laneX(index) - aimedCar.x);
        if (delta < aimedDelta) { aimedDelta = delta; aimedLane = index; }
      }
      if (aimedLane === hud.playerLane) {
        const away = hud.playerLane <= 0
          ? 'right'
          : hud.playerLane >= courseLanes.laneCount - 1
            ? 'left'
            : (hud.playerLane % 2 === 0 ? 'right' : 'left');
        world.action(away);
      }
    }
    // Mini-garage : le pilote automatique se rabat vers l'une des deux voies
    // centrales dès qu'un portique approche, comme le ferait un joueur prévenu.
    // C'est le seul moyen d'éprouver la traversée de façon déterministe.
    const garageTarget = !aimedCar && miniGarageNodes.find((garage) => (
      !garage.userData.used
      && garage.visible
      && garage.userData.trackDistance - world.distance < 130
    ));
    if (garageTarget && hud && frames % 2 === 0) {
      const garageLanes = garageTarget.userData.lanes || [garageTarget.userData.lane];
      const targetLane = garageLanes.reduce((closest, lane) => (
        Math.abs(lane - hud.playerLane) < Math.abs(closest - hud.playerLane) ? lane : closest
      ), garageLanes[0]);
      if (hud.playerLane !== targetLane) world.action(hud.playerLane < targetLane ? 'right' : 'left');
    }
    if (civilTarget && hud && !aimedCar && frames % 4 === 0) {
      const targetLane = trafficNodeLane(civilTarget, courseLanes);
      if (targetLane !== hud.playerLane) world.action(targetLane < hud.playerLane ? 'left' : 'right');
    }
    // Hélico d'observation : visible seulement au dernier tour, et il tourne.
    // Le HUD est étranglé (une émission toutes les 100 ms) : on juge la
    // visibilité sur la distance du monde, exacte à l'image.
    if (world.distance >= FINAL_LAP_START) {
      finalLapFrames += 1;
      const underCover = hud && hud.route?.cover?.covered === true;
      if (!underCover) {
        openSkyFinalLapFrames += 1;
        // Le temps que l'appareil se rapproche (1,5 s), son absence n'est pas
        // un manquement : on ne compte qu'ensuite.
        if (!watchHeli.visible && finalLapFrames > 45) openSkyHiddenFinalLapFrames += 1;
      }
    }
    if (watchHeliFinalLapFrames > 0 && watchHeli.visible && !watchHeliWasVisible) {
      watchHeliReturns += 1;
      watchHeliOpenSkyFrames = 0;
    }
    if (watchHeliFinalLapFrames > 0 && !watchHeli.visible && watchHeliWasVisible) {
      watchHeliHiddenInFinalLap = true;
      watchHeliOpenSkyFrames = 0;
    }
    // Sous la voûte, plus de ciel : l'attente ne court que si le pilote roule à
    // découvert (le HUD publie la couverture du secteur).
    if (watchHeliHiddenInFinalLap && !watchHeli.visible && world.distance >= FINAL_LAP_START
      && hud && hud.route?.cover?.covered !== true) {
      watchHeliOpenSkyFrames += 1;
    }
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
      // Le pilote automatique vide l'arme en main — AK-47 rouge ou fusil à
      // pompe bleu —, jamais les deux à la fois : c'est le même bouton.
      const weapon = cityRushActiveWeapon(hud.inventory);
      if (weapon) world.action(weapon.type);
    }
    const civilStatsBefore = { distance: world.distance, byNode: new Map() };
    for (const node of civilTrafficNodes) {
      if (node.visible) civilStatsBefore.byNode.set(node, trafficNodeGap(node, world.distance));
    }
    runFrames(1, `course f${frames}`);
    // Occasion nette : une voiture lente visible, dans la voie du pilote, à
    // moins de 60 m devant — et un pilote qui la rattrape vraiment. On cumule
    // les mètres gagnés : au-delà du seuil, un carambolage manqué n'est plus la
    // faute à pas de chance.
    if (hud) {
      const pilotTravel = world.distance - civilStatsBefore.distance;
      for (const [node, beforeGap] of civilStatsBefore.byNode) {
        if (beforeGap === undefined || Number(node.userData.lane) !== hud.playerLane) continue;
        const gap = trafficNodeGap(node, world.distance);
        if (!(gap > CITY_RUSH_TRAFFIC_CAR_GAP && gap < 60)) continue;
        const trafficTravel = beforeGap - gap;
        const closing = pilotTravel - trafficTravel;
        if (closing <= 0) continue;
        civilClosingMeters += closing;
        civilChanceFrames += 1;
      }
    }
    const visibleGarages = miniGarageNodes.filter((garage) => garage.visible);
    // La course ne compte qu'une seule porte : jamais deux en scène, et jamais
    // une porte déjà servie.
    if (visibleGarages.length > 1) {
      fail('plus d’un mini-garage est en scène', { distance: world.distance, garages: visibleGarages.map((garage) => garage.userData) });
    }
    if (visibleGarages.some((garage) => garage.userData.used)) fail('un garage consommé reste visible');
    if (visibleGarages.length) {
      miniGarageVisibleFrames += 1;
      if (world.distance <= MINI_GARAGE_TRACK_DISTANCES[0]) miniGarageApproachFrames += 1;
    }
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
    // Les rangées de bonus doivent rester devant le pilote du début à la fin :
    // leur recyclage s'ancre sur sa distance (voir `rowRecycleAnchor` dans le
    // monde) et non sur la voiture la plus lente du peloton, qui laissait la
    // route se vider de ses bonus devant un pilote détaché en tête — l'écart au
    // traînard finit par dépasser la fenêtre des douze rangées (~340 m), ce qui
    // arrive surtout au dernier tour.
    {
      const gaps = pickupSlots
        .map((slot) => (3.1 - (slot.parent?.position.z ?? 3.1)) / CITY_RUSH_SCROLL_SCALE)
        .filter((gap) => Number.isFinite(gap));
      const frontGap = gaps.length ? Math.max(...gaps) : null;
      if (frontGap !== null) {
        if (frontGap <= 2) rowStarvedFrames += 1;
        else rowAheadFrames += 1;
        rowFrontGapMin = Math.min(rowFrontGapMin, frontGap);
        rowFrontGapMax = Math.max(rowFrontGapMax, frontGap);
      }
    }
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
          // Une apparition après un délai plus long peut aussi être un rouge
          // remasqué tant que le joueur a déjà sa charge : ce n'est pas le
          // minuteur de respawn, donc on ne la compte pas comme telle.
          if (delayFrames >= 3 && delayFrames % 3 === 0) respawnedPickups += 1;
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
      // par un contact (`rallied`), un renfort différé ou une représaille :
      // le suivi d'engagement ne juge que les unités initiales.
      const squadCars = hud.police.filter((car) => car.squad && !car.rallied);
      // L'escouade scénarisée est un rendez-vous du dernier tour : c'est là que
      // son sillage se juge. Une unité déployée plus tôt par les étoiles peut
      // être loin derrière le pilote sans décrocher — elle revient sur lui.
      const finalLap = hud.lap === hud.laps;
      // Une poursuite par étoiles peut présenter une unité avant le dernier
      // tour ; le point de référence reste l'arrivée complète de l'escouade
      // scénarisée, nécessaire pour vérifier son quota de trois voitures.
      if (!firstPoliceHud && squadCars.length === CITY_RUSH_POLICE_COUNT) firstPoliceHud = hud;
      policeHudFrames += 1;
      // Une berline sonnée par un tir du joueur est hors course quelques
      // secondes : la juger « décrochée » fausserait la mesure du harnais.
      if (finalLap && squadCars.length && squadCars.some((car) => !(car.stunLeft > 0))) policeSquadFrames += 1;
      // Une berline sonnée par un tir du joueur est hors course quelques
      // secondes : elle ne compte ni dans l'engagement ni dans le décrochage,
      // comme pour la part de temps en piste juste au-dessus. Sans cela, une
      // berline en toupie à 200 m faisait échouer la mesure du sillage.
      const racingCars = squadCars.filter((car) => !(car.stunLeft > 0));
      if (finalLap && squadCars.length && squadCars.every((car) => car.stunLeft > 0)) policeStunFrames += 1;
      const hudLeader = Math.max(hud.distance || 0, ...(hud.racers || []).map((racer) => racer.distance || 0));
      const assignedTargetDistance = (car) => car.targetId === 'player' ? (hud.distance || 0) : hudLeader;
      for (const car of hud.police) {
        const gap = (car.distance || 0) - (hud.distance || 0);
        if (gap > 0 && gap < 80) policeAheadFrames += 1;
        policeClosestGap = Math.min(policeClosestGap, Math.abs((car.distance || 0) - assignedTargetDistance(car)));
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
          const previousRacerDistance = lastRacerDistances.get(racer.id);
          if (Number.isFinite(previousRacerDistance) && racerDistance < previousRacerDistance - 0.05) {
            shoveFrames.set(racer.id, virtualFrame);
          }
          lastRacerDistances.set(racer.id, racerDistance);
          const inShoveBack = virtualFrame - (shoveFrames.get(racer.id) ?? -Infinity) <= 8;
          // La police du trafic rappelée percute volontairement le pilote
          // qu'elle chasse : ce rattrapage est toléré. Un carambolage provoqué
          // en accélérant est aussi un contact légitime : la police perd un
          // point et le joueur aucun ; on exclut la durée du cooldown (plus une
          // émission HUD) plutôt que de le confondre avec un traversé sans choc.
          // Un saut par-dessus (tremplin) survole la berline en l'air.
          const contactCatchUp = car.rallied && (carDistance - racerDistance) < CITY_RUSH_CAR_GAP;
          const lastCollisionFrame = policeCollisionFrames.get(car.name);
          const collisionGraceFrames = Math.ceil(CITY_RUSH_POLICE_COLLISION_COOLDOWN / (FRAME_MS / 1000)) + 4;
          const inCollisionWindow = racer.isPlayer
            && Number.isFinite(lastCollisionFrame)
            && virtualFrame - lastCollisionFrame <= collisionGraceFrames;
          // Même répit après un face-à-face : le recul du pilote est mécanique.
          const inShoveWindow = racer.isPlayer && virtualFrame - oncomingShoveFrame <= collisionGraceFrames;
          const isJumpingOver = Boolean(
            (racer.isPlayer && (world.isJumping || world.jumpHeight > 0.8)) ||
            racer.isJumping ||
            hud.isJumping ||
            (racer.jumpHeight && racer.jumpHeight > 0.8)
          );
          const rawOverlap = Math.abs(carDistance - racerDistance);
          const carAhead = carDistance >= racerDistance;
          const rearKey = `${car.id}|${racer.id}`;
          // Marge d'un cheveu : tenir exactement la distance de sécurité n'est pas
          // un collage — le résolveur pose la berline pile à `CITY_RUSH_CAR_GAP`.
          if (!carAhead && rawOverlap < CITY_RUSH_CAR_GAP - 0.05) {
            const streak = (rearOverlapStreaks.get(rearKey) || 0) + 1;
            rearOverlapStreaks.set(rearKey, streak);
            if (!rearOverlapWorst || streak > rearOverlapWorst.streak) {
              rearOverlapWorst = {
                frame: frames, city: city.id, car: car.id, racer: racer.id, mode: car.mode,
                streak, gap: Number(rawOverlap.toFixed(2)), carDist: carDistance, racerDist: racerDistance,
                shoved: shoveFrames.has(racer.id), shoveAgo: shoveFrames.has(racer.id) ? frames - shoveFrames.get(racer.id) : null,
                racerSpeed: Number(racer.speed) || 0, carSpeed: Number(car.speed) || 0, carLane: car.lane, racerLane: racer.lane,
              };
            }
          } else {
            rearOverlapStreaks.set(rearKey, 0);
          }
          const blockersNow = racer.isPlayer ? (
            hud.police || []
          ).filter((other) => other.id !== car.id && other.targetId === 'player')
            .filter((other) => Math.abs(Number(other.rawDistance) - racerDistance) < CITY_RUSH_CAR_GAP
              && Math.abs(Number(other.x) - racerX) < 1.9)
            .map((other) => `${other.id}@${Number(other.rawDistance).toFixed(1)}/${other.mode || '?'}`).join(' ') : '';
          // Seule une berline **devant** peut être traversée par un pilote qui
          // avance : une berline restée derrière lui est retenue par son propre
          // résolveur et ne doublera jamais le pilote par l'intérieur. Le cas
          // arrière est mesuré à part (`rearOverlapStreaks`) : toléré le temps
          // d'un recul mécanique, refusé s'il s'installe.
          const overlapNow = !carAhead || contactCatchUp || inCollisionWindow || inShoveWindow || inShoveBack || isJumpingOver
            ? Infinity
            : Math.abs(carDistance - racerDistance);
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
              blockedBy: blockersNow,
              lastHitAge: Number.isFinite(policeCollisionFrames.get(car.name)) ? frames - policeCollisionFrames.get(car.name) : null,
              gapFrames: Math.ceil(CITY_RUSH_POLICE_COLLISION_COOLDOWN / (FRAME_MS / 1000)) + 4,
            };
          }
        }
      }
      const squadGap = finalLap && racingCars.length
        ? Math.min(...racingCars.map((car) => Math.abs((car.distance || 0) - assignedTargetDistance(car))))
        : Infinity;
      if (squadGap <= POLICE_ENGAGE_RANGE) policeEngagedFrames += 1;
      else if (racingCars.length && policeLooseSamples.length < 8) {
        policeLooseSamples.push({
          frame: frames,
          gap: Math.round(squadGap),
          leader: Math.round(hudLeader),
          player: Math.round(hud.distance || 0),
          squad: squadCars.map((car) => `${car.id}->${car.targetId || 'leader'}@${car.distance}/${car.mode || '?'}${car.stunLeft > 0 ? '/SONNÉE' : car.slowLeft > 0 ? '/ralentie' : ''}`).join(' '),
        });
      }
      const lag = finalLap && racingCars.length
        ? Math.max(0, Math.min(...racingCars.map((car) => assignedTargetDistance(car) - (car.distance || 0))))
        : 0;
      if (lag > policeMaxLag) {
        policeMaxLag = lag;
        // Le pire décrochage est décrit, berline par berline : voie, allure et
        // malus en cours. Sans cela, un échec « décroche de 208 m » ne dit pas
        // si la berline était engluée (voie bouchée), sonnée, ou simplement
        // distancée par une fusée — les trois ne se corrigent pas pareil.
        policeWorstLag = {
          frame: frames,
          city: city.id,
          hudLeader,
          player: hud.distance,
          police: racingCars.map((car) => `${car.id}->${car.targetId || 'leader'}@${car.distance}${car.mode ? '/' + car.mode : ''}`).join(' '),
          cars: racingCars.map((car) => {
            const seen = policeSpeedWatch.get(car.id);
            const distance = Number.isFinite(Number(car.rawDistance)) ? Number(car.rawDistance) : Number(car.distance);
            const speed = seen && frames > seen.frame
              ? (distance - seen.distance) / ((frames - seen.frame) * FRAME_MS / 1000)
              : null;
            policeSpeedWatch.set(car.id, { frame: frames, distance });
            return {
              id: car.id,
              mode: car.mode,
              lane: car.lane,
              targetGap: Math.round(assignedTargetDistance(car) - (car.distance || 0)),
              speed: speed === null ? null : Math.round(speed * 10) / 10,
              blocking: Boolean(car.blocking),
              armed: Boolean(car.armed?.[CITY_RUSH_POWERS.PISTOL]),
              slow: Math.round((Number(car.slowLeft) || 0) * 10) / 10,
              stun: Math.round((Number(car.stunLeft) || 0) * 10) / 10,
            };
          }),
        };
      } else {
        // La vitesse du pire décrochage se mesure en continu : on garde le
        // dernier point connu de chaque berline, même hors décrochage.
        for (const car of racingCars) {
          const distance = Number.isFinite(Number(car.rawDistance)) ? Number(car.rawDistance) : Number(car.distance);
          policeSpeedWatch.set(car.id, { frame: frames, distance });
        }
      }
    }
    if (scene && frames % 30 === 0) {
      const stats = countVisible(scene);
      if (stats.meshes > maxVisible) {
        // Le pic est décrit par branche : un dépassement du budget doit dire
        // quelle famille de maillages a gonflé (trafic, escouade, décor…).
        maxVisible = stats.meshes;
        maxTriangles = stats.triangles;
        visibleBudgetSample = {
          frame: frames,
          meshes: stats.meshes,
          groups: countVisible(scene, { detail: true }).groups.map(([name, count]) => `${name}:${count}`),
        };
      } else {
        maxTriangles = Math.max(maxTriangles, stats.triangles);
      }
    }
  }
  const raceSeconds = (frames * FRAME_MS) / 1000;
  if (!callbacks.finish) fail(`arrivée jamais atteinte après ${raceSeconds.toFixed(0)} s virtuelles`, callbacks.huds.at(-1));
  if (maxHudSpeed > hudSpeedCeiling) {
    fail(`le compteur dépasse le plafond du parcours (${Math.round(hudSpeedCeiling)} km/h)`, {
      parcours: city.id, rythme: coursePace, maxHudSpeed, plafond: hudSpeedCeiling,
    });
  }
  if (callbacks.huds.length <= hudBefore) fail('aucun HUD émis pendant la course');
  if (typeof console !== 'undefined' && process.env.CITY_RUSH_SMOKE_VERBOSE) console.log('épave mesurée :', { wreckFrames, wreckSpinTurns, wreckSmokeFrames, wreckLastSpeed });
  if (callbacks.errors.length) fail('erreurs remontées', callbacks.errors);

  const finish = callbacks.finish;
  // Un circuit permanent (Nordschleife) roule en sens unique : aucun véhicule
  // ne peut être heurté de face. On exige donc le choc frontal là où il y a du
  // trafic en face, et son absence — pas seulement sa rareté — là où il n'y en a
  // pas : une voiture à contresens sur un circuit serait un vrai bogue.
  const oncomingLanes = cityRushLaneConfig(city).oncomingLanes.length;
  const turnaroundEffects = callbacks.effects.filter((effect) => (
    effect.type === 'police-oncoming-turnaround' || effect.type === 'police-turnaround-complete'
  ));
  if (turnaroundEffects.some((effect) => effect.duration !== CITY_RUSH_POLICE_TURNAROUND_DURATION)) {
    fail('le demi-tour d’une patrouille ne dure pas 1,5 seconde', turnaroundEffects);
  }
  // Le véhicule heurté de face dérape vers le bord extérieur de son sens de
  // circulation : à gauche quand on roule à droite, à droite à Londres et sur
  // la Shuto de Tokyo (voir `cityRushOncomingImpactX`).
  const expectedPushSide = courseLanes.driveSide === 'left' ? 'right' : 'left';
  const oncomingImpacts = callbacks.effects.filter((effect) => (
    effect.type === 'traffic-impact'
    && effect.oncoming
    && (effect.policeContact || (effect.pushedAside && effect.pushDirection === expectedPushSide))
  ));
  const trafficImpacts = callbacks.effects.filter((effect) => effect.type === 'traffic-impact');
  if (oncomingLanes > 0 && !oncomingImpacts.length) {
    fail('aucune collision frontale n’a dévié le trafic civil ou déclenché le demi-tour de la police', trafficImpacts);
  }
  if (oncomingLanes === 0) {
    const headOn = trafficImpacts.filter((effect) => effect.oncoming);
    if (headOn.length) fail('un parcours sans trafic en face a subi une collision frontale', headOn);
    // Sur un parcours sans contresens, aucun face-à-face ne vient éprouver le
    // trafic lent de lui-même : le pilote d'essai doit donc le percuter. Il le
    // cherche (voir `civilTarget`), mais la police du dernier tour peut
    // légitimement l'en empêcher — herse, tir bleu et carambolages composent des
    // ralentissements qui le laissent moins vite que la voiture qu'il visait.
    // On ne pardonne donc le carambolage manqué que si le pilote n'a jamais eu
    // une vraie occasion : assez de mètres gagnés sur une voiture lente de sa
    // voie pour la rattraper. Au-delà, c'est un vrai échec.
    const civilRamMeters = Math.round(civilClosingMeters);
    if (!trafficImpacts.length && civilClosingMeters >= CIVIL_RAM_MIN_CLOSING) {
      fail(`aucun contact avec le trafic sur un parcours qui en compte (${civilRamMeters} m gagnés sur une voiture lente)`, trafficImpacts);
    }
    if (!trafficImpacts.length && civilChanceFrames < CIVIL_RAM_MIN_FRAMES) {
      console.log(`[${city.id}] trafic civil jamais percuté : ${civilRamMeters} m gagnés sur ${civilChanceFrames} image(s) — occasions insuffisantes, vérification de contact tolérée`);
    }
  }
  if (finish.laps !== RACE_LAPS) fail('finish.laps ≠ nombre de tours de la course', finish);
  if (!Array.isArray(finish.racers) || finish.racers.length !== 3) fail('chaque course doit finir avec exactement trois pilotes', finish.racers);
  if (!Array.isArray(callbacks.huds.at(-1)?.racers) || callbacks.huds.at(-1).racers.length !== 3) {
    fail('le HUD ne contient pas exactement trois pilotes', callbacks.huds.at(-1));
  }
  const lastHud = callbacks.huds.at(-1);
  for (const field of ['lap', 'laps', 'lapProgress', 'lapDistance', 'lapLength', 'distance', 'speed', 'rank', 'racers', 'wantedLevel', 'miniGaragesRemaining', 'oncomingBonus']) {
    if (!(field in lastHud)) fail(`champ HUD manquant : ${field}`, Object.keys(lastHud));
  }
  // Bonus de contresens : dès que le parcours a du trafic en face et que le
  // pilote automatique y a roulé, la jauge a dû se charger (facteur > 1), et
  // son facteur HUD doit rester dans les bornes de la règle. Un parcours sans
  // contresens ne doit jamais la charger.
  const bonusHuds = callbacks.huds.filter((entry) => Number(entry.oncomingBonus) > 1 + 1e-9);
  if (oncomingLanes > 0 && !bonusHuds.length) {
    fail('la jauge de bonus de contresens n’a jamais bougé alors que le pilote a roulé dans les voies inverses', lastHud);
  }
  if (oncomingLanes === 0 && bonusHuds.length) {
    fail('un parcours sans trafic en face a chargé le bonus de contresens', bonusHuds[0]);
  }
  const badBonus = callbacks.huds.find((entry) => !(Number(entry.oncomingBonus) >= 1 && Number(entry.oncomingBonus) <= CITY_RUSH_ONCOMING_BONUS_MAX + 1e-9));
  if (badBonus) fail('facteur de bonus de contresens hors bornes', badBonus);
  // Au dernier tour, la « longueur du tour » du HUD est celle du grand tour.
  const expectedLapLength = lastHud.lap >= RACE_LAPS ? CITY_RUSH_FINAL_LAP_LENGTH : CITY_RUSH_LAP_LENGTH;
  if (lastHud.laps !== RACE_LAPS || lastHud.lapLength !== expectedLapLength) fail('HUD laps/lapLength incohérents', lastHud);
  if (lastHud.totalDistance !== RACE_DISTANCE) fail('HUD totalDistance ≠ distance de la course', lastHud);
  const wantedEffects = callbacks.effects.filter((effect) => effect.type === 'wanted-level');
  if (!wantedEffects.some((effect) => effect.stars >= 3)) {
    fail('un contact avec la police ne fait pas monter la recherche à trois étoiles', wantedEffects);
  }

  // ── La herse des quatre étoiles ──────────────────────────────────────────
  // Deux voitures de police se rangent en travers du sens de course et déroulent
  // le tapis voie par voie : prise de position → pose → herse en place →
  // rangement. Le pilote d'essai ne se dérobe pas et la traverse, mais le
  // carré et la crevaison sont neutralisés par le lanceur — le barème est
  // vérifié par les tests purs.
  const spikeBlocks = callbacks.effects.filter((effect) => effect.type === 'police-spike-block');
  const spikeHits = callbacks.effects.filter((effect) => effect.type === 'police-spike-hit');
  const spikeDeploys = spikeBlocks.filter((effect) => effect.stage === 'deploy');
  const expectedSpikeLanes = cityRushSpikeLanes(courseLanes.forwardLanes, CITY_RUSH_SPIKE_LANES).length;
  if (wantedEffects.some((effect) => Number(effect.stars) >= CITY_RUSH_SPIKE_BLOCK_STARS) && !spikeDeploys.length) {
    fail('quatre étoiles atteintes sans qu’aucune herse ne se dresse', wantedEffects);
  }
  if (spikeDeploys.some((effect) => effect.lanes !== expectedSpikeLanes || effect.distance !== CITY_RUSH_SPIKE_BLOCK_LEAD)) {
    fail('une herse ne couvre pas les voies du sens de course ou se dresse à la mauvaise distance', spikeDeploys);
  }
  if (spikeBlocks.some((effect) => effect.stage === 'set' && effect.lanes !== expectedSpikeLanes)) {
    fail('la herse posée ne couvre pas les voies annoncées', spikeBlocks);
  }
  if (spikeDeploys.length && !spikeBlocks.some((effect) => effect.stage === 'set')) {
    fail('une herse déployée ne se pose jamais', spikeBlocks.map((effect) => effect.stage));
  }
  // Deux barrages ne se suivent pas plus vite que le délai de la règle (le
  // rangement pris en compte, la marge reste sous le dixième).
  const spikeCooldownFrames = Math.floor((CITY_RUSH_SPIKE_BLOCK_COOLDOWN / (FRAME_MS / 1000)) * 0.9);
  for (let index = 1; index < spikeDeployFrames.length; index += 1) {
    if (spikeDeployFrames[index] - spikeDeployFrames[index - 1] < spikeCooldownFrames) {
      fail('deux herses se suivent plus vite que le délai de la règle', spikeDeployFrames);
    }
  }
  if (spikeHits.some((effect) => !(Number(effect.lane) >= 0) || !(Number(effect.lanes) >= 1)
    || Number(effect.lanes) > expectedSpikeLanes)) {
    fail('un franchissement de herse ne dit pas sa voie ni les voies posées', spikeHits);
  }
  if (spikeHits.some((effect) => Number(effect.healthLost) !== 0)) {
    fail('la herse a retiré un carré au pilote alors que le lanceur neutralise ce coût', spikeHits);
  }
  if (spikeHits.some((effect) => effect.slowSeconds !== CITY_RUSH_SPIKE_SLOW_DURATION
    || effect.factor !== CITY_RUSH_SPIKE_SLOW_FACTOR)) {
    fail('la crevaison de la herse n’annonce pas le barème de la règle', spikeHits);
  }
  // Le HUD publie la herse montée : ses voies, sa distance et son état.
  const spikeHuds = callbacks.huds.filter((hud) => hud.spikeBlock);
  if (spikeHuds.some((hud) => !['deploying', 'laying', 'set', 'packing'].includes(hud.spikeBlock.state)
    || !Array.isArray(hud.spikeBlock.lanes) || hud.spikeBlock.lanes.length !== expectedSpikeLanes
    || !Number.isFinite(hud.spikeBlock.gap) || typeof hud.spikeBlock.covered !== 'boolean')) {
    fail('le HUD de la herse sort de ses états, de ses voies ou de sa distance', spikeHuds[0]);
  }
  if (spikeDeploys.length && !spikeHuds.length) fail('la herse n’apparaît jamais dans le HUD');

  // ── Les SUV de charge du contresens ──────────────────────────────────────
  // À cinq étoiles, deux SUV arrivent de face, visent la voie du pilote et
  // foncent ; le contact les retourne et les met dans la roue de la chasse.
  const suvAlerts = callbacks.effects.filter((effect) => effect.type === 'police-suv-charge');
  const suvContacts = callbacks.effects.filter((effect) => effect.type === 'traffic-impact' && effect.isSuv && effect.policeContact);
  const suvFiveStars = wantedEffects.some((effect) => Number(effect.stars) >= CITY_RUSH_WANTED_MAX_STARS);
  // La roquette du dernier tour peut descendre une charge **de loin** : le SUV
  // n'a alors jamais atteint la portée d'alerte, et l'annonce n'a jamais eu à
  // partir. On relève donc la plus petite distance vue **en charge** sur les
  // HUD : c'est elle qui dit si l'annonce était due.
  const suvChargingGaps = new Map();
  for (const hud of callbacks.huds) {
    for (const charge of hud.suvCharges || []) {
      if (charge.state !== 'charging') continue;
      // Un SUV retourné après un contact n'est plus une charge : il fait
      // demi-tour (`turnedAround`), puis chasse (`rallied`) — `updateSuvCharges`
      // saute l'annonce pendant tout ce temps. Le monde le dit : un rival peut
      // très bien le percuter loin devant le pilote. Idem pour une charge
      // dépassée, que le monde recycle (`CITY_RUSH_SUV_CHARGE_RECYCLE_BEHIND`).
      if (charge.rallied || charge.turnedAround) continue;
      const gap = Number(charge.gap);
      if (!Number.isFinite(gap) || gap < 0) continue;
      suvChargingGaps.set(charge.id, Math.min(suvChargingGaps.get(charge.id) ?? Infinity, gap));
    }
  }
  // Cinq étoiles sans aucune charge : les deux SUV devaient au moins se mettre
  // en route (voir `updateSuvCharges`).
  if (oncomingLanes > 0 && suvFiveStars && !suvAlerts.length && !suvChargingGaps.size) {
    fail('cinq étoiles sans aucune charge de SUV annoncée', wantedEffects);
  }
  const announcedSuvs = new Set(suvAlerts.map((effect) => effect.id));
  const missedSuvAlerts = [...suvChargingGaps]
    .filter(([id, gap]) => gap <= CITY_RUSH_SUV_CHARGE_ALERT_RANGE && !announcedSuvs.has(id));
  if (missedSuvAlerts.length) {
    fail('un SUV de charge arrivé à portée d’alerte n’a pas été annoncé', missedSuvAlerts);
  }
  if (oncomingLanes === 0 && (suvAlerts.length || suvContacts.length)) {
    fail('un parcours en sens unique a subi une charge de SUV', suvAlerts);
  }
  if (suvAlerts.some((effect) => !(Number(effect.distance) > 0
    && Number(effect.distance) <= CITY_RUSH_SUV_CHARGE_ALERT_RANGE))) {
    fail('une charge de SUV est annoncée hors de sa portée d’alerte', suvAlerts);
  }
  // Le coût du choc se mesure sur le pilote : un rival qui percute un SUV de
  // charge ouvre son dossier sans que la barre du joueur bouge (il n'a pas de
  // `healthLost`, la sienne est publiée à part).
  const playerSuvContacts = suvContacts.filter((effect) => effect.isPlayer);
  if (playerSuvContacts.some((effect) => Number(effect.healthLost) !== 0)) {
    fail('un SUV d’interception a retiré un carré au pilote alors que le lanceur neutralise ce coût', playerSuvContacts);
  }
  const suvPursued = new Set();
  for (const hud of callbacks.huds) {
    for (const car of hud.police || []) if (car.vehicleType === CITY_RUSH_SUV_CHARGE_TYPE) suvPursued.add(car.id);
  }
  // Le SUV touché fait demi-tour : il chasse, ou il a été descendu pendant la
  // manœuvre (le tir du pilote ou la rafale d'un rival).
  const suvTurned = callbacks.effects.some((effect) => effect.type === 'police-turnaround-complete'
    && String(effect.id).startsWith('rally-suv-charge'));
  const suvDestroyed = callbacks.effects.some((effect) => effect.type === 'police-destroyed'
    && effect.vehicleType === CITY_RUSH_SUV_CHARGE_TYPE);
  if (suvContacts.length && !suvPursued.size && !suvTurned && !suvDestroyed) {
    fail('un SUV de charge touché n’a pas fait demi-tour vers la chasse', suvContacts);
  }
  // Le HUD suit les deux SUV — dormants tant que la course n'est pas à cinq
  // étoiles (ou sur un parcours sans contresens).
  const suvHuds = callbacks.huds.filter((hud) => Array.isArray(hud.suvCharges));
  if (!suvHuds.length) fail('le HUD ne rapporte jamais les SUV de charge');
  if (suvHuds.some((hud) => hud.suvCharges.length !== CITY_RUSH_SUV_CHARGE_COUNT)) {
    fail('le HUD ne suit pas les deux SUV de charge', suvHuds[0].suvCharges);
  }
  const suvBadState = callbacks.huds.find((hud) => (hud.suvCharges || []).some((car) => !['dormant', 'charging', 'reloading', 'destroyed'].includes(car.state)));
  if (suvBadState) fail('un SUV de charge annonce un état inconnu', suvBadState.suvCharges);
  // Aucun SUV ne se met en charge sous cinq étoiles. On surveille les
  // transitions (et non l'état courant) : après l'arrivée, le dernier HUD peut
  // encore montrer une charge déjà close, faute d'image suivante.
  const suvEarly = callbacks.huds.find((hud, index) => {
    if (Number(hud.wantedLevel || 0) >= CITY_RUSH_WANTED_MAX_STARS) return false;
    const before = index > 0 ? callbacks.huds[index - 1].suvCharges || [] : [];
    return (hud.suvCharges || []).some((car) => {
      const wasDormant = (before.find((older) => older.id === car.id) || { state: 'dormant' }).state === 'dormant';
      return wasDormant && car.state !== 'dormant';
    });
  });
  if (suvEarly) fail(`un SUV de charge s’est activé avant cinq étoiles (étoiles ${suvEarly.wantedLevel})`, suvEarly.suvCharges);
  if (suvAlerts.some((effect) => Number(effect.speed) <= 0)) {
    fail('une charge de SUV annonce une vitesse nulle', suvAlerts);
  }
  const miniGarageUses = callbacks.effects.filter((effect) => effect.type === 'mini-garage-used');
  if (miniGarageUses.length > CITY_RUSH_MINI_GARAGE_COUNT) {
    fail('plus d’un mini-garage a été utilisé dans une course', miniGarageUses);
  }
  // La recherche ne tombe à zéro qu'à trois étoiles ou moins : au-dessus, le
  // portique ne la fait reculer que d'un cran (`cityRushMiniGarageWantedLevel`).
  if (miniGarageUses.some((effect) => Number(effect.previousStars) < 0
    || Number(effect.stars) !== cityRushMiniGarageWantedLevel(Number(effect.previousStars) || 0))) {
    fail('un mini-garage utilisé ne baisse pas la recherche comme la règle l’annonce', miniGarageUses);
  }
  // La porte s'annonce avant son repère : le pilote doit l'avoir vue arriver à
  // mi-course, même s'il la rate et la retrouve une boucle plus loin. Sans
  // porte (tōgé), il n'y a rien à montrer.
  if (garageExpected && !miniGarageApproachFrames) {
    fail('le mini-garage ne s’est jamais montré avant son repère de mi-course', { miniGarageVisibleFrames, miniGarageApproachFrames });
  }
  // Sortir d'un portique lâche la police : l'image suivante ne montre plus une
  // seule berline qui chasse le joueur (une réserve partie chasser un rival,
  // elle, reste en piste et c'est voulu). Recontacter la police après coup est
  // une nouvelle provocation : elle ne compte pas comme un relâchement raté.
  for (const check of callbacks.garageChecks) {
    if (!check.nextHud) {
      fail('aucun HUD n’est émis après un passage en mini-garage', check.effect);
      continue;
    }
    const expectedStars = cityRushMiniGarageWantedLevel(Number(check.effect.previousStars) || 0);
    const chasers = (check.nextHud.police || []).filter((car) => car.targetId === 'player');
    // La poursuite ne s'éteint qu'avec la dernière étoile : à quatre ou cinq,
    // le portique la fait reculer d'un cran et les berlines restent en chasse.
    if (expectedStars === 0 && chasers.length) {
      fail('une berline reste en chasse après la sortie du mini-garage', {
        effect: check.effect,
        stars: check.nextHud.wantedLevel,
        distance: check.nextHud.distance,
        chasers: chasers.map((car) => `${car.id}/${car.mode || '?'}`),
      });
    }
    if (Number(check.nextHud.wantedLevel) !== expectedStars) {
      fail('un mini-garage ne baisse pas la recherche comme la règle l’annonce', {
        effect: check.effect, wantedLevel: check.nextHud.wantedLevel, expectedStars,
      });
    }
  }
  if (miniGarageUses.some((effect) => !Number.isFinite(Number(effect.pursuersReleased)))) {
    fail('un mini-garage servi n’annonce pas les poursuivants lâchés', miniGarageUses);
  }
  const garagePursuersReleased = miniGarageUses.reduce((total, effect) => total + Number(effect.pursuersReleased || 0), 0);
  // Un passage qui avait des berlines à ses trousses doit les avoir lâchées.
  // Celui de mi-course peut tomber avant la première étoile : sans poursuite en
  // cours, il n'y a rien à relâcher.
  const chasedUses = callbacks.garageChecks.filter((check) => check.chasersBefore > 0
    && cityRushMiniGarageWantedLevel(Number(check.effect.previousStars) || 0) === 0);
  if (chasedUses.length && garagePursuersReleased === 0) {
    fail('aucune poursuite n’a été lâchée par un mini-garage alors que la police était en chasse', miniGarageUses);
  }
  if (miniGarageUses.some((effect) => effect.healthBefore <= 0 || effect.health > effect.maxHealth
    || effect.healthRestored !== Math.min(CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT, effect.maxHealth - effect.healthBefore)
    || effect.health !== effect.healthBefore + effect.healthRestored)) {
    fail('la réparation d’un mini-garage est incorrecte ou dépasse la résistance de la voiture', miniGarageUses);
  }
  const garageHealthRestored = miniGarageUses.reduce((total, effect) => total + effect.healthRestored, 0);
  // Chaque portique traversé s'entend : un bruitage d'atelier par passage, ni
  // plus (un garage ne sert qu'une fois) ni moins (une sortie muette).
  if ((audioCalls.garageRepair || 0) !== miniGarageUses.length) {
    fail('chaque passage en mini-garage doit jouer le bruitage de réparation', {
      passages: miniGarageUses.length, sons: audioCalls.garageRepair || 0,
    });
  }
  // Le compteur ne s'allume qu'à l'approche d'une porte : jamais à distance de
  // course, et jamais sans porte utilisable devant.
  const earlyGarageCounter = callbacks.huds.find((entry) => entry.miniGaragesActive
    && (!Number.isFinite(Number(entry.miniGarageNextDistance))
      || Number(entry.miniGarageNextDistance) > CITY_RUSH_MINI_GARAGE_HUD_RANGE));
  if (earlyGarageCounter) fail('le compteur de mini-garages s’allume sans porte en approche', earlyGarageCounter);
  const garageHudBeforeMidCourse = callbacks.huds.find((entry) => entry.miniGaragesActive
    && Number(entry.distance) < MINI_GARAGE_TRACK_DISTANCES[0] - CITY_RUSH_MINI_GARAGE_HUD_RANGE - 1);
  if (garageHudBeforeMidCourse) fail('le compteur de mini-garages s’allume avant la porte de mi-course', garageHudBeforeMidCourse);
  if (garageExpected && callbacks.huds.some((entry) => entry.distance >= MINI_GARAGE_TRACK_DISTANCES[0] - CITY_RUSH_MINI_GARAGE_HUD_RANGE)
    && !miniGarageVisibleFrames) {
    fail('le mini-garage n’est jamais apparu alors que la course a atteint son repère');
  }
  if (lastHud.miniGaragesActive || miniGarageNodes.some((garage) => garage.visible)) {
    fail('les mini-garages ou leur compteur restent affichés après l’arrivée');
  }
  if (new Set(miniGarageUses.map((effect) => effect.garage)).size !== miniGarageUses.length) {
    fail('un mini-garage a été utilisé plusieurs fois', miniGarageUses);
  }
  if (lastHud.wantedLevel < 3 && miniGarageUses.length === 0) {
    fail('le HUD ne conserve pas les étoiles et aucun mini-garage ne les a effacées', lastHud);
  }
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
  // L'attaque d'hélicoptère a été retirée : aucun rotor d'attaque ni missile
  // ne doit être lancé. Les explosions restantes sont celles des berlines
  // détruites et, éventuellement, de l'épave du joueur.
  if (audioCalls.missileLaunch || audioCalls.helicopterStart || audioCalls.helicopterStop) {
    fail('une attaque aérienne ou son bruitage est encore actif', audioCalls);
  }
  const destroyedPolice = callbacks.effects.filter((effect) => effect.type === 'police-destroyed').length;
  const wreckExplosions = callbacks.effects.filter((effect) => effect.type === 'player-wrecked').length;
  const expectedExplosions = destroyedPolice + wreckExplosions;
  if ((audioCalls.explosion || 0) !== expectedExplosions) {
    fail('une voiture détruite n’a pas son explosion (ou une explosion est sans cible)', { expectedExplosions, audioCalls });
  }
  if (!audioCalls.pickup) fail('aucun bip de ramassage alors que des bonus ont été pris', audioCalls);

  const maxDistance = Math.max(...finish.racers.map((r) => r.distance ?? 0));
  if (finish.destroyed) {
    // Course perdue sur une épave : le pilote n'a pas fini, il est dernier, et
    // la voiture s'est arrêtée après avoir tourné dans sa fumée.
    if (wreckEffects !== 1) fail('la course est perdue sans un unique effet d’épave', { wreckEffects, finish });
    if (finish.rank !== finish.racers.length) fail('une épave n’est pas classée dernière', { rank: finish.rank, racers: finish.racers.length });
    if (finish.racers.at(-1)?.id !== 'player') fail('le pilote détruit n’est pas en fin de tableau d’arrivée', finish.racers.map((r) => r.id));
    // Le pilote n'a pas fini ; un rival, lui, peut franchir la ligne pendant
    // les 3,2 s de l'épave (sa course continue, le pilote est classé dernier).
    const playerDistance = finish.racers.find((racer) => racer.id === 'player')?.distance ?? maxDistance;
    if (!(playerDistance < RACE_DISTANCE)) fail('une course perdue ne peut pas avoir vu le pilote franchir la ligne', { playerDistance, RACE_DISTANCE });
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
  // Budget de scène : mesuré jusqu'à 613 maillages visibles sur Tokyo, la ville
  // la plus dense, avec l'escouade complète et le trafic policier rappelé en
  // chasse. Le seuil garde une marge au-dessus de ce pic : il doit attraper une
  // fuite de maillages (objets jamais retirés), pas un pic de circulation.
  if (maxVisible > 700) fail(`trop de meshes visibles : ${maxVisible}`, { maxVisible, maxTriangles, worst: visibleBudgetSample });
  if (callbacks.pickups.length && !burstNodes.length) fail('aucun objet d’éclatement de bonus dans la scène');
  if (callbacks.pickups.length && !burstFrames) fail('bonus ramassés sans aucun éclatement visible', callbacks.pickups.length);
  if (callbacks.pickups.length && !respawnedPickups) fail('aucun bonus ramassé n’a réapparu après 0,1 s', callbacks.pickups.length);
  // Les bonus restent sur la route devant le pilote, du premier au dernier tour.
  if (rowStarvedFrames > 0) fail(`la route s’est vidée de ses bonus devant le pilote (${rowStarvedFrames} images sur ${rowAheadFrames + rowStarvedFrames})`, { rowStarvedFrames, rowAheadFrames, rowFrontGapMin });
  // L'escouade scénarisée est un rendez-vous du dernier tour. Une course perdue
  // avant d'y arriver — la coque du pilote vidée sous les rafales de police —
  // ne l'appelle jamais : les vérifications qui suivent l'escouade, le
  // décrochage, le barrage et l'hélico d'observation n'ont alors plus d'objet.
  // Le rendez-vous se juge sur la distance exacte, pas sur le HUD arrondi : un
  // pilote arrêté juste sous la ligne (5 999,8 m lus « 6 000 m ») n'a jamais
  // entamé son dernier tour, le monde n'a donc pas déployé l'escouade — la
  // vérifier aurait exigé une arrivée que la course n'a jamais appelée.
  const squadRendezvous = playerExactReach >= FINAL_LAP_START;
  // Escouade du dernier tour du joueur : deux berlines + un SUV, sans charge rouge, jamais classée.
  const policeArrivals = callbacks.effects.filter((effect) => effect.type === 'police-arrival');
  if (squadRendezvous) {
  if (policeArrivals.length !== 1) fail('l’escouade de police n’entre pas exactement une fois en piste', policeArrivals);
  if (policeArrivals[0]?.targetId !== 'player' || policeArrivals[0]?.target !== 'player') {
    fail('l’escouade de base n’annonce pas le joueur comme cible', policeArrivals[0]);
  }
  if (!firstPoliceHud) fail('aucune berline de police dans le HUD pendant la course');
  // Barre de vie : chaque berline expose ses points de vie au HUD (pleins à
  // l'entrée en piste), et une berline détruite les a bien eus avant l'explosion.
  for (const hud of callbacks.huds) {
    for (const car of hud.police || []) {
      if (!Number.isFinite(car.health) || car.maxHealth !== cityRushPoliceMaxHealth(car.vehicleType)
        || car.health < 0 || car.health > car.maxHealth) {
        fail('une berline de police du HUD n’a pas de barre de vie', car);
      }
    }
  }
  const destroyedPoliceEffects = callbacks.effects.filter((effect) => effect.type === 'police-destroyed');
  for (const effect of destroyedPoliceEffects) {
    const seen = callbacks.huds
      .map((hud) => (hud.police || []).find((car) => car.id === effect.id || car.name === effect.police))
      .filter(Boolean);
    if (!seen.length && !effect.trafficPolice) fail('une voiture de poursuite détruite n’est jamais apparue dans le HUD', effect);
    if (!Number.isFinite(effect.maxHealth) || effect.maxHealth !== cityRushPoliceMaxHealth(effect.vehicleType)
      || effect.health !== 0) {
      fail('l’explosion ne confirme pas les cases de santé du véhicule policier', effect);
    }
    if (seen.length && !(seen[0].health >= 1 && seen[0].health <= seen[0].maxHealth)) {
      fail('une voiture de poursuite détruite n’avait pas de vie cohérente dans le HUD', seen[0]);
    }
  }
  const retaliationEffects = callbacks.effects.filter((effect) => effect.type === 'police-retaliation');
  for (const effect of retaliationEffects) {
    if (!effect.targetId || effect.targetId === 'player' || effect.count !== 1) {
      fail('un rival attaquant la police ne reçoit pas une voiture dédiée', effect);
    }
    const assignedCar = callbacks.huds
      .map((hud) => (hud.police || []).find((car) => car.id === effect.id && car.targetId === effect.targetId))
      .find(Boolean);
    if (!assignedCar || assignedCar.squad) {
      fail('la voiture de représailles ne poursuit pas exclusivement le rival ciblé', { effect, assignedCar });
    }
  }
  const reinforcementEffects = callbacks.effects.filter((effect) => effect.type === 'police-reinforcement');
  for (const effect of reinforcementEffects) {
    if (effect.targetId !== 'player' || effect.target !== 'player') {
      fail('un renfort policier ne prend pas le joueur pour cible', effect);
    }
    if (!['police', 'police-suv'].includes(effect.vehicleType)
      || Boolean(effect.isSuv) !== (effect.vehicleType === 'police-suv')) {
      fail('un renfort n’annonce pas correctement son modèle berline/SUV', effect);
    }
    const spawned = callbacks.huds
      .map((hud) => (hud.police || []).find((car) => car.id === effect.id))
      .find(Boolean);
    if (!spawned || spawned.targetId !== 'player' || spawned.vehicleType !== effect.vehicleType) {
      fail('le renfort annoncé n’apparaît pas dans le HUD en chasse contre le joueur', { effect, spawned });
    }
  }
  // L'escouade de base est identifiée par `squad`; les voitures réservées aux
  // rivaux et les berlines civiles rappelées sont comptées séparément.
  const squadCars = firstPoliceHud.police.filter((car) => car.squad);
  if (squadCars.length !== CITY_RUSH_POLICE_COUNT) {
    fail(`${squadCars.length} voiture(s) de base en piste au lieu de ${CITY_RUSH_POLICE_COUNT}`, firstPoliceHud.police);
  }
  if (squadCars.some((car) => car.targetId !== 'player')) {
    fail('une voiture de l’escouade de base ne poursuit pas le joueur', squadCars);
  }
  const initialVehicleTypes = squadCars.map((car) => car.vehicleType).sort();
  if (initialVehicleTypes.join(',') !== 'police,police,police-suv') {
    fail('l’escouade initiale doit contenir deux berlines et un SUV', squadCars);
  }
  // Le quota découle du plateau entier, pas des survivants de l'image où
  // l'escouade entre : un rival déjà détruit ne réduit pas le nombre de
  // berlines que la course peut légitimement aligner contre le joueur.
  const rivalCount = Math.max(0, racerCars.length - 1);
  const maxActivePursuers = CITY_RUSH_POLICE_COUNT
    + CITY_RUSH_POLICE_EXTRA_PER_ATTACKER * rivalCount
    + policeTrafficNodes.length; // toute berline de police du trafic peut être rappelée
  if (firstPoliceHud.police.length > maxActivePursuers) fail('trop de poursuivants en piste', firstPoliceHud.police);
  // Au départ, la mitrailleuse est vide et aucune attaque d'hélicoptère n'est disponible.
  const arrivalCars = policeArrivals[0]?.armed || [];
  if (arrivalCars.length !== CITY_RUSH_POLICE_COUNT) {
    fail(`${arrivalCars.length} berline(s) annoncée(s) au lieu de ${CITY_RUSH_POLICE_COUNT}`, policeArrivals[0]);
  }
  if (arrivalCars.some((car) => typeof car[CITY_RUSH_POWERS.PISTOL] !== 'boolean')) {
    fail('l’arrivée ne décrit pas l’état de charge de chaque berline', arrivalCars);
  }
  // Une poursuite déclenchée par les étoiles peut commencer avant le dernier
  // tour : ces unités ont alors le droit de rafler un bonus rouge et de garder
  // leurs munitions quand l’escouade scénarisée complète rejoint la course.
  const arrivalEffectIndex = callbacks.effects.indexOf(policeArrivals[0]);
  const priorWantedDispatch = callbacks.effects.slice(0, arrivalEffectIndex)
    .some((effect) => effect.type === 'police-wanted-dispatch' || effect.type === 'police-steal');
  if (arrivalCars.some((car) => car[CITY_RUSH_POWERS.PISTOL]) && !priorWantedDispatch) {
    fail('une berline arrive armée sans avoir été déployée par la recherche ou raflé de bonus', arrivalCars);
  }
  const helicopterCalls = callbacks.effects.filter((effect) => effect.type === 'radio' || effect.type === 'missile-hit');
  if (helicopterCalls.length) fail('une attaque d’hélicoptère a été déclenchée', helicopterCalls);
  if (policeArrivals[0]?.helicopterAvailable !== false) {
    fail('le HUD de l’escouade indique encore une attaque aérienne disponible', policeArrivals[0]);
  }
  if (audioCalls.missileLaunch || audioCalls.helicopterStart || audioCalls.helicopterStop) {
    fail('un bruitage d’attaque aérienne a été joué', audioCalls);
  }
  if (policeArrivals[0]?.lap !== RACE_LAPS) {
    fail('l’arrivée scénarisée de l’escouade n’a pas lieu au dernier tour', {
      policeLap: policeArrivals[0]?.lap, raceLaps: RACE_LAPS,
    });
  }
  if (squadCars.some((car) => car.targetId !== 'player')) {
    fail('une voiture de l’escouade ne poursuit pas le joueur', squadCars);
  }
  }
  // Une ou deux berlines peuvent avoir été activées dès les étoiles 2–3 et
  // rouler depuis plusieurs minutes quand le dernier tour débute : on ne leur
  // impose plus la position de spawn réservée au seul déploiement final.
  // La police du trafic : un contact l'a rappelée, elle chasse son pilote, et
  // elle rentre dans le rang au drapeau à damier.
  const rallies = callbacks.effects.filter((effect) => effect.type === 'police-rally');
  const completedOncomingPolice = callbacks.effects.filter((effect) => effect.type === 'police-turnaround-complete');
  const ralliedInHud = new Set();
  for (const hud of callbacks.huds) {
    for (const car of hud.police || []) if (car.rallied) ralliedInHud.add(car.id);
  }
  const rallyEvents = [...rallies, ...completedOncomingPolice];
  if (!ralliedInHud.size && rallyEvents.length) fail('une berline rappelée n’apparaît jamais dans le HUD', rallyEvents);
  // Une berline lâchée par un mini-garage retourne à sa ronde : un contact
  // ultérieur peut la rappeler une seconde fois. Les événements peuvent donc
  // dépasser les berlines distinctes vues en chasse — jamais l'inverse.
  if (ralliedInHud.size > rallyEvents.length) {
    fail(`${ralliedInHud.size} berline(s) rappelée(s) en piste pour ${rallyEvents.length} contact(s)/demi-tour(s)`, [...ralliedInHud]);
  }
  for (const car of rallies) {
    if (!['POLICE ROUTIÈRE', 'POLICE EN CIVIL', 'POLICE SUV'].includes(car.police)) {
      fail('une berline rappelée n’est pas identifiée comme police routière, banalisée ou SUV', car);
    }
  }
  const ralliedIds = [...ralliedInHud];
  // Le joueur peut descendre la berline rappelée au tir rouge : la poursuite
  // s'arrête alors légitimement, parfois avant les deux secondes exigées. On ne
  // compte donc comme manquement que les berlines rappelées encore en piste —
  // c'est le cas sur un circuit resserré, où le joueur et la police partagent
  // les deux mêmes voies et où le contact arrive plus vite.
  const ralliedWrecked = callbacks.effects.some((effect) => effect.type === 'police-destroyed'
    && effect.police === 'POLICE ROUTIÈRE');
  if (ralliedHudFrames < 60 && !ralliedWrecked) fail('la police routière rappelée ne tient pas la chasse', ralliedHudFrames);
  if (ralliedAheadFrames < 60 && !ralliedWrecked) fail('la police routière rappelée ne se porte jamais devant le pilote qu’elle chasse', ralliedAheadFrames);
  if (!ralliedBlockadeFrames && !ralliedWrecked) fail('la police routière rappelée ne s’est jamais mise en barrage devant le pilote');
  if ((lastHud.police || []).some((car) => ralliedIds.includes(car.id))) {
    fail('une berline rappelée reste en piste après l’arrivée', lastHud.police);
  }
  if (squadRendezvous) {
  if (policeHudFrames < 30) fail('l’escouade ne tient pas la piste', policeHudFrames);
  if (!(policeClosestGap <= 30)) fail(`l’escouade reste à ${policeClosestGap} m du joueur`, policeClosestGap);
  // Sur chaque circuit, l'escouade reste dans le sillage du joueur au lieu de
  // s'enliser derrière le trafic lent : sinon elle décroche, sort de l'écran et
  // le dernier tour n'a plus de police que dans le HUD.
  const policeEngagedShare = policeEngagedFrames / Math.max(1, policeSquadFrames);
  if (policeEngagedShare < POLICE_MIN_ENGAGED_SHARE) {
    fail(`l’escouade n’est dans les ${POLICE_ENGAGE_RANGE} m du joueur que ${(policeEngagedShare * 100).toFixed(0)} % du dernier tour`, { policeEngagedFrames, policeSquadFrames, samples: policeLooseSamples });
  }
  if (policeMaxLag > POLICE_MAX_LAG) fail(`la voiture de l’escouade la mieux placée décroche de ${policeMaxLag.toFixed(0)} m derrière le joueur`, { policeMaxLag, limit: POLICE_MAX_LAG, worst: policeWorstLag });
  // Barrage roulant : au moins une berline freine devant sa cible, et la page
  // le raconte. Les berlines sont solides : jamais dans un pilote.
  if (!policeBlockadeFrames) fail('aucune berline ne s’est mise en barrage devant sa cible');
  if (!policePlayerOverlapFrames) fail('aucune berline n’est jamais passée à hauteur du pilote : la solidité n’a pas été éprouvée');
  if (rearOverlapWorst && rearOverlapWorst.streak > 36) {
    fail(`une berline reste collée dans le pare-chocs arrière d'une voiture sur ${rearOverlapWorst.streak} images`, rearOverlapWorst);
  }
  if (!(policeWorstOverlap >= CITY_RUSH_CAR_GAP - 1.5)) {
    fail(`le pilote traverse une berline solide : écart ${policeWorstOverlap.toFixed(2)} m < ${CITY_RUSH_CAR_GAP} m`, { ...worstPair, jumping: world.isJumping, jumpHeight: world.jumpHeight, stun: world.policeStunLeft });
  }
  }
  if (!rallies.length) fail('aucune berline de police du trafic n’a été rappelée par un contact');
  // L'hélico d'observation ne décolle qu'avec le dernier tour ; son cadrage se
  // mesure sur les images du dernier tour (la variable sert aussi au résumé).
  const watchHeliMeasured = watchHeliMeasuredFrames;
  if (squadRendezvous) {
  // L'hélico d'observation : absent avant le dernier tour, présent pendant
  // (rotors et pod animés), et il s'efface après l'arrivée.
  if (watchHeliEarlyFrames) fail(`l’hélico d’observation est visible sur ${watchHeliEarlyFrames} images avant le dernier tour`);
  const heliFollowShare = watchHeliFinalLapFrames / Math.max(1, openSkyFinalLapFrames);
  if (openSkyFinalLapFrames < 60) {
    console.log(`[${city.id}] dernier tour surtout sous la voûte : suivi de l’hélico jugé sur ${openSkyFinalLapFrames} image(s) à découvert`);
  } else if (heliFollowShare < 0.85) {
    fail(`l’hélico d’observation ne suit le pilote que ${watchHeliFinalLapFrames} images sur ${openSkyFinalLapFrames} à découvert du dernier tour`, {
      watchHeliFinalLapFrames, openSkyFinalLapFrames, openSkyHiddenFinalLapFrames, heliFollowShare: Number(heliFollowShare.toFixed(3)),
    });
  }
  // Les seuils d'animation valent pour une fenêtre pleine ; sous les voûtes de la
  // Shuto, l'appareil peut n'être visible que quelques images du dernier tour :
  // le rotor et le pod se jugent alors au prorata des images où il vole.
  if (watchHeliFinalLapFrames >= 60) {
    if (watchHeliRotorTurns < 60) fail('le rotor de l’hélico d’observation ne tourne pas', watchHeliRotorTurns);
    if (watchHeliPodSwing < 30) fail('le pod caméra de l’hélico d’observation ne balaie pas', watchHeliPodSwing);
  } else {
    if (watchHeliRotorTurns < Math.ceil(watchHeliFinalLapFrames * 0.25)) {
      fail(`le rotor de l’hélico d’observation ne tourne pas (${watchHeliRotorTurns} tours sur ${watchHeliFinalLapFrames} images de vol)`, watchHeliRotorTurns);
    }
    if (watchHeliPodSwing < Math.ceil(watchHeliFinalLapFrames * 0.15)) {
      fail(`le pod caméra de l’hélico d’observation ne balaie pas (${watchHeliPodSwing} sur ${watchHeliFinalLapFrames} images)`, watchHeliPodSwing);
    }
    console.log(`[${city.id}] animations de l’hélico jugées au prorata de ${watchHeliFinalLapFrames} image(s) de vol du dernier tour`);
  }
  // L'appareil doit être visible *dans le cadre* : ni hors champ, ni écrasé
  // contre le bord supérieur, ni caché sous les cartes du HUD.
  if (watchHeliMeasured < 60 && openSkyFinalLapFrames < 90) {
    console.log(`[${city.id}] cadrage de l’hélico jugé sur ${watchHeliMeasured} image(s) : dernier tour très couvert (${openSkyFinalLapFrames} f à découvert)`);
  } else if (watchHeliMeasured < 60) {
    fail(`le cadrage de l’hélico d’observation n’est mesurable que sur ${watchHeliMeasured} images`, watchHeliSettleFrames);
  }
  const watchHeliFramedShare = watchHeliFramedFrames / Math.max(1, watchHeliMeasured);
  // Une fenêtre de mesure trop courte ne dit rien : sous une voûte, l'appareil
  // n'a pas assez d'images de vol pour qu'une sortie de bande soit autre chose
  // qu'un arrondi. Le cadrage n'est jugé qu'au-delà de 30 images mesurées.
  const watchHeliFramingJudged = watchHeliMeasured >= 30;
  if (watchHeliFramingJudged && watchHeliFramedShare < 0.85) {
    fail(`l’hélico d’observation sort de la bande de ciel visible sur ${((1 - watchHeliFramedShare) * 100).toFixed(0)} % du dernier tour`, {
      yMin: watchHeliNdcYMin, yMax: watchHeliNdcYMax, xMax: watchHeliNdcXMax, band: [WATCH_HELI_BAND_Y_MIN, WATCH_HELI_BAND_Y_MAX, WATCH_HELI_BAND_X_MAX],
    });
  }
  if (watchHeliFramingJudged && watchHeliNdcYMax > 0.8) {
    fail(`l’hélico d’observation frôle le haut du cadre (${watchHeliNdcYMax.toFixed(2)}) — il passe sous les cartes du HUD`, { yMin: watchHeliNdcYMin, yMax: watchHeliNdcYMax });
  }
  if (watchHeliFramingJudged && watchHeliNdcYMin < 0.15) {
    fail(`l’hélico d’observation descend dans la circulation (${watchHeliNdcYMin.toFixed(2)})`, { yMin: watchHeliNdcYMin, yMax: watchHeliNdcYMax });
  }
  // Sous les voûtes de la Shuto, il n'y a pas de ciel : l'appareil s'efface et
  // doit revenir une fois ressorti (sinon il volerait dans le tunnel).
  if (city.id === 'tokyo' && watchHeliHiddenInFinalLap && watchHeliReturns < 1
    && watchHeliOpenSkyFrames >= 30) {
    fail('l’hélico d’observation ne rentre jamais après un tunnel', {
      watchHeliReturns, finalLapFrames: watchHeliFinalLapFrames, openSkyFrames: watchHeliOpenSkyFrames,
    });
  }
  if (city.id === 'tokyo' && watchHeliHiddenInFinalLap && watchHeliReturns < 1) {
    console.log(`[${city.id}] hélico d’observation resté sous la voûte jusqu’à l’arrivée (${watchHeliOpenSkyFrames} image(s) de ciel dégagé sous la voûte)`);
  }
  if (watchHeliEarlyFrames && watchHeliFinalLapFrames < 60) {
    fail('l’hélico d’observation suit le pilote hors du dernier tour', { watchHeliEarlyFrames, watchHeliFinalLapFrames });
  }
  }
  // La barre de vie est pleine dès le départ, visible pendant toute la course,
  // bornée et ne remontant que dans les garages ou sur un plus rouge ; chaque tir encaissé en retire un (le carré du
  // carambolage est neutralisé par le lanceur, voir plus bas). Chaque voiture a
  // **son** maximum (`cityRushCarMaxHealth`) : celui du pilote est calculé
  // depuis la voiture de l'essai, celui des rivaux depuis leur propre profil.
  const playerMaxHealth = cityRushCarMaxHealth(car);
  const catalogueMaxHealth = CITY_RUSH_CARS.map((profile) => cityRushCarMaxHealth(profile));
  const maxHealthByCarId = Object.fromEntries(CITY_RUSH_CARS.map((profile) => [profile.id, cityRushCarMaxHealth(profile)]));
  const racerHuds = callbacks.huds.flatMap((entry) => entry.racers || []);
  for (const racer of racerHuds) {
    const expectedMax = racer.isPlayer ? playerMaxHealth : maxHealthByCarId[racer.carId] ?? racer.maxHealth;
    if (!Number.isFinite(racer.maxHealth) || racer.maxHealth !== expectedMax
      || !catalogueMaxHealth.includes(racer.maxHealth)
      || !Number.isFinite(racer.health) || racer.health < 0 || racer.health > racer.maxHealth) {
      fail('une voiture de course n’a pas la barre de vie de sa coque', racer);
    }
  }
  const healthHuds = callbacks.huds.filter((entry) => entry.playerHealthActive);
  if (!healthHuds.length) fail('la barre de vie du pilote n’apparaît jamais');
  if (Number(healthHuds[0].playerHealth) !== Number(healthHuds[0].playerHealthMax)) {
    fail('la barre de vie du pilote n’est pas pleine au départ', healthHuds[0]);
  }
  if (!healthHuds.some((entry) => (entry.lap || 1) < (entry.laps || 1))) {
    fail('la barre de vie du pilote n’est pas visible avant le dernier tour');
  }
  let healthBadBounds = 0;
  let healthRiseFrames = 0;
  let healthRiseTotal = 0;
  let healthPrevious = null;
  for (const entry of healthHuds) {
    const value = Number(entry.playerHealth);
    const max = Number(entry.playerHealthMax);
    if (!Number.isFinite(value) || !Number.isFinite(max) || value < 0 || value > max) healthBadBounds += 1;
    if (healthPrevious !== null && value > healthPrevious) {
      healthRiseFrames += 1;
      healthRiseTotal += value - healthPrevious;
    }
    healthPrevious = value;
  }
  if (healthBadBounds) fail(`la barre de vie du pilote sort de ses bornes sur ${healthBadBounds} images`);
  const playerHealthPickupEffects = callbacks.effects.filter((effect) => effect.type === 'player-health-pickup');
  const healthPickupRestored = playerHealthPickupEffects.reduce((total, effect) => total + Number(effect.healthRestored || 0), 0);
  const healthRestoreCount = miniGarageUses.filter((effect) => effect.healthRestored > 0).length
    + playerHealthPickupEffects.filter((effect) => effect.healthRestored > 0).length;
  if (healthRiseFrames !== healthRestoreCount
    || healthRiseTotal !== garageHealthRestored + healthPickupRestored) {
    fail(`la barre de vie du pilote remonte hors réparation/soin sur ${healthRiseFrames} images`, {
      garages: miniGarageUses,
      plusRouges: playerHealthPickupEffects,
    });
  }
  if (lastHud.playerHealthActive) fail('la barre de vie du pilote reste après l’arrivée', lastHud.playerHealth);
  let runningHealth = null;
  for (const effect of callbacks.effects) {
    if (effect.type === 'player-health') {
      if (effect.maxHealth !== playerMaxHealth) fail('la barre de vie du pilote n’a pas le maximum de sa coque', effect);
      runningHealth = effect.health;
      if (runningHealth !== playerMaxHealth) fail('la barre de vie du pilote ne part pas pleine', effect);
      continue;
    }
    if (effect.type === 'mini-garage-used' || effect.type === 'player-health-pickup') {
      if (runningHealth !== effect.healthBefore) fail('une réparation ne part pas de la santé réelle du pilote', effect);
      const expectedRestored = Math.min(CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT, effect.maxHealth - effect.healthBefore);
      if (effect.type === 'player-health-pickup'
        && effect.healthRestored !== Math.min(CITY_RUSH_HEALTH_PICKUP_RESTORE, effect.maxHealth - effect.healthBefore)) {
        fail('le plus rouge ne rend pas exactement un carré de vie', effect);
      }
      if (effect.type === 'mini-garage-used'
        && effect.healthRestored !== expectedRestored) {
        fail('le mini-garage ne rend pas six carrés au maximum', effect);
      }
      runningHealth = effect.health;
      continue;
    }
    if (effect.type !== 'player-hit') continue;
    healthHitEffects += 1;
    healthHitsBySource[effect.source] = (healthHitsBySource[effect.source] || 0) + 1;
    // Un carambolage ne se compte que sur une voiture **devant** le pilote : le
    // trafic rattrapé et la berline percutée en accélérant arrivent avec un
    // écart positif. Le face-à-face, lui, croise les carrosseries au mètre
    // près : la distance annoncée y est une magnitude (≥ 0).
    if (['collision', 'suv-collision'].includes(effect.source)
      && !(Number.isFinite(Number(effect.gap)) && Number(effect.gap) >= 0)) {
      healthBadDamage += 1;
      fail('un carambolage est compté sur une voiture sans écart avec le pilote', effect);
    }
    if (runningHealth === null) { healthBadDamage += 1; continue; }
    const expected = Math.min(1, runningHealth);
    if (effect.damage !== expected) healthBadDamage += 1;
    runningHealth = Math.max(0, runningHealth - effect.damage);
    if (runningHealth !== effect.health) healthBadDamage += 1;
    if (effect.health === 0) healthCubes += 1;
  }
  if (healthBadDamage) fail('un dégât encaissé par le pilote ne retire pas exactement une cellule', healthBadDamage);
  // Le pilote d'essai percute le trafic et la police **exprès** (riposte
  // policière, face-à-face, barrages) : le carré du carambolage est neutralisé
  // par le lanceur (`city-rush-smoke.mjs`) pour qu'il aille au bout des six
  // tours. La règle est vérifiée par les tests purs et par la vérif
  // coque/police, qui joue le vrai barème sur une barre de trois cellules
  // (un carré par carambolage, espacé par le répit).
  const playerRamDamage = callbacks.effects.filter((effect) => effect.type === 'player-hit' && ['collision', 'suv-collision'].includes(effect.source));
  if (playerRamDamage.length) {
    fail('un carambolage a retiré de la vie au joueur alors que le lanceur neutralise ce coût', playerRamDamage);
  }
  const policeRamDamage = callbacks.effects.filter((effect) => effect.type === 'police-hit' && ['collision', 'suv-collision'].includes(effect.source));
  if (policeRamDamage.some((effect) => effect.damage !== 1)) {
    fail('un carambolage en accélérant n’a pas retiré exactement un point de vie à la police', policeRamDamage);
  }

  if (squadRendezvous && (firstPoliceHud.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le classement du HUD');
  if ((finish.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le tableau d’arrivée');
  if (lastHud.police?.length) fail('l’escouade reste en piste après l’arrivée', lastHud.police);
  if (!audioCalls.policeSiren) fail('la sirène de police n’a jamais sonné', audioCalls);

  const groundBoosts = callbacks.pickups.filter((pickup) => pickup.type === CITY_RUSH_PICKUPS.BOOST);
  if (!groundBoosts.length) fail('le pilote n’a pas ramassé de bonus turbo pendant la course', callbacks.pickups);
  if (groundBoosts.some((pickup) => !pickup.autoActivated || pickup.chargeCost !== 1)) {
    fail('un bonus turbo ne s’est pas activé automatiquement au ramassage', groundBoosts);
  }
  if ((audioCalls.boost || 0) < groundBoosts.length) fail('un bonus turbo ramassé n’a pas déclenché son boost sonore', { groundBoosts: groundBoosts.length, audioCalls });
  const redPickups = callbacks.pickups.filter((pickup) => pickup.type === CITY_RUSH_POWERS.PISTOL);
  // Le bonus rouge n'apparaît que dans 8 % des objets : une longue course peut encore
  // bien se terminer sans que le pilote en croise un. S'il en ramasse un, il
  // doit recharger le chargeur complet de sept balles.
  if (redPickups.some((pickup) => pickup.chargeCost !== CITY_RUSH_PISTOL_AMMO_PER_PICKUP
    || pickup.progress !== CITY_RUSH_PISTOL_AMMO_PER_PICKUP
    || pickup.ammo !== CITY_RUSH_PISTOL_AMMO_PER_PICKUP)) {
    fail('un bonus rouge ramassé ne recharge pas les sept balles de l’AK-47', redPickups);
  }
  const healthPickups = callbacks.pickups.filter((pickup) => pickup.type === CITY_RUSH_PICKUPS.HEALTH);
  if (healthPickups.some((pickup) => pickup.healthRestored !== CITY_RUSH_HEALTH_PICKUP_RESTORE
    || pickup.chargeCost !== CITY_RUSH_HEALTH_PICKUP_RESTORE
    || pickup.health > pickup.maxHealth)) {
    fail('un plus rouge ne rend pas exactement un carré de vie', healthPickups);
  }
  // Le bazooka est un bonus de route à part entière : deux entrepôts par course
  // (30 % puis 65 %), chacun rechargeant une seule roquette, sans activation
  // automatique.
  const bazookaPickups = callbacks.pickups.filter((pickup) => pickup.type === 'bazooka');
  if (bazookaPickups.some((pickup) => pickup.ammo !== CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP
    || pickup.progress !== CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP
    || pickup.chargeCost !== CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP
    || pickup.autoActivated)) {
    fail('un entrepôt de bazooka ramassé ne recharge pas son unique roquette', bazookaPickups);
  }
  // Le fusil à pompe bleu est une arme de route comme l'AK-47 : trois
  // cartouches par bonus, sans activation automatique.
  const bluePickups = callbacks.pickups.filter((pickup) => pickup.type === CITY_RUSH_POWERS.SHOTGUN);
  if (bluePickups.some((pickup) => pickup.ammo !== CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP
    || pickup.progress !== CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP
    || pickup.chargeCost !== CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP
    || pickup.autoActivated)) {
    fail('un bonus bleu ramassé ne charge pas les trois cartouches du pompe', bluePickups);
  }
  const unsupportedPickups = callbacks.pickups.filter((pickup) => ![
    CITY_RUSH_PICKUPS.BOOST, CITY_RUSH_PICKUPS.HEALTH,
    CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.SHOTGUN, 'bazooka',
  ].includes(pickup.type));
  if (unsupportedPickups.length) fail('un bonus hérité (tir bleu, hélico) est encore collecté sur la route', unsupportedPickups);
  if (callbacks.pickups.some((pickup) => pickup.autoActivated
    && ![CITY_RUSH_PICKUPS.BOOST, CITY_RUSH_PICKUPS.HEALTH].includes(pickup.type)
    && !CITY_RUSH_POWER_RULES[pickup.type]?.automatic)) {
    fail('un pouvoir manuel a été signalé comme activation automatique', callbacks.pickups.filter((pickup) => pickup.autoActivated));
  }
  const unsupportedShotEffects = new Set([
    'blue-shot-hit', 'blue-shot-hit-player', 'blue-shot-miss', 'rival-blue-shot',
    'rival-radio', 'radio-no-target', 'radio-busy',
  ]);
  const unsupportedShots = callbacks.effects.filter((effect) => unsupportedShotEffects.has(effect.type));
  if (unsupportedShots.length) fail('un tir bleu ou une attaque aérienne a encore été déclenché', unsupportedShots);
  if (redPickups.length && !audioCalls.machineGun) {
    fail('une mitrailleuse chargée n’a pas déclenché son tir sonore', { redPickups, audioCalls });
  }
  if (bluePickups.length && !audioCalls.shotgun) {
    fail('un fusil à pompe chargé n’a pas déclenché son coup de tonnerre', { bluePickups, audioCalls });
  }
  // L'emplacement d'arme est unique : jamais deux armes chargées en même temps.
  const bothArmed = callbacks.huds.filter((hud) => (
    (hud.inventory?.[CITY_RUSH_POWERS.PISTOL] || 0) > 0
    && (hud.inventory?.[CITY_RUSH_POWERS.SHOTGUN] || 0) > 0
  ));
  if (bothArmed.length) fail('deux armes sont chargées en même temps', bothArmed.slice(0, 3).map((hud) => hud.inventory));


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
  if (hudAfterReset.miniGaragesActive
    || (garageExpected && hudAfterReset.miniGaragesRemaining !== CITY_RUSH_MINI_GARAGE_COUNT)
    || miniGarageNodes.some((garage, index) => garage.visible || garage.userData.used
      || garage.userData.trackDistance !== MINI_GARAGE_TRACK_DISTANCES[index])) {
    fail('reset() ne réarme pas et ne masque pas les garages pour la course suivante', hudAfterReset);
  }
  if (watchHeli.visible) fail('l’hélico d’observation reste dans le ciel après reset()');
  if (hudAfterReset.playerHealthActive || hudAfterReset.playerHealth !== null) {
    fail('la barre de vie du pilote survit à reset()', hudAfterReset.playerHealth);
  }

  try { world.destroy(); } catch (e) { console.error('destroy() a levé :', e); process.exit(1); }
  if (rafQueue.size) fail('rAF encore planifié après destroy()', rafQueue.size);

  const effectTypes = [...new Set(callbacks.effects.map((e) => e.type))];
  console.log(
    `[${city.id}] OK — build ${buildMs} ms · course ${raceSeconds.toFixed(1)} s virtuelles / ${frames} frames · rythme ${coursePace} · pointe ${Math.round(world.topSpeed * 3.6)} km/h (compteur max ${maxHudSpeed}, plafond ${Math.round(hudSpeedCeiling)})` +
    ` · tours joueur ${playerLaps.join('→') || '—'} · rang ${finish.rank}` +
    ` · HUD ${callbacks.huds.length} · bonus ${callbacks.pickups.length} (éclatés ${burstFrames} f) · rangées devant le pilote chaque image (fenêtre ${Number.isFinite(rowFrontGapMin) ? rowFrontGapMin.toFixed(0) : '—'}–${rowFrontGapMax.toFixed(0)} m) · effets ${effectTypes.join('/')}` +
    ` · police ${firstPoliceHud ? `entrée à ${firstPoliceHud.police.map((car) => car.distance).join('/')} m (joueur ${Math.round(firstPoliceHud.distance || 0)}) · ${policeSquadFrames} f en piste · ${policeAheadFrames} f devant · plus près ${policeClosestGap.toFixed(1)} m · à ≤ ${POLICE_ENGAGE_RANGE} m ${(policeEngagedFrames / Math.max(1, policeSquadFrames) * 100).toFixed(0)} % · retard max de la plus proche ${policeMaxLag.toFixed(0)} m · ${policeBlockadeFrames} f en barrage${policeStunFrames ? ` · ${policeStunFrames} f sonnée` : ''}` : 'jamais entrée'}` +
    ` · police routière ${rallies.length} contact(s) · ${ralliedHudFrames} f en chasse · ${ralliedAheadFrames} f devant le joueur · ${ralliedBlockadeFrames} f en barrage` +
    ` · écart mini berline/pilote ${Number.isFinite(policeWorstOverlap) ? policeWorstOverlap.toFixed(1) : '—'} m` +
    ` · hélico d’observation ${watchHeliFinalLapFrames} f (${watchHeliReturns} rentrée(s) de tunnel · rotor ${watchHeliRotorTurns} tours · cadre y ${watchHeliNdcYMin.toFixed(2)}–${watchHeliNdcYMax.toFixed(2)}, moy ${(watchHeliNdcYSum / Math.max(1, watchHeliMeasured)).toFixed(2)} · x ≤ ${watchHeliNdcXMax.toFixed(2)} · ${(watchHeliFramedFrames / Math.max(1, watchHeliMeasured) * 100).toFixed(0)} % dans la bande)` +
    ` · mini-garages ${miniGarageVisibleFrames} f en vue · ${miniGarageUses.length} passage(s) · ${garageHealthRestored} cellule(s) rendue(s) · ${garagePursuersReleased} poursuite(s) lâchée(s)` +
    ` · barre de vie du pilote ${healthHuds.length} HUD · ${healthHitEffects} touche(s) subie(s) (rouge ${healthHitsBySource.pistol || 0} · carambolage ${healthHitsBySource.collision || 0}) · ${healthCubes} passage(s) à zéro` +
    ` (${policePlayerOverlapFrames} f de recouvrement · rival ${Number.isFinite(policeAiOverlap) ? policeAiOverlap.toFixed(1) : '—'} m)` +

    (introStats ? ` · intro ${introStats.meshes} meshes / ${introStats.triangles} tris` : '') +
    ` · max visibles ${maxVisible} meshes / ${maxTriangles} tris${visibleBudgetSample?.groups?.length ? ` (${visibleBudgetSample.groups.slice(0, 4).join(' ')})` : ''}` +
    ` · sons ${AUDIO_METHODS.filter((name) => audioCalls[name]).map((name) => `${name} ${audioCalls[name]}`).join(' / ')}`,
  );
}
console.log(`SMOKE OK — ${courses.length} parcours, ${RACE_LAPS} tours (${RACE_DISTANCE} m, dernier tour ${CITY_RUSH_FINAL_LAP_LENGTH} m) · aucune attaque d’hélicoptère`);
process.exit(0);
