import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { REAL_SITUATION_EXERCISES } from '../src/games/realSituationExercises.js';
import { DRIVING_EXERCISES, stepExerciseObjective } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession } from '../src/games/drivingSchool.js';
import { priorityActorPose, priorityRoadIsClear } from '../src/games/frenchPriorityExercises.js';
import { sampleDrivingRoute } from '../src/games/drivingRoute.js';
import { drivingLiveInstruction } from '../src/games/drivingLiveInstruction.js';
import { schoolTurnSignal } from '../src/games/drivingSchoolIndicators.js';
import { createSchoolCyclist, animateSchoolCyclist } from '../src/games/drivingSchoolCyclist.js';
import { viceCityTrafficSignalState } from '../src/games/viceCityTraffic.js';
const get = (id) => REAL_SITUATION_EXERCISES.find((e) => e.id === id);

test('three real situations bring the expanded catalogue, with original map sections and real actors', () => {
  assert.equal(DRIVING_EXERCISES.length, 23);
  assert.equal(REAL_SITUATION_EXERCISES.length, 3);
  for (const e of REAL_SITUATION_EXERCISES) {
    assert.equal(e.trafficSide, 'right');
    assert.equal(e.priority.keepTrafficLights, true);
    assert.ok(e.priority.actors.length);
    assert.match(e.source, /legifrance/);
    assert.equal(e.stages.at(-1).kind, 'stop');
  }
});
test('left turn waits for the oncoming vehicle instead of treating green as priority', () => {
  const e = get('left-turn-oncoming');
  const s = { ...createDrivingSession('lesson', e), checkpoint: 1, priorityState: { triggerTime: 0 } };
  assert.equal(stepExerciseObjective(s, { ...e.stages[1], time: 4, speed: 0 }, .1).checkpoint, 1);
  assert.equal(stepExerciseObjective(s, { ...e.stages[1], time: 60, speed: 0 }, .1).checkpoint, 2);
  assert.equal(schoolTurnSignal(e, { x: 202.35, z: 123 }), 'left');
  assert.equal(schoolTurnSignal(e, { x: 180, z: 97.65 }), null);
});
test('green plus a blocked exit does not validate entry; clear exit still needs green', () => {
  const e = get('blocked-junction'), goal = e.stages[1];
  const s = { ...createDrivingSession('lesson', e), checkpoint: 1, priorityState: { triggerTime: 2 } };
  assert.equal(viceCityTrafficSignalState('z', -2, 1, 6), 'green');
  assert.equal(stepExerciseObjective(s, { ...goal, time: 6, speed: 0, signal: 'green' }, .1).checkpoint, 1);
  assert.match(drivingLiveInstruction(s, { ...goal, time: 6, speed: 0 }), /taxi libère la sortie/);
  assert.equal(stepExerciseObjective(s, { ...goal, time: 10, speed: 0, signal: 'green' }, .1).checkpoint, 2);
  assert.equal(stepExerciseObjective(s, { ...goal, time: 20, speed: 0, signal: 'red' }, .1).checkpoint, 1);
});
test('cyclist really approaches on the right and blocks the turn until safely past', () => {
  const e = get('right-turn-cyclist'), cyclist = e.priority.actors[0];
  assert.ok(cyclist.points[0].x > e.spawn.x);
  assert.ok(cyclist.points.at(-1).z < e.center.z);
  const s = { ...createDrivingSession('lesson', e), checkpoint: 1, priorityState: { triggerTime: 0 } };
  assert.equal(stepExerciseObjective(s, { ...e.stages[1], time: 5, speed: 0 }, .1).checkpoint, 1);
  assert.equal(stepExerciseObjective(s, { ...e.stages[1], time: 60, speed: 0 }, .1).checkpoint, 2);
  assert.equal(schoolTurnSignal(e, { x: 102.35, z: 323 }), 'right');
});
test('unsafe entry has a specific eliminating fault and a useful explanation for every new situation', () => {
  for (const [id, before, after, label] of [
    ['left-turn-oncoming', 107, 105, 'Virage à gauche engagé devant un véhicule en face'],
    ['blocked-junction', 122, 120, 'Carrefour engagé avec sortie bloquée'],
    ['right-turn-cyclist', 308, 306, 'Priorité refusée au cycliste'],
  ]) {
    const e = get(id);
    let s = stepDrivingSession(createDrivingSession('exam', e), { x: e.spawn.x, z: before, time: 0, speed: 0, damage: 0 });
    s = stepDrivingSession(s, { x: e.spawn.x, z: before, time: .1, speed: 0, damage: 0 });
    s = stepDrivingSession(s, { x: e.spawn.x, z: after, time: .2, speed: 5, damage: 0 });
    const fault = s.faults.find((f) => f.label === label);
    assert.ok(fault?.critical, id);
    assert.ok(fault.reason.length > 20);
    assert.ok(fault.advice.length > 20);
  }
});
test('both curved GPS routes stay on actual asphalt and finish in the right-hand lane', () => {
  for (const id of ['left-turn-oncoming', 'right-turn-cyclist']) {
    const e = get(id);
    for (const p of sampleDrivingRoute(e)) assert.ok(Math.min(Math.abs(p.x - e.center.x), Math.abs(p.z - e.center.z)) < 6.8);
    const last = e.stages.at(-1);
    assert.ok(id === 'left-turn-oncoming' ? last.z < e.center.z : last.z > e.center.z);
  }
});
test('all new objectives can complete in lesson and exam once the signal and traffic permit', () => {
  for (const e of REAL_SITUATION_EXERCISES) for (const mode of ['lesson', 'exam']) {
    let s = { ...createDrivingSession(mode, e), priorityState: { triggerTime: 0 } };
    for (let i = 0; i < e.stages.length; i++) {
      const goal = e.stages[i], sample = { ...goal, time: 120, heading: goal.heading ?? 0, speed: goal.kind === 'stop' ? 0 : 3, signal: 'green' };
      for (let n = 0; n < 6 && s.checkpoint === i; n++) s = stepExerciseObjective(s, sample, .5);
      assert.equal(s.checkpoint, i + 1, `${e.id} stage ${i}`);
    }
  }
});
test('new moving actors stop before their real signal when red and enter on green', () => {
  for (const e of [get('left-turn-oncoming'), get('right-turn-cyclist')]) {
    const actor = e.priority.actors[0], signal = actor.signal;
    for (const triggerTime of [0, 5, 20, 45]) {
      let previous = priorityActorPose(actor, triggerTime, triggerTime), crossed = false;
      for (let time = triggerTime + .025; time < triggerTime + 60; time += .025) {
        const pose = priorityActorPose(actor, time, triggerTime);
        const before = signal.direction * (previous[signal.axis] + signal.direction * (signal.bumper ?? 2.6) - signal.line);
        const after = signal.direction * (pose[signal.axis] + signal.direction * (signal.bumper ?? 2.6) - signal.line);
        if (before <= 1e-8 && after > 1e-8) {
          assert.equal(viceCityTrafficSignalState(signal.axis, signal.ix, signal.iz, time), 'green'); crossed = true; break;
        }
        previous = pose;
      }
      assert.equal(crossed, true);
      assert.equal(priorityRoadIsClear(e, triggerTime + 60, { triggerTime }), true);
    }
  }
});
test('cyclist has an actual bike, helmeted rider, rotating wheels and seated pedalling', () => {
  const person = { group: new THREE.Group(), legs: [new THREE.Group(), new THREE.Group()], arms: [new THREE.Group(), new THREE.Group()], pistol: new THREE.Group(), muzzleFlash: new THREE.Group() };
  const cyclist = createSchoolCyclist(person);
  assert.equal(cyclist.wheels.length, 2);
  assert.equal(person.pistol.visible, false);
  assert.ok(cyclist.group.userData.length > 1.5);
  animateSchoolCyclist(cyclist, 2);
  assert.notEqual(cyclist.wheels[0].rotation.z, 0);
  assert.notEqual(person.legs[0].rotation.x, person.legs[1].rotation.x);
  cyclist.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
});
