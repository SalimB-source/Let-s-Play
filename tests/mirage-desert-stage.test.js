import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Le mirage est peint sur un canvas 2D : on fournit un contexte « muet » qui accepte tout
// (dégradés, courbes, compositing…), là où un navigateur donnerait un vrai contexte.
const mute = new Proxy(function mute() {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : mute),
  apply: () => mute,
  set: () => true,
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => mute, style: {} } : {}),
};

const {
  DESERT_CULL_Z, DESERT_GROUND_Y, DESERT_PALETTE, DESERT_PERIOD, DESERT_ROAD_EDGE,
  makeDesertScenery, terrainHeight,
} = await import('../src/games/desertStage.js');

const CAMERA_HEIGHT = 7.3;
const camera = new THREE.PerspectiveCamera(50, 1.4, 0.1, 120);
const renderer = { domElement: { height: 600 } };
const chunksOf = (scenery) => scenery.group.children.filter((child) => child.isGroup);
const propMeshes = (scenery) => chunksOf(scenery).flatMap((chunk) => chunk.children.filter((mesh) => !mesh.material.isShaderMaterial));

test('desert: the sand is flat under the track and rises into dunes on both sides', () => {
  for (let x = -DESERT_ROAD_EDGE; x <= DESERT_ROAD_EDGE; x += 0.25) {
    for (let z = -96; z < 0; z += 3) assert.equal(terrainHeight(x, z), DESERT_GROUND_Y);
  }
  for (const side of [-1, 1]) {
    let sum = 0;
    let count = 0;
    for (let x = 15; x <= 25; x += 0.5) {
      for (let z = -96; z < 0; z += 1) {
        const height = terrainHeight(side * x, z);
        assert.ok(height > DESERT_GROUND_Y, 'le sable ne plonge jamais sous le pied de la piste');
        sum += height;
        count += 1;
      }
    }
    assert.ok(sum / count > 3, `côté ${side}: les dunes doivent s’élever (moyenne ${(sum / count).toFixed(2)} m)`);
  }
});

test('desert: the relief loops seamlessly every DESERT_PERIOD metres', () => {
  let worst = 0;
  for (let i = 0; i < 2000; i += 1) {
    const x = Math.sin(i * 12.9898) * 120;
    const z = -((i * 37.7) % 400);
    worst = Math.max(worst, Math.abs(terrainHeight(x, z) - terrainHeight(x, z - DESERT_PERIOD)));
  }
  assert.ok(worst < 1e-9, `raccord visible : écart de ${worst} m`);
});

test('desert: the dunes never wall off the horizon seen from the camera', () => {
  let nearest = -Infinity;
  let valley = -Infinity;
  for (let x = -14; x <= 14; x += 0.25) {
    for (let z = -100; z <= 10; z += 0.5) {
      const height = terrainHeight(x, z);
      nearest = Math.max(nearest, height);
      if (Math.abs(x) <= 9) valley = Math.max(valley, height);
    }
  }
  assert.ok(valley < 3, `l’accotement proche de la piste reste bas (${valley.toFixed(2)} m)`);
  assert.ok(nearest < CAMERA_HEIGHT - 0.3, `les dunes proches passent sous la caméra (${nearest.toFixed(2)} m)`);
});

test('desert: three chunks keep the visible depth covered, however far the rider has run', () => {
  const scenery = makeDesertScenery();
  const chunks = chunksOf(scenery);
  assert.equal(chunks.length, 3);
  for (const offset of [0, 1.5, 47, 95.99, 96, 250.25, 1e5 + 0.7, -13]) {
    scenery.scroll(offset);
    const spans = chunks.map((chunk) => [chunk.position.z - DESERT_PERIOD, chunk.position.z]).sort((a, b) => a[0] - b[0]);
    // La brume est totalement opaque à 82 m de la caméra (z ≈ -73) : le fond doit la dépasser.
    assert.ok(spans[0][0] <= -90, `offset ${offset}: le fond de la vallée n’est pas couvert`);
    assert.ok(spans[2][1] >= 10, `offset ${offset}: le premier plan n’est pas couvert`);
    for (let i = 1; i < spans.length; i += 1) assert.ok(Math.abs(spans[i][0] - spans[i - 1][1]) < 1e-6, `offset ${offset}: trou entre deux segments`);
  }
  scenery.dispose();
});

test('desert: props (glowing posts included) stay off the track', () => {
  const scenery = makeDesertScenery();
  const meshes = propMeshes(scenery);
  assert.equal(meshes.length, 6, 'un mesh solide et un mesh lumineux par segment');
  let closest = Infinity;
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) closest = Math.min(closest, Math.abs(position.getX(i)));
  }
  assert.ok(closest >= DESERT_ROAD_EDGE, `un accessoire mord sur la piste (|x| = ${closest.toFixed(2)})`);
  scenery.dispose();
});

