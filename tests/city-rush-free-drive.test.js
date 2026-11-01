import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  viceCityFreeDriveParkedCarHitbox,
  viceCityFreeDriveParkedCarImpulse,
  viceCityCanalBarrierCrossed,
  viceCityFreeDriveJoystickInput,
  viceCityFreeDriveJoystickVector,
  viceCityFreeDriveAimPose,
  viceCityFreeDriveAimVectorPose,
  viceCityFreeDriveTurnInput,
  viceCityFreeDriveTurnStep,
  viceCityFreeDriveVelocityStep,
  viceCityFreeDriveFootVector,
  viceCityFreeDriveShotImpulse,
  viceCityFreeDriveSpeedStep,
  viceCityFreeDriveSteerStep,
  viceCityFreeDriveYawRate,
} from '../src/games/viceCityFreeDrive.js';
import {
  CITY_RUSH_DEFAULT_DRIVING_MODE,
  CITY_RUSH_DRIVING_FREE,
  CITY_RUSH_DRIVING_LANES,
  CITY_RUSH_DRIVING_MODES,
  CITY_RUSH_DRIVING_PREF_KEY,
  CITY_RUSH_FREE_FUNNEL_RATE,
  CITY_RUSH_FREE_LANE_HYSTERESIS,
  CITY_RUSH_FREE_RAMP_CATCH,
  CITY_RUSH_FREE_STEER_ACCEL,
  CITY_RUSH_FREE_STEER_BRAKE,
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
const near = (actual, expected, epsilon = 1e-6) => Math.abs(actual - expected) <= epsilon;

test('conduite libre : la déclaration du tir se ferme sans expression parasite', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /audioRef\.current\?\.gunshot\?\.\(\);\s*\};\s*const bulletOverlaps/u,
    'aucun identifiant isolé ne doit interrompre le montage du jeu après fireShot');
});
const course = (id) => CITY_RUSH_COURSES.find((item) => item.id === id);
const laneXsOf = (config) => Array.from({ length: config.laneCount }, (_, lane) => config.laneX(lane));
const boundsFor = (id, halfWidth = 0.95) => {
  const config = cityRushLaneConfig(course(id));
  return cityRushFreeSteerBounds({ laneXs: laneXsOf(config), roadHalf: config.roadHalf, halfWidth });
};

function stepFrames({ x = 0, velocity = 0, seconds, input = 0, target = null, bounds = { min: -14.35, max: 14.35 } }) {
  let state = { x, velocity, arrived: false, edge: null };
  const frames = Math.round(seconds / DT);
  for (let frame = 0; frame < frames; frame += 1) {
    state = cityRushFreeSteerStep({
      x: state.x,
      velocity: state.velocity,
      input: typeof input === 'function' ? input(frame * DT) : input,
      target: typeof target === 'function' ? target(frame * DT) : target,
      dt: DT,
      bounds,
    });
  }
  return state;
}

