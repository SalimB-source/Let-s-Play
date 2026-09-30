import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Le drapeau US, la cocarde, les panneaux SONIC BOOM / JET FUEL / HANGAR 2,
// la banderole du portique et le numéro de piste sont peints sur des canvas
// 2D : un contexte factice suffit au moteur 3D.
const context2d = new Proxy({}, {
  get: (target, key) => (key in target ? target[key] : () => {}),
  set: (target, key, value) => { target[key] = value; return true; },
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  airbaseObstacle, airbaseOps, airbaseStands, airbaseGate, makeAirbaseSkyline,
  airbaseBeaconOn, updateAirbaseBeacon, AIRBASE_BEACON_PERIOD, GATE_BEAM_Y,
  AIRBASE_SEGMENT_COUNT, AIRBASE_SEGMENT_LENGTH, AIRBASE_GATE_INDEX, OPS_SIDE, STANDS_SIDE,
  AIRBASE_TRACK_EDGE,
} = await import('../src/games/airbaseStage.js');
const { LANES } = await import('../src/games/mirageRules.js');

const TRACK_EDGE = LANES[LANES.length - 1] + 1.05;
assert.equal(AIRBASE_TRACK_EDGE, TRACK_EDGE);
const sizeOf = (object) => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
const segments = () => Array.from({ length: AIRBASE_SEGMENT_COUNT }, (_, i) => [airbaseOps(i), airbaseStands(i)]).flat();

test('the fuel drums are a tall one-lane obstacle you have to dodge', () => {
  const size = sizeOf(airbaseObstacle('cactus'));
  assert.ok(size.x > 1 && size.x < 1.9, `largeur ${size.x} hors d’une voie`);
  assert.ok(size.y > 1.6 && size.y < 2.3, `hauteur ${size.y} : trop basse pour ne pas se sauter`);
});

test('the runway barrier spans two lanes and stays jumpable', () => {
  const size = sizeOf(airbaseObstacle('barrier'));
  assert.ok(size.x > 3.8 && size.x <= 4.2, `largeur ${size.x} : doit couvrir deux voies`);
  assert.ok(size.y <= 1, `hauteur ${size.y} : le saut (1,05 m) doit passer au-dessus`);
});

test('ops scenery runs along the left, the crowd along the right', () => {
  assert.equal(OPS_SIDE, -1);
  assert.equal(STANDS_SIDE, 1);
  for (let i = 0; i < AIRBASE_SEGMENT_COUNT; i += 1) {
    assert.equal(airbaseOps(i).userData.side, 'ops');
    assert.equal(airbaseStands(i).userData.side, 'stands');
  }
  for (const segment of segments()) {
    const ops = segment.userData.side === 'ops';
    segment.updateMatrixWorld(true);
    segment.traverse((object) => {
      if (!object.isMesh && !object.isSprite) return;
      const box = new THREE.Box3().setFromObject(object);
      if (box.max.y <= 0) return; // dalles de tarmac sous la piste
      if (ops) assert.ok(box.max.x < -TRACK_EDGE, `ops à droite ? x max ${box.max.x.toFixed(2)} (${segment.userData.callout})`);
      else assert.ok(box.min.x > TRACK_EDGE, `public à gauche ? x min ${box.min.x.toFixed(2)} (${segment.userData.callout})`);
    });
  }
});

test('each side walks through the base callouts in order', () => {
  const calloutsOps = Array.from({ length: AIRBASE_SEGMENT_COUNT }, (_, i) => airbaseOps(i).userData.callout);
  const calloutsStands = Array.from({ length: AIRBASE_SEGMENT_COUNT }, (_, i) => airbaseStands(i).userData.callout);
  assert.deepEqual(calloutsOps.slice(1, 9), ['hangar', 'falcon', 'tower', 'fuel', 'gate', 'radar', 'jeep', 'shelter']);
  assert.deepEqual(calloutsStands.slice(1, 9), ['flag', 'stands', 'sonic', 'palms', 'gate', 'stands', 'floodlight', 'truck']);
  assert.equal(calloutsOps[0], 'apron');
  assert.equal(calloutsOps[9], 'apron');
  assert.equal(calloutsStands[0], 'apron');
  assert.equal(calloutsStands[9], 'apron');
});

test('the tower and the jeep carry beacons, excluded from the static bake', () => {
  const tower = airbaseOps(3).userData.airbaseBeacons || [];
  const jeep = airbaseOps(7).userData.airbaseBeacons || [];
  const hangar = airbaseOps(1).userData.airbaseBeacons || [];
  assert.equal(tower.length, 1, 'gyrophare rouge de la tour');
  assert.equal(jeep.length, 1, 'gyrophare orange de la jeep');
  assert.equal(hangar.length, 0, 'pas de gyrophare au hangar');
  for (const beacon of [...tower, ...jeep]) {
    assert.ok(beacon.lamp.userData.glow && beacon.halo.userData.glow, 'la lampe reste hors du bake pour clignoter');
  }
});

test('the beacon flashes briefly once per cycle', () => {
  assert.equal(airbaseBeaconOn(0), true);
  assert.equal(airbaseBeaconOn(AIRBASE_BEACON_PERIOD / 2), false);
  assert.equal(airbaseBeaconOn(AIRBASE_BEACON_PERIOD * 3 + 0.05), true);
  assert.equal(airbaseBeaconOn(-AIRBASE_BEACON_PERIOD / 2), false, 'les temps négatifs restent dans le cycle');
  let lit = 0;
  for (let t = 0; t < AIRBASE_BEACON_PERIOD; t += 0.01) lit += airbaseBeaconOn(t) ? 1 : 0;
  assert.ok(lit > 5 && lit < 40, `un éclair bref (${lit} échantillons allumés sur 140)`);
});

test('updateAirbaseBeacon drives the lamp and halo, and holds steady for reduced motion', () => {
  const [beacon] = airbaseOps(3).userData.airbaseBeacons;
  updateAirbaseBeacon([beacon], -beacon.offset);
  assert.equal(beacon.halo.visible, true);
  const litColor = beacon.lamp.material.color.getHex();
  updateAirbaseBeacon([beacon], -beacon.offset + AIRBASE_BEACON_PERIOD / 2);
  assert.equal(beacon.halo.visible, false);
  assert.notEqual(beacon.lamp.material.color.getHex(), litColor);
  updateAirbaseBeacon([beacon], -beacon.offset + AIRBASE_BEACON_PERIOD / 2, true);
  assert.equal(beacon.halo.visible, true, 'animations réduites : feu fixe, allumé');
  assert.equal(beacon.lamp.material.color.getHex(), litColor);
  assert.doesNotThrow(() => updateAirbaseBeacon(undefined, 1));
});

test('side scenery never rises inside the four lanes', () => {
  for (const segment of segments()) {
    segment.updateMatrixWorld(true);
    segment.traverse((object) => {
      if (!object.isMesh && !object.isSprite) return;
      const box = new THREE.Box3().setFromObject(object);
      const overlapsTrack = box.min.x < TRACK_EDGE && box.max.x > -TRACK_EDGE;
      if (overlapsTrack) {
        assert.ok(box.max.y <= 0, `${segment.userData.callout} : un élément dépasse du sol sur la piste (x ${box.min.x.toFixed(2)}…${box.max.x.toFixed(2)}, y max ${box.max.y.toFixed(2)})`);
      }
    });
  }
});

test('the gate arch clears the lanes, the riders and the camera', () => {
  const gate = airbaseGate();
  gate.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  raycaster.camera = new THREE.PerspectiveCamera(); // le halo (sprite) du gyrophare en a besoin
  const blocked = (x, y) => {
    raycaster.set(new THREE.Vector3(x, y, gate.position.z + 12), new THREE.Vector3(0, 0, -1));
    return raycaster.intersectObject(gate, true).length > 0;
  };
  // Toute la largeur des voies, jusqu'à 6,5 m : cavaliers, sauts, projectiles.
  for (const x of [-4.1, -3.15, -2, -1.05, 0, 1.05, 2, 3.15, 4.1]) {
    for (const y of [0.1, 1, 2.2, 3.5, 5, 6.5]) assert.equal(blocked(x, y), false, `arche bouchée en x=${x}, y=${y}`);
  }
  // Le couloir de la caméra (7,3 m de haut) passe sous la banderole.
  for (const x of [-0.6, 0, 0.6]) assert.equal(blocked(x, 7.3), false, `caméra bloquée en x=${x}`);
  // …et le portique existe bien : banderole, poutre et pylônes.
  assert.equal(blocked(0, GATE_BEAM_Y - 0.85), true, 'banderole THUNDER AIRBASE');
  assert.equal(blocked(0, GATE_BEAM_Y), true, 'poutre du portique');
  assert.equal(blocked(-5.4, 2), true, 'pylône côté ops');
  assert.equal(blocked(5.4, 2), true, 'pylône côté public');
  // Au-dessus des voies, rien ne descend sous le couloir de la caméra.
  let pillars = 0;
  gate.traverse((object) => {
    if (!object.isMesh) return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.max.y > 6 && box.min.y < 0.1 && Math.abs(box.min.x) > TRACK_EDGE) pillars += 1;
    if (box.min.x < TRACK_EDGE && box.max.x > -TRACK_EDGE) {
      assert.ok(box.min.y >= 7.3, `élément au-dessus des voies trop bas (y min ${box.min.y.toFixed(2)})`);
    }
  });
  assert.ok(pillars >= 2, 'deux pylônes treillis de part et d’autre');
});

test('segments tile one 110 m loop and the gate closes it once', () => {
  for (let i = 0; i < AIRBASE_SEGMENT_COUNT; i += 1) {
    for (const segment of [airbaseOps(i), airbaseStands(i)]) {
      assert.equal(segment.position.z, 6 - i * AIRBASE_SEGMENT_LENGTH);
      assert.equal(segment.userData.speedFactor, 1);
    }
  }
  assert.equal(AIRBASE_SEGMENT_COUNT * AIRBASE_SEGMENT_LENGTH, 110, 'boucle alignée sur le recyclage à 110 m du monde');
  const gate = airbaseGate();
  assert.equal(gate.position.z, 6 - AIRBASE_GATE_INDEX * AIRBASE_SEGMENT_LENGTH);
  assert.equal(gate.userData.speedFactor, 1);
  assert.equal(gate.userData.callout, 'gate');
});

test('the far skyline stays behind the fog, beyond the flight line', () => {
  const skyline = makeAirbaseSkyline();
  const box = new THREE.Box3().setFromObject(skyline);
  assert.ok(box.max.z < -40, 'horizon lointain');
  assert.ok(!box.isEmpty());
});
