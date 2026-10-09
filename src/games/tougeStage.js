// ── 峠道 · Tōge Pass · décor de la route de montagne japonaise (nuit) ──────
//
// La峠道 n'est ni une ville ni un circuit : c'est une route de col à **deux
// voies**, la nuit, dans la brume, entre les cèdres. Le bitume porte une ligne
// jaune **continue** au milieu (marquage japonais des routes à double sens) et
// des rives blanches ; les épingles à cheveux sont bordées de garde-corps en
// acier, de panneaux jaunes à chevrons et de falaises. Le décor japonais se
// lit dans les phares : torii vermillon, lanterne de pierre (tōrō), poteaux
// électriques en bois, lampadaires à lumière chaude, distributeurs de boissons
// au sommet, et une montagne enneigée qui émerge de la brume. Ce module
// remplace `buildCityLoop` et `makeRoad` pour le parcours `touge`.
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_LANE_PAINT_WIDTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TRACK_PROFILE_TOUGE,
  TOUGE_HIGH_M,
} from './cityRushRules.js';
import {
  ROAD_TILE_LENGTH,
  ROAD_VIEW_AHEAD,
  ROAD_VIEW_BEHIND,
  START_ZONE_HALF,
  makeCurvedStripGeometry,
  updateCurvedStrip,
} from './cityRushStage.js';
import { SignAtlas, makeCanvasTexture, seededRandom } from './cityRushBuilder.js';

const LAP = CITY_RUSH_LAP_LENGTH;
const SCALE = CITY_RUSH_SCROLL_SCALE;
// Route de col à deux voies : 6,80 m de bitume — deux voies de 2,10 m centrées
// sur l'axe jaune continu, plus 1,30 m d'accotement de chaque côté.
export const TOUGE_ROAD_HALF = 3.4;
export const TOUGE_VERGE_OUTER = 9.4;
const LOOP_START = START_ZONE_HALF + 2;
const LOOP_END = LAP - START_ZONE_HALF - 2;
// Dégagement caméra : la poursuite culmine à 6,7 m ; le grand torii enjambe la
// route avec ses linteaux sous les 7,2 m.
const CAMERA_CLEARANCE = 7.4;

const toZ = (trackMeters) => -trackMeters * SCALE;

// Orientation d'un panneau : les plaques de bord de route regardent la route
// (normale vers l'intérieur), celles des portiques regardent le pilote.
function signRotation(facing) {
  if (facing === 0) return [0, 0, 0];
  return [0, facing > 0 ? Math.PI / 2 : -Math.PI / 2, 0];
}

// Le décor fusionné est déformé une fois par la boucle : une primitive trop
// longue ne suivrait la courbe qu'à ses extrémités. On découpe donc garde-corps,
// câbles et nappes de brume en tronçons, comme sur la Shuto et le Ring.
const BEND_SEGMENT = 12;

function bendAware(batch) {
  return {
    ...batch,
    box(material, position, size, rotation = null, options = {}) {
      const yaw = rotation?.[1] || 0;
      const along = Math.abs(size[2] * Math.cos(yaw));
      if (options.uv || (rotation && ((rotation[0] || 0) !== 0 || (rotation[2] || 0) !== 0)) || along <= BEND_SEGMENT) {
        batch.box(material, position, size, rotation, options);
        return;
      }
      const count = Math.ceil(along / BEND_SEGMENT);
      const segment = size[2] / count;
      for (let index = 0; index < count; index += 1) {
        const local = -size[2] / 2 + segment * (index + 0.5);
        batch.box(
          material,
          [position[0] + local * Math.sin(yaw), position[1], position[2] + local * Math.cos(yaw)],
          [size[0], size[1], segment + 0.02],
          rotation,
          options,
        );
      }
    },
  };
}

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04, flatShading: true, ...extra });
}

function unlit(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
}

// ─── Signalisation japonaise ────────────────────────────────────────────────
// Les panneaux de la峠道 suivent le code japonais : plaque blanche à texte noir
// pour les repères, disque à cerclage rouge pour la limite de vitesse, losange
// jaune à chevrons noirs pour annoncer une courbe, plaque vermillon pour le
// nom de la route. La typographie emprunte aux panneaux réels (kana + romaji).
const JP_FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "Meiryo", sans-serif';
const TOUGE_WHITE = '#f7f5ef';
const TOUGE_INK = '#17181d';
const TOUGE_YELLOW = '#f2c230';
const TOUGE_VERMILLION = '#c8372f';

function roundedPanel(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
  ctx.closePath();
}

