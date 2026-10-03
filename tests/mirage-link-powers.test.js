import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { LANE_SPACING } from '../src/games/mirageRules.js';
import {
  LINK_BOMB_AOE_RADIUS,
  LINK_BOMB_AOE_TILES,
  LINK_BOMB_BLAST_DURATION,
  LINK_BOMB_FUSE_DURATION,
  LINK_HOOK_FLIGHT_DURATION,
  LINK_HOOK_TETHER_DURATION,
  LINK_TRIFORCE_FLIGHT_DURATION,
  LINK_TRIFORCE_IMPACT_DURATION,
  disposeLinkPower,
  makeLinkBomb,
  makeLinkHook,
  makeLinkTriforce,
  updateLinkBombVisual,
  updateLinkHookVisual,
  updateLinkTriforceVisual,
} from '../src/games/mirageLinkPowers.js';
import { miragePowerIcon } from '../src/games/miragePowerIcons.js';
import { POWER_UPS } from '../src/games/mirageRules.js';
import { CLOUD_CHOCOBO_INDEX, LINK_EPONA_INDEX } from '../src/games/mirageCharacters.js';
import { slowEffectFor, slowHitMessage, stunEffectFor, stunHitMessage } from '../src/games/mirageRooms.js';

const STEP = 1 / 60;

/** Fait avancer un effet frame par frame ; renvoie le temps total et les temps de rappel. */
function runEffect(visual, projectile, update, limit = 8) {
  const fired = [];
  let elapsed = 0;
  const hooks = new Proxy({}, {
    get: (_target, name) => (...args) => { fired.push({ name: String(name), at: elapsed, args }); },
  });
  while (elapsed < limit) {
    const done = update(visual, projectile, STEP, hooks);
    elapsed += STEP;
    if (done) return { elapsed, fired };
  }
  return { elapsed: Infinity, fired };
}

test('la bombe explose au bout de 1,5 s et balaie 2 cases', () => {
  assert.equal(LINK_BOMB_FUSE_DURATION, 1.5, 'la mèche brûle 1,5 s');
  assert.equal(LINK_BOMB_AOE_TILES, 2, 'portée de 2 cases');
  assert.equal(LINK_BOMB_AOE_RADIUS, 2 * LANE_SPACING, '2 cases = deux écarts de voie');

  const visual = makeLinkBomb();
  const projectile = { age: 0, phase: 'fuse' };
  assert.equal(visual.userData.bomb.visible, true, 'la bombe est posée, bien visible');
  assert.equal(visual.userData.blast.visible, false, 'l’explosion attend la fin de la mèche');
  const { elapsed, fired } = runEffect(visual, projectile, (v, p, dt, hooks) => updateLinkBombVisual(v, p, dt, hooks));
  assert.equal(fired.length, 1, 'une seule déflagration');
  assert.equal(fired[0].name, 'onExplode');
  assert.ok(Math.abs(fired[0].at - LINK_BOMB_FUSE_DURATION) < 0.05,
    `l’explosion part à 1,5 s (mesuré : ${fired[0].at.toFixed(2)} s)`);
  assert.ok(Math.abs(elapsed - (LINK_BOMB_FUSE_DURATION + LINK_BOMB_BLAST_DURATION)) < 0.05,
    `l’effet dure mèche + explosion (${elapsed.toFixed(2)} s)`);
  assert.equal(visual.userData.bomb.visible, false, 'la bombe disparaît dans l’explosion');
  assert.ok(visual.userData.ring.scale.x > LANE_SPACING, 'l’anneau marque la portée de 2 cases');
  disposeLinkPower(visual);
});

