import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CITY_RUSH_DISTANCE,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_START_LINE_LEAD,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_BLUE_SHOT_DURATION,
  CITY_RUSH_BLUE_SHOT_MAX_RANGE,
  CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED,
  CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  CITY_RUSH_PISTOL_SPIN_TURNS,
  CITY_RUSH_TRACK_BOOST_DURATION,
  CITY_RUSH_TRACK_BOOST_SPEED_FACTOR,
  CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR,
  CITY_RUSH_TRACK_BOOST_COLOR,
  CITY_RUSH_RACER_VIEW_DISTANCE,
  cityRushLaneConfig,
  nordschleifeReadout,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN,
  CITY_RUSH_TRAFFIC_IMPACT_DURATION,
  CITY_RUSH_TRAFFIC_IMPACT_GAP,
  CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  CITY_RUSH_ONCOMING_COUNT,
  CITY_RUSH_ONCOMING_LANES,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_PICKUP_BURST_DURATION,
  CITY_RUSH_PICKUP_BURST_SHARDS,
  CITY_RUSH_PICKUP_RESPAWN_DELAY,
  CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL,
  CITY_RUSH_PLAYER_HEALTH,
  CITY_RUSH_RACER_HEALTH,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  CITY_RUSH_PLAYER_HEALTH_FLASH,
  CITY_RUSH_WRECK_SECONDS,
  CITY_RUSH_WRECK_SPIN_TURNS,
  CITY_RUSH_POLICE_ATTACK_LEAD,
  CITY_RUSH_POLICE_COLLISION_COOLDOWN,
  CITY_RUSH_POLICE_HEALTH,
  CITY_RUSH_POLICE_DESTROY_SCORE,
  CITY_RUSH_POLICE_BASE_SPEED,
  CITY_RUSH_POLICE_BLOCKADE_HOLD,
  CITY_RUSH_POLICE_COUNT,
  CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
  CITY_RUSH_POLICE_REINFORCEMENT_DELAY,
  CITY_RUSH_POLICE_VEHICLE_TYPES,
  CITY_RUSH_POLICE_FIRE_COOLDOWN,
  CITY_RUSH_POLICE_HUNT_TYPES,
  CITY_RUSH_POLICE_INTERCEPT_RANGE,
  CITY_RUSH_POLICE_LEAD,
  CITY_RUSH_POLICE_LEAD_SLACK,
  CITY_RUSH_POLICE_LOOKAHEAD,
  CITY_RUSH_POLICE_RALLY_BASE_SPEED,
  CITY_RUSH_POLICE_SPAWN_BEHIND,
  CITY_RUSH_POLICE_STEAL_NOTICE,
  CITY_RUSH_POLICE_VIEW_BEHIND,
  CITY_RUSH_POWERS,
  CITY_RUSH_PICKUPS,
  CITY_RUSH_SPRINT_CHECKPOINTS,
  CITY_RUSH_SPRINT_CHECKPOINT_SPACING,
  CITY_RUSH_SPRINT_DISTANCE,
  cityRushSprintCheckpointsPassed,
  cityRushOncomingImpactX,
  addCityRushCharge,
  approachCityRushSpeed,
  cityRushCleanLineFactor,
  cityRushTrafficRecoveryRate,
  cityRushPickupRowCount,
  cityRushSprintCheckpointTime,
  cityRushTrafficViewAhead,
  CITY_RUSH_PICKUP_ROW_SPACING_MIN,
  CITY_RUSH_PICKUP_ROW_SPACING_MAX,
  CITY_RUSH_TRAFFIC_VIEW_BEHIND,
  CITY_RUSH_TRAFFIC_RECOVERY_DURATION,
  cityRushHitDuration,
  chooseCityRushAiLane,
  chooseCityRushPoliceLane,
  cityRushLaneAfterAction,
  cityRushLapCrossings,
  cityRushLapForDistance,
  cityRushLapLength,
  cityRushLapProgress,
  cityRushLineKind,
  cityRushPackLeader,
  cityRushPickupBurstShards,
  cityRushPickupFlashState,
  cityRushPickupPopScale,
  cityRushPickupShardState,
  cityRushPlayerDamage,
  cityRushPoliceCollisionHit,
  cityRushWatchHelicopterPose,
  cityRushPoliceBlocksLeader,
  cityRushPoliceContact,
  cityRushPoliceDamage,
  cityRushPolicePace,
  cityRushPoliceShotsLeft,
  cityRushRaceDistance,
  cityRushTrackElevation,
  cityRushTrackGap,
  cityRushTrackOffset,
  cityRushTrackPitch,
  cityRushTrackYaw,
  cityRushTrackProfile,
  consumeCityRushCharge,
  isCityRushPowerCharged,
  shouldHideCityRushPistolPickup,
  canCollectCityRushPickup,
  createCityRushEncounter,
  createCityRushBoostEncounter,
  createCityRushInventory,
  createCityRushPoliceInventory,
  chooseCityRushTrafficEscapeLane,
  cityRushStraightShotRetaliation,
  cityRushStraightShotSweptHit,
  cityRushStraightShotTarget,
  cityRushStunSpin,
  detectCityRushTrafficImpacts,
  isCityRushPickupHidden,
  markCityRushPickupTaken,
  rankCityRushRacers,
  resolveCityRushCarMovement,
  resolveCityRushPoliceMovement,
  selectCityRushRacers,
  CITY_RUSH_RAMP_COUNT,
  CITY_RUSH_RAMP_WIDTH,
  CITY_RUSH_RAMP_LENGTH,
  CITY_RUSH_RAMP_HEIGHT,
  CITY_RUSH_RAMP_CONTACT_WINDOW,
  CITY_RUSH_RAMP_SPACING_MIN,
  CITY_RUSH_RAMP_SPACING_MAX,
  computeCityRushJumpDistance,
  computeCityRushJumpHeight,
  computeCityRushJumpElevation,
  computeCityRushJumpPitch,
  detectCityRushRampContact,
  cityRushRouteFor,
  shutoC1CoverAt,
  shutoC1Readout,
} from './cityRushRules';
import { cityRushLightRig, cityRushTheme } from './cityRushThemes';
import { createBatch, seededRandom } from './cityRushBuilder';
import { START_ZONE_HALF, buildCityLoop, createStageMaterials, finishLoopGeometry, makeRain, makeRoad, makeSkyDome, makeSkyline } from './cityRushStage';
import { buildShutoExpressway, makeExpresswayRoad } from './shutoC1Stage';
import { buildNordschleifeTrack, makeNordschleifeRoad } from './nordschleifeStage';
import { buildStartComplex, createStartLineDynamics, createStartLineMaterials } from './cityRushStartLine';
import { animateRacerCar, createSmokePool, makeRacerCar, makeTrafficVehicle, setRacerDriver } from './cityRushCars';
import { makeLapBoard, makePickupMaterial } from './cityRushTextures';

const PLAYER_Z = 3.1;
const PLAYER_SPEED = CITY_RUSH_PLAYER_SPEED;
const SCALE = CITY_RUSH_SCROLL_SCALE;
const LAP_UNITS = CITY_RUSH_LAP_LENGTH * SCALE;
const CAMERA_BASE_FOV = 44;
const MAX_FRAME = 0.04;
const POWER_TYPES = [CITY_RUSH_POWERS.BLUE_SHOT, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.RADIO];
// Rayon (en unités monde) de la zone d'effet de l'explosion de l'hélicoptère :
// à peu près une case (une voie) de chaque côté, touchant les adversaires proches.
const EXPLOSION_RADIUS = 3.4;
// Le tir rouge d'AK-47 reprend le projectile droit du tir bleu : chaque
// pression lance une balle, sans guidage, qui s'arrête sur le premier ennemi
// de la voie. Un chargeur ramassé en contient sept.
// Maintien de Z : une balle part à intervalle régulier jusqu'à la relâche ou
// l'épuisement du chargeur, indépendamment de la répétition native du clavier.
const PISTOL_HOLD_FIRE_INTERVAL = 0.12;
// Caméra de poursuite plus basse que l'ancienne vue plongeante (8,8 m) :
// on voit l'horizon, la skyline, les portes et le portique de départ. Tout
// élément qui enjambe la route doit rester au-dessus de 7,1 m.
// Distance (en mètres) sous laquelle le passage d'un rival s'entend.
const PASS_BY_RANGE = 11;
const CHASE_POSITION = new THREE.Vector3(0, 6.6, PLAYER_Z + 13.2);
const CHASE_LOOK = new THREE.Vector3(0, 1.3, PLAYER_Z - 15);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const policeUnitName = (unitNumber, vehicleType = 'police') => (
  vehicleType === 'police-suv' ? `POLICE SUV ${unitNumber}` : `POLICE ${unitNumber}`
);
const lerp = (a, b, amount) => a + (b - a) * amount;
const randomRange = (min, max) => min + Math.random() * (max - min);
const smoothstep = (value) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const skidOffset = (remaining, duration = 0.85, side = 1, amplitude = 0.24, frequency = 17) => {
  const safeDuration = Math.max(0.001, Number(duration) || 0.85);
  return remaining > 0 ? Math.sin((safeDuration - remaining) * frequency) * amplitude * side : 0;
};

// Qualité « allégée » sur les écrans tactiles / WebView Android : pas d'ombres,
// pas de deuxième rangée d'immeubles, pluie plus légère.
function detectLiteQuality() {
  if (typeof window === 'undefined') return false;
  if (window.LetsPlayAndroid) return true;
  try {
    return Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}

// L'éclatement d'un bonus garde son flash et son anneau mais renonce aux éclats
// projetés quand l'utilisateur demande moins de mouvement.
function detectReducedMotion() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.04, ...extra });
}

function makeBoostChevronGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, -0.48);
  shape.lineTo(0.34, -0.48);
  shape.lineTo(0.34, -0.16);
  shape.lineTo(0, 0.5);
  shape.lineTo(-0.34, -0.16);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function makePickupObject(shared) {
  const group = new THREE.Group();
  const icon = new THREE.Mesh(shared.pickupGeometry, shared.pickupMaterials[CITY_RUSH_POWERS.BLUE_SHOT]);
  icon.position.y = 0.15;
  group.add(icon);
  const ring = new THREE.Mesh(shared.pickupRingGeometry, shared.pickupRingMaterials[CITY_RUSH_POWERS.BLUE_SHOT]);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.25;
  group.add(ring);
  const beam = new THREE.Mesh(shared.pickupBeamGeometry, shared.pickupBeamMaterials[CITY_RUSH_POWERS.BLUE_SHOT]);
  beam.position.y = 0.6;
  group.add(beam);
  const halo = new THREE.Mesh(shared.pickupHaloGeometry, shared.pickupBeamMaterials[CITY_RUSH_POWERS.BLUE_SHOT]);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -1.27;
  group.add(halo);

  // Pad turbo posé à plat sur la chaussée : dalle sombre, bord lumineux et
  // trois flèches orientées dans le sens de la route (vers le fond d'écran).
  const pad = new THREE.Group();
  const plate = new THREE.Mesh(shared.boostPadGeometry, shared.boostPadMaterial);
  plate.position.y = 0.04;
  pad.add(plate);
  const edgePositions = [
    [0, 0.09, -1.68, 1.54, 0.018, 0.055],
    [0, 0.09, 1.68, 1.54, 0.018, 0.055],
    [-0.77, 0.09, 0, 0.055, 0.018, 3.34],
    [0.77, 0.09, 0, 0.055, 0.018, 3.34],
  ];
  for (const [x, y, z, width, height, length] of edgePositions) {
    const edge = new THREE.Mesh(shared.boostPadEdgeGeometry, shared.boostPadEdgeMaterial);
    edge.scale.set(width, height, length);
    edge.position.set(x, y, z);
    pad.add(edge);
  }
  const arrows = [];
  for (let index = 0; index < 3; index += 1) {
    const arrow = new THREE.Mesh(shared.boostChevronGeometry, shared.boostChevronMaterial);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.091, -0.96 + index * 0.96);
    pad.add(arrow);
    arrows.push(arrow);
  }
  pad.visible = false;
  pad.userData = { plate, arrows, phase: Math.random() * Math.PI * 2 };
  group.add(pad);
  group.userData = { icon, ring, beam, halo, pad, phase: Math.random() * Math.PI * 2, type: CITY_RUSH_POWERS.BLUE_SHOT };
  return group;
}

function makeSprintCheckpointGate(city, roadHalf = CITY_RUSH_ROAD_HALF_WIDTH) {
  const group = new THREE.Group();
  group.name = 'sprint-checkpoint-gate';

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x101b2b, roughness: 0.35, metalness: 0.68 });
  const accentMaterial = new THREE.MeshBasicMaterial({ color: city.accent, toneMapped: false, fog: false });
  const secondaryMaterial = new THREE.MeshBasicMaterial({ color: city.secondary, toneMapped: false, fog: false });
  const roadMarkMaterial = new THREE.MeshBasicMaterial({ color: city.accent, transparent: true, opacity: 0.76, toneMapped: false, fog: false, depthWrite: false });
  const board = makeLapBoard(city);
  const boardMaterial = new THREE.MeshBasicMaterial({ map: board.texture, toneMapped: false, fog: false, side: THREE.DoubleSide });

  const addBox = (name, material, size, position) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  // Portique néon sur les accotements, assez haut pour laisser passer tout le
  // trafic ; ses deux couleurs alternées restent lisibles de jour comme de nuit.
  // Le portique de sprint enjambe la chaussée du parcours : 7,25 m de chaque
  // côté sur une artère de 13,40 m, 5,35 m sur la piste de 9,20 m du Ring.
  const postX = roadHalf + 0.55;
  // La poutre dépasse les poteaux de 0,325 m, comme sur la ville historique :
  // 7,575 m de demi-portée sur 13,40 m de chaussée, 4,925 m sur les 9,20 m du
  // Ring.
  const beamHalf = postX + 0.325;
  const markHalf = roadHalf - 0.075;
  for (const side of [-1, 1]) {
    addBox('checkpoint-pylon', frameMaterial, [0.56, 7.5, 0.62], [side * postX, 3.75, 0]);
    addBox('checkpoint-pylon-light', side < 0 ? accentMaterial : secondaryMaterial, [0.14, 6.9, 0.66], [side * postX, 3.8, 0.34]);
    addBox('checkpoint-foot', frameMaterial, [1.1, 0.28, 1.0], [side * postX, 0.14, 0]);
  }
  addBox('checkpoint-crossbeam', frameMaterial, [beamHalf * 2, 0.56, 0.68], [0, 7.48, 0]);
  addBox('checkpoint-crossbeam-light', accentMaterial, [beamHalf * 2 - 0.25, 0.12, 0.72], [0, 7.2, 0.04]);
  addBox('checkpoint-sign-frame', frameMaterial, [6.25, 1.8, 0.5], [0, 6.15, 0.34]);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.02, 1.58), boardMaterial);
  sign.name = 'sprint-checkpoint-sign';
  sign.position.set(0, 6.15, 0.62);
  group.add(sign);

  // Deux bandes au ras du bitume matérialisent aussi la ligne de passage, sans
  // masquer les voies ni gêner le ramassage des pads turbo.
  addBox('checkpoint-road-mark', roadMarkMaterial, [markHalf * 2, 0.045, 0.24], [0, 0.055, -0.38]);
  addBox('checkpoint-road-mark', secondaryMaterial, [markHalf * 2, 0.045, 0.16], [0, 0.058, 0.38]);

  group.userData = {
    kind: 'sprint-checkpoint-gate',
    board,
    sign,
    checkpoint: 0,
    targetDistance: 0,
  };
  group.visible = false;
  return group;
}

function makeRampObject(shared, city) {
  const group = new THREE.Group();
  group.name = 'city-rush-ramp';

  const slopeAngle = Math.atan2(0.82, 4.8);

  const deck = new THREE.Mesh(shared.rampDeckGeometry, shared.rampDeckMaterial);
  deck.position.set(0, 0.42, 0);
  deck.rotation.x = slopeAngle;
  group.add(deck);

  const back = new THREE.Mesh(shared.rampFrameGeometry, shared.rampFrameMaterial);
  back.position.set(0, 0.41, -2.38);
  group.add(back);

  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(shared.rampSideGeometry, shared.rampFrameMaterial);
    sideWall.position.set(side * 1.16, 0.48, 0);
    sideWall.rotation.x = slopeAngle;
    group.add(sideWall);

    const sideRail = new THREE.Mesh(shared.rampSideRailGeometry, shared.rampAccentMaterial);
    sideRail.position.set(side * 1.16, 0.58, 0);
    sideRail.rotation.x = slopeAngle;
    group.add(sideRail);
  }

  const lip = new THREE.Mesh(shared.rampLipGeometry, shared.rampSecondaryMaterial);
  lip.position.set(0, 0.84, -2.4);
  group.add(lip);

  const chevrons = [];
  const cosSlope = Math.cos(slopeAngle);
  const sinSlope = Math.sin(slopeAngle);
  for (let i = 0; i < 3; i += 1) {
    const offset = (i - 1) * 1.25;
    const chevron = new THREE.Mesh(shared.boostChevronGeometry, shared.rampChevronMaterial);
    chevron.rotation.x = slopeAngle - Math.PI / 2;
    chevron.position.set(0, 0.42 + 0.048 - offset * sinSlope, offset * cosSlope);
    chevron.scale.set(1.15, 1.15, 1);
    group.add(chevron);
    chevrons.push(chevron);
  }

  const holo = new THREE.Mesh(shared.rampHoloIconGeometry, shared.rampHoloIconMaterial);
  holo.position.set(0, 1.42, -2.4);
  holo.rotation.x = -Math.PI / 6;
  group.add(holo);

  const shadow = new THREE.Mesh(shared.rampShadowGeometry, shared.rampShadowMaterial);
  shadow.position.set(0, 0.012, 0);
  shadow.rotation.x = -Math.PI / 2;
  group.add(shadow);

  group.userData = {
    deck,
    chevrons,
    holo,
    phase: Math.random() * Math.PI * 2,
  };
  return { group, chevrons, holo };
}

function setPickupKind(pickup, type, laneX, shared) {
  pickup.userData.type = type;
  const isBoostPad = type === CITY_RUSH_PICKUPS.BOOST;
  pickup.userData.pad.visible = isBoostPad;
  pickup.userData.pad.scale.set(1, 1, 1);
  pickup.userData.icon.visible = !isBoostPad;
  pickup.userData.ring.visible = !isBoostPad;
  pickup.userData.beam.visible = !isBoostPad;
  pickup.userData.halo.visible = !isBoostPad;
  if (!isBoostPad) {
    pickup.userData.icon.material = shared.pickupMaterials[type];
    pickup.userData.ring.material = shared.pickupRingMaterials[type];
    pickup.userData.beam.material = shared.pickupBeamMaterials[type];
    pickup.userData.halo.material = shared.pickupBeamMaterials[type];
  }
  pickup.position.set(laneX, isBoostPad ? 0 : 1.3, 0);
  // Le bonus (ré)apparaît en gonflant : voir `updatePickupPop`.
  pickup.userData.pop = 0;
  pickup.scale.setScalar(0.001);
  pickup.visible = true;
}

const PICKUP_BURST_POOL = 6;
const BURST_WHITE = new THREE.Color(0xffffff);

// Éclatement d'un bonus ramassé : un flash, un anneau qui s'ouvre et des éclats
// de la couleur du pouvoir repris par la gravité. Les objets vivent dans un
// petit pool, les ramassages s'enchaînant vite en course.
function makePickupBurst() {
  const group = new THREE.Group();
  group.name = 'pickup-burst';
  const shardGeometry = new THREE.OctahedronGeometry(0.16);
  const shardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
  const shards = [];
  for (let index = 0; index < CITY_RUSH_PICKUP_BURST_SHARDS; index += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    shard.scale.set(1, 1.6, 1);
    shard.renderOrder = 3;
    group.add(shard);
    shards.push(shard);
  }
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 6, 24), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = 3;
  group.add(ring);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), coreMaterial);
  core.renderOrder = 4;
  group.add(core);
  group.visible = false;
  group.userData = { shards, shardMaterial, ringMaterial, coreMaterial, ring, core, specs: [], age: 0, active: false, trackDistance: 0 };
  return group;
}

// Fabrique la silhouette de l'hélicoptère d'observation du dernier tour.
function makeHelicopter(parts) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.72, 1.78), parts.heliBody);
  group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.5, 0.62), parts.heliGlass);
  nose.position.set(0, 0.05, -1.08);
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 2.65), parts.heliBody);
  tail.position.set(0, 0.08, 2.05);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.5), parts.heliBody);
  fin.position.set(0, 0.38, 3.18);
  group.add(fin);
  for (const x of [-0.5, 0.5]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), parts.heliTrim);
    skid.position.set(x, -0.63, 0.22);
    group.add(skid);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36, 0.09), parts.heliTrim);
    strut.position.set(x, -0.43, 0.18);
    group.add(strut);
  }
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), parts.heliTrim);
  mast.position.y = 0.67;
  group.add(mast);
  const rotor = new THREE.Group();
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.06, 0.22), parts.heliTrim);
  const bladeB = bladeA.clone();
  bladeB.rotation.y = Math.PI / 2;
  rotor.add(bladeA, bladeB);
  rotor.position.y = 1.05;
  group.add(rotor);
  const tailRotor = new THREE.Group();
  const tailBladeA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.13), parts.heliTrim);
  const tailBladeB = tailBladeA.clone();
  tailBladeB.rotation.z = Math.PI / 2;
  tailRotor.add(tailBladeA, tailBladeB);
  tailRotor.position.set(0, 0.38, 2.92);
  group.add(tailRotor);
  const searchlight = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 10, 1, true), parts.searchlight);
  searchlight.position.set(0, -4.1, -0.4);
  group.add(searchlight);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), parts.heliBeacon);
  beacon.position.set(0, 0.45, 3.1);
  group.add(beacon);
  group.userData = { rotor, tailRotor, beacon };
  group.visible = false;
  return group;
}

// Hélicoptère d'observation du dernier tour : appareil clair, pod caméra sous
// le nez et aucun armement. Il suit la voiture du pilote sans attaquer.
function makeWatchHelicopter(shared) {
  const group = makeHelicopter({
    heliBody: shared.watchHeliBody,
    heliGlass: shared.watchHeliGlass,
    heliTrim: shared.watchHeliTrim,
    heliBeacon: shared.watchHeliBeacon,
    searchlight: shared.watchHeliLight,
  });
  group.name = 'watch-helicopter';
  // Pod caméra : une rotule sous le nez, avec son objectif braqué vers l'avant.
  const pod = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), shared.watchHeliPod);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.18, 10), shared.watchHeliLens);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -0.28;
  pod.add(ball, lens);
  pod.position.set(0, -0.52, -0.95);
  group.add(pod);
  group.userData.pod = pod;
  return group;
}

// Halo rouge et bleu sous le châssis : c'est la marque des poursuivants. Il est
// posé sur les berlines d'interception du dernier tour comme sur la berline de
// police du trafic qui se met à chasser (voir `rallyTrafficPolice`).
function attachPoliceGlow(group) {
  if (group.userData.pursuit) return group.userData.pursuit;
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff2b45, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 5.2), glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.12;
  glow.renderOrder = 2;
  group.add(glow);
  group.userData.pursuit = { glow, glowMaterial };
  return group.userData.pursuit;
}

// Une berline calmée redevient une voiture de trafic ordinaire : le halo
// disparaît avec sa poursuite.
function detachPoliceGlow(group) {
  const pursuit = group.userData?.pursuit;
  if (!pursuit) return;
  group.remove(pursuit.glow);
  pursuit.glow.geometry.dispose();
  pursuit.glowMaterial.dispose();
  delete group.userData.pursuit;
}

// Barre de vie au-dessus du toit : la marque des berlines destructibles.
// Les quatre segments sont de vrais carrés visibles, plutôt qu'un remplissage
// continu : chaque balle rouge en éteint exactement un. L'éclair blanc signale
// le dégât encaissé.
const POLICE_BAR_FULL_COLOR = 0x2be06a;
const POLICE_BAR_LOW_COLOR = 0xffa53d;
const POLICE_BAR_WIDTH = 1.5;
const POLICE_BAR_GAP = 0.06;

function attachPoliceHealthBar(group) {
  if (group.userData.healthBar) return group.userData.healthBar;
  const bar = new THREE.Group();
  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(POLICE_BAR_WIDTH, 0.17),
    new THREE.MeshBasicMaterial({ color: 0x0f1420, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }),
  );
  background.position.z = -0.01;
  const segmentCount = CITY_RUSH_POLICE_HEALTH;
  const segmentWidth = (POLICE_BAR_WIDTH - POLICE_BAR_GAP * (segmentCount - 1)) / segmentCount;
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const segment = new THREE.Mesh(
      new THREE.PlaneGeometry(segmentWidth, 0.1),
      new THREE.MeshBasicMaterial({ color: POLICE_BAR_FULL_COLOR, transparent: true, depthWrite: false, toneMapped: false }),
    );
    segment.position.x = -POLICE_BAR_WIDTH / 2 + segmentWidth / 2 + index * (segmentWidth + POLICE_BAR_GAP);
    segment.position.z = 0.01;
    return segment;
  });
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(POLICE_BAR_WIDTH + 0.14, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  flash.position.z = 0.02;
  bar.add(background, ...segments, flash);
  bar.visible = false;
  bar.rotation.x = 0;
  bar.position.y = 2.35;
  group.add(bar);
  group.userData.healthBar = { bar, segments, flash };
  return group.userData.healthBar;
}

function detachPoliceHealthBar(group) {
  const healthBar = group.userData?.healthBar;
  if (!healthBar) return;
  group.remove(healthBar.bar);
  [...healthBar.bar.children].forEach((child) => {
    child.geometry?.dispose?.();
    child.material?.dispose?.();
  });
  delete group.userData.healthBar;
}

// Véhicule d'interception du dernier tour : berline ou SUV, avec le halo
// rouge et bleu et la barre de vie des unités de poursuite.
function makePolicePursuitCar(vehicleType = 'police') {
  const group = makeTrafficVehicle(vehicleType);
  group.name = vehicleType === 'police-suv' ? 'police-pursuit-suv' : 'police-pursuit';
  attachPoliceGlow(group);
  attachPoliceHealthBar(group);
  return group;
}

function makeImpact(shared) {
  const group = new THREE.Group();
  // Éclair initial : une sphère additive très brillante qui jaillit à l'impact.
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  flash.position.y = 0.95;
  // Boule de feu : cœur orangé qui se dilate puis se dissipe.
  const fireball = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  fireball.position.y = 0.95;
  // Noyau chaud jaune vif à l'intérieur de la boule de feu.
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  inner.position.y = 0.95;
  // Onde de choc au sol : un anneau qui se propage jusqu'au rayon de la zone.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.14, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffb154, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  // Trace noire laissée sur la route (décalage goudronné) qui s'estompe lentement.
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 22),
    new THREE.MeshBasicMaterial({ color: 0x140d0a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.y = 0.02;
  group.add(flash, fireball, inner, ring, scorch);
  group.userData = { flash, fireball, inner, ring, scorch, age: 0 };
  group.visible = false;
  return group;
}

// Anime un ensemble d'explosion (impact d'hélico comme berline détruite) :
// éclair bref, boule de feu, noyau chaud, onde de choc et trace au sol.
function animateExplosion(fx, t) {
  // Éclair initial très bref.
  const flashLife = clamp(t / 0.12, 0, 1);
  fx.userData.flash.scale.setScalar(1.4 + flashLife * 1.2);
  fx.userData.flash.material.opacity = (1 - flashLife) * 0.95;
  // Boule de feu qui se dilate puis se dissipe.
  const fireLife = clamp(t / 0.5, 0, 1);
  fx.userData.fireball.scale.setScalar(0.4 + fireLife * 2.1);
  fx.userData.fireball.material.opacity = (1 - fireLife) * 0.95;
  const innerLife = clamp(t / 0.32, 0, 1);
  fx.userData.inner.scale.setScalar(0.3 + innerLife * 1.2);
  fx.userData.inner.material.opacity = (1 - innerLife);
  // Onde de choc au sol, qui se propage jusqu'au rayon de la zone d'effet.
  const ringLife = clamp(t / 0.55, 0, 1);
  fx.userData.ring.scale.setScalar(0.4 + ringLife * (EXPLOSION_RADIUS / 0.6 - 0.4));
  fx.userData.ring.material.opacity = (1 - ringLife) * 0.9;
  // Trace noire laissée sur la route : apparaît vite, puis s'estompe.
  const scorchLife = clamp(t / 0.6, 0, 1);
  fx.userData.scorch.material.opacity = Math.sin(Math.min(1, scorchLife * 1.6) * Math.PI) * 0.7;
}

// Choc voiture / trafic : flash blanc, étincelles et onde de choc orange.
// Plus discret qu'une explosion, cet effet reste lisible pendant une seconde
// entière et suit les deux carrosseries pendant leur rabat.
function makeTrafficImpactEffect() {
  const group = new THREE.Group();
  group.name = 'traffic-impact';
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb347, transparent: true, opacity: 0, depthWrite: false,
    toneMapped: false,
  });
  const sparkMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdc75, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), flashMaterial);
  flash.position.y = 0.78;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 6, 20), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  group.add(flash, ring);
  const sparks = [];
  for (let index = 0; index < 8; index += 1) {
    const spark = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.52), sparkMaterial);
    spark.userData.angle = (index / 8) * Math.PI * 2;
    spark.userData.lift = 0.45 + (index % 3) * 0.16;
    spark.rotation.y = spark.userData.angle;
    group.add(spark);
    sparks.push(spark);
  }
  group.userData = { flash, ring, sparks, flashMaterial, ringMaterial, sparkMaterial, age: 0, active: false };
  group.visible = false;
  return group;
}

