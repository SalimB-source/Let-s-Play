// ── Mont Haruna · le tōgé de nuit ───────────────────────────────────────────
//
// Le tōgé n'est pas une ville : ni trottoirs, ni vitrines, ni néons de boutiques.
// Une chaussée étroite (6,40 m) descend la montagne entre glissières à
// réflecteurs, murs de roche, cèdres noirs et lampadaires orange espacés.
// Ce module remplace `buildCityLoop` et `makeRoad` pour le parcours `touge` :
// il pose le ruban d'asphalte, ses bas-côtés de mousse, ses glissières et,
// secteur par secteur, les repères de la descente — le premier tunnel et son
// sodium, les cinq épingles et leurs flèches jaunes, la paroi de 岩垂壁, le
// pont du ravin, les trois épingles du final, l'aire du belvédère avec ses
// distributeurs allumés, et la rive du lac qui reflète la lune.
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_LANE_PAINT_WIDTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TOUGE_ROAD_HALF,
  CITY_RUSH_TRACK_PROFILE_TOUGE,
  cityRushLaneSeparators,
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
// Chaussée du tōgé : 3,20 m de demi-largeur, les deux voies centrées à ±1,05 m
// et un accotement d'un mètre avant la glissière.
export const TOUGE_ROAD_HALF = CITY_RUSH_TOUGE_ROAD_HALF;
export const TOUGE_VERGE_OUTER = TOUGE_ROAD_HALF + 2.4;
const LOOP_START = START_ZONE_HALF + 2;
const LOOP_END = LAP - START_ZONE_HALF - 2;
// Dégagement caméra : la poursuite culmine à 6,7 m, tout ce qui enjambe la
// route (portique du tunnel, panneau du pont) reste au-dessus de 7,4 m.
const CAMERA_CLEARANCE = 7.4;

const toZ = (trackMeters) => -trackMeters * SCALE;
// Police japonaise des panneaux, comme sur la Shuto C1.
const JP_FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "Meiryo", sans-serif';

// Orientation d'un panneau : les plaques de bord de route regardent la route
// (normale vers l'intérieur), celles qui enjambent la route regardent le
// pilote qui arrive.
function signRotation(facing) {
  if (facing === 0) return [0, 0, 0];
  return [0, facing > 0 ? Math.PI / 2 : -Math.PI / 2, 0];
}

// Le décor fusionné est déformé une fois par la boucle : une primitive trop
// longue ne suivrait la courbe qu'à ses extrémités. Les épingles du tōgé
// tournent plus court que les appuis du Ring, si bien que glissières et
// parois sont découpées en tronçons de huit unités monde (et non douze).
const BEND_SEGMENT = 8;

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

function TOUGH_ROAD_HALF_EDGE() {
  return TOUGE_ROAD_HALF - TOUGH_EDGE_INSET;
}

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04, flatShading: true, ...extra });
}

function unlit(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
}

