import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx',import.meta.url),'utf8');
test('free driving has no exit/entry state or player walking branch',()=>{
  assert.doesNotMatch(source,/isOnFoot|walkState|pendingEntry|getNearestEnterableVehicle|movePedestrianWithSlide|setIsOnFoot/);
  assert.doesNotMatch(source,/const pedestrian = makeFreeRoamPedestrian/);
});
test('weapon keys, mouse firing, reticle and projectile simulation are physically removed',()=>{
  assert.doesNotMatch(source,/KeyE|KeyZ|MouseLeft|fireShot|updateShots|const shots|shotCooldown|crosshairRef|mouseAimRef/);
  assert.doesNotMatch(source,/audioRef\.current\?\.gunshot|breakVehicleGlass|glassImpactRaycaster/);
  assert.ok(source.includes("mount.addEventListener('pointerdown', activateAudio)"));
});
test('touch controls and help describe only available vehicle actions',()=>{
  assert.doesNotMatch(source,/data-action="(?:shoot|foot-shoot|interact|turn-back)"|TIRER|SORTIR|ENTRER \/ SORTIR|Marcher, tirer/);
  assert.ok(source.includes("'Accélérer', 'accelerate'"));assert.ok(source.includes("'Freiner', 'brake'"));
  assert.ok(source.includes('data-action="jump"'));assert.ok(source.includes('Commandes de conduite'));
});
test('road-code pedestrians and cyclists remain present but unarmed',()=>{
  assert.ok(source.includes("actor.type === 'pedestrian' ? makeFreeRoamPedestrian()"));
  assert.ok(source.includes('createSchoolCyclist(makeFreeRoamPedestrian())'));
  assert.ok(source.includes('animateSchoolPedestrian(person, pose)'));assert.ok(source.includes('animateSchoolCyclist(cyclist,'));
  assert.doesNotMatch(source,/const pistol|muzzleFlash|muzzleMaterial|pistolGrip/);
});
test('garage, activities, sound, cockpit, menu and driving dynamics are retained',()=>{
  for(const feature of ['garageActionRef.current =','challengeActionRef.current =','toggleSound','toggleCamera','onClick={onExit}','viceCityFreeDriveSpeedStep(drivingSchoolVehicleTuning(','drivingSchoolYawRate(viceCityFreeDriveYawRate(']) assert.ok(source.includes(feature),feature);
  assert.ok(source.includes("['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'Space']"));
});
test('cyclist construction accepts the unarmed road-user model',async()=>{
  const THREE=await import('three');const {createSchoolCyclist}=await import('../src/games/drivingSchoolCyclist.js');
  const person={group:new THREE.Group(),legs:[new THREE.Group(),new THREE.Group()],arms:[new THREE.Group(),new THREE.Group()]};
  const cyclist=createSchoolCyclist(person);assert.equal(cyclist.person,person);assert.equal(cyclist.wheels.length,2);assert.ok(cyclist.group.children.includes(person.group));
});
