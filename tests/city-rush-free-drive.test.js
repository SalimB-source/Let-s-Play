import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_SIDE_CONTACT_GAP,
  CITY_RUSH_TRAFFIC_HITBOX_SCALE,
  cityRushLaneConfig,
} from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_DEFAULT_DRIVING_MODE,
  CITY_RUSH_DRIVING_FREE,
  CITY_RUSH_DRIVING_LANES,
  CITY_RUSH_DRIVING_MODES,
  CITY_RUSH_DRIVING_PREF_KEY,
  CITY_RUSH_FREE_FUNNEL_RATE,
  CITY_RUSH_FREE_LANE_HYSTERESIS,
  CITY_RUSH_FREE_RAMP_CATCH,
  CITY_RUSH_FREE_STEER_FULL_SPEED,
  CITY_RUSH_FREE_STEER_MAX_LATERAL,
  CITY_RUSH_FREE_STEER_VISUAL_MAX,
  CITY_RUSH_FREE_TOUCH_SPAN,
  CITY_RUSH_FREE_WALL_SQUEEZE,
  CITY_RUSH_FREE_YAW_MAX,
  cityRushDrivingModeLabel,
  cityRushFreeAllowedX,
  cityRushFreeFunnel,
  cityRushFreeLaneForX,
  cityRushFreeLateralLimit,
  cityRushFreeRampCatches,
  cityRushFreeRampZones,
  cityRushFreeSideContact,
  cityRushFreeSteerBounds,
  cityRushFreeSteerStep,
  cityRushFreeSteerVisual,
  cityRushFreeStructurePhase,
  cityRushFreeTouchTarget,
  cityRushFreeWallZones,
  cityRushFreeYaw,
  nextCityRushDrivingMode,
  normalizeCityRushDrivingMode,
} from '../src/games/cityRushFreeDrive.js';

const DT = 1 / 60;
const CRUISE = 30; // m/s : vitesse de croisière, volant à pleine autorité
const near = (actual, expected, epsilon = 1e-6) => Math.abs(actual - expected) <= epsilon;
const course = (id) => CITY_RUSH_COURSES.find((item) => item.id === id);
const laneXsOf = (config) => Array.from({ length: config.laneCount }, (_, lane) => config.laneX(lane));
const boundsFor = (id, halfWidth = 0.95) => {
  const config = cityRushLaneConfig(course(id));
  return cityRushFreeSteerBounds({ laneXs: laneXsOf(config), roadHalf: config.roadHalf, halfWidth });
};

// Joue le volant libre image par image ; `input` peut dépendre du temps.
function drive({ x = 0, velocity = 0, seconds, input = 0, target = null, speed = CRUISE, bounds = { min: -6, max: 6 } }) {
  let state = { x, velocity, arrived: false, edge: null };
  const frames = Math.round(seconds / DT);
  for (let frame = 0; frame < frames; frame += 1) {
    const t = frame * DT;
    state = cityRushFreeSteerStep({
      x: state.x,
      velocity: state.velocity,
      input: typeof input === 'function' ? input(t) : input,
      target: typeof target === 'function' ? target(t) : target,
      dt: DT,
      speed,
      bounds,
    });
  }
  return state;
}

test('mode de conduite : libre par défaut, voies au choix, préférence de l’appareil', () => {
  assert.equal(CITY_RUSH_DEFAULT_DRIVING_MODE, CITY_RUSH_DRIVING_FREE);
  assert.deepEqual([...CITY_RUSH_DRIVING_MODES], ['free', 'lanes']);
  assert.equal(CITY_RUSH_DRIVING_PREF_KEY, 'letsplay_vice_city_rush_driving_v1');
  assert.equal(normalizeCityRushDrivingMode('lanes'), CITY_RUSH_DRIVING_LANES);
  for (const junk of [undefined, null, '', 'LANES', 'voies', 42, {}]) {
    assert.equal(normalizeCityRushDrivingMode(junk), CITY_RUSH_DRIVING_FREE, `valeur ${String(junk)}`);
  }
  assert.equal(nextCityRushDrivingMode('free'), 'lanes');
  assert.equal(nextCityRushDrivingMode('lanes'), 'free');
  assert.equal(nextCityRushDrivingMode('???'), 'lanes');
  assert.equal(cityRushDrivingModeLabel('free'), 'LIBRE');
  assert.equal(cityRushDrivingModeLabel('lanes'), 'VOIES');
});

