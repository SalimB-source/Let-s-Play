import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Les cloisons shōji kumiko et les bannières « 無限 » sont peintes sur canvas 2D.
const gradient = { addColorStop() {} };
const context2d = new Proxy({ createRadialGradient: () => gradient }, {
  get: (target, key) => (key in target ? target[key] : () => {}),
  set: (target, key, value) => { target[key] = value; return true; },
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  infinityObstacle, infinityLeftWing, infinityRightWing, infinityBridgeGate, makeInfinityHorizon,
  biwaPulseOn, updateInfinityLanterns, BIWA_PULSE_PERIOD, INFINITY_ARCH,
  INFINITY_SEGMENT_COUNT, INFINITY_SEGMENT_LENGTH, INFINITY_GATE_INDEX, LEFT_WING_SIDE, RIGHT_WING_SIDE,
} = await import('../src/games/infinityStage.js');
const { LANES } = await import('../src/games/mirageRules.js');

const TRACK_EDGE = LANES[LANES.length - 1] + 1.05;
const sizeOf = (object) => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
const segments = () => Array.from({ length: INFINITY_SEGMENT_COUNT }, (_, i) => [infinityLeftWing(i), infinityRightWing(i)]).flat();

test('the Andon shōji pillar is a tall one-lane obstacle you have to dodge', () => {
  const size = sizeOf(infinityObstacle('cactus'));
  assert.ok(size.x > 1 && size.x < 1.9, `largeur ${size.x} hors d’une voie`);
  assert.ok(size.y > 1.6 && size.y < 2.3, `hauteur ${size.y} : trop basse pour ne pas se sauter`);
});

test('the low shōji engawa screen spans two lanes and stays jumpable', () => {
  const size = sizeOf(infinityObstacle('barrier'));
  assert.ok(size.x > 3.8 && size.x <= 4.2, `largeur ${size.x} : doit couvrir deux voies`);
  assert.ok(size.y <= 1, `hauteur ${size.y} : le saut (1,05 m) doit passer au-dessus`);
});

test('left and right wings frame the bridge with iconic Infinity Castle sectors and Nakime’s biwa', () => {
  assert.equal(LEFT_WING_SIDE, -1);
  assert.equal(RIGHT_WING_SIDE, 1);
  const calloutsLeft = Array.from({ length: INFINITY_SEGMENT_COUNT }, (_, i) => infinityLeftWing(i).userData.callout);
  const calloutsRight = Array.from({ length: INFINITY_SEGMENT_COUNT }, (_, i) => infinityRightWing(i).userData.callout);
  assert.deepEqual(calloutsLeft, [
    'shoji-galleries', 'biwa-dais', 'floating-stairs', 'inverted-pagoda', 'upper-moon-hall',
    'infinity-bridge', 'sideways-pavilion', 'lantern-atrium', 'shifting-fusuma', 'abyss-keep',
  ]);
  assert.deepEqual(calloutsRight, [
    'shoji-galleries', 'tatami-alcove', 'floating-stairs', 'inverted-pagoda', 'upper-moon-hall',
    'infinity-bridge', 'sideways-pavilion', 'lantern-atrium', 'shifting-fusuma', 'abyss-keep',
  ]);

  let biwaCount = 0;
  const scrollPositions = { left: [], right: [] };
  for (const segment of segments()) {
    segment.updateMatrixWorld(true);
    segment.traverse((object) => {
      if (object.userData.isBiwa) biwaCount += 1;
      if (object.userData.kanji) {
        const pos = object.getWorldPosition(new THREE.Vector3());
        scrollPositions[segment.userData.wing].push(pos.x);
      }
    });
  }
  assert.equal(biwaCount, 1, 'le biwa de Nakime trône sur son estrade');
  assert.ok(scrollPositions.left.every((x) => x < -TRACK_EDGE), 'bannières gauches hors-piste');
  assert.ok(scrollPositions.right.every((x) => x > TRACK_EDGE), 'bannières droites hors-piste');
});

test('floating lanterns pulse on each biwa resonance and stay outside the bake', () => {
  assert.equal(biwaPulseOn(0), true);
  assert.equal(biwaPulseOn(BIWA_PULSE_PERIOD / 2), false);
  assert.equal(biwaPulseOn(-BIWA_PULSE_PERIOD / 2), false);

  const [lantern] = infinityLeftWing(0).userData.lanterns;
  assert.ok(lantern.holder.userData.glow && lantern.core.userData.glow, 'gardée hors du bake');
  updateInfinityLanterns([lantern], -lantern.offset);
  const pulseColor = lantern.core.material.color.getHex();
  updateInfinityLanterns([lantern], -lantern.offset + BIWA_PULSE_PERIOD / 2);
  const calmColor = lantern.core.material.color.getHex();
  assert.notEqual(pulseColor, calmColor, 'la lanterne change de teinte au coup de biwa');

  updateInfinityLanterns([lantern], 0.7, true);
  assert.equal(lantern.holder.position.y, lantern.baseY, 'animations réduites : hauteur fixe');
  assert.equal(lantern.core.material.color.getHex(), calmColor, 'animations réduites : lueur ambrée fixe');
  assert.doesNotThrow(() => updateInfinityLanterns(undefined, 1));
});

test('side scenery never rises inside the four lanes', () => {
  for (const segment of segments()) {
    segment.updateMatrixWorld(true);
    segment.traverse((object) => {
      if (!object.isMesh && !object.isSprite) return;
      const box = new THREE.Box3().setFromObject(object);
      const overlapsTrack = box.min.x < TRACK_EDGE && box.max.x > -TRACK_EDGE;
      if (overlapsTrack) {
        assert.ok(
          box.max.y <= 0,
          `${segment.userData.callout} (${segment.userData.wing}) : un élément dépasse sur la piste (x ${box.min.x.toFixed(2)}…${box.max.x.toFixed(2)}, y max ${box.max.y.toFixed(2)})`,
        );
      }
    });
  }
});

test('the Infinity Bridge arch clears the lanes, the riders and the camera', () => {
  const gate = infinityBridgeGate();
  gate.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const blocked = (x, y) => {
    raycaster.set(new THREE.Vector3(x, y, gate.position.z + 12), new THREE.Vector3(0, 0, -1));
    return raycaster.intersectObject(gate, true).length > 0;
  };
  for (const x of [-4.1, -3.15, -2, -1.05, 0, 1.05, 2, 3.15, 4.1]) {
    for (const y of [0.1, 1, 2.2, 3.5, 5, 6.5]) {
      assert.equal(blocked(x, y), false, `arche bouchée en x=${x}, y=${y}`);
    }
  }
  for (const x of [-0.6, 0, 0.6]) {
    for (const y of [7.3, 8.2]) {
      assert.equal(blocked(x, y), false, `caméra bloquée en x=${x}, y=${y}`);
    }
  }
  assert.equal(blocked(0, INFINITY_ARCH.top + 0.4), true, 'pont inversé au-dessus de la clé');
  assert.equal(blocked(-INFINITY_ARCH.halfWidth - 1, 2), true, 'pilier gauche');
  assert.equal(blocked(INFINITY_ARCH.halfWidth + 1, 2), true, 'pilier droit');

  gate.traverse((object) => {
    if (!object.isMesh || object.geometry.type === 'ExtrudeGeometry') return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.min.x < TRACK_EDGE && box.max.x > -TRACK_EDGE) {
      assert.ok(
        box.min.y >= INFINITY_ARCH.top,
        `élément au-dessus des voies trop bas (y min ${box.min.y.toFixed(2)})`,
      );
    }
  });
});

test('segments tile one 110 m loop and the distant horizon stays beyond the fog', () => {
  for (let i = 0; i < INFINITY_SEGMENT_COUNT; i += 1) {
    for (const segment of [infinityLeftWing(i), infinityRightWing(i)]) {
      assert.equal(segment.position.z, 6 - i * INFINITY_SEGMENT_LENGTH);
      assert.equal(segment.userData.speedFactor, 1);
    }
  }
  assert.equal(INFINITY_SEGMENT_COUNT * INFINITY_SEGMENT_LENGTH, 110);
  const gate = infinityBridgeGate();
  assert.equal(gate.position.z, 6 - INFINITY_GATE_INDEX * INFINITY_SEGMENT_LENGTH);
  assert.equal(gate.userData.speedFactor, 1);
  assert.equal(gate.userData.callout, 'infinity-bridge');

  const horizon = makeInfinityHorizon();
  const box = new THREE.Box3().setFromObject(horizon);
  assert.ok(box.max.z < -40, 'horizon lointain');
  assert.ok(!box.isEmpty());
});
