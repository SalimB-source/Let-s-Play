import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  SNAKEWAY_ATMOSPHERE,
  SNAKEWAY_CULL_Z,
  SNAKEWAY_GATE_INDEX,
  SNAKEWAY_SEGMENT_COUNT,
  SNAKEWAY_SEGMENT_LENGTH,
  SNAKEWAY_TRACK_EDGE,
  attachSnakewayRouteWarp,
  makeSnakewayCloudSea,
  makeSnakewayHorizon,
  snakewayArch,
  snakewayCloudBank,
  snakewayObstacle,
  snakewayTrackTrim,
} from '../src/games/snakewayStage.js';
import { LANES } from '../src/games/mirageRules.js';
import { mirageRouteOffset } from '../src/games/mirageRoute.js';

const sizeOf = (object) => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());

test('the Snake Way atmosphere pairs a deep twilight sky with a vivid orange horizon', () => {
  assert.equal(SNAKEWAY_ATMOSPHERE.skyTop[2] > SNAKEWAY_ATMOSPHERE.skyTop[0], true);
  assert.ok(SNAKEWAY_ATMOSPHERE.skyHorizon[0] > SNAKEWAY_ATMOSPHERE.skyHorizon[2], 'l’horizon tire vers l’orange');
  assert.ok(SNAKEWAY_ATMOSPHERE.sunLight > 0);
  assert.equal(SNAKEWAY_CULL_Z, -62);
});

test('the cloudbank is jumpable and spans two lanes', () => {
  const bounds = sizeOf(snakewayObstacle('barrier'));
  assert.ok(bounds.x >= 3.8 && bounds.x <= 4.3, `largeur ${bounds.x.toFixed(2)} m`);
  assert.ok(bounds.y <= 1.05, `hauteur ${bounds.y.toFixed(2)} m : le saut doit passer`);
});

test('the floating meteor fills one lane and is tall enough to dodge', () => {
  const bounds = sizeOf(snakewayObstacle('cactus'));
  assert.ok(bounds.x > 1.1 && bounds.x < 1.9, `largeur ${bounds.x.toFixed(2)} m`);
  assert.ok(bounds.y > 1.6 && bounds.y < 2.3, `hauteur ${bounds.y.toFixed(2)} m`);
  assert.ok(sizeOf(snakewayObstacle('mud')).y < 0.5, 'le vortex reste au ras du sol');
});

test('yellow clouds are the only looping scenery outside both three- and four-lane roads', () => {
  assert.equal(SNAKEWAY_SEGMENT_LENGTH * SNAKEWAY_SEGMENT_COUNT, 110);
  assert.equal(SNAKEWAY_TRACK_EDGE, LANES[LANES.length - 1] + 1.05);
  assert.equal(SNAKEWAY_GATE_INDEX, 5);
  for (let index = 0; index < SNAKEWAY_SEGMENT_COUNT; index += 1) {
    for (const side of [-1, 1]) {
      const bank = snakewayCloudBank(index, side);
      const bounds = new THREE.Box3().setFromObject(bank);
      const span = bounds.getSize(new THREE.Vector3());
      assert.equal(bank.position.z, 6 - index * SNAKEWAY_SEGMENT_LENGTH);
      assert.equal(bank.userData.speedFactor, 1);
      assert.equal(bank.userData.callout, 'yellow-cloudbank');
      assert.ok(side < 0 ? bounds.max.x < -4.2 : bounds.min.x > 4.2,
        `le nuage ${index} (côté ${side}) mord sur les voies`);
      assert.ok(bounds.max.y < -0.3,
        `le banc ${index} (côté ${side}) doit rester sous la route (max y ${bounds.max.y.toFixed(2)} m)`);
      assert.ok(span.z >= SNAKEWAY_SEGMENT_LENGTH,
        `le banc ${index} remplit tout son segment (z ${span.z.toFixed(1)} m)`);
      assert.ok(side < 0 ? bounds.min.x < -12 : bounds.max.x > 12,
        `le banc ${index} s'étire jusqu'à l'horizon`);
      let puffCount = 0;
      const shades = new Set();
      bank.traverse((object) => {
        if (!object.isMesh) return;
        puffCount += 1;
        assert.equal(object.geometry.type, 'SphereGeometry', 'aucun rocher, pilier ou marqueur latéral');
        const { r, g, b } = object.material.color;
        assert.ok(r > g && g > b, `couleur de nuage requise (rampe chaude) : ${object.material.color.getHexString()}`);
        // Teinte en sRGB (espace affiché) : chaque boule doit être jaune,
        // de l'or profond à la lumière pâle — plus aucune teinte orange.
        const srgb = parseInt(object.material.color.getHexString(), 16);
        const sr = (srgb >> 16) / 255;
        const sg = ((srgb >> 8) & 255) / 255;
        const sb = (srgb & 255) / 255;
        assert.ok(sr > 0.99 && sg > 0.78 && sb < 0.7,
          `boule non jaune détectée : ${object.material.color.getHexString()}`);
        shades.add(object.material.color.getHexString());
      });
      assert.ok(puffCount >= 60, `mur de cumulus dense attendu (${puffCount} boules)`);
      assert.ok(shades.size >= 3, `plusieurs teintes jaunes pour la profondeur (${shades.size})`);
    }
  }
});

