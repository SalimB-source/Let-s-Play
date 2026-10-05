// Smoke Sprint « Vice City Rush » : exécute createCityRushWorld (vrai code)
// avec un faux WebGLRenderer, pompe la boucle animate à 30 Hz et joue le défi
// solo complet pour chaque ville : 16 checkpoints de 300 m, soit 4 800 m
// (quatre boucles exactes : l'arrivée retombe sous le portique).
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

// Sprint : 16 portes, 15 s entre checkpoints, boosts verts au sol,
// mais ni police, ni rival, ni arme.
const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES,
  CITY_RUSH_CARS,
  CITY_RUSH_PICKUPS,
  CITY_RUSH_SPRINT_CHECKPOINTS,
  CITY_RUSH_SPRINT_DISTANCE,
  CITY_RUSH_PLAYER_SPEED,
  cityRushSprintCheckpointTime,
} = await import('../src/games/cityRushRules.js');
const fail = (msg, extra) => { console.error('SPRINT SMOKE FAILED:', msg, extra ?? ''); process.exit(1); };

function play(city) {
  const cb = { huds: [], laps: [], effects: [], pickups: [], finish: null };
  const mount = { clientWidth: 1280, clientHeight: 720, getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }), appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {}, ownerDocument: globalThis.document, querySelector: () => null, classList: { add() {}, remove() {} }, style: {} };
  const world = createCityRushWorld(mount, city, () => ({
    hud: (h) => cb.huds.push(h), finish: (r) => { cb.finish = r; }, pickup: (p) => cb.pickups.push(p),
    effect: (e) => cb.effects.push(e), lap: (l) => cb.laps.push(l),
  }), CITY_RUSH_CARS[0].id, null, null, 1, false, 'sprint');
  const checkpointGate = world.scene.getObjectByName('sprint-checkpoint-gate');
  const boostPads = [];
  world.scene.traverse((object) => {
    if (object.userData?.type === CITY_RUSH_PICKUPS.BOOST) boostPads.push(object);
  });
  const checkpointSnapshots = [];
  let screenVisible = false;
  const step = () => { virtualNow += 1000 / 30; const q = rafQueue; rafQueue = new Map(); q.forEach((f) => f(virtualNow)); };
  world.reset(); world.setPhase('playing'); world.start();
  let frames = 0;
  let lastCheckpoint = 0;
  while (!cb.finish && frames < 30 * 360) {
    step(); frames += 1;
    if (frames === 1 && checkpointGate?.userData?.sign) {
      world.scene.updateMatrixWorld(true);
      world.camera.updateMatrixWorld(true);
      const projected = checkpointGate.userData.sign.getWorldPosition(new THREE.Vector3()).project(world.camera);
      screenVisible = checkpointGate.visible
        && projected.z >= -1 && projected.z <= 1
        && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1;
    }
    if (cb.laps.length > lastCheckpoint) {
      checkpointSnapshots.push({ checkpoint: checkpointGate?.userData?.checkpoint, visible: checkpointGate?.visible });
      lastCheckpoint = cb.laps.length;
    }
    if (frames % 45 === 0) world.action('pistol'); // l'arme ne doit rien faire en Sprint
  }
  world.destroy();
  return { cb, frames, checkpointGate, boostPads, checkpointSnapshots, screenVisible };
}

