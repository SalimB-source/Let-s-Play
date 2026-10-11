import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startRpgTouchDrag } from '../src/games/rpgTouchDrag.js';

function setup(options = {}) {
  const dom = new JSDOM('<button><img src="card.jpg"></button><div id="target"></div>');
  const { window } = dom;
  const source = window.document.querySelector('button');
  const target = window.document.querySelector('#target');
  const calls = [];
  const cleanup = startRpgTouchDrag({ pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 100, ...options }, {
    source,
    targetAt: (x, y) => y < 80 ? target : null,
    onStart: () => calls.push('start'),
    onHover: () => {},
    onDrop: (node) => { assert.equal(node, target); calls.push('drop'); },
    onEnd: () => calls.push('end'),
  });
  const send = (type, x = 50, y = 40, id = 1) => {
    const event = new window.Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x, clientY: y });
    window.dispatchEvent(event);
  };
  return { dom, window, calls, cleanup, send };
}

test('touch and pen lift, highlight and commit exactly once; ghost is removed', () => {
  for (const pointerType of ['touch', 'pen']) {
    const s = setup({ pointerType });
    s.send('pointermove');
    assert.ok(s.window.document.querySelector('.rpg-touch-drag-ghost'));
    assert.ok(s.window.document.querySelector('.is-touch-drop-target'));
    s.send('pointerup');
    s.send('pointerup');
    assert.deepEqual(s.calls, ['start', 'drop', 'end']);
    assert.equal(s.window.document.querySelector('.rpg-touch-drag-ghost'), null);
    assert.equal(s.window.document.querySelector('.is-touch-drop-target'), null);
    const click = new s.window.MouseEvent('click', { bubbles: true, cancelable: true });
    s.window.document.querySelector('button').dispatchEvent(click);
    assert.equal(click.defaultPrevented, true);
    s.dom.window.close();
  }
});

test('tap, horizontal scrolling and mouse do not play cards', () => {
  for (const mode of ['tap', 'scroll', 'mouse']) {
    const s = setup({ pointerType: mode === 'mouse' ? 'mouse' : 'touch' });
    if (mode === 'scroll') s.send('pointermove', 90, 98);
    s.send('pointerup', 50, 100);
    assert.deepEqual(s.calls, []);
    s.dom.window.close();
  }
});

test('cancel, blur, invalid drop and unmount never commit', () => {
  for (const mode of ['pointercancel', 'blur', 'invalid', 'unmount']) {
    const s = setup();
    s.send('pointermove');
    if (mode === 'invalid') s.send('pointerup', 50, 100);
    else if (mode === 'unmount') s.cleanup();
    else s.send(mode);
    assert.deepEqual(s.calls, ['start', 'end']);
    assert.equal(s.window.document.querySelector('.rpg-touch-drag-ghost'), null);
    s.dom.window.close();
  }
});

test('another finger cannot move or release the card', () => {
  const s = setup();
  s.send('pointermove', 50, 40, 2);
  assert.deepEqual(s.calls, []);
  s.send('pointermove');
  s.send('pointerup', 50, 40, 2);
  assert.deepEqual(s.calls, ['start']);
  s.cleanup();
  s.dom.window.close();
});
