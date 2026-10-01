import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_PALETTES, CLOUD_CHOCOBO_INDEX } from '../src/games/mirageCharacters.js';
import {
  STEEL_BALL_GREEN, accessoriesForPalette, disposeExplorer, makeExplorer, paintModel,
} from '../src/games/mirageExplorer.js';
import { CLOUD_CHOCOBO_ID, GYRO_ZEPPELI_ID, SKINS } from '../src/games/mirageProgression.js';

function collectAccessories(model, kind) {
  const found = [];
  model.traverse((node) => {
    if (node.userData?.gyroAccessory === kind) found.push(node);
  });
  return found;
}

function collectCloudAccessories(model, kind) {
  const found = [];
  model.traverse((node) => {
    if (node.userData?.cloudAccessory === kind) found.push(node);
  });
  return found;
}

test('shop palettes request their own accessories and mounts', () => {
  assert.equal(accessoriesForPalette(CHARACTER_PALETTES[0]), null);
  assert.equal(accessoriesForPalette(CHARACTER_PALETTES[4]), 'gyro');
  assert.equal(accessoriesForPalette(CHARACTER_PALETTES[CLOUD_CHOCOBO_INDEX]), 'cloud-chocobo');
  const gyro = SKINS.find((skin) => skin.id === GYRO_ZEPPELI_ID);
  const cloud = SKINS.find((skin) => skin.id === CLOUD_CHOCOBO_ID);
  assert.equal(accessoriesForPalette(gyro.colors), 'gyro');
  assert.equal(gyro.accessory, 'Steel balls');
  assert.equal(accessoriesForPalette(cloud.colors), 'cloud-chocobo');
  assert.equal(cloud.price, 280);
  assert.equal(cloud.horse, 'Chocobo');
  assert.equal(cloud.accessory, 'Épée broyeuse');
});

test('Gyro’s model carries two green steel balls, goggles and a green cape', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[4]);
  try {
    assert.equal(model.userData.accessoryKind, 'gyro');
    const balls = collectAccessories(model, 'steel-ball');
    assert.equal(balls.length, 2, 'Gyro holds two steel balls');
    for (const ball of balls) {
      assert.equal(ball.geometry.type, 'SphereGeometry');
      assert.equal(ball.material.color.getHex(), STEEL_BALL_GREEN);
    }
    assert.ok(collectAccessories(model, 'goggles').length >= 2, 'goggles sit on the fedora');
    assert.equal(collectAccessories(model, 'cape').length, 1, 'green cape overlay');
  } finally {
    disposeExplorer(model);
  }
});

test('switching away from Gyro removes the steel balls', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[0]);
  try {
    assert.equal(model.userData.accessoryKind, null);
    assert.equal(collectAccessories(model, 'steel-ball').length, 0);
    paintModel(model, CHARACTER_PALETTES[4]);
    assert.equal(collectAccessories(model, 'steel-ball').length, 2);
    paintModel(model, CHARACTER_PALETTES[1]);
    assert.equal(collectAccessories(model, 'steel-ball').length, 0);
    assert.equal(model.userData.accessoryKind, null);
  } finally {
    disposeExplorer(model);
  }
});

test('Cloud rides a proper golden chocobo with his spikes and Buster Sword', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[CLOUD_CHOCOBO_INDEX]);
  try {
    assert.equal(model.userData.accessoryKind, 'cloud-chocobo');
    assert.equal(model.userData.parts.horseMount.visible, false, 'the horse is swapped out');
    assert.equal(model.userData.parts.hat.visible, false, 'Cloud does not wear the cowboy hat');
    assert.equal(model.userData.parts.legs.length, 2, 'the chocobo has two animated bird legs');
    assert.equal(model.userData.parts.wings.length, 2, 'the chocobo has a pair of wings');
    assert.ok(model.getObjectByName('cloud-chocobo-mount'));
    assert.ok(model.getObjectByName('cloud-spiky-hair'));
    assert.ok(model.getObjectByName('buster-sword'));
    assert.equal(model.userData.parts.busterSword, model.getObjectByName('buster-sword'), 'the sword group is exposed for Cloud attack animation');
    assert.equal(model.userData.parts.busterSword.userData.baseRotationZ, 0.34);
    assert.equal(collectCloudAccessories(model, 'chocobo-body').length, 1);
    assert.equal(collectCloudAccessories(model, 'cloud-hair').length, 1);
    assert.equal(collectCloudAccessories(model, 'buster-sword').length, 1);
  } finally {
    disposeExplorer(model);
  }
});

test('switching Cloud away restores the horse and removes his custom mount and gear', () => {
  const model = makeExplorer(false, CHARACTER_PALETTES[CLOUD_CHOCOBO_INDEX]);
  try {
    paintModel(model, CHARACTER_PALETTES[0]);
    assert.equal(model.userData.accessoryKind, null);
    assert.equal(model.userData.parts.horseMount.visible, true);
    assert.equal(model.userData.parts.hat.visible, true);
    assert.equal(model.userData.parts.legs.length, 4);
    assert.equal(model.userData.parts.wings.length, 0);
    assert.equal(model.userData.parts.busterSword, null);
    assert.equal(model.getObjectByName('cloud-chocobo-mount'), undefined);
    assert.equal(model.getObjectByName('cloud-spiky-hair'), undefined);
    assert.equal(model.getObjectByName('buster-sword'), undefined);
  } finally {
    disposeExplorer(model);
  }
});
