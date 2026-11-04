import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession } from '../src/games/drivingSchool.js';
import { drivingLiveInstruction } from '../src/games/drivingLiveInstruction.js';
import { varyDrivingTraffic } from '../src/games/drivingTrafficVariation.js';
import { priorityActorPose, actorPauseSeconds, reactPriorityTraffic, priorityRoadIsClear } from '../src/games/frenchPriorityExercises.js';
import { viceCityTrafficSignalState } from '../src/games/viceCityTraffic.js';
const get = (id) => DRIVING_EXERCISES.find((e) => e.id === id);

test('live priority instruction changes from observation to waiting to safe entry', () => {
  let session = createDrivingSession('lesson', get('fr-yield'));
  assert.match(drivingLiveInstruction(session, { time: 0 }), /Observez/);
  session = { ...session, priorityState: { triggerTime: 0 } };
  assert.match(drivingLiveInstruction(session, { time: 1 }), /Attendez/);
  assert.match(drivingLiveInstruction(session, { time: 20 }), /Voie libre/);
});
test('STOP instruction never grants entry until the stop is marked, even with no traffic left', () => {
  const session = { ...createDrivingSession('lesson', get('fr-stop')), priorityState: { triggerTime: 0 } };
  assert.match(drivingLiveInstruction(session, { time: 60 }), /arrêt complet/);
  session.priorityState.stopped = true;
  assert.match(drivingLiveInstruction(session, { time: 60 }), /Voie libre/);
});
test('signal instruction uses actual signal phase, not a separate timer', () => {
  const session = createDrivingSession('lesson', get('signal'));
  const { axis, ix, iz } = session.route[0].signal;
  for (let time = 0; time < 60; time++) {
    const expected = { red: 'Feu rouge', green: 'Feu vert', yellow: 'Feu orange' }[viceCityTrafficSignalState(axis, ix, iz, time)];
    assert.ok(drivingLiveInstruction(session, { time }).startsWith(expected));
  }
});
test('cleared pedestrian never generates a green light instruction while the real light is red', () => {
  const session = { ...createDrivingSession('lesson', get('pedestrian-crossing')), priorityState: { triggerTime: 0 } };
  const time = Array.from({ length: 60 }, (_, i) => i + 20).find((t) => viceCityTrafficSignalState('z', 3, -3, t) === 'red');
  assert.match(drivingLiveInstruction(session, { time }), /Attendez le feu vert/);
});
test('live instructions remain at most twelve words on every exercise and stage', () => {
  for (const exercise of DRIVING_EXERCISES) for (let checkpoint = 0; checkpoint < exercise.stages.length; checkpoint++) {
    for (const time of [0, 1, 8, 30, 60]) for (const stopped of [false, true]) {
      const session = { ...createDrivingSession('lesson', exercise), checkpoint, hold: .5, priorityState: { triggerTime: 0, stopped } };
      const text = drivingLiveInstruction(session, { ...exercise.stages[checkpoint], time, speed: 0 });
      assert.ok(text.split(/\s+/).length <= 12, text);
    }
  }
});
test('variation changes arrival times without moving paths, signs, bounds or static obstacles', () => {
  const original = get('blocked-lane'), before = JSON.stringify(original);
  const slow = varyDrivingTraffic(original, () => 0), fast = varyDrivingTraffic(original, () => .999);
  assert.notEqual(slow.priority.actors[0].speed, fast.priority.actors[0].speed);
  assert.notEqual(slow.priority.actors[0].delay, fast.priority.actors[0].delay);
  assert.equal(slow.priority.actors[0].points, original.priority.actors[0].points);
  assert.equal(slow.priority.actors[1], original.priority.actors[1]);
  assert.equal(slow.bounds, original.bounds);
  assert.equal(slow.stages, original.stages);
  assert.equal(JSON.stringify(original), before);
  assert.equal(varyDrivingTraffic(get('control')), get('control'));
});
test('render and assessment share varied delays, so waiting does not clear traffic early', () => {
  const e = varyDrivingTraffic(get('fr-yield'), () => .999);
  const actor = e.priority.actors[0], state = { triggerTime: 0 };
  const clearanceTime = actor.delay + actor.clearAt / actor.speed;
  assert.equal(priorityRoadIsClear(e, clearanceTime - .01, state), false);
  assert.equal(priorityActorPose(actor, clearanceTime + .01, 0).clear, true);
  assert.equal(priorityRoadIsClear(e, clearanceTime + .01, state), true);
});
test('priority cars slow for an unsafe incursion without rewinding their shared trajectory', () => {
  const actor = { id: 'car', type: 'taxi', speed: 6, clearAt: 80, points: [{ x: 0, z: 0 }, { x: 100, z: 0 }] };
  const exercise = { priority: { actors: [actor] } };
  let state = { triggerTime: 0 };
  state = { ...state, ...reactPriorityTraffic(exercise, 1, state, { x: 11, z: 0 }, .1) };
  assert.ok(state.reactingActors.includes('car'));
  const a = priorityActorPose(actor, 1, 0, actorPauseSeconds(state, actor.id, 1));
  const b = priorityActorPose(actor, 2, 0, actorPauseSeconds(state, actor.id, 2));
  assert.ok(Math.abs(a.x - b.x) < 1e-8);
  state = { ...state, ...reactPriorityTraffic(exercise, 2, state, { x: 60, z: 8 }, .1) };
  const c = priorityActorPose(actor, 3, 0, actorPauseSeconds(state, actor.id, 3));
  assert.ok(c.x > b.x);
  assert.equal(state.reactingActors.length, 0);
});
test('cars do not brake for a safely separated opposite lane or behind them', () => {
  const actor = { id: 'car', type: 'taxi', speed: 6, points: [{ x: 0, z: 0 }, { x: 100, z: 0 }] };
  for (const sample of [{ x: 11, z: 4.7 }, { x: 0, z: 0 }]) {
    assert.equal(reactPriorityTraffic({ priority: { actors: [actor] } }, 1, { triggerTime: 0 }, sample, .1).reactingActors.length, 0);
  }
});
test('fault record captures where, why and how to correct the mistake', () => {
  const exercise = get('control');
  const s = stepDrivingSession(createDrivingSession('lesson', exercise), { ...exercise.spawn, time: 0, speed: 55, damage: 0 });
  const fault = s.faults[0];
  assert.equal(fault.checkpoint, 0);
  assert.equal(fault.position.x, exercise.spawn.x);
  assert.match(fault.reason, /55.0.*50/);
  assert.ok(fault.advice.length > 10);
  assert.equal(fault.speed, 55);
});
