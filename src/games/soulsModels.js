// ════════════════════════════════════════════════════════════════════
// LA CENDRE — modèles procéduraux (M0 v4 : silhouette humaine réaliste)
// Zéro asset externe : sphères, capsules, lathes et tore pour des
// volumes anatomiques (profils musculaires), materials lisses (PBR +
// env map gérée par le monde).
// Le personnage fait face à −Z (yaw 0 = regard vers −Z), même convention
// que lookDirection()/yawToward() de soulsRules.js.
// Contrat d'articulation avec SoulsWorld.jsx — ne pas renommer :
//   body > hips > legL/legR > kneeL/kneeR > footL/footR
//   body > torso > armL/armR > elbowL/elbowR, head, cape, visor, weapon
//   parts.strands = mèches de cheveux (secondarité d'animation)
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { STAGE } from './soulsStage';

const cube = new THREE.BoxGeometry(1, 1, 1);

const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

/**
 * Pose assise du Roi sur son trône (radians / mètres locaux du rig) —
 * contrat partagé par SoulsWorld.jsx (animation) et les tests de rig.
 */
export const SEAT_POSE = Object.freeze({
  thigh: 1.5, knee: 1.42, drop: -0.4, armR: 0.55, elbowR: 0.4, armL: 0.55, elbowL: 0.4,
});

// Palettes dark fantasy : pierre froide, armure charbonne, braise.
export const SOULS_PALETTE = Object.freeze({
  armor: 0x2b2e38,
  armorLight: 0x3d414e,
  trim: 0xd4af5a,
  cloth: 0x71181d,
  leather: 0x1a1410,
  ember: 0xff7b2f,
  stone: 0x43414f,
  stoneDark: 0x2a2934,
  ash: 0x1b1922,
  slate: 0x24242e,
  bone: 0xd9cfba,
  fur: 0x241a13,
  furLight: 0x3d2e1f,
  cuirass: 0x33261c,
});

// ── Textures procédurales (canvas, aucun fichier) ───────────────────
// Chaque dessin sert trois fois : couleur (sRGB), heightmap (linéaire)
// et **carte de normales calculée** (Sobel) — le relief des pierres,
// du cuir et de l'acier sous la lune rase est bien plus crédible qu'un
// simple bump approximatif.

/** Heightmap (canvas luminance) → carte de normales (OpenGL +Y up). */
function heightToNormalTexture(sourceCanvas, strength = 2.2, repeat = 1) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const src = sourceCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const out = new Uint8ClampedArray(w * h * 4);
  const H = (x, y) => {
    const xi = x < 0 ? 0 : (x >= w ? w - 1 : x);
    const yi = y < 0 ? 0 : (y >= h ? h - 1 : y);
    return src[(yi * w + xi) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const nx = -dx;
      const ny = dy;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      out[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

function canvasPair(size, draw, repeat = 1, normalStrength = 2.2) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(canvas);
  const normalMap = heightToNormalTexture(canvas, normalStrength, repeat);
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = 4;
  }
  return { map, bumpMap, normalMap };
}

/** Pavés sombres irréguliers, joints ombrés, usure en biseau. */
export function flagstoneMaps(repeat = 12) {
  return canvasPair(512, (ctx, s) => {
    ctx.fillStyle = '#131219';
    ctx.fillRect(0, 0, s, s);
    const rows = 7;
    const cell = s / rows;
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * cell * 0.5;
      for (let col = -1; col < rows; col++) {
        const x = col * cell + offset + 3;
        const y = row * cell + 3;
        const tone = 32 + ((row * 7 + col * 13) % 5) * 4;
        // corps du pavé
        ctx.fillStyle = `rgb(${tone}, ${tone - 1}, ${tone + 7})`;
        ctx.beginPath();
        ctx.roundRect(x, y, cell - 6, cell - 6, 5);
        ctx.fill();
        // lumière en haut, ombre en bas → relief « taillé »
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + cell - 11, y + 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + cell - 5);
        ctx.lineTo(x + cell - 11, y + cell - 5);
        ctx.stroke();
        // fissure ponctuelle
        if ((row * 3 + col * 5) % 4 === 0) {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + cell * 0.3, y + 6);
          ctx.lineTo(x + cell * 0.45, y + cell * 0.5);
          ctx.lineTo(x + cell * 0.38, y + cell - 8);
          ctx.stroke();
        }
      }
    }
    // grains de cendre
    for (let i = 0; i < 420; i++) {
      const v = Math.random() * 40;
      ctx.fillStyle = `rgba(${200 - v}, ${190 - v}, ${205 - v}, ${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    // mousse humide : flaques vertes diffuses (bord des pavés)
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 14 + Math.random() * 34;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(56, 84, 46, 0.16)');
      gradient.addColorStop(1, 'rgba(56, 84, 46, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, repeat);
}

/** Mur de pierre : assises alternées, joints profonds, éclats. */
export function masonryMaps(repeat = 8) {
  return canvasPair(512, (ctx, s) => {
    ctx.fillStyle = '#191821';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const cell = s / rows;
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * cell * 0.6;
      for (let col = -1; col < 6; col++) {
        const w = cell * (1.35 + ((row + col) % 3) * 0.3);
        const x = col * cell * 1.45 + offset + 3;
        const y = row * cell + 3;
        const tone = 36 + ((row * 5 + col * 11) % 4) * 4;
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone + 8})`;
        ctx.beginPath();
        ctx.roundRect(x, y, w - 5, cell - 6, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 2);
        ctx.lineTo(x + w - 10, y + 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + cell - 6);
        ctx.lineTo(x + w - 10, y + cell - 6);
        ctx.stroke();
      }
    }
    // mousse discrète en bas des blocs
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(70, 92, 60, ${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 6, 2 + Math.random() * 4);
    }
  }, repeat);
}

// ── Décor ───────────────────────────────────────────────────────────

/**
 * Sol de la cour : pavés + cercles rituels gravés autour du feu.
 * Retourne un Group (compatible scene.add).
 */
