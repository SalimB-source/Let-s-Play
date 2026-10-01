import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CITY_RUSH_DISTANCE,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_LANE_X,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_CARS,
  CITY_RUSH_CITIES,
  addCityRushCharge,
  approachCityRushSpeed,
  cityRushHitDuration,
  chooseCityRushAiLane,
  cityRushLaneAfterAction,
  consumeCityRushCharge,
  createCityRushEncounter,
  createCityRushInventory,
  cityRushHelicopterTarget,
  rankCityRushRacers,
  resolveCityRushCarMovement,
} from './cityRushRules';

const PLAYER_Z = 3.1;
const PLAYER_SPEED = CITY_RUSH_PLAYER_SPEED;
const CAMERA_BASE_FOV = 44;
const ROAD_LOOP = 286;
const MAX_FRAME = 0.04;
const POWER_TYPES = ['oil', 'pistol', 'cash', 'radio'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const randomRange = (min, max) => min + Math.random() * (max - min);

function animateBoostFlames(car, enabled, time, speed, maxSpeed) {
  car.userData.boostFlames?.forEach((flame, index) => {
    flame.group.visible = enabled;
    if (!enabled) return;
    const pulse = 0.82 + Math.sin(time * 34 + index * Math.PI) * 0.18;
    const thrust = clamp((speed / Math.max(1, maxSpeed)) * pulse, 0.55, 1.35);
    flame.group.scale.set(0.82 + pulse * 0.22, 0.72 + pulse * 0.34, thrust);
    flame.outer.material.opacity = 0.58 + pulse * 0.3;
    flame.inner.material.opacity = 0.66 + pulse * 0.3;
  });
}

function standard(color, extra = {}) {
  // Mirage Rush's faceted, block-built look: no smooth material shading and
  // deliberately simple geometry instead of glossy realistic car meshes.
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.04, flatShading: true, ...extra });
}

function addBox(parent, geometry, material, position, scale, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function makeCanvasTexture(draw, width = 512, height = 160) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  return texture;
}

function makeNeonSignMaterial(text, accent, secondary) {
  const texture = makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(8, 11, 26, .9)';
    ctx.fillRect(3, 3, width - 6, height - 6);
    ctx.lineWidth = 6;
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 57px Arial, sans-serif';
    ctx.fillStyle = secondary;
    ctx.shadowColor = secondary;
    ctx.shadowBlur = 18;
    ctx.fillText(text, width / 2, height / 2 + 3, width - 28);
  });
  return new THREE.MeshBasicMaterial({ map: texture, transparent: false, toneMapped: false });
}

function makePickupMaterial(type, color) {
  const texture = makeCanvasTexture((ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.fillStyle = `${color}2a`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 69, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'cash') {
      ctx.fillStyle = color;
      ctx.fillRect(31, 44, 194, 104);
      ctx.strokeStyle = '#f3fff7';
      ctx.lineWidth = 5;
      ctx.strokeRect(42, 55, 172, 82);
      ctx.beginPath();
      ctx.arc(128, 96, 27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f3fff7';
      ctx.font = '900 53px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 128, 97);
    } else if (type === 'oil') {
      // Clé à molette, dessinée comme un pictogramme arcade très lisible.
      ctx.beginPath();
      ctx.moveTo(75, 149);
      ctx.lineTo(151, 72);
      ctx.lineTo(171, 91);
      ctx.lineTo(95, 169);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(144, 55);
      ctx.arc(177, 49, 31, Math.PI * 0.78, Math.PI * 1.85, true);
      ctx.lineTo(185, 64);
      ctx.lineTo(165, 83);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(177, 49, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(83, 158, 17, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'pistol') {
      ctx.beginPath();
      ctx.moveTo(49, 70);
      ctx.lineTo(183, 70);
      ctx.lineTo(205, 88);
      ctx.lineTo(175, 105);
      ctx.lineTo(132, 105);
      ctx.lineTo(124, 148);
      ctx.lineTo(93, 148);
      ctx.lineTo(96, 105);
      ctx.lineTo(54, 105);
      ctx.closePath();
      ctx.fill();
      ctx.clearRect(151, 74, 37, 12);
      ctx.fillStyle = color;
      ctx.fillRect(162, 75, 44, 8);
    } else {
      // Talkie-walkie jaune avec antenne et bouton latéral.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(96, 51);
      ctx.lineTo(112, 24);
      ctx.lineTo(149, 24);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(74, 48, 108, 129, 16);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(93, 70, 70, 39);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 138, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(158, 120, 9, 36);
    }
  }, 256, 256);
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}

function makeCityBuilding(city, index, side, shared) {
  const group = new THREE.Group();
  const width = randomRange(4.1, 5.9);
  const depth = randomRange(4.2, 6.2);
  const heightBase = city.style === 'vice' ? 8 : city.style === 'tokyo' ? 10 : 12;
  const height = randomRange(heightBase, heightBase + (city.style === 'new-york' ? 16 : 10));
  const colorIndex = Math.abs(index * 7 + side * 3) % city.buildingColors.length;
  const bodyMat = shared.buildings[colorIndex];
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
  body.position.y = height / 2;
  group.add(body);

  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.48, depth + 0.18), shared.base);
  base.position.y = 0.28;
  group.add(base);

  const frontWindows = [];
  const columns = Math.max(3, Math.floor(width / 0.76));
  const rows = Math.max(3, Math.floor(height / 1.22));
  for (let row = 1; row <= rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = -width / 2 + (column + 0.5) * width / columns;
      const y = 0.85 + row * (height - 1.2) / (rows + 1);
      frontWindows.push([x, y, depth / 2 + 0.035]);
    }
  }
  const windowMesh = new THREE.InstancedMesh(shared.windowGeometry, shared.windows, frontWindows.length);
  const temp = new THREE.Object3D();
  frontWindows.forEach(([x, y, z], windowIndex) => {
    temp.position.set(x, y, z);
    temp.scale.set(0.35, 0.53, 1);
    temp.updateMatrix();
    windowMesh.setMatrixAt(windowIndex, temp.matrix);
    if (windowIndex % 4 === 0) windowMesh.setColorAt(windowIndex, new THREE.Color(city.accent));
  });
  windowMesh.instanceMatrix.needsUpdate = true;
  if (windowMesh.instanceColor) windowMesh.instanceColor.needsUpdate = true;
  group.add(windowMesh);

  if (city.style === 'vice') {
    for (const band of [height * 0.34, height * 0.77]) {
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.22, depth + 0.34), shared.accentTrim);
      ledge.position.y = band;
      group.add(ledge);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.9, depth * 0.7), shared.roof);
    roof.position.y = height + 0.4;
    group.add(roof);
  } else if (city.style === 'paris') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.76, 1.7, 4), shared.roof);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = height + 0.82;
    group.add(roof);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(width + 0.32, 0.28, depth + 0.34), shared.accentTrim);
    cornice.position.y = height - 0.25;
    group.add(cornice);
  } else if (city.style === 'london') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.72, 1.45, 4), shared.roof);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = height + 0.7;
    group.add(roof);
    const brickLine = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.19, depth + 0.12), shared.accentTrim);
    brickLine.position.y = height * 0.64;
    group.add(brickLine);
  } else if (city.style === 'new-york') {
    const setback = new THREE.Mesh(new THREE.BoxGeometry(width * 0.68, 1.8, depth * 0.7), shared.roof);
    setback.position.y = height + 0.9;
    group.add(setback);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.09, 2.8, 5), shared.accentTrim);
    antenna.position.set(0, height + 3.05, 0);
    group.add(antenna);
  } else {
    const rooftop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.52, 1.2, depth * 0.55), shared.roof);
    rooftop.position.y = height + 0.6;
    group.add(rooftop);
  }

  if (index % 2 === 0 || city.style === 'tokyo') {
    const signIndex = Math.abs(index + side) % shared.signs.length;
    const sign = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 1.02, 0.2), shared.signBack);
    back.position.y = height * 0.63;
    back.position.z = depth / 2 + 0.2;
    sign.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.74, 0.86), shared.signs[signIndex]);
    face.position.set(0, height * 0.63, depth / 2 + 0.31);
    sign.add(face);
    group.add(sign);
  }

  return { group, width, depth, height };
}

function makePalmTree(side, shared) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 5.7, 6), shared.palmTrunk);
  trunk.position.y = 2.85;
  trunk.rotation.z = side < 0 ? -0.055 : 0.055;
  group.add(trunk);
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const angle = (leaf / 7) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.22, 3.6, 5), shared.palmLeaf);
    frond.position.set(Math.cos(angle) * 1.15, 5.15 - Math.abs(Math.cos(angle)) * 0.12, Math.sin(angle) * 1.15);
    frond.rotation.z = -Math.cos(angle) * 0.75;
    frond.rotation.x = Math.sin(angle) * 0.5;
    frond.rotation.y = angle;
    group.add(frond);
  }
  return group;
}

function makeStreetLamp(side, shared) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 5.8, 6), shared.lampPole);
  pole.position.y = 2.9;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.08), shared.lampPole);
  arm.position.set(-side * 0.48, 5.55, 0);
  group.add(arm);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), shared.lampGlow);
  bulb.position.set(-side * 0.96, 5.48, 0);
  group.add(bulb);
  return group;
}

