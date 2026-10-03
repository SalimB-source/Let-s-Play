// ════════════════════════════════════════════════════════════════════
// LA CENDRE — décor du « Chemin du Roi » : chapelle, coffre + clé, forêt,
// château, grand portail, salle des piliers et trône.
// Direction anime : matières peintes, volumes adoucis et couleurs de crépuscule.
// Les positions viennent toutes de soulsStage.js (source unique).
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  SOULS_PALETTE, makePillar, makeBrazier, makeBarrel, makeRubble,
  animeMaterial, scaleBoxUV, scalePlaneUV, multiplyUV,
  makeFern, makeMushrooms, makeFallenLog, makeSconce, makeBanner,
  makeRuneDisc, makeDustMotes, makeDebrisPile,
} from './soulsModels';
import { STAGE } from './soulsStage';

const flat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: false, ...opts });

/**
 * Matières anime peintes, partagées sur tout le niveau. Elles remplacent les
 * textures à carreaux et laissent la lumière violette/rose modeler les murs.
 */
const MAT = {
  cobble: () => animeMaterial('stone', { color: 0xc0c7f0, tile: 1.65 }),
  cobbleDark: () => animeMaterial('slate', { color: 0x949bc4, tile: 1.65 }),
  brick: () => animeMaterial('stone', { color: 0xd0d4fb, tile: 2.05 }),
  brickDark: () => animeMaterial('slate', { color: 0x8991bc, tile: 2.05 }),
  plank: () => animeMaterial('wood', { color: 0xd08a8a, tile: 1.45 }),
  dirt: () => animeMaterial('earth', { color: 0x8d90bd, tile: 2.5 }),
  carpet: () => animeMaterial('cloth', { color: 0xffffff, tile: 1.75 }),
  slate: () => animeMaterial('slate', { color: 0xa6afd9, tile: 1.7 }),
};

const lcg = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));

/**
 * Volume architectural : les masses importantes reçoivent un chanfrein doux,
 * ce qui casse la lecture en blocs tout en gardant exactement les
 * dimensions exploitées par les colliders du niveau.
 */
function block(group, blockers, material, w, h, d, x, y, z, { blocker = true, shadow = true } = {}) {
  const smallest = Math.min(w, h, d);
  const rounded = smallest >= 0.18;
  const geo = rounded
    ? new RoundedBoxGeometry(w, h, d, Math.min(0.11, smallest * 0.22), 3)
    : new THREE.BoxGeometry(w, h, d);
  const tile = material?.userData?.tile;
  if (tile && !rounded) scaleBoxUV(geo, { x: w, y: h, z: d }, tile);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.userData.noCast = !shadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (blocker && blockers) blockers.push(mesh);
  return mesh;
}

/** Brasero de zone : la flamme vit, la lumière est mutualisée par le monde. */
function zoneBrazier(x, z, scale = 1) {
  const b = makeBrazier(x, z);
  b.group.userData.light.removeFromParent();
  b.group.userData.light = null;
  b.group.scale.setScalar(scale);
  return b;
}

// ── Sol extérieur ─────────────────────────────────────────────────────

/**
 * Terre cendreuse qui entoure le camp : un seul aplat immense, peint de
 * lavis froids. Posé à y = −0.09 : aucune face n'est coplanaire avec les
 * dalles intérieures (le z-fighting de la chapelle venait de là).
 */
export const GROUND_Y = -0.09;

/**
 * Épaisseur du dallage de la nef : la dalle descend de `HALL_FLOOR_T`
 * sous le sol visible. Rien ne doit percer en dessous, sinon on voit la
 * géométrie « sous le plancher » depuis la salle.
 */
export const HALL_FLOOR_T = 0.3;

export function makeOuterGround() {
  const material = MAT.dirt();
  const geo = scalePlaneUV(new THREE.PlaneGeometry(260, 260), 260, 260, material.userData.tile);
  const ground = new THREE.Mesh(geo, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(6, GROUND_Y, -60);
  ground.receiveShadow = true;
  return ground;
}

/**
 * Sous-bois : fougères, champignons lumineux, rondins et gravats le long
 * de la route. Décor pur (aucun collider) — la forêt garde ses arbres.
 */
export function makeForestFloor(trees) {
  const group = new THREE.Group();
  const rnd = lcg(90210);
  const taken = (x, z) => {
    for (const t of trees) if (Math.hypot(t.x - x, t.z - z) < 1.1) return true;
    return false;
  };
  for (let i = 0; i < 130; i++) {
    const x = STAGE.bounds.minX + 3 + rnd() * (STAGE.bounds.maxX - STAGE.bounds.minX - 6);
    const z = STAGE.bounds.northZ + 4 + rnd() * (STAGE.bounds.southZ - STAGE.bounds.northZ - 8);
    if (taken(x, z)) continue;
    const roll = rnd();
    if (roll < 0.52) group.add(makeFern(x, z, 0.7 + rnd() * 0.8));
    else if (roll < 0.72) group.add(makeMushrooms(x, z, i));
    else group.add(makeDebrisPile(x, z, i, 0.7 + rnd() * 0.7));
  }
  // Trois rondins moussus en bord de route (repères visuels).
  for (const [x, z, yaw, len] of [[-4.6, -37, 0.4, 2.2], [8.2, -58.5, 1.2, 2.6], [-7.4, -71, 2.4, 2.0]]) {
    group.add(makeFallenLog(x, z, yaw, len).group);
  }
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group, blockers: [] };
}

