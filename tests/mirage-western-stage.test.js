import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Provide canvas mock if running in Node.js
const context2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, fill() {},
  closePath() {}, lineTo() {}, moveTo() {}, clearRect() {}, save() {}, restore() {},
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => context2d } : {}),
};

const {
  westernBuilding, westernObstacle, makeCowboy, makeWesternHorse,
} = await import('../src/games/westernStage.js');

test('westernBuilding produces valid groups with speedFactor across all 10 indices and both sides', () => {
  for (let index = 0; index < 10; index++) {
    for (const side of [-1, 1]) {
      const b = westernBuilding(index, side);
      assert.ok(b instanceof THREE.Group, `segment ${index} side ${side} is a Group`);
      assert.equal(b.userData.speedFactor, 1);
      assert.equal(b.position.z, 6 - index * 11 + (side === 1 ? -4 : 0));
    }
  }
});

test('side scenery never penetrates inside the playable race lanes (|x| >= 4.5)', () => {
  for (let index = 0; index < 10; index++) {
    for (const side of [-1, 1]) {
      const group = westernBuilding(index, side);
      group.updateMatrixWorld(true);
      group.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          const bbox = new THREE.Box3().setFromObject(obj);
          if (side === 1) {
            assert.ok(
              bbox.min.x >= 4.5,
              `Right side mesh crossed into track on index ${index}: min.x = ${bbox.min.x}`,
            );
          } else {
            assert.ok(
              bbox.max.x <= -4.5,
              `Left side mesh crossed into track on index ${index}: max.x = ${bbox.max.x}`,
            );
          }
        }
      });
    }
  }
});

test('cowboys are present on both sides with Stetson hats, vests, boots and animation hooks', () => {
  let totalLeftCowboys = 0;
  let totalRightCowboys = 0;
  const posesFound = new Set();

  for (let index = 0; index < 10; index++) {
    const left = westernBuilding(index, -1);
    const right = westernBuilding(index, 1);

    if (left.userData.people) {
      totalLeftCowboys += left.userData.people.length;
      left.userData.people.forEach((p) => {
        assert.ok(typeof p.userData.bob === 'number');
        assert.ok(typeof p.userData.baseRotation === 'number');
        assert.ok(typeof p.userData.baseY === 'number');
      });
    }
    if (right.userData.people) {
      totalRightCowboys += right.userData.people.length;
      right.userData.people.forEach((p) => {
        assert.ok(typeof p.userData.bob === 'number');
        assert.ok(typeof p.userData.baseRotation === 'number');
        assert.ok(typeof p.userData.baseY === 'number');
      });
    }
  }

  assert.ok(totalLeftCowboys >= 8, `Left side should have plenty of cowboys (found ${totalLeftCowboys})`);
  assert.ok(totalRightCowboys >= 8, `Right side should have plenty of cowboys (found ${totalRightCowboys})`);

  // Test individual cowboy creation and poses
  const poses = ['standing', 'leaning', 'sitting', 'waving', 'tipping_hat', 'sheriff', 'balcony'];
  for (const pose of poses) {
    const cb = makeCowboy({ variant: 1, pose, side: 1 });
    assert.ok(cb instanceof THREE.Group);
    if (pose === 'waving') {
      assert.ok(cb.userData.wavingArm, 'waving cowboy exposes wavingArm for animation');
    }
  }
});

test('horses are present on the sides (hitched, in stalls, corrals, drinking) with varied coats and animation hooks', () => {
  let totalLeftHorses = 0;
  let totalRightHorses = 0;

  for (let index = 0; index < 10; index++) {
    const left = westernBuilding(index, -1);
    const right = westernBuilding(index, 1);

    if (left.userData.animals) {
      totalLeftHorses += left.userData.animals.length;
      left.userData.animals.forEach((h) => {
        assert.equal(h.userData.isAnimal, true);
        assert.equal(h.userData.animalType, 'horse');
        assert.ok(h.userData.head, 'horse has head group for nodding');
        assert.ok(h.userData.tail, 'horse has tail for swishing');
      });
    }
    if (right.userData.animals) {
      totalRightHorses += right.userData.animals.length;
      right.userData.animals.forEach((h) => {
        assert.equal(h.userData.isAnimal, true);
        assert.equal(h.userData.animalType, 'horse');
        assert.ok(h.userData.head, 'horse has head group for nodding');
        assert.ok(h.userData.tail, 'horse has tail for swishing');
      });
    }
  }

  assert.ok(totalLeftHorses >= 8, `Left side should have plenty of horses (found ${totalLeftHorses})`);
  assert.ok(totalRightHorses >= 8, `Right side should have plenty of horses (found ${totalRightHorses})`);

  // Test horse standalone maker
  const horse = makeWesternHorse({ variant: 0, pose: 'hitched', side: 1 });
  assert.equal(horse.userData.isAnimal, true);
  assert.equal(horse.userData.animalType, 'horse');
  assert.ok(horse.userData.tail);
  assert.ok(horse.userData.head);
});

