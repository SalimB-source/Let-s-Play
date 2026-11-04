import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { positionSideMirrorCamera, createDrivingSideMirrors, renderDrivingSideMirrors, disposeDrivingSideMirrors } from '../src/games/drivingSideMirrors.js';
function canvas() {
  const calls = [];
  const context = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: () => {}, save: () => {}, restore: () => {},
    setTransform: (...args) => calls.push(args), drawImage: () => {} };
  return { width: 256, height: 128, dataset: {}, calls, getContext: () => context };
}
function renderer() {
  return { target: null, shadowMap: { autoUpdate: true }, renders: 0,
    getRenderTarget() { return this.target; }, setRenderTarget(target) { this.target = target; },
    render() { this.renders++; }, readRenderTargetPixels(_target, _x, _y, _w, _h, pixels) { pixels.fill(150); } };
}
test('left and right rear cameras sit on the corresponding side and follow the vehicle heading', () => {
  const vehicle = new THREE.Group(); vehicle.position.set(15, 2, 25); vehicle.rotation.y = -Math.PI / 2;
  const left = new THREE.PerspectiveCamera(), right = new THREE.PerspectiveCamera();
  positionSideMirrorCamera(left, vehicle, 'left'); positionSideMirrorCamera(right, vehicle, 'right');
  assert.ok(left.position.z < vehicle.position.z);
  assert.ok(right.position.z > vehicle.position.z);
  for (const camera of [left, right]) assert.ok(camera.getWorldDirection(new THREE.Vector3()).dot(new THREE.Vector3(-1, 0, 0)) > .9);
  const previousX = left.position.x; vehicle.position.x += 10;
  positionSideMirrorCamera(left, vehicle, 'left'); assert.ok(Math.abs(left.position.x - previousX - 10) < 1e-8);
});
test('live views use separate render targets, flip real mirror images and restore renderer state', () => {
  const mirrors = createDrivingSideMirrors(canvas), graphics = renderer(), vehicle = new THREE.Group();
  const output = { left: canvas(), right: canvas() }, originalTarget = {}; graphics.target = originalTarget;
  assert.notEqual(mirrors.views.left.target, mirrors.views.right.target);
  renderDrivingSideMirrors(mirrors, graphics, new THREE.Scene(), vehicle, output, 0);
  assert.equal(graphics.renders, 2);
  for (const view of Object.values(output)) {
    assert.equal(view.dataset.status, 'ready');
    assert.deepEqual(view.calls[0], [-1, 0, 0, -1, 256, 128]);
  }
  assert.equal(vehicle.visible, true); assert.equal(graphics.target, originalTarget); assert.equal(graphics.shadowMap.autoUpdate, true);
  renderDrivingSideMirrors(mirrors, graphics, new THREE.Scene(), vehicle, output, 30);
  assert.equal(graphics.renders, 2);
  renderDrivingSideMirrors(mirrors, graphics, new THREE.Scene(), vehicle, output, 61);
  assert.equal(graphics.renders, 3);
  disposeDrivingSideMirrors(mirrors);
});
test('a mirror failure restores the scene instead of hiding the car or crashing driving', () => {
  const mirrors = createDrivingSideMirrors(canvas), graphics = renderer(), vehicle = new THREE.Group();
  const output = { left: canvas(), right: canvas() };
  graphics.readRenderTargetPixels = () => { throw new Error('GPU unavailable'); };
  renderDrivingSideMirrors(mirrors, graphics, new THREE.Scene(), vehicle, output, 0);
  assert.equal(mirrors.failed, true); assert.equal(vehicle.visible, true);
  assert.equal(graphics.target, null); assert.equal(graphics.shadowMap.autoUpdate, true);
  assert.equal(output.left.dataset.status, 'unavailable'); assert.equal(output.right.dataset.status, 'unavailable');
  disposeDrivingSideMirrors(mirrors);
});
test('restart disposal frees both render targets and their canvas buffers', () => {
  const mirrors = createDrivingSideMirrors(canvas); let disposed = 0;
  Object.values(mirrors.views).forEach((view) => view.target.addEventListener('dispose', () => disposed++));
  disposeDrivingSideMirrors(mirrors);
  assert.equal(disposed, 2);
  assert.equal(mirrors.views.left.scratch.width, 0);
  assert.equal(mirrors.views.right.scratch.height, 0);
});
