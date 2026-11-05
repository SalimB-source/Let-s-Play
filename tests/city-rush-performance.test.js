import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cityRushRenderBudget, createCityRushVisualClock } from '../src/games/cityRushPerformance.js';

test('le rendu limite les pixels et l’antialias sur mobile sans augmenter le ratio natif', () => {
  assert.deepEqual(cityRushRenderBudget({ lite: true, devicePixelRatio: 3 }), {
    pixelRatio: 1, antialias: false, shadowSize: 512, shadowIntervalMs: 150, mirrorIntervalMs: 250,
  });
  const desktop = cityRushRenderBudget({ devicePixelRatio: 2 });
  assert.equal(desktop.pixelRatio, 1.25);
  assert.equal(desktop.antialias, true);
  assert.equal(desktop.shadowSize, 1024);
  assert.equal(cityRushRenderBudget({ devicePixelRatio: 0.75 }).pixelRatio, 0.75);
  for (const bad of [0, -1, NaN, Infinity, undefined]) assert.equal(cityRushRenderBudget({ devicePixelRatio: bad }).pixelRatio, 1);
});

test('l’horloge visuelle ne bloque pas la première image, ni après une remise à zéro', () => {
  const tick = createCityRushVisualClock(100);
  assert.equal(tick(0), true);
  assert.equal(tick(50), false);
  assert.equal(tick(100), true);
  assert.equal(tick(101), false);
  assert.equal(tick(1), true);
  assert.equal(tick(NaN), false);
});

test('la boucle conserve sa simulation par image et limite uniquement les effets visuels', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /document\.hidden \|\| \(schoolMode && schoolPausedRef\.current\)/);
  assert.match(source, /updateEnvironment\(dt\);\s*updateTraffic\(dt\);/);
  assert.match(source, /if \(!renderer\.isCityRushWebGpu && shadowTick\(now\)\) renderer\.shadowMap\.needsUpdate = true/);
  assert.match(source, /renderCockpitMirror\(now\)/);
  assert.match(source, /antialias: renderBudget\.antialias/);
});