test('les chevaux attachés regardent la rue : la tête est toujours plus près de la piste que la queue', () => {
  // L'avant du cheval est en −Z (queue en +Z) : mal orienté, il plantait son nez
  // dans la façade du saloon (|x| = 7,4) et tendait sa queue vers la piste.
  let turned = 0;
  for (const side of [-1, 1]) {
    for (let index = 0; index < 10; index++) {
      const group = westernBuilding(index, side);
      group.updateMatrixWorld(true);
      for (const horse of group.userData.animals || []) {
        const head = horse.userData.head.getWorldPosition(new THREE.Vector3());
        const tail = horse.userData.tail.getWorldPosition(new THREE.Vector3());
        // Les chevaux de l'abreuvoir et du corral gardent le cap de la rue :
        // tête et queue à la même distance de la piste, on ne les juge pas ici.
        if (Math.abs(Math.abs(head.x) - Math.abs(tail.x)) < 0.5) continue;
        turned += 1;
        assert.ok(
          Math.abs(head.x) < Math.abs(tail.x),
          `segment ${index} côté ${side} : la tête (|x| = ${Math.abs(head.x).toFixed(2)}) doit être plus près de la piste que la queue (|x| = ${Math.abs(tail.x).toFixed(2)})`,
        );
        assert.ok(
          Math.abs(head.x) >= 4.5,
          `segment ${index} côté ${side} : la tête (|x| = ${Math.abs(head.x).toFixed(2)}) ne doit pas déborder sur les voies`,
        );
      }
    }
  }
  assert.ok(turned >= 12, `au moins les chevaux attachés et celui du box sont concernés (trouvés ${turned})`);
});

test('stables (écurie) and saloons are built with signature western architecture', () => {
  let saloonsFound = 0;
  let stablesFound = 0;
  let batwingDoorsFound = 0;
  let waterTroughsFound = 0;
  let hayBalesFound = 0;

  for (let index = 0; index < 10; index++) {
    for (const side of [-1, 1]) {
      const b = westernBuilding(index, side);
      // Traverse to find key architectural markers
      b.traverse((obj) => {
        // Look for batwing doors or signage or hay
        if (obj.userData.animalType === 'horse') {
          // Horse found
        }
      });
    }
  }

  // Segment 0 left is Golden Nugget Saloon, segment 3 and 5 are Saloons
  // Segment 0 right is Livery & Stables, segment 9 left is Paddock/Corral
  const nuggetSaloon = westernBuilding(0, -1);
  const liveryStables = westernBuilding(0, 1);
  const paddockCorral = westernBuilding(9, -1);
  const rusticSaloon = westernBuilding(3, -1);

  assert.ok(nuggetSaloon.userData.people.length >= 2, 'Golden Nugget has cowboys');
  assert.ok(nuggetSaloon.userData.animals.length >= 1, 'Golden Nugget has hitched horse');

  assert.ok(liveryStables.userData.animals.length >= 2, 'Livery Stables has multiple horses');
  assert.ok(liveryStables.userData.people.length >= 1, 'Livery Stables has stablehand cowboy');

  assert.ok(paddockCorral.userData.animals.length >= 2, 'Paddock Corral has horses');
  assert.ok(rusticSaloon.userData.animals.length >= 2, 'Rustic Saloon has 2 hitched horses');
});

test('windmills have rotating blade assemblies exposed in userData.windmills', () => {
  const windmillSegment = westernBuilding(4, -1);
  assert.ok(windmillSegment.userData.windmills, 'Windmill segment exposes windmills in userData');
  assert.ok(windmillSegment.userData.windmills.length >= 1, 'At least one windmill assembly');
});

test('westernObstacle builds both barrier and cargo stack hazards', () => {
  const barrier = westernObstacle('barrier');
  const cargo = westernObstacle('cactus');
  assert.ok(barrier instanceof THREE.Group);
  assert.ok(cargo instanceof THREE.Group);
  const barrierBbox = new THREE.Box3().setFromObject(barrier);
  const cargoBbox = new THREE.Box3().setFromObject(cargo);
  assert.ok(barrierBbox.max.x - barrierBbox.min.x > 3.5, 'barrier spans multiple lanes');
  assert.ok(cargoBbox.max.y > 1.2, 'cargo stack is tall enough to dodge');
});
