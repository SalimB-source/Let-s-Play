import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CLOUD_BOLT_HEIGHT, CLOUD_BOLT_STORM_DURATION, CLOUD_BOLT_STRIKE_DURATION,
  CLOUD_BOLT_FADE_DURATION, CLOUD_WAVE_FLIGHT_DURATION, CLOUD_WAVE_IMPACT_DURATION,
  disposeCloudPower, fadeCloudMaterials, makeCloudLightningBolt, makeCloudSwordWave,
  updateCloudLightningVisual, updateCloudWaveVisual,
} from '../src/games/mirageCloudPowers.js';

const FRAME = 1 / 60;

function runLightning(visual, state, target, hooks = {}, limit = 600) {
  let frames = 0;
  while (frames < limit) {
    frames += 1;
    if (updateCloudLightningVisual(visual, state, FRAME, target, hooks)) return frames;
  }
  return -1;
}

test('the golden sword wave carries layers, a halo and impact shards', () => {
  const wave = makeCloudSwordWave();
  try {
    assert.equal(wave.name, 'cloud-golden-sword-wave');
    assert.ok(wave.userData.materials.length >= 6, 'several stacked crescents');
    assert.equal(wave.userData.shards.length, wave.userData.shardSpecs.length);
    assert.ok(wave.userData.shards.length >= 8, 'a burst of shards on impact');
    assert.ok(wave.userData.halo && wave.userData.haloOuter && wave.userData.core);
    // Chaque matériau garde son opacité de base : les couches restent lisibles.
    assert.ok(wave.userData.materials.every((material) => material.userData.baseOpacity > 0));
    assert.ok(wave.userData.materials.some((material) => material.userData.group === 'trail'));
  } finally {
    disposeCloudPower(wave);
  }
});

test('the lightning bolt is built from a storm cloud down to the ground', () => {
  const strike = makeCloudLightningBolt();
  try {
    assert.equal(strike.name, 'cloud-lightning-strike');
    const parts = strike.userData;
    assert.ok(parts.segments.length >= 12, 'a jagged bolt made of many segments');
    assert.ok(parts.forks.length > 0, 'the bolt forks on its way down');
    assert.ok(parts.sparks.length >= 10);
    assert.equal(parts.sparks.length, parts.sparkSpecs.length);
    // La nuée est tout en haut, l'impact au sol : l'éclair traverse le ciel.
    assert.equal(parts.cloud.position.y, CLOUD_BOLT_HEIGHT);
    assert.ok(parts.cloud.position.y > 6, 'the storm cloud forms high above the target');
    strike.updateMatrixWorld(true);
    const boltBox = new THREE.Box3().setFromObject(parts.bolt);
    const impactBox = new THREE.Box3().setFromObject(parts.impact);
    assert.ok(boltBox.max.y > CLOUD_BOLT_HEIGHT * 0.8, 'the bolt starts in the cloud');
    assert.ok(impactBox.max.y < 4, 'the impact stays on the ground');
    // La foudre converge sur la cible : le dernier segment est centré.
    const tip = parts.segments[parts.segments.length - 1];
    assert.ok(Math.abs(tip.position.x) < 0.6 && Math.abs(tip.position.z) < 0.6, 'the bolt lands on the rider');
  } finally {
    disposeCloudPower(strike);
  }
});

test('fadeCloudMaterials only touches its own group and keeps the base opacity', () => {
  const strike = makeCloudLightningBolt();
  try {
    const boltMaterial = strike.userData.materials.find((material) => material.userData.group === 'bolt');
    const cloudMaterial = strike.userData.materials.find((material) => material.userData.group === 'cloud');
    fadeCloudMaterials(strike.userData.materials, 'bolt', 1);
    assert.equal(boltMaterial.opacity, boltMaterial.userData.baseOpacity);
    fadeCloudMaterials(strike.userData.materials, 'bolt', 0);
    assert.equal(boltMaterial.opacity, 0);
    assert.equal(cloudMaterial.opacity, cloudMaterial.userData.baseOpacity, 'the cloud is untouched');
    fadeCloudMaterials(strike.userData.materials, 'bolt', 5);
    assert.ok(boltMaterial.opacity <= 1, 'opacity stays capped');
  } finally {
    disposeCloudPower(strike);
  }
});

