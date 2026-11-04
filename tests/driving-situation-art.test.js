import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { SCHOOL_SITUATION_SCENES, schoolSituationScene } from '../src/games/schoolSituationArt.js';
const scene=id=>schoolSituationScene({id});
test('all twenty-three exercises have their own semantic preview, not a chapter-level illustration',()=>{
  assert.deepEqual(Object.keys(SCHOOL_SITUATION_SCENES).sort(),DRIVING_EXERCISES.map(e=>e.id).sort());
  const signatures=new Set();
  for(const exercise of DRIVING_EXERCISES){
    const {caption,...content}=scene(exercise.id);assert.ok(caption);assert.ok(content.route.startsWith('M85 '));
    signatures.add(JSON.stringify(content));
  }
  assert.equal(signatures.size,DRIVING_EXERCISES.length);
});
test('signals appear exactly in exercises containing a real signal stage',()=>{
  for(const exercise of DRIVING_EXERCISES) assert.equal(Boolean(scene(exercise.id).signal),exercise.stages.some(s=>Boolean(s.signal)),exercise.id);
  assert.equal(scene('blocked-junction').signal,'green');
  assert.equal(scene('blocked-junction').goal,null);
  assert.equal(scene('blocked-junction').actors[0].kind,'taxi');
});
test('STOP, yield, bump and the actual giratory are distinct and not inferred from chapter',()=>{
  assert.deepEqual(scene('stop').signs,['stop']);assert.deepEqual(scene('fr-stop').signs,['stop']);
  assert.deepEqual(scene('fr-yield').signs,['yield']);assert.deepEqual(scene('fr-giratory').signs,['yield']);
  assert.equal(scene('fr-giratory').layout,'roundabout');assert.equal(scene('fr-giratory').circulation,'counterclockwise');assert.equal(scene('bump').bump,true);
  assert.equal(scene('fr-right').signs,undefined);assert.equal(scene('fr-right').signal,undefined);
  assert.equal(scene('stop').actors,undefined);assert.equal(scene('fr-stop').actors.length,1);
});
test('pedestrian and cyclist have different users and trajectories, never substitute one for the other',()=>{
  const pedestrian=scene('pedestrian-crossing'),cyclist=scene('right-turn-cyclist');
  assert.equal(pedestrian.actors[0].kind,'pedestrian');assert.equal(pedestrian.actors[0].heading,-90);
  assert.equal(pedestrian.zebra,'approach');assert.equal(cyclist.actors[0].kind,'cyclist');
  assert.equal(cyclist.actors[0].heading,0);assert.equal(cyclist.zebra,'exit');
  assert.equal(cyclist.route,scene('right-turn').route);
});
test('opposing traffic, traffic from the right and two-way crossing are represented explicitly',()=>{
  assert.equal(scene('fr-right').actors[0].heading,-90);
  assert.equal(scene('traffic-yield').actors.length,2);
  assert.deepEqual(scene('traffic-yield').actors.map(a=>a.heading),[90,-90]);
  assert.equal(scene('left-turn-oncoming').actors[0].heading,180);
  assert.deepEqual(scene('blocked-lane').actors.map(a=>a.kind),['obstacle','car']);
  assert.equal(scene('blocked-lane').actors[1].heading,180);
});
test('turns and lane changes are not shown as parking; parking entry and exit are opposite actions',()=>{
  assert.equal(scene('right-turn').layout,'junction');assert.equal(scene('lane-change').layout,'lanes');
  assert.equal(scene('lane-change').actors[0].heading,0);
  assert.equal(scene('parking-exit').layout,'parking-exit');assert.deepEqual(scene('parking-exit').player,[85,177]);
  assert.equal(scene('parking-exit').goal[1],126);
  assert.equal(scene('parking-choice').layout,'parking-choice');assert.equal(scene('parking-choice').goal[1],177);
  assert.ok(scene('parking-choice').route.endsWith('H302'),'finish parallel to the curb, not perpendicular');
});
