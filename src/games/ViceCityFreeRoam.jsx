import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CITY_RUSH_CARS, CITY_RUSH_TRAFFIC_TYPES } from './cityRushRules.js';
import { makeTrafficVehicle } from './cityRushCars.js';
import { makeRacerCar, animateRacerCar } from './cityRushRacerModels.js';
import { viceCityFreeDriveSpeedStep, viceCityFreeDriveSteerStep, viceCityFreeDriveYawRate } from './viceCityFreeDrive.js';
import { stepViceCityTrafficVehicle, viceCityTrafficSignalState } from './viceCityTraffic.js';
import './vice-city-free-roam.css';

const BLOCK = 100;
const ROAD_HALF = 7;
const CITY_LIMIT = 3 * BLOCK + 54;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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
  const palette = [0xe5b99f, 0xc9b9aa, 0x9bb6b6, 0xd5d0c3, 0xb2a0a2, 0xd4a979, 0x839e9e, 0xf0d1ae];
  const litWindowPositions = [];
  const blueWindowPositions = [];
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
  const trafficIntersections = [];
  const trafficSignalSpecs = [];
  const overheadTrafficSignalSpecs = [];
  const fenceSegments = [];
  const grassTuftPositions = [];
  const buildingFootprints = [];
  const sidewalkRegions = [];
  const lotRegions = [];
  const addBox = (parent, material, x, y, z, w, h, d, castShadow = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY_LIMIT * 2 + 100, CITY_LIMIT * 2 + 100), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  scene.add(ground);

  // A genuine orthogonal street grid: avenue / cross-street intersections,
  // sidewalks, lane markings and raised crossings, repeated across a broad map.
  for (let index = -3; index <= 3; index += 1) {
    const axis = index * BLOCK;
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, CITY_LIMIT * 2 + 120), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(axis, 0, 0);
    roadX.receiveShadow = true;
    scene.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(CITY_LIMIT * 2 + 120, ROAD_HALF * 2), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(0, 0.006, axis);
    roadZ.receiveShadow = true;
    scene.add(roadZ);
    for (const side of [-1, 1]) {
      // Ligne de séparation entre les voies de circulation et le stationnement.
      const stripeV = new THREE.Mesh(new THREE.PlaneGeometry(0.14, CITY_LIMIT * 2), lineMat);
      stripeV.rotation.x = -Math.PI / 2;
      stripeV.position.set(axis + side * 3.6, 0.035, 0);
      scene.add(stripeV);
      const stripeH = new THREE.Mesh(new THREE.PlaneGeometry(CITY_LIMIT * 2, 0.14), lineMat);
      stripeH.rotation.x = -Math.PI / 2;
      stripeH.position.set(0, 0.038, axis + side * 3.6);
      scene.add(stripeH);
    }
    // Broken centerline on each road, interrupted around each junction.
    for (let p = -3 * BLOCK; p <= 3 * BLOCK; p += 13) {
      if (Math.abs((p + 50) % BLOCK - 50) < 15) continue;
      verticalDashPositions.push([axis, p]);
      horizontalDashPositions.push([p, axis]);
    }
    // Zébras aux quatre approches de chaque carrefour, orientées dans les deux axes.
    for (let crossing = -3; crossing <= 3; crossing += 1) {
      const crossAxis = crossing * BLOCK;
      for (const side of [-1, 1]) {
        for (let stripe = -6.4; stripe <= 6.4; stripe += 1.6) {
          verticalCrosswalkPositions.push([axis + stripe, crossAxis + side * 14]);
          horizontalCrosswalkPositions.push([crossAxis + side * 14, axis + stripe]);
        }
      }
    }
    // Places de stationnement compactes, reprises d'asphalte et plaques d'égout.
    for (let p = -3 * BLOCK; p <= 3 * BLOCK; p += 6) {
      if (Math.abs(p - Math.round(p / BLOCK) * BLOCK) < 21) continue;
      for (const side of [-1, 1]) {
        verticalParkingBayPositions.push([axis + side * 5.3, p]);
        horizontalParkingBayPositions.push([p, axis + side * 5.3]);
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

  // Trottoirs surélevés, interrompus à chaque carrefour pour ne jamais recouvrir la chaussée.
  const sidewalkHeight = 0.12;
  const sidewalkSegmentLength = BLOCK - 2 * (ROAD_HALF + 3.2);
  const verticalSidewalkGeometry = new THREE.PlaneGeometry(3.2, sidewalkSegmentLength);
  const horizontalSidewalkGeometry = new THREE.PlaneGeometry(sidewalkSegmentLength, 3.2);
  const cornerSidewalkGeometry = new THREE.PlaneGeometry(3.2, 3.2);
  for (let axisIndex = -3; axisIndex <= 3; axisIndex += 1) {
    const axis = axisIndex * BLOCK;
    for (let block = -3; block < 3; block += 1) {
      const segmentStart = block * BLOCK;
      const segmentCenter = segmentStart + BLOCK / 2;
      for (const side of [-1, 1]) {
        const sidewalkOffset = side * (ROAD_HALF + 1.6);
        const sidewalkV = new THREE.Mesh(verticalSidewalkGeometry, sidewalkMat);
        sidewalkV.rotation.x = -Math.PI / 2;
        sidewalkV.position.set(axis + sidewalkOffset, sidewalkHeight, segmentCenter);
        sidewalkV.receiveShadow = true;
        scene.add(sidewalkV);
        sidewalkRegions.push({ x: axis + sidewalkOffset, z: segmentCenter, halfWidth: 1.6, halfDepth: sidewalkSegmentLength / 2 });
        const sidewalkH = new THREE.Mesh(horizontalSidewalkGeometry, sidewalkMat);
        sidewalkH.rotation.x = -Math.PI / 2;
        sidewalkH.position.set(segmentCenter, sidewalkHeight, axis + sidewalkOffset);
        sidewalkH.receiveShadow = true;
        scene.add(sidewalkH);
        sidewalkRegions.push({ x: segmentCenter, z: axis + sidewalkOffset, halfWidth: sidewalkSegmentLength / 2, halfDepth: 1.6 });
        addBox(scene, curbMat, axis + side * (ROAD_HALF - 0.1), 0, segmentCenter, 0.2, sidewalkHeight, sidewalkSegmentLength);
        addBox(scene, curbMat, segmentCenter, 0, axis + side * (ROAD_HALF - 0.1), sidewalkSegmentLength, sidewalkHeight, 0.2);

        for (let row = 0; row < 2; row += 1) {
          const crossOffset = row === 0 ? -0.8 : 0.8;
          let tileIndex = 0;
          for (let along = segmentStart + ROAD_HALF + 3.95; along < segmentStart + BLOCK - ROAD_HALF - 3.95; along += 1.5) {
            const tileColor = Math.abs((Math.floor(along / 1.5) + (axisIndex + 3) * 11 + (side + 1) * 7 + row * 3 + tileIndex) % sidewalkTileColors.length);
            verticalSidewalkTilePositions.push([axis + sidewalkOffset + crossOffset, along, tileColor]);
            horizontalSidewalkTilePositions.push([along, axis + sidewalkOffset + crossOffset, tileColor]);
            tileIndex += 1;
          }
        }
      }
    }
  }
  // Pavés d'angle : ils relient les segments, sans prolonger les trottoirs sur les routes.
  for (let xAxisIndex = -3; xAxisIndex <= 3; xAxisIndex += 1) {
    for (let zAxisIndex = -3; zAxisIndex <= 3; zAxisIndex += 1) {
      const xAxis = xAxisIndex * BLOCK;
      const zAxis = zAxisIndex * BLOCK;
      for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
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
  verticalDashPositions.forEach(([x, z], index) => { marker.position.set(x, 0.04, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); verticalDashes.setMatrixAt(index, marker.matrix); });
  scene.add(verticalDashes);
  const horizontalDashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 0.22), lineMat, horizontalDashPositions.length);
  horizontalDashPositions.forEach(([x, z], index) => { marker.position.set(x, 0.04, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); horizontalDashes.setMatrixAt(index, marker.matrix); });
  scene.add(horizontalDashes);
  const verticalCrosswalk = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.35, 0.65), crosswalkMat, verticalCrosswalkPositions.length);
  verticalCrosswalkPositions.forEach(([x, z], index) => { marker.position.set(x, 0.055, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); verticalCrosswalk.setMatrixAt(index, marker.matrix); });
  scene.add(verticalCrosswalk);
  const horizontalCrosswalk = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.65, 1.35), crosswalkMat, horizontalCrosswalkPositions.length);
  horizontalCrosswalkPositions.forEach(([x, z], index) => { marker.position.set(x, 0.057, z); marker.rotation.set(-Math.PI / 2, 0, 0); marker.updateMatrix(); horizontalCrosswalk.setMatrixAt(index, marker.matrix); });
  scene.add(horizontalCrosswalk);
  const addFlatRoadInstances = (geometry, material, positions, y) => {
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    positions.forEach(([x, z], index) => {
      marker.position.set(x, y, z);
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
      marker.position.set(x, y, z);
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
  const palmTrunk = new THREE.MeshStandardMaterial({ color: 0x755b40, roughness: 0.9 });
  const palmLeaf = new THREE.MeshStandardMaterial({ color: 0x236c59, roughness: 0.86 });
  const neon = [0xff668a, 0x45d7dc, 0xf2c968];
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
  const addCourtyardTree = (parent, x, z, height = 4.2) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, height * 0.55, 7), palmTrunk);
    trunk.position.set(x, height * 0.275, z);
    trunk.castShadow = true;
    parent.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(height * 0.34, height * 0.62, 7), palmLeaf);
    crown.position.set(x, height * 0.69, z);
    crown.castShadow = true;
    parent.add(crown);
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
    const paving = new THREE.MeshStandardMaterial({ color: lotGrassPalette[Math.floor(random() * lotGrassPalette.length)], roughness: 0.92 });
    const hardstand = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), paving);
    hardstand.rotation.x = -Math.PI / 2;
    hardstand.position.set(cx, -0.065, cz);
    hardstand.receiveShadow = true;
    lot.add(hardstand);
    lotRegions.push({ x: cx, z: cz, halfWidth: 38, halfDepth: 38 });
    const amenityRoll = random();
    const amenityType = amenityRoll < 0.32 ? 'garden' : amenityRoll < 0.63 ? 'playground' : 'plaza';
    addCourtyardAmenity(lot, cx, cz, amenityType);
    // Quelques blocs resserrent les façades autour d'une ruelle ; d'autres gardent une maisonnette.
    const alleyBlock = Math.abs(bx * 7 + bz * 3) % 5 === 0;
    const cottageBlock = !alleyBlock && Math.abs(bx * 3 + bz * 7) % 4 === 0;
    const count = alleyBlock ? 2 : 2 + Math.floor(random() * 3);
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
      const height = isCottage ? 6.2 + random() * 1.6 : 10 + random() * (Math.abs(bx) + Math.abs(bz) < 4 ? 35 : 21);
      const x = cx + slotX + (random() - 0.5) * 3;
      const z = cz + slotZ + (random() - 0.5) * 3;
      const frontSign = slotZ < 0 ? -1 : 1;
      const frontZ = z + frontSign * (depth / 2 + 0.1);
      const frontageRoll = random();
      const hasShop = !isCottage && frontageRoll < 0.42;
      const hasGarage = !isCottage && frontageRoll >= 0.42 && frontageRoll < 0.61;
      const garageWidth = Math.min(6.4, width * 0.38);
      const garageCenterX = x - width * 0.18;
      const entryX = isCottage ? x : hasGarage ? x + width * 0.34 : x + width * 0.28;
      const color = palette[Math.floor(random() * palette.length)];
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
      const signMat = new THREE.MeshBasicMaterial({ color: neon[Math.floor(random() * neon.length)], toneMapped: false });
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
      parkedCarSpecs.push({ ...spot, type: parkedType.id, width: parkedType.width, length: parkedType.length });
    }
    // Palms and Deco lamp posts on block corners, kept outside the carriageway.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = cx + sx * 37;
      const pz = cz + sz * 37;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 8, 8), palmTrunk);
      trunk.position.set(px, 4, pz); trunk.castShadow = true; lot.add(trunk);
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.42, 5.2, 5), palmLeaf);
        frond.position.set(px + Math.cos(leaf * Math.PI / 2) * 1.8, 7.4, pz + Math.sin(leaf * Math.PI / 2) * 1.8);
        frond.rotation.z = -0.6; frond.rotation.y = leaf * Math.PI / 2; lot.add(frond);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 6, 6), new THREE.MeshStandardMaterial({ color: 0x34383b, metalness: 0.7, roughness: 0.4 }));
      pole.position.set(px + sx * 5, 3, pz + sz * 5); lot.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd49a, toneMapped: false }));
      lamp.position.set(px + sx * 5, 6.1, pz + sz * 5); lot.add(lamp);
    }
  }
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

  // Grillages galvanisés en sections indépendantes pour qu'ils disparaissent au choc.
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
    car.position.set(spec.x, 0, spec.z);
    car.rotation.y = spec.yaw;
    car.userData.beacons?.forEach((beacon) => { beacon.material.opacity = 0; });
    scene.add(car);
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
    const approaches = [
      { axis: 'x', x: x - 8.5, z: z + 8.5, yaw: -Math.PI / 2 },
      { axis: 'x', x: x + 8.5, z: z - 8.5, yaw: Math.PI / 2 },
      { axis: 'z', x: x - 8.5, z: z - 8.5, yaw: Math.PI },
      { axis: 'z', x: x + 8.5, z: z + 8.5, yaw: 0 },
    ];
    for (const approach of approaches) {
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
    ];
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
    carRoot.position.set(spec.x, 0, spec.z);
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
    marker.position.set(spec.supportX, 3.3, spec.supportZ);
    marker.rotation.set(0, 0, 0);
    marker.scale.set(1, 1, 1);
    marker.updateMatrix();
    overheadSignalPoles.setMatrixAt(index, marker.matrix);
    const armDx = spec.x - spec.supportX;
    const armDz = spec.z - spec.supportZ;
    const armLength = Math.hypot(armDx, armDz) + 0.4;
    marker.position.set((spec.x + spec.supportX) / 2, 6.48, (spec.z + spec.supportZ) / 2);
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
  const insideRegion = (region, x, z) => Math.abs(x - region.x) <= region.halfWidth && Math.abs(z - region.z) <= region.halfDepth;
  const surfaceHeight = (x, z) => {
    if (sidewalkRegions.some((region) => insideRegion(region, x, z))) return sidewalkHeight;
    if (lotRegions.some((region) => insideRegion(region, x, z))) return -0.065;
    const roadX = Math.abs(x - Math.round(x / BLOCK) * BLOCK) <= ROAD_HALF;
    const roadZ = Math.abs(z - Math.round(z / BLOCK) * BLOCK) <= ROAD_HALF;
    return roadX || roadZ ? 0 : -0.12;
  };
  const hideFenceInstance = (mesh, index) => {
    marker.position.set(0, -1000, 0);
    marker.rotation.set(0, 0, 0);
    marker.scale.set(1, 1, 1);
    marker.updateMatrix();
    mesh.setMatrixAt(index, marker.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  };
  const breakFencesAt = (x, z) => {
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
      broken += 1;
    }
    return broken;
  };
  return {
    ground, roadMat, sidewalkMat, buildingFootprints, parkedCarSpecs, fenceSegments,
    trafficIntersections, updateTrafficSignals, surfaceHeight, breakFencesAt,
  };
}

