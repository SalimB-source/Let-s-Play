import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  SWIPE_JUMP_DISTANCE, SWIPE_MIN_DISTANCE,
  TAP_MAX_DISTANCE, TAP_MAX_DURATION,
  attachSwipeControls, createSwipeFeedback, createSwipeTracker,
} from '../src/games/mirageTouch.js';
import { playerLaneAfterAction, setLaneCount } from '../src/games/mirageRules.js';
import { DESKTOP_LANE_COUNT, PHONE_LANE_COUNT } from '../src/games/mirageLanes.js';

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

test('the lane changes the very moment the threshold is crossed, without waiting for the release', () => {
  const drag = tracker();
  drag.begin(ORIGIN.x, ORIGIN.y);
  // Juste sous le seuil : rien. Au seuil exact : la voie part, doigt toujours posé.
  assert.deepEqual(drag.sample(ORIGIN.x + SWIPE_MIN_DISTANCE - 1, ORIGIN.y), []);
  assert.deepEqual(drag.sample(ORIGIN.x + SWIPE_MIN_DISTANCE, ORIGIN.y), ['right']);
  assert.equal(drag.isTracking(), true, 'le geste continue : seul le relâchement le ferme');

  const left = tracker();
  left.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(left.sample(ORIGIN.x - SWIPE_MIN_DISTANCE + 1, ORIGIN.y), []);
  assert.deepEqual(left.sample(ORIGIN.x - SWIPE_MIN_DISTANCE, ORIGIN.y), ['left']);
});

test('keeping the finger down and dragging on never changes a second lane', () => {
  for (const sign of [1, -1]) {
    const name = sign > 0 ? 'right' : 'left';
    const drag = tracker();
    drag.begin(ORIGIN.x, ORIGIN.y);
    assert.deepEqual(drag.sample(ORIGIN.x + sign * SWIPE_MIN_DISTANCE, ORIGIN.y), [name]);
    // Un long glissement continu : des dizaines de mouvements, 900 px de course.
    for (let travelled = SWIPE_MIN_DISTANCE + 1; travelled <= 900; travelled += 7) {
      assert.deepEqual(drag.sample(ORIGIN.x + sign * travelled, ORIGIN.y), [], `plus aucune voie à ${travelled} px`);
    }
    assert.deepEqual(drag.end(ORIGIN.x + sign * 1200, ORIGIN.y), []);
  }
});

test('a single very fast flick changes exactly one lane, however far it goes', () => {
  // Un navigateur peut livrer un seul mouvement pour un geste très rapide : il
  // ne doit donner ni deux voies, ni trois, ni quatre.
  const flicks = [
    [SWIPE_MIN_DISTANCE + 1, 'right'], [SWIPE_MIN_DISTANCE * 3, 'right'], [140, 'right'], [900, 'right'],
    [-(SWIPE_MIN_DISTANCE + 1), 'left'], [-(SWIPE_MIN_DISTANCE * 3), 'left'], [-140, 'left'], [-900, 'left'],
  ];
  for (const [dx, name] of flicks) {
    const onRelease = tracker();
    onRelease.begin(ORIGIN.x, ORIGIN.y);
    assert.deepEqual(onRelease.end(ORIGIN.x + dx, ORIGIN.y), [name], `relâché à ${dx} px`);

    const onMove = tracker();
    onMove.begin(ORIGIN.x, ORIGIN.y);
    assert.deepEqual(onMove.sample(ORIGIN.x + dx, ORIGIN.y), [name], `un seul mouvement de ${dx} px`);
    assert.deepEqual(onMove.end(ORIGIN.x + dx, ORIGIN.y), []);
  }
});

test('a diagonal swipe does one thing only: the dominant axis wins', () => {
  // Diagonale franchement vers le haut : le saut part, la voie ne bouge pas.
  const mostlyUp = tracker();
  mostlyUp.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(mostlyUp.end(ORIGIN.x + SWIPE_MIN_DISTANCE + 4, ORIGIN.y - 160), ['jump']);

  // Diagonale franchement sur le côté : la voie change, aucun saut ne suit.
  const mostlySide = tracker();
  mostlySide.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(mostlySide.end(ORIGIN.x + 160, ORIGIN.y - SWIPE_JUMP_DISTANCE - 4), ['right']);

  const otherSide = tracker();
  otherSide.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(otherSide.end(ORIGIN.x - 160, ORIGIN.y - SWIPE_JUMP_DISTANCE - 4), ['left']);

  // Les deux seuils franchis exactement autant (une diagonale à 45°) : la voie
  // l'emporte, jamais les deux à la fois.
  const tie = tracker();
  tie.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(tie.end(ORIGIN.x + SWIPE_MIN_DISTANCE * 2, ORIGIN.y - SWIPE_JUMP_DISTANCE * 2), ['right']);
});

