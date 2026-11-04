import test from 'node:test';
import assert from 'node:assert/strict';
import { ROAD_CODE_EXERCISES, narrowPassageBodies, narrowPassageBlocked, keepPassageMarking } from '../src/games/roadCodeExercises.js';
import { DRIVING_EXERCISES, insideExercise, stepExerciseObjective } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession, drivingSessionPassed } from '../src/games/drivingSchool.js';
import { priorityRoadIsClear, reactPriorityTraffic, priorityActorPose, actorPauseSeconds } from '../src/games/frenchPriorityExercises.js';
import { drivingLiveInstruction } from '../src/games/drivingLiveInstruction.js';
import { sampleDrivingRoute } from '../src/games/drivingRoute.js';
import { normalizeDrivingProgress, recordDrivingProgress } from '../src/games/drivingProgress.js';
import { schoolChapter } from '../src/games/drivingSchoolInterface.js';
import { schoolSituationScene } from '../src/games/schoolSituationArt.js';
import { CityRushAudio } from '../src/games/cityRushAudio.js';
const get=id=>ROAD_CODE_EXERCISES.find(e=>e.id===id);
const sample=(e,time,extra={})=>({...e.spawn,speed:0,damage:0,time,...extra});
test('four new original situations integrate into the existing 23-item catalogue and closed sections',()=>{
  assert.equal(ROAD_CODE_EXERCISES.length,4);assert.equal(DRIVING_EXERCISES.length,23);
  for(const e of ROAD_CODE_EXERCISES){
    assert.equal(e.trafficSide,'right');assert.equal(e.limit,50);assert.ok(e.article);assert.match(e.source,/legifrance/);
    assert.ok(schoolChapter(e).exercises.includes(e.id));assert.ok(schoolSituationScene(e).caption);
    for(const p of [e.spawn,...e.stages])assert.ok(insideExercise(e.bounds,p.x,p.z,3.5),e.id);
    for(const p of sampleDrivingRoute(e))assert.ok(insideExercise(e.bounds,p.x,p.z),e.id);
  }
});
test('the narrowed road is physically one-car wide, shared by 3D, collision and the map',()=>{
  const e=get('narrow-passage');assert.equal(narrowPassageBodies(e).length,2);
  assert.equal(narrowPassageBlocked(e,-100,-250,0),false);
  assert.equal(narrowPassageBlocked(e,-97.65,-250,0),true);
  assert.equal(narrowPassageBlocked(e,-102.35,-250,0),true);
  assert.equal(narrowPassageBlocked(e,-97.65,-229,0),false);
  assert.equal(narrowPassageBlocked(e,-97.65,-275.5,0),false);
  assert.equal(keepPassageMarking(e,-100,-250,2),false);
  assert.equal(keepPassageMarking(e,-100,-220,2),true);
  assert.equal(narrowPassageBlocked(get('yield-clear'),-100,-250),false);
});
test('B15 holds entry until oncoming traffic is safely out; waiting does not require an arbitrary stop duration',()=>{
  const e=get('narrow-passage'),session={...createDrivingSession('lesson',e),priorityState:{triggerTime:0}};
  assert.equal(priorityRoadIsClear(e,3,session.priorityState),false);assert.equal(priorityRoadIsClear(e,30,session.priorityState),true);
  assert.equal(stepExerciseObjective(session,{...e.stages[0],time:3,speed:3},.1).checkpoint,0);
  assert.equal(stepExerciseObjective(session,{...e.stages[0],time:30,speed:3},.1).checkpoint,1);
});
test('ignoring the narrow-road or emergency priority produces a specific critical fault and advice',()=>{
  for(const [id,label] of [['narrow-passage','Passage étroit engagé sans céder en face'],['emergency-vehicle','Passage refusé au véhicule prioritaire en intervention']]){
    const e=get(id),line=e.priority.entryZ;
    let s=stepDrivingSession(createDrivingSession('lesson',e),sample(e,0,{z:line+4}));
    s=stepDrivingSession(s,sample(e,.1,{z:line+3}));
    s=stepDrivingSession(s,sample(e,.2,{z:line+2,speed:10}));
    const fault=s.faults.find(f=>f.label===label);assert.ok(fault?.critical,id);assert.ok(fault.advice.length>30);assert.equal(drivingSessionPassed({...s,status:'complete'}),false);
  }
});
test('police really arrives from the left, with emergency equipment, and must clear before entry',()=>{
  const e=get('emergency-vehicle'),actor=e.priority.actors[0];assert.equal(actor.type,'police');assert.equal(actor.emergency,true);
  assert.ok(actor.points[0].x<e.center.x);assert.ok(actor.points.at(-1).x>e.center.x);
  assert.equal(priorityRoadIsClear(e,2,{triggerTime:0}),false);assert.equal(priorityRoadIsClear(e,12,{triggerTime:0}),true);
  const s={...createDrivingSession('lesson',e),priorityState:{triggerTime:0}};
  assert.match(drivingLiveInstruction(s,sample(e,2)),/police en intervention/);
});
test('the priority-road user may continue without waiting for the yielding side-road car',()=>{
  const e=get('priority-road'),s={...createDrivingSession('lesson',e),priorityState:{triggerTime:0}};
  assert.equal(priorityRoadIsClear(e,1,s.priorityState),true);
  assert.equal(stepExerciseObjective(s,{...e.stages[0],speed:12,time:1},.1).checkpoint,1);
  let state={triggerTime:0};
  for(let time=.5;time<=20;time+=.5)state={...state,...reactPriorityTraffic(e,time,state,{...e.stages[0],speed:0},.5)};
  const actor=e.priority.actors[0];const pose=priorityActorPose(actor,20,state.triggerTime,actorPauseSeconds(state,actor.id,20));
  assert.equal(pose.traveled,20);assert.equal(pose.x,322);assert.ok(pose.x-2.6>318);
  assert.equal(state.reactingActors.length,0,'normal yielding is not an unsafe emergency brake');
  state={...state,...reactPriorityTraffic(e,20.5,state,{x:302.35,z:80,speed:10},.5)};
  assert.ok(state.releasedActors.includes(actor.id));
  const later=priorityActorPose(actor,22,state.triggerTime,actorPauseSeconds(state,actor.id,22));assert.ok(later.x<pose.x);
});
test('clear yield uses a real yield sign, has no hidden traffic and does not force an approach stop',()=>{
  const e=get('yield-clear'),s={...createDrivingSession('lesson',e),priorityState:{triggerTime:0}};
  assert.equal(e.rule,'yield');assert.equal(e.priority.stopRequired,false);assert.deepEqual(e.priority.actors,[]);
  assert.equal(stepExerciseObjective(s,{...e.stages[0],time:1,speed:15},.1).checkpoint,1);
  assert.match(drivingLiveInstruction(s,sample(e,1)),/sans arrêt obligatoire/);
  let run=stepDrivingSession(createDrivingSession('lesson',e),sample(e,0));
  run=stepDrivingSession(run,sample(e,1,{...e.stages[0],speed:15}));
  run=stepDrivingSession(run,sample(e,2,{z:-185,speed:15}));assert.equal(run.faults.length,0);
});
test('old saves survive and every new situation can record clean progress without resetting prior learning',()=>{
  let progress=normalizeDrivingProgress({version:1,sequence:1,exercises:{control:{attempts:2,guided:1,autonomous:0,bestScore:100,lastAttempt:1,lastPassed:true}}});
  for(const e of ROAD_CODE_EXERCISES)progress=recordDrivingProgress(progress,{status:'complete',exercise:e,score:100,faults:[]},true);
  assert.equal(progress.exercises.control.attempts,2);for(const e of ROAD_CODE_EXERCISES)assert.equal(progress.exercises[e.id].guided,1);
});
test('two-tone emergency audio is rate-limited and obeys mute, without changing free-drive sirens',()=>{
  const played=[];const audio={ready:()=>true,context:{currentTime:5},sfxBus:{},tone:(...args)=>played.push(args)};
  for(const time of [0,.1,.33,.4,.65])CityRushAudio.prototype.schoolEmergencySiren.call(audio,{time});
  assert.deepEqual(played.map(p=>p[0]),[435,580,435]);
  CityRushAudio.prototype.schoolEmergencySiren.call(audio,{time:1,mute:true});assert.equal(played.length,3);
});
test('the lateral car stops exactly at its hold point even between telemetry updates',()=>{
  const e=get('priority-road'),actor=e.priority.actors[0];
  const state={triggerTime:0,...reactPriorityTraffic(e,4.5,{triggerTime:0},{...e.stages[0],speed:0},.5)};
  let previous=0;
  for(let time=4.5;time<7;time+=.013){
    const pose=priorityActorPose(actor,time,0,actorPauseSeconds(state,actor.id,time));
    assert.ok(pose.traveled>=previous);assert.ok(pose.traveled<=actor.holdDistance);previous=pose.traveled;
  }
  assert.equal(previous,20);
});
