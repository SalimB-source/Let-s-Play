// Zone de départ / arrivée de Vice City Rush : portique à feux, tribunes,
// commissaire au drapeau à damier, mâts d'éclairage, confettis.
//
// La partie statique (`buildStartComplex`) est ajoutée au même lot fusionné
// que le décor de la boucle, autour de la position de piste 0 (z local 0),
// dans la fenêtre ±START_ZONE_HALF laissée libre par `buildCityLoop`.
// La partie animée (`createStartLineDynamics`) est un groupe unique que le
// monde repositionne chaque frame sur la ligne la plus proche devant le
// joueur : feux de départ, tableau de tour, foule, flashs, faisceaux,
// drapeaux et confettis.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CITY_RUSH_LANE_X, CITY_RUSH_LAPS, CITY_RUSH_ROAD_HALF_WIDTH, CITY_RUSH_ROAD_WIDTH, CITY_RUSH_SCROLL_SCALE } from './cityRushRules.js';
import { SignAtlas, drawBannerCell, seededRandom } from './cityRushBuilder.js';
import { makeCheckerTexture, makeGantrySignTexture, makeStartGroundTexture, makeLapBoard } from './cityRushTextures.js';
import { START_ZONE_HALF } from './cityRushStage.js';

const SCALE = CITY_RUSH_SCROLL_SCALE;
const STAND_HALF = 15.8; // demi-longueur des tribunes (unités monde ≈ ±22 m)
const STAND_INNER_X = 11.5;
const GANTRY_X = 8.6;
// 8,4 m : le boîtier des feux (point bas ≈ 7,3 m) reste au-dessus de la caméra
// de poursuite (≤ 6,7 m) quand elle passe sous le portique à chaque tour, et
// le panneau reste visible sous le HUD pendant l'approche.
const GANTRY_HEIGHT = 8.4;
export const START_LIGHT_COUNT = 5;

function basic(options) {
  return new THREE.MeshBasicMaterial(options);
}

/**
 * Matériaux propres à la zone de départ (textures canvas dédiées). Les
 * matériaux partagés (béton, métal, néons…) viennent de `createStageMaterials`.
 */