export function drawJapaneseSignCell(ctx, width, height, entry) {
  const variant = entry.variant || 'sector';
  const font = (weight, size) => `${weight} ${Math.round(size)}px ${JP_FONT}, "Orbitron", Arial, sans-serif`;
  if (variant === 'start') {
    // Plaque de départ : vermillon, texte blanc, comme les plaques de route.
    ctx.fillStyle = TOUGE_VERMILLION;
    roundedPanel(ctx, 0, 0, width, height, Math.min(16, height * 0.12));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 4;
    roundedPanel(ctx, 8, 8, width - 16, height - 16, Math.min(11, height * 0.09));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff8ee';
    ctx.font = font(900, height * 0.42);
    ctx.fillText(entry.text || '峠道', width / 2, height * 0.4);
    ctx.font = font(700, height * 0.2);
    ctx.fillStyle = 'rgba(255,248,238,.85)';
    ctx.fillText(entry.sub || '', width / 2, height * 0.74);
    return;
  }
  if (variant === 'limit') {
    // Limite de vitesse : disque blanc, cerclage rouge, chiffres noirs.
    ctx.clearRect(0, 0, width, height);
    const radius = Math.min(width, height) * 0.44;
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.fillStyle = TOUGE_WHITE;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = radius * 0.22;
    ctx.strokeStyle = '#d32f2a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.89, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = TOUGE_INK;
    ctx.font = font(900, radius * 1.02);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '60', centerX, centerY + radius * 0.05);
    return;
  }
  if (variant === 'hazard') {
    // Panneau de courbe : fond jaune, chevrons noirs pointant dans le virage.
    ctx.fillStyle = TOUGE_YELLOW;
    roundedPanel(ctx, 0, 0, width, height, Math.min(14, height * 0.12));
    ctx.fill();
    ctx.strokeStyle = TOUGE_INK;
    ctx.lineWidth = 4;
    roundedPanel(ctx, 5, 5, width - 10, height - 10, Math.min(10, height * 0.09));
    ctx.stroke();
    const direction = entry.direction >= 0 ? 1 : -1;
    const segments = Math.max(1, Math.round(entry.count || 3));
    const step = (width - 24) / segments;
    ctx.fillStyle = TOUGE_INK;
    for (let index = 0; index < segments; index += 1) {
      const x = 12 + index * step + step * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - step * 0.32, height * 0.2);
      ctx.lineTo(x + direction * step * 0.18, height * 0.5);
      ctx.lineTo(x - step * 0.32, height * 0.8);
      ctx.lineTo(x - step * 0.06, height * 0.8);
      ctx.lineTo(x + direction * step * 0.42, height * 0.5);
      ctx.lineTo(x - step * 0.06, height * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (variant === 'sponsor') {
    const accent = entry.color || '#c8372f';
    ctx.fillStyle = TOUGE_WHITE;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width * 0.2, height);
    ctx.fillStyle = TOUGE_INK;
    ctx.font = font(900, height * 0.42);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '', width * 0.26, height * 0.52);
    ctx.fillStyle = 'rgba(23,24,29,.6)';
    ctx.font = font(700, height * 0.18);
    ctx.fillText(entry.sub || '', width * 0.26, height * 0.82);
    return;
  }
  if (variant === 'torii') {
    // Plaque du torii : vermillon, caractère blanc.
    ctx.fillStyle = TOUGE_VERMILLION;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff8ee';
    ctx.font = font(900, height * 0.62);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '峠', width / 2, height / 2);
    return;
  }
  // Plaque blanche standard (repère de secteur, borne kilométrique, avertissement).
  const hazard = entry.hazard === true;
  ctx.fillStyle = hazard ? TOUGE_YELLOW : (entry.background || TOUGE_WHITE);
  roundedPanel(ctx, 2, 2, width - 4, height - 4, Math.min(14, height * 0.12));
  ctx.fill();
  ctx.lineWidth = Math.max(3, height * 0.05);
  ctx.strokeStyle = hazard ? TOUGE_INK : (entry.borderColor || TOUGE_INK);
  ctx.strokeRect(2, 2, width - 4, height - 4);
  const left = entry.badge ? height * 1.05 : width * 0.07;
  if (entry.badge) {
    ctx.fillStyle = entry.badgeColor || TOUGE_VERMILLION;
    ctx.fillRect(10, 10, height - 20, height - 20);
    ctx.fillStyle = '#fff8ee';
    ctx.font = font(900, height * 0.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(entry.badge), 10 + (height - 20) / 2, height / 2);
  }
  ctx.fillStyle = entry.textColor || TOUGE_INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = font(900, height * (entry.big ? 0.42 : 0.36));
  ctx.fillText(entry.text || '', left, entry.sub ? height * 0.4 : height * 0.52);
  if (entry.sub) {
    ctx.fillStyle = hazard ? 'rgba(23,24,29,.75)' : (entry.subColor || '#5a5b60');
    ctx.font = font(700, height * 0.2);
    ctx.fillText(entry.sub, left, height * 0.76);
  }
}

/** Matériaux de la route de col : roche, cèdre, mousse, acier, vermillon du torii. */
export function createTougeMaterials(city, theme, random) {
  const tints = theme.materials || {};
  return {
    rock: standard(tints.rock ?? 0x2a2f3d, { roughness: 0.96 }),
    rockDark: standard(tints.rockDark ?? 0x1d2230, { roughness: 0.98 }),
    moss: standard(tints.moss ?? 0x24402c, { roughness: 1 }),
    foliage: standard(tints.foliage ?? 0x1c3a28, { roughness: 0.96 }),
    foliageLight: standard(tints.foliageLight ?? 0x2f5a3c, { roughness: 0.96 }),
    bamboo: standard(0x3a5a30, { roughness: 0.9 }),
    trunk: standard(tints.trunk ?? 0x3a2a20, { roughness: 1 }),
    wood: standard(tints.wood ?? 0x5a3a28, { roughness: 0.96 }),
    vermillion: standard(tints.vermillion ?? 0xc8372f, { roughness: 0.82 }),
    stone: standard(tints.stone ?? 0x4a4f5e, { roughness: 0.96 }),
    concrete: standard(tints.concrete ?? 0x5c6270, { roughness: 0.94 }),
    steel: standard(tints.steel ?? 0x8e949c, { metalness: 0.58, roughness: 0.44 }),
    darkMetal: standard(tints.darkSteel ?? 0x1c2029, { metalness: 0.42, roughness: 0.5 }),
    snow: standard(tints.snow ?? 0xdfe6ee, { roughness: 0.94 }),
    white: standard(0xf1efe6, { roughness: 0.82 }),
    black: standard(0x1b1c20, { roughness: 0.86 }),
    yellow: standard(0xd7b049, { roughness: 0.8 }),
    red: standard(0xc8382f, { roughness: 0.8 }),
    green: standard(0x33704a, { roughness: 0.85 }),
    blue: standard(0x2d4f9e, { roughness: 0.8 }),
    glass: standard(0x3d5566, { roughness: 0.32, metalness: 0.22 }),
    roofTile: standard(0x2c2f38, { roughness: 0.92 }),
    signs: unlit(0xffffff, { side: THREE.DoubleSide }),
    reflector: unlit(0xf2c230),
    lampGlow: unlit(tints.lanternGlow ?? 0xffd98a),
    window: unlit(0xffd98a, { transparent: true, opacity: 0.85 }),
    // Cône de lumière chaude sous chaque lampadaire : il découpe la brume.
    lampCone: new THREE.MeshBasicMaterial({
      color: 0xffd98a, transparent: true, opacity: 0.07, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false,
    }),
    // Nappe de brume basse, posée le long de la descente.
    mist: new THREE.MeshBasicMaterial({
      color: 0xc8d4e8, transparent: true, opacity: 0.1, depthWrite: false,
      side: THREE.DoubleSide, fog: false, toneMapped: false,
    }),
    accent: standard(city.accent, { emissive: city.accent, emissiveIntensity: 0.22 }),
  };
}