test('the storm gathers, the bolt strikes once, then the embers fade out', () => {
  const strike = makeCloudLightningBolt();
  try {
    const state = { visual: strike, age: 0, phase: 'storm' };
    const target = new THREE.Vector3(2, 1.95, -14);
    let strikes = 0;
    const seen = [];
    // Nuée d'abord : ni l'éclair ni l'impact ne sont visibles pendant l'appel.
    while (state.phase === 'storm') {
      updateCloudLightningVisual(strike, state, FRAME, target, { onStrike: () => { strikes += 1; } });
      assert.equal(strike.userData.bolt.visible, false, 'no bolt before the storm is ready');
      assert.equal(strike.userData.impact.visible, false);
    }
    assert.equal(strikes, 1, 'the strike fires exactly once');
    assert.ok(
      Math.abs(state.age) < CLOUD_BOLT_STORM_DURATION,
      `the gathering lasts about ${CLOUD_BOLT_STORM_DURATION}s`,
    );
    seen.push(state.phase);
    // Frappe : l'éclair claque et l'impact apparaît.
    while (state.phase === 'strike') {
      updateCloudLightningVisual(strike, state, FRAME, target, {});
      assert.equal(strike.userData.bolt.visible, true);
      assert.equal(strike.userData.impact.visible, true);
    }
    seen.push(state.phase);
    assert.deepEqual(seen, ['strike', 'fade']);
    // L'effet suit la cible jusqu'au bout puis annonce qu'il peut disparaître.
    const frames = runLightning(strike, state, new THREE.Vector3(-1, 1.95, -20));
    assert.ok(frames > 0, 'the effect ends by itself (no leak in the scene)');
    assert.ok(Math.abs(strike.position.x + 1) < 0.001, 'the strike tracks its target');
    assert.equal(strike.userData.bolt.visible, false, 'the bolt is gone once the embers die out');
  } finally {
    disposeCloudPower(strike);
  }
});

test('the lightning lasts long enough to read on screen', () => {
  const strike = makeCloudLightningBolt();
  try {
    const state = { visual: strike, age: 0, phase: 'storm' };
    const target = new THREE.Vector3(0, 1.95, -12);
    const frames = runLightning(strike, state, target);
    const seconds = frames * FRAME;
    const expected = CLOUD_BOLT_STORM_DURATION + CLOUD_BOLT_STRIKE_DURATION + CLOUD_BOLT_FADE_DURATION;
    assert.ok(seconds > 0.8, `the strike is imposing (${seconds.toFixed(2)}s)`);
    assert.ok(seconds <= expected + FRAME * 2, `it ends within ${expected.toFixed(2)}s`);
  } finally {
    disposeCloudPower(strike);
  }
});

test('the golden wave flies to its target, bursts, then cleans up', () => {
  const wave = makeCloudSwordWave();
  try {
    const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 120);
    const state = { age: 0, phase: 'flight', start: new THREE.Vector3(0.5, 2.1, -0.6) };
    const target = new THREE.Vector3(-2, 1.95, -18);
    let impacts = 0;
    let done = false;
    let frames = 0;
    const startDistance = state.start.distanceTo(target);
    while (!done && frames < 600) {
      frames += 1;
      done = updateCloudWaveVisual(wave, state, FRAME, target, camera, { onImpact: () => { impacts += 1; } });
      if (state.phase === 'flight') {
        assert.ok(wave.position.distanceTo(target) <= startDistance + 0.001, 'the wave flies straight at the target');
      }
    }
    assert.equal(impacts, 1, 'the impact resolves once');
    assert.ok(done, 'the wave removes itself when the burst is over');
    const expected = CLOUD_WAVE_FLIGHT_DURATION + CLOUD_WAVE_IMPACT_DURATION;
    assert.ok(Math.abs(frames * FRAME - expected) < FRAME * 3, 'flight then burst');
    // Onde imposante : l'éclat final dépasse largement la taille de vol.
    assert.ok(wave.scale.x > 3, `the burst is huge (${wave.scale.x.toFixed(2)})`);
    assert.ok(wave.userData.shards.some((shard) => shard.visible), 'shards fly out of the impact');
  } finally {
    disposeCloudPower(wave);
  }
});
