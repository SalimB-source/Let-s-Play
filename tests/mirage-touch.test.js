import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  SWIPE_JUMP_DISTANCE, SWIPE_MIN_DISTANCE, SWIPE_REPEAT_DISTANCE,
  TAP_MAX_DISTANCE, TAP_MAX_DURATION,
  attachSwipeControls, createSwipeFeedback, createSwipeTracker,
} from '../src/games/mirageTouch.js';

/** Écran de téléphone fictif : le doigt part du centre de la piste. */
const ORIGIN = { x: 200, y: 320 };

function tracker() {
  return createSwipeTracker();
}

test('a swipe left or right moves the rider one lane, and nothing else', () => {
  const left = tracker();
  left.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(left.end(ORIGIN.x - (SWIPE_MIN_DISTANCE + 6), ORIGIN.y), ['left']);

  const right = tracker();
  right.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(right.end(ORIGIN.x + (SWIPE_MIN_DISTANCE + 6), ORIGIN.y), ['right']);
});

test('a swipe up jumps', () => {
  const up = tracker();
  up.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(up.end(ORIGIN.x, ORIGIN.y - (SWIPE_JUMP_DISTANCE + 8)), ['jump']);
});

test('a trembling finger below the threshold does not move the rider', () => {
  const jitter = tracker();
  jitter.begin(ORIGIN.x, ORIGIN.y, 1000);
  assert.deepEqual(jitter.sample(ORIGIN.x + 7, ORIGIN.y - 4), []);
  assert.deepEqual(jitter.sample(ORIGIN.x - 9, ORIGIN.y + 6), []);
  assert.deepEqual(jitter.sample(ORIGIN.x + 2, ORIGIN.y - SWIPE_JUMP_DISTANCE + 1), []);
  // Geste long : ce n'est ni un glissement, ni une tape.
  assert.deepEqual(jitter.end(ORIGIN.x - 4, ORIGIN.y + 2, 1000 + TAP_MAX_DURATION + 40), []);
});

test('a swipe down is not a jump and changes nothing', () => {
  const down = tracker();
  down.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(down.sample(ORIGIN.x, ORIGIN.y + 120), []);
  assert.deepEqual(down.end(ORIGIN.x, ORIGIN.y + 160), []);
});

test('one gesture jumps once, however far the finger keeps climbing', () => {
  const up = tracker();
  up.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(up.sample(ORIGIN.x, ORIGIN.y - SWIPE_JUMP_DISTANCE), ['jump']);
  assert.deepEqual(up.sample(ORIGIN.x, ORIGIN.y - 240), []);
  assert.deepEqual(up.end(ORIGIN.x, ORIGIN.y - 400), []);
});

test('keeping the finger down and dragging on chains lane changes, with a wider gap after the first', () => {
  const drag = tracker();
  drag.begin(ORIGIN.x, ORIGIN.y);
  // Juste sous le premier seuil : rien. Un pixel de plus : une voie.
  assert.deepEqual(drag.sample(ORIGIN.x + SWIPE_MIN_DISTANCE - 1, ORIGIN.y), []);
  assert.deepEqual(drag.sample(ORIGIN.x + SWIPE_MIN_DISTANCE, ORIGIN.y), ['right']);
  // Le seuil suivant est plus large : le doigt doit vraiment continuer.
  assert.deepEqual(drag.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + SWIPE_REPEAT_DISTANCE - 1, ORIGIN.y), []);
  assert.deepEqual(drag.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + SWIPE_REPEAT_DISTANCE, ORIGIN.y), ['right']);
  assert.deepEqual(drag.end(ORIGIN.x + SWIPE_MIN_DISTANCE + SWIPE_REPEAT_DISTANCE * 2, ORIGIN.y), ['right']);
});

test('a single very fast flick is split into several lanes but never more than the track is wide', () => {
  const flick = tracker();
  flick.begin(ORIGIN.x, ORIGIN.y);
  // Un navigateur peut livrer un seul mouvement pour un geste très rapide.
  const actions = flick.end(ORIGIN.x + 900, ORIGIN.y);
  assert.ok(actions.length >= 3 && actions.length <= 4, `unexpected lane changes: ${actions}`);
  assert.ok(actions.every((name) => name === 'right'));
});

test('a diagonal up-and-side swipe steers first, then jumps', () => {
  const diagonal = tracker();
  diagonal.begin(ORIGIN.x, ORIGIN.y);
  // L'ordre compte : pendant le saut les voies sont verrouillées, donc le
  // changement de voie doit passer avant.
  assert.deepEqual(diagonal.end(ORIGIN.x + SWIPE_MIN_DISTANCE + 4, ORIGIN.y - SWIPE_JUMP_DISTANCE - 40), ['right', 'jump']);

  const otherDiagonal = tracker();
  otherDiagonal.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(otherDiagonal.end(ORIGIN.x - SWIPE_MIN_DISTANCE - 4, ORIGIN.y - SWIPE_JUMP_DISTANCE - 40), ['left', 'jump']);
});

