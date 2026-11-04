import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_SKILLS, DRIVING_PROGRESS_KEY, normalizeDrivingProgress, readDrivingProgress, saveDrivingProgress, recordDrivingProgress, drivingSkillProgress, newlyEarnedDrivingBadges, recommendDrivingExercise } from '../src/games/drivingProgress.js';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
const empty = () => normalizeDrivingProgress(null);
const run = (id, assistance = 'guided', extra = {}) => ({ status: 'complete', exercise: { id, teachingAssistance: assistance }, faults: [], score: 100, ...extra });
const pace = DRIVING_SKILLS[0];
test('all exercises have a supported pedagogical competency; no gaze skill is invented', () => {
  for (const exercise of DRIVING_EXERCISES) assert.ok(DRIVING_SKILLS.some(skill => skill.exercises.includes(exercise.id)), exercise.id);
  assert.ok(!DRIVING_SKILLS.some(skill => /regard|observation/i.test(skill.title)));
});
test('first attempts begin acquisition without awarding a badge', () => {
  assert.equal(drivingSkillProgress(empty(), pace).status, 'À découvrir');
  const p = recordDrivingProgress(empty(), run('control', 'guided', { status: 'timeout' }), false);
  assert.equal(drivingSkillProgress(p, pace).status, 'En cours d’acquisition');
  assert.equal(drivingSkillProgress(p, pace).successes, 0);
});
test('three clean successes, two scenarios and at least one autonomous run are all required', () => {
  let p = empty();
  p = recordDrivingProgress(p, run('control'), true);
  p = recordDrivingProgress(p, run('control', 'autonomous'), true);
  p = recordDrivingProgress(p, run('control'), true);
  assert.equal(drivingSkillProgress(p, pace).confirmed, false);
  const before = p;
  p = recordDrivingProgress(p, run('precision'), true);
  assert.equal(drivingSkillProgress(p, pace).confirmed, true);
  assert.deepEqual(newlyEarnedDrivingBadges(before, p), ['Allure maîtrisée']);
  assert.deepEqual(newlyEarnedDrivingBadges(p, p), []);
});
test('guided successes alone cannot confirm a skill', () => {
  let p = empty(); for (const id of ['control','precision','bump']) p = recordDrivingProgress(p, run(id), true);
  assert.equal(drivingSkillProgress(p, pace).confirmed, false);
});
test('passing with faults or failing cannot earn clean successes; abandon is not recorded', () => {
  let p = recordDrivingProgress(empty(), run('control','guided',{ faults: [{ label: 'Vitesse' }], score: 90 }), true);
  assert.equal(p.exercises.control.guided, 0);
  p = recordDrivingProgress(p, run('precision'), false);
  assert.equal(p.exercises.precision.guided, 0);
  assert.equal(recordDrivingProgress(p, run('bump','guided',{ status: 'abandoned' }), false), p);
});
test('progress is immutable, timestamps do not reward speed and badges persist after a later error', () => {
  let p = empty(); const first = p;
  for (const [id, level] of [['control','guided'],['precision','autonomous'],['bump','guided']]) p = recordDrivingProgress(p, run(id,level), true);
  assert.deepEqual(first, empty());
  p = recordDrivingProgress(p, run('control','guided',{status:'outside'}), false);
  assert.equal(drivingSkillProgress(p, pace).confirmed, true);
  assert.equal(p.exercises.control.lastPassed, false);
});
test('recommendation revisits failures, then proposes varied scenarios and autonomy', () => {
  let p = recordDrivingProgress(empty(), run('precision','guided',{status:'timeout'}), false);
  assert.equal(recommendDrivingExercise(p,DRIVING_EXERCISES).exercise.id, 'precision');
  p = recordDrivingProgress(p, run('precision'), true);
  p = recordDrivingProgress(p, run('control'), true);
  const next = recommendDrivingExercise(p,DRIVING_EXERCISES);
  assert.equal(next.exercise.id,'bump'); assert.equal(next.assistance,'autonomous');
});
test('progress survives reload; blocked or corrupt storage is safe', () => {
  let serialized;const storage={setItem:(key,value)=>{assert.equal(key,DRIVING_PROGRESS_KEY);serialized=value;},getItem:()=>serialized};
  const p=recordDrivingProgress(empty(),run('control'),true);saveDrivingProgress(storage,p);
  assert.deepEqual(readDrivingProgress(storage),p);
  assert.deepEqual(readDrivingProgress({getItem:()=>'{bad'}),empty());
  assert.deepEqual(readDrivingProgress(null),empty());
  assert.doesNotThrow(()=>saveDrivingProgress(null,p));
});
test('malformed and obsolete records are sanitized', () => {
  const p=normalizeDrivingProgress({version:1,exercises:{control:{attempts:-4,guided:'999',autonomous:NaN,bestScore:999,lastAttempt:4,lastPassed:'yes'},unknown:{guided:5}}});
  assert.equal(p.exercises.control.attempts,0);assert.equal(p.exercises.control.guided,0);assert.equal(p.exercises.control.bestScore,100);assert.equal(p.exercises.control.lastPassed,false);assert.equal(p.sequence,4);assert.equal(p.exercises.unknown,undefined);
});
