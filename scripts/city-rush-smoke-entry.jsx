// Smoke « Vice City Rush » : exécute createCityRushWorld (vrai code) avec un
// faux WebGLRenderer, pompe la boucle animate à 30 Hz et joue une course
// complète (5 tours × 600 m) pour chaque ville demandée.
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
  CITY_RUSH_LANE_X, CITY_RUSH_SCROLL_SCALE,
} = await import('../src/games/cityRushRules.js');
const {
  CITY_RUSH_TUNNEL_LANE_HALF, cityRushTunnels,
} = await import('../src/games/cityRushTunnels.js');

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

// Bande-son : le monde ne connaît qu'une ref. On y glisse un compteur — pas
// de Web Audio ici, mais la certitude qu'une course complète déclenche bien
// moteur, feux, tours, tirs et arrivée, et que l'hélicoptère est toujours
// éteint (un rotor qui tourne dans le vide s'entendrait jusqu'à la page
// d'accueil).
const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'oilDrop', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff', 'tunnelRush', 'tunnelExit',
];

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
    }), car.id, audioRef);
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
  scene?.traverse((object) => {
    if (object.name === 'pickup-burst') burstNodes.push(object);
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
  // Tremis : le joueur ne doit jamais rouler dans une voie murée, et le HUD
  // doit annoncer chaque passage sous la voûte.
  let tunnelHudFrames = 0;
  const tunnelIds = new Set();
  while (!callbacks.finish && frames < maxFrames) {
    const hud = callbacks.huds[callbacks.huds.length - 1];
    if (hud?.tunnel) {
      tunnelHudFrames += 1;
      tunnelIds.add(hud.tunnel.id);
      if (!hud.tunnel.openLanes.includes(hud.playerLane)) {
        fail(`le joueur roule dans une voie murée sous ${hud.tunnel.name} (voie ${hud.playerLane})`, hud.tunnel);
      }
      if (hud.tunnel.openLanes.length < 2) fail('un tremis laisse moins de deux voies ouvertes', hud.tunnel);
    }
    // Pilote naïf : si on traîne derrière le trafic, on tente de changer de voie ;
    // on déclenche chaque pouvoir dès qu'il est chargé.
    if (hud && hud.speed < 70) slowFrames += 1; else slowFrames = 0;
    if (slowFrames > 12) {
      world.action(steer);
      steer = steer === 'left' ? 'right' : 'left';
      slowFrames = 0;
    }
    if (hud && frames % 15 === 0) {
      for (const type of ['cash', 'oil', 'pistol', 'radio']) {
        if ((hud.inventory?.[type] || 0) >= (CITY_RUSH_POWER_RULES[type]?.chargeCost ?? 99)) world.action(type);
      }
    }
    runFrames(1, `course f${frames}`);
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
    if (hud?.police?.length) {
      if (!firstPoliceHud) firstPoliceHud = hud;
      policeHudFrames += 1;
      const hudLeader = Math.max(hud.distance || 0, ...(hud.racers || []).map((racer) => racer.distance || 0));
      for (const car of hud.police) {
        const gap = (car.distance || 0) - (hud.distance || 0);
        if (gap > 0 && gap < 80) policeAheadFrames += 1;
        policeClosestGap = Math.min(policeClosestGap, Math.abs((car.distance || 0) - hudLeader));
        if (car.mode) policeBeacons += 1;
      }
      const squadGap = Math.min(...hud.police.map((car) => Math.abs((car.distance || 0) - hudLeader)));
      if (squadGap <= POLICE_ENGAGE_RANGE) policeEngagedFrames += 1;
      policeMaxLag = Math.max(policeMaxLag, hudLeader - Math.max(...hud.police.map((car) => car.distance || 0)));
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
  if (audioCalls.explosion !== audioCalls.missileLaunch) fail('un missile sans explosion (ou l’inverse)', audioCalls);
  // Un missile suppose un hélicoptère ; une frappe avortée par l'arrivée ou
  // par `reset()` compte un démarrage de plus que de missiles, jamais
  // l'inverse. Et chaque rotor démarré finit éteint.
  if ((audioCalls.helicopterStart || 0) < (audioCalls.missileLaunch || 0)) fail('un missile sans hélicoptère', audioCalls);
  if ((audioCalls.helicopterStop || 0) < (audioCalls.helicopterStart || 0)) fail('un rotor n’a pas été éteint', audioCalls);
  if (!audioCalls.pickup) fail('aucun bip de ramassage alors que des bonus ont été pris', audioCalls);

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
  if (firstPoliceHud.police.length > 2) fail('plus de deux berlines en piste', firstPoliceHud.police);
  const leaderDistance = Math.max(firstPoliceHud.distance || 0, ...(firstPoliceHud.racers || []).map((racer) => racer.distance || 0));
  for (const car of firstPoliceHud.police) {
    if (car.distance > leaderDistance + 2) fail('une berline entre en piste devant le leader', { leaderDistance, car });
    if (car.distance < leaderDistance - 140) fail('une berline entre trop loin derrière le leader', { leaderDistance, car });
  }
  if (policeHudFrames < 30) fail('l’escouade ne tient pas la piste', policeHudFrames);
  if (!(policeClosestGap <= 30)) fail(`l’escouade reste à ${policeClosestGap} m du leader`, policeClosestGap);
  // Sur chaque circuit, l'escouade reste dans le sillage du leader au lieu de
  // s'enliser derrière le trafic lent : sinon elle décroche de 100 à 300 m, sort
  // de l'écran et le dernier tour n'a plus de police que dans le HUD.
  const policeEngagedShare = policeEngagedFrames / policeHudFrames;
  if (policeEngagedShare < POLICE_MIN_ENGAGED_SHARE) {
    fail(`l’escouade n’est dans les ${POLICE_ENGAGE_RANGE} m du leader que ${(policeEngagedShare * 100).toFixed(0)} % du dernier tour`, { policeEngagedFrames, policeHudFrames });
  }
  if (policeMaxLag > POLICE_MAX_LAG) fail(`l’escouade décroche de ${policeMaxLag.toFixed(0)} m derrière le leader`, { policeMaxLag, limit: POLICE_MAX_LAG });
  if ((firstPoliceHud.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le classement du HUD');
  if ((finish.racers || []).some((racer) => String(racer.id).startsWith('police'))) fail('une berline figure dans le tableau d’arrivée');
  if (lastHud.police?.length) fail('l’escouade reste en piste après l’arrivée', lastHud.police);
  if (!audioCalls.policeSiren) fail('la sirène de police n’a jamais sonné', audioCalls);

  const automaticCash = callbacks.pickups.filter((pickup) => pickup.type === 'cash' && pickup.autoActivated).length;
  const automaticOil = callbacks.pickups.filter((pickup) => pickup.type === 'oil' && pickup.autoActivated).length;
  if (callbacks.pickups.some((pickup) => pickup.autoActivated && !CITY_RUSH_POWER_RULES[pickup.type]?.automatic)) {
    fail('un bonus manuel a été signalé comme activation automatique', callbacks.pickups.filter((pickup) => pickup.autoActivated));
  }
  if ((audioCalls.boost || 0) < automaticCash) fail('un boost vert chargé ne s’est pas activé automatiquement', { automaticCash, audioCalls });
  if ((audioCalls.oilDrop || 0) < automaticOil) fail('une jauge huile pleine n’a pas déposé sa flaque automatiquement', { automaticOil, audioCalls });

  // Tremis, côté pierre : une voûte au-dessus de la route, et rien de minéral
  // dans le couloir resté ouvert. La matière des tremis est la seule mate à
  // 0,97 de rugosité, ce qui suffit à la retrouver dans la scène fusionnée.
  // Certains circuits n'en ont pas : on vérifie alors qu'il n'y en a vraiment
  // aucun, ni dans le HUD, ni dans la scène, ni dans les enceintes.
  const planned = cityRushTunnels(city.id);
  const tunnels = world.tunnels || planned;
  if (tunnels.length !== planned.length) fail('le monde ne connaît pas les tremis du circuit', { planned: planned.length, tunnels: tunnels.length });
  let tunnelMesh = null;
  scene?.traverse((object) => {
    if (tunnelMesh || !object.isMesh) return;
    if (object.material && Math.abs((object.material.roughness ?? 0) - 0.97) < 0.005) tunnelMesh = object;
  });
  if (!tunnels.length) {
    if (tunnelHudFrames || tunnelIds.size) fail('un tremis signalé dans un circuit qui n’en a pas');
    if (tunnelMesh) fail('de la pierre de tremis dans un circuit qui n’en a pas');
    if (audioCalls.tunnelRush || audioCalls.tunnelExit) fail('un souffle de tunnel dans un circuit qui n’en a pas', audioCalls);
  } else {
    if (!tunnelHudFrames) fail('le HUD n’a jamais signalé un tremis traversé');
    if (tunnelIds.size !== tunnels.length) fail(`seulement ${tunnelIds.size}/${tunnels.length} tremis traversés`);
    if (!tunnelMesh) fail('la géométrie des tremis est absente de la scène');
    const vertices = tunnelMesh.geometry.attributes.position;
    let vaultVertices = 0;
    let corridorIntrusions = 0;
    for (let index = 0; index < vertices.count; index += 1) {
      const x = vertices.getX(index);
      const y = vertices.getY(index);
      const track = -vertices.getZ(index) / CITY_RUSH_SCROLL_SCALE;
      const tunnel = tunnels.find((item) => track > item.entry - 1 && track < item.exit + 1);
      if (!tunnel) continue;
      if (y > 8.6) vaultVertices += 1;
      if (y >= 8.6) continue;
      // Le couloir resté ouvert : de la première à la dernière voie ouverte.
      // Aucun bloc de pierre ne doit y traîner, que la paroi soit d'un seul
      // côté ou des deux (couloir central).
      const corridorMin = CITY_RUSH_LANE_X[tunnel.openLanes[0]] - CITY_RUSH_TUNNEL_LANE_HALF;
      const corridorMax = CITY_RUSH_LANE_X[tunnel.openLanes[tunnel.openLanes.length - 1]] + CITY_RUSH_TUNNEL_LANE_HALF;
      if (x > corridorMin + 0.06 && x < corridorMax - 0.06) corridorIntrusions += 1;
    }
    if (!vaultVertices) fail('aucune voûte au-dessus de la route');
    if (corridorIntrusions > 0) fail(`${corridorIntrusions} sommets de pierre dans le couloir ouvert`);
    if (!audioCalls.tunnelRush) fail('aucun souffle de tunnel déclenché', audioCalls);
    if ((audioCalls.tunnelExit || 0) < (audioCalls.tunnelRush || 0) - 1) fail('une entrée de tunnel reste sans sortie', audioCalls);
  }

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

  // Voie murée : on remet la course au départ et on force le volant vers la
  // gauche (voie 0, murée sous le premier tremis de Vice City) pour vérifier,
  // en vrai, que le joueur est retenu au volant puis raclé s'il insiste. Sur un
  // circuit qui n'a pas de tremis, la séquence est simplement sautée.
  if (planned.length) {
    const closedLane = planned[0].closedLanes[0];
    const side = closedLane < planned[0].openLanes[0] ? 'left' : 'right';
    world.reset();
    world.setPhase('playing');
    world.start();
    const scrapesBefore = callbacks.effects.filter((e) => e.type === 'tunnel-scrape').length;
    let sawWalledLane = false;
    let entryLane = null;
    let tunnelFrame = null;
    for (let index = 0; index < 300 && !tunnelFrame; index += 1) {
      // On pousse le volant vers la paroi à chaque image : sans retenue, le
      // joueur finirait dans la voie murée.
      world.action(side);
      runFrames(1, `approche de la paroi f${index}`);
      const hud = callbacks.huds.at(-1);
      if (hud?.playerLane === closedLane) sawWalledLane = true;
      if (hud?.tunnel) { tunnelFrame = index; entryLane = hud.playerLane; }
    }
    if (tunnelFrame === null) fail('la seconde course n’atteint jamais le premier tremis');
    if (entryLane === closedLane) fail('le joueur entre dans une voie murée malgré la retenue au volant', { closedLane, entryLane });
    const scrapes = callbacks.effects.filter((e) => e.type === 'tunnel-scrape').length - scrapesBefore;
    if (sawWalledLane && !scrapes) fail('le joueur a roulé dans la voie murée sans racler la paroi');
    console.log(`  [${city.id}] paroi ${side} (voie ${closedLane}) : retenu à la voie ${entryLane}, ${scrapes} raclement(s)`);
  }

  try { world.destroy(); } catch (e) { console.error('destroy() a levé :', e); process.exit(1); }
  if (rafQueue.size) fail('rAF encore planifié après destroy()', rafQueue.size);

  const effectTypes = [...new Set(callbacks.effects.map((e) => e.type))];
  console.log(
    `[${city.id}] OK — build ${buildMs} ms · course ${raceSeconds.toFixed(1)} s virtuelles / ${frames} frames` +
    ` · tours joueur ${playerLaps.join('→') || '—'} · rang ${finish.rank}` +
    ` · HUD ${callbacks.huds.length} · bonus ${callbacks.pickups.length} (éclatés ${burstFrames} f) · effets ${effectTypes.join('/')}` +
    (tunnels.length ? ` · tremis ${tunnelIds.size}/${tunnels.length} traversés (${tunnelHudFrames} f sous la voûte)` : ' · sans tremis') +
    ` · police ${firstPoliceHud ? `entrée à ${firstPoliceHud.police.map((car) => car.distance).join('/')} m (leader ${Math.round(leaderDistance)}) · ${policeHudFrames} f en piste · ${policeAheadFrames} f devant · plus près ${policeClosestGap.toFixed(1)} m · à ≤ ${POLICE_ENGAGE_RANGE} m ${(policeEngagedFrames / Math.max(1, policeHudFrames) * 100).toFixed(0)} % · retard max ${policeMaxLag.toFixed(0)} m` : 'jamais entrée'}` +
    (introStats ? ` · intro ${introStats.meshes} meshes / ${introStats.triangles} tris` : '') +
    ` · max visibles ${maxVisible} meshes / ${maxTriangles} tris` +
    ` · sons ${AUDIO_METHODS.filter((name) => audioCalls[name]).map((name) => `${name} ${audioCalls[name]}`).join(' / ')}`,
  );
}
console.log(`SMOKE OK — ${cities.length} ville(s), ${CITY_RUSH_LAPS} tours × ${CITY_RUSH_LAP_LENGTH} m`);
process.exit(0);
