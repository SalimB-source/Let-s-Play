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
const { DRINK, BOSS, moveSpeedMult } = await import('../src/games/soulsCombat.js');
const { PROGRESS } = await import('../src/games/soulsProgress.js');
const { STAGE, stageHeight } = await import('../src/games/soulsStage.js');
const { HALL_FLOOR_T } = await import('../src/games/soulsCastle.js');
const fail = (msg, extra) => { console.error(msg, extra ?? ''); process.exit(3); };

let readyFired = false;
let readyErr = null;
let deathInfo = null;
let reviveFired = 0;
let reviveHud = null;
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
    death(info) { deathInfo = info; },
    revive() { reviveFired++; },
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

// Décor : la passe d’allègement conserve les repères de niveau, mais limite
// les surcouches qui masquaient le chemin. Les brumes et fleurs doivent être
// réellement posées au sol ; les bordures du chemin ne peuvent plus traverser
// les dalles principales (source de scintillement en mouvement).
try {
  const scene = world.debug.scene;
  const mist = scene.getObjectByName('ground-mist-patches');
  const grass = scene.getObjectByName('camp-grass-clumps');
  const flowers = scene.getObjectByName('grounded-night-flowers');
  const forestFloor = scene.getObjectByName('sparse-forest-floor');
  const campEmbers = scene.getObjectByName('camp-embers');
  const levelEmbers = scene.getObjectByName('level-embers');
  const road = scene.getObjectByName('main-road-path');
  if (!mist || mist.children.length !== 6 || mist.children.some((o) => Math.abs(o.position.y - 0.28) > 1e-6)) {
    fail('BRUME DE CARTE MAL POSÉE', mist?.children.map((o) => o.position.y));
  }
  if (!grass || grass.count > 280 || !flowers || flowers.count > 14) {
    fail('VÉGÉTATION DE CARTE TROP DENSE', `${grass?.count ?? 'absent'} herbes / ${flowers?.count ?? 'absent'} fleurs`);
  }
  const instancedPosition = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  flowers.geometry.computeBoundingBox();
  if (flowers.geometry.boundingBox.min.y < -1e-6) fail('FLEURS SOUS LE SOL');
  for (let i = 0; i < flowers.count; i++) {
    flowers.getMatrixAt(i, matrix);
    instancedPosition.setFromMatrixPosition(matrix);
    if (instancedPosition.y < 0 || instancedPosition.y > 0.012) {
      fail('FLEUR FLOTTANTE', instancedPosition.y.toFixed(3));
    }
  }
  if (!forestFloor || forestFloor.children.length > 48) {
    fail('SOUS-BOIS TROP DENSE', forestFloor?.children.length);
  }
  if (campEmbers?.geometry?.attributes?.position?.count !== 52
    || levelEmbers?.geometry?.attributes?.position?.count !== 54) {
    fail('BRAISES DE CARTE TROP DENSES');
  }
  if (!road) fail('CHEMIN PRINCIPAL ABSENT');
  const slabs = road.children.filter((o) => o.isMesh);
  const base = slabs.filter((o) => Math.abs(o.position.y - 0.052) < 1e-5);
  const rims = slabs.filter((o) => Math.abs(o.position.y - 0.116) < 1e-5);
  const bounds = (mesh) => {
    mesh.geometry.computeBoundingBox();
    return {
      bottom: mesh.position.y + mesh.geometry.boundingBox.min.y,
      top: mesh.position.y + mesh.geometry.boundingBox.max.y,
    };
  };
  if (!base.length || !rims.length || Math.min(...rims.map(bounds).map((b) => b.bottom)) <= Math.max(...base.map(bounds).map((b) => b.top))) {
    fail('BORDURES DE CHEMIN COPLANAIRES');
  }
  console.log(`Décor allégé OK — ${mist.children.length} brumes, ${grass.count} herbes, ${flowers.count} fleurs, ${forestFloor.children.length} sous-bois.`);
} catch (e) {
  if (/BRUME DE CARTE|VÉGÉTATION DE CARTE|FLEURS SOUS LE SOL|FLEUR FLOTTANTE|SOUS-BOIS TROP DENSE|BRAISES DE CARTE|CHEMIN PRINCIPAL|BORDURES DE CHEMIN/.test(e?.message || '')) throw e;
  console.error('DÉCOR ALLÉGÉ FAILED:', e);
  process.exit(3);
}

