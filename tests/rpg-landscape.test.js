import test from 'node:test';
import assert from 'node:assert/strict';
import { createRpgLandscapeSession } from '../src/games/rpgLandscape.js';

function environment({ mobile = true, supported = true } = {}) {
  const calls = [];
  const doc = { fullscreenElement: null };
  doc.documentElement = { requestFullscreen: async () => { calls.push('fullscreen'); doc.fullscreenElement = doc.documentElement; } };
  doc.exitFullscreen = async () => { calls.push('exit'); doc.fullscreenElement = null; };
  const win = {
    innerWidth: 844,
    matchMedia: () => ({ matches: mobile }),
    screen: { orientation: {
      lock: async (mode) => { calls.push(mode); if (!supported) throw new Error('unavailable'); },
      unlock: () => calls.push('unlock'),
    } },
  };
  return { calls, win, doc };
}

test('mobile requests fullscreen and landscape; leaving releases only owned resources', async () => {
  const e = environment();
  const s = createRpgLandscapeSession(e.win, e.doc);
  await s.enter();
  s.leave();
  assert.deepEqual(e.calls, ['fullscreen', 'landscape', 'unlock', 'exit']);
});
test('desktop does not request fullscreen or orientation', async () => {
  const e = environment({ mobile: false });
  const s = createRpgLandscapeSession(e.win, e.doc);
  await s.enter(); s.leave();
  assert.deepEqual(e.calls, []);
});
test('unsupported orientation/fullscreen does not reject (rotate prompt fallback)', async () => {
  const e = environment({ supported: false });
  e.doc.documentElement.requestFullscreen = undefined;
  const s = createRpgLandscapeSession(e.win, e.doc);
  await assert.doesNotReject(s.enter());
  s.leave();
  assert.deepEqual(e.calls, ['landscape']);
});
test('existing fullscreen is not closed by the duel', async () => {
  const e = environment();
  e.doc.fullscreenElement = {};
  const s = createRpgLandscapeSession(e.win, e.doc);
  await s.enter(); s.leave();
  assert.deepEqual(e.calls, ['landscape', 'unlock']);
});
test('late fullscreen completion cannot lock orientation after leaving', async () => {
  const e = environment();
  let resolve;
  e.doc.documentElement.requestFullscreen = () => new Promise(done => { resolve = () => { e.doc.fullscreenElement = e.doc.documentElement; done(); }; });
  const s = createRpgLandscapeSession(e.win, e.doc);
  const pending = s.enter();
  s.leave(); resolve(); await pending;
  assert.deepEqual(e.calls, ['exit']);
});
test('late orientation completion is unlocked after leaving', async () => {
  const e = environment();
  let resolve;
  e.win.screen.orientation.lock = () => new Promise(done => { resolve = done; });
  const s = createRpgLandscapeSession(e.win, e.doc);
  const pending = s.enter({ fullscreen: false });
  s.leave(); resolve(); await pending;
  assert.deepEqual(e.calls, ['unlock']);
});
test('Android bridge is scoped to the game lifecycle', async () => {
  const e = environment({ supported: false });
  e.win.LetsPlayAndroid = { setDuelLandscape: (enabled) => e.calls.push(`native:${enabled}`) };
  const s = createRpgLandscapeSession(e.win, e.doc);
  await s.enter({ fullscreen: false }); s.leave();
  assert.deepEqual(e.calls, ['native:true', 'landscape', 'native:false']);
});
