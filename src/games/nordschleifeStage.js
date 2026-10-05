// ── Nürburgring Nordschleife · décor du circuit permanent ───────────────────
//
// Le Ring n'est pas une ville : ni trottoirs, ni vitrines, ni lampadaires. La
// piste étroite (8,40 m) serpente entre les sapins de l'Eifel, bordée de
// glissières de sécurité, de vibreurs rouge et blanc, de trappes à graviers et
// de panneaux blancs. Ce module remplace `buildCityLoop` et `makeRoad` pour le
// parcours `nordschleife` : il pose le ruban de piste, son herbe, ses glissières
// et, secteur par secteur, les repères réels du tour — le pont d'Antoniusbuche,
// le village de Breidscheid et son point bas, la cuvette du Karussell, la tour
// de la Hohe Acht, la croix du Schwedenkreuz, la ligne droite de la Döttinger
// Höhe, sans oublier les tribunes de la Start-Ziel-Anlage.
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_LANE_PAINT_WIDTH,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_SCROLL_SCALE,
  CITY_RUSH_NORDSCHLEIFE,
  CITY_RUSH_NORDSCHLEIFE_COURSE,
  CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE,
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
// Piste du Ring : environ 8,40 m de bitume utile, deux voies de 2,10 m et
// 2,10 m de bas-côté de chaque côté avant les vibreurs.
export const NORDSCHLEIFE_ROAD_HALF = 4.6;
export const NORDSCHLEIFE_VERGE_OUTER = 9.4;
const LOOP_START = START_ZONE_HALF + 2;
const LOOP_END = LAP - START_ZONE_HALF - 2;
// Dégagement caméra : la poursuite culmine à 6,7 m, tout ce qui enjambe la
// piste (ponts, portiques) reste au-dessus de 7,4 m.
const CAMERA_CLEARANCE = 7.4;

const toZ = (trackMeters) => -trackMeters * SCALE;

// Orientation d'un panneau : les plaques de bord de piste regardent la piste
// (normale vers l'intérieur), celles des portiques regardent le pilote qui
// arrive (normale +z, comme le portique de départ du moteur).
function signRotation(facing) {
  if (facing === 0) return [0, 0, 0];
  return [0, facing > 0 ? Math.PI / 2 : -Math.PI / 2, 0];
}


// Le décor fusionné est déformé une fois par la boucle : une primitive trop
// longue ne suivrait la courbe qu'à ses extrémités. On découpe donc glissières
// et barrières en tronçons de douze unités monde, comme la Shuto.
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

// ─── Signalisation allemande ────────────────────────────────────────────────
// Les panneaux du Ring sont des plaques blanches à texte noir, cerclées de
// rouge pour l'interdiction ou l'avertissement, avec la typographie
// DIN 1451 des routes fédérales. Les tableaux de secteur portent le nom du
// lieu-dit (il ne se traduit pas) et le numéro officiel du virage.
export function drawGermanSignCell(ctx, width, height, entry) {
  const variant = entry.variant || 'plate';
  ctx.clearRect(0, 0, width, height);
  const font = '900';
  if (variant === 'warn') {
    // Triangle de danger : pointe en haut, liseré rouge.
    const size = Math.min(width, height) * 0.92;
    const cx = width / 2;
    const top = (height - size) / 2;
    ctx.fillStyle = '#f7f5ef';
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx + size * 0.58, top + size * 0.92);
    ctx.lineTo(cx - size * 0.58, top + size * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = '#d3312b';
    ctx.stroke();
    ctx.fillStyle = '#15161a';
    ctx.font = `${font} ${Math.round(size * 0.42)}px "Orbitron", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '!', cx, top + size * 0.66);
    return;
  }
  if (variant === 'flag') {
    // Drapeau de commissaire : jaune (incident local) ou rouge (piste fermée).
    ctx.fillStyle = entry.color || '#f2c11f';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
    ctx.fillStyle = '#171717';
    ctx.font = `${font} ${Math.round(height * 0.34)}px "Orbitron", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '', width / 2, height * 0.42);
    return;
  }
  if (variant === 'chevron') {
    const segments = Math.max(1, Math.round(entry.count || 3));
    for (let index = 0; index < segments; index += 1) {
      const step = width / segments;
      ctx.fillStyle = index % 2 ? '#f4f2ec' : '#c8382f';
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
  if (variant === 'sponsor') {
    const accent = entry.color || '#c8382f';
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width * 0.22, height);
    ctx.fillStyle = '#15161a';
    ctx.font = `${font} ${Math.round(height * 0.46)}px "Orbitron", Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || '', width * 0.28, height * 0.54);
    ctx.fillStyle = 'rgba(21,22,26,.6)';
    ctx.font = `${font} ${Math.round(height * 0.2)}px "Orbitron", Arial, sans-serif`;
    ctx.fillText(entry.sub || '', width * 0.28, height * 0.82);
    return;
  }
  if (variant === 'start') {
    // Portique de la Start-Ziel-Anlage : bandeau noir, damier et lettrage.
    ctx.fillStyle = '#15161a';
    ctx.fillRect(0, 0, width, height);
    const cell = height / 4;
    for (let column = 0; column < Math.ceil(width / cell); column += 1) {
      for (let row = 0; row < 2; row += 1) {
        if ((column + row) % 2) continue;
        ctx.fillStyle = '#f4f1e8';
        ctx.fillRect(column * cell, row * cell, cell, cell);
        ctx.fillRect(column * cell, height - (row + 1) * cell, cell, cell);
      }
    }
    ctx.fillStyle = '#f4d35e';
    ctx.font = `${font} ${Math.round(height * 0.34)}px "Orbitron", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.text || 'START UND ZIEL', width / 2, height / 2);
    return;
  }
  // Plaque blanche standard (nom de secteur, distance, altitude).
  const border = entry.borderColor || '#1c1d22';
  ctx.fillStyle = entry.background || '#f4f1e8';
  ctx.fillRect(3, 3, width - 6, height - 6);
  ctx.lineWidth = Math.max(3, height * 0.05);
  ctx.strokeStyle = border;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  if (entry.badge) {
    ctx.fillStyle = entry.badgeColor || '#c8382f';
    ctx.fillRect(12, 12, height - 24, height - 24);
    ctx.fillStyle = '#f7f5ef';
    ctx.font = `${font} ${Math.round(height * 0.4)}px "Orbitron", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(entry.badge), height / 2, height / 2);
  }
  const left = entry.badge ? height * 0.95 : width * 0.06;
  ctx.fillStyle = entry.textColor || '#15161a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${font} ${Math.round(height * (entry.big ? 0.44 : 0.36))}px "Orbitron", Arial, sans-serif`;
  ctx.fillText(entry.text || '', left, entry.sub ? height * 0.4 : height * 0.54);
  if (entry.sub) {
    ctx.fillStyle = entry.subColor || '#5a5b60';
    ctx.font = `${font} ${Math.round(height * 0.22)}px "Orbitron", Arial, sans-serif`;
    ctx.fillText(entry.sub, left, height * 0.74);
  }
}

