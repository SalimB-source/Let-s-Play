/**
 * Contrôle rendu « Chemin du Roi » : construit pour de vrai le décor
 * (chapelle, coffre, forêt, château, nef, trône) sous Node et vérifie les
 * liens entre géométrie et logique pure (colliders, positions, animations).
 *   npm run check:souls-level
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Canvas minimal (textures procédurales des murs du camp).
const g = { addColorStop() {} };
const ctx2d = () => new Proxy({ canvas: { width: 512, height: 512 } }, {
  get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => g
    : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4) })
      : k === 'measureText' ? () => ({ width: 10 }) : () => {})),
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.ImageData = class { constructor(d, w, h) { this.data = d; this.width = w; this.height = h; } };
globalThis.document = {
  createElement: () => ({ width: 1, height: 1, style: {}, getContext: () => ctx2d(), toDataURL: () => '' }),
};

const server = await createServer({
  root, logLevel: 'silent', appType: 'custom',
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } },
});
let code = 0;
try {
  const THREE = await server.ssrLoadModule('three');
  const models = await server.ssrLoadModule('/src/games/soulsModels.js');
  const castleMod = await server.ssrLoadModule('/src/games/soulsCastle.js');
  const stage = await server.ssrLoadModule('/src/games/soulsStage.js');
  const rules = await server.ssrLoadModule('/src/games/soulsRules.js');
  const { STAGE } = stage;

  const blocked = (x, z, colliders, r = 0.4) => {
    const pos = { x, z };
    rules.resolveCollisions(pos, r, colliders);
    return Math.hypot(pos.x - x, pos.z - z) > 1e-6;
  };
  const finite = (obj, label) => {
    let meshes = 0;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const p = o.geometry.attributes.position;
      assert.ok(p && p.count > 0, `${label}: géométrie vide`);
      for (let i = 0; i < p.array.length; i++) assert.ok(Number.isFinite(p.array[i]), `${label}: NaN`);
    });
    return meshes;
  };

  // ── 1. Porte nord du camp : réellement ouverte ────────────────────────
  const walls = models.makeWalls(17, 3.4, 1);
  assert.ok(!blocked(0, -17, walls.colliders), 'porte nord du camp libre');
  assert.ok(!blocked(1.6, -17, walls.colliders) && !blocked(-1.6, -17, walls.colliders), 'ouverture de 4 m');
  assert.ok(blocked(3.2, -17, walls.colliders) && blocked(-9, -17, walls.colliders), 'le reste du mur tient');
  assert.ok(blocked(0, 17, walls.colliders), 'mur sud intact');

  // ── 2. Pose assise du Roi : pieds au sol, bassin sur l'assise ───────────
  {
    const S = models.SEAT_POSE;
    const K = models.makeKnight({ fallen: true });
    const p = K.userData.parts;
    p.weapon.position.set(0.01, -0.24, -0.03);
    p.weapon.rotation.set(0.18, 0, 0.06);
    p.elbowR.add(p.weapon);
    const scale = 1.85;
    const dais = STAGE.dais.b.y;
    K.scale.setScalar(scale);
    K.position.set(STAGE.throne.x, dais, STAGE.throne.z);
    K.rotation.y = STAGE.throne.yaw;
    p.legL.rotation.x = p.legR.rotation.x = S.thigh;
    p.kneeL.rotation.x = p.kneeR.rotation.x = -(0.07 + S.knee);
    p.body.position.y = S.drop;
    p.armR.rotation.x = S.armR; p.elbowR.rotation.x = S.elbowR;
    p.armL.rotation.x = S.armL; p.elbowL.rotation.x = S.elbowL;
    K.updateMatrixWorld(true);
    const box = (o) => new THREE.Box3().setFromObject(o);
    const feet = Math.min(box(p.footL).min.y, box(p.footR).min.y);
    assert.ok(feet >= dais - 0.03, `pieds sous l'estrade (${feet.toFixed(3)} < ${dais})`);
    assert.ok(feet <= dais + 0.25, `pieds en l'air (${feet.toFixed(3)})`);
    const tip = box(p.weapon).min.y;
    assert.ok(tip >= dais - 0.05, `la lame traverse l'estrade (${tip.toFixed(3)})`);
    const hip = new THREE.Vector3();
    p.legL.getWorldPosition(hip); // articulation de la hanche
    const seatTop = dais + 0.77; // coussin
    assert.ok(Math.abs(hip.y - seatTop) < 0.3, `bassin ${hip.y.toFixed(2)} vs assise ${seatTop.toFixed(2)}`);
    // genoux vers la salle (+Z), jamais dans le dossier
    const knee = new THREE.Vector3();
    p.kneeL.getWorldPosition(knee);
    assert.ok(knee.z > STAGE.throne.z + 0.3, 'genoux devant le trône');
    const back = box(p.torso).min.z;
    assert.ok(back > STAGE.throne.z - 1.25 + 0.0, 'buste adossé, sans traverser le dossier');
    // debout : retombe exactement sur le repos de la chasse
    p.legL.rotation.x = 0; p.kneeL.rotation.x = -0.07; p.body.position.y = 0;
    K.updateMatrixWorld(true);
    assert.ok(Math.abs(box(p.footL).min.y - dais) < 0.2, 'debout : pieds au sol');
  }

  // ── 3. Décor : chaque pièce se construit, positions = logique pure ───
  const chapel = castleMod.makeChapel();
  const chest = castleMod.makeChest();
  const trees = stage.forestTrees();
  const forest = castleMod.makeForest(trees);
  const castle = castleMod.makeCastle();
  const hall = castleMod.makeThroneHall();
  const forecourt = castleMod.makeForecourt();
  const meshCounts = {
    chapel: finite(chapel.group, 'chapelle'),
    chest: finite(chest.group, 'coffre'),
    forest: finite(forest.group, 'forêt'),
    castle: finite(castle.group, 'château'),
    hall: finite(hall.group, 'nef'),
    forecourt: finite(forecourt.group, 'parvis'),
  };
  assert.ok(meshCounts.chapel > 40 && meshCounts.castle > 40 && meshCounts.hall > 60, 'décors fournis');
  assert.equal(chest.group.position.x, STAGE.chest.x, 'coffre à sa place logique');
  assert.equal(chest.group.position.z, STAGE.chest.z);
  const instanced = [];
  forest.group.traverse((o) => { if (o.isInstancedMesh) instanced.push(o); });
  assert.equal(instanced.length, 6, '6 pièces instanciées (pin ×4, chêne ×2)');
  const pines = trees.filter((t) => t.kind === 'pine').length;
  const oaks = trees.length - pines;
  assert.equal(instanced.filter((m) => m.count === pines).length, 4);
  assert.equal(instanced.filter((m) => m.count === oaks).length, 2);
  assert.ok(forest.blockers.length === 2, 'seuls les troncs bloquent la caméra');
  // Piliers de la nef : un par collider, aux mêmes coordonnées
  const pillarCols = stage.castleColliders().filter((c) => c.kind === 'circle' && Math.abs(c.x) === STAGE.hall.pillarX);
  assert.equal(pillarCols.length, 8, '8 piliers dans la nef');
  let pillarMeshes = 0;
  hall.group.children.forEach((c) => {
    if (c.scale.x === STAGE.hall.pillarScale) {
      pillarMeshes++;
      assert.ok(pillarCols.some((k) => Math.abs(k.x - c.position.x) < 1e-6 && Math.abs(k.z - c.position.z) < 1e-6), 'pilier visuel = collider');
    }
  });
  assert.equal(pillarMeshes, 8, '8 piliers visuels');
  // Trône : sur l'estrade, dos au mur
  const tb = new THREE.Box3().setFromObject(hall.throne.group);
  assert.ok(tb.min.y >= STAGE.dais.b.y - 0.01 && tb.max.y > 7, 'trône monumental sur l’estrade');
  assert.ok(tb.min.z > STAGE.hall.minZ, 'le trône tient dans la nef');
  // La lumière : les braseros de zone n'ont plus de PointLight propre
  let lights = 0;
  for (const grp of [chapel.group, castle.group, hall.group]) grp.traverse((o) => { if (o.isLight) lights++; });
  assert.equal(lights, 0, 'lumières mutualisées par le monde');
  assert.ok(castle.flickerables.length === 2 && hall.flickerables.length === 6 && chapel.flickerables.length === 2);

  // ── 4. Coffre : animation couvercle → clé → disparition ────────────────
  let t = 0;
  const run = (secs) => { for (let i = 0; i < secs * 60; i++) { t += 1000 / 60; chest.update(1 / 60, t); } };
  run(1);
  assert.equal(chest.isOpening(), false, 'fermé tant qu’on ne l’ouvre pas');
  let keyMesh = null;
  chest.group.traverse((o) => { if (o.isGroup && o.children.length === 4 && o.children[0].geometry?.type === 'TorusGeometry') keyMesh = o; });
  assert.ok(keyMesh && !keyMesh.visible, 'clé cachée dans le coffre fermé');
  chest.open();
  run(1.4);
  const hinge = chest.group.children.find((c) => c.isGroup && c !== keyMesh);
  assert.ok(hinge.rotation.z > 1.5, `couvercle ouvert (${hinge.rotation.z.toFixed(2)})`);
  assert.ok(keyMesh.visible && keyMesh.position.y > 1.0, 'la clé s’élève');
  run(2.5);
  assert.ok(!keyMesh.visible, 'la clé rejoint l’inventaire (disparaît)');

  // ── 5. Portail : vantaux fermés → ouverts vers l'intérieur ──────────────
  const leaves = castle.group.children.filter((c) => c.isGroup && c.children.some((m) => m.geometry?.type === 'ExtrudeGeometry'));
  assert.equal(leaves.length, 2, 'deux vantaux');
  assert.ok(leaves.every((l) => l.rotation.y === 0), 'fermé au départ');
  castle.setOpen(1);
  const [a, b] = leaves;
  assert.ok(Math.abs(a.rotation.y) > 1.5 && Math.abs(b.rotation.y) > 1.5, 'grands ouverts');
  assert.ok(a.rotation.y * b.rotation.y < 0, 'sens opposés (symétrie)');
  // Un vantail ouvert s'enfonce dans la nef (−Z), pas vers le joueur
  const tip = new THREE.Vector3(STAGE.castle.portalHalf - 0.04, 1, 0);
  const l = leaves.find((x) => x.position.x < 0);
  tip.applyEuler(l.rotation).add(l.position);
  assert.ok(tip.z < l.position.z, 'le vantail bat vers l’intérieur');
  castle.setOpen(0);
  assert.ok(leaves.every((x) => x.rotation.y === 0), 'refermable');

  console.log(`SOULS-LEVEL OK — porte du camp, pose assise, ${Object.values(meshCounts).reduce((s2, n) => s2 + n, 0)} meshes, forêt instanciée, piliers = colliders, coffre, portail`);
} catch (e) {
  console.error('SOULS-LEVEL FAILED :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
