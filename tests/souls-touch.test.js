import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  PAD_ACTIONS, STICK_DEAD_ZONE, STICK_RADIUS, STICK_RUN_AT, STICK_SLOW_WALK,
  TOUCH_QUEUE, attachLookPad, attachStick, moveFromStick, stickSpeedScale, stickVector,
} from '../src/games/soulsTouch.js';

/** jsdom n'a pas d'horloge de geste : la base du stick est au coin (0, 0). */
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

test('le stick traduit la position du doigt en direction, poussée et course', () => {
  const right = stickVector(STICK_RADIUS, 0);
  assert.equal(right.x, 1);
  assert.equal(right.y, 0);
  assert.equal(right.magnitude, 1);
  assert.equal(right.run, true, 'stick à fond : le chevalier court');

  // L'axe de l'écran est inversé : lever le doigt fait avancer.
  const up = stickVector(0, -STICK_RADIUS);
  assert.equal(up.y, 1);
  assert.equal(up.x, 0);
  assert.equal(up.run, true);

  // Une poussée partielle : direction pleine, magnitude réduite, pas de course.
  const half = stickVector(STICK_RADIUS / 2, 0);
  assert.equal(half.x, 1);
  assert.equal(half.magnitude, 0.5);
  assert.equal(half.run, false, `la course demande ${STICK_RUN_AT * 100} % de la course du stick`);

  // Au-delà du rayon, le doigt peut sortir de la base : rien ne grandit plus.
  const beyond = stickVector(STICK_RADIUS * 4, 0);
  assert.equal(beyond.magnitude, 1);

  // Doigt au centre (ou valeurs illisibles) : personne ne bouge.
  assert.deepEqual(stickVector(0, 0), { x: 0, y: 0, magnitude: 0, run: false });
  assert.deepEqual(stickVector(Number.NaN, 3), { x: 0, y: 0, magnitude: 0, run: false });
});

test('la zone morte protège d\'un doigt posé, et la poussée se ré-échelonne', () => {
  const idle = moveFromStick(stickVector(STICK_DEAD_ZONE * STICK_RADIUS * 0.9, 0));
  assert.deepEqual(idle, { x: 0, y: 0, magnitude: 0, run: false });

  const edge = moveFromStick(stickVector(STICK_DEAD_ZONE * STICK_RADIUS, 0));
  assert.equal(edge.magnitude, 0, 'pile sur la zone morte, le chevalier est immobile');

  const small = moveFromStick(stickVector(STICK_RADIUS * 0.5, 0));
  assert.ok(small.magnitude > 0 && small.magnitude < 0.5, 'la poussée repart du bord de la zone morte');
  assert.equal(small.x, 1, 'la direction reste unitaire — c’est la poussée qui nuance');
  assert.equal(small.run, false);

  const full = moveFromStick(stickVector(0, -STICK_RADIUS));
  assert.equal(full.magnitude, 1);
  assert.equal(full.y, 1);
  assert.equal(full.run, true);
});

test('une poussée partielle ralentit le pas, à fond il est pleine vitesse', () => {
  assert.equal(stickSpeedScale(0), STICK_SLOW_WALK);
  assert.equal(stickSpeedScale(1), 1);
  assert.ok(stickSpeedScale(0.5) > STICK_SLOW_WALK && stickSpeedScale(0.5) < 1);
  assert.equal(stickSpeedScale(3), 1, 'borné');
  assert.equal(stickSpeedScale(-1), STICK_SLOW_WALK, 'borné');
});

test('chaque bouton de la manette a sa commande clavier', () => {
  const expected = ['light', 'heavy', 'lock', 'flask', 'rest', 'dodge'];
  assert.deepEqual(PAD_ACTIONS.map((entry) => entry.action), expected);
  for (const entry of PAD_ACTIONS) {
    assert.equal(TOUCH_QUEUE[entry.action], entry.action, `${entry.id} remplit la file du monde`);
    assert.ok(entry.glyph && entry.text && entry.aria, `${entry.id} porte un dessin, un libellé et un nom accessible`);
  }
  // La ROULADE est le gros bouton, sous le pouce droit.
  assert.equal(PAD_ACTIONS.filter((entry) => entry.big).map((entry) => entry.id).join(), 'dodge');
  assert.equal(PAD_ACTIONS[PAD_ACTIONS.length - 1].id, 'dodge');
});