export default function ViceCityFreeRoam({ carId, onExit }) {
  const mountRef = useRef(null);
  const hudRef = useRef(null);
  const onExitRef = useRef(onExit);
  const touchKeysRef = useRef(new Set());
  onExitRef.current = onExit;
  const setTouchKey = (code, pressed) => {
    if (pressed) touchKeysRef.current.add(code);
    else touchKeysRef.current.delete(code);
  };
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0b28f);
    scene.fog = new THREE.Fog(0xf0b28f, 135, 560);
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
    vehicle.position.set(0, 0, 0);
    scene.add(vehicle);
    const trafficDirections = [
      { axis: 'x', direction: 1 }, { axis: 'x', direction: -1 },
      { axis: 'z', direction: 1 }, { axis: 'z', direction: -1 },
    ];
    const trafficCars = Array.from({ length: 8 }, (_, index) => {
      const directionSpec = trafficDirections[Math.floor(index / 2)];
      const withinDirection = index % 2;
      const routeIndex = ((Math.floor(index / 2) * 2 + withinDirection * 3 + 1) % 7) - 3;
      const crossAxis = directionSpec.axis === 'x'
        ? routeIndex * BLOCK + directionSpec.direction * 2.35
        : routeIndex * BLOCK - directionSpec.direction * 2.35;
      const progress = withinDirection === 0 ? -220 : 175;
      const trafficType = CITY_RUSH_TRAFFIC_TYPES[index % CITY_RUSH_TRAFFIC_TYPES.length];
      const car = makeTrafficVehicle(trafficType.id);
      const yaw = directionSpec.axis === 'x'
        ? directionSpec.direction > 0 ? -Math.PI / 2 : Math.PI / 2
        : directionSpec.direction > 0 ? Math.PI : 0;
      car.position.set(directionSpec.axis === 'x' ? progress : crossAxis, 0, directionSpec.axis === 'z' ? progress : crossAxis);
      car.rotation.y = yaw;
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
      };
    });
    const keys = new Set();
    const state = { x: 0, z: 0, heading: 0, speed: 0, steer: 0, time: 0 };
    const updateTraffic = (dt) => {
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
        let signalState = viceCityTrafficSignalState(traffic.axis, intersectionXIndex, intersectionZIndex, state.time);
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
        if (traffic.direction > 0 && traffic.progress > CITY_LIMIT + 20) {
          traffic.progress = -CITY_LIMIT - 20;
          traffic.speed = 0;
        } else if (traffic.direction < 0 && traffic.progress < -CITY_LIMIT - 20) {
          traffic.progress = CITY_LIMIT + 20;
          traffic.speed = 0;
        }
        traffic.car.position.set(
          traffic.axis === 'x' ? traffic.progress : traffic.crossAxis,
          0.02,
          traffic.axis === 'z' ? traffic.progress : traffic.crossAxis,
        );
        traffic.car.userData.wheels?.forEach((wheel) => { wheel.rotation.x += traffic.speed * dt * 0.95; });
        traffic.car.userData.beacons?.forEach((beacon, beaconIndex) => {
          const flashing = Math.floor(state.time * 8 + traffic.phase + beaconIndex) % 2 === 0;
          beacon.material.opacity = flashing ? 1 : 0.18;
        });
      }
    };
    const onDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ'].includes(event.code)) {
        event.preventDefault(); keys.add(event.code);
      }
      if (event.code === 'Escape') { event.preventDefault(); onExitRef.current?.(); }
    };
    const onUp = (event) => keys.delete(event.code);
    const blur = () => { keys.clear(); touchKeysRef.current.clear(); };
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
    const isPositionBlocked = (x, z) => {
      const hitsBuilding = city.buildingFootprints.some((building) =>
        Math.abs(x - building.x) < building.halfWidth + 2.1
        && Math.abs(z - building.z) < building.halfDepth + 2.1);
      if (hitsBuilding) return true;
      const hitsMovingCar = trafficCars.some(({ car }) => {
        const dx = x - car.position.x;
        const dz = z - car.position.z;
        const cosine = Math.cos(car.rotation.y);
        const sine = Math.sin(car.rotation.y);
        const localX = dx * cosine - dz * sine;
        const localZ = dx * sine + dz * cosine;
        const halfWidth = Math.max(2.1, (car.userData.width || 1.94) / 2 + 1.05);
        const halfLength = Math.max(4.35, (car.userData.length || 4.0) / 2 + 2.2);
        return Math.abs(localX) < halfWidth && Math.abs(localZ) < halfLength;
      });
      if (hitsMovingCar) return true;
      return city.parkedCarSpecs.some((car) => {
        const dx = x - car.x;
        const dz = z - car.z;
        const cosine = Math.cos(car.yaw);
        const sine = Math.sin(car.yaw);
        const localX = dx * cosine - dz * sine;
        const localZ = dx * sine + dz * cosine;
        const halfWidth = Math.max(2.0, (car.width || 1.94) / 2 + 1.05);
        const halfLength = Math.max(4.2, (car.length || 4.0) / 2 + 2.1);
        return Math.abs(localX) < halfWidth && Math.abs(localZ) < halfLength;
      });
    };
    let frame = 0; let last = performance.now(); let hudAt = 0;
    const animate = (now) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.04, Math.max(0, (now - last) / 1000)); last = now; state.time += dt;
      updateTraffic(dt);
      const pressed = (code) => keys.has(code) || touchKeysRef.current.has(code);
      const throttle = pressed('ArrowUp') || pressed('KeyW');
      const brake = pressed('ArrowDown') || pressed('KeyS');
      const steerInput = (pressed('ArrowRight') || pressed('KeyD') ? 1 : 0) - (pressed('ArrowLeft') || pressed('KeyA') || pressed('KeyQ') ? 1 : 0);
      state.speed = viceCityFreeDriveSpeedStep({
        speed: state.speed,
        throttle,
        brake,
        dt,
        maxSpeed,
        acceleration,
        reverseMaxSpeed,
      });
      // Le braquage monte progressivement tant qu’on maintient la touche ;
      // un appui bref reste doux et le volant se recentre vite au relâchement.
      state.steer = viceCityFreeDriveSteerStep(state.steer, steerInput, dt);
      state.heading += viceCityFreeDriveYawRate(state.speed, state.steer) * dt;
      // Les modèles du garage pointent le capot vers leur axe local -Z.
      forward.set(Math.sin(state.heading), 0, -Math.cos(state.heading));
      const nextX = state.x + forward.x * state.speed * dt;
      const nextZ = state.z + forward.z * state.speed * dt;
      if (city.breakFencesAt(nextX, nextZ) > 0) state.speed *= 0.88;
      // Conduite libre partout dans la ville : les trottoirs et les espaces
      // ouverts restent franchissables, seuls les bâtiments et véhicules garés bloquent.
      if (!isPositionBlocked(nextX, nextZ)) {
        state.x = nextX;
        state.z = nextZ;
      } else {
        const deltaX = nextX - state.x;
        const deltaZ = nextZ - state.z;
        const canSlideX = Math.abs(deltaX) > 1e-6 && !isPositionBlocked(nextX, state.z);
        const canSlideZ = Math.abs(deltaZ) > 1e-6 && !isPositionBlocked(state.x, nextZ);
        if (canSlideX && (!canSlideZ || Math.abs(deltaX) >= Math.abs(deltaZ))) state.x = nextX;
        else if (canSlideZ) state.z = nextZ;
        state.speed *= canSlideX || canSlideZ ? 0.72 : 0.18;
      }
      if (Math.abs(state.x) > CITY_LIMIT || Math.abs(state.z) > CITY_LIMIT) {
        state.x = clamp(state.x, -CITY_LIMIT, CITY_LIMIT); state.z = clamp(state.z, -CITY_LIMIT, CITY_LIMIT); state.speed = 0;
      }
      vehicle.position.set(state.x, city.surfaceHeight(state.x, state.z), state.z);
      vehicle.rotation.y = -state.heading;
      animateRacerCar(vehicle, { speed: state.speed, maxSpeed, steer: state.steer * 0.4, braking: brake && state.speed >= 0, idle: !throttle && !brake && state.speed === 0 }, dt, state.time);
      cameraPosition.copy(vehicle.position).addScaledVector(forward, -6.8);
      cameraPosition.y += 3.2;
      camera.position.lerp(cameraPosition, 1 - Math.exp(-dt * 5.2));
      cameraTarget.set(state.x + forward.x * 5.5, 1.05, state.z + forward.z * 5.5);
      camera.lookAt(cameraTarget);
      if (now - hudAt > 80 && hudRef.current) {
        hudAt = now;
        hudRef.current.innerHTML = `<b>${Math.round(Math.abs(state.speed) * 3.6)}</b><small>KM/H</small>`;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('blur', blur);
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
      <div className="vice-free-roam-world" ref={mountRef} />
      <header className="vice-free-roam-header">
        <div className="vice-free-roam-brand"><span>VICE CITY</span><b>FREE DRIVE</b><small>OCEAN DISTRICT · 1986</small></div>
        <div className="vice-free-roam-location"><i /> CONDUITE LIBRE <span>—</span> AUCUNE COURSE</div>
        <button type="button" onClick={onExit}>↶ MENU</button>
      </header>
      <div className="vice-free-roam-speed" ref={hudRef}><b>0</b><small>KM/H</small></div>
      <div className="vice-free-roam-controls"><b>COMMANDES</b><span><kbd>↑</kbd> ACCÉLÉRER</span><span><kbd>↓</kbd> FREIN · RECUL À L’ARRÊT</span><span><kbd>←</kbd><kbd>→</kbd> BRAQUER</span><small>WASD également disponibles · Échap pour quitter</small></div>
      <div className="vice-free-roam-touch" aria-label="Commandes tactiles de conduite">
        {[
          ['ArrowLeft', '←', 'Tourner à gauche'], ['ArrowUp', '↑', 'Accélérer'],
          ['ArrowDown', '↓', 'Freiner et reculer à l’arrêt'], ['ArrowRight', '→', 'Tourner à droite'],
        ].map(([code, label, title]) => (
          <button key={code} type="button" aria-label={title} title={title}
            onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); setTouchKey(code, true); }}
            onPointerUp={() => setTouchKey(code, false)} onPointerCancel={() => setTouchKey(code, false)}
            onLostPointerCapture={() => setTouchKey(code, false)}>{label}</button>
        ))}
      </div>
      <div className="vice-free-roam-compass">VC <i>N</i><span>OCEAN GRID · 06 × 06</span></div>
    </div>
  );
}
