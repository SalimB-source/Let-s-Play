import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CITY_RUSH_CARS, CITY_RUSH_TRAFFIC_TYPES } from './cityRushRules.js';
import { makeTrafficVehicle } from './cityRushCars.js';
import { makeRacerCar, animateRacerCar } from './cityRushRacerModels.js';
import { CityRushAudio } from './cityRushAudio.js';
import { createRpgLandscapeSession } from './rpgLandscape.js';
import {
  CITY_RUSH_COCKPIT_BODY_FOLLOW,
  CITY_RUSH_COCKPIT_FOV,
  CITY_RUSH_COCKPIT_LOOK_AHEAD_MAX,
  CITY_RUSH_COCKPIT_PITCH,
  CITY_RUSH_COCKPIT_SPEED_FOV,
  CITY_RUSH_CAMERA_COCKPIT,
  CITY_RUSH_CAMERA_PREF_KEY,
  makeCityRushCockpit,
  normalizeCityRushCameraMode,
} from './cityRushCockpit.js';
import {
  viceCityFreeDriveParkedCarHitbox,
  viceCityFreeDriveParkedCarImpulse,
  viceCityCanalBarrierCrossed,
  viceCityFreeDriveJoystickInput,
  viceCityFreeDriveShotImpulse,
  viceCityFreeDriveSpeedStep,
  viceCityFreeDriveSteerStep,
  viceCityFreeDriveYawRate,
} from './viceCityFreeDrive.js';
import { stepViceCityTrafficVehicle, viceCityTrafficSignalState } from './viceCityTraffic.js';
import {
  VICE_CITY_OUTER_HIGHWAY,
  viceCityCanalWaveHeight,
  viceCityOuterHighwayBridgeHeight,
  viceCityOuterHighwayContains,
  viceCityOuterHighwayPaths,
  viceCityRoadElevation,
} from './viceCityRoads.js';
import './vice-city-free-roam.css';

const BLOCK = 100;
const ROAD_HALF = 7;
const CANAL_HALF_WIDTH = 20;
// Long approach ramps crest at 5.8 m, leaving clearance for boats beneath the central arch.
const BRIDGE_HALF_LENGTH = 112;
const BRIDGE_ARCH_HALF_LENGTH = 22;
const BRIDGE_RAIL_HALF_LENGTH = 38;
const BRIDGE_HALF_WIDTH = ROAD_HALF + 0.8;
const ROUNDABOUT_X = 200;
const ROUNDABOUT_Z = 200;
const ROUNDABOUT_OUTER_RADIUS = 25;
const ROUNDABOUT_ISLAND_RADIUS = 9.8;
const BUILDING_COLLISION_MARGIN = 0.9;
const CITY_GRID_LIMIT = VICE_CITY_OUTER_HIGHWAY.cityGridLimit;
const CITY_LIMIT = VICE_CITY_OUTER_HIGHWAY.cityLimit;
const FREE_ROAM_SOUND_KEY = 'letsplay_vice_city_rush_sound_v1';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function readFreeRoamSoundPreference() {
  try { return window.localStorage.getItem(FREE_ROAM_SOUND_KEY) !== 'off'; } catch { return true; }
}

function writeFreeRoamSoundPreference(enabled) {
  try { window.localStorage.setItem(FREE_ROAM_SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* stockage désactivé */ }
}

function readFreeRoamCameraPreference() {
  try {
    return normalizeCityRushCameraMode(window.localStorage.getItem(CITY_RUSH_CAMERA_PREF_KEY)) === CITY_RUSH_CAMERA_COCKPIT;
  } catch { return false; }
}

function writeFreeRoamCameraPreference(enabled) {
  try {
    window.localStorage.setItem(CITY_RUSH_CAMERA_PREF_KEY, normalizeCityRushCameraMode(enabled ? CITY_RUSH_CAMERA_COCKPIT : 'chase'));
  } catch { /* stockage désactivé */ }
}

function parkingStallCenters(segmentStart) {
  const midpoint = segmentStart + BLOCK / 2;
  const centers = [];
  for (let position = -3 * BLOCK + 3; position < 3 * BLOCK; position += 6) {
    if (position > segmentStart + 22 && position < segmentStart + BLOCK - 22) centers.push(position);
  }
  const left = centers.filter((position) => position < midpoint).sort((a, b) => b - a);
  const right = centers.filter((position) => position > midpoint).sort((a, b) => a - b);
  if (left.length > 1 && right.length > 1 && right[0] - left[0] < 10) return [left[1], right[1]];
  return [left[0], right[0]].filter(Number.isFinite);
}

function makeDockedBoat(scene, addBox, spec) {
  const { x, z, yaw, length, width, hullColor, cabinColor, style } = spec;
  const boat = new THREE.Group();
  boat.name = `vice-city-port-${style}`;
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-width * 0.36, -length * 0.46);
  hullShape.lineTo(width * 0.36, -length * 0.46);
  hullShape.lineTo(width * 0.49, length * 0.14);
  hullShape.lineTo(width * 0.30, length * 0.40);
  hullShape.lineTo(0, length * 0.5);
  hullShape.lineTo(-width * 0.30, length * 0.40);
  hullShape.lineTo(-width * 0.49, length * 0.14);
  hullShape.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.72, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.06, bevelThickness: 0.06,
  });
  hullGeometry.rotateX(-Math.PI / 2);
  hullGeometry.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.38, metalness: 0.12 }));
  hull.position.y = 0.02;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd9d5ca, roughness: 0.82 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: cabinColor, roughness: 0.62 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x193c4d, roughness: 0.18, metalness: 0.18 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf2e9d4, roughness: 0.7 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1c262a, roughness: 0.9 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xe27735, roughness: 0.7 });
  addBox(boat, deckMat, 0, 0.72, 0, width * 0.78, 0.1, length * 0.7);
  const cabinLength = style === 'yacht' ? length * 0.28 : length * 0.25;
  const cabinWidth = style === 'yacht' ? width * 0.64 : width * 0.58;
  addBox(boat, cabinMat, 0, 0.82, -length * 0.04, cabinWidth, style === 'fishing' ? 0.95 : 1.18, cabinLength);
  addBox(boat, glassMat, 0, 1.28, -length * 0.15, cabinWidth * 0.82, 0.42, 0.08);
  for (const side of [-1, 1]) {
    addBox(boat, glassMat, side * (cabinWidth / 2 + 0.025), 1.24, -length * 0.04, 0.06, 0.36, cabinLength * 0.62);
    addBox(boat, trimMat, side * width * 0.45, 0.7, length * 0.02, 0.09, 0.1, length * 0.58);
    const fender = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), rubberMat);
    fender.position.set(side * (width * 0.52), 0.52, -length * 0.2);
    fender.scale.set(0.7, 1, 1.5);
    boat.add(fender);
  }
  addBox(boat, trimMat, 0, 1.45, -length * 0.04, cabinWidth * 1.06, 0.14, cabinLength * 1.08);
  if (style === 'yacht' || style === 'tug') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.7, 7), trimMat);
    mast.position.set(0, 2.25, length * 0.18);
    boat.add(mast);
    addBox(boat, orangeMat, 0, 2.75, length * 0.18, 0.62, 0.38, 0.06);
  } else {
    addBox(boat, orangeMat, 0, 1.62, length * 0.27, 0.55, 0.42, 0.06);
  }
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.68, 6), trimMat);
    post.position.set(side * width * 0.43, 1.05, end * length * 0.3);
    boat.add(post);
  }
  boat.position.set(x, -0.02, z);
  boat.rotation.y = yaw;
  scene.add(boat);
  return boat;
}

function addViceCityClouds(scene) {
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8);
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const puffLayout = [
    [0, 0, 0, 1.38, 0.66, 0.82],
    [-0.94, 0.08, 0.05, 0.92, 0.58, 0.78],
    [0.92, 0.03, -0.04, 0.98, 0.62, 0.82],
    [-0.42, 0.28, 0.45, 0.82, 0.72, 0.78],
    [0.48, 0.24, -0.38, 0.9, 0.7, 0.82],
    [1.58, -0.08, 0.26, 0.68, 0.5, 0.66],
  ];
  const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 40 * puffLayout.length);
  const marker = new THREE.Object3D();
  const tint = new THREE.Color();
  let instance = 0;
  for (let cloud = 0; cloud < 40; cloud += 1) {
    const column = cloud % 8;
    const row = Math.floor(cloud / 8);
    const size = 9 + (cloud % 4) * 2;
    const centerX = (column - 3.5) * 112 + Math.sin(cloud * 2.31) * 24;
    const centerZ = (row - 2) * 148 + Math.cos(cloud * 1.73) * 25;
    const centerY = 47 + (cloud % 5) * 6;
    for (const [offsetX, offsetY, offsetZ, scaleX, scaleY, scaleZ] of puffLayout) {
      marker.position.set(
        centerX + offsetX * size,
        centerY + offsetY * size,
        centerZ + offsetZ * size,
      );
      marker.scale.set(size * scaleX, size * scaleY, size * scaleZ);
      marker.updateMatrix();
      clouds.setMatrixAt(instance, marker.matrix);
      const shade = 0.93 + ((cloud + instance) % 4) * 0.018;
      tint.setRGB(shade, shade * 0.99, shade * 0.97);
      clouds.setColorAt(instance, tint);
      instance += 1;
    }
  }
  clouds.instanceMatrix.needsUpdate = true;
  if (clouds.instanceColor) clouds.instanceColor.needsUpdate = true;
  clouds.castShadow = false;
  clouds.receiveShadow = false;
  clouds.frustumCulled = false;
  scene.add(clouds);
  return clouds;
}

function addViceCityPort(scene, addGroundPlane, addBox, buildingFootprints, portSurfaceRegions) {
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x286477, roughness: 0.25, metalness: 0.22 });
  const quayMat = new THREE.MeshStandardMaterial({ color: 0x827e73, roughness: 0.92 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x77746c, roughness: 0.95 });
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x6c5947, roughness: 0.9 });
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x292c2c, roughness: 0.6, metalness: 0.45 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(104, 590), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-383, -0.075, 0);
  water.receiveShadow = true;
  scene.add(water);
  addGroundPlane(scene, quayMat, -321, 0, 18, 570, -0.025);
  portSurfaceRegions.push({ x: -321, z: 0, halfWidth: 9, halfDepth: 285, height: -0.025 });
  addBox(scene, wallMat, -330.2, -0.12, 0, 0.9, 1.15, 570, true);
  buildingFootprints.push({ x: -330.2, z: 0, halfWidth: 0.55, halfDepth: 285 });
  addGroundPlane(scene, quayMat, -306, 0, 12, 8, 0.015);
  portSurfaceRegions.push({ x: -306, z: 0, halfWidth: 6, halfDepth: 4, height: 0.015 });

  const pierPositions = [-220, -110, 0, 110, 220];
  const pierLength = 27;
  const pierWidth = 4.2;
  for (const pierZ of pierPositions) {
    addGroundPlane(scene, pierMat, -343.5, pierZ, pierLength, pierWidth, 0.08);
    portSurfaceRegions.push({ x: -343.5, z: pierZ, halfWidth: pierLength / 2, halfDepth: pierWidth / 2, height: 0.08 });
    for (const endX of [-356.5, -330.5]) for (const sideZ of [-1, 1]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), bollardMat);
      bollard.position.set(endX, 0.32, pierZ + sideZ * (pierWidth / 2 - 0.22));
      bollard.castShadow = true;
      scene.add(bollard);
    }
  }
  const quayLampPoleMat = new THREE.MeshStandardMaterial({ color: 0x343b3b, roughness: 0.48, metalness: 0.7 });
  const quayLampMat = new THREE.MeshBasicMaterial({ color: 0xffcf89, toneMapped: false });
  const quayGlowSize = 32;
  const quayGlowPixels = new Uint8Array(quayGlowSize * quayGlowSize * 4);
  for (let y = 0; y < quayGlowSize; y += 1) for (let x = 0; x < quayGlowSize; x += 1) {
    const radius = Math.hypot((x - (quayGlowSize - 1) / 2) / (quayGlowSize / 2),
      (y - (quayGlowSize - 1) / 2) / (quayGlowSize / 2));
    const pixel = (y * quayGlowSize + x) * 4;
    quayGlowPixels[pixel] = 255;
    quayGlowPixels[pixel + 1] = 205;
    quayGlowPixels[pixel + 2] = 126;
    quayGlowPixels[pixel + 3] = Math.round(clamp(1 - radius, 0, 1) ** 2 * 220);
  }
  const quayGlowTexture = new THREE.DataTexture(quayGlowPixels, quayGlowSize, quayGlowSize, THREE.RGBAFormat);
  quayGlowTexture.colorSpace = THREE.SRGBColorSpace;
  quayGlowTexture.needsUpdate = true;
  const quayGlowMat = new THREE.MeshBasicMaterial({
    map: quayGlowTexture, color: 0xffe0aa, transparent: true, opacity: 0.42,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const quayLampPoleGeometry = new THREE.CylinderGeometry(0.085, 0.14, 5.2, 8);
  const quayLampBulbGeometry = new THREE.SphereGeometry(0.28, 10, 8);
  for (let lampIndex = 0; lampIndex < 8; lampIndex += 1) {
    const z = -245 + lampIndex * 70;
    const pole = new THREE.Mesh(quayLampPoleGeometry, quayLampPoleMat);
    pole.position.set(-326.2, 2.6, z);
    pole.castShadow = true;
    scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.09), quayLampPoleMat);
    arm.position.set(-325.45, 5.05, z);
    scene.add(arm);
    const bulb = new THREE.Mesh(quayLampBulbGeometry, quayLampMat);
    bulb.position.set(-324.7, 4.92, z);
    scene.add(bulb);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), quayGlowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(-323.2, 0.018, z);
    glow.scale.set(0.85, 1.55, 1);
    scene.add(glow);
  }
  const boats = [
    { style: 'fishing', length: 13, width: 3.2, hullColor: 0x365e69, cabinColor: 0xe8dfc9, z: -215 },
    { style: 'speedboat', length: 15, width: 3.6, hullColor: 0xb74d3b, cabinColor: 0xf0eee4, z: -105 },
    { style: 'yacht', length: 21, width: 4.8, hullColor: 0x223b4c, cabinColor: 0xf1eee3, z: 5 },
    { style: 'tug', length: 17, width: 4.2, hullColor: 0x38474a, cabinColor: 0xd5cbb7, z: 115 },
    { style: 'fishing', length: 12, width: 3.0, hullColor: 0x53704e, cabinColor: 0xe5dcc8, z: 220 },
  ].map((boatSpec) => ({ ...boatSpec, x: -343.5, yaw: -Math.PI / 2 }));
  for (const boatSpec of boats) {
    makeDockedBoat(scene, addBox, boatSpec);
    buildingFootprints.push({ x: boatSpec.x, z: boatSpec.z, halfWidth: boatSpec.length / 2, halfDepth: boatSpec.width / 2 });
  }
}

function addViceCityOuterHighway(scene, roadElevation) {
  const { edge, halfWidth, cityGridLimit, bankOffset } = VICE_CITY_OUTER_HIGHWAY;
  const highwayElevation = (x, z) => roadElevation(x, z) + viceCityOuterHighwayBridgeHeight(x, z);
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x20262d, roughness: 0.92 });
  const markingMat = new THREE.MeshBasicMaterial({ color: 0xf2efe5, side: THREE.DoubleSide });
  const accessMarkMat = new THREE.MeshBasicMaterial({ color: 0xe8dfc5, side: THREE.DoubleSide });
  const allDashVertices = [];

  for (const pathData of viceCityOuterHighwayPaths()) {
    const points = pathData.map(({ x, z }) => new THREE.Vector3(x, 0, z));
    const pointCount = points.length;
    const tangents = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(pointCount - 1, index + 1)];
      return new THREE.Vector2(after.x - before.x, after.z - before.z).normalize();
    });
    const makeRibbon = (width, lateralOffset, material, heightOffset, name) => {
      const positions = new Float32Array(pointCount * 2 * 3);
      const indices = [];
      for (let index = 0; index < pointCount; index += 1) {
        const point = points[index];
        const tangent = tangents[index];
        const normalX = -tangent.y;
        const normalZ = tangent.x;
        for (let edgeIndex = 0; edgeIndex < 2; edgeIndex += 1) {
          const side = edgeIndex === 0 ? -1 : 1;
          const offset = lateralOffset + side * width / 2;
          const x = point.x + normalX * offset;
          const z = point.z + normalZ * offset;
          const vertex = (index * 2 + edgeIndex) * 3;
          positions[vertex] = x;
          positions[vertex + 1] = highwayElevation(x, z) + heightOffset;
          positions[vertex + 2] = z;
        }
        if (index < pointCount - 1) {
          const outer = index * 2;
          const inner = outer + 1;
          const nextOuter = outer + 2;
          const nextInner = outer + 3;
          indices.push(outer, inner, nextOuter, nextOuter, inner, nextInner);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };

    makeRibbon(halfWidth * 2, 0, asphaltMat, 0.035, 'vice-city-perimeter-highway');
    // Double solid divider and shoulder lines: access spurs can join either direction.
    for (const offset of [-1.5, 1.5, -11.35, 11.35]) {
      makeRibbon(0.16, offset, markingMat, 0.071, 'vice-city-highway-solid-line');
    }

    let pathLength = 0;
    let nextDashAt = 8;
    for (let index = 0; index < pointCount - 1; index += 1) {
      const point = points[index];
      const nextPoint = points[index + 1];
      const tangent = tangents[index];
      const segmentLength = point.distanceTo(nextPoint);
      while (nextDashAt <= pathLength + segmentLength) {
        const progress = (nextDashAt - pathLength) / segmentLength;
        const centerX = point.x + (nextPoint.x - point.x) * progress;
        const centerZ = point.z + (nextPoint.z - point.z) * progress;
        const nextTangent = tangents[index + 1];
        const direction = new THREE.Vector2(
          tangent.x + (nextTangent.x - tangent.x) * progress,
          tangent.y + (nextTangent.y - tangent.y) * progress,
        ).normalize();
        for (const offset of [-6.2, 6.2]) {
          const x = centerX - direction.y * offset;
          const z = centerZ + direction.x * offset;
          const tangentX = direction.x;
          const tangentZ = direction.y;
          const normalX = -tangentZ;
          const normalZ = tangentX;
          const corners = [
            [x - tangentX * 4 - normalX * 0.08, z - tangentZ * 4 - normalZ * 0.08],
            [x + tangentX * 4 - normalX * 0.08, z + tangentZ * 4 - normalZ * 0.08],
            [x + tangentX * 4 + normalX * 0.08, z + tangentZ * 4 + normalZ * 0.08],
            [x - tangentX * 4 + normalX * 0.08, z - tangentZ * 4 + normalZ * 0.08],
          ];
          for (const corner of [0, 1, 2, 0, 2, 3]) {
            const [dashX, dashZ] = corners[corner];
            allDashVertices.push(dashX, highwayElevation(dashX, dashZ) + 0.071, dashZ);
          }
        }
        nextDashAt += 22;
      }
      pathLength += segmentLength;
    }

    // Lamps sit beyond the shoulders and follow the rounded bends.
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x343a3c, roughness: 0.48, metalness: 0.68 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe0a1, toneMapped: false });
    const poleGeometry = new THREE.CylinderGeometry(0.09, 0.15, 7, 7);
    const lampGeometry = new THREE.SphereGeometry(0.25, 8, 6);
    let distance = 45;
    let nextLampAt = 125;
    for (let index = 0; index < pointCount - 1; index += 1) {
      const point = points[index];
      const nextPoint = points[index + 1];
      const direction = tangents[index];
      const length = point.distanceTo(nextPoint);
      while (nextLampAt <= distance + length) {
        const progress = (nextLampAt - distance) / length;
        const centerX = point.x + (nextPoint.x - point.x) * progress;
        const centerZ = point.z + (nextPoint.z - point.z) * progress;
        const nextTangent = tangents[index + 1];
        const tangentX = direction.x + (nextTangent.x - direction.x) * progress;
        const tangentZ = direction.y + (nextTangent.y - direction.y) * progress;
        const magnitude = Math.hypot(tangentX, tangentZ) || 1;
        const normalX = -tangentZ / magnitude;
        const normalZ = tangentX / magnitude;
        for (const outerSide of [-1, 1]) {
          const x = centerX - normalX * outerSide * 17;
          const z = centerZ - normalZ * outerSide * 17;
          const y = highwayElevation(x, z);
          const pole = new THREE.Mesh(poleGeometry, poleMat);
          pole.position.set(x, y + 3.5, z);
          pole.castShadow = true;
          scene.add(pole);
          const lamp = new THREE.Mesh(lampGeometry, lampMat);
          lamp.position.set(x + normalX * outerSide * 3, y + 6.75, z + normalZ * outerSide * 3);
          scene.add(lamp);
        }
        nextLampAt += 125;
      }
      distance += length;
    }
  }

  const overpassRailMat = new THREE.MeshStandardMaterial({ color: 0x92999c, roughness: 0.48, metalness: 0.68 });
  const overpassSupportMat = new THREE.MeshStandardMaterial({ color: 0x777e80, roughness: 0.86 });
  for (const crossingZ of [-edge, edge]) {
    for (const outerSide of [-1, 1]) {
      const railZ = crossingZ + outerSide * (halfWidth - 0.55);
      const railPoints = [];
      for (let x = -bankOffset; x <= bankOffset; x += 15) {
        railPoints.push(new THREE.Vector3(x, highwayElevation(x, railZ) + 0.9, railZ));
      }
      const railCurve = new THREE.CatmullRomCurve3(railPoints, false, 'centripetal');
      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 48, 0.13, 6, false), overpassRailMat);
      rail.name = 'vice-city-highway-overpass-guardrail';
      rail.castShadow = true;
      scene.add(rail);
    }
    for (const supportX of [-55, 55]) {
      for (const outerSide of [-1, 1]) {
        const supportHeight = Math.max(1.2, highwayElevation(supportX, crossingZ) - 0.3);
        const support = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, supportHeight, 2.4),
          overpassSupportMat,
        );
        support.name = 'vice-city-highway-overpass-pier';
        support.position.set(supportX, supportHeight / 2 - 0.06, crossingZ + outerSide * (halfWidth + 4.5));
        support.castShadow = true;
        support.receiveShadow = true;
        scene.add(support);
      }
    }
  }

  const dashGeometry = new THREE.BufferGeometry();
  dashGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allDashVertices, 3));
  dashGeometry.computeVertexNormals();
  const dashMesh = new THREE.Mesh(dashGeometry, markingMat);
  dashMesh.name = 'vice-city-highway-lane-dashes';
  scene.add(dashMesh);

  const addAccessStrip = (orientation, fixed, start, end, width) => {
    const length = Math.abs(end - start);
    const center = (start + end) / 2;
    const horizontal = orientation === 'horizontal';
    const geometry = horizontal
      ? new THREE.PlaneGeometry(length, width, Math.ceil(length / 6), 1)
      : new THREE.PlaneGeometry(width, length, 1, Math.ceil(length / 6));
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let index = 0; index < vertices.count; index += 1) {
      const x = horizontal ? center + vertices.getX(index) : fixed + vertices.getX(index);
      const z = horizontal ? fixed + vertices.getZ(index) : center + vertices.getZ(index);
      vertices.setY(index, highwayElevation(x, z) + 0.04);
    }
    vertices.needsUpdate = true;
    geometry.computeVertexNormals();
    const surface = new THREE.Mesh(geometry, asphaltMat);
    surface.position.set(horizontal ? center : fixed, 0, horizontal ? fixed : center);
    surface.name = 'vice-city-highway-access-ramp';
    surface.receiveShadow = true;
    scene.add(surface);
    for (let along = start + Math.sign(end - start) * 8; Math.sign(end - start) * (end - along) > 4; along += Math.sign(end - start) * 20) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(horizontal ? 8 : 0.16, horizontal ? 0.16 : 8), accessMarkMat,
      );
      dash.rotation.x = -Math.PI / 2;
      const x = horizontal ? along : fixed;
      const z = horizontal ? fixed : along;
      dash.position.set(x, highwayElevation(x, z) + 0.075, z);
      scene.add(dash);
    }
  };
  const accessStart = cityGridLimit + 50;
  for (const fixedX of [-100, 100]) {
    addAccessStrip('vertical', fixedX, -edge, -accessStart, 10);
    addAccessStrip('vertical', fixedX, accessStart, edge, 10);
  }
  for (const fixedZ of [-300, 300]) {
    addAccessStrip('horizontal', fixedZ, -edge, -accessStart, 10);
    addAccessStrip('horizontal', fixedZ, accessStart, edge, 10);
  }
}