test('conduite libre : flèche bas freine puis engage la marche arrière à l’arrêt', () => {
  const params = { dt: 1 / 60, maxSpeed: 35, acceleration: 5, reverseMaxSpeed: 7 };
  const coastAtTwenty = viceCityFreeDriveSpeedStep({ ...params, speed: 20, throttle: false, brake: false, dt: 0.25 });
  assert.ok(coastAtTwenty <= 19.6, `le lever de pied ralentit nettement : ${coastAtTwenty}`);
  assert.equal(viceCityFreeDriveSpeedStep({ ...params, speed: 0, throttle: false, brake: false }), 0,
    'aucune accélération automatique au point mort');
  assert.ok(viceCityFreeDriveSpeedStep({ ...params, speed: 0, throttle: false, brake: true }) < 0,
    'la flèche bas fait reculer depuis l’arrêt');
  assert.equal(viceCityFreeDriveSpeedStep({ ...params, speed: 1, throttle: false, brake: true, dt: 0.2 }), 0,
    'le freinage avant s’arrête à zéro sans inverser la vitesse dans la même frame');
  const freinLent = viceCityFreeDriveSpeedStep({ ...params, speed: 5, throttle: false, brake: true, dt: 0.25 });
  const freinRapide = viceCityFreeDriveSpeedStep({ ...params, speed: 30, throttle: false, brake: true, dt: 0.25 });
  const freinVoiturePuissante = viceCityFreeDriveSpeedStep({ ...params, speed: 20, maxSpeed: 50, throttle: false, brake: true, dt: 0.1 });
  const freinVoitureLente = viceCityFreeDriveSpeedStep({ ...params, speed: 20, maxSpeed: 25, throttle: false, brake: true, dt: 0.1 });
  assert.ok(freinLent < 5 && freinLent > 0, 'le freinage ralentit sans inverser le mouvement');
  assert.ok(30 - freinRapide > 5 - freinLent, 'le freinage gagne en force avec la vitesse');
  assert.ok(freinVoitureLente - freinVoiturePuissante >= 0.45,
    'les voitures puissantes gagnent nettement en freinage au même régime');
  let reverseSpeed = 0;
  for (let frame = 0; frame < 180; frame += 1) {
    reverseSpeed = viceCityFreeDriveSpeedStep({ ...params, speed: reverseSpeed, throttle: false, brake: true, dt: 1 / 60 });
  }
  assert.equal(reverseSpeed, -params.reverseMaxSpeed, 'la marche arrière reste plafonnée');
  assert.equal(viceCityFreeDriveSpeedStep({ ...params, speed: -2, throttle: true, brake: false, dt: 0.5 }), 0,
    'la flèche haut freine d’abord la marche arrière');
  assert.ok(viceCityFreeDriveSpeedStep({ ...params, speed: 0, throttle: true, brake: false }) > 0,
    'la flèche haut repart en marche avant');
});

test('conduite libre mobile : le joystick dirige, accélère et freine avec une zone morte', () => {
  assert.deepEqual(viceCityFreeDriveJoystickInput(0, 0), { steer: 0, throttle: false, brake: false });
  assert.deepEqual(viceCityFreeDriveJoystickInput(-1, -1), { steer: -1, throttle: true, brake: false });
  assert.deepEqual(viceCityFreeDriveJoystickInput(1, 1), { steer: 1, throttle: false, brake: true });
  assert.equal(viceCityFreeDriveJoystickInput(0.1, -0.1).steer, 0,
    'les petites vibrations du doigt ne font pas braquer la voiture');
});

test('joystick à pied : déplacement analogique dans toutes les directions avec zone morte', () => {
  assert.deepEqual(viceCityFreeDriveJoystickVector(0, 0), { x: 0, y: 0, magnitude: 0 });
  assert.deepEqual(viceCityFreeDriveJoystickVector(0.08, -0.08), { x: 0, y: 0, magnitude: 0 });
  assert.deepEqual(viceCityFreeDriveJoystickVector(0, -1), { x: 0, y: -1, magnitude: 1 });
  assert.deepEqual(viceCityFreeDriveJoystickVector(1, 0), { x: 1, y: 0, magnitude: 1 });
  const diagonal = viceCityFreeDriveJoystickVector(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12,
    'la diagonale ne dépasse pas la vitesse maximale');
  assert.ok(diagonal.x > 0 && diagonal.y > 0);
});

test('à pied : A/D font tourner le personnage à gauche et à droite', () => {
  assert.equal(viceCityFreeDriveTurnInput(true, false), -1);
  assert.equal(viceCityFreeDriveTurnInput(false, true), 1);
  assert.equal(viceCityFreeDriveTurnInput(true, true), 0);
});

test('visée souris : le corps garde son cap, seuls les bras suivent le point visé', () => {
  const pose = viceCityFreeDriveAimPose(Math.PI / 2, Math.PI / 4);
  assert.equal(pose.bodyHeading, Math.PI / 2);
  assert.ok(Math.abs(pose.armYaw - Math.PI / 4) < 1e-12);
  assert.deepEqual(viceCityFreeDriveAimPose(1.2, 1.2), { bodyHeading: 1.2, armYaw: 0 });
});

