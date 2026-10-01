import * as THREE from 'three';

/*
 * ZONE 10 · CHEMIN DU SERPENT — hommage à Dragon Ball pour Mirage Rush.
 *
 * Comme dans Dragon Ball Z, la route file au-dessus d'une mer de nuages
 * jaunes. Gris de pierre, elle est ourlée d'écailles de dragon sur ses
 * deux bords — des rangs de dômes imbriqués, comme sur le flanc de
 * Shenron. Au loin, la petite planète de Kaio — son halo, sa maisonnette
 * et son arbre bleu — devient la cible de la route. Décor low-poly, Three.js.
 */

export const SNAKEWAY_SEGMENT_LENGTH = 11;
export const SNAKEWAY_SEGMENT_COUNT = 10;
export const SNAKEWAY_GATE_INDEX = 5;
export const SNAKEWAY_DECK_PERIOD = 6;
export const SNAKEWAY_CULL_Z = -62;
export const SNAKEWAY_TRACK_EDGE = 4.2;

export const SNAKEWAY_ATMOSPHERE = Object.freeze({
  background: 0x7972c6,
  fog: 0xe6a076,
  exposure: 1.12,
  skyBottom: [1.0, 0.75, 0.5],
  skyHorizon: [0.98, 0.49, 0.31],
  skyTop: [0.17, 0.16, 0.48],
  sunBottom: [1.0, 0.36, 0.1],
  sunTop: [1.0, 0.79, 0.38],
  glow: [1.0, 0.62, 0.45],
  hemiSky: 0xe3dcff,
  hemiGround: 0x875244,
  sunLight: 0xffc47d,
  rimLight: 0xff9a73,
});

const material = (color, options = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.88,
  flatShading: true,
  ...options,
});

