import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sardiniaTerrace } from '../src/games/sardiniaStage.js';

test('Costa Omertà keeps seated café guests and parasols on the left, off the playable lanes', () => {
  for (let index = 0; index < 10; index++) {
    const terrace = sardiniaTerrace(index);
    assert.equal(terrace.position.z, 6 - index * 11);
    assert.equal(terrace.userData.speedFactor, 1);
    const guests = [];
    let canvasPanels = 0;
    terrace.updateMatrixWorld(true);
    terrace.traverse(object => {
      if (object.userData.terraceGuest) guests.push(object);
      if (object.isMesh && object.material?.side === THREE.DoubleSide) canvasPanels++;
      if (object.isMesh) {
        const bounds = new THREE.Box3().setFromObject(object);
        // The playable track begins at x = -4.2; nothing may drift into it.
        assert.ok(bounds.max.x < -4.2, `terrace mesh crosses into the track (x=${bounds.max.x})`);
      }
    });
    assert.equal(guests.length, index % 2 === 0 ? 4 : 2);
    assert.equal(canvasPanels, 10);
  }
});
