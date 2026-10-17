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
test('desktop requests native fullscreen but never locks orientation', async () => {
  const e = environment({ mobile: false });
  const s = createRpgLandscapeSession(e.win, e.doc);
  await s.enter(); s.leave();
  assert.deepEqual(e.calls, ['fullscreen', 'exit']);
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

// Le plein écran du Sablier appartient à la page (menu compris) : la session de
// paysage ne le demande plus, elle l'attend avant de verrouiller l'orientation —
// `screen.orientation.lock` est refusé tant que le document n'y est pas.
function documentAvecEvenements() {
  const ecouteurs = new Map();
  const doc = { fullscreenElement: null };
  doc.documentElement = { requestFullscreen: async () => { doc.fullscreenElement = doc.documentElement; } };
  doc.exitFullscreen = async () => { doc.fullscreenElement = null; };
  doc.addEventListener = (type, fn) => ecouteurs.set(type, [...(ecouteurs.get(type) ?? []), fn]);
  doc.removeEventListener = (type, fn) => ecouteurs.set(type, (ecouteurs.get(type) ?? []).filter((autre) => autre !== fn));
  doc.fire = (type) => (ecouteurs.get(type) ?? []).forEach((fn) => fn());
  doc.listenerCount = (type) => (ecouteurs.get(type) ?? []).length;
  return doc;
}

test('the duel waits for the page fullscreen before locking orientation', async () => {
  const e = environment();
  const doc = documentAvecEvenements();
  const verrous = [];
  e.win.screen.orientation.lock = async (mode) => { verrous.push(mode); };
  const s = createRpgLandscapeSession(e.win, doc);
  const pending = s.enter({ fullscreen: false });
  assert.deepEqual(verrous, [], 'nothing is locked while the document is still windowed');
  assert.deepEqual(e.calls, [], 'the session never requests fullscreen itself');
  doc.fullscreenElement = doc.documentElement;
  doc.fire('fullscreenchange');
  await pending;
  assert.deepEqual(verrous, ['landscape'], 'orientation is locked once the page fullscreen lands');
  s.leave();
  assert.equal(doc.fullscreenElement, doc.documentElement, 'leaving the duel keeps the page fullscreen open');
  assert.equal(doc.listenerCount('fullscreenchange'), 0, 'the wait releases its listeners');
});
test('leaving during the wait never locks orientation', async () => {
  const e = environment();
  const doc = documentAvecEvenements();
  const verrous = [];
  e.win.screen.orientation.lock = async (mode) => { verrous.push(mode); };
  const s = createRpgLandscapeSession(e.win, doc);
  const pending = s.enter({ fullscreen: false });
  s.leave();
  doc.fullscreenElement = doc.documentElement;
  doc.fire('fullscreenchange');
  await pending;
  assert.deepEqual(verrous, [], 'a duel left before the fullscreen lands locks nothing');
});
test('without a Fullscreen API there is nothing to wait for', async () => {
  const e = environment();
  const doc = documentAvecEvenements();
  delete doc.documentElement.requestFullscreen;
  const verrous = [];
  e.win.screen.orientation.lock = async (mode) => { verrous.push(mode); };
  const s = createRpgLandscapeSession(e.win, doc);
  await s.enter({ fullscreen: false });
  assert.deepEqual(verrous, ['landscape'], 'the rotate prompt stays the only fallback');
  s.leave();
});

// Le navigateur ne tourne l'écran qu'en plein écran, et le plein écran de la
// page peut arriver APRÈS l'attente de `enter()` (navigateur lent, geste
// suivant) : tant que la session est ouverte, chaque `fullscreenchange` rejoue
// le verrou — la partie finit en paysage dès que le plein écran est là.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a fullscreen that lands after the wait still locks landscape', async () => {
  const e = environment();
  const doc = documentAvecEvenements();
  const verrous = [];
  e.win.screen.orientation.lock = async (mode) => {
    verrous.push(mode);
    if (!doc.fullscreenElement) throw new Error('fullscreen required');
  };
  const s = createRpgLandscapeSession(e.win, doc);
  await s.enter({ fullscreen: false }); // l'attente expire, le premier verrou est refusé
  assert.deepEqual(verrous, ['landscape'], 'a first attempt is always made');
  doc.fullscreenElement = doc.documentElement;
  doc.fire('fullscreenchange');
  await tick();
  assert.deepEqual(verrous, ['landscape', 'landscape'], 'the catch-up retries the lock once fullscreen is there');
  doc.fire('fullscreenchange');
  await tick();
  assert.deepEqual(verrous, ['landscape', 'landscape'], 'the landscape is taken: no further attempt');
  s.leave();
  assert.equal(doc.listenerCount('fullscreenchange'), 0, 'leaving releases the catch-up listener');
});
test('a new duel re-arms a single catch-up listener', async () => {
  const e = environment();
  const doc = documentAvecEvenements();
  const verrous = [];
  e.win.screen.orientation.lock = async (mode) => {
    verrous.push(mode);
    if (!doc.fullscreenElement) throw new Error('fullscreen required');
  };
  const s = createRpgLandscapeSession(e.win, doc);
  await s.enter({ fullscreen: false });
  await s.enter({ fullscreen: false }); // « Activer le paysage » est rappuyé
  assert.equal(doc.listenerCount('fullscreenchange'), 1, 'one catch-up listener is armed, with the newest token');
  doc.fullscreenElement = doc.documentElement;
  doc.fire('fullscreenchange');
  await tick();
  assert.deepEqual(verrous, ['landscape', 'landscape', 'landscape'], 'only the armed listener retries');
  s.leave();
});