test('coming back inside the repeat distance does not zigzag the rider', () => {
  const wiggle = tracker();
  wiggle.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(wiggle.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + 2, ORIGIN.y), ['right']);
  // L'ancre reste là où la voie a changé : revenir en arrière ne rejoue rien.
  const anchor = ORIGIN.x + SWIPE_MIN_DISTANCE;
  assert.deepEqual(wiggle.sample(anchor - SWIPE_REPEAT_DISTANCE + 1, ORIGIN.y), []);
  assert.deepEqual(wiggle.sample(ORIGIN.x, ORIGIN.y), []);
  // Au-delà du seuil de répétition, le geste redevient un vrai changement de voie.
  assert.deepEqual(wiggle.end(anchor - SWIPE_REPEAT_DISTANCE, ORIGIN.y), ['left']);
});

test('the release is enough to read a flick that no move event reported', () => {
  const flick = tracker();
  flick.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(flick.end(ORIGIN.x - 46, ORIGIN.y - 8), ['left']);
});

test('a finished or cancelled gesture stops answering, and a new one starts clean', () => {
  const run = tracker();
  run.begin(ORIGIN.x, ORIGIN.y);
  // Un coup de doigt juste au-delà du seuil : une seule voie.
  assert.deepEqual(run.end(ORIGIN.x + SWIPE_MIN_DISTANCE + 6, ORIGIN.y), ['right']);
  assert.equal(run.isTracking(), false);
  // Après la fin du geste, le doigt qui traîne ne pilote plus rien.
  assert.deepEqual(run.sample(ORIGIN.x + 200, ORIGIN.y - 200), []);
  assert.deepEqual(run.end(ORIGIN.x + 260, ORIGIN.y - 260), []);

  run.begin(ORIGIN.x, ORIGIN.y);
  assert.equal(run.isTracking(), true);
  assert.deepEqual(run.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + 6, ORIGIN.y), ['right']);

  const cancelled = tracker();
  cancelled.begin(ORIGIN.x, ORIGIN.y);
  cancelled.cancel();
  assert.deepEqual(cancelled.end(ORIGIN.x + 200, ORIGIN.y - 200), []);
});

test('swipes read without an open gesture are ignored', () => {
  const idle = tracker();
  assert.deepEqual(idle.sample(ORIGIN.x + 120, ORIGIN.y), []);
  assert.deepEqual(idle.end(ORIGIN.x + 120, ORIGIN.y), []);
});

/** Élément DOM minimal : assez pour vérifier le branchement des écouteurs. */
function fakeElement() {
  const listeners = new Map();
  const element = {
    listeners,
    captured: [],
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(handler);
    },
    removeEventListener(name, handler) {
      const list = listeners.get(name) || [];
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    setPointerCapture(id) { element.captured.push(`capture:${id}`); },
    hasPointerCapture: () => true,
    releasePointerCapture(id) { element.captured.push(`release:${id}`); },
    dispatch(name, event) {
      for (const handler of listeners.get(name) || []) handler(event);
    },
    count: () => [...listeners.values()].reduce((total, list) => total + list.length, 0),
  };
  return element;
}

const pointerEvent = (type, x, y, pointerId = 1) => ({
  type, clientX: x, clientY: y, pointerId, cancelable: true, preventDefault() {},
});

const touchEvent = (type, x, y, identifier = 0) => ({
  type,
  touches: type === 'touchend' || type === 'touchcancel' ? [] : [{ identifier, clientX: x, clientY: y }],
  changedTouches: [{ identifier, clientX: x, clientY: y }],
  cancelable: true,
  preventDefault() {},
});

/**
 * `attachSwipeControls` choisit Pointer Events quand le navigateur en a, sinon
 * Touch Events. Node n'a pas de `window` : on le simule le temps d'un test pour
 * couvrir les deux chemins.
 */
