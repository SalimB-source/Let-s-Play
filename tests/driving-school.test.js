import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrivingSession as createActualSession, stepDrivingSession, drivingSessionPassed } from '../src/games/drivingSchool.js';
import { DRIVING_EXERCISES, insideExercise, stepExerciseObjective } from '../src/games/drivingExercises.js';
// Wide fixture isolates road-rule tests from the individual exercise boundaries.
const createDrivingSession = (mode) => createActualSession(mode, { ...DRIVING_EXERCISES[0], bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 }, stages: [{ x: 900, z: 900, kind: 'stop' }] });
const sample = (time, values = {}) => ({ time, x: -138, z: 0, speed: 0, damage: 0, ...values });
test('a real exercise ends only after the required stationary hold', () => {
  const exercise = DRIVING_EXERCISES[0];
  let s = createActualSession('lesson', exercise);
  s = stepDrivingSession(s, sample(0, exercise.spawn));
  const goal = exercise.stages[0];
  s = stepDrivingSession(s, sample(.1, { ...goal, speed: 20 }));
  assert.equal(s.checkpoint, 0);
  for (let i = 2; i <= 15; i++) s = stepDrivingSession(s, sample(i / 10, goal));
  assert.equal(s.status, 'complete');
  assert.equal(drivingSessionPassed(s), true);
});
test('sustained overspeed is penalized without per-frame penalties', () => {
  let s = createDrivingSession('exam');
  for (let i = 0; i < 60; i++) s = stepDrivingSession(s, sample(i / 10, { speed: 60 }));
  assert.equal(s.faults.length, 1);
  assert.equal(s.score, 90);
});
test('collision is critical even with sufficient score', () => {
  let s = stepDrivingSession(createDrivingSession('exam'), sample(0));
  s = stepDrivingSession(s, sample(.1, { damage: 1 }));
  assert.equal(s.faults[0].critical, true);
  assert.equal(drivingSessionPassed({ ...s, status: 'complete' }), false);
});
test('red signal uses map phase and excludes bridge crossings', () => {
  let s = stepDrivingSession(createDrivingSession('exam'), sample(20, { x: -220, z: -100 }));
  s = stepDrivingSession(s, sample(20.1, { x: -217, z: -100 }));
  assert.equal(s.faults[0]?.label, 'Feu rouge franchi');
  let bridge = stepDrivingSession(createDrivingSession('exam'), sample(20, { x: -120, z: 0 }));
  bridge = stepDrivingSession(bridge, sample(20.1, { x: -117, z: 0 }));
  assert.equal(bridge.faults.length, 0);
});
test('completed sessions are immutable', () => {
  const s = { ...createDrivingSession('exam'), status: 'complete' };
  assert.equal(stepDrivingSession(s, sample(1)), s);
});

const { schoolBumpHeight, schoolRoadSpeedLimit, SCHOOL_BUMPS, schoolBumpCrossed } = await import('../src/games/drivingSchoolRoads.js');
test('rounded bumps share geometry and physics and stay off pavements', () => {
  assert.equal(schoolBumpHeight(-200, -45), .18);
  assert.equal(schoolBumpHeight(-200, -47), 0);
  assert.equal(schoolBumpHeight(-208, -45), 0);
  assert.ok(schoolBumpHeight(-200, -44) > 0);
  assert.equal(schoolRoadSpeedLimit(-200, -45), 20);
  assert.equal(schoolRoadSpeedLimit(-200, -75), 50);
});
test('fast bump crossing penalized once, slow crossing accepted', () => {
  for (const [speed, expected] of [[30, 1], [18, 0]]) {
    let s = stepDrivingSession(createDrivingSession('exam'), sample(0, { x: -200, z: -44, speed }));
    s = stepDrivingSession(s, sample(.1, { x: -200, z: -46, speed }));
    assert.equal(s.faults.length, expected);
    assert.equal(schoolBumpCrossed(SCHOOL_BUMPS[0], sample(0, { x: -200, z: -44 }), sample(.1, { x: -200, z: -46 })), true);
  }
});
test('STOP crossing is critical without a complete stop', () => {
  let s = stepDrivingSession(createDrivingSession('exam'), sample(0, { x: -280, z: -200, speed: 10 }));
  s = stepDrivingSession(s, sample(.1, { x: -283, z: -200, speed: 10 }));
  assert.deepEqual(s.faults.map((f) => f.label), ['STOP non marqué']);
  assert.equal(s.faults[0].critical, true);
});
test('one-second stop before line permits departure and does not mutate previous state', () => {
  let s = stepDrivingSession(createDrivingSession('exam'), sample(0, { x: -279, z: -200 }));
  const initial = s;
  for (let i = 1; i <= 15; i++) s = stepDrivingSession(s, sample(i / 10, { x: -279, z: -200 }));
  s = stepDrivingSession(s, sample(1.6, { x: -283, z: -200, speed: 10 }));
  assert.equal(s.faults.length, 0);
  assert.deepEqual(initial.stops, {});
});
test('opposite STOP approaches are assessed independently', () => {
  let s = stepDrivingSession(createDrivingSession('exam'), sample(0, { x: -300, z: -180, speed: 10 }));
  s = stepDrivingSession(s, sample(.1, { x: -300, z: -183, speed: 10 }));
  assert.equal(s.faults[0]?.label, 'STOP non marqué');
});

