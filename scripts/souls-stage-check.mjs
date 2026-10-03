/**
 * Contrôle « Le Chemin du Roi » (niveau) — logique pure, sans rendu.
 *   npm run check:souls-stage
 *
 * Camp → route → chapelle (2 gardes + coffre + clé) → forêt → château →
 * grand portail (clé) → salle des piliers → Roi sur son trône.
 */
import assert from 'node:assert/strict';
import {
  STAGE, BONFIRES, stageHeight, zoneAt, stageColliders, portalCollider,
  treeColliders, forestTrees, SPAWNS, MOB_AGGRO, blockAggro, createQuest,
  interact, interactionPrompt, atChest, atPortal, nearestBonfire, distToPolyline,
} from '../src/games/soulsStage.js';
import { resolveCollisions, PLAYER_RADIUS } from '../src/games/soulsRules.js';
import { ENEMY, BOSS } from '../src/games/soulsCombat.js';

const R = PLAYER_RADIUS ?? 0.35;
const blocked = (x, z, colliders, r = R, enemy = false) => {
  const pos = { x, z };
  const list = enemy ? colliders.filter((c) => !c.playerOnly) : colliders;
  resolveCollisions(pos, r, list);
  return Math.hypot(pos.x - x, pos.z - z) > 1e-6;
};

// Colliders du jeu (camp hors murs : le camp est géré par makeWalls).
const trees = forestTrees();
const world = [...stageColliders(), ...treeColliders(trees)];
const closed = [...world, portalCollider()];

// ── 1. Zones ───────────────────────────────────────────────────────────
assert.equal(zoneAt(0, 0), 'camp', 'le feu est au camp');
assert.equal(zoneAt(0, 6.5), 'camp', 'départ au camp');
assert.equal(zoneAt(-20, -31), 'room', 'chapelle');
assert.equal(zoneAt(-12.5, -31), 'room', 'seuil de la chapelle');
assert.equal(zoneAt(-8, -31), 'outside', 'devant la porte de la chapelle = dehors');
assert.equal(zoneAt(6, -45), 'outside', 'forêt');
assert.equal(zoneAt(0, -105), 'hall', 'nef');
assert.equal(zoneAt(0, -89.5), 'outside', 'le portail lui-même est dehors');

// ── 2. Hauteurs : plat partout, sauf les deux marches de l’estrade ───────
assert.equal(stageHeight(0, 0), 0);
assert.equal(stageHeight(0, -60), 0);
assert.equal(stageHeight(0, -100), 0);
assert.equal(stageHeight(0, -120), STAGE.dais.a.y, 'première marche');
assert.equal(stageHeight(0, -123.4), STAGE.dais.b.y, 'le trône est sur la marche haute');
assert.equal(stageHeight(8, -123), 0, 'hors estrade = sol');
assert.ok(STAGE.dais.b.y - STAGE.dais.a.y < 0.2 && STAGE.dais.a.y < 0.2, 'marches franchissables');

// ── 3. Colliders : porte libre, murs pleins, portail scellé ──────────────
const room = STAGE.room;
assert.ok(!blocked(room.maxX + room.wallT / 2, room.doorZ, closed), 'porte de la chapelle libre');
assert.ok(blocked(room.maxX + room.wallT / 2, room.doorZ + 3.5, closed), 'mur est de la chapelle');
assert.ok(blocked(-20, room.minZ - 0.4, closed), 'mur nord de la chapelle');
assert.ok(blocked(room.minX - 0.3, -31, closed), 'mur du fond');
assert.ok(blocked(STAGE.chest.x, STAGE.chest.z, closed), 'le coffre est solide');
assert.ok(!blocked(STAGE.chest.x + 1.4, STAGE.chest.z, closed), 'devant le coffre = libre');
const gateZ = (STAGE.castle.zFront + STAGE.castle.zBack) / 2;
assert.ok(blocked(0, gateZ, closed), 'portail scellé = bloqué');
assert.ok(!blocked(0, gateZ, world), 'portail ouvert = libre');
assert.ok(blocked(STAGE.castle.portalHalf + 2, gateZ, world), 'façade pleine à côté du portail');
assert.ok(blocked(STAGE.hall.minX - 0.5, -105, world), 'mur ouest de la nef');
assert.ok(blocked(0, -125.8, world), 'mur du fond de la nef');
assert.ok(blocked(0, STAGE.throne.z, world), 'le trône bloque le joueur');
assert.ok(!blocked(0, STAGE.throne.z, world, 0.66, true), 'le Roi n’est pas bloqué par son propre trône');
for (const z of STAGE.hall.pillarZ) {
  assert.ok(blocked(STAGE.hall.pillarX, z, world), `pilier ${z}`);
  assert.ok(blocked(-STAGE.hall.pillarX, z, world), `pilier −${z}`);
}
assert.ok(!blocked(0, -105, world), 'allée centrale libre');