function makeLandmark(city, shared) {
  const group = new THREE.Group();
  if (city.style === 'paris') {
    const metal = shared.landmark;
    for (const x of [-1.2, 1.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.43, 7.2, 4), metal);
      leg.position.set(x, 3.6, 0);
      leg.rotation.z = x < 0 ? -0.17 : 0.17;
      group.add(leg);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.4, 0.46), metal);
    deck.position.y = 3.3;
    group.add(deck);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.35, 0.38), metal);
    upper.position.y = 5.45;
    group.add(upper);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.36, 2.2, 5), metal);
    spire.position.y = 7.0;
    group.add(spire);
    for (const y of [1.1, 2.0, 4.35]) {
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(y === 2 ? 2.7 : 2.1, 0.16, 0.28), metal);
      crossbar.position.y = y;
      group.add(crossbar);
    }
  } else if (city.style === 'london') {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.1, 12, 3), shared.landmark);
    tower.position.y = 6;
    group.add(tower);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), shared.clockFace);
    clock.position.set(0, 8.7, 1.54);
    group.add(clock);
    const clockBorder = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.09, 7, 24), shared.clockTrim);
    clockBorder.position.set(0, 8.7, 1.59);
    group.add(clockBorder);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 3.5, 4), shared.roof);
    roof.position.y = 13.7;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 2.7, 5), shared.landmark);
    spire.position.y = 16.5;
    group.add(spire);
  } else if (city.style === 'new-york') {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.5, 24, 4.2), shared.landmark);
    tower.position.y = 12;
    group.add(tower);
    for (let step = 0; step < 4; step += 1) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(4.5 - step * 0.72, 2.3, 4.2 - step * 0.58), shared.roof);
      tier.position.y = 24 + step * 2.0;
      group.add(tier);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.17, 8, 6), shared.landmark);
    antenna.position.y = 34;
    group.add(antenna);
  } else if (city.style === 'tokyo') {
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 2.2, 19, 4), shared.landmark);
    legs.position.y = 9.5;
    legs.rotation.y = Math.PI / 4;
    group.add(legs);
    for (const y of [5, 10, 15]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.28, 4), shared.clockTrim);
      ring.position.y = y;
      group.add(ring);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 4.5, 4), shared.landmark);
    spire.position.y = 21;
    group.add(spire);
  } else {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 11, 4), shared.landmark);
    tower.position.y = 5.5;
    group.add(tower);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.3, 4.7), shared.accentTrim);
    crown.position.y = 11.7;
    group.add(crown);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.8), shared.signs[0]);
    sign.position.set(0, 11.7, 2.43);
    group.add(sign);
  }
  return group;
}

function makeConvertible(bodyColor, accentColor, driverColor, player = false, profile = {}) {
  const group = new THREE.Group();
  const bodyMat = standard(bodyColor, { metalness: 0.06, roughness: 0.82, emissive: bodyColor, emissiveIntensity: player ? 0.06 : 0.015 });
  const trimMat = standard(accentColor, { metalness: 0.05, roughness: 0.8 });
  const blackMat = standard(0x111722, { roughness: 0.9 });
  const chromeMat = standard(0xa9beca, { metalness: 0.28, roughness: 0.58 });
  const seatMat = standard(0x432a43, { roughness: 0.78 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x6fe7ed, transparent: true, opacity: 0.42, roughness: 0.34, metalness: 0.04, flatShading: true, side: THREE.DoubleSide });
  const headMat = standard(driverColor, { roughness: 0.88 });
  const hairMat = standard(player ? 0x342235 : 0x262839, { roughness: 0.9 });
  const lightRed = new THREE.MeshBasicMaterial({ color: 0xff4465, toneMapped: false });
  const lightWhite = new THREE.MeshBasicMaterial({ color: 0xfff5d6, toneMapped: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: player ? 0.3 : 0.11, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.42, 3.18), bodyMat);
  chassis.position.set(0, 0.48, 0);
  group.add(chassis);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 3.04), blackMat);
  floor.position.set(0, 0.31, 0);
  group.add(floor);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.34, 1.08), bodyMat);
  hood.position.set(0, 0.71, -0.91);
  group.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.32, 0.87), bodyMat);
  trunk.position.set(0, 0.69, 1.08);
  group.add(trunk);
  if (profile.id === 'muscle-86') {
    const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.48), trimMat);
    hoodScoop.position.set(0, 0.98, -0.92);
    group.add(hoodScoop);
  } else if (profile.id === 'turbo-gt') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 0.26), trimMat);
    spoiler.position.set(0, 1.08, 1.48);
    group.add(spoiler);
    for (const x of [-0.58, 0.58]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.12), chromeMat);
      support.position.set(x, 0.94, 1.42);
      group.add(support);
    }
  }
  if (profile.id !== 'muscle-86') {
    for (const x of [-0.23, 0.23]) {
      const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.64), trimMat);
      hoodStripe.position.set(x, 0.89, -0.92);
      group.add(hoodStripe);
    }
  }
  const sideLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.31, 2.02), trimMat);
  sideLeft.position.set(-0.88, 0.72, 0.03);
  group.add(sideLeft);
  const sideRight = sideLeft.clone();
  sideRight.position.x = 0.88;
  group.add(sideRight);
  for (const side of [-1, 1]) {
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.25, 1.02), bodyMat);
    doorPanel.position.set(side * 0.94, 0.61, 0.42);
    group.add(doorPanel);
    const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.18), chromeMat);
    doorHandle.position.set(side * 0.98, 0.76, 0.28);
    group.add(doorHandle);
    const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.2), chromeMat);
    mirrorStem.position.set(side * 0.98, 1.02, -0.57);
    group.add(mirrorStem);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.19), trimMat);
    mirror.position.set(side * 1.04, 1.08, -0.58);
    group.add(mirror);
  }

  // Habitacle ouvert et pilote cubique, assis côté gauche (x négatif vu
  // depuis la caméra derrière la voiture), comme un personnage voxel de
  // Mirage Rush. Le siège droit reste vide : c'est bien un cabriolet à deux
  // places, pas un personnage posé au milieu du tableau de bord.
  const driverX = -0.43;
  for (const x of [driverX, 0.44]) {
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.62), seatMat);
    seatBase.position.set(x, 0.69, 0.27);
    group.add(seatBase);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.35, 0.14), seatMat);
    seatBack.position.set(x, 0.91, 0.43);
    group.add(seatBack);
    const seatHeadrest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.13), seatMat);
    seatHeadrest.position.set(x, 1.08, 0.43);
    group.add(seatHeadrest);
  }
  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.17, 0.25), blackMat);
  dashboard.position.set(0, 0.91, -0.58);
  group.add(dashboard);
  const dashDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.035), trimMat);
  dashDisplay.position.set(-0.45, 1.03, -0.69);
  group.add(dashDisplay);
  const dashGauge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.035), lightWhite);
  dashGauge.position.set(0.02, 1.03, -0.69);
  group.add(dashGauge);
  const clothesMat = standard(player ? 0xf2d36c : accentColor, { roughness: 0.9 });
  const driverBody = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.34), clothesMat);
  driverBody.position.set(driverX, 1.16, 0.04);
  group.add(driverBody);
  const driverHead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), headMat);
  driverHead.position.set(driverX, 1.55, -0.015);
  group.add(driverHead);
  for (const eyeX of [driverX - 0.08, driverX + 0.08]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.025), blackMat);
    eye.position.set(eyeX, 1.57, -0.205);
    group.add(eye);
  }
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.4), hairMat);
  hairCap.position.set(driverX, 1.79, 0.005);
  group.add(hairCap);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.14), hairMat);
  hairBack.position.set(driverX, 1.64, 0.22);
  group.add(hairBack);
  const steeringWheel = new THREE.Group();
  const wheelTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.055, 0.055), blackMat);
  wheelTop.position.y = 0.15;
  steeringWheel.add(wheelTop);
  const wheelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.3, 0.055), blackMat);
  wheelLeft.position.x = -0.2;
  steeringWheel.add(wheelLeft);
  const wheelRight = wheelLeft.clone();
  wheelRight.position.x = 0.2;
  steeringWheel.add(wheelRight);
  const wheelBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.055, 0.055), blackMat);
  wheelBase.position.y = 0.01;
  steeringWheel.add(wheelBase);
  steeringWheel.position.set(driverX, 1.02, -0.54);
  group.add(steeringWheel);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.15), clothesMat);
    arm.position.set(driverX + side * 0.25, 1.19, -0.27);
    arm.rotation.z = side * 0.24;
    arm.rotation.x = -0.42;
    group.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), headMat);
    hand.position.set(driverX + side * 0.2, 1.08, -0.46);
    group.add(hand);
  }

  // Pare-brise cubique et incliné, sans toit : silhouette de décapotable.
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 0.06), glassMat);
  windshield.position.set(0, 1.32, -0.61);
  windshield.rotation.x = -0.24;
  group.add(windshield);
  for (const x of [-0.79, 0.79]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.62, 0.07), chromeMat);
    pillar.position.set(x, 1.31, -0.55);
    pillar.rotation.x = -0.25;
    group.add(pillar);
  }
  const glassTop = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.065, 0.07), chromeMat);
  glassTop.position.set(0, 1.59, -0.63);
  group.add(glassTop);

  // Pare-chocs, calandre et feux distincts à l'arrière.
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.15, 0.13), chromeMat);
  rearBumper.position.set(0, 0.43, 1.66);
  group.add(rearBumper);
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.14, 0.13), chromeMat);
  frontBumper.position.set(0, 0.42, -1.65);
  group.add(frontBumper);
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.045), blackMat);
  frontGrille.position.set(0, 0.55, -1.67);
  group.add(frontGrille);
  for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) {
    const grilleSlat = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.028), chromeMat);
    grilleSlat.position.set(x, 0.55, -1.7);
    group.add(grilleSlat);
  }
  const rearLights = [];
  for (const x of [-0.62, 0.62]) {
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.055), lightRed);
    taillight.position.set(x, 0.67, 1.64);
    group.add(taillight);
    rearLights.push(taillight);
    const tailDetail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.035), lightWhite);
    tailDetail.position.set(x * 0.72, 0.67, 1.68);
    group.add(tailDetail);
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.15, 0.055), lightWhite);
    headlight.position.set(x, 0.68, -1.62);
    group.add(headlight);
    const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0xffb84d, toneMapped: false }));
    indicator.position.set(x * 1.18, 0.66, -1.64);
    group.add(indicator);
  }
  for (const x of [-0.48, 0.48]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 6), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(x, 0.38, 1.76);
    group.add(exhaust);
  }

  const wheels = [];
  const frontWheels = [];
  const wheelMat = standard(0x11131b, { roughness: 0.88 });
  const hubMat = standard(0xcbd4da, { metalness: 0.82, roughness: 0.2 });
  const brakeMat = standard(0x873d54, { metalness: 0.32, roughness: 0.54 });
  for (const x of [-0.94, 0.94]) {
    for (const z of [-1.05, 1.05]) {
      const fender = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.58), bodyMat);
      fender.position.set(x, 0.69, z);
      group.add(fender);
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.2, 8), wheelMat);
      tire.rotation.z = Math.PI / 2;
      wheel.add(tire);
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8), brakeMat);
      brake.rotation.z = Math.PI / 2;
      brake.position.x = x < 0 ? -0.105 : 0.105;
      wheel.add(brake);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.215, 8), hubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = x < 0 ? -0.01 : 0.01;
      wheel.add(hub);
      for (let spokeIndex = 0; spokeIndex < 4; spokeIndex += 1) {
        const angle = (spokeIndex / 4) * Math.PI;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.25, 0.04), chromeMat);
        spoke.position.set(x < 0 ? -0.125 : 0.125, Math.cos(angle) * 0.065, Math.sin(angle) * 0.065);
        spoke.rotation.x = angle;
        wheel.add(spoke);
      }
      wheel.position.set(x, 0.34, z);
      group.add(wheel);
      wheels.push(wheel);
      if (z < 0) frontWheels.push(wheel);
    }
  }
  const underglow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.8), glowMat);
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.14;
  group.add(underglow);

  const boostFlames = [];
  for (const x of [-0.48, 0.48]) {
    const flameAssembly = new THREE.Group();
    const outerFlame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.68), new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.86, toneMapped: false, depthWrite: false }));
    outerFlame.position.z = 0.34;
    const innerFlame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.46), new THREE.MeshBasicMaterial({ color: 0xfff2ad, transparent: true, opacity: 0.94, toneMapped: false, depthWrite: false }));
    innerFlame.position.z = 0.39;
    flameAssembly.add(outerFlame, innerFlame);
    flameAssembly.position.set(x, 0.42, 1.65);
    flameAssembly.visible = false;
    group.add(flameAssembly);
    boostFlames.push({ group: flameAssembly, outer: outerFlame, inner: innerFlame });
  }

  group.userData = { wheels, frontWheels, steeringWheel, body: chassis, driver: driverBody, underglow, rearLights, boostFlames, player, profileId: profile.id || null };
  const viewScale = player ? 1 : 0.88;
  group.scale.set(
    viewScale * (profile.widthScale || 1),
    viewScale * (profile.heightScale || 1),
    viewScale * (profile.lengthScale || 1),
  );
  return group;
}

