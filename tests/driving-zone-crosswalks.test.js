import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { SCHOOL_CROSSINGS } from '../src/games/drivingSchoolRoads.js';

function intersectsCrossing(circle, crossing) {
  const halfX = crossing.axis === 'z' ? 6.3 : 2;
  const halfZ = crossing.axis === 'z' ? 2 : 6.3;
  const dx = Math.max(0, Math.abs(circle.x - crossing.x) - halfX);
  const dz = Math.max(0, Math.abs(circle.z - crossing.z) - halfZ);
  return Math.hypot(dx, dz) <= (circle.radius ?? 4);
}
// Mirrors the road grid's approach crossings, including the 32m ring setback.
const crossings = [...SCHOOL_CROSSINGS, ...DRIVING_EXERCISES.flatMap((exercise) => exercise.crossings ?? [])];
for (let x = -300; x <= 300; x += 100) for (let z = -300; z <= 300; z += 100) {
  const offset = x === 200 && z === 200 ? 32 : 14;
  for (const side of [-1, 1]) {
    if (x !== 0) crossings.push({ x, z: z + side * offset, axis: 'z' });
    if (Math.abs(x + side * offset) > 22) crossings.push({ x: x + side * offset, z, axis: 'x' });
  }
}

test('all stopping and waiting circles stay entirely outside pedestrian crossings', () => {
  for (const exercise of DRIVING_EXERCISES) for (const stage of exercise.stages) {
    if (!['stop', 'park', 'priority', 'signal', 'green-stop'].includes(stage.kind)) continue;
    for (const crossing of crossings) assert.equal(intersectsCrossing(stage, crossing), false,
      `${exercise.id} ${stage.kind} at (${stage.x},${stage.z}) overlaps crossing (${crossing.x},${crossing.z})`);
  }
});
test('giratory waiting area is before the crossing and the finish is beyond the exit crossing', () => {
  const e = DRIVING_EXERCISES.find((item) => item.id === 'fr-giratory');
  const wait = e.stages[0], finish = e.stages.at(-1);
  assert.ok(wait.z - wait.radius - 2.6 > 234);
  assert.ok(finish.z + (finish.radius ?? 4) < 166);
  assert.ok(e.spawn.z > e.priority.triggerZ);
  assert.ok(e.priority.triggerZ >= wait.z);
});
