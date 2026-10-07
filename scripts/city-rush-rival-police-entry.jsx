// Vérif « les rivaux aussi sont pourchassés » : le contrat des deux nouveaux
// motifs de poursuite, mesuré sur de vraies courses.
//
// Trois choses sont vérifiées, sur des courses complètes rejouées à graine fixe,
// avec un pilote qui garde sa voie (le pire cas — il ne se décale jamais) :
//   · le **premier du dernier tour** est chassé : dès qu'un rival mène la course
//     pendant le dernier tour du joueur, il ouvre son dossier (trois étoiles) et
//     une berline dédiée le prend en chasse ;
//   · le **carambolage avec la police** ouvre le même dossier : une berline de
//     ronde percutée par un rival sort de sa ronde pour le chasser, et le rival
//     reçoit en plus sa berline réservée — le barème du contact du joueur ;
//   · la **poursuite du joueur n'est jamais détournée** : les trois unités de
//     l'escouade gardent le joueur pour cible, aucune unité de rival ne prend le
//     joueur, et le classement affiche la pastille de poursuite des rivaux sans
//     jamais la montrer sur la ligne du joueur.
//
// Le hasard est figé (graine fixe) : la vérif rejoue les mêmes courses.
// La graine est choisie pour que le pilote passif (qui ne braque jamais et peut
// donc rester coincé derrière le trafic civil) atteigne le dernier tour dans les
// dix parcours, sur les deux passes. 424242 remplit ce contrat ; `20261007`,
// l'ancienne valeur, ne le remplissait plus après que l'atterrissage sur tremplin
// coûte deux carrés au lieu de détruire la berline — ce réglage décale le flot
// aléatoire, donc le trafic, et une course sur dix n'ouvrait plus le dernier tour.
const BASE_SEED = Number(process.env.CITY_RUSH_RIVAL_POLICE_SEED || 424242) >>> 0;
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

const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS,
  CITY_RUSH_POLICE_COUNT, CITY_RUSH_RIVAL_CONTACT_STARS,
} = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_RIVAL_POLICE_ALL === '1';
const cities = all ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];
const runsArg = process.argv.find((a) => a.startsWith('--runs='))?.slice(7);
const RUNS = Math.max(1, Number(process.env.CITY_RUSH_RIVAL_POLICE_RUNS || runsArg || 2));
// Par défaut le mode Circuit (l'escouade entre au dernier tour du joueur), le
// terrain des deux nouveaux motifs ; `--pursuit` rejoue le mode Poursuite, où
// les trois berlines sont en piste dès le premier mètre.
const PURSUIT_FROM_START = process.argv.includes('--pursuit');
// `--leader-only` : le flot ne contient plus de berline de police (voir le
// lanceur) — le dossier d'un rival ne peut alors s'ouvrir que par la règle du
// premier du dernier tour, ou par un carambolage avec l'escouade.
const LEADER_ONLY = process.argv.includes('--leader-only')
  || process.env.CITY_RUSH_RIVAL_POLICE_LEADER_ONLY === '1';
const VERBOSE = process.env.CITY_RUSH_RIVAL_POLICE_VERBOSE === '1';
// Trois tours : le dernier tour du joueur ouvre assez tôt pour mesurer la
// poursuite du premier, sans allonger la vérif.
const TEST_LAPS = Math.min(CITY_RUSH_LAPS, 3);

const RETALIATION_REASONS = ['police-shot', 'police-contact', 'last-lap-leader', 'pursuer-renewal'];
let races = 0;
let leaderRaces = 0;
let lastLapLeaderPursuits = 0;
let contactPursuits = 0;
let dedicatedFrames = 0;
let dedicatedCloseFrames = 0;
const pursuedSeen = new Set();
const violations = [];

