// Smoke : exécute makeWorld (vrai code) avec un faux WebGLRenderer,
// pompe la boucle animate, et rapporte la 1re frame (« ready »).
const ctx2d = () => {
  const g = { addColorStop() {} };
  return {
    canvas: { width: 512, height: 512 },
    fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1,
    font: '', textAlign: '', textBaseline: '', filter: '', shadowBlur: 0, shadowColor: '',
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, fillRect() {}, clearRect() {}, fillText() {}, strokeText() {},
    drawImage() {}, clip() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    arcTo() {}, resetTransform() {}, transform() {}, setTransform() {}, putImageData() {},
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
  addEventListener(t, f) { (listeners.window[t] ||= []).push(f); },
  removeEventListener() {},
  location: { href: 'http://localhost/', origin: 'http://localhost' },
};
const makeImg = () => {
  const img = { width: 0, height: 0, naturalWidth: 0, naturalHeight: 0, onload: null, onerror: null };
  let fired = false;
  Object.defineProperty(img, 'src', {
    set() { if (!fired) { fired = true; setTimeout(() => img.onload?.(), 0); } },
    get() { return 'file://stub.png'; },
  });
  img.addEventListener = (t, cb) => { if (t === 'load') img.onload = cb; if (t === 'error') img.onerror = cb; };
  img.removeEventListener = () => {};
  return img;
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {} }),
  createElementNS: (_ns, tag) => (tag === 'img' ? makeImg() : globalThis.document.createElement(tag)),
  addEventListener(t, f) { (listeners.document[t] ||= []).push(f); },
  removeEventListener() {},
  exitPointerLock() {},
  pointerLockElement: null,
  visibilityState: 'visible',
  body: { appendChild() {}, style: {} },
};
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.self = globalThis;

globalThis.URL.createObjectURL = () => 'blob:la-cendre-stub';
globalThis.URL.revokeObjectURL = () => {};

// fetch('file://…') → fs (préchargement GLB en environnement Node).
const realFetch = globalThis.fetch?.bind(globalThis);
globalThis.fetch = async (url) => {
  if (typeof url === 'string' && url.startsWith('file://')) {
    const fs = await import('node:fs/promises');
    try {
      const data = await fs.readFile(new URL(url));
      return {
        ok: true, status: 200,
        arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      };
    } catch {
      return { ok: false, status: 404 };
    }
  }
  return realFetch(url);
};

// rAF piloté manuellement : on pompe des frames à 60 Hz.
let rafQueue = new Map();
let rafId = 1;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };

// ── Préchargement des assets CC0 + contrôle d'intégrité ─────────────
const THREE = await import('three');
const { preloadGameAssets, getGameAssets } = await import('../src/games/soulsAssets.js');
const assets = await preloadGameAssets('file:///home/user/Let-s-Play/public/');
const assetKeys = Object.keys(assets);
console.log('assets chargés:', assetKeys.join(', '));
if (assetKeys.length !== 5) { console.error('PRÉCHARGEMENT INCOMPLET'); process.exit(3); }
for (const [key, model] of Object.entries(assets)) {
  if (!model) { console.error('ASSET NULL:', key); process.exit(3); }
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (!(size.x > 0.05 && size.y > 0.05 && size.z > 0.05)) {
    console.error('BBOX INVALIDE:', key, size);
    process.exit(3);
  }
  let meshes = 0;
  model.traverse((o) => { if (o.isMesh) meshes++; });
  if (!meshes) { console.error('SANS MESH:', key); process.exit(3); }
  console.log(`  ${key}: ${meshes} mesh(es), bbox ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}`);
}

const { makeWorld } = await import('../src/games/SoulsWorld.jsx');

let readyFired = false;
let readyErr = null;
const hudSamples = [];
const mount = {
  clientWidth: 1280, clientHeight: 720,
  getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
  appendChild() {},
  removeChild() {},
  addEventListener() {}, removeEventListener() {},
  ownerDocument: globalThis.document,
  querySelector: () => null,
  classList: { add() {}, remove() {} },
};

