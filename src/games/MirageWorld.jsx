import { CHARACTER_PALETTES } from './mirageCharacters';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { westernBuilding, westernObstacle } from './westernStage';
import { prairieField, prairieObstacle } from './prairieStage';
import { sardiniaObstacle, sardiniaSeaside, sardiniaTerrace, sardiniaVillage } from './sardiniaStage';
import { algerBuilding, algerObstacle, algerSeaside, updatePoliceBeacon } from './algerStage';
import { japanObstacle, japanPlains, makeMountFuji } from './japanStage';
import { rampartsMidDoors, rampartsObstacle, rampartsSiteA, rampartsSiteB, makeRampartsSkyline, updateBombBlink } from './rampartsStage';
import { INFINITY_CULL_Z, INFINITY_DECK_PERIOD, infinityBridgeGate, infinityLeftWing, infinityObstacle, infinityRightWing, makeInfinityDeck, makeInfinityHorizon, updateInfinityLanterns } from './infinityStage';
import { INFINITY_ATMOSPHERE, makeInfinitySky } from './infinityAtmosphere';
import { airbaseGate, airbaseObstacle, airbaseOps, airbaseStands, makeAirbaseSkyline, updateAirbaseBeacon } from './airbaseStage';
import { DESERT_CULL_Z, DESERT_PALETTE, makeDesertScenery } from './desertStage';
import {
  LANES, laneCount, lanePosition, trackWidth, CRYSTALS, createCourse, jumpHeight, JUMP_DURATION, DUEL_DISTANCE, DUEL_BASE_SPEED,
  duelSpeed, ghostDistance, seededRandom, planNpcLane, advanceCowboyStreak,
  playerLaneAfterAction, playerLateralPosition, resolveCollision, isPlayerVisible,
  advanceJump, JUMP_BUFFER,
  tickSpeedBoost, SPEED_BOOST_NONE, POWER_UPS, powerUpsEnabled, PISTOL_STUN_DURATION,
  stunPose, SHIELD_DURATION, LASSO_SLOW_DURATION, LASSO_SLOW_FACTOR, LASSO_PROJECTILE_DURATION,
  GEM_BURST_DURATION, GEM_BURST_SHARDS, gemBurstShards, gemShardState, gemFlashState,
  crystalPickupEffect, POWER_UP_CHARGE_COST, DIAMOND_CHARGE_VALUE, POWER_UP_MAX_CHARGES,
  createPowerUpState, chargePowerUps, consumePowerUp, powerUpHudState, duelRivalsForTrack,
  chooseNpcPowerAction, splitChargedPowers, POWER_BOOST_DURATION, POWER_BOOST_BONUS,
  GEM_RESPAWN_DELAY, markGemTaken, isGemHidden, prairieSunsetState,
  MUD_SLOW_DURATION, MUD_SLOW_FACTOR, hitsMudPuddle, resolveMudSlow,
} from './mirageRules';
import { attachSwipeControls, createSwipeFeedback } from './mirageTouch';
// Rythme de la course : un peu plus lent sur la piste du téléphone (3 voies).
import { paceForTrack } from './mirageLanes';
// Modèle cheval + cavalier partagé avec les aperçus 3D des skins.
import { block, makeExplorer, paintModel } from './mirageExplorer';

// La largeur de la piste n'est plus une constante de module : elle dépend du
// nombre de voies (3 sur téléphone, 4 sur ordinateur et tablette), choisi au
// démarrage — voir `trackWidth()` et `mirageLanes.js`. Les lignes de départ et
// d'arrivée la lisent au moment de construire la scène, plus bas.
const TRACK_MIN_Z = -40;
const RUN_SECONDS = 60;
const NO_POWER_UPS = Object.freeze([]);

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

function makeMudPuddle() {
  const group = new THREE.Group();
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0x3b2313,
    roughness: 0.92,
    flatShading: true,
  });
  const mudMat = new THREE.MeshStandardMaterial({
    color: 0x5c381e,
    emissive: 0x241207,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.28,
    flatShading: true,
  });
  const sheenMat = new THREE.MeshStandardMaterial({
    color: 0x784b2a,
    emissive: 0x381e0c,
    emissiveIntensity: 0.3,
    roughness: 0.12,
    metalness: 0.35,
    flatShading: true,
  });

  // Main outer dark earth bank
  const bank = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.98, 0.045, 14), bankMat);
  bank.position.set(0, 0.022, 0);
  bank.scale.set(0.95, 1, 1.38);
  group.add(bank);

  // Organic secondary mud lobes
  const lobeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.6, 0.042, 10), bankMat);
  lobeFront.position.set(-0.26, 0.021, -0.68);
  lobeFront.scale.set(1.05, 1, 1.15);
  group.add(lobeFront);

  const lobeBack = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.042, 10), bankMat);
  lobeBack.position.set(0.24, 0.021, 0.66);
  lobeBack.scale.set(1.06, 1, 1.12);
  group.add(lobeBack);

  // Glossy wet mud pool
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.8, 0.052, 14), mudMat);
  pool.position.set(0, 0.028, 0);
  pool.scale.set(0.9, 1, 1.3);
  group.add(pool);

  const poolFront = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.05, 10), mudMat);
  poolFront.position.set(-0.24, 0.027, -0.64);
  poolFront.scale.set(1, 1, 1.1);
  group.add(poolFront);

  const poolBack = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.05, 10), mudMat);
  poolBack.position.set(0.22, 0.027, 0.62);
  poolBack.scale.set(1, 1, 1.08);
  group.add(poolBack);

  // Central wet mire sheen
  const sheen = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.056, 12), sheenMat);
  sheen.position.set(0.05, 0.031, -0.06);
  sheen.scale.set(0.86, 1, 1.2);
  group.add(sheen);

  // Raised mud clods along the rim + surface mud bubbles
  const clodGeo = new THREE.OctahedronGeometry(0.11);
  for (const [cx, cy, cz, sx, sy, sz] of [
    [-0.68, 0.055, -0.42, 1.2, 0.65, 1.1],
    [0.66, 0.055, 0.36, 1.1, 0.6, 1.25],
    [-0.4, 0.05, 0.88, 1.15, 0.6, 1.0],
    [0.44, 0.055, -0.82, 1.0, 0.65, 1.15],
  ]) {
    const clod = new THREE.Mesh(clodGeo, bankMat);
    clod.position.set(cx, cy, cz);
    clod.scale.set(sx, sy, sz);
    group.add(clod);
  }

  const bubbleGeo = new THREE.SphereGeometry(0.075, 7, 6);
  for (const [bx, by, bz, bs] of [
    [-0.18, 0.052, -0.34, 1.0],
    [0.22, 0.056, 0.26, 1.15],
    [-0.04, 0.048, 0.56, 0.85],
  ]) {
    const bubble = new THREE.Mesh(bubbleGeo, sheenMat);
    bubble.position.set(bx, by, bz);
    bubble.scale.set(bs, bs * 0.55, bs);
    group.add(bubble);
  }

  return group;
}