test('le volant prend son plein effet avec la vitesse d’avance', () => {
  assert.equal(cityRushFreeLateralLimit(0), 0);
  assert.equal(cityRushFreeLateralLimit(-5), 0);
  assert.equal(cityRushFreeLateralLimit(Number.NaN), 0);
  assert.ok(near(cityRushFreeLateralLimit(CITY_RUSH_FREE_STEER_FULL_SPEED / 2), CITY_RUSH_FREE_STEER_MAX_LATERAL / 2));
  assert.equal(cityRushFreeLateralLimit(CITY_RUSH_FREE_STEER_FULL_SPEED), CITY_RUSH_FREE_STEER_MAX_LATERAL);
  assert.equal(cityRushFreeLateralLimit(90), CITY_RUSH_FREE_STEER_MAX_LATERAL);
  // Voiture arrêtée sur la grille : le volant tourne, la voiture ne se décale pas.
  const parked = drive({ x: 1.05, seconds: 1, input: 1, speed: 0 });
  assert.equal(parked.x, 1.05);
  assert.equal(parked.velocity, 0);
});

test('débattement : toute la chaussée, jamais en deçà des voies extérieures', () => {
  const city = boundsFor('vice-city');
  assert.ok(near(city.min, -5.65) && near(city.max, 5.65), JSON.stringify(city));
  const ring = boundsFor('nordschleife');
  assert.ok(near(ring.min, -3.55) && near(ring.max, 3.55), JSON.stringify(ring));
  // Tōgé : chaussée étroite et voiture la plus large du garage — les voies
  // extérieures restent praticables.
  const widest = Math.max(...CITY_RUSH_CARS.map((car) => 1.9 * car.widthScale)) / 2;
  const touge = boundsFor('touge', widest);
  const tougeLanes = laneXsOf(cityRushLaneConfig(course('touge')));
  assert.ok(near(touge.min, Math.min(...tougeLanes)) && near(touge.max, Math.max(...tougeLanes)), JSON.stringify(touge));
  for (const item of CITY_RUSH_COURSES) {
    const config = cityRushLaneConfig(item);
    const bounds = cityRushFreeSteerBounds({ laneXs: laneXsOf(config), roadHalf: config.roadHalf, halfWidth: widest });
    for (const laneX of laneXsOf(config)) {
      assert.ok(laneX >= bounds.min - 1e-9 && laneX <= bounds.max + 1e-9, `${item.id} : voie ${laneX} hors débattement`);
    }
    assert.ok(bounds.max + widest <= config.roadHalf + 1e-9 || near(bounds.max, Math.max(...laneXsOf(config))),
      `${item.id} : la caisse déborde de la chaussée`);
  }
  assert.deepEqual(cityRushFreeSteerBounds({ laneXs: [] }), { min: 0, max: 0 });
});