/** Grande dalle du parvis, devant le portail (pavés + marches). */
export function makeForecourt() {
  const group = new THREE.Group();
  const stone = MAT.cobbleDark();
  const light = MAT.cobble();
  block(group, null, stone, 26, 0.12, 9.5, 0, 0.06, -83.7, { blocker: false, shadow: false });
  // Trois marches basses vers le portail (décor — le sol reste plat).
  block(group, null, light, 11, 0.1, 1.4, 0, 0.11, -87.2, { blocker: false, shadow: false });
  block(group, null, light, 9, 0.1, 1.0, 0, 0.16, -88.0, { blocker: false, shadow: false });
  // Bornes de pierre + chaînes : la voie vers le portail se lit de loin.
  for (const sx of [-1, 1]) {
    for (const z of [-80.4, -84.6]) {
      block(group, null, light, 0.7, 1.0, 0.7, sx * 5.4, 0.5, z, { blocker: false });
      block(group, null, MAT.slate(), 0.9, 0.14, 0.9, sx * 5.4, 1.05, z, { blocker: false });
    }
  }
  group.add(makeDebrisPile(-9.5, -81.5, 3, 1.3), makeDebrisPile(10.2, -85.5, 6, 1.1));
  group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return { group };
}

// ── Chapelle en ruine ─────────────────────────────────────────────────

export function makeChapel() {
  const { room, roomProps } = STAGE;
  const group = new THREE.Group();
  const blockers = [];
  const flickerables = [];
  const rnd = lcg(4242);
  const stone = MAT.brick();
  const dark = MAT.brickDark();
  const slab = MAT.cobbleDark();
  const wood = MAT.plank();
  const t = room.wallT;
  const floorTop = 0.02;

  // Dallage intérieur (sommet à +0.02 : le chevalier marche à y = 0,
  // aucune face n'est coplanaire avec la terre extérieure à −0.09).
  block(group, null, slab, room.maxX - room.minX + 0.4, 0.1, room.maxZ - room.minZ + 0.4,
    (room.minX + room.maxX) / 2, floorTop - 0.05, (room.minZ + room.maxZ) / 2, { blocker: false, shadow: false });
  // Dalles claires éparses
  for (let i = 0; i < 16; i++) {
    block(group, null, i % 3 ? dark : stone, 1.5, 0.02, 1.2,
      room.minX + 1 + rnd() * (room.maxX - room.minX - 2), floorTop + 0.015,
      room.minZ + 1 + rnd() * (room.maxZ - room.minZ - 2), { blocker: false, shadow: false });
  }

  // Mur en tronçons : hauteurs irrégulières (ruine), chapeau sombre.
  const run = (x0, z0, x1, z1, horizontal) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 1.8));
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const cx = x0 + (x1 - x0) * (u0 + u1) / 2;
      const cz = z0 + (z1 - z0) * (u0 + u1) / 2;
      const seg = (len / n) + 0.02;
      const ruin = rnd() < 0.3 ? 0.5 + rnd() * 1.1 : rnd() * 0.25;
      const h = room.height - ruin;
      const w = horizontal ? seg : t;
      const d = horizontal ? t : seg;
      block(group, blockers, i % 2 ? stone : dark, w, h, d, cx, h / 2, cz);
      block(group, null, MAT.cobbleDark(), w + 0.12, 0.18, d + 0.12, cx, h + 0.09, cz, { blocker: false });
    }
  };
  const x0 = room.minX - t / 2;
  const x1 = room.maxX + t / 2;
  const z0 = room.minZ - t / 2;
  const z1 = room.maxZ + t / 2;
  run(x0, z0, x1, z0, true);                      // nord
  run(x0, z1, x1, z1, true);                      // sud
  run(x0, z0, x0, z1, false);                     // ouest (fond)
  run(x1, z0, x1, room.doorZ - room.doorHalf - 0.45, false);  // est nord
  run(x1, room.doorZ + room.doorHalf + 0.45, x1, z1, false);  // est sud
  // Jambages + linteau de la porte
  for (const side of [-1, 1]) {
    block(group, blockers, stone, t + 0.3, 4.1, 0.9, x1, 2.05,
      room.doorZ + side * (room.doorHalf + 0.45));
  }
  block(group, blockers, dark, t + 0.4, 0.7, 2 * room.doorHalf + 2.0, x1, 3.45, room.doorZ);

  // Poutres du toit effondré (non bloquantes pour la caméra)
  for (const z of [-27.2, -31, -34.8]) {
    block(group, null, wood, room.maxX - room.minX + 0.6, 0.3, 0.34,
      (room.minX + room.maxX) / 2, room.height - 0.1 + (z === -31 ? 0.25 : 0), z, { blocker: false });
  }
  // Estrade basse sous le coffre
  block(group, null, MAT.cobble(), 2.6, 0.12, 3.2, STAGE.chest.x + 0.2, 0.08, STAGE.chest.z, { blocker: false, shadow: false });

  // Autel brisé au fond : dalle + stèle fendue (silhouette de la chapelle).
  block(group, blockers, stone, 2.2, 0.9, 1.1, -23.4, 0.45, -35.6);
  block(group, null, MAT.cobble(), 2.5, 0.16, 1.4, -23.4, 0.95, -35.6, { blocker: false });
  const stele = block(group, null, dark, 0.9, 2.1, 0.3, -23.4, 1.9, -36.2, { blocker: false });
  stele.rotation.z = 0.09;
  block(group, null, flat(SOULS_PALETTE.trim, {
    metalness: 0.6, roughness: 0.4, emissive: 0x4a3612, emissiveIntensity: 0.4,
  }), 0.5, 0.5, 0.34, -23.4, 2.1, -36.2, { blocker: false });

  // Décor solide (même liste que les colliders purs)
  for (const p of roomProps) {
    if (p.t === 'pillar') {
      const o = makePillar(p.x, p.z, true);
      group.add(o.group);
      blockers.push(...o.blockers);
    } else if (p.t === 'barrel') {
      const o = makeBarrel(p.x, p.z, 0.95, false);
      group.add(o.group);
      blockers.push(...o.blockers);
    } else if (p.t === 'brazier') {
      const o = zoneBrazier(p.x, p.z);
      group.add(o.group);
      flickerables.push(o.flickerable);
      blockers.push(...o.blockers);
    }
  }
  group.add(makeRubble(-21, -26.3, 7), makeRubble(-22.4, -36, 8));
  group.add(makeDebrisPile(-15.6, -27.4, 11, 1.2), makeDebrisPile(-25.2, -35.2, 14, 1.0));
  // Bannière déchirée + vitrail crevé au fond : la ruine raconte quelque chose.
  const banner = makeBanner(-20, 3.0, room.minZ + 0.7, 0, 2.6);
  group.add(banner.group);
  // Bancs renversés (planches) + fougères entrées par les brèches.
  for (const [bx, bz, yaw] of [[-16.4, -30.2, 0.4], [-18.6, -32.4, 1.9], [-21.4, -29.0, 2.7]]) {
    block(group, null, wood, 1.9, 0.12, 0.42, bx, 0.2, bz, { blocker: false }).rotation.y = yaw;
  }
  for (const [fx, fz] of [[-14.2, -35.9], [-26.4, -26.0], [-13.6, -26.2]]) {
    group.add(makeFern(fx, fz, 1.1));
  }

  group.traverse((o) => {
    if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; }
  });
  return { group, blockers, flickerables };
}

