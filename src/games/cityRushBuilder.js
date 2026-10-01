// Outils de construction du décor de Vice City Rush.
//
// Tout le décor statique d'une boucle est empilé dans un « batch » : chaque
// primitive est transformée puis fusionnée par matériau, si bien qu'une ville
// complète (immeubles, tribunes, lampadaires, enseignes) se dessine en une
// poignée de draw calls au lieu de plusieurs milliers. Les éléments animés
// (feux, foule, drapeaux…) restent des meshes séparés.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEEP_ATTRIBUTES = ['position', 'normal', 'uv', 'color'];
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1);
const cylinderCache = new Map();
const sphereCache = new Map();

function cachedCylinder(segments) {
  if (!cylinderCache.has(segments)) cylinderCache.set(segments, new THREE.CylinderGeometry(1, 1, 1, segments));
  return cylinderCache.get(segments);
}

function cachedSphere(segments) {
  if (!sphereCache.has(segments)) sphereCache.set(segments, new THREE.SphereGeometry(1, segments, Math.max(4, Math.round(segments * 0.7))));
  return sphereCache.get(segments);
}

// Générateur pseudo-aléatoire déterministe : le même circuit à chaque tour et
// à chaque partie dans une ville donnée, ce qui rend les repères mémorisables.
export function seededRandom(seed) {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export function hexToRgb(hex) {
  const color = new THREE.Color(hex);
  return [color.r, color.g, color.b];
}

export function createBatch() {
  const buckets = new Map();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scaleVector = new THREE.Vector3();
  const positionVector = new THREE.Vector3();

  function bucketFor(material) {
    if (!buckets.has(material)) buckets.set(material, []);
    return buckets.get(material);
  }

  function push(material, source, position = [0, 0, 0], rotation = null, scale = [1, 1, 1], options = {}) {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (!KEEP_ATTRIBUTES.includes(name)) geometry.deleteAttribute(name);
    }
    geometry.morphAttributes = {};
    if (options.uv) {
      const uv = geometry.attributes.uv;
      const [u0, v0, u1, v1] = options.uv;
      for (let index = 0; index < uv.count; index += 1) {
        uv.setXY(index, u0 + uv.getX(index) * (u1 - u0), v0 + uv.getY(index) * (v1 - v0));
      }
      uv.needsUpdate = true;
    }
    if (options.repeat || options.offset) {
      const uv = geometry.attributes.uv;
      const [ru, rv] = options.repeat || [1, 1];
      const [ou, ov] = options.offset || [0, 0];
      for (let index = 0; index < uv.count; index += 1) {
        uv.setXY(index, uv.getX(index) * ru + ou, uv.getY(index) * rv + ov);
      }
      uv.needsUpdate = true;
    }
    if (material.vertexColors) {
      const tint = options.tint || [1, 1, 1];
      const count = geometry.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let index = 0; index < count; index += 1) {
        colors[index * 3] = tint[0];
        colors[index * 3 + 1] = tint[1];
        colors[index * 3 + 2] = tint[2];
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else if (geometry.attributes.color) {
      geometry.deleteAttribute('color');
    }
    if (rotation) {
      euler.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
      quaternion.setFromEuler(euler);
    } else {
      quaternion.identity();
    }
    matrix.compose(positionVector.set(position[0], position[1], position[2]), quaternion, scaleVector.set(scale[0], scale[1], scale[2]));
    geometry.applyMatrix4(matrix);
    bucketFor(material).push(geometry);
  }

  return {
    box(material, position, size, rotation = null, options = {}) {
      push(material, unitBox, position, rotation, size, options);
    },
    plane(material, position, width, height, rotation = null, options = {}) {
      push(material, unitPlane, position, rotation, [width, height, 1], options);
    },
    cylinder(material, position, radiusTop, radiusBottom, height, segments = 8, rotation = null, options = {}) {
      if (Math.abs(radiusTop - radiusBottom) < 1e-6) {
        push(material, cachedCylinder(segments), position, rotation, [radiusTop, height, radiusTop], options);
        return;
      }
      const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
      push(material, geometry, position, rotation, [1, 1, 1], options);
      geometry.dispose();
    },
    cone(material, position, radius, height, segments = 6, rotation = null, options = {}) {
      const geometry = new THREE.ConeGeometry(radius, height, segments);
      push(material, geometry, position, rotation, [1, 1, 1], options);
      geometry.dispose();
    },
    sphere(material, position, radius, segments = 8, rotation = null, options = {}) {
      push(material, cachedSphere(segments), position, rotation, [radius, radius, radius], options);
    },
    torus(material, position, radius, tube, radialSegments = 6, tubularSegments = 16, rotation = null, options = {}) {
      const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
      push(material, geometry, position, rotation, [1, 1, 1], options);
      geometry.dispose();
    },
    custom(material, geometry, position, rotation = null, scale = [1, 1, 1], options = {}) {
      push(material, geometry, position, rotation, scale, options);
    },
    // Fusionne chaque matériau en un seul mesh. Les meshes partagent leur
    // géométrie avec `clone()`, ce qui permet d'afficher deux copies de la
    // boucle (celle que l'on parcourt et la suivante) sans doubler la mémoire.
    build(name = 'batch') {
      const group = new THREE.Group();
      group.name = name;
      for (const [material, geometries] of buckets) {
        if (!geometries.length) continue;
        const merged = mergeGeometries(geometries, false);
        geometries.forEach((geometry) => geometry.dispose());
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, material);
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
      }
      buckets.clear();
      return group;
    },
    get size() {
      let total = 0;
      for (const list of buckets.values()) total += list.length;
      return total;
    },
  };
}

