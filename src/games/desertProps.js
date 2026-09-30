import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  DESERT_PERIOD,
  DESERT_ROAD_EDGE,
  TAU,
  mulberry32,
  terrainHeight,
} from './desertShared.js';

/*
 * Dunes de l’Écho — les accessoires (cactus, rochers, ruines, ossements…), tous fusionnés en
 * un seul mesh à couleurs de sommets, collé au terrain et donc défilant avec lui.
 */

const P = DESERT_PERIOD;

// ── Accessoires du décor ─────────────────────────────────────────────────
// Cactus, rochers, ruines, mesas… sont fusionnés dans UN seul mesh à couleurs de sommets (plus un
// mesh « lumineux » pour les runes) : deux appels de dessin par segment de dunes, quelle que soit
// la quantité d’accessoires. Ils sont posés sur le relief (même fonction `terrainHeight`) et
// vivent dans le même groupe que lui : ils défilent donc exactement avec le sable.
const STONE = {
  sand: [0xbf7a4d, 0xa9663f, 0xd08d5b, 0xc4845a],
  violet: [0x71507c, 0x5d3f6b, 0x85608f],
  pale: [0xe6c391, 0xd6aa78, 0xcb9a6c],
  strata: [0x9a3f3a, 0xc2522f, 0xd97a45, 0xb04a3a, 0xe8a25e, 0xbf6e43],
  cactus: [0x2f8c4c, 0x287d44, 0x3aa058],
  cactusTip: 0x1f5f3a,
  bone: 0xf0e3c6,
  teal: 0x3fe8d2,
  pink: 0xff87b7,
};
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

class PropBatch {
  constructor() {
    this.parts = [];
    this.glowParts = [];
    this.stack = [new THREE.Matrix4()];
  }

  /** Ajoute une primitive dans le repère du groupe courant (y = 0 au sol). */
  add(geometry, hex, position, scale, rotation) {
    this.push(this.parts, geometry, hex, position, scale, rotation);
  }

  /** Comme `add`, mais pour une pièce qui brille (runes, balises) : mesh non éclairé à part. */
  addGlow(geometry, hex, position, scale, rotation) {
    this.push(this.glowParts, geometry, hex, position, scale, rotation);
  }

  push(list, geometry, hex, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.stack[this.stack.length - 1], local));
    const c = new THREE.Color(hex);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    list.push(g);
  }

  /** Tout ce qui est ajouté dans `fn` est posé en `position`, tourné de `yaw` et mis à l’échelle. */
  place(position, yaw, scale, fn) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      new THREE.Vector3(scale, scale, scale),
    );
    this.stack.push(new THREE.Matrix4().multiplyMatrices(this.stack[this.stack.length - 1], m));
    fn();
    this.stack.pop();
  }

  /** Fusionne tout en deux géométries : { solid, glow } (chacune `null` si vide). */
  build() {
    const merge = (list) => {
      const merged = list.length ? mergeGeometries(list, false) : null;
      list.forEach((part) => part.dispose());
      return merged;
    };
    const result = { solid: merge(this.parts), glow: merge(this.glowParts) };
    this.parts = [];
    this.glowParts = [];
    return result;
  }
}

function saguaro(b, G, rand) {
  const h = 2 + rand() * 1.4;
  const w = 0.36 + rand() * 0.1;
  const col = pick(rand, STONE.cactus);
  b.add(G.box, col, [0, h / 2 - 0.1, 0], [w, h + 0.2, w]);
  b.add(G.box, STONE.cactusTip, [0, h + 0.08, 0], [w * 0.72, 0.16, w * 0.72]);
  const arms = rand() < 0.12 ? 0 : rand() < 0.5 ? 1 : 2;
  let side = rand() < 0.5 ? -1 : 1;
  for (let i = 0; i < arms; i += 1) {
    const ay = h * (0.36 + rand() * 0.2);
    const reach = 0.5 + rand() * 0.3;
    const rise = 0.75 + rand() * 0.9;
    const aw = w * 0.78;
    b.add(G.box, col, [side * (w / 2 + reach / 2 - 0.03), ay, 0], [reach, aw, aw]);
    b.add(G.box, col, [side * (w / 2 + reach - aw / 2), ay + rise / 2 - aw / 2, 0], [aw, rise, aw]);
    b.add(G.box, STONE.cactusTip, [side * (w / 2 + reach - aw / 2), ay + rise - aw / 2 + 0.06, 0], [aw * 0.7, 0.12, aw * 0.7]);
    side = -side;
  }
  if (rand() < 0.4) b.add(G.box, STONE.pink, [0.02, h + 0.22, 0.02], [w * 0.5, 0.16, w * 0.5]);
}

