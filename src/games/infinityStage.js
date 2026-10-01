import * as THREE from 'three';

/*
 * ZONE 08 · CHÂTEAU DE L’INFINI — hommage à Demon Slayer (Kimetsu no Yaiba)
 * pour Mirage Rush.
 *
 * Le cavalier galope sur le grand pont de bois laqué qui traverse la
 * forteresse dimensionnelle de Nakime : un labyrinthe sans gravité où les
 * galeries de tatamis, les cloisons shōji illuminées d’ambre, les escaliers
 * impossibles façon Escher et les pagodes renversées s’étendent à l’infini
 * au-dessus de l’abîme écarlate.
 *
 * Sur une boucle de 110 m (10 segments de 11 m, recyclés par MirageWorld) :
 *   · aile gauche (x < 0) : galeries shōji, estrade du biwa de Nakime,
 *     escaliers flottants, pagode inversée suspendue au-dessus du vide,
 *     salle des Lunes Supérieures, arche dimensionnelle, pavillon basculé à
 *     90°, atrium aux cent lanternes, fusuma en téléportation et donjon de
 *     l’abîme ;
 *   · aile droite (x > 0) : alcôves de tatamis, passerelles suspendues,
 *     escaliers renversés, tours de shōji dorés, piliers vermillon à ferrures
 *     d’or, galeries latérales, lanternes flottantes et bastions inversés ;
 *   · une fois par boucle : la Grande Arche du Pont Inversé enjambe la piste
 *     à plus de 9,3 m de haut (au-dessus de la caméra), couronnée d’une
 *     pagode la tête en bas et flanquée de portes shōji coulissantes ouvertes.
 *
 * Sur la piste, les obstacles du Château : le pilier-lanterne Andon en bois
 * laqué et shōji doré (1 voie, haut, à contourner) et le paravent shōji bas
 * d’engawa (2 voies, sautable).
 */

export const INFINITY_SEGMENT_LENGTH = 11;
export const INFINITY_SEGMENT_COUNT = 10;
/** Segment de la boucle où s’élève la Grande Arche du Pont Inversé. */
export const INFINITY_GATE_INDEX = 5;
export const LEFT_WING_SIDE = -1;
export const RIGHT_WING_SIDE = 1;
/** Au-delà de ce point, les rangées d'obstacles sont dans la brume derrière l'arche. */
export const INFINITY_CULL_Z = -58;

/** Bords de la piste jouable (4 voies, TRACK_WIDTH 8,4). */
export const INFINITY_TRACK_EDGE = 4.2;
const WALL_FACE = 10.6;
const WALL_THICKNESS = 1.4;

/** Arche du pont inversé : la clé passe à > 9,3 m, bien au-dessus de la caméra (7,3 m). */
export const INFINITY_ARCH = Object.freeze({ halfWidth: 4.95, spring: 4.4, top: 9.3 });

/** Période de la pulsation résonante du biwa sur les lanternes du château. */
export const BIWA_PULSE_PERIOD = 1.6;
const LANTERN_AMBER_ON = 0xffd89a;
const LANTERN_CRIMSON_PULSE = 0xff9569;
const lanternAmber = new THREE.Color(LANTERN_AMBER_ON);
const lanternCoral = new THREE.Color(LANTERN_CRIMSON_PULSE);

const PALETTE = Object.freeze({
  hinokiDark: 0x302330,     // ébène lisible, même dans les ombres
  hinoki: 0x442b32,         // bois d'hinoki sombre
  hinokiWarm: 0x634039,     // boiseries intérieures éclairées
  mahogany: 0x783a37,       // piliers acajou
  vermilion: 0xa43b38,      // colonnes et balustrades laquées vermillon
  vermilionBright: 0xcb5144,// laque écarlate, sans rouge saturé
  gold: 0xeab64d,           // ferrures kazarikanagu dorées
  goldDark: 0x9e7124,       // bronze doré
  shojiPaper: 0xffd278,     // papier washi éclairé d'ambre
  shojiWarm: 0xffae42,      // lueur orangée chaude
  shojiCrimson: 0xe64545,   // fenêtre imprégnée d'aura démoniaque
  tatami: 0x8d8449,         // natte de tatami traditionnelle
  tatamiBorder: 0x26161a,   // bordure brodée des tatamis
  roofTile: 0x292633,       // tuiles kawara anthracite aux reflets mauves
  roofRidge: 0x3c3348,      // faîtage de toit
  abyssVoid: 0x11080d,      // profondeur de l'abîme
  biwaWood: 0xc48845,       // caisse en mûrier du biwa de Nakime
  biwaNeck: 0x42231b,       // manche du biwa
  ivory: 0xf4ead5,          // plectre bachi et chevalets
});

const material = (color, roughness = 0.88) =>
  new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

const emissiveMaterial = (color, emissive, emissiveIntensity = 0.55, roughness = 0.65) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    flatShading: true,
  });

function palette() {
  const cache = new Map();
  return (name) => {
    if (cache.has(name)) return cache.get(name);
    let mat;
    if (name === 'shojiPaper') {
      mat = emissiveMaterial(PALETTE.shojiPaper, 0xff9d2e, 0.68, 0.55);
    } else if (name === 'shojiWarm') {
      mat = emissiveMaterial(PALETTE.shojiWarm, 0xe06b12, 0.62, 0.6);
    } else if (name === 'shojiCrimson') {
      mat = emissiveMaterial(PALETTE.shojiCrimson, 0xb81d2a, 0.65, 0.6);
    } else if (name === 'gold') {
      mat = new THREE.MeshStandardMaterial({
        color: PALETTE.gold,
        emissive: 0x5e3c08,
        emissiveIntensity: 0.28,
        roughness: 0.45,
        metalness: 0.35,
        flatShading: true,
      });
    } else {
      mat = material(PALETTE[name] ?? 0x351c21);
    }
    cache.set(name, mat);
    return mat;
  };
}

function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, mat, x, y, z, radiusTop, radiusBottom, height, segments = 8) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    mat,
  );
  mesh.position.set(x, y, z);
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

/* ------------------------------------------------------------------ */
/* Textures peintes (cloisons shōji kumiko, fusuma, bannières kanji)   */
/* ------------------------------------------------------------------ */