test('once a lane has changed, going back or on in the same gesture never steers again', () => {
  const wiggle = tracker();
  wiggle.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(wiggle.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + 2, ORIGIN.y), ['right']);
  // Le rebond du relâchement, ou un doigt qui revient franchement sur ses pas :
  // le cheval ne repart pas dans l'autre sens.
  assert.deepEqual(wiggle.sample(ORIGIN.x + 6, ORIGIN.y), []);
  assert.deepEqual(wiggle.sample(ORIGIN.x - SWIPE_MIN_DISTANCE - 2, ORIGIN.y), []);
  assert.deepEqual(wiggle.sample(ORIGIN.x - 160, ORIGIN.y), []);
  assert.deepEqual(wiggle.end(ORIGIN.x - 300, ORIGIN.y), []);
});

test('a gesture that already steered never jumps afterwards: the diagonal is gone', () => {
  const diagonal = tracker();
  diagonal.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(diagonal.sample(ORIGIN.x + SWIPE_MIN_DISTANCE + 3, ORIGIN.y - 4), ['right']);
  // Le doigt continue vers le haut puis vers le côté : plus rien ne part.
  assert.deepEqual(diagonal.sample(ORIGIN.x + 90, ORIGIN.y - SWIPE_JUMP_DISTANCE - 2), []);
  assert.deepEqual(diagonal.sample(ORIGIN.x + 180, ORIGIN.y - 150), []);
  assert.deepEqual(diagonal.end(ORIGIN.x + 260, ORIGIN.y - 220), []);
});

test('a gesture that already jumped never steers afterwards either', () => {
  const up = tracker();
  up.begin(ORIGIN.x, ORIGIN.y);
  assert.deepEqual(up.sample(ORIGIN.x + 2, ORIGIN.y - SWIPE_JUMP_DISTANCE - 2), ['jump']);
  // Le doigt dérive franchement sur le côté en retombant : aucune voie.
  assert.deepEqual(up.sample(ORIGIN.x + 200, ORIGIN.y - 200), []);
  assert.deepEqual(up.end(ORIGIN.x + 320, ORIGIN.y - 260), []);
});

test('the next swipe is read at once: no cooldown, nothing swallowed between two gestures', () => {
  const run = tracker();
  const lanes = [];
  let now = 1000;
  // Des glissements quasi collés (1 ms entre le relâchement et la pose suivante).
  for (const sign of [1, 1, -1, -1, 1, -1]) {
    run.begin(ORIGIN.x, ORIGIN.y, now);
    lanes.push(...run.end(ORIGIN.x + sign * (SWIPE_MIN_DISTANCE + 4), ORIGIN.y, now + 1));
    now += 2;
  }
  assert.deepEqual(lanes, ['right', 'right', 'left', 'left', 'right', 'left']);
});

test('on the three-lane phone track one swipe never carries the rider from one edge to the other', (t) => {
  t.after(() => setLaneCount(DESKTOP_LANE_COUNT));
  setLaneCount(PHONE_LANE_COUNT);
  // [voie de départ, déplacements du doigt (px), voie attendue à la fin du geste]
  const swipes = [
    [0, [8, 30, 90, 200, 420], 1],
    [2, [-8, -30, -90, -200, -420], 1],
    [1, [30, 400], 2],
    [1, [-30, -400], 0],
    [0, [-30, -400], 0],
    [2, [30, 400], 2],
  ];
  for (const [from, moves, expected] of swipes) {
    const swipe = tracker();
    swipe.begin(ORIGIN.x, ORIGIN.y);
    let lane = from;
    for (const dx of moves) {
      for (const action of swipe.sample(ORIGIN.x + dx, ORIGIN.y)) lane = playerLaneAfterAction(lane, action);
    }
    const last = moves[moves.length - 1];
    for (const action of swipe.end(ORIGIN.x + last, ORIGIN.y)) lane = playerLaneAfterAction(lane, action);
    assert.equal(lane, expected, `voie ${from} puis ${moves.join(', ')} px → voie ${expected}`);
  }
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

  // Le premier doigt garde la main jusqu'au relâchement, mais son action est
  // déjà partie : continuer à glisser — même franchement vers le haut — ne
  // déclenche plus rien (une seule action par geste, plus de diagonale).
  element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x - 44 - 36, ORIGIN.y, 1));
  element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x - 300, ORIGIN.y, 1));
  assert.deepEqual(actions, [], 'une seule voie par geste');
  element.dispatch('pointerup', pointerEvent('pointerup', ORIGIN.x - 300, ORIGIN.y - 70, 1));
  assert.deepEqual(actions, [], 'le geste qui a changé de voie ne saute plus');
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
  assert.deepEqual(actions, ['right'], 'un geste = une action : la diagonale ne saute plus');

  actions.length = 0;
  element.dispatch('touchstart', touchEvent('touchstart', ORIGIN.x, ORIGIN.y));
  // Un appel ou une alerte coupe le geste : rien ne doit partir au retour.
  element.dispatch('touchcancel', touchEvent('touchcancel', ORIGIN.x + 90, ORIGIN.y - 90));
  element.dispatch('touchend', touchEvent('touchend', ORIGIN.x + 90, ORIGIN.y - 90));
  assert.deepEqual(actions, []);

  detach();
  assert.equal(element.count(), 0);
}));