function withPointerEventSupport(run) {
  const previous = globalThis.window;
  globalThis.window = { PointerEvent: function PointerEvent() {} };
  try {
    run();
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

function withoutPointerEventSupport(run) {
  const previous = globalThis.window;
  delete globalThis.window;
  try {
    run();
  } finally {
    if (previous !== undefined) globalThis.window = previous;
  }
}

test('the canvas binding turns a real swipe into a game action, one finger at a time', () => withPointerEventSupport(() => {
  const element = fakeElement();
  const actions = [];
  const detach = attachSwipeControls(element, (name) => actions.push(name), {
    onGesture: (name) => actions.push(`seen:${name}`),
  });
  assert.ok(element.count() > 0, 'listeners must be registered');

  element.dispatch('pointerdown', pointerEvent('pointerdown', ORIGIN.x, ORIGIN.y, 1));
  assert.deepEqual(element.captured, ['capture:1'], 'the finger is captured so it keeps steering outside the canvas');
  element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x - 44, ORIGIN.y + 3, 1));
  assert.deepEqual(actions, ['seen:left', 'left']);

  // Un second doigt posé par accident ne pilote rien tant que le premier tient.
  actions.length = 0;
  element.dispatch('pointerdown', pointerEvent('pointerdown', ORIGIN.x, ORIGIN.y, 2));
  element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x + 90, ORIGIN.y, 2));
  assert.deepEqual(actions, []);

  // Le premier doigt garde la main jusqu'au relâchement.
  element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x - 44 - SWIPE_REPEAT_DISTANCE, ORIGIN.y, 1));
  assert.deepEqual(actions, ['seen:left', 'left']);
  element.dispatch('pointerup', pointerEvent('pointerup', ORIGIN.x - 44 - SWIPE_REPEAT_DISTANCE, ORIGIN.y - 70, 1));
  assert.deepEqual(actions.slice(2), ['seen:jump', 'jump']);
  assert.deepEqual(element.captured, ['capture:1', 'release:1']);

  // Une fois détaché, plus aucun geste n'atteint le jeu.
  actions.length = 0;
  detach();
  assert.equal(element.count(), 0, 'every listener must be removed');
  element.dispatch('pointerdown', pointerEvent('pointerdown', ORIGIN.x, ORIGIN.y, 3));
  element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x + 120, ORIGIN.y - 120, 3));
  assert.deepEqual(actions, []);
}));

test('without PointerEvent support the binding falls back to touch events', () => withoutPointerEventSupport(() => {
  const element = fakeElement();
  const actions = [];
  const detach = attachSwipeControls(element, (name) => actions.push(name));
  assert.ok(element.listeners.has('touchstart') && element.listeners.has('touchmove'), 'touch listeners expected');
  assert.ok(!element.listeners.has('pointerdown'), 'pointer listeners must not be doubled with touch ones');

  element.dispatch('touchstart', touchEvent('touchstart', ORIGIN.x, ORIGIN.y));
  element.dispatch('touchmove', touchEvent('touchmove', ORIGIN.x + 40, ORIGIN.y - 2));
  element.dispatch('touchmove', touchEvent('touchmove', ORIGIN.x + 44, ORIGIN.y - SWIPE_JUMP_DISTANCE - 6));
  element.dispatch('touchend', touchEvent('touchend', ORIGIN.x + 44, ORIGIN.y - SWIPE_JUMP_DISTANCE - 6));
  assert.deepEqual(actions, ['right', 'jump']);

  actions.length = 0;
  element.dispatch('touchstart', touchEvent('touchstart', ORIGIN.x, ORIGIN.y));
  // Un appel ou une alerte coupe le geste : rien ne doit partir au retour.
  element.dispatch('touchcancel', touchEvent('touchcancel', ORIGIN.x + 90, ORIGIN.y - 90));
  element.dispatch('touchend', touchEvent('touchend', ORIGIN.x + 90, ORIGIN.y - 90));
  assert.deepEqual(actions, []);

  detach();
  assert.equal(element.count(), 0);
}));

test('binding tolerates a missing element or callback', () => {
  assert.equal(typeof attachSwipeControls(null, () => {}), 'function');
  const element = fakeElement();
  assert.equal(typeof attachSwipeControls(element, null), 'function');
  assert.equal(element.count(), 0);
});

/**
 * Même vérification dans un vrai DOM (jsdom) : les écouteurs sont posés sur le
 * canvas, les gestes y sont lus, et le retour visuel vit puis disparaît avec le
 * monde 3D.
 */
function withDom(html, run) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  try {
    run(dom);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    dom.window.close();
  }
}

test('swiping on the real canvas steers and jumps, and stops once detached', () => withDom('<div id="mount"><canvas id="track"></canvas></div>', (dom) => {
  const canvas = dom.window.document.getElementById('track');
  const actions = [];
  const detach = attachSwipeControls(canvas, (name) => actions.push(name));
  const send = (type, x, y) => canvas.dispatchEvent(
    new dom.window.PointerEvent(type, { clientX: x, clientY: y, pointerId: 4, bubbles: true, cancelable: true }),
  );

  send('pointerdown', 180, 400);
  send('pointermove', 160, 396);
  send('pointermove', 140, 394);
  send('pointermove', 136, 354);
  send('pointerup', 136, 354);
  assert.deepEqual(actions, ['left', 'jump']);

  // Un geste détaché ne pilote plus rien (changement de page, monde détruit).
  actions.length = 0;
  detach();
  send('pointerdown', 180, 400);
  send('pointermove', 60, 200);
  send('pointerup', 60, 200);
  assert.deepEqual(actions, []);
}));

