import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';

test('every driving instruction is short enough to read at a glance', () => {
  for (const exercise of DRIVING_EXERCISES) for (const stage of exercise.stages) {
    assert.ok(stage.instruction.trim().length > 0);
    assert.ok(stage.instruction.length <= 85, `${exercise.id}: instruction too long`);
    assert.ok(stage.instruction.split(/\s+/).length <= 12, `${exercise.id}: too many words`);
  }
});
test('essential pedestrian, light and stop instructions remain explicit', () => {
  const pedestrian = DRIVING_EXERCISES.find((e) => e.id === 'pedestrian-crossing');
  assert.match(pedestrian.stages[0].instruction, /avant les bandes.*piéton/);
  assert.match(pedestrian.stages[1].instruction, /feu vert/);
  assert.match(DRIVING_EXERCISES.find((e) => e.id === 'stop').stages[0].instruction, /STOP.*arrêt complet.*avant la ligne/);
  assert.match(DRIVING_EXERCISES.find((e) => e.id === 'signal').stages[0].instruction, /Rouge.*stop.*Vert.*voie.*libre/);
});