// ── Coffre & clé ──────────────────────────────────────────────────────

/** Clé dorée (anneau + tige + dents). */
export function makeKey() {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd9b24f, emissive: 0xa87a1c, emissiveIntensity: 0.9,
    roughness: 0.35, metalness: 0.8, flatShading: true,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 6, 12), gold);
  ring.position.y = 0.42;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.62, 0.075), gold);
  shaft.position.y = 0.0;
  const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.07), gold);
  bit1.position.set(0.1, -0.24, 0);
  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.07), gold);
  bit2.position.set(0.07, -0.12, 0);
  group.add(ring, shaft, bit1, bit2);
  return group;
}

/**
 * Coffre en bois cerclé de fer. Faces +X (vers la porte de la chapelle).
 * `open()` lance l'animation : couvercle, lueur, clé qui s'élève puis
 * « entre » dans l'inventaire. `update(dt, time)` à chaque frame.
 */
export function makeChest() {
  const { chest } = STAGE;
  const group = new THREE.Group();
  const wood = flat(0x4a2f1c);
  const woodDark = flat(0x35200f);
  const iron = flat(0x1b1c22, { metalness: 0.5, roughness: 0.55 });
  const trim = flat(SOULS_PALETTE.trim, { metalness: 0.6, roughness: 0.4 });
  const blockers = [];

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.58, 1.5), wood);
  body.position.y = 0.29;
  const inside = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 1.38),
    new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 1 }));
  inside.position.y = 0.57;
  group.add(body, inside);
  blockers.push(body);
  for (const z of [-0.5, 0.5]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.6, 0.12), iron);
    band.position.set(0, 0.3, z);
    group.add(band);
  }
  const corner = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  for (const [cx, cz] of [[0.45, 0.75], [0.45, -0.75], [-0.45, 0.75], [-0.45, -0.75]]) {
    const c = new THREE.Mesh(corner, trim);
    c.position.set(cx, 0.05, cz);
    group.add(c);
  }

  // Couvercle : demi-cylindre extrudé, charnière au dos (x = −0.45).
  const lidShape = new THREE.Shape();
  lidShape.moveTo(-0.45, 0);
  lidShape.absarc(0, 0, 0.45, Math.PI, 0, true);
  lidShape.lineTo(-0.45, 0);
  const lidGeo = new THREE.ExtrudeGeometry(lidShape, { depth: 1.5, bevelEnabled: false, curveSegments: 8 });
  lidGeo.translate(0.45, 0, -0.75);
  const hinge = new THREE.Group();
  hinge.position.set(-0.45, 0.58, 0);
  const lid = new THREE.Mesh(lidGeo, woodDark);
  hinge.add(lid);
  for (const z of [-0.5, 0.5]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.12), iron);
    band.position.set(0.45, 0.3, z);
    // bande courbe approchée : trois facettes
    const b2 = band.clone();
    b2.scale.set(0.6, 0.6, 1);
    b2.position.set(0.45, 0.46, z);
    hinge.add(b2);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.16), trim);
  lock.position.set(0.9, -0.05, 0);
  hinge.add(lock);
  group.add(hinge);

  // Lueur dorée à l'ouverture (additive) + clé flottante
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffd36a, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.64;
  group.add(glow);
  const key = makeKey();
  key.visible = false;
  group.add(key);

  group.position.set(chest.x, 0.1, chest.z);

  const anim = { opening: false, t: 0 };
  const api = {
    group, blockers,
    isOpening: () => anim.opening,
    open() { anim.opening = true; anim.t = 0; },
    /** Restaure l'état fermé (tests / réinitialisation). */
    close() {
      anim.opening = false; anim.t = 0;
      hinge.rotation.z = 0; glow.material.opacity = 0; key.visible = false;
    },
    update(dt, time) {
      if (!anim.opening) return;
      anim.t += dt;
      const lidU = smooth(clamp01(anim.t / 0.9));
      hinge.rotation.z = lidU * 1.9;
      const glowU = clamp01((anim.t - 0.35) / 0.5);
      const fade = 1 - clamp01((anim.t - 2.6) / 1.2);
      glow.material.opacity = 0.75 * glowU * fade * (0.85 + 0.15 * Math.sin(time * 0.012));
      glow.scale.setScalar(0.8 + 0.5 * glowU);
      const keyT = anim.t - 0.55;
      if (keyT > 0 && keyT < 2.4) {
        key.visible = true;
        const rise = smooth(clamp01(keyT / 1.1));
        key.position.set(0, 0.7 + rise * 1.15 + Math.sin(time * 0.006) * 0.03, 0);
        key.rotation.y = time * 0.004;
        const shrink = 1 - smooth(clamp01((keyT - 1.7) / 0.7));
        key.scale.setScalar(Math.max(0.001, shrink));
      } else {
        key.visible = false;
      }
    },
  };
  return api;
}

