// Smoke « Vice City Rush » : exécute createCityRushWorld (vrai code) avec un
// faux WebGLRenderer, pompe la boucle animate à 30 Hz et joue une course
// complète (3 tours × 600 m) pour chaque ville demandée.
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

// Bande-son : le monde ne connaît qu'une ref. On y glisse un compteur — pas
// de Web Audio ici, mais la certitude qu'une course complète déclenche bien
// moteur, feux, tours, tirs et arrivée, et que l'hélicoptère est toujours
// éteint (un rotor qui tourne dans le vide s'entendrait jusqu'à la page
// d'accueil).
const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'oilDrop', 'lap', 'finish', 'countdownBeep', 'passby',
];

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
  while (!callbacks.finish && frames < maxFrames) {
    const hud = callbacks.huds[callbacks.huds.length - 1];
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
    if (playerLaps.join(',') !== '2,3' && playerLaps.join(',') !== '2,3,4') {
      fail('passages de ligne du joueur inattendus (attendu tour 2 puis tour 3)', callbacks.laps);
    }
    const finalLapEffect = callbacks.effects.find((e) => e.type === 'final-lap');
    if (!finalLapEffect) fail('effet final-lap jamais émis', callbacks.effects.map((e) => e.type));
    if (![...lapSeen].includes(3)) fail('le HUD n’a jamais affiché le tour 3', [...lapSeen]);
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
  if (maxDistance < CITY_RUSH_DISTANCE - 1) fail('le vainqueur n’a pas parcouru 1800 m', finish.racers);
  if (maxVisible > 600) fail(`trop de meshes visibles : ${maxVisible}`);
  if (callbacks.pickups.length && !burstNodes.length) fail('aucun objet d’éclatement de bonus dans la scène');
  if (callbacks.pickups.length && !burstFrames) fail('bonus ramassés sans aucun éclatement visible', callbacks.pickups.length);
  if (callbacks.pickups.length && !respawnedPickups) fail('aucun bonus ramassé n’a réapparu après 0,1 s', callbacks.pickups.length);
  const automaticCash = callbacks.pickups.filter((pickup) => pickup.type === 'cash' && pickup.autoActivated).length;
  const automaticOil = callbacks.pickups.filter((pickup) => pickup.type === 'oil' && pickup.autoActivated).length;
  if (callbacks.pickups.some((pickup) => pickup.autoActivated && !CITY_RUSH_POWER_RULES[pickup.type]?.automatic)) {
    fail('un bonus manuel a été signalé comme activation automatique', callbacks.pickups.filter((pickup) => pickup.autoActivated));
  }
  if ((audioCalls.boost || 0) < automaticCash) fail('un boost vert chargé ne s’est pas activé automatiquement', { automaticCash, audioCalls });
  if ((audioCalls.oilDrop || 0) < automaticOil) fail('une jauge huile pleine n’a pas déposé sa flaque automatiquement', { automaticOil, audioCalls });

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
    `[${city.id}] OK — build ${buildMs} ms · course ${raceSeconds.toFixed(1)} s virtuelles / ${frames} frames` +
    ` · tours joueur ${playerLaps.join('→') || '—'} · rang ${finish.rank}` +
    ` · HUD ${callbacks.huds.length} · bonus ${callbacks.pickups.length} (éclatés ${burstFrames} f) · effets ${effectTypes.join('/')}` +
    (introStats ? ` · intro ${introStats.meshes} meshes / ${introStats.triangles} tris` : '') +
    ` · max visibles ${maxVisible} meshes / ${maxTriangles} tris` +
    ` · sons ${AUDIO_METHODS.filter((name) => audioCalls[name]).map((name) => `${name} ${audioCalls[name]}`).join(' / ')}`,
  );
}
console.log(`SMOKE OK — ${cities.length} ville(s), ${CITY_RUSH_LAPS} tours × ${CITY_RUSH_LAP_LENGTH} m`);
process.exit(0);
