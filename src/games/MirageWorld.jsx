import { CHARACTER_PALETTES } from './mirageCharacters';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { westernBuilding, westernObstacle } from './westernStage';
import { prairieField, prairieObstacle } from './prairieStage';
import { sardiniaObstacle, sardiniaSeaside, sardiniaVillage } from './sardiniaStage';
import { japanObstacle, japanPlains, makeMountFuji } from './japanStage';
import {
  LANES, LANE_COUNT, CRYSTALS, createCourse, jumpHeight, DUEL_DISTANCE, DUEL_BASE_SPEED,
  duelSpeed, ghostDistance, seededRandom, planNpcLane, advanceCowboyStreak,
  playerLaneAfterAction, playerLateralPosition, resolveCollision, isPlayerVisible,
  tickSpeedBoost, SPEED_BOOST_NONE, POWER_UPS, powerUpsEnabled, PISTOL_STUN_DURATION,
  stunPose, SHIELD_DURATION, LASSO_SLOW_DURATION, LASSO_SLOW_FACTOR, LASSO_PROJECTILE_DURATION,
  GEM_BURST_DURATION, GEM_BURST_SHARDS, gemBurstShards, gemShardState, gemFlashState,
  crystalPickupEffect, POWER_UP_CHARGE_COST, DIAMOND_CHARGE_VALUE, POWER_UP_MAX_CHARGES,
  createPowerUpState, chargePowerUps, consumePowerUp, powerUpHudState, DUEL_RIVALS,
  chooseNpcPowerAction, POWER_BOOST_DURATION, POWER_BOOST_BONUS,
  GEM_RESPAWN_DELAY, markGemTaken, isGemHidden, prairieSunsetState,
} from './mirageRules';
import { attachSwipeControls, createSwipeFeedback } from './mirageTouch';

const TRACK_WIDTH = LANE_COUNT * 2.1;
const TRACK_MIN_Z = -40;
const RUN_SECONDS = 60;
const NO_POWER_UPS = Object.freeze([]);

function block(geometry, material, parent, position, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function makeExplorer(rival = false, palette = null) {
  const player = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  const palettes = CHARACTER_PALETTES;
  const [coat, mane, cloth, trim, hood] = (palette || palettes[Number(rival) || 0]).map(mat);
  block(cube, coat, player, [0, 0.95, 0], [0.82, 0.83, 1.65]);
  const neck = block(cube, coat, player, [0, 1.48, -0.64], [0.46, 1.02, 0.52]);
  neck.rotation.x = -0.25;
  block(cube, coat, player, [0, 1.95, -0.92], [0.46, 0.46, 0.82]);
  block(cube, mane, player, [0, 1.61, -0.38], [0.18, 0.96, 0.18]);
  for (const x of [-0.17, 0.17]) block(cube, coat, player, [x, 2.26, -0.78], [0.12, 0.32, 0.18]);
  const legs = [];
  for (const z of [-0.56, 0.56]) for (const x of [-0.29, 0.29]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.85, z);
    player.add(leg);
    block(cube, coat, leg, [0, -0.35, 0], [0.2, 0.7, 0.23]);
    block(cube, mane, leg, [0, -0.73, -0.03], [0.23, 0.17, 0.3]);
    legs.push(leg);
  }
  const tail = block(cube, mane, player, [0, 0.77, 0.91], [0.23, 0.8, 0.22]);
  tail.rotation.x = -0.35;
  block(cube, cloth, player, [0, 1.33, 0.05], [0.96, 0.14, 0.95]);
  block(cube, trim, player, [0, 1.43, 0.15], [0.66, 0.16, 0.6]);

  const rider = new THREE.Group();
  rider.position.y = 1.4;
  player.add(rider);
  const riderBody = new THREE.Group();
  riderBody.position.y = -1.4;
  rider.add(riderBody);
  block(cube, cloth, riderBody, [0, 1.85, 0.05], [0.6, 0.75, 0.43]);
  const cape = block(cube, cloth, riderBody, [0, 1.7, 0.34], [0.72, 0.87, 0.13]);
  block(cube, trim, riderBody, [0, 1.72, 0.42], [0.12, 0.57, 0.03]);
  block(cube, hood, riderBody, [0, 2.38, 0.02], [0.52, 0.46, 0.52]);

  // Cowboy hat (Stetson: wide curled brim + trim hatband + pinched cattleman crown)
  const baseColors = palette || palettes[Number(rival) || 0];
  const hatColor = new THREE.Color(baseColors[0]).lerp(new THREE.Color(0x5c3318), 0.55);
  const hatMat = mat(hatColor);
  block(cube, hatMat, riderBody, [0, 2.59, 0.02], [0.98, 0.06, 0.94]);
  block(cube, hatMat, riderBody, [0, 2.58, 0.02], [0.74, 0.05, 1.08]);
  const leftBrim = block(cube, hatMat, riderBody, [-0.5, 2.65, 0.02], [0.16, 0.07, 0.86]);
  leftBrim.rotation.z = -0.46;
  const rightBrim = block(cube, hatMat, riderBody, [0.5, 2.65, 0.02], [0.16, 0.07, 0.86]);
  rightBrim.rotation.z = 0.46;
  block(cube, trim, riderBody, [0, 2.65, 0.02], [0.6, 0.09, 0.62]);
  block(cube, hatMat, riderBody, [0, 2.77, 0.02], [0.56, 0.22, 0.58]);
  block(cube, hatMat, riderBody, [-0.15, 2.91, 0.02], [0.21, 0.11, 0.52]);
  block(cube, hatMat, riderBody, [0.15, 2.91, 0.02], [0.21, 0.11, 0.52]);

  for (const x of [-0.43, 0.43]) {
    block(cube, mane, riderBody, [x, 1.16, 0.05], [0.22, 0.57, 0.32]);
    const arm = block(cube, cloth, riderBody, [x * 0.8, 1.9, -0.25], [0.2, 0.5, 0.22]);
    arm.rotation.x = -0.8;
    block(cube, mane, riderBody, [x * 0.65, 1.72, -0.64], [0.035, 0.035, 0.7]);
  }
  player.userData.parts = { legs, tail, cape, rider };
  player.userData.materials = [coat, mane, cloth, trim, hood];
  player.userData.hatMaterial = hatMat;
  player.userData.basePalette = baseColors;
  player.userData.painting = player.userData.basePalette;
  return player;
}

const materialKey = (m) => [m.type, m.color?.getHex(), m.emissive?.getHex(), m.roughness, m.metalness, m.flatShading, m.side, m.transparent, m.opacity, m.depthWrite, m.map?.uuid].join('|');
function bakeStaticScenery(group) {
  const keep = new Set();
  group.traverse((o) => { if (o.userData.bob !== undefined || o.userData.glow) o.traverse(c => keep.add(c)); });
  group.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || keep.has(o) || Array.isArray(o.material)) return;
    const g = o.geometry;
    if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
    const key = materialKey(o.material);
    if (!buckets.has(key)) buckets.set(key, { material: o.material, meshes: [] });
    buckets.get(key).meshes.push(o);
  });
  for (const { material, meshes } of buckets.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((mesh) => {
      const geometry = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone());
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
      geometry.morphAttributes = {};
      return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!merged) continue;
    meshes.forEach((mesh) => mesh.parent.remove(mesh));
    group.add(new THREE.Mesh(merged, material));
  }
}

function poseRider(model, left, side = 1) {
  const rider = model.userData.parts.rider;
  const pose = stunPose(left, PISTOL_STUN_DURATION, side);
  rider.position.set(pose.x, 1.4 + pose.y, 0);
  rider.rotation.set(pose.pitch, 0, -pose.roll);
}

function paintModel(model, colors) {
  const materials = model.userData.materials;
  if (!materials || !colors) return;
  colors.forEach((color, index) => materials[index]?.color.set(color));
  if (model.userData.hatMaterial && colors[0] !== undefined) {
    model.userData.hatMaterial.color.set(colors[0]).lerp(new THREE.Color(0x5c3318), 0.55);
  }
}

function makeCactus() {
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const green = new THREE.MeshStandardMaterial({ color: 0x39a77c, flatShading: true, roughness: 0.8 });
  const lightGreen = new THREE.MeshStandardMaterial({ color: 0x77d49b, flatShading: true, roughness: 0.8 });
  block(cube, green, group, [0, 0.75, 0], [0.47, 1.5, 0.46]);
  block(cube, lightGreen, group, [0, 1.18, 0.24], [0.13, 0.34, 0.06]);
  block(cube, green, group, [-0.37, 0.87, 0], [0.2, 0.63, 0.24]);
  block(cube, green, group, [-0.43, 1.13, 0], [0.42, 0.2, 0.24]);
  block(cube, green, group, [0.37, 0.55, 0], [0.2, 0.51, 0.24]);
  block(cube, green, group, [0.43, 0.78, 0], [0.42, 0.2, 0.24]);
  return group;
}

function makeCrystal(tier) {
  const group = new THREE.Group();
  const crystalDef = CRYSTALS[tier] || CRYSTALS[0];
  const color = crystalDef.color;
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, metalness: 0.25, roughness: 0.24, flatShading: true });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.43 + tier * 0.035), material);
  gem.scale.set(0.85, 1.65, 0.85);
  group.add(gem);
  if (tier === 3) { // Or (Gold) gets decorative ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 4, 12), material);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  return group;
}

const GEM_BURST_POOL = 7;

function makeGemBurst() {
  const group = new THREE.Group();
  const shardGeometry = new THREE.OctahedronGeometry(0.17);
  const shardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.85,
    metalness: 0.3,
    roughness: 0.22,
    flatShading: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const shards = [];
  for (let i = 0; i < GEM_BURST_SHARDS; i += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    shard.scale.set(1, 1.5, 1);
    shard.renderOrder = 2;
    group.add(shard);
    shards.push(shard);
  }
  const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.62, 20), flashMaterial);
  ring.renderOrder = 3;
  group.add(ring);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.33), flashMaterial);
  core.renderOrder = 3;
  group.add(core);
  group.visible = false;
  group.userData = { shards, shardMaterial, flashMaterial, ring, core, specs: [], age: 0, active: false, tier: 0 };
  return group;
}

function makeHazard(kind) {
  if (kind === 'cactus') return makeCactus();
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const rock = new THREE.MeshStandardMaterial({ color: 0x5b416a, flatShading: true, roughness: 0.92 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xf05591, emissive: 0x8c2852, emissiveIntensity: 0.25, flatShading: true });
  block(cube, rock, group, [0, 0.48, 0], [4.02, 0.96, 1.1]);
  block(cube, edge, group, [0, 0.93, 0], [4.05, 0.13, 1.13]);
  return group;
}

function makeShieldBubble() {
  const group = new THREE.Group();
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0x7af0e6,
    emissive: 0x1a7a74,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.38,
    metalness: 0.1,
    roughness: 0.2,
    flatShading: true,
  });
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xb8fffb, transparent: true, opacity: 0.55 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), bubbleMat);
  group.add(sphere);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 6, 18), rimMat);
  torus.rotation.x = Math.PI / 2;
  group.add(torus);
  const torus2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 18), rimMat);
  torus2.rotation.y = Math.PI / 2;
  group.add(torus2);
  group.visible = false;
  return group;
}

function makeReadyAura() {
  const group = new THREE.Group();
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xffd76b,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x4ce9df,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.1, 24), outerMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.025;
  group.add(outerRing);

  const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.76, 24), innerMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.022;
  group.add(innerRing);

  group.userData = { outerMat, innerMat, outerRing, innerRing };
  group.visible = false;
  return group;
}

