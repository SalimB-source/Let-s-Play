/**
 * Contrôle « boucle souls » (M2) — logique pure, sans dépendance.
 *   npm run check:souls-prog
 */
import assert from 'node:assert/strict';
import {
  PROGRESS, createProgress, gainSouls, die, stainNear, atBonfire,
  rest, drinkFlask, levelCost, tryLevelUp, maxHp, staminaMax, strMult,
} from '../src/games/soulsProgress.js';

// ── État initial ──────────────────────────────────────────────────────
const p = createProgress();
assert.equal(p.souls, 0);
assert.equal(p.flask, PROGRESS.flaskMax);
assert.equal(p.bloodstain, null);
assert.equal(p.deaths, 0);
assert.equal(maxHp(p), 100);
assert.equal(staminaMax(p), 100);
assert.equal(strMult(p), 1);

// ── Gain d'âmes ───────────────────────────────────────────────────────
assert.equal(gainSouls(p, PROGRESS.enemySouls), 150);
assert.equal(p.souls, 150);
assert.equal(gainSouls(p, -40), 0, 'les gains négatifs sont ignorés');
assert.equal(p.souls, 150);

// ── Mort → bloodstain ────────────────────────────────────────────────
const dropped = die(p, 3.5, -4.25);
assert.equal(dropped, 150);
assert.equal(p.souls, 0, 'les âmes tombent au sol');
assert.deepEqual(p.bloodstain, { x: 3.5, z: -4.25, souls: 150 });
assert.equal(p.flask, PROGRESS.flaskMax, 'la flasque se recharge à la mort');
assert.equal(p.deaths, 1);

// Mourir à 0 âme AVANT récupération : le bloodstain est écrasé (perdu)
die(p, 1, 1);
assert.equal(p.bloodstain, null, 'seconde mort sans âme = perte du stain');

// ── Récupération du bloodstain ────────────────────────────────────────
gainSouls(p, 90);
die(p, -2, 5);
assert.equal(stainNear(p, 0, 0), 0, 'trop loin du stain');
assert.ok(stainNear(p, -2, 5) > 0, 'à portée : récupéré');
assert.equal(p.bloodstain, null);
assert.equal(p.souls, 90);

// ── Flasque ───────────────────────────────────────────────────────────
const p2 = createProgress();
assert.equal(drinkFlask(p2), PROGRESS.flaskHeal);
assert.equal(drinkFlask(p2), PROGRESS.flaskHeal);
assert.equal(drinkFlask(p2), PROGRESS.flaskHeal);
assert.equal(drinkFlask(p2), 0, 'flasque vide');
rest(p2);
assert.equal(p2.flask, PROGRESS.flaskMax);

// ── Feu ───────────────────────────────────────────────────────────────
assert.ok(atBonfire(0, 2.5), 'au pied du feu');
assert.ok(!atBonfire(0, 3.5), 'trop loin');

// ── Niveaux ───────────────────────────────────────────────────────────
const p3 = createProgress();
const c0 = levelCost(0);
assert.equal(c0, 60, 'premier niveau : 60 âmes');
assert.ok(levelCost(1) > c0, 'courbe croissante');
const poor = tryLevelUp(p3, 'vit');
assert.equal(poor.ok, false, 'pas assez d’âmes');
assert.equal(poor.cost, c0, 'le coût est renvoyé pour l’UI');
gainSouls(p3, 200);
const up = tryLevelUp(p3, 'vit');
assert.equal(up.ok, true);
assert.equal(p3.souls, 140);
assert.equal(p3.level, 1);
assert.equal(maxHp(p3), 115, '+15 PV par Vitalité');
assert.equal(tryLevelUp(p3, 'inconnue').ok, false, 'stat inconnue refusée');
gainSouls(p3, 1000);
tryLevelUp(p3, 'end');
assert.equal(staminaMax(p3), 110);
tryLevelUp(p3, 'str');
assert.equal(strMult(p3), 1.12);
assert.equal(Math.round(strMult(p3) * 100), 112);

console.log('SOULS-PROG OK — gain, mort, stain, flasque, feu, niveaux');
