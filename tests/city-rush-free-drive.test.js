import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_LANE_X,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_SIDE_CONTACT_GAP,
  CITY_RUSH_TRAFFIC_HITBOX_SCALE,
  cityRushLaneConfig,
  cityRushMiniGarageWidth,
} from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_DEFAULT_DRIVING_MODE,
  CITY_RUSH_DRIVING_FREE,
  CITY_RUSH_DRIVING_LANES,
  CITY_RUSH_DRIVING_MODES,
  CITY_RUSH_DRIVING_PREF_KEY,
  CITY_RUSH_FREE_CURVE_WINDOW,
  CITY_RUSH_FREE_FUNNEL_RATE,
  CITY_RUSH_FREE_HEADING_MAX,
  CITY_RUSH_FREE_LANE_HYSTERESIS,
  CITY_RUSH_FREE_RAMP_CATCH,
  CITY_RUSH_FREE_STEER_ANGLE_MAX,
  CITY_RUSH_FREE_STEER_VISUAL_MAX,
  CITY_RUSH_FREE_STRAIGHT_SNAP,
  CITY_RUSH_FREE_TOUCH_SPAN,
  CITY_RUSH_FREE_WALL_SQUEEZE,
  CITY_RUSH_FREE_YAW_GRIP,
  CITY_RUSH_FREE_YAW_MAX,
  CITY_RUSH_FREE_WHEELBASE,
  cityRushDrivingModeLabel,
  cityRushFreeAllowedX,
  cityRushFreeDriveStep,
  cityRushFreeFunnel,
  cityRushFreeLaneForX,
  cityRushFreeRampCatches,
  cityRushFreeRampZones,
  cityRushFreeRoadCurvature,
  cityRushFreeSideContact,
  cityRushFreeSteerBounds,
  cityRushFreeSteerVisual,
  cityRushFreeStructurePhase,
  cityRushFreeTouchTarget,
  cityRushFreeWallZones,
  cityRushFreeYaw,
  cityRushFreeYawLimit,
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