// Garde de l’épée : les deux vraies paumes rejoignent deux points de la
// même poignée. La garde doit être centrale, levée et devant le thorax : ce
// contrôle prévient le retour d'une arme latérale ou d'une fausse main.
try {
  const p = world.debug.warrior.userData.parts;
  if (!p.weaponMount || !p.rightGrip || !p.offhandGrip) {
    fail('GARDE À DEUX MAINS ABSENTE — pivot central ou poignées manquants');
  }
  if (p.weapon.name !== 'two-handed-chitin-sword'
    || !p.weapon.getObjectByName('two-handed-sword-blade')
    || !p.weapon.getObjectByName('two-handed-sword-long-hilt')) {
    fail('ÉPÉE À DEUX MAINS ABSENTE — lame droite ou poignée longue manquante');
  }
  if (!p.weapon.getObjectByName('sword-rune-channel')
    || !p.weapon.getObjectByName('sword-guard-filigree')
    || !p.torso.getObjectByName('guardian-cuirass')
    || !p.torso.getObjectByName('dorsal-chitin-carapace')
    || !p.runeGlow?.userData?.baseEmissiveIntensity) {
    fail('HABILLAGE ANIME INCOMPLET — rune, garde ou cuirasse manquante');
  }
  if (p.weapon.parent !== p.weaponMount) {
    fail('ÉPÉE HORS DU PIVOT CENTRAL — l’arme ne doit pas être attachée à un coude');
  }
  world.debug.warrior.updateMatrixWorld(true);
  const palmLocal = new THREE.Vector3(0, -0.3, 0);
  const rightPalm = p.elbowR.localToWorld(palmLocal.clone());
  const leftPalm = p.elbowL.localToWorld(palmLocal.clone());
  const rightGrip = new THREE.Vector3();
  const leftGrip = new THREE.Vector3();
  p.rightGrip.getWorldPosition(rightGrip);
  p.offhandGrip.getWorldPosition(leftGrip);
  const rightGap = rightPalm.distanceTo(rightGrip);
  const leftGap = leftPalm.distanceTo(leftGrip);
  if (rightGap > 0.026 || leftGap > 0.026) {
    fail('PRISE À DEUX MAINS DÉCALÉE', `droite = ${rightGap.toFixed(3)} m, gauche = ${leftGap.toFixed(3)} m`);
  }

  const mountWorld = new THREE.Vector3();
  p.weaponMount.getWorldPosition(mountWorld);
  const mountInTorso = p.torso.worldToLocal(mountWorld.clone());
  if (Math.abs(mountInTorso.x) > 0.09 || mountInTorso.z > -0.17 || mountInTorso.y < 0.22) {
    fail('ÉPÉE NON CENTRALE OU NON FRONTALE', `pivot thorax = ${mountInTorso.toArray().map((v) => v.toFixed(3)).join(', ')}`);
  }

  const elbowL = p.torso.worldToLocal(p.elbowL.getWorldPosition(new THREE.Vector3()));
  const elbowR = p.torso.worldToLocal(p.elbowR.getWorldPosition(new THREE.Vector3()));
  // −Z est la face du personnage. Les coudes doivent sortir à l'avant et sur
  // les côtés, afin qu'aucun bras ne reparte derrière le dos ou les ailes.
  if (elbowL.z >= -0.025 || elbowR.z >= -0.025 || elbowL.x > -0.12 || elbowR.x < 0.12) {
    fail('COUDES HORS DE LA GARDE FRONTALE', `gauche = ${elbowL.toArray().map((v) => v.toFixed(3)).join(', ')}, droite = ${elbowR.toArray().map((v) => v.toFixed(3)).join(', ')}`);
  }
  if (leftPalm.x >= 0 || rightPalm.x <= 0) {
    fail('BRAS CROISÉS DEVANT L’ÉPÉE', `paume gauche x = ${leftPalm.x.toFixed(3)}, droite x = ${rightPalm.x.toFixed(3)}`);
  }

  const weaponBox = new THREE.Box3().setFromObject(p.weapon);
  const highestPalm = Math.max(leftPalm.y, rightPalm.y);
  if (weaponBox.max.y < highestPalm + 0.34) {
    fail('LAME NON LEVÉE', `sommet lame = ${weaponBox.max.y.toFixed(3)}, paume haute = ${highestPalm.toFixed(3)}`);
  }
  console.log('Garde à deux mains OK — paumes', `${rightGap.toFixed(3)} / ${leftGap.toFixed(3)} m`,
    '| coudes frontaux', `${elbowL.z.toFixed(3)} / ${elbowR.z.toFixed(3)}`, '| lame levée.');
} catch (e) {
  if (/GARDE À DEUX MAINS|ÉPÉE|HABILLAGE|PRISE À DEUX MAINS|COUDES|BRAS CROISÉS|LAME NON LEVÉE/.test(e?.message || '')) throw e;
  console.error('GARDE À DEUX MAINS FAILED:', e);
  process.exit(3);
}