// ─── Signalisation japonaise ────────────────────────────────────────────────
// Les panneaux du tōgé suivent la norme nippone : plaques bleu nuit à texte
// blanc pour les lieux, losanges jaunes pour les dangers, disques à liseré
// rouge pour les limitations, flèches rouge et blanche dans les épingles, et
// les miroirs convexes ronds au-dessus des virages en aveugle.
export function drawTougeSignCell(ctx, width, height, entry) {
  const variant = entry.variant || 'plate';
  ctx.clearRect(0, 0, width, height);
  if (variant === 'warn') {
    // Losange jaune de danger, liseré noir : 急カーブ avant chaque épingle.
    const size = Math.min(width, height) * 0.94;
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#f4c431';
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.lineWidth = size * 0.08;
    ctx.strokeStyle = '#17181c';
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
    ctx.fillStyle = '#17181c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(size * 0.3)}px ${JP_FONT}`;
    ctx.fillText(entry.text || '急', cx, cy - size * 0.08);
    if (entry.sub) {
      ctx.font = `700 ${Math.round(size * 0.14)}px ${JP_FONT}`;
      ctx.fillText(entry.sub, cx, cy + size * 0.22);
    }
    return;
  }
  if (variant === 'chevron') {
    // Flèches d'épingle : palette rouge et blanche, une à quatre pointes.
    const segments = Math.max(1, Math.round(entry.count || 3));
    for (let index = 0; index < segments; index += 1) {
      const step = width / segments;
      ctx.fillStyle = index % 2 ? '#f4f1e8' : '#c8382f';
      ctx.beginPath();
      ctx.moveTo(index * step + step * 0.08, height * 0.16);
      ctx.lineTo(index * step + step * 0.62, height * 0.5);
      ctx.lineTo(index * step + step * 0.08, height * 0.84);
      ctx.lineTo(index * step + step * 0.86, height * 0.84);
      ctx.lineTo(index * step + step * 1.4 - step * 0.78, height * 0.5);
      ctx.lineTo(index * step + step * 0.86, height * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (variant === 'mirror') {
    // Miroir convexe de virage : cercle d'acier cerclé d'orange, ciel et
    // route renvoyés en deux tons.
    const size = Math.min(width, height) * 0.92;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f4c431';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2 * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = '#9db8c8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.62, size / 2 * 0.82, 0, Math.PI);
    ctx.fillStyle = '#39424a';
    ctx.fill();
    return;
  }
  if (variant === 'limit') {
    // Disque de limitation : liseré rouge, chiffre blanc sur bleu nuit.
    const size = Math.min(width, height) * 0.94;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f4f1e8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2 * 0.94, 0, Math.PI * 2);
    ctx.fillStyle = '#c8382f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 2 * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#f4f1e8';
    ctx.fill();
    ctx.fillStyle = '#17181c';
    ctx.font = `900 ${Math.round(size * 0.4)}px "Orbitron", ${JP_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(entry.text ?? ''), width / 2, height * 0.54);
    return;
  }
  if (variant === 'sponsor') {
    // Bâches de sponsors de nuit, cousues sur les glissières des épingles.
    const accent = entry.color || '#ff5b5b';
    ctx.fillStyle = entry.background || '#171b24';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width * 0.16, height);
    ctx.fillStyle = entry.textColor || '#f4f1e8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(height * 0.34)}px ${JP_FONT}`;
    ctx.fillText(entry.text || '', width * 0.22, height * 0.42);
    ctx.fillStyle = 'rgba(244, 241, 232, .55)';
    ctx.font = `700 ${Math.round(height * 0.17)}px "Orbitron", ${JP_FONT}`;
    ctx.fillText(entry.sub || '', width * 0.22, height * 0.76);
    return;
  }
  if (variant === 'start') {
    // Bannière du départ : fond nuit, lettrage 榛名山 et liseré de lune.
    ctx.fillStyle = '#0c1120';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#8fd8ff';
    ctx.lineWidth = Math.max(3, height * 0.05);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, width - ctx.lineWidth * 2, height - ctx.lineWidth * 2);
    ctx.fillStyle = '#f2f4ee';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(height * 0.4)}px ${JP_FONT}`;
    ctx.fillText(entry.text || '榛名山', width / 2, height * 0.45);
    ctx.fillStyle = '#8fd8ff';
    ctx.font = `700 ${Math.round(height * 0.2)}px "Orbitron", ${JP_FONT}`;
    ctx.fillText(entry.sub || 'TŌGE', width / 2, height * 0.8);
    return;
  }
  if (variant === 'vending') {
    // Fronton de distributeur : bandeau rouge ou bleu, boisson dessinée.
    ctx.fillStyle = entry.color || '#ff4d5e';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(width * 0.08, height * 0.58, width * 0.84, height * 0.3);
    ctx.fillStyle = '#17181c';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(height * 0.3)}px ${JP_FONT}`;
    ctx.fillText(entry.text || '飲料', width * 0.1, height * 0.3);
    for (let index = 0; index < 4; index += 1) {
      ctx.fillStyle = ['#ff8a5c', '#ffd36b', '#8fe9ff', '#f2f4ee'][index % 4];
      ctx.fillRect(width * (0.12 + index * 0.2), height * 0.64, width * 0.12, height * 0.18);
    }
    return;
  }
  if (variant === 'flag') {
    // Lanterne de spectateur : lampion papier orange sur sa cage sombre.
    ctx.fillStyle = entry.color || '#ffb46b';
    ctx.fillRect(width * 0.16, height * 0.12, width * 0.68, height * 0.62);
    ctx.fillStyle = 'rgba(23, 24, 28, .8)';
    ctx.fillRect(width * 0.16, height * 0.12, width * 0.68, height * 0.1);
    ctx.fillRect(width * 0.16, height * 0.64, width * 0.68, height * 0.1);
    ctx.fillStyle = '#17181c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(height * 0.3)}px ${JP_FONT}`;
    ctx.fillText(entry.text || '峠', width / 2, height * 0.44);
    return;
  }
  // Plaque bleue standard (nom de secteur, tunnel, kilomètre) : la norme
  // japonaise des routes de montagne.
  ctx.fillStyle = entry.background || '#12325e';
  ctx.fillRect(3, 3, width - 6, height - 6);
  ctx.lineWidth = Math.max(3, height * 0.05);
  ctx.strokeStyle = entry.borderColor || '#f4f1e8';
  ctx.strokeRect(3, 3, width - 6, height - 6);
  const left = entry.badge ? height * 1.05 : width * 0.06;
  ctx.fillStyle = entry.textColor || '#f4f1e8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(height * (entry.big ? 0.42 : 0.36))}px ${JP_FONT}`;
  ctx.fillText(entry.text || '', left, entry.sub ? height * 0.4 : height * 0.54);
  if (entry.sub) {
    ctx.fillStyle = entry.subColor || 'rgba(244, 241, 232, .6)';
    ctx.font = `700 ${Math.round(height * 0.2)}px "Orbitron", ${JP_FONT}`;
    ctx.fillText(entry.sub, left, height * 0.75);
  }
  if (entry.badge) {
    ctx.fillStyle = entry.badgeColor || '#f4c431';
    ctx.fillRect(width * 0.03, height * 0.28, height * 0.44, height * 0.44);
    ctx.fillStyle = '#17181c';
    ctx.font = `900 ${Math.round(height * 0.3)}px "Orbitron", ${JP_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(entry.badge), width * 0.03 + height * 0.22, height * 0.52);
  }
}

/** Matériaux du tōgé : asphalte de nuit, glissières, roche, sodium, néons. */
export function createTougeMaterials(city, theme, random) {
  const tints = theme.materials || {};
  return {
    armco: standard(tints.armco ?? 0xb9c2c9, { metalness: 0.6, roughness: 0.44 }),
    armcoPost: standard(tints.armcoPost ?? 0x69727a, { metalness: 0.5, roughness: 0.56 }),
    reflector: unlit(tints.reflector ?? 0xffe9b0),
    reflectorOrange: unlit(0xff9a4d),
    concrete: standard(tints.concrete ?? 0x5c626c, { roughness: 0.94 }),
    concreteDark: standard(tints.concreteDark ?? 0x3c424c, { roughness: 0.95 }),
    rock: standard(tints.rock ?? 0x3a4048, { roughness: 1 }),
    rockDark: standard(tints.rockDark ?? 0x2a2f36, { roughness: 1 }),
    grass: standard(tints.grass ?? 0x243428, { roughness: 1 }),
    grassDark: standard(tints.grassDark ?? 0x182420, { roughness: 1 }),
    foliage: standard(tints.foliage ?? 0x16281e, { roughness: 0.96 }),
    foliageLight: standard(tints.foliageLight ?? 0x24402e, { roughness: 0.96 }),
    trunk: standard(tints.trunk ?? 0x2e2620, { roughness: 1 }),
    wood: standard(tints.wood ?? 0x4a3a2c, { roughness: 0.96 }),
    steel: standard(tints.steel ?? 0x77828c, { metalness: 0.58, roughness: 0.44 }),
    darkMetal: standard(tints.darkMetal ?? 0x22272e, { metalness: 0.42, roughness: 0.5 }),
    white: standard(tints.white ?? 0xf2f4ee, { roughness: 0.82 }),
    black: standard(0x14161a, { roughness: 0.86 }),
    slate: standard(tints.slate ?? 0x2a2e34, { roughness: 0.9 }),
    stone: standard(tints.stone ?? 0x4a4f56, { roughness: 0.96 }),
    gravel: standard(tints.gravel ?? 0x3a3c40, { roughness: 1 }),
    red: standard(tints.red ?? 0xc8382f, { roughness: 0.8 }),
    yellow: standard(tints.yellow ?? 0xf4c431, { roughness: 0.8 }),
    blue: standard(tints.blue ?? 0x2d4f9e, { roughness: 0.85 }),
    sodium: unlit(tints.sodium ?? 0xffb46b),
    sodiumGlass: unlit(0xffd9a8),
    vendingRed: unlit(tints.vendingRed ?? 0xff4d5e),
    vendingBlue: unlit(tints.vendingBlue ?? 0x4da3ff),
    water: new THREE.MeshStandardMaterial({ color: 0x0d1d33, roughness: 0.12, metalness: 0.7, flatShading: true }),
    signs: unlit(0xffffff, { side: THREE.DoubleSide }),
    lampGlow: unlit(0xffe2b0),
    accent: standard(city.accent, { emissive: city.accent, emissiveIntensity: 0.25 }),
    window: unlit(0x2f3a42),
  };
}

/** Atlas des panneaux du tōgé : secteurs, épingles, tunnel, sponsors. */
export function buildTougeSignAtlas(city, theme, route = CITY_RUSH_TOUGE) {
  const atlas = new SignAtlas({ cellWidth: 384, cellHeight: 128, columns: 4 });
  const keys = new Map();
  const add = (key, entry) => {
    if (keys.has(key)) return keys.get(key);
    const index = atlas.add(entry);
    keys.set(key, index);
    return index;
  };

  add('start', { draw: drawTougeSignCell, variant: 'start', text: '榛名山', sub: 'TŌGE · DESCENTE 13.8 KM' });
  for (const sector of route.sectors) {
    if (!sector.sign) continue;
    add(`sector:${sector.id}`, {
      draw: drawTougeSignCell,
      badge: sector.hairpins ? `${sector.hairpins}x` : route.marker,
      text: sector.sign.lines?.[0] || sector.name,
      sub: sector.sign.lines?.[1] || sector.romaji,
      background: sector.sign.hazard ? '#5e251c' : '#12325e',
      borderColor: sector.sign.hazard ? '#f4c431' : '#f4f1e8',
      badgeColor: sector.sign.hazard ? '#f4c431' : '#f4f1e8',
      textColor: '#f4f1e8',
      subColor: 'rgba(244, 241, 232, .65)',
    });
  }
  // Bornes kilométriques tous les kilomètres, depuis le col.
  for (let km = 0; km <= Math.round(route.lengthKm); km += 1) {
    add(`km:${km}`, { draw: drawTougeSignCell, text: `${km}`, sub: 'km · 榛名山' });
  }
  // Dangers et limitations de la descente.
  add('warn-hairpin', { draw: drawTougeSignCell, variant: 'warn', text: '急カーブ', sub: 'ヘアピン' });
  add('warn-falling', { draw: drawTougeSignCell, variant: 'warn', text: '落下', sub: '注意' });
  add('warn-animal', { draw: drawTougeSignCell, variant: 'warn', text: '動物', sub: '出没' });
  add('warn-ice', { draw: drawTougeSignCell, variant: 'warn', text: '凍結', sub: '注意' });
  add('limit-40', { draw: drawTougeSignCell, variant: 'limit', text: '40' });
  add('limit-30', { draw: drawTougeSignCell, variant: 'limit', text: '30' });
  add('chevrons-left', { draw: drawTougeSignCell, variant: 'chevron', count: 3 });
  add('chevrons-right', { draw: drawTougeSignCell, variant: 'chevron', count: 4 });
  add('mirror', { draw: drawTougeSignCell, variant: 'mirror' });
  add('tunnel', { draw: drawTougeSignCell, text: 'とうげトンネル', sub: 'TUNNEL · 630 M', big: true });
  (theme.sponsors || []).forEach((text, index) => {
    add(`sponsor:${index}`, {
      draw: drawTougeSignCell,
      variant: 'sponsor',
      text,
      sub: 'MONT HARUNA · TŌGE',
      color: index % 2 ? '#8fd8ff' : '#ff5b5b',
      background: '#141923',
    });
  });
  add('vending-red', { draw: drawTougeSignCell, variant: 'vending', text: '飲料', color: '#ff4d5e' });
  add('vending-blue', { draw: drawTougeSignCell, variant: 'vending', text: 'コーヒー', color: '#4da3ff' });
  add('lantern', { draw: drawTougeSignCell, variant: 'flag', text: '峠', color: '#ffb46b' });
  add('lantern-white', { draw: drawTougeSignCell, variant: 'flag', text: '月', color: '#f2f4ee' });

  const texture = atlas.build();
  return {
    material: new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide }),
    uv: (key) => atlas.uvFor(keys.get(key) ?? 0),
    has: (key) => keys.has(key),
    count: keys.size,
  };
}

// ─── Route ──────────────────────────────────────────────────────────────────
// Bitume de montagne de nuit : deux voies sombres, une ligne discontinue au
// centre, deux lignes de rive, et les yeux de chat peints qui renvoient les
// phares. Les traces de gomme suivent la trajectoire de corde des épingles.
export function makeTougeRoadTexture(theme, random) {
  const width = 256;
  const height = 512;
  const roadHalf = theme.roadHalf ?? TOUGE_ROAD_HALF;
  const base = new THREE.Color(theme.roadTint ?? theme.asphalt ?? 0x1d2027);
  const shade = (amount) => `rgb(${Math.round(base.r * 255 + amount)}, ${Math.round(base.g * 255 + amount)}, ${Math.round(base.b * 255 + amount)})`;
  const toPixel = (laneX) => width / 2 + (laneX / (roadHalf * 2)) * width;
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = shade(0);
    ctx.fillRect(0, 0, width, height);
    // Grain d'asphalte et rapiècements de la déneigeuse.
    for (let index = 0; index < 700; index += 1) {
      const tone = random() < 0.5 ? -10 : 12;
      ctx.fillStyle = shade(tone + random() * 6);
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 4);
    }
    for (let index = 0; index < 4; index += 1) {
      ctx.fillStyle = shade(-12 - random() * 6);
      ctx.fillRect(0, random() * height, width, 5 + random() * 18);
    }
    // Traces de gomme : deux trajectoires qui croisent dans les épingles.
    for (const laneCenter of [0.32, 0.68]) {
      for (let index = 0; index < 50; index += 1) {
        const drift = Math.sin(index * 0.31) * width * 0.05;
        ctx.fillStyle = `rgba(8, 8, 10, ${0.06 + random() * 0.12})`;
        ctx.fillRect(laneCenter * width - 12 + drift, random() * height, 24, 12 + random() * 24);
      }
    }
    // Ligne centrale discontinue blanche — une route à double sens blanc sur
    // blanc, personne ne vient en face cette nuit : la descente est fermée.
    const paintWidth = Math.max(2, (CITY_RUSH_LANE_PAINT_WIDTH / (roadHalf * 2)) * width);
    const dash = height / 4;
    ctx.fillStyle = 'rgba(232, 236, 242, .8)';
    for (let y = 0; y < height; y += dash) ctx.fillRect(width / 2 - paintWidth / 2, y, paintWidth, dash * 0.38);
    // Lignes de rive continues.
    ctx.fillStyle = 'rgba(232, 236, 242, .85)';
    const edgeLeft = toPixel(-TOUGH_ROAD_HALF_EDGE());
    const edgeRight = toPixel(TOUGH_ROAD_HALF_EDGE());
    ctx.fillRect(edgeLeft - paintWidth / 2, 0, paintWidth, height);
    ctx.fillRect(edgeRight - paintWidth / 2, 0, paintWidth, height);
    // Yeux de chat peints au bord des rives, un carreau sur deux.
    ctx.fillStyle = 'rgba(255, 233, 176, .9)';
    for (let y = height * 0.125; y < height; y += height / 4) {
      ctx.fillRect(edgeLeft - 2, y, 4, 6);
      ctx.fillRect(edgeRight - 2, y, 4, 6);
    }
    // Feuilles mortes et graviers poussés sur l'accotement.
    for (let index = 0; index < 160; index += 1) {
      const edge = random() < 0.5 ? random() * width * 0.12 : width - random() * width * 0.12;
      ctx.fillStyle = `rgba(122, 96, 60, ${0.05 + random() * 0.1})`;
      ctx.fillRect(edge, random() * height, 2 + random() * 4, 2 + random() * 3);
    }
  }, width, height, { smooth: true, repeat: true });
}

// Décalage des lignes de rive depuis le bord de chaussée (les deux côtés).
const TOUGH_EDGE_INSET = 0.22;

// Mousse et gravier des bas-côtés : vert très sombre la nuit, bandes fauchées.
function makeMossTexture(theme, random) {
  const width = 128;
  const height = 512;
  const base = new THREE.Color(theme.sidewalkTint ?? 0x243428);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    for (let band = 0; band < 14; band += 1) {
      ctx.fillStyle = band % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.08)';
      ctx.fillRect(0, band * (height / 14), width, height / 14);
    }
    for (let index = 0; index < 620; index += 1) {
      const tone = random();
      ctx.fillStyle = tone < 0.6
        ? `rgba(48, 74, 54, ${0.12 + random() * 0.2})`
        : tone < 0.9
          ? `rgba(26, 40, 30, ${0.14 + random() * 0.22})`
          : `rgba(92, 84, 66, ${0.08 + random() * 0.16})`;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 4);
    }
  }, width, height, { smooth: true, repeat: true });
}

/**
 * Route du tōgé : ruban étroit, bas-côtés de mousse, forêt noire à perte de
 * vue. Même contrat que `makeRoad` : la géométrie suit le relief et la courbe
 * de la descente, la texture défile avec la distance parcourue.
 */
export function makeTougeRoad(scene, theme, random, playerZ, profile = CITY_RUSH_TRACK_PROFILE_TOUGE) {
  const roadHalf = theme.roadHalf ?? TOUGE_ROAD_HALF;
  const vergeOuter = roadHalf + 2.4;
  const roadTexture = makeTougeRoadTexture(theme, random);
  roadTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / ROAD_TILE_LENGTH);
  // Nuit sèche : un peu de réflectivité pour attraper les phares.
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.62,
    metalness: 0.16,
    flatShading: true,
  });
  const road = new THREE.Mesh(makeCurvedStripGeometry(-roadHalf, roadHalf, -0.05), roadMaterial);
  road.receiveShadow = true;
  road.frustumCulled = false;
  scene.add(road);

  const vergeTexture = makeMossTexture(theme, random);
  vergeTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / 6);
  const vergeMaterial = new THREE.MeshStandardMaterial({ map: vergeTexture, roughness: 0.98, flatShading: true });
  // Au-delà de la mousse : la forêt noire du mont Haruna.
  const groundMaterial = standard(theme.ground ?? 0x17251c, { roughness: 1 });
  const ground = new THREE.Mesh(makeCurvedStripGeometry(-210, 210, -0.12), groundMaterial);
  ground.receiveShadow = true;
  ground.frustumCulled = false;
  scene.add(ground);

  const strips = [
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(-vergeOuter, -roadHalf, 0.02), vergeMaterial), inner: -vergeOuter, outer: -roadHalf },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(roadHalf, vergeOuter, 0.02), vergeMaterial), inner: roadHalf, outer: vergeOuter },
    // Bordure béton de rive, des deux côtés : la chaussée tombe d'un cran.
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(-roadHalf - 0.16, -roadHalf, -0.02), vergeMaterial), inner: -roadHalf - 0.16, outer: -roadHalf },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(roadHalf, roadHalf + 0.16, -0.02), vergeMaterial), inner: roadHalf, outer: roadHalf + 0.16 },
  ];
  strips.forEach(({ mesh }) => {
    mesh.receiveShadow = true;
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
      if (roadTexture.offset.y > 1000) roadTexture.offset.y -= 1000;
      if (vergeTexture.offset.y > 1000) vergeTexture.offset.y -= 1000;
      updateCurve(distance);
    },
  };
}

// ─── Décor ──────────────────────────────────────────────────────────────────
/** Intervalle de descente [début, fin] en mètres de piste, hors zone de départ. */
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

// Cèdre de Gunma : triple cône très sombre, un feuillage presque noir.
function addCedar(batch, m, x, z, random, scale = 1) {
  const height = (6 + random() * 4.2) * scale;
  batch.cylinder(m.trunk, [x, height * 0.14, z], 0.18 * scale, 0.28 * scale, height * 0.3, 6);
  const dark = random() < 0.6 ? m.foliage : m.foliageLight;
  batch.cone(dark, [x, height * 0.4, z], 1.7 * scale, height * 0.52, 7);
  batch.cone(dark, [x, height * 0.66, z], 1.25 * scale, height * 0.44, 7);
  batch.cone(dark, [x, height * 0.88, z], 0.8 * scale, height * 0.34, 7);
}

// Bambou en bosse : tiges fines, haut feuillage clairsemé.
function addBamboo(batch, m, x, z, random, scale = 1) {
  const stalks = 3 + Math.floor(random() * 3);
  for (let index = 0; index < stalks; index += 1) {
    const ox = x + (random() - 0.5) * 1.6 * scale;
    const oz = z + (random() - 0.5) * 1.6 * scale;
    const height = (2.6 + random() * 1.8) * scale;
    batch.cylinder(m.foliageLight, [ox, height * 0.5, oz], 0.05 * scale, 0.07 * scale, height, 5);
    batch.sphere(m.foliageLight, [ox, height * 0.98, oz], 0.5 * scale, 6);
  }
}

// Rocher du bas-côté : deux ou trois blocs gris posés dans la pente.
function addBoulder(batch, m, x, z, random, scale = 1) {
  batch.sphere(m.rock, [x, 0.4 * scale, z], 0.9 * scale, 6);
  if (random() < 0.6) batch.sphere(m.rockDark, [x + 0.7 * scale, 0.3 * scale, z + 0.4 * scale], 0.6 * scale, 6);
}

/**
 * Glissière japonaise (ガードパイプ) : deux lisses rondes sur poteaux, avec
 * réflecteur blanc à gauche et orange à droite — le bord de la route de nuit.
 */
function addGuardrail(batch, m, side, from, to, random) {
  const railX = side * (TOUGE_ROAD_HALF + 0.55);
  const length = to - from;
  if (length <= 1) return;
  // Les deux lisses suivent aussi les cassures à 90° : un seul cylindre de
  // 1 100 m resterait une corde droite après projection de la route 2D.
  for (let segmentFrom = from; segmentFrom < to; segmentFrom += BEND_SEGMENT) {
    const segmentTo = Math.min(to, segmentFrom + BEND_SEGMENT);
    const segmentLength = segmentTo - segmentFrom;
    const middle = (segmentFrom + segmentTo) / 2;
    batch.cylinder(m.armco, [railX, 0.62, toZ(middle)], 0.055, 0.055, segmentLength, 6, [Math.PI / 2, 0, 0]);
    batch.cylinder(m.armco, [railX, 0.36, toZ(middle)], 0.05, 0.05, segmentLength, 6, [Math.PI / 2, 0, 0]);
  }
  for (let position = from; position < to; position += 3.2) {
    batch.box(m.armcoPost, [railX, 0.5, toZ(position)], [0.12, 1.0, 0.12]);
    const lit = random() < 0.85;
    if (lit) {
      batch.box(side < 0 ? m.reflector : m.reflectorOrange, [railX - side * 0.08, 0.62, toZ(position + 1.6)], [0.05, 0.12, 0.16]);
    }
  }
}

/** Delineateur blanc : la petite mire qui confirme la rive dans les phares. */
function addDelineator(batch, m, side, position) {
  const x = side * (TOUGE_ROAD_HALF + 1.35);
  batch.box(m.white, [x, 0.55, toZ(position)], [0.07, 1.1, 0.1]);
  batch.box(m.reflector, [x - side * 0.05, 0.85, toZ(position)], [0.04, 0.16, 0.06]);
}

/** Lampadaire de montagne : mât d'acier, tête sodium, halo orange. */
function addSodiumLamp(batch, m, side, position, theme) {
  const x = side * (TOUGE_ROAD_HALF + 1.7);
  const z = toZ(position);
  batch.cylinder(m.darkMetal, [x, 2.6, z], 0.07, 0.11, 5.2, 6);
  // Flèche vers la chaussée.
  batch.box(m.darkMetal, [x - side * 0.5, 5.1, z], [1.0, 0.09, 0.09]);
  batch.box(m.sodium, [x - side * 1.0, 5.02, z], [0.5, 0.12, 0.26]);
  batch.box(m.sodiumGlass, [x - side * 1.0, 4.94, z], [0.4, 0.04, 0.2]);
  // Halo orange sous la tête : la lumière vire au sodium dans la brume.
  batch.plane(makeGlowMaterial(0xffb46b, 0.55), [x - side * 1.0, 4.9, z], 4.6, 4.6, [-Math.PI / 2, 0, 0]);
  const cone = theme.lampCone ?? 0.08;
  batch.cone(makeGlowMaterial(0xffb46b, cone), [x - side * 1.0, 2.45, z], 2.1, 5.0, 4, null);
}

// Halos et cônes de lumière : additive, sans depth-write, pour fondre la
// lumière dans la brume de nuit sans écrire dans le tampon de profondeur.
const glowMaterialCache = new Map();
function makeGlowMaterial(color, opacity) {
  const key = `${color}:${opacity}`;
  if (!glowMaterialCache.has(key)) {
    glowMaterialCache.set(key, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
      fog: false,
    }));
  }
  return glowMaterialCache.get(key);
}

/** Flèches d'épingle : palette de chevrons au hors-piste de la courbe. */
function addChevronBoard(batch, m, atlas, side, position, count = 3) {
  const key = side < 0 ? 'chevrons-left' : 'chevrons-right';
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 1.9);
  const z = toZ(position);
  for (const offset of [-0.55, 0.55]) {
    batch.box(m.steel, [x, 0.55, z + offset], [0.08, 1.1, 0.08]);
  }
  batch.plane(m.signs, [x, 1.55, z], 1.7, 0.62, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Miroir convexe de virage en aveugle, sur son potence jaune. */
function addConvexMirror(batch, m, atlas, side, position) {
  if (!atlas.has('mirror')) return;
  const x = side * (TOUGE_ROAD_HALF + 1.5);
  const z = toZ(position);
  batch.cylinder(m.yellow, [x, 1.1, z], 0.05, 0.07, 2.2, 6);
  batch.plane(m.signs, [x - side * 0.12, 2.35, z], 0.7, 0.7, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv('mirror') });
}

/** Panneau de secteur : plaque bleue nuit sur deux montants d'acier. */
function addSectorBoard(batch, m, atlas, sector, side, position, height = 2.2) {
  const key = `sector:${sector.id}`;
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 3.2);
  const z = toZ(position);
  for (const offset of [-1.0, 1.0]) {
    batch.box(m.steel, [x, height / 2, z + offset], [0.1, height, 0.1]);
  }
  batch.plane(m.signs, [x, height - 0.42, z], 2.6, 0.87, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Panneau losange de danger, posé juste avant la zone annoncée. */
function addWarnBoard(batch, m, atlas, side, position, key, height = 1.5) {
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 1.4);
  const z = toZ(position);
  batch.box(m.steel, [x, height / 2, z], [0.07, height, 0.07]);
  batch.plane(m.signs, [x - side * 0.06, height + 0.35, z], 0.78, 0.78, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Disque de limitation au bord de la chaussée. */
function addLimitBoard(batch, m, atlas, side, position, key = 'limit-40') {
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 1.05);
  const z = toZ(position);
  batch.box(m.steel, [x, 0.65, z], [0.06, 1.3, 0.06]);
  batch.plane(m.signs, [x - side * 0.05, 1.55, z], 0.62, 0.62, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/** Borne kilométrique blanche de la route forestière. */
function addKmStone(batch, m, atlas, side, position, km) {
  const key = `km:${Math.round(km)}`;
  if (!atlas.has(key)) return;
  const x = side * (TOUGE_ROAD_HALF + 1.2);
  batch.box(m.white, [x, 0.3, toZ(position)], [0.16, 0.6, 0.44]);
  batch.plane(m.signs, [x - side * 0.09, 0.4, toZ(position)], 0.4, 0.3, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

/**
 * Le premier tunnel : voûte de béton sur parois de roche, sodium orange au
 * plafond. Chaque côté est posé par tranches de deux mètres de piste pour
 * suivre les courbes, et le portique d'entrée porte le panneau du tunnel.
 */
function addTunnel(batch, m, atlas, sector, from, to, random) {
  const wallX = TOUGE_ROAD_HALF + 0.9;
  // La voûte respecte le dégagement caméra (`CAMERA_CLEARANCE`) : la poursuite
  // culmine à 6,7 m et suit le pilote dans le tunnel — une dalle ou un portique
  // plus bas serait traversé par la caméra (le toit disparaît ou masque la
  // voiture). Le dessous de la voûte ne descend donc pas sous 7,4 m.
  const ceilingY = CAMERA_CLEARANCE;
  for (let position = from; position < to - 1; position += 2) {
    const middle = position + 1;
    const z = toZ(middle);
    // Parois brutes et bandeau réfléchissant blanc, des deux côtés, posé sur
    // la face intérieure (et non noyé dans la paroi).
    batch.box(m.rockDark, [-(wallX + 0.9), ceilingY / 2, z], [1.8, ceilingY, 2.02]);
    batch.box(m.rockDark, [wallX + 0.9, ceilingY / 2, z], [1.8, ceilingY, 2.02]);
    batch.box(m.white, [-(wallX - 0.06), 1.0, z], [0.05, 0.34, 1.9]);
    batch.box(m.white, [wallX - 0.06, 1.0, z], [0.05, 0.34, 1.9]);
    // Voûte aplatie.
    batch.box(m.concreteDark, [0, ceilingY + 0.35, z], [(wallX + 1.8) * 2, 0.7, 2.02]);
    // Sodium : un tube au plafond sur deux.
    if (Math.round(middle / 2) % 2 === 0) {
      batch.box(m.sodium, [0, ceilingY - 0.06, z], [0.3, 0.08, 1.7]);
      batch.plane(makeGlowMaterial(0xffb46b, 0.3), [0, ceilingY - 0.14, z], 5.4, 5.4, [-Math.PI / 2, 0, 0]);
    }
    // Radier légèrement plus clair.
    batch.box(m.concrete, [0, -0.045, z], [(wallX + 0.05) * 2, 0.06, 2.02]);
    void random;
  }
  // Portails : un mur-fronton qui encadre l'entrée, lisible de loin.
  for (const [portalSide, portalPosition, rotationY] of [[-1, from - 1.2, 0], [-1, to + 1.2, 0]]) {
    void portalSide;
    const z = toZ(portalPosition);
    batch.box(m.concrete, [-(wallX + 1.4), ceilingY / 2, z], [2.4, ceilingY + 0.6, 1.4]);
    batch.box(m.concrete, [wallX + 1.4, ceilingY / 2, z], [2.4, ceilingY + 0.6, 1.4]);
    batch.box(m.concrete, [0, ceilingY + 0.9, z], [(wallX + 2.6) * 2, 1.3, 1.4]);
    batch.box(m.rockDark, [0, ceilingY + 1.75, z], [(wallX + 2.6) * 2, 0.5, 1.2]);
    if (atlas.has('tunnel')) {
      batch.plane(m.signs, [0, ceilingY + 0.9, z - 0.72], 4.6, 1.1, null, { uv: atlas.uv('tunnel') });
      batch.plane(m.signs, [0, ceilingY + 0.9, z + 0.72], 4.6, 1.1, [0, Math.PI, 0], { uv: atlas.uv('tunnel') });
    }
    void rotationY;
  }
  void sector;
}

/**
 * Le pont du ravin : parapets bas, poutres d'acier sous le tablier et deux
 * piles qui plongent dans le noir. La chaussée, elle, est déjà posée par la
 * route : le pont n'ajoute que ses garde-corps et son panneau.
 */
function addRavineBridge(batch, m, atlas, sector, middle) {
  const z = toZ(middle);
  const halfLength = 11;
  for (const side of [-1, 1]) {
    batch.box(m.concrete, [side * (TOUGE_ROAD_HALF + 0.32), 0.42, z], [0.5, 0.84, halfLength * 2]);
    batch.box(m.steel, [side * (TOUGE_ROAD_HALF + 0.32), 0.92, z], [0.34, 0.1, halfLength * 2]);
    for (let post = -halfLength + 1.2; post <= halfLength - 1.2; post += 1.6) {
      batch.box(m.steel, [side * (TOUGE_ROAD_HALF + 0.32), 0.66, z + post * SCALE], [0.09, 0.5, 0.09]);
    }
    // Poutres et croix de Saint-André sous le tablier.
    batch.box(m.darkMetal, [side * (TOUGE_ROAD_HALF * 0.5), -0.7, z], [0.5, 0.9, halfLength * 2]);
    batch.box(m.darkMetal, [side * (TOUGE_ROAD_HALF + 0.6), -1.5, z], [0.4, 0.4, halfLength * 2]);
  }
  // Piles centrales qui plongent dans le ravin.
  for (const offset of [-4, 0, 4]) {
    batch.box(m.concrete, [0, -3.4, z + offset * SCALE], [1.4, 6.4, 1.1]);
  }
  const key = `sector:${sector.id}`;
  if (atlas.has(key)) {
    batch.plane(m.signs, [0, CAMERA_CLEARANCE + 0.5, z + halfLength * SCALE - 0.06], 5.4, 0.95, null, { uv: atlas.uv(key) });
    batch.plane(m.signs, [0, CAMERA_CLEARANCE + 0.5, z - halfLength * SCALE + 0.06], 5.4, 0.95, [0, Math.PI, 0], { uv: atlas.uv(key) });
  }
}

/**
 * L'aire du belvédère : la glissière s'ouvre sur un parking d'accotement,
 * deux distributeurs allumés, un banc de bois, une lueur de lanterne et le
 * vide — la vallée et ses lumières en dessous.
 */
function addViewpoint(batch, m, atlas, side, from, to, random, lite) {
  const middle = (from + to) / 2;
  const parkX = side * (TOUGE_ROAD_HALF + 3.4);
  // Parking d'accotement en enrobé sombre.
  batch.box(m.black, [parkX, 0.008, toZ(middle)], [6.2, 0.05, to - from - 1]);
  // Marquage de places, tout bête.
  for (let slot = 0; slot < 2; slot += 1) {
    batch.box(m.white, [parkX + side * 2.2, 0.035, toZ(middle - 2 + slot * 4)], [0.12, 0.02, 3.4]);
  }
  // Rambardes basses qui ferment le vide au fond du parking.
  batch.box(m.steel, [parkX + side * 3.1, 0.5, toZ(middle)], [0.12, 0.9, to - from - 1]);
  // Les deux distributeurs : un rouge, un bleu, éclairés de l'intérieur.
  const vending = [
    { key: 'vending-red', mat: m.vendingRed, off: -2.2 },
    { key: 'vending-blue', mat: m.vendingBlue, off: -0.4 },
  ];
  for (const item of vending) {
    const x = parkX + side * 1.6;
    const z = toZ(from + 2.6 + item.off * 0.4);
    batch.box(m.darkMetal, [x, 0.92, z], [1.0, 1.84, 0.8]);
    batch.box(item.mat, [x - side * 0.52, 1.3, z], [0.05, 1.0, 0.66]);
    if (atlas.has(item.key)) {
      batch.plane(m.signs, [x - side * 0.56, 1.62, z], 0.6, 0.4, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(item.key) });
    }
    // Piscine de lumière au sol du distributeur.
    const poolColor = item.mat === m.vendingRed ? 0xff4d5e : 0x4da3ff;
    batch.plane(makeGlowMaterial(poolColor, 0.35), [x - side * 0.8, 0.02, z], 2.6, 2.6, [-Math.PI / 2, 0, 0]);
  }
  // Banc de bois et poubelle.
  batch.box(m.wood, [parkX + side * 0.4, 0.42, toZ(to - 2.2)], [1.8, 0.1, 0.5]);
  batch.box(m.wood, [parkX + side * 0.4, 0.2, toZ(to - 2.2)], [0.14, 0.4, 0.4]);
  batch.box(m.wood, [parkX + side * 0.4, 0.2, toZ(to - 2.95)], [0.14, 0.4, 0.4]);
  batch.cylinder(m.darkMetal, [parkX + side * 2.6, 0.4, toZ(to - 2.4)], 0.26, 0.3, 0.8, 8);
  if (!lite) {
    // Lanterne du belvédère.
    batch.cylinder(m.darkMetal, [parkX + side * 2.9, 1.4, toZ(from + 1.6)], 0.05, 0.08, 2.8, 6);
    if (atlas.has('lantern-white')) {
      batch.plane(m.signs, [parkX + side * 2.9, 2.5, toZ(from + 1.6)], 0.5, 0.9, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv('lantern-white') });
    }
  }
  void random;
}

/**
 * La rive du lac : une nappe d'eau sombre à droite de la route, métallique,
 * qui renvoie la lune. Quelques roseaux et un ponton de bois.
 */
function addLakeside(batch, m, from, to, random, lite) {
  const middle = (from + to) / 2;
  const span = Math.min(56, (to - from) * SCALE);
  // L'eau commence au-delà de l'accotement droit et couvre la plaine.
  batch.box(m.water, [TOUGE_ROAD_HALF + 12, -0.09, toZ(middle)], [48, 0.12, span]);
  // Roseaux en lisière.
  const reeds = lite ? 10 : 26;
  for (let index = 0; index < reeds; index += 1) {
    const position = from + random() * (to - from);
    addBamboo(batch, m, TOUGE_ROAD_HALF + 3.4 + random() * 2.2, position, random, 0.7);
  }
  // Ponton de bois.
  batch.box(m.wood, [TOUGE_ROAD_HALF + 5.2, 0.06, toZ(from + 3)], [0.1, 0.12, 4.4]);
  batch.box(m.wood, [TOUGE_ROAD_HALF + 7.4, 0.06, toZ(from + 3)], [4.6, 0.12, 0.1]);
  for (let plank = 0; plank < 5; plank += 1) {
    batch.box(m.wood, [TOUGE_ROAD_HALF + 6.4 + plank * 0.5, 0.0, toZ(from + 3)], [0.08, 0.3, 0.08]);
  }
}

/** Mur de roche de la tranchée 岩垂壁 : la montagne à un mètre du rétro. */
function addRockCut(batch, m, side, from, to, random) {
  const wallX = side * (TOUGE_ROAD_HALF + 1.6);
  const length = to - from;
  batch.box(m.rock, [wallX + side * 1.1, 3.4, toZ((from + to) / 2)], [2.2, 6.8, length]);
  batch.box(m.rockDark, [wallX + side * 2.3, 4.6, toZ((from + to) / 2)], [2.0, 4.6, length]);
  // Blocs éboulés au pied de la paroi.
  for (let position = from; position < to; position += 5) {
    if (random() < 0.5) addBoulder(batch, m, wallX - side * (0.4 + random()), position + random() * 3, random, 0.5 + random() * 0.5);
  }
}

/**
 * Bannière d'entrée de la descente : deux madriers de bois et la bannière
 * 榛名山 tendue au-dessus de la chaussée, juste après la zone de départ.
 */
function addWelcomeGate(batch, m, atlas, position) {
  const z = toZ(position);
  const height = 5.9;
  for (const side of [-1, 1]) {
    batch.box(m.wood, [side * (TOUGE_ROAD_HALF + 0.9), height / 2, z], [0.3, height, 0.3]);
    batch.box(m.wood, [side * (TOUGE_ROAD_HALF + 0.9), height + 0.25, z], [0.42, 0.5, 0.42]);
  }
  batch.box(m.wood, [0, height - 0.2, z], [(TOUGE_ROAD_HALF + 1.1) * 2, 0.24, 0.22]);
  if (atlas.has('start')) {
    batch.plane(m.signs, [0, height - 1.15, z + 0.14], 5.4, 1.15, null, { uv: atlas.uv('start') });
    batch.plane(m.signs, [0, height - 1.15, z - 0.14], 5.4, 1.15, [0, Math.PI, 0], { uv: atlas.uv('start') });
  }
}

/**
 * Petit groupe de spectateurs de nuit à une épingle : lanternes posées au
 * sol, drapeaux qui battent, l'équipe qui regarde passer la descente.
 * Rendu en props dynamiques pour que les drapeaux flottent.
 */
function addHairpinCrowd(batch, m, atlas, side, position, random, lite) {
  if (lite) return;
  const x = side * (TOUGE_ROAD_HALF + 2.8);
  const z = toZ(position);
  // Muret bas où s'adosser.
  batch.box(m.stone, [x, 0.28, z], [1.4, 0.56, 4.6]);
  const crowd = new THREE.Group();
  const flags = [];
  const lanternColors = [0xffb46b, 0xff8a5c, 0xffd36b];
  for (let index = 0; index < 3; index += 1) {
    const oz = (index - 1) * 1.5;
    // Lanterne au sol.
    const lanternMaterial = unlit(lanternColors[index % lanternColors.length]);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lanternMaterial);
    lantern.position.set((random() - 0.5) * 0.8, 0.75, oz);
    crowd.add(lantern);
    // Spectateur : manteau sombre, tête claire.
    const coat = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.85, 0.34),
      standard([0x22282e, 0x2c3438, 0x1e2620][index % 3], { roughness: 0.95 }),
    );
    coat.position.set((random() - 0.5) * 1.2, 1.1, oz + (random() - 0.5) * 0.6);
    crowd.add(coat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), standard(0xd8b49a, { roughness: 0.9 }));
    head.position.set(coat.position.x, 1.66, coat.position.z);
    crowd.add(head);
    // Drapeau de coureur de montagne.
    if (index === 1) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.7, 6), standard(0x8a8074));
      pole.position.set(coat.position.x + 0.2, 1.85, coat.position.z);
      crowd.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.6),
        unlit(index % 2 ? 0x8fd8ff : 0xff5b5b, { side: THREE.DoubleSide, transparent: true }),
      );
      flag.position.set(pole.position.x + 0.48, 2.42, pole.position.z);
      crowd.add(flag);
      flags.push(flag);
    }
  }
  void atlas;
  let wave = random() * Math.PI * 2;
  return {
    group: crowd,
    trackPos: position,
    x: 0,
    y: 0,
    side: 0,
    update(dt) {
      wave += dt * 2.2;
      flags.forEach((flag, index) => {
        flag.rotation.y = Math.sin(wave * (1 + index * 0.2)) * 0.5;
        flag.rotation.z = Math.sin(wave * 1.3 + index) * 0.18;
      });
    },
  };
}

/**
 * Le tōgé, secteur par secteur : glissières d'un bord à l'autre, forêt noire,
 * puis chaque repère de la descente — tunnel, épingles, paroi, pont,
 * belvédère, lac.
 */
export function buildTougeTrack({ city, theme, materials: m, batch, cityIndex, lite = false, route = CITY_RUSH_TOUGE } = {}) {
  const random = seededRandom(2007 + (cityIndex || 0) * 7919);
  Object.assign(m, createTougeMaterials(city, theme, random));
  const atlas = buildTougeSignAtlas(city, theme, route);
  m.signs = atlas.material;
  const bend = bendAware(batch);
  const dynamicProps = [];
  const sectors = route.sectors || [];

  // ── Glissières continues, sauf dans la zone de départ ────────────────────
  for (const side of [-1, 1]) {
    addGuardrail(bend, m, side, LOOP_START, LOOP_END, random);
  }

  // ── La forêt noire, derrière les glissières ──────────────────────────────
  for (let position = LOOP_START - 6; position < LOOP_END + 6; position += 3.1) {
    for (const side of [-1, 1]) {
      if (random() < 0.34) continue;
      const x = side * (TOUGE_ROAD_HALF + 5.5 + random() * 24);
      const z = toZ(position + random() * 2.6);
      const roll = random();
      if (roll < 0.62) addCedar(bend, m, x, z, random, 0.9 + random() * 0.6);
      else if (roll < 0.82) addBamboo(bend, m, x, z, random, 0.9 + random() * 0.5);
      else addBoulder(bend, m, x, z, random, 0.7 + random() * 0.9);
    }
  }

  // ── Delineateurs et lampadaires, en cadence le long de la descente ──────
  for (let position = LOOP_START; position < LOOP_END; position += 18) {
    addDelineator(bend, m, position % 36 < 18 ? -1 : 1, position);
  }
  let lampTally = 0;
  for (let position = LOOP_START + 10; position < LOOP_END; position += 34) {
    // Un lampadaire sur deux seulement : la montagne reste sombre entre deux.
    if (lampTally % 2 === 0) addSodiumLamp(bend, m, lampTally % 4 < 2 ? -1 : 1, position, theme);
    lampTally += 1;
  }

  // ── Secteur par secteur : la descente du mont Haruna ─────────────────────
  sectors.forEach((sector, sectorIndex) => {
    const ranges = tougeTrackRanges(sector.from, sector.to);
    ranges.forEach(([from, to]) => {
      const middle = (from + to) / 2;
      const side = sector.side || (sectorIndex % 2 ? 1 : -1);
      const opposite = -side;

      addSectorBoard(bend, m, atlas, sector, opposite, from + 1.6);
      if (sectorIndex % 2 === 1) addKmStone(bend, m, atlas, opposite, from + 0.7, sector.km);

      switch (sector.kind) {
        case 'tunnel':
          addTunnel(bend, m, atlas, sector, from, to, random);
          break;
        case 'hairpins':
          // Flèches et limitations sur toute l'enfilade d'épingles.
          addLimitBoard(bend, m, atlas, opposite, from + 3.2, 'limit-30');
          for (let position = from + 5; position < to - 2; position += 9) {
            addChevronBoard(bend, m, atlas, sectorIndex % 2 ? side : opposite, position, sectorIndex % 2 ? 4 : 3);
          }
          break;
        case 'cut':
          addRockCut(bend, m, side, from, to, random);
          addWarnBoard(bend, m, atlas, opposite, from + 2.4, 'warn-falling');
          break;
        case 'bridge':
          addRavineBridge(bend, m, atlas, sector, middle);
          break;
        case 'viewpoint':
          addViewpoint(bend, m, atlas, side, from, to, random, lite);
          break;
        case 'finish':
          addLakeside(bend, m, from, to, random, lite);
          break;
        case 'corner':
        case 'descent':
        default:
          break;
      }

      // Animaux et verglas : les panneaux des nuits de montagne.
      if (sector.kind === 'descent' || sector.kind === 'corner') {
        addWarnBoard(bend, m, atlas, sectorIndex % 2 ? side : opposite, from + 4.8, sectorIndex % 3 === 0 ? 'warn-animal' : 'warn-ice');
      }
      // Panneaux losange avant chaque enfilade d'épingles.
      if (sector.hairpins) {
        addWarnBoard(bend, m, atlas, opposite, from + 0.8, 'warn-hairpin');
      }
      // Le miroir convexe se dresse aux sorties en aveugle.
      if (sector.corner) {
        addConvexMirror(bend, m, atlas, sectorIndex % 2 ? opposite : side, middle);
      }

      // Panneau sponsor cousu sur la glissière de temps en temps.
      if (sectorIndex % 4 === 2 && from > LOOP_START + 12) {
        const key = `sponsor:${sectorIndex % (theme.sponsors || []).length}`;
        if (atlas.has(key)) {
          const x = opposite * (TOUGE_ROAD_HALF + 0.75);
          batch.plane(m.signs, [x, 0.85, toZ(from + 6)], 2.2, 0.66, signRotation(opposite > 0 ? -1 : 1), { uv: atlas.uv(key) });
        }
      }

      // Les spectateurs de nuit se tiennent aux deux grandes enfilades.
      if (sector.hairpins && (sector.hairpins === 5 || sector.hairpins === 3)) {
        const crowd = addHairpinCrowd(bend, m, atlas, opposite, middle, random, lite);
        if (crowd) {
          dynamicProps.push(crowd);
        }
      }
    });
  });

  // La bannière d'entrée, juste après la zone de départ.
  addWelcomeGate(batch, m, atlas, LOOP_START + 6);

  for (const prop of dynamicProps) {
    prop.group.position.set(prop.x, prop.y, toZ(prop.trackPos));
  }

  return { dynamicProps, atlas, random, gantries: [] };
}