test('visée souris 3D : le réticule et le tir partagent le rayon jusque dans la hauteur', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /const x = cursorX;\s*const y = cursorY;/u,
    'le réticule reste exactement sous le curseur');
  assert.match(source, /mouseRaycaster\.intersectObjects\(aimGlassCandidates, false\)/u,
    'une vitre sous le curseur fournit le point visé réel');
  assert.match(source, /mouseRaycaster\.ray\.at\(90, mouseAimPoint\)/u,
    'le rayon garde une visée verticale en espace libre');
  assert.match(source, /mouseAimDirection\.subVectors\(mouseAimPoint, shotOrigin\)/u,
    'le vecteur part du canon et garde sa composante verticale');
  assert.match(source, /stepY = shot\.directionY \* 92 \* dt/u,
    'la trajectoire du projectile suit la hauteur visée');
});

test('visée 3D : le pitch incline les bras sans modifier le cap du personnage', () => {
  const pose = viceCityFreeDriveAimVectorPose(0.7, 0, Math.SQRT1_2, -Math.SQRT1_2);
  assert.equal(pose.bodyHeading, 0.7);
  assert.ok(Math.abs(pose.pitch - Math.PI / 4) < 1e-12);
  assert.ok(Math.abs(pose.armYaw - 0.7) < 1e-12,
    'le bras compense le cap du corps pour pointer droit devant en 3D');
  const diagonal = viceCityFreeDriveAimVectorPose(0, 1, 1, -1);
  assert.ok(Math.abs(diagonal.pitch - Math.asin(1 / Math.sqrt(3))) < 1e-12);
  assert.ok(Math.abs(diagonal.armYaw + Math.PI / 4) < 1e-12);
});

test('les tirs cassent le vitrage sans appliquer d’impulsion aux voitures', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('const updateShots = (dt) =>');
  const end = source.indexOf('const cockpitMirrorTurn', start);
  assert.ok(start >= 0 && end > start);
  const shotUpdate = source.slice(start, end);
  assert.match(shotUpdate, /breakVehicleGlass\(/u);
  assert.doesNotMatch(shotUpdate, /(?:velocityX|velocityZ|angularVelocity)\s*\+=/u);
});

test('à pied : la pose de visée reste en portée pendant l’entrée/sortie avec E', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  const animateStart = source.indexOf('const animate = (now) =>');
  const footStart = source.indexOf('if (isOnFootRef.current) {', animateStart);
  const footEnd = source.indexOf("\n      } else {\n        throttle = pressed('ArrowUp') || pressed('KeyW');", footStart);
  assert.ok(animateStart >= 0 && footStart > animateStart && footEnd > footStart);
  const footBranch = source.slice(footStart, footEnd);
  assert.ok(footBranch.indexOf('const mouseAimDirection = getMouseAimDirection()') < footBranch.indexOf('if (pendingEntry)'));
  assert.ok(footBranch.indexOf('const aimPose = viceCityFreeDriveAimVectorPose') > footBranch.indexOf('if (pendingEntry)'));
  assert.match(footBranch, /aimPose\.armYaw \* aimBlend/u);
  assert.match(footBranch, /movePedestrianWithSlide\(dt\)/u);
  assert.match(footBranch, /pedestrian\.legs\[0\]\.userData\.knee\.rotation\.x/u);
});

test('à pied : l’accélération, le freinage et les changements de direction sont progressifs', () => {
  const firstStep = viceCityFreeDriveVelocityStep(0, 0, 2.35, 0, 1 / 60);
  assert.ok(firstStep.x > 0 && firstStep.x < 2.35, 'la vitesse monte graduellement');
  const braking = viceCityFreeDriveVelocityStep(2, 0, 0, 0, 1 / 60);
  assert.ok(braking.x > 0 && braking.x < 2, 'le relâchement freine sans arrêt sec');
  const reversing = viceCityFreeDriveVelocityStep(0.3, 0, -2, 0, 1 / 60);
  assert.ok(reversing.x > 0 && reversing.x < 0.3, 'un demi-tour freine avant de repartir en sens inverse');

  const firstTurn = viceCityFreeDriveTurnStep(0, 1, 1 / 60);
  assert.ok(firstTurn > 0 && firstTurn < 2.35, 'A/D engagent la rotation sans à-coup');
  const heldTurn = viceCityFreeDriveTurnStep(firstTurn, 1, 1 / 60);
  assert.ok(heldTurn > firstTurn);
  const releasedTurn = viceCityFreeDriveTurnStep(heldTurn, 0, 1 / 60);
  assert.ok(releasedTurn > 0 && releasedTurn < heldTurn, 'la rotation se recentre doucement');
});

