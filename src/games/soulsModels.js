// ════════════════════════════════════════════════════════════════════
// LA CENDRE — modèles procéduraux (direction anime : Gardien Chitine)
// Zéro asset externe pour les personnages : sphères, capsules, lathes et
// volumes lisses, avec carapace irisée, yeux composés et ailes translucides.
// Le personnage fait face à −Z (yaw 0 = regard vers −Z), même convention
// que lookDirection()/yawToward() de soulsRules.js.
// Contrat d'articulation avec SoulsWorld.jsx — ne pas renommer :
//   body > hips > legL/legR > kneeL/kneeR > footL/footR
//   body > torso > armL/armR > elbowL/elbowR, head, cape, visor, weapon
//   parts.strands = antennes (secondarité d'animation)
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { STAGE } from './soulsStage';

const cube = new THREE.BoxGeometry(1, 1, 1);

const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

/**
 * Pose assise du Roi sur son trône (radians / mètres locaux du rig) —
 * contrat partagé par SoulsWorld.jsx (animation) et les tests de rig.
 *
 * Calibration (échelle 1.85, estrade à y = 0.32, assise du trône à 1.09) :
 *   drop  : le bassin descend jusqu'à ce que le haut des chausses porte
 *           EXACTEMENT sur le coussin (plus de roi qui flotte).
 *   thigh : cuisses à 72,6° de la verticale — genoux plus bas que les
 *           hanches, pieds à plat sur l'estrade (jamais sous le sol).
 *   knee  : `thigh − 0.07` → tibia strictement vertical.
 * Ces trois valeurs sont vérifiées au millimètre par check:souls-level.
 */
export const SEAT_POSE = Object.freeze({
  thigh: 1.2677, knee: 1.1977, drop: -0.2946,
  lean: 0.05,                       // léger appui contre le dossier
  armR: 0.55, elbowR: 0.4, armL: 0.55, elbowL: 0.4,
  /** Le Roi se lève en avançant : il dégage le trône avant la chasse. */
  standOff: 1.75,
});

/** Longueurs du rig jambier (mètres locaux) : cuisse, tibia, pivot hanche. */
export const LEG_RIG = Object.freeze({ thigh: 0.4, shin: 0.4, hip: 0.88 });

/**
 * Offset local du torse au-dessus du bassin — contrat de rig partagé.
 * Le remettre à 0 enlève 0.9 × échelle au buste : c'est exactement le bug
 * qui faisait s'enfoncer le Roi dans son trône et dans le plancher.
 */
export const TORSO_Y = 0.9;

/**
 * Enfoncement du bassin pour une assise partielle `s`
 * (1 = assis sur le trône, 0 = debout).
 *
 * Un simple `SEAT_POSE.drop * s` fait descendre les bottes d'une douzaine
 * de centimètres sous l'estrade pendant le lever : les cuisses se déplient
 * plus vite que le bassin ne remonte. On compense donc par la longueur
 * réelle cuisse + tibia projetée, ce qui garde la plante des pieds posée
 * sur le sol pendant toute l'animation (`seatDrop(1) === SEAT_POSE.drop`,
 * `seatDrop(0) ≈ 0`, vérifiés par check:souls-level).
 */
export function seatDrop(s) {
  const leg = (u) => {
    const th = SEAT_POSE.thigh * u;
    const kn = 0.07 + SEAT_POSE.knee * u;
    return -LEG_RIG.thigh * Math.cos(th) - LEG_RIG.shin * Math.cos(th - kn);
  };
  return SEAT_POSE.drop + (leg(1) - leg(s));
}