test('touche tenue : la voiture glisse, sans jamais dépasser la vitesse permise', () => {
  let state = { x: 0, velocity: 0 };
  let peak = 0;
  for (let frame = 0; frame < 30; frame += 1) {
    state = cityRushFreeSteerStep({ ...state, input: 1, dt: DT, speed: CRUISE, bounds: { min: -6, max: 6 } });
    peak = Math.max(peak, state.velocity);
    assert.ok(state.velocity >= 0, 'jamais à rebours');
  }
  assert.ok(near(peak, CITY_RUSH_FREE_STEER_MAX_LATERAL), `pointe ${peak}`);
  assert.ok(state.x > 2, `0,5 s de volant : ${state.x.toFixed(2)} m`);
  // Une voie se traverse à peine plus lentement qu'un écart de la conduite par voies.
  let x = 0;
  let velocity = 0;
  let time = 0;
  while (x < CITY_RUSH_LANE_WIDTH && time < 2) {
    ({ x, velocity } = cityRushFreeSteerStep({ x, velocity, input: 1, dt: DT, speed: CRUISE }));
    time += DT;
  }
  assert.ok(time < 0.45, `une voie en ${time.toFixed(2)} s`);
  // À gauche, c'est le miroir exact.
  const left = drive({ seconds: 0.5, input: -1 });
  const right = drive({ seconds: 0.5, input: 1 });
  assert.ok(near(left.x, -right.x) && near(left.velocity, -right.velocity));
});

test('relâche : la voiture s’arrête net là où elle est, entre deux voies s’il le faut', () => {
  const pressed = drive({ x: 1.05, seconds: 0.2, input: 1 });
  let state = pressed;
  let frames = 0;
  while (state.velocity !== 0 && frames < 60) {
    state = cityRushFreeSteerStep({ ...state, input: 0, dt: DT, speed: CRUISE });
    frames += 1;
  }
  assert.ok(frames * DT <= 0.12, `arrêt en ${(frames * DT).toFixed(2)} s`);
  const settled = drive({ x: state.x, velocity: 0, seconds: 1, input: 0 });
  assert.equal(settled.x, state.x, 'aucun rappel vers le centre d’une voie');
  const distanceToLane = Math.min(...[-5.25, -3.15, -1.05, 1.05, 3.15, 5.25].map((laneX) => Math.abs(laneX - settled.x)));
  assert.ok(distanceToLane > 0.2, `la voiture tient sa place hors du centre (${settled.x.toFixed(2)} m)`);
  // Contre-braquage : la voiture repart de l'autre côté sans attendre.
  const reversed = drive({ x: pressed.x, velocity: pressed.velocity, seconds: 0.3, input: -1 });
  assert.ok(reversed.velocity < 0 && reversed.x < pressed.x + 0.5, JSON.stringify(reversed));
});

test('placement visé : la voiture s’y rend et s’y arrête, sans le dépasser', () => {
  for (const [from, to] of [[1.05, 3.15], [3.15, -5.25], [-1.05, -0.4], [0, 5.25]]) {
    let state = { x: from, velocity: 0 };
    let overshoot = 0;
    let arrivedAt = null;
    for (let frame = 0; frame < 240; frame += 1) {
      state = cityRushFreeSteerStep({ ...state, target: to, dt: DT, speed: CRUISE, bounds: { min: -5.65, max: 5.65 } });
      overshoot = Math.max(overshoot, Math.sign(to - from) * (state.x - to));
      if (state.arrived && arrivedAt === null) arrivedAt = frame * DT;
    }
    assert.equal(state.x, to, `${from} → ${to}`);
    assert.equal(state.velocity, 0);
    assert.ok(overshoot <= 1e-9, `dépassement ${overshoot}`);
    assert.ok(arrivedAt !== null && arrivedAt < Math.abs(to - from) / 4 + 0.4, `${from} → ${to} en ${arrivedAt}`);
  }
  // Un placement hors chaussée est ramené au bord.
  const clamped = drive({ x: 0, seconds: 2, target: 40, bounds: { min: -5.65, max: 5.65 } });
  assert.equal(clamped.x, 5.65);
});