// ── 4. Quête : coffre → clé → portail ────────────────────────────────────
const q = createQuest();
assert.equal(q.hasKey, false);
assert.equal(interact(q, 0, 6.5), null, 'rien à faire au camp');
assert.equal(atChest(q, 0, -31), false, 'coffre trop loin');
assert.equal(atChest(q, STAGE.chest.x + 1.6, STAGE.chest.z), true, 'devant le coffre');
// portail sans clé
const sealed = interact(q, 0, -85);
assert.equal(sealed.kind, 'portal');
assert.equal(sealed.ok, false, 'portail scellé sans clé');
assert.equal(q.portalOpen, false);
assert.match(interactionPrompt(q, 0, -85).text, /scellé/, 'invite « scellé »');
// coffre
assert.equal(interactionPrompt(q, STAGE.chest.x + 1.6, STAGE.chest.z).text, 'E · ouvrir le coffre');
const got = interact(q, STAGE.chest.x + 1.6, STAGE.chest.z);
assert.equal(got.kind, 'chest');
assert.equal(q.hasKey, true, 'la clé est dans le coffre');
assert.equal(q.chestOpen, true);
assert.equal(interact(q, STAGE.chest.x + 1.6, STAGE.chest.z), null, 'coffre vide ensuite');
assert.equal(atChest(q, STAGE.chest.x + 1.6, STAGE.chest.z), false);
// portail avec clé
assert.match(interactionPrompt(q, 0, -85).text, /ouvrir le grand portail/);
assert.equal(atPortal(q, 0, -92), false, 'on ne l’ouvre pas depuis l’intérieur');
const opened = interact(q, 0, -85);
assert.equal(opened.ok, true);
assert.equal(q.portalOpen, true);
assert.equal(q.hasKey, false, 'la clé est consommée');
assert.equal(interactionPrompt(q, 0, -85), null, 'plus d’invite une fois ouvert');
// feux
const fire = BONFIRES[1];
assert.equal(nearestBonfire(fire.x + 1, fire.z).id, 'seuil');
assert.equal(nearestBonfire(0, 6.5), null);
assert.equal(createQuest().lit.seuil, false, 'second feu éteint au départ');
const q2 = createQuest();
assert.match(interactionPrompt(q2, fire.x + 1, fire.z).text, /allumer le feu/);
assert.equal(interact(q2, fire.x + 1, fire.z).kind, 'light');
assert.equal(q2.lit.seuil, true);
assert.equal(interactionPrompt(q2, fire.x + 1, fire.z), null, 'feu allumé : plus d’invite d’allumage');

// ── 5. Franchissabilité : BFS sur une grille de 0,4 m ─────────────────────
function reach(start, colliders) {
  const step = 0.4;
  const x0 = -37;
  const z0 = -130;
  const W = Math.ceil((49 - x0) / step);
  const H = Math.ceil((22 - z0) / step);
  const seen = new Uint8Array(W * H);
  const cell = (x, z) => [Math.round((x - x0) / step), Math.round((z - z0) / step)];
  const free = (i, j) => i >= 0 && j >= 0 && i < W && j < H
    && !blocked(x0 + i * step, z0 + j * step, colliders);
  const [si, sj] = cell(...start);
  assert.ok(free(si, sj), 'départ libre');
  const stack = [[si, sj]];
  seen[sj * W + si] = 1;
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H || seen[nj * W + ni]) continue;
      if (!free(ni, nj)) continue;
      seen[nj * W + ni] = 1;
      stack.push([ni, nj]);
    }
  }
  return (x, z) => {
    const [i, j] = cell(x, z);
    return i >= 0 && j >= 0 && i < W && j < H && seen[j * W + i] === 1;
  };
}
// Le camp a une porte nord : on la modélise (murs du camp hors module) par
// un point de départ sur la route, juste après la porte.
const fromGate = reach([0, -19], closed);
assert.ok(fromGate(0, -85), 'route → pied du portail');
assert.ok(fromGate(-20, -31), 'route → chapelle (par la porte)');
assert.ok(fromGate(STAGE.chest.x + 1.4, STAGE.chest.z), 'chapelle → devant le coffre');
assert.ok(fromGate(6.1, -45) && fromGate(10.4, -61.5), 'les guetteurs sont sur la route');
assert.ok(fromGate(-10, -80), 'second feu accessible');
assert.ok(!fromGate(0, -100), 'portail scellé : la nef est INACCESSIBLE');
assert.ok(!fromGate(0, -118), 'portail scellé : le trône est INACCESSIBLE');
assert.ok(!fromGate(-40, -50), 'on ne sort pas de la carte (ouest)');
assert.ok(!fromGate(60, -50), 'on ne sort pas de la carte (est)');
assert.ok(!fromGate(0, -100 - 40), 'on ne contourne pas le château');
const fromGateOpen = reach([0, -19], world);
assert.ok(fromGateOpen(0, -100), 'portail ouvert : la nef est accessible');
assert.ok(fromGateOpen(0, -119), 'jusqu’au pied de l’estrade');
assert.ok(fromGateOpen(0, -121), 'et sur l’estrade devant le trône');
assert.ok(fromGateOpen(-8, -112) && fromGateOpen(8, -112), 'les bas-côtés de la nef sont praticables');
assert.ok(!fromGateOpen(0, -125.2), 'mais pas derrière le trône');

