import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoalescedSave } from '../src/lib/coalescedSave.js';

test('écrit le premier et le dernier instantané, par compte, sans perdre les résultats', async () => {
  const calls = [];
  let unblock;
  const first = new Promise((resolve) => { unblock = resolve; });
  const save = createCoalescedSave(async (id, state) => {
    calls.push([id, state]);
    if (id === 'a' && state === 1) await first;
    return `saved-${state}`;
  });
  const a1 = save('a', 1);
  const a2 = save('a', 2);
  const a3 = save('a', 3);
  const b = save('b', 4);
  assert.equal(await b, 'saved-4');
  assert.deepEqual(calls, [['a', 1], ['b', 4]]);
  unblock();
  assert.deepEqual(await Promise.all([a1, a2, a3]), ['saved-1', 'saved-3', 'saved-3']);
  assert.deepEqual(calls, [['a', 1], ['b', 4], ['a', 3]]);
});

test('une erreur ne bloque pas les écritures suivantes', async () => {
  const save = createCoalescedSave(async (_, value) => { if (value === 1) throw Error('offline'); return value; });
  const first = save('a', 1);
  const last = save('a', 2);
  assert.deepEqual(await Promise.all([first, last]), [null, 2]);
});