/**
 * 3D Turbo / Speed-Boost animation group attached to a rider:
 * emerald-cyan & solar-gold wind streaks streaming backward + sonic slipstream rings.
 */
function makeBoostStreaks() {
  const group = new THREE.Group();
  const streakEmerald = new THREE.MeshBasicMaterial({
    color: 0x4effa1,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const streakGold = new THREE.MeshBasicMaterial({
    color: 0xffe46b,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6bffb8,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const streakSpecs = [
    [-0.86, 0.78, 0.0, true],
    [0.86, 0.78, 0.5, true],
    [-0.64, 1.38, 0.25, false],
    [0.64, 1.38, 0.75, false],
    [-0.48, 1.98, 0.12, true],
    [0.48, 1.98, 0.62, true],
    [-0.74, 1.05, 0.38, false],
    [0.74, 1.05, 0.88, false],
    [0.0, 2.28, 0.2, false],
    [0.0, 0.52, 0.7, true],
  ];
  const streaks = streakSpecs.map(([x, y, phase, isEmerald]) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.055, 1.85),
      isEmerald ? streakEmerald : streakGold
    );
    mesh.position.set(x, y, 0);
    mesh.userData = { baseX: x, baseY: y, phase };
    group.add(mesh);
    return mesh;
  });

  const rings = [0, 0.5].map((phase) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.04, 6, 16), ringMat);
    ring.position.set(0, 1.15, 0);
    ring.userData = { phase };
    group.add(ring);
    return ring;
  });

  group.userData = { streaks, rings, streakEmerald, streakGold, ringMat };
  group.visible = false;
  return group;
}

function animateBoostStreaks(boostGroup, time) {
  const { streaks, rings } = boostGroup.userData;
  const tSec = time * 0.001;
  streaks.forEach((streak, i) => {
    const cycle = (tSec * 4.8 + streak.userData.phase) % 1;
    // Stream rapidly from front of horse (-1.1) to behind tail (+2.8)
    streak.position.z = -1.1 + cycle * 3.9;
    streak.position.x = streak.userData.baseX + Math.sin(tSec * 14 + i) * 0.05;
    streak.position.y = streak.userData.baseY + Math.cos(tSec * 12 + i) * 0.04;
    streak.scale.z = 0.65 + Math.sin(cycle * Math.PI) * 0.95;
  });
  rings.forEach((ring) => {
    const cycle = (tSec * 2.6 + ring.userData.phase) % 1;
    ring.position.z = -0.95 + cycle * 3.1;
    const s = 0.72 + cycle * 0.68;
    ring.scale.set(s, s, 1);
  });
}

function makeLassoRope() {
  const group = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd9913b, emissive: 0x8a4a12, emissiveIntensity: 0.35, roughness: 0.7, flatShading: true });
  const segments = 10;
  const meshes = [];
  for (let i = 0; i < segments; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.38), ropeMat);
    group.add(seg);
    meshes.push(seg);
  }
  group.userData.segments = meshes;
  group.visible = false;
  return group;
}

function makeScenery() {
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sandstone = new THREE.MeshStandardMaterial({ color: 0x986445, flatShading: true, roughness: 1 });
  const lilac = new THREE.MeshStandardMaterial({ color: 0x72517e, flatShading: true, roughness: 0.95 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x287c7d, flatShading: true, roughness: 0.8 });
  const pick = (array) => array[Math.floor(Math.random() * array.length)];
  const side = Math.random() > 0.5 ? 1 : -1;
  const x = side * (13 + Math.random() * 4.5);
  const z = -Math.random() * 40;
  const h = 1.4 + Math.random() * 4.5;
  block(cube, pick([sandstone, lilac, teal]), group, [x, h / 2 - 0.5, z], [1.4 + Math.random() * 2.4, h, 1.4 + Math.random() * 2]);
  if (Math.random() > 0.44) {
    block(cube, pick([sandstone, lilac]), group, [x + side * 1.25, h * 0.35, z], [2.7, 0.6, 0.8]);
    block(cube, pick([sandstone, lilac]), group, [x + side * 2.35, h * 0.2 + 0.45, z], [0.65, 1.6, 0.8]);
  }
  group.userData.speedFactor = 0.5 + Math.random() * 0.22;
  return group;
}