function makeTrafficVehicle(type) {
  const spec = CITY_RUSH_TRAFFIC_TYPES.find((vehicle) => vehicle.id === type) || CITY_RUSH_TRAFFIC_TYPES[0];
  const isTruck = type === 'garbage-truck';
  const isSportsCar = type === 'white-lambo';
  const police = type === 'police';
  const ambulance = type === 'ambulance';
  const bodyColor = police ? 0xf4f4ed : ambulance ? 0xf8f7ef : isTruck ? 0x57965a : 0xf6f7f5;
  const accentColor = police ? 0x142947 : ambulance ? 0xe64a50 : isTruck ? 0xe0b847 : 0x202a37;
  const bodyMat = standard(bodyColor, { roughness: 0.72 });
  const accentMat = standard(accentColor, { roughness: 0.76 });
  const glassMat = standard(isSportsCar ? 0x142b3b : 0x21394b, { metalness: 0.1, roughness: 0.26 });
  const darkMat = standard(0x121923, { roughness: 0.88 });
  const chromeMat = standard(0xbac7cc, { metalness: 0.45, roughness: 0.35 });
  const lightRedMat = new THREE.MeshBasicMaterial({ color: 0xff293f, toneMapped: false });
  const lightBlueMat = new THREE.MeshBasicMaterial({ color: 0x28baff, toneMapped: false });
  const warmLightMat = new THREE.MeshBasicMaterial({ color: 0xffefb4, toneMapped: false });
  const group = new THREE.Group();
  const width = spec.width;
  const length = spec.length;
  const box = (size, material, position) => addBox(group, new THREE.BoxGeometry(...size), material, position, [1, 1, 1]);

  box([width, 0.38, length * 0.9], bodyMat, [0, 0.5, 0]);
  box([width * 0.96, 0.25, isTruck ? 1.05 : 0.92], bodyMat, [0, 0.72, isTruck ? -1.55 : -length * 0.29]);
  if (isTruck) {
    box([width * 0.76, 0.5, 1.25], bodyMat, [0, 0.98, -1.46]);
    box([width * 0.69, 0.29, 0.055], glassMat, [0, 1.1, -2.1]);
    box([width * 0.78, 0.11, 1.08], bodyMat, [0, 1.31, -1.45]);
    for (const side of [-1, 1]) {
      box([0.045, 0.21, 0.56], glassMat, [side * (width * 0.39), 1.12, -1.46]);
    }
    box([width * 0.92, 1.08, 2.38], bodyMat, [0, 1.13, 0.55]);
    box([width * 0.94, 0.12, 2.43], accentMat, [0, 1.73, 0.55]);
    for (const x of [-0.58, -0.28, 0, 0.28, 0.58]) {
      box([0.055, 0.82, 0.06], accentMat, [x, 1.1, 1.77]);
    }
    for (const side of [-1, 1]) {
      box([0.055, 0.72, 1.92], accentMat, [side * (width * 0.47), 1.12, 0.62]);
      box([0.065, 0.12, 1.64], chromeMat, [side * (width * 0.5), 0.99, 0.62]);
    }
  } else {
    box([width * 0.9, 0.22, 0.72], bodyMat, [0, 0.68, length * 0.3]);
    const cabinZ = isSportsCar ? -0.04 : -0.02;
    const cabinLength = isSportsCar ? 1.28 : 1.53;
    const roofY = isSportsCar ? 1.2 : 1.43;
    box([width * 0.78, 0.34, cabinLength], bodyMat, [0, 0.93, cabinZ]);
    box([width * 0.73, 0.28, cabinLength * 0.82], glassMat, [0, 1.17, cabinZ]);
    box([width * 0.81, 0.11, cabinLength * 0.9], isSportsCar ? accentMat : bodyMat, [0, roofY, cabinZ]);
    box([width * 0.7, 0.23, 0.055], glassMat, [0, 1.16, cabinZ - cabinLength * 0.47]);
    box([width * 0.7, 0.2, 0.055], glassMat, [0, 1.15, cabinZ + cabinLength * 0.47]);
    for (const side of [-1, 1]) {
      box([0.045, 0.2, cabinLength * 0.37], glassMat, [side * (width * 0.4), 1.17, cabinZ - 0.02]);
    }
    if (isSportsCar) {
      box([width * 0.92, 0.08, 0.2], accentMat, [0, 1.0, length * 0.37]);
      for (const x of [-0.62, 0.62]) box([0.1, 0.22, 0.12], accentMat, [x, 0.91, length * 0.34]);
    }
  }

  const frontZ = -length * 0.48;
  const rearZ = length * 0.48;
  box([width * 0.76, 0.12, 0.12], chromeMat, [0, 0.43, frontZ]);
  box([width * 0.8, 0.12, 0.12], chromeMat, [0, 0.43, rearZ]);
  for (const x of [-width * 0.34, width * 0.34]) {
    box([0.25, 0.13, 0.05], warmLightMat, [x, 0.67, frontZ - 0.015]);
    box([0.29, 0.14, 0.06], lightRedMat, [x, 0.68, rearZ + 0.015]);
  }
  box([0.42, 0.14, 0.045], darkMat, [0, 0.58, frontZ - 0.02]);

  if (police) {
    for (const side of [-1, 1]) {
      box([0.045, 0.22, 0.82], accentMat, [side * (width * 0.51), 0.78, 0.14]);
      box([0.05, 0.16, 0.3], bodyMat, [side * (width * 0.53), 0.78, 0.14]);
    }
  } else if (ambulance) {
    for (const side of [-1, 1]) {
      box([0.05, 0.13, 1.48], accentMat, [side * (width * 0.51), 0.76, 0.16]);
      box([0.06, 0.38, 0.12], lightRedMat, [side * (width * 0.54), 1.0, 0.16]);
      box([0.06, 0.12, 0.38], lightRedMat, [side * (width * 0.54), 1.0, 0.16]);
    }
    box([0.58, 0.34, 0.05], accentMat, [0, 1.2, rearZ - 0.025]);
    box([0.1, 0.27, 0.06], bodyMat, [0, 1.2, rearZ - 0.055]);
    box([0.34, 0.1, 0.06], bodyMat, [0, 1.2, rearZ - 0.055]);
  }

  const beacons = [];
  if (police || ambulance) {
    box([0.98, 0.08, 0.25], darkMat, [0, 1.53, -0.02]);
    const beaconRed = new THREE.MeshBasicMaterial({ color: 0xff293f, transparent: true, opacity: 1, toneMapped: false });
    const beaconBlue = new THREE.MeshBasicMaterial({ color: 0x28baff, transparent: true, opacity: 1, toneMapped: false });
    const beaconAmber = new THREE.MeshBasicMaterial({ color: 0xffd568, transparent: true, opacity: 1, toneMapped: false });
    const leftBeacon = box([0.34, 0.16, 0.22], beaconRed, [-0.27, 1.65, -0.02]);
    const rightBeacon = box([0.34, 0.16, 0.22], police ? beaconBlue : beaconAmber, [0.27, 1.65, -0.02]);
    beacons.push(leftBeacon, rightBeacon);
  }

  const wheels = [];
  const wheelAxles = isTruck ? [-1.48, 0.92, 1.48] : [-length * 0.29, length * 0.29];
  for (const x of [-width * 0.49, width * 0.49]) {
    for (const z of wheelAxles) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(isTruck ? 0.32 : 0.28, isTruck ? 0.32 : 0.28, 0.19, 8), darkMat);
      tire.rotation.z = Math.PI / 2;
      wheel.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.205, 8), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      wheel.position.set(x, 0.34, z);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  group.userData = { trafficType: type, wheels, beacons, width, length };
  return group;
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
  group.userData = { icon, ring, phase: Math.random() * Math.PI * 2, type: 'cash' };
  return group;
}

