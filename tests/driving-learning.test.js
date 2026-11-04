import test from 'node:test';
import assert from 'node:assert/strict';
import { withDrivingAssistance, drivingTeachingEnabled, drivingLearningNotice, captureDrivingReview, reviewMapPoint } from '../src/games/drivingLearning.js';
import { createDrivingSession, stepDrivingSession } from '../src/games/drivingSchool.js';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { isExerciseSign, isExerciseSignal } from '../src/games/drivingTeachingGlow.js';
const exercise = DRIVING_EXERCISES.find(e => e.id === 'signal');
test('autonomy removes teaching highlights without changing route, traffic or legal limits', () => {
  const autonomous = withDrivingAssistance(exercise, 'autonomous');
  assert.equal(drivingTeachingEnabled(autonomous), false);
  assert.equal(autonomous.stages, exercise.stages);
  assert.equal(autonomous.limit, exercise.limit);
  assert.equal(exercise.teachingAssistance, undefined);
  assert.equal(drivingTeachingEnabled(exercise), true);
  assert.equal(isExerciseSign(autonomous, -92, -70), false);
  assert.equal(isExerciseSignal(autonomous, { axis: 'z', ix: -1, iz: -1, z: -82 }), false);
});
test('autonomy and guided runs are graded identically', () => {
  const sample = { ...exercise.spawn, speed: 60, time: 0, damage: 0 };
  const guided = stepDrivingSession(createDrivingSession('lesson', withDrivingAssistance(exercise)), sample);
  const autonomous = stepDrivingSession(createDrivingSession('lesson', withDrivingAssistance(exercise, 'autonomous')), sample);
  assert.equal(guided.score, autonomous.score);
  assert.deepEqual(guided.faults, autonomous.faults);
});
test('learning notices explain new faults, expire and never repeat on idle samples', () => {
  const before = createDrivingSession('lesson', exercise);
  const after = stepDrivingSession(before, { ...exercise.spawn, speed: 60, damage: 0, time: 0 });
  const notice = drivingLearningNotice(before, after);
  assert.equal(notice.kind, 'error'); assert.match(notice.text, /60.0 km\/h/);
  assert.equal(notice.until, after.elapsed + 6);
  assert.equal(drivingLearningNotice(after, after), null);
  assert.equal(drivingLearningNotice({ ...after, status: 'complete' }, after), null);
});
test('success feedback is contextual and errors take priority over rewards', () => {
  const before = createDrivingSession('lesson', exercise);
  assert.match(drivingLearningNotice(before, { ...before, checkpoint: 1 }).text, /feu/);
  const after = { ...before, checkpoint: 1, faults: [{ reason: 'Feu rouge franchi.' }] };
  assert.equal(drivingLearningNotice(before, after).kind, 'error');
});
test('fault review captures actual actor pose and player position without later mutation', () => {
  const lesson = DRIVING_EXERCISES.find(e => e.id === 'fr-right');
  const sample = { x: 102, z: 119, heading: 0, time: 4 };
  const review = captureDrivingReview(lesson, { triggerTime: 0 }, sample, { x: 102, z: 120 });
  assert.equal(review.actors.length, lesson.priority.actors.length);
  assert.ok(Number.isFinite(review.actors[0].x));
  assert.notEqual(review.actors[0].x, lesson.priority.actors[0].points[0].x);
  sample.x = 999; assert.equal(review.player.x, 102);
});
test('every recorded fault includes a review snapshot with explanatory feedback', () => {
  const run = stepDrivingSession(createDrivingSession('lesson', exercise), { ...exercise.spawn, speed: 60, damage: 0, time: 0 });
  assert.equal(run.faults[0].review.player.x, exercise.spawn.x);
  assert.ok(run.faults[0].reason); assert.ok(run.faults[0].advice);
});
test('review map projects section corners inside the diagram', () => {
  assert.deepEqual(reviewMapPoint(exercise.bounds, { x: exercise.bounds.minX, z: exercise.bounds.minZ }), { x: 16, y: 16 });
  assert.deepEqual(reviewMapPoint(exercise.bounds, { x: exercise.bounds.maxX, z: exercise.bounds.maxZ }), { x: 304, y: 204 });
});
