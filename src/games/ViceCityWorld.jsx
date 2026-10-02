import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CITY_RUSH_DISTANCE,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_START_LINE_LEAD,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_LANE_X,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN,
  CITY_RUSH_TRAFFIC_IMPACT_DURATION,
  CITY_RUSH_TRAFFIC_IMPACT_GAP,
  CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_CARS,
  CITY_RUSH_CITIES,
  CITY_RUSH_PICKUP_BURST_DURATION,
  CITY_RUSH_PICKUP_BURST_SHARDS,
  CITY_RUSH_PICKUP_RESPAWN_DELAY,
  CITY_RUSH_POLICE_ATTACK_LEAD,
  CITY_RUSH_POLICE_BASE_SPEED,
  CITY_RUSH_POLICE_COUNT,
  CITY_RUSH_POLICE_FIRE_COOLDOWN,
  CITY_RUSH_POLICE_HUNT_TYPES,
  CITY_RUSH_POLICE_LANES,
  CITY_RUSH_POLICE_LEAD,
  CITY_RUSH_POLICE_LEAD_SLACK,
  CITY_RUSH_POLICE_LOOKAHEAD,
  CITY_RUSH_POLICE_SPAWN_BEHIND,
  CITY_RUSH_POLICE_STEAL_NOTICE,
  CITY_RUSH_POLICE_VIEW_BEHIND,
  CITY_RUSH_POWERS,
  addCityRushCharge,
  approachCityRushSpeed,
  cityRushHitDuration,
  chooseCityRushAiLane,
  chooseCityRushPoliceLane,
  cityRushLaneAfterAction,
  cityRushLapCrossings,
  cityRushLapForDistance,
  cityRushLapProgress,
  cityRushPackLeader,
  cityRushPickupBurstShards,
  cityRushPickupFlashState,
  cityRushPickupPopScale,
  cityRushPickupShardState,
  cityRushPolicePace,
  cityRushPoliceTarget,
  cityRushTrackGap,
  consumeCityRushCharge,
  createCityRushEncounter,
  createCityRushInventory,
  chooseCityRushTrafficEscapeLane,
  cityRushHelicopterTarget,
  cityRushIsAhead,
  cityRushStunSpin,
  detectCityRushTrafficImpacts,
  isCityRushPickupHidden,
  markCityRushPickupTaken,
  rankCityRushRacers,
  resolveCityRushCarMovement,
  resolveCityRushPoliceMovement,
  selectCityRushRacers,
} from './cityRushRules';
import { cityRushLightRig, cityRushTheme } from './cityRushThemes';
import {
  CITY_RUSH_TUNNEL_HALF_WIDTH,
  CITY_RUSH_TUNNEL_HEIGHT,
  CITY_RUSH_TUNNEL_MERGE_LEAD,
  CITY_RUSH_TUNNEL_PLAYER_LEAD,
  CITY_RUSH_TUNNEL_VEIL,
  CITY_RUSH_TUNNEL_WALL_LEAD,
  cityRushTunnelAt,
  cityRushTunnelCurtain,
  cityRushTunnelLaneFor,
  cityRushTunnelLaneOpen,
  cityRushTunnelNearestOpenLane,
  cityRushTunnelShade,
  cityRushTunnelWallAt,
  cityRushTunnels,
} from './cityRushTunnels';
import { createBatch, seededRandom } from './cityRushBuilder';
import { START_ZONE_HALF, buildCityLoop, createStageMaterials, finishLoopGeometry, makeRain, makeRoad, makeSkyDome, makeSkyline } from './cityRushStage';
import { buildStartComplex, createStartLineDynamics, createStartLineMaterials } from './cityRushStartLine';
import { animateRacerCar, createSmokePool, makeRacerCar, makeTrafficVehicle } from './cityRushCars';
import { makePickupMaterial } from './cityRushTextures';

const PLAYER_Z = 3.1;
const PLAYER_SPEED = CITY_RUSH_PLAYER_SPEED;
const SCALE = CITY_RUSH_SCROLL_SCALE;
const LAP_UNITS = CITY_RUSH_LAP_LENGTH * SCALE;
const CAMERA_BASE_FOV = 44;
const MAX_FRAME = 0.04;
const POWER_TYPES = ['oil', 'pistol', 'cash', 'radio'];
// Rayon (en unités monde) de la zone d'effet de l'explosion de l'hélicoptère :
// à peu près une case (une voie) de chaque côté, touchant les adversaires proches.
const EXPLOSION_RADIUS = 3.4;
// Rafale de la mitrailleuse : nombre de balles et cadence (secondes entre deux).
const MACHINE_GUN_SHOTS = 7;
const MACHINE_GUN_SPACING = 0.045;
// Caméra de poursuite plus basse que l'ancienne vue plongeante (8,8 m) :
// on voit l'horizon, la skyline, les portes et le portique de départ. Tout
// élément qui enjambe la route doit rester au-dessus de 7,1 m.
// Distance (en mètres) sous laquelle le passage d'un rival s'entend.
const PASS_BY_RANGE = 11;
const CHASE_POSITION = new THREE.Vector3(0, 6.6, PLAYER_Z + 13.2);
// Distance de piste entre la voiture et la caméra de poursuite : la pénombre
// des tremis suit la caméra, pas la voiture.
const CAMERA_TRACK_LEAD = (CHASE_POSITION.z - PLAYER_Z) / SCALE;
const CHASE_LOOK = new THREE.Vector3(0, 1.3, PLAYER_Z - 15);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const randomRange = (min, max) => min + Math.random() * (max - min);
const smoothstep = (value) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

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

function makePickupObject(shared) {
  const group = new THREE.Group();
  const icon = new THREE.Mesh(shared.pickupGeometry, shared.pickupMaterials.cash);
  icon.position.y = 0.15;
  group.add(icon);
  const ring = new THREE.Mesh(shared.pickupRingGeometry, shared.pickupRingMaterials.cash);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.25;
  group.add(ring);
  const beam = new THREE.Mesh(shared.pickupBeamGeometry, shared.pickupBeamMaterials.cash);
  beam.position.y = 0.6;
  group.add(beam);
  const halo = new THREE.Mesh(shared.pickupHaloGeometry, shared.pickupBeamMaterials.cash);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -1.27;
  group.add(halo);
  group.userData = { icon, ring, beam, halo, phase: Math.random() * Math.PI * 2, type: 'cash' };
  return group;
}

function setPickupKind(pickup, type, lane, shared) {
  pickup.userData.type = type;
  pickup.userData.icon.material = shared.pickupMaterials[type];
  pickup.userData.ring.material = shared.pickupRingMaterials[type];
  pickup.userData.beam.material = shared.pickupBeamMaterials[type];
  pickup.userData.halo.material = shared.pickupBeamMaterials[type];
  pickup.position.set(CITY_RUSH_LANE_X[lane], 1.3, 0);
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

function makeSlowZone(shared, accent = false) {
  const group = new THREE.Group();
  const pool = new THREE.Mesh(shared.slowPoolGeometry, accent ? shared.oilPoolMaterial : shared.slowPoolMaterial);
  pool.position.y = 0.025;
  pool.scale.set(1.08, 1, 1.62);
  group.add(pool);
  const ring = new THREE.Mesh(shared.slowRingGeometry, accent ? shared.oilRingMaterial : shared.slowRingMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.055;
  ring.scale.set(1.14, 1.58, 1);
  group.add(ring);
  for (const [x, z, scale] of [[-0.35, -0.25, 0.32], [0.24, 0.18, 0.25], [0.1, -0.51, 0.18]]) {
    const spot = new THREE.Mesh(shared.slowSpotGeometry, accent ? shared.oilSpotMaterial : shared.slowSpotMaterial);
    spot.position.set(x, 0.052, z);
    spot.scale.set(scale * 1.65, 0.72, scale);
    group.add(spot);
  }
  group.userData = { ring, active: true, hitIds: new Set(), type: accent ? 'oil-trap' : 'slow-zone' };
  return group;
}

function makeHelicopter(shared) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.72, 1.78), shared.heliBody);
  group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.5, 0.62), shared.heliGlass);
  nose.position.set(0, 0.05, -1.08);
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 2.65), shared.heliBody);
  tail.position.set(0, 0.08, 2.05);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.5), shared.heliBody);
  fin.position.set(0, 0.38, 3.18);
  group.add(fin);
  for (const x of [-0.5, 0.5]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), shared.heliTrim);
    skid.position.set(x, -0.63, 0.22);
    group.add(skid);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36, 0.09), shared.heliTrim);
    strut.position.set(x, -0.43, 0.18);
    group.add(strut);
  }
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), shared.heliTrim);
  mast.position.y = 0.67;
  group.add(mast);
  const rotor = new THREE.Group();
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.06, 0.22), shared.heliTrim);
  const bladeB = bladeA.clone();
  bladeB.rotation.y = Math.PI / 2;
  rotor.add(bladeA, bladeB);
  rotor.position.y = 1.05;
  group.add(rotor);
  const tailRotor = new THREE.Group();
  const tailBladeA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.13), shared.heliTrim);
  const tailBladeB = tailBladeA.clone();
  tailBladeB.rotation.z = Math.PI / 2;
  tailRotor.add(tailBladeA, tailBladeB);
  tailRotor.position.set(0, 0.38, 2.92);
  group.add(tailRotor);
  const searchlight = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 10, 1, true), shared.searchlight);
  searchlight.position.set(0, -4.1, -0.4);
  group.add(searchlight);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), shared.heliBeacon);
  beacon.position.set(0, 0.45, 3.1);
  group.add(beacon);
  group.userData = { rotor, tailRotor, beacon };
  group.visible = false;
  return group;
}

// Berline d'interception du dernier tour : la berline de police du trafic,
// plus un halo rouge et bleu sous le châssis qui pulse — impossible de la
// confondre avec la voiture de police du trafic lent, qui bloque la voie.
function makePolicePursuitCar() {
  const group = makeTrafficVehicle('police');
  group.name = 'police-pursuit';
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
  return group;
}

function makeMissile(shared) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.23, 0.78), shared.missileBody);
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.32, 4), shared.missileNose);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.5;
  group.add(nose);
  const trail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.5), shared.missileTrail);
  trail.position.z = 0.58;
  group.add(trail);
  group.visible = false;
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

// Choc voiture / trafic : flash blanc, étincelles et onde de choc orange.
// Contrairement à l'explosion du missile, cet effet reste lisible pendant une
// seconde entière et suit les deux carrosseries pendant leur rabat.
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
 *   - les **bruitages liés à une position** (tir, dérapage, missile,
 *     explosion), déclenchés ici parce que le monde connaît la voie de la
 *     voiture touchée — donc son placement stéréo — au moment exact.
 */