function disposeScene(scene, renderer) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    list.forEach((material) => {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      if (material.uniforms) {
        for (const uniform of Object.values(material.uniforms)) {
          if (uniform?.value?.isTexture) textures.add(uniform.value);
        }
      }
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  renderer.dispose();
  renderer.domElement.remove();
}

/**
 * `audioRef` (facultatif) pointe sur l'instance `CityRushAudio` de la page.
 * Deux usages, et deux seulement :
 *   - le **moteur**, un nœud permanent dont on ne fait suivre que le régime,
 *     une fois par image (le HUD de la page est trop espacé pour ça) ;
 *   - les **bruitages liés à une position** (tir, dérapage, collision,
 *     explosion), déclenchés ici parce que le monde connaît la voie de la
 *     voiture touchée — donc son placement stéréo — au moment exact.
 */
export function createCityRushWorld(mount, city, getCallbacks, selectedCarId = CITY_RUSH_CARS[0].id, audioRef = null, initialRoster = null, raceLaps = CITY_RUSH_LAPS, policeFromStart = false, raceFormat = 'laps') {
  // Sprint : course solo à checkpoints, sans police ni arme ; seuls les pads
  // turbo restent disponibles comme bonus.
  const sprint = raceFormat === 'sprint';
  const effectiveLaps = Number.isFinite(raceLaps) && raceLaps > 0 ? Math.floor(raceLaps) : CITY_RUSH_LAPS;
  // Le dernier tour enchaîne plusieurs boucles : la course est plus longue que
  // `laps` × la boucle. Le décor, lui, reste une boucle de 1 200 m qui se répète.
  const effectiveDistance = sprint ? CITY_RUSH_SPRINT_DISTANCE : cityRushRaceDistance(effectiveLaps);
  const effectivePoliceFromStart = !sprint && Boolean(policeFromStart);
  const theme = cityRushTheme(city.id);
  const lightRig = cityRushLightRig(theme, city);
  const lite = detectLiteQuality();
  const reduceMotion = detectReducedMotion();
  const daylight = Boolean(theme.daylight);
  const cityIndex = Math.max(0, CITY_RUSH_COURSES.findIndex((item) => item.id === city.id));
  const sceneryRandom = seededRandom(cityIndex * 131 + 7);
  // Voies du parcours : six voies à double sens pour les villes et les routes
  // ouvertes, quatre voies resserrées autour de l'axe pour un circuit permanent
  // (le Nordschleife). `oncomingLanes` est alors vide : personne n'arrive de face.
  const courseLanes = cityRushLaneConfig(city);
  const laneCount = courseLanes.laneCount;
  const laneX = courseLanes.laneX;
  const forwardLanes = courseLanes.forwardLanes;
  const oncomingLanes = courseLanes.oncomingLanes;
  const policeLanes = courseLanes.policeLanes;
  const defaultLanes = courseLanes.defaultLanes;
  const playerStartLane = defaultLanes[0];
  // Le tracé de rendu du parcours : deux S très doux pour les villes et les
  // routes, la suite réelle des 73 virages du Ring pour le Nordschleife.
  const trackProfile = cityRushTrackProfile(city);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(city.background);
  const fogColor = new THREE.Color(city.fog).lerp(new THREE.Color(theme.sky.haze), 0.22);
  scene.fog = new THREE.Fog(fogColor, theme.fogNear, theme.fogFar);

  const camera = new THREE.PerspectiveCamera(CAMERA_BASE_FOV, 1, 0.1, 420);
  camera.position.copy(CHASE_POSITION);
  camera.lookAt(CHASE_LOOK);

  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lightRig.exposure;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'city-rush-canvas';
  renderer.domElement.setAttribute('aria-label', `Course de voitures 3D dans ${city.name} : ${effectiveLaps} tours de circuit, change de voie, ramasse des bonus et des boosts au sol, évite le trafic et la police.`);
  mount.appendChild(renderer.domElement);

  // ── Lumières ─────────────────────────────────────────────────────────
  // Le thème décide de l'ambiance : plein jour (Vice City) ou nuit néon.
  const hemi = new THREE.HemisphereLight(lightRig.hemi.sky, lightRig.hemi.ground, lightRig.hemi.intensity);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(lightRig.key.color, lightRig.key.intensity);
  keyLight.position.set(...lightRig.key.position);
  keyLight.target.position.set(0, 0, PLAYER_Z - 10);
  scene.add(keyLight, keyLight.target);
  if (!lite) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 90;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 36;
    keyLight.shadow.camera.bottom = -36;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.normalBias = 0.03;
  }
  const cityRim = new THREE.DirectionalLight(new THREE.Color(lightRig.rim.color), lightRig.rim.intensity);
  cityRim.position.set(...lightRig.rim.position);
  scene.add(cityRim);
  const accentFill = new THREE.PointLight(new THREE.Color(lightRig.fill.color), lightRig.fill.intensity, lightRig.fill.distance, lightRig.fill.decay ?? 2);
  accentFill.position.set(...lightRig.fill.position);
  scene.add(accentFill);
  // En plein jour les phares ne servent à rien : le spot reste éteint.
  const headlamp = new THREE.SpotLight(0xfff0d0, lite ? 0 : lightRig.headlamp, 46, 0.6, 0.75, 1.3);
  headlamp.position.set(0, 0.8, PLAYER_Z - 1.6);
  headlamp.target.position.set(0, 0, PLAYER_Z - 16);
  headlamp.visible = !lite && lightRig.headlamp > 0;
  scene.add(headlamp, headlamp.target);

  // ── Décor : ciel, skyline, route, boucle de 1 200 m + zone de départ ─
  const stageMaterials = createStageMaterials(city, theme, sceneryRandom);
  const startMaterials = createStartLineMaterials(city, theme);
  const loopBatch = createBatch();
  // Un thème « voie rapide » (Tokyo = Shuto Expressway Route 1) construit un
  // anneau de viaduc au lieu d'une rue bordée de boutiques.
  const expressway = Boolean(theme.expressway);
  // Un thème « piste » (Nürburgring Nordschleife) construit un circuit de
  // campagne : glissières, vibreurs, graviers et repères du Ring.
  const raceway = Boolean(theme.raceway);
  const cityRoute = expressway || raceway ? cityRushRouteFor(city.id) : null;
  const expresswayRoute = expressway ? cityRoute : null;
  const loop = expressway
    ? buildShutoExpressway({ city, theme, materials: stageMaterials, batch: loopBatch, cityIndex, lite })
    : raceway
      ? buildNordschleifeTrack({ city, theme, materials: stageMaterials, batch: loopBatch, cityIndex, lite, route: cityRoute })
      : buildCityLoop({ city, theme, materials: stageMaterials, batch: loopBatch, cityIndex, lite });
  buildStartComplex({ city, theme, materials: stageMaterials, startMaterials, batch: loopBatch, random: loop.random, lite });
  const [loopA, loopB] = finishLoopGeometry(loopBatch, scene, trackProfile);
  for (const copy of [loopA, loopB]) {
    copy.traverse((object) => {
      if (!object.isMesh) return;
      object.receiveShadow = true;
      object.castShadow = !lite && !object.material.transparent;
    });
  }
  const sky = makeSkyDome(theme);
  scene.add(sky);
  scene.add(makeSkyline(city, theme, sceneryRandom));
  const road = expressway
    ? makeExpresswayRoad(scene, theme, sceneryRandom, PLAYER_Z)
    : raceway
      ? makeNordschleifeRoad(scene, theme, sceneryRandom, PLAYER_Z, trackProfile)
      : makeRoad(scene, theme, sceneryRandom, PLAYER_Z, trackProfile);
  const rain = makeRain(theme, camera.position.z, lite);
  if (rain) scene.add(rain.object);
  const startLine = createStartLineDynamics({ city, theme, materials: stageMaterials, startMaterials, random: loop.random, lite });
  scene.add(startLine.group);
  const sprintCheckpointGate = sprint ? makeSprintCheckpointGate(city, courseLanes.roadHalf) : null;
  if (sprintCheckpointGate) scene.add(sprintCheckpointGate);
  loop.dynamicProps.forEach((prop) => scene.add(prop.group));
  const smoke = createSmokePool(lite ? 28 : 56);
  scene.add(smoke.group);

  // Éclatements de bonus : un petit pool réutilisé, chaque éclatement restant
  // ancré à sa position sur la piste pour suivre le défilement du décor.
  const pickupBursts = [];
  for (let index = 0; index < PICKUP_BURST_POOL; index += 1) {
    const burst = makePickupBurst();
    scene.add(burst);
    pickupBursts.push(burst);
  }
  let pickupBurstCursor = 0;
  const pickupBurstColor = new THREE.Color();

  const shared = {
    pickupGeometry: new THREE.PlaneGeometry(1.5, 1.5),
    pickupRingGeometry: new THREE.TorusGeometry(0.82, 0.06, 4, 16),
    pickupBeamGeometry: new THREE.PlaneGeometry(0.42, 3.4),
    pickupHaloGeometry: new THREE.CircleGeometry(0.9, 18),
    pickupMaterials: Object.fromEntries(POWER_TYPES.map((type) => [type, makePickupMaterial(type, CITY_RUSH_POWER_RULES[type].color)])),
    pickupRingMaterials: Object.fromEntries(POWER_TYPES.map((type) => [type, new THREE.MeshBasicMaterial({ color: CITY_RUSH_POWER_RULES[type].color, transparent: true, opacity: 0.95, toneMapped: false })])),
    pickupBeamMaterials: Object.fromEntries(POWER_TYPES.map((type) => [type, new THREE.MeshBasicMaterial({ color: CITY_RUSH_POWER_RULES[type].color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })])),
    boostPadGeometry: new THREE.BoxGeometry(1.62, 0.08, 3.4),
    boostPadMaterial: standard(0x09251a, { roughness: 0.38, metalness: 0.48, emissive: 0x0a6336, emissiveIntensity: 0.72 }),
    boostPadEdgeGeometry: new THREE.BoxGeometry(1, 1, 1),
    boostPadEdgeMaterial: new THREE.MeshBasicMaterial({ color: CITY_RUSH_TRACK_BOOST_COLOR, toneMapped: false }),
    boostChevronGeometry: makeBoostChevronGeometry(),
    boostChevronMaterial: new THREE.MeshBasicMaterial({ color: '#d8ffe4', side: THREE.DoubleSide, toneMapped: false }),
    heliBody: standard(0x232d3b, { metalness: 0.48, roughness: 0.4 }),
    heliGlass: standard(0x68dce5, { emissive: 0x185d73, emissiveIntensity: 0.42, metalness: 0.27, roughness: 0.18 }),
    heliTrim: standard(0xf0ce65, { metalness: 0.58, roughness: 0.34 }),
    heliBeacon: new THREE.MeshBasicMaterial({ color: 0xff3b4d, toneMapped: false }),
    searchlight: new THREE.MeshBasicMaterial({ color: 0xfff4cf, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    // L'hélico d'observation du dernier tour : carrosserie claire, bande bleue,
    // pod caméra et feu de veille discret — rien à voir avec l'appareil de
    // frappe, ni dans la livrée ni dans l'armement (il n'en a aucun).
    watchHeliBody: standard(0xe7edf6, { metalness: 0.3, roughness: 0.46 }),
    watchHeliGlass: standard(0x9fdcff, { emissive: 0x1c4f6b, emissiveIntensity: 0.3, metalness: 0.2, roughness: 0.2 }),
    watchHeliTrim: standard(0x1f5fb8, { metalness: 0.5, roughness: 0.36 }),
    watchHeliBeacon: new THREE.MeshBasicMaterial({ color: 0x59e0ff, toneMapped: false }),
    watchHeliPod: standard(0x2b3342, { metalness: 0.52, roughness: 0.38 }),
    watchHeliLens: standard(0x0d2431, { emissive: 0x1d6d8f, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.2 }),
    watchHeliLight: new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    rampDeckGeometry: new THREE.BoxGeometry(2.32, 0.08, 4.87),
    rampFrameGeometry: new THREE.BoxGeometry(2.28, 0.82, 0.1),
    rampSideGeometry: new THREE.BoxGeometry(0.08, 0.22, 4.87),
    rampSideRailGeometry: new THREE.BoxGeometry(0.04, 0.04, 4.88),
    rampLipGeometry: new THREE.BoxGeometry(2.34, 0.08, 0.08),
    rampShadowGeometry: new THREE.PlaneGeometry(2.45, 5.0),
    rampHoloIconGeometry: new THREE.TorusGeometry(0.38, 0.05, 4, 16),
    rampDeckMaterial: standard(0x181e28, { roughness: 0.45, metalness: 0.52, emissive: 0x0a121c, emissiveIntensity: 0.4 }),
    rampFrameMaterial: standard(0x0e141d, { roughness: 0.3, metalness: 0.75 }),
    rampAccentMaterial: new THREE.MeshBasicMaterial({ color: city.accent, toneMapped: false, fog: false }),
    rampSecondaryMaterial: new THREE.MeshBasicMaterial({ color: city.secondary, toneMapped: false, fog: false }),
    rampChevronMaterial: new THREE.MeshBasicMaterial({ color: '#ffea33', side: THREE.DoubleSide, toneMapped: false }),
    rampHoloIconMaterial: new THREE.MeshBasicMaterial({ color: city.secondary, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    rampShadowMaterial: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }),
  };

  const playerDropShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 3.8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
  );
  playerDropShadow.rotation.x = -Math.PI / 2;
  playerDropShadow.visible = false;
  scene.add(playerDropShadow);

  // ── Voitures ─────────────────────────────────────────────────────────
  // Le roster reste attaché aux voitures pour les noms, drapeaux et avatars du
  // classement ; les coupés de course sont fermés et sans personnage visible.
  let currentRoster = Array.isArray(initialRoster) && initialRoster.length === 3
    ? initialRoster
    : selectCityRushRacers({ cityId: city.id, carId: selectedCarId });
  let playerDriver = currentRoster.find((item) => item.id === 'player') || currentRoster[0];

  const playerProfile = CITY_RUSH_CARS.find((car) => car.id === selectedCarId) || CITY_RUSH_CARS[0];
  // Vitesse de pointe de la voiture engagée : elle règle le streaming (trafic,
  // contresens, rangées de bonus) et le chrono du Sprint. Les trois systèmes
  // étaient calibrés sur une seule vitesse ; ils suivent désormais le modèle.
  const playerTopSpeed = PLAYER_SPEED * playerProfile.powerMultiplier;
  const trafficViewAhead = cityRushTrafficViewAhead(playerTopSpeed);
  const oncomingViewAhead = cityRushTrafficViewAhead(
    playerTopSpeed + Math.max(...CITY_RUSH_TRAFFIC_TYPES.map((spec) => spec.speed)),
  );
  // Le chrono du Sprint suit la voiture : à la vitesse de référence il vaut
  // toujours les 15 s historiques, mais la citadine (83 km/h) a besoin de plus
  // de temps et la supercar de moins pour garder la même pression.
  const sprintTimeBonus = cityRushSprintCheckpointTime(playerTopSpeed);
  const rivalProfiles = CITY_RUSH_CARS.filter((car) => car.id !== playerProfile.id);
  const playerCar = makeRacerCar(playerProfile, {
    player: true,
    number: CITY_RUSH_CARS.indexOf(playerProfile) + 1,
    daylight,
    driver: playerDriver,
  });
  playerCar.position.set(laneX(playerStartLane), 0, PLAYER_Z);
  scene.add(playerCar);

  // Le Sprint se court en solo, contre le chrono : aucun rival en piste.
  const racerSpecs = sprint ? [] : [
    { id: 'nova', lane: defaultLanes[1], phase: 0.6, changeIn: 1.4, skidSide: 1 },
    { id: 'juno', lane: defaultLanes[2], phase: 2.4, changeIn: 2.1, skidSide: -1 },
  ];
  const racers = racerSpecs.map((spec, index) => {
    const profile = rivalProfiles[index];
    const driver = currentRoster.find((item) => item.id === spec.id) || currentRoster[index + 1];
    return {
      ...spec,
      driverId: driver.driverId,
      name: driver.name,
      displayName: driver.displayName,
      country: driver.country,
      countryCode: driver.countryCode,
      flag: driver.flag,
      avatar: driver.avatar,
      accent: driver.accent,
      profile,
      distance: 0,
      lap: 1,
      health: CITY_RUSH_RACER_HEALTH,
      healthFlash: 0,
      wrecked: false,
      baseSpeed: PLAYER_SPEED * profile.powerMultiplier,
      currentSpeed: 0,
      mesh: makeRacerCar(profile, { player: false, number: CITY_RUSH_CARS.indexOf(profile) + 1, daylight, driver }),
      currentX: laneX(spec.lane),
      slowLeft: 0,
      blueShotSlowLeft: 0,
      trafficRecoverLeft: 0,
      trafficImpactLeft: 0,
      boostLeft: 0,
      stunLeft: 0,
      stunTotal: 0,
      spinLeft: 0,
      spinTotal: 0,
      skidLeft: 0,
      skidDuration: 0.85,
      inventory: createCityRushInventory(),
      powerCooldown: 0,
      smokeTimer: 0,
      finalLapAnnounced: false,
    };
  });
  racers.forEach((racer) => scene.add(racer.mesh));

  function applyRoster(nextRoster) {
    if (!Array.isArray(nextRoster) || nextRoster.length < 3) return;
    currentRoster = nextRoster;
    playerDriver = currentRoster.find((item) => item.id === 'player') || currentRoster[0];
    // Le roster actualise l'identité affichée par le HUD ; les voitures restent
    // volontairement vides, conformément aux modèles fermés du garage.
    setRacerDriver(playerCar, playerDriver);
    racers.forEach((racer, index) => {
      const driver = currentRoster.find((item) => item.id === racer.id) || currentRoster[index + 1];
      if (!driver) return;
      racer.driverId = driver.driverId;
      racer.name = driver.name;
      racer.displayName = driver.displayName;
      racer.country = driver.country;
      racer.countryCode = driver.countryCode;
      racer.flag = driver.flag;
      racer.avatar = driver.avatar;
      racer.accent = driver.accent;
      setRacerDriver(racer.mesh, driver);
    });
  }

  // Pas une seule voiture de police dans le trafic du Sprint. Certains
  // parcours (routes de campagne peu fréquentées comme la Mexique) réduisent
  // fortement le nombre de véhicules grâce à `trafficCount`/`oncomingCount`.
  // Un parcours peut restreindre son trafic (le Ring ne voit ni camion-poubelle
  // ni berline de ville) : `trafficTypes` liste alors les modèles autorisés.
  const courseTrafficTypes = Array.isArray(city.trafficTypes) && city.trafficTypes.length
    ? CITY_RUSH_TRAFFIC_TYPES.filter((spec) => city.trafficTypes.includes(spec.id))
    : [];
  const allowedTrafficTypes = courseTrafficTypes.length ? courseTrafficTypes : CITY_RUSH_TRAFFIC_TYPES;
  const trafficTypes = sprint ? allowedTrafficTypes.filter((spec) => spec.id !== 'police') : allowedTrafficTypes;
  const cityTrafficCount = Math.max(0, Math.min(CITY_RUSH_TRAFFIC_COUNT, Number(city.trafficCount)));
  const effectiveTrafficCount = Number.isFinite(cityTrafficCount) && cityTrafficCount > 0 ? cityTrafficCount : CITY_RUSH_TRAFFIC_COUNT;
  const cityOncomingCount = Math.max(0, Math.min(CITY_RUSH_ONCOMING_COUNT, Number(city.oncomingCount)));
  const effectiveOncomingCount = Number.isFinite(cityOncomingCount) && cityOncomingCount >= 0 ? cityOncomingCount : CITY_RUSH_ONCOMING_COUNT;
  const trafficCars = Array.from({ length: effectiveTrafficCount }, (_, index) => {
    const spec = trafficTypes[index % trafficTypes.length];
    const mesh = makeTrafficVehicle(spec.id);
    scene.add(mesh);
    return {
      ...spec,
      // `type` = identifiant du modèle (`police`, `ambulance`…) : c'est lui
      // qui décide si un contact déclenche une poursuite.
      type: spec.id,
      id: `traffic-${index}`,
      mesh,
      distance: 0,
      // Répartit les quelques véhicules du trafic sur les trois voies sans
      // s'appuyer sur CITY_RUSH_TRAFFIC_LANES (dimensionné pour 8 voitures).
      lane: forwardLanes[index % forwardLanes.length],
      currentX: 0,
      baseSpeed: spec.speed * randomRange(0.94, 1.06),
      currentSpeed: spec.speed,
      impactLeft: 0,
      impactCooldownLeft: 0,
      impactChanging: false,
      impactFromLane: null,
      impactTargetLane: null,
      phase: index * 0.9,
      // Une berline de police percutée quitte la ronde : elle est alors pilotée
      // par la chasse (`activePursuers`) au lieu du flot lent.
      rallied: false,
    };
  });

  // ── Trafic venant en face ─────────────────────────────────────────────
  // Les trois voies de gauche sont en sens inverse : ces véhicules arrivent
  // face à la course, puis reparaissent au loin une fois passés derrière les
  // pilotes. Un véhicule percuté dévie vers le bord sans quitter la chaussée.
  const oncomingCars = Array.from({ length: effectiveOncomingCount }, (_, index) => {
    const spec = trafficTypes[(index + 2) % trafficTypes.length];
    const mesh = makeTrafficVehicle(spec.id);
    scene.add(mesh);
    return {
      ...spec,
      type: spec.id,
      id: `oncoming-${index}`,
      mesh,
      distance: 0,
      lane: oncomingLanes[index % oncomingLanes.length],
      currentX: 0,
      baseSpeed: spec.speed * randomRange(0.94, 1.1),
      currentSpeed: spec.speed,
      impactCooldownLeft: 0,
      pushedAside: false,
      pushAsideElapsed: 0,
      pushAsideStartX: null,
      phase: index * 1.3,
      lastPassGap: undefined,
    };
  });

  // ── L'escouade de police et ses renforts ciblés ────────────────────────
  // Trois voitures poursuivent le joueur. Deux unités supplémentaires sont
  // gardées en réserve, une par rival ; elles ne sortent que si ce rival tire
  // sur une voiture de police, puis ne le lâchent plus lui.
  const policeCars = Array.from({ length: CITY_RUSH_POLICE_COUNT + racers.length }, (_, index) => {
    const squad = index < CITY_RUSH_POLICE_COUNT;
    const rivalIndex = index - CITY_RUSH_POLICE_COUNT;
    const lane = policeLanes[index % policeLanes.length];
    const vehicleType = CITY_RUSH_POLICE_VEHICLE_TYPES[index % CITY_RUSH_POLICE_VEHICLE_TYPES.length];
    const mesh = makePolicePursuitCar(vehicleType);
    mesh.visible = false;
    scene.add(mesh);
    return {
      id: `police-${index + 1}`,
      name: policeUnitName(index + 1, vehicleType),
      unitNumber: index + 1,
      vehicleType,
      index,
      squad,
      reserveForId: squad ? null : racers[rivalIndex]?.id || null,
      rallied: false,
      targetId: null,
      mesh,
      lane,
      currentX: laneX(lane),
      distance: 0,
      currentSpeed: 0,
      baseSpeed: CITY_RUSH_POLICE_BASE_SPEED * (index % CITY_RUSH_POLICE_COUNT === 0 ? 1 : 0.97),
      phase: index * 1.7,
      changeIn: 0.25 + index * 0.4,
      slowLeft: 0,
      blueShotSlowLeft: 0,
      trafficImpactLeft: 0,
      boostLeft: 0,
      stunLeft: 0,
      stunTotal: 0,
      skidLeft: 0,
      skidDuration: 0.85,
      powerCooldown: 0,
      inventory: createCityRushPoliceInventory(),
      active: false,
      everDeployed: false,
      reinforcementPending: false,
      reinforcement: false,
      health: CITY_RUSH_POLICE_HEALTH,
      healthFlash: 0,
      mode: 'hunt',
      blockLeft: 0,
      blockArmed: true,
      collisionCooldownLeft: 0,
      homeLane: lane,
      width: Number(mesh.userData.width) || 1.94,
      lastPassGap: undefined,
    };
  });
  let policeDeployed = false;
  // Les trois unités de base et les voitures réservées aux rivaux ont déjà
  // leur numéro ; les remplaçantes suivantes commencent après toute la réserve.
  let nextPoliceUnitNumber = policeCars.length + 1;
  let policeReinforcementTimer = 0;
  const policeReinforcementQueue = [];
  const policeRetaliationByAttacker = new Map();

  // ── Barres de vie des voitures de course ───────────────────────────────
  // Le joueur et ses rivaux partent avec quinze cellules, affichées dès le
  // départ effectif. Chaque tir réussi leur retire une cellule. Le tir rouge
  // n'entraîne ni dérapage ni ralentissement ; un carambolage de police ne
  // touche pas la barre du joueur, mais retire un point de vie à la police.
  let playerHealth = CITY_RUSH_PLAYER_HEALTH;
  let playerHealthActive = false;
  let playerHealthFlash = 0;
  // Épave : barre à zéro. La voiture tourne sur elle-même dans sa fumée, perd
  // toute vitesse, puis la course est déclarée perdue (`finishRace`).
  let playerWrecked = false;
  let playerWreckLeft = 0;
  let playerWreckSpinTurns = CITY_RUSH_WRECK_SPIN_TURNS;
  // L'hélico d'observation du dernier tour : il se pose dans le ciel, suit le
  // pilote, puis s'éloigne en montant une fois la ligne franchie.
  let watchHeliLeaving = 0;
  let watchHeliAge = 0;
  const watchHeliScratch = new THREE.Vector3();

  // ── Les poursuivants, tous formats ─────────────────────────────────────
  // L'escouade du dernier tour et la police du trafic « passée à l'attaque »
  // partagent le même comportement : `activePursuers()` est la liste sur
  // laquelle travaillent le HUD, les collisions, la chasse et la mini-carte.
  const ralliedCars = [];
  const activePursuers = () => {
    const squad = policeCars.filter((police) => police.active);
    return ralliedCars.length ? [...squad, ...ralliedCars] : squad;
  };
  // Le trafic qui roule encore sa ronde : une berline passée à l'attaque est
  // pilotée par la chasse, plus par le flot lent ; une berline détruite reste
  // hors course, invisible et sans collision.
  const rollingTraffic = () => trafficCars.filter((traffic) => !traffic.rallied && !traffic.destroyed);
  const activePursuerById = (id) => activePursuers().find((police) => police.id === id) || null;

  const rows = [];
  // Le nombre de rangées semées devant le pilote suit la voiture : à 180 km/h,
  // douze rangées (≈ 340 m) ne laissent plus que six secondes d'anticipation.
  const pickupRowCount = cityRushPickupRowCount(playerTopSpeed);
  for (let index = 0; index < pickupRowCount; index += 1) {
    const group = new THREE.Group();
    const slots = [makePickupObject(shared), makePickupObject(shared)];
    slots.forEach((slot) => group.add(slot));
    scene.add(group);
    rows.push({ index, group, slots, trackDistance: 0, pickups: [], pickupClaims: new Map(), crossedRacers: new Set() });
  }

  const ramps = [];
  for (let index = 0; index < CITY_RUSH_RAMP_COUNT; index += 1) {
    const rampObj = makeRampObject(shared, city);
    scene.add(rampObj.group);
    ramps.push({
      index,
      group: rampObj.group,
      chevrons: rampObj.chevrons,
      holo: rampObj.holo,
      trackDistance: 0,
      lane: forwardLanes[index % forwardLanes.length],
      phase: index * 1.3,
    });
  }
  let lastRampDistanceSlot = 0;
  let playerJumpState = { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0, overpassTriggered: false };
  let playerLandingBounce = 0;

  const actionPulses = [];
  const straightShots = [];
  const trafficImpacts = Array.from({ length: 6 }, () => makeTrafficImpactEffect());
  trafficImpacts.forEach((effect) => scene.add(effect));
  // L'appareil qui filme le dernier tour : il suit le pilote à distance, sans
  // jamais tirer ni gêner la course.
  const watchHelicopter = makeWatchHelicopter(shared);
  scene.add(watchHelicopter);
  let trafficImpactCursor = 0;
  let lastDistanceSlot = 0;
  let lastTrafficDistanceSlot = 0;
  let policeStealNoticeCooldown = 0;
  let policeBlockNoticeCooldown = 0;

  let active = false;
  let phase = 'intro';
  let elapsed = 0;
  let clockTime = 0;
  let distance = 0;
  // La logique de course reste exprimée en mètres et en voies droites. Ces
  // trois aides ne servent qu'à projeter cette progression sur la route qui
  // ondule doucement sous la caméra.
  const trackRelativeX = (trackDistance) => trackProfile.offset(trackDistance) - trackProfile.offset(distance);
  const trackRelativeY = (trackDistance) => trackProfile.elevation(trackDistance) - trackProfile.elevation(distance);
  const trackPitch = (trackDistance) => trackProfile.pitch(trackDistance);
  const trackYaw = (trackDistance) => trackProfile.yaw(trackDistance);
  let lap = 1;
  // Dernière ligne annoncée (1 = fin du tour 1 …) : un choc frontal peut recaler
  // le joueur derrière une ligne qu'il vient de franchir ; en la repassant il ne
  // doit pas déclencher une seconde fois bannière, cloche et tableau.
  let lastLineCrossed = 0;
  // Sprint : checkpoints franchis et secondes restantes au chrono.
  let sprintCheckpoints = 0;
  let sprintDisplayedCheckpoint = 0;
  let sprintTimeLeft = sprintTimeBonus;
  let playerLane = playerStartLane;
  let playerX = laneX(playerLane);
  let playerSlowLeft = 0;
  let playerBlueShotSlowLeft = 0;
  let playerTrafficRecoverLeft = 0;
  let playerTrafficImpactLeft = 0;
  let playerBoostLeft = 0;
  let playerStunLeft = 0;
  let playerStunTotal = 0;
  let playerSkidLeft = 0;
  let playerSkidDuration = 0.85;
  let playerSkidSide = 1;
  // Conduite en ligne : changer de voie ne ralentit pas, mais cela remet à
  // zéro le bonus de vitesse « ligne propre » chargé en tenant sa voie.
  let playerCleanLineTime = 0;
  let score = 0;
  let pickedUp = 0;
  let inventory = createCityRushInventory();
  let pistolKeyHeld = false;
  let pistolHoldCooldown = 0;
  let finished = false;
  let lastHudAt = 0;
  let lastFrame = performance.now();
  let raf = 0;
  let currentSpeed = 0;
  let playerCurrentSpeed = 0;
  let randomSeed = Math.random;
  let launchSmokeLeft = 0;
  let playerSmokeTimer = 0;
  let coastSpeed = 0;
  let introAngle = Math.PI * 0.82;
  let countdownTime = 0;
  let finishTime = 0;
  let cameraKick = 0;
  let fovOffset = 0;
  const releasePistolKey = () => {
    pistolKeyHeld = false;
    pistolHoldCooldown = 0;
  };
  const cameraTarget = new THREE.Vector3().copy(CHASE_POSITION);
  const lookTarget = new THREE.Vector3().copy(CHASE_LOOK);
  const lookCurrent = new THREE.Vector3().copy(CHASE_LOOK);
  const scratch = new THREE.Vector3();

  const makeRacerRows = () => [
    {
      id: 'player',
      isPlayer: true,
      driverId: playerDriver.driverId,
      name: playerDriver.name,
      displayName: playerDriver.displayName,
      country: playerDriver.country,
      countryCode: playerDriver.countryCode,
      flag: playerDriver.flag,
      avatar: playerDriver.avatar,
      accent: playerDriver.accent,
      distance,
      rawDistance: distance,
      lane: playerLane,
      x: playerX,
      mesh: playerCar,
      lap,
      health: playerHealth,
      maxHealth: CITY_RUSH_PLAYER_HEALTH,
      healthFlash: playerHealthFlash,
      wrecked: playerWrecked,
    },
    ...racers.map((racer) => ({
      id: racer.id,
      isPlayer: false,
      driverId: racer.driverId,
      name: racer.name,
      displayName: racer.displayName,
      country: racer.country,
      countryCode: racer.countryCode,
      flag: racer.flag,
      avatar: racer.avatar,
      accent: racer.accent,
      distance: racer.distance,
      rawDistance: racer.distance,
      lane: racer.lane,
      x: racer.currentX,
      mesh: racer.mesh,
      lap: racer.lap,
      health: racer.health,
      maxHealth: CITY_RUSH_RACER_HEALTH,
      healthFlash: racer.healthFlash,
      wrecked: racer.wrecked,
    })),
  ];

  function setupEncounter(row) {
    // Le parcours décide du nombre de voies : sur le Ring, les bonus
    // n'apparaissent que dans les deux voies de la piste.
    const encounter = sprint
      ? (row.index % CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL === 0
        ? createCityRushBoostEncounter(randomSeed, city)
        : { pickups: [] })
      : createCityRushEncounter(randomSeed, laneCount);
    row.pickups = encounter.pickups;
    row.pickupClaims.clear();
    row.crossedRacers.clear();
    row.slots.forEach((slot, index) => {
      const pickup = row.pickups[index];
      if (!pickup) {
        slot.visible = false;
        return;
      }
      setPickupKind(slot, pickup.type, laneX(pickup.lane), shared);
    });
  }

  function setRowsToStart() {
    let next = 48;
    for (const row of rows) {
      row.trackDistance = next;
      setupEncounter(row);
      row.group.position.set(trackRelativeX(row.trackDistance), trackRelativeY(row.trackDistance), PLAYER_Z - (row.trackDistance - distance) * SCALE);
      row.group.rotation.x = trackPitch(row.trackDistance);
      next += randomRange(CITY_RUSH_PICKUP_ROW_SPACING_MIN, CITY_RUSH_PICKUP_ROW_SPACING_MAX);
    }
    lastDistanceSlot = next;
  }

  function setRampsToStart() {
    let next = 65;
    for (let i = 0; i < ramps.length; i += 1) {
      const ramp = ramps[i];
      ramp.trackDistance = next;
      ramp.lane = forwardLanes[i % forwardLanes.length];
      const z = PLAYER_Z - (ramp.trackDistance - distance) * SCALE;
      ramp.group.position.set(laneX(ramp.lane) + trackRelativeX(ramp.trackDistance), trackRelativeY(ramp.trackDistance), z);
      ramp.group.rotation.set(trackPitch(ramp.trackDistance), trackYaw(ramp.trackDistance), 0);
      ramp.group.visible = true;
      next += randomRange(CITY_RUSH_RAMP_SPACING_MIN, CITY_RUSH_RAMP_SPACING_MAX);
    }
    lastRampDistanceSlot = next;
  }

  function updateRamps(dt) {
    for (let i = 0; i < ramps.length; i += 1) {
      const ramp = ramps[i];
      if (ramp.trackDistance < distance - 25) {
        ramp.trackDistance = lastRampDistanceSlot + randomRange(CITY_RUSH_RAMP_SPACING_MIN, CITY_RUSH_RAMP_SPACING_MAX);
        lastRampDistanceSlot = ramp.trackDistance;
        const currentIdx = forwardLanes.indexOf(ramp.lane);
        ramp.lane = forwardLanes[(currentIdx + 1) % forwardLanes.length];
      }
      const gap = ramp.trackDistance - distance;
      const z = PLAYER_Z - gap * SCALE;
      ramp.group.position.set(laneX(ramp.lane) + trackRelativeX(ramp.trackDistance), trackRelativeY(ramp.trackDistance), z);
      ramp.group.rotation.set(trackPitch(ramp.trackDistance), trackYaw(ramp.trackDistance), 0);
      ramp.group.visible = gap > -25 && gap * SCALE < theme.fogFar + 20;

      if (ramp.group.visible) {
        for (let c = 0; c < ramp.chevrons.length; c += 1) {
          const chevron = ramp.chevrons[c];
          const pulse = 0.88 + Math.sin(clockTime * 7 + ramp.phase + c * 1.1) * 0.16;
          chevron.scale.set(pulse, pulse, 1);
        }
        if (ramp.holo) {
          ramp.holo.rotation.z = clockTime * 1.5;
          ramp.holo.position.y = 1.42 + Math.sin(clockTime * 3.2 + ramp.phase) * 0.06;
        }
      }
    }
  }

  // ── Environnement de la voie rapide ────────────────────────────────────
  // Sous les voûtes de 北の丸, 千代田 et 汐留, la pluie s'arrête, les phares
  // montent, le brouillard se resserre et l'exposition baisse : on retrouve
  // l'enfermement d'un tunnel de la Shuto sans toucher au rendu global. Dans
  // la tranchée de 霞が関, l'effet est atténué (le ciel reste visible).
  const tunnelCover = { amount: 0, reset: false };
  const openFogNear = theme.fogNear;
  const openFogFar = theme.fogFar;
  const openFogColor = scene.fog.color.clone();
  const tunnelFogColor = new THREE.Color(expressway ? theme.expressway.tunnel?.wall ?? 0x14161d : 0x14161d);
  const openExposure = renderer.toneMappingExposure;
  const openHemi = hemi.intensity;
  const openKey = keyLight.intensity;
  const openRim = cityRim.intensity;
  const openHeadlamp = lightRig.headlamp;

  // Position sur la boucle de 1 200 m (et non progression du tour) : au grand
  // dernier tour, les secteurs de la C1 continuent de défiler une fois par
  // boucle, comme les portiques du décor.
  const shutoLoopProgress = () => (((distance % CITY_RUSH_LAP_LENGTH) + CITY_RUSH_LAP_LENGTH) % CITY_RUSH_LAP_LENGTH) / CITY_RUSH_LAP_LENGTH;

  function updateExpresswayEnvironment(dt) {
    if (!expresswayRoute) return;
    const cover = shutoC1CoverAt(shutoLoopProgress(), expresswayRoute);
    const target = cover.kind === 'tunnel' ? 1 : cover.kind === 'cut' ? 0.4 : 0;
    tunnelCover.amount += (target - tunnelCover.amount) * Math.min(1, Math.max(0, dt) * 2.6);
    const amount = tunnelCover.amount;
    if (amount < 0.002 && target === 0) {
      if (tunnelCover.reset) {
        scene.fog.near = openFogNear;
        scene.fog.far = openFogFar;
        scene.fog.color.copy(openFogColor);
        renderer.toneMappingExposure = openExposure;
        hemi.intensity = openHemi;
        keyLight.intensity = openKey;
        cityRim.intensity = openRim;
        headlamp.intensity = openHeadlamp;
        headlamp.visible = !lite && openHeadlamp > 0;
        if (rain) rain.object.visible = true;
        tunnelCover.reset = false;
      }
      return;
    }
    tunnelCover.reset = true;
    scene.fog.near = lerp(openFogNear, 5, amount);
    scene.fog.far = lerp(openFogFar, 96, amount);
    scene.fog.color.copy(openFogColor).lerp(tunnelFogColor, amount * 0.85);
    renderer.toneMappingExposure = lerp(openExposure, openExposure * 0.74, amount);
    hemi.intensity = lerp(openHemi, openHemi * 0.4, amount);
    keyLight.intensity = lerp(openKey, openKey * 0.35, amount);
    cityRim.intensity = lerp(openRim, openRim * 0.5, amount);
    headlamp.visible = !lite && (openHeadlamp > 0 || amount > 0.06);
    headlamp.intensity = lerp(openHeadlamp, openHeadlamp * 1.35 + 2.4, amount);
    if (rain) rain.object.visible = amount < 0.55;
  }

  /** Lecture de la route officielle (C1) pour le HUD : secteur, km, jonction. */
  function shutoRouteHud() {
    const readout = shutoC1Readout(shutoLoopProgress(), cityRoute);
    if (!readout.sector) return null;
    return {
      marker: readout.marker,
      direction: readout.direction,
      directionRomaji: readout.directionRomaji,
      speedLimit: readout.speedLimit,
      km: readout.km,
      sector: readout.sector,
      cover: readout.cover,
      next: readout.next,
    };
  }

  /**
   * Lecture du tableau de bord du Ring : secteur réel, kilomètre officiel,
   * altitude du point traversé et surface (béton de la virole, crête, herbe).
   */
  function nordschleifeRouteHud() {
    const readout = nordschleifeReadout(shutoLoopProgress(), cityRoute);
    if (!readout.sector) return null;
    return {
      marker: readout.marker,
      direction: readout.direction,
      directionRomaji: readout.directionRomaji,
      speedLimit: readout.speedLimit,
      km: readout.km,
      altitudeM: readout.altitudeM,
      sector: readout.sector,
      tag: readout.surface === 'concrete'
        ? 'BÉTON · VIROLE'
        : readout.sector.kind === 'summit'
          ? `SOMMET · ${readout.altitudeM} M`
          : readout.sector.kind === 'low'
            ? `POINT BAS · ${readout.altitudeM} M`
            : null,
      next: readout.next,
    };
  }

  /** Panneau de route officielle affiché par le HUD, quel que soit le parcours. */
  function courseRouteHud() {
    if (!cityRoute) return null;
    return expressway ? shutoRouteHud() : raceway ? nordschleifeRouteHud() : null;
  }

  function emitHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHudAt < 100) return;
    lastHudAt = now;
    const standings = rankCityRushRacers(makeRacerRows());
    // `lap` ne recule jamais : un choc frontal peut recaler le joueur juste
    // derrière la ligne qu'il vient de franchir. Il est alors à 0 m de son tour,
    // pas à 99 % du précédent.
    const lapProgress = distance < (lap - 1) * CITY_RUSH_LAP_LENGTH
      ? 0
      : cityRushLapProgress(distance, CITY_RUSH_LAP_LENGTH, effectiveLaps);
    // Longueur du tour en cours : une boucle, mais tout le grand dernier tour au
    // dernier tour — la jauge et le compteur « 412 / 1200 m » suivent.
    const currentLapLength = cityRushLapLength(lap, effectiveLaps);
    getCallbacks().hud?.({
      distance: Math.max(0, Math.round(distance)),
      totalDistance: effectiveDistance,
      sprint: sprint ? {
        checkpoints: sprintCheckpoints,
        total: CITY_RUSH_SPRINT_CHECKPOINTS,
        timeLeft: Math.max(0, sprintTimeLeft),
        timeTotal: sprintTimeBonus,
        nextIn: Math.max(0, Math.round((sprintCheckpoints + 1) * CITY_RUSH_SPRINT_CHECKPOINT_SPACING - distance)),
      } : null,
      progress: clamp(distance / effectiveDistance, 0, 1),
      lap,
      laps: effectiveLaps,
      lapLength: currentLapLength,
      lapProgress,
      lapDistance: Math.max(0, Math.round(lapProgress * currentLapLength)),
      // Route officielle quand la ville en a une (Shuto C1 de Tokyo) : le
      // secteur courant, le point kilométrique, la couverture (tunnel ou
      // tranchée) et la prochaine jonction annoncée par les portiques.
      route: courseRouteHud(),
      elapsed,
      speed: Math.max(0, Math.round(currentSpeed * 3.6)),
      isJumping: Boolean(playerJumpState.active),
      jumpProgress: playerJumpState.progress || 0,
      jumpHeight: playerCar.position.y || 0,
      rank: standings.rank,
      racers: standings.ordered.map((racer, index) => ({
        id: racer.id,
        isPlayer: racer.id === 'player',
        driverId: racer.driverId,
        name: racer.name,
        displayName: racer.displayName,
        country: racer.country,
        countryCode: racer.countryCode,
        flag: racer.flag,
        avatar: racer.avatar,
        accent: racer.accent,
        rawDistance: Math.max(0, Math.min(effectiveDistance, racer.distance)),
        distance: Math.max(0, Math.min(effectiveDistance, Math.round(racer.distance))),
        progress: clamp(racer.distance / effectiveDistance, 0, 1),
        lap: racer.lap || cityRushLapForDistance(racer.distance, CITY_RUSH_LAP_LENGTH, effectiveLaps),
        lapProgress: cityRushLapProgress(racer.distance, CITY_RUSH_LAP_LENGTH, effectiveLaps),
        isJumping: racer.id === 'player' ? Boolean(playerJumpState.active) : Boolean(racer.jumpState?.active),
        jumpHeight: racer.id === 'player' ? (playerCar.position.y || 0) : (racer.jumpElevation || 0),
        rank: index + 1,
        lane: racer.lane,
        x: racer.x,
        health: racer.health,
        maxHealth: racer.maxHealth || CITY_RUSH_RACER_HEALTH,
        healthFlash: racer.healthFlash || 0,
        wrecked: Boolean(racer.wrecked),
      })),
      inventory: { ...inventory },
      playerLane,
      slowLeft: Math.max(playerSlowLeft, playerBlueShotSlowLeft),
      trafficImpactLeft: playerTrafficImpactLeft,
      boostLeft: playerBoostLeft,
      stunLeft: playerStunLeft,
      // La santé du joueur s'affiche dès le début effectif de la course.
      playerHealth: playerHealthActive ? playerHealth : null,
      playerHealthMax: CITY_RUSH_PLAYER_HEALTH,
      playerHealthActive,
      playerHealthFlash,
      score,
      pickups: pickedUp,
      leader: standings.leader?.name || '—',
      // Les voitures de police ne sont pas classées : elles sont transmises à
      // part pour le compteur de poursuite (et jamais au classement des pilotes).
      police: activePursuers().map((police) => ({
        id: police.id,
        name: police.name,
        vehicleType: police.vehicleType || police.mesh?.userData?.trafficType || 'police',
        isSuv: (police.vehicleType || police.mesh?.userData?.trafficType) === 'police-suv',
        targetId: police.targetId || null,
        squad: Boolean(police.squad),
        reserveForId: police.reserveForId || null,
        reinforcement: Boolean(police.reinforcement),
        // `rallied` : la berline vient du trafic et a été rappelée par un
        // contact (voir `rallyTrafficPolice`).
        rallied: Boolean(police.rallied),
        health: police.health,
        maxHealth: CITY_RUSH_POLICE_HEALTH,
        armed: { [CITY_RUSH_POWERS.PISTOL]: isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL) },
        distance: Math.round(police.distance),
        // Distance non arrondie : les vérifications de collision la comparent
        // aux `rawDistance` des pilotes.
        rawDistance: police.distance,
        lane: police.lane,
        x: police.currentX,
        mode: police.mode,
        // Sonnée par un tir ou ralentie par un choc : la berline est hors jeu
        // quelques secondes — la page peut le montrer, les vérifications ne la
        // comptent pas comme décrochée.
        stunLeft: police.stunLeft,
        slowLeft: Math.max(police.slowLeft, police.trafficImpactLeft),
        // Barrage en cours : la page et la mini-carte peuvent le signaler.
        blocking: police.mode === 'blockade' && police.blockLeft > 0,
      })),
    });
  }

  function lapBoardSubtitle(nextLap) {
    if (nextLap >= effectiveLaps) return 'DERNIER TOUR';
    return `${city.name.toUpperCase()} · ${theme.gantryText}`;
  }

  function syncSprintCheckpointDisplay() {
    if (!sprintCheckpointGate) return;
    const checkpoint = Math.min(sprintCheckpoints + 1, CITY_RUSH_SPRINT_CHECKPOINTS);
    if (checkpoint === sprintDisplayedCheckpoint) return;
    sprintDisplayedCheckpoint = checkpoint;
    const checkpointLabel = `CP ${String(checkpoint).padStart(2, '0')}/${String(CITY_RUSH_SPRINT_CHECKPOINTS).padStart(2, '0')}`;
    const finishLabel = checkpoint === CITY_RUSH_SPRINT_CHECKPOINTS;
    sprintCheckpointGate.userData.checkpoint = checkpoint;
    sprintCheckpointGate.userData.targetDistance = checkpoint * CITY_RUSH_SPRINT_CHECKPOINT_SPACING;
    sprintCheckpointGate.userData.board.draw(
      checkpointLabel,
      finishLabel ? 'ARRIVÉE · DERNIÈRE PORTE' : `CHECKPOINT · +${sprintTimeBonus} S`,
      finishLabel ? '#ffffff' : city.accent,
    );
    if (checkpoint % 4 === 0) {
      // Les portes multiples de quatre coïncident avec le grand portique de
      // course déjà présent tous les 1 200 m : son tableau annonce le
      // checkpoint à venir.
      startLine.setBoard(checkpointLabel, finishLabel ? 'ARRIVÉE · SPRINT' : `CHECKPOINT · +${sprintTimeBonus} S`, finishLabel ? '#ffffff' : city.accent);
    } else {
      startLine.setBoard('SPRINT', `CP ${String(checkpoint).padStart(2, '0')} · +${sprintTimeBonus} S · ${checkpoint * CITY_RUSH_SPRINT_CHECKPOINT_SPACING} M`, city.accent);
    }
  }

  function placeTrack() {
    // Les deux copies de la boucle (tour courant + tour suivant/précédent)
    // sont replacées sur la ligne la plus proche : on repasse ainsi sous le
    // portique à chaque tour sans jamais régénérer le décor. Le groupe entier
    // est recentré sur la courbe du joueur, les sommets ayant déjà reçu leur
    // déport propre dans `finishLoopGeometry`.
    const lineGap = cityRushTrackGap(0, distance) + CITY_RUSH_START_LINE_LEAD;
    const lineZ = PLAYER_Z - lineGap * SCALE;
    const playerCurve = trackProfile.offset(distance);
    const playerElevation = trackProfile.elevation(distance);
    loopA.position.set(-playerCurve, -playerElevation, lineZ);
    loopB.position.set(-playerCurve, -playerElevation, lineZ + LAP_UNITS);
    loopB.visible = lineZ + START_ZONE_HALF * SCALE < camera.position.z + 4;
    startLine.group.position.set(-playerCurve, -playerElevation, lineZ);
    startLine.group.rotation.set(trackPitch(0), trackYaw(0), 0);
    if (sprintCheckpointGate) {
      const targetDistance = sprintCheckpointGate.userData.targetDistance;
      const checkpointGap = targetDistance - distance;
      sprintCheckpointGate.position.set(
        trackRelativeX(targetDistance),
        trackRelativeY(targetDistance),
        PLAYER_Z - checkpointGap * SCALE,
      );
      sprintCheckpointGate.rotation.set(trackPitch(targetDistance), trackYaw(targetDistance), 0);
      sprintCheckpointGate.visible = sprintCheckpointGate.userData.checkpoint % 4 !== 0
        && checkpointGap > -40
        && checkpointGap * SCALE < theme.fogFar + 20;
    }
    for (const prop of loop.dynamicProps) {
      const gap = cityRushTrackGap(prop.trackPos, distance) + CITY_RUSH_START_LINE_LEAD;
      prop.group.visible = gap > -40 && gap * SCALE < theme.fogFar + 20;
      if (prop.group.visible) {
        prop.group.position.set(trackRelativeX(prop.trackPos), trackRelativeY(prop.trackPos), PLAYER_Z - gap * SCALE);
        prop.group.rotation.set(trackPitch(prop.trackPos), trackYaw(prop.trackPos), 0);
      }
    }
    return lineGap;
  }

  function resetCarAnimation(car) {
    car.userData.anim.roll = 0;
    car.userData.anim.pitch = 0;
    car.userData.anim.lastSpeed = 0;
    car.userData.body.rotation.set(0, 0, 0);
    car.userData.body.position.set(0, 0, 0);
    car.userData.boostFlames.forEach((flame) => { flame.group.visible = false; });
  }

  function reset() {
    active = false;
    releasePistolKey();
    clearVisualEffects();
    elapsed = 0;
    distance = 0;
    lap = 1;
    lastLineCrossed = 0;
    sprintCheckpoints = 0;
    sprintDisplayedCheckpoint = 0;
    sprintTimeLeft = sprintTimeBonus;
    playerLane = playerStartLane;
    playerX = laneX(playerLane);
    playerSlowLeft = 0;
    playerBlueShotSlowLeft = 0;
    playerTrafficRecoverLeft = 0;
    playerTrafficImpactLeft = 0;
    playerBoostLeft = 0;
    playerStunLeft = 0;
    playerStunTotal = 0;
    playerSkidLeft = 0;
    playerSkidDuration = 0.85;
    playerSkidSide = 1;
    playerCleanLineTime = 0;
    score = 0;
    pickedUp = 0;
    inventory = createCityRushInventory();
    finished = false;
    currentSpeed = 0;
    playerCurrentSpeed = 0;
    coastSpeed = 0;
    launchSmokeLeft = 0;
    cameraKick = 0;
    countdownTime = 0;
    finishTime = 0;
    // L'appareil d'observation repart du sol, et la barre de vie du pilote est
    // rendue intacte pour la prochaine escouade.
    watchHelicopter.visible = false;
    watchHeliLeaving = 0;
    watchHeliAge = 0;
    playerHealth = CITY_RUSH_PLAYER_HEALTH;
    playerHealthActive = false;
    playerHealthFlash = 0;
    playerWrecked = false;
    playerWreckLeft = 0;
    playerJumpState = { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0, overpassTriggered: false };
    playerLandingBounce = 0;
    playerDropShadow.visible = false;
    smoke.clear();
    playerCar.position.set(playerX, 0, PLAYER_Z);
    playerCar.rotation.set(0, 0, 0);
    resetCarAnimation(playerCar);
    racers.forEach((racer, index) => {
      racer.distance = 0;
      racer.lap = 1;
      racer.health = CITY_RUSH_RACER_HEALTH;
      racer.healthFlash = 0;
      racer.wrecked = false;
      racer.finalLapAnnounced = false;
      racer.currentSpeed = 0;
      racer.lane = defaultLanes[index + 1];
      racer.currentX = laneX(racer.lane);
      racer.changeIn = 0.22 + index * 0.08;
      racer.slowLeft = 0;
      racer.blueShotSlowLeft = 0;
      racer.trafficRecoverLeft = 0;
      racer.trafficImpactLeft = 0;
      racer.boostLeft = 0;
      racer.stunLeft = 0;
      racer.stunTotal = 0;
      racer.spinLeft = 0;
      racer.spinTotal = 0;
      racer.skidLeft = 0;
      racer.skidDuration = 0.85;
      racer.lastPassGap = undefined;
      racer.jumpState = { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0 };
      racer.currentJumpY = 0;
      racer.currentJumpPitch = 0;
      racer.inventory = createCityRushInventory();
      racer.powerCooldown = 0;
      racer.smokeTimer = 0;
      racer.mesh.position.set(racer.currentX, 0, PLAYER_Z);
      racer.mesh.visible = true;
      racer.mesh.rotation.set(0, 0, 0);
      resetCarAnimation(racer.mesh);
    });
    // La police du trafic rappelée pendant la course précédente reprend sa
    // ronde avant que le trafic soit remis sur la grille.
    releaseRalliedPolice();
    trafficCars.forEach((traffic, index) => {
      traffic.spawnCount = 0;
      // Nouvelle course, nouvelle ronde : l'épave de la berline détruite à
      // la course précédente reprend sa place dans le flot du trafic.
      traffic.rallied = false;
      traffic.destroyed = false;
      traffic.distance = 82 + index * (trafficCars.length > 3 ? 68 : 180) + randomRange(-7, 7);
      traffic.lane = forwardLanes[index % forwardLanes.length];
      traffic.currentX = laneX(traffic.lane);
      traffic.currentSpeed = traffic.baseSpeed;
      traffic.impactLeft = 0;
      traffic.impactCooldownLeft = 0;
      traffic.impactChanging = false;
      traffic.impactFromLane = null;
      traffic.impactTargetLane = null;
      traffic.mesh.position.set(traffic.currentX + trackRelativeX(traffic.distance), trackRelativeY(traffic.distance), PLAYER_Z - traffic.distance * SCALE);
      traffic.mesh.visible = true;
      traffic.mesh.rotation.set(trackPitch(traffic.distance), trackYaw(traffic.distance), 0);
      traffic.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
      traffic.mesh.userData.beacons.forEach((beacon) => { beacon.material.opacity = 1; });
    });
    lastTrafficDistanceSlot = trafficCars[trafficCars.length - 1].distance + randomRange(trafficCars.length <= 3 ? 180 : 60, trafficCars.length <= 3 ? 260 : 78);
    // Le trafic venant en face reprend sa place, réparti loin devant la grille.
    oncomingCars.forEach((oncoming, index) => {
      const lightOncoming = oncomingCars.length <= 1;
      oncoming.distance = 60 + index * (lightOncoming ? 280 : 46) + randomRange(-9, 9);
      oncoming.lane = oncomingLanes[index % oncomingLanes.length];
      oncoming.currentX = laneX(oncoming.lane);
      oncoming.currentSpeed = oncoming.baseSpeed;
      oncoming.impactCooldownLeft = 0;
      oncoming.pushedAside = false;
      oncoming.pushAsideElapsed = 0;
      oncoming.pushAsideStartX = null;
      oncoming.lastPassGap = undefined;
      oncoming.mesh.visible = true;
      oncoming.mesh.position.set(oncoming.currentX + trackRelativeX(oncoming.distance), trackRelativeY(oncoming.distance), PLAYER_Z - oncoming.distance * SCALE);
      oncoming.mesh.rotation.set(-trackPitch(oncoming.distance), trackYaw(oncoming.distance) + Math.PI, 0);
      oncoming.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
      oncoming.mesh.userData.beacons.forEach((beacon) => { beacon.material.opacity = 1; });
    });
    // L'escouade et ses réserves repartent pour la prochaine course.
    policeDeployed = false;
    nextPoliceUnitNumber = policeCars.length + 1;
    policeReinforcementTimer = 0;
    policeReinforcementQueue.length = 0;
    policeRetaliationByAttacker.clear();
    policeStealNoticeCooldown = 0;
    policeBlockNoticeCooldown = 0;
    policeCars.forEach((police) => {
      police.active = false;
      police.everDeployed = false;
      police.reinforcementPending = false;
      police.reinforcement = false;
      police.unitNumber = police.index + 1;
      police.id = `police-${police.unitNumber}`;
      police.name = policeUnitName(police.unitNumber, police.vehicleType);
      police.targetId = null;
      police.distance = 0;
      police.currentSpeed = 0;
      police.slowLeft = 0;
      police.blueShotSlowLeft = 0;
      police.trafficImpactLeft = 0;
      police.boostLeft = 0;
      police.stunLeft = 0;
      police.stunTotal = 0;
      police.skidLeft = 0;
      police.skidDuration = 0.85;
      police.powerCooldown = 0;
      police.health = CITY_RUSH_POLICE_HEALTH;
      police.healthFlash = 0;
      police.mode = 'hunt';
      police.blockLeft = 0;
      police.blockArmed = true;
      police.collisionCooldownLeft = 0;
      police.changeIn = 0.25 + police.index * 0.4;
      police.lastPassGap = undefined;
      police.lane = policeLanes[police.index % policeLanes.length];
      police.currentX = laneX(police.lane);
      police.inventory = createCityRushPoliceInventory();
      police.mesh.visible = false;
      police.mesh.position.set(police.currentX, 0, PLAYER_Z);
    });
    audioRef?.current?.policeSirenOff?.();
    setRowsToStart();
    setRampsToStart();
    startLine.setLights(0);
    startLine.setFinalLap(false);
    startLine.setBoard(`TOUR 1/${effectiveLaps}`, lapBoardSubtitle(1));
    syncSprintCheckpointDisplay();
    placeTrack();
    emitHud(true);
  }

  // Ennemis que le projectile droit peut croiser : rivaux, pilote, berlines.
  // Le tir rouge n'est pas guidé — cette liste sert au balayage en vol et à
  // l'IA, qui ne dépense sa charge que s'il y a déjà quelqu'un sur la voie.
  function laneShotCandidates(attackerId = 'player') {
    const policeAttacker = Boolean(activePursuerById(attackerId));
    return [
      ...(attackerId === 'player' ? [] : [getRaceVehicleState('player')]),
      ...racers.filter((racer) => racer.id !== attackerId).map((racer) => getRaceVehicleState(racer.id)),
      ...activePursuers().filter((police) => police.id !== attackerId).map((police) => getRaceVehicleState(police.id)),
      ...(policeAttacker ? [] : trafficCars
        .filter((traffic) => traffic.type === 'police' && !traffic.rallied && !traffic.destroyed)
        .map((traffic) => getRaceVehicleState(traffic.id))),
    ].filter(Boolean);
  }

  function firstEnemyOnLane(attackerId = 'player') {
    const attacker = getRaceVehicleState(attackerId);
    if (!attacker) return null;
    return cityRushStraightShotTarget({
      attackerDistance: attacker.distance,
      attackerLane: attacker.lane,
      targets: laneShotCandidates(attackerId),
    });
  }

  function getVehicleMesh(vehicleId) {
    if (vehicleId === 'player') return playerCar;
    const racer = racers.find((item) => item.id === vehicleId);
    if (racer) return racer.mesh;
    return activePursuerById(vehicleId)?.mesh
      || trafficCars.find((item) => item.id === vehicleId)?.mesh
      || oncomingCars.find((item) => item.id === vehicleId)?.mesh
      || null;
  }

  function getRaceVehicleState(vehicleId) {
    if (vehicleId === 'player') {
      return playerWrecked ? null : { id: 'player', name: 'TOI', distance, lane: playerLane, mesh: playerCar, racer: null };
    }
    const racer = racers.find((item) => item.id === vehicleId);
    if (racer) return racer.wrecked || racer.health <= 0 ? null : { id: racer.id, name: racer.name, distance: racer.distance, lane: racer.lane, mesh: racer.mesh, racer };
    const police = activePursuerById(vehicleId);
    // Une berline détruite n'est plus un état de course : les tirs en vol
    // continuent tout droit à travers l'emplacement de l'épave.
    if (police && police.health > 0) return { id: police.id, name: police.name, distance: police.distance, lane: police.lane, mesh: police.mesh, racer: police, isPolice: true };
    const trafficPolice = trafficCars.find((item) => item.id === vehicleId);
    if (trafficPolice?.type === 'police' && !trafficPolice.rallied && !trafficPolice.destroyed
      && (trafficPolice.health ?? CITY_RUSH_POLICE_HEALTH) > 0) {
      return { id: trafficPolice.id, name: trafficPolice.name || 'POLICE ROUTIÈRE', distance: trafficPolice.distance, lane: trafficPolice.lane, mesh: trafficPolice.mesh, racer: trafficPolice, isPolice: true, isTrafficPolice: true };
    }
    return null;
  }

  function isVisibleInPlayerCamera(mesh) {
    if (!mesh?.visible) return false;
    camera.updateMatrixWorld();
    const point = mesh.position.clone().add(new THREE.Vector3(0, 0.85, 0)).project(camera);
    return point.z >= -1 && point.z <= 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1;
  }

  function findStraightShotTarget(attackerId = 'player') {
    const attacker = getRaceVehicleState(attackerId);
    if (!attacker) return null;
    const targets = [
      ...(attackerId === 'player' ? [] : [getRaceVehicleState('player')]),
      ...racers.filter((racer) => racer.id !== attackerId).map((racer) => getRaceVehicleState(racer.id)),
      // L'escouade du dernier tour comme la berline rappelée sont ciblables.
      ...activePursuers().filter((police) => police.id !== attackerId).map((police) => getRaceVehicleState(police.id)),
    ].filter(Boolean).map((target) => ({
      ...target,
      visible: attackerId === 'player'
        ? isVisibleInPlayerCamera(target.mesh)
        : Boolean(target.mesh?.visible),
    }));
    const ahead = cityRushStraightShotTarget({
      attackerDistance: attacker.distance,
      attackerLane: attacker.lane,
      targets,
      maxDistance: CITY_RUSH_BLUE_SHOT_MAX_RANGE,
    });
    if (ahead) return ahead;
    // Personne dans la voie devant : comme la rafale rouge et l'hélico, le tir
    // droit peut se retourner contre la berline la plus proche de sa voie,
    // même collée au pare-chocs arrière. C'est le seul moyen de toucher
    // l'escouade, qui attaque dans le dos du pilote.
    const squad = cityRushStraightShotRetaliation({
      pursuers: activePursuers(),
      attackerDistance: attacker.distance,
      attackerLane: attacker.lane,
      excludeId: attackerId,
    });
    return squad ? getRaceVehicleState(squad.id) : null;
  }

  // Placement stéréo d'un bruitage : la voie de la voiture, ramenée à un
  // panoramique discret (−0,5 à 0,5). La caméra est derrière le joueur, donc
  // « devant » suffit à situer un tir ou un dérapage.
  function vehiclePan(vehicleId) {
    const mesh = getVehicleMesh(vehicleId);
    if (!mesh) return 0;
    return clamp(mesh.position.x / 6.3, -1, 1) * 0.5;
  }

  function removeTransient(mesh) {
    scene.remove(mesh);
    const geometries = new Set();
    const materials = new Set();
    mesh.traverse((part) => {
      if (part.geometry) geometries.add(part.geometry);
      if (Array.isArray(part.material)) part.material.forEach((material) => materials.add(material));
      else if (part.material) materials.add(part.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  function makeActionPulse(color) {
    const group = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 24), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), coreMaterial);
    core.position.y = 0.16;
    group.add(core);
    group.userData.ringMaterial = ringMaterial;
    group.userData.coreMaterial = coreMaterial;
    return group;
  }

  function spawnActionPulse(sourceId, type) {
    const source = getVehicleMesh(sourceId);
    const rule = CITY_RUSH_POWER_RULES[type];
    if (!source || !rule) return;
    const color = Number.parseInt(rule.color.slice(1), 16);
    const mesh = makeActionPulse(color);
    mesh.position.copy(source.position).add(new THREE.Vector3(0, 1.1, 0));
    mesh.scale.setScalar(0.18);
    scene.add(mesh);
    actionPulses.push({ mesh, sourceId, age: 0, duration: 0.56 });
  }

  // ── Éclatement des bonus ramassés ────────────────────────────────────
  function spawnPickupBurst(x, y, trackDistance, type) {
    const burst = pickupBursts.find((candidate) => !candidate.userData.active)
      || pickupBursts[(pickupBurstCursor += 1) % pickupBursts.length];
    const data = burst.userData;
    data.active = true;
    data.age = 0;
    data.trackDistance = trackDistance;
    data.baseX = x;
    data.baseY = y;
    data.specs = reduceMotion ? [] : cityRushPickupBurstShards(CITY_RUSH_PICKUP_BURST_SHARDS, Math.random);
    pickupBurstColor.set(CITY_RUSH_POWER_RULES[type]?.color || (type === CITY_RUSH_PICKUPS.BOOST ? CITY_RUSH_TRACK_BOOST_COLOR : '#ffffff'));
    data.shardMaterial.color.copy(pickupBurstColor);
    data.shardMaterial.opacity = 1;
    data.ringMaterial.color.copy(pickupBurstColor);
    data.coreMaterial.color.copy(pickupBurstColor).lerp(BURST_WHITE, 0.65);
    burst.position.set(x + trackRelativeX(trackDistance), y + trackRelativeY(trackDistance), PLAYER_Z - (trackDistance - distance) * SCALE);
    burst.visible = true;
    updatePickupBurst(burst, 0);
  }

  function updatePickupBurst(burst, dt) {
    const data = burst.userData;
    data.age += dt;
    const flash = cityRushPickupFlashState(data.age);
    data.ringMaterial.opacity = flash.opacity;
    data.ring.scale.setScalar(flash.scale);
    data.coreMaterial.opacity = flash.core;
    data.core.scale.setScalar(Math.max(0.001, flash.core * 1.4));
    data.shards.forEach((shard, index) => {
      const spec = data.specs[index];
      if (!spec) { shard.visible = false; return; }
      const state = cityRushPickupShardState(spec, data.age);
      shard.visible = true;
      shard.position.set(...state.position);
      shard.rotation.set(...state.rotation);
      shard.scale.set(state.scale, state.scale * 1.6, state.scale);
      data.shardMaterial.opacity = state.opacity;
    });
    if (flash.done) {
      data.active = false;
      burst.visible = false;
    }
  }

  function updatePickupBursts(dt) {
    for (const burst of pickupBursts) {
      if (!burst.userData.active) continue;
      burst.position.x = burst.userData.baseX + trackRelativeX(burst.userData.trackDistance);
      burst.position.y = burst.userData.baseY + trackRelativeY(burst.userData.trackDistance);
      burst.position.z = PLAYER_Z - (burst.userData.trackDistance - distance) * SCALE;
      updatePickupBurst(burst, dt);
    }
  }

  function clearPickupBursts() {
    for (const burst of pickupBursts) {
      burst.userData.active = false;
      burst.userData.age = CITY_RUSH_PICKUP_BURST_DURATION;
      burst.visible = false;
    }
  }

  // Le flot lent, le trafic venant en face **et** les berlines de police :
  // tout véhicule avec lequel une voiture de course peut faire des étincelles.
  function getImpactMesh(vehicleId) {
    return trafficCars.find((item) => item.id === vehicleId)?.mesh
      || oncomingCars.find((item) => item.id === vehicleId)?.mesh
      || activePursuerById(vehicleId)?.mesh
      || null;
  }

  function spawnTrafficImpact(racerId, trafficId) {
    const racer = getVehicleMesh(racerId);
    const traffic = getImpactMesh(trafficId);
    if (!racer || !traffic || !trafficImpacts.length) return;
    const effect = trafficImpacts.find((candidate) => !candidate.userData.active)
      || trafficImpacts[(trafficImpactCursor += 1) % trafficImpacts.length];
    const data = effect.userData;
    data.active = true;
    data.age = 0;
    data.racerId = racerId;
    data.trafficId = trafficId;
    data.flashMaterial.opacity = 1;
    data.ringMaterial.opacity = 0.9;
    data.sparkMaterial.opacity = 1;
    data.flash.scale.setScalar(0.42);
    data.ring.scale.setScalar(0.28);
    data.sparks.forEach((spark) => {
      spark.visible = true;
      spark.scale.set(1, 1, 0.55);
    });
    effect.visible = true;
    effect.position.lerpVectors(racer.position, traffic.position, 0.5);
    effect.position.y = 0;
  }

  function updateTrafficImpact(effect, dt) {
    const data = effect.userData;
    if (!data.active) return;
    data.age += dt;
    const progress = clamp(data.age / CITY_RUSH_TRAFFIC_IMPACT_DURATION, 0, 1);
    const racer = getVehicleMesh(data.racerId);
    const traffic = getImpactMesh(data.trafficId);
    if (racer && traffic) effect.position.lerpVectors(racer.position, traffic.position, 0.5);
    effect.position.y = 0;

    const flashLife = clamp(data.age / 0.14, 0, 1);
    data.flash.scale.setScalar(0.42 + flashLife * 0.85);
    data.flashMaterial.opacity = (1 - flashLife) * 0.95;
    const ringLife = smoothstep(progress);
    data.ring.scale.setScalar(0.28 + ringLife * 2.35);
    data.ringMaterial.opacity = (1 - progress) * 0.82;
    data.sparkMaterial.opacity = (1 - progress) * 0.95;
    data.sparks.forEach((spark) => {
      const angle = spark.userData.angle;
      const reach = 0.42 + smoothstep(clamp(data.age / 0.62, 0, 1)) * 1.45;
      spark.position.set(Math.cos(angle) * reach, 0.55 + Math.sin(angle * 1.7) * spark.userData.lift * reach, Math.sin(angle) * reach);
      spark.rotation.set(data.age * 9, angle + data.age * 4, data.age * 7);
      spark.scale.set(1, 1, Math.max(0.2, 1 - progress * 0.7));
    });
    if (progress >= 1) {
      data.active = false;
      effect.visible = false;
    }
  }

  function updateTrafficImpacts(dt) {
    trafficImpacts.forEach((effect) => updateTrafficImpact(effect, dt));
  }

  function clearTrafficImpacts() {
    trafficImpacts.forEach((effect) => {
      effect.userData.active = false;
      effect.userData.age = CITY_RUSH_TRAFFIC_IMPACT_DURATION;
      effect.visible = false;
    });
  }

  // Un bonus réapparaît 0,1 s après avoir été ramassé : il gonfle depuis son
  // socle avec un léger rebond, hors course comme en course.
  function updatePickupPop(dt) {
    for (const row of rows) {
      for (const slot of row.slots) {
        if (!slot.visible || slot.userData.pop >= 1) continue;
        slot.userData.pop = Math.min(1, slot.userData.pop + dt / CITY_RUSH_PICKUP_RESPAWN_DELAY);
        slot.scale.setScalar(Math.max(0.001, cityRushPickupPopScale(slot.userData.pop)));
      }
    }
  }

  // Une balle traçante de mitrailleuse : noyau jaune vif, traînée orangée et
  // petite étincelle à l'impact. Les clés userData (core/trail/burst) sont
  // conservées pour réutiliser la boucle d'animation des tirs.
  function makeBulletTracer({ coreColor = 0xfff0a6, trailColor = 0xff9a3c, burstColor = 0xffd24a } = {}) {
    const group = new THREE.Group();
    const coreMaterial = new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const trailMaterial = new THREE.MeshBasicMaterial({ color: trailColor, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
    const burstMaterial = new THREE.MeshBasicMaterial({ color: burstColor, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 6), coreMaterial);
    core.rotation.x = Math.PI / 2;
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 6), trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -0.5;
    const burst = new THREE.Group();
    [
      new THREE.BoxGeometry(0.5, 0.08, 0.08),
      new THREE.BoxGeometry(0.08, 0.5, 0.08),
      new THREE.BoxGeometry(0.08, 0.08, 0.5),
    ].forEach((geometry) => burst.add(new THREE.Mesh(geometry, burstMaterial)));
    burst.visible = false;
    group.add(core, trail, burst);
    group.userData = { core, trail, burst, coreMaterial, trailMaterial, burstMaterial };
    return group;
  }

  function fireStraightShot(attackerId, target, kind = CITY_RUSH_POWERS.BLUE_SHOT) {
    const attacker = getRaceVehicleState(attackerId);
    if (!attacker) return false;
    const muzzleOffset = 1.12;
    const isPistol = kind === CITY_RUSH_POWERS.PISTOL;
    // Le tir rouge part toujours tout droit, sans viser : pas de riposte
    // guidée vers l'arrière. Le tir bleu peut encore inverser le sens.
    const direction = isPistol
      ? 1
      : (Number.isFinite(Number(target?.distance)) && Number(target.distance) < attacker.distance ? -1 : 1);
    const startTrackDistance = attacker.distance + (direction * muzzleOffset) / SCALE;
    const mesh = isPistol
      ? makeBulletTracer({ coreColor: 0xffe08a, trailColor: 0xff526e, burstColor: 0xff9aa8 })
      : makeBulletTracer({ coreColor: 0xe7faff, trailColor: 0x48b9ff, burstColor: 0x9be5ff });
    mesh.rotation.y = direction > 0 ? 0 : Math.PI;
    scene.add(mesh);
    straightShots.push({
      mesh,
      attackerId,
      kind,
      unguided: isPistol,
      targetId: isPistol ? null : (target?.id || null),
      lane: attacker.lane,
      x: laneX(attacker.lane),
      direction,
      startTrackDistance,
      previousTrackDistance: startTrackDistance,
      trackDistance: startTrackDistance,
      maxTrackDistance: startTrackDistance + direction * CITY_RUSH_BLUE_SHOT_MAX_RANGE,
      previousTargetDistance: isPistol || !Number.isFinite(Number(target?.distance)) ? null : Number(target.distance),
      age: 0,
      phase: 'flight',
      hitPoint: new THREE.Vector3(),
    });
    if (isPistol) audioRef?.current?.machineGun({ pan: vehiclePan(attackerId) });
    else audioRef?.current?.gunshot({ pan: vehiclePan(attackerId) });
    return true;
  }

  function damageRacer(racer, source, attackerId, extra = {}) {
    if (!racer || racer.wrecked || racer.health <= 0) return 0;
    const before = racer.health;
    racer.health = cityRushPlayerDamage(racer.health, source);
    const lost = before - racer.health;
    if (lost <= 0) return 0;
    racer.healthFlash = CITY_RUSH_PLAYER_HEALTH_FLASH;
    const hitType = source === CITY_RUSH_POWERS.PISTOL ? 'pistol' : 'blue-shot-hit';
    getCallbacks().effect?.({
      type: hitType,
      target: racer.name,
      targetId: racer.id,
      attacker: getRaceVehicleState(attackerId)?.name || null,
      source,
      damage: lost,
      health: racer.health,
      maxHealth: CITY_RUSH_RACER_HEALTH,
      critical: racer.health <= CITY_RUSH_PLAYER_HEALTH_CRITICAL,
      ...extra,
    });
    if (racer.health <= 0 && !racer.wrecked) {
      racer.wrecked = true;
      racer.stunLeft = CITY_RUSH_WRECK_SECONDS;
      racer.stunTotal = CITY_RUSH_WRECK_SECONDS;
      racer.boostLeft = 0;
      getCallbacks().effect?.({ type: 'racer-wrecked', target: racer.name, targetId: racer.id, attackerId, health: 0 });
    }
    emitHud(true);
    return lost;
  }

  function applyPistolHit(target, attackerId) {
    const attacker = getRaceVehicleState(attackerId);
    if (target.id === 'player') {
      cameraKick = Math.max(cameraKick, 0.12);
      damagePlayer(CITY_RUSH_POWERS.PISTOL, attackerId);
      getCallbacks().effect?.({
        type: 'pistol-hit-player',
        attacker: attacker?.name || 'RIVAL',
        health: playerHealth,
        maxHealth: CITY_RUSH_PLAYER_HEALTH,
      });
    } else if (target.isPolice) {
      // Les berlines civiles du trafic et l'escouade encaissent le même dégât.
      damagePolice(target.racer, CITY_RUSH_POWERS.PISTOL, attackerId);
    } else if (target.racer) {
      damageRacer(target.racer, CITY_RUSH_POWERS.PISTOL, attackerId);
    }
  }

  function applyStraightShotHit(target, attackerId, kind = CITY_RUSH_POWERS.BLUE_SHOT) {
    if (kind === CITY_RUSH_POWERS.PISTOL) {
      applyPistolHit(target, attackerId);
      return;
    }
    const duration = CITY_RUSH_BLUE_SHOT_DURATION;
    const attacker = getRaceVehicleState(attackerId);
    if (target.id === 'player') {
      playerBlueShotSlowLeft = Math.max(playerBlueShotSlowLeft, duration);
      playerSkidLeft = duration;
      playerSkidDuration = duration;
      playerSkidSide = Math.random() < 0.5 ? -1 : 1;
      cameraKick = Math.max(cameraKick, 0.1);
      getCallbacks().effect?.({ type: 'blue-shot-hit-player', attacker: attacker?.name || 'RIVAL', duration });
      damagePlayer(CITY_RUSH_POWERS.BLUE_SHOT, attackerId);
    } else if (target.isPolice) {
      damagePolice(target.racer, CITY_RUSH_POWERS.BLUE_SHOT, attackerId);
    } else if (target.racer) {
      target.racer.blueShotSlowLeft = Math.max(target.racer.blueShotSlowLeft || 0, duration);
      target.racer.skidLeft = duration;
      target.racer.skidDuration = duration;
      target.racer.skidSide = Math.random() < 0.5 ? -1 : 1;
      damageRacer(target.racer, CITY_RUSH_POWERS.BLUE_SHOT, attackerId, { duration });
    }
    audioRef?.current?.skid({
      pan: vehiclePan(target.id),
      intensity: 0.48,
      duration,
    });
  }

  // ── Destruction des berlines de police ──────────────────────────────
  // Trois tirs droits bleus, deux tirs rouges ou six carambolages en accélérant
  // détruisent la berline. Sa barre segmentée descend à chaque dégât, puis elle
  // explose et disparaît de la course comme de la mini-carte. Aucun missile.
  const policeExplosions = [];

  function poseExplosion(mesh, worldPosition, age = 0) {
    mesh.position.copy(worldPosition);
    mesh.userData.age = age;
    mesh.visible = true;
    if (!mesh.userData.tracked) {
      scene.add(mesh);
      mesh.userData.tracked = true;
    }
    policeExplosions.push(mesh);
  }

  function spawnPoliceExplosion(worldPosition, pan = 0) {
    const mesh = makeImpact(shared);
    poseExplosion(mesh, worldPosition);
    audioRef?.current?.explosion({ pan });
    cameraKick = Math.max(cameraKick, 0.32);
    // Fumée noire, braises et débris : l'épave brûle au milieu de la voie.
    for (let puff = 0; puff < 5; puff += 1) {
      smoke.emit(worldPosition, { color: 0x35353f, opacity: 0.6, scale: 0.6 + Math.random() * 0.35, grow: 2.4, life: 1.15, velocity: [(Math.random() - 0.5) * 1.3, 1.9 + Math.random() * 1.1, (Math.random() - 0.5) * 1.3] });
    }
    for (let spark = 0; spark < 7; spark += 1) {
      smoke.emit(worldPosition, { color: 0xff7a2a, opacity: 0.85, scale: 0.38, grow: 2.0, life: 0.55, velocity: [(Math.random() - 0.5) * 4.6, 2.4 + Math.random() * 2.8, (Math.random() - 0.5) * 4.6] });
    }
    for (let debris = 0; debris < 9; debris += 1) {
      const angle = Math.random() * Math.PI * 2;
      const reach = 3.6 + Math.random() * 3.6;
      smoke.emit(worldPosition, { color: 0xffe07a, opacity: 0.95, scale: 0.15, grow: 1.2, life: 0.38, velocity: [Math.cos(angle) * reach, 1.5 + Math.random() * 2.4, Math.sin(angle) * reach] });
    }
  }

  function destroyPolice(police, source, attackerId) {
    // Garde d'idempotence : `active` passe à false ici même, et une berline
    // jamais entrée en course ne l'est pas non plus. La vie ne peut pas servir
    // de garde — `damagePolice` la met à zéro AVANT d'appeler cette fonction,
    // et le test sur la vie faisait alors sortir sans explosion : la berline
    // restait en piste, barre vide, insensible à tous les tirs suivants.
    if (!police || police.active === false) return;
    police.health = 0;
    police.healthFlash = 0;
    const byPlayer = attackerId === 'player';
    const worldPosition = police.mesh.position.clone();
    // Le panoramique du boum se calcule avant la sortie de piste.
    const pan = vehiclePan(police.id);
    // L'escouade sort de la chasse ; la berline rappelée est ôtée de la liste.
    police.active = false;
    const ralliedIndex = ralliedCars.indexOf(police);
    if (ralliedIndex >= 0) ralliedCars.splice(ralliedIndex, 1);
    let associatedTraffic = null;
    if (police.rallied) {
      // L'épave ne reprendra jamais sa ronde cette course : le halo et la
      // barre de vie disparaissent avec elle (le trafic repart au complet à
      // la course suivante).
      detachPoliceGlow(police.mesh);
      detachPoliceHealthBar(police.mesh);
      associatedTraffic = trafficCars.find((car) => `rally-${car.id}` === police.id);
      if (associatedTraffic) {
        associatedTraffic.rallied = false;
        associatedTraffic.destroyed = true;
      }
    }
    police.mesh.visible = false;
    const civilianTrafficPolice = trafficCars.find((traffic) => traffic === police);
    if (civilianTrafficPolice) civilianTrafficPolice.destroyed = true;
    // Une perte de l'escouade du joueur au dernier tour déclenche une relève
    // différée. Une voiture réservée ou du trafic civil n'est pas remplacée.
    const reinforcementScheduled = Boolean(police.squad && lap >= effectiveLaps && !playerWrecked
      && queuePoliceReinforcement(police));
    spawnPoliceExplosion(worldPosition, pan);
    if (byPlayer) {
      score += CITY_RUSH_POLICE_DESTROY_SCORE;
      cameraKick = Math.max(cameraKick, 0.42);
    }
    getCallbacks().effect?.({
      type: 'police-destroyed',
      id: police.id,
      police: police.name,
      trafficPolice: Boolean(police.rallied || civilianTrafficPolice),
      health: police.health,
      maxHealth: CITY_RUSH_POLICE_HEALTH,
      source,
      byPlayer,
      reinforcementScheduled,
      lap,
    });
    emitHud(true);
    // La dernière berline explose : la sirène s'éteint avec elle.
    if (!activePursuers().length) audioRef?.current?.policeSirenOff?.();
  }

  function damagePolice(police, source, attackerId) {
    if (!police || police.destroyed) return;
    const hasHealth = police.health !== null && Number.isFinite(Number(police.health));
    if (hasHealth && Number(police.health) <= 0) return;
    const healthBeforeHit = hasHealth ? Number(police.health) : CITY_RUSH_POLICE_HEALTH;
    // Chaque rival reçoit son unité réservée dès son premier tir réussi sur
    // une voiture de police, même si ce tir détruit sa cible.
    if (attackerId && attackerId !== 'player') registerPoliceRetaliation(attackerId, source);
    police.health = cityRushPoliceDamage(healthBeforeHit, source);
    if (police.health <= 0) {
      destroyPolice(police, source, attackerId);
      return;
    }
    police.healthFlash = 0.28;
    // Les tirs rouges retirent une cellule sans dérapage ni ralentissement.
    if (source !== CITY_RUSH_POWERS.PISTOL) {
      police.skidLeft = Math.max(police.skidLeft, 0.4);
      police.skidDuration = 0.4;
      police.skidSide = Math.random() < 0.5 ? -1 : 1;
    }
    // Une berline touchée mais encore debout se raconte au pilote qui l'a
    // atteinte : un tir bleu enlève deux points, un tir rouge trois et un
    // carambolage à pleine allure un seul ; le pilote reste indemne.
    if (attackerId === 'player') {
      getCallbacks().effect?.({
        type: 'police-hit',
        police: police.name,
        health: police.health,
        maxHealth: CITY_RUSH_POLICE_HEALTH,
        damage: healthBeforeHit - police.health,
        source,
        remaining: cityRushPoliceShotsLeft(police.health, source),
      });
    }
    emitHud(true);
  }

  function updateVisualEffects(dt) {
    for (let index = actionPulses.length - 1; index >= 0; index -= 1) {
      const pulse = actionPulses[index];
      pulse.age += dt;
      const progress = clamp(pulse.age / pulse.duration, 0, 1);
      const source = getVehicleMesh(pulse.sourceId);
      if (source) pulse.mesh.position.copy(source.position).add(new THREE.Vector3(0, 1.1 + progress * 0.24, 0));
      pulse.mesh.scale.setScalar(0.18 + progress * 1.6);
      pulse.mesh.rotation.y += dt * 4.5;
      pulse.mesh.userData.ringMaterial.opacity = 0.95 * (1 - progress);
      pulse.mesh.userData.coreMaterial.opacity = 0.95 * (1 - progress);
      if (progress >= 1) {
        removeTransient(pulse.mesh);
        actionPulses.splice(index, 1);
      }
    }

    for (let index = straightShots.length - 1; index >= 0; index -= 1) {
      const shot = straightShots[index];
      if (shot.phase === 'flight') {
        shot.age += dt;
        const direction = shot.direction || 1;
        const previousProjectileDistance = shot.trackDistance;
        const previousTargetDistance = shot.previousTargetDistance;
        shot.previousTrackDistance = previousProjectileDistance;
        // Sens de marche : +1 vers l'avant, −1 pour une riposte sur une
        // berline déjà dépassée.
        shot.trackDistance = direction > 0
          ? Math.min(
            shot.maxTrackDistance,
            shot.startTrackDistance + CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED * shot.age,
          )
          : Math.max(
            shot.maxTrackDistance,
            shot.startTrackDistance - CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED * shot.age,
          );
        const target = shot.targetId ? getRaceVehicleState(shot.targetId) : null;
        // La cible est croisée quand elle passe de « devant la balle » à
        // « derrière la balle », dans le sens de marche du projectile.
        const crossedTarget = target
          && Number.isFinite(previousTargetDistance)
          && (previousTargetDistance - previousProjectileDistance) * direction > 0
          && (target.distance - shot.trackDistance) * direction <= 0;

        const fromDistance = Math.min(previousProjectileDistance, shot.trackDistance);
        const toDistance = Math.max(previousProjectileDistance, shot.trackDistance);
        // Tir rouge sans viser : on balaie tous les ennemis de la voie et le
        // premier sur le trajet encaisse. Le tir bleu garde son verrouillage
        // plus le balayage des berlines qui se rabattent.
        const swept = cityRushStraightShotSweptHit({
          lane: shot.lane,
          fromDistance,
          toDistance,
          targets: shot.unguided
            ? laneShotCandidates(shot.attackerId)
            : activePursuers()
              .filter((police) => police.id !== shot.attackerId && police.id !== target?.id)
              .map((police) => getRaceVehicleState(police.id))
              .filter(Boolean),
        });
        const hitBySweep = Boolean(swept)
          && (shot.unguided
            || !crossedTarget
            || Math.abs(Number(swept.distance) - previousProjectileDistance)
              <= Math.abs(Number(target.distance) - previousProjectileDistance));
        const resolveImpact = (hitTarget) => {
          applyStraightShotHit(hitTarget, shot.attackerId, shot.kind);
          shot.phase = 'impact';
          shot.age = 0;
          shot.hitPoint.copy(hitTarget.mesh.position).add(new THREE.Vector3(0, 0.85, 0));
          shot.mesh.position.copy(shot.hitPoint);
          shot.mesh.userData.core.visible = false;
          shot.mesh.userData.trail.visible = false;
          shot.mesh.userData.burst.visible = true;
        };

        if (hitBySweep) {
          resolveImpact(swept);
        } else if (!shot.unguided && crossedTarget) {
          if (target.lane === shot.lane) {
            resolveImpact(target);
          } else {
            if (shot.attackerId === 'player') getCallbacks().effect?.({ type: 'blue-shot-miss', target: target.name });
            shot.targetId = null;
          }
        } else if (shot.targetId && !target) {
          shot.targetId = null;
        }

        if (shot.phase === 'flight') {
          shot.previousTargetDistance = target ? target.distance : null;
          shot.mesh.position.set(shot.x + trackRelativeX(shot.trackDistance), 0.82 + trackRelativeY(shot.trackDistance), PLAYER_Z - (shot.trackDistance - distance) * SCALE);
          // La traînée reste derrière la balle, y compris en riposte, et suit
          // l'axe local du virage et du relief.
          shot.mesh.rotation.set(trackPitch(shot.trackDistance), trackYaw(shot.trackDistance) + (direction > 0 ? 0 : Math.PI), 0);
          // Portée signée : un tir vers l'arrière a une portée négative, le
          // rapport reste donc une progression de 0 à 1.
          const flightRange = direction * Math.max(0.001, Math.abs(shot.maxTrackDistance - shot.startTrackDistance));
          const progress = clamp((shot.trackDistance - shot.startTrackDistance) / flightRange, 0, 1);
          shot.mesh.scale.setScalar(0.92 + Math.sin(shot.age * 48) * 0.08);
          if (progress >= 1) {
            removeTransient(shot.mesh);
            straightShots.splice(index, 1);
          }
        }
      } else {
        shot.age += dt;
        const progress = clamp(shot.age / 0.2, 0, 1);
        shot.mesh.position.copy(shot.hitPoint);
        shot.mesh.scale.setScalar(0.5 + progress * 1.7);
        shot.mesh.userData.burst.rotation.y += dt * 7;
        shot.mesh.userData.burstMaterial.opacity = 1 - progress;
        if (progress >= 1) {
          removeTransient(shot.mesh);
          straightShots.splice(index, 1);
        }
      }
    }

    // Explosions des berlines détruites : l'effet s'éteint après sa courte animation.
    for (let index = policeExplosions.length - 1; index >= 0; index -= 1) {
      const explosion = policeExplosions[index];
      explosion.userData.age += dt;
      animateExplosion(explosion, explosion.userData.age);
      if (explosion.userData.age > 0.62) {
        explosion.visible = false;
        policeExplosions.splice(index, 1);
      }
    }
  }

  function clearVisualEffects() {
    actionPulses.forEach((pulse) => removeTransient(pulse.mesh));
    straightShots.forEach((shot) => removeTransient(shot.mesh));
    actionPulses.length = 0;
    straightShots.length = 0;
    policeExplosions.forEach((explosion) => { explosion.visible = false; });
    policeExplosions.length = 0;
    clearPickupBursts();
    clearTrafficImpacts();
  }

  function usePower(type) {
    if (sprint || !active || finished || type !== CITY_RUSH_POWERS.PISTOL) return false;
    const consumed = consumeCityRushCharge(inventory, CITY_RUSH_POWERS.PISTOL);
    if (!consumed.consumed) {
      getCallbacks().effect?.({ type: 'empty', item: CITY_RUSH_POWERS.PISTOL });
      return false;
    }
    inventory = consumed.inventory;
    spawnActionPulse('player', CITY_RUSH_POWERS.PISTOL);
    // Tout droit, sans viser : le projectile part même si la voie est vide.
    fireStraightShot('player', null, CITY_RUSH_POWERS.PISTOL);
    emitHud(true);
    return true;
  }

  function useRacerPower(racer) {
    if (sprint) return false;
    const type = CITY_RUSH_POWERS.PISTOL;
    if (racer.wrecked || racer.stunLeft > 0 || (racer.spinLeft || 0) > 0 || racer.powerCooldown > 0 || !isCityRushPowerCharged(racer.inventory, type)) return false;
    // L'IA ne gaspille pas sa charge dans le vide : quelqu'un doit déjà occuper
    // sa voie. Le projectile, lui, n'est pas guidé.
    if (!firstEnemyOnLane(racer.id)) return false;

    const consumed = consumeCityRushCharge(racer.inventory, type);
    if (!consumed.consumed) return false;
    racer.inventory = consumed.inventory;
    racer.powerCooldown = 1.1;
    spawnActionPulse(racer.id, type);
    fireStraightShot(racer.id, null, CITY_RUSH_POWERS.PISTOL);
    return true;
  }

  // ── L'escouade de police et ses unités de représailles ────────────────
  // Les trois unités de base poursuivent le joueur au dernier tour ; chaque
  // rival ayant tiré sur une voiture de police reçoit une unité réservée.
  // Aucune berline ne compte au classement. Elles restent **solides** et
  // peuvent couper la route à la cible qui leur est assignée.
  const packLeader = { id: 'player', name: 'TOI', isPlayer: true, distance: 0, lane: playerStartLane, x: laneX(playerStartLane), width: 1.9, speed: 0, racer: null };

  // Largeurs de collision : exactement celles engagées dans la résolution de
  // mouvement des voitures, pour que le barrage se juge pare-chocs contre
  // pare-chocs comme avec le trafic lent.
  const playerCollisionWidth = () => 1.9 * playerProfile.widthScale;
  const racerCollisionWidth = (racer) => 1.9 * 0.92 * (racer?.profile?.widthScale || 1);

  // Les quatre voitures de course, avec tout ce qu'il faut pour juger un
  // barrage, une rafale ou une collision : voie, position latérale, largeur et
  // vitesse. C'est la liste des clients possibles d'une berline.
  function raceEntries() {
    return [
      {
        id: 'player', name: 'TOI', isPlayer: true, distance, lane: playerLane,
        x: playerX, width: playerCollisionWidth(), speed: currentSpeed, racer: null,
      },
      ...racers.map((racer) => ({
        id: racer.id,
        name: racer.name,
        isPlayer: false,
        distance: racer.distance,
        lane: racer.lane,
        x: racer.currentX,
        width: racerCollisionWidth(racer),
        speed: racer.currentSpeed || racer.baseSpeed,
        racer,
      })),
    ];
  }

  function refreshPackLeader() {
    const entries = raceEntries();
    Object.assign(packLeader, cityRushPackLeader(entries) || entries[0]);
    return packLeader;
  }

  function registerPoliceRetaliation(attackerId, source = CITY_RUSH_POWERS.PISTOL) {
    if (!attackerId || attackerId === 'player') return null;
    const attacker = racers.find((racer) => racer.id === attackerId);
    if (!attacker || attacker.wrecked || policeRetaliationByAttacker.has(attackerId)) {
      return policeRetaliationByAttacker.get(attackerId) || null;
    }
    const reserve = policeCars.find((police) => police.reserveForId === attackerId);
    if (!reserve || reserve.everDeployed) return null;
    const target = raceEntries().find((entry) => entry.id === attackerId);
    activatePoliceUnit(reserve, target, {
      reinforcement: true,
      unitNumber: reserve.unitNumber,
      targetId: attackerId,
    });
    policeRetaliationByAttacker.set(attackerId, reserve);
    audioRef?.current?.policeSiren?.({ level: 0.5 });
    getCallbacks().effect?.({
      type: 'police-retaliation',
      id: reserve.id,
      police: reserve.name,
      target: attacker.name,
      targetId: attackerId,
      source,
      count: CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
      lap,
    });
    emitHud(true);
    return reserve;
  }

  function activatePoliceUnit(police, target, { reinforcement = false, unitNumber = null, targetId = 'player' } = {}) {
    const number = Number.isFinite(unitNumber) ? unitNumber : nextPoliceUnitNumber++;
    police.unitNumber = number;
    police.id = `police-${number}`;
    police.name = policeUnitName(number, police.vehicleType);
    // La cible est explicite : l'escouade et ses remplaçantes visent le joueur,
    // tandis qu'une unité de représailles reste attachée au rival concerné.
    police.targetId = targetId;
    police.reinforcement = Boolean(reinforcement);
    police.active = true;
    police.everDeployed = true;
    police.reinforcementPending = false;
    // Aucune charge au déploiement : la mitrailleuse se remplit avec les
    // rares bonus rouges. L'attaque d'hélicoptère a été retirée.
    police.inventory = createCityRushPoliceInventory();
    police.slowLeft = 0;
    police.blueShotSlowLeft = 0;
    police.trafficImpactLeft = 0;
    police.boostLeft = 0;
    police.stunLeft = 0;
    police.stunTotal = 0;
    police.skidLeft = 0;
    police.skidSide = 1;
    police.skidDuration = 0.85;
    police.powerCooldown = 0;
    police.health = CITY_RUSH_POLICE_HEALTH;
    police.healthFlash = 0;
    police.changeIn = 0.3 + police.index * 0.35;
    police.mode = 'hunt';
    police.blockLeft = 0;
    police.blockArmed = true;
    police.collisionCooldownLeft = 0;
    const spawnTarget = target || refreshPackLeader();
    // Une arrivée initiale se décale légèrement par slot ; un renfort revient
    // derrière le pilote qu'il est chargé de rattraper. S'il tomberait à moins
    // d'une distance de sécurité d'un autre pilote, on lui cherche une voie et
    // un point de départ libres : un rival peut être exactement à 30 m derrière
    // son adversaire et occupait l'ancien point de spawn.
    const stagger = reinforcement ? 0 : police.index * 8;
    const preferredSpawnDistance = Math.max(0, spawnTarget.distance - CITY_RUSH_POLICE_SPAWN_BEHIND - stagger);
    const furthestSpawnDistance = Math.max(0, spawnTarget.distance - CITY_RUSH_CAR_GAP);
    const spawnActors = [
      ...raceEntries(),
      ...activePursuers()
        .filter((other) => other.id !== police.id)
        .map((other) => ({ id: other.id, lane: other.lane, distance: other.distance, x: other.currentX, width: other.width })),
    ];
    // Voies du parcours : sur la piste resserrée du Ring, l'escouade ne doit
    // pas viser une abscisse urbaine — les deux voies utiles n'y existent pas.
    const homeLane = policeLanes[police.index % policeLanes.length];
    const laneOptions = [homeLane, ...policeLanes.filter((lane) => lane !== homeLane)];
    const isSafeSpawn = (lane, spawnDistance) => {
      const spawnX = laneX(lane);
      return spawnActors.every((actor) => {
        const actorDistance = Number(actor.distance);
        if (!Number.isFinite(actorDistance)) return true;
        const actorX = Number.isFinite(Number(actor.x)) ? Number(actor.x) : laneX(actor.lane);
        const actorWidth = Number.isFinite(Number(actor.width)) ? Number(actor.width) : 1.9;
        const laterallyOverlapping = actor.lane === lane
          || (Number.isFinite(actorX) && Math.abs(actorX - spawnX) < (police.width + actorWidth) / 2);
        return !laterallyOverlapping || Math.abs(actorDistance - spawnDistance) >= CITY_RUSH_CAR_GAP;
      });
    };
    let spawnLane = laneOptions[0];
    let spawnDistance = preferredSpawnDistance;
    let safeSpawnFound = false;
    const maxSearchSteps = Math.ceil((CITY_RUSH_POLICE_SPAWN_BEHIND + stagger) / CITY_RUSH_CAR_GAP) + 1;
    for (let step = 0; step <= maxSearchSteps && !safeSpawnFound; step += 1) {
      const distances = step === 0
        ? [preferredSpawnDistance]
        : [preferredSpawnDistance - step * CITY_RUSH_CAR_GAP, preferredSpawnDistance + step * CITY_RUSH_CAR_GAP];
      for (const candidateDistance of distances) {
        if (candidateDistance < 0 || candidateDistance > furthestSpawnDistance) continue;
        const candidateLane = laneOptions.find((lane) => isSafeSpawn(lane, candidateDistance));
        if (candidateLane === undefined) continue;
        spawnLane = candidateLane;
        spawnDistance = candidateDistance;
        safeSpawnFound = true;
        break;
      }
    }
    police.lane = spawnLane;
    police.homeLane = police.lane;
    police.currentX = laneX(police.lane);
    police.distance = spawnDistance;
    police.currentSpeed = (spawnTarget.speed || PLAYER_SPEED) * 0.68;
    police.lastPassGap = undefined;
    police.phase = police.index * 1.7 + number * 0.37;
    police.mesh.visible = true;
    police.mesh.position.set(police.currentX + trackRelativeX(police.distance), trackRelativeY(police.distance), PLAYER_Z - (police.distance - distance) * SCALE);
    police.mesh.rotation.set(trackPitch(police.distance), trackYaw(police.distance), 0);
    const healthBar = police.mesh.userData.healthBar;
    if (healthBar) {
      healthBar.bar.visible = false;
      healthBar.segments?.forEach((segment) => {
        segment.visible = true;
        segment.material.color.setHex(POLICE_BAR_FULL_COLOR);
      });
      healthBar.flash.material.opacity = 0;
    }
    police.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
    police.mesh.userData.beacons.forEach((beacon) => { beacon.material.opacity = 1; });
  }

  function deployPolice() {
    // Sprint solo : l'escouade n'existe pas dans ce format, quel que soit le
    // chemin qui appellerait le déploiement (dernier tour, poursuite, renfort).
    if (sprint || policeDeployed) return;
    policeDeployed = true;
    const player = raceEntries().find((entry) => entry.id === 'player');
    const squad = policeCars.filter((police) => police.squad);
    squad.forEach((police, index) => activatePoliceUnit(police, player, {
      unitNumber: index + 1,
      targetId: 'player',
    }));
    nextPoliceUnitNumber = policeCars.length + 1;
    audioRef?.current?.policeSiren?.({ level: 0.4 });
    // La police arrive avec la mitrailleuse vide ; elle ne dispose d'aucune
    // frappe d'hélicoptère.
    getCallbacks().effect?.({
      type: 'police-arrival',
      count: CITY_RUSH_POLICE_COUNT,
      armed: squad.map((police) => ({
        id: police.id,
        name: police.name,
        vehicleType: police.vehicleType,
        isSuv: police.vehicleType === 'police-suv',
        [CITY_RUSH_POWERS.PISTOL]: isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL),
      })),
      helicopterAvailable: false,
      target: 'player',
      targetId: 'player',
      lap,
    });
  }

  function queuePoliceReinforcement(police) {
    if (!police?.squad || !police.everDeployed || police.active || police.reinforcementPending) return false;
    police.reinforcementPending = true;
    policeReinforcementQueue.push(police);
    if (policeReinforcementQueue.length === 1) {
      policeReinforcementTimer = CITY_RUSH_POLICE_REINFORCEMENT_DELAY;
    }
    return true;
  }

  function updatePoliceReinforcements(dt) {
    // En Poursuite, les patrouilles peuvent être abattues avant le dernier tour.
    // Les remplaçantes n'entrent toutefois en piste qu'à l'ouverture de celui-ci.
    if (sprint || !active || finished || playerWrecked || !policeDeployed || lap < effectiveLaps) return;
    policeCars.forEach((police) => {
      if (police.everDeployed && !police.active && !police.reinforcementPending) queuePoliceReinforcement(police);
    });
    if (!policeReinforcementQueue.length) return;
    policeReinforcementTimer = Math.max(0, policeReinforcementTimer - dt);
    if (policeReinforcementTimer > 0) return;

    const police = policeReinforcementQueue.shift();
    const player = raceEntries().find((entry) => entry.id === 'player');
    activatePoliceUnit(police, player, { reinforcement: true });
    policeReinforcementTimer = policeReinforcementQueue.length ? CITY_RUSH_POLICE_REINFORCEMENT_DELAY : 0;
    audioRef?.current?.policeSiren?.({ level: 0.4 });
    getCallbacks().effect?.({
      type: 'police-reinforcement',
      id: police.id,
      police: police.name,
      vehicleType: police.vehicleType,
      isSuv: police.vehicleType === 'police-suv',
      target: 'player',
      targetId: 'player',
      lap,
    });
    emitHud(true);
  }

  // ── La police du trafic passe à l'attaque ────────────────────────────────
  // Percuter une berline de police en ronde la sort de sa patrouille : elle
  // prend en chasse le pilote qui l'a touchée, avec les mêmes armes que
  // l'escouade du dernier tour (barrage roulant, vols de bonus, rafales). Elle
  // chasse à toute heure de la course — pas seulement au dernier tour — puis
  // rentre dans le rang au drapeau à damier et retrouve sa ronde au départ
  // suivant.
  function rallyTrafficPolice(traffic, targetId = 'player') {
    if (!traffic || traffic.rallied || traffic.destroyed || traffic.type !== 'police') return null;
    traffic.rallied = true;
    const police = {
      id: `rally-${traffic.id}`,
      name: 'POLICE ROUTIÈRE',
      // Elle se range derrière l'escouade : les décalages de hauteur et la
      // voie de repli ne dépendent que de ce rang.
      index: CITY_RUSH_POLICE_COUNT + ralliedCars.length,
      squad: false,
      rallied: true,
      // Le pilote qu'elle poursuit : celui qui l'a percutée.
      targetId,
      mesh: traffic.mesh,
      lane: traffic.lane,
      currentX: traffic.currentX,
      distance: traffic.distance,
      // Elle abandonne sa vitesse de ronde et démarre sa chasse lancée.
      currentSpeed: Math.max(traffic.currentSpeed, CITY_RUSH_POLICE_RALLY_BASE_SPEED * 0.62),
      baseSpeed: CITY_RUSH_POLICE_RALLY_BASE_SPEED * randomRange(0.95, 1.05),
      phase: traffic.phase,
      changeIn: 0.12,
      slowLeft: 0,
      blueShotSlowLeft: 0,
      trafficImpactLeft: 0,
      boostLeft: 0,
      stunLeft: 0,
      stunTotal: 0,
      skidLeft: 0,
      powerCooldown: 0,
      // Comme l'escouade : elle passe à l'attaque bleu et rouge chargés.
      inventory: createCityRushPoliceInventory(),
      active: true,
      health: CITY_RUSH_POLICE_HEALTH,
      healthFlash: 0,
      mode: 'hunt',
      blockLeft: 0,
      blockArmed: true,
      collisionCooldownLeft: 0,
      homeLane: null,
      width: Number(traffic.width) || 1.94,
      lastPassGap: undefined,
    };
    attachPoliceGlow(police.mesh);
    attachPoliceHealthBar(police.mesh);
    ralliedCars.push(police);
    getCallbacks().effect?.({ type: 'police-rally', police: police.name, targetId, target: targetId === 'player' ? 'player' : null, lap });
    // Le message d'alerte reste à l'écran : la berline se met souvent en
    // barrage dans la seconde qui suit, et l'avis de barrage ne doit pas
    // l'effacer aussitôt.
    policeBlockNoticeCooldown = Math.max(policeBlockNoticeCooldown, 2.5);
    return police;
  }

  // Fin de course ou nouveau départ : les berlines de trafic rappelées
  // reprennent leur ronde, halo éteint. Une berline détruite pendant la
  // course ne revient pas : son épave carbonisée reste hors piste jusqu'au
  // prochain départ, où le trafic est entièrement remis en grille.
  function releaseRalliedPolice() {
    if (!ralliedCars.length) return;
    for (const police of ralliedCars) {
      detachPoliceGlow(police.mesh);
      detachPoliceHealthBar(police.mesh);
      const traffic = trafficCars.find((car) => `rally-${car.id}` === police.id);
      if (!traffic) continue;
      if (police.health <= 0) {
        traffic.destroyed = true;
        police.mesh.visible = false;
        continue;
      }
      traffic.rallied = false;
      traffic.currentSpeed = traffic.baseSpeed;
    }
    ralliedCars.length = 0;
  }

  // Contact avec une berline de police en ronde : recouvrement latéral et
  // pare-chocs dans la fenêtre de sécurité des voitures — la résolution de
  // mouvement les cale exactement à `CITY_RUSH_CAR_GAP` quand l'un pousse
  // l'autre. C'est ce contact qui la rappelle.
  function checkPoliceRally() {
    if (sprint || !active || finished) return;
    const playerXNow = playerCar.position.x;
    const playerWidth = playerCollisionWidth();
    for (const traffic of trafficCars) {
      if (traffic.rallied || traffic.type !== 'police') continue;
      if (!cityRushPoliceContact({
        gap: traffic.distance - distance,
        x: traffic.currentX,
        targetX: playerXNow,
        width: traffic.width,
        targetWidth: playerWidth,
      })) continue;
      rallyTrafficPolice(traffic, 'player');
    }
  }

  // ── Dégâts et HUD de santé du pilote ───────────────────────────────────
  // La barre de quinze cellules est active dès le départ. Un tir rouge, un tir
  // bleu ou une collision avec une voiture de police en retire exactement une.
  // Un tir rouge ne modifie jamais la vitesse, le dérapage ou la toupie de sa
  // cible. À zéro, la voiture part en épave comme avant.
  function activatePlayerHealth() {
    if (playerHealthActive) return;
    playerHealthActive = true;
    playerHealth = CITY_RUSH_PLAYER_HEALTH;
    playerHealthFlash = 0;
    getCallbacks().effect?.({
      type: 'player-health',
      health: playerHealth,
      maxHealth: CITY_RUSH_PLAYER_HEALTH,
      lap,
    });
    emitHud(true);
  }

  // `context` (facultatif) voyage avec l'effet `player-hit` : le carambolage y
  // joint la distance berline/pilote au moment du choc, pour que le smoke
  // vérifie qu'aucune berline restée derrière ne compte comme un choc.
  function damagePlayer(source, attackerId = null, context = null) {
    if (!playerHealthActive || finished) return 0;
    const before = playerHealth;
    playerHealth = cityRushPlayerDamage(playerHealth, source);
    const lost = before - playerHealth;
    if (lost <= 0) return 0;
    playerHealthFlash = CITY_RUSH_PLAYER_HEALTH_FLASH;
    // Le choc se sent aussi à la caméra : d'autant plus que le carré coûte cher.
    cameraKick = Math.max(cameraKick, 0.2 + lost * 0.06);
    const hit = {
      type: 'player-hit',
      source,
      damage: lost,
      health: playerHealth,
      maxHealth: CITY_RUSH_PLAYER_HEALTH,
      attacker: attackerId ? getRaceVehicleState(attackerId)?.name || null : null,
      critical: playerHealth <= CITY_RUSH_PLAYER_HEALTH_CRITICAL,
      lap,
    };
    if (context) Object.assign(hit, context);
    getCallbacks().effect?.(hit);
    emitHud(true);
    // Barre à zéro : plus de voiture. La toupie commence ici, la course se
    // termine à la fin de l'épave (`updateWreck`).
    if (playerHealth <= 0 && !playerWrecked) wreckPlayer();
    return lost;
  }

  // La coque a cédé : la voiture part en toupie sur place pendant deux tours,
  // sa vitesse tombe à zéro, elle fume noir et
  // crache des étincelles. `playerWreckLeft` compte la fin de l'épave ; à zéro,
  // la course est perdue.
  function wreckPlayer() {
    playerWrecked = true;
    playerWreckLeft = CITY_RUSH_WRECK_SECONDS;
    // La toupie réutilise `cityRushStunSpin` : son lacet boucle un nombre entier
    // de tours et la voiture se pose face à la route.
    playerStunLeft = CITY_RUSH_WRECK_SECONDS;
    playerStunTotal = CITY_RUSH_WRECK_SECONDS;
    playerWreckSpinTurns = CITY_RUSH_WRECK_SPIN_TURNS;
    playerBoostLeft = 0;
    cameraKick = Math.max(cameraKick, 1.2);
    audioRef?.current?.explosion({ pan: vehiclePan('player') });
    audioRef?.current?.skid({ pan: vehiclePan('player'), intensity: 1.35, duration: 1.4 });
    // Le capot lâche : bouffée noire, braises et poussière, au niveau du sol.
    smoke.emit(playerCar.position, { color: 0x24242c, opacity: 0.7, scale: 1.1, grow: 2.8, life: 1.5, velocity: [0, 2.6, 0.4] });
    for (let spark = 0; spark < 6; spark += 1) {
      smoke.emit(playerCar.position, { color: 0xff7a2a, opacity: 0.85, scale: 0.34, grow: 2.1, life: 0.55, velocity: [(Math.random() - 0.5) * 5, 2.4 + Math.random() * 2.6, (Math.random() - 0.5) * 5] });
    }
    // Aucun bandeau : la page apprend la nouvelle par l'effet (contrôles) et par
    // le bilan de fin de course, pas par un message qui doublerait l'overlay.
    getCallbacks().effect?.({ type: 'player-wrecked', health: 0, lap });
  }

  function updateWreck(dt) {
    if (!playerWrecked || finished) return;
    playerWreckLeft = Math.max(0, playerWreckLeft - dt);
    if (playerWreckLeft > 0) return;
    // L'épave est immobile depuis la fin de la toupie : la course est perdue.
    finishRace({ destroyed: true });
  }

  // Percuter une berline solide en arrivant dessus à pleine allure : elle perd
  // un point de vie et le pilote ne perd aucun carré. L'animation reste celle
  // d'un choc net — étincelles, cri de pneus, secousse de caméra — sans l'état
  // « choc » du trafic : aucune des deux voitures ne se met à ramper.
  function applyPoliceCollision(police) {
    police.collisionCooldownLeft = CITY_RUSH_POLICE_COLLISION_COOLDOWN;
    spawnTrafficImpact('player', police.id);
    audioRef?.current?.skid({ pan: vehiclePan('player'), intensity: 1.1, duration: 0.82 });
    cameraKick = Math.max(cameraKick, 0.52);
    damagePolice(police, 'collision', 'player');
  }

  // Un carambolage se juge sur la règle pure `cityRushPoliceCollisionHit` : la
  // berline doit être **devant** le pilote et celui-ci doit **arriver sur elle**
  // (vitesse d'approche). Suivre le pilote à sa hauteur ou se replier derrière
  // lui pour tirer ne compte pas — la position de tir de l'escouade (5 m derrière)
  // ne doit jamais produire un choc invisible.
  function checkPoliceCollisions() {
    if (sprint || !active || finished) return;
    if (playerJumpState.active && (playerCar.position.y || 0) > 0.8) return;
    const playerXNow = playerCar.position.x;
    const playerWidth = playerCollisionWidth();
    for (const police of activePursuers()) {
      if (police.health <= 0 || police.collisionCooldownLeft > 0) continue;
      if (!cityRushPoliceCollisionHit({
        gap: police.distance - distance,
        closing: currentSpeed - (Number(police.currentSpeed) || 0),
        x: police.currentX,
        targetX: playerXNow,
        width: police.width,
        targetWidth: playerWidth,
      })) continue;
      applyPoliceCollision(police);
    }
  }

  // Un tir droit de l'escouade : même AK-47 que les rivaux, sans viser.
  function fireAsPolice(police) {
    const consumed = consumeCityRushCharge(police.inventory, CITY_RUSH_POWERS.PISTOL);
    if (!consumed.consumed) return false;
    police.inventory = consumed.inventory;
    police.powerCooldown = CITY_RUSH_POLICE_FIRE_COOLDOWN;
    spawnActionPulse(police.id, CITY_RUSH_POWERS.PISTOL);
    fireStraightShot(police.id, null, CITY_RUSH_POWERS.PISTOL);
    return true;
  }

  // La mitrailleuse rouge reste disponible tant qu'un pilote actif doit encore
  // la charger. Les voitures déjà chargées ne la ciblent/collectent plus : le
  // bonus reste réservé aux autres participants.
  function redPickupsHiddenForRace() {
    const opponentInventories = [
      ...racers.map((racer) => racer.inventory),
      ...activePursuers().map((police) => police.inventory),
    ];
    return shouldHideCityRushPistolPickup(inventory, opponentInventories);
  }

  // Les choix de voie des rivaux et de la police partagent ces bonus visibles,
  // avec un filtre propre à l'inventaire de chaque voiture.
  function visiblePickups(actorInventory = null) {
    const hideRedForRace = redPickupsHiddenForRace();
    return rows.flatMap((row) => row.pickups
      .map((pickup, index) => ({
        ...pickup,
        distance: row.trackDistance,
        claimed: isCityRushPickupHidden(row.pickupClaims, index, elapsed),
        visible: row.slots[index]?.visible,
      }))
      .filter((pickup) => !pickup.claimed && pickup.visible)
      .filter((pickup) => canCollectCityRushPickup(actorInventory, pickup.type, { redPickupsHidden: hideRedForRace })));
  }

  function updatePolice(dt, packLeaderEntry) {
    // Sprint : aucune unité en piste, aucune annonce — la chasse ne tourne pas.
    if (sprint) return;
    policeStealNoticeCooldown = Math.max(0, policeStealNoticeCooldown - dt);
    policeBlockNoticeCooldown = Math.max(0, policeBlockNoticeCooldown - dt);
    const pursuers = activePursuers();
    pursuers.forEach((police) => { police.healthFlash = Math.max(0, (police.healthFlash || 0) - dt); });
    if (!pursuers.length) return;
    // Le trafic en ronde : identifiant pour l'impact, position et vitesse pour
    // repérer une voie bouchée (une berline évite de s'y engluer).
    const traffic = rollingTraffic().map((car) => ({
      id: car.id, lane: car.lane, distance: car.distance, x: car.currentX, width: car.width, speed: car.currentSpeed,
    }));
    // Le trafic venant en face rend les voies de gauche infréquentables pour
    // l'escouade (vitesse négative : les voies passent pour bouchées). Il ne
    // bloque en revanche pas le déplacement des berlines — il se croise.
    const oncomingForLanes = oncomingCars.map((car) => ({
      id: car.id, lane: car.lane, distance: car.distance, x: car.currentX, width: car.width, speed: -car.currentSpeed,
    }));
    // Les voitures de course sont solides pour les berlines : le joueur et les
    // rivaux sont des obstacles à part entière (une berline ne les traverse
    // plus, et ne se rabat pas sur leur capot).
    const raceCars = raceEntries();
    // Chaque berline vise son propre client : l'escouade et ses remplaçantes
    // ciblent le joueur, les unités de représailles leur rival assigné, et la
    // police du trafic rappelée le pilote qui l'a percutée.
    const targets = new Map(pursuers.map((police) => [
      police.id,
      (police.targetId ? raceCars.find((entry) => entry.id === police.targetId) : null) || packLeaderEntry,
    ]));
    const priorDistances = new Map(pursuers.map((police) => [police.id, police.distance]));
    const priorXs = new Map(pursuers.map((police) => [police.id, police.currentX]));
    const requests = [];
    // Une seule berline mène le barrage, et par client : celle qui est le mieux
    // placée devant lui (la plus proche de son pare-chocs). Les autres
    // continuent leur mission de vol de bonus et de tir, et prennent le relais
    // dès qu'elles passent devant. L'escouade du dernier tour et la police du
    // trafic rappelée peuvent donc barrer en même temps, chacune devant son
    // pilote.
    const interceptors = new Map();
    for (const police of pursuers) {
      if (police.stunLeft > 0) continue;
      const target = targets.get(police.id) || packLeaderEntry;
      const lead = police.distance - (target?.distance ?? police.distance);
      if (lead <= 0 || lead > CITY_RUSH_POLICE_INTERCEPT_RANGE) continue;
      const current = interceptors.get(target?.id);
      if (!current || police.distance < current.distance) interceptors.set(target?.id, police);
    }

    for (const police of pursuers) {
      const leader = targets.get(police.id) || packLeaderEntry;
      const leaderX = Number.isFinite(Number(leader.x)) ? Number(leader.x) : laneX(clamp(Number(leader.lane) || 0, 0, laneCount - 1));
      const leaderWidth = Number.isFinite(Number(leader.width)) ? Number(leader.width) : playerCollisionWidth();
      police.slowLeft = Math.max(0, police.slowLeft - dt);
      police.blueShotSlowLeft = Math.max(0, police.blueShotSlowLeft - dt);
      police.trafficImpactLeft = Math.max(0, police.trafficImpactLeft - dt);
      police.boostLeft = Math.max(0, (police.boostLeft || 0) - dt);
      police.stunLeft = Math.max(0, police.stunLeft - dt);
      police.skidLeft = Math.max(0, police.skidLeft - dt);
      police.powerCooldown = Math.max(0, police.powerCooldown - dt);
      police.blockLeft = Math.max(0, police.blockLeft - dt);
      police.collisionCooldownLeft = Math.max(0, (police.collisionCooldownLeft || 0) - dt);
      // La seule arme de la police est la mitrailleuse rouge, chargée par un bonus.
      const charged = isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL);
      const armed = charged && police.powerCooldown <= 0;
      const gap = police.distance - leader.distance;

      // Position de barrage : devant le leader, dans sa voie (ou à sa hauteur
      // latérale) et à portée. La berline y lève le pied quelques secondes,
      // puis repart — elle ne réarme qu'après avoir quitté la position, sinon
      // elle resterait collée devant lui.
      const inBlockadePosition = police.stunLeft <= 0 && cityRushPoliceBlocksLeader({
        gap,
        lane: police.lane,
        leaderLane: leader.lane,
        x: police.currentX,
        leaderX,
        policeWidth: police.width,
        leaderWidth,
      });
      // Élue devant SON client : c'est elle qui coupe la route, les autres
      // continuent de le harceler.
      const isInterceptor = interceptors.get(leader.id) === police;
      if (!inBlockadePosition) police.blockArmed = true;
      else if (police.blockArmed && isInterceptor) {
        police.blockLeft = CITY_RUSH_POLICE_BLOCKADE_HOLD * randomRange(0.88, 1.16);
        police.blockArmed = false;
        // Le barrage se raconte, mais sans noyer le HUD : au plus un message
        // toutes les 4,5 s, que ce soit nous ou un rival qui soit bloqué.
        if (policeBlockNoticeCooldown <= 0) {
          policeBlockNoticeCooldown = 4.5;
          getCallbacks().effect?.({
            type: 'police-block',
            police: police.name,
            target: leader.isPlayer ? 'player' : leader.name,
            targetId: leader.id,
            lap,
          });
        }
      }
      const barring = inBlockadePosition && police.blockLeft > 0;
      // Barrage : la berline tient sa voie et freine. Sinon, une arme chargée
      // (rouge ou bleu) et leader devant : elle se replie pour tirer. Sinon
      // elle chasse devant lui, à hauteur de ses bonus.
      police.mode = barring ? 'blockade' : armed ? 'attack' : 'hunt';

      // Bombardée, la berline ne choisit plus sa trajectoire : la décision
      // (et son minuteur) attendent la fin de la toupie, comme les rivaux.
      if (police.stunLeft <= 0) police.changeIn -= dt;
      if (police.stunLeft <= 0 && police.changeIn <= 0) {
        // Un barrage ne change pas de voie : c'est ce qui le rend lisible.
        if (!barring) {
          const availableLanes = [police.lane];
          for (const lane of [police.lane - 1, police.lane + 1]) {
            if (lane >= 0 && lane < laneCount && canEnterLane(police.id, lane)) availableLanes.push(lane);
          }
          const nextLane = chooseCityRushPoliceLane({
            currentLane: police.lane,
            laneCount,
            distance: police.distance,
            speed: police.currentSpeed || police.baseSpeed,
            availableLanes,
            pickups: visiblePickups(police.inventory),
            traffic: [...traffic, ...oncomingForLanes],
            racers: raceCars,
            targetLane: leader.lane,
            homeLane: police.homeLane,
            // La berline désignée se rabat dans la voie du leader : c'est là
            // qu'elle peut lui couper la route.
            interceptLane: isInterceptor ? leader.lane : null,
            interceptGap: gap,
            // Engluée derrière une voiture solide : elle s'extrait de la voie
            // avant de penser aux bonus, sinon elle ne verrait jamais le
            // pare-chocs du leader.
            stuck: police.currentSpeed < police.baseSpeed * 0.5,
            lookAheadDistance: CITY_RUSH_POLICE_LOOKAHEAD,
          });
          if (nextLane !== police.lane) police.lane = nextLane;
          police.changeIn = randomRange(0.34, 0.58);
        }
      }

      let targetSpeed = cityRushPolicePace({
        gap,
        baseSpeed: police.baseSpeed,
        leaderSpeed: leader.speed || police.baseSpeed,
        // Décalées de quelques mètres : les deux véhicules côte à côte plutôt
        // qu'une file indienne derrière le leader. Juste après un barrage, la
        // berline vise plus loin pour se dégager avant de revenir à la charge.
        lead: police.mode === 'attack'
          ? CITY_RUSH_POLICE_ATTACK_LEAD
          : inBlockadePosition && !barring
            ? CITY_RUSH_POLICE_LEAD + 30
            : CITY_RUSH_POLICE_LEAD + police.index * 6,
        tolerance: CITY_RUSH_POLICE_LEAD_SLACK,
        blocking: barring,
      });
      if (police.stunLeft > 0) targetSpeed = 0;
      else {
        if (police.slowLeft > 0 || police.trafficImpactLeft > 0) targetSpeed *= 0.6;
        if (police.blueShotSlowLeft > 0) targetSpeed *= CITY_RUSH_BLUE_SHOT_SPEED_FACTOR;
        if (police.boostLeft > 0) targetSpeed *= CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR;
      }
      // Engluée derrière un véhicule lent ou un pilote, ou sonnée par un choc :
      // elle relance tout de suite son choix de voie au lieu d'attendre la fin
      // de son délai.
      if (police.currentSpeed < targetSpeed * 0.55) police.changeIn = Math.min(police.changeIn, 0.1);
      police.currentSpeed = approachCityRushSpeed(police.currentSpeed, Math.max(0, targetSpeed), 13.5, dt);
      police.currentX = lerp(police.currentX, laneX(police.lane), Math.min(1, dt * 5.6));
      const before = priorDistances.get(police.id);
      requests.push({
        id: police.id,
        lane: police.lane,
        x: police.currentX,
        width: police.width,
        distance: before,
        nextDistance: before + police.currentSpeed * dt,
      });
    }

    const resolved = resolveCityRushPoliceMovement(requests, traffic, CITY_RUSH_CAR_GAP, raceCars);
    const resolvedById = new Map(resolved.map((car) => [car.id, car.nextDistance]));
    // Comme le joueur et les rivaux (voir `applyTrafficImpact`), une berline
    // freinée par un véhicule lent le heurte : 0,6 s de ralenti, un dérapage,
    // et le véhicule se rabat sur une voie voisine. Sans cela
    // l'escouade restait engluée derrière lui tandis que le leader s'envolait —
    // elle n'était plus jamais à l'écran. Un choc refusé (véhicule déjà en
    // train de se rabattre, ou en délai de grâce) est rejoué à l'image suivante.
    for (const car of resolved) {
      const blocker = car.blockedBy ? trafficCars.find((item) => item.id === car.blockedBy) : null;
      if (blocker) applyTrafficImpact(car.id, blocker);
    }
    let nearest = Infinity;
    for (const police of pursuers) {
      const before = priorDistances.get(police.id);
      const priorX = priorXs.get(police.id);
      police.distance = resolvedById.get(police.id) ?? before;
      police.currentSpeed = dt > 0 ? Math.max(0, (police.distance - before) / dt) : police.currentSpeed;
      const gap = police.distance - distance;
      const visible = police.active && gap > -CITY_RUSH_POLICE_VIEW_BEHIND && gap < 150;
      // Une rafale encaissée fait déraper la berline, comme les rivaux.
      const skid = skidOffset(police.skidLeft, police.skidDuration, police.skidSide || 1);
      police.mesh.visible = visible;
      police.mesh.position.set(police.currentX + skid + trackRelativeX(police.distance), trackRelativeY(police.distance) + (police.stunLeft > 0 ? 0.05 : 0), PLAYER_Z - gap * SCALE);
      police.mesh.rotation.x = trackPitch(police.distance);
      // Toupie du stun héliporté pour la berline bombardée, comme les rivaux.
      police.mesh.rotation.y = trackYaw(police.distance) + cityRushStunSpin(police.stunLeft, police.stunTotal) + clamp((police.currentX - priorX) * -3.2 + skid * 0.22, -0.22, 0.22);
      // Halo rouge/bleu sous le châssis et gyrophares : la poursuite se voit
      // de loin, contrairement à la berline du trafic lent.
      const pursuit = police.mesh.userData.pursuit;
      if (pursuit) {
        const beat = Math.floor(clockTime * 6.5 + police.phase) % 2 === 0;
        pursuit.glowMaterial.color.setHex(beat ? 0xff2b45 : 0x2b6bff);
        pursuit.glowMaterial.opacity = visible ? 0.2 + Math.abs(Math.sin(clockTime * 9 + police.phase)) * 0.2 : 0;
      }
      police.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += police.currentSpeed * dt * 0.95; });
      police.mesh.userData.beacons.forEach((beacon, beaconIndex) => {
        const flashing = Math.floor(clockTime * 9 + police.phase + beaconIndex) % 2 === 0;
        beacon.material.opacity = flashing ? 1 : 0.16;
      });
      // Barre de vie au-dessus du toit : visible en chasse, tournée vers la
      // caméra, qui se vide de droite à gauche et flashe à chaque dégât.
      const healthBar = police.mesh.userData.healthBar;
      if (healthBar) {
        const ratio = clamp(police.health / CITY_RUSH_POLICE_HEALTH, 0, 1);
        const remainingSquares = Math.ceil(clamp(police.health, 0, CITY_RUSH_POLICE_HEALTH));
        healthBar.bar.visible = visible && police.health > 0;
        if (healthBar.bar.visible) {
          healthBar.segments?.forEach((segment, segmentIndex) => {
            segment.visible = segmentIndex < remainingSquares;
            segment.material.color.setHex(ratio > 0.5 ? POLICE_BAR_FULL_COLOR : POLICE_BAR_LOW_COLOR);
          });
          healthBar.flash.material.opacity = police.healthFlash > 0 ? clamp(police.healthFlash / 0.28, 0, 1) * 0.85 : 0;
          healthBar.bar.lookAt(camera.position);
        } else {
          healthBar.flash.material.opacity = 0;
        }
      }
      const previousGap = police.lastPassGap;
      police.lastPassGap = gap;
      if (visible && previousGap !== undefined && Math.abs(gap) < PASS_BY_RANGE && Math.abs(previousGap) >= PASS_BY_RANGE) {
        const relative = Math.abs(police.currentSpeed - currentSpeed);
        if (relative > 2.5) audioRef?.current?.passby({ pan: vehiclePan(police.id), speed: clamp(relative / 14, 0, 1) });
      }
      if (police.active) nearest = Math.min(nearest, Math.abs(gap));
    }

    // La sirène suit la proximité de la berline la plus proche : l'escouade
    // s'entend arriver avant d'entrer dans le cadre.
    audioRef?.current?.policeSiren?.({
      level: nearest === Infinity ? 0 : clamp(1 - (nearest - 14) / 96, 0, 1),
    });

    // L'AK-47 de la police part tout droit dans sa voie : elle ne tire que
    // si un ennemi occupe déjà ce chemin.
    for (const police of pursuers) {
      if (police.stunLeft > 0 || police.powerCooldown > 0) continue;
      if (!isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL)) continue;
      if (firstEnemyOnLane(police.id)) fireAsPolice(police);
    }
  }

  function canEnterLane(actorId, targetLane) {
    const targetX = laneX(targetLane);
    const actor = racers.find((racer) => racer.id === actorId);
    // Une berline de police est jugée à sa propre position : sans cela elle
    // héritait de la distance du joueur — voies et trafic mal évalués.
    const policeActor = activePursuerById(actorId);
    const actorDistance = policeActor?.distance ?? (actorId === 'player' ? distance : actor?.distance ?? distance);
    const actorWidth = policeActor?.width
      ?? (actorId === 'player' ? playerCollisionWidth() : racerCollisionWidth(actor));
    // Les adversaires se traversent sans collision; le trafic lent **et les
    // berlines de police du dernier tour** sont solides et bloquent la voie :
    // on ne se rabat pas sur leur capot.
    const obstacles = [
      ...rollingTraffic().map((traffic) => ({ lane: traffic.lane, x: traffic.currentX, width: traffic.width, distance: traffic.distance })),
      // Le trafic venant en face bloque aussi la voie : on ne se rabat pas
      // sous le capot d'un véhicule qui arrive face à soi.
      ...oncomingCars.map((oncoming) => ({ lane: oncoming.lane, x: oncoming.currentX, width: oncoming.width, distance: oncoming.distance })),
      ...activePursuers().filter((police) => police.id !== actorId)
        .map((police) => ({ lane: police.lane, x: police.currentX, width: police.width, distance: police.distance })),
      // Les pilotes se traversent entre eux, mais pas une berline : celle-ci
      // attend d'être franchement devant (ou derrière) pour se rabattre, sinon
      // elle se percuterait au lieu de bloquer.
      ...(policeActor ? [
        { lane: playerLane, x: playerCar.position.x, width: playerCollisionWidth(), distance },
        ...racers.map((racer) => ({ lane: racer.lane, x: racer.mesh.position.x, width: racerCollisionWidth(racer), distance: racer.distance })),
      ] : []),
    ];
    return obstacles.every((other) => {
      const approachingLane = other.lane === targetLane || Math.abs(other.x - targetX) < (actorWidth + other.width) / 2;
      return !approachingLane || Math.abs(other.distance - actorDistance) >= CITY_RUSH_CAR_GAP;
    });
  }

  function trafficImpactEscapeLane(traffic) {
    const nearby = [
      ...racers.map((racer) => ({ lane: racer.lane, distance: racer.distance, x: racer.currentX, width: 1.9 * 0.92 * racer.profile.widthScale })),
      { lane: playerLane, distance, x: playerX, width: 1.9 * playerProfile.widthScale },
      // L'escouade compte comme les rivaux : le véhicule touché ne se rabat pas
      // devant la seconde berline, qui s'y engluerait à son tour.
      ...policeCars.filter((police) => police.active).map((police) => ({ lane: police.lane, distance: police.distance, x: police.currentX, width: police.width })),
      ...trafficCars.filter((other) => other.id !== traffic.id).map((other) => ({
        lane: other.lane, distance: other.distance, x: other.currentX, width: other.width,
      })),
    ];
    const blockedLanes = nearby
      .filter((other) => Math.abs(other.distance - traffic.distance) < 11)
      .filter((other) => other.lane !== undefined && Math.abs(other.x - laneX(traffic.lane)) < 5.4)
      .map((other) => other.lane);
    return chooseCityRushTrafficEscapeLane({
      currentLane: traffic.lane,
      laneCount,
      blockedLanes,
    });
  }

  function applyTrafficImpact(racerId, traffic) {
    if (!traffic || traffic.impactCooldownLeft > 0 || traffic.impactChanging) return false;
    const racer = racerId === 'player' ? null : racers.find((item) => item.id === racerId);
    const squadCar = racerId === 'player' || racer ? null : policeCars.find((item) => item.id === racerId);
    const escapeLane = trafficImpactEscapeLane(traffic);
    if (escapeLane === traffic.lane) return false;

    traffic.impactLeft = CITY_RUSH_TRAFFIC_IMPACT_DURATION;
    traffic.impactCooldownLeft = CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN;
    traffic.impactChanging = true;
    traffic.impactFromLane = traffic.lane;
    traffic.impactTargetLane = escapeLane;
    traffic.lane = escapeLane;

    const label = racerId === 'player' ? 'TOI' : racer?.name || 'RIVAL';
    if (racerId === 'player') {
      playerTrafficImpactLeft = Math.max(playerTrafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION);
      playerSkidLeft = Math.max(playerSkidLeft, 0.85);
      cameraKick = Math.max(cameraKick, 0.58);
    } else if (racer) {
      racer.trafficImpactLeft = Math.max(racer.trafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION);
      racer.skidLeft = Math.max(racer.skidLeft, 0.85);
    } else if (squadCar) {
      squadCar.trafficImpactLeft = Math.max(squadCar.trafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION);
      squadCar.skidLeft = Math.max(squadCar.skidLeft, 0.85);
      squadCar.skidSide = Math.random() < 0.5 ? -1 : 1;
    }
    // L'escouade n'ajoute ni message à l'écran ni effet hors champ : le choc
    // d'une berline ne compte que s'il se voit ou s'entend.
    if (!squadCar || squadCar.mesh.visible) {
      spawnTrafficImpact(racerId, traffic.id);
      audioRef?.current?.skid({ pan: vehiclePan(racerId), intensity: 1.05, duration: 0.82 });
    }
    if (squadCar) return true;
    getCallbacks().effect?.({
      type: 'traffic-impact',
      target: label,
      traffic: traffic.name,
      trafficId: traffic.id,
      duration: CITY_RUSH_TRAFFIC_IMPACT_DURATION,
      lane: escapeLane,
      isPlayer: racerId === 'player',
    });
    return true;
  }

  // ── Choc frontal avec le trafic venant en face ────────────────────────
  // Collision solide : le pilote est ralenti et la voiture adverse dévie d'une
  // voie au plus, en restant sur la chaussée.
  function applyOncomingImpact(actorId, oncoming) {
    oncoming.impactCooldownLeft = CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN * 1.15;
    if (!oncoming.pushedAside) {
      oncoming.pushedAside = true;
      oncoming.pushAsideElapsed = 0;
      oncoming.pushAsideStartX = oncoming.currentX;
    }
    // Le choc écarte le pilote du côté opposé au véhicule adverse.
    const actorX = actorId === 'player' ? playerCar.position.x
      : getVehicleMesh(actorId)?.position.x ?? oncoming.currentX;
    const side = actorX - oncoming.currentX >= 0 ? 1 : -1;
    const label = actorId === 'player' ? 'TOI'
      : racers.find((item) => item.id === actorId)?.name || 'POLICE';
    const solidGap = CITY_RUSH_CAR_GAP + 1.5;

    if (actorId === 'player') {
      // Choc frontal = plus punitif que le trafic lent : impact + ralenti long + reprise boostée
      // + blocage solide : on recale le joueur derrière la voiture adverse.
      playerTrafficImpactLeft = Math.max(playerTrafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION * 1.25);
      playerSlowLeft = Math.max(playerSlowLeft, 1.15);
      playerTrafficRecoverLeft = CITY_RUSH_TRAFFIC_RECOVERY_DURATION * 1.2;
      playerSkidLeft = Math.max(playerSkidLeft, 1.1);
      playerSkidDuration = 1.1;
      playerSkidSide = side;
      playerBoostLeft = 0;
      cameraKick = Math.max(cameraKick, 1.15);
      // Blocage solide : empêche de traverser la voiture en sens inverse.
      if (distance > oncoming.distance - solidGap) {
        distance = Math.max(0, oncoming.distance - solidGap);
        playerCurrentSpeed = Math.min(playerCurrentSpeed, 6);
        currentSpeed = Math.min(currentSpeed, 6);
      }
    } else {
      const racer = racers.find((item) => item.id === actorId);
      const squadCar = racer ? null : activePursuerById(actorId);
      if (racer) {
        racer.trafficImpactLeft = Math.max(racer.trafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION * 1.25);
        racer.slowLeft = Math.max(racer.slowLeft || 0, 1.0);
        racer.trafficRecoverLeft = CITY_RUSH_TRAFFIC_RECOVERY_DURATION * 1.2;
        racer.skidLeft = Math.max(racer.skidLeft, 1.1);
        racer.skidDuration = 1.1;
        racer.skidSide = side;
        racer.boostLeft = 0;
        if (racer.distance > oncoming.distance - solidGap) {
          racer.distance = Math.max(0, oncoming.distance - solidGap);
          racer.currentSpeed = Math.min(racer.currentSpeed || 0, 6);
        }
      } else if (squadCar) {
        squadCar.trafficImpactLeft = Math.max(squadCar.trafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION * 1.25);
        squadCar.slowLeft = Math.max(squadCar.slowLeft || 0, 1.0);
        squadCar.skidLeft = Math.max(squadCar.skidLeft, 1.0);
        squadCar.skidSide = side;
        squadCar.currentSpeed = Math.min(squadCar.currentSpeed || 0, 6);
        if (squadCar.distance > oncoming.distance - solidGap) {
          squadCar.distance = Math.max(0, oncoming.distance - solidGap);
        }
      }
    }
    spawnTrafficImpact(actorId, oncoming.id);
    audioRef?.current?.skid({ pan: clamp(oncoming.currentX / 6.3, -1, 1) * 0.5, intensity: 1.25, duration: 1.0 });
    getCallbacks().effect?.({
      type: 'traffic-impact',
      target: label,
      traffic: oncoming.name,
      trafficId: oncoming.id,
      duration: CITY_RUSH_TRAFFIC_IMPACT_DURATION * 1.25,
      lane: oncoming.lane,
      isPlayer: actorId === 'player',
      oncoming: true,
      pushedAside: true,
      pushDirection: 'left',
    });
  }

  function checkOncomingImpacts(oncoming, priorOncomingDistance = null, priorActorDistances = null) {
    if (oncoming.impactCooldownLeft > 0) return;
    const priorOncoming = Number.isFinite(priorOncomingDistance) ? priorOncomingDistance : oncoming.distance;
    const priorMap = priorActorDistances instanceof Map ? priorActorDistances : null;

    const actors = [
      { id: 'player', x: playerCar.position.x, width: playerCollisionWidth(), distance, priorDistance: priorMap?.get('player') ?? distance, jumping: Boolean(playerJumpState.active && (playerCar.position.y || 0) > 0.8) },
      ...racers.map((racer) => ({
        id: racer.id,
        x: racer.mesh.position.x,
        width: racerCollisionWidth(racer),
        distance: racer.distance,
        priorDistance: priorMap?.get(racer.id) ?? racer.distance,
        jumping: Boolean(racer.jumpState?.active && (racer.currentJumpY || 0) > 0.8),
      })),
      ...activePursuers().map((police) => ({
        id: police.id,
        x: police.mesh.position.x,
        width: police.width,
        distance: police.distance,
        priorDistance: police.distance,
        jumping: false,
      })),
    ];

    for (const actor of actors) {
      if (actor.jumping) continue;
      const gapAfter = oncoming.distance - actor.distance;
      const gapBefore = priorOncoming - (Number.isFinite(actor.priorDistance) ? actor.priorDistance : actor.distance);
      const lateralOverlap = Math.abs(actor.x - oncoming.currentX) < (actor.width + oncoming.width) / 2;
      if (!lateralOverlap) continue;

      // Détection balayée : on touche si on est dans la fenêtre [-2.5, 4.0] après le mouvement,
      // OU si on a traversé la fenêtre entre deux frames (tunneling à haute vitesse).
      const inWindowAfter = gapAfter >= -2.5 && gapAfter <= 4.0;
      const crossedWindow = gapBefore > -2.5 && gapAfter < 4.0 && gapAfter < gapBefore;

      if (!inWindowAfter && !crossedWindow) continue;

      applyOncomingImpact(actor.id, oncoming);
      return;
    }
  }

  function respawnOncomingAhead(oncoming) {
    // Un circuit à sens unique n'a aucun véhicule en face : rien à replacer.
    if (!oncomingLanes.length) return;
    // Réapparaît loin devant, sur l'une des trois voies de gauche, sans se
    // coller à un autre véhicule venant en face dans la même voie.
    const lane = oncomingLanes[Math.floor(Math.random() * oncomingLanes.length)];
    // Sur route très peu fréquentée, les véhicules venant en face sont
    // encore plus rares et mieux espacés.
    const lightOncoming = oncomingCars.length <= 1;
    let nextDistance = distance + randomRange(lightOncoming ? 320 : 150, lightOncoming ? 480 : 235);
    for (const other of oncomingCars) {
      if (other === oncoming || other.lane !== lane) continue;
      if (Math.abs(other.distance - nextDistance) < 26) nextDistance = Math.max(nextDistance, other.distance + 26);
    }
    oncoming.lane = lane;
    oncoming.distance = nextDistance;
    oncoming.currentX = laneX(lane);
    oncoming.currentSpeed = oncoming.baseSpeed;
    oncoming.impactCooldownLeft = 0;
    oncoming.pushedAside = false;
    oncoming.pushAsideElapsed = 0;
    oncoming.pushAsideStartX = null;
    oncoming.lastPassGap = undefined;
  }

  function action(name) {
    if (!active || finished) return;
    if (name === 'left' || name === 'right') {
      // Immobilisée après l'épave : la voiture part en toupie et le volant ne
      // répond plus jusqu'à la fin de l'animation.
      if (playerStunLeft > 0) return;
      const nextLane = cityRushLaneAfterAction(playerLane, name, laneCount);
      if (nextLane !== playerLane && canEnterLane('player', nextLane)) {
        playerLane = nextLane;
        // Changer de voie ne ralentit pas : la voiture glisse à pleine
        // allure. Seul le bonus de « ligne propre » retombe à zéro, à charge
        // pour le pilote de le recharger en tenant sa nouvelle voie.
        playerCleanLineTime = 0;
      }
      return;
    }
    const aliases = {
      use_pistol: CITY_RUSH_POWERS.PISTOL,
      pistol: CITY_RUSH_POWERS.PISTOL,
    };
    const type = aliases[name];
    if (type && !CITY_RUSH_POWER_RULES[type]?.automatic) return usePower(type);
    return false;
  }

  function collectPickup(type, lane) {
    if (type === CITY_RUSH_PICKUPS.BOOST) {
      playerBoostLeft = Math.max(playerBoostLeft, CITY_RUSH_TRACK_BOOST_DURATION);
      score += 100;
      pickedUp += 1;
      audioRef?.current?.boost();
      audioRef?.current?.pickup(type, { ready: true });
      getCallbacks().pickup?.({
        type,
        progress: 1,
        chargeCost: 1,
        ready: true,
        newlyReady: true,
        autoActivated: true,
        lane,
      });
      emitHud(true);
      return;
    }

    const before = inventory[type] || 0;
    const pickupAmount = type === CITY_RUSH_POWERS.PISTOL ? CITY_RUSH_PISTOL_AMMO_PER_PICKUP : 1;
    inventory = addCityRushCharge(inventory, type, pickupAmount);
    const chargeCost = CITY_RUSH_POWER_RULES[type].chargeCost;
    const progress = inventory[type];
    const ready = type === CITY_RUSH_POWERS.PISTOL ? progress > 0 : progress >= chargeCost;
    const wasReady = type === CITY_RUSH_POWERS.PISTOL ? before > 0 : before >= chargeCost;
    const newlyReady = !wasReady && ready;
    const autoActivated = ready && CITY_RUSH_POWER_RULES[type].automatic;
    score += type === 'radio' ? 180 : type === 'pistol' ? 150 : type === CITY_RUSH_POWERS.BLUE_SHOT ? 125 : 100;
    pickedUp += 1;
    // Bip de ramassage (aigu quand la jauge vient de se remplir) : seul le
    // joueur en bénéficie, les rivaux remplissent leur inventaire en silence.
    audioRef?.current?.pickup(type, { ready: newlyReady });
    getCallbacks().pickup?.({ type, progress, chargeCost, ammo: type === CITY_RUSH_POWERS.PISTOL ? pickupAmount : null, ready, newlyReady, autoActivated, lane });
    if (autoActivated) usePower(type);
    else emitHud(true);
  }

  function collectRacerPickup(racer, type) {
    if (type === CITY_RUSH_PICKUPS.BOOST) {
      racer.boostLeft = Math.max(racer.boostLeft, CITY_RUSH_TRACK_BOOST_DURATION);
      getCallbacks().effect?.({ type: 'rival-boost', rival: racer.name });
      return;
    }
    racer.inventory = addCityRushCharge(
      racer.inventory,
      type,
      type === CITY_RUSH_POWERS.PISTOL ? CITY_RUSH_PISTOL_AMMO_PER_PICKUP : 1,
    );
  }

  // Un policier ne marque pas de points : il empoche le bonus, et la page
  // prévient quand un rouge ou un jaune est raflé sous le nez du joueur.
  function collectPolicePickup(police, type, lane) {
    if (type === CITY_RUSH_PICKUPS.BOOST) {
      police.boostLeft = Math.max(police.boostLeft || 0, CITY_RUSH_TRACK_BOOST_DURATION);
      return;
    }
    police.inventory = addCityRushCharge(
      police.inventory,
      type,
      type === CITY_RUSH_POWERS.PISTOL ? CITY_RUSH_PISTOL_AMMO_PER_PICKUP : 1,
    );
    if (!CITY_RUSH_POLICE_HUNT_TYPES.includes(type)) return;
    const ahead = police.distance - distance;
    if (!(ahead > 0 && ahead <= CITY_RUSH_POLICE_STEAL_NOTICE)) return;
    // Un vol sous le nez du joueur se raconte, mais sans noyer le HUD : au
    // plus un message toutes les trois secondes.
    if (policeStealNoticeCooldown > 0) return;
    policeStealNoticeCooldown = 3;
    const ready = type === CITY_RUSH_POWERS.PISTOL
      ? (police.inventory[type] || 0) > 0
      : (police.inventory[type] || 0) >= CITY_RUSH_POWER_RULES[type].chargeCost;
    getCallbacks().effect?.({ type: 'police-steal', item: type, lane, police: police.name, ready });
  }

  function updateRows(dt) {
    // Les rangées se recyclent derrière **le pilote**, pas derrière la voiture
    // la plus lente du peloton. La réserve ne compte que douze rangées — environ
    // 340 m de route : calée sur le traînard, elle laissait la piste sans aucun
    // bonus devant un pilote qui comptait plus de 300 m d'avance sur lui, ce qui
    // arrive au fil de la course, et donc surtout au dernier tour.
    const rowRecycleAnchor = distance;
    const hideRedForRace = redPickupsHiddenForRace();
    const participants = [
      { id: 'player', distance, lane: playerLane, speed: currentSpeed },
      ...racers.map((racer) => ({ id: racer.id, distance: racer.distance, lane: racer.lane, speed: racer.stunLeft > 0 ? 0 : racer.baseSpeed, racer })),
      // La police peut charger sa mitrailleuse avec les mêmes bonus rouges.
      ...activePursuers().map((police) => ({
        id: police.id, distance: police.distance, lane: police.lane, speed: police.currentSpeed, racer: police, police: true,
      })),
    ].sort((a, b) => b.distance - a.distance);

    for (const row of rows) {
      if (row.trackDistance < rowRecycleAnchor - 11) {
        row.trackDistance = lastDistanceSlot + randomRange(CITY_RUSH_PICKUP_ROW_SPACING_MIN, CITY_RUSH_PICKUP_ROW_SPACING_MAX);
        lastDistanceSlot = row.trackDistance;
        setupEncounter(row);
      }
      const z = PLAYER_Z - (row.trackDistance - distance) * SCALE;
      row.group.position.set(trackRelativeX(row.trackDistance), trackRelativeY(row.trackDistance), z);
      row.group.rotation.x = trackPitch(row.trackDistance);
      row.slots.forEach((slot, index) => {
        const pickup = row.pickups[index];
        if (!pickup) {
          slot.visible = false;
          return;
        }
        if (isCityRushPickupHidden(row.pickupClaims, index, elapsed)
          || (pickup.type === CITY_RUSH_POWERS.PISTOL && hideRedForRace)) {
          slot.visible = false;
          return;
        }
        if (!slot.visible) {
          slot.visible = true;
          slot.userData.pop = 0;
          slot.scale.setScalar(0.001);
        }
        if (slot.userData.type === CITY_RUSH_PICKUPS.BOOST) {
          slot.position.y = 0;
          slot.rotation.set(0, 0, 0);
          const pulse = 0.92 + Math.sin(elapsed * 5 + slot.userData.pad.userData.phase) * 0.08;
          slot.userData.pad.scale.set(pulse, 1, pulse);
        } else {
          const bob = Math.sin(elapsed * 4.1 + slot.userData.phase) * 0.12;
          slot.position.y = 1.3 + bob;
          slot.rotation.y = Math.sin(elapsed * 2.5 + slot.userData.phase) * 0.12;
          slot.userData.ring.rotation.z += dt * 1.4;
          slot.userData.halo.scale.setScalar(1 + Math.sin(elapsed * 3.2 + slot.userData.phase) * 0.12);
        }
      });

      // Un bonus ramassé disparaît 0,1 s puis réapparaît sur sa voie : la
      // voiture suivante peut le prendre. Un pilote déjà chargé ignore le rouge
      // même si ce bonus reste visible pour un autre participant.
      for (const participant of participants) {
        if (row.crossedRacers.has(participant.id)) continue;
        const crossingWindow = Math.max(1.15, participant.speed * dt * 0.65);
        if (Math.abs(participant.distance - row.trackDistance) > crossingWindow) continue;
        row.crossedRacers.add(participant.id);
        const participantInventory = participant.id === 'player' ? inventory : participant.racer?.inventory;
        const pickupIndex = row.pickups.findIndex((item, index) => (
          item.lane === participant.lane
          && !isCityRushPickupHidden(row.pickupClaims, index, elapsed)
          && canCollectCityRushPickup(participantInventory, item.type, { redPickupsHidden: hideRedForRace })
        ));
        if (pickupIndex < 0) continue;
        markCityRushPickupTaken(row.pickupClaims, pickupIndex, elapsed, CITY_RUSH_PICKUP_RESPAWN_DELAY);
        const pickup = row.pickups[pickupIndex];
        const object = row.slots[pickupIndex];
        if (object) {
          // L'objet éclate à l'endroit exact où la voiture l'a touché.
          spawnPickupBurst(object.position.x, object.position.y, row.trackDistance, pickup.type);
          object.visible = false;
          object.userData.pop = 0;
        }
        if (participant.id === 'player') collectPickup(pickup.type, participant.lane);
        else if (participant.police) collectPolicePickup(participant.racer, pickup.type, participant.lane);
        else collectRacerPickup(participant.racer, pickup.type);
      }
    }

  }

  // ── L'hélico d'observation du dernier tour ─────────────────────────────
  // Au dernier tour, l'appareil se cale dans le ciel devant le pilote et le suit
  // jusqu'à l'arrivée. Il n'ouvre jamais le feu : ses hélices tournent, son
  // gyrophare clignote et son pod caméra balaie la piste. Après la ligne, il
  // s'éloigne en prenant de l'altitude et disparaît.
  const WATCH_HELI_FLY_IN = 1.5; // s : temps de rapprochement à l'apparition
  // Sous une voûte (la Shuto de Tokyo), il n'y a plus de ciel : l'appareil
  // s'efface — sinon il volerait à l'intérieur du tunnel, dans les panneaux
  // suspendus — et reparaît à la sortie.
  const WATCH_HELI_TUNNEL_HIDE = 0.6; // part de couverture au-delà de laquelle il s'efface

  function updateWatchHelicopter(dt) {
    const watching = !sprint && phase === 'playing' && !finished && lap >= effectiveLaps;
    if (watching && tunnelCover.amount > WATCH_HELI_TUNNEL_HIDE) {
      // Il repart par où il est venu : à la sortie du tunnel, la rentrée se
      // rejoue (il retraverse le ciel et se recale).
      watchHelicopter.visible = false;
      watchHeliAge = 0;
      watchHeliLeaving = 0;
      return;
    }
    if (watching) {
      if (!watchHelicopter.visible) {
        // Il arrive de loin, par la droite : le temps qu'il se cale au-dessus de
        // la course, on le voit traverser le ciel.
        watchHelicopter.visible = true;
        watchHeliAge = 0;
        watchHeliLeaving = 0;
        watchHelicopter.position.set(playerCar.position.x + 30, 26, PLAYER_Z + 30);
      }
      watchHeliAge = Math.min(WATCH_HELI_FLY_IN, watchHeliAge + dt);
      const pose = cityRushWatchHelicopterPose({ playerX: playerCar.position.x, clock: clockTime, leaving: 0 });
      const flightDistance = distance + pose.ahead;
      watchHeliScratch.set(
        trackRelativeX(flightDistance) + pose.lateral,
        trackRelativeY(flightDistance) + pose.height,
        PLAYER_Z - pose.ahead * SCALE,
      );
      // Rapprochement progressif : véloce à l'apparition, posé ensuite.
      watchHelicopter.position.lerp(watchHeliScratch, Math.min(1, dt * (1.1 + (1 - watchHeliAge / WATCH_HELI_FLY_IN) * 2.2)));
      watchHelicopter.rotation.set(0, trackYaw(flightDistance) + pose.yaw, pose.bank * 0.4);
    } else if (watchHelicopter.visible) {
      // La ligne est franchie (ou la course remise à zéro) : il s'éloigne.
      watchHeliLeaving = Math.min(1, watchHeliLeaving + dt / 2.8);
      const pose = cityRushWatchHelicopterPose({ playerX: playerCar.position.x, clock: clockTime, leaving: watchHeliLeaving });
      const flightDistance = distance + pose.ahead;
      watchHeliScratch.set(
        trackRelativeX(flightDistance) + pose.lateral,
        trackRelativeY(flightDistance) + pose.height,
        PLAYER_Z - pose.ahead * SCALE,
      );
      watchHelicopter.position.lerp(watchHeliScratch, Math.min(1, dt * 1.2));
      watchHelicopter.rotation.set(pose.bank * -0.2, trackYaw(flightDistance) + pose.yaw, pose.bank);
      if (watchHeliLeaving >= 1) {
        watchHelicopter.visible = false;
        watchHeliLeaving = 0;
      }
    } else {
      return;
    }
    // Rotors, gyrophare et pod : l'appareil vit même quand il ne fait rien.
    watchHelicopter.userData.rotor.rotation.y += dt * 24;
    watchHelicopter.userData.tailRotor.rotation.z += dt * 27;
    const beacon = watchHelicopter.userData.beacon;
    beacon.material.color.setHex(Math.floor(clockTime * 3.4) % 2 === 0 ? 0x59e0ff : 0x123b4d);
    const pod = watchHelicopter.userData.pod;
    pod.rotation.set(0.42, cityRushWatchHelicopterPose({ clock: clockTime }).pod, 0);
  }

  const aspectFov = (baseFov) => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) / Math.min(1, camera.aspect)));

  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width || mount.clientWidth || 1));
    const height = Math.max(1, Math.floor(bounds.height || mount.clientHeight || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = aspectFov(CAMERA_BASE_FOV + fovOffset);
    camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(mount);
  window.addEventListener('resize', resize);
  resize();
  const resizeFrame = requestAnimationFrame(resize);

  // `destroyed` : la course ne se termine pas au drapeau à damier mais sur une
  // épave, barre de vie à zéro. Le pilote est classé dernier et la page le dit.
  function finishRace(options = {}) {
    if (finished) return;
    const timedOut = Boolean(options.timedOut);
    const destroyed = Boolean(options.destroyed) || playerWrecked || timedOut;
    finished = true;
    active = false;
    phase = 'finished';
    finishTime = 0;
    coastSpeed = currentSpeed;
    clearVisualEffects();
    // La barre de vie du pilote s'éteint avec la course ; l'hélico
    // d'observation, lui, s'éloigne en montant (voir `updateWatchHelicopter`).
    playerHealthActive = false;
    // L'escouade quitte la piste avec le drapeau à damier : elle n'est pas
    // classée et n'apparaît nulle part dans le tableau d'arrivée. La police du
    // trafic rappelée rentre dans le rang et reprend sa ronde.
    policeReinforcementQueue.length = 0;
    policeReinforcementTimer = 0;
    policeCars.forEach((police) => {
      police.active = false;
      police.reinforcementPending = false;
      police.mesh.visible = false;
    });
    releaseRalliedPolice();
    audioRef?.current?.policeSirenOff?.();
    // Une épave ne fait pas la fête : pas de confettis ni de drapeau à damier.
    if (!destroyed) startLine.celebrate();
    const standings = rankCityRushRacers(makeRacerRows());
    // Fanfare d'arrivée : accord majeur pour la victoire, plus sobre sinon.
    audioRef?.current?.finish(standings.rank);
    emitHud(true);
    // Une épave est bonne dernière : le pilote passe en fin de tableau, quel
    // que soit l'écart de distance au moment du choc.
    const ordered = destroyed
      ? [...standings.ordered.filter((racer) => racer.id !== 'player'), ...standings.ordered.filter((racer) => racer.id === 'player')]
      : standings.ordered;
    getCallbacks().finish?.({
      city: city.id,
      duration: elapsed,
      distance: Math.round(distance),
      laps: effectiveLaps,
      sprint,
      checkpoints: sprint ? sprintCheckpoints : null,
      timedOut,
      destroyed,
      rank: destroyed ? ordered.length : standings.rank,
      winner: standings.leader?.name || '—',
      winnerId: standings.leader?.id || null,
      score,
      pickups: pickedUp,
      racers: ordered.map((racer, index) => ({
        id: racer.id,
        isPlayer: racer.id === 'player',
        driverId: racer.driverId,
        name: racer.name,
        displayName: racer.displayName,
        country: racer.country,
        countryCode: racer.countryCode,
        flag: racer.flag,
        avatar: racer.avatar,
        accent: racer.accent,
        distance: Math.round(racer.distance),
        lap: racer.lap,
        rank: index + 1,
      })),
    });
  }

  function emitWheelSmoke(car, options) {
    for (const offset of car.userData.rearWheelOffsets) {
      scratch.set(offset[0], offset[1], offset[2]);
      car.localToWorld(scratch);
      smoke.emit(scratch, options);
    }
  }

  function emitExhaustSmoke(car, options) {
    for (const offset of car.userData.exhaustOffsets) {
      scratch.set(offset[0], offset[1], offset[2]);
      car.localToWorld(scratch);
      smoke.emit(scratch, options);
    }
  }

  // ── Sprint : checkpoints contre la montre ───────────────────────────
  // Un checkpoint tous les 300 m ; chacun recharge le chrono à 15 s. Le
  // seizième est l'arrivée, pile sous le portique (4 800 m = 4 boucles).
  // Chrono à zéro avant le prochain : course perdue.
  function updateSprintCheckpoints(dt) {
    const passed = cityRushSprintCheckpointsPassed(distance);
    while (sprintCheckpoints < passed) {
      sprintCheckpoints += 1;
      syncSprintCheckpointDisplay();
      if (sprintCheckpoints >= CITY_RUSH_SPRINT_CHECKPOINTS) {
        startLine.onCross({ final: true });
        return;
      }
      sprintTimeLeft = sprintTimeBonus;
      const remaining = CITY_RUSH_SPRINT_CHECKPOINTS - sprintCheckpoints;
      // Les checkpoints multiples de quatre tombent sous le portique
      // (tous les 1 200 m).
      if (sprintCheckpoints % 4 === 0) {
        startLine.onCross({ final: false });
        const crossedLabel = `CP ${String(sprintCheckpoints).padStart(2, '0')}/${String(CITY_RUSH_SPRINT_CHECKPOINTS).padStart(2, '0')}`;
        startLine.setBoard(crossedLabel, `+${sprintTimeBonus} S`, remaining === 1 ? '#ffffff' : undefined);
      }
      cameraKick = Math.max(cameraKick, 0.3);
      audioRef?.current?.lap(remaining === 1);
      getCallbacks().lap?.({ sprint: true, checkpoint: sprintCheckpoints, checkpoints: CITY_RUSH_SPRINT_CHECKPOINTS, remaining, timeBonus: sprintTimeBonus, elapsed, final: remaining === 1 });
      emitHud(true);
    }
    if (finished || playerWrecked) return;
    sprintTimeLeft -= dt;
    if (sprintTimeLeft <= 0) {
      sprintTimeLeft = 0;
      getCallbacks().effect?.({ type: 'sprint-timeout', checkpoints: sprintCheckpoints });
      finishRace({ timedOut: true });
    }
  }

  function handleLapCrossings(priorDistance) {
    const crossings = cityRushLapCrossings(priorDistance, distance, CITY_RUSH_LAP_LENGTH, effectiveLaps);
    for (const line of crossings) {
      if (line <= lastLineCrossed) continue;
      lastLineCrossed = line;
      const kind = cityRushLineKind(line, effectiveLaps);
      if (kind === 'finish') {
        startLine.onCross({ final: true });
        continue;
      }
      // Mètres qu'il reste à courir une fois cette ligne franchie.
      const remaining = Math.max(0, Math.round(effectiveDistance - line * CITY_RUSH_LAP_LENGTH));
      if (kind === 'checkpoint') {
        // Le portique est fixe dans le décor : on le recroise au milieu du grand
        // dernier tour. Ce n'est qu'un point de passage — aucun tour ne
        // commence, la course continue — mais on le signale (tableau, bannière,
        // cloche) pour que personne ne le prenne pour l'arrivée.
        startLine.onCross({ final: false });
        startLine.setBoard(`TOUR ${effectiveLaps}/${effectiveLaps}`, `PLUS QUE ${remaining} M`, '#ffffff');
        startLine.setFinalLap(true);
        cameraKick = Math.max(cameraKick, 0.3);
        audioRef?.current?.lap(false);
        getCallbacks().lap?.({ lap: effectiveLaps, laps: effectiveLaps, final: true, checkpoint: true, remaining, elapsed });
        getCallbacks().effect?.({ type: 'lap-checkpoint', lap: effectiveLaps, laps: effectiveLaps, remaining });
        continue;
      }
      lap = line + 1;
      const finalLap = lap === effectiveLaps;
      startLine.onCross({ final: false });
      startLine.setBoard(`TOUR ${lap}/${effectiveLaps}`, lapBoardSubtitle(lap), finalLap ? '#ffffff' : undefined);
      if (finalLap) startLine.setFinalLap(true);
      cameraKick = Math.max(cameraKick, 0.45);
      audioRef?.current?.lap(finalLap);
      getCallbacks().lap?.({ lap, laps: effectiveLaps, final: finalLap, remaining, elapsed });
      getCallbacks().effect?.({ type: finalLap ? 'final-lap' : 'lap', lap, laps: effectiveLaps });
    }
    for (const racer of racers) {
      const racerLap = cityRushLapForDistance(racer.distance, CITY_RUSH_LAP_LENGTH, effectiveLaps);
      if (racerLap !== racer.lap) {
        racer.lap = racerLap;
        if (racerLap === effectiveLaps && !racer.finalLapAnnounced) {
          racer.finalLapAnnounced = true;
          if (lap < effectiveLaps) getCallbacks().effect?.({ type: 'rival-final-lap', rival: racer.name });
        }
      }
    }
  }

  function updateCamera(dt) {
    const px = playerCar.position.x;
    let followRate = 3.2;
    let targetFovOffset = 0;
    if (phase === 'intro') {
      introAngle += dt * 0.16;
      const radius = 7.4;
      cameraTarget.set(px + Math.sin(introAngle) * radius, 2.4 + Math.sin(introAngle * 0.7) * 0.5, PLAYER_Z + Math.cos(introAngle) * radius);
      lookTarget.set(px, 0.85, PLAYER_Z - 0.4);
      targetFovOffset = -4;
      followRate = 2.2;
    } else if (phase === 'countdown') {
      countdownTime += dt;
      const t = smoothstep(countdownTime / 3.1);
      const fromX = px - 5.4;
      cameraTarget.set(lerp(fromX, CHASE_POSITION.x + px * 0.16, t), lerp(1.5, CHASE_POSITION.y, t), lerp(PLAYER_Z - 6.2, CHASE_POSITION.z, t));
      lookTarget.set(lerp(px, px * 0.09, t), lerp(1.0, CHASE_LOOK.y, t), lerp(PLAYER_Z, CHASE_LOOK.z, t));
      targetFovOffset = lerp(-6, 0, t);
      followRate = 6;
    } else if (phase === 'finished') {
      finishTime += dt;
      const angle = Math.PI * 0.1 + finishTime * 0.22;
      const radius = 8.5;
      const rise = smoothstep(finishTime / 2.4);
      cameraTarget.set(px * 0.3 + Math.sin(angle) * radius * rise + CHASE_POSITION.x * (1 - rise), lerp(CHASE_POSITION.y, 3.6, rise), lerp(CHASE_POSITION.z, PLAYER_Z + Math.cos(angle) * radius, rise));
      lookTarget.set(px * 0.5, 0.9, PLAYER_Z - 1.5);
      targetFovOffset = -3 * rise;
      followRate = 2.4;
    } else {
      const speedRatio = clamp(currentSpeed / (PLAYER_SPEED * playerProfile.powerMultiplier * CITY_RUSH_TRACK_BOOST_SPEED_FACTOR), 0, 1);
      const shake = (playerStunLeft > 0 ? 0.14 : playerSlowLeft > 0 || playerBlueShotSlowLeft > 0 ? 0.05 : 0) + cameraKick * 0.22;
      // La caméra regarde quelques mètres plus loin sur l'axe courbe et se
      // place elle-même sur le morceau de route derrière la voiture. Le résultat
      // reste très doux : la route tourne, pas la tête du joueur.
      const behindMeters = -(CHASE_POSITION.z - PLAYER_Z) / SCALE;
      const aheadMeters = (PLAYER_Z - CHASE_LOOK.z) / SCALE;
      const curveBehind = trackRelativeX(distance + behindMeters);
      const curveAhead = trackRelativeX(distance + aheadMeters);
      const hillBehind = trackRelativeY(distance + behindMeters);
      const hillAhead = trackRelativeY(distance + aheadMeters);
      const jumpCamY = (playerJumpState.active || playerLandingBounce > 0) ? (playerCar.position.y || 0) * 0.42 : 0;
      const jumpLookY = (playerJumpState.active || playerLandingBounce > 0) ? (playerCar.position.y || 0) * 0.35 : 0;
      cameraTarget.set(
        px * 0.16 + curveBehind + Math.sin(clockTime * 47) * shake,
        CHASE_POSITION.y + hillBehind + Math.cos(clockTime * 39) * shake * 0.6 - speedRatio * 0.5 + jumpCamY,
        CHASE_POSITION.z + speedRatio * 0.6,
      );
      lookTarget.set(px * 0.09 + curveAhead, CHASE_LOOK.y + hillAhead + jumpLookY, CHASE_LOOK.z);
      targetFovOffset = (playerBoostLeft > 0 ? 6 : 0) + speedRatio * 2.5;
      followRate = 4.5;
    }
    cameraKick = Math.max(0, cameraKick - dt * 2.2);
    const amount = 1 - Math.exp(-dt * followRate);
    camera.position.lerp(cameraTarget, amount);
    lookCurrent.lerp(lookTarget, amount);
    camera.lookAt(lookCurrent);
    const nextOffset = lerp(fovOffset, targetFovOffset, 1 - Math.exp(-dt * 4));
    if (Math.abs(nextOffset - fovOffset) > 0.01) {
      fovOffset = nextOffset;
      camera.fov = aspectFov(CAMERA_BASE_FOV + fovOffset);
      camera.updateProjectionMatrix();
    }
  }

  function update(time) {
    raf = requestAnimationFrame(update);
    const dt = Math.min(MAX_FRAME, Math.max(0, (time - lastFrame) / 1000));
    lastFrame = time;
    clockTime += dt;
    let worldTravel = 0;
    if (active && !finished) {
      pistolHoldCooldown = Math.max(0, pistolHoldCooldown - dt);
      if (pistolKeyHeld && pistolHoldCooldown <= 0 && isCityRushPowerCharged(inventory, CITY_RUSH_POWERS.PISTOL)) {
        if (usePower(CITY_RUSH_POWERS.PISTOL)) pistolHoldCooldown = PISTOL_HOLD_FIRE_INTERVAL;
      }
      elapsed += dt;
      const priorDistance = distance;
      const priorRacerDistances = new Map(racers.map((racer) => [racer.id, racer.distance]));
      playerSlowLeft = Math.max(0, playerSlowLeft - dt);
      playerBlueShotSlowLeft = Math.max(0, playerBlueShotSlowLeft - dt);
      playerTrafficRecoverLeft = Math.max(0, playerTrafficRecoverLeft - dt);
      playerTrafficImpactLeft = Math.max(0, playerTrafficImpactLeft - dt);
      playerBoostLeft = Math.max(0, playerBoostLeft - dt);
      playerStunLeft = Math.max(0, playerStunLeft - dt);
      playerSkidLeft = Math.max(0, playerSkidLeft - dt);
      playerHealthFlash = Math.max(0, playerHealthFlash - dt);
      // Voie tenue sans bouger : le bonus de ligne propre monte doucement.
      playerCleanLineTime += dt;
      const speedScale = (playerSlowLeft > 0 || playerTrafficImpactLeft > 0 ? 0.63 : 1) * (playerBlueShotSlowLeft > 0 ? CITY_RUSH_BLUE_SHOT_SPEED_FACTOR : 1);
      const boostScale = playerBoostLeft > 0 ? CITY_RUSH_TRACK_BOOST_SPEED_FACTOR : 1;
      // Un changement de voie ne figure plus dans cette équation : seule la
      // voie tenue agit sur la vitesse, et uniquement à la hausse.
      const cleanLineScale = cityRushCleanLineFactor(playerCleanLineTime);
      const targetPlayerSpeed = playerStunLeft > 0 ? 0 : PLAYER_SPEED * playerProfile.powerMultiplier * speedScale * boostScale * cleanLineScale;
      const requestedPlayerSpeed = approachCityRushSpeed(playerCurrentSpeed, targetPlayerSpeed, cityRushTrafficRecoveryRate(playerProfile.accelerationRate, playerTrafficRecoverLeft), dt);
      const priorPlayerX = playerX;
      playerX = lerp(playerX, laneX(playerLane), Math.min(1, dt * 12));
      const playerSkid = skidOffset(playerSkidLeft, playerSkidDuration, playerSkidSide);

      const requestedRacerSpeeds = new Map();
      const priorRacerXs = new Map();
      const aiPickups = new Map(racers.map((racer) => [racer.id, visiblePickups(racer.inventory)]));
      const aiTraffic = [
        ...rollingTraffic().map((traffic) => ({ lane: traffic.lane, distance: traffic.distance, speed: traffic.currentSpeed })),
        // Les berlines de police du dernier tour sont solides : les rivaux les
        // contournent comme un véhicule lent au lieu de s'encastrer dedans.
        ...activePursuers()
          .map((police) => ({ lane: police.lane, distance: police.distance, speed: police.currentSpeed })),
        // Le trafic venant en face : vitesse négative pour que la vitesse de
        // fermeture soit la somme des deux, et marqué `oncoming` pour que le
        // danger pèse autant qu'un bonus — les rivaux évitent les voies de
        // gauche et ne doublent que lorsqu'elles se dégagent.
        ...oncomingCars.map((oncoming) => ({ lane: oncoming.lane, distance: oncoming.distance, speed: -oncoming.currentSpeed, oncoming: true })),
      ];
      for (const racer of racers) {
        racer.healthFlash = Math.max(0, (racer.healthFlash || 0) - dt);
        // Une épave ou une cible immobilisée ne choisit pas de nouvelle voie.
        if (!racer.wrecked && racer.stunLeft <= 0 && (racer.spinLeft || 0) <= 0) racer.changeIn -= dt;
        if (!racer.wrecked && racer.stunLeft <= 0 && (racer.spinLeft || 0) <= 0 && racer.changeIn <= 0) {
          const availableLanes = [racer.lane];
          for (const lane of [racer.lane - 1, racer.lane + 1]) {
            if (lane >= 0 && lane < laneCount && canEnterLane(racer.id, lane)) availableLanes.push(lane);
          }
          const otherRacers = [
            { lane: playerLane, distance, speed: currentSpeed },
            ...racers.filter((other) => other.id !== racer.id).map((other) => ({ lane: other.lane, distance: other.distance, speed: other.currentSpeed || other.baseSpeed })),
          ];
          const nextLane = chooseCityRushAiLane({
            currentLane: racer.lane,
            laneCount,
            oncomingLanes,
            distance: racer.distance,
            speed: racer.currentSpeed || racer.baseSpeed,
            availableLanes,
            pickups: aiPickups.get(racer.id) || [],
            traffic: [...aiTraffic, ...otherRacers],
            lookAheadDistance: 145,
          });
          if (nextLane !== racer.lane) racer.lane = nextLane;
          racer.changeIn = randomRange(0.36, 0.62);
        }
        racer.slowLeft = Math.max(0, racer.slowLeft - dt);
        racer.blueShotSlowLeft = Math.max(0, racer.blueShotSlowLeft - dt);
        racer.trafficRecoverLeft = Math.max(0, (racer.trafficRecoverLeft || 0) - dt);
        racer.trafficImpactLeft = Math.max(0, racer.trafficImpactLeft - dt);
        racer.boostLeft = Math.max(0, racer.boostLeft - dt);
        racer.stunLeft = Math.max(0, racer.stunLeft - dt);
        racer.spinLeft = Math.max(0, racer.spinLeft - dt);
        racer.skidLeft = Math.max(0, racer.skidLeft - dt);
        racer.powerCooldown = Math.max(0, racer.powerCooldown - dt);
        const racerSlowed = racer.slowLeft > 0 || racer.trafficImpactLeft > 0;
        const speedTarget = racer.wrecked || racer.stunLeft > 0 ? 0 : racer.baseSpeed * (racerSlowed ? 0.56 : 1) * (racer.blueShotSlowLeft > 0 ? CITY_RUSH_BLUE_SHOT_SPEED_FACTOR : 1) * (racer.boostLeft > 0 ? CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR : 1) + Math.sin(elapsed * 0.82 + racer.phase) * 0.38;
        const requestedSpeed = approachCityRushSpeed(racer.currentSpeed, Math.max(0, speedTarget), cityRushTrafficRecoveryRate(racer.profile.accelerationRate, racer.trafficRecoverLeft), dt);
        requestedRacerSpeeds.set(racer.id, requestedSpeed);
        priorRacerXs.set(racer.id, racer.currentX);
        racer.currentX = lerp(racer.currentX, laneX(racer.lane), Math.min(1, dt * 5.3));
      }

      const priorTrafficDistances = new Map(trafficCars.map((traffic) => [traffic.id, traffic.distance]));
      const requestedTrafficSpeeds = new Map(trafficCars.map((traffic) => [
        traffic.id,
        Math.max(3.8, traffic.baseSpeed + Math.sin(elapsed * 0.5 + traffic.phase) * 0.18),
      ]));

      // Détection de tremplin pour le joueur
      if (!playerJumpState.active && playerStunLeft <= 0 && !playerWrecked) {
        for (const ramp of ramps) {
          if (ramp.lane === playerLane && detectCityRushRampContact(distance, playerLane, ramp.trackDistance, ramp.lane)) {
            const takeoffSpeed = Math.max(14, currentSpeed);
            const jumpDistance = computeCityRushJumpDistance(takeoffSpeed);
            const jumpHeight = computeCityRushJumpHeight(takeoffSpeed);
            playerJumpState.active = true;
            playerJumpState.startDistance = distance;
            playerJumpState.totalDistance = jumpDistance;
            playerJumpState.maxHeight = jumpHeight;
            playerJumpState.takeoffSpeed = takeoffSpeed;
            playerJumpState.progress = 0;
            playerJumpState.overpassTriggered = false;
            audioRef?.current?.rampJump?.({ pan: vehiclePan('player'), speed: takeoffSpeed });
            cameraKick = Math.max(cameraKick, 0.42);
            emitWheelSmoke(playerCar, { color: 0xffffff, opacity: 0.65, scale: 0.6, grow: 2.2, life: 0.5 });
            getCallbacks().effect?.({ type: 'ramp-jump', speed: takeoffSpeed, distance: jumpDistance, height: jumpHeight, lane: playerLane });
            break;
          }
        }
      }

      // Détection de tremplin pour les rivaux
      for (const racer of racers) {
        if (!racer.jumpState?.active && racer.stunLeft <= 0 && (racer.spinLeft || 0) <= 0) {
          for (const ramp of ramps) {
            if (ramp.lane === racer.lane && detectCityRushRampContact(racer.distance, racer.lane, ramp.trackDistance, ramp.lane)) {
              const takeoffSpeed = Math.max(14, racer.currentSpeed || racer.baseSpeed);
              const jumpDistance = computeCityRushJumpDistance(takeoffSpeed);
              const jumpHeight = computeCityRushJumpHeight(takeoffSpeed);
              racer.jumpState = {
                active: true,
                startDistance: racer.distance,
                totalDistance: jumpDistance,
                maxHeight: jumpHeight,
                takeoffSpeed,
                progress: 0,
              };
              if (racer.mesh.visible) {
                audioRef?.current?.rampJump?.({ pan: vehiclePan(racer.id), speed: takeoffSpeed });
                emitWheelSmoke(racer.mesh, { color: 0xffffff, opacity: 0.5, scale: 0.5, grow: 2.2, life: 0.5 });
              }
              break;
            }
          }
        }
      }

      // Trajectoire en l'air du joueur
      let playerJumpY = 0;
      let playerJumpPitch = 0;
      if (playerJumpState.active) {
        const jumpTraveled = distance - playerJumpState.startDistance;
        const progress = clamp(jumpTraveled / Math.max(1, playerJumpState.totalDistance), 0, 1);
        playerJumpState.progress = progress;
        if (progress < 1.0) {
          playerJumpY = computeCityRushJumpElevation(jumpTraveled, playerJumpState.totalDistance, playerJumpState.maxHeight);
          playerJumpPitch = computeCityRushJumpPitch(progress);
        } else {
          playerJumpState.active = false;
          playerJumpY = 0;
          playerJumpPitch = 0;
          playerLandingBounce = 0.14;
          audioRef?.current?.rampLand?.({ pan: vehiclePan('player'), speed: currentSpeed });
          emitWheelSmoke(playerCar, { color: 0xdedee6, opacity: 0.65, scale: 0.6, grow: 2.5, life: 0.6 });
          getCallbacks().effect?.({ type: 'ramp-land', lane: playerLane });
        }
      }
      if (playerLandingBounce > 0) {
        playerLandingBounce = Math.max(0, playerLandingBounce - dt * 1.2);
        playerJumpY -= Math.sin(playerLandingBounce * Math.PI * 4) * 0.05 * (playerLandingBounce / 0.14);
      }

      // Trajectoire en l'air des rivaux
      for (const racer of racers) {
        let racerJumpY = 0;
        let racerJumpPitch = 0;
        if (racer.jumpState?.active) {
          const jumpTraveled = racer.distance - racer.jumpState.startDistance;
          const progress = clamp(jumpTraveled / Math.max(1, racer.jumpState.totalDistance), 0, 1);
          racer.jumpState.progress = progress;
          if (progress < 1.0) {
            racerJumpY = computeCityRushJumpElevation(jumpTraveled, racer.jumpState.totalDistance, racer.jumpState.maxHeight);
            racerJumpPitch = computeCityRushJumpPitch(progress);
          } else {
            racer.jumpState.active = false;
            racerJumpY = 0;
            racerJumpPitch = 0;
            if (racer.mesh.visible) {
              audioRef?.current?.rampLand?.({ pan: vehiclePan(racer.id), speed: racer.currentSpeed });
              emitWheelSmoke(racer.mesh, { color: 0xdedee6, opacity: 0.5, scale: 0.5, grow: 2.2, life: 0.5 });
            }
          }
        }
        racer.currentJumpY = racerJumpY;
        racer.currentJumpPitch = racerJumpPitch;
      }

      // Survol direct du trafic : si le joueur saute par-dessus un véhicule sur sa voie
      if (playerJumpState.active && playerJumpY > 1.1 && !playerJumpState.overpassTriggered) {
        const groundVehicles = [
          ...rollingTraffic(),
          ...activePursuers(),
          ...racers.filter((r) => (!r.jumpState?.active || (r.currentJumpY || 0) < 0.6)),
        ];
        for (const vehicle of groundVehicles) {
          if (vehicle.lane === playerLane && Math.abs(distance - vehicle.distance) < 2.2) {
            playerJumpState.overpassTriggered = true;
            audioRef?.current?.passby?.({ pan: vehiclePan(vehicle.id), speed: 1.2 });
            getCallbacks().effect?.({ type: 'jump-overpass', target: vehicle.name || 'TRAFIC' });
            break;
          }
        }
      }

      const movementRequests = [
        {
          id: 'player',
          collisionGroup: 'racer',
          lane: playerLane,
          x: playerX + playerSkid,
          width: 1.9 * playerProfile.widthScale,
          previousDistance: priorDistance,
          nextDistance: priorDistance + requestedPlayerSpeed * dt,
          jumping: Boolean(playerJumpState.active && playerJumpY > 0.8),
        },
        ...racers.map((racer) => ({
          id: racer.id,
          collisionGroup: 'racer',
          lane: racer.lane,
          x: racer.currentX + skidOffset(racer.skidLeft, racer.skidDuration, racer.skidSide),
          width: 1.9 * 0.92 * racer.profile.widthScale,
          previousDistance: priorRacerDistances.get(racer.id),
          nextDistance: priorRacerDistances.get(racer.id) + requestedRacerSpeeds.get(racer.id) * dt,
          jumping: Boolean(racer.jumpState?.active && (racer.currentJumpY || 0) > 0.8),
        })),
        ...rollingTraffic().map((traffic) => ({
          id: traffic.id,
          collisionGroup: 'traffic',
          lane: traffic.lane,
          x: traffic.currentX,
          width: traffic.width,
          previousDistance: priorTrafficDistances.get(traffic.id),
          nextDistance: priorTrafficDistances.get(traffic.id) + requestedTrafficSpeeds.get(traffic.id) * dt,
        })),
        // L'escouade du dernier tour et la police du trafic rappelée sont
        // solides elles aussi : leur berline se percute exactement comme le
        // trafic lent, et le barrage qu'elles installent devant leur client le
        // retient au lieu d'être traversé. Leur choc avec le trafic lent est
        // géré dans `updatePolice` (voir `blockedBy`), pas ici.
        //
        // La position retenue est celle du jour, sans avance : la berline est
        // pilotée plus tard dans l'image, et elle peut freiner d'un coup en
        // barrage — l'estimation optimiste laissait alors un pilote se coller
        // à moins de la distance de sécurité dans son pare-chocs.
        ...activePursuers().map((police) => ({
          id: police.id,
          collisionGroup: 'police',
          lane: police.lane,
          x: police.currentX,
          width: police.width,
          previousDistance: police.distance,
          nextDistance: police.distance,
        })),
      ];
      // Le contact est détecté avant le maintien de la distance de sécurité :
      // un joueur humain comme une IA déclenche le même choc et le même rabat.
      const trafficImpactsThisFrame = detectCityRushTrafficImpacts(movementRequests, CITY_RUSH_TRAFFIC_IMPACT_GAP);
      for (const contact of trafficImpactsThisFrame) {
        const traffic = trafficCars.find((item) => item.id === contact.trafficId);
        if (traffic) applyTrafficImpact(contact.racerId, traffic);
      }
      const resolvedCars = resolveCityRushCarMovement(movementRequests);
      const movementById = new Map(resolvedCars.map((car) => [car.id, car.nextDistance]));
      distance = movementById.get('player') ?? priorDistance;
      // Coincé derrière le trafic : la reprise de vitesse sera accélérée.
      if (dt > 0 && distance - priorDistance < requestedPlayerSpeed * dt - 1e-6) playerTrafficRecoverLeft = CITY_RUSH_TRAFFIC_RECOVERY_DURATION;
      const priorSpeed = currentSpeed;
      currentSpeed = dt > 0 ? Math.max(0, (distance - priorDistance) / dt) : requestedPlayerSpeed;
      playerCurrentSpeed = currentSpeed;
      const playerLateral = dt > 0 ? (playerX - priorPlayerX) / dt : 0;
      playerCar.position.set(playerX + playerSkid, playerJumpY + (playerStunLeft > 0 ? 0.03 : 0), PLAYER_Z);
      playerCar.rotation.x = trackPitch(distance) + playerJumpPitch;

      if (playerJumpState.active && playerJumpY > 0.05) {
        playerDropShadow.visible = true;
        playerDropShadow.position.set(playerX + playerSkid, 0.02, PLAYER_Z);
        playerDropShadow.rotation.set(trackPitch(distance) - Math.PI / 2, trackYaw(distance), 0);
        const shadowScale = clamp(1 - (playerJumpY / 9), 0.55, 1.0);
        playerDropShadow.scale.set(shadowScale, shadowScale, 1);
        playerDropShadow.material.opacity = clamp(0.55 * (1 - playerJumpY / 7), 0.12, 0.55);
      } else {
        playerDropShadow.visible = false;
      }

      const playerSpin = cityRushStunSpin(playerStunLeft, playerStunTotal, playerWrecked ? playerWreckSpinTurns : undefined);
      playerCar.rotation.y = trackYaw(distance) + playerSpin + clamp((laneX(playerLane) - playerX) * -0.06, -0.12, 0.12) + skidOffset(playerSkidLeft, playerSkidDuration, playerSkidSide, 0.1, 14);
      const playerSteer = clamp((laneX(playerLane) - playerX) * 0.28, -0.34, 0.34);
      animateRacerCar(playerCar, {
        speed: currentSpeed,
        maxSpeed: PLAYER_SPEED * playerProfile.powerMultiplier,
        steer: playerSteer,
        lateral: playerLateral,
        boosting: playerBoostLeft > 0,
        slowed: playerSlowLeft > 0 || playerBlueShotSlowLeft > 0 || playerTrafficImpactLeft > 0,
        impacting: playerTrafficImpactLeft > 0 || playerWrecked,
        stunned: playerStunLeft > 0 && !playerWrecked,
        skidding: playerSkidLeft > 0,
        braking: currentSpeed < priorSpeed - 2 * dt && currentSpeed > 1,
      }, dt, clockTime);

      // Bande-son : le régime moteur suit la vitesse et l'effort demandé
      // (`requestedPlayerSpeed` dépasse `currentSpeed` tant qu'on accélère).
      // Le monde seul connaît ces deux valeurs à la frame près — le HUD de la
      // page est émis au mieux toutes les 120 ms.
      audioRef?.current?.engine({
        speed: clamp(currentSpeed / (PLAYER_SPEED * playerProfile.powerMultiplier * 1.46), 0, 1),
        throttle: clamp((requestedPlayerSpeed - currentSpeed) / 8, 0, 1),
        boost: playerBoostLeft > 0,
      });

      for (const racer of racers) {
        const priorRacerDistance = priorRacerDistances.get(racer.id);
        racer.distance = movementById.get(racer.id) ?? priorRacerDistance;
        if (dt > 0 && racer.distance - priorRacerDistance < requestedRacerSpeeds.get(racer.id) * dt - 1e-6) racer.trafficRecoverLeft = CITY_RUSH_TRAFFIC_RECOVERY_DURATION;
        const priorRacerSpeed = racer.currentSpeed;
        racer.currentSpeed = dt > 0 ? Math.max(0, (racer.distance - priorRacerDistance) / dt) : requestedRacerSpeeds.get(racer.id);
        const gap = racer.distance - distance;
        const visible = gap > -8 && gap < CITY_RUSH_RACER_VIEW_DISTANCE;
        const renderZ = PLAYER_Z - gap * SCALE;
        const skid = skidOffset(racer.skidLeft, racer.skidDuration, racer.skidSide);
        racer.mesh.visible = visible;
        // Frôlement : un rival qui entre dans la zone proche en roulant à une
        // autre vitesse passe en sifflant (une fois par passage, pas à chaque
        // image). La zone est franchie dans un sens comme dans l'autre.
        const previousGap = racer.lastPassGap;
        racer.lastPassGap = gap;
        if (visible && previousGap !== undefined && Math.abs(gap) < PASS_BY_RANGE && Math.abs(previousGap) >= PASS_BY_RANGE) {
          const relative = Math.abs(racer.currentSpeed - currentSpeed);
          if (relative > 2.5) audioRef?.current?.passby({ pan: vehiclePan(racer.id), speed: clamp(relative / 14, 0, 1) });
        }
        // Keep even off-screen rivals' world positions current so straight shots,
        // pickup interactions, and police locks remain valid before they enter the camera view.
        racer.mesh.position.set(racer.currentX + skid + trackRelativeX(racer.distance), trackRelativeY(racer.distance) + (racer.currentJumpY || 0) + (racer.stunLeft > 0 || (racer.spinLeft || 0) > 0 ? 0.045 : 0), renderZ);
        racer.mesh.rotation.x = trackPitch(racer.distance) + (racer.currentJumpPitch || 0);
        const racerLateralMotion = racer.currentX - priorRacerXs.get(racer.id);
        // Toupie du stun héliporté ou du tir rouge, ajoutée au léger lacet de
        // conduite et au cap de la courbe locale.
        racer.mesh.rotation.y = trackYaw(racer.distance)
          + cityRushStunSpin(racer.stunLeft, racer.stunTotal)
          + cityRushStunSpin(racer.spinLeft, racer.spinTotal, CITY_RUSH_PISTOL_SPIN_TURNS)
          + clamp(racerLateralMotion * -0.16 + skid * 0.22, -0.22, 0.22);
        const racerSteer = clamp(-racerLateralMotion * 1.45, -0.3, 0.3);
        if (visible) {
          animateRacerCar(racer.mesh, {
            speed: racer.currentSpeed,
            maxSpeed: racer.baseSpeed,
            steer: racerSteer,
            lateral: dt > 0 ? racerLateralMotion / dt : 0,
            boosting: racer.boostLeft > 0,
            slowed: racer.slowLeft > 0 || racer.blueShotSlowLeft > 0 || racer.trafficImpactLeft > 0 || (racer.spinLeft || 0) > 0,
            impacting: racer.trafficImpactLeft > 0,
            stunned: racer.stunLeft > 0 || (racer.spinLeft || 0) > 0,
            skidding: racer.skidLeft > 0,
            braking: racer.currentSpeed < priorRacerSpeed - 2 * dt && racer.currentSpeed > 1,
          }, dt, clockTime);
          racer.smokeTimer -= dt;
          if (racer.smokeTimer <= 0) {
            if (racer.skidLeft > 0 || ((racer.slowLeft > 0 || racer.blueShotSlowLeft > 0 || racer.trafficImpactLeft > 0) && racer.currentSpeed > 4)) {
              emitWheelSmoke(racer.mesh, { color: 0xcfd0d8, opacity: 0.42, scale: 0.4, grow: 2.2, life: 0.7 });
              racer.smokeTimer = 0.07;
            } else if (racer.boostLeft > 0) {
              emitExhaustSmoke(racer.mesh, { color: racer.profile.bodyColor, opacity: 0.35, scale: 0.22, grow: 2.6, life: 0.45, velocity: [0, 0.4, 2.2] });
              racer.smokeTimer = 0.09;
            }
          }
        }
      }
      const trafficLeadDistance = Math.max(distance, ...racers.map((racer) => racer.distance));
      const slowestRaceDistance = Math.min(distance, ...racers.map((racer) => racer.distance));
      for (const [index, traffic] of trafficCars.entries()) {
        // Berline rappelée : elle est pilotée par la chasse, plus par le flot.
        if (traffic.rallied) continue;
        // Berline détruite : reste invisible hors de la course jusqu'au prochain départ, plus aucun mouvement/collision.
        if (traffic.destroyed) {
          traffic.mesh.visible = false;
          continue;
        }
        const priorTrafficDistance = priorTrafficDistances.get(traffic.id);
        const priorTrafficX = traffic.currentX;
        traffic.impactLeft = Math.max(0, traffic.impactLeft - dt);
        traffic.impactCooldownLeft = Math.max(0, traffic.impactCooldownLeft - dt);
        // La voie visée par un rabat de choc est prioritaire sur la trajectoire
        // du flot : on la laisse finir avant toute autre décision.
        const laneChangeRate = traffic.impactChanging
          ? Math.min(1, dt / CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION)
          : Math.min(1, dt * 3.4);
        traffic.currentX = lerp(traffic.currentX, laneX(traffic.lane), laneChangeRate);
        if (traffic.impactChanging && Math.abs(traffic.currentX - laneX(traffic.lane)) < 0.06) {
          traffic.currentX = laneX(traffic.lane);
          traffic.impactChanging = false;
          traffic.impactFromLane = null;
          traffic.impactTargetLane = null;
        }
        traffic.distance = movementById.get(traffic.id) ?? priorTrafficDistance;
        const clearedByEveryone = traffic.distance < slowestRaceDistance - 34;
        const roomForAnotherEncounter = trafficLeadDistance < effectiveDistance - 230;
        if (clearedByEveryone && roomForAnotherEncounter) {
          traffic.spawnCount += 1;
          // Sur route à très faible trafic (campagne), les voitures sont
          // bien plus espacées : on augmente les écarts de respawn.
          const lightTraffic = trafficCars.length <= 3;
          const nextSlot = lastTrafficDistanceSlot + randomRange(lightTraffic ? 180 : 58, lightTraffic ? 260 : 78);
          const nextAhead = trafficLeadDistance + randomRange(lightTraffic ? 230 : 132, lightTraffic ? 320 : 160);
          traffic.distance = Math.max(nextSlot, nextAhead);
          traffic.lane = forwardLanes[(index + traffic.spawnCount * 5) % forwardLanes.length];
          traffic.currentX = laneX(traffic.lane);
          traffic.impactLeft = 0;
          traffic.impactCooldownLeft = 0;
          traffic.impactChanging = false;
          traffic.impactFromLane = null;
          traffic.impactTargetLane = null;
          traffic.currentSpeed = traffic.baseSpeed;
          lastTrafficDistanceSlot = traffic.distance;
        } else {
          traffic.currentSpeed = dt > 0 ? Math.max(0, (traffic.distance - priorTrafficDistance) / dt) : requestedTrafficSpeeds.get(traffic.id);
        }
        const gap = traffic.distance - distance;
        traffic.mesh.visible = gap > -CITY_RUSH_TRAFFIC_VIEW_BEHIND && gap < trafficViewAhead;
        traffic.mesh.position.set(traffic.currentX + trackRelativeX(traffic.distance), trackRelativeY(traffic.distance), PLAYER_Z - gap * SCALE);
        traffic.mesh.rotation.x = trackPitch(traffic.distance);
        traffic.mesh.rotation.y = lerp(traffic.mesh.rotation.y, trackYaw(traffic.distance) + clamp((traffic.currentX - priorTrafficX) * -2.8, -0.26, 0.26), Math.min(1, dt * 12));
        if (traffic.mesh.visible) {
          traffic.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += traffic.currentSpeed * dt * 0.95; });
          traffic.mesh.userData.beacons.forEach((beacon, beaconIndex) => {
            const flashing = Math.floor(clockTime * 8 + traffic.phase + beaconIndex) % 2 === 0;
            beacon.material.opacity = flashing ? 1 : 0.18;
          });
        }
      }

      // Trafic venant en face : il roule vers la course sur les trois voies de
      // gauche, croise les pilotes, puis reparaît au loin une fois passé.
      // Collision frontale solide : détection balayée pour éviter le tunneling.
      const priorActorDistancesForOncoming = new Map([
        ['player', priorDistance],
        ...Array.from(priorRacerDistances.entries()),
      ]);
      for (const oncoming of oncomingCars) {
        const priorOncomingDistance = oncoming.distance;
        oncoming.impactCooldownLeft = Math.max(0, oncoming.impactCooldownLeft - dt);
        const priorOncomingX = oncoming.currentX;
        const shoveSpeedScale = oncoming.pushedAside ? 0.62 : 1;
        const requestedOncomingSpeed = Math.max(oncoming.pushedAside ? 2.6 : 3.8, oncoming.baseSpeed * shoveSpeedScale + Math.sin(elapsed * 0.5 + oncoming.phase) * 0.18);
        oncoming.distance -= requestedOncomingSpeed * dt;
        oncoming.currentSpeed = requestedOncomingSpeed;
        if (oncoming.pushedAside) {
          oncoming.pushAsideElapsed += dt;
          oncoming.currentX = cityRushOncomingImpactX(oncoming.pushAsideStartX, oncoming.pushAsideElapsed, oncoming.width);
        } else {
          oncoming.currentX = lerp(oncoming.currentX, laneX(oncoming.lane), Math.min(1, dt * 3.4));
        }
        if (oncoming.distance < distance - 30) respawnOncomingAhead(oncoming);
        const gap = oncoming.distance - distance;
        // Sifflement au croisement, une fois par passage comme les rivaux.
        const previousOncomingGap = oncoming.lastPassGap;
        oncoming.lastPassGap = gap;
        if (previousOncomingGap !== undefined && previousOncomingGap >= 0 && gap < 0) {
          audioRef?.current?.passby({ pan: clamp(oncoming.currentX / 6.3, -1, 1) * 0.5, speed: 1 });
        }
        checkOncomingImpacts(oncoming, priorOncomingDistance, priorActorDistancesForOncoming);
        oncoming.mesh.visible = gap > -30 && gap < oncomingViewAhead;
        oncoming.mesh.position.set(oncoming.currentX + trackRelativeX(oncoming.distance), trackRelativeY(oncoming.distance), PLAYER_Z - gap * SCALE);
        oncoming.mesh.rotation.x = -trackPitch(oncoming.distance);
        oncoming.mesh.rotation.y = trackYaw(oncoming.distance) + Math.PI + clamp((oncoming.currentX - priorOncomingX) * 2.8, -0.26, 0.26);
        if (oncoming.mesh.visible) {
          oncoming.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += oncoming.currentSpeed * dt * 0.95; });
          oncoming.mesh.userData.beacons.forEach((beacon, beaconIndex) => {
            const flashing = Math.floor(clockTime * 8 + oncoming.phase + beaconIndex) % 2 === 0;
            beacon.material.opacity = flashing ? 1 : 0.18;
          });
        }
      }

      // Fumée du joueur : burn-out au départ, dérapages, boost — et l'épave,
      // qui fume noir tant qu'elle tourne, puis continue de fumer au ralenti.
      playerSmokeTimer -= dt;
      if (playerSmokeTimer <= 0 && playerWrecked) {
        const wreckPuff = { color: 0x30303a, opacity: 0.62, scale: 0.55 + Math.random() * 0.3, grow: 2.6, life: 1.1, velocity: [(Math.random() - 0.5) * 1.2, 1.7 + Math.random() * 0.9, (Math.random() - 0.5) * 1.2] };
        emitWheelSmoke(playerCar, wreckPuff);
        smoke.emit(playerCar.position, { ...wreckPuff, scale: 0.7, velocity: [0, 2.1, 0.2] });
        if (playerWreckLeft > CITY_RUSH_WRECK_SECONDS * 0.55 && Math.random() < 0.6) {
          smoke.emit(playerCar.position, { color: 0xff8a3a, opacity: 0.8, scale: 0.3, grow: 2.1, life: 0.45, velocity: [(Math.random() - 0.5) * 4.2, 2.6 + Math.random() * 2, (Math.random() - 0.5) * 4.2] });
        }
        playerSmokeTimer = 0.05;
      } else if (playerSmokeTimer <= 0) {
        if (launchSmokeLeft > 0 && currentSpeed < 20) {
          emitWheelSmoke(playerCar, { color: 0xe4e4ea, opacity: 0.5, scale: 0.5, grow: 2.4, life: 0.9, velocity: [0, 0.5, 2.6] });
          playerSmokeTimer = 0.05;
        } else if (playerSkidLeft > 0 || ((playerSlowLeft > 0 || playerBlueShotSlowLeft > 0) && currentSpeed > 4)) {
          emitWheelSmoke(playerCar, { color: 0xcfd0d8, opacity: 0.45, scale: 0.42, grow: 2.2, life: 0.7 });
          playerSmokeTimer = 0.06;
        } else if (playerBoostLeft > 0) {
          emitExhaustSmoke(playerCar, { color: playerProfile.bodyColor, opacity: 0.38, scale: 0.24, grow: 2.6, life: 0.45, velocity: [0, 0.4, 2.4] });
          playerSmokeTimer = 0.08;
        }
      }
      launchSmokeLeft = Math.max(0, launchSmokeLeft - dt);

      worldTravel = (distance - priorDistance) * SCALE;
      // Un contact avec une berline de police « pnj » la rappelle : elle sort
      // de sa ronde et prend le pilote en chasse (voir `rallyTrafficPolice`).
      checkPoliceRally();
      // Les trois voitures de base entrent au dernier tour du joueur (ou dès
      // le départ en mode Poursuite) et le prennent toujours pour cible, même
      // si un rival mène la course.
      const leader = refreshPackLeader();
      const playerLap = cityRushLapForDistance(distance, CITY_RUSH_LAP_LENGTH, effectiveLaps);
      if (!policeDeployed && !sprint) {
        if (effectivePoliceFromStart && distance > 8) deployPolice();
        else if (playerLap >= effectiveLaps) deployPolice();
      }
      updatePolice(dt, leader);
      // Le carambolage avec une berline se juge après le déplacement des
      // berlines : le contact est alors décrit à la position du jour.
      checkPoliceCollisions();
      if (sprint) updateSprintCheckpoints(dt);
      else handleLapCrossings(priorDistance);
      // Garde de secours : si la course a rejoint le dernier tour sans avoir
      // initialisé sa coque au départ, la barre s'active au plus tard ici.
      if (!playerHealthActive && lap >= effectiveLaps) activatePlayerHealth();
      updatePoliceReinforcements(dt);
      updateWreck(dt);
      updateRows(dt);
      updateRamps(dt);
      racers.forEach((racer) => useRacerPower(racer));
      updateVisualEffects(dt);
      updateTrafficImpacts(dt);

      const allRacers = makeRacerRows();
      // Une épave en pleine toupie ne se clôt pas sur la ligne d'un rival : la
      // course est déjà perdue (barre à zéro), la toupie va à son terme et
      // `updateWreck` signe la défaite. Sans cette garde, un rival franchissant
      // l'arrivée pendant les 3,2 s coupait la scène de l'épave en plein vol.
      if (!playerWrecked && allRacers.some((racer) => racer.distance >= effectiveDistance)) finishRace();
      emitHud();
    } else {
      currentSpeed = 0;
      if (phase === 'finished') {
        // Tour d'honneur : les voitures roulent en roue libre sous les confettis.
        coastSpeed = lerp(coastSpeed, 7, Math.min(1, dt * 0.9));
        const step = coastSpeed * dt;
        distance += step;
        racers.forEach((racer) => { racer.distance += step; });
        worldTravel = step * SCALE;
        currentSpeed = coastSpeed;
        for (const row of rows) {
          row.group.position.x = trackRelativeX(row.trackDistance);
          row.group.position.y = trackRelativeY(row.trackDistance);
          row.group.position.z = PLAYER_Z - (row.trackDistance - distance) * SCALE;
          row.group.rotation.x = trackPitch(row.trackDistance);
        }
        for (const ramp of ramps) {
          const gap = ramp.trackDistance - distance;
          ramp.group.position.set(laneX(ramp.lane) + trackRelativeX(ramp.trackDistance), trackRelativeY(ramp.trackDistance), PLAYER_Z - gap * SCALE);
          ramp.group.rotation.set(trackPitch(ramp.trackDistance), trackYaw(ramp.trackDistance), 0);
        }
      }
      // Bande-son hors course : ralenti sur la grille et en pause, roue libre
      // pendant le tour d'honneur (la vitesse de `coastSpeed` reste audible).
      audioRef?.current?.engine({
        speed: phase === 'finished' ? clamp(coastSpeed / (PLAYER_SPEED * playerProfile.powerMultiplier * 1.46), 0, 1) : 0,
        throttle: 0,
        idle: true,
      });

      const idleState = (car, maxSpeed) => animateRacerCar(car, { speed: currentSpeed, maxSpeed, idle: phase !== 'finished', steer: 0, lateral: 0 }, dt, clockTime);
      playerCar.position.x = lerp(playerCar.position.x, laneX(playerLane), Math.min(1, dt * 4));
      playerCar.rotation.x = trackPitch(distance);
      idleState(playerCar, PLAYER_SPEED * playerProfile.powerMultiplier);
      racers.forEach((racer) => {
        if (phase === 'finished') {
          const gap = racer.distance - distance;
          racer.mesh.visible = gap > -8 && gap < CITY_RUSH_RACER_VIEW_DISTANCE;
          racer.mesh.position.x = racer.currentX + trackRelativeX(racer.distance);
          racer.mesh.position.y = trackRelativeY(racer.distance);
          racer.mesh.position.z = PLAYER_Z - gap * SCALE;
          racer.mesh.rotation.set(trackPitch(racer.distance), trackYaw(racer.distance), 0);
        }
        idleState(racer.mesh, racer.baseSpeed);
      });
      // Même hors course, seul le trafic proche est affiché (économie d'appels
      // de rendu pendant l'intro et le compte à rebours).
      for (const traffic of trafficCars) {
        if (traffic.rallied) continue;
        if (traffic.destroyed) {
          traffic.mesh.visible = false;
          continue;
        }
        const gap = traffic.distance - distance;
        traffic.mesh.visible = gap > -CITY_RUSH_TRAFFIC_VIEW_BEHIND && gap < trafficViewAhead;
        if (phase === 'finished') {
          traffic.mesh.position.set(traffic.currentX + trackRelativeX(traffic.distance), trackRelativeY(traffic.distance), PLAYER_Z - gap * SCALE);
          traffic.mesh.rotation.set(trackPitch(traffic.distance), trackYaw(traffic.distance), 0);
        }
      }
      // Le trafic venant en face continue de croiser pendant le tour
      // d'honneur ; il attend, feux allumés, pendant l'intro et le compte à rebours.
      for (const oncoming of oncomingCars) {
        if (phase === 'finished') {
          oncoming.distance -= oncoming.currentSpeed * dt;
          if (oncoming.distance < distance - 30) respawnOncomingAhead(oncoming);
        }
        const gap = oncoming.distance - distance;
        oncoming.mesh.visible = gap > -30 && gap < oncomingViewAhead;
        if (phase === 'finished') {
          oncoming.mesh.position.set(oncoming.currentX + trackRelativeX(oncoming.distance), trackRelativeY(oncoming.distance), PLAYER_Z - gap * SCALE);
          oncoming.mesh.rotation.set(-trackPitch(oncoming.distance), trackYaw(oncoming.distance) + Math.PI, 0);
        }
      }
      if (phase === 'countdown' && launchSmokeLeft > 0) {
        playerSmokeTimer -= dt;
        if (playerSmokeTimer <= 0) {
          emitWheelSmoke(playerCar, { color: 0xe4e4ea, opacity: 0.45, scale: 0.45, grow: 2.2, life: 0.9, velocity: [0, 0.6, 1.4] });
          racers.forEach((racer) => emitWheelSmoke(racer.mesh, { color: 0xe4e4ea, opacity: 0.35, scale: 0.4, grow: 2.2, life: 0.8, velocity: [0, 0.6, 1.4] }));
          playerSmokeTimer = 0.07;
        }
      }
    }

    // Décor : boucle repliée, portique animé, route, pluie, ciel, fumée.
    const lineGap = placeTrack();
    road.scroll(worldTravel, distance);
    updateExpresswayEnvironment(dt);
    for (const prop of loop.dynamicProps) {
      if (prop.group.visible) prop.update(dt, clockTime);
    }
    startLine.update(dt, clockTime, lineGap);
    rain?.update(dt, worldTravel);
    smoke.update(dt, worldTravel);
    updatePickupPop(dt);
    updatePickupBursts(dt);
    sky.material.uniforms.time.value = clockTime;
    if (headlamp.visible) {
      headlamp.position.set(playerCar.position.x, 0.8, PLAYER_Z - 1.6);
      headlamp.target.position.set(playerCar.position.x + trackRelativeX(distance + 22), trackRelativeY(distance + 22), PLAYER_Z - 16);
    }
    updateWatchHelicopter(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  function onKeyDown(event) {
    const target = event.target?.tagName;
    if (target === 'INPUT' || target === 'TEXTAREA' || target === 'SELECT') return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'q', 'd', 'z'].includes(key)) event.preventDefault();
    if (!active || finished || event.repeat) return;
    if (key === 'arrowleft' || key === 'q') action('left');
    else if (key === 'arrowright' || key === 'd') action('right');
    else if (key === 'z') {
      pistolKeyHeld = true;
      pistolHoldCooldown = 0;
      action(CITY_RUSH_POWERS.PISTOL);
      // Le premier tir part immédiatement ; les suivants sont cadencés dans
      // la boucle de rendu tant que la touche reste enfoncée.
      pistolHoldCooldown = PISTOL_HOLD_FIRE_INTERVAL;
    }
  }
  function onKeyUp(event) {
    if (event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    releasePistolKey();
  }
  const onWindowBlur = () => releasePistolKey();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onWindowBlur);

  let pointerStart = null;
  const onPointerDown = (event) => {
    if (!active || !event.isPrimary) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    renderer.domElement.setPointerCapture?.(event.pointerId);
  };
  const onPointerUp = (event) => {
    if (!pointerStart || !active) { pointerStart = null; return; }
    const dx = event.clientX - pointerStart.x;
    if (Math.abs(dx) > 20) action(dx < 0 ? 'left' : 'right');
    pointerStart = null;
  };
  const onPointerCancel = () => { pointerStart = null; };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);

  function setPhase(nextPhase) {
    if (nextPhase === phase) return;
    phase = nextPhase;
    if (phase === 'intro') {
      introAngle = Math.PI * 0.82;
      startLine.setLights(0);
    } else if (phase === 'countdown') {
      countdownTime = 0;
      startLine.setLights(0);
      startLine.excite(1, 5);
    } else if (phase === 'finished') {
      finishTime = 0;
    }
  }

  function setCountdown(step) {
    if (phase !== 'countdown') return;
    // Feux de départ : un bip par feu, un accord sur le vert.
    audioRef?.current?.countdownBeep(step);
    if (step === 3) startLine.setLights(2);
    else if (step === 2) startLine.setLights(4);
    else if (step === 1) startLine.setLights(5);
    else if (step <= 0) {
      startLine.setLights(0, true);
      startLine.excite(1.4, 4);
      launchSmokeLeft = 1.4;
      playerSmokeTimer = 0;
      cameraKick = 0.5;
    }
  }

  reset();
  raf = requestAnimationFrame(update);

  return {
    start() {
      if (finished) return;
      active = true;
      lastFrame = performance.now();
      activatePlayerHealth();
    },
    pause() {
      active = false;
      releasePistolKey();
      currentSpeed = 0;
      audioRef?.current?.engine({ speed: 0, throttle: 0, idle: true });
    },
    reset,
    action,
    setPhase,
    setCountdown,
    setRoster(nextRoster) {
      applyRoster(nextRoster);
      emitHud(true);
    },
    get lite() { return lite; },
    get scene() { return scene; },
    get camera() { return camera; },
    get distance() { return distance; },
    // Vitesse réelle du pilote (m/s) à l'image : les vérifications d'épave
    // mesurent la chute jusqu'à l'arrêt complet. La page, elle, lit le HUD.
    get speed() { return currentSpeed; },
    get isJumping() { return Boolean(playerJumpState.active); },
    get jumpHeight() { return playerCar.position.y || 0; },
    destroy() {
      clearVisualEffects();
      // Plus de frame : le moteur doit se taire avec la scène.
      audioRef?.current?.engine({ speed: 0, throttle: 0, mute: true });
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      releasePistolKey();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      startLine.dispose();
      smoke.dispose();
      disposeScene(scene, renderer);
    },
  };
}

