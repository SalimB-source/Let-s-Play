import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Les voitures de police dessinent leur bandeau « POLICE » sur un canvas 2D :
// on fournit le minimum qu'un navigateur donnerait au moteur 3D.
const context2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {},
  closePath() {}, lineTo() {}, moveTo() {}, clearRect() {}, save() {}, restore() {},
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  algerObstacle, policeBeaconPhase, updatePoliceBeacon, POLICE_BEACON_PERIOD,
} = await import('../src/games/algerStage.js');

const sizeOf = (group) => new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());

test('alger tall obstacle is a police car, sized to one lane', () => {
  const car = algerObstacle('cactus');
  const size = sizeOf(car);
  // Une seule voie : la zone de collision du jeu mesure 2 × 0,95 m.
  assert.ok(size.x > 1.4 && size.x < 1.9, `largeur ${size.x} hors d’une voie`);
  assert.ok(size.z > 3, 'la voiture garde une longueur de berline');
  assert.ok(size.y > 1.2 && size.y < 2.2, `hauteur ${size.y} hors de l’échelle des obstacles hauts`);
});

test('the police car carries two blue and two red flashing lamps', () => {
  const beacon = algerObstacle('cactus').userData.beacon;
  assert.ok(beacon, 'la voiture expose son gyrophare');
  assert.equal(beacon.blue.length, 2);
  assert.equal(beacon.red.length, 2);
  assert.ok(beacon.offset >= 0 && beacon.offset < POLICE_BEACON_PERIOD, 'les voitures clignotent en décalé');
});

test('beacon pattern flashes blue, then red, with pauses', () => {
  const states = [];
  for (let t = 0; t < POLICE_BEACON_PERIOD; t += 0.02) states.push(policeBeaconPhase(t));
  assert.ok(states.includes('blue') && states.includes('red'), 'les deux couleurs clignotent');
  assert.ok(states.includes(null), 'le gyrophare marque des pauses');
  const lit = states.filter(Boolean).length / states.length;
  assert.ok(lit > 0.25 && lit < 0.6, `cycle allumé ${lit}`);
  assert.equal(policeBeaconPhase(0.05), 'blue');
  assert.equal(policeBeaconPhase(0.45), 'red');
  assert.equal(policeBeaconPhase(-1.15), 'blue'); // la phase est ramenée dans le cycle
  assert.equal(policeBeaconPhase(1.25), policeBeaconPhase(0.05));
});

test('updatePoliceBeacon switches lamps and honours reduced motion', () => {
  const beacon = algerObstacle('cactus').userData.beacon;
  beacon.offset = 0;
  const OFF = { blue: 0x1a2a3d, red: 0x3d1a17 };
  const color = (lamp) => lamp.material.color.getHex();
  updatePoliceBeacon(beacon, 0.05); // éclair bleu
  assert.equal(color(beacon.blue[0]), color(beacon.blue[1]));
  assert.notEqual(color(beacon.blue[0]), OFF.blue);
  assert.equal(color(beacon.red[0]), OFF.red);
  updatePoliceBeacon(beacon, 0.45); // éclair rouge
  assert.equal(color(beacon.blue[0]), OFF.blue);
  assert.notEqual(color(beacon.red[0]), OFF.red);
  updatePoliceBeacon(beacon, 0.3); // pause : tout s'éteint
  assert.equal(color(beacon.blue[0]), OFF.blue);
  assert.equal(color(beacon.red[0]), OFF.red);
  updatePoliceBeacon(beacon, 0.3, true); // animations réduites : feux fixes
  assert.notEqual(color(beacon.blue[0]), OFF.blue);
  assert.notEqual(color(beacon.red[0]), OFF.red);
});

test('the Alger barrier keeps its two-lane jumpable balustrade', () => {
  const barrier = algerObstacle('barrier');
  const size = sizeOf(barrier);
  assert.ok(size.x > 3.7, 'la balustrade occupe deux voies');
  assert.ok(size.y < 1.1, 'la balustrade reste basse, donc sautable');
  assert.equal(barrier.userData.beacon, undefined, 'pas de gyrophare sur la balustrade');
});