function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function sphere(parent, geometry, mat, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

function seeded(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * A rolling sea of yellow cumulus, and nothing else, spreads beneath the
 * outside of each lane: the golden road floats above the clouds, DBZ Snake
 * Way. Each 11 m segment is packed with low-poly clouds — wide flat base,
 * round domes, bumpy sunlit crown — in three overlapping bands whose crowns
 * peek just under the road, plus two small clouds drifting low. Everything
 * stays below road level, seamless over the 110 m loop.
 */
export function snakewayCloudBank(index, side) {
  const group = new THREE.Group();
  const rand = seeded((index + 1) * 79 + (side > 0 ? 401 : 809));
  // DBZ sunset yellows: pale light on the crowns, deep gold in the shade.
  // Every tone keeps r > g > b — a warm ramp from sunlit lemon to aged gold.
  const pale = material(0xfff2a8, { roughness: 1 });
  const light = material(0xffe98c, { roughness: 1 });
  const bright = material(0xffe06b, { roughness: 1 });
  const yellow = material(0xffd75c, { roughness: 1 });
  const gold = material(0xffcf4d, { roughness: 1 });
  const deep = material(0xffc93f, { roughness: 1 });
  const tierPalettes = [
    [deep, gold], // shaded base
    [gold, yellow, bright], // lit body
    [bright, light, pale], // sunlit crown
  ];
  const puffGeometry = new THREE.SphereGeometry(1, 10, 7);

  group.position.set(0, 0, 6 - index * SNAKEWAY_SEGMENT_LENGTH);
  group.userData.speedFactor = 1;
  group.userData.callout = 'yellow-cloudbank';
  group.userData.side = side;

  // Low-poly cumulus templates, puffs in [x, y, z, sx, sy, sz, tier] order:
  // a wide flat base (tier 0, shaded underside), big round domes (tier 1) and
  // a bumpy sunlit crown (tier 2). Two silhouettes are interleaved so the
  // skyline stays irregular — the classic DBZ cloud-sea profile.
  const CUMULUS_A = [
    [0.0, -0.25, 0.0, 2.5, 1.05, 1.8, 0],
    [-1.9, -0.05, 0.1, 1.35, 1.0, 1.3, 0],
    [1.95, -0.05, -0.05, 1.3, 0.95, 1.25, 0],
    [-0.5, 1.05, 0.05, 1.75, 1.5, 1.5, 1],
    [1.5, 1.15, -0.1, 1.35, 1.15, 1.3, 1],
    [-1.9, 1.0, 0.15, 1.15, 1.0, 1.15, 2],
    [0.6, 2.15, -0.1, 1.2, 1.0, 1.15, 2],
  ];
  const CUMULUS_B = [
    [0.0, -0.25, 0.0, 2.8, 0.95, 1.9, 0],
    [-2.3, 0.05, 0.1, 1.5, 1.15, 1.4, 0],
    [2.3, 0.0, -0.1, 1.4, 1.05, 1.35, 0],
    [-0.9, 1.0, 0.05, 1.5, 1.25, 1.35, 1],
    [1.2, 1.15, -0.05, 1.6, 1.3, 1.4, 1],
    [0.2, 2.0, 0.0, 1.1, 0.95, 1.1, 2],
    [-2.4, 0.9, 0.3, 0.95, 0.8, 0.95, 2],
  ];

  const cluster = (cx, cy, cz, scale, colorShift, variant) => {
    const template = variant % 2 === 0 ? CUMULUS_A : CUMULUS_B;
    template.forEach(([px, py, pz, sx, sy, sz, tier], puffIndex) => {
      // An occasional missing crown bump keeps the skyline irregular.
      if (puffIndex === template.length - 1 && rand() < 0.35) return;
      const s = scale * (0.9 + rand() * 0.25);
      const x = cx + px * s + (rand() - 0.5) * 0.5;
      const y = cy + py * s + (rand() - 0.5) * 0.4;
      const z = cz + pz * s + (rand() - 0.5) * 0.6;
      const safeX = x - sx * s < 4.3 ? 4.3 + sx * s : x; // never bite into the lanes
      const palette = tierPalettes[tier];
      sphere(
        group, puffGeometry,
        palette[(puffIndex + colorShift) % palette.length],
        side * safeX, y, z,
        sx * s, sy * s, sz * s,
      );
    });
  };

  // Three bands tile the whole segment (z 0 → -11), the clouds overlapping
  // along the track so the wall never breaks. The highest crowns stay at
  // least half a metre under the road even at maximum jitter, while the
  // bases drop away toward the haze below.
  let variant = index;
  for (const z of [-1.8, -5.6, -9.4]) { cluster(7.4, -5.0, z, 1.0, index, variant); variant += 1; }
  for (const z of [-3.6, -7.4, -11.2]) { cluster(11.0, -5.6, z, 1.2, index + 1, variant); variant += 1; }
  for (const z of [-0.6, -5.6, -10.6]) { cluster(15.2, -6.3, z, 1.5, index + 2, variant); variant += 1; }

  // Two small clouds drift just under the road edge, sweeping past the rider.
  cluster(6.15, -3.2, -4.3, 0.55, index + 3, variant);
  cluster(6.55, -4.1, -8.1, 0.5, index + 4, variant + 1);
  return group;
}

/** Low, luminous cloudbank spanning two lanes: jump it to keep the pace. */
function cloudBarrier() {
  const group = new THREE.Group();
  const puff = material(0xf5edff, { roughness: 0.96 });
  const shadow = material(0xb8a9da, { roughness: 0.96 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd46b });
  const geometry = new THREE.SphereGeometry(1, 9, 7);
  for (const [x, y, scale] of [
    [-1.38, 0.35, [0.68, 0.3, 0.55]], [-0.7, 0.4, [0.74, 0.42, 0.62]],
    [0, 0.42, [0.84, 0.48, 0.65]], [0.7, 0.4, [0.74, 0.42, 0.62]],
    [1.38, 0.35, [0.68, 0.3, 0.55]],
  ]) {
    sphere(group, geometry, y > 0.4 ? puff : shadow, x, y, 0, ...scale);
  }
  const glint = box(group, gold, 0, 0.79, 0, 3.75, 0.055, 0.08);
  glint.position.z = -0.08;
  return group;
}

/** One-lane meteor wrapped in a faint orbit; its height makes it a dodge. */
function floatingMeteor() {
  const group = new THREE.Group();
  const stone = material(0x555077, { roughness: 0.78, metalness: 0.08 });
  const stoneLit = material(0x8a79a7, { roughness: 0.73 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xf4be54,
    emissive: 0xc8752a,
    emissiveIntensity: 0.42,
    roughness: 0.35,
    metalness: 0.18,
    flatShading: true,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.63, 0.18, 8), stone);
  base.position.y = 0.1;
  group.add(base);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), stone);
  rock.position.set(0, 1.13, 0);
  rock.scale.set(0.92, 1.06, 0.86);
  group.add(rock);
  const facet = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), stoneLit);
  facet.position.set(-0.23, 1.54, 0.52);
  facet.scale.set(1, 1.25, 0.7);
  group.add(facet);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 5, 16), glow);
  orbit.position.y = 1.02;
  orbit.rotation.set(0.58, 0.14, 0.22);
  group.add(orbit);
  return group;
}