const textureCache = new Map();

function canvasTexture(key, width, height, draw) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

/** Cloison japonaise shōji à croisillons kumiko illuminée de l'intérieur. */
function shojiTexture(tone = 'amber') {
  return canvasTexture(`infinity-shoji-${tone}`, 512, 512, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.46, 24, w * 0.5, h * 0.5, w * 0.7);
    if (tone === 'crimson') {
      grad.addColorStop(0, '#ffc39a');
      grad.addColorStop(0.55, '#d96655');
      grad.addColorStop(1, '#713541');
    } else if (tone === 'gold') {
      grad.addColorStop(0, '#fff0cd');
      grad.addColorStop(0.6, '#f4cb86');
      grad.addColorStop(1, '#ae783b');
    } else {
      grad.addColorStop(0, '#ffe3ac');
      grad.addColorStop(0.6, '#e8ad64');
      grad.addColorStop(1, '#9f6033');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fibres de washi discrètes, déterministes : jamais de bruit animé.
    const rnd = seeded(771 + tone.length);
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255, 244, 210, 0.055)' : 'rgba(66, 30, 24, 0.045)';
      ctx.fillRect(rnd() * w, rnd() * h, 0.7 + rnd() * 1.4, 1 + rnd() * 2.4);
    }

    // Kumiko à petits bois sombres et biseau chaud, avec marge intérieure.
    ctx.strokeStyle = '#291920';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    const line = (x1, y1, x2, y2) => {
      ctx.strokeStyle = '#392329';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(233, 170, 91, 0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1 + 3, y1 + 3); ctx.lineTo(x2 + 3, y2 + 3); ctx.stroke();
    };
    for (let c = 1; c < 4; c++) line(w * c / 4, 16, w * c / 4, h - 16);
    for (let r = 1; r < 6; r++) line(16, h * r / 6, w - 16, h * r / 6);
    ctx.strokeStyle = 'rgba(227, 171, 97, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);
  });
}

/** Bannière verticale portant le kanji de la forteresse (« 無限 » Infini). */
function kanjiScrollTexture(symbol = '無限') {
  return canvasTexture(`infinity-scroll-${symbol}`, 128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1d0e13';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#eab64d';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#b82928';
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#ffdf8e';
    ctx.font = '900 72px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (symbol.length === 2) {
      ctx.fillText(symbol[0], w / 2, h * 0.34);
      ctx.fillText(symbol[1], w / 2, h * 0.68);
    } else {
      ctx.fillText(symbol, w / 2, h * 0.5);
    }
  });
}

function shojiPanel(parent, x, y, z, w, h, { tone = 'amber', rotationY = 0, fog = true, color = 0xffffff } = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: shojiTexture(tone),
    color,
    fog,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

function kanjiScroll(parent, M, symbol, x, y, z, rotationY = 0) {
  box(parent, M('gold'), x, y + 1.18, z, 0.96, 0.08, 0.08);
  box(parent, M('gold'), x, y - 1.18, z, 0.96, 0.08, 0.08);
  const mat = new THREE.MeshBasicMaterial({
    map: kanjiScrollTexture(symbol),
    side: THREE.DoubleSide,
  });
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.28), mat);
  scroll.position.set(x, y, z);
  scroll.rotation.y = rotationY;
  scroll.userData.kanji = symbol;
  parent.add(scroll);
  return scroll;
}

/* ------------------------------------------------------------------ */
/* Résonance du biwa & lanternes flottantes                            */
/* ------------------------------------------------------------------ */

/**
 * Onde de résonance du biwa : un pic bref au pincement de corde, suivi d'une
 * vibration ambrée qui se dissipe dans la forteresse.
 */
export function biwaPulseOn(seconds) {
  const phase = ((seconds % BIWA_PULSE_PERIOD) + BIWA_PULSE_PERIOD) % BIWA_PULSE_PERIOD;
  return phase < 0.24;
}

/**
 * Anime les lanternes flottantes du Château de l’Infini (oscillation sans
 * gravité et éclat écarlate/ambré au son du biwa). Figé si animations réduites.
 */
export function updateInfinityLanterns(lanterns, seconds, reduceMotion = false, segmentZ = 0) {
  if (!lanterns?.length) return;
  const visible = segmentZ >= -48;
  for (const lantern of lanterns) {
    const phase = (((seconds + lantern.offset) % BIWA_PULSE_PERIOD) + BIWA_PULSE_PERIOD) % BIWA_PULSE_PERIOD;
    const resonance = reduceMotion ? 0 : Math.pow(Math.max(0, 1 - phase / 0.24), 2);
    lantern.pulsing = !reduceMotion && biwaPulseOn(seconds + lantern.offset);
    lantern.core.material.color.copy(lanternAmber).lerp(lanternCoral, resonance);
    if (lantern.halo) {
      lantern.halo.material.opacity = 0.24 + resonance * 0.08;
      lantern.halo.material.color.copy(lantern.core.material.color);
    }
    if (lantern.holder) {
      lantern.holder.visible = visible;
      lantern.holder.position.y = reduceMotion
        ? lantern.baseY
        : lantern.baseY + Math.sin(seconds * 1.6 + lantern.offset * 4) * 0.10;
    }
  }
}

/** Alpha radial jusqu'à zéro au bord : un sprite sans map serait un carré. */
function lanternGlowTexture() {
  return canvasTexture('infinity-lantern-glow', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.48)');
    gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.025)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Lanterne flottante Andon en bois noir et papier washi incandescent. */
function floatingLantern(parent, M, x, y, z, offset = 0) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.visible = (parent.position?.z ?? 0) >= -48;
  holder.userData.glow = true;
  parent.add(holder);

  box(holder, M('hinokiDark'), 0, 0.28, 0, 0.42, 0.06, 0.42);
  box(holder, M('hinokiDark'), 0, -0.28, 0, 0.38, 0.06, 0.38);
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.48, 0.32),
    new THREE.MeshBasicMaterial({ color: LANTERN_AMBER_ON, fog: false }),
  );
  core.userData.glow = true;
  holder.add(core);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: lanternGlowTexture(),
      color: LANTERN_AMBER_ON,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.scale.setScalar(1.45);
  halo.userData.glow = true;
  holder.add(halo);

  return { holder, core, halo, baseY: y, offset, pulsing: false };
}

