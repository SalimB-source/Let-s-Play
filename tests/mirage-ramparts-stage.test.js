import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Les panneaux de site, le graffiti « RUSH B », l'oie de Goose et le grillage
// sont peints sur des canvas 2D : un contexte factice suffit au moteur 3D.
const context2d = new Proxy({}, {
  get: (target, key) => (key in target ? target[key] : () => {}),
  set: (target, key, value) => { target[key] = value; return true; },
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  rampartsObstacle, rampartsSiteA, rampartsSiteB, rampartsMidDoors, makeRampartsSkyline,
  bombLedOn, updateBombBlink, BOMB_BEEP_PERIOD, MID_DOORS_ARCH,
  RAMPARTS_SEGMENT_COUNT, RAMPARTS_SEGMENT_LENGTH, RAMPARTS_GATE_INDEX, SITE_A_SIDE, SITE_B_SIDE,
} = await import('../src/games/rampartsStage.js');
const { LANES } = await import('../src/games/mirageRules.js');

const TRACK_EDGE = LANES[LANES.length - 1] + 1.05;
const sizeOf = (object) => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
const segments = () => Array.from({ length: RAMPARTS_SEGMENT_COUNT }, (_, i) => [rampartsSiteA(i), rampartsSiteB(i)]).flat();

test('the Xbox is a tall one-lane obstacle you have to dodge', () => {
  const size = sizeOf(rampartsObstacle('cactus'));
  assert.ok(size.x > 1 && size.x < 1.9, `largeur ${size.x} hors d’une voie`);
  assert.ok(size.y > 1.6 && size.y < 2.3, `hauteur ${size.y} : trop basse pour ne pas se sauter`);
});

test('the Mid low wall spans two lanes and stays jumpable', () => {
  const size = sizeOf(rampartsObstacle('barrier'));
  assert.ok(size.x > 3.8 && size.x <= 4.2, `largeur ${size.x} : doit couvrir deux voies`);
  assert.ok(size.y <= 1, `hauteur ${size.y} : le saut (1,05 m) doit passer au-dessus`);
});

test('site A scenery runs along the right, site B along the left', () => {
  assert.equal(SITE_A_SIDE, 1);
  assert.equal(SITE_B_SIDE, -1);
  const letters = { A: [], B: [] };
  for (const segment of segments()) {
    segment.updateMatrixWorld(true);
    segment.traverse((object) => {
      const letter = object.userData.siteLetter;
      if (letter) letters[letter].push(object.getWorldPosition(new THREE.Vector3()).x);
    });
  }
  assert.ok(letters.A.length >= 1 && letters.B.length >= 1, 'un panneau par site');
  assert.ok(letters.A.every(x => x > TRACK_EDGE), `panneaux A à droite : ${letters.A}`);
  assert.ok(letters.B.every(x => x < -TRACK_EDGE), `panneaux B à gauche : ${letters.B}`);
});

test('each side walks through the famous callouts in order', () => {
  const calloutsA = Array.from({ length: RAMPARTS_SEGMENT_COUNT }, (_, i) => rampartsSiteA(i).userData.callout);
  const calloutsB = Array.from({ length: RAMPARTS_SEGMENT_COUNT }, (_, i) => rampartsSiteB(i).userData.callout);
  assert.deepEqual(calloutsA.slice(1, 9), ['long-doors', 'blue', 'car-pit', 'a-site', 'mid-doors', 'goose', 'catwalk', 'ct-spawn']);
  assert.deepEqual(calloutsB.slice(1, 9), ['upper-tunnels', 'tunnel-holes', 'b-site', 'b-car', 'mid-doors', 'b-window', 'b-doors', 'closet']);
  for (let i = 0; i < RAMPARTS_SEGMENT_COUNT; i += 1) {
    assert.equal(rampartsSiteA(i).userData.site, 'A');
    assert.equal(rampartsSiteB(i).userData.site, 'B');
  }
});

test('a C4 is planted on both bombsites, and only there', () => {
  for (const segment of segments()) {
    const bombs = segment.userData.bombs || [];
    const onSite = segment.userData.callout === 'a-site' || segment.userData.callout === 'b-site';
    assert.equal(bombs.length, onSite ? 1 : 0, `${segment.userData.callout} : ${bombs.length} bombe(s)`);
    for (const bomb of bombs) {
      assert.ok(bomb.led.userData.glow && bomb.halo.userData.glow, 'la LED reste hors du bake pour clignoter');
    }
  }
});

test('the bomb LED flashes briefly once per beep', () => {
  assert.equal(bombLedOn(0), true);
  assert.equal(bombLedOn(BOMB_BEEP_PERIOD / 2), false);
  assert.equal(bombLedOn(BOMB_BEEP_PERIOD * 3 + 0.05), true);
  assert.equal(bombLedOn(-BOMB_BEEP_PERIOD / 2), false, 'les temps négatifs restent dans le cycle');
  let lit = 0;
  for (let t = 0; t < BOMB_BEEP_PERIOD; t += 0.01) lit += bombLedOn(t) ? 1 : 0;
  assert.ok(lit > 5 && lit < 40, `un éclair bref (${lit} échantillons allumés sur 110)`);
});

test('updateBombBlink drives the LED and halo, and holds steady for reduced motion', () => {
  const [bomb] = rampartsSiteA(4).userData.bombs;
  updateBombBlink([bomb], -bomb.offset);
  assert.equal(bomb.halo.visible, true);
  const litColor = bomb.led.material.color.getHex();
  updateBombBlink([bomb], -bomb.offset + BOMB_BEEP_PERIOD / 2);
  assert.equal(bomb.halo.visible, false);
  assert.notEqual(bomb.led.material.color.getHex(), litColor);
  updateBombBlink([bomb], -bomb.offset + BOMB_BEEP_PERIOD / 2, true);
  assert.equal(bomb.halo.visible, true, 'animations réduites : LED fixe, allumée');
  assert.equal(bomb.led.material.color.getHex(), litColor);
  assert.doesNotThrow(() => updateBombBlink(undefined, 1));
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

test('the Mid doors arch clears the lanes, the riders and the camera', () => {
  const gate = rampartsMidDoors();
  gate.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const blocked = (x, y) => {
    raycaster.set(new THREE.Vector3(x, y, gate.position.z + 12), new THREE.Vector3(0, 0, -1));
    return raycaster.intersectObject(gate, true).length > 0;
  };
  // Toute la largeur des voies, jusqu'à 6,5 m : cavaliers, sauts, projectiles.
  for (const x of [-4.1, -3.15, -2, -1.05, 0, 1.05, 2, 3.15, 4.1]) {
    for (const y of [0.1, 1, 2.2, 3.5, 5, 6.5]) assert.equal(blocked(x, y), false, `arche bouchée en x=${x}, y=${y}`);
  }
  // Le couloir de la caméra (7,3 m de haut) passe sous la clé de l'arche.
  for (const x of [-0.6, 0, 0.6]) for (const y of [7.3, 8.2]) assert.equal(blocked(x, y), false, `caméra bloquée en x=${x}, y=${y}`);
  // …et le mur existe bien au-dessus et de part et d'autre de l'arche.
  assert.equal(blocked(0, MID_DOORS_ARCH.top + 0.4), true, 'rempart au-dessus de la clé');
  assert.equal(blocked(-MID_DOORS_ARCH.halfWidth - 1, 2), true, 'rempart côté B');
  assert.equal(blocked(MID_DOORS_ARCH.halfWidth + 1, 2), true, 'rempart côté A');
  // Hors du rempart percé (vérifié ci-dessus), seuls le chaperon et les
  // merlons, tout en haut, passent au-dessus des voies : les vantaux grands
  // ouverts et les pieds-droits restent plaqués hors de la piste.
  let leaves = 0;
  gate.traverse((object) => {
    if (!object.isMesh || object.geometry.type === 'ExtrudeGeometry') return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.max.y > 6 && box.min.y < 0.1 && Math.abs(box.min.x) > TRACK_EDGE) leaves += 1;
    if (box.min.x < TRACK_EDGE && box.max.x > -TRACK_EDGE) {
      assert.ok(box.min.y >= MID_DOORS_ARCH.top, `élément au-dessus des voies trop bas (y min ${box.min.y.toFixed(2)})`);
    }
  });
  assert.ok(leaves >= 2, 'deux vantaux ouverts de part et d’autre');
});

test('segments tile one 110 m loop and the Mid doors close it once', () => {
  for (let i = 0; i < RAMPARTS_SEGMENT_COUNT; i += 1) {
    for (const segment of [rampartsSiteA(i), rampartsSiteB(i)]) {
      assert.equal(segment.position.z, 6 - i * RAMPARTS_SEGMENT_LENGTH);
      assert.equal(segment.userData.speedFactor, 1);
    }
  }
  assert.equal(RAMPARTS_SEGMENT_COUNT * RAMPARTS_SEGMENT_LENGTH, 110, 'boucle alignée sur le recyclage à 110 m du monde');
  const gate = rampartsMidDoors();
  assert.equal(gate.position.z, 6 - RAMPARTS_GATE_INDEX * RAMPARTS_SEGMENT_LENGTH);
  assert.equal(gate.userData.speedFactor, 1);
  assert.equal(gate.userData.callout, 'mid-doors');
});

test('the far skyline stays behind the fog, beyond the ramparts', () => {
  const skyline = makeRampartsSkyline();
  const box = new THREE.Box3().setFromObject(skyline);
  assert.ok(box.max.z < -40, 'horizon lointain');
  assert.ok(!box.isEmpty());
});