function barrelCactus(b, G, rand) {
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i += 1) {
    const r = 0.32 + rand() * 0.28;
    const x = (rand() - 0.5) * 1.3;
    const z = (rand() - 0.5) * 1.3;
    b.add(G.cyl, pick(rand, STONE.cactus), [x, r * 0.55, z], [r * 1.5, r * 1.3, r * 1.5], [0, rand() * 3, 0]);
    if (rand() < 0.6) b.add(G.box, STONE.pink, [x, r * 1.22, z], [r * 0.55, 0.12, r * 0.55]);
  }
}

function shrub(b, G, rand) {
  const wood = pick(rand, [0x7a5a3d, 0x8a6a45, 0x6b4f38]);
  const n = 7 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i += 1) {
    const a = rand() * TAU;
    const tilt = 0.5 + rand() * 0.8;
    const len = 0.55 + rand() * 0.6;
    b.add(G.box, wood, [Math.cos(a) * 0.12, len * 0.42, Math.sin(a) * 0.12], [0.06, len, 0.06], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]);
  }
  if (rand() < 0.65) {
    for (let i = 0; i < 3; i += 1) {
      b.add(G.box, pick(rand, [0x7a8a48, 0x93a055, 0x6f7f3f]), [(rand() - 0.5) * 0.7, 0.3 + rand() * 0.3, (rand() - 0.5) * 0.7], [0.22, 0.12, 0.22], [rand(), rand() * 3, rand()]);
    }
  }
}

function pebbles(b, G, rand) {
  const palette = rand() < 0.3 ? STONE.violet : STONE.sand;
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i += 1) {
    b.add(
      G.rock,
      pick(rand, palette),
      [(rand() - 0.5) * 1.5, 0.05, (rand() - 0.5) * 1.3],
      [0.25 + rand() * 0.35, 0.16 + rand() * 0.2, 0.22 + rand() * 0.3],
      [rand(), rand() * 6, rand()],
    );
  }
}

function tuft(b, G, rand) {
  const grass = pick(rand, [0xb8a24f, 0xa3923f, 0x8f9a4a]);
  const n = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i += 1) {
    const a = rand() * TAU;
    const tilt = 0.25 + rand() * 0.5;
    const len = 0.35 + rand() * 0.35;
    b.add(G.box, grass, [Math.cos(a) * 0.08, len * 0.45, Math.sin(a) * 0.08], [0.045, len, 0.045], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]);
  }
}

function rockCluster(b, G, rand) {
  const palette = rand() < 0.3 ? STONE.violet : STONE.sand;
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i += 1) {
    const s = (0.9 + rand() * 1.5) * (i === 0 ? 1 : 0.55);
    b.add(
      G.rock,
      pick(rand, palette),
      [(rand() - 0.5) * 2.4, s * 0.2, (rand() - 0.5) * 2],
      [s * (1.1 + rand() * 0.7), s * (0.75 + rand() * 0.5), s * (0.95 + rand() * 0.6)],
      [rand() * 0.5, rand() * 6.28, rand() * 0.4],
    );
  }
}

function mesa(b, G, rand) {
  const w = 4.5 + rand() * 4.5;
  const d = 4 + rand() * 4;
  const h = 5 + rand() * 5;
  const layers = 5 + Math.floor(rand() * 3);
  b.add(G.box, STONE.strata[0], [0, h * 0.08, 0], [w * 1.3, h * 0.16, d * 1.3]);
  let y = h * 0.16;
  let cw = w;
  let cd = d;
  const offset = Math.floor(rand() * 6);
  for (let i = 0; i < layers; i += 1) {
    const lh = ((h * 0.84) / layers) * (0.75 + rand() * 0.5);
    if (i > 0) {
      cw *= 0.82 + rand() * 0.16;
      cd *= 0.84 + rand() * 0.14;
    }
    b.add(G.box, STONE.strata[(offset + i) % STONE.strata.length], [(rand() - 0.5) * 0.5, y + lh / 2, (rand() - 0.5) * 0.5], [cw, lh, cd]);
    y += lh;
  }
  b.add(G.box, 0xf1c78f, [0, y + 0.1, 0], [cw * 0.96, 0.22, cd * 0.96]);
  for (let i = 0; i < 4; i += 1) {
    b.add(G.rock, pick(rand, STONE.sand), [(rand() - 0.5) * w * 1.6, 0.4, d * 0.7 + rand() * 2], [1.6, 1, 1.4], [rand(), rand() * 6, rand() * 0.3]);
  }
}

