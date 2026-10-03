// Vérif « tir bleu × berlines de police » : exécute createCityRushWorld (vrai
// code) avec un faux WebGLRenderer, déploie l'escouade dès le départ, pilote la
// voiture au milieu des berlines et tire au tir droit dès que la jauge bleue
// est pleine. Le pilote ne tire JAMAIS la rafale rouge ni l'hélico : tout
// point de vie perdu par une berline pendant un tir vient d'une balle bleue.
//
// Trois familles de tirs sont distinguées image par image, à partir du HUD émis
// à l'image précédente (l'état exact au moment où `action()` est appelé) et du
// `blue-shot-miss` que le monde émet quand il tire sans cible :
//   · « devant »   : une berline occupe la voie du pilote devant lui — c'est la
//     cible que `cityRushStraightShotTarget` donne au projectile ;
//   · « riposte »  : aucune berline devant, mais une berline de la voie est
//     déjà dépassée — le projectile part vers l'arrière
//     (`cityRushStraightShotRetaliation`) ;
//   · « sans cible » : personne dans la voie ni devant ni derrière — le coup
//     part dans le vide, et seule la portion de voie balayée en vol peut
//     toucher une berline qui se rabat devant la balle
//     (`cityRushStraightShotSweptHit`).
//
// Le hasard est figé (graine fixe) : la vérif rejoue exactement la même course.
const BASE_SEED = Number(process.env.CITY_RUSH_BLUE_SHOT_SEED || 20261003) >>> 0;
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

let rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LANE_X, CITY_RUSH_POWER_RULES,
  CITY_RUSH_POWERS, CITY_RUSH_BLUE_SHOT_MAX_RANGE, CITY_RUSH_BLUE_SHOT_MIN_GAP,
  CITY_RUSH_POLICE_HEALTH,
} = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

// Constantes de rendu du monde : le joueur est ancré à z = 3,1 et la piste
// défile à 0,72 unité par mètre. De quoi convertir la position d'un bonus en
// mètres devant le pare-chocs.
const PLAYER_Z = 3.1;
const SCROLL_SCALE = 0.72;
const RACE_LAPS = Number(process.env.CITY_RUSH_BLUE_SHOT_LAPS || 3);
const VERBOSE = process.env.CITY_RUSH_BLUE_SHOT_VERBOSE === '1';
// Plusieurs courses par ville, chacune avec sa graine : un tir parti sans
// verrou ne touche que si une berline se rabat devant la balle pendant son
// vol, il faut donc du volume pour que la vérif ne dépende pas d'un coup de
// dés.
const RUNS = Math.max(1, Number(process.env.CITY_RUSH_BLUE_SHOT_RUNS || (process.argv.find((a) => a.startsWith('--runs='))?.slice(7)) || 4));
const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_BLUE_SHOT_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];

const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff',
];

const totals = {
  shots: 0, lockedShots: 0, lockedHits: 0, behindShots: 0, behindHits: 0,
  blindShots: 0, blindHits: 0, healthLost: 0, destroyed: 0,
};
const blindSamples = [];