test('the checkpoint halo sits high above the road without any side pillars', () => {
  const arch = snakewayArch();
  arch.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const blocked = (x, y) => {
    raycaster.set(new THREE.Vector3(x, y, 12), new THREE.Vector3(0, 0, -1));
    return raycaster.intersectObject(arch, true).length > 0;
  };
  for (const x of [-4.1, -3.15, -2.1, -1.05, 0, 1.05, 2.1, 3.15, 4.1]) {
    for (const y of [0.1, 1, 2.2, 3.5]) {
      assert.equal(blocked(x, y), false, `passage bloqué en x=${x}, y=${y}`);
    }
  }
  assert.equal(blocked(4.15, 8.6), true, 'le halo est bien au-dessus de la route');
  assert.equal(blocked(0, 12.85), true, 'l’étoile surmonte le halo');
  assert.equal(arch.userData.callout, 'floating-halo');
});

test('the horizon leads along a winding grey, scale-lined road to a detailed, readable Kaio planet', () => {
  const horizon = makeSnakewayHorizon();
  const bounds = new THREE.Box3().setFromObject(horizon);
  assert.equal(bounds.isEmpty(), false);
  assert.ok(bounds.getSize(new THREE.Vector3()).x > 90, 'les nuages encadrent tout l’horizon');
  assert.ok(bounds.getSize(new THREE.Vector3()).z > 75, 'la route et les nuages s’étirent au loin');
  let meshes = 0;
  let grayScales = 0;
  let planet;
  horizon.traverse((object) => {
    if (object.isMesh) meshes += 1;
    if (object.userData.callout === 'kaio-planet') planet = object;
    if (object.isMesh && object.geometry.type === 'SphereGeometry') {
      // Une écaille de route : sphère grise (teintes quasi neutres).
      const hex = parseInt(object.material.color.getHexString(), 16);
      const r = (hex >> 16) / 255;
      const g = ((hex >> 8) & 255) / 255;
      const b = (hex & 255) / 255;
      if (Math.abs(r - g) < 0.05 && Math.abs(g - b) < 0.09 && r > 0.3 && r < 0.85) grayScales += 1;
    }
  });
  assert.ok(planet, 'la planète de Kaio est une destination explicite du stage');
  assert.ok(planet.children.some((object) => object.isMesh && object.geometry.type === 'SphereGeometry'), 'la planète possède un globe');
  assert.ok(planet.children.some((object) => object.isGroup && object.children.length >= 8), 'la maisonnette et son arbre bleu sont détaillés');
  assert.ok(grayScales >= 60, `les bords de la route sinueuse portent des écailles grises (${grayScales})`);
  assert.ok(meshes > 60, `décor céleste composé (${meshes} meshes)`);
});

