// Vérif « carcasse de berline de police » : quand la coque d'une berline tombe
// à zéro, elle ne s'évapore plus. Elle part en tête-à-queue sur **deux tours
// complets** en perdant sa vitesse, **explose** à la fin de sa glissade, et sa
// **carcasse calcinée reste en feu** tout l'incendie, ancrée sur la piste et
// dessinée tant qu'elle est dans le cadre.
//
// Le monde chargé est le vrai monde three.js (rendu factice) ; le lanceur
// (`city-rush-police-wreck-check.mjs`) ne change qu'une chose : le chargeur du
// pilote d'essai, pour que la destruction arrive vite et sur chaque ville. La
// vie des berlines, le barème des dégâts et l'agonie viennent du jeu.
//
// Chaque destruction suivie est mesurée image par image :
//   1. la berline reste affichée pendant tout le tête-à-queue ;
//   2. elle tourne de deux tours (lacet mesuré hors virage de la piste) ;
//   3. sa vitesse fond jusqu'à l'arrêt, et la glissade vaut le tiers de la
//      distance à vitesse constante (`cityRushPoliceWreckSlide`) ;
//   4. le boum (`explosion`) n'est joué qu'à la FIN du tête-à-queue ;
//   5. une carcasse `police-wreck` apparaît là où la glissade s'est arrêtée,
//      flammes allumées (opacité et hauteur > 0) et fumée noire ;
//   6. elle brûle pendant tout l'incendie (`BURN_FRAMES`), flamme pleine puis
//      braises, ne suit pas le pilote (position sur la piste figée), est
//      dessinée dès qu'elle est dans le cadre — et fume.
//
// Une agonie n'est mesurable que si la berline tombe assez loin devant le
// pilote (sinon il la dépasse pendant le tête-à-queue) : les destructions trop
// proches ou hors cadre sont annoncées puis ignorées, et le plancher
// d'observations est global.

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
      this.data = new Uint8ClampedArray(data * width * height * 4);
    } else {
      this.data = data;
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

const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS, CITY_RUSH_LANE_X, CITY_RUSH_POWERS,
  CITY_RUSH_SCROLL_SCALE, cityRushPoliceMaxHealth,
  CITY_RUSH_POLICE_WRECK_SPIN_TURNS, CITY_RUSH_POLICE_WRECK_SPIN_SECONDS,
  CITY_RUSH_POLICE_WRECK_VIEW_BEHIND, CITY_RUSH_POLICE_WRECK_BURN_SECONDS,
  cityRushPoliceWreckSpeed, cityRushPoliceWreckSlide, cityRushPoliceWreckFlame, cityRushTrackProfile,
} = await import('../src/games/cityRushRules.js');

const BASE_SEED = Number(process.env.CITY_RUSH_POLICE_WRECK_SEED || 20261005) >>> 0;
let seed = BASE_SEED;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

let violations = 0;
const fail = (msg, extra) => {
  violations += 1;
  console.error('ÉCHEC :', msg, extra === undefined ? '' : JSON.stringify(extra));
};

const FRAME_MS = 1000 / 30;
let virtualFrame = 0;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  virtualFrame += 1;
  for (const cb of q) cb(virtualNow);
};

const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff',
];