/** A slow cloud eddy replaces the generic mud puddle on this celestial map. */
function cloudEddy() {
  const group = new THREE.Group();
  const lavender = material(0x8c79c2, { emissive: 0x30214e, emissiveIntensity: 0.24, roughness: 0.4 });
  const pale = new THREE.MeshBasicMaterial({ color: 0xf0d8ff, transparent: true, opacity: 0.84 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd46b, transparent: true, opacity: 0.8 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.9, 0.06, 14), lavender);
  base.position.y = 0.035;
  base.scale.z = 1.25;
  group.add(base);
  for (const [radius, tube, y, rotation] of [[0.68, 0.045, 0.09, 0], [0.43, 0.035, 0.11, 0.9]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 5, 18), pale);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = rotation;
    ring.position.y = y;
    group.add(ring);
  }
  const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), gold);
  sparkle.position.set(0.1, 0.2, -0.24);
  group.add(sparkle);
  return group;
}

/** Stage-specific obstacle builder; collision timing still belongs to mirageRules. */
export function snakewayObstacle(kind) {
  if (kind === 'barrier') return cloudBarrier();
  if (kind === 'mud') return cloudEddy();
  return floatingMeteor();
}

/** A single floating halo above the track; no pylons or roadside structures. */
export function snakewayArch() {
  const group = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd176, transparent: true, opacity: 0.92, depthWrite: false });
  const pale = new THREE.MeshBasicMaterial({ color: 0xfff1c3, transparent: true, opacity: 0.84, depthWrite: false });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.12, 8, 48), gold);
  outer.position.set(0, 8.6, 0);
  group.add(outer);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(3.78, 0.045, 6, 48), pale);
  inner.position.set(0, 8.6, -0.03);
  group.add(inner);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), pale);
  star.position.set(0, 12.85, 0);
  star.rotation.set(0.2, Math.PI / 4, 0.15);
  group.add(star);
  group.userData.speedFactor = 1;
  group.userData.callout = 'floating-halo';
  return group;
}

function ribbonGeometry(curve, width, divisions = 160) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const sideVectors = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= divisions; i += 1) {
    const t = i / divisions;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    sideVectors.push(side);
    const left = center.clone().addScaledVector(side, width / 2);
    const right = center.clone().addScaledVector(side, -width / 2);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, t * 28, 1, t * 28);
    if (i < divisions) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const edgeCurves = [-1, 1].map((edge) => {
    const points = [];
    for (let i = 0; i <= divisions; i += 1) {
      const center = curve.getPointAt(i / divisions);
      points.push(center.addScaledVector(sideVectors[i], edge * width * 0.5));
    }
    return new THREE.CatmullRomCurve3(points);
  });
  return { geometry, edgeCurves };
}

