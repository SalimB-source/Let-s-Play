/**
 * Harnais de `check:city-rush-garage-3d-scene` : monte la vraie scène de garage
 * de `ViceCityGarageStage` avec un renderer factice (aucun GPU nécessaire), puis
 * vérifie ce que la scène a réellement construit — la cabine, le plateau, la
 * voiture, les lumières — et surtout le cadrage : le plateau et la voiture
 * doivent remplir le cadre, sur un écran large comme sur un téléphone.
 *
 * Exporté sous forme de fonction pour être importé depuis le script de
 * vérification (comme `vice-city-garage-3d-smoke.jsx`).
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import ViceCityGarageStage from '../src/games/ViceCityGarageStage.jsx';
import { CITY_RUSH_CARS } from '../src/games/cityRushRules.js';

const CAMERA_TARGET_Y = 0.7;
const TURNTABLE_RADIUS = 3.6;
const PLATFORM_FILL = 0.92;
const CAMERA_FOV = 40;
// Le second cadrage de la scène (`GARAGE_FRAMINGS.vitrine`, posé par
// l'écran-titre) : objectif ouvert, plateau qui ne remplit plus le cadre.
const VITRINE_FOV = 50;
const VITRINE_FILL = 0.5;
const VITRINE_MAX_RECUL = 13;
const MAX_RECUL = 13;
const ROOM_HALF_WIDTH = 11;
const ROOM_FRONT_Z = 9;
const ROOM_CEILING_Y = 6.4;
const UP = new THREE.Vector3(0, 1, 0);

/** Taille de la fenêtre telle que la scène la verra (jsdom ne calcule rien). */
function setViewport(width, height) {
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { configurable: true, value: height });
}

/** Distance caméra ↔ plateau pour que le plateau remplisse le cadre. */
function expectedDistance(aspect) {
  const half = Math.tan((CAMERA_FOV * Math.PI) / 180 / 2);
  const wanted = (TURNTABLE_RADIUS * 2) / PLATFORM_FILL;
  const fitted = wanted / (2 * half * Math.max(aspect, 0.4));
  return Math.min(MAX_RECUL, Math.max(4.4, fitted));
}

/**
 * Part de la largeur du cadre occupée par la voiture, dans sa rotation la plus
 * défavorable (le plateau tourne en continu). 1 = tout le cadre.
 */
function carWidthShare(camera, box) {
  camera.updateMatrixWorld(true);
  const corners = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }
  let worst = 0;
  for (const spin of [0, Math.PI / 4, Math.PI / 2]) {
    let min = Infinity;
    let max = -Infinity;
    for (const corner of corners) {
      const projected = corner.clone().applyAxisAngle(UP, spin).project(camera);
      min = Math.min(min, projected.x);
      max = Math.max(max, projected.x);
    }
    worst = Math.max(worst, (max - min) / 2);
  }
  return worst;
}

/**
 * Boîte englobante de la silhouette de la voiture : les faisceaux de phares et
 * les flammes sont de longs cônes décoratifs qui ne comptent pas dans le
 * gabarit de la carrosserie (sinon le cadrage serait calculé sur 9 m de faisceau
 * au lieu des ~4,3 m de la voiture).
 */
function silhouetteBox(object) {
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeBoundingBox();
    child.geometry.boundingBox.getSize(size);
    if (Math.max(size.x, size.y, size.z) > 3) return;
    box.expandByObject(child);
  });
  return box;
}