function makeHazard(kind) {
  if (kind === 'mud') return makeMudPuddle();
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

function makePlayerArrow() {
  const group = new THREE.Group();
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-0.12, 0.48);
  arrowShape.lineTo(0.12, 0.48);
  arrowShape.lineTo(0.12, 0.18);
  arrowShape.lineTo(0.34, 0.18);
  arrowShape.lineTo(0, -0.16);
  arrowShape.lineTo(-0.34, 0.18);
  arrowShape.lineTo(-0.12, 0.18);
  arrowShape.closePath();
  const geometry = new THREE.ShapeGeometry(arrowShape);
  const shadow = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0x201522,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  }));
  shadow.scale.set(1.22, 1.16, 1);
  shadow.position.z = -0.035;
  shadow.renderOrder = 30;
  const face = new THREE.Mesh(geometry.clone(), new THREE.MeshBasicMaterial({
    color: 0xffdf67,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }));
  face.position.z = 0.02;
  face.renderOrder = 31;
  group.add(shadow, face);
  group.scale.setScalar(0.82);
  group.renderOrder = 30;
  group.visible = false;
  return group;
}

function makeLassoRope() {
  const group = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xe6a943, emissive: 0xa85e16, emissiveIntensity: 0.45, roughness: 0.58, flatShading: true });
  const segments = 12;
  const meshes = [];
  for (let i = 0; i < segments; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.4), ropeMat);
    group.add(seg);
    meshes.push(seg);
  }
  const attachments = [
    new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 7, 12), ropeMat),
    new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.055, 8, 18), ropeMat),
  ];
  attachments.forEach(loop => group.add(loop));
  group.userData.segments = meshes;
  group.userData.attachments = attachments;
  group.userData.ropeMaterial = ropeMat;
  group.visible = false;
  return group;
}