/** Matériaux du circuit : asphalte, herbe, glissières et béton du Karussell. */
export function createNordschleifeMaterials(city, theme, random) {
  const tints = theme.materials || {};
  return {
    kerbRed: standard(tints.kerbRed ?? 0xc8382f, { roughness: 0.66 }),
    kerbWhite: standard(tints.kerbWhite ?? 0xf1efe6, { roughness: 0.68 }),
    armco: standard(tints.armco ?? 0xa8adb4, { metalness: 0.62, roughness: 0.42 }),
    armcoPost: standard(tints.armcoPost ?? 0x6b7076, { metalness: 0.5, roughness: 0.55 }),
    reflector: unlit(0xfff0c8),
    concrete: standard(tints.concrete ?? 0x9a978d, { roughness: 0.94 }),
    concreteDark: standard(tints.concreteDark ?? 0x74716a, { roughness: 0.95 }),
    gravel: standard(tints.gravel ?? 0x9a8f7c, { roughness: 1 }),
    grass: standard(tints.grass ?? 0x4f7a3c, { roughness: 1 }),
    grassDark: standard(tints.grassDark ?? 0x375c2c, { roughness: 1 }),
    gravelDark: standard(tints.gravelDark ?? 0x7d7361, { roughness: 1 }),
    foliage: standard(tints.foliage ?? 0x2f5a30, { roughness: 0.96 }),
    foliageLight: standard(tints.foliageLight ?? 0x477a3a, { roughness: 0.96 }),
    trunk: standard(tints.trunk ?? 0x53402f, { roughness: 1 }),
    wood: standard(tints.wood ?? 0x7a5b3a, { roughness: 0.96 }),
    steel: standard(tints.steel ?? 0x8e949c, { metalness: 0.58, roughness: 0.44 }),
    darkMetal: standard(tints.darkMetal ?? 0x2e3238, { metalness: 0.42, roughness: 0.5 }),
    white: standard(0xf1efe6, { roughness: 0.82 }),
    black: standard(0x1b1c20, { roughness: 0.86 }),
    slate: standard(0x3a3f47, { roughness: 0.9 }),
    plaster: standard(0xe6e1d4, { roughness: 0.94 }),
    stone: standard(0x8d867a, { roughness: 0.96 }),
    roofTile: standard(0x8f4134, { roughness: 0.92 }),
    glass: standard(0x3d5566, { roughness: 0.32, metalness: 0.22 }),
    yellow: standard(0xd7b049, { roughness: 0.8 }),
    red: standard(0xc8382f, { roughness: 0.8 }),
    green: standard(0x33704a, { roughness: 0.85 }),
    signs: unlit(0xffffff, { side: THREE.DoubleSide }),
    flagYellow: unlit(0xe9c22c, { side: THREE.DoubleSide }),
    flagWhite: unlit(0xf4f1e8, { side: THREE.DoubleSide }),
    flagGreen: unlit(0x3f9d4e, { side: THREE.DoubleSide }),
    lampGlow: unlit(0xfff0c8),
    accent: standard(city.accent, { emissive: city.accent, emissiveIntensity: 0.22 }),
    window: unlit(0x2f3a42),
  };
}

