import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_PALETTES } from '../src/games/mirageCharacters.js';
import {
  STEEL_BALL_GREEN, accessoriesForPalette, disposeExplorer, makeExplorer, paintModel,
} from '../src/games/mirageExplorer.js';
import { GYRO_ZEPPELI_ID, SKINS } from '../src/games/mirageProgression.js';

function collectAccessories(model, kind) {
  const found = [];
  model.traverse((node) => {
    if (node.userData?.gyroAccessory === kind) found.push(node);
  });
  return found;
}

test('only Gyro’s palette requests shop accessories', () => {
  assert.equal(accessoriesForPalette(CHARACTER_PALETTES[0]), null);
  assert.equal(accessoriesForPalette(CHARACTER_PALETTES[4]), 'gyro');
  const gyro = SKINS.find((skin) => skin.id === GYRO_ZEPPELI_ID);
  assert.equal(accessoriesForPalette(gyro.colors), 'gyro');
  assert.equal(gyro.accessory, 'Steel balls');
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
