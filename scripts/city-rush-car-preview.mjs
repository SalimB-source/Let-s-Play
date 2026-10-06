/**
 * `node scripts/city-rush-car-preview.mjs [--car id] [--size 720x480] [--out .cache/car-preview]`
 *
 * Rendu **logiciel** (z-buffer + éclairage studio, aucun WebGL, aucune
 * dépendance) des onze voitures de Vice City Rush, vues de trois quarts avant,
 * de trois quarts arrière et de profil — les mêmes angles que les miniatures du
 * garage. Sert d'œil de contrôle quand on retouche `cityRushRacerModels.js` :
 * la silhouette, les optiques, les jantes et les appendices se vérifient en une
 * commande, sans lancer le jeu.
 *
 * Les images sont écrites hors dépôt (`.cache/`, ignoré par git) : cet outil ne
 * produit que des planches de travail.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Contexte canevas muet : les textures des plaques et des pneus se
// construisent sans navigateur.
const mute = new Proxy(function mute() {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : mute),
  apply: () => mute,
  set: () => true,
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => mute, style: {} } : {}),
};

const { makeRacerCar } = await import(new URL('../src/games/cityRushCars.js', import.meta.url).href);
const { CITY_RUSH_CARS } = await import(new URL('../src/games/cityRushRules.js', import.meta.url).href);

// ── Arguments ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
const onlyCar = arg('car');
const [tileWidth, tileHeight] = (arg('size', '760x520')).split('x').map(Number);
const outDir = path.resolve(root, arg('out', '.cache/car-preview'));
const supersample = Math.max(1, Math.min(3, Number(arg('ss', '2'))));

// ── PNG minimaliste (zlib + CRC) ────────────────────────────────────────────
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) c = crcTable[(c ^ buffer[index]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Petites mathématiques 3D ────────────────────────────────────────────────
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

function mat4FromRotationTranslation(quaternion, translation) {
  const [x, y, z, w] = quaternion;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * 1, (xy + wz) * 1, (xz - wy) * 1, 0,
    (xy - wz) * 1, (1 - (xx + zz)) * 1, (yz + wx) * 1, 0,
    (xz + wy) * 1, (yz - wx) * 1, (1 - (xx + yy)) * 1, 0,
    translation[0], translation[1], translation[2], 1,
  ];
}

const mul = (a, b) => {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
};

const applyMat4 = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

function lookAt(eye, target, up = [0, 1, 0]) {
  const zAxis = normalize(sub(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  return [
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ];
}

function perspective(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ];
}

// ── Collecte des triangles du véhicule ──────────────────────────────────────
function collectTriangles(car) {
  car.updateMatrixWorld(true);
  const triangles = [];
  car.traverse((object) => {
    if (!object.isMesh || !object.visible) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    // Halos additifs (glow de sol, cônes de phares) : invisibles à l'écran, ils
    // ne sont pas tracés — leur transparence n'existe qu'en mélange additif.
    if (material?.blending === 2 && (material.opacity ?? 1) < 0.35) return;
    if (material?.transparent && (material.opacity ?? 1) < 0.16 && !material.map) return;
    const geometry = object.geometry;
    const position = geometry.attributes.position;
    const vertexColor = material?.vertexColors ? geometry.attributes.color : null;
    const index = geometry.index;
    const matrix = object.matrixWorld.elements;
    const world = [];
    const worldTints = [];
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      world.push(applyMat4(matrix, [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]));
      worldTints.push(vertexColor
        ? [vertexColor.getX(vertex), vertexColor.getY(vertex), vertexColor.getZ(vertex)]
        : [1, 1, 1]);
    }
    const count = index ? index.count : position.count;
    const color = material?.color ? [material.color.r, material.color.g, material.color.b] : [0.8, 0.8, 0.8];
    const basic = material?.isMeshBasicMaterial === true;
    const emissive = material?.emissive ? [material.emissive.r, material.emissive.g, material.emissive.b] : [0, 0, 0];
    const emissiveIntensity = material?.emissiveIntensity ?? 1;
    const opacity = material?.transparent ? material.opacity ?? 1 : 1;
    for (let corner = 0; corner < count; corner += 3) {
      const a = index ? index.getX(corner) : corner;
      const b = index ? index.getX(corner + 1) : corner + 1;
      const c = index ? index.getX(corner + 2) : corner + 2;
      const triangle = [world[a], world[b], world[c]];
      const normal = normalize(cross(sub(triangle[1], triangle[0]), sub(triangle[2], triangle[0])));
      const tint = [
        (worldTints[a][0] + worldTints[b][0] + worldTints[c][0]) / 3,
        (worldTints[a][1] + worldTints[b][1] + worldTints[c][1]) / 3,
        (worldTints[a][2] + worldTints[b][2] + worldTints[c][2]) / 3,
      ];
      triangles.push({
        triangle,
        normal,
        color: [color[0] * tint[0], color[1] * tint[1], color[2] * tint[2]],
        basic,
        emissive,
        emissiveIntensity,
        metallic: material?.metalness ?? 0,
        roughness: material?.roughness ?? 0.6,
        opacity,
        additive: material?.blending === 2,
      });
    }
  });
  return triangles;
}

// ── Rendu ───────────────────────────────────────────────────────────────────
const LIGHTS = [
  { direction: normalize([-0.55, 0.72, -0.42]), color: [1.0, 0.97, 0.92], intensity: 1.15 },
  { direction: normalize([0.72, 0.35, 0.30]), color: [0.62, 0.85, 1.0], intensity: 0.55 },
  { direction: normalize([0.30, 0.18, 0.95]), color: [1.0, 0.55, 0.78], intensity: 0.45 },
  { direction: normalize([0.0, 1.0, 0.0]), color: [0.30, 0.34, 0.42], intensity: 0.35 },
];

function toneMap(value) {
  const x = Math.max(0, value);
  const mapped = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  return Math.min(1, Math.max(0, mapped));
}

function shade(triangle, { reflection = false } = {}) {
  const normal = reflection ? [triangle.normal[0], -triangle.normal[1], triangle.normal[2]] : triangle.normal;
  let r = triangle.color[0] * 0.06;
  let g = triangle.color[1] * 0.06;
  let b = triangle.color[2] * 0.06;
  if (triangle.emissiveIntensity > 0) {
    r += triangle.emissive[0] * triangle.emissiveIntensity * 0.55;
    g += triangle.emissive[1] * triangle.emissiveIntensity * 0.55;
    b += triangle.emissive[2] * triangle.emissiveIntensity * 0.55;
  }
  if (triangle.basic) {
    // Matériaux émissifs (LED, halos) : la couleur sort telle quelle.
    r += triangle.color[0] * 0.85;
    g += triangle.color[1] * 0.85;
    b += triangle.color[2] * 0.85;
  } else {
    for (const light of LIGHTS) {
      const lambert = Math.max(0, dot(normal, light.direction));
      const half = normalize([light.direction[0] - 0, light.direction[1] + 1, light.direction[2]]);
      const specular = Math.pow(Math.max(0, dot(normal, half)), 18 + (1 - triangle.roughness) * 120)
        * (0.35 + triangle.metallic * 0.9);
      const diffuse = lambert * light.intensity * (1 - triangle.metallic * 0.55);
      r += (triangle.color[0] * diffuse + light.color[0] * specular) * light.color[0];
      g += (triangle.color[1] * diffuse + light.color[1] * specular) * light.color[1];
      b += (triangle.color[2] * diffuse + light.color[2] * specular) * light.color[2];
    }
    // Frange de sol : léger rappel du sol sombre sous les bas de caisse.
    const fresnel = Math.pow(1 - Math.abs(normal[1]), 3) * 0.10;
    r += fresnel * 0.35; g += fresnel * 0.42; b += fresnel * 0.55;
  }
  return [toneMap(r), toneMap(g), toneMap(b)];
}

function render(car, triangles, view, width, height) {
  const scale = supersample;
  const w = width * scale;
  const h = height * scale;
  const color = new Float32Array(w * h * 3);
  const depth = new Float32Array(w * h).fill(Infinity);
  const alpha = new Float32Array(w * h);
  const aspect = width / height;
  const projection = perspective(30, aspect, 0.5, 80);
  // Repère des vues : azimut 0° = de face (−Z), 90° = côté droit (+X),
  // 180° = de derrière (+Z) ; élévation en degrés au-dessus du sol.
  const azimuth = (view.azimuth * Math.PI) / 180;
  const elevation = (view.elevation * Math.PI) / 180;
  const eye = [
    view.center[0] + view.distance * Math.sin(azimuth) * Math.cos(elevation),
    view.center[1] + view.distance * Math.sin(elevation),
    view.center[2] - view.distance * Math.cos(azimuth) * Math.cos(elevation),
  ];
  const viewMatrix = lookAt(eye, view.center);
  const viewProjection = mul(projection, viewMatrix);

  const project = (point) => {
    const cx = viewProjection[0] * point[0] + viewProjection[4] * point[1] + viewProjection[8] * point[2] + viewProjection[12];
    const cy = viewProjection[1] * point[0] + viewProjection[5] * point[1] + viewProjection[9] * point[2] + viewProjection[13];
    const cz = viewProjection[2] * point[0] + viewProjection[6] * point[1] + viewProjection[10] * point[2] + viewProjection[14];
    const cw = viewProjection[3] * point[0] + viewProjection[7] * point[1] + viewProjection[11] * point[2] + viewProjection[15];
    if (cw <= 0.0001) return null;
    return [((cx / cw) * 0.5 + 0.5) * w, (0.5 - (cy / cw) * 0.5) * h, cz / cw];
  };

  const drawTriangle = (triangle, reflection) => {
    const points = [project(triangle.triangle[0]), project(triangle.triangle[1]), project(triangle.triangle[2])];
    if (points.some((point) => !point)) return;
    const [shadeR, shadeG, shadeB] = shade(triangle, { reflection });
    const minX = Math.max(0, Math.floor(Math.min(points[0][0], points[1][0], points[2][0])));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(points[0][0], points[1][0], points[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(points[0][1], points[1][1], points[2][1])));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(points[0][1], points[1][1], points[2][1])));
    if (maxX < minX || maxY < minY) return;
    const [x0, y0, z0] = points[0];
    const [x1, y1, z1] = points[1];
    const [x2, y2, z2] = points[2];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-9) return;
    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const cx = px + 0.5;
        const cy = py + 0.5;
        const w0 = ((x1 - cx) * (y2 - cy) - (x2 - cx) * (y1 - cy)) / area;
        const w1 = ((x2 - cx) * (y0 - cy) - (x0 - cx) * (y2 - cy)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.0005 || w1 < -0.0005 || w2 < -0.0005) continue;
        const z = w0 * z0 + w1 * z1 + w2 * z2;
        const offset = py * w + px;
        if (z >= depth[offset]) continue;
        depth[offset] = z;
        const weight = triangle.opacity * (reflection ? 0.16 : 1);
        const mix = triangle.additive ? 0.5 : weight;
        color[offset * 3] = color[offset * 3] * (1 - mix) + shadeR * mix;
        color[offset * 3 + 1] = color[offset * 3 + 1] * (1 - mix) + shadeG * mix;
        color[offset * 3 + 2] = color[offset * 3 + 2] * (1 - mix) + shadeB * mix;
        alpha[offset] = Math.max(alpha[offset], weight);
      }
    }
  };

  // Sol réfléchissant : une copie miroir, plus sombre, dessinée avant la voiture.
  for (const triangle of triangles) {
    const mirrored = triangle.triangle.map(([x, y, z]) => [x, -y, z]);
    drawTriangle({ ...triangle, triangle: mirrored }, true);
  }
  for (const triangle of triangles) drawTriangle(triangle, false);

  // Fond studio : dégradé + néons latéraux, puis composition.
  const image = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let background = [0.035 + 0.02 * (1 - y / height), 0.037 + 0.022 * (1 - y / height), 0.052 + 0.03 * (1 - y / height)];
      const horizontal = x / width;
      const cyan = Math.exp(-Math.pow((horizontal - 0.06) * 7, 2)) * Math.exp(-Math.pow((y / height - 0.62) * 3.4, 2));
      const magenta = Math.exp(-Math.pow((horizontal - 0.95) * 7, 2)) * Math.exp(-Math.pow((y / height - 0.60) * 3.4, 2));
      background = [
        background[0] + cyan * 0.05 + magenta * 0.32,
        background[1] + cyan * 0.30 + magenta * 0.06,
        background[2] + cyan * 0.34 + magenta * 0.26,
      ];
      if (y / height > 0.74) {
        const floor = (y / height - 0.74) / 0.26;
        background = background.map((channel) => channel * (0.55 - floor * 0.30));
      }
      let r = 0; let g = 0; let b = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const sx2 = Math.min(w - 1, x * scale + sx);
          const sy2 = Math.min(h - 1, y * scale + sy);
          const offset = sy2 * w + sx2;
          const a = alpha[offset];
          r += background[0] * (1 - a) + color[offset * 3] * a;
          g += background[1] * (1 - a) + color[offset * 3 + 1] * a;
          b += background[2] * (1 - a) + color[offset * 3 + 2] * a;
        }
      }
      const samples = scale * scale;
      const index = (y * width + x) * 3;
      image[index] = Math.round(Math.min(1, Math.sqrt((r / samples))) * 255);
      image[index + 1] = Math.round(Math.min(1, Math.sqrt((g / samples))) * 255);
      image[index + 2] = Math.round(Math.min(1, Math.sqrt((b / samples))) * 255);
    }
  }
  return image;
}

const VIEWS = [
  { name: 'trois-quarts-avant', azimuth: 38, elevation: 14, distance: 8.6, center: [0, 0.70, 0.05] },
  { name: 'trois-quarts-arriere', azimuth: 145, elevation: 15, distance: 8.6, center: [0, 0.72, 0] },
  { name: 'profil', azimuth: 90, elevation: 4, distance: 8.8, center: [0, 0.66, 0] },
];

mkdirSync(outDir, { recursive: true });
const profiles = CITY_RUSH_CARS.filter((car) => !onlyCar || car.id === onlyCar || car.archetype === onlyCar);

for (const profile of profiles) {
  const car = makeRacerCar(profile, { player: true, number: CITY_RUSH_CARS.indexOf(profile) + 1, daylight: true });
  const triangles = collectTriangles(car);
  const sheet = new Uint8Array(tileWidth * VIEWS.length * tileHeight * 3);
  VIEWS.forEach((view, viewIndex) => {
    const tile = render(car, triangles, view, tileWidth, tileHeight);
    for (let y = 0; y < tileHeight; y += 1) {
      const from = y * tileWidth * 3;
      const to = (y * (tileWidth * VIEWS.length) + viewIndex * tileWidth) * 3;
      sheet.set(tile.subarray(from, from + tileWidth * 3), to);
    }
  });
  const file = path.join(outDir, `${profile.id}.png`);
  writeFileSync(file, encodePng(tileWidth * VIEWS.length, tileHeight, sheet));
  console.log(`${profile.id.padEnd(18)} ${triangles.length.toString().padStart(6)} triangles → ${path.relative(root, file)}`);
}