function makeCity(scene) {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x252a32, roughness: 0.94 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb8a99a, roughness: 0.9 });
  const sidewalkTileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 });
  const sidewalkTileColors = [0x9d9890, 0xa9a39a, 0xb1aaa0, 0x969188, 0xa49e95];
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x8e8b84, roughness: 0.92 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1d8a0 });
  const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xe9e5da });
  const parkingMarkMat = new THREE.MeshBasicMaterial({ color: 0xc9c5b5 });
  const roadPatchMat = new THREE.MeshStandardMaterial({ color: 0x34383d, roughness: 1 });
  const manholeRimMat = new THREE.MeshStandardMaterial({ color: 0x161a1f, roughness: 0.92 });
  const manholeMat = new THREE.MeshStandardMaterial({ color: 0x62666a, roughness: 0.76, metalness: 0.18 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x344b42, roughness: 1 });
  const lotGrassPalette = [0x4f6947, 0x59724a, 0x60784d, 0x526d4b, 0x657a50];
  const districtPalettes = {
    downtown: [0xf0b89f, 0x9fc8c4, 0xf2d9b2, 0xd99d91, 0xc7d5cf],
    port: [0x81939a, 0xb98b6d, 0xc0b69d, 0x667f87, 0xd0c5ad],
    residential: [0xd4bea0, 0x9aafa3, 0xc8ada0, 0xe0d4bb, 0x91a1a0],
  };
  const litWindowPositions = [];
  const blueWindowPositions = [];
  const neonGlowSpecs = [];
  const darkWindowPositions = [];
  const litSideWindowPositions = [];
  const blueSideWindowPositions = [];
  const darkSideWindowPositions = [];
  const verticalDashPositions = [];
  const horizontalDashPositions = [];
  const verticalCrosswalkPositions = [];
  const horizontalCrosswalkPositions = [];
  const verticalParkingBayPositions = [];
  const horizontalParkingBayPositions = [];
  const verticalRoadPatchPositions = [];
  const horizontalRoadPatchPositions = [];
  const verticalManholePositions = [];
  const horizontalManholePositions = [];
  const verticalSidewalkTilePositions = [];
  const horizontalSidewalkTilePositions = [];
  const cornerSidewalkTilePositions = [];
  const parkedCarSpecs = [];
  const parkedCarBodies = [];
  const trafficIntersections = [];
  const trafficSignalSpecs = [];
  const overheadTrafficSignalSpecs = [];
  const fenceSegments = [];
  const grassTuftPositions = [];
  const buildingFootprints = [];
  const sidewalkRegions = [];
  const lotRegions = [];
  const portSurfaceRegions = [];
  const addBox = (parent, material, x, y, z, w, h, d, castShadow = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Quelques rues prennent du relief : pentes douces, sommet arrondi et retour au niveau des carrefours.
  const roadElevation = (x, z) => {
    const bridgeAcross = Math.abs(z);
    let elevation = viceCityRoadElevation(x, z);
    if (bridgeAcross <= ROAD_HALF + 6 && Math.abs(x) < BRIDGE_HALF_LENGTH) {
      const progress = (x + BRIDGE_HALF_LENGTH) / (BRIDGE_HALF_LENGTH * 2);
      const arch = 5.8 * Math.sin(progress * Math.PI) ** 2;
      const shoulder = bridgeAcross <= ROAD_HALF ? 1 : 1 - ((bridgeAcross - ROAD_HALF) / 6) ** 2;
      elevation = Math.max(elevation, arch * shoulder);
    }
    return elevation;
  };
  const makeRoadStrip = (axis, fixed, width, material, heightOffset = 0) => {
    const length = CITY_GRID_LIMIT * 2 + 120;
    const crossesCanal = axis === 'z' && Math.abs(fixed) > ROAD_HALF + 6;
    const ranges = crossesCanal
      ? [[-length / 2, -CANAL_HALF_WIDTH], [CANAL_HALF_WIDTH, length / 2]]
      : [[-length / 2, length / 2]];
    const meshes = [];
    for (const [start, end] of ranges) {
      const segmentLength = end - start;
      const segmentCenter = (start + end) / 2;
      const geometry = axis === 'x'
        ? new THREE.PlaneGeometry(width, segmentLength, 1, 180)
        : new THREE.PlaneGeometry(segmentLength, width, 180, 1);
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const x = axis === 'x' ? fixed + positions.getX(index) : segmentCenter + positions.getX(index);
        const z = axis === 'x' ? segmentCenter + positions.getZ(index) : fixed + positions.getZ(index);
        positions.setY(index, roadElevation(x, z) + heightOffset);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(axis === 'x' ? fixed : segmentCenter, 0, axis === 'z' ? fixed : segmentCenter);
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
    }
    return meshes.length === 1 ? meshes[0] : meshes;
  };
  const groundGeometry = new THREE.PlaneGeometry(CITY_LIMIT * 2 + 100, CITY_LIMIT * 2 + 100, 240, 240);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundPositions = groundGeometry.attributes.position;
  for (let index = 0; index < groundPositions.count; index += 1) {
    const x = groundPositions.getX(index);
    const z = groundPositions.getZ(index);
    const underBridgeOverCanal = Math.abs(x) < CANAL_HALF_WIDTH && Math.abs(z) < ROAD_HALF + 6;
    groundPositions.setY(index, underBridgeOverCanal ? viceCityRoadElevation(x, z) : roadElevation(x, z));
  }
  groundPositions.needsUpdate = true;
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, grassMat);
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  scene.add(ground);

  // A genuine orthogonal street grid: avenue / cross-street intersections,
  // sidewalks, lane markings and raised crossings, repeated across a broad map.
  for (let index = -3; index <= 3; index += 1) {
    const axis = index * BLOCK;
    if (axis !== 0) makeRoadStrip('x', axis, ROAD_HALF * 2, roadMat);
    makeRoadStrip('z', axis, ROAD_HALF * 2, roadMat, 0.006);
    for (const side of [-1, 1]) {
      // Ligne de séparation entre les voies de circulation et le stationnement.
      if (axis !== 0) makeRoadStrip('x', axis + side * 3.6, 0.14, lineMat, 0.035);
      makeRoadStrip('z', axis + side * 3.6, 0.14, lineMat, 0.038);
    }
    // Broken centerline on each road, interrupted around each junction.
    for (let p = -3 * BLOCK; p <= 3 * BLOCK; p += 13) {
      if (Math.abs((p + 50) % BLOCK - 50) < 15) continue;
      if (axis !== 0) verticalDashPositions.push([axis, p]);
      if (axis === 0 || Math.abs(p) >= CANAL_HALF_WIDTH + 4) horizontalDashPositions.push([p, axis]);
    }
    // Zébras aux quatre approches de chaque carrefour, orientées dans les deux axes.
    for (let crossing = -3; crossing <= 3; crossing += 1) {
      const crossAxis = crossing * BLOCK;
      for (const side of [-1, 1]) {
        const horizontalOffset = axis === 0 && crossAxis === 0 ? CANAL_HALF_WIDTH + 2 : 14;
        for (let stripe = -6.4; stripe <= 6.4; stripe += 1.6) {
          if (axis !== 0) verticalCrosswalkPositions.push([axis + stripe, crossAxis + side * 14]);
          const horizontalX = crossAxis + side * horizontalOffset;
          if (axis === 0 || Math.abs(horizontalX) > CANAL_HALF_WIDTH + 2) {
            horizontalCrosswalkPositions.push([horizontalX, axis + stripe]);
          }
        }
      }
    }
    // Places de stationnement compactes, reprises d'asphalte et plaques d'égout.
    if (axis !== 0) {
      for (let p = -3 * BLOCK; p <= 3 * BLOCK; p += 6) {
      if (Math.abs(p - Math.round(p / BLOCK) * BLOCK) < 21) continue;
      for (const side of [-1, 1]) {
        verticalParkingBayPositions.push([axis + side * 5.3, p]);
        if (Math.abs(p) >= CANAL_HALF_WIDTH + 4) horizontalParkingBayPositions.push([p, axis + side * 5.3]);
      }
    }
    for (let p = -275; p <= 275; p += 50) {
      if (Math.abs(p - Math.round(p / BLOCK) * BLOCK) < 20) continue;
      const patchSide = (Math.round((p + 275) / 50) + index) % 2 ? 1 : -1;
      const patchOffset = patchSide * (4.7 + (index % 3) * 0.35);
      verticalRoadPatchPositions.push([axis + patchOffset, p]);
      horizontalRoadPatchPositions.push([p, axis + patchOffset]);
    }
      for (let p = -250; p <= 250; p += BLOCK) {
        for (const side of [-1, 1]) {
          verticalManholePositions.push([axis + side * 1.7, p]);
          horizontalManholePositions.push([p, axis + side * 1.7]);
        }
      }
    }
  }

  const canalWaterMat = new THREE.MeshStandardMaterial({ color: 0x287d9b, roughness: 0.3, metalness: 0.12 });
  const canalWaterGeometry = new THREE.PlaneGeometry(CANAL_HALF_WIDTH * 2, CITY_LIMIT * 2 + 120, 24, 160);
  canalWaterGeometry.rotateX(-Math.PI / 2);
  const canalWaterPositions = canalWaterGeometry.attributes.position;
  canalWaterPositions.setUsage(THREE.DynamicDrawUsage);
  for (let index = 0; index < canalWaterPositions.count; index += 1) {
    canalWaterPositions.setY(index, viceCityCanalWaveHeight(
      canalWaterPositions.getX(index), canalWaterPositions.getZ(index), 0,
    ));
  }
  canalWaterPositions.needsUpdate = true;
  canalWaterGeometry.computeVertexNormals();
  canalWaterGeometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  let lastCanalWaveUpdate = -1;
  const updateCanalWater = (elapsed) => {
    if (elapsed - lastCanalWaveUpdate < 1 / 30) return;
    lastCanalWaveUpdate = elapsed;
    for (let index = 0; index < canalWaterPositions.count; index += 1) {
      canalWaterPositions.setY(index, viceCityCanalWaveHeight(
        canalWaterPositions.getX(index), canalWaterPositions.getZ(index), elapsed,
      ));
    }
    canalWaterPositions.needsUpdate = true;
    canalWaterGeometry.computeVertexNormals();
  };
  const canalWater = new THREE.Mesh(canalWaterGeometry, canalWaterMat);
  canalWater.position.set(0, -0.075, 0);
  canalWater.receiveShadow = true;
  scene.add(canalWater);
  const canalBoatSpecs = [
    { x: -9, z: -265, direction: 1, speed: 4.8, phase: 0.2, hullColor: 0xd46c36, cabinColor: 0xe9e2cf },
    { x: 0, z: 45, direction: -1, speed: 5.6, phase: 2.1, hullColor: 0x2d7890, cabinColor: 0xd9d4c5 },
    { x: 9, z: 295, direction: 1, speed: 4.2, phase: 4.3, hullColor: 0xe2e0d4, cabinColor: 0xc36b36 },
  ];
  const canalBoats = canalBoatSpecs.map((spec, index) => ({
    ...spec,
    boat: makeDockedBoat(scene, addBox, {
      x: spec.x, z: spec.z, yaw: spec.direction > 0 ? 0 : Math.PI,
      length: 9.2, width: 2.45, style: 'fishing',
      hullColor: spec.hullColor, cabinColor: spec.cabinColor,
    }),
  }));
  canalBoats.forEach(({ boat }, index) => { boat.name = `vice-city-river-boat-${index + 1}`; });
  const canalWakeGeometry = new THREE.RingGeometry(0.68, 1, 28);
  const canalWakes = canalBoats.map(({ boat }, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: index % 2 ? 0xb5e1dc : 0xd1e6df, transparent: true, opacity: 0.18,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const wake = new THREE.Mesh(canalWakeGeometry, material);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(boat.position.x, 0.012, boat.position.z);
    scene.add(wake);
    return wake;
  });
  const updateCanalBoats = (dt, elapsed) => {
    const travelLimit = CITY_LIMIT + 48;
    canalBoats.forEach(({ boat, x, direction, speed, phase }, index) => {
      let z = boat.position.z + direction * speed * dt;
      if (z > travelLimit) z = -travelLimit;
      else if (z < -travelLimit) z = travelLimit;
      boat.position.set(x, -0.02 + Math.sin(elapsed * 1.7 + phase) * 0.025, z);
      boat.rotation.y = direction > 0 ? 0 : Math.PI;
      boat.rotation.z = Math.sin(elapsed * 1.2 + phase) * 0.012;
      const wake = canalWakes[index];
      const pulse = (elapsed * 0.48 + phase) % 1;
      wake.position.set(x, 0.015, z - direction * 5.2);
      wake.scale.setScalar(0.75 + pulse * 1.2);
      wake.material.opacity = (1 - pulse) * 0.2;
    });
  };
  const canalWallMat = new THREE.MeshStandardMaterial({ color: 0x757b78, roughness: 0.9, side: THREE.DoubleSide });
  const canalWallLength = CITY_LIMIT * 2 + 100;
  for (const side of [-1, 1]) {
    const wallVertices = [];
    const addWallQuad = (a, b, c, d) => wallVertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    const segments = Math.ceil(canalWallLength / 4);
    const segmentLength = canalWallLength / segments;
    const innerX = side * CANAL_HALF_WIDTH;
    const outerX = side * (CANAL_HALF_WIDTH + 0.7);
    for (let segment = 0; segment < segments; segment += 1) {
      const z0 = -canalWallLength / 2 + segment * segmentLength;
      const z1 = z0 + segmentLength;
      const top0 = Math.max(1.25, roadElevation(side * (CANAL_HALF_WIDTH + 0.35), z0));
      const top1 = Math.max(1.25, roadElevation(side * (CANAL_HALF_WIDTH + 0.35), z1));
      const bottom = -1.5;
      addWallQuad([innerX, bottom, z0], [innerX, bottom, z1], [innerX, top1, z1], [innerX, top0, z0]);
      addWallQuad([outerX, bottom, z1], [outerX, bottom, z0], [outerX, top0, z0], [outerX, top1, z1]);
      addWallQuad([innerX, top0, z0], [outerX, top0, z0], [outerX, top1, z1], [innerX, top1, z1]);
    }
    const wallGeometry = new THREE.BufferGeometry();
    wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallVertices, 3));
    wallGeometry.computeVertexNormals();
    const canalWall = new THREE.Mesh(wallGeometry, canalWallMat);
    canalWall.castShadow = true;
    canalWall.receiveShadow = true;
    scene.add(canalWall);
  }
  const bridgeRedMat = new THREE.MeshStandardMaterial({ color: 0xb72f37, roughness: 0.42, metalness: 0.58 });
  const bridgePoints = (side, offset) => {
    const points = [];
    for (let step = 0; step <= 24; step += 1) {
      const progress = step / 24;
      const x = -BRIDGE_ARCH_HALF_LENGTH + progress * BRIDGE_ARCH_HALF_LENGTH * 2;
      const y = roadElevation(x, 0) + offset;
      points.push(new THREE.Vector3(x, y, side));
    }
    return points;
  };
  const addBridgeBeam = (start, end, radius = 0.13) => {
    const delta = new THREE.Vector3().subVectors(end, start);
    const beam = new THREE.Mesh(bridgeRodGeometry, bridgeRedMat);
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.scale.set(radius, delta.length(), radius);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    beam.castShadow = true;
    scene.add(beam);
  };
  const bridgeRodGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const bridgeSpan = BRIDGE_ARCH_HALF_LENGTH * 2;
  for (const side of [-1, 1]) {
    const sideZ = side * (ROAD_HALF + 0.7);
    const rampRailZ = side * (ROAD_HALF + 2.3);
    const rampRailPoints = [];
    for (let step = 0; step <= 72; step += 1) {
      const progress = step / 72;
      const x = -BRIDGE_RAIL_HALF_LENGTH + progress * BRIDGE_RAIL_HALF_LENGTH * 2;
      const railBase = roadElevation(x, rampRailZ);
      rampRailPoints.push(new THREE.Vector3(x, railBase + 0.95 * Math.sin(progress * Math.PI), rampRailZ));
    }
    const rampRail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rampRailPoints), 144, 0.12, 7, false), bridgeRedMat,
    );
    rampRail.castShadow = true;
    scene.add(rampRail);
    const lowerRailPoints = rampRailPoints.map((point, index) => {
      const progress = index / (rampRailPoints.length - 1);
      return new THREE.Vector3(point.x, roadElevation(point.x, rampRailZ) + 0.32 * Math.sin(progress * Math.PI), rampRailZ);
    });
    const lowerRampRail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lowerRailPoints), 144, 0.085, 6, false), bridgeRedMat,
    );
    lowerRampRail.castShadow = true;
    scene.add(lowerRampRail);
    for (let postIndex = 1; postIndex < 16; postIndex += 1) {
      const progress = postIndex / 16;
      const x = -BRIDGE_RAIL_HALF_LENGTH + progress * BRIDGE_RAIL_HALF_LENGTH * 2;
      const railBase = roadElevation(x, rampRailZ);
      const railTop = railBase + 0.95 * Math.sin(progress * Math.PI);
      addBridgeBeam(new THREE.Vector3(x, railBase + 0.08, rampRailZ), new THREE.Vector3(x, railTop, rampRailZ), 0.09);
    }
    const archPoints = bridgePoints(sideZ, 2.4).map((point, index, points) => {
      const progress = index / (points.length - 1);
      point.y += 2.65 * Math.sin(progress * Math.PI);
      return point;
    });
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 64, 0.24, 8, false), bridgeRedMat);
    arch.castShadow = true;
    scene.add(arch);
    const lowerPoints = bridgePoints(sideZ, 0.28);
    const lowerChord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lowerPoints), 48, 0.19, 7, false), bridgeRedMat);
    lowerChord.castShadow = true;
    scene.add(lowerChord);
    for (let segment = 0; segment < 12; segment += 1) {
      const x0 = -BRIDGE_ARCH_HALF_LENGTH + bridgeSpan * segment / 12;
      const x1 = -BRIDGE_ARCH_HALF_LENGTH + bridgeSpan * (segment + 1) / 12;
      const t0 = segment / 12;
      const t1 = (segment + 1) / 12;
      const deck0 = roadElevation(x0, 0) + 0.34;
      const deck1 = roadElevation(x1, 0) + 0.34;
      const arch0 = deck0 + 2.06 + 2.65 * Math.sin(t0 * Math.PI);
      const arch1 = deck1 + 2.06 + 2.65 * Math.sin(t1 * Math.PI);
      addBridgeBeam(new THREE.Vector3(x0, deck0, sideZ), new THREE.Vector3(x0, arch0, sideZ), 0.12);
      addBridgeBeam(new THREE.Vector3(x0, deck0, sideZ), new THREE.Vector3(x1, arch1, sideZ), 0.095);
      addBridgeBeam(new THREE.Vector3(x1, deck1, sideZ), new THREE.Vector3(x1, arch1, sideZ), 0.12);
      addBridgeBeam(
        new THREE.Vector3(x0, roadElevation(x0, 0) + 0.3, side * (ROAD_HALF - 0.3)),
        new THREE.Vector3(x1, roadElevation(x1, 0) + 0.3, side * (ROAD_HALF - 0.3)),
        0.09,
      );
    }
    for (const x of [-12, 12]) {
      const pierHeight = roadElevation(x, 0) + 1.9;
      addBox(scene, bridgeRedMat, x, -1.45, side * 7.55, 1.1, pierHeight, 1.05, true);
    }
  }
  const sidewalkHeight = 0.12;
  const sidewalkSegmentLength = BLOCK - 2 * (ROAD_HALF + 3.2);
  const verticalSidewalkGeometry = new THREE.PlaneGeometry(3.2, sidewalkSegmentLength, 1, 48);
  const horizontalSidewalkGeometry = new THREE.PlaneGeometry(sidewalkSegmentLength, 3.2, 48, 1);
  const cornerSidewalkGeometry = new THREE.PlaneGeometry(3.2, 3.2);
  const fitSidewalkToElevation = (mesh) => {
    mesh.geometry = mesh.geometry.clone();
    const positions = mesh.geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = mesh.position.x + positions.getX(index);
      const z = mesh.position.z - positions.getY(index);
      positions.setZ(index, roadElevation(x, z));
    }
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  };
  const addSlopedCurb = (x, z, width, depth) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, sidewalkHeight, depth, width > depth ? 48 : 1, 1, depth >= width ? 48 : 1),
      curbMat,
    );
    mesh.position.set(x, sidewalkHeight / 2, z);
    const positions = mesh.geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      positions.setY(index, positions.getY(index) + roadElevation(x + positions.getX(index), z + positions.getZ(index)));
    }
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  for (let axisIndex = -3; axisIndex <= 3; axisIndex += 1) {
    const axis = axisIndex * BLOCK;
    for (let block = -3; block < 3; block += 1) {
      const segmentStart = block * BLOCK;
      const segmentCenter = segmentStart + BLOCK / 2;
      const sidewalkStart = segmentCenter - sidewalkSegmentLength / 2;
      const sidewalkEnd = segmentCenter + sidewalkSegmentLength / 2;
      const horizontalSidewalkRanges = axis === 0
        ? [[sidewalkStart, sidewalkEnd]]
        : [[sidewalkStart, Math.min(sidewalkEnd, -CANAL_HALF_WIDTH)], [Math.max(sidewalkStart, CANAL_HALF_WIDTH), sidewalkEnd]]
          .filter(([start, end]) => end - start > 0.5);
      for (const side of [-1, 1]) {
        const sidewalkOffset = side * (ROAD_HALF + 1.6);
        if (axis !== 0) {
          const sidewalkV = new THREE.Mesh(verticalSidewalkGeometry, sidewalkMat);
          sidewalkV.rotation.x = -Math.PI / 2;
          sidewalkV.position.set(axis + sidewalkOffset, sidewalkHeight, segmentCenter);
          fitSidewalkToElevation(sidewalkV);
          sidewalkV.receiveShadow = true;
          scene.add(sidewalkV);
          sidewalkRegions.push({ x: axis + sidewalkOffset, z: segmentCenter, halfWidth: 1.6, halfDepth: sidewalkSegmentLength / 2 });
        }
        for (const [rangeStart, rangeEnd] of horizontalSidewalkRanges) {
          const rangeLength = rangeEnd - rangeStart;
          const rangeCenter = (rangeStart + rangeEnd) / 2;
          const sidewalkH = new THREE.Mesh(new THREE.PlaneGeometry(rangeLength, 3.2, 48, 1), sidewalkMat);
          sidewalkH.rotation.x = -Math.PI / 2;
          sidewalkH.position.set(rangeCenter, sidewalkHeight, axis + sidewalkOffset);
          fitSidewalkToElevation(sidewalkH);
          sidewalkH.receiveShadow = true;
          scene.add(sidewalkH);
          sidewalkRegions.push({ x: rangeCenter, z: axis + sidewalkOffset, halfWidth: rangeLength / 2, halfDepth: 1.6 });
          addSlopedCurb(rangeCenter, axis + side * (ROAD_HALF - 0.1), rangeLength, 0.2);
        }
        if (axis !== 0) addSlopedCurb(axis + side * (ROAD_HALF - 0.1), segmentCenter, 0.2, sidewalkSegmentLength);

        for (let row = 0; row < 2; row += 1) {
          const crossOffset = row === 0 ? -0.8 : 0.8;
          let tileIndex = 0;
          for (let along = segmentStart + ROAD_HALF + 3.95; along < segmentStart + BLOCK - ROAD_HALF - 3.95; along += 1.5) {
            const tileColor = Math.abs((Math.floor(along / 1.5) + (axisIndex + 3) * 11 + (side + 1) * 7 + row * 3 + tileIndex) % sidewalkTileColors.length);
            if (axis !== 0) verticalSidewalkTilePositions.push([axis + sidewalkOffset + crossOffset, along, tileColor]);
            if (axis === 0 || Math.abs(along) >= CANAL_HALF_WIDTH + 1.2) {
              horizontalSidewalkTilePositions.push([along, axis + sidewalkOffset + crossOffset, tileColor]);
            }
            tileIndex += 1;
          }
        }
      }
    }
  }
  addViceCityOuterHighway(scene, roadElevation);

  // Pavés d'angle : ils relient les segments, sans prolonger les trottoirs sur les routes.
  for (let xAxisIndex = -3; xAxisIndex <= 3; xAxisIndex += 1) {
    for (let zAxisIndex = -3; zAxisIndex <= 3; zAxisIndex += 1) {
      const xAxis = xAxisIndex * BLOCK;
      const zAxis = zAxisIndex * BLOCK;
      for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        if (xAxis === 0 && zAxis !== 0) continue;
        const centerX = xAxis + sideX * (ROAD_HALF + 1.6);
        const centerZ = zAxis + sideZ * (ROAD_HALF + 1.6);
        const corner = new THREE.Mesh(cornerSidewalkGeometry, sidewalkMat);
        corner.rotation.x = -Math.PI / 2;
        corner.position.set(centerX, sidewalkHeight, centerZ);
        corner.receiveShadow = true;
        scene.add(corner);
        sidewalkRegions.push({ x: centerX, z: centerZ, halfWidth: 1.6, halfDepth: 1.6 });
        for (let rowX = 0; rowX < 2; rowX += 1) for (let rowZ = 0; rowZ < 2; rowZ += 1) {
          const tileColor = Math.abs((xAxisIndex * 13 + zAxisIndex * 7 + (sideX + 1) * 3 + (sideZ + 1) * 5 + rowX * 2 + rowZ) % sidewalkTileColors.length);
          cornerSidewalkTilePositions.push([
            centerX + (rowX === 0 ? -0.8 : 0.8),
            centerZ + (rowZ === 0 ? -0.8 : 0.8),
            tileColor,
          ]);
        }
      }
    }
  }

  const marker = new THREE.Object3D();
  const verticalDashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 4), lineMat, verticalDashPositions.length);
  verticalDashPositions.forEach(([x, z], index) => { marker.position.set(x, roadElevation(x, z) + 0.04, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); verticalDashes.setMatrixAt(index, marker.matrix); });
  scene.add(verticalDashes);
  const horizontalDashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 0.22), lineMat, horizontalDashPositions.length);
  horizontalDashPositions.forEach(([x, z], index) => { marker.position.set(x, roadElevation(x, z) + 0.04, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); horizontalDashes.setMatrixAt(index, marker.matrix); });
  scene.add(horizontalDashes);
  const verticalCrosswalk = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.35, 0.65), crosswalkMat, verticalCrosswalkPositions.length);
  verticalCrosswalkPositions.forEach(([x, z], index) => { marker.position.set(x, roadElevation(x, z) + 0.055, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); verticalCrosswalk.setMatrixAt(index, marker.matrix); });
  scene.add(verticalCrosswalk);
  const horizontalCrosswalk = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.65, 1.35), crosswalkMat, horizontalCrosswalkPositions.length);
  horizontalCrosswalkPositions.forEach(([x, z], index) => { marker.position.set(x, roadElevation(x, z) + 0.057, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); horizontalCrosswalk.setMatrixAt(index, marker.matrix); });
  scene.add(horizontalCrosswalk);
  const addFlatRoadInstances = (geometry, material, positions, y) => {
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    positions.forEach(([x, z], index) => {
      marker.position.set(x, y + roadElevation(x, z), z);
      marker.rotation.set(-Math.PI / 2, 0, 0);
      marker.scale.set(1, 1, 1);
      marker.updateMatrix();
      mesh.setMatrixAt(index, marker.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  };
  addFlatRoadInstances(new THREE.PlaneGeometry(3.3, 0.12), parkingMarkMat, verticalParkingBayPositions, 0.043);
  addFlatRoadInstances(new THREE.PlaneGeometry(0.12, 3.3), parkingMarkMat, horizontalParkingBayPositions, 0.044);
  addFlatRoadInstances(new THREE.PlaneGeometry(1.25, 3.2), roadPatchMat, verticalRoadPatchPositions, 0.025);
  addFlatRoadInstances(new THREE.PlaneGeometry(3.2, 1.25), roadPatchMat, horizontalRoadPatchPositions, 0.026);
  addFlatRoadInstances(new THREE.CircleGeometry(0.46, 16), manholeRimMat, verticalManholePositions, 0.028);
  addFlatRoadInstances(new THREE.CircleGeometry(0.46, 16), manholeRimMat, horizontalManholePositions, 0.029);
  addFlatRoadInstances(new THREE.CircleGeometry(0.34, 16), manholeMat, verticalManholePositions, 0.034);
  addFlatRoadInstances(new THREE.CircleGeometry(0.34, 16), manholeMat, horizontalManholePositions, 0.035);
  const addSidewalkTiles = (positions, geometry, y) => {
    const tiles = new THREE.InstancedMesh(geometry, sidewalkTileMat, positions.length);
    positions.forEach(([x, z, colorIndex], index) => {
      marker.position.set(x, y + roadElevation(x, z), z);
      marker.rotation.set(-Math.PI / 2, 0, 0);
      marker.scale.set(1, 1, 1);
      marker.updateMatrix();
      tiles.setMatrixAt(index, marker.matrix);
      tiles.setColorAt(index, new THREE.Color(sidewalkTileColors[colorIndex]));
    });
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    scene.add(tiles);
  };
  addSidewalkTiles(verticalSidewalkTilePositions, new THREE.PlaneGeometry(1.48, 1.4), 0.124);
  addSidewalkTiles(horizontalSidewalkTilePositions, new THREE.PlaneGeometry(1.4, 1.48), 0.124);
  addSidewalkTiles(cornerSidewalkTilePositions, new THREE.PlaneGeometry(1.4, 1.4), 0.124);

  // Art-deco downtown and residential blocks, with varied setbacks, rooftops,
  // lit windows, shop awnings, palms, and corner street furniture.
  let seed = 0x1986cafe;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffcf84, toneMapped: false });
  const blueWindow = new THREE.MeshBasicMaterial({ color: 0x87d9e2, toneMapped: false });
  const shopGlassMat = new THREE.MeshStandardMaterial({ color: 0x376f78, roughness: 0.24, metalness: 0.18 });
  const entryGlassMat = new THREE.MeshStandardMaterial({ color: 0x6ca5a8, roughness: 0.28, metalness: 0.12 });
  const shopFrameMat = new THREE.MeshStandardMaterial({ color: 0x29363a, roughness: 0.46, metalness: 0.38 });
  const entryDoorMat = new THREE.MeshStandardMaterial({ color: 0x594338, roughness: 0.72 });
  const garageDoorMat = new THREE.MeshStandardMaterial({ color: 0x4a565c, roughness: 0.64, metalness: 0.28 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc6a15a, roughness: 0.42, metalness: 0.62 });
  const darkWindow = new THREE.MeshBasicMaterial({ color: 0x253746, toneMapped: false });
  const palmBarkSize = 64;
  const palmBarkPixels = new Uint8Array(palmBarkSize * palmBarkSize * 4);
  for (let y = 0; y < palmBarkSize; y += 1) for (let x = 0; x < palmBarkSize; x += 1) {
    const index = (y * palmBarkSize + x) * 4;
    const grain = ((x * 37 + y * 19 + x * y * 3) % 29) - 14;
    const ring = y % 8 === 0 || y % 8 === 1 ? -30 : 0;
    palmBarkPixels[index] = Math.max(0, 126 + grain + ring);
    palmBarkPixels[index + 1] = Math.max(0, 91 + grain + ring);
    palmBarkPixels[index + 2] = Math.max(0, 57 + grain + ring);
    palmBarkPixels[index + 3] = 255;
  }
  const palmBarkTexture = new THREE.DataTexture(palmBarkPixels, palmBarkSize, palmBarkSize, THREE.RGBAFormat);
  palmBarkTexture.colorSpace = THREE.SRGBColorSpace;
  palmBarkTexture.wrapS = THREE.RepeatWrapping;
  palmBarkTexture.wrapT = THREE.RepeatWrapping;
  palmBarkTexture.repeat.set(1, 2);
  palmBarkTexture.needsUpdate = true;
  const palmTrunk = new THREE.MeshStandardMaterial({ map: palmBarkTexture, color: 0xffffff, roughness: 0.94 });
  const palmFrondMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.92 });
  const canopyMats = [0x397348, 0x477d4a, 0x527f47].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.96 }));
  const broadleafGeometry = new THREE.IcosahedronGeometry(1, 1);
  const neon = [0xff668a, 0x45d7dc, 0xf2c968];
  const districtLighting = {
    downtown: { signs: [0xff4f9a, 0x32dce8, 0xffc044], glow: 1 },
    port: { signs: [0xffa84b, 0x58ccd5, 0xe6dfc6], glow: 0.76 },
    residential: { signs: [0xffc37a, 0x8bc0b1, 0xe2aa6f], glow: 0.48 },
  };
  const neonGlowSize = 48;
  const neonGlowPixels = new Uint8Array(neonGlowSize * neonGlowSize * 4);
  for (let y = 0; y < neonGlowSize; y += 1) for (let x = 0; x < neonGlowSize; x += 1) {
    const radius = Math.hypot((x - (neonGlowSize - 1) / 2) / (neonGlowSize / 2),
      (y - (neonGlowSize - 1) / 2) / (neonGlowSize / 2));
    const pixel = (y * neonGlowSize + x) * 4;
    neonGlowPixels[pixel] = 255;
    neonGlowPixels[pixel + 1] = 255;
    neonGlowPixels[pixel + 2] = 255;
    neonGlowPixels[pixel + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 220);
  }
  const neonGlowTexture = new THREE.DataTexture(neonGlowPixels, neonGlowSize, neonGlowSize, THREE.RGBAFormat);
  neonGlowTexture.colorSpace = THREE.SRGBColorSpace;
  neonGlowTexture.magFilter = THREE.LinearFilter;
  neonGlowTexture.minFilter = THREE.LinearFilter;
  neonGlowTexture.needsUpdate = true;
  const neonGlowMaterial = new THREE.MeshBasicMaterial({
    map: neonGlowTexture, vertexColors: true, transparent: true, opacity: 0.46,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const awningMats = neon.map((accent) => {
    const size = 64;
    const pixels = new Uint8Array(size * 16 * 4);
    const accentRgb = [(accent >> 16) & 0xff, (accent >> 8) & 0xff, accent & 0xff];
    const creamRgb = [255, 231, 200];
    for (let y = 0; y < 16; y += 1) for (let x = 0; x < size; x += 1) {
      const color = Math.floor(x / 8) % 2 === 0 ? accentRgb : creamRgb;
      const pixel = (y * size + x) * 4;
      pixels[pixel] = color[0];
      pixels[pixel + 1] = color[1];
      pixels[pixel + 2] = color[2];
      pixels[pixel + 3] = 255;
    }
    const texture = new THREE.DataTexture(pixels, size, 16, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.76, side: THREE.DoubleSide });
  });
  const courtyardPathMat = new THREE.MeshStandardMaterial({ color: 0xaaa49b, roughness: 0.9 });
  const courtyardGrassMat = new THREE.MeshStandardMaterial({ color: 0x577756, roughness: 1 });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0xb28f6c, roughness: 0.92 });
  const playMat = new THREE.MeshStandardMaterial({ color: 0x446e78, roughness: 0.94 });
  const playAccentMat = new THREE.MeshStandardMaterial({ color: 0xd79552, roughness: 0.8 });
  const playBlueMat = new THREE.MeshStandardMaterial({ color: 0x4587a0, roughness: 0.68, metalness: 0.12 });
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x815d42, roughness: 0.88 });
  const fountainWaterMat = new THREE.MeshStandardMaterial({ color: 0x4b9a9a, roughness: 0.24, metalness: 0.24 });
  const fenceMetalMat = new THREE.MeshStandardMaterial({ color: 0x8b9693, roughness: 0.58, metalness: 0.58 });
  const chainSize = 64;
  const chainPixels = new Uint8Array(chainSize * chainSize * 4);
  for (let y = 0; y < chainSize; y += 1) for (let x = 0; x < chainSize; x += 1) {
    const diagonalA = Math.abs(((x + y) % 16) - 8);
    const diagonalB = Math.abs(((x - y + chainSize) % 16) - 8);
    if (diagonalA <= 1 || diagonalB <= 1) {
      const pixel = (y * chainSize + x) * 4;
      chainPixels[pixel] = 178; chainPixels[pixel + 1] = 188; chainPixels[pixel + 2] = 183; chainPixels[pixel + 3] = 210;
    }
  }
  const chainTexture = new THREE.DataTexture(chainPixels, chainSize, chainSize, THREE.RGBAFormat);
  chainTexture.colorSpace = THREE.SRGBColorSpace;
  chainTexture.wrapS = THREE.RepeatWrapping;
  chainTexture.wrapT = THREE.RepeatWrapping;
  chainTexture.needsUpdate = true;
  const chainMaterial = new THREE.MeshBasicMaterial({ map: chainTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const grassBladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const addGroundPlane = (parent, material, x, z, width, depth, y = -0.05) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const makeCurvedTrunkGeometry = (height, baseRadius, leanX, leanZ) => {
    const rings = 12;
    const sides = 9;
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let ring = 0; ring <= rings; ring += 1) {
      const t = ring / rings;
      const radius = baseRadius * (1 - 0.28 * t);
      const centerX = leanX * t * t + Math.sin(t * Math.PI * 2) * 0.025 * t;
      const centerZ = leanZ * t * t + Math.cos(t * Math.PI * 2) * 0.025 * t;
      for (let side = 0; side < sides; side += 1) {
        const angle = side / sides * Math.PI * 2;
        positions.push(centerX + Math.cos(angle) * radius, height * t, centerZ + Math.sin(angle) * radius);
        uvs.push(side / sides, t * 2);
        if (ring < rings) {
          const current = ring * sides + side;
          const next = ring * sides + (side + 1) % sides;
          const upper = current + sides;
          const upperNext = next + sides;
          indices.push(current, upper, next, next, upper, upperNext);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  const makePalmFrondsGeometry = (height) => {
    const positions = [];
    const colors = [];
    const addTriangle = (a, b, c, color) => {
      for (const point of [a, b, c]) {
        positions.push(point[0], point[1], point[2]);
        colors.push(color.r, color.g, color.b);
      }
    };
    const colorPalette = [0x1f6448, 0x28754f, 0x328254, 0x438c58].map((color) => new THREE.Color(color));
    const crownY = height * 0.97;
    for (let frond = 0; frond < 9; frond += 1) {
      const angle = frond / 9 * Math.PI * 2 + random() * 0.16;
      const dirX = Math.sin(angle);
      const dirZ = Math.cos(angle);
      const sideX = dirZ;
      const sideZ = -dirX;
      const length = height * (0.39 + random() * 0.07);
      const droop = height * (0.19 + random() * 0.06);
      const lift = height * (0.035 + random() * 0.025);
      const center = (t) => [
        dirX * length * t,
        crownY + lift * Math.sin(Math.PI * t) - droop * t * t,
        dirZ * length * t,
      ];
      const color = colorPalette[Math.floor(random() * colorPalette.length)];
      const ribWidth = (t) => 0.052 * (1 - 0.58 * t);
      for (let segment = 0; segment < 24; segment += 1) {
        const t0 = segment / 24;
        const t1 = (segment + 1) / 24;
        const p0 = center(t0);
        const p1 = center(t1);
        const w0 = ribWidth(t0);
        const w1 = ribWidth(t1);
        const left0 = [p0[0] + sideX * w0, p0[1], p0[2] + sideZ * w0];
        const right0 = [p0[0] - sideX * w0, p0[1], p0[2] - sideZ * w0];
        const left1 = [p1[0] + sideX * w1, p1[1], p1[2] + sideZ * w1];
        const right1 = [p1[0] - sideX * w1, p1[1], p1[2] - sideZ * w1];
        addTriangle(left0, right0, left1, color);
        addTriangle(right0, right1, left1, color);
      }
      for (let leaflet = 0; leaflet < 16; leaflet += 1) {
        const t = 0.1 + leaflet * 0.047;
        const leafletLength = length * (0.14 + (1 - t) * 0.23);
        const root = center(t);
        const rootNext = center(Math.min(1, t + 0.035));
        for (const side of [-1, 1]) {
          const tipT = Math.min(1, t + 0.13);
          const tipCenter = center(tipT);
          const tip = [
            tipCenter[0] + sideX * side * leafletLength,
            tipCenter[1] - leafletLength * 0.18,
            tipCenter[2] + sideZ * side * leafletLength,
          ];
          addTriangle(root, rootNext, tip, color);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  };
  const addPalmTree = (parent, x, z, height = 8.2) => {
    const leanX = (random() - 0.5) * 0.45;
    const leanZ = (random() - 0.5) * 0.45;
    const trunk = new THREE.Mesh(makeCurvedTrunkGeometry(height, 0.31, leanX, leanZ), palmTrunk);
    trunk.position.set(x, 0, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    parent.add(trunk);
    const fronds = new THREE.Mesh(makePalmFrondsGeometry(height), palmFrondMat);
    fronds.position.set(x + leanX, 0, z + leanZ);
    fronds.castShadow = true;
    fronds.receiveShadow = true;
    parent.add(fronds);
  };
  const addCourtyardTree = (parent, x, z, height = 4.2) => {
    const trunkHeight = height * 0.72;
    const trunk = new THREE.Mesh(
      makeCurvedTrunkGeometry(trunkHeight, 0.2, (random() - 0.5) * 0.22, (random() - 0.5) * 0.22),
      palmTrunk,
    );
    trunk.position.set(x, 0, z);
    trunk.castShadow = true;
    parent.add(trunk);
    const crownY = height * 0.73;
    for (let clump = 0; clump < 7; clump += 1) {
      const angle = clump / 7 * Math.PI * 2 + random() * 0.35;
      const radius = clump === 0 ? 0 : 0.5 + random() * 0.3;
      const foliage = new THREE.Mesh(broadleafGeometry, canopyMats[clump % canopyMats.length]);
      foliage.position.set(x + Math.cos(angle) * radius, crownY + (random() - 0.5) * 0.55, z + Math.sin(angle) * radius);
      foliage.scale.set(0.88 + random() * 0.35, 0.72 + random() * 0.3, 0.88 + random() * 0.35);
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      parent.add(foliage);
    }
  };
  const addCourtyardBench = (parent, x, z, rotation = 0) => {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotation;
    parent.add(bench);
    addBox(bench, benchWoodMat, 0, 0.42, 0, 1.8, 0.14, 0.52);
    addBox(bench, benchWoodMat, 0, 0.58, -0.2, 1.8, 0.62, 0.12);
    for (const side of [-1, 1]) addBox(bench, shopFrameMat, side * 0.68, 0.08, 0, 0.12, 0.42, 0.4);
  };
  const addFountain = (parent, x, z, scale = 1) => {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.55 * scale, 1.9 * scale, 0.46, 12), sidewalkMat);
    basin.position.set(x, 0.18, z);
    basin.castShadow = true;
    parent.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.27 * scale, 1.27 * scale, 0.055, 16), fountainWaterMat);
    water.position.set(x, 0.43, z);
    parent.add(water);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.16 * scale, 0.7 * scale, 8), brassMat);
    jet.position.set(x, 0.78, z);
    parent.add(jet);
  };
  const addFencePerimeter = (x, z, halfWidth, halfDepth, gateSide = -1) => {
    const sectionLength = 2.6;
    const horizontalCount = Math.floor((halfWidth * 2) / sectionLength);
    const gateIndex = Math.floor(horizontalCount / 2);
    for (const sideZ of [-1, 1]) {
      for (let index = 0; index < horizontalCount; index += 1) {
        if (sideZ === gateSide && index === gateIndex) continue;
        const alongX = -halfWidth + sectionLength * (index + 0.5);
        fenceSegments.push({ x: x + alongX, z: z + sideZ * halfDepth, yaw: 0, length: sectionLength, active: true });
      }
    }
    const verticalCount = Math.floor((halfDepth * 2) / sectionLength);
    for (const sideX of [-1, 1]) {
      for (let index = 0; index < verticalCount; index += 1) {
        const alongZ = -halfDepth + sectionLength * (index + 0.5);
        fenceSegments.push({ x: x + sideX * halfWidth, z: z + alongZ, yaw: Math.PI / 2, length: sectionLength, active: true });
      }
    }
  };
  const ghettoWallMats = [0xbca47e, 0xc6a18c, 0x9cae9a, 0xd1c39e, 0xaeb7b4].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
  const ghettoRoofMats = [0x75483e, 0x8a5746, 0x545d5c, 0x9b704c].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  const ghettoTrimMat = new THREE.MeshStandardMaterial({ color: 0xe2d8c6, roughness: 0.84 });
  const ghettoWindowMat = new THREE.MeshStandardMaterial({ color: 0x426879, roughness: 0.28, metalness: 0.08 });
  const ghettoDoorMats = [0x59483b, 0x604344, 0x485247].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  const poolDeckMat = new THREE.MeshStandardMaterial({ color: 0xc8c0ae, roughness: 0.9 });
  const poolCopingMat = new THREE.MeshStandardMaterial({ color: 0xe5dfce, roughness: 0.76 });
  const poolTileMat = new THREE.MeshStandardMaterial({ color: 0x4d8f9b, roughness: 0.34, metalness: 0.08 });
  const poolWaterMat = new THREE.MeshStandardMaterial({ color: 0x38b9ca, roughness: 0.16, metalness: 0.22 });
  const addResidencePool = (parent, x, z) => {
    addGroundPlane(parent, poolDeckMat, x, z, 6.8, 8.0, -0.035);
    addBox(parent, poolTileMat, x, -0.18, z, 5.35, 0.3, 6.55);
    for (const side of [-1, 1]) {
      addBox(parent, poolCopingMat, x + side * 2.82, 0.08, z, 0.32, 0.22, 7.15);
      addBox(parent, poolCopingMat, x, 0.08, z + side * 3.42, 5.3, 0.22, 0.32);
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(4.95, 6.15), poolWaterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.13, z);
    water.receiveShadow = true;
    parent.add(water);
    buildingFootprints.push({ x, z, halfWidth: 2.7, halfDepth: 3.3 });
  };
  const addGhettoHouse = (parent, centerX, centerZ, slotX, slotZ) => {
    const width = 13 + random() * 3.5;
    const depth = 12 + random() * 3.5;
    const wallHeight = 4.25 + random() * 0.55;
    const roofRise = 1.45 + random() * 0.55;
    const x = centerX + slotX + (random() - 0.5) * 2;
    const z = centerZ + slotZ + (random() - 0.5) * 2;
    const frontSign = slotZ < 0 ? -1 : 1;
    const facade = ghettoWallMats[Math.floor(random() * ghettoWallMats.length)];
    const roof = ghettoRoofMats[Math.floor(random() * ghettoRoofMats.length)];
    const door = ghettoDoorMats[Math.floor(random() * ghettoDoorMats.length)];
    const hasGarage = random() > 0.48;
    const hasPool = random() < 0.26;
    const poolOffset = Math.sign(slotX || 1) * (width / 2 + 3.8);
    const requestedPoolX = x + poolOffset;
    const poolX = Math.abs(requestedPoolX) < CANAL_HALF_WIDTH + 3.5 ? x - poolOffset : requestedPoolX;
    addBox(parent, facade, x, -0.02, z, width, wallHeight, depth, true);
    buildingFootprints.push({ x, z, halfWidth: width / 2, halfDepth: depth / 2 });

    const eavesY = wallHeight - 0.02;
    const roofAngle = Math.atan2(roofRise, width / 2);
    const roofSlope = Math.hypot(width / 2, roofRise);
    for (const side of [-1, 1]) {
      const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(roofSlope, 0.16, depth + 0.42), roof);
      roofPanel.position.set(x + side * width / 4, eavesY + roofRise / 2, z);
      roofPanel.rotation.z = side < 0 ? roofAngle : -roofAngle;
      roofPanel.castShadow = true;
      roofPanel.receiveShadow = true;
      parent.add(roofPanel);
    }
    const gableGeometry = new THREE.BufferGeometry();
    gableGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -width / 2, eavesY, -depth / 2, width / 2, eavesY, -depth / 2, 0, eavesY + roofRise, -depth / 2,
      -width / 2, eavesY, depth / 2, 0, eavesY + roofRise, depth / 2, width / 2, eavesY, depth / 2,
    ], 3));
    gableGeometry.computeVertexNormals();
    const gables = new THREE.Mesh(gableGeometry, new THREE.MeshStandardMaterial({ color: facade.color, side: THREE.DoubleSide, roughness: 0.9 }));
    gables.position.set(x, 0, z);
    gables.castShadow = true;
    parent.add(gables);
    addBox(parent, roof, x, eavesY + roofRise - 0.12, z, 0.28, 0.2, depth + 0.55);
    addBox(parent, ghettoTrimMat, x, 3.72, z, width + 0.1, 0.11, depth + 0.1);

    const frontZ = z + frontSign * (depth / 2 + 0.05);
    const doorX = x + width * 0.31;
    addBox(parent, ghettoTrimMat, doorX, 0.02, frontZ, 1.62, 2.95, 0.2);
    addBox(parent, door, doorX, 0.07, frontZ + frontSign * 0.13, 1.3, 2.66, 0.1);
    addBox(parent, ghettoWindowMat, doorX, 1.48, frontZ + frontSign * 0.2, 0.82, 0.95, 0.035);
    const windowsX = hasGarage ? [x + width * 0.02] : [x - width * 0.28, x + width * 0.02];
    for (const windowX of windowsX) {
      addBox(parent, ghettoTrimMat, windowX, 1.55, frontZ, 2.2, 1.38, 0.16);
      addBox(parent, ghettoWindowMat, windowX, 1.68, frontZ + frontSign * 0.11, 1.86, 1.08, 0.04);
      for (const shutterSide of [-1, 1]) {
        addBox(parent, door, windowX + shutterSide * 1.2, 1.56, frontZ + frontSign * 0.13, 0.16, 1.44, 0.12);
      }
    }
    const porchZ = frontZ + frontSign * 1.1;
    addBox(parent, courtyardPathMat, doorX, 0.02, porchZ + frontSign * 1.25, 2.2, 0.16, 2.8);
    addBox(parent, roof, doorX, 3.25, porchZ, 3.8, 0.16, 2.2);
    for (const postSide of [-1, 1]) {
      addBox(parent, ghettoTrimMat, doorX + postSide * 1.65, 0.1, porchZ, 0.16, 3.08, 0.16);
    }
    if (hasGarage) {
      addBox(parent, door, x - width * 0.25, 0.06, frontZ + frontSign * 0.16, 3.1, 2.55, 0.08);
      for (let rib = 0; rib < 5; rib += 1) {
        addBox(parent, ghettoTrimMat, x - width * 0.25, 0.3 + rib * 0.42, frontZ + frontSign * 0.22, 2.85, 0.045, 0.035);
      }
    }
    const yardCenterZ = z + frontSign * 1.1;
    if (random() > 0.28) {
      if (hasPool) {
        const minX = Math.min(x - width / 2 - 1, poolX - 3.4);
        const maxX = Math.max(x + width / 2 + 1, poolX + 3.4);
        addFencePerimeter((minX + maxX) / 2, yardCenterZ, (maxX - minX) / 2, Math.max(depth / 2 + 2.6, 4.5), frontSign);
      } else {
        addFencePerimeter(x, yardCenterZ, width / 2 + 2.4, depth / 2 + 2.6, frontSign);
      }
    }
    if (hasPool) addResidencePool(parent, poolX, z);
    addGroundPlane(parent, courtyardPathMat, doorX, z + frontSign * (depth / 2 + 5.4), 2.3, 7.0, -0.032);
  };
  const addCourtyardAmenity = (parent, x, z, type) => {
    if (type === 'garden') {
      if (random() > 0.45) addFencePerimeter(x, z, 9.5, 9.5);
      addGroundPlane(parent, courtyardGrassMat, x, z, 18, 18, -0.048);
      addGroundPlane(parent, courtyardPathMat, x, z, 2.1, 18, -0.042);
      addGroundPlane(parent, courtyardPathMat, x, z, 18, 2.1, -0.041);
      for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        addBox(parent, planterMat, x + sideX * 6.3, -0.035, z + sideZ * 6.3, 3.0, 0.32, 3.0);
        addCourtyardTree(parent, x + sideX * 6.3, z + sideZ * 6.3, 4.2);
      }
      addFountain(parent, x, z, 0.72);
      addCourtyardBench(parent, x - 4.5, z, Math.PI / 2);
      addCourtyardBench(parent, x + 4.5, z, -Math.PI / 2);
      return;
    }
    if (type === 'playground') {
      addFencePerimeter(x, z, 9.5, 8.5);
      addGroundPlane(parent, playMat, x, z, 18, 16, -0.047);
      addGroundPlane(parent, playAccentMat, x - 5.2, z - 4.2, 3.6, 3.2, -0.038);
      addGroundPlane(parent, playBlueMat, x + 5.2, z + 4.2, 3.6, 3.2, -0.037);
      const towerX = x - 3.1;
      const towerZ = z - 1.6;
      for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        addBox(parent, playBlueMat, towerX + sideX * 1.1, 0.05, towerZ + sideZ * 1.1, 0.16, 1.8, 0.16);
      }
      addBox(parent, playAccentMat, towerX, 1.72, towerZ, 2.55, 0.22, 2.55);
      addBox(parent, playBlueMat, towerX, 2.72, towerZ, 2.95, 0.16, 2.95);
      const slide = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 3.2), playAccentMat);
      slide.position.set(towerX + 1.95, 1.0, towerZ + 1.45);
      slide.rotation.x = -0.34;
      slide.castShadow = true;
      parent.add(slide);
      for (let rung = 0; rung < 5; rung += 1) addBox(parent, shopFrameMat, towerX + 1.65, 0.32 + rung * 0.27, towerZ - 1.28, 0.95, 0.08, 0.08);
      const swingX = x + 4.2;
      const swingZ = z - 0.3;
      for (const side of [-1, 1]) {
        addBox(parent, playAccentMat, swingX + side * 2.0, 0.08, swingZ, 0.14, 2.75, 0.14);
        addBox(parent, playAccentMat, swingX + side * 1.25, 0.08, swingZ, 0.14, 2.75, 0.14);
      }
      addBox(parent, playBlueMat, swingX, 2.72, swingZ, 4.25, 0.16, 0.18);
      for (const seatX of [swingX - 0.85, swingX + 0.85]) {
        addBox(parent, shopFrameMat, seatX, 1.05, swingZ, 0.055, 1.55, 0.055);
        addBox(parent, shopFrameMat, seatX, 1.05, swingZ + 0.45, 0.055, 1.55, 0.055);
        addBox(parent, playAccentMat, seatX, 0.96, swingZ + 0.22, 0.72, 0.13, 0.58);
      }
      addCourtyardBench(parent, x, z + 6.1);
      return;
    }
    addGroundPlane(parent, courtyardPathMat, x, z, 17, 17, -0.046);
    addGroundPlane(parent, sidewalkMat, x, z, 7.4, 7.4, -0.038);
    addFountain(parent, x, z, 0.9);
    for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
      const planterX = x + sideX * 6.0;
      const planterZ = z + sideZ * 6.0;
      addBox(parent, planterMat, planterX, -0.025, planterZ, 2.8, 0.34, 2.8);
      addCourtyardTree(parent, planterX, planterZ, 3.8);
    }
    addCourtyardBench(parent, x - 5.2, z, Math.PI / 2);
    addCourtyardBench(parent, x + 5.2, z, -Math.PI / 2);
  };
  for (let bx = -3; bx < 3; bx += 1) for (let bz = -3; bz < 3; bz += 1) {
    const cx = (bx + 0.5) * BLOCK;
    const cz = (bz + 0.5) * BLOCK;
    const lot = new THREE.Group();
    scene.add(lot);
    const lotLeft = bx === 0 ? CANAL_HALF_WIDTH : cx - 38;
    const lotRight = bx === -1 ? -CANAL_HALF_WIDTH : cx + 38;
    const lotWidth = lotRight - lotLeft;
    const lotCenterX = (lotLeft + lotRight) / 2;
    const paving = new THREE.MeshStandardMaterial({ color: lotGrassPalette[Math.floor(random() * lotGrassPalette.length)], roughness: 0.92 });
    const hardstand = new THREE.Mesh(new THREE.PlaneGeometry(lotWidth, 76), paving);
    hardstand.rotation.x = -Math.PI / 2;
    hardstand.position.set(lotCenterX, -0.065, cz);
    hardstand.receiveShadow = true;
    lot.add(hardstand);
    lotRegions.push({ x: lotCenterX, z: cz, halfWidth: lotWidth / 2, halfDepth: 38 });
    const ghettoBlock = bx >= 0;
    const isPortDistrict = bx <= -2 && Math.abs(bz) <= 2;
    const isDowntownDistrict = !isPortDistrict && bx < 0 && Math.abs(bz) <= 1;
    const districtName = isPortDistrict ? 'port' : isDowntownDistrict ? 'downtown' : 'residential';
    const districtPalette = districtPalettes[districtName];
    const districtLight = districtLighting[districtName];
    const amenityRoll = random();
    const amenityType = amenityRoll < 0.32 ? 'garden' : amenityRoll < 0.63 ? 'playground' : 'plaza';
    addCourtyardAmenity(lot, cx, cz, amenityType);
    if (ghettoBlock) {
      for (const [slotX, slotZ] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) {
        const canalSideSlotX = bx === 0 && slotX < 0 ? -14 : slotX;
        addGhettoHouse(lot, cx, cz, canalSideSlotX, slotZ);
      }
    }
    // The western half keeps its denser art-deco blocks; the eastern half is low-rise residential.
    const alleyBlock = !ghettoBlock && Math.abs(bx * 7 + bz * 3) % 5 === 0;
    const cottageBlock = !ghettoBlock && !alleyBlock && Math.abs(bx * 3 + bz * 7) % 4 === 0;
    const count = ghettoBlock ? 0 : alleyBlock ? 2 : 2 + Math.floor(random() * 3);
    const buildingSlots = alleyBlock
      ? [[-16, -27], [16, -27], [-27, 27], [27, 27]]
      : [[-27, -27], [27, -27], [-27, 27], [27, 27]];
    const alleyBuildings = [];
    for (let i = 0; i < count; i += 1) {
      const [slotX, slotZ] = buildingSlots[i];
      const isAlleyBuilding = alleyBlock && i < 2;
      const isCottage = cottageBlock && i === count - 1;
      const width = isCottage ? 12 + random() * 4 : isAlleyBuilding ? 18 + random() * 4 : 20 + random() * 6;
      const depth = isCottage ? 14 + random() * 4 : isAlleyBuilding ? 20 + random() * 4 : 20 + random() * 6;
      const height = isCottage
        ? 6.2 + random() * 1.6
        : isPortDistrict ? 8 + random() * 12 : 10 + random() * (isDowntownDistrict ? 35 : 21);
      const canalSafeSlotX = bx === -1 && slotX > 20 ? slotX - 12 : slotX;
      const x = cx + canalSafeSlotX + (random() - 0.5) * 3;
      const z = cz + slotZ + (random() - 0.5) * 3;
      const frontSign = slotZ < 0 ? -1 : 1;
      const frontZ = z + frontSign * (depth / 2 + 0.1);
      const frontageRoll = random();
      const shopChance = isDowntownDistrict ? 0.58 : isPortDistrict ? 0.28 : 0.42;
      const hasShop = !isCottage && frontageRoll < shopChance;
      const hasGarage = !isCottage && !hasShop && frontageRoll < 0.61;
      const garageWidth = Math.min(6.4, width * 0.38);
      const garageCenterX = x - width * 0.18;
      const entryX = isCottage ? x : hasGarage ? x + width * 0.34 : x + width * 0.28;
      const color = districtPalette[Math.floor(random() * districtPalette.length)];
      const facade = new THREE.MeshStandardMaterial({ color, roughness: 0.83, metalness: 0.02 });
      const building = addBox(lot, facade, x, 0.1, z, width, height, depth, true);
      building.userData.cityBuilding = true;
      buildingFootprints.push({ x, z, halfWidth: width / 2, halfDepth: depth / 2 });
      if (isAlleyBuilding) alleyBuildings.push({ x, z, width, depth });
      // Roof parapet and stepped art-deco crown.
      const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.78), roughness: 0.88 });
      if (isCottage) {
        addBox(lot, capMat, x, height + 0.1, z, width + 0.6, 0.25, depth + 0.6);
        const roofColors = [0x9e5544, 0x705b4b, 0x536c6a, 0xb6764d];
        const cottageRoof = new THREE.Mesh(
          new THREE.ConeGeometry(1, 2.5, 4),
          new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(random() * roofColors.length)], roughness: 0.86 }),
        );
        cottageRoof.position.set(x, height + 1.35, z);
        cottageRoof.rotation.y = Math.PI / 4;
        cottageRoof.scale.set(width * 0.72, 1, depth * 0.72);
        cottageRoof.castShadow = true;
        lot.add(cottageRoof);
      } else {
        addBox(lot, capMat, x, height + 0.1, z, width + 0.7, 0.7, depth + 0.7);
      }
      if (!isCottage && height > 28) {
        addBox(lot, facade, x, height + 0.8, z, width * 0.54, 4.5, depth * 0.72, true);
      }
      // Tall window bands, a shopfront at street level, and selected lit windows.
      const floors = isCottage ? 2 : Math.max(2, Math.floor(height / 4.2));
      // Pilastres verticaux et balcons étagés : une silhouette Art déco moins cubique.
      for (const side of [-1, 1]) {
        addBox(lot, capMat, x + side * width * 0.45, 0.1, z + frontSign * (depth / 2 + 0.13), 0.34, height, 0.24);
      }
      const balconyLevels = isCottage ? 0 : Math.min(3, Math.floor((height - 8) / 12));
      for (let level = 0; level < balconyLevels; level += 1) {
        const balconyY = 4.3 + level * 8.2;
        addBox(lot, capMat, x, balconyY, z + frontSign * (depth / 2 + 0.34), width * 0.44, 0.16, 0.76);
        addBox(lot, capMat, x, balconyY + 0.62, z + frontSign * (depth / 2 + 0.68), width * 0.44, 0.08, 0.08);
      }
      for (let floor = 0; floor < floors; floor += 1) {
        const y = 1.8 + floor * (height / floors);
        const countWindows = Math.max(3, Math.floor(width / 3.3));
        for (let wi = 0; wi < countWindows; wi += 1) {
          const wx = x - width * 0.39 + wi * (width * 0.78 / Math.max(1, countWindows - 1));
          const lit = random() > 0.44;
          const front = [wx, y, z + frontSign * (depth / 2 + 0.065)];
          const sideZ = z - depth * 0.39 + wi * (depth * 0.78 / Math.max(1, countWindows - 1));
          const sides = [
            [x + width / 2 + 0.065, y, sideZ],
            [x - width / 2 - 0.065, y, sideZ],
          ];
          if (floor === 0) {
            const clearsGarage = !hasGarage || Math.abs(wx - garageCenterX) > garageWidth / 2 + 0.45;
            if (!hasShop && clearsGarage && Math.abs(wx - entryX) > 1.0) blueWindowPositions.push(front);
            blueSideWindowPositions.push(...sides);
          } else {
            (lit ? litWindowPositions : darkWindowPositions).push(front);
            (lit ? litSideWindowPositions : darkSideWindowPositions).push(...sides);
          }
        }
      }
      const signColor = districtLight.signs[Math.floor(random() * districtLight.signs.length)];
      const signMat = new THREE.MeshBasicMaterial({ color: signColor, toneMapped: false });
      if (hasShop) {
        const shopWidth = Math.min(13, width * 0.64);
        const doorWidth = 1.25;
        const gap = 0.18;
        const paneWidth = (shopWidth - doorWidth - gap * 2) / 2;
        const leftEdge = x - shopWidth / 2;
        const leftPaneX = leftEdge + paneWidth / 2;
        const doorX = leftEdge + paneWidth + gap + doorWidth / 2;
        const rightPaneX = doorX + doorWidth / 2 + gap + paneWidth / 2;
        const shopFrameZ = frontZ + frontSign * 0.06;
        const shopGlassZ = frontZ + frontSign * 0.2;
        addBox(lot, shopFrameMat, x, 0.12, shopFrameZ, shopWidth, 2.9, 0.22);
        addBox(lot, shopGlassMat, leftPaneX, 0.42, shopGlassZ, paneWidth - 0.1, 2.15, 0.05);
        addBox(lot, shopGlassMat, rightPaneX, 0.42, shopGlassZ, paneWidth - 0.1, 2.15, 0.05);
        addBox(lot, entryDoorMat, doorX, 0.14, shopGlassZ, doorWidth, 2.68, 0.1);
        addBox(lot, entryGlassMat, doorX, 1.35, shopGlassZ + frontSign * 0.06, 0.82, 1.2, 0.04);
        addBox(lot, brassMat, doorX + doorWidth * 0.31, 1.25, shopGlassZ + frontSign * 0.1, 0.055, 0.2, 0.06);
        addBox(lot, shopFrameMat, x, 3.08, frontZ + frontSign * 0.24, shopWidth + 0.36, 0.44, 0.42);
        addBox(lot, signMat, x, 3.13, frontZ + frontSign * 0.47, shopWidth, 0.28, 0.08);
        neonGlowSpecs.push({
          x, y: 3.13, z: frontZ + frontSign * 0.41, frontSign,
          width: shopWidth + 3.2, height: 3.8, color: signColor, intensity: districtLight.glow,
        });
        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(shopWidth + 0.7, 0.18, 1.3),
          awningMats[Math.floor(random() * awningMats.length)],
        );
        awning.position.set(x, 3.49, frontZ + frontSign * 0.68);
        awning.castShadow = true;
        awning.receiveShadow = true;
        lot.add(awning);
        addBox(lot, shopFrameMat, x, 3.22, frontZ + frontSign * 1.31, shopWidth + 0.7, 0.38, 0.12);
        for (const supportSide of [-1, 1]) {
          addBox(lot, shopFrameMat, x + supportSide * (shopWidth / 2 + 0.28), 2.78,
            frontZ + frontSign * 0.82, 0.08, 0.88, 0.08);
        }
        // Panneau perpendiculaire de boutique, visible depuis la rue croisée.
        addBox(lot, signMat, x + width / 2 + 0.24, 3.4, z + depth * 0.15, 0.34, 2.8, 1.2);
      } else {
        if (hasGarage) {
          const garageZ = frontZ + frontSign * 0.08;
          addBox(lot, shopFrameMat, garageCenterX, 0.12, garageZ, garageWidth + 0.34, 3.12, 0.24);
          addBox(lot, garageDoorMat, garageCenterX, 0.2, garageZ + frontSign * 0.15, garageWidth, 2.82, 0.08);
          for (let ribY = 0.48; ribY < 2.85; ribY += 0.34) {
            addBox(lot, shopFrameMat, garageCenterX, ribY, garageZ + frontSign * 0.21, garageWidth - 0.16, 0.035, 0.035);
          }
          addBox(lot, capMat, garageCenterX - garageWidth / 2 - 0.12, 0.12, garageZ + frontSign * 0.03, 0.14, 3.02, 0.22);
          addBox(lot, capMat, garageCenterX + garageWidth / 2 + 0.12, 0.12, garageZ + frontSign * 0.03, 0.14, 3.02, 0.22);
          addBox(lot, signMat, garageCenterX, 3.38, garageZ + frontSign * 0.2, 2.8, 0.28, 0.14);
        }
        // Entrée d'immeuble ou porte piétonne attenante au garage.
        const entryZ = frontZ + frontSign * 0.08;
        addBox(lot, shopFrameMat, entryX, 0.12, entryZ, 1.55, 2.98, 0.22);
        addBox(lot, entryDoorMat, entryX, 0.16, entryZ + frontSign * 0.14, 1.12, 2.62, 0.1);
        addBox(lot, entryGlassMat, entryX, 1.48, entryZ + frontSign * 0.2, 0.72, 0.92, 0.04);
        addBox(lot, brassMat, entryX + 0.34, 1.24, entryZ + frontSign * 0.25, 0.055, 0.2, 0.05);
        addBox(lot, capMat, entryX, 2.94, entryZ + frontSign * 0.34, 1.95, 0.18, 0.64);
        addBox(lot, signMat, entryX, 3.2, entryZ + frontSign * 0.19, 0.62, 0.28, 0.1);
        addBox(lot, capMat, entryX, 0.1, frontZ + frontSign * 0.48, 1.7, 0.16, 0.52);
      }
      if (isCottage) {
        const streetAxis = frontSign < 0 ? bz * BLOCK : (bz + 1) * BLOCK;
        const grassSidewalkEdge = streetAxis - frontSign * (ROAD_HALF + 3.2);
        const houseFront = z + frontSign * depth / 2;
        const yardDepth = Math.abs(houseFront - grassSidewalkEdge);
        if (yardDepth > 3) {
          const yardCenter = (houseFront + grassSidewalkEdge) / 2;
          addFencePerimeter(x, yardCenter, width / 2 + 1.2, Math.max(1.2, (yardDepth - 0.8) / 2), frontSign);
          addGroundPlane(lot, courtyardPathMat, entryX, yardCenter, 1.45, yardDepth, -0.043);
        }
      }
      // Back alley HVAC and rooftop water tank detail.
      if (random() > 0.45) addBox(lot, capMat, x + width * 0.25, height + 0.8, z, 2.8, 1.6, 2.8);
    }
    if (alleyBuildings.length === 2) {
      const [leftBuilding, rightBuilding] = [...alleyBuildings].sort((a, b) => a.x - b.x);
      const alleyStart = leftBuilding.x + leftBuilding.width / 2;
      const alleyEnd = rightBuilding.x - rightBuilding.width / 2;
      const alleyWidth = alleyEnd - alleyStart;
      if (alleyWidth > 2.5) {
        const alleyCenterZ = (leftBuilding.z + rightBuilding.z) / 2;
        const alleyDepth = Math.max(leftBuilding.depth, rightBuilding.depth) + 4;
        addGroundPlane(lot, courtyardPathMat, (alleyStart + alleyEnd) / 2, alleyCenterZ, alleyWidth, alleyDepth, -0.044);
      }
    }
    // Touffes de graminées discrètes : elles texturent les bandes vertes libres sans couvrir les façades.
    for (let tuft = 0; tuft < 24; tuft += 1) {
      const tuftX = cx + (random() - 0.5) * 72;
      const tuftZ = cz + (random() - 0.5) * 72;
      if (Math.abs(tuftX) < CANAL_HALF_WIDTH && Math.abs(tuftZ) > BRIDGE_HALF_WIDTH) continue;
      if (Math.hypot(tuftX - ROUNDABOUT_X, tuftZ - ROUNDABOUT_Z) < ROUNDABOUT_OUTER_RADIUS + 3) continue;
      if (Math.abs(tuftX - cx) < 11.5 && Math.abs(tuftZ - cz) < 11.5) continue;
      if (buildingFootprints.some((building) => Math.abs(tuftX - building.x) < building.halfWidth + 0.25
        && Math.abs(tuftZ - building.z) < building.halfDepth + 0.25)) continue;
      grassTuftPositions.push([tuftX, tuftZ, 0.72 + random() * 0.55]);
    }
    // Voitures garées en bord de rue : le quadrillage paraît habité et donne
    // une échelle plus crédible aux immeubles et aux chaussées.
    const horizontalParked = (bx - bz) % 3 === 0;
    const parkingSide = (bx + bz) % 4 < 2 ? -1 : 1;
    const parkingSegmentStart = horizontalParked ? bx * BLOCK : bz * BLOCK;
    for (const alongStreet of parkingStallCenters(parkingSegmentStart)) {
      const spot = horizontalParked
        ? { x: alongStreet, z: bz * BLOCK + parkingSide * 5.3, yaw: Math.PI / 2 }
        : { x: bx * BLOCK + parkingSide * 5.3, z: alongStreet, yaw: 0 };
      const modelIndex = Math.abs(bx * 5 + bz * 3 + parkedCarSpecs.length) % CITY_RUSH_TRAFFIC_TYPES.length;
      const parkedType = CITY_RUSH_TRAFFIC_TYPES[modelIndex];
      if (Math.abs(spot.x) < CANAL_HALF_WIDTH + 4 && Math.abs(spot.z) > BRIDGE_HALF_WIDTH) continue;
      if (Math.abs(spot.x) < BRIDGE_HALF_LENGTH + 4 && Math.abs(spot.z) < ROAD_HALF + 1) continue;
      parkedCarSpecs.push({ ...spot, type: parkedType.id, width: parkedType.width, length: parkedType.length });
    }
    // Palms and Deco lamp posts on block corners, kept out of the river and roundabout.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = cx + sx * 37;
      const pz = cz + sz * 37;
      const lampX = px + sx * 5;
      const lampZ = pz + sz * 5;
      const palmInWater = Math.abs(px) < CANAL_HALF_WIDTH && Math.abs(pz) > BRIDGE_HALF_WIDTH;
      const lampInWater = Math.abs(lampX) < CANAL_HALF_WIDTH && Math.abs(lampZ) > BRIDGE_HALF_WIDTH;
      const nearRoundabout = Math.hypot(px - ROUNDABOUT_X, pz - ROUNDABOUT_Z) < ROUNDABOUT_OUTER_RADIUS + 4;
      const lampNearRoundabout = Math.hypot(lampX - ROUNDABOUT_X, lampZ - ROUNDABOUT_Z) < ROUNDABOUT_OUTER_RADIUS + 4;
      if (!palmInWater && !nearRoundabout) addPalmTree(lot, px, pz, 8.2);
      if (!lampInWater && !lampNearRoundabout) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 6, 6), new THREE.MeshStandardMaterial({ color: 0x34383b, metalness: 0.7, roughness: 0.4 }));
        pole.position.set(lampX, 3, lampZ); lot.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd49a, toneMapped: false }));
        lamp.position.set(lampX, 6.1, lampZ); lot.add(lamp);
      }
    }
  }

  const roundaboutRoad = new THREE.Mesh(
    new THREE.CylinderGeometry(ROUNDABOUT_OUTER_RADIUS, ROUNDABOUT_OUTER_RADIUS, 0.16, 96),
    new THREE.MeshStandardMaterial({ color: 0x343432, roughness: 0.94 }),
  );
  roundaboutRoad.position.set(ROUNDABOUT_X, 0.03, ROUNDABOUT_Z);
  roundaboutRoad.receiveShadow = true;
  scene.add(roundaboutRoad);
  const outerRoundaboutLine = new THREE.Mesh(new THREE.RingGeometry(23.1, 23.35, 96), lineMat);
  outerRoundaboutLine.rotation.x = -Math.PI / 2;
  outerRoundaboutLine.position.set(ROUNDABOUT_X, 0.116, ROUNDABOUT_Z);
  scene.add(outerRoundaboutLine);
  const innerRoundaboutLine = new THREE.Mesh(new THREE.RingGeometry(10.8, 11.05, 96), lineMat);
  innerRoundaboutLine.rotation.x = -Math.PI / 2;
  innerRoundaboutLine.position.set(ROUNDABOUT_X, 0.116, ROUNDABOUT_Z);
  scene.add(innerRoundaboutLine);
  const islandCurbMat = new THREE.MeshStandardMaterial({ color: 0xd0c7b3, roughness: 0.86 });
  const islandCurb = new THREE.Mesh(new THREE.CylinderGeometry(10.55, 10.75, 0.42, 96), islandCurbMat);
  islandCurb.position.set(ROUNDABOUT_X, 0.31, ROUNDABOUT_Z);
  islandCurb.castShadow = true;
  islandCurb.receiveShadow = true;
  scene.add(islandCurb);
  const islandLawn = new THREE.Mesh(
    new THREE.CylinderGeometry(9.92, 9.92, 0.24, 96),
    new THREE.MeshStandardMaterial({ color: 0x55764b, roughness: 0.98 }),
  );
  islandLawn.position.set(ROUNDABOUT_X, 0.42, ROUNDABOUT_Z);
  islandLawn.receiveShadow = true;
  scene.add(islandLawn);

  const statueStoneMat = new THREE.MeshStandardMaterial({ color: 0xc7b99d, roughness: 0.82 });
  const statueBronzeMat = new THREE.MeshStandardMaterial({ color: 0x9a6338, roughness: 0.29, metalness: 0.72 });
  const statueDarkBronzeMat = new THREE.MeshStandardMaterial({ color: 0x50392b, roughness: 0.4, metalness: 0.62 });
  const statueGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4a34e, roughness: 0.25, metalness: 0.78 });
  const statueSaddleMat = new THREE.MeshStandardMaterial({ color: 0x762f28, roughness: 0.56, metalness: 0.22 });
  const statueClothMat = new THREE.MeshStandardMaterial({ color: 0x632b24, roughness: 0.72, metalness: 0.12, side: THREE.DoubleSide });
  const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.45, 0.62, 32), statueStoneMat);
  statueBase.position.set(ROUNDABOUT_X, 0.76, ROUNDABOUT_Z);
  statueBase.castShadow = true;
  statueBase.receiveShadow = true;
  scene.add(statueBase);
  const statuePedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 3.35, 4.45, 32), statueStoneMat);
  statuePedestal.position.set(ROUNDABOUT_X, 3.295, ROUNDABOUT_Z);
  statuePedestal.castShadow = true;
  statuePedestal.receiveShadow = true;
  scene.add(statuePedestal);
  const statueCap = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.48, 32), statueStoneMat);
  statueCap.position.set(ROUNDABOUT_X, 5.76, ROUNDABOUT_Z);
  statueCap.castShadow = true;
  statueCap.receiveShadow = true;
  scene.add(statueCap);
  addBox(scene, statueGoldMat, ROUNDABOUT_X, 2.05, ROUNDABOUT_Z - 3.04, 2.15, 1.16, 0.16, true);
  addBox(scene, statueDarkBronzeMat, ROUNDABOUT_X, 2.19, ROUNDABOUT_Z - 3.14, 1.65, 0.56, 0.04, true);

  const addStatueLimb = (start, end, radius, material = statueBronzeMat, topScale = 0.82) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * topScale, radius, direction.length(), 16), material);
    limb.position.copy(start).add(end).multiplyScalar(0.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    limb.castShadow = true;
    limb.receiveShadow = true;
    scene.add(limb);
    return limb;
  };
  const addStatueForm = (position, scale, material, rotationZ = 0, segments = 24) => {
    const form = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(12, Math.floor(segments * 0.7))), material);
    form.position.set(ROUNDABOUT_X + position[0], position[1], ROUNDABOUT_Z + position[2]);
    form.scale.set(scale[0], scale[1], scale[2]);
    form.rotation.z = rotationZ;
    form.castShadow = true;
    form.receiveShadow = true;
    scene.add(form);
    return form;
  };
  const statuePoint = (x, y, z) => new THREE.Vector3(ROUNDABOUT_X + x, y, ROUNDABOUT_Z + z);

  // Bronze equestrian monument: rearing warhorse, articulated tack, armored rider and raised sword.
  addStatueForm([-0.25, 7.62, 0], [1.95, 0.88, 0.73], statueBronzeMat, 0.18);
  addStatueForm([-1.2, 7.48, 0], [0.9, 0.9, 0.76], statueBronzeMat, -0.08);
  addStatueForm([0.88, 8.02, 0], [0.94, 1.08, 0.79], statueBronzeMat, 0.19);
  addStatueForm([1.62, 8.91, 0], [0.58, 1.0, 0.62], statueBronzeMat, -0.45);
  addStatueForm([2.12, 9.78, 0], [0.47, 0.69, 0.46], statueBronzeMat, -0.18);
  addStatueForm([2.47, 9.47, 0], [0.43, 0.31, 0.39], statueBronzeMat, -0.12);
  // Muzzle, nostrils, eyes and ears make the horse readable from street level.
  for (const side of [-1, 1]) {
    addStatueForm([2.63, 9.52, side * 0.23], [0.075, 0.09, 0.055], statueDarkBronzeMat);
    addStatueForm([2.2, 9.96, side * 0.405], [0.09, 0.105, 0.07], statueGoldMat);
    addStatueLimb(statuePoint(1.98, 10.24, side * 0.22), statuePoint(2.02, 10.63, side * 0.25), 0.13, statueBronzeMat, 0.48);
    // Hind legs brace the rearing horse on the plinth; forelegs curl upward in motion.
    addStatueLimb(statuePoint(-1.45, 7.35, side * 0.48), statuePoint(-1.65, 6.76, side * 0.53), 0.28, statueBronzeMat, 0.76);
    addStatueForm([-1.65, 6.72, side * 0.53], [0.3, 0.29, 0.28], statueBronzeMat);
    addStatueLimb(statuePoint(-1.65, 6.68, side * 0.53), statuePoint(-1.45, 6.13, side * 0.56), 0.19, statueBronzeMat, 0.82);
    addStatueForm([-1.43, 6.11, side * 0.56], [0.29, 0.15, 0.22], statueDarkBronzeMat, 0.04);
  }
  addStatueLimb(statuePoint(1.15, 8.52, -0.52), statuePoint(1.66, 8.95, -0.55), 0.25, statueBronzeMat, 0.85);
  addStatueForm([1.67, 8.95, -0.55], [0.25, 0.25, 0.24], statueBronzeMat);
  addStatueLimb(statuePoint(1.67, 8.95, -0.55), statuePoint(1.95, 8.26, -0.55), 0.18, statueBronzeMat, 0.78);
  addStatueForm([1.97, 8.21, -0.55], [0.3, 0.16, 0.24], statueDarkBronzeMat, 0.18);
  addStatueLimb(statuePoint(1.24, 8.59, 0.52), statuePoint(1.91, 9.01, 0.55), 0.24, statueBronzeMat, 0.83);
  addStatueForm([1.91, 9.01, 0.55], [0.24, 0.24, 0.23], statueBronzeMat);
  addStatueLimb(statuePoint(1.91, 9.01, 0.55), statuePoint(2.34, 8.45, 0.55), 0.17, statueBronzeMat, 0.78);
  addStatueForm([2.34, 8.42, 0.55], [0.28, 0.15, 0.23], statueDarkBronzeMat, -0.18);
  // Swept mane, tail, saddle and breastplate detailing.
  for (let strand = 0; strand < 5; strand += 1) {
    const x = 0.95 + strand * 0.22;
    const y = 8.72 + strand * 0.22;
    addStatueLimb(statuePoint(x, y, -0.12), statuePoint(x - 0.34, y - 0.2, -0.12), 0.16, statueDarkBronzeMat, 0.55);
  }
  addStatueLimb(statuePoint(-1.85, 7.92, 0), statuePoint(-2.62, 8.42, 0), 0.2, statueDarkBronzeMat, 0.68);
  addStatueLimb(statuePoint(-2.62, 8.42, 0), statuePoint(-2.97, 8.91, 0), 0.14, statueDarkBronzeMat, 0.48);
  addStatueForm([-0.22, 8.42, 0], [0.9, 0.22, 0.82], statueSaddleMat, 0.12);
  addStatueForm([0.92, 7.93, -0.02], [0.45, 0.64, 0.78], statueGoldMat, 0.18);
  addStatueLimb(statuePoint(0.75, 8.92, -0.7), statuePoint(2.2, 9.94, -0.29), 0.055, statueGoldMat, 0.9);
  addStatueLimb(statuePoint(0.72, 8.92, 0.7), statuePoint(2.2, 9.94, 0.29), 0.055, statueGoldMat, 0.9);

  // Seated warrior, layered cuirass, greaves, helmet, shield and raised sword.
  addStatueForm([0.0, 9.38, 0], [0.53, 0.78, 0.5], statueDarkBronzeMat, -0.08);
  addStatueForm([0.0, 9.48, 0], [0.47, 0.66, 0.52], statueBronzeMat, -0.08);
  addStatueForm([0.0, 9.0, 0], [0.54, 0.14, 0.54], statueGoldMat);
  for (const side of [-1, 1]) {
    addStatueLimb(statuePoint(-0.12, 9.0, side * 0.42), statuePoint(0.74, 8.55, side * 0.64), 0.31, statueBronzeMat, 0.85);
    addStatueForm([0.76, 8.54, side * 0.64], [0.25, 0.28, 0.25], statueBronzeMat);
    addStatueLimb(statuePoint(0.76, 8.54, side * 0.64), statuePoint(0.92, 7.72, side * 0.65), 0.21, statueDarkBronzeMat, 0.76);
    addStatueForm([0.98, 7.69, side * 0.65], [0.3, 0.16, 0.23], statueGoldMat, 0.08);
  }
  addStatueForm([0.0, 10.28, 0], [0.34, 0.42, 0.33], statueBronzeMat);
  addStatueForm([0.03, 10.76, 0], [0.39, 0.43, 0.37], statueDarkBronzeMat, 0.03);
  addStatueForm([0.04, 10.91, 0], [0.43, 0.32, 0.4], statueGoldMat, 0.03);
  addStatueLimb(statuePoint(-0.3, 10.02, -0.34), statuePoint(-0.58, 9.66, -0.63), 0.13, statueBronzeMat, 0.76);
  addStatueForm([-0.58, 9.66, -0.63], [0.19, 0.19, 0.18], statueBronzeMat);
  addStatueLimb(statuePoint(-0.58, 9.66, -0.63), statuePoint(-0.73, 9.85, -0.86), 0.1, statueBronzeMat, 0.74);
  addStatueForm([-0.73, 9.85, -0.86], [0.15, 0.16, 0.13], statueGoldMat);
  addStatueLimb(statuePoint(0.3, 10.83, 0.18), statuePoint(0.62, 11.37, 0.15), 0.13, statueBronzeMat, 0.78);
  addStatueLimb(statuePoint(0.62, 11.37, 0.15), statuePoint(0.91, 11.2, 0.12), 0.1, statueBronzeMat, 0.74);
  addStatueForm([0.94, 11.2, 0.12], [0.16, 0.17, 0.16], statueGoldMat);
  // Raised blade and crossguard.
  const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.095), statueGoldMat);
  swordBlade.position.set(ROUNDABOUT_X + 1.03, 12.56, ROUNDABOUT_Z + 0.12);
  swordBlade.rotation.z = -0.18;
  swordBlade.castShadow = true;
  scene.add(swordBlade);
  addStatueLimb(statuePoint(0.88, 11.28, 0.12), statuePoint(1.0, 11.55, 0.12), 0.09, statueDarkBronzeMat, 1.0);
  const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.16), statueGoldMat);
  swordGuard.position.set(ROUNDABOUT_X + 0.95, 11.44, ROUNDABOUT_Z + 0.12);
  swordGuard.rotation.z = -0.18;
  swordGuard.castShadow = true;
  scene.add(swordGuard);
  const swordFuller = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.85, 0.018), statueDarkBronzeMat);
  swordFuller.position.set(ROUNDABOUT_X + 1.03, 12.62, ROUNDABOUT_Z + 0.174);
  swordFuller.rotation.z = -0.18;
  scene.add(swordFuller);
  addStatueForm([1.0, 11.23, 0.12], [0.13, 0.13, 0.13], statueGoldMat);
  // Round shield with a raised boss on the warrior's left side.
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.18, 12), statueGoldMat);
  shield.position.set(ROUNDABOUT_X - 0.62, 9.76, ROUNDABOUT_Z - 0.77);
  shield.rotation.x = Math.PI / 2;
  shield.castShadow = true;
  scene.add(shield);
  addStatueForm([-0.62, 9.76, -0.9], [0.19, 0.19, 0.12], statueDarkBronzeMat);
  addStatueLimb(statuePoint(-0.62, 9.38, -0.81), statuePoint(-0.62, 10.14, -0.81), 0.055, statueDarkBronzeMat, 1.0);

  // Fine relief work: horse bridle and reins, saddle straps, armor plates and monument trim.
  for (const side of [-1, 1]) {
    addStatueLimb(statuePoint(1.9, 10.1, side * 0.34), statuePoint(2.47, 9.48, side * 0.32), 0.055, statueGoldMat, 0.92);
    addStatueLimb(statuePoint(2.31, 9.82, side * 0.4), statuePoint(2.53, 9.78, side * 0.32), 0.045, statueGoldMat, 1.0);
    addStatueLimb(statuePoint(2.38, 9.63, -0.34), statuePoint(2.38, 9.63, 0.34), 0.06, statueGoldMat, 1.0);
    addStatueLimb(statuePoint(1.98, 10.27, side * 0.22), statuePoint(2.06, 10.27, side * 0.22), 0.045, statueDarkBronzeMat, 1.0);
    addStatueLimb(statuePoint(-0.68, 8.62, side * 0.69), statuePoint(-0.62, 8.05, side * 0.77), 0.075, statueGoldMat, 0.9);
    addStatueForm([-0.62, 8.04, side * 0.77], [0.12, 0.15, 0.1], statueGoldMat);
    // Stirrups and their hanging leathers.
    addStatueLimb(statuePoint(0.48, 8.72, side * 0.71), statuePoint(0.48, 8.02, side * 0.79), 0.055, statueGoldMat, 1.0);
    addStatueLimb(statuePoint(0.21, 7.98, side * 0.79), statuePoint(0.72, 7.98, side * 0.79), 0.055, statueGoldMat, 1.0);
    addStatueLimb(statuePoint(0.21, 7.98, side * 0.79), statuePoint(0.21, 8.2, side * 0.79), 0.05, statueGoldMat, 1.0);
    addStatueLimb(statuePoint(0.72, 7.98, side * 0.79), statuePoint(0.72, 8.2, side * 0.79), 0.05, statueGoldMat, 1.0);
  }
  // Breast collar, belly girth and a line of raised mane locks.
  addStatueLimb(statuePoint(0.64, 8.54, -0.69), statuePoint(1.27, 7.74, -0.69), 0.085, statueGoldMat, 0.9);
  addStatueLimb(statuePoint(0.64, 8.54, 0.69), statuePoint(1.27, 7.74, 0.69), 0.085, statueGoldMat, 0.9);
  addStatueLimb(statuePoint(-0.76, 7.02, -0.63), statuePoint(-0.76, 7.02, 0.63), 0.075, statueGoldMat, 1.0);
  for (let lock = 0; lock < 4; lock += 1) {
    const x = 0.7 + lock * 0.24;
    addStatueLimb(statuePoint(x, 9.02 + lock * 0.18, 0.22), statuePoint(x - 0.25, 8.68 + lock * 0.18, 0.22), 0.12, statueDarkBronzeMat, 0.48);
  }
  // Layered chest armor, shoulder guards, forearm bracers, belt and a trailing cloak.
  addStatueForm([0.01, 9.67, -0.48], [0.35, 0.43, 0.12], statueGoldMat, -0.08);
  addStatueForm([0.01, 9.67, -0.59], [0.24, 0.3, 0.045], statueBronzeMat, -0.08);
  for (const side of [-1, 1]) {
    addStatueForm([side * 0.38, 10.03, side * 0.34], [0.3, 0.24, 0.28], statueGoldMat, side * -0.14);
    addStatueForm([side * 0.38, 10.03, side * 0.42], [0.22, 0.16, 0.2], statueBronzeMat, side * -0.14);
    addStatueForm([side * 0.37, 9.45, -0.53], [0.16, 0.13, 0.055], statueGoldMat);
  }
  addStatueLimb(statuePoint(-0.28, 9.27, -0.45), statuePoint(0.28, 9.27, -0.45), 0.065, statueGoldMat, 1.0);
  addStatueForm([0, 9.27, -0.53], [0.12, 0.15, 0.06], statueGoldMat);
  for (const side of [-1, 1]) {
    for (const y of [9.5, 9.72, 9.92]) {
      addStatueForm([side * 0.2, y, -0.61], [0.035, 0.035, 0.025], statueGoldMat, 0, 12);
    }
    addStatueForm([side * 0.28, 8.91, -0.45], [0.19, 0.18, 0.13], statueGoldMat, side * 0.18);
    addStatueForm([side * 0.28, 8.91, 0.45], [0.19, 0.18, 0.13], statueGoldMat, side * 0.18);
  }
  addStatueLimb(statuePoint(0.55, 10.02, 0.48), statuePoint(0.67, 9.61, 0.58), 0.17, statueGoldMat, 0.84);
  addStatueLimb(statuePoint(0.75, 11.24, 0.12), statuePoint(1.02, 11.17, 0.12), 0.13, statueGoldMat, 1.0);
  addStatueForm([-0.55, 9.5, 0.5], [0.75, 0.95, 0.14], statueClothMat, -0.25);
  addStatueForm([-1.05, 8.94, 0.5], [0.57, 0.44, 0.12], statueClothMat, -0.43);
  // Helmet brow, cheek guards and crest; the narrow dark opening reads as a visor.
  addStatueLimb(statuePoint(-0.31, 10.83, -0.28), statuePoint(0.38, 10.83, -0.28), 0.055, statueGoldMat, 1.0);
  addStatueLimb(statuePoint(-0.25, 10.7, -0.31), statuePoint(0.29, 10.7, -0.31), 0.035, statueDarkBronzeMat, 1.0);
  addStatueLimb(statuePoint(-0.3, 10.68, -0.22), statuePoint(-0.22, 10.36, -0.24), 0.12, statueGoldMat, 0.72);
  addStatueLimb(statuePoint(0.3, 10.68, -0.22), statuePoint(0.22, 10.36, -0.24), 0.12, statueGoldMat, 0.72);
  addStatueLimb(statuePoint(-0.08, 11.15, 0), statuePoint(-0.47, 11.58, 0.04), 0.17, statueClothMat, 0.48);
  addStatueLimb(statuePoint(-0.47, 11.58, 0.04), statuePoint(-0.96, 11.68, 0.08), 0.1, statueGoldMat, 0.25);
  // Shield boss and raised heraldic cross on the face toward the street.
  addStatueForm([-0.62, 9.76, -1.01], [0.15, 0.15, 0.09], statueGoldMat);
  addStatueLimb(statuePoint(-0.62, 9.48, -0.99), statuePoint(-0.62, 10.04, -0.99), 0.045, statueDarkBronzeMat, 1.0);
  addStatueLimb(statuePoint(-0.88, 9.76, -0.99), statuePoint(-0.36, 9.76, -0.99), 0.045, statueDarkBronzeMat, 1.0);
  // Gold courses and carved plaques break up the tall stone pedestal.
  for (const [y, radius] of [[1.25, 3.17], [1.55, 3.1], [4.95, 2.75], [5.4, 2.7]]) {
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.04, 0.09, 32), statueGoldMat);
    trim.position.set(ROUNDABOUT_X, y, ROUNDABOUT_Z);
    trim.castShadow = true;
    scene.add(trim);
  }
  for (const side of [-1, 1]) {
    addBox(scene, statueGoldMat, ROUNDABOUT_X + side * 0.8, 3.3, ROUNDABOUT_Z - 2.78, 0.085, 1.3, 0.08, true);
    addBox(scene, statueGoldMat, ROUNDABOUT_X, 3.91, ROUNDABOUT_Z - 2.83, 1.15, 0.07, 0.08, true);
  }

  const roundaboutIsland = {
    x: ROUNDABOUT_X,
    z: ROUNDABOUT_Z,
    radius: ROUNDABOUT_ISLAND_RADIUS,
    collisionRadius: ROUNDABOUT_ISLAND_RADIUS + 1.8,
  };

  // Herbe stylisée instanciée : beaucoup de petites touffes pour casser l'aspect plat des pelouses.
  if (grassTuftPositions.length) {
    const grassBlades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.075, 0.4, 4), grassBladeMat, grassTuftPositions.length * 3);
    const bladeColors = [0x799750, 0xa1b75f, 0x658b48];
    grassTuftPositions.forEach(([x, z, scale], tuftIndex) => {
      for (let blade = 0; blade < 3; blade += 1) {
        const offsets = [[0, 0], [0.07, 0.025], [-0.045, 0.065]];
        marker.position.set(x + offsets[blade][0] * scale, 0.135, z + offsets[blade][1] * scale);
        marker.rotation.set(blade === 1 ? 0.12 : 0, blade * 1.9, blade === 2 ? -0.1 : 0);
        marker.scale.set(scale, scale, scale);
        marker.updateMatrix();
        const instance = tuftIndex * 3 + blade;
        grassBlades.setMatrixAt(instance, marker.matrix);
        grassBlades.setColorAt(instance, new THREE.Color(bladeColors[blade]));
      }
    });
    grassBlades.instanceMatrix.needsUpdate = true;
    if (grassBlades.instanceColor) grassBlades.instanceColor.needsUpdate = true;
    grassBlades.castShadow = true;
    scene.add(grassBlades);
  }

  // Grillages galvanisés en sections indépendantes qui peuvent tomber au choc.
  let fenceMeshes = null;
  if (fenceSegments.length) {
    const sectionLength = 2.6;
    const panels = new THREE.InstancedMesh(new THREE.PlaneGeometry(sectionLength - 0.08, 1.2), chainMaterial, fenceSegments.length);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 1.3, 0.09), fenceMetalMat, fenceSegments.length * 2);
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(sectionLength, 0.07, 0.08), fenceMetalMat, fenceSegments.length * 2);
    fenceSegments.forEach((segment, index) => {
      marker.rotation.set(0, segment.yaw, 0);
      marker.scale.set(1, 1, 1);
      marker.position.set(segment.x, 0.535, segment.z);
      marker.updateMatrix();
      panels.setMatrixAt(index, marker.matrix);
      const alongX = Math.cos(segment.yaw) * sectionLength / 2;
      const alongZ = -Math.sin(segment.yaw) * sectionLength / 2;
      for (const end of [-1, 1]) {
        const postIndex = index * 2 + (end > 0 ? 1 : 0);
        marker.position.set(segment.x + alongX * end, 0.585, segment.z + alongZ * end);
        marker.updateMatrix();
        posts.setMatrixAt(postIndex, marker.matrix);
      }
      for (const [rail, y] of [[0, 0.02], [1, 1.16]]) {
        const railIndex = index * 2 + rail;
        marker.position.set(segment.x, y, segment.z);
        marker.updateMatrix();
        rails.setMatrixAt(railIndex, marker.matrix);
      }
      segment.instances = { panel: index, posts: [index * 2, index * 2 + 1], rails: [index * 2, index * 2 + 1] };
    });
    for (const mesh of [panels, posts, rails]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    fenceMeshes = { panels, posts, rails };
  }
  // Voitures stationnées : on réutilise les modèles dédiés du trafic du jeu
  // (taxi, police, ambulance, camion-poubelle et sportive), gyrophares éteints.
  for (const spec of parkedCarSpecs) {
    const car = makeTrafficVehicle(spec.type);
    car.position.set(spec.x, roadElevation(spec.x, spec.z), spec.z);
    car.rotation.y = spec.yaw;
    car.userData.beacons?.forEach((beacon) => { beacon.material.opacity = 0; });
    scene.add(car);
    parkedCarBodies.push({
      spec, mesh: car, velocityX: 0, velocityZ: 0, angularVelocity: 0, touchingPlayer: false,
      radius: Math.hypot(spec.width / 2, spec.length / 2),
      mass: spec.type === 'garbage-truck' ? 1.9 : spec.type === 'ambulance' ? 1.35 : spec.type === 'police' ? 1.15 : 1,
    });
  }
  const carRoot = new THREE.Object3D();
  const carPart = new THREE.Object3D();
  const carMatrix = new THREE.Matrix4();

  const signalPoleMat = new THREE.MeshStandardMaterial({ color: 0x343a3c, roughness: 0.58, metalness: 0.64 });
  const signalHousingMat = new THREE.MeshStandardMaterial({ color: 0x171c20, roughness: 0.78, metalness: 0.12 });
  const signalLensMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const signalGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  });
  for (let ix = -3; ix <= 3; ix += 1) for (let iz = -3; iz <= 3; iz += 1) {
    const intersection = { ix, iz, signals: [], lastX: null, lastZ: null };
    const x = ix * BLOCK;
    const z = iz * BLOCK;
    const isBridgeApproachIntersection = iz === 0 && Math.abs(x) <= BRIDGE_HALF_LENGTH + 8;
    const isRoundaboutIntersection = ix === 2 && iz === 2;
    const isRiverEdgeIntersection = ix === 0 && iz !== 0;
    const approaches = [
      { axis: 'x', x: x - 8.5, z: z + 8.5, yaw: -Math.PI / 2 },
      { axis: 'x', x: x + 8.5, z: z - 8.5, yaw: Math.PI / 2 },
      { axis: 'z', x: x - 8.5, z: z - 8.5, yaw: Math.PI },
      { axis: 'z', x: x + 8.5, z: z + 8.5, yaw: 0 },
    ].filter((approach) => !isBridgeApproachIntersection && !isRoundaboutIntersection && !isRiverEdgeIntersection
      && (ix !== 0 || approach.axis === 'x'));
    for (const originalApproach of approaches) {
      const approach = ix === 0
        ? { ...originalApproach, x: Math.sign(originalApproach.x) * (CANAL_HALF_WIDTH + 1.7) }
        : originalApproach;
      const lightIndex = trafficSignalSpecs.length;
      const spec = { ...approach, ix, iz, lensIndices: { red: lightIndex * 3, yellow: lightIndex * 3 + 1, green: lightIndex * 3 + 2 } };
      trafficSignalSpecs.push(spec);
      intersection.signals.push(spec);
    }
    // Les portiques prennent appui sur des poteaux plantés dans le trottoir,
    // côté bordure, jamais sur une façade ou un mur de bâtiment.
    const mastSideOffset = ROAD_HALF + 1.2;
    const overheadApproaches = [
      { axis: 'x', x: x - 18, z: z + 2.35, yaw: -Math.PI / 2, supportX: x - 18, supportZ: z + mastSideOffset },
      { axis: 'x', x: x + 18, z: z - 2.35, yaw: Math.PI / 2, supportX: x + 18, supportZ: z - mastSideOffset },
      { axis: 'z', x: x - 2.35, z: z - 18, yaw: Math.PI, supportX: x - mastSideOffset, supportZ: z - 18 },
      { axis: 'z', x: x + 2.35, z: z + 18, yaw: 0, supportX: x + mastSideOffset, supportZ: z + 18 },
    ].filter((approach) => !isBridgeApproachIntersection && !isRoundaboutIntersection && !isRiverEdgeIntersection
      && (ix !== 0 || (iz === 0 && approach.axis === 'x')));
    for (const approach of overheadApproaches) {
      const lightIndex = trafficSignalSpecs.length + overheadTrafficSignalSpecs.length;
      const spec = { ...approach, ix, iz, lensIndices: { red: lightIndex * 3, yellow: lightIndex * 3 + 1, green: lightIndex * 3 + 2 } };
      overheadTrafficSignalSpecs.push(spec);
      intersection.signals.push(spec);
    }
    trafficIntersections.push(intersection);
  }
  const trafficSignalPoles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.095, 0.13, 4.55, 8), signalPoleMat, trafficSignalSpecs.length,
  );
  const trafficSignalHousings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.56, 1.5, 0.42), signalHousingMat, trafficSignalSpecs.length,
  );
  const overheadSignalPoles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.15, 6.6, 8), signalPoleMat, overheadTrafficSignalSpecs.length,
  );
  const overheadSignalArms = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.16, 0.16), signalPoleMat, overheadTrafficSignalSpecs.length,
  );
  const overheadSignalHousings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.68, 1.5, 0.48), signalHousingMat, overheadTrafficSignalSpecs.length,
  );
  const totalSignalHeads = trafficSignalSpecs.length + overheadTrafficSignalSpecs.length;
  const trafficSignalLenses = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.16, 12, 10), signalLensMat, totalSignalHeads * 3,
  );
  const trafficSignalGlows = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.29, 12, 10), signalGlowMat, totalSignalHeads * 3,
  );
  const setTrafficLightInstance = (mesh, index, spec, localPosition = [0, 0, 0]) => {
    carRoot.position.set(spec.x, roadElevation(spec.x, spec.z), spec.z);
    carRoot.rotation.set(0, spec.yaw, 0);
    carRoot.updateMatrix();
    carPart.position.set(...localPosition);
    carPart.rotation.set(0, 0, 0);
    carPart.scale.set(1, 1, 1);
    carPart.updateMatrix();
    carMatrix.multiplyMatrices(carRoot.matrix, carPart.matrix);
    mesh.setMatrixAt(index, carMatrix);
  };
  trafficSignalSpecs.forEach((spec, index) => {
    setTrafficLightInstance(trafficSignalPoles, index, spec, [0, 2.275, 0]);
    setTrafficLightInstance(trafficSignalHousings, index, spec, [0, 4.05, 0]);
    for (const [colorIndex, y] of [[0, 4.48], [1, 4.05], [2, 3.62]]) {
      const lensIndex = index * 3 + colorIndex;
      setTrafficLightInstance(trafficSignalLenses, lensIndex, spec, [0, y, 0.245]);
      setTrafficLightInstance(trafficSignalGlows, lensIndex, spec, [0, y, 0.17]);
    }
  });
  overheadTrafficSignalSpecs.forEach((spec, index) => {
    marker.position.set(spec.supportX, roadElevation(spec.supportX, spec.supportZ) + 3.3, spec.supportZ);
    marker.rotation.set(0, 0, 0);
    marker.scale.set(1, 1, 1);
    marker.updateMatrix();
    overheadSignalPoles.setMatrixAt(index, marker.matrix);
    const armDx = spec.x - spec.supportX;
    const armDz = spec.z - spec.supportZ;
    const armLength = Math.hypot(armDx, armDz) + 0.4;
    marker.position.set((spec.x + spec.supportX) / 2, roadElevation(spec.x, spec.z) + 6.48, (spec.z + spec.supportZ) / 2);
    marker.rotation.set(0, Math.atan2(-armDz, armDx), 0);
    marker.scale.set(armLength, 1, 1);
    marker.updateMatrix();
    overheadSignalArms.setMatrixAt(index, marker.matrix);
    setTrafficLightInstance(overheadSignalHousings, index, spec, [0, 5.78, 0]);
    for (const [colorIndex, y] of [[0, 6.2], [1, 5.78], [2, 5.36]]) {
      const lensIndex = spec.lensIndices.red + colorIndex;
      setTrafficLightInstance(trafficSignalLenses, lensIndex, spec, [0, y, 0.275]);
      setTrafficLightInstance(trafficSignalGlows, lensIndex, spec, [0, y, 0.19]);
    }
  });
  for (const mesh of [trafficSignalPoles, trafficSignalHousings, overheadSignalPoles, overheadSignalArms, overheadSignalHousings, trafficSignalLenses, trafficSignalGlows]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh === trafficSignalPoles || mesh === trafficSignalHousings
      || mesh === overheadSignalPoles || mesh === overheadSignalArms || mesh === overheadSignalHousings;
    mesh.receiveShadow = mesh !== trafficSignalGlows;
    scene.add(mesh);
  }
  const setSignalLens = (index, state, lamp) => {
    const active = state === lamp;
    const colors = { red: active ? 0xff332b : 0x4b2524, yellow: active ? 0xffc238 : 0x4a3a20, green: active ? 0x42ef75 : 0x1c402b };
    const haloColors = { red: active ? 0xff2419 : 0x120504, yellow: active ? 0xffb51f : 0x100b02, green: active ? 0x10ff68 : 0x021008 };
    trafficSignalLenses.setColorAt(index, new THREE.Color(colors[lamp]));
    trafficSignalGlows.setColorAt(index, new THREE.Color(haloColors[lamp]));
  };
  const updateTrafficSignals = (elapsed) => {
    let changed = false;
    for (const intersection of trafficIntersections) {
      const stateX = viceCityTrafficSignalState('x', intersection.ix, intersection.iz, elapsed);
      const stateZ = viceCityTrafficSignalState('z', intersection.ix, intersection.iz, elapsed);
      if (stateX === intersection.lastX && stateZ === intersection.lastZ) continue;
      intersection.lastX = stateX;
      intersection.lastZ = stateZ;
      for (const signal of intersection.signals) {
        const state = signal.axis === 'x' ? stateX : stateZ;
        setSignalLens(signal.lensIndices.red, state, 'red');
        setSignalLens(signal.lensIndices.yellow, state, 'yellow');
        setSignalLens(signal.lensIndices.green, state, 'green');
      }
      changed = true;
    }
    if (changed) {
      if (trafficSignalLenses.instanceColor) trafficSignalLenses.instanceColor.needsUpdate = true;
      if (trafficSignalGlows.instanceColor) trafficSignalGlows.instanceColor.needsUpdate = true;
    }
  };
  updateTrafficSignals(0);

  if (neonGlowSpecs.length) {
    const neonGlows = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1), neonGlowMaterial, neonGlowSpecs.length,
    );
    const glowMarker = new THREE.Object3D();
    neonGlowSpecs.forEach((spec, index) => {
      glowMarker.position.set(spec.x, spec.y, spec.z);
      glowMarker.rotation.set(0, spec.frontSign < 0 ? Math.PI : 0, 0);
      glowMarker.scale.set(spec.width, spec.height, 1);
      glowMarker.updateMatrix();
      neonGlows.setMatrixAt(index, glowMarker.matrix);
      neonGlows.setColorAt(index, new THREE.Color(spec.color).multiplyScalar(spec.intensity));
    });
    neonGlows.instanceMatrix.needsUpdate = true;
    if (neonGlows.instanceColor) neonGlows.instanceColor.needsUpdate = true;
    neonGlows.computeBoundingSphere();
    neonGlows.renderOrder = 1;
    scene.add(neonGlows);
  }
  const addWindowInstances = (positions, material, rotationY = 0) => {
    const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 1.45, 0.1), material, positions.length);
    positions.forEach(([x, y, z], index) => { marker.position.set(x, y, z); marker.rotation.set(0, rotationY, 0); marker.scale.set(1, 1, 1); marker.updateMatrix(); windows.setMatrixAt(index, marker.matrix); });
    windows.instanceMatrix.needsUpdate = true;
    scene.add(windows);
  };
  addWindowInstances(litWindowPositions, windowMat);
  addWindowInstances(blueWindowPositions, blueWindow);
  addWindowInstances(darkWindowPositions, darkWindow);
  addWindowInstances(litSideWindowPositions, windowMat, Math.PI / 2);
  addWindowInstances(blueSideWindowPositions, blueWindow, Math.PI / 2);
  addWindowInstances(darkSideWindowPositions, darkWindow, Math.PI / 2);
  addViceCityPort(scene, addGroundPlane, addBox, buildingFootprints, portSurfaceRegions);
  const insideRegion = (region, x, z) => Math.abs(x - region.x) <= region.halfWidth && Math.abs(z - region.z) <= region.halfDepth;
  const surfaceHeight = (x, z) => {
    if (sidewalkRegions.some((region) => insideRegion(region, x, z))) return sidewalkHeight + roadElevation(x, z);
    const portSurface = portSurfaceRegions.find((region) => insideRegion(region, x, z));
    if (portSurface) return portSurface.height;
    if (lotRegions.some((region) => insideRegion(region, x, z))) return -0.065;
    if (viceCityOuterHighwayContains(x, z)) {
      return roadElevation(x, z) + viceCityOuterHighwayBridgeHeight(x, z) + 0.035;
    }
    const roadX = Math.abs(x - Math.round(x / BLOCK) * BLOCK) <= ROAD_HALF;
    const roadZ = Math.abs(z - Math.round(z / BLOCK) * BLOCK) <= ROAD_HALF;
    return roadX || roadZ ? roadElevation(x, z) : -0.12 + roadElevation(x, z);
  };
  const isCanalBlocked = (x, z) => {
    const onOuterOverpass = viceCityOuterHighwayBridgeHeight(x, z) > 0.5
      && viceCityOuterHighwayContains(x, z);
    return !onOuterOverpass && Math.abs(x) < CANAL_HALF_WIDTH && Math.abs(z) > BRIDGE_HALF_WIDTH;
  };
  const didCrossCanalWall = (fromX, fromZ, toX, toZ) => {
    const crossesCanal = Math.min(fromX, toX) <= CANAL_HALF_WIDTH
      && Math.max(fromX, toX) >= -CANAL_HALF_WIDTH;
    const crossesOuterOverpass = crossesCanal && [-VICE_CITY_OUTER_HIGHWAY.edge, VICE_CITY_OUTER_HIGHWAY.edge].some((crossingZ) =>
      Math.max(Math.abs(fromZ - crossingZ), Math.abs(toZ - crossingZ)) <= VICE_CITY_OUTER_HIGHWAY.halfWidth + 1);
    return !crossesOuterOverpass && viceCityCanalBarrierCrossed(
      fromX, fromZ, toX, toZ, CANAL_HALF_WIDTH, BRIDGE_HALF_WIDTH,
    );
  };
  const surfacePitch = (x, z, yaw) => {
    const forwardX = Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const ahead = surfaceHeight(x + forwardX * 2, z + forwardZ * 2);
    return Math.atan2(ahead - surfaceHeight(x, z), 2);
  };
  const fallenFenceSections = [];
  const hideFenceInstance = (mesh, index) => {
    marker.position.set(0, -1000, 0);
    marker.rotation.set(0, 0, 0);
    marker.scale.set(1, 1, 1);
    marker.updateMatrix();
    mesh.setMatrixAt(index, marker.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  };
  const toppleFenceSection = (segment, fallDirection) => {
    const group = new THREE.Group();
    group.position.set(segment.x, 0, segment.z);
    group.rotation.y = segment.yaw;
    const addPart = (geometry, material, x, y, z) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(x, y, z);
      part.castShadow = true;
      part.receiveShadow = true;
      group.add(part);
    };
    const sectionLength = segment.length;
    addPart(fenceMeshes.panels.geometry, chainMaterial, 0, 0.535, 0);
    addPart(fenceMeshes.posts.geometry, fenceMetalMat, -sectionLength / 2, 0.65, 0);
    addPart(fenceMeshes.posts.geometry, fenceMetalMat, sectionLength / 2, 0.65, 0);
    addPart(fenceMeshes.rails.geometry, fenceMetalMat, 0, 0.02, 0);
    addPart(fenceMeshes.rails.geometry, fenceMetalMat, 0, 1.16, 0);
    scene.add(group);
    fallenFenceSections.push({ group, fallDirection, progress: 0 });
  };
  const updateFallenFences = (dt) => {
    for (const fallen of fallenFenceSections) {
      fallen.progress = Math.min(1, fallen.progress + dt * 2.4);
      const eased = fallen.progress * fallen.progress * (3 - 2 * fallen.progress);
      fallen.group.rotation.x = fallen.fallDirection * eased * Math.PI / 2;
    }
  };
  const parkedCarOverlaps = (body, x, z) => {
    const dx = x - body.spec.x;
    const dz = z - body.spec.z;
    const cosine = Math.cos(body.spec.yaw);
    const sine = Math.sin(body.spec.yaw);
    const localX = dx * cosine - dz * sine;
    const localZ = dx * sine + dz * cosine;
    const { halfWidth, halfLength } = viceCityFreeDriveParkedCarHitbox(body.spec.width, body.spec.length);
    return Math.abs(localX) < halfWidth && Math.abs(localZ) < halfLength;
  };
  const applyParkedCarImpact = (x, z, heading, speed, steer, dt = 1 / 60) => {
    let hitCount = 0;
    const direction = Math.sign(speed) || 1;
    for (const body of parkedCarBodies) {
      const overlaps = parkedCarOverlaps(body, x, z);
      const firstContact = overlaps && !body.touchingPlayer;
      const impulse = overlaps ? viceCityFreeDriveParkedCarImpulse(speed, body.mass, dt, firstContact) : 0;
      if (impulse > 0) {
        const directionX = heading.x * direction;
        const directionZ = heading.z * direction;
        body.velocityX += directionX * impulse;
        body.velocityZ += directionZ * impulse;
        if (firstContact) {
          const sideOffset = (x - body.spec.x) * directionZ - (z - body.spec.z) * directionX;
          body.angularVelocity += clamp(sideOffset * impulse * 0.08 + steer * 0.18, -1.6, 1.6);
        }
        hitCount += 1;
      }
      body.touchingPlayer = overlaps;
    }
    return hitCount;
  };
  const updateParkedCars = (dt) => {
    updateFallenFences(dt);
    const drag = Math.exp(-2.25 * dt);
    const isBlocked = (body, x, z) => {
      if (Math.abs(x) < CANAL_HALF_WIDTH + body.radius * 0.7
        && Math.abs(z) > BRIDGE_HALF_WIDTH + body.radius * 0.7) return true;
      if (buildingFootprints.some((building) =>
        Math.abs(x - building.x) < building.halfWidth + Math.max(0.55, body.radius * 0.42)
        && Math.abs(z - building.z) < building.halfDepth + Math.max(0.55, body.radius * 0.42))) return true;
      return parkedCarBodies.some((other) => other !== body
        && Math.hypot(x - other.spec.x, z - other.spec.z) < body.radius + other.radius * 0.72);
    };
    for (const body of parkedCarBodies) {
      const { spec, mesh } = body;
      const nextX = spec.x + body.velocityX * dt;
      const nextZ = spec.z + body.velocityZ * dt;
      if (!isBlocked(body, nextX, nextZ)) {
        spec.x = nextX;
        spec.z = nextZ;
      } else {
        if (!isBlocked(body, nextX, spec.z)) spec.x = nextX;
        else body.velocityX = 0;
        if (!isBlocked(body, spec.x, nextZ)) spec.z = nextZ;
        else body.velocityZ = 0;
      }
      spec.yaw += body.angularVelocity * dt;
      body.velocityX *= drag;
      body.velocityZ *= drag;
      body.angularVelocity *= drag;
      if (Math.abs(body.velocityX) < 0.04) body.velocityX = 0;
      if (Math.abs(body.velocityZ) < 0.04) body.velocityZ = 0;
      if (Math.abs(body.angularVelocity) < 0.015) body.angularVelocity = 0;
      mesh.position.set(spec.x, roadElevation(spec.x, spec.z), spec.z);
      mesh.rotation.y = spec.yaw;
      mesh.rotation.x = surfacePitch(spec.x, spec.z, spec.yaw);
    }
  };
  const breakFencesAt = (x, z, forwardX = 0, forwardZ = -1) => {
    if (!fenceMeshes) return 0;
    let broken = 0;
    for (const segment of fenceSegments) {
      if (!segment.active) continue;
      const dx = x - segment.x;
      const dz = z - segment.z;
      const cosine = Math.cos(segment.yaw);
      const sine = Math.sin(segment.yaw);
      const along = dx * cosine - dz * sine;
      const across = dx * sine + dz * cosine;
      if (Math.abs(along) > segment.length / 2 + 2.1 || Math.abs(across) > 1.5) continue;
      segment.active = false;
      hideFenceInstance(fenceMeshes.panels, segment.instances.panel);
      segment.instances.posts.forEach((index) => hideFenceInstance(fenceMeshes.posts, index));
      segment.instances.rails.forEach((index) => hideFenceInstance(fenceMeshes.rails, index));
      // Le grillage tombe dans le sens d'avancée du véhicule et reste couché au sol.
      const forwardAcross = forwardX * sine + forwardZ * cosine;
      toppleFenceSection(segment, Math.sign(forwardAcross) || Math.sign(across) || 1);
      broken += 1;
    }
    return broken;
  };
  return {
    ground, roadMat, sidewalkMat, buildingFootprints, parkedCarSpecs, parkedCarBodies, fenceSegments,
    trafficIntersections, updateTrafficSignals, updateParkedCars, applyParkedCarImpact,
    roadElevation, surfaceHeight, surfacePitch, isCanalBlocked, didCrossCanalWall,
    canalBoats, updateCanalBoats, updateCanalWater, roundaboutIsland, breakFencesAt,
  };
}

