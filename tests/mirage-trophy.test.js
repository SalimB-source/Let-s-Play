import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFETTI_COLORS,
  PODIUM_HEIGHT,
  TROPHY_HEIGHT,
  TROPHY_MATERIALS,
  VOXEL,
  podiumBoxes,
  trophyBoxes,
} from '../src/games/mirageTrophy.js';

const EPSILON = 1e-9;
const close = (a, b) => Math.abs(a - b) < EPSILON;
const bottom = (box) => box.center[1] - box.size[1] / 2;
const top = (box) => box.center[1] + box.size[1] / 2;

function assertWellFormed(boxes) {
  assert.ok(boxes.length > 0);
  const seen = new Set();
  for (const box of boxes) {
    assert.ok(TROPHY_MATERIALS.includes(box.material), `${box.part}: unknown material ${box.material}`);
    assert.equal(box.size.length, 3);
    assert.equal(box.center.length, 3);
    for (const value of box.size) assert.ok(Number.isFinite(value) && value > 0, `${box.part}: sizes are positive`);
    for (const value of box.center) assert.ok(Number.isFinite(value), `${box.part}: centre is finite`);
    const key = [...box.size, ...box.center].map((value) => value.toFixed(6)).join('|');
    assert.ok(!seen.has(key), `${box.part}: no identical box is added twice`);
    seen.add(key);
  }
  assert.equal(new Set(boxes.map((box) => box.part)).size, boxes.length, 'part names are unique');
}

test('the trophy is made of well-formed voxel boxes', () => {
  assertWellFormed(trophyBoxes());
  assertWellFormed(podiumBoxes());
});

test('the trophy stands on the ground line and reaches its announced height', () => {
  const boxes = trophyBoxes();
  assert.ok(close(Math.min(...boxes.map(bottom)), 0));
  assert.ok(close(Math.max(...boxes.map(top)), TROPHY_HEIGHT));
  assert.ok(TROPHY_HEIGHT > 4 && TROPHY_HEIGHT < 7, 'a trophy sized for the stage');
  assert.ok(close(TROPHY_HEIGHT % VOXEL, 0) || close((TROPHY_HEIGHT % VOXEL) - VOXEL, 0), 'whole voxels');
});

test('the trophy axis is one continuous stack from the foot to the rim — nothing floats', () => {
  const axis = trophyBoxes()
    .filter((box) => close(box.center[0], 0) && close(box.center[2], 0))
    .sort((a, b) => bottom(a) - bottom(b));
  assert.ok(close(bottom(axis[0]), 0));
  for (let index = 1; index < axis.length; index++) {
    assert.ok(close(bottom(axis[index]), top(axis[index - 1])), `${axis[index].part} sits right on ${axis[index - 1].part}`);
  }
  assert.ok(close(top(axis.at(-1)), TROPHY_HEIGHT));
  // La coupe s’évase : jamais plus étroite qu’au-dessous, jusqu’au rebord.
  const bowl = axis.filter((box) => box.part.startsWith('bowl-') || box.part === 'rim');
  for (let index = 1; index < bowl.length; index++) {
    assert.ok(bowl[index].size[0] >= bowl[index - 1].size[0] - EPSILON, `${bowl[index].part} is not narrower than the layer below`);
  }
});

test('the trophy is mirror-symmetric: two handles, and a diamond on the front AND the back', () => {
  const boxes = trophyBoxes();
  const twin = (box, axis) => boxes.find((other) => {
    const mirrored = [...box.center];
    mirrored[axis] = -mirrored[axis];
    return other !== box
      && other.material === box.material
      && other.size.every((value, index) => close(value, box.size[index]))
      && other.center.every((value, index) => close(value, mirrored[index]));
  });
  for (const box of boxes) {
    if (!close(box.center[0], 0)) assert.ok(twin(box, 0), `${box.part} has a left/right twin`);
    if (!close(box.center[2], 0)) assert.ok(twin(box, 2), `${box.part} has a front/back twin`);
  }
  const handles = boxes.filter((box) => box.part.startsWith('handle-bar'));
  assert.equal(handles.length, 2);
  const gems = boxes.filter((box) => box.material === 'gem');
  assert.equal(gems.length, 10, 'two diamonds of five rows');
  assert.equal(gems.filter((box) => box.center[2] > 0).length, 5);
  assert.equal(gems.filter((box) => box.center[2] < 0).length, 5);
});