function spire(b, G, rand) {
  const h = 6 + rand() * 7;
  b.add(G.cone6, pick(rand, STONE.strata), [0, h / 2, 0], [2.6 + rand() * 1.4, h, 2.4 + rand() * 1.2], [0, rand() * 3, 0]);
  b.add(G.rock, STONE.sand[1], [1.6, 0.6, 1.2], [2.2, 1.2, 2], [0, 1, 0]);
}

function naturalArch(b, G, rand) {
  const span = 5.5 + rand() * 2.5;
  const h = 6 + rand() * 2;
  const t = 1.8;
  const depth = 2.8;
  const col = pick(rand, [0xc2643c, 0xcf7c48, 0xb85a3c]);
  b.add(G.box, col, [-span / 2, h * 0.36, 0], [t, h * 0.72, depth]);
  b.add(G.box, col, [span / 2, h * 0.36, 0], [t, h * 0.72, depth]);
  b.add(G.box, col, [-span / 2 + t * 0.55, h * 0.75, 0], [t * 0.9, h * 0.14, depth]);
  b.add(G.box, col, [span / 2 - t * 0.55, h * 0.75, 0], [t * 0.9, h * 0.14, depth]);
  b.add(G.box, STONE.strata[4], [0, h * 0.91, 0], [span + t, h * 0.2, depth * 0.92]);
  b.add(G.rock, STONE.sand[2], [-span / 2 - 1.2, 0.5, 1.6], [2.4, 1.3, 2], [0, 1, 0]);
  b.add(G.rock, STONE.sand[0], [span / 2 + 1.3, 0.4, 1.4], [2, 1.1, 1.8], [0, 2, 0]);
}

function ruinColumns(b, G, rand) {
  const col = pick(rand, STONE.pale);
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i += 1) {
    const x = i * (2.6 + rand() * 0.8);
    const broken = rand() < 0.45;
    const h = broken ? 1.2 + rand() * 1.6 : 3.4 + rand();
    b.add(G.box, col, [x, 0.14, 0], [1.35, 0.28, 1.35]);
    b.add(G.cyl, col, [x, 0.28 + h / 2, 0], [0.95, h, 0.95]);
    if (!broken) b.add(G.box, col, [x, 0.28 + h + 0.14, 0], [1.3, 0.28, 1.3]);
    else b.add(G.rock, col, [x + 0.15, 0.28 + h + 0.1, 0.1], [0.7, 0.4, 0.6], [rand(), rand() * 3, rand()]);
  }
  b.add(G.cyl, col, [(n - 1) * 1.5, 0.5, 1.9], [0.9, 2.6, 0.9], [0, 0.3, Math.PI / 2]);
}

function obelisk(b, G, rand) {
  const h = 3.2 + rand() * 1.8;
  const stone = pick(rand, STONE.pale);
  b.add(G.box, STONE.sand[1], [0, 0.2, 0], [2.1, 0.4, 2.1]);
  b.add(G.box, STONE.sand[3], [0, 0.55, 0], [1.6, 0.3, 1.6]);
  b.add(G.box, stone, [0, 0.7 + h / 2, 0], [0.95, h, 0.95]);
  b.add(G.cone4, STONE.pale[0], [0, 0.7 + h + 0.4, 0], [1.05, 0.8, 1.05], [0, Math.PI / 4, 0]);
  for (let i = 0; i < 4; i += 1) {
    b.addGlow(G.box, STONE.teal, [(i % 2 ? 0.14 : -0.14), 0.7 + h * (0.28 + i * 0.16), 0.49], [0.26, 0.11, 0.05]);
  }
}