for (let run = 0; run < RUNS; run += 1) {
seed = (BASE_SEED + run * 7919) >>> 0;
for (const [index, city] of cities.entries()) {
  const car = CITY_RUSH_CARS[(index + run) % CITY_RUSH_CARS.length];
  const callbacks = { errors: [], huds: [], effects: [], finish: null };
  const audioCalls = {};
  const audioStub = {};
  for (const name of AUDIO_METHODS) audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
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

  let world;
  try {
    // 8ᵉ argument : `policeFromStart` — l'escouade entre en piste dès les
    // premiers mètres au lieu d'attendre le dernier tour.
    world = createCityRushWorld(mount, city, () => ({
      error: (e) => { callbacks.errors.push(e); console.error('CALLBACK ERROR:', e); },
      hud: (h) => { callbacks.huds.push(h); },
      finish: (r) => { callbacks.finish = r; },
      effect: (e) => { callbacks.effects.push(e); },
    }), car.id, { current: audioStub }, null, RACE_LAPS, true);
  } catch (e) {
    console.error(`[${city.id}] createCityRushWorld A LEVÉ :`);
    console.error(e);
    process.exit(1);
  }
  const scene = world.scene;
  const pickupSlots = [];
  scene.traverse((object) => {
    if (object.userData?.icon && object.userData?.ring && object.userData?.beam && object.userData?.halo) pickupSlots.push(object);
  });
  if (!pickupSlots.length) fail(`[${city.id}] aucun bonus trouvé dans la scène`);

  const runFrames = (n, label) => {
    for (let i = 0; i < n; i += 1) {
      try { stepFrame(); } catch (e) {
        console.error(`[${city.id}] FRAME ${i} (${label}) A LEVÉ :`);
        console.error(e);
        process.exit(1);
      }
    }
  };

  world.setPhase('intro');
  runFrames(20, 'intro');
  world.reset();
  world.setPhase('countdown');
  for (const n of [3, 2, 1]) { world.setCountdown(n); runFrames(12, `countdown ${n}`); }
  world.setCountdown(0);
  runFrames(10, 'go');
  world.setPhase('playing');
  world.start();

  const slotWorld = new THREE.Vector3();
  const laneOfX = (x) => {
    let lane = 0;
    let closest = Infinity;
    CITY_RUSH_LANE_X.forEach((laneX, i) => {
      const delta = Math.abs(laneX - x);
      if (delta < closest) { closest = delta; lane = i; }
    });
    return lane;
  };

  let frames = 0;
  let steerCooldown = 0;
  let freshHud = false;
  let pendingShot = null;
  let policeHealth = new Map();
  let policeInLaneFrames = 0;
  let policeBehindFrames = 0;
  let readyFrames = 0;
  let shotsFired = 0;
  let readySince = null;
  const shotLog = [];
  const maxFrames = 30 * 200;
  const cityStats = {
    lockedShots: 0, lockedHits: 0, behindShots: 0, behindHits: 0,
    blindShots: 0, blindHits: 0, healthLost: 0, destroyed: 0,
  };

  while (!callbacks.finish && frames < maxFrames) {
    // ── Dégâts encaissés par les berlines ──────────────────────────────
    // La barre de vie descend (berline encore debout) ou la berline quitte la
    // liste du HUD (détruite) : les deux comptent comme un point de vie perdu.
    const hudNow = callbacks.huds[callbacks.huds.length - 1];
    const seen = new Map((hudNow?.police || []).map((police) => [police.id, Number(police.health)]));
    for (const [id, before] of policeHealth) {
      const after = seen.has(id) ? seen.get(id) : 0;
      const lost = Math.max(0, before - after);
      if (!lost) continue;
      cityStats.healthLost += lost;
      if (!seen.has(id)) cityStats.destroyed += 1;
      // Le pilote est le seul à tirer au bleu ici : un dégât dans les 25
      // images qui suivent son tir vient de sa balle.
      if (pendingShot && frames - pendingShot.frame <= 25) {
        pendingShot.hits += lost;
        cityStats[`${pendingShot.mode}Hits`] += lost;
        if (pendingShot.mode !== 'locked' && blindSamples.length < 8) {
          blindSamples.push({ city: city.id, frame: pendingShot.frame, mode: pendingShot.mode, police: id, lost });
        }
      }
    }
    policeHealth = seen;

    if (hudNow) {
      const charges = hudNow.inventory?.[CITY_RUSH_POWERS.BLUE_SHOT] || 0;
      const ready = charges >= (CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT]?.chargeCost ?? 99);
      if (ready) readyFrames += 1;
      const playerDistance = world.distance;

      // Cible possible au moment du tir : une berline dans la voie du pilote,
      // devant lui, à portée du projectile — le filtre exact de
      // `cityRushStraightShotTarget`. Personne ne le passe ? Le coup part sans
      // verrou et seul le balayage en vol peut encore toucher.
      const inLane = (hudNow.police || []).filter((police) => {
        const gap = Number(police.rawDistance) - playerDistance;
        return police.lane === hudNow.playerLane
          && gap > CITY_RUSH_BLUE_SHOT_MIN_GAP
          && gap <= CITY_RUSH_BLUE_SHOT_MAX_RANGE;
      });
      // Une berline de la voie déjà dépassée (ou collée au pare-chocs) : c'est
      // la riposte vers l'arrière qui peut l'atteindre.
      const behind = (hudNow.police || []).filter((police) => {
        const gap = Number(police.rawDistance) - playerDistance;
        return police.lane === hudNow.playerLane
          && gap <= CITY_RUSH_BLUE_SHOT_MIN_GAP
          && gap >= -CITY_RUSH_BLUE_SHOT_MAX_RANGE;
      });
      if (inLane.length) policeInLaneFrames += 1;
      if (behind.length) policeBehindFrames += 1;
      // Le pilote alterne : un coup attendu (verrouillé), un coup immédiat
      // (sans verrou). Les deux familles sont ainsi toujours représentées.
      // Jauge pleine : on garde la balle tant qu'aucune berline n'occupe la
      // voie (devant pour un tir verrouillé, derrière pour la riposte), puis
      // on la lâche quand même au bout de 3 s pour ne pas la bloquer.
      if (ready && readySince === null) readySince = frames;
      if (!ready) readySince = null;
      // Tant qu'aucune riposte n'a été tirée dans cette course, le pilote
      // garde sa balle pour la berline qui le suit : sans cela la fenêtre
      // « derrière » (quelques % des images) ne serait presque jamais prise.
      const waitingBehind = cityStats.behindShots === 0;
      const timeout = waitingBehind ? 300 : 90;
      const fireNow = ready && freshHud && steerCooldown <= 0
        && (Boolean(behind.length)
          || (!waitingBehind && Boolean(inLane.length))
          || (readySince !== null && frames - readySince > timeout));
      if (fireNow) {
        const before = audioCalls.gunshot || 0;
        const effectsBefore = callbacks.effects.length;
        world.action(CITY_RUSH_POWERS.BLUE_SHOT);
        if ((audioCalls.gunshot || 0) > before) {
          shotsFired += 1;
          // Le monde annonce lui-même un tir sans cible (`blue-shot-miss`,
          // émis de façon synchrone par `usePower`) : c'est la classification
          // exacte, caméra comprise, pas une déduction depuis le HUD.
          const unaimed = callbacks.effects.slice(effectsBefore).some((effect) => effect.type === 'blue-shot-miss');
          // Trois familles : tir verrouillé sur une berline devant, riposte
          // vers l'arrière sur une berline dépassée, et coup parti sans cible.
          const mode = unaimed ? 'blind' : !inLane.length && behind.length ? 'behind' : 'locked';
          pendingShot = {
            frame: frames, mode, hits: 0,
            police: [...inLane, ...behind].map((p) => `${p.id}${Math.round(Number(p.rawDistance) - playerDistance) >= 0 ? '+' : ''}${Math.round(Number(p.rawDistance) - playerDistance)}m`),
          };
          shotLog.push(pendingShot);
          cityStats[`${mode}Shots`] += 1;
          // La jauge retombe : on laisse le projectile vivre son vol avant de
          // reprendre la main sur la direction.
          steerCooldown = 8;
        }
      } else if (steerCooldown <= 0 && ready) {
        // Jauge pleine mais personne dans la voie : on se rabat dans la voie
        // d'une berline. En attente de riposte, c'est celle qui nous suit ;
        // sinon la plus proche devant nous.
        const pick = (hudNow.police || [])
          .map((police) => ({ gap: Number(police.rawDistance) - playerDistance, lane: police.lane }))
          .filter((police) => Math.abs(police.gap) <= CITY_RUSH_BLUE_SHOT_MAX_RANGE)
          .filter((police) => (waitingBehind
            ? police.gap <= CITY_RUSH_BLUE_SHOT_MIN_GAP
            : police.gap > CITY_RUSH_BLUE_SHOT_MIN_GAP))
          .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))[0];
        if (pick && pick.lane !== hudNow.playerLane) {
          world.action(pick.lane < hudNow.playerLane ? 'left' : 'right');
          steerCooldown = 12;
        }
      } else if (steerCooldown <= 0) {
        // Pas encore armé : on va chercher les bonus les plus proches devant.
        let best = null;
        for (const slot of pickupSlots) {
          if (!slot.visible) continue;
          slot.getWorldPosition(slotWorld);
          const aheadMeters = (PLAYER_Z - slotWorld.z) / SCROLL_SCALE;
          if (aheadMeters < 2 || aheadMeters > 90) continue;
          if (!best || aheadMeters < best.ahead) best = { ahead: aheadMeters, lane: laneOfX(slotWorld.x) };
        }
        if (best && best.lane !== hudNow.playerLane) {
          world.action(best.lane < hudNow.playerLane ? 'left' : 'right');
          steerCooldown = 12;
        }
      }
    }
    steerCooldown = Math.max(0, steerCooldown - 1);

    const before = callbacks.huds.length;
    runFrames(1, `course f${frames}`);
    // Un tir n'est classé que sur un état frais : le HUD est émis en fin
    // d'image, donc s'il vient de tomber, il décrit exactement le monde tel
    // qu'il est au moment où `action()` sera appelé.
    freshHud = callbacks.huds.length > before;
    frames += 1;
  }

  if (!callbacks.finish) fail(`[${city.id}] arrivée jamais atteinte après ${(frames / 30).toFixed(0)} s virtuelles`);
  if (callbacks.errors.length) fail(`[${city.id}] erreurs remontées`, callbacks.errors);

  console.log(
    `[${city.id}#${run + 1}] rang ${callbacks.finish.rank} · tirs bleus du pilote ${shotsFired} `
    + `(devant ${cityStats.lockedShots} → ${cityStats.lockedHits} pt · `
    + `riposte arrière ${cityStats.behindShots} → ${cityStats.behindHits} pt · `
    + `sans cible ${cityStats.blindShots} → ${cityStats.blindHits} pt) · `
    + `vie perdue par les berlines ${cityStats.healthLost}/${CITY_RUSH_POLICE_HEALTH} · `
    + `détruites ${cityStats.destroyed} · berline dans la voie ${policeInLaneFrames}/${frames} f · derrière ${policeBehindFrames} f · `
    + `jauge pleine ${readyFrames} f`,
  );
  if (VERBOSE) console.log(`[${city.id}] journal des tirs :`, shotLog);

  totals.shots += shotsFired;
  totals.lockedShots += cityStats.lockedShots;
  totals.lockedHits += cityStats.lockedHits;
  totals.behindShots += cityStats.behindShots;
  totals.behindHits += cityStats.behindHits;
  totals.blindShots += cityStats.blindShots;
  totals.blindHits += cityStats.blindHits;
  totals.healthLost += cityStats.healthLost;
  totals.destroyed += cityStats.destroyed;

  world.destroy();
}
}