function setPickupKind(pickup, type, lane, shared) {
  pickup.userData.type = type;
  pickup.userData.icon.material = shared.pickupMaterials[type];
  pickup.userData.ring.material = shared.pickupRingMaterials[type];
  pickup.position.set(CITY_RUSH_LANE_X[lane], 1.3, 0);
  pickup.visible = true;
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
  // Petit hélico voxel : cubes francs, pare-brise cyan, train et rotor en blocs.
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
  group.userData = { rotor, tailRotor };
  group.visible = false;
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
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), shared.impactCore);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 4, 10), shared.impactRing);
  ring.rotation.x = Math.PI / 2;
  group.add(core, ring);
  group.userData = { core, ring, age: 0, visibleUntil: 0 };
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
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  renderer.dispose();
  renderer.domElement.remove();
}

function createCityRushWorld(mount, city, getCallbacks, selectedCarId = CITY_RUSH_CARS[0].id) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(city.background);
  scene.fog = new THREE.Fog(city.fog, 44, 190);

  const camera = new THREE.PerspectiveCamera(CAMERA_BASE_FOV, 1, 0.1, 260);
  // Cadrage un peu plus serré et plus bas pour mieux remplir l’écran avec
  // la route, sans couper la voiture du joueur au premier plan.
  camera.position.set(0, 8.8, PLAYER_Z + 14.5);
  camera.lookAt(0, 1.05, PLAYER_Z - 8.5);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.domElement.className = 'city-rush-canvas';
  renderer.domElement.setAttribute('aria-label', `Course de cabriolets 3D dans ${city.name} : change de voie, ramasse des objets et évite les zones de ralentissement.`);
  mount.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xc5e9ff, 0x1d1728, 2.05);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xffd2a2, 2.2);
  keyLight.position.set(-9, 18, 7);
  scene.add(keyLight);
  const cityRim = new THREE.DirectionalLight(new THREE.Color(city.secondary), 1.15);
  cityRim.position.set(8, 8, -24);
  scene.add(cityRim);
  const pinkFill = new THREE.PointLight(new THREE.Color(city.accent), 22, 54, 2);
  pinkFill.position.set(0, 7, -27);
  scene.add(pinkFill);

  const shared = {
    buildings: city.buildingColors.map((color) => standard(color, { roughness: 0.82, metalness: 0.04 })),
    base: standard(city.style === 'paris' ? 0x9c806d : 0x283143),
    windows: standard(city.windowColor, { emissive: city.windowColor, emissiveIntensity: 0.72, roughness: 0.34 }),
    windowGeometry: new THREE.BoxGeometry(0.34, 0.53, 0.035),
    roof: standard(city.style === 'paris' ? 0x393144 : city.style === 'vice' ? 0x704560 : 0x333747, { roughness: 0.72 }),
    accentTrim: standard(Number.parseInt(city.accent.slice(1), 16), { emissive: Number.parseInt(city.accent.slice(1), 16), emissiveIntensity: 0.25, metalness: 0.22 }),
    signBack: standard(0x0b1020, { metalness: 0.3, roughness: 0.5 }),
    signs: city.signs.map((text, index) => makeNeonSignMaterial(text, city.accent, index % 2 ? city.secondary : '#fff3cc')),
    lampPole: standard(0x303947, { metalness: 0.64, roughness: 0.32 }),
    lampGlow: new THREE.MeshBasicMaterial({ color: city.secondary, toneMapped: false }),
    palmTrunk: standard(0x83553c),
    palmLeaf: standard(0x248c77, { roughness: 0.82 }),
    landmark: standard(city.style === 'london' ? 0x8c715e : city.style === 'paris' ? 0x68717a : 0x627c9c, { metalness: 0.25, roughness: 0.55 }),
    clockFace: new THREE.MeshBasicMaterial({ color: 0xffeac4, toneMapped: false }),
    clockTrim: standard(city.accent.slice(1) ? Number.parseInt(city.accent.slice(1), 16) : 0xffc763, { metalness: 0.4 }),
    road: standard(city.asphalt, { roughness: 0.94, metalness: 0.025 }),
    sidewalk: standard(city.sidewalk, { roughness: 0.9 }),
    roadMark: new THREE.MeshBasicMaterial({ color: 0xb9e1e4, transparent: true, opacity: 0.76, toneMapped: false }),
    roadEdge: new THREE.MeshBasicMaterial({ color: city.accent, transparent: true, opacity: 0.85, toneMapped: false }),
    curb: standard(0x6c6676, { roughness: 0.88 }),
    pickupGeometry: new THREE.PlaneGeometry(1.5, 1.5),
    pickupRingGeometry: new THREE.TorusGeometry(0.82, 0.06, 4, 12),
    pickupMaterials: Object.fromEntries(POWER_TYPES.map((type) => [type, makePickupMaterial(type, CITY_RUSH_POWER_RULES[type].color)])),
    pickupRingMaterials: Object.fromEntries(POWER_TYPES.map((type) => [type, new THREE.MeshBasicMaterial({ color: CITY_RUSH_POWER_RULES[type].color, transparent: true, opacity: 0.95, toneMapped: false })])),
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
    missileBody: standard(0xffd260, { metalness: 0.56, roughness: 0.25, emissive: 0x9a310f, emissiveIntensity: 0.4 }),
    missileNose: standard(0xff5b76, { emissive: 0xaa2149, emissiveIntensity: 0.4 }),
    missileTrail: new THREE.MeshBasicMaterial({ color: 0xffa454, transparent: true, opacity: 0.8, toneMapped: false }),
    impactCore: new THREE.MeshBasicMaterial({ color: 0xffe39a, transparent: true, opacity: 0.94, toneMapped: false }),
    impactRing: new THREE.MeshBasicMaterial({ color: city.accent, transparent: true, opacity: 0.85, toneMapped: false }),
  };

  // Ciel de coucher de soleil, un disque graphique sans image externe.
  const sunMaterial = new THREE.MeshBasicMaterial({ color: city.skyGlow, transparent: true, opacity: 0.76, side: THREE.DoubleSide, toneMapped: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(12, 42), sunMaterial);
  sun.position.set(0, 29, -185);
  scene.add(sun);
  const horizonGlow = new THREE.Mesh(new THREE.PlaneGeometry(190, 72), new THREE.MeshBasicMaterial({ color: city.skyTop, transparent: true, opacity: 0.28, side: THREE.DoubleSide, toneMapped: false }));
  horizonGlow.position.set(0, 7, -175);
  scene.add(horizonGlow);

  // Route large, vide de barrières : seulement des marquages et des zones au sol.
  const road = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 360), shared.road);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.055, -143);
  scene.add(road);
  for (const side of [-1, 1]) {
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 360), shared.sidewalk);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(side * 8.24, -0.07, -143);
    scene.add(sidewalk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 360), shared.curb);
    curb.position.set(side * 6.72, 0.01, -143);
    scene.add(curb);
    const neonLine = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.025, 360), shared.roadEdge);
    neonLine.position.set(side * 6.6, 0.025, -143);
    scene.add(neonLine);
  }

  const movingDashes = [];
  const separatorXs = [-2.1, 0, 2.1];
  for (const x of separatorXs) {
    for (let index = 0; index < 23; index += 1) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 4.15), shared.roadMark);
      dash.position.set(x, 0.012, 9 - index * 12.7);
      scene.add(dash);
      movingDashes.push(dash);
    }
  }
  for (const side of [-1, 1]) {
    for (let index = 0; index < 17; index += 1) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 1.45), shared.roadEdge);
      dash.position.set(side * 6.32, 0.018, 8 - index * 17.3);
      scene.add(dash);
      movingDashes.push(dash);
    }
  }

  const citySegments = [];
  const segmentSpacing = 29;
  const segmentCount = 11;
  for (let index = 0; index < segmentCount; index += 1) {
    const segment = new THREE.Group();
    for (const side of [-1, 1]) {
      const building = makeCityBuilding(city, index, side, shared);
      building.group.position.set(side * (9.95 + (index % 3) * 0.22), 0, (index % 2 ? -4 : 4));
      segment.add(building.group);
      if (city.style === 'vice' && index % 2 === 0) {
        const palm = makePalmTree(side, shared);
        palm.position.set(side * 7.15, 0, index % 4 ? 4.2 : -5.2);
        palm.scale.setScalar(0.82 + (index % 3) * 0.06);
        segment.add(palm);
      } else if (index % 2 === 0) {
        const lamp = makeStreetLamp(side, shared);
        lamp.position.set(side * 7.03, 0, index % 4 ? 4.4 : -4.6);
        segment.add(lamp);
      }
    }
    segment.position.z = -20 - index * segmentSpacing;
    scene.add(segment);
    citySegments.push(segment);
  }
  const landmark = makeLandmark(city, shared);
  landmark.position.set(city.style === 'paris' || city.style === 'london' ? 17 : -17, 0, -124);
  landmark.scale.setScalar(city.style === 'new-york' ? 1.08 : city.style === 'tokyo' ? 0.94 : 0.82);
  scene.add(landmark);

  const playerProfile = CITY_RUSH_CARS.find((car) => car.id === selectedCarId) || CITY_RUSH_CARS[0];
  const rivalProfiles = CITY_RUSH_CARS.filter((car) => car.id !== playerProfile.id);
  const playerCar = makeConvertible(playerProfile.bodyColor, playerProfile.trimColor, playerProfile.driverColor, true, playerProfile);
  playerCar.position.set(CITY_RUSH_LANE_X[1], 0, PLAYER_Z);
  scene.add(playerCar);

  const racerSpecs = [
    { id: 'nova', name: 'NOVA', lane: 3, phase: 0.6, changeIn: 1.4, skidSide: 1 },
    { id: 'juno', name: 'JUNO', lane: 0, phase: 2.4, changeIn: 2.1, skidSide: -1 },
    { id: 'ace', name: 'ACE', lane: 2, phase: 4.5, changeIn: 3.2, skidSide: 1 },
  ];
  const racers = racerSpecs.map((spec, index) => {
    const profile = rivalProfiles[index];
    return {
      ...spec,
      profile,
      distance: 0,
      baseSpeed: PLAYER_SPEED * profile.powerMultiplier,
      currentSpeed: 0,
      mesh: makeConvertible(profile.bodyColor, profile.trimColor, profile.driverColor, false, profile),
      currentX: CITY_RUSH_LANE_X[spec.lane],
      slowLeft: 0,
      boostLeft: 0,
      stunLeft: 0,
      skidLeft: 0,
      inventory: createCityRushInventory(),
      powerCooldown: 0,
    };
  });
  racers.forEach((racer) => scene.add(racer.mesh));

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
      phase: index * 0.9,
    };
  });

  const rows = [];
  for (let index = 0; index < 12; index += 1) {
    const group = new THREE.Group();
    const slots = [makePickupObject(shared), makePickupObject(shared)];
    slots.forEach((slot) => group.add(slot));
    const slowZone = makeSlowZone(shared, false);
    group.add(slowZone);
    scene.add(group);
    rows.push({ group, slots, slowZone, trackDistance: 0, pickups: [], slowLane: null, checked: false, zoneHits: new Set(), pickupClaims: new Set(), crossedRacers: new Set() });
  }

  const oilTraps = [];
  const actionPulses = [];
  const pistolShots = [];
  const helicopter = makeHelicopter(shared);
  const missile = makeMissile(shared);
  const impact = makeImpact(shared);
  scene.add(helicopter, missile, impact);
  let strike = null;
  let lastDistanceSlot = 0;
  let lastTrafficDistanceSlot = 0;

  let active = false;
  let elapsed = 0;
  let distance = 0;
  let playerLane = 1;
  let playerX = CITY_RUSH_LANE_X[playerLane];
  let playerSlowLeft = 0;
  let playerBoostLeft = 0;
  let playerStunLeft = 0;
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

  const makeRacerRows = () => [
    { id: 'player', name: 'TOI', distance, lane: playerLane, mesh: playerCar },
    ...racers.map((racer) => ({ id: racer.id, name: racer.name, distance: racer.distance, lane: racer.lane, mesh: racer.mesh })),
  ];

  function setupEncounter(row) {
    const encounter = createCityRushEncounter(randomSeed);
    row.pickups = encounter.pickups;
    row.slowLane = encounter.slowLane;
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
      setupEncounter(row);
      row.trackDistance = next;
      row.group.position.set(0, 0, PLAYER_Z - (row.trackDistance - distance) * CITY_RUSH_SCROLL_SCALE);
      next += randomRange(24, 32);
    }
    lastDistanceSlot = next;
  }

  function emitHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHudAt < 120) return;
    lastHudAt = now;
    const standings = rankCityRushRacers(makeRacerRows());
    getCallbacks().hud?.({
      distance: Math.max(0, Math.round(distance)),
      totalDistance: CITY_RUSH_DISTANCE,
      progress: clamp(distance / CITY_RUSH_DISTANCE, 0, 1),
      elapsed,
      speed: Math.max(0, Math.round(currentSpeed * 3.6)),
      rank: standings.rank,
      racers: standings.ordered.map((racer, index) => ({
        id: racer.id,
        name: racer.name,
        distance: Math.max(0, Math.min(CITY_RUSH_DISTANCE, Math.round(racer.distance))),
        progress: clamp(racer.distance / CITY_RUSH_DISTANCE, 0, 1),
        rank: index + 1,
        lane: racer.lane,
      })),
      inventory: { ...inventory },
      playerLane,
      slowLeft: playerSlowLeft,
      boostLeft: playerBoostLeft,
      stunLeft: playerStunLeft,
      score,
      pickups: pickedUp,
      leader: standings.leader?.name || '—',
    });
  }

  function reset() {
    active = false;
    clearVisualEffects();
    elapsed = 0;
    distance = 0;
    playerLane = 1;
    playerX = CITY_RUSH_LANE_X[playerLane];
    playerSlowLeft = 0;
    playerBoostLeft = 0;
    playerStunLeft = 0;
    playerSkidLeft = 0;
    playerSkidSide = 1;
    score = 0;
    pickedUp = 0;
    inventory = createCityRushInventory();
    finished = false;
    currentSpeed = 0;
    playerCurrentSpeed = 0;
    strike = null;
    helicopter.visible = false;
    missile.visible = false;
    impact.visible = false;
    oilTraps.forEach((trap) => scene.remove(trap.mesh));
    oilTraps.length = 0;
    playerCar.position.set(playerX, 0, PLAYER_Z);
    playerCar.rotation.set(0, 0, 0);
    racers.forEach((racer, index) => {
      racer.distance = 0;
      racer.currentSpeed = 0;
      racer.lane = [3, 0, 2][index];
      racer.currentX = CITY_RUSH_LANE_X[racer.lane];
      racer.changeIn = 0.22 + index * 0.08;
      racer.slowLeft = 0;
      racer.boostLeft = 0;
      racer.stunLeft = 0;
      racer.skidLeft = 0;
      racer.inventory = createCityRushInventory();
      racer.powerCooldown = 0;
      racer.mesh.position.set(racer.currentX, 0, PLAYER_Z);
      racer.mesh.visible = true;
      racer.mesh.rotation.set(0, 0, 0);
    });
    trafficCars.forEach((traffic, index) => {
      traffic.spawnCount = 0;
      traffic.distance = 82 + index * 68 + randomRange(-7, 7);
      traffic.lane = CITY_RUSH_TRAFFIC_LANES[index];
      traffic.currentX = CITY_RUSH_LANE_X[traffic.lane];
      traffic.currentSpeed = traffic.baseSpeed;
      traffic.mesh.position.set(traffic.currentX, 0, PLAYER_Z - traffic.distance * CITY_RUSH_SCROLL_SCALE);
      traffic.mesh.visible = true;
      traffic.mesh.rotation.set(0, 0, 0);
      traffic.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.set(0, 0, 0); });
      traffic.mesh.userData.beacons.forEach((beacon) => { beacon.material.opacity = 1; });
    });
    lastTrafficDistanceSlot = trafficCars[trafficCars.length - 1].distance + randomRange(60, 78);
    setRowsToStart();
    movingDashes.forEach((dash, index) => {
      if (index < 69) dash.position.z = 9 - (index % 23) * 12.7;
      else dash.position.z = 8 - ((index - 69) % 17) * 17.3;
    });
    citySegments.forEach((segment, index) => { segment.position.z = -20 - index * segmentSpacing; });
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
    ];
    return others.sort((a, b) => {
      const aAhead = a.distance >= attackerDistance - 4 ? 0 : 1;
      const bAhead = b.distance >= attackerDistance - 4 ? 0 : 1;
      if (aAhead !== bAhead) return aAhead - bAhead;
      return Math.abs(a.distance - attackerDistance) - Math.abs(b.distance - attackerDistance);
    })[0] || null;
  }

  function getTargetForRadio(callerId = 'player') {
    return cityRushHelicopterTarget(makeRacerRows(), callerId);
  }

  function getVehicleMesh(vehicleId) {
    if (vehicleId === 'player') return playerCar;
    return racers.find((racer) => racer.id === vehicleId)?.mesh || null;
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
    const ringParts = [
      { geometry: new THREE.BoxGeometry(1.25, 0.075, 0.075), position: [0, 0, -0.57] },
      { geometry: new THREE.BoxGeometry(1.25, 0.075, 0.075), position: [0, 0, 0.57] },
      { geometry: new THREE.BoxGeometry(0.075, 0.075, 1.25), position: [-0.57, 0, 0] },
      { geometry: new THREE.BoxGeometry(0.075, 0.075, 1.25), position: [0.57, 0, 0] },
    ];
    ringParts.forEach(({ geometry, position }) => {
      const bar = new THREE.Mesh(geometry, ringMaterial);
      bar.position.set(...position);
      group.add(bar);
    });
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), coreMaterial);
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

  function makePistolBolt() {
    const group = new THREE.Group();
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xff526e, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.94, depthWrite: false, toneMapped: false });
    const burstMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd5c, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.55), coreMaterial);
    const trail = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.095, 0.72), trailMaterial);
    trail.position.z = -0.52;
    const burst = new THREE.Group();
    [
      new THREE.BoxGeometry(0.56, 0.09, 0.09),
      new THREE.BoxGeometry(0.09, 0.56, 0.09),
      new THREE.BoxGeometry(0.09, 0.09, 0.56),
    ].forEach((geometry) => burst.add(new THREE.Mesh(geometry, burstMaterial)));
    burst.visible = false;
    group.add(core, trail, burst);
    group.userData = { core, trail, burst, coreMaterial, trailMaterial, burstMaterial };
    return group;
  }

  function firePistolShot(attackerId, targetId) {
    if (!getVehicleMesh(attackerId) || !getVehicleMesh(targetId)) return;
    const mesh = makePistolBolt();
    scene.add(mesh);
    pistolShots.push({ mesh, attackerId, targetId, age: 0, phase: 'flight', hitPoint: new THREE.Vector3() });
  }

  function updateVisualEffects(dt) {
    for (let index = actionPulses.length - 1; index >= 0; index -= 1) {
      const pulse = actionPulses[index];
      pulse.age += dt;
      const progress = clamp(pulse.age / pulse.duration, 0, 1);
      const source = getVehicleMesh(pulse.sourceId);
      if (source) pulse.mesh.position.copy(source.position).add(new THREE.Vector3(0, 1.1 + progress * 0.24, 0));
      pulse.mesh.scale.setScalar(0.18 + progress * 1.2);
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
      if (shot.phase === 'flight') {
        shot.age += dt;
        const progress = clamp(shot.age / 0.3, 0, 1);
        const source = getVehicleMesh(shot.attackerId);
        const target = targetPosition(shot.targetId, new THREE.Vector3());
        const start = source ? source.position.clone().add(new THREE.Vector3(0, 0.78, -1.12)) : target;
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
  }

  function startStrike(target) {
    if (strike) {
      getCallbacks().effect?.({ type: 'radio-busy', message: 'L’hélicoptère est déjà en route.' });
      return false;
    }
    if (!target) return false;
    strike = { targetId: target.id, targetName: target.name, phase: 'approach', elapsed: 0, start: new THREE.Vector3(14, 12, -18) };
    helicopter.visible = true;
    helicopter.position.copy(strike.start);
    missile.visible = false;
    impact.visible = false;
    getCallbacks().effect?.({ type: 'radio', target: target.name, targetId: target.id });
    return true;
  }

  function usePower(type) {
    if (!active || finished) return;
    if (type === 'radio' && strike) {
      getCallbacks().effect?.({ type: 'radio-busy', message: 'L’hélicoptère est déjà en route.' });
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
      getCallbacks().effect?.({ type: 'cash', duration: CITY_RUSH_POWER_RULES.cash.duration });
    } else if (type === 'oil') {
      spawnOilTrap(playerLane);
      getCallbacks().effect?.({ type: 'oil', lane: playerLane });
    } else if (type === 'pistol') {
      const target = findPistolTarget();
      if (target) firePistolShot('player', target.id);
      if (target?.racer) {
        const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.pistol.duration, target.racer.profile);
        target.racer.slowLeft = Math.max(target.racer.slowLeft, duration);
        target.racer.skidLeft = 0.85;
        target.racer.skidSide = Math.random() < 0.5 ? -1 : 1;
        getCallbacks().effect?.({ type: 'pistol', target: target.name, targetId: target.id, duration });
      }
    } else if (type === 'radio') {
      const target = getTargetForRadio();
      startStrike(target);
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
        firePistolShot(racer.id, target.id);
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
        startStrike(target);
      }
      return true;
    }
    return false;
  }

  function canEnterLane(actorId, targetLane) {
    const targetX = CITY_RUSH_LANE_X[targetLane];
    const actor = racers.find((racer) => racer.id === actorId);
    const actorDistance = actorId === 'player' ? distance : actor?.distance ?? distance;
    const actorWidth = 1.9 * (actorId === 'player' ? 1 : 0.88) * (actorId === 'player' ? playerProfile.widthScale : actor?.profile.widthScale || 1);
    // Les adversaires se traversent sans collision; seul le trafic lent bloque.
    return trafficCars.every((traffic) => {
      const approachingLane = traffic.lane === targetLane || Math.abs(traffic.currentX - targetX) < (actorWidth + traffic.width) / 2;
      return !approachingLane || Math.abs(traffic.distance - actorDistance) >= CITY_RUSH_CAR_GAP;
    });
  }

  function action(name) {
    if (!active || finished) return;
    if (name === 'left' || name === 'right') {
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
    if (type) usePower(type);
  }

  function collectPickup(type, lane) {
    const before = inventory[type] || 0;
    inventory = addCityRushCharge(inventory, type, 1);
    const chargeCost = CITY_RUSH_POWER_RULES[type].chargeCost;
    const progress = inventory[type];
    const ready = progress >= chargeCost;
    score += type === 'radio' ? 180 : type === 'pistol' ? 150 : type === 'oil' ? 125 : 100;
    pickedUp += 1;
    getCallbacks().pickup?.({ type, progress, chargeCost, ready, newlyReady: before < chargeCost && ready, lane });
    emitHud(true);
  }

  function collectRacerPickup(racer, type) {
    racer.inventory = addCityRushCharge(racer.inventory, type, 1);
  }

  function slowRacer(racer, isPlayer, duration = 1.28) {
    const recoveryProfile = isPlayer ? playerProfile : racer.profile;
    const adjustedDuration = cityRushHitDuration(duration, recoveryProfile);
    if (isPlayer) {
      playerSlowLeft = Math.max(playerSlowLeft, adjustedDuration);
      getCallbacks().effect?.({ type: 'slow-zone' });
    } else {
      racer.slowLeft = Math.max(racer.slowLeft, adjustedDuration);
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
      ].sort((a, b) => Math.abs(a.distance - trap.trackDistance) - Math.abs(b.distance - trap.trackDistance));
      for (const target of racersAtTrap) {
        const hitWindow = Math.max(0.82, target.speed * dt * 0.56);
        if (trap.hitIds.has(target.id) || target.lane !== trap.lane || Math.abs(target.distance - trap.trackDistance) > hitWindow) continue;
        trap.hitIds.add(target.id);
        const recoveryProfile = target.id === 'player' ? playerProfile : target.racer.profile;
        const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.oil.duration, recoveryProfile);
        if (target.id === 'player') playerSlowLeft = Math.max(playerSlowLeft, duration);
        else target.racer.slowLeft = Math.max(target.racer.slowLeft, duration);
        trap.active = false;
        trap.mesh.visible = false;
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
    ].sort((a, b) => b.distance - a.distance);

    for (const row of rows) {
      if (row.trackDistance < oldestRaceDistance - 11) {
        row.trackDistance = lastDistanceSlot + randomRange(24, 32);
        lastDistanceSlot = row.trackDistance;
        setupEncounter(row);
      }
      const z = PLAYER_Z - (row.trackDistance - distance) * CITY_RUSH_SCROLL_SCALE;
      row.group.position.set(0, 0, z);
      row.slots.forEach((slot) => {
        if (!slot.visible) return;
        const bob = Math.sin(elapsed * 4.1 + slot.userData.phase) * 0.12;
        slot.position.y = 1.3 + bob;
        slot.rotation.y = Math.sin(elapsed * 2.5 + slot.userData.phase) * 0.12;
      });

      // Une monnaie est ramassée par la première voiture qui la traverse;
      // chaque rival charge ensuite sa propre jauge avec la couleur obtenue.
      for (const participant of participants) {
        if (row.crossedRacers.has(participant.id)) continue;
        const crossingWindow = Math.max(1.15, participant.speed * dt * 0.65);
        if (Math.abs(participant.distance - row.trackDistance) > crossingWindow) continue;
        row.crossedRacers.add(participant.id);
        if (participant.id === 'player') row.checked = true;
        const pickupIndex = row.pickups.findIndex((item, index) => item.lane === participant.lane && !row.pickupClaims.has(index));
        if (pickupIndex < 0) continue;
        row.pickupClaims.add(pickupIndex);
        const pickup = row.pickups[pickupIndex];
        const object = row.slots[pickupIndex];
        if (object) object.visible = false;
        if (participant.id === 'player') collectPickup(pickup.type, participant.lane);
        else collectRacerPickup(participant.racer, pickup.type);
      }

      if (row.trackDistance < oldestRaceDistance - 2.4) {
        row.slowZone.visible = false;
        row.slots.forEach((slot) => { slot.visible = false; });
      }
    }
    for (let index = oilTraps.length - 1; index >= 0; index -= 1) {
      const trap = oilTraps[index];
      trap.age += dt;
      const deploy = clamp(trap.age / 0.38, 0, 1);
      const bounce = trap.age < 0.38 ? 1 + Math.sin(deploy * Math.PI) * 0.34 : 1;
      trap.mesh.scale.setScalar((0.22 + deploy * 0.78) * bounce);
      trap.mesh.position.set(CITY_RUSH_LANE_X[trap.lane], trap.age < 0.38 ? Math.sin(deploy * Math.PI) * 0.16 : 0, PLAYER_Z - (trap.trackDistance - distance) * CITY_RUSH_SCROLL_SCALE);
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
    if (!racer) return target.set(0, 0.6, -16);
    return target.copy(racer.mesh.position).add(new THREE.Vector3(0, 0.9, 0));
  }

  const strikeTargetVector = new THREE.Vector3();

  function updateStrike(dt) {
    if (!strike) return;
    strike.elapsed += dt;
    const target = targetPosition(strike.targetId, strikeTargetVector);
    const approachPoint = new THREE.Vector3(target.x + 4.8, Math.max(7.8, target.y + 6.8), target.z - 5.2);

    helicopter.userData.rotor.rotation.y += dt * 28;
    helicopter.userData.tailRotor.rotation.z += dt * 31;
    if (strike.phase === 'approach') {
      helicopter.position.lerp(approachPoint, Math.min(1, dt * 3.4));
      helicopter.lookAt(target.x, target.y + 1.5, target.z);
      if (strike.elapsed >= 0.78) {
        strike.phase = 'fire';
        strike.elapsed = 0;
        missile.position.copy(helicopter.position).add(new THREE.Vector3(-0.55, -0.42, 0.18));
        strike.missileStart = missile.position.clone();
        missile.visible = true;
      }
    } else if (strike.phase === 'fire') {
      const flight = clamp(strike.elapsed / 0.56, 0, 1);
      missile.position.lerpVectors(strike.missileStart, target, flight);
      missile.lookAt(target);
      helicopter.lookAt(target.x, target.y + 1.5, target.z);
      if (strike.elapsed >= 0.56) {
        const racer = racers.find((item) => item.id === strike.targetId);
        const hitProfile = strike.targetId === 'player' ? playerProfile : racer?.profile;
        const duration = cityRushHitDuration(CITY_RUSH_POWER_RULES.radio.duration, hitProfile);
        if (strike.targetId === 'player') playerStunLeft = duration;
        else if (racer) racer.stunLeft = duration;
        impact.position.copy(target);
        impact.userData.age = 0;
        impact.visible = true;
        strike.phase = 'impact';
        strike.elapsed = 0;
        missile.visible = false;
        getCallbacks().effect?.({ type: 'missile-hit', target: strike.targetName, targetId: strike.targetId, duration });
      }
    } else if (strike.phase === 'impact') {
      impact.userData.age += dt;
      const life = clamp(impact.userData.age / 0.48, 0, 1);
      impact.userData.core.scale.setScalar(0.3 + life * 1.3);
      impact.userData.core.material.opacity = 1 - life;
      impact.userData.ring.scale.setScalar(0.3 + life * 2.2);
      impact.userData.ring.material.opacity = 1 - life;
      if (strike.elapsed > 0.5) {
        impact.visible = false;
        helicopter.visible = false;
        strike = null;
      }
    }
  }

  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width || mount.clientWidth || 1));
    const height = Math.max(1, Math.floor(bounds.height || mount.clientHeight || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(CAMERA_BASE_FOV) / 2) / Math.min(1, camera.aspect)));
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
    clearVisualEffects();
    strike = null;
    helicopter.visible = false;
    missile.visible = false;
    impact.visible = false;
    const standings = rankCityRushRacers(makeRacerRows());
    emitHud(true);
    getCallbacks().finish?.({
      city: city.id,
      duration: elapsed,
      distance: Math.round(distance),
      rank: standings.rank,
      winner: standings.leader?.name || '—',
      winnerId: standings.leader?.id || null,
      score,
      pickups: pickedUp,
      racers: standings.ordered.map((racer, index) => ({ id: racer.id, name: racer.name, distance: Math.round(racer.distance), rank: index + 1 })),
    });
  }

  function nearestLane(value) {
    let result = 0;
    let difference = Infinity;
    CITY_RUSH_LANE_X.forEach((x, index) => {
      const next = Math.abs(value - x);
      if (next < difference) { difference = next; result = index; }
    });
    return result;
  }

  function update(time) {
    raf = requestAnimationFrame(update);
    const dt = Math.min(MAX_FRAME, Math.max(0, (time - lastFrame) / 1000));
    lastFrame = time;
    if (active && !finished) {
      elapsed += dt;
      const priorDistance = distance;
      const priorRacerDistances = new Map(racers.map((racer) => [racer.id, racer.distance]));
      playerSlowLeft = Math.max(0, playerSlowLeft - dt);
      playerBoostLeft = Math.max(0, playerBoostLeft - dt);
      playerStunLeft = Math.max(0, playerStunLeft - dt);
      playerSkidLeft = Math.max(0, playerSkidLeft - dt);
      const speedScale = playerSlowLeft > 0 ? 0.63 : 1;
      const boostScale = playerBoostLeft > 0 ? 1.46 : 1;
      const targetPlayerSpeed = playerStunLeft > 0 ? 0 : PLAYER_SPEED * playerProfile.powerMultiplier * speedScale * boostScale;
      const requestedPlayerSpeed = approachCityRushSpeed(playerCurrentSpeed, targetPlayerSpeed, playerProfile.accelerationRate, dt);
      playerX = lerp(playerX, CITY_RUSH_LANE_X[playerLane], Math.min(1, dt * 12));
      const playerSkid = playerSkidLeft > 0 ? Math.sin((0.85 - playerSkidLeft) * 17) * 0.24 * playerSkidSide : 0;

      const requestedRacerSpeeds = new Map();
      const priorRacerXs = new Map();
      const aiPickups = rows.flatMap((row) => row.pickups
        .map((pickup, index) => ({ ...pickup, distance: row.trackDistance, claimed: row.pickupClaims.has(index), visible: row.slots[index]?.visible }))
        .filter((pickup) => !pickup.claimed && pickup.visible));
      const aiSlowZones = rows
        .filter((row) => row.slowLane !== null && row.slowZone.visible)
        .map((row) => ({ lane: row.slowLane, distance: row.trackDistance }));
      const aiTraffic = trafficCars.map((traffic) => ({ lane: traffic.lane, distance: traffic.distance, speed: traffic.currentSpeed }));
      for (const racer of racers) {
        racer.changeIn -= dt;
        if (racer.changeIn <= 0) {
          const availableLanes = [racer.lane];
          for (const lane of [racer.lane - 1, racer.lane + 1]) {
            if (lane >= 0 && lane < CITY_RUSH_LANE_X.length && canEnterLane(racer.id, lane)) availableLanes.push(lane);
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
            inventory: racer.inventory,
            lookAheadDistance: 145,
          });
          if (nextLane !== racer.lane) racer.lane = nextLane;
          racer.changeIn = randomRange(0.36, 0.62);
        }
        racer.slowLeft = Math.max(0, racer.slowLeft - dt);
        racer.boostLeft = Math.max(0, racer.boostLeft - dt);
        racer.stunLeft = Math.max(0, racer.stunLeft - dt);
        racer.skidLeft = Math.max(0, racer.skidLeft - dt);
        racer.powerCooldown = Math.max(0, racer.powerCooldown - dt);
        const speedTarget = racer.stunLeft > 0 ? 0 : racer.baseSpeed * (racer.slowLeft > 0 ? 0.56 : 1) * (racer.boostLeft > 0 ? 1.38 : 1) + Math.sin(elapsed * 0.82 + racer.phase) * 0.38;
        const requestedSpeed = approachCityRushSpeed(racer.currentSpeed, Math.max(0, speedTarget), racer.profile.accelerationRate, dt);
        requestedRacerSpeeds.set(racer.id, requestedSpeed);
        priorRacerXs.set(racer.id, racer.currentX);
        racer.currentX = lerp(racer.currentX, CITY_RUSH_LANE_X[racer.lane], Math.min(1, dt * 5.3));
      }
      const priorTrafficDistances = new Map(trafficCars.map((traffic) => [traffic.id, traffic.distance]));
      const requestedTrafficSpeeds = new Map(trafficCars.map((traffic) => [
        traffic.id,
        Math.max(3.8, traffic.baseSpeed + Math.sin(elapsed * 0.5 + traffic.phase) * 0.18),
      ]));

      const resolvedCars = resolveCityRushCarMovement([
        { id: 'player', collisionGroup: 'racer', lane: playerLane, x: playerX + playerSkid, width: 1.9 * playerProfile.widthScale, previousDistance: priorDistance, nextDistance: priorDistance + requestedPlayerSpeed * dt },
        ...racers.map((racer) => ({
          id: racer.id,
          collisionGroup: 'racer',
          lane: racer.lane,
          x: racer.currentX + (racer.skidLeft > 0 ? Math.sin((0.85 - racer.skidLeft) * 17) * 0.24 * racer.skidSide : 0),
          width: 1.9 * 0.88 * racer.profile.widthScale,
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
      ]);
      const movementById = new Map(resolvedCars.map((car) => [car.id, car.nextDistance]));
      distance = movementById.get('player') ?? priorDistance;
      currentSpeed = dt > 0 ? Math.max(0, (distance - priorDistance) / dt) : requestedPlayerSpeed;
      playerCurrentSpeed = currentSpeed;
      playerCar.position.set(playerX + playerSkid, playerSlowLeft > 0 ? Math.sin(elapsed * 26) * 0.025 : 0, PLAYER_Z);
      playerCar.rotation.y = clamp((CITY_RUSH_LANE_X[playerLane] - playerX) * -0.06, -0.12, 0.12);
      playerCar.rotation.z = playerStunLeft > 0 ? Math.sin(elapsed * 18) * 0.035 : playerSkidLeft > 0 ? Math.sin((0.85 - playerSkidLeft) * 14) * 0.08 : Math.sin(elapsed * 4.4) * 0.008;
      const playerSteer = clamp((CITY_RUSH_LANE_X[playerLane] - playerX) * 0.28, -0.34, 0.34);
      playerCar.userData.frontWheels.forEach((wheel) => { wheel.rotation.y = playerSteer; });
      playerCar.userData.steeringWheel.rotation.z = playerSteer * 1.25;
      playerCar.userData.wheels.forEach((wheel) => { wheel.rotation.x += currentSpeed * dt * 0.32; });
      animateBoostFlames(playerCar, playerBoostLeft > 0, elapsed, currentSpeed, PLAYER_SPEED * playerProfile.powerMultiplier);
      playerCar.userData.underglow.material.opacity = playerBoostLeft > 0 ? 0.68 : playerSlowLeft > 0 ? 0.12 : 0.3;
      playerCar.userData.rearLights.forEach((light) => { light.material.color.set(playerStunLeft > 0 ? 0xfff0b0 : 0xff4465); });

      for (const racer of racers) {
        const priorRacerDistance = priorRacerDistances.get(racer.id);
        racer.distance = movementById.get(racer.id) ?? priorRacerDistance;
        racer.currentSpeed = dt > 0 ? Math.max(0, (racer.distance - priorRacerDistance) / dt) : requestedRacerSpeeds.get(racer.id);
        const gap = racer.distance - distance;
        const visible = gap > -6 && gap < 100;
        const renderZ = PLAYER_Z - gap * CITY_RUSH_SCROLL_SCALE;
        const skid = racer.skidLeft > 0 ? Math.sin((0.85 - racer.skidLeft) * 17) * 0.24 * racer.skidSide : 0;
        racer.mesh.visible = visible;
        // Keep even off-screen rivals' world positions current: the helicopter
        // may lock onto the leader before their car enters the camera view.
        racer.mesh.position.set(racer.currentX + skid, racer.stunLeft > 0 ? 0.045 : 0, renderZ);
        const racerLateralMotion = racer.currentX - priorRacerXs.get(racer.id);
        racer.mesh.rotation.y = clamp(racerLateralMotion * -0.16 + skid * 0.22, -0.22, 0.22);
        racer.mesh.rotation.z = racer.skidLeft > 0 ? Math.sin((0.85 - racer.skidLeft) * 14) * 0.08 : 0;
        const racerSteer = clamp(-racerLateralMotion * 1.45, -0.3, 0.3);
        racer.mesh.userData.frontWheels.forEach((wheel) => { wheel.rotation.y = racerSteer; });
        racer.mesh.userData.steeringWheel.rotation.z = racerSteer * 1.2;
        racer.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += racer.currentSpeed * dt * 0.29; });
        animateBoostFlames(racer.mesh, racer.boostLeft > 0, elapsed, racer.currentSpeed, racer.baseSpeed);
      }
      const trafficLeadDistance = Math.max(distance, ...racers.map((racer) => racer.distance));
      const slowestRaceDistance = Math.min(distance, ...racers.map((racer) => racer.distance));
      for (const [index, traffic] of trafficCars.entries()) {
        const priorTrafficDistance = priorTrafficDistances.get(traffic.id);
        traffic.distance = movementById.get(traffic.id) ?? priorTrafficDistance;
        const clearedByEveryone = traffic.distance < slowestRaceDistance - 34;
        const roomForAnotherEncounter = trafficLeadDistance < CITY_RUSH_DISTANCE - 230;
        if (clearedByEveryone && roomForAnotherEncounter) {
          traffic.spawnCount += 1;
          const nextSlot = lastTrafficDistanceSlot + randomRange(58, 78);
          const nextAhead = trafficLeadDistance + randomRange(132, 160);
          traffic.distance = Math.max(nextSlot, nextAhead);
          traffic.lane = CITY_RUSH_TRAFFIC_LANES[(index + traffic.spawnCount * 5) % CITY_RUSH_TRAFFIC_LANES.length];
          traffic.currentX = CITY_RUSH_LANE_X[traffic.lane];
          traffic.currentSpeed = traffic.baseSpeed;
          lastTrafficDistanceSlot = traffic.distance;
        } else {
          traffic.currentSpeed = dt > 0 ? Math.max(0, (traffic.distance - priorTrafficDistance) / dt) : requestedTrafficSpeeds.get(traffic.id);
        }
        const gap = traffic.distance - distance;
        traffic.mesh.visible = gap > -18 && gap < 132;
        traffic.mesh.position.set(traffic.currentX, 0, PLAYER_Z - gap * CITY_RUSH_SCROLL_SCALE);
        traffic.mesh.userData.wheels.forEach((wheel) => { wheel.rotation.x += traffic.currentSpeed * dt * 0.3; });
        traffic.mesh.userData.beacons.forEach((beacon, index) => {
          const flashing = Math.floor(elapsed * 8 + traffic.phase + index) % 2 === 0;
          beacon.material.opacity = flashing ? 1 : 0.18;
        });
      }

      const worldTravel = (distance - priorDistance) * CITY_RUSH_SCROLL_SCALE;
      for (const dash of movingDashes) {
        dash.position.z += worldTravel;
        if (dash.position.z > 16) dash.position.z -= ROAD_LOOP;
      }
      for (const segment of citySegments) {
        segment.position.z += worldTravel;
        if (segment.position.z > 34) segment.position.z -= segmentSpacing * segmentCount;
      }
      updateRows(dt);
      racers.forEach((racer) => useRacerPower(racer));
      checkZoneCrossings(dt);
      updateStrike(dt);
      updateVisualEffects(dt);

      const allRacers = makeRacerRows();
      if (allRacers.some((racer) => racer.distance >= CITY_RUSH_DISTANCE)) finishRace();
      emitHud();
    } else {
      currentSpeed = 0;
      animateBoostFlames(playerCar, false, elapsed, 0, PLAYER_SPEED * playerProfile.powerMultiplier);
      racers.forEach((racer) => animateBoostFlames(racer.mesh, false, elapsed, 0, racer.baseSpeed));
      playerCar.userData.wheels.forEach((wheel) => { wheel.rotation.x += dt * 0.16; });
      playerCar.position.x = lerp(playerCar.position.x, CITY_RUSH_LANE_X[playerLane], Math.min(1, dt * 4));
      playerCar.position.y = Math.sin(time * 0.0014) * 0.015;
      playerCar.userData.underglow.material.opacity = 0.3;
    }

    camera.position.x = lerp(camera.position.x, playerCar.position.x * 0.16, Math.min(1, dt * 2.8));
    camera.lookAt(playerCar.position.x * 0.09, 1.05, PLAYER_Z - 8.5);
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

  reset();
  raf = requestAnimationFrame(update);

  return {
    start() { if (!finished) { active = true; lastFrame = performance.now(); } },
    pause() { active = false; currentSpeed = 0; },
    reset,
    action,
    destroy() {
      clearVisualEffects();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      disposeScene(scene, renderer);
    },
  };
}

export default function ViceCityWorld({ active, cityId, carId, runId, onReady, onError, onHud, onFinish, onPickup, onEffect, actionsRef }) {
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = { onReady, onError, onHud, onFinish, onPickup, onEffect };

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
      }), carId);
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
  }, [cityId, carId, actionsRef]);

  useEffect(() => {
    if (active) worldRef.current?.start();
    else worldRef.current?.pause();
  }, [active]);

  useEffect(() => {
    if (runId > 0) worldRef.current?.reset();
  }, [runId]);

  return <div className="city-rush-world" ref={mountRef} />;
}