test('le stick suit le doigt, ramène le pommeau au centre et ignore un second doigt', () =>
  withDom('<div id="stick"><span id="knob"></span></div>', (dom) => {
    const element = dom.window.document.getElementById('stick');
    const knob = dom.window.document.getElementById('knob');
    const moves = [];
    let ends = 0;
    const detach = attachStick(element, {
      move: (vector) => moves.push(vector),
      end: () => { ends += 1; },
    }, { knob, knobTravel: 30 });

    const send = (type, x, y, pointerId = 7) => element.dispatchEvent(
      new dom.window.PointerEvent(type, { clientX: x, clientY: y, pointerId, bubbles: true, cancelable: true }),
    );

    send('pointerdown', STICK_RADIUS, 0);
    assert.equal(moves.at(-1).x, 1);
    assert.equal(moves.at(-1).run, true);
    assert.match(knob.style.transform, /translate3d\(30\.0px, 0\.0px, 0\)/);

    send('pointermove', 0, -STICK_RADIUS / 2);
    assert.equal(moves.at(-1).y, 1, 'la direction reste unitaire');
    assert.equal(moves.at(-1).magnitude, 0.5, 'la poussée, elle, se mesure');
    assert.equal(moves.at(-1).run, false);

    // Un second doigt ne prend pas la main.
    const before = moves.length;
    send('pointerdown', -40, 0, 9);
    send('pointermove', -40, 0, 9);
    assert.equal(moves.length, before);

    send('pointerup', 0, -STICK_RADIUS / 2);
    assert.equal(ends, 1, 'le doigt levé arrête le chevalier');
    assert.match(knob.style.transform, /translate3d\(0\.0px, 0\.0px, 0\)/);

    // Une capture perdue (appel entrant, geste système) relâche aussi le stick.
    send('pointerdown', 10, 0);
    element.dispatchEvent(new dom.window.Event('lostpointercapture', { bubbles: true }));
    assert.equal(ends, 2);

    detach();
    const afterDetach = moves.length;
    send('pointerdown', STICK_RADIUS, 0);
    send('pointermove', STICK_RADIUS, 0);
    assert.equal(moves.length, afterDetach, 'un stick détaché ne pilote plus rien');
  }));

test('le glissement de caméra livre les déplacements du doigt, jamais ceux de la souris', () =>
  withDom('<canvas id="view"></canvas>', (dom) => {
    const canvas = dom.window.document.getElementById('view');
    const looks = [];
    const detach = attachLookPad(canvas, (dx, dy) => looks.push([dx, dy]));

    const send = (type, x, y, pointerType) => canvas.dispatchEvent(
      new dom.window.PointerEvent(type, { clientX: x, clientY: y, pointerId: 3, pointerType, bubbles: true, cancelable: true }),
    );

    send('pointerdown', 200, 180, 'touch');
    send('pointermove', 224, 171, 'touch');
    assert.deepEqual(looks, [[24, -9]]);

    // Le relâchement ferme le geste : la suite du doigt ne pilote plus rien.
    send('pointerup', 224, 171, 'touch');
    send('pointermove', 300, 171, 'touch');
    assert.deepEqual(looks, [[24, -9]]);

    // La souris a son propre pilotage (pointer lock / glisser) : pas de doublon.
    send('pointerdown', 200, 180, 'mouse');
    send('pointermove', 260, 180, 'mouse');
    assert.deepEqual(looks, [[24, -9]]);

    detach();
    send('pointerdown', 200, 180, 'touch');
    send('pointermove', 260, 180, 'touch');
    assert.deepEqual(looks, [[24, -9]], 'un pad détaché ne tourne plus la caméra');
  }));
