import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { westernBuilding, westernObstacle } from './westernStage';
import { prairieField, prairieObstacle } from './prairieStage';
import { CRYSTALS, createCourse, jumpHeight, DUEL_DISTANCE, DUEL_SPEED_BONUS, DUEL_BASE_SPEED, duelSpeed, ghostDistance, seededRandom, planNpcLane, advanceCowboyStreak, playerLaneAfterAction, playerLateralPosition, resolveCollision, isPlayerVisible } from './mirageRules';

const LANES = [-2.1, 0, 2.1];
const TRACK_MIN_Z = -40;
const RUN_SECONDS = 60;

function block(geometry, material, parent, position, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function makeExplorer(rival = false) {
  const player = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  const palettes = [[0xb87948,0x352638,0x285e79,0xffce68,0xffe3b3], [0x393744,0xd5dde1,0xad3756,0x8ce7e0,0x34293d], [0xe2d5bd,0x684532,0x387649,0xffdc87,0x624132], [0x654536,0x251f29,0x7951aa,0xffa85c,0x392947]];
  const [coat, mane, cloth, trim, hood] = palettes[Number(rival) || 0].map(mat);
  // Horse faces -Z: hindquarters and the rider's back face the camera.
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
  block(cube, cloth, player, [0, 1.85, 0.05], [0.6, 0.75, 0.43]);
  const cape = block(cube, cloth, player, [0, 1.7, 0.34], [0.72, 0.87, 0.13]);
  block(cube, trim, player, [0, 1.72, 0.42], [0.12, 0.57, 0.03]);
  block(cube, hood, player, [0, 2.43, 0.02], [0.57, 0.55, 0.56]);
  block(cube, trim, player, [0, 2.49, 0.02], [0.59, 0.1, 0.58]);
  for (const x of [-0.43, 0.43]) {
    block(cube, mane, player, [x, 1.16, 0.05], [0.22, 0.57, 0.32]);
    const arm = block(cube, cloth, player, [x * 0.8, 1.9, -0.25], [0.2, 0.5, 0.22]);
    arm.rotation.x = -0.8;
    block(cube, mane, player, [x * 0.65, 1.72, -0.64], [0.035, 0.035, 0.7]);
  }
  player.userData.parts = { legs, tail, cape };
  return player;
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
  const { color } = CRYSTALS[tier];
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, metalness: 0.25, roughness: 0.24, flatShading: true });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.43 + tier * 0.035), material);
  gem.scale.set(0.85, 1.65, 0.85);
  group.add(gem);
  if (tier === 2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 4, 12), material);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
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

