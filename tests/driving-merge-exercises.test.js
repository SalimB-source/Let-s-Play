import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_MERGE_EXERCISES } from '../src/games/drivingMergeExercises.js';
import { DRIVING_EXERCISES, stepExerciseObjective } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession } from '../src/games/drivingSchool.js';
import { sampleDrivingRoute } from '../src/games/drivingRoute.js';
import { priorityRoadIsClear } from '../src/games/frenchPriorityExercises.js';
import { schoolTurnSignal } from '../src/games/drivingSchoolIndicators.js';
import { varyDrivingTraffic } from '../src/games/drivingTrafficVariation.js';
const get = (id) => DRIVING_MERGE_EXERCISES.find((e) => e.id === id);

test('two merge situations bring the expanded catalogue with real traffic and lane markings', () => {
  assert.equal(DRIVING_EXERCISES.length, 23);
  assert.equal(new Set(DRIVING_EXERCISES.map((e) => e.id)).size, 23);
  assert.ok(get('parking-exit').parkingBay);
  assert.equal(get('lane-change').laneDivider.lanes.length, 2);
  for (const e of DRIVING_MERGE_EXERCISES) {
    assert.equal(e.trafficSide, 'right');
    assert.ok(e.priority.bumper < 1);
    assert.ok(e.priority.actors[0].speed > 0);
    assert.equal(e.stages.at(-1).kind, 'stop');
  }
});
test('the waiting car stays safely in its bay and passing traffic never deadlocks behind it', () => {
  for (const id of ['parking-exit', 'lane-change']) for (const random of [() => 0, () => .999]) {
    const e = varyDrivingTraffic(get(id), random);
    let s = createDrivingSession('lesson', e);
    for (let i = 0; i <= 300; i++) {
      s = stepDrivingSession(s, { ...e.spawn, time: i / 10, speed: 0, damage: 0 });
      assert.equal(s.priorityState?.reactingActors?.length ?? 0, 0);
    }
    assert.equal(s.checkpoint, 1);
    assert.equal(s.faults.length, 0);
    assert.equal(priorityRoadIsClear(e, 30, s.priorityState), true);
  }
});
test('lateral incursion before the passing vehicle clears is detected and explained', () => {
  for (const [id, position, label] of [
    ['parking-exit', { x: -296, z: -156 }, 'Sortie de stationnement sans céder le passage'],
    ['lane-change', { x: -275, z: -96.2 }, 'Changement de voie sans créneau suffisant'],
  ]) {
    const e = get(id);
    let s = stepDrivingSession(createDrivingSession('exam', e), { ...e.spawn, time: 0, speed: 0, damage: 0 });
    s = stepDrivingSession(s, { ...e.spawn, time: .1, speed: 0, damage: 0 });
    s = stepDrivingSession(s, { ...position, time: .2, speed: 3, damage: 0 });
    const fault = s.faults.find((f) => f.label === label);
    assert.equal(fault?.critical, true);
    assert.ok(fault.reason.length > 20);
    assert.ok(fault.advice.length > 20);
  }
});
test('a turn indicator signals intent but does not unlock either priority objective', () => {
  for (const e of DRIVING_MERGE_EXERCISES) {
    const s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 } };
    assert.equal(schoolTurnSignal(e, e.spawn, s.priorityState), 'left');
    assert.equal(stepExerciseObjective(s, { ...e.spawn, time: 1, speed: 0 }, .1).checkpoint, 0);
    assert.equal(stepExerciseObjective(s, { ...e.spawn, time: 30, speed: 0 }, .1).checkpoint, 1);
    assert.equal(schoolTurnSignal(e, e.stages[1], s.priorityState), null);
  }
});
test('guides stay on actual asphalt, and lane change never crosses into opposing traffic', () => {
  const parking = get('parking-exit'), lane = get('lane-change');
  for (const p of sampleDrivingRoute(parking)) assert.ok(Math.abs(p.x + 300) < 6.8);
  for (const p of sampleDrivingRoute(lane)) {
    assert.ok(p.z > -100);
    assert.ok(p.z < -93);
  }
  assert.ok(lane.priority.actors[0].points.at(-1).x > lane.priority.actors[0].points[0].x);
});
test('both new exercises can complete in lesson and exam after a safe gap', () => {
  for (const e of DRIVING_MERGE_EXERCISES) for (const mode of ['lesson', 'exam']) {
    let s = { ...createDrivingSession(mode, e), priorityState: { triggerTime: 0 } };
    for (let i = 0; i < e.stages.length; i++) {
      const goal = e.stages[i], sample = { ...goal, time: 60, heading: goal.heading ?? e.spawn.heading, speed: goal.kind === 'stop' ? 0 : 3 };
      for (let n = 0; n < 6 && s.checkpoint === i; n++) s = stepExerciseObjective(s, sample, .5);
      assert.equal(s.checkpoint, i + 1);
    }
  }
});
