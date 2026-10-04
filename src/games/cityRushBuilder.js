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

// ─── Panneaux de la Shuto Expressway ────────────────────────────────────────
// Signalisation officielle de la C1 : fond vert profond, double liseré blanc,
// texte japonais blanc avec sa transcription, pastille de route « C1 » et son
// sens de circulation, numéro de sortie et flèches de rabattement. Les
// variantes dessinent les autres panneaux du viaduc : limite de vitesse,
// plaque de tunnel, poste kilométrique.
const JP_FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "Meiryo", sans-serif';
const SHUTO_GREEN = '#0b6b3f';
const SHUTO_GREEN_DARK = '#064a2c';
const SHUTO_WHITE = '#f4f8f1';

function roundedPanel(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
  ctx.closePath();
}

/** Pastille de route : anneau fléché (sens de circulation) + numéro de ligne. */
function drawRouteBadge(ctx, centerX, centerY, radius, marker, color = SHUTO_WHITE, ring = SHUTO_WHITE) {
  ctx.save();
  ctx.lineWidth = Math.max(2, radius * 0.18);
  ctx.strokeStyle = ring;
  ctx.beginPath();
  // Anneau presque fermé : le trou porte la flèche du sens (内回り = antihoraire).
  ctx.arc(centerX, centerY, radius, Math.PI * 0.35, Math.PI * 2.05);
  ctx.stroke();
  const headAngle = Math.PI * 0.35;
  const headX = centerX + Math.cos(headAngle) * radius;
  const headY = centerY + Math.sin(headAngle) * radius;
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.moveTo(headX + radius * 0.42, headY - radius * 0.1);
  ctx.lineTo(headX - radius * 0.18, headY - radius * 0.5);
  ctx.lineTo(headX - radius * 0.1, headY + radius * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.font = `900 ${Math.round(radius * 0.92)}px "Orbitron", ${JP_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(marker, centerX, centerY + radius * 0.04);
  ctx.restore();
}

export function drawShutoSignCell(ctx, width, height, entry) {
  const variant = entry.variant || 'gantry';
  if (variant === 'limit') {
    // Limite de vitesse : disque blanc, cerclage rouge, chiffres noirs.
    ctx.clearRect(0, 0, width, height);
    const radius = Math.min(width, height) * 0.44;
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.fillStyle = '#f7f7f2';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = radius * 0.22;
    ctx.strokeStyle = '#d32f2a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.89, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#15161c';
    ctx.font = `900 ${Math.round(radius * 1.02)}px "Orbitron", ${JP_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '50', centerX, centerY + radius * 0.05);
    return;
  }
  if (variant === 'plate') {
    // Plaque blanche : nom de tunnel, poste kilométrique, interdiction.
    ctx.fillStyle = entry.background || '#eef1e9';
    roundedPanel(ctx, 0, 0, width, height, Math.min(18, height * 0.16));
    ctx.fill();
    ctx.strokeStyle = entry.borderColor || '#1b1f2a';
    ctx.lineWidth = 4;
    roundedPanel(ctx, 5, 5, width - 10, height - 10, Math.min(14, height * 0.13));
    ctx.stroke();
    ctx.fillStyle = entry.textColor || '#141821';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(height * 0.42)}px ${JP_FONT}`;
    ctx.fillText(entry.text || '', width / 2, height * 0.42);
    if (entry.sub) {
      ctx.font = `700 ${Math.round(height * 0.22)}px "Orbitron", ${JP_FONT}`;
      ctx.fillStyle = entry.subColor || '#4a5162';
      ctx.fillText(entry.sub, width / 2, height * 0.74);
    }
    return;
  }

  // ── Panneau de portique (vert) ────────────────────────────────────────────
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, entry.background || SHUTO_GREEN);
  gradient.addColorStop(1, SHUTO_GREEN_DARK);
  ctx.fillStyle = gradient;
  roundedPanel(ctx, 0, 0, width, height, Math.min(16, height * 0.12));
  ctx.fill();
  ctx.strokeStyle = entry.borderColor || SHUTO_WHITE;
  ctx.lineWidth = 6;
  roundedPanel(ctx, 7, 7, width - 14, height - 14, Math.min(12, height * 0.1));
  ctx.stroke();
  ctx.lineWidth = 2;
  roundedPanel(ctx, 18, 18, width - 36, height - 36, Math.min(9, height * 0.08));
  ctx.stroke();

  const exits = Array.isArray(entry.exits) ? entry.exits.filter(Boolean) : [];
  const exitsWidth = exits.length ? Math.min(width * 0.44, 60 + exits.reduce((max, line) => Math.max(max, line.length), 0) * height * 0.16) : 0;
  const mainWidth = width - exitsWidth - (exitsWidth ? 34 : 0);

  // Bloc principal : pastille de route, nom japonais, transcription.
  let cursorX = 34;
  if (entry.badge) {
    const radius = Math.min(height * 0.26, mainWidth * 0.12);
    drawRouteBadge(ctx, cursorX + radius, height * 0.4, radius, entry.badge, entry.badgeColor || SHUTO_WHITE);
    cursorX += radius * 2 + 26;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const main = entry.text || '';
  const mainSize = Math.min(height * 0.44, (mainWidth - (cursorX - 34)) * 1.5 / Math.max(2, main.length));
  ctx.font = `800 ${Math.round(mainSize)}px ${JP_FONT}`;
  ctx.fillStyle = entry.textColor || SHUTO_WHITE;
  ctx.fillText(main, cursorX, entry.sub ? height * 0.38 : height * 0.48);
  if (entry.sub) {
    ctx.font = `700 ${Math.round(Math.min(height * 0.2, mainSize * 0.5))}px "Orbitron", ${JP_FONT}`;
    ctx.fillStyle = entry.subColor || 'rgba(244, 248, 241, .78)';
    ctx.fillText(entry.sub, cursorX, height * 0.7);
  }
  if (entry.arrow) {
    ctx.font = `900 ${Math.round(height * 0.44)}px ${JP_FONT}`;
    ctx.fillStyle = entry.textColor || SHUTO_WHITE;
    ctx.textAlign = 'right';
    ctx.fillText(entry.arrow, 34 + mainWidth - 14, height * 0.48);
  }

  // Bloc des sorties, séparé par un filet blanc comme sur les portiques réels.
  if (!exitsWidth) return;
  const dividerX = 34 + mainWidth + 17;
  ctx.strokeStyle = 'rgba(244, 248, 241, .55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dividerX, height * 0.16);
  ctx.lineTo(dividerX, height * 0.84);
  ctx.stroke();
  ctx.textAlign = 'left';
  const lineHeight = (height * 0.62) / exits.length;
  exits.forEach((line, index) => {
    const y = height * 0.19 + lineHeight * (index + 0.5);
    const arrow = line.match(/^(↖|↗|↑|←|→|↓)\s*/);
    const label = arrow ? line.slice(arrow[0].length) : line;
    let x = dividerX + 18;
    if (arrow) {
      ctx.font = `900 ${Math.round(lineHeight * 0.72)}px ${JP_FONT}`;
      ctx.fillStyle = entry.textColor || SHUTO_WHITE;
      ctx.fillText(arrow[1], x, y);
      x += lineHeight * 0.66;
    }
    ctx.font = `700 ${Math.round(Math.min(lineHeight * 0.66, exitsWidth * 1.4 / Math.max(3, label.length)))}px ${JP_FONT}`;
    ctx.fillStyle = entry.hazard && index === 0 ? '#ffd66b' : entry.textColor || SHUTO_WHITE;
    ctx.fillText(label, x, y);
  });
}