function makeWorld(mount, callbacks, getRace, stage, getNetwork, getSkin) {
  const western = stage === 'western';
  const prairie = stage === 'prairie';
  const sardinia = stage === 'sardinia';
  const japan = stage === 'japan';
  const scene = new THREE.Scene();
  const atmosphere = prairie
    ? {
        background: 0x756074, fog: 0xd99a70, exposure: 1.02,
        skyBottom: [0.90, 0.70, 0.45], skyHorizon: [0.84, 0.52, 0.32], skyTop: [0.46, 0.37, 0.44],
        sunBottom: [0.98, 0.25, 0.045], sunTop: [1.0, 0.49, 0.12], glow: [1.0, 0.58, 0.29],
        hemiSky: 0xffdfa0, hemiGround: 0x65523c, sunLight: 0xffb654, rimLight: 0xf1bf77,
      }
    : western
      ? {
          background: 0x75596b, fog: 0xdba17c, exposure: 1.08,
          skyBottom: [0.98, 0.72, 0.49], skyHorizon: [0.88, 0.48, 0.36], skyTop: [0.48, 0.36, 0.49],
          sunBottom: [1.0, 0.32, 0.075], sunTop: [1.0, 0.59, 0.2], glow: [1.0, 0.67, 0.37],
          hemiSky: 0xffd4a2, hemiGround: 0x594238, sunLight: 0xffb660, rimLight: 0xff9877,
        }
      : sardinia
        ? {
            background: 0x59647a, fog: 0xd99b76, exposure: 1.08,
            skyBottom: [0.97, 0.70, 0.49], skyHorizon: [0.83, 0.46, 0.38], skyTop: [0.37, 0.40, 0.54],
            sunBottom: [1.0, 0.34, 0.09], sunTop: [1.0, 0.62, 0.25], glow: [1.0, 0.69, 0.4],
            hemiSky: 0xffd6ab, hemiGround: 0x52605b, sunLight: 0xffb96f, rimLight: 0x87c3c6,
          }
        : japan
          ? {
              background: 0x0d1526, fog: 0x16223b, exposure: 1.12,
              skyBottom: [0.16, 0.23, 0.38], skyHorizon: [0.09, 0.14, 0.27], skyTop: [0.03, 0.05, 0.12],
              sunBottom: [0.88, 0.93, 1.0], sunTop: [0.98, 0.99, 1.0], glow: [0.46, 0.62, 0.92],
              hemiSky: 0x9bb8ff, hemiGround: 0x1d2738, sunLight: 0xd8e6ff, rimLight: 0xff6e54,
            }
          : {
              background: 0x604b70, fog: 0xd28e70, exposure: 1.12,
              skyBottom: [0.97, 0.66, 0.42], skyHorizon: [0.83, 0.42, 0.35], skyTop: [0.40, 0.29, 0.50],
              sunBottom: [1.0, 0.31, 0.06], sunTop: [1.0, 0.57, 0.19], glow: [1.0, 0.62, 0.33],
              hemiSky: 0xffd6b1, hemiGround: 0x49374a, sunLight: 0xffbd70, rimLight: 0xe1a0d4,
            };
  scene.background = new THREE.Color(atmosphere.background);
  scene.fog = new THREE.Fog(atmosphere.fog, 27, 82);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 7.3, 9.4);
  camera.lookAt(0, 0.6, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = atmosphere.exposure;
  renderer.domElement.className = 'mirage-canvas';
  renderer.domElement.setAttribute('aria-label', 'Jeu 3D Mirage Rush — évite les obstacles et ramasse les fragments solaires');
  mount.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(atmosphere.hemiSky, atmosphere.hemiGround, prairie ? 1.65 : 1.9);
  scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(atmosphere.sunLight, prairie ? 1.8 : 2.1);
  sunLight.position.set(0, 5, -46);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(atmosphere.rimLight, prairie ? 0.45 : 0.8);
  rimLight.position.set(7, 6, -10);
  scene.add(rimLight);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const skyVector = (rgb) => new THREE.Vector3(...rgb);
  const sunset = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      skyBottom: { value: skyVector(atmosphere.skyBottom) },
      skyHorizon: { value: skyVector(atmosphere.skyHorizon) },
      skyTop: { value: skyVector(atmosphere.skyTop) },
      sunBottom: { value: skyVector(atmosphere.sunBottom) },
      sunTop: { value: skyVector(atmosphere.sunTop) },
      glow: { value: skyVector(atmosphere.glow) },
      sunElevation: { value: japan ? 25.0 : 5.5 },
      isNight: { value: japan ? 1.0 : 0.0 },
    },
    vertexShader: `varying vec2 skyPoint;
      void main() {
        skyPoint = position.xy + vec2(0.0, 60.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 skyBottom;
      uniform vec3 skyHorizon;
      uniform vec3 skyTop;
      uniform vec3 sunBottom;
      uniform vec3 sunTop;
      uniform vec3 glow;
      uniform float sunElevation;
      uniform float isNight;
      varying vec2 skyPoint;
      void main() {
        float height = skyPoint.y;
        vec3 sky = mix(skyBottom, skyHorizon, smoothstep(0.0, 23.0, height));
        sky = mix(sky, skyTop, smoothstep(18.0, 75.0, height));
        float radius = length(skyPoint - vec2(0.0, sunElevation));
        float haloVisibility = clamp((sunElevation + 12.0) / 17.5, 0.0, 1.0);
        float halo = exp(-radius * radius / 500.0) * 0.38 * haloVisibility;
        sky = mix(sky, glow, halo);
        float aboveHorizon = step(0.0, height);
        float disc = (1.0 - smoothstep(7.85, 8.0, radius)) * aboveHorizon;
        if (isNight > 0.01 && height > 12.0 && disc < 0.01) {
          vec2 cell = floor(skyPoint * 1.35);
          float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
          if (h > 0.968) {
            vec2 center = (cell + 0.5) / 1.35;
            float d = length(skyPoint - center);
            float star = smoothstep(0.28, 0.04, d) * smoothstep(12.0, 26.0, height) * (0.55 + 0.45 * fract(h * 91.3));
            sky += vec3(0.85, 0.92, 1.0) * star * isNight;
          }
        }
        vec3 sunColor = mix(sunBottom, sunTop, clamp((height - (sunElevation - 8.0)) / 16.0, 0.0, 1.0));
        gl_FragColor = vec4(mix(sky, sunColor, disc), 1.0);
      }`,
  }));
  sunset.position.set(0, 59.91, -95);
  sunset.renderOrder = -1;
  scene.add(sunset);

  const applyPrairieSunset = (progress) => {
    if (!prairie) return;
    const state = prairieSunsetState(progress);
    const u = sunset.material.uniforms;
    u.sunElevation.value = state.sunElevation;
    u.isNight.value = state.starAlpha;
    u.skyBottom.value.set(...state.skyBottom);
    u.skyHorizon.value.set(...state.skyHorizon);
    u.skyTop.value.set(...state.skyTop);
    u.glow.value.set(...state.glow);
    scene.fog.color.setRGB(...state.fog);
    scene.background.setRGB(...state.bg);
    hemiLight.color.setRGB(...state.hemiSky);
    hemiLight.groundColor.setRGB(...state.hemiGround);
    hemiLight.intensity = state.hemiIntensity;
    sunLight.color.setRGB(...state.sunLight);
    sunLight.intensity = state.sunIntensity;
    rimLight.intensity = state.rimIntensity;
  };
  if (prairie) block(cube, new THREE.MeshStandardMaterial({ color: 0xa5a34e, roughness: 1 }), scene, [0, -0.39, -35], [180, 0.6, 180]);
  if (western) block(cube, new THREE.MeshStandardMaterial({ color: 0xb58b5d, roughness: 1 }), scene, [0, -0.64, -35], [80, 0.6, 160]);
  if (japan) {
    block(cube, new THREE.MeshStandardMaterial({ color: 0x141e26, roughness: 1 }), scene, [0, -0.45, -35], [180, 0.6, 180]);
    scene.add(makeMountFuji());
  }
  if (sardinia) {
    block(cube, new THREE.MeshStandardMaterial({ color: 0xc9895a, roughness: 1 }), scene, [-17.35, -0.64, -35], [45.3, 0.6, 160]);
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(130, 170), new THREE.MeshStandardMaterial({ color: 0x2f7f92, roughness: 0.35, metalness: 0.1, flatShading: true }));
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(70.3, -0.92, -35);
    scene.add(bay);
    const sea = block(new THREE.PlaneGeometry(240, 13), new THREE.MeshBasicMaterial({ color: 0x2f7f92 }), scene, [0, 6, -94]);
    sea.renderOrder = -1;
  }

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: sardinia ? 0x8d7a5c : 0x68466f, flatShading: true, roughness: 1 });
  for (let i = 0; i < (prairie || japan ? 0 : sardinia ? 9 : 13); i += 1) {
    const width = 5 + Math.random() * 7;
    const height = sardinia ? 2.5 + Math.random() * 4.5 : 4 + Math.random() * 9;
    const mountain = new THREE.Mesh(cube, mountainMaterial);
    const mountainSide = Math.random() > 0.5 ? 1 : -1;
    const mountainX = sardinia ? -18 - Math.random() * 15 : mountainSide * (17 + Math.random() * 11);
    mountain.position.set(mountainX, height / 2 - 1, -38 - Math.random() * 26);
    mountain.scale.set(width, height, 3 + Math.random() * 5);
    scene.add(mountain);
  }

  const floorMaterials = [
    new THREE.MeshStandardMaterial({ color: prairie ? 0xb5ae60 : sardinia ? 0xc9895a : japan ? 0x2b3648 : 0xcea56a, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: prairie ? 0xc0b96c : sardinia ? 0xd9a06d : japan ? 0x344156 : 0xd9b679, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: prairie ? 0xa8a354 : sardinia ? 0xb97846 : japan ? 0x232d3d : 0xc9995f, flatShading: true, roughness: 1 }),
  ];
  const floorGeometry = new THREE.BoxGeometry(2.02, 0.58, 2.02);
  const FLOOR_PERIOD = floorMaterials.length * 2;
  const floorGroup = new THREE.Group();
  floorMaterials.forEach((material, m) => {
    const parts = [];
    for (let zIndex = 0; zIndex < 28; zIndex += 1) {
      for (let lane = 0; lane < LANE_COUNT; lane += 1) {
        if ((zIndex + lane) % floorMaterials.length !== m) continue;
        parts.push(floorGeometry.clone().translate(LANES[lane], -0.34, TRACK_MIN_Z + zIndex * 2));
      }
    }
    floorGroup.add(new THREE.Mesh(mergeGeometries(parts, false), material));
    parts.forEach(part => part.dispose());
  });
  scene.add(floorGroup);
  let floorOffset = 0;
  const placeFloor = () => { floorGroup.position.z = (floorOffset % FLOOR_PERIOD) - FLOOR_PERIOD; };
  placeFloor();

  let skinColors = getSkin?.() ?? null;
  const player = makeExplorer(false, skinColors);
  player.position.x = LANES[1];
  scene.add(player);
  const playerShieldBubble = makeShieldBubble();
  playerShieldBubble.position.set(0, 1.2, 0);
  player.add(playerShieldBubble);
  const playerBoostStreaks = makeBoostStreaks();
  player.add(playerBoostStreaks);

  const duelRivals = DUEL_RIVALS.map((spec) => {
    const mesh = makeExplorer(spec.paletteIndex, CHARACTER_PALETTES[spec.paletteIndex]);
    mesh.position.set(LANES[spec.startLane], 0, -5);
    mesh.visible = false;
    scene.add(mesh);
    const shieldBubble = makeShieldBubble();
    shieldBubble.position.set(0, 1.2, 0);
    mesh.add(shieldBubble);
    const boostStreaks = makeBoostStreaks();
    mesh.add(boostStreaks);
    return {
      ...spec,
      mesh,
      shieldBubble,
      boostStreaks,
      dist: 0,
      lane: spec.startLane,
      x: LANES[spec.startLane],
      jumpLeft: 0,
      base: DUEL_BASE_SPEED * (spec.pace ?? 1),
      boost: SPEED_BOOST_NONE,
      cooldown: 0,
      finishedAt: null,
      next: 0,
      plan: null,
      planned: -1,
      hesitate: false,
      invulnerable: 0,
      shieldActive: false,
      shieldTimer: 0,
      slowTimer: 0,
      slowFactor: LASSO_SLOW_FACTOR,
      stunTimer: 0,
      stunSide: 1,
      powerState: createPowerUpState(),
      powerCooldown: 0,
      powerBoostTimer: 0,
    };
  });
  const onlineRiders = [0,1,2,3].map(slot => {
    const rider = makeExplorer(slot);
    rider.visible = false;
    scene.add(rider);
    const sb = makeShieldBubble();
    sb.position.set(0, 1.2, 0);
    rider.add(sb);
    rider.userData.shieldBubble = sb;
    rider.userData.slowEffect = 0;
    return rider;
  });
  const skinPaint = (rider, colors) => {
    const want = colors || rider.userData.basePalette;
    if (rider.userData.painting === want) return;
    paintModel(rider, want);
    rider.userData.painting = want;
  };
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xfdf0c8 });
  const finishMaterial = new THREE.MeshBasicMaterial({ color: 0x4ce9df });
  const startLine = block(new THREE.BoxGeometry(TRACK_WIDTH, 0.05, 0.45), lineMaterial, scene, [0, 0.025, 1]);
  const finishLine = block(new THREE.BoxGeometry(TRACK_WIDTH, 0.05, 0.75), finishMaterial, scene, [0, 0.03, -DUEL_DISTANCE]);
  startLine.visible = false;
  finishLine.visible = false;
  const playerShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 10),
    new THREE.MeshBasicMaterial({ color: 0x32263e, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.012;
  scene.add(playerShadow);
  const playerReadyAura = makeReadyAura();
  scene.add(playerReadyAura);

  let nextEncounter = createCourse();
  let rowCounter = 0;
  let elapsed = 0;
  const sharedGems = new Map();
  const rows = [];
  function populateRow(row) {
    row.group.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    row.group.clear();
    const encounter = nextEncounter();
    row.index = rowCounter++;
    row.gap = encounter.gap;
    row.items = encounter.items.map((spec, itemIndex) => {
      const object = spec.kind === 'crystal' ? makeCrystal(spec.tier) : prairie ? prairieObstacle(spec.kind) : western ? westernObstacle(spec.kind) : sardinia ? sardiniaObstacle(spec.kind) : japan ? japanObstacle(spec.kind) : makeHazard(spec.kind);
      const x = spec.lanes ? (LANES[spec.lanes[0]] + LANES[spec.lanes[1]]) / 2 : LANES[spec.lane];
      object.position.set(x, spec.kind === 'crystal' ? (spec.raised ? 2.4 : 1.2) : 0, 0);
      const key = `${row.index}:${itemIndex}`;
      const taken = isGemHidden(sharedGems, key, elapsed);
      object.visible = !taken;
      row.group.add(object);
      return { ...spec, key, object, collected: false, burst: false };
    });
    row.checked = false;
    return encounter.gap;
  }
  let initialZ = -20;
  for (let index = 0; index < 7; index++) {
    const row = { group: new THREE.Group(), items: [] };
    const gap = populateRow(row);
    row.group.position.z = initialZ;
    initialZ -= gap;
    scene.add(row.group);
    rows.push(row);
  }

  const reduceMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const gemBursts = [];
  for (let i = 0; i < GEM_BURST_POOL; i += 1) {
    const burst = makeGemBurst();
    scene.add(burst);
    gemBursts.push(burst);
  }
  let burstCursor = 0;
  const burstColor = new THREE.Color();

  function spawnGemBurst(x, y, z, tier = 0) {
    const burst = gemBursts.find((candidate) => !candidate.userData.active)
      || gemBursts[(burstCursor += 1) % gemBursts.length];
    const data = burst.userData;
    data.active = true;
    data.age = 0;
    data.tier = tier;
    data.specs = reduceMotion ? [] : gemBurstShards(GEM_BURST_SHARDS, Math.random);
    burstColor.set(CRYSTALS[tier]?.color ?? CRYSTALS[0].color);
    data.shardMaterial.color.copy(burstColor);
    data.shardMaterial.emissive.copy(burstColor);
    data.flashMaterial.color.copy(burstColor).lerp(new THREE.Color(0xffffff), 0.6);
    burst.position.set(x, y, z);
    burst.visible = true;
    data.ring.quaternion.copy(camera.quaternion);
    updateGemBurst(burst, 0);
  }

  function updateGemBurst(burst, dt) {
    const data = burst.userData;
    data.age += dt;
    const flash = gemFlashState(data.age, data.tier);
    data.flashMaterial.opacity = flash.opacity;
    data.ring.scale.setScalar(flash.scale);
    data.core.scale.setScalar(Math.max(0.001, (1 - flash.life) * 0.9));
    data.shards.forEach((shard, index) => {
      const spec = data.specs[index];
      if (!spec) { shard.visible = false; return; }
      const state = gemShardState(spec, data.age, data.tier);
      shard.visible = true;
      shard.position.set(...state.position);
      shard.rotation.set(...state.rotation);
      shard.scale.set(state.scale, state.scale * 1.5, state.scale);
      data.shardMaterial.opacity = state.opacity;
    });
    if (data.age >= GEM_BURST_DURATION) {
      data.active = false;
      burst.visible = false;
    }
  }

  function updateGemBursts(dt, travel) {
    for (const burst of gemBursts) {
      if (!burst.userData.active) continue;
      burst.position.z += travel;
      updateGemBurst(burst, dt);
    }
  }

  const clearGemBursts = () => gemBursts.forEach((burst) => {
    burst.userData.active = false;
    burst.userData.age = GEM_BURST_DURATION;
    burst.visible = false;
  });

  const burstGemItem = (row, item) => {
    if (item.burst) return;
    item.burst = true;
    spawnGemBurst(item.object.position.x, item.object.position.y, row.group.position.z + item.object.position.z, item.tier ?? 0);
  };

  // Pistol shots: a short-lived tracer plus a muzzle flash.
  const shotTracers = [];
  const tracerMaterial = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 });
  const tracerGeometry = new THREE.BoxGeometry(0.06, 0.06, 1);
  const flashGeometry = new THREE.SphereGeometry(0.22, 8, 6);
  const spawnTracer = (from, to) => {
    const group = new THREE.Group();
    const beam = new THREE.Mesh(tracerGeometry, tracerMaterial.clone());
    const length = from.distanceTo(to);
    beam.scale.z = Math.max(0.1, length);
    beam.position.copy(from).lerp(to, 0.5);
    beam.lookAt(to);
    const flash = new THREE.Mesh(flashGeometry, beam.material);
    flash.position.copy(from);
    group.add(beam, flash);
    scene.add(group);
    shotTracers.push({ group, life: 0.16 });
  };
  const updateTracers = (dt) => {
    for (let i = shotTracers.length - 1; i >= 0; i--) {
      const shot = shotTracers[i];
      shot.life -= dt;
      shot.group.children[0].material.opacity = Math.max(0, shot.life / 0.16);
      if (shot.life <= 0) {
        shot.group.children[0].material.dispose();
        scene.remove(shot.group);
        shotTracers.splice(i, 1);
      }
    }
  };

  const lassoProjectiles = [];
  const lassoRopePool = [];
  function acquireRope() {
    let rope = lassoRopePool.pop();
    if (!rope) {
      rope = makeLassoRope();
      scene.add(rope);
    }
    rope.visible = true;
    return rope;
  }
  function releaseRope(rope) {
    rope.visible = false;
    lassoRopePool.push(rope);
  }

  const scenery = [];
  if (prairie) {
    for (let i = 0; i < 11; i++) for (const side of [-1, 1]) {
      const item = prairieField(i, side);
      scene.add(item);
      scenery.push(item);
    }
  } else if (western) {
    for (let i = 0; i < 10; i++) for (const side of [-1, 1]) {
      const item = westernBuilding(i, side);
      scene.add(item);
      scenery.push(item);
    }
  } else if (sardinia) {
    for (let i = 0; i < 10; i++) {
      const village = sardiniaVillage(i, -1);
      const seaside = sardiniaSeaside(i);
      scene.add(village, seaside);
      scenery.push(village, seaside);
    }
  } else if (japan) {
    for (let i = 0; i < 11; i++) for (const side of [-1, 1]) {
      const item = japanPlains(i, side);
      scene.add(item);
      scenery.push(item);
    }
  } else for (let i = 0; i < 18; i++) {
    const item = makeScenery();
    item.position.z -= i * 4.8;
    scene.add(item);
    scenery.push(item);
  }
  scenery.forEach(bakeStaticScenery);

  let active = false;
  let race = { mode: 'rush' };
  let distance = 0;
  let rivalDistance = 0;
  let baseSpeed = DUEL_BASE_SPEED;
  let boost = SPEED_BOOST_NONE;
  let trace = [0];
  let seed = 0;
  const npcCourseState = { course: [], gen: null, genPos: 20, genIndex: 0 };
  const npcEnsureCourse = (maxDist) => {
    while (npcCourseState.genPos < maxDist + 60) {
      const encounter = npcCourseState.gen();
      npcCourseState.course.push({
        index: npcCourseState.genIndex,
        pos: npcCourseState.genPos,
        items: encounter.items.map((item, i) => ({ ...item, key: `${npcCourseState.genIndex}:${i}` })),
      });
      npcCourseState.genIndex += 1;
      npcCourseState.genPos += encounter.gap;
    }
  };
  const hidePlayerGem = (key) => {
    markGemTaken(sharedGems, key, elapsed, GEM_RESPAWN_DELAY);
    rows.forEach(row => row.items.forEach(item => {
      if (item.key !== key) return;
      if (item.object.visible) burstGemItem(row, item);
      item.object.visible = false;
    }));
  };

  // Power-up charging system: players collect diamonds to charge power-ups
  // Each diamond gives charge points based on tier (Cyan=1, Red=1, Green=2, Gold=3)
  // Shield and Lasso need 8 points, Pistol takes 12 points.
  // When any power-up is used, all power-ups reset to zero.
  let powerState = createPowerUpState();

  // Power-up player state
  let shieldActive = false;
  let shieldTimer = 0;
  let powerBoostTimer = 0;
  let playerSlowTimer = 0;
  let playerSlowFactor = LASSO_SLOW_FACTOR;
  let playerSlowKind = 'lasso';
  let shieldFlash = 0;
  let playerStun = 0;
  let playerStunSide = 1;
  let lastNetworkStun = 0;

  const isGhostRival = (r) => Boolean(race.challenge && r.id === 'ombre');
  const getRivalDisplayName = (r) => (isGhostRival(r) && race.challenge?.name ? race.challenge.name : r.name);
  const getLeadingRival = () => duelRivals.reduce((best, r) => (!best || r.dist > best.dist ? r : best), duelRivals[0]);

  const getCurrentRank = () => {
    if (race.mode === 'online') {
      const net = getNetwork?.();
      if (net?.players?.length) {
        const sorted = [...net.players].sort((a,b)=> (Number(b.distance)||0)-(Number(a.distance)||0));
        const idx = sorted.findIndex(p=> p.user_id===net.userId);
        if (idx >=0) return idx+1;
        const myDist = distance;
        let ahead = 0;
        for (const p of net.players) if ((Number(p.distance)||0) > myDist) ahead++;
        return ahead+1;
      }
      return 1;
    }
    if (race.mode === 'duel') {
      return 1 + duelRivals.filter((r) => r.dist > distance).length;
    }
    return 1;
  };

  const findLassoTarget = () => {
    if (race.mode === 'online') {
      const net = getNetwork?.();
      if (!net?.players?.length) return null;
      const myDist = distance;
      const ahead = net.players
        .filter(p=> p.user_id!==net.userId && !p.finished_at && (Number(p.distance)||0) > myDist + 1)
        .sort((a,b)=> (Number(a.distance)||0)-(Number(b.distance)||0));
      if (ahead.length>0) {
        return { kind: 'online', player: ahead[0], distance: ahead[0].distance };
      }
      return null;
    }
    if (race.mode === 'duel') {
      const targetable = duelRivals.filter((r) => !isGhostRival(r) && r.finishedAt === null);
      const ahead = targetable
        .filter((r) => r.dist > distance + 1.2)
        .sort((a, b) => a.dist - b.dist);
      if (ahead.length > 0) {
        return { kind: 'rival', npc: ahead[0] };
      }
      return null;
    }
    return null;
  };

  const activateShield = (fromNetwork = false) => {
    shieldActive = true;
    shieldTimer = SHIELD_DURATION;
    playerShieldBubble.visible = true;
    shieldFlash = 0.3;
    if (!fromNetwork) {
      callbacks.powerUp?.({ type: POWER_UPS.SHIELD, action: 'activated' });
      callbacks.shield?.(true);
    }
  };

  const consumeShield = () => {
    shieldActive = false;
    shieldTimer = 0;
    playerShieldBubble.visible = false;
    shieldFlash = 0.4;
    callbacks.shield?.(false);
    callbacks.powerUp?.({ type: POWER_UPS.SHIELD, action: 'consumed' });
  };

  const applyPlayerSlow = (fromNetwork = false) => {
    if (shieldActive) {
      consumeShield();
      return false;
    }
    playerSlowTimer = LASSO_SLOW_DURATION;
    playerSlowFactor = LASSO_SLOW_FACTOR;
    playerSlowKind = 'lasso';
    invulnerable = Math.max(invulnerable, 0.2);
    crashAnimation = 0.32;
    if (!fromNetwork) callbacks.lassoHit?.({ target: 'player' });
    return true;
  };

  const applyNpcSlow = (targetNpc = duelRivals[0]) => {
    if (!targetNpc) return false;
    if (targetNpc.shieldActive) {
      targetNpc.shieldActive = false;
      targetNpc.shieldTimer = 0;
      targetNpc.shieldBubble.visible = false;
      return false;
    }
    targetNpc.slowTimer = LASSO_SLOW_DURATION;
    targetNpc.slowFactor = LASSO_SLOW_FACTOR;
    targetNpc.invulnerable = Math.max(targetNpc.invulnerable, 0.2);
    return true;
  };

  const fireLasso = (targetInfo) => {
    if (!targetInfo) {
      callbacks.powerUp?.({ type: POWER_UPS.LASSO, action: 'fired', target: null });
      return;
    }
    const rope = acquireRope();
    const start = new THREE.Vector3(player.position.x, 1.2, 0);
    let end;
    if (targetInfo.kind === 'rival') {
      const targetMesh = (targetInfo.npc || duelRivals[0]).mesh;
      end = new THREE.Vector3(targetMesh.position.x, 1.0, targetMesh.position.z);
    } else if (targetInfo.kind === 'online') {
      const net = getNetwork?.();
      const peer = net?.players?.find(p=> p.user_id===targetInfo.player.user_id);
      const slot = peer?.slot ?? 0;
      const rider = onlineRiders[slot];
      if (rider) end = new THREE.Vector3(rider.position.x, 1.0, rider.position.z);
      else end = new THREE.Vector3(LANES[targetInfo.player.lane ?? 1], 1.0, distance - (targetInfo.player.distance||0));
    } else {
      end = new THREE.Vector3(player.position.x, 1.0, -12);
    }
    lassoProjectiles.push({
      rope,
      start: start.clone(),
      end: end.clone(),
      progress: 0,
      target: targetInfo,
      fromPlayer: true,
    });
    callbacks.powerUp?.({ type: POWER_UPS.LASSO, action: 'fired', target: targetInfo });
    if (targetInfo.kind === 'online') {
      callbacks.lasso?.(targetInfo.player);
    }
  };

  const findPistolTarget = () => {
    if (race.mode === 'online') {
      const net = getNetwork?.();
      const leader = (net?.players || [])
        .filter(p => p.user_id !== net.userId && !p.finished_at)
        .reduce((best, p) => (!best || (Number(p.distance) || 0) > (Number(best.distance) || 0) ? p : best), null);
      return leader && (Number(leader.distance) || 0) > distance ? { kind: 'online', player: leader } : null;
    }
    if (race.mode === 'duel') {
      const targetable = duelRivals.filter((r) => !isGhostRival(r) && r.finishedAt === null);
      const ahead = targetable
        .filter((r) => r.dist > distance)
        .sort((a, b) => b.dist - a.dist);
      if (ahead.length > 0) return { kind: 'rival', npc: ahead[0] };
    }
    return null;
  };

  const stunPlayer = (fromNetwork = false) => {
    if (shieldActive) {
      consumeShield();
      return false;
    }
    playerStun = PISTOL_STUN_DURATION;
    playerStunSide = laneIndex >= LANE_COUNT / 2 ? -1 : 1;
    boost = SPEED_BOOST_NONE;
    jumpLeft = 0;
    if (!fromNetwork) callbacks.pistolHit?.({ target: 'player' });
    return true;
  };

  const stunNpc = (targetNpc = duelRivals[0]) => {
    if (!targetNpc) return false;
    if (targetNpc.shieldActive) {
      targetNpc.shieldActive = false;
      targetNpc.shieldTimer = 0;
      targetNpc.shieldBubble.visible = false;
      return false;
    }
    targetNpc.stunTimer = PISTOL_STUN_DURATION;
    targetNpc.stunSide = targetNpc.lane >= LANE_COUNT / 2 ? -1 : 1;
    targetNpc.boost = SPEED_BOOST_NONE;
    targetNpc.jumpLeft = 0;
    return true;
  };

  const firePistol = (targetInfo) => {
    const from = new THREE.Vector3(player.position.x + 0.35, player.position.y + 1.9, -0.5);
    if (!targetInfo) {
      spawnTracer(from, new THREE.Vector3(player.position.x, 3, -30));
      callbacks.powerUp?.({ type: POWER_UPS.PISTOL, action: 'fired', target: null });
      callbacks.pistolHit?.({ target: null });
      return;
    }
    if (targetInfo.kind === 'rival') {
      const targetNpc = targetInfo.npc || duelRivals[0];
      const targetMesh = targetNpc.mesh;
      spawnTracer(from, new THREE.Vector3(targetMesh.position.x, targetMesh.position.y + 1.9, targetMesh.position.z));
      const hit = stunNpc(targetNpc);
      callbacks.pistolHit?.({ target: 'rival', name: getRivalDisplayName(targetNpc), blocked: !hit });
    } else if (targetInfo.kind === 'online') {
      const net = getNetwork?.();
      const peer = net?.players?.find(p => p.user_id === targetInfo.player.user_id);
      const rider = onlineRiders[peer?.slot ?? 0];
      const to = rider?.visible
        ? new THREE.Vector3(rider.position.x, rider.position.y + 1.9, rider.position.z)
        : new THREE.Vector3(LANES[targetInfo.player.lane ?? 1], 1.9, Math.max(-70, Math.min(10, distance - (Number(targetInfo.player.distance) || 0))));
      spawnTracer(from, to);
      callbacks.pistol?.(targetInfo.player);
      callbacks.pistolHit?.({ target: 'online', player: targetInfo.player });
    }
    callbacks.powerUp?.({ type: POWER_UPS.PISTOL, action: 'fired', target: targetInfo });
  };

  // Power-up activation functions — using a power discharges ONLY that power-up
  const useShield = () => {
    if (!powerUpsEnabled(race.mode)) return;
    const res = consumePowerUp(powerState, POWER_UPS.SHIELD);
    if (!res.used) return;
    powerState = res.state;
    activateShield();
    callbacks.powerUp?.({ type: POWER_UPS.SHIELD, action: 'used', chargesLeft: 0, resetAll: false });
    emitHud(true);
  };

  const useLasso = () => {
    if (!powerUpsEnabled(race.mode) || (powerState.lassoCharges || 0) <= 0) return;
    const target = findLassoTarget();
    if (!target) {
      callbacks.powerUp?.({ type: POWER_UPS.LASSO, action: 'no_target' });
      return;
    }
    const res = consumePowerUp(powerState, POWER_UPS.LASSO);
    if (!res.used) return;
    powerState = res.state;
    fireLasso(target);
    callbacks.powerUp?.({ type: POWER_UPS.LASSO, action: 'used', chargesLeft: 0, resetAll: false });
    emitHud(true);
  };

  const usePistol = () => {
    if (!powerUpsEnabled(race.mode) || (powerState.pistolCharges || 0) <= 0) return;
    const target = findPistolTarget();
    if (!target) {
      callbacks.powerUp?.({ type: POWER_UPS.PISTOL, action: 'no_target' });
      return;
    }
    const res = consumePowerUp(powerState, POWER_UPS.PISTOL);
    if (!res.used) return;
    powerState = res.state;
    firePistol(target);
    callbacks.powerUp?.({ type: POWER_UPS.PISTOL, action: 'used', chargesLeft: 0, resetAll: false });
    emitHud(true);
  };

  const useBoost = () => {
    if (!powerUpsEnabled(race.mode)) return;
    const res = consumePowerUp(powerState, POWER_UPS.BOOST);
    if (!res.used) return;
    powerState = res.state;
    powerBoostTimer = POWER_BOOST_DURATION;
    callbacks.powerUp?.({ type: POWER_UPS.BOOST, action: 'used', chargesLeft: 0, resetAll: false });
    emitHud(true);
  };

  const resetPowerUps = () => {
    for (const proj of lassoProjectiles) releaseRope(proj.rope);
    lassoProjectiles.length = 0;
    shieldActive = false;
    shieldTimer = 0;
    powerBoostTimer = 0;
    playerSlowTimer = 0;
    playerSlowFactor = LASSO_SLOW_FACTOR;
    playerStun = 0;
    lastNetworkStun = 0;
    playerShieldBubble.visible = false;
    playerBoostStreaks.visible = false;
    playerReadyAura.visible = false;
    duelRivals.forEach((r) => {
      r.shieldActive = false;
      r.shieldTimer = 0;
      r.powerBoostTimer = 0;
      r.slowTimer = 0;
      r.stunTimer = 0;
      r.shieldBubble.visible = false;
      r.boostStreaks.visible = false;
      r.powerState = createPowerUpState();
      r.powerCooldown = 0;
    });

    // Reset all power-up charges & points to zero
    powerState = createPowerUpState();
  };

  const triggerNpcPowerAction = (npc) => {
    if (isGhostRival(npc) || npc.finishedAt !== null) return;
    const candidates = [];
    if (distance < DUEL_DISTANCE) {
      candidates.push({ kind: 'player', id: 'player', dist: distance });
    }
    for (const other of duelRivals) {
      if (other !== npc && !isGhostRival(other) && other.finishedAt === null) {
        candidates.push({ kind: 'rival', id: other.id, npc: other, dist: other.dist });
      }
    }
    const decision = chooseNpcPowerAction(npc, candidates);
    if (!decision) return;
    const consumed = consumePowerUp(npc.powerState, decision.type);
    if (!consumed.used) return;
    npc.powerState = consumed.state;
    npc.powerCooldown = 1.1;

    const attackerName = getRivalDisplayName(npc);
    if (decision.type === POWER_UPS.SHIELD) {
      npc.shieldActive = true;
      npc.shieldTimer = SHIELD_DURATION;
      npc.shieldBubble.visible = true;
      callbacks.powerUp?.({ type: POWER_UPS.SHIELD, action: 'npc_used', npcName: attackerName });
      return;
    }

    if (decision.type === POWER_UPS.BOOST) {
      npc.powerBoostTimer = POWER_BOOST_DURATION;
      callbacks.powerUp?.({ type: POWER_UPS.BOOST, action: 'npc_used', npcName: attackerName });
      return;
    }

    if (decision.type === POWER_UPS.LASSO && decision.target) {
      const rope = acquireRope();
      const start = new THREE.Vector3(npc.mesh.position.x, 1.2, npc.mesh.position.z);
      let end;
      if (decision.target.kind === 'player') {
        end = new THREE.Vector3(player.position.x, 1.0, 0);
      } else {
        const targetMesh = (decision.target.npc || duelRivals[0]).mesh;
        end = new THREE.Vector3(targetMesh.position.x, 1.0, targetMesh.position.z);
      }
      lassoProjectiles.push({
        rope,
        start: start.clone(),
        end: end.clone(),
        progress: 0,
        target: decision.target,
        fromPlayer: false,
        fromNpc: npc,
      });
      callbacks.powerUp?.({ type: POWER_UPS.LASSO, action: 'npc_used', npcName: attackerName });
      return;
    }

    if (decision.type === POWER_UPS.PISTOL && decision.target) {
      const from = new THREE.Vector3(npc.mesh.position.x + 0.35, npc.mesh.position.y + 1.9, npc.mesh.position.z);
      if (decision.target.kind === 'player') {
        spawnTracer(from, new THREE.Vector3(player.position.x, player.position.y + 1.9, 0));
        const blocked = shieldActive;
        stunPlayer(true);
        callbacks.pistolHit?.({ target: 'player', from: 'npc', attackerName, blocked });
      } else if (decision.target.kind === 'rival' && decision.target.npc) {
        const targetNpc = decision.target.npc;
        const targetMesh = targetNpc.mesh;
        spawnTracer(from, new THREE.Vector3(targetMesh.position.x, targetMesh.position.y + 1.9, targetMesh.position.z));
        const hit = stunNpc(targetNpc);
        callbacks.pistolHit?.({
          target: 'npc_vs_npc',
          from: 'npc',
          attackerName,
          name: getRivalDisplayName(targetNpc),
          blocked: !hit,
        });
      }
    }
  };

  const updateSingleNpc = (npc, dt) => {
    if (isGhostRival(npc)) {
      npc.dist = ghostDistance(race.challenge.trace, elapsed, race.challenge.duration);
      npc.lane = LANE_COUNT - 1;
      npc.x = LANES[npc.lane];
      npc.jumpLeft = 0;
      if (npc.dist >= DUEL_DISTANCE && npc.finishedAt === null) {
        npc.finishedAt = race.challenge.duration;
      }
      return npc.dist;
    }
    npcEnsureCourse(npc.dist);
    npc.jumpLeft = Math.max(0, npc.jumpLeft - dt);
    npc.cooldown = Math.max(0, npc.cooldown - dt);
    npc.powerCooldown = Math.max(0, (npc.powerCooldown || 0) - dt);
    npc.powerBoostTimer = Math.max(0, (npc.powerBoostTimer || 0) - dt);
    npc.invulnerable = Math.max(0, npc.invulnerable - dt);
    npc.shieldTimer = Math.max(0, npc.shieldTimer - dt);
    if (npc.shieldTimer <= 0) npc.shieldActive = false;
    npc.slowTimer = Math.max(0, npc.slowTimer - dt);
    npc.stunTimer = Math.max(0, (npc.stunTimer || 0) - dt);
    const slowFactor = npc.slowTimer > 0 ? (npc.slowFactor ?? LASSO_SLOW_FACTOR) : 1;
    const targetBaseSpeed = DUEL_BASE_SPEED * (npc.pace ?? 1);
    npc.base += (targetBaseSpeed - npc.base) * Math.min(1, dt * 0.65);
    npc.boost = tickSpeedBoost(npc.boost, dt);
    const effectiveNpcBonus = Math.max(npc.boost.bonus, npc.powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0);
    const rawSpeed = duelSpeed(npc.base, effectiveNpcBonus);
    const speed = npc.stunTimer > 0 ? 0 : rawSpeed * slowFactor;
    const target = npcCourseState.course[npc.next];
    if (target) {
      const ahead = target.pos - npc.dist;
      if (npc.planned !== target.index && ahead < 24) {
        npc.planned = target.index;
        npc.hesitate = Math.random() < (npc.hesitateChance ?? 0.12);
        const occupiedLanes = duelRivals
          .filter((other) => other !== npc && Math.abs(other.dist - npc.dist) < 8)
          .map((other) => (other.planned === target.index && other.plan ? other.plan.lane : other.lane));
        if (Math.abs(distance - npc.dist) < 5) occupiedLanes.push(laneIndex);
        npc.plan = planNpcLane(
          target.items.map((item) => ({ ...item, taken: isGemHidden(sharedGems, item.key, elapsed) })),
          npc.lane,
          occupiedLanes
        );
      }
      if (npc.stunTimer <= 0 && npc.plan && !npc.hesitate && npc.cooldown <= 0 && npc.lane !== npc.plan.lane && ahead < 20) {
        npc.lane += Math.sign(npc.plan.lane - npc.lane);
        npc.cooldown = 0.15 + Math.random() * 0.08;
      }
      if (npc.stunTimer <= 0 && npc.plan?.jump && !npc.hesitate && npc.jumpLeft <= 0 && speed > 0 && ahead / speed < 0.42 && ahead > 0) npc.jumpLeft = 0.82;
      if (npc.dist + speed * dt >= target.pos) {
        const height = jumpHeight(npc.jumpLeft);
        const near = (lane) => Math.abs(npc.x - LANES[lane]) < 0.95;
        const hazard = target.items.find((item) => item.kind !== 'crystal' && (item.lanes || [item.lane]).some(near));
        if (hazard && !(hazard.kind === 'barrier' && height > 1.05) && npc.invulnerable <= 0) {
          if (npc.shieldActive) {
            npc.shieldActive = false;
            npc.shieldTimer = 0;
            npc.invulnerable = 0.6;
          } else {
            npc.base = Math.max(8, speed * 0.55);
            npc.boost = SPEED_BOOST_NONE;
            npc.invulnerable = 1.15;
          }
        }
        const gem = target.items.find((item) => item.kind === 'crystal' && Math.abs(npc.x - LANES[item.lane]) < 0.85 && (!item.raised || height > 1.05) && !isGemHidden(sharedGems, item.key, elapsed));
        if (gem) {
          const tier = gem.tier ?? 0;
          const effect = crystalPickupEffect(tier, false);
          hidePlayerGem(gem.key);
          npc.boost = effect.boost;
          const chargeRes = chargePowerUps(npc.powerState, tier);
          npc.powerState = chargeRes.state;
          if (chargeRes.charged.length > 0 && npc.powerCooldown <= 0) {
            npc.powerCooldown = 0.25 + Math.random() * 0.35;
          }
        }
        npc.next += 1;
      }
    }
    triggerNpcPowerAction(npc);
    npc.x += (LANES[npc.lane] - npc.x) * Math.min(1, dt * 12);
    npc.dist = Math.min(DUEL_DISTANCE, npc.dist + speed * dt);
    if (npc.dist >= DUEL_DISTANCE && npc.finishedAt === null) npc.finishedAt = elapsed;
    return npc.dist;
  };

  const updateDuelRivals = (dt) => {
    let maxDist = 0;
    for (const r of duelRivals) {
      const d = updateSingleNpc(r, dt);
      if (d > maxDist) maxDist = d;
    }
    return maxDist;
  };

  let score = 0;
  let gems = 0;
  let combo = 0;
  let cowboyStreak = 0;
  let lives = 3;
  let laneIndex = 1;
  let jumpLeft = 0;
  let poseLeft = 0;
  let invulnerable = 0;
  let crashAnimation = 0;
  let crashDirection = 1;
  let lastHud = 0;
  let lastFrame = performance.now();
  let raf = 0;

  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width || mount.clientWidth || 1));
    const height = Math.max(1, Math.floor(bounds.height || mount.clientHeight || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(50) / 2) / Math.min(1, camera.aspect)));
    camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(mount);
  window.addEventListener('resize', resize);
  resize();
  const initialResizeFrame = requestAnimationFrame(resize);

  const emitHud = (force = false) => {
    const now = performance.now();
    if (!force && now - lastHud < 125) return;
    lastHud = now;
    const leadingRival = getLeadingRival();
    const effectivePlayerBonus = Math.max(boost.bonus, powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0);
    callbacks.hud?.({
      score,
      gems,
      combo,
      multiplier: (1 + Math.min(3, Math.floor(combo / 5) * 0.5)).toFixed(1),
      lives,
      remaining: Math.max(0, RUN_SECONDS - elapsed),
      distance,
      lane: laneIndex,
      jump: jumpHeight(jumpLeft),
      rivalDistance,
      speed: duelSpeed(baseSpeed * (playerSlowTimer > 0 ? playerSlowFactor : 1), effectivePlayerBonus),
      boostLeft: Math.max(boost.left, powerBoostTimer),
      powerBoostActive: powerBoostTimer > 0,
      powerBoostLeft: powerBoostTimer,
      mode: race.mode,
      rivalName: leadingRival ? getRivalDisplayName(leadingRival) : (race.challenge?.name || 'L’OMBRE'),
      rivals: duelRivals.map((r, idx) => ({
        id: r.id,
        slot: idx + 1,
        name: getRivalDisplayName(r),
        distance: Math.round(r.dist),
      })),
      totalRiders: 1 + duelRivals.length,
      shieldActive,
      shieldLeft: shieldTimer,
      slowed: playerSlowTimer>0,
      slowLeft: playerSlowTimer,
      slowKind: playerSlowTimer>0 ? playerSlowKind : null,
      rank: getCurrentRank(),
      stunned: playerStun > 0,
      stunLeft: playerStun,
      // Power-up charges & charge progress for UI
      ...powerUpHudState(powerState),
    });
  };

  const finish = () => {
    if (!active) return;
    active = false;
    if (race.mode === 'online') {
      callbacks.finish?.({ mode: 'online', score, gems, duration: elapsed, distance: DUEL_DISTANCE, lane: laneIndex, jump: 0 });
    } else if (race.mode !== 'rush') {
      trace.push(DUEL_DISTANCE);
      const leadingRival = getLeadingRival();
      const playerDuration = Math.round(elapsed * 10) / 10;
      const rivalsSummary = duelRivals.map((r, idx) => ({
        id: r.id,
        slot: idx + 1,
        name: getRivalDisplayName(r),
        distance: Math.round(r.dist),
        duration: r.finishedAt === null ? null : Math.round(r.finishedAt * 10) / 10,
      }));
      const aheadCount = duelRivals.filter((r) => (r.finishedAt !== null && r.finishedAt <= elapsed) || r.dist > distance).length;
      const finalRank = 1 + aheadCount;
      callbacks.finish?.({
        mode: 'duel',
        score,
        gems,
        duration: playerDuration,
        rank: finalRank,
        totalRiders: 1 + duelRivals.length,
        rivals: rivalsSummary,
        rivalDuration: leadingRival?.finishedAt === null ? null : Math.round((leadingRival?.finishedAt ?? 0) * 10) / 10,
        rivalDistance: Math.round(rivalDistance),
        won: finalRank === 1,
        seed,
        trace,
        stage,
        rivalName: leadingRival ? getRivalDisplayName(leadingRival) : (race.challenge?.name || 'L’OMBRE'),
      });
    } else callbacks.finish?.({ mode: 'rush', score, gems, duration: Math.max(1, Math.round(elapsed)) });
  };

  const reset = () => {
    race = getRace();
    seed = race.seed ?? race.challenge?.seed ?? (Math.random() * 0xffffffff) >>> 0;
    distance = 0;
    rivalDistance = 0;
    baseSpeed = DUEL_BASE_SPEED;
    boost = SPEED_BOOST_NONE;
    trace = [0];
    startLine.position.z = 1;
    finishLine.position.z = -DUEL_DISTANCE;
    startLine.visible = race.mode !== 'rush';
    finishLine.visible = race.mode !== 'rush';
    elapsed = 0;
    score = 0;
    gems = 0;
    combo = 0;
    cowboyStreak = 0;
    lives = 3;
    laneIndex = 1;
    jumpLeft = 0;
    poseLeft = 0;
    invulnerable = 0;
    crashAnimation = 0;
    crashDirection = 1;
    player.position.set(LANES[laneIndex], 0, 0);
    floorOffset = 0;
    placeFloor();
    player.visible = true;
    nextEncounter = createCourse(race.mode !== 'rush' ? seededRandom(seed) : Math.random);
    rowCounter = 0;
    sharedGems.clear();
    Object.assign(npcCourseState, {
      course: [],
      gen: createCourse(seededRandom(seed)),
      genPos: 20,
      genIndex: 0,
    });
    duelRivals.forEach((r) => {
      Object.assign(r, {
        dist: 0,
        lane: r.startLane,
        x: LANES[r.startLane],
        jumpLeft: 0,
        base: DUEL_BASE_SPEED * (r.pace ?? 1),
        boost: SPEED_BOOST_NONE,
        cooldown: 0,
        finishedAt: null,
        next: 0,
        plan: null,
        planned: -1,
        hesitate: false,
        invulnerable: 0,
        shieldActive: false,
        shieldTimer: 0,
        slowTimer: 0,
        slowFactor: LASSO_SLOW_FACTOR,
        stunTimer: 0,
        stunSide: 1,
      });
      r.mesh.position.set(LANES[r.startLane], 0, 0);
      r.mesh.visible = race.mode === 'duel';
    });
    let z = -20;
    rows.forEach(row => {
      const gap = populateRow(row);
      row.group.position.z = z;
      z -= gap;
    });
    resetPowerUps();
    clearGemBursts();
    applyPrairieSunset(0);
    emitHud(true);
  };

  const action = (name) => {
    if (!active || playerStun > 0) return;
    if (name === 'use_shield' || name === 'shield') useShield();
    else if (name === 'use_lasso' || name === 'lasso') useLasso();
    else if (name === 'use_pistol' || name === 'pistol') usePistol();
    else if (name === 'use_boost' || name === 'boost') useBoost();
    else {
      laneIndex = playerLaneAfterAction(laneIndex, name, jumpLeft);
      if (name === 'jump' && jumpLeft <= 0) jumpLeft = 0.82;
    }
  };

  const onKeyDown = (event) => {
    if (!active || event.repeat) return;
    const key = event.key.toLowerCase();
    const code = event.code;
    const target = event.target?.tagName;
    if (target === 'INPUT' || target === 'TEXTAREA' || target === 'SELECT') return;

    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'q', 'd', 'w', 'z', 'e', 'r'].includes(key)) event.preventDefault();

    // Movement
    if (key === 'arrowleft') action('left');
    if (key === 'arrowright') action('right');
    if (key === 'arrowup' || key === ' ') action('jump');

    // Power-up shortcuts QWER / AZER
    // Q or A -> Shield
    if (code === 'KeyQ' || code === 'KeyA' || key === 'q' || key === 'a') {
      useShield();
    }
    // W or Z -> Lasso
    else if (code === 'KeyW' || code === 'KeyZ' || key === 'w' || key === 'z') {
      useLasso();
    }
    // E -> Boost (Turbo 3s)
    else if (code === 'KeyE' || key === 'e') {
      useBoost();
    }
    // R -> Pistol (Tir)
    else if (code === 'KeyR' || key === 'r') {
      usePistol();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  const touchFeedback = createSwipeFeedback(mount);
  const detachSwipe = attachSwipeControls(renderer.domElement, action, {
    onGesture: (name) => touchFeedback.pulse(name),
  });
  let hintPending = false;

  const animate = (time) => {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.04, (time - lastFrame) / 1000);
    lastFrame = time;
    const running = active;
    const network = getNetwork?.();
    const wallNow = Date.now();
    if (running && race.mode !== 'rush') {
      baseSpeed += (DUEL_BASE_SPEED - baseSpeed) * Math.min(1, dt * 0.65);
      if (playerSlowTimer > 0) baseSpeed = Math.max(DUEL_BASE_SPEED * 0.5, baseSpeed - dt * 8);
      boost = tickSpeedBoost(boost, dt);
    }
    const slowMul = playerSlowTimer > 0 ? playerSlowFactor : 1;
    const effectivePlayerBonus = Math.max(boost.bonus, powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0);
    const speed = running && playerStun <= 0
      ? race.mode !== 'rush'
        ? duelSpeed(baseSpeed, effectivePlayerBonus) * slowMul
        : ((12 + Math.min(7, elapsed * 0.12)) + (powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0)) * slowMul
      : 0;
    if (running) {
      elapsed += dt;
      if (race.mode !== 'rush') {
        distance = Math.min(DUEL_DISTANCE, distance + speed * dt);
        rivalDistance = race.mode === 'online' ? 0 : updateDuelRivals(dt);
        while (trace.length * 0.5 <= elapsed && trace.length < 359) trace.push(Math.round(distance));
        startLine.position.z = 1 + distance;
        finishLine.position.z = distance - DUEL_DISTANCE;
      } else {
        distance += speed * dt;
      }
      jumpLeft = Math.max(0, jumpLeft - dt);
      poseLeft = Math.max(0, poseLeft - dt);
      crashAnimation = Math.max(0, crashAnimation - dt);
      invulnerable = Math.max(0, invulnerable - dt);
      powerBoostTimer = Math.max(0, powerBoostTimer - dt);
      shieldTimer = Math.max(0, shieldTimer - dt);
      if (shieldTimer <= 0 && shieldActive) {
        shieldActive = false;
        playerShieldBubble.visible = false;
        callbacks.shield?.(false);
      }
      playerSlowTimer = Math.max(0, playerSlowTimer - dt);
      playerStun = Math.max(0, playerStun - dt);
      shieldFlash = Math.max(0, shieldFlash - dt);

      if (race.mode === 'online') {
        const net = getNetwork?.();
        const me = net?.players?.find(p=> p.user_id===net.userId);
        if (me) {
          const now = Date.now();
          const shieldUntil = me.shield_until ? Date.parse(me.shield_until) : 0;
          const slowedUntil = me.slowed_until ? Date.parse(me.slowed_until) : 0;
          if (shieldUntil > now && !shieldActive) {
            activateShield(true);
            shieldTimer = (shieldUntil - now)/1000;
          }
          const stunnedUntil = me.stunned_until ? Date.parse(me.stunned_until) : 0;
          if (stunnedUntil > now && stunnedUntil !== lastNetworkStun) {
            lastNetworkStun = stunnedUntil;
            if (playerStun <= 0) {
              stunPlayer(true);
              playerStun = Math.min(PISTOL_STUN_DURATION, (stunnedUntil - now) / 1000);
              callbacks.pistolHit?.({ target: 'player', from: 'online' });
            }
          }
          if (slowedUntil > now && playerSlowTimer <= 0) {
            applyPlayerSlow(true);
            playerSlowTimer = (slowedUntil - now)/1000;
          }
        }
      }

      floorOffset += speed * dt;
      placeFloor();
      scenery.forEach((item) => {
        item.position.z += speed * item.userData.speedFactor * dt;
        const boat = item.userData.boat;
        if (boat) {
          boat.position.y = -1.05 + Math.sin(time * 0.0017 + boat.userData.bob) * 0.07;
          boat.rotation.z = Math.sin(time * 0.0013 + boat.userData.bob) * 0.05;
        }
        const farmAnimals = item.userData.animals;
        if (farmAnimals?.length) {
          for (const animal of farmAnimals) {
            if (!animal.userData?.isAnimal) continue;
            const bob = animal.userData.bob || 0;
            const type = animal.userData.animalType;
            if (type === 'cow') {
              animal.rotation.y += Math.sin(time * 0.0006 + bob) * 0.0006;
              if (animal.children[animal.children.length - 2]) {
                const tail = animal.children[animal.children.length - 1];
                if (tail) tail.rotation.x = 0.25 + Math.sin(time * 0.003 + bob) * 0.35;
              }
            } else if (type === 'sheep') {
              animal.position.y = Math.sin(time * 0.0015 + bob) * 0.04;
            } else if (type === 'chicken') {
              animal.position.y = Math.abs(Math.sin(time * 0.008 + bob)) * 0.08;
              animal.rotation.z = Math.sin(time * 0.006 + bob) * 0.12;
              if (Math.floor(time * 0.002 + bob) % 3 === 0) {
                animal.rotation.x = Math.sin(time * 0.02 + bob) * 0.15;
              }
            } else if (type === 'pig') {
              animal.position.y = Math.sin(time * 0.0012 + bob) * 0.03;
              animal.rotation.y += Math.sin(time * 0.0004 + bob) * 0.0008;
            }
          }
        }
        if (item.position.z > (western || prairie || sardinia || japan ? 15 : 9)) item.position.z -= western || prairie || sardinia || japan ? 110 : 86;
      });

      rows.forEach((row) => {
        row.group.position.z += speed * dt;
        row.items.forEach((item) => {
          if (item.kind !== 'crystal') return;
          const locallyHidden = isGemHidden(sharedGems, item.key, elapsed);
          const hiddenByRemotePickup = Number(network?.gemPickups?.[item.key] || 0) > wallNow;
          if (hiddenByRemotePickup && item.object.visible) burstGemItem(row, item);
          const shouldBeVisible = !locallyHidden && !hiddenByRemotePickup;
          if (shouldBeVisible && !item.object.visible) {
            item.burst = false;
          }
          item.object.visible = shouldBeVisible;
          if (item.object.visible) {
            item.object.rotation.y += dt * 1.8;
            item.object.rotation.x = Math.sin(time * 0.002 + row.group.position.z) * 0.1;
          }
        });

        if (!row.checked && row.group.position.z > -0.65 && row.group.position.z < 0.95) {
          row.checked = true;
          const hazard = row.items.find((item) => item.kind !== 'crystal' && (item.lanes || [item.lane]).some(lane => Math.abs(player.position.x - LANES[lane]) < 0.95));
          const jumpedHighEnough = hazard?.kind === 'barrier' && jumpHeight(jumpLeft) > 1.05;
          const collided = Boolean(hazard && !jumpedHighEnough);
          if (collided) {
            if (shieldActive) {
              consumeShield();
            } else if (invulnerable <= 0) {
              const impact = resolveCollision({ mode: race.mode, lives, speed: duelSpeed(baseSpeed, boost.bonus), boost });
              lives = impact.lives;
              baseSpeed = impact.baseSpeed;
              boost = impact.boost;
              combo = 0;
              invulnerable = 1.15;
              crashAnimation = 0.42;
              crashDirection = laneIndex === 0 ? 1 : -1;
              callbacks.crash?.();
              if (impact.gameOver) finish();
            }
          }
          const crystal = row.items.find((item) => item.kind === 'crystal' && Math.abs(player.position.x - LANES[item.lane]) < 0.85 && (!item.raised || jumpHeight(jumpLeft) > 1.05) && !isGemHidden(sharedGems, item.key, elapsed) && Number(network?.gemPickups?.[item.key] || 0) <= wallNow);
          if (crystal) {
            const tier = crystal.tier ?? 0; // 0=Cyan, 1=Red, 2=Green, 3=Gold
            hidePlayerGem(crystal.key);
            gems += 1;
            callbacks.pickup?.(tier, crystal.key, false);
            combo += 1;
            const multiplier = 1 + Math.min(3, Math.floor(combo / 5) * 0.5);
            score += Math.round(CRYSTALS[tier].value * multiplier);
            if (race.mode !== 'rush') boost = crystalPickupEffect(tier, false).boost;

            // Power-up charging system (Duel & Online only)
            if (powerUpsEnabled(race.mode)) {
              const chargeResult = chargePowerUps(powerState, tier);
              powerState = chargeResult.state;
              if (chargeResult.charged.length > 0) {
                callbacks.powerUp?.({
                  type: chargeResult.charged[chargeResult.charged.length - 1],
                  action: 'charged',
                  chargedTypes: chargeResult.charged,
                  charges: 1,
                });
              }
            }

            if (combo === 5 || combo === 10 || combo === 15) {
              score += 150;
              poseLeft = 0.62;
            }
          }
          const streakResult = advanceCowboyStreak(cowboyStreak, Boolean(crystal), collided && !shieldActive);
          cowboyStreak = streakResult.streak;
          if (streakResult.cheer && active) {
            callbacks.cheer?.();
            poseLeft = 0.62;
          }
          emitHud(true);
        }
        if (row.group.position.z > 5) {
          const farthest = rows.reduce((a, b) => (b.group.position.z < a.group.position.z ? b : a));
          const z = farthest.group.position.z - farthest.gap;
          populateRow(row);
          row.group.position.z = z;
        }
      });

      // Lasso projectiles
      for (let i = lassoProjectiles.length-1; i>=0; i--) {
        const proj = lassoProjectiles[i];
        proj.progress += dt / LASSO_PROJECTILE_DURATION;
        const t = Math.min(1, proj.progress);
        const segs = proj.rope.userData.segments;
        const from = proj.start;
        if (proj.fromPlayer) {
          from.set(player.position.x, 1.2, 0);
        } else if (proj.fromNpc) {
          from.set(proj.fromNpc.mesh.position.x, 1.2, proj.fromNpc.mesh.position.z);
        }
        const to = proj.end;
        if (proj.target?.kind === 'rival') {
          const targetMesh = (proj.target.npc || duelRivals[0]).mesh;
          to.set(targetMesh.position.x, 1.0, targetMesh.position.z);
        } else if (proj.target?.kind === 'online') {
          const net = getNetwork?.();
          const peer = net?.players?.find(p=> p.user_id===proj.target.player?.user_id);
          if (peer) {
            const slot = peer.slot ?? 0;
            const rider = onlineRiders[slot];
            if (rider) to.set(rider.position.x, 1.0, rider.position.z);
          }
        } else if (proj.target?.kind === 'player') {
          to.set(player.position.x, 1.0, 0);
        }
        for (let s=0; s<segs.length; s++) {
          const segT = (s+0.5)/segs.length;
          const x = THREE.MathUtils.lerp(from.x, to.x, segT * t + (1-t)*0.1);
          const y = THREE.MathUtils.lerp(from.y, to.y, segT * t) + Math.sin(segT*Math.PI)*0.6*(1-t*0.5);
          const z = THREE.MathUtils.lerp(from.z, to.z, segT * t);
          segs[s].position.set(x, y, z);
          if (s < segs.length-1) {
            const nextT = (s+1.5)/segs.length;
            const nx = THREE.MathUtils.lerp(from.x, to.x, nextT * t + (1-t)*0.1);
            const ny = THREE.MathUtils.lerp(from.y, to.y, nextT * t) + Math.sin(nextT*Math.PI)*0.6*(1-t*0.5);
            const nz = THREE.MathUtils.lerp(from.z, to.z, nextT * t);
            segs[s].lookAt(nx, ny, nz);
          }
        }
        if (t >= 1) {
          if (proj.fromPlayer) {
            if (proj.target?.kind === 'rival') {
              const targetNpc = proj.target.npc || duelRivals[0];
              const slowed = applyNpcSlow(targetNpc);
              callbacks.lassoHit?.({ target: 'rival', name: getRivalDisplayName(targetNpc), blocked: !slowed });
            } else if (proj.target?.kind === 'online') {
              callbacks.lassoHit?.({ target: 'online', player: proj.target.player });
            }
          } else {
            const attackerName = proj.fromNpc ? getRivalDisplayName(proj.fromNpc) : 'L’OMBRE';
            if (proj.target?.kind === 'rival') {
              const targetNpc = proj.target.npc || duelRivals[0];
              const slowed = applyNpcSlow(targetNpc);
              callbacks.lassoHit?.({
                target: 'npc_vs_npc',
                from: 'npc',
                attackerName,
                name: getRivalDisplayName(targetNpc),
                blocked: !slowed,
              });
            } else {
              const blocked = shieldActive;
              applyPlayerSlow(true);
              callbacks.lassoHit?.({ target: 'player', from: 'npc', attackerName, blocked });
            }
          }
          releaseRope(proj.rope);
          lassoProjectiles.splice(i,1);
        }
      }

      if (race.mode !== 'rush' ? distance >= DUEL_DISTANCE : elapsed >= RUN_SECONDS) finish();
      emitHud();
    }

    updateGemBursts(dt, speed * dt);
    updateTracers(dt);

    const targetX = LANES[laneIndex];
    player.position.x = playerLateralPosition(player.position.x, targetX, dt, jumpLeft);
    const crashProgress = crashAnimation > 0 ? 1 - crashAnimation / 0.42 : 0;
    const crashBounce = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.18 : 0;
    player.position.y = jumpHeight(jumpLeft) + crashBounce;
    const parts = player.userData.parts;
    const turboActive = running && powerBoostTimer > 0 && playerStun <= 0;
    const gallopRate = turboActive ? 0.026 : 0.018;
    const runWave = Math.sin(time * (running ? gallopRate : 0.002));
    const galloping = running && playerStun <= 0;
    parts.legs.forEach((leg, index) => {
      leg.rotation.x = jumpLeft > 0 ? (index < 2 ? -0.7 : 0.65) : galloping ? Math.sin(time * gallopRate + index * 2.2) * (turboActive ? 0.82 : 0.65) : 0;
    });
    poseRider(player, playerStun, playerStunSide);
    if (turboActive) {
      parts.rider.rotation.x -= 0.18;
    }
    parts.tail.rotation.z = runWave * (turboActive ? 0.28 : 0.18);
    parts.cape.rotation.x = running ? (turboActive ? -0.46 + runWave * 0.12 : -0.12 + runWave * 0.06) : 0;
    const impactTilt = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.2 * crashDirection : 0;
    player.rotation.z = (targetX - player.position.x) * -0.055 + impactTilt;
    player.rotation.x = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.16 : turboActive ? -0.045 : 0;
    player.scale.setScalar((poseLeft > 0 ? 1.035 : 1) * (crashAnimation > 0 ? 1 - Math.sin(crashProgress * Math.PI) * 0.09 : 1));
    player.visible = isPlayerVisible(race.mode, invulnerable, time);

    playerBoostStreaks.visible = turboActive;
    if (turboActive) {
      animateBoostStreaks(playerBoostStreaks, time);
    }

    if (shieldActive) {
      const pulse = 1 + Math.sin(time*0.01)*0.06 + (shieldFlash>0? shieldFlash*0.3 : 0);
      playerShieldBubble.scale.setScalar(pulse);
      playerShieldBubble.rotation.y += dt*1.5;
    }
    onlineRiders.forEach((rider, slot) => {
      const peer = network?.players?.find(p => p.slot === slot);
      const mine = peer?.user_id === network?.userId;
      rider.visible = race.mode === 'online' && Boolean(peer);
      if (!rider.visible) return;
      const z = mine ? 0 : distance - Number(peer.distance);
      rider.visible = z > -74 && z < 11;
      rider.position.x = mine ? player.position.x : THREE.MathUtils.lerp(rider.position.x, LANES[peer.lane], Math.min(1,dt*10));
      rider.position.z = mine ? 0 : THREE.MathUtils.lerp(rider.position.z,z,Math.min(1,dt*10));
      rider.position.y = mine ? player.position.y : Number(peer.jump);
      skinPaint(rider, CHARACTER_PALETTES[peer.character ?? peer.slot] || CHARACTER_PALETTES[0]);
      const peerStun = !mine && peer.stunned_until ? Math.max(0, (Date.parse(peer.stunned_until) - wallNow) / 1000) : 0;
      const stunLeft = mine ? playerStun : Math.min(PISTOL_STUN_DURATION, peerStun);
      poseRider(rider, stunLeft, peer.lane >= LANE_COUNT / 2 ? -1 : 1);
      rider.userData.parts.legs.forEach((leg,i) => { leg.rotation.x = running && stunLeft <= 0 ? Math.sin(time*.018+i*2.2)*.65 : 0; });
      if (rider.userData.shieldBubble) {
        const now = Date.now();
        const shieldUntil = peer?.shield_until ? Date.parse(peer.shield_until) : 0;
        const slowedUntil = peer?.slowed_until ? Date.parse(peer.slowed_until) : 0;
        const hasShield = shieldUntil > now;
        const isSlowed = slowedUntil > now;
        rider.userData.shieldBubble.visible = hasShield;
        if (hasShield) rider.userData.shieldBubble.rotation.y += dt*1.5;
        rider.userData.slowEffect = isSlowed ? 1 : Math.max(0, rider.userData.slowEffect - dt*2);
        if (isSlowed) {
          rider.position.y += Math.sin(time*0.02)*0.05;
        }
      }
    });
    duelRivals.forEach((r, idx) => {
      const rivalMesh = r.mesh;
      if (r.shieldActive) {
        r.shieldBubble.visible = true;
        r.shieldBubble.rotation.y += dt * 1.5;
      } else {
        r.shieldBubble.visible = false;
      }
      const rivalTurbo = running && r.powerBoostTimer > 0 && (r.stunTimer || 0) <= 0;
      r.boostStreaks.visible = rivalTurbo;
      if (rivalTurbo) {
        animateBoostStreaks(r.boostStreaks, time + idx * 170);
      }
      rivalMesh.position.z = Math.max(-85, Math.min(16, distance - r.dist));
      const rivalParts = rivalMesh.userData.parts;
      const rivalStun = race.mode === 'duel' && !isGhostRival(r) ? r.stunTimer || 0 : 0;
      const phaseOffset = 1.3 + idx * 0.9;
      const rivalGallopRate = rivalTurbo ? 0.026 : 0.018;
      rivalParts.legs.forEach((leg, index) => {
        leg.rotation.x = running && rivalStun <= 0 ? Math.sin(time * rivalGallopRate + index * 2.2 + phaseOffset) * (rivalTurbo ? 0.82 : 0.65) : 0;
      });
      poseRider(rivalMesh, rivalStun, r.stunSide || 1);
      if (rivalTurbo) {
        rivalParts.rider.rotation.x -= 0.18;
      }
      rivalParts.tail.rotation.z = runWave * -0.2;
      if (race.mode === 'duel' && !isGhostRival(r)) {
        rivalMesh.position.x = r.x;
        rivalMesh.position.y = jumpHeight(r.jumpLeft);
        rivalMesh.scale.setScalar(1);
        if (r.jumpLeft > 0) rivalParts.legs.forEach((leg, index) => { leg.rotation.x = index < 2 ? -0.7 : 0.65; });
        if (r.slowTimer > 0) {
          rivalMesh.position.y += Math.sin(time * 0.02 + idx) * 0.06;
        }
      } else {
        rivalMesh.position.set(LANES[LANE_COUNT - 1], 0, rivalMesh.position.z);
        rivalMesh.scale.setScalar(0.92);
      }
      rivalMesh.visible = race.mode === 'duel' && rivalMesh.position.z < 11 && rivalMesh.position.z > -74 && (r.invulnerable <= 0 || Math.floor(time / 90) % 2 === 0);
    });
    playerShadow.position.x = player.position.x;
    playerShadow.scale.set(1, 1.8, 1).multiplyScalar(Math.max(0.55, 1 - player.position.y * 0.12));
    const anyReady = powerState.shieldCharges > 0 || powerState.lassoCharges > 0 || powerState.pistolCharges > 0 || powerState.boostCharges > 0;
    const pistolReady = powerState.pistolCharges > 0;
    const boostReady = powerState.boostCharges > 0;
    playerReadyAura.visible = running && powerUpsEnabled(race.mode) && anyReady;
    if (playerReadyAura.visible) {
      playerReadyAura.position.x = player.position.x;
      const readyPulse = 1 + Math.sin(time * 0.012) * 0.12;
      playerReadyAura.scale.setScalar(readyPulse);
      playerReadyAura.userData.outerRing.rotation.z = time * 0.0025;
      playerReadyAura.userData.innerRing.rotation.z = -time * 0.0035;
      playerReadyAura.userData.outerMat.color.setHex(pistolReady ? 0xff7066 : boostReady ? 0x4cd964 : 0xffdc6b);
      playerReadyAura.userData.innerMat.color.setHex(pistolReady ? 0xffdc6b : boostReady ? 0xa3f7b5 : 0x4ce9df);
      playerReadyAura.userData.outerMat.opacity = 0.65 + Math.sin(time * 0.015) * 0.22;
    }
    const targetFov = turboActive ? 61 : 50;
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
      camera.updateProjectionMatrix();
    }
    if (prairie) {
      applyPrairieSunset(race.mode !== 'rush' ? distance / DUEL_DISTANCE : elapsed / RUN_SECONDS);
    }
    camera.position.y += ((turboActive ? 6.85 : 7.3) - camera.position.y) * Math.min(1, dt * 6);
    camera.position.z += ((turboActive ? 10.05 : 9.4) - camera.position.z) * Math.min(1, dt * 6);
    camera.position.x += (player.position.x * 0.13 - camera.position.x) * dt * 2;
    renderer.render(scene, camera);
  };

  reset();
  raf = requestAnimationFrame(animate);

  return {
    start() {
      const freshRace = race !== getRace();
      if (freshRace) reset();
      active = true;
      lastFrame = performance.now();
      if (freshRace || hintPending) touchFeedback.showHint();
      hintPending = false;
    },
    prepare() {
      if (!active) reset();
      hintPending = true;
    },
    pause() {
      active = false;
      hintPending = false;
      touchFeedback.hideHint();
    },
    setSkin(colors) {
      skinColors = colors ?? null;
      skinPaint(player, skinColors);
    },
    usePowerUp(type) {
      if (type === 'shield' || type === POWER_UPS.SHIELD) useShield();
      else if (type === 'lasso' || type === POWER_UPS.LASSO) useLasso();
      else if (type === 'pistol' || type === POWER_UPS.PISTOL) usePistol();
      else if (type === 'boost' || type === POWER_UPS.BOOST) useBoost();
    },
    action,
    destroy() {
      active = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(initialResizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      detachSwipe();
      touchFeedback.destroy();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else { object.material.map?.dispose(); object.material.dispose(); }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function MirageWorld({ active, race, stage, skin, onReady, onError, onHud, onFinish, onCrash, onPickup, onCheer, actionsRef, network, onPowerUp, onPowerUpPickup, onLasso, onShield, onLassoHit, onGemTrap, onPistol, onPistolHit, prepareSignal = 0 }) {
  const networkRef = useRef(network);
  networkRef.current = network;
  const skinRef = useRef(skin);
  skinRef.current = skin;
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const raceRef = useRef(race);
  raceRef.current = race;
  const callbackRefs = useRef({});
  callbackRefs.current = { onReady, onError, onHud, onFinish, onCrash, onPickup, onCheer, onPowerUp, onPowerUpPickup, onLasso, onShield, onLassoHit, onGemTrap, onPistol, onPistolHit };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    let world;
    try {
      world = makeWorld(mountRef.current, {
        hud: (data) => callbackRefs.current.onHud?.(data),
        finish: (data) => callbackRefs.current.onFinish?.(data),
        crash: () => callbackRefs.current.onCrash?.(),
        pickup: (tier, key) => callbackRefs.current.onPickup?.(tier, key),
        cheer: () => callbackRefs.current.onCheer?.(),
        powerUp: (info) => callbackRefs.current.onPowerUp?.(info),
        powerUpPickup: (type) => callbackRefs.current.onPowerUpPickup?.(type),
        lasso: (target) => callbackRefs.current.onLasso?.(target),
        shield: (active) => callbackRefs.current.onShield?.(active),
        lassoHit: (info) => callbackRefs.current.onLassoHit?.(info),
        pistol: (target) => callbackRefs.current.onPistol?.(target),
        pistolHit: (info) => callbackRefs.current.onPistolHit?.(info),
      }, () => raceRef.current, stage, () => networkRef.current, () => skinRef.current);
    } catch (error) {
      callbackRefs.current.onError?.(error instanceof Error ? error.message : String(error));
      return undefined;
    }
    worldRef.current = world;
    if (actionsRef) actionsRef.current = (name) => world.action(name);
    callbackRefs.current.onReady?.();
    return () => {
      world.destroy();
      worldRef.current = null;
      if (actionsRef) actionsRef.current = null;
    };
  }, [actionsRef, stage]);

  useEffect(() => {
    if (!worldRef.current) return;
    if (active) worldRef.current.start();
    else worldRef.current.pause();
  }, [active]);

  useEffect(() => {
    worldRef.current?.setSkin?.(skin);
  }, [skin]);

  useEffect(() => {
    if (prepareSignal > 0) worldRef.current?.prepare?.();
  }, [prepareSignal]);

  return <div className="mirage-world" ref={mountRef} />;
}
