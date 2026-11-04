import test from 'node:test';
import assert from 'node:assert/strict';
import { crosswalkStripes, crosswalkGeometry, createCrosswalkMaterial } from '../src/games/roadCrosswalks.js';

test('eleven regularly spaced bands cover the street without reaching the pavements', () => {
  for (const axis of ['x', 'z']) {
    const stripes = crosswalkStripes(100, 200, axis);
    assert.equal(stripes.length, 11);
    const across = axis === 'x' ? 'z' : 'x';
    const center = across === 'x' ? 100 : 200;
    for (let i = 0; i < stripes.length; i++) {
      assert.ok(Math.abs(stripes[i][across] - center) + .3 < 7);
      if (i) assert.ok(Math.abs(stripes[i][across] - stripes[i - 1][across] - 1.2) < 1e-9);
    }
  }
});
test('zebra bands run four metres along traffic and remain flat on a sloped road', () => {
  const slope = (x, z) => .02 * x + .05 * z;
  for (const axis of ['x', 'z']) {
    const geometry = crosswalkGeometry([{ x: 100, z: 200, axis }], slope);
    const position = geometry.attributes.position;
    const xs = [], zs = [];
    for (let i = 0; i < position.count; i++) {
      xs.push(position.getX(i)); zs.push(position.getZ(i));
      assert.ok(Math.abs(position.getY(i) - slope(position.getX(i), position.getZ(i)) - .052) < 1e-5);
      assert.ok(geometry.attributes.normal.getY(i) > .99);
    }
    assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - (axis === 'x' ? 4 : .6)) < 1e-4);
    assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - (axis === 'z' ? 4 : .6)) < 1e-4);
    geometry.dispose();
  }
});
test('paint is lit, matte and depth-tested rather than an overlay on the car', () => {
  const material = createCrosswalkMaterial();
  assert.equal(material.isMeshStandardMaterial, true);
  assert.equal(material.depthTest, true);
  assert.equal(material.polygonOffset, true);
  assert.ok(material.roughness > .8);
  material.dispose();
});