// ── 6. Forêt ───────────────────────────────────────────────────────────────
assert.deepEqual(forestTrees(), trees, 'forêt déterministe');
assert.ok(trees.length >= 180 && trees.length <= 250, `forêt allégée (${trees.length} arbres)`);
assert.ok(trees.filter((t) => t.solid).length >= 100, 'assez de troncs solides pour délimiter la forêt');
for (const t of trees) {
  if (!t.solid) continue;
  assert.ok(distToPolyline(t.x, t.z, STAGE.road) > 3.2, 'aucun arbre sur la route');
  assert.ok(distToPolyline(t.x, t.z, STAGE.spur) > 2.8, 'aucun arbre sur le chemin de la chapelle');
}
assert.ok(trees.some((t) => t.kind === 'pine') && trees.some((t) => t.kind === 'oak'), 'deux essences');

// ── 7. Ennemis : placés, dormants, par zone ──────────────────────────────
assert.equal(SPAWNS.length, 7, '2 camp + 2 chapelle + 2 route + le Roi');
const mobs = SPAWNS.filter((s) => !s.boss);
assert.equal(SPAWNS.filter((s) => s.boss).length, 1, 'un seul boss');
assert.equal(mobs.filter((s) => zoneAt(s.x, s.z) === 'room').length, 2, '2 gardes dans la chapelle');
assert.equal(mobs.filter((s) => zoneAt(s.x, s.z) === 'camp').length, 2, '2 gardes au camp');
assert.equal(mobs.filter((s) => zoneAt(s.x, s.z) === 'outside').length, 2, '2 guetteurs sur la route');
const boss = SPAWNS.find((s) => s.boss);
assert.equal(zoneAt(boss.x, boss.z), 'hall', 'le Roi est dans la nef');
assert.equal(boss.x, STAGE.throne.x);
assert.equal(boss.z, STAGE.throne.z);
assert.equal(boss.yaw, Math.PI, 'il regarde la salle (+Z)');
assert.equal(stageHeight(boss.x, boss.z), STAGE.dais.b.y, 'sur l’estrade');
for (const s of SPAWNS) {
  assert.ok(!blocked(s.x, s.z, world, 0.5, true), `spawn (${s.x}, ${s.z}) dans un obstacle`);
}
for (const s of mobs) {
  assert.ok(Math.hypot(s.x - 0, s.z - 6.5) > MOB_AGGRO.aggroRange, 'dormant au départ');
}
// Sur la route devant la chapelle, ses gardes n'entendent rien…
assert.equal(blockAggro(mobs[2], { x: -8, z: -31 }), true, 'la chapelle n’entend pas la route');
assert.equal(blockAggro(mobs[2], { x: -15, z: -31 }), false, 'elle se réveille à l’intérieur');
assert.equal(blockAggro(mobs[4], { x: -15, z: -31 }), true, 'un guetteur ne traverse pas les murs');
assert.equal(blockAggro(boss, { x: 0, z: -80 }), true, 'le Roi n’entend pas le parvis');
assert.equal(blockAggro(boss, { x: 0, z: -110 }), false, 'il entend la nef');
// Le Roi : sur son trône, il est dans la zone d’éveil à l’entrée de l'allée finale
assert.ok(BOSS.riseRange >= 6 && BOSS.riseRange <= 12, 'portée d’éveil raisonnable');
assert.ok(Math.hypot(boss.x, boss.z + 100) > BOSS.riseRange, 'il dort tant qu’on est dans la nef lointaine');
assert.equal(typeof ENEMY.maxHp, 'number');

// ── 8. Feux ───────────────────────────────────────────────────────────────
assert.equal(BONFIRES[0].lit, true);
assert.equal(BONFIRES[1].lit, false);
for (const f of BONFIRES) {
  assert.ok(!blocked(f.respawn.x, f.respawn.z, world), `respawn ${f.id} libre`);
}
assert.ok(zoneAt(BONFIRES[1].x, BONFIRES[1].z) === 'outside', 'second feu devant le château');
assert.ok(Math.hypot(BONFIRES[1].x, BONFIRES[1].z - gateZ) > 6, 'le feu ne bouche pas le portail');

console.log(`SOULS-STAGE OK — zones, hauteurs, portes, quête de la clé, franchissabilité, forêt (${trees.length} arbres), ennemis, feux`);