const cityArg = process.argv.find((arg) => arg.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_POLICE_WRECK_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((city) => city.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const RUNS = Math.max(1, Math.floor(Number(process.env.CITY_RUSH_POLICE_WRECK_RUNS || process.argv.find((arg) => arg.startsWith('--runs='))?.slice(7) || 1)));
const VERBOSE = process.env.CITY_RUSH_POLICE_WRECK_VERBOSE === '1';
// Trois tours : assez pour croiser l'escouade et l'abattre, assez court pour
// rester un smoke. La police entre dès le départ (mode Poursuite).
const TEST_LAPS = Math.min(CITY_RUSH_LAPS, 3);
const TURN = Math.PI * 2;
const SPIN_FRAMES = Math.round((CITY_RUSH_POLICE_WRECK_SPIN_SECONDS * 1000) / FRAME_MS);
const BURN_FRAMES = Math.round((CITY_RUSH_POLICE_WRECK_BURN_SECONDS * 1000) / FRAME_MS);
// Piste ↔ écran : les constantes du monde (`PLAYER_Z`, `CITY_RUSH_SCROLL_SCALE`)
// permettent de retrouver la position d'une carcasse le long du parcours.
const PLAYER_Z = 3.1;
// Cible : une berline loin devant (la portée du tir droit est de 120 m), pour
// que la carcasse brûle devant le pilote pendant qu'il la rejoint — sinon il la
// dépasse pendant le tête-à-queue et ne la voit que dans son dos.
const TARGET_GAP_MIN = 45;
const TARGET_GAP_MAX = 110;
// Écart minimal au moment de la destruction pour que l'agonie soit observable :
// trop près, le pilote dépasse la berline pendant son tête-à-queue.
const OBSERVABLE_GAP_MIN = 30;
// Au-delà de cette attente sans cible dans la fenêtre, on tire sur la berline
// la plus proche : la vérif ne doit pas tourner indéfiniment.
const TARGET_FALLBACK_FRAME = 900;

let races = 0;
let destructions = 0;
let carcasses = 0;
let fullBurns = 0;

for (let run = 0; run < RUNS; run += 1) {
  for (const [cityIndex, city] of cities.entries()) {
    seed = (BASE_SEED + run * 7919 + cityIndex * 104729) >>> 0;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const car = CITY_RUSH_CARS[(cityIndex + run) % CITY_RUSH_CARS.length];
    const callbacks = { errors: [], huds: [], effects: [], finished: false };
    const audioCalls = [];
    const audioStub = {};
    for (const name of AUDIO_METHODS) audioStub[name] = () => { audioCalls.push({ name, frame: virtualFrame }); };
    const mount = {
      clientWidth: 1280, clientHeight: 720,
      getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
      appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
      ownerDocument: globalThis.document,
      querySelector: () => null,
      classList: { add() {}, remove() {} },
      style: {},
    };

    let world;
    try {
      world = createCityRushWorld(mount, city, () => ({
        error: (error) => { callbacks.errors.push(error); console.error('CALLBACK ERROR:', error); },
        hud: (hud) => { callbacks.huds.push(hud); },
        finish: () => { callbacks.finished = true; },
        effect: (effect) => { callbacks.effects.push({ ...effect, frame: virtualFrame }); },
        pickup: () => {},
      }), car.id, { current: audioStub }, null, TEST_LAPS, true);
    } catch (error) {
      console.error(`[${city.id}] createCityRushWorld A LEVÉ :`);
      console.error(error);
      process.exit(1);
    }
    races += 1;

    const scene = world.scene;
    const profile = cityRushTrackProfile(city);
    const policeNodes = [];
    const wreckNodes = [];
    let smokeNode = null;
    scene.traverse((object) => {
      if (/^police-pursuit/.test(object.name || '')) policeNodes.push(object);
      if ((object.name || '') === 'smoke') smokeNode = object;
    });
    if (!policeNodes.length) fail(`[${city.id}] aucune berline de poursuite dans la scène`);
    if (!smokeNode) fail(`[${city.id}] le pool de fumée est introuvable`);
    // Les carcasses sont construites à la première destruction : la liste est
    // rafraîchie pendant le tête-à-queue.
    const refreshWreckNodes = () => {
      scene.traverse((object) => {
        if ((object.name || '') === 'police-wreck' && !wreckNodes.includes(object)) wreckNodes.push(object);
      });
      return wreckNodes;
    };
    const visibleSmoke = () => smokeNode.children.filter((child) => child.visible).length;
    const flamesOf = (husk) => {
      const fire = husk.children.find((child) => (child.name || '') === 'police-wreck-fire');
      return (fire?.children || []).filter((child) => child.type === 'Group');
    };
    // Position d'un nœud le long du parcours (m), comme le monde la calcule.
    const trackDistanceOf = (node) => (Number(world.distance) || 0) + (PLAYER_Z - node.position.z) / CITY_RUSH_SCROLL_SCALE;
    const laneOfX = (x) => CITY_RUSH_LANE_X.reduce((best, laneX, lane) => (
      Math.abs(laneX - Number(x)) < Math.abs(CITY_RUSH_LANE_X[best] - Number(x)) ? lane : best
    ), 0);
    // Le tir rouge s'arrête sur le premier véhicule de la voie. Une autre
    // berline de poursuite ou un rival prendrait la balle à la place de la
    // cible, et le trafic l'absorbe pour rien : avec six impacts nécessaires
    // par berline, on attend donc que la voie soit libre jusqu'à la cible, puis
    // on vide le chargeur dessus.
    const trafficNodes = scene.children.filter((node) => /^traffic-/.test(node.name || ''));
    const trafficBetween = (targetLane, targetGap) => {
      const laneX = CITY_RUSH_LANE_X[targetLane];
      return trafficNodes.some((node) => node.visible
        && Math.abs(Number(node.position.x) - laneX) < 1.6
        && (PLAYER_Z - node.position.z) / CITY_RUSH_SCROLL_SCALE > -2
        && (PLAYER_Z - node.position.z) / CITY_RUSH_SCROLL_SCALE < targetGap - 3);
    };
    const between = (other, playerDistance, targetLane, targetGap) => {
      const gap = (Number(other.rawDistance) || 0) - playerDistance;
      return gap > -2 && gap < targetGap - 3
        && (other.lane === targetLane || Math.abs(Number(other.x) - CITY_RUSH_LANE_X[targetLane]) < 1.6);
    };

    // Départ : compte à rebours complet, puis course.
    virtualFrame = 0;
    world.setPhase('countdown');
    for (const count of [3, 2, 1]) {
      world.setCountdown(count);
      for (let frame = 0; frame < 8; frame += 1) stepFrame();
    }
    world.setCountdown(0);
    for (let frame = 0; frame < 8; frame += 1) stepFrame();
    world.setPhase('playing');
    world.start();

    let tracked = null;
    let lockedId = null; // berline visée : le pilote la suit jusqu'à la casse
    let cityCarcasses = 0;
    let examined = 0; // destructions déjà examinées (suivies ou hors cadre)
    let shotsFired = 0;
    const maxFrames = 30 * 240;
    // Berlines de l'escouade détruites, quel qu'en soit l'auteur : le trafic
    // (rappelées ou banalisées) partage le maillage du flot, mais ses
    // destructions portent un autre identifiant et tombent n'importe où. Une
    // berline de l'escouade, elle, agonit toujours au même endroit — le pilote
    // qui la rejoint la voit faire son tête-à-queue puis brûler. La vérif
    // n'exige pas que ce soit le pilote qui l'ait abattue (un rival peut la
    // descendre loin devant) : seule compte la distance à laquelle l'agonie
    // commence, pour qu'elle soit observable de bout en bout.
    const policeDestructions = () => callbacks.effects
      .filter((item) => item.type === 'police-destroyed' && /^police-\d+$/.test(String(item.id)));

    while (!callbacks.finished && virtualFrame < maxFrames && !(tracked && tracked.done)) {
      const hud = callbacks.huds.at(-1);
      // Tant qu'aucune berline n'est tombée : se caler dans la voie d'une
      // berline devant nous et tirer (l'AK-47 part tout droit dans la voie).
      if (!tracked && hud && (hud.inventory?.[CITY_RUSH_POWERS.PISTOL] || 0) > 0) {
        const playerDistance = Number(hud.distance) || 0;
        const squad = (hud.police || [])
          .filter((police) => !String(police.id).startsWith('rally-'))
          .map((police) => ({ ...police, gap: (Number(police.rawDistance) || 0) - playerDistance }));
        const byGap = (a, b) => a.gap - b.gap;
        const laneOf = (police) => laneOfX(police.x);
        // La balle s'arrête sur le premier véhicule de la voie : une autre
        // berline ou un rival devant la cible la prendrait à sa place, le
        // trafic l'absorbe pour rien. Une berline n'est donc tirable que si sa
        // voie est libre jusqu'à elle — la plus avancée de chaque voie l'est
        // par construction, les suivantes non tant que la première roule là.
        const clearLane = (target) => {
          const lane = laneOf(target);
          const rivals = (hud.racers || [])
            .filter((racer) => !racer.isPlayer && !racer.wrecked)
            .some((racer) => between(racer, playerDistance, lane, target.gap));
          if (rivals) return false;
          const others = squad.some((police) => police.id !== target.id
            && between(police, playerDistance, lane, target.gap));
          if (others) return false;
          return !trafficBetween(lane, target.gap);
        };
        // Le tir rouge ne retire qu'un carré : six impacts pour envoyer une
        // berline à la casse. Le pilote verrouille donc sa cible et la suit
        // jusqu'au bout, au lieu de repartir d'une autre à chaque image — la
        // fenêtre de tir (voie libre, berline alignée) ne dure pas six fois
        // plus longtemps qu'un tir. Il choisit la plus **lointaine** des
        // berlines tirables, pour disposer de la plus longue descente possible
        // avant que la distance ne referme : l'agonie ne se suit qu'à bonne
        // distance, sinon le pilote dépasse la carcasse pendant son
        // tête-à-queue (cf. OBSERVABLE_GAP_MIN).
        const shootable = squad
          .filter((police) => police.gap >= TARGET_GAP_MIN && police.gap <= TARGET_GAP_MAX && clearLane(police))
          .sort(byGap);
        const locked = lockedId ? shootable.find((police) => police.id === lockedId) : null;
        let target = locked || shootable.at(-1) || null;
        if (!target && virtualFrame > TARGET_FALLBACK_FRAME) {
          // Dernier recours : plus de cible à bonne distance depuis un moment,
          // la vérif ne doit pas tourner indéfiniment. On tire sur la plus
          // lointaine des berlines devant, même hors des bornes de portée.
          const ahead = squad
            .filter((police) => police.gap > 0 && police.gap <= TARGET_GAP_MAX)
            .sort(byGap);
          target = ahead.at(-1) || null;
        }
        lockedId = target ? target.id : null;
        if (target && virtualFrame % 3 === 0) {
          const targetLane = laneOf(target);
          if (targetLane !== hud.playerLane) world.action(targetLane < hud.playerLane ? 'left' : 'right');
          else if (virtualFrame % 4 === 0 && clearLane(target)) {
            world.action(CITY_RUSH_POWERS.PISTOL);
            shotsFired += 1;
          }
        }
      }
      stepFrame();

      // ── La coque vient de céder ─────────────────────────────────────────
      if (!tracked) {
        const effect = policeDestructions()[examined];
        if (effect) {
          examined += 1;
          // L'agonie est annoncée avec l'explosion.
          if (effect.spinTurns !== CITY_RUSH_POLICE_WRECK_SPIN_TURNS
            || Math.abs(effect.spinSeconds - CITY_RUSH_POLICE_WRECK_SPIN_SECONDS) > 1e-9
            || effect.wreckBurning !== true) {
            fail(`[${city.id}] l'explosion n'annonce pas le tête-à-queue et la carcasse en feu`, effect);
          }
          if (effect.health !== 0 || effect.maxHealth !== cityRushPoliceMaxHealth(effect.vehicleType)) {
            fail(`[${city.id}] la destruction ne confirme pas la coque à zéro`, effect);
          }
          // La berline qui agonise sort du HUD à l'image même de la
          // destruction. On la repère donc à son comportement : parmi les
          // maillages encore affichés, c'est la seule qui se mette à tourner
          // sur elle-même (≈ 0,5 rad/image au départ du tête-à-queue, contre
          // < 0,05 pour une berline en chasse).
          // La berline qui agonise sort du HUD à l'image même de la
          // destruction : sa dernière position connue (HUD de l'image
          // d'avant) dit si elle était dans le cadre, donc observable.
          const lastRow = (callbacks.huds.at(-2)?.police || callbacks.huds.at(-1)?.police || [])
            .find((police) => police.id === effect.id) || null;
          const expectedZ = lastRow
            ? PLAYER_Z - ((Number(lastRow.rawDistance) || 0) - (Number(world.distance) || 0)) * CITY_RUSH_SCROLL_SCALE
            : null;
          const inFrame = lastRow
            ? policeNodes.some((candidate) => candidate.visible && Math.abs(candidate.position.z - expectedZ) < 12)
            : false;
          const gapAtDeath = lastRow
            ? (Number(lastRow.rawDistance) || 0) - (Number(world.distance) || 0)
            : null;
          // Berline hors cadre, ou trop près du pilote au moment de la
          // destruction : son agonie ne se voit pas, la vérif attend la suivante.
          if (!inFrame || !(gapAtDeath > OBSERVABLE_GAP_MIN)) {
            if (VERBOSE) {
              console.log(`[${city.id}#${run + 1}] ${effect.police} détruite à ${gapAtDeath === null ? '?' : gapAtDeath.toFixed(0)} m par ${effect.attackerId} : agonie non observable`);
            }
            continue;
          }
          const candidates = policeNodes.filter((candidate) => candidate.visible);
          // Les carcasses des destructions précédentes brûlent encore, et les
          // modèles sont mis en commun : on note où brûle chacune. Appartient à
          // cette agonie une carcasse neuve, ou un modèle **déplacé** depuis —
          // une vieille épave encore en feu garde sa position sur la piste.
          const preexistingHusks = new Map(refreshWreckNodes()
            .map((candidate) => [candidate, trackDistanceOf(candidate)]));
          tracked = {
            effect,
            candidates,
            spinLast: new Map(),
            spinSweep: new Map(),
            node: null,
            turns: 0,
            startFrame: virtualFrame,
            explosionsBefore: audioCalls.filter((call) => call.name === 'explosion').length,
            spinFrames: 0,
            spinSpeeds: [],
            lastTrackDistance: 0,
            explosionFrame: null,
            husk: null,
            huskTrackDistance: null,
            huskStartZ: null,
            huskLastZ: null,
            preexistingHusks,
            recycled: false,
            huskFrames: 0,
            huskDrawnFrames: 0,
            huskBurningFrames: 0,
            huskSmokeFrames: 0,
            flameFirst: null,
            flameLast: null,
            done: false,
          };
          destructions += 1;
        }
      }

      if (!tracked || tracked.done) continue;

      // ── Tête-à-queue : deux tours en ralentissant ───────────────────────
      if (!tracked.husk) {
        tracked.spinFrames += 1;
        // Lacet hors virage : la piste tourne aussi, seule la toupie compte. Le
        // balayage cumulé (somme des |Δ| image par image) donne le nombre de
        // tours, quel que soit le virage du parcours.
        for (const candidate of tracked.candidates) {
          if (!candidate.visible) continue;
          const spin = candidate.rotation.y - profile.yaw(trackDistanceOf(candidate));
          const previous = tracked.spinLast.get(candidate);
          if (previous !== undefined) {
            tracked.spinSweep.set(candidate, (tracked.spinSweep.get(candidate) || 0) + Math.abs(spin - previous));
          }
          tracked.spinLast.set(candidate, spin);
        }
        if (!tracked.node && tracked.spinFrames >= 3) {
          let best = null;
          let bestSweep = 0.4; // rad : très au-dessus d'un simple changement de voie
          for (const [candidate, sweep] of tracked.spinSweep) {
            if (sweep > bestSweep) { best = candidate; bestSweep = sweep; }
          }
          tracked.node = best;
          if (!best) {
            // La berline était dans le cadre : elle aurait dû partir en toupie.
            fail(`[${city.id}] la berline détruite ne part pas en tête-à-queue`, {
              id: tracked.effect.id,
              sweeps: [...tracked.spinSweep.values()].map((sweep) => Number(sweep.toFixed(2))),
            });
            tracked.done = true;
            continue;
          }
          tracked.lastTrackDistance = trackDistanceOf(best);
        }
        const node = tracked.node;
        let now = tracked.lastTrackDistance;
        if (node) {
          tracked.turns = (tracked.spinSweep.get(node) || 0) / TURN;
          now = trackDistanceOf(node);
          tracked.spinSpeeds.push(Math.max(0, (now - tracked.lastTrackDistance) * 30));
          tracked.lastTrackDistance = now;
        }
        // La carcasse apparaît là où la berline s'immobilise : on la repère à
        // sa position, pas au boum — d'autres berlines (trafic rappelé) peuvent
        // exploser pendant le même tête-à-queue.
        const husk = refreshWreckNodes().find((candidate) => {
          if (!candidate.visible) return false;
          const anchored = trackDistanceOf(candidate);
          if (Math.abs(anchored - now) >= 2.5) return false;
          const before = tracked.preexistingHusks.get(candidate);
          return before === undefined || Math.abs(anchored - before) > 1;
        }) || null;
        if (husk) {
          tracked.explosionFrame = virtualFrame;
          tracked.husk = husk;
          tracked.huskTrackDistance = trackDistanceOf(husk);
          tracked.huskStartZ = husk.position.z;
          tracked.huskLastZ = husk.position.z;
          if (node?.visible) fail(`[${city.id}] la berline reste affichée après l'explosion`);
          if (audioCalls.filter((call) => call.name === 'explosion').length === tracked.explosionsBefore) {
            fail(`[${city.id}] la carcasse apparaît sans explosion`);
          }
          const drift = Math.abs(trackDistanceOf(husk) - tracked.lastTrackDistance);
          if (drift > 1) {
            fail(`[${city.id}] la carcasse n'apparaît pas là où la berline s'est arrêtée`, { drift });
          }
        } else if (tracked.spinFrames > SPIN_FRAMES + 12) {
          fail(`[${city.id}] le tête-à-queue dépasse ${SPIN_FRAMES} images sans exploser`, {
            frames: tracked.spinFrames,
          });
          tracked.done = true;
        } else if (node && !node.visible) {
          // La berline est sortie du cadre pendant sa glissade (le pilote l'a
          // dépassée) : son agonie n'est plus mesurable, on attend la suivante.
          if (VERBOSE) {
            const nowGap = trackDistanceOf(node) - (Number(world.distance) || 0);
            const sameUnit = (hud.police || []).some((police) => police.id === tracked.effect.id);
            console.log(`[${city.id}#${run + 1}] ${tracked.effect.police} sortie du cadre pendant le tête-à-queue (écart ${nowGap.toFixed(1)} m, image ${tracked.spinFrames}, unité revenue au HUD : ${sameUnit})`);
          }
          tracked = null;
        }
        continue;
      }

      // ── Carcasse en feu ─────────────────────────────────────────────────
      const husk = tracked.husk;
      tracked.huskFrames += 1;
      // Le feu vit dans le monde même quand la carcasse est hors cadre : c'est
      // ce qui prouve qu'elle ne s'est pas évaporée avec l'explosion.
      const flames = flamesOf(husk);
      const lit = flames.length > 0 && flames.every((flame) => flame.scale.y > 0.05
        && Math.max(...flame.children.map((mesh) => mesh.material.opacity || 0)) > 0.05);
      if (lit) {
        tracked.huskBurningFrames += 1;
        const height = Math.max(...flames.map((flame) => flame.scale.y));
        if (tracked.flameFirst === null) tracked.flameFirst = height;
        tracked.flameLast = height;
      } else if (tracked.huskFrames < BURN_FRAMES - 6) {
        fail(`[${city.id}] le feu de la carcasse s'éteint avant la fin de l'incendie`, {
          frame: tracked.huskFrames,
          flames: flames.map((flame) => Number(flame.scale.y.toFixed(3))),
        });
      }
      const anchored = trackDistanceOf(husk);
      const gap = anchored - (Number(world.distance) || 0);
      // Ancrée sur la piste : sa position le long du parcours ne bouge plus
      // après l'explosion (seul le décor défile sous elle).
      // L'incendie dure `CITY_RUSH_POLICE_WRECK_BURN_SECONDS`, puis la carcasse
      // a fini de se consumer : la mesure s'arrête là.
      if (tracked.huskFrames >= BURN_FRAMES) tracked.done = true;
      if (Math.abs(anchored - tracked.huskTrackDistance) > 0.6 && !tracked.done) {
        // Le modèle a été repris par une destruction plus récente (plafond de
        // carcasses) : la mesure s'arrête, ce n'est plus la même épave.
        if (VERBOSE) {
          console.log(`[${city.id}#${run + 1}] carcasse recyclée après ${tracked.huskFrames} images`);
        }
        tracked.recycled = true;
        tracked.done = true;
      }
      if (husk.visible) {
        tracked.huskDrawnFrames += 1;
        tracked.huskLastZ = husk.position.z;
        if (!lit) {
          fail(`[${city.id}] la carcasse affichée n'a pas de flammes allumées`, {
            frame: tracked.huskFrames,
          });
        }
        if (visibleSmoke() >= 2) tracked.huskSmokeFrames += 1;
        if (gap < -CITY_RUSH_POLICE_WRECK_VIEW_BEHIND - 1) {
          fail(`[${city.id}] la carcasse reste affichée alors qu'elle est dépassée`, { gap });
        }
      } else if (gap > -CITY_RUSH_POLICE_WRECK_VIEW_BEHIND + 1 && gap < 150) {
        fail(`[${city.id}] la carcasse n'est pas affichée alors qu'elle est dans le cadre`, { gap });
      }
      if (!tracked.done) continue;
      if (husk.visible && !tracked.recycled) {
        fail(`[${city.id}] la carcasse brûle plus longtemps que l'incendie`, {
          frames: tracked.huskFrames,
        });
      }

      carcasses += 1;
      cityCarcasses += 1;
      const turns = tracked.turns;
      const slide = tracked.spinSpeeds.reduce((total, speed) => total + speed / 30, 0);
      const startSpeed = Math.max(...tracked.spinSpeeds, 0);
      const lastSpeed = tracked.spinSpeeds.at(-1) || 0;
      const half = Math.max(1, Math.floor(tracked.spinSpeeds.length / 2));
      const firstHalf = tracked.spinSpeeds.slice(0, half).reduce((total, speed) => total + speed, 0);
      const secondHalf = tracked.spinSpeeds.slice(half).reduce((total, speed) => total + speed, 0);
      const explosionDelay = tracked.explosionFrame - tracked.startFrame;
      const cameraDrift = Math.abs((tracked.huskLastZ ?? 0) - (tracked.huskStartZ ?? 0));
      if (VERBOSE) {
        console.log(`[${city.id}#${run + 1}] ${tracked.effect.police} · tête-à-queue ${turns.toFixed(2)} tour(s) en ${tracked.spinFrames} images · ${startSpeed.toFixed(1)} → ${lastSpeed.toFixed(1)} m/s · glissade ${slide.toFixed(1)} m · boum à +${explosionDelay} images · carcasse en feu ${tracked.huskBurningFrames}/${tracked.huskFrames} images (flamme ${(tracked.flameFirst ?? 0).toFixed(2)} → ${(tracked.flameLast ?? 0).toFixed(2)}), dessinée ${tracked.huskDrawnFrames} images, ${tracked.huskSmokeFrames} avec fumée`);
      }
      if (turns < CITY_RUSH_POLICE_WRECK_SPIN_TURNS - 0.15 || turns > CITY_RUSH_POLICE_WRECK_SPIN_TURNS + 0.2) {
        fail(`[${city.id}] la berline tourne sur ${turns.toFixed(2)} tour(s) au lieu de ${CITY_RUSH_POLICE_WRECK_SPIN_TURNS}`, {
          turns, frames: tracked.spinFrames,
        });
      }
      if (Math.abs(tracked.spinFrames - SPIN_FRAMES) > 4) {
        fail(`[${city.id}] le tête-à-queue dure ${tracked.spinFrames} images au lieu de ${SPIN_FRAMES}`);
      }
      if (!(secondHalf < firstHalf)) {
        fail(`[${city.id}] la berline ne ralentit pas pendant le tête-à-queue`, { firstHalf, secondHalf });
      }
      if (!(lastSpeed < 1)) {
        fail(`[${city.id}] la berline ne s'arrête pas avant d'exploser`, { lastSpeed });
      }
      // Glissade annoncée par la règle : la forme de la décélération est
      // vérifiée, pas seulement son point d'arrivée.
      const expectedSlide = cityRushPoliceWreckSlide(startSpeed, CITY_RUSH_POLICE_WRECK_SPIN_SECONDS);
      if (expectedSlide > 4 && Math.abs(slide - expectedSlide) > expectedSlide * 0.3 + 1.5) {
        fail(`[${city.id}] la glissade ne suit pas la décélération de la règle`, {
          slide: Number(slide.toFixed(2)), expectedSlide: Number(expectedSlide.toFixed(2)), startSpeed,
        });
      }
      if (explosionDelay < SPIN_FRAMES - 4) {
        fail(`[${city.id}] l'explosion part avant la fin du tête-à-queue`, { explosionDelay, SPIN_FRAMES });
      }
      // La carcasse reste en feu tout l'incendie : elle ne s'est pas évaporée
      // avec l'explosion.
      if (tracked.recycled) {
        // Mesure écourtée par le recyclage du modèle : on exige seulement que la
        // carcasse ait brûlé sur toutes les images observées.
        if (tracked.huskBurningFrames !== tracked.huskFrames || tracked.huskFrames < 30) {
          fail(`[${city.id}] la carcasse recyclée n'a pas brûlé sur toutes ses images`, {
            burning: tracked.huskBurningFrames, frames: tracked.huskFrames,
          });
        }
      } else {
        fullBurns += 1;
        if (Math.abs(tracked.huskFrames - BURN_FRAMES) > 4) {
          fail(`[${city.id}] la carcasse ne tient pas tout l'incendie`, {
            frames: tracked.huskFrames, expected: BURN_FRAMES,
          });
        }
        if (tracked.huskBurningFrames < BURN_FRAMES - 6) {
          fail(`[${city.id}] la carcasse n'est pas en feu pendant tout l'incendie`, {
            burning: tracked.huskBurningFrames, frames: tracked.huskFrames,
          });
        }
      }
      // Elle est dessinée dès qu'elle est dans le cadre, et fume. Le nombre
      // d'images dessinées dépend du scénario (une berline abattue de justesse
      // devant le pilote ne reste dans le cadre que quelques images) : ce qui
      // compte est qu'elle soit dessinée **chaque fois** qu'elle est dans la
      // fenêtre — vérifié image par image plus haut — et non pas invisible.
      if (tracked.huskDrawnFrames < 1) {
        fail(`[${city.id}] la carcasse n'est jamais dessinée dans le cadre`, {
          drawn: tracked.huskDrawnFrames,
        });
      }
      if (tracked.huskSmokeFrames < 1) {
        fail(`[${city.id}] la carcasse ne fume pas (${tracked.huskSmokeFrames} images avec de la fumée)`);
      }
      // Le feu faiblit vers les braises sans s'éteindre.
      if (!(tracked.flameLast > 0) || !(tracked.flameLast < (tracked.flameFirst ?? 1))) {
        fail(`[${city.id}] le feu de la carcasse ne faiblit pas vers les braises`, {
          first: tracked.flameFirst, last: tracked.flameLast,
        });
      }
      // Elle ne suit pas le pilote : son Z change dans le cadre.
      if (!(cameraDrift > 1)) {
        fail(`[${city.id}] la carcasse suit le pilote au lieu de rester sur la piste`, { cameraDrift });
      }
      // La règle du feu : pleine flamme à l'explosion, braises ensuite, jamais
      // éteint tant que la carcasse est là.
      if (cityRushPoliceWreckFlame(0) !== 1
        || !(cityRushPoliceWreckFlame(CITY_RUSH_POLICE_WRECK_BURN_SECONDS * 4) > 0)
        || cityRushPoliceWreckSpeed(18, CITY_RUSH_POLICE_WRECK_SPIN_SECONDS) !== 18
        || cityRushPoliceWreckSpeed(18, 0) !== 0) {
        fail(`[${city.id}] la vitesse ou le feu de la carcasse ne suit pas sa règle`);
      }
    }

    if (callbacks.errors.length) fail(`[${city.id}] erreurs remontées`, callbacks.errors.map(String));
    if (VERBOSE && !cityCarcasses) {
      console.log(`[${city.id}#${run + 1}] aucune agonie observable dans cette course (${examined} destruction(s) examinée(s))`);
    }
    if (VERBOSE) {
      console.log(`[${city.id}#${run + 1}] ${virtualFrame} images · ${shotsFired} tirs · ${audioCalls.filter((call) => call.name === 'explosion').length} boum(s) · ${wreckNodes.filter((node) => node.visible).length} carcasse(s) encore en feu`);
    }
    world.destroy();
  }
}

// Une agonie n'est observable que lorsque la berline tombe assez loin devant le
// pilote (sinon il la dépasse pendant le tête-à-queue) : le plancher est donc
// global, et non par ville.
if (!violations && carcasses < 2) {
  fail('trop peu d’agonies observées pour conclure', { carcasses, destructions });
}
// Au moins une carcasse doit avoir été suivie du début à la fin de l'incendie :
// sans cela, la durée du feu ne serait jamais éprouvée.
if (!fullBurns && !violations) {
  fail('aucune carcasse suivie pendant tout son incendie', { carcasses });
}

if (violations) {
  console.error(`VÉRIF CARCASSE DE POLICE ÉCHOUÉE — ${violations} manquement(s) sur ${races} course(s) et ${destructions} agonie(s) suivie(s).`);
  process.exit(3);
}
console.log(`VÉRIF CARCASSE DE POLICE OK — ${cities.length} ville(s) × ${RUNS} course(s) · ${destructions} berline(s) détruite(s) à bonne distance : ${CITY_RUSH_POLICE_WRECK_SPIN_TURNS} tours de tête-à-queue en ${CITY_RUSH_POLICE_WRECK_SPIN_SECONDS} s, explosion à l'arrêt, ${carcasses} carcasse(s) laissée(s) en feu, dont ${fullBurns} suivie(s) pendant tout l'incendie de ${CITY_RUSH_POLICE_WRECK_BURN_SECONDS} s.`);
process.exit(0);
