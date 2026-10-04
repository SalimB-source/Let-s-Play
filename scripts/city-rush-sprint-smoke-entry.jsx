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

// Sprint : 10 checkpoints, 15 s entre chacun, ni police, ni bonus, ni arme.
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const { CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_SPRINT_DISTANCE } = await import('../src/games/cityRushRules.js');
const fail = (msg, extra) => { console.error('SPRINT SMOKE FAILED:', msg, extra ?? ''); process.exit(1); };

function play(city) {
  const cb = { huds: [], laps: [], effects: [], pickups: [], finish: null };
  const mount = { clientWidth: 1280, clientHeight: 720, getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }), appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {}, ownerDocument: globalThis.document, querySelector: () => null, classList: { add() {}, remove() {} }, style: {} };
  const world = createCityRushWorld(mount, city, () => ({
    hud: (h) => cb.huds.push(h), finish: (r) => { cb.finish = r; }, pickup: (p) => cb.pickups.push(p),
    effect: (e) => cb.effects.push(e), lap: (l) => cb.laps.push(l),
  }), CITY_RUSH_CARS[0].id, null, null, 1, false, 'sprint');
  const step = () => { virtualNow += 1000 / 30; const q = rafQueue; rafQueue = new Map(); q.forEach((f) => f(virtualNow)); };
  world.reset(); world.setPhase('playing'); world.start();
  let frames = 0;
  while (!cb.finish && frames < 30 * 240) {
    step(); frames += 1;
    if (frames % 45 === 0) world.action('pistol'); // l'arme ne doit rien faire en Sprint
  }
  world.destroy();
  return { cb, frames };
}

for (const city of CITY_RUSH_CITIES) {
  const { cb, frames } = play(city);
  if (!cb.finish) fail(`[${city.id}] pas d'arrivée`);
  const r = cb.finish;
  if (!r.sprint) fail('résultat non sprint', r);
  if (cb.pickups.length) fail('bonus ramassé en Sprint', cb.pickups.length);
  const bad = cb.effects.filter((e) => /police|pistol|radio|missile|player-health|rival-boost/.test(e.type));
  if (bad.length) fail('effet police/arme/bonus en Sprint', bad.map((e) => e.type));
  if (cb.huds.some((h) => h.police.length)) fail('police dans le HUD');
  if (r.racers.length !== 1 || !r.racers[0].isPlayer) fail('Sprint pas en solo', r.racers.map((x) => x.id));
  if (cb.huds.some((h) => h.racers.length !== 1)) fail('rival dans le HUD');
  if (r.timedOut) fail('chrono écoulé alors que le pilote roule plein gaz', r);
  {
    const cps = cb.laps.filter((l) => l.sprint).map((l) => l.checkpoint);
    if (cps.join(',') !== '1,2,3,4,5,6,7,8,9') fail('checkpoints annoncés', cps);
    if (r.distance < CITY_RUSH_SPRINT_DISTANCE - 1) fail('arrivée trop tôt', r);
  }
  const maxLeft = Math.max(...cb.huds.map((h) => h.sprint.timeLeft));
  if (maxLeft > 15.001) fail('chrono > 15 s', maxLeft);
  console.log(`[${city.id}] OK — ${(frames / 30).toFixed(1)} s · solo · rang ${r.rank} · ${r.checkpoints} checkpoints · ${r.timedOut ? 'TEMPS ÉCOULÉ' : 'arrivée'} · ${r.distance} m`);
}
console.log('SPRINT SMOKE OK');