function isTouchPortraitViewport() {
  if (typeof window === 'undefined') return false;
  const touch = Boolean(window.LetsPlayAndroid)
    || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  return touch && window.innerHeight > window.innerWidth;
}

export default function ViceCityFreeRoam({ carId, onExit }) {
  const mountRef = useRef(null);
  const hudRef = useRef(null);
  const audioRef = useRef(null);
  const audioStartingRef = useRef(null);
  const onExitRef = useRef(onExit);
  const touchKeysRef = useRef(new Set());
  const touchAxesRef = useRef({ x: 0, y: 0 });
  const joystickPointerRef = useRef(null);
  const joystickKnobRef = useRef(null);
  const landscapeSessionRef = useRef(null);
  const [portraitTouch, setPortraitTouch] = useState(isTouchPortraitViewport);
  const [soundOn, setSoundOn] = useState(readFreeRoamSoundPreference);
  const [cockpitView, setCockpitView] = useState(readFreeRoamCameraPreference);
  const soundOnRef = useRef(soundOn);
  const cockpitViewRef = useRef(cockpitView);
  const toggleSoundRef = useRef(null);
  const toggleCameraRef = useRef(null);
  onExitRef.current = onExit;
  soundOnRef.current = soundOn;
  cockpitViewRef.current = cockpitView;
  const driveCar = CITY_RUSH_CARS.find((car) => car.id === carId) || CITY_RUSH_CARS[0];
  const activateAudio = () => {
    if (!soundOnRef.current) return;
    const audio = audioRef.current;
    if (!audio || audio.running || audioStartingRef.current) return;
    try {
      audioStartingRef.current = audio.start()
        .catch(() => {})
        .then(() => { if (!soundOnRef.current) audio.stop(); })
        .finally(() => { audioStartingRef.current = null; });
    } catch { audioStartingRef.current = null; }
  };
  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    writeFreeRoamSoundPreference(next);
    if (next) activateAudio();
    else audioRef.current?.stop();
  };
  toggleSoundRef.current = toggleSound;
  const toggleCamera = () => {
    const next = !cockpitViewRef.current;
    cockpitViewRef.current = next;
    setCockpitView(next);
    writeFreeRoamCameraPreference(next);
  };
  toggleCameraRef.current = toggleCamera;
  const setTouchKey = (code, pressed) => {
    if (pressed) touchKeysRef.current.add(code);
    else touchKeysRef.current.delete(code);
  };
  const updateJoystick = (event) => {
    if (joystickPointerRef.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const travel = Math.max(1, Math.min(bounds.width, bounds.height) * 0.34);
    const x = clamp((event.clientX - (bounds.left + bounds.width / 2)) / travel, -1, 1);
    touchAxesRef.current = { x, y: 0 };
    joystickKnobRef.current?.style.setProperty('--stick-x', `${x * travel}px`);
    joystickKnobRef.current?.style.setProperty('--stick-y', '0px');
  };
  const startJoystick = (event) => {
    event.preventDefault();
    activateAudio();
    joystickPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  };
  const endJoystick = (event) => {
    if (joystickPointerRef.current !== event.pointerId) return;
    joystickPointerRef.current = null;
    touchAxesRef.current = { x: 0, y: 0 };
    joystickKnobRef.current?.style.setProperty('--stick-x', '0px');
    joystickKnobRef.current?.style.setProperty('--stick-y', '0px');
  };
  const activateLandscape = () => {
    Promise.resolve(landscapeSessionRef.current?.enter({ fullscreen: true })).catch(() => {});
  };
  useEffect(() => {
    const session = createRpgLandscapeSession();
    landscapeSessionRef.current = session;
    Promise.resolve(session.enter({ fullscreen: false })).catch(() => {});
    const updatePortrait = () => setPortraitTouch(isTouchPortraitViewport());
    window.addEventListener('resize', updatePortrait);
    window.addEventListener('orientationchange', updatePortrait);
    window.screen?.orientation?.addEventListener?.('change', updatePortrait);
    updatePortrait();
    return () => {
      window.removeEventListener('resize', updatePortrait);
      window.removeEventListener('orientationchange', updatePortrait);
      window.screen?.orientation?.removeEventListener?.('change', updatePortrait);
      session.leave();
      if (landscapeSessionRef.current === session) landscapeSessionRef.current = null;
    };
  }, []);
  useEffect(() => {
    const audio = new CityRushAudio();
    audioRef.current = audio;
    const onVisibilityChange = () => {
      if (document.hidden) audio.pause();
      else if (soundOnRef.current && audio.running) audio.resume();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      audio.destroy();
      audioRef.current = null;
      audioStartingRef.current = null;
    };
  }, []);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x73c5f0);
    scene.fog = new THREE.Fog(0x9bd8f4, 190, 680);
    addViceCityClouds(scene);
    const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 900);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe7f0ff, 0x463d37, 2.0));
    const sun = new THREE.DirectionalLight(0xffd3a1, 3.1);
    sun.position.set(-100, 180, 70); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -170; sun.shadow.camera.right = 170; sun.shadow.camera.top = 170; sun.shadow.camera.bottom = -170;
    scene.add(sun);
    const city = makeCity(scene);

    const profile = CITY_RUSH_CARS.find((car) => car.id === carId) || CITY_RUSH_CARS[0];
    const maxSpeed = 35 * profile.powerMultiplier;
    const reverseMaxSpeed = Math.min(7, maxSpeed * 0.25);
    const acceleration = clamp((Number(profile.accelerationRate) || 10) / 2, 3.5, 7.4);
    const vehicle = makeRacerCar(profile, { player: true, daylight: true, number: CITY_RUSH_CARS.indexOf(profile) + 1 });
    vehicle.position.set(-138, 0, 0);
    scene.add(vehicle);
    let playerCockpit = null;
    const ensurePlayerCockpit = () => {
      if (!playerCockpit) {
        playerCockpit = makeCityRushCockpit(vehicle, {
          rightHandDrive: false,
          accent: profile.accent,
          daylight: true,
          label: profile.name,
        });
      }
      return playerCockpit;
    };
    const trafficDirections = [
      { axis: 'x', direction: 1 }, { axis: 'x', direction: -1 },
      { axis: 'z', direction: 1 }, { axis: 'z', direction: -1 },
    ];
    const trafficCars = Array.from({ length: 16 }, (_, index) => {
      const directionSpec = trafficDirections[Math.floor(index / 4)];
      const withinDirection = index % 4;
      const laneIndex = directionSpec.axis === 'z' ? (withinDirection < 2 ? -1 : 1) : 0;
      const crossAxis = directionSpec.axis === 'x'
        ? -directionSpec.direction * 2.35
        : laneIndex * BLOCK + directionSpec.direction * 2.35;
      const progress = directionSpec.axis === 'x'
        ? [-220, -72, 78, 224][withinDirection] * directionSpec.direction
        : (withinDirection % 2 === 0 ? -185 : 185) * directionSpec.direction;
      const trafficType = CITY_RUSH_TRAFFIC_TYPES[index % CITY_RUSH_TRAFFIC_TYPES.length];
      const car = makeTrafficVehicle(trafficType.id);
      const yaw = directionSpec.axis === 'x'
        ? directionSpec.direction > 0 ? -Math.PI / 2 : Math.PI / 2
        : directionSpec.direction > 0 ? Math.PI : 0;
      const trafficX = directionSpec.axis === 'x' ? progress : crossAxis;
      const trafficZ = directionSpec.axis === 'z' ? progress : crossAxis;
      car.position.set(trafficX, city.roadElevation(trafficX, trafficZ) + 0.02, trafficZ);
      car.rotation.y = yaw;
      car.rotation.x = city.surfacePitch(trafficX, trafficZ, yaw);
      scene.add(car);
      return {
        car,
        type: trafficType.id,
        phase: index * 0.9,
        axis: directionSpec.axis,
        direction: directionSpec.direction,
        crossAxis,
        progress,
        speed: 0,
        maxSpeed: trafficType.speed,
        yaw,
        offsetX: 0,
        offsetZ: 0,
        velocityX: 0,
        velocityZ: 0,
        yawOffset: 0,
        angularVelocity: 0,
        touchingPlayer: false,
        mass: trafficType.id === 'garbage-truck' ? 1.9 : trafficType.id === 'ambulance' ? 1.35 : trafficType.id === 'police' ? 1.15 : 1,
      };
    });
    const keys = new Set();
    const shots = [];
    const shotGeometry = new THREE.SphereGeometry(0.12, 8, 6);
    const shotMaterial = new THREE.MeshBasicMaterial({ color: 0xffe28a, toneMapped: false });
    let shotCooldown = 0;
    const state = { x: -138, z: 0, heading: Math.PI / 2, speed: 0, steer: 0, time: 0 };
    const updateTraffic = (dt) => {
      city.updateParkedCars(dt);
      city.updateTrafficSignals(state.time);
      for (const traffic of trafficCars) {
        const nextIndex = traffic.direction > 0
          ? Math.floor((traffic.progress + 0.001) / BLOCK) + 1
          : Math.ceil((traffic.progress - 0.001) / BLOCK) - 1;
        const nextIntersection = nextIndex * BLOCK;
        const distanceToSignal = traffic.direction * (nextIntersection - traffic.progress);
        let distanceToControl = distanceToSignal;
        const intersectionXIndex = traffic.axis === 'x' ? nextIndex : Math.round(traffic.crossAxis / BLOCK);
        const intersectionZIndex = traffic.axis === 'z' ? nextIndex : Math.round(traffic.crossAxis / BLOCK);
        const bridgeApproach = intersectionZIndex === 0
          && Math.abs(intersectionXIndex * BLOCK) <= BRIDGE_HALF_LENGTH + 8;
        const riverEdgeIntersection = intersectionXIndex === 0 && intersectionZIndex !== 0;
        const roundaboutApproach = intersectionXIndex === 2 && intersectionZIndex === 2;
        let signalState = bridgeApproach || riverEdgeIntersection || roundaboutApproach
          ? 'green'
          : viceCityTrafficSignalState(traffic.axis, intersectionXIndex, intersectionZIndex, state.time);
        const approachKey = `${traffic.axis}:${intersectionXIndex}:${intersectionZIndex}`;
        if (traffic.approachKey !== approachKey) {
          traffic.approachKey = approachKey;
          traffic.committedIntersection = false;
        }
        if (traffic.committedIntersection || (signalState === 'green' && distanceToSignal <= 18)) {
          traffic.committedIntersection = true;
          signalState = 'green';
        }
        let stopLine = 18;
        const playerAlong = traffic.axis === 'x' ? state.x : state.z;
        const playerAcross = traffic.axis === 'x' ? state.z : state.x;
        const playerDistance = traffic.direction * (playerAlong - traffic.progress);
        if (Math.abs(playerAcross - traffic.crossAxis) < 2.3 && playerDistance > 0 && playerDistance < distanceToControl) {
          distanceToControl = playerDistance;
          signalState = 'red';
          stopLine = 5.2;
        }
        const moved = stepViceCityTrafficVehicle(traffic, dt, distanceToControl, signalState, stopLine);
        traffic.progress = moved.progress;
        traffic.speed = moved.speed;
        if (traffic.direction > 0 && traffic.progress > CITY_GRID_LIMIT + 20) {
          traffic.progress = -CITY_GRID_LIMIT - 20;
          traffic.speed = 0;
        } else if (traffic.direction < 0 && traffic.progress < -CITY_GRID_LIMIT - 20) {
          traffic.progress = CITY_GRID_LIMIT + 20;
          traffic.speed = 0;
        }
        const pushDrag = Math.exp(-2.25 * dt);
        traffic.offsetX += traffic.velocityX * dt;
        traffic.offsetZ += traffic.velocityZ * dt;
        traffic.velocityX *= pushDrag;
        traffic.velocityZ *= pushDrag;
        traffic.offsetX *= Math.exp(-0.18 * dt);
        traffic.offsetZ *= Math.exp(-0.18 * dt);
        traffic.yawOffset += traffic.angularVelocity * dt;
        traffic.angularVelocity *= pushDrag;
        traffic.yawOffset *= Math.exp(-0.28 * dt);
        const trafficX = (traffic.axis === 'x' ? traffic.progress : traffic.crossAxis) + traffic.offsetX;
        const trafficZ = (traffic.axis === 'z' ? traffic.progress : traffic.crossAxis) + traffic.offsetZ;
        traffic.car.position.set(trafficX, city.roadElevation(trafficX, trafficZ) + 0.02, trafficZ);
        traffic.car.rotation.y = traffic.yaw + traffic.yawOffset;
        traffic.car.rotation.x = city.surfacePitch(trafficX, trafficZ, traffic.car.rotation.y);
        const visualSpeed = traffic.speed + Math.hypot(traffic.velocityX, traffic.velocityZ);
        traffic.car.userData.wheels?.forEach((wheel) => { wheel.rotation.x += visualSpeed * dt * 0.95; });
        traffic.car.userData.beacons?.forEach((beacon, beaconIndex) => {
          const flashing = Math.floor(state.time * 8 + traffic.phase + beaconIndex) % 2 === 0;
          beacon.material.opacity = flashing ? 1 : 0.18;
        });
      }
    };
    const onDown = (event) => {
      if (event.code === 'KeyM') {
        event.preventDefault();
        toggleSoundRef.current?.();
        return;
      }
      if (event.code === 'KeyC') {
        event.preventDefault();
        toggleCameraRef.current?.();
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyZ'].includes(event.code)) {
        event.preventDefault();
        activateAudio();
        keys.add(event.code);
      }
      if (event.code === 'Escape') { event.preventDefault(); onExitRef.current?.(); }
    };
    const onUp = (event) => keys.delete(event.code);
    const blur = () => {
      keys.clear();
      touchKeysRef.current.clear();
      touchAxesRef.current = { x: 0, y: 0 };
      joystickPointerRef.current = null;
      joystickKnobRef.current?.style.setProperty('--stick-x', '0px');
      joystickKnobRef.current?.style.setProperty('--stick-y', '0px');
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', blur);
    const resize = () => {
      const width = Math.max(1, mount.clientWidth); const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const forward = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const cockpitPosition = new THREE.Vector3();
    const cockpitIdentityQuat = new THREE.Quaternion();
    const cockpitFollowQuat = new THREE.Quaternion();
    const cockpitHeadQuat = new THREE.Quaternion();
    const cockpitTargetQuat = new THREE.Quaternion();
    const cockpitHeadEuler = new THREE.Euler();
    let cockpitActive = false;
    let cockpitCameraSnap = true;
    const overlapsVehicleHitbox = (x, z, carX, carZ, yaw, width, length) => {
      const dx = x - carX;
      const dz = z - carZ;
      const cosine = Math.cos(yaw);
      const sine = Math.sin(yaw);
      const localX = dx * cosine - dz * sine;
      const localZ = dx * sine + dz * cosine;
      const { halfWidth, halfLength } = viceCityFreeDriveParkedCarHitbox(width, length);
      return Math.abs(localX) < halfWidth && Math.abs(localZ) < halfLength;
    };
    const isPositionBlocked = (x, z) => {
      if (city.isCanalBlocked(x, z)) return true;
      if (Math.hypot(x - city.roundaboutIsland.x, z - city.roundaboutIsland.z) < city.roundaboutIsland.collisionRadius) return true;
      if (city.buildingFootprints.some((building) =>
        Math.abs(x - building.x) < building.halfWidth + BUILDING_COLLISION_MARGIN
        && Math.abs(z - building.z) < building.halfDepth + BUILDING_COLLISION_MARGIN)) return true;
      if (trafficCars.some(({ car }) => overlapsVehicleHitbox(
        x, z, car.position.x, car.position.z, car.rotation.y, car.userData.width, car.userData.length,
      ))) return true;
      return city.parkedCarSpecs.some((car) => overlapsVehicleHitbox(
        x, z, car.x, car.z, car.yaw, car.width, car.length,
      ));
    };
    const applyTrafficCarImpact = (x, z, heading, speed, steer, dt) => {
      let hitCount = 0;
      const direction = Math.sign(speed) || 1;
      for (const traffic of trafficCars) {
        const { car } = traffic;
        const overlaps = overlapsVehicleHitbox(
          x, z, car.position.x, car.position.z, car.rotation.y, car.userData.width, car.userData.length,
        );
        const firstContact = overlaps && !traffic.touchingPlayer;
        const impulse = overlaps ? viceCityFreeDriveParkedCarImpulse(speed, traffic.mass, dt, firstContact) : 0;
        if (impulse > 0) {
          const directionX = heading.x * direction;
          const directionZ = heading.z * direction;
          traffic.velocityX += directionX * impulse;
          traffic.velocityZ += directionZ * impulse;
          if (firstContact) {
            const sideOffset = (x - car.position.x) * directionZ - (z - car.position.z) * directionX;
            traffic.angularVelocity += clamp(sideOffset * impulse * 0.08 + steer * 0.18, -1.6, 1.6);
          }
          hitCount += 1;
        }
        traffic.touchingPlayer = overlaps;
      }
      return hitCount;
    };
    const fireShot = () => {
      const directionX = forward.x;
      const directionZ = forward.z;
      const x = state.x + directionX * 2.65;
      const z = state.z + directionZ * 2.65;
      const mesh = new THREE.Mesh(shotGeometry, shotMaterial);
      mesh.position.set(x, city.surfaceHeight(x, z) + 1.05, z);
      scene.add(mesh);
      shots.push({ mesh, x, z, directionX, directionZ, age: 0, distance: 0 });
      if (soundOnRef.current) audioRef.current?.gunshot?.();
    };
    const bulletOverlaps = (x, z, carX, carZ, yaw, width, length) => {
      const dx = x - carX;
      const dz = z - carZ;
      const cosine = Math.cos(yaw);
      const sine = Math.sin(yaw);
      const localX = dx * cosine - dz * sine;
      const localZ = dx * sine + dz * cosine;
      const { halfWidth, halfLength } = viceCityFreeDriveParkedCarHitbox(width, length);
      return Math.abs(localX) <= halfWidth + 0.45 && Math.abs(localZ) <= halfLength + 0.55;
    };
    const updateShots = (dt) => {
      for (let index = shots.length - 1; index >= 0; index -= 1) {
        const shot = shots[index];
        const stepX = shot.directionX * 92 * dt;
        const stepZ = shot.directionZ * 92 * dt;
        const stepLength = Math.hypot(stepX, stepZ);
        const samples = Math.max(1, Math.ceil(stepLength / 0.8));
        let hit = false;
        for (let sample = 1; sample <= samples && !hit; sample += 1) {
          const ratio = sample / samples;
          const x = shot.x + stepX * ratio;
          const z = shot.z + stepZ * ratio;
          for (const traffic of trafficCars) {
            if (!bulletOverlaps(x, z, traffic.car.position.x, traffic.car.position.z,
              traffic.car.rotation.y, traffic.car.userData.width, traffic.car.userData.length)) continue;
            const impulse = viceCityFreeDriveShotImpulse(traffic.mass);
            traffic.velocityX += shot.directionX * impulse;
            traffic.velocityZ += shot.directionZ * impulse;
            traffic.angularVelocity += clamp((state.x - traffic.car.position.x) * shot.directionZ * 0.035, -0.8, 0.8);
            hit = true;
            break;
          }
          if (hit) break;
          for (const body of city.parkedCarBodies) {
            if (!bulletOverlaps(x, z, body.spec.x, body.spec.z, body.spec.yaw,
              body.spec.width, body.spec.length)) continue;
            const impulse = viceCityFreeDriveShotImpulse(body.mass, 4.2);
            body.velocityX += shot.directionX * impulse;
            body.velocityZ += shot.directionZ * impulse;
            body.angularVelocity += clamp((state.x - body.spec.x) * shot.directionZ * 0.035, -0.8, 0.8);
            hit = true;
            break;
          }
          if (!hit) {
            shot.x = x;
            shot.z = z;
            shot.distance += stepLength / samples;
          }
        }
        shot.age += dt;
        shot.mesh.position.set(shot.x, city.surfaceHeight(shot.x, shot.z) + 1.05, shot.z);
        if (hit || shot.age > 1.5 || shot.distance > 125) {
          scene.remove(shot.mesh);
          shots.splice(index, 1);
        }
      }
    };
    const cockpitMirrorTurn = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, Math.PI, 0, 'YXZ'));
    let cockpitMirrorTarget = null;
    let cockpitMirrorCamera = null;
    let cockpitMirrorFrame = 0;
    let cockpitMirrorBroken = false;
    const renderCockpitMirror = () => {
      if (!cockpitActive || !playerCockpit || cockpitMirrorBroken || typeof renderer.setRenderTarget !== 'function') return;
      cockpitMirrorFrame += 1;
      if (cockpitMirrorTarget && cockpitMirrorFrame % 2 === 1) return;
      const previousTarget = renderer.getRenderTarget?.() || null;
      const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
      try {
        if (!cockpitMirrorTarget) {
          cockpitMirrorTarget = new THREE.WebGLRenderTarget(320, 80, {
            type: renderer.capabilities?.isWebGL2 && renderer.extensions?.has?.('EXT_color_buffer_float')
              ? THREE.HalfFloatType
              : THREE.UnsignedByteType,
          });
          cockpitMirrorCamera = new THREE.PerspectiveCamera(15, 4, 0.3, 180);
          cockpitMirrorTarget.texture.repeat.set(-1, 1);
          cockpitMirrorTarget.texture.offset.set(1, 0);
          const glass = playerCockpit.mirror.material;
          glass.map = cockpitMirrorTarget.texture;
          glass.color.setHex(0xffffff);
          glass.needsUpdate = true;
        }
        cockpitMirrorCamera.position.copy(cockpitPosition);
        cockpitMirrorCamera.position.y += 0.05;
        cockpitMirrorCamera.quaternion.copy(vehicle.quaternion).multiply(cockpitMirrorTurn);
        cockpitMirrorCamera.updateMatrixWorld();
        renderer.shadowMap.autoUpdate = false;
        vehicle.visible = false;
        renderer.setRenderTarget(cockpitMirrorTarget);
        renderer.render(scene, cockpitMirrorCamera);
      } catch {
        cockpitMirrorBroken = true;
        const glass = playerCockpit.mirror.material;
        glass.map = playerCockpit.mirror.fallback;
        glass.needsUpdate = true;
      } finally {
        vehicle.visible = true;
        renderer.setRenderTarget(previousTarget);
        renderer.shadowMap.autoUpdate = shadowAutoUpdate;
      }
    };
    let frame = 0; let last = performance.now(); let hudAt = 0;
    const animate = (now) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.04, Math.max(0, (now - last) / 1000)); last = now; state.time += dt;
      updateTraffic(dt);
      city.updateCanalBoats(dt, state.time);
      city.updateCanalWater(state.time);
      const pressed = (code) => keys.has(code) || touchKeysRef.current.has(code);
      const joystickInput = viceCityFreeDriveJoystickInput(touchAxesRef.current.x, 0);
      const throttle = pressed('ArrowUp') || pressed('KeyW');
      const brake = pressed('ArrowDown') || pressed('KeyS');
      const steerInput = clamp(
        (pressed('ArrowRight') || pressed('KeyD') ? 1 : 0)
          - (pressed('ArrowLeft') || pressed('KeyA') || pressed('KeyQ') ? 1 : 0)
          + joystickInput.steer,
        -1,
        1,
      );
      state.speed = viceCityFreeDriveSpeedStep({
        speed: state.speed,
        throttle,
        brake,
        dt,
        maxSpeed,
        acceleration,
        reverseMaxSpeed,
      });
      if (soundOnRef.current) {
        audioRef.current?.engine({
          speed: Math.abs(state.speed) / maxSpeed,
          throttle: throttle || brake ? 1 : 0,
          idle: Math.abs(state.speed) < 0.08 && !throttle && !brake,
          engineProfile: profile.archetype,
        });
      }
      // Le braquage monte progressivement tant qu’on maintient la touche ;
      // un appui bref reste doux et le volant se recentre vite au relâchement.
      state.steer = viceCityFreeDriveSteerStep(state.steer, steerInput, dt);
      state.heading += viceCityFreeDriveYawRate(state.speed, state.steer) * dt;
      // Les modèles du garage pointent le capot vers leur axe local -Z.
      forward.set(Math.sin(state.heading), 0, -Math.cos(state.heading));
      const nextX = state.x + forward.x * state.speed * dt;
      const nextZ = state.z + forward.z * state.speed * dt;
      if (city.breakFencesAt(nextX, nextZ, forward.x, forward.z) > 0) state.speed *= 0.88;
      const pushedParkedCars = city.applyParkedCarImpact(nextX, nextZ, forward, state.speed, state.steer, dt);
      const pushedTrafficCars = applyTrafficCarImpact(nextX, nextZ, forward, state.speed, state.steer, dt);
      const pushedCars = pushedParkedCars + pushedTrafficCars;
      // Conduite libre partout dans la ville : les trottoirs et les espaces
      // ouverts restent franchissables, seuls les bâtiments et véhicules bloquent.
      const isMovementBlocked = (fromX, fromZ, toX, toZ) =>
        city.didCrossCanalWall(fromX, fromZ, toX, toZ) || isPositionBlocked(toX, toZ);
      if (!isMovementBlocked(state.x, state.z, nextX, nextZ)) {
        state.x = nextX;
        state.z = nextZ;
      } else {
        const deltaX = nextX - state.x;
        const deltaZ = nextZ - state.z;
        const canSlideX = Math.abs(deltaX) > 1e-6 && !isMovementBlocked(state.x, state.z, nextX, state.z);
        const canSlideZ = Math.abs(deltaZ) > 1e-6 && !isMovementBlocked(state.x, state.z, state.x, nextZ);
        if (canSlideX && (!canSlideZ || Math.abs(deltaX) >= Math.abs(deltaZ))) state.x = nextX;
        else if (canSlideZ) state.z = nextZ;
        state.speed *= canSlideX || canSlideZ ? 0.72 : pushedCars > 0 ? 0.62 : 0.18;
      }
      if (Math.abs(state.x) > CITY_LIMIT || Math.abs(state.z) > CITY_LIMIT) {
        state.x = clamp(state.x, -CITY_LIMIT, CITY_LIMIT); state.z = clamp(state.z, -CITY_LIMIT, CITY_LIMIT); state.speed = 0;
      }
      vehicle.position.set(state.x, city.surfaceHeight(state.x, state.z), state.z);
      vehicle.rotation.y = -state.heading;
      vehicle.rotation.x = city.surfacePitch(state.x, state.z, -state.heading);
      shotCooldown = Math.max(0, shotCooldown - dt);
      if (pressed('KeyZ') && shotCooldown <= 0) {
        fireShot();
        shotCooldown = 0.18;
      }
      updateShots(dt);
      animateRacerCar(vehicle, { speed: state.speed, maxSpeed, steer: state.steer * 0.4, braking: brake && state.speed >= 0, idle: !throttle && !brake && state.speed === 0 }, dt, state.time);
      const isCockpitView = cockpitViewRef.current;
      if (cockpitActive !== isCockpitView) {
        cockpitActive = isCockpitView;
        const cockpit = cockpitActive ? ensurePlayerCockpit() : playerCockpit;
        cockpit?.setActive(cockpitActive);
        cockpitCameraSnap = true;
        camera.fov = cockpitActive ? CITY_RUSH_COCKPIT_FOV : 66;
        camera.updateProjectionMatrix();
      }
      const activeCockpit = isCockpitView ? ensurePlayerCockpit() : null;
      if (isCockpitView && activeCockpit) {
        activeCockpit.update({ speed: Math.abs(state.speed), topSpeed: maxSpeed, steer: state.steer * 0.4 }, dt, state.time);
        vehicle.updateMatrixWorld(true);
        activeCockpit.eye.getWorldPosition(cockpitPosition);
        camera.position.copy(cockpitPosition);
        cockpitFollowQuat.copy(cockpitIdentityQuat)
          .slerp(vehicle.userData.body.quaternion, CITY_RUSH_COCKPIT_BODY_FOLLOW);
        const speedRatio = clamp(Math.abs(state.speed) / maxSpeed, 0, 1);
        const headBob = Math.sin(state.time * 39) * speedRatio * 0.0012;
        const lookYaw = clamp(state.steer * 0.16, -CITY_RUSH_COCKPIT_LOOK_AHEAD_MAX, CITY_RUSH_COCKPIT_LOOK_AHEAD_MAX);
        cockpitHeadEuler.set(CITY_RUSH_COCKPIT_PITCH + headBob, lookYaw, 0, 'YXZ');
        cockpitHeadQuat.setFromEuler(cockpitHeadEuler);
        cockpitTargetQuat.copy(vehicle.quaternion).multiply(cockpitFollowQuat).multiply(cockpitHeadQuat);
        if (cockpitCameraSnap) camera.quaternion.copy(cockpitTargetQuat);
        else camera.quaternion.slerp(cockpitTargetQuat, 1 - Math.exp(-dt * 14));
        cockpitCameraSnap = false;
        camera.fov = CITY_RUSH_COCKPIT_FOV + speedRatio * CITY_RUSH_COCKPIT_SPEED_FOV;
        camera.updateProjectionMatrix();
      } else {
        cameraPosition.copy(vehicle.position).addScaledVector(forward, -6.8);
        cameraPosition.y += 3.2;
        camera.position.lerp(cameraPosition, 1 - Math.exp(-dt * 5.2));
        cameraTarget.set(
          state.x + forward.x * 5.5,
          city.surfaceHeight(state.x + forward.x * 5.5, state.z + forward.z * 5.5) + 1.05,
          state.z + forward.z * 5.5,
        );
        camera.lookAt(cameraTarget);
      }
      if (now - hudAt > 80 && hudRef.current) {
        hudAt = now;
        hudRef.current.innerHTML = `<b>${Math.round(Math.abs(state.speed) * 3.6)}</b><small>KM/H</small>`;
      }
      renderer.render(scene, camera);
      renderCockpitMirror();
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('blur', blur);
      cockpitMirrorTarget?.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => { for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose?.(); });
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [carId]);

  return (
    <div className="vice-free-roam" role="application" aria-label="Conduite libre dans Vice City">
      <div className="vice-free-roam-world" ref={mountRef} onPointerDown={activateAudio} />
      <header className="vice-free-roam-header">
        <div className="vice-free-roam-brand"><span>VICE CITY</span><b>FREE DRIVE</b><small>{driveCar.name} · OCEAN DISTRICT · 1986</small></div>
        <div className="vice-free-roam-location"><i /> CONDUITE LIBRE <span>—</span> AUCUNE COURSE</div>
        <button type="button" className={`vice-free-roam-sound${soundOn ? ' is-on' : ''}`} onClick={toggleSound}
          aria-pressed={soundOn} title={soundOn ? 'Couper le son (M)' : 'Activer le son (M)'}>
          <span aria-hidden="true">{soundOn ? '♫' : '♪'}</span> SON {soundOn ? 'ON' : 'OFF'}
        </button>
        <button type="button" className={`vice-free-roam-view${cockpitView ? ' is-on' : ''}`} onClick={toggleCamera}
          aria-pressed={cockpitView} aria-label={cockpitView ? 'Quitter la vue cockpit' : 'Activer la vue cockpit'}
          title={cockpitView ? 'Revenir à la caméra poursuite (C)' : 'Passer en mode cockpit (C)'}>
          ◉ COCKPIT
        </button>
        <button type="button" onClick={onExit}>↶ MENU</button>
      </header>
      <div className="vice-free-roam-speed" ref={hudRef}><b>0</b><small>KM/H</small></div>
      <div className="vice-free-roam-controls"><b>COMMANDES</b><span><kbd>↑</kbd> ACCÉLÉRER</span><span><kbd>↓</kbd> FREIN · RECUL À L’ARRÊT</span><span><kbd>←</kbd><kbd>→</kbd> BRAQUER</span><span><kbd>Z</kbd> TIRER</span><small>WASD · C : cockpit · M : son · Échap : menu</small></div>
      <div className="vice-free-roam-joystick" aria-label="Joystick gauche pour diriger">
        <div className="vice-free-roam-joystick-base" role="application" aria-label="Joystick virtuel"
          onPointerDown={startJoystick} onPointerMove={updateJoystick} onPointerUp={endJoystick}
          onPointerCancel={endJoystick} onLostPointerCapture={endJoystick}>
          <span className="vice-free-roam-joystick-axis" aria-hidden="true" />
          <button ref={joystickKnobRef} type="button" tabIndex={-1} aria-hidden="true" className="vice-free-roam-joystick-knob"
            onPointerDown={(event) => event.preventDefault()} />
        </div>
        <small>DIRIGER</small>
      </div>
      <div className="vice-free-roam-touch" role="group" aria-label="Accélérer, freiner et tirer">
        {[
          ['ArrowUp', '×', 'Accélérer', 'accelerate'],
          ['ArrowDown', '□', 'Freiner', 'brake'],
          ['KeyZ', '○', 'Tirer', 'shoot'],
        ].map(([code, glyph, label, action]) => (
          <button key={code} type="button" data-action={action} aria-label={label} title={label}
            onPointerDown={(event) => { event.preventDefault(); activateAudio(); event.currentTarget.setPointerCapture?.(event.pointerId); setTouchKey(code, true); }}
            onPointerUp={() => setTouchKey(code, false)} onPointerCancel={() => setTouchKey(code, false)}
            onLostPointerCapture={() => setTouchKey(code, false)}>
            <span aria-hidden="true">{glyph}</span><small>{label.toUpperCase()}</small>
          </button>
        ))}
      </div>
      {portraitTouch && (
        <div className="vice-free-roam-rotate" role="dialog" aria-modal="true" aria-label="Jeu en mode paysage">
          <span aria-hidden="true">↻</span>
          <h2>VICE CITY SE JOUE EN PAYSAGE</h2>
          <p>Tournez votre téléphone pour continuer la conduite libre.</p>
          <button type="button" onClick={activateLandscape}>ACTIVER LE PAYSAGE</button>
          <small>Si la rotation automatique est refusée, tournez l’appareil manuellement.</small>
        </div>
      )}
      <div className="vice-free-roam-compass">VC <i>N</i><span>OCEAN GRID · 06 × 06</span></div>
    </div>
  );
}