/* ------------------------------------------------------------------ */
/* Briques architecturales du Château de l’Infini                      */
/* ------------------------------------------------------------------ */

/** Toit japonais kawara à chevrons et extrémités relevées (normal ou inversé). */
function pagodaRoof(parent, M, x, y, z, w, d, { inverted = false, goldTip = false } = {}) {
  const dir = inverted ? -1 : 1;
  // Deux vrais pans de kawara et des égouts relevés, au lieu de blocs empilés.
  // Le profil reste dans le gabarit d'origine (important pour les obstacles).
  const profile = new THREE.Shape();
  profile.moveTo(-d / 2, 0.22);
  profile.lineTo(-d * 0.38, 0.12);
  profile.lineTo(0, 0.38);
  profile.lineTo(d * 0.38, 0.12);
  profile.lineTo(d / 2, 0.22);
  profile.lineTo(d / 2, 0.10);
  profile.lineTo(d * 0.38, 0.02);
  profile.lineTo(0, 0.28);
  profile.lineTo(-d * 0.38, 0.02);
  profile.lineTo(-d / 2, 0.10);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: w, bevelEnabled: false });
  geometry.translate(0, 0, -w / 2);
  if (inverted) geometry.rotateX(Math.PI); // rotation, pas une échelle négative : bake sans faces retournées
  const roof = new THREE.Mesh(geometry, M('roofTile'));
  roof.position.set(x, y, z);
  roof.rotation.y = Math.PI / 2;
  parent.add(roof);
  box(parent, M('roofRidge'), x, y + dir * 0.40, z, w * 0.92, 0.09, 0.16);
  box(parent, M('goldDark'), x, y + dir * 0.46, z, w * 0.64, 0.025, 0.10);
  for (const sz of [-1, 1]) {
    box(parent, M('goldDark'), x, y + dir * 0.22, z + sz * d / 2, w, 0.035, 0.055);
  }
  // Corniches relevées aux angles.
  for (const sx of [-1, 1]) {
    const tip = box(parent, M('roofTile'), x + sx * (w * 0.48), y + dir * 0.24, z, 0.42, 0.1, d + 0.24);
    tip.rotation.z = sx * dir * 0.28;
  }
  if (goldTip) {
    cylinder(parent, M('gold'), x, y + dir * 0.72, z, 0.04, 0.16, 0.52, 6);
  }
}

/**
 * Pavillon de shōji et de boiseries d'hinoki : peut être posé à l'endroit,
 * renversé la tête en bas (`inverted: true`) ou basculé à 90° (`sideways`).
 */
function shojiPavilion(parent, M, x, y, z, w, h, d, {
  tone = 'amber',
  inverted = false,
  faceSign = 1,
  balcony = true,
  fog = true,
  shojiColor = 0xffffff,
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  if (inverted) group.rotation.z = Math.PI;
  parent.add(group);

  // Corps en bois sombre et piliers d'angle vermillon.
  box(group, M('hinoki'), 0, h / 2, 0, w, h, d);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(group, M('vermilion'), sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08), 0.22, h + 0.06, 0.22);
      box(group, M('gold'), sx * (w / 2 - 0.08), h - 0.15, sz * (d / 2 - 0.08), 0.26, 0.14, 0.26);
    }
  }

  // Cloisons shōji lumineuses tournées vers la piste (face x) et vers le cavalier (+z).
  const sideX = faceSign * (w / 2 + 0.03);
  shojiPanel(group, sideX, h * 0.52, 0, d * 0.82, h * 0.74, {
    tone,
    rotationY: Math.PI / 2,
    fog,
    color: shojiColor,
  });
  shojiPanel(group, 0, h * 0.52, d / 2 + 0.03, w * 0.78, h * 0.74, {
    tone,
    rotationY: 0,
    fog,
    color: shojiColor,
  });

  // Galerie engawa à balustrade vermillon.
  if (balcony) {
    const bx = faceSign * (w / 2 + 0.35);
    box(group, M('hinokiWarm'), bx, 0.08, 0, 0.7, 0.14, d + 0.4);
    box(group, M('vermilionBright'), bx + faceSign * 0.26, 0.52, 0, 0.08, 0.08, d + 0.36);
    box(group, M('vermilion'), bx + faceSign * 0.26, 0.28, 0, 0.06, 0.06, d + 0.36);
    for (let k = -2; k <= 2; k++) {
      box(group, M('vermilion'), bx + faceSign * 0.26, 0.3, k * (d * 0.22), 0.08, 0.48, 0.08);
    }
  }

  pagodaRoof(group, M, 0, h, 0, w + 0.9, d + 0.9, { goldTip: h > 3.2 });
  return group;
}

/**
 * Escalier en bois flottant dans le vide : droit, de biais ou totalement
 * renversé la tête en bas (façon Escher dans le Château de l’Infini).
 */
function floatingStaircase(parent, M, x, y, z, {
  steps = 8,
  width = 1.4,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
} = {}) {
  const stair = new THREE.Group();
  stair.position.set(x, y, z);
  stair.rotation.set(rotX, rotY, rotZ);
  parent.add(stair);

  const stepH = 0.24;
  const stepD = 0.38;
  for (let i = 0; i < steps; i++) {
    const sy = i * stepH;
    const sz = -i * stepD;
    box(stair, M('hinokiWarm'), 0, sy, sz, width, 0.12, stepD + 0.04);
    if (i % 2 === 0) {
      for (const sx of [-1, 1]) {
        box(stair, M('vermilion'), sx * (width / 2 - 0.06), sy + 0.32, sz, 0.07, 0.56, 0.07);
      }
    }
  }
  const length = Math.hypot(steps * stepH, steps * stepD);
  const angle = Math.atan2(steps * stepH, steps * stepD);
  for (const sx of [-1, 1]) {
    const rail = box(
      stair,
      M('vermilionBright'),
      sx * (width / 2 - 0.06),
      (steps * stepH) / 2 + 0.52,
      -(steps * stepD) / 2,
      0.08,
      0.08,
      length,
    );
    rail.rotation.x = angle;
    const stringer = box(
      stair,
      M('hinokiDark'),
      sx * (width / 2 - 0.05),
      (steps * stepH) / 2 - 0.08,
      -(steps * stepD) / 2,
      0.12,
      0.18,
      length,
    );
    stringer.rotation.x = angle;
  }
  return stair;
}

