// Shuto Expressway Route 1 — le décor de la C1 都心環状線.
//
// La course de Tokyo se joue entièrement sur l'anneau intérieur réel de la
// Shuto : aucun trottoir, aucun piéton, mais un tablier de viaduc à treize
// mètres au-dessus de la ville, des murs antibruit, trois tunnels sous le
// palais impérial, une tranchée ouverte à 霞が関, des portiques verts à chaque
// échangeur et les repères qui font la légende de la route — la Tokyo Tower au
// ras du viaduc de 芝公園, le Rainbow Bridge vers la Wangan à 浜崎橋, les néons
// de 銀座 à gauche et les piles de l'ancienne rivière Tsukiji à 新富町.
//
// La géométrie suit `CITY_RUSH_SHUTO_C1` (cityRushRules.js) : chaque secteur
// porte son point kilométrique officiel, sa position sur le tour du jeu et son
// côté réel, si bien que l'on repasse exactement devant les mêmes panneaux à
// chaque tour, comme sur la vraie boucle de 14,8 km.
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_ROAD_HALF_WIDTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_SHUTO_C1,
  cityRushMinimapTrackShape,
} from './cityRushRules.js';
import { SignAtlas, drawNeonSignCell, drawShutoSignCell, makeCanvasTexture, seededRandom, hexToRgb } from './cityRushBuilder.js';
import {
  makeCityBelowTexture,
  makeExpresswayDeckTexture,
  makeSoundWallTexture,
  makeTunnelWallTexture,
  makeViaductTexture,
} from './cityRushTextures.js';
import { GATE_TRACK_POSITION, ROAD_TILE_LENGTH, START_ZONE_HALF, facadeBlock } from './cityRushStage.js';

const SCALE = CITY_RUSH_SCROLL_SCALE;
const LAP = CITY_RUSH_LAP_LENGTH;
const ROAD_HALF = CITY_RUSH_ROAD_HALF_WIDTH;
// Fenêtre construite par la boucle : la zone de départ (portique, tribunes,
// équipe de piste) reste à `cityRushStartLine`, on ne la recouvre pas.
const LOOP_START = START_ZONE_HALF + 2;
const LOOP_END = LAP - START_ZONE_HALF - 2;
// La route visible devant la caméra : 340 unités de monde, comme `makeRoad`.
const ROAD_LENGTH = 340;
// Dégagement caméra : la poursuite culmine à 6,7 m, tout ce qui enjambe la
// chaussée reste au-dessus de 7,4 m.
const CAMERA_CLEARANCE = 7.4;

const toZ = (trackMeters) => -trackMeters * SCALE;

/** Coupe transversale du tablier, dérivée de la direction artistique. */
function crossSection(cfg) {
  const deckHalf = cfg.deckHalfWidth;
  const barrierHeight = cfg.barrierHeight;
  return Object.freeze({
    deckHalf,
    barrierInner: ROAD_HALF + 0.2,
    barrierWidth: 0.55,
    barrierHeight,
    railY: barrierHeight + 0.28,
    serviceX: deckHalf - 2.0,
    wallX: deckHalf - 1.05,
    wallHeight: cfg.wallHeight,
    parapetX: deckHalf - 0.25,
    parapetHeight: cfg.parapetHeight,
    streetY: -cfg.streetDepth,
    tunnelCeiling: CAMERA_CLEARANCE + 2.2,
    signBeamY: CAMERA_CLEARANCE + 2.1,
    panelBottom: CAMERA_CLEARANCE + 0.15,
    mastHeight: 11.2,
    pierX: deckHalf + 1.1,
  });
}

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.05, flatShading: true, ...extra });
}

function unlit(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
}

/**
 * Matériaux propres à la voie rapide : béton du tablier, acier galvanisé des
 * glissières, parois de tunnel carrelées, panneaux translucides des murs
 * antibruit et verts officiels de la signalisation Shuto.
 */
export function createExpresswayMaterials(city, theme, random) {
  const cfg = theme.expressway;
  const tints = cfg.materials || {};
  const glow = theme.glow ?? 1;
  const viaductTexture = makeViaductTexture(theme, random);
  viaductTexture.repeat.set(6, 1);
  const tunnelTexture = makeTunnelWallTexture(theme, random);
  const soundWallTexture = makeSoundWallTexture(theme, random);
  soundWallTexture.repeat.set(1, 1);
  return {
    viaduct: new THREE.MeshStandardMaterial({ map: viaductTexture, roughness: 0.94, metalness: 0.03, flatShading: true }),
    deckConcrete: standard(tints.deckConcrete ?? 0x565c6a, { roughness: 0.93 }),
    barrierConcrete: standard(tints.concrete ?? 0x6a7180, { roughness: 0.9 }),
    parapet: standard(tints.parapet ?? 0x767d8b, { roughness: 0.92 }),
    steel: standard(tints.steel ?? 0x93a0ad, { metalness: 0.66, roughness: 0.36 }),
    galvanized: standard(tints.galvanized ?? 0xc0cad3, { metalness: 0.74, roughness: 0.3 }),
    darkSteel: standard(tints.darkSteel ?? 0x2b303c, { metalness: 0.52, roughness: 0.48 }),
    tunnelWall: new THREE.MeshStandardMaterial({ map: tunnelTexture, roughness: 0.72, metalness: 0.06, flatShading: true }),
    tunnelCeiling: standard(cfg.tunnel?.ceiling ?? 0x1d2029, { roughness: 0.96 }),
    tunnelPortal: standard(cfg.tunnel?.portal ?? 0x3a4050, { roughness: 0.9 }),
    soundWall: new THREE.MeshStandardMaterial({
      map: soundWallTexture, transparent: true, opacity: cfg.soundWall?.opacity ?? 0.55,
      roughness: 0.32, metalness: 0.16, side: THREE.DoubleSide, flatShading: true,
    }),
    signBacking: standard(cfg.signGreenDark ?? '#064a2c', { roughness: 0.7 }),
    sodium: unlit(cfg.tunnel?.sodium ?? 0xffb46b),
    led: unlit(cfg.tunnel?.led ?? 0xf2f7ff),
    reflector: unlit(0xfff2cc),
    reflectorRed: unlit(0xff4a3c),
    beacon: unlit(0xff3b30),
    exitGreen: unlit(0x3dff8a),
    palaceGround: standard(cfg.below?.palace ?? 0x0e2018, { roughness: 1 }),
    palaceWall: standard(0x4a4238, { roughness: 0.96 }),
    water: standard(0x0a1626, { roughness: 0.22, metalness: 0.55 }),
    asphaltBelow: standard(cfg.below?.ground ?? 0x0a0c16, { roughness: 1 }),
    lampGlow: unlit(0xfff0c8),
    lampCone: new THREE.MeshBasicMaterial({
      color: 0xffe2b0, transparent: true, opacity: theme.lampCone ?? 0.075,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, fog: false,
    }),
    accentCone: new THREE.MeshBasicMaterial({
      color: Number.parseInt(city.accent.slice(1), 16), transparent: true, opacity: theme.accentCone ?? 0.12,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, fog: false,
    }),
    accentStandard: standard(city.accent, { emissive: city.accent, emissiveIntensity: 0.3 * glow, metalness: 0.25 }),
    secondaryStandard: standard(city.secondary, { emissive: city.secondary, emissiveIntensity: 0.24 * glow, metalness: 0.25 }),
    // Peinture réglementaire de la Tokyo Tower (orange international + blanc),
    // fenêtres allumées des tours de Shiodome et vert des auvents ETC.
    towerOrange: standard(cfg.landmarks?.towerOrange ?? 0xe8622a, { roughness: 0.72, emissive: 0x6b2208, emissiveIntensity: 0.24 * glow }),
    towerWhite: standard(cfg.landmarks?.towerWhite ?? 0xf2ece0, { roughness: 0.7 }),
    windows: unlit(cfg.landmarks?.windows ?? 0xffd79a),
    tollGreen: standard(cfg.landmarks?.tollGreen ?? '#0b6b3f', { roughness: 0.6, emissive: '#0b6b3f', emissiveIntensity: 0.2 * glow }),
  };
}

/**
 * Atlas de signalisation : panneaux de portique (un par secteur), plaques de
 * tunnel, postes kilométriques, limite de vitesse, interdictions et panneaux
 * publicitaires scellés sur les murs antibruit.
 */
export function buildShutoSignAtlas(city, theme, route = CITY_RUSH_SHUTO_C1) {
  const cfg = theme.expressway;
  const atlas = new SignAtlas({ cellWidth: 384, cellHeight: 128, columns: 4 });
  const keys = new Map();
  const add = (key, entry) => {
    if (keys.has(key)) return keys.get(key);
    const index = atlas.add(entry);
    keys.set(key, index);
    return index;
  };

  for (const sector of route.sectors) {
    if (!sector.sign) continue;
    add(`gantry:${sector.id}`, {
      draw: drawShutoSignCell,
      badge: sector.sign.route || route.marker,
      text: sector.sign.lines?.[0] || sector.name,
      sub: sector.sign.lines?.[1] || sector.romaji,
      exits: sector.sign.exits,
      arrow: sector.sign.arrow,
      hazard: sector.sign.hazard,
      background: cfg.signGreen,
    });
    if (sector.tunnel) {
      add(`tunnel:${sector.id}`, {
        draw: drawShutoSignCell, variant: 'plate',
        text: sector.tunnel.name, sub: `${sector.tunnel.lengthM} m`,
        background: cfg.signWhite, textColor: '#141821', borderColor: '#8d94a3',
      });
    }
  }
  // Postes kilométriques : en 内回り les bornes décroissent de 14 à 0.
  for (let km = 0; km <= Math.round(route.lengthKm); km += 1) {
    add(`km:${km}`, {
      draw: drawShutoSignCell, variant: 'plate', text: String(km), sub: 'km',
      background: cfg.signGreen, textColor: cfg.signWhite, borderColor: cfg.signWhite,
    });
  }
  add(`limit:${route.speedLimit}`, { draw: drawShutoSignCell, variant: 'limit', text: String(route.speedLimit) });
  add('no-lane', {
    draw: drawShutoSignCell, variant: 'plate', text: '車線変更禁止', sub: 'NO LANE CHANGE',
    background: cfg.signWhite, textColor: '#141821', borderColor: '#c8382f',
  });
  add('hazmat', {
    draw: drawShutoSignCell, variant: 'plate', text: '危険物 通行禁止', sub: 'NO HAZMAT · TUNNEL',
    background: '#f2e7d2', textColor: '#8c2b1c', borderColor: '#8c2b1c',
  });
  add('origin', {
    draw: drawShutoSignCell, variant: 'plate', text: '日本橋 km 0', sub: '道路元標 · AH1',
    background: cfg.signWhite, textColor: '#141821', borderColor: '#8d94a3',
  });
  add('gate', {
    draw: drawShutoSignCell,
    badge: route.marker, text: route.sectors.find((sector) => sector.gate)?.name || theme.gate.text,
    sub: '3号渋谷線 · 東名',
    exits: ['24 霞が関出口', '飯倉 400 m'],
    arrow: '↗', background: cfg.signGreen,
  });
  add('direction', {
    draw: drawShutoSignCell, variant: 'plate', text: `${route.marker} ${route.direction}`, sub: route.directionRomaji,
    background: cfg.signGreen, textColor: cfg.signWhite, borderColor: cfg.signWhite,
  });
  (cfg.billboards || []).forEach((board, index) => {
    add(`ad:${index}`, { draw: drawNeonSignCell, text: board.text, color: board.color, background: 'rgba(8, 11, 26, .94)' });
  });

  const texture = atlas.build();
  return {
    material: new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide }),
    uv: (key) => atlas.uvFor(keys.get(key) ?? 0),
    has: (key) => keys.has(key),
    count: keys.size,
  };
}

/**
 * Convertit un intervalle de tour (fractions 0 → 1) en mètres de piste
 * exploitables, en ignorant la zone de départ et en gérant le passage par la
 * ligne d'arrivée.
 */