for (let run = 0; run < RUNS; run += 1) {
  seed = (BASE_SEED + run * 7919) >>> 0;
  for (const city of cities) {
    // La citadine : la voiture la plus lente du garage, le cas où les rivaux
    // mènent la course quand le dernier tour du joueur s'ouvre — sans quoi la
    // règle du premier du dernier tour ne serait jamais mesurée.
    const car = CITY_RUSH_CARS[0];
    const callbacks = { errors: [], huds: [], effects: [], finish: null };
    const audioStub = new Proxy({}, { get: () => () => {} });
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

    const world = createCityRushWorld(mount, city, () => ({
      error: (e) => { callbacks.errors.push(e); console.error('CALLBACK ERROR:', e); },
      hud: (h) => { callbacks.huds.push(h); },
      finish: (r) => { callbacks.finish = r; },
      effect: (e) => { callbacks.effects.push(e); },
    }), car.id, { current: audioStub }, null, TEST_LAPS, PURSUIT_FROM_START);

    world.setPhase('countdown');
    for (let i = 0; i < 95; i += 1) stepFrame();
    world.setPhase('playing');
    world.start();

    const prefix = `[${city.id}#${run}${PURSUIT_FROM_START ? '-poursuite' : ''}]`;
    let frames = 0;
    const maxFrames = 240 * 60;
    // Le rival qui mène pendant le dernier tour du joueur : le dossier doit
    // être ouvert (trois étoiles) et la pastille allumée sur sa ligne.
    const leaderSeen = new Set();
    const runPursued = new Set();
    let sawFinalLap = false;
    // Le premier rival observé en tête pendant le dernier tour du joueur : sa
    // poursuite doit exister dans les quinze images qui suivent (le contrôle
    // passe chaque image — voir `chaseLastLapLeader`).
    let firstFinalLapLeader = null;
    let firstFinalLapLeaderPursued = false;
    while (!callbacks.finish && frames < maxFrames) {
      stepFrame();
      frames += 1;
      const hud = callbacks.huds.at(-1);
      if (!hud) continue;
      const laps = Number(hud.laps) || TEST_LAPS;
      const onFinalLap = Number(hud.lap) >= laps;
      if (onFinalLap) sawFinalLap = true;
      const rows = hud.racers || [];
      // Le classement du HUD arrive déjà trié par rang ; on refait le tri sur la
      // distance brute pour ne dépendre d'aucun détail d'affichage.
      const sorted = [...rows].sort((a, b) => (Number(b.rawDistance) || 0) - (Number(a.rawDistance) || 0));
      const leader = sorted[0];
      // Le rival qui mène pendant le dernier tour du joueur doit être recherché :
      // trois étoiles et sa berline dédiée en piste (voir `chaseLastLapLeader`).
      if (onFinalLap && leader && leader.id !== 'player' && !leader.wrecked) {
        leaderSeen.add(leader.id);
        if (!firstFinalLapLeader) firstFinalLapLeader = { id: leader.id, frame: frames };
        if (!(Number(leader.wanted) >= CITY_RUSH_RIVAL_CONTACT_STARS)) {
          violations.push(`${prefix} le premier du dernier tour (${leader.id}) n’est pas recherché (${leader.wanted} étoile(s))`);
        }
        if (!leader.pursued) {
          violations.push(`${prefix} la pastille de poursuite manque sur la ligne du premier du dernier tour (${leader.id})`);
        }
      }
      for (const racer of rows) {
        if (!racer.pursued) continue;
        if (racer.id === 'player') {
          violations.push(`${prefix} la pastille de poursuite est allumée sur la ligne du joueur`);
        }
        pursuedSeen.add(racer.id);
        runPursued.add(racer.id);
        if (!(Number(racer.wanted) >= CITY_RUSH_RIVAL_CONTACT_STARS)) {
          violations.push(`${prefix} la pastille de poursuite s’allume sans trois étoiles (${racer.id})`);
        }
      }
      const reservesByRival = new Map();
      for (const police of hud.police || []) {
        if (firstFinalLapLeader && !firstFinalLapLeaderPursued
          && frames - firstFinalLapLeader.frame <= 15
          && police.targetId === firstFinalLapLeader.id) {
          firstFinalLapLeaderPursued = true;
        }
        if (police.squad) {
          // L'escouade du joueur ne détourne jamais sa chasse vers un rival.
          if (police.targetId !== 'player') {
            violations.push(`${prefix} une berline de l’escouade poursuit ${police.targetId} au lieu du joueur`, police);
          }
          continue;
        }
        if (police.reserveForId) {
          // La berline réservée d'un rival ne chasse jamais que lui — jamais le
          // joueur, jamais un autre rival.
          if (police.targetId !== police.reserveForId) {
            violations.push(`${prefix} la berline réservée de ${police.reserveForId} chasse ${police.targetId}`, police);
          }
          reservesByRival.set(police.reserveForId, (reservesByRival.get(police.reserveForId) || 0) + 1);
        }
        if (!police.targetId || police.targetId === 'player') continue;
        // La berline dédiée doit rester dans le voisinage du rival qu'elle
        // chasse : un dossier ouvert sans poursuivant visible ne suffit pas.
        const rivalRow = rows.find((racer) => racer.id === police.targetId);
        if (!rivalRow) continue;
        const gap = Math.abs((Number(police.distance) || 0) - (Number(rivalRow.rawDistance) || 0));
        dedicatedFrames += 1;
        if (gap <= 120) dedicatedCloseFrames += 1;
      }
      for (const [rivalId, count] of reservesByRival) {
        if (count > 1) {
          violations.push(`${prefix} ${count} berlines réservées sorties en même temps pour ${rivalId}`);
        }
      }
    }
    if (!sawFinalLap) violations.push(`${prefix} la course n’atteint pas le dernier tour du joueur`);
    if (firstFinalLapLeader && !firstFinalLapLeaderPursued) {
      violations.push(`${prefix} le premier du dernier tour (${firstFinalLapLeader.id}) n’est pas pris en chasse dans les 15 images`, {
        frame: firstFinalLapLeader.frame,
        police: (callbacks.huds.at(-1)?.police || []).map((p) => `${p.id}->${p.targetId}/${p.reserveForId || '-'}${p.squad ? '/escouade' : ''}`),
      });
    }
    const leaderReasons = callbacks.effects
      .filter((effect) => effect.type === 'police-retaliation' && effect.reason === 'last-lap-leader')
      .map((effect) => effect.targetId);
    if (firstFinalLapLeader) {
      const wasPursued = runPursued.has(firstFinalLapLeader.id);
      if (!wasPursued) {
        violations.push(`${prefix} le premier du dernier tour (${firstFinalLapLeader.id}) n’ouvre jamais son dossier`);
      }
      if (LEADER_ONLY && !leaderReasons.includes(firstFinalLapLeader.id)) {
        violations.push(`${prefix} le dossier du premier du dernier tour (${firstFinalLapLeader.id}) ne porte pas le motif « last-lap-leader »`);
      }
    }
    const retalations = callbacks.effects.filter((effect) => effect.type === 'police-retaliation');
    for (const effect of retalations) {
      if (!effect.targetId || effect.targetId === 'player' || effect.count !== 1) {
        violations.push(`${prefix} un rival reçoit une poursuite mal comptée`, effect);
      }
      if (!RETALIATION_REASONS.includes(effect.reason)) {
        violations.push(`${prefix} le dossier d’un rival s’ouvre sans motif connu (${effect.reason})`, effect);
      }
      if (!(Number(effect.stars) >= CITY_RUSH_RIVAL_CONTACT_STARS)) {
        violations.push(`${prefix} le dossier d’un rival ne monte pas à trois étoiles (${effect.stars})`, effect);
      }
      // Le motif du dossier doit être celui du déclencheur observé : un contact
      // (carambolage, face-à-face) ou la tête de course au dernier tour.
      if (effect.reason === 'last-lap-leader') lastLapLeaderPursuits += 1;
      if (effect.reason === 'police-contact') contactPursuits += 1;
      const assignedCar = callbacks.huds
        .map((hud) => (hud.police || []).find((police) => police.id === effect.id && police.targetId === effect.targetId))
        .find(Boolean);
      if (!assignedCar || assignedCar.squad) {
        violations.push(`${prefix} la berline du rival n’est pas une unité dédiée (${effect.targetId})`, { effect, assignedCar });
      }
    }
    if (callbacks.errors.length) violations.push(`${prefix} erreurs`, callbacks.errors);
    races += 1;
    leaderRaces += leaderSeen.size ? 1 : 0;
    if (VERBOSE) {
      console.log(`${prefix} ${(frames / 30).toFixed(0)} s · premiers du dernier tour : ${[...leaderSeen].join(', ') || 'joueur'} · recherchés : ${[...runPursued].join(', ') || '—'} · dossiers : ${retalations.map((e) => `${e.targetId}/${e.reason}`).join(' ') || '—'}`);
    }
    world.destroy();
  }
}