function makeKaioPlanet() {
  const planet = new THREE.Group();
  const radius = 16;
  planet.position.set(0, -4.5, -92);
  planet.userData.callout = 'kaio-planet';

  // Vertex-painted water and rolling green land, kept crisp beyond the warm haze.
  const globeGeometry = new THREE.SphereGeometry(radius, 36, 24);
  const position = globeGeometry.attributes.position;
  const colors = [];
  const oceanDeep = new THREE.Color(0x327b9f);
  const oceanLight = new THREE.Color(0x61bfd0);
  const grassDark = new THREE.Color(0x34864e);
  const grass = new THREE.Color(0x66b95e);
  const grassSunlit = new THREE.Color(0xb4d96d);
  for (let i = 0; i < position.count; i += 1) {
    const nx = position.getX(i) / radius;
    const ny = position.getY(i) / radius;
    const nz = position.getZ(i) / radius;
    const shape = Math.sin(nx * 7.3 + nz * 4.2 + ny * 3.4)
      + Math.cos(nz * 9.1 - nx * 4.8 + ny * 2.2) * 0.68
      + Math.sin(ny * 11.4 + nx * 5.7 - nz * 3.1) * 0.31;
    let color;
    if (shape > 0.36) {
      color = shape > 1.02 ? grassSunlit : shape > 0.62 ? grass : grassDark;
    } else {
      color = ny > 0.58 ? oceanLight : oceanDeep;
    }
    const light = 0.88 + (Math.sin(nx * 18 + nz * 13) * 0.035);
    colors.push(color.r * light, color.g * light, color.b * light);
  }
  globeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const globe = new THREE.Mesh(globeGeometry, new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.94,
    flatShading: true,
    fog: false,
  }));
  planet.add(globe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.045, 32, 20),
    new THREE.MeshBasicMaterial({
      color: 0xb1efff,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  atmosphere.renderOrder = 1;
  planet.add(atmosphere);

  // A thin peach halo sits behind the globe, rather than reading as a Saturn ring.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.075, 0.1, 7, 72),
    new THREE.MeshBasicMaterial({ color: 0xffd49a, transparent: true, opacity: 0.72, depthWrite: false, fog: false }),
  );
  halo.position.z = -1.2;
  halo.renderOrder = 0;
  planet.add(halo);

  // Kaio's tiny home and unmistakable blue tree sit on the near, upper hemisphere.
  const up = new THREE.Vector3(0, 1, 0);
  const surfaceNormal = new THREE.Vector3(-0.12, 0.58, 0.806).normalize();
  const landmark = new THREE.Group();
  landmark.position.copy(surfaceNormal).multiplyScalar(radius * 0.985);
  landmark.quaternion.setFromUnitVectors(up, surfaceNormal);
  planet.add(landmark);

  const grassMat = material(0x69b957, { roughness: 1, fog: false });
  const grassEdge = new THREE.MeshBasicMaterial({ color: 0xa7d978, fog: false });
  const meadow = new THREE.Mesh(new THREE.CircleGeometry(7.25, 18), grassMat);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = 0.12;
  landmark.add(meadow);
  const meadowRim = new THREE.Mesh(new THREE.RingGeometry(7.05, 7.22, 18), grassEdge);
  meadowRim.rotation.x = -Math.PI / 2;
  meadowRim.position.y = 0.14;
  landmark.add(meadowRim);

  const wall = material(0xf1dfb9, { roughness: 0.88, fog: false });
  const trim = material(0x8b5e46, { roughness: 0.82, fog: false });
  const roofMat = material(0xd95f4a, { roughness: 0.74, fog: false });
  const doorMat = material(0x51465e, { roughness: 0.76, fog: false });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x9cdef0, fog: false });
  const houseX = -2.65;
  box(landmark, wall, houseX, 1.35, 0, 3.8, 2.45, 2.85);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.75, 1.55, 4), roofMat);
  roof.position.set(houseX, 3.18, 0);
  roof.rotation.y = Math.PI / 4;
  landmark.add(roof);
  box(landmark, trim, houseX, 0.2, 0, 4.05, 0.22, 3.08);
  box(landmark, doorMat, houseX, 0.78, 1.47, 0.72, 1.42, 0.08);
  for (const wx of [houseX - 1.13, houseX + 1.13]) {
    box(landmark, trim, wx, 1.72, 1.47, 0.7, 0.72, 0.1);
    box(landmark, windowMat, wx, 1.72, 1.54, 0.49, 0.5, 0.035);
  }

  const trunkMat = material(0x6e5741, { roughness: 0.94, fog: false });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 3.5, 7), trunkMat);
  trunk.position.set(3.7, 1.8, -0.2);
  landmark.add(trunk);
  const branch = box(landmark, trunkMat, 3.25, 2.75, -0.12, 1.35, 0.22, 0.24);
  branch.rotation.z = 0.42;
  const leafA = material(0x246e9a, { roughness: 0.9, fog: false });
  const leafB = material(0x3b91ae, { roughness: 0.9, fog: false });
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(2.15, 1), leafA);
  canopy.position.set(3.75, 4.08, -0.18);
  canopy.scale.set(1.35, 0.92, 1.12);
  landmark.add(canopy);
  const canopyHighlight = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), leafB);
  canopyHighlight.position.set(4.65, 4.35, 0.14);
  canopyHighlight.scale.set(1.08, 0.9, 0.92);
  landmark.add(canopyHighlight);

  return planet;
}