function ribcage(b, G) {
  const r = 1.1;
  const n = 5;
  const spacing = 0.62;
  const segs = 7;
  for (let i = 0; i < n; i += 1) {
    const z = (i - (n - 1) / 2) * spacing;
    const k = 1 - Math.abs(i - (n - 1) / 2) * 0.13;
    for (let j = 0; j < segs; j += 1) {
      const a0 = (j / segs) * Math.PI;
      const a1 = ((j + 1) / segs) * Math.PI;
      const x0 = Math.cos(a0) * r * k;
      const y0 = Math.sin(a0) * r * k - r * 0.3;
      const x1 = Math.cos(a1) * r * k;
      const y1 = Math.sin(a1) * r * k - r * 0.3;
      b.add(G.box, STONE.bone, [(x0 + x1) / 2, (y0 + y1) / 2, z], [Math.hypot(x1 - x0, y1 - y0) + 0.04, 0.11, 0.11], [0, 0, Math.atan2(y1 - y0, x1 - x0)]);
    }
  }
  b.add(G.box, STONE.bone, [0, -r * 0.3, 0], [0.13, 0.13, n * spacing + 0.4]);
}

function skull(b, G) {
  b.add(G.box, STONE.bone, [0, 0.22, 0], [0.55, 0.42, 0.7]);
  b.add(G.box, STONE.bone, [0, 0.12, 0.42], [0.36, 0.26, 0.3]);
  b.add(G.box, 0x2a1d1d, [-0.14, 0.3, 0.36], [0.12, 0.12, 0.06]);
  b.add(G.box, 0x2a1d1d, [0.14, 0.3, 0.36], [0.12, 0.12, 0.06]);
  b.add(G.box, STONE.bone, [-0.42, 0.42, -0.05], [0.42, 0.1, 0.1], [0, 0, 0.45]);
  b.add(G.box, STONE.bone, [0.42, 0.42, -0.05], [0.42, 0.1, 0.1], [0, 0, -0.45]);
}

function deadTree(b, G, rand) {
  const h = 2.6 + rand() * 1.6;
  const wood = pick(rand, [0x6d5646, 0x7b6252, 0x5d4a3e]);
  b.add(G.box, wood, [0, h / 2, 0], [0.26, h, 0.26], [0, 0, (rand() - 0.5) * 0.18]);
  const branches = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < branches; i += 1) {
    const y = h * (0.45 + rand() * 0.5);
    const dir = rand() < 0.5 ? -1 : 1;
    const len = 0.8 + rand();
    b.add(G.box, wood, [dir * len * 0.4, y + len * 0.22, (rand() - 0.5) * 0.2], [len, 0.14, 0.14], [0, 0, dir * (0.5 + rand() * 0.4)]);
  }
}

// Une lointaine pyramide à degrés, dont le sommet brille : le « phare » de l’écho.
function ziggurat(b, G) {
  const steps = 6;
  const stepH = 2.4;
  for (let i = 0; i < steps; i += 1) {
    const w = 26 * (1 - i / (steps + 0.6));
    b.add(G.box, STONE.strata[(i + 1) % STONE.strata.length], [0, stepH * i + stepH / 2, 0], [w, stepH, w * 0.9]);
  }
  b.add(G.box, STONE.pale[0], [0, steps * stepH + 0.8, 0], [4, 1.6, 3.6]);
  b.addGlow(G.box, STONE.teal, [0, steps * stepH + 2.4, 0], [1, 1.6, 1]);
}

function roadPost(b, G, rand) {
  const h = 0.9 + rand() * 0.45;
  b.add(G.box, pick(rand, STONE.pale), [0, h / 2 - 0.1, 0], [0.42, h + 0.2, 0.42], [0, (rand() - 0.5) * 0.3, 0]);
  b.add(G.box, STONE.sand[0], [0, h + 0.03, 0], [0.54, 0.14, 0.54]);
  b.addGlow(G.box, STONE.teal, [0, h + 0.17, 0], [0.26, 0.14, 0.26]);
}