/** Atlas des panneaux de la峠道 : secteurs, limite, chevrons, bornes, sponsors. */
export function buildTougeSignAtlas(city, theme, route = CITY_RUSH_TOUGE) {
  const atlas = new SignAtlas({ cellWidth: 384, cellHeight: 128, columns: 4 });
  const keys = new Map();
  const add = (key, entry) => {
    if (keys.has(key)) return keys.get(key);
    const index = atlas.add(entry);
    keys.set(key, index);
    return index;
  };

  add('start', { draw: drawJapaneseSignCell, variant: 'start', text: '峠道 · TŌGE PASS', sub: '山麓の村 · KM 0 · 2 VOIES' });
  route.sectors.forEach((sector, index) => {
    if (!sector.sign) return;
    add(`sector:${sector.id}`, {
      draw: drawJapaneseSignCell,
      variant: 'sector',
      badge: String(index + 1),
      text: sector.sign.lines?.[0] || sector.name,
      sub: sector.sign.lines?.[1] || sector.romaji,
      hazard: sector.sign.hazard === true,
    });
  });
  // Limite de vitesse des routes de col : 60 km/h, disque à cerclage rouge.
  add('limit', { draw: drawJapaneseSignCell, variant: 'limit', text: String(route.speedLimit || 60) });
  // Chevrons jaunes des virages serrés, dans les deux sens.
  add('chevron-right', { draw: drawJapaneseSignCell, variant: 'hazard', direction: 1, count: 3 });
  add('chevron-left', { draw: drawJapaneseSignCell, variant: 'hazard', direction: -1, count: 3 });
  // Plaque vermillon du torii et avertissements de brume / ralentisseur.
  add('torii', { draw: drawJapaneseSignCell, variant: 'torii', text: '峠' });
  add('mist', { draw: drawJapaneseSignCell, variant: 'sector', hazard: true, text: '霧注意', sub: 'BRUME · PHARES' });
  add('reduce', { draw: drawJapaneseSignCell, variant: 'sector', hazard: true, text: '減速', sub: 'RALENTISSEUR' });
  // Panneau du sommet.
  add('summit', {
    draw: drawJapaneseSignCell, variant: 'sector', badge: '峠',
    text: '頂上', sub: `SOMMET · ${TOUGE_HIGH_M} M`,
  });
  // Bornes kilométriques, dans le sens de la course.
  for (let km = 0; km <= Math.round(route.lengthKm); km += 1) {
    add(`km:${km}`, { draw: drawJapaneseSignCell, variant: 'sector', badge: String(km), text: 'km', sub: '峠道' });
  }
  (theme.sponsors || []).forEach((text, index) => {
    add(`sponsor:${index}`, {
      draw: drawJapaneseSignCell, variant: 'sponsor', text,
      sub: 'TŌGE PASS · NIGHT RUN', color: index % 2 ? '#c8372f' : '#2a3a5e',
    });
  });

  const texture = atlas.build();
  return {
    material: new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide }),
    uv: (key) => atlas.uvFor(keys.get(key) ?? 0),
    has: (key) => keys.has(key),
    count: keys.size,
  };
}

// ─── Textures ───────────────────────────────────────────────────────────────
/**
 * Bitume de la峠道 : sombre et mouillé, avec la ligne jaune centrale
 * **continue** (marquage japonais des routes à double sens), les rives
 * blanches, des flaques et les traces de gomme des trajectoires de drift —
 * une sinusoïde qui traverse l'axe jaune, comme les vraies lignes de course
 * nocturnes peintes par les pneus.
 */
export function makeTougeRoadTexture(theme, random) {
  const width = 256;
  const height = 512;
  const roadHalf = theme.roadHalf ?? TOUGE_ROAD_HALF;
  const base = new THREE.Color(theme.roadTint ?? theme.asphalt ?? 0x14161d);
  const shade = (amount) => `rgb(${Math.round(base.r * 255 + amount)}, ${Math.round(base.g * 255 + amount)}, ${Math.round(base.b * 255 + amount)})`;
  const line = new THREE.Color(theme.laneColor || '#f4f1e8');
  const lineCss = (alpha) => `rgba(${Math.round(line.r * 255)}, ${Math.round(line.g * 255)}, ${Math.round(line.b * 255)}, ${alpha})`;
  const center = new THREE.Color(theme.centerLineColor || '#f2c230');
  const centerCss = (alpha) => `rgba(${Math.round(center.r * 255)}, ${Math.round(center.g * 255)}, ${Math.round(center.b * 255)}, ${alpha})`;
  const toPixel = (laneX) => width / 2 + (laneX / (roadHalf * 2)) * width;
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = shade(0);
    ctx.fillRect(0, 0, width, height);
    // Grain d'asphalte mouillé et réparations.
    for (let index = 0; index < 900; index += 1) {
      const tone = random() < 0.5 ? -12 : 14;
      ctx.fillStyle = shade(tone + random() * 8);
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 4);
    }
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = shade(-16 - random() * 8);
      const patchY = random() * height;
      ctx.fillRect(0, patchY, width, 6 + random() * 22);
    }
    // Flaques : reflets froids d'une nuit humide.
    for (let index = 0; index < 26; index += 1) {
      ctx.fillStyle = `rgba(170,195,235,${0.04 + random() * 0.07})`;
      ctx.beginPath();
      ctx.ellipse(random() * width, random() * height, 8 + random() * 22, 3 + random() * 8, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Traces de gomme : la trajectoire des courses nocturnes zigzague entre les
    // deux voies en traversant l'axe jaune — c'est le fantôme des dérapages.
    for (let index = 0; index < 70; index += 1) {
      const drift = Math.sin(index * 0.21) * width * 0.17;
      ctx.fillStyle = `rgba(8,8,10,${0.05 + random() * 0.13})`;
      ctx.fillRect(width / 2 + drift - 12, random() * height, 24, 14 + random() * 26);
    }
    // Ligne jaune centrale : CONTINUE sur toute la longueur, largeur d'une
    // vraie ligne (16 cm), peint sobrement sur les deux voies.
    const paintWidth = Math.max(2, (CITY_RUSH_LANE_PAINT_WIDTH / (roadHalf * 2)) * width);
    ctx.fillStyle = centerCss(0.92);
    ctx.fillRect(width / 2 - paintWidth / 2, 0, paintWidth, height);
    // Rives blanches continues.
    ctx.fillStyle = lineCss(0.9);
    ctx.fillRect(toPixel(-roadHalf + 0.06) , 0, width * 0.03, height);
    ctx.fillRect(toPixel(roadHalf - 0.09), 0, width * 0.03, height);
    // Poussière et feuilles mortes sur les bords.
    for (let index = 0; index < 220; index += 1) {
      ctx.fillStyle = `rgba(120,110,80,${0.05 + random() * 0.1})`;
      const edge = random() < 0.5 ? random() * width * 0.14 : width - random() * width * 0.14;
      ctx.fillRect(edge, random() * height, 2 + random() * 7, 2 + random() * 5);
    }
  }, width, height, { smooth: true, repeat: true });
}

