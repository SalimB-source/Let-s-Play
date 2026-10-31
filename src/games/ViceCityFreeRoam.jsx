import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CITY_RUSH_CARS } from './cityRushRules.js';
import { makeRacerCar, animateRacerCar } from './cityRushRacerModels.js';
import './vice-city-free-roam.css';

const BLOCK = 100;
const ROAD_HALF = 12;
const CITY_LIMIT = 3 * BLOCK + 54;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function makeCity(scene) {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x252a32, roughness: 0.94 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb8a99a, roughness: 0.9 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1d8a0 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x344b42, roughness: 1 });
  const palette = [0xe5b99f, 0xc9b9aa, 0x9bb6b6, 0xd5d0c3, 0xb2a0a2, 0xd4a979, 0x839e9e, 0xf0d1ae];
  const litWindowPositions = [];
  const blueWindowPositions = [];
  const darkWindowPositions = [];
  const verticalDashPositions = [];
  const horizontalDashPositions = [];
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
      const sidewalkV = new THREE.Mesh(new THREE.PlaneGeometry(3.2, CITY_LIMIT * 2 + 120), sidewalkMat);
      sidewalkV.rotation.x = -Math.PI / 2;
      sidewalkV.position.set(axis + side * (ROAD_HALF + 1.6), 0.025, 0);
      scene.add(sidewalkV);
      const sidewalkH = new THREE.Mesh(new THREE.PlaneGeometry(CITY_LIMIT * 2 + 120, 3.2), sidewalkMat);
      sidewalkH.rotation.x = -Math.PI / 2;
      sidewalkH.position.set(0, 0.028, axis + side * (ROAD_HALF + 1.6));
      scene.add(sidewalkH);
      for (const dash of [-1, 1]) {
        const stripeV = new THREE.Mesh(new THREE.PlaneGeometry(0.16, CITY_LIMIT * 2), lineMat);
        stripeV.rotation.x = -Math.PI / 2;
        stripeV.position.set(axis + side * 5.4, 0.035, 0);
        scene.add(stripeV);
        const stripeH = new THREE.Mesh(new THREE.PlaneGeometry(CITY_LIMIT * 2, 0.16), lineMat);
        stripeH.rotation.x = -Math.PI / 2;
        stripeH.position.set(0, 0.038, axis + side * 5.4);
        scene.add(stripeH);
      }
    }
    // Broken centerline on each road, interrupted around each junction.
    for (let p = -3 * BLOCK; p <= 3 * BLOCK; p += 13) {
      if (Math.abs((p + 50) % BLOCK - 50) < 15) continue;
      verticalDashPositions.push([axis, p]);
      horizontalDashPositions.push([p, axis]);
    }
  }

  const marker = new THREE.Object3D();
  const verticalDashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 4), lineMat, verticalDashPositions.length);
  verticalDashes.rotation.x = -Math.PI / 2;
  verticalDashPositions.forEach(([x, z], index) => { marker.position.set(x, 0.04, z); marker.rotation.set(0, 0, 0); marker.updateMatrix(); verticalDashes.setMatrixAt(index, marker.matrix); });
  scene.add(verticalDashes);
  const horizontalDashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 0.22), lineMat, horizontalDashPositions.length);
  horizontalDashes.rotation.x = -Math.PI / 2;
  horizontalDashPositions.forEach(([x, z], index) => { marker.position.set(x, 0.04, z); marker.rotation.set(0, 0, 0); marker.updateMatrix(); horizontalDashes.setMatrixAt(index, marker.matrix); });
  scene.add(horizontalDashes);

  // Art-deco downtown and residential blocks, with varied setbacks, rooftops,
  // lit windows, shop awnings, palms, and corner street furniture.
  let seed = 0x1986cafe;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffcf84, toneMapped: false });
  const blueWindow = new THREE.MeshBasicMaterial({ color: 0x87d9e2, toneMapped: false });
  const darkWindow = new THREE.MeshBasicMaterial({ color: 0x253746, toneMapped: false });
  const palmTrunk = new THREE.MeshStandardMaterial({ color: 0x755b40, roughness: 0.9 });
  const palmLeaf = new THREE.MeshStandardMaterial({ color: 0x236c59, roughness: 0.86 });
  const neon = [0xff668a, 0x45d7dc, 0xf2c968];
  for (let bx = -3; bx < 3; bx += 1) for (let bz = -3; bz < 3; bz += 1) {
    const cx = (bx + 0.5) * BLOCK;
    const cz = (bz + 0.5) * BLOCK;
    const lot = new THREE.Group();
    scene.add(lot);
    // Two or three separate properties make a block read as an actual city lot.
    const count = random() > 0.45 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const width = 20 + random() * 17;
      const depth = 20 + random() * 17;
      const height = 12 + random() * (Math.abs(bx) + Math.abs(bz) < 4 ? 34 : 19);
      const x = cx + (i - (count - 1) / 2) * 20 + (random() - 0.5) * 7;
      const z = cz + (random() - 0.5) * 22;
      const color = palette[Math.floor(random() * palette.length)];
      const facade = new THREE.MeshStandardMaterial({ color, roughness: 0.83, metalness: 0.02 });
      const building = addBox(lot, facade, x, 0.1, z, width, height, depth, true);
      building.userData.cityBuilding = true;
      // Roof parapet and stepped art-deco crown.
      const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.78), roughness: 0.88 });
      addBox(lot, capMat, x, height + 0.1, z, width + 0.7, 0.7, depth + 0.7);
      if (height > 28) {
        addBox(lot, facade, x, height + 0.8, z, width * 0.54, 4.5, depth * 0.72, true);
      }
      // Tall window bands, a shopfront at street level, and selected lit windows.
      const floors = Math.max(2, Math.floor(height / 4.2));
      for (let floor = 0; floor < floors; floor += 1) {
        const y = 1.8 + floor * (height / floors);
        const countWindows = Math.max(3, Math.floor(width / 3.3));
        for (let wi = 0; wi < countWindows; wi += 1) {
          const wx = x - width * 0.39 + wi * (width * 0.78 / Math.max(1, countWindows - 1));
          const lit = random() > 0.44;
          const position = [wx, y, z + depth / 2 + 0.065];
          if (floor === 0) blueWindowPositions.push(position);
          else (lit ? litWindowPositions : darkWindowPositions).push(position);
        }
      }
      const signMat = new THREE.MeshBasicMaterial({ color: neon[Math.floor(random() * neon.length)], toneMapped: false });
      const awning = addBox(lot, signMat, x, 3.2, z + depth / 2 + 0.38, width * 0.72, 0.24, 0.55);
      awning.material = signMat;
      // Back alley HVAC and rooftop water tank detail.
      if (random() > 0.45) addBox(lot, capMat, x + width * 0.25, height + 0.8, z, 2.8, 1.6, 2.8);
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
  const addWindowInstances = (positions, material) => {
    const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 1.45, 0.1), material, positions.length);
    positions.forEach(([x, y, z], index) => { marker.position.set(x, y, z); marker.rotation.set(0, 0, 0); marker.scale.set(1, 1, 1); marker.updateMatrix(); windows.setMatrixAt(index, marker.matrix); });
    windows.instanceMatrix.needsUpdate = true;
    scene.add(windows);
  };
  addWindowInstances(litWindowPositions, windowMat);
  addWindowInstances(blueWindowPositions, blueWindow);
  addWindowInstances(darkWindowPositions, darkWindow);
  return { ground, roadMat, sidewalkMat };
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
    scene.background = new THREE.Color(0x9a9fae);
    scene.fog = new THREE.Fog(0x9a9fae, 100, 510);
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
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
    makeCity(scene);

    const profile = CITY_RUSH_CARS.find((car) => car.id === carId) || CITY_RUSH_CARS[0];
    const maxSpeed = 35 * profile.powerMultiplier;
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
    let frame = 0; let last = performance.now(); let hudAt = 0;
    const animate = (now) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.04, Math.max(0, (now - last) / 1000)); last = now; state.time += dt;
      const pressed = (code) => keys.has(code) || touchKeysRef.current.has(code);
      const throttle = pressed('ArrowUp') || pressed('KeyW');
      const brake = pressed('ArrowDown') || pressed('KeyS');
      const steerInput = (pressed('ArrowRight') || pressed('KeyD') ? 1 : 0) - (pressed('ArrowLeft') || pressed('KeyA') || pressed('KeyQ') ? 1 : 0);
      if (brake) {
        // Freinage appuyé mais borné à environ 0,9 g ; la voiture ne recule pas.
        state.speed = Math.max(0, state.speed - 9 * dt);
      } else if (throttle) {
        // L'accélération diminue naturellement à l'approche de la vitesse de pointe.
        const speedRatio = state.speed / maxSpeed;
        state.speed += acceleration * Math.max(0.12, 1 - speedRatio * speedRatio) * dt;
      } else if (state.speed > 0) {
        // Résistance au roulement et traînée aérodynamique à la décélération.
        state.speed = Math.max(0, state.speed - (0.42 + state.speed * state.speed * 0.0011) * dt);
      }
      state.speed = clamp(state.speed, 0, maxSpeed);
      if (state.speed < 0.12 && !throttle) state.speed = 0;
      state.steer += (steerInput - state.steer) * Math.min(1, dt * 5.5);
      // Modèle bicyclette : environ 32° de braquage max à basse vitesse,
      // puis l'adhérence limite le lacet à 0,82 g. À haute vitesse, le rayon
      // de virage s'élargit au lieu de faire pivoter la voiture sur place.
      const wheelAngle = state.steer * 0.56;
      const wheelbase = 2.75;
      const requestedYawRate = (state.speed / wheelbase) * Math.tan(wheelAngle);
      const gripYawLimit = state.speed > 0.1 ? (0.82 * 9.81) / state.speed : 0;
      const yawRate = clamp(requestedYawRate, -gripYawLimit, gripYawLimit);
      state.heading += yawRate * dt;
      // Les modèles du garage pointent le capot vers leur axe local -Z.
      forward.set(Math.sin(state.heading), 0, -Math.cos(state.heading));
      const nextX = state.x + forward.x * state.speed * dt;
      const nextZ = state.z + forward.z * state.speed * dt;
      // Buildings occupy the blocks between streets. Keep the car on a road
      // corridor, but let it cross freely at every perpendicular junction.
      const roadX = Math.abs(nextX - Math.round(nextX / BLOCK) * BLOCK) <= ROAD_HALF - 1.5;
      const roadZ = Math.abs(nextZ - Math.round(nextZ / BLOCK) * BLOCK) <= ROAD_HALF - 1.5;
      const junctionX = Math.abs(nextX - Math.round(nextX / BLOCK) * BLOCK) < ROAD_HALF + 2;
      const junctionZ = Math.abs(nextZ - Math.round(nextZ / BLOCK) * BLOCK) < ROAD_HALF + 2;
      if (roadX || roadZ || (junctionX && junctionZ)) { state.x = nextX; state.z = nextZ; }
      else { state.speed *= 0.25; }
      if (Math.abs(state.x) > CITY_LIMIT || Math.abs(state.z) > CITY_LIMIT) {
        state.x = clamp(state.x, -CITY_LIMIT, CITY_LIMIT); state.z = clamp(state.z, -CITY_LIMIT, CITY_LIMIT); state.speed = 0;
      }
      vehicle.position.set(state.x, 0, state.z);
      vehicle.rotation.y = -state.heading;
      animateRacerCar(vehicle, { speed: state.speed, maxSpeed, steer: state.steer * 0.56, braking: brake, idle: !throttle && state.speed === 0 }, dt, state.time);
      cameraPosition.copy(vehicle.position).addScaledVector(forward, -10.5);
      cameraPosition.y += 5.5;
      camera.position.lerp(cameraPosition, 1 - Math.exp(-dt * 3.4));
      cameraTarget.set(state.x + forward.x * 8, 1.2, state.z + forward.z * 8);
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
      <div className="vice-free-roam-controls"><b>COMMANDES</b><span><kbd>↑</kbd> ACCÉLÉRER</span><span><kbd>↓</kbd> FREINER</span><span><kbd>←</kbd><kbd>→</kbd> BRAQUER</span><small>WASD également disponibles · Échap pour quitter</small></div>
      <div className="vice-free-roam-touch" aria-label="Commandes tactiles de conduite">
        {[
          ['ArrowLeft', '←', 'Tourner à gauche'], ['ArrowUp', '↑', 'Accélérer'],
          ['ArrowDown', '↓', 'Freiner'], ['ArrowRight', '→', 'Tourner à droite'],
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