export function shutoTrackRanges(fromFraction, toFraction, lapLength = LAP) {
  const raw = [];
  const from = Number(fromFraction) || 0;
  const to = Number(toFraction) || 0;
  if (to > from) raw.push([from * lapLength, to * lapLength]);
  else {
    raw.push([from * lapLength, lapLength]);
    raw.push([0, to * lapLength]);
  }
  return raw
    .map(([a, b]) => [Math.max(a, LOOP_START), Math.min(b, LOOP_END)])
    .filter(([a, b]) => b - a > 1);
}

// ─── Plages de piste ────────────────────────────────────────────────────────
/** Complément d'une liste d'intervalles (en mètres de piste) dans la boucle. */
export function shutoOpenSegments(exclusions = []) {
  const sorted = [...exclusions].sort((a, b) => a[0] - b[0]);
  const segments = [];
  let cursor = LOOP_START;
  for (const [start, end] of sorted) {
    if (start > cursor) segments.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < LOOP_END) segments.push([cursor, LOOP_END]);
  return segments.filter(([a, b]) => b - a > 0.5);
}

/** Tous les intervalles couverts (tunnels) et en tranchée, en mètres de piste. */
function coveredRanges(sectors) {
  const ranges = [];
  for (const sector of sectors) {
    if (sector.kind !== 'tunnel' && sector.kind !== 'cut') continue;
    ranges.push(...shutoTrackRanges(sector.from, sector.to));
  }
  return ranges;
}

// ─── Tablier : chaussée, murets, glissières, parapets ────────────────────────
// Le muret et la glissière courent sur tout l'anneau (les tunnels les
// conservent) ; le parapet extérieur et le trottoir de service s'interrompent
// là où les parois de tunnel ou de tranchée prennent le relais.
function addDeck(batch, m, cs, cfg, exclusions, lite) {
  const fullLength = (LOOP_END - LOOP_START) * SCALE;
  const fullCenterZ = toZ((LOOP_START + LOOP_END) / 2);
  const openSegments = shutoOpenSegments(exclusions);
  for (const side of [-1, 1]) {
    const x = side * cs.barrierInner;
    // Muret béton type New Jersey.
    batch.box(m.barrierConcrete, [x + side * cs.barrierWidth / 2, cs.barrierHeight / 2, fullCenterZ], [cs.barrierWidth, cs.barrierHeight, fullLength]);
    // Liseré réfléchissant au sommet du muret.
    batch.box(m.reflector, [x + 0.02, cs.barrierHeight + 0.02, fullCenterZ], [0.07, 0.05, fullLength]);
    // Glissière métallique (W-beam) sur plots, comme sur toute la C1.
    batch.box(m.galvanized, [x + side * 0.06, cs.railY, fullCenterZ], [0.16, 0.34, fullLength]);
    batch.box(m.galvanized, [x + side * 0.06, cs.railY - 0.42, fullCenterZ], [0.1, 0.14, fullLength]);
    if (!lite) {
      for (let post = LOOP_START + 2; post < LOOP_END; post += 4) {
        batch.box(m.steel, [x + side * 0.16, cs.railY - 0.5, toZ(post)], [0.1, 1.0, 0.14]);
      }
      // Balises de délimitation : blanches à droite (sens de la course),
      // rouges à gauche (les trois voies qui viennent en face).
      for (let post = LOOP_START + 6; post < LOOP_END; post += 12) {
        batch.box(side > 0 ? m.reflector : m.reflectorRed, [x + side * 0.02, cs.barrierHeight + 0.34, toZ(post)], [0.05, 0.3, 0.16]);
        batch.box(m.darkSteel, [x + side * 0.02, cs.barrierHeight + 0.14, toZ(post)], [0.05, 0.14, 0.1]);
      }
    }
    // Trottoir de service et parapet extérieur, hors tunnels et tranchée.
    for (const [start, end] of openSegments) {
      const length = (end - start) * SCALE;
      const centerZ = toZ((start + end) / 2);
      batch.box(m.deckConcrete, [side * cs.serviceX, 0.04, centerZ], [cs.deckHalf - ROAD_HALF - cs.barrierWidth - 1.2, 0.16, length]);
      batch.box(m.viaduct, [side * cs.parapetX, cs.parapetHeight / 2, centerZ], [0.5, cs.parapetHeight, length]);
      batch.box(m.galvanized, [side * cs.parapetX, cs.parapetHeight + 0.06, centerZ], [0.56, 0.1, length]);
    }
  }
  // Dalle du tablier et poutre de rive : rien ne transparaît de la rue.
  batch.box(m.viaduct, [0, -0.45, fullCenterZ], [cs.deckHalf * 2, 0.8, fullLength]);
  batch.box(m.deckConcrete, [0, -1.05, fullCenterZ], [cs.deckHalf * 2 - 1.6, 0.5, fullLength]);
}

// ─── Murs antibruit ─────────────────────────────────────────────────────────
// Les panneaux translucides verts protègent Azabu, 一ノ橋 et 新富町 : la vraie
// C1 en est couverte dès qu'elle passe entre des immeubles d'habitation.
function addSoundWalls(batch, m, cs, cfg, sectors, lite) {
  if (lite) return;
  for (const sector of sectors) {
    if (!sector.wall) continue;
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      const length = (end - start) * SCALE;
      const centerZ = toZ((start + end) / 2);
      for (const side of [-1, 1]) {
        const x = side * cs.wallX;
        batch.plane(m.soundWall, [x, cs.wallHeight / 2 + 0.1, centerZ], length, cs.wallHeight, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { repeat: [Math.max(1, Math.round(length / 3)), 1] });
        batch.box(m.steel, [x, cs.wallHeight + 0.2, centerZ], [0.18, 0.22, length]);
        batch.box(m.darkSteel, [x, 0.1, centerZ], [0.3, 0.2, length]);
        for (let post = start + 1.5; post < end; post += 3) {
          batch.box(m.steel, [x, cs.wallHeight / 2, toZ(post)], [0.22, cs.wallHeight + 0.2, 0.22]);
        }
      }
    }
  }
}

// ─── La ville treize mètres plus bas ────────────────────────────────────────
function addCityBelow(batch, m, city, theme, cs, cfg, sectors, random, lite) {
  const facades = m.facades;
  const floorHeight = theme.facade.floor;
  const streetY = cs.streetY;
  // Îlots bas sous le viaduc, de part et d'autre, avec leurs toits techniques.
  let cursor = LOOP_START + 4;
  while (cursor < LOOP_END - 10) {
    const depth = 8 + Math.floor(random() * 4) * 3;
    for (const side of [-1, 1]) {
      const innerX = side * (cs.deckHalf + 4.5);
      const height = 5 + random() * 7;
      const tint = hexToRgb(city.buildingColors[Math.floor(random() * city.buildingColors.length)]).map((channel) => Math.min(1, channel * (0.5 + random() * 0.3)));
      facadeBlock(batch, facades[Math.floor(random() * facades.length)], side, innerX, streetY, toZ(cursor + depth / 2), depth * SCALE, height, 7 + random() * 5, tint, floorHeight, random, { skipBack: true });
      batch.box(m.deckConcrete, [innerX + side * 3.5, streetY + height + 0.2, toZ(cursor + depth / 2)], [7, 0.3, depth * SCALE]);
      if (random() < 0.5) {
        batch.box(m.darkSteel, [innerX + side * 3, streetY + height + 0.9, toZ(cursor + depth / 2 + 2)], [1.6, 1.2, 1.6]);
        batch.box(random() < 0.4 ? m.sodium : m.led, [innerX + side * 3, streetY + height + 1.55, toZ(cursor + depth / 2 + 2)], [0.3, 0.12, 0.3]);
      }
    }
    cursor += depth + 3 + random() * 6;
  }
  // Tours qui remontent au-dessus du tablier : Shiodome, Ginza, Toranomon,
  // Hamamatsucho. On les place du côté extérieur de l'anneau (la ville) et
  // jamais du côté du palais impérial.
  const towerSectors = sectors.filter((sector) => ['junction', 'neon', 'origin', 'viaduct', 'pillars'].includes(sector.kind));
  for (const sector of towerSectors) {
    if (sector.palace) continue;
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      let position = start + 8;
      while (position < end - 12) {
        const depth = 10 + random() * 8;
        const side = sector.side ?? 1;
        const innerX = side * (cfg.towerBaseX + random() * 8);
        const height = 26 + random() * 30 + streetY;
        const tint = hexToRgb(city.buildingColors[Math.floor(random() * city.buildingColors.length)]).map((channel) => Math.min(1, channel * (0.72 + random() * 0.4)));
        facadeBlock(batch, facades[Math.floor(random() * facades.length)], side, innerX, streetY, toZ(position + depth / 2), depth * SCALE, height, 9 + random() * 7, tint, floorHeight, random, { skipBack: true, skipSides: random() < 0.5 });
        // Toiture technique, balise aviation et couronne lumineuse.
        batch.box(m.deckConcrete, [innerX + side * 4.5, streetY + height + 0.3, toZ(position + depth / 2)], [9, 0.5, depth * SCALE]);
        if (height > 24 && !lite) {
          batch.box(m.darkSteel, [innerX + side * 4.5, streetY + height + 2.2, toZ(position + depth / 2)], [0.3, 3.4, 0.3]);
          batch.box(m.beacon, [innerX + side * 4.5, streetY + height + 4, toZ(position + depth / 2)], [0.34, 0.34, 0.34]);
        }
        position += depth + 6 + random() * 10;
      }
    }
  }
}

// ─── Le palais impérial, toujours à l'intérieur de l'anneau ─────────────────
// En 内回り le palais reste à gauche : douves, murs de pierre, pins et les
// toitures sombres de Kitanomaru. Rien ne dépasse le tablier.
function addImperialPalace(batch, m, cs, sectors, random, lite) {
  const palaceSectors = sectors.filter((sector) => sector.palace);
  for (const sector of palaceSectors) {
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      const length = (end - start) * SCALE;
      const centerZ = toZ((start + end) / 2);
      const side = -1;
      const wallX = side * (cs.deckHalf + 5.5);
      // Mur de pierre des douves, puis l'eau et la forêt.
      batch.box(m.palaceWall, [wallX, cs.streetY + 3.2, centerZ], [1.4, 6.4, length]);
      batch.box(m.palaceWall, [wallX + side * 0.8, cs.streetY + 6.5, centerZ], [1.8, 0.3, length]);
      batch.box(m.water, [wallX + side * 5.5, cs.streetY + 0.2, centerZ], [9, 0.3, length]);
      batch.box(m.palaceGround, [wallX + side * 18, cs.streetY + 0.6, centerZ], [28, 1.2, length]);
      if (lite) continue;
      // Pins noirs taillés et lanternes de pierre.
      for (let position = start + 6; position < end - 4; position += 7 + random() * 5) {
        const x = wallX + side * (9 + random() * 14);
        const trunkHeight = 2.4 + random() * 1.6;
        batch.cylinder(m.darkSteel, [x, cs.streetY + 1.2 + trunkHeight / 2, toZ(position)], 0.18, 0.24, trunkHeight, 5);
        for (const [offset, radius] of [[0, 2.1], [0.9, 1.5], [-0.8, 1.3]]) {
          batch.cone(m.palaceGround, [x + offset * 0.4, cs.streetY + 1.2 + trunkHeight + 0.5, toZ(position + offset)], radius, 1.5, 6);
        }
        if (random() < 0.25) {
          batch.box(m.palaceWall, [x - side * 3, cs.streetY + 2.0, toZ(position + 2)], [0.7, 1.6, 0.7]);
          batch.box(m.palaceWall, [x - side * 3, cs.streetY + 3.0, toZ(position + 2)], [1.1, 0.35, 1.1]);
          batch.sphere(m.sodium, [x - side * 3, cs.streetY + 3.4, toZ(position + 2)], 0.18, 5);
        }
      }
      // Les toitures de Kitanomaru, basses et sombres, au-delà de la forêt.
      for (let position = start + 20; position < end - 20; position += 42 + random() * 30) {
        const x = wallX + side * 26;
        batch.box(m.palaceGround, [x, cs.streetY + 2.6, toZ(position)], [12, 3.4, 9]);
        batch.box(m.darkSteel, [x, cs.streetY + 4.8, toZ(position)], [13.4, 0.9, 10.4]);
        batch.box(m.darkSteel, [x, cs.streetY + 5.6, toZ(position)], [9, 0.8, 7]);
      }
    }
  }
}