test('à pied : les axes de glissade restent indépendants et la diagonale est plafonnée', () => {
  assert.deepEqual(viceCityFreeDriveFootVector(0, -1), { forward: 0, strafe: -1, magnitude: 1 });
  assert.deepEqual(viceCityFreeDriveFootVector(0, 1), { forward: 0, strafe: 1, magnitude: 1 });
  assert.deepEqual(viceCityFreeDriveFootVector(1, 0), { forward: 1, strafe: 0, magnitude: 1 });
  const diagonal = viceCityFreeDriveFootVector(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.forward, diagonal.strafe) - 1) < 1e-12);
  assert.equal(viceCityFreeDriveFootVector(0.2, 0.3).magnitude, Math.hypot(0.2, 0.3));
});

test('conduite libre mobile : les tirs poussent les véhicules sans éjecter les plus lourds', () => {
  assert.equal(viceCityFreeDriveShotImpulse(1), 5.2);
  assert.equal(viceCityFreeDriveShotImpulse(2), 2.6);
  assert.equal(viceCityFreeDriveShotImpulse(1, 4.2), 4.2);
  assert.equal(viceCityFreeDriveShotImpulse(0), 5.2, 'une masse absente utilise la masse standard');
});

test('conduite libre : les barrières du canal bloquent les franchissements hors du pont', () => {
  assert.equal(viceCityCanalBarrierCrossed(25, 40, 15, 40), true,
    'un déplacement court ne traverse pas la berge');
  assert.equal(viceCityCanalBarrierCrossed(25, 0, 15, 0), false,
    'le passage du pont reste ouvert');
  assert.equal(viceCityCanalBarrierCrossed(35, -40, -35, -40), true,
    'une grande étape ne peut pas sauter les deux berges');
  assert.equal(viceCityCanalBarrierCrossed(25, 30, 15, 0), true,
    'un déplacement en diagonale est bloqué au point où il coupe la berge');
  assert.equal(viceCityCanalBarrierCrossed(25, 440, 15, 450, 20, 7.8, [-455, 455], 13.6), false,
    'une approche diagonale qui coupe le mur sur le tablier autoroutier reste ouverte');
  assert.equal(viceCityCanalBarrierCrossed(25, 435, 15, 445, 20, 7.8, [-455, 455], 13.6), true,
    'le mur reste actif si la trajectoire coupe la berge avant le tablier autoroutier');
});

test('conduite libre : braquage moins brutal et adhérence latérale modérée', () => {
  assert.equal(viceCityFreeDriveYawRate(0, 1), 0);
  assert.ok(viceCityFreeDriveYawRate(5, 1) < 0.8, 'petit rayon de braquage adouci à basse vitesse');
  assert.ok(viceCityFreeDriveYawRate(30, 1) < 0.52, 'l’adhérence limite le lacet à vitesse élevée');
  assert.ok(near(viceCityFreeDriveYawRate(30, -1), -viceCityFreeDriveYawRate(30, 1)));
});

test('braquage progressif : appui bref doux, maintien plus fort, recentrage au relâchement', () => {
  let quickTap = 0;
  let held = 0;
  for (let frame = 0; frame < 6; frame += 1) quickTap = viceCityFreeDriveSteerStep(quickTap, 1, DT);
  for (let frame = 0; frame < 30; frame += 1) held = viceCityFreeDriveSteerStep(held, 1, DT);
  assert.ok(quickTap < 0.35, `appui bref : ${quickTap.toFixed(2)}`);
  assert.ok(held > 0.8 && held > quickTap * 2, `maintien : ${held.toFixed(2)}`);
  const released = viceCityFreeDriveSteerStep(quickTap, 0, 0.1);
  assert.ok(released < quickTap, 'la direction se détend au relâchement');
  assert.ok(near(viceCityFreeDriveSteerStep(0, -1, DT), -viceCityFreeDriveSteerStep(0, 1, DT)));
});

test('hitbox des voitures stationnées resserrée pour frôler sans collision lointaine', () => {
  const sedan = viceCityFreeDriveParkedCarHitbox(1.94, 4);
  assert.ok(sedan.halfWidth < 2.0, `demi-largeur : ${sedan.halfWidth}`);
  assert.ok(sedan.halfLength < 4.0, `demi-longueur : ${sedan.halfLength}`);
  const truck = viceCityFreeDriveParkedCarHitbox(2.3, 4.6);
  assert.ok(truck.halfWidth > sedan.halfWidth);
  assert.ok(truck.halfLength > sedan.halfLength);
});