// Accotement de la route de col : gravier tassé sombre, mousse et aiguilles.
function makeTougeVergeTexture(theme, random) {
  const width = 128;
  const height = 512;
  const base = new THREE.Color(theme.sidewalkTint ?? 0x1c2230);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    for (let index = 0; index < 800; index += 1) {
      const tone = random();
      ctx.fillStyle = tone < 0.55
        ? `rgba(70,66,58,${0.14 + random() * 0.2})`
        : tone < 0.85
          ? `rgba(46,58,44,${0.16 + random() * 0.22})`
          : `rgba(150,140,110,${0.08 + random() * 0.14})`;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 4);
    }
    // Touffes de mousse.
    for (let index = 0; index < 60; index += 1) {
      ctx.fillStyle = `rgba(52,88,52,${0.2 + random() * 0.3})`;
      ctx.fillRect(random() * width, random() * height, 2 + random() * 4, 2 + random() * 3);
    }
  }, width, height, { smooth: true, repeat: true });
}

// Sol de la montagne : terre sombre, mousse et aiguilles de cèdre.
function makeTougeGroundTexture(theme, random) {
  const width = 256;
  const height = 512;
  const base = new THREE.Color(theme.ground ?? 0x0c1220);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    for (let index = 0; index < 1400; index += 1) {
      const tone = random();
      ctx.fillStyle = tone < 0.5
        ? `rgba(36,64,44,${0.12 + random() * 0.2})`
        : tone < 0.8
          ? `rgba(28,26,34,${0.16 + random() * 0.22})`
          : `rgba(96,84,60,${0.08 + random() * 0.14})`;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 4, 1 + random() * 5);
    }
    // Aiguilles de cèdre.
    for (let index = 0; index < 200; index += 1) {
      ctx.fillStyle = `rgba(58,42,30,${0.25 + random() * 0.3})`;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 2, 3 + random() * 4);
    }
  }, width, height, { smooth: true, repeat: true });
}

/**
 * Route de la峠道 : ruban étroit de 6,80 m, accotements de gravier, puis la
 * terre sombre de la montagne à perte de vue. Même contrat que `makeRoad` et
 * `makeNordschleifeRoad` : la géométrie suit le relief et la courbe du col, la
 * texture défile avec la distance parcourue.
 */
export function makeTougeRoad(scene, theme, random, playerZ, profile = CITY_RUSH_TRACK_PROFILE_TOUGE) {
  const roadHalf = theme.roadHalf ?? TOUGE_ROAD_HALF;
  const vergeOuter = roadHalf + (TOUGE_VERGE_OUTER - TOUGE_ROAD_HALF);
  const roadTexture = makeTougeRoadTexture(theme, random);
  roadTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / ROAD_TILE_LENGTH);
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.82,
    metalness: 0.06,
    flatShading: true,
  });
  const road = new THREE.Mesh(makeCurvedStripGeometry(-roadHalf, roadHalf, -0.05), roadMaterial);
  road.receiveShadow = true;
  road.frustumCulled = false;
  scene.add(road);

  const vergeTexture = makeTougeVergeTexture(theme, random);
  vergeTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / 6);
  const vergeMaterial = new THREE.MeshStandardMaterial({ map: vergeTexture, roughness: 0.98, flatShading: true });
  const kerbMaterial = standard(theme.curb ?? 0x3a4152, { roughness: 0.86 });
  // Au-delà de l'accotement : la forêt de la montagne, sombre jusqu'à la brume.
  const groundTexture = makeTougeGroundTexture(theme, random);
  groundTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / 24);
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1, flatShading: true });
  const ground = new THREE.Mesh(makeCurvedStripGeometry(-210, 210, -0.12), groundMaterial);
  ground.receiveShadow = true;
  ground.frustumCulled = false;
  scene.add(ground);

  const strips = [
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(-vergeOuter, -roadHalf, 0.02), vergeMaterial), inner: -vergeOuter, outer: -roadHalf },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(roadHalf, vergeOuter, 0.02), vergeMaterial), inner: roadHalf, outer: vergeOuter },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(-roadHalf - 0.12, -roadHalf + 0.12, 0.0), kerbMaterial), inner: -roadHalf - 0.12, outer: -roadHalf + 0.12 },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(roadHalf - 0.12, roadHalf + 0.12, 0.0), kerbMaterial), inner: roadHalf - 0.12, outer: roadHalf + 0.12 },
  ];
  strips.forEach(({ mesh }, index) => {
    mesh.receiveShadow = index < 2;
    mesh.frustumCulled = false;
    scene.add(mesh);
  });

  const updateCurve = (distance = 0) => {
    updateCurvedStrip(ground, -210, 210, distance, playerZ, profile);
    updateCurvedStrip(road, -roadHalf, roadHalf, distance, playerZ, profile);
    strips.forEach(({ mesh, inner, outer }) => updateCurvedStrip(mesh, inner, outer, distance, playerZ, profile));
  };
  updateCurve(0);

  return {
    scroll(worldTravel, distance = 0) {
      roadTexture.offset.y += worldTravel / ROAD_TILE_LENGTH;
      vergeTexture.offset.y += worldTravel / 6;
      groundTexture.offset.y += worldTravel / 24;
      if (roadTexture.offset.y > 1000) roadTexture.offset.y -= 1000;
      if (vergeTexture.offset.y > 1000) vergeTexture.offset.y -= 1000;
      if (groundTexture.offset.y > 1000) groundTexture.offset.y -= 1000;
      updateCurve(distance);
    },
  };
}