if (!totals.lockedShots) fail('le pilote n’a jamais pu tirer sur une berline dans sa voie');
if (!totals.lockedHits) fail('un tir bleu verrouillé sur une berline devant lui ne l’a pas touchée');
if (!totals.behindShots) fail('le pilote n’a jamais eu de berline derrière lui dans sa voie : la riposte n’est pas exercée');
if (!totals.behindHits) fail('la riposte vers l’arrière n’a touché aucune berline de police');
// Une berline amenée à zéro point de vie doit exploser et quitter la course :
// `damagePolice` met la vie à zéro avant d'appeler `destroyPolice`, dont la
// garde doit porter sur `active` et non sur la vie.
if (!totals.destroyed) fail('aucune berline amenée à 0 point de vie n’a explosé : destroyPolice ne se déclenche pas');
console.log(
  `VÉRIF TIR BLEU × POLICE OK — ${cities.length} ville(s) × ${RUNS} courses, ${RACE_LAPS} tours, `
  + `graine ${BASE_SEED} · ${totals.shots} tirs du pilote · `
  + `devant ${totals.lockedHits} pt/${totals.lockedShots} · `
  + `riposte arrière ${totals.behindHits} pt/${totals.behindShots} · `
  + `balayage sans cible ${totals.blindHits} pt/${totals.blindShots} · `
  + `berlines détruites ${totals.destroyed}`,
);
if (VERBOSE && blindSamples.length) console.log('tirs sans verrou qui touchent :', blindSamples);
