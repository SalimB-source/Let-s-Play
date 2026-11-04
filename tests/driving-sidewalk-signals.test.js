import test from 'node:test';
import assert from 'node:assert/strict';
import { sidewalkSignalFor, indexTrafficSignalLenses } from '../src/games/drivingSidewalkSignals.js';
import { viceCityTrafficSignalState } from '../src/games/viceCityTraffic.js';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { isExerciseSignal } from '../src/games/drivingTeachingGlow.js';
test('roadside repeaters sit on the pavement at the same stop line and face the same approach', () => {
  for (const spec of [
    {axis:'x',x:82,z:102.35,supportX:82,supportZ:108.2,yaw:-Math.PI/2,ix:1,iz:1},
    {axis:'x',x:118,z:97.65,supportX:118,supportZ:91.8,yaw:Math.PI/2,ix:1,iz:1},
    {axis:'z',x:97.65,z:82,supportX:91.8,supportZ:82,yaw:Math.PI,ix:1,iz:1},
    {axis:'z',x:102.35,z:118,supportX:108.2,supportZ:118,yaw:0,ix:1,iz:1},
  ]) {
    const curb=sidewalkSignalFor(spec), across=spec.axis==='x'?'z':'x';
    assert.equal(curb[spec.axis],spec[spec.axis]);
    assert.ok(Math.abs(curb[across]-100)>7,'mast must stay outside the carriageway');
    assert.equal(curb.yaw,spec.yaw);assert.equal(curb.sidewalk,true);
    for(let time=0;time<70;time+=.5) assert.equal(viceCityTrafficSignalState(curb.axis,curb.ix,curb.iz,time),viceCityTrafficSignalState(spec.axis,spec.ix,spec.iz,time));
  }
});
test('all lamps have unique indices even when roadside and overhead heads were built interleaved', () => {
  const roadside=[{},{},{},{}], overhead=[{},{},{},{}];
  indexTrafficSignalLenses(roadside,overhead);
  const indices=[...roadside,...overhead].flatMap(s=>Object.values(s.lensIndices));
  assert.equal(new Set(indices).size,24);
  assert.deepEqual(indices,Array.from({length:24},(_,i)=>i));
  assert.equal(overhead[0].lensIndices.red,12);
});
test('each exercise signal can highlight its corresponding sidewalk repeater, but not the opposite approach', () => {
  for(const exercise of DRIVING_EXERCISES) for(const stage of exercise.stages) {
    if(!stage.signal)continue;
    const {axis,ix,iz}=stage.signal, center=(axis==='x'?ix:iz)*100;
    const direction=Math.sign(stage[axis]-center);
    const spec={axis,ix,iz,yaw:0,supportX:ix*100+(axis==='x'?direction*18:direction*8.2),supportZ:iz*100+(axis==='z'?direction*18:-direction*8.2)};
    const curb=sidewalkSignalFor(spec);
    assert.equal(isExerciseSignal(exercise,curb),true,exercise.id);
    assert.equal(isExerciseSignal({...exercise,teachingAssistance:'autonomous'},curb),false);
  }
});
