// Entrée de `scripts/city-rush-cockpit-check.mjs` (`npm run check:city-rush-cockpit`).
// Joue la vue cockpit dans le vrai monde, image par image, avec un faux
// renderer qui sait viser une cible de rendu (le rétroviseur intérieur).
const BASE_SEED = Number(process.env.CITY_RUSH_COCKPIT_SEED || 20261014) >>> 0;
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
  addEventListener() {},
  removeEventListener() {},
  location: { href: 'http://localhost/', origin: 'http://localhost' },
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {} }),
  createElementNS: (_ns, tag) => globalThis.document.createElement(tag),
  addEventListener() {},
  removeEventListener() {},
  body: { appendChild() {}, removeChild() {}, style: {} },
  documentElement: { style: {} },
  hidden: false,
  visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-smoke', maxTouchPoints: 0 }, configurable: true });
globalThis.self = globalThis;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const { CITY_RUSH_COURSES, CITY_RUSH_CARS } = await import('../src/games/cityRushRules.js');
const { cityRushTheme } = await import('../src/games/cityRushThemes.js');
const {
  CITY_RUSH_COCKPIT_FOV,
  CITY_RUSH_COCKPIT_BOOST_FOV,
  CITY_RUSH_COCKPIT_SPEED_FOV,
  cityRushCockpitRightHandDrive,
} = await import('../src/games/cityRushCockpit.js');

const fail = (message, extra) => {
  console.error('ÉCHEC :', message, extra ?? '');
  process.exit(3);
};
const FRAME_MS = 1000 / 30;
const step = (frames = 1) => {
  for (let frame = 0; frame < frames; frame += 1) {
    const queue = [...rafQueue.values()];
    rafQueue.clear();
    virtualNow += FRAME_MS;
    for (const callback of queue) callback(virtualNow);
  }
};

// Parcours éprouvés : conduite à droite (Vice City), à gauche sous la pluie
// (Londres), la bruine de nuit de la Shuto et le tōgé japonais. `--all` joue
// les neuf parcours, chacun avec une voiture différente.
const all = process.argv.includes('--all');
const CASES = all
  ? CITY_RUSH_COURSES.map((course, index) => ({ city: course.id, car: CITY_RUSH_CARS[(index * 5) % CITY_RUSH_CARS.length].id }))
  : [
    { city: 'vice-city', car: 'vice-roadster' },
    { city: 'london', car: 'city-hatch' },
    { city: 'tokyo', car: 'atlas-xr' },
    { city: 'touge', car: 'ae86' },
  ];

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
const audioRef = { current: new Proxy({}, { get: () => () => {} }) };
const summaries = [];