test('desert: everyone in a room sees the same dunes (seeded, independent of Math.random)', () => {
  const build = (randomValue) => {
    const original = Math.random;
    Math.random = () => randomValue;
    try { return makeDesertScenery(); } finally { Math.random = original; }
  };
  const first = build(0.11);
  const second = build(0.93);
  const a = propMeshes(first)[0].geometry.attributes.position;
  const b = propMeshes(second)[0].geometry.attributes.position;
  assert.equal(a.count, b.count);
  for (let i = 0; i < a.count; i += 1) {
    assert.equal(a.getX(i), b.getX(i));
    assert.equal(a.getY(i), b.getY(i));
  }
  first.dispose();
  second.dispose();
});

test('desert: the mirage grows from the horizon as the run goes on, and never leaves it', () => {
  const scenery = makeDesertScenery();
  const mirage = scenery.group.children.find((child) => child.isMesh && child.renderOrder === 1);
  assert.ok(mirage, 'le mirage est dans la scène');
  scenery.update({ time: 0, offset: 0, progress: 0, camera, renderer });
  const start = mirage.scale.x;
  scenery.update({ time: 0, offset: 0, progress: 1, camera, renderer });
  const end = mirage.scale.x;
  assert.ok(start < 1 && end > 1 && end > start * 1.2, `le mirage doit se rapprocher (${start} → ${end})`);
  // La rive reste pile à la hauteur de l’horizon de la caméra, quelle que soit la taille.
  assert.equal(mirage.position.y, CAMERA_HEIGHT);
  scenery.update({ time: 0, offset: 0, progress: 7, camera, renderer });
  assert.equal(mirage.scale.x, end);
  scenery.update({ time: 0, offset: 0, progress: -3, camera, renderer });
  assert.equal(mirage.scale.x, start);
  scenery.dispose();
});

test('desert: reduced motion stops the flying sand and calms the mirage', () => {
  const calm = makeDesertScenery({ reduceMotion: true });
  const lively = makeDesertScenery({ reduceMotion: false });
  const dust = (scenery) => scenery.group.children.find((child) => child.isPoints);
  const mirage = (scenery) => scenery.group.children.find((child) => child.isMesh && child.renderOrder === 1);
  assert.equal(dust(calm).visible, false);
  assert.equal(dust(lively).visible, true);
  assert.ok(mirage(calm).material.uniforms.uMotion.value < mirage(lively).material.uniforms.uMotion.value);
  calm.dispose();
  lively.dispose();
});

test('desert: update() and dispose() tolerate any input from the game loop', () => {
  const scenery = makeDesertScenery();
  for (const [time, offset, progress] of [[0, 0, 0], [16.7, 0.3, 0.01], [9e4, 1e4 + 0.3, 1], [-5, -3, Number.NaN]]) {
    assert.doesNotThrow(() => scenery.update({ time, offset, progress, camera, renderer }));
  }
  assert.doesNotThrow(() => scenery.update());
  assert.doesNotThrow(() => scenery.dispose());
});

test('desert: obstacle rows are culled inside the haze, and the palette cannot be altered', () => {
  assert.ok(DESERT_CULL_Z < -60 && DESERT_CULL_Z > -95, 'la coupe des rangées se fait dans la brume');
  assert.equal(typeof DESERT_PALETTE.horizon, 'number');
  assert.ok(Object.isFrozen(DESERT_PALETTE));
});

test('desert: sand and props follow the visual route without rebuilding their meshes', () => {
  const scenery = makeDesertScenery();
  const terrain = parts(scenery).terrain;
  const props = propMeshes(scenery);
  assert.equal(terrain.material.uniforms.uRouteProgress.value, 0);
  scenery.update({ time: 0, offset: 18, routeProgress: 42.5, progress: 0.2, camera, renderer });
  assert.equal(terrain.material.uniforms.uRouteProgress.value, 42.5);

  const shader = { uniforms: {}, vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}', fragmentShader: '' };
  props[0].material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uRouteProgress.value, 42.5);
  assert.match(shader.vertexShader, /mirageRouteX/);
  assert.match(shader.vertexShader, /mirageRouteY/);
  assert.equal(chunksOf(scenery).length, 3, 'la route se déforme dans le shader, sans reconstruire les dunes');
  scenery.dispose();
});

// ── Graphismes baissés : la version allégée du décor ───────────────────────