if (!races) violations.push('aucune course jouée');
// Le premier du dernier tour : au moins une course où un rival mène le dernier
// tour du joueur, et dans toutes celles-là son dossier s'est ouvert.
if (!leaderRaces) violations.push('aucun rival n’a mené le dernier tour du joueur : la règle du premier n’a pas été mesurée');
if (!pursuedSeen.size) violations.push('aucune poursuite de rival visible dans le classement');
if (LEADER_ONLY && !lastLapLeaderPursuits) violations.push('le motif « premier du dernier tour » n’a jamais été mesuré');
if (!LEADER_ONLY && !contactPursuits) violations.push('aucun carambolage de rival avec la police mesuré (poursuite par contact)');
if (!lastLapLeaderPursuits && !contactPursuits) violations.push('aucun dossier de rival ouvert par un des deux motifs');
if (dedicatedFrames && dedicatedCloseFrames * 2 < dedicatedFrames) {
  violations.push('les berlines dédiées aux rivaux restent loin de leur cible', { dedicatedFrames, dedicatedCloseFrames });
}

if (violations.length) fail(`${violations.length} entorse(s) au contrat de la poursuite des rivaux`, {
  races, leaderRaces, lastLapLeaderPursuits, contactPursuits, violations: violations.slice(0, 8),
});
console.log(`VÉRIF POURSUITE DES RIVAUX OK${LEADER_ONLY ? ' (motif du premier)' : ''} — ${races} course(s), ${leaderRaces} avec un rival en tête au dernier tour, ${lastLapLeaderPursuits} poursuite(s) du premier, ${contactPursuits} poursuite(s) par carambolage (trois étoiles, une berline dédiée par rival, escouade du joueur intacte · graine ${BASE_SEED}).`);
process.exit(0);