function makeScenery() {
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sandstone = new THREE.MeshStandardMaterial({ color: 0x986445, flatShading: true, roughness: 1 });
  const lilac = new THREE.MeshStandardMaterial({ color: 0x72517e, flatShading: true, roughness: 0.95 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x287c7d, flatShading: true, roughness: 0.8 });
  const pick = (array) => array[Math.floor(Math.random() * array.length)];
  const side = Math.random() > 0.5 ? 1 : -1;
  const x = side * (5.4 + Math.random() * 6.5);
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

function makeWorld(mount, callbacks, getRace, stage, getNetwork) {
  const western = stage === 'western';
  const prairie = stage === 'prairie';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(prairie ? 0xe5b373 : western ? 0xdba57b : 0x4b2860);
  scene.fog = new THREE.Fog(prairie ? 0xe5b373 : western ? 0xdba57b : 0x4b2860, 27, 82);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 7.3, 9.4);
  camera.lookAt(0, 0.6, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = prairie ? 1.02 : 1.2;
  renderer.domElement.className = 'mirage-canvas';
  renderer.domElement.setAttribute('aria-label', 'Jeu 3D Mirage Rush — évite les cactus et ramasse les fragments solaires');
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(prairie ? 0xffdfa0 : 0xffd6b1, prairie ? 0x65523c : 0x211638, prairie ? 1.65 : 2.1));
  const sunLight = new THREE.DirectionalLight(prairie ? 0xffb654 : 0xffcb81, prairie ? 1.8 : 2.4);
  sunLight.position.set(prairie ? 0 : -8, prairie ? 5 : 12, prairie ? -46 : 6);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(prairie ? 0xf1bf77 : 0xc36df4, prairie ? 0.45 : 1.2);
  rimLight.position.set(7, 6, -10);
  scene.add(rimLight);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcb78 });
  const secondSunMat = new THREE.MeshBasicMaterial({ color: 0xeb6a9b });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.1, 12, 8), sunMat);
  sun.position.set(prairie ? 0 : -12, prairie ? 3.3 : 12, -46);
  if (prairie) {
    sun.visible = false;
    // A sky backdrop ends exactly at ground level. The orange disc is centred
    // on its lower edge, so its lower half is genuinely hidden by the horizon.
    const sunset = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {},
      vertexShader: `varying vec2 skyPoint;
        void main() {
          skyPoint = position.xy + vec2(0.0, 60.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec2 skyPoint;
        void main() {
          vec3 peach = vec3(0.90, 0.70, 0.45);
          vec3 rose = vec3(0.84, 0.52, 0.32);
          vec3 mauve = vec3(0.46, 0.37, 0.44);
          float height = skyPoint.y;
          vec3 sky = mix(peach, rose, smoothstep(0.0, 23.0, height));
          sky = mix(sky, mauve, smoothstep(18.0, 75.0, height));
          float radius = length(skyPoint);
          float halo = exp(-radius * radius / 500.0) * 0.38;
          sky = mix(sky, vec3(1.0, 0.58, 0.29), halo);
          float disc = 1.0 - smoothstep(7.85, 8.0, radius);
          vec3 orange = mix(vec3(0.98, 0.25, 0.045), vec3(1.0, 0.49, 0.12), clamp(height / 8.0, 0.0, 1.0));
          gl_FragColor = vec4(mix(sky, orange, disc), 1.0);
        }`,
    }));
    sunset.position.set(0, 59.91, -95);
    sunset.renderOrder = -1;
    scene.add(sunset);
  }
  scene.add(sun);
  const secondSun = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), secondSunMat);
  secondSun.position.set(12, 9, -42);
  scene.add(secondSun);
  secondSun.visible = !western && !prairie;
  if (prairie) block(cube, new THREE.MeshStandardMaterial({ color: 0xa5a34e, roughness: 1 }), scene, [0, -0.39, -35], [180, 0.6, 180]);
  if (western) block(cube, new THREE.MeshStandardMaterial({ color: 0xb58b5d, roughness: 1 }), scene, [0, -0.64, -35], [80, 0.6, 160]);

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x68466f, flatShading: true, roughness: 1 });
  for (let i = 0; i < (prairie ? 0 : 13); i += 1) {
    const width = 5 + Math.random() * 9;
    const height = 4 + Math.random() * 9;
    const mountain = new THREE.Mesh(cube, mountainMaterial);
    mountain.position.set((Math.random() - 0.5) * 45, height / 2 - 1, -38 - Math.random() * 26);
    mountain.scale.set(width, height, 3 + Math.random() * 5);
    scene.add(mountain);
  }

  const floorMaterials = [
    new THREE.MeshStandardMaterial({ color: prairie ? 0xb5ae60 : 0xcea56a, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: prairie ? 0xc0b96c : 0xd9b679, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: prairie ? 0xa8a354 : 0xc9995f, flatShading: true, roughness: 1 }),
  ];
  const floorGeometry = new THREE.BoxGeometry(2.02, 0.58, 2.02);
  const floor = [];
  for (let zIndex = 0; zIndex < 25; zIndex += 1) {
    for (let lane = 0; lane < 4; lane += 1) {
      const tile = new THREE.Mesh(floorGeometry, floorMaterials[(zIndex + lane) % floorMaterials.length]);
      tile.position.set(lane === 3 ? 4.2 : LANES[lane], -0.34, TRACK_MIN_Z + zIndex * 2);
      if (lane === 3) tile.visible = false;
      scene.add(tile);
      floor.push(tile);
    }
  }

  const player = makeExplorer();
  scene.add(player);
  const rival = makeExplorer(true);
  rival.position.set(4.2, 0, -5);
  rival.scale.setScalar(0.92);
  rival.visible = false;
  scene.add(rival);
  const onlineRiders = [0,1,2,3].map(slot => {
    const rider = makeExplorer(slot);
    rider.visible = false;
    scene.add(rider);
    return rider;
  });
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xfdf0c8 });
  const finishMaterial = new THREE.MeshBasicMaterial({ color: 0x4ce9df });
  const startLine = block(new THREE.BoxGeometry(8.6, 0.05, 0.45), lineMaterial, scene, [1.05, 0.025, 1]);
  const finishLine = block(new THREE.BoxGeometry(8.6, 0.05, 0.75), finishMaterial, scene, [1.05, 0.03, -DUEL_DISTANCE]);
  startLine.visible = false;
  finishLine.visible = false;
  const playerShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 10),
    new THREE.MeshBasicMaterial({ color: 0x32263e, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.012;
  scene.add(playerShadow);

  let nextEncounter = createCourse();
  let rowCounter = 0;
  const sharedGems = new Set();
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
      const object = spec.kind === 'crystal' ? makeCrystal(spec.tier) : prairie ? prairieObstacle(spec.kind) : western ? westernObstacle(spec.kind) : makeHazard(spec.kind);
      const x = spec.lanes ? (LANES[spec.lanes[0]] + LANES[spec.lanes[1]]) / 2 : LANES[spec.lane];
      object.position.set(x, spec.kind === 'crystal' ? (spec.raised ? 2.4 : 1.2) : 0, 0);
      const key = `${row.index}:${itemIndex}`;
      const taken = sharedGems.has(key);
      object.visible = !taken;
      row.group.add(object);
      return { ...spec, key, object, collected: taken };
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
  } else for (let i = 0; i < 18; i++) {
    const item = makeScenery();
    item.position.z -= i * 4.8;
    scene.add(item);
    scenery.push(item);
  }

  let active = false;
  let race = { mode: 'rush' };
  let distance = 0;
  let rivalDistance = 0;
  let baseSpeed = DUEL_BASE_SPEED;
  let boost = 0;
  let trace = [0];
  let seed = 0;
  const npc = { dist: 0, lane: 1, x: 0, jumpLeft: 0, base: DUEL_BASE_SPEED, boost: 0, cooldown: 0, finishedAt: null, course: [], next: 0, gen: null, genPos: 20, genIndex: 0, plan: null, planned: -1, hesitate: false, invulnerable: 0 };
  const npcEnsureCourse = () => {
    while (npc.genPos < npc.dist + 60) {
      const encounter = npc.gen();
      npc.course.push({ index: npc.genIndex, pos: npc.genPos, items: encounter.items.map((item, i) => ({ ...item, key: `${npc.genIndex}:${i}` })) });
      npc.genIndex += 1;
      npc.genPos += encounter.gap;
    }
  };
  const hidePlayerGem = (key) => rows.forEach(row => row.items.forEach(item => {
    if (item.key === key) { item.collected = true; item.object.visible = false; }
  }));
  const updateNpc = (dt) => {
    npcEnsureCourse();
    npc.jumpLeft = Math.max(0, npc.jumpLeft - dt);
    npc.cooldown = Math.max(0, npc.cooldown - dt);
    npc.invulnerable = Math.max(0, npc.invulnerable - dt);
    npc.base += (DUEL_BASE_SPEED - npc.base) * Math.min(1, dt * 0.65);
    npc.boost = Math.max(0, npc.boost - dt * 0.85);
    const speed = duelSpeed(npc.base, npc.boost);
    const target = npc.course[npc.next];
    if (target) {
      const ahead = target.pos - npc.dist;
      if (npc.planned !== target.index && ahead < 24) {
        npc.planned = target.index;
        npc.hesitate = Math.random() < 0.12; // occasional human-like mistake
        npc.plan = planNpcLane(target.items.map(item => ({ ...item, taken: sharedGems.has(item.key) })), npc.lane);
      }
      if (npc.plan && !npc.hesitate && npc.cooldown <= 0 && npc.lane !== npc.plan.lane && ahead < 20) {
        npc.lane += Math.sign(npc.plan.lane - npc.lane);
        npc.cooldown = 0.16 + Math.random() * 0.08;
      }
      if (npc.plan?.jump && !npc.hesitate && npc.jumpLeft <= 0 && ahead / speed < 0.42 && ahead > 0) npc.jumpLeft = 0.82;
      if (npc.dist + speed * dt >= target.pos) {
        const height = jumpHeight(npc.jumpLeft);
        const near = lane => Math.abs(npc.x - LANES[lane]) < 0.95;
        const hazard = target.items.find(item => item.kind !== 'crystal' && (item.lanes || [item.lane]).some(near));
        if (hazard && !(hazard.kind === 'barrier' && height > 1.05) && npc.invulnerable <= 0) {
          npc.base = Math.max(8, speed * 0.55);
          npc.boost = 0;
          npc.invulnerable = 1.15;
        }
        const gem = target.items.find(item => item.kind === 'crystal' && Math.abs(npc.x - LANES[item.lane]) < 0.85 && (!item.raised || height > 1.05) && !sharedGems.has(item.key));
        if (gem) {
          sharedGems.add(gem.key);
          hidePlayerGem(gem.key);
          npc.boost = Math.min(9, npc.boost + DUEL_SPEED_BONUS[gem.tier]);
        }
        npc.next += 1;
      }
    }
    npc.x += (LANES[npc.lane] - npc.x) * Math.min(1, dt * 12);
    npc.dist = Math.min(DUEL_DISTANCE, npc.dist + speed * dt);
    if (npc.dist >= DUEL_DISTANCE && npc.finishedAt === null) npc.finishedAt = elapsed;
    return npc.dist;
  };
  let elapsed = 0;
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
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  resize();

  const emitHud = (force = false) => {
    const now = performance.now();
    if (!force && now - lastHud < 125) return;
    lastHud = now;
    callbacks.hud?.({
      score,
      gems,
      combo,
      multiplier: (1 + Math.min(3, Math.floor(combo / 5) * 0.5)).toFixed(1),
      lives,
      remaining: Math.max(0, RUN_SECONDS - elapsed),
      distance, lane: laneIndex, jump: jumpHeight(jumpLeft), rivalDistance, speed: duelSpeed(baseSpeed, boost), mode: race.mode,
      rivalName: race.challenge?.name || 'L’OMBRE',
    });
  };

  const finish = () => {
    if (!active) return;
    active = false;
    if (race.mode === 'online') {
      callbacks.finish?.({ mode: 'online', score, gems, duration: elapsed, distance: 600, lane: laneIndex, jump: 0 });
    } else if (race.mode !== 'rush') {
      trace.push(DUEL_DISTANCE);
      callbacks.finish?.({ mode: 'duel', score, gems, duration: Math.round(elapsed * 10) / 10,
        rivalDuration: race.challenge ? race.challenge.duration : npc.finishedAt === null ? null : Math.round(npc.finishedAt * 10) / 10,
        rivalDistance: Math.round(rivalDistance),
        won: race.challenge ? elapsed < race.challenge.duration : npc.finishedAt === null || elapsed < npc.finishedAt,
        seed, trace, stage, rivalName: race.challenge?.name || 'L’OMBRE' });
    } else callbacks.finish?.({ mode: 'rush', score, gems, duration: Math.max(1, Math.round(elapsed)) });
  };

  const reset = () => {
    race = getRace();
    seed = race.seed ?? race.challenge?.seed ?? (Math.random() * 0xffffffff) >>> 0;
    distance = 0;
    rivalDistance = 0;
    baseSpeed = DUEL_BASE_SPEED;
    boost = 0;
    trace = [0];
    rival.visible = race.mode === 'duel';
    startLine.position.z = 1;
    finishLine.position.z = -DUEL_DISTANCE;
    startLine.visible = race.mode !== 'rush';
    finishLine.visible = race.mode !== 'rush';
    floor.forEach(tile => { tile.visible = tile.position.x !== 4.2 || Boolean(race.challenge); });
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
    player.position.set(0, 0, 0);
    floor.forEach((tile, index) => { tile.position.z = TRACK_MIN_Z + Math.floor(index / 4) * 2; });
    player.visible = true;
    nextEncounter = createCourse(race.mode !== 'rush' ? seededRandom(seed) : Math.random);
    rowCounter = 0;
    sharedGems.clear();
    Object.assign(npc, { dist: 0, lane: 1, x: 0, jumpLeft: 0, base: DUEL_BASE_SPEED, boost: 0, cooldown: 0, finishedAt: null, course: [], next: 0, gen: createCourse(seededRandom(seed)), genPos: 20, genIndex: 0, plan: null, planned: -1, hesitate: false, invulnerable: 0 });
    let z = -20;
    rows.forEach(row => {
      const gap = populateRow(row);
      row.group.position.z = z;
      z -= gap;
    });
    emitHud(true);
  };

  const action = (name) => {
    if (!active) return;
    laneIndex = playerLaneAfterAction(laneIndex, name, jumpLeft);
    if (name === 'jump' && jumpLeft <= 0) jumpLeft = 0.82;
  };

  const onKeyDown = (event) => {
    if (!active || event.repeat) return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'q', 'd', 'w', 'z'].includes(key)) event.preventDefault();
    if (key === 'arrowleft' || key === 'a' || key === 'q') action('left');
    if (key === 'arrowright' || key === 'd') action('right');
    if (key === 'arrowup' || key === 'w' || key === 'z' || key === ' ') action('jump');
  };
  window.addEventListener('keydown', onKeyDown);

  const animate = (time) => {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.04, (time - lastFrame) / 1000);
    lastFrame = time;
    const running = active;
    if (running && race.mode !== 'rush') {
      baseSpeed += (DUEL_BASE_SPEED - baseSpeed) * Math.min(1, dt * 0.65);
      boost = Math.max(0, boost - dt * 0.85);
    }
    const speed = running ? race.mode !== 'rush' ? duelSpeed(baseSpeed, boost) : 12 + Math.min(7, elapsed * 0.12) : 0;
    if (running) {
      elapsed += dt;
      if (race.mode !== 'rush') {
        distance = Math.min(DUEL_DISTANCE, distance + speed * dt);
        rivalDistance = race.mode === 'online' ? 0 : race.challenge
          ? ghostDistance(race.challenge.trace, elapsed, race.challenge.duration)
          : updateNpc(dt);
        while (trace.length * 0.5 <= elapsed && trace.length < 359) trace.push(Math.round(distance));
        startLine.position.z = 1 + distance;
        finishLine.position.z = distance - DUEL_DISTANCE;
      }
      jumpLeft = Math.max(0, jumpLeft - dt);
      poseLeft = Math.max(0, poseLeft - dt);
      crashAnimation = Math.max(0, crashAnimation - dt);
      invulnerable = Math.max(0, invulnerable - dt);
      floor.forEach((tile) => {
        tile.position.z += speed * dt;
        if (tile.position.z > 9) tile.position.z = TRACK_MIN_Z;
      });
      scenery.forEach((item) => {
        item.position.z += speed * item.userData.speedFactor * dt;
        if (item.position.z > (western || prairie ? 15 : 9)) item.position.z -= western || prairie ? 110 : 86;
      });
      rows.forEach((row) => {
        row.group.position.z += speed * dt;
        row.items.forEach((item) => {
          if (item.kind === 'crystal' && item.object.visible) {
            item.object.rotation.y += dt * 1.8;
            item.object.rotation.x = Math.sin(time * 0.002 + row.group.position.z) * 0.1;
          }
        });
        if (!row.checked && row.group.position.z > -0.65 && row.group.position.z < 0.95) {
          row.checked = true;
          const hazard = row.items.find((item) => item.kind !== 'crystal' && (item.lanes || [item.lane]).some(lane => Math.abs(player.position.x - LANES[lane]) < 0.95));
          const jumpedHighEnough = hazard?.kind === 'barrier' && jumpHeight(jumpLeft) > 1.05;
          const collided = Boolean(hazard && !jumpedHighEnough);
          if (collided && invulnerable <= 0) {
            const impact = resolveCollision({ mode: race.mode, lives, speed: duelSpeed(baseSpeed, boost), boost });
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
          const crystal = row.items.find((item) => item.kind === 'crystal' && Math.abs(player.position.x - LANES[item.lane]) < 0.85 && (!item.raised || jumpHeight(jumpLeft) > 1.05) && !item.collected);
          if (crystal) {
            crystal.collected = true;
            sharedGems.add(crystal.key);
            crystal.object.visible = false;
            gems += 1;
            callbacks.pickup?.(crystal.tier);
            combo += 1;
            const multiplier = 1 + Math.min(3, Math.floor(combo / 5) * 0.5);
            score += Math.round(CRYSTALS[crystal.tier].value * multiplier);
            if (race.mode !== 'rush') boost = Math.min(9, boost + DUEL_SPEED_BONUS[crystal.tier]);
            if (combo === 5 || combo === 10 || combo === 15) {
              score += 150;
              poseLeft = 0.62;
            }
          }
          const streakResult = advanceCowboyStreak(cowboyStreak, Boolean(crystal), collided);
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
      if (race.mode !== 'rush' ? distance >= DUEL_DISTANCE : elapsed >= RUN_SECONDS) finish();
      emitHud();
    }

    const targetX = LANES[laneIndex];
    player.position.x = playerLateralPosition(player.position.x, targetX, dt, jumpLeft);
    const crashProgress = crashAnimation > 0 ? 1 - crashAnimation / 0.42 : 0;
    const crashBounce = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.18 : 0;
    player.position.y = jumpHeight(jumpLeft) + crashBounce;
    const parts = player.userData.parts;
    const runWave = Math.sin(time * (running ? 0.018 : 0.002));
    parts.legs.forEach((leg, index) => {
      leg.rotation.x = jumpLeft > 0 ? (index < 2 ? -0.7 : 0.65) : running ? Math.sin(time * 0.018 + index * 2.2) * 0.65 : 0;
    });
    parts.tail.rotation.z = runWave * 0.18;
    parts.cape.rotation.x = running ? -0.12 + runWave * 0.06 : 0;
    const impactTilt = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.2 * crashDirection : 0;
    player.rotation.z = (targetX - player.position.x) * -0.055 + impactTilt;
    player.rotation.x = crashAnimation > 0 ? Math.sin(crashProgress * Math.PI) * 0.16 : 0;
    player.scale.setScalar((poseLeft > 0 ? 1.035 : 1) * (crashAnimation > 0 ? 1 - Math.sin(crashProgress * Math.PI) * 0.09 : 1));
    player.visible = isPlayerVisible(race.mode, invulnerable, time);
    const network = getNetwork?.();
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
      rider.userData.parts.legs.forEach((leg,i) => { leg.rotation.x = running ? Math.sin(time*.018+i*2.2)*.65 : 0; });
    });
    rival.position.z = Math.max(-85, Math.min(16, distance - rivalDistance));
    const rivalParts = rival.userData.parts;
    rivalParts.legs.forEach((leg, index) => { leg.rotation.x = running ? Math.sin(time * 0.018 + index * 2.2 + 1.3) * 0.65 : 0; });
    rivalParts.tail.rotation.z = runWave * -0.2;
    if (race.mode === 'duel' && !race.challenge) {
      rival.position.x = npc.x;
      rival.position.y = jumpHeight(npc.jumpLeft);
      rival.scale.setScalar(1);
      if (npc.jumpLeft > 0) rivalParts.legs.forEach((leg, index) => { leg.rotation.x = index < 2 ? -0.7 : 0.65; });
    } else {
      rival.position.set(4.2, 0, rival.position.z);
      rival.scale.setScalar(0.92);
    }
    rival.visible = race.mode === 'duel' && rival.position.z < 11 && rival.position.z > -74 && (npc.invulnerable <= 0 || Math.floor(time / 90) % 2 === 0);
    playerShadow.position.x = player.position.x;
    playerShadow.scale.set(1, 1.8, 1).multiplyScalar(Math.max(0.55, 1 - player.position.y * 0.12));
    camera.position.x += (player.position.x * 0.13 - camera.position.x) * dt * 2;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(animate);

  return {
    start() {
      reset();
      active = true;
      lastFrame = performance.now();
    },
    pause() {
      active = false;
    },
    action,
    destroy() {
      active = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
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

export default function MirageWorld({ active, race, stage, onReady, onHud, onFinish, onCrash, onPickup, onCheer, actionsRef, network }) {
  const networkRef = useRef(network);
  networkRef.current = network;
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const raceRef = useRef(race);
  raceRef.current = race;
  const callbackRefs = useRef({});
  callbackRefs.current = { onReady, onHud, onFinish, onCrash, onPickup, onCheer };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const world = makeWorld(mountRef.current, {
      hud: (data) => callbackRefs.current.onHud?.(data),
      finish: (data) => callbackRefs.current.onFinish?.(data),
      crash: () => callbackRefs.current.onCrash?.(),
      pickup: (tier) => callbackRefs.current.onPickup?.(tier),
      cheer: () => callbackRefs.current.onCheer?.(),
    }, () => raceRef.current, stage, () => networkRef.current);
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

  return <div className="mirage-world" ref={mountRef} />;
}
