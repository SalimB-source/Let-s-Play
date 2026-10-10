import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TOUGE_COURSE,
  CITY_RUSH_TRACK_PROFILE_TOUGE,
} from '../src/games/cityRushRules.js';

// Le ruban de la route, des accotements et du sol est replié sur lui-même dans
// les épingles : certains triangles s'inversent à l'écran. Un matériau à face
// avant seule les efface selon l'angle de la caméra, et le décor sous-jacent
// (sol, terre) apparaît et disparaît d'une image à l'autre : c'est le
// clignotement des virages serrés. Ce test vérifie que tout ruban qui contient
// de tels triangles est rendu des deux côtés.

const context2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {},
  closePath() {}, lineTo() {}, moveTo() {}, clearRect() {}, save() {}, restore() {},
  createLinearGradient: () => ({ addColorStop() {} }),
  measureText: () => ({ width: 10 }), drawImage() {}, setTransform() {}, scale() {},
  translate() {}, rotate() {}, resetTransform() {}, transform() {},
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const { makeTougeRoad, buildTougeTrack, TOUGE_VERGE_OUTER } = await import('../src/games/tougeStage.js');
const { seededRandom } = await import('../src/games/cityRushBuilder.js');

/** Triangles dont l'orientation dans le plan XZ est inversée (sens du sol = aire < 0). */
function flippedTriangles(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index.array;
  let flipped = 0;
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t];
    const b = index[t + 1];
    const c = index[t + 2];
    const area = (position.getX(b) - position.getX(a)) * (position.getZ(c) - position.getZ(a))
      - (position.getZ(b) - position.getZ(a)) * (position.getX(c) - position.getX(a));
    if (area >= 0) flipped += 1;
  }
  return flipped;
}

test('les rubans repliés dans les épingles sont rendus des deux côtés', () => {
  const scene = new THREE.Group();
  const theme = { roadHalf: 3.2 };
  const { scroll } = makeTougeRoad(scene, theme, seededRandom(2007), 0, CITY_RUSH_TRACK_PROFILE_TOUGE);
  const meshes = scene.children.filter((child) => child.isMesh);
  assert.ok(meshes.length >= 5, 'la route, ses accotements, ses bordures et le sol sont posés');

  const sawFold = new Map();
  for (let distance = 0; distance < CITY_RUSH_LAP_LENGTH; distance += 10) {
    scroll(0, distance);
    for (const mesh of meshes) {
      const count = flippedTriangles(mesh.geometry);
      if (count > 0) sawFold.set(mesh, Math.max(sawFold.get(mesh) || 0, count));
    }
  }

  const folded = [...sawFold.entries()];
  assert.ok(folded.length > 0, 'les épingles replient bien au moins un ruban (le test porte sur un vrai cas)');
  for (const [mesh, count] of folded) {
    assert.equal(mesh.material.side, THREE.DoubleSide,
      `un ruban replié (${count} triangles inversés) est encore rendu d'un seul côté : il clignote`);
  }
});

test('la chaussée elle-même ne se replie jamais', () => {
  const scene = new THREE.Group();
  const { scroll } = makeTougeRoad(scene, { roadHalf: 3.2 }, seededRandom(2007), 0, CITY_RUSH_TRACK_PROFILE_TOUGE);
  const road = scene.children.find((child) => child.isMesh && child.material.map?.repeat);
  assert.ok(road, 'le ruban de la chaussée existe');
  for (let distance = 0; distance < CITY_RUSH_LAP_LENGTH; distance += 10) {
    scroll(0, distance);
    assert.equal(flippedTriangles(road.geometry), 0, `la chaussée se replie à ${distance} m`);
  }
});

// ─── Doublons du décor : longueurs piste vs unités monde ───────────────────
// Le décor fusionné est posé en unités monde puis plié le long de la piste
// (`bendLoopGeometry`, `mètres = -z / SCALE`). Toute longueur pensée en mètres
// de piste mais posée telle quelle en monde est 39 % trop longue (SCALE 0,72) :
// les tronçons de glissière se recouvrent, et leurs cordes doublées divergent
// dans les épingles — des lisses qui se traversent et clignotent à chaque
// virage. Même cause, mêmes effets pour les tranches du tunnel, la paroi de
// la tranchée, le pont et le parking du belvédère.

