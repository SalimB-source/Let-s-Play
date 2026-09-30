import * as THREE from 'three';

/*
 * Dunes de l’Écho — socle commun du décor « desert » : constantes, palette, petites fonctions
 * mathématiques et relief du sable. `terrainHeight` est la référence unique du relief : le
 * terrain, les accessoires (posés sur le sable) et le reste du décor s’y fient.
 */

// ── Constantes partagées ────────────────────────────────────────────────
/** Longueur (en z) d’un segment de dunes ; le motif se répète tous les 96 m. */
export const DESERT_PERIOD = 96;
/** Bord de la piste (les dalles vont de −4,16 à +4,16). */
export const DESERT_ROAD_EDGE = 4.3;
/** Altitude du sable au pied de la piste (le dessus des dalles est à −0,05). */
export const DESERT_GROUND_Y = -0.42;
/** Les rangées d’obstacles sont masquées au-delà : elles sont déjà 100 % dans la brume. */
export const DESERT_CULL_Z = -74;

const P = DESERT_PERIOD;
export const TAU = Math.PI * 2;

/** Couleurs de l’ambiance (hex sRGB). `horizon` sert aussi de brume et de fond. */
export const DESERT_PALETTE = Object.freeze({
  horizon: 0xf0ab7c,
  coral: 0xde7768,
  violet: 0x8c4d8e,
  deep: 0x3f3274,
  sunLow: 0xff5a1c,
  sunHigh: 0xffb042,
  glow: 0xffc27a,
  // Sable : lu « tel quel » à l’écran (pas de tone-mapping), comme le ciel.
  sandDeep: 0x54305c,
  sandShade: 0x9c5e70,
  sandMid: 0xd39458,
  sandLit: 0xf0bd70,
  sandRim: 0xffd9a0,
  sandTint: 0xeac0ac,
});

// ── Petites fonctions mathématiques ─────────────────────────────────────
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** Couleur hex → vec3 en sRGB « écran » (pour les shaders qui écrivent sans tone-mapping). */
export const srgbVector = (hex) => {
  const out = { r: 0, g: 0, b: 0 };
  new THREE.Color(hex).getRGB(out, THREE.SRGBColorSpace);
  return new THREE.Vector3(out.r, out.g, out.b);
};
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function hash2(ix, iz) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Bruit de valeur dont le réseau est périodique en z (cellsZ cellules par période). */
export function vnoise(x, z, cellX, cellsZ) {
  const fx = x / cellX;
  const fz = (z / P) * cellsZ;
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const w = (k) => ((k % cellsZ) + cellsZ) % cellsZ;
  const a = hash2(ix, w(iz));
  const b = hash2(ix + 1, w(iz));
  const c = hash2(ix, w(iz + 1));
  const d = hash2(ix + 1, w(iz + 1));
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/** Petit générateur pseudo-aléatoire déterministe (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Relief : des dunes à crêtes, périodiques en z ───────────────────────
// Toutes les ondes ont un nombre d’ondes en z multiple de 2π/P : le relief
// (et donc les normales, les couleurs, les rides…) se recolle à l’identique
// après DESERT_PERIOD mètres — c’est ce qui permet la boucle sans raccord.
const kz = (m) => (TAU * m) / P;
// [nombre d’onde x, période en z, phase, poids]
const SWELLS = [[0.030, 2, 0.3, 0.50], [-0.045, 3, 2.0, 0.30], [0.012, 1, 4.1, 0.20]];
const CRESTS = [[0.160, 2, 1.1, 0.35], [-0.120, 4, 3.3, 0.30], [0.070, 5, 0.4, 0.22], [-0.210, 3, 5.2, 0.18]];
// Petites ondes de sable (8–14 m) qui donnent du relief à l’accotement, juste à côté de la piste.
const RIDGES = [[0.42, 3, 0.9, 0.40], [-0.35, 5, 2.6, 0.35], [0.55, 7, 4.4, 0.25]];

function waveSum(set, x, z) {
  let sum = 0;
  let weight = 0;
  for (const [kx, m, phase, amp] of set) {
    sum += Math.sin(kx * x + kz(m) * z + phase) * amp;
    weight += amp;
  }
  return sum / weight;
}

/**
 * Altitude du sable en (x, z). Plat sous la piste, un accotement qui se soulève
 * doucement, des dunes à crêtes de plus en plus hautes vers l’extérieur, puis
 * une « mer de sable » lointaine qui encadre l’horizon de chaque côté.
 */
export function terrainHeight(x, z) {
  const u = Math.abs(x) - DESERT_ROAD_EDGE;
  if (u <= 0) return DESERT_GROUND_Y;
  // On gauchit les coordonnées pour que les crêtes serpentent au lieu de dessiner un quadrillage.
  const wx = x + 5.5 * Math.sin(kz(2) * z + 0.045 * x + 0.6);
  const wz = z + 2.2 * Math.sin(kz(3) * z + 0.05 * x + 2.4);
  const swell = 0.5 + 0.5 * waveSum(SWELLS, wx, wz);
  const crest = Math.pow(1 - Math.abs(waveSum(CRESTS, wx, wz)), 2.2);
  const shoulder = smoothstep(0, 6, u);
  const field = smoothstep(1, 14, u);
  const sea = smoothstep(26, 85, u);
  const ridge = Math.pow(1 - Math.abs(waveSum(RIDGES, wx, wz)), 2.2);
  const nearRidges = smoothstep(0.6, 5, u) * (1 - 0.6 * smoothstep(14, 40, u));
  return DESERT_GROUND_Y
    + shoulder * (0.25 + 0.75 * swell) * 1.3
    + nearRidges * ridge * 0.85
    + field * (crest * 5.4 + swell * 2.4)
    + sea * (crest * 7.5 + swell * 7.5);
}