for (const city of CITY_RUSH_CITIES) {
  const { cb, frames, checkpointGate, boostPads, checkpointSnapshots, screenVisible } = play(city);
  if (!cb.finish) fail(`[${city.id}] pas d'arrivée`);
  const r = cb.finish;
  if (!r.sprint) fail('résultat non sprint', r);
  if (!checkpointGate) fail('aucun portique de checkpoint 3D en Sprint');
  if (checkpointGate?.userData?.kind !== 'sprint-checkpoint-gate' || !checkpointGate.userData.sign) {
    fail('portique de checkpoint incomplet', checkpointGate?.userData);
  }
  if (checkpointSnapshots[0]?.checkpoint !== 2 || !checkpointSnapshots[0]?.visible) {
    fail('après le checkpoint 1, le portique 3D doit annoncer le checkpoint 2 (hors portique de départ)', checkpointSnapshots[0]);
  }
  if (!checkpointSnapshots.some((snapshot) => snapshot.checkpoint === 3 && snapshot.visible)) {
    fail('le portique 3D n’avance pas vers le checkpoint suivant hors gantry', checkpointSnapshots);
  }
  // Les checkpoints 4, 8 et 12 tombent pile sous le grand portique (tous les
  // 1 200 m) : le portique 3D dédié s'efface alors devant lui.
  for (const underGantry of [4, 8, 12]) {
    if (!checkpointSnapshots.some((snapshot) => snapshot.checkpoint === underGantry && !snapshot.visible)) {
      fail(`le checkpoint ${underGantry} devrait coïncider avec le grand portique (sans portique 3D dédié)`, checkpointSnapshots);
    }
  }
  if (!screenVisible) fail('le panneau du prochain checkpoint est hors champ caméra au départ');
  if (boostPads.length < 2 || boostPads.some((pad) => !pad.userData.pad.visible)) {
    fail('les pads turbo ne sont pas visibles au sol en Sprint', boostPads.map((pad) => ({ type: pad.userData.type, visible: pad.userData.pad?.visible })));
  }
  if (!cb.pickups.length) fail('aucun pad turbo ramassé en Sprint');
  const nonBoostPickups = cb.pickups.filter((pickup) => pickup.type !== CITY_RUSH_PICKUPS.BOOST);
  if (nonBoostPickups.length) fail('un bonus autre que turbo est ramassable en Sprint', nonBoostPickups);
  if (cb.pickups.some((pickup) => !pickup.autoActivated || pickup.chargeCost !== 1)) {
    fail('un pad turbo du Sprint ne s’active pas automatiquement', cb.pickups);
  }
  // L'annonce de la barre du joueur est attendue en solo ; seul un effet
  // d'arme, de rival ou de police doit invalider le Sprint.
  const bad = cb.effects.filter((e) => /police|pistol|radio|missile|rival-boost/.test(e.type));
  if (bad.length) fail('effet police/arme/rival en Sprint', bad.map((e) => e.type));
  if (cb.huds.some((h) => h.police.length)) fail('police dans le HUD');
  if (r.racers.length !== 1 || !r.racers[0].isPlayer) fail('Sprint pas en solo', r.racers.map((x) => x.id));
  if (cb.huds.some((h) => h.racers.length !== 1)) fail('rival dans le HUD');
  if (r.timedOut) fail('chrono écoulé alors que le pilote roule plein gaz', r);
  {
    const cps = cb.laps.filter((l) => l.sprint).map((l) => l.checkpoint);
    const expectedCheckpoints = Array.from({ length: CITY_RUSH_SPRINT_CHECKPOINTS - 1 }, (_, index) => index + 1);
    if (cps.join(',') !== expectedCheckpoints.join(',')) fail('checkpoints annoncés', cps);
    if (r.distance < CITY_RUSH_SPRINT_DISTANCE - 1) fail('arrivée trop tôt', r);
  }
  // Le chrono du Sprint suit la voiture engagée : on vérifie qu'il vaut bien le
  // bonus calculé pour elle (15 s à la vitesse de référence, 19 s pour la
  // citadine de départ), et qu'il n'est jamais dépassé.
  const expectedBonus = cityRushSprintCheckpointTime(CITY_RUSH_PLAYER_SPEED * CITY_RUSH_CARS[0].powerMultiplier);
  const maxLeft = Math.max(...cb.huds.map((h) => h.sprint.timeLeft));
  if (maxLeft > expectedBonus + 0.001) fail(`chrono > ${expectedBonus} s`, maxLeft);
  if (Math.abs(maxLeft - expectedBonus) > 0.05) fail(`chrono du Sprint inattendu (attendu ${expectedBonus} s)`, maxLeft);
  console.log(`[${city.id}] OK — ${(frames / 30).toFixed(1)} s · solo · rang ${r.rank} · ${r.checkpoints} checkpoints · ${r.timedOut ? 'TEMPS ÉCOULÉ' : 'arrivée'} · ${r.distance} m`);
}
console.log('SPRINT SMOKE OK');
