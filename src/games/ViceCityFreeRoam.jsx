import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CITY_RUSH_CARS } from './cityRushRules.js';
import { makeRacerCar, animateRacerCar } from './cityRushRacerModels.js';
import { viceCityFreeDriveSpeedStep } from './viceCityFreeDrive.js';
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
  const lotPavingPalette = [0x77736d, 0x807970, 0x6b7073, 0x898175, 0x6e7470];
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
  for (let bx = -3; bx < 3; bx += 1) for (let bz = -3; bz < 3; bz += 1) {
    const cx = (bx + 0.5) * BLOCK;
    const cz = (bz + 0.5) * BLOCK;
    const lot = new THREE.Group();
    scene.add(lot);
    const paving = new THREE.MeshStandardMaterial({ color: lotPavingPalette[Math.floor(random() * lotPavingPalette.length)], roughness: 0.92 });
    const hardstand = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), paving);
    hardstand.rotation.x = -Math.PI / 2;
    hardstand.position.set(cx, -0.065, cz);
    hardstand.receiveShadow = true;
    lot.add(hardstand);
    lotRegions.push({ x: cx, z: cz, halfWidth: 38, halfDepth: 38 });
    // Parcelles plus serrées : plusieurs commerces et immeubles bordent chaque bloc.
    const count = 2 + Math.floor(random() * 3);
    const buildingSlots = [[-27, -27], [27, -27], [-27, 27], [27, 27]];
    for (let i = 0; i < count; i += 1) {
      const width = 20 + random() * 6;
      const depth = 20 + random() * 6;
      const height = 10 + random() * (Math.abs(bx) + Math.abs(bz) < 4 ? 35 : 21);
      const [slotX, slotZ] = buildingSlots[i];
      const x = cx + slotX + (random() - 0.5) * 3;
      const z = cz + slotZ + (random() - 0.5) * 3;
      const frontSign = slotZ < 0 ? -1 : 1;
      const frontZ = z + frontSign * (depth / 2 + 0.1);
      const frontageRoll = random();
      const hasShop = frontageRoll < 0.42;
      const hasGarage = frontageRoll >= 0.42 && frontageRoll < 0.61;
      const garageWidth = Math.min(6.4, width * 0.38);
      const garageCenterX = x - width * 0.18;
      const entryX = hasGarage ? x + width * 0.34 : x + width * 0.28;
      const color = palette[Math.floor(random() * palette.length)];
      const facade = new THREE.MeshStandardMaterial({ color, roughness: 0.83, metalness: 0.02 });
      const building = addBox(lot, facade, x, 0.1, z, width, height, depth, true);
      building.userData.cityBuilding = true;
      buildingFootprints.push({ x, z, halfWidth: width / 2, halfDepth: depth / 2 });
      // Roof parapet and stepped art-deco crown.
      const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.78), roughness: 0.88 });
      addBox(lot, capMat, x, height + 0.1, z, width + 0.7, 0.7, depth + 0.7);
      if (height > 28) {
        addBox(lot, facade, x, height + 0.8, z, width * 0.54, 4.5, depth * 0.72, true);
      }
      // Tall window bands, a shopfront at street level, and selected lit windows.
      const floors = Math.max(2, Math.floor(height / 4.2));
      // Pilastres verticaux et balcons étagés : une silhouette Art déco moins cubique.
      for (const side of [-1, 1]) {
        addBox(lot, capMat, x + side * width * 0.45, 0.1, z + frontSign * (depth / 2 + 0.13), 0.34, height, 0.24);
      }
      const balconyLevels = Math.min(3, Math.floor((height - 8) / 12));
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
      // Back alley HVAC and rooftop water tank detail.
      if (random() > 0.45) addBox(lot, capMat, x + width * 0.25, height + 0.8, z, 2.8, 1.6, 2.8);
    }
    // Voitures garées en bord de rue : le quadrillage paraît habité et donne
    // une échelle plus crédible aux immeubles et aux chaussées.
    const horizontalParked = (bx - bz) % 3 === 0;
    const parkingSide = (bx + bz) % 4 < 2 ? -1 : 1;
    const parkingSegmentStart = horizontalParked ? bx * BLOCK : bz * BLOCK;
    for (const alongStreet of parkingStallCenters(parkingSegmentStart)) {
      parkedCarSpecs.push(horizontalParked
        ? { x: alongStreet, z: bz * BLOCK + parkingSide * 5.3, yaw: Math.PI / 2, color: Math.floor(random() * 6) }
        : { x: bx * BLOCK + parkingSide * 5.3, z: alongStreet, yaw: 0, color: Math.floor(random() * 6) });
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
  // Parking urbain en InstancedMesh : voitures détaillées, mais peu d'appels de rendu.
  const carPaint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.36 });
  const parkedGlass = new THREE.MeshStandardMaterial({ color: 0x233441, roughness: 0.18, metalness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.88 });
  const headlamp = new THREE.MeshBasicMaterial({ color: 0xffedc4, toneMapped: false });
  const tailLamp = new THREE.MeshBasicMaterial({ color: 0xff4e57, toneMapped: false });
  const carPaintColors = [0xd74f59, 0x2b8594, 0xe2c875, 0xd8dedc, 0x4d5c72, 0xd48659];
  const carRoot = new THREE.Object3D();
  const carPart = new THREE.Object3D();
  const carMatrix = new THREE.Matrix4();
  const addCarInstances = (specs, geometry, material, pose, colorize = false) => {
    const mesh = new THREE.InstancedMesh(geometry, material, specs.length);
    specs.forEach((spec, index) => {
      carRoot.position.set(spec.x, 0, spec.z);
      carRoot.rotation.set(0, spec.yaw, 0);
      carRoot.updateMatrix();
      carPart.position.set(...pose.position);
      carPart.rotation.set(...pose.rotation);
      carPart.scale.set(...(pose.scale || [1, 1, 1]));
      carPart.updateMatrix();
      carMatrix.multiplyMatrices(carRoot.matrix, carPart.matrix);
      mesh.setMatrixAt(index, carMatrix);
      if (colorize) mesh.setColorAt(index, new THREE.Color(carPaintColors[spec.color]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  addCarInstances(parkedCarSpecs, new THREE.BoxGeometry(1.9, 0.78, 4.2), carPaint, { position: [0, 0.78, 0], rotation: [0, 0, 0] }, true);
  addCarInstances(parkedCarSpecs, new THREE.BoxGeometry(1.52, 0.74, 2.15), parkedGlass, { position: [0, 1.48, 0.05], rotation: [0, 0, 0] });
  addCarInstances(parkedCarSpecs, new THREE.BoxGeometry(1.36, 0.12, 1.82), carPaint, { position: [0, 1.91, 0.05], rotation: [0, 0, 0] }, true);
  const wheels = [];
  parkedCarSpecs.forEach((spec) => {
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      wheels.push({ ...spec, x: spec.x, z: spec.z, local: [side * 0.98, 0.38, end * 1.27] });
    }
  });
  const wheelMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), rubber, wheels.length);
  wheels.forEach((spec, index) => {
    carRoot.position.set(spec.x, 0, spec.z); carRoot.rotation.set(0, spec.yaw, 0); carRoot.updateMatrix();
    carPart.position.set(...spec.local); carPart.rotation.set(0, 0, Math.PI / 2); carPart.updateMatrix();
    carMatrix.multiplyMatrices(carRoot.matrix, carPart.matrix); wheelMesh.setMatrixAt(index, carMatrix);
  });
  wheelMesh.instanceMatrix.needsUpdate = true; wheelMesh.castShadow = true; scene.add(wheelMesh);
  const lights = (front) => parkedCarSpecs.flatMap((spec) => [-1, 1].map((side) => ({
    ...spec,
    local: [side * 0.58, 0.83, front ? -2.1 : 2.1],
  })));
  const addLampInstances = (geometry, material, lightSpecs) => {
    const mesh = new THREE.InstancedMesh(geometry, material, lightSpecs.length);
    lightSpecs.forEach((spec, index) => {
      carRoot.position.set(spec.x, 0, spec.z); carRoot.rotation.set(0, spec.yaw, 0); carRoot.updateMatrix();
      carPart.position.set(...spec.local); carPart.rotation.set(0, 0, 0); carPart.updateMatrix();
      carMatrix.multiplyMatrices(carRoot.matrix, carPart.matrix); mesh.setMatrixAt(index, carMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true; scene.add(mesh);
  };
  addLampInstances(new THREE.BoxGeometry(0.42, 0.17, 0.08), headlamp, lights(true));
  addLampInstances(new THREE.BoxGeometry(0.42, 0.17, 0.08), tailLamp, lights(false));

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
  return { ground, roadMat, sidewalkMat, buildingFootprints, parkedCarSpecs, surfaceHeight };
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
    const keys = new Set();
    const state = { x: 0, z: 0, heading: 0, speed: 0, steer: 0, time: 0 };
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
      return city.parkedCarSpecs.some((car) => {
        const dx = x - car.x;
        const dz = z - car.z;
        const cosine = Math.cos(car.yaw);
        const sine = Math.sin(car.yaw);
        const localX = dx * cosine - dz * sine;
        const localZ = dx * sine + dz * cosine;
        return Math.abs(localX) < 2.0 && Math.abs(localZ) < 4.2;
      });
    };
    let frame = 0; let last = performance.now(); let hudAt = 0;
    const animate = (now) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.04, Math.max(0, (now - last) / 1000)); last = now; state.time += dt;
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
      // Le volant répond plus directement ; il garde une petite inertie plutôt
      // qu'une interpolation molle au début du braquage.
      state.steer += (steerInput - state.steer) * Math.min(1, dt * 16);
      // Braquage plus direct et réserve d'adhérence accrue pour des virages
      // urbains plus francs, tout en gardant un rayon qui s'élargit avec la vitesse.
      const wheelAngle = state.steer * 0.63;
      const wheelbase = 2.75;
      const requestedYawRate = (state.speed / wheelbase) * Math.tan(wheelAngle);
      const gripYawLimit = Math.abs(state.speed) > 0.1 ? (1.9 * 9.81) / Math.abs(state.speed) : 0;
      const yawRate = clamp(requestedYawRate, -gripYawLimit, gripYawLimit);
      state.heading += yawRate * dt;
      // Les modèles du garage pointent le capot vers leur axe local -Z.
      forward.set(Math.sin(state.heading), 0, -Math.cos(state.heading));
      const nextX = state.x + forward.x * state.speed * dt;
      const nextZ = state.z + forward.z * state.speed * dt;
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
      animateRacerCar(vehicle, { speed: state.speed, maxSpeed, steer: state.steer * 0.56, braking: brake && state.speed >= 0, idle: !throttle && !brake && state.speed === 0 }, dt, state.time);
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