test('each diamond is a 1-3-5-3-1 lozenge resting on the straight part of the bowl', () => {
  const boxes = trophyBoxes();
  const bowl = boxes.filter((box) => box.part.startsWith('bowl-'));
  const widest = Math.max(...bowl.map((box) => box.size[0]));
  const front = boxes.filter((box) => box.material === 'gem' && box.center[2] > 0).sort((a, b) => bottom(a) - bottom(b));
  assert.deepEqual(front.map((box) => Math.round(box.size[0] / VOXEL)), [1, 3, 5, 3, 1]);
  for (const box of front) {
    assert.ok(close(box.center[2] - box.size[2] / 2, widest / 2), 'the relief starts exactly on the bowl wall');
    const layer = bowl.find((candidate) => bottom(candidate) <= box.center[1] && top(candidate) > box.center[1]);
    assert.ok(layer && close(layer.size[0], widest), 'it sits on a full-width layer');
  }
  // …et il passe sous le rebord, sans le traverser.
  const rim = boxes.find((box) => box.part === 'rim');
  assert.ok(top(front.at(-1)) <= bottom(rim) + EPSILON);
});

test('handles touch the bowl wall and stay within a sensible width', () => {
  const boxes = trophyBoxes();
  const bowlHalf = Math.max(...boxes.filter((box) => box.part.startsWith('bowl-')).map((box) => box.size[0])) / 2;
  const right = boxes.filter((box) => box.part.startsWith('handle-') && box.center[0] > 0);
  assert.equal(right.length, 3);
  const inner = Math.min(...right.map((box) => box.center[0] - box.size[0] / 2));
  const outer = Math.max(...right.map((box) => box.center[0] + box.size[0] / 2));
  assert.ok(close(inner, bowlHalf), 'the handle starts on the bowl wall');
  assert.ok(outer > bowlHalf + VOXEL && outer < bowlHalf + 4 * VOXEL, 'and sticks out by a few voxels');
  const rim = boxes.find((box) => box.part === 'rim');
  assert.ok(Math.max(...right.map(top)) <= top(rim) + EPSILON, 'never above the rim');
});

test('the podium carries the trophy and shows a golden “1” on its front face', () => {
  const boxes = podiumBoxes();
  assert.ok(close(Math.min(...boxes.map(bottom)), 0), 'the podium rests on the floor');
  const cap = boxes.find((box) => box.part === 'podium-cap');
  assert.ok(close(top(cap), PODIUM_HEIGHT), 'the trophy starts where the podium ends');
  const middle = boxes.find((box) => box.part === 'podium-middle');
  const one = boxes.filter((box) => box.part.startsWith('one-'));
  assert.equal(one.length, 8, 'a “1” drawn with eight voxels');
  for (const box of one) {
    assert.ok(box.center[2] > middle.size[2] / 2, `${box.part} sits on the front face`);
    assert.ok(box.center[2] - box.size[2] / 2 <= middle.size[2] / 2 + EPSILON, 'flush with the wall');
    assert.ok(bottom(box) >= bottom(middle) && top(box) <= top(middle), 'inside the height of the middle step');
    assert.ok(Math.abs(box.center[0]) < middle.size[0] / 2, 'inside its width');
  }
  // La pierre se rétrécit en montant : la base déborde du plateau.
  const base = boxes.find((box) => box.part === 'podium-base');
  assert.ok(base.size[0] > middle.size[0] && middle.size[0] > cap.size[0]);
});

test('confetti use distinct colours, starting with the gold of the trophy', () => {
  assert.ok(CONFETTI_COLORS.length >= 4);
  assert.equal(new Set(CONFETTI_COLORS).size, CONFETTI_COLORS.length);
  for (const color of CONFETTI_COLORS) assert.ok(Number.isInteger(color) && color >= 0 && color <= 0xffffff);
  assert.equal(CONFETTI_COLORS[0], 0xffd15c);
});
