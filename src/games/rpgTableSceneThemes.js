/**
 * Le Sablier — le décor 3D de la table (données pures).
 *
 * La table du duel reste une peinture plein cadre sous des cartes en DOM. Le
 * décor 3D ne remplace ni l'une ni les autres : il **donne du relief à la
 * peinture** (une carte de relief tirée de sa luminance, un bord de table
 * relevé), la **fait vivre** (lumière qui bouge, ombres de nuages, poussière,
 * neige, bulles, braises) et la **fait bouger** d'un souffle quand la souris
 * passe (parallaxe). Rien de ce qui se joue n'y est dessiné : les cartes,
 * les compteurs et les commandes restent du HTML, au-dessus.
 *
 * Ce fichier ne dépend ni de Three.js, ni du DOM : le catalogue, les budgets
 * et le déplacement des particules se testent donc sous Node
 * (`tests/rpg-table-3d.test.js`). `rpgTableScene.js` les met en scène.
 *
 * Coordonnées des lumières : `x` et `y` valent ±1 aux bords **visibles** de la
 * table (x vers la droite, y vers le haut) ; `z` est la hauteur au-dessus de
 * la table, en unités de scène (la table fait environ 5 de haut).
 */

import { RPG_PLATEAUX } from './rpgPlateaux.js';

/** Réglage mémorisé sur l'appareil : le décor 3D se coupe depuis la barre du duel. */
export const RPG_TABLE_3D_KEY = 'letsplay_sablier_decor3d_v1';