export async function checkViceCityGarage3dScene(assert) {
  const car = CITY_RUSH_CARS[1];
  const container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.__renders = [];

  // Un écran large de préparation : ~1000 × 700 px.
  setViewport(1000, 700);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ViceCityGarageStage
        carId={car.id}
        carName={car.name}
        accent="#39f0c8"
        fallbackSrc={`/img/car-${car.id}.jpg`}
      />,
    );
  });

  const canvas = container.querySelector('.city-rush-hub-stage-canvas-element');
  assert.ok(canvas, 'la scène monte son canvas (pas de repli photo)');
  assert.equal(container.querySelectorAll('.city-rush-hub-stage-fallback').length, 0, 'aucun repli photo');

  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });

  const renders = globalThis.__renders || [];
  assert.ok(renders.length > 3, `la boucle de rendu tourne (${renders.length} images)`);
  const { scene, camera } = renders[renders.length - 1];

  // ── La salle d'exposition est bien meublée ────────────────────────────────
  const counts = { mesh: 0, light: 0, points: 0 };
  const named = new Set();
  const parked = [];
  let carGroup = null;
  let turntable = null;
  scene.traverse((object) => {
    if (object.isMesh) counts.mesh += 1;
    if (object.isLight) counts.light += 1;
    if (object.isPoints) counts.points += 1;
    const name = object.name || '';
    if (/^vice-city-garage-/.test(name)) named.add(name);
    if (/^vice-city-garage-lot-/.test(name)) parked.push(name.slice('vice-city-garage-lot-'.length));
    if (object.name === `vice-city-garage-car-${car.id}`) carGroup = object;
    if (object.name === 'vice-city-garage-turntable') turntable = object;
  });
  assert.ok(carGroup, `la voiture ${car.id} est modélisée dans la scène`);
  assert.ok(turntable, 'le plateau tournant est dans la scène');
  assert.ok(counts.mesh > 40, `la salle est meublée (${counts.mesh} maillages)`);
  assert.equal(
    counts.light,
    7,
    'ambient + hémisphère + projecteur clé + dousseur + contre-jour + enseigne + lavage du lot',
  );
  assert.equal(counts.points, 1, 'les poussières dans les faisceaux');

  // Une concession se reconnaît à son architecture commerciale, pas à un néon.
  for (const [nom, attendu] of [
    ['vice-city-garage-storefront', 'la façade vitrée'],
    ['vice-city-garage-city', 'la ville, vue de la vitrine'],
    ['vice-city-garage-brand-wall', 'le mur de marque à lames'],
    ['vice-city-garage-sign', 'l’enseigne du concessionnaire'],
    ['vice-city-garage-carpet', 'le tapis cerise sous le plateau'],
    ['vice-city-garage-showroom', 'le mobilier de salle (comptoir, jantes, palmiers)'],
    ['vice-city-garage-lot', 'le lot garé au fond'],
    ['vice-city-garage-ribbon', 'le nœud de livraison sur le capot'],
  ]) {
    assert.ok(named.has(nom), `${attendu} est posé dans la scène`);
  }
  assert.equal(parked.length, 3, `trois modèles du catalogue sont garés en rayon (${parked.join(', ')})`);
  assert.ok(!parked.includes(car.id), 'le lot ne redouble pas la voiture montée au plateau');

  // ── Le cadrage : le plateau remplit le cadre ──────────────────────────────
  assert.equal(camera.fov, CAMERA_FOV, 'focale de 40°');
  const aspect = camera.aspect;
  const distance = Math.hypot(camera.position.x, camera.position.y - CAMERA_TARGET_Y, camera.position.z);
  const wanted = expectedDistance(aspect);
  assert.ok(Math.abs(distance - wanted) < 0.6, `caméra à ${distance.toFixed(2)} m du plateau (attendu ${wanted.toFixed(2)} m)`);
  assert.ok(camera.position.x > 0 && camera.position.z > 0, 'caméra en trois-quarts avant');

  // Le plateau occupe bien la part de cadre demandée.
  const visibleWidth = 2 * distance * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2) * aspect;
  const platformShare = (TURNTABLE_RADIUS * 2) / visibleWidth;
  assert.ok(
    Math.abs(platformShare - PLATFORM_FILL) < 0.06,
    `le plateau occupe ${(platformShare * 100).toFixed(0)} % de la largeur du cadre`,
  );
  // Et la voiture, elle, est bien le sujet du cadre : elle ne doit pas être
  // réduite à un détail au milieu du décor.
  const carShare = carWidthShare(camera, silhouetteBox(carGroup));
  assert.ok(
    carShare >= 0.45,
    `la voiture occupe ${(carShare * 100).toFixed(0)} % de la largeur du cadre`,
  );
  // La caméra reste dans la salle, même au recul maximal.
  assert.ok(
    Math.abs(camera.position.x) < ROOM_HALF_WIDTH && camera.position.z < ROOM_FRONT_Z && camera.position.y < ROOM_CEILING_Y,
    `caméra dans la salle : ${camera.position.toArray().map((value) => value.toFixed(2)).join(', ')}`,
  );

  // ── Le plateau tourne ─────────────────────────────────────────────────────
  const before = turntable.rotation.y;
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
  assert.notEqual(turntable.rotation.y, before, 'le plateau tourne');

  // ── Écran de téléphone : la voiture entière tient dans le cadre ───────────
  setViewport(390, 720);
  globalThis.__fireResize?.();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
  const phone = (globalThis.__renders || []).slice(-1)[0].camera;
  assert.ok(phone.aspect < 0.6, `aspect de téléphone (${phone.aspect.toFixed(2)})`);
  const phoneDistance = Math.hypot(phone.position.x, phone.position.y - CAMERA_TARGET_Y, phone.position.z);
  assert.ok(phoneDistance <= MAX_RECUL + 0.05, `recul borné à ${MAX_RECUL} m (${phoneDistance.toFixed(2)} m)`);
  const phoneShare = carWidthShare(phone, silhouetteBox(carGroup));
  assert.ok(
    phoneShare <= 1.02,
    `une voiture entière tient dans le cadre d'un téléphone (${(phoneShare * 100).toFixed(0)} % de la largeur)`,
  );
  assert.ok(phoneShare >= 0.6, `elle reste grande à l'écran (${(phoneShare * 100).toFixed(0)} % de la largeur)`);

  // ── Changement de voiture : la scène se reconstruit ───────────────────────
  const other = CITY_RUSH_CARS[4];
  await act(async () => {
    root.render(
      <ViceCityGarageStage
        carId={other.id}
        carName={other.name}
        accent="#ff6b3d"
        fallbackSrc={`/img/car-${other.id}.jpg`}
      />,
    );
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 160)); });
  const lastRender = (globalThis.__renders || []).slice(-1)[0];
  let rebuilt = null;
  lastRender.scene.traverse((object) => {
    if (object.name === `vice-city-garage-car-${other.id}`) rebuilt = object;
  });
  assert.ok(rebuilt, `changer de voiture remonte la scène (${other.id})`);
  const rebuiltShare = carWidthShare(lastRender.camera, silhouetteBox(rebuilt));
  assert.ok(rebuiltShare >= 0.45, `la nouvelle voiture occupe aussi le cadre (${(rebuiltShare * 100).toFixed(0)} %)`);

  // ── Le cadrage « vitrine » de l'écran-titre : même scène, plan large ──────
  // L'écran-titre a gardé la baie d'atelier du garage mais on la recule : la
  // voiture y est un sujet dans un décor, plus un gros plan. Vérifié au large
  // (l'aspec du hub) et au portrait (la voiture doit rester entière).
  setViewport(1440, 810);
  const vitrineHost = document.createElement('div');
  document.body.appendChild(vitrineHost);
  const vitrineRoot = createRoot(vitrineHost);
  const marks = (globalThis.__renders || []).length;
  await act(async () => {
    vitrineRoot.render(
      <ViceCityGarageStage carId={other.id} carName={other.name} accent="#ff6b3d" framing="vitrine" />,
    );
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
  const vitrineFrames = (globalThis.__renders || [])
    .slice(marks)
    .filter((frame) => frame.camera.fov === VITRINE_FOV);
  assert.ok(vitrineFrames.length > 3, `la vitrine rend ses images (${vitrineFrames.length})`);
  const vitrine = vitrineFrames.at(-1);
  let vitrineCar = null;
  let vitrineTurntable = null;
  vitrine.scene.traverse((object) => {
    if (object.name === `vice-city-garage-car-${other.id}`) vitrineCar = object;
    if (object.name === 'vice-city-garage-turntable') vitrineTurntable = object;
  });
  assert.ok(vitrineCar && vitrineTurntable, 'la vitrine montre le même plateau et la même voiture');

  const vitrineDistance = Math.hypot(
    vitrine.camera.position.x,
    vitrine.camera.position.y - CAMERA_TARGET_Y,
    vitrine.camera.position.z,
  );
  assert.ok(vitrineDistance > distance + 1, `la caméra a reculé : ${vitrineDistance.toFixed(2)} m contre ${distance.toFixed(2)} m au garage`);
  const vitrineVisibleWidth = 2 * vitrineDistance * Math.tan((VITRINE_FOV * Math.PI) / 180 / 2) * vitrine.camera.aspect;
  const vitrinePlatformShare = (TURNTABLE_RADIUS * 2) / vitrineVisibleWidth;
  assert.ok(
    Math.abs(vitrinePlatformShare - VITRINE_FILL) < 0.06,
    `le plateau de la vitrine occupe ${(vitrinePlatformShare * 100).toFixed(0)} % du cadre, pas plus`,
  );
  const vitrineCarShare = carWidthShare(vitrine.camera, silhouetteBox(vitrineCar));
  assert.ok(
    vitrineCarShare < carShare - 0.1,
    `la voiture est dézoomée à l'écran-titre (${(vitrineCarShare * 100).toFixed(0)} % contre ${(carShare * 100).toFixed(0)} % au garage)`,
  );
  assert.ok(vitrineCarShare >= 0.14, `elle reste le sujet du cadre (${(vitrineCarShare * 100).toFixed(0)} % de la largeur)`);
  assert.ok(
    Math.abs(vitrine.camera.position.x) < ROOM_HALF_WIDTH
      && vitrine.camera.position.z < ROOM_FRONT_Z
      && vitrine.camera.position.y < ROOM_CEILING_Y,
    `la caméra de la vitrine ne sort pas de la cabine : ${vitrine.camera.position.toArray().map((value) => value.toFixed(2)).join(', ')}`,
  );
  const vitrineSpinBefore = vitrineTurntable.rotation.y;
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
  assert.notEqual(vitrineTurntable.rotation.y, vitrineSpinBefore, 'le plateau de la vitrine tourne');

  // Un téléphone en portrait : dézoomée, mais jamais coupée.
  await act(async () => { vitrineRoot.unmount(); });
  setViewport(390, 844);
  const phoneVitrineHost = document.createElement('div');
  document.body.appendChild(phoneVitrineHost);
  const phoneVitrineRoot = createRoot(phoneVitrineHost);
  const phoneMarks = (globalThis.__renders || []).length;
  await act(async () => {
    phoneVitrineRoot.render(
      <ViceCityGarageStage carId={other.id} carName={other.name} accent="#ff6b3d" framing="vitrine" />,
    );
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
  const phoneVitrine = (globalThis.__renders || [])
    .slice(phoneMarks)
    .filter((frame) => frame.camera.fov === VITRINE_FOV)
    .at(-1);
  assert.ok(phoneVitrine, 'la vitrine se monte aussi sur un écran de téléphone');
  const phoneVitrineShare = carWidthShare(phoneVitrine.camera, silhouetteBox(vitrineCar));
  assert.ok(
    phoneVitrineShare <= 1.02,
    `la voiture dézoomée tient entière dans le cadre d'un téléphone (${(phoneVitrineShare * 100).toFixed(0)} % de la largeur)`,
  );
  await act(async () => { phoneVitrineRoot.unmount(); });
  phoneVitrineHost.remove();
  vitrineHost.remove();

  await act(async () => { root.unmount(); });
  assert.equal(
    container.querySelectorAll('.city-rush-hub-stage-canvas-element').length,
    0,
    'le canvas est retiré au démontage',
  );
  container.remove();
  return {
    mesh: counts.mesh,
    images: (globalThis.__renders || []).length,
    voiture: car.id,
    partLarge: carShare,
    partTelephone: phoneShare,
    partVitrine: vitrineCarShare,
  };
}