let world;
try {
  world = makeWorld(mount, {
    ready() { readyFired = true; },
    hud(h) { hudSamples.push(h); },
    error(e) { readyErr = e; console.error('CALLBACK ERROR:', e); },
    pause() {},
    resume() {},
  });
} catch (e) {
  console.error('MAKEWORLD THREW:', e);
  process.exit(1);
}
console.log('makeWorld OK — API:', Object.keys(world).join(','));

// 240 frames ≈ 4 s de jeu (idle : respiration, clignement, flicker, brumes, post).
let frame = 0;
let t = 0;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  t += 16.7;
  for (const cb of q) cb(t);
};
try {
  for (frame = 0; frame < 240; frame++) stepFrame();
} catch (e) {
  console.error(`FRAME ${frame} THREW:`);
  console.error(e);
  process.exit(1);
}
console.log('240 frames OK — ready =', readyFired, '| hud samples =', hudSamples.length);

// API + M1 : start → file d'actions clavier → stamina/HUD vérifiés.
const fire = (type, code) => {
  const ev = { code, repeat: false, preventDefault() {}, button: 0, clientX: 0, clientY: 0 };
  for (const fn of listeners.window[type] || []) fn(ev);
  for (const fn of listeners.document[type] || []) fn(ev);
};
try {
  world.start();
  fire('keydown', 'KeyJ');              // attaque légère
  for (let i = 0; i < 60; i++) stepFrame();
  fire('keydown', 'KeyK');              // attaque lourde
  for (let i = 0; i < 35; i++) stepFrame();
  fire('keydown', 'Space');             // esquive en fin de récupération (annulation)
  for (let i = 0; i < 40; i++) stepFrame();
  fire('keydown', 'Tab');               // lock-on (hors portée ici : cible null)
  for (let i = 0; i < 10; i++) stepFrame();

  const withVitals = hudSamples.filter((h) => typeof h.hp === 'number');
  if (!withVitals.length) {
    console.error('HUD COMBAT ABSENT —', JSON.stringify(hudSamples.at(-1)));
    process.exit(3);
  }
  const h0 = withVitals[0];
  for (const field of ['hp', 'maxHp', 'stamina', 'maxStamina', 'lockOn', 'targetHp', 'targetMaxHp', 'action', 'souls', 'flask', 'maxFlask', 'level', 'prompt', 'toast']) {
    if (!(field in h0)) { console.error('HUD CHAMP MANQUANT:', field, h0); process.exit(3); }
  }
  const minStamina = Math.min(...withVitals.map((h) => h.stamina));
  const actions = [...new Set(withVitals.map((h) => h.action))];
  if (minStamina >= 100) {
    console.error('STAMINA JAMAIS DÉPENSÉE —', JSON.stringify(withVitals.at(-1)));
    process.exit(3);
  }
  const last = withVitals[withVitals.length - 1];
  if (last.maxHp !== 100 || last.maxStamina !== 100 || last.targetMaxHp !== 130) {
    console.error('HUD VALEURS INATTENDUES —', last);
    process.exit(3);
  }
  if (last.souls !== 0 || last.flask !== 3 || last.level !== 0) {
    console.error('BOUCLE SOULS HORS DE FAIT À L’OUVERTURE —', last);
    process.exit(3);
  }
  console.log('HUD combat OK — stamina min', minStamina, '| actions', actions.join('/'),
    '| hp', last.hp, '| cible', last.targetHp);

  world.pause();
  for (let i = 0; i < 30; i++) stepFrame();
  world.destroy();
  console.log('start/pause/destroy OK');
} catch (e) {
  console.error('API THREW:');
  console.error(e);
  process.exit(1);
}

if (!readyFired) { console.error('READY JAMAIS AFFICHÉ (1re frame incomplète)'); process.exit(2); }
console.log('SMOKE OK');
process.exit(0);