test('the grey dragon-scale border caps the outer track edges and scrolls with the floor', () => {
  for (const lanes of [[-1.05, 1.05], [-3.15, -1.05, 1.05, 3.15]]) {
    const trim = snakewayTrackTrim(lanes);
    trim.updateMatrixWorld(true);
    const expectedEdge = Math.max(Math.abs(lanes[0]), Math.abs(lanes.at(-1))) + 1.05;
    const strips = [];
    const scales = [];
    const scaleShades = new Set();
    trim.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry.type === 'BoxGeometry') {
        strips.push(object);
        return;
      }
      if (object.geometry.type === 'SphereGeometry') {
        scales.push(object);
        scaleShades.add(object.material.color.getHexString());
      }
    });
    assert.equal(strips.length, 2, 'une bande de base par bord de route');
    assert.deepEqual(
      strips.map((strip) => strip.position.x).sort((a, b) => a - b),
      [-(expectedEdge + 0.88), expectedEdge + 0.88],
      'les bandes flottent au-delà du bord extérieur du revêtement',
    );
    assert.ok(scales.length >= 150, `bordure d’écailles dense attendue (${scales.length})`);
    for (const scale of scales) {
      // Les écailles flottent entièrement au-dehors du revêtement, rien
      // n'empiète sur la route.
      assert.ok(
        Math.abs(scale.position.x) >= expectedEdge + 0.5 && Math.abs(scale.position.x) <= expectedEdge + 1.25,
        `écaille mal placée (x=${scale.position.x.toFixed(2)})`,
      );
      assert.ok(scale.position.y < 0.4, 'les écailles restent basses le long de la route');
    }
    assert.ok(scaleShades.size >= 2, `plusieurs teintes d’écailles pour la profondeur (${scaleShades.size})`);
    for (const hex of scaleShades) {
      const h = parseInt(hex, 16);
      const rr = (h >> 16) / 255;
      const gg = ((h >> 8) & 255) / 255;
      const bb = (h & 255) / 255;
      assert.ok(Math.abs(rr - gg) < 0.05 && Math.abs(gg - bb) < 0.09, `écaille non grise détectée : ${hex}`);
    }
  }
});

test('the cloud sea keeps every puff but draws them in a handful of instanced meshes', () => {
  const banks = [];
  const before = [];
  for (let index = 0; index < SNAKEWAY_SEGMENT_COUNT; index += 1) {
    for (const side of [-1, 1]) {
      const bank = snakewayCloudBank(index, side);
      bank.updateMatrixWorld(true);
      bank.traverse((object) => {
        if (object.isMesh) before.push(object.getWorldPosition(new THREE.Vector3()));
      });
      banks.push(bank);
    }
  }
  const sea = makeSnakewayCloudSea(banks);
  const after = [];
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  let drawCalls = 0;
  sea.group.traverse((object) => {
    if (!object.isInstancedMesh) return;
    drawCalls += 1;
    for (let i = 0; i < object.count; i += 1) {
      object.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      after.push(position.clone());
    }
  });
  assert.equal(after.length, before.length);
  assert.ok(before.length >= 60 * banks.length, 'la densité de cumulus ne change pas');
  assert.ok(drawCalls <= 8 && drawCalls >= 3, `la mer tient en ${drawCalls} appels de dessin`);
  for (const point of before) {
    assert.ok(after.some((other) => other.distanceTo(point) < 1e-3), `boule perdue en ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`);
  }
  for (const bank of banks) {
    let meshes = 0;
    bank.traverse((object) => { if (object.isMesh) meshes += 1; });
    assert.equal(meshes, 0, 'le banc ne garde que son ancre, plus les boules');
  }
  const anchor = banks[0];
  anchor.position.x += 2.4;
  anchor.position.z -= 3;
  banks[3].visible = false;
  sea.sync();
  let shifted = 0;
  let hidden = 0;
  sea.group.traverse((object) => {
    if (!object.isInstancedMesh) return;
    for (let i = 0; i < object.count; i += 1) {
      object.getMatrixAt(i, matrix);
      if (matrix.getMaxScaleOnAxis() < 1e-4) {
        hidden += 1;
        continue;
      }
      const moved = new THREE.Vector3().setFromMatrixPosition(matrix);
      const back = moved.clone();
      back.x -= 2.4;
      back.z += 3;
      if (before.some((point) => point.distanceTo(back) < 1e-3)) shifted += 1;
    }
  });
  assert.ok(shifted > 20, `le banc déplacé entraîne ses boules (${shifted})`);
  assert.ok(hidden > 20, `un banc hors champ n’est plus dessiné (${hidden})`);
});