/**
 * Le Biwa à quatre cordes de Nakime posé sur son estrade de tatamis, entouré
 * de cloisons shōji coulissantes.
 */
function nakimeBiwaDais(parent, M, x, y, z, faceSign) {
  const dais = new THREE.Group();
  dais.position.set(x, y, z);
  parent.add(dais);

  // Double estrade de tatamis bordée d'or et de laque noire.
  box(dais, M('hinokiDark'), 0, 0.25, 0, 3.6, 0.5, 4.4);
  box(dais, M('gold'), 0, 0.52, 0, 3.68, 0.06, 4.48);
  box(dais, M('tatami'), 0, 0.58, 0, 3.3, 0.08, 4.1);
  box(dais, M('tatamiBorder'), 0, 0.63, 0, 3.32, 0.02, 0.14);
  box(dais, M('tatamiBorder'), 0, 0.63, 0, 0.14, 0.02, 4.12);

  // Paravents shōji décalés en arrière-plan de l'estrade.
  const backX = -faceSign * 1.45;
  for (const [dz, tone, h] of [[-1.2, 'crimson', 2.8], [0.1, 'gold', 3.2], [1.3, 'amber', 2.7]]) {
    box(dais, M('hinokiDark'), backX, 0.6 + h / 2, dz, 0.14, h, 1.35);
    shojiPanel(dais, backX + faceSign * 0.09, 0.6 + h / 2, dz, 1.2, h - 0.24, {
      tone,
      rotationY: Math.PI / 2,
    });
  }

  // Le Biwa sculpté au centre de l'estrade (caisse en goutte, manche et bachi).
  const biwa = new THREE.Group();
  biwa.position.set(faceSign * 0.25, 0.92, 0);
  biwa.rotation.y = faceSign * 0.45;
  biwa.userData.isBiwa = true;
  dais.add(biwa);

  const body = cylinder(biwa, M('biwaWood'), 0, 0.18, 0, 0.52, 0.58, 0.22, 10);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1.25, 1, 0.85);
  box(biwa, M('biwaNeck'), 0, 0.68, -0.45, 0.14, 0.95, 0.14).rotation.x = -0.55;
  box(biwa, M('ivory'), 0, 0.22, 0.15, 0.16, 0.08, 0.42); // chevalet et plectre bachi
  box(biwa, M('gold'), 0, 0.32, 0, 0.18, 0.36, 0.06);
  return dais;
}

/* ------------------------------------------------------------------ */
/* Obstacles sur les 4 voies                                           */
/* ------------------------------------------------------------------ */

/**
 * Obstacle haut sur 1 voie (`cactus`) : Pilier-lanterne Andon du Château de
 * l’Infini, en bois laqué vermillon, panneaux shōji lumineux et toit de pagode
 * kawara. Trop haut pour être sauté : il faut le contourner.
 */
function shojiPillarObstacle(M) {
  const group = new THREE.Group();
  // Socle à degrés en bois d'ébène et ferrures dorées.
  box(group, M('hinokiDark'), 0, 0.14, 0, 1.28, 0.28, 1.22);
  box(group, M('gold'), 0, 0.31, 0, 1.16, 0.06, 1.12);
  // Fût de colonne vermillon et chambre lumineuse en papier shōji.
  box(group, M('vermilion'), 0, 0.96, 0, 0.96, 1.24, 0.92);
  box(group, M('shojiPaper'), 0, 1.02, 0, 0.82, 0.96, 0.98);
  box(group, M('shojiPaper'), 0, 1.02, 0, 1.02, 0.96, 0.78);
  // Poteaux d'angle et croisillons kumiko.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(group, M('hinokiDark'), sx * 0.46, 0.98, sz * 0.44, 0.1, 1.28, 0.1);
    }
  }
  for (const y of [0.78, 1.04, 1.3]) {
    box(group, M('hinokiDark'), 0, y, 0, 1.04, 0.045, 1.0);
  }
  // Toit de pagode couronnant le pilier (hauteur totale ~2,02 m).
  pagodaRoof(group, M, 0, 1.58, 0, 1.44, 1.38);
  cylinder(group, M('gold'), 0, 1.96, 0, 0.04, 0.12, 0.16, 6);
  return group;
}

/**
 * Obstacle bas sur 2 voies (`barrier`) : Paravent shōji bas et balustrade
 * d’engawa laquée vermillon (largeur ~4,0 m, hauteur <= 0,95 m, sautable).
 */
function shojiScreenBarrier(M) {
  const group = new THREE.Group();
  // Lisse basse et lisse haute en laque vermillon et bois noir (hauteur max 0,94 m).
  box(group, M('hinokiDark'), 0, 0.1, 0, 3.98, 0.18, 0.36);
  box(group, M('vermilionBright'), 0, 0.84, 0, 4.02, 0.12, 0.38);
  box(group, M('gold'), 0, 0.92, 0, 4.04, 0.04, 0.4);

  // Quatre panneaux shōji ambrés encadrés de montants kumiko.
  box(group, M('shojiPaper'), 0, 0.48, 0, 3.76, 0.58, 0.16);
  for (let i = -4; i <= 4; i++) {
    box(group, M('hinokiDark'), i * 0.46, 0.48, 0, 0.06, 0.64, 0.22);
  }
  for (const y of [0.34, 0.62]) {
    box(group, M('hinokiDark'), 0, y, 0, 3.84, 0.045, 0.22);
  }

  // Poteaux d'extrémité à ferrures dorées.
  for (const side of [-1, 1]) {
    const px = side * 1.92;
    box(group, M('vermilion'), px, 0.47, 0, 0.18, 0.92, 0.42);
    box(group, M('gold'), px, 0.88, 0, 0.22, 0.08, 0.46);
  }
  return group;
}

export function infinityObstacle(kind) {
  const M = palette();
  return kind === 'barrier' ? shojiScreenBarrier(M) : shojiPillarObstacle(M);
}

/* ------------------------------------------------------------------ */
/* Pont laqué : lames de bois continues jusqu'à la brume               */
/* ------------------------------------------------------------------ */