// ─── Rivières et ponts franchis par l'anneau ────────────────────────────────
// 日本橋川, 神田川 et l'ancienne 築地川 passent sous la C1 : de l'eau noire,
// des quais et les poutres du pont routier qui reste en dessous.
function addRivers(batch, m, cs, sectors, random, lite) {
  for (const sector of sectors) {
    if (!sector.river && !sector.pillars) continue;
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      const length = (end - start) * SCALE;
      const centerZ = toZ((start + end) / 2);
      const side = sector.side ?? 1;
      const riverX = side * (cs.deckHalf + 12);
      batch.box(m.water, [riverX, cs.streetY + 0.4, centerZ], [16, 0.4, length]);
      for (const quay of [-1, 1]) {
        batch.box(m.deckConcrete, [riverX + quay * 9.5, cs.streetY + 1.2, centerZ], [3, 1.6, length]);
        if (!lite) {
          for (let position = start + 4; position < end - 2; position += 11) {
            batch.box(m.sodium, [riverX + quay * 8.4, cs.streetY + 2.6, toZ(position)], [0.3, 0.16, 0.3]);
            batch.box(m.darkSteel, [riverX + quay * 8.4, cs.streetY + 1.9, toZ(position)], [0.14, 1.4, 0.14]);
          }
        }
      }
      // Le pont de surface, sous le tablier : piles et garde-corps.
      if (!lite) {
        batch.box(m.viaduct, [riverX, cs.streetY + 4.2, centerZ], [22, 0.6, Math.min(length, 9)]);
        for (let position = start + 2; position < end - 2; position += 6) {
          batch.box(m.viaduct, [riverX, cs.streetY + 2.2, toZ(position)], [1.1, 3.6, 1.1]);
        }
        for (const quay of [-1, 1]) batch.box(m.galvanized, [riverX + quay * 10.6, cs.streetY + 5.0, centerZ], [0.16, 0.9, Math.min(length, 9)]);
      }
      // 新富町 : les piles de l'ancienne rivière Tsukiji montent entre les
      // voies, si près de la chaussée qu'elles obligent aux lignes jaunes.
      if (sector.pillars) {
        for (let position = start + 5; position < end - 3; position += 12) {
          for (const side2 of [-1, 1]) {
            const x = side2 * (ROAD_HALF + 1.35);
            const drop = Math.abs(cs.streetY) + 1.2;
            batch.box(m.viaduct, [x, -drop / 2, toZ(position)], [0.9, drop, 1.5]);
            batch.box(m.deckConcrete, [x, -1.25, toZ(position)], [1.6, 0.7, 2.4]);
            batch.box(m.reflectorRed, [x, 0.06, toZ(position)], [0.95, 0.1, 1.55]);
          }
        }
      }
    }
  }
}

// ─── Portiques de signalisation ─────────────────────────────────────────────
// Un portique vert par secteur : c'est le rythme réel de la C1, où chaque
// échangeur et chaque sortie est annoncé à 800 m, 400 m puis sur place.
function addGantry(batch, m, cs, cfg, atlas, trackMeters, sector, { advance = false, major = false } = {}) {
  const z = toZ(trackMeters);
  const beamY = cs.signBeamY;
  for (const side of [-1, 1]) {
    const x = side * (cs.deckHalf + 0.3);
    batch.box(m.darkSteel, [x, beamY / 2, z], [0.44, beamY, 0.44]);
    batch.box(m.deckConcrete, [x, 0.3, z], [1.0, 0.6, 1.0]);
    if (major) batch.box(m.steel, [x + side * 0.5, beamY - 1.6, z], [0.5, 3.2, 0.16], [0, 0, side * 0.3]);
  }
  // Poutre treillis au-dessus de la chaussée (dégagement caméra : 9,5 m).
  batch.box(m.darkSteel, [0, beamY, z - 0.4], [(cs.deckHalf + 0.5) * 2, 0.3, 0.3]);
  batch.box(m.darkSteel, [0, beamY, z + 0.4], [(cs.deckHalf + 0.5) * 2, 0.3, 0.3]);
  batch.box(m.darkSteel, [0, beamY + 0.9, z - 0.4], [(cs.deckHalf + 0.5) * 2, 0.2, 0.2]);
  batch.box(m.darkSteel, [0, beamY + 0.9, z + 0.4], [(cs.deckHalf + 0.5) * 2, 0.2, 0.2]);
  for (let truss = -10; truss <= 10; truss += 2) {
    batch.box(m.steel, [truss, beamY + 0.45, z + 0.4], [0.09, 1.0, 0.09]);
    batch.box(m.steel, [truss, beamY + 0.45, z - 0.4], [0.09, 1.0, 0.09]);
    if (truss < 10) {
      batch.box(m.steel, [truss + 1, beamY + 0.45, z + 0.4], [0.07, 1.4, 0.07], [0, 0, (truss / 2) % 2 ? 0.78 : -0.78]);
      batch.box(m.steel, [truss + 1, beamY + 0.45, z - 0.4], [0.07, 1.4, 0.07], [0, 0, (truss / 2) % 2 ? -0.78 : 0.78]);
    }
  }
  // Panneau principal au-dessus des trois voies de course (x > 0).
  const key = advance ? `gantry:${sector.id}` : `gantry:${sector.id}`;
  const panelWidth = advance ? 6.2 : 8.6;
  const panelHeight = advance ? 1.5 : 1.9;
  const panelY = beamY - 0.25 - panelHeight / 2;
  batch.box(m.signBacking, [1.7, panelY, z], [panelWidth + 0.2, panelHeight + 0.2, 0.24]);
  batch.plane(m.signs, [1.7, panelY, z + 0.14], panelWidth, panelHeight, null, { uv: atlas.uv(key) });
  batch.plane(m.signs, [1.7, panelY, z - 0.14], panelWidth, panelHeight, [0, Math.PI, 0], { uv: atlas.uv(key) });
  // Plaque de sens (内回り) du côté du trafic venant en face.
  batch.box(m.signBacking, [-4.6, beamY - 0.9, z], [2.8, 1.1, 0.2]);
  batch.plane(m.signs, [-4.6, beamY - 0.9, z + 0.12], 2.6, 1.0, null, { uv: atlas.uv('direction') });
  batch.plane(m.signs, [-4.6, beamY - 0.9, z - 0.12], 2.6, 1.0, [0, Math.PI, 0], { uv: atlas.uv('direction') });
  // Projecteurs du panneau, comme sur les portiques éclairés par le haut.
  for (const lx of [-1.6, 1.7, 5.0]) {
    batch.box(m.darkSteel, [lx, beamY - 0.16, z + 0.5], [0.3, 0.24, 0.5], [0.5, 0, 0]);
    batch.box(m.led, [lx, beamY - 0.3, z + 0.72], [0.26, 0.08, 0.1]);
  }
  batch.plane(m.accentCone, [1.7, panelY + panelHeight / 2 - 0.1, z + 0.5], panelWidth, 1.6, [0.42, 0, 0]);
}

function addGantries(batch, m, cs, cfg, atlas, sectors, lite) {
  const placed = [];
  let lastPosition = -Infinity;
  for (const sector of sectors) {
    // Les tunnels et la tranchée n'ont pas de portique : leurs panneaux sont
    // fixés aux parois et aux portails.
    if (!sector.sign || sector.kind === 'tunnel') continue;
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      const position = Math.min(start + 7, end - 4);
      if (position - lastPosition < 22 || position < LOOP_START + 4) continue;
      lastPosition = position;
      placed.push(position);
      addGantry(batch, m, cs, cfg, atlas, position, sector, { major: sector.kind === 'junction' || sector.gate });
    }
  }
  return placed;
}

/** Distance la plus courte entre deux positions de piste, en tenant compte du tour. */
function trackDistance(a, b) {
  const delta = Math.abs(a - b) % LAP;
  return Math.min(delta, LAP - delta);
}

/**
 * Choisit des emplacements libres pour les accessoires animés : ni dans la zone
 * de départ, ni sous un portique, ni sur la porte de mi-tour.
 */
function pickSpots(candidates, blocked, count, minGap = 12) {
  const chosen = [];
  for (const candidate of candidates) {
    if (chosen.length >= count) break;
    if (candidate < LOOP_START + 8 || candidate > LOOP_END - 8) continue;
    if (blocked.some((position) => trackDistance(candidate, position) < minGap)) continue;
    if (chosen.some((position) => trackDistance(candidate, position) < minGap * 3)) continue;
    chosen.push(candidate);
  }
  return chosen;
}

// ─── Échangeurs : les bretelles passent au-dessus de l'anneau ────────────────
// La C1 est le point de départ de toutes les lignes radiales de la Shuto : à
// chaque JCT, une ou deux bretelles enjambent le tablier et plongent vers la
// ville, avec leur propre panneau vert et leur balise aviation.
function addJunctionRamps(batch, m, cs, cfg, atlas, sector, random, lite) {
  const ramps = ['origin', 'junction'].includes(sector.kind) || sector.gate ? 2 : 1;
  for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
    for (let ramp = 0; ramp < ramps; ramp += 1) {
      const position = start + 12 + ramp * 22 + random() * 6;
      if (position > end - 8 || position > LOOP_END - 10) continue;
      const z = toZ(position);
      const yaw = (ramp % 2 ? 1 : -1) * (0.22 + random() * 0.16);
      const deckY = 12.2 + ramp * 1.7 + random() * 0.6;
      const halfSpan = 19;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      // Repère de la bretelle : un point local (lx, lz) devient
      // (lx·cos + lz·sin, deckY, z − lx·sin + lz·cos).
      const at = (lx, lz) => [lx * cos + lz * sin, deckY, z - lx * sin + lz * cos];
      batch.box(m.viaduct, at(0, 0), [halfSpan * 2, 0.7, 5.2], [0.035 * (ramp % 2 ? 1 : -1), yaw, 0]);
      for (const side of [-1, 1]) {
        batch.box(m.galvanized, at(0, side * 2.5), [halfSpan * 2, 0.14, 0.14], [0, yaw, 0]);
        batch.box(m.galvanized, at(0, side * 2.5), [halfSpan * 2, 0.5, 0.1], [0, yaw, 0]);
        if (lite) continue;
        for (let post = -halfSpan + 2; post < halfSpan; post += 3.4) {
          batch.box(m.steel, at(post, side * 2.5), [0.1, 0.9, 0.1], [0, yaw, 0]);
        }
      }
      // Panneau vert de la bretelle, tourné vers ses propres usagers.
      const sign = at(-7.5, 0);
      batch.box(m.signBacking, [sign[0], deckY + 2.2, sign[2]], [5.2, 1.3, 0.22], [0, yaw, 0]);
      batch.plane(m.signs, [sign[0] + 0.13 * cos, deckY + 2.2, sign[2] - 0.13 * sin], 5.0, 1.2, [0, yaw, 0], { uv: atlas.uv(`gantry:${sector.id}`) });
      if (lite) continue;
      // Piles : elles descendent jusqu'à la rue, hors du tablier principal.
      // Près de la ligne d'arrivée, les tribunes du départ masquent le pied de
      // la bretelle : on ne pose alors que le tablier.
      const nearStart = position < LOOP_START + 12 || position > LOOP_END - 12;
      for (const lx of [-halfSpan + 2.5, halfSpan - 2.5]) {
        const pier = at(lx, 0);
        if (nearStart || Math.abs(pier[0]) < cs.deckHalf + 6) continue;
        const drop = deckY - cs.streetY;
        batch.box(m.viaduct, [pier[0], deckY - drop / 2, pier[2]], [1.3, drop, 1.7]);
        batch.box(m.deckConcrete, [pier[0], deckY - 0.75, pier[2]], [2.3, 0.9, 2.8]);
        batch.box(m.deckConcrete, [pier[0], cs.streetY + 0.3, pier[2]], [2.6, 0.6, 3.1]);
      }
      // Balise aviation au sommet de la bretelle.
      const beacon = at(halfSpan - 1.2, 0);
      batch.box(m.beacon, [beacon[0], deckY + 1.1, beacon[2]], [0.3, 0.3, 0.3]);
    }
  }
}

