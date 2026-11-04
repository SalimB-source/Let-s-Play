import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { sampleDrivingRoute, createDrivingRoute } from '../src/games/drivingRoute.js';

test('all exercise routes join the spawn and every goal within their exercise section', () => {
  for (const exercise of DRIVING_EXERCISES) {
    const points = sampleDrivingRoute(exercise), b = exercise.bounds;
    assert.deepEqual(points[0], { x: exercise.spawn.x, z: exercise.spawn.z });
    for (const stage of exercise.stages) assert.ok(points.some((p) => Math.hypot(p.x - stage.x, p.z - stage.z) < 1e-8));
    for (let i = 0; i < points.length; i++) {
      assert.ok(points[i].x >= b.minX && points[i].x <= b.maxX && points[i].z >= b.minZ && points[i].z <= b.maxZ);
      if (i) assert.ok(Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z) <= .501);
    }
  }
});
test('giratory route follows the right-hand ring counterclockwise without cutting the island', () => {
  const points = sampleDrivingRoute(DRIVING_EXERCISES.find((e) => e.rule === 'giratory'));
  let previousAngle;
  for (const p of points) {
    assert.ok(Math.hypot(p.x - 200, p.z - 200) > 17);
    if (p.x >= 213) {
      const angle = Math.atan2(p.z - 200, p.x - 200);
      if (previousAngle !== undefined) assert.ok(angle <= previousAngle + 1e-6);
      previousAngle = angle;
    }
  }
});
test('blue route conforms to the road and stays depth tested beneath cars', () => {
  const exercise = DRIVING_EXERCISES[0], elevation = (x, z) => x * .01 + z * .02;
  const mesh = createDrivingRoute(exercise, elevation);
  assert.equal(mesh.material.color.getHex(), 0x269fff);
  assert.equal(mesh.material.depthTest, true);
  assert.equal(mesh.material.depthWrite, true);
  const positions = mesh.geometry.attributes.position;
  assert.ok(positions.count > 0);
  for (let i = 0; i < positions.count; i++) assert.ok(Math.abs(positions.getY(i) - elevation(positions.getX(i), positions.getZ(i)) - .075) < 1e-5);
  mesh.geometry.dispose(); mesh.material.dispose();
});

test('GPS only draws the remaining route beyond the front bumper and never restores the trail', async () => {
  const { updateDrivingRoute } = await import('../src/games/drivingRoute.js');
  const exercise = DRIVING_EXERCISES[0], mesh = createDrivingRoute(exercise, () => 0);
  updateDrivingRoute(mesh, exercise.spawn);
  assert.ok(mesh.geometry.drawRange.start >= 6);
  updateDrivingRoute(mesh, { x: exercise.spawn.x, z: -250 });
  const route = mesh.userData.route;
  assert.ok(route.points[route.startIndex].z >= -247);
  const previousStart = mesh.geometry.drawRange.start;
  updateDrivingRoute(mesh, { x: exercise.spawn.x, z: -255 });
  assert.ok(mesh.geometry.drawRange.start >= previousStart);
  updateDrivingRoute(mesh, exercise.stages.at(-1));
  assert.equal(mesh.geometry.drawRange.count, 0);
  mesh.geometry.dispose(); mesh.material.dispose();
});

test('GPS progress follows the curved ring without skipping across the island', async () => {
  const { updateDrivingRoute } = await import('../src/games/drivingRoute.js');
  const e = DRIVING_EXERCISES.find((item) => item.rule === 'giratory');
  const mesh = createDrivingRoute(e, () => 0), route = mesh.userData.route;
  for (let i = 0; i < route.points.length; i++) {
    updateDrivingRoute(mesh, route.points[i]);
    assert.ok(Math.abs(route.distance - route.lengths[i]) < 1e-6);
    if (route.startIndex < route.points.length - 1) assert.ok(route.lengths[route.startIndex] >= route.distance + 3);
  }
  mesh.geometry.dispose(); mesh.material.dispose();
});
