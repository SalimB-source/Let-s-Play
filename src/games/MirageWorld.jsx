import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

function makeExplorer() {
  const player = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7e38ae, roughness: 0.78, flatShading: true });
  const trim = new THREE.MeshStandardMaterial({ color: 0xffcb4b, roughness: 0.72, flatShading: true });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe7a66b, roughness: 0.86, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x271c3c, roughness: 0.82, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: 0xffeed4, roughness: 0.7, flatShading: true });
  const pink = new THREE.MeshStandardMaterial({ color: 0xf05591, roughness: 0.7, flatShading: true });

  block(cube, cloth, player, [0, 1.05, 0], [0.75, 0.8, 0.48]);
  block(cube, trim, player, [0, 1.45, 0], [0.77, 0.12, 0.5]);
  block(cube, skin, player, [0, 1.78, 0], [0.56, 0.58, 0.54]);
  block(cube, dark, player, [0, 2.08, -0.025], [0.61, 0.16, 0.6]);
  block(cube, pink, player, [0.31, 1.84, 0.02], [0.1, 0.34, 0.13]);
  block(cube, white, player, [0.12, 1.83, 0.285], [0.08, 0.09, 0.035]);
  block(cube, white, player, [-0.12, 1.83, 0.285], [0.08, 0.09, 0.035]);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.49, 1.35, 0);
  player.add(leftArm);
  block(cube, cloth, leftArm, [0, -0.29, 0], [0.27, 0.7, 0.34]);
  block(cube, skin, leftArm, [0, -0.63, 0], [0.28, 0.19, 0.34]);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.49, 1.35, 0);
  player.add(rightArm);
  block(cube, cloth, rightArm, [0, -0.29, 0], [0.27, 0.7, 0.34]);
  block(cube, skin, rightArm, [0, -0.63, 0], [0.28, 0.19, 0.34]);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.2, 0.7, 0);
  player.add(leftLeg);
  block(cube, dark, leftLeg, [0, -0.32, 0], [0.3, 0.68, 0.37]);
  block(cube, trim, leftLeg, [0, -0.64, 0.08], [0.36, 0.14, 0.46]);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.2, 0.7, 0);
  player.add(rightLeg);
  block(cube, dark, rightLeg, [0, -0.32, 0], [0.3, 0.68, 0.37]);
  block(cube, trim, rightLeg, [0, -0.64, 0.08], [0.36, 0.14, 0.46]);

  // An original little solar echo: geometric flair, not a copied character.
  const echo = new THREE.Group();
  echo.position.set(0.88, 1.6, 0.05);
  player.add(echo);
  const glow = new THREE.MeshStandardMaterial({ color: 0xffdb62, emissive: 0xff9e32, emissiveIntensity: 0.65, flatShading: true });
  block(cube, glow, echo, [0, 0, 0], [0.32, 0.32, 0.32]);
  block(cube, pink, echo, [0.16, 0.23, 0], [0.13, 0.13, 0.13]);
  block(cube, trim, echo, [-0.19, -0.19, 0], [0.12, 0.12, 0.12]);

  player.userData.parts = { leftArm, rightArm, leftLeg, rightLeg, echo };
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

function makeCrystal() {
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const crystal = new THREE.MeshStandardMaterial({ color: 0xf45ba6, emissive: 0x6f123f, emissiveIntensity: 0.45, flatShading: true, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd95c, emissive: 0x80541a, emissiveIntensity: 0.35, flatShading: true });
  block(cube, crystal, group, [0, 0, 0], [0.52, 0.72, 0.52]).rotation.y = Math.PI / 4;
  block(cube, gold, group, [0, 0.45, 0], [0.22, 0.22, 0.22]).rotation.y = Math.PI / 4;
  return group;
}