// ── Forêt (instanciée : ~250 arbres pour une poignée d'appels) ────────

/** Forêt sombre de pins et de chênes en aplats — un InstancedMesh par pièce. */
export function makeForest(trees) {
  const group = new THREE.Group();
  const blockers = [];
  const pines = trees.filter((t) => t.kind === 'pine');
  const oaks = trees.filter((t) => t.kind === 'oak');
  const white = (opts = {}) => flat(0xffffff, opts);

  const part = (geometry, list, palette, { blocker = false } = {}) => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, white(), list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    list.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.yaw);
      m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s * (0.92 + (i % 5) * 0.04), t.s));
      mesh.setMatrixAt(i, m);
      color.setHex(palette[i % palette.length]);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (blocker) blockers.push(mesh);
    return mesh;
  };
  const at = (geo, y) => geo.translate(0, y, 0);

  const bark = [0x2d221a, 0x33271d, 0x281f18];
  const fir = [0x1b3a30, 0x1f4535, 0x163027, 0x21402f];
  const leaf = [0x2d3b22, 0x394a27, 0x273320, 0x33442a];

  part(at(new THREE.CylinderGeometry(0.17, 0.27, 2.0, 6), 1.0), pines, bark, { blocker: true });
  part(at(new THREE.ConeGeometry(1.55, 2.4, 7), 2.55), pines, fir);
  part(at(new THREE.ConeGeometry(1.2, 2.2, 7), 3.85), pines, fir);
  part(at(new THREE.ConeGeometry(0.82, 1.9, 7), 5.0), pines, fir);
  part(at(new THREE.CylinderGeometry(0.21, 0.34, 2.7, 6), 1.35), oaks, bark, { blocker: true });
  const crown = new THREE.IcosahedronGeometry(1.75, 1);
  crown.scale(1, 0.84, 1);
  part(at(crown, 3.7), oaks, leaf);
  return { group, blockers };
}

// ── Château : façade, tours, grand portail ────────────────────────────

/** Façade percée d'une arche gothique (un seul solide extrudé). */
function facadeGeometry() {
  const { castle } = STAGE;
  const w = castle.halfWidth;
  const ph = castle.portalHalf;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, castle.height);
  shape.lineTo(-w, castle.height);
  shape.lineTo(-w, 0);
  const hole = new THREE.Path();
  hole.moveTo(-ph, 0);
  hole.lineTo(ph, 0);
  hole.lineTo(ph, 5.2);
  hole.quadraticCurveTo(ph, 7.0, 0, castle.portalHeight + 0.4);
  hole.quadraticCurveTo(-ph, 7.0, -ph, 5.2);
  hole.lineTo(-ph, 0);
  shape.holes.push(hole);
  const depth = castle.zFront - castle.zBack;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, castle.zBack);
  return geo;
}