const byOrder = (scenery, order) => scenery.group.children.find((child) => child.renderOrder === order);
const parts = (scenery) => ({
  sky: byOrder(scenery, -1),
  mirage: byOrder(scenery, 1),
  sheen: byOrder(scenery, 2),
  dust: byOrder(scenery, 3),
  terrain: chunksOf(scenery)[0].children.find((mesh) => mesh.material.isShaderMaterial),
});

test('desert: the normal scenery is untouched (every lite switch is off by default)', () => {
  const scenery = makeDesertScenery();
  const { sky, mirage, sheen, dust, terrain } = parts(scenery);
  assert.equal(scenery.lite, false);
  assert.equal(sky.material.uniforms.uLite.value, 0, 'ciel complet : nuages et vacillement');
  assert.equal(terrain.material.uniforms.uLite.value, 0, 'sable complet : rides');
  for (const mesh of [sky, mirage, sheen, dust]) assert.equal(mesh.visible, true);
  scenery.dispose();
});

test('desert: lite drops the costly decoration but keeps the track, the dunes and the mirage', () => {
  const scenery = makeDesertScenery({ lite: true });
  const { sky, mirage, sheen, dust, terrain } = parts(scenery);
  assert.equal(scenery.lite, true);
  assert.equal(sky.material.uniforms.uLite.value, 1);
  assert.equal(terrain.material.uniforms.uLite.value, 1);
  assert.equal(sheen.visible, false, 'le voile d’eau sur les dalles lointaines n’est plus dessiné');
  assert.equal(dust.visible, false, 'la poussière non plus');
  assert.equal(sky.visible, true, 'le ciel reste (un simple dégradé)');
  assert.equal(mirage.visible, true, 'le mirage est l’identité du terrain : il reste');
  assert.equal(chunksOf(scenery).length, 3, 'le relief et ses accessoires sont intacts');
  assert.ok(propMeshes(scenery).length > 0);
  scenery.dispose();
});

test('desert: setLite() flips both ways in place, without rebuilding anything', () => {
  const scenery = makeDesertScenery();
  const before = { group: scenery.group, chunks: chunksOf(scenery), children: scenery.group.children.slice() };
  const { sky, sheen, dust, terrain } = parts(scenery);
  scenery.setLite(true);
  assert.deepEqual([scenery.lite, sky.material.uniforms.uLite.value, terrain.material.uniforms.uLite.value, sheen.visible, dust.visible], [true, 1, 1, false, false]);
  scenery.setLite(false);
  assert.deepEqual([scenery.lite, sky.material.uniforms.uLite.value, terrain.material.uniforms.uLite.value, sheen.visible, dust.visible], [false, 0, 0, true, true]);
  assert.equal(scenery.group, before.group);
  assert.deepEqual(chunksOf(scenery), before.chunks);
  assert.deepEqual(scenery.group.children, before.children, 'aucun objet ajouté ni retiré : pas de reconstruction ni de recompilation');
  scenery.dispose();
});

test('desert: setLite() treats any input as a switch, and reduced motion keeps the dust off for good', () => {
  const calm = makeDesertScenery({ reduceMotion: true });
  const { dust } = parts(calm);
  assert.equal(dust.visible, false);
  calm.setLite(true);
  calm.setLite(false);
  assert.equal(dust.visible, false, 'sortir du mode allégé ne rallume pas la poussière si le mouvement est réduit');
  calm.dispose();

  const scenery = makeDesertScenery();
  scenery.setLite(1);
  assert.equal(scenery.lite, true);
  scenery.setLite(undefined);
  assert.equal(scenery.lite, false);
  scenery.setLite('low');
  assert.equal(scenery.lite, true);
  scenery.setLite(0);
  assert.equal(scenery.lite, false);
  scenery.dispose();
});

test('desert: the lite scenery still scrolls and updates exactly like the normal one', () => {
  const lite = makeDesertScenery({ lite: true });
  const full = makeDesertScenery();
  for (const [time, offset, progress] of [[0, 0, 0], [16.7, 3.3, 0.2], [9e4, 1e4 + 0.3, 1]]) {
    assert.doesNotThrow(() => lite.update({ time, offset, progress, camera, renderer }));
    full.update({ time, offset, progress, camera, renderer });
    assert.deepEqual(chunksOf(lite).map((chunk) => chunk.position.z), chunksOf(full).map((chunk) => chunk.position.z), 'les dunes défilent avec la piste dans les deux versions');
    assert.equal(parts(lite).mirage.scale.x, parts(full).mirage.scale.x, 'le mirage se rapproche pareil');
  }
  lite.dispose();
  full.dispose();
});
