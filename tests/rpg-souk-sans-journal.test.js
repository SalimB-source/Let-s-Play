import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const souk = readFileSync(new URL('../src/games/RpgSouk.jsx', import.meta.url), 'utf8');

test('le Souk ne présente plus le journal des dernières ouvertures', () => {
  assert.doesNotMatch(souk, /souk-journal-titre|data-souk-journal/);
  assert.match(souk, /souk-quetes-titre/);
  assert.match(souk, /data-souk-cachet/);
  assert.match(souk, /data-souk-semaine/);
});