/** Demi-vantail du portail : forme gothique, charnière à x = 0. */
function leafGeometry(dir) {
  const { castle } = STAGE;
  const w = castle.portalHalf - 0.04;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(dir * w, 0);
  s.lineTo(dir * w, castle.portalHeight + 0.34);
  s.quadraticCurveTo(dir * 0.1, 7.0, 0, 5.2);
  s.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: false, curveSegments: 8 });
}

export function makeCastle() {
  const { castle } = STAGE;
  const group = new THREE.Group();
  const blockers = [];
  const flickerables = [];
  const stone = MAT.brick();
  const stoneDark = MAT.brickDark();
  const slate = MAT.slate();
  const iron = flat(0x15161b, { metalness: 0.6, roughness: 0.5 });
  const wood = MAT.plank();
  const cloth = flat(SOULS_PALETTE.cloth, { side: THREE.DoubleSide });
  const gold = flat(SOULS_PALETTE.trim, { metalness: 0.6, roughness: 0.4 });
  const zMid = (castle.zFront + castle.zBack) / 2;

  const facadeGeo = facadeGeometry();
  multiplyUV(facadeGeo, 1 / stone.userData.tile, 1 / stone.userData.tile);
  const facade = new THREE.Mesh(facadeGeo, stone);
  facade.castShadow = true;
  facade.receiveShadow = true;
  group.add(facade);
  blockers.push(facade);

  // Soubassement, corniche, contreforts, créneaux
  block(group, blockers, stoneDark, castle.halfWidth * 2 + 0.6, 0.9, 3.5, 0, 0.45, zMid);
  block(group, blockers, stoneDark, castle.halfWidth * 2 + 0.5, 0.55, 3.7, 0, castle.height + 0.27, zMid);
  for (const x of [-16, -10, 10, 16]) {
    block(group, blockers, stoneDark, 1.3, castle.height, 0.9, x, castle.height / 2, castle.zFront + 0.4);
  }
  const merlon = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.0, 1.0), stone, 26);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) {
    mm.makeTranslation(-castle.halfWidth + 0.9 + i * ((castle.halfWidth * 2 - 1.8) / 25), castle.height + 1.05, zMid + 1.2);
    merlon.setMatrixAt(i, mm);
  }
  merlon.castShadow = true;
  group.add(merlon);

  // Tours de façade : fût, collerette, toit conique, meurtrières ambrées
  const glowSlit = new THREE.MeshStandardMaterial({
    color: 0xffb347, emissive: 0xff9a2e, emissiveIntensity: 2.2, roughness: 0.6,
  });
  for (const sx of [-1, 1]) {
    const tx = sx * castle.halfWidth;
    const towerGeo = new THREE.CylinderGeometry(castle.towerR - 0.4, castle.towerR, 15, 12);
    multiplyUV(towerGeo, (Math.PI * 2 * castle.towerR) / stone.userData.tile, 15 / stone.userData.tile);
    const tower = new THREE.Mesh(towerGeo, stone);
    tower.position.set(tx, 7.5, zMid);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);
    blockers.push(tower);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(castle.towerR + 0.3, castle.towerR + 0.3, 0.7, 12), stoneDark);
    collar.position.set(tx, 15.2, zMid);
    group.add(collar);
    const roofGeo = new THREE.ConeGeometry(castle.towerR + 0.9, 6, 12);
    multiplyUV(roofGeo, (Math.PI * 2 * (castle.towerR + 0.9)) / slate.userData.tile, 6 / slate.userData.tile);
    const roof = new THREE.Mesh(roofGeo, slate);
    roof.position.set(tx, 18.5, zMid);
    roof.castShadow = true;
    group.add(roof);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 6), gold);
    finial.position.set(tx, 22.2, zMid);
    group.add(finial);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i - 1) * 0.55; // face au sud (+Z)
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.5, 0.2), glowSlit);
      slit.position.set(tx + Math.cos(a) * (castle.towerR - 0.15), 6 + i * 3.2, zMid + Math.sin(a) * (castle.towerR - 0.15));
      slit.rotation.y = Math.PI / 2 - a;
      group.add(slit);
    }
  }

  // Bannières sur la façade
  for (const sx of [-1, 1]) {
    const banner = new THREE.Mesh(new THREE.BoxGeometry(1.9, 6.2, 0.06), cloth);
    banner.position.set(sx * 7.6, 6.2, castle.zFront + 0.9);
    group.add(banner);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.2, 0.08), gold);
    stripe.position.set(sx * 7.6, 6.2, castle.zFront + 0.92);
    group.add(stripe);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.9, 3), cloth);
    tip.rotation.z = Math.PI;
    tip.position.set(sx * 7.6, 2.65, castle.zFront + 0.9);
    group.add(tip);
  }

  // Encadrement doré de l'arche + écusson
  const frame = new THREE.Mesh(new THREE.TorusGeometry(castle.portalHalf + 0.3, 0.16, 6, 22, Math.PI), gold);
  frame.position.set(0, 5.2, castle.zFront + 0.12);
  frame.scale.set(1, 0.72, 1);
  group.add(frame);

  // Grand portail : deux vantaux cerclés de fer, charnières aux jambages.
  const leaves = [];
  const seals = [];
  for (const dir of [1, -1]) {
    const hingeG = new THREE.Group();
    hingeG.position.set(-dir * castle.portalHalf + dir * 0.02, 0, zMid - 0.18);
    const leaf = new THREE.Mesh(leafGeometry(dir), wood);
    leaf.castShadow = true;
    hingeG.add(leaf);
    for (const y of [1.0, 2.9, 4.8]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(castle.portalHalf - 0.05, 0.3, 0.12), iron);
      band.position.set(dir * (castle.portalHalf - 0.05) / 2, y, 0.3);
      hingeG.add(band);
    }
    for (let i = 0; i < 6; i++) {
      const stud = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.1), gold);
      stud.position.set(dir * (0.4 + i * 0.5), 1.0, 0.38);
      hingeG.add(stud);
    }
    // Sceau de serrure : rouge tant que le portail est scellé.
    const seal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.12, 14),
      new THREE.MeshStandardMaterial({ color: 0x6a1a14, emissive: 0xc02a1c, emissiveIntensity: 1.1, roughness: 0.5, flatShading: true }),
    );
    seal.rotation.x = Math.PI / 2;
    seal.position.set(dir * (castle.portalHalf - 0.75), 3.2, 0.4);
    hingeG.add(seal);
    seals.push(seal);
    group.add(hingeG);
    leaves.push({ g: hingeG, dir });
  }

  // Braseros de part et d'autre du portail
  const braziers = [];
  for (const sx of [-1, 1]) {
    const b = zoneBrazier(sx * 6.4, -86.0, 1.25);
    group.add(b.group);
    flickerables.push(b.flickerable);
    braziers.push(b);
  }

  // Toit de la salle (visible depuis la forêt) + pignon avant
  const roofMat = MAT.slate();
  const hallLen = castle.zBack - STAGE.hall.minZ + 2.5;
  for (const sx of [-1, 1]) {
    const slabGeo = scaleBoxUV(new THREE.BoxGeometry(12, 0.5, hallLen), { x: 12, y: 0.5, z: hallLen }, roofMat.userData.tile);
    const slab = new THREE.Mesh(slabGeo, roofMat);
    slab.position.set(sx * 5.5, castle.height + 1.9, castle.zBack - hallLen / 2 + 0.6);
    slab.rotation.z = -sx * 0.37;
    slab.receiveShadow = true;
    slab.castShadow = true; // le toit étouffe la lune : la nef reste dans l'ombre
    group.add(slab);
  }
  const gable = new THREE.Shape();
  gable.moveTo(-11.4, 0);
  gable.lineTo(11.4, 0);
  gable.lineTo(0, 4.4);
  gable.lineTo(-11.4, 0);
  const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.6, bevelEnabled: false });
  multiplyUV(gableGeo, 1 / stone.userData.tile, 1 / stone.userData.tile);
  const gableMesh = new THREE.Mesh(gableGeo, stone);
  gableMesh.position.set(0, castle.height, castle.zBack - 0.5);
  gableMesh.castShadow = true;
  group.add(gableMesh);

  // Ouverture : u ∈ [0,1] — vantaux vers l'intérieur de la salle.
  let openU = 0;
  const applyOpen = () => {
    const e = smooth(clamp01(openU));
    for (const { g, dir } of leaves) g.rotation.y = dir * e * 1.62;
    for (const s of seals) {
      s.material.emissiveIntensity = 1.1 * (1 - e);
      s.material.color.setHex(e > 0.5 ? 0x8a6a22 : 0x6a1a14);
    }
  };
  applyOpen();

  return {
    group, blockers, flickerables, braziers,
    openProgress: () => openU,
    setOpen(u) { openU = clamp01(u); applyOpen(); },
  };
}