function makeHazard(kind) {
  if (kind === 'cactus') return makeCactus();
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const rock = new THREE.MeshStandardMaterial({ color: 0x5b416a, flatShading: true, roughness: 0.92 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xf05591, emissive: 0x8c2852, emissiveIntensity: 0.25, flatShading: true });
  block(cube, rock, group, [0, 0.48, 0], [1.45, 0.96, 1.1]);
  block(cube, edge, group, [0, 0.93, 0], [1.48, 0.13, 1.13]);
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

function makeWorld(mount, callbacks) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4b2860);
  scene.fog = new THREE.Fog(0x4b2860, 27, 82);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 7.3, 9.4);
  camera.lookAt(0, 0.6, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.className = 'mirage-canvas';
  renderer.domElement.setAttribute('aria-label', 'Jeu 3D Mirage Rush — évite les cactus et ramasse les fragments solaires');
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffd6b1, 0x211638, 2.1));
  const sunLight = new THREE.DirectionalLight(0xffcb81, 2.4);
  sunLight.position.set(-8, 12, 6);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0xc36df4, 1.2);
  rimLight.position.set(7, 6, -10);
  scene.add(rimLight);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcb78 });
  const secondSunMat = new THREE.MeshBasicMaterial({ color: 0xeb6a9b });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.1, 12, 8), sunMat);
  sun.position.set(-12, 12, -46);
  scene.add(sun);
  const secondSun = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), secondSunMat);
  secondSun.position.set(12, 9, -42);
  scene.add(secondSun);

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x68466f, flatShading: true, roughness: 1 });
  for (let i = 0; i < 13; i += 1) {
    const width = 5 + Math.random() * 9;
    const height = 4 + Math.random() * 9;
    const mountain = new THREE.Mesh(cube, mountainMaterial);
    mountain.position.set((Math.random() - 0.5) * 45, height / 2 - 1, -38 - Math.random() * 26);
    mountain.scale.set(width, height, 3 + Math.random() * 5);
    scene.add(mountain);
  }

  const floorMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xcea56a, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xd9b679, flatShading: true, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xc9995f, flatShading: true, roughness: 1 }),
  ];
  const floorGeometry = new THREE.BoxGeometry(2.02, 0.58, 2.02);
  const floor = [];
  for (let zIndex = 0; zIndex < 25; zIndex += 1) {
    for (let lane = 0; lane < LANES.length; lane += 1) {
      const tile = new THREE.Mesh(floorGeometry, floorMaterials[(zIndex + lane) % floorMaterials.length]);
      tile.position.set(LANES[lane], -0.34, TRACK_MIN_Z + zIndex * 2);
      scene.add(tile);
      floor.push(tile);
    }
  }

  const player = makeExplorer();
  scene.add(player);
  const playerShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 10),
    new THREE.MeshBasicMaterial({ color: 0x32263e, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.012;
  scene.add(playerShadow);

  const rows = [];
  for (let index = 0; index < 7; index += 1) {
    const group = new THREE.Group();
    const obstacleLane = (index * 2 + Math.floor(Math.random() * 3)) % 3;
    const rowItems = [];
    for (let lane = 0; lane < 3; lane += 1) {
      let kind;
      if (lane === obstacleLane) kind = index % 3 === 0 ? 'barrier' : 'cactus';
      else kind = Math.random() > 0.22 ? 'crystal' : 'empty';
      if (kind === 'empty') continue;
      const item = kind === 'crystal' ? makeCrystal() : makeHazard(kind);
      item.position.set(LANES[lane], kind === 'crystal' ? 1.2 : 0, 0);
      group.add(item);
      rowItems.push({ lane, kind, object: item, collected: false });
    }
    group.position.z = -15 - index * 10.7;
    scene.add(group);
    rows.push({ group, items: rowItems, checked: false, spacing: 7 * 10.7 });
  }

  const scenery = [];
  for (let i = 0; i < 18; i += 1) {
    const item = makeScenery();
    item.position.z -= i * 4.8;
    scene.add(item);
    scenery.push(item);
  }

  let active = false;
  let elapsed = 0;
  let score = 0;
  let gems = 0;
  let combo = 0;
  let lives = 3;
  let laneIndex = 1;
  let jumpLeft = 0;
  let poseLeft = 0;
  let invulnerable = 0;
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
    });
  };

  const finish = () => {
    if (!active) return;
    active = false;
    callbacks.finish?.({ score, gems, duration: Math.max(1, Math.round(elapsed)) });
  };

  const reset = () => {
    elapsed = 0;
    score = 0;
    gems = 0;
    combo = 0;
    lives = 3;
    laneIndex = 1;
    jumpLeft = 0;
    poseLeft = 0;
    invulnerable = 0;
    player.position.set(0, 0, 0);
    player.visible = true;
    rows.forEach((row, index) => {
      row.group.position.z = -15 - index * 10.7;
      row.checked = false;
      row.items.forEach((item) => {
        item.collected = false;
        item.object.visible = true;
      });
    });
    emitHud(true);
  };

  const action = (name) => {
    if (!active) return;
    if (name === 'left') laneIndex = Math.max(0, laneIndex - 1);
    if (name === 'right') laneIndex = Math.min(2, laneIndex + 1);
    if (name === 'jump' && jumpLeft <= 0) jumpLeft = 0.82;
  };

  const onKeyDown = (event) => {
    if (!active || event.repeat) return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w'].includes(key)) event.preventDefault();
    if (key === 'arrowleft' || key === 'a') action('left');
    if (key === 'arrowright' || key === 'd') action('right');
    if (key === 'arrowup' || key === 'w' || key === ' ') action('jump');
  };
  window.addEventListener('keydown', onKeyDown);

  const animate = (time) => {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.04, (time - lastFrame) / 1000);
    lastFrame = time;
    const running = active;
    const speed = running ? 12 + Math.min(7, elapsed * 0.12) : 0;
    if (running) {
      elapsed += dt;
      jumpLeft = Math.max(0, jumpLeft - dt);
      poseLeft = Math.max(0, poseLeft - dt);
      invulnerable = Math.max(0, invulnerable - dt);
      floor.forEach((tile) => {
        tile.position.z += speed * dt;
        if (tile.position.z > 9) tile.position.z = TRACK_MIN_Z;
      });
      scenery.forEach((item) => {
        item.position.z += speed * item.userData.speedFactor * dt;
        if (item.position.z > 9) item.position.z -= 86;
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
          const hazard = row.items.find((item) => item.kind !== 'crystal' && item.lane === laneIndex);
          const jumpedHighEnough = jumpLeft > 0.12;
          if (hazard && !jumpedHighEnough && invulnerable <= 0) {
            lives -= 1;
            combo = 0;
            invulnerable = 1.15;
            callbacks.crash?.();
            if (lives <= 0) finish();
          }
          const crystal = row.items.find((item) => item.kind === 'crystal' && item.lane === laneIndex && !item.collected);
          if (crystal) {
            crystal.collected = true;
            crystal.object.visible = false;
            gems += 1;
            combo += 1;
            const multiplier = 1 + Math.min(3, Math.floor(combo / 5) * 0.5);
            score += Math.round(100 * multiplier);
            if (combo === 5 || combo === 10 || combo === 15) {
              score += 150;
              poseLeft = 0.62;
            }
          }
          emitHud(true);
        }
        if (row.group.position.z > 5) {
          row.group.position.z -= row.spacing;
          row.checked = false;
          row.items.forEach((item) => {
            item.collected = false;
            item.object.visible = true;
          });
        }
      });
      if (elapsed >= RUN_SECONDS) finish();
      emitHud();
    }

    const targetX = LANES[laneIndex];
    player.position.x += (targetX - player.position.x) * Math.min(1, dt * 12);
    const jumpPhase = jumpLeft > 0 ? (0.82 - jumpLeft) / 0.82 : 0;
    player.position.y = jumpLeft > 0 ? Math.sin(jumpPhase * Math.PI) * 1.7 : 0;
    const parts = player.userData.parts;
    const runWave = Math.sin(time * (running ? 0.014 : 0.002));
    const strikingPose = poseLeft > 0;
    parts.leftArm.rotation.x = strikingPose ? -0.12 : runWave * 0.56;
    parts.rightArm.rotation.x = strikingPose ? 0.12 : -runWave * 0.56;
    parts.leftArm.rotation.z = strikingPose ? 1.15 : 0;
    parts.rightArm.rotation.z = strikingPose ? -1.15 : 0;
    parts.leftLeg.rotation.x = strikingPose ? -0.22 : -runWave * 0.62;
    parts.rightLeg.rotation.x = strikingPose ? 0.22 : runWave * 0.62;
    player.rotation.z = strikingPose ? 0.08 : 0;
    player.scale.setScalar(strikingPose ? 1.06 : 1);
    parts.echo.position.y = 1.55 + Math.sin(time * 0.0038) * 0.12;
    parts.echo.rotation.y += dt * (running ? 1.8 : 0.5);
    player.visible = invulnerable <= 0 || Math.floor(time / 90) % 2 === 0;
    playerShadow.position.x = player.position.x;
    playerShadow.scale.setScalar(Math.max(0.55, 1 - player.position.y * 0.12));
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
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function MirageWorld({ active, onReady, onHud, onFinish, onCrash, actionsRef }) {
  const mountRef = useRef(null);
  const worldRef = useRef(null);
  const callbackRefs = useRef({});
  callbackRefs.current = { onReady, onHud, onFinish, onCrash };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const world = makeWorld(mountRef.current, {
      hud: (data) => callbackRefs.current.onHud?.(data),
      finish: (data) => callbackRefs.current.onFinish?.(data),
      crash: () => callbackRefs.current.onCrash?.(),
    });
    worldRef.current = world;
    if (actionsRef) actionsRef.current = (name) => world.action(name);
    callbackRefs.current.onReady?.();
    return () => {
      world.destroy();
      worldRef.current = null;
      if (actionsRef) actionsRef.current = null;
    };
  }, [actionsRef]);

  useEffect(() => {
    if (!worldRef.current) return;
    if (active) worldRef.current.start();
    else worldRef.current.pause();
  }, [active]);

  return <div className="mirage-world" ref={mountRef} />;
}
