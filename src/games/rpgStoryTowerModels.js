/**
 * Maquettes des Tours de Bab El : de vraies géométries, sans GLB ni
 * texture distante. Les silhouettes et ornements reprennent les peintures du
 * mode Histoire. Construction déterministe, utilisable aussi dans les tests
 * Node (pas de document/canvas). Les pièces statiques sont fusionnées par
 * matériau : une quinzaine de draw calls, pas un appel par fenêtre/brique.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const RPG_STORY_TOWER_THEMES = Object.freeze({
  'tour-des-listes': Object.freeze({ stone: '#b4a183', dark: '#63564c', tile: '#245983', ground: '#48414a', accent: '#efc279', fill: '#a5bbff', particles: '#ffdca5' }),
  'tour-du-souk': Object.freeze({ stone: '#c79969', dark: '#785442', tile: '#237b85', ground: '#634b48', accent: '#ffb96a', fill: '#9ebccf', particles: '#ffd99c' }),
  'tour-des-sables': Object.freeze({ stone: '#bd8752', dark: '#92633e', tile: '#926941', ground: '#9c774c', accent: '#ffd08a', fill: '#d4bfaa', particles: '#edbd70' }),
  'tour-des-abysses': Object.freeze({ stone: '#39777e', dark: '#234955', tile: '#216f99', ground: '#24464f', accent: '#70e7e3', fill: '#63bde3', particles: '#9bffff' }),
  'tour-des-corsaires': Object.freeze({ stone: '#876a4d', dark: '#342f38', tile: '#17677a', ground: '#263c43', accent: '#e5b45b', fill: '#60c6d0', particles: '#b8f4ed' }),
  'tour-du-fjord': Object.freeze({ stone: '#6e889e', dark: '#3e536b', tile: '#527eaa', ground: '#394e67', accent: '#acdfff', fill: '#8dbbff', particles: '#e7f7ff' }),
  'tour-du-soleil-rouge': Object.freeze({ stone: '#8f2d22', dark: '#3a1410', tile: '#1f2d3d', ground: '#42322a', accent: '#e85d43', fill: '#ff9d7a', particles: '#ff6242' }),
  'tour-de-la-necropole': Object.freeze({ stone: '#28232e', dark: '#17121c', tile: '#4a3866', ground: '#1f1b24', accent: '#e5b73e', fill: '#8c6ebd', particles: '#d4af37' }),
  'tour-du-corbeau': Object.freeze({ stone: '#4b5666', dark: '#1b2230', tile: '#2c3550', ground: '#232936', accent: '#b9c9e0', fill: '#8fa6c9', particles: '#e6eefc' }),
  'tour-du-sablier-renverse': Object.freeze({ stone: '#57406b', dark: '#2c2138', tile: '#7a4a8c', ground: '#33283f', accent: '#f0c46a', fill: '#b79ce8', particles: '#ffd98a' }),
  // La Tour Oubliée : la pierre des fosses, l'encre séchée et l'or terni du
  // registre. C'est la seule tour dont la pierre ne reçoit aucune lumière
  // chaude — elle est plus sombre que la Nécropole, et plus froide.
  'tour-oubliee': Object.freeze({ stone: '#3b3140', dark: '#1a1620', tile: '#5b3f7a', ground: '#2a2431', accent: '#c9b37a', fill: '#b9a0e0', particles: '#e8d3a0' }),
});

function randomFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** Grain de pierre et joints ; la carte est teintée par chaque matériau. */
function stoneTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const random = randomFrom(27);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const joint = y % 16 === 0 || (x + (Math.floor(y / 16) % 2) * 16) % 32 === 0;
      const tone = joint ? 152 : 221 + Math.floor(random() * 33);
      const index = (y * size + x) * 4;
      data.set([tone, tone, tone, 255], index);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Zellige bleu et or : des losanges entrelacés, pas une image de la tour. */
function mosaicTexture(tileColor) {
  const tone = parseInt(tileColor.slice(1), 16);
  const rgb = [tone >>> 16, (tone >>> 8) & 255, tone & 255];
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.abs((x % 32) - 16), dy = Math.abs((y % 32) - 16);
      const line = Math.abs(dx + dy - 16) < 1.5 || Math.abs(Math.max(dx, dy) - 11) < 1;
      data.set(line ? [225, 187, 105, 255] : [rgb[0] + dy, rgb[1] + dx, rgb[2] + dy, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Cadre d'une vraie ouverture : la porte reste vide jusqu'au sol. */
function archGeometry(innerWidth = 0.7, innerHeight = 0.86, depth = 0.045) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.5, 0.55);
  shape.quadraticCurveTo(-0.47, 0.82, 0, 1);
  shape.quadraticCurveTo(0.47, 0.82, 0.5, 0.55);
  shape.lineTo(0.5, 0);
  shape.lineTo(innerWidth / 2, 0);
  shape.lineTo(innerWidth / 2, innerHeight * 0.55);
  shape.quadraticCurveTo(innerWidth * 0.47, innerHeight * 0.82, 0, innerHeight);
  shape.quadraticCurveTo(-innerWidth * 0.47, innerHeight * 0.82, -innerWidth / 2, innerHeight * 0.55);
  shape.lineTo(-innerWidth / 2, 0);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
}

function windowGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.35, 0);
  shape.lineTo(-0.35, 0.47);
  shape.quadraticCurveTo(-0.33, 0.71, 0, 0.86);
  shape.quadraticCurveTo(0.33, 0.71, 0.35, 0.47);
  shape.lineTo(0.35, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 8);
}