// ── Salle du trône ────────────────────────────────────────────────────

/** Trône de pierre : dossier à couronne, accoudoirs massifs, coussin pourpre. */
export function makeThrone() {
  const { throne } = STAGE;
  const group = new THREE.Group();
  const blockers = [];
  const stone = MAT.cobble();
  const dark = MAT.cobbleDark();
  const gold = flat(SOULS_PALETTE.trim, { metalness: 0.7, roughness: 0.35, emissive: 0x4a3612, emissiveIntensity: 0.5 });
  const cushion = flat(0x5a1519);
  const y0 = STAGE.dais.b.y;

  block(group, blockers, stone, 2.5, 0.65, 1.8, 0, y0 + 0.325, 0.0);                 // assise
  block(group, null, cushion, 1.7, 0.12, 1.3, 0, y0 + 0.71, 0.05, { blocker: false }); // coussin
  for (const sx of [-1, 1]) {
    block(group, blockers, stone, 0.5, 1.15, 1.9, sx * 1.5, y0 + 0.575, 0.0);        // accoudoir
    const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), gold);
    knob.position.set(sx * 1.5, y0 + 1.3, 0.8);
    group.add(knob);
    block(group, blockers, dark, 0.7, 5.3, 0.9, sx * 1.5, y0 + 2.65, -0.9);          // montant
  }
  block(group, blockers, stone, 2.8, 4.4, 0.55, 0, y0 + 2.2, -1.0);                  // dossier
  block(group, null, cushion, 1.6, 2.6, 0.12, 0, y0 + 2.5, -0.68, { blocker: false });
  block(group, null, gold, 1.9, 0.1, 0.14, 0, y0 + 3.85, -0.66, { blocker: false });
  block(group, null, gold, 0.1, 2.9, 0.14, 0, y0 + 2.5, -0.66, { blocker: false });
  // Couronne de pointes
  const heights = [1.6, 2.4, 3.3, 2.4, 1.6];
  heights.forEach((h, i) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.34, h, 5), dark);
    spike.position.set((i - 2) * 0.62, y0 + 4.4 + h / 2, -1.0);
    spike.castShadow = true;
    group.add(spike);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), gold);
    tip.position.set((i - 2) * 0.62, y0 + 4.45 + h, -1.0);
    group.add(tip);
  });
  group.position.set(throne.x, 0, throne.z);
  group.rotation.y = 0; // dossier au nord (−Z), assise tournée vers la salle
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group, blockers };
}

