/**
 * Contrôle « attaque de saut du boss » (M3) — FSM pure, sans rendu.
 *   npm run check:souls-jump
 */
import assert from 'node:assert/strict';
import {
  ENEMY, BOSS, ENEMY_PHASES,
  createEnemyState, stepEnemy, damageEnemy, resetEnemy,
} from '../src/games/soulsCombat.js';

const DT = 0.016;
const step = (e, p, n = 1) => {
  let ev = null;
  for (let i = 0; i < n; i++) ev = stepEnemy(e, p, DT) ?? ev;
  return ev;
};

// ── Le boss est bien équipé du bond ─────────────────────────────────
assert.ok(BOSS.windup2 > 0 && BOSS.leapDur > 0 && BOSS.jumpArcCos < 0,
  'BOSS exposes the jump attack');
for (const p of ['windup2', 'leap', 'strike2']) {
  assert.ok(ENEMY_PHASES.includes(p), `phase ${p} in FSM`);
}

const makeBoss = () => {
  const e = createEnemyState(0, -13.5);
  e.spec = { ...ENEMY, ...BOSS };
  e.baseSpec = { ...e.spec };
  e.isBoss = true;
  return e;
};

// ──1. Approche : idle → chase → windup2 (bande de bond) ────────────
const player = { x: 0, z: -8 }; // 5,5 m — ni contact ni hors portée
const boss = makeBoss();
step(boss, player); // aggro
assert.equal(boss.phase, 'chase');
step(boss, player);
assert.equal(boss.phase, 'windup2', 'bond déclenché à distance de vol');

// ──2. Accroupissement : position figée pendant l'élan ───────────────
const px = boss.x, pz = boss.z;
step(boss, player, Math.ceil(BOSS.windup2 / DT));
assert.equal(boss.phase, 'leap');
assert.equal(boss.x, px);
assert.equal(boss.z, pz);
assert.equal(boss.jumpCd, BOSS.jumpCdMax, 'cd posé au lancement');
// arrivée figée = position du joueur au lancement (esquivable)
assert.ok(Math.abs(boss.leapToX - player.x) < 1e-9);
assert.ok(Math.abs(boss.leapToZ - player.z) < 1e-9);

// ──3. Vol : parabole, apogée ≈ leapHeight, position interpolée ──────
let maxLeap = 0;
let stepsLeft = Math.ceil(BOSS.leapDur / DT) + 2;
let ev = null;
while (stepsLeft-- > 0 && boss.phase === 'leap') {
  ev = stepEnemy(boss, player, DT) ?? ev;
  maxLeap = Math.max(maxLeap, boss.leapY);
}
assert.ok(maxLeap >= BOSS.leapHeight * 0.9 && maxLeap <= BOSS.leapHeight * 1.01,
  `apogée ≈ ${BOSS.leapHeight} m (vu ${maxLeap.toFixed(2)})`);
assert.equal(ev, 'slam', "événement « slam » à l'impact");
assert.equal(boss.phase, 'strike2');
assert.equal(boss.leapY, 0, 'posé au sol');
assert.ok(Math.abs(boss.x - player.x) < 1e-9 && Math.abs(boss.z - player.z) < 1e-9,
  'atterrit exactement au point figé');

// ──4. Impact puis récupération ouverte (fenêtre de riposte) ─────────
step(boss, player, Math.ceil(BOSS.active2 / DT)); // ni plus (le cd décrémenterait)
assert.equal(boss.phase, 'recover');
assert.equal(boss.cooldown, BOSS.cooldown);

// ──5. Super-armure pendant l'élan et l'impact ───────────────────────
const armored1 = makeBoss();
armored1.phase = 'windup2';
assert.equal(damageEnemy(armored1, 50), 'armor');
assert.equal(armored1.phase, 'windup2', 'accroupissement ininterrompu');
const armored2 = makeBoss();
armored2.phase = 'strike2';
assert.equal(damageEnemy(armored2, 50), 'armor');
assert.equal(armored2.phase, 'strike2', 'impact ininterrompu');

// ──6. En vol : coupable — désynchronisé et plaqué au sol ────────────
const air = makeBoss();
air.phase = 'leap';
air.leapY = 1.5;
const res = damageEnemy(air, 20);
assert.equal(res, 'hit');
assert.equal(air.phase, 'recover');
assert.ok(air.stagger > 0, 'touché en l’air = désarçonné');

// ──7. Le cd empêche le spam de bonds ────────────────────────────────
const spammed = makeBoss();
spammed.phase = 'chase';
spammed.x = 0; spammed.z = -14;           //7 m de la cible
spammed.jumpCd = BOSS.jumpCdMax;
step(spammed, { x: 0, z: -8 });
assert.equal(spammed.phase, 'chase', 'pas de bond pendant le cd');

// ──8. Un mob ordinaire (sans windup2) ne bondit jamais ─────────────
const mob = createEnemyState(0, -8);       // spec = ENEMY, pas de windup2
mob.phase = 'chase';
step(mob, { x: 0, z: -14 });
assert.notEqual(mob.phase, 'windup2');

// ──9. Phase 2 : bond plus rapide, cd plus court ─────────────────────
const p2 = makeBoss();
p2.hp = BOSS.maxHp / 2;
const r = damageEnemy(p2, 1);              // franchit les 50 %
assert.equal(p2.phase2, true);
assert.ok(p2.spec.windup2 < BOSS.windup2, 'élan plus court en phase 2');
assert.ok(p2.spec.leapDur < BOSS.leapDur, 'vol plus rapide en phase 2');
assert.equal(p2.spec.jumpCdMax, 3);
assert.ok(r === 'armor' || r === 'hit' || r === 'riposte');

// ──10. reset : le boss repart propre ────────────────────────────────
resetEnemy(p2, 0, -13.5);
assert.equal(p2.jumpCd, 0);
assert.equal(p2.leapY, 0);
assert.equal(p2.phase2, false);
assert.equal(p2.spec.windup2, BOSS.windup2);

console.log('SOULS-JUMP OK — élan, parabole, impact, armure, cd, phase 2');