export function readRpgTable3dPref(storage) {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    return store?.getItem(RPG_TABLE_3D_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeRpgTable3dPref(value, storage) {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(RPG_TABLE_3D_KEY, value ? 'on' : 'off');
  } catch { /* stockage indisponible */ }
}

/**
 * Le jeu de lumières commun : l'ambiance garde la peinture à sa luminosité
 * d'origine (face à la table, `ambiante + clé ≈ 1`), la clé rasante fait
 * ressortir le relief.
 */
const base = Object.freeze({
  ambient: '#ffffff',
  ambientIntensity: 0.58,
  key: '#fff1d6',
  keyIntensity: 0.52,
  keyDirection: Object.freeze([-0.55, 0.65, 1]),
  relief: 1,
  roughness: 0.85,
  lights: Object.freeze([]),
  overlay: null,
  // Les objets 3D posés sur la table, et la peinture « vide » sans eux. Sans
  // objets, c'est la peinture du plateau (`fichier`) qui sert de plan.
  plaque: null,
  objets: Object.freeze([]),
});

const theme = (overrides) => Object.freeze({
  ...base,
  ...overrides,
  objets: Object.freeze((overrides.objets ?? []).map((objet) => Object.freeze(objet))),
});

/**
 * Une particule : `vx`/`vy` en unités de scène par seconde, `sway` l'oscillation
 * latérale, `z` la hauteur moyenne — c'est elle qui crée la parallaxe.
 */
const motes = (options) => Object.freeze({
  count: 60, size: 0.04, opacity: 0.6, vx: 0, vy: 0.03, sway: 0.15, swayHz: 0.25, z: 0.9, zSpread: 0.6, color: '#ffffff', ...options,
});

/**
 * Un lumière ponctuelle animée : `flicker` (0–1) est la variation aléatoire
 * (bougie), `pulse` l'oscillation lente, `orbit` un déplacement circulaire.
 */
const light = (options) => Object.freeze({
  color: '#ffffff', intensity: 3, distance: 6.5, decay: 1.6, x: 0, y: 0, z: 1.2, flicker: 0, pulse: 0, pulseHz: 0.2, orbit: 0, orbitHz: 0.03, ...options,
});

export const RPG_TABLE_SCENE_THEMES = Object.freeze({
  // La salle haute de la Chambre : bois sombre, astrolabe, quatre bougies.
  'table-des-heures': theme({
    key: '#ffd9a6', keyIntensity: 0.4, ambientIntensity: 0.6, relief: 1.15, roughness: 0.62,
    lights: [
      light({ color: '#ffb95e', intensity: 2.4, x: -0.86, y: 0.8, flicker: 0.28 }),
      light({ color: '#ffb95e', intensity: 2.4, x: 0.86, y: 0.8, flicker: 0.28 }),
      light({ color: '#ffb95e', intensity: 2.4, x: -0.86, y: -0.8, flicker: 0.28 }),
      light({ color: '#ffb95e', intensity: 2.4, x: 0.86, y: -0.8, flicker: 0.28 }),
    ],
    particles: motes({ count: 56, color: '#ffd89a', size: 0.032, opacity: 0.55, vy: 0.035, sway: 0.1 }),
    overlay: null,
  }),
  // Le grand désert : soleil rasant, sable soufflé, ombres de nuages.
  'erg-du-sahara': theme({
    key: '#fff0c8', keyIntensity: 0.55, keyDirection: [-0.85, 0.5, 0.9], relief: 1.5, roughness: 0.96,
    // La peinture sans ses objets (`plateau-erg-du-sahara-vide.jpg`), puis les
    // objets au même endroit. `u`/`v` : l'origine de l'objet dans l'image
    // peinte (0–1, `v` vers le bas) ; `size` : sa longueur en largeur d'image ;
    // `angle` : où pointe son grand axe, en degrés depuis la droite.
    plaque: 'plateau-erg-du-sahara-vide.jpg',
    objets: [
      { kind: 'lanterne', u: 0.0574, v: 0.9234, size: 0.217, angle: 63 },
      { kind: 'gourde', u: 0.26, v: 0.9866, size: 0.16, angle: 126 },
      { kind: 'galets', u: 0.8482, v: 0.8087, size: 0.089, angle: 0 },
      { kind: 'bol', u: 0.9216, v: 0.8756, size: 0.097, angle: 0 },
      { kind: 'corde', u: 0.9566, v: 0.1818, size: 0.092, angle: 0 },
    ],
    particles: motes({ count: 80, color: '#f6d9a0', size: 0.03, opacity: 0.5, vx: 0.32, vy: 0.012, sway: 0.05, swayHz: 0.6, z: 0.5, zSpread: 0.4 }),
    overlay: { kind: 'ombre', color: '#3a2410', opacity: 0.16, speed: 0.011, scale: 1.6 },
  }),
  // Le lit d'oued : même vent, poussière plus rouge, moins dense.
  'caravane-de-gourara': theme({
    key: '#ffdcb0', keyIntensity: 0.54, keyDirection: [-0.8, 0.55, 0.9], relief: 1.4, roughness: 0.96,
    particles: motes({ count: 56, color: '#e8b98a', size: 0.03, opacity: 0.45, vx: 0.24, vy: 0.01, sway: 0.05, swayHz: 0.5, z: 0.5, zSpread: 0.4 }),
    overlay: { kind: 'ombre', color: '#3b1d10', opacity: 0.15, speed: 0.009, scale: 1.4 },
  }),
  // Tipasa : brise marine, pierre claire, nuages rapides.
  'ruines-de-tipaza': theme({
    key: '#fff6e4', keyIntensity: 0.5, keyDirection: [-0.6, 0.7, 1], relief: 1.7, roughness: 0.88,
    particles: motes({ count: 44, color: '#f1ead8', size: 0.026, opacity: 0.45, vx: 0.14, vy: 0.04, sway: 0.12, swayHz: 0.3 }),
    overlay: { kind: 'ombre', color: '#26333a', opacity: 0.15, speed: 0.014, scale: 1.8 },
  }),
  // La glace du fjord : froide, brillante, la neige tombe.
  'fjord-des-neuf-hivers': theme({
    key: '#e5f1ff', keyIntensity: 0.52, keyDirection: [-0.5, 0.7, 1], ambient: '#f2f7ff', relief: 1.1, roughness: 0.42,
    particles: motes({ count: 90, color: '#ffffff', size: 0.038, opacity: 0.8, vx: 0.04, vy: -0.16, sway: 0.18, swayHz: 0.3, z: 1.1, zSpread: 0.8 }),
    overlay: { kind: 'ombre', color: '#1d2f45', opacity: 0.12, speed: 0.01, scale: 1.7 },
  }),
  // Le sable vitrifié : éclats de verre, deux lumières qui glissent.
  'desert-de-verre': theme({
    key: '#fff0cf', keyIntensity: 0.46, relief: 1.2, roughness: 0.3,
    lights: [
      light({ color: '#7de6d8', intensity: 2.4, x: -0.5, y: 0.3, orbit: 0.5, orbitHz: 0.035, pulse: 0.2 }),
      light({ color: '#ffc874', intensity: 2.4, x: 0.5, y: -0.3, orbit: 0.5, orbitHz: -0.028, pulse: 0.2 }),
    ],
    particles: motes({ count: 64, color: '#c9fff4', size: 0.028, opacity: 0.7, additive: true, vx: 0.05, vy: 0.02, sway: 0.2, swayHz: 0.5, z: 0.7 }),
    overlay: null,
  }),
  // Les galeries sous Bab El : obsidienne, veines de braise qui respirent.
  'cavernes-de-cristal': theme({
    ambient: '#d9c9ff', ambientIntensity: 0.62, key: '#e7d4ff', keyIntensity: 0.34, relief: 1.3, roughness: 0.4,
    lights: [
      light({ color: '#ff6a3d', intensity: 3.4, x: -0.7, y: -0.7, pulse: 0.35, pulseHz: 0.16, flicker: 0.1 }),
      light({ color: '#c05cff', intensity: 3.4, x: 0.7, y: 0.6, pulse: 0.35, pulseHz: 0.13 }),
      light({ color: '#ff8a50', intensity: 2.8, x: 0.75, y: -0.75, pulse: 0.3, pulseHz: 0.19, flicker: 0.1 }),
    ],
    particles: motes({ count: 52, color: '#ff9a62', size: 0.034, opacity: 0.75, additive: true, vx: 0.01, vy: 0.11, sway: 0.1, swayHz: 0.4, z: 0.9 }),
    overlay: null,
  }),
  // Sous la mer : caustiques qui dansent, bulles qui montent.
  'abysses-phosphorescentes': theme({
    ambient: '#e6fff8', key: '#dffff5', keyIntensity: 0.46, relief: 1.5, roughness: 0.55,
    lights: [
      light({ color: '#74fff0', intensity: 2.2, x: 0, y: 0, orbit: 0.65, orbitHz: 0.04, pulse: 0.25 }),
    ],
    particles: motes({ count: 56, color: '#e2fffb', size: 0.042, opacity: 0.55, vx: 0.01, vy: 0.12, sway: 0.16, swayHz: 0.5, z: 1, zSpread: 0.7 }),
    overlay: { kind: 'caustiques', color: '#8fffe8', opacity: 0.17, speed: 0.035, scale: 2.4 },
  }),
  // Le lac de glace du ciel : l'aurore glisse, la poudre scintille.
  'iles-celestes': theme({
    ambient: '#eaf4ff', key: '#e8f4ff', keyIntensity: 0.44, relief: 1.1, roughness: 0.35,
    lights: [
      light({ color: '#6dffb4', intensity: 2.6, x: -0.55, y: 0.45, orbit: 0.45, orbitHz: 0.026, pulse: 0.3, pulseHz: 0.12 }),
      light({ color: '#b782ff', intensity: 2.6, x: 0.55, y: -0.45, orbit: 0.45, orbitHz: -0.022, pulse: 0.3, pulseHz: 0.1 }),
    ],
    particles: motes({ count: 70, color: '#f4fbff', size: 0.03, opacity: 0.75, additive: true, vx: 0.02, vy: -0.05, sway: 0.2, swayHz: 0.25, z: 1 }),
    overlay: null,
  }),
});

/** Le décor d'un plateau : toujours un thème (celui de la Table des Heures au pire). */
export function tableSceneTheme(plateauId) {
  return RPG_TABLE_SCENE_THEMES[plateauId] ?? RPG_TABLE_SCENE_THEMES['table-des-heures'];
}

/** La peinture qui sert de plan : la plaque « vide » quand le thème pose des objets 3D. */
export function tablePlaqueFile(plateau) {
  return tableSceneTheme(plateau?.id).plaque ?? plateau?.fichier;
}

/** Les plateaux du catalogue sans thème 3D : doit toujours être vide (testé). */
export function plateauxSansDecor3d() {
  return RPG_PLATEAUX.filter((plateau) => !RPG_TABLE_SCENE_THEMES[plateau.id]).map((plateau) => plateau.id);
}

/**
 * Le budget de rendu, borné pour que le décor ne coûte jamais le jeu :
 * peu de pixels (c'est une ambiance, pas une image nette — le fond est flou
 * par nature), 30 images/s, moins de particules sur écran tactile.
 */
export function tableSceneBudget({ width = 1280, height = 720, devicePixelRatio = 1, coarse = false, degraded = 0 } = {}) {
  const area = Math.max(1, width * height);
  const pixels = (coarse ? 520000 : 900000) * (degraded > 0 ? 0.6 : 1);
  const pixelRatio = Math.max(0.5, Math.min(devicePixelRatio, coarse ? 1.25 : 1.5, Math.sqrt(pixels / area)));
  return {
    pixelRatio,
    fps: coarse || degraded > 0 ? 30 : 36,
    particles: degraded > 1 ? 0 : coarse || degraded > 0 ? 0.55 : 1,
    textureSize: coarse ? 1536 : 2048,
    reliefSize: 512,
    // Objets 3D et ombres portées : les premiers à tomber si la machine peine.
    objects: degraded < 2,
    shadows: degraded < 1,
    shadowSize: coarse ? 1024 : 2048,
  };
}

/** Un générateur déterministe : un plateau garde le même ciel à chaque ouverture. */
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * La disposition initiale des particules : `x`/`y` en fraction de la largeur
 * et de la hauteur visibles (0–1), `z` en hauteur de scène, `phase` pour que
 * les oscillations ne soient pas synchrones.
 */
export function particleLayout(particles, scale = 1, seed = 1) {
  const count = Math.max(0, Math.round((particles?.count ?? 0) * scale));
  const random = seededRandom(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push({
      x: random(),
      y: random(),
      z: Math.max(0.15, particles.z + (random() - 0.5) * 2 * particles.zSpread),
      phase: random() * Math.PI * 2,
      speed: 0.7 + random() * 0.6,
    });
  }
  return items;
}

/**
 * La position d'une particule `t` secondes après le départ, repliée dans la
 * table (elle ressort de l'autre côté). Fonction pure : testable, et sans
 * dérive numérique, quelle que soit la durée de la partie.
 * Renvoie `x`/`y` en fraction visible (−0.1 à 1.1 : un peu hors champ).
 */
export function particleAt(particles, item, t) {
  const wrap = (value) => ((value % 1.2) + 1.2) % 1.2 - 0.1;
  const sway = Math.sin(t * particles.swayHz * Math.PI * 2 + item.phase) * particles.sway * 0.1;
  // vx/vy sont en unités de scène par seconde ; la table fait ~5 de haut.
  return {
    x: wrap(item.x + 0.1 + (particles.vx * item.speed * t) / 8 + sway),
    y: wrap(item.y + 0.1 + (particles.vy * item.speed * t) / 5),
  };
}