test('the snakeway floor warp in the shader matches the CPU route offset once scales are baked into the group', () => {
  const root = new THREE.Group();
  root.add(snakewayTrackTrim([-1.05, 1.05], 4, -8));
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse((object) => {
    if (!object.isMesh) return;
    const key = object.material.uuid;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(object);
  });
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    });
    const merged = mergeGeometries(parts, false);
    meshes.forEach((mesh) => mesh.parent.remove(mesh));
    root.add(new THREE.Mesh(merged, meshes[0].material));
  }
  root.position.z = -4.5;
  root.updateMatrixWorld(true);
  const progress = 37.25;
  const offset = { x: 0, y: 0 };
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    assert.ok(mesh.scale.x === 1 && mesh.scale.y === 1 && mesh.scale.z === 1, 'après fusion, plus d’échelle locale');
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 12) {
      const local = new THREE.Vector3().fromBufferAttribute(position, i);
      const world = local.clone().applyMatrix4(mesh.matrixWorld);
      mirageRouteOffset(progress, world.z, offset);
      const shaderLocal = local.clone();
      shaderLocal.x += offset.x;
      shaderLocal.y += offset.y;
      const shaderWorld = shaderLocal.applyMatrix4(mesh.matrixWorld);
      const cpuWorld = world.clone();
      cpuWorld.x += offset.x;
      cpuWorld.y += offset.y;
      assert.ok(shaderWorld.distanceTo(cpuWorld) < 1e-4, 'le shader doit poser le même décalage que l’ancien calcul CPU');
    }
  });
});

test('the snakeway route warp is injected once and Mirage Rush no longer rewrites those vertices on the CPU', () => {
  const material = new THREE.MeshStandardMaterial({ flatShading: true });
  const uniform = { value: 12.5 };
  attachSnakewayRouteWarp(material, uniform);
  attachSnakewayRouteWarp(material, uniform);
  const shader = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}\n',
  };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uRouteProgress, uniform);
  assert.equal((shader.vertexShader.match(/uniform float uRouteProgress/g) || []).length, 1);
  assert.match(shader.vertexShader, /float mirageRouteX\(float s\)/);
  assert.match(shader.vertexShader, /transformed\.x \+= mirageRouteX\(routeStation\) - mirageRouteX\(uRouteProgress\)/);
  assert.match(shader.vertexShader, /transformed\.y \+= mirageRouteY\(routeStation\) - mirageRouteY\(uRouteProgress\)/);
  assert.equal(material.customProgramCacheKey(), 'mirage-route-v1');

  const world = readFileSync(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8');
  assert.match(world, /attachSnakewayRouteWarp\(object\.material, snakewayRouteProgress\)/);
  assert.match(world, /const routeFloorWarps = snakeway \? \[\] : routeWarpsFor\(floorGroup\)/);
  assert.match(world, /makeSnakewayCloudSea\(cloudBanks\)/);
  assert.match(world, /snakewayRouteProgress\.value = progress/);
});