/** Nef : sol, tapis, murs, vitraux, poutres, piliers, braseros, estrade, trône. */
export function makeThroneHall() {
  const { hall, castle, dais } = STAGE;
  const group = new THREE.Group();
  const blockers = [];
  const flickerables = [];
  const stone = MAT.brick();
  const stoneDark = MAT.brickDark();
  const floorMat = MAT.cobbleDark();
  const carpet = MAT.carpet();
  const gold = flat(SOULS_PALETTE.trim, { metalness: 0.6, roughness: 0.4 });
  const wood = MAT.plank();
  const cloth = flat(SOULS_PALETTE.cloth, { side: THREE.DoubleSide });
  const len = hall.maxZ - hall.minZ;                // 35 → on lit −(minZ..maxZ)
  const zC = (hall.minZ + hall.maxZ) / 2;
  const w = hall.maxX - hall.minX;
  const H = hall.height;

  // Dalle de la nef : sommet EXACTEMENT à y = 0 (le plan de marche),
  // 30 cm d'épaisseur pour que rien ne dépasse jamais par en dessous.
  block(group, null, floorMat, w + 0.2, HALL_FLOOR_T, len, 0, -HALL_FLOOR_T / 2, zC,
    { blocker: false, shadow: false });
  // Dalles claires en damier discret (2 mm au-dessus du sol, jamais coplanaires)
  for (let i = 0; i < 9; i++) {
    for (const sx of [-1, 1]) {
      block(group, null, stone, 3.4, 0.02, 3.4, sx * 6.5, 0.012, hall.maxZ - 2.6 - i * 3.8, { blocker: false, shadow: false });
    }
  }
  // Tapis : de la porte à l'estrade (posé, pas coplanaire avec la dalle)
  const carpetLen = hall.maxZ - dais.a.zMax;
  block(group, null, carpet, 3.4, 0.02, carpetLen, 0, 0.014, hall.maxZ - carpetLen / 2, { blocker: false, shadow: false });
  for (const sx of [-1, 1]) {
    block(group, null, gold, 0.14, 0.026, carpetLen, sx * 1.77, 0.017, hall.maxZ - carpetLen / 2, { blocker: false, shadow: false });
  }
  // Disque runique gravé devant l'estrade : point focal de l'arène.
  group.add(makeRuneDisc(0, -112.5, 3.1));

  // Murs (flancs + fond) : bossages sombres, contreforts à chaque pilier
  const wallH = H;
  for (const sx of [-1, 1]) {
    block(group, blockers, stone, hall.wallT, wallH, len + hall.wallT, sx * (hall.maxX + hall.wallT / 2), wallH / 2, zC - hall.wallT / 2);
    for (const y of [2.6, 6.2]) {
      block(group, null, stoneDark, 0.3, 0.32, len - 0.4, sx * (hall.maxX - 0.1), y, zC, { blocker: false });
    }
    for (const z of hall.pillarZ) {
      block(group, blockers, stoneDark, 0.9, wallH, 1.2, sx * (hall.maxX - 0.4), wallH / 2, z);
    }
  }
  block(group, blockers, stone, w + 2 * hall.wallT, wallH, hall.wallT, 0, wallH / 2, hall.minZ - hall.wallT / 2);

  // Vitraux : arches bleutées entre les contreforts (émissifs, pas de lumière)
  const winShape = new THREE.Shape();
  winShape.moveTo(-0.7, 0);
  winShape.lineTo(0.7, 0);
  winShape.lineTo(0.7, 3.4);
  winShape.absarc(0, 3.4, 0.7, 0, Math.PI, false);
  winShape.lineTo(-0.7, 0);
  const winGeo = new THREE.ShapeGeometry(winShape, 10);
  const winMats = [0x3b4fb8, 0x6a3fa8, 0x2f6fb0].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const winZs = [];
  for (let i = 0; i < hall.pillarZ.length - 1; i++) winZs.push((hall.pillarZ[i] + hall.pillarZ[i + 1]) / 2);
  winZs.push(hall.pillarZ[hall.pillarZ.length - 1] - 3.3);
  winZs.forEach((z, i) => {
    for (const sx of [-1, 1]) {
      block(group, null, stoneDark, 0.2, 5.6, 2.1, sx * (hall.maxX - 0.05), 3.6, z, { blocker: false });
      // Menaux : la baie se lit comme un vitrail gothique, pas comme un aplat.
      block(group, null, stone, 0.24, 5.4, 0.16, sx * (hall.maxX - 0.02), 3.6, z, { blocker: false });
      const glass = new THREE.Mesh(winGeo, winMats[(i + (sx > 0 ? 1 : 0)) % 3]);
      glass.position.set(sx * (hall.maxX - 0.18), 1.3, z);
      glass.rotation.y = -sx * Math.PI / 2;
      group.add(glass);
    }
  });

  // Bannières entre les fenêtres (étoffe + liseré d'or)
  for (const z of hall.pillarZ) {
    for (const sx of [-1, 1]) {
      block(group, null, cloth, 0.06, 4.6, 1.0, sx * (hall.maxX - 0.9), 6.2, z, { blocker: false });
      block(group, null, gold, 0.08, 4.6, 0.16, sx * (hall.maxX - 0.92), 6.2, z, { blocker: false });
      block(group, null, gold, 0.08, 0.14, 1.04, sx * (hall.maxX - 0.92), 8.5, z, { blocker: false });
    }
  }
  // Grandes bannières pendues entre les piliers (silhouettes verticales).
  for (const z of hall.pillarZ) {
    for (const sx of [-1, 1]) {
      group.add(makeBanner(sx * (hall.pillarX + 1.1), 8.2, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 4.2).group);
    }
  }
  // Torches murales : lumière chaude mutualisée + flammes animées.
  for (const z of [-95.2, -101.5, -108, -114.5, -120.5]) {
    for (const sx of [-1, 1]) {
      const s2 = makeSconce(sx * (hall.maxX - 0.55), 3.1, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
      group.add(s2.group);
      flickerables.push(s2.flickerable);
    }
  }

  // Poutres : le plafond se devine, sans gêner la caméra
  for (const z of hall.pillarZ) {
    block(group, null, wood, w, 0.6, 0.8, 0, H - 0.5, z, { blocker: false, shadow: false });
  }
  for (const sx of [-1, 1]) {
    block(group, null, wood, 0.8, 0.8, len, sx * hall.pillarX, H - 0.8, zC, { blocker: false, shadow: false });
  }

  // Piliers monumentaux (même source que les colliders)
  for (const sx of [-1, 1]) {
    for (const z of hall.pillarZ) {
      const p = makePillar(sx * hall.pillarX, z, false);
      p.group.scale.setScalar(hall.pillarScale);
      group.add(p.group);
      blockers.push(...p.blockers);
    }
  }

  // Braseros des murs
  for (const [bx, bz] of hall.braziers) {
    const b = zoneBrazier(bx, bz, 1.5);
    group.add(b.group);
    flickerables.push(b.flickerable);
    blockers.push(...b.blockers);
  }

  // Estrade à deux marches : les blocs descendent SOUS la dalle de la nef
  // (aucune face coplanaire → aucun z-fighting sur les marches).
  const skirt = 0.2;
  block(group, blockers, stoneDark, dais.a.halfX * 2, dais.a.y + skirt, 6.5,
    0, (dais.a.y - skirt) / 2, (dais.a.zMax + hall.minZ) / 2);
  block(group, blockers, stone, dais.b.halfX * 2, dais.b.y + skirt - 0.02, 4.5,
    0, (dais.b.y - skirt - 0.02) / 2, (dais.b.zMax + hall.minZ) / 2);
  // Nez de marche lisible (bord clair) : la hauteur se voit au sol.
  block(group, null, MAT.cobble(), dais.a.halfX * 2 + 0.1, 0.12, 0.16, 0, dais.a.y - 0.06, dais.a.zMax + 0.08, { blocker: false });
  block(group, null, MAT.cobble(), dais.b.halfX * 2 + 0.1, 0.12, 0.16, 0, dais.b.y - 0.06, dais.b.zMax + 0.08, { blocker: false });
  block(group, null, carpet, 3.4, 0.03, 2.0, 0, dais.a.y + 0.02, dais.a.zMax - 1.0, { blocker: false, shadow: false });
  block(group, null, carpet, 3.4, 0.03, 4.4, 0, dais.b.y + 0.02, dais.b.zMax - 2.2, { blocker: false, shadow: false });

  const throne = makeThrone();
  group.add(throne.group);
  blockers.push(...throne.blockers);

  // Gravats au pied des murs + poussière en suspension dans la nef.
  group.add(makeDebrisPile(-8.6, -93.5, 21, 1.4), makeDebrisPile(8.4, -119.0, 24, 1.2),
    makeDebrisPile(-7.9, -124.6, 27, 1.1), makeDebrisPile(7.6, -99.5, 30, 1.3));

  group.traverse((o) => {
    if (o.isMesh && o.material && !o.material.transparent && o.castShadow !== false && !o.userData.noShadow) {
      o.receiveShadow = true;
    }
  });
  const dust = makeDustMotes({ x: 0, y: 0.4, z: zC }, { x: w, y: 7.5, z: len }, 260);
  group.add(dust.points);
  return { group, blockers, flickerables, throne, dust };
}
