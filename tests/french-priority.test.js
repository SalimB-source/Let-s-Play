import test from 'node:test';
import assert from 'node:assert/strict';
import { FRENCH_PRIORITY_EXERCISES, priorityActorPose, priorityRoadIsClear, stepPriorityScenario } from '../src/games/frenchPriorityExercises.js';
import { createDrivingSession, stepDrivingSession, drivingSessionPassed } from '../src/games/drivingSchool.js';
import { stepExerciseObjective, insideExercise } from '../src/games/drivingExercises.js';
const get = (rule) => FRENCH_PRIORITY_EXERCISES.find((e) => e.rule === rule);
const sample = (exercise, time, extra = {}) => ({ ...exercise.spawn, time, speed: 0, damage: 0, ...extra });

test('French scenarios use right-hand lanes, official references and closed sections', () => {
  assert.equal(FRENCH_PRIORITY_EXERCISES.length, 4);
  for (const exercise of FRENCH_PRIORITY_EXERCISES) {
    assert.equal(exercise.trafficSide, 'right');
    assert.equal(exercise.jurisdiction, 'FR');
    assert.match(exercise.source, /^https:\/\/www.legifrance.gouv.fr\//);
    assert.ok(insideExercise(exercise.bounds, exercise.spawn.x, exercise.spawn.z, 3.5));
    assert.equal(exercise.spawn.x, exercise.center.x + 2.35);
  }
});
test('a right-hand priority vehicle genuinely approaches from the player’s right', () => {
  const e = get('right'), actor = e.priority.actors[0];
  const start = priorityActorPose(actor, 100, null);
  assert.ok(start.x > e.center.x);
  assert.equal(start.z, e.center.z - 2.35);
  const moving = priorityActorPose(actor, 4, 0);
  assert.ok(moving.x < start.x);
  assert.equal(moving.clear, false);
  assert.equal(priorityActorPose(actor, 12, 0).clear, true);
});
test('traffic does not run on a global timer before the player approaches', () => {
  const e = get('right');
  let session = createDrivingSession('lesson', e);
  const early = stepPriorityScenario(session, sample(e, 100), .1);
  assert.equal(early.state.triggerTime, null);
  const actor = e.priority.actors[0];
  assert.deepEqual(priorityActorPose(actor, 100, early.state.triggerTime), priorityActorPose(actor, 0, null));
  const activated = stepPriorityScenario({ ...session, priorityState: early.state }, sample(e, 101, { z: e.priority.triggerZ }), .1);
  assert.equal(activated.state.triggerTime, 101);
});
test('cutting in front of the vehicle is an eliminating fault, detected at the bumper', () => {
  const e = get('right');
  let s = stepDrivingSession(createDrivingSession('lesson', e), sample(e, 0));
  s = stepDrivingSession(s, sample(e, .1, { z: e.priority.triggerZ }));
  s = stepDrivingSession(s, sample(e, .2, { z: e.priority.entryZ + 3, speed: 20 }));
  s = stepDrivingSession(s, sample(e, .3, { z: e.priority.entryZ + 2, speed: 20 }));
  assert.equal(s.faults[0]?.label, 'Refus de priorité');
  assert.equal(s.faults[0]?.critical, true);
  assert.equal(drivingSessionPassed({ ...s, status: 'complete' }), false);
  const again = stepDrivingSession(s, sample(e, .4, { z: e.priority.entryZ, speed: 20 }));
  assert.equal(again.faults.length, s.faults.length);
});
test('yield does not require a stop if conflict has cleared', () => {
  const e = get('yield');
  const s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 } };
  const done = stepExerciseObjective(s, sample(e, 12, { ...e.stages[0], speed: 5 }), .1);
  assert.equal(done.checkpoint, 1);
});
test('yield traffic may come from the left: it is not an unmarked junction', () => {
  const e = get('yield'), a = e.priority.actors[0];
  assert.ok(a.points[0].x < e.center.x);
  assert.ok(priorityActorPose(a, 4, 0).x > a.points[0].x);
});
test('STOP requires a complete stop even after all vehicles have passed', () => {
  const e = get('stop');
  let s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 } };
  const goal = sample(e, 20, e.stages[0]);
  assert.equal(stepExerciseObjective(s, goal, .1).checkpoint, 0);
  for (let i = 0; i < 12; i++) {
    const p = stepPriorityScenario(s, { ...goal, time: 20 + i / 10 }, .1);
    s = { ...s, priorityState: p.state };
  }
  assert.equal(s.priorityState.stopped, true);
  assert.equal(stepExerciseObjective(s, { ...goal, time: 22 }, .1).checkpoint, 1);
});
test('rolling through a STOP remains a fault when the road is clear', () => {
  const e = get('stop');
  const s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 }, previous: sample(e, 20, { z: e.priority.entryZ + 4 }) };
  const result = stepPriorityScenario(s, sample(e, 20.1, { z: e.priority.entryZ + 2, speed: 5 }), .1);
  assert.deepEqual(result.faults, ['STOP non marqué']);
});
test('STOP checks both conflicting vehicles, including the delayed second vehicle', () => {
  const e = get('stop');
  assert.equal(e.priority.actors.length, 2);
  assert.equal(priorityRoadIsClear(e, 10, { triggerTime: 0 }), false);
  assert.equal(priorityRoadIsClear(e, 14, { triggerTime: 0 }), true);
});
test('ring traffic moves counterclockwise and clears the entry only after passing', () => {
  const e = get('giratory'), actor = e.priority.actors[0];
  const a = priorityActorPose(actor, 0, 0), b = priorityActorPose(actor, 1, 0);
  assert.ok(Math.atan2(b.z - 200, b.x - 200) < Math.atan2(a.z - 200, a.x - 200));
  assert.equal(priorityRoadIsClear(e, 4, { triggerTime: 0 }), false);
  assert.equal(priorityRoadIsClear(e, 6, { triggerTime: 0 }), true);
});
test('entering the giratory before the circulating car clears is penalized', () => {
  const e = get('giratory');
  const s = { ...createDrivingSession('lesson', e), priorityState: { triggerTime: 0 }, previous: sample(e, 1, { z: 232 }) };
  const result = stepPriorityScenario(s, sample(e, 1.1, { z: 230, speed: 10 }), .1);
  assert.deepEqual(result.faults, ['Priorité refusée au véhicule dans l’anneau']);
});
test('clockwise driving in a French giratory is an eliminating fault', () => {
  const e = get('giratory');
  const previous = sample(e, 1, { x: 218, z: 200 });
  const next = sample(e, 1.1, { x: 200 + 18 * Math.cos(.4), z: 200 + 18 * Math.sin(.4) });
  const result = stepPriorityScenario({ ...createDrivingSession('lesson', e), previous }, next, .1);
  assert.deepEqual(result.faults, ['Circulation à contresens dans le giratoire']);
});

test('priority-to-right objective is close to the junction but before the engagement boundary', () => {
  const e = get('right'), target = e.stages[0];
  assert.equal(target.z - e.center.z, 20.5);
  assert.equal(target.x, e.spawn.x);
  assert.ok(target.z - target.radius - 2.6 > e.priority.entryZ);
  assert.equal(get('yield').stages[0].z - get('yield').center.z, 23);
  assert.equal(get('stop').stages[0].z - get('stop').center.z, 23);
});