/** Yellow cloud banks frame the winding road and Kaio's planet on the horizon. */
export function makeSnakewayHorizon() {
  const group = new THREE.Group();
  const cloudColors = [
    material(0xffcf4d, { roughness: 1 }),
    material(0xffd75c, { roughness: 1 }),
    material(0xffe06b, { roughness: 1 }),
    material(0xffe98c, { roughness: 1 }),
    material(0xffc93f, { roughness: 1 }),
  ];
  const cloudGeometry = new THREE.SphereGeometry(1, 10, 7);
  const road = material(0x9a9aa5, { metalness: 0.12, roughness: 0.52, side: THREE.DoubleSide });
  const roadEdge = new THREE.MeshBasicMaterial({ color: 0xd8d8e2 });

  // Broad puffs stay to either side, tucked under the winding road's level
  // as it dives toward the planet, leaving a clean sightline to it.
  const cloudCenters = [
    [-42, -4.8, -43, 16, 3.4, 8], [-27, -5.6, -53, 17, 3.8, 9],
    [30, -5.2, -47, 16, 3.6, 9], [45, -3.8, -61, 18, 3.4, 9],
    [-39, -3.3, -71, 15, 3.2, 8], [38, -4.6, -76, 17, 3.4, 9],
    [-30, -7.0, -91, 16, 3.6, 8], [32, -8.2, -99, 19, 3.7, 10],
    [-43, -6.2, -113, 18, 3.4, 9], [46, -5.5, -121, 18, 3.6, 10],
  ];
  cloudCenters.forEach(([x, y, z, sx, sy, sz], index) => {
    const base = sphere(group, cloudGeometry, cloudColors[index % cloudColors.length], x, y, z, sx, sy, sz);
    base.rotation.y = index * 0.19;
    for (const [dx, dy, dz, rx, ry, rz] of [
      [-0.42, 0.26, -0.1, 0.55, 0.75, 0.74],
      [0.38, 0.3, 0.13, 0.48, 0.82, 0.68],
      [0.02, 0.48, -0.3, 0.35, 0.66, 0.57],
    ]) {
      sphere(group, cloudGeometry, cloudColors[(index + 1) % cloudColors.length], x + dx * sx, y + dy * sy, z + dz * sz, sx * rx, sy * ry, sz * rz);
    }
  });

  const kaioPlanet = makeKaioPlanet();
  group.add(kaioPlanet);

  // Long S-bends narrow into the lower, near side of Kaio's planet.
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.3, -36),
    new THREE.Vector3(-10, -0.4, -45),
    new THREE.Vector3(-17, 0.9, -54),
    new THREE.Vector3(-15, 1.5, -63),
    new THREE.Vector3(-6, 0.5, -71),
    new THREE.Vector3(6, -0.6, -78),
    new THREE.Vector3(8, -1.8, -84),
    new THREE.Vector3(3, -3.0, -91),
    new THREE.Vector3(0, -4.1, -99),
  ], false, 'centripetal', 0.45);
  const { geometry, edgeCurves } = ribbonGeometry(route, 3.15, 170);
  group.add(new THREE.Mesh(geometry, road));
  edgeCurves.forEach((edgeCurve) => {
    group.add(new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 170, 0.085, 5, false), roadEdge));
  });

  // Dragon scales line the winding road's edges, echoing the track border.
  const roadScaleGeometry = new THREE.SphereGeometry(1, 8, 5);
  const roadScaleA = material(0x82828e, { roughness: 0.88 });
  const roadScaleB = material(0x62626e, { roughness: 0.92 });
  edgeCurves.forEach((edgeCurve, edgeIndex) => {
    for (let i = 0; i < 60; i += 1) {
      const point = edgeCurve.getPointAt(i / 59);
      sphere(
        group, roadScaleGeometry,
        i % 2 === edgeIndex ? roadScaleA : roadScaleB,
        point.x, point.y + 0.04, point.z,
        0.4, 0.24, 0.46,
      );
    }
  });

  // Tile joints make the grey route read clearly as a stone road at the bends.
  const jointMat = material(0x6a6a75, { roughness: 0.76 });
  for (const t of [0.035, 0.08, 0.13, 0.19, 0.255, 0.32, 0.39, 0.46, 0.53]) {
    const center = route.getPointAt(t);
    const tangent = route.getTangentAt(t);
    const joint = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.035, 0.09), jointMat);
    joint.position.copy(center);
    joint.position.y += 0.025;
    joint.rotation.y = Math.atan2(-tangent.x, -tangent.z);
    group.add(joint);
  }

  return group;
}