test('le grappin s’accroche à la cible, puis la lâche', () => {
  const visual = makeLinkHook();
  const from = new THREE.Vector3(0, 2.1, 0);
  const to = new THREE.Vector3(1.6, 2.1, -9);
  const projectile = { age: 0, phase: 'flight', start: from.clone() };
  const { elapsed, fired } = runEffect(visual, projectile, (v, p, dt, hooks) =>
    updateLinkHookVisual(v, p, dt, from, to, hooks));
  assert.equal(fired.length, 1, 'le crochet s’accroche une seule fois');
  assert.equal(fired[0].name, 'onAttach');
  assert.ok(Math.abs(fired[0].at - LINK_HOOK_FLIGHT_DURATION) < 0.05,
    `le crochet arrive au bout du vol (${fired[0].at.toFixed(2)} s)`);
  assert.ok(Math.abs(elapsed - (LINK_HOOK_FLIGHT_DURATION + LINK_HOOK_TETHER_DURATION)) < 0.05,
    `vol + traction (${elapsed.toFixed(2)} s)`);
  // Une fois accroché, le crochet colle au dos de la cible.
  assert.ok(visual.userData.claw.position.distanceTo(to) < 0.5, 'le crochet suit la cible');
  disposeLinkPower(visual);
});

test('la Triforce fonce sur l’adversaire et éclate au contact', () => {
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
  const visual = makeLinkTriforce();
  const target = new THREE.Vector3(0, 2, -12);
  const projectile = { age: 0, phase: 'flight', spin: 0, start: new THREE.Vector3(0, 2, -1) };
  const { elapsed, fired } = runEffect(visual, projectile, (v, p, dt, hooks) =>
    updateLinkTriforceVisual(v, p, dt, target, camera, hooks));
  assert.equal(fired.length, 1, 'un seul impact');
  assert.equal(fired[0].name, 'onImpact');
  assert.ok(Math.abs(fired[0].at - LINK_TRIFORCE_FLIGHT_DURATION) < 0.05,
    `la Triforce touche au bout du vol (${fired[0].at.toFixed(2)} s)`);
  assert.ok(Math.abs(elapsed - (LINK_TRIFORCE_FLIGHT_DURATION + LINK_TRIFORCE_IMPACT_DURATION)) < 0.05,
    `vol + éclat (${elapsed.toFixed(2)} s)`);
  assert.ok(visual.position.distanceTo(target) < 0.01, 'l’éclat a lieu sur l’adversaire');
  disposeLinkPower(visual);
});

test('les trois techniques de Link ont leurs icônes dédiées', () => {
  assert.equal(miragePowerIcon(POWER_UPS.SHIELD, 'link').label, 'Bombe à mèche');
  assert.equal(miragePowerIcon(POWER_UPS.LASSO, 'link').label, 'Grappin');
  assert.equal(miragePowerIcon(POWER_UPS.PISTOL, 'link').label, 'Triforce');
  // Le Turbo reste celui de tout le monde, et le cavalier standard garde le sien.
  assert.equal(miragePowerIcon(POWER_UPS.BOOST, 'link').variant, undefined);
  assert.equal(miragePowerIcon(POWER_UPS.LASSO, 'standard').label, 'Lasso');
  assert.equal(miragePowerIcon(POWER_UPS.LASSO, 'cloud').label, 'Onde d’épée dorée');
});

test('en ligne, la victime voit la bonne technique de Link', () => {
  assert.equal(slowEffectFor(LINK_EPONA_INDEX), 'link-hook');
  assert.equal(slowEffectFor(CLOUD_CHOCOBO_INDEX), 'cloud-wave');
  assert.equal(slowEffectFor(0), 'lasso');
  assert.equal(stunEffectFor(LINK_EPONA_INDEX), 'link-triforce');
  assert.equal(stunEffectFor(LINK_EPONA_INDEX, 'link-bomb'), 'link-bomb', 'la bombe garde son effet propre');
  assert.equal(stunEffectFor(0, 'link-bomb'), 'link-bomb');
  assert.equal(stunEffectFor(CLOUD_CHOCOBO_INDEX), 'cloud-cross');
  assert.match(slowHitMessage(LINK_EPONA_INDEX, 'Sofia', 'Karim'), /grappin/);
  assert.match(stunHitMessage(LINK_EPONA_INDEX, 'Sofia', 'Karim'), /Triforce/);
  assert.match(stunHitMessage(LINK_EPONA_INDEX, 'Sofia', 'Karim', 'link-bomb'), /bombe/i);
});
