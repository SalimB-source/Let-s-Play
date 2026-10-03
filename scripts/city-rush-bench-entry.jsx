// Banc de mesure « Vice City Rush » (voir city-rush-bench.mjs) : fait tourner
// le vrai monde avec un pilote automatique et résume ce que le joueur subit.
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const pct = (value) => `${(value * 100).toFixed(0)} %`;
const fixed = (value, digits = 1) => value.toFixed(digits).replace('.', ',');
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
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-bench', maxTouchPoints: 0 }, configurable: true });
globalThis.self = globalThis;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

// rAF piloté à la main, temps virtuel à 30 Hz.
const rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });
const FRAME_MS = 1000 / 30;
const DT = FRAME_MS / 1000;
const stepFrame = () => {
  const queue = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of queue) cb(virtualNow);
};

// PRNG déterministe : le monde capture `Math.random` à sa création, on
// l'installe donc AVANT, puis on ne fait que changer l'état entre deux courses.
const rngState = { value: 1 };
const nextRandom = () => {
  rngState.value = (rngState.value + 0x6D2B79F5) >>> 0;
  let t = rngState.value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = nextRandom;
const seedRandom = (seed) => { rngState.value = (seed * 2654435761) >>> 0; };
// Le pilote automatique a son propre générateur : ses « erreurs » ne dépendent
// pas de ce que consomme le monde.
const botState = { value: 7 };
const botRandom = () => {
  botState.value = (botState.value + 0x9E3779B9) >>> 0;
  let t = botState.value;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
};

const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const rules = await import('../src/games/cityRushRules.js');
const { CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_DISTANCE, CITY_RUSH_POWER_RULES } = rules;

const options = globalThis.__BENCH_OPTIONS;
// `cityRushRivalAI` retomberait en silence sur Normal : pour un instrument de
// mesure, un niveau inconnu doit au contraire échouer bruyamment.
if (rules.normalizeCityRushDifficulty(options.difficulty) !== options.difficulty) {
  throw new Error(`bench: --difficulty inconnu « ${options.difficulty} » (${rules.CITY_RUSH_DIFFICULTIES.map((mode) => mode.id).join(', ')})`);
}

// ── Pilotes automatiques ─────────────────────────────────────────────────────
const BOTS = {
  // Un joueur attentif : voit loin, réagit vite, chasse les bonus.
  expert: { reaction: 0.12, lookAhead: 150, pickupRange: 110, hunt: 1, miss: 0 },
  // Un joueur normal : voit moins loin, laisse passer quelques bonus.
  average: { reaction: 0.30, lookAhead: 95, pickupRange: 70, hunt: 0.6, miss: 0.08 },
  // Un joueur distrait.
  casual: { reaction: 0.45, lookAhead: 70, pickupRange: 40, hunt: 0.25, miss: 0.15 },
};
const PICKUP_VALUE = { cash: 3, radio: 3.2, pistol: 2.4, oil: 1.4 };

function laneScore(candidate, view, cfg) {
  let score = candidate === view.lane ? 0 : -0.35 * Math.abs(candidate - view.lane);
  let danger = 0;
  for (const vehicle of view.traffic) {
    if (vehicle.lane !== candidate) continue;
    const gap = vehicle.distance - view.distance;
    if (gap < -6 || gap > cfg.lookAhead) continue;
    const closing = Math.max(1.5, view.speed - vehicle.speed);
    const timeToReach = Math.max(0, gap - 5) / closing;
    if (gap < 7) danger -= 80;
    else if (timeToReach < 1.8) danger -= 50;
    else if (timeToReach < 3.2) danger -= 22;
    else if (timeToReach < 5) danger -= 8;
    else danger -= 2;
  }
  for (const zone of view.zones) {
    if (zone.lane !== candidate) continue;
    const gap = zone.distance - view.distance;
    if (gap < -1 || gap > cfg.lookAhead) continue;
    danger -= gap < 35 ? 9 : 3;
  }
  for (const trap of view.oils) {
    if (trap.lane !== candidate) continue;
    const gap = trap.distance - view.distance;
    if (gap < -1 || gap > 70) continue;
    danger -= 7;
  }
  score += danger;
  for (const pickup of view.pickups) {
    if (pickup.lane !== candidate) continue;
    const gap = pickup.distance - view.distance;
    if (gap < 1 || gap > cfg.pickupRange) continue;
    score += PICKUP_VALUE[pickup.type] * cfg.hunt * (1 - 0.5 * gap / cfg.pickupRange);
  }
  return { score, danger };
}

function botView(d) {
  const pickups = [];
  for (const row of d.rows) {
    row.pickups.forEach((pickup, index) => {
      if (row.pickupClaims.has(index) || !row.slots[index]?.visible) return;
      pickups.push({ lane: pickup.lane, distance: row.trackDistance, type: pickup.type });
    });
  }
  return {
    lane: d.playerLane,
    distance: d.distance,
    speed: Math.max(d.currentSpeed, 14),
    traffic: d.trafficCars.map((vehicle) => ({ lane: vehicle.lane, distance: vehicle.distance, speed: vehicle.currentSpeed })),
    zones: d.rows.filter((row) => row.slowLane !== null && row.slowZone.visible).map((row) => ({ lane: row.slowLane, distance: row.trackDistance })),
    oils: d.oilTraps.filter((trap) => trap.active).map((trap) => ({ lane: trap.lane, distance: trap.trackDistance })),
    pickups,
  };
}

function botDrive(world, cfg, memo) {
  const d = world.__debug;
  memo.timer -= DT;
  if (memo.timer <= 0) {
    memo.timer = cfg.reaction;
    if (botRandom() >= cfg.miss) {
      const view = botView(d);
      const scored = [0, 1, 2, 3].map((lane) => ({ lane, ...laneScore(lane, view, cfg) }));
      const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
      if (best.lane !== view.lane) {
        const step = best.lane > view.lane ? 1 : -1;
        // On ne s'engage pas dans une voie voisine qui est elle-même bloquée.
        if (scored[view.lane + step].danger > -45) world.action(step > 0 ? 'right' : 'left');
      }
    }
  }
  // Pouvoirs manuels : la mitrailleuse seulement si un rival est devant.
  if (d.inventory.pistol >= CITY_RUSH_POWER_RULES.pistol.chargeCost) {
    const ahead = d.racers.some((racer) => racer.distance - d.distance > 3 && racer.distance - d.distance < 90);
    if (ahead) world.action('pistol');
  }
  if (d.inventory.radio >= CITY_RUSH_POWER_RULES.radio.chargeCost && !d.strike) world.action('radio');
}

// ── Une course ───────────────────────────────────────────────────────────────
function playRace({ world, state, city, car, seed, botName }) {
  const cfg = BOTS[botName];
  const memo = { timer: 0 };
  const d = world.__debug;
  seedRandom(seed);
  botState.value = (seed * 40503) >>> 0;
  state.events.length = 0;
  state.finish = null;
  world.reset();
  world.setPhase('playing');
  world.start();

  const stats = {
    frames: 0, rankChanges: 0, near30: 0, near60: 0, blocked: { player: 0 },
    maxLead: 0, leadFrames: 0, behindFrames: 0,
    shotsOnPlayer: 0, shotsRivalVsRival: 0, shotsByPlayer: 0,
    loaded: { pistol: 0, oil: 0, radio: 0 },
  };
  stats.rivalPickups = {};
  globalThis.__benchPickup = (racerId, type) => {
    stats.rivalPickups[racerId] = stats.rivalPickups[racerId] || { cash: 0, oil: 0, pistol: 0, radio: 0 };
    stats.rivalPickups[racerId][type] += 1;
  };
  globalThis.__benchFire = (attackerId, targetId) => {
    if (attackerId === 'player') stats.shotsByPlayer += 1;
    else if (targetId === 'player') stats.shotsOnPlayer += 1;
    else stats.shotsRivalVsRival += 1;
  };
  for (const racer of d.racers) stats.blocked[racer.id] = 0;
  let lastRank = 0;
  const limit = 30 * 240;
  while (!state.finish && stats.frames < limit) {
    botDrive(world, cfg, memo);
    stepFrame();
    stats.frames += 1;
    if (globalThis.__BENCH_OPTIONS.trace && stats.frames % 30 === 0 && d.elapsed <= globalThis.__BENCH_OPTIONS.trace) {
      const cells = d.racers.map((racer) => `${racer.id} L${racer.lane} ${racer.distance.toFixed(0).padStart(4)}m ${racer.currentSpeed.toFixed(1).padStart(4)}${racer.slowLeft > 0 ? 's' : racer.stunLeft > 0 ? 'X' : racer.boostLeft > 0 ? 'b' : ' '}`);
      console.log(`t=${d.elapsed.toFixed(1).padStart(5)}  you L${d.playerLane} ${d.distance.toFixed(0).padStart(4)}m ${d.currentSpeed.toFixed(1).padStart(4)}  | ${cells.join(' | ')}`);
    }
    const mine = d.distance;
    const board = [{ id: 'player', distance: mine }, ...d.racers.map((racer) => ({ id: racer.id, distance: racer.distance }))]
      .sort((a, b) => b.distance - a.distance);
    const rank = board.findIndex((racer) => racer.id === 'player') + 1;
    if (lastRank && rank !== lastRank) stats.rankChanges += 1;
    lastRank = rank;
    const bestRival = Math.max(...d.racers.map((racer) => racer.distance));
    const lead = mine - bestRival;
    stats.maxLead = Math.max(stats.maxLead, lead);
    if (lead > 40) stats.leadFrames += 1;
    if (lead < -40) stats.behindFrames += 1;
    for (const racer of d.racers) {
      for (const [type, cost] of [['pistol', 3], ['oil', 2], ['radio', 4]]) {
        if ((racer.inventory?.[type] || 0) >= cost) stats.loaded[type] += 1;
      }
    }
    const nearest = Math.min(...d.racers.map((racer) => Math.abs(racer.distance - mine)));
    if (nearest < 30) stats.near30 += 1;
    if (nearest < 60) stats.near60 += 1;
    if (d.elapsed > 4) {
      if (d.currentSpeed < 14 && d.slowLeft <= 0 && d.stunLeft <= 0) stats.blocked.player += 1;
      for (const racer of d.racers) {
        if (racer.stunLeft <= 0 && racer.slowLeft <= 0 && racer.currentSpeed < 0.55 * racer.baseSpeed) stats.blocked[racer.id] += 1;
      }
    }
  }
  if (!state.finish) throw new Error(`course sans arrivée (graine ${seed})`);

  const hits = { pistol: 0, oil: 0, missile: 0 };
  let hitSeconds = 0;
  // Tirs de l'escouade de police du dernier tour sur le joueur : comptés à part, ils ne sont pas
  // l'œuvre des rivaux (les réglages de difficulté ne les touchent pas).
  let policeHits = 0;
  let policeSeconds = 0;
  const rival = { boost: 0, oil: 0, heli: 0 };
  for (const event of state.events) {
    if (event.type === 'pistol-hit-player') { hits.pistol += 1; hitSeconds += event.duration || 0; }
    else if (event.type === 'oil-hit' && event.target === 'TOI' && event.owner !== 'TOI') { hits.oil += 1; hitSeconds += 1.4; }
    else if (event.type === 'missile-hit' && event.targetId === 'player') { hits.missile += 1; hitSeconds += event.duration || 0; }
    else if (event.type === 'police-fire') { policeHits += 1; policeSeconds += event.duration || 0; }
    else if (event.type === 'rival-boost') rival.boost += 1;
    else if (event.type === 'rival-oil') rival.oil += 1;
    else if (event.type === 'radio' && event.targetId === 'player') rival.heli += 1;
  }
  const finish = state.finish;
  const me = finish.racers.find((racer) => racer.id === 'player');
  const winner = finish.racers[0];
  return {
    seed, city: city.id, car: car.id, bot: botName,
    rank: finish.rank,
    winner: finish.winnerId,
    duration: finish.duration,
    gapToWinner: Math.max(0, (winner?.distance ?? CITY_RUSH_DISTANCE) - (me?.distance ?? 0)),
    // avance finale du joueur sur la moyenne des rivaux (m) : mesure continue, bien moins bruitée qu'une victoire
    relDist: (me?.distance ?? 0) - mean(finish.racers.filter((racer) => racer.id !== 'player').map((racer) => racer.distance)),
    hits, hitTotal: hits.pistol + hits.oil + hits.missile, hitSeconds, policeHits, policeSeconds,
    rival,
    pickups: finish.pickups,
    rankChanges: stats.rankChanges,
    rivalPickups: stats.rivalPickups,
    shots: { onPlayer: stats.shotsOnPlayer, rivalVsRival: stats.shotsRivalVsRival, byPlayer: stats.shotsByPlayer },
    loaded: Object.fromEntries(Object.entries(stats.loaded).map(([type, frames]) => [type, +(frames * DT).toFixed(2)])),
    maxLead: stats.maxLead,
    lead40: stats.leadFrames / stats.frames,
    behind40: stats.behindFrames / stats.frames,
    near30: stats.near30 / stats.frames,
    near60: stats.near60 / stats.frames,
    blocked: Object.fromEntries(Object.entries(stats.blocked).map(([id, frames]) => [id, +(frames * DT).toFixed(2)])),
  };
}

// ── Lot de courses ───────────────────────────────────────────────────────────
const cities = options.city === 'all' ? CITY_RUSH_CITIES : [CITY_RUSH_CITIES.find((item) => item.id === options.city) || CITY_RUSH_CITIES[0]];
const cars = options.car === 'all' ? CITY_RUSH_CARS : [CITY_RUSH_CARS.find((item) => item.id === options.car) || CITY_RUSH_CARS[0]];
const results = [];
const combos = [];
for (const city of cities) for (const car of cars) combos.push({ city, car });
const perCombo = Math.max(1, Math.ceil(options.races / combos.length));

for (const { city, car } of combos) {
  const state = { events: [], finish: null };
  const mount = {
    clientWidth: 1280, clientHeight: 720,
    getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    ownerDocument: globalThis.document, querySelector: () => null, classList: { add() {}, remove() {} }, style: {},
  };
  const audioRef = { current: new Proxy({}, { get: () => () => {} }) };
  seedRandom(options.seed * 1000 + 17);
  const world = createCityRushWorld(mount, city, () => ({
    ready() {}, error: (error) => { throw new Error(String(error)); },
    hud() {}, pickup() {}, lap() {},
    finish: (result) => { state.finish = result; },
    effect: (effect) => { state.events.push(effect); },
  }), car.id, audioRef, null, options.difficulty);
  for (let index = 0; index < perCombo; index += 1) {
    const seed = options.seed * 100 + index * 7 + CITY_RUSH_CARS.indexOf(car) * 3 + CITY_RUSH_CITIES.indexOf(city);
    const result = playRace({ world, state, city, car, seed, botName: options.bot });
    results.push(result);
    if (options.json) console.log(JSON.stringify(result));
  }
  world.destroy();
}

// ── Résumé ───────────────────────────────────────────────────────────────────
if (!options.json) {
  const rankCount = [1, 2, 3, 4].map((rank) => results.filter((result) => result.rank === rank).length);
  const rivalIds = Object.keys(results[0].blocked).filter((id) => id !== 'player');
  console.log(`\n══ Vice City Rush · pilote « ${options.bot} » · ${results.length} courses (${cities.map((c) => c.id).join(', ')} · ${cars.map((c) => c.id).join(', ')}) · niveau ${options.difficulty}${Object.keys(options.ai || {}).length ? ` · ia ${JSON.stringify(options.ai)}` : ''} ══`);
  console.log(`victoires joueur      ${pct(rankCount[0] / results.length)}   (places 1/2/3/4 : ${rankCount.join(' / ')})`);
  console.log(`place moyenne         ${fixed(mean(results.map((r) => r.rank)), 2)}`);
  console.log(`durée de course       ${fixed(mean(results.map((r) => r.duration)))} s`);
  console.log(`écart au vainqueur    ${fixed(mean(results.map((r) => r.gapToWinner)))} m   (hors victoires : ${fixed(mean(results.filter((r) => r.rank > 1).map((r) => r.gapToWinner)))} m)`);
  console.log(`coups encaissés/course ${fixed(mean(results.map((r) => r.hitTotal)), 2)}   (mitrailleuse ${fixed(mean(results.map((r) => r.hits.pistol)), 2)} · huile ${fixed(mean(results.map((r) => r.hits.oil)), 2)} · hélico ${fixed(mean(results.map((r) => r.hits.missile)), 2)})`);
  console.log(`temps perdu en coups  ${fixed(mean(results.map((r) => r.hitSeconds)))} s/course`);
  console.log(`+ escouade de police  ${fixed(mean(results.map((r) => r.policeHits)), 2)} tirs sur toi/course (${fixed(mean(results.map((r) => r.policeSeconds)))} s perdues, non comptées ci-dessus)`);
  console.log(`courses sans aucun coup ${pct(results.filter((r) => r.hitTotal === 0).length / results.length)}`);
  console.log(`rival à < 30 m / 60 m  ${pct(mean(results.map((r) => r.near30)))} / ${pct(mean(results.map((r) => r.near60)))} du temps`);
  console.log(`changements de place  ${fixed(mean(results.map((r) => r.rankChanges)))} / course`);
  console.log(`plus grosse avance    ${fixed(mean(results.map((r) => r.maxLead)), 0)} m · en tête de > 40 m ${pct(mean(results.map((r) => r.lead40)))} du temps · à > 40 m derrière ${pct(mean(results.map((r) => r.behind40)))}`);
  const stderr = (values) => {
    const m = mean(values);
    return Math.sqrt(mean(values.map((v) => (v - m) ** 2)) / Math.max(1, values.length - 1));
  };
  console.log(`avance finale / rivaux ${fixed(mean(results.map((r) => r.relDist)), 0)} m ± ${fixed(stderr(results.map((r) => r.relDist)), 0)} (0 = à égalité avec la moyenne des rivaux)`);
  const byCar = CITY_RUSH_CARS.map((car) => {
    const own = results.filter((r) => r.car === car.id);
    return own.length ? `${car.id} ${pct(own.filter((r) => r.rank === 1).length / own.length)} (${fixed(mean(own.map((r) => r.relDist)), 0)} m)` : null;
  }).filter(Boolean);
  console.log(`par voiture           ${byCar.join(' · ')}`);
  const pickupTotals = (id) => ['cash', 'oil', 'pistol', 'radio'].map((type) => mean(results.map((r) => r.rivalPickups?.[id]?.[type] || 0)));
  const rivalPickupSummary = rivalIds.map((id) => {
    const [cash, oil, pistol, radio] = pickupTotals(id);
    return `${id} ${fixed(cash + oil + pistol + radio)} (billets ${fixed(cash)} · huile ${fixed(oil)} · mitr. ${fixed(pistol)} · hélico ${fixed(radio)})`;
  });
  console.log(`bonus ramassés rivaux ${rivalPickupSummary.join(' · ')}`);
  console.log(`tirs de rivaux       sur toi ${fixed(mean(results.map((r) => r.shots.onPlayer)), 2)} · entre rivaux ${fixed(mean(results.map((r) => r.shots.rivalVsRival)), 2)} · tes tirs ${fixed(mean(results.map((r) => r.shots.byPlayer)), 2)} / course`);
  console.log(`armes rivales chargées en attente (somme des 3 rivaux)  mitrailleuse ${fixed(mean(results.map((r) => r.loaded.pistol)))} s · huile ${fixed(mean(results.map((r) => r.loaded.oil)))} s · hélico ${fixed(mean(results.map((r) => r.loaded.radio)))} s`);
  console.log(`usage pouvoirs rivaux boost ${fixed(mean(results.map((r) => r.rival.boost)))} · huile ${fixed(mean(results.map((r) => r.rival.oil)))} · hélico sur toi ${fixed(mean(results.map((r) => r.rival.heli)), 2)}`);
  console.log(`bonus ramassés (joueur) ${fixed(mean(results.map((r) => r.pickups)))}`);
  console.log(`bloqué par le trafic  joueur ${fixed(mean(results.map((r) => r.blocked.player)))} s · ${rivalIds.map((id) => `${id} ${fixed(mean(results.map((r) => r.blocked[id])))} s`).join(' · ')}`);
  const winners = {};
  for (const result of results) winners[result.winner] = (winners[result.winner] || 0) + 1;
  console.log(`vainqueurs            ${Object.entries(winners).map(([id, count]) => `${id} ${count}`).join(' · ')}`);
}