export function makeFloor(size = 44) {
  const group = new THREE.Group();
  const { map, normalMap } = flagstoneMaps(size / 3.4);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({
      map, normalMap, normalScale: new THREE.Vector2(1.25, 1.25),
      roughness: 0.94, color: 0xb4b1c2,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Cercles gravés (bague de pierre + filet d'or éteint) — détail focal.
  const ringStone = new THREE.Mesh(
    new THREE.RingGeometry(2.35, 2.62, 64),
    new THREE.MeshStandardMaterial({
      color: 0x35323f, roughness: 0.9,
      normalMap, normalScale: new THREE.Vector2(0.7, 0.7),
    }),
  );
  ringStone.rotation.x = -Math.PI / 2;
  ringStone.position.y = 0.015;
  const ringGold = new THREE.Mesh(
    new THREE.RingGeometry(2.02, 2.1, 64),
    new THREE.MeshStandardMaterial({
      color: 0x6a5526, emissive: 0xc9a24b, emissiveIntensity: 0.22, roughness: 0.5, metalness: 0.6,
    }),
  );
  ringGold.rotation.x = -Math.PI / 2;
  ringGold.position.y = 0.02;
  const runes = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.56, 32),
    new THREE.MeshStandardMaterial({ color: 0x2e2b38, roughness: 0.85 }),
  );
  runes.rotation.x = -Math.PI / 2;
  runes.position.y = 0.016;
  group.add(ringStone, ringGold, runes);
  return group;
}

/**
 * Enceinte : murs à bossage, contreforts cylindriques, arches en relief,
 * corniche à corbeaux, tours à toit conique et portcullis ferré.
 * Retourne { group, colliders, blockers }.
 */
export function makeWalls(half = 17, height = 3.4, thickness = 1) {
  const group = new THREE.Group();
  const blockers = [];
  const colliders = [];
  const { map, normalMap } = masonryMaps(6);
  const wallMat = new THREE.MeshStandardMaterial({
    map, normalMap, normalScale: new THREE.Vector2(1.35, 1.35),
    roughness: 0.92, color: 0x9d9aa8,
  });
  const trimMat = mat(SOULS_PALETTE.stoneDark, { roughness: 0.88 });
  const stoneMat = mat(SOULS_PALETTE.stone, { roughness: 0.86 });

  const track = (mesh) => {
    mesh.userData.cameraBlocker = true;
    group.add(mesh);
    blockers.push(mesh);
    return mesh;
  };

  // Relief d'arche (demi-tore + deux jambages) posé contre un mur.
  const addArch = (x, y, z, rotY) => {
    const arch = new THREE.Group();
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.1, 8, 22, Math.PI), trimMat);
    arc.position.y = 1.25;
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 1.25, 10), trimMat);
    legL.position.set(-0.95, 0.625, 0);
    const legR = legL.clone();
    legR.position.x = 0.95;
    const keystone = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), stoneMat);
    keystone.position.y = 2.2;
    arch.add(arc, legL, legR, keystone);
    arch.position.set(x, y, z);
    arch.rotation.y = rotY;
    arch.traverse((m) => { if (m.isMesh) { m.userData.cameraBlocker = true; blockers.push(m); } });
    group.add(arch);
  };

  const addWall = (cx, cz, w, d, axis, innerSign) => {
    // Quel que soit l'orientation, w = extent X, d = extent Z du volume.
    const base = new THREE.Mesh(cube, wallMat);
    base.scale.set(w, height * 0.16, d);
    base.position.set(cx, height * 0.08, cz);
    const shaft = new THREE.Mesh(cube, wallMat);
    shaft.scale.set(w * 0.96, height * 0.68, d * 0.9);
    shaft.position.set(cx, height * 0.16 + height * 0.34, cz);
    const cornice = new THREE.Mesh(cube, trimMat);
    cornice.scale.set(w + 0.25, height * 0.12, d + 0.25);
    cornice.position.set(cx, height * 0.94, cz);
    for (const m of [base, shaft, cornice]) track(m);

    // Normale intérieure : décalage horizontal vers le centre de la cour.
    const normal = axis === 'x' ? { dx: 0, dz: innerSign } : { dx: innerSign, dz: 0 };
    const thickness = axis === 'x' ? d : w;
    const span = axis === 'x' ? w : d;
    const at = (p, depth) => ({
      x: cx + (axis === 'x' ? p : 0) + normal.dx * depth,
      z: cz + (axis === 'x' ? 0 : p) + normal.dz * depth,
    });

    // Contreforts intérieurs (cylindre + chapeau conique)
    for (let i = 0; i < 4; i++) {
      const p = -span / 2 + span * (0.14 + i * 0.24);
      const { x: bx, z: bz } = at(p, thickness / 2 + 0.12);
      const buttress = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, height * 0.74, 10), wallMat);
      buttress.position.set(bx, height * 0.37, bz);
      track(buttress);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.5, 10), trimMat);
      cap.position.set(bx, height * 0.74 + 0.25, bz);
      track(cap);
    }

    // Arches en relief entre les contreforts
    for (let i = 0; i < 3; i++) {
      const p = -span / 2 + span * (0.26 + i * 0.24);
      const { x: ax, z: az } = at(p, thickness / 2);
      const rotY = axis === 'x' ? (innerSign > 0 ? 0 : Math.PI) : (innerSign > 0 ? -Math.PI / 2 : Math.PI / 2);
      addArch(ax, height * 0.2, az, rotY);
    }

    // Corbeaux sous la corniche (petits modillons arrondis)
    const corbelCount = Math.max(4, Math.round(span / 2.4));
    for (let i = 0; i <= corbelCount; i++) {
      const p = -span / 2 + (span * i) / corbelCount;
      const { x: ccx, z: ccz } = at(p, thickness / 2 + 0.18);
      const corbel = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), trimMat);
      corbel.scale.set(1, 0.8, 1);
      corbel.position.set(ccx, height * 0.84, ccz);
      group.add(corbel);
    }

    colliders.push({ kind: 'aabb', minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  };

  const t = thickness;
  // nord (intérieur = +z) : deux tronçons de part et d'autre de la porte
  // ouverte — la sortie du camp vers le Chemin du Roi.
  const gh = STAGE.camp.gateHalf;
  const nx0 = -half - t / 2;
  const nx1 = half + t / 2;
  addWall((nx0 - gh) / 2, -half, -gh - nx0, t, 'x', +1);
  addWall((gh + nx1) / 2, -half, nx1 - gh, t, 'x', +1);
  addWall(0, half, half * 2 + t, t, 'x', -1);    // sud
  addWall(-half, 0, t, half * 2 - t, 'z', +1);   // ouest
  addWall(half, 0, t, half * 2 - t, 'z', -1);    // est

  // ── Porte nord : arc de pierre + herses ferrées (visual only)
  const archBig = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.26, 10, 26, Math.PI), stoneMat);
  archBig.position.set(0, 2.1, -half + 0.55);
  track(archBig);
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 2.1, 12), stoneMat);
    jamb.position.set(side * 2.05, 1.05, -half + 0.55);
    track(jamb);
  }
  // Linteau : masse de pierre au-dessus de l'ouverture (la voie est libre).
  const lintel = new THREE.Mesh(cube, trimMat);
  lintel.scale.set(gh * 2 + 0.7, 0.7, t + 0.3);
  lintel.position.set(0, height - 0.35, -half);
  track(lintel);
  // Herse relevée : barres pendantes au ras du linteau.
  for (let i = 0; i < 7; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 6), mat(0x0e0f13, { metalness: 0.8, roughness: 0.4 }));
    tooth.rotation.x = Math.PI;
    tooth.position.set(-1.44 + i * 0.48, height - 0.95, -half + 0.06);
    group.add(tooth);
  }

  // ── Tours d'angle : cylindres ronds + toits en cône + machicolations
  const towerPositions = [
    [-half, -half], [half, -half], [-half, half], [half, half],
  ];
  for (const [x, z] of towerPositions) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.95, height + 1.1, 14), wallMat);
    tower.position.set(x, (height + 1.1) / 2, z);
    track(tower);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.14, 8, 22), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(x, height + 0.55, z);
    track(collar);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.7, 14), mat(SOULS_PALETTE.slate, { roughness: 0.75 }));
    roof.position.set(x, height + 1.1 + 0.85, z);
    track(roof);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(SOULS_PALETTE.trim, { metalness: 0.8, roughness: 0.3 }));
    finial.position.set(x, height + 2.85, z);
    group.add(finial);
    // meurtrières (fentes sombres)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const slit = new THREE.Mesh(cube, mat(0x0a0a0e));
      slit.scale.set(0.12, 0.7, 0.1);
      slit.position.set(x + Math.cos(a) * 1.74, height * 0.62, z + Math.sin(a) * 1.74);
      slit.rotation.y = -a;
      group.add(slit);
    }
    colliders.push({ kind: 'circle', x, z, r: 1.98 });
  }

  return { group, colliders, blockers };
}

/**
 * Colonne sculptée (profil à entasis : base, fût renflé, chapiteau).
 * Collider cercle. `broken` produit un fût tronqué et penché.
 */