/** Atlas des panneaux du Ring : secteurs, ponts, altitudes, sponsors. */
export function buildNordschleifeSignAtlas(city, theme, route = CITY_RUSH_NORDSCHLEIFE) {
  const atlas = new SignAtlas({ cellWidth: 384, cellHeight: 128, columns: 4 });
  const keys = new Map();
  const add = (key, entry) => {
    if (keys.has(key)) return keys.get(key);
    const index = atlas.add(entry);
    keys.set(key, index);
    return index;
  };

  add('start', { draw: drawGermanSignCell, variant: 'start', text: 'START UND ZIEL' });
  for (const sector of route.sectors) {
    if (!sector.sign) continue;
    add(`sector:${sector.id}`, {
      draw: drawGermanSignCell,
      badge: sector.corner?.number ? String(sector.corner.number) : route.marker,
      text: sector.sign.lines?.[0] || sector.name,
      sub: sector.sign.lines?.[1] || sector.romaji,
      background: sector.sign.hazard ? '#f4e7c8' : '#f4f1e8',
      borderColor: sector.sign.hazard ? '#c8382f' : '#1c1d22',
      badgeColor: sector.sign.hazard ? '#c8382f' : '#1c1d22',
      subColor: sector.sign.hazard ? '#8a5a1c' : '#5a5b60',
    });
    if (sector.bridge) {
      add(`bridge:${sector.id}`, {
        draw: drawGermanSignCell, variant: 'plate',
        text: sector.bridge.name, sub: `${sector.bridge.spanM} m · ${sector.km.toFixed(1)} km`,
      });
    }
  }
  // Bornes kilométriques tous les kilomètres, dans le sens de la course.
  for (let km = 0; km <= Math.round(route.lengthKm); km += 1) {
    add(`km:${km}`, { draw: drawGermanSignCell, variant: 'plate', text: `${km}`, sub: 'km' });
  }
  add('warn-jump', { draw: drawGermanSignCell, variant: 'warn', text: '↯' });
  add('chevrons', { draw: drawGermanSignCell, variant: 'chevron', count: 3 });
  add('flag-yellow', { draw: drawGermanSignCell, variant: 'flag', text: 'GELB', color: '#f2c11f' });
  add('flag-red', { draw: drawGermanSignCell, variant: 'flag', text: 'ROT', color: '#c8382f', textColor: '#f7f5ef' });
  add('origin', { draw: drawGermanSignCell, variant: 'plate', badge: '0', text: 'ANTONIUSBUCHE', sub: 'BRIDGE TO GANTRY · KM 0' });
  add('karussell', {
    draw: drawGermanSignCell, variant: 'plate', badge: '28',
    text: 'KARUSSELL', sub: 'BETONVIROLE · 1932', background: '#efe9dc', borderColor: '#c8382f', badgeColor: '#c8382f',
  });
  add('altitude', { draw: drawGermanSignCell, variant: 'plate', text: '620 m', sub: 'HÖCHSTER PUNKT' });
  (theme.sponsors || []).forEach((text, index) => {
    add(`sponsor:${index}`, {
      draw: drawGermanSignCell, variant: 'sponsor', text,
      sub: 'NÜRBURGRING · NORDSCHLEIFE', color: index % 2 ? '#c8382f' : '#d7b049',
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

// ─── Piste ──────────────────────────────────────────────────────────────────
// Bitume du Ring : quatre voies, traces de gomme dans les trajectoires, plaques
// de réparation et marquage au sol — les deux lignes de rive continues qui
// délimitent les 8,40 m utiles, et une ligne blanche discontinue au milieu de
// chaque paire de voies. Les quatre voies du circuit sont ainsi lisibles comme
// celles d'une route, sans ligne jaune d'axe : ici, personne ne vient en face.
// Les vibreurs rouge et blanc sont posés par le décor, pas par la texture.
export function makeRacewayTexture(theme, random) {
  const width = 256;
  const height = 512;
  const roadHalf = theme.roadHalf ?? NORDSCHLEIFE_ROAD_HALF;
  const base = new THREE.Color(theme.roadTint ?? theme.asphalt ?? 0x4a4a4c);
  const shade = (amount) => `rgb(${Math.round(base.r * 255 + amount)}, ${Math.round(base.g * 255 + amount)}, ${Math.round(base.b * 255 + amount)})`;
  // Peinture des lignes : la teinte de voie du thème (blanc cassé de l'Eifel),
  // convertie une fois pour toutes en rgba.
  const line = new THREE.Color(theme.laneColor || '#f4f1e8');
  const lineCss = (alpha) => `rgba(${Math.round(line.r * 255)}, ${Math.round(line.g * 255)}, ${Math.round(line.b * 255)}, ${alpha})`;
  // Le carreau couvre toute la largeur de la piste : les abscisses de la
  // simulation se posent dessus sans conversion particulière.
  const toPixel = (laneX) => width / 2 + (laneX / (roadHalf * 2)) * width;
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = shade(0);
    ctx.fillRect(0, 0, width, height);
    // Grain d'asphalte et réparations.
    for (let index = 0; index < 900; index += 1) {
      const tone = random() < 0.5 ? -14 : 16;
      ctx.fillStyle = shade(tone + random() * 8);
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 4);
    }
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = shade(-18 - random() * 8);
      const patchY = random() * height;
      ctx.fillRect(0, patchY, width, 6 + random() * 22);
    }
    // Traces de gomme : les deux voies, avec la trajectoire qui se croise.
    for (const laneCenter of [0.27, 0.73]) {
      for (let index = 0; index < 60; index += 1) {
        const drift = Math.sin(index * 0.28) * width * 0.035;
        ctx.fillStyle = `rgba(16,16,18,${0.05 + random() * 0.12})`;
        ctx.fillRect(laneCenter * width - 13 + drift, random() * height, 26, 14 + random() * 26);
      }
    }
    // Lignes de voie : un trait discontinu au milieu de chaque paire de voies
    // voisines, à la largeur d'une vraie ligne (16 cm). Le carreau se répète en
    // longueur : quatre traits par carreau tombent juste, sans couture au
    // raccord, et une voiture change de voie au milieu exact de son décalage.
    const paintWidth = Math.max(2, (CITY_RUSH_LANE_PAINT_WIDTH / (roadHalf * 2)) * width);
    const dash = height / 4;
    ctx.fillStyle = lineCss(0.86);
    for (const separator of cityRushLaneSeparators(CITY_RUSH_NORDSCHLEIFE_COURSE)) {
      const px = toPixel(separator);
      for (let y = 0; y < height; y += dash) ctx.fillRect(px - paintWidth / 2, y, paintWidth, dash * 0.4);
    }
    // Lignes de rive blanches, continues sur toute la longueur.
    ctx.fillStyle = lineCss(0.9);
    ctx.fillRect(width * 0.045, 0, width * 0.035, height);
    ctx.fillRect(width * 0.92, 0, width * 0.035, height);
    // Quelques traces de pluie et de poussière sur les bords.
    for (let index = 0; index < 220; index += 1) {
      ctx.fillStyle = `rgba(210,196,168,${0.04 + random() * 0.1})`;
      const edge = random() < 0.5 ? random() * width * 0.16 : width - random() * width * 0.16;
      ctx.fillRect(edge, random() * height, 3 + random() * 8, 2 + random() * 6);
    }
  }, width, height, { smooth: true, repeat: true });
}

// Herbe de l'Eifel : bandes de fauche, taches de terre et pâquerettes ; elle
// remplace le trottoir de la ville de part et d'autre des vibreurs.
function makeVergeTexture(theme, random) {
  const width = 128;
  const height = 512;
  const base = new THREE.Color(theme.sidewalkTint ?? 0x4f7a3c);
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
    ctx.fillRect(0, 0, width, height);
    for (let band = 0; band < 16; band += 1) {
      ctx.fillStyle = band % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)';
      ctx.fillRect(0, band * (height / 16), width, height / 16);
    }
    for (let index = 0; index < 700; index += 1) {
      const tone = random();
      ctx.fillStyle = tone < 0.6
        ? `rgba(90,124,58,${0.12 + random() * 0.2})`
        : tone < 0.9
          ? `rgba(58,86,42,${0.14 + random() * 0.22})`
          : `rgba(198,186,150,${0.08 + random() * 0.16})`;
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 4);
    }
    for (let index = 0; index < 40; index += 1) {
      ctx.fillStyle = `rgba(242,240,214,${0.2 + random() * 0.3})`;
      ctx.fillRect(random() * width, random() * height, 2, 2);
    }
  }, width, height, { smooth: true, repeat: true });
}