test('the feedback layer announces each gesture and leaves with the world', () => withDom('<div id="mount"></div>', (dom) => {
  const mount = dom.window.document.getElementById('mount');
  const feedback = createSwipeFeedback(mount, { hintTimeout: 20, hintGestures: 2 });

  const layer = mount.querySelector('.mirage-touch-layer');
  assert.ok(layer, 'the layer must be mounted next to the canvas');
  assert.equal(layer.getAttribute('aria-hidden'), 'true', 'pure decoration: hidden from screen readers');
  const hint = mount.querySelector('.mirage-swipe-hint');
  const pulse = mount.querySelector('.mirage-touch-pulse');
  assert.match(hint.textContent, /GLISSE/);
  assert.match(hint.textContent, /SAUTER/);

  feedback.showHint();
  assert.ok(hint.classList.contains('is-on'));

  feedback.pulse('left');
  assert.equal(pulse.dataset.action, 'left');
  assert.equal(pulse.textContent, '←');
  assert.ok(pulse.classList.contains('is-live'));
  feedback.pulse('jump');
  assert.equal(pulse.dataset.action, 'jump');
  assert.equal(pulse.textContent, '↑');
  // Deux gestes compris : le rappel s'efface sans attendre la minuterie.
  assert.ok(!hint.classList.contains('is-on'));

  feedback.destroy();
  assert.equal(mount.querySelector('.mirage-touch-layer'), null);
}));

test('the feedback layer is skipped when there is no DOM (server render)', () => {
  const feedback = createSwipeFeedback(null);
  feedback.pulse('left');
  feedback.showHint();
  feedback.hideHint();
  feedback.destroy();
});

test('a short tap jumps, a long press does not', () => {
  const tap = tracker();
  tap.begin(ORIGIN.x, ORIGIN.y, 1000);
  assert.deepEqual(tap.end(ORIGIN.x + 4, ORIGIN.y - 6, 1120), ['jump']);

  // Le pouce qui reste posé (le joueur regarde la piste) ne fait pas sauter.
  const press = tracker();
  press.begin(ORIGIN.x, ORIGIN.y, 1000);
  assert.deepEqual(press.end(ORIGIN.x + 3, ORIGIN.y - 2, 1000 + TAP_MAX_DURATION + 1), []);

  // Un appui qui dérive au-delà de la tape n'est pas une tape non plus.
  const drift = tracker();
  drift.begin(ORIGIN.x, ORIGIN.y, 1000);
  assert.deepEqual(drift.end(ORIGIN.x + TAP_MAX_DISTANCE + 1, ORIGIN.y, 1060), []);
});

test('a gesture that already steered never adds a parasitic jump on release', () => {
  const flick = tracker();
  flick.begin(ORIGIN.x, ORIGIN.y, 1000);
  // Aller-retour très rapide : la voie change à l'aller, le doigt revient au
  // point de départ avant le relâchement.
  assert.deepEqual(flick.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + 6, ORIGIN.y), ['right']);
  assert.deepEqual(flick.end(ORIGIN.x + 2, ORIGIN.y - 2, 1120), []);
});

test('tap-to-jump can be refused (mouse) or disabled altogether', () => {
  const mouse = tracker();
  mouse.begin(ORIGIN.x, ORIGIN.y, 1000);
  assert.deepEqual(mouse.end(ORIGIN.x + 2, ORIGIN.y - 2, 1080, false), []);

  const noTap = createSwipeTracker({ tapToJump: false });
  noTap.begin(ORIGIN.x, ORIGIN.y, 1000);
  assert.deepEqual(noTap.end(ORIGIN.x + 2, ORIGIN.y - 2, 1080), []);
});

test('a real tap on the canvas jumps, but a mouse click does not', () => withDom('<div id="mount"><canvas id="track"></canvas></div>', (dom) => {
  const canvas = dom.window.document.getElementById('track');
  const actions = [];
  const detach = attachSwipeControls(canvas, (name) => actions.push(name));
  const send = (type, x, y, pointerType) => canvas.dispatchEvent(new dom.window.PointerEvent(type, {
    clientX: x, clientY: y, pointerId: 9, pointerType, bubbles: true, cancelable: true,
  }));

  send('pointerdown', 150, 250, 'touch');
  send('pointerup', 153, 246, 'touch');
  assert.deepEqual(actions, ['jump']);

  actions.length = 0;
  send('pointerdown', 150, 250, 'mouse');
  send('pointerup', 151, 250, 'mouse');
  assert.deepEqual(actions, [], 'a desktop click must not make the horse jump');

  detach();
}));