// Palettes dark fantasy : pierre froide, armure charbonne, braise.
// Les teintes de DÉCOR restent au-dessus d'un albedo linéaire de ~0.04 :
// sous l'hémisphère nocturne (0.95) toute surface plus sombre se rend
// noire à l'écran — c'était le cas des colonnes, des toits et des
// bannières, qui se lisaient comme des « murs noirs ».
// (check:souls-level vérifie qu'aucun grand mesh ne repasse en dessous.)
export const SOULS_PALETTE = Object.freeze({
  armor: 0x2b2e38,
  armorLight: 0x3d414e,
  trim: 0xd4af5a,
  cloth: 0x9c2b30,      // était 0x71181d — bannières et tabards lisibles
  leather: 0x1a1410,
  ember: 0xff7b2f,
  stone: 0x6e6c7d,      // était 0x43414f — colonnes / arches / gravats
  stoneDark: 0x54525f,  // était 0x2a2934 — couronnements, braseros
  ash: 0x52505f,        // était 0x1b1922 — rochers, gravats
  slate: 0x565768,      // était 0x24242e — toitures
  bone: 0xd9cfba,
  fur: 0x33251a,
  furLight: 0x4a3826,
  cuirass: 0x3f2f22,
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
    ctx.fillStyle = '#3b3a45';
    ctx.fillRect(0, 0, s, s);
    const rows = 7;
    const cell = s / rows;
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * cell * 0.5;
      for (let col = -1; col < rows; col++) {
        const x = col * cell + offset + 3;
        const y = row * cell + 3;
        const tone = 138 + ((row * 7 + col * 13) % 5) * 10;
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
  // Pierre claire : l'ancienne version (tons 36-48 sur mortier #191821)
  // donnait un albedo linéaire ≈ 0.02 — un mur VERTICAL sous une lune
  // rasante se rendait noir à l'écran (c'est le « mur noir » du parvis).
  // On monte les blocs vers le gris clair, joints plus présents.
  return canvasPair(512, (ctx, s) => {
    ctx.fillStyle = '#4a4956';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const cell = s / rows;
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * cell * 0.6;
      for (let col = -1; col < 6; col++) {
        const w = cell * (1.35 + ((row + col) % 3) * 0.3);
        const x = col * cell * 1.45 + offset + 3;
        const y = row * cell + 3;
        const tone = 148 + ((row * 5 + col * 11) % 4) * 12;
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone + 10})`;
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

// ── Échelle de répétition des surfaces peintes ────────────────────────
// Une unité de texture couvre environ 1,6 m dans le monde. Les helpers UV
// l'emploient pour que les lavis et les détails restent fins, quelle que soit
// la taille de l'architecture.
export const SURFACE_TILE = 1.6;

// ── Matières anime peintes ────────────────────────────────────────────
// Le niveau n'utilise plus les carreaux 16×16 volontairement abrupts. Ces
// surfaces sont dessinées comme des aplats peints : lavis larges, veines fines
// et micro-lumières. Avec une rampe toon, elles gardent des ombres lisibles de
// loin sans retomber dans le rendu cubique/pixelisé.
const animeCache = new Map();
let animeGradientMap = null;

function animeGradient() {
  if (animeGradientMap) return animeGradientMap;
  // Quatre marches douces : ombre indigo → demi-teinte → lumière claire.
  // RedFormat est le format attendu par MeshToonMaterial pour la rampe.
  animeGradientMap = new THREE.DataTexture(
    new Uint8Array([34, 96, 178, 255]), 4, 1, THREE.RedFormat,
  );
  animeGradientMap.needsUpdate = true;
  animeGradientMap.minFilter = THREE.NearestFilter;
  animeGradientMap.magFilter = THREE.NearestFilter;
  animeGradientMap.generateMipmaps = false;
  return animeGradientMap;
}

const ANIME_SURFACES = {
  stone: { base: '#777899', shade: '#353754', light: '#c7d4ee', accent: '#7771ad' },
  wood: { base: '#704b52', shade: '#342337', light: '#c48975', accent: '#bd5d72' },
  earth: { base: '#45435f', shade: '#24243d', light: '#8785a4', accent: '#607078' },
  cloth: { base: '#6c2856', shade: '#2a173b', light: '#dc7ba9', accent: '#f3bd6e' },
  slate: { base: '#3f496d', shade: '#202842', light: '#8f9dd2', accent: '#5d78a1' },
  chitin: { base: '#1b5265', shade: '#10263e', light: '#4cc7d2', accent: '#cf9d4e' },
  corruptChitin: { base: '#572037', shade: '#160914', light: '#d75674', accent: '#8e2c59' },
  royalChitin: { base: '#45245f', shade: '#10091f', light: '#dd70dc', accent: '#9f4b9b' },
};

/** Texture peinte à la main (canvas lisse) pour une famille de matériaux anime. */
function paintAnimeSurface(kind) {
  const palette = ANIME_SURFACES[kind] || ANIME_SURFACES.stone;
  return canvasPair(384, (ctx, s) => {
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, s, s);

    // Lavis colorés : grandes masses transparentes, pas une grille répétée.
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 32 + Math.random() * 118;
      const wash = ctx.createRadialGradient(x, y, 0, x, y, r);
      wash.addColorStop(0, i % 3 === 0 ? `${palette.light}38` : `${palette.accent}2d`);
      wash.addColorStop(0.6, `${palette.base}0d`);
      wash.addColorStop(1, `${palette.base}00`);
      ctx.fillStyle = wash;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Traces de pinceau directionnelles, différentes selon la matière.
    const strokes = kind === 'wood' ? 58 : kind === 'cloth' ? 42 : 76;
    for (let i = 0; i < strokes; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const length = (kind === 'wood' ? 58 : 18) + Math.random() * 90;
      const bend = (Math.random() - 0.5) * (kind === 'cloth' ? 80 : 30);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + length * 0.45, y + bend, x + length, y + bend * 0.2);
      ctx.lineWidth = 0.7 + Math.random() * 2.1;
      ctx.strokeStyle = Math.random() > 0.52 ? `${palette.light}28` : `${palette.shade}34`;
      ctx.stroke();
    }

    // Rehauts ponctuels : l'aspect illustré accroche la lumière sans bruit pixel.
    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = Math.random() > 0.52 ? `${palette.light}20` : `${palette.shade}28`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 0.6 + Math.random() * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1, 1.35);
}

/** Maps anime mises en cache : une paire par surface pour le niveau entier. */
export function animeMaps(kind) {
  let entry = animeCache.get(kind);
  if (!entry) {
    entry = paintAnimeSurface(kind);
    animeCache.set(kind, entry);
  }
  return entry;
}

/** Matière toon peinte, avec UV monde identiques à l'ancienne API de blocs. */
export function animeMaterial(kind, { color = 0xffffff, tile = SURFACE_TILE, ...opts } = {}) {
  const { map, normalMap } = animeMaps(kind);
  const material = new THREE.MeshToonMaterial({
    color, map, normalMap,
    normalScale: new THREE.Vector2(0.72, 0.72),
    gradientMap: animeGradient(),
    ...opts,
  });
  material.userData.tile = tile;
  material.userData.animeSurface = kind;
  return material;
}

/** Libère les textures peintes et la rampe toon au démontage du monde. */
export function disposeAnimeMaps() {
  for (const { map, bumpMap, normalMap } of animeCache.values()) {
    map?.dispose?.();
    bumpMap?.dispose?.();
    normalMap?.dispose?.();
  }
  animeCache.clear();
  animeGradientMap?.dispose?.();
  animeGradientMap = null;
}

/**
 * Met les UV d'un BoxGeometry à l'échelle du monde : la maille de la
 * texture couvre `tile` mètres sur chaque face (jamais d'étirement).
 * Ordre des faces Three : +X, −X, +Y, −Y, +Z, −Z.
 */
const BOX_FACE_AXES = [['z', 'y'], ['z', 'y'], ['x', 'z'], ['x', 'z'], ['x', 'y'], ['x', 'y']];
export function scaleBoxUV(geometry, size, tile = SURFACE_TILE) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const dims = { x: size.x, y: size.y, z: size.z };
  for (let face = 0; face < 6; face++) {
    const [u, v] = BOX_FACE_AXES[face];
    const su = Math.max(1e-3, dims[u] / tile);
    const sv = Math.max(1e-3, dims[v] / tile);
    for (let i = 0; i < 4; i++) {
      const idx = face * 4 + i;
      uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Même mise à l'échelle pour un PlaneGeometry (largeur × hauteur). */
export function scalePlaneUV(geometry, width, height, tile = SURFACE_TILE) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const su = Math.max(1e-3, width / tile);
  const sv = Math.max(1e-3, height / tile);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Multiplicateur d'UV libre — pour les solides extrudés/tournés dont les
 * UV ne suivent pas le modèle « 6 faces » (façade gothique, vantaux,
 * cylindres des tours). `su`/`sv` = nombre de carreaux par unité d'UV.
 */
export function multiplyUV(geometry, su = 1, sv = 1) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geometry;
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
      color: 0x6a6779, roughness: 0.9,
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
  // Pierre taillée texturée : la version unie (SOULS_PALETTE.stone, albedo
  // 0.055) faisait des colonnes de la nef six fois plus sombres que les
  // murs — huit « murs noirs » de 9 m le long de l'allée du trône.
  const stoneMat = animeMaterial('stone', { color: 0xb5b8df, tile: 1.9 });
  const fluteMat = new THREE.MeshToonMaterial({ color: 0x9da6d4, gradientMap: animeGradient() });
  const trimMat = animeMaterial('slate', { color: 0xa7abd6, tile: 1.4 });

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
  const columnGeo = new THREE.LatheGeometry(profile, 20);
  // UV monde : le parement couvre ~1,6 m par brique, quel que soit le fût.
  multiplyUV(columnGeo, (Math.PI * 2 * 0.42) / 1.6, shaftTop / 1.6);
  const column = new THREE.Mesh(columnGeo, stoneMat);
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
      const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, (shaftTop - 0.4), 6), fluteMat);
      flute.position.set(Math.cos(a) * 0.36, 0.32 + (shaftTop - 0.4) / 2, Math.sin(a) * 0.36);
      group.add(flute);
    }
  } else {
    // cassure : éclats au sol
    for (let i = 0; i < 3; i++) {
      const chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + i * 0.05, 0), fluteMat);
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
  const rockMat = mat(0x4d4b59, { roughness: 1 }); // était 0x33323e : rochers noirs sous la lune
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

/** Lathe helper : profil réellement tourné + aplatissement avant/arrière. */
function lathe(points, material, zScale = 1) {
  // Le rig garde ses pivots, mais les muscles et armures ont enfin une
  // silhouette organique au lieu d'une boîte englobante.
  const profile = points.map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), material);
  mesh.scale.z = zScale;
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

  // ── Gardes ennemis : formes douces et silhouettes low-poly, cohérentes
  // avec la direction anime du monde. ───────────────────────────────
  const skin = mat(fallen ? 0x97908a : 0xb58a6c, { roughness: 0.88, flatShading: false });
  const skinDark = mat(0x99714f, { roughness: 0.8, flatShading: false });
  const hairMat = mat(fallen ? 0x8f897d : 0x2b1f18, { roughness: 0.92, flatShading: false });
  const eyeMat = fallen
    ? new THREE.MeshStandardMaterial({
      color: 0x2a0d04, emissive: 0xff5a1e, emissiveIntensity: 2.4, roughness: 0.4,
    })
    : mat(0x17130f, { roughness: 0.35, flatShading: false });
  const lipMat = mat(0x96635a, { roughness: 0.72, flatShading: false });
  const trousers = mat(0x3a352f, { roughness: 1, flatShading: false });
  const leatherMat = mat(SOULS_PALETTE.leather, { roughness: 1, flatShading: false });
  const furMat = mat(SOULS_PALETTE.fur, { roughness: 1, flatShading: false });
  const furTip = mat(SOULS_PALETTE.furLight, { roughness: 1, flatShading: false });
  const boneMat = mat(SOULS_PALETTE.bone, { roughness: 0.55, flatShading: false });
  const trimMat = mat(fallen ? 0x6f6a5c : SOULS_PALETTE.trim, { metalness: 0.85, roughness: fallen ? 0.45 : 0.26, flatShading: false });
  const clothMat = mat(fallen ? 0x3f1d20 : SOULS_PALETTE.cloth, {
    roughness: 1, flatShading: false, side: THREE.DoubleSide,
  });

  // Volumes lissés, assez d'arêtes pour une lecture anime nette : les
  // gardes conservent le même rig mais quittent eux aussi les blocs empilés.
  const sphere = (r, material, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  const capsule = (r, len, material) => (
    new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), material)
  );

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
  torso.position.y = TORSO_Y;
  body.add(torso);
  const W = (y) => y - TORSO_Y; // monde → local torso

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
  const steelMat = mat(0x9aa2b8, { metalness: 0.85, roughness: 0.38, flatShading: false });
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

  // ─ potion de vie : fiole de verre au liquide rouge, dans la main
  // gauche. Invisible tant qu'on ne boit pas (geste piloté par le monde).
  const potion = makePotionProp();
  // Tenue DANS le poing gauche (groupe coude) : le contact main/fiole est
  // garanti par construction, quelle que soit la pose. Le monde ne pilote
  // que la visibilité et le basculement du goulot vers les lèvres.
  potion.position.set(0, -0.3, -0.06);
  potion.visible = false;
  armL.elbow.add(potion);

  const shadow = null; // plus de « pastille noire » au sol : les ombres
  // portées dynamiques (lune + GTAO) ancrent déjà les silhouettes, et un
  // disque noir traversable se lisait comme un bug d'affichage.

  knight.userData.shadow = shadow;
  knight.userData.parts = {
    body, hips, torso, head,
    armL: armL.arm, armR: armR.arm, elbowL: armL.elbow, elbowR: armR.elbow,
    legL: legL.leg, legR: legR.leg, kneeL: legL.knee, kneeR: legR.knee,
    footL: legL.foot, footR: legR.foot,
    cape, visor, weapon, strands, potion,
  };
  return knight;
}

// ── Guerriers insectes : héros, gardes corrompus et Roi Chitine ─────
// Le contrôleur de combat utilise le même contrat de rig pour tous les
// guerriers : seules la palette et la stature changent entre le héros, les
// sentinelles déchues et le boss. Les ennemis ne sont donc plus humanoïdes.
export function makeInsectWarrior({ corrupted = false, boss = false } = {}) {
  const variant = boss ? 'royal' : corrupted ? 'corrupt' : 'guardian';
  const palette = boss
    ? {
      surface: 'royalChitin', chitinTint: 0xffffff, dark: 0x170b29, light: 0xdf76dc, lightEmissive: 0x55145c,
      gold: 0xe4aa63, cloth: 0x7c264d, eye: 0xff72c1, eyeEmissive: 0xff1b75,
      blade: 0xe2b8ff, bladeEmissive: 0x852bb2, edge: 0xffe7ff, edgeEmissive: 0xd675e8,
      wing: 0xc268bd, wingEmissive: 0x45104f, vein: 0xffb1e3, wingOpacity: 0.36,
      identity: 'ROI CHITINE DE CENDRE',
    }
    : corrupted
      ? {
        surface: 'corruptChitin', chitinTint: 0xffffff, dark: 0x170a17, light: 0xd95272, lightEmissive: 0x571021,
        gold: 0xa96575, cloth: 0x612338, eye: 0xff576b, eyeEmissive: 0xdb1028,
        blade: 0xc46f91, bladeEmissive: 0x621431, edge: 0xffbfd1, edgeEmissive: 0x9a294f,
        wing: 0x87405f, wingEmissive: 0x300a1a, vein: 0xff849f, wingOpacity: 0.29,
        identity: 'GUERRIER INSECTE DÉCHU',
      }
      : {
        surface: 'chitin', chitinTint: 0x377f91, dark: 0x17344f, light: 0x69d7d5, lightEmissive: 0x155b70,
        gold: 0xe0aa59, cloth: 0xb14c82, eye: 0xffc45e, eyeEmissive: 0xff9a24,
        blade: 0x93f3f0, bladeEmissive: 0x1d8aab, edge: 0xe8fbff, edgeEmissive: 0x62d6ed,
        wing: 0x8fe7f2, wingEmissive: 0x3557a5, vein: 0xb5eefd, wingOpacity: 0.44,
        identity: 'GUERRIER INSECTE · GARDIEN CHITINE',
      };
  const warrior = new THREE.Group();
  warrior.name = boss ? 'roi-chitine' : corrupted ? 'guerrier-insecte-dechu' : 'gardien-chitine';
  const body = new THREE.Group();
  body.name = `${warrior.name}-body`;
  warrior.add(body);

  const toon = (color, opts = {}) => new THREE.MeshToonMaterial({
    color,
    gradientMap: animeGradient(),
    ...opts,
  });
  const chitin = animeMaterial(palette.surface, { color: palette.chitinTint, tile: 0.9 });
  const chitinDark = toon(palette.dark, { emissive: palette.dark, emissiveIntensity: corrupted || boss ? 0.46 : 0.35 });
  const chitinLight = toon(palette.light, { emissive: palette.lightEmissive, emissiveIntensity: corrupted || boss ? 0.76 : 0.52 });
  const gold = toon(palette.gold, { emissive: boss ? 0x5e2c13 : 0x4d2b0d, emissiveIntensity: 0.5 });
  const cloth = animeMaterial('cloth', { color: palette.cloth, tile: 0.95, side: THREE.DoubleSide });
  const eyeGlow = new THREE.MeshStandardMaterial({
    color: palette.eye, emissive: palette.eyeEmissive, emissiveIntensity: boss ? 4.1 : 3.25,
    roughness: 0.22, metalness: 0.25,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: palette.blade, emissive: palette.bladeEmissive, emissiveIntensity: boss ? 1.15 : 0.86,
    metalness: 0.68, roughness: 0.17,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: palette.edge, emissive: palette.edgeEmissive, emissiveIntensity: 0.62,
    metalness: 0.8, roughness: 0.1,
  });
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: palette.wing, emissive: palette.wingEmissive, emissiveIntensity: boss ? 0.68 : 0.42,
    roughness: 0.16, metalness: 0.05, transmission: 0.08,
    transparent: true, opacity: palette.wingOpacity, side: THREE.DoubleSide,
    depthWrite: false,
  });
  const veinMat = new THREE.MeshBasicMaterial({
    color: palette.vein, transparent: true, opacity: corrupted || boss ? 0.82 : 0.74,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ellipsoid = (r, material, sx = 1, sy = 1, sz = 1, segments = 18) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, segments, Math.max(10, Math.round(segments * 0.72))), material);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  const capsule = (r, length, material) => (
    new THREE.Mesh(new THREE.CapsuleGeometry(r, length, 6, 14), material)
  );
  const ring = (r, tube, material) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20), material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  // ══ Bassin + pattes articulées =====================================
  const hips = new THREE.Group();
  hips.name = 'insect-hips';
  body.add(hips);
  const pelvis = ellipsoid(0.17, chitinDark, 1.2, 0.72, 0.9);
  pelvis.position.y = 0.89;
  const waistRing = ring(0.18, 0.022, gold);
  waistRing.position.y = 0.94;
  const abdomen = ellipsoid(0.16, chitin, 0.94, 1.1, 0.82);
  abdomen.position.set(0, 0.75, 0.105);
  hips.add(pelvis, waistRing, abdomen);
  for (let i = 0; i < 3; i++) {
    const band = ring(0.155 - i * 0.011, 0.012, i === 1 ? chitinLight : gold);
    band.position.set(0, 0.84 - i * 0.105, 0.11 + i * 0.012);
    band.scale.z = 0.82;
    hips.add(band);
  }

  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'insect-leg-left' : 'insect-leg-right';
    leg.position.set(side * 0.118, 0.88, 0);
    const upper = capsule(0.077, 0.23, chitin);
    upper.position.y = -0.16;
    const upperPlate = ellipsoid(0.092, chitinLight, 0.9, 1.15, 0.54);
    upperPlate.position.set(0, -0.13, -0.065);
    const upperBand = ring(0.078, 0.012, gold);
    upperBand.position.y = -0.31;
    leg.add(upper, upperPlate, upperBand);

    const knee = new THREE.Group();
    knee.position.y = -0.4;
    const joint = ellipsoid(0.082, chitinDark, 1, 0.92, 1.05);
    const kneeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.17, 8), chitinLight);
    kneeBlade.rotation.x = Math.PI / 2;
    kneeBlade.position.set(0, 0.012, -0.102);
    const shin = capsule(0.061, 0.25, chitin);
    shin.position.y = -0.18;
    const shinPlate = ellipsoid(0.071, chitinLight, 0.78, 1.45, 0.44);
    shinPlate.position.set(0, -0.19, -0.052);
    const ankleBand = ring(0.063, 0.01, gold);
    ankleBand.position.y = -0.335;

    const foot = new THREE.Group();
    foot.position.y = -0.4;
    const heel = ellipsoid(0.062, chitinDark, 0.95, 0.72, 1.12);
    heel.position.set(0, -0.012, 0.018);
    const toeCore = ellipsoid(0.058, chitin, 0.82, 0.58, 1.6);
    toeCore.position.set(0, -0.038, -0.09);
    foot.add(heel, toeCore);
    for (const offset of [-0.033, 0.033]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.13, 6), gold);
      claw.rotation.x = -Math.PI / 2;
      claw.position.set(offset, -0.049, -0.185);
      foot.add(claw);
    }
    knee.add(joint, kneeBlade, shin, shinPlate, ankleBand, foot);
    leg.add(knee);
    return { leg, knee, foot };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  hips.add(legL.leg, legR.leg);

  // ══ Thorax caréné + plaques de scarabée ============================
  const torso = new THREE.Group();
  torso.name = 'insect-thorax';
  torso.position.y = TORSO_Y;
  body.add(torso);
  const W = (y) => y - TORSO_Y;
  const thorax = ellipsoid(0.235, chitin, 1.0, 1.34, 0.78, 22);
  thorax.position.set(0, W(1.22), 0.005);
  const backShell = ellipsoid(0.215, chitinDark, 1.03, 1.1, 0.47, 20);
  backShell.position.set(0, W(1.24), 0.115);
  torso.add(thorax, backShell);
  for (let i = 0; i < 4; i++) {
    const plate = ellipsoid(0.155 - i * 0.008, i % 2 ? chitinLight : chitinDark, 1.0, 0.48, 0.3);
    plate.position.set(0, W(1.06 + i * 0.097), -0.166 - i * 0.003);
    plate.rotation.x = -0.08 + i * 0.045;
    torso.add(plate);
  }
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 8), gold);
  crest.position.set(0, W(1.42), -0.04);
  torso.add(crest);
  for (const side of [-1, 1]) {
    const shoulderShell = ellipsoid(0.125, chitinLight, 1.32, 0.58, 1.0);
    shoulderShell.position.set(side * 0.205, W(1.39), 0.005);
    torso.add(shoulderShell);
  }

  // ══ Bras segmentés, griffes et bracelets d'or ======================
  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'insect-arm-left' : 'insect-arm-right';
    arm.position.set(side * 0.225, W(1.4), 0);
    const upper = capsule(0.064, 0.2, chitin);
    upper.position.y = -0.145;
    const shoulder = ellipsoid(0.095, chitinLight, 1.08, 0.84, 0.92);
    shoulder.position.y = 0.008;
    const upperBand = ring(0.067, 0.011, gold);
    upperBand.position.y = -0.26;
    arm.add(upper, shoulder, upperBand);
    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    const joint = ellipsoid(0.065, chitinDark, 1, 1, 1.04);
    const forearm = capsule(0.052, 0.18, chitin);
    forearm.position.y = -0.14;
    const forePlate = ellipsoid(0.064, chitinLight, 0.8, 1.25, 0.52);
    forePlate.position.set(0, -0.14, -0.047);
    const wristBand = ring(0.053, 0.009, gold);
    wristBand.position.y = -0.255;
    const palm = ellipsoid(0.052, chitinDark, 0.94, 1.12, 0.82);
    palm.position.y = -0.3;
    elbow.add(joint, forearm, forePlate, wristBand, palm);
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.068, 5), gold);
      claw.rotation.x = -Math.PI / 2;
      claw.position.set((i - 1) * 0.022, -0.315, -0.056);
      elbow.add(claw);
    }
    arm.add(elbow);
    return { arm, elbow };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  torso.add(armL.arm, armR.arm);

  // ══ Masque d'insecte, yeux composés et antennes ====================
  const head = new THREE.Group();
  head.name = 'insect-mask';
  head.position.y = W(1.46);
  const neck = capsule(0.075, 0.075, chitinDark);
  neck.position.y = 0.025;
  const helmet = ellipsoid(0.17, chitin, 0.91, 1.08, 0.94, 22);
  helmet.position.set(0, 0.145, 0.006);
  const facePlate = ellipsoid(0.125, chitinDark, 0.94, 1.04, 0.3);
  facePlate.position.set(0, 0.115, -0.132);
  const mandible = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.15, 6), gold);
  mandible.rotation.x = Math.PI / 2;
  mandible.position.set(0, 0.055, -0.17);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.19, 7), chitinLight);
  crown.position.set(0, 0.31, -0.005);
  head.add(neck, helmet, facePlate, mandible, crown);

  // `visor` reste la collection d'yeux attendue par l'animation de clignement.
  const visor = new THREE.Group();
  visor.name = 'compound-eyes';
  for (const side of [-1, 1]) {
    const eyePivot = new THREE.Group();
    eyePivot.position.set(side * 0.071, 0.15, -0.154);
    eyePivot.rotation.y = side * 0.35;
    const eye = ellipsoid(0.062, eyeGlow, 0.72, 1.16, 0.28, 16);
    const highlight = ellipsoid(0.017, new THREE.MeshBasicMaterial({ color: corrupted || boss ? 0xffc0e2 : 0xfff2be }), 1, 1, 0.2, 10);
    highlight.position.set(side * 0.011, 0.025, -0.018);
    eyePivot.add(eye, highlight);
    visor.add(eyePivot);
  }
  head.add(visor);

  const strands = [];
  for (const side of [-1, 1]) {
    const antenna = new THREE.Group();
    antenna.name = side < 0 ? 'antenna-left' : 'antenna-right';
    antenna.position.set(side * 0.075, 0.27, -0.065);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.045, 0.10, -0.055),
      new THREE.Vector3(side * 0.12, 0.22, -0.13),
      new THREE.Vector3(side * 0.18, 0.32, -0.08),
    ]);
    const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.011, 6, false), gold);
    const tip = ellipsoid(0.024, eyeGlow, 0.8, 1.25, 0.8, 10);
    tip.position.set(side * 0.18, 0.32, -0.08);
    antenna.add(stalk, tip);
    head.add(antenna);
    strands.push(antenna);
  }
  torso.add(head);

  // ══ Ailes irisées — elles sont pilotées par le même mouvement secondaire
  // que l'ancienne cape : course et roulade les font vibrer légèrement. ══
  const cape = new THREE.Group();
  cape.name = 'iridescent-wings';
  cape.position.set(0, W(1.39), 0.125);
  const makeWing = (side) => {
    const wing = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(side * 0.26, 0.04, side * 0.6, 0.42);
    shape.quadraticCurveTo(side * 0.85, 0.74, side * 0.69, 1.08);
    shape.quadraticCurveTo(side * 0.34, 0.93, side * 0.08, 0.28);
    shape.quadraticCurveTo(side * 0.02, 0.12, 0, 0);
    const membrane = new THREE.Mesh(new THREE.ShapeGeometry(shape, 14), wingMat);
    membrane.renderOrder = 2;
    wing.add(membrane);
    const veins = [
      [new THREE.Vector3(0, 0.02, 0.008), new THREE.Vector3(side * 0.29, 0.33, 0.011), new THREE.Vector3(side * 0.64, 0.88, 0.007)],
      [new THREE.Vector3(side * 0.12, 0.17, 0.012), new THREE.Vector3(side * 0.42, 0.28, 0.012), new THREE.Vector3(side * 0.68, 0.58, 0.009)],
    ];
    for (const points of veins) {
      wing.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.009, 4, false), veinMat,
      ));
    }
    return wing;
  };
  const wingL = makeWing(-1);
  const wingR = makeWing(1);
  cape.add(wingL, wingR);
  torso.add(cape);

  // ══ Épée longue à deux mains — garde levée au centre du thorax ======
  // Une vraie lame droite remplace l'arme d'hast : long pommeau, poignée assez
  // grande pour les deux paumes et garde ailée de chitine. La géométrie de la
  // lame est construite vers −Y puis retournée pour que la pointe reste levée.
  const weaponMount = new THREE.Group();
  weaponMount.name = 'raised-two-hand-sword-mount';
  weaponMount.position.set(0, W(1.28), -0.29);
  weaponMount.rotation.set(0.03, 0, 0.08);
  torso.add(weaponMount);

  const weapon = new THREE.Group();
  weapon.name = 'two-handed-chitin-sword';
  const swordBladeShape = new THREE.Shape();
  swordBladeShape.moveTo(-0.105, -0.27);
  swordBladeShape.lineTo(-0.145, -1.25);
  swordBladeShape.lineTo(0, -1.54);
  swordBladeShape.lineTo(0.145, -1.25);
  swordBladeShape.lineTo(0.105, -0.27);
  swordBladeShape.lineTo(0, -0.19);
  swordBladeShape.closePath();
  const swordBlade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(swordBladeShape, {
      depth: 0.052, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.008, bevelThickness: 0.008,
    }),
    bladeMat,
  );
  swordBlade.name = 'two-handed-sword-blade';
  swordBlade.position.z = -0.026;

  // Un fuller lumineux encastré et une arête centrale donnent une lecture
  // anime nette à la lame, même dans les zones sombres de La Cendre.
  const fullerShape = new THREE.Shape();
  fullerShape.moveTo(-0.026, -0.36);
  fullerShape.lineTo(-0.04, -1.19);
  fullerShape.lineTo(0, -1.39);
  fullerShape.lineTo(0.04, -1.19);
  fullerShape.lineTo(0.026, -0.36);
  fullerShape.closePath();
  const fuller = new THREE.Mesh(new THREE.ShapeGeometry(fullerShape), edgeMat);
  fuller.position.z = -0.037;
  const bladeRidge = capsule(0.011, 0.94, edgeMat);
  bladeRidge.position.set(0, -0.86, -0.047);

  const guard = capsule(0.046, 0.48, gold);
  guard.name = 'two-handed-sword-crossguard';
  guard.rotation.z = Math.PI / 2;
  guard.position.y = -0.27;
  const guardCore = ellipsoid(0.074, chitinLight, 1.25, 0.54, 0.72, 14);
  guardCore.position.y = -0.27;
  const guardTipL = ellipsoid(0.058, gold, 1.25, 0.58, 0.8, 12);
  guardTipL.position.set(-0.31, -0.27, 0);
  const guardTipR = guardTipL.clone();
  guardTipR.position.x = 0.31;
  const collar = ring(0.073, 0.011, gold);
  collar.position.y = -0.16;

  // Poignée longue, cerclée trois fois : les deux repères de main restent
  // exactement au centre de cette même poignée, jamais sur un décor latéral.
  const hilt = capsule(0.048, 0.72, cloth);
  hilt.name = 'two-handed-sword-long-hilt';
  hilt.position.y = 0.19;
  const gripBands = [-0.02, 0.20, 0.43].map((y) => {
    const band = ring(0.057, 0.009, gold);
    band.position.y = y;
    return band;
  });
  const pommel = ellipsoid(0.082, gold, 0.92, 1.18, 0.82);
  pommel.position.y = 0.65;
  const pommelGem = ellipsoid(0.034, chitinLight, 0.82, 1, 0.42, 10);
  pommelGem.position.set(0, 0.65, -0.068);

  // Repères invisibles pour les centres des deux vraies paumes. La rotation
  // de π lève la pointe ; X est donc inversé pour conserver chaque main de
  // son côté du corps dans la garde de repos.
  const rightGrip = new THREE.Object3D();
  rightGrip.name = 'sword-right-hand-grip';
  rightGrip.position.set(-0.042, 0.30, 0.012);
  const offhandGrip = new THREE.Object3D();
  offhandGrip.name = 'sword-left-hand-grip';
  offhandGrip.position.set(0.042, -0.06, 0.012);
  weapon.add(swordBlade, fuller, bladeRidge, guard, guardCore, guardTipL, guardTipR,
    collar, hilt, ...gripBands, pommel, pommelGem, rightGrip, offhandGrip);
  weapon.scale.setScalar(0.85);
  // π : la lame dessinée vers −Y devient une épée pointe vers le ciel.
  weapon.rotation.set(0.06, 0, Math.PI + 0.04);
  weapon.traverse((mesh) => { if (mesh.isMesh) mesh.userData.cameraBlocker = true; });
  weaponMount.add(weapon);


  // Pose neutre : conserve les valeurs attendues par SoulsWorld.
  armL.elbow.rotation.x = 0.22;
  armR.elbow.rotation.x = 0.22;
  legL.knee.rotation.x = -0.05;
  legR.knee.rotation.x = -0.05;

  const potion = makePotionProp();
  potion.position.set(0, -0.3, -0.06);
  potion.visible = false;
  armL.elbow.add(potion);

  warrior.userData.identity = palette.identity;
  warrior.userData.variant = variant;
  warrior.userData.parts = {
    body, hips, torso, head,
    armL: armL.arm, armR: armR.arm, elbowL: armL.elbow, elbowR: armR.elbow,
    legL: legL.leg, legR: legR.leg, kneeL: legL.knee, kneeR: legR.knee,
    footL: legL.foot, footR: legR.foot,
    cape, wings: [wingL, wingR], visor, weapon, weaponMount, rightGrip, offhandGrip, strands, potion,
  };
  return warrior;
}

// ── Potion de vie (objet tenu en main) ──────────────────────────────

/**
 * Fiole de nectar : verre rond, liquide incandescent et col cerclé d'or.
 * `userData.liquid` garde le contrat utilisé par la gorgée dans SoulsWorld.
 */
export function makePotionProp() {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbfe8ef, roughness: 0.08, metalness: 0.04,
    transparent: true, opacity: 0.5, transmission: 0.06,
  });
  const liquid = new THREE.MeshStandardMaterial({
    color: 0xc9477d, emissive: 0xff4d9c, emissiveIntensity: 1.75,
    roughness: 0.22, metalness: 0.05,
  });
  const cork = new THREE.MeshToonMaterial({ color: 0x70495b, gradientMap: animeGradient() });
  const trim = new THREE.MeshToonMaterial({ color: 0xe0aa59, gradientMap: animeGradient(), emissive: 0x5a3511, emissiveIntensity: 0.45 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 10), glass);
  body.scale.set(0.92, 1.22, 0.92);
  body.position.y = -0.052;
  // Le monde pilote `scale.y` directement avec une hauteur en mètres.
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 1, 12), liquid);
  fill.scale.y = 0.072;
  fill.position.y = -0.062;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.034, 0.066, 12), glass);
  neck.position.y = 0.025;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), trim);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.051;
  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.03, 10), cork);
  stopper.position.y = 0.071;
  group.add(body, fill, neck, collar, stopper);
  group.userData.liquid = fill;
  group.userData.liquidHeight = 0.072;
  group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.userData.noCast = false; } });
  return group;
}

/**
 * Gerbe de soins : motes rouge/or qui montent le long du corps pendant
 * la gorgée. `burst(x, y, z)` puis `update(dt)`.
 */
export function makeHealMotes(count = 30) {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xff6a5a, size: 0.075, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const seeds = new Float32Array(count * 3);
  let life = 0;
  return {
    points,
    burst(x, y, z) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.14 + Math.random() * 0.3;
        seeds[i * 3] = Math.cos(a) * r;
        seeds[i * 3 + 1] = 0.35 + Math.random() * 1.2;
        seeds[i * 3 + 2] = Math.sin(a) * r;
        positions[i * 3] = x + seeds[i * 3];
        positions[i * 3 + 1] = y + Math.random() * 0.4;
        positions[i * 3 + 2] = z + seeds[i * 3 + 2];
      }
      life = 1;
      material.opacity = 0.95;
      geometry.attributes.position.needsUpdate = true;
    },
    update(dt) {
      if (life <= 0) return;
      life = Math.max(0, life - dt * 0.85);
      material.opacity = life * 0.95;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += dt * seeds[i * 3 + 1];
        positions[i * 3] += Math.sin(life * 9 + i) * dt * 0.05;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
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
// ── Chemin du Roi : dalles peintes à la main ─────────────────────────

/** Dalles irrégulières, rehaussées de lavis indigo et de bordures claires. */
export function makeStonePath(points, { width = 2.4, step = 0.62 } = {}) {
  const group = new THREE.Group();
  const stone = animeMaterial('stone', { color: 0xb3b7e0, tile: 1.45 });
  const dark = animeMaterial('slate', { color: 0x8589b1, tile: 1.45 });
  const edge = animeMaterial('stone', { color: 0xc8d3ed, tile: 1.05 });
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const addSlab = (material, w, d, px, pz, yaw, y = 0.05) => {
    const geo = scaleBoxUV(new THREE.BoxGeometry(w, 0.1, d), { x: w, y: 0.1, z: d }, material.userData.tile);
    const slab = new THREE.Mesh(geo, material);
    slab.position.set(px, y, pz);
    slab.rotation.y = yaw;
    slab.receiveShadow = true;
    group.add(slab);
    return slab;
  };
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / step));
    const yaw = Math.atan2(-dx, -dz);
    const nx = -dz / (len || 1);
    const nz = dx / (len || 1);
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n;
      const px = x0 + dx * u + (rnd() - 0.5) * 0.24;
      const pz = z0 + dz * u + (rnd() - 0.5) * 0.16;
      addSlab(
        rnd() > 0.72 ? dark : stone,
        width * (0.72 + rnd() * 0.4), (len / n) * (0.7 + rnd() * 0.3),
        px, pz, yaw + (rnd() - 0.5) * 0.22,
      );
      // Bordure : pierres plus petites de part et d'autre (chemin lisible).
      if (j % 2 === 0) {
        for (const side of [-1, 1]) {
          addSlab(edge, 0.36, 0.4,
            px + nx * side * (width * 0.56), pz + nz * side * (width * 0.56),
            yaw + rnd() * 0.7, 0.035);
        }
      }
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
  grad.addColorStop(0, '#040615');
  grad.addColorStop(0.5, '#10152e');
  grad.addColorStop(0.76, '#282746');
  grad.addColorStop(1, '#472540');
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
  glow([1.25, 1.35, 3.15], 2.65, -24, 26, -34);    // lune froide, discrète
  glow([3.8, 0.75, 1.55], 0.9, 0, 1.5, 0);          // feu du camp
  for (const [x, z] of [[-5.4, -3.8], [5.4, -3.8], [-5.4, 4.2], [5.4, 4.2]]) {
    glow([2.8, 0.48, 1.2], 0.58, x, 1.6, z);        // braseros rouge cendre
  }

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 24),
    new THREE.MeshBasicMaterial({ color: 0x060713 }),
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
      topColor: { value: new THREE.Color(0x030514) },
      midColor: { value: new THREE.Color(0x0c1129) },
      horizonColor: { value: new THREE.Color(0x272640) },
      warmColor: { value: new THREE.Color(0x552149) },
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
      color: 0xf2e8ff,
      size: 0.9,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.68,
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
    [0, 'rgba(220, 221, 255, 0.78)'],
    [0.25, 'rgba(111, 124, 212, 0.24)'],
    [1, 'rgba(82, 96, 175, 0)'],
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
    [0, 'rgba(111, 91, 157, 0.30)'],
    [0.55, 'rgba(68, 85, 144, 0.13)'],
    [1, 'rgba(54, 62, 122, 0)'],
  ]);
  const group = new THREE.Group();
  for (const [x, z, sx, sy, opacity] of list) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      color: 0x847aa8,
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
export function makeLightShaft(x, y, z, { color = 0xff8ac5, height = 4.2, rBottom = 0.28, rTop = 0.7, opacity = 0.14 } = {}) {
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

// ── Petits décors « Chemin du Roi » (densité sans coût) ─────────────

/** Fougère basse : lames souples en éventail (sans collision). */
export function makeFern(x, z, scale = 1) {
  const group = new THREE.Group();
  const greens = [0x2b4a2a, 0x356033, 0x24401f];
  const blades = 6;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + (i % 2) * 0.3;
    const blade = new THREE.Mesh(
      cube, mat(greens[i % greens.length], { roughness: 1, flatShading: true }),
    );
    blade.scale.set(0.035, 0.3, 0.09);
    blade.position.set(Math.cos(a) * 0.09, 0.14, Math.sin(a) * 0.09);
    blade.rotation.z = -Math.cos(a) * 0.55;
    blade.rotation.x = Math.sin(a) * 0.55;
    group.add(blade);
  }
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

/** Champignons lumineux : repères phosphorescents du sous-bois. */
export function makeMushrooms(x, z, seed = 0) {
  const group = new THREE.Group();
  const stemMat = mat(0xcfc6ae, { roughness: 0.9, flatShading: true });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2f6b62, emissive: 0x4fe3c0, emissiveIntensity: 0.85,
    roughness: 0.6, flatShading: true,
  });
  const n = 3 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const a = ((seed * 5 + i * 13) % 10) / 10 * Math.PI * 2;
    const r = 0.1 + ((seed + i) % 3) * 0.07;
    const stem = new THREE.Mesh(cube, stemMat);
    stem.scale.set(0.035, 0.11 + i * 0.02, 0.035);
    stem.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
    const cap = new THREE.Mesh(cube, capMat);
    cap.scale.set(0.09, 0.035, 0.09);
    cap.position.set(Math.cos(a) * r, 0.125 + i * 0.02, Math.sin(a) * r);
    group.add(stem, cap);
  }
  group.position.set(x, 0, z);
  return group;
}

/** Rondin moussu couché (sans collision : décor de sous-bois). */
export function makeFallenLog(x, z, yaw = 0, len = 1.8) {
  const group = new THREE.Group();
  const bark = mat(0x33251a, { roughness: 1, flatShading: true });
  const moss = mat(0x2f4a26, { roughness: 1, flatShading: true });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, len, 8), bark);
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.18;
  log.userData.cameraBlocker = true;
  group.add(log);
  for (let i = 0; i < 4; i++) {
    const patch = new THREE.Mesh(cube, moss);
    patch.scale.set(0.24, 0.04, 0.2);
    patch.position.set(-len / 2 + 0.3 + i * (len / 4), 0.32, (i % 2 ? 0.06 : -0.05));
    patch.rotation.y = i;
    group.add(patch);
  }
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  const blockers = [];
  group.traverse((m) => { if (m.isMesh && m.userData.cameraBlocker) blockers.push(m); });
  return { group, blockers, collider: { kind: 'circle', x, z, r: len * 0.42 } };
}

/**
 * Torche murale : console de fer + flamme + lueur. La lumière est
 * mutualisée par le monde (flickerable sans PointLight propre).
 */
export function makeSconce(x, y, z, rotY = 0) {
  const group = new THREE.Group();
  const iron = mat(0x1c1d23, { metalness: 0.7, roughness: 0.45, flatShading: true });
  const arm = new THREE.Mesh(cube, iron);
  arm.scale.set(0.09, 0.09, 0.42);
  arm.position.set(0, 0, 0.21);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.16, 8), iron);
  cup.position.set(0, 0.1, 0.42);
  group.add(arm, cup);
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffb347, emissive: 0xff8a2e, emissiveIntensity: 2.6,
    transparent: true, opacity: 0.95,
  });
  const flame = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), flameMat);
  outer.position.y = 0.38;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffd170, emissiveIntensity: 3, transparent: true, opacity: 0.95 }),
  );
  inner.position.y = 0.32;
  flame.add(outer, inner);
  flame.position.set(0, 0.16, 0.42);
  group.add(flame);
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  group.userData.flame = flame;
  group.userData.light = null;
  group.userData.lightBase = 0;
  group.userData.flickerSeed = Math.random() * 10;
  return { group, blockers: [cup], flickerable: group.userData };
}

/** Bannière pendue : étoffe pourpre + emblème doré pixelisé. */
export function makeBanner(x, y, z, rotY = 0, height = 4.4) {
  const group = new THREE.Group();
  const cloth = new THREE.Mesh(
    cube,
    mat(SOULS_PALETTE.cloth, { roughness: 1, flatShading: true, side: THREE.DoubleSide }),
  );
  cloth.scale.set(1.5, height, 0.06);
  cloth.position.y = -height / 2;
  const rod = new THREE.Mesh(cube, mat(SOULS_PALETTE.trim, { metalness: 0.7, roughness: 0.35, flatShading: true }));
  rod.scale.set(1.8, 0.09, 0.09);
  group.add(cloth, rod);
  // Emblème : losange + deux pointes (héraldique lisible de loin).
  const gold = mat(SOULS_PALETTE.trim, { metalness: 0.75, roughness: 0.3, emissive: 0x4a3612, emissiveIntensity: 0.45, flatShading: true });
  const diamond = new THREE.Mesh(cube, gold);
  diamond.scale.set(0.5, 0.5, 0.08);
  diamond.rotation.z = Math.PI / 4;
  diamond.position.set(0, -height * 0.42, -0.05);
  const spikeA = new THREE.Mesh(cube, gold);
  spikeA.scale.set(0.12, 0.55, 0.08);
  spikeA.position.set(0, -height * 0.72, -0.05);
  group.add(diamond, spikeA);
  // Queue en pointe
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.75, 3), cloth.material);
  tip.rotation.z = Math.PI;
  tip.position.y = -height - 0.36;
  group.add(tip);
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return { group, blockers: [] };
}

/** Disque runique gravé au sol (émissif doux, sans collision). */
export function makeRuneDisc(x, z, radius = 2.2, color = 0xc9a24b) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.09, 48),
    new THREE.MeshStandardMaterial({
      color: 0x6a5526, emissive: color, emissiveIntensity: 0.4,
      roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.62, radius * 0.66, 48),
    new THREE.MeshStandardMaterial({
      color: 0x4a3d20, emissive: color, emissiveIntensity: 0.22,
      roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide,
    }),
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.004;
  group.add(ring, inner);
  // Glyphes : petits blocs répartis sur l'anneau.
  const glyph = mat(0x6a5526, { emissive: color, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.5, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const g = new THREE.Mesh(cube, glyph);
    g.scale.set(0.1, 0.02, 0.24);
    g.position.set(Math.cos(a) * radius * 0.84, 0.012, Math.sin(a) * radius * 0.84);
    g.rotation.y = -a;
    group.add(g);
  }
  group.position.set(x, 0, z);
  return group;
}

/** Poussière en suspension : points pâles qui dérivent dans un volume. */
export function makeDustMotes(center, size, count = 220) {
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      x: (Math.random() - 0.5) * size.x,
      y: Math.random() * size.y,
      z: (Math.random() - 0.5) * size.z,
      sp: 0.05 + Math.random() * 0.14,
      ph: Math.random() * Math.PI * 2,
    });
    positions[i * 3] = center.x + seeds[i].x;
    positions[i * 3 + 1] = center.y + seeds[i].y;
    positions[i * 3 + 2] = center.z + seeds[i].z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xaeb9dd, size: 0.045, transparent: true, opacity: 0.42,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  points.frustumCulled = false;
  return {
    points,
    update(timeMs) {
      const t = timeMs * 0.001;
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        positions[i * 3] = center.x + s.x + Math.sin(t * 0.3 + s.ph) * 0.6;
        positions[i * 3 + 1] = center.y + ((s.y + t * s.sp) % size.y);
        positions[i * 3 + 2] = center.z + s.z + Math.cos(t * 0.24 + s.ph) * 0.6;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

/** Tas de gravats pixellisés (bloc + éclats) — habille un pied de mur. */
export function makeDebrisPile(x, z, seed = 0, scale = 1) {
  const group = new THREE.Group();
  const stone = mat(SOULS_PALETTE.stone, { roughness: 0.95, flatShading: true });
  const dark = mat(SOULS_PALETTE.stoneDark, { roughness: 0.95, flatShading: true });
  const n = 5 + (seed % 4);
  for (let i = 0; i < n; i++) {
    const a = ((seed * 11 + i * 17) % 10) / 10 * Math.PI * 2;
    const r = ((seed + i * 3) % 5) / 5 * 0.55;
    const s = 0.12 + ((seed + i) % 4) * 0.07;
    const chunk = new THREE.Mesh(cube, i % 3 ? stone : dark);
    chunk.scale.setScalar(s);
    chunk.position.set(Math.cos(a) * r, s * 0.5, Math.sin(a) * r);
    chunk.rotation.set(i, a, i * 0.6);
    chunk.castShadow = true;
    group.add(chunk);
  }
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}