test('bord de la chaussée : la voiture bute, le glissement tombe à zéro', () => {
  const state = drive({ x: 5, seconds: 1, input: 1, bounds: { min: -5.65, max: 5.65 } });
  assert.equal(state.x, 5.65);
  assert.equal(state.velocity, 0);
  assert.equal(state.edge, 'right');
  const left = drive({ x: -5, seconds: 1, input: -1, bounds: { min: -5.65, max: 5.65 } });
  assert.equal(left.x, -5.65);
  assert.equal(left.edge, 'left');
  // Repartir du bord vers l'intérieur reste immédiat.
  const back = drive({ x: 5.65, seconds: 0.3, input: -1, bounds: { min: -5.65, max: 5.65 } });
  assert.ok(back.x < 5.2);
});

test('voie du pilote : la plus proche, avec hystérésis sur la ligne', () => {
  const lanes = [-5.25, -3.15, -1.05, 1.05, 3.15, 5.25];
  assert.equal(cityRushFreeLaneForX(1.05, 0, lanes), 3);
  assert.equal(cityRushFreeLaneForX(-6, 3, lanes), 0);
  assert.equal(cityRushFreeLaneForX(7, 0, lanes), 5);
  // Sur la ligne (x = 0), la voie tenue reste la sienne…
  assert.equal(cityRushFreeLaneForX(0.1, 2, lanes), 2);
  assert.equal(cityRushFreeLaneForX(-0.1, 3, lanes), 3);
  assert.equal(cityRushFreeLaneForX(CITY_RUSH_FREE_LANE_HYSTERESIS - 0.01, 2, lanes), 2);
  // … jusqu'à ce que la caisse ait franchi la ligne de l'hystérésis.
  assert.equal(cityRushFreeLaneForX(CITY_RUSH_FREE_LANE_HYSTERESIS + 0.01, 2, lanes), 3);
  // Une voie tenue invalide retombe sur la plus proche.
  assert.equal(cityRushFreeLaneForX(2.9, 42, lanes), 4);
  assert.equal(cityRushFreeLaneForX(2.9, Number.NaN, lanes), 4);
  assert.equal(cityRushFreeLaneForX(0, 0, []), 0);
  // Balayage aller-retour : la voie ne papillonne pas autour d'une ligne.
  let lane = 2;
  let changes = 0;
  for (let step = 0; step < 400; step += 1) {
    const x = Math.sin(step / 7) * 0.15; // la voiture ondule sur la ligne centrale
    const next = cityRushFreeLaneForX(x, lane, lanes);
    if (next !== lane) changes += 1;
    lane = next;
  }
  assert.equal(changes, 0);
});

test('voie déduite et boîte de collision : même voie qu’une voiture ⇒ carrosseries alignées', () => {
  // Le trafic, l'escouade et les impacts se jugent sur `même voie || recouvrement
  // en x`. En conduite libre, partager la voie d'une voiture doit donc toujours
  // signifier un vrai recouvrement de sa boîte de contact.
  const playerWidth = 1.9 * Math.min(...CITY_RUSH_CARS.map((car) => car.widthScale));
  const trafficHitbox = 1.9 * CITY_RUSH_TRAFFIC_HITBOX_SCALE;
  const contact = (playerWidth + trafficHitbox) / 2;
  for (const item of CITY_RUSH_COURSES) {
    const lanes = laneXsOf(cityRushLaneConfig(item));
    for (let lane = 0; lane < lanes.length; lane += 1) {
      for (let x = lanes[0] - 1; x <= lanes[lanes.length - 1] + 1; x += 0.01) {
        for (const held of [lane, Math.max(0, lane - 1), Math.min(lanes.length - 1, lane + 1)]) {
          if (cityRushFreeLaneForX(x, held, lanes) !== lane) continue;
          assert.ok(Math.abs(x - lanes[lane]) < contact,
            `${item.id} : voie ${lane} à ${x.toFixed(2)} m, hors de la boîte de contact (${contact.toFixed(2)} m)`);
        }
      }
    }
  }
});

