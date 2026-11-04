import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { createDrivingSession } from '../src/games/drivingSchool.js';
import { drivingLiveInstruction } from '../src/games/drivingLiveInstruction.js';
import { priorityActorPose, stepPriorityScenario } from '../src/games/frenchPriorityExercises.js';
const exercise = DRIVING_EXERCISES.find((e) => e.id === 'blocked-junction');

test('exercise 15 explicitly approaches the waiting circle before asking the player to wait', () => {
  const s = createDrivingSession('lesson', exercise);
  assert.equal(exercise.stages.length, 3);
  assert.equal(exercise.stages[0].kind, 'drive');
  assert.match(drivingLiveInstruction(s, exercise.spawn), /Avancez.*cercle.*avant/);
  assert.equal(exercise.stages[1].kind, 'priority');
});
test('queue remains held until the driver reaches the circle and actually sees green', () => {
  let s = { ...createDrivingSession('lesson', exercise), checkpoint: 1 };
  let next = stepPriorityScenario(s, { ...exercise.stages[1], speed: 0, time: 1 }, .1);
  assert.equal(next.state.triggerTime, null);
  s = { ...s, priorityState: next.state };
  next = stepPriorityScenario(s, { ...exercise.stages[1], speed: 0, time: 6 }, .1);
  assert.equal(next.state.triggerTime, 6);
  const actor = exercise.priority.actors[0];
  assert.equal(priorityActorPose(actor, 7, 6).traveled, 0);
  assert.equal(priorityActorPose(actor, 11.1, 6).clear, true);
});
test('instructions identify the taxi, then distinguish a free exit from permission to cross', () => {
  const s = { ...createDrivingSession('lesson', exercise), checkpoint: 1, priorityState: { triggerTime: 6 } };
  assert.match(drivingLiveInstruction(s, { ...exercise.stages[1], time: 6 }), /Feu vert.*taxi.*sortie/);
  assert.match(drivingLiveInstruction(s, { ...exercise.stages[1], time: 12 }), /Sortie libre.*feu vert.*traversez/);
  assert.match(drivingLiveInstruction(s, { ...exercise.stages[1], time: 20 }), /Sortie libre.*Attendez.*vert/);
});