/**
 * Piste du Nordschleife : ruban étroit, herbe, vibreurs aux entrées de virage
 * et une plaine herbeuse à perte de vue. Même contrat que `makeRoad` : la
 * géométrie suit le relief et la courbe du circuit, la texture défile avec la
 * distance parcourue.
 */
export function makeNordschleifeRoad(scene, theme, random, playerZ, profile = CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE) {
  const roadHalf = theme.roadHalf ?? NORDSCHLEIFE_ROAD_HALF;
  const vergeOuter = roadHalf + 5.2;
  const roadTexture = makeRacewayTexture(theme, random);
  roadTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / ROAD_TILE_LENGTH);
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: theme.weather === 'rain' ? 0.44 : 0.88,
    metalness: theme.weather === 'rain' ? 0.3 : 0.03,
    flatShading: true,
  });
  const road = new THREE.Mesh(makeCurvedStripGeometry(-roadHalf, roadHalf, -0.05), roadMaterial);
  road.receiveShadow = true;
  road.frustumCulled = false;
  scene.add(road);

  const vergeTexture = makeVergeTexture(theme, random);
  vergeTexture.repeat.set(1, (ROAD_VIEW_AHEAD - ROAD_VIEW_BEHIND) * SCALE / 6);
  const vergeMaterial = new THREE.MeshStandardMaterial({ map: vergeTexture, roughness: 0.98, flatShading: true });
  const kerbMaterial = standard(theme.curb ?? 0x6f6a63, { roughness: 0.86 });
  // Au-delà de l'herbe : la forêt de l'Eifel, verte jusqu'à la brume.
  const groundMaterial = standard(theme.ground ?? 0x3f6634, { roughness: 1 });
  const ground = new THREE.Mesh(makeCurvedStripGeometry(-210, 210, -0.12), groundMaterial);
  ground.receiveShadow = true;
  ground.frustumCulled = false;
  scene.add(ground);

  const strips = [
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(-vergeOuter, -roadHalf, 0.02), vergeMaterial), inner: -vergeOuter, outer: -roadHalf },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(roadHalf, vergeOuter, 0.02), vergeMaterial), inner: roadHalf, outer: vergeOuter },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(-roadHalf - 0.15, -roadHalf + 0.15, 0.0), kerbMaterial), inner: -roadHalf - 0.15, outer: -roadHalf + 0.15 },
    { mesh: new THREE.Mesh(makeCurvedStripGeometry(roadHalf - 0.15, roadHalf + 0.15, 0.0), kerbMaterial), inner: roadHalf - 0.15, outer: roadHalf + 0.15 },
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
      if (roadTexture.offset.y > 1000) roadTexture.offset.y -= 1000;
      if (vergeTexture.offset.y > 1000) vergeTexture.offset.y -= 1000;
      updateCurve(distance);
    },
  };
}