/**
 * Dragon-scale road border: a low charcoal strip with two staggered rows of
 * overlapping grey dome scales caps each track edge — the way dragon scales
 * overlap along Shenron's ridge, with a bronze scale sparking now and then.
 * The 1.2 m scale step (5 per 6 m deck period) loops seamlessly with the
 * floor, and the border follows the track edges on both layouts.
 */
export function snakewayTrackTrim(lanes, floorRows = 28, floorMinZ = -40) {
  const group = new THREE.Group();
  const baseMat = material(0x4c4c58, { roughness: 0.95 });
  const scaleA = material(0x74747f, { roughness: 0.88 });
  const scaleB = material(0x94949f, { roughness: 0.82 });
  const bronze = material(0xa8763e, { emissive: 0x6e4218, emissiveIntensity: 0.4, roughness: 0.55, metalness: 0.25 });
  const scaleGeometry = new THREE.SphereGeometry(1, 9, 6);
  const edge = Math.max(Math.abs(lanes[0]), Math.abs(lanes[lanes.length - 1])) + 1.05;
  const length = floorRows * 2.02;
  const centerZ = floorMinZ + length / 2;
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, length), baseMat);
    strip.position.set(side * (edge - 0.28), -0.02, centerZ);
    group.add(strip);
    // Two staggered rows of overlapping dome scales hug the edge. The colour
    // pattern has a 5-scale cycle (one bronze per 6 m deck period) so the
    // border stays seamless when the floor loops.
    const rowPatterns = [
      [scaleA, scaleB, scaleA, bronze, scaleB],
      [scaleB, bronze, scaleB, scaleA, scaleA],
    ];
    const step = 1.2;
    const count = Math.ceil((length + 0.8) / step);
    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < count; i += 1) {
        const z = floorMinZ - 0.4 + row * (step / 2) + i * step;
        if (z > floorMinZ + length + 0.3) continue;
        sphere(group, scaleGeometry, rowPatterns[row][i % 5], side * (edge - 0.05 - row * 0.57), 0.02, z, 0.55, 0.3, 0.6);
      }
    }
  }
  return group;
}
