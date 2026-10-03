import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { LANE_SPACING } from '../src/games/mirageRules.js';
import {
  LINK_BOMB_AOE_RADIUS,
  LINK_BOMB_AOE_TILES,
  LINK_BOMB_BLAST_DURATION,
  LINK_BOMB_FUSE_DURATION,
  LINK_BOMB_TOUCH_RADIUS,
  LINK_BOOMERANG_OUT_DURATION,
  LINK_BOOMERANG_RANGE,
  LINK_BOOMERANG_RETURN_DURATION,
  LINK_BOOMERANG_SLOW_DURATION,
  LINK_BOOMERANG_THROWS,
  LINK_TRIFORCE_FLIGHT_DURATION,
  LINK_TRIFORCE_IMPACT_DURATION,
  detonateLinkBomb,
  disposeLinkPower,
  linkBombTouched,
  makeLinkBomb,
  makeLinkBoomerang,
  makeLinkTriforce,
  updateLinkBombVisual,
  updateLinkBoomerangVisual,
  updateLinkTriforceVisual,
} from '../src/games/mirageLinkPowers.js';
import { miragePowerIcon } from '../src/games/miragePowerIcons.js';
import { POWER_UPS, consumePowerUp, createPowerUpState } from '../src/games/mirageRules.js';
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

test('un adversaire qui touche la bombe la fait sauter avant la fin de la mèche', () => {
  assert.ok(LINK_BOMB_TOUCH_RADIUS > 0 && LINK_BOMB_TOUCH_RADIUS < LINK_BOMB_AOE_RADIUS,
    'le contact est plus court que la portée de l’explosion');
  // Le contact se juge sur la distance au sol : un demi-écart de voie.
  const origin = { x: 0, z: 4 };
  const front = { x: 0, z: origin.z - LINK_BOMB_TOUCH_RADIUS + 0.01 };
  const beside = { x: LINK_BOMB_TOUCH_RADIUS - 0.01, z: origin.z };
  const far = { x: 0, z: origin.z - LINK_BOMB_AOE_RADIUS };
  assert.equal(linkBombTouched(origin, [front]), true, 'un cavalier qui arrive dessus la touche');
  assert.equal(linkBombTouched(origin, [beside]), true, 'de côté aussi');
  assert.equal(linkBombTouched(origin, [far]), false, 'à portée d’explosion, ce n’est pas un contact');
  assert.equal(linkBombTouched(origin, []), false, 'personne sur la piste');
  assert.equal(linkBombTouched(origin, undefined), false, 'pas de liste du tout');

  // Le contact allume la mèche d'un coup : la déflagration part tout de suite.
  const visual = makeLinkBomb();
  const projectile = { age: 0.42, phase: 'fuse' };
  const fired = [];
  const started = detonateLinkBomb(visual, projectile, { onExplode: () => fired.push(projectile.age) });
  assert.equal(started, true, 'la bombe détonne au contact');
  assert.equal(projectile.phase, 'blast', 'elle passe en déflagration');
  assert.equal(projectile.age, 0, 'la déflagration repart de zéro');
  assert.equal(visual.userData.bomb.visible, false, 'la sphère a disparu');
  assert.equal(visual.userData.ground.visible, false, 'le halo au sol aussi');
  assert.equal(visual.userData.blast.visible, true, 'l’explosion est révélée');
  assert.deepEqual(fired, [0], 'un seul rappel de déflagration');
  // Un second contact ne fait pas sauter deux fois la même bombe.
  assert.equal(detonateLinkBomb(visual, projectile, { onExplode: () => fired.push('bis') }), false);
  assert.equal(fired.length, 1);
  // La déflagration se termine normalement, comme après une mèche brûlée.
  const { elapsed } = runEffect(
    visual,
    projectile,
    (v, p, dt, hooks) => updateLinkBombVisual(v, p, dt, hooks),
  );
  assert.ok(Math.abs(elapsed - LINK_BOMB_BLAST_DURATION) < 0.05,
    `le contact laisse l’explosion finir (${elapsed.toFixed(2)} s)`);
  disposeLinkPower(visual);
});

test('le boomerang va tout droit quelques mètres puis revient à la main', () => {
  assert.equal(LINK_BOOMERANG_RANGE, 5 * LANE_SPACING, 'portée de 5 cases');
  assert.equal(LINK_BOOMERANG_THROWS, 2, 'deux lancers par charge');

  const visual = makeLinkBoomerang();
  const hand = new THREE.Vector3(0, 2.1, 0);
  const projectile = {
    age: 0,
    phase: 'out',
    start: hand.clone(),
    forward: new THREE.Vector3(0, 0, -1),
  };
  const { elapsed, fired } = runEffect(visual, projectile, (v, p, dt, hooks) =>
    updateLinkBoomerangVisual(v, p, dt, hand, hooks));
  assert.equal(fired.length, 1, 'un seul demi-tour');
  assert.equal(fired[0].name, 'onTurn');
  assert.ok(Math.abs(fired[0].at - LINK_BOOMERANG_OUT_DURATION) < 0.05,
    `le demi-tour a lieu au bout du vol (${fired[0].at.toFixed(2)} s)`);
  assert.ok(Math.abs(elapsed - (LINK_BOOMERANG_OUT_DURATION + LINK_BOOMERANG_RETURN_DURATION)) < 0.05,
    `aller + retour (${elapsed.toFixed(2)} s)`);
  assert.ok(visual.position.distanceTo(hand) < 0.08, 'le boomerang revient dans la main');
  assert.ok(projectile.apex.z < -LINK_BOOMERANG_RANGE * 0.9, 'il est allé tout droit devant');
  disposeLinkPower(visual);
});