// ─── Tunnels ────────────────────────────────────────────────────────────────
// 北の丸 (700 m), 千代田 (1 900 m, le plus long du tour) et 汐留 (700 m) :
// parois carrelées, bandeaux sodium ou LED, niches de secours, sorties de
// sécurité tous les cent mètres et portail avec plaque de longueur — plus
// l'interdiction des matières dangereuses, comme dans le vrai 千代田トンネル.
function addTunnelPortal(batch, m, cs, atlas, sector, trackMeters, { exit = false } = {}) {
  const z = toZ(trackMeters);
  const top = cs.tunnelCeiling + 1.5;
  for (const side of [-1, 1]) {
    const x = side * (cs.deckHalf + 0.8);
    batch.box(m.tunnelPortal, [x, top / 2, z], [1.4, top, 1.5]);
    batch.box(m.deckConcrete, [x, 0.25, z], [2.2, 0.5, 2.2]);
    // Chevrons rouge et blanc du portail.
    for (let stripe = 0; stripe < 5; stripe += 1) {
      batch.box(stripe % 2 ? m.reflector : m.reflectorRed, [x - side * 0.72, 1.1 + stripe * 1.5, z], [0.06, 1.1, 1.4]);
    }
  }
  batch.box(m.tunnelPortal, [0, top + 0.5, z], [(cs.deckHalf + 1.6) * 2, 1.6, 1.4]);
  batch.box(m.darkSteel, [0, top + 1.5, z], [(cs.deckHalf + 1.9) * 2, 0.5, 1.8]);
  // Plaque de tunnel (nom + longueur) côté arrivée et côté sortie.
  const plateKey = `tunnel:${sector.id}`;
  for (const face of [-1, 1]) {
    batch.box(m.signBacking, [0, top + 2.7, z + face * 0.2], [7.4, 1.5, 0.3]);
    if (atlas.has(plateKey)) {
      batch.plane(m.signs, [0, top + 2.7, z + face * 0.36], 7.2, 1.4, face > 0 ? null : [0, Math.PI, 0], { uv: atlas.uv(plateKey) });
    }
  }
  // Interdiction des matières dangereuses et limite rappelée au portail.
  if (atlas.has('hazmat')) {
    batch.box(m.signBacking, [-(cs.deckHalf + 1.9), 3.4, z + 0.9], [2.6, 1.0, 0.16]);
    batch.plane(m.signs, [-(cs.deckHalf + 1.9), 3.4, z + 1.0], 2.4, 0.9, null, { uv: atlas.uv('hazmat') });
  }
  if (atlas.has('limit:50')) {
    batch.box(m.darkSteel, [cs.deckHalf + 1.9, 2.2, z + 0.9], [0.12, 4.4, 0.12]);
    batch.plane(m.signs, [cs.deckHalf + 1.9, 4.0, z + 0.98], 1.3, 1.3, null, { uv: atlas.uv('limit:50') });
    batch.plane(m.signs, [cs.deckHalf + 1.9, 4.0, z + 0.82], 1.3, 1.3, [0, Math.PI, 0], { uv: atlas.uv('limit:50') });
  }
  // Rideau de lumière à l'entrée : la bouche du tunnel accroche le regard.
  if (!exit) {
    batch.plane(m.accentCone, [0, cs.tunnelCeiling / 2, z + 0.5], (cs.deckHalf + 0.6) * 2, cs.tunnelCeiling, null);
  }
  batch.box(m.beacon, [0, top + 1.9, z], [0.34, 0.34, 0.34]);
}

function addTunnel(batch, m, cs, cfg, atlas, sector, random, lite) {
  const lightMaterial = sector.tunnel?.lights === 'led' ? m.led : m.sodium;
  for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
    const length = (end - start) * SCALE;
    const centerZ = toZ((start + end) / 2);
    const wallX = cs.deckHalf + 0.1;
    const ceilingY = cs.tunnelCeiling;
    for (const side of [-1, 1]) {
      // Paroi carrelée côté chaussée, masse de béton derrière.
      batch.plane(m.tunnelWall, [side * wallX, ceilingY / 2, centerZ], length, ceilingY, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { repeat: [Math.max(1, Math.round(length / 7)), 2] });
      batch.box(m.tunnelCeiling, [side * (wallX + 0.45), ceilingY / 2, centerZ], [0.9, ceilingY, length]);
      batch.box(m.tunnelPortal, [side * (wallX + 0.9), ceilingY + 0.35, centerZ], [0.5, 0.7, length]);
    }
    // Voûte : dalle pleine et corniche longitudinale.
    batch.box(m.tunnelCeiling, [0, ceilingY + 0.3, centerZ], [(wallX + 1.2) * 2, 0.6, length]);
    batch.box(m.darkSteel, [0, ceilingY - 0.12, centerZ], [(wallX + 0.4) * 2, 0.24, length]);
    if (!lite) {
      // Bandeaux lumineux au plafond, tous les six mètres.
      for (let position = start + 3; position < end - 2; position += 6) {
        for (const x of [-3.5, 3.5]) batch.box(lightMaterial, [x, ceilingY - 0.18, toZ(position)], [1.5, 0.14, 0.4]);
      }
      // Luminaires muraux et leur halo, tous les neuf mètres.
      for (let position = start + 5; position < end - 3; position += 9) {
        for (const side of [-1, 1]) {
          batch.box(m.darkSteel, [side * (wallX - 0.22), 7.5, toZ(position)], [0.44, 0.2, 0.5]);
          batch.box(lightMaterial, [side * (wallX - 0.4), 7.36, toZ(position)], [0.3, 0.1, 0.4]);
          batch.cone(m.lampCone, [side * (wallX - 1.6), 4.4, toZ(position)], 1.9, 6.0, 8, [0, 0, side * Math.PI / 2]);
        }
      }
      // Niches de sécurité, extincteurs et issues de secours.
      for (let position = start + 12; position < end - 6; position += 24) {
        for (const side of [-1, 1]) {
          batch.box(m.darkSteel, [side * (wallX - 0.3), 1.6, toZ(position)], [0.6, 2.2, 1.6]);
          batch.box(m.reflectorRed, [side * (wallX - 0.62), 1.9, toZ(position)], [0.06, 0.5, 0.5]);
          batch.box(m.exitGreen, [side * (wallX - 0.62), 3.0, toZ(position)], [0.06, 0.42, 1.0]);
          batch.cone(m.lampCone, [side * (wallX - 1.2), 2.4, toZ(position)], 0.8, 1.6, 6, [0, 0, side * Math.PI / 2]);
        }
      }
      // Chemin de câbles et caniveau central.
      batch.box(m.darkSteel, [0, 0.02, centerZ], [0.6, 0.05, length]);
      for (const side of [-1, 1]) batch.box(m.darkSteel, [side * (wallX - 0.5), ceilingY - 1.1, centerZ], [0.4, 0.3, length]);
    }
    // Branchement souterrain : à 三宅坂, la 4号新宿線 plonge sous l'anneau.
    if (sector.tunnel?.junction && !lite) {
      const junctionTrack = start + (end - start) * 0.55;
      const z = toZ(junctionTrack);
      for (const side of [-1, 1]) {
        batch.box(m.viaduct, [side * (wallX + 2.4), 5.4, z], [3.4, 10.8, 6.4]);
        batch.box(m.sodium, [side * (wallX + 0.9), 6.2, z], [0.1, 1.6, 4.4]);
        batch.box(m.tunnelCeiling, [side * (wallX + 1.4), 9.4, z], [4.4, 0.6, 6.4], [0, 0, side * 0.16]);
      }
      batch.box(m.signBacking, [0, ceilingY - 1.4, z + 2.4], [4.4, 1.0, 0.2]);
      batch.plane(m.signs, [0, ceilingY - 1.4, z + 2.52], 4.2, 0.9, null, { uv: atlas.uv('direction') });
    }
    addTunnelPortal(batch, m, cs, atlas, sector, start);
    addTunnelPortal(batch, m, cs, atlas, sector, end, { exit: true });
  }
}

// ─── Tranchée ouverte de 霞が関 ─────────────────────────────────────────────
// Entre 三宅坂 et 谷町, la C1 plonge sous le niveau des rues : parois de six
// mètres, rues et immeubles au-dessus, et deux ponts qui enjambent la tranchée.
function addCut(batch, m, city, theme, cs, cfg, atlas, sector, random, lite) {
  for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
    const length = (end - start) * SCALE;
    const centerZ = toZ((start + end) / 2);
    const wallX = cs.deckHalf + 0.6;
    const wallTop = 6.4;
    for (const side of [-1, 1]) {
      batch.plane(m.viaduct, [side * wallX, wallTop / 2, centerZ], length, wallTop, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { repeat: [Math.max(1, Math.round(length / 6)), 1] });
      batch.box(m.deckConcrete, [side * (wallX + 0.5), wallTop / 2, centerZ], [1.0, wallTop, length]);
      batch.box(m.galvanized, [side * wallX, wallTop + 0.1, centerZ], [0.2, 0.3, length]);
      // Le sol des rues remonte au niveau de la crête de la paroi.
      batch.box(m.asphaltBelow, [side * (wallX + 8.5), wallTop - 0.2, centerZ], [16, 0.5, length]);
      if (lite) continue;
      // Immeubles posés sur la dalle haute, de part et d'autre de la tranchée.
      let position = start + 8;
      while (position < end - 12) {
        const depth = 9 + random() * 5;
        const height = 9 + random() * 16;
        const tint = hexToRgb(city.buildingColors[Math.floor(random() * city.buildingColors.length)]).map((channel) => Math.min(1, channel * (0.7 + random() * 0.4)));
        facadeBlock(batch, m.facades[Math.floor(random() * m.facades.length)], side, side * (wallX + 1.4), wallTop, toZ(position + depth / 2), depth * SCALE, height, 8 + random() * 5, tint, theme.facade.floor, random, { skipBack: true });
        batch.box(m.deckConcrete, [side * (wallX + 5.4), wallTop + height + 0.25, toZ(position + depth / 2)], [8, 0.4, depth * SCALE]);
        position += depth + 5 + random() * 9;
      }
      // Lampadaires de la rue haute.
      for (let position2 = start + 10; position2 < end - 6; position2 += 22) {
        batch.box(m.darkSteel, [side * (wallX + 1.6), wallTop + 2.6, toZ(position2)], [0.14, 5.2, 0.14]);
        batch.box(m.sodium, [side * (wallX + 0.9), wallTop + 5.1, toZ(position2)], [0.7, 0.16, 0.3]);
      }
    }
    // Ponts de surface qui traversent la tranchée (dégagement caméra : 8,6 m).
    if (!lite) {
      const bridges = Math.max(1, Math.round((end - start) / 45));
      for (let index = 0; index < bridges; index += 1) {
        const position = start + ((index + 0.5) * (end - start)) / bridges;
        const z = toZ(position);
        batch.box(m.deckConcrete, [0, 8.6, z], [(wallX + 17) * 2, 0.7, 6.4]);
        for (const side of [-1, 1]) {
          batch.box(m.galvanized, [side * (wallX + 8), 9.3, z], [17, 0.9, 0.16]);
          batch.box(m.asphaltBelow, [0, 9.02, z + side * 2.4], [(wallX + 16) * 2, 0.06, 1.4]);
          for (let post = -wallX - 14; post < wallX + 14; post += 3.6) {
            batch.box(m.steel, [post, 9.1, z + side * 3.1], [0.1, 0.9, 0.1]);
          }
        }
        batch.box(m.sodium, [0, 9.6, z], [0.8, 0.14, 0.4]);
        batch.box(m.deckConcrete, [0, 4.3, z], [(wallX + 1.2) * 2, 0.5, 0.6]);
      }
    }
  }
}