// Joue le volant réel image par image ; `input` et `target` peuvent dépendre
// du temps.
function drive({
  x = 0,
  heading = 0,
  steer = 0,
  seconds,
  input = 0,
  target = null,
  curvature = 0,
  speed = CRUISE,
  bounds = { min: -6, max: 6 },
  frozen = false,
} = {}) {
  let state = { x, heading, steer, arrived: false, edge: null };
  const frames = Math.round(seconds / DT);
  for (let frame = 0; frame < frames; frame += 1) {
    const t = frame * DT;
    state = cityRushFreeDriveStep({
      x: state.x,
      heading: state.heading,
      steer: state.steer,
      input: typeof input === 'function' ? input(t) : input,
      target: typeof target === 'function' ? target(t) : target,
      curvature: typeof curvature === 'function' ? curvature(t) : curvature,
      dt: DT,
      speed,
      bounds,
      frozen,
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

test('vitesse de lacet : franche à basse allure, contenue à haute vitesse', () => {
  assert.equal(cityRushFreeYawLimit(0), 1e-6);
  assert.ok(cityRushFreeYawLimit(Number.NaN) > 0);
  // Basse vitesse : le modèle bicyclette, (v/L)·tan(δmax).
  assert.ok(near(cityRushFreeYawLimit(8), (8 / CITY_RUSH_FREE_WHEELBASE) * Math.tan(CITY_RUSH_FREE_STEER_ANGLE_MAX)));
  // Haute vitesse : le plafond d'adhérence arcade, GRIP/v.
  assert.ok(near(cityRushFreeYawLimit(40), CITY_RUSH_FREE_YAW_GRIP / 40));
  // Voiture arrêtée sur la grille : le volant tourne, la voiture ne bouge pas.
  const parked = drive({ x: 1.25, seconds: 1, input: 1, speed: 0 });
  assert.equal(parked.x, 1.25);
  assert.equal(parked.heading, 0);
  assert.equal(parked.lateral, 0);
});

test('débattement : toute la chaussée, jamais en deçà des voies extérieures', () => {
  const city = boundsFor('vice-city');
  assert.ok(near(city.min, -6.85) && near(city.max, 6.85), JSON.stringify(city));
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

test('touche tenue : le nez tourne, la voiture file là où il pointe', () => {
  let state = { x: 0, heading: 0, steer: 0 };
  for (let frame = 0; frame < 30; frame += 1) {
    state = cityRushFreeDriveStep({ ...state, input: 1, dt: DT, speed: CRUISE, bounds: { min: -6, max: 6 } });
    assert.ok(state.heading >= 0, 'jamais à rebours');
    assert.ok(state.steer >= 0, 'le volant ne change jamais de côté');
  }
  // Le cap plafonne (jamais en travers) et le glissement suit, v·sin(cap).
  assert.ok(near(state.heading, CITY_RUSH_FREE_HEADING_MAX), `cap ${state.heading}`);
  assert.ok(near(state.lateral, CRUISE * Math.sin(CITY_RUSH_FREE_HEADING_MAX)), `glissement ${state.lateral}`);
  assert.ok(state.x > 2, `0,5 s de volant : ${state.x.toFixed(2)} m`);
  // Une voie se traverse en une demi-seconde, comme une vraie voiture qui
  // change de file — un peu plus lentement que l'écart franc des voies.
  let x = 0;
  let heading = 0;
  let steer = 0;
  let time = 0;
  while (x < CITY_RUSH_LANE_WIDTH && time < 2) {
    ({ x, heading, steer } = cityRushFreeDriveStep({ x, heading, steer, input: 1, dt: DT, speed: CRUISE }));
    time += DT;
  }
  assert.ok(time < 0.7, `une voie en ${time.toFixed(2)} s`);
  // À gauche, c'est le miroir exact.
  const left = drive({ seconds: 0.5, input: -1 });
  const right = drive({ seconds: 0.5, input: 1 });
  assert.ok(near(left.x, -right.x) && near(left.heading, -right.heading) && near(left.steer, -right.steer));
});

test('relâche : le volant se rend, le cap tient — la voiture continue tout droit', () => {
  const WIDE = { min: -30, max: 30 };
  const pressed = drive({ x: 1.25, seconds: 0.2, input: 1, bounds: WIDE });
  assert.ok(pressed.heading > 0.15, `cap pris ${pressed.heading.toFixed(2)}`);
  // Relâche : le volant revient au centre, le cap ne bouge pas, la voiture
  // file de côté, entre deux voies s'il le faut — aucun rappel.
  let state = pressed;
  let frames = 0;
  while (state.steer !== 0 && frames < 60) {
    state = cityRushFreeDriveStep({ ...state, input: 0, dt: DT, speed: CRUISE });
    frames += 1;
  }
  assert.ok(frames * DT <= 0.1, `volant rendu en ${(frames * DT).toFixed(2)} s`);
  // Le cap ne revient pas : il ne fait que finir la dernière goutte de volant.
  assert.ok(state.heading >= pressed.heading - 1e-9 && state.heading <= pressed.heading + 0.05,
    `le cap tient à la relâche (${pressed.heading.toFixed(3)} → ${state.heading.toFixed(3)})`);
  assert.ok(state.lateral > 0, 'la voiture continue de filer de côté');
  const coasted = drive({ x: state.x, heading: state.heading, seconds: 1, input: 0, bounds: WIDE });
  assert.ok(coasted.x > state.x + 1, 'sans contre-braquage, la dérive continue');
  const distanceToLane = Math.min(...CITY_RUSH_LANE_X.map((laneX) => Math.abs(laneX - coasted.x)));
  assert.ok(distanceToLane > 0.05, `la voiture tient sa place hors du centre (${coasted.x.toFixed(2)} m)`);
  // Contre-braquage : le cap revient, la voiture s'arrête net — et le dernier
  // cran de volant est pardonné (raccrochage sous STRAIGHT_SNAP, route droite).
  let righted = pressed;
  frames = 0;
  while (righted.heading > 0 && frames < 90) {
    righted = cityRushFreeDriveStep({ ...righted, input: -1, dt: DT, speed: CRUISE });
    frames += 1;
  }
  assert.ok(righted.heading <= 0, 'le contre-braquage fait passer le cap à gauche');
  let settled = righted;
  frames = 0;
  while (settled.heading !== 0 && frames < 30) {
    settled = cityRushFreeDriveStep({ ...settled, input: 0, dt: DT, speed: CRUISE });
    frames += 1;
  }
  assert.equal(settled.heading, 0, 'redressé puis relâché, la voiture raccroche la ligne droite');
  assert.equal(settled.lateral, 0);
  // Le temps que le volant se rende, la voiture a dérivé d'un souffle : elle
  // ne rappelle vers aucun centre de voie pour autant — une fois droite, elle
  // ne bouge plus d'un millimètre sans ordre.
  assert.ok(Math.abs(settled.x - righted.x) < 0.3, `dérive du raccrochage ${Math.abs(settled.x - righted.x).toFixed(3)} m`);
  const still = drive({ x: settled.x, seconds: 0.5, input: 0, bounds: WIDE });
  assert.equal(still.x, settled.x, 'aucun rappel vers le centre d’une voie');
});

test('courbure du tracé : lissée, signée à gauche, repliée sur le tour', () => {
  // Un virage à gauche qui prend 45° sur 9 m : la courbure brute serait
  // 0,785/9 ≈ 0,087 rad/m — la fenêtre de lissage la ramène en douceur.
  const lap = 2000;
  const yaw = (s) => {
    const wrapped = ((s % lap) + lap) % lap;
    if (wrapped < 91) return 0;
    if (wrapped <= 100) return ((wrapped - 91) / 9) * (Math.PI / 4);
    return Math.PI / 4;
  };
  const straight = cityRushFreeRoadCurvature(yaw, 400, { lap });
  assert.ok(near(straight, 0), `hors du virage ${straight}`);
  const peak = cityRushFreeRoadCurvature(yaw, 95.5, { lap });
  assert.ok(peak > 0 && peak < 0.785 / 9 + 1e-9, `au cœur du virage, à gauche : ${peak}`);
  assert.ok(peak > 0.005, 'le lissage laisse passer la virulence du virage');
  // Repli : la lecture au tour suivant est la même, et le raccroc de cap au
  // point de repli ne fabrique pas de virage fantôme.
  assert.ok(near(cityRushFreeRoadCurvature(yaw, 95.5 + lap, { lap }), peak));
  assert.ok(Math.abs(cityRushFreeRoadCurvature(yaw, lap - 5, { lap })) < 0.02);
  assert.equal(cityRushFreeRoadCurvature(null, 100), 0);
  // La courbe en sens inverse est négative.
  const right = cityRushFreeRoadCurvature((s) => -yaw(s), 95.5, { lap });
  assert.ok(near(right, -peak));
});

test('virage : sans volant la voiture sort, en braquant elle tient — c’est le joueur qui tourne', () => {
  const K = 0.02; // rad/m : un virage à gauche, lissé
  const WIDE = { min: -30, max: 30 };
  // a) Mains libres : la route tourne sous la voiture, le cap dérive vers
  //    l'extérieur (à droite) et la voiture sort — rien ne la ramène.
  const handsOff = drive({ x: 0, seconds: 1.5, input: 0, curvature: K, bounds: WIDE });
  assert.ok(handsOff.heading > 0.15, `le nez pointe dehors (${handsOff.heading.toFixed(2)} rad)`);
  assert.ok(handsOff.x > 4, `la voiture sort du virage (${handsOff.x.toFixed(1)} m)`);
  // b) Volant dosé comme un joueur aux flèches : braquer dès que la voiture
  //    dérive, rendre dès qu'elle tient — la ligne se tient.
  let held = { x: 0, heading: 0, steer: 0 };
  let holding = false;
  let steeredInto = false;
  for (let frame = 0; frame < 90; frame += 1) {
    if (!holding && held.x > 0.3) holding = true;
    if (holding && held.x < 0.1) holding = false;
    held = cityRushFreeDriveStep({ ...held, input: holding ? -1 : 0, dt: DT, speed: CRUISE, curvature: K, bounds: WIDE });
    steeredInto = steeredInto || held.steer < -0.02;
  }
  assert.ok(Math.abs(held.x) < 2, `au volant, la voiture tient (${held.x.toFixed(2)} m)`);
  assert.ok(steeredInto, 'tenir un virage à gauche demande de braquer à gauche');
  // c) Le pilote assisté (glissé au doigt, démonstration) contre-braque tout
  //    seul : l'avance de courbe compense la rotation du tracé, et il se gare
  //    droit sur sa cible dès qu'il l'atteint.
  let assisted = { x: 0, heading: 0, steer: 0 };
  let assistSteeredInto = false;
  for (let frame = 0; frame < 90; frame += 1) {
    assisted = cityRushFreeDriveStep({ ...assisted, target: 0, dt: DT, speed: CRUISE, curvature: K, bounds: WIDE });
    assistSteeredInto = assistSteeredInto || assisted.steer < -0.02;
  }
  assert.ok(Math.abs(assisted.x) < 0.15, `l'assisté tient sa cible (${assisted.x.toFixed(3)} m)`);
  assert.ok(assistSteeredInto, 'l’assisté braque à gauche dans le virage à gauche');
  // d) Route droite : la même voiture, le même volant, aucun fantôme.
  const straight = drive({ x: 0, seconds: 1.5, input: 0, curvature: 0, bounds: WIDE });
  assert.equal(straight.x, 0);
  assert.equal(straight.heading, 0);
});

test('gel : toupie, épave ou saut — le volant ne répond plus, la voiture gèle', () => {
  const frozen = drive({ x: 2, heading: 0.2, steer: 0.3, seconds: 0.5, input: 1, curvature: 0.05, frozen: true });
  assert.equal(frozen.x, 2);
  assert.equal(frozen.heading, 0.2);
  assert.equal(frozen.steer, 0.3);
  assert.equal(frozen.lateral, 0);
  assert.equal(frozen.desired, 0);
  // Un placement visé pendant le gel n'aboutit pas.
  const aimed = cityRushFreeDriveStep({ x: 2, heading: 0.2, steer: 0.3, target: 5, dt: DT, speed: CRUISE, frozen: true });
  assert.equal(aimed.x, 2);
  assert.equal(aimed.arrived, false);
});

test('placement visé : la voiture s’y rend et s’y arrête droite, sans le dépasser', () => {
  for (const [from, to] of [[1.25, 3.75], [3.75, -6.25], [-1.25, -0.4], [0, 6.25]]) {
    let state = { x: from, heading: 0, steer: 0 };
    let overshoot = 0;
    let arrivedAt = null;
    for (let frame = 0; frame < 240; frame += 1) {
      state = cityRushFreeDriveStep({ ...state, target: to, dt: DT, speed: CRUISE, bounds: { min: -6.85, max: 6.85 } });
      overshoot = Math.max(overshoot, Math.sign(to - from) * (state.x - to));
      if (state.arrived && arrivedAt === null) arrivedAt = frame * DT;
    }
    assert.equal(state.x, to, `${from} → ${to}`);
    assert.equal(state.heading, 0);
    assert.equal(state.steer, 0);
    assert.equal(state.lateral, 0);
    assert.ok(overshoot <= 1e-9, `dépassement ${overshoot}`);
    assert.ok(arrivedAt !== null && arrivedAt < Math.abs(to - from) / 4 + 0.4, `${from} → ${to} en ${arrivedAt}`);
  }
  // Un placement hors chaussée est ramené au bord.
  const clamped = drive({ x: 0, seconds: 2, target: 40, bounds: { min: -6.85, max: 6.85 } });
  assert.equal(clamped.x, 6.85);
});

test('bord de la chaussée : la voiture bute, le monde y redresse le cap', () => {
  const state = drive({ x: 5, seconds: 1, input: 1, bounds: { min: -6.85, max: 6.85 } });
  assert.equal(state.x, 6.85);
  assert.equal(state.edge, 'right');
  assert.ok(state.heading > 0, 'au bord, le pas rapporte le cap : c’est le monde qui le redresse');
  const left = drive({ x: -5, seconds: 1, input: -1, bounds: { min: -6.85, max: 6.85 } });
  assert.equal(left.x, -6.85);
  assert.equal(left.edge, 'left');
  // Repartir du bord vers l'intérieur reste immédiat.
  const back = drive({ x: 6.85, seconds: 0.4, input: -1, bounds: { min: -6.85, max: 6.85 } });
  assert.ok(back.x < 5.6);
});

test('voie du pilote : la plus proche, avec hystérésis sur la ligne', () => {
  const lanes = [...CITY_RUSH_LANE_X];
  assert.equal(cityRushFreeLaneForX(1.25, 0, lanes), 3);
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
  const car = { id: 'taxi', lane: 4, x: 3.75, width: 1.9, gap: 0.8 };
  // Le pilote glisse vers elle depuis la voie 3 : arrêt au contact (1,85 m).
  const blocked = cityRushFreeSideContact({ fromX: 1.25, toX: 2.2, halfWidth: 0.95, cars: [car] });
  assert.ok(near(blocked.x, 3.75 - 1.9), JSON.stringify(blocked));
  assert.equal(blocked.blocker, car);
  // S'en écarter reste libre.
  const away = cityRushFreeSideContact({ fromX: 1.85, toX: 0.9, halfWidth: 0.95, cars: [car] });
  assert.equal(away.x, 0.9);
  assert.equal(away.blocked, false);
  // Un grand pas ne traverse pas la voiture (pas d'effet tunnel).
  const tunnel = cityRushFreeSideContact({ fromX: 1.25, toX: 6.25, halfWidth: 0.95, cars: [car] });
  assert.ok(near(tunnel.x, 1.85));
  // Pas à hauteur (devant ou derrière) : rien ne bloque.
  for (const gap of [CITY_RUSH_SIDE_CONTACT_GAP, -CITY_RUSH_SIDE_CONTACT_GAP - 0.1, 12]) {
    const free = cityRushFreeSideContact({ fromX: 1.25, toX: 2.7, halfWidth: 0.95, cars: [{ ...car, gap }] });
    assert.equal(free.x, 2.7, `écart ${gap}`);
  }
  // Déjà imbriquées (rattrapée par l'arrière) : pas de répulsion, seulement
  // plus d'avancée vers elle.
  const nested = cityRushFreeSideContact({ fromX: 2.2, toX: 2.1, halfWidth: 0.95, cars: [car] });
  assert.equal(nested.x, 2.1, 'reculer reste permis');
  const deeper = cityRushFreeSideContact({ fromX: 2.2, toX: 2.4, halfWidth: 0.95, cars: [car] });
  assert.equal(deeper.x, 2.2, 'aucun pas de plus vers elle');
  // Prise en étau : la position permise respecte les deux voitures.
  const squeeze = cityRushFreeSideContact({
    fromX: 1.25,
    toX: 3,
    halfWidth: 0.95,
    cars: [car, { id: 'bus', lane: 2, x: -1.25, width: 2.2, gap: -1 }],
  });
  assert.ok(near(squeeze.x, 1.85));
  // Données invalides : ignorées.
  const junk = cityRushFreeSideContact({ fromX: 0, toX: 1, cars: [null, { x: 'a', gap: 0 }, { x: 1, gap: Number.NaN }] });
  assert.equal(junk.x, 1);
});

test('parois : zones interdites au centre de la caisse, frôlement toléré', () => {
  // Mini-garage : les parois suivent la largeur du portique — 5,80 m en ville
  // (parois de 2,38 à 2,81 m de l'axe), 5,40 m sur un circuit.
  const reach = 0.95 - CITY_RUSH_FREE_WALL_SQUEEZE;
  const cityGarage = cityRushMiniGarageWidth(course('vice-city'));
  const cityInner = cityGarage / 2 - 0.52;
  const cityOuter = cityGarage / 2 - 0.09;
  const garage = cityRushFreeWallZones([[-cityOuter, -cityInner], [cityInner, cityOuter]], 0.95);
  assert.ok(near(garage[0][0], -cityOuter - reach) && near(garage[0][1], -cityInner + reach));
  assert.ok(near(garage[1][0], cityInner - reach) && near(garage[1][1], cityOuter + reach));
  // Les deux voies centrales (±1,25 m) passent dedans, les voies 1 et 4 sont
  // poussées dehors.
  assert.equal(cityRushFreeAllowedX(1.25, garage, boundsFor('vice-city')), 1.25);
  assert.equal(cityRushFreeAllowedX(-1.25, garage, boundsFor('vice-city')), -1.25);
  assert.ok(near(cityRushFreeAllowedX(3.75, garage, boundsFor('vice-city')), cityOuter + reach));
  // Sur le Ring, la bande extérieure existe encore : longer le garage reste
  // possible, il n'est jamais imposé.
  const ring = boundsFor('nordschleife');
  const ringGarage = cityRushMiniGarageWidth(course('nordschleife'));
  const ringInner = ringGarage / 2 - 0.52;
  const ringOuter = ringGarage / 2 - 0.09;
  const ringWalls = cityRushFreeWallZones([[-ringOuter, -ringInner], [ringInner, ringOuter]], 0.95);
  const outside = cityRushFreeAllowedX(3.15, ringWalls, ring);
  assert.ok(outside > ringInner && outside <= ring.max, `Ring : ${outside}`);
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
  assert.equal(cityRushFreeAllowedX(5.9, zones, { min: -6.85, max: 5.5 }), 5);
  // Position hors débattement : ramenée dedans.
  assert.equal(cityRushFreeAllowedX(9, [], { min: -6.85, max: 6.85 }), 6.85);
});

test('tremplin pris à cheval : rattrapé ou franchement à côté, jamais à travers', () => {
  const zones = cityRushFreeRampZones(3.75, { halfWidth: 0.95, rampHalfWidth: 1.2 });
  assert.equal(zones.length, 2);
  assert.ok(near(zones[0][0], 3.75 - 2.15) && near(zones[0][1], 3.75 - CITY_RUSH_FREE_RAMP_CATCH));
  assert.ok(near(zones[1][0], 3.75 + CITY_RUSH_FREE_RAMP_CATCH) && near(zones[1][1], 3.75 + 2.15));
  // Au centre de la voie du tremplin, ou à cheval sur sa ligne : rattrapée.
  assert.ok(cityRushFreeRampCatches(3.75, 3.75));
  assert.ok(cityRushFreeRampCatches(3.75 - 1.4, 3.75));
  assert.ok(!cityRushFreeRampCatches(1.25, 3.75), 'la voie voisine passe à côté');
  assert.ok(!cityRushFreeRampCatches('x', 3.75));
  // Dans la bande interdite, la voiture rejoint le côté le plus proche.
  assert.ok(near(cityRushFreeAllowedX(3.75 - 1.6, zones), 3.75 - CITY_RUSH_FREE_RAMP_CATCH));
  assert.ok(near(cityRushFreeAllowedX(3.75 - 2.05, zones), 3.75 - 2.15));
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
  const oneLane = cityRushFreeTouchTarget({ startX: CITY_RUSH_LANE_X[3], startPointer: 500, pointer: 600, viewportWidth: width, bounds });
  assert.ok(oneLane > CITY_RUSH_LANE_X[3] + CITY_RUSH_LANE_WIDTH - 0.25 && oneLane < CITY_RUSH_LANE_X[3] + CITY_RUSH_LANE_WIDTH + 0.25, `${oneLane}`);
  // Au-delà du bord : la cible reste sur la chaussée.
  assert.equal(cityRushFreeTouchTarget({ startX: 5, startPointer: 0, pointer: 5000, viewportWidth: width, bounds }), bounds.max);
  assert.equal(cityRushFreeTouchTarget({ startX: -5, startPointer: 900, pointer: -900, viewportWidth: width, bounds }), bounds.min);
  // Sans mouvement : la voiture vise sa position de départ.
  assert.equal(cityRushFreeTouchTarget({ startX: 0.4, startPointer: 10, pointer: 10, viewportWidth: width, bounds }), 0.4);
});

test('lecture visuelle : le lacet est le cap, le braquage est l’angle des roues', () => {
  // Cap vers la droite (positif) : lacet de maillage négatif (le nez tourne
  // vers +x) — le même signe que l'écart de voie de la conduite par voies.
  assert.ok(cityRushFreeYaw(0.1) < 0);
  assert.ok(cityRushFreeYaw(-0.1) > 0);
  assert.equal(cityRushFreeYaw(0), 0);
  assert.equal(cityRushFreeYaw(500), -CITY_RUSH_FREE_YAW_MAX);
  assert.equal(cityRushFreeYaw(-500), CITY_RUSH_FREE_YAW_MAX);
  // Braquage réel des roues, ramené au débattement de l'affichage.
  assert.ok(cityRushFreeSteerVisual(0.2) > 0);
  assert.ok(cityRushFreeSteerVisual(-0.2) < 0);
  assert.equal(cityRushFreeSteerVisual(CITY_RUSH_FREE_STEER_ANGLE_MAX), CITY_RUSH_FREE_STEER_VISUAL_MAX);
  assert.equal(cityRushFreeSteerVisual(-CITY_RUSH_FREE_STEER_ANGLE_MAX), -CITY_RUSH_FREE_STEER_VISUAL_MAX);
  assert.equal(cityRushFreeSteerVisual(0), 0);
  assert.equal(cityRushFreeSteerVisual(Number.NaN), 0);
});