const { schoolSignLayout, schoolApproachPlacement, leftTrafficOffset, SCHOOL_ROUNDABOUT, SCHOOL_STOP_JUNCTION } = await import('../src/games/drivingSchoolRoads.js');
test('left-hand lanes agree for all four directions', () => {
  assert.equal(leftTrafficOffset('x', 1), -2.35); // eastbound: north half
  assert.equal(leftTrafficOffset('x', -1), 2.35); // westbound: south half
  assert.equal(leftTrafficOffset('z', 1), 2.35); // southbound: east half
  assert.equal(leftTrafficOffset('z', -1), -2.35); // northbound: west half
});
test('all approach signs sit on the right verge and face approaching drivers', () => {
  for (const axis of ['x', 'z']) for (const direction of [-1, 1]) {
    const center = { x: 100, z: -100 };
    const placement = schoolApproachPlacement(center, axis, direction, 30);
    const across = axis === 'x' ? 'z' : 'x';
    assert.equal(placement[axis], center[axis] - direction * 30);
    assert.ok(Math.abs(placement[across] - center[across] + leftTrafficOffset(axis, direction, 7.9)) < 1e-9);
    const facing = axis === 'x' ? Math.sin(placement.yaw) : Math.cos(placement.yaw);
    assert.ok(facing * direction < -.99);
  }
});
test('bump warnings precede the matching bump by 30m; restrictions match assessed zone', () => {
  const signs = schoolSignLayout();
  for (const bump of SCHOOL_BUMPS) for (const direction of [-1, 1]) {
    const matching = signs.filter((s) => s.feature === bump.id && s.direction === direction);
    const warning = matching.find((s) => s.type === 'warning');
    const limit = matching.find((s) => s.label === '20');
    const end = matching.find((s) => s.label === '50');
    assert.equal(direction * (bump[bump.axis] - warning[bump.axis]), 30);
    assert.equal(direction * (bump[bump.axis] - limit[bump.axis]), 18);
    assert.equal(direction * (end[bump.axis] - bump[bump.axis]), 18);
  }
});
test('STOP signs belong only to the unsignalised junction; yield signs precede the ring', () => {
  const signs = schoolSignLayout();
  assert.equal(signs.filter((s) => s.type === 'stop').length, 4);
  for (const sign of signs.filter((s) => s.type === 'stop')) {
    assert.equal(sign.feature, 'stop-junction');
    assert.equal(sign.direction * (SCHOOL_STOP_JUNCTION[sign.axis] - sign[sign.axis]), 18);
  }
  for (const sign of signs.filter((s) => s.type === 'yield')) {
    assert.equal(sign.feature, 'roundabout');
    assert.ok(sign.direction * (SCHOOL_ROUNDABOUT[sign.axis] - sign[sign.axis]) > SCHOOL_ROUNDABOUT.radius);
  }
});