/** Un lot de construction qui enregistre les primitives au lieu de les fondre. */
function recordingBatch() {
  const calls = [];
  return {
    calls,
    batch: {
      box: (material, position, size, rotation, options) => calls.push({ kind: 'box', material, position, size, rotation, options }),
      plane: (material, position, width, height, rotation, options) => calls.push({ kind: 'plane', material, position, size: [width, height], rotation, options }),
      cylinder: (material, position, radiusTop, radiusBottom, height, segments, rotation, options) => calls.push({ kind: 'cylinder', material, position, size: [radiusTop, radiusBottom, height], rotation, options }),
      cone: (material, position, radius, height) => calls.push({ kind: 'cone', material, position, size: [radius, height] }),
      sphere: (material, position, radius) => calls.push({ kind: 'sphere', material, position, size: [radius] }),
      torus: () => {}, custom: () => {},
    },
  };
}

const tougeCalls = (() => {
  const { batch, calls } = recordingBatch();
  buildTougeTrack({ city: CITY_RUSH_TOUGE_COURSE, theme: { materials: {} }, materials: {}, batch, cityIndex: 0, lite: false, route: CITY_RUSH_TOUGE });
  return calls;
})();

const metresOf = (z) => -z / CITY_RUSH_SCROLL_SCALE;

/** Plie un point du décor comme `bendLoopGeometry` le fait avant le rendu. */
function bendTouge(x, z) {
  const profile = CITY_RUSH_TRACK_PROFILE_TOUGE;
  const metre = metresOf(z);
  const yaw = profile.yaw(metre);
  return {
    x: profile.offset(metre) + x * Math.cos(yaw),
    z: -profile.forward(metre) * CITY_RUSH_SCROLL_SCALE - x * Math.sin(yaw) * CITY_RUSH_SCROLL_SCALE,
  };
}

test('les lisses de glissière sont jointives, sans doublon qui clignote', () => {
  const rails = tougeCalls.filter((call) => call.kind === 'cylinder'
    && Math.abs(call.position[0]) > 3 && Math.abs(call.position[0]) < 5
    && (Math.abs(call.position[1] - 0.62) < 1e-9 || Math.abs(call.position[1] - 0.36) < 1e-9));
  assert.ok(rails.length > 500, 'les deux lisses courent sur toute la descente');
  const byRail = new Map();
  for (const rail of rails) {
    const key = `${Math.sign(rail.position[0])}:${rail.position[1].toFixed(2)}`;
    if (!byRail.has(key)) byRail.set(key, []);
    byRail.get(key).push(rail);
  }
  assert.equal(byRail.size, 4, 'deux côtés, deux lisses par côté');
  for (const [key, list] of byRail) {
    list.sort((a, b) => b.position[2] - a.position[2]);
    for (let index = 1; index < list.length; index += 1) {
      const previous = list[index - 1];
      const current = list[index];
      const overlap = (previous.size[2] + current.size[2]) / 2 - Math.abs(current.position[2] - previous.position[2]);
      assert.ok(overlap <= 0.05,
        `la lisse ${key} se recouvre de ${overlap.toFixed(2)} unités à ${metresOf(current.position[2]).toFixed(0)} m : doublon`);
    }
  }
});

test('les lisses doublées ne divergent pas dans les épingles une fois pliées', () => {
  const rails = tougeCalls.filter((call) => call.kind === 'cylinder'
    && Math.abs(call.position[0]) > 3 && Math.abs(call.position[0]) < 5
    && Math.abs(call.position[1] - 0.62) < 1e-9);
  const tubeRadius = 0.055;
  let checked = 0;
  for (const side of [-1, 1]) {
    const sorted = rails.filter((rail) => Math.sign(rail.position[0]) === side)
      .sort((a, b) => b.position[2] - a.position[2]);
    for (let index = 1; index < sorted.length; index += 1) {
      const a = sorted[index - 1];
      const b = sorted[index];
      const aSpan = [a.position[2] - a.size[2] / 2, a.position[2] + a.size[2] / 2];
    const bSpan = [b.position[2] - b.size[2] / 2, b.position[2] + b.size[2] / 2];
    const low = Math.max(Math.min(...aSpan), Math.min(...bSpan));
    const high = Math.min(Math.max(...aSpan), Math.max(...bSpan));
    if (high - low <= 0.005) continue;
    checked += 1;
    // Chaque tronçon est une corde entre ses extrémités pliées : on mesure
    // l'écart transverse des deux cordes sur leur recouvrement.
    const aEnds = [bendTouge(a.position[0], Math.min(...aSpan)), bendTouge(a.position[0], Math.max(...aSpan))];
    const bEnds = [bendTouge(b.position[0], Math.min(...bSpan)), bendTouge(b.position[0], Math.max(...bSpan))];
    for (let step = 0; step <= 4; step += 1) {
      const z = low + (high - low) * (step / 4);
      const tA = (z - Math.min(...aSpan)) / (Math.max(...aSpan) - Math.min(...aSpan));
      const tB = (z - Math.min(...bSpan)) / (Math.max(...bSpan) - Math.min(...bSpan));
      const gap = Math.hypot(
        (aEnds[0].x + (aEnds[1].x - aEnds[0].x) * tA) - (bEnds[0].x + (bEnds[1].x - bEnds[0].x) * tB),
        (aEnds[0].z + (aEnds[1].z - aEnds[0].z) * tA) - (bEnds[0].z + (bEnds[1].z - bEnds[0].z) * tB),
      );
      assert.ok(gap < tubeRadius,
        `les lisses doublées s'écartent de ${(gap * 100).toFixed(0)} cm à ${metresOf(z).toFixed(0)} m : elles se traversent dans le virage`);
      }
    }
  }
  assert.ok(checked > 100, 'le test couvre bien les joints des deux côtés');
});

