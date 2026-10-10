import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
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
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const { makeTougeRoad } = await import('../src/games/tougeStage.js');
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