// ─── Piles du viaduc ────────────────────────────────────────────────────────
// Treize mètres plus bas, la forêt de piles qui fait le caractère de la C1 :
// fûts simples, doubles ou portiques, jamais sous les tunnels ni la tranchée.
function addViaduct(batch, m, cs, exclusions, lite) {
  const pierX = cs.deckHalf + 1.1;
  const drop = Math.abs(cs.streetY) + 1;
  const open = shutoOpenSegments(exclusions);
  for (const [start, end] of open) {
    for (let position = start + 8; position < end - 6; position += 26) {
      const z = toZ(position);
      const twin = (Math.round(position) % 52) < 26;
      for (const side of [-1, 1]) {
        const x = side * pierX;
        batch.box(m.viaduct, [x, -drop / 2 - 0.4, z], [1.5, drop, 1.7]);
        batch.box(m.deckConcrete, [x, -1.3, z], [2.4, 0.7, 2.6]);
        batch.box(m.deckConcrete, [x, cs.streetY + 0.35, z], [2.9, 0.7, 3.2]);
        if (!twin) batch.box(m.viaduct, [x + side * 1.8, -drop / 2 - 0.4, z], [1.2, drop, 1.4]);
      }
      if (lite) continue;
      // Portique : traverse sous le tablier et contreventement en croix.
      if (twin) {
        batch.box(m.viaduct, [0, -2.2, z], [pierX * 2 + 1.5, 1.1, 1.3]);
        batch.box(m.steel, [0, -6.5, z], [0.3, 7.6, 0.3], [0, 0, 0.34]);
        batch.box(m.steel, [0, -6.5, z], [0.3, 7.6, 0.3], [0, 0, -0.34]);
      }
      // Échelle de maintenance et numérotation de la pile.
      batch.box(m.darkSteel, [pierX + 0.8, -5.4, z], [0.06, 6.4, 0.4]);
      batch.box(m.reflector, [-pierX - 0.82, -7.2, z], [0.05, 0.3, 0.3]);
    }
  }
}

// ─── Péage ETC de 宝町 ──────────────────────────────────────────────────────
// La C1 n'a pas de barrière en ligne, mais chaque sortie a son péage : celui
// de 宝町 descend à droite avec son portique ETC vert et ses auvents.
function addTollPlaza(batch, m, cs, atlas, trackMeters, side, lite) {
  const startTrack = trackMeters;
  const steps = 6;
  for (let index = 0; index < steps; index += 1) {
    const t = index / (steps - 1);
    const track = startTrack + t * 26;
    const z = toZ(track);
    const x = side * (cs.deckHalf - 1 + t * 17);
    const y = -0.4 - t * 9.2;
    batch.box(m.viaduct, [x, y, z], [7.4 - t * 1.6, 0.6, 5.4]);
    for (const edge of [-1, 1]) batch.box(m.galvanized, [x + edge * (3.4 - t * 0.7), y + 0.6, z], [0.14, 0.7, 5.4]);
    if (!lite) {
      batch.box(m.viaduct, [x, y - 3.4, z], [1.1, 6.4, 1.3]);
      batch.box(m.deckConcrete, [x, cs.streetY + 0.35, z], [2.4, 0.7, 2.6]);
    }
  }
  // Portique ETC : auvent vert, antennes et panneaux.
  const gantryTrack = startTrack + 13;
  const gz = toZ(gantryTrack);
  const gx = side * (cs.deckHalf + 7);
  batch.box(m.darkSteel, [gx, 1.4, gz - 2.6], [0.3, 12, 0.3]);
  batch.box(m.darkSteel, [gx, 1.4, gz + 2.6], [0.3, 12, 0.3]);
  batch.box(m.deckConcrete, [gx, 7.0, gz], [8.6, 0.5, 6.4]);
  batch.box(m.tollGreen, [gx, 7.5, gz], [9.2, 0.7, 7.0]);
  batch.box(m.tollGreen, [gx, 8.1, gz], [8.2, 0.5, 5.6]);
  if (atlas.has('gate')) batch.plane(m.signs, [gx, 7.62, gz + side * 0.1], 6.4, 0.5, [Math.PI / 2, 0, 0], { uv: atlas.uv('gate') });
  for (const lane of [-2.2, 0, 2.2]) {
    batch.box(m.darkSteel, [gx + lane, 6.5, gz], [0.16, 0.9, 0.16]);
    batch.box(lane === 0 ? m.exitGreen : m.sodium, [gx + lane, 6.05, gz], [0.5, 0.12, 0.5]);
  }
  batch.box(m.signBacking, [gx - side * 4.2, 4.0, gz], [0.2, 1.5, 4.4]);
  batch.plane(m.signs, [gx - side * 4.32, 4.0, gz], 4.2, 1.4, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { uv: atlas.uv('gate') });
  if (lite) return;
  // Barrières et îlots du péage, plus bas encore.
  for (const lane of [-2.4, 2.4]) {
    batch.box(m.deckConcrete, [gx + lane, -6.4, gz], [0.5, 0.7, 4.6]);
    batch.box(m.reflectorRed, [gx + lane, -5.9, gz], [0.52, 0.1, 4.6]);
    batch.box(m.darkSteel, [gx + lane, -5.2, gz], [0.1, 1.2, 0.1]);
  }
}

// ─── Tokyo Tower, au-dessus de Shiba-kōen ────────────────────────────────────
// À 芝公園 la C1 passe au pied de la tour : treillis orange international et
// blanc, deux observatoires, balise aviation et le toit de Zōjō-ji en dessous.
function addTokyoTower(batch, m, cs, sector, lite) {
  const track = sector.landmark.at * LAP;
  const z = toZ(track);
  const side = sector.landmark.side;
  const baseY = cs.streetY;
  const x = side * 32;
  const orange = m.towerOrange;
  const white = m.towerWhite;
  // Quatre jambes évasées, en treillis orange et blanc.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    batch.box(orange, [x + sx * 3.1, baseY + 5, z + sz * 3.1], [0.9, 10, 0.9], [sx * 0.22, 0, sz * -0.22]);
    batch.box(white, [x + sx * 2.2, baseY + 12, z + sz * 2.2], [0.8, 6, 0.8], [sx * 0.16, 0, sz * -0.16]);
  }
  // Fût en six tronçons alternés, comme la peinture réglementaire.
  const segments = [[16, 4.6, 6], [22, 4.0, 6], [28, 3.3, 6], [34, 2.6, 6], [40, 1.9, 6], [45, 1.3, 4]];
  segments.forEach(([height, width, thickness], index) => {
    const material = index % 2 ? white : orange;
    batch.box(material, [x, baseY + height, z], [width, thickness, width]);
    if (!lite) {
      for (const diag of [-1, 1]) {
        batch.box(index % 2 ? orange : white, [x + diag * width * 0.5, baseY + height, z], [0.22, thickness * 0.9, width * 1.05], [0, 0, diag * 0.5]);
        batch.box(index % 2 ? orange : white, [x, baseY + height, z + diag * width * 0.5], [width * 1.05, thickness * 0.9, 0.22], [diag * 0.5, 0, 0]);
      }
    }
  });
  // Observatoire principal (150 m) et observatoire supérieur (250 m).
  batch.box(white, [x, baseY + 19.4, z], [8.2, 2.2, 8.2]);
  batch.box(m.windows, [x, baseY + 20.9, z], [7.6, 0.9, 7.6]);
  batch.box(white, [x, baseY + 22.0, z], [8.6, 0.6, 8.6]);
  batch.box(white, [x, baseY + 30.4, z], [4.6, 1.5, 4.6]);
  batch.box(m.windows, [x, baseY + 31.5, z], [4.2, 0.7, 4.2]);
  // Antenne et balise aviation.
  batch.cylinder(orange, [x, baseY + 50, z], 0.28, 0.42, 6, 6);
  batch.cylinder(white, [x, baseY + 54.5, z], 0.12, 0.26, 4, 5);
  batch.box(m.beacon, [x, baseY + 57, z], [0.5, 0.5, 0.5]);
  if (!lite) {
    // Projecteurs chauds au pied de la tour et parc de Shiba autour.
    batch.plane(m.lampCone, [x, baseY + 8, z], 16, 18, null);
    batch.plane(m.lampCone, [x, baseY + 8, z], 16, 18, [0, Math.PI / 2, 0]);
    batch.box(m.palaceGround, [x + side * 4, baseY + 0.4, z], [26, 0.8, 34]);
    for (const [tx, tz] of [[-9, -12], [9, -10], [-11, 8], [10, 11], [0, 14], [-6, -4], [7, 3]]) {
      const treeX = x + tx;
      const treeZ = z + tz;
      batch.cylinder(m.darkSteel, [treeX, baseY + 2.2, treeZ], 0.2, 0.28, 3.4, 5);
      batch.sphere(m.palaceGround, [treeX, baseY + 4.4, treeZ], 1.7, 5);
    }
    // Zōjō-ji : le temple dont le toit sombre jouxte la tour.
    batch.box(m.palaceGround, [x + side * 11, baseY + 2.4, z - 15], [12, 4, 8]);
    batch.cone(m.darkSteel, [x + side * 11, baseY + 6.4, z - 15], 8.6, 4.2, 4, [0, Math.PI / 4, 0]);
    batch.box(m.towerOrange, [x + side * 11, baseY + 8.6, z - 15], [0.6, 0.6, 0.6]);
    for (const lampX of [-5, 5]) batch.box(m.sodium, [x + side * 11 + lampX, baseY + 1.2, z - 10.6], [0.5, 0.2, 0.3]);
  }
}

// ─── Rainbow Bridge, depuis 浜崎橋 ───────────────────────────────────────────
// Le JCT de 浜崎橋 est la porte du front de mer : la 11号台場線 part vers la
// droite et le pont suspendu traverse la baie au loin.
function addRainbowBridge(batch, m, cs, sector, lite) {
  const track = sector.landmark.at * LAP;
  const z = toZ(track);
  const side = sector.landmark.side;
  const baseY = cs.streetY - 6;
  const centerX = side * 74;
  // Bretelle de la 11号台場線 qui quitte l'anneau vers la baie.
  for (let index = 0; index < 5; index += 1) {
    const t = index / 4;
    const x = side * (cs.deckHalf + 1 + t * 22);
    const y = 0.6 + t * 5.4;
    batch.box(m.viaduct, [x, y, z + t * 6], [8.4, 0.6, 6.2], [0, 0, side * -0.06 * t]);
    for (const edge of [-1, 1]) batch.box(m.galvanized, [x + edge * 3.9, y + 0.6, z + t * 6], [0.14, 0.7, 6.2], [0, 0, side * -0.06 * t]);
    if (!lite) batch.box(m.viaduct, [x, y - 4.4, z + t * 6], [1.2, 8.4, 1.4]);
  }
  // Le pont : deux pylônes, un tablier, des câbles et des lumières.
  const deckY = baseY + 18;
  for (const pylon of [-26, 26]) {
    const px = centerX + pylon;
    for (const leg of [-1, 1]) {
      batch.box(m.deckConcrete, [px, deckY + 13, z + leg * 3.4], [1.5, 34, 1.5]);
      batch.box(m.towerWhite, [px, deckY + 29, z + leg * 3.4], [1.9, 2.4, 1.9]);
    }
    batch.box(m.deckConcrete, [px, deckY + 22, z], [2.0, 1.2, 8.6]);
    batch.box(m.beacon, [px, deckY + 31.4, z], [0.4, 0.4, 0.4]);
  }
  batch.box(m.deckConcrete, [centerX, deckY, z], [86, 1.0, 7.4]);
  batch.box(m.asphaltBelow, [centerX, deckY + 0.56, z], [86, 0.12, 6.6]);
  for (const edge of [-1, 1]) batch.box(m.towerWhite, [centerX, deckY + 1.2, z + edge * 3.5], [86, 0.5, 0.24]);
  if (lite) return;
  // Câbles porteurs et suspentes.
  for (const edge of [-1, 1]) {
    for (const half of [-1, 1]) {
      batch.box(m.galvanized, [centerX + half * 21, deckY + 16, z + edge * 3.4], [44, 0.16, 0.16], [0, 0, half * -0.42]);
      for (let cable = 0; cable < 8; cable += 1) {
        const cx = centerX + half * (5 + cable * 4.4);
        const sag = 12 - cable * 1.35;
        batch.box(m.galvanized, [cx, deckY + sag / 2 + 1.2, z + edge * 3.4], [0.08, Math.max(1.2, sag), 0.08]);
      }
    }
    // Rangée de lampes du pont, et éclairage de la baie.
    for (let lamp = -40; lamp <= 40; lamp += 8) {
      batch.box(m.sodium, [centerX + lamp, deckY + 1.5, z + edge * 3.1], [0.6, 0.16, 0.16]);
    }
  }
  batch.plane(m.accentCone, [centerX, deckY + 1, z], 84, 6, null);
  // Piles d'approche et navires au mouillage dans la baie.
  for (const px of [centerX - 40, centerX + 40]) batch.box(m.deckConcrete, [px, deckY - 8, z], [2.4, 16, 3.2]);
  for (const [bx, bz] of [[centerX - 12, z + 22], [centerX + 18, z + 30]]) {
    batch.box(m.deckConcrete, [bx, baseY + 0.6, bz], [7, 1.2, 2.4]);
    batch.box(m.windows, [bx + 1.4, baseY + 1.6, bz], [2.4, 0.9, 1.8]);
    batch.box(m.sodium, [bx - 2.6, baseY + 1.5, bz], [0.3, 0.3, 0.3]);
  }
}