function makeWorld(mount, callbacks, getRace, stage, getNetwork, getSkin) {
  const western = stage === 'western';
  const prairie = stage === 'prairie';
  const sardinia = stage === 'sardinia';
  const alger = stage === 'alger';
  const japan = stage === 'japan';
  const ramparts = stage === 'ramparts';
  const infinity = stage === 'infinity';
  const airbase = stage === 'airbase';
  // Dunes de l’Écho : le stage par défaut (et le repli pour tout identifiant inconnu).
  const desert = !western && !prairie && !sardinia && !alger && !japan && !ramparts && !infinity && !airbase;
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
            background: 0x72c4eb, fog: 0xb9dce3, exposure: 1.12,
            skyBottom: [0.66, 0.87, 0.94], skyHorizon: [0.39, 0.72, 0.92], skyTop: [0.12, 0.45, 0.78],
            sunBottom: [1.0, 0.84, 0.46], sunTop: [1.0, 0.97, 0.78], glow: [1.0, 0.90, 0.63],
            hemiSky: 0xe5f3f6, hemiGround: 0x9e8262, sunLight: 0xffe5b0, rimLight: 0x9edfe8,
          }
        : alger
          ? {
              // Alger la Blanche : ciel azuréen au-dessus de la baie, soleil
              // doré qui descend vers la mer et brume saline bleutée au loin.
              background: 0x7fb0d4, fog: 0xbcd2e4, exposure: 1.05,
              skyBottom: [0.96, 0.80, 0.58], skyHorizon: [0.66, 0.72, 0.86], skyTop: [0.24, 0.45, 0.74],
              sunBottom: [1.0, 0.42, 0.12], sunTop: [1.0, 0.72, 0.32], glow: [1.0, 0.80, 0.52],
              hemiSky: 0xd4e6f6, hemiGround: 0x9a9484, sunLight: 0xffd9a4, rimLight: 0x9cc6ea,
            }
          : japan
            ? {
                background: 0x0d1526, fog: 0x16223b, exposure: 1.12,
                skyBottom: [0.16, 0.23, 0.38], skyHorizon: [0.09, 0.14, 0.27], skyTop: [0.03, 0.05, 0.12],
                sunBottom: [0.88, 0.93, 1.0], sunTop: [0.98, 0.99, 1.0], glow: [0.46, 0.62, 0.92],
                hemiSky: 0x9bb8ff, hemiGround: 0x1d2738, sunLight: 0xd8e6ff, rimLight: 0xff6e54,
              }
            : ramparts
              ? {
                  // Remparts d’Ocre : grand ciel bleu au-dessus du Mid, soleil blanc
                  // d'après-midi et brume de chaleur ocre sur les remparts.
                  background: 0x8fbfe0, fog: 0xe6cfa6, exposure: 1.06,
                  skyBottom: [0.94, 0.84, 0.66], skyHorizon: [0.62, 0.79, 0.93], skyTop: [0.22, 0.50, 0.84],
                  sunBottom: [1.0, 0.90, 0.62], sunTop: [1.0, 0.98, 0.86], glow: [1.0, 0.93, 0.74],
                  hemiSky: 0xfff0d8, hemiGround: 0xa47d52, sunLight: 0xfff0d0, rimLight: 0xb0d2f2,
                }
              : airbase
              ? {
                  // Thunder Airbase : plein jour éclatant sur le taxiway, soleil haut
                  // et brume légère bleu pâle au-dessus de l'herbe, comme le stage
                  // ensoleillé de Guile.
                  background: 0x87b8e0, fog: 0xc3d8ea, exposure: 1.1,
                  skyBottom: [0.78, 0.89, 0.97], skyHorizon: [0.45, 0.70, 0.92], skyTop: [0.15, 0.42, 0.80],
                  sunBottom: [1.0, 0.90, 0.66], sunTop: [1.0, 0.99, 0.88], glow: [1.0, 0.95, 0.80],
                  hemiSky: 0xe8f2ff, hemiGround: 0x8a8f7a, sunLight: 0xfff4dc, rimLight: 0xbfe0ff,
                }
              : infinity
                ? INFINITY_ATMOSPHERE
                : {
                  // Brume d'horizon = couleur du bas du ciel de desertStage.js : le sable
                  // se fond dans le ciel sans couture.
                  background: DESERT_PALETTE.horizon, fog: DESERT_PALETTE.horizon, exposure: 1.12,
                  skyBottom: [0.97, 0.66, 0.42], skyHorizon: [0.83, 0.42, 0.35], skyTop: [0.40, 0.29, 0.50],
                  sunBottom: [1.0, 0.31, 0.06], sunTop: [1.0, 0.57, 0.19], glow: [1.0, 0.62, 0.33],
                  hemiSky: 0xffd6b1, hemiGround: 0x49374a, sunLight: 0xffbd70, rimLight: 0xe1a0d4,
                };
  scene.background = new THREE.Color(atmosphere.background);
  scene.fog = new THREE.Fog(atmosphere.fog, infinity ? 26 : 27, infinity ? 84 : 82);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 7.3, 9.4);
  camera.lookAt(0, 0.6, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: infinity, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = atmosphere.exposure;
  renderer.domElement.className = 'mirage-canvas';
  renderer.domElement.setAttribute('aria-label', 'Jeu 3D Mirage Rush — évite les obstacles et ramasse les fragments solaires');
  mount.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(atmosphere.hemiSky, atmosphere.hemiGround, infinity ? 1.85 : prairie ? 1.65 : 1.9);
  scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(atmosphere.sunLight, infinity ? 1.65 : prairie ? 1.8 : 2.1);
  sunLight.position.set(0, 5, -46);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(atmosphere.rimLight, infinity ? 0.62 : prairie ? 0.45 : 0.8);
  rimLight.position.set(7, 6, infinity ? 10 : -10);
  scene.add(rimLight);
  if (infinity) {
    // Rebonds croisés des shōji : éclairent les deux ailes et les façades de face.
    const leftFill = new THREE.DirectionalLight(0xffc98a, 0.72);
    leftFill.position.set(-11, 8, 12);
    const rightFill = new THREE.DirectionalLight(0xffa46b, 0.62);
    rightFill.position.set(11, 7, 10);
    scene.add(leftFill, rightFill);
  }

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const skyVector = (rgb) => new THREE.Vector3(...rgb);
  const sunset = infinity ? makeInfinitySky(camera) : new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      skyBottom: { value: skyVector(atmosphere.skyBottom) },
      skyHorizon: { value: skyVector(atmosphere.skyHorizon) },
      skyTop: { value: skyVector(atmosphere.skyTop) },
      sunBottom: { value: skyVector(atmosphere.sunBottom) },
      sunTop: { value: skyVector(atmosphere.sunTop) },
      glow: { value: skyVector(atmosphere.glow) },
      sunElevation: { value: japan ? 25.0 : airbase ? 22.0 : sardinia ? 12.0 : alger ? 7.0 : ramparts ? 11.0 : 5.5 },
      sunX: { value: sardinia || alger ? 18.0 : airbase ? 14.0 : ramparts ? -24.0 : 0.0 },
      sunRadius: { value: sardinia ? 5.5 : airbase ? 5.0 : ramparts ? 4.6 : 8.0 },
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
      uniform float sunX;
      uniform float sunRadius;
      uniform float isNight;
      varying vec2 skyPoint;
      void main() {
        float height = skyPoint.y;
        vec3 sky = mix(skyBottom, skyHorizon, smoothstep(0.0, 23.0, height));
        sky = mix(sky, skyTop, smoothstep(18.0, 75.0, height));
        float radius = length(skyPoint - vec2(sunX, sunElevation));
        float haloVisibility = clamp((sunElevation + 12.0) / 17.5, 0.0, 1.0);
        float halo = exp(-radius * radius / 500.0) * 0.38 * haloVisibility;
        sky = mix(sky, glow, halo);
        float aboveHorizon = step(0.0, height);
        float disc = (1.0 - smoothstep(sunRadius - 0.15, sunRadius, radius)) * aboveHorizon;
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
  if (!infinity) {
    sunset.position.set(0, 59.91, -95);
    sunset.renderOrder = -1;
  }
  sunset.visible = !desert; // le désert a son propre ciel (desertStage.js)
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
  if (alger) {
    // Le boulevard chaulé d'Alger la Blanche longe la baie sur sa droite :
    // la mer s'étend au pied de la corniche et ferme aussi l'horizon sous
    // le soleil couchant, comme au bout de la rue.
    block(cube, new THREE.MeshStandardMaterial({ color: 0xd6d0c0, roughness: 1 }), scene, [-14.7, -0.64, -35], [50.6, 0.6, 160]);
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(150, 170), new THREE.MeshStandardMaterial({ color: 0x2278a6, roughness: 0.35, metalness: 0.1, flatShading: true }));
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(85.6, -0.92, -35);
    scene.add(bay);
    const coast = block(new THREE.PlaneGeometry(240, 4), new THREE.MeshBasicMaterial({ color: 0x8fc3de }), scene, [0, 15.2, -94]);
    coast.renderOrder = -1;
    const sea = block(new THREE.PlaneGeometry(240, 14), new THREE.MeshBasicMaterial({ color: 0x1d6a9c }), scene, [0, 6.2, -94]);
    sea.renderOrder = -1;
    const shallow = block(new THREE.PlaneGeometry(240, 2.2), new THREE.MeshBasicMaterial({ color: 0x3d8db8 }), scene, [0, 12.4, -94]);
    shallow.renderOrder = -1;
  }
  if (sardinia) {
    block(cube, new THREE.MeshStandardMaterial({ color: 0xc9895a, roughness: 1 }), scene, [-17.35, -0.64, -35], [45.3, 0.6, 160]);
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(130, 170), new THREE.MeshStandardMaterial({ color: 0x2f8da3, roughness: 0.35, metalness: 0.1, flatShading: true }));
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(70.3, -0.92, -35);
    scene.add(bay);
    // Keep the distant water below the midday sun so the blue sky stays visible.
    const sea = block(new THREE.PlaneGeometry(240, 8), new THREE.MeshBasicMaterial({ color: 0x2f8da3 }), scene, [0, 2, -94]);
    sea.renderOrder = -1;
  }

  if (ramparts) {
    // Terre battue autour du Mid, et au loin les toits crénelés de la ville
    // noyés dans la brume de chaleur.
    block(cube, new THREE.MeshStandardMaterial({ color: 0xc7a06c, roughness: 1 }), scene, [0, -0.64, -35], [90, 0.6, 160]);
    const skyline = makeRampartsSkyline();
    bakeStaticScenery(skyline);
    scene.add(skyline);
  }
  if (airbase) {
    // Herbe verte autour du taxiway, comme les abords du stage de Guile ;
    // au loin, les hangars, la tour et un F-16 en vol dans la brume légère.
    block(cube, new THREE.MeshStandardMaterial({ color: 0x63a34e, roughness: 1 }), scene, [0, -0.64, -35], [90, 0.6, 160]);
    const skyline = makeAirbaseSkyline();
    bakeStaticScenery(skyline);
    scene.add(skyline);
  }

  if (infinity) {
    // Abîme sombre sous le grand pont de bois laqué, et à l'horizon les
    // tours de shōji et les pagodes renversées du Château de l’Infini.
    block(cube, new THREE.MeshStandardMaterial({ color: 0x160a10, roughness: 1 }), scene, [0, -6.5, -35], [180, 0.6, 180]);
    const horizon = makeInfinityHorizon();
    bakeStaticScenery(horizon);
    scene.add(horizon);
  }

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: sardinia ? 0x8d7a5c : alger ? 0xe9e4d6 : 0x68466f, flatShading: true, roughness: 1 });
  for (let i = 0; i < (prairie || japan || desert || ramparts || infinity || airbase ? 0 : sardinia ? 9 : alger ? 10 : 13); i += 1) {
    const width = 5 + Math.random() * 7;
    const height = sardinia || alger ? 2.5 + Math.random() * 4.5 : 4 + Math.random() * 9;
    const mountain = new THREE.Mesh(cube, mountainMaterial);
    const mountainSide = Math.random() > 0.5 ? 1 : -1;
    const mountainX = sardinia ? -18 - Math.random() * 15 : alger ? -16 - Math.random() * 16 : mountainSide * (17 + Math.random() * 11);
    mountain.position.set(mountainX, height / 2 - 1, -38 - Math.random() * 26);
    mountain.scale.set(width, height, 3 + Math.random() * 5);
    scene.add(mountain);
  }

  const floorMaterials = infinity ? [] : [
    new THREE.MeshStandardMaterial({ color: prairie ? 0xb5ae60 : sardinia ? 0xc9895a : alger ? 0xd6d0c0 : japan ? 0x2b3648 : ramparts ? 0xd7b784 : airbase ? 0x767c88 : 0xcea56a, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: prairie ? 0xc0b96c : sardinia ? 0xd9a06d : alger ? 0xddd7c7 : japan ? 0x344156 : ramparts ? 0xe1c493 : airbase ? 0x7f8593 : 0xd9b679, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: prairie ? 0xa8a354 : sardinia ? 0xb97846 : alger ? 0xc9c2b0 : japan ? 0x232d3d : ramparts ? 0xcaa673 : airbase ? 0x6e7482 : 0xc9995f, flatShading: true, roughness: 1 }),
  ];
  const floorGeometry = infinity ? null : new THREE.BoxGeometry(2.02, 0.58, 2.02);
  const FLOOR_PERIOD = infinity ? INFINITY_DECK_PERIOD : floorMaterials.length * 2;
  const floorGroup = infinity ? makeInfinityDeck(LANES) : new THREE.Group();
  // Dans le désert la piste se prolonge jusqu'à la brume (44 rangées au lieu de 28) : elle file
  // droit vers le mirage au lieu de s'arrêter net devant le vide.
  const floorRows = desert ? 44 : 28;
  const floorMinZ = desert ? TRACK_MIN_Z - 32 : TRACK_MIN_Z;
  floorMaterials.forEach((material, m) => {
    const parts = [];
    for (let zIndex = 0; zIndex < floorRows; zIndex += 1) {
      for (let lane = 0; lane < laneCount(); lane += 1) {
        if ((zIndex + lane) % floorMaterials.length !== m) continue;
        parts.push(floorGeometry.clone().translate(LANES[lane], -0.34, floorMinZ + zIndex * 2));
      }
    }
    floorGroup.add(new THREE.Mesh(mergeGeometries(parts, false), material));
    parts.forEach(part => part.dispose());
  });
  floorGeometry?.dispose();
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

  const duelRivals = duelRivalsForTrack().map((spec) => {
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
  // Largeur de la piste courante (6,3 m à trois voies, 8,4 m à quatre) : les
  // deux lignes couvrent exactement les voies jouables.
  const trackWidthM = trackWidth();
  const startLine = block(new THREE.BoxGeometry(trackWidthM, 0.05, 0.45), lineMaterial, scene, [0, 0.025, 1]);
  const finishLine = block(new THREE.BoxGeometry(trackWidthM, 0.05, 0.75), finishMaterial, scene, [0, 0.03, -DUEL_DISTANCE]);
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
  const playerIndicator = makePlayerArrow();
  scene.add(playerIndicator);

  let nextEncounter = createCourse();
  let rowCounter = 0;
  let elapsed = 0;
  let playerIndicatorTimer = 0;
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
      const object = spec.kind === 'crystal'
        ? makeCrystal(spec.tier)
        : spec.kind === 'mud'
          ? makeMudPuddle()
          : prairie
            ? prairieObstacle(spec.kind)
            : western
              ? westernObstacle(spec.kind)
              : sardinia
                ? sardiniaObstacle(spec.kind)
                : alger
                  ? algerObstacle(spec.kind)
                  : japan
                    ? japanObstacle(spec.kind)
                    : ramparts
                      ? rampartsObstacle(spec.kind)
                      : airbase
                        ? airbaseObstacle(spec.kind)
                      : infinity
                        ? infinityObstacle(spec.kind)
                        : makeHazard(spec.kind);
      const x = spec.lanes ? (LANES[spec.lanes[0]] + LANES[spec.lanes[1]]) / 2 : LANES[spec.lane];
      object.position.set(x, spec.kind === 'crystal' ? (spec.raised ? 2.4 : 1.2) : 0, 0);
      const key = `${row.index}:${itemIndex}`;
      const taken = spec.kind === 'crystal' && isGemHidden(sharedGems, key, elapsed);
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

  function spawnGemBurst(x, y, z, tier = 0, customColor = null) {
    const burst = gemBursts.find((candidate) => !candidate.userData.active)
      || gemBursts[(burstCursor += 1) % gemBursts.length];
    const data = burst.userData;
    data.active = true;
    data.age = 0;
    data.tier = tier;
    data.specs = reduceMotion ? [] : gemBurstShards(GEM_BURST_SHARDS, Math.random);
    burstColor.set(customColor ?? CRYSTALS[tier]?.color ?? CRYSTALS[0].color);
    data.shardMaterial.color.copy(burstColor);
    data.shardMaterial.emissive.copy(burstColor);
    data.flashMaterial.color.copy(burstColor).lerp(new THREE.Color(customColor ? 0x8f5b34 : 0xffffff), 0.6);
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
  const lassoPointStart = new THREE.Vector3();
  const lassoPointEnd = new THREE.Vector3();
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
  let desertScenery = null;
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
      const terrace = sardiniaTerrace(i);
      scene.add(village, terrace, seaside);
      scenery.push(village, terrace, seaside);
    }
  } else if (alger) {
    // Les immeubles haussmanniens blancs bordent le boulevard à gauche ;
    // à droite, la corniche s'ouvre sur la baie : balustrade blanche,
    // palmiers dattiers et barques blanches sur l'eau.
    for (let i = 0; i < 10; i++) {
      const item = algerBuilding(i, -1);
      const seaside = algerSeaside(i);
      scene.add(item, seaside);
      scenery.push(item, seaside);
    }
  } else if (japan) {
    for (let i = 0; i < 11; i++) for (const side of [-1, 1]) {
      const item = japanPlains(i, side);
      scene.add(item);
      scenery.push(item);
    }
  } else if (ramparts) {
    // Remparts d’Ocre, le Mid de de_dust2 remonté depuis le spawn T comme sur le radar : le
    // site B défile à gauche, le site A à droite, et les portes du Mid
    // enjambent la piste une fois par boucle de 110 m.
    for (let i = 0; i < 10; i++) {
      const siteB = rampartsSiteB(i);
      const siteA = rampartsSiteA(i);
      scene.add(siteB, siteA);
      scenery.push(siteB, siteA);
    }
    const midDoors = rampartsMidDoors();
    scene.add(midDoors);
    scenery.push(midDoors);
  } else if (airbase) {
    // Thunder Airbase : les opérations (hangar, F-16, tour…) défilent à
    // gauche, le public (drapeau géant, gradins, panneau SONIC BOOM) à
    // droite, et le portique enjambe le taxiway une fois par boucle de 110 m.
    for (let i = 0; i < 10; i++) {
      const ops = airbaseOps(i);
      const stands = airbaseStands(i);
      scene.add(ops, stands);
      scenery.push(ops, stands);
    }
    const gate = airbaseGate();
    scene.add(gate);
    scenery.push(gate);
  } else if (infinity) {
    // Château de l’Infini : les galeries de shōji, l'estrade du biwa de Nakime,
    // les escaliers impossibles et les pagodes renversées défilent de part et
    // d'autre du pont, franchi une fois par boucle par la Grande Arche.
    for (let i = 0; i < 10; i++) {
      const leftWing = infinityLeftWing(i);
      const rightWing = infinityRightWing(i);
      scene.add(leftWing, rightWing);
      scenery.push(leftWing, rightWing);
    }
    const bridgeGate = infinityBridgeGate();
    scene.add(bridgeGate);
    scenery.push(bridgeGate);
  } else {
    // Dunes de l'Écho : dunes qui défilent avec la piste, accessoires, mirage, ciel… (desertStage.js)
    desertScenery = makeDesertScenery({ reduceMotion });
    scene.add(desertScenery.group);
  }
  scenery.forEach(bakeStaticScenery);

  let active = false;
  let race = { mode: 'rush' };
  let distance = 0;
  let rivalDistance = 0;
  let baseSpeed = DUEL_BASE_SPEED;
  // Facteur de rythme de la course en cours (0,85 sur téléphone/application,
  // 1 partout ailleurs) — repris à chaque `reset()`.
  let pace = 1;
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
  // Each color charges only its matching power-up. Shield and Boost need 4 gems,
  // Lasso needs 5, and Pistol needs 6 (each gem contributes 2 charge points).
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
    const start = new THREE.Vector3(player.position.x + 0.32, 1.95 + player.position.y, -0.56);
    let end;
    if (targetInfo.kind === 'rival') {
      const targetMesh = (targetInfo.npc || duelRivals[0]).mesh;
      end = new THREE.Vector3(targetMesh.position.x, 2.15 + targetMesh.position.y, targetMesh.position.z);
    } else if (targetInfo.kind === 'online') {
      const net = getNetwork?.();
      const peer = net?.players?.find(p=> p.user_id===targetInfo.player.user_id);
      const slot = peer?.slot ?? 0;
      const rider = onlineRiders[slot];
      if (rider) end = new THREE.Vector3(rider.position.x, 2.15 + rider.position.y, rider.position.z);
      else end = new THREE.Vector3(lanePosition(targetInfo.player.lane), 2.15, distance - (targetInfo.player.distance||0));
    } else {
      end = new THREE.Vector3(player.position.x, 2.15 + player.position.y, -12);
    }
    const projectile = {
      rope,
      start: start.clone(),
      end: end.clone(),
      progress: 0,
      target: targetInfo,
      fromPlayer: true,
      attached: false,
      tetherLeft: 0,
      remoteHitResolved: false,
      remoteHitConnected: false,
    };
    lassoProjectiles.push(projectile);
    callbacks.powerUp?.({ type: POWER_UPS.LASSO, action: 'fired', target: targetInfo });
    if (targetInfo.kind === 'online') {
      const result = callbacks.lasso?.(targetInfo.player);
      if (result && typeof result.then === 'function') {
        result.then((room) => {
          const targetPlayer = room?.players?.find((player) => player.user_id === targetInfo.player.user_id);
          const serverNow = Date.parse(room?.server_now || '');
          const slowedUntil = Date.parse(targetPlayer?.slowed_until || '');
          projectile.remoteHitResolved = true;
          projectile.remoteHitConnected = Number.isFinite(serverNow) && slowedUntil > serverNow;
          if (projectile.remoteHitConnected) {
            projectile.remoteSlowRemaining = Math.max(0, (slowedUntil - serverNow) / 1000);
            projectile.remoteSlowReceivedAt = performance.now();
            if (projectile.attached) {
              projectile.tetherLeft = Math.max(0, projectile.remoteSlowRemaining - (performance.now() - projectile.remoteSlowReceivedAt) / 1000);
            }
          } else if (projectile.attached) {
            projectile.tetherLeft = 0;
          }
        }).catch(() => {
          projectile.remoteHitResolved = true;
          projectile.remoteHitConnected = false;
          if (projectile.attached) projectile.tetherLeft = 0;
        });
      }
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
    playerStunSide = laneIndex >= laneCount() / 2 ? -1 : 1;
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
    targetNpc.stunSide = targetNpc.lane >= laneCount() / 2 ? -1 : 1;
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
        : new THREE.Vector3(lanePosition(targetInfo.player.lane), 1.9, Math.max(-70, Math.min(10, distance - (Number(targetInfo.player.distance) || 0))));
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
      const start = new THREE.Vector3(npc.mesh.position.x + 0.32, 1.95 + npc.mesh.position.y, npc.mesh.position.z - 0.56);
      let end;
      if (decision.target.kind === 'player') {
        end = new THREE.Vector3(player.position.x, 2.15 + player.position.y, 0);
      } else {
        const targetMesh = (decision.target.npc || duelRivals[0]).mesh;
        end = new THREE.Vector3(targetMesh.position.x, 2.15 + targetMesh.position.y, targetMesh.position.z);
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
      npc.lane = laneCount() - 1;
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
    const effectiveNpcMultiplier = Math.max(1, npc.boost.multiplier);
    const powerBoostBonus = npc.powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0;
    const rawSpeed = duelSpeed(npc.base * effectiveNpcMultiplier + powerBoostBonus) * pace;
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
      if (npc.stunTimer <= 0 && npc.plan?.jump && !npc.hesitate && npc.jumpLeft <= 0 && speed > 0 && ahead / speed < 0.42 && ahead > 0) npc.jumpLeft = JUMP_DURATION;
      if (npc.dist + speed * dt >= target.pos) {
        const height = jumpHeight(npc.jumpLeft);
        const near = (lane) => Math.abs(npc.x - LANES[lane]) < 0.95;
        const mud = target.items.find((item) => hitsMudPuddle(item, npc.x, height));
        if (mud) npc.powerBoostTimer = 0;
        if (mud && !npc.shieldActive) {
          const mudSlow = resolveMudSlow({
            baseSpeed: npc.base,
            mode: race.mode,
            slowTimer: npc.slowTimer,
            slowFactor: npc.slowFactor,
            slowKind: 'mud',
          });
          npc.slowTimer = mudSlow.slowTimer;
          npc.slowFactor = mudSlow.slowFactor;
          npc.base = mudSlow.baseSpeed;
          npc.boost = mudSlow.boost;
          if (Math.abs(distance - npc.dist) < 42) {
            spawnGemBurst(npc.x, 0.32, distance - npc.dist, 1, 0x5c371d);
          }
        }
        const hazard = target.items.find((item) => item.kind !== 'crystal' && item.kind !== 'mud' && (item.lanes || [item.lane]).some(near));
        if (hazard && !(hazard.kind === 'barrier' && height > 1.05)) {
          npc.powerBoostTimer = 0;
          if (npc.invulnerable <= 0) {
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
  // Saut demandé pendant qu'on est déjà en l'air (voir `action()`), rejoué à
  // l'atterrissage si la fenêtre n'est pas écoulée.
  let jumpBuffer = 0;
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
    const effectivePlayerMultiplier = Math.max(1, boost.multiplier);
    const powerBoostBonus = powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0;
    const hudSlowMul = playerSlowTimer > 0 ? playerSlowFactor : 1;
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
      speed: (race.mode === 'rush'
        ? (12 + Math.min(7, elapsed * 0.12)) * effectivePlayerMultiplier + powerBoostBonus
        : duelSpeed(baseSpeed * effectivePlayerMultiplier + powerBoostBonus)) * hudSlowMul * pace,
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
        // Fantôme d'un lien de défi : il court sous le nom de son auteur (tableau des positions).
        ghost: isGhostRival(r),
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
    // Un téléphone et un ordinateur ne partagent pas le même rythme en ligne :
    // la course garde alors sa vitesse, pour que le duel reste juste.
    pace = race.mode === 'online' ? 1 : paceForTrack();
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
    playerIndicatorTimer = 0;
    score = 0;
    gems = 0;
    combo = 0;
    cowboyStreak = 0;
    lives = 3;
    laneIndex = 1;
    jumpLeft = 0;
    jumpBuffer = 0;
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
    const cullZ = desert ? DESERT_CULL_Z : infinity ? INFINITY_CULL_Z : -Infinity;
    let z = -20;
    rows.forEach(row => {
      const gap = populateRow(row);
      row.group.position.z = z;
      row.group.visible = z > cullZ;
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
      // La voie change même en plein saut : le doigt n'est jamais ignoré.
      laneIndex = playerLaneAfterAction(laneIndex, name);
      if (name === 'jump') {
        // Saut demandé en l'air : il part à l'atterrissage (fenêtre courte),
        // au lieu d'être perdu — c'est ce qui donnait l'impression que le
        // bouton « ne répond pas » quand on tapait juste avant de retomber.
        if (jumpLeft <= 0) jumpLeft = JUMP_DURATION;
        else jumpBuffer = JUMP_BUFFER;
      }
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
    if (running) {
      boost = tickSpeedBoost(boost, dt);
      playerIndicatorTimer = Math.max(0, playerIndicatorTimer - dt);
      if (race.mode !== 'rush') {
        baseSpeed += (DUEL_BASE_SPEED - baseSpeed) * Math.min(1, dt * 0.65);
        if (playerSlowTimer > 0) baseSpeed = Math.max(DUEL_BASE_SPEED * 0.5, baseSpeed - dt * 8);
      }
    }
    const slowMul = playerSlowTimer > 0 ? playerSlowFactor : 1;
    const effectivePlayerMultiplier = Math.max(1, boost.multiplier);
    const powerBoostBonus = powerBoostTimer > 0 ? POWER_BOOST_BONUS : 0;
    const speed = running && playerStun <= 0
      ? (race.mode !== 'rush'
        ? duelSpeed(baseSpeed * effectivePlayerMultiplier + powerBoostBonus) * slowMul
        : ((12 + Math.min(7, elapsed * 0.12)) * effectivePlayerMultiplier + powerBoostBonus) * slowMul) * pace
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
      // Tap sur « sauter » juste avant de toucher le sol : le saut repart à
      // l'atterrissage, comme si le doigt avait été obéi sur-le-champ.
      ({ jumpLeft, buffer: jumpBuffer } = advanceJump(jumpLeft, jumpBuffer, dt));
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
        const crowd = item.userData.people;
        if (crowd?.length) {
          // Les passants d'Alger la Blanche : balancement discret, un
          // mouvement de tête suggéré — la foule respire sans coûter cher.
          for (const person of crowd) {
            const bob = person.userData.bob || 0;
            person.rotation.y = (person.userData.baseRotation || 0) + Math.sin(time * 0.001 + bob) * 0.12;
            person.position.y = (person.userData.baseY || 0) + Math.abs(Math.sin(time * 0.0017 + bob)) * 0.012;
          }
        }
        // Les C4 posées sur les sites A et B des Remparts d’Ocre clignotent à chaque bip.
        updateBombBlink(item.userData.bombs, time * 0.001, reduceMotion);
        // Les lanternes flottantes du Château de l’Infini pulsent au son du biwa.
        updateInfinityLanterns(item.userData.lanterns, time * 0.001, reduceMotion, item.position.z);
        // Thunder Airbase : gyrophares de la tour, de la jeep et du portique.
        updateAirbaseBeacon(item.userData.airbaseBeacons, time * 0.001, reduceMotion);
        const airbaseRadar = item.userData.radar;
        if (airbaseRadar && !reduceMotion) airbaseRadar.rotation.y += dt * 1.4;
        const airbaseFlag = item.userData.flag;
        if (airbaseFlag && !reduceMotion) {
          airbaseFlag.rotation.y = airbaseFlag.userData.baseRotation + Math.sin(time * 0.004 + (airbaseFlag.userData.bob || 0)) * 0.14;
        }
        const jetFlame = item.userData.jetFlame;
        if (jetFlame && !reduceMotion) {
          const flamePulse = 1 + Math.sin(time * 0.02) * 0.14;
          jetFlame.scale.set(flamePulse, flamePulse, 1 + Math.sin(time * 0.026) * 0.22);
        }
        if (item.position.z > (western || prairie || sardinia || alger || japan || ramparts || infinity || airbase ? 15 : 9)) item.position.z -= western || prairie || sardinia || alger || japan || ramparts || infinity || airbase ? 110 : 86;
      });

      rows.forEach((row) => {
        row.group.position.z += speed * dt;
        row.items.forEach((item) => {
          if (item.kind !== 'crystal') {
            // Le gyrophare des voitures de police d'Alger la Blanche clignote
            // en continu, même lorsque la rangée attend au fond du décor.
            updatePoliceBeacon(item.object.userData.beacon, time * 0.001, reduceMotion);
            return;
          }
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
          const playerJumpY = jumpHeight(jumpLeft);
          const hazard = row.items.find((item) => item.kind !== 'crystal' && item.kind !== 'mud' && (item.lanes || [item.lane]).some(lane => Math.abs(player.position.x - LANES[lane]) < 0.95));
          const jumpedHighEnough = hazard?.kind === 'barrier' && playerJumpY > 1.05;
          const collided = Boolean(hazard && !jumpedHighEnough);
          if (collided) {
            powerBoostTimer = 0;
            if (shieldActive) {
              consumeShield();
            } else if (invulnerable <= 0) {
              const impact = resolveCollision({ mode: race.mode, lives, speed, boost });
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
          const mud = row.items.find((item) => hitsMudPuddle(item, player.position.x, playerJumpY));
          if (mud) powerBoostTimer = 0;
          if (mud && !collided && !shieldActive) {
            const mudSlow = resolveMudSlow({
              baseSpeed,
              mode: race.mode,
              slowTimer: playerSlowTimer,
              slowFactor: playerSlowFactor,
              slowKind: playerSlowKind,
            });
            playerSlowTimer = mudSlow.slowTimer;
            playerSlowFactor = mudSlow.slowFactor;
            playerSlowKind = mudSlow.slowKind;
            baseSpeed = mudSlow.baseSpeed;
            boost = mudSlow.boost;
            crashAnimation = Math.max(crashAnimation, 0.24);
            crashDirection = laneIndex === 0 ? 1 : -1;
            spawnGemBurst(player.position.x, 0.32, row.group.position.z + mud.object.position.z, 1, 0x5c371d);
            callbacks.mud?.();
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
            boost = crystalPickupEffect(tier, false).boost;

            // Power-up charging system (Duel & Online only)
            if (powerUpsEnabled(race.mode)) {
              const chargeResult = chargePowerUps(powerState, tier);
              powerState = chargeResult.state;
              // Shield & Boost have no target: they fire the moment their bar is full.
              const { auto, manual } = splitChargedPowers(chargeResult.charged);
              if (manual.length > 0) {
                callbacks.powerUp?.({
                  type: manual[manual.length - 1],
                  action: 'charged',
                  chargedTypes: manual,
                  charges: 1,
                });
              }
              for (const type of auto) {
                if (type === POWER_UPS.SHIELD) useShield();
                else if (type === POWER_UPS.BOOST) useBoost();
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
        // Au-delà de ce point les obstacles sont déjà 100 % dans la brume : on les retire
        // pour qu'ils ne se découpent pas en taches devant le mirage ou le soleil.
        if (desert || infinity) {
          row.group.visible = row.group.position.z > (desert ? DESERT_CULL_Z : INFINITY_CULL_Z);
        }
      });

      // Lasso rope flies to its target, then stays attached for the full slow.
      for (let i = lassoProjectiles.length - 1; i >= 0; i--) {
        const proj = lassoProjectiles[i];
        if (proj.attached) {
          proj.tetherLeft -= dt;
        } else {
          proj.progress += dt / LASSO_PROJECTILE_DURATION;
        }
        const t = proj.attached ? 1 : Math.min(1, proj.progress);
        const segs = proj.rope.userData.segments;
        const from = proj.start;
        if (proj.fromPlayer) {
          from.set(player.position.x + 0.32, 1.95 + player.position.y, -0.56);
        } else if (proj.fromNpc) {
          from.set(proj.fromNpc.mesh.position.x + 0.32, 1.95 + proj.fromNpc.mesh.position.y, proj.fromNpc.mesh.position.z - 0.56);
        }
        const to = proj.end;
        if (proj.target?.kind === 'rival') {
          const targetMesh = (proj.target.npc || duelRivals[0]).mesh;
          to.set(targetMesh.position.x, 2.15 + targetMesh.position.y, targetMesh.position.z);
        } else if (proj.target?.kind === 'online') {
          const net = getNetwork?.();
          const peer = net?.players?.find(p => p.user_id === proj.target.player?.user_id);
          if (peer) {
            const rider = onlineRiders[peer.slot ?? 0];
            if (rider) to.set(rider.position.x, 2.15 + rider.position.y, rider.position.z);
          }
        } else if (proj.target?.kind === 'player') {
          to.set(player.position.x, 2.15 + player.position.y, 0);
        }

        const pointOnRope = (along, out) => {
          const travel = proj.attached ? along : along * t;
          const wave = proj.attached ? Math.sin(time * 0.012 + along * Math.PI * 5) * 0.055 : 0;
          const vertical = proj.attached
            ? Math.sin(along * Math.PI) * 0.16 + Math.sin(time * 0.014 + along * 9) * 0.035
            : Math.sin(along * Math.PI) * 0.6 * (1 - t * 0.5);
          const depthWave = proj.attached ? Math.cos(time * 0.01 + along * Math.PI * 5) * 0.045 : 0;
          return out.set(
            THREE.MathUtils.lerp(from.x, to.x, travel) + wave,
            THREE.MathUtils.lerp(from.y, to.y, travel) + vertical,
            THREE.MathUtils.lerp(from.z, to.z, travel) + depthWave,
          );
        };
        const attachments = proj.rope.userData.attachments || [];
        if (attachments[0] && attachments[1]) {
          attachments[0].visible = true;
          attachments[1].visible = proj.attached;
          attachments[0].position.copy(from);
          attachments[1].position.copy(to);
          attachments[0].lookAt(to);
          // Keep the target loop horizontal so it reads as a lasso cinched
          // around the rider's neck, not just another rope segment.
          attachments[1].rotation.set(Math.PI / 2, 0, 0);
          const pulse = 0.92 + Math.sin(time * 0.014) * 0.1;
          attachments.forEach(loop => loop.scale.setScalar(pulse));
        }
        const ropeMaterial = proj.rope.userData.ropeMaterial;
        if (ropeMaterial) ropeMaterial.emissiveIntensity = proj.attached ? 0.72 + Math.sin(time * 0.018) * 0.18 : 0.45;

        for (let s = 0; s < segs.length; s++) {
          const startPoint = pointOnRope(s / segs.length, lassoPointStart);
          const endPoint = pointOnRope((s + 1) / segs.length, lassoPointEnd);
          segs[s].position.copy(startPoint).add(endPoint).multiplyScalar(0.5);
          segs[s].lookAt(endPoint);
          // Stretch each braided segment to meet the next so the tether stays
          // continuous even when riders are several lanes or metres apart.
          segs[s].scale.z = Math.max(0.12, startPoint.distanceTo(endPoint) / 0.4 * 1.06);
        }

        if (!proj.attached && t >= 1) {
          let connected = false;
          if (proj.fromPlayer) {
            if (proj.target?.kind === 'rival') {
              const targetNpc = proj.target.npc || duelRivals[0];
              connected = applyNpcSlow(targetNpc);
              callbacks.lassoHit?.({ target: 'rival', name: getRivalDisplayName(targetNpc), blocked: !connected });
            } else if (proj.target?.kind === 'online') {
              connected = proj.remoteHitResolved ? proj.remoteHitConnected : true;
              callbacks.lassoHit?.({ target: 'online', player: proj.target.player, blocked: !connected });
            }
          } else {
            const attackerName = proj.fromNpc ? getRivalDisplayName(proj.fromNpc) : 'L’OMBRE';
            if (proj.target?.kind === 'rival') {
              const targetNpc = proj.target.npc || duelRivals[0];
              connected = applyNpcSlow(targetNpc);
              callbacks.lassoHit?.({
                target: 'npc_vs_npc',
                from: 'npc',
                attackerName,
                name: getRivalDisplayName(targetNpc),
                blocked: !connected,
              });
            } else {
              connected = applyPlayerSlow(true);
              callbacks.lassoHit?.({ target: 'player', from: 'npc', attackerName, blocked: !connected });
            }
          }

          if (connected) {
            proj.attached = true;
            proj.tetherLeft = LASSO_SLOW_DURATION;
            if (proj.target?.kind === 'online' && proj.remoteHitResolved && proj.remoteHitConnected && Number.isFinite(proj.remoteSlowReceivedAt)) {
              proj.tetherLeft = Math.max(0, proj.remoteSlowRemaining - (performance.now() - proj.remoteSlowReceivedAt) / 1000);
            }
          } else {
            releaseRope(proj.rope);
            lassoProjectiles.splice(i, 1);
            continue;
          }
        }

        if (proj.attached && proj.tetherLeft <= 0) {
          releaseRope(proj.rope);
          lassoProjectiles.splice(i, 1);
        }
      }


      if (race.mode !== 'rush' ? distance >= DUEL_DISTANCE : elapsed >= RUN_SECONDS) finish();
      emitHud();
    }

    updateGemBursts(dt, speed * dt);
    updateTracers(dt);

    const targetX = LANES[laneIndex];
    // Glissade latérale : plus jamais gelée pendant le saut, et plus nerveuse
    // (LATERAL_LANE_SPEED) pour que le doigt voie la voie changer tout de suite.
    player.position.x = playerLateralPosition(player.position.x, targetX, dt);
    const crashProgress = crashAnimation > 0 ? 1 - crashAnimation / 0.42 : 0;
    const crashBounce = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.18 : 0;
    const mudSlowed = running && playerSlowTimer > 0 && playerSlowKind === 'mud' && playerStun <= 0;
    const mudBob = mudSlowed && jumpLeft <= 0 ? -0.05 + Math.sin(time * 0.022) * 0.035 : 0;
    player.position.y = Math.max(0, jumpHeight(jumpLeft) + crashBounce + mudBob);
    const parts = player.userData.parts;
    const turboActive = running && powerBoostTimer > 0 && playerStun <= 0;
    const gallopRate = turboActive ? 0.026 : mudSlowed ? 0.011 : 0.018;
    const runWave = Math.sin(time * (running ? gallopRate : 0.002));
    const galloping = running && playerStun <= 0;
    parts.legs.forEach((leg, index) => {
      leg.rotation.x = jumpLeft > 0 ? (index < 2 ? -0.7 : 0.65) : galloping ? Math.sin(time * gallopRate + index * 2.2) * (turboActive ? 0.82 : mudSlowed ? 0.45 : 0.65) : 0;
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
      rider.position.x = mine ? player.position.x : THREE.MathUtils.lerp(rider.position.x, lanePosition(peer.lane), Math.min(1,dt*10));
      rider.position.z = mine ? 0 : THREE.MathUtils.lerp(rider.position.z,z,Math.min(1,dt*10));
      rider.position.y = mine ? player.position.y : Number(peer.jump);
      skinPaint(rider, CHARACTER_PALETTES[peer.character ?? peer.slot] || CHARACTER_PALETTES[0]);
      const peerStun = !mine && peer.stunned_until ? Math.max(0, (Date.parse(peer.stunned_until) - wallNow) / 1000) : 0;
      const stunLeft = mine ? playerStun : Math.min(PISTOL_STUN_DURATION, peerStun);
      poseRider(rider, stunLeft, peer.lane >= laneCount() / 2 ? -1 : 1);
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
    const localOnlinePeer = race.mode === 'online'
      ? network?.players?.find(peer => peer.user_id === network.userId)
      : null;
    const markedRider = race.mode === 'online' && localOnlinePeer
      ? onlineRiders[localOnlinePeer.slot ?? 0]
      : player;
    playerIndicator.visible = running && playerIndicatorTimer > 0;
    if (playerIndicator.visible && markedRider) {
      const bounce = Math.sin(time * 0.012) * 0.09;
      playerIndicator.position.set(markedRider.position.x, markedRider.position.y + 3.24 + bounce, markedRider.position.z + 0.16);
      playerIndicator.rotation.y = camera.rotation.y;
      playerIndicator.scale.setScalar(0.82 + Math.sin(time * 0.012) * 0.045);
    }

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
        rivalMesh.position.set(LANES[laneCount() - 1], 0, rivalMesh.position.z);
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
    desertScenery?.update({
      time,
      offset: floorOffset,
      progress: race.mode !== 'rush' ? distance / DUEL_DISTANCE : elapsed / RUN_SECONDS,
      camera,
      renderer,
    });
    renderer.render(scene, camera);
  };

  reset();
  raf = requestAnimationFrame(animate);

  return {
    start() {
      const freshRace = race !== getRace();
      if (freshRace) reset();
      if (elapsed === 0) playerIndicatorTimer = 3.8;
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
      desertScenery?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function MirageWorld({ active, race, stage, skin, onReady, onError, onHud, onFinish, onCrash, onMud, onPickup, onCheer, actionsRef, network, onPowerUp, onPowerUpPickup, onLasso, onShield, onLassoHit, onGemTrap, onPistol, onPistolHit, prepareSignal = 0 }) {
  const networkRef = useRef(network);
  networkRef.current = network;
  const skinRef = useRef(skin);
  skinRef.current = skin;
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const raceRef = useRef(race);
  raceRef.current = race;
  const callbackRefs = useRef({});
  callbackRefs.current = { onReady, onError, onHud, onFinish, onCrash, onMud, onPickup, onCheer, onPowerUp, onPowerUpPickup, onLasso, onShield, onLassoHit, onGemTrap, onPistol, onPistolHit };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    let world;
    try {
      world = makeWorld(mountRef.current, {
        hud: (data) => callbackRefs.current.onHud?.(data),
        finish: (data) => callbackRefs.current.onFinish?.(data),
        crash: () => callbackRefs.current.onCrash?.(),
        mud: () => callbackRefs.current.onMud?.(),
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

  return <div className="mirage-world" data-stage={stage} ref={mountRef} />;
}