// API + M1 : start → file d'actions clavier → stamina/HUD vérifiés.
const fire = (type, code) => {
  const ev = { code, repeat: false, preventDefault() {}, button: 0, clientX: 0, clientY: 0 };
  for (const fn of listeners.window[type] || []) fn(ev);
  for (const fn of listeners.document[type] || []) fn(ev);
};
const assertAnimatedTwoHandGrip = (label) => {
  const p = world.debug.warrior.userData.parts;
  world.debug.warrior.updateMatrixWorld(true);
  const palmCenter = new THREE.Vector3(0, -0.3, 0);
  const rightPalm = p.elbowR.localToWorld(palmCenter.clone());
  const leftPalm = p.elbowL.localToWorld(palmCenter.clone());
  const rightGrip = p.rightGrip.getWorldPosition(new THREE.Vector3());
  const leftGrip = p.offhandGrip.getWorldPosition(new THREE.Vector3());
  const rightGap = rightPalm.distanceTo(rightGrip);
  const leftGap = leftPalm.distanceTo(leftGrip);
  if (p.weapon.parent !== p.weaponMount || rightGap > 0.028 || leftGap > 0.028) {
    fail('PRISE À DEUX MAINS PERDUE EN ANIMATION', `${label} : droite = ${rightGap.toFixed(3)} m, gauche = ${leftGap.toFixed(3)} m`);
  }
};
const swordDiagonalPose = () => {
  const p = world.debug.warrior.userData.parts;
  world.debug.warrior.updateMatrixWorld(true);
  const blade = p.weapon.getObjectByName('two-handed-sword-blade');
  const bladeBox = new THREE.Box3().setFromObject(blade);
  let frontZ = Infinity;
  for (const x of [bladeBox.min.x, bladeBox.max.x]) {
    for (const y of [bladeBox.min.y, bladeBox.max.y]) {
      for (const z of [bladeBox.min.z, bladeBox.max.z]) {
        frontZ = Math.min(frontZ, p.torso.worldToLocal(new THREE.Vector3(x, y, z)).z);
      }
    }
  }
  return {
    x: p.weaponMount.position.x, y: p.weaponMount.position.y,
    z: p.weaponMount.position.z, roll: p.weapon.rotation.z, pitch: p.weapon.rotation.x,
    tipZ: frontZ,
  };
};
const assertForwardStart = (rest, windup, label) => {
  // −Z est l'avant du Gardien : la charge doit projeter l'épée vers la cible.
  if (windup.z > rest.z - 0.085) {
    fail('DÉPART D’ÉPÉE PAS ASSEZ FRONTAL', `${label} : repos z = ${rest.z.toFixed(3)}, charge z = ${windup.z.toFixed(3)}`);
  }
};
const assertForwardThrust = (rest, strike, label) => {
  // À l'impact, le pivot et la pointe doivent partir vers l'ennemi plutôt que
  // simplement retomber en diagonale près du torse.
  if (strike.z > rest.z - 0.16 || strike.pitch > -0.68 || strike.tipZ > rest.tipZ - 0.32) {
    fail('ESTOC PAS ASSEZ FRONTALE', `${label} : pivot ${rest.z.toFixed(3)} → ${strike.z.toFixed(3)}, pointe ${rest.tipZ.toFixed(3)} → ${strike.tipZ.toFixed(3)}, inclinaison = ${strike.pitch.toFixed(3)}`);
  }
};
const assertWideDiagonal = (windup, strike) => {
  // Vue arrière par défaut : droite-haute → gauche-basse. Ce seuil protège
  // un vrai trait en diagonale, pas un petit balancement de quelques degrés.
  if (strike.x > windup.x - 0.22 || strike.y > windup.y - 0.30 || strike.roll < windup.roll + 1.15) {
    fail('ATTAQUE DIAGONALE TROP COURTE', `charge = ${JSON.stringify(windup)}, frappe = ${JSON.stringify(strike)}`);
  }
};
try {
  world.start();
  const home = { x: world.debug.state.x, z: world.debug.state.z };
  const swordRest = swordDiagonalPose();
  fire('keydown', 'KeyJ');              // attaque légère
  for (let i = 0; i < 8; i++) stepFrame();
  const lightWindup = swordDiagonalPose();
  assertForwardStart(swordRest, lightWindup, 'attaque légère');
  assertAnimatedTwoHandGrip('charge légère');
  for (let i = 8; i < 16; i++) stepFrame();
  const lightStrike = swordDiagonalPose();
  assertAnimatedTwoHandGrip('frappe légère');
  assertForwardThrust(swordRest, lightStrike, 'attaque légère');
  assertWideDiagonal(lightWindup, lightStrike);
  for (let i = 16; i < 60; i++) stepFrame();
  fire('keydown', 'KeyK');              // attaque lourde
  for (let i = 0; i < 22; i++) stepFrame();
  const heavyWindup = swordDiagonalPose();
  assertForwardStart(swordRest, heavyWindup, 'attaque lourde');
  assertAnimatedTwoHandGrip('charge lourde');
  for (let i = 22; i < 36; i++) stepFrame();
  const heavyStrike = swordDiagonalPose();
  assertAnimatedTwoHandGrip('frappe lourde');
  assertForwardThrust(swordRest, heavyStrike, 'attaque lourde');
  assertWideDiagonal(heavyWindup, heavyStrike);
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

  // ── DUMP SCÈNE (SOULS_DUMP=1) : inventaire complet des meshes ──────
  if (process.env.SOULS_DUMP) {
    const scene = world.debug.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const out = [];
    scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      const b = box.setFromObject(o);
      const sz = b.getSize(new THREE.Vector3());
      const m = o.material;
      const lum = m?.color ? (0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b) : -1;
      out.push({
        name: o.name || '(sans nom)', geo: o.geometry?.type || o.type,
        w: +sz.x.toFixed(2), h: +sz.y.toFixed(2), d: +sz.z.toFixed(2),
        y: +b.min.y.toFixed(2), cy: +((b.min.y + b.max.y) / 2).toFixed(2),
        x: +((b.min.x + b.max.x) / 2).toFixed(2), cz: +((b.min.z + b.max.z) / 2).toFixed(2),
        color: m?.color ? '#' + m.color.getHexString() : '-', lum: +lum.toFixed(3),
        map: m?.map ? 1 : 0, blend: m?.blending, op: m?.opacity, side: m?.side,
        transp: m?.transparent ? 1 : 0, vis: o.visible ? 1 : 0,
        type: m?.type || '-', depthWrite: m?.depthWrite,
      });
    });
    const vol = (r) => Math.max(r.w, 0.05) * Math.max(r.h, 0.05) * Math.max(r.d, 0.05);
    const big = out.filter((r) => r.lum >= 0 && r.lum < 0.13 && vol(r) > 1 && r.type !== 'PointsMaterial');
    console.log(`\n### SCÈNE : ${out.length} objets, ${big.length} objets SOMBRES > 1 m³`);
    const agg = {};
    for (const r of big) {
      const k = `${r.color}|${r.type.replace('Mesh', '')}|${r.geo}|${r.w}x${r.h}x${r.d}`;
      (agg[k] ||= []).push(r);
    }
    for (const [k, v] of Object.entries(agg).sort((a, b) => b[1].length - a[1].length).slice(0, 16)) {
      const z = [...new Set(v.map((r) => r.cz))].sort((a, b) => a - b);
      console.log(`  ${String(v.length).padStart(4)}× lum=${v[0].lum.toFixed(3)} ${k}  z=[${z.slice(0, 3).join(',')}…${z.slice(-1)}]`);
    }
    console.log('--- colonnes de la nef vs murs ---');
    for (const r of out.filter((o) => o.geo === 'LatheGeometry' && o.h > 8)) {
      console.log(`  COLONNE lum=${r.lum.toFixed(3)} ${r.color} map=${r.map} ${r.w}×${r.h} @(${r.x},${r.cz})`);
    }
    for (const r of out.filter((o) => o.h > 9 && (o.d > 20 || o.w > 20))) {
      console.log(`  MUR     lum=${r.lum.toFixed(3)} ${r.color} map=${r.map} ${r.w}×${r.h}×${r.d} @(${r.x},${r.cz})`);
    }
    console.log('---');
    for (const r of big.sort((a, b) => a.lum - b.lum)) {
      console.log(`  ${r.lum.toFixed(3)} ${r.color} ${r.type.replace('Mesh', '').padEnd(10)} ${String(r.w).padStart(7)}×${String(r.h).padStart(6)}×${String(r.d).padStart(7)} @(${r.x},${r.cy},${r.cz}) map=${r.map} blend=${r.blend} op=${r.op} side=${r.side} dw=${r.depthWrite} vis=${r.vis} ${r.geo} ${r.name}`);
    }
    const lights = [];
    scene.traverse((o) => { if (o.isLight) lights.push(o); });
    console.log(`\n### LUMIÈRES : ${lights.length}`);
    for (const l of lights) {
      console.log(`  ${l.type} ${'#' + l.color.getHexString()} i=${l.intensity} dist=${l.distance ?? '-'} decay=${l.decay ?? '-'} @(${l.position.x.toFixed(1)},${l.position.y.toFixed(1)},${l.position.z.toFixed(1)}) shadow=${!!l.shadow && l.castShadow}`);
    }
    process.exit(0);
  }

  // ── Le Roi : assis sur son trône, jamais sous le plancher ───────────
  {
    const foe = world.debug.foes.find((f) => f.e.spec.seated);
    if (!foe) fail('BOSS INTROUVABLE dans la scène');
    const estrade = stageHeight(foe.spawn.x, foe.spawn.z);
    // Sol de la nef hors estrade, et dessous du dallage (épais de
    // HALL_FLOOR_T) : sous cette ligne, la géométrie se voit depuis la salle.
    const nefFloor = stageHeight(foe.spawn.x, STAGE.hall.maxZ - 1);
    const slabBottom = nefFloor - HALL_FLOOR_T;
    const box = new THREE.Box3();
    let swordLowest = Infinity;
    let bodyLowest = Infinity;

    // 1. Tableau du trône : assis, RIEN (corps ni lame) ne traverse l'estrade.
    for (let i = 0; i < 60; i++) {
      stepFrame();
      if (foe.e.phase !== 'seated') fail('LE ROI N’EST PAS ASSIS À L’OUVERTURE', foe.e.phase);
      foe.K.updateMatrixWorld(true);
      const all = box.setFromObject(foe.K);
      swordLowest = Math.min(swordLowest, all.min.y);
      if (all.min.y < estrade - 0.05) {
        fail('ROI ENFONCÉ DANS SON TRÔNE', `min=${all.min.y.toFixed(3)} estrade=${estrade.toFixed(3)}`);
      }
    }

    // 2. Lever + chasse : la racine reste sur le sol, la caméra jamais en
    //    dessous, et le corps ne s'enfonce pas d'un mètre (bug TORSO_Y).
    world.debug.teleport(foe.spawn.x, foe.spawn.z + BOSS.riseRange - 1);
    const lowestButWeapon = () => {
      const wpn = foe.K.userData.parts.weapon;
      foe.K.updateMatrixWorld(true); // pose de la frame, pas celle du render
      let m = Infinity;
      foe.K.traverse((o) => {
        if (!o.isMesh) return;
        for (let n = o.parent; n && n !== foe.K; n = n.parent) if (n === wpn) return;
        m = Math.min(m, box.setFromObject(o).min.y);
      });
      return m;
    };
    for (let i = 0; i < 700; i++) {
      world.debug.combat.hp = world.debug.combat.maxHp; // le duel ne tue pas le test
      stepFrame();
      const floor = stageHeight(foe.e.x, foe.e.z);
      if (foe.K.position.y < floor - 0.01) {
        fail('ROI SOUS LE PLANCHER (racine)', `y=${foe.K.position.y.toFixed(3)} sol=${floor.toFixed(3)}`);
      }
      if (world.debug.camera.position.y < nefFloor + 0.05) {
        fail('CAMÉRA SOUS LE PLANCHER', `y=${world.debug.camera.position.y.toFixed(3)} nef=${nefFloor.toFixed(3)}`);
      }
      if (i % 10 === 0) {
        const body = lowestButWeapon();
        bodyLowest = Math.min(bodyLowest, body - slabBottom);
        if (body < slabBottom - 0.25) {
          fail('ROI ENFONCÉ SOUS LE PLANCHER', `min=${body.toFixed(3)} sous-dalle=${slabBottom.toFixed(3)} phase=${foe.e.phase}`);
        }
      }
    }
    if (world.isDead()) fail('MORT PENDANT LE TEST DU TRÔNE');
    if (foe.e.phase === 'seated') fail('LE ROI NE S’EST PAS LEVÉ À L’APPROCHE');
    if (!foe.e.leftThrone) fail('LE ROI N’A PAS QUITTÉ SON TRÔNE');
    if (!Number.isFinite(swordLowest)) fail('AUCUNE FRAME ASSISE CONTRÔLÉE');
    console.log(`Trône OK — assis au-dessus de l'estrade (min ${swordLowest.toFixed(2)} ≥ ${estrade.toFixed(2)}), debout puis en chasse, corps au plus bas à ${bodyLowest.toFixed(2)} m du sous-dallage`);
  }

  // ── Potion de vie : geste long, verrouillé, soin à mi-gorgée ────────
  {
    const c = world.debug.combat;
    const prog = world.debug.progress;
    world.debug.teleport(home.x, home.z);   // loin du Roi : boire tranquille
    c.action = 'none'; c.actionT = 0; c.hitstop = 0; c.drank = false;
    c.staminaLock = 0;
    c.stamina = c.staminaMax;
    c.hp = 40;
    const hpBefore = c.hp;
    const flasksBefore = prog.flask;
    fire('keydown', 'KeyF');
    stepFrame();
    if (c.action !== 'drink') fail('POTION : le geste ne démarre pas', c.action);
    if (!hudSamples.some((h) => h.drinking)) fail('POTION : HUD « drinking » absent');
    if (moveSpeedMult(c) >= 1) fail('POTION : le pas ne ralentit pas pendant la gorgée');
    // Ni attaque ni roulade ne passent pendant le geste.
    fire('keydown', 'KeyJ'); fire('keydown', 'KeyK'); fire('keydown', 'Space');
    for (let i = 0; i < 6; i++) stepFrame();
    if (c.action !== 'drink') fail('POTION : attaque/esquive pendant le geste', c.action);
    if (c.hp !== hpBefore) fail('POTION : soin appliqué trop tôt', c.hp);
    let healed = 0;
    for (let i = 0; i < Math.ceil(DRINK.duration * 60) + 12; i++) {
      const before = c.hp;
      stepFrame();
      if (c.hp > before) healed++;
    }
    if (healed !== 1) fail('POTION : gorgée appliquée ' + healed + ' fois (1 attendue)');
    const sip = c.hp - hpBefore;
    if (c.action !== 'none' || c.drank) fail('POTION : le geste ne se referme pas', c.action);
    if (sip !== PROGRESS.flaskHeal) fail('POTION : soin inattendu', `${sip} PV (attendu ${PROGRESS.flaskHeal})`);
    if (prog.flask !== flasksBefore - 1) fail('POTION : charges non débitées', `${flasksBefore} → ${prog.flask}`);
    // Pleine vitalité : la gorgée est refusée, la charge est gardée.
    c.hp = c.maxHp;
    fire('keydown', 'KeyF');
    stepFrame();
    if (c.action !== 'none') fail('POTION : on boit à pleine vitalité', c.action);
    if (prog.flask !== flasksBefore - 1) fail('POTION : charge gaspillée');
    console.log(`Potion OK — ${DRINK.duration}s verrouillées (attaque + roulade), +${sip} PV, ${prog.flask}/${PROGRESS.flaskMax} gorgées`);
  }

  // ── Mort : écran rouge, monde figé, puis « revenir à la vie » ───────
  {
    const c = world.debug.combat;
    const prog = world.debug.progress;
    c.hp = 0;
    stepFrame();
    if (!deathInfo) fail('MORT : aucun callback « death »');
    if (!world.isDead()) fail('MORT : world.isDead() reste faux');
    const hudDead = hudSamples.at(-1);
    if (hudDead.dead !== true) fail('MORT : HUD « dead » absent', JSON.stringify(hudDead));
    if (hudDead.deathSouls !== deathInfo.souls) fail('MORT : HUD âmes perdues incohérent', hudDead.deathSouls);
    // Le monde est figé : aucune entrée ne passe.
    c.action = 'none';
    fire('keydown', 'KeyJ'); fire('keydown', 'KeyK'); fire('keydown', 'Space'); fire('keydown', 'KeyF');
    for (let i = 0; i < 24; i++) stepFrame();
    if (c.action !== 'none') fail('MORT : le monde réagit encore aux entrées', c.action);
    const stain = prog.bloodstain;
    // « REVENIR À LA VIE » : plein de vie, au dernier feu de camp.
    if (world.revive() !== true) fail('REVIVE : world.revive() refuse');
    stepFrame();
    reviveHud = hudSamples.at(-1);
    if (world.isDead()) fail('REVIVE : toujours mort');
    if (reviveFired !== 1) fail('REVIVE : callback « revive » appelé ' + reviveFired + ' fois');
    if (c.hp !== c.maxHp || c.stamina !== c.staminaMax) fail('REVIVE : vitales non restaurées', `${c.hp}/${c.stamina}`);
    if (!reviveHud || reviveHud.dead !== false) fail('REVIVE : HUD « dead » non refermé');
    if (world.debug.state.hp !== undefined && Number.isNaN(world.debug.state.x)) fail('REVIVE : position invalide');
    console.log(`Mort OK — ${deathInfo.souls} âmes gisent en ${stain ? `${stain.x.toFixed(1)},${stain.z.toFixed(1)}` : '—'}, résurrection au feu`);
  }

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
