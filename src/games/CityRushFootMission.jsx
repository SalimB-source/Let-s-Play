import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './city-rush-foot-mission.css';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const WORLD = 22;

function makeVoxelPerson({ player = false, party = false, color = 0x404757 } = {}) {
  const group = new THREE.Group();
  const mat = (c, roughness = 0.88) => new THREE.MeshStandardMaterial({ color: c, roughness });
  const skin = mat(player ? 0xc48968 : 0xb98064);
  const jacket = mat(player ? (party ? 0x211f2b : 0x8f2940) : color);
  const pants = mat(player ? 0x1c2330 : 0x252b35);
  const hair = mat(player ? 0x1b171a : 0x242128);
  const shirt = mat(player ? (party ? 0xd2c4ae : 0xd5c5b5) : 0xabb4bb);
  const cube = (parent, material, size, pos) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const leftLeg = new THREE.Group(); leftLeg.position.set(-.14, .72, 0); group.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(.14, .72, 0); group.add(rightLeg);
  cube(leftLeg, pants, [.19, .68, .22], [0, -.32, 0]); cube(leftLeg, mat(0x11151b), [.23, .12, .34], [0, -.65, -.055]);
  cube(rightLeg, pants, [.19, .68, .22], [0, -.32, 0]); cube(rightLeg, mat(0x11151b), [.23, .12, .34], [0, -.65, -.055]);
  const torso = new THREE.Group(); torso.position.y = 1.18; group.add(torso);
  cube(torso, jacket, [.58, .68, .34], [0, 0, 0]);
  cube(torso, shirt, [.16, .47, .035], [0, .04, -.18]);
  const leftArm = new THREE.Group(); leftArm.position.set(-.36, .38, 0); torso.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(.36, .38, 0); torso.add(rightArm);
  cube(leftArm, jacket, [.18, .52, .2], [0, -.25, 0]); cube(rightArm, jacket, [.18, .52, .2], [0, -.25, 0]);
  cube(leftArm, skin, [.16, .15, .17], [0, -.55, -.025]); cube(rightArm, skin, [.16, .15, .17], [0, -.55, -.025]);
  if (player && !party) {
    cube(rightArm, mat(0x17191e, .42), [.09, .09, .3], [0, -.55, -.19]);
    cube(rightArm, mat(0x17191e, .42), [.085, .17, .09], [0, -.48, -.1]);
  }
  const head = new THREE.Group(); head.position.y = 1.68; group.add(head);
  cube(head, skin, [.37, .39, .34], [0, 0, 0]);
  cube(head, hair, [.4, .15, .37], [0, .2, .015]);
  cube(head, hair, [.09, .17, .36], [-.155, .09, 0]); cube(head, hair, [.09, .17, .36], [.155, .09, 0]);
  cube(head, mat(0xf0e6d3), [.055, .045, .025], [-.08, .02, -.178]); cube(head, mat(0xf0e6d3), [.055, .045, .025], [.08, .02, -.178]);
  cube(head, mat(0x211b1b), [.024, .035, .022], [-.08, .02, -.196]); cube(head, mat(0x211b1b), [.024, .035, .022], [.08, .02, -.196]);
  group.userData.walkParts = { leftLeg, rightLeg, leftArm, rightArm, torso };
  return group;
}

function makeBox(scene, x, y, z, sx, sy, sz, color, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: options.roughness ?? .9, metalness: options.metalness ?? 0 }),
  );
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh;
}