export default function ViceCityWorld({ active, phase = 'intro', countdown = null, cityId, carId, runId, roster = null, raceLaps = CITY_RUSH_LAPS, racePoliceFromStart = false, raceFormat = 'laps', onReady, onError, onHud, onFinish, onPickup, onEffect, onLap, actionsRef, audioRef }) {
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = { onReady, onError, onHud, onFinish, onPickup, onEffect, onLap };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const city = CITY_RUSH_COURSES.find((item) => item.id === cityId) || CITY_RUSH_COURSES[0];
    let world;
    try {
      world = createCityRushWorld(mountRef.current, city, () => ({
        hud: (data) => callbacksRef.current.onHud?.(data),
        finish: (data) => callbacksRef.current.onFinish?.(data),
        pickup: (data) => callbacksRef.current.onPickup?.(data),
        effect: (data) => callbacksRef.current.onEffect?.(data),
        lap: (data) => callbacksRef.current.onLap?.(data),
      }), carId, audioRef, roster, raceLaps, racePoliceFromStart, raceFormat);
    } catch (error) {
      callbacksRef.current.onError?.(error instanceof Error ? error.message : String(error));
      return undefined;
    }
    worldRef.current = world;
    if (actionsRef) actionsRef.current = (name) => world.action(name);
    callbacksRef.current.onReady?.();
    return () => {
      world.destroy();
      worldRef.current = null;
      if (actionsRef) actionsRef.current = null;
    };
  }, [cityId, carId, raceLaps, racePoliceFromStart, raceFormat, actionsRef, audioRef]);

  useEffect(() => {
    if (roster) worldRef.current?.setRoster?.(roster);
  }, [roster]);

  useEffect(() => {
    if (active) worldRef.current?.start();
    else worldRef.current?.pause();
  }, [active]);

  useEffect(() => {
    if (runId > 0) worldRef.current?.reset();
  }, [runId]);

  useEffect(() => {
    worldRef.current?.setPhase(phase === 'paused' ? 'playing' : phase);
  }, [phase, runId]);

  useEffect(() => {
    if (phase === 'countdown' && countdown !== null && countdown !== undefined) worldRef.current?.setCountdown(countdown);
  }, [phase, countdown, runId]);

  return <div className="city-rush-world" ref={mountRef} />;
}
