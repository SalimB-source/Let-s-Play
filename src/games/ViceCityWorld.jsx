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
  CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP,
  CITY_RUSH_BAZOOKA_BLAST_CELLS,
  CITY_RUSH_BAZOOKA_PICKUP_HALF_LENGTH,
  CITY_RUSH_BAZOOKA_PROJECTILE_SPEED,
  CITY_RUSH_BOOST_SPAWN_CHANCE,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_PISTOL_SPIN_TURNS,
  CITY_RUSH_TRACK_BOOST_DURATION,
  CITY_RUSH_TRACK_BOOST_SPEED_FACTOR,
  CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR,
  CITY_RUSH_RIVAL_SLOW_FACTOR,
  cityRushRivalPaceFactor,
  cityRushRivalTargetSpeed,
  CITY_RUSH_AI_LOOKAHEAD,
  CITY_RUSH_AI_REFLEX,
  cityRushAiLaneBlocked,
  cityRushAiThinkDelay,
  cityRushAiBrakingRate,
  CITY_RUSH_TRACK_BOOST_COLOR,
  CITY_RUSH_RACER_VIEW_DISTANCE,
  cityRushLaneConfig,
  cityRushCoursePace,
  cityRushCornerPace,
  nordschleifeReadout,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP,
  CITY_RUSH_SHOTGUN_DAMAGE,
  CITY_RUSH_SHOTGUN_FIRE_COOLDOWN,
  cityRushActiveWeapon,
  cityRushEquipWeapon,
  cityRushIsWeaponType,
  cityRushWeaponAmmoPerPickup,
  cityRushWeaponFireInterval,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN,
  CITY_RUSH_TRAFFIC_IMPACT_DURATION,
  CITY_RUSH_TRAFFIC_IMPACT_GAP,
  CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  isCityRushPoliceTrafficType,
  // Trafic d'un tournoi : quatre civiles au lieu de huit, une seule voiture en
  // contresens, et pas une berline de police (voir `tournamentMode`).
  CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT,
  CITY_RUSH_TOURNAMENT_ONCOMING_COUNT,
  CITY_RUSH_ONCOMING_COUNT,
  CITY_RUSH_ONCOMING_LANES,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_PICKUP_BURST_DURATION,
  CITY_RUSH_PICKUP_BURST_SHARDS,
  CITY_RUSH_PICKUP_RESPAWN_DELAY,
  CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  CITY_RUSH_PLAYER_HEALTH_FLASH,
  CITY_RUSH_HEALTH_PICKUP_COLOR,
  CITY_RUSH_HEALTH_PICKUP_RESTORE,
  cityRushHealthPickupRepair,
  CITY_RUSH_MINI_GARAGE_WIDTH,
  cityRushCarMaxHealth,
  CITY_RUSH_PLAYER_COLLISION_COOLDOWN,
  CITY_RUSH_WRECK_SECONDS,
  CITY_RUSH_WRECK_SPIN_TURNS,
  CITY_RUSH_POLICE_ATTACK_LEAD,
  CITY_RUSH_POLICE_COLLISION_COOLDOWN,
  CITY_RUSH_POLICE_HEALTH,
  CITY_RUSH_POLICE_RAMP_LANDING_SOURCE,
  cityRushPoliceMaxHealth,
  CITY_RUSH_POLICE_DESTROY_SCORE,
  CITY_RUSH_POLICE_WRECK_SPIN_TURNS,
  CITY_RUSH_POLICE_WRECK_SPIN_SECONDS,
  CITY_RUSH_POLICE_WRECK_VIEW_BEHIND,
  CITY_RUSH_POLICE_WRECK_BURN_SECONDS,
  CITY_RUSH_POLICE_WRECK_MAX,
  CITY_RUSH_POLICE_BASE_SPEED,
  CITY_RUSH_POLICE_BLOCKADE_HOLD,
  CITY_RUSH_POLICE_COUNT,
  CITY_RUSH_WANTED_MAX_STARS,
  CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS,
  CITY_RUSH_SPIKE_BLOCK_ALERT_RANGE,
  CITY_RUSH_SPIKE_BLOCK_COOLDOWN,
  CITY_RUSH_SPIKE_BLOCK_DEPLOY_DURATION,
  CITY_RUSH_SPIKE_BLOCK_LEAD,
  CITY_RUSH_SPIKE_BLOCK_LIFETIME,
  CITY_RUSH_SPIKE_BLOCK_PACK_DURATION,
  CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES,
  CITY_RUSH_SPIKE_DAMAGE_SOURCE,
  CITY_RUSH_SPIKE_HALF_LENGTH,
  CITY_RUSH_SPIKE_IMPACT_DURATION,
  CITY_RUSH_SPIKE_LAY_DURATION,
  CITY_RUSH_SPIKE_LANES,
  CITY_RUSH_SPIKE_SLOW_DURATION,
  CITY_RUSH_SPIKE_SLOW_FACTOR,
  CITY_RUSH_SUV_CHARGE_ALERT_RANGE,
  CITY_RUSH_SUV_CHARGE_COUNT,
  CITY_RUSH_SUV_CHARGE_LATERAL_RATE,
  CITY_RUSH_SUV_CHARGE_LOCK_RANGE,
  CITY_RUSH_SUV_CHARGE_RECYCLE_BEHIND,
  CITY_RUSH_SUV_CHARGE_RELOAD,
  CITY_RUSH_SUV_CHARGE_SPAWN_LEAD,
  CITY_RUSH_SUV_CHARGE_TYPE,
  cityRushSpikeBlockCount,
  cityRushSpikeHit,
  cityRushSpikeLaidLanes,
  cityRushSpikeLanes,
  cityRushSpikeLayProgress,
  cityRushSpikePace,
  cityRushSuvChargeCount,
  cityRushSuvChargeLocked,
  cityRushSuvChargeSpeed,
  cityRushSuvChargeStep,
  CITY_RUSH_MINI_GARAGE_COUNT,
  CITY_RUSH_MINI_GARAGE_HUD_RANGE,
  CITY_RUSH_MINI_GARAGE_SIGN_LEAD,
  CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH,
  CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT,
  CITY_RUSH_POLICE_TURNAROUND_DURATION,
  CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
  CITY_RUSH_POLICE_REINFORCEMENT_DELAY,
  CITY_RUSH_POLICE_SIGHT_RANGE,
  CITY_RUSH_POLICE_VEHICLE_TYPES,
  CITY_RUSH_POLICE_AIM_NOTICE_COOLDOWN,
  CITY_RUSH_POLICE_AIM_TIME,
  CITY_RUSH_POLICE_FIRE_COOLDOWN,
  CITY_RUSH_POLICE_FIRE_LINE_RANGE,
  CITY_RUSH_POLICE_HUNT_TYPES,
  CITY_RUSH_POLICE_INTERCEPT_RANGE,
  CITY_RUSH_POLICE_LEAD,
  CITY_RUSH_POLICE_LEAD_SLACK,
  CITY_RUSH_POLICE_LOOKAHEAD,
  CITY_RUSH_POLICE_PURSUIT_REFLEX,
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
  advanceCityRushOncomingBonus,
  CITY_RUSH_CLEAN_LINE_RAMP_DURATION,
  cityRushCleanLineFactor,
  cityRushOncomingBonusFactor,
  CITY_RUSH_ONCOMING_BONUS_MAX,
  CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION,
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
  cityRushBazookaTrackDistances,
  cityRushBazookaPickupCanUse,
  cityRushBazookaTarget,
  cityRushBazookaBlastContains,
  cityRushLineKind,
  cityRushPackLeader,
  cityRushPickupBurstShards,
  cityRushPickupFlashState,
  cityRushPickupPopScale,
  cityRushPickupShardState,
  cityRushPlayerDamage,
  cityRushPoliceCollisionHit,
  cityRushPoliceAimAligned,
  cityRushPoliceAimHold,
  cityRushPoliceAimReady,
  cityRushWatchHelicopterPose,
  cityRushPoliceBlocksLeader,
  cityRushPoliceContact,
  cityRushPoliceDamage,
  cityRushSideBumpChoice,
  cityRushSideBumpKeep,
  CITY_RUSH_SIDE_BUMP_HOLD,
  CITY_RUSH_SIDE_BUMP_SKID,
  cityRushTrafficHitboxWidth,
  cityRushWantedLevelAfterHit,
  cityRushWantedLevelAfterPoliceDestroyed,
  // Les rivaux aussi : contact avec la police ou tête de course au dernier tour.
  cityRushRivalWantedLevelAfterContact,
  cityRushRivalPursued,
  cityRushRivalLeaderWanted,
  cityRushMiniGarageLanes,
  cityRushMiniGarageAvailable,
  cityRushMiniGarageCanUse,
  cityRushMiniGarageRepair,
  cityRushMiniGarageWantedLevel,
  cityRushMiniGarageTrackDistances,
  cityRushPoliceCountForWantedLevel,
  cityRushPoliceTurnaroundProgress,
  cityRushPolicePace,
  cityRushPoliceShotsLeft,
  cityRushPoliceWreckSpeed,
  cityRushPoliceWreckFlame,
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
  cityRushRivalCarProfile,
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
import {
  CITY_RUSH_TUTORIAL_LESSON_TIMEOUT,
  CITY_RUSH_TUTORIAL_MANUAL_GRACE,
  CITY_RUSH_TUTORIAL_POLICE_FROM_ID,
  CITY_RUSH_TUTORIAL_STEPS,
  CITY_RUSH_TUTORIAL_STEER_INTERVAL,
  CITY_RUSH_TUTORIAL_STEP_DURATION_MS,
  CITY_RUSH_TUTORIAL_TICK_MS,
} from './cityRushTutorial.js';
import { cityRushLightRig, cityRushTheme } from './cityRushThemes';
import { createBatch, makeCanvasTexture, neonText, seededRandom } from './cityRushBuilder';
import { START_ZONE_HALF, buildCityLoop, createStageMaterials, finishLoopGeometry, makeRain, makeRoad, makeSkyDome, makeSkyline } from './cityRushStage';
import { buildShutoExpressway, makeExpresswayRoad } from './shutoC1Stage';
import { buildNordschleifeTrack, makeNordschleifeRoad } from './nordschleifeStage';
import { buildStartComplex, createStartLineDynamics, createStartLineMaterials } from './cityRushStartLine';
import { animateRacerCar, applyPoliceRacerLivery, configureCarReflections, createSmokePool, makeRacerCar, makeTrafficVehicle, setRacerDriver } from './cityRushCars';
import { makeBoostPadMaterial, makeLapBoard, makePickupMaterial } from './cityRushTextures';

const PLAYER_Z = 3.1;
const PLAYER_SPEED = CITY_RUSH_PLAYER_SPEED;
const SCALE = CITY_RUSH_SCROLL_SCALE;
const LAP_UNITS = CITY_RUSH_LAP_LENGTH * SCALE;
const CAMERA_BASE_FOV = 44;
const MAX_FRAME = 0.04;
// Le fusil à pompe rejoint l'AK-47 : même emplacement d'arme, même bouton,
// mais un bonus bleu bien plus rare et six carrés arrachés par cartouche.
const POWER_TYPES = [
  CITY_RUSH_POWERS.BLUE_SHOT,
  CITY_RUSH_POWERS.PISTOL,
  CITY_RUSH_POWERS.SHOTGUN,
  CITY_RUSH_POWERS.RADIO,
];
// Les pouvoirs et les soins portent une icône flottante. Le bonus de vitesse,
// lui, est un simple cercle peint sur la chaussée : rien ne vole au-dessus du
// bitume, on le lit du premier coup d'œil et on le traverse.
// Tous les types dessinés par `makePickupMaterial`, donc le turbo aussi : son
// icône reste fabriquée — c'est elle que montrent le HUD et le guide — mais
// `setPickupKind` l'éteint sur la piste.
const PICKUP_ICON_TYPES = [...POWER_TYPES, CITY_RUSH_PICKUPS.BOOST, CITY_RUSH_PICKUPS.HEALTH];
// Les bonus posés à même le sol (le turbo vert aujourd'hui).
const PICKUP_GROUND_TYPES = [CITY_RUSH_PICKUPS.BOOST];
// Hauteur de vol commune aux bonus flottants, au-dessus de la chaussée.
const PICKUP_FLOAT_HEIGHT = 1.3;
// Un cercle au sol n'est pas vraiment à hauteur 0 : la chaussée est faite de
// triangles inclinés, et un plan confondu avec elle se met à clignoter. On le
// lève de cinq centimètres — de quoi trancher avec le bitume, pas assez pour
// le voir flotter au-dessus.
const PICKUP_GROUND_HEIGHT = 0.05;
// L'éclatement d'un bonus ramassé au sol est remonté à hauteur de capot : joué
// à ras du bitume, le flash serait avalé par la voiture qui passe dessus.
const PICKUP_GROUND_BURST_LIFT = 0.55;
// La couleur d'un bonus : celle de son pouvoir, le vert du turbo, le rouge des
// soins — la couleur passée en secours sert aux effets sans type connu.
const pickupColor = (type, fallback = CITY_RUSH_HEALTH_PICKUP_COLOR) => (
  CITY_RUSH_POWER_RULES[type]?.color
  || (type === CITY_RUSH_PICKUPS.BOOST
    ? CITY_RUSH_TRACK_BOOST_COLOR
    : type === CITY_RUSH_PICKUPS.HEALTH ? CITY_RUSH_HEALTH_PICKUP_COLOR : fallback)
);
// Rayon (en unités monde) de la zone d'effet de l'explosion de l'hélicoptère :
// à peu près une case (une voie) de chaque côté, touchant les adversaires proches.
const EXPLOSION_RADIUS = 3.4;
const BAZOOKA_EXPLOSION_RADIUS = CITY_RUSH_LANE_WIDTH * CITY_RUSH_BAZOOKA_BLAST_CELLS;
const BAZOOKA_PICKUP_LOCAL_Z = 6.1;
// Un accrochage avec une patrouille provoque une courte glissade visuelle :
// la berline se décale sur une voie voisine, le pilote part légèrement de l'autre côté.
const POLICE_RAM_SKID_DURATION = 0.72;
const PLAYER_POLICE_RAM_SKID_DURATION = 0.58;
// Le SUV blindé pèse nettement plus lourd : il emporte davantage les deux
// voitures et déclenche une secousse prolongée, sans ajouter de dégâts.
const POLICE_SUV_RAM_SKID_DURATION = 1.08;
const PLAYER_POLICE_SUV_RAM_IMPACT_DURATION = 1.05;
const POLICE_SUV_RAM_VFX_INTENSITY = 1.8;
const POLICE_RAM_LANE_CHANGE_HOLD = 0.45;
const POLICE_SKID_SMOKE_INTERVAL = 0.075;
// Le tir rouge d'AK-47 reprend le projectile droit du tir bleu : chaque
// pression lance une balle, sans guidage, qui s'arrête sur le premier ennemi
// de la voie. Un chargeur ramassé en contient sept.
// Maintien de Z : une balle part à intervalle régulier jusqu'à la relâche ou
// l'épuisement du chargeur, indépendamment de la répétition native du clavier.
const PISTOL_HOLD_FIRE_INTERVAL = 0.12;
// Le fusil à pompe partage le même bouton, mais pas la même cadence : une
// cartouche toutes les 1,5 s, le temps de réarmer — maintenir ne sert qu'à
// enchaîner les trois coups sans réappuyer.
const SHOTGUN_HOLD_FIRE_INTERVAL = CITY_RUSH_SHOTGUN_FIRE_COOLDOWN;
// Le bazooka partage lui aussi le bouton de tir unique : une roquette par
// conteneur traversé, avec une cadence courte pour qu'un maintien ne double
// pas le départ de coup.
const BAZOOKA_HOLD_FIRE_INTERVAL = 0.85;
// Les trois armes se tirent avec la même touche : la cadence suit l'arme en main.
function weaponFireInterval(type) {
  if (type === 'bazooka') return BAZOOKA_HOLD_FIRE_INTERVAL;
  return cityRushWeaponFireInterval(type) || PISTOL_HOLD_FIRE_INTERVAL;
}
// Maintien des flèches : garder ← (ou Q) / → (ou D) enfoncé enchaîne les
// changements de voie tout seul, un écart par cran, jusqu'à la relâche. Le
// pilote n'a plus à marteler la touche pour traverser la chaussée : la cadence
// est calée sur le glissement latéral de la voiture (`playerX` rejoint
// `laneX(playerLane)` à raison de `dt * 12`), donc chaque écart est presque
// terminé quand le suivant démarre et la dérive reste lisible. La répétition
// native du clavier, elle, est ignorée (`event.repeat`) : trop lente au premier
// cran puis incontrôlable, elle ne donnait ni fluidité ni précision.
// Comme au clavier système, la répétition attend un court délai avant de
// démarrer, puis enchaîne à sa cadence : un appui simplement un peu long reste
// **un** écart — en avaler deux par accident, c'est un pare-chocs dans le
// trafic. Le délai est plus court que celui du système (0,26 s contre 0,5 s) :
// traverser la chaussée doit rester immédiat.
const STEER_HOLD_FIRST_DELAY = 0.26;
const STEER_HOLD_LANE_INTERVAL = 0.18;
// Les quatre touches du volant, AZERTY compris : les deux paires tiennent la
// même direction, mais chaque touche est suivie **physiquement** — relâcher Q
// pendant que ← reste enfoncé ne coupe pas le maintien.
const STEER_KEY_DIRECTIONS = Object.freeze({
  arrowleft: 'left',
  q: 'left',
  arrowright: 'right',
  d: 'right',
});
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

// Deux familles de bonus cohabitent sur la chaussée.
// · Les bonus flottants — pouvoirs et trousses de soin : une icône lumineuse
//   suspendue au-dessus de la route, son faisceau, un anneau et un halo posés au
//   sol pour marquer la voie.
// · Les bonus au sol — le turbo vert : aucun objet ne vole, seulement un cercle
//   peint sur le bitume (son disque + son anneau pulsant). Voir `setPickupKind`,
//   qui allume l'un ou l'autre jeu de mailles sur le même objet.
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
  // Le faisceau passe derrière l'icône : sans ce recul, les deux plans sont
  // coplanaires et se disputent le z-buffer au centre du bonus (clignotement).
  beam.position.z = -0.03;
  group.add(beam);
  const halo = new THREE.Mesh(shared.pickupHaloGeometry, shared.pickupBeamMaterials[CITY_RUSH_POWERS.BLUE_SHOT]);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -1.27;
  group.add(halo);

  // Le cercle au sol : posé à plat, dans le repère local de la rangée — qui est
  // déjà incliné avec la piste (`row.group.rotation.x`), donc le disque suit les
  // côtes et les descentes sans décrocher de la chaussée.
  const pad = new THREE.Group();
  pad.visible = false;
  const disc = new THREE.Mesh(shared.pickupPadGeometry, shared.pickupPadMaterials[CITY_RUSH_PICKUPS.BOOST]);
  disc.rotation.x = -Math.PI / 2;
  pad.add(disc);
  // L'anneau qui respire par-dessus le cercle : la seule animation du bonus, et
  // donc tout ce qui le garde vivant maintenant qu'aucune icône ne tournoie.
  // Sa matière est dupliquée pour chaque slot — l'opacité suit le rythme propre
  // du bonus (son `phase`) et ne peut donc pas être partagée entre les cercles,
  // qui s'écriraient les uns sur les autres à chaque image. La texture et la
  // géométrie, elles, restent partagées : c'est le dessin qui coûte, pas la
  // matière.
  const pulseMaterial = shared.pickupPadRingMaterials[CITY_RUSH_PICKUPS.BOOST].clone();
  const pulse = new THREE.Mesh(shared.pickupPadRingGeometry, pulseMaterial);
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = 0.02;
  pad.add(pulse);
  group.add(pad);

  group.userData = {
    kind: 'city-rush-pickup',
    icon,
    ring,
    beam,
    halo,
    pad,
    disc,
    pulse,
    pulseMaterial,
    // `true` quand le bonus est peint au sol : plus de tangage, plus de
    // rotation, et un éclatement remonté à hauteur de capot.
    ground: false,
    phase: Math.random() * Math.PI * 2,
    type: CITY_RUSH_POWERS.BLUE_SHOT,
  };
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
  // masquer les voies ni gêner le ramassage des bonus turbo.
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

function makeMiniGarageMaterials(city, garageLanes) {
  const laneLabel = (garageLanes || []).map((lane) => Number(lane) + 1).join(' + ');
  const signTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = city.accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    neonText(ctx, 'MINI GARAGE', width / 2, height * 0.3, '900 54px "Orbitron", Arial, sans-serif', city.accent, 16);
    neonText(ctx, `VOIES ${laneLabel} · VIE +${CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT}`, width / 2, height * 0.6, '800 24px "Orbitron", Arial, sans-serif', '#fff3cc', 8);
    neonText(ctx, 'POLICE LARGUÉE', width / 2, height * 0.86, '900 26px "Orbitron", Arial, sans-serif', '#7dffb0', 10);
  }, 512, 160, { smooth: true });

  // Peinture de voie : le mot GARAGE et une grande flèche, étirés dans le sens
  // de la route pour rester lisibles à 130 km/h.
  const lanePaintTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, width - 24, height - 24);
    // Grande flèche vers l'avant (le haut du dessin pointe vers le portique).
    ctx.fillStyle = city.accent;
    ctx.beginPath();
    ctx.moveTo(width / 2, height * 0.08);
    ctx.lineTo(width * 0.82, height * 0.4);
    ctx.lineTo(width * 0.62, height * 0.4);
    ctx.lineTo(width * 0.62, height * 0.56);
    ctx.lineTo(width * 0.38, height * 0.56);
    ctx.lineTo(width * 0.38, height * 0.4);
    ctx.lineTo(width * 0.18, height * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff3cc';
    ctx.lineWidth = 6;
    ctx.stroke();
    neonText(ctx, 'GARAGE', width / 2, height * 0.74, '900 74px "Orbitron", Arial, sans-serif', '#ffffff', 18);
    neonText(ctx, `VOIES ${laneLabel} · VIE +${CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT}`, width / 2, height * 0.92, '800 26px "Orbitron", Arial, sans-serif', city.accent, 10);
  }, 512, 512, { smooth: true });

  const roadSignTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = city.accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    neonText(ctx, 'GARAGE', width / 2, height * 0.3, '900 62px "Orbitron", Arial, sans-serif', city.accent, 16);
    neonText(ctx, `DANS ${CITY_RUSH_MINI_GARAGE_SIGN_LEAD} M · +${CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT} VIE`, width / 2, height * 0.6, '900 36px "Orbitron", Arial, sans-serif', '#fff3cc', 10);
    neonText(ctx, `↓ RESTE SUR ${laneLabel} ↓`, width / 2, height * 0.86, '800 26px "Orbitron", Arial, sans-serif', '#7dffb0', 8);
  }, 512, 256, { smooth: true });

  return {
    body: standard(0x151c2a, { roughness: 0.5, metalness: 0.48 }),
    wall: standard(0x0b101a, { roughness: 0.76, metalness: 0.16 }),
    floor: standard(0x0a1117, { roughness: 0.62, metalness: 0.3 }),
    accent: new THREE.MeshBasicMaterial({ color: city.accent, toneMapped: false, fog: false }),
    secondary: new THREE.MeshBasicMaterial({ color: city.secondary, toneMapped: false, fog: false }),
    health: new THREE.MeshBasicMaterial({ color: CITY_RUSH_HEALTH_PICKUP_COLOR, toneMapped: false, fog: false }),
    healthPanel: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false }),
    laneMark: new THREE.MeshBasicMaterial({ color: '#ecf6fa', toneMapped: false, fog: false }),
    sign: new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false, fog: false, side: THREE.DoubleSide }),
    lanePaint: new THREE.MeshBasicMaterial({
      map: lanePaintTexture,
      transparent: true,
      toneMapped: false,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    roadSign: new THREE.MeshBasicMaterial({ map: roadSignTexture, toneMapped: false, fog: false, side: THREE.DoubleSide }),
  };
}

// Indication de voie : quelques mètres avant le portique, les deux voies
// centrales sont peintes au sol (flèche + « GARAGE ») et bordées de chevrons,
// plus un panneau de bord de voie qui rappelle la distance. Tout est enfant du groupe
// du garage : le repère disparaît avec lui quand la porte est fermée ou servie.
function addMiniGarageLaneGuidance(group, materials, addBox) {
  const signLead = CITY_RUSH_MINI_GARAGE_SIGN_LEAD * SCALE;
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(CITY_RUSH_MINI_GARAGE_WIDTH - 0.4, 6.2), materials.lanePaint);
  paint.name = 'mini-garage-lane-paint';
  paint.rotation.x = -Math.PI / 2;
  paint.position.set(0, 0.035, signLead - 1.4);
  group.add(paint);

  // Chevrons au sol entre 8 m et 26 m avant l'entrée : ils dessinent le couloir
  // à suivre, leur pointe tournée vers le portique.
  const chevronCount = 9;
  for (let step = 0; step < chevronCount; step += 1) {
    const distance = 8 + step * 2.2; // m avant la porte
    for (const side of [-1, 1]) {
      const chevron = addBox(
        'mini-garage-approach-chevron',
        [0.72, 0.03, 0.12],
        [side * (CITY_RUSH_MINI_GARAGE_WIDTH * 0.36), 0.028, distance * SCALE],
        step % 2 === 0 ? materials.accent : materials.laneMark,
      );
      chevron.rotation.y = side * (step % 2 === 0 ? 0.62 : 0.48);
    }
  }

  // Panneau de bord de voie : le dernier rappel avant l'entrée.
  const postSide = 1;
  const postX = postSide * (CITY_RUSH_MINI_GARAGE_WIDTH / 2 + 0.8);
  addBox('mini-garage-sign-post', [0.1, 2.3, 0.1], [postX, 1.15, signLead], materials.body);
  addBox('mini-garage-sign-frame-road', [2.2, 0.92, 0.12], [postX, 2.5, signLead], materials.body);
  const roadSign = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.82), materials.roadSign);
  roadSign.name = 'mini-garage-road-sign';
  roadSign.position.set(postX, 2.5, signLead + 0.065);
  group.add(roadSign);
  const roadSignBack = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.82), materials.roadSign);
  roadSignBack.name = 'mini-garage-road-sign';
  roadSignBack.position.set(postX, 2.5, signLead - 0.065);
  roadSignBack.rotation.y = Math.PI;
  group.add(roadSignBack);
}

function makeMiniGarageObject(index, materials, garageLanes) {
  const group = new THREE.Group();
  group.name = 'city-rush-mini-garage';
  group.userData = {
    kind: 'mini-garage',
    index,
    lane: garageLanes[0] ?? null,
    lanes: [...garageLanes],
    trackDistance: 0,
    used: false,
  };

  const addBox = (name, size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  const halfWidth = CITY_RUSH_MINI_GARAGE_WIDTH / 2;
  // Portique ouvert, élargi pour couvrir les deux voies centrales sans
  // encombrer les voies voisines. Le joueur peut traverser par l'une ou l'autre.
  addBox('mini-garage-floor', [CITY_RUSH_MINI_GARAGE_WIDTH + 0.3, 0.08, 5.1], [0, 0.045, 0], materials.floor);
  addBox('mini-garage-roof', [CITY_RUSH_MINI_GARAGE_WIDTH, 0.22, 5.0], [0, 2.74, 0], materials.body);
  addBox('mini-garage-front-beam', [CITY_RUSH_MINI_GARAGE_WIDTH - 0.12, 0.26, 0.24], [0, 2.56, 2.38], materials.body);
  addBox('mini-garage-back-beam', [CITY_RUSH_MINI_GARAGE_WIDTH - 0.12, 0.22, 0.2], [0, 2.51, -2.38], materials.body);
  addBox('mini-garage-open-shutter', [CITY_RUSH_MINI_GARAGE_WIDTH - 0.8, 0.38, 0.12], [0, 2.25, -2.34], materials.wall);

  for (const side of [-1, 1]) {
    addBox('mini-garage-side-wall', [0.18, 1.9, 4.56], [side * (halfWidth - 0.18), 1.02, 0], materials.wall);
    addBox('mini-garage-front-pillar', [0.2, 2.58, 0.28], [side * (halfWidth - 0.25), 1.35, 2.35], materials.body);
    addBox('mini-garage-neon-pillar', [0.07, 2.22, 0.06], [side * (halfWidth - 0.48), 1.38, 2.51], materials.accent);
    addBox('mini-garage-side-neon', [0.055, 0.07, 4.4], [side * (halfWidth - 0.25), 1.96, 0], materials.secondary);
    addBox('mini-garage-entry-mark', [0.08, 0.035, 4.65], [side * (halfWidth - 0.55), 0.105, 0], materials.accent);
  }

  addBox('mini-garage-roof-neon', [CITY_RUSH_MINI_GARAGE_WIDTH - 0.3, 0.08, 0.08], [0, 2.62, 2.53], materials.accent);
  addBox('mini-garage-sign-frame', [4.3, 0.78, 0.14], [0, 3.14, 2.52], materials.body);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 0.62), materials.sign);
  sign.name = 'mini-garage-sign';
  sign.position.set(0, 3.14, 2.605);
  group.add(sign);

  // Plus rouge au-dessus de l'atelier : il signale la réparation même à distance.
  const healthPlus = new THREE.Group();
  healthPlus.name = 'mini-garage-health-plus';
  healthPlus.position.set(0, 4.18, 2.54);
  const plusPanel = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.08, 0.12), materials.healthPanel);
  const plusVertical = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, 0.16), materials.health);
  const plusHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.28, 0.16), materials.health);
  plusVertical.position.set(0, 0, 0.1);
  plusHorizontal.position.set(0, 0, 0.1);
  healthPlus.add(plusPanel, plusVertical, plusHorizontal);
  group.add(healthPlus);

  // Les chevrons au sol rendent la trajectoire de traversée lisible au joueur.
  for (let index = 0; index < 3; index += 1) {
    const chevron = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.035, 0.1),
      index === 1 ? materials.secondary : materials.laneMark,
    );
    chevron.name = 'mini-garage-drive-through-mark';
    chevron.position.set(0, 0.108, 1.35 - index * 1.1);
    group.add(chevron);
  }

  // Une indication large couvre les deux voies centrales du portique.
  addMiniGarageLaneGuidance(group, materials, addBox);

  return group;
}

/**
 * Entrepôt du bazooka : un **conteneur maritime de 40 pieds** posé sur la
 * chaussée et ouvert aux deux bouts. La voiture entre par la travée avant,
 * ramasse la roquette sous le toit, puis ressort par la porte arrière ; les
 * quatre vantaux, rabattus à plat contre les parois, ne mordent jamais sur les
 * voies.
 *
 * Le conteneur prend **deux voies** du sens de course — la voie extérieure du
 * ramassage et celle qui la borde vers l'axe jaune — soit 4,20 m de large, de
 * `out(-3,15)` à `out(+1,05)`.
 *
 * `side` vaut +1 quand la chaussée se tient à droite — le conteneur s'étend
 * alors vers les abscisses positives — et −1 en conduite à gauche (Londres,
 * Shutō C1), où tout le conteneur est reflété : sans ce miroir, il s'étalerait
 * sur les voies du contresens au lieu de rester de son côté de l'axe.
 */
function makeBazookaContainer(city, pickupLaneX, side = 1) {
  const group = new THREE.Group();
  group.name = 'city-rush-bazooka-container';
  const cityName = String(city?.name || '').toUpperCase();

  // ── Tôle ondulée ─────────────────────────────────────────────────────────
  // La caisse d'un conteneur se lit d'abord à ses ondes : verticales sur les
  // parois, transversales sur le toit. Deux textures répétées valent mieux que
  // quarante nervures en boîtes.
  const corrugated = (base, shade, waves, across = false) => makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);
    const band = (across ? height : width) / waves;
    for (let index = 0; index < waves; index += 1) {
      const start = index * band;
      const gradient = across
        ? ctx.createLinearGradient(0, start, 0, start + band)
        : ctx.createLinearGradient(start, 0, start + band, 0);
      gradient.addColorStop(0, base);
      gradient.addColorStop(0.3, shade);
      gradient.addColorStop(0.5, base);
      gradient.addColorStop(0.8, shade);
      gradient.addColorStop(1, base);
      ctx.fillStyle = gradient;
      if (across) ctx.fillRect(0, start, width, band);
      else ctx.fillRect(start, 0, band, height);
    }
  }, 192, 192, { smooth: true, repeat: true });
  const wallTexture = corrugated('#b85a22', '#7c3712', 6);
  wallTexture.repeat.set(6, 1);
  const roofTexture = corrugated('#9aa0a4', '#6f767c', 4, true);
  roofTexture.repeat.set(1, 9);

  const wall = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.74, metalness: 0.26, flatShading: true });
  const roof = new THREE.MeshStandardMaterial({ map: roofTexture, roughness: 0.62, metalness: 0.3, flatShading: true });
  const frame = standard(0x3a414b, { roughness: 0.46, metalness: 0.62 });
  const floor = standard(0x4a4038, { roughness: 0.9, metalness: 0.05 });
  const wood = standard(0x8c672f, { roughness: 0.72, metalness: 0.12 });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffd21f, toneMapped: false, fog: false });
  const warmGlow = new THREE.MeshBasicMaterial({
    color: 0xffd21f, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
  });
  const bazookaMetal = standard(0x333840, { roughness: 0.4, metalness: 0.72 });
  const signTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.strokeStyle = 'rgba(255, 244, 194, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, width - 28, height - 28);
    neonText(ctx, 'BAZOOKA HERE', width / 2, height * 0.44, '900 56px "Orbitron", Arial, sans-serif', '#ffd21f', 14);
    neonText(
      ctx,
      `↓ BAZOOKA · ${CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP} TIR${CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP > 1 ? 'S' : ''} ↓`,
      width / 2,
      height * 0.8,
      '900 30px "Orbitron", Arial, sans-serif',
      '#fff4c2',
      8,
    );
  }, 512, 160, { smooth: true });
  // Plaque d'immatriculation peinte sur la caisse : le nom du parcours, le
  // format et la charge — la petite touche qui rend le conteneur crédible.
  const plateTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#181c23';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    const title = cityName || 'BAZU 4002 7';
    let font = 40;
    ctx.font = `900 ${font}px "Orbitron", Arial, sans-serif`;
    while (font > 20 && ctx.measureText(title).width > width - 60) {
      font -= 2;
      ctx.font = `900 ${font}px "Orbitron", Arial, sans-serif`;
    }
    neonText(ctx, title, width / 2, height * 0.34, `900 ${font}px "Orbitron", Arial, sans-serif`, '#ffd21f', 10);
    neonText(ctx, "40' HC · 30 480 KG · 2 VOIES", width / 2, height * 0.72, '900 26px "Orbitron", Arial, sans-serif', '#e8e2d2', 6);
  }, 512, 160, { smooth: true });
  const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false, fog: false, side: THREE.DoubleSide });
  const plateMaterial = new THREE.MeshBasicMaterial({ map: plateTexture, toneMapped: false, fog: false, side: THREE.DoubleSide });

  const addBox = (name, size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  // ── Cotes de la caisse ───────────────────────────────────────────────────
  // 40 pieds de long (12,20 m), hauteur de caisse haute (2,90 m sous plafond)
  // et **deux voies** de large (4,20 m) : la voie de ramassage et celle qui la
  // borde vers l'axe. La travée avant s'ouvre là où s'ouvrait l'ancien
  // entrepôt, à 8,70 m du repère, pour que la roquette tombe toujours à 6,10 m
  // du centre du conteneur.
  const BASE = 0.16; // plancher bois, au-dessus des rails de base
  const WALL = 0.1; // épaisseur de tôle
  const CEILING = 2.9; // hauteur libre sous le toit
  const WIDTH = CITY_RUSH_LANE_WIDTH * 2; // deux voies de 2,10 m
  const LENGTH = 12.2; // 40 pieds
  const doorZ = 8.7;
  const backZ = doorZ - LENGTH;
  const centerZ = doorZ - LENGTH / 2;
  // Décalage latéral signé : positif vers l'extérieur de la chaussée.
  const out = (offset) => pickupLaneX + side * offset;
  const innerX = out(-CITY_RUSH_LANE_WIDTH * 1.5);
  const outerX = out(CITY_RUSH_LANE_WIDTH / 2);
  const centerX = out(-CITY_RUSH_LANE_WIDTH / 2);
  const topY = BASE + CEILING;
  const innerWallX = innerX + side * WALL / 2;
  const outerWallX = outerX - side * WALL / 2;

  // Coque : plancher, toit débordant, parois ondulées, poteaux d'angle et
  // ferrures. Le couloir de la voiture reste libre d'un bout à l'autre : le
  // plancher n'est qu'un platelage de bois le long des deux parois, la
  // chaussée elle-même tient lieu de sol sous les roues.
  for (const floorSide of [-1, 1]) {
    addBox(
      'bazooka-container-floor',
      [0.5, 0.12, LENGTH - 0.3],
      [centerX + side * floorSide * (WIDTH / 2 - WALL - 0.25), BASE - 0.06, centerZ],
      floor,
    );
  }
  addBox('bazooka-container-roof', [WIDTH + 0.2, 0.2, LENGTH + 0.16], [centerX, topY + 0.1, centerZ], roof);
  addBox('bazooka-container-inner-wall', [WALL, CEILING, LENGTH], [innerWallX, BASE + CEILING / 2, centerZ], wall);
  addBox('bazooka-container-outer-wall', [WALL, CEILING, LENGTH], [outerWallX, BASE + CEILING / 2, centerZ], wall);
  for (const wallX of [innerWallX, outerWallX]) {
    // Rails de base : la caisse ne pose pas sa tôle directement sur le bitume.
    addBox('bazooka-container-bottom-rail', [0.2, 0.24, LENGTH], [wallX, 0.12, centerZ], frame);
    for (const end of [doorZ, backZ]) {
      const inward = Math.sign(end - centerZ);
      const cornerZ = end - inward * 0.13;
      addBox('bazooka-container-corner-post', [0.24, CEILING + 0.08, 0.26], [wallX, BASE + (CEILING + 0.08) / 2, cornerZ], frame);
      // Ferrure d'angle ISO : le bloc d'acier qui signe les quatre coins.
      addBox('bazooka-container-corner-block', [0.34, 0.26, 0.34], [wallX, topY - 0.16, cornerZ], frame);
    }
  }
  // Traverse de porte, aux deux bouts : la travée garde 2,40 m de haut sous
  // poutre, et le conteneur reste ouvert de part en part.
  for (const end of [doorZ, backZ]) {
    const inward = Math.sign(end - centerZ);
    addBox('bazooka-container-header-beam', [WIDTH - 0.24, 0.5, 0.26], [centerX, topY - 0.25, end - inward * 0.13], frame);
  }
  // Deux réglettes néon courent sous le toit : la travée reste lisible dans
  // l'ombre de la caisse.
  for (const wallX of [innerX + side * 0.16, outerX - side * 0.16]) {
    addBox('bazooka-container-neon', [0.07, 0.1, LENGTH - 0.8], [wallX, BASE + 2.34, centerZ], yellow);
  }
  // Stries jaunes devant la travée : le repère se voit au soleil, et la
  // troisième tombe pile sur la voie de ramassage.
  for (let stripe = 0; stripe < 3; stripe += 1) {
    addBox('bazooka-container-entry-stripe', [0.22, 0.03, 1.6], [out(-2.6 + stripe * 1.3), 0.13, doorZ + 0.85], yellow);
  }
  // Enseigne au-dessus du toit : elle surplombe la caisse pour rester lisible
  // de loin, déportée vers l'extérieur pour ne pas barrer la vue du pilote sur
  // sa voiture pendant la traversée.
  const signX = centerX + side * 0.35;
  const signY = topY + 1.05;
  addBox('bazooka-container-sign-frame', [4.9, 1.3, 0.3], [signX, signY, doorZ + 0.12], frame);
  for (const postX of [signX - 1.7, signX + 1.7]) {
    addBox('bazooka-container-sign-post', [0.2, 0.26, 0.2], [postX, topY + 0.3, doorZ - 0.1], frame);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), signMaterial);
  sign.name = 'bazooka-container-sign';
  sign.userData = { label: 'BAZOOKA HERE' };
  sign.position.set(signX, signY, doorZ + 0.3);
  group.add(sign);
  // Plaques d'immatriculation sur les deux parois, comme sur une vraie caisse :
  // celle de la paroi intérieure est la seule face que la caméra de poursuite
  // voit de face pendant l'approche, l'autre habille le bas-côté.
  for (const plateSide of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), plateMaterial);
    plate.name = 'bazooka-container-plate';
    plate.position.set(
      (plateSide > 0 ? outerX : innerX) + side * plateSide * 0.05,
      BASE + 1.35,
      centerZ + plateSide * 2.6,
    );
    plate.rotation.y = plateSide * Math.PI / 2 * side;
    group.add(plate);
  }

  // ── Vantaux rabattus ─────────────────────────────────────────────────────
  // Les quatre portes du conteneur s'ouvrent à plat contre les parois : la
  // travée garde ses 4,20 m de large et les barres de verrouillage restent du
  // côté du bas-côté, jamais dans la trajectoire des voitures.
  for (const leafSide of [-1, 1]) {
    const faceX = leafSide > 0 ? outerX : innerX;
    const leafX = faceX + side * leafSide * 0.06;
    for (const end of [doorZ, backZ]) {
      const inward = Math.sign(end - centerZ);
      const leafZ = end - inward * 1.08;
      addBox('bazooka-container-door', [0.12, 2.36, 1.7], [leafX, BASE + 1.18, leafZ], wall);
      for (const offset of [-0.79, -0.26, 0.26, 0.79]) {
        addBox('bazooka-container-door-bar', [0.07, 2.14, 0.1], [leafX + side * leafSide * 0.1, BASE + 1.18, leafZ + offset], frame);
      }
      for (const offset of [-0.26, 0.26]) {
        addBox('bazooka-container-door-cam', [0.06, 0.24, 0.34], [leafX + side * leafSide * 0.11, BASE + 1.18, leafZ + offset], yellow);
      }
      for (const height of [0.5, 2.2]) {
        addBox('bazooka-container-door-hinge', [0.2, 0.24, 0.16], [faceX + side * leafSide * 0.02, BASE + height, end - inward * 0.1], frame);
      }
    }
  }

  const pickup = new THREE.Group();
  pickup.name = 'city-rush-bazooka-pickup';
  pickup.position.set(pickupLaneX, 1.22, BAZOOKA_PICKUP_LOCAL_Z);
  const pickupBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 1.02), wood);
  pickupBase.position.y = -0.57;
  pickup.add(pickupBase);
  const baseStripe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.1, 1.04), yellow);
  baseStripe.position.y = -0.24;
  pickup.add(baseStripe);

  const rocket = new THREE.Group();
  rocket.name = 'bazooka-pickup-rocket';
  rocket.position.set(0, 0.11, -0.08);
  rocket.rotation.y = -0.18;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.08, 8), bazookaMetal);
  tube.rotation.x = -Math.PI / 2;
  rocket.add(tube);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 8), yellow);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.68;
  rocket.add(nose);
  for (const rocketSide of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.28), yellow);
    fin.position.set(rocketSide * 0.18, 0, 0.4);
    rocket.add(fin);
  }
  pickup.add(rocket);

  const pickupRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.075, 8, 28), yellow);
  pickupRing.name = 'bazooka-pickup-ring';
  pickupRing.rotation.x = Math.PI / 2;
  pickupRing.position.y = -0.08;
  pickup.add(pickupRing);
  const pickupHalo = new THREE.Mesh(new THREE.CircleGeometry(0.88, 24), warmGlow);
  pickupHalo.name = 'bazooka-pickup-halo';
  pickupHalo.rotation.x = -Math.PI / 2;
  pickupHalo.position.y = -0.07;
  pickup.add(pickupHalo);
  // Le faisceau s'arrête sous le toit du conteneur : il éclaire la travée au
  // lieu de traverser la caisse.
  const pickupBeam = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 2.2), warmGlow);
  pickupBeam.name = 'bazooka-pickup-beam';
  pickupBeam.position.y = 0.62;
  pickup.add(pickupBeam);
  group.add(pickup);
  group.userData = { pickup, pickupRing, pickupHalo, pickupBeam, rocket, trackDistance: 0, side };
  return group;
}

// Un même objet, deux allures : `setPickupKind` allume le jeu de mailles qui
// convient au bonus. Un pouvoir ou une trousse garde son kit flottant ; le
// turbo vert descend au sol et n'est plus qu'un cercle peint sur la voie.
function setPickupKind(pickup, type, laneX, shared) {
  pickup.userData.type = type;
  const { icon, ring, beam, halo, pad } = pickup.userData;
  const ground = PICKUP_GROUND_TYPES.includes(type);
  pickup.userData.ground = ground;
  icon.material = shared.pickupMaterials[type];
  ring.material = shared.pickupRingMaterials[type];
  beam.material = shared.pickupBeamMaterials[type];
  halo.material = shared.pickupBeamMaterials[type];
  // Le turbo n'a ni icône, ni faisceau, ni anneau suspendu : tout son kit
  // flottant s'éteint et laisse place au disque posé à plat.
  icon.visible = !ground;
  beam.visible = !ground;
  ring.visible = !ground;
  halo.visible = !ground;
  pad.visible = ground;
  if (ground) {
    // Le dessin du cercle est partagé (une seule texture pour toutes les
    // rangées) ; seule la teinte de l'anneau — matière privée du slot, vue par
    // la boucle d'animation — est remise à la couleur du bonus.
    pickup.userData.disc.material = shared.pickupPadMaterials[type];
    pickup.userData.pulseMaterial.color.set(pickupColor(type));
    pickup.userData.pulse.scale.set(1, 1, 1);
    // Un cercle n'a rien à faire pivoter : on remet l'assiette à plat, sinon le
    // slot hériterait du tangage laissé par le bonus flottant qu'il incarnait
    // avant d'être recyclé.
    pickup.rotation.set(0, 0, 0);
  }
  // La rangée est centrée sur l'axe de la route : le bonus doit garder son
  // décalage local pour apparaître sur la voie tirée par la génération.
  pickup.position.x = laneX;
  // Les bonus flottants montent tous à la même hauteur ; un bonus au sol se
  // plaque sur la chaussée, à quelques centimètres seulement pour ne pas z-fighter.
  pickup.position.y = ground ? PICKUP_GROUND_HEIGHT : PICKUP_FLOAT_HEIGHT;
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
  const segmentCount = cityRushPoliceMaxHealth(group.userData?.trafficType);
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

// Une voiture de police touchée s'embrase progressivement : un nouveau foyer
// apparaît au fil des impacts, et ceux déjà allumés grandissent jusqu'au
// tête-à-queue. Les cônes sont partagés dans le monde courant ; leurs matériaux
// restent propres à chaque voiture pour que les flammes vacillent séparément.
const POLICE_DAMAGE_FIRE_SPOTS = 6;

function createPoliceDamageFireKit() {
  const outerGeometry = new THREE.ConeGeometry(0.3, 0.9, 7, 1, true);
  outerGeometry.translate(0, 0.45, 0);
  const coreGeometry = new THREE.ConeGeometry(0.17, 0.56, 6, 1, true);
  coreGeometry.translate(0, 0.28, 0);
  return { outerGeometry, coreGeometry };
}

function attachPoliceDamageFire(mesh, kit) {
  if (!mesh || !kit || mesh.userData.damageFire) return mesh?.userData?.damageFire || null;
  const isSuv = mesh.userData.trafficType === 'police-suv';
  const hoodY = isSuv ? 1.02 : 0.76;
  const hoodZ = isSuv ? -1.78 : -1.18;
  const roofY = isSuv ? 1.56 : 1.29;
  const trunkY = isSuv ? 0.94 : 0.75;
  const trunkZ = isSuv ? 1.7 : 1.22;
  const spots = [
    [-0.36, hoodY, hoodZ],
    [0, hoodY + 0.04, hoodZ - 0.08],
    [0.36, hoodY, hoodZ],
    [-0.36, trunkY, trunkZ],
    [0, roofY, 0.16],
    [0.36, trunkY, trunkZ],
  ];
  const group = new THREE.Group();
  group.name = 'police-damage-fire';
  group.visible = false;
  group.renderOrder = 3;
  const flames = spots.map(([x, y, z], index) => {
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: index % 2 === 0 ? 0xff5b1f : 0xff8528,
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd34a, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const flame = new THREE.Group();
    flame.name = 'police-damage-flame';
    flame.position.set(x, y, z);
    flame.userData.phase = index * 1.71;
    flame.add(
      new THREE.Mesh(kit.outerGeometry, outerMaterial),
      new THREE.Mesh(kit.coreGeometry, coreMaterial),
    );
    flame.children.forEach((child) => { child.castShadow = false; child.receiveShadow = false; });
    flame.visible = false;
    group.add(flame);
    return { group: flame, baseY: y, outerMaterial, coreMaterial };
  });
  mesh.add(group);
  mesh.userData.damageFire = { group, flames, level: 0 };
  return mesh.userData.damageFire;
}

function animatePoliceDamageFire(mesh, damageLevel = 0, clockTime = 0) {
  const fire = mesh?.userData?.damageFire;
  if (!fire) return;
  const level = clamp(Number(damageLevel) || 0, 0, 1);
  fire.level = level;
  fire.group.visible = level > 0.001;
  if (!fire.group.visible) {
    fire.flames.forEach((flame) => { flame.group.visible = false; });
    return;
  }
  fire.flames.forEach((flame, index) => {
    // Une barre de vie standard compte six cases : chaque impact allume un
    // foyer supplémentaire. Les derniers foyers du SUV grandissent par étapes
    // plus fines, puisque sa coque blindée compte dix cases.
    const progress = clamp(level * POLICE_DAMAGE_FIRE_SPOTS - index, 0, 1);
    flame.group.visible = progress > 0.025;
    if (!flame.group.visible) return;
    const flicker = 0.84 + 0.16 * Math.sin(clockTime * (9.2 + index * 1.35) + flame.group.userData.phase);
    const width = 0.24 + level * 0.62 + progress * 0.28;
    const height = (0.22 + level * 0.88 + progress * 0.55) * flicker;
    flame.group.scale.set(width * flicker, height, width * flicker);
    flame.group.position.y = flame.baseY + Math.sin(clockTime * 11 + flame.group.userData.phase) * 0.025;
    flame.group.rotation.y = clockTime * (0.7 + index * 0.11) + flame.group.userData.phase;
    flame.outerMaterial.opacity = clamp((0.2 + progress * 0.48 + level * 0.2) * flicker, 0, 0.9);
    flame.coreMaterial.opacity = clamp((0.22 + progress * 0.48 + level * 0.24) * flicker, 0, 0.94);
  });
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

// ── Carcasse calcinée d'une berline détruite ────────────────────────────────
// Emplacements du feu sur la carcasse : capot, habitacle, coffre. Chaque
// flamme vacille à son rythme (`animatePoliceWreckHusk`).
const WRECK_FLAME_SPOTS = Object.freeze([
  [-0.42, 0.74, -1.02],
  [0.38, 0.7, 0.16],
  [0.02, 0.84, -0.2],
  [0, 0.64, 1.26],
]);

// Matériaux et géométries du feu. Ils ne sont **jamais** partagés entre deux
// mondes : `disposeScene` jette tout matériau trouvé dans la scène, donc un kit
// partagé serait détruit avec le premier monde fermé.
function createPoliceWreckKit() {
  const char = new THREE.MeshStandardMaterial({ color: 0x1b1a1e, roughness: 0.96, metalness: 0.04 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.42, metalness: 0.25 });
  const flameGeometry = new THREE.ConeGeometry(0.36, 1.12, 7, 1, true);
  flameGeometry.translate(0, 0.56, 0);
  const coreGeometry = new THREE.ConeGeometry(0.2, 0.64, 6, 1, true);
  coreGeometry.translate(0, 0.32, 0);
  return { char, glass, flameGeometry, coreGeometry };
}

// La carcasse garde les volumes exacts de la berline (`makeTrafficVehicle`),
// mais sa tôle est noircie, ses vitres sont fumées, et tout ce qui brûle —
// gyrophares, phares, feux, autocollants — a fondu. Le feu qui la dévore fait
// partie du même groupe : il suit la carcasse, ancrée sur la piste.
function makePoliceWreckHusk(vehicleType, kit) {
  const husk = makeTrafficVehicle(vehicleType);
  husk.name = 'police-wreck';
  const melted = [];
  husk.traverse((child) => {
    if (!child.isMesh) return;
    const material = child.material;
    // Matériaux bruts = gyrophares, phares et feux ; matériau texturé =
    // autocollants. Rien de tout cela ne survit à l'incendie.
    if (material?.isMeshBasicMaterial || material?.map) {
      melted.push(child);
      return;
    }
    const smoked = (material?.metalness || 0) >= 0.2 && (material?.roughness || 1) <= 0.25;
    child.material = smoked ? kit.glass : kit.char;
  });
  melted.forEach((child) => child.parent?.remove(child));
  const fire = new THREE.Group();
  fire.name = 'police-wreck-fire';
  const flames = [];
  const flameMaterials = [];
  WRECK_FLAME_SPOTS.forEach(([x, y, z], index) => {
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: index % 2 === 0 ? 0xff6a1f : 0xff8f2e,
      transparent: true, opacity: 0.82, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd34a, transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    flameMaterials.push(outerMaterial, coreMaterial);
    const flame = new THREE.Group();
    flame.add(new THREE.Mesh(kit.flameGeometry, outerMaterial), new THREE.Mesh(kit.coreGeometry, coreMaterial));
    flame.position.set(x, y, z);
    flame.userData.phase = index * 1.9;
    fire.add(flame);
    flames.push(flame);
  });
  // Braise : un halo additif au ras de la tôle, lisible de loin et de nuit.
  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0xff5a1e, transparent: true, opacity: 0.2, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }),
  );
  ember.position.y = 0.72;
  ember.scale.set(1, 0.5, 1.5);
  // Trace calcinée laissée sur la chaussée par l'incendie.
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 20),
    new THREE.MeshBasicMaterial({ color: 0x100c0a, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.y = 0.015;
  fire.add(ember, scorch);
  husk.add(fire);
  husk.userData.wreck = { flames, flameMaterials, ember, scorch };
  husk.userData.taken = false;
  husk.visible = false;
  return husk;
}

// Le feu vit : chaque flamme respire à son rythme, et l'ensemble suit
// l'intensité renvoyée par `cityRushPoliceWreckFlame` — pleine flamme à
// l'explosion, braises ensuite, jamais éteint tant que la carcasse est là.
function animatePoliceWreckHusk(husk, intensity, clockTime) {
  const wreck = husk.userData?.wreck;
  if (!wreck) return;
  const level = clamp(Number(intensity) || 0, 0, 1);
  wreck.flames.forEach((flame, index) => {
    const flicker = 0.74
      + 0.26 * Math.sin(clockTime * (7.4 + index * 1.7) + flame.userData.phase)
      + 0.1 * Math.sin(clockTime * (13.1 + index * 2.3) + flame.userData.phase * 1.7);
    const spread = Math.max(0.18, level * (0.82 + 0.18 * flicker));
    flame.scale.set(spread, Math.max(0.1, level * flicker), spread);
    flame.rotation.y = clockTime * (0.6 + index * 0.17) + flame.userData.phase;
  });
  wreck.flameMaterials.forEach((material, index) => {
    const base = index % 2 === 0 ? 0.82 : 0.9;
    material.opacity = clamp(base * level * (0.72 + 0.28 * Math.sin(clockTime * (10.5 + index * 1.3))), 0, 1);
  });
  wreck.ember.material.opacity = clamp(0.08 + 0.2 * level * (0.7 + 0.3 * Math.sin(clockTime * 5.3)), 0, 1);
}

const BAZOOKA_EXPLOSION_SECONDS = 1.85;
const BAZOOKA_SCORCH_SECONDS = 4.8;

// Panache en champignon : un fût incandescent pousse un chapeau de fumée
// charbonneuse, découpé en bourrelets pour garder une silhouette lisible en 3D.
// Ses matériaux sont propres à l'impact (aucun partage avec les carcasses).
function makeBazookaMushroomCloud() {
  const group = new THREE.Group();
  group.name = 'bazooka-mushroom-cloud';
  const sootMaterial = new THREE.MeshBasicMaterial({
    color: 0x453438, transparent: true, opacity: 0, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  });
  const fireMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6127, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd15a, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const stemSmoke = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.22, 3.3, 14, 4, true), sootMaterial,
  );
  stemSmoke.name = 'bazooka-mushroom-stem-smoke';
  stemSmoke.position.y = 1.72;
  const stemFire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.12, 2.9, 12, 4, true), fireMaterial,
  );
  stemFire.name = 'bazooka-mushroom-stem-fire';
  stemFire.position.y = 1.52;
  const stemCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.06, 2.45, 10, 4, true), coreMaterial,
  );
  stemCore.name = 'bazooka-mushroom-stem-core';
  stemCore.position.y = 1.32;

  const puffGeometry = new THREE.SphereGeometry(1, 16, 12);
  const puffs = [
    [0, 3.45, 0, 1.65, 0.76, 1.45],
    [-1.12, 3.25, 0.02, 0.98, 0.66, 0.96],
    [1.12, 3.25, 0.02, 0.98, 0.66, 0.96],
    [0, 3.22, -1.04, 1.05, 0.64, 0.92],
    [0, 3.22, 1.04, 1.05, 0.64, 0.92],
    [0, 4.02, 0, 1.02, 0.58, 0.98],
  ];
  for (const [x, y, z, sx, sy, sz] of puffs) {
    const soot = new THREE.Mesh(puffGeometry, sootMaterial);
    soot.position.set(x, y, z);
    soot.scale.set(sx, sy, sz);
    group.add(soot);
    // Les langues de feu sont plus petites : elles s'éteignent pendant que le
    // bourrelet sombre continue de monter, comme un vrai panache de souffle.
    const flame = new THREE.Mesh(puffGeometry, fireMaterial);
    flame.position.set(x * 0.82, y - 0.08, z * 0.82);
    flame.scale.set(sx * 0.62, sy * 0.58, sz * 0.62);
    group.add(flame);
  }
  group.add(stemSmoke, stemFire, stemCore);
  return {
    group,
    sootMaterial,
    fireMaterial,
    coreMaterial,
    stemSmoke,
    stemFire,
    stemCore,
  };
}

function animateBazookaMushroomCloud(cloud, t, scale) {
  if (!cloud) return;
  const appear = smoothstep(t / 0.12);
  const rise = smoothstep(t / 0.68);
  const dissolve = 1 - smoothstep((t - 1.12) / 0.68);
  const fireFade = 1 - smoothstep((t - 0.18) / 0.64);
  cloud.group.visible = t < BAZOOKA_EXPLOSION_SECONDS;
  cloud.group.position.y = 0.12 + rise * 1.35;
  cloud.group.scale.set(
    scale * (0.5 + rise * 0.58),
    scale * (0.55 + rise * 0.5),
    scale * (0.5 + rise * 0.58),
  );
  cloud.group.rotation.y = Math.sin(t * 1.8) * 0.075;
  cloud.sootMaterial.opacity = 0.76 * appear * dissolve;
  cloud.fireMaterial.opacity = 0.84 * appear * fireFade * dissolve;
  cloud.coreMaterial.opacity = 0.96 * appear * (1 - smoothstep(t / 0.5)) * dissolve;
  cloud.stemSmoke.scale.y = 0.78 + rise * 0.3;
  cloud.stemFire.scale.y = 0.78 + rise * 0.3;
  cloud.stemCore.scale.y = 0.8 + rise * 0.25;
}

function makeImpact(shared, { bazooka = false } = {}) {
  const group = new THREE.Group();
  group.name = bazooka ? 'city-rush-bazooka-explosion' : 'police-explosion';
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
  // La roquette grave un vrai rond de goudron noir qui reste visible après le
  // flash et la fumée, puis se dissipe doucement au fil des secondes.
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(bazooka ? 2.35 : 1.5, bazooka ? 28 : 22),
    new THREE.MeshBasicMaterial({ color: 0x0a0808, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  scorch.name = bazooka ? 'bazooka-scorch-mark' : 'police-explosion-scorch';
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.y = 0.02;
  const mushroomCloud = bazooka ? makeBazookaMushroomCloud() : null;
  group.add(flash, fireball, inner, ring, scorch);
  if (mushroomCloud) group.add(mushroomCloud.group);
  group.userData = { flash, fireball, inner, ring, scorch, mushroomCloud, age: 0 };
  group.visible = false;
  return group;
}

// Anime un impact de berline ou le champignon de la roquette : flash bref,
// boule de feu, onde de choc et, pour le bazooka, panache ascendant + brûlure.
function animateExplosion(fx, t, { radius = EXPLOSION_RADIUS, scale = 1, bazooka = false } = {}) {
  // Éclair initial très bref.
  const flashLife = clamp(t / 0.12, 0, 1);
  fx.userData.flash.scale.setScalar((1.4 + flashLife * 1.2) * scale);
  fx.userData.flash.material.opacity = (1 - flashLife) * 0.95;
  // Boule de feu qui se dilate puis se dissipe.
  const fireLife = clamp(t / 0.5, 0, 1);
  fx.userData.fireball.scale.setScalar((0.4 + fireLife * 2.1) * scale);
  fx.userData.fireball.material.opacity = (1 - fireLife) * 0.95;
  const innerLife = clamp(t / 0.32, 0, 1);
  fx.userData.inner.scale.setScalar((0.3 + innerLife * 1.2) * scale);
  fx.userData.inner.material.opacity = (1 - innerLife);
  // Onde de choc au sol, qui se propage jusqu'au rayon de la zone d'effet.
  const ringLife = clamp(t / 0.55, 0, 1);
  fx.userData.ring.scale.setScalar(0.4 + ringLife * (radius / 0.6 - 0.4));
  fx.userData.ring.material.opacity = (1 - ringLife) * 0.9;
  if (bazooka) {
    animateBazookaMushroomCloud(fx.userData.mushroomCloud, t, scale);
    const scorchAppear = smoothstep(t / 0.14);
    const scorchFade = 1 - smoothstep((t - 3.0) / (BAZOOKA_SCORCH_SECONDS - 3.0));
    fx.userData.scorch.scale.setScalar(scale * (0.94 + smoothstep(t / 0.32) * 0.06));
    fx.userData.scorch.material.opacity = 0.86 * scorchAppear * scorchFade;
  } else {
    // La trace d'une explosion ordinaire garde sa durée historique.
    const scorchLife = clamp(t / 0.6, 0, 1);
    fx.userData.scorch.scale.setScalar(scale);
    fx.userData.scorch.material.opacity = Math.sin(Math.min(1, scorchLife * 1.6) * Math.PI) * 0.7;
  }
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
  group.userData = { flash, ring, sparks, flashMaterial, ringMaterial, sparkMaterial, age: 0, active: false, intensity: 1 };
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
export function createCityRushWorld(mount, city, getCallbacks, selectedCarId = CITY_RUSH_CARS[0].id, audioRef = null, initialRoster = null, raceLaps = CITY_RUSH_LAPS, policeFromStart = false, raceFormat = 'laps', storyRules = null, tutorialMode = false) {
  // Sprint : course solo à checkpoints, sans police ni arme ; seuls les pads
  // turbo restent disponibles comme bonus.
  const sprint = raceFormat === 'sprint';
  // Règles spéciales du mode Histoire (`cityRushStory.js`, une entrée par
  // chapitre) : armes coupées (course pure), police absente (duel, chrono),
  // coque réduite (survie), voitures/allures imposées aux rivaux (boss) et
  // panne scriptée (prologue). `null` en mode libre : rien ne change.
  const storyWeaponsEnabled = storyRules?.weaponsEnabled !== false;
  const storyPoliceEnabled = storyRules?.policeEnabled !== false;
  const policeTrafficEnabled = storyRules?.policeTrafficEnabled !== false;
  // Le bazooka est sur toutes les cartes : deux entrepôts par course, à 30 %
  // puis 65 % du parcours — seul le Sprint et les chapitres sans arme/police
  // le retirent.
  const bazookaWarehouseEnabled = !sprint && storyWeaponsEnabled && storyPoliceEnabled && storyRules?.bazookaEnabled !== false;
  const storyHealthOverride = Number.isFinite(Number(storyRules?.playerHealthOverride)) && Number(storyRules.playerHealthOverride) > 0
    ? Math.floor(Number(storyRules.playerHealthOverride))
    : null;
  // Le drapeau de tournoi ne dit pas « course pure » (un chapitre d'histoire
  // l'est aussi) : il dit « plateau de huit voitures ». C'est lui qui donne au
  // parcours son trafic de tournoi — clairsemé et sans une seule berline de
  // police, même au dernier tour (voir `CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT`).
  const tournamentMode = storyRules?.tournament === true;
  const storyRivalCarIds = storyRules?.rivalCarIds && typeof storyRules.rivalCarIds === 'object' ? storyRules.rivalCarIds : null;
  const storyRivalPace = storyRules?.rivalPace && typeof storyRules.rivalPace === 'object' ? storyRules.rivalPace : null;
  const storyRivalHealth = storyRules?.rivalHealth && typeof storyRules.rivalHealth === 'object' ? storyRules.rivalHealth : null;
  const missionTargetId = typeof storyRules?.missionTargetId === 'string' ? storyRules.missionTargetId : null;
  const missionTargetStartDistance = Number.isFinite(Number(storyRules?.missionTargetStartDistance))
    ? Math.max(0, Number(storyRules.missionTargetStartDistance))
    : null;
  const missionTargetLeadMin = Number(storyRules?.missionTargetLeadMin) || 0;
  const missionTargetLeadMax = Number(storyRules?.missionTargetLeadMax) || 0;
  // Mission d'interception en deux temps : le second fugitif reste hors piste
  // jusqu'à ce que la première cible soit détruite, puis surgit avec une avance
  // suffisante pour lancer une vraie deuxième poursuite.
  const missionEscapeTriggerId = typeof storyRules?.missionEscapeTriggerId === 'string'
    ? storyRules.missionEscapeTriggerId
    : null;
  const missionEscapeTargetId = typeof storyRules?.missionEscapeTargetId === 'string'
    ? storyRules.missionEscapeTargetId
    : null;
  const missionEscapeStartLead = Number.isFinite(Number(storyRules?.missionEscapeStartLead))
    ? Math.max(1, Number(storyRules.missionEscapeStartLead))
    : 40;
  const missionFugitiveIds = new Set([missionTargetId, missionEscapeTargetId].filter(Boolean));
  const startingPistolAmmo = Math.max(0, Math.floor(Number(storyRules?.startingPistolAmmo) || 0));
  const missionPistolPickupRowInterval = Math.max(0, Math.floor(Number(storyRules?.pistolPickupRowInterval) || 0));
  const storyBreakdown = storyRules?.breakdown && typeof storyRules.breakdown === 'object' ? storyRules.breakdown : null;
  const effectiveLaps = Number.isFinite(raceLaps) && raceLaps > 0 ? Math.floor(raceLaps) : CITY_RUSH_LAPS;
  const bazookaTrackDistances = cityRushBazookaTrackDistances({ laps: effectiveLaps });
  // Le dernier tour enchaîne plusieurs boucles : la course est plus longue que
  // `laps` × la boucle. Le décor, lui, reste une boucle de 1 200 m qui se répète.
  const effectiveDistance = sprint ? CITY_RUSH_SPRINT_DISTANCE : cityRushRaceDistance(effectiveLaps);
  const effectivePoliceFromStart = !sprint && storyPoliceEnabled && Boolean(policeFromStart);
  const theme = cityRushTheme(city.id);
  const lightRig = cityRushLightRig(theme, city);
  const lite = detectLiteQuality();
  const reduceMotion = detectReducedMotion();
  const daylight = Boolean(theme.daylight);
  const cityIndex = Math.max(0, CITY_RUSH_COURSES.findIndex((item) => item.id === city.id));
  const sceneryRandom = seededRandom(cityIndex * 131 + 7);
  // Voies du parcours : six voies à double sens pour les villes et les routes
  // ouvertes, quatre voies resserrées autour de l'axe pour un circuit permanent
  // (le Nordschleife). `oncomingLanes` est alors vide : personne n'arrive de
  // face. Le côté du contresens suit le pays (`driveSide`) : à gauche en
  // conduite à droite, à droite à Londres et sur la Shuto de Tokyo.
  const courseLanes = cityRushLaneConfig(city);
  const laneCount = courseLanes.laneCount;
  const laneX = courseLanes.laneX;
  const forwardLanes = courseLanes.forwardLanes;
  const oncomingLanes = courseLanes.oncomingLanes;
  const oncomingLaneSet = new Set(oncomingLanes);
  const driveSide = courseLanes.driveSide;
  const policeLanes = courseLanes.policeLanes;
  const bazookaPickupLane = driveSide === 'left'
    ? forwardLanes[0]
    : forwardLanes[forwardLanes.length - 1];
  const defaultLanes = courseLanes.defaultLanes;
  const playerStartLane = defaultLanes[0];
  // Tracé de rendu : Vice City enchaîne longues courbes et virages secs, les
  // autres villes gardent deux S doux, et le Ring rejoue ses 73 virages.
  const trackProfile = cityRushTrackProfile(city);
  // Rythme du parcours : 1 partout, `CITY_RUSH_RACEWAY_PACE` sur le Ring, où le
  // défilement à 126 km/h rend la piste illisible. **Tout** ce qui roule passe
  // par `paced()` — pilote, rivaux, trafic, contresens, police, projectiles et
  // même les accélérations — si bien que la course entière ralentit d'un bloc :
  // les écarts relatifs, les distances de streaming (déjà exprimées en secondes
  // de trajet) et la difficulté ne changent pas, seul le rythme baisse.
  const coursePace = cityRushCoursePace(city);
  const paced = (speed) => speed * coursePace;
  // Grands virages de Vice City et du Ring : tout ce qui roule lève le pied
  // dans les courbes. À Vice City, l'anticipation de 40 m commence le freinage
  // avant les virages secs ; les longues droites sans courbe à venir restent à 1.
  const cornerPaceAt = (trackDistance) => cityRushCornerPace(city, trackDistance, trackProfile);

  const scene = new THREE.Scene();
  // Three.js crée des UUID avec Math.random(). Isole ces appels visuels pour
  // que l'ajout des flammes ne décale pas les tirages de gameplay ni les seeds.
  const policeVisualRandom = seededRandom(0xF17E + cityIndex * 997);
  const withPoliceVisualRandom = (create) => {
    const gameplayRandom = Math.random;
    Math.random = policeVisualRandom;
    try {
      return create();
    } finally {
      Math.random = gameplayRandom;
    }
  };
  const policeDamageFireKit = withPoliceVisualRandom(createPoliceDamageFireKit);
  scene.background = new THREE.Color(city.background);
  const fogColor = new THREE.Color(city.fog).lerp(new THREE.Color(theme.sky.haze), 0.22);
  scene.fog = new THREE.Fog(fogColor, theme.fogNear, theme.fogFar);

  const camera = new THREE.PerspectiveCamera(CAMERA_BASE_FOV, 1, 0.1, 420);
  camera.position.copy(CHASE_POSITION);
  camera.lookAt(CHASE_LOOK);

  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  // Résolution adaptative : le plafond dépend de l'écran, le palier courant
  // baisse si la machine ne tient plus la cadence (voir `adaptResolution`).
  const pixelRatioCap = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(pixelRatioCap);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lightRig.exposure;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Reflets studio des carrosseries : la carte d'environnement est dérivée du
  // renderer, donc branchée juste après sa création (avant les voitures).
  configureCarReflections(renderer);
  renderer.domElement.className = 'city-rush-canvas';
  renderer.domElement.setAttribute('aria-label', `Course de voitures 3D dans ${city.name} : ${effectiveLaps} tours, change de voie, ramasse les plus rouges pour récupérer un carré de vie, évite le trafic et traverse le mini-garage central pour réparer jusqu'à six carrés.`);
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
    // Le cercle turbo posé sur la chaussée : un plan carré de deux mètres (une
    // voie en fait 2,10) tourné à plat, et son anneau qui respire par-dessus.
    // Géométries partagées entre toutes les rangées, comme le reste du bonus.
    pickupPadGeometry: new THREE.PlaneGeometry(2, 2),
    // Rayon 0,82 : celui du cercle peint dans la texture (104 px sur 256 pour
    // un plan de 2 m) — l'anneau lumineux épouse la peinture, il ne flotte pas
    // au large.
    pickupPadRingGeometry: new THREE.TorusGeometry(0.82, 0.05, 4, 30),
    pickupPadMaterials: Object.fromEntries(PICKUP_GROUND_TYPES.map((type) => [
      type,
      makeBoostPadMaterial(pickupColor(type)),
    ])),
    pickupPadRingMaterials: Object.fromEntries(PICKUP_GROUND_TYPES.map((type) => [
      type,
      new THREE.MeshBasicMaterial({ color: pickupColor(type), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    ])),
    pickupMaterials: Object.fromEntries(PICKUP_ICON_TYPES.map((type) => [
      type,
      makePickupMaterial(type, pickupColor(type)),
    ])),
    pickupRingMaterials: Object.fromEntries(PICKUP_ICON_TYPES.map((type) => [
      type,
      new THREE.MeshBasicMaterial({ color: pickupColor(type), transparent: true, opacity: 0.95, toneMapped: false }),
    ])),
    pickupBeamMaterials: Object.fromEntries(PICKUP_ICON_TYPES.map((type) => [
      type,
      new THREE.MeshBasicMaterial({ color: pickupColor(type), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    ])),
    // Les chevrons verts restent ceux du tremplin ; le bonus turbo, lui, est un
    // cercle peint au sol (voir `pickupPadGeometry` et `makePickupObject`).
    boostChevronGeometry: makeBoostChevronGeometry(),
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
  // Il porte aussi la **grille** : chaque entrée peut donner sa voie, sa rangée
  // et son décalage de départ (`lane`, `row`, `gridDistance`). Un tournoi en
  // aligne huit — le pilote ferme la marche — là où le mode libre en aligne
  // trois sur la même rangée.
  let currentRoster = Array.isArray(initialRoster) && initialRoster.length
    ? initialRoster
    : selectCityRushRacers({ cityId: city.id, carId: selectedCarId });
  let playerDriver = currentRoster.find((item) => item.id === 'player') || currentRoster[0];
  // Décalage de départ du pilote, en mètres : négatif quand il part derrière la
  // ligne (dernière rangée d'une grille), zéro en course libre.
  const playerGridDistance = Number.isFinite(Number(playerDriver?.gridDistance))
    ? Number(playerDriver.gridDistance)
    : 0;

  const playerProfile = CITY_RUSH_CARS.find((car) => car.id === selectedCarId) || CITY_RUSH_CARS[0];
  // Chaque voiture encaisse selon sa propre coque (`durabilityMultiplier`) :
  // la citadine lente tient 23 carrés, la supercar rapide 7. Les deux rivaux
  // reçoivent la vie de **leur** profil, comme le joueur.
  const playerMaxHealth = storyHealthOverride ?? cityRushCarMaxHealth(playerProfile);
  // Vitesse de pointe de la voiture engagée, rythme du parcours compris : elle
  // règle le streaming (trafic, contresens, rangées de bonus) et le chrono du
  // Sprint. Les trois systèmes étaient calibrés sur une seule vitesse ; ils
  // suivent désormais le modèle — et le parcours.
  const playerTopSpeed = paced(PLAYER_SPEED * playerProfile.powerMultiplier);
  const trafficViewAhead = cityRushTrafficViewAhead(playerTopSpeed);
  const oncomingViewAhead = cityRushTrafficViewAhead(
    playerTopSpeed + paced(Math.max(...CITY_RUSH_TRAFFIC_TYPES.map((spec) => spec.speed))),
  );
  // Le chrono du Sprint suit la voiture : à la vitesse de référence il vaut
  // toujours les 15 s historiques, mais la citadine (83 km/h) a besoin de plus
  // de temps et la supercar de moins pour garder la même pression.
  const sprintTimeBonus = cityRushSprintCheckpointTime(playerTopSpeed);
  // Matchmaking par catégorie : les rivaux restent dans la même famille que
  // la voiture engagée. Les modèles imposés par un chapitre ou un tournoi sont
  // conservés s'ils sont compatibles ; sinon le sélecteur choisit une voiture
  // de la même catégorie, au plus près en vitesse.
  const playerCar = makeRacerCar(playerProfile, {
    player: true,
    number: CITY_RUSH_CARS.indexOf(playerProfile) + 1,
    daylight,
    driver: playerDriver,
  });
  if (storyRules?.policePlayerLook === true) applyPoliceRacerLivery(playerCar);
  playerCar.position.set(laneX(playerStartLane), 0, PLAYER_Z);
  scene.add(playerCar);

  // Le Sprint se court en solo, contre le chrono : aucun rival en piste. Le
  // tutoriel aussi : la voiture y roule seule, la route reste lisible et les
  // accessoires de la leçon ne sont jamais raflés par un adversaire.
  // Partout ailleurs, le plateau vient du roster : deux rivaux en course libre,
  // sept dans un tournoi — chacun à sa place de grille.
  const racerSpecs = (sprint || tutorialMode)
    ? []
    : currentRoster
      .filter((entry) => entry?.id && entry.id !== 'player')
      .map((entry, index) => ({
        id: entry.id,
        // La place du roster fait foi ; à défaut, la grille historique (une
        // voie par rival, tous sur la ligne).
        lane: Number.isFinite(Number(entry.lane)) ? Number(entry.lane) : defaultLanes[(index + 1) % defaultLanes.length],
        startDistance: entry.id === missionTargetId && missionTargetStartDistance !== null
          ? missionTargetStartDistance
          : Number.isFinite(Number(entry.gridDistance)) ? Number(entry.gridDistance) : 0,
        // Le complice est construit avec le plateau pour garder son modèle et
        // son pilote, mais attend hors piste. `activateMissionEscapeRacer` le
        // place devant l'officier au moment exact où le dealer tombe à zéro.
        missionStaged: entry.id === missionEscapeTargetId,
        // Le premier rival se décale très tôt, les suivants plus tard : la
        // meute ne s'ébranle pas d'un seul bloc.
        phase: 0.6 + index * 1.8,
        changeIn: 1.4 + index * 0.7,
        skidSide: index % 2 === 0 ? 1 : -1,
      }));
  const racers = racerSpecs.map((spec, index) => {
    const profile = cityRushRivalCarProfile({
      playerCarId: playerProfile.id,
      rivalIndex: index,
      preferredCarId: storyRivalCarIds?.[spec.id] || null,
    }) || playerProfile;
    const driver = currentRoster.find((item) => item.id === spec.id) || currentRoster[index + 1];
    return {
      ...spec,
      startLane: spec.lane,
      driverId: driver.driverId,
      name: driver.name,
      displayName: driver.displayName,
      country: driver.country,
      countryCode: driver.countryCode,
      flag: driver.flag,
      avatar: driver.avatar,
      accent: driver.accent,
      profile,
      distance: spec.startDistance,
      lap: 1,
      maxHealth: Math.max(1, Math.floor(Number(storyRivalHealth?.[spec.id]) || cityRushCarMaxHealth(profile))),
      health: Math.max(1, Math.floor(Number(storyRivalHealth?.[spec.id]) || cityRushCarMaxHealth(profile))),
      healthFlash: 0,
      raceActive: !spec.missionStaged,
      wrecked: Boolean(spec.missionStaged),
      // Pointe de référence du modèle. Le plancher lié à la voiture du joueur,
      // le rythme de course et l'éventuel bonus de scénario sont appliqués à
      // chaque frame pour que les rivaux ne soient pas distancés par le garage.
      baseSpeed: paced(PLAYER_SPEED * profile.powerMultiplier),
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
      // Niveau de recherche du rival : il monte à trois étoiles quand il touche
      // une voiture de police (carambolage comme tir) et quand il mène la course
      // au dernier tour. Zéro tant qu'il n'a rien fait — et une seule berline lui
      // est alors dédiée (voir `registerPoliceRetaliation`).
      wantedLevel: 0,
    };
  });
  racers.forEach((racer) => scene.add(racer.mesh));
  const activeRacers = () => racers.filter((racer) => racer.raceActive !== false);

  function applyRoster(nextRoster) {
    // Le tutoriel et le Sprint partent avec un roster solo (le pilote seul) :
    // une interception est un duel, les autres courses ont au moins trois profils.
    const minimumRoster = (tutorialMode || sprint) ? 1 : missionEscapeTargetId ? 3 : missionTargetId ? 2 : 3;
    if (!Array.isArray(nextRoster) || nextRoster.length < minimumRoster) return;
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

  // Pas une seule voiture de police dans le trafic du Sprint, de l'entraînement
  // guidé **ni d'un tournoi** — la course y est annoncée « sans police », et une
  // patrouille percutée partirait en chasse, y compris au dernier tour.
  // Certains parcours (routes de campagne peu fréquentées comme la Mexique)
  // réduisent fortement le nombre de véhicules grâce à
  // `trafficCount`/`oncomingCount`.
  // Un parcours peut restreindre son trafic (le Ring ne voit ni camion-poubelle
  // ni berline de ville) : `trafficTypes` liste alors les modèles autorisés.
  const courseTrafficTypes = Array.isArray(city.trafficTypes) && city.trafficTypes.length
    ? CITY_RUSH_TRAFFIC_TYPES.filter((spec) => city.trafficTypes.includes(spec.id))
    : [];
  const allowedTrafficTypes = courseTrafficTypes.length ? courseTrafficTypes : CITY_RUSH_TRAFFIC_TYPES;
  const nonPoliceTrafficTypes = allowedTrafficTypes.filter((spec) => !isCityRushPoliceTrafficType(spec.id));
  const sprintTrafficFallback = CITY_RUSH_TRAFFIC_TYPES.filter((spec) => !isCityRushPoliceTrafficType(spec.id));
  // Pas une seule berline de police sur la route du Sprint, du tournoi, de
  // l'entraînement guidé ni d'un scénario qui désactive la police ou ses voitures
  // de trafic (missions de conduite propre comprises).
  const policeFreeTraffic = sprint || tutorialMode || tournamentMode || !storyPoliceEnabled || !policeTrafficEnabled;
  const trafficTypes = policeFreeTraffic
    ? (nonPoliceTrafficTypes.length ? nonPoliceTrafficTypes : sprintTrafficFallback)
    : allowedTrafficTypes;
  const cityTrafficCount = Math.max(0, Math.min(CITY_RUSH_TRAFFIC_COUNT, Number(city.trafficCount)));
  const effectiveTrafficCount = Number.isFinite(cityTrafficCount) && cityTrafficCount > 0 ? cityTrafficCount : CITY_RUSH_TRAFFIC_COUNT;
  // Entraînement guidé : la route reste vivante, mais deux fois plus clairsemée.
  // La démonstration doit pouvoir tenir une voie (ligne propre) et chaque leçon
  // se lire — le trafic garde de quoi montrer les dépassements et l'évitement.
  // Tournoi : le plateau de huit voitures a la route pour lui — moins de
  // civiles, jamais plus que le parcours n'en autorise.
  const trafficCount = tournamentMode
    ? Math.max(1, Math.min(effectiveTrafficCount, CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT))
    : tutorialMode ? Math.max(2, Math.round(effectiveTrafficCount / 2)) : effectiveTrafficCount;
  const cityOncomingCount = Math.max(0, Math.min(CITY_RUSH_ONCOMING_COUNT, Number(city.oncomingCount)));
  const effectiveOncomingCount = Number.isFinite(cityOncomingCount) && cityOncomingCount >= 0 ? cityOncomingCount : CITY_RUSH_ONCOMING_COUNT;
  // Le contresens se réduit à une seule voiture en tournoi — et reste vide sur
  // un circuit à sens unique, où `oncomingLanes` n'a aucune voie.
  const oncomingCount = tournamentMode
    ? Math.min(effectiveOncomingCount, CITY_RUSH_TOURNAMENT_ONCOMING_COUNT)
    : effectiveOncomingCount;
  const trafficCars = Array.from({ length: trafficCount }, (_, index) => {
    const spec = trafficTypes[index % trafficTypes.length];
    const mesh = makeTrafficVehicle(spec.id);
    if (isCityRushPoliceTrafficType(spec.id)) {
      withPoliceVisualRandom(() => attachPoliceDamageFire(mesh, policeDamageFireKit));
    }
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
      baseSpeed: paced(spec.speed * randomRange(0.94, 1.06)),
      currentSpeed: paced(spec.speed),
      impactLeft: 0,
      impactCooldownLeft: 0,
      impactChanging: false,
      impactFromLane: null,
      impactTargetLane: null,
      phase: index * 0.9,
      // Une berline de police percutée quitte la ronde : elle est alors pilotée
      // par la chasse (`activePursuers`) au lieu du flot lent.
      rallied: false,
      destroyed: false,
      health: isCityRushPoliceTrafficType(spec.id) ? CITY_RUSH_POLICE_HEALTH : null,
    };
  });

  // ── Trafic venant en face ─────────────────────────────────────────────
  // Les voies en sens inverse — à gauche de l'axe jaune par défaut, à droite à
  // Londres et sur la Shuto de Tokyo — voient arriver ces véhicules face à la
  // course ; ils reparaissent au loin une fois passés derrière les pilotes. Un
  // véhicule percuté dévie vers le bord sans quitter la chaussée. Un tournoi
  // n'en garde qu'un seul : le peloton se répartit la chaussée, pas le contresens.
  const oncomingPoliceSpecs = trafficTypes.filter((spec) => isCityRushPoliceTrafficType(spec.id));
  const oncomingCars = Array.from({ length: oncomingCount }, (_, index) => {
    // Les patrouilles marquée et banalisée sont placées dans le contresens
    // lorsque la route autorise les deux types ; les autres voies gardent leur
    // tirage de trafic habituel.
    const spec = index < oncomingPoliceSpecs.length
      ? oncomingPoliceSpecs[index]
      : trafficTypes[(index + 2) % trafficTypes.length];
    const mesh = makeTrafficVehicle(spec.id);
    if (isCityRushPoliceTrafficType(spec.id)) {
      withPoliceVisualRandom(() => attachPoliceDamageFire(mesh, policeDamageFireKit));
    }
    scene.add(mesh);
    return {
      ...spec,
      type: spec.id,
      id: `oncoming-${index}`,
      mesh,
      distance: 0,
      lane: oncomingLanes[index % oncomingLanes.length],
      currentX: 0,
      baseSpeed: paced(spec.speed * randomRange(0.94, 1.1)),
      currentSpeed: paced(spec.speed),
      impactCooldownLeft: 0,
      pushedAside: false,
      pushAsideElapsed: 0,
      pushAsideStartX: null,
      phase: index * 1.3,
      lastPassGap: undefined,
      health: isCityRushPoliceTrafficType(spec.id) ? CITY_RUSH_POLICE_HEALTH : null,
      destroyed: false,
      rallied: false,
      turnaroundState: null,
      turnaroundElapsed: 0,
      turnaroundTargetId: null,
      turnaroundAsBackup: false,
      turnaroundTargetLane: null,
    };
  });
  // Trafic clairsemé : les parcours déserts (campagne mexicaine, Ring) et les
  // tournois — quatre civiles au lieu de huit — respirent la même règle. Les
  // voitures y reparaissent avec de grands écarts : la route appartient au
  // plateau, pas au flot.
  const sparseTraffic = tournamentMode || trafficCount <= 3;

  // ── Les SUV de charge du contresens ────────────────────────────────────
  // Cinq étoiles ne se contentent plus d'attendre le pilote : deux SUV
  // d'interception arrivent **de face** et foncent sur lui. Ils vivent dans le
  // contresens (`oncomingCars`) pour hériter du rendu, de la détection balayée
  // des chocs et de la conversion en poursuivants, mais leur conduite est
  // propre (voir `updateSuvCharges`) : ils apparaissent loin devant, visent la
  // voie du pilote à portée de verrou, se rabattent à vitesse limitée et
  // roulent plus vite que sa pointe. Le contact les retourne — le demi-tour
  // réglementaire des patrouilles — et ils rejoignent la chasse.
  const suvCharges = Array.from({ length: CITY_RUSH_SUV_CHARGE_COUNT }, (_, index) => {
    const mesh = makeTrafficVehicle(CITY_RUSH_SUV_CHARGE_TYPE);
    withPoliceVisualRandom(() => attachPoliceDamageFire(mesh, policeDamageFireKit));
    mesh.name = `suv-charge-${index + 1}`;
    mesh.visible = false;
    scene.add(mesh);
    return {
      // Même famille que les patrouilles du contresens : le contact déclenche
      // la poursuite, le demi-tour et la montée d'étoiles comme pour elles.
      ...(CITY_RUSH_TRAFFIC_TYPES.find((spec) => spec.id === 'police') || CITY_RUSH_TRAFFIC_TYPES[0]),
      type: 'police',
      vehicleType: CITY_RUSH_SUV_CHARGE_TYPE,
      id: `suv-charge-${index + 1}`,
      name: policeUnitName(index + 1, CITY_RUSH_SUV_CHARGE_TYPE),
      charge: true,
      chargeIndex: index,
      chargeState: 'dormant', // dormant | charging | reloading
      chargeReloadLeft: 0,
      chargeAnnounced: false,
      chargeLocked: false,
      mesh,
      // Dormant : garé loin derrière la grille, il n'apparaîtra qu'à cinq
      // étoiles (`armSuvCharge` le replace au loin devant le pilote).
      distance: -1200,
      lane: oncomingLanes.length ? oncomingLanes[index % oncomingLanes.length] : CITY_RUSH_ONCOMING_LANES[0],
      currentX: 0,
      baseSpeed: 0,
      currentSpeed: 0,
      impactCooldownLeft: 0,
      pushedAside: false,
      pushAsideElapsed: 0,
      pushAsideStartX: null,
      phase: 0.8 + index * 1.7,
      lastPassGap: undefined,
      health: cityRushPoliceMaxHealth(CITY_RUSH_SUV_CHARGE_TYPE),
      maxHealth: cityRushPoliceMaxHealth(CITY_RUSH_SUV_CHARGE_TYPE),
      healthFlash: 0,
      destroyed: false,
      rallied: false,
      turnaroundState: null,
      turnaroundElapsed: 0,
      turnaroundTargetId: null,
      turnaroundAsBackup: false,
      turnaroundTargetLane: null,
    };
  });
  oncomingCars.push(...suvCharges);

  // ── La herse : le barrage éclair des quatre étoiles ────────────────────
  // État du dispositif monté par deux voitures de police (voir
  // `beginSpikeBlock`/`updateSpikeBlock`). `idle` = aucun barrage ; les voitures
  // prennent position, la herse se déroule voie par voie, puis elle est posée ;
  // une fois le pilote passé, les voitures rangent et repartent (`packing`).
  const SPIKE_BLOCK_ID = 'spike-block';
  const spikeBlock = {
    state: 'idle', // idle | deploying | laying | set | packing
    elapsed: 0,
    age: 0,
    distance: 0,
    lanes: [],
    cooldownLeft: 0,
    meshes: null,
    cars: [],
  };

  // ── L'escouade de police et ses renforts ciblés ────────────────────────
  // Trois voitures poursuivent le joueur. Une unité supplémentaire par rival
  // est gardée en réserve ; elle ne sort que si ce rival touche une voiture de
  // police, puis ne le lâche plus lui. Sans police du tout — Sprint, tournoi,
  // chapitre « course pure » —, aucune réserve n'est construite : la meute a la
  // route pour elle, et sept berlines invisibles ne coûtent rien.
  const rivalReserveCount = storyPoliceEnabled ? racers.length : 0;
  const policeCars = Array.from({ length: CITY_RUSH_POLICE_COUNT + rivalReserveCount }, (_, index) => {
    const squad = index < CITY_RUSH_POLICE_COUNT;
    const rivalIndex = index - CITY_RUSH_POLICE_COUNT;
    const lane = policeLanes[index % policeLanes.length];
    const vehicleType = CITY_RUSH_POLICE_VEHICLE_TYPES[index % CITY_RUSH_POLICE_VEHICLE_TYPES.length];
    const mesh = makePolicePursuitCar(vehicleType);
    withPoliceVisualRandom(() => attachPoliceDamageFire(mesh, policeDamageFireKit));
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
      baseSpeed: paced(CITY_RUSH_POLICE_BASE_SPEED * (index % CITY_RUSH_POLICE_COUNT === 0 ? 1 : 0.97)),
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
      skidSide: 1,
      skidSmokeTimer: 0,
      jumpState: { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0 },
      currentJumpY: 0,
      currentJumpPitch: 0,
      powerCooldown: 0,
      inventory: createCityRushPoliceInventory(),
      active: false,
      everDeployed: false,
      reinforcementPending: false,
      reinforcement: false,
      health: cityRushPoliceMaxHealth(vehicleType),
      maxHealth: cityRushPoliceMaxHealth(vehicleType),
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
  // La police a abandonné la poursuite (sortie d'un mini-garage) : plus aucune
  // relève ne part tant que le pilote ne provoque pas de nouveau la police.
  let policePursuitDropped = false;
  // Niveau de recherche propre au joueur : les modes normaux commencent à zéro,
  // tandis que le mode Poursuite démarre à cinq étoiles comme son escouade.
  let wantedLevel = effectivePoliceFromStart ? CITY_RUSH_WANTED_MAX_STARS : 0;
  // Destructions de police réalisées par le joueur depuis le dernier passage
  // au mini-garage : la première vaut quatre étoiles, la deuxième cinq.
  let policeDestroyedByPlayer = 0;
  // Les trois unités de base et les voitures réservées aux rivaux ont déjà
  // leur numéro ; les remplaçantes suivantes commencent après toute la réserve.
  let nextPoliceUnitNumber = policeCars.length + 1;
  let policeReinforcementTimer = 0;
  const policeReinforcementQueue = [];
  const policeRetaliationByAttacker = new Map();

  // ── Barres de vie des voitures de course ───────────────────────────────
  // Le joueur et ses rivaux partent avec quinze cellules, affichées dès le
  // départ effectif. Chaque tir réussi leur retire une cellule. Percuter une
  // voiture — trafic, contresens ou berline de police — en retire une aussi :
  // le carambolage arme un court répit partagé
  // (`CITY_RUSH_PLAYER_COLLISION_COOLDOWN`) pour ne compter qu'un carré par choc.
  let playerHealth = playerMaxHealth;
  let playerHealthActive = false;
  let playerHealthFlash = 0;
  let playerCollisionCooldownLeft = 0;
  // Épave : barre à zéro. La voiture tourne sur elle-même dans sa fumée, perd
  // toute vitesse, puis la course est déclarée perdue (`finishRace`).
  let playerWrecked = false;
  // Panne scriptée du prologue : avertissement, puis calage moteur avant la
  // ligne (`storyBreakdown`, parts de la distance totale). Tant que la panne
  // n’a pas frappé, la voiture roule normalement.
  let storyBreakdownWarned = false;
  let storyBreakdownActive = false;
  let storyBreakdownLeft = 0;
  let storyBreakdownSmokeTimer = 0;
  let storyRankAtBreakdown = null;
  // Statistiques des défis d’histoire et de mission, remises à zéro à chaque course.
  let playerShotsFired = 0;
  let playerHitsTaken = 0;
  let playerVehicleContacts = 0;
  let policeDestroyedTotal = 0;
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

  // Les berlines rappelées par une collision comptent dans le quota GTA ; les
  // voitures venant en face qui rejoignent l'escouade à cinq étoiles sont des
  // renforts supplémentaires, pas un remplacement des trois unités principales.
  function activePlayerPursuerSlots() {
    const activeSlots = activePursuers().filter((police) => (
      police.targetId === 'player' && !police.wantedBackup
    )).length;
    const turningSlots = oncomingCars.filter((car) => (
      car.turnaroundState === 'turning'
      && car.turnaroundTargetId === 'player'
      && !car.turnaroundAsBackup
      && !car.destroyed
    )).length;
    return activeSlots + turningSlots;
  }

  function requiredPlayerPursuerSlots() {
    // Une poursuite abandonnée (mini-garage) ne se relève plus toute seule :
    // seules les étoiles regagnées depuis rappellent la police.
    const squadSlots = policeDeployed && !policePursuitDropped ? CITY_RUSH_POLICE_COUNT : 0;
    return Math.max(squadSlots, cityRushPoliceCountForWantedLevel(wantedLevel));
  }

  function beginOncomingPoliceTurnaround(oncoming, { asBackup = false, targetId = 'player' } = {}) {
    if (!oncoming || !isCityRushPoliceTrafficType(oncoming.type) || oncoming.destroyed || oncoming.rallied) return false;
    if (oncoming.turnaroundState === 'turning') {
      // À cinq étoiles une patrouille déjà retournée à cause d'un contact devient
      // un renfort « en plus » de l'escouade normale.
      if (asBackup) oncoming.turnaroundAsBackup = true;
      return false;
    }
    if (oncoming.turnaroundState === 'joined') return false;
    oncoming.turnaroundState = 'turning';
    oncoming.turnaroundElapsed = 0;
    oncoming.turnaroundTargetId = targetId;
    oncoming.turnaroundAsBackup = Boolean(asBackup);
    oncoming.turnaroundTargetLane = forwardLanes.reduce((bestLane, lane) => (
      Math.abs(laneX(lane) - oncoming.currentX) < Math.abs(laneX(bestLane) - oncoming.currentX)
        ? lane
        : bestLane
    ), forwardLanes[0]);
    oncoming.pushedAside = false;
    oncoming.pushAsideElapsed = 0;
    oncoming.pushAsideStartX = null;
    return true;
  }

  function turnAroundOncomingPoliceAsBackup() {
    // Les SUV de charge gardent leur charge : ils ne font demi-tour qu'au
    // contact (voir `updateSuvCharges`), le demi-tour à vue restant le lot des
    // patrouilles du flot.
    const turning = oncomingCars.filter((car) => (
      isCityRushPoliceTrafficType(car.type) && !car.destroyed && !car.rallied && !car.charge
    ));
    let started = 0;
    for (const car of turning) {
      if (beginOncomingPoliceTurnaround(car, { asBackup: true })) started += 1;
      else if (car.turnaroundState === 'turning') car.turnaroundAsBackup = true;
    }
    if (started > 0) {
      getCallbacks().effect?.({
        type: 'police-oncoming-turnaround',
        count: started,
        duration: CITY_RUSH_POLICE_TURNAROUND_DURATION,
        targetId: 'player',
      });
    }
  }

  // À cinq étoiles (atteintes à la deuxième destruction de police), toute
  // voiture de police qui aperçoit le pilote rejoint la chasse sans attendre
  // le contact : les berlines en ronde dans le même sens se rallient dès
  // qu'elles sont à portée de vue, celles venant en face font demi-tour.
  function checkPoliceSightRally() {
    if (sprint || !active || finished) return;
    if (wantedLevel < CITY_RUSH_WANTED_MAX_STARS) return;
    for (const traffic of trafficCars) {
      if (traffic.rallied || traffic.destroyed || !isCityRushPoliceTrafficType(traffic.type)) continue;
      if (Math.abs(traffic.distance - distance) > CITY_RUSH_POLICE_SIGHT_RANGE) continue;
      rallyTrafficPolice(traffic, 'player', { sighted: true });
    }
    turnAroundOncomingPoliceAsBackup();
  }

  function dispatchWantedPolice() {
    if (sprint || finished) return 0;
    const desired = requiredPlayerPursuerSlots();
    if (desired <= 0) return 0;
    let missing = desired - activePlayerPursuerSlots() - policeReinforcementQueue.length;
    if (missing <= 0) return 0;
    const target = raceEntries().find((entry) => entry.id === 'player');
    let activated = 0;
    for (const police of policeCars.filter((unit) => unit.squad)) {
      if (missing <= 0) break;
      // `wreckPending` : la berline agonise encore, son maillage est réservé.
      if (police.active || police.reinforcementPending || police.wreckPending) continue;
      if (!police.everDeployed) {
        activatePoliceUnit(police, target, {
          reinforcement: false,
          unitNumber: police.index + 1,
          targetId: 'player',
        });
        activated += 1;
        missing -= 1;
      } else if (queuePoliceReinforcement(police)) {
        missing -= 1;
      }
    }
    if (activated > 0) {
      audioRef?.current?.policeSiren?.({ level: 0.48 });
      getCallbacks().effect?.({
        type: 'police-wanted-dispatch',
        count: activated,
        wantedLevel,
        target: 'player',
        targetId: 'player',
      });
    }
    return activated;
  }

  function raiseWantedLevel({ police = false, destroyed = false, reason = 'vehicle-hit' } = {}) {
    // Entraînement guidé : les étoiles ne montent pas. La leçon explique la
    // herse et les SUV, la démonstration ne les déclenche pas — une herse en
    // travers de la leçon du mini-garage n'apprendrait rien à personne.
    if (sprint || tutorialMode || !active || finished || !storyPoliceEnabled) return wantedLevel;
    const previous = wantedLevel;
    if (destroyed) {
      policeDestroyedByPlayer = Math.min(CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS, policeDestroyedByPlayer + 1);
      wantedLevel = cityRushWantedLevelAfterPoliceDestroyed(wantedLevel, policeDestroyedByPlayer);
    } else {
      wantedLevel = cityRushWantedLevelAfterHit(wantedLevel, { hit: true, police });
    }
    if (wantedLevel === previous) return wantedLevel;

    // Une nouvelle provocation annule l'abandon : la police reprend la chasse.
    policePursuitDropped = false;
    if (wantedLevel >= CITY_RUSH_WANTED_MAX_STARS) turnAroundOncomingPoliceAsBackup();
    dispatchWantedPolice();
    getCallbacks().effect?.({
      type: 'wanted-level',
      previous,
      stars: wantedLevel,
      maxStars: CITY_RUSH_WANTED_MAX_STARS,
      reason,
      policeDestroyedByPlayer,
      pursuitCars: cityRushPoliceCountForWantedLevel(wantedLevel),
    });
    emitHud(true);
    return wantedLevel;
  }

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
  let policeAimNoticeCooldown = 0;

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
  const miniGarageLanes = cityRushMiniGarageLanes(city);
  const miniGarageMaterials = sprint ? null : makeMiniGarageMaterials(city, miniGarageLanes);
  // Une seule porte par course : celle de mi-course, à la moitié du parcours.
  const miniGarageTrackDistances = cityRushMiniGarageTrackDistances({ laps: effectiveLaps });
  const miniGarages = sprint ? [] : miniGarageTrackDistances.map((trackDistance, index) => {
    const group = makeMiniGarageObject(index + 1, miniGarageMaterials, miniGarageLanes);
    scene.add(group);
    return {
      index: index + 1,
      group,
      lanes: miniGarageLanes,
      trackDistance,
      used: false,
    };
  });
  // Deux entrepôts par course, sur toutes les cartes : un à 30 % du parcours
  // (avant le garage de vie de mi-course), un à 65 % (après). Chacun est un
  // conteneur de 40 pieds qui prend les **deux voies extérieures** du sens de
  // course : à droite en conduite à droite, à gauche à Londres et sur la Shutō
  // C1, où tout le conteneur est reflété.
  const bazookaOutwardSide = driveSide === 'left' ? -1 : 1;
  const bazookaWarehouses = bazookaWarehouseEnabled
    ? bazookaTrackDistances.map((trackDistance, index) => {
      const group = makeBazookaContainer(city, laneX(bazookaPickupLane), bazookaOutwardSide);
      group.visible = false;
      scene.add(group);
      return {
        index: index + 1,
        group,
        trackDistance,
        taken: false,
      };
    })
    : [];
  let bazookaAmmo = 0;
  let bazookaPickupTaken = false;
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
  // Couples coureur/voiture lente déjà en contact : un impact par épisode (voir
  // `detectCityRushTrafficImpacts`), pour qu'un pilote retenu juste derrière une
  // voiture lente soit facturé une fois — et non à chaque image — sans jamais
  // rester collé au seuil sans rien toucher.
  const trafficContacts = new Set();
  // Voitures déjà poussées par le choc latéral pendant le côte-à-côte en cours
  // (voir `trySideBump`) : un seul choc tant qu'elles restent à la même hauteur.
  const sideBumpContacts = new Set();
  let playerBoostLeft = 0;
  let playerStunLeft = 0;
  let playerStunTotal = 0;
  let playerSkidLeft = 0;
  let playerSkidDuration = 0.85;
  let playerSkidSide = 1;
  // Secousse réservée au contact avec le SUV de police : roulis de caisse et
  // lacet oscillant, purement visuels (les règles de vitesse/vie restent les mêmes).
  let playerSuvImpactLeft = 0;
  let playerSuvImpactSide = 1;
  // Crevaison sur la herse : les pneus à plat, la voiture ne repart pas à fond
  // pendant quelques secondes (facteur `CITY_RUSH_SPIKE_SLOW_FACTOR`).
  let playerSpikeSlowLeft = 0;
  // Conduite en ligne : changer de voie ne ralentit pas, mais cela remet à
  // zéro le bonus de vitesse « ligne propre » chargé en tenant sa voie.
  let playerCleanLineTime = 0;
  // Bonus de contresens : rouler dans les voies en sens inverse charge une
  // jauge de vitesse cumulative (voir `advanceCityRushOncomingBonus`), qui
  // retombe dès que la voiture revient dans le sens de la course. `stage` sert
  // à n'annoncer chaque palier qu'une fois (charge / plein / perdu).
  let playerOncomingTime = 0;
  let playerOncomingStage = 'none';
  let score = 0;
  let pickedUp = 0;
  let playerPistolPickups = 0;
  let inventory = createCityRushInventory();
  let pistolKeyHeld = false;
  let pistolHoldCooldown = 0;
  // Maintien des flèches : `steerKeysHeld` liste les touches physiques encore
  // enfoncées avec leur direction, dans l'ordre de pression — Q et ← peuvent
  // l'être ensemble sans se couper l'un l'autre. `steerHoldDirection` est la
  // direction qui pilote le volant (la dernière touche pressée gagne) et
  // `steerHoldCooldown` le temps restant avant le prochain écart.
  const steerKeysHeld = new Map();
  let steerHoldDirection = null;
  let steerHoldCooldown = 0;
  let finished = false;
  let lastHudAt = 0;
  let lastFrame = performance.now();
  let raf = 0;
  let currentSpeed = 0;
  let playerCurrentSpeed = 0;
  let randomSeed = Math.random;
  let launchSmokeLeft = 0;
  let playerSmokeTimer = 0;
  let playerDamageSmokeTimer = 0;
  const playerHoodScratch = new THREE.Vector3();
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
  // Une pression de flèche répond tout de suite, puis le maintien prend le
  // relais : le deuxième écart part `STEER_HOLD_FIRST_DELAY` plus tard (le
  // délai de répétition), les suivants s'enchaînent à
  // `STEER_HOLD_LANE_INTERVAL` tant qu'une touche reste enfoncée. Renvoie vrai
  // quand la pression doit déclencher l'écart immédiat.
  const pressSteerKey = (key) => {
    const direction = STEER_KEY_DIRECTIONS[key];
    if (!direction) return false;
    // ← et Q (comme → et D) tiennent la même direction : la seconde touche ne
    // relance ni écart immédiat ni délai, le maintien est déjà en route.
    const directionHeld = [...steerKeysHeld.values()].includes(direction);
    // Réinsérer en dernier : `Map` garde l'ordre de pression, et c'est la
    // dernière touche pressée qui pilote le volant.
    steerKeysHeld.delete(key);
    steerKeysHeld.set(key, direction);
    steerHoldDirection = direction;
    if (directionHeld) return false;
    steerHoldCooldown = STEER_HOLD_FIRST_DELAY;
    return true;
  };
  const liftSteerKey = (key) => {
    if (!steerKeysHeld.has(key)) return;
    steerKeysHeld.delete(key);
    // La main revient à la dernière touche encore enfoncée : l'autre flèche, ou
    // un doublon de la même direction (Q relâché pendant que ← reste enfoncé) —
    // le maintien continue alors sans repartir de zéro. Plus aucune touche :
    // le volant se relâche, y compris au milieu d'un écart.
    steerHoldDirection = steerKeysHeld.size ? [...steerKeysHeld.values()].pop() : null;
  };
  const releaseSteerKeys = () => {
    steerKeysHeld.clear();
    steerHoldDirection = null;
    steerHoldCooldown = 0;
  };
  const cameraTarget = new THREE.Vector3().copy(CHASE_POSITION);
  const lookTarget = new THREE.Vector3().copy(CHASE_LOOK);
  const lookCurrent = new THREE.Vector3().copy(CHASE_LOOK);
  const scratch = new THREE.Vector3();

  const makeRacerRows = () => [
    {
      id: 'player',
      isPlayer: true,
      carId: playerProfile.id,
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
      maxHealth: playerMaxHealth,
      healthFlash: playerHealthFlash,
      wrecked: playerWrecked,
      // Niveau de recherche de la course : le HUD du classement s'y raccroche.
      wantedLevel,
    },
    ...activeRacers().map((racer) => ({
      id: racer.id,
      isPlayer: false,
      carId: racer.profile.id,
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
      maxHealth: racer.maxHealth || cityRushCarMaxHealth(racer.profile),
      healthFlash: racer.healthFlash,
      wrecked: racer.wrecked,
      // Recherche propre au rival : le classement affiche sa poursuite.
      wantedLevel: racer.wantedLevel || 0,
    })),
  ];

  function setupEncounter(row) {
    // Le parcours décide du nombre de voies : sur le Ring, les bonus
    // n'apparaissent que dans les deux voies de la piste.
    const encounter = sprint
      ? (row.index % CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL === 0
        ? createCityRushBoostEncounter(randomSeed, city)
        : { pickups: [] })
      // En course, un turbo tiré sur quatre n'est pas posé du tout (voir
      // `CITY_RUSH_BOOST_SPAWN_CHANCE`) : le cercle au sol doit rester une
      // aubaine. Le tutoriel les garde tous — chaque leçon doit croiser son
      // exemple, et la densité n'y est pas l'enjeu.
      : createCityRushEncounter(randomSeed, laneCount, tutorialMode ? 1 : CITY_RUSH_BOOST_SPAWN_CHANCE);
    // Course « pure » du mode Histoire : aucun chargeur rouge sur la route —
    // les emplacements deviennent des bonus turbo, et l’AK-47 reste muet.
    if (!storyWeaponsEnabled && Array.isArray(encounter.pickups)) {
      encounter.pickups = encounter.pickups.map((pickup) => (
        pickup?.type === CITY_RUSH_POWERS.PISTOL ? { ...pickup, type: CITY_RUSH_PICKUPS.BOOST } : pickup
      ));
    }
    // Les missions d'interception et d'affrontement garantissent des chargeurs
    // rouges à cadence lisible. Les rangées sont recyclées, mais leur index est
    // stable : une place de ravitaillement réapparaît donc à chaque boucle.
    if (!sprint && missionPistolPickupRowInterval > 0
      && row.index % missionPistolPickupRowInterval === 0) {
      encounter.pickups = [{ lane: playerStartLane, type: CITY_RUSH_POWERS.PISTOL }];
    }
    // Le parcours guidé garantit que les consignes importantes croisent bien
    // leur exemple réel : un chargeur rouge, un cercle vert au sol et des soins, tous
    // dans la voie de départ pour rester accessibles aux débutants.
    if (tutorialMode && !sprint) {
      const lessonPickup = row.trackDistance >= 360 && row.trackDistance < 420
        ? CITY_RUSH_POWERS.PISTOL
        : row.trackDistance >= 520 && row.trackDistance < 580
          ? CITY_RUSH_PICKUPS.BOOST
          : row.trackDistance >= 1270 && row.trackDistance < 1330
            ? CITY_RUSH_PICKUPS.HEALTH
            : null;
      if (lessonPickup) encounter.pickups = [{ lane: playerStartLane, type: lessonPickup }];
    }
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

  // La porte est ouverte dès que la course bat son plein : elle est posée à
  // mi-parcours et n'attend aucun tour, seule la Sprint la supprime.
  function miniGarageAvailable(garage) {
    if (!garage) return false;
    if (!(phase === 'playing' && !finished && !playerWrecked)) return false;
    return cityRushMiniGarageAvailable({ sprint });
  }

  function miniGaragesAvailable() {
    return miniGarages.some((garage) => miniGarageAvailable(garage));
  }

  // Porte la plus proche encore utilisable — sert au compteur du HUD, qui ne
  // s'allume que lorsqu'un garage approche vraiment.
  function nextMiniGarageGap() {
    let best = null;
    for (const garage of miniGarages) {
      if (garage.used || !miniGarageAvailable(garage)) continue;
      const gap = garage.trackDistance - distance;
      if (gap < -CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH) continue;
      if (best === null || gap < best) best = gap;
    }
    return best;
  }

  // Entrepôt de bazooka le plus proche encore à traverser — sert au compteur
  // du HUD. `null` quand les deux entrepôts de la course sont derrière (ou
  // déjà ramassés).
  function nextBazookaWarehouseGap() {
    let best = null;
    for (const warehouse of bazookaWarehouses) {
      if (warehouse.taken) continue;
      const gap = warehouse.trackDistance - distance;
      if (gap < -CITY_RUSH_BAZOOKA_PICKUP_HALF_LENGTH) continue;
      if (best === null || gap < best) best = gap;
    }
    return best === null ? null : Math.round(best);
  }

  function placeMiniGarage(garage) {
    if (!garage) return;
    garage.group.userData.trackDistance = garage.trackDistance;
    garage.group.userData.used = garage.used;
    if (garage.used || !miniGarageAvailable(garage)) {
      garage.group.visible = false;
      return;
    }
    const gap = garage.trackDistance - distance;
    garage.group.position.set(
      trackRelativeX(garage.trackDistance),
      trackRelativeY(garage.trackDistance),
      PLAYER_Z - gap * SCALE,
    );
    garage.group.rotation.set(trackPitch(garage.trackDistance), trackYaw(garage.trackDistance), 0);
    garage.group.visible = gap > -25 && gap * SCALE < theme.fogFar + 20;
  }

  // Chaque entrepôt est ancré à son repère (30 % puis 65 % de la course) dès
  // le départ : il n'attend plus le dernier tour, et le marqueur jaune disparaît
  // après la traversée tandis que le bâtiment reste en bord de route.
  function placeBazookaWarehouse(warehouse) {
    if (!warehouse) return;
    const group = warehouse.group;
    const warehouseTrackDistance = warehouse.trackDistance + BAZOOKA_PICKUP_LOCAL_Z / SCALE;
    group.userData.trackDistance = warehouseTrackDistance;
    const gap = warehouse.trackDistance - distance;
    const available = phase === 'playing' && !finished && !playerWrecked;
    group.position.set(
      trackRelativeX(warehouseTrackDistance),
      trackRelativeY(warehouseTrackDistance),
      PLAYER_Z - (warehouseTrackDistance - distance) * SCALE,
    );
    group.rotation.set(trackPitch(warehouseTrackDistance), trackYaw(warehouseTrackDistance), 0);
    group.visible = available && gap > -24 && gap * SCALE < theme.fogFar + 28;
    group.userData.pickup.visible = !warehouse.taken;
  }

  function collectBazookaWarehouse(warehouse) {
    if (!warehouse || warehouse.taken) return false;
    warehouse.taken = true;
    bazookaAmmo = CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP;
    // Un seul emplacement d'arme : la roquette ramassée remplace l'AK-47 ou
    // le pompe en main, munitions comprises — le bouton de tir (et la touche
    // Z) tire désormais la roquette, exactement comme un bonus rouge ou bleu
    // remplace l'arme précédente.
    inventory = cityRushEquipWeapon(inventory, CITY_RUSH_POWERS.PISTOL, 0);
    pistolHoldCooldown = 0;
    warehouse.group.userData.pickup.visible = false;
    // Le ramassage n'est définitivement consommé que lorsque les deux
    // entrepôts de la course ont été traversés.
    bazookaPickupTaken = bazookaWarehouses.every((item) => item.taken);
    score += 250;
    pickedUp += 1;
    audioRef?.current?.pickup?.('bazooka', { ready: true });
    getCallbacks().pickup?.({
      type: 'bazooka',
      ammo: bazookaAmmo,
      progress: bazookaAmmo,
      chargeCost: CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP,
      ready: true,
      newlyReady: true,
      autoActivated: false,
      lane: bazookaPickupLane,
      warehouse: warehouse.index,
    });
    getCallbacks().effect?.({ type: 'bazooka-pickup', ammo: bazookaAmmo, lane: bazookaPickupLane, warehouse: warehouse.index });
    emitHud(true);
    return true;
  }

  function updateBazookaWarehouses(previousDistance, dt = 0) {
    for (const warehouse of bazookaWarehouses) {
      placeBazookaWarehouse(warehouse);
      if (!warehouse.group.visible || warehouse.taken) continue;
      const { pickup, pickupRing, pickupHalo, pickupBeam, rocket } = warehouse.group.userData;
      pickup.rotation.y += Math.max(0, dt) * 0.65;
      rocket.rotation.z = Math.sin(clockTime * 1.8) * 0.05;
      pickupRing.rotation.z += Math.max(0, dt) * 0.82;
      pickupHalo.material.opacity = 0.28 + (Math.sin(clockTime * 3.2) + 1) * 0.14;
      pickupBeam.material.opacity = 0.2 + (Math.sin(clockTime * 4.1) + 1) * 0.18;
      if (cityRushBazookaPickupCanUse({
        previousDistance,
        nextDistance: distance,
        pickupDistance: warehouse.trackDistance,
        playerLane,
        pickupLane: bazookaPickupLane,
        used: warehouse.taken,
      })) {
        collectBazookaWarehouse(warehouse);
        placeBazookaWarehouse(warehouse);
      }
    }
  }

  function setMiniGaragesToStart() {
    miniGarages.forEach((garage, index) => {
      garage.trackDistance = miniGarageTrackDistances[index];
      garage.used = false;
      garage.group.userData.used = false;
      placeMiniGarage(garage);
    });
  }

  function useMiniGarage(garage) {
    const previousStars = wantedLevel;
    const healthBefore = playerHealth;
    playerHealth = cityRushMiniGarageRepair(playerHealth, playerMaxHealth);
    playerHealthFlash = 0;
    garage.used = true;
    // Leçon mini-garage : la traversée du portique valide la démonstration.
    noteTutorialAction('garage');
    policeDestroyedByPlayer = 0;
    wantedLevel = cityRushMiniGarageWantedLevel(previousStars);
    garage.group.userData.used = true;
    garage.group.visible = false;
    // À trois étoiles ou moins, le portique coupe entièrement la poursuite.
    // À quatre ou cinq, elle continue au niveau réduit (4 → 3, 5 → 4).
    const pursuersReleased = wantedLevel === 0
      ? releasePolicePursuit({ targetId: 'player' })
      : 0;
    const remaining = miniGarages.filter((item) => !item.used).length;
    const healthRestored = playerHealth - healthBefore;
    // Le passage à l'atelier s'entend : pont élévateur, clé à chocs, capot
    // qui claque, et l'accord de « réparée » quand la coque a repris des points.
    audioRef?.current?.garageRepair?.({ pan: vehiclePan('player'), restored: healthRestored });
    getCallbacks().effect?.({
      type: 'mini-garage-used',
      garage: garage.index,
      previousStars,
      stars: wantedLevel,
      remaining,
      lap,
      healthBefore,
      health: playerHealth,
      maxHealth: playerMaxHealth,
      healthRestored,
      pursuersReleased,
    });
    emitHud(true);
  }

  function updateMiniGarages(previousDistance) {
    for (const garage of miniGarages) {
      // Hors course (compte à rebours, épave, arrivée) ou en Sprint, la porte
      // reste ancrée à son repère et masquée : elle ne dérive pas vers les
      // tours suivants.
      if (!miniGarageAvailable(garage)) {
        placeMiniGarage(garage);
        continue;
      }
      const garageExitDistance = garage.trackDistance + CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH;
      // Entraînement guidé : le portique ne compte que pendant sa leçon. Sinon
      // la voiture le traverserait par hasard en pleine démonstration du turbo,
      // la poursuite tomberait et le mini-tuto du garage n'aurait plus rien à
      // franchir — l'escouade non plus, d'ailleurs.
      const garageLessonLive = !tutorialMode || tutorialLesson()?.id === 'garage';
      if (garageLessonLive && cityRushMiniGarageCanUse({
        previousDistance,
        nextDistance: distance,
        garageExitDistance,
        playerLane,
        garageLanes: garage.lanes,
        sprint,
        used: garage.used,
      })) {
        // La voiture sort du portique : les étoiles s'effacent, la coque est
        // réparée, la poursuite est abandonnée et le décor disparaît derrière
        // elle, une seule fois par garage.
        useMiniGarage(garage);
        continue;
      }
      // Leçon « Mini-garage » : le portique vient à hauteur de démonstration.
      // Sans cela, la voiture pouvait laisser la porte de mi-course derrière
      // elle avant la leçon et attendre la boucle suivante pour la franchir.
      if (tutorialMode && garageLessonLive && !garage.used && garage.trackDistance - distance > 320) {
        garage.trackDistance = distance + 170;
      }
      // Une porte ratée revient au même repère dans la boucle suivante. Dans
      // l'entraînement guidé, elle revient bien plus vite : la démonstration
      // attend son portique, pas 1 200 m de plus.
      const retryOffset = tutorialMode ? 200 : CITY_RUSH_LAP_LENGTH;
      while (!garage.used && garage.trackDistance + CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH <= distance) {
        garage.trackDistance += retryOffset;
      }
      placeMiniGarage(garage);
    }
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

  // ══════════════════════════════════════════════════════════════════════
  // ── L'entraînement joué par la voiture elle-même ───────────────────────
  // En mode tutoriel, le monde ne se contente plus d'afficher des fiches : il
  // **joue** les dix mini-tutos. La voiture se conduit toute seule (mêmes
  // capteurs que les rivaux : `chooseCityRushAiLane`), le coach installe devant
  // elle l'accessoire de la leçon, et chaque étape se termine quand son action
  // est réellement effectuée en piste — un saut, une esquive, un tour de
  // mini-garage. Le tic vert est alors publié (`tutorial` → `lesson-complete`),
  // la fiche suivante se lance, et ainsi de suite.
  //
  // La route reste vide de police jusqu'à la leçon des tirs : aucune berline
  // dans le trafic, aucune patrouille à croiser, aucune étoile — c'est
  // `releaseTutorialPolice()` qui fait entrer l'escouade, sur la leçon « AK-47 ».
  // ══════════════════════════════════════════════════════════════════════
  const tutorialSteps = CITY_RUSH_TUTORIAL_STEPS;
  const tutorialPoliceFromIndex = Math.max(0, tutorialSteps.findIndex((step) => step.id === CITY_RUSH_TUTORIAL_POLICE_FROM_ID));
  const tutorialStepSeconds = CITY_RUSH_TUTORIAL_STEP_DURATION_MS / 1000;
  const tutorialTickSeconds = CITY_RUSH_TUTORIAL_TICK_MS / 1000;
  // Leçons « à accessoire » : le coach pose et repose le bonus tant que la
  // démonstration n'a pas réussi son action.
  const tutorialPropActionByType = {
    [CITY_RUSH_POWERS.PISTOL]: 'shoot',
    [CITY_RUSH_POWERS.SHOTGUN]: 'shoot',
    [CITY_RUSH_PICKUPS.BOOST]: 'boost',
    [CITY_RUSH_PICKUPS.HEALTH]: 'health',
  };
  let tutorialLessonIndex = 0;
  let tutorialLessonElapsed = 0;
  let tutorialActionDone = false;
  let tutorialState = 'lesson'; // lesson | tick | done
  let tutorialTickLeft = 0;
  let tutorialComplete = false;
  let tutorialFinishLeft = 0;
  let tutorialPoliceReleased = false;
  let tutorialSteerCooldown = 0;
  let tutorialManualLeft = 0;
  let tutorialFireCooldown = 0;
  let tutorialAimSeen = false;
  let tutorialPoliceArmLeft = 0;
  let tutorialPropLeft = 0;
  let tutorialWatchdogLeft = 0;
  // Dernière action réellement réussie en piste (publiée dans le HUD) : c'est
  // la preuve, lisible de l'extérieur, que le tic vert vient bien de la piste.
  let tutorialLastAction = null;

  const tutorialLesson = () => tutorialSteps[Math.min(tutorialLessonIndex, tutorialSteps.length - 1)];

  /** La police est-elle en piste ? (hors tutoriel : toujours, comme avant) */
  const tutorialPoliceOn = () => !tutorialMode || tutorialPoliceReleased;

  /** Une berline tient-elle le pilote dans sa mire en ce moment ? */
  function tutorialAimOnPlayer() {
    return activePursuers().some((police) => police.aimTargetId === 'player' && police.aimLeft > 0);
  }

  /**
   * L'action demandée par la leçon vient d'être effectuée en piste. On la
   * verrouille : le tic vert tombera dès que la fiche aura été affichée le
   * temps minimal (`CITY_RUSH_TUTORIAL_STEP_DURATION_MS`).
   */
  function noteTutorialAction(action) {
    if (!tutorialMode || tutorialComplete || tutorialState !== 'lesson') return false;
    const lesson = tutorialLesson();
    if (!lesson || lesson.action !== action || tutorialActionDone) return false;
    tutorialActionDone = true;
    tutorialLastAction = action;
    return true;
  }

  /** Écart de voie de la voiture (pilote ou démonstration), avec ses traces. */
  function changePlayerLane(nextLane) {
    if (nextLane === playerLane || !canEnterLane('player', nextLane)) return false;
    playerLane = nextLane;
    // Changer de voie ne ralentit pas : la voiture glisse à pleine allure. Seul
    // le bonus de « ligne propre » retombe à zéro.
    playerCleanLineTime = 0;
    if (tutorialMode) {
      noteTutorialAction('steer');
      // Une esquive compte quand la mire rouge était déjà sur la voiture.
      if (tutorialAimSeen && tutorialAimOnPlayer()) noteTutorialAction('dodge');
    }
    return true;
  }

  /** La leçon des tirs : la police entre en piste et prend la voiture en chasse. */
  function releaseTutorialPolice() {
    if (!tutorialMode || tutorialPoliceReleased || sprint) return;
    tutorialPoliceReleased = true;
    deployPolice();
    emitHud(true);
  }

  /**
   * Une unité de la poursuite est mise à portée de mire pour la leçon « La
   * police » : sans munitions, personne ne peut viser — le coach charge donc
   * l'unité la plus proche, comme si elle venait de rafler un chargeur rouge.
   */
  function armTutorialPolice() {
    const pursuers = activePursuers();
    if (!pursuers.length) return false;
    if (pursuers.some((police) => isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL))) return true;
    const closest = pursuers.reduce((best, police) => (
      !best || Math.abs(police.distance - distance) < Math.abs(best.distance - distance) ? police : best
    ), null);
    if (!closest) return false;
    closest.inventory = addCityRushCharge(closest.inventory, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_PISTOL_AMMO_PER_PICKUP);
    return true;
  }

  /**
   * Le coach installe l'accessoire d'une leçon devant la voiture : il réutilise
   * la rangée de bonus la plus proche et la remplit du seul objet attendu. La
   * démonstration ne peut donc jamais rester sans chargeur rouge, sans éclair
   * vert ni sans trousse de soins — même si la police ou un respawn les a
   * raflés entre-temps.
   */
  function tutorialPlaceProp(type, lane = playerLane) {
    if (!tutorialMode || !rows.length) return false;
    const minGap = 48;
    const maxGap = 220;
    const already = rows.some((row) => (
      row.trackDistance > distance + minGap
      && row.trackDistance < distance + maxGap
      && row.pickups.some((pickup) => pickup && pickup.type === type && pickup.lane === lane)
    ));
    if (already) return true;
    const ahead = rows
      .filter((row) => row.trackDistance > distance + 20)
      .sort((a, b) => a.trackDistance - b.trackDistance);
    const target = ahead[0];
    if (!target) return false;
    target.trackDistance = distance + minGap + randomRange(6, 28);
    lastDistanceSlot = Math.max(lastDistanceSlot, target.trackDistance);
    target.pickups = [{ lane, type }];
    target.pickupClaims.clear();
    target.crossedRacers.clear();
    target.slots.forEach((slot, index) => {
      const pickup = target.pickups[index];
      if (!pickup) {
        slot.visible = false;
        return;
      }
      setPickupKind(slot, pickup.type, laneX(pickup.lane), shared);
    });
    return true;
  }

  /**
   * Leçon « La police » : le coach ramène la berline armée dans le sillage de
   * la voiture. L'escouade roule plus vite que la démonstration (12 % de plus,
   * c'est sa règle) : sans ce placement, elle passait devant et la mire — qui
   * ne se pose que sur une cible devant soi — ne se chargeait jamais.
   */
  function tutorialStagePoliceBehind() {
    const pursuers = activePursuers();
    if (!pursuers.length) return false;
    const armed = pursuers.find((police) => isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL)) || pursuers[0];
    if (!armed) return false;
    if (!isCityRushPowerCharged(armed.inventory, CITY_RUSH_POWERS.PISTOL)) {
      armed.inventory = addCityRushCharge(armed.inventory, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_PISTOL_AMMO_PER_PICKUP);
    }
    if (armed.lane !== playerLane) {
      armed.lane = playerLane;
      armed.currentX = laneX(armed.lane);
    }
    const gap = distance - armed.distance;
    if (gap < 13 || gap > 34) armed.distance = distance - (15 + randomRange(0, 9));
    return true;
  }

  /** L'entrepôt du bazooka doit attendre la démonstration devant la voiture. */
  function tutorialEnsureBazookaAhead() {
    if (!bazookaWarehouseEnabled || !bazookaWarehouses.length || bazookaAmmo > 0) return true;
    const ahead = bazookaWarehouses
      .filter((warehouse) => !warehouse.taken && warehouse.trackDistance > distance + 30)
      .sort((a, b) => a.trackDistance - b.trackDistance)[0];
    // L'entrepôt le plus proche est déjà à portée de démonstration : on n'y
    // touche pas. Au-delà, le coach le fait glisser à hauteur de leçon.
    if (ahead && ahead.trackDistance - distance <= 200) return true;
    const next = ahead || bazookaWarehouses.find((warehouse) => !warehouse.taken) || bazookaWarehouses[0];
    if (!next) return false;
    next.trackDistance = distance + 150;
    next.taken = false;
    next.group.userData.taken = false;
    placeBazookaWarehouse(next);
    return true;
  }

  /** Voie exigée par la leçon en cours, ou `null` si l'IA peut choisir. */
  function tutorialForcedLane() {
    const lesson = tutorialLesson();
    if (!lesson || tutorialState !== 'lesson') return null;
    // Leçon « La ligne propre » : la voie se tient. Tant que le bonus n'est pas
    // chargé, la démonstration garde sa voie — quitte à rester derrière un
    // véhicule lent, elle le double seulement si la voie se bouche franchement.
    if (lesson.action === 'clean-line' && playerCleanLineTime < CITY_RUSH_CLEAN_LINE_RAMP_DURATION) {
      const blocked = rollingTraffic().some((car) => (
        car.lane === playerLane && car.distance > distance && car.distance - distance < 42
      ));
      if (!blocked) return playerLane;
    }
    // Leçon « La police » : la démonstration vient se placer dans la voie de la
    // berline qui la suit, pour que la mire se pose sans attendre.
    if (lesson.id === 'police' && !tutorialAimSeen) {
      const pursuer = activePursuers()
        .filter((police) => police.distance < distance + 10 && police.distance > distance - 160)
        .sort((a, b) => Math.abs(a.distance - distance) - Math.abs(b.distance - distance))[0];
      if (pursuer) return pursuer.lane;
    }
    if (lesson.id === 'bazooka' && bazookaAmmo <= 0) {
      const warehouse = bazookaWarehouses.find((item) => !item.taken && item.trackDistance > distance + 20);
      if (warehouse && warehouse.trackDistance - distance < 320) return bazookaPickupLane;
    }
    if (lesson.id === 'garage') {
      const garage = miniGarages.find((item) => !item.used && item.trackDistance > distance + 20);
      if (garage && garage.trackDistance - distance < 280) {
        // La voie centrale la plus proche de la voiture : un écart à la fois.
        return garage.lanes.reduce((best, lane) => (
          Math.abs(lane - playerLane) < Math.abs(best - playerLane) ? lane : best
        ), garage.lanes[0]);
      }
    }
    if (lesson.id === 'ramp') {
      const ramp = ramps
        .filter((item) => item.trackDistance > distance + 10 && item.trackDistance - distance < 200)
        .sort((a, b) => a.trackDistance - b.trackDistance)[0];
      if (ramp) return ramp.lane;
    }
    if (lesson.prop) {
      const row = rows
        .filter((item) => item.trackDistance > distance + 18 && item.trackDistance - distance < 230)
        .sort((a, b) => a.trackDistance - b.trackDistance)
        .find((item) => item.pickups.some((pickup) => pickup && pickup.type === lesson.prop));
      if (row) {
        const pickup = row.pickups.find((item) => item && item.type === lesson.prop);
        if (pickup && pickup.lane !== playerLane) return pickup.lane;
      }
    }
    return null;
  }

  /** Voie la plus dégagée devant la voiture : la police peut s'y aligner. */
  function tutorialCalmLane() {
    const lookAhead = CITY_RUSH_AI_LOOKAHEAD;
    const threats = [
      ...rollingTraffic().map((traffic) => ({ lane: traffic.lane, distance: traffic.distance, speed: traffic.currentSpeed })),
      ...activePursuers().map((police) => ({ lane: police.lane, distance: police.distance, speed: police.currentSpeed })),
      ...oncomingCars.filter((car) => !car.rallied && !car.destroyed)
        .map((car) => ({ lane: car.lane, distance: car.distance, speed: -car.currentSpeed, oncoming: true })),
    ];
    const score = (lane) => threats.reduce((total, threat) => {
      if (threat.lane !== lane) return total;
      const gap = threat.distance - distance;
      if (!Number.isFinite(gap) || gap < 0 || gap > lookAhead) return total;
      return total + (1 - gap / lookAhead) * (threat.oncoming ? 2 : 1);
    }, 0);
    let best = playerLane;
    for (const lane of forwardLanes) {
      if (Math.abs(lane - playerLane) > 2) continue;
      const penalty = score(lane);
      const cost = Math.abs(lane - playerLane) * 0.12 + penalty;
      const bestCost = Math.abs(best - playerLane) * 0.12 + score(best);
      if (cost < bestCost - 1e-9) best = lane;
    }
    return best;
  }

  /**
   * Décision de voie de la démonstration : la contrainte de la leçon d'abord
   * (conteneur jaune, portique, rampe, accessoire), sinon l'IA de course
   * habituelle — trafic évité, bonus visés, cibles alignées.
   */
  /**
   * La leçon « Le tremplin » : le coach fait glisser le prochain tremplin juste
   * devant la voiture, dans sa voie. La démonstration ne peut donc pas rater son
   * saut, même quand le mobilier de la boucle l'aurait posé trois voies plus
   * loin — sans quoi la leçon attendrait son tremplin pendant que la course
   * d'entraînement défile.
   */
  function tutorialEnsureRampAhead() {
    if (!ramps.length) return false;
    const minGap = 62;
    const maxGap = 126;
    // Un tremplin est « déjà en place » tant qu'il est dans la fenêtre de la
    // leçon, contact compris : sans cette tolérance, le coach déplaçait le
    // tremplin à l'image même où la voiture allait décoller.
    const already = ramps.some((ramp) => (
      ramp.trackDistance > distance - 2
      && ramp.trackDistance < distance + maxGap
      && ramp.lane === playerLane
    ));
    if (already) return true;
    const target = ramps.slice().sort((a, b) => {
      const gapA = a.trackDistance - distance;
      const gapB = b.trackDistance - distance;
      return (gapA > 0 ? gapA : Infinity) - (gapB > 0 ? gapB : Infinity);
    })[0];
    if (!target) return false;
    target.trackDistance = distance + minGap + randomRange(4, 22);
    target.lane = playerLane;
    lastRampDistanceSlot = Math.max(lastRampDistanceSlot, target.trackDistance);
    return true;
  }

  function tutorialTargetLane() {
    const forced = tutorialForcedLane();
    if (forced !== null && forced !== undefined) return forced;
    const lesson = tutorialLesson();
    // Leçon « La police » : tant que la mire n'est pas là, la voiture tient la
    // voie la plus dégagée pour laisser une berline s'aligner derrière elle.
    if (lesson?.id === 'police' && !tutorialAimSeen) return tutorialCalmLane();
    const traffic = [
      ...rollingTraffic().map((car) => ({ lane: car.lane, distance: car.distance, speed: car.currentSpeed })),
      ...activePursuers().map((police) => ({ lane: police.lane, distance: police.distance, speed: police.currentSpeed })),
      ...oncomingCars.filter((car) => !car.rallied && !car.destroyed)
        .map((car) => ({ lane: car.lane, distance: car.distance, speed: -car.currentSpeed, oncoming: true })),
    ];
    const availableLanes = [playerLane];
    for (const lane of [playerLane - 1, playerLane + 1]) {
      if (lane >= 0 && lane < laneCount && canEnterLane('player', lane)) availableLanes.push(lane);
    }
    // L'autopilote de la démonstration sait qu'il est armé dès qu'une arme est
    // en main — AK-47 rouge ou fusil à pompe bleu.
    const weaponReady = Boolean(heldWeapon());
    const targets = activePursuers()
      .filter((police) => police.distance > distance + 2)
      .map((police) => ({ lane: police.lane, distance: police.distance }));
    return chooseCityRushAiLane({
      currentLane: playerLane,
      laneCount,
      oncomingLanes,
      distance,
      speed: currentSpeed,
      availableLanes,
      pickups: visiblePickups(inventory, playerHealth, playerMaxHealth),
      traffic,
      ramps: ramps.map((ramp) => ({ lane: ramp.lane, distance: ramp.trackDistance })),
      weaponReady,
      targets,
      chasing: false,
      lookAheadDistance: CITY_RUSH_AI_LOOKAHEAD,
      brakingRate: cityRushAiBrakingRate(playerProfile.accelerationRate),
    });
  }

  /**
   * Les armes de la démonstration : la rafale de la leçon AK-47, la roquette de
   * la leçon bazooka. Elle ne tire que lorsque la voie est intéressante (une
   * berline alignée) ou que la leçon le demande.
   */
  function tutorialWeapons(dt, lesson) {
    tutorialFireCooldown = Math.max(0, tutorialFireCooldown - dt);
    if (tutorialFireCooldown > 0 || playerStunLeft > 0 || playerWrecked || phase !== 'playing') return;
    // Leçon de tir : le coach tire avec l'arme en main — le pompe bleu
    // compris, s'il a été ramassé à la place du chargeur rouge, et la
    // roquette du conteneur jaune, qui occupe le même emplacement unique.
    if (lesson?.action === 'shoot') {
      const weapon = heldWeapon();
      if (weapon && (weapon.type === 'bazooka'
        ? useBazooka({ tutorialNote: 'shoot' })
        : usePower(weapon.type))) tutorialFireCooldown = 0.55;
      return;
    }
    if (lesson?.action === 'bazooka' && bazookaAmmo > 0) {
      if (useBazooka()) tutorialFireCooldown = 1.2;
    }
  }

  /** Le tic vert : la fiche suivante se lancera au bout du délai de lecture. */
  function completeTutorialLesson() {
    const lesson = tutorialLesson();
    tutorialState = 'tick';
    tutorialTickLeft = tutorialTickSeconds;
    tutorialActionDone = false;
    getCallbacks().tutorial?.({
      type: 'lesson-complete',
      index: tutorialLessonIndex,
      id: lesson?.id || null,
      label: lesson?.label || null,
      success: lesson?.success || null,
      total: tutorialSteps.length,
      elapsed,
    });
    emitHud(true);
  }

  /** Démarrage d'une leçon : accessoires posés, police éventuellement lâchée. */
  function startTutorialLesson(index) {
    tutorialLessonIndex = Math.max(0, Math.min(tutorialSteps.length - 1, index));
    tutorialLessonElapsed = 0;
    tutorialActionDone = false;
    tutorialState = 'lesson';
    tutorialAimSeen = false;
    tutorialPropLeft = 0;
    tutorialWatchdogLeft = CITY_RUSH_TUTORIAL_LESSON_TIMEOUT;
    tutorialLastAction = null;
    const lesson = tutorialLesson();
    if (tutorialLessonIndex >= tutorialPoliceFromIndex) releaseTutorialPolice();
    if (lesson?.id === 'police') {
      // La mire ne peut venir que d'une berline chargée : le coach l'arme.
      tutorialPoliceArmLeft = 0;
      armTutorialPolice();
    }
    getCallbacks().tutorial?.({
      type: 'lesson-start',
      index: tutorialLessonIndex,
      id: lesson?.id || null,
      label: lesson?.label || null,
      total: tutorialSteps.length,
      police: tutorialPoliceReleased,
      elapsed,
    });
    emitHud(true);
  }

  /**
   * Conditions de réussite que la démonstration ne peut pas signaler à la
   * source : la ligne propre tenue, la mire esquivée, la lecture de la dernière
   * fiche. Les autres actions (tir, ramassage, saut, garage) sont notées là où
   * elles se produisent.
   */
  function checkTutorialAction(lesson) {
    if (!lesson) return;
    if (lesson.action === 'clean-line' && playerCleanLineTime >= CITY_RUSH_CLEAN_LINE_RAMP_DURATION) {
      noteTutorialAction('clean-line');
      return;
    }
    // L'esquive, elle, est notée dans `changePlayerLane` : elle n'est valable
    // que si la mire rouge était déjà posée sur la voiture.
    if (lesson.action === 'debrief' && tutorialLessonElapsed >= tutorialStepSeconds) {
      noteTutorialAction('debrief');
    }
  }

  /**
   * Une image du tutoriel : pilotage automatique, accessoires de la leçon,
   * armes de démonstration, détection de la réussite — puis le tic vert et la
   * leçon suivante.
   */
  function updateTutorial(dt) {
    if (!tutorialMode || finished || phase !== 'playing') return;
    if (tutorialComplete) {
      tutorialFinishLeft = Math.max(0, tutorialFinishLeft - dt);
      // Le tour guidé se clôt sur la ligne : après le dixième tic vert, la
      // voiture termine sa boucle et la course s'achève sous le portique,
      // comme une vraie course — jamais au milieu de la route.
      if (tutorialFinishLeft <= 0 && distance >= effectiveDistance) finishRace({ tutorial: true });
      return;
    }
    tutorialSteerCooldown = Math.max(0, tutorialSteerCooldown - dt);
    tutorialManualLeft = Math.max(0, tutorialManualLeft - dt);
    tutorialPoliceArmLeft = Math.max(0, tutorialPoliceArmLeft - dt);
    const lesson = tutorialLesson();
    if (tutorialState === 'lesson') {
      tutorialLessonElapsed += dt;
      tutorialWatchdogLeft = Math.max(0, tutorialWatchdogLeft - dt);
      // ── Le pilotage automatique ───────────────────────────────────────
      // Le pilote garde la main : après une touche, la démonstration s'efface
      // quelques instants et le laisse conduire.
      if (tutorialManualLeft <= 0 && tutorialSteerCooldown <= 0 && playerStunLeft <= 0 && !playerWrecked) {
        const target = tutorialTargetLane();
        if (Number.isFinite(target) && target !== playerLane && canEnterLane('player', target)) {
          changePlayerLane(target);
          tutorialSteerCooldown = CITY_RUSH_TUTORIAL_STEER_INTERVAL;
        }
      }
      // ── Les accessoires de la leçon ───────────────────────────────────
      tutorialPropLeft = Math.max(0, tutorialPropLeft - dt);
      if (lesson?.prop && tutorialPropLeft <= 0) {
        tutorialPlaceProp(lesson.prop, playerLane);
        // Repose rapprochée : un écart de voie de la démonstration ne doit pas
        // coûter une dizaine de secondes d'attente avant l'accessoire suivant.
        tutorialPropLeft = 0.9;
      }
      if (lesson?.id === 'bazooka') tutorialEnsureBazookaAhead();
      if (lesson?.id === 'ramp') tutorialEnsureRampAhead();
      // ── Les armes de la leçon ─────────────────────────────────────────
      tutorialWeapons(dt, lesson);
      // ── La mire de la police, leçon « Poursuite » ─────────────────────
      if (lesson?.id === 'police') {
        if (!tutorialAimSeen && tutorialAimOnPlayer()) tutorialAimSeen = true;
        if (!tutorialAimSeen && tutorialPoliceArmLeft <= 0) {
          armTutorialPolice();
          tutorialPoliceArmLeft = 4;
        }
        if (!tutorialAimSeen) tutorialStagePoliceBehind();
        // La mire est là : la voiture se décale sur la voie voisine la plus
        // dégagée — l'esquive est notée par `changePlayerLane`.
        if (tutorialAimSeen && tutorialAimOnPlayer() && tutorialSteerCooldown <= 0 && tutorialManualLeft <= 0) {
          const escape = [playerLane - 1, playerLane + 1]
            .filter((lane) => lane >= 0 && lane < laneCount && canEnterLane('player', lane))
            .sort((a, b) => (
              Math.abs(laneX(a) - playerX) - Math.abs(laneX(b) - playerX)
            ))[0];
          if (escape !== undefined && changePlayerLane(escape)) tutorialSteerCooldown = CITY_RUSH_TUTORIAL_STEER_INTERVAL;
        }
      }
      checkTutorialAction(lesson);
      // ── Le tic vert ───────────────────────────────────────────────────
      const readEnough = tutorialLessonElapsed >= tutorialStepSeconds;
      const watchdog = tutorialWatchdogLeft <= 0;
      if ((tutorialActionDone && readEnough) || watchdog) {
        if (watchdog && !tutorialActionDone) tutorialActionDone = true;
        completeTutorialLesson();
      }
      return;
    }
    if (tutorialState === 'tick') {
      tutorialTickLeft = Math.max(0, tutorialTickLeft - dt);
      // Pendant le tic, la voiture continue de rouler (l'IA reprend la main).
      tutorialSteerCooldown = Math.max(0, tutorialSteerCooldown - dt);
      if (tutorialManualLeft <= 0 && tutorialSteerCooldown <= 0 && playerStunLeft <= 0 && !playerWrecked) {
        const target = tutorialTargetLane();
        if (Number.isFinite(target) && target !== playerLane && canEnterLane('player', target)) {
          changePlayerLane(target);
          tutorialSteerCooldown = CITY_RUSH_TUTORIAL_STEER_INTERVAL;
        }
      }
      if (tutorialTickLeft > 0) return;
      if (tutorialLessonIndex + 1 < tutorialSteps.length) {
        startTutorialLesson(tutorialLessonIndex + 1);
        return;
      }
      tutorialState = 'done';
      tutorialComplete = true;
      tutorialFinishLeft = 2.6;
      getCallbacks().tutorial?.({
        type: 'complete',
        total: tutorialSteps.length,
        elapsed,
        score,
      });
      emitHud(true);
    }
  }

  /** Le pilote a touché une commande : la démo lui laisse la main un instant. */
  function noteTutorialManualInput() {
    if (!tutorialMode) return;
    tutorialManualLeft = CITY_RUSH_TUTORIAL_MANUAL_GRACE;
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
      // L'entraînement guidé publie sa leçon courante : la page s'y raccroche
      // pour la fiche du coach, le tic vert et l'état « police en piste ».
      tutorial: tutorialMode ? {
        lessonIndex: tutorialLessonIndex,
        lessonId: tutorialLesson()?.id || null,
        lessonCount: tutorialSteps.length,
        actionDone: tutorialActionDone,
        lastAction: tutorialLastAction,
        complete: tutorialComplete,
        police: tutorialPoliceReleased,
      } : null,
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
        maxHealth: racer.maxHealth || cityRushCarMaxHealth(racer.profile),
        healthFlash: racer.healthFlash || 0,
        wrecked: Boolean(racer.wrecked),
        // Recherche propre à chaque pilote : celle de la course pour le joueur,
        // celle de son dossier pour un rival. `pursued` allume la pastille de
        // poursuite du classement.
        wanted: Math.max(0, Math.floor(Number(racer.wantedLevel) || 0)),
        pursued: racer.id !== 'player' && cityRushRivalPursued(racer.wantedLevel || 0),
      })),
      inventory: { ...inventory },
      // L'arme en main — AK-47 rouge, fusil à pompe bleu, bazooka jaune, ou
      // rien du tout — et son réarmement : le bouton de tir unique reste vide
      // tant qu'aucun bonus d'arme n'a été ramassé.
      weapon: heldWeapon(),
      weaponCooldown: Math.max(0, pistolHoldCooldown),
      bazookaAmmo,
      bazookaPickupTaken,
      bazookaPickupsTaken: bazookaWarehouses.filter((warehouse) => warehouse.taken).length,
      bazookaPickupsTotal: bazookaWarehouses.length,
      bazookaEnabled: bazookaWarehouseEnabled,
      // Distance du prochain entrepôt à traverser (30 % puis 65 % de la
      // course) ; `bazookaWarehouseGap` garde le même repère pour les
      // consommateurs historiques.
      bazookaNextDistance: bazookaWarehouseEnabled ? nextBazookaWarehouseGap() : null,
      bazookaWarehouseGap: bazookaWarehouseEnabled ? nextBazookaWarehouseGap() : null,
      playerLane,
      slowLeft: Math.max(playerSlowLeft, playerBlueShotSlowLeft),
      trafficImpactLeft: playerTrafficImpactLeft,
      boostLeft: playerBoostLeft,
      stunLeft: playerStunLeft,
      // Bonus de contresens : facteur de vitesse courant (1 → rien) et temps
      // déjà chargé dans les voies en sens inverse.
      oncomingBonus: cityRushOncomingBonusFactor(playerOncomingTime),
      oncomingBonusMax: CITY_RUSH_ONCOMING_BONUS_MAX,
      oncomingTime: playerOncomingTime,
      // La santé du joueur s'affiche dès le début effectif de la course.
      playerHealth: playerHealthActive ? playerHealth : null,
      playerHealthMax: playerMaxHealth,
      playerHealthActive,
      playerHealthFlash,
      score,
      pickups: pickedUp,
      pistolPickups: playerPistolPickups,
      shotsFired: playerShotsFired,
      vehicleContacts: playerVehicleContacts,
      policeDestroyed: policeDestroyedTotal,
      leader: standings.leader?.name || '—',
      wantedLevel,
      wantedMaxStars: CITY_RUSH_WANTED_MAX_STARS,
      miniGaragesActive: miniGarages.some((garage) => {
        const gap = garage.trackDistance - distance;
        return !garage.used && miniGarageAvailable(garage) && gap <= CITY_RUSH_MINI_GARAGE_HUD_RANGE;
      }),
      miniGaragesRemaining: miniGarages.filter((garage) => !garage.used).length,
      miniGaragesTotal: CITY_RUSH_MINI_GARAGE_COUNT,
      miniGarageNextDistance: nextMiniGarageGap(),
      oncomingPoliceTurnarounds: oncomingCars
        .filter((car) => isCityRushPoliceTrafficType(car.type) && car.turnaroundState === 'turning')
        .map((car) => ({
          id: car.id,
          progress: cityRushPoliceTurnaroundProgress(car.turnaroundElapsed),
          duration: CITY_RUSH_POLICE_TURNAROUND_DURATION,
          backup: Boolean(car.turnaroundAsBackup),
        })),
      // La herse des quatre étoiles : sa phase, sa distance devant le pilote et
      // les voies couvertes (le HUD et les vérifications s'y raccrochent).
      spikeBlock: spikeBlock.state === 'idle' ? null : {
        state: spikeBlock.state,
        gap: Math.round(spikeBlock.distance - distance),
        lanes: [...spikeBlock.lanes],
        covered: spikeBlock.lanes.includes(playerLane),
        slowLeft: playerSpikeSlowLeft,
        cooldown: Math.round(spikeBlock.cooldownLeft * 10) / 10,
      },
      // Les SUV de charge du contresens (voir `updateSuvCharges`).
      suvCharges: suvCharges.map((charge) => ({
        id: charge.id,
        state: charge.destroyed ? 'destroyed' : charge.chargeState,
        gap: Math.round(charge.distance - distance),
        lane: charge.lane,
        locked: Boolean(charge.chargeLocked),
        rallied: Boolean(charge.rallied),
        turnedAround: charge.turnaroundState === 'turning',
        reloadLeft: Math.round(charge.chargeReloadLeft * 10) / 10,
        destroyed: Boolean(charge.destroyed),
      })),
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
        turnedAround: police.origin === 'oncoming',
        wantedBackup: Boolean(police.wantedBackup),
        health: police.health,
        maxHealth: police.maxHealth || CITY_RUSH_POLICE_HEALTH,
        armed: { [CITY_RUSH_POWERS.PISTOL]: isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL) },
        distance: Math.round(police.distance),
        // Distance non arrondie : les vérifications de collision la comparent
        // aux `rawDistance` des pilotes.
        rawDistance: police.distance,
        lane: police.lane,
        x: police.currentX,
        isJumping: Boolean(police.jumpState?.active),
        jumpHeight: Number(police.currentJumpY) || 0,
        mode: police.mode,
        // Sonnée par un tir ou ralentie par un choc : la berline est hors jeu
        // quelques secondes — la page peut le montrer, les vérifications ne la
        // comptent pas comme décrochée.
        stunLeft: police.stunLeft,
        slowLeft: Math.max(police.slowLeft, police.trafficImpactLeft),
        // Barrage en cours : la page et la mini-carte peuvent le signaler.
        blocking: police.mode === 'blockade' && police.blockLeft > 0,
        // Mire en cours sur un pilote : progression de 0 (viseur froid) à 1
        // (rafale imminente). La page peut la montrer pour que le danger soit
        // lisible et l'esquive possible.
        aim: police.aimLeft > 0 ? clamp(police.aimLeft / CITY_RUSH_POLICE_AIM_TIME, 0, 1) : 0,
        aimTargetId: police.aimTargetId || null,
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
    releaseSteerKeys();
    clearVisualEffects();
    // Le tour guidé repart de sa première leçon ; les autres courses n'ont pas
    // d'état de tutoriel à remettre à zéro.
    tutorialLessonIndex = 0;
    tutorialLessonElapsed = 0;
    tutorialActionDone = false;
    tutorialState = 'lesson';
    tutorialTickLeft = 0;
    tutorialComplete = false;
    tutorialFinishLeft = 0;
    tutorialPoliceReleased = false;
    tutorialSteerCooldown = 0;
    tutorialManualLeft = 0;
    tutorialFireCooldown = 0;
    tutorialAimSeen = false;
    tutorialPoliceArmLeft = 0;
    tutorialPropLeft = 0;
    tutorialWatchdogLeft = CITY_RUSH_TUTORIAL_LESSON_TIMEOUT;
    tutorialLastAction = null;
    elapsed = 0;
    // Le pilote repart de sa place de grille : zéro en course libre, la dernière
    // rangée (distance négative, derrière la ligne) dans un tournoi.
    distance = playerGridDistance;
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
    trafficContacts.clear();
    sideBumpContacts.clear();
    playerBoostLeft = 0;
    playerStunLeft = 0;
    playerStunTotal = 0;
    playerSkidLeft = 0;
    playerSkidDuration = 0.85;
    playerSkidSide = 1;
    playerSuvImpactLeft = 0;
    playerSuvImpactSide = 1;
    playerSpikeSlowLeft = 0;
    playerCleanLineTime = 0;
    playerOncomingTime = 0;
    playerOncomingStage = 'none';
    score = 0;
    pickedUp = 0;
    playerPistolPickups = 0;
    inventory = createCityRushInventory();
    pistolHoldCooldown = 0;
    // Mission d'interception : le pilote part déjà armé. L'arme de départ passe
    // par l'emplacement unique, pour qu'aucune course ne commence avec deux
    // armes en main.
    if (!sprint && storyWeaponsEnabled && startingPistolAmmo > 0) {
      inventory = cityRushEquipWeapon(inventory, CITY_RUSH_POWERS.PISTOL, startingPistolAmmo);
    }
    bazookaAmmo = 0;
    bazookaPickupTaken = false;
    // Les deux entrepôts repartent à leur repère (30 % et 65 % de la course)
    // et leur marqueur jaune redevient visible.
    bazookaWarehouses.forEach((warehouse, index) => {
      warehouse.trackDistance = bazookaTrackDistances[index];
      warehouse.taken = false;
    });
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
    playerHealth = playerMaxHealth;
    playerHealthActive = false;
    playerHealthFlash = 0;
    playerCollisionCooldownLeft = 0;
    playerWrecked = false;
    playerWreckLeft = 0;
    storyBreakdownWarned = false;
    storyBreakdownActive = false;
    storyBreakdownLeft = 0;
    storyBreakdownSmokeTimer = 0;
    storyRankAtBreakdown = null;
    playerShotsFired = 0;
    playerHitsTaken = 0;
    playerVehicleContacts = 0;
    playerJumpState = { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0, overpassTriggered: false };
    playerLandingBounce = 0;
    playerDropShadow.visible = false;
    smoke.clear();
    playerCar.position.set(playerX, 0, PLAYER_Z);
    playerCar.rotation.set(0, 0, 0);
    resetCarAnimation(playerCar);
    racers.forEach((racer, index) => {
      // Retour à sa place de grille : les rivaux d'un tournoi repartent de leur
      // rangée, décalée derrière la ligne du pilote.
      racer.distance = Number.isFinite(Number(racer.startDistance)) ? Number(racer.startDistance) : 0;
      racer.lap = 1;
      racer.health = racer.maxHealth || cityRushCarMaxHealth(racer.profile);
      racer.healthFlash = 0;
      racer.raceActive = !racer.missionStaged;
      racer.wrecked = Boolean(racer.missionStaged);
      racer.finalLapAnnounced = false;
      // Nouvelle course, nouveau casier : aucun rival n'est recherché.
      racer.wantedLevel = 0;
      racer.currentSpeed = 0;
      racer.lane = Number.isFinite(Number(racer.startLane)) ? Number(racer.startLane) : defaultLanes[(index + 1) % defaultLanes.length];
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
      // Place de grille en z : un rival d'une rangée arrière se dessine derrière
      // le pilote, à l'écart de la ligne — le rendu suit la même règle que la
      // simulation (`PLAYER_Z − écart × SCALE`).
      racer.mesh.position.set(racer.currentX, 0, PLAYER_Z - (racer.distance - distance) * SCALE);
      racer.mesh.visible = racer.raceActive;
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
      traffic.health = isCityRushPoliceTrafficType(traffic.type) ? CITY_RUSH_POLICE_HEALTH : null;
      traffic.damageSmokeTimer = 0;
      animatePoliceDamageFire(traffic.mesh, 0, 0);
      traffic.distance = 82 + index * (sparseTraffic ? 180 : 68) + randomRange(-7, 7);
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
    lastTrafficDistanceSlot = trafficCars[trafficCars.length - 1].distance + randomRange(sparseTraffic ? 180 : 60, sparseTraffic ? 260 : 78);
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
      if (oncoming.charge) {
        // Les SUV de charge repartent dormants : ils n'apparaîtront qu'à cinq
        // étoiles, au loin devant la grille (voir `updateSuvCharges`).
        oncoming.chargeState = 'dormant';
        oncoming.chargeReloadLeft = 0;
        oncoming.chargeAnnounced = false;
        oncoming.chargeLocked = false;
        oncoming.baseSpeed = 0;
        oncoming.currentSpeed = 0;
        oncoming.health = cityRushPoliceMaxHealth(CITY_RUSH_SUV_CHARGE_TYPE);
        oncoming.maxHealth = oncoming.health;
        oncoming.mesh.visible = false;
        animatePoliceDamageFire(oncoming.mesh, 0, 0);
        oncoming.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
        oncoming.destroyed = false;
        oncoming.rallied = false;
        oncoming.turnaroundState = null;
        oncoming.turnaroundElapsed = 0;
        oncoming.turnaroundTargetId = null;
        oncoming.turnaroundAsBackup = false;
        oncoming.turnaroundTargetLane = null;
        return;
      }
      oncoming.health = isCityRushPoliceTrafficType(oncoming.type) ? CITY_RUSH_POLICE_HEALTH : null;
      oncoming.damageSmokeTimer = 0;
      animatePoliceDamageFire(oncoming.mesh, 0, 0);
      oncoming.destroyed = false;
      oncoming.rallied = false;
      oncoming.turnaroundState = null;
      oncoming.turnaroundElapsed = 0;
      oncoming.turnaroundTargetId = null;
      oncoming.turnaroundAsBackup = false;
      oncoming.turnaroundTargetLane = null;
      oncoming.mesh.visible = true;
      oncoming.mesh.position.set(oncoming.currentX + trackRelativeX(oncoming.distance), trackRelativeY(oncoming.distance), PLAYER_Z - oncoming.distance * SCALE);
      oncoming.mesh.rotation.set(-trackPitch(oncoming.distance), trackYaw(oncoming.distance) + Math.PI, 0);
      oncoming.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
      oncoming.mesh.userData.beacons.forEach((beacon) => { beacon.material.opacity = 1; });
    });
    // La herse de la course précédente est rangée : le dispositif sera remonté
    // au prochain passage à quatre étoiles.
    dismissSpikeBlock();
    // L'escouade et ses réserves repartent pour la prochaine course.
    policeDeployed = false;
    policePursuitDropped = false;
    // Les berlines lâchées en cours de route quittent la piste avec la course.
    clearPatrolPolice();
    wantedLevel = effectivePoliceFromStart ? CITY_RUSH_WANTED_MAX_STARS : 0;
    policeDestroyedByPlayer = 0;
    policeDestroyedTotal = 0;
    nextPoliceUnitNumber = policeCars.length + 1;
    policeReinforcementTimer = 0;
    policeReinforcementQueue.length = 0;
    policeRetaliationByAttacker.clear();
    policeStealNoticeCooldown = 0;
    policeBlockNoticeCooldown = 0;
    policeAimNoticeCooldown = 0;
    // Les carcasses en feu de la course précédente partent avec elle.
    clearPoliceWrecks();
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
      police.skidSide = 1;
      police.skidSmokeTimer = 0;
      police.powerCooldown = 0;
      police.health = cityRushPoliceMaxHealth(police.vehicleType);
      police.healthFlash = 0;
      police.damageSmokeTimer = 0;
      animatePoliceDamageFire(police.mesh, 0, 0);
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
    setMiniGaragesToStart();
    startLine.setLights(0);
    startLine.setFinalLap(false);
    startLine.setBoard(`TOUR 1/${effectiveLaps}`, lapBoardSubtitle(1));
    syncSprintCheckpointDisplay();
    placeTrack();
    bazookaWarehouses.forEach(placeBazookaWarehouse);
    // Le tour guidé repart de sa première fiche. La démonstration, elle,
    // attend le compte à rebours : `active` n'est levé qu'au départ réel.
    if (tutorialMode) startTutorialLesson(0);
    emitHud(true);
  }

  /**
   * Fait surgir le deuxième fugitif de la Mission 1. Il n'est ni classé, ni
   * ciblable avant ce moment ; la destruction du dealer le place devant
   * l'intercepteur, dans sa propre voie, avec sa coque intacte.
   */
  function activateMissionEscapeRacer(triggerRacer = null) {
    if (!missionEscapeTargetId) return null;
    const escapeRacer = racers.find((racer) => racer.id === missionEscapeTargetId);
    if (!escapeRacer || escapeRacer.raceActive !== false) return escapeRacer || null;
    const triggerDistance = Number.isFinite(Number(triggerRacer?.distance))
      ? Number(triggerRacer.distance)
      : distance;
    escapeRacer.raceActive = true;
    escapeRacer.wrecked = false;
    escapeRacer.health = escapeRacer.maxHealth || cityRushCarMaxHealth(escapeRacer.profile);
    escapeRacer.healthFlash = 0;
    escapeRacer.distance = Math.min(
      Math.max(0, effectiveDistance - 1),
      Math.max(distance, triggerDistance) + missionEscapeStartLead,
    );
    escapeRacer.lap = cityRushLapForDistance(escapeRacer.distance, CITY_RUSH_LAP_LENGTH, effectiveLaps);
    escapeRacer.lane = Number.isFinite(Number(escapeRacer.startLane))
      ? Number(escapeRacer.startLane)
      : forwardLanes[forwardLanes.length - 1];
    escapeRacer.currentX = laneX(escapeRacer.lane);
    escapeRacer.currentSpeed = Math.max(playerCurrentSpeed, escapeRacer.baseSpeed * 0.88);
    escapeRacer.changeIn = 0.18;
    escapeRacer.slowLeft = 0;
    escapeRacer.blueShotSlowLeft = 0;
    escapeRacer.trafficRecoverLeft = 0;
    escapeRacer.trafficImpactLeft = 0;
    escapeRacer.boostLeft = 0;
    escapeRacer.stunLeft = 0;
    escapeRacer.stunTotal = 0;
    escapeRacer.spinLeft = 0;
    escapeRacer.spinTotal = 0;
    escapeRacer.skidLeft = 0;
    escapeRacer.jumpState = { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0 };
    escapeRacer.currentJumpY = 0;
    escapeRacer.currentJumpPitch = 0;
    escapeRacer.mesh.position.set(
      escapeRacer.currentX + trackRelativeX(escapeRacer.distance),
      trackRelativeY(escapeRacer.distance),
      PLAYER_Z - (escapeRacer.distance - distance) * SCALE,
    );
    escapeRacer.mesh.rotation.set(trackPitch(escapeRacer.distance), trackYaw(escapeRacer.distance), 0);
    escapeRacer.mesh.visible = true;
    getCallbacks().effect?.({
      type: 'mission-escape-start',
      triggerId: triggerRacer?.id || missionEscapeTriggerId,
      targetId: escapeRacer.id,
      target: escapeRacer.name,
      health: escapeRacer.health,
      maxHealth: escapeRacer.maxHealth,
      lead: Math.round(escapeRacer.distance - distance),
      lane: escapeRacer.lane,
    });
    emitHud(true);
    return escapeRacer;
  }

  // Ennemis que le projectile droit peut croiser : rivaux, pilote, berlines.
  // Le tir rouge n'est pas guidé — cette liste sert au balayage en vol et à
  // l'IA, qui ne dépense sa charge que s'il y a déjà quelqu'un sur la voie.
  // Elle dépend du tireur : la police ne se vise pas elle-même, les pilotes
  // visent tout le monde (voir la note plus bas).
  function laneShotCandidates(attackerId = 'player') {
    const policeAttacker = Boolean(activePursuerById(attackerId));
    return [
      ...(attackerId === 'player' ? [] : [getRaceVehicleState('player')]),
      ...racers.filter((racer) => racer.id !== attackerId).map((racer) => getRaceVehicleState(racer.id)),
      // Une berline ne tire jamais sur ses collègues : la police n'entre dans
      // les cibles que des pilotes. Sans cette exclusion, l'escouade vidait son
      // chargeur dans le pare-chocs de la berline qui la précédait — elle
      // roule en file devant le leader — et le joueur ne perdait jamais un
      // carré sous les rafales.
      ...(policeAttacker ? [] : activePursuers().filter((police) => police.id !== attackerId).map((police) => getRaceVehicleState(police.id))),
      ...(attackerId === 'player'
        ? [...trafficCars, ...oncomingCars]
          .filter((traffic) => !traffic.rallied && !traffic.destroyed)
          .map((traffic) => getRaceVehicleState(traffic.id))
        : policeAttacker ? [] : [...trafficCars, ...oncomingCars]
          .filter((traffic) => isCityRushPoliceTrafficType(traffic.type) && !traffic.rallied && !traffic.destroyed)
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

  function bazookaPoliceCandidates({ includeHidden = false } = {}) {
    const vehicles = [
      ...activePursuers(),
      ...trafficCars.filter((car) => isCityRushPoliceTrafficType(car.type) && !car.rallied && !car.destroyed),
      ...oncomingCars.filter((car) => isCityRushPoliceTrafficType(car.type) && !car.rallied && !car.destroyed),
    ];
    const seen = new Set();
    return vehicles
      .filter((vehicle) => {
        if (!vehicle?.id || seen.has(vehicle.id)) return false;
        seen.add(vehicle.id);
        return true;
      })
      .map((vehicle) => getRaceVehicleState(vehicle.id))
      .filter((vehicle) => vehicle?.isPolice && vehicle.racer && (includeHidden || vehicle.visible !== false));
  }

  function firstPoliceOnLane(attackerId = 'player') {
    const attacker = getRaceVehicleState(attackerId);
    if (!attacker) return null;
    return cityRushBazookaTarget({
      attackerDistance: attacker.distance,
      attackerLane: attacker.lane,
      police: bazookaPoliceCandidates(),
      maxDistance: CITY_RUSH_BLUE_SHOT_MAX_RANGE,
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
    // `x` est la position latérale réelle : elle sert à la mire de la police
    // (`cityRushPoliceAimAligned`), pas seulement au choix de voie.
    if (vehicleId === 'player') {
      return playerWrecked ? null : { id: 'player', name: 'TOI', distance, lane: playerLane, x: playerCar.position.x, mesh: playerCar, racer: null };
    }
    const racer = racers.find((item) => item.id === vehicleId);
    if (racer) {
      return racer.raceActive === false || racer.wrecked || racer.health <= 0 ? null : {
        id: racer.id, name: racer.name, distance: racer.distance, lane: racer.lane, x: racer.currentX, mesh: racer.mesh, racer,
      };
    }
    const police = activePursuerById(vehicleId);
    // Une berline détruite n'est plus un état de course : les tirs en vol
    // continuent tout droit à travers l'emplacement de l'épave.
    if (police && police.health > 0) {
      return { id: police.id, name: police.name, distance: police.distance, lane: police.lane, x: police.currentX, mesh: police.mesh, visible: police.mesh.visible, racer: police, isPolice: true };
    }
    const trafficVehicle = [...trafficCars, ...oncomingCars].find((item) => item.id === vehicleId);
    if (trafficVehicle && !trafficVehicle.rallied && !trafficVehicle.destroyed
      && (!isCityRushPoliceTrafficType(trafficVehicle.type) || (trafficVehicle.health ?? CITY_RUSH_POLICE_HEALTH) > 0)) {
      const isPolice = isCityRushPoliceTrafficType(trafficVehicle.type);
      return {
        id: trafficVehicle.id,
        name: trafficVehicle.name || (isPolice ? 'POLICE ROUTIÈRE' : 'TRAFIC'),
        distance: trafficVehicle.distance,
        lane: trafficVehicle.lane,
        x: trafficVehicle.currentX,
        mesh: trafficVehicle.mesh,
        visible: trafficVehicle.mesh.visible,
        racer: trafficVehicle,
        isPolice,
        isTrafficPolice: isPolice,
        isTaxi: trafficVehicle.type === 'taxi',
        isCivilianTraffic: !isPolice,
      };
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
      // L'escouade, les berlines rappelées et le trafic entier sont ciblables
      // par le joueur ; les IA ne verrouillent que les pilotes et la police.
      ...activePursuers().filter((police) => police.id !== attackerId).map((police) => getRaceVehicleState(police.id)),
      ...(attackerId === 'player'
        ? [...trafficCars, ...oncomingCars]
          .filter((traffic) => !traffic.rallied && !traffic.destroyed)
          .map((traffic) => getRaceVehicleState(traffic.id))
        : []),
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
    if (!source || (!rule && type !== 'bazooka')) return;
    const color = type === 'bazooka' ? 0xffd21f : Number.parseInt(rule.color.slice(1), 16);
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
    pickupBurstColor.set(pickupColor(type, '#ffffff'));
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
    // La herse n'est pas une voiture : ses étincelles se jouent sur le tapis de
    // la première voie couverte, à la ligne du dispositif.
    if (vehicleId === SPIKE_BLOCK_ID) return spikeBlock.meshes?.laneGroups?.[0] || null;
    return trafficCars.find((item) => item.id === vehicleId)?.mesh
      || oncomingCars.find((item) => item.id === vehicleId)?.mesh
      || activePursuerById(vehicleId)?.mesh
      // Une berline lâchée peut aussi être poussée de côté (`trySideBump`) :
      // ses étincelles se jouent sur sa carrosserie.
      || patrolCars.find((item) => item.id === vehicleId)?.mesh
      || null;
  }

  function spawnTrafficImpact(racerId, trafficId, intensity = 1) {
    const racer = getVehicleMesh(racerId);
    const traffic = getImpactMesh(trafficId);
    if (!racer || !traffic || !trafficImpacts.length) return;
    const effect = trafficImpacts.find((candidate) => !candidate.userData.active)
      || trafficImpacts[(trafficImpactCursor += 1) % trafficImpacts.length];
    const data = effect.userData;
    data.active = true;
    data.age = 0;
    data.intensity = clamp(Number(intensity) || 1, 0.8, 2.2);
    data.racerId = racerId;
    data.trafficId = trafficId;
    data.flashMaterial.opacity = 1;
    data.ringMaterial.opacity = 0.9;
    data.sparkMaterial.opacity = 1;
    data.flash.scale.setScalar(0.42 * data.intensity);
    data.ring.scale.setScalar(0.28 * data.intensity);
    data.sparks.forEach((spark) => {
      spark.visible = true;
      spark.scale.set(1, 1, 0.55 * data.intensity);
    });
    effect.visible = true;
    effect.position.lerpVectors(racer.position, traffic.position, 0.5);
    effect.position.y = 0;
  }

  // Pluie d'étincelles au point de contact : le SUV est assez lourd pour
  // arracher quelques gerbes orange en plus du flash et de l'onde de choc.
  function spawnPoliceSuvCollisionSparks(police) {
    if (!police?.mesh) return;
    scratch.copy(playerCar.position).lerp(police.mesh.position, 0.5);
    scratch.y = Math.max(0.35, scratch.y + 0.35);
    for (let spark = 0; spark < 9; spark += 1) {
      const angle = (spark / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      const reach = 2.4 + Math.random() * 2.8;
      smoke.emit(scratch, {
        color: spark % 3 === 0 ? 0xffe07a : 0xff8a2a,
        opacity: 0.94,
        scale: 0.16 + Math.random() * 0.08,
        grow: 1.2,
        life: 0.34 + Math.random() * 0.12,
        velocity: [Math.cos(angle) * reach, 1.8 + Math.random() * 2.4, Math.sin(angle) * reach],
      });
    }
  }

  function updateTrafficImpact(effect, dt) {
    const data = effect.userData;
    if (!data.active) return;
    data.age += dt;
    const progress = clamp(data.age / CITY_RUSH_TRAFFIC_IMPACT_DURATION, 0, 1);
    const intensity = clamp(Number(data.intensity) || 1, 0.8, 2.2);
    const racer = getVehicleMesh(data.racerId);
    const traffic = getImpactMesh(data.trafficId);
    if (racer && traffic) effect.position.lerpVectors(racer.position, traffic.position, 0.5);
    effect.position.y = 0;

    const flashLife = clamp(data.age / 0.14, 0, 1);
    data.flash.scale.setScalar((0.42 + flashLife * 0.85) * intensity);
    data.flashMaterial.opacity = (1 - flashLife) * 0.95;
    const ringLife = smoothstep(progress);
    data.ring.scale.setScalar((0.28 + ringLife * 2.35) * intensity);
    data.ringMaterial.opacity = (1 - progress) * 0.82;
    data.sparkMaterial.opacity = (1 - progress) * 0.95;
    data.sparks.forEach((spark) => {
      const angle = spark.userData.angle;
      const reach = (0.42 + smoothstep(clamp(data.age / 0.62, 0, 1)) * 1.45) * intensity;
      spark.position.set(Math.cos(angle) * reach, 0.55 + Math.sin(angle * 1.7) * spark.userData.lift * reach, Math.sin(angle) * reach);
      spark.rotation.set(data.age * 9, angle + data.age * 4, data.age * 7);
      spark.scale.set(1, 1, Math.max(0.2, 1 - progress * 0.7) * intensity);
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

  function makeBazookaTracer() {
    const group = new THREE.Group();
    group.name = 'city-rush-bazooka-projectile';
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x343a43, toneMapped: false });
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xffd21f, toneMapped: false });
    const finMaterial = new THREE.MeshBasicMaterial({ color: 0xffa91f, toneMapped: false });
    const flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff7a1f, transparent: true, opacity: 0.92, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const burstMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdf69, transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const core = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.82, 8), bodyMaterial);
    tube.rotation.x = -Math.PI / 2;
    core.add(tube);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 8), noseMaterial);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.57;
    core.add(nose);
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.065, 0.29), finMaterial);
      fin.position.set(side * 0.18, 0, 0.34);
      core.add(fin);
    }
    const trail = new THREE.Group();
    const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.05, 8), flameMaterial);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.z = 0.78;
    trail.add(exhaust);
    const hotCore = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 7), noseMaterial);
    hotCore.rotation.x = Math.PI / 2;
    hotCore.position.z = 0.72;
    trail.add(hotCore);
    const burst = new THREE.Group();
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), burstMaterial);
    burst.add(flash);
    burst.visible = false;
    group.add(core, trail, burst);
    group.userData = { core, trail, burst, burstMaterial };
    return group;
  }

  function fireStraightShot(attackerId, target, kind = CITY_RUSH_POWERS.BLUE_SHOT) {
    const attacker = getRaceVehicleState(attackerId);
    if (!attacker) return false;
    const muzzleOffset = 1.12;
    const isPistol = kind === CITY_RUSH_POWERS.PISTOL;
    const isShotgun = kind === CITY_RUSH_POWERS.SHOTGUN;
    const isWeapon = isPistol || isShotgun;
    const isBazooka = kind === 'bazooka';
    // Les deux armes et le bazooka tirent toujours vers l'avant. Le tir bleu
    // peut encore inverser le sens lorsqu'il riposte à une voiture dépassée.
    const direction = isWeapon || isBazooka
      ? 1
      : (Number.isFinite(Number(target?.distance)) && Number(target.distance) < attacker.distance ? -1 : 1);
    const startTrackDistance = attacker.distance + (direction * muzzleOffset) / SCALE;
    const mesh = isBazooka
      ? makeBazookaTracer()
      : isShotgun
        // Une giclée bleue, plus large et plus lente qu'une balle rouge.
        ? makeBulletTracer({ coreColor: 0xdcefff, trailColor: 0x4da3ff, burstColor: 0xa9d6ff })
        : isPistol
          ? makeBulletTracer({ coreColor: 0xffe08a, trailColor: 0xff526e, burstColor: 0xff9aa8 })
          : makeBulletTracer({ coreColor: 0xe7faff, trailColor: 0x48b9ff, burstColor: 0x9be5ff });
    mesh.rotation.y = direction > 0 ? 0 : Math.PI;
    // Le pompe crache plus gros : la gerbe se voit de loin.
    if (isShotgun) mesh.scale.set(1.5, 1.5, 1.5);
    scene.add(mesh);
    const shotSpeed = isBazooka ? CITY_RUSH_BAZOOKA_PROJECTILE_SPEED : CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED;
    straightShots.push({
      mesh,
      attackerId,
      kind,
      bazooka: isBazooka,
      unguided: isWeapon || isBazooka,
      targetId: isWeapon ? null : (target?.id || null),
      lane: attacker.lane,
      x: laneX(attacker.lane),
      direction,
      speed: shotSpeed,
      startTrackDistance,
      previousTrackDistance: startTrackDistance,
      trackDistance: startTrackDistance,
      maxTrackDistance: startTrackDistance + direction * CITY_RUSH_BLUE_SHOT_MAX_RANGE,
      previousTargetDistance: isWeapon || !Number.isFinite(Number(target?.distance)) ? null : Number(target.distance),
      age: 0,
      phase: 'flight',
      hitPoint: new THREE.Vector3(),
    });
    if (isShotgun) audioRef?.current?.shotgun({ pan: vehiclePan(attackerId) });
    else if (isPistol) audioRef?.current?.machineGun({ pan: vehiclePan(attackerId) });
    else if (isBazooka) audioRef?.current?.missileLaunch?.({ pan: vehiclePan(attackerId) });
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
    // Une cartouche de pompe s'annonce à part : six carrés d'un coup, ce n'est
    // pas le grignotage d'une balle rouge.
    const hitType = cityRushIsWeaponType(source)
      ? (source === CITY_RUSH_POWERS.SHOTGUN ? 'shotgun' : 'pistol')
      : 'blue-shot-hit';
    getCallbacks().effect?.({
      type: hitType,
      target: racer.name,
      targetId: racer.id,
      attacker: getRaceVehicleState(attackerId)?.name || null,
      source,
      damage: lost,
      health: racer.health,
      maxHealth: racer.maxHealth || cityRushCarMaxHealth(racer.profile),
      critical: racer.health <= CITY_RUSH_PLAYER_HEALTH_CRITICAL,
      ...extra,
    });
    if (racer.health <= 0 && !racer.wrecked) {
      racer.wrecked = true;
      racer.stunLeft = CITY_RUSH_WRECK_SECONDS;
      racer.stunTotal = CITY_RUSH_WRECK_SECONDS;
      racer.boostLeft = 0;
      // La police renonce à un adversaire à terre : le dossier se referme
      // (plus de pastille de poursuite au classement) et ses poursuivants —
      // l'unité réservée comme la berline du trafic rappelée par un carambolage
      // — reprennent une conduite normale au lieu de tourner autour d'une épave.
      if (racer.wantedLevel > 0) {
        racer.wantedLevel = 0;
        releasePolicePursuit({ targetId: racer.id });
      }
      getCallbacks().effect?.({ type: 'racer-wrecked', target: racer.name, targetId: racer.id, attackerId, health: 0 });
      if (racer.id === missionEscapeTriggerId) activateMissionEscapeRacer(racer);
    }
    emitHud(true);
    return lost;
  }

  /**
   * Impact d'une arme à feu : AK-47 rouge ou fusil à pompe bleu. La source
   * voyage jusqu'aux barèmes (`CITY_RUSH_POLICE_DAMAGE`, `CITY_RUSH_PLAYER_DAMAGE`)
   * — une balle rouge retire un carré, une cartouche de pompe en retire six —
   * et ni l'une ni l'autre ne fait déraper la voiture touchée.
   */
  function applyWeaponHit(target, attackerId, kind = CITY_RUSH_POWERS.PISTOL) {
    const attacker = getRaceVehicleState(attackerId);
    if (attackerId === 'player' && target.id !== 'player' && !target.isPolice) {
      raiseWantedLevel({ reason: 'vehicle-hit' });
    }
    if (target.id === 'player') {
      cameraKick = Math.max(cameraKick, kind === CITY_RUSH_POWERS.SHOTGUN ? 0.3 : 0.12);
      damagePlayer(kind, attackerId);
      getCallbacks().effect?.({
        type: kind === CITY_RUSH_POWERS.SHOTGUN ? 'shotgun-hit-player' : 'pistol-hit-player',
        attacker: attacker?.name || 'RIVAL',
        health: playerHealth,
        maxHealth: playerMaxHealth,
      });
    } else if (target.isPolice) {
      // Police marquée ou banalisée : un tir réussi monte à trois étoiles ;
      // les destructions font ensuite passer à quatre puis cinq.
      damagePolice(target.racer, kind, attackerId);
    } else if (target.isCivilianTraffic) {
      // Une voiture civile touchée déclenche la recherche, sans barre de vie.
    } else if (target.racer) {
      damageRacer(target.racer, kind, attackerId);
    }
  }

  function applyStraightShotHit(target, attackerId, kind = CITY_RUSH_POWERS.BLUE_SHOT) {
    if (cityRushIsWeaponType(kind)) {
      applyWeaponHit(target, attackerId, kind);
      return;
    }
    if (attackerId === 'player' && target.id !== 'player' && !target.isPolice) {
      raiseWantedLevel({ reason: 'vehicle-hit' });
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
    } else if (target.isCivilianTraffic) {
      // La touche civile compte pour le niveau de recherche, sans dégâts de course.
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
  // Trois tirs droits bleus, six tirs rouges ou six carambolages en accélérant
  // détruisent la berline : le tir rouge ne retire jamais qu’un seul carré,
  // comme contre un adversaire. Sa barre segmentée descend à chaque dégât,
  // puis elle part en tête-à-queue sur deux tours en ralentissant, explose à la
  // fin de sa glissade, et laisse sa carcasse calcinée en feu sur la piste
  // (`beginPoliceWreck`, `updatePoliceWrecks`). Elle sort dès la coque percée de
  // la course comme de la mini-carte. Aucun missile.
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

  function spawnPoliceExplosion(worldPosition, pan = 0, { sound = true } = {}) {
    const mesh = makeImpact(shared);
    poseExplosion(mesh, worldPosition);
    if (sound) audioRef?.current?.explosion({ pan });
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
    if (byPlayer) policeDestroyedTotal += 1;
    // Le panoramique du boum se calcule avant la sortie de piste.
    const pan = vehiclePan(police.id);
    // L'escouade sort de la chasse ; la berline rappelée est ôtée de la liste.
    police.active = false;
    const ralliedIndex = ralliedCars.indexOf(police);
    if (ralliedIndex >= 0) ralliedCars.splice(ralliedIndex, 1);
    let associatedVehicle = null;
    if (police.rallied) {
      // L'épave ne reprend pas sa ronde : halo et barre de vie disparaissent
      // avec elle, qu'elle vienne du trafic parallèle ou du contresens.
      detachPoliceGlow(police.mesh);
      detachPoliceHealthBar(police.mesh);
      associatedVehicle = police.origin === 'oncoming'
        ? oncomingCars.find((car) => car.id === police.originId)
        : trafficCars.find((car) => car.id === police.originId);
      if (associatedVehicle) {
        associatedVehicle.rallied = false;
        associatedVehicle.destroyed = true;
        associatedVehicle.turnaroundState = 'destroyed';
      }
    }
    // Le maillage reste affiché : la berline part en tête-à-queue avant
    // d'exploser (`beginPoliceWreck`), ce n'est qu'ensuite qu'elle s'efface au
    // profit de sa carcasse calcinée.
    const civilianTrafficPolice = trafficCars.find((traffic) => traffic === police);
    const civilianOncomingPolice = oncomingCars.find((traffic) => traffic === police);
    if (civilianTrafficPolice) civilianTrafficPolice.destroyed = true;
    if (civilianOncomingPolice) {
      civilianOncomingPolice.destroyed = true;
      civilianOncomingPolice.turnaroundState = 'destroyed';
    }
    // Une unité détruite n'est remplacée que si le quota de poursuite du joueur
    // n'est plus rempli ; cela évite d'empiler une relève sur les renforts.
    const needsReplacement = activePlayerPursuerSlots() + policeReinforcementQueue.length < requiredPlayerPursuerSlots();
    const reinforcementScheduled = Boolean(police.squad && needsReplacement && !playerWrecked
      && queuePoliceReinforcement(police));
    // Une unité réservée à un rival se relève tant que le dossier du rival
    // reste ouvert : un rival recherché n'échappe pas à la police parce qu'une
    // berline a brûlé sur un tremplin. La relève est demandée par
    // `registerPoliceRetaliation`, qui repasse à chaque contact — et à chaque
    // image du dernier tour si le rival mène la course (`chaseLastLapLeader`).
    if (!police.squad && police.reserveForId
      && policeRetaliationByAttacker.get(police.reserveForId) === police) {
      police.reinforcementAt = elapsed + CITY_RUSH_POLICE_REINFORCEMENT_DELAY;
    }
    // Tête-à-queue de deux tours en ralentissant, explosion à la fin de la
    // glissade, puis carcasse calcinée laissée en piste, en feu. L'explosion
    // (et son boum) arrive donc au terme du tête-à-queue, pas ici.
    beginPoliceWreck(police, { pan, byPlayer });
    if (byPlayer) {
      score += CITY_RUSH_POLICE_DESTROY_SCORE;
      cameraKick = Math.max(cameraKick, 0.42);
      raiseWantedLevel({ police: true, destroyed: true, reason: 'police-destroyed' });
    }
    getCallbacks().effect?.({
      type: 'police-destroyed',
      vehicleType: police.vehicleType || police.type || 'police',
      id: police.id,
      police: police.name,
      trafficPolice: Boolean(police.rallied || civilianTrafficPolice || civilianOncomingPolice),
      health: police.health,
      maxHealth: police.maxHealth || CITY_RUSH_POLICE_HEALTH,
      source,
      byPlayer,
      // L'agonie est annoncée avec l'explosion : deux tours de tête-à-queue en
      // ralentissant, puis une carcasse qui brûle sur la piste.
      spinTurns: CITY_RUSH_POLICE_WRECK_SPIN_TURNS,
      spinSeconds: CITY_RUSH_POLICE_WRECK_SPIN_SECONDS,
      wreckBurning: true,
      // Auteur du dernier dégât : la page peut le nommer, et les vérifications
      // s'assurent qu'aucune berline n'est détruite par une autre berline.
      attackerId: attackerId || null,
      policeDestroyedByPlayer,
      wantedLevel,
      reinforcementScheduled,
      lap,
    });
    emitHud(true);
    // La dernière berline explose : la sirène s'éteint avec elle.
    if (!activePursuers().length) audioRef?.current?.policeSirenOff?.();
  }

  // ── Carcasses en feu des berlines détruites ───────────────────────────────
  // Une berline dont la coque a cédé ne s'évapore pas : elle part en
  // tête-à-queue sur deux tours complets en perdant toute sa vitesse, explose à
  // la fin de sa glissade, puis sa **carcasse calcinée reste en piste, en feu**,
  // jusqu'à ce que le pilote l'ait dépassée. Chaque carcasse est ancrée sur la
  // piste (`wreck.distance`) : elle suit le défilement du décor comme le trafic.
  const policeWrecks = [];
  const policeWreckHusks = [];
  const wreckScratch = new THREE.Vector3();
  let policeWreckKit = null;

  // Une carcasse libérée est réutilisée : la tôle noircie et les flammes sont
  // les mêmes d'une berline à l'autre, seul le modèle (berline/SUV/civil) varie.
  function acquirePoliceWreckHusk(vehicleType) {
    const reusable = policeWreckHusks.find((husk) => !husk.userData.taken && husk.userData.trafficType === vehicleType);
    if (reusable) return reusable;
    if (!policeWreckKit) policeWreckKit = createPoliceWreckKit();
    const husk = makePoliceWreckHusk(vehicleType, policeWreckKit);
    scene.add(husk);
    policeWreckHusks.push(husk);
    return husk;
  }

  function releasePoliceWreck(wreck) {
    const index = policeWrecks.indexOf(wreck);
    if (index >= 0) policeWrecks.splice(index, 1);
    if (wreck.husk) {
      wreck.husk.userData.taken = false;
      wreck.husk.visible = false;
    }
    // La berline du tête-à-queue rend son maillage au parc — sauf si l'unité a
    // déjà repris la piste entre-temps (une relève peut arriver à 3,6 s).
    if (wreck.mesh && policeWreckMeshFree(wreck)) wreck.mesh.visible = false;
    if (wreck.police) wreck.police.wreckPending = false;
  }

  function clearPoliceWrecks() {
    for (let index = policeWrecks.length - 1; index >= 0; index -= 1) releasePoliceWreck(policeWrecks[index]);
    policeWrecks.length = 0;
  }

  // Piste → monde : le même calcul que le trafic, la carcasse en moins du
  // mouvement (elle ne bouge plus après l'explosion).
  function wreckWorldPosition(wreck, target) {
    return target.set(
      wreck.x + trackRelativeX(wreck.distance),
      trackRelativeY(wreck.distance),
      PLAYER_Z - (wreck.distance - distance) * SCALE,
    );
  }

  // La coque vient de céder : la berline part en tête-à-queue. Elle garde son
  // maillage — c'est elle qui tourne sur elle-même — pendant que sa vitesse
  // fond sur `CITY_RUSH_POLICE_WRECK_SPIN_SECONDS`.
  // Le maillage d'une berline en agonie appartient à son tête-à-queue tant que
  // la carcasse n'a pas pris le relais. Une berline d'escouade porte `active`
  // (sa relève la réactive), une berline rappelée du trafic n'en a pas : dans
  // les deux cas, `active !== true` signifie « libre ».
  function policeWreckMeshFree(wreck) {
    return !wreck?.police || wreck.police.active !== true;
  }

  function beginPoliceWreck(police, { pan = 0, byPlayer = false } = {}) {
    const startSpeed = Math.max(0, Number(police.currentSpeed) || 0);
    const wreck = {
      id: police.id,
      name: police.name,
      byPlayer,
      police,
      mesh: police.mesh,
      husk: null,
      distance: police.distance,
      x: police.currentX,
      startSpeed,
      speed: startSpeed,
      spinLeft: CITY_RUSH_POLICE_WRECK_SPIN_SECONDS,
      spinTotal: CITY_RUSH_POLICE_WRECK_SPIN_SECONDS,
      exploded: false,
      burnElapsed: 0,
      smokeTimer: 0,
      pan,
    };
    // La poursuite s'éteint avec la coque : plus de halo ni de barre de vie
    // au-dessus d'une berline qui agonise (le maillage, lui, retourne au parc).
    const healthBar = police.mesh.userData.healthBar;
    if (healthBar) {
      healthBar.bar.visible = false;
      healthBar.flash.material.opacity = 0;
    }
    const pursuit = police.mesh.userData.pursuit;
    if (pursuit) pursuit.glowMaterial.opacity = 0;
    // À la coque percée, les petits feux de dégâts deviennent un embrasement
    // complet qui accompagne la berline pendant son tête-à-queue.
    animatePoliceDamageFire(police.mesh, 1, clockTime);
    police.mesh.visible = true;
    // Réservée : sa relève ne peut pas reprendre le maillage avant
    // l'explosion, sinon la berline disparaîtrait en plein tête-à-queue.
    police.wreckPending = true;
    policeWrecks.push(wreck);
    // Garde-fou de scène : au-delà du plafond, la carcasse la plus ancienne —
    // donc la plus loin derrière le pilote — s'efface.
    while (policeWrecks.length > CITY_RUSH_POLICE_WRECK_MAX) releasePoliceWreck(policeWrecks[0]);
    return wreck;
  }

  // Fin du tête-à-queue : la berline explose et sa carcasse calcinée prend sa
  // place, au même endroit et dans le même sens. C'est elle qui reste visible,
  // en feu, jusqu'à sortir du cadre.
  function explodePoliceWreck(wreck, { sound = true } = {}) {
    if (!wreck || wreck.exploded) return;
    wreck.exploded = true;
    wreck.spinLeft = 0;
    wreck.speed = 0;
    wreck.burnElapsed = 0;
    const worldPosition = wreckWorldPosition(wreck, wreckScratch);
    if (wreck.mesh) animatePoliceDamageFire(wreck.mesh, 0, clockTime);
    if (wreck.mesh && policeWreckMeshFree(wreck)) wreck.mesh.visible = false;
    // Le maillage retourne au parc : la relève de l'escouade, retenue pendant
    // le tête-à-queue, peut maintenant reprendre la piste.
    if (wreck.police) {
      wreck.police.wreckPending = false;
      if (wreck.police.squad) queuePoliceReinforcement(wreck.police);
    }
    const husk = acquirePoliceWreckHusk(wreck.police?.vehicleType || 'police');
    husk.userData.taken = true;
    husk.position.copy(worldPosition);
    husk.rotation.set(trackPitch(wreck.distance), trackYaw(wreck.distance), 0);
    husk.visible = true;
    animatePoliceWreckHusk(husk, 1, clockTime);
    wreck.husk = husk;
    spawnPoliceExplosion(worldPosition, wreck.pan, { sound });
  }

  function spawnBazookaImpact(worldPosition, pan = 0, { trackDistance = distance, trackX = 0 } = {}) {
    const mesh = makeImpact(shared, { bazooka: true });
    mesh.userData.bazooka = true;
    mesh.userData.trackDistance = Number(trackDistance);
    mesh.userData.trackX = Number(trackX) || 0;
    poseExplosion(mesh, worldPosition);
    audioRef?.current?.explosion?.({ pan });
    cameraKick = Math.max(cameraKick, reduceMotion ? 0.35 : 1.45);
    for (let puff = 0; puff < 12; puff += 1) {
      const angle = Math.random() * Math.PI * 2;
      const reach = 2.8 + Math.random() * BAZOOKA_EXPLOSION_RADIUS;
      smoke.emit(worldPosition, {
        color: puff % 3 === 0 ? 0xffb036 : 0x37333c,
        opacity: puff % 3 === 0 ? 0.86 : 0.56,
        scale: 0.6 + Math.random() * 0.55,
        grow: 2.5,
        life: 0.95 + Math.random() * 0.35,
        velocity: [Math.cos(angle) * reach, 1.6 + Math.random() * 2.2, Math.sin(angle) * reach],
      });
    }
  }

  function applyBazookaImpact(target, attackerId = 'player') {
    if (attackerId !== 'player' || !target?.isPolice || !target.racer) return false;
    const centerDistance = Number(target.distance);
    const centerX = Number.isFinite(Number(target.x)) ? Number(target.x) : laneX(target.lane);
    // Le groupe d'explosion est ancré au niveau de la chaussée : le flash et
    // le panache montent depuis ce point, tandis que la trace noire reste posée
    // sur le goudron (elle ne flotte pas à la hauteur du centre de la voiture).
    const blastPosition = target.mesh.position.clone();
    const blastPan = vehiclePan(target.id);
    const victims = bazookaPoliceCandidates({ includeHidden: true }).filter((candidate) => cityRushBazookaBlastContains({
      centerDistance,
      centerX,
      vehicleDistance: candidate.distance,
      vehicleX: Number.isFinite(Number(candidate.x)) ? Number(candidate.x) : laneX(candidate.lane),
      radiusCells: CITY_RUSH_BAZOOKA_BLAST_CELLS,
    }));
    if (!victims.some((candidate) => candidate.id === target.id)) victims.unshift(target);

    const destroyed = [];
    for (const candidate of victims) {
      const police = candidate.racer;
      if (!police || police.destroyed || police.health <= 0) continue;
      if (police.active === false && !trafficCars.includes(police) && !oncomingCars.includes(police)) continue;
      destroyPolice(police, 'bazooka', attackerId);
      const wreck = policeWrecks.find((item) => item.police === police && !item.exploded);
      if (wreck) explodePoliceWreck(wreck, { sound: false });
      destroyed.push(candidate.id);
    }

    spawnBazookaImpact(blastPosition, blastPan, { trackDistance: centerDistance, trackX: centerX });
    getCallbacks().effect?.({
      type: 'bazooka-impact',
      targetId: target.id,
      radiusCells: CITY_RUSH_BAZOOKA_BLAST_CELLS,
      destroyed,
      count: destroyed.length,
    });
    return destroyed.length > 0;
  }

  // Le drapeau à damier n'interrompt pas une agonie : une berline encore en
  // tête-à-queue explose sur-le-champ — son boum est donc toujours joué — et sa
  // carcasse continue de brûler pendant le tour d'honneur.
  function flushPoliceWrecks() {
    [...policeWrecks].forEach((wreck) => { if (!wreck.exploded) explodePoliceWreck(wreck); });
  }

  // Tête-à-queue puis carcasse en feu. Appelé à chaque image, y compris hors
  // course, pour que la carcasse suive le défilement de la piste et brûle
  // encore à l'arrivée.
  function updatePoliceWrecks(dt) {
    if (!policeWrecks.length) return;
    for (let index = policeWrecks.length - 1; index >= 0; index -= 1) {
      const wreck = policeWrecks[index];
      wreck.smokeTimer = Math.max(0, wreck.smokeTimer - dt);
      if (!wreck.exploded) {
        // Deux tours sur elle-même (`cityRushStunSpin`) pendant que la vitesse
        // fond (`cityRushPoliceWreckSpeed`) : gomme, fumée et gyrophare compris.
        wreck.spinLeft = Math.max(0, wreck.spinLeft - dt);
        wreck.speed = cityRushPoliceWreckSpeed(wreck.startSpeed, wreck.spinLeft, wreck.spinTotal);
        wreck.distance += wreck.speed * dt;
        const mesh = wreck.mesh;
        if (mesh) {
          const spinGap = wreck.distance - distance;
          mesh.visible = policeWreckMeshFree(wreck)
            && spinGap > -CITY_RUSH_POLICE_WRECK_VIEW_BEHIND && spinGap < 150;
          wreckWorldPosition(wreck, mesh.position);
          mesh.rotation.set(
            trackPitch(wreck.distance),
            trackYaw(wreck.distance) + cityRushStunSpin(wreck.spinLeft, wreck.spinTotal, CITY_RUSH_POLICE_WRECK_SPIN_TURNS),
            0,
          );
          mesh.userData.wheels?.forEach((wheel) => { wheel.rotation.x += wreck.speed * dt * 0.95; });
          mesh.userData.beacons?.forEach((beacon, beaconIndex) => {
            beacon.material.opacity = Math.floor(clockTime * 9 + beaconIndex) % 2 === 0 ? 1 : 0.16;
          });
          animatePoliceDamageFire(mesh, 1, clockTime);
          if (mesh.visible && wreck.speed > 0.6 && wreck.smokeTimer <= 0) {
            smoke.emit(mesh.position, {
              color: 0x3a3a44, opacity: 0.5, scale: 0.52, grow: 2.3, life: 0.85,
              velocity: [(Math.random() - 0.5) * 1.8, 1.1 + Math.random() * 0.5, (Math.random() - 0.5) * 1.8],
            });
            // Panache noir épais du capot pendant le tête-à-queue, juste
            // avant l'explosion.
            policeHoodScratch.set(0, 1.1, -1.3);
            mesh.localToWorld(policeHoodScratch);
            smoke.emit(policeHoodScratch, {
              color: 0x1f1f25, opacity: 0.72, scale: 0.6, grow: 3.0, life: 1.3,
              velocity: [(Math.random() - 0.5) * 0.8, 2.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8],
            });
            wreck.smokeTimer = 0.06;
          }
        }
        if (policeWreckMeshFree(wreck) && wreck.spinLeft > 0) continue;
        explodePoliceWreck(wreck);
        wreck.smokeTimer = 0;
      }
      // Carcasse en feu : immobile sur la piste. Elle est dessinée tant
      // qu'elle est dans le cadre (même fenêtre que le trafic derrière le
      // rétro) et brûle `CITY_RUSH_POLICE_WRECK_BURN_SECONDS`, flamme pleine
      // puis braises, avant de quitter la scène — le pilote est loin.
      const husk = wreck.husk;
      if (!husk) {
        releasePoliceWreck(wreck);
        continue;
      }
      const gap = wreck.distance - distance;
      wreck.burnElapsed += dt;
      wreckWorldPosition(wreck, husk.position);
      husk.visible = gap > -CITY_RUSH_POLICE_WRECK_VIEW_BEHIND && gap < 150;
      const intensity = cityRushPoliceWreckFlame(wreck.burnElapsed, CITY_RUSH_POLICE_WRECK_BURN_SECONDS);
      animatePoliceWreckHusk(husk, intensity, clockTime);
      if (wreck.burnElapsed >= CITY_RUSH_POLICE_WRECK_BURN_SECONDS) {
        releasePoliceWreck(wreck);
        continue;
      }
      // Fumée noire et braises : l'incendie se voit avant la carcasse. Rien ne
      // sert d'en cracher quand la carcasse est hors cadre.
      if (husk.visible && wreck.smokeTimer <= 0) {
        smoke.emit(husk.position, {
          color: 0x2c2c34, opacity: 0.2 + 0.42 * intensity, scale: 0.62, grow: 2.6, life: 1.25,
          velocity: [(Math.random() - 0.5) * 0.9, 1.5 + Math.random() * 0.9, (Math.random() - 0.5) * 0.9],
        });
        if (Math.random() < 0.5 * intensity) {
          smoke.emit(husk.position, {
            color: 0xff8a3a, opacity: 0.8, scale: 0.3, grow: 2.0, life: 0.5,
            velocity: [(Math.random() - 0.5) * 2.2, 2.2 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2],
          });
        }
        wreck.smokeTimer = 0.075;
      }
    }
  }

  function damagePolice(police, source, attackerId, extra = null) {
    if (!police || police.destroyed) return;
    const hasHealth = police.health !== null && Number.isFinite(Number(police.health));
    if (hasHealth && Number(police.health) <= 0) return;
    const healthBeforeHit = hasHealth ? Number(police.health) : CITY_RUSH_POLICE_HEALTH;
    // Tirer sur une patrouille monte à trois étoiles ; la détruire ajoute
    // ensuite une étoile (la deuxième destruction atteint cinq). Un simple
    // contact reste lui aussi à trois étoiles. Une patrouille venant en face
    // se retourne pour rejoindre la poursuite.
    if (attackerId === 'player') {
      const oncoming = oncomingCars.find((vehicle) => vehicle === police);
      if (oncoming) beginOncomingPoliceTurnaround(oncoming, { asBackup: false, targetId: 'player' });
      const isShot = source !== 'collision';
      raiseWantedLevel({ police: true, reason: isShot ? 'police-shot' : 'police-contact' });
    }
    // Chaque rival reçoit son unité réservée dès son premier tir réussi — ou
    // son premier carambolage — sur une voiture de police, même si ce tir
    // détruit sa cible. Le motif distingue le tir du carambolage.
    if (attackerId && attackerId !== 'player') {
      registerPoliceRetaliation(attackerId, source, {
        reason: source === 'collision' ? 'police-contact' : 'police-shot',
      });
    }
    police.health = cityRushPoliceDamage(healthBeforeHit, source);
    const maxHealth = Number(police.maxHealth)
      || cityRushPoliceMaxHealth(police.vehicleType || police.type)
      || CITY_RUSH_POLICE_HEALTH;
    animatePoliceDamageFire(police.mesh, 1 - clamp(police.health / maxHealth, 0, 1), clockTime);
    if (police.health <= 0) {
      destroyPolice(police, source, attackerId);
      return;
    }
    police.healthFlash = 0.28;
    // Le tir rouge retire un seul carré, sans dérapage ni ralentissement.
    // Le bleu garde son petit coup de raquette ; le carambolage, lui, déclenche
    // la glissade et le changement de voie dans `startPoliceCollisionAnimation`.
    if (source === CITY_RUSH_POWERS.BLUE_SHOT) {
      police.skidDuration = Math.max(0.4, Number(police.skidLeft) || 0);
      police.skidLeft = police.skidDuration;
      police.skidSide = Math.random() < 0.5 ? -1 : 1;
      police.skidSmokeTimer = 0;
    }
    // Une berline touchée mais encore debout se raconte au pilote qui l'a
    // atteinte : un tir bleu enlève deux points, un tir rouge comme un
    // carambolage à pleine allure un seul — la mitrailleuse n'emporte jamais
    // plus d'un carré, contre une berline comme contre une voiture de course.
    // Un carambolage coûte un carré au pilote (deux contre un SUV) : `extra` porte ce que sa
    // coque a encaissé (voir `applyPoliceCollision`).
    if (attackerId === 'player') {
      getCallbacks().effect?.({
        type: 'police-hit',
        vehicleType: police.vehicleType || police.type || 'police',
        // Identifiant de la berline touchée : plusieurs patrouilles portent le
        // même nom, et les vérifications suivent leur barre voiture par voiture.
        id: police.id,
        police: police.name,
        health: police.health,
        maxHealth: police.maxHealth || CITY_RUSH_POLICE_HEALTH,
        damage: healthBeforeHit - police.health,
        source,
        remaining: cityRushPoliceShotsLeft(police.health, source),
        ...(extra || {}),
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
            shot.startTrackDistance + paced(shot.speed || CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED) * shot.age,
          )
          : Math.max(
            shot.maxTrackDistance,
            shot.startTrackDistance - paced(CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED) * shot.age,
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
          targets: shot.bazooka
            ? bazookaPoliceCandidates()
            : shot.unguided
              ? laneShotCandidates(shot.attackerId)
              : activePursuers()
                .filter((police) => police.id !== shot.attackerId && police.id !== target?.id)
                .map((police) => getRaceVehicleState(police.id))
                .filter(Boolean),
        });
        const hitBySweep = Boolean(swept)
          && (shot.bazooka
            || shot.unguided
            || !crossedTarget
            || Math.abs(Number(swept.distance) - previousProjectileDistance)
              <= Math.abs(Number(target.distance) - previousProjectileDistance));
        const bazookaProximityHit = !swept && shot.bazooka && !target
          ? activePursuers()
            .map((police) => getRaceVehicleState(police.id))
            .filter((candidate) => candidate
              && Number(candidate.distance) > fromDistance
              && Number(candidate.distance) <= toDistance
              && cityRushBazookaBlastContains({
                centerDistance: candidate.distance,
                centerX: shot.x,
                vehicleDistance: candidate.distance,
                vehicleX: Number.isFinite(Number(candidate.x)) ? Number(candidate.x) : laneX(candidate.lane),
                radiusCells: CITY_RUSH_BAZOOKA_BLAST_CELLS,
              }))
            .sort((a, b) => Number(a.distance) - Number(b.distance))[0] || null
          : null;
        const resolveImpact = (hitTarget) => {
          if (shot.bazooka) applyBazookaImpact(hitTarget, shot.attackerId);
          else applyStraightShotHit(hitTarget, shot.attackerId, shot.kind);
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
        } else if (bazookaProximityHit) {
          resolveImpact(bazookaProximityHit);
        } else if (shot.bazooka && crossedTarget && target) {
          resolveImpact(target);
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
          const shotHeight = shot.bazooka ? 1.1 : 0.82;
          shot.mesh.position.set(shot.x + trackRelativeX(shot.trackDistance), shotHeight + trackRelativeY(shot.trackDistance), PLAYER_Z - (shot.trackDistance - distance) * SCALE);
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
      if (explosion.userData.bazooka && Number.isFinite(explosion.userData.trackDistance)) {
        const trackDistance = explosion.userData.trackDistance;
        explosion.position.set(
          explosion.userData.trackX + trackRelativeX(trackDistance),
          trackRelativeY(trackDistance),
          PLAYER_Z - (trackDistance - distance) * SCALE,
        );
        explosion.rotation.set(trackPitch(trackDistance), trackYaw(trackDistance), 0);
      }
      explosion.userData.age += dt;
      animateExplosion(explosion, explosion.userData.age, explosion.userData.bazooka
        ? { radius: BAZOOKA_EXPLOSION_RADIUS, scale: 2.05, bazooka: true }
        : {});
      const lifetime = explosion.userData.bazooka ? BAZOOKA_SCORCH_SECONDS : 0.62;
      if (explosion.userData.age > lifetime) {
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

  /**
   * Tir du pilote : **l'arme en main**, AK-47 rouge ou fusil à pompe bleu.
   * Les deux partagent le même bouton et la même touche — le bouton reste sans
   * effet tant qu'aucun bonus d'arme n'a été ramassé (chargeurs vides).
   */
  function usePower(type) {
    if (sprint || !active || finished || !storyWeaponsEnabled || !cityRushIsWeaponType(type)) return false;
    const consumed = consumeCityRushCharge(inventory, type);
    if (!consumed.consumed) {
      getCallbacks().effect?.({ type: 'empty', item: type });
      return false;
    }
    inventory = consumed.inventory;
    playerShotsFired += 1;
    spawnActionPulse('player', type);
    // Tout droit, sans viser : le projectile part même si la voie est vide.
    fireStraightShot('player', null, type);
    // Leçon AK-47 : c'est le tir lui-même qui valide la démonstration.
    noteTutorialAction('shoot');
    emitHud(true);
    return true;
  }

  /**
   * L'arme en main, ou `null` quand le pilote n'a encore rien ramassé.
   * Le bazooka occupe le même emplacement unique que l'AK-47 et le pompe :
   * traverser un conteneur jaune vide les chargeurs rouges ou bleus, et
   * ramasser un bonus rouge ou bleu vide la roquette — une seule arme en main.
   */
  function heldWeapon() {
    if (bazookaAmmo > 0) {
      return Object.freeze({ type: 'bazooka', ammo: bazookaAmmo, max: CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP });
    }
    return cityRushActiveWeapon(inventory);
  }

  /**
   * Le bouton de tir — tactile ou touche Z — arme l'arme en main et respecte
   * sa cadence : une cartouche toutes les 1,5 s pour le fusil à pompe, ce que
   * ni un martèlement du doigt ni un nouveau maintien ne peut forcer. Sans
   * arme ramassée, le bouton reste sans effet.
   */
  function fireHeldWeapon({ hold = true } = {}) {
    // `hold` : le geste est un maintien (doigt posé, touche enfoncée) — la
    // boucle de rendu enchaîne alors les tirs. Un simple coup n'arme pas le
    // maintien, sinon un clavier viderait le chargeur d'un seul appui.
    if (hold) pistolKeyHeld = true;
    const weapon = heldWeapon();
    if (!weapon || pistolHoldCooldown > 0) return false;
    // Le bazooka se tire avec le même bouton que l'AK-47 et le pompe : tant
    // qu'une roquette est en main, c'est elle qui part.
    const fired = weapon.type === 'bazooka' ? useBazooka() : usePower(weapon.type);
    if (fired) pistolHoldCooldown = weaponFireInterval(weapon.type);
    return fired;
  }

  function useBazooka({ tutorialNote = 'bazooka' } = {}) {
    if (sprint || !active || finished || !storyWeaponsEnabled || !bazookaWarehouseEnabled || bazookaAmmo <= 0) return false;
    const target = firstPoliceOnLane('player');
    bazookaAmmo -= 1;
    playerShotsFired += 1;
    spawnActionPulse('player', 'bazooka');
    // La roquette part toujours droit devant : elle verrouille uniquement la
    // première patrouille de la voie, puis son explosion balaie deux cases.
    fireStraightShot('player', target, 'bazooka');
    // Leçon bazooka : la roquette tirée valide la démonstration (l'entrepôt
    // jaune devait avoir été traversé pour l'obtenir). La leçon de tir peut
    // aussi valider une roquette quand elle a remplacé l'arme en main.
    if (tutorialNote === 'shoot') noteTutorialAction('shoot');
    else noteTutorialAction('bazooka');
    getCallbacks().effect?.({ type: 'bazooka-fired', ammo: bazookaAmmo, targetId: target?.id || null });
    emitHud(true);
    return true;
  }

  function useRacerPower(racer) {
    if (sprint || !storyWeaponsEnabled) return false;
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
        jumping: Boolean(playerJumpState.active),
      },
      ...activeRacers().map((racer) => ({
        id: racer.id,
        name: racer.name,
        isPlayer: false,
        distance: racer.distance,
        lane: racer.lane,
        x: racer.currentX,
        width: racerCollisionWidth(racer),
        speed: racer.currentSpeed || racer.baseSpeed,
        racer,
        jumping: Boolean(racer.jumpState?.active),
      })),
    ];
  }

  function refreshPackLeader() {
    const entries = raceEntries();
    Object.assign(packLeader, cityRushPackLeader(entries) || entries[0]);
    return packLeader;
  }

  // ── Le dossier d'un rival ───────────────────────────────────────────────
  // Trois motifs ouvrent un dossier contre un adversaire : un tir réussi, un
  // carambolage avec une berline, et la tête de course à l'ouverture du dernier
  // tour. Le premier des trois monte son niveau de recherche à trois étoiles —
  // le barème du contact policier — et sort la berline qui lui est réservée
  // (`reserveForId`) ; les suivants n'ajoutent pas d'unité, et l'escouade du
  // joueur ne détourne jamais sa chasse. Une berline détruite n'est pas
  // remplacée : un rival garde son poursuivant, ou n'en a plus.
  function registerPoliceRetaliation(attackerId, source = CITY_RUSH_POWERS.PISTOL, { reason = 'police-shot' } = {}) {
    if (sprint || !attackerId || attackerId === 'player' || !storyPoliceEnabled || finished) return null;
    const attacker = racers.find((racer) => racer.id === attackerId);
    if (!attacker || attacker.wrecked) return null;
    const previousStars = attacker.wantedLevel || 0;
    const stars = cityRushRivalWantedLevelAfterContact(previousStars);
    if (stars !== previousStars) {
      attacker.wantedLevel = stars;
      emitHud(true);
    }
    const assigned = policeRetaliationByAttacker.get(attackerId);
    if (assigned) {
      // Le poursuivant d'un rival se relève comme l'escouade du joueur : une
      // berline détruite repart derrière le même rival tant que le dossier
      // reste ouvert (trois étoiles), après le même délai de relève. La relève
      // repart derrière **son** rival, jamais derrière le joueur.
      if (!assigned.active && !assigned.wreckPending && Number(assigned.health) <= 0
        && elapsed >= (Number(assigned.reinforcementAt) || 0)) {
        const target = raceEntries().find((entry) => entry.id === attackerId);
        if (target) {
          activatePoliceUnit(assigned, target, {
            reinforcement: true,
            unitNumber: assigned.unitNumber,
            targetId: attackerId,
          });
          audioRef?.current?.policeSiren?.({ level: 0.5 });
          getCallbacks().effect?.({
            type: 'police-retaliation',
            id: assigned.id,
            police: assigned.name,
            target: attacker.name,
            targetId: attackerId,
            source,
            // La relève du poursuivant d'un rival : même unité, même dossier.
            reason: 'pursuer-renewal',
            stars,
            count: CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
            lap,
          });
          emitHud(true);
        }
      }
      return assigned;
    }
    const reserve = policeCars.find((police) => police.reserveForId === attackerId);
    if (!reserve || reserve.everDeployed) return null;
    const target = raceEntries().find((entry) => entry.id === attackerId);
    if (!target) return null;
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
      // Le motif du dossier : `police-shot`, `police-contact` ou
      // `last-lap-leader`. Les vérifications s'y raccrochent.
      reason,
      stars,
      count: CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
      lap,
    });
    emitHud(true);
    return reserve;
  }

  // Le premier du dernier tour est chassé comme le pilote : le contrôle repasse
  // à chaque image, sans jamais redonner d'unité au même rival, et il attend que
  // le dernier tour du pilote soit ouvert — l'escouade du joueur, elle, entre au
  // même moment.
  function chaseLastLapLeader(leader, playerLap) {
    if (sprint || !storyPoliceEnabled || finished) return null;
    const leaderId = typeof leader?.id === 'string' ? leader.id : null;
    if (!cityRushRivalLeaderWanted({ leader: leaderId, lastLap: playerLap >= effectiveLaps })) return null;
    return registerPoliceRetaliation(leaderId, null, { reason: 'last-lap-leader' });
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
    police.skidSmokeTimer = 0;
    police.jumpState = { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0 };
    police.currentJumpY = 0;
    police.currentJumpPitch = 0;
    police.powerCooldown = 0;
    police.maxHealth = cityRushPoliceMaxHealth(police.vehicleType);
    police.health = police.maxHealth;
    police.healthFlash = 0;
    police.damageSmokeTimer = 0;
    animatePoliceDamageFire(police.mesh, 0, clockTime);
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
    police.currentSpeed = (spawnTarget.speed || paced(PLAYER_SPEED)) * 0.68;
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
    // L'escouade scénarisée du dernier tour repart en chasse, même si le pilote
    // venait de semer la police dans un mini-garage.
    policePursuitDropped = false;
    const player = raceEntries().find((entry) => entry.id === 'player');
    const squad = policeCars.filter((police) => police.squad);
    squad.forEach((police, index) => {
      // Une berline en pleine agonie garde son maillage jusqu'à l'explosion :
      // le déploiement ne peut pas la réactiver sans couper son tête-à-queue
      // (`wreckPending`, posé par `beginPoliceWreck`). Sa relève partira à
      // l'explosion, par `queuePoliceReinforcement`.
      if (police.active || police.wreckPending) return;
      const queuedAt = policeReinforcementQueue.indexOf(police);
      if (queuedAt >= 0) policeReinforcementQueue.splice(queuedAt, 1);
      police.reinforcementPending = false;
      activatePoliceUnit(police, player, {
        unitNumber: index + 1,
        targetId: 'player',
      });
    });
    // Une poursuite déclenchée par les étoiles peut déjà avoir créé des
    // relèves avant le déploiement scénarisé du dernier tour : ne jamais
    // réutiliser leurs identifiants quand l'escouade de base arrive.
    nextPoliceUnitNumber = Math.max(nextPoliceUnitNumber, policeCars.length + 1);
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
      lap: cityRushLapForDistance(distance, CITY_RUSH_LAP_LENGTH, effectiveLaps),
    });
  }

  function queuePoliceReinforcement(police) {
    // `wreckPending` : l'unité agonise encore (tête-à-queue), son maillage est
    // réservé — la relève est appelée à l'explosion (`explodePoliceWreck`).
    if (!police?.squad || !police.everDeployed || police.active || police.reinforcementPending
      || police.wreckPending) return false;
    police.reinforcementPending = true;
    policeReinforcementQueue.push(police);
    if (policeReinforcementQueue.length === 1) {
      policeReinforcementTimer = CITY_RUSH_POLICE_REINFORCEMENT_DELAY;
    }
    return true;
  }

  function updatePoliceReinforcements(dt) {
    // La poursuite liée aux étoiles reste soutenue à tout moment du parcours ;
    // les relèves de l'escouade scénarisée gardent aussi leur délai historique.
    if (sprint || !active || finished || playerWrecked) return;
    const desired = requiredPlayerPursuerSlots();
    if (desired <= 0) return;
    let accounted = activePlayerPursuerSlots() + policeReinforcementQueue.length;
    for (const police of policeCars) {
      if (accounted >= desired) break;
      if (!police.squad || !police.everDeployed || police.active || police.reinforcementPending
        || police.wreckPending) continue;
      if (queuePoliceReinforcement(police)) accounted += 1;
    }
    if (!policeReinforcementQueue.length) return;
    policeReinforcementTimer = Math.max(0, policeReinforcementTimer - dt);
    if (policeReinforcementTimer > 0) return;

    const police = policeReinforcementQueue.shift();
    const player = raceEntries().find((entry) => entry.id === 'player');
    if (activePlayerPursuerSlots() < requiredPlayerPursuerSlots()) {
      activatePoliceUnit(police, player, { reinforcement: true });
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
    } else {
      police.reinforcementPending = false;
    }
    policeReinforcementTimer = policeReinforcementQueue.length ? CITY_RUSH_POLICE_REINFORCEMENT_DELAY : 0;
    emitHud(true);
  }

  // ── Police civile et patrouilles venant en face ───────────────────────────
  // Une unité banalisée garde l'apparence d'une voiture ordinaire jusqu'au
  // contact. Les berlines rappelées rejoignent la même IA de barrage et de tir
  // que l'escouade principale.
  function rallyPoliceVehicle(vehicle, { origin = 'traffic', targetId = 'player', asBackup = false } = {}) {
    // Un SUV de charge garde son type de trafic (« police ») pour la détection
    // des chocs, mais son modèle propre (`vehicleType`) décide de sa coque et de
    // son nom une fois qu'il chasse.
    const policeType = vehicle?.vehicleType || vehicle?.type;
    if (!vehicle || vehicle.rallied || vehicle.destroyed || !isCityRushPoliceTrafficType(vehicle.type)) return null;
    vehicle.rallied = true;
    const fromOncoming = origin === 'oncoming';
    if (fromOncoming) {
      vehicle.turnaroundState = 'joined';
      vehicle.turnaroundElapsed = CITY_RUSH_POLICE_TURNAROUND_DURATION;
      vehicle.lane = vehicle.turnaroundTargetLane ?? vehicle.lane;
    }
    const lane = vehicle.lane;
    const maxHealth = cityRushPoliceMaxHealth(policeType);
    const police = {
      id: `rally-${vehicle.id}`,
      name: policeType === CITY_RUSH_SUV_CHARGE_TYPE ? 'POLICE SUV' : 'POLICE ROUTIÈRE',
      index: CITY_RUSH_POLICE_COUNT + ralliedCars.length,
      squad: false,
      rallied: true,
      targetId,
      wantedBackup: Boolean(asBackup),
      origin,
      originId: vehicle.id,
      vehicleType: policeType,
      mesh: vehicle.mesh,
      lane,
      currentX: vehicle.currentX,
      distance: vehicle.distance,
      currentSpeed: Math.max(vehicle.currentSpeed, paced(CITY_RUSH_POLICE_RALLY_BASE_SPEED * 0.62)),
      baseSpeed: paced(CITY_RUSH_POLICE_RALLY_BASE_SPEED * randomRange(0.95, 1.05)),
      phase: vehicle.phase,
      changeIn: 0.12,
      slowLeft: 0,
      blueShotSlowLeft: 0,
      trafficImpactLeft: 0,
      boostLeft: 0,
      stunLeft: 0,
      stunTotal: 0,
      skidLeft: 0,
      skidDuration: 0.85,
      skidSide: 1,
      skidSmokeTimer: 0,
      jumpState: { active: false, startDistance: 0, totalDistance: 0, maxHeight: 0, takeoffSpeed: 0, progress: 0 },
      currentJumpY: 0,
      currentJumpPitch: 0,
      powerCooldown: 0,
      inventory: createCityRushPoliceInventory(),
      active: true,
      health: Math.max(1, Math.min(Number(vehicle.health) || maxHealth, maxHealth)),
      maxHealth,
      healthFlash: 0,
      mode: 'hunt',
      blockLeft: 0,
      blockArmed: true,
      collisionCooldownLeft: 0,
      homeLane: lane,
      width: Number(vehicle.width) || 1.94,
      lastPassGap: undefined,
    };
    attachPoliceGlow(police.mesh);
    attachPoliceHealthBar(police.mesh);
    police.mesh.visible = true;
    police.mesh.rotation.set(trackPitch(police.distance), trackYaw(police.distance), 0);
    ralliedCars.push(police);
    policeBlockNoticeCooldown = Math.max(policeBlockNoticeCooldown, 2.5);
    return police;
  }

  function rallyTrafficPolice(traffic, targetId = 'player', extra = null) {
    const police = rallyPoliceVehicle(traffic, { origin: 'traffic', targetId });
    if (!police) return null;
    getCallbacks().effect?.({
      type: 'police-rally',
      police: police.name,
      targetId,
      target: targetId === 'player' ? 'player' : null,
      lap,
      ...(extra || {}),
    });
    return police;
  }

  function rallyOncomingPolice(oncoming, { asBackup = false, targetId = 'player' } = {}) {
    const police = rallyPoliceVehicle(oncoming, { origin: 'oncoming', targetId, asBackup });
    if (!police) return null;
    getCallbacks().effect?.({
      type: 'police-turnaround-complete',
      id: police.id,
      police: police.name,
      targetId,
      asBackup: Boolean(asBackup),
      duration: CITY_RUSH_POLICE_TURNAROUND_DURATION,
    });
    return police;
  }

  // À l'arrivée, une berline rappelée retrouve son flot d'origine. Une épave
  // détruite reste invisible jusqu'au prochain départ ; un renfort venant en
  // face reprend alors son sens initial. `targetId` permet de ne rendre au flot
  // que les voitures qui chassaient un pilote donné — la sortie d'un mini-garage
  // lâche le joueur sans relâcher les poursuivants d'un rival.
  function releaseRalliedPolice({ targetId = null } = {}) {
    if (!ralliedCars.length) return 0;
    let released = 0;
    const kept = targetId === null ? [] : ralliedCars.filter((police) => police.targetId !== targetId);
    for (const police of ralliedCars) {
      if (targetId !== null && police.targetId !== targetId) continue;
      released += 1;
      detachPoliceGlow(police.mesh);
      detachPoliceHealthBar(police.mesh);
      const vehicle = police.origin === 'oncoming'
        ? oncomingCars.find((car) => car.id === police.originId)
        : trafficCars.find((car) => car.id === police.originId);
      if (!vehicle) continue;
      if (police.health <= 0) {
        vehicle.destroyed = true;
        police.mesh.visible = false;
        continue;
      }
      vehicle.rallied = false;
      vehicle.currentSpeed = vehicle.baseSpeed;
      police.mesh.visible = true;
      if (police.origin === 'oncoming') {
        vehicle.turnaroundState = null;
        vehicle.turnaroundElapsed = 0;
        vehicle.turnaroundTargetId = null;
        vehicle.turnaroundAsBackup = false;
        vehicle.turnaroundTargetLane = null;
        vehicle.mesh.rotation.set(-trackPitch(vehicle.distance), trackYaw(vehicle.distance) + Math.PI, 0);
      }
    }
    ralliedCars.length = 0;
    ralliedCars.push(...kept);
    return released;
  }

  // ── La poursuite abandonnée : la police se remet à rouler normalement ─────
  // Sortir d'un mini-garage coupe la chasse pour de bon. Une unité de l'escouade
  // rend sa berline de poursuite (halo et barre de vie compris) et une voiture
  // de patrouille ordinaire prend sa place, au même endroit et à la même
  // allure : elle roule vers l'avant dans sa voie, ne tire plus, ne barre plus,
  // et se laisse distancer. Une patrouille rappelée du trafic reprend
  // simplement sa ronde ; une berline venue en face qui amorçait son demi-tour
  // achève sa manœuvre dans son sens habituel.
  const patrolCars = [];
  const patrolMeshPool = [];
  let patrolSerial = 0;

  function acquirePatrolMesh(vehicleType) {
    const free = patrolMeshPool.find((entry) => entry.vehicleType === vehicleType && !entry.busy);
    if (free) {
      free.busy = true;
      free.mesh.visible = true;
      return free.mesh;
    }
    const mesh = makeTrafficVehicle(vehicleType);
    withPoliceVisualRandom(() => attachPoliceDamageFire(mesh, policeDamageFireKit));
    mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
    scene.add(mesh);
    patrolMeshPool.push({ vehicleType, mesh, busy: true });
    return mesh;
  }

  function releasePatrolMesh(mesh) {
    const entry = patrolMeshPool.find((item) => item.mesh === mesh);
    if (!entry) return;
    entry.busy = false;
    entry.mesh.visible = false;
  }

  function abandonOncomingPoliceTurnaround(oncoming) {
    if (!oncoming || oncoming.turnaroundState !== 'turning') return false;
    oncoming.turnaroundState = null;
    oncoming.turnaroundElapsed = 0;
    oncoming.turnaroundTargetId = null;
    oncoming.turnaroundAsBackup = false;
    oncoming.turnaroundTargetLane = null;
    oncoming.mesh.rotation.set(-trackPitch(oncoming.distance), trackYaw(oncoming.distance) + Math.PI, 0);
    return true;
  }

  // La berline de poursuite quitte la chasse et devient un véhicule de
  // patrouille : sa coque reste intacte, mais elle roule désormais à l'allure
  // du trafic dans la voie où elle se trouve.
  function spawnPatrolPolice(squadCar) {
    const spec = CITY_RUSH_TRAFFIC_TYPES.find((vehicle) => vehicle.id === squadCar.vehicleType)
      || CITY_RUSH_TRAFFIC_TYPES[0];
    const mesh = acquirePatrolMesh(squadCar.vehicleType);
    patrolSerial += 1;
    const patrol = {
      id: `patrol-${patrolSerial}`,
      name: spec.name,
      type: squadCar.vehicleType,
      mesh,
      lane: squadCar.lane,
      currentX: squadCar.currentX,
      distance: squadCar.distance,
      width: squadCar.width,
      // Allure du trafic, jamais celle d'une poursuite : la berline se laisse
      // distancer et sort du champ derrière le pilote.
      baseSpeed: paced(spec.speed * randomRange(0.94, 1.06)),
      currentSpeed: Math.max(squadCar.currentSpeed * 0.6, paced(spec.speed)),
      phase: squadCar.phase,
      impactLeft: 0,
      impactCooldownLeft: 0,
      impactChanging: false,
      impactFromLane: null,
      impactTargetLane: null,
    };
    patrol.mesh.name = `patrol-${squadCar.vehicleType}`;
    patrol.mesh.position.set(
      patrol.currentX + trackRelativeX(patrol.distance),
      trackRelativeY(patrol.distance),
      PLAYER_Z - (patrol.distance - distance) * SCALE,
    );
    patrol.mesh.rotation.set(trackPitch(patrol.distance), trackYaw(patrol.distance), 0);
    patrol.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
    patrolCars.push(patrol);
    return patrol;
  }

  function releaseSquadPoliceUnit(police) {
    const patrol = spawnPatrolPolice(police);
    police.active = false;
    police.targetId = null;
    police.inventory = createCityRushPoliceInventory();
    police.blockLeft = 0;
    police.lastPassGap = undefined;
    police.mesh.visible = false;
    const queuedAt = policeReinforcementQueue.indexOf(police);
    if (queuedAt >= 0) policeReinforcementQueue.splice(queuedAt, 1);
    police.reinforcementPending = false;
    return patrol;
  }

  /**
   * Le joueur sort d'un garage : la police abandonne la poursuite. Les unités
   * qui le chassaient redeviennent du trafic (conduite normale), les renforts
   * prévus sont annulés, et plus aucune relève ne part tant qu'il ne provoque
   * pas de nouveau la police. Renvoie le nombre de poursuivants lâchés.
   */
  function releasePolicePursuit({ targetId = 'player' } = {}) {
    if (sprint) return 0;
    let released = 0;
    for (const police of policeCars) {
      if (!police.active || police.targetId !== targetId) continue;
      releaseSquadPoliceUnit(police);
      released += 1;
    }
    released += releaseRalliedPolice({ targetId });
    for (const oncoming of oncomingCars) {
      if (oncoming.turnaroundState !== 'turning' || oncoming.turnaroundTargetId !== targetId) continue;
      if (abandonOncomingPoliceTurnaround(oncoming)) released += 1;
    }
    const playerTargeted = targetId === 'player';
    if (playerTargeted) {
      policePursuitDropped = true;
      policeReinforcementQueue.length = 0;
      policeReinforcementTimer = 0;
    }
    if (released > 0) audioRef?.current?.policeSirenOff?.();
    return released;
  }

  // Conduite normale d'une berline lâchée : elle avance dans sa voie, à
  // l'allure du flot, sans jamais viser, barrer ou tirer. Hors du champ du
  // joueur, elle quitte la piste.
  function updatePatrolPolice(dt, movementById = null) {
    if (!patrolCars.length) return;
    for (let index = patrolCars.length - 1; index >= 0; index -= 1) {
      const patrol = patrolCars[index];
      patrol.impactLeft = Math.max(0, patrol.impactLeft - dt);
      patrol.impactCooldownLeft = Math.max(0, patrol.impactCooldownLeft - dt);
      // Un véhicule de patrouille n'a plus de pilote poursuivant : il garde sa
      // voie et son allure, et se laisse rejoindre comme n'importe quel trafic.
      const targetSpeed = Math.max(
        paced(3.4),
        patrol.baseSpeed + paced(Math.sin(elapsed * 0.5 + patrol.phase) * 0.18),
      ) * cornerPaceAt(patrol.distance);
      patrol.currentSpeed = approachCityRushSpeed(
        patrol.currentSpeed,
        targetSpeed,
        cityRushTrafficRecoveryRate(1, 0),
        dt,
        coursePace,
      );
      const priorDistance = patrol.distance;
      patrol.distance = movementById?.get(patrol.id)
        ?? (priorDistance + patrol.currentSpeed * dt);
      const laneChangeRate = patrol.impactChanging
        ? Math.min(1, dt / CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION)
        : Math.min(1, dt * 3.4);
      const priorX = patrol.currentX;
      patrol.currentX = lerp(patrol.currentX, laneX(patrol.lane), laneChangeRate);
      if (patrol.impactChanging && Math.abs(patrol.currentX - laneX(patrol.lane)) < 0.06) {
        patrol.currentX = laneX(patrol.lane);
        patrol.impactChanging = false;
        patrol.impactFromLane = null;
        patrol.impactTargetLane = null;
      }
      const gap = patrol.distance - distance;
      const visible = gap > -CITY_RUSH_TRAFFIC_VIEW_BEHIND && gap < trafficViewAhead;
      patrol.mesh.visible = visible;
      if (visible) {
        patrol.mesh.position.set(
          patrol.currentX + trackRelativeX(patrol.distance),
          trackRelativeY(patrol.distance),
          PLAYER_Z - gap * SCALE,
        );
        patrol.mesh.rotation.x = trackPitch(patrol.distance);
        patrol.mesh.rotation.y = lerp(
          patrol.mesh.rotation.y,
          trackYaw(patrol.distance) + clamp((patrol.currentX - priorX) * -2.8, -0.26, 0.26),
          Math.min(1, dt * 12),
        );
        patrol.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += patrol.currentSpeed * dt * 0.95; });
      } else if (gap < -CITY_RUSH_TRAFFIC_VIEW_BEHIND) {
        // Distancée : elle quitte la scène pour de bon.
        releasePatrolMesh(patrol.mesh);
        patrolCars.splice(index, 1);
      }
    }
  }

  function clearPatrolPolice() {
    for (const patrol of patrolCars) releasePatrolMesh(patrol.mesh);
    patrolCars.length = 0;
  }

  // Petit tête-à-queue contrôlé après un contact : la police se rabat vers
  // une voie voisine libre (en restant dans son sens de circulation), tandis
  // que le joueur glisse brièvement dans l'autre sens. La voie est animée par
  // l'interpolation habituelle de `updatePolice`, pas téléportée.
  function startPoliceCollisionAnimation(police) {
    if (!police) return;
    const isSuv = police.vehicleType === 'police-suv';
    const relativeSide = Math.sign(police.currentX - playerCar.position.x);
    const preferredSide = relativeSide || (police.lane === forwardLanes[forwardLanes.length - 1] ? -1 : 1);
    const adjacentLanes = [police.lane + preferredSide, police.lane - preferredSide]
      .filter((lane, index, lanes) => (
        lane >= 0
        && lane < laneCount
        && lane !== police.lane
        && forwardLanes.includes(lane)
        && lanes.indexOf(lane) === index
      ));
    // On privilégie une voie libre ; si le peloton est serré, la voiture tente
    // quand même son rabat le plus proche, que le résolveur de mouvement sécurise.
    const nextLane = adjacentLanes.find((lane) => canEnterLane(police.id, lane))
      ?? adjacentLanes[0]
      ?? null;
    const skidSide = nextLane === null
      ? preferredSide
      : Math.sign(laneX(nextLane) - police.currentX) || preferredSide;
    const policeSkidDuration = Math.max(
      isSuv ? POLICE_SUV_RAM_SKID_DURATION : POLICE_RAM_SKID_DURATION,
      Number(police.skidLeft) || 0,
    );
    police.skidLeft = policeSkidDuration;
    police.skidDuration = policeSkidDuration;
    police.skidSide = skidSide;
    police.skidSmokeTimer = 0;
    police.collisionCooldownLeft = Math.max(
      Number(police.collisionCooldownLeft) || 0,
      CITY_RUSH_POLICE_COLLISION_COOLDOWN,
    );
    if (nextLane !== null) {
      police.lane = nextLane;
      police.changeIn = Math.max(POLICE_RAM_LANE_CHANGE_HOLD, Number(police.changeIn) || 0);
    }

    const nextPlayerSkidDuration = Math.max(PLAYER_POLICE_RAM_SKID_DURATION, Number(playerSkidLeft) || 0);
    playerSkidLeft = nextPlayerSkidDuration;
    playerSkidDuration = nextPlayerSkidDuration;
    playerSkidSide = -skidSide;
  }

  // Contact avec une voiture de police en ronde (marquée ou banalisée) : la
  // voiture rappelée compte comme un poursuivant du quota de recherche.
  function checkPoliceRally() {
    if (sprint || !active || finished || playerJumpState.active) return;
    const playerXNow = playerCar.position.x;
    const playerWidth = playerCollisionWidth();
    for (const traffic of trafficCars) {
      if (traffic.rallied || traffic.destroyed || !isCityRushPoliceTrafficType(traffic.type)) continue;
      // La patrouille est un véhicule **du trafic** : son contact latéral se
      // juge sur sa boîte resserrée (`CITY_RUSH_TRAFFIC_HITBOX_SCALE`), comme
      // le reste de la circulation. La portée longitudinale, elle, reste celle
      // du contact policier (distance de sécurité + tolérance) : toucher une
      // patrouille, c'est déclencher une poursuite, et la règle est commune aux
      // berlines de police.
      if (!cityRushPoliceContact({
        gap: traffic.distance - distance,
        x: traffic.currentX,
        targetX: playerXNow,
        width: cityRushTrafficHitboxWidth(traffic.width),
        targetWidth: playerWidth,
      })) continue;
      // Toucher une patrouille coûte un carré comme n'importe quelle voiture :
      // le contact est jugé au pare-chocs (voir `cityRushPoliceContact`), et le
      // répit partagé évite qu'un contact prolongé en facture plusieurs.
      const healthLost = applyCarCollision({
        victim: 'police',
        name: traffic.name,
        id: traffic.id,
        gap: traffic.distance - distance,
      });
      const rallied = rallyTrafficPolice(traffic, 'player', {
        victim: 'police',
        healthLost,
        health: playerHealth,
        maxHealth: playerMaxHealth,
      });
      if (rallied) {
        startPoliceCollisionAnimation(rallied);
        spawnTrafficImpact('player', rallied.id);
        audioRef?.current?.skid({ pan: vehiclePan(rallied.id), intensity: 0.9, duration: POLICE_RAM_SKID_DURATION });
        cameraKick = Math.max(cameraKick, 0.42);
        raiseWantedLevel({ police: true, reason: 'police-contact' });
      }
    }
  }

  // ── Les SUV de charge : viser, foncer, se retourner ─────────────────────
  // Appelée à chaque image juste avant la boucle du contresens (qui se charge
  // du déplacement, du rendu et du choc balayé). Trois états :
  //   · `dormant`   — sous cinq étoiles (ou en Sprint), le SUV attend au loin ;
  //   · `charging`  — il est apparu loin devant, vise la voie du pilote à portée
  //                   de verrou et fonce ; une charge manquée le recycle ;
  //   · `reloading` — quelques secondes d'absence avant de repartir au loin.
  // Le contact, lui, ne se joue pas ici : la boucle du contresens détecte le
  // choc et déclenche le demi-tour réglementaire, puis la chasse.
  function armSuvCharge(charge) {
    charge.chargeState = 'charging';
    charge.chargeReloadLeft = 0;
    charge.chargeAnnounced = false;
    charge.chargeLocked = false;
    // Coque intacte : la charge suivante repart d'un SUV neuf.
    charge.health = cityRushPoliceMaxHealth(CITY_RUSH_SUV_CHARGE_TYPE);
    charge.maxHealth = cityRushPoliceMaxHealth(CITY_RUSH_SUV_CHARGE_TYPE);
    charge.healthFlash = 0;
    charge.turnaroundState = null;
    charge.turnaroundElapsed = 0;
    charge.turnaroundTargetId = null;
    charge.turnaroundAsBackup = false;
    charge.turnaroundTargetLane = null;
    charge.impactCooldownLeft = 0;
    charge.pushedAside = false;
    charge.pushAsideElapsed = 0;
    charge.pushAsideStartX = null;
    charge.lastPassGap = undefined;
    charge.mesh.visible = false;
    if (oncomingLanes.length) charge.lane = oncomingLanes[Math.floor(Math.random() * oncomingLanes.length)];
    charge.currentX = laneX(charge.lane);
    // Décalage entre les deux SUV : ils n'arrivent pas en meute, le pilote a le
    // temps de lire la première charge.
    charge.distance = distance + CITY_RUSH_SUV_CHARGE_SPAWN_LEAD + charge.chargeIndex * 60;
    charge.baseSpeed = cityRushSuvChargeSpeed(playerTopSpeed);
    charge.currentSpeed = charge.baseSpeed;
  }

  function updateSuvCharges(dt) {
    if (sprint) return;
    const wanted = cityRushSuvChargeCount(wantedLevel, { sprint, hasOncoming: oncomingLanes.length > 0 });
    for (const charge of suvCharges) {
      // La chasse (patrouille rappelée) ou l'épave gère le maillage : la charge
      // n'y touche plus.
      if (charge.rallied || charge.destroyed) continue;
      if (charge.chargeState === 'dormant') {
        charge.mesh.visible = false;
        charge.baseSpeed = 0;
        if (wanted > charge.chargeIndex) armSuvCharge(charge);
        continue;
      }
      // La poursuite est retombée sous cinq étoiles (mini-garage, drapeau) :
      // les SUV en charge rentrent au loin au lieu de continuer seuls.
      if (wanted <= charge.chargeIndex) {
        charge.chargeState = 'dormant';
        charge.chargeReloadLeft = 0;
        charge.chargeAnnounced = false;
        charge.chargeLocked = false;
        charge.baseSpeed = 0;
        charge.currentSpeed = 0;
        charge.mesh.visible = false;
        continue;
      }
      if (charge.chargeState === 'reloading') {
        charge.mesh.visible = false;
        charge.chargeReloadLeft = Math.max(0, charge.chargeReloadLeft - dt);
        if (charge.chargeReloadLeft <= 0) armSuvCharge(charge);
        continue;
      }
      // Le demi-tour d'après contact est piloté par la boucle du contresens.
      if (charge.turnaroundState === 'turning' || charge.turnaroundState === 'joined') continue;
      const gap = charge.distance - distance;
      if (gap < -CITY_RUSH_SUV_CHARGE_RECYCLE_BEHIND) {
        // Le SUV est repassé derrière sans toucher le pilote : la charge est
        // manquée, il recharge et reviendra au loin.
        charge.chargeState = 'reloading';
        charge.chargeReloadLeft = CITY_RUSH_SUV_CHARGE_RELOAD;
        charge.chargeAnnounced = false;
        charge.chargeLocked = false;
        charge.mesh.visible = false;
        continue;
      }
      // Plus rapide que la pointe du pilote, avec un plancher : la charge
      // ferme la distance même sur un parcours lent.
      charge.baseSpeed = cityRushSuvChargeSpeed(playerTopSpeed);
      charge.chargeLocked = cityRushSuvChargeLocked({ gap, range: CITY_RUSH_SUV_CHARGE_LOCK_RANGE });
      if (charge.chargeLocked) charge.lane = playerLane;
      if (!charge.chargeAnnounced && gap <= CITY_RUSH_SUV_CHARGE_ALERT_RANGE) {
        charge.chargeAnnounced = true;
        getCallbacks().effect?.({
          type: 'police-suv-charge',
          id: charge.id,
          police: charge.name,
          distance: Math.round(gap),
          lane: charge.lane,
          speed: Math.round(charge.baseSpeed * 3.6),
          lap,
        });
        audioRef?.current?.policeSiren?.({ level: 0.34 });
      }
    }
  }

  // ── La herse des quatre étoiles : positionner, dérouler, percer ─────────
  // Deux voitures de police prennent position à trois cents mètres devant le
  // pilote et déroulent un tapis à pointes sur les voies du sens de course. La
  // traverser crève les pneus : un carré de coque (`CITY_RUSH_SPIKE_DAMAGE`)
  // et une longue remise en vitesse (`cityRushSpikePace`). Les voies du
  // contresens et un saut par-dessus le dispositif restent des échappatoires.
  function buildSpikeBlockMeshes() {
    if (spikeBlock.meshes) return spikeBlock.meshes;
    const root = new THREE.Group();
    root.name = 'spike-block';
    const lanePitch = Math.max(1.4, Math.abs(laneX(1) - laneX(0)) || 2.1);
    const stripGeometry = new THREE.BoxGeometry(1, 0.07, 0.34);
    const toothGeometry = new THREE.ConeGeometry(0.06, 0.17, 4);
    const beaconGeometry = new THREE.BoxGeometry(0.17, 0.09, 0.1);
    const stripMaterial = standard(0x1b1f27, { metalness: 0.62, roughness: 0.42 });
    const toothMaterial = standard(0xdde5f0, { metalness: 0.88, roughness: 0.24, emissive: 0x24313f, emissiveIntensity: 0.5 });
    const laneGroups = Array.from({ length: CITY_RUSH_SPIKE_LANES }, (_, index) => {
      const laneGroup = new THREE.Group();
      laneGroup.name = `spike-lane-${index}`;
      const strip = new THREE.Mesh(stripGeometry, stripMaterial);
      strip.scale.x = lanePitch * 0.94;
      laneGroup.add(strip);
      const teeth = Array.from({ length: 5 }, (_, toothIndex) => {
        const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
        tooth.position.set(-lanePitch * 0.36 + toothIndex * lanePitch * 0.18, 0.12, 0);
        laneGroup.add(tooth);
        return tooth;
      });
      const beacon = new THREE.Mesh(beaconGeometry, new THREE.MeshBasicMaterial({
        color: 0xffb43a, transparent: true, opacity: 0.9, toneMapped: false,
      }));
      beacon.position.set(0, 0.22, 0);
      laneGroup.add(beacon);
      laneGroup.userData = { strip, teeth, beacon };
      laneGroup.visible = false;
      root.add(laneGroup);
      return laneGroup;
    });
    // Deux voitures de police ferment le dispositif à ses extrémités, en
    // travers : elles se rangent pendant le déploiement puis repartent au
    // rangement (voir `placeSpikeBlock`).
    const cars = CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES.slice(0, 2).map((vehicleType) => {
      const mesh = makeTrafficVehicle(vehicleType);
      withPoliceVisualRandom(() => attachPoliceDamageFire(mesh, policeDamageFireKit));
      mesh.name = `spike-car-${vehicleType}`;
      mesh.visible = false;
      root.add(mesh);
      return { mesh, side: 0, x: 0, z: 0 };
    });
    scene.add(root);
    spikeBlock.meshes = { root, laneGroups, cars };
    spikeBlock.cars = cars;
    spikeBlock.lanePitch = lanePitch;
    return spikeBlock.meshes;
  }

  function hideSpikeBlock() {
    const meshes = spikeBlock.meshes;
    if (!meshes) return;
    meshes.root.visible = false;
    meshes.laneGroups.forEach((laneGroup) => { laneGroup.visible = false; });
    meshes.cars.forEach((car) => { car.mesh.visible = false; });
  }

  function beginSpikeBlock() {
    if (!forwardLanes.length) return false;
    buildSpikeBlockMeshes();
    spikeBlock.state = 'deploying';
    spikeBlock.elapsed = 0;
    spikeBlock.age = 0;
    spikeBlock.distance = distance + CITY_RUSH_SPIKE_BLOCK_LEAD;
    spikeBlock.lanes = [...cityRushSpikeLanes(forwardLanes, CITY_RUSH_SPIKE_LANES)];
    spikeBlock.meshes.root.visible = true;
    spikeBlock.meshes.laneGroups.forEach((laneGroup) => { laneGroup.visible = false; });
    spikeBlock.meshes.cars.forEach((car) => { car.mesh.visible = false; });
    getCallbacks().effect?.({
      type: 'police-spike-block',
      stage: 'deploy',
      lanes: spikeBlock.lanes.length,
      lane: playerLane,
      distance: CITY_RUSH_SPIKE_BLOCK_LEAD,
      lap,
    });
    audioRef?.current?.policeSiren?.({ level: 0.4 });
    return true;
  }

  // Placement du dispositif dans le monde : les voitures se rangent pendant le
  // déploiement, la herse se déroule voie par voie, et tout repart au rangement.
  function placeSpikeBlock(dt) {
    const meshes = spikeBlock.meshes;
    if (!meshes) return;
    const gap = spikeBlock.distance - distance;
    const baseZ = PLAYER_Z - gap * SCALE;
    const baseY = trackRelativeY(spikeBlock.distance);
    const curveX = trackRelativeX(spikeBlock.distance);
    const yaw = trackYaw(spikeBlock.distance);
    const lanes = spikeBlock.lanes;
    const packing = spikeBlock.state === 'packing';
    const deployProgress = packing
      ? 1 - cityRushSpikeLayProgress(spikeBlock.elapsed, CITY_RUSH_SPIKE_BLOCK_PACK_DURATION)
      : cityRushSpikeLayProgress(spikeBlock.elapsed, CITY_RUSH_SPIKE_BLOCK_DEPLOY_DURATION);
    const layProgress = packing ? 0 : cityRushSpikeLayProgress(spikeBlock.elapsed, CITY_RUSH_SPIKE_LAY_DURATION);
    const laidLanes = spikeBlock.state === 'set' ? lanes.length : cityRushSpikeLaidLanes(spikeBlock.elapsed, {
      lanes: lanes.length,
      duration: CITY_RUSH_SPIKE_LAY_DURATION,
    });
    meshes.root.visible = true;
    meshes.laneGroups.forEach((laneGroup, index) => {
      const lane = lanes[index];
      if (lane === undefined || packing) {
        laneGroup.visible = false;
        return;
      }
      // Pendant la prise de position, la herse n'est pas encore déroulée : le
      // tapis apparaît voie par voie, dans l'ordre de pose.
      const inline = spikeBlock.state === 'laying' || spikeBlock.state === 'set';
      const reveal = inline
        ? clamp(Math.max(laidLanes > index ? 1 : 0, layProgress * lanes.length - index), 0, 1)
        : 0;
      laneGroup.visible = reveal > 0.02;
      if (!laneGroup.visible) return;
      laneGroup.position.set(laneX(lane) + curveX, baseY + 0.02, baseZ);
      laneGroup.rotation.y = yaw;
      laneGroup.userData.strip.scale.x = Math.max(0.02, spikeBlock.lanePitch * 0.94 * reveal);
      laneGroup.userData.teeth.forEach((tooth, toothIndex) => {
        tooth.visible = reveal >= (toothIndex + 0.5) / 5;
      });
      laneGroup.userData.beacon.material.opacity = Math.floor(clockTime * 6 + index) % 2 === 0 ? 0.9 : 0.25;
    });
    const deployEase = smoothstep(deployProgress);
    meshes.cars.forEach((car, index) => {
      const lane = index === 0 ? lanes[0] : lanes[lanes.length - 1];
      if (lane === undefined || deployEase <= 0.02) {
        car.mesh.visible = false;
        return;
      }
      const parkedX = laneX(lane) + (index === 0 ? -1 : 1) * (spikeBlock.lanePitch * 0.5 + 0.24);
      car.mesh.visible = true;
      car.mesh.position.set(lerp(laneX(lane), parkedX, deployEase) + curveX, baseY + 0.02, baseZ + (index === 0 ? 1.1 : -0.9));
      car.mesh.rotation.set(0, yaw + (index === 0 ? 1 : -1) * 0.52 * deployEase, 0);
      car.mesh.userData.wheels?.forEach((wheel) => { wheel.rotation.x += dt * 5; });
      car.mesh.userData.beacons?.forEach((beacon, beaconIndex) => {
        beacon.material.opacity = Math.floor(clockTime * 9 + beaconIndex) % 2 === 0 ? 1 : 0.16;
      });
    });
  }

  function applySpikeHit(laidLanes) {
    const lost = applyCarCollision({
      victim: 'spike',
      name: 'HERSE DE POLICE',
      id: SPIKE_BLOCK_ID,
      gap: spikeBlock.distance - distance,
      lane: playerLane,
      source: CITY_RUSH_SPIKE_DAMAGE_SOURCE,
    });
    // Pneus crevés : la vitesse visée tombe au facteur de la règle pendant
    // `CITY_RUSH_SPIKE_SLOW_DURATION`, le temps de repartir.
    playerSpikeSlowLeft = Math.max(playerSpikeSlowLeft, CITY_RUSH_SPIKE_SLOW_DURATION);
    playerSkidLeft = Math.max(playerSkidLeft, CITY_RUSH_SPIKE_IMPACT_DURATION);
    playerSkidDuration = CITY_RUSH_SPIKE_IMPACT_DURATION;
    playerSkidSide = Math.random() < 0.5 ? -1 : 1;
    cameraKick = Math.max(cameraKick, 1.05);
    spawnTrafficImpact('player', SPIKE_BLOCK_ID, 1.4);
    audioRef?.current?.skid({ pan: vehiclePan('player'), intensity: 1.35, duration: 0.95 });
    getCallbacks().effect?.({
      type: 'police-spike-hit',
      lanes: laidLanes,
      lane: playerLane,
      healthLost: lost,
      health: playerHealth,
      maxHealth: playerMaxHealth,
      slowSeconds: CITY_RUSH_SPIKE_SLOW_DURATION,
      factor: CITY_RUSH_SPIKE_SLOW_FACTOR,
      lap,
    });
  }

  function spikeBlockReady() {
    return active && !finished && !playerWrecked && !sprint
      && cityRushSpikeBlockCount(wantedLevel, { sprint }) > 0
      && spikeBlock.cooldownLeft <= 0;
  }

  // Appelée juste après le carambolage des berlines : le dispositif se monte,
  // se déroule, se franchit, puis se range — jamais en Sprint, et jamais avant
  // la quatrième étoile.
  function updateSpikeBlock(dt, priorDistance) {
    if (sprint) return;
    if (spikeBlock.state === 'idle') {
      if (!spikeBlockReady()) return;
      beginSpikeBlock();
      return;
    }
    spikeBlock.elapsed += dt;
    spikeBlock.age += dt;
    const lanes = spikeBlock.lanes;
    const laidLanes = spikeBlock.state === 'set'
      ? lanes.length
      : cityRushSpikeLaidLanes(spikeBlock.elapsed, { lanes: lanes.length, duration: CITY_RUSH_SPIKE_LAY_DURATION });
    if (spikeBlock.state === 'deploying' && spikeBlock.elapsed >= CITY_RUSH_SPIKE_BLOCK_DEPLOY_DURATION) {
      // Les voitures sont rangées : la herse commence à se dérouler.
      spikeBlock.state = 'laying';
      spikeBlock.elapsed = 0;
      getCallbacks().effect?.({
        type: 'police-spike-block',
        stage: 'lay',
        lanes: lanes.length,
        lane: playerLane,
        covered: lanes.includes(playerLane),
        lap,
      });
    } else if (spikeBlock.state === 'laying' && laidLanes >= lanes.length) {
      spikeBlock.state = 'set';
      getCallbacks().effect?.({
        type: 'police-spike-block',
        stage: 'set',
        lanes: lanes.length,
        lane: playerLane,
        covered: lanes.includes(playerLane),
        lap,
      });
    }
    // Franchissement : détection balayée sur la voie du pilote. Un saut passe
    // au-dessus du dispositif, les voies non couvertes et le contresens aussi.
    const crossing = spikeBlock.state === 'laying' || spikeBlock.state === 'set';
    if (crossing && !playerWrecked && !playerJumpState.active
      && cityRushSpikeHit({
        previousDistance: priorDistance,
        nextDistance: distance,
        spikeDistance: spikeBlock.distance,
        lane: playerLane,
        lanes: forwardLanes,
        laidLanes,
      })) {
      applySpikeHit(laidLanes);
    }
    // Le pilote est passé (ou la herse attend depuis trop longtemps) : les
    // voitures rangent le dispositif et repartent devant.
    const passed = spikeBlock.distance - distance < -(CITY_RUSH_SPIKE_HALF_LENGTH + 8);
    if (spikeBlock.state !== 'packing' && (passed || spikeBlock.age >= CITY_RUSH_SPIKE_BLOCK_LIFETIME)) {
      spikeBlock.state = 'packing';
      spikeBlock.elapsed = 0;
      getCallbacks().effect?.({
        type: 'police-spike-block',
        stage: 'pack',
        lanes: lanes.length,
        passed,
        lap,
      });
    } else if (spikeBlock.state === 'packing' && spikeBlock.elapsed >= CITY_RUSH_SPIKE_BLOCK_PACK_DURATION) {
      spikeBlock.state = 'idle';
      spikeBlock.elapsed = 0;
      spikeBlock.age = 0;
      spikeBlock.cooldownLeft = CITY_RUSH_SPIKE_BLOCK_COOLDOWN;
      hideSpikeBlock();
      return;
    }
    placeSpikeBlock(dt);
  }

  function dismissSpikeBlock() {
    const wasActive = spikeBlock.state !== 'idle';
    spikeBlock.state = 'idle';
    spikeBlock.elapsed = 0;
    spikeBlock.age = 0;
    spikeBlock.cooldownLeft = 0;
    spikeBlock.lanes = [];
    hideSpikeBlock();
    return wasActive;
  }

  // ── Dégâts et HUD de santé du pilote ───────────────────────────────────
  // La barre de quinze cellules est active dès le départ. Un tir rouge, un tir
  // bleu ou une collision avec n'importe quelle voiture en retire exactement
  // une. Un tir rouge ne modifie jamais la vitesse, le dérapage ou la toupie de
  // sa cible. À zéro, la voiture part en épave comme avant.
  function activatePlayerHealth() {
    if (playerHealthActive) return;
    playerHealthActive = true;
    playerHealth = playerMaxHealth;
    playerHealthFlash = 0;
    playerCollisionCooldownLeft = 0;
    getCallbacks().effect?.({
      type: 'player-health',
      health: playerHealth,
      maxHealth: playerMaxHealth,
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
    // Entraînement guidé : la démonstration ne peut pas finir en épave. La
    // coque encaisse les chocs (la jauge bouge, les leçons restent vraies)
    // mais garde toujours son dernier carré — le tour guidé va au bout.
    const tutorialFloor = tutorialMode ? 1 : 0;
    playerHealth = Math.max(tutorialFloor, cityRushPlayerDamage(playerHealth, source));
    const lost = before - playerHealth;
    if (lost <= 0) return 0;
    playerHitsTaken += 1;
    playerHealthFlash = CITY_RUSH_PLAYER_HEALTH_FLASH;
    // Le choc se sent aussi à la caméra : d'autant plus que le carré coûte cher.
    cameraKick = Math.max(cameraKick, 0.2 + lost * 0.06);
    const hit = {
      type: 'player-hit',
      source,
      damage: lost,
      health: playerHealth,
      maxHealth: playerMaxHealth,
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

  // Percuter une voiture — le trafic lent, un véhicule venant en face ou une
  // berline de police — retire un carré de vie (deux contre un SUV). Le choc arme un répit partagé
  // (`CITY_RUSH_PLAYER_COLLISION_COOLDOWN`) : un carambolage en chaîne dans un
  // embouteillage, ou deux carrosseries restées collées après le choc, ne
  // facturent que le premier choc. Le répit vaut pour **toutes** les voitures :
  // après un choc, un second contact immédiat — même avec une autre voiture —
  // est gratuit, la barre a le temps de montrer le carré perdu.
  // `victim` distingue les trois familles pour les messages et les vérifs, et
  // `gap` porte l'écart longitudinal voiture/pilote au moment du choc (positif
  // si la voiture est devant, négatif si elle est derrière).
  function applyCarCollision({ victim = 'traffic', name = null, id = null, gap = null, source = 'collision', ...extra } = {}) {
    if (playerCollisionCooldownLeft > 0) return 0;
    const lost = damagePlayer(source, null, {
      victim,
      carId: id,
      car: name,
      attacker: name,
      gap: Number.isFinite(Number(gap)) ? Number(gap) : null,
      ...extra,
    });
    if (lost > 0) playerCollisionCooldownLeft = CITY_RUSH_PLAYER_COLLISION_COOLDOWN;
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

  // Panne scriptée du prologue : un avertissement moteur (`story-warning`),
  // puis le calage (`story-breakdown`) — la voiture ralentit en fumant, et la
  // course se clôt en sabotage, pas en épave. Une voiture déjà en épave (chocs)
  // ne cale pas : elle a déjà perdu.
  function updateStoryBreakdown(dt) {
    if (!storyBreakdown || finished || playerWrecked || storyBreakdownActive) {
      if (!storyBreakdown || finished || playerWrecked) return;
    } else {
      const warnAt = effectiveDistance * (Number(storyBreakdown.warnShare) || 0.62);
      const failAt = effectiveDistance * (Number(storyBreakdown.failShare) || 0.8);
      if (!storyBreakdownWarned && distance >= warnAt) {
        storyBreakdownWarned = true;
        getCallbacks().effect?.({ type: 'story-warning' });
      }
      if (distance >= failAt) {
        storyBreakdownActive = true;
        storyBreakdownLeft = CITY_RUSH_WRECK_SECONDS;
        storyRankAtBreakdown = rankCityRushRacers(makeRacerRows()).rank;
        cameraKick = Math.max(cameraKick, 0.8);
        getCallbacks().effect?.({ type: 'story-breakdown', rank: storyRankAtBreakdown });
      }
    }
    if (!storyBreakdownActive || finished) return;
    storyBreakdownLeft = Math.max(0, storyBreakdownLeft - dt);
    storyBreakdownSmokeTimer -= dt;
    if (storyBreakdownSmokeTimer <= 0) {
      storyBreakdownSmokeTimer = 0.14;
      smoke.emit(playerCar.position, { color: 0x2a2a33, opacity: 0.65, scale: 0.9, grow: 2.4, life: 1.2, velocity: [0, 2.2, 0.5] });
    }
    if (storyBreakdownLeft <= 0) finishRace({ destroyed: true, sabotaged: true });
  }

  // Percuter une berline solide en arrivant dessus à pleine allure : elle perd
  // un point de vie et le pilote y laisse un carré (deux contre un SUV).
  // L'impact reste rapide, mais les deux voitures dérapent brièvement et la
  // police se rabat sur une voie voisine au lieu de s'immobiliser.
  function applyPoliceCollision(police) {
    playerVehicleContacts += 1;
    const isSuv = police.vehicleType === 'police-suv';
    police.collisionCooldownLeft = CITY_RUSH_POLICE_COLLISION_COOLDOWN;
    startPoliceCollisionAnimation(police);
    spawnTrafficImpact('player', police.id, isSuv ? POLICE_SUV_RAM_VFX_INTENSITY : 1);
    audioRef?.current?.skid({
      pan: vehiclePan('player'),
      intensity: isSuv ? 1.3 : 1.1,
      duration: isSuv ? 0.95 : 0.82,
    });
    cameraKick = Math.max(cameraKick, isSuv ? 1.55 : 0.52);
    if (isSuv) spawnPoliceSuvCollisionSparks(police);
    // Le carambolage abîme les deux coques : la berline perd un point de vie,
    // le pilote un carré, ou deux contre un SUV. Le répit partagé (`applyCarCollision`) empêche un
    // contact collé au pare-chocs — ou deux berlines heurtées coup sur coup —
    // de retirer plusieurs carrés d'affilée.
    const playerHealthLost = applyCarCollision({
      victim: 'police',
      name: police.name,
      id: police.id,
      gap: police.distance - distance,
      source: police.vehicleType === 'police-suv' ? 'suv-collision' : 'collision',
    });
    if (isSuv && !playerWrecked) {
      playerSuvImpactLeft = PLAYER_POLICE_SUV_RAM_IMPACT_DURATION;
      playerSuvImpactSide = playerSkidSide || 1;
    }
    damagePolice(police, 'collision', 'player', {
      victim: 'police',
      playerHealthLost,
      playerHealth,
      playerHealthMax: playerMaxHealth,
    });
  }

  // Un carambolage se juge sur la règle pure `cityRushPoliceCollisionHit` : la
  // berline doit être **devant** le pilote et celui-ci doit **arriver sur elle**
  // (vitesse d'approche). Suivre le pilote à sa hauteur ou se replier derrière
  // lui pour tirer ne compte pas — la position de tir de l'escouade (5 m derrière)
  // ne doit jamais produire un choc invisible.
  function checkPoliceCollisions() {
    if (sprint || !active || finished) return;
    if (playerJumpState.active) return;
    const playerXNow = playerCar.position.x;
    const playerWidth = playerCollisionWidth();
    for (const police of activePursuers()) {
      if (police.health <= 0 || police.collisionCooldownLeft > 0 || police.jumpState?.active) continue;
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

  // Les adversaires carambolent les berlines exactement comme le joueur : le
  // rival doit **arriver sur** la berline plus vite qu'elle ne roule
  // (`cityRushPoliceCollisionHit`), la coque de la berline perd un point, les
  // deux voitures dérapent, et le dossier du rival s'ouvre. La berline qui
  // chasse déjà ce rival ne relance pas son dossier, et le répit de choc
  // (`collisionCooldownLeft`) empêche un carambolage collé au pare-chocs d'être
  // facturé à chaque image. Le contrôle passe après le déplacement des berlines :
  // c'est le freinage du barrage qui crée le choc, décrit à la position du jour.
  function checkRivalPoliceCollisions() {
    if (sprint || !active || finished) return;
    for (const racer of activeRacers()) {
      if (racer.wrecked || racer.stunLeft > 0 || (racer.spinLeft || 0) > 0 || racer.jumpState?.active) continue;
      for (const police of activePursuers()) {
        if (police.health <= 0 || police.collisionCooldownLeft > 0 || police.jumpState?.active) continue;
        if (!cityRushPoliceCollisionHit({
          gap: police.distance - racer.distance,
          closing: (racer.currentSpeed || 0) - (Number(police.currentSpeed) || 0),
          x: police.currentX,
          targetX: racer.currentX,
          width: police.width,
          targetWidth: racerCollisionWidth(racer),
        })) continue;
        const isSuv = police.vehicleType === CITY_RUSH_SUV_CHARGE_TYPE;
        const side = Math.sign(racer.currentX - police.currentX) || 1;
        police.collisionCooldownLeft = CITY_RUSH_POLICE_COLLISION_COOLDOWN;
        police.skidLeft = Math.max(police.skidLeft, isSuv ? POLICE_SUV_RAM_SKID_DURATION : POLICE_RAM_SKID_DURATION);
        police.skidDuration = police.skidLeft;
        police.skidSide = -side;
        police.skidSmokeTimer = 0;
        racer.trafficImpactLeft = Math.max(racer.trafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION * 1.25);
        racer.skidLeft = Math.max(racer.skidLeft, 1.1);
        racer.skidDuration = 1.1;
        racer.skidSide = side;
        racer.boostLeft = 0;
        if (police.mesh.visible) {
          spawnTrafficImpact(racer.id, police.id, isSuv ? POLICE_SUV_RAM_VFX_INTENSITY : 1);
          audioRef?.current?.skid({ pan: vehiclePan(police.id), intensity: isSuv ? 1.3 : 1.05, duration: 0.82 });
        }
        // `damagePolice` ouvre aussi le dossier du rival (`registerPoliceRetaliation`) :
        // le carambolage vaut trois étoiles, comme un tir.
        damagePolice(police, 'collision', racer.id, { victim: 'police', racer: racer.name });
      }
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
    // Entraînement guidé : le chargeur rouge est l'accessoire de la leçon des
    // tirs — il reste visible pour la voiture, quel que soit son inventaire.
    if (tutorialMode) return false;
    const opponentInventories = [
      ...activeRacers().map((racer) => racer.inventory),
      ...activePursuers().map((police) => police.inventory),
    ];
    return shouldHideCityRushPistolPickup(inventory, opponentInventories);
  }

  // Les choix de voie des rivaux et de la police partagent ces bonus visibles,
  // avec un filtre propre à l'inventaire de chaque voiture.
  function visiblePickups(actorInventory = null, actorHealth = 0, actorMaxHealth = 0, { player = true } = {}) {
    const hideRedForRace = redPickupsHiddenForRace();
    return rows.flatMap((row) => row.pickups
      .map((pickup, index) => ({
        ...pickup,
        distance: row.trackDistance,
        claimed: isCityRushPickupHidden(row.pickupClaims, index, elapsed),
        visible: row.slots[index]?.visible,
      }))
      .filter((pickup) => !pickup.claimed && pickup.visible)
      .filter((pickup) => canCollectCityRushPickup(actorInventory, pickup.type, {
        redPickupsHidden: hideRedForRace,
        health: actorHealth,
        maxHealth: actorMaxHealth,
        player,
      })));
  }

  // Fumée de capot : une berline touchée s'embrase et fume avant d'exploser.
  // Plus sa barre descend, plus les flammes grandissent et plus la fumée devient
  // dense et sombre ; le panache noir annonce l'explosion imminente.
  const policeHoodScratch = new THREE.Vector3();
  function emitPoliceDamageSmoke(police, dt) {
    const mesh = police?.mesh;
    if (!mesh) return;
    const health = Number(police.health);
    // Vie max propre au modèle (le SUV est blindé).
    const maxHealth = Number(police.maxHealth) || cityRushPoliceMaxHealth(police.vehicleType || police.type) || CITY_RUSH_POLICE_HEALTH;
    const damage = Number.isFinite(health) && maxHealth > 0
      ? clamp(1 - health / maxHealth, 0, 1)
      : 0;
    animatePoliceDamageFire(mesh, damage, clockTime);
    if (!mesh.visible || police.active === false || !Number.isFinite(health) || health <= 0 || health >= maxHealth) return;
    police.damageSmokeTimer = (police.damageSmokeTimer || 0) - dt;
    if (police.damageSmokeTimer > 0) return;
    police.damageSmokeTimer = lite ? 0.2 - damage * 0.1 : 0.16 - damage * 0.11;
    policeHoodScratch.set((Math.random() - 0.5) * 0.5, 1.05, -1.35);
    mesh.localToWorld(policeHoodScratch);
    // Gris clair à peine touchée → noir épais en fin de vie.
    const shade = Math.round(0xb4 - damage * 0x86);
    const color = (shade << 16) | (shade << 8) | (shade + 6);
    smoke.emit(policeHoodScratch, {
      color,
      opacity: 0.28 + damage * 0.42,
      scale: 0.28 + damage * 0.38,
      grow: 2.2 + damage * 1.2,
      life: 0.7 + damage * 0.6,
      velocity: [(Math.random() - 0.5) * 0.7, 1.3 + damage * 1.1, 1.6 + Math.random() * 0.8],
    });
    // Coque presque percée : quelques étincelles orangées dans la fumée.
    if (health <= 2 && Math.random() < 0.35) {
      smoke.emit(policeHoodScratch, { color: 0xff8a33, opacity: 0.8, scale: 0.14, grow: 1.4, life: 0.32, velocity: [(Math.random() - 0.5) * 1.6, 1.8 + Math.random(), 1.2] });
    }
  }

  function updatePolice(dt, packLeaderEntry) {
    // Sprint : aucune unité en piste, aucune annonce — la chasse ne tourne pas.
    if (sprint) return;
    policeStealNoticeCooldown = Math.max(0, policeStealNoticeCooldown - dt);
    policeBlockNoticeCooldown = Math.max(0, policeBlockNoticeCooldown - dt);
    policeAimNoticeCooldown = Math.max(0, policeAimNoticeCooldown - dt);
    const pursuers = activePursuers();
    pursuers.forEach((police) => { police.healthFlash = Math.max(0, (police.healthFlash || 0) - dt); });
    pursuers.forEach((police) => emitPoliceDamageSmoke(police, dt));
    // Patrouilles encore en ronde — police en civil (banalisée) et police
    // routière, dans le flot comme en face : elles fument aussi dès qu'elles
    // sont touchées, avant d'exploser.
    for (const car of trafficCars) {
      if (!car.rallied && !car.destroyed && isCityRushPoliceTrafficType(car.type)) emitPoliceDamageSmoke(car, dt);
    }
    for (const car of oncomingCars) {
      if (!car.rallied && !car.destroyed && isCityRushPoliceTrafficType(car.type)) emitPoliceDamageSmoke(car, dt);
    }
    if (!pursuers.length) return;
    // Le trafic en ronde : identifiant pour l'impact, position et vitesse pour
    // repérer une voie bouchée (une berline évite de s'y engluer).
    const traffic = rollingTraffic().map((car) => ({
      id: car.id, lane: car.lane, distance: car.distance, x: car.currentX, width: car.width, speed: car.currentSpeed,
    // Les berlines lâchées par un mini-garage comptent comme du trafic : une
    // poursuite qui repart ne les traverse pas.
    })).concat(patrolCars.map((car) => ({
      id: car.id, lane: car.lane, distance: car.distance, x: car.currentX, width: car.width, speed: car.currentSpeed,
    })));
    // Le trafic venant en face rend les voies du contresens infréquentables
    // pour l'escouade (vitesse négative : les voies passent pour bouchées). Il
    // ne bloque en revanche pas le déplacement des berlines — il se croise.
    const oncomingForLanes = oncomingCars
      .filter((car) => !car.rallied && !car.destroyed)
      .map((car) => ({
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
    // De même, une seule berline prend la ligne de tir par client : la plus
    // proche **derrière** lui. Les autres gardent leur voie et leurs vols de
    // bonus, avec leurs rafales opportunistes. Sans cette élection, l'escouade
    // entière se rangeait dans le dos du pilote et vidait ses chargeurs
    // ensemble : quinze carrés en une seule boucle.
    // La ligne de tir est réservée à l'escouade — les berlines du trafic
    // rappelées par un contact gardent leurs rafales opportunistes, tirées de
    // la voie où elles se trouvent. Sinon, quatre patrouilles banalisées
    // suffisaient à vider la coque du pilote avant même le dernier tour.
    const fireLiners = new Map();
    for (const police of pursuers) {
      if (police.rallied) continue;
      if (police.stunLeft > 0 || police.powerCooldown > 0) continue;
      if (!isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL)) continue;
      const target = targets.get(police.id) || packLeaderEntry;
      const gap = police.distance - (target?.distance ?? police.distance);
      if (gap >= 0 || gap < -CITY_RUSH_POLICE_FIRE_LINE_RANGE) continue;
      const current = fireLiners.get(target?.id);
      if (!current || gap > current.gap) fireLiners.set(target?.id, { police, gap });
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
      police.skidSmokeTimer = Math.max(0, (Number(police.skidSmokeTimer) || 0) - dt);
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
      // Élue pour la ligne de tir : elle seule vise la voie de son client pour
      // ouvrir le feu droit devant son capot (la rafale part toujours vers
      // l'avant). C'est la contrepartie du barrage, réservée à l'arrière.
      const isFireLiner = !police.rallied && fireLiners.get(leader.id)?.police === police;
      // Le pilote vient de se décaler sous le nez d'une berline élue (barrage
      // ou ligne de tir) : elle relance son choix de voie tout de suite, au
      // lieu de finir son délai et de tirer dans la voie qu'il vient de
      // quitter. Sans ce réflexe, un joueur qui balayait les voies à
      // 0,4 s d'intervalle restait intouchable.
      if (police.watchedLane !== undefined && police.watchedLane !== leader.lane
        && (isInterceptor || isFireLiner)) {
        police.changeIn = Math.min(police.changeIn, CITY_RUSH_POLICE_PURSUIT_REFLEX);
      }
      police.watchedLane = leader.lane;

      // Sonnée ou fraîchement percutée, la berline garde son choix de voie :
      // le minuteur attend la fin de la toupie ou du répit après le choc.
      let policeAirborne = Boolean(police.jumpState?.active);
      if (police.stunLeft <= 0 && police.collisionCooldownLeft <= 0 && !policeAirborne) police.changeIn -= dt;
      if (police.stunLeft <= 0 && police.collisionCooldownLeft <= 0 && !policeAirborne && police.changeIn <= 0) {
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
            pickups: visiblePickups(police.inventory, police.health, police.maxHealth, { player: false }),
            traffic: [...traffic, ...oncomingForLanes],
            racers: raceCars,
            targetLane: leader.lane,
            homeLane: police.homeLane,
            // La berline désignée se rabat dans la voie du leader : c'est là
            // qu'elle peut lui couper la route.
            interceptLane: isInterceptor ? leader.lane : null,
            interceptGap: gap,
            // Élue pour la ligne de tir : elle seule vise la voie de son client
            // pour ouvrir le feu droit devant son capot (la rafale part toujours
            // vers l'avant). C'est la contrepartie du barrage, réservée à
            // l'arrière.
            fireLane: isFireLiner ? leader.lane : null,
            fireGap: gap,
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
        // Même virage que le pilote : l'escouade lève le pied elle aussi, sinon
        // elle traverserait la cassure à la vitesse de la ligne droite.
        targetSpeed *= cornerPaceAt(police.distance);
      }
      // Engluée derrière un véhicule lent ou un pilote, ou sonnée par un choc :
      // elle relance tout de suite son choix de voie au lieu d'attendre la fin
      // de son délai.
      if (police.collisionCooldownLeft <= 0 && police.currentSpeed < targetSpeed * 0.55) police.changeIn = Math.min(police.changeIn, 0.1);
      police.currentSpeed = approachCityRushSpeed(police.currentSpeed, Math.max(0, targetSpeed), 13.5, dt, coursePace);
      police.currentX = lerp(police.currentX, laneX(police.lane), Math.min(1, dt * 5.6));
      const before = priorDistances.get(police.id);
      // Les poursuivants empruntent aussi les tremplins : le choix de voie
      // est gelé en vol, pour qu'ils atterrissent dans la voie de décollage.
      if (!policeAirborne && police.stunLeft <= 0) {
        for (const ramp of ramps) {
          if (ramp.lane !== police.lane || !detectCityRushRampContact(police.distance, police.lane, ramp.trackDistance, ramp.lane)) continue;
          const takeoffSpeed = Math.max(14, police.currentSpeed || police.baseSpeed);
          police.jumpState = {
            active: true,
            startDistance: police.distance,
            totalDistance: computeCityRushJumpDistance(takeoffSpeed),
            maxHeight: computeCityRushJumpHeight(takeoffSpeed),
            takeoffSpeed,
            progress: 0,
          };
          policeAirborne = true;
          if (police.mesh.visible) {
            audioRef?.current?.rampJump?.({ pan: vehiclePan(police.id), speed: takeoffSpeed });
            emitPoliceSkidSmoke(police);
          }
          break;
        }
      }
      requests.push({
        id: police.id,
        lane: police.lane,
        x: police.currentX,
        width: police.width,
        distance: before,
        nextDistance: before + police.currentSpeed * dt,
        jumping: policeAirborne,
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
      const blocker = car.blockedBy
        ? trafficCars.find((item) => item.id === car.blockedBy)
          || patrolCars.find((item) => item.id === car.blockedBy)
          || null
        : null;
      if (blocker) applyTrafficImpact(car.id, blocker);
    }
    let nearest = Infinity;
    const landedPolice = [];
    for (const police of pursuers) {
      const before = priorDistances.get(police.id);
      const priorX = priorXs.get(police.id);
      police.distance = resolvedById.get(police.id) ?? before;
      police.currentSpeed = dt > 0 ? Math.max(0, (police.distance - before) / dt) : police.currentSpeed;
      let policeLanded = false;
      if (police.jumpState?.active) {
        const jumpTraveled = police.distance - police.jumpState.startDistance;
        const progress = clamp(jumpTraveled / Math.max(1, police.jumpState.totalDistance), 0, 1);
        police.jumpState.progress = progress;
        if (progress < 1) {
          police.currentJumpY = computeCityRushJumpElevation(jumpTraveled, police.jumpState.totalDistance, police.jumpState.maxHeight);
          police.currentJumpPitch = computeCityRushJumpPitch(progress);
        } else {
          police.jumpState.active = false;
          police.currentJumpY = 0;
          police.currentJumpPitch = 0;
          policeLanded = true;
        }
      }
      const gap = police.distance - distance;
      const visible = police.active && gap > -CITY_RUSH_POLICE_VIEW_BEHIND && gap < 150;
      // Une rafale encaissée fait déraper la berline, comme les rivaux.
      const skid = skidOffset(police.skidLeft, police.skidDuration, police.skidSide || 1);
      police.mesh.visible = visible;
      police.mesh.position.set(
        police.currentX + skid + trackRelativeX(police.distance),
        trackRelativeY(police.distance) + (police.currentJumpY || 0) + (police.stunLeft > 0 ? 0.05 : 0),
        PLAYER_Z - gap * SCALE,
      );
      police.mesh.rotation.x = trackPitch(police.distance) + (police.currentJumpPitch || 0);
      // Toupie du stun héliporté pour la berline bombardée, comme les rivaux.
      police.mesh.rotation.y = trackYaw(police.distance) + cityRushStunSpin(police.stunLeft, police.stunTotal) + clamp((police.currentX - priorX) * -3.2 + skid * 0.22, -0.22, 0.22);
      const policeSkidRoll = police.vehicleType === 'police-suv' ? 0.085 : 0.045;
      const policeSkidFrequency = police.vehicleType === 'police-suv' ? 17 : 13;
      police.mesh.rotation.z = skidOffset(police.skidLeft, police.skidDuration, police.skidSide || 1, policeSkidRoll, policeSkidFrequency);
      if (visible && police.skidLeft > 0 && police.skidSmokeTimer <= 0) {
        emitPoliceSkidSmoke(police);
        police.skidSmokeTimer = POLICE_SKID_SMOKE_INTERVAL;
      }
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
        const policeMax = police.maxHealth || CITY_RUSH_POLICE_HEALTH;
        const ratio = clamp(police.health / policeMax, 0, 1);
        const remainingSquares = Math.ceil(clamp(police.health, 0, policeMax));
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
      if (policeLanded) landedPolice.push(police);
    }

    // Une patrouille qui touche le sol après un saut encaisse : l'atterrissage
    // lui coûte **deux carrés de vie** (`CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE`,
    // le prix d'un tir bleu), avec son boum et sa gomme. Elle n'est détruite —
    // tête-à-queue, explosion, carcasse en feu — que si sa barre tombe à zéro :
    // `damagePolice` appelle alors `destroyPolice` avec la même source
    // `'ramp-landing'`. Une berline neuve survit donc à deux sauts et part en
    // épave au troisième, un SUV blindé au cinquième ; la barre au-dessus du
    // toit, son flash et les flammes de dégâts racontent chaque atterrissage
    // encaissé, et la poursuite continue tant qu'il reste un carré.
    for (const police of landedPolice) {
      if (police.mesh.visible) {
        audioRef?.current?.rampLand?.({ pan: vehiclePan(police.id), speed: police.currentSpeed });
        emitPoliceSkidSmoke(police);
      }
      const healthBeforeLanding = Number(police.health) || 0;
      damagePolice(police, CITY_RUSH_POLICE_RAMP_LANDING_SOURCE, null);
      // Le saut qui ne tue pas est raconté quand même : la page et les
      // vérifications suivent la coque perdue à chaque atterrissage.
      if (police.active !== false) {
        getCallbacks().effect?.({
          type: 'police-ramp-landing',
          vehicleType: police.vehicleType || police.type || 'police',
          id: police.id,
          police: police.name,
          health: police.health,
          maxHealth: police.maxHealth || CITY_RUSH_POLICE_HEALTH,
          damage: healthBeforeLanding - Number(police.health),
          source: CITY_RUSH_POLICE_RAMP_LANDING_SOURCE,
          // Atterrissages restants avant la casse, barre actuelle comprise.
          landingsToDestroy: cityRushPoliceShotsLeft(police.health, CITY_RUSH_POLICE_RAMP_LANDING_SOURCE),
          destroyed: false,
        });
      }
    }

    // La sirène suit la proximité de la berline la plus proche : l'escouade
    // s'entend arriver avant d'entrer dans le cadre.
    audioRef?.current?.policeSiren?.({
      level: nearest === Infinity ? 0 : clamp(1 - (nearest - 14) / 96, 0, 1),
    });

    // L'AK-47 de la police part tout droit dans sa voie : elle ne tire que si
    // un ennemi occupe déjà ce chemin, et seulement après l'avoir gardé au
    // bout du canon le temps d'alignement (`CITY_RUSH_POLICE_AIM_TIME`). Le
    // pilote visé peut donc casser la mire en se décalant — sans cela, chaque
    // rafale touchait, et quinze carrés y passaient en une boucle.
    for (const police of pursuers) {
      if (!police.active || police.stunLeft > 0 || police.powerCooldown > 0
        || !isCityRushPowerCharged(police.inventory, CITY_RUSH_POWERS.PISTOL)) {
        police.aimLeft = 0;
        police.aimTargetId = null;
        continue;
      }
      const target = firstEnemyOnLane(police.id);
      const aligned = Boolean(target) && cityRushPoliceAimAligned({
        x: target.x,
        laneX: laneX(police.lane),
      });
      if (!aligned) {
        police.aimLeft = 0;
        police.aimTargetId = target?.id || null;
        continue;
      }
      if (police.aimTargetId !== target.id) {
        police.aimTargetId = target.id;
        police.aimLeft = 0;
        // Un avis, pas un feu d'artifice : la page prévient le pilote visé
        // qu'une berline le tient dans sa mire (au plus un message toutes les
        // `CITY_RUSH_POLICE_AIM_NOTICE_COOLDOWN` secondes).
        if (target.id === 'player' && policeAimNoticeCooldown <= 0) {
          policeAimNoticeCooldown = CITY_RUSH_POLICE_AIM_NOTICE_COOLDOWN;
          getCallbacks().effect?.({
            type: 'police-aim',
            id: police.id,
            police: police.name,
            duration: CITY_RUSH_POLICE_AIM_TIME,
            lap,
          });
        }
      }
      police.aimLeft = cityRushPoliceAimHold({ aim: police.aimLeft, aligned: true, dt });
      if (!cityRushPoliceAimReady(police.aimLeft)) continue;
      fireAsPolice(police);
      police.aimLeft = 0;
      police.aimTargetId = null;
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
    // on ne se rabat pas sur leur capot. Le verrou juge les **carrosseries**,
    // pas les boîtes de contact du trafic (`CITY_RUSH_TRAFFIC_HITBOX_SCALE`) :
    // c'est une règle de rabattement (une distance de sécurité, 4,8 m), plus
    // stricte que le choc qu'elle évite — la boîte resserrée sert au contact
    // facturé, pas à autoriser un rabat sur un pare-chocs.
    const obstacles = [
      ...rollingTraffic().map((traffic) => ({ lane: traffic.lane, x: traffic.currentX, width: traffic.width, distance: traffic.distance })),
      // Le trafic venant en face bloque aussi la voie : on ne se rabat pas
      // sous le capot d'un véhicule qui arrive face à soi.
      ...oncomingCars.filter((oncoming) => !oncoming.rallied && !oncoming.destroyed)
        .map((oncoming) => ({ lane: oncoming.lane, x: oncoming.currentX, width: oncoming.width, distance: oncoming.distance })),
      ...activePursuers().filter((police) => police.id !== actorId)
        .map((police) => ({ lane: police.lane, x: police.currentX, width: police.width, distance: police.distance })),
      // Les pilotes se traversent entre eux, mais pas une berline : celle-ci
      // attend d'être franchement devant (ou derrière) pour se rabattre, sinon
      // elle se percuterait au lieu de bloquer.
      ...(policeActor ? [
        { lane: playerLane, x: playerCar.position.x, width: playerCollisionWidth(), distance },
        ...activeRacers().map((racer) => ({ lane: racer.lane, x: racer.mesh.position.x, width: racerCollisionWidth(racer), distance: racer.distance })),
      ] : []),
      // Une berline de patrouille lâchée à côté du pilote ferme la voie comme
      // le trafic : le choc latéral (`trySideBump`) la pousse. Les rivaux, eux,
      // restent traversables, comme avant.
      ...(actorId === 'player'
        ? patrolCars.map((patrol) => ({ lane: patrol.lane, x: patrol.currentX, width: Number(patrol.width) || 1.94, distance: patrol.distance }))
        : []),
    ];
    return obstacles.every((other) => {
      const approachingLane = other.lane === targetLane || Math.abs(other.x - targetX) < (actorWidth + other.width) / 2;
      return !approachingLane || Math.abs(other.distance - actorDistance) >= CITY_RUSH_CAR_GAP;
    });
  }

  function trafficImpactEscapeLane(traffic) {
    const nearby = [
      ...activeRacers().map((racer) => ({ lane: racer.lane, distance: racer.distance, x: racer.currentX, width: 1.9 * 0.92 * racer.profile.widthScale })),
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

  // ── Choc latéral : pousser la voiture qui bloque ───────────────────────
  // Le pilote tourne vers une voiture à côté de lui, dans la voie voisine : la
  // voie lui est refusée (`canEnterLane`), et c'est le choc. La voiture
  // bloquante se pousse sur la voie voisine, du côté opposé au pilote, avec le
  // petit choc du carambolage (flash, étincelles, dérapage). Le pilote et elle
  // perdent un carré : un PV pour un rival ou une berline de police, rien pour
  // le trafic ordinaire. Les règles (voie d'arrivée, un seul choc par
  // côte-à-côte) sont dans `cityRushSideBumpChoice` et `cityRushSideBumpKeep`.

  // Les voitures que le choc latéral peut toucher, avec ce qu'il faut pour les
  // pousser : voie, écart au pilote, voies de leur sens de circulation et nature
  // du choc. Les rivaux se traversent (voir `canEnterLane`) : ils n'en font pas
  // partie. Les SUV de charge, les voitures en demi-tour ou en vol n'entrent
  // pas non plus dans ce décompte.
  function sideBumpRoster() {
    const directionLanes = (lane) => (oncomingLanes.includes(lane) ? oncomingLanes : forwardLanes);
    return [
      ...rollingTraffic().map((traffic) => ({
        id: traffic.id, name: traffic.name, lane: traffic.lane, distance: traffic.distance,
        allowedLanes: directionLanes(traffic.lane),
        kind: isCityRushPoliceTrafficType(traffic.type) ? 'police-traffic' : 'traffic',
        car: traffic,
      })),
      ...patrolCars.map((patrol) => ({
        id: patrol.id, name: patrol.name, lane: patrol.lane, distance: patrol.distance,
        allowedLanes: directionLanes(patrol.lane), kind: 'patrol', car: patrol,
      })),
      ...oncomingCars
        .filter((oncoming) => !oncoming.rallied && !oncoming.destroyed && !oncoming.charge && !oncoming.turnaroundState)
        .map((oncoming) => ({
          id: oncoming.id, name: oncoming.name, lane: oncoming.lane, distance: oncoming.distance,
          allowedLanes: directionLanes(oncoming.lane),
          kind: isCityRushPoliceTrafficType(oncoming.type) ? 'police-oncoming' : 'oncoming',
          car: oncoming,
        })),
      ...activePursuers()
        .filter((police) => !police.jumpState?.active && (police.health ?? 1) > 0)
        .map((police) => ({
          id: police.id, name: police.name, lane: police.lane, distance: police.distance,
          allowedLanes: directionLanes(police.lane), kind: 'police', car: police,
        })),
    ];
  }

  // Une tentative de rabattement sur une voie occupée à côté du pilote : si une
  // voiture s'y trouve, qu'elle n'a pas déjà été poussée pendant ce côte-à-côte
  // et qu'une voie libre l'attend de son côté, elle est poussée. Sinon, rien.
  function trySideBump(targetLane) {
    if (!active || finished || playerWrecked || playerStunLeft > 0 || playerJumpState.active) return false;
    const choice = cityRushSideBumpChoice({
      playerLane,
      playerDistance: distance,
      targetLane,
      cars: sideBumpRoster(),
      pushedIds: sideBumpContacts,
    });
    if (!choice) return false;
    const { car: blocker, farLane } = choice;
    applySideBump(blocker, farLane);
    sideBumpContacts.add(blocker.id);
    return true;
  }

  function applySideBump(blocker, farLane) {
    const car = blocker.car;
    const fromLane = blocker.lane;
    // La voiture part du côté où elle se trouve déjà : le pilote, lui, est
    // repoussé de l'autre côté.
    const side = Math.sign(fromLane - playerLane) || 1;
    car.lane = farLane;
    if (blocker.kind === 'traffic' || blocker.kind === 'police-traffic' || blocker.kind === 'patrol') {
      // Même rabat que le trafic heurté (`applyTrafficImpact`) : la voie visée
      // passe avant le flot pendant le glissement.
      car.impactLeft = CITY_RUSH_TRAFFIC_IMPACT_DURATION;
      car.impactCooldownLeft = CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN;
      car.impactChanging = true;
      car.impactFromLane = fromLane;
      car.impactTargetLane = farLane;
    } else if (blocker.kind === 'oncoming' || blocker.kind === 'police-oncoming') {
      car.impactCooldownLeft = Math.max(Number(car.impactCooldownLeft) || 0, CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN);
    } else if (blocker.kind === 'police') {
      // Berline de l'escouade : dérapage court et voie tenue un instant avant
      // qu'elle ne repense sa trajectoire.
      const skid = Math.max(CITY_RUSH_SIDE_BUMP_SKID, Number(car.skidLeft) || 0);
      car.skidLeft = skid;
      car.skidDuration = skid;
      car.skidSide = side;
      car.skidSmokeTimer = 0;
      car.changeIn = Math.max(Number(car.changeIn) || 0, CITY_RUSH_SIDE_BUMP_HOLD);
      car.collisionCooldownLeft = Math.max(Number(car.collisionCooldownLeft) || 0, CITY_RUSH_SIDE_BUMP_HOLD);
    }

    // Le pilote encaisse le choc : dérapage court, à l'opposé de la voiture.
    const playerSkid = Math.max(CITY_RUSH_SIDE_BUMP_SKID, Number(playerSkidLeft) || 0);
    playerSkidLeft = playerSkid;
    playerSkidDuration = playerSkid;
    playerSkidSide = -side;
    cameraKick = Math.max(cameraKick, 0.5);
    spawnTrafficImpact('player', car.id);
    audioRef?.current?.skid({ pan: vehiclePan(car.id), intensity: 1.05, duration: 0.82 });

    const victim = blocker.kind.startsWith('police') ? 'police'
      : blocker.kind === 'oncoming' ? 'oncoming' : 'traffic';
    // Un contact comme les autres : il compte pour les missions (« zéro contact »)
    // et pour le compteur de l'écran, même quand le répit empêche la perte de PV.
    playerVehicleContacts += 1;
    // Le carré du pilote, s'il en perd un (le répit de choc peut courir encore).
    // Côte à côte, la voiture peut être très légèrement derrière : c'est l'écart
    // en valeur absolue qui est annoncé, comme pour un choc frontal.
    const healthLost = applyCarCollision({
      victim,
      name: blocker.name,
      id: blocker.id,
      gap: Math.abs(blocker.distance - distance),
      lane: farLane,
      source: 'collision',
      sideBump: true,
    });
    // La voiture bloquante paie son carré, comme dans un carambolage : un PV
    // pour une voiture de police qui en a, rien pour le trafic ordinaire.
    const hitContext = {
      victim,
      sideBump: true,
      playerHealthLost: healthLost,
      playerHealth,
      playerHealthMax: playerMaxHealth,
    };
    if (blocker.kind === 'police' || blocker.kind === 'police-oncoming') {
      damagePolice(car, 'collision', 'player', hitContext);
    } else if (blocker.kind === 'police-traffic') {
      // Une ronde touchée rejoint la poursuite (comme `checkPoliceRally`), puis
      // encaisse son carré.
      const rallied = rallyTrafficPolice(car, 'player', { victim: 'police', sideBump: true });
      if (rallied) damagePolice(rallied, 'collision', 'player', hitContext);
    }

    getCallbacks().effect?.({
      type: 'side-bump',
      target: 'TOI',
      traffic: blocker.name,
      trafficId: blocker.id,
      kind: blocker.kind,
      fromLane,
      lane: farLane,
      victim,
      healthLost,
      health: playerHealth,
      maxHealth: playerMaxHealth,
    });
    emitHud(true);
  }

  // Chaque image : une voiture qui n'est plus à la même hauteur que le pilote
  // sort de son épisode, et un prochain côte-à-côte sera à nouveau un choc.
  function pruneSideBumpContacts() {
    if (!sideBumpContacts.size) return;
    const kept = cityRushSideBumpKeep(sideBumpContacts, sideBumpRoster(), playerLane, distance);
    if (kept.size === sideBumpContacts.size) return;
    sideBumpContacts.clear();
    kept.forEach((id) => sideBumpContacts.add(id));
  }

  function applyTrafficImpact(racerId, traffic, contact = null) {
    if (!traffic || traffic.impactCooldownLeft > 0 || traffic.impactChanging) return false;
    const racer = racerId === 'player' ? null : racers.find((item) => item.id === racerId);
    const squadCar = racerId === 'player' || racer ? null : policeCars.find((item) => item.id === racerId);
    // Un rival qui emboutit une berline de ronde la sort de sa patrouille :
    // exactement le réflexe du pilote (`checkPoliceRally`), mais le contact
    // ouvre en plus son dossier — trois étoiles et sa berline dédiée. Le
    // contrôle passe **avant** le rabattement : un choc refusé faute de voie
    // libre reste un choc, et le dossier du rival ne dépend pas de la place que
    // la berline heurtée peut se faire dans le flot.
    let rivalPoliceContact = false;
    if (racer && !traffic.rallied && isCityRushPoliceTrafficType(traffic.type)) {
      rivalPoliceContact = Boolean(rallyTrafficPolice(traffic, racer.id, {
        victim: 'police',
        racer: racer.name,
      }));
      registerPoliceRetaliation(racer.id, 'collision', { reason: 'police-contact' });
    }
    const escapeLane = trafficImpactEscapeLane(traffic);
    if (escapeLane === traffic.lane) return rivalPoliceContact;

    traffic.impactLeft = CITY_RUSH_TRAFFIC_IMPACT_DURATION;
    traffic.impactCooldownLeft = CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN;
    traffic.impactChanging = true;
    traffic.impactFromLane = traffic.lane;
    traffic.impactTargetLane = escapeLane;
    traffic.lane = escapeLane;

    const label = racerId === 'player' ? 'TOI' : racer?.name || 'RIVAL';
    // Le carré perdu par le pilote, s'il en perd un : le répit de choc peut
    // encore courir après un premier carambolage.
    let healthLost = 0;
    if (racerId === 'player') {
      playerTrafficImpactLeft = Math.max(playerTrafficImpactLeft, CITY_RUSH_TRAFFIC_IMPACT_DURATION);
      playerSkidLeft = Math.max(playerSkidLeft, 0.85);
      cameraKick = Math.max(cameraKick, 0.58);
      // Rattraper une voiture lente se paie d'un carré (voir `applyCarCollision`).
      healthLost = applyCarCollision({
        victim: 'traffic',
        name: traffic.name,
        id: traffic.id,
        // L'écart annoncé est celui du contact, relevé avant le mouvement de
        // l'image (`previousGap`) : le pilote arrive sur une voiture qui est
        // devant lui, jamais sur une qu'il vient de dépasser. Les rares appels
        // sans contact (berline poussée dans le trafic) gardent l'écart du jour.
        gap: Number.isFinite(Number(contact?.previousGap))
          ? Number(contact.previousGap)
          : traffic.distance - distance,
        lane: traffic.lane,
      });
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
      // La page annonce le carré perdu ; le monde reste muet quand le pilote
      // n'a rien perdu (répit en cours), la barre l'ayant déjà montré.
      ...(racerId === 'player' ? {
        victim: 'traffic',
        healthLost,
        health: playerHealth,
        maxHealth: playerMaxHealth,
      } : {}),
    });
    return true;
  }

  // ── Choc frontal avec le trafic venant en face ────────────────────────
  // Collision solide : le pilote est ralenti et la voiture adverse dévie d'une
  // voie au plus, en restant sur la chaussée.
  function applyOncomingImpact(actorId, oncoming) {
    if (actorId === 'player') playerVehicleContacts += 1;
    const racerActor = actorId === 'player' ? null : racers.find((item) => item.id === actorId) || null;
    // Un rival heurte une patrouille de face : elle se retourne pour lui comme
    // elle le ferait pour le pilote, et l'adversaire ouvre son dossier — son
    // contact vaut trois étoiles, sans toucher à la recherche du joueur.
    const policeContact = (actorId === 'player' || Boolean(racerActor))
      && isCityRushPoliceTrafficType(oncoming.type);
    if (policeContact) {
      // Une patrouille (y compris banalisée) heurtée de face se retourne, puis
      // occupe l'une des places de la poursuite déclenchée à trois étoiles.
      beginOncomingPoliceTurnaround(oncoming, { asBackup: false, targetId: actorId });
      if (racerActor) registerPoliceRetaliation(racerActor.id, 'collision', { reason: 'police-contact' });
      else raiseWantedLevel({ police: true, reason: 'police-contact' });
    }
    oncoming.impactCooldownLeft = CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN * 1.15;
    if (!policeContact && !oncoming.pushedAside) {
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
    // Distance entre les deux voitures au moment du choc, prise **avant** le
    // recalage solide qui repousse le pilote : en face-à-face, les carrosseries
    // se croisent au mètre près et l'écart signé ne veut rien dire — c'est la
    // magnitude qui est annoncée.
    const contactGap = actorId === 'player' ? Math.abs(oncoming.distance - distance) : null;
    // Le carré perdu par le pilote, s'il en perd un (le répit de choc peut être
    // encore armé après un premier carambolage).
    let healthLost = 0;

    if (actorId === 'player') {
      // Choc frontal = plus punitif que le trafic lent : impact + ralenti long + reprise boostée
      // + blocage solide : on recale le joueur derrière la voiture adverse.
      // C'est aussi le prix du contresens : la jauge de vitesse cumulée que le
      // pilote chargeait dans les voies inverses est perdue net.
      if (playerOncomingTime > 0) {
        playerOncomingTime = 0;
        playerOncomingStage = 'none';
        getCallbacks().effect?.({ type: 'oncoming-bonus', stage: 'lost', lane: playerLane });
      }
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
        playerCurrentSpeed = Math.min(playerCurrentSpeed, paced(6));
        currentSpeed = Math.min(currentSpeed, paced(6));
      }
      // Un choc frontal se paie aussi d'un carré (voir `applyCarCollision`) ;
      // le SUV d'interception, lui, en coûte deux comme celui de l'escouade.
      const chargeSuv = oncoming.vehicleType === CITY_RUSH_SUV_CHARGE_TYPE;
      healthLost = applyCarCollision({
        victim: 'oncoming',
        name: oncoming.name,
        id: oncoming.id,
        gap: contactGap,
        lane: oncoming.lane,
        policeContact,
        source: chargeSuv ? 'suv-collision' : 'collision',
      });
      if (chargeSuv) {
        // Même secousse de caisse que le SUV de l'escouade : le choc est lourd.
        playerSuvImpactLeft = PLAYER_POLICE_SUV_RAM_IMPACT_DURATION;
        playerSuvImpactSide = side;
        cameraKick = Math.max(cameraKick, 1.35);
        spawnPoliceSuvCollisionSparks(oncoming);
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
      pushedAside: !policeContact,
      policeContact,
      // Le SUV d'interception se nomme dans le bandeau : c'est lui qui fait
      // demi-tour et prend le pilote en chasse.
      vehicleType: oncoming.vehicleType || null,
      isSuv: oncoming.vehicleType === CITY_RUSH_SUV_CHARGE_TYPE,
      // La voiture heurtée dérape vers le bord extérieur de son sens de
      // circulation : à gauche quand on roule à droite, à droite à Londres et
      // sur la Shuto (voir `cityRushOncomingImpactX`).
      pushDirection: driveSide === 'left' ? 'right' : 'left',
      ...(actorId === 'player' ? {
        victim: 'oncoming',
        healthLost,
        health: playerHealth,
        maxHealth: playerMaxHealth,
      } : {}),
    });
  }

  function checkOncomingImpacts(oncoming, priorOncomingDistance = null, priorActorDistances = null) {
    if (oncoming.impactCooldownLeft > 0) return;
    const priorOncoming = Number.isFinite(priorOncomingDistance) ? priorOncomingDistance : oncoming.distance;
    const priorMap = priorActorDistances instanceof Map ? priorActorDistances : null;

    const actors = [
      { id: 'player', x: playerCar.position.x, width: playerCollisionWidth(), distance, priorDistance: priorMap?.get('player') ?? distance, jumping: Boolean(playerJumpState.active) },
      ...activeRacers().map((racer) => ({
        id: racer.id,
        x: racer.mesh.position.x,
        width: racerCollisionWidth(racer),
        distance: racer.distance,
        priorDistance: priorMap?.get(racer.id) ?? racer.distance,
        jumping: Boolean(racer.jumpState?.active),
      })),
      ...activePursuers().map((police) => ({
        id: police.id,
        x: police.mesh.position.x,
        width: police.width,
        distance: police.distance,
        priorDistance: police.distance,
      })),
    ];

    // Le véhicule du contresens est jugé sur sa **boîte de contact**
    // (`CITY_RUSH_TRAFFIC_HITBOX_SCALE`), comme le trafic lent : le croiser de
    // justesse ne coûte plus un carré.
    const oncomingWidth = cityRushTrafficHitboxWidth(oncoming.width);

    for (const actor of actors) {
      if (actor.jumping) continue;
      const gapAfter = oncoming.distance - actor.distance;
      const gapBefore = priorOncoming - (Number.isFinite(actor.priorDistance) ? actor.priorDistance : actor.distance);
      const lateralOverlap = Math.abs(actor.x - oncoming.currentX) < (actor.width + oncomingWidth) / 2;
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
    // Réapparaît loin devant, sur l'une des trois voies du contresens, sans se
    // coller à un autre véhicule venant en face dans la même voie.
    const lane = oncomingLanes[Math.floor(Math.random() * oncomingLanes.length)];
    // Sur route très peu fréquentée, les véhicules venant en face sont
    // encore plus rares et mieux espacés. Les SUV de charge ne comptent pas :
    // ils ne font pas partie du flot et ne se recyclent pas ici.
    const lightOncoming = oncomingCars.filter((car) => !car.charge).length <= 1;
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
    // Le relâchement de la gâchette doit être accepté même en pause ou après
    // l'arrivée, sinon un bouton tactile capturé pourrait rester en maintien.
    if (name === 'pistol-up') {
      releasePistolKey();
      return true;
    }
    if (!active || finished) return false;
    if (name === 'left' || name === 'right') {
      // Immobilisée après l'épave : la voiture part en toupie et le volant ne
      // répond plus jusqu'à la fin de l'animation.
      if (playerStunLeft > 0) return;
      // En plein saut, la voiture garde la voie de son décollage : une voiture
      // en l'air ne se décale pas (voir `cityRushLaneAfterAction`).
      const nextLane = cityRushLaneAfterAction(playerLane, name, laneCount, { airborne: playerJumpState.active });
      // Même chemin pour le pilote et pour la démonstration : `changePlayerLane`
      // tient le journal du tutoriel (écart de voie, esquive).
      // Voie refusée parce qu'une voiture est à côté : le pilote a tourné vers
      // elle, c'est le choc latéral qui la pousse (voir `trySideBump`).
      if (!changePlayerLane(nextLane) && nextLane !== playerLane) trySideBump(nextLane);
      return;
    }
    if (name === 'pistol-down') return fireHeldWeapon();
    // Un coup sec (clavier Entrée/Espace, clic sans maintien) : un seul départ
    // de coup, sans armer la rafale.
    if (name === 'pistol-tap') return fireHeldWeapon({ hold: false });
    if (name === 'bazooka' || name === 'use_bazooka') return useBazooka();
    const aliases = {
      use_pistol: CITY_RUSH_POWERS.PISTOL,
      pistol: CITY_RUSH_POWERS.PISTOL,
      use_shotgun: CITY_RUSH_POWERS.SHOTGUN,
      shotgun: CITY_RUSH_POWERS.SHOTGUN,
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
      // Leçon turbo : le cercle vert au sol validé au contact.
      noteTutorialAction('boost');
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

    if (type === CITY_RUSH_PICKUPS.HEALTH) {
      const healthBefore = playerHealth;
      playerHealth = cityRushHealthPickupRepair(playerHealth, playerMaxHealth);
      const healthRestored = playerHealth - healthBefore;
      if (healthRestored <= 0) return;
      playerHealthFlash = 0;
      score += 100;
      pickedUp += 1;
      audioRef?.current?.pickup?.(type, { ready: true });
      getCallbacks().effect?.({
        type: 'player-health-pickup',
        healthBefore,
        health: playerHealth,
        maxHealth: playerMaxHealth,
        healthRestored,
        lane,
      });
      getCallbacks().pickup?.({
        type,
        progress: healthRestored,
        chargeCost: CITY_RUSH_HEALTH_PICKUP_RESTORE,
        ready: true,
        newlyReady: true,
        autoActivated: true,
        health: playerHealth,
        maxHealth: playerMaxHealth,
        healthRestored,
        lane,
      });
      emitHud(true);
      return;
    }

    const before = inventory[type] || 0;
    const weapon = cityRushIsWeaponType(type);
    const pickupAmount = weapon ? cityRushWeaponAmmoPerPickup(type) : 1;
    const previousWeapon = heldWeapon();
    if (weapon) {
      // Un seul emplacement d'arme : le bonus pris occupe la place et **vide
      // l'autre** — la roquette du bazooka comprise, qui se tire avec le même
      // bouton. La cadence repart de zéro — une arme fraîchement ramassée ne
      // doit pas hériter du réarmement de celle qu'elle remplace.
      inventory = cityRushEquipWeapon(inventory, type, pickupAmount);
      bazookaAmmo = 0;
      pistolHoldCooldown = 0;
      if (type === CITY_RUSH_POWERS.PISTOL) playerPistolPickups += 1;
    } else {
      inventory = addCityRushCharge(inventory, type, pickupAmount);
    }
    const chargeCost = CITY_RUSH_POWER_RULES[type].chargeCost;
    const progress = inventory[type];
    const ready = weapon ? progress > 0 : progress >= chargeCost;
    const wasReady = weapon ? before > 0 : before >= chargeCost;
    const newlyReady = !wasReady && ready;
    const autoActivated = ready && CITY_RUSH_POWER_RULES[type].automatic;
    score += type === 'radio' ? 180 : type === 'shotgun' ? 165 : type === 'pistol' ? 150 : type === CITY_RUSH_POWERS.BLUE_SHOT ? 125 : 100;
    pickedUp += 1;
    // Bip de ramassage (aigu quand la jauge vient de se remplir) : seul le
    // joueur en bénéficie, les rivaux remplissent leur inventaire en silence.
    audioRef?.current?.pickup(type, { ready: newlyReady });
    getCallbacks().pickup?.({
      type,
      progress,
      chargeCost,
      ammo: weapon ? pickupAmount : null,
      ready,
      newlyReady,
      autoActivated,
      lane,
      // Le HUD raconte l'échange : quelle arme est tombée, quelle arme est en main.
      swapped: weapon && Boolean(previousWeapon) && previousWeapon.type !== type,
      dropped: previousWeapon?.type || null,
    });
    if (autoActivated) usePower(type);
    else emitHud(true);
  }

  function collectRacerPickup(racer, type) {
    if (type === CITY_RUSH_PICKUPS.HEALTH) {
      racer.health = cityRushHealthPickupRepair(racer.health, racer.maxHealth || cityRushCarMaxHealth(racer.profile));
      racer.healthFlash = 0;
      return;
    }
    if (type === CITY_RUSH_PICKUPS.BOOST) {
      racer.boostLeft = Math.max(racer.boostLeft, CITY_RUSH_TRACK_BOOST_DURATION);
      getCallbacks().effect?.({ type: 'rival-boost', rival: racer.name });
      return;
    }
    // Filet de sécurité : le fusil à pompe bleu est réservé au pilote. Un rival
    // ne le voit déjà plus dans son choix de voie (`canCollectCityRushPickup`
    // avec `player: false`), mais il ne doit jamais l'empocher non plus.
    if (type === CITY_RUSH_POWERS.SHOTGUN) return;
    racer.inventory = addCityRushCharge(
      racer.inventory,
      type,
      type === CITY_RUSH_POWERS.PISTOL ? CITY_RUSH_PISTOL_AMMO_PER_PICKUP : 1,
    );
  }

  // Un policier ne marque pas de points : il empoche le bonus, et la page
  // prévient quand un rouge ou un jaune est raflé sous le nez du joueur.
  function collectPolicePickup(police, type, lane) {
    if (type === CITY_RUSH_PICKUPS.HEALTH) {
      police.health = cityRushHealthPickupRepair(
        police.health,
        police.maxHealth || cityRushPoliceMaxHealth(police.vehicleType || police.type),
      );
      police.healthFlash = 0;
      return;
    }
    if (type === CITY_RUSH_PICKUPS.BOOST) {
      police.boostLeft = Math.max(police.boostLeft || 0, CITY_RUSH_TRACK_BOOST_DURATION);
      return;
    }
    // Même filet que pour les rivaux : la police ne porte jamais le pompe.
    if (type === CITY_RUSH_POWERS.SHOTGUN) return;
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
      { id: 'player', distance, lane: playerLane, speed: currentSpeed, health: playerHealth, maxHealth: playerMaxHealth },
      ...activeRacers().map((racer) => ({
        id: racer.id,
        distance: racer.distance,
        lane: racer.lane,
        speed: racer.stunLeft > 0 ? 0 : racer.baseSpeed,
        health: racer.health,
        maxHealth: racer.maxHealth || cityRushCarMaxHealth(racer.profile),
        racer,
      })),
      // La police peut charger sa mitrailleuse ou reprendre un carré comme les pilotes.
      ...activePursuers().map((police) => ({
        id: police.id,
        distance: police.distance,
        lane: police.lane,
        speed: police.currentSpeed,
        health: police.health,
        maxHealth: police.maxHealth || cityRushPoliceMaxHealth(police.vehicleType || police.type),
        racer: police,
        police: true,
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
        // Un cercle turbo ne flotte pas : il est peint au sol. Il ne tangue et ne
        // pivote donc pas — un décalque qui tournerait sur lui-même se
        // décollerait de sa voie à chaque virage. Il respire, c'est tout :
        // l'anneau s'ouvre en s'éteignant puis se referme en reprenant de
        // l'éclat, sur une simple sinusoïde, sans à-coup d'un cycle à l'autre.
        // Le disque, lui, reste exactement où la peinture l'a posé.
        if (slot.userData.ground) {
          const breath = Math.sin(elapsed * 2.6 + slot.userData.phase);
          slot.position.y = PICKUP_GROUND_HEIGHT;
          slot.userData.pulse.scale.set(1 + breath * 0.13, 1 + breath * 0.13, 1);
          slot.userData.pulseMaterial.opacity = 0.42 + breath * 0.34;
          return;
        }
        // Les bonus flottants, eux, s'animent : léger tangage, balancement de
        // l'icône, anneau du sol qui tourne et halo qui respire.
        const bob = Math.sin(elapsed * 4.1 + slot.userData.phase) * 0.12;
        slot.position.y = PICKUP_FLOAT_HEIGHT + bob;
        slot.rotation.y = Math.sin(elapsed * 2.5 + slot.userData.phase) * 0.12;
        slot.userData.ring.rotation.z += dt * 1.4;
        slot.userData.halo.scale.setScalar(1 + Math.sin(elapsed * 3.2 + slot.userData.phase) * 0.12);
      });

      // Un bonus ramassé disparaît 0,1 s puis réapparaît sur sa voie : la
      // voiture suivante peut le prendre. Un pilote déjà chargé ignore le rouge
      // même si ce bonus reste visible pour un autre participant.
      for (const participant of participants) {
        if (row.crossedRacers.has(participant.id)) continue;
        const crossingWindow = Math.max(1.15, participant.speed * dt * 0.65);
        if (Math.abs(participant.distance - row.trackDistance) > crossingWindow) continue;
        row.crossedRacers.add(participant.id);
        // Entraînement guidé : le coach valide la leçon sur le **passage**, pas
        // sur l'effet — une trousse traversée à coque pleine compte comme
        // démonstration, et un bonus raflé juste avant par la police ne prive
        // pas la voiture de sa réussite.
        if (participant.id === 'player' && tutorialMode && tutorialState === 'lesson') {
          const lesson = tutorialLesson();
          const crossedProp = lesson?.prop && row.pickups.some((pickup) => (
            pickup && pickup.type === lesson.prop && pickup.lane === participant.lane
          ));
          if (crossedProp) noteTutorialAction(tutorialPropActionByType[lesson.prop] || lesson.action);
        }
        const participantInventory = participant.id === 'player' ? inventory : participant.racer?.inventory;
        const pickupIndex = row.pickups.findIndex((item, index) => (
          item.lane === participant.lane
          && !isCityRushPickupHidden(row.pickupClaims, index, elapsed)
          && canCollectCityRushPickup(participantInventory, item.type, {
            redPickupsHidden: hideRedForRace,
            health: participant.health,
            maxHealth: participant.maxHealth,
            player: participant.id === 'player',
          })
        ));
        if (pickupIndex < 0) continue;
        markCityRushPickupTaken(row.pickupClaims, pickupIndex, elapsed, CITY_RUSH_PICKUP_RESPAWN_DELAY);
        const pickup = row.pickups[pickupIndex];
        const object = row.slots[pickupIndex];
        if (object) {
          // L'objet éclate à l'endroit exact où la voiture l'a touché. Un cercle
          // peint au sol remonte pourtant son flash à hauteur de capot : joué à
          // ras du bitume, il serait avalé par la voiture qui passe dessus.
          const burstY = object.userData.ground
            ? object.position.y + PICKUP_GROUND_BURST_LIFT
            : object.position.y;
          spawnPickupBurst(object.position.x, burstY, row.trackDistance, pickup.type);
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
    // Une berline encore en tête-à-queue explose avant que les effets ne soient
    // nettoyés : son boum est joué, et sa carcasse brûlera pendant le tour
    // d'honneur (`updatePoliceWrecks`).
    flushPoliceWrecks();
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
    // La herse quitte la route avec le drapeau à damier : ses voitures rangent
    // le dispositif et repartent devant.
    dismissSpikeBlock();
    miniGarages.forEach(placeMiniGarage);
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
    // Marge du pilote sur son meilleur poursuivant (négative s’il est battu) :
    // les défis « gagner avec X m d’avance » se jugent là-dessus.
    const playerEntry = standings.ordered.find((racer) => racer.id === 'player');
    const bestOtherEntry = standings.ordered.find((racer) => racer.id !== 'player');
    const finishMargin = playerEntry && bestOtherEntry
      ? Math.round((Number(playerEntry.distance) || 0) - (Number(bestOtherEntry.distance) || 0))
      : 0;
    getCallbacks().finish?.({
      city: city.id,
      duration: elapsed,
      distance: Math.round(distance),
      laps: effectiveLaps,
      sprint,
      checkpoints: sprint ? sprintCheckpoints : null,
      timedOut,
      destroyed,
      sabotaged: Boolean(options.sabotaged),
      rankAtBreakdown: storyRankAtBreakdown,
      healthLeft: Math.max(0, Math.round(playerHealth)),
      healthMax: playerMaxHealth,
      policeDestroyed: policeDestroyedTotal,
      shotsFired: playerShotsFired,
      hitsTaken: playerHitsTaken,
      vehicleContacts: playerVehicleContacts,
      margin: finishMargin,
      rank: destroyed ? ordered.length : standings.rank,
      winner: standings.leader?.name || '—',
      winnerId: standings.leader?.id || null,
      score,
      pickups: pickedUp,
      pistolPickups: playerPistolPickups,
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
        health: racer.health,
        maxHealth: racer.maxHealth || cityRushCarMaxHealth(racer.profile),
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

  function emitPoliceSkidSmoke(police) {
    const rearWheels = (police.mesh?.userData?.wheels || []).filter((wheel) => wheel.position.z > 0);
    for (const wheel of rearWheels) {
      wheel.getWorldPosition(scratch);
      smoke.emit(scratch, {
        color: 0xd2d4dc,
        opacity: 0.34,
        scale: 0.3,
        grow: 2.05,
        life: 0.5,
        velocity: [(police.skidSide || 1) * 0.45, 0.35, 0.8],
      });
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
    for (const racer of activeRacers()) {
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
      const speedRatio = clamp(currentSpeed / (playerTopSpeed * CITY_RUSH_TRACK_BOOST_SPEED_FACTOR), 0, 1);
      const shake = (playerStunLeft > 0 ? 0.14 : playerSlowLeft > 0 || playerBlueShotSlowLeft > 0 || playerSpikeSlowLeft > 0 ? 0.05 : 0) + cameraKick * 0.22;
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

  // Résolution adaptative. Pendant une course, on mesure le temps moyen d'image
  // par fenêtre d'une seconde. Deux fenêtres lentes de suite → on descend d'un
  // palier de résolution ; quatre fenêtres rapides de suite → on remonte. Les
  // premières secondes (compilation des shaders, chargement) sont ignorées et
  // l'hystérésis évite les allers-retours visibles.
  const RESOLUTION_STEPS = [1, 0.85, 0.7, 0.6];
  const SLOW_FRAME_SECONDS = 1 / 45;
  const FAST_FRAME_SECONDS = 1 / 57;
  let resolutionStep = 0;
  let resolutionWindowTime = 0;
  let resolutionWindowFrames = 0;
  let resolutionSlowWindows = 0;
  let resolutionFastWindows = 0;
  let resolutionWarmup = 1.5;
  function applyResolutionStep(step) {
    resolutionStep = step;
    renderer.setPixelRatio(Math.max(0.6, pixelRatioCap * RESOLUTION_STEPS[step]));
    resize();
  }
  function adaptResolution(dt) {
    if (!active || finished || dt <= 0) return;
    if (resolutionWarmup > 0) {
      resolutionWarmup -= dt;
      return;
    }
    resolutionWindowTime += dt;
    resolutionWindowFrames += 1;
    if (resolutionWindowTime < 1) return;
    const averageFrame = resolutionWindowTime / resolutionWindowFrames;
    resolutionWindowTime = 0;
    resolutionWindowFrames = 0;
    if (averageFrame > SLOW_FRAME_SECONDS) {
      resolutionFastWindows = 0;
      resolutionSlowWindows += 1;
      if (resolutionSlowWindows >= 2 && resolutionStep < RESOLUTION_STEPS.length - 1) {
        resolutionSlowWindows = 0;
        applyResolutionStep(resolutionStep + 1);
      }
    } else if (averageFrame < FAST_FRAME_SECONDS) {
      resolutionSlowWindows = 0;
      resolutionFastWindows += 1;
      if (resolutionFastWindows >= 4 && resolutionStep > 0) {
        resolutionFastWindows = 0;
        applyResolutionStep(resolutionStep - 1);
      }
    } else {
      resolutionSlowWindows = 0;
      resolutionFastWindows = 0;
    }
  }

  function update(time) {
    raf = requestAnimationFrame(update);
    const dt = Math.min(MAX_FRAME, Math.max(0, (time - lastFrame) / 1000));
    lastFrame = time;
    adaptResolution(dt);
    clockTime += dt;
    let worldTravel = 0;
    if (active && !finished) {
      pistolHoldCooldown = Math.max(0, pistolHoldCooldown - dt);
      // Le maintien du bouton enchaîne les tirs à la cadence de l'arme en main :
      // rafale pour l'AK-47, trois coups espacés pour le fusil à pompe.
      if (pistolKeyHeld && pistolHoldCooldown <= 0 && heldWeapon()) fireHeldWeapon();
      // Maintien des flèches : tant que ← / → (ou Q / D) reste enfoncé, un écart
      // repart à cadence régulière, sans attendre une nouvelle pression. Une
      // voie fermée (trafic, saut en cours, toupie) ne fait rien sur le coup :
      // le cran suivant retente sa chance, ce qui donne le glissement continu
      // attendu — la voiture se rabat dès que la voie s'ouvre.
      steerHoldCooldown = Math.max(0, steerHoldCooldown - dt);
      if (steerHoldDirection && steerHoldCooldown <= 0) {
        action(steerHoldDirection);
        steerHoldCooldown = STEER_HOLD_LANE_INTERVAL;
      }
      elapsed += dt;
      const priorDistance = distance;
      // Instantané du plateau actif pour cette image. Le complice déclenché par
      // un tir rejoint ces calculs à l'image suivante, après avoir été placé et
      // publié immédiatement au HUD.
      const racingRacers = activeRacers();
      const priorRacerDistances = new Map(racingRacers.map((racer) => [racer.id, racer.distance]));
      playerSlowLeft = Math.max(0, playerSlowLeft - dt);
      playerBlueShotSlowLeft = Math.max(0, playerBlueShotSlowLeft - dt);
      playerTrafficRecoverLeft = Math.max(0, playerTrafficRecoverLeft - dt);
      playerTrafficImpactLeft = Math.max(0, playerTrafficImpactLeft - dt);
      playerBoostLeft = Math.max(0, playerBoostLeft - dt);
      playerStunLeft = Math.max(0, playerStunLeft - dt);
      playerSkidLeft = Math.max(0, playerSkidLeft - dt);
      playerSuvImpactLeft = Math.max(0, playerSuvImpactLeft - dt);
      playerSpikeSlowLeft = Math.max(0, playerSpikeSlowLeft - dt);
      playerHealthFlash = Math.max(0, playerHealthFlash - dt);
      playerCollisionCooldownLeft = Math.max(0, playerCollisionCooldownLeft - dt);
      // Voie tenue sans bouger : le bonus de ligne propre monte doucement.
      playerCleanLineTime += dt;
      // Bonus de contresens : la jauge monte tant que la voiture roule dans une
      // voie en sens inverse, et retombe dès qu'elle revient dans le sens de la
      // course. Une voiture immobilisée (épave, toupie) ne charge plus rien.
      const inOncomingLane = playerStunLeft <= 0 && !playerWrecked && oncomingLaneSet.has(playerLane);
      playerOncomingTime = advanceCityRushOncomingBonus(playerOncomingTime, dt, inOncomingLane);
      const oncomingStage = playerOncomingTime <= 0
        ? 'none'
        : (playerOncomingTime >= CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION - 1e-9 ? 'full' : 'charging');
      if (oncomingStage !== playerOncomingStage) {
        if (oncomingStage === 'charging') {
          getCallbacks().effect?.({
            type: 'oncoming-bonus',
            stage: 'charging',
            lane: playerLane,
            factor: cityRushOncomingBonusFactor(playerOncomingTime),
          });
        } else if (oncomingStage === 'full') {
          getCallbacks().effect?.({
            type: 'oncoming-bonus',
            stage: 'full',
            lane: playerLane,
            factor: CITY_RUSH_ONCOMING_BONUS_MAX,
          });
        }
        playerOncomingStage = oncomingStage;
      }
      const speedScale = (playerSlowLeft > 0 || playerTrafficImpactLeft > 0 ? 0.63 : 1) * (playerBlueShotSlowLeft > 0 ? CITY_RUSH_BLUE_SHOT_SPEED_FACTOR : 1);
      // Pneus crevés par la herse : la vitesse visée tombe au facteur de la
      // règle (`cityRushSpikePace`) tant que la crevaison court.
      const spikeScale = playerSpikeSlowLeft > 0 ? cityRushSpikePace(1, CITY_RUSH_SPIKE_SLOW_FACTOR) : 1;
      const boostScale = playerBoostLeft > 0 ? CITY_RUSH_TRACK_BOOST_SPEED_FACTOR : 1;
      // Un changement de voie ne figure plus dans cette équation : seule la
      // voie tenue agit sur la vitesse, et uniquement à la hausse. Le
      // contresens s'y ajoute : c'est la récompense des voies les plus
      // dangereuses de la chaussée.
      const cleanLineScale = cityRushCleanLineFactor(playerCleanLineTime);
      const oncomingScale = cityRushOncomingBonusFactor(playerOncomingTime);
      const breakdownScale = storyBreakdownActive ? 0 : 1;
      // Le cap de la piste fixe la vitesse du virage ; à Vice City, il est lu
      // 40 m en avance pour que le freinage ait déjà commencé à l'entrée. Le
      // freinage habituel (`approachCityRushSpeed`) accompagne ensuite la sortie.
      const cornerScale = cornerPaceAt(distance);
      const targetPlayerSpeed = playerStunLeft > 0 ? 0 : playerTopSpeed * speedScale * spikeScale * boostScale * cleanLineScale * oncomingScale * breakdownScale * cornerScale;
      // L'accélération comme le freinage suivent le rythme du parcours : la
      // pointe est plus basse, la montée en régime garde sa durée.
      const requestedPlayerSpeed = approachCityRushSpeed(playerCurrentSpeed, targetPlayerSpeed, cityRushTrafficRecoveryRate(playerProfile.accelerationRate, playerTrafficRecoverLeft), dt, coursePace);
      const priorPlayerX = playerX;
      playerX = lerp(playerX, laneX(playerLane), Math.min(1, dt * 12));
      const playerSuvImpactAmount = playerWrecked
        ? 0
        : clamp(playerSuvImpactLeft / PLAYER_POLICE_SUV_RAM_IMPACT_DURATION, 0, 1);
      const playerSuvImpactProgress = 1 - playerSuvImpactAmount;
      const playerSuvImpactYaw = playerSuvImpactAmount > 0
        ? Math.sin(playerSuvImpactProgress * Math.PI * 4) * playerSuvImpactAmount * 0.85 * playerSuvImpactSide
        : 0;
      // Le décalage transmis au résolveur de collisions reste celui du
      // dérapage habituel ; l'animation SUV plus ample se joue sur la caisse.
      const playerSkid = skidOffset(playerSkidLeft, playerSkidDuration, playerSkidSide);

      const requestedRacerSpeeds = new Map();
      const priorRacerXs = new Map();
      const aiPickups = new Map(racingRacers.map((racer) => [
        racer.id,
        visiblePickups(racer.inventory, racer.health, racer.maxHealth || cityRushCarMaxHealth(racer.profile), { player: false }),
      ]));
      // Les rivaux courent pour gagner : distance du leader de la course (le
      // pilote compris), et voie, tremplins et armes sont relus dans ce sens.
      const raceLeaderDistance = Math.max(distance, ...racingRacers.map((racer) => racer.distance));
      const aiRamps = ramps.map((ramp) => ({ lane: ramp.lane, distance: ramp.trackDistance }));
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
        ...oncomingCars.filter((oncoming) => !oncoming.rallied && !oncoming.destroyed)
          .map((oncoming) => ({ lane: oncoming.lane, distance: oncoming.distance, speed: -oncoming.currentSpeed, oncoming: true })),
      ];
      for (const racer of racingRacers) {
        racer.healthFlash = Math.max(0, (racer.healthFlash || 0) - dt);
        // Une épave, une cible immobilisée ou une voiture en plein saut ne
        // choisit pas de nouvelle voie : en l'air, personne ne se décale.
        const racerAirborne = Boolean(racer.jumpState?.active);
        const racerCanThink = !racer.wrecked && racer.stunLeft <= 0 && (racer.spinLeft || 0) <= 0 && !racerAirborne;
        if (racerCanThink) racer.changeIn -= dt;
        // Réflexe : un obstacle qui bouche sa voie rappelle le cerveau sans
        // attendre la fin du délai de décision. Un bon pilote freine des deux
        // pieds *avant* de choisir où passer — c'est ce qui sépare un rival qui
        // évite le trafic d'un rival qui s'y encastre à 0,6 s près.
        if (racerCanThink && racer.changeIn > CITY_RUSH_AI_REFLEX && cityRushAiLaneBlocked({
          lane: racer.lane,
          distance: racer.distance,
          speed: racer.currentSpeed || racer.baseSpeed,
          traffic: aiTraffic,
          ramps: aiRamps,
          laneCount,
          // Chaque rival freine au taux de **son** modèle : une supercar juge
          // une voie bouchée plus tard qu'une citadine, exactement comme le
          // joueur au volant de la même voiture.
          brakingRate: cityRushAiBrakingRate(racer.profile.accelerationRate),
        })) {
          racer.changeIn = Math.min(racer.changeIn, cityRushAiThinkDelay(Math.random, {
            urgent: true,
            missionTarget: missionFugitiveIds.has(racer.id),
          }));
        }
        if (racerCanThink && racer.changeIn <= 0) {
          const availableLanes = [racer.lane];
          for (const lane of [racer.lane - 1, racer.lane + 1]) {
            if (lane >= 0 && lane < laneCount && canEnterLane(racer.id, lane)) availableLanes.push(lane);
          }
          // Les autres pilotes sont des concurrents : ils n'ont pas leur place
          // dans `traffic` (les voitures de course se traversent), ils servent à
          // doubler et à se répartir la chaussée.
          const otherRacers = [
            { lane: playerLane, distance, speed: currentSpeed, id: 'player', wrecked: playerWrecked },
            ...racingRacers.filter((other) => other.id !== racer.id)
              .map((other) => ({ lane: other.lane, distance: other.distance, speed: other.currentSpeed || other.baseSpeed, id: other.id, wrecked: other.wrecked })),
          ];
          const weaponReady = isCityRushPowerCharged(racer.inventory, CITY_RUSH_POWERS.PISTOL);
          const nextLane = chooseCityRushAiLane({
            currentLane: racer.lane,
            laneCount,
            oncomingLanes,
            distance: racer.distance,
            speed: racer.currentSpeed || racer.baseSpeed,
            availableLanes,
            pickups: aiPickups.get(racer.id) || [],
            traffic: aiTraffic,
            rivals: otherRacers,
            ramps: aiRamps,
            weaponReady,
            // Une cible de tir doit être devant et encore en course : un pilote
            // déjà en épave ne se tire pas dessus.
            targets: otherRacers.filter((other) => !other.wrecked && other.distance > racer.distance),
            chasing: racer.distance < raceLeaderDistance - 1,
            lookAheadDistance: CITY_RUSH_AI_LOOKAHEAD,
            brakingRate: cityRushAiBrakingRate(racer.profile.accelerationRate),
          });
          if (nextLane !== racer.lane) racer.lane = nextLane;
          racer.changeIn = cityRushAiThinkDelay(Math.random, {
            missionTarget: missionFugitiveIds.has(racer.id),
          });
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
        // Le rythme de course s'applique une seule fois. Un rival reçoit au
        // minimum la pointe du joueur, même si son modèle ou le réglage du
        // scénario est plus lent ; les modèles plus rapides gardent leur avance.
        const racerFinalLap = cityRushLapForDistance(racer.distance, CITY_RUSH_LAP_LENGTH, effectiveLaps) >= effectiveLaps;
        const racerPace = cityRushRivalPaceFactor({ finalLap: racerFinalLap });
        const storyPaceBoost = Number(storyRivalPace?.[racer.id]) > 0 ? Number(storyRivalPace[racer.id]) : 1;
        let rivalTargetTopSpeed = cityRushRivalTargetSpeed(playerTopSpeed, racer.baseSpeed, {
          pace: racerPace,
          storyPace: storyPaceBoost,
        });
        // Une interception reste une poursuite, pas une course perdue au
        // premier ravitaillement : la cible ajuste son allure, sans téléportation,
        // pour rester à portée et devant le canon. Les autres modes sont inchangés.
        if (missionFugitiveIds.has(racer.id) && missionTargetLeadMax > 0) {
          const lead = racer.distance - distance;
          if (lead > missionTargetLeadMax) {
            rivalTargetTopSpeed = Math.min(rivalTargetTopSpeed, playerCurrentSpeed * 0.92);
          } else if (lead < missionTargetLeadMin) {
            rivalTargetTopSpeed = Math.max(rivalTargetTopSpeed, playerCurrentSpeed * 1.18);
          }
        }
        const speedTarget = (racer.wrecked || racer.stunLeft > 0
          ? 0
          : rivalTargetTopSpeed * (racerSlowed ? CITY_RUSH_RIVAL_SLOW_FACTOR : 1) * (racer.blueShotSlowLeft > 0 ? CITY_RUSH_BLUE_SHOT_SPEED_FACTOR : 1) * (racer.boostLeft > 0 ? CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR : 1) + paced(Math.sin(elapsed * 0.82 + racer.phase) * 0.38))
          * cornerPaceAt(racer.distance);
        const requestedSpeed = approachCityRushSpeed(racer.currentSpeed, Math.max(0, speedTarget), cityRushTrafficRecoveryRate(racer.profile.accelerationRate, racer.trafficRecoverLeft), dt, coursePace);
        requestedRacerSpeeds.set(racer.id, requestedSpeed);
        priorRacerXs.set(racer.id, racer.currentX);
        racer.currentX = lerp(racer.currentX, laneX(racer.lane), Math.min(1, dt * 5.3));
      }

      const priorTrafficDistances = new Map(trafficCars.map((traffic) => [traffic.id, traffic.distance]));
      const requestedTrafficSpeeds = new Map(trafficCars.map((traffic) => [
        traffic.id,
        Math.max(paced(3.8), traffic.baseSpeed + paced(Math.sin(elapsed * 0.5 + traffic.phase) * 0.18))
          * cornerPaceAt(traffic.distance),
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
            // Leçon tremplin : le décollage valide la démonstration.
            noteTutorialAction('ramp');
            break;
          }
        }
      }

      // Détection de tremplin pour les rivaux
      for (const racer of racingRacers) {
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
      // Atterrissage de cette image : la voiture ne se pose pas dans une
      // berline (voir `resolveCityRushCarMovement`).
      let playerLandedThisFrame = false;
      if (playerJumpState.active) {
        const jumpTraveled = distance - playerJumpState.startDistance;
        const progress = clamp(jumpTraveled / Math.max(1, playerJumpState.totalDistance), 0, 1);
        playerJumpState.progress = progress;
        if (progress < 1.0) {
          playerJumpY = computeCityRushJumpElevation(jumpTraveled, playerJumpState.totalDistance, playerJumpState.maxHeight);
          playerJumpPitch = computeCityRushJumpPitch(progress);
        } else {
          playerJumpState.active = false;
          playerLandedThisFrame = true;
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
      for (const racer of racingRacers) {
        let racerJumpY = 0;
        let racerJumpPitch = 0;
        racer.landedThisFrame = false;
        if (racer.jumpState?.active) {
          const jumpTraveled = racer.distance - racer.jumpState.startDistance;
          const progress = clamp(jumpTraveled / Math.max(1, racer.jumpState.totalDistance), 0, 1);
          racer.jumpState.progress = progress;
          if (progress < 1.0) {
            racerJumpY = computeCityRushJumpElevation(jumpTraveled, racer.jumpState.totalDistance, racer.jumpState.maxHeight);
            racerJumpPitch = computeCityRushJumpPitch(progress);
          } else {
            racer.jumpState.active = false;
            racer.landedThisFrame = true;
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
          ...racingRacers.filter((r) => (!r.jumpState?.active || (r.currentJumpY || 0) < 0.6)),
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
          jumping: Boolean(playerJumpState.active),
          landing: playerLandedThisFrame,
        },
        ...racingRacers.map((racer) => ({
          id: racer.id,
          collisionGroup: 'racer',
          lane: racer.lane,
          x: racer.currentX + skidOffset(racer.skidLeft, racer.skidDuration, racer.skidSide),
          width: 1.9 * 0.92 * racer.profile.widthScale,
          previousDistance: priorRacerDistances.get(racer.id),
          nextDistance: priorRacerDistances.get(racer.id) + requestedRacerSpeeds.get(racer.id) * dt,
          jumping: Boolean(racer.jumpState?.active),
          landing: Boolean(racer.landedThisFrame),
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
        // Les berlines lâchées par un mini-garage roulent comme le trafic : la
        // même enveloppe de carrosserie les rend solides, et un carambolage
        // coûte au pilote exactement ce qu'il coûte contre une voiture lente.
        ...patrolCars.map((patrol) => ({
          id: patrol.id,
          collisionGroup: 'traffic',
          lane: patrol.lane,
          x: patrol.currentX,
          width: patrol.width,
          previousDistance: patrol.distance,
          nextDistance: patrol.distance + patrol.currentSpeed * dt,
        })),
      ];
      // Le contact est détecté avant le maintien de la distance de sécurité :
      // un joueur humain comme une IA déclenche le même choc et le même rabat.
      const trafficImpactsThisFrame = detectCityRushTrafficImpacts(movementRequests, CITY_RUSH_TRAFFIC_IMPACT_GAP, trafficContacts);
      for (const contact of trafficImpactsThisFrame) {
        const traffic = trafficCars.find((item) => item.id === contact.trafficId)
          || patrolCars.find((item) => item.id === contact.trafficId);
        if (contact.racerId === 'player' && traffic) playerVehicleContacts += 1;
        if (traffic) applyTrafficImpact(contact.racerId, traffic, contact);
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
      playerCar.rotation.y = trackYaw(distance)
        + playerSpin
        + playerSuvImpactYaw
        + clamp((laneX(playerLane) - playerX) * -0.06, -0.12, 0.12)
        + skidOffset(playerSkidLeft, playerSkidDuration, playerSkidSide, 0.1, 14);
      const playerSteer = clamp((laneX(playerLane) - playerX) * 0.28, -0.34, 0.34);
      animateRacerCar(playerCar, {
        speed: currentSpeed,
        maxSpeed: playerTopSpeed,
        steer: playerSteer,
        lateral: playerLateral,
        boosting: playerBoostLeft > 0,
        slowed: playerSlowLeft > 0 || playerBlueShotSlowLeft > 0 || playerTrafficImpactLeft > 0,
        impacting: playerTrafficImpactLeft > 0 || playerWrecked,
        stunned: playerStunLeft > 0 && !playerWrecked,
        violentImpact: playerSuvImpactAmount,
        skidding: playerSkidLeft > 0,
        braking: currentSpeed < priorSpeed - paced(2) * dt && currentSpeed > 1,
      }, dt, clockTime);

      // Bande-son : le régime moteur suit la vitesse et l'effort demandé
      // (`requestedPlayerSpeed` dépasse `currentSpeed` tant qu'on accélère).
      // Le monde seul connaît ces deux valeurs à la frame près — le HUD de la
      // page est émis au mieux toutes les 120 ms.
      audioRef?.current?.engine({
        speed: clamp(currentSpeed / (playerTopSpeed * 1.46), 0, 1),
        throttle: clamp((requestedPlayerSpeed - currentSpeed) / 8, 0, 1),
        boost: playerBoostLeft > 0,
        engineProfile: playerProfile.archetype,
      });

      for (const racer of racingRacers) {
        const priorRacerDistance = priorRacerDistances.get(racer.id);
        racer.distance = movementById.get(racer.id) ?? priorRacerDistance;
        if (dt > 0 && racer.distance - priorRacerDistance < requestedRacerSpeeds.get(racer.id) * dt - 1e-6) racer.trafficRecoverLeft = CITY_RUSH_TRAFFIC_RECOVERY_DURATION;
        const priorRacerSpeed = racer.currentSpeed;
        racer.currentSpeed = dt > 0 ? Math.max(0, (racer.distance - priorRacerDistance) / dt) : requestedRacerSpeeds.get(racer.id);
        const gap = racer.distance - distance;
        const visible = racer.raceActive !== false && gap > -8 && gap < CITY_RUSH_RACER_VIEW_DISTANCE;
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
            braking: racer.currentSpeed < priorRacerSpeed - paced(2) * dt && racer.currentSpeed > 1,
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
      const trafficLeadDistance = Math.max(distance, ...racingRacers.map((racer) => racer.distance));
      const slowestRaceDistance = Math.min(distance, ...racingRacers.map((racer) => racer.distance));
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
          // Sur route à très faible trafic (campagne, tournoi), les voitures
          // sont bien plus espacées : on augmente les écarts de respawn.
          const lightTraffic = sparseTraffic;
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
        // La voie est publiée à part : sur un circuit courbe, l'abscisse monde
        // mêle le décalage de la courbe et la voie, et un lecteur extérieur (le
        // harnais) ne peut pas la retrouver depuis la position seule.
        traffic.mesh.userData.lane = traffic.lane;
        traffic.mesh.userData.trackDistance = traffic.distance;
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

      // Berlines lâchées par un mini-garage : elles ont quitté la chasse et
      // roulent normalement, à l'allure du trafic, jusqu'à sortir du champ.
      updatePatrolPolice(dt, movementById);
      // Une voiture qui n'est plus à côté du pilote ouvre un nouvel épisode
      // (voir `trySideBump`).
      pruneSideBumpContacts();

      // Trafic venant en face : il roule vers la course sur les trois voies de
      // gauche, croise les pilotes, puis reparaît au loin une fois passé.
      // Collision frontale solide : détection balayée pour éviter le tunneling.
      const priorActorDistancesForOncoming = new Map([
        ['player', priorDistance],
        ...Array.from(priorRacerDistances.entries()),
      ]);
      // Les SUV de charge règlent leur visée avant la boucle, qui se charge du
      // déplacement, du rendu et du choc balayé.
      updateSuvCharges(dt);
      for (const oncoming of oncomingCars) {
        if (oncoming.rallied || oncoming.destroyed) {
          oncoming.mesh.visible = false;
          continue;
        }
        // SUV de charge dormant ou en rechargement : il attend au loin que la
        // poursuite le rappelle (voir `updateSuvCharges`), ni vu ni percuté.
        if (oncoming.chargeState === 'dormant' || oncoming.chargeState === 'reloading') {
          oncoming.mesh.visible = false;
          continue;
        }
        const priorOncomingDistance = oncoming.distance;
        oncoming.impactCooldownLeft = Math.max(0, oncoming.impactCooldownLeft - dt);
        const priorOncomingX = oncoming.currentX;
        const turning = oncoming.turnaroundState === 'turning';
        if (turning) {
          oncoming.turnaroundElapsed = Math.min(
            CITY_RUSH_POLICE_TURNAROUND_DURATION,
            oncoming.turnaroundElapsed + dt,
          );
        }
        const turnProgress = turning
          ? cityRushPoliceTurnaroundProgress(oncoming.turnaroundElapsed)
          : 0;
        const turnEase = smoothstep(turnProgress);
        const shoveSpeedScale = oncoming.pushedAside ? 0.62 : 1;
        const turnSpeedScale = turning ? lerp(1, 0.5, turnEase) : 1;
        const requestedOncomingSpeed = Math.max(
          paced(oncoming.pushedAside ? 2.6 : 3.8),
          oncoming.baseSpeed * shoveSpeedScale * turnSpeedScale + paced(Math.sin(elapsed * 0.5 + oncoming.phase) * 0.18),
        ) * cornerPaceAt(oncoming.distance);
        // Un SUV de charge ne se contente pas de ralentir dans son demi-tour :
        // il freine, s'arrête face au pilote, puis repart dans l'autre sens. Le
        // signe suit le cosinus de la manœuvre (1 → 0 → −1), sans quoi la
        // voiture traverserait le pilote pendant qu'elle se retourne.
        const turnDirection = oncoming.charge && turning ? Math.cos(turnProgress * Math.PI) : 1;
        oncoming.distance -= requestedOncomingSpeed * turnDirection * dt;
        oncoming.currentSpeed = requestedOncomingSpeed * turnDirection;
        if (turning) {
          oncoming.currentX = lerp(
            oncoming.currentX,
            laneX(oncoming.turnaroundTargetLane ?? oncoming.lane),
            Math.min(1, dt / (CITY_RUSH_POLICE_TURNAROUND_DURATION * 0.72)),
          );
        } else if (oncoming.pushedAside) {
          oncoming.pushAsideElapsed += dt;
          oncoming.currentX = cityRushOncomingImpactX(oncoming.pushAsideStartX, oncoming.pushAsideElapsed, oncoming.width, driveSide);
        } else if (oncoming.charge && oncoming.chargeLocked) {
          // Le SUV de charge vise la voie du pilote : il se rabat à vitesse
          // limitée (`cityRushSuvChargeStep`), donc un changement de voie au
          // dernier moment le fait passer à côté.
          oncoming.currentX = cityRushSuvChargeStep(
            oncoming.currentX,
            laneX(oncoming.turnaroundTargetLane ?? oncoming.lane),
            dt,
          );
        } else {
          oncoming.currentX = lerp(oncoming.currentX, laneX(oncoming.lane), Math.min(1, dt * 3.4));
        }
        // Le recyclage du flot ne concerne pas les SUV de charge : les leurs
        // sont réglés par `updateSuvCharges` (apparition au loin, rechargement).
        if (!turning && !oncoming.charge && oncoming.distance < distance - 30) respawnOncomingAhead(oncoming);
        const gap = oncoming.distance - distance;
        // Sifflement au croisement, une fois par passage comme les rivaux.
        const previousOncomingGap = oncoming.lastPassGap;
        oncoming.lastPassGap = gap;
        if (!turning && previousOncomingGap !== undefined && previousOncomingGap >= 0 && gap < 0) {
          audioRef?.current?.passby({ pan: clamp(oncoming.currentX / 6.3, -1, 1) * 0.5, speed: 1 });
        }
        if (!turning) checkOncomingImpacts(oncoming, priorOncomingDistance, priorActorDistancesForOncoming);
        oncoming.mesh.visible = gap > -30 && gap < oncomingViewAhead;
        oncoming.mesh.position.set(oncoming.currentX + trackRelativeX(oncoming.distance), trackRelativeY(oncoming.distance), PLAYER_Z - gap * SCALE);
        oncoming.mesh.userData.lane = oncoming.lane;
        oncoming.mesh.userData.trackDistance = oncoming.distance;
        oncoming.mesh.rotation.x = lerp(-trackPitch(oncoming.distance), trackPitch(oncoming.distance), turnEase);
        oncoming.mesh.rotation.y = trackYaw(oncoming.distance)
          + Math.PI * (1 - turnEase)
          + clamp((oncoming.currentX - priorOncomingX) * 2.8, -0.26, 0.26);
        if (oncoming.mesh.visible) {
          oncoming.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += oncoming.currentSpeed * dt * 0.95; });
          oncoming.mesh.userData.beacons.forEach((beacon, beaconIndex) => {
            const flashing = Math.floor(clockTime * 8 + oncoming.phase + beaconIndex) % 2 === 0;
            beacon.material.opacity = flashing ? 1 : 0.18;
          });
        }
        if (turning && cityRushPoliceTurnaroundProgress(oncoming.turnaroundElapsed) >= 1) {
          rallyOncomingPolice(oncoming, {
            asBackup: oncoming.turnaroundAsBackup,
            targetId: oncoming.turnaroundTargetId || 'player',
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
        } else if (playerSkidLeft > 0 || ((playerSlowLeft > 0 || playerBlueShotSlowLeft > 0 || playerSpikeSlowLeft > 0) && currentSpeed > 4)) {
          emitWheelSmoke(playerCar, { color: 0xcfd0d8, opacity: 0.45, scale: 0.42, grow: 2.2, life: 0.7 });
          playerSmokeTimer = 0.06;
        } else if (playerBoostLeft > 0) {
          emitExhaustSmoke(playerCar, { color: playerProfile.bodyColor, opacity: 0.38, scale: 0.24, grow: 2.6, life: 0.45, velocity: [0, 0.4, 2.4] });
          playerSmokeTimer = 0.08;
        }
      }
      launchSmokeLeft = Math.max(0, launchSmokeLeft - dt);
      // Fumée de capot du joueur : plus la barre de vie descend, plus elle est
      // dense, sombre et fréquente (gris léger → panache noir + étincelles).
      // Opacité plafonnée : la fumée file vers la caméra sans masquer la route.
      if (!playerWrecked && playerHealth > 0 && playerHealth < playerMaxHealth) {
        playerDamageSmokeTimer -= dt;
        if (playerDamageSmokeTimer <= 0) {
          const damage = 1 - playerHealth / playerMaxHealth;
          playerDamageSmokeTimer = (lite ? 0.24 : 0.18) - damage * (lite ? 0.12 : 0.12);
          playerHoodScratch.set((Math.random() - 0.5) * 0.6, 0.95, -1.45);
          playerCar.localToWorld(playerHoodScratch);
          const shade = Math.round(0xbe - damage * 0x92);
          smoke.emit(playerHoodScratch, {
            color: (shade << 16) | (shade << 8) | (shade + 6),
            opacity: 0.18 + damage * 0.34,
            scale: 0.22 + damage * 0.34,
            grow: 2.0 + damage * 1.1,
            life: 0.55 + damage * 0.5,
            velocity: [(Math.random() - 0.5) * 0.6, 1.4 + damage * 1.0, 1.8 + Math.random() * 0.8],
          });
          if (playerHealth <= CITY_RUSH_PLAYER_HEALTH_CRITICAL && Math.random() < 0.35) {
            smoke.emit(playerHoodScratch, { color: 0xff8a33, opacity: 0.8, scale: 0.13, grow: 1.4, life: 0.3, velocity: [(Math.random() - 0.5) * 1.6, 1.8 + Math.random(), 1.4] });
          }
        }
      }

      worldTravel = (distance - priorDistance) * SCALE;
      // Un contact avec une berline de police « pnj » la rappelle : elle sort
      // de sa ronde et prend le pilote en chasse (voir `rallyTrafficPolice`).
      // Chapitres « sans police » du mode Histoire : ni ralliement au contact,
      // ni ralliement à vue — les berlines du trafic restent du décor.
      if (storyPoliceEnabled && tutorialPoliceOn()) checkPoliceRally();
      // À cinq étoiles, les patrouilles croisées sur la route n'attendent pas
      // le contact : elles prennent le pilote en chasse dès qu'elles le voient.
      if (storyPoliceEnabled && tutorialPoliceOn()) checkPoliceSightRally();
      // Les trois voitures de base entrent au dernier tour du joueur (ou dès
      // le départ en mode Poursuite) et le prennent toujours pour cible, même
      // si un rival mène la course.
      const leader = refreshPackLeader();
      const playerLap = cityRushLapForDistance(distance, CITY_RUSH_LAP_LENGTH, effectiveLaps);
      // L'escouade entre au dernier tour (ou dès le départ en Poursuite). Dans
      // l'entraînement guidé, elle n'entre pas toute seule : c'est la leçon des
      // tirs qui la fait arriver (`releaseTutorialPolice`), si bien que la
      // route reste vide de police jusqu'à ce moment.
      if (!policeDeployed && !sprint && storyPoliceEnabled && tutorialPoliceOn()) {
        if (effectivePoliceFromStart && distance > 8) deployPolice();
        else if (playerLap >= effectiveLaps) deployPolice();
      }
      updatePolice(dt, leader);
      // Le premier du dernier tour est chassé comme le pilote : un adversaire
      // qui mène la course à l'ouverture du dernier tour reçoit la berline qui
      // lui est réservée (voir `chaseLastLapLeader`).
      chaseLastLapLeader(leader, playerLap);
      // Le carambolage avec une berline se juge après le déplacement des
      // berlines : le contact est alors décrit à la position du jour.
      checkPoliceCollisions();
      // Les adversaires carambolent les berlines de la même façon : le rival qui
      // arrive sur une berline ouvre son dossier et abîme sa coque.
      checkRivalPoliceCollisions();
      // La herse des quatre étoiles : montage, pose voie par voie, franchissement
      // (détection balayée sur `priorDistance`), puis rangement.
      updateSpikeBlock(dt, priorDistance);
      if (sprint) updateSprintCheckpoints(dt);
      else handleLapCrossings(priorDistance);
      // Garde de secours : si la course a rejoint le dernier tour sans avoir
      // initialisé sa coque au départ, la barre s'active au plus tard ici.
      if (!playerHealthActive && lap >= effectiveLaps) activatePlayerHealth();
      updatePoliceReinforcements(dt);
      updateStoryBreakdown(dt);
      updateWreck(dt);
      // La démonstration guidée : pilotage automatique, accessoires de la
      // leçon, armes, tic vert et passage à la leçon suivante.
      updateTutorial(dt);
      updateRows(dt);
      updateRamps(dt);
      updateMiniGarages(priorDistance);
      updateBazookaWarehouses(priorDistance, dt);
      activeRacers().forEach((racer) => useRacerPower(racer));
      updateVisualEffects(dt);
      updateTrafficImpacts(dt);

      const allRacers = makeRacerRows();
      // Une épave en pleine toupie ne se clôt pas sur la ligne d'un rival : la
      // course est déjà perdue (barre à zéro), la toupie va à son terme et
      // `updateWreck` signe la défaite. Sans cette garde, un rival franchissant
      // l'arrivée pendant les 3,2 s coupait la scène de l'épave en plein vol.
      const lineCrossed = !playerWrecked && allRacers.some((racer) => racer.distance >= effectiveDistance);
      // L'entraînement guidé ne s'achève pas sur le drapeau mais sur la
      // dernière fiche : tant que le coach n'a pas posé son dixième tic vert,
      // la voiture boucle sa route et la course attend. Sans cette garde, une
      // leçon qui traîne (un tremplin raté, une mire longue à venir) pouvait
      // se faire couper par la ligne et le tour guidé ne se terminait jamais.
      if (lineCrossed && (!tutorialMode || tutorialComplete)) finishRace();
      emitHud();
    } else {
      currentSpeed = 0;
      if (phase === 'finished') {
        // Tour d'honneur : les voitures roulent en roue libre sous les confettis.
        coastSpeed = lerp(coastSpeed, paced(7), Math.min(1, dt * 0.9));
        const step = coastSpeed * dt;
        distance += step;
        activeRacers().forEach((racer) => { racer.distance += step; });
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
        miniGarages.forEach(placeMiniGarage);
      }
      // Bande-son hors course : ralenti sur la grille et en pause, roue libre
      // pendant le tour d'honneur (la vitesse de `coastSpeed` reste audible).
      audioRef?.current?.engine({
        speed: phase === 'finished' ? clamp(coastSpeed / (playerTopSpeed * 1.46), 0, 1) : 0,
        throttle: 0,
        idle: true,
      });

      const idleState = (car, maxSpeed) => animateRacerCar(car, { speed: currentSpeed, maxSpeed, idle: phase !== 'finished', steer: 0, lateral: 0 }, dt, clockTime);
      playerCar.position.x = lerp(playerCar.position.x, laneX(playerLane), Math.min(1, dt * 4));
      playerCar.rotation.x = trackPitch(distance);
      idleState(playerCar, playerTopSpeed);
      activeRacers().forEach((racer) => {
        if (phase === 'finished') {
          const gap = racer.distance - distance;
          racer.mesh.visible = racer.raceActive !== false && gap > -8 && gap < CITY_RUSH_RACER_VIEW_DISTANCE;
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
        // La voie est publiée à part : sur un circuit courbe, l'abscisse monde
        // mêle le décalage de la courbe et la voie, et un lecteur extérieur (le
        // harnais) ne peut pas la retrouver depuis la position seule.
        traffic.mesh.userData.lane = traffic.lane;
        traffic.mesh.userData.trackDistance = traffic.distance;
          traffic.mesh.rotation.set(trackPitch(traffic.distance), trackYaw(traffic.distance), 0);
        }
      }
      // Le trafic venant en face continue de croiser pendant le tour
      // d'honneur ; il attend, feux allumés, pendant l'intro et le compte à rebours.
      for (const oncoming of oncomingCars) {
        if (oncoming.rallied || oncoming.destroyed) {
          oncoming.mesh.visible = false;
          continue;
        }
        // Les SUV de charge n'appartiennent pas au flot : ils attendent, cachés,
        // que la poursuite les rappelle (voir `updateSuvCharges`).
        if (oncoming.charge) {
          oncoming.mesh.visible = false;
          continue;
        }
        if (phase === 'finished') {
          oncoming.distance -= oncoming.currentSpeed * dt;
          if (oncoming.distance < distance - 30) respawnOncomingAhead(oncoming);
        }
        const gap = oncoming.distance - distance;
        oncoming.mesh.visible = gap > -30 && gap < oncomingViewAhead;
        if (phase === 'finished') {
          oncoming.mesh.position.set(oncoming.currentX + trackRelativeX(oncoming.distance), trackRelativeY(oncoming.distance), PLAYER_Z - gap * SCALE);
        oncoming.mesh.userData.lane = oncoming.lane;
        oncoming.mesh.userData.trackDistance = oncoming.distance;
          oncoming.mesh.rotation.set(-trackPitch(oncoming.distance), trackYaw(oncoming.distance) + Math.PI, 0);
        }
      }
      if (phase === 'countdown' && launchSmokeLeft > 0) {
        playerSmokeTimer -= dt;
        if (playerSmokeTimer <= 0) {
          emitWheelSmoke(playerCar, { color: 0xe4e4ea, opacity: 0.45, scale: 0.45, grow: 2.2, life: 0.9, velocity: [0, 0.6, 1.4] });
          activeRacers().forEach((racer) => emitWheelSmoke(racer.mesh, { color: 0xe4e4ea, opacity: 0.35, scale: 0.4, grow: 2.2, life: 0.8, velocity: [0, 0.6, 1.4] }));
          playerSmokeTimer = 0.07;
        }
      }
    }

    // Carcasses de berlines : tête-à-queue, explosion, puis incendie. Placé
    // après toutes les poses de véhicules (trafic compris, qui masque les
    // voitures détruites) et hors de la branche « en course », pour que la
    // carcasse continue de brûler pendant le tour d'honneur.
    updatePoliceWrecks(dt);

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
    if (['arrowleft', 'arrowright', 'q', 'd', 'z', 'x'].includes(key)) event.preventDefault();
    if (!active || finished || event.repeat) return;
    // Le pilote prend le volant : la démonstration guidée lui laisse la main
    // quelques instants avant de reprendre la leçon.
    if (['arrowleft', 'arrowright', 'q', 'd', 'z', 'x'].includes(key)) noteTutorialManualInput();
    const steerDirection = STEER_KEY_DIRECTIONS[key];
    if (steerDirection) {
      // La première pression répond tout de suite ; les écarts suivants sont
      // cadencés par la boucle de rendu tant que la touche reste enfoncée.
      if (pressSteerKey(key)) action(steerDirection);
    } else if (key === 'z') {
      // Une seule touche pour les trois armes — AK-47, pompe, bazooka : le
      // premier tir part tout de suite, les suivants sont cadencés dans la
      // boucle de rendu tant que la touche reste enfoncée.
      fireHeldWeapon();
    } else if (key === 'x') {
      action('bazooka');
    }
  }
  function onKeyUp(event) {
    const key = event.key.toLowerCase();
    // La relâche s'écoute même hors course : un maintien enregistré puis mis en
    // pause ne doit pas repartir tout seul au retour en piste.
    if (STEER_KEY_DIRECTIONS[key]) { liftSteerKey(key); return; }
    if (key !== 'z') return;
    event.preventDefault();
    releasePistolKey();
  }
  const onWindowBlur = () => {
    // Fenêtre quittée : plus aucune touche n'est fiable, on lâche tout.
    releasePistolKey();
    releaseSteerKeys();
  };
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
    if (Math.abs(dx) > 20) {
      noteTutorialManualInput();
      action(dx < 0 ? 'left' : 'right');
    }
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
      if (wantedLevel >= CITY_RUSH_WANTED_MAX_STARS) turnAroundOncomingPoliceAsBackup();
      lastFrame = performance.now();
      activatePlayerHealth();
    },
    pause() {
      active = false;
      releasePistolKey();
      // Pause : le maintien des flèches s'arrête net, la reprise ne repart pas
      // d'elle-même dans une direction laissée enfoncée avant la pause.
      releaseSteerKeys();
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
    // Vitesse de pointe du pilote sur ce parcours (m/s), rythme du parcours
    // compris (`cityRushCoursePace`) : le smoke y lit que le Ring défile bien
    // plus lentement qu'en ville, à voiture égale.
    get topSpeed() { return playerTopSpeed; },
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
      releaseSteerKeys();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      startLine.dispose();
      smoke.dispose();
      disposeScene(scene, renderer);
    },
  };
}

export default function ViceCityWorld({ active, phase = 'intro', countdown = null, cityId, carId, runId, roster = null, raceLaps = CITY_RUSH_LAPS, racePoliceFromStart = false, raceFormat = 'laps', storyRules = null, tutorialMode = false, onReady, onError, onHud, onFinish, onPickup, onEffect, onLap, onTutorial, actionsRef, audioRef }) {
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = { onReady, onError, onHud, onFinish, onPickup, onEffect, onLap, onTutorial };

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
        tutorial: (data) => callbacksRef.current.onTutorial?.(data),
      }), carId, audioRef, roster, raceLaps, racePoliceFromStart, raceFormat, storyRules, tutorialMode);
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
  }, [cityId, carId, raceLaps, racePoliceFromStart, raceFormat, storyRules, tutorialMode, actionsRef, audioRef]);

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