// ─── Décor ──────────────────────────────────────────────────────────────────
/** Intervalle de tour [début, fin] en mètres de piste, hors zone de départ. */
export function nordschleifeTrackRanges(fromFraction, toFraction, lapLength = LAP) {
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

const centerOf = (sector) => (sector.from + sector.to) / 2 * LAP;

function addFir(batch, m, x, z, random, scale = 1) {
  const height = (5.4 + random() * 3.4) * scale;
  batch.cylinder(m.trunk, [x, height * 0.16, z], 0.16 * scale, 0.24 * scale, height * 0.34, 6);
  const dark = random() < 0.5 ? m.foliage : m.foliageLight;
  batch.cone(dark, [x, height * 0.42, z], 1.55 * scale, height * 0.5, 7);
  batch.cone(dark, [x, height * 0.68, z], 1.15 * scale, height * 0.42, 7);
  batch.cone(dark, [x, height * 0.9, z], 0.72 * scale, height * 0.32, 7);
}

function addBeech(batch, m, x, z, random, scale = 1) {
  const height = (4.6 + random() * 2.6) * scale;
  batch.cylinder(m.trunk, [x, height * 0.3, z], 0.2 * scale, 0.3 * scale, height * 0.6, 6);
  batch.sphere(m.foliageLight, [x, height * 0.78, z], 2.1 * scale, 8);
  batch.sphere(m.foliage, [x + 0.9 * scale, height * 0.66, z + 0.4 * scale], 1.3 * scale, 7);
  batch.sphere(m.foliage, [x - 0.8 * scale, height * 0.7, z - 0.5 * scale], 1.2 * scale, 7);
}

function addArmco(batch, m, side, from, to, random) {
  const railX = side * (NORDSCHLEIFE_ROAD_HALF + 0.85);
  const length = to - from;
  if (length <= 1) return;
  const middle = (from + to) / 2;
  // Glissière continue (découpée par le lot) et poteaux tous les 4 m.
  batch.box(m.armco, [railX, 0.58, toZ(middle)], [0.1, 0.32, length]);
  batch.box(m.armco, [railX, 0.94, toZ(middle)], [0.08, 0.2, length]);
  for (let position = from; position < to; position += 4) {
    batch.box(m.armcoPost, [railX + side * 0.09, 0.42, toZ(position)], [0.14, 1.0, 0.16]);
    if (random() < 0.7) batch.box(m.reflector, [railX - side * 0.03, 0.72, toZ(position + 2)], [0.06, 0.14, 0.2]);
  }
}

function addKerbs(batch, m, side, from, to) {
  const x = side * (NORDSCHLEIFE_ROAD_HALF + 0.24);
  let index = 0;
  for (let position = from; position < to; position += 2.4) {
    batch.box(index % 2 ? m.kerbRed : m.kerbWhite, [x, 0.045, toZ(position + 1.2)], [0.44, 0.09, 2.4]);
    index += 1;
  }
}

function addGravelTrap(batch, m, side, from, to) {
  const length = to - from;
  if (length <= 2) return;
  const middle = (from + to) / 2;
  batch.box(m.gravel, [side * (NORDSCHLEIFE_ROAD_HALF + 2.6), 0.012, toZ(middle)], [3.6, 0.06, length]);
  batch.box(m.gravelDark, [side * (NORDSCHLEIFE_ROAD_HALF + 5.1), 0.008, toZ(middle)], [2.4, 0.05, length]);
  // Balises rouge et blanc toutes les 8 m au fond de la trappe.
  let index = 0;
  for (let position = from; position < to; position += 8) {
    batch.box(index % 2 ? m.kerbRed : m.kerbWhite, [side * (NORDSCHLEIFE_ROAD_HALF + 6.6), 0.5, toZ(position + 4)], [0.16, 1.0, 0.16]);
    index += 1;
  }
}

function addMarshalPost(batch, m, atlas, side, position, { flag = null, lite = false } = {}) {
  const x = side * (NORDSCHLEIFE_ROAD_HALF + 7.2);
  const z = toZ(position);
  // Abri de commissaire : toit de tôle sur deux montants de bois.
  batch.box(m.wood, [x - side * 0.7, 1.1, z - 0.8], [0.14, 2.2, 0.14]);
  batch.box(m.wood, [x - side * 0.7, 1.1, z + 0.8], [0.14, 2.2, 0.14]);
  batch.box(m.darkMetal, [x - side * 0.7, 2.28, z], [1.1, 0.12, 2.3]);
  if (!lite) batch.box(m.plaster, [x - side * 0.7, 0.75, z], [0.9, 0.1, 2.0]);
  // Mât et drapeau : jaune par défaut, vert quand la piste est libre.
  batch.cylinder(m.steel, [x, 1.5, z], 0.05, 0.07, 3.0, 6);
  const flagKey = flag || 'flag-yellow';
  if (atlas?.has(flagKey)) {
    batch.plane(m.signs, [x + 0.55, 2.75, z], 0.9, 0.6, null, { uv: atlas.uv(flagKey) });
  }
  if (atlas?.has('chevrons')) {
    batch.plane(m.signs, [x - side * 1.35, 1.5, z], 0.9, 0.6, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv('chevrons') });
  }
}