test('voiture à hauteur : la carrosserie bloque le glissement, sans jamais repousser', () => {
  const car = { id: 'taxi', lane: 4, x: 3.15, width: 1.9, gap: 0.8 };
  // Le pilote glisse vers elle depuis la voie 3 : arrêt au contact.
  const blocked = cityRushFreeSideContact({ fromX: 1.05, toX: 1.6, halfWidth: 0.95, cars: [car] });
  assert.ok(near(blocked.x, 3.15 - 1.9), JSON.stringify(blocked));
  assert.equal(blocked.blocker, car);
  // S'en écarter reste libre.
  const away = cityRushFreeSideContact({ fromX: 1.25, toX: 0.9, halfWidth: 0.95, cars: [car] });
  assert.equal(away.x, 0.9);
  assert.equal(away.blocked, false);
  // Un grand pas ne traverse pas la voiture (pas d'effet tunnel).
  const tunnel = cityRushFreeSideContact({ fromX: 1.05, toX: 5.25, halfWidth: 0.95, cars: [car] });
  assert.ok(near(tunnel.x, 1.25));
  // Pas à hauteur (devant ou derrière) : rien ne bloque.
  for (const gap of [CITY_RUSH_SIDE_CONTACT_GAP, -CITY_RUSH_SIDE_CONTACT_GAP - 0.1, 12]) {
    const free = cityRushFreeSideContact({ fromX: 1.05, toX: 2.5, halfWidth: 0.95, cars: [{ ...car, gap }] });
    assert.equal(free.x, 2.5, `écart ${gap}`);
  }
  // Déjà imbriquées (rattrapée par l'arrière) : pas de répulsion, seulement
  // plus d'avancée vers elle.
  const nested = cityRushFreeSideContact({ fromX: 2.2, toX: 2.1, halfWidth: 0.95, cars: [car] });
  assert.equal(nested.x, 2.1, 'reculer reste permis');
  const deeper = cityRushFreeSideContact({ fromX: 2.2, toX: 2.4, halfWidth: 0.95, cars: [car] });
  assert.equal(deeper.x, 2.2, 'aucun pas de plus vers elle');
  // Prise en étau : la position permise respecte les deux voitures.
  const squeeze = cityRushFreeSideContact({
    fromX: 1.05,
    toX: 3,
    halfWidth: 0.95,
    cars: [car, { id: 'bus', lane: 2, x: -1.05, width: 2.2, gap: -1 }],
  });
  assert.ok(near(squeeze.x, 1.25));
  // Données invalides : ignorées.
  const junk = cityRushFreeSideContact({ fromX: 0, toX: 1, cars: [null, { x: 'a', gap: 0 }, { x: 1, gap: Number.NaN }] });
  assert.equal(junk.x, 1);
});

test('parois : zones interdites au centre de la caisse, frôlement toléré', () => {
  // Mini-garage : parois de 2,18 à 2,61 m de l'axe.
  const garage = cityRushFreeWallZones([[-2.61, -2.18], [2.18, 2.61]], 0.95);
  const reach = 0.95 - CITY_RUSH_FREE_WALL_SQUEEZE;
  assert.ok(near(garage[0][0], -2.61 - reach) && near(garage[0][1], -2.18 + reach));
  assert.ok(near(garage[1][0], 2.18 - reach) && near(garage[1][1], 2.61 + reach));
  // Les deux voies centrales (±1,05 m) passent dedans, les voies 1 et 4 sont
  // poussées dehors.
  assert.equal(cityRushFreeAllowedX(1.05, garage, boundsFor('vice-city')), 1.05);
  assert.equal(cityRushFreeAllowedX(-1.05, garage, boundsFor('vice-city')), -1.05);
  assert.ok(near(cityRushFreeAllowedX(3.15, garage, boundsFor('vice-city')), 2.61 + reach));
  // Sur le Ring, la bande extérieure existe encore : longer le garage reste
  // possible, il n'est jamais imposé.
  const ring = boundsFor('nordschleife');
  const outside = cityRushFreeAllowedX(3.15, garage, ring);
  assert.ok(outside > 2.61 && outside <= ring.max, `Ring : ${outside}`);
  // Paroi trop fine pour la tolérance : aucune zone.
  assert.deepEqual(cityRushFreeWallZones([[1, 1]], 0.05, 0.1), []);
  assert.deepEqual(cityRushFreeWallZones([[Number.NaN, 1]], 0.95), []);
});