export const INFINITY_DECK_PERIOD = 6;

function deckTexture(laneCount) {
  const texture = canvasTexture(`infinity-deck-${laneCount}`, 1024, 768, (ctx, w, h) => {
    const rnd = seeded(4801);
    const rows = 12;
    const rowH = h / rows;
    for (let row = 0; row < rows; row++) {
      const y = row * rowH;
      const warm = Math.floor(rnd() * 10);
      ctx.fillStyle = `rgb(${79 + warm}, ${44 + warm * 0.5}, ${39 + warm * 0.4})`;
      ctx.fillRect(0, y, w, rowH);
      // Fil du bois dans le sens de chaque lame, sans motif aléatoire par image.
      for (let grain = 0; grain < 26; grain++) {
        const gy = y + 4 + rnd() * (rowH - 8);
        ctx.strokeStyle = grain % 3 ? 'rgba(32, 17, 22, 0.16)' : 'rgba(211, 143, 91, 0.11)';
        ctx.lineWidth = 0.5 + rnd();
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(w * 0.32, gy - 2 + rnd() * 4, w * 0.68, gy - 2 + rnd() * 4, w, gy);
        ctx.stroke();
      }
      // Joints décalés et têtes de clous affleurantes : aucune bosse sur la piste.
      const joint = ((row % 3) + 1) * w / 4;
      ctx.fillStyle = 'rgba(27, 14, 19, 0.58)';
      ctx.fillRect(joint, y, 2, rowH);
      for (const x of [14, joint - 9, joint + 11, w - 14]) {
        ctx.fillStyle = 'rgba(199, 145, 86, 0.35)';
        ctx.beginPath(); ctx.arc(x, y + rowH * 0.5, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#291a21';
      ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = 'rgba(216, 153, 101, 0.22)';
      ctx.fillRect(0, y + 2, w, 1);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 120 / INFINITY_DECK_PERIOD);
  return texture;
}

/** Quatre / trois voies inchangées ; les filets de bronze sont sous les sabots. */
export function makeInfinityDeck(lanes) {
  const group = new THREE.Group();
  group.name = 'infinity-deck';
  const width = lanes[lanes.length - 1] - lanes[0] + 2.1;
  const length = 120;
  const z = -42;
  const warmHorizonFog = (mat) => {
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `#ifdef USE_FOG
          float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          float horizonWarmth = pow(smoothstep(38.0, 92.0, vFogDepth), 1.6);
          vec3 deckFog = mix(fogColor, vec3(0.18, 0.028, 0.025), horizonWarmth);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, deckFog, fogFactor);
        #endif`,
      );
    };
    return mat;
  };
  const under = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.20, length, 1, 1, 48),
    warmHorizonFog(material(0x281a23, 0.85)),
  );
  under.position.set(0, -0.30, z);
  group.add(under);
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length, 1, 48),
    warmHorizonFog(new THREE.MeshStandardMaterial({
      map: deckTexture(lanes.length),
      roughness: 0.92,
      metalness: 0.0,
      emissive: 0x321b21,
      emissiveIntensity: 0.12,
    })),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, -0.055, z);
  group.add(surface);
  const inlay = warmHorizonFog(new THREE.MeshStandardMaterial({
    color: 0xb5864c,
    emissive: 0x5c3614,
    emissiveIntensity: 0.28,
    metalness: 0.45,
    roughness: 0.55,
  }));
  const inlayGeo = new THREE.BoxGeometry(0.022, 0.006, length, 1, 1, 48);
  for (let i = 1; i < lanes.length; i++) {
    const strip = new THREE.Mesh(inlayGeo, inlay);
    strip.position.set((lanes[i - 1] + lanes[i]) / 2, -0.048, z);
    group.add(strip);
  }
  group.userData.period = INFINITY_DECK_PERIOD;
  return group;
}

/* ------------------------------------------------------------------ */
/* Socle commun d'un segment : bordure du pont, abîme et charpente     */
/* ------------------------------------------------------------------ */

function segmentGroup(index) {
  const group = new THREE.Group();
  group.position.z = 6 - index * INFINITY_SEGMENT_LENGTH;
  group.userData.speedFactor = 1;
  return group;
}

function wingBase(group, M, side, index, lanterns) {
  const s = side;
  const L = INFINITY_SEGMENT_LENGTH + 0.02;
  const rnd = seeded(index * 173 + (s > 0 ? 31 : 97));

  // Bordure dorée et garde-corps bas du grand pont central (strictement hors des 4 voies : |x| > 4,22).
  box(group, M('gold'), s * 4.34, 0.04, 0, 0.18, 0.14, L);
  box(group, M('hinokiDark'), s * 4.62, -0.14, 0, 0.44, 0.36, L);
  box(group, M('vermilion'), s * 4.66, 0.34, 0, 0.12, 0.1, L);
  for (let k = -2; k <= 2; k++) {
    const pz = k * 2.2;
    box(group, M('vermilion'), s * 4.66, 0.22, pz, 0.16, 0.46, 0.16);
    box(group, M('gold'), s * 4.66, 0.48, pz, 0.2, 0.07, 0.2);
  }

  // Piliers verticaux géants plongeant dans l'abîme et montant vers le plafond inversé.
  const wallX = s * (WALL_FACE + WALL_THICKNESS / 2);
  box(group, M('hinokiDark'), wallX, 1.5, 0, WALL_THICKNESS, 17, L);
  // Les grandes parois portent des galeries shōji en hauteur plutôt qu'un aplat sombre.
  for (const y of [-2.8, 2.5, 7.6]) {
    box(group, M('hinokiWarm'), s * (WALL_FACE - 0.09), y, 0, 0.18, 0.16, L);
  }
  for (const z of [-2.7, 2.7]) {
    shojiPanel(group, s * (WALL_FACE - 0.06), 5.6, z, 3.8, 2.5, {
      tone: (index + (z > 0 ? 1 : 0)) % 3 === 0 ? 'gold' : 'amber',
      rotationY: Math.PI / 2,
    });
  }
  for (const z of [-4.6, 0, 4.6]) {
    box(group, M('mahogany'), s * (WALL_FACE - 0.1), 1.5, z, 0.2, 17, 0.22);
    box(group, M('goldDark'), s * (WALL_FACE - 0.22), 7.6, z, 0.06, 0.26, 0.32);
  }
  for (const z of [-4.2, 0, 4.2]) {
    box(group, M('mahogany'), s * 8.2, -1.2, z, 0.48, 12.4, 0.48);
    box(group, M('gold'), s * 8.2, 4.8, z, 0.56, 0.18, 0.56);
  }
  // Traverses horizontales (nuki) reliant le pont aux tours latérales sous le niveau de la piste.
  box(group, M('hinoki'), s * 7.2, -1.6, -2.2, 5.2, 0.38, 0.42);
  box(group, M('hinoki'), s * 7.2, -3.8, 2.2, 5.2, 0.38, 0.42);

  // Pavillon inférieur en contrebas dans l'abîme.
  shojiPavilion(
    group,
    M,
    s * (8.4 + rnd() * 1.2),
    -4.6,
    -1.5 + rnd() * 3,
    2.8,
    2.6,
    4.6,
    { tone: index % 2 === 0 ? 'amber' : 'gold', faceSign: -s, balcony: true },
  );

  // Deux lanternes flottantes par segment devant les galeries latérales (hors du cône central de l'arche).
  for (let l = 0; l < 2; l++) {
    const lx = s * (6.45 + l * 1.35 + rnd() * 0.45);
    const ly = 1.35 + l * 2.4 + rnd() * 1.1;
    const lz = -3.2 + l * 5.4;
    lanterns.push(floatingLantern(group, M, lx, ly, lz, (index * 0.37 + l * 0.5 + (s > 0 ? 0.2 : 0)) % BIWA_PULSE_PERIOD));
  }
}