function addSectorBoard(batch, m, atlas, sector, side, position, height = 2.4) {
  const key = `sector:${sector.id}`;
  if (!atlas.has(key)) return;
  const x = side * (NORDSCHLEIFE_ROAD_HALF + 4.2);
  const z = toZ(position);
  for (const offset of [-1.15, 1.15]) {
    batch.box(m.steel, [x, height / 2, z + offset], [0.1, height, 0.1]);
  }
  // Le panneau regarde la piste : côté droit, il se tourne vers -x.
  batch.plane(m.signs, [x, height - 0.45, z], 2.9, 1.0, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

function addKmStone(batch, m, atlas, side, position, km) {
  const key = `km:${Math.round(km)}`;
  if (!atlas.has(key)) return;
  const x = side * (NORDSCHLEIFE_ROAD_HALF + 1.9);
  batch.box(m.white, [x, 0.34, toZ(position)], [0.18, 0.68, 0.5]);
  batch.plane(m.signs, [x - side * 0.1, 0.44, toZ(position)], 0.44, 0.34, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

function addBridge(batch, m, atlas, sector, position) {
  const z = toZ(position);
  const deckY = CAMERA_CLEARANCE + 1.4;
  const deckWidth = (sector.bridge?.spanM ?? 12) + 6;
  for (const side of [-1, 1]) {
    // Culées en pierre de part et d'autre de la piste.
    batch.box(m.stone, [side * 7.4, deckY / 2, z], [3.2, deckY, deckWidth]);
    batch.box(m.concrete, [side * 7.4, deckY + 0.3, z], [3.6, 0.6, deckWidth]);
  }
  // Tablier, parapet et garde-corps métalliques.
  batch.box(m.concrete, [0, deckY + 0.3, z], [18, 0.7, deckWidth]);
  for (const side of [-1, 1]) {
    batch.box(m.stone, [0, deckY + 1.05, z + side * (deckWidth / 2 - 0.3)], [18, 0.8, 0.55]);
    batch.box(m.steel, [0, deckY + 1.75, z + side * (deckWidth / 2 - 0.25)], [18, 0.14, 0.1]);
  }
  // Panneau du pont suspendu sous le tablier, lisible depuis la piste.
  const key = `bridge:${sector.id}`;
  if (atlas.has(key)) {
    batch.plane(m.signs, [0, CAMERA_CLEARANCE + 0.55, z + deckWidth / 2 - 0.05], 6.4, 0.9, null, { uv: atlas.uv(key) });
    batch.plane(m.signs, [0, CAMERA_CLEARANCE + 0.55, z - deckWidth / 2 + 0.05], 6.4, 0.9, [0, Math.PI, 0], { uv: atlas.uv(key) });
  }
  // Panneau de danger « passage étroit » aux quatre montants.
  for (const side of [-1, 1]) {
    batch.box(m.kerbRed, [side * 6.4, 1.2, z + deckWidth / 2 + 0.3], [0.24, 2.4, 0.24]);
    batch.box(m.kerbWhite, [side * 6.4, 2.5, z + deckWidth / 2 + 0.3], [0.24, 0.2, 0.24]);
  }
}

function addKarussell(batch, m, atlas, position) {
  const z = toZ(position);
  // Virole de béton : dalles inclinées côté gauche, avec saignée centrale.
  const slabs = 16;
  for (let index = 0; index < slabs; index += 1) {
    const t = index / (slabs - 1);
    const z0 = z + (t - 0.5) * 13;
    const drop = -0.55 * (1 - Math.abs(t - 0.5) * 2 * 0.35);
    batch.box(m.concrete, [-5.4 - drop * 0.9, drop + 0.16, z0], [2.6, 0.3, 1.0], [0, 0, -0.36]);
    batch.box(m.concreteDark, [-6.9 - drop * 1.1, drop * 0.6 + 0.5, z0], [0.8, 0.9, 1.0], [0, 0, -0.3]);
  }
  // Vibreurs rouge et blanc à l'entrée et à la sortie de la virole.
  addKerbs(batch, m, -1, position - 8, position - 3);
  addKerbs(batch, m, -1, position + 3, position + 8);
  // Tribune en gradins des spectateurs, au-dessus de la virole.
  for (let step = 0; step < 4; step += 1) {
    batch.box(m.concrete, [-12.4 - step * 1.6, 0.5 + step * 0.55, z], [1.7, 1.1 + step * 1.1, 16]);
  }
  batch.box(m.darkMetal, [-16.6, 6.4, z], [0.3, 0.3, 16]);
  // Tyres rouges et blancs empilés à la sortie, comme au bord du Ring.
  for (let index = 0; index < 10; index += 1) {
    batch.cylinder(index % 2 ? m.kerbRed : m.kerbWhite, [5.2, 0.3, z + 6 + index * 0.9], 0.34, 0.34, 0.6, 8);
  }
  if (atlas.has('karussell')) {
    batch.plane(m.signs, [-8.4, 2.6, z - 7.4], 3.4, 1.15, signRotation(1), { uv: atlas.uv('karussell') });
  }
}

function addHoheAcht(batch, m, atlas, city, position) {
  const z = toZ(position);
  // Tour de l'Eifel : belvédère de pierre sur la colline qui domine le circuit.
  batch.box(m.grassDark, [-34, 1.6, z + 26], [22, 3.2, 22]);
  batch.cylinder(m.stone, [-34, 12, z + 26], 3.4, 4.6, 18, 10);
  batch.cylinder(m.concrete, [-34, 22.2, z + 26], 3.6, 3.2, 2.4, 10);
  batch.cone(m.slate, [-34, 24.6, z + 26], 3.9, 2.4, 10);
  batch.cylinder(m.steel, [-34, 27.6, z + 26], 0.14, 0.14, 4.2, 6);
  if (atlas.has('altitude')) {
    batch.plane(m.signs, [-8.2, 2.7, z], 3.2, 1.15, signRotation(1), { uv: atlas.uv('altitude') });
  }
  // Château fort de Nürburg, au loin sur son piton boisé.
  const castleZ = z - 40;
  batch.box(m.grassDark, [26, 3.0, castleZ], [26, 6.0, 26]);
  batch.box(m.stone, [26, 9.4, castleZ], [11, 6.8, 11]);
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
    batch.cylinder(m.stone, [26 + dx, 12.2, castleZ + dz], 1.5, 1.7, 12, 8);
    batch.cone(m.slate, [26 + dx, 18.9, castleZ + dz], 1.9, 2.4, 8);
  }
  batch.cone(m.slate, [26, 15.4, castleZ], 6.2, 4.2, 8);
}

function addSchwedenkreuz(batch, m, position) {
  const z = toZ(position);
  // Croix de pierre de 1638, à droite de la piste.
  batch.box(m.stone, [6.6, 0.25, z], [1.4, 0.5, 1.0]);
  batch.box(m.stone, [6.6, 2.0, z], [0.42, 3.5, 0.36]);
  batch.box(m.stone, [6.6, 2.6, z], [1.5, 0.4, 0.36]);
  for (let index = 0; index < 3; index += 1) {
    addFir(batch, m, 9.5 + index * 1.8, z - 1.4 + index * 0.9, Math.random, 0.9);
  }
}

function addLaudaMemorial(batch, m, position) {
  const z = toZ(position);
  batch.box(m.stone, [6.2, 0.9, z], [1.6, 1.8, 0.5]);
  batch.box(m.white, [6.2, 1.1, z], [1.2, 0.6, 0.52]);
  batch.box(m.black, [6.2, 0.55, z], [1.0, 0.3, 0.53]);
}

function addVillage(batch, m, random, side, from, to) {
  let position = from + 3;
  while (position < to - 3) {
    const x = side * (11 + random() * 3);
    const z = toZ(position);
    const width = 4.5 + random() * 2;
    const height = 3.2 + random() * 1.4;
    batch.box(m.plaster, [x, height / 2, z], [width, height, 5 + random() * 2]);
    batch.box(m.slate, [x, height + 0.7, z], [width + 0.5, 1.2, 5.4], [0, 0, 0.16]);
    for (const offset of [-1.4, 1.4]) {
      batch.box(m.window, [x - side * (width / 2), height * 0.55, z + offset], [0.1, 0.9, 0.8]);
    }
    batch.cylinder(m.stone, [x + side * 0.6, height + 1.5, z + 1.6], 0.4, 0.5, 1.6, 7);
    position += 9 + random() * 5;
  }
}

function addPitStraight(batch, m, atlas, random, from, to) {
  // Start-Ziel-Anlage : mur des stands, tribunes couvertes et tour de contrôle.
  const middle = (from + to) / 2;
  const length = to - from;
  if (length <= 2) return;
  batch.box(m.concrete, [-8.6, 0.5, toZ(middle)], [1.4, 1.0, length]);
  batch.box(m.kerbWhite, [-8.6, 1.08, toZ(middle)], [1.6, 0.16, length]);
  for (let step = 0; step < 5; step += 1) {
    batch.box(m.concrete, [-12.4 - step * 2.1, 0.6 + step * 0.62, toZ(middle)], [2.2, 1.2 + step * 1.24, length]);
    batch.box(step % 2 ? m.kerbRed : m.kerbWhite, [-11.3 - step * 2.1, 1.24 + step * 0.62, toZ(middle)], [0.2, 0.2, length]);
  }
  batch.box(m.darkMetal, [-21.6, 7.6, toZ(middle)], [0.4, 0.4, length]);
  batch.box(m.steel, [-21.6, 6.2, toZ(middle)], [0.2, 2.8, length]);
  // Tour de contrôle vitrée, comme au-dessus des stands du Ring.
  batch.box(m.plaster, [-12.5, 8.4, toZ(middle) - 6], [5.4, 5.2, 6.4]);
  batch.box(m.glass, [-12.5, 9.6, toZ(middle) - 6 + 3.25], [5.0, 2.2, 0.2]);
  batch.box(m.glass, [-12.5, 9.6, toZ(middle) - 6 - 3.25], [5.0, 2.2, 0.2]);
  batch.box(m.darkMetal, [-12.5, 11.2, toZ(middle) - 6], [6.0, 0.4, 7.0]);
  // Panneau du portique de départ au-dessus de la piste.
  if (atlas.has('start')) {
    batch.plane(m.signs, [0, CAMERA_CLEARANCE + 1.4, toZ(middle) + 0.35], 9.4, 1.5, null, { uv: atlas.uv('start') });
    batch.plane(m.signs, [0, CAMERA_CLEARANCE + 1.4, toZ(middle) - 0.35], 9.4, 1.5, [0, Math.PI, 0], { uv: atlas.uv('start') });
    for (const side of [-1, 1]) {
      batch.box(m.steel, [side * 5.4, (CAMERA_CLEARANCE + 0.6) / 2, toZ(middle)], [0.4, CAMERA_CLEARANCE + 0.6, 0.4]);
    }
  }
  for (let index = 0; index < 4; index += 1) {
    batch.box(m.kerbRed, [-8.0, 1.9, toZ(from + 2 + index * 3)], [0.12, 1.6, 1.6]);
  }
}

function addAirfield(batch, m, random, side, from, to) {
  // Ancien terrain de planeurs du Flugplatz : hangar, manche à air, bande
  // herbeuse fauchée à gauche de la piste.
  const middle = (from + to) / 2;
  const z = toZ(middle);
  batch.box(m.grassDark, [side * 24, 0.02, z], [22, 0.04, (to - from) * 1.6]);
  batch.box(m.darkMetal, [side * 22, 2.4, z - 5], [7, 4.4, 5.2], [0, 0.12, 0]);
  batch.box(m.slate, [side * 22, 4.8, z - 5], [7.4, 0.4, 5.6], [0, 0.12, 0]);
  batch.box(m.wood, [side * 22, 1.2, z - 2.3], [6.4, 2.2, 0.2], [0, 0.12, 0]);
  batch.cylinder(m.steel, [side * 18, 3.0, z + 4], 0.08, 0.1, 6.0, 6);
  for (let index = 0; index < 3; index += 1) {
    batch.box(index === 1 ? m.kerbRed : m.kerbWhite, [side * (18 + index * 0.5), 5.4, z + 4], [1.2 - index * 0.3, 0.5, 0.14]);
  }
}

function addDoettingerBoard(batch, m, atlas, side, position) {
  const key = 'sponsor:0';
  if (!atlas.has(key)) return;
  const x = side * (NORDSCHLEIFE_ROAD_HALF + 3.6);
  for (const offset of [-2.4, 2.4]) {
    batch.box(m.steel, [x, 1.5, toZ(position) + offset], [0.12, 3.0, 0.12]);
  }
  batch.plane(m.signs, [x, 2.5, toZ(position)], 5.6, 1.5, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
}

function addSponsorRow(batch, m, atlas, side, from, to, random) {
  let index = 0;
  for (let position = from; position < to - 4; position += 7.5) {
    const key = `sponsor:${index % Math.max(1, m.sponsorCount || 5)}`;
    if (!atlas.has(key)) break;
    const x = side * (NORDSCHLEIFE_ROAD_HALF + 3.4);
    batch.plane(m.signs, [x, 1.15, toZ(position)], 3.4, 1.0, signRotation(side > 0 ? -1 : 1), { uv: atlas.uv(key) });
    batch.box(m.steel, [x, 0.4, toZ(position)], [0.1, 0.8, 3.4]);
    index += 1;
  }
}

/**
 * Décor complet du Nordschleife. Même contrat que `buildShutoExpressway` :
 * les primitives statiques sont empilées dans `batch` (fusionnées par matériau
 * puis déformées par la boucle), les éléments animés sont renvoyés dans
 * `dynamicProps`.
 */
export function buildNordschleifeTrack({ city, theme, materials: m, batch, cityIndex, lite = false, route = CITY_RUSH_NORDSCHLEIFE } = {}) {
  const random = seededRandom(1927 + (cityIndex || 0) * 7919);
  // Les matériaux du circuit complètent ceux de la ville : le thème n'a pas
  // de façades, mais il lui faut son asphalte, son herbe et ses glissières.
  Object.assign(m, createNordschleifeMaterials(city, theme, random));
  const atlas = buildNordschleifeSignAtlas(city, theme, route);
  m.signs = atlas.material;
  m.sponsorCount = (theme.sponsors || []).length;
  const bend = bendAware(batch);
  const dynamicProps = [];
  const sectors = route.sectors || [];

  // ── Glissières continues sur tout le tour, sauf dans la zone de départ ──
  for (const side of [-1, 1]) {
    addArmco(bend, m, side, LOOP_START, LOOP_END, random);
  }

  // ── Forêt de l'Eifel : sapins et hêtres derrière les glissières ────────
  for (let position = LOOP_START - 6; position < LOOP_END + 6; position += 2.6) {
    for (const side of [-1, 1]) {
      if (random() < 0.42) continue;
      const x = side * (NORDSCHLEIFE_ROAD_HALF + 12 + random() * 26);
      const z = toZ(position + random() * 2.4);
      if (random() < 0.58) addFir(bend, m, x, z, random, 0.9 + random() * 0.5);
      else addBeech(bend, m, x, z, random, 0.9 + random() * 0.4);
    }
  }

  // ── Secteur par secteur : le tour réel du Ring ─────────────────────────
  const landmarkIds = new Set();
  sectors.forEach((sector, sectorIndex) => {
    const ranges = nordschleifeTrackRanges(sector.from, sector.to);
    ranges.forEach(([from, to]) => {
      const middle = (from + to) / 2;
      const side = sector.side || (sectorIndex % 2 ? 1 : -1);
      const opposite = -side;

      addSectorBoard(bend, m, atlas, sector, side, from + 1.6);
      if (sectorIndex % 2 === 1) addKmStone(bend, m, atlas, opposite, from + 0.8, sector.km);

      switch (sector.kind) {
        case 'corner':
        case 'descent':
        case 'jump':
        case 'banked':
          addKerbs(bend, m, side, from, to);
          addKerbs(bend, m, opposite, from + (to - from) * 0.3, to);
          addGravelTrap(bend, m, opposite, from, to);
          break;
        case 'crest':
        case 'summit':
        case 'climb':
          addKerbs(bend, m, opposite, from, to);
          addGravelTrap(bend, m, side, from, to);
          break;
        default:
          break;
      }

      if (sector.corner) addMarshalPost(bend, m, atlas, opposite, middle, { flag: sector.sign?.hazard ? 'flag-yellow' : 'flag-green', lite });
      if (sector.sign?.hazard) addMarshalPost(bend, m, atlas, side, to - 1.4, { flag: 'flag-yellow', lite });

      if (sector.bridge) addBridge(bend, m, atlas, sector, middle);
      if (sector.startArea) addPitStraight(bend, m, atlas, random, from, to);
      if (sector.village) addVillage(bend, m, random, side, from, to);
      if (sector.airfield) addAirfield(bend, m, random, side, from, to);
      if (sector.banked && sector.id === 'karussell') addKarussell(bend, m, atlas, middle);
      if (sector.landmark?.id === 'schwedenkreuz') addSchwedenkreuz(bend, m, middle);
      if (sector.id === 'lauda-links') addLaudaMemorial(bend, m, middle);
      if (sector.summit) addHoheAcht(bend, m, atlas, city, middle);
      if (sector.straight && sector.id === 'doettinger-hoehe') {
        addDoettingerBoard(bend, m, atlas, side, from + 2);
        addSponsorRow(bend, m, atlas, opposite, from, to, random);
      }
      if (sector.crest || sector.jumps) {
        addMarshalPost(bend, m, atlas, side, from + 2.2, { flag: 'flag-yellow', lite });
      }
      if (sector.landmark) landmarkIds.add(sector.landmark.id);

      // Panneau publicitaire de temps en temps, comme au bord des vraies
      // pistes : jamais dans la zone de départ.
      if (sectorIndex % 5 === 2 && from > LOOP_START + 10) {
        addSponsorRow(bend, m, atlas, side, from + 3, Math.min(to - 1, from + 13), random);
      }
    });
  });

  // ── Caméras et spectateurs aux endroits mythiques ──────────────────────
  const spectatorBanks = [
    { id: 'bruennchen', label: 'BRÜNNCHEN' },
    { id: 'pflanzgarten', label: 'PFLANZGARTEN' },
  ];
  for (const bank of spectatorBanks) {
    const sector = sectors.find((item) => item.id === bank.id);
    if (!sector) continue;
    const ranges = nordschleifeTrackRanges(sector.from, sector.to);
    ranges.forEach(([from, to]) => {
      const middle = (from + to) / 2;
      for (const side of [-1, 1]) {
        for (let step = 0; step < 3; step += 1) {
          bend.box(m.grassDark, [side * (10 + step * 1.8), 0.4 + step * 0.5, toZ(middle)], [1.9, 0.8 + step * 1.0, to - from + 4]);
        }
      }
      const crowd = new THREE.Group();
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.001, 0.001), unlit(0x000000));
      banner.visible = false;
      crowd.add(banner);
      const flags = [];
      for (const flagSide of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6), standard(0x8e949c));
        pole.position.set(0, 0.8, flagSide * 1.6);
        crowd.add(pole);
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1, 0.7),
          unlit(flagSide > 0 ? 0xd7b049 : 0xc8382f, { side: THREE.DoubleSide, transparent: true }),
        );
        flag.position.set(0.6, 1.35, flagSide * 1.6);
        crowd.add(flag);
        flags.push(flag);
      }
      let wave = random() * Math.PI * 2;
      dynamicProps.push({
        group: crowd,
        trackPos: middle + (bank.id === 'bruennchen' ? 2 : -2),
        x: 0,
        y: 3.2,
        side: 1,
        // Les drapeaux des spectateurs battent au vent, comme sur les talus.
        update(dt) {
          wave += dt * 2.6;
          flags.forEach((flag, index) => {
            flag.rotation.z = Math.sin(wave * (1 + index * 0.17)) * 0.24;
            flag.rotation.y = Math.sin(wave * 0.7 + index * 1.4) * 0.5;
          });
        },
      });
    });
  }

  for (const prop of dynamicProps) {
    prop.group.position.set(prop.x, prop.y, toZ(prop.trackPos));
  }

  return { dynamicProps, atlas, random, gantries: [] };
}