test('exercise spawns and objectives stay within closed distinct sections', () => {
  for (const exercise of DRIVING_EXERCISES) {
    assert.ok(insideExercise(exercise.bounds, exercise.spawn.x, exercise.spawn.z, 3.5));
    for (const stage of exercise.stages) assert.ok(insideExercise(exercise.bounds, stage.x, stage.z, 3.5));
    for (const other of DRIVING_EXERCISES.filter((e) => e.id !== exercise.id)) {
      const a = exercise.bounds, b = other.bounds;
      assert.ok(a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ);
    }
    const exam = createActualSession('exam', exercise);
    assert.equal(exam.exercise.id, exercise.id);
    assert.equal(exam.route, exercise.stages);
  }
});
test('leaving a section terminates the exercise unsuccessfully', () => {
  const exercise = DRIVING_EXERCISES[0];
  let s = stepDrivingSession(createActualSession('lesson', exercise), sample(0, exercise.spawn));
  s = stepDrivingSession(s, sample(.1, { x: 0, z: 0 }));
  assert.equal(s.status, 'outside');
  assert.equal(drivingSessionPassed(s), false);
});
test('stop duration resets when moving or leaving the target', () => {
  const exercise = DRIVING_EXERCISES[4];
  let s = createActualSession('lesson', exercise);
  const target = exercise.stages[0];
  s = stepExerciseObjective(s, sample(0, target), .5);
  assert.equal(s.hold, .5);
  s = stepExerciseObjective(s, sample(.1, { ...target, speed: 3 }), .1);
  assert.equal(s.hold, 0);
  s = stepExerciseObjective(s, sample(.2, target), .5);
  s = stepExerciseObjective(s, sample(.3, exercise.spawn), .1);
  assert.equal(s.hold, 0);
});
test('signal objective waits for green without an artificial mandatory stop', () => {
  const exercise = DRIVING_EXERCISES[2], target = exercise.stages[0];
  let s = createActualSession('lesson', exercise);
  for (let i = 0; i < 4; i++) s = stepExerciseObjective(s, sample(i / 2, { ...target, signal: 'red' }), .5);
  assert.equal(s.checkpoint, 0);
  s = stepExerciseObjective(s, sample(2, { ...target, signal: 'green', speed: 10 }), .1);
  assert.equal(s.checkpoint, 1);
});
test('bump objective cannot be skipped by reaching its far-side marker', () => {
  const exercise = DRIVING_EXERCISES[1], target = exercise.stages[0];
  let s = createActualSession('lesson', exercise);
  s = stepExerciseObjective(s, sample(0, target), .1);
  assert.equal(s.checkpoint, 0);
  s = stepExerciseObjective({ ...s, previous: sample(0, { x: -197.65, z: -44, speed: 18 }) }, sample(.1, { x: -197.65, z: -46, speed: 18 }), .1);
  s = stepExerciseObjective(s, sample(.2, { ...target, speed: 18 }), .1);
  assert.equal(s.checkpoint, 1);
});
test('a fast bump crossing does not satisfy the exercise action', () => {
  const exercise = DRIVING_EXERCISES[1];
  let s = createActualSession('lesson', exercise);
  s = stepExerciseObjective({ ...s, previous: sample(0, { z: -44, speed: 40 }) }, sample(.1, { z: -46, speed: 40 }), .1);
  s = stepExerciseObjective(s, sample(.2, exercise.stages[0]), .1);
  assert.equal(s.checkpoint, 0);
});
test('exercise duration is enforced independently of distance', () => {
  const exercise = { ...DRIVING_EXERCISES[0], duration: .5 };
  let s = stepDrivingSession(createActualSession('lesson', exercise), sample(0, exercise.spawn));
  s = stepDrivingSession(s, sample(.5, exercise.spawn));
  assert.equal(s.status, 'timeout');
});

test('all twenty-three exercises use right-hand traffic, including every base objective', () => {
  assert.equal(DRIVING_EXERCISES.length, 23);
  for (const exercise of DRIVING_EXERCISES) assert.equal(exercise.trafficSide, 'right');
  for (const id of ['control', 'bump', 'signal', 'stop', 'precision']) {
    const exercise = DRIVING_EXERCISES.find((e) => e.id === id);
    const { x, z, heading } = exercise.spawn;
    if (Math.abs(heading) < .01) assert.ok(x > Math.round(x / 100) * 100, `${id}: northbound in east/right lane`);
    if (Math.abs(heading - Math.PI) < .01) assert.ok(x < Math.round(x / 100) * 100, `${id}: southbound in west/right lane`);
    if (heading === -Math.PI / 2) assert.ok(z < Math.round(z / 100) * 100, `${id}: westbound in north/right lane`);
    for (const stage of exercise.stages) {
      if (heading === -Math.PI / 2) assert.equal(stage.z, z);
      else assert.equal(stage.x, x);
    }
  }
});
test('base road signs are on the right verge in each direction', () => {
  for (const sign of schoolSignLayout().filter((s) => SCHOOL_BUMPS.some((b) => b.id === s.feature))) {
    const bump = SCHOOL_BUMPS.find((b) => b.id === sign.feature);
    const across = sign.axis === 'x' ? 'z' : 'x';
    assert.ok(Math.abs(sign[across] - bump[across] + leftTrafficOffset(sign.axis, sign.direction, 7.9)) < 1e-9);
  }
});
