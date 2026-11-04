import test from 'node:test';
import assert from 'node:assert/strict';
import { ADDITIONAL_DRIVING_EXERCISES } from '../src/games/additionalDrivingExercises.js';
import { DRIVING_EXERCISES, stepExerciseObjective } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession } from '../src/games/drivingSchool.js';
import { sampleDrivingRoute } from '../src/games/drivingRoute.js';
const get = (id) => ADDITIONAL_DRIVING_EXERCISES.find((e) => e.id === id);

test('four added exercises are circulation situations, not abstract gate drills', () => {
  assert.equal(ADDITIONAL_DRIVING_EXERCISES.length, 4);
  assert.equal(DRIVING_EXERCISES.length, 23);
  assert.equal(new Set(DRIVING_EXERCISES.map((e) => e.id)).size, 23);
  assert.deepEqual(ADDITIONAL_DRIVING_EXERCISES.map((e) => e.id), ['pedestrian-crossing', 'blocked-lane', 'right-turn', 'traffic-yield']);
  for (const e of ADDITIONAL_DRIVING_EXERCISES) {
    assert.equal(e.trafficSide, 'right');
    assert.equal(e.limit, 50);
    assert.ok(e.priority?.actors.length || e.stages[0].signal);
    assert.equal(e.stages.at(-1).kind, 'stop');
  }
});
test('every new objective can complete in lesson and exam when traffic is clear', () => {
  for (const e of ADDITIONAL_DRIVING_EXERCISES) for (const mode of ['lesson', 'exam']) {
    let s = { ...createDrivingSession(mode, e), priorityState: { triggerTime: 0 } };
    for (let i = 0; i < e.stages.length; i++) {
      const goal = e.stages[i];
      const sample = { ...goal, time: 60, heading: goal.heading ?? e.spawn.heading, speed: goal.kind === 'stop' ? 0 : 3, signal: 'green' };
      for (let n = 0; n < 6 && s.checkpoint === i; n++) s = stepExerciseObjective(s, sample, .5);
      assert.equal(s.checkpoint, i + 1, `${e.id} goal ${i + 1}`);
    }
  }
});
test('waiting objectives cannot complete while the pedestrian or vehicles still approach', () => {
  for (const id of ['pedestrian-crossing', 'blocked-lane', 'traffic-yield']) {
    const e = get(id), s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 } };
    assert.equal(stepExerciseObjective(s, { ...e.stages[0], speed: 0, time: 1 }, .5).checkpoint, 0);
  }
});
test('entering the pedestrian crossing or opposite lane early is an eliminating priority fault', () => {
  for (const [id, position, label] of [
    ['pedestrian-crossing', { x: 302.35, z: -274 }, 'Priorité refusée au piéton'],
    ['blocked-lane', { x: -147, z: -302.35 }, 'Voie opposée engagée avant le passage du véhicule'],
  ]) {
    const e = get(id);
    let s = stepDrivingSession(createDrivingSession('exam', e), { ...e.spawn, speed: 0, damage: 0, time: 0 });
    s = stepDrivingSession(s, { ...e.stages[0], speed: 0, damage: 0, time: 1 });
    s = stepDrivingSession(s, { ...position, speed: 5, damage: 0, time: 1.5 });
    assert.ok(s.faults.some((fault) => fault.label === label && fault.critical));
  }
});
test('pedestrian circle is before the crossing and the obstacle detour avoids the stopped vehicle', () => {
  const pedestrian = get('pedestrian-crossing'), wait = pedestrian.stages[0];
  assert.ok(wait.z - wait.radius - 2.6 > pedestrian.crossings[0].z + 2);
  const obstacle = get('blocked-lane');
  for (const point of sampleDrivingRoute(obstacle)) {
    // Conservative clearance from the stopped car, including player footprint.
    assert.ok(Math.abs(point.x + 155) > 5 || Math.abs(point.z + 302.35) > 3);
    assert.ok(Math.abs(point.z + 300) < 6.8);
  }
});
test('right turn respects green and its blue guide stays on the road, not the pavement', () => {
  const e = get('right-turn'), s = createDrivingSession('lesson', e), goal = e.stages[0];
  assert.equal(stepExerciseObjective(s, { ...goal, speed: 0, signal: 'red' }, .5).checkpoint, 0);
  assert.equal(stepExerciseObjective(s, { ...goal, speed: 10, signal: 'green' }, .5).checkpoint, 1);
  for (const p of sampleDrivingRoute(e)) assert.ok(Math.min(Math.abs(p.x - 300), Math.abs(p.z + 100)) < 6.8);
});

test('double-sense crossing remains blocked after the first car passes while the delayed car approaches', () => {
  const e = get('traffic-yield'), s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 } };
  assert.equal(e.priority.actors.length, 2);
  assert.equal(stepExerciseObjective(s, { ...e.stages[0], speed: 0, time: 10 }, .5).checkpoint, 0);
  assert.equal(stepExerciseObjective(s, { ...e.stages[0], speed: 0, time: 14 }, .5).checkpoint, 1);
});

test('pedestrian scenario has eleven visible zebra bands immediately before the existing overhead light', async () => {
  const { exerciseCrosswalkStripes } = await import('../src/games/drivingSchoolScenery.js');
  const { crosswalkGeometry } = await import('../src/games/roadCrosswalks.js');
  const e = get('pedestrian-crossing'), crossing = e.crossings[0];
  const stripes = exerciseCrosswalkStripes(e);
  assert.equal(stripes.length, 11);
  const geometry = crosswalkGeometry(stripes, () => 0);
  assert.equal(geometry.attributes.position.count, 44);
  assert.ok(crossing.z - 2 > e.center.z + 18); // approaching north: zebra precedes the overhead light
  assert.equal(e.priority.keepTrafficLights, true);
  const actor = e.priority.actors[0];
  assert.ok(actor.points[0].x > e.spawn.x);
  assert.ok(actor.points.at(-1).x < e.spawn.x);
  assert.equal(actor.points[0].z, crossing.z);
  assert.equal(e.stages[1].kind, 'signal');
  geometry.dispose();
});
test('pedestrian scenario still penalizes crossing its real traffic light on red', async () => {
  const { viceCityTrafficSignalState } = await import('../src/games/viceCityTraffic.js');
  const e = get('pedestrian-crossing');
  const time = Array.from({ length: 120 }, (_, i) => i).find((t) => viceCityTrafficSignalState('z', 3, -3, t) === 'red' && viceCityTrafficSignalState('z', 3, -3, t + .1) === 'red');
  let s = stepDrivingSession(createDrivingSession('exam', e), { x: e.spawn.x, z: -281, speed: 5, time, damage: 0 });
  s = stepDrivingSession(s, { x: e.spawn.x, z: -283, speed: 5, time: time + .1, damage: 0 });
  assert.ok(s.faults.some((fault) => fault.label === 'Feu rouge franchi' && fault.critical));
});