test('a long drag made of many move events changes exactly one lane', () => withPointerEventSupport(() => {
  const element = fakeElement();
  const actions = [];
  const detach = attachSwipeControls(element, (name) => actions.push(name));

  element.dispatch('pointerdown', pointerEvent('pointerdown', ORIGIN.x, ORIGIN.y, 1));
  // 60 mouvements de 9 px : le doigt traverse tout l'écran sans jamais lâcher.
  for (let step = 1; step <= 60; step += 1) {
    element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x + step * 9, ORIGIN.y, 1));
  }
  element.dispatch('pointerup', pointerEvent('pointerup', ORIGIN.x + 540, ORIGIN.y, 1));
  assert.deepEqual(actions, ['right']);
  detach();
}));

test('swipes that follow each other closely are all read: one lane per swipe, no cooldown', () => withPointerEventSupport(() => {
  const element = fakeElement();
  const actions = [];
  const detach = attachSwipeControls(element, (name) => actions.push(name));
  let id = 10;
  // Le pouce relève et repose aussitôt (aucune pause entre les gestes).
  for (const sign of [1, 1, -1, 1, -1, -1]) {
    id += 1;
    element.dispatch('pointerdown', pointerEvent('pointerdown', ORIGIN.x, ORIGIN.y, id));
    element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x + sign * 30, ORIGIN.y, id));
    element.dispatch('pointermove', pointerEvent('pointermove', ORIGIN.x + sign * 140, ORIGIN.y, id));
    element.dispatch('pointerup', pointerEvent('pointerup', ORIGIN.x + sign * 140, ORIGIN.y, id));
  }
  assert.deepEqual(actions, ['right', 'right', 'left', 'right', 'left', 'left']);
  detach();
}));

test('two fingers swiping together still move a single lane', () => withPointerEventSupport(() => {
  const element = fakeElement();
  const actions = [];
  const detach = attachSwipeControls(element, (name) => actions.push(name));

  element.dispatch('pointerdown', pointerEvent('pointerdown', 120, 400, 1));
  element.dispatch('pointerdown', pointerEvent('pointerdown', 280, 400, 2));
  // Les deux doigts glissent vers la droite en même temps, par à-coups entremêlés.
  for (let step = 1; step <= 8; step += 1) {
    element.dispatch('pointermove', pointerEvent('pointermove', 120 + step * 20, 400, 1));
    element.dispatch('pointermove', pointerEvent('pointermove', 280 + step * 20, 400, 2));
  }
  element.dispatch('pointerup', pointerEvent('pointerup', 280, 400, 1));
  element.dispatch('pointerup', pointerEvent('pointerup', 440, 400, 2));
  assert.deepEqual(actions, ['right']);

  // Les deux doigts relevés, le geste suivant repart normalement.
  actions.length = 0;
  element.dispatch('pointerdown', pointerEvent('pointerdown', 200, 400, 3));
  element.dispatch('pointermove', pointerEvent('pointermove', 160, 400, 3));
  assert.deepEqual(actions, ['left']);
  detach();
}));