function makeKit(theme, id) {
  const root = new THREE.Group();
  root.name = `sablier-${id}`;
  root.userData.tourId = id;
  root.userData.features = [];
  const geometries = new Map();
  const stone = stoneTexture(), mosaic = mosaicTexture(theme.tile);
  const standard = (name, color, options = {}) => new THREE.MeshStandardMaterial({ name, color, roughness: 0.82, ...options });
  const materials = {
    stone: standard('pierre', theme.stone, { map: stone }),
    dark: standard('pierre-sombre', theme.dark, { map: stone }),
    ground: standard('socle', theme.ground, { map: stone }),
    gold: standard('laiton', '#c99d56', { metalness: 0.55, roughness: 0.34 }),
    tile: standard('zellige', '#ffffff', { map: mosaic, roughness: 0.48 }),
    wood: standard('bois', '#644231'),
    red: standard('tissu-rouge', '#aa423a', { side: THREE.DoubleSide }),
    teal: standard('tissu-turquoise', '#267d86', { side: THREE.DoubleSide }),
    cream: standard('parchemin', '#e3c999', { side: THREE.DoubleSide }),
    snow: standard('neige', '#e0eff5', { roughness: 0.95 }),
    ice: standard('glace', '#8dcbdc', { metalness: 0.25, roughness: 0.22 }),
    leaf: standard('algues', '#3c8170', { side: THREE.DoubleSide }),
    window: standard('fenetres-allumees', '#f6c77a', { emissive: '#f7ab48', emissiveIntensity: 1.15, roughness: 0.35 }),
    glass: standard('verre-du-sablier', '#b6dbe0', { transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.18, metalness: 0.12 }),
    water: standard('eau', '#3ea4b3', { transparent: true, opacity: 0.48, depthWrite: false, metalness: 0.25, roughness: 0.25 }),
  };
  const geometry = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, factory());
    return geometries.get(key);
  };
  const mesh = (geo, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], parent = root) => {
    const part = new THREE.Mesh(geo, material);
    part.position.set(...position);
    part.scale.set(...scale);
    part.rotation.set(...rotation);
    parent.add(part);
    return part;
  };
  const box = (mat, x, y, z, width, height, depth, yaw = 0, parent = root) =>
    mesh(geometry('box', () => new THREE.BoxGeometry(1, 1, 1)), mat, [x, y, z], [width, height, depth], [0, yaw, 0], parent);
  const cylinder = (mat, x, y, z, radius, height, topRatio = 1, segments = 16, parent = root) =>
    mesh(geometry(`cylinder:${topRatio}:${segments}`, () => new THREE.CylinderGeometry(topRatio, 1, 1, segments)), mat, [x, y, z], [radius, height, radius], [0, 0, 0], parent);
  const ring = (mat, x, y, z, radius, tube = 0.025, rotation = [Math.PI / 2, 0, 0], parent = root) =>
    mesh(geometry(`ring:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 6, 48)), mat, [x, y, z], [1, 1, 1], rotation, parent);
  const sphere = (mat, x, y, z, scale, parent = root) =>
    mesh(geometry('sphere', () => new THREE.SphereGeometry(1, 12, 8)), mat, [x, y, z], scale, [0, 0, 0], parent);
  const rock = (mat, x, y, z, scale, yaw = 0) =>
    mesh(geometry('rock', () => new THREE.DodecahedronGeometry(1)), mat, [x, y, z], scale, [0.15, yaw, 0.1]);
  const group = (x, y, z, yaw = 0) => {
    const item = new THREE.Group();
    item.position.set(x, y, z);
    item.rotation.y = yaw;
    root.add(item);
    return item;
  };
  const window = (x, y, z, width, height, yaw = 0) => {
    const item = group(x, y, z, yaw);
    mesh(geometry('window-panel', windowGeometry), materials.window, [0, 0, 0.018], [width, height, 1], [0, 0, 0], item);
    mesh(geometry('window-arch', () => archGeometry()), materials.gold, [0, 0, 0.025], [width, height, 1], [0, 0, 0], item);
    box(materials.gold, 0, height * 0.36, 0.07, width * 0.065, height * 0.72, 0.035, 0, item);
    box(materials.gold, 0, height * 0.32, 0.07, width * 0.65, height * 0.04, 0.035, 0, item);
  };
  const finial = (x, y, z, size = 1) => {
    cylinder(materials.gold, x, y + 0.19 * size, z, 0.035 * size, 0.38 * size, 0.55);
    sphere(materials.gold, x, y + 0.13 * size, z, [0.08 * size, 0.08 * size, 0.08 * size]);
    cylinder(materials.gold, x, y + 0.43 * size, z, 0.055 * size, 0.18 * size, 0);
  };
  const dome = (x, y, z, radius, height, frosted = false) => {
    const profile = [[0, 0], [0.88, 0], [1, 0.22], [0.87, 0.55], [0.57, 0.82], [0.18, 1.02], [0, 1.12]];
    mesh(geometry('dome', () => new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 24)), materials.gold, [x, y, z], [radius, height, radius]);
    ring(frosted ? materials.snow : materials.gold, x, y + 0.03, z, radius * 0.9, 0.045);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      const points = profile.slice(1).map(([r, h]) => new THREE.Vector3(Math.sin(angle) * r * radius, h * height + 0.012, Math.cos(angle) * r * radius));
      const curve = new THREE.CatmullRomCurve3(points);
      mesh(new THREE.TubeGeometry(curve, 12, 0.013, 4, false), frosted ? materials.snow : materials.gold, [x, y, z]);
    }
    finial(x, y + height * 1.12, z, 0.75);
  };
  const squareTier = (bottom, width, height, { x = 0, z = 0, snow = false, ruined = false } = {}) => {
    box(materials.stone, x, bottom + height / 2, z, width, height, width);
    box(materials.dark, x, bottom + height - 0.07, z, width + 0.16, 0.14, width + 0.16);
    box(snow ? materials.snow : materials.stone, x, bottom + height + 0.04, z, width + 0.23, 0.09, width + 0.23);
    box(ruined ? materials.dark : materials.tile, x, bottom + 0.12, z, width + 0.025, 0.19, width + 0.025);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      box(materials.dark, x + dx * (width / 2 - 0.04), bottom + height / 2, z + dz * (width / 2 - 0.04), 0.1, height, 0.1);
    }
    const count = width > 1.6 ? 2 : 1;
    for (let side = 0; side < 4; side += 1) {
      const yaw = side * Math.PI / 2;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * width * 0.43;
        const radius = width / 2 + 0.015;
        window(x + Math.cos(yaw) * offset + Math.sin(yaw) * radius, bottom + height * 0.2, z - Math.sin(yaw) * offset + Math.cos(yaw) * radius, width / count * 0.42, height * 0.62, yaw);
      }
      if (snow) {
        for (let i = 0; i < 7; i += 1) {
          const offset = (i - 3) * width / 7;
          mesh(geometry('icicle', () => new THREE.ConeGeometry(1, 1, 5)), materials.ice,
            [x + Math.cos(yaw) * offset + Math.sin(yaw) * (width / 2 + 0.1), bottom + height - 0.13, z - Math.sin(yaw) * offset + Math.cos(yaw) * (width / 2 + 0.1)],
            [0.045, 0.18 + (i % 3) * 0.075, 0.045], [0, 0, Math.PI]);
        }
      }
    }
  };
  const roundTier = (bottom, radius, height, x = 0, z = 0) => {
    cylinder(materials.stone, x, bottom + height / 2, z, radius, height, 1, 8);
    cylinder(materials.tile, x, bottom + 0.12, z, radius + 0.025, 0.2, 1, 32);
    cylinder(materials.dark, x, bottom + height - 0.03, z, radius + 0.13, 0.13, 1, 32);
    ring(materials.gold, x, bottom + 0.23, z, radius + 0.03, 0.023);
    ring(materials.gold, x, bottom + height + 0.04, z, radius + 0.13, 0.027);
    for (let i = 0; i < 8; i += 1) {
      const yaw = (i + 0.5) * Math.PI / 4;
      window(x + Math.sin(yaw) * (radius * 0.924 + 0.015), bottom + height * 0.25, z + Math.cos(yaw) * (radius * 0.924 + 0.015), radius * 0.45, height * 0.6, yaw);
      cylinder(materials.gold, x + Math.sin(i * Math.PI / 4) * radius, bottom + height / 2, z + Math.cos(i * Math.PI / 4) * radius, 0.028, height * 0.85);
    }
  };
  const ribbon = (mat, x, y, z, width, height, yaw = 0, ragged = false) => {
    const geo = new THREE.PlaneGeometry(width, height, 4, 8);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const t = (positions.getY(i) + height / 2) / height;
      positions.setZ(i, Math.sin(t * Math.PI * 1.7) * 0.1);
      if (ragged && t < 0.01) positions.setY(i, positions.getY(i) + (i % 3) * height * 0.12);
    }
    geo.computeVertexNormals();
    mesh(geo, mat, [x, y, z], [1, 1, 1], [0, yaw, 0]);
  };
  const pedestal = () => {
    cylinder(materials.ground, 0, 0.08, 0, 2.3, 0.28, 0.96, 48);
    cylinder(materials.dark, 0, 0.24, 0, 2.22, 0.08, 1, 48);
    ring(materials.gold, 0, 0.285, 0, 2.19, 0.018);
    for (let i = 0; i < 6; i += 1) {
      const height = 0.055 * (i + 1);
      box(materials.stone, 0, 0.285 + height / 2, 2.44 - i * 0.17, 0.95, height, 0.21);
    }
  };

  return { root, materials, geometry, mesh, box, cylinder, ring, sphere, rock, group, window, finial, dome, squareTier, roundTier, ribbon, pedestal, feature: (name) => root.userData.features.push(name), finish: () => {
    // Tous les matériaux/géométries appartiennent à cette seule maquette.
    root.updateMatrixWorld(true);
    const buckets = new Map();
    const originals = new Set(geometries.values());
    root.traverse((part) => {
      if (!part.isMesh) return;
      originals.add(part.geometry);
      let transformed = part.geometry.clone().applyMatrix4(part.matrixWorld);
      if (transformed.index) {
        const indexed = transformed;
        transformed = indexed.toNonIndexed();
        indexed.dispose();
      }
      // ExtrudeGeometry porte des groupes, les primitives non : une seule
      // matière par pièce, donc on les retire avant la fusion.
      transformed.clearGroups();
      if (!buckets.has(part.material)) buckets.set(part.material, []);
      buckets.get(part.material).push(transformed);
    });
    root.clear();
    for (const [material, parts] of buckets) {
      const merged = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!merged) throw new Error(`Géométries incompatibles : ${id}/${material.name}`);
      const part = new THREE.Mesh(merged, material);
      part.name = `${id}:${material.name}`;
      root.add(part);
    }
    originals.forEach((geo) => geo.dispose());
    // Les matériaux inutilisés ne doivent pas survivre à la construction.
    for (const material of Object.values(materials)) if (!buckets.has(material)) material.dispose();
    // Dans la Tour des Sables, aucun zellige n'est utilisé.
    if (![...buckets.keys()].some((material) => material.map === mosaic)) mosaic.dispose();
    return root;
  } };
}

function buildLists(k) {
  const { materials: m } = k;
  k.feature('sablier'); k.feature('astrolabe'); k.feature('parchemins');
  k.squareTier(0.34, 2.4, 1.35);
  k.squareTier(1.69, 1.95, 1.55);
  k.squareTier(3.24, 1.52, 1.4);
  k.squareTier(4.64, 1.08, 1.35);
  k.dome(0, 6.06, 0, 0.67, 0.8);
  const glass = k.group(0, 4.65, 1.04);
  const profile = [[0.4, -0.8], [0.42, -0.65], [0.29, -0.3], [0.07, 0], [0.29, 0.3], [0.42, 0.65], [0.4, 0.8]];
  k.mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), m.glass, [0, 0, 0], [1, 1, 1], [0, 0, 0], glass);
  for (const y of [-0.84, 0.84]) {
    k.cylinder(m.gold, 0, y, 0, 0.49, 0.09, 1, 24, glass);
    k.ring(m.gold, 0, y, 0, 0.49, 0.035, [Math.PI / 2, 0, 0], glass);
  }
  for (const x of [-0.43, 0.43]) for (const z of [-0.25, 0.25]) k.cylinder(m.gold, x, 0, z, 0.024, 1.7, 1, 8, glass);
  const sand = k.geometry('sand-cone', () => new THREE.ConeGeometry(1, 1, 16));
  k.mesh(sand, m.cream, [0, -0.61, 0], [0.34, 0.33, 0.34], [0, 0, 0], glass);
  k.mesh(sand, m.cream, [0, 0.42, 0], [0.33, 0.52, 0.33], [0, 0, Math.PI], glass);
  k.cylinder(m.cream, 0, -0.14, 0, 0.013, 0.54, 1, 8, glass);
  k.ring(m.gold, 0, 5.83, 0, 1.38, 0.026, [0.12, 0.2, 0]);
  k.ring(m.gold, 0, 5.83, 0, 1.54, 0.018, [0.82, -0.35, 0.3]);
  k.ring(m.gold, 0, 5.83, 0, 1.48, 0.016, [-0.63, 0.45, -0.35]);
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    k.sphere(m.gold, Math.cos(angle) * 1.38, 5.83 + Math.sin(angle) * 1.38, 0.15, [0.035, 0.035, 0.035]);
  }
  for (const x of [-0.78, 0.78]) k.ribbon(m.cream, x, 2.35, 1.05, 0.3, 1.38);
}

function buildSouk(k) {
  const { materials: m } = k;
  k.feature('etals-suspendus'); k.feature('auvents-colores'); k.feature('domes-dores');
  const tiers = [[0.34, 2.65, 1.45], [1.79, 2.22, 1.45], [3.24, 1.76, 1.28], [4.52, 1.17, 1.15]];
  for (const [bottom, width, height] of tiers) {
    k.squareTier(bottom, width, height);
    for (let side = 0; side < 4; side += 1) {
      const yaw = side * Math.PI / 2;
      const stall = k.group(Math.sin(yaw) * width / 2, bottom + height * 0.79, Math.cos(yaw) * width / 2, yaw);
      k.box(m.wood, 0, -0.74, 0.34, width * 0.9, 0.09, 0.84, 0, stall);
      for (const dx of [-1, 1]) k.cylinder(m.wood, dx * width * 0.4, -0.33, 0.65, 0.026, 0.82, 1, 8, stall);
      for (let stripe = 0; stripe < 8; stripe += 1) {
        const geo = new THREE.PlaneGeometry(width * 0.105, 0.79, 1, 6);
        const positions = geo.attributes.position;
        for (let i = 0; i < positions.count; i += 1) {
          const t = (positions.getY(i) + 0.395) / 0.79;
          positions.setXYZ(i, positions.getX(i), -t * 0.13 - Math.sin(t * Math.PI) * 0.11, t * 0.79);
        }
        geo.computeVertexNormals();
        const fabric = stripe % 2 ? m.cream : (side % 2 ? m.teal : m.red);
        k.mesh(geo, fabric, [(stripe - 3.5) * width * 0.105, 0.06, 0], [1, 1, 1], [0, 0, 0], stall);
        k.box(fabric, (stripe - 3.5) * width * 0.105, -0.12, 0.79, width * 0.105, 0.12, 0.018, 0, stall);
      }
      k.box(m.gold, 0, -0.42, 0.77, width * 0.9, 0.028, 0.025, 0, stall);
      for (let i = 0; i < 6; i += 1) k.box(m.gold, (i - 2.5) * width * 0.16, -0.59, 0.77, 0.021, 0.32, 0.025, 0, stall);
      for (let i = 0; i < 3; i += 1) {
        k.sphere(i % 2 ? m.teal : m.red, (i - 1) * width * 0.24, -0.58, 0.35, [0.11, 0.16, 0.11], stall);
        k.cylinder(m.gold, (i - 1) * width * 0.24, -0.43, 0.35, 0.06, 0.05, 1, 8, stall);
        k.sphere(m.window, (i - 1) * width * 0.28, -0.21, 0.63, [0.045, 0.075, 0.045], stall);
      }
    }
  }
  k.dome(0, 5.74, 0, 0.73, 0.84);
  for (const x of [-0.76, 0.76]) {
    k.roundTier(4.55, 0.27, 0.86, x, -0.5);
    k.dome(x, 5.48, -0.5, 0.34, 0.37);
  }
  for (const x of [-0.72, 0.72]) k.ribbon(m.teal, x, 2.56, 1.18, 0.35, 0.72);
}

function buildSands(k) {
  const { materials: m } = k;
  k.feature('portail-ouvert'); k.feature('sommet-en-ruines'); k.feature('dunes');
  for (const z of [-0.56, 0.53]) k.mesh(archGeometry(0.62, 0.81, 0.35), m.stone, [0, 0.34, z], [3.1, 3.2, 1]);
  for (const x of [-1.29, 1.29]) {
    k.box(m.dark, x, 1.88, 0, 0.45, 3.1, 1.24);
    k.box(m.stone, x, 3.45, 0, 0.55, 0.18, 1.35);
    k.window(x, 1.3, 0.64, 0.32, 0.8);
  }
  k.squareTier(3.42, 2.1, 1.3, { ruined: true });
  k.squareTier(4.72, 1.61, 1.17, { ruined: true });
  k.squareTier(5.89, 1.07, 0.94, { ruined: true });
  const random = randomFrom(73);
  for (let i = 0; i < 9; i += 1) {
    const angle = i * Math.PI * 2 / 9;
    const height = 0.25 + random() * 0.62;
    k.box(m.stone, Math.sin(angle) * 0.5, 6.83 + height / 2, Math.cos(angle) * 0.5, 0.18, height, 0.24, angle);
  }
  for (let i = 0; i < 15; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 1.4 + random() * 0.6;
    k.rock(m.dark, Math.sin(angle) * radius, 0.36, Math.cos(angle) * radius, [0.12 + random() * 0.24, 0.1 + random() * 0.21, 0.18], angle);
  }
  k.sphere(m.stone, -1.56, 0.34, 1, [0.82, 0.38, 0.68]);
  k.sphere(m.stone, 1.62, 0.34, -0.4, [0.75, 0.48, 0.79]);
  k.cylinder(m.wood, -1.05, 4.61, 0.5, 0.025, 1.9, 1, 8);
  k.ribbon(m.red, -1.22, 4.76, 0.54, 0.34, 1.02, 0, true);
}

function buildAbysses(k) {
  const { materials: m } = k;
  k.feature('galeries-aquatiques'); k.feature('pont-a-arches'); k.feature('algues');
  k.roundTier(0.34, 1.29, 1.42);
  k.roundTier(1.76, 1.05, 1.42);
  k.roundTier(3.18, 0.79, 1.32);
  k.roundTier(4.5, 0.51, 1.12);
  k.dome(0, 5.7, 0, 0.63, 0.61);
  for (const x of [-1.36, 1.36]) {
    k.roundTier(0.8, 0.34, 1.8, x, -0.22);
    k.dome(x, 2.67, -0.22, 0.45, 0.44);
  }
  k.mesh(archGeometry(0.73, 0.87, 0.56), m.stone, [1.37, 0.34, 0.7], [1.29, 1.2, 1]);
  k.box(m.tile, 1.37, 1.61, 0.98, 1.53, 0.13, 0.68);
  for (const x of [0.83, 1.18, 1.53, 1.88]) k.box(m.gold, x, 1.78, 1.28, 0.025, 0.27, 0.025);
  k.box(m.gold, 1.37, 1.92, 1.28, 1.5, 0.025, 0.025);
  k.cylinder(m.water, 0, 0.32, 0, 2.21, 0.018, 1, 48);
  for (let i = 0; i < 10; i += 1) {
    const angle = i * Math.PI / 5;
    const height = 0.56 + (i % 3) * 0.24;
    const x = Math.sin(angle) * 1.95, z = Math.cos(angle) * 1.95;
    k.ribbon(m.leaf, x, 0.34 + height / 2, z, 0.09, height, angle);
    k.rock(m.dark, x, 0.33, z, [0.18, 0.17, 0.22], angle);
  }
  k.ring(m.ice, 0, 0.38, 0, 1.79, 0.013);
}

function buildFjord(k) {
  const { materials: m } = k;
  k.feature('corniches-gelees'); k.feature('cristaux-de-glace'); k.feature('drakkar');
  for (let i = 0; i < 10; i += 1) {
    const angle = i * Math.PI / 5;
    k.rock(m.dark, Math.sin(angle) * 1.48, 0.43, Math.cos(angle) * 1.48, [0.65, 0.34 + (i % 3) * 0.17, 0.57], angle);
  }
  k.squareTier(0.56, 2.22, 1.5, { snow: true });
  k.squareTier(2.06, 1.75, 1.5, { snow: true });
  k.squareTier(3.56, 1.25, 1.42, { snow: true });
  k.squareTier(4.98, 0.78, 1.02, { snow: true });
  k.dome(0, 6.07, 0, 0.55, 0.65, true);
  k.roundTier(1.06, 0.53, 2.85, 1.02, -0.38);
  k.dome(1.02, 3.98, -0.38, 0.64, 0.59, true);
  k.squareTier(0.61, 0.78, 1.67, { x: -1.04, z: -0.63, snow: true });
  const crystal = k.geometry('crystal', () => new THREE.ConeGeometry(1, 1, 5));
  for (let i = 0; i < 9; i += 1) {
    const angle = (i + 0.5) * Math.PI * 2 / 9;
    k.mesh(crystal, m.ice, [Math.sin(angle) * 1.94, 0.5, Math.cos(angle) * 1.94], [0.17, 0.46 + (i % 3) * 0.2, 0.17], [0.2, angle, 0.28]);
  }
  const boat = k.group(-1.1, 0.4, 1.62, -0.4);
  k.sphere(m.wood, 0, 0, 0, [0.67, 0.13, 0.2], boat);
  k.box(m.snow, 0, 0.06, 0, 1.14, 0.035, 0.22, 0, boat);
  k.cylinder(m.wood, 0, 0.42, 0, 0.025, 0.8, 1, 8, boat);
  k.box(m.cream, 0.07, 0.57, 0.025, 0.42, 0.4, 0.017, 0, boat);
  for (const x of [-0.54, 0.54]) k.cylinder(m.wood, x, 0.12, 0, 0.055, 0.33, 0.5, 8, boat);
}

function buildSoleilRouge(k) {
  const { materials: m } = k;
  k.feature('toits-recourbes'); k.feature('torii-ecarlate'); k.feature('bannieres-samourai');
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    k.rock(m.dark, Math.sin(angle) * 1.62, 0.38, Math.cos(angle) * 1.62, [0.45, 0.28 + (i % 3) * 0.12, 0.45], angle);
  }
  const tiers = [
    { bottom: 0.35, width: 2.1, height: 1.35, roofW: 2.7 },
    { bottom: 1.7, width: 1.65, height: 1.25, roofW: 2.2 },
    { bottom: 2.95, width: 1.25, height: 1.15, roofW: 1.75 },
    { bottom: 4.1, width: 0.88, height: 1.05, roofW: 1.35 },
  ];
  for (const { bottom, width, height, roofW } of tiers) {
    k.box(m.stone, 0, bottom + height / 2, 0, width, height, width);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      k.box(m.dark, dx * (width / 2 - 0.04), bottom + height / 2, dz * (width / 2 - 0.04), 0.1, height, 0.1);
    }
    k.box(m.dark, 0, bottom + 0.15, 0, width + 0.22, 0.08, width + 0.22);
    for (let side = 0; side < 4; side += 1) {
      const yaw = side * Math.PI / 2;
      k.window(Math.sin(yaw) * (width / 2 + 0.015), bottom + height * 0.25, Math.cos(yaw) * (width / 2 + 0.015), width * 0.45, height * 0.55, yaw);
    }
    const roofY = bottom + height;
    k.box(m.tile, 0, roofY + 0.06, 0, roofW, 0.1, roofW);
    k.box(m.dark, 0, roofY + 0.14, 0, roofW * 0.82, 0.08, roofW * 0.82);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      k.box(m.gold, dx * (roofW / 2 - 0.05), roofY + 0.16, dz * (roofW / 2 - 0.05), 0.14, 0.12, 0.14, Math.PI / 4);
    }
  }
  const topY = 5.15;
  k.cylinder(m.gold, 0, topY + 0.8, 0, 0.045, 1.6, 0.2, 12);
  for (let r = 0; r < 5; r += 1) {
    k.ring(m.gold, 0, topY + 0.4 + r * 0.2, 0, 0.16 - r * 0.018, 0.024);
  }
  k.sphere(m.gold, 0, topY + 1.65, 0, [0.1, 0.1, 0.1]);
  const torii = k.group(0, 0.34, 1.45, 0);
  k.cylinder(m.red, -0.48, 0.5, 0, 0.05, 1.0, 0.85, 8, torii);
  k.cylinder(m.red, 0.48, 0.5, 0, 0.05, 1.0, 0.85, 8, torii);
  k.box(m.red, 0, 0.95, 0, 1.3, 0.09, 0.1, 0, torii);
  k.box(m.dark, 0, 1.02, 0, 1.4, 0.05, 0.13, 0, torii);
  k.box(m.red, 0, 0.74, 0, 1.12, 0.06, 0.07, 0, torii);
  for (const [x, z, yaw] of [[-1.25, 0.8, -0.3], [1.25, 0.8, 0.3]]) {
    const banner = k.group(x, 0.34, z, yaw);
    k.cylinder(m.wood, 0, 0.9, 0, 0.028, 1.8, 0.8, 8, banner);
    k.cylinder(m.wood, 0.2, 1.72, 0, 0.02, 0.45, 1, 8, banner);
    k.ribbon(m.red, 0.2, 1.15, 0, 0.32, 1.1, 0);
  }
}

function buildNecropole(k) {
  const { materials: m } = k;
  k.feature('obelisques'); k.feature('colonnes-de-lotus'); k.feature('sarcophage');
  k.box(m.dark, 0, 0.42, 0, 3.1, 0.24, 3.1);
  for (const sign of [-1, 1]) {
    k.box(m.stone, sign * 1.05, 1.4, 0, 1.25, 1.75, 1.75);
    k.box(m.dark, sign * 1.05, 2.32, 0, 1.35, 0.12, 1.85);
    k.box(m.gold, sign * 1.05, 2.42, 0, 1.45, 0.09, 1.95);
  }
  k.box(m.stone, 0, 2.05, 0, 0.86, 0.46, 1.6);
  k.box(m.gold, 0, 2.32, 0, 0.95, 0.12, 1.7);
  k.squareTier(2.46, 1.95, 1.45);
  for (const sign of [-1, 1]) {
    for (const z of [-0.6, 0, 0.6]) {
      k.cylinder(m.stone, sign * 1.08, 3.18, z, 0.07, 1.35, 0.9, 12);
      k.cylinder(m.gold, sign * 1.08, 3.88, z, 0.12, 0.15, 1.3, 12);
    }
  }
  k.box(m.tile, 0, 3.86, 0, 1.7, 0.1, 1.7);
  k.squareTier(3.91, 1.4, 1.25);
  const pyraHeight = 1.35;
  const pyra = k.geometry('pyramidion', () => new THREE.ConeGeometry(1, 1, 4));
  k.mesh(pyra, m.gold, [0, 5.16 + pyraHeight / 2, 0], [0.82, pyraHeight, 0.82], [0, Math.PI / 4, 0]);
  for (const x of [-1.15, 1.15]) {
    const obY = 0.54;
    k.box(m.dark, x, obY + 0.15, 1.35, 0.42, 0.3, 0.42);
    k.cylinder(m.dark, x, obY + 1.25, 1.35, 0.14, 1.9, 0.65, 4);
    k.mesh(pyra, m.gold, [x, obY + 2.32, 1.35], [0.15, 0.3, 0.15], [0, Math.PI / 4, 0]);
  }
  const sarco = k.group(0, 0.55, 1.3, 0);
  k.box(m.dark, 0, 0.12, 0, 0.72, 0.22, 0.38, 0, sarco);
  k.box(m.gold, 0, 0.25, 0, 0.76, 0.06, 0.42, 0, sarco);
  k.cylinder(m.gold, 0, 0.32, 0, 0.16, 0.68, 1, 12, sarco);
}

function buildCorsaires(k) {
  const { materials: m } = k;
  k.feature('mats-de-voile'); k.feature('cordages'); k.feature('coque-de-galion');
  k.box(m.dark, 0, 0.42, 0, 3.1, 0.24, 3.1);
  // Tour-port suspendue au-dessus des citernes, ponctuée de fanions corsaires.
  for (const sign of [-1, 1]) {
    k.box(m.stone, sign * 1.02, 1.28, 0, 0.55, 1.45, 0.62);
    k.box(m.dark, sign * 1.02, 2.05, 0, 0.72, 0.12, 0.78);
    k.cylinder(m.gold, sign * 1.02, 2.22, 0, 0.08, 0.28, 0.82, 8);
  }
  k.box(m.tile, 0, 1.1, 0, 1.55, 0.16, 1.45);
  k.squareTier(1.2, 1.5, 1.25);
  k.box(m.stone, 0, 2.2, 0, 0.78, 1.05, 0.78);
  k.box(m.dark, 0, 2.78, 0, 1.15, 0.13, 1.15);
  k.squareTier(2.88, 1.12, 0.95);
  for (const x of [-0.56, 0.56]) {
    k.cylinder(m.gold, x, 3.45, 0, 0.06, 1.05, 0.8, 8);
    k.mesh(k.geometry('corsaire-voile', () => new THREE.ConeGeometry(0.44, 0.9, 3)), m.tile,
      [x, 3.42, 0], [0.75, 1, 0.12], [0, 0, Math.PI / 2]);
  }
  // Une étrave et son beaupré donnent sa silhouette de navire à la base.
  k.mesh(k.geometry('etrave', () => new THREE.ConeGeometry(0.62, 1.55, 4)), m.dark,
    [0, 0.74, 1.35], [0.8, 0.55, 1.2], [Math.PI / 2, 0, 0]);
  // Le grand mât de vigie : il porte la tour à la hauteur des autres
  // maquettes — vergue, nid-de-pie et grande voile crème, coiffés d'or.
  k.cylinder(m.wood, 0, 4.9, 0, 0.05, 3.4, 0.55, 10);
  k.box(m.wood, 0, 6.05, 0, 1.5, 0.05, 0.05);
  k.cylinder(m.wood, 0, 5.72, 0, 0.17, 0.2, 1.25, 12);
  k.mesh(k.geometry('corsaire-voile', () => new THREE.ConeGeometry(0.44, 0.9, 3)), m.cream,
    [0.52, 5.15, 0], [2.1, 1.45, 0.16], [0, 0, Math.PI / 2]);
  k.finial(0, 6.6, 0, 0.8);
}

function buildCorbeau(k) {
  const { materials: m } = k;
  k.feature('arbre-des-corbeaux'); k.feature('neige-noire'); k.feature('cercle-de-plumes');
  const plume = k.geometry('plume-de-corbeau', () => new THREE.ConeGeometry(1, 1, 4));
  const bec = k.geometry('bec-de-corbeau', () => new THREE.ConeGeometry(1, 1, 4));

  // Le cercle de pierres levées, chacune à son ombre de plume. La neige noire
  // n'est pas une autre matière : c'est la neige du kit, prise dans la nuit.
  for (let i = 0; i < 9; i += 1) {
    const angle = (i + 0.5) * Math.PI * 2 / 9;
    const x = Math.sin(angle) * 1.66, z = Math.cos(angle) * 1.66;
    k.box(m.dark, x, 0.4 + (i % 3) * 0.07, z, 0.17, 0.42 + (i % 3) * 0.16, 0.17, angle);
    k.box(m.snow, x, 0.63 + (i % 3) * 0.16, z, 0.2, 0.05, 0.2, angle);
    k.mesh(plume, m.snow, [x * 0.76, 0.33, z * 0.76], [0.045, 0.2 + (i % 2) * 0.06, 0.045], [0.55, angle, 0.28]);
    k.ring(m.ice, x * 0.9, 0.3, z * 0.9, 0.09, 0.008, [Math.PI / 2, 0, 0]);
  }
  k.ring(m.ice, 0, 0.35, 0, 1.36, 0.012);

  // Trois paliers de pierre, coiffés de neige — la tour penche à mesure
  // qu'elle monte : le corbeau ne tient jamais droit.
  k.squareTier(0.34, 1.58, 1.22, { snow: true });
  k.squareTier(1.56, 1.24, 1.14, { snow: true });
  k.squareTier(2.7, 0.94, 1.06, { x: 0.06, z: -0.03, snow: true });

  // Le tronc noir, ses branches nues et son nid de givre.
  const trunk = k.group(0.12, 3.7, -0.06, 0.22);
  k.box(m.dark, 0, 1.24, 0, 0.28, 2.5, 0.28, 0, trunk);
  k.box(m.dark, 0.24, 2.28, 0.03, 0.13, 0.95, 0.13, 0.55, trunk);
  k.box(m.dark, -0.3, 2.08, -0.05, 0.12, 0.85, 0.12, -0.6, trunk);
  k.box(m.dark, 0.06, 2.46, 0.18, 0.1, 0.72, 0.1, 1.05, trunk);
  k.box(m.snow, 0.12, 2.5, 0.02, 0.16, 0.06, 0.16, 0, trunk);
  k.sphere(m.snow, 0.18, 2.02, 0.05, [0.2, 0.07, 0.2], trunk);
  k.mesh(plume, m.snow, [-0.46, 2.4, -0.1], [0.05, 0.24, 0.05], [0.2, 0.4, 1.1], trunk);
  k.mesh(plume, m.snow, [0.42, 2.62, 0.14], [0.045, 0.2, 0.045], [-0.2, -0.5, 1.2], trunk);

  // Le corbeau de garde, perché sur la branche haute, et son compagnon
  // posé sur la pierre du seuil.
  const corbeau = (x, y, z, yaw, echelle) => {
    const o = k.group(x, y, z, yaw);
    k.sphere(m.dark, 0, 0, 0, [0.14 * echelle, 0.11 * echelle, 0.21 * echelle], o);
    k.sphere(m.dark, 0, 0.1 * echelle, 0.18 * echelle, [0.075 * echelle, 0.075 * echelle, 0.085 * echelle], o);
    k.mesh(bec, m.dark, [0, 0.09 * echelle, 0.29 * echelle], [0.032 * echelle, 0.1 * echelle, 0.032 * echelle], [Math.PI / 2, 0, 0], o);
    k.box(m.dark, 0.15 * echelle, 0.03 * echelle, -0.02 * echelle, 0.24 * echelle, 0.022 * echelle, 0.1 * echelle, 0.36, o);
    k.box(m.dark, -0.15 * echelle, 0.03 * echelle, -0.02 * echelle, 0.24 * echelle, 0.022 * echelle, 0.1 * echelle, -0.36, o);
    k.box(m.dark, 0, 0.005 * echelle, -0.26 * echelle, 0.09 * echelle, 0.03 * echelle, 0.18 * echelle, 0, o);
    k.sphere(m.window, 0.035 * echelle, 0.12 * echelle, 0.24 * echelle, [0.022 * echelle, 0.022 * echelle, 0.022 * echelle], o);
  };
  corbeau(0.28, 6.02, 0.12, 0.5, 1);
  corbeau(-1.28, 0.72, 0.98, -0.4, 0.8);

  // La lanterne de fer au verre cassé : le seul point chaud de la clairière.
  const lanterne = k.group(-1.02, 4.2, 0.72, 0.3);
  k.cylinder(m.wood, 0, 0.62, 0, 0.022, 1.1, 1, 6, lanterne);
  k.box(m.gold, 0, 0, 0, 0.26, 0.06, 0.26, 0, lanterne);
  k.box(m.window, 0, -0.19, 0, 0.16, 0.3, 0.16, 0, lanterne);
  k.box(m.gold, 0, -0.37, 0, 0.26, 0.06, 0.26, 0, lanterne);
  k.mesh(k.geometry('toit-lanterne', () => new THREE.ConeGeometry(1, 1, 4)), m.dark, [0, 0.16, 0], [0.19, 0.18, 0.19], [0, Math.PI / 4, 0], lanterne);
  k.mesh(plume, m.snow, [-0.7, 0.5, 0.9], [0.05, 0.2, 0.05], [0.4, 0.3, 1.15]);

  // Les congères de la clairière et les éclats de glace noire.
  for (let i = 0; i < 7; i += 1) {
    const angle = i * Math.PI * 2 / 7 + 0.35;
    k.rock(m.dark, Math.sin(angle) * 1.9, 0.31, Math.cos(angle) * 1.9, [0.24, 0.1, 0.2], angle);
    k.mesh(k.geometry('eclat-glace', () => new THREE.ConeGeometry(1, 1, 5)), m.ice,
      [Math.sin(angle) * 1.94, 0.44, Math.cos(angle) * 1.94], [0.09, 0.32 + (i % 3) * 0.12, 0.09], [0.18, angle, 0.22]);
  }
}

function buildSablierRenverse(k) {
  const { materials: m } = k;
  k.feature('sablier-geant'); k.feature('chambres-inversees'); k.feature('anneau-des-cinq-couleurs');
  // La silhouette d'un sablier : large en bas, étranglée à la taille,
  // renflée au-dessus — les deux chambres de verre devenues des étages.
  // Sept paliers montent ainsi, un par gardien de la tour.
  k.roundTier(0.34, 1.3, 1.3);
  k.roundTier(1.64, 1.05, 1.25);
  k.roundTier(2.89, 0.74, 1.1);
  k.roundTier(3.99, 0.98, 1.15);
  k.roundTier(5.14, 0.66, 1.0);
  k.dome(0, 6.2, 0, 0.8, 0.75);
  // L'anneau d'or du retournement, incliné à la taille de la tour, et
  // ses cinq gemmes — une par couleur vaincue en montant : le Sable
  // crème, la Braise rouge, l'Eau turquoise, la Neige de glace et les
  // Ténèbres violettes.
  k.ring(m.gold, 0, 3.95, 0, 1.28, 0.03, [1.25, 0.15, 0.2]);
  const gemmes = [m.cream, m.red, m.teal, m.ice, m.tile];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i * Math.PI * 2) / 5 + 0.35;
    k.sphere(gemmes[i], Math.sin(angle) * 1.08, 3.45, Math.cos(angle) * 1.08, [0.1, 0.13, 0.1]);
    k.cylinder(m.gold, Math.sin(angle) * 1.08, 3.3, Math.cos(angle) * 1.08, 0.018, 0.18, 1, 8);
  }
  // Le sablier géant du parvis : le vrai, celui qui s'est renversé.
  // Deux cônes de sable crème et le filet qui tombe encore.
  const glass = k.group(1.18, 1.62, 1.02, -0.3);
  const profile = [[0.4, -0.8], [0.42, -0.65], [0.29, -0.3], [0.07, 0], [0.29, 0.3], [0.42, 0.65], [0.4, 0.8]];
  k.mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * 1.15, y * 1.15)), 24), m.glass, [0, 0, 0], [1, 1, 1], [0, 0, 0], glass);
  for (const y of [-0.97, 0.97]) {
    k.cylinder(m.gold, 0, y, 0, 0.56, 0.1, 1, 24, glass);
    k.ring(m.gold, 0, y, 0, 0.56, 0.04, [Math.PI / 2, 0, 0], glass);
  }
  for (const x of [-0.49, 0.49]) for (const z of [-0.28, 0.28]) k.cylinder(m.gold, x, 0, z, 0.028, 1.95, 1, 8, glass);
  const sand = k.geometry('sand-cone-sablier', () => new THREE.ConeGeometry(1, 1, 16));
  k.mesh(sand, m.cream, [0, -0.7, 0], [0.39, 0.38, 0.39], [0, 0, 0], glass);
  k.mesh(sand, m.cream, [0, 0.48, 0], [0.38, 0.6, 0.38], [0, 0, Math.PI], glass);
  k.cylinder(m.cream, 0, -0.16, 0, 0.015, 0.62, 1, 8, glass);
}


/**
 * La Tour Oubliée : une tour fendue, bâtie sur une fosse qu'on n'a jamais
 * rebouchée. Trois paliers qui ne s'alignent plus, des chaînes rompues, une
 * cloche fêlée et l'encre du registre qui coule le long des pierres.
 */
function buildOubliee(k) {
  const { materials: m } = k;
  k.feature('fosse-sans-fond');
  k.feature('chaines-rompues');
  k.feature('cloche-felee');
  k.feature('encre-du-registre');

  const chainon = k.geometry('chainon-oublie', () => new THREE.TorusGeometry(0.07, 0.014, 5, 12));
  const goutte = k.geometry('goutte-encre', () => new THREE.SphereGeometry(1, 8, 6));

  // La fosse : un puits noir cerclé de dalles, d'où sortent les morts sans nom.
  k.cylinder(m.dark, 0, 0.3, 0, 1.5, 0.12, 1, 32);
  k.ring(m.gold, 0, 0.375, 0, 1.46, 0.022);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i + 0.5) * Math.PI * 2 / 12;
    const x = Math.sin(angle) * 1.58, z = Math.cos(angle) * 1.58;
    k.box(m.stone, x, 0.36 + (i % 3) * 0.02, z, 0.34, 0.14 + (i % 2) * 0.05, 0.22, angle);
  }
  // Trois dalles brisées, plantées dans la fosse.
  for (const [x, z, yaw, hauteur] of [[-0.86, 0.42, 0.4, 0.62], [0.72, -0.54, -0.7, 0.48], [0.2, 0.92, 1.2, 0.36]]) {
    k.box(m.stone, x, 0.44 + hauteur / 2, z, 0.2, hauteur, 0.34, yaw);
    k.box(m.dark, x, 0.44 + hauteur - 0.02, z, 0.22, 0.05, 0.36, yaw);
  }

  // Trois paliers fendus : chacun glisse d'un côté, comme si la tour avait
  // oublié de rester droite. `ruined` éteint la frise de zellige.
  k.squareTier(0.34, 1.62, 1.34, { ruined: true });
  k.squareTier(1.72, 1.24, 1.26, { x: 0.11, z: -0.07, ruined: true });
  k.squareTier(3.02, 0.94, 1.16, { x: -0.07, z: 0.09, ruined: true });

  // Les chaînes rompues : cinq maillons pendent du deuxième palier, et deux
  // sont tombés dans la fosse.
  for (let i = 0; i < 5; i += 1) {
    const angle = (i * 0.9) + 0.35;
    const x = Math.sin(angle) * 0.66, z = Math.cos(angle) * 0.66;
    for (let j = 0; j < 4; j += 1) {
      k.mesh(chainon, m.gold, [x, 3.0 - j * 0.13, z], [1, 1, 1], [j % 2 ? Math.PI / 2 : 0, angle, 0]);
    }
  }
  for (const [x, z] of [[-1.12, -0.5], [1.02, 0.72]]) {
    k.mesh(chainon, m.dark, [x, 0.42, z], [1.1, 1.1, 1.1], [Math.PI / 2, 0.4, 0.2]);
    k.mesh(chainon, m.dark, [x + 0.13, 0.42, z + 0.06], [1.1, 1.1, 1.1], [0.2, 0.9, 0]);
  }

  // La cloche fêlée : fendue jusqu'au battant, elle ne sonne plus qu'un nom.
  const cloche = k.group(0.06, 4.18, -0.05, 0.32);
  k.cylinder(m.gold, 0, 0.46, 0, 0.42, 0.86, 0.62, 20, cloche);
  k.ring(m.gold, 0, 0.9, 0, 0.26, 0.03, [Math.PI / 2, 0, 0], cloche);
  k.ring(m.gold, 0, 0.04, 0, 0.44, 0.035, [Math.PI / 2, 0, 0], cloche);
  k.box(m.dark, 0.3, 0.52, 0.16, 0.055, 0.74, 0.06, 0.5, cloche);
  k.sphere(m.gold, 0, 0.1, 0, [0.09, 0.12, 0.09], cloche);
  // Le beffroi qui la tient : quatre montants, un toit de pierre.
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    k.box(m.wood, dx * 0.34, 4.62, dz * 0.34, 0.08, 1.0, 0.08);
  }
  k.box(m.stone, 0, 5.16, 0, 0.9, 0.1, 0.9);
  k.cylinder(m.dark, 0, 5.42, 0, 0.5, 0.42, 0.15, 8);
  k.finial(0, 5.66, 0, 0.9);

  // L'encre du registre : elle coule du beffroi jusqu'à la fosse le long des
  // pierres, en trois rigoles et quelques gouttes suspendues.
  for (const [x, z, yaw, largeur] of [[0.62, 0.5, 0.5, 0.26], [-0.54, 0.44, -0.4, 0.2], [0.1, -0.68, 0.05, 0.3]]) {
    k.ribbon(m.dark, x, 2.6, z, largeur, 4.4, yaw);
  }
  for (const [x, y, z, taille] of [[0.62, 3.9, 0.52, 0.05], [0.64, 3.1, 0.54, 0.035], [-0.52, 2.3, 0.46, 0.04], [0.12, 1.5, -0.7, 0.045]]) {
    k.mesh(goutte, m.dark, [x, y, z], [taille, taille * 1.6, taille]);
  }

  // Les feuillets arrachés au registre, cloués au premier palier.
  for (let i = 0; i < 3; i += 1) {
    const yaw = 0.4 + i * 0.22;
    k.ribbon(m.cream, -0.72 + i * 0.06, 1.9 - i * 0.16, 0.66, 0.24, 0.3, yaw, true);
  }

  // Deux fenêtres allumées suffisent : la tour est vide, pas éteinte.
  k.window(0.55, 1.92, 0.72, 0.26, 0.44, 0.28);
  k.window(-0.36, 4.02, 0.62, 0.22, 0.36, -0.2);
}

const BUILDERS = {
  'tour-des-listes': buildLists,
  'tour-du-souk': buildSouk,
  'tour-des-sables': buildSands,
  'tour-des-abysses': buildAbysses,
  'tour-des-corsaires': buildCorsaires,
  'tour-du-fjord': buildFjord,
  'tour-du-soleil-rouge': buildSoleilRouge,
  'tour-de-la-necropole': buildNecropole,
  'tour-du-corbeau': buildCorbeau,
  'tour-du-sablier-renverse': buildSablierRenverse,
  'tour-oubliee': buildOubliee,
};

/** Une maquette autonome. L'identifiant inconnu ne produit pas une autre tour. */
export function createStoryTowerModel(tourId) {
  const theme = RPG_STORY_TOWER_THEMES[tourId];
  if (!theme || !BUILDERS[tourId]) return null;
  const kit = makeKit(theme, tourId);
  kit.pedestal();
  BUILDERS[tourId](kit);
  return kit.finish();
}

/** Chaque ressource GPU est rendue une seule fois, même si elle est partagée. */
export function disposeStoryTowerModel(root) {
  if (!root || root.userData.disposed) return;
  root.userData.disposed = true;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse((part) => {
    if (part.geometry) geometries.add(part.geometry);
    for (const material of [].concat(part.material ?? [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  root.clear();
}