/* ------------------------------------------------------------------ */
/* Scènes emblématiques des ailes gauche et droite                     */
/* ------------------------------------------------------------------ */

/** Galeries superposées de cloisons shōji illuminées. */
function shojiGalleries(group, M, s) {
  shojiPavilion(group, M, s * 8.2, 0.2, -1.8, 3.2, 3.1, 5.2, { tone: 'amber', faceSign: -s });
  shojiPavilion(group, M, s * 8.6, 3.9, 1.4, 3.4, 3.0, 5.4, { tone: 'gold', faceSign: -s });
  floatingStaircase(group, M, s * 6.2, 0.1, 2.8, { steps: 9, rotY: s * 0.25 });
}

/** Escaliers impossibles façon Escher : un montant, un transversal et un la tête en bas. */
function escherStairsSector(group, M, s) {
  floatingStaircase(group, M, s * 6.4, 0.2, 3.2, { steps: 10, rotY: 0 });
  floatingStaircase(group, M, s * 7.8, 4.2, -1.2, { steps: 9, rotZ: s * (Math.PI / 2) });
  floatingStaircase(group, M, s * 7.2, 7.6, 2.6, { steps: 9, rotZ: Math.PI });
  shojiPavilion(group, M, s * 9.1, 2.2, 0, 2.8, 2.8, 4.8, { tone: 'amber', faceSign: -s });
}

/** Pagode inversée suspendue la tête en bas au-dessus de l'abîme latéral. */
function invertedPagodaSector(group, M, s) {
  // Grande tour de pagode inversée (rotation 180°) qui descend du plafond céleste.
  shojiPavilion(group, M, s * 7.6, 9.4, -0.6, 3.2, 3.4, 4.4, {
    tone: 'gold',
    inverted: true,
    faceSign: -s,
  });
  shojiPavilion(group, M, s * 7.6, 5.6, -0.6, 2.6, 2.8, 3.6, {
    tone: 'crimson',
    inverted: true,
    faceSign: -s,
  });
  // Pavillon classique en contrebas pour accentuer le vertige.
  shojiPavilion(group, M, s * 9.0, 0.0, 2.0, 3.0, 2.6, 4.2, {
    tone: 'amber',
    faceSign: -s,
  });
}