test('position permise : zones fusionnées, sortie la plus proche dans le débattement', () => {
  const zones = [[1, 2], [1.8, 3], [5, 6]];
  assert.equal(cityRushFreeAllowedX(0.5, zones), 0.5);
  assert.equal(cityRushFreeAllowedX(1.2, zones), 1);
  assert.equal(cityRushFreeAllowedX(2.6, zones), 3, 'zones fusionnées : 2 n’est pas une sortie');
  assert.equal(cityRushFreeAllowedX(1, zones), 1, 'le bord d’une zone est permis');
  // La sortie hors débattement est écartée au profit de l'autre.
  assert.equal(cityRushFreeAllowedX(5.9, zones, { min: -6, max: 5.65 }), 5);
  // Position hors débattement : ramenée dedans.
  assert.equal(cityRushFreeAllowedX(9, [], { min: -5.65, max: 5.65 }), 5.65);
});

test('tremplin pris à cheval : rattrapé ou franchement à côté, jamais à travers', () => {
  const zones = cityRushFreeRampZones(3.15, { halfWidth: 0.95, rampHalfWidth: 1.2 });
  assert.equal(zones.length, 2);
  assert.ok(near(zones[0][0], 3.15 - 2.15) && near(zones[0][1], 3.15 - CITY_RUSH_FREE_RAMP_CATCH));
  assert.ok(near(zones[1][0], 3.15 + CITY_RUSH_FREE_RAMP_CATCH) && near(zones[1][1], 3.15 + 2.15));
  // Au centre de la voie du tremplin, ou à cheval sur sa ligne : rattrapée.
  assert.ok(cityRushFreeRampCatches(3.15, 3.15));
  assert.ok(cityRushFreeRampCatches(3.15 - 1.4, 3.15));
  assert.ok(!cityRushFreeRampCatches(1.05, 3.15), 'la voie voisine passe à côté');
  assert.ok(!cityRushFreeRampCatches('x', 3.15));
  // Dans la bande interdite, la voiture rejoint le côté le plus proche.
  assert.ok(near(cityRushFreeAllowedX(3.15 - 1.6, zones), 3.15 - CITY_RUSH_FREE_RAMP_CATCH));
  assert.ok(near(cityRushFreeAllowedX(3.15 - 2.05, zones), 3.15 - 2.15));
  // Une voiture plus étroite que la tolérance : aucune bande interdite.
  assert.deepEqual(cityRushFreeRampZones(0, { halfWidth: 0.2, rampHalfWidth: 1.2 }), []);
});

test('structures : approche, traversée, puis plus rien', () => {
  const span = { start: 100, end: 110, halfLength: 3, lead: 10 };
  assert.equal(cityRushFreeStructurePhase({ ...span, distance: 80 }), null);
  assert.equal(cityRushFreeStructurePhase({ ...span, distance: 88 }), 'approach');
  assert.equal(cityRushFreeStructurePhase({ ...span, distance: 97 }), 'inside');
  assert.equal(cityRushFreeStructurePhase({ ...span, distance: 112.9 }), 'inside');
  assert.equal(cityRushFreeStructurePhase({ ...span, distance: 113.1 }), null);
  // Bornes inversées : même étendue.
  assert.equal(cityRushFreeStructurePhase({ ...span, start: 110, end: 100, distance: 105 }), 'inside');
});