// ─── Panneaux publicitaires ─────────────────────────────────────────────────
// Pas de devantures sur une voie rapide : la publicité passe par les grands
// panneaux scellés sur les murs antibruit de 銀座, 汐留 et 浜崎橋.
function addBillboards(batch, m, cs, cfg, atlas, sectors, random, lite, dynamicProps) {
  const boards = cfg.billboards || [];
  if (!boards.length || !atlas.has('ad:0')) return;
  let cursor = 0;
  for (const sector of sectors) {
    // Rien ne se scelle aux parois d'un tunnel ; dans la tranchée de 霞が関 les
    // panneaux seraient noyés sous les ponts de surface.
    if (sector.kind === 'tunnel' || sector.kind === 'cut') continue;
    const side = sector.neon?.side ?? sector.side ?? (sector.palace ? 1 : -1);
    const count = sector.neon ? 4 : sector.kind === 'junction' ? 2 : 1;
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      if (end - start < 26) continue;
      for (let index = 0; index < count; index += 1) {
        const position = start + 12 + index * ((end - start - 20) / Math.max(1, count));
        if (position > end - 10) continue;
        const boardIndex = cursor % boards.length;
        cursor += 1;
        const z = toZ(position);
        const x = side * (cs.deckHalf + 2.4);
        const width = 7.4;
        const height = sector.neon ? 3.8 : 3.0;
        const bottomY = sector.neon ? 2.6 + random() * 2.4 : 2.2 + random() * 1.2;
        const y = bottomY + height / 2;
        batch.box(m.darkSteel, [x, y, z], [0.34, height + 0.5, width + 0.5]);
        batch.plane(m.signs, [x - side * 0.2, y, z], width, height, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { uv: atlas.uv(`ad:${boardIndex}`) });
        // Cadre néon et pieds descendant jusqu'à la rue.
        const neonMaterial = boardIndex % 2 ? m.accentStandard : m.secondaryStandard;
        batch.box(neonMaterial, [x - side * 0.24, y + height / 2 + 0.12, z], [0.1, 0.16, width + 0.3]);
        batch.box(neonMaterial, [x - side * 0.24, y - height / 2 - 0.12, z], [0.1, 0.16, width + 0.3]);
        for (const edge of [-1, 1]) batch.box(neonMaterial, [x - side * 0.24, y, z + edge * (width / 2 + 0.14)], [0.1, height + 0.3, 0.16]);
        if (lite) continue;
        for (const edge of [-1, 1]) {
          batch.box(m.steel, [x + side * 0.5, bottomY / 2 - 0.4, z + edge * (width / 2 - 0.8)], [0.3, Math.abs(bottomY) + cs.streetY * -1 - 1, 0.3]);
        }
        batch.plane(m.accentCone, [x - side * 0.6, y, z], width + 2, height + 2, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
        // Un panneau sur trois palpite : c'est lui qui devient prop dynamique.
        if (dynamicProps && boardIndex % 3 === 0) {
          dynamicProps.push(makeBoardFlicker(position, side, x - side * 0.2, y, z, width, height, atlas, boardIndex, m));
        }
      }
    }
  }
}

// ─── Mobilier de voie rapide ────────────────────────────────────────────────
// Mâts d'éclairage, postes kilométriques (en 内回り les bornes décroissent de
// 14 à 0), téléphones de secours, rappels de la limite à 50 km/h et
// interdictions de changer de voie là où les piles montent entre les files.
function addFurniture(batch, m, cs, cfg, atlas, route, lite) {
  const covered = coveredRanges(route.sectors);
  const open = shutoOpenSegments(covered);
  const inOpen = (track) => open.some(([start, end]) => track >= start && track <= end);
  // Mâts tous les trente mètres, alternés, au pied du parapet.
  for (const [start, end] of open) {
    for (let position = start + 6; position < end - 4; position += 30) {
      const side = Math.round(position / 30) % 2 ? 1 : -1;
      const x = side * (cs.parapetX - 0.3);
      const z = toZ(position);
      batch.cylinder(m.darkSteel, [x, cs.mastHeight / 2, z], 0.11, 0.18, cs.mastHeight, 6);
      batch.box(m.deckConcrete, [x, 0.16, z], [0.7, 0.32, 0.7]);
      batch.box(m.darkSteel, [x - side * 1.9, cs.mastHeight - 0.2, z], [3.9, 0.16, 0.16], [0, 0, side * 0.07]);
      for (const offset of [-1.3, 1.3]) {
        batch.box(m.darkSteel, [x - side * 3.6, cs.mastHeight - 0.36, z + offset], [0.5, 0.16, 0.9], [0.24, 0, 0]);
        batch.box(m.lampGlow, [x - side * 3.6, cs.mastHeight - 0.46, z + offset], [0.44, 0.06, 0.8]);
        if (!lite) batch.cone(m.lampCone, [x - side * 4.4, cs.mastHeight - 3.6, z + offset], 2.4, 6.4, 8);
      }
      if (lite) continue;
      // Traverse de maintenance et échelon au pied du mât.
      batch.box(m.darkSteel, [x, cs.mastHeight - 1.2, z], [0.08, 1.8, 0.08], [0, 0, side * 0.1]);
      batch.box(m.steel, [x + side * 0.22, 1.4, z], [0.06, 2.4, 0.3]);
    }
  }
  // Postes kilométriques : un par kilomètre officiel de la C1.
  const kmCount = Math.round(route.lengthKm);
  for (let km = 1; km < kmCount; km += 1) {
    const fraction = (route.lengthKm - km - 0.5) / route.lengthKm;
    const position = fraction * LAP;
    if (!inOpen(position)) continue;
    const side = -1;
    const x = side * (cs.barrierInner + cs.barrierWidth + 0.08);
    batch.box(m.signBacking, [x, 1.85, toZ(position)], [0.16, 0.62, 0.5]);
    if (atlas.has(`km:${km}`)) batch.plane(m.signs, [x - side * 0.1, 1.85, toZ(position)], 0.44, 0.56, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { uv: atlas.uv(`km:${km}`) });
    batch.box(m.steel, [x + side * 0.06, 1.3, toZ(position)], [0.08, 0.5, 0.08]);
  }
  if (lite) return;
  // Téléphones de secours (非常電話) sur le parapet, tous les cent mètres.
  for (let position = LOOP_START + 22; position < LOOP_END - 12; position += 100) {
    if (!inOpen(position)) continue;
    for (const side of [-1, 1]) {
      const x = side * cs.parapetX;
      batch.box(m.reflectorRed, [x, 1.72, toZ(position)], [0.44, 0.52, 0.34]);
      batch.box(m.darkSteel, [x, 1.34, toZ(position)], [0.2, 0.28, 0.2]);
      batch.box(m.windows, [x, 1.9, toZ(position) + 0.3], [0.3, 0.12, 0.1]);
    }
  }
  // Rappels de la limite à 50 km/h, sur mât, tous les cent cinquante mètres.
  for (let position = LOOP_START + 44; position < LOOP_END - 20; position += 150) {
    if (!inOpen(position) || !atlas.has(`limit:${route.speedLimit}`)) continue;
    const side = 1;
    const x = side * (cs.parapetX + 0.2);
    batch.box(m.darkSteel, [x, 1.9, toZ(position)], [0.12, 3.8, 0.12]);
    batch.plane(m.signs, [x - side * 0.08, 3.5, toZ(position)], 1.2, 1.2, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { uv: atlas.uv(`limit:${route.speedLimit}`) });
  }
  // Interdictions de changer de voie et balises de sortie, dans les secteurs
  // à lignes jaunes (新富町, 汐留) et devant chaque sortie.
  for (const sector of route.sectors) {
    if (!sector.sign?.hazard && !sector.pillars && !sector.sign?.exits) continue;
    for (const [start, end] of shutoTrackRanges(sector.from, sector.to)) {
      const span = end - start;
      const steps = Math.max(1, Math.round(span / 26));
      for (let index = 0; index < steps; index += 1) {
        const position = start + ((index + 0.5) * span) / steps;
        if (!inOpen(position)) continue;
        const key = sector.pillars || sector.sign?.hazard ? 'no-lane' : 'direction';
        if (!atlas.has(key)) continue;
        for (const side of [-1, 1]) {
          const x = side * (cs.barrierInner + cs.barrierWidth + 0.1);
          batch.box(m.signBacking, [x, 2.3, toZ(position)], [0.14, 0.72, 1.5]);
          batch.plane(m.signs, [x - side * 0.09, 2.3, toZ(position)], 1.4, 0.66, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { uv: atlas.uv(key) });
        }
        // Flèches de rabattement peintes au sol devant la sortie.
        if (index === steps - 1) {
          for (const side of [-1, 1]) batch.box(m.reflector, [side * (ROAD_HALF - 1.4), 0.03, toZ(position + 3)], [0.5, 0.04, 2.6], [0, side * 0.24, 0]);
        }
      }
    }
  }
  // Bornes de route (C1) sur le parapet, tous les soixante mètres.
  for (let position = LOOP_START + 16; position < LOOP_END - 8; position += 60) {
    if (!inOpen(position)) continue;
    const side = -1;
    batch.box(m.tollGreen, [side * (cs.parapetX + 0.05), cs.parapetHeight + 0.32, toZ(position)], [0.3, 0.5, 0.8]);
    batch.box(m.windows, [side * (cs.parapetX + 0.05), cs.parapetHeight + 0.6, toZ(position)], [0.32, 0.08, 0.6]);
  }
}