// ─── Décor ──────────────────────────────────────────────────────────────────
/** Intervalle de tour [début, fin] en mètres de piste, hors zone de départ. */
export function tougeTrackRanges(fromFraction, toFraction, lapLength = LAP) {
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
    .filter(([a, b]) => b - a > 0.5);
}

/** Cèdre japonais (sugi) : tronc haut et futaie sombre en cônes étagés. */
function addCedar(bend, m, x, z, random, scale = 1) {
  const height = (6.4 + random() * 4.6) * scale;
  bend.cylinder(m.trunk, [x, height * 0.14, z], 0.14 * scale, 0.22 * scale, height * 0.3, 6);
  const dark = random() < 0.5 ? m.foliage : m.foliageLight;
  bend.cone(dark, [x, height * 0.4, z], 1.35 * scale, height * 0.44, 7);
  bend.cone(dark, [x, height * 0.66, z], 0.95 * scale, height * 0.4, 7);
  bend.cone(m.foliageLight, [x, height * 0.88, z], 0.55 * scale, height * 0.3, 7);
}

/** Touffe de bambou : troncs fins verticaux, feuillage léger en haut. */
function addBamboo(bend, m, x, z, random) {
  const count = 3 + Math.floor(random() * 3);
  for (let index = 0; index < count; index += 1) {
    const offset = (index - (count - 1) / 2) * 0.16;
    const height = 3.4 + random() * 2.2;
    bend.cylinder(m.bamboo, [x + offset, height / 2, z + (random() - 0.5) * 0.3], 0.035, 0.05, height, 5);
  }
  bend.cone(m.foliageLight, [x, 4.6 + random() * 0.8, z], 0.5, 1.6, 6);
}

/** Garde-corps japonais : poutre en acier galvanisé sur poteaux rapprochés. */
function addGuardrail(bend, m, side, from, to) {
  const railX = side * (TOUGE_ROAD_HALF + 0.55);
  const length = to - from;
  if (length <= 1) return;
  const middle = (from + to) / 2;
  // La poutre est découpée par le lot (tronçons de 12 m) pour suivre les épingles.
  bend.box(m.steel, [railX, 0.56, toZ(middle)], [0.09, 0.3, length]);
  bend.box(m.steel, [railX, 0.86, toZ(middle)], [0.07, 0.16, length]);
  for (let position = from; position < to; position += 3) {
    bend.box(m.darkMetal, [railX + side * 0.08, 0.4, toZ(position)], [0.12, 0.95, 0.14]);
  }
}

/** Lampadaire de col : poteau acier, lanterne chaude et cône dans la brume. */
function addLampPost(bend, m, side, position) {
  const x = side * (TOUGE_ROAD_HALF + 1.1);
  const z = toZ(position);
  bend.cylinder(m.darkMetal, [x, 2.1, z], 0.07, 0.09, 4.2, 6);
  bend.box(m.darkMetal, [x - side * 0.55, 3.9, z], [0.06, 0.06, 1.1]);
  bend.box(m.darkMetal, [x - side * 0.55, 4.15, z], [0.5, 0.06, 0.06]);
  // Lanterne et son halo.
  bend.box(m.lampGlow, [x - side * 0.75, 4.0, z], [0.34, 0.42, 0.26]);
  bend.box(m.darkMetal, [x - side * 0.75, 4.32, z], [0.42, 0.08, 0.34]);
  bend.cone(m.lampCone, [x - side * 0.75, 2.1, z], 2.1, 3.4, 6);
}

/** Poteau électrique en bois avec ses câbles, le long de la route. */
function addPowerPole(bend, m, side, position, nextPosition) {
  const x = side * (TOUGE_ROAD_HALF + 2.4);
  const z = toZ(position);
  bend.cylinder(m.wood, [x, 2.75, z], 0.09, 0.13, 5.5, 6);
  bend.box(m.wood, [x, 4.7, z], [1.7, 0.07, 0.07]);
  for (const offset of [-0.7, 0, 0.7]) {
    bend.cylinder(m.darkMetal, [x + offset * side * 0.9, 4.7, z], 0.03, 0.03, 0.14, 5);
  }
  // Câbles jusqu'au poteau suivant, à 4,55 m : au-dessus des voitures, sous la caméra.
  const span = Math.max(1, nextPosition - position);
  const middle = (position + nextPosition) / 2;
  for (const sag of [4.55, 4.35, 4.15]) {
    bend.box(m.darkMetal, [x, sag, toZ(middle)], [0.025, 0.025, span], [0, 0, 0]);
  }
}