test('canalisation : guidée à l’approche, tenue dans la structure', () => {
  const zones = [[1.33, 3.46]];
  // Hors structure : rien ne bouge.
  assert.equal(cityRushFreeFunnel({ x: 2, zones, phase: null, dt: DT }), 2);
  // À l'approche : glissement borné vers la sortie la plus proche.
  const approach = cityRushFreeFunnel({ x: 2, zones, phase: 'approach', dt: 0.1 });
  assert.ok(near(approach, 2 - CITY_RUSH_FREE_FUNNEL_RATE * 0.1));
  const close = cityRushFreeFunnel({ x: 1.4, zones, phase: 'approach', dt: 0.1 });
  assert.equal(close, 1.33, 'pas de dépassement de la sortie');
  // Dans la structure : la voiture est tenue hors des parois.
  assert.equal(cityRushFreeFunnel({ x: 2, zones, phase: 'inside', dt: DT }), 1.33);
  assert.equal(cityRushFreeFunnel({ x: 3, zones, phase: 'inside', dt: DT }), 3.46);
  assert.equal(cityRushFreeFunnel({ x: 0.5, zones, phase: 'inside', dt: DT }), 0.5);
});

test('glissé au doigt : 55 % de l’écran couvrent toute la chaussée', () => {
  const bounds = boundsFor('vice-city');
  const width = 1000;
  const across = cityRushFreeTouchTarget({
    startX: bounds.min,
    startPointer: 100,
    pointer: 100 + width * CITY_RUSH_FREE_TOUCH_SPAN,
    viewportWidth: width,
    bounds,
  });
  assert.ok(near(across, bounds.max), `${across}`);
  // Une voie : ~ 10 % de l'écran.
  const oneLane = cityRushFreeTouchTarget({ startX: 1.05, startPointer: 500, pointer: 600, viewportWidth: width, bounds });
  assert.ok(oneLane > 3 && oneLane < 3.3, `${oneLane}`);
  // Au-delà du bord : la cible reste sur la chaussée.
  assert.equal(cityRushFreeTouchTarget({ startX: 4, startPointer: 0, pointer: 5000, viewportWidth: width, bounds }), bounds.max);
  assert.equal(cityRushFreeTouchTarget({ startX: -4, startPointer: 900, pointer: -900, viewportWidth: width, bounds }), bounds.min);
  // Sans mouvement : la voiture vise sa position de départ.
  assert.equal(cityRushFreeTouchTarget({ startX: 0.4, startPointer: 10, pointer: 10, viewportWidth: width, bounds }), 0.4);
});

test('lecture visuelle : le nez et le volant suivent le glissement', () => {
  // Vers la droite : lacet négatif (le nez tourne vers +x), braquage positif —
  // les mêmes signes que l'écart de voie de la conduite par voies.
  assert.ok(cityRushFreeYaw(5) < 0);
  assert.ok(cityRushFreeYaw(-5) > 0);
  assert.equal(cityRushFreeYaw(0), 0);
  assert.equal(cityRushFreeYaw(500), -CITY_RUSH_FREE_YAW_MAX);
  assert.equal(cityRushFreeYaw(-500), CITY_RUSH_FREE_YAW_MAX);
  assert.ok(cityRushFreeSteerVisual({ velocity: 4, desired: 9 }) > 0);
  assert.ok(cityRushFreeSteerVisual({ velocity: -4, desired: -9 }) < 0);
  assert.equal(cityRushFreeSteerVisual({ velocity: 9, desired: 9 }), CITY_RUSH_FREE_STEER_VISUAL_MAX);
  assert.equal(cityRushFreeSteerVisual({ velocity: -90, desired: -90 }), -CITY_RUSH_FREE_STEER_VISUAL_MAX);
  // Le volant tourne dès l'appui, avant que la caisse n'ait pris sa vitesse.
  assert.ok(cityRushFreeSteerVisual({ velocity: 0, desired: CITY_RUSH_FREE_STEER_MAX_LATERAL }) > 0.15);
  assert.equal(cityRushFreeSteerVisual({}), 0);
});
