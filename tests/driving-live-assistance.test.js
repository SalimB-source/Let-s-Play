import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVING_EXERCISES} from '../src/games/drivingExercises.js';
import {createDrivingSession,stepDrivingSession} from '../src/games/drivingSchool.js';
import {drivingLiveAssistance} from '../src/games/drivingLiveInstruction.js';
import {viceCityTrafficSignalState} from '../src/games/viceCityTraffic.js';
const get=id=>DRIVING_EXERCISES.find(e=>e.id===id);
const session=(id,extra={})=>({...createDrivingSession('lesson',get(id)),priorityState:{triggerTime:0,stopped:true},...extra});
test('real clearance changes waiting cross to green check, without a new fault',()=>{
  const s=session('fr-yield'),before=JSON.stringify(s);
  const wait=drivingLiveAssistance(s,{...s.route[0],time:1});assert.equal(wait.symbol,'❌');assert.match(wait.text,/Attendez encore un peu/);
  const go=drivingLiveAssistance(s,{...s.route[0],time:60});assert.equal(go.symbol,'✅');assert.match(go.text,/C’est bon/);
  assert.equal(JSON.stringify(s),before);
});
test('each conflicting road user has contextual assistance while waiting',()=>{
  for(const [id,who] of [['fr-giratory','l’anneau'],['narrow-passage','en face'],['emergency-vehicle','police'],['parking-exit','prioritaires'],['traffic-yield','prioritaires']]){
    const s=session(id);const cue=drivingLiveAssistance(s,{...s.route[0],time:1});assert.equal(cue.state,'wait');assert.ok(cue.text.includes(who),id);
  }
});
test('STOP cannot give permission just because all cars have passed',()=>{
  const s=session('fr-stop',{priorityState:{triggerTime:0,stopped:false}});
  assert.equal(drivingLiveAssistance(s,{...s.route[0],time:60}).symbol,'🛑');
  s.priorityState.stopped=true;assert.equal(drivingLiveAssistance(s,{...s.route[0],time:60}).symbol,'✅');
});
test('red/orange never receive a green check on a controlled approach',()=>{
  const s=session('signal'),signal=s.route[0].signal;
  for(let time=0;time<60;time++){
    const phase=viceCityTrafficSignalState(signal.axis,signal.ix,signal.iz,time);
    const cue=drivingLiveAssistance(s,{...s.route[0],time});assert.equal(cue.state,phase==='green'?'go':'wait');
  }
});
test('cleared taxi or pedestrian still needs a green light before entry',()=>{
  for(const id of ['blocked-junction','pedestrian-crossing']){
    const s=session(id,{checkpoint:id==='blocked-junction'?1:0});const signal=s.route.find(stage=>stage.signal).signal;
    const time=Array.from({length:60},(_,i)=>i+60).find(t=>viceCityTrafficSignalState(signal.axis,signal.ix,signal.iz,t)==='red');
    const cue=drivingLiveAssistance(s,{...s.route[s.checkpoint],time});assert.equal(cue.state,'wait');assert.match(cue.text,/feu est rouge/);
  }
});
test('paused priority traffic or a reacting vehicle never receives premature permission',()=>{
  const s=session('fr-yield',{priorityState:{triggerTime:0,actorPauses:{blue:60}}});
  assert.equal(drivingLiveAssistance(s,{...s.route[0],time:60}).state,'wait');
  s.priorityState={triggerTime:0,faulted:true,reactingActors:['blue']};assert.match(drivingLiveAssistance(s,{...s.route[0],time:60}).text,/Danger/);
});
test('permission stays readable for five seconds after the waiting checkpoint',()=>{
  const s=session('fr-yield',{checkpoint:1,elapsed:20,lastCheckpointAt:19});
  assert.equal(drivingLiveAssistance(s,{...s.route[0],time:60,speed:0}).state,'go');
  s.elapsed=24;assert.equal(drivingLiveAssistance(s,{...s.route[0],time:60}).state,'go');
  s.elapsed=25;assert.equal(drivingLiveAssistance(s,{...s.route[0],time:60}).state,'instruction');
  s.elapsed=20;assert.notEqual(drivingLiveAssistance(s,{...s.route[1],time:60,speed:0}).state,'go');
});
test('a recent green cannot override a newly red light before the line, or stop an already engaged driver',()=>{
  const s=session('signal',{checkpoint:1,elapsed:10,lastCheckpointAt:9});const signal=s.route[0].signal;
  const time=Array.from({length:60},(_,i)=>i).find(t=>viceCityTrafficSignalState(signal.axis,signal.ix,signal.iz,t)==='red');
  assert.equal(drivingLiveAssistance(s,{...s.route[0],time}).state,'wait');
  assert.equal(drivingLiveAssistance(s,{x:s.exercise.spawn.x,z:-105,time}).state,'go');
});
test('clear yield and a priority road do not invent an obligatory wait; autonomy remains unassisted',()=>{
  for(const id of ['priority-road','yield-clear'])assert.equal(drivingLiveAssistance(session(id,{priorityState:undefined}),{time:0}).state,'go');
  const s=session('fr-yield');s.exercise={...s.exercise,teachingAssistance:'autonomous'};
  const cue=drivingLiveAssistance(s,{time:1});assert.equal(cue.symbol,'');assert.equal(cue.state,'instruction');
});
test('all assisted brief texts stay short and legible at every stage',()=>{
  for(const e of DRIVING_EXERCISES)for(let checkpoint=0;checkpoint<e.stages.length;checkpoint++)for(const time of [0,1,8,30,60]){
    const s=session(e.id,{checkpoint,elapsed:10,lastCheckpointAt:9});const cue=drivingLiveAssistance(s,{...e.stages[checkpoint],time,speed:0});
    assert.ok(cue.text.split(/\s+/).length<=12,cue.text);assert.ok(cue.text.length<=85,cue.text);
  }
});
test('assessment timestamps transitions for assistance without changing scoring',()=>{
  const e=get('control');let s=createDrivingSession('lesson',e);
  for(const time of [0,.5,1,1.5])s=stepDrivingSession(s,{...e.stages[0],time,speed:0,damage:0});
  assert.equal(s.status,'complete');assert.equal(s.lastCheckpointAt,s.elapsed);assert.equal(s.score,100);
});