function addHangar(scene) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x30353b, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), concrete); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(44, 22, 0x555c60, 0x42474c); grid.position.y = .012; scene.add(grid);
  for (let x = -20; x <= 20; x += 8) {
    makeBox(scene, x, 2.6, -20, .42, 5.2, .42, 0x39434b);
    makeBox(scene, x, 2.6, 20, .42, 5.2, .42, 0x39434b);
    makeBox(scene, x, 5.1, 0, .26, .24, 40, 0x39434b, { metalness: .42 });
  }
  for (let z = -20; z <= 20; z += 10) {
    makeBox(scene, -20, 2.5, z, .35, 5, .35, 0x39434b);
    makeBox(scene, 20, 2.5, z, .35, 5, .35, 0x39434b);
    makeBox(scene, 0, 5.2, z, 40, .2, .24, 0x404950, { metalness: .35 });
  }
  // Stacked cargo and steel shipping containers.
  for (const [x, z, s] of [[-4,-8,1],[4,8,1],[8,-5,0],[10,9,1],[-7,9,0]]) {
    const height = s ? 2.8 : 1.8;
    makeBox(scene, x, height / 2, z, 3.2, height, 2.6, s ? 0x715236 : 0x58616a, { metalness: .2 });
    for (let i = -1; i <= 1; i++) makeBox(scene, x + i * .92, height / 2, z - 1.33, .07, height - .16, .045, 0x98805d);
  }
  // Nico's muscle car as solid cover.
  makeBox(scene, -13, .72, 7, 5.2, .72, 2.6, 0x11131a, { metalness: .55, roughness: .34 });
  makeBox(scene, -13, 1.15, 7.08, 2.6, .62, 2.25, 0x18222d, { metalness: .58, roughness: .28 });
  makeBox(scene, -13, 1.12, 5.68, 4.8, .08, .065, 0xc93a4c, { metalness: .2 });
  for (const x of [-14.7, -11.3]) for (const z of [5.65, 8.35]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .25, 8), new THREE.MeshStandardMaterial({ color: 0x111318, roughness: .8 }));
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .44, z); wheel.castShadow = true; scene.add(wheel);
  }
  // Industrial hanging lamps and warm pools of light.
  for (const [x,z] of [[-10,-9],[1,-11],[11,2],[-2,12]]) {
    makeBox(scene, x, 4.9, z, .14, .55, .14, 0x35393d);
    const lamp = new THREE.PointLight(0xffca84, 34, 13, 2); lamp.position.set(x, 4.4, z); scene.add(lamp);
    makeBox(scene, x, 4.38, z, .75, .12, .75, 0xffd88d, { roughness: .4 });
  }
}

function addParty(scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshStandardMaterial({ color: 0x594d42, roughness: .6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const tile = new THREE.MeshStandardMaterial({ color: 0x81705b, roughness: .54 });
  for (let x = -18; x < 20; x += 4) for (let z = -18; z < 20; z += 4) {
    if (((x + z) / 4) % 2 === 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(3.9, .035, 3.9), tile); m.position.set(x + 2, .018, z + 2); m.receiveShadow = true; scene.add(m); }
  }
  for (const [x,z] of [[-17,-17],[17,-17],[-17,17],[17,17]]) {
    makeBox(scene, x, 2.45, z, .8, 4.9, .8, 0x8d7659);
    makeBox(scene, x, 4.95, z, 1.25, .3, 1.25, 0xd4b982);
  }
  // Cocktail tables and discreet evidence points.
  for (const [x,z] of [[-7,-5],[1,7],[10,-6]]) {
    makeBox(scene, x, .82, z, 2.1, .16, 2.1, 0x8c6946, { metalness: .1 });
    makeBox(scene, x, .4, z, .2, .8, .2, 0x332b26, { metalness: .48 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.31,8), new THREE.MeshStandardMaterial({ color: 0x79cbd0, transparent: true, opacity: .68, roughness: .12 }));
    glass.position.set(x + .38, 1.05, z - .25); scene.add(glass);
  }
  for (const [x,z] of [[-9,-12],[2,-13],[12,5]]) {
    const light = new THREE.PointLight(0xffc86f, 26, 12, 2); light.position.set(x, 4, z); scene.add(light);
    makeBox(scene, x, 4.7, z, .42, .12, .42, 0xffdf9d, { roughness: .28 });
  }
  // Rainy window wall on the far side.
  makeBox(scene, 0, 2.8, -19.4, 38, 5.6, .4, 0x343e4b, { metalness: .24 });
  for (let x = -16; x <= 16; x += 5) {
    makeBox(scene, x, 2.8, -19.14, 3.8, 4.4, .08, 0x29415a, { metalness: .5, roughness: .24 });
    makeBox(scene, x, 2.8, -19.05, .12, 4.6, .13, 0xb79a70);
  }
}

function makeObjective(scene, position, color, geometry = 'box') {
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: .32, metalness: .2 });
  const mesh = geometry === 'diamond' ? new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), material) : new THREE.Mesh(new THREE.BoxGeometry(.75,.18,.55), material);
  mesh.position.set(position.x, 1.15, position.z); mesh.castShadow = true; scene.add(mesh);
  const light = new THREE.PointLight(color, 5, 4); light.position.set(position.x, 1.8, position.z); scene.add(light);
  return { mesh, light, found: false, ...position };
}