test('les tranches du tunnel sont jointives, sans faces coplanaires', () => {
  // Parois du tunnel : 1,80 m de large, 7,40 m de haut (dégagement caméra).
  const walls = tougeCalls.filter((call) => call.kind === 'box'
    && Math.abs(call.size[0] - 1.8) < 1e-9 && Math.abs(call.size[1] - 7.4) < 1e-9);
  assert.ok(walls.length > 100, 'le tunnel est bien posé par tranches');
  for (const side of [-1, 1]) {
    const slices = walls.filter((wall) => Math.sign(wall.position[0]) === side)
      .sort((a, b) => b.position[2] - a.position[2]);
    for (let index = 1; index < slices.length; index += 1) {
      const overlap = (slices[index - 1].size[2] + slices[index].size[2]) / 2
        - Math.abs(slices[index].position[2] - slices[index - 1].position[2]);
      assert.ok(overlap <= 0.1, `deux tranches du tunnel se recouvrent de ${overlap.toFixed(2)} unités : battement de profondeur`);
    }
  }
});

test('la paroi de la tranchée tient dans son secteur', () => {
  // Mur extérieur de la tranchée 岩垂壁 : 2,20 m de large, 6,80 m de haut.
  const walls = tougeCalls.filter((call) => call.kind === 'box'
    && Math.abs(call.size[0] - 2.2) < 1e-9 && Math.abs(call.size[1] - 6.8) < 1e-9);
  assert.ok(walls.length > 0, 'la paroi de la tranchée est posée');
  const sector = CITY_RUSH_TOUGE.sectors.find((entry) => entry.id === 'iwadarekabe');
  const from = sector.from * CITY_RUSH_LAP_LENGTH;
  const to = sector.to * CITY_RUSH_LAP_LENGTH;
  for (const wall of walls) {
    const span = [metresOf(wall.position[2] + wall.size[2] / 2), metresOf(wall.position[2] - wall.size[2] / 2)];
    assert.ok(Math.min(...span) >= from - 3 && Math.max(...span) <= to + 3,
      `la paroi déborde de son secteur (${Math.min(...span).toFixed(0)}..${Math.max(...span).toFixed(0)} m pour ${from.toFixed(0)}..${to.toFixed(0)} m)`);
  }
});

test('le lac ne recouvre pas la chaussée', () => {
  const water = tougeCalls.filter((call) => call.kind === 'box'
    && Math.abs(call.size[0] - 48) < 1e-9 && Math.abs(call.size[1] - 0.12) < 1e-9);
  assert.equal(water.length, 1, 'la nappe du lac est posée une fois');
  const leftEdge = Math.abs(water[0].position[0]) - water[0].size[0] / 2;
  assert.ok(leftEdge >= TOUGE_VERGE_OUTER - 0.01,
    `le lac commence à ${leftEdge.toFixed(1)} m de l'axe : il noie la route (rive à ${TOUGE_VERGE_OUTER} m)`);
});

test('aucun décor du tōgé ne part derrière la ligne ni dans le ciel', () => {
  // Tout le décor (hors zone de départ, posée par ailleurs) est en mètres de
  // piste convertis : z monde négatif. Un z positif trahit un `toZ` oublié —
  // le décor s'enroule alors au mauvais endroit du tour, voire flotte à une
  // centaine d'unités d'altitude une fois l'unité de descente déroulée.
  for (const call of tougeCalls) {
    if (call.kind !== 'box' && call.kind !== 'cylinder' && call.kind !== 'cone' && call.kind !== 'sphere' && call.kind !== 'plane') continue;
    assert.ok(call.position[2] <= 0.5,
      `un décor (${call.kind}) part à z = ${call.position[2].toFixed(1)} : mètres de piste posés sans conversion`);
  }
});