test('impact : pousse une voiture et continue à la déplacer si le joueur insiste', () => {
  const initialImpact = viceCityFreeDriveParkedCarImpulse(8, 1, 1 / 60, true);
  const continuedPush = viceCityFreeDriveParkedCarImpulse(3, 1, 1 / 60, false);
  const truckImpact = viceCityFreeDriveParkedCarImpulse(8, 1.9, 1 / 60, true);
  assert.ok(initialImpact > continuedPush && continuedPush > 0);
  assert.ok(truckImpact < initialImpact, 'un véhicule lourd est plus difficile à pousser');
  assert.ok(Number.isFinite(viceCityFreeDriveParkedCarImpulse(3, 1, undefined, false)));
  assert.equal(viceCityFreeDriveParkedCarImpulse(0, 1, 1 / 60, true), 0);
});

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

test('débattement : toute la chaussée, jamais en deçà des voies extérieures', () => {
  const city = boundsFor('vice-city');
  assert.ok(near(city.min, -14.35) && near(city.max, 14.35), JSON.stringify(city));
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

test('touche tenue : glissement uniquement gauche/droite, sans à-coup et réactif', () => {
  let state = { x: 0, velocity: 0 };
  for (let frame = 0; frame < 30; frame += 1) {
    state = cityRushFreeSteerStep({ ...state, input: 1, dt: DT, bounds: { min: -14.35, max: 14.35 } });
    assert.ok(state.velocity >= 0, 'jamais à rebours');
  }
  assert.ok(near(state.velocity, CITY_RUSH_FREE_STEER_MAX_LATERAL), `vitesse atteinte : ${state.velocity}`);
  assert.ok(state.x > 5, `0,5 s de maintien : ${state.x.toFixed(2)} m`);
  // Une voie de 5 m se traverse en moins de 0,45 s.
  let x = 0;
  let velocity = 0;
  let time = 0;
  while (x < CITY_RUSH_LANE_WIDTH && time < 2) {
    ({ x, velocity } = cityRushFreeSteerStep({ x, velocity, input: 1, dt: DT }));
    time += DT;
  }
  assert.ok(time < 0.45, `une voie en ${time.toFixed(2)} s`);
  // À gauche, c'est le miroir exact.
  const left = stepFrames({ seconds: 0.5, input: -1 });
  const right = stepFrames({ seconds: 0.5, input: 1 });
  assert.ok(near(left.x, -right.x) && near(left.velocity, -right.velocity));
});

test('relâche : arrêt rapide sur place, aucun rappel vers le centre d’une voie', () => {
  const pressed = stepFrames({ x: 2.5, seconds: 0.14, input: 1 });
  assert.ok(pressed.x > 2.5 && pressed.x < 5.0);
  let state = pressed;
  let frames = 0;
  while (state.velocity !== 0 && frames < 60) {
    state = cityRushFreeSteerStep({ x: state.x, velocity: state.velocity, input: 0, dt: DT });
    frames += 1;
  }
  assert.equal(state.velocity, 0);
  assert.ok(frames * DT <= CITY_RUSH_FREE_STEER_MAX_LATERAL / CITY_RUSH_FREE_STEER_BRAKE + DT,
    `arrêt en ${(frames * DT).toFixed(2)} s`);
  const distanceToLane = Math.min(...CITY_RUSH_LANE_X.map((laneX) => Math.abs(laneX - state.x)));
  assert.ok(distanceToLane > 0.1, `la voiture tient sa place hors du centre (${state.x.toFixed(2)} m)`);
  // Une demi-seconde de plus sans toucher à rien : zéro dérive.
  const still = stepFrames({ x: state.x, velocity: 0, seconds: 0.5, input: 0 });
  assert.equal(still.x, state.x);
});

test('placement visé : la voiture s’y rend et s’y arrête sans le dépasser', () => {
  for (const [from, to] of [[2.5, 7.5], [7.5, -12.5], [-2.5, -0.4], [0, 12.5]]) {
    let state = { x: from, velocity: 0 };
    let overshoot = 0;
    let arrivedAt = null;
    for (let frame = 0; frame < 180; frame += 1) {
      state = cityRushFreeSteerStep({ ...state, target: to, dt: DT, bounds: { min: -14.35, max: 14.35 } });
      overshoot = Math.max(overshoot, Math.sign(to - from) * (state.x - to));
      if (state.arrived && arrivedAt === null) arrivedAt = frame * DT;
    }
    assert.equal(state.x, to, `${from} → ${to}`);
    assert.equal(state.velocity, 0);
    assert.ok(overshoot <= 1e-9, `dépassement ${overshoot}`);
    assert.ok(arrivedAt !== null && arrivedAt < Math.abs(to - from) / 6 + 0.35, `${from} → ${to} en ${arrivedAt}`);
  }
  // Un placement hors chaussée est ramené au bord.
  const clamped = stepFrames({ x: 0, seconds: 2, target: 40, bounds: { min: -14.35, max: 14.35 } });
  assert.equal(clamped.x, 14.35);
  assert.equal(cityRushFreeLateralLimit(-1), 0);
  assert.ok(cityRushFreeLateralLimit(0.5) < CITY_RUSH_FREE_STEER_MAX_LATERAL);
  assert.equal(cityRushFreeLateralLimit(20), CITY_RUSH_FREE_STEER_MAX_LATERAL);
  assert.ok(CITY_RUSH_FREE_STEER_ACCEL > 0);
});

test('bord de la chaussée : la voiture bute et coupe sa vitesse sortante', () => {
  const state = stepFrames({ x: 10, seconds: 1, input: 1, bounds: { min: -14.35, max: 14.35 } });
  assert.equal(state.x, 14.35);
  assert.equal(state.velocity, 0);
  assert.equal(state.edge, 'right');
  const left = stepFrames({ x: -10, seconds: 1, input: -1, bounds: { min: -14.35, max: 14.35 } });
  assert.equal(left.x, -14.35);
  assert.equal(left.velocity, 0);
  assert.equal(left.edge, 'left');
  // Repartir du bord vers l'intérieur reste immédiat.
  const back = stepFrames({ x: 14.35, seconds: 0.2, input: -1, bounds: { min: -14.35, max: 14.35 } });
  assert.ok(back.x < 13.5);
});

test('voie du pilote : la plus proche, avec hystérésis sur la ligne', () => {
  const lanes = [...CITY_RUSH_LANE_X];
  assert.equal(cityRushFreeLaneForX(2.5, 0, lanes), 3);
  assert.equal(cityRushFreeLaneForX(-12, 3, lanes), 0);
  assert.equal(cityRushFreeLaneForX(14, 0, lanes), 5);
  // Sur la ligne (x = 0), la voie tenue reste la sienne…
  assert.equal(cityRushFreeLaneForX(0.1, 2, lanes), 2);
  assert.equal(cityRushFreeLaneForX(-0.1, 3, lanes), 3);
  assert.equal(cityRushFreeLaneForX(CITY_RUSH_FREE_LANE_HYSTERESIS - 0.01, 2, lanes), 2);
  // … jusqu'à ce que la caisse ait franchi la ligne de l'hystérésis.
  assert.equal(cityRushFreeLaneForX(CITY_RUSH_FREE_LANE_HYSTERESIS + 0.01, 2, lanes), 3);
  // Une voie tenue invalide retombe sur la plus proche.
  assert.equal(cityRushFreeLaneForX(6.5, 42, lanes), 4);
  assert.equal(cityRushFreeLaneForX(6.5, Number.NaN, lanes), 4);
  assert.equal(cityRushFreeLaneForX(0, 0, []), 0);
  // Balayage aller-retour : la voie ne papillonne pas autour d'une ligne.
  let lane = 2;
  let changes = 0;
  for (let step = 0; step < 400; step += 1) {
    const x = Math.sin(step / 7) * 0.15;
    const next = cityRushFreeLaneForX(x, lane, lanes);
    if (next !== lane) changes += 1;
    lane = next;
  }
  assert.equal(changes, 0);
});

test('voie déduite sur circuit permanent : hystérésis adaptée à l’écart des voies', () => {
  const playerWidth = 1.9 * Math.min(...CITY_RUSH_CARS.map((car) => car.widthScale));
  const trafficHitbox = 1.9 * CITY_RUSH_TRAFFIC_HITBOX_SCALE;
  const contact = (playerWidth + trafficHitbox) / 2;
  for (const id of ['nordschleife', 'touge']) {
    const lanes = laneXsOf(cityRushLaneConfig(course(id)));
    for (let lane = 0; lane < lanes.length; lane += 1) {
      for (let x = lanes[0] - 1; x <= lanes[lanes.length - 1] + 1; x += 0.01) {
        for (const held of [lane, Math.max(0, lane - 1), Math.min(lanes.length - 1, lane + 1)]) {
          if (cityRushFreeLaneForX(x, held, lanes) !== lane) continue;
          assert.ok(Math.abs(x - lanes[lane]) < contact,
            `${id} : voie ${lane} à ${x.toFixed(2)} m, hors de la boîte de contact (${contact.toFixed(2)} m)`);
        }
      }
    }
  }
});

test('voiture à hauteur : la carrosserie bloque le glissement, sans jamais repousser', () => {
  const car = { id: 'taxi', lane: 4, x: 7.5, width: 1.9, gap: 0.8 };
  // Le pilote glisse vers elle depuis la voie 3 : arrêt au contact (5,60 m).
  const blocked = cityRushFreeSideContact({ fromX: 2.5, toX: 6.2, halfWidth: 0.95, cars: [car] });
  assert.ok(near(blocked.x, 7.5 - 1.9), JSON.stringify(blocked));
  assert.equal(blocked.blocker, car);
  // S'en écarter reste libre.
  const away = cityRushFreeSideContact({ fromX: 5.6, toX: 2.0, halfWidth: 0.95, cars: [car] });
  assert.equal(away.x, 2.0);
  assert.equal(away.blocked, false);
  // Un grand pas ne traverse pas la voiture (pas d'effet tunnel).
  const tunnel = cityRushFreeSideContact({ fromX: 2.5, toX: 12.5, halfWidth: 0.95, cars: [car] });
  assert.ok(near(tunnel.x, 5.6));
  // Pas à hauteur (devant ou derrière) : rien ne bloque.
  for (const gap of [CITY_RUSH_SIDE_CONTACT_GAP, -CITY_RUSH_SIDE_CONTACT_GAP - 0.1, 12]) {
    const free = cityRushFreeSideContact({ fromX: 2.5, toX: 6.5, halfWidth: 0.95, cars: [{ ...car, gap }] });
    assert.equal(free.x, 6.5, `écart ${gap}`);
  }
  // Déjà imbriquées (rattrapée par l'arrière) : pas de répulsion, seulement
  // plus d'avancée vers elle.
  const nested = cityRushFreeSideContact({ fromX: 6.2, toX: 6.1, halfWidth: 0.95, cars: [car] });
  assert.equal(nested.x, 6.1, 'reculer reste permis');
  const deeper = cityRushFreeSideContact({ fromX: 6.2, toX: 6.4, halfWidth: 0.95, cars: [car] });
  assert.equal(deeper.x, 6.2, 'aucun pas de plus vers elle');
  // Prise en étau : la position permise respecte les deux voitures.
  const squeeze = cityRushFreeSideContact({
    fromX: 2.5,
    toX: 7,
    halfWidth: 0.95,
    cars: [car, { id: 'bus', lane: 2, x: -2.5, width: 2.2, gap: -1 }],
  });
  assert.ok(near(squeeze.x, 5.6));
  // Données invalides : ignorées.
  const junk = cityRushFreeSideContact({ fromX: 0, toX: 1, cars: [null, { x: 'a', gap: 0 }, { x: 1, gap: Number.NaN }] });
  assert.equal(junk.x, 1);
});

test('parois : zones interdites au centre de la caisse, frôlement toléré', () => {
  // Mini-garage : les parois suivent la largeur du portique — 11,20 m en ville
  // (les deux voies centrales de 5 m), 5,40 m sur un circuit permanent.
  const reach = 0.95 - CITY_RUSH_FREE_WALL_SQUEEZE;
  const cityGarage = cityRushMiniGarageWidth(course('vice-city'));
  const cityInner = cityGarage / 2 - 0.52;
  const cityOuter = cityGarage / 2 - 0.09;
  const garage = cityRushFreeWallZones([[-cityOuter, -cityInner], [cityInner, cityOuter]], 0.95);
  assert.ok(near(garage[0][0], -cityOuter - reach) && near(garage[0][1], -cityInner + reach));
  assert.ok(near(garage[1][0], cityInner - reach) && near(garage[1][1], cityOuter + reach));
  // Les deux voies centrales (±2,50 m) passent dedans, la paroi pousse dehors.
  assert.equal(cityRushFreeAllowedX(2.5, garage, boundsFor('vice-city')), 2.5);
  assert.equal(cityRushFreeAllowedX(-2.5, garage, boundsFor('vice-city')), -2.5);
  assert.ok(near(cityRushFreeAllowedX(cityOuter + 0.1, garage, boundsFor('vice-city')), cityOuter + reach));
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
  const zones = cityRushFreeRampZones(7.5, { halfWidth: 0.95, rampHalfWidth: 1.2 });
  assert.equal(zones.length, 2);
  assert.ok(near(zones[0][0], 7.5 - 2.15) && near(zones[0][1], 7.5 - CITY_RUSH_FREE_RAMP_CATCH));
  assert.ok(near(zones[1][0], 7.5 + CITY_RUSH_FREE_RAMP_CATCH) && near(zones[1][1], 7.5 + 2.15));
  // Au centre de la voie du tremplin, ou à cheval sur sa ligne : rattrapée.
  assert.ok(cityRushFreeRampCatches(7.5, 7.5));
  assert.ok(cityRushFreeRampCatches(7.5 - 1.4, 7.5));
  assert.ok(!cityRushFreeRampCatches(2.5, 7.5), 'la voie voisine passe à côté');
  assert.ok(!cityRushFreeRampCatches('x', 7.5));
  // Dans la bande interdite, la voiture rejoint le côté le plus proche.
  assert.ok(near(cityRushFreeAllowedX(7.5 - 1.6, zones), 7.5 - CITY_RUSH_FREE_RAMP_CATCH));
  assert.ok(near(cityRushFreeAllowedX(7.5 - 2.05, zones), 7.5 - 2.15));
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
  assert.ok(oneLane > CITY_RUSH_LANE_X[3] + CITY_RUSH_LANE_WIDTH - 0.5 && oneLane < CITY_RUSH_LANE_X[3] + CITY_RUSH_LANE_WIDTH + 0.5, `${oneLane}`);
  // Au-delà du bord : la cible reste sur la chaussée.
  assert.equal(cityRushFreeTouchTarget({ startX: 5, startPointer: 0, pointer: 5000, viewportWidth: width, bounds }), bounds.max);
  assert.equal(cityRushFreeTouchTarget({ startX: -5, startPointer: 900, pointer: -900, viewportWidth: width, bounds }), bounds.min);
  // Sans mouvement : la voiture vise sa position de départ.
  assert.equal(cityRushFreeTouchTarget({ startX: 0.4, startPointer: 10, pointer: 10, viewportWidth: width, bounds }), 0.4);
});

test('lecture visuelle : lacet et braquage suivent la vitesse latérale', () => {
  assert.ok(cityRushFreeYaw(5) < 0);
  assert.ok(cityRushFreeYaw(-5) > 0);
  assert.equal(cityRushFreeYaw(0), 0);
  assert.equal(cityRushFreeYaw(500), -CITY_RUSH_FREE_YAW_MAX);
  assert.equal(cityRushFreeYaw(-500), CITY_RUSH_FREE_YAW_MAX);
  assert.ok(cityRushFreeSteerVisual(5) > 0);
  assert.ok(cityRushFreeSteerVisual(-5) < 0);
  assert.equal(cityRushFreeSteerVisual(CITY_RUSH_FREE_STEER_MAX_LATERAL), CITY_RUSH_FREE_STEER_VISUAL_MAX);
  assert.equal(cityRushFreeSteerVisual(-CITY_RUSH_FREE_STEER_MAX_LATERAL), -CITY_RUSH_FREE_STEER_VISUAL_MAX);
  assert.equal(cityRushFreeSteerVisual(0), 0);
});