export default function CityRushFootMission({ kind, onComplete, onCancel }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const completeRef = useRef(onComplete); completeRef.current = onComplete;
  const cancelRef = useRef(onCancel); cancelRef.current = onCancel;
  const [hud, setHud] = useState({ hp: 100, enemies: 3, clues: 0, suspicion: 0, message: '' });
  const [finished, setFinished] = useState('');
  const [attempt, setAttempt] = useState(0);
  const party = kind === 'infiltration';

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    setFinished('');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(party ? 0x20222b : 0x11151b);
    scene.fog = new THREE.Fog(party ? 0x20222b : 0x11151b, 26, 54);
    const camera = new THREE.PerspectiveCamera(58, 1, .1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
    renderer.domElement.className = `cr-foot-canvas${party ? ' is-stealth' : ''}`; renderer.domElement.setAttribute('aria-label', 'Mission 3D à la première personne, caméra libre');
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xb7c7df, party ? 0x453b33 : 0x252a31, party ? 1.15 : .72); scene.add(hemi);
    const mainLight = new THREE.DirectionalLight(party ? 0xffdca3 : 0xc6d7e3, party ? 2.4 : 1.8); mainLight.position.set(-9,18,8); mainLight.castShadow = true; mainLight.shadow.mapSize.set(1024,1024); scene.add(mainLight);
    if (party) addParty(scene); else addHangar(scene);

    const walls = [
      makeBox(scene, 0, 2.6, -WORLD, WORLD * 2, 5.2, .7, party ? 0x695744 : 0x3c4248),
      makeBox(scene, 0, 2.6, WORLD, WORLD * 2, 5.2, .7, party ? 0x695744 : 0x3c4248),
      makeBox(scene, -WORLD, 2.6, 0, .7, 5.2, WORLD * 2, party ? 0x695744 : 0x3c4248),
      makeBox(scene, WORLD, 2.6, 0, .7, 5.2, WORLD * 2, party ? 0x695744 : 0x3c4248),
    ];
    void walls;
    const player = makeVoxelPerson({ player: true, party }); player.position.set(-16, 0, 0); player.visible = false; scene.add(player);
    const guardSpecs = party
      ? [{x:-4,z:-11,c:0x353d4c},{x:5,z:10,c:0x45404b},{x:13,z:-2,c:0x39414d}]
      : [{x:2,z:-12,c:0x474650},{x:8,z:0,c:0x51464a},{x:15,z:5,c:0x3f4854}];
    const guards = guardSpecs.map((spec, index) => {
      const group = makeVoxelPerson({ color: spec.c, party }); group.position.set(spec.x, 0, spec.z); scene.add(group);
      return { group, hp: 2, alive: true, homeX: spec.x, homeZ: spec.z, phase: index * 2.3, cooldown: .6 + index * .55, speed: 1.5 + index * .25 };
    });
    const cluePositions = [{x:-5,z:-8},{x:4,z:7},{x:12,z:-5}];
    const clues = party ? cluePositions.map((point) => makeObjective(scene, point, 0xf0bf54, 'diamond')) : [];
    const dossier = party ? null : makeObjective(scene, {x:8,z:11}, 0xe2c06f);
    const exitPosition = { x: 18, z: 17 };
    const exit = new THREE.Group();
    const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1,3,.36), new THREE.MeshStandardMaterial({ color: party ? 0x43d9bb : 0xec5158, emissive: party ? 0x167d6b : 0x912833, emissiveIntensity: 1.4 }));
    exit.add(exitFrame); exit.position.set(exitPosition.x, 1.45, exitPosition.z); scene.add(exit);
    const exitLight = new THREE.PointLight(party ? 0x54f2d2 : 0xff5664, 5, 6); exitLight.position.set(exitPosition.x,2.4,exitPosition.z); scene.add(exitLight);

    const keys = new Set(); const bullets = []; const effects = [];
    const state = { player, guards, clues, dossier, exitPosition, time: 0, suspicion: 0, hp: 100, status: 'playing', shootCooldown: 0, interact: false, firing: false, crouch: false, yaw: 0, pitch: 0, lastDamage: 0, message: party ? 'Récupère les trois indices sans te faire repérer.' : 'Repousse les gardes, prends le dossier et rejoins la sortie.', notified: false, lastHud: 0, touchLook: false, lastTouchX: 0, lastTouchY: 0 };
    gameRef.current = { keys, state };
    // First-person arms and a chunky sidearm are attached to the camera.
    camera.rotation.order = 'YXZ';
    const rigMat = (color, roughness = .84) => new THREE.MeshStandardMaterial({ color, roughness });
    const addRigBlock = (material, size, position, rotation = null) => {
      const part = new THREE.Mesh(new THREE.BoxGeometry(...size), material); part.position.set(...position); if (rotation) part.rotation.set(...rotation); part.castShadow = true; camera.add(part); return part;
    };
    addRigBlock(rigMat(party ? 0x20202a : 0x8f2940), [.2,.24,.47], [-.32,-.38,-.58], [-.4,0,.12]);
    addRigBlock(rigMat(0xc48968), [.16,.15,.2], [-.27,-.3,-.8]);
    addRigBlock(rigMat(party ? 0x20202a : 0x8f2940), [.22,.27,.48], [.3,-.37,-.55], [-.42,0,-.18]);
    addRigBlock(rigMat(0xc48968), [.16,.15,.18], [.25,-.28,-.78]);
    if (!party) {
      addRigBlock(rigMat(0x17191f,.4), [.13,.12,.43], [.18,-.24,-.84], [-.04,0,0]);
      addRigBlock(rigMat(0x272a31,.45), [.1,.2,.12], [.18,-.37,-.67]);
      addRigBlock(rigMat(0x535861,.3), [.16,.08,.16], [.18,-.16,-.85]);
    }
    scene.add(camera);
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','shift'].includes(key)) event.preventDefault();
      keys.add(key);
      if (key === 'e' || key === ' ') state.interact = true;
      if (key === 'shift') state.crouch = true;
      if (key === ' ' && !party) state.firing = true;
    };
    const onKeyUp = (event) => {
      const key = event.key.toLowerCase(); keys.delete(key);
      if (key === 'e' || key === ' ') state.interact = false;
      if (key === 'shift') state.crouch = false;
      if (key === ' ') state.firing = false;
    };
    const onBlur = () => { keys.clear(); state.interact = false; state.firing = false; state.crouch = false; };
    const onPointerMove = (event) => {
      if (document.pointerLockElement === renderer.domElement) {
        state.yaw -= event.movementX * .0025;
        state.pitch = clamp(state.pitch - event.movementY * .0022, -1.05, 1.05);
      } else if (state.touchLook && event.pointerType !== 'mouse') {
        const dx = event.clientX - state.lastTouchX; const dy = event.clientY - state.lastTouchY;
        state.lastTouchX = event.clientX; state.lastTouchY = event.clientY;
        state.yaw -= dx * .008; state.pitch = clamp(state.pitch - dy * .006, -1.05, 1.05);
      }
    };
    const onPointerDown = (event) => {
      renderer.domElement.focus?.();
      if (event.pointerType === 'mouse') {
        if (event.button === 0) renderer.domElement.requestPointerLock?.();
        if (!party && event.button === 0) state.firing = true;
      } else {
        state.touchLook = true; state.lastTouchX = event.clientX; state.lastTouchY = event.clientY;
        renderer.domElement.setPointerCapture?.(event.pointerId);
      }
    };
    const onPointerUp = (event) => { if (event.button === 0 && event.pointerType === 'mouse') state.firing = false; if (event.pointerType !== 'mouse') state.touchLook = false; };
    const onLockChange = () => { if (document.pointerLockElement !== renderer.domElement) state.firing = false; };
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur);

    let raf = 0; let prior = performance.now(); let live = true;
    const fire = () => {
      if (party || state.shootCooldown > 0) return;
      state.shootCooldown = .3;
      camera.updateMatrixWorld(true);
      const direction = new THREE.Vector3(); camera.getWorldDirection(direction).normalize();
      const origin = camera.position.clone();
      player.rotation.y = state.yaw;
      const projectile = new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.42), new THREE.MeshBasicMaterial({ color: 0xffd57b }));
      projectile.position.copy(origin).addScaledVector(direction,.65); projectile.quaternion.copy(camera.quaternion); scene.add(projectile);
      bullets.push({ mesh: projectile, pos: projectile.position.clone(), dir: direction.clone(), speed: 28, life: 1.1, enemy: false });
      const muzzle = new THREE.PointLight(0xffcb73, 2.2, 3); muzzle.position.copy(origin).addScaledVector(direction,.5); scene.add(muzzle); effects.push({ object: muzzle, life: .07 });
      for (const guard of guards) {
        if (!guard.alive) continue;
        const target = new THREE.Vector3(guard.group.position.x, 1.25, guard.group.position.z);
        const toTarget = target.clone().sub(origin); const along = toTarget.dot(direction);
        const side = target.clone().sub(origin.clone().addScaledVector(direction, along)).length();
        if (along > 0 && along < 24 && side < .9) {
          guard.hp -= 1;
          if (guard.hp <= 0) { guard.alive = false; guard.group.rotation.z = -Math.PI / 2; guard.group.position.y = -.5; state.message = 'Zone dégagée. Le dossier est repéré.'; }
          else state.message = 'Touché. Continue à avancer.';
          break;
        }
      }
    };
    const animate = (now) => {
      if (!live) return;
      const dt = Math.min(.04, (now - prior) / 1000); prior = now;
      state.time += dt; state.shootCooldown = Math.max(0, state.shootCooldown - dt);
      if (state.status === 'playing') {
        const fwd = Number(keys.has('w') || keys.has('z') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
        const strafe = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('q') || keys.has('arrowleft'));
        const moveLen = Math.hypot(fwd, strafe) || 1;
        const speed = party ? (state.crouch ? 2.3 : 4.1) : 5.1;
        const fx = -Math.sin(state.yaw); const fz = -Math.cos(state.yaw); const rx = Math.cos(state.yaw); const rz = -Math.sin(state.yaw);
        const mx = (fx * fwd + rx * strafe) / moveLen; const mz = (fz * fwd + rz * strafe) / moveLen;
        player.position.x = clamp(player.position.x + mx * speed * dt, -18, 18);
        player.position.z = clamp(player.position.z + mz * speed * dt, -18, 18);
        if (mx || mz) player.rotation.y = Math.atan2(mx, mz);
        const walkParts = player.userData.walkParts; const swing = Math.sin(state.time * (state.crouch ? 6 : 11)) * (mx || mz ? .48 : .05);
        walkParts.leftLeg.rotation.x = swing; walkParts.rightLeg.rotation.x = -swing; walkParts.leftArm.rotation.x = -swing * .55; walkParts.rightArm.rotation.x = swing * .55;
        walkParts.torso.position.y = state.crouch ? .96 : 1.18; player.scale.y = state.crouch ? .84 : 1;
        if (!party) {
          if (state.firing || keys.has(' ')) fire();
          for (const guard of guards) {
            if (!guard.alive) continue;
            const dx = player.position.x - guard.group.position.x; const dz = player.position.z - guard.group.position.z; const d = Math.hypot(dx,dz) || 1;
            guard.group.rotation.y = Math.atan2(dx,dz);
            if (d > 5.8) { guard.group.position.x += dx / d * guard.speed * dt; guard.group.position.z += dz / d * guard.speed * dt; }
            guard.cooldown -= dt;
            if (d < 14 && guard.cooldown <= 0) {
              guard.cooldown = 1.65 + Math.random() * .65;
              const shot = new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.3), new THREE.MeshBasicMaterial({ color: 0xff535b }));
              const pos = new THREE.Vector3(guard.group.position.x, 1.2, guard.group.position.z);
              const direction = new THREE.Vector3(player.position.x, 1.58, player.position.z).sub(pos).normalize();
              shot.position.copy(pos); shot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction); scene.add(shot);
              bullets.push({ mesh: shot, pos, dir: direction, speed: 10, life: 1.9, enemy: true });
            }
          }
          for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i]; bullet.pos.addScaledVector(bullet.dir, bullet.speed * dt); bullet.life -= dt;
            bullet.mesh.position.copy(bullet.pos);
            if (bullet.enemy && bullet.pos.distanceTo(new THREE.Vector3(player.position.x,1.55,player.position.z)) < .8 && now - state.lastDamage > 650) {
              state.hp -= 12; state.lastDamage = now; state.message = 'Touché ! Garde tes distances.'; bullet.life = 0;
              if (state.hp <= 0) { state.hp = 0; state.status = 'failed'; state.message = 'Nico est à terre. Recommence la mission.'; }
            }
            if (bullet.life <= 0 || Math.abs(bullet.pos.x) > 24 || Math.abs(bullet.pos.z) > 24 || bullet.pos.y < 0 || bullet.pos.y > 8) { scene.remove(bullet.mesh); bullet.mesh.geometry.dispose(); bullet.mesh.material.dispose(); bullets.splice(i,1); }
          }
          if (state.interact && guards.every((g) => !g.alive) && dossier && !dossier.found && distance2D(player.position,dossier) < 2.2) {
            dossier.found = true; scene.remove(dossier.mesh); scene.remove(dossier.light); state.message = 'Dossier récupéré. Rejoins la sortie.'; state.interact = false;
          }
          if (dossier?.found && distance2D(player.position,exitPosition) < 2) { state.status = 'complete'; state.message = 'Dossier en sécurité. Le hangar est derrière toi.'; }
        } else {
          guards.forEach((guard,index) => {
            guard.phase = state.time * (.65 + index * .08) + index * 2;
            guard.group.position.x = guard.homeX + Math.cos(guard.phase) * 2.4;
            guard.group.position.z = guard.homeZ + Math.sin(guard.phase * .8) * 1.8;
            const d = distance2D(player.position,guard.group.position);
            if (d < (state.crouch ? 2.2 : 4.8)) state.suspicion += (state.crouch ? 5 : 25) * dt;
            else state.suspicion -= 12 * dt;
          });
          state.suspicion = clamp(state.suspicion, 0, 100);
          if (state.suspicion >= 100) { state.status = 'failed'; state.message = 'Un garde te reconnaît. Recommence plus discrètement.'; }
          if (state.interact) {
            const clue = clues.find((item) => !item.found && distance2D(player.position,item) < 1.9);
            if (clue) { clue.found = true; scene.remove(clue.mesh); scene.remove(clue.light); state.message = `Indice récupéré (${clues.filter((c) => c.found).length}/3).`; }
            state.interact = false;
          }
          if (clues.every((c) => c.found) && distance2D(player.position,exitPosition) < 2) { state.status = 'complete'; state.message = 'Les preuves sont enregistrées. Nico quitte la soirée.'; }
        }
      }
      camera.position.set(player.position.x, state.crouch && party ? 1.34 : 1.62, player.position.z);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      camera.updateMatrixWorld(true);
      clues.forEach((clue,index) => { if (!clue.found) { clue.mesh.position.y = 1.15 + Math.sin(state.time * 2.4 + index) * .16; clue.mesh.rotation.y += dt * 1.1; clue.light.intensity = 4.5 + Math.sin(state.time * 3 + index) * 1.2; } });
      if (dossier && !dossier.found && guards.every((g) => !g.alive)) { dossier.mesh.position.y = 1.15 + Math.sin(state.time * 3) * .15; dossier.mesh.rotation.y += dt * .8; }
      exit.rotation.y = Math.sin(state.time * .7) * .07; exitLight.intensity = 4.5 + Math.sin(state.time * 3) * 1.5;
      effects.forEach((item,index) => { item.life -= dt; if (item.life <= 0) { scene.remove(item.object); effects.splice(index,1); } });
      renderer.render(scene,camera);
      if (now - state.lastHud > 110) {
        state.lastHud = now;
        setHud({ hp: Math.ceil(state.hp), enemies: guards.filter((g) => g.alive).length, clues: clues.filter((c) => c.found).length, suspicion: Math.ceil(state.suspicion), message: state.message });
        if ((state.status === 'complete' || state.status === 'failed') && !state.notified) {
          state.notified = true; setFinished(state.status);
          if (state.status === 'complete') completeRef.current?.();
        }
      }
      raf = requestAnimationFrame(animate);
    };
    const resize = () => { const width = host.clientWidth || 800; const height = host.clientHeight || 450; renderer.setSize(width,height,false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize(); raf = requestAnimationFrame(animate);
    return () => {
      live = false; cancelAnimationFrame(raf); observer.disconnect();
      renderer.domElement.removeEventListener('pointermove',onPointerMove); renderer.domElement.removeEventListener('pointerdown',onPointerDown); window.removeEventListener('pointerup',onPointerUp);
      window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp); window.removeEventListener('blur',onBlur);
      bullets.forEach((b) => { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
      renderer.dispose(); renderer.domElement.remove(); scene.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose()); else object.material.dispose(); } });
      gameRef.current = null;
    };
  }, [kind, attempt]);

  const hold = (key, value) => (event) => { event.preventDefault(); const keys = gameRef.current?.keys; if (!keys) return; if (value) keys.add(key); else keys.delete(key); };
  const action = (name,value) => (event) => { event.preventDefault(); const state = gameRef.current?.state; if (!state) return; if (name === 'interact') state.interact = value; if (name === 'fire') state.firing = value; if (name === 'crouch') state.crouch = value; };
  const retry = () => {
    setFinished(''); setHud({ hp: 100, enemies: 3, clues: 0, suspicion: 0, message: 'Nouvelle tentative…' });
    gameRef.current?.keys.clear(); setAttempt((value) => value + 1);
  };

  return (
    <div className="cr-foot-mission" role="dialog" aria-modal="true" aria-label={party ? 'Mission 3D infiltration à pied' : 'Mission 3D du hangar à pied'}>
      <div className="cr-foot-topline"><span><i className="cr-foot-live-dot" /> OPÉRATION À PIED · VUE FPS / CAMÉRA LIBRE</span><button type="button" onClick={() => cancelRef.current?.()}>QUITTER ↗</button></div>
      <div className="cr-foot-heading"><div><small>MISSION NICO VEGA · {party ? 'LONDRES / MAYFAIR' : 'TOKYO / ZONE PORTUAIRE'}</small><h3>{party ? 'LA SOIRÉE DES OMBRES' : 'LE HANGAR DE SHIBUYA'}</h3><p>{party ? 'Récupère les trois indices puis sors sans éveiller les soupçons.' : 'Mets les gardes hors de combat, prends le dossier puis rejoins la sortie.'}</p></div><div className="cr-foot-objective-icon">{party ? '◉' : '⌖'}</div></div>
      <div className="cr-foot-playfield">
        <div ref={hostRef} className="cr-foot-three-host" />
        {!party && <div className="cr-foot-crosshair" aria-hidden="true">＋</div>}
        <div className="cr-foot-hud">{party ? <><span>INDICES <b>{hud.clues}/3</b></span><span>SOUPÇON <b className={hud.suspicion > 55 ? 'is-warning' : ''}>{hud.suspicion}%</b></span></> : <><span>VITALITÉ <b className={hud.hp < 45 ? 'is-warning' : ''}>{hud.hp}%</b></span><span>GARDES <b>{hud.enemies}</b></span></>}<span className="cr-foot-hud-message">{hud.message}</span></div>
        {finished && <div className="cr-foot-endcard"><span>{finished === 'complete' ? 'OBJECTIF ACCOMPLI' : 'MISSION ÉCHOUÉE'}</span><b>{hud.message}</b>{finished === 'failed' ? <button type="button" onClick={retry}>RECOMMENCER</button> : <small>Chargement de la suite…</small>}</div>}
      </div>
      <div className="cr-foot-controls-note">{party ? 'ZQSD / FLÈCHES : BOUGER · SOURIS / GLISSER : REGARDER · MAJ : SE FUFILER · E : INDICE' : 'ZQSD / FLÈCHES : BOUGER · SOURIS / GLISSER : TOURNER · CLIC MAINTENU / ESPACE : TIRER · E : DOSSIER · ÉCHAP : LIBÉRER LA SOURIS'}</div>
      <div className="cr-foot-touch"><div className="cr-foot-pad"><button onPointerDown={hold('arrowup',true)} onPointerUp={hold('arrowup',false)} onPointerLeave={hold('arrowup',false)}>▲</button><div><button onPointerDown={hold('arrowleft',true)} onPointerUp={hold('arrowleft',false)} onPointerLeave={hold('arrowleft',false)}>◀</button><button onPointerDown={hold('arrowdown',true)} onPointerUp={hold('arrowdown',false)} onPointerLeave={hold('arrowdown',false)}>▼</button><button onPointerDown={hold('arrowright',true)} onPointerUp={hold('arrowright',false)} onPointerLeave={hold('arrowright',false)}>▶</button></div></div>
        <div className="cr-foot-actions">{party && <button onPointerDown={action('crouch',true)} onPointerUp={action('crouch',false)} onPointerLeave={action('crouch',false)}>FUFILER</button>}<button onPointerDown={action('interact',true)} onPointerUp={action('interact',false)} onPointerLeave={action('interact',false)}>{party ? 'E · INDICE' : 'E · DOSSIER'}</button>{!party && <button onPointerDown={action('fire',true)} onPointerUp={action('fire',false)} onPointerLeave={action('fire',false)}>TIRER</button>}</div>
      </div>
    </div>
  );
}