export function createStartLineMaterials(city, theme) {
  const checker = makeCheckerTexture(24, 4);
  checker.wrapS = THREE.RepeatWrapping;
  const atlas = new SignAtlas({ cellWidth: 384, cellHeight: 96, columns: 3 });
  const palette = [
    { background: '#141a2e', color: city.accent, textColor: '#ffffff' },
    { background: city.accent, color: '#ffffff', textColor: '#101020' },
    { background: '#f4f1ea', color: city.secondary, textColor: '#141a2e' },
    { background: city.secondary, color: '#ffffff', textColor: '#101020' },
  ];
  const bannerUvs = theme.sponsors.map((text, index) => {
    const style = palette[index % palette.length];
    return atlas.uvFor(atlas.add({ text, draw: drawBannerCell, ...style }));
  });
  const bannerTexture = atlas.build();
  return {
    checker: basic({ map: checker, toneMapped: false }),
    checkerFlag: basic({ map: makeCheckerTexture(8, 5), side: THREE.DoubleSide, toneMapped: false }),
    gantry: basic({ map: makeGantrySignTexture(city, theme), toneMapped: false }),
    groundText: basic({ map: makeStartGroundTexture('DÉPART'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    banner: basic({ map: bannerTexture }),
    bannerUvs,
    seatA: new THREE.MeshStandardMaterial({ color: new THREE.Color(city.accent).multiplyScalar(0.8), roughness: 0.75 }),
    seatB: new THREE.MeshStandardMaterial({ color: new THREE.Color(city.secondary).multiplyScalar(0.75), roughness: 0.75 }),
    // Auvent des tribunes : sombre la nuit, toile claire en plein jour.
    canopy: new THREE.MeshStandardMaterial({ color: theme.materials?.canopy ?? 0x1b2030, roughness: 0.55, metalness: 0.35 }),
    gridPaint: basic({ color: 0xf4f4ef, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    rumbleRed: new THREE.MeshStandardMaterial({ color: 0xd8323c, roughness: 0.7, emissive: 0x3a0a0e }),
    rumbleWhite: new THREE.MeshStandardMaterial({ color: 0xf1f1ec, roughness: 0.7, emissive: 0x2a2a2a }),
  };
}

/**
 * Géométrie statique de la zone de départ, ajoutée au lot `batch` partagé
 * avec le décor de la boucle (repère local : la ligne est en z = 0).
 */
export function buildStartComplex({ city, theme, materials: m, startMaterials: s, batch, random = seededRandom(7), lite = false }) {
  const lineZ = 0;
  const zoneHalf = START_ZONE_HALF * SCALE;

  // ── Dalle béton de part et d'autre de la chaussée, jusqu'aux tribunes ──
  for (const side of [-1, 1]) {
    batch.box(m.concrete, [side * 14.9, -0.06, lineZ], [10.2, 0.12, zoneHalf * 2]);
  }

  // ── Ligne à damier + bandes vibreurs ─────────────────────────────────
  batch.plane(s.checker, [0, 0.025, lineZ], CITY_RUSH_ROAD_WIDTH, 1.6, [-Math.PI / 2, 0, 0]);
  batch.plane(s.checker, [0, 0.03, lineZ + 1.2], CITY_RUSH_ROAD_WIDTH, 0.14, [-Math.PI / 2, 0, 0], { uv: [0, 0.2, 1, 0.21] });
  const rumbleX = CITY_RUSH_ROAD_HALF_WIDTH - 0.25;
  for (const side of [-1, 1]) {
    for (let index = 0; index < 16; index += 1) {
      const z = -STAND_HALF + 1 + index * 2;
      batch.box(index % 2 ? s.rumbleRed : s.rumbleWhite, [side * rumbleX, 0.035, z], [0.3, 0.07, 2]);
    }
  }

  // ── Texte DÉPART au sol et cases de grille ────────────────────────────
  batch.plane(s.groundText, [0, 0.04, lineZ + 5.6], 9, 1.76, [-Math.PI / 2, 0, 0]);
  const gridRows = [0.6, 5.4];
  gridRows.forEach((rowZ, rowIndex) => {
    CITY_RUSH_LANE_X.forEach((laneX, laneIndex) => {
      if (rowIndex === 1 && laneIndex % 2 === 0) return;
      const length = 3.4;
      batch.plane(s.gridPaint, [laneX - 0.78, 0.035, rowZ + length / 2], 0.08, length, [-Math.PI / 2, 0, 0]);
      batch.plane(s.gridPaint, [laneX + 0.78, 0.035, rowZ + length / 2], 0.08, length, [-Math.PI / 2, 0, 0]);
      batch.plane(s.gridPaint, [laneX, 0.035, rowZ], 1.64, 0.08, [-Math.PI / 2, 0, 0]);
    });
  });

  // ── Portique : pylônes, poutre treillis, panneau, boîtier des feux ────
  for (const side of [-1, 1]) {
    const x = side * GANTRY_X;
    batch.box(m.concrete, [x, 0.25, lineZ], [1.4, 0.5, 1.4]);
    batch.box(m.darkMetal, [x, GANTRY_HEIGHT / 2 + 0.5, lineZ], [0.72, GANTRY_HEIGHT, 0.72]);
    batch.box(m.metal, [x, GANTRY_HEIGHT + 0.5, lineZ], [1.0, 0.16, 1.0]);
    // Croisillons décoratifs sur le pylône.
    for (let level = 1; level < 8; level += 1) {
      batch.box(m.metal, [x + side * 0.02, level * 1.2 + 0.4, lineZ], [0.9, 0.08, 0.08], [0, 0, side * 0.6]);
    }
  }
  const beamY = GANTRY_HEIGHT + 0.5;
  batch.box(m.metal, [0, beamY, lineZ - 0.5], [GANTRY_X * 2 + 0.7, 0.26, 0.26]);
  batch.box(m.metal, [0, beamY, lineZ + 0.5], [GANTRY_X * 2 + 0.7, 0.26, 0.26]);
  batch.box(m.metal, [0, beamY + 1.1, lineZ - 0.5], [GANTRY_X * 2 + 0.7, 0.22, 0.22]);
  batch.box(m.metal, [0, beamY + 1.1, lineZ + 0.5], [GANTRY_X * 2 + 0.7, 0.22, 0.22]);
  for (let index = 0; index <= 12; index += 1) {
    const x = -GANTRY_X + index * (GANTRY_X * 2 / 12);
    batch.box(m.metal, [x, beamY + 0.55, lineZ - 0.5], [0.08, 1.1, 0.08]);
    batch.box(m.metal, [x, beamY + 0.55, lineZ + 0.5], [0.08, 1.1, 0.08]);
    batch.box(m.metal, [x, beamY + 0.55, lineZ], [0.08, 0.08, 1.0]);
    if (index < 12) {
      batch.box(m.metal, [x + GANTRY_X / 12, beamY + 0.55, lineZ + 0.5], [0.08, 1.75, 0.06], [0, 0, (index % 2 ? 1 : -1) * 0.92]);
    }
  }
  // Panneau DÉPART · ARRIVÉE (face avant et face arrière).
  batch.plane(s.gantry, [0, beamY + 0.55, lineZ + 0.66], 12, 2.5, null);
  batch.plane(s.gantry, [0, beamY + 0.55, lineZ - 0.66], 12, 2.5, [0, Math.PI, 0]);
  batch.box(m.darkMetal, [0, beamY + 0.55, lineZ], [12.2, 2.6, 1.2]);
  // Boîtier des feux de départ (les lampes sont dynamiques).
  batch.box(m.darkMetal, [0, beamY - 1.0, lineZ], [4.6, 1.0, 0.6]);
  batch.box(m.metal, [0, beamY - 0.55, lineZ], [0.3, 0.3, 0.3]);
  // Caméras / projecteurs sur la poutre.
  for (const x of [-6.2, -3.4, 3.4, 6.2]) {
    batch.box(m.darkMetal, [x, beamY - 0.45, lineZ + 0.4], [0.5, 0.36, 0.6], [0.35, 0, 0]);
    batch.plane(m.lampGlow, [x, beamY - 0.52, lineZ + 0.72], 0.4, 0.26, [0.35, 0, 0]);
    batch.cone(m.lampCone, [x, (beamY - 0.6) / 2, lineZ + 1.8], 2.2, beamY - 0.6, 10, [0.18, 0, 0]);
  }
  // Cellules de chronométrage au bord de la piste.
  for (const side of [-1, 1]) {
    batch.cylinder(m.metal, [side * 7.05, 0.4, lineZ], 0.05, 0.05, 0.8, 6);
    batch.box(m.red, [side * 7.05, 0.82, lineZ], [0.16, 0.16, 0.16]);
  }

  // ── Tribunes : gradins, sièges, garde-corps à bannières, auvent ───────
  const tiers = lite ? 4 : 5;
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < tiers; tier += 1) {
      const height = 0.55 * (tier + 1);
      const x = side * (STAND_INNER_X + 0.75 + tier * 1.5);
      batch.box(m.concrete, [x, height / 2, lineZ], [1.5, height, STAND_HALF * 2]);
      batch.box(tier % 2 ? s.seatA : s.seatB, [x + side * 0.15, height + 0.14, lineZ], [1.1, 0.28, STAND_HALF * 2 - 0.4]);
    }
    const rearX = side * (STAND_INNER_X + tiers * 1.5 + 0.3);
    batch.box(m.concrete, [rearX, 1.9, lineZ], [0.4, 3.8, STAND_HALF * 2]);
    // Garde-corps avant + bannières de sponsors face à la piste.
    const railX = side * (STAND_INNER_X - 0.3);
    batch.box(m.white, [railX, 0.5, lineZ], [0.12, 1.0, STAND_HALF * 2]);
    batch.box(m.metal, [railX, 1.04, lineZ], [0.08, 0.08, STAND_HALF * 2]);
    const bannerCount = Math.floor((STAND_HALF * 2) / 4);
    for (let index = 0; index < bannerCount; index += 1) {
      const z = -STAND_HALF + 2 + index * 4;
      const uv = s.bannerUvs[(index + (side > 0 ? 2 : 0)) % s.bannerUvs.length];
      batch.plane(s.banner, [railX - side * 0.08, 0.5, z], 3.8, 0.84, [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { uv });
    }
    // Auvent incliné + poteaux.
    const canopyX = side * (STAND_INNER_X + 3.9);
    batch.box(s.canopy, [canopyX, 5.3, lineZ], [8.8, 0.16, STAND_HALF * 2 + 0.6], [0, 0, side * 0.1]);
    batch.box(m.metal, [canopyX, 5.46, lineZ], [8.8, 0.08, 0.3], [0, 0, side * 0.1]);
    for (const z of [-STAND_HALF + 0.6, -STAND_HALF / 3, STAND_HALF / 3, STAND_HALF - 0.6]) {
      batch.cylinder(m.metal, [side * (STAND_INNER_X + tiers * 1.5 - 0.3), 2.65, z], 0.1, 0.1, 5.3, 6);
      batch.cylinder(m.metal, [side * (STAND_INNER_X + 0.3), 2.9, z], 0.07, 0.07, 5.8, 6);
    }
    // Lisses lumineuses sous l'auvent.
    batch.box(m.neonWhite, [canopyX, 5.18, lineZ], [0.1, 0.06, STAND_HALF * 2 - 1]);
    batch.box(m.neon, [side * (STAND_INNER_X + 0.4), 5.6, lineZ], [0.1, 0.1, STAND_HALF * 2 - 1]);
    // Escaliers d'accès aux extrémités.
    for (const end of [-1, 1]) {
      for (let step = 0; step < 6; step += 1) {
        batch.box(m.concrete, [side * (STAND_INNER_X + 0.4 + step * 1.1), 0.2 + step * 0.42, lineZ + end * (STAND_HALF + 0.55)], [1.1, 0.4 + step * 0.84, 1.1]);
      }
    }
  }

  // ── Mâts d'éclairage aux quatre coins ────────────────────────────────
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const x = side * 10.6;
      const z = lineZ + end * (STAND_HALF + 5.4);
      batch.cylinder(m.metal, [x, 6.4, z], 0.16, 0.22, 12.8, 8);
      batch.box(m.darkMetal, [x - side * 0.3, 12.7, z], [1.6, 0.5, 0.5], [0, 0, side * 0.25]);
      batch.plane(m.lampGlow, [x - side * 0.5, 12.5, z], 1.5, 0.4, [-Math.PI / 2, 0, side * 0.25]);
      batch.cone(m.lampCone, [x - side * 1.6, 6.2, z], 4.8, 12.4, 12, [0, 0, side * 0.3]);
    }
  }

  // ── Tour de direction de course (côté gauche, en amont de la ligne) ──
  const towerX = -16.2;
  const towerZ = lineZ - (STAND_HALF + 4.3);
  for (const dx of [-1.3, 1.3]) {
    for (const dz of [-1.3, 1.3]) {
      batch.cylinder(m.metal, [towerX + dx, 2.3, towerZ + dz], 0.12, 0.12, 4.6, 6);
    }
  }
  batch.box(m.white, [towerX, 5.6, towerZ], [3.4, 2.2, 3.4]);
  batch.box(m.glassDark, [towerX, 5.75, towerZ], [3.5, 0.9, 3.5]);
  batch.box(m.darkMetal, [towerX, 6.8, towerZ], [3.9, 0.16, 3.9]);
  batch.cylinder(m.metal, [towerX + 1.2, 7.9, towerZ - 1.2], 0.03, 0.03, 2.2, 4);
  batch.box(m.neonSecondary, [towerX, 6.95, towerZ + 1.95], [3.2, 0.12, 0.08]);

  // ── Fanions tendus en travers de la piste ────────────────────────────
  const pennantMaterials = [m.red, m.yellow, m.blue, m.white, m.green];
  for (const z of [lineZ - 12, lineZ + 12]) {
    batch.cylinder(m.darkMetal, [0, 7.9, z], 0.025, 0.025, 2 * (STAND_INNER_X - 0.6), 4, [0, 0, Math.PI / 2]);
    for (let index = 0; index < 18; index += 1) {
      const x = -STAND_INNER_X + 1.2 + index * 1.2;
      batch.cone(pennantMaterials[index % pennantMaterials.length], [x, 7.6, z], 0.26, 0.55, 3, [Math.PI, 0, 0]);
    }
  }
  // Pavoisement : hampes derrière les tribunes (les drapeaux sont animés).
  for (const side of [-1, 1]) {
    for (const z of [-12, -4, 4, 12]) {
      batch.cylinder(m.white, [side * (STAND_INNER_X + tiers * 1.5 + 1.2), 3.6, z], 0.06, 0.08, 7.2, 6);
    }
  }
}

// ─── Géométries dynamiques ──────────────────────────────────────────────────
function makeFlagGeometry(width, height, segments = 6) {
  const columns = segments + 1;
  const positions = new Float32Array(columns * 2 * 3);
  const uvs = new Float32Array(columns * 2 * 2);
  const indices = [];
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      const vertex = column * 2 + row;
      positions[vertex * 3] = 0;
      positions[vertex * 3 + 1] = row * height;
      positions[vertex * 3 + 2] = (column / segments) * width;
      uvs[vertex * 2] = column / segments;
      uvs[vertex * 2 + 1] = row;
    }
    if (column < segments) {
      const a = column * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return { geometry, columns, segments, width };
}

function waveFlag(flag, elapsed, amplitude, speed = 7) {
  const array = flag.geometry.attributes.position.array;
  for (let column = 0; column < flag.columns; column += 1) {
    const reach = column / flag.segments;
    const x = Math.sin(elapsed * speed + column * 1.1 + flag.phase) * amplitude * reach;
    const sag = -reach * reach * 0.08;
    for (let row = 0; row < 2; row += 1) {
      const vertex = column * 2 + row;
      array[vertex * 3] = x;
      array[vertex * 3 + 1] = row * flag.height + sag;
    }
  }
  flag.geometry.attributes.position.needsUpdate = true;
}

function makeCrowdGeometry() {
  const body = new THREE.BoxGeometry(0.36, 0.64, 0.26);
  body.translate(0, 0.32, 0);
  const head = new THREE.SphereGeometry(0.14, 7, 6);
  head.translate(0, 0.8, 0);
  const merged = mergeGeometries([body, head], false);
  body.dispose();
  head.dispose();
  return merged;
}

/**
 * Éléments animés de la ligne de départ. Le groupe est repositionné par le
 * monde (ligne la plus proche devant le joueur) ; `gapMeters` est l'écart en
 * mètres entre le joueur et la ligne (positif devant, négatif derrière).
 */
export function createStartLineDynamics({ city, theme, materials: m, startMaterials: s, random = seededRandom(23), lite = false }) {
  const group = new THREE.Group();
  group.name = 'start-line-dynamics';
  const disposables = [];
  const accent = new THREE.Color(city.accent);
  const secondary = new THREE.Color(city.secondary);
  const beamY = GANTRY_HEIGHT + 0.5;

  // ── Feux de départ ─────────────────────────────────────────────────────
  const lampGeometry = new THREE.SphereGeometry(0.24, 12, 10);
  disposables.push(lampGeometry);
  const lamps = [];
  for (let index = 0; index < START_LIGHT_COUNT; index += 1) {
    const material = basic({ color: 0x3a0d14, toneMapped: false });
    disposables.push(material);
    const lamp = new THREE.Mesh(lampGeometry, material);
    lamp.position.set(-1.6 + index * 0.8, beamY - 1.0, 0.3);
    group.add(lamp);
    lamps.push({ mesh: lamp, material, lit: false });
  }
  const goBarMaterial = basic({ color: 0x0e2a1a, toneMapped: false });
  disposables.push(goBarMaterial);
  const goBar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 0.12), goBarMaterial);
  goBar.position.set(0, beamY - 1.56, 0.3);
  group.add(goBar);
  disposables.push(goBar.geometry);
  const gantryLight = new THREE.PointLight(0xff2a3c, 0, 26, 1.6);
  gantryLight.position.set(0, beamY - 1.2, 2.4);
  group.add(gantryLight);
  let goTimer = 0;
  let litCount = 0;

  // ── Tableau de tour au-dessus du panneau ───────────────────────────────
  const board = makeLapBoard(city);
  disposables.push(board.texture);
  const boardMaterial = basic({ map: board.texture, toneMapped: false });
  disposables.push(boardMaterial);
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.56), boardMaterial);
  boardMesh.position.set(0, beamY + 2.9, 0.62);
  disposables.push(boardMesh.geometry);
  group.add(boardMesh);
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(5.3, 1.86, 0.4), m.darkMetal);
  boardFrame.position.set(0, beamY + 2.9, 0.38);
  disposables.push(boardFrame.geometry);
  group.add(boardFrame);
  board.draw(`TOUR 1/${CITY_RUSH_LAPS}`, `${city.name.toUpperCase()} · ${theme.gantryText}`);

  // ── Faisceaux tournants sur les pylônes ───────────────────────────────
  const beams = [];
  const beamGeometry = new THREE.ConeGeometry(1.1, 18, 10, 1, true);
  beamGeometry.rotateX(Math.PI);
  beamGeometry.translate(0, 9, 0);
  disposables.push(beamGeometry);
  // Les faisceaux tournants ne se lisent que dans le noir : quasi éteints en
  // plein jour (Vice City).
  const beamOpacity = theme.daylight ? 0.03 : 0.13;
  const beamMaterials = [accent, secondary].map((color) => {
    const material = basic({ color, transparent: true, opacity: beamOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    disposables.push(material);
    return material;
  });
  for (let index = 0; index < 4; index += 1) {
    const pivot = new THREE.Object3D();
    const side = index < 2 ? -1 : 1;
    pivot.position.set(side * (GANTRY_X - 0.2 + (index % 2) * 0.4), beamY + 0.2, 0);
    const beam = new THREE.Mesh(beamGeometry, beamMaterials[index % 2]);
    pivot.add(beam);
    group.add(pivot);
    beams.push({ pivot, phase: index * 1.7, side });
  }

  // ── Drapeaux animés sur les hampes + drapeau à damier du commissaire ──
  const flags = [];
  const flagMaterials = [
    basic({ color: accent, side: THREE.DoubleSide }),
    basic({ color: 0xf4f1ea, side: THREE.DoubleSide }),
    basic({ color: secondary, side: THREE.DoubleSide }),
  ];
  disposables.push(...flagMaterials);
  const tiers = lite ? 4 : 5;
  for (const side of [-1, 1]) {
    [-12, -4, 4, 12].forEach((z, index) => {
      const flag = makeFlagGeometry(1.7, 1.05, 6);
      flag.height = 1.05;
      flag.phase = random() * Math.PI * 2;
      disposables.push(flag.geometry);
      const mesh = new THREE.Mesh(flag.geometry, flagMaterials[(index + (side > 0 ? 1 : 0)) % flagMaterials.length]);
      mesh.position.set(side * (STAND_INNER_X + tiers * 1.5 + 1.2) + side * 0.05, 6.0, z + 0.06);
      mesh.frustumCulled = false;
      group.add(mesh);
      flags.push(flag);
    });
  }

  const marshal = new THREE.Group();
  marshal.position.set(-7.55, 0, 1.4);
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a27c, roughness: 0.8 });
  const suit = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x1a1d2c, roughness: 0.9 });
  disposables.push(skin, suit, trousers);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.74, 0.22), trousers);
  legs.position.y = 0.37;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.26), suit);
  torso.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin);
  head.position.y = 1.52;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.1, 10), trousers);
  cap.position.y = 1.64;
  marshal.add(legs, torso, head, cap);
  disposables.push(legs.geometry, torso.geometry, head.geometry, cap.geometry);
  const arm = new THREE.Group();
  arm.position.set(0.2, 1.32, 0);
  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), suit);
  armMesh.position.y = 0.31;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), m.metal);
  pole.position.y = 1.2;
  disposables.push(armMesh.geometry, pole.geometry);
  const marshalFlag = makeFlagGeometry(1.25, 0.85, 6);
  marshalFlag.height = 0.85;
  marshalFlag.phase = 0.4;
  disposables.push(marshalFlag.geometry);
  const marshalFlagMesh = new THREE.Mesh(marshalFlag.geometry, s.checkerFlag);
  marshalFlagMesh.position.set(0, 1.25, 0.03);
  marshalFlagMesh.frustumCulled = false;
  arm.add(armMesh, pole, marshalFlagMesh);
  arm.rotation.z = -0.5;
  marshal.add(arm);
  group.add(marshal);

  // ── Foule instanciée dans les tribunes ────────────────────────────────
  const perTier = lite ? 14 : 22;
  const crowdCount = 2 * tiers * perTier;
  const crowdGeometry = makeCrowdGeometry();
  const crowdMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  disposables.push(crowdGeometry, crowdMaterial);
  const crowd = new THREE.InstancedMesh(crowdGeometry, crowdMaterial, crowdCount);
  crowd.frustumCulled = false;
  const spectators = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  const color = new THREE.Color();
  let spectatorIndex = 0;
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < tiers; tier += 1) {
      for (let seat = 0; seat < perTier; seat += 1) {
        const x = side * (STAND_INNER_X + 0.85 + tier * 1.5) + (random() - 0.5) * 0.5;
        const z = -STAND_HALF + 1.2 + (seat + random() * 0.6) * ((STAND_HALF * 2 - 2.4) / perTier);
        const y = 0.55 * (tier + 1) + 0.28;
        const spectator = { x, y, z, side, phase: random() * Math.PI * 2, rate: 5 + random() * 3, height: 0.85 + random() * 0.3 };
        spectators.push(spectator);
        quaternion.setFromEuler(new THREE.Euler(0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0));
        matrix.compose(position.set(x, y, z), quaternion, scale.set(1, spectator.height, 1));
        crowd.setMatrixAt(spectatorIndex, matrix);
        color.setHex(theme.crowdColors[Math.floor(random() * theme.crowdColors.length)]);
        crowd.setColorAt(spectatorIndex, color);
        spectatorIndex += 1;
      }
    }
  }
  crowd.instanceMatrix.needsUpdate = true;
  if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
  group.add(crowd);

  // ── Flashs d'appareils photo dans la foule ────────────────────────────
  const flashCount = lite ? 10 : 18;
  const flashMaterial = basic({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const flashGeometry = new THREE.PlaneGeometry(0.9, 0.9);
  disposables.push(flashMaterial, flashGeometry);
  const flashes = new THREE.InstancedMesh(flashGeometry, flashMaterial, flashCount);
  flashes.frustumCulled = false;
  const flashStates = Array.from({ length: flashCount }, () => ({ timer: -random() * 2, life: 0, x: 0, y: 0, z: 0 }));
  group.add(flashes);

  // ── Confettis (arrivée) ───────────────────────────────────────────────
  const confettiCount = lite ? 220 : 380;
  const confettiPositions = new Float32Array(confettiCount * 3);
  const confettiColors = new Float32Array(confettiCount * 3);
  const confettiVelocity = new Float32Array(confettiCount * 3);
  const confettiGeometry = new THREE.BufferGeometry();
  confettiGeometry.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
  confettiGeometry.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));
  const confettiMaterial = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
  disposables.push(confettiGeometry, confettiMaterial);
  const confetti = new THREE.Points(confettiGeometry, confettiMaterial);
  confetti.frustumCulled = false;
  confetti.visible = false;
  group.add(confetti);
  let confettiTimer = 0;

  // ── État d'animation ──────────────────────────────────────────────────
  let excitement = 0.35;
  let excitementTimer = 0;
  let waving = false;
  let waveTimer = 0;
  let lastGap = 0;

  function applyLights() {
    lamps.forEach((lamp, index) => {
      const lit = index < litCount;
      lamp.material.color.setHex(lit ? 0xff2a3c : 0x3a0d14);
    });
    if (goTimer > 0) {
      goBarMaterial.color.setHex(0x3dff7a);
      gantryLight.color.setHex(0x3dff7a);
      gantryLight.intensity = 3.2 * Math.min(1, goTimer);
    } else {
      goBarMaterial.color.setHex(0x0e2a1a);
      gantryLight.color.setHex(0xff2a3c);
      gantryLight.intensity = litCount * 0.55;
    }
  }
  applyLights();

  function setLights(count, go = false) {
    litCount = go ? 0 : Math.max(0, Math.min(START_LIGHT_COUNT, count | 0));
    goTimer = go ? 1.6 : 0;
    applyLights();
  }

  function burstFlashes(intensity = 1) {
    flashStates.forEach((flash, index) => {
      if (random() > intensity) return;
      flash.timer = random() * 0.35;
      flash.life = 0;
      void index;
    });
  }

  function excite(level, duration) {
    excitement = Math.max(excitement, level);
    excitementTimer = Math.max(excitementTimer, duration);
  }

  function celebrate() {
    confetti.visible = true;
    confettiTimer = 7;
    for (let index = 0; index < confettiCount; index += 1) {
      const side = random() < 0.5 ? -1 : 1;
      confettiPositions[index * 3] = side * (GANTRY_X - 1.5 + random() * 3);
      confettiPositions[index * 3 + 1] = beamY + 0.5 + random() * 2.5;
      confettiPositions[index * 3 + 2] = (random() - 0.5) * 2;
      confettiVelocity[index * 3] = -side * (1.5 + random() * 4.5);
      confettiVelocity[index * 3 + 1] = 2.5 + random() * 4.5;
      confettiVelocity[index * 3 + 2] = (random() - 0.5) * 3;
      color.setHex(theme.crowdColors[index % theme.crowdColors.length]);
      confettiColors[index * 3] = color.r;
      confettiColors[index * 3 + 1] = color.g;
      confettiColors[index * 3 + 2] = color.b;
    }
    confettiGeometry.attributes.position.needsUpdate = true;
    confettiGeometry.attributes.color.needsUpdate = true;
    excite(1.6, 8);
    burstFlashes(1);
    waving = true;
    waveTimer = 9;
  }

  function onCross({ final = false } = {}) {
    excite(final ? 1.6 : 1.2, final ? 8 : 3.5);
    burstFlashes(final ? 1 : 0.7);
    if (final) celebrate();
    else { waving = true; waveTimer = 2.4; }
  }

  function setFinalLap(active) {
    waving = active;
    waveTimer = active ? Number.POSITIVE_INFINITY : 0;
  }

  const euler = new THREE.Euler();
  function update(dt, elapsed, gapMeters = 0) {
    lastGap = gapMeters;
    const near = gapMeters > -40 && gapMeters < 140;
    group.visible = gapMeters > -70 && gapMeters < 420;
    if (!group.visible) return;

    if (goTimer > 0) {
      goTimer = Math.max(0, goTimer - dt);
      applyLights();
    }
    if (excitementTimer > 0) {
      excitementTimer -= dt;
      if (excitementTimer <= 0) excitement = 0.35;
    }
    if (waveTimer !== Number.POSITIVE_INFINITY && waveTimer > 0) {
      waveTimer -= dt;
      if (waveTimer <= 0) waving = false;
    }

    // Faisceaux balayant le ciel.
    beams.forEach((beam) => {
      beam.pivot.rotation.z = beam.side * 0.35 + Math.sin(elapsed * 0.6 + beam.phase) * 0.55;
      beam.pivot.rotation.x = Math.cos(elapsed * 0.45 + beam.phase) * 0.4;
    });

    if (!near) return; // le reste n'est perceptible que près de la ligne

    // Drapeaux.
    const wind = 0.16 + excitement * 0.05;
    flags.forEach((flag) => waveFlag(flag, elapsed, wind, 6.5));
    const marshalAmplitude = waving ? 0.32 : 0.06;
    waveFlag(marshalFlag, elapsed, marshalAmplitude, waving ? 13 : 5);
    arm.rotation.z = waving ? -0.95 + Math.sin(elapsed * 11) * 0.75 : -0.5 + Math.sin(elapsed * 1.6) * 0.04;
    arm.rotation.x = waving ? Math.cos(elapsed * 11) * 0.25 : 0;

    // Foule : sautille d'autant plus que le peloton approche.
    const bounceScale = Math.min(1.8, excitement + Math.max(0, 1 - Math.abs(gapMeters) / 90));
    const spectatorsToUpdate = spectators.length;
    for (let index = 0; index < spectatorsToUpdate; index += 1) {
      const spectator = spectators[index];
      const bounce = Math.max(0, Math.sin(elapsed * spectator.rate + spectator.phase)) * 0.26 * bounceScale;
      euler.set(0, (spectator.side < 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(elapsed * 1.3 + spectator.phase) * 0.25, 0);
      quaternion.setFromEuler(euler);
      matrix.compose(position.set(spectator.x, spectator.y + bounce, spectator.z), quaternion, scale.set(1, spectator.height + bounce * 0.3, 1));
      crowd.setMatrixAt(index, matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;

    // Flashs.
    const flashRate = 0.35 + excitement * 1.4;
    flashStates.forEach((flash, index) => {
      flash.timer -= dt;
      if (flash.timer <= 0 && flash.life <= 0) {
        const spectator = spectators[Math.floor(random() * spectators.length)];
        flash.x = spectator.x;
        flash.y = spectator.y + 1.1;
        flash.z = spectator.z;
        flash.life = 0.28;
        flash.timer = (0.6 + random() * 2.4) / flashRate;
      }
      let size = 0;
      if (flash.life > 0) {
        flash.life -= dt;
        size = Math.max(0, flash.life / 0.28);
        size = 0.6 + Math.sin(size * Math.PI) * 1.6;
        if (flash.life <= 0) size = 0;
      }
      quaternion.identity();
      matrix.compose(position.set(flash.x, flash.y, flash.z), quaternion, scale.set(size, size, 1));
      flashes.setMatrixAt(index, matrix);
    });
    flashes.instanceMatrix.needsUpdate = true;

    // Confettis.
    if (confetti.visible) {
      confettiTimer -= dt;
      if (confettiTimer <= 0) {
        confetti.visible = false;
      } else {
        for (let index = 0; index < confettiCount; index += 1) {
          confettiVelocity[index * 3 + 1] -= 4.5 * dt;
          confettiVelocity[index * 3] *= 0.985;
          confettiVelocity[index * 3 + 2] *= 0.985;
          confettiPositions[index * 3] += confettiVelocity[index * 3] * dt + Math.sin(elapsed * 5 + index) * 0.01;
          confettiPositions[index * 3 + 1] = Math.max(0.05, confettiPositions[index * 3 + 1] + confettiVelocity[index * 3 + 1] * dt);
          confettiPositions[index * 3 + 2] += confettiVelocity[index * 3 + 2] * dt;
          if (confettiPositions[index * 3 + 1] <= 0.06) confettiVelocity[index * 3 + 1] = 0;
        }
        confettiGeometry.attributes.position.needsUpdate = true;
        confettiMaterial.opacity = Math.min(1, confettiTimer / 1.5);
      }
    }
  }

  function dispose() {
    disposables.forEach((resource) => resource.dispose?.());
  }

  return {
    group,
    setLights,
    setBoard: (title, subtitle, color) => board.draw(title, subtitle, color),
    onCross,
    setFinalLap,
    celebrate,
    excite,
    update,
    dispose,
    get gap() { return lastGap; },
  };
}
