import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHOOL_CHAPTERS, schoolChapter, schoolCardStatus, readSchoolSettings, saveSchoolSettings, normalizeSchoolSettings, schoolResultSummary } from '../src/games/drivingSchoolInterface.js';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
test('all twenty-three situations belong to exactly one unlocked chapter', () => {
  assert.equal(SCHOOL_CHAPTERS.length,4);
  const ids=SCHOOL_CHAPTERS.flatMap(c=>c.exercises);
  assert.equal(new Set(ids).size,DRIVING_EXERCISES.length);
  for(const e of DRIVING_EXERCISES){assert.equal(ids.filter(id=>id===e.id).length,1);assert.ok(schoolChapter(e).exercises.includes(e.id));}
});
test('interface settings preserve comfortable defaults and sanitize unknown choices', () => {
  assert.deepEqual(normalizeSchoolSettings(null),{steering:'buttons',textSize:'standard'});
  assert.deepEqual(normalizeSchoolSettings({steering:'wheel',textSize:'large'}),{steering:'wheel',textSize:'large'});
  assert.deepEqual(normalizeSchoolSettings({steering:'bad',textSize:100}),normalizeSchoolSettings(null));
});
test('controls and large text persist without relying on storage availability', () => {
  let saved; const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value;}};
  saveSchoolSettings(storage,{steering:'wheel',textSize:'large'});
  assert.deepEqual(readSchoolSettings(storage),{steering:'wheel',textSize:'large'});
  assert.deepEqual(readSchoolSettings({getItem:()=>'{bad'}),normalizeSchoolSettings(null));
  assert.doesNotThrow(()=>saveSchoolSettings(null,{}));
});
test('card status never claims a fault-free success without recorded evidence', () => {
  assert.equal(schoolCardStatus({exercises:{}},'signal'),'À découvrir');
  assert.equal(schoolCardStatus({exercises:{signal:{guided:0,autonomous:0}}},'signal'),'À retravailler');
  assert.equal(schoolCardStatus({exercises:{signal:{guided:0,autonomous:1}}},'signal'),'Réussi sans faute');
});
test('result summary teaches the next reflex rather than celebrating speed', () => {
  const session={status:'complete',checkpoint:2,faults:[]};
  const summary=schoolResultSummary(session,true);
  assert.match(summary.positive,/2 étapes validées/);assert.match(summary.improvement,/sans les aides/);
  const failed=schoolResultSummary({...session,faults:[{advice:'Laissez le piéton terminer sa traversée.'}]},false);
  assert.equal(failed.improvement,'Laissez le piéton terminer sa traversée.');
});
test('abandon and boundary/time failures have honest actionable summaries', () => {
  assert.match(schoolResultSummary({status:'abandoned',checkpoint:0,faults:[]},false).title,/pause/);
  assert.match(schoolResultSummary({status:'outside',checkpoint:0,faults:[]},false).improvement,/section/);
  assert.match(schoolResultSummary({status:'timeout',checkpoint:0,faults:[]},false).improvement,/anticiper/);
});