export function createCityRushWorld(mount, city, getCallbacks, selectedCarId = CITY_RUSH_CARS[0].id, audioRef = null, initialRoster = null) {
  const theme = cityRushTheme(city.id);
  const lightRig = cityRushLightRig(theme, city);
  const lite = detectLiteQuality();
  const reduceMotion = detectReducedMotion();
  const daylight = Boolean(theme.daylight);
  const cityIndex = Math.max(0, CITY_RUSH_CITIES.findIndex((item) => item.id === city.id));
  const sceneryRandom = seededRandom(cityIndex * 131 + 7);

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
  renderer.domElement.setAttribute('aria-label', `Course de cabriolets 3D dans ${city.name} : ${CITY_RUSH_LAPS} tours de circuit, change de voie, ramasse des objets, percute le trafic lent et évite les zones de ralentissement.`);
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

  // ── Décor : ciel, skyline, route, boucle de 600 m + zone de départ ───
  const stageMaterials = createStageMaterials(city, theme, sceneryRandom);
  const startMaterials = createStartLineMaterials(city, theme);
  const loopBatch = createBatch();
  const loop = buildCityLoop({ city, theme, materials: stageMaterials, batch: loopBatch, cityIndex, lite });
  buildStartComplex({ city, theme, materials: stageMaterials, startMaterials, batch: loopBatch, random: loop.random, lite });
  const [loopA, loopB] = finishLoopGeometry(loopBatch, scene);
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
  const road = makeRoad(scene, theme, sceneryRandom, PLAYER_Z);
  const rain = makeRain(theme, camera.position.z, lite);
  if (rain) scene.add(rain.object);
  const startLine = createStartLineDynamics({ city, theme, materials: stageMaterials, startMaterials, random: loop.random, lite });
  scene.add(startLine.group);
  loop.dynamicProps.forEach((prop) => scene.add(prop.group));
  const smoke = createSmokePool(lite ? 28 : 56);
  scene.add(smoke.group);

  // ── Tremis : tunnels courts, pénombre et voile de fond ────────────────
  // La pierre est taillée dans la boucle (cityRushStage) ; ici on gère ce qui
  // bouge : le voile noir qui ferme le fond du tunnel tant que la caméra est
  // sous la voûte, les feux de bouche, et la pénombre plein écran.
  const tunnels = cityRushTunnels(city.id);
  const tunnelLabel = theme.tunnelText || `${theme.gantryText} TUNNEL`;
  const tunnelProps = tunnels.map((tunnel) => {
    const curtainGroup = new THREE.Group();
    curtainGroup.name = `tunnel-curtain-${tunnel.id}`;
    curtainGroup.visible = false;
    const curtainMaterial = new THREE.MeshBasicMaterial({
      color: 0x04060c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false,
    });
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY_RUSH_TUNNEL_HALF_WIDTH * 2 + 0.24, CITY_RUSH_TUNNEL_HEIGHT + 0.5),
      curtainMaterial,
    );
    curtain.position.y = (CITY_RUSH_TUNNEL_HEIGHT + 0.5) / 2 - 0.1;
    curtain.renderOrder = 1;
    curtainGroup.add(curtain);
    scene.add(curtainGroup);

    // Feux de bouche : deux lanternes qui clignotent en alternance au-dessus
    // de l'enseigne, pour annoncer le trou noir de loin.
    const beaconGroup = new THREE.Group();
    beaconGroup.name = `tunnel-beacons-${tunnel.id}`;
    const beacons = [-1, 1].map((side) => {
      const material = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.2, toneMapped: false, fog: false });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), material);
      bulb.position.set(side * 4.4, CITY_RUSH_TUNNEL_HEIGHT + 0.78, 0);
      beaconGroup.add(bulb);
      return { bulb, material };
    });
    scene.add(beaconGroup);
    return { tunnel, curtainGroup, curtainMaterial, beaconGroup, beacons };
  });

  // Pénombre : un voile plein écran sous le HUD, qui suit la caméra (jamais la
  // voiture) pour que la voûte s'assombrisse au bon moment.
  const tunnelVeil = typeof document !== 'undefined' && document.createElement ? document.createElement('div') : null;
  if (tunnelVeil) {
    tunnelVeil.className = 'city-rush-tunnel-veil';
    tunnelVeil.setAttribute('aria-hidden', 'true');
    mount.appendChild(tunnelVeil);
  }
  let tunnelVeilOpacity = -1;
  let tunnelInside = null;

  function setTunnelVeil(value) {
    if (!tunnelVeil) return;
    const opacity = Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
    if (opacity === tunnelVeilOpacity) return;
    tunnelVeilOpacity = opacity;
    tunnelVeil.style.opacity = String(opacity);
  }

  function updateTunnels() {
    setTunnelVeil(cityRushTunnelShade(distance, tunnels, CAMERA_TRACK_LEAD) * CITY_RUSH_TUNNEL_VEIL);
    for (const prop of tunnelProps) {
      const { tunnel } = prop;
      const curtainGap = cityRushTrackGap(tunnel.exit - 0.15, distance) + CITY_RUSH_START_LINE_LEAD;
      prop.curtainGroup.position.z = PLAYER_Z - curtainGap * SCALE;
      const opacity = cityRushTunnelCurtain(distance, tunnel);
      prop.curtainMaterial.opacity = opacity;
      prop.curtainGroup.visible = opacity > 0.01;
      const beaconGap = cityRushTrackGap(tunnel.entry, distance) + CITY_RUSH_START_LINE_LEAD;
      prop.beaconGroup.visible = beaconGap > -40 && beaconGap * SCALE < theme.fogFar + 20;
      if (!prop.beaconGroup.visible) continue;
      prop.beaconGroup.position.z = PLAYER_Z - beaconGap * SCALE;
      prop.beacons.forEach((beacon, index) => {
        const lit = Math.floor(clockTime * 3.4 + index + tunnel.entry * 0.05) % 2 === 0;
        beacon.material.opacity = lit ? 0.95 : 0.16;
      });
    }
  }

  // Entrée et sortie de tremis : le souffle sous la voûte, le claquement de
  // sortie, et l'annonce quand la chaussée se resserre.
  function updateTunnelPresence() {
    const tunnel = cityRushTunnelAt(distance, tunnels);
    if (tunnel === tunnelInside) return;
    if (tunnelInside) audioRef?.current?.tunnelExit?.({ pan: 0 });
    tunnelInside = tunnel;
    if (!tunnel) return;
    audioRef?.current?.tunnelRush?.({ pan: 0 });
    getCallbacks().effect?.({
      type: 'tunnel-enter',
      id: tunnel.id,
      name: tunnelLabel,
      open: tunnel.openLanes.length,
      closed: tunnel.closedLanes.length,
      walls: tunnel.walls.length,
      side: tunnel.walls[0]?.side ?? null,
    });
  }

  // Une voiture engagée dans une voie murée racle la paroi : elle est
  // repoussée dans le couloir avec un ralentissement, comme après un choc. La
  // fenêtre commence à `WALL_LEAD` mètres de la bouche — là où les cônes
  // balisent la paroi — pour couvrir aussi l'image du franchissement.
  function resolveTunnelWalls() {
    const playerTunnel = cityRushTunnelWallAt(distance, tunnels, CITY_RUSH_TUNNEL_WALL_LEAD);
    if (playerTunnel && !cityRushTunnelLaneOpen(playerTunnel, playerLane)) {
      playerLane = cityRushTunnelNearestOpenLane(playerTunnel, playerLane);
      playerSlowLeft = Math.max(playerSlowLeft, cityRushHitDuration(0.95, playerProfile));
      playerSkidLeft = Math.max(playerSkidLeft, 0.6);
      playerSkidSide = Math.random() < 0.5 ? -1 : 1;
      cameraKick = Math.max(cameraKick, 0.38);
      audioRef?.current?.skid?.({ pan: vehiclePan('player'), intensity: 0.9, duration: 0.55 });
      getCallbacks().effect?.({ type: 'tunnel-scrape', name: tunnelLabel });
    }
    for (const racer of racers) {
      const tunnel = cityRushTunnelWallAt(racer.distance, tunnels, CITY_RUSH_TUNNEL_WALL_LEAD);
      if (!tunnel || cityRushTunnelLaneOpen(tunnel, racer.lane)) continue;
      racer.lane = cityRushTunnelNearestOpenLane(tunnel, racer.lane);
      racer.slowLeft = Math.max(racer.slowLeft, 0.5);
    }
  }

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
    slowPoolGeometry: new THREE.CylinderGeometry(0.82, 0.94, 0.045, 18),
    slowRingGeometry: new THREE.TorusGeometry(0.72, 0.055, 4, 12),
    slowSpotGeometry: new THREE.SphereGeometry(0.4, 6, 4),
    slowPoolMaterial: standard(0x201b2b, { roughness: 0.18, metalness: 0.34, emissive: 0x201427, emissiveIntensity: 0.38 }),
    slowRingMaterial: new THREE.MeshBasicMaterial({ color: 0xffbd69, transparent: true, opacity: 0.76, toneMapped: false }),
    slowSpotMaterial: standard(0x443046, { roughness: 0.22, metalness: 0.25 }),
    oilPoolMaterial: standard(0x0c192a, { roughness: 0.15, metalness: 0.48, emissive: 0x06304b, emissiveIntensity: 0.7 }),
    oilRingMaterial: new THREE.MeshBasicMaterial({ color: 0x48b9ff, transparent: true, opacity: 0.96, toneMapped: false }),
    oilSpotMaterial: standard(0x1e5771, { roughness: 0.18, metalness: 0.4, emissive: 0x104258, emissiveIntensity: 0.44 }),
    heliBody: standard(0x232d3b, { metalness: 0.48, roughness: 0.4 }),
    heliGlass: standard(0x68dce5, { emissive: 0x185d73, emissiveIntensity: 0.42, metalness: 0.27, roughness: 0.18 }),
    heliTrim: standard(0xf0ce65, { metalness: 0.58, roughness: 0.34 }),
    heliBeacon: new THREE.MeshBasicMaterial({ color: 0xff3b4d, toneMapped: false }),
    searchlight: new THREE.MeshBasicMaterial({ color: 0xfff4cf, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    missileBody: standard(0xffd260, { metalness: 0.56, roughness: 0.25, emissive: 0x9a310f, emissiveIntensity: 0.4 }),
    missileNose: standard(0xff5b76, { emissive: 0xaa2149, emissiveIntensity: 0.4 }),
    missileTrail: new THREE.MeshBasicMaterial({ color: 0xffa454, transparent: true, opacity: 0.8, toneMapped: false }),
  };

  // ── Voitures ─────────────────────────────────────────────────────────
  const playerProfile = CITY_RUSH_CARS.find((car) => car.id === selectedCarId) || CITY_RUSH_CARS[0];
  const rivalProfiles = CITY_RUSH_CARS.filter((car) => car.id !== playerProfile.id);
  const playerCar = makeRacerCar(playerProfile, { player: true, number: CITY_RUSH_CARS.indexOf(playerProfile) + 1, daylight });
  playerCar.position.set(CITY_RUSH_LANE_X[1], 0, PLAYER_Z);
  scene.add(playerCar);

  let currentRoster = Array.isArray(initialRoster) && initialRoster.length === 4
    ? initialRoster
    : selectCityRushRacers({ cityId: city.id, carId: selectedCarId });
  let playerDriver = currentRoster.find((item) => item.id === 'player') || currentRoster[0];

  const racerSpecs = [
    { id: 'nova', lane: 3, phase: 0.6, changeIn: 1.4, skidSide: 1 },
    { id: 'juno', lane: 0, phase: 2.4, changeIn: 2.1, skidSide: -1 },
    { id: 'ace', lane: 2, phase: 4.5, changeIn: 3.2, skidSide: 1 },
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
      baseSpeed: PLAYER_SPEED * profile.powerMultiplier,
      currentSpeed: 0,
      mesh: makeRacerCar(profile, { player: false, number: CITY_RUSH_CARS.indexOf(profile) + 1, daylight }),
      currentX: CITY_RUSH_LANE_X[spec.lane],
      slowLeft: 0,
      trafficImpactLeft: 0,
      boostLeft: 0,
      stunLeft: 0,
      stunTotal: 0,
      skidLeft: 0,
      inventory: createCityRushInventory(),
      powerCooldown: 0,
      smokeTimer: 0,
      finalLapAnnounced: false,
    };
  });
  racers.forEach((racer) => scene.add(racer.mesh));

  function applyRoster(nextRoster) {
    if (!Array.isArray(nextRoster) || nextRoster.length < 4) return;
    currentRoster = nextRoster;
    playerDriver = currentRoster.find((item) => item.id === 'player') || currentRoster[0];
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
    });
  }

  const trafficCars = Array.from({ length: CITY_RUSH_TRAFFIC_COUNT }, (_, index) => {
    const spec = CITY_RUSH_TRAFFIC_TYPES[index % CITY_RUSH_TRAFFIC_TYPES.length];
    const mesh = makeTrafficVehicle(spec.id);
    scene.add(mesh);
    return {
      ...spec,
      id: `traffic-${index}`,
      mesh,
      distance: 0,
      lane: 0,
      currentX: 0,
      baseSpeed: spec.speed * randomRange(0.94, 1.06),
      currentSpeed: spec.speed,
      impactLeft: 0,
      impactCooldownLeft: 0,
      impactChanging: false,
      impactFromLane: null,
      impactTargetLane: null,
      phase: index * 0.9,
    };
  });

  // ── L'escouade de police du dernier tour ─────────────────────────────
  // Deux berlines d'interception entrent en piste quand le leader attaque son
  // dernier tour. Elles ne figurent jamais dans `makeRacerRows()` : hors
  // classement, hors arrivée. Leur mission : rafler les bonus rouges
  // (mitrailleuse) et jaunes (hélico) devant le leader, et lui tirer dessus.
  const policeCars = Array.from({ length: CITY_RUSH_POLICE_COUNT }, (_, index) => {
    const lane = CITY_RUSH_POLICE_LANES[index % CITY_RUSH_POLICE_LANES.length];
    const mesh = makePolicePursuitCar();
    mesh.visible = false;
    scene.add(mesh);
    return {
      id: `police-${index + 1}`,
      name: `POLICE ${index + 1}`,
      index,
      mesh,
      lane,
      currentX: CITY_RUSH_LANE_X[lane],
      distance: 0,
      currentSpeed: 0,
      // La seconde berline est un peu moins rapide : l'escouade encadre le
      // leader au lieu de rouler pare-chocs contre pare-chocs.
      baseSpeed: CITY_RUSH_POLICE_BASE_SPEED * (index === 0 ? 1 : 0.97),
      phase: index * 1.7,
      changeIn: 0.25 + index * 0.4,
      slowLeft: 0,
      stunLeft: 0,
      stunTotal: 0,
      skidLeft: 0,
      powerCooldown: 0,
      inventory: createCityRushInventory(),
      active: false,
      mode: 'block',
      width: Number(mesh.userData.width) || 1.94,
      lastPassGap: undefined,
    };
  });
  let policeDeployed = false;

  const rows = [];
  for (let index = 0; index < 12; index += 1) {
    const group = new THREE.Group();
    const slots = [makePickupObject(shared), makePickupObject(shared)];
    slots.forEach((slot) => group.add(slot));
    const slowZone = makeSlowZone(shared, false);
    group.add(slowZone);
    scene.add(group);
    rows.push({ group, slots, slowZone, trackDistance: 0, pickups: [], slowLane: null, checked: false, zoneHits: new Set(), pickupClaims: new Map(), crossedRacers: new Set() });
  }

  const oilTraps = [];
  const actionPulses = [];
  const pistolShots = [];
  const helicopter = makeHelicopter(shared);
  const missile = makeMissile(shared);
  const impact = makeImpact(shared);
  const trafficImpacts = Array.from({ length: 6 }, () => makeTrafficImpactEffect());
  trafficImpacts.forEach((effect) => scene.add(effect));
  scene.add(helicopter, missile, impact);
  let trafficImpactCursor = 0;
  let strike = null;
  let lastDistanceSlot = 0;
  let lastTrafficDistanceSlot = 0;
  let policeStealNoticeCooldown = 0;

  let active = false;
  let phase = 'intro';
  let elapsed = 0;
  let clockTime = 0;
  let distance = 0;
  let lap = 1;
  let playerLane = 1;
  let playerX = CITY_RUSH_LANE_X[playerLane];
  let playerSlowLeft = 0;
  let playerTrafficImpactLeft = 0;
  let playerBoostLeft = 0;
  let playerStunLeft = 0;
  let playerStunTotal = 0;
  let playerSkidLeft = 0;
  let playerSkidSide = 1;
  let score = 0;
  let pickedUp = 0;
  let inventory = createCityRushInventory();
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
    })),
  ];

  function setupEncounter(row) {
    const encounter = createCityRushEncounter(randomSeed);
    // Sous un tremis resserré, une voie murée ne reçoit rien : le bonus se
    // décale dans le couloir ouvert, et la flaque disparaît si elle est murée.
    const tunnel = cityRushTunnelAt(row.trackDistance, tunnels);
    const openLanes = tunnel ? tunnel.openLanes : null;
    const taken = new Set();
    row.pickups = encounter.pickups
      .map((pickup) => ({
        ...pickup,
        lane: openLanes && !openLanes.includes(pickup.lane) ? cityRushTunnelNearestOpenLane(tunnel, pickup.lane) : pickup.lane,
      }))
      .filter((pickup) => {
        if (taken.has(pickup.lane)) return false;
        taken.add(pickup.lane);
        return true;
      });
    row.slowLane = openLanes && encounter.slowLane !== null && !openLanes.includes(encounter.slowLane)
      ? null
      : encounter.slowLane;
    row.checked = false;
    row.zoneHits.clear();
    row.pickupClaims.clear();
    row.crossedRacers.clear();
    row.slots.forEach((slot, index) => {
      const pickup = row.pickups[index];
      if (!pickup) {
        slot.visible = false;
        return;
      }
      setPickupKind(slot, pickup.type, pickup.lane, shared);
    });
    row.slowZone.visible = row.slowLane !== null;
    if (row.slowLane !== null) row.slowZone.position.set(CITY_RUSH_LANE_X[row.slowLane], 0, 0);
  }

  function setRowsToStart() {
    let next = 48;
    for (const row of rows) {
      row.trackDistance = next;
      setupEncounter(row);
      row.group.position.set(0, 0, PLAYER_Z - (row.trackDistance - distance) * SCALE);
      next += randomRange(24, 32);
    }
    lastDistanceSlot = next;
  }

  function emitHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHudAt < 100) return;
    lastHudAt = now;
    const standings = rankCityRushRacers(makeRacerRows());
    getCallbacks().hud?.({
      distance: Math.max(0, Math.round(distance)),
      totalDistance: CITY_RUSH_DISTANCE,
      progress: clamp(distance / CITY_RUSH_DISTANCE, 0, 1),
      lap,
      laps: CITY_RUSH_LAPS,
      lapLength: CITY_RUSH_LAP_LENGTH,
      lapProgress: cityRushLapProgress(distance),
      lapDistance: Math.max(0, Math.round(Math.min(distance, CITY_RUSH_DISTANCE) % CITY_RUSH_LAP_LENGTH)),
      elapsed,
      speed: Math.max(0, Math.round(currentSpeed * 3.6)),
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
        rawDistance: Math.max(0, Math.min(CITY_RUSH_DISTANCE, racer.distance)),
        distance: Math.max(0, Math.min(CITY_RUSH_DISTANCE, Math.round(racer.distance))),
        progress: clamp(racer.distance / CITY_RUSH_DISTANCE, 0, 1),
        lap: racer.lap || cityRushLapForDistance(racer.distance),
        lapProgress: cityRushLapProgress(racer.distance),
        rank: index + 1,
        lane: racer.lane,
        x: racer.x,
      })),
      inventory: { ...inventory },
      // Le tremis traversé : la page peut annoncer les voies ouvertes, et les
      // vérifications s'assurent que le joueur n'est jamais dans une voie murée.
      tunnel: tunnelInside ? {
        id: tunnelInside.id,
        name: tunnelLabel,
        openLanes: [...tunnelInside.openLanes],
        closedLanes: [...tunnelInside.closedLanes],
        walls: tunnelInside.walls.length,
        side: tunnelInside.walls[0]?.side ?? null,
      } : null,
      playerLane,
      slowLeft: playerSlowLeft,
      trafficImpactLeft: playerTrafficImpactLeft,
      boostLeft: playerBoostLeft,
      stunLeft: playerStunLeft,
      score,
      pickups: pickedUp,
      leader: standings.leader?.name || '—',
      // L'escouade n'est pas classée : la page la reçoit à part, pour la
      // mini-carte (et jamais pour le tableau des positions).
      police: policeCars.filter((police) => police.active).map((police) => ({
        id: police.id,
        name: police.name,
        distance: Math.round(police.distance),
        lane: police.lane,
        x: police.currentX,
        mode: police.mode,
      })),
    });
  }

  function lapBoardSubtitle(nextLap) {
    if (nextLap >= CITY_RUSH_LAPS) return 'DERNIER TOUR';
    return `${city.name.toUpperCase()} · ${theme.gantryText}`;
  }

  function placeTrack() {
    // Les deux copies de la boucle (tour courant + tour suivant/précédent)
    // sont replacées sur la ligne la plus proche : on repasse ainsi sous le
    // portique à chaque tour sans jamais régénérer le décor.
    const lineGap = cityRushTrackGap(0, distance) + CITY_RUSH_START_LINE_LEAD;
    const lineZ = PLAYER_Z - lineGap * SCALE;
    loopA.position.z = lineZ;
    loopB.position.z = lineZ + LAP_UNITS;
    loopB.visible = lineZ + START_ZONE_HALF * SCALE < camera.position.z + 4;
    startLine.group.position.z = lineZ;
    for (const prop of loop.dynamicProps) {
      const gap = cityRushTrackGap(prop.trackPos, distance) + CITY_RUSH_START_LINE_LEAD;
      prop.group.visible = gap > -40 && gap * SCALE < theme.fogFar + 20;
      if (prop.group.visible) prop.group.position.z = PLAYER_Z - gap * SCALE;
    }
    return lineGap;
  }

  function resetCarAnimation(car) {
    car.userData.anim.roll = 0;
    car.userData.anim.pitch = 0;
    car.userData.anim.lastSpeed = 0;
    car.userData.body.rotation.set(0, 0, 0);
    car.userData.body.position.set(0, 0, 0);
    car.userData.headPivot.rotation.set(0, 0, 0);
    car.userData.boostFlames.forEach((flame) => { flame.group.visible = false; });
  }

  function reset() {
    active = false;
    // Si un missile a déjà quitté l'hélico au moment d'un reset, on termine
    // son bruit d'impact avant de nettoyer la scène : aucun SFX ne reste sans
    // conclusion et le prochain départ repart silencieux.
    if (strike?.phase === 'fire') audioRef?.current?.explosion({ pan: vehiclePan(strike.targetId) });
    clearVisualEffects();
    elapsed = 0;
    distance = 0;
    lap = 1;
    playerLane = 1;
    playerX = CITY_RUSH_LANE_X[playerLane];
    playerSlowLeft = 0;
    playerTrafficImpactLeft = 0;
    playerBoostLeft = 0;
    playerStunLeft = 0;
    playerStunTotal = 0;
    playerSkidLeft = 0;
    playerSkidSide = 1;
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
    strike = null;
    helicopter.visible = false;
    missile.visible = false;
    impact.visible = false;
    // Un reset en pleine frappe ne laisse pas le rotor tourner dans le vide.
    audioRef?.current?.helicopterStop();
    oilTraps.forEach((trap) => scene.remove(trap.mesh));
    oilTraps.length = 0;
    smoke.clear();
    playerCar.position.set(playerX, 0, PLAYER_Z);
    playerCar.rotation.set(0, 0, 0);
    resetCarAnimation(playerCar);
    racers.forEach((racer, index) => {
      racer.distance = 0;
      racer.lap = 1;
      racer.finalLapAnnounced = false;
      racer.currentSpeed = 0;
      racer.lane = [3, 0, 2][index];
      racer.currentX = CITY_RUSH_LANE_X[racer.lane];
      racer.changeIn = 0.22 + index * 0.08;
      racer.slowLeft = 0;
      racer.trafficImpactLeft = 0;
      racer.boostLeft = 0;
      racer.stunLeft = 0;
      racer.stunTotal = 0;
      racer.skidLeft = 0;
      racer.lastPassGap = undefined;
      racer.inventory = createCityRushInventory();
      racer.powerCooldown = 0;
      racer.smokeTimer = 0;
      racer.mesh.position.set(racer.currentX, 0, PLAYER_Z);
      racer.mesh.visible = true;
      racer.mesh.rotation.set(0, 0, 0);
      resetCarAnimation(racer.mesh);
    });
    trafficCars.forEach((traffic, index) => {
      traffic.spawnCount = 0;
      traffic.distance = 82 + index * 68 + randomRange(-7, 7);
      traffic.lane = CITY_RUSH_TRAFFIC_LANES[index];
      traffic.currentX = CITY_RUSH_LANE_X[traffic.lane];
      traffic.currentSpeed = traffic.baseSpeed;
      traffic.impactLeft = 0;
      traffic.impactCooldownLeft = 0;
      traffic.impactChanging = false;
      traffic.impactFromLane = null;
      traffic.impactTargetLane = null;
      traffic.mesh.position.set(traffic.currentX, 0, PLAYER_Z - traffic.distance * SCALE);
      traffic.mesh.visible = true;
      traffic.mesh.rotation.set(0, 0, 0);
      traffic.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
      traffic.mesh.userData.beacons.forEach((beacon) => { beacon.material.opacity = 1; });
    });
    lastTrafficDistanceSlot = trafficCars[trafficCars.length - 1].distance + randomRange(60, 78);
    // L'escouade repart pour la prochaine course : plus personne en piste.
    policeDeployed = false;
    policeStealNoticeCooldown = 0;
    policeCars.forEach((police) => {
      police.active = false;
      police.distance = 0;
      police.currentSpeed = 0;
      police.slowLeft = 0;
      police.stunLeft = 0;
      police.stunTotal = 0;
      police.skidLeft = 0;
      police.powerCooldown = 0;
      police.mode = 'block';
      police.changeIn = 0.25 + police.index * 0.4;
      police.lastPassGap = undefined;
      police.lane = CITY_RUSH_POLICE_LANES[police.index % CITY_RUSH_POLICE_LANES.length];
      police.currentX = CITY_RUSH_LANE_X[police.lane];
      police.inventory = createCityRushInventory();
      police.mesh.visible = false;
      police.mesh.position.set(police.currentX, 0, PLAYER_Z);
    });
    audioRef?.current?.policeSirenOff?.();
    // Plus personne sous la voûte : on rend la lumière et on oublie le tremis.
    tunnelInside = null;
    setTunnelVeil(0);
    setRowsToStart();
    startLine.setLights(0);
    startLine.setFinalLap(false);
    startLine.setBoard(`TOUR 1/${CITY_RUSH_LAPS}`, lapBoardSubtitle(1));
    placeTrack();
    emitHud(true);
  }

  function spawnOilTrap(lane, sourceId = 'player', sourceDistance = distance) {
    const mesh = makeSlowZone(shared, true);
    mesh.position.set(CITY_RUSH_LANE_X[lane], 0, 0);
    mesh.visible = true;
    scene.add(mesh);
    const sourceName = sourceId === 'player' ? 'TOI' : racers.find((racer) => racer.id === sourceId)?.name || 'RIVAL';
    mesh.scale.setScalar(0.22);
    oilTraps.push({ mesh, lane, sourceId, sourceName, trackDistance: Math.max(-3, sourceDistance - 4), hitIds: new Set([sourceId]), active: true, age: 0 });
  }

  // La mitrailleuse ne vise qu'un adversaire situé devant le tireur : on ne
  // garde que les cibles dont la distance est en avant (avec la tolérance
  // commune aux pouvoirs directionnels pour les rivaux à la même hauteur).
  function findPistolTarget(attackerId = 'player') {
    const attackerDistance = attackerId === 'player' ? distance : racers.find((racer) => racer.id === attackerId)?.distance ?? distance;
    const others = [
      ...(attackerId === 'player' ? [] : [{ id: 'player', name: 'TOI', distance, racer: null }]),
      ...racers.filter((racer) => racer.id !== attackerId).map((racer) => ({
        id: racer.id,
        name: racer.name,
        distance: racer.distance,
        racer,
      })),
      // Les berlines de l'escouade sont des cibles comme les autres : le
      // joueur peut riposter à la mitrailleuse quand elles lui volent un bonus.
      ...policeCars.filter((police) => police.active && police.id !== attackerId).map((police) => ({
        id: police.id,
        name: police.name,
        distance: police.distance,
        racer: police,
      })),
    ];
    const ahead = others
      .filter((other) => cityRushIsAhead(other.distance, attackerDistance))
      .sort((a, b) => a.distance - b.distance);
    if (ahead[0]) return ahead[0];
    // Personne devant — le tireur mène et l'escouade s'est repliée sur son
    // pare-chocs pour ouvrir le feu : la rafale de riposte peut se retourner
    // contre la berline la plus proche, même déjà légèrement dépassée.
    const squad = cityRushPoliceTarget(policeCars, attackerDistance, attackerId);
    return squad ? { id: squad.id, name: squad.name, distance: squad.distance, racer: squad } : null;
  }

  function getTargetForRadio(callerId = 'player') {
    // Le talkie vise d'abord le rival le mieux placé, jamais l'appelant — et
    // seulement s'il est DEVANT lui : l'hélico ne part jamais vers un rival
    // poursuivant.
    const rival = cityRushHelicopterTarget(makeRacerRows(), callerId);
    if (rival) return rival;
    // Exception du dernier tour : en tête, sans rival devant, l'appelant peut
    // renvoyer l'hélico contre l'escouade qui le traque — la berline la plus
    // proche prend le missile, même collée à son pare-chocs arrière, au lieu
    // de laisser la jauge jaune inutilisable.
    const callerDistance = callerId === 'player'
      ? distance
      : racers.find((racer) => racer.id === callerId)?.distance ?? distance;
    const squad = cityRushPoliceTarget(policeCars, callerDistance, callerId);
    return squad ? { id: squad.id, name: squad.name, distance: squad.distance, racer: squad } : null;
  }

  function getVehicleMesh(vehicleId) {
    if (vehicleId === 'player') return playerCar;
    const racer = racers.find((item) => item.id === vehicleId);
    if (racer) return racer.mesh;
    return policeCars.find((police) => police.id === vehicleId)?.mesh || null;
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
    data.specs = reduceMotion ? [] : cityRushPickupBurstShards(CITY_RUSH_PICKUP_BURST_SHARDS, Math.random);
    pickupBurstColor.set(CITY_RUSH_POWER_RULES[type]?.color || '#ffffff');
    data.shardMaterial.color.copy(pickupBurstColor);
    data.shardMaterial.opacity = 1;
    data.ringMaterial.color.copy(pickupBurstColor);
    data.coreMaterial.color.copy(pickupBurstColor).lerp(BURST_WHITE, 0.65);
    burst.position.set(x, y, PLAYER_Z - (trackDistance - distance) * SCALE);
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

  function spawnTrafficImpact(racerId, trafficId) {
    const racer = racerId === 'player' ? playerCar : racers.find((item) => item.id === racerId)?.mesh;
    const traffic = trafficCars.find((item) => item.id === trafficId)?.mesh;
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
    const racer = data.racerId === 'player' ? playerCar : racers.find((item) => item.id === data.racerId)?.mesh;
    const traffic = trafficCars.find((item) => item.id === data.trafficId)?.mesh;
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
  function makeBulletTracer() {
    const group = new THREE.Group();
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0a6, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
    const burstMaterial = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
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

  // Rafale de mitrailleuse : plusieurs balles traçantes espacées de quelques
  // centièmes de seconde, toutes dirigées vers la même cible.
  function fireMachineGun(attackerId, targetId) {
    if (!getVehicleMesh(attackerId) || !getVehicleMesh(targetId)) return;
    for (let index = 0; index < MACHINE_GUN_SHOTS; index += 1) {
      const mesh = makeBulletTracer();
      scene.add(mesh);
      pistolShots.push({
        mesh,
        attackerId,
        targetId,
        age: 0,
        phase: 'flight',
        delay: index * MACHINE_GUN_SPACING,
        hitPoint: new THREE.Vector3(),
      });
    }
    // Ratatatata : la rafale remplace le coup de pistolet unique ; le dérapage
    // de la cible tombe 0,3 s plus tard, quand la première balle touche.
    audioRef?.current?.machineGun({ pan: vehiclePan(attackerId) });
    audioRef?.current?.skid({
      pan: vehiclePan(targetId),
      delay: 0.3,
      intensity: targetId === 'player' ? 1.15 : 0.8,
    });
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

    for (let index = pistolShots.length - 1; index >= 0; index -= 1) {
      const shot = pistolShots[index];
      // Les balles d'une même rafale partent en quinconce : on attend leur
      // délai avant de lancer le vol vers la cible.
      if (shot.delay > 0) {
        shot.delay -= dt;
        continue;
      }
      if (shot.phase === 'flight') {
        shot.age += dt;
        const progress = clamp(shot.age / 0.3, 0, 1);
        const source = getVehicleMesh(shot.attackerId);
        const target = targetPosition(shot.targetId, new THREE.Vector3());
        // Riposte sur une berline déjà dépassée : les balles partent du
        // pare-chocs arrière au lieu de traverser la carrosserie.
        const muzzle = source && target.z > source.position.z ? 1.12 : -1.12;
        const start = source ? source.position.clone().add(new THREE.Vector3(0, 0.78, muzzle)) : target;
        shot.mesh.position.lerpVectors(start, target, progress);
        shot.mesh.lookAt(target);
        shot.mesh.rotateZ(Math.sin(shot.age * 42) * 0.12);
        const flicker = 0.88 + Math.sin(shot.age * 68) * 0.12;
        shot.mesh.scale.setScalar(flicker);
        if (progress >= 1) {
          shot.phase = 'impact';
          shot.age = 0;
          shot.hitPoint.copy(target);
          shot.mesh.position.copy(target);
          shot.mesh.userData.core.visible = false;
          shot.mesh.userData.trail.visible = false;
          shot.mesh.userData.burst.visible = true;
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
          pistolShots.splice(index, 1);
        }
      }
    }
  }

  function clearVisualEffects() {
    actionPulses.forEach((pulse) => removeTransient(pulse.mesh));
    pistolShots.forEach((shot) => removeTransient(shot.mesh));
    actionPulses.length = 0;
    pistolShots.length = 0;
    clearPickupBursts();
    clearTrafficImpacts();
  }

  function startStrike(target, callerId = 'player') {
    if (strike) {
      getCallbacks().effect?.({ type: 'radio-busy', message: 'L’hélicoptère est déjà en route.' });
      return false;
    }
    if (!target) return false;
    // `callerId` sert à l'impact : l'onde de choc ne touche jamais un
    // adversaire resté derrière le pilote qui a appelé l'hélico.
    strike = { targetId: target.id, targetName: target.name, callerId, phase: 'approach', elapsed: 0, start: new THREE.Vector3(14, 12, -18) };
    helicopter.visible = true;
    helicopter.position.copy(strike.start);
    missile.visible = false;
    impact.visible = false;
    // Le rotor démarre avec l'approche : il monte en régime pendant 0,85 s.
    audioRef?.current?.helicopterStart();
    getCallbacks().effect?.({ type: 'radio', target: target.name, targetId: target.id });
    return true;
  }

  function usePower(type, { automatic = false } = {}) {
    if (!active || finished) return;
    if (type === 'radio' && strike) {
      getCallbacks().effect?.({ type: 'radio-busy', message: 'L’hélicoptère est déjà en route.' });
      return;
    }
    // Choisir une cible avant de consommer la jauge évite de perdre le tir si
    // aucun rival n'est disponible. Le joueur est toujours exclu de sa propre
    // cible, même lorsqu'il occupe la première place.
    const radioTarget = type === 'radio' ? getTargetForRadio('player') : null;
    if (type === 'radio' && (!radioTarget || radioTarget.id === 'player')) {
      getCallbacks().effect?.({ type: 'radio-no-target' });
      return;
    }
    const consumed = consumeCityRushCharge(inventory, type);
    if (!consumed.consumed) {
      getCallbacks().effect?.({ type: 'empty', item: type });
      return;
    }
    inventory = consumed.inventory;
    spawnActionPulse('player', type);

    if (type === 'cash') {
      playerBoostLeft = Math.max(playerBoostLeft, CITY_RUSH_POWER_RULES.cash.duration);
      audioRef?.current?.boost();
      getCallbacks().effect?.({ type: 'cash', duration: CITY_RUSH_POWER_RULES.cash.duration, automatic });
    } else if (type === 'oil') {
      spawnOilTrap(playerLane);
      audioRef?.current?.oilDrop();
      getCallbacks().effect?.({ type: 'oil', lane: playerLane, automatic });
    } else if (type === 'pistol') {
      const target = findPistolTarget();
      if (target) {
        fireMachineGun('player', target.id);
      }
      if (target?.racer) {
        const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.pistol.duration, target.racer.profile);
        target.racer.slowLeft = Math.max(target.racer.slowLeft, duration);
        target.racer.skidLeft = 0.85;
        target.racer.skidSide = Math.random() < 0.5 ? -1 : 1;
        getCallbacks().effect?.({ type: 'pistol', target: target.name, targetId: target.id, duration });
      }
    } else if (type === 'radio') {
      startStrike(radioTarget, 'player');
    }
    emitHud(true);
  }

  function useRacerPower(racer) {
    if (racer.stunLeft > 0 || racer.powerCooldown > 0) return false;
    for (const type of ['cash', 'pistol', 'oil', 'radio']) {
      if ((racer.inventory?.[type] || 0) < CITY_RUSH_POWER_RULES[type].chargeCost) continue;
      if (type === 'cash' && racer.boostLeft > 0) continue;
      if (type === 'radio' && strike) continue;
      const target = type === 'pistol' ? findPistolTarget(racer.id) : type === 'radio' ? getTargetForRadio(racer.id) : null;
      if ((type === 'pistol' || type === 'radio') && !target) continue;

      const consumed = consumeCityRushCharge(racer.inventory, type);
      if (!consumed.consumed) continue;
      racer.inventory = consumed.inventory;
      racer.powerCooldown = 1.1;
      spawnActionPulse(racer.id, type);

      if (type === 'cash') {
        racer.boostLeft = Math.max(racer.boostLeft, CITY_RUSH_POWER_RULES.cash.duration);
        getCallbacks().effect?.({ type: 'rival-boost', rival: racer.name });
      } else if (type === 'oil') {
        spawnOilTrap(racer.lane, racer.id, racer.distance);
        getCallbacks().effect?.({ type: 'rival-oil', rival: racer.name });
      } else if (type === 'pistol') {
        fireMachineGun(racer.id, target.id);
        if (target.id === 'player') {
          const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.pistol.duration, playerProfile);
          playerSlowLeft = Math.max(playerSlowLeft, duration);
          playerSkidLeft = 0.85;
          playerSkidSide = Math.random() < 0.5 ? -1 : 1;
          getCallbacks().effect?.({ type: 'pistol-hit-player', attacker: racer.name, duration });
        } else if (target.racer) {
          const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.pistol.duration, target.racer.profile);
          target.racer.slowLeft = Math.max(target.racer.slowLeft, duration);
          target.racer.skidLeft = 0.85;
          target.racer.skidSide = Math.random() < 0.5 ? -1 : 1;
        }
      } else if (type === 'radio') {
        startStrike(target, racer.id);
      }
      return true;
    }
    return false;
  }

  // ── L'escouade de police du dernier tour ─────────────────────────────
  // Elle ne chasse que le premier du classement (notre joueur ou un rival) et
  // n'existe que pendant la course : aucune place au classement final.
  const packLeader = { id: 'player', name: 'TOI', isPlayer: true, distance: 0, lane: 1, speed: 0, racer: null };

  function refreshPackLeader() {
    const entries = [
      { id: 'player', name: 'TOI', isPlayer: true, distance, lane: playerLane, speed: currentSpeed, racer: null },
      ...racers.map((racer) => ({
        id: racer.id,
        name: racer.name,
        isPlayer: false,
        distance: racer.distance,
        lane: racer.lane,
        speed: racer.currentSpeed || racer.baseSpeed,
        racer,
      })),
    ];
    Object.assign(packLeader, cityRushPackLeader(entries) || entries[0]);
    return packLeader;
  }

  function deployPolice(leader = refreshPackLeader()) {
    if (policeDeployed) return;
    policeDeployed = true;
    policeCars.forEach((police, index) => {
      police.active = true;
      police.inventory = createCityRushInventory();
      police.slowLeft = 0;
      police.stunLeft = 0;
      police.stunTotal = 0;
      police.skidLeft = 0;
      police.powerCooldown = 0;
      police.changeIn = 0.3 + index * 0.35;
      police.mode = 'block';
      police.lane = CITY_RUSH_POLICE_LANES[index % CITY_RUSH_POLICE_LANES.length];
      police.currentX = CITY_RUSH_LANE_X[police.lane];
      // Elles se joignent à la course juste derrière le leader, en accélérant.
      police.distance = Math.max(0, leader.distance - CITY_RUSH_POLICE_SPAWN_BEHIND - index * 8);
      police.currentSpeed = (leader.speed || PLAYER_SPEED) * 0.68;
      police.lastPassGap = undefined;
      police.mesh.visible = true;
      police.mesh.position.set(police.currentX, 0, PLAYER_Z - (police.distance - distance) * SCALE);
    });
    audioRef?.current?.policeSiren?.({ level: 0.4 });
    getCallbacks().effect?.({
      type: 'police-arrival',
      count: CITY_RUSH_POLICE_COUNT,
      target: leader.isPlayer ? 'player' : leader.name,
      targetId: leader.id,
      lap,
    });
  }

  // Une rafale de l'escouade : la même mitrailleuse que les rivaux, mais au
  // service du dernier tour — le leader devant la berline encaisse le tir.
  function fireAsPolice(police, target) {
    const consumed = consumeCityRushCharge(police.inventory, CITY_RUSH_POWERS.PISTOL);
    if (!consumed.consumed) return false;
    police.inventory = consumed.inventory;
    police.powerCooldown = CITY_RUSH_POLICE_FIRE_COOLDOWN;
    spawnActionPulse(police.id, CITY_RUSH_POWERS.PISTOL);
    fireMachineGun(police.id, target.id);
    if (target.id === 'player') {
      const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.pistol.duration, playerProfile);
      playerSlowLeft = Math.max(playerSlowLeft, duration);
      playerSkidLeft = 0.85;
      playerSkidSide = Math.random() < 0.5 ? -1 : 1;
      cameraKick = Math.max(cameraKick, 0.35);
      getCallbacks().effect?.({ type: 'police-fire', duration, police: police.name });
    } else if (target.racer) {
      const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.pistol.duration, target.racer.profile);
      target.racer.slowLeft = Math.max(target.racer.slowLeft, duration);
      target.racer.skidLeft = 0.85;
      target.racer.skidSide = Math.random() < 0.5 ? -1 : 1;
    }
    return true;
  }

  // Les bonus que l'escouade peut encore rafler, exactement comme ceux que
  // visent les rivaux (mêmes revendications, mêmes réapparitions).
  function visiblePickups() {
    return rows.flatMap((row) => row.pickups
      .map((pickup, index) => ({
        ...pickup,
        distance: row.trackDistance,
        claimed: isCityRushPickupHidden(row.pickupClaims, index, elapsed),
        visible: row.slots[index]?.visible,
      }))
      .filter((pickup) => !pickup.claimed && pickup.visible));
  }

  function visibleSlowZones() {
    return rows
      .filter((row) => row.slowLane !== null && row.slowZone.visible)
      .map((row) => ({ lane: row.slowLane, distance: row.trackDistance }));
  }

  function updatePolice(dt, leader) {
    policeStealNoticeCooldown = Math.max(0, policeStealNoticeCooldown - dt);
    if (!policeDeployed) return;
    const traffic = trafficCars.map((car) => ({ lane: car.lane, distance: car.distance, x: car.currentX, width: car.width }));
    const pickups = visiblePickups();
    const slowZones = visibleSlowZones();
    const priorDistances = new Map(policeCars.map((police) => [police.id, police.distance]));
    const priorXs = new Map(policeCars.map((police) => [police.id, police.currentX]));
    const requests = [];

    for (const police of policeCars) {
      police.slowLeft = Math.max(0, police.slowLeft - dt);
      police.stunLeft = Math.max(0, police.stunLeft - dt);
      police.skidLeft = Math.max(0, police.skidLeft - dt);
      police.powerCooldown = Math.max(0, police.powerCooldown - dt);
      const charged = (police.inventory?.[CITY_RUSH_POWERS.PISTOL] || 0) >= CITY_RUSH_POWER_RULES.pistol.chargeCost;
      // Jauge rouge pleine : la berline se replie derrière le leader pour
      // tirer. Sinon elle chasse devant lui, à hauteur de ses bonus.
      police.mode = charged && police.powerCooldown <= 0 ? 'attack' : 'block';
      const gap = police.distance - leader.distance;

      // Bombardée, la berline ne choisit plus sa trajectoire : la décision
      // (et son minuteur) attendent la fin de la toupie, comme les rivaux.
      if (police.stunLeft <= 0) police.changeIn -= dt;
      if (police.stunLeft <= 0 && police.changeIn <= 0) {
        // Sous un tremis, la berline vise le couloir ouvert avant tout.
        const corridorLane = cityRushTunnelLaneFor(police.distance, police.lane, tunnels, CITY_RUSH_TUNNEL_MERGE_LEAD);
        if (corridorLane !== police.lane) police.lane = corridorLane;
        const availableLanes = [police.lane];
        for (const lane of [police.lane - 1, police.lane + 1]) {
          if (lane >= 0 && lane < CITY_RUSH_LANE_X.length && canEnterLane(police.id, lane, CITY_RUSH_TUNNEL_MERGE_LEAD)) availableLanes.push(lane);
        }
        const nextLane = chooseCityRushPoliceLane({
          currentLane: police.lane,
          distance: police.distance,
          speed: police.currentSpeed || police.baseSpeed,
          availableLanes,
          pickups,
          slowZones,
          traffic,
          targetLane: leader.lane,
          homeLane: CITY_RUSH_POLICE_LANES[police.index % CITY_RUSH_POLICE_LANES.length],
          lookAheadDistance: CITY_RUSH_POLICE_LOOKAHEAD,
        });
        if (nextLane !== police.lane) police.lane = nextLane;
        police.changeIn = randomRange(0.34, 0.58);
      }

      let targetSpeed = cityRushPolicePace({
        gap,
        baseSpeed: police.baseSpeed,
        leaderSpeed: leader.speed || police.baseSpeed,
        // Décalées de quelques mètres : deux berlines côte à côte plutôt
        // qu'une file indienne derrière le leader.
        lead: (police.mode === 'attack' ? CITY_RUSH_POLICE_ATTACK_LEAD : CITY_RUSH_POLICE_LEAD) + police.index * 6,
        tolerance: CITY_RUSH_POLICE_LEAD_SLACK,
      });
      if (police.stunLeft > 0) targetSpeed = 0;
      else if (police.slowLeft > 0) targetSpeed *= 0.6;
      // Engluée derrière un véhicule lent : elle relance tout de suite son
      // choix de voie au lieu d'attendre la fin de son délai.
      if (police.currentSpeed < targetSpeed * 0.55) police.changeIn = Math.min(police.changeIn, 0.1);
      police.currentSpeed = approachCityRushSpeed(police.currentSpeed, Math.max(0, targetSpeed), 13.5, dt);
      police.currentX = lerp(police.currentX, CITY_RUSH_LANE_X[police.lane], Math.min(1, dt * 5.6));
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

    const resolved = resolveCityRushPoliceMovement(requests, traffic, CITY_RUSH_CAR_GAP);
    const resolvedById = new Map(resolved.map((car) => [car.id, car.nextDistance]));
    let nearest = Infinity;
    for (const police of policeCars) {
      const before = priorDistances.get(police.id);
      const priorX = priorXs.get(police.id);
      police.distance = resolvedById.get(police.id) ?? before;
      police.currentSpeed = dt > 0 ? Math.max(0, (police.distance - before) / dt) : police.currentSpeed;
      const gap = police.distance - distance;
      const visible = police.active && gap > -CITY_RUSH_POLICE_VIEW_BEHIND && gap < 150;
      // Une rafale encaissée fait déraper la berline, comme les rivaux.
      const skid = police.skidLeft > 0 ? Math.sin((0.85 - police.skidLeft) * 17) * 0.24 * (police.skidSide || 1) : 0;
      police.mesh.visible = visible;
      police.mesh.position.set(police.currentX + skid, police.stunLeft > 0 ? 0.05 : 0, PLAYER_Z - gap * SCALE);
      // Toupie du stun héliporté pour la berline bombardée, comme les rivaux.
      police.mesh.rotation.y = cityRushStunSpin(police.stunLeft, police.stunTotal) + clamp((police.currentX - priorX) * -3.2 + skid * 0.22, -0.22, 0.22);
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

    // Une jauge rouge pleine et le leader devant la berline : rafale.
    for (const police of policeCars) {
      if (police.powerCooldown > 0 || police.stunLeft > 0) continue;
      if ((police.inventory?.[CITY_RUSH_POWERS.PISTOL] || 0) < CITY_RUSH_POWER_RULES.pistol.chargeCost) continue;
      if (!cityRushIsAhead(leader.distance, police.distance)) continue;
      fireAsPolice(police, leader);
    }
  }

  function canEnterLane(actorId, targetLane, tunnelLead = CITY_RUSH_TUNNEL_PLAYER_LEAD) {
    const targetX = CITY_RUSH_LANE_X[targetLane];
    const actor = racers.find((racer) => racer.id === actorId);
    const actorDistance = actorId === 'player' ? distance : actor?.distance ?? distance;
    const actorWidth = 1.9 * (actorId === 'player' ? 1 : 0.92) * (actorId === 'player' ? playerProfile.widthScale : actor?.profile.widthScale || 1);
    // Sous un tremis, une voie murée n'est pas une voie : on se rabat avant.
    if (cityRushTunnelLaneFor(actorDistance, targetLane, tunnels, tunnelLead) !== targetLane) return false;
    // Les adversaires se traversent sans collision; seul le trafic lent bloque.
    return trafficCars.every((traffic) => {
      const approachingLane = traffic.lane === targetLane || Math.abs(traffic.currentX - targetX) < (actorWidth + traffic.width) / 2;
      return !approachingLane || Math.abs(traffic.distance - actorDistance) >= CITY_RUSH_CAR_GAP;
    });
  }

  function trafficImpactEscapeLane(traffic) {
    const tunnel = cityRushTunnelAt(traffic.distance, tunnels);
    const nearby = [
      ...racers.map((racer) => ({ lane: racer.lane, distance: racer.distance, x: racer.currentX, width: 1.9 * 0.92 * racer.profile.widthScale })),
      { lane: playerLane, distance, x: playerX, width: 1.9 * playerProfile.widthScale },
      ...trafficCars.filter((other) => other.id !== traffic.id).map((other) => ({
        lane: other.lane, distance: other.distance, x: other.currentX, width: other.width,
      })),
    ];
    const blockedLanes = nearby
      .filter((other) => Math.abs(other.distance - traffic.distance) < 11)
      .filter((other) => other.lane !== undefined && Math.abs(other.x - CITY_RUSH_LANE_X[traffic.lane]) < 5.4)
      .map((other) => other.lane);
    return chooseCityRushTrafficEscapeLane({
      currentLane: traffic.lane,
      blockedLanes,
      openLanes: tunnel?.openLanes || null,
    });
  }

  function applyTrafficImpact(racerId, traffic) {
    if (!traffic || traffic.impactCooldownLeft > 0 || traffic.impactChanging) return false;
    const racer = racerId === 'player' ? null : racers.find((item) => item.id === racerId);
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
    }
    spawnTrafficImpact(racerId, traffic.id);
    audioRef?.current?.skid({ pan: vehiclePan(racerId), intensity: 1.05, duration: 0.82 });
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

  function action(name) {
    if (!active || finished) return;
    if (name === 'left' || name === 'right') {
      // Sonné par la frappe de l'hélico : la voiture part en toupie et le
      // volant ne répond plus jusqu'à la reprise.
      if (playerStunLeft > 0) return;
      const nextLane = cityRushLaneAfterAction(playerLane, name);
      if (nextLane !== playerLane && canEnterLane('player', nextLane)) playerLane = nextLane;
      return;
    }
    const aliases = {
      use_oil: 'oil', oil: 'oil', wrench: 'oil',
      use_pistol: 'pistol', pistol: 'pistol',
      use_cash: 'cash', cash: 'cash', boost: 'cash',
      use_radio: 'radio', radio: 'radio', helicopter: 'radio',
    };
    const type = aliases[name];
    if (type && !CITY_RUSH_POWER_RULES[type]?.automatic) usePower(type);
  }

  function collectPickup(type, lane) {
    const before = inventory[type] || 0;
    inventory = addCityRushCharge(inventory, type, 1);
    const chargeCost = CITY_RUSH_POWER_RULES[type].chargeCost;
    const progress = inventory[type];
    const ready = progress >= chargeCost;
    const newlyReady = before < chargeCost && ready;
    const autoActivated = ready && CITY_RUSH_POWER_RULES[type].automatic;
    score += type === 'radio' ? 180 : type === 'pistol' ? 150 : type === 'oil' ? 125 : 100;
    pickedUp += 1;
    // Bip de ramassage (aigu quand la jauge vient de se remplir) : seul le
    // joueur en bénéficie, les rivaux remplissent leur inventaire en silence.
    audioRef?.current?.pickup(type, { ready: newlyReady });
    getCallbacks().pickup?.({ type, progress, chargeCost, ready, newlyReady, autoActivated, lane });
    if (autoActivated) usePower(type, { automatic: true });
    else emitHud(true);
  }

  function collectRacerPickup(racer, type) {
    racer.inventory = addCityRushCharge(racer.inventory, type, 1);
  }

  // Un policier ne marque pas de points : il empoche le bonus, et la page
  // prévient quand un rouge ou un jaune est raflé sous le nez du joueur.
  function collectPolicePickup(police, type, lane) {
    police.inventory = addCityRushCharge(police.inventory, type, 1);
    if (!CITY_RUSH_POLICE_HUNT_TYPES.includes(type)) return;
    const ahead = police.distance - distance;
    if (!(ahead > 0 && ahead <= CITY_RUSH_POLICE_STEAL_NOTICE)) return;
    // Un vol sous le nez du joueur se raconte, mais sans noyer le HUD : au
    // plus un message toutes les trois secondes.
    if (policeStealNoticeCooldown > 0) return;
    policeStealNoticeCooldown = 3;
    const ready = (police.inventory[type] || 0) >= CITY_RUSH_POWER_RULES[type].chargeCost;
    getCallbacks().effect?.({ type: 'police-steal', item: type, lane, police: police.name, ready });
  }

  function slowRacer(racer, isPlayer, duration = 1.28) {
    const recoveryProfile = isPlayer ? playerProfile : racer.profile;
    const adjustedDuration = cityRushHitDuration(duration, recoveryProfile);
    if (isPlayer) {
      playerSlowLeft = Math.max(playerSlowLeft, adjustedDuration);
      getCallbacks().effect?.({ type: 'slow-zone' });
      // Zone de ralentissement : un dérapage plus doux qu'un tir encaissé.
      audioRef?.current?.skid({ pan: vehiclePan('player'), intensity: 0.6, duration: 0.5 });
    } else {
      racer.slowLeft = Math.max(racer.slowLeft, adjustedDuration);
      audioRef?.current?.skid({ pan: vehiclePan(racer.id), intensity: 0.4, duration: 0.45 });
    }
  }

  function checkZoneCrossings(dt) {
    const playerWindow = Math.max(0.82, currentSpeed * dt * 0.56);
    for (const row of rows) {
      if (row.slowLane !== null && row.slowZone.visible) {
        const rowPlayerGap = Math.abs(distance - row.trackDistance);
        if (rowPlayerGap <= playerWindow && !row.zoneHits.has('player') && playerLane === row.slowLane) {
          row.zoneHits.add('player');
          slowRacer(null, true);
        }
        for (const racer of racers) {
          const speed = racer.stunLeft > 0 ? 0 : racer.baseSpeed;
          const hitWindow = Math.max(0.82, speed * dt * 0.56);
          if (Math.abs(racer.distance - row.trackDistance) <= hitWindow && !row.zoneHits.has(racer.id) && racer.lane === row.slowLane) {
            row.zoneHits.add(racer.id);
            slowRacer(racer, false);
          }
        }
      }
    }
    for (const trap of oilTraps) {
      if (!trap.active) continue;
      const racersAtTrap = [
        { id: 'player', name: 'TOI', distance, lane: playerLane, speed: currentSpeed, racer: null },
        ...racers.map((racer) => ({ id: racer.id, name: racer.name, distance: racer.distance, lane: racer.lane, speed: racer.baseSpeed, racer })),
        // Une berline de l'escouade qui traverse une flaque du joueur dérape
        // comme tout le monde : c'est la riposte la plus simple de la course.
        ...policeCars.filter((police) => police.active).map((police) => ({
          id: police.id, name: police.name, distance: police.distance, lane: police.lane, speed: police.currentSpeed, racer: police,
        })),
      ].sort((a, b) => Math.abs(a.distance - trap.trackDistance) - Math.abs(b.distance - trap.trackDistance));
      for (const target of racersAtTrap) {
        const hitWindow = Math.max(0.82, target.speed * dt * 0.56);
        if (trap.hitIds.has(target.id) || target.lane !== trap.lane || Math.abs(target.distance - trap.trackDistance) > hitWindow) continue;
        trap.hitIds.add(target.id);
        const recoveryProfile = target.id === 'player' ? playerProfile : target.racer?.profile;
        const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.oil.duration, recoveryProfile);
        if (target.id === 'player') playerSlowLeft = Math.max(playerSlowLeft, duration);
        else target.racer.slowLeft = Math.max(target.racer.slowLeft, duration);
        trap.active = false;
        trap.mesh.visible = false;
        // Flaque d'huile : les pneus accrochent puis décrochent d'un coup.
        audioRef?.current?.skid({
          pan: vehiclePan(target.id),
          intensity: target.id === 'player' ? 1 : 0.7,
          duration: 0.62,
        });
        getCallbacks().effect?.({ type: 'oil-hit', target: target.name, owner: trap.sourceName });
        break;
      }
    }
  }

  function updateRows(dt) {
    const oldestRaceDistance = Math.min(distance, ...racers.map((racer) => racer.distance));
    const participants = [
      { id: 'player', distance, lane: playerLane, speed: currentSpeed },
      ...racers.map((racer) => ({ id: racer.id, distance: racer.distance, lane: racer.lane, speed: racer.stunLeft > 0 ? 0 : racer.baseSpeed, racer })),
      // L'escouade ramasse les bonus comme les pilotes : un rouge ou un jaune
      // raflé est un pouvoir que le leader ne déclenchera pas.
      ...policeCars.filter((police) => police.active).map((police) => ({
        id: police.id, distance: police.distance, lane: police.lane, speed: police.currentSpeed, racer: police, police: true,
      })),
    ].sort((a, b) => b.distance - a.distance);

    for (const row of rows) {
      if (row.trackDistance < oldestRaceDistance - 11) {
        row.trackDistance = lastDistanceSlot + randomRange(24, 32);
        lastDistanceSlot = row.trackDistance;
        setupEncounter(row);
      }
      const z = PLAYER_Z - (row.trackDistance - distance) * SCALE;
      row.group.position.set(0, 0, z);
      row.slots.forEach((slot, index) => {
        const pickup = row.pickups[index];
        if (!pickup) {
          slot.visible = false;
          return;
        }
        if (isCityRushPickupHidden(row.pickupClaims, index, elapsed)) {
          slot.visible = false;
          return;
        }
        if (!slot.visible) {
          slot.visible = true;
          slot.userData.pop = 0;
          slot.scale.setScalar(0.001);
        }
        const bob = Math.sin(elapsed * 4.1 + slot.userData.phase) * 0.12;
        slot.position.y = 1.3 + bob;
        slot.rotation.y = Math.sin(elapsed * 2.5 + slot.userData.phase) * 0.12;
        slot.userData.ring.rotation.z += dt * 1.4;
        slot.userData.halo.scale.setScalar(1 + Math.sin(elapsed * 3.2 + slot.userData.phase) * 0.12);
      });

      // Un bonus ramassé disparaît 0,1 s puis réapparaît sur sa voie : la
      // voiture suivante peut le prendre à son tour.
      for (const participant of participants) {
        if (row.crossedRacers.has(participant.id)) continue;
        const crossingWindow = Math.max(1.15, participant.speed * dt * 0.65);
        if (Math.abs(participant.distance - row.trackDistance) > crossingWindow) continue;
        const pickupIndex = row.pickups.findIndex((item, index) => item.lane === participant.lane && !isCityRushPickupHidden(row.pickupClaims, index, elapsed));
        if (pickupIndex < 0) continue;
        row.crossedRacers.add(participant.id);
        if (participant.id === 'player') row.checked = true;
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
    for (let index = oilTraps.length - 1; index >= 0; index -= 1) {
      const trap = oilTraps[index];
      trap.age += dt;
      const deploy = clamp(trap.age / 0.38, 0, 1);
      const bounce = trap.age < 0.38 ? 1 + Math.sin(deploy * Math.PI) * 0.34 : 1;
      trap.mesh.scale.setScalar((0.22 + deploy * 0.78) * bounce);
      trap.mesh.position.set(CITY_RUSH_LANE_X[trap.lane], trap.age < 0.38 ? Math.sin(deploy * Math.PI) * 0.16 : 0, PLAYER_Z - (trap.trackDistance - distance) * SCALE);
      trap.mesh.userData.ring.rotation.z += dt * (trap.age < 0.45 ? 9 : 1.1);
      if (trap.trackDistance < oldestRaceDistance - 38 || !trap.active) {
        if (trap.trackDistance < oldestRaceDistance - 38) scene.remove(trap.mesh);
        if (!trap.active || trap.trackDistance < oldestRaceDistance - 38) oilTraps.splice(index, 1);
      }
    }
  }

  function targetPosition(targetId, target = new THREE.Vector3()) {
    if (targetId === 'player') return target.copy(playerCar.position).add(new THREE.Vector3(0, 0.95, 0));
    const racer = racers.find((item) => item.id === targetId);
    if (racer) return target.copy(racer.mesh.position).add(new THREE.Vector3(0, 0.9, 0));
    // Une berline de l'escouade est une cible valide : les balles doivent
    // converger vers sa carrosserie, pas vers un point du décor.
    const police = policeCars.find((item) => item.id === targetId);
    if (police) return target.copy(police.mesh.position).add(new THREE.Vector3(0, 0.9, 0));
    return target.set(0, 0.6, -16);
  }

  const strikeTargetVector = new THREE.Vector3();

  function updateStrike(dt) {
    if (!strike) return;
    strike.elapsed += dt;
    const target = targetPosition(strike.targetId, strikeTargetVector);
    const approachPoint = new THREE.Vector3(target.x + 4.8, Math.max(7.8, target.y + 6.8), target.z - 5.2);

    helicopter.userData.rotor.rotation.y += dt * 28;
    helicopter.userData.tailRotor.rotation.z += dt * 31;
    helicopter.userData.beacon.material.color.setHex(Math.floor(clockTime * 6) % 2 ? 0xff3b4d : 0x5a1018);
    if (strike.phase === 'approach') {
      helicopter.position.lerp(approachPoint, Math.min(1, dt * 3.4));
      helicopter.lookAt(target.x, target.y + 1.5, target.z);
      if (strike.elapsed >= 0.78) {
        strike.phase = 'fire';
        strike.elapsed = 0;
        missile.position.copy(helicopter.position).add(new THREE.Vector3(-0.55, -0.42, 0.18));
        strike.missileStart = missile.position.clone();
        missile.visible = true;
        audioRef?.current?.missileLaunch({ pan: vehiclePan(strike.targetId) });
      }
    } else if (strike.phase === 'fire') {
      const flight = clamp(strike.elapsed / 0.56, 0, 1);
      missile.position.lerpVectors(strike.missileStart, target, flight);
      missile.lookAt(target);
      helicopter.lookAt(target.x, target.y + 1.5, target.z);
      if (flight > 0.1) {
        smoke.emit(missile.position, { color: 0xffc27a, opacity: 0.4, scale: 0.25, grow: 2.2, life: 0.5, velocity: [0, 0.3, 0.4] });
      }
      if (strike.elapsed >= 0.56) {
        // Point d'impact au sol, sous la cible visée.
        const impactWorld = new THREE.Vector3(target.x, 0, target.z);
        impact.position.copy(impactWorld);
        impact.userData.age = 0;
        impact.visible = true;
        strike.phase = 'impact';
        strike.elapsed = 0;
        missile.visible = false;
        audioRef?.current?.explosion({ pan: vehiclePan(strike.targetId) });

        // Immobilisation : la cible principale d'abord, puis tout adversaire
        // qui se trouve dans la zone (environ une case) autour de l'explosion.
        const durationFor = (profile) => cityRushHitDuration(CITY_RUSH_POWER_RULES.radio.duration, profile);
        const stun = (id, profile, isPlayer) => {
          const duration = durationFor(profile);
          // `stunTotal` garde la durée pleine : la toupie de la carrosserie
          // s'en sert pour boucler un nombre entier de tours avant la reprise.
          if (isPlayer) { playerStunLeft = duration; playerStunTotal = duration; cameraKick = 1; }
          else {
            const racer = racers.find((item) => item.id === id);
            if (racer) { racer.stunLeft = duration; racer.stunTotal = duration; }
            else {
              // Une berline de l'escouade bombardée s'arrête net en toupie,
              // exactement comme un rival touché de plein fouet.
              const police = policeCars.find((item) => item.id === id && item.active);
              if (police) { police.stunLeft = duration; police.stunTotal = duration; }
            }
          }
          return duration;
        };
        let primaryDuration = 0;
        if (strike.targetId === 'player') primaryDuration = stun('player', playerProfile, true);
        else {
          const racer = racers.find((item) => item.id === strike.targetId);
          if (racer) primaryDuration = stun(racer.id, racer.profile, false);
          else {
            // Cible principale de l'escouade : durée de base, sans profil de reprise.
            const police = policeCars.find((item) => item.id === strike.targetId && item.active);
            if (police) primaryDuration = stun(police.id, null, false);
          }
        }

        // La cible verrouillée au lancement est toujours touchée (le missile est
        // déjà en vol), mais l'onde de choc épargne les poursuivants : on ne
        // touche que les adversaires qui se trouvent devant le pilote appelant.
        const hitIds = new Set([strike.targetId]);
        const scratchPos = new THREE.Vector3();
        const callerDistance = strike.callerId === 'player'
          ? distance
          : racers.find((item) => item.id === strike.callerId)?.distance ?? distance;
        const participants = [
          { id: 'player', profile: playerProfile, isPlayer: true, distance },
          ...racers.map((racer) => ({ id: racer.id, profile: racer.profile, isPlayer: false, distance: racer.distance })),
          // L'onde de choc attrape aussi les berlines proches de l'impact —
          // toujours devant l'appelant, comme pour les pilotes classés.
          ...policeCars.filter((police) => police.active).map((police) => ({ id: police.id, profile: null, isPlayer: false, distance: police.distance })),
        ];
        for (const participant of participants) {
          if (hitIds.has(participant.id)) continue;
          if (!cityRushIsAhead(participant.distance, callerDistance)) continue;
          targetPosition(participant.id, scratchPos);
          const gap = Math.hypot(scratchPos.x - impactWorld.x, scratchPos.z - impactWorld.z);
          if (gap <= EXPLOSION_RADIUS) {
            hitIds.add(participant.id);
            stun(participant.id, participant.profile, participant.isPlayer);
          }
        }

        // Fumée noire en colonne, braise chaude et étincelles projetées.
        for (let puff = 0; puff < 5; puff += 1) {
          smoke.emit(impactWorld, { color: 0x35353f, opacity: 0.6, scale: 0.7 + Math.random() * 0.4, grow: 2.6, life: 1.3, velocity: [(Math.random() - 0.5) * 1.4, 2.0 + Math.random() * 1.2, (Math.random() - 0.5) * 1.4] });
        }
        for (let spark = 0; spark < 8; spark += 1) {
          smoke.emit(impactWorld, { color: 0xff7a2a, opacity: 0.85, scale: 0.42, grow: 2.0, life: 0.6, velocity: [(Math.random() - 0.5) * 5, 2.6 + Math.random() * 3, (Math.random() - 0.5) * 5] });
        }
        for (let debris = 0; debris < 10; debris += 1) {
          const angle = Math.random() * Math.PI * 2;
          const reach = 4 + Math.random() * 4;
          smoke.emit(impactWorld, { color: 0xffe07a, opacity: 0.95, scale: 0.16, grow: 1.2, life: 0.4, velocity: [Math.cos(angle) * reach, 1.6 + Math.random() * 2.6, Math.sin(angle) * reach] });
        }

        getCallbacks().effect?.({ type: 'missile-hit', target: strike.targetName, targetId: strike.targetId, duration: primaryDuration, hitCount: hitIds.size });
      }
    } else if (strike.phase === 'impact') {
      impact.userData.age += dt;
      strike.elapsed += dt;
      const t = impact.userData.age;
      // Éclair initial très bref.
      const flashLife = clamp(t / 0.12, 0, 1);
      impact.userData.flash.scale.setScalar(1.4 + flashLife * 1.2);
      impact.userData.flash.material.opacity = (1 - flashLife) * 0.95;
      // Boule de feu qui se dilate puis se dissipe.
      const fireLife = clamp(t / 0.5, 0, 1);
      impact.userData.fireball.scale.setScalar(0.4 + fireLife * 2.1);
      impact.userData.fireball.material.opacity = (1 - fireLife) * 0.95;
      const innerLife = clamp(t / 0.32, 0, 1);
      impact.userData.inner.scale.setScalar(0.3 + innerLife * 1.2);
      impact.userData.inner.material.opacity = (1 - innerLife);
      // Onde de choc au sol, qui se propage jusqu'au rayon de la zone d'effet.
      const ringLife = clamp(t / 0.55, 0, 1);
      impact.userData.ring.scale.setScalar(0.4 + ringLife * (EXPLOSION_RADIUS / 0.6 - 0.4));
      impact.userData.ring.material.opacity = (1 - ringLife) * 0.9;
      // Trace noire laissée sur la route : apparaît vite, puis s'estompe.
      const scorchLife = clamp(t / 0.6, 0, 1);
      impact.userData.scorch.material.opacity = Math.sin(Math.min(1, scorchLife * 1.6) * Math.PI) * 0.7;
      if (strike.elapsed > 0.62) {
        impact.visible = false;
        helicopter.visible = false;
        strike = null;
        // Le rotor s'éloigne et s'éteint après l'explosion.
        audioRef?.current?.helicopterStop();
      }
    }
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

  function finishRace() {
    if (finished) return;
    finished = true;
    active = false;
    phase = 'finished';
    finishTime = 0;
    coastSpeed = currentSpeed;
    // Une arrivée peut couper une frappe en plein vol ; le son du missile
    // lancé doit malgré tout recevoir son impact avant l'arrêt de la course.
    if (strike?.phase === 'fire') audioRef?.current?.explosion({ pan: vehiclePan(strike.targetId) });
    clearVisualEffects();
    strike = null;
    audioRef?.current?.helicopterStop();
    helicopter.visible = false;
    missile.visible = false;
    impact.visible = false;
    // L'escouade quitte la piste avec le drapeau à damier : elle n'est pas
    // classée et n'apparaît nulle part dans le tableau d'arrivée.
    policeCars.forEach((police) => { police.active = false; police.mesh.visible = false; });
    audioRef?.current?.policeSirenOff?.();
    startLine.celebrate();
    const standings = rankCityRushRacers(makeRacerRows());
    // Fanfare d'arrivée : accord majeur pour la victoire, plus sobre sinon.
    audioRef?.current?.finish(standings.rank);
    emitHud(true);
    getCallbacks().finish?.({
      city: city.id,
      duration: elapsed,
      distance: Math.round(distance),
      laps: CITY_RUSH_LAPS,
      rank: standings.rank,
      winner: standings.leader?.name || '—',
      winnerId: standings.leader?.id || null,
      score,
      pickups: pickedUp,
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

  function handleLapCrossings(priorDistance) {
    const crossings = cityRushLapCrossings(priorDistance, distance);
    for (const line of crossings) {
      if (line >= CITY_RUSH_LAPS) {
        startLine.onCross({ final: true });
        continue;
      }
      lap = line + 1;
      const finalLap = lap === CITY_RUSH_LAPS;
      startLine.onCross({ final: false });
      startLine.setBoard(`TOUR ${lap}/${CITY_RUSH_LAPS}`, lapBoardSubtitle(lap), finalLap ? '#ffffff' : undefined);
      if (finalLap) startLine.setFinalLap(true);
      cameraKick = Math.max(cameraKick, 0.45);
      audioRef?.current?.lap(finalLap);
      getCallbacks().lap?.({ lap, laps: CITY_RUSH_LAPS, final: finalLap, elapsed });
      getCallbacks().effect?.({ type: finalLap ? 'final-lap' : 'lap', lap, laps: CITY_RUSH_LAPS });
    }
    for (const racer of racers) {
      const racerLap = cityRushLapForDistance(racer.distance);
      if (racerLap !== racer.lap) {
        racer.lap = racerLap;
        if (racerLap === CITY_RUSH_LAPS && !racer.finalLapAnnounced) {
          racer.finalLapAnnounced = true;
          if (lap < CITY_RUSH_LAPS) getCallbacks().effect?.({ type: 'rival-final-lap', rival: racer.name });
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
      const speedRatio = clamp(currentSpeed / (PLAYER_SPEED * playerProfile.powerMultiplier * 1.46), 0, 1);
      const shake = (playerStunLeft > 0 ? 0.14 : playerSlowLeft > 0 ? 0.05 : 0) + cameraKick * 0.22;
      cameraTarget.set(
        px * 0.16 + Math.sin(clockTime * 47) * shake,
        CHASE_POSITION.y + Math.cos(clockTime * 39) * shake * 0.6 - speedRatio * 0.5,
        CHASE_POSITION.z + speedRatio * 0.6,
      );
      lookTarget.set(px * 0.09, CHASE_LOOK.y, CHASE_LOOK.z);
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
      elapsed += dt;
      const priorDistance = distance;
      const priorRacerDistances = new Map(racers.map((racer) => [racer.id, racer.distance]));
      playerSlowLeft = Math.max(0, playerSlowLeft - dt);
      playerTrafficImpactLeft = Math.max(0, playerTrafficImpactLeft - dt);
      playerBoostLeft = Math.max(0, playerBoostLeft - dt);
      playerStunLeft = Math.max(0, playerStunLeft - dt);
      playerSkidLeft = Math.max(0, playerSkidLeft - dt);
      const speedScale = playerSlowLeft > 0 || playerTrafficImpactLeft > 0 ? 0.63 : 1;
      const boostScale = playerBoostLeft > 0 ? 1.46 : 1;
      const targetPlayerSpeed = playerStunLeft > 0 ? 0 : PLAYER_SPEED * playerProfile.powerMultiplier * speedScale * boostScale;
      const requestedPlayerSpeed = approachCityRushSpeed(playerCurrentSpeed, targetPlayerSpeed, playerProfile.accelerationRate, dt);
      const priorPlayerX = playerX;
      playerX = lerp(playerX, CITY_RUSH_LANE_X[playerLane], Math.min(1, dt * 12));
      const playerSkid = playerSkidLeft > 0 ? Math.sin((0.85 - playerSkidLeft) * 17) * 0.24 * playerSkidSide : 0;

      const requestedRacerSpeeds = new Map();
      const priorRacerXs = new Map();
      const aiPickups = visiblePickups();
      const aiSlowZones = visibleSlowZones();
      const aiTraffic = trafficCars.map((traffic) => ({ lane: traffic.lane, distance: traffic.distance, speed: traffic.currentSpeed }));
      for (const racer of racers) {
        // Immobilisé par l'hélico, un rival ne choisit pas de nouvelle voie :
        // la décision (et son minuteur) attendent la fin de la toupie.
        if (racer.stunLeft <= 0) racer.changeIn -= dt;
        if (racer.stunLeft <= 0 && racer.changeIn <= 0) {
          const availableLanes = [racer.lane];
          for (const lane of [racer.lane - 1, racer.lane + 1]) {
            if (lane >= 0 && lane < CITY_RUSH_LANE_X.length && canEnterLane(racer.id, lane, CITY_RUSH_TUNNEL_MERGE_LEAD)) availableLanes.push(lane);
          }
          const otherRacers = [
            { lane: playerLane, distance, speed: currentSpeed },
            ...racers.filter((other) => other.id !== racer.id).map((other) => ({ lane: other.lane, distance: other.distance, speed: other.currentSpeed || other.baseSpeed })),
          ];
          const nextLane = chooseCityRushAiLane({
            currentLane: racer.lane,
            distance: racer.distance,
            speed: racer.currentSpeed || racer.baseSpeed,
            availableLanes,
            pickups: aiPickups,
            slowZones: aiSlowZones,
            traffic: [...aiTraffic, ...otherRacers],
            lookAheadDistance: 145,
          });
          if (nextLane !== racer.lane) racer.lane = nextLane;
          racer.changeIn = randomRange(0.36, 0.62);
        }
        racer.slowLeft = Math.max(0, racer.slowLeft - dt);
        racer.trafficImpactLeft = Math.max(0, racer.trafficImpactLeft - dt);
        racer.boostLeft = Math.max(0, racer.boostLeft - dt);
        racer.stunLeft = Math.max(0, racer.stunLeft - dt);
        racer.skidLeft = Math.max(0, racer.skidLeft - dt);
        racer.powerCooldown = Math.max(0, racer.powerCooldown - dt);
        const racerSlowed = racer.slowLeft > 0 || racer.trafficImpactLeft > 0;
        const speedTarget = racer.stunLeft > 0 ? 0 : racer.baseSpeed * (racerSlowed ? 0.56 : 1) * (racer.boostLeft > 0 ? 1.38 : 1) + Math.sin(elapsed * 0.82 + racer.phase) * 0.38;
        const requestedSpeed = approachCityRushSpeed(racer.currentSpeed, Math.max(0, speedTarget), racer.profile.accelerationRate, dt);
        requestedRacerSpeeds.set(racer.id, requestedSpeed);
        priorRacerXs.set(racer.id, racer.currentX);
        racer.currentX = lerp(racer.currentX, CITY_RUSH_LANE_X[racer.lane], Math.min(1, dt * 5.3));
      }
      // Une voie murée sous un tremis se racle : on repousse dans le couloir.
      resolveTunnelWalls();

      const priorTrafficDistances = new Map(trafficCars.map((traffic) => [traffic.id, traffic.distance]));
      const requestedTrafficSpeeds = new Map(trafficCars.map((traffic) => [
        traffic.id,
        Math.max(3.8, traffic.baseSpeed + Math.sin(elapsed * 0.5 + traffic.phase) * 0.18),
      ]));

      const movementRequests = [
        { id: 'player', collisionGroup: 'racer', lane: playerLane, x: playerX + playerSkid, width: 1.9 * playerProfile.widthScale, previousDistance: priorDistance, nextDistance: priorDistance + requestedPlayerSpeed * dt },
        ...racers.map((racer) => ({
          id: racer.id,
          collisionGroup: 'racer',
          lane: racer.lane,
          x: racer.currentX + (racer.skidLeft > 0 ? Math.sin((0.85 - racer.skidLeft) * 17) * 0.24 * racer.skidSide : 0),
          width: 1.9 * 0.92 * racer.profile.widthScale,
          previousDistance: priorRacerDistances.get(racer.id),
          nextDistance: priorRacerDistances.get(racer.id) + requestedRacerSpeeds.get(racer.id) * dt,
        })),
        ...trafficCars.map((traffic) => ({
          id: traffic.id,
          collisionGroup: 'traffic',
          lane: traffic.lane,
          x: traffic.currentX,
          width: traffic.width,
          previousDistance: priorTrafficDistances.get(traffic.id),
          nextDistance: priorTrafficDistances.get(traffic.id) + requestedTrafficSpeeds.get(traffic.id) * dt,
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
      const priorSpeed = currentSpeed;
      currentSpeed = dt > 0 ? Math.max(0, (distance - priorDistance) / dt) : requestedPlayerSpeed;
      playerCurrentSpeed = currentSpeed;
      const playerLateral = dt > 0 ? (playerX - priorPlayerX) / dt : 0;
      playerCar.position.set(playerX + playerSkid, playerStunLeft > 0 ? 0.03 : 0, PLAYER_Z);
      // Toupie du stun héliporté : la caisse vire sur elle-même et se remet
      // droit tout seul à la reprise (voir `cityRushStunSpin`).
      const playerSpin = cityRushStunSpin(playerStunLeft, playerStunTotal);
      playerCar.rotation.y = playerSpin + clamp((CITY_RUSH_LANE_X[playerLane] - playerX) * -0.06, -0.12, 0.12) + (playerSkidLeft > 0 ? Math.sin((0.85 - playerSkidLeft) * 14) * 0.1 : 0);
      const playerSteer = clamp((CITY_RUSH_LANE_X[playerLane] - playerX) * 0.28, -0.34, 0.34);
      animateRacerCar(playerCar, {
        speed: currentSpeed,
        maxSpeed: PLAYER_SPEED * playerProfile.powerMultiplier,
        steer: playerSteer,
        lateral: playerLateral,
        boosting: playerBoostLeft > 0,
        slowed: playerSlowLeft > 0 || playerTrafficImpactLeft > 0,
        impacting: playerTrafficImpactLeft > 0,
        stunned: playerStunLeft > 0,
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
        const priorRacerSpeed = racer.currentSpeed;
        racer.currentSpeed = dt > 0 ? Math.max(0, (racer.distance - priorRacerDistance) / dt) : requestedRacerSpeeds.get(racer.id);
        const gap = racer.distance - distance;
        const visible = gap > -8 && gap < 120;
        const renderZ = PLAYER_Z - gap * SCALE;
        const skid = racer.skidLeft > 0 ? Math.sin((0.85 - racer.skidLeft) * 17) * 0.24 * racer.skidSide : 0;
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
        // Keep even off-screen rivals' world positions current: the helicopter
        // may lock onto the leader before their car enters the camera view.
        racer.mesh.position.set(racer.currentX + skid, racer.stunLeft > 0 ? 0.045 : 0, renderZ);
        const racerLateralMotion = racer.currentX - priorRacerXs.get(racer.id);
        // Toupie du stun héliporté, ajoutée au léger lacet de conduite.
        racer.mesh.rotation.y = cityRushStunSpin(racer.stunLeft, racer.stunTotal) + clamp(racerLateralMotion * -0.16 + skid * 0.22, -0.22, 0.22);
        const racerSteer = clamp(-racerLateralMotion * 1.45, -0.3, 0.3);
        if (visible) {
          animateRacerCar(racer.mesh, {
            speed: racer.currentSpeed,
            maxSpeed: racer.baseSpeed,
            steer: racerSteer,
            lateral: dt > 0 ? racerLateralMotion / dt : 0,
            boosting: racer.boostLeft > 0,
            slowed: racer.slowLeft > 0 || racer.trafficImpactLeft > 0,
            impacting: racer.trafficImpactLeft > 0,
            stunned: racer.stunLeft > 0,
            skidding: racer.skidLeft > 0,
            braking: racer.currentSpeed < priorRacerSpeed - 2 * dt && racer.currentSpeed > 1,
          }, dt, clockTime);
          racer.smokeTimer -= dt;
          if (racer.smokeTimer <= 0) {
            if (racer.skidLeft > 0 || (racer.slowLeft > 0 && racer.currentSpeed > 4)) {
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
        const priorTrafficDistance = priorTrafficDistances.get(traffic.id);
        const priorTrafficX = traffic.currentX;
        traffic.impactLeft = Math.max(0, traffic.impactLeft - dt);
        traffic.impactCooldownLeft = Math.max(0, traffic.impactCooldownLeft - dt);
        // Le trafic se rabat avant la paroi, comme sur une vraie voie fermée.
        // Pendant le rabat provoqué par un choc, sa voie cible est prioritaire.
        if (!traffic.impactChanging) {
          const corridorLane = cityRushTunnelLaneFor(traffic.distance, traffic.lane, tunnels, CITY_RUSH_TUNNEL_MERGE_LEAD);
          if (corridorLane !== traffic.lane) traffic.lane = corridorLane;
        }
        const laneChangeRate = traffic.impactChanging
          ? Math.min(1, dt / CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION)
          : Math.min(1, dt * 3.4);
        traffic.currentX = lerp(traffic.currentX, CITY_RUSH_LANE_X[traffic.lane], laneChangeRate);
        if (traffic.impactChanging && Math.abs(traffic.currentX - CITY_RUSH_LANE_X[traffic.lane]) < 0.06) {
          traffic.currentX = CITY_RUSH_LANE_X[traffic.lane];
          traffic.impactChanging = false;
          traffic.impactFromLane = null;
          traffic.impactTargetLane = null;
        }
        traffic.distance = movementById.get(traffic.id) ?? priorTrafficDistance;
        const clearedByEveryone = traffic.distance < slowestRaceDistance - 34;
        const roomForAnotherEncounter = trafficLeadDistance < CITY_RUSH_DISTANCE - 230;
        if (clearedByEveryone && roomForAnotherEncounter) {
          traffic.spawnCount += 1;
          const nextSlot = lastTrafficDistanceSlot + randomRange(58, 78);
          const nextAhead = trafficLeadDistance + randomRange(132, 160);
          traffic.distance = Math.max(nextSlot, nextAhead);
          traffic.lane = CITY_RUSH_TRAFFIC_LANES[(index + traffic.spawnCount * 5) % CITY_RUSH_TRAFFIC_LANES.length];
          // Un véhicule qui repart dans l'emprise d'un tremis vise déjà le couloir.
          traffic.lane = cityRushTunnelLaneFor(traffic.distance, traffic.lane, tunnels, 0);
          traffic.currentX = CITY_RUSH_LANE_X[traffic.lane];
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
        traffic.mesh.visible = gap > -18 && gap < 150;
        traffic.mesh.position.set(traffic.currentX, 0, PLAYER_Z - gap * SCALE);
        traffic.mesh.rotation.y = lerp(traffic.mesh.rotation.y, clamp((traffic.currentX - priorTrafficX) * -2.8, -0.26, 0.26), Math.min(1, dt * 12));
        if (traffic.mesh.visible) {
          traffic.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += traffic.currentSpeed * dt * 0.95; });
          traffic.mesh.userData.beacons.forEach((beacon, beaconIndex) => {
            const flashing = Math.floor(clockTime * 8 + traffic.phase + beaconIndex) % 2 === 0;
            beacon.material.opacity = flashing ? 1 : 0.18;
          });
        }
      }

      // Fumée du joueur : burn-out au départ, dérapages, boost.
      playerSmokeTimer -= dt;
      if (playerSmokeTimer <= 0) {
        if (launchSmokeLeft > 0 && currentSpeed < 20) {
          emitWheelSmoke(playerCar, { color: 0xe4e4ea, opacity: 0.5, scale: 0.5, grow: 2.4, life: 0.9, velocity: [0, 0.5, 2.6] });
          playerSmokeTimer = 0.05;
        } else if (playerSkidLeft > 0 || (playerSlowLeft > 0 && currentSpeed > 4)) {
          emitWheelSmoke(playerCar, { color: 0xcfd0d8, opacity: 0.45, scale: 0.42, grow: 2.2, life: 0.7 });
          playerSmokeTimer = 0.06;
        } else if (playerBoostLeft > 0) {
          emitExhaustSmoke(playerCar, { color: playerProfile.bodyColor, opacity: 0.38, scale: 0.24, grow: 2.6, life: 0.45, velocity: [0, 0.4, 2.4] });
          playerSmokeTimer = 0.08;
        }
      }
      launchSmokeLeft = Math.max(0, launchSmokeLeft - dt);

      worldTravel = (distance - priorDistance) * SCALE;
      // L'escouade entre en piste dès que le premier du classement attaque son
      // dernier tour, puis chasse devant lui à hauteur de ses bonus.
      const leader = refreshPackLeader();
      if (!policeDeployed && cityRushLapForDistance(leader.distance) >= CITY_RUSH_LAPS) deployPolice(leader);
      updatePolice(dt, leader);
      handleLapCrossings(priorDistance);
      updateRows(dt);
      racers.forEach((racer) => useRacerPower(racer));
      checkZoneCrossings(dt);
      updateStrike(dt);
      updateVisualEffects(dt);
      updateTrafficImpacts(dt);
      updateTunnelPresence();

      const allRacers = makeRacerRows();
      if (allRacers.some((racer) => racer.distance >= CITY_RUSH_DISTANCE)) finishRace();
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
        for (const row of rows) row.group.position.z = PLAYER_Z - (row.trackDistance - distance) * SCALE;
        for (const trap of oilTraps) trap.mesh.position.z = PLAYER_Z - (trap.trackDistance - distance) * SCALE;
      }
      // Bande-son hors course : ralenti sur la grille et en pause, roue libre
      // pendant le tour d'honneur (la vitesse de `coastSpeed` reste audible).
      audioRef?.current?.engine({
        speed: phase === 'finished' ? clamp(coastSpeed / (PLAYER_SPEED * playerProfile.powerMultiplier * 1.46), 0, 1) : 0,
        throttle: 0,
        idle: true,
      });

      const idleState = (car, maxSpeed) => animateRacerCar(car, { speed: currentSpeed, maxSpeed, idle: phase !== 'finished', steer: 0, lateral: 0 }, dt, clockTime);
      playerCar.position.x = lerp(playerCar.position.x, CITY_RUSH_LANE_X[playerLane], Math.min(1, dt * 4));
      idleState(playerCar, PLAYER_SPEED * playerProfile.powerMultiplier);
      racers.forEach((racer) => {
        if (phase === 'finished') {
          const gap = racer.distance - distance;
          racer.mesh.visible = gap > -8 && gap < 120;
          racer.mesh.position.z = PLAYER_Z - gap * SCALE;
        }
        idleState(racer.mesh, racer.baseSpeed);
      });
      // Même hors course, seul le trafic proche est affiché (économie d'appels
      // de rendu pendant l'intro et le compte à rebours).
      for (const traffic of trafficCars) {
        const gap = traffic.distance - distance;
        traffic.mesh.visible = gap > -18 && gap < 150;
        if (phase === 'finished') traffic.mesh.position.set(traffic.currentX, 0, PLAYER_Z - gap * SCALE);
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
    updateTunnels();
    road.scroll(worldTravel);
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
      headlamp.target.position.set(playerCar.position.x, 0, PLAYER_Z - 16);
    }
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  function onKeyDown(event) {
    if (!active || finished || event.repeat) return;
    const target = event.target?.tagName;
    if (target === 'INPUT' || target === 'TEXTAREA' || target === 'SELECT') return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'q', 'd', 'a', 'z', 'e', 'r'].includes(key)) event.preventDefault();
    if (key === 'arrowleft' || key === 'q') action('left');
    else if (key === 'arrowright' || key === 'd') action('right');
    else if (key === 'a') action('oil');
    else if (key === 'z') action('pistol');
    else if (key === 'e') action('cash');
    else if (key === 'r') action('radio');
  }
  window.addEventListener('keydown', onKeyDown);

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
    start() { if (!finished) { active = true; lastFrame = performance.now(); } },
    pause() {
      active = false;
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
    // Les tremis du circuit (voûtes courtes et voies murées) : la page peut
    // les annoncer, les vérifications les inspectent.
    get tunnels() { return tunnels; },
    get camera() { return camera; },
    get distance() { return distance; },
    destroy() {
      clearVisualEffects();
      // Plus de frame : le moteur doit se taire avec la scène.
      audioRef?.current?.engine({ speed: 0, throttle: 0, mute: true });
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      startLine.dispose();
      smoke.dispose();
      tunnelVeil?.remove?.();
      disposeScene(scene, renderer);
    },
  };
}

export default function ViceCityWorld({ active, phase = 'intro', countdown = null, cityId, carId, runId, roster = null, onReady, onError, onHud, onFinish, onPickup, onEffect, onLap, actionsRef, audioRef }) {
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = { onReady, onError, onHud, onFinish, onPickup, onEffect, onLap };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const city = CITY_RUSH_CITIES.find((item) => item.id === cityId) || CITY_RUSH_CITIES[0];
    let world;
    try {
      world = createCityRushWorld(mountRef.current, city, () => ({
        hud: (data) => callbacksRef.current.onHud?.(data),
        finish: (data) => callbacksRef.current.onFinish?.(data),
        pickup: (data) => callbacksRef.current.onPickup?.(data),
        effect: (data) => callbacksRef.current.onEffect?.(data),
        lap: (data) => callbacksRef.current.onLap?.(data),
      }), carId, audioRef, roster);
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
  }, [cityId, carId, actionsRef, audioRef]);

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