/** Salle des Lunes Supérieures : hautes colonnes vermillon, shōji écarlates et bannières « 無限 ». */
function upperMoonHall(group, M, s) {
  shojiPavilion(group, M, s * 8.4, 0.3, 0, 3.4, 4.4, 7.6, {
    tone: 'crimson',
    faceSign: -s,
  });
  for (const z of [-2.8, 2.8]) {
    cylinder(group, M('vermilionBright'), s * 6.1, 2.6, z, 0.28, 0.28, 5.2, 8);
    cylinder(group, M('gold'), s * 6.1, 0.3, z, 0.34, 0.34, 0.4, 8);
    cylinder(group, M('gold'), s * 6.1, 4.9, z, 0.34, 0.34, 0.4, 8);
  }
  kanjiScroll(group, M, '無限', s * 6.1, 2.8, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
}

/** Pavillon basculé à 90° sur le flanc : son toit pointe vers la piste ! */
function sidewaysPavilionSector(group, M, s) {
  const tilted = new THREE.Group();
  tilted.position.set(s * 9.4, 3.8, 0);
  tilted.rotation.z = s * (Math.PI / 2);
  group.add(tilted);
  shojiPavilion(tilted, M, 0, 0, 0, 3.2, 3.0, 5.6, {
    tone: 'gold',
    faceSign: 1,
    balcony: true,
  });
  floatingStaircase(group, M, s * 6.3, 1.2, -2.4, { steps: 8, rotZ: -s * 0.45 });
}

/** Atrium aux lanternes : grappes de lanternes flottantes et galeries dorées. */
function lanternAtriumSector(group, M, s, lanterns, index) {
  shojiPavilion(group, M, s * 8.8, 0.4, -1.6, 3.2, 3.0, 4.8, { tone: 'gold', faceSign: -s });
  shojiPavilion(group, M, s * 8.4, 6.8, 1.8, 3.0, 2.8, 4.4, {
    tone: 'amber',
    inverted: true,
    faceSign: -s,
  });
  for (let k = 0; k < 3; k++) {
    lanterns.push(
      floatingLantern(
        group,
        M,
        s * (6.45 + k * 0.75),
        2.2 + k * 1.35,
        -2.5 + k * 2.4,
        (index * 0.29 + k * 0.41) % BIWA_PULSE_PERIOD,
      ),
    );
  }
}

/** Portes coulissantes fusuma et tatamis figés en pleine téléportation. */
function shiftingFusumaSector(group, M, s) {
  for (const [dx, dy, dz, tone] of [
    [7.2, 1.6, -2.4, 'amber'],
    [7.8, 3.4, 0.2, 'crimson'],
    [7.4, 5.1, 2.6, 'gold'],
  ]) {
    box(group, M('hinokiDark'), s * dx, dy, dz, 0.18, 2.4, 1.7);
    shojiPanel(group, s * (dx - 0.11), dy, dz, 1.5, 2.16, {
      tone,
      rotationY: Math.PI / 2,
    });
  }
  shojiPavilion(group, M, s * 9.0, 0.2, 0.8, 3.0, 3.2, 5.0, { tone: 'amber', faceSign: -s });
}

/** Bastion de l'abîme : tours jumelles et pontons suspendus. */
function abyssKeepSector(group, M, s) {
  shojiPavilion(group, M, s * 8.3, 0.0, -2.0, 3.2, 4.6, 4.4, { tone: 'amber', faceSign: -s });
  shojiPavilion(group, M, s * 8.5, 8.8, 2.2, 3.0, 3.2, 4.2, {
    tone: 'crimson',
    inverted: true,
    faceSign: -s,
  });
  kanjiScroll(group, M, '滅', s * 7.1, 3.1, 2.2, s > 0 ? -Math.PI / 2 : Math.PI / 2);
}

/**
 * Segment de l'aile gauche (`x < 0`) du Château de l’Infini.
 */
export function infinityLeftWing(index) {
  const s = LEFT_WING_SIDE;
  const group = segmentGroup(index);
  const M = palette();
  const lanterns = [];
  const slot = index % INFINITY_SEGMENT_COUNT;
  const callouts = {
    0: 'shoji-galleries',
    1: 'biwa-dais',
    2: 'floating-stairs',
    3: 'inverted-pagoda',
    4: 'upper-moon-hall',
    5: 'infinity-bridge',
    6: 'sideways-pavilion',
    7: 'lantern-atrium',
    8: 'shifting-fusuma',
    9: 'abyss-keep',
  };

  wingBase(group, M, s, index, lanterns);

  if (slot === 0) shojiGalleries(group, M, s);
  else if (slot === 1) nakimeBiwaDais(group, M, s * 7.4, 0.2, 0, -s);
  else if (slot === 2) escherStairsSector(group, M, s);
  else if (slot === 3) invertedPagodaSector(group, M, s);
  else if (slot === 4) upperMoonHall(group, M, s);
  else if (slot === 6) sidewaysPavilionSector(group, M, s);
  else if (slot === 7) lanternAtriumSector(group, M, s, lanterns, index);
  else if (slot === 8) shiftingFusumaSector(group, M, s);
  else if (slot === 9) abyssKeepSector(group, M, s);

  group.userData.wing = 'left';
  group.userData.callout = callouts[slot];
  group.userData.lanterns = lanterns;
  return group;
}

/**
 * Segment de l'aile droite (`x > 0`) du Château de l’Infini.
 */
export function infinityRightWing(index) {
  const s = RIGHT_WING_SIDE;
  const group = segmentGroup(index);
  const M = palette();
  const lanterns = [];
  const slot = index % INFINITY_SEGMENT_COUNT;
  const callouts = {
    0: 'shoji-galleries',
    1: 'tatami-alcove',
    2: 'floating-stairs',
    3: 'inverted-pagoda',
    4: 'upper-moon-hall',
    5: 'infinity-bridge',
    6: 'sideways-pavilion',
    7: 'lantern-atrium',
    8: 'shifting-fusuma',
    9: 'abyss-keep',
  };

  wingBase(group, M, s, index, lanterns);

  if (slot === 0) shojiGalleries(group, M, s);
  else if (slot === 1) {
    shojiPavilion(group, M, s * 8.1, 0.2, -1.2, 3.2, 3.4, 5.4, { tone: 'gold', faceSign: -s });
    floatingStaircase(group, M, s * 6.2, 3.8, 2.2, { steps: 8, rotZ: Math.PI });
  } else if (slot === 2) escherStairsSector(group, M, s);
  else if (slot === 3) invertedPagodaSector(group, M, s);
  else if (slot === 4) upperMoonHall(group, M, s);
  else if (slot === 6) sidewaysPavilionSector(group, M, s);
  else if (slot === 7) lanternAtriumSector(group, M, s, lanterns, index);
  else if (slot === 8) shiftingFusumaSector(group, M, s);
  else if (slot === 9) abyssKeepSector(group, M, s);

  group.userData.wing = 'right';
  group.userData.callout = callouts[slot];
  group.userData.lanterns = lanterns;
  return group;
}

/* ------------------------------------------------------------------ */
/* Grande Arche du Pont Inversé & Horizon dimensionnel                 */
/* ------------------------------------------------------------------ */

/**
 * La Grande Arche du Château de l’Infini, franchie une fois par boucle de
 * 110 m : deux piliers monumentaux hors-piste (`|x| > 4,95`), deux grands
 * panneaux shōji coulissants ouverts sur les côtés, et une passerelle + pagode
 * renversée suspendue à plus de 9,3 m au-dessus des voies et de la caméra.
 */
export function infinityBridgeGate(index = INFINITY_GATE_INDEX) {
  const group = segmentGroup(index);
  const M = palette();
  const { halfWidth, spring, top } = INFINITY_ARCH;
  const outer = WALL_FACE + WALL_THICKNESS;
  const height = 11.6;
  const zFront = 2.8;
  const depth = 1.8;

  const shape = new THREE.Shape();
  shape.moveTo(-outer, 0);
  shape.lineTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, spring);
  shape.absarc(0, spring, top - spring, Math.PI, 0, true);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(outer, 0);
  shape.lineTo(outer, height);
  shape.lineTo(-outer, height);
  shape.closePath();

  const archWall = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 }),
    M('hinoki'),
  );
  archWall.position.z = zFront - depth;
  group.add(archWall);

  // Poutre faîtière vermillon et toit inversé tout en haut de l'arche (y >= 9,35).
  box(group, M('vermilionBright'), 0, top + 0.35, zFront - depth / 2, outer * 2, 0.36, depth + 0.28);
  box(group, M('gold'), 0, top + 0.62, zFront - depth / 2, outer * 2 + 0.2, 0.14, depth + 0.36);
  pagodaRoof(group, M, 0, height + 0.1, zFront - depth / 2, outer * 2 + 0.8, depth + 0.9);

  // Pavillon shōji renversé au sommet de l'arche (au-dessus de 9,4 m).
  box(group, M('hinokiDark'), 0, top + 1.45, zFront - depth / 2, 7.0, 1.5, depth + 0.16);
  shojiPanel(group, 0, top + 1.45, zFront + 0.1, 6.8, 1.3, { tone: 'gold' });

  // Filet de bronze autour de la voûte, à l'extérieur du passage libre.
  const radius = top - spring;
  const trimShape = new THREE.Shape();
  trimShape.absarc(0, spring, radius + 0.04, Math.PI, 0, true);
  trimShape.absarc(0, spring, radius + 0.16, 0, Math.PI, false);
  trimShape.closePath();
  const trim = new THREE.Mesh(new THREE.ExtrudeGeometry(trimShape, {
    depth: 0.06, bevelEnabled: false, curveSegments: 32,
  }), M('goldDark'));
  trim.position.z = zFront + 0.02;
  group.add(trim);
  for (const side of [-1, 1]) {
    box(group, M('goldDark'), side * (halfWidth + 0.08), spring / 2, zFront + 0.05, 0.10, spring, 0.06);
  }

  // Grands vantaux shōji coulissants ouverts de part et d'autre des voies (|x| > halfWidth).
  for (const sx of [-1, 1]) {
    const leafX = sx * (halfWidth + 0.55);
    const leaf = new THREE.Group();
    leaf.position.set(leafX, 0, zFront - depth * 0.5);
    group.add(leaf);
    box(leaf, M('vermilion'), sx * 1.8, 3.2, 0, 3.4, 6.4, 0.22);
    shojiPanel(leaf, sx * 1.8, 3.2, 0.13, 3.0, 5.8, { tone: 'amber' });
    box(leaf, M('gold'), sx * 0.25, 3.2, 0.16, 0.18, 6.4, 0.26);

    // Impostes shōji illuminées dans les écoinçons supérieurs de la Grande Arche.
    box(group, M('hinokiDark'), sx * 8.3, 8.1, zFront - 0.02, 3.4, 2.2, 0.16);
    shojiPanel(group, sx * 8.3, 8.1, zFront + 0.07, 3.1, 1.9, { tone: 'gold' });
  }

  group.userData.callout = 'infinity-bridge';
  return group;
}

