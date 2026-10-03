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
  const masonryFace = walls.group.children.find((o) => o.isMesh && o.material?.map && o.material?.normalMap);
  assert.ok(masonryFace, 'les murs du camp utilisent leur texture de pierre');
  assert.equal(masonryFace.material.map.colorSpace, THREE.SRGBColorSpace,
    'la texture de pierre est décodée en sRGB');
  assert.equal(masonryFace.material.color.getHex(), 0xffffff,
    'la couleur de la pierre vient de la texture, sans tint multiplicatif qui noircit le mur');
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
    const seatTop = dais + 0.77; // dessus du coussin
    // Le contact réel avec l'assise, c'est le dessous de la cuisse — pas
    // l'articulation de la hanche, qui reste au-dessus du meuble.
    let thighMin = Infinity;
    p.legL.children.forEach((c) => { if (c.isMesh) thighMin = Math.min(thighMin, box(c).min.y); });
    assert.ok(
      Math.abs(thighMin - seatTop) < 0.12,
      `cuisse ${thighMin.toFixed(2)} vs assise ${seatTop.toFixed(2)}`,
    );
    const hip = new THREE.Vector3();
    p.legL.getWorldPosition(hip); // articulation de la hanche
    assert.ok(
      hip.y > seatTop && hip.y - seatTop < 0.42,
      `bassin ${hip.y.toFixed(2)} au-dessus de l'assise ${seatTop.toFixed(2)}`,
    );
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

    // Se lever ne doit jamais enfoncer les bottes : la plante du pied reste
    // à la même hauteur pour toute assise partielle (seatDrop compense la
    // cuisse qui se déplie). Sans ça le Roi traverse l'estrade en se levant.
    const plantAt = (u) => {
      p.legL.rotation.x = p.legR.rotation.x = S.thigh * u;
      p.kneeL.rotation.x = p.kneeR.rotation.x = -(0.07 + S.knee * u);
      p.body.position.y = models.seatDrop(u);
      K.updateMatrixWorld(true);
      return box(p.footL).min.y;
    };
    const seatedFoot = plantAt(1);
    assert.ok(Math.abs(models.seatDrop(1) - S.drop) < 1e-9, 'seatDrop(1) === SEAT_POSE.drop');
    assert.ok(Math.abs(models.seatDrop(0)) < 0.03, `seatDrop(0) ≈ 0 (${models.seatDrop(0).toFixed(4)})`);
    const us = [0, 0.2, 0.4, 0.6, 0.8, 1];
    // Même mesure avec l'ancien `drop * s` non compensé : le test doit bien
    // détecter l'enfoncement, sinon il ne prouve rien.
    const naiveDip = Math.min(...us.map((u) => {
      p.legL.rotation.x = p.legR.rotation.x = S.thigh * u;
      p.kneeL.rotation.x = p.kneeR.rotation.x = -(0.07 + S.knee * u);
      p.body.position.y = S.drop * u;
      K.updateMatrixWorld(true);
      return box(p.footL).min.y;
    })) - seatedFoot;
    assert.ok(naiveDip < -0.04, `le contrôle voit l'enfoncement non compensé (${naiveDip.toFixed(3)} m)`);
    const compDip = Math.min(...us.map((u) => plantAt(u))) - seatedFoot;
    assert.ok(compDip > -0.04,
      `seatDrop : le pied s'enfonce encore de ${compDip.toFixed(3)} m en se levant`);
    console.log(`  lever du Roi : botte ${naiveDip.toFixed(3)} m (avant) → ${compDip.toFixed(3)} m (seatDrop)`);

    // ── Geste de la potion : la fiole tenue en main arrive aux lèvres ──
    {
      const D = models.makeKnight({});
      const dp = D.userData.parts;
      assert.ok(dp.potion && dp.potion.parent === dp.elbowL,
        'la fiole est tenue dans le poing gauche (groupe coude)');
      dp.armL.rotation.set(1.15, 0, 0);   // pose de gorgée (SoulsWorld.jsx)
      dp.elbowL.rotation.x = 2.6;
      dp.head.rotation.x = 0.3;
      dp.body.rotation.x = 0.07;
      dp.potion.rotation.x = 1.15;
      D.updateMatrixWorld(true);
      const fb = box(dp.potion);
      const hh = box(dp.head);
      const flacon = fb.getCenter(new THREE.Vector3());
      const bouche = new THREE.Vector3(0, hh.min.y + 0.36 * (hh.max.y - hh.min.y), hh.min.z + 0.04);
      const d = flacon.distanceTo(bouche);
      assert.ok(d < 0.26, `goulot à ${d.toFixed(2)} m de la bouche (fiole ${flacon.toArray().map((v) => v.toFixed(2))})`);
      assert.ok(!dp.potion.visible, 'fiole invisible tant qu’on ne boit pas');
      console.log(`  potion : goulot à ${d.toFixed(3)} m de la bouche`);
    }
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
  // 6 torchères + 6 appliques espacées dans la nef (aucune n'embarque de
  // PointLight : seule leur flamme vacille, les lumières restent mutualisées).
  assert.ok(castle.flickerables.length === 2 && hall.flickerables.length === 12 && chapel.flickerables.length === 2,
    `vacillements ${castle.flickerables.length}/${hall.flickerables.length}/${chapel.flickerables.length}`);
  assert.equal(hall.flickerables.filter((f) => f.light).length, 0, 'les appliques n’ajoutent pas de lumière');

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

  // ── 8. Aucune grande surface noire. L'hémisphère nocturne donne ~0.2
  // d'irradiance ; sous ~0.07 d'albedo linéaire la surface tombe sous les
  // 10 % de gris après ACES et se lit comme un trou noir. C'est exactement
  // ce que faisaient les colonnes de la nef (SOULS_PALETTE.stone unie,
  // 0.055 contre 0.333 pour les murs) : huit « murs noirs » de 9 m.
  {
    const pieces = [chapel.group, chest.group, forest.group, castle.group, hall.group,
      forecourt.group, castleMod.makeOuterGround()];
    const offenders = [];
    const v = new THREE.Vector3();
    for (const root of pieces) {
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const m = o.material;
        if (!m?.color) return;
        if (m.emissive && m.emissive.getHex() > 0) return;   // flammes, runes
        if (m.transparent || m.opacity < 1) return;          // brumes, faisceaux
        const lum = 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;
        if (lum >= 0.07) return;
        const size = new THREE.Box3().setFromObject(o).getSize(v);
        const volume = Math.max(size.x, 0.05) * Math.max(size.y, 0.05) * Math.max(size.z, 0.05);
        if (volume < 1.5) return;
        offenders.push(`${o.geometry.type} ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} #${m.color.getHexString()} lum=${lum.toFixed(3)}`);
      });
    }
    assert.deepEqual(offenders, [], `surfaces trop sombres (murs noirs) : ${offenders.slice(0, 4).join(' | ')}`);
    console.log('  aucune grande surface sous l\'albedo 0.07 (pas de « mur noir »)');
  }

  console.log(`SOULS-LEVEL OK — porte du camp, pose assise, ${Object.values(meshCounts).reduce((s2, n) => s2 + n, 0)} meshes, forêt instanciée, piliers = colliders, coffre, portail`);
} catch (e) {
  console.error('SOULS-LEVEL FAILED :');
  console.error(e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