test('with touch events, the finger being followed is the one that counts, not the first of the list', () => withoutPointerEventSupport(() => {
  const element = fakeElement();
  const actions = [];
  const detach = attachSwipeControls(element, (name) => actions.push(name));
  const finger = (identifier, x, y) => ({ identifier, clientX: x, clientY: y });
  const event = (type, touches, changedTouches) => ({
    type, touches, changedTouches, cancelable: true, preventDefault() {},
  });

  // Le doigt 0 pilote ; le doigt 1, posé ailleurs, est ignoré.
  element.dispatch('touchstart', event('touchstart', [finger(0, 200, 320)], [finger(0, 200, 320)]));
  element.dispatch('touchstart', event('touchstart', [finger(0, 200, 320), finger(1, 40, 700)], [finger(1, 40, 700)]));
  assert.deepEqual(actions, []);

  // Les deux doigts bougent dans le même événement, et c'est le doigt 1 qui est
  // annoncé en premier : le mouvement du doigt 0 est lu quand même.
  element.dispatch('touchmove', event(
    'touchmove',
    [finger(0, 232, 320), finger(1, 60, 700)],
    [finger(1, 60, 700), finger(0, 232, 320)],
  ));
  assert.deepEqual(actions, ['right']);

  // Le doigt 0 se relève pendant que le doigt 1 reste posé loin de là : sa
  // position de relâchement vient de `changedTouches`, pas de `touches[0]` (le
  // doigt 1) — sinon une voie ou un saut partirait sans aucun geste.
  actions.length = 0;
  element.dispatch('touchend', event('touchend', [finger(1, 60, 700)], [finger(0, 234, 322)]));
  assert.deepEqual(actions, []);

  // Le doigt 1, resté posé, ne pilote rien non plus : un geste neuf est nécessaire.
  element.dispatch('touchmove', event('touchmove', [finger(1, 400, 700)], [finger(1, 400, 700)]));
  assert.deepEqual(actions, []);
  element.dispatch('touchend', event('touchend', [], [finger(1, 400, 700)]));
  element.dispatch('touchstart', event('touchstart', [finger(2, 200, 320)], [finger(2, 200, 320)]));
  element.dispatch('touchmove', event('touchmove', [finger(2, 160, 320)], [finger(2, 160, 320)]));
  assert.deepEqual(actions, ['left']);
  detach();
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

test('swiping on the real canvas steers without jumping, and stops once detached', () => withDom('<div id="mount"><canvas id="track"></canvas></div>', (dom) => {
  const canvas = dom.window.document.getElementById('track');
  const actions = [];
  const detach = attachSwipeControls(canvas, (name) => actions.push(name));
  const send = (type, x, y) => canvas.dispatchEvent(
    new dom.window.PointerEvent(type, { clientX: x, clientY: y, pointerId: 4, bubbles: true, cancelable: true }),
  );

  // Diagonale vers le haut et la gauche : la voie part (axe dominant), le saut
  // ne suit plus — le cheval reste sur sa trajectoire jusqu'à l'atterrissage.
  send('pointerdown', 180, 400);
  send('pointermove', 160, 396);
  send('pointermove', 140, 394);
  send('pointermove', 136, 354);
  send('pointerup', 136, 354);
  assert.deepEqual(actions, ['left']);

  // Le geste suivant, franchement vers le haut, saute : rien n'est perdu entre
  // les deux, la diagonale en moins.
  actions.length = 0;
  send('pointerdown', 200, 400);
  send('pointermove', 198, 340);
  send('pointerup', 198, 340);
  assert.deepEqual(actions, ['jump']);

  // Un geste détaché ne pilote plus rien (changement de page, monde détruit).
  actions.length = 0;
  detach();
  send('pointerdown', 180, 400);
  send('pointermove', 60, 200);
  send('pointerup', 60, 200);
  assert.deepEqual(actions, []);
}));

test('dragging a long way across the real canvas changes one lane, the next swipe changes another', () => withDom('<div id="mount"><canvas id="track"></canvas></div>', (dom) => {
  const canvas = dom.window.document.getElementById('track');
  const actions = [];
  const detach = attachSwipeControls(canvas, (name) => actions.push(name));
  const send = (type, x, y, pointerId) => canvas.dispatchEvent(
    new dom.window.PointerEvent(type, { clientX: x, clientY: y, pointerId, bubbles: true, cancelable: true }),
  );

  send('pointerdown', 40, 400, 5);
  for (let x = 50; x <= 360; x += 10) send('pointermove', x, 400, 5);
  send('pointerup', 360, 400, 5);
  assert.deepEqual(actions, ['right'], 'un seul geste, une seule voie');

  send('pointerdown', 300, 400, 6);
  for (let x = 290; x >= 40; x -= 10) send('pointermove', x, 400, 6);
  send('pointerup', 40, 400, 6);
  assert.deepEqual(actions, ['right', 'left'], 'le geste suivant compte tout de suite');
  detach();
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