/** Panneau de secteur, nom japonais + transcription, au bord de la route. */
function addSectorBoard(bend, m, atlas, sector, side, position, height = 2.2) {
  const key = `sector:${sector.id}`;
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 3.4);
  const z = toZ(position);
  for (const offset of [-1.0, 1.0]) {
    bend.box(m.darkMetal, [x, height / 2, z + offset], [0.09, height, 0.09]);
  }
  bend.plane(m.signs, [x, height - 0.4, z], 2.9, 1.0, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Borne kilométrique : petit poteau blanc et sa plaque. */
function addKmStone(bend, m, atlas, side, position, km) {
  const key = `km:${Math.round(km)}`;
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 1.6);
  bend.box(m.white, [x, 0.32, toZ(position)], [0.16, 0.64, 0.42]);
  bend.plane(m.signs, [x - side * 0.09, 0.42, toZ(position)], 0.42, 0.32, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Panneau jaune à chevrons dans une épingle : il annonce la courbe. */
function addChevron(bend, m, atlas, side, position, direction) {
  const key = direction >= 0 ? 'chevron-right' : 'chevron-left';
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 2.2);
  const z = toZ(position);
  bend.box(m.darkMetal, [x, 0.75, z], [0.08, 1.5, 0.08]);
  bend.plane(m.signs, [x, 1.7, z], 1.2, 0.8, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Grand torii vermillon : deux piliers et deux linteaux enjamber la route. */
function addTorii(bend, m, atlas, position, scale = 1) {
  const z = toZ(position);
  const pillarHeight = 6.1 * scale;
  for (const side of [-1, 1]) {
    bend.cylinder(m.vermillion, [side * 3.9 * scale, pillarHeight / 2, z], 0.16 * scale, 0.2 * scale, pillarHeight, 7);
    // Pied de pierre.
    bend.box(m.stone, [side * 3.9 * scale, 0.18, z], [0.5 * scale, 0.36, 0.5 * scale]);
  }
  // Linteau supérieur, légèrement surélevé au centre comme un kasagi réel.
  bend.box(m.vermillion, [0, 6.55 * scale, z], [8.6 * scale, 0.34 * scale, 0.42 * scale], [0, 0, 0]);
  bend.box(m.black, [0, 6.28 * scale, z], [7.6 * scale, 0.14 * scale, 0.3 * scale]);
  // Linteau inférieur.
  bend.box(m.vermillion, [0, 5.35 * scale, z], [7.2 * scale, 0.22 * scale, 0.3 * scale]);
  // Plaque centrale.
  if (atlas.has('torii')) {
    bend.plane(m.signs, [0, 5.85 * scale, z + 0.22], 1.1 * scale, 0.7 * scale, null, { uv: atlas.uv('torii') });
    bend.plane(m.signs, [0, 5.85 * scale, z - 0.22], 1.1 * scale, 0.7 * scale, [0, Math.PI, 0], { uv: atlas.uv('torii') });
  }
}

/** Lanterne de pierre (tōrō) au bord de la route, lumière chaude. */
function addStoneLantern(bend, m, x, z, scale = 1) {
  bend.box(m.stone, [x, 0.22 * scale, z], [0.7 * scale, 0.44 * scale, 0.7 * scale]);
  bend.cylinder(m.stone, [x, 1.0 * scale, z], 0.14 * scale, 0.18 * scale, 1.3 * scale, 6);
  bend.box(m.stone, [x, 1.85 * scale, z], [0.62 * scale, 0.5 * scale, 0.62 * scale]);
  bend.box(m.lampGlow, [x, 1.85 * scale, z], [0.44 * scale, 0.32 * scale, 0.44 * scale]);
  bend.box(m.stone, [x, 2.3 * scale, z], [0.8 * scale, 0.16 * scale, 0.8 * scale]);
  bend.cone(m.stone, [x, 2.62 * scale, z], 0.52 * scale, 0.5 * scale, 6);
}

/** Distributeur de boissons, au sommet comme au bord des vraies routes. */
function addVendingMachine(bend, m, x, z, random) {
  const body = random() < 0.5 ? m.red : (random() < 0.5 ? m.blue : m.white);
  bend.box(body, [x, 0.9, z], [0.62, 1.8, 0.62]);
  bend.box(m.darkMetal, [x, 1.85, z], [0.66, 0.1, 0.66]);
  bend.box(m.lampGlow, [x, 0.95, z - 0.32], [0.5, 1.4, 0.03]);
  bend.box(m.black, [x, 0.35, z - 0.31], [0.4, 0.3, 0.02]);
}

/** Paroi rocheuse côté falaise, le long d'une épingle. */
function addRocks(bend, m, side, from, to, random) {
  for (let position = from; position < to; position += 3.2) {
    if (random() < 0.35) continue;
    const x = side * (TOUGE_ROAD_HALF + 4 + random() * 3.4);
    const z = toZ(position + random() * 2);
    const radius = 1.2 + random() * 1.8;
    bend.sphere(random() < 0.6 ? m.rock : m.rockDark, [x, radius * 0.55, z], radius, 7);
    if (random() < 0.5) {
      bend.sphere(m.rockDark, [x + side * 0.8, radius * 1.05, z + 1.2], radius * 0.7, 6);
    }
    if (random() < 0.4) bend.sphere(m.moss, [x - side * 0.5, radius * 0.2, z - 1.4], radius * 0.55, 6);
  }
}

/** Nappes de brume basses le long d'un secteur. */
function addMist(bend, m, from, to, random) {
  for (let position = from; position < to; position += 26 + random() * 14) {
    const x = (random() - 0.5) * 14;
    const z = toZ(position);
    const width = 12 + random() * 10;
    bend.plane(m.mist, [x, 1.2 + random() * 2.6, z], width, width * 0.55, [-Math.PI / 2, 0, 0]);
  }
}

/** Tache de neige au sol, autour du sommet. */
function addSnowPatch(bend, m, x, z, random) {
  bend.plane(m.snow, [x, 0.015, z], 4 + random() * 5, 3 + random() * 4, [-Math.PI / 2, 0, 0]);
}

/** Montagne enneigée lointaine : un cône régulier qui émerge de la brume. */
function addMountain(bend, m, x, z, scale = 1) {
  const height = 34 * scale;
  bend.cone(m.rockDark, [x, height * 0.42, z], 13 * scale, height, 9);
  bend.cone(m.snow, [x, height * 0.86, z], 13 * scale * 0.42, height * 0.3, 9);
}

/** Maison de montagne japonaise : murs de bois, toit de tuiles sombres. */
function addHouse(bend, m, x, z, random, side = 1) {
  const width = 4.2 + random() * 1.6;
  const depth = 4.6 + random() * 1.4;
  const height = 2.6 + random() * 0.8;
  bend.box(m.wood, [x, height / 2, z], [width, height, depth]);
  bend.box(m.roofTile, [x, height + 0.55, z], [width + 0.7, 1.1, depth + 0.7], [0, 0, side * 0.3]);
  // Fenêtres éclairées de l'intérieur.
  bend.box(m.window, [x - side * (width / 2 - 0.06), height * 0.55, z - 1.2], [0.08, 0.8, 0.9]);
  bend.box(m.window, [x - side * (width / 2 - 0.06), height * 0.55, z + 1.2], [0.08, 0.8, 0.9]);
  // Cheminée.
  bend.box(m.rockDark, [x + side * 0.9, height + 1.15, z - depth * 0.25], [0.4, 0.9, 0.4]);
}

/**
 * Décor complet de la峠道. Même contrat que `buildNordschleifeTrack` : les
 * primitives statiques sont empilées dans `batch` (fusionnées par matériau
 * puis déformées par la boucle), les éléments animés (lucioles) sont renvoyés
 * dans `dynamicProps`.
 */
export function buildTougeTrack({ city, theme, materials: m, batch, cityIndex, lite = false, route = CITY_RUSH_TOUGE } = {}) {
  const random = seededRandom(1965 + (cityIndex || 0) * 7919);
  // Les matériaux de la route de col complètent ceux de la ville.
  Object.assign(m, createTougeMaterials(city, theme, random));
  const atlas = buildTougeSignAtlas(city, theme, route);
  m.signs = atlas.material;
  m.sponsorCount = (theme.sponsors || []).length;
  const bend = bendAware(batch);
  const dynamicProps = [];
  const sectors = route.sectors || [];

  // ── Garde-corps des deux côtés, sauf dans la zone de départ ─────────────
  for (const side of [-1, 1]) {
    addGuardrail(bend, m, side, LOOP_START, LOOP_END);
  }

  // ── Forêt de cèdres : la montagne est boisée jusqu'à la brume ────────────
  for (let position = LOOP_START - 6; position < LOOP_END + 6; position += lite ? 3.4 : 2.6) {
    for (const side of [-1, 1]) {
      if (random() < (lite ? 0.3 : 0.42)) continue;
      const x = side * (TOUGE_ROAD_HALF + 9 + random() * (lite ? 18 : 30));
      const z = toZ(position + random() * 2.4);
      if (random() < 0.86) addCedar(bend, m, x, z, random, 0.85 + random() * 0.5);
      else addBamboo(bend, m, x, z, random);
    }
  }

  // ── Lampadaires et poteaux électriques le long de la route ──────────────
  let lampSide = -1;
  let poleSide = 1;
  for (let position = LOOP_START; position < LOOP_END; position += lite ? 96 : 64) {
    addLampPost(bend, m, lampSide, position + random() * 10);
    lampSide = -lampSide;
  }
  for (let position = LOOP_START; position < LOOP_END - 48; position += lite ? 144 : 96) {
    addPowerPole(bend, m, poleSide, position, position + (lite ? 144 : 96));
    poleSide = -poleSide;
  }

  // ── Bornes kilométriques : un kilomètre réel tous les 125 m de piste ────
  for (let position = LOOP_START; position < LOOP_END; position += 125) {
    const km = Math.round((position / LAP) * route.lengthKm);
    addKmStone(bend, m, atlas, position % 250 < 125 ? -1 : 1, position, km);
  }

  // ── Secteur par secteur : la montée réelle du col ───────────────────────
  sectors.forEach((sector, sectorIndex) => {
    const ranges = tougeTrackRanges(sector.from, sector.to);
    ranges.forEach(([from, to]) => {
      const middle = (from + to) / 2;
      const side = sector.side || (sectorIndex % 2 ? 1 : -1);
      const opposite = -side;

      addSectorBoard(bend, m, atlas, sector, side, from + 1.6);

      // Panneau de limite au début de la montée et au retour du village.
      if (sectorIndex === 0 || sectorIndex === sectors.length - 1) {
        const x = opposite * (TOUGE_ROAD_HALF + 2.2);
        bend.box(m.darkMetal, [x, 1.1, toZ(from + 3)], [0.08, 2.2, 0.08]);
        bend.plane(m.signs, [x, 2.0, toZ(from + 3)], 0.9, 0.9, signRotation(opposite > 0 ? -1 : 1), { uv: atlas.uv('limit') });
      }

      switch (sector.kind) {
        case 'hairpins':
          // Les épingles : chevrons jaunes côté extérieur, falaises, réflecteurs
          // sur la ligne jaune pour les lire dans les phares.
          for (let position = from + 4; position < to - 2; position += 12) {
            addChevron(bend, m, atlas, side, position, sectorIndex % 2 ? 1 : -1);
          }
          addRocks(bend, m, side, from, to, random);
          for (let position = from; position < to; position += 8) {
            bend.box(m.reflector, [0, 0.03, toZ(position)], [0.09, 0.05, 0.18]);
          }
          break;
        case 'straight':
          // L'allée de cèdres : des arbres très serrés des deux côtés, en
          // tunnel végétal — la ligne droite de la montée.
          for (let position = from; position < to; position += 4.2) {
            for (const treeSide of [-1, 1]) {
              addCedar(bend, m, treeSide * (TOUGE_ROAD_HALF + 3.4 + random() * 3), toZ(position + random() * 2), random, 1.05 + random() * 0.25);
            }
          }
          break;
        case 'climb':
          // La pente du torii : le grand torii enjambe la route au milieu du secteur.
          addTorii(bend, m, atlas, middle, 1);
          addStoneLantern(bend, m, side * (TOUGE_ROAD_HALF + 2.6), toZ(middle - 6), 1);
          addStoneLantern(bend, m, opposite * (TOUGE_ROAD_HALF + 2.6), toZ(middle + 6), 0.9);
          addRocks(bend, m, opposite, from, to, random);
          break;
        case 'summit':
          // Le sommet : plateforme panorama avec distributeurs, banc, neige au
          // sol, panneau du col et une montagne enneigée qui émerge de la brume.
          for (let step = 0; step < 3; step += 1) {
            bend.box(m.concrete, [side * (TOUGE_ROAD_HALF + 2.4 + step * 1.6), 0.14 + step * 0.22, toZ(middle)], [2.6, 0.28 + step * 0.44, 9]);
          }
          for (let index = 0; index < 3; index += 1) {
            addVendingMachine(bend, m, side * (TOUGE_ROAD_HALF + 3.2 + index * 1.1), toZ(middle - 3 + index * 2.6), random);
          }
          // Banc de pierre et lanterne.
          bend.box(m.stone, [side * (TOUGE_ROAD_HALF + 5.6), 0.24, toZ(middle + 3.4)], [1.6, 0.48, 0.5]);
          addStoneLantern(bend, m, side * (TOUGE_ROAD_HALF + 5.2), toZ(middle - 3.6), 1.1);
          // Panneau du sommet.
          if (atlas.has('summit')) {
            const x = opposite * (TOUGE_ROAD_HALF + 2.4);
            bend.box(m.darkMetal, [x, 1.3, toZ(middle + 5)], [0.09, 2.6, 0.09]);
            bend.plane(m.signs, [x, 2.5, toZ(middle + 5)], 2.6, 0.9, signRotation(opposite > 0 ? -1 : 1), { uv: atlas.uv('summit') });
          }
          // Neige au sol et montagne enneigée au loin.
          for (let index = 0; index < 8; index += 1) {
            addSnowPatch(bend, m, (random() - 0.5) * 26, toZ(middle + (random() - 0.5) * 20), random);
          }
          addMountain(bend, m, opposite * 78, toZ(middle - 90), 1);
          addMountain(bend, m, side * 95, toZ(middle - 130), 0.7);
          break;
        case 'descent':
          // La descente dans la brume : nappes basses, réflecteurs, panneau.
          addMist(bend, m, from, to, random);
          for (let position = from; position < to; position += 10) {
            bend.box(m.reflector, [0, 0.03, toZ(position)], [0.09, 0.05, 0.18]);
          }
          if (atlas.has('mist')) {
            const x = side * (TOUGE_ROAD_HALF + 2.6);
            bend.box(m.darkMetal, [x, 1.2, toZ(from + 6)], [0.09, 2.4, 0.09]);
            bend.plane(m.signs, [x, 2.3, toZ(from + 6)], 2.4, 0.85, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv('mist') });
          }
          break;
        case 'start':
        case 'finish':
          // Le village : maisons de bois,峠茶屋 (salon de thé du col) et
          // lanternes de pierre de part et d'autre de la route.
          for (let position = from + 4; position < to - 2; position += 11) {
            const houseSide = random() < 0.5 ? -1 : 1;
            addHouse(bend, m, houseSide * (TOUGE_ROAD_HALF + 6 + random() * 4), toZ(position), random, houseSide);
            if (random() < 0.5) addStoneLantern(bend, m, -houseSide * (TOUGE_ROAD_HALF + 2.2), toZ(position + 3), 0.85);
          }
          break;
        default:
          break;
      }

      // Panneau publicitaire de temps en temps, au bord de la route.
      if (!lite && sectorIndex % 4 === 2 && from > LOOP_START + 10) {
        const key = `sponsor:${(sectorIndex + 1) % Math.max(1, m.sponsorCount || 5)}`;
        if (atlas.has(key)) {
          const x = side * (TOUGE_ROAD_HALF + 3.2);
          bend.plane(m.signs, [x, 1.15, toZ(from + 3)], 3.2, 0.95, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
          bend.box(m.darkMetal, [x, 0.4, toZ(from + 3)], [0.09, 0.8, 3.2]);
        }
      }
    });
  });

  // ── Lucioles de la nuit de montagne : elles scintillent au-dessus de la
  // route, en montée comme en descente (éléments animés, hors du lot).
  const fireflyBanks = [
    { from: 0.24, to: 0.42, y: 1.6 },
    { from: 0.72, to: 0.9, y: 1.2 },
  ];
  for (const bank of fireflyBanks) {
    const middle = (bank.from + bank.to) / 2 * LAP;
    const group = new THREE.Group();
    const material = unlit(0xffe9a0, { transparent: true, opacity: 0.7, depthWrite: false });
    const fireflies = [];
    const count = lite ? 6 : 11;
    for (let index = 0; index < count; index += 1) {
      const firefly = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 4), material);
      firefly.position.set(
        (random() - 0.5) * 11,
        bank.y + random() * 2.2,
        (random() - 0.5) * 7,
      );
      firefly.userData.phase = random() * Math.PI * 2;
      firefly.userData.speed = 0.6 + random() * 1.1;
      group.add(firefly);
      fireflies.push(firefly);
    }
    let wave = random() * Math.PI * 2;
    dynamicProps.push({
      group,
      trackPos: middle,
      x: 0,
      y: 0,
      side: 1,
      // Scintillement et dérive lente, comme les lucioles d'une nuit d'été.
      update(dt) {
        wave += dt * 1.4;
        fireflies.forEach((firefly, index) => {
          const phase = firefly.userData.phase + wave * firefly.userData.speed;
          material.opacity = 0.25 + 0.6 * Math.abs(Math.sin(phase + index));
          firefly.position.y = bank.y + (index % 3) * 0.7 + Math.sin(phase * 0.8) * 0.5;
          firefly.position.x += Math.sin(phase * 0.5) * dt * 0.4;
        });
      },
    });
  }

  for (const prop of dynamicProps) {
    prop.group.position.set(prop.x, prop.y, toZ(prop.trackPos));
  }

  return { dynamicProps, atlas, random, gantries: [] };
}