test('le boomerang ralentit plus longtemps que le lasso standard', () => {
  assert.equal(LINK_BOOMERANG_SLOW_DURATION, 2.4);
  assert.ok(LINK_BOOMERANG_SLOW_DURATION > 1.5);
});

test('la barre jaune de Link donne deux lancers de boomerang', () => {
  const ready = { ...createPowerUpState(), lassoCharges: LINK_BOOMERANG_THROWS, lassoChargePoints: 10 };
  const first = consumePowerUp(ready, POWER_UPS.LASSO);
  assert.equal(first.used, true);
  assert.equal(first.state.lassoCharges, 1, 'il reste un lancer');
  const second = consumePowerUp(first.state, POWER_UPS.LASSO);
  assert.equal(second.state.lassoCharges, 0, 'les deux lancers sont dépensés');
  const third = consumePowerUp(second.state, POWER_UPS.LASSO);
  assert.equal(third.used, false, 'pas de troisième lancer gratuit');
});

test('la Triforce assemble trois triangles vers le haut puis éclate au contact', () => {
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
  const visual = makeLinkTriforce();
  assert.equal(visual.userData.triangles.length, 3, 'trois triangles d’or');
  const homes = visual.userData.triangleHome;
  assert.ok(homes[0][1] > homes[1][1], 'le triangle du haut est au-dessus');
  assert.ok(homes[1][0] < 0 && homes[2][0] > 0, 'les deux autres sont à gauche et à droite');
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
  const bomb = miragePowerIcon(POWER_UPS.SHIELD, 'link');
  const boomerang = miragePowerIcon(POWER_UPS.LASSO, 'link');
  const triforce = miragePowerIcon(POWER_UPS.PISTOL, 'link');
  assert.equal(bomb.label, 'Bombe à mèche');
  assert.equal(boomerang.label, 'Boomerang');
  assert.equal(triforce.label, 'Triforce');
  assert.match(boomerang.src, /\/icons\/mirage-rush\/link-boomerang\.svg\?v=2$/);
  assert.match(triforce.src, /\/icons\/mirage-rush\/link-triforce\.svg\?v=2$/);
  for (const filename of ['link-boomerang.svg', 'link-triforce.svg']) {
    const svg = readFileSync(new URL(`../public/icons/mirage-rush/${filename}`, import.meta.url), 'utf8');
    assert.match(svg, /^<svg\s/, `${filename} existe dans public et contient un SVG`);
  }
  // Le Turbo reste celui de tout le monde, et le cavalier standard garde le sien.
  assert.equal(miragePowerIcon(POWER_UPS.BOOST, 'link').variant, undefined);
  assert.equal(miragePowerIcon(POWER_UPS.LASSO, 'standard').label, 'Lasso');
  assert.equal(miragePowerIcon(POWER_UPS.LASSO, 'cloud').label, 'Onde d’épée dorée');
});

test('le monde guette le contact avec la bombe à chaque frame de mèche', async () => {
  const { readFile } = await import('node:fs/promises');
  const world = await readFile(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8');
  // Le contact se juge sur les positions au sol des adversaires, à chaque frame…
  assert.match(world, /projectile\.phase === 'fuse' && linkBombTouched\(projectile\.origin, linkBombRiderPoints\(\)\)/);
  assert.match(world, /rival\.mesh\.position\.x/);
  assert.match(world, /rival\.mesh\.position\.z/);
  assert.match(world, /peer\.user_id === net\.userId/);
  // …et la détonation emprunte le même chemin que la fin de mèche.
  assert.match(world, /detonateLinkBomb\(projectile\.visual, projectile, \{/);
  assert.match(world, /onExplode: \(\) => explodeLinkBomb\(projectile\)/);
  assert.match(world, /callbacks\.linkStrike\?\.\(\{ kind: 'bomb' \}\);/);
});

test('en ligne, la victime voit la bonne technique de Link', () => {
  assert.equal(slowEffectFor(LINK_EPONA_INDEX), 'link-boomerang');
  assert.equal(slowEffectFor(CLOUD_CHOCOBO_INDEX), 'cloud-wave');
  assert.equal(slowEffectFor(0), 'lasso');
  assert.equal(stunEffectFor(LINK_EPONA_INDEX), 'link-triforce');
  assert.equal(stunEffectFor(LINK_EPONA_INDEX, 'link-bomb'), 'link-bomb', 'la bombe garde son effet propre');
  assert.equal(stunEffectFor(0, 'link-bomb'), 'link-bomb');
  assert.equal(stunEffectFor(CLOUD_CHOCOBO_INDEX), 'cloud-cross');
  assert.match(slowHitMessage(LINK_EPONA_INDEX, 'Sofia', 'Karim'), /boomerang/);
  assert.match(stunHitMessage(LINK_EPONA_INDEX, 'Sofia', 'Karim'), /Triforce/);
  assert.match(stunHitMessage(LINK_EPONA_INDEX, 'Sofia', 'Karim', 'link-bomb'), /bombe/i);
});
