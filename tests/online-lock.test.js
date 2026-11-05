import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/sablier-duel.js';
import { isOnlineModeEnabled } from '../src/lib/onlineMode.js';
import { roomAction, localRoomAction, subscribeRoomUpdates } from '../src/games/mirageRooms.js';

function response() {
  return { headers: {}, statusCode: 0, body: '', status(code) { this.statusCode = code; return this; }, setHeader(k,v) { this.headers[k.toLowerCase()] = v; return this; }, end(body = '') { this.body = body; return this; } };
}

test('drapeaux client absents, faux et true explicite', () => {
  const old = process.env.VITE_ONLINE_MODE_ENABLED;
  try {
    delete process.env.VITE_ONLINE_MODE_ENABLED;
    assert.equal(isOnlineModeEnabled(), false);
    process.env.VITE_ONLINE_MODE_ENABLED = 'false';
    assert.equal(isOnlineModeEnabled(), false);
    process.env.VITE_ONLINE_MODE_ENABLED = 'true';
    assert.equal(isOnlineModeEnabled(), true);
  } finally { if (old === undefined) delete process.env.VITE_ONLINE_MODE_ENABLED; else process.env.VITE_ONLINE_MODE_ENABLED = old; }
});

test('API refuse les requêtes lorsque le serveur est verrouillé même si le client est activé', async () => {
  const old = process.env.ONLINE_MODE_ENABLED;
  const client = process.env.VITE_ONLINE_MODE_ENABLED;
  try {
    process.env.VITE_ONLINE_MODE_ENABLED = 'true';
    for (const value of [undefined, 'false']) {
      if (value === undefined) delete process.env.ONLINE_MODE_ENABLED; else process.env.ONLINE_MODE_ENABLED = value;
      const res = response();
      await handler({ method: 'POST', body: { action: 'ouvrir' } }, res);
      assert.equal(res.statusCode, 503);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.deepEqual(JSON.parse(res.body), { ok: false, raison: 'mode-en-ligne-bientot-disponible' });
    }
    process.env.ONLINE_MODE_ENABLED = 'true';
    const options = response();
    await handler({ method: 'OPTIONS' }, options);
    assert.equal(options.statusCode, 204);
  } finally {
    if (old === undefined) delete process.env.ONLINE_MODE_ENABLED; else process.env.ONLINE_MODE_ENABLED = old;
    if (client === undefined) delete process.env.VITE_ONLINE_MODE_ENABLED; else process.env.VITE_ONLINE_MODE_ENABLED = client;
  }
});

test('salons verrouillés : aucune action ni abonnement', async () => {
  const old = process.env.VITE_ONLINE_MODE_ENABLED;
  delete process.env.VITE_ONLINE_MODE_ENABLED;
  try {
    assert.throws(() => localRoomAction('create'), /mode-en-ligne-bientot-disponible/);
    await assert.rejects(roomAction('create'), /mode-en-ligne-bientot-disponible/);
    assert.deepEqual((await roomAction('list')).rooms, []);
    let called = false;
    const unsubscribe = subscribeRoomUpdates(() => { called = true; });
    unsubscribe();
    assert.equal(called, false);
  } finally { if (old !== undefined) process.env.VITE_ONLINE_MODE_ENABLED = old; }
});
