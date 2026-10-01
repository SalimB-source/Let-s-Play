/**
 * Contrôle « le Roi sur son trône » — IA pure.
 *   npm run check:souls-throne
 * Assis et intouchable → se lève quand on approche → chasse ; il se rassoit
 * au repos ; la zone fait écran (la nef seule l'éveille).
 */
import assert from 'node:assert/strict';
import {
  ENEMY, BOSS, ENEMY_PHASES, createEnemyState, stepEnemy, damageEnemy, resetEnemy,
} from '../src/games/soulsCombat.js';
import { SPAWNS, STAGE, blockAggro } from '../src/games/soulsStage.js';

const DT = 1 / 60;
const spawn = SPAWNS.find((s) => s.boss);
const makeKing = () => {
  const e = createEnemyState(spawn.x, spawn.z);
  e.spec = { ...ENEMY, ...BOSS };
  e.hp = e.spec.maxHp;
  e.isBoss = true;
  e.baseSpec = { ...e.spec };
  e.name = spawn.name;
  e.seatYaw = spawn.yaw;
  e.yaw = spawn.yaw;
  e.phase = 'seated';
  return e;
};
const player = (z) => ({ x: 0, z });

assert.ok(ENEMY_PHASES.includes('seated') && ENEMY_PHASES.includes('rise'), 'phases déclarées');
assert.equal(BOSS.seated, true);

// ── 1. Assis : immobile, aucun événement, tant que personne n'approche ──
const king = makeKing();
for (let i = 0; i < 600; i++) {
  const ev = stepEnemy(king, player(-100), DT, { blockAggro: false });
  assert.equal(ev, null, 'aucun événement à distance');
}
assert.equal(king.phase, 'seated', 'il dort sur son trône');
assert.equal(king.x, spawn.x);
assert.equal(king.z, spawn.z);
assert.equal(king.yaw, Math.PI, 'regard vers la salle');

// ── 2. La zone fait écran : à la porte du château il ne bouge pas ───────
for (let i = 0; i < 60; i++) {
  stepEnemy(king, player(spawn.z + 5), DT, { blockAggro: true });
}
assert.equal(king.phase, 'seated', 'bloqué par la zone');
assert.equal(blockAggro(spawn, player(-80)), true);
assert.equal(blockAggro(spawn, player(-110)), false);

// ── 3. Intouchable assis (même à portée de lame) ─────────────────────────
const hp0 = king.hp;
assert.equal(damageEnemy(king, 40), 'armor', 'aucun dégât assis');
assert.equal(king.hp, hp0);
assert.equal(king.phase, 'seated');

// ── 4. Approche : il se lève (événement 'rise'), puis 'risen' ───────────
const near = player(spawn.z + BOSS.riseRange - 1);
const first = stepEnemy(king, near, DT, { blockAggro: false });
assert.equal(first, 'rise', 'événement « il se lève »');
assert.equal(king.phase, 'rise');
let events = [];
let frames = 0;
const riseFrames = Math.ceil(BOSS.riseDur / DT);
for (; frames < riseFrames + 5 && king.phase === 'rise'; frames++) {
  const ev = stepEnemy(king, near, DT, { blockAggro: false });
  if (ev) events.push(ev);
  if (frames === Math.floor(riseFrames / 2)) {
    // en plein lever : intouchable aussi
    assert.equal(damageEnemy(king, 999), 'armor', 'intouchable pendant le lever');
    assert.equal(king.hp, hp0);
  }
}
assert.deepEqual(events, ['risen'], 'un seul événement de fin');
assert.ok(Math.abs(frames - riseFrames) <= 2, `durée du lever ≈ ${BOSS.riseDur} s`);
assert.equal(king.phase, 'chase', 'puis il chasse');
// En se dressant il quitte son meuble (sinon il se bat à travers le dossier).
assert.ok(Math.abs(king.x - spawn.x) < 1e-9, 'il se lève dans l’axe du trône');
assert.ok(
  king.z - spawn.z > BOSS.riseAdvance - 0.25,
  `il descend du trône en se levant (${(king.z - spawn.z).toFixed(2)} m)`,
);
assert.equal(king.leftThrone, true, 'le trône redevient un obstacle pour lui');
assert.ok(king.jumpCd > 0, 'pas de bond immédiat');
// Il regarde l'intrus (yaw a tourné vers le joueur)
assert.ok(Math.cos(king.yaw - Math.PI) > 0.7, 'le regard reste tourné vers l’intrus');

// ── 5. Une fois debout il se bat normalement ────────────────────────────
const hpBefore = king.hp;
const result = damageEnemy(king, 40);
assert.ok(result === 'hit' || result === 'armor' || result === 'riposte', 'blessable debout');
assert.ok(king.hp < hpBefore, 'les dégâts passent');
let chased = 0;
for (let i = 0; i < 400; i++) {
  stepEnemy(king, player(spawn.z + 6), DT, { blockAggro: false });
  chased += Math.hypot(king.vx, king.vz) > 0.2 ? 1 : 0;
}
assert.ok(chased > 20, 'il marche vers le joueur');
assert.ok(king.z > spawn.z, 'il descend de l’estrade vers la nef (+Z)');

// ── 6. Phase 2 puis reset : il se rassoit, PV pleins, regard rétabli ───
const king2 = makeKing();
stepEnemy(king2, near, DT, { blockAggro: false });
for (let i = 0; i < riseFrames + 5; i++) stepEnemy(king2, near, DT, { blockAggro: false });
damageEnemy(king2, BOSS.maxHp * 0.6);
assert.equal(king2.phase2, true, 'phase 2 à mi-vie');
king2.yaw = 0.3;
resetEnemy(king2, spawn.x, spawn.z);
assert.equal(king2.phase, 'seated', 'il se rassoit sur le trône');
assert.equal(king2.hp, BOSS.maxHp);
assert.equal(king2.phase2, false);
assert.ok(Math.cos(king2.yaw - Math.PI) > 0.999, 'regard rétabli vers la salle');
assert.equal(king2.spec.seated, true);

// ── 7. Un garde normal n’est pas concerné ──────────────────────────────
const knight = createEnemyState(0, 0);
knight.spec = { ...ENEMY };
assert.equal(knight.phase, 'idle');
resetEnemy(knight, 0, 0);
assert.equal(knight.phase, 'idle', 'reset d’un garde = idle');

// ── 8. La portée d'éveil est cohérente avec la salle ────────────────────
const entranceDist = Math.hypot(0, STAGE.hall.maxZ - spawn.z);
assert.ok(BOSS.riseRange < entranceDist / 2, 'il laisse traverser une bonne partie de la nef');
assert.ok(BOSS.riseRange > BOSS.leapMax, 'il se lève avant d’être à portée de bond');

console.log('SOULS-THRONE OK — assis, intouchable, se lève, chasse, se rassoit au reset');