export function makePillar(x, z, broken = false) {
  const group = new THREE.Group();
  const stoneMat = mat(SOULS_PALETTE.stone, { roughness: 0.85 });
  const trimMat = mat(SOULS_PALETTE.stoneDark, { roughness: 0.88 });

  const shaftPoints = [];
  const shaftTop = broken ? 1.6 : 2.7;
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = 0.32 + t * (shaftTop - 0.32);
    // entasis : renflement doux au tiers bas, puis effilement
    const r = 0.36 - t * 0.06 + Math.sin(t * Math.PI) * 0.035;
    shaftPoints.push(new THREE.Vector2(r, y));
  }
  const profile = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.6, 0),
    new THREE.Vector2(0.6, 0.09),
    new THREE.Vector2(0.5, 0.14),
    new THREE.Vector2(0.46, 0.24),
    ...shaftPoints,
  ];
  if (!broken) {
    profile.push(
      new THREE.Vector2(0.4, shaftTop),
      new THREE.Vector2(0.5, shaftTop + 0.08),
      new THREE.Vector2(0.54, shaftTop + 0.18),
      new THREE.Vector2(0.62, shaftTop + 0.24),
      new THREE.Vector2(0.62, shaftTop + 0.34),
      new THREE.Vector2(0.02, shaftTop + 0.34),
    );
  }
  const column = new THREE.Mesh(new THREE.LatheGeometry(profile, 20), stoneMat);
  if (broken) column.rotation.z = 0.05;
  column.userData.cameraBlocker = true;
  group.add(column);

  if (!broken) {
    // anneaux du chapiteau + abaque
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 22), trimMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = shaftTop + 0.1;
    group.add(ring);
    // fût cannelé : filets verticaux fins
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, (shaftTop - 0.4), 6), stoneMat);
      flute.position.set(Math.cos(a) * 0.36, 0.32 + (shaftTop - 0.4) / 2, Math.sin(a) * 0.36);
      group.add(flute);
    }
  } else {
    // cassure : éclats au sol
    for (let i = 0; i < 3; i++) {
      const chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + i * 0.05, 0), stoneMat);
      chunk.position.set(0.3 + i * 0.3, 0.1, -0.2 + i * 0.25);
      chunk.rotation.set(i, i * 2, 0);
      group.add(chunk);
    }
  }

  group.position.set(x, 0, z);
  const blockers = [];
  group.traverse((m) => { if (m.isMesh && m.userData.cameraBlocker) blockers.push(m); });
  return {
    group,
    collider: { kind: 'circle', x, z, r: broken ? 0.55 : 0.68 },
    blockers: blockers.length ? blockers : [column],
  };
}

/** Tonneau de bois (lathe bombée + bandes de fer) — remplace les caisses cubes. */
export function makeBarrel(x, z, height = 0.95, lying = false) {
  const group = new THREE.Group();
  const woodMat = mat(0x54402c, { roughness: 0.9 });
  const woodDark = mat(0x3a2b1e, { roughness: 0.92 });
  const ironMat = mat(0x1d1e24, { metalness: 0.7, roughness: 0.45 });

  const r0 = height * 0.36;
  const pts = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(r0 * 0.82, 0),
    new THREE.Vector2(r0 * 0.95, height * 0.14),
    new THREE.Vector2(r0, height * 0.5),
    new THREE.Vector2(r0 * 0.95, height * 0.86),
    new THREE.Vector2(r0 * 0.82, height),
    new THREE.Vector2(0.02, height),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), woodMat);
  body.userData.cameraBlocker = true;
  group.add(body);

  for (const t of [0.2, 0.8]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r0 * (t === 0.5 ? 1 : 0.96), 0.022, 6, 20), ironMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = height * t;
    group.add(band);
  }
  // stries de douves
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stave = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, height * 0.9, 5), woodDark);
    stave.position.set(Math.cos(a) * r0 * 1.005, height * 0.5, Math.sin(a) * r0 * 1.005);
    group.add(stave);
  }

  group.position.set(x, 0, z);
  if (lying) {
    group.rotation.z = Math.PI / 2;
    group.position.y = r0;
  }
  return {
    group,
    collider: { kind: 'circle', x, z, r: r0 + 0.05 },
    blockers: [body],
  };
}

/**
 * Brasero sculpté : candélabre en lathe, anneau doré, braises, flammes
 * procédurales, lumière vacillante (pilotée par soulsWorld).
 */
export function makeBrazier(x, z) {
  const group = new THREE.Group();
  const stoneMat = mat(SOULS_PALETTE.stoneDark, { roughness: 0.85 });
  const ironMat = mat(0x25262e, { metalness: 0.7, roughness: 0.4 });

  const profile = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.4, 0),
    new THREE.Vector2(0.42, 0.06),
    new THREE.Vector2(0.3, 0.12),
    new THREE.Vector2(0.12, 0.2),
    new THREE.Vector2(0.1, 0.52),
    new THREE.Vector2(0.14, 0.62),
    new THREE.Vector2(0.3, 0.7),
    new THREE.Vector2(0.46, 0.84),
    new THREE.Vector2(0.5, 0.98),
    new THREE.Vector2(0.47, 1.02),
    new THREE.Vector2(0.42, 0.94),
    new THREE.Vector2(0.02, 0.9),
  ];
  const chalice = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), stoneMat);
  chalice.userData.cameraBlocker = true;
  group.add(chalice);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.03, 8, 22), mat(SOULS_PALETTE.trim, { metalness: 0.8, roughness: 0.3 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.69;
  group.add(band);

  const emberMat = new THREE.MeshStandardMaterial({
    color: SOULS_PALETTE.ember,
    emissive: SOULS_PALETTE.ember,
    emissiveIntensity: 2.4,
    roughness: 0.6,
  });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const coal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), emberMat);
    coal.position.set(Math.cos(a) * 0.2, 0.98, Math.sin(a) * 0.2);
    coal.rotation.set(i, a, i * 0.6);
    group.add(coal);
  }

  // Flammes : deux cônes croisés, animés en rotation par le monde.
  const flame = new THREE.Group();
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff8a3c,
    emissiveIntensity: 2.8,
    transparent: true,
    opacity: 0.92,
  });
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 7), flameMat);
  outer.position.y = 1.48;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 7), flameMat.clone());
  inner.material.emissive = new THREE.Color(0xffe08a);
  inner.position.y = 1.4;
  flame.add(outer, inner);

  const light = new THREE.PointLight(0xff8c3a, 26, 13, 2);
  light.position.y = 1.6;

  group.add(flame, light);
  group.position.set(x, 0, z);
  group.userData.flame = flame;
  group.userData.light = light;
  group.userData.lightBase = 26;
  group.userData.flickerSeed = Math.random() * 10;
  return {
    group,
    collider: { kind: 'circle', x, z, r: 0.58 },
    blockers: [chalice],
    flickerable: group.userData,
  };
}

/**
 * Feu de cendres (le « checkpoint » — mécanique en M2, décor en M0) :
 * tas de cendres organique, bûches en tipi, braises, épée plantée.
 */
export function makeBonfire(x = 0, z = 0) {
  const group = new THREE.Group();
  const ashMat = mat(SOULS_PALETTE.ash, { roughness: 1 });

  // Tas de cendres : icosaèdre déformé → volume organique, pas un cône.
  const moundGeo = new THREE.IcosahedronGeometry(1, 2);
  const posAttr = moundGeo.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i);
    const hash = Math.sin(vertex.x * 12.9898 + vertex.y * 78.233 + vertex.z * 37.719) * 43758.5453;
    const jitter = 1 + (hash - Math.floor(hash) - 0.5) * 0.22;
    vertex.multiplyScalar(jitter);
    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  moundGeo.computeVertexNormals();
  const mound = new THREE.Mesh(moundGeo, ashMat);
  mound.scale.set(1.15, 0.45, 1.15);
  mound.position.y = 0.18;
  mound.userData.cameraBlocker = true;
  group.add(mound);

  // Bûches en tipi (cylindres effilés, bois calciné)
  const logMat = mat(0x241a13, { roughness: 0.95 });
  const charMat = mat(0x120f0d, { roughness: 1 });
  const logs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 1.15, 7), i % 2 ? charMat : logMat);
    log.position.set(Math.cos(a) * 0.34, 0.5, Math.sin(a) * 0.34);
    log.rotation.z = Math.cos(a) * 0.62;
    log.rotation.x = -Math.sin(a) * 0.62;
    log.userData.cameraBlocker = true;
    logs.push(log);
    group.add(log);
  }

  const coalMat = new THREE.MeshStandardMaterial({
    color: 0xff6a1f,
    emissive: 0xff5a1a,
    emissiveIntensity: 1.35,
    roughness: 0.7,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const coal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), coalMat);
    coal.position.set(Math.cos(a) * 0.3, 0.4 + (i % 3) * 0.05, Math.sin(a) * 0.3);
    coal.rotation.set(i, a, i * 0.5);
    group.add(coal);
  }

  // Épée plantée dans les cendres — signature visuelle du checkpoint.
  const bladeMat = mat(0x99a0b5, { metalness: 0.85, roughness: 0.28 });
  const goldMat = mat(SOULS_PALETTE.trim, { metalness: 0.85, roughness: 0.26 });
  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 1.2, 4), bladeMat);
  blade.rotation.y = Math.PI / 4;
  blade.position.y = 0.72;
  const guard = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.34, 4, 8), goldMat);
  guard.rotation.z = Math.PI / 2;
  guard.position.y = 1.32;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.24, 8), mat(0x2c1c14, { roughness: 0.85 }));
  grip.position.y = 1.46;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), goldMat);
  pommel.position.y = 1.6;
  sword.add(blade, guard, grip, pommel);
  sword.rotation.z = 0.16;
  sword.position.set(0.1, 0.16, 0.05);
  sword.traverse((m) => { if (m.isMesh) m.userData.cameraBlocker = true; });
  group.add(sword);

  const glow = new THREE.PointLight(0xff6a2a, 14, 9, 2);
  glow.position.y = 1.1;
  group.add(glow);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.03;
  group.add(halo);

  group.position.set(x, 0, z);
  group.userData.light = glow;
  group.userData.lightBase = 14;
  group.userData.flickerSeed = 3.7;
  return {
    group,
    collider: { kind: 'circle', x, z, r: 1.05 },
    blockers: [mound, ...logs, ...sword.children],
    flickerable: group.userData,
  };
}