// ─── Porte de mi-tour : 谷町 JCT ────────────────────────────────────────────
// Au kilomètre 7,4 de l'内回り, la C1 plonge dans la tranchée de 霞が関 et la
// 3号渋谷線 s'en détache : c'est la porte du jeu, avec son portique géant,
// son panneau de jonction et la bretelle qui enjambe l'anneau.
function addGate(batch, m, cs, cfg, atlas, theme, lite) {
  const z = toZ(GATE_TRACK_POSITION);
  const legX = cs.deckHalf + 2.8;
  const beamY = CAMERA_CLEARANCE + 3.4;
  for (const side of [-1, 1]) {
    const x = side * legX;
    batch.box(m.deckConcrete, [x, 1.0, z], [1.8, 2.0, 2.6]);
    batch.box(m.darkSteel, [x, beamY / 2, z - 0.7], [0.7, beamY, 0.7]);
    batch.box(m.darkSteel, [x, beamY / 2, z + 0.7], [0.7, beamY, 0.7]);
    batch.box(m.steel, [x, beamY - 2.4, z], [0.9, 4.6, 0.2], [0, 0, side * 0.26]);
    if (lite) continue;
    // Escalier de service contre la pile du portique.
    for (let step = 0; step < 7; step += 1) {
      batch.box(m.steel, [x + side * 0.9, 1.2 + step * 1.35, z + 1.2 - step * 0.1], [0.9, 0.1, 1.6]);
    }
  }
  // Double poutre et entretoises : le portique de la porte est plus lourd que
  // les portiques courants, comme ceux qui annoncent un JCT majeur.
  for (const offset of [-0.85, 0.85]) {
    batch.box(m.darkSteel, [0, beamY, z + offset], [legX * 2 + 0.7, 0.42, 0.42]);
    batch.box(m.darkSteel, [0, beamY + 1.2, z + offset], [legX * 2 + 0.7, 0.24, 0.24]);
  }
  for (let truss = -13; truss <= 13; truss += 1.6) {
    batch.box(m.steel, [truss, beamY + 0.6, z + 0.85], [0.1, 1.3, 0.1]);
    batch.box(m.steel, [truss, beamY + 0.6, z - 0.85], [0.1, 1.3, 0.1]);
    batch.box(m.steel, [truss + 0.8, beamY + 0.6, z], [0.08, 1.7, 0.08], [0, 0, (truss > 0 ? -1 : 1) * 0.7]);
  }
  // Panneau principal : base à 7,6 m, la caméra de poursuite passe dessous.
  const panelHeight = 2.5;
  const panelY = CAMERA_CLEARANCE + 0.2 + panelHeight / 2;
  batch.box(m.signBacking, [0, panelY, z], [15.6, panelHeight + 0.3, 0.4]);
  for (const face of [-1, 1]) {
    if (atlas.has('gate')) batch.plane(m.signs, [0, panelY, z + face * 0.24], 15.2, panelHeight, face > 0 ? null : [0, Math.PI, 0], { uv: atlas.uv('gate') });
  }
  // Panneaux secondaires : sortie 24 霞が関 et sens de circulation.
  for (const [px, key, width] of [[-6.2, 'direction', 3.0], [6.2, 'limit:50', 1.5]]) {
    if (!atlas.has(key)) continue;
    batch.box(m.signBacking, [px, beamY - 0.5, z + 1.1], [width + 0.24, 1.34, 0.24]);
    batch.plane(m.signs, [px, beamY - 0.5, z + 1.24], width, 1.2, null, { uv: atlas.uv(key) });
  }
  // Projecteurs, balise et bandeau lumineux de la porte.
  for (const lx of [-6.4, -2.1, 2.1, 6.4]) {
    batch.box(m.darkSteel, [lx, panelY + panelHeight / 2 + 0.3, z], [0.34, 0.3, 0.6], [0.5, 0, 0]);
    batch.box(m.led, [lx, panelY + panelHeight / 2 + 0.12, z + 0.26], [0.3, 0.08, 0.12]);
  }
  batch.box(m.beacon, [0, beamY + 1.7, z], [0.42, 0.42, 0.42]);
  batch.box(m.tollGreen, [0, beamY + 0.95, z], [legX * 2 + 0.4, 0.14, 1.9]);
  if (lite) return;
  batch.plane(m.accentCone, [0, panelY - 0.4, z + 0.8], 15, 3, [0.4, 0, 0]);
  // Glissière renforcée et balises serrées de part et d'autre de la porte.
  for (const side of [-1, 1]) {
    for (let offset = -14; offset <= 14; offset += 3.5) {
      batch.box(side > 0 ? m.reflector : m.reflectorRed, [side * cs.barrierInner, cs.barrierHeight + 0.4, z + offset * SCALE], [0.06, 0.36, 0.2]);
    }
  }
}

// ─── 日本橋 : le kilomètre zéro ─────────────────────────────────────────────
// Sous la ligne d'arrivée, la 日本橋川 et le pont de pierre de Nihonbashi ;
// sur le tablier, la plaque du 道路元標 et le marquage AH1 qui ouvrent l'anneau.
function addOrigin(batch, m, cs, atlas, route, lite) {
  const z = 0;
  const baseY = cs.streetY;
  // La rivière passe sous l'anneau, dans l'axe exact de la ligne.
  batch.box(m.water, [0, baseY + 0.5, z], [64, 0.5, 15]);
  for (const side of [-1, 1]) {
    batch.box(m.deckConcrete, [side * 34, baseY + 1.4, z], [6, 1.8, 15]);
    batch.box(m.stone ?? m.deckConcrete, [side * 36.6, baseY + 2.2, z], [1.2, 0.4, 15]);
  }
  if (!lite) {
    // Le pont de Nihonbashi, en pierre, avec ses lampadaires et ses garde-corps.
    batch.box(m.stone ?? m.deckConcrete, [0, baseY + 3.0, z], [26, 1.0, 9.4]);
    for (const side of [-1, 1]) {
      batch.box(m.stone ?? m.deckConcrete, [0, baseY + 3.8, z + side * 4.5], [26, 0.8, 0.5]);
      for (let post = -11; post <= 11; post += 3.6) {
        batch.box(m.stone ?? m.deckConcrete, [post, baseY + 4.4, z + side * 4.5], [0.5, 0.9, 0.5]);
        batch.sphere(m.sodium, [post, baseY + 5.0, z + side * 4.5], 0.2, 5);
      }
    }
    // Quais, rues et immeubles bas de Nihonbashi autour du pont.
    for (const side of [-1, 1]) {
      batch.box(m.asphaltBelow, [0, baseY + 0.7, z + side * 10.5], [64, 0.4, 6]);
      for (let index = 0; index < 3; index += 1) {
        batch.box(m.deckConcrete, [side * (18 + index * 14), baseY + 4.6, z + side * 16], [11, 7.2, 9]);
        batch.box(index % 2 ? m.windows : m.sodium, [side * (18 + index * 14), baseY + 6.4, z + side * 11.4], [8, 3.2, 0.2]);
      }
    }
    // Lampadaires du quai et balises rouges de la pile centrale.
    for (const side of [-1, 1]) {
      for (const lampZ of [-6, 6]) {
        batch.box(m.darkSteel, [side * 27, baseY + 4.2, z + lampZ], [0.14, 5.4, 0.14]);
        batch.box(m.sodium, [side * 25.6, baseY + 6.8, z + lampZ], [0.8, 0.16, 0.3]);
      }
    }
    batch.box(m.reflectorRed, [0, baseY + 3.7, z], [1.4, 0.16, 0.5]);
  }
  // Plaques du kilomètre zéro, de part et d'autre de la zone de départ.
  if (atlas.has('origin')) {
    for (const position of [LOOP_START + 10, LOOP_END - 8]) {
      for (const side of [-1, 1]) {
        const x = side * (cs.barrierInner + cs.barrierWidth + 0.12);
        batch.box(m.signBacking, [x, 2.5, toZ(position)], [0.2, 1.2, 2.6]);
        batch.plane(m.signs, [x - side * 0.12, 2.5, toZ(position)], 2.4, 1.1, [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0], { uv: atlas.uv('origin') });
      }
    }
    // Portique d'entrée de l'anneau, juste après la ligne : 江戸橋 JCT.
    const gantryZ = toZ(LOOP_START + 12);
    for (const side of [-1, 1]) batch.box(m.darkSteel, [side * (cs.deckHalf + 0.4), cs.signBeamY / 2, gantryZ], [0.5, cs.signBeamY, 0.5]);
    batch.box(m.darkSteel, [0, cs.signBeamY, gantryZ], [(cs.deckHalf + 0.6) * 2, 0.34, 0.34]);
    batch.box(m.tollGreen, [0, cs.signBeamY + 0.5, gantryZ], [(cs.deckHalf + 0.4) * 2, 0.5, 0.9]);
    if (atlas.has('direction')) {
      batch.box(m.signBacking, [0, cs.signBeamY - 1.3, gantryZ + 0.5], [9.4, 1.5, 0.24]);
      batch.plane(m.signs, [0, cs.signBeamY - 1.3, gantryZ + 0.64], 9.0, 1.4, null, { uv: atlas.uv('direction') });
    }
  }
}

// ─── Accessoires animés ─────────────────────────────────────────────────────
const JP_FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "Meiryo", sans-serif';
const VMS_AMBER = '#ffab2e';
// Messages du panneau à message variable : la Shuto diffuse en boucle l'état
// du trafic, les restrictions de tunnel et les temps de parcours.
const VMS_MESSAGES = [
  { jp: '渋滞 銀座→汐留 3km', rom: 'CONGESTION GINZA → SHIODOME', line: 'C1 内回り · 通過 18分', jam: [0.83, 0.96] },
  { jp: '順調 霞が関→谷町JCT', rom: 'CLEAR KASUMIGASEKI → TANIMACHI', line: 'C1 内回り · 通過 11分', jam: null },
  { jp: '千代田T 危険物通行禁止', rom: 'CHIYODA TUNNEL · NO HAZMAT', line: '規制 50 km/h · 車線変更禁止', jam: [0.26, 0.39] },
  { jp: '事故処理中 竹橋JCT', rom: 'ACCIDENT CLEARANCE TAKEBASHI', line: '左2車線 規制 · 減速', jam: [0.11, 0.19] },
  { jp: '浜崎橋JCT 湾岸線 混雑', rom: 'HAMAZAKIBASHI · BAYSHORE BUSY', line: '11号台場線 出口渋滞', jam: [0.66, 0.76] },
];

/** Anneau de la C1 normalisé pour le diagramme du panneau. */
function vmsRing(cityId, steps = 64) {
  const shape = cityRushMinimapTrackShape(cityId);
  if (!shape) return null;
  const samples = [];
  for (let index = 0; index < steps; index += 1) {
    const point = shape.at(index / steps);
    samples.push([point.centerX, point.centerY]);
  }
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const [x, y] of samples) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = 2 / Math.max(spanX, spanY);
  return samples.map(([x, y]) => [
    (x - (minX + maxX) / 2) * scale,
    (y - (minY + maxY) / 2) * scale,
  ]);
}

function drawInfoBoard(ctx, width, height, message, ring) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#04060b';
  ctx.fillRect(0, 0, width, height);
  // Trame de diodes éteintes : le fond du panneau LED.
  ctx.fillStyle = 'rgba(255,171,46,.07)';
  for (let y = 4; y < height; y += 4) {
    for (let x = 4; x < width; x += 4) ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = VMS_AMBER;
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, width - 10, height - 10);
  // Diagramme de l'anneau, à gauche.
  if (ring) {
    const cx = 92;
    const cy = height / 2;
    const radius = Math.min(62, height / 2 - 18);
    const at = (fraction) => {
      const wrapped = ((fraction % 1) + 1) % 1;
      const index = Math.min(ring.length - 1, Math.floor(wrapped * ring.length));
      return [cx + ring[index][0] * radius, cy + ring[index][1] * radius];
    };
    ctx.beginPath();
    ring.forEach(([x, y], index) => (index ? ctx.lineTo(cx + x * radius, cy + y * radius) : ctx.moveTo(cx + x * radius, cy + y * radius)));
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,171,46,.5)';
    ctx.lineWidth = 6;
    ctx.stroke();
    if (message.jam) {
      const [from, to] = message.jam;
      ctx.beginPath();
      const steps = 24;
      for (let index = 0; index <= steps; index += 1) {
        const [x, y] = at(from + ((to - from) * index) / steps);
        if (index) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = '#ff4436';
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    // Le point de la course, en vert, et la flèche du sens 内回り.
    const [markerX, markerY] = at(0);
    ctx.fillStyle = '#3ce08a';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,224,138,.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.42, Math.PI * 0.3, Math.PI * 1.6);
    ctx.stroke();
  }
  // Textes, en orange Shuto.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = VMS_AMBER;
  ctx.font = `900 ${Math.round(height * 0.24)}px ${JP_FONT}`;
  ctx.fillText(message.jp, 176, height * 0.26);
  ctx.fillStyle = '#ffd79a';
  ctx.font = `700 ${Math.round(height * 0.13)}px "Orbitron", ${JP_FONT}`;
  ctx.fillText(message.rom, 176, height * 0.53);
  ctx.fillStyle = 'rgba(255,215,154,.85)';
  ctx.font = `700 ${Math.round(height * 0.13)}px ${JP_FONT}`;
  ctx.fillText(message.line, 176, height * 0.78);
}