/**
 * Horizon monumental du Château de l’Infini (`z < -52`) : citadelles de shōji
 * superposées, flèches de pagodes renversées qui pendent du ciel, passerelles
 * obliques et brume écarlate/ambrée au cœur de la dimension de Nakime.
 */
export function makeInfinityHorizon() {
  const group = new THREE.Group();
  group.name = 'infinity-horizon';
  const M = palette();
  const rnd = seeded(1912);

  // Citadelles à plusieurs étages : les boiseries s'estompent dans la brume
  // tandis que les cloisons shōji gardent leur lueur ambrée à travers l'arche.
  // Le retrait (|x| - w/2 > 5,1) dégage intégralement le disque solaire.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const w = 3.6 + rnd() * 2.0;
      const d = 3.8 + rnd() * 1.8;
      const x = side * (9.4 + k * 5.2 + rnd() * 1.1);
      const z = -60 - k * 4.2 - rnd() * 4;
      const storyH = 2.7 + rnd() * 0.75;
      const stories = 3 + k % 3;
      const shojiColor = k < 2 ? 0xf2ae68 : k < 4 ? 0xd98850 : 0xb86244;
      for (let level = 0; level < stories; level++) {
        const taper = 1 - level * 0.055;
        shojiPavilion(group, M, x, -3.6 + level * (storyH + 0.48), z,
          w * taper, storyH, d * taper, {
            tone: (level + k) % 3 === 0 ? 'gold' : 'amber',
            faceSign: -side,
            balcony: false,
            fog: false,
            shojiColor,
          });
      }
    }

    // Second plan plus reculé, baigné d'une lueur écarlate tamisée.
    for (let k = 0; k < 3; k++) {
      shojiPavilion(group, M, side * (20 + k * 9.5), 7 + k * 2, -89 - k * 3,
        5.2, 9 + k * 2, 4.6, {
          tone: 'crimson',
          faceSign: -side,
          balcony: false,
          fog: false,
          shojiColor: 0x9e483c,
        });
    }

    // Pagodes inversées suspendues hors de la silhouette du disque solaire.
    for (let k = 0; k < 4; k++) {
      const x = side * (8.2 + k * 6.8);
      const z = -66 - k * 4.5;
      for (let level = 0; level < 2; level++) {
        shojiPavilion(group, M, x, 28 - level * 4.0, z,
          4.0 - level * 0.4, 3.4, 3.9 - level * 0.3, {
            tone: k % 2 === 0 ? 'gold' : 'crimson',
            inverted: true,
            faceSign: -side,
            balcony: false,
            fog: false,
            shojiColor: k % 2 === 0 ? 0xe09854 : 0xc45a48,
          });
      }
    }
  }

  // Passerelles décalées vers le haut : aucune barre ne coupe le soleil.
  for (const [by, bz, tilt] of [
    [20.5, -68, 0.08],
    [27.0, -76, -0.09],
    [33.5, -84, 0.05],
  ]) {
    const bridge = new THREE.Group();
    bridge.position.set(0, by, bz);
    bridge.rotation.z = tilt;
    group.add(bridge);
    box(bridge, M('hinokiWarm'), 0, 0, 0, 36, 0.28, 1.6);
    box(bridge, M('goldDark'), 0, -0.16, 0.83, 36, 0.045, 0.07);
    box(bridge, M('vermilion'), 0, 0.68, 0.72, 35.6, 0.08, 0.08);
    for (let x = -17; x <= 17; x += 2) {
      box(bridge, M('vermilion'), x, 0.36, 0.72, 0.10, 0.65, 0.10);
    }
  }

  return group;
}