/** Débris de pierre éparpillés (sans collision) — icosaèdres déformés. */
export function makeRubble(x, z, seed = 0) {
  const group = new THREE.Group();
  const rockMat = mat(0x33323e, { roughness: 1 });
  const count = 3 + (seed % 3);
  for (let i = 0; i < count; i++) {
    const size = 0.16 + ((seed + i) % 4) * 0.05;
    const geo = new THREE.IcosahedronGeometry(size, 0);
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let j = 0; j < p.count; j++) {
      v.fromBufferAttribute(p, j);
      const h = Math.abs(Math.sin(v.x * 7.1 + v.y * 3.3 + v.z * 9.7 + seed));
      v.multiplyScalar(0.82 + h * 0.4);
      p.setXYZ(j, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, rockMat);
    const a = ((seed * 7 + i * 11) % 10) / 10 * Math.PI * 2;
    rock.position.set(Math.cos(a) * 0.3, size * 0.7, Math.sin(a) * 0.3);
    rock.rotation.set(i, a, i * 0.7);
    group.add(rock);
  }
  group.position.set(x, 0, z);
  return group;
}

/** Lune basse + halo, collée au fond de la scène. */
export function makeMoon() {
  const group = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(5, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xd7dcf2, fog: false }),
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(7.6, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0x8fa0e8, transparent: true, opacity: 0.14, depthWrite: false, fog: false }),
  );
  group.add(moon, halo);
  group.position.set(-46, 34, -70);
  return group;
}

/**
 * Champ de braises flottantes : points ambre qui montent lentement
 * autour des sources (feu, braseros). `update(timeMs)` à appeler chaque
 * frame depuis soulsWorld.
 */