export function buildProps() {
  const rand = mulberry32(20260930);
  const solid = new PropBatch();
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 7),
    cone4: new THREE.ConeGeometry(0.5, 1, 4),
    cone6: new THREE.ConeGeometry(0.5, 1, 6),
    rock: new THREE.DodecahedronGeometry(0.5, 0),
  };
  const slopeAt = (x, z) => Math.hypot(
    (terrainHeight(x + 0.6, z) - terrainHeight(x - 0.6, z)) / 1.2,
    (terrainHeight(x, z + 0.6) - terrainHeight(x, z - 0.6)) / 1.2,
  );
  // `count` objets par côté, répartis sur toute la période (un par tranche, position jitterée) ;
  // on évite les pentes trop raides (un cactus ne pousse pas à 45°).
  const scatter = (count, uMin, uMax, { maxSlope = 0.45, bias = 1, scale = [1, 1], embed = 0.1, yaw = true } = {}, make) => {
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i += 1) {
        for (let tries = 0; tries < 8; tries += 1) {
          const z = -((i + rand()) / count) * P;
          const u = uMin + Math.pow(rand(), bias) * (uMax - uMin);
          const x = side * (DESERT_ROAD_EDGE + u);
          if (tries < 7 && slopeAt(x, z) > maxSlope) continue;
          const sc = scale[0] + rand() * (scale[1] - scale[0]);
          solid.place([x, terrainHeight(x, z) - embed, z], yaw ? rand() * TAU : (rand() - 0.5) * 0.4, sc, () => make());
          break;
        }
      }
    }
  };

  scatter(9, 9, 46, { maxSlope: 0.4, bias: 1.1, scale: [0.85, 1.2] }, () => saguaro(solid, G, rand));
  scatter(9, 4.8, 16, { maxSlope: 0.7, scale: [0.9, 1.4] }, () => pebbles(solid, G, rand));
  scatter(8, 4.8, 18, { maxSlope: 0.7, scale: [0.9, 1.3] }, () => tuft(solid, G, rand));
  scatter(5, 6, 34, { maxSlope: 0.4, scale: [0.9, 1.3] }, () => barrelCactus(solid, G, rand));
  scatter(10, 5.5, 40, { maxSlope: 0.5, bias: 1.3, scale: [0.8, 1.3] }, () => shrub(solid, G, rand));
  scatter(11, 5.5, 50, { maxSlope: 0.6, bias: 1.2, scale: [0.8, 1.6] }, () => rockCluster(solid, G, rand));
  scatter(2, 9, 36, { maxSlope: 0.4, scale: [0.9, 1.3] }, () => deadTree(solid, G, rand));
  scatter(1, 8, 16, { maxSlope: 0.35, scale: [1, 1.25] }, () => ribcage(solid, G));
  scatter(3, 5.5, 9, { maxSlope: 0.5, scale: [1, 1.4] }, () => skull(solid, G));
  scatter(2, 10, 26, { maxSlope: 0.35, scale: [0.9, 1.3] }, () => ruinColumns(solid, G, rand));
  scatter(1, 9, 20, { maxSlope: 0.35, scale: [1, 1.25], yaw: false }, () => obelisk(solid, G, rand));
  scatter(1, 22, 40, { maxSlope: 0.5, scale: [1, 1.3], yaw: false }, () => naturalArch(solid, G, rand));
  scatter(2, 18, 46, { maxSlope: 0.7, scale: [0.9, 1.3], yaw: false, embed: 0.6 }, () => mesa(solid, G, rand));
  scatter(2, 22, 56, { maxSlope: 0.7, scale: [0.9, 1.3], embed: 0.4 }, () => spire(solid, G, rand));
  // La pyramide du fond, d’un seul côté : elle dépasse l’horizon et sert de repère.
  solid.place([-(DESERT_ROAD_EDGE + 58), terrainHeight(-(DESERT_ROAD_EDGE + 58), -P * 0.62) - 2, -P * 0.62], 0, 1, () => ziggurat(solid, G));
  // Bornes lumineuses de chaque côté de la piste : elles rythment la vitesse.
  for (let i = 0; i < 8; i += 1) {
    const z = -(i + 0.5) * (P / 8);
    for (const side of [-1, 1]) {
      const x = side * 5;
      solid.place([x, terrainHeight(x, z) - 0.1, z], 0, 1, () => roadPost(solid, G, rand));
    }
  }

  Object.values(G).forEach((geometry) => geometry.dispose());
  return solid.build();
}