export function cloneBatchGroup(group) {
  const copy = new THREE.Group();
  copy.name = `${group.name}-copy`;
  group.children.forEach((child) => {
    const mesh = new THREE.Mesh(child.geometry, child.material);
    mesh.matrixAutoUpdate = false;
    copy.add(mesh);
  });
  return copy;
}

// ─── Textures canvas ────────────────────────────────────────────────────────
export function makeCanvasTexture(draw, width = 512, height = 160, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (options.smooth) {
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = options.anisotropy || 4;
  } else {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;
  }
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.userData.canvas = canvas;
  return texture;
}

export function neonText(ctx, text, x, y, font, color, glow = 18, align = 'center') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Atlas d'enseignes : chaque texte devient une case d'une seule texture, donc
// toutes les enseignes d'une ville se dessinent avec un même matériau.
export class SignAtlas {
  constructor(options = {}) {
    this.cellWidth = options.cellWidth || 256;
    this.cellHeight = options.cellHeight || 128;
    this.columns = options.columns || 4;
    this.entries = [];
  }

  add(entry) {
    this.entries.push(entry);
    return this.entries.length - 1;
  }

  uvFor(index) {
    const rows = Math.max(1, Math.ceil(this.entries.length / this.columns));
    const column = index % this.columns;
    const row = Math.floor(index / this.columns);
    const u0 = column / this.columns;
    const u1 = (column + 1) / this.columns;
    // Canvas : y vers le bas ; UV : v vers le haut.
    const v1 = 1 - row / rows;
    const v0 = 1 - (row + 1) / rows;
    const inset = 0.004;
    return [u0 + inset, v0 + inset, u1 - inset, v1 - inset];
  }

  build() {
    const rows = Math.max(1, Math.ceil(this.entries.length / this.columns));
    const width = this.cellWidth * this.columns;
    const height = this.cellHeight * rows;
    const texture = makeCanvasTexture((ctx) => {
      ctx.clearRect(0, 0, width, height);
      this.entries.forEach((entry, index) => {
        const column = index % this.columns;
        const row = Math.floor(index / this.columns);
        const x = column * this.cellWidth;
        const y = row * this.cellHeight;
        ctx.save();
        ctx.translate(x, y);
        entry.draw(ctx, this.cellWidth, this.cellHeight, entry);
        ctx.restore();
      });
    }, width, height, { smooth: true });
    return texture;
  }
}

export function drawNeonSignCell(ctx, width, height, entry) {
  const accent = entry.color || '#ff5db8';
  const background = entry.background || 'rgba(8, 11, 26, .94)';
  ctx.fillStyle = background;
  ctx.fillRect(2, 2, width - 4, height - 4);
  ctx.lineWidth = 5;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.shadowBlur = 0;
  if (entry.vertical) {
    // Enseigne verticale : caractères empilés (lisible en latin comme en kana).
    const glyphs = Array.from(entry.text.replace(/\s+/g, ''));
    const step = (height - 36) / Math.max(1, glyphs.length);
    const size = Math.min(width * 0.68, step * 0.82);
    const font = `900 ${Math.round(size)}px "Orbitron", Arial, sans-serif`;
    glyphs.forEach((glyph, index) => {
      neonText(ctx, glyph, width / 2, 18 + step * (index + 0.5), font, entry.textColor || accent, 12);
    });
    return;
  }
  const size = Math.min(height * 0.5, (width * 1.55) / Math.max(3, entry.text.length));
  neonText(ctx, entry.text, width / 2, height / 2 + 2, `900 ${Math.round(size)}px "Orbitron", Arial, sans-serif`, entry.textColor || accent, 14);
}

export function drawBannerCell(ctx, width, height, entry) {
  const accent = entry.color || '#ffffff';
  const background = entry.background || '#141a2e';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 8);
  ctx.fillRect(0, height - 8, width, 8);
  const size = Math.min(height * 0.52, (width * 1.6) / Math.max(4, entry.text.length));
  ctx.font = `900 ${Math.round(size)}px "Orbitron", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = entry.textColor || '#ffffff';
  ctx.fillText(entry.text, width / 2, height / 2 + 2);
}