for (const { city: cityId, car: carId } of CASES) {
  const city = CITY_RUSH_COURSES.find((course) => course.id === cityId);
  const profile = CITY_RUSH_CARS.find((car) => car.id === carId);
  const theme = cityRushTheme(city.id);
  const rightHand = cityRushCockpitRightHandDrive(city);
  const label = `[${city.id} · ${profile.name}]`;
  const errors = [];
  const world = createCityRushWorld(mount, city, () => ({
    error: (error) => errors.push(error),
  }), profile.id, audioRef, null, 2);
  const camera = world.camera;
  const playerCar = world.playerCar;
  const { shell, details } = playerCar.userData;
  if (!shell || !details) fail(`${label} la voiture du joueur n'expose pas sa coque`);

  // Journal du rétroviseur : chaque rendu qui vise une cible. Le rendu
  // principal, lui, passe par `ghostWatch` quand un rival est posé sur la
  // voiture du pilote (étape 7 bis).
  const mirrorRenders = [];
  let ghostWatch = null;
  globalThis.__cockpitRenderHook = ({ renderer, camera: renderCamera, target }) => {
    if (!target) {
      if (ghostWatch && renderCamera === camera) ghostWatch();
      return;
    }
    mirrorRenders.push({
      playerVisible: playerCar.visible,
      shadowAutoUpdate: renderer.shadowMap.autoUpdate,
      sameCamera: renderCamera === camera,
    });
  };
  const local = () => playerCar.worldToLocal(camera.position.clone());
  const forwardDot = () => {
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const carForward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerCar.quaternion);
    return look.dot(carForward);
  };

  // 1. Intro : la préférence est posée, mais l'orbite de présentation garde
  //    la voiture vue de l'extérieur.
  world.setCameraMode('cockpit');
  step(3);
  if (world.cameraMode !== 'cockpit') fail(`${label} la préférence cockpit n'est pas retenue`);
  if (world.cockpitActive) fail(`${label} la vue cockpit ne doit pas remplacer l'orbite de présentation`);
  if (!shell.visible) fail(`${label} la coque doit rester visible pendant l'intro`);

  // 2. Compte à rebours : l'œil est à la place du pilote.
  world.setPhase('countdown');
  step(2);
  const cockpit = world.cockpit;
  if (!world.cockpitActive || !cockpit) fail(`${label} le compte à rebours ne passe pas en vue cockpit`);
  if (!cockpit.group.visible || !cockpit.hood.visible) fail(`${label} habitacle ou capot invisible`);
  if (shell.visible || details.visible) fail(`${label} la coque fermée doit s'effacer en vue cockpit`);
  const eye = new THREE.Vector3(...cockpit.layout.eye);
  const eyeGap = local().distanceTo(eye);
  if (eyeGap > 0.08) fail(`${label} la caméra n'est pas à l'œil du pilote`, { local: local().toArray(), eye: eye.toArray() });
  if (Math.sign(local().x) !== (rightHand ? 1 : -1)) fail(`${label} le pilote n'est pas du bon côté`, { x: local().x, rightHand });
  if (forwardDot() < 0.97) fail(`${label} le regard ne suit pas le cap de la voiture`, { dot: forwardDot() });
  if (camera.fov < CITY_RUSH_COCKPIT_FOV - 4.5 || camera.fov > CITY_RUSH_COCKPIT_FOV + 0.5) {
    fail(`${label} champ du compte à rebours hors de la vue cockpit`, { fov: camera.fov });
  }
  step(93);
  world.setPhase('playing');
  world.start();

  // Pluie : les segments du thème, relevés à chaque image de course.
  const rain = [];
  world.scene.traverse((object) => {
    if (object.isLineSegments && object.frustumCulled === false && object.material?.isLineBasicMaterial) rain.push(object);
  });
  const raining = theme.weather === 'rain' || theme.weather === 'drizzle';
  if (raining && !rain.length) fail(`${label} la pluie du thème est introuvable`);
  let rainDrops = 0;
  let rainInCabin = 0;
  const countRain = () => {
    for (const lines of rain) {
      const array = lines.geometry.attributes.position.array;
      for (let index = 0; index < array.length; index += 6) {
        rainDrops += 1;
        const [x, y, z] = [array[index], array[index + 1], array[index + 2]];
        if (y >= 0 && y < 2.2 && Math.hypot(x - playerCar.position.x, z - playerCar.position.z) < 2.2) rainInCabin += 1;
      }
    }
  };

  // 3. Course : la caméra reste soudée à la caisse, regard devant, et aucune
  //    goutte ne traverse l'habitacle.
  let maxEyeGap = 0;
  let minForward = 1;
  let maxFov = 0;
  for (let frame = 0; frame < 90; frame += 1) {
    step(1);
    maxEyeGap = Math.max(maxEyeGap, local().distanceTo(eye));
    minForward = Math.min(minForward, forwardDot());
    maxFov = Math.max(maxFov, camera.fov);
    countRain();
  }
  if (rainInCabin) fail(`${label} ${rainInCabin} goutte(s) traversent l'habitacle`);
  if (maxEyeGap > 0.16) fail(`${label} la caméra quitte l'habitacle en course`, { maxEyeGap });
  if (minForward < 0.9) fail(`${label} la tête tourne trop loin du cap`, { minForward });
  if (maxFov > CITY_RUSH_COCKPIT_FOV + CITY_RUSH_COCKPIT_BOOST_FOV + CITY_RUSH_COCKPIT_SPEED_FOV + 0.5) {
    fail(`${label} champ de course trop large`, { maxFov });
  }

  // 4. Volant : un écart à droite le tourne dans le sens horaire (rotation z
  //    négative, vue du pilote), un écart à gauche dans l'autre sens.
  world.action('right');
  step(4);
  const rightTurn = cockpit.steering.rotation.z;
  step(30);
  world.action('left');
  step(4);
  const leftTurn = cockpit.steering.rotation.z;
  if (!(rightTurn < -0.3)) fail(`${label} le volant ne braque pas à droite`, { rightTurn });
  if (!(leftTurn > 0.3)) fail(`${label} le volant ne braque pas à gauche`, { leftTurn });
  step(30);

  // 5. Rétroviseur : rendu sur sa cible, voiture du joueur masquée, ombres
  //    figées pendant le passage puis rendues à la scène.
  if (!mirrorRenders.length) fail(`${label} le rétroviseur intérieur n'est jamais rendu`);
  if (mirrorRenders.some((render) => render.playerVisible)) fail(`${label} la voiture du joueur apparaît dans son propre rétroviseur`);
  if (mirrorRenders.some((render) => render.shadowAutoUpdate)) fail(`${label} le rétroviseur recalcule les ombres`);
  if (mirrorRenders.some((render) => render.sameCamera)) fail(`${label} le rétroviseur doit avoir sa propre caméra`);
  if (!playerCar.visible) fail(`${label} la voiture reste masquée après le rétroviseur`);
  if (!cockpit.mirror.material.map?.isTexture || cockpit.mirror.material.map === cockpit.mirror.fallback) {
    fail(`${label} le miroir n'affiche pas l'image de la route`);
  }
  const mirrorRatio = mirrorRenders.length / 255;
  if (mirrorRatio > 0.6) fail(`${label} le rétroviseur doit se rendre une image sur deux`, { renders: mirrorRenders.length });

  // 6. Retour en poursuite : cut net derrière la voiture, coque rendue.
  world.setCameraMode('chase');
  step(1);
  if (world.cockpitActive || cockpit.group.visible || cockpit.hood.visible) fail(`${label} l'habitacle reste affiché en poursuite`);
  if (!shell.visible || !details.visible) fail(`${label} la coque ne revient pas en poursuite`);
  const chaseLocal = local();
  if (!(chaseLocal.z > 6 && chaseLocal.y > 3)) fail(`${label} la poursuite ne repart pas derrière la voiture`, { chase: chaseLocal.toArray() });
  if (camera.fov > 55) fail(`${label} le champ de la poursuite n'est pas revenu`, { fov: camera.fov });

  // 7. Et retour au volant, en pleine course.
  world.setCameraMode('cockpit');
  step(1);
  if (!world.cockpitActive || local().distanceTo(eye) > 0.16) fail(`${label} la vue cockpit ne revient pas en course`);

  // 7 bis. Rival fantôme : les rivaux se traversent. Posé sur la voiture du
  //    pilote, un rival englobe l'œil (c'était le grand pan noir du départ,
  //    quand la grille s'élance) : le rendu principal doit l'effacer, puis le
  //    rendre dès qu'il s'écarte.
  const rival = world.harnessRacers.find((racer) => racer.mesh?.userData.shell && racer.raceActive !== false && !racer.wrecked);
  if (!rival) fail(`${label} aucun rival à poser sur la voiture du pilote`);
  const rivalShell = rival.mesh.userData.shell;
  const shellBox = new THREE.Box3();
  const shownChain = (object) => {
    for (let node = object; node; node = node.parent) if (!node.visible) return false;
    return true;
  };
  let engulfed = 0;
  let shownEngulfed = 0;
  // L'œil « dans » le rival : dans sa coque, ou à moins de 30 cm de ses faces
  // — un pavillon à ras de l'objectif remplit tout autant l'image, et l'œil
  // d'un SUV passe juste au-dessus du toit d'un coupé bas. Le test se fait
  // dans le repère de la coque : une caisse cabrée (tremplin, pente du tōgé)
  // garde sa vraie forme au lieu d'une boîte alignée gonflée.
  if (!rivalShell.geometry) fail(`${label} la coque du rival n'est pas un maillage`);
  if (!rivalShell.geometry.boundingBox) rivalShell.geometry.computeBoundingBox();
  const shellEye = new THREE.Vector3();
  ghostWatch = () => {
    rivalShell.worldToLocal(shellEye.copy(camera.position));
    shellBox.copy(rivalShell.geometry.boundingBox).expandByScalar(0.3);
    if (!shellBox.containsPoint(shellEye)) return;
    engulfed += 1;
    if (shownChain(rivalShell)) shownEngulfed += 1;
  };
  for (let frame = 0; frame < 20; frame += 1) {
    // Au sol, sur la voie et à la hauteur du pilote (un tremplin pris juste
    // avant ferait passer le rival au-dessus de l'œil).
    if (rival.jumpState) rival.jumpState.active = false;
    rival.jumpElevation = 0;
    rival.lane = world.harnessPlayerLane;
    rival.distance = world.distance;
    rival.currentX = world.harnessPlayerX;
    step(1);
  }
  ghostWatch = null;
  if (!engulfed) fail(`${label} le rival posé sur la voiture n'englobe jamais l'œil : scénario non joué`);
  if (shownEngulfed) fail(`${label} un rival qui englobe l'œil du pilote reste affiché`, { engulfed, shownEngulfed });
  rival.distance = world.distance + 40;
  step(2);
  if (!rival.mesh.visible) fail(`${label} le rival écarté doit réapparaître`);

  // 8. Épave : la toupie se regarde de l'extérieur.
  world.forceWreck();
  step(2);
  if (world.cockpitActive || !shell.visible) fail(`${label} l'épave doit repasser en vue extérieure`);
  if (!(local().z > 4)) fail(`${label} la caméra de l'épave n'est pas derrière la voiture`, { local: local().toArray() });
  if (errors.length) fail(`${label} erreurs du monde`, errors);

  summaries.push(`${city.id} ${rightHand ? 'volant à droite' : 'volant à gauche'} · œil ±${maxEyeGap.toFixed(3)} · volant ${rightTurn.toFixed(2)}/${leftTurn.toFixed(2)} rad · rétro ${mirrorRenders.length} rendus · rival fantôme effacé ${engulfed} img${raining ? ` · pluie ${rainDrops} gouttes-images hors habitacle` : ''}`);
  globalThis.__cockpitRenderHook = null;
  world.destroy();
}

for (const line of summaries) console.log(`  ${line}`);
console.log(`COCKPIT OK — ${summaries.length} parcours : intro extérieure, compte à rebours et course au volant, rétroviseur, pluie hors habitacle, rival fantôme effacé de l'œil, retour en poursuite et épave vue de dehors.`);