export function makeAshField(sources) {
  const count = 110;
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const [sx, sz] = sources[i % sources.length];
    seeds.push({
      sx, sz,
      phase: Math.random() * 4.4,
      speed: 0.22 + Math.random() * 0.4,
      drift: Math.random() * Math.PI * 2,
      radius: 0.2 + Math.random() * 0.7,
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffa25c,
      size: 0.055,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  points.frustumCulled = false;
  return {
    points,
    update(timeMs) {
      const t = timeMs * 0.001;
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const life = (s.phase + t * s.speed) % 4.4;
        const spread = s.radius * (0.4 + life * 0.35);
        positions[i * 3] = s.sx + Math.cos(s.drift + t * 0.6 + life) * spread;
        positions[i * 3 + 1] = 0.35 + life;
        positions[i * 3 + 2] = s.sz + Math.sin(s.drift + t * 0.5 + life) * spread;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

// ── Le berserker (silhouette humaine, proportions réalistes) ────────
//
// Référence anatomique : 1,71 m ≈ 8 têtes, morphologie V (épaules >
// bassin), profils de lathe pour les muscles (cuisse, mollet, biceps,
// avant-bras), visage humain complet (crâne, mâchoire, nez, arcade,
// yeux, lèvres, barbe, cheveux). Le squelette d'animation est inchangé
// (contrat SoulsWorld.jsx) : body > { hips > jambes/genoux ; torso >
// bras/coudes, tête, cape, arme }.

/** Lathe helper : points [rayon, y] + aplatissement avant/arrière. */
function lathe(points, material, zScale = 1) {
  // Style Mirage : boîte englobant le profil — mêmes extents que le
  // tour, hiérarchie et pivots du rig strictement identiques.
  let maxR = 0, minY = Infinity, maxY = -Infinity;
  for (const [r, y] of points) {
    maxR = Math.max(maxR, r);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const mesh = new THREE.Mesh(cube, material);
  mesh.scale.set(maxR * 2, maxY - minY, maxR * 2 * zScale);
  mesh.position.y = (minY + maxY) / 2;
  return mesh;
}

/**
 * Collier de fourrure : toison dense et courte autour des trapèzes.
 */
function makeFurMantle(material, tipMaterial) {
  // Collier de toison en blocs (style Mirage) autour des trapèzes.
  const group = new THREE.Group();
  const collar = new THREE.Mesh(cube, material);
  collar.scale.set(0.44, 0.09, 0.38);
  group.add(collar);
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const backness = Math.sin(a); // +Z = dos : toison plus fournie
    const len = 0.1 + Math.max(0, backness) * 0.1 + (i % 3) * 0.02;
    const tuft = new THREE.Mesh(cube, i % 4 === 0 ? tipMaterial : material);
    tuft.scale.set(0.07, len, 0.07);
    tuft.position.set(Math.cos(a) * 0.17, -len / 2 + 0.03, Math.sin(a) * 0.15);
    tuft.rotation.z = Math.cos(a) * 0.4;
    tuft.rotation.x = -Math.sin(a) * 0.4;
    group.add(tuft);
  }
  return group;
}

/**
 * Surfaces photoréalistes du chevalier : pores de peau, grain de cuir,
 * tissage d'étoffe, acier brossé — dessinées au canvas, utilisées en
 * bump/roughness (linéaires) et parfois en map de couleur.
 */
function knightSurfaces() {
  const skin = canvasPair(192, (ctx, s) => {
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(0, 0, s, s);
    // pores et micro-irrégularités
    for (let i = 0; i < 2400; i++) {
      const r = 0.6 + Math.random() * 1.3;
      ctx.fillStyle = Math.random() > 0.5
    ? `rgba(255,255,255,${0.05 + Math.random() * 0.1})`
    : `rgba(70,70,70,${0.05 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // taches diffuses (variations de gras / rougeurs)
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 8 + Math.random() * 20;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,225,210,0.10)' : 'rgba(150,120,110,0.10)');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 2);

  const leather = canvasPair(192, (ctx, s) => {
    ctx.fillStyle = '#dadada';
    ctx.fillRect(0, 0, s, s);
    // grain cellulaire
    for (let i = 0; i < 1400; i++) {
      ctx.strokeStyle = `rgba(40,40,40,${0.10 + Math.random() * 0.18})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // plis d'usure
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.strokeStyle = `rgba(20,20,20,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40,
        x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 70);
      ctx.stroke();
    }
  }, 2);

  const cloth = canvasPair(160, (ctx, s) => {
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, s, s);
    const step = 5;
    for (let y = 0; y < s; y += step) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + ((y / step) % 2) * 0.08})`;
      ctx.fillRect(0, y, s, 2);
    }
    for (let x = 0; x < s; x += step) {
      ctx.fillStyle = `rgba(255,255,255,${0.06 + ((x / step) % 2) * 0.06})`;
      ctx.fillRect(x, 0, 2, s);
    }
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 6 + Math.random() * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 3);

  const steel = canvasPair(192, (ctx, s) => {
    ctx.fillStyle = '#cfcfcf';
    ctx.fillRect(0, 0, s, s);
    // brossage horizontal
    for (let i = 0; i < 900; i++) {
      const y = Math.random() * s, x = Math.random() * s, w = 6 + Math.random() * 50;
      ctx.strokeStyle = Math.random() > 0.5
    ? `rgba(255,255,255,${0.04 + Math.random() * 0.1})`
    : `rgba(70,70,80,${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
    // rayures / éclats
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.strokeStyle = `rgba(30,30,35,${0.2 + Math.random() * 0.3})`;
      ctx.lineWidth = 0.7 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 36, y + (Math.random() - 0.5) * 36);
      ctx.stroke();
    }
  }, 1);

  return { skin, leather, cloth, steel };
}

export function makeKnight({ fallen = false } = {}) {
  const knight = new THREE.Group();
  const body = new THREE.Group();
  knight.add(body);

  // ── Style Mirage : aplats MeshStandard, couleurs solides, aucune
  // carte procédurale — tout le corps est bâti en blocs. ─────────────
  const skin = mat(fallen ? 0x97908a : 0xb58a6c, { roughness: 0.88, flatShading: true });
  const skinDark = mat(0x99714f, { roughness: 0.8, flatShading: true });
  const hairMat = mat(fallen ? 0x8f897d : 0x2b1f18, { roughness: 0.92, flatShading: true });
  const eyeMat = fallen
    ? new THREE.MeshStandardMaterial({
      color: 0x2a0d04, emissive: 0xff5a1e, emissiveIntensity: 2.4, roughness: 0.4,
    })
    : mat(0x17130f, { roughness: 0.35, flatShading: true });
  const lipMat = mat(0x96635a, { roughness: 0.72, flatShading: true });
  const trousers = mat(0x3a352f, { roughness: 1, flatShading: true });
  const leatherMat = mat(SOULS_PALETTE.leather, { roughness: 1, flatShading: true });
  const furMat = mat(SOULS_PALETTE.fur, { roughness: 1, flatShading: true });
  const furTip = mat(SOULS_PALETTE.furLight, { roughness: 1, flatShading: true });
  const boneMat = mat(SOULS_PALETTE.bone, { roughness: 0.55, flatShading: true });
  const trimMat = mat(fallen ? 0x6f6a5c : SOULS_PALETTE.trim, { metalness: 0.85, roughness: fallen ? 0.45 : 0.26, flatShading: true });
  const clothMat = mat(fallen ? 0x3f1d20 : SOULS_PALETTE.cloth, {
    roughness: 1, flatShading: true, side: THREE.DoubleSide,
  });

  // Blobs cubiques : demi-étendues identiques aux sphères/capsules
  // d'origine (positions et Box3 inchangés).
  const sphere = (r, material, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.set(r * 2 * sx, r * 2 * sy, r * 2 * sz);
    return mesh;
  };
  const capsule = (r, len, material) => {
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.set(r * 2, len + r * 2, r * 2);
    return mesh;
  };

  // ══ HIPS — bassin, ceinture, pattes de pagnes ======================
  const hips = new THREE.Group();
  body.add(hips);

  const pelvis = sphere(0.16, trousers, 1.05, 0.75, 0.8);
  pelvis.position.y = 0.9;
  const breeches = new THREE.Mesh(cube, trousers);
  breeches.scale.set(0.37, 0.22, 0.33);
  breeches.position.y = 0.82;
  const belt = new THREE.Mesh(cube, leatherMat);
  belt.scale.set(0.43, 0.056, 0.34);
  belt.position.y = 0.93;
  const buckle = sphere(0.04, trimMat);
  buckle.position.set(0, 0.93, -0.16);
  const waistFur = new THREE.Mesh(cube, furMat);
  waistFur.scale.set(0.46, 0.1, 0.38);
  waistFur.position.y = 0.87;
  const flapFront = new THREE.Mesh(cube, clothMat);
  flapFront.scale.set(0.22, 0.44, 0.03);
  flapFront.position.set(0, 0.6, -0.185);
  flapFront.rotation.x = 0.06;
  const flapBack = new THREE.Mesh(cube, clothMat);
  flapBack.scale.set(0.24, 0.48, 0.03);
  flapBack.position.set(0, 0.58, 0.185);
  flapBack.rotation.x = -0.08;
  hips.add(pelvis, breeches, belt, buckle, waistFur, flapFront, flapBack);

  // ─ jambes : cuisse fuselée → genou → mollet (bottes cuir jusqu'au genou)
  const makeLeg = (side) => {
    const leg = new THREE.Group(); // pivot HANCHE (y = 0.88)
    leg.position.set(side * 0.11, 0.88, 0);
    const thigh = lathe([
      [0.105, 0], [0.1, -0.14], [0.09, -0.27], [0.077, -0.38],
    ], trousers, 0.92);
    leg.add(thigh);
    const knee = new THREE.Group(); // pivot GENOU (y = 0.48)
    knee.position.y = -0.4;
    const kneecap = sphere(0.072, trousers, 1, 1, 1.05);
    const calf = lathe([
      [0.074, -0.01], [0.08, -0.08], [0.068, -0.19], [0.052, -0.3], [0.046, -0.37],
    ], leatherMat, 0.95);
    const bootCuff = new THREE.Mesh(cube, furMat);
    bootCuff.scale.set(0.17, 0.045, 0.17);
    bootCuff.position.y = -0.03;
    // Pied articulé (pivot cheville) — animé séparément : attaque sur
    // le talon, poussée sur les orteils.
    const foot = new THREE.Group();
    foot.position.y = -0.4;
    const heel = sphere(0.055, leatherMat, 1, 0.9, 1.05);
    heel.position.set(0, -0.01, 0.015);
    const toe = sphere(0.05, leatherMat, 0.95, 0.72, 1.45);
    toe.position.set(0, -0.03, -0.085);
    const sole = new THREE.Mesh(cube, mat(0x0f0d0a, { roughness: 1 }));
    sole.scale.set(0.09, 0.022, 0.22);
    sole.position.set(0, -0.05, -0.03);
    const ankleWrap = new THREE.Mesh(cube, clothMat);
    ankleWrap.scale.set(0.14, 0.03, 0.14);
    ankleWrap.position.y = 0.008;
    foot.add(heel, toe, sole, ankleWrap);
    knee.add(kneecap, calf, bootCuff, foot);
    leg.add(knee);
    return { leg, knee, foot };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  hips.add(legL.leg, legR.leg);

  // ══ TORSO — nu, muscles dessinés, sangle de cuir croisée ===========
  const torso = new THREE.Group();
  torso.position.y = 0.9;
  body.add(torso);
  const W = (y) => y - 0.9; // monde → local torso

  // Tronc en lathe : bassin étroit, pectoraux, V dorsal, base du cou.
  const trunk = lathe([
    [0.155, W(0.92)], [0.147, W(1.0)], [0.138, W(1.08)],
    [0.16, W(1.17)], [0.182, W(1.27)], [0.19, W(1.35)],
    [0.17, W(1.41)], [0.14, W(1.44)],
  ], skin, 0.72);
  const pecL = sphere(0.078, skin, 1, 0.62, 0.58);
  pecL.position.set(0.068, W(1.335), -0.1);
  const pecR = pecL.clone();
  pecR.position.x = -0.068;
  // Grands droits de l'abdomen (6 blocs discrets)
  const abs = [];
  for (let row = 0; row < 3; row++) {
    for (const sx of [-1, 1]) {
      const ab = sphere(0.03, skin, 1, 0.8, 0.55);
      ab.position.set(sx * 0.033, W(1.1 + row * 0.065), -0.098 - row * 0.004);
      abs.push(ab);
    }
  }
  const navel = sphere(0.008, skinDark, 1, 1, 0.5);
  navel.position.set(0, W(1.055), -0.101);
  const collarbones = [];
  for (const side of [-1, 1]) {
    const clavicle = capsule(0.014, 0.1, skin);
    clavicle.rotation.z = Math.PI / 2 - side * 0.12;
    clavicle.position.set(side * 0.072, W(1.415), -0.113);
    collarbones.push(clavicle);
  }
  const traps = sphere(0.13, skin, 1, 0.42, 0.62);
  traps.position.set(0, W(1.43), 0.01);
  // Dorsaux (V) + obliques : la silhouette humaine en V se lit de dos
  const lats = [];
  for (const side of [-1, 1]) {
    const lat = sphere(0.085, skin, 0.6, 1.2, 0.75);
    lat.position.set(side * 0.148, W(1.245), 0.03);
    lats.push(lat);
  }
  const obliques = [];
  for (const side of [-1, 1]) {
    const ob = sphere(0.055, skin, 0.55, 1.25, 0.7);
    ob.position.set(side * 0.102, W(1.07), -0.02);
    obliques.push(ob);
  }
  // Sangle de cuir croisée (médaillon au centre)
  const strapA = new THREE.Mesh(cube, leatherMat);
  strapA.scale.set(0.06, 0.52, 0.3);
  strapA.rotation.z = 0.56;
  strapA.position.set(0.02, W(1.2), 0);
  const strapB = strapA.clone();
  strapB.rotation.z = -0.56;
  strapB.position.x = -0.02;
  const medallion = new THREE.Mesh(cube, trimMat);
  medallion.scale.set(0.13, 0.13, 0.03);
  medallion.position.set(0, W(1.2), -0.15);
  torso.add(trunk, pecL, pecR, ...abs, ...lats, ...obliques, navel, ...collarbones, traps, strapA, strapB, medallion);

  // Fourrure posée sur les trapèzes (épaules nues en dessous)
  const mantle = makeFurMantle(furMat, furTip);
  mantle.position.y = W(1.425);
  torso.add(mantle);

  // ─ bras nus : deltoïde, biceps fuselé, coude, avant-bras, poing ────
  const makeArm = (side) => {
    const arm = new THREE.Group(); // pivot ÉPAULE (y = 1.40), demi-largeur 0.21
    arm.position.set(side * 0.21, W(1.4), 0);
    const deltoid = sphere(0.078, skin, 1, 0.95, 1);
    deltoid.position.y = 0.005;
    const bicep = lathe([
      [0.055, 0.0], [0.062, -0.1], [0.055, -0.2], [0.047, -0.3],
    ], skin, 0.94);
    arm.add(deltoid, bicep);
    if (side < 0) {
      // Épaule droite : capuchon de cuir à deux pointes d'os (discrètes)
      const cap = new THREE.Mesh(cube, leatherMat);
      cap.scale.set(0.22, 0.1, 0.22);
      cap.position.y = 0.05;
      // Lames d'épaule superposées + bordure dorée (paule crédible)
      const lame1 = new THREE.Mesh(cube, leatherMat);
      lame1.scale.set(0.24, 0.07, 0.24);
      lame1.position.y = -0.02;
      const lame2 = new THREE.Mesh(cube, leatherMat);
      lame2.scale.set(0.25, 0.06, 0.25);
      lame2.position.y = -0.07;
      const pauldronRim = new THREE.Mesh(cube, trimMat);
      pauldronRim.scale.set(0.26, 0.02, 0.26);
      pauldronRim.position.y = -0.102;
      arm.add(cap, lame1, lame2, pauldronRim);
      const up = new THREE.Vector3(0, 1, 0);
      for (const [ax, az] of [[0.55, -0.3], [0.7, 0.35]]) {
        const dir = new THREE.Vector3(ax, 1.15, az).normalize();
        const spike = new THREE.Mesh(cube, boneMat);
        spike.scale.set(0.05, 0.1, 0.05);
        spike.quaternion.setFromUnitVectors(up, dir);
        spike.position.set(0, 0.09, 0).addScaledVector(dir, 0.06);
        arm.add(spike);
      }
    }
    const elbow = new THREE.Group(); // pivot COUDE (y = 1.09)
    elbow.position.y = -0.31;
    const elbowCap = sphere(0.05, skin, 1, 1, 1.05);
    const forearm = lathe([
      [0.048, 0], [0.053, -0.07], [0.043, -0.17], [0.035, -0.25],
    ], skin, 0.95);
    const bracer = new THREE.Mesh(cube, leatherMat);
    bracer.scale.set(0.13, 0.05, 0.13);
    bracer.position.y = -0.16;
    const wrap = new THREE.Mesh(cube, clothMat);
    wrap.scale.set(0.12, 0.04, 0.12);
    wrap.position.y = -0.09;
    const fist = sphere(0.045, skin, 0.9, 1.2, 0.8);
    fist.position.y = -0.3;
    const thumb = sphere(0.017, skin, 1, 1.3, 1);
    thumb.position.set(-side * 0.028, -0.27, -0.02);
    // Phalanges recourbées + maillons de doigts (le poing « respire »)
    const knuckles = new THREE.Mesh(cube, skin);
    knuckles.scale.set(0.05, 0.016, 0.02);
    knuckles.position.set(0, -0.29, -0.038);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const finger = capsule(0.0105, 0.024, skin);
      finger.rotation.x = 1.3;
      finger.position.set((-1.5 + i) * 0.016, -0.312, -0.04);
      fingers.push(finger);
    }
    elbow.add(elbowCap, forearm, bracer, wrap, fist, thumb, knuckles, ...fingers);
    arm.add(elbow);
    return { arm, elbow };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  torso.add(armL.arm, armR.arm);

  // ─ tête humaine (pivot cou, y = 1.46) : crâne, face, barbe, cheveux
  const head = new THREE.Group();
  head.position.y = W(1.46);
  const neck = new THREE.Mesh(cube, skin);
  neck.scale.set(0.1, 0.13, 0.1);
  neck.position.set(0, 0.005, -0.008);
  const skull = sphere(0.105, skin, 0.78, 1.0, 0.9);
  skull.position.set(0, 0.14, 0.01);
  const jaw = sphere(0.062, skin, 1, 0.85, 1);
  jaw.position.set(0, 0.072, -0.03);
  const chin = sphere(0.03, skin, 1, 0.8, 1);
  chin.position.set(0, 0.045, -0.062);
  // Nez, arcade sourcilière, lèvres, oreilles
  const nose = new THREE.Mesh(cube, skin);
  nose.scale.set(0.03, 0.03, 0.045);
  nose.position.set(0, 0.132, -0.095);
  const brow = new THREE.Mesh(cube, skinDark);
  brow.scale.set(0.1, 0.017, 0.026);
  brow.position.set(0, 0.168, -0.074);
  const lips = new THREE.Mesh(cube, lipMat);
  lips.scale.set(0.038, 0.012, 0.015);
  lips.position.set(0, 0.088, -0.083);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = sphere(0.028, skin, 0.35, 0.75, 0.6);
    ear.position.set(side * 0.081, 0.13, 0.012);
    ears.push(ear);
  }
  // Yeux sombres (groupe parts.visor — les deux yeux)
  const visor = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = sphere(0.0155, eyeMat, 1, 0.9, 1);
    eye.position.set(side * 0.033, 0.15, -0.071);
    visor.add(eye);
  }
  // Barbe de berserker : moustache + barbe en 3 étages
  const mustache = new THREE.Mesh(cube, hairMat);
  mustache.scale.set(0.042, 0.011, 0.013);
  mustache.position.set(0, 0.103, -0.084);
  const beardA = sphere(0.036, hairMat, 1.1, 0.9, 0.9);
  beardA.position.set(0, 0.05, -0.058);
  const beardB = sphere(0.03, hairMat, 1, 0.95, 0.9);
  beardB.position.set(0, 0.005, -0.052);
  const beardC = sphere(0.021, hairMat, 0.9, 1, 0.85);
  beardC.position.set(0, -0.035, -0.048);
  // Cheveux : calotte sur le crâne + mèches longues dans le dos
  const hairCap = new THREE.Mesh(cube, hairMat);
  hairCap.scale.set(0.17, 0.1, 0.2);
  hairCap.position.set(0, 0.2, 0.012);
  const strands = [];
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.024;
    const len = 0.14 + ((i * 7) % 4) * 0.03;
    const strand = capsule(0.026, len, hairMat);
    strand.position.set(x, 0.09 - len / 2, 0.075 + Math.abs(x) * 0.25);
    strand.rotation.x = 0.12;
    strands.push(strand);
  }
  const headband = new THREE.Mesh(cube, leatherMat);
  headband.scale.set(0.2, 0.03, 0.21);
  headband.position.y = 0.185;
  head.add(neck, skull, jaw, chin, nose, brow, lips, ...ears, visor,
    mustache, beardA, beardB, beardC, hairCap, ...strands, headband);
  torso.add(head);

  // ─ cape courte en étoffe (partiellement couverte par les cheveux)
  const cape = new THREE.Group();
  cape.position.set(0, W(1.43), 0.03);
  const capeMesh = new THREE.Mesh(cube, clothMat);
  capeMesh.scale.set(0.64, 0.78, 0.1);
  capeMesh.position.y = -0.39;
  const clasp = sphere(0.045, trimMat, 1.2, 0.8, 0.8);
  clasp.position.set(0.1, -0.02, -0.13);
  cape.add(capeMesh, clasp);
  cape.rotation.x = 0.08;
  if (!fallen) torso.add(cape);

  // ─ grande épée au dos (parts.weapon — remise en main dès M1)
  const weapon = new THREE.Group();
  const steelMat = mat(0x9aa2b8, { metalness: 0.85, roughness: 0.38, flatShading: true });
  const edgeMat = mat(0xd3dae8, { metalness: 0.95, roughness: 0.14 });
  const blade = new THREE.Mesh(cube, steelMat);
  blade.scale.set(0.12, 1.28, 0.038);
  blade.position.y = -0.6;
  const fuller = new THREE.Mesh(cube, mat(0x5c6274, { metalness: 0.85, roughness: 0.4 }));
  fuller.scale.set(0.032, 1.12, 0.043);
  fuller.position.y = -0.58;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 4), steelMat);
  tip.rotation.y = Math.PI / 4;
  tip.rotation.x = Math.PI;
  tip.position.y = -1.34;
  const guard = new THREE.Mesh(cube, boneMat);
  guard.scale.set(0.44, 0.07, 0.07);
  guard.position.y = 0.07;
  const grip = new THREE.Mesh(cube, leatherMat);
  grip.scale.set(0.07, 0.28, 0.07);
  grip.position.y = 0.24;
  const pommel = new THREE.Mesh(cube, trimMat);
  pommel.scale.set(0.1, 0.1, 0.07);
  pommel.position.y = 0.41;
  const edgeL = new THREE.Mesh(cube, edgeMat);
  edgeL.scale.set(0.016, 1.3, 0.041);
  edgeL.position.x = 0.054;
  const edgeR = edgeL.clone();
  edgeR.position.x = -0.054;
  const wraps = [];
  for (let i = 0; i < 4; i++) {
    const wrapRing = new THREE.Mesh(cube, trimMat);
    wrapRing.scale.set(0.08, 0.014, 0.08);
    wrapRing.position.y = 0.15 + i * 0.06;
    wraps.push(wrapRing);
  }
  weapon.add(blade, fuller, edgeL, edgeR, tip, guard, grip, pommel, ...wraps);
  weapon.scale.setScalar(0.85);
  weapon.rotation.z = -0.35;
  weapon.rotation.x = 0.1;
  weapon.position.set(0.1, W(1.22), 0.19);
  weapon.traverse((m) => { if (m.isMesh) m.userData.cameraBlocker = true; });
  torso.add(weapon);

  // Pose de repos naturelle : coudes fléchis, genoux légèrement souples
  armL.elbow.rotation.x = 0.22;
  armR.elbow.rotation.x = 0.22;
  legL.knee.rotation.x = -0.05;
  legR.knee.rotation.x = -0.05;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  knight.add(shadow);

  knight.userData.shadow = shadow;
  knight.userData.parts = {
    body, hips, torso, head,
    armL: armL.arm, armR: armR.arm, elbowL: armL.elbow, elbowR: armR.elbow,
    legL: legL.leg, legR: legR.leg, kneeL: legL.knee, kneeR: legR.knee,
    footL: legL.foot, footR: legR.foot,
    cape, visor, weapon, strands,
  };
  return knight;
}

// ── Ambiance « remaster » : ciel, brumes, lumière, végétation ───────

function radialSpriteTexture(size, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Gerbe d'étincelles d'impact (additif, sans textures) — feedback de touche.
 */
// ── Chemin du Roi : dalles de route — blocs Mirage ───────────────────

/** Dalles de chemin (aplats irréguliers le long d'une polyligne). */
export function makeStonePath(points, { width = 2.4, step = 0.62 } = {}) {
  const group = new THREE.Group();
  const stone = mat(SOULS_PALETTE.stone, { roughness: 0.95, flatShading: true });
  const dark = mat(SOULS_PALETTE.stoneDark, { roughness: 0.95, flatShading: true });
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / step));
    const yaw = Math.atan2(-dx, -dz);
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n;
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(width * (0.72 + rnd() * 0.4), 0.1, (len / n) * (0.7 + rnd() * 0.3)),
        rnd() > 0.72 ? dark : stone,
      );
      const px = x0 + dx * u + (rnd() - 0.5) * 0.24;
      const pz = z0 + dz * u + (rnd() - 0.5) * 0.16;
      slab.position.set(px, 0.05, pz);
      slab.rotation.y = yaw + (rnd() - 0.5) * 0.22;
      group.add(slab);
    }
  }
  return { group, blockers: [] };
}

export function makeHitSparks(count = 26) {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffc46a, size: 0.065, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const vel = new Float32Array(count * 3);
  let life = 0;
  return {
    points,
    burst(x, y, z) {
      for (let i = 0; i < count; i++) {
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        const angle = Math.random() * Math.PI * 2;
        const sp = 1.4 + Math.random() * 2.8;
        vel[i * 3] = Math.cos(angle) * sp;
        vel[i * 3 + 1] = (0.35 + Math.random() * 0.9) * sp;
        vel[i * 3 + 2] = Math.sin(angle) * sp;
      }
      life = 1;
      material.opacity = 1;
      geometry.attributes.position.needsUpdate = true;
    },
    update(dt) {
      if (life <= 0) return;
      life = Math.max(0, life - dt * 2.4);
      material.opacity = life;
      for (let i = 0; i < count; i++) {
        vel[i * 3 + 1] -= 9.8 * dt;
        positions[i * 3] += vel[i * 3] * dt;
        positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
        positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/**
 * Environnement PBR nocturne pour PMREM : dôme dégradé, lune en HDR
 * (valeurs > 1 = reflets piqués sur l'acier), lueurs ambrées des
 * braseros. Remplace un env générique : les reflets racontent la scène.
 */
export function buildNightEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#060810');
  grad.addColorStop(0.5, '#111529');
  grad.addColorStop(0.76, '#2a2c48');
  grad.addColorStop(1, '#3b3140');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  const skyTex = new THREE.CanvasTexture(canvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }),
  );
  envScene.add(dome);

  const glow = (color, radius, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 10),
      new THREE.MeshBasicMaterial(),
    );
    mesh.material.color.setRGB(color[0], color[1], color[2]);
    mesh.position.set(x, y, z);
    envScene.add(mesh);
    return mesh;
  };
  glow([2.6, 2.9, 3.6], 3.2, -24, 26, -34);        // lune
  glow([4.6, 2.0, 0.75], 1.15, 0, 1.5, 0);         // feu du camp
  for (const [x, z] of [[-5.4, -3.8], [5.4, -3.8], [-5.4, 4.2], [5.4, 4.2]]) {
    glow([3.4, 1.5, 0.6], 0.7, x, 1.6, z);         // braseros
  }

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 24),
    new THREE.MeshBasicMaterial({ color: 0x0b0b12 }),
  );
  ground.rotation.x = -Math.PI / 2;
  envScene.add(ground);

  const rt = pmrem.fromScene(envScene, 0.025);
  pmrem.dispose();
  envScene.traverse((o) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
  skyTex.dispose();
  return rt.texture;
}

/** Dôme de ciel en dégradé (zenith indigo → horizon ambré froid). */
export function makeSkyDome(radius = 140) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x07071a) },
      midColor: { value: new THREE.Color(0x141a38) },
      horizonColor: { value: new THREE.Color(0x2a2a4a) },
      warmColor: { value: new THREE.Color(0x54303a) },
      glowDir: { value: new THREE.Vector3(-0.45, 0.35, -0.72).normalize() },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 warmColor;
      uniform vec3 glowDir;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.28, h));
        col = mix(col, topColor, smoothstep(0.24, 0.75, h));
        // Lueur chaude attenant à la lune, éteinte sous l'horizon.
        float towardMoon = max(dot(normalize(vDir), glowDir), 0.0);
        col += warmColor * pow(towardMoon, 6.0) * (1.0 - smoothstep(-0.05, 0.4, h));
        if (h < 0.0) col = mix(col, horizonColor * 0.5, smoothstep(0.0, -0.3, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material);
}

/** Champ d'étoiles statiques (hémisphère supérieur). */
export function makeStars(count = 460, radius = 132) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const y = 0.06 + Math.random() * 0.92;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
    sizes[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xcfd8ff,
      size: 0.9,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false,
    }),
  );
  points.frustumCulled = false;
  return points;
}

/** Halo lunaire en sprite additif (bloom le fait vibrer). */
export function makeMoonGlow(x, y, z, scale = 34) {
  const texture = radialSpriteTexture(128, [
    [0, 'rgba(226, 234, 255, 0.9)'],
    [0.25, 'rgba(180, 196, 255, 0.34)'],
    [1, 'rgba(140, 160, 255, 0)'],
  ]);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    fog: false,
  }));
  sprite.scale.setScalar(scale);
  sprite.position.set(x, y, z);
  return sprite;
}

/**
 * Bancs de brume au sol (sprites doux qui dérivent lentement).
 * Retourne le groupe ; chaque sprite porte userData.baseX/baseZ/phase.
 */
export function makeMistPatches(list) {
  const texture = radialSpriteTexture(160, [
    [0, 'rgba(170, 186, 226, 0.55)'],
    [0.55, 'rgba(150, 166, 210, 0.22)'],
    [1, 'rgba(140, 156, 200, 0)'],
  ]);
  const group = new THREE.Group();
  for (const [x, z, sx, sy, opacity] of list) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      color: 0xb9c4e8,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, 1.1, z);
    sprite.scale.set(sx, sy, 1);
    sprite.userData.baseX = x;
    sprite.userData.baseZ = z;
    sprite.userData.baseOpacity = opacity;
    sprite.userData.phase = Math.random() * Math.PI * 2;
    group.add(sprite);
  }
  return group;
}

/**
 * Faisceau de lumière volumétrique au-dessus d'une source chaude.
 * Alpha en double dégradé (fondu aux deux extrémités), additif.
 */
export function makeLightShaft(x, y, z, { color = 0xff9a4a, height = 4.2, rBottom = 0.28, rTop = 0.7, opacity = 0.14 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 128, 0, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 128);
  const alphaMap = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    color,
    alphaMap,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, 14, 1, true), material);
  mesh.position.set(x, y + height / 2, z);
  mesh.userData.baseOpacity = opacity;
  return mesh;
}

/**
 * Herbe instanciée : cônes fins répartis près des murs et zones
 * végétales, jamais sur le cercle du feu ni sur les colliders.
 * @param {Array} colliders obstacles à éviter (resolveCollisions compat)
 */
export function makeGrassField(colliders, count = 900) {
  const geometry = new THREE.ConeGeometry(0.032, 0.24, 4);
  geometry.translate(0, 0.12, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, flatShading: true, roughness: 1,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const blocked = (x, z) => {
    const px = { x, z };
    for (const c of colliders) {
      if (c.kind === 'circle') {
        if (Math.hypot(x - c.x, z - c.z) < c.r + 0.22) return true;
      } else if (x > c.minX - 0.2 && x < c.maxX + 0.2 && z > c.minZ - 0.2 && z < c.maxZ + 0.2) return true;
    }
    return false;
  };
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 30) {
    guard++;
    const x = (Math.random() * 2 - 1) * 16.2;
    const z = (Math.random() * 2 - 1) * 16.2;
    const dist = Math.hypot(x, z);
    if (dist < 3.1) continue; // cercle rituel dégagé
    const nearEdge = Math.min(17 - Math.abs(x), 17 - Math.abs(z)) < 4.2;
    if (!nearEdge && Math.random() > 0.3) continue; // touffes éparses ailleurs
    if (blocked(x, z)) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.rotation.x = (Math.random() - 0.5) * 0.25;
    const scale = 0.65 + Math.random() * 0.9;
    dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.9), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    // Vert de nuit : du vert-de-gris au vert mousse plus clair.
    color.setHSL(0.28 + Math.random() * 0.08, 0.42 + Math.random() * 0.2, 0.16 + Math.random() * 0.14);
    mesh.setColorAt(placed, color);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Petites fleurs nocturnes phosphorescentes (bloom les fait scintiller). */
export function makeFlowerField(colliders, count = 40) {
  const geometry = new THREE.SphereGeometry(0.035, 6, 5);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1c3a2a,
    emissive: 0x7dffb8,
    emissiveIntensity: 1.4,
    roughness: 0.6,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 40) {
    guard++;
    const x = (Math.random() * 2 - 1) * 15.6;
    const z = (Math.random() * 2 - 1) * 15.6;
    if (Math.hypot(x, z) < 3.4) continue;
    if (Math.random() > 0.45) continue;
    let blocked = false;
    for (const c of colliders) {
      if (c.kind === 'circle' && Math.hypot(x - c.x, z - c.z) < c.r + 0.2) { blocked = true; break; }
      if (c.kind !== 'circle' && x > c.minX - 0.15 && x < c.maxX + 0.15 && z > c.minZ - 0.15 && z < c.maxZ + 0.15) { blocked = true; break; }
    }
    if (blocked) continue;
    dummy.position.set(x, 0.1 + Math.random() * 0.1, z);
    const scale = 0.7 + Math.random() * 0.8;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    color.setHSL(0.38 + Math.random() * 0.18, 0.7, 0.5 + Math.random() * 0.2);
    mesh.setColorAt(placed, color);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/**
 * Arbre stylisé (tronc incliné en segments + couronne de sphères) —
 * l'esprit « bosquet d'Hyrule » sans assets. { group, collider, blockers }
 */
export function makeTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const barkMat = mat(0x3c2c20, { roughness: 1 });
  const barkLight = mat(0x4a382a, { roughness: 1 });

  let node = new THREE.Group();
  group.add(node);
  const segments = 3;
  for (let i = 0; i < segments; i++) {
    const h = 0.95;
    const rTop = 0.13 - i * 0.025;
    const rBottom = 0.17 - i * 0.025;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 8), i % 2 ? barkLight : barkMat);
    seg.position.y = h / 2;
    seg.userData.cameraBlocker = true;
    node.add(seg);
    const joint = new THREE.Group();
    joint.position.y = h;
    joint.rotation.z = (i % 2 ? 1 : -1) * 0.14;
    joint.rotation.y = i * 1.1;
    node.add(joint);
    node = joint;
  }
  // Couronne : gros volume + lobes
  const greens = [0x33502b, 0x3d6231, 0x2b4524, 0x467038];
  const crown = new THREE.Group();
  crown.position.y = 0.2;
  const blobs = [
    [0, 0.55, 0, 0.85], [0.5, 0.2, 0.15, 0.6], [-0.45, 0.25, -0.1, 0.55],
    [0.1, 0.15, -0.5, 0.55], [-0.1, 0.3, 0.5, 0.5],
  ];
  blobs.forEach(([bx, by, bz, br], i) => {
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(br, 10, 8),
      mat(greens[i % greens.length], { roughness: 0.95 }),
    );
    blob.position.set(bx, by, bz);
    blob.scale.y = 0.82;
    blob.userData.cameraBlocker = true;
    crown.add(blob);
  });
  node.add(crown);

  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const blockers = [];
  group.traverse((m) => { if (m.isMesh && m.userData.cameraBlocker) blockers.push(m); });
  return {
    group,
    collider: { kind: 'circle', x, z, r: 0.42 * scale },
    blockers,
  };
}

/** Buisson bas : trois sphères de feuillage (sans collision). */
export function makeBush(x, z, scale = 1) {
  const group = new THREE.Group();
  const greens = [0x2e4a26, 0x38582d, 0x27401f];
  const blobs = [[0, 0.22, 0, 0.42], [0.34, 0.16, 0.1, 0.3], [-0.28, 0.18, -0.14, 0.32]];
  blobs.forEach(([bx, by, bz, br], i) => {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(br, 8, 6), mat(greens[i], { roughness: 1 }));
    blob.position.set(bx, by, bz);
    blob.scale.y = 0.75;
    group.add(blob);
  });
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}