/**
 * 道路情報板 : le panneau à message variable de la Shuto, redessiné toutes les
 * trois secondes avec l'état du trafic de l'anneau.
 */
function makeInfoBoard(trackMeters, side, cs, city, random) {
  const group = new THREE.Group();
  const width = 6.0;
  const height = 1.9;
  const texture = makeCanvasTexture(() => {}, 512, 168, { smooth: true });
  const canvas = texture.userData.canvas;
  const ctx = canvas.getContext('2d');
  const ring = vmsRing(city.id);
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const x = side * 3.0;
  const y = CAMERA_CLEARANCE + 1.15;
  panel.position.set(x, y, 0.2);
  group.add(panel);
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.36, height + 0.36, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.7, metalness: 0.4, flatShading: true }),
  );
  backing.position.set(x, y, 0);
  group.add(backing);
  // Potence : mât au pied du parapet, bras au-dessus des voies de course.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, cs.mastHeight, 6), new THREE.MeshStandardMaterial({ color: 0x2b303c, metalness: 0.5, roughness: 0.48, flatShading: true }));
  mast.position.set(side * (cs.parapetX - 0.3), cs.mastHeight / 2, -0.3);
  group.add(mast);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x - side * (cs.parapetX - 0.3)) + 0.4, 0.2, 0.24), mast.material);
  arm.position.set((x + side * (cs.parapetX - 0.3)) / 2, y + height / 2 + 0.36, -0.3);
  group.add(arm);
  const stay = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), mast.material);
  stay.position.set((x + side * (cs.parapetX - 0.3)) / 2 + side * -0.7, y + height / 2 + 1.0, -0.3);
  stay.rotation.z = side * -0.32;
  group.add(stay);
  for (const offset of [-1.9, 0, 1.9]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false }));
    lamp.position.set(x + offset, y + height / 2 + 0.22, 0.3);
    group.add(lamp);
  }
  let cursor = Math.floor(random() * VMS_MESSAGES.length);
  let next = -1;
  const paint = () => {
    const context = ctx || canvas.getContext('2d');
    if (!context) return;
    drawInfoBoard(context, canvas.width, canvas.height, VMS_MESSAGES[cursor], ring);
    texture.needsUpdate = true;
  };
  paint();
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      if (elapsed < next) return;
      next = elapsed + 3.0;
      cursor = (cursor + 1) % VMS_MESSAGES.length;
      paint();
    },
  };
}

/** Balise aviation clignotante au sommet des bretelles d'échangeur. */
function makeBeaconProp(trackMeters, x, y) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false, transparent: true }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), new THREE.MeshBasicMaterial({
    color: 0xff3b30, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 5), new THREE.MeshStandardMaterial({ color: 0x2b303c, roughness: 0.6, metalness: 0.4, flatShading: true }));
  post.position.set(x, y - 0.4, 0);
  core.position.set(x, y, 0);
  halo.position.set(x, y, 0);
  group.add(post, core, halo);
  const phase = (trackMeters % 7) / 7;
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      const cycle = (elapsed * 0.8 + phase) % 1;
      const on = cycle < 0.28 ? 1 : 0.06;
      core.material.opacity = on;
      halo.material.opacity = on * 0.22;
      halo.scale.setScalar(0.8 + on * 0.5);
    },
  };
}

/** Panneau publicitaire qui palpite : un tube sur trois accuse son âge. */
function makeBoardFlicker(trackMeters, side, x, y, z, width, height, atlas, index, m) {
  const group = new THREE.Group();
  const flickerMaterial = m.signs.clone();
  flickerMaterial.transparent = true;
  const uv = atlas.uv(`ad:${index}`);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(width, height), flickerMaterial);
  const uvAttribute = board.geometry.attributes.uv;
  for (let vertex = 0; vertex < uvAttribute.count; vertex += 1) {
    uvAttribute.setXY(vertex, uv[0] + uvAttribute.getX(vertex) * (uv[2] - uv[0]), uv[1] + uvAttribute.getY(vertex) * (uv[3] - uv[1]));
  }
  board.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  board.position.set(x, y, 0);
  group.add(board);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 2.4, height + 2.4),
    new THREE.MeshBasicMaterial({ color: index % 2 ? 0xff5db8 : 0x3ce08a, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, fog: false }),
  );
  glow.rotation.y = board.rotation.y;
  glow.position.set(x - side * 0.1, y, 0);
  group.add(glow);
  const seed = (index + 1) * 3.7;
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      const stutter = Math.sin(elapsed * 19 + seed) * Math.sin(elapsed * 6.1 + seed * 2);
      const drop = stutter > 0.9 ? 0.32 : stutter < -0.93 ? 0.6 : 1;
      flickerMaterial.opacity = drop;
      glow.material.opacity = 0.08 + drop * 0.09;
    },
  };
}

// ─── Chaussée ───────────────────────────────────────────────────────────────
/**
 * Tablier et sol urbain défilants de la voie rapide : l'équivalent de
 * `makeRoad` pour la C1, avec la dalle de 21,2 m de large (trois voies par
 * sens, bandes d'arrêt et amorces de parapet) et, treize mètres plus bas, le
 * plan de la ville qui défile à la vitesse du monde.
 */
export function makeExpresswayRoad(scene, theme, random, playerZ) {
  const cfg = theme.expressway;
  const deckHalf = cfg.deckHalfWidth;
  const wet = theme.weather === 'rain';
  const deckTexture = makeExpresswayDeckTexture(theme, random, { halfWidth: deckHalf });
  deckTexture.repeat.set(1, ROAD_LENGTH / ROAD_TILE_LENGTH);
  const deckMaterial = new THREE.MeshStandardMaterial({
    map: deckTexture,
    roughness: wet ? 0.4 : 0.86,
    metalness: wet ? 0.34 : 0.05,
    flatShading: true,
  });
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(deckHalf * 2, ROAD_LENGTH), deckMaterial);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.02, playerZ - ROAD_LENGTH / 2 + 40);
  deck.receiveShadow = true;
  scene.add(deck);

  // La ville sous le viaduc : un grand plan sombre, treize mètres plus bas,
  // dont les rues et les îlots défilent deux fois moins vite que le tablier.
  const belowTexture = makeCityBelowTexture(theme, random);
  belowTexture.repeat.set(2, 2);
  const belowMaterial = new THREE.MeshStandardMaterial({ map: belowTexture, roughness: 1, metalness: 0.02, flatShading: true });
  const below = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), belowMaterial);
  below.rotation.x = -Math.PI / 2;
  below.position.set(0, -cfg.streetDepth - 0.06, playerZ - 120);
  below.receiveShadow = true;
  scene.add(below);

  const belowTile = 230;
  return {
    scroll(worldTravel) {
      deckTexture.offset.y += worldTravel / ROAD_TILE_LENGTH;
      belowTexture.offset.y += worldTravel / belowTile;
      if (deckTexture.offset.y > 1000) deckTexture.offset.y -= 1000;
      if (belowTexture.offset.y > 1000) belowTexture.offset.y -= 1000;
    },
  };
}

// ─── Assemblage de la boucle ────────────────────────────────────────────────
/**
 * Construit un tour complet de la C1 dans le `batch` partagé : tablier de
 * viaduc, murs antibruit, ville et palais impérial treize mètres plus bas,
 * trois tunnels, la tranchée de 霞が関, les bretelles d'échangeur, les
 * portiques verts de chaque secteur, la porte de 谷町 JCT à mi-tour, le
 * kilomètre zéro de 日本橋, la Tokyo Tower de 芝公園 et le Rainbow Bridge de
 * 浜崎橋. Les panneaux à message variable, les balises aviation et les
 * enseignes qui palpitent reviennent en accessoires animés.
 */
export function buildShutoExpressway({ city, theme, materials: m, batch, cityIndex = 0, lite = false }) {
  const cfg = theme.expressway;
  const route = cfg.route || city.route || CITY_RUSH_SHUTO_C1;
  const cs = crossSection(cfg);
  const random = seededRandom(41077 + cityIndex * 7919);
  const sectors = route.sectors;
  const dynamicProps = [];

  Object.assign(m, createExpresswayMaterials(city, theme, random));
  const atlas = buildShutoSignAtlas(city, theme, route);
  m.signs = atlas.material;

  const exclusions = coveredRanges(sectors);
  addDeck(batch, m, cs, cfg, exclusions, lite);
  addViaduct(batch, m, cs, exclusions, lite);
  addSoundWalls(batch, m, cs, cfg, sectors, lite);
  addCityBelow(batch, m, city, theme, cs, cfg, sectors, random, lite);
  addImperialPalace(batch, m, cs, sectors, random, lite);
  addRivers(batch, m, cs, sectors, random, lite);
  const gantries = addGantries(batch, m, cs, cfg, atlas, sectors, lite);

  for (const sector of sectors) {
    if (sector.kind === 'tunnel') addTunnel(batch, m, cs, cfg, atlas, sector, random, lite);
    if (sector.kind === 'cut') addCut(batch, m, city, theme, cs, cfg, atlas, sector, random, lite);
    if (['origin', 'junction'].includes(sector.kind) || sector.gate) addJunctionRamps(batch, m, cs, cfg, atlas, sector, random, lite);
    if (sector.toll) addTollPlaza(batch, m, cs, atlas, LOOP_END - 18, sector.toll.side, lite);
    if (sector.landmark?.id === 'tokyo-tower') addTokyoTower(batch, m, cs, sector, lite);
    if (sector.landmark?.id === 'rainbow-bridge') addRainbowBridge(batch, m, cs, sector, lite);
  }
  addBillboards(batch, m, cs, cfg, atlas, sectors, random, lite, dynamicProps);
  addFurniture(batch, m, cs, cfg, atlas, route, lite);
  addGate(batch, m, cs, cfg, atlas, theme, lite);
  addOrigin(batch, m, cs, atlas, route, lite);

  // Panneaux à message variable : deux exemplaires, hors des portiques.
  const blocked = [...gantries, GATE_TRACK_POSITION, LOOP_END - 18];
  for (const [index, position] of pickSpots([96, 462, 178, 520], blocked, 2).entries()) {
    dynamicProps.push(makeInfoBoard(position, index % 2 ? -1 : 1, cs, city, random));
  }
  if (!lite) {
    // Balises aviation : bretelles d'échangeur et sommet de la Tokyo Tower.
    const beaconSpots = [
      { track: route.sectors.find((sector) => sector.id === 'hamazakibashi').from * LAP + 22, x: 16, y: 13.6 },
      { track: route.sectors.find((sector) => sector.id === 'kyobashi').from * LAP + 18, x: -16, y: 13.2 },
      { track: route.sectors.find((sector) => sector.id === 'shiodome-jct').from * LAP + 16, x: 17, y: 14.8 },
      { track: route.sectors.find((sector) => sector.id === 'shibakoen').landmark.at * LAP, x: -32, y: cs.streetY + 57 },
    ];
    for (const spot of beaconSpots) dynamicProps.push(makeBeaconProp(spot.track, spot.x, spot.y));
  }
  return { dynamicProps, atlas, random, gantries };
}
