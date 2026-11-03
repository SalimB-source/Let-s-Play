/**
 * Décor 3D de fond pour chaque tour de la Conquête — le folklore de la tour,
 * pas des formes génériques. Chaque scène puise dans l'identité des cartes :
 * la Chambre et ses registres (Listes), le marché et les ksour (Souk), le désert
 * amazigh et le portail (Sables), l'abîme et ses bêtes (Abysses), la Régence et
 * ses galiotes (Corsaires), le Nord, drakkars et runes (Fjord), le soleil levant
 * et les torii (Soleil Rouge), la pesée des âmes (Nécropole), les corbeaux et la
 * neige noire (Corbeau), le temps renversé (Sablier), la fosse et l'encre (Oubliée).
 *
 * Réutilise le kit de maquette de tour (`makeKit`) : pierre texturée, zellige,
 * or, fenêtres lumineuses. Tout est procédural, fusionné par matériau,
 * déterministe, aux ressources propres à chaque montage. Le décor est posé
 * derrière la tour (côté opposé caméra), plus bas qu'elle ; il ne tourne pas
 * avec elle et n'est jamais rogné par les coupes de la ruine.
 */
import * as THREE from 'three';
import { makeKit, disposeStoryTowerModel, RPG_STORY_TOWER_THEMES } from './rpgStoryTowerModels.js';

// Direction horizontale de la caméra (voir `storyTowerFrame`) : le décor se
// place à l'opposé, dans le demi-plan arrière, pour ne jamais masquer la tour.
const CAMERA_XZ = new THREE.Vector2(0.63, 1).normalize();
const BACK = Math.atan2(-CAMERA_XZ.x, -CAMERA_XZ.y);

function randomFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function seedFromId(id) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i += 1) value = Math.imul(value ^ id.charCodeAt(i), 16777619) >>> 0;
  return value >>> 0;
}

/** Le sol s'estompe sur son pourtour : une île-diorama, pas un disque dur. */
function solTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot((x - size / 2) / (size / 2), (y - size / 2) / (size / 2));
      const alpha = Math.round(Math.max(0, Math.min(1, (1 - distance) / 0.4)) * 255);
      data.set([alpha, alpha, alpha, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Chaque bâtisseur reçoit le kit, les matériaux et les aides de folklore. */
const BATISSEURS = {
  // La Chambre classe les noms : registres, parchemins, astrolabes, sabliers.
  'tour-des-listes': ({ kit, m, place, random, scroll, astrolabe, hourglass, ksour }) => {
    const { x, z } = place(0, 6.2);
    ksour(x, z, 2.6);                                    // mur du registre
    kit.squareTier(0, 1.4, 1.0, { x: x - 1.9, z: z + 0.4 });
    for (let i = 0; i < 5; i += 1) {
      const p = place(-1 + i * 0.5 + random() * 0.1, 4.7 + random() * 1.2);
      scroll(p.x, 0.5 + random() * 0.9, p.z, random() * 3);
    }
    const a = place(0.85, 5.2);
    astrolabe(a.x, 1.2, a.z, 0.45);
    const h = place(-0.85, 5.4);
    hourglass(h.x, 0.7, h.z, 0.5);
    for (let i = 0; i < 3; i += 1) {
      const p = place(-0.4 + i * 0.45, 7.2 + random());
      kit.box(m.stone, p.x, 0.7, p.z, 0.5, 1.4, 0.3);   // tablettes de noms
      kit.box(m.tile, p.x, 1.45, p.z, 0.56, 0.1, 0.36);
    }
  },
  // Trente étals suspendus, auvents, dômes d'or, lanternes ; les ksour veillent.
  'tour-du-souk': ({ kit, m, place, random, pavilion, ksour }) => {
    pavilion(-0.6, 6.2, 1.2);
    pavilion(0.8, 5.4, 0.85);
    const k = place(0.1, 7.2);
    ksour(k.x, k.z, 2.8);
    for (let i = 0; i < 4; i += 1) {
      const p = place(-1.05 + i * 0.62 + random() * 0.1, 4.7 + random() * 0.8);
      kit.box(m.wood, p.x, 0.4, p.z, 1.0, 0.8, 0.7, random() * 0.5);
      kit.box(m.tile, p.x, 0.82, p.z, 1.06, 0.08, 0.76, random() * 0.5);
      kit.ribbon(i % 2 ? m.red : m.teal, p.x, 1.35, p.z, 1.2, 0.5, random() * 0.5);
      kit.cylinder(m.gold, p.x + 0.45, 1.15, p.z + 0.3, 0.03, 0.3, 1, 8);
      kit.sphere(m.window, p.x + 0.45, 1.0, p.z + 0.3, [0.09, 0.12, 0.09]);
    }
  },
  // Le désert amazigh : dunes, ergs, fennecs et le grand portail ouvert.
  'tour-des-sables': ({ kit, m, place, random, dune, fennec }) => {
    const { x, z } = place(0.1, 6.0);
    // Le portail : deux montants et un linteau, ouvert sur le désert.
    kit.box(m.stone, x - 0.9, 0.9, z, 0.5, 1.8, 0.5);
    kit.box(m.stone, x + 0.9, 0.9, z, 0.5, 1.8, 0.5);
    kit.box(m.dark, x, 1.9, z, 2.4, 0.4, 0.55);
    kit.box(m.tile, x, 0.12, z, 2.2, 0.24, 0.6);
    for (let i = 0; i < 6; i += 1) {
      const p = place(-1.2 + i * 0.45 + random() * 0.1, 5 + random() * 3.5);
      dune(p.x, p.z, 0.9 + random() * 0.9);
    }
    const f1 = place(-0.7, 4.7); fennec(f1.x, f1.z, 0.6);
    const f2 = place(0.9, 5.0); fennec(f2.x, f2.z, -0.7);
    for (let i = 0; i < 3; i += 1) {
      const p = place(-0.9 + i * 0.8, 7.4 + random());
      dune(p.x, p.z, 1.4 + random());
    }
  },
  // L'abîme garde ce que la ville a perdu : arches noyées, algues, perles, kraken.
  'tour-des-abysses': ({ kit, m, place, random, tentacle }) => {
    const { x, z } = place(0.3, 5.6);
    kit.box(m.stone, x - 0.8, 0.7, z, 0.45, 1.4, 0.45);
    kit.box(m.stone, x + 0.8, 0.7, z, 0.45, 1.4, 0.45);
    kit.box(m.dark, x, 1.5, z, 2.1, 0.35, 0.5);
    for (let i = 0; i < 5; i += 1) {
      const p = place(-1.1 + i * 0.5 + random() * 0.1, 4.7 + random() * 1.4);
      kit.ribbon(m.leaf, p.x, 0.8, p.z, 0.25, 1.4, random() * 3);
      kit.sphere(m.window, p.x + 0.2, 1.5 + random(), p.z, [0.06, 0.06, 0.06]); // perles
    }
    const t = place(-0.8, 6.4); tentacle(t.x, t.z, 1.8);
    const t2 = place(0.9, 6.8); tentacle(t2.x, t2.z, 1.4);
    const puits = place(0, 7.2);
    kit.cylinder(m.stone, puits.x, 0.4, puits.z, 0.6, 0.8, 1, 16);   // citerne
    kit.cylinder(m.water, puits.x, 0.75, puits.z, 0.5, 0.1, 1, 16);
    for (let i = 0; i < 3; i += 1) {
      const p = place(-1.2 + i * 1.1, 7.6 + random());
      const h = 0.6 + random() * 0.8;
      kit.cylinder(m.stone, p.x, h / 2, p.z, 0.18, h, 0.9, 10);      // colonnes noyées
      kit.cylinder(m.dark, p.x, h + 0.05, p.z, 0.24, 0.1, 1, 10);
    }
  },
  // La Régence : galiotes, mâts, voiles, lanternes de quai ; un phare veille.
  'tour-des-corsaires': ({ kit, m, place, random }) => {
    const { x, z } = place(-0.3, 6.0);
    const navire = kit.group(x, 0, z, 0.4);
    kit.box(m.wood, 0, 0.35, 0, 2.6, 0.6, 0.9, 0, navire);
    kit.box(m.dark, 0, 0.7, 0, 2.2, 0.14, 0.7, 0, navire);
    kit.box(m.wood, -1.2, 0.8, 0, 0.5, 0.5, 0.8, 0, navire);
    for (const mx of [-0.7, 0.5]) {
      kit.cylinder(m.wood, mx, 1.5, 0, 0.06, 2.4, 0.8, 8, navire);
      kit.ribbon(m.cream, mx, 1.7, 0.05, 0.9, 1.3, 0, false, navire);
      kit.box(m.wood, mx, 2.3, 0, 0.7, 0.05, 0.05, 0, navire);
    }
    kit.ribbon(m.red, 1.2, 2.0, 0, 0.4, 0.3, 0, true, navire);   // pavillon
    const ph = place(0.8, 6.6);
    kit.roundTier(0, 0.5, 1.5, ph.x, ph.z);
    kit.sphere(m.window, ph.x, 1.75, ph.z, [0.26, 0.28, 0.26]);
    kit.dome(ph.x, 2.0, ph.z, 0.38, 0.38);
    for (let i = 0; i < 4; i += 1) {
      const p = place(0.1 + i * 0.3, 4.6 + random() * 0.4);
      kit.cylinder(m.wood, p.x, 0.5, p.z, 0.1, 1.1, 0.9, 8);
      kit.sphere(m.window, p.x, 1.15, p.z, [0.07, 0.09, 0.07]);
    }
    const qu = place(-0.95, 4.9);
    kit.cylinder(m.wood, qu.x, 0.3, qu.z, 0.22, 0.6, 1, 10);
    kit.box(m.wood, qu.x + 0.55, 0.25, qu.z + 0.2, 0.5, 0.5, 0.5, 0.3);
  },
  // Le Nord : drakkar à tête de dragon, pierres runiques, loups, glace.
  'tour-du-fjord': ({ kit, m, place, random, drakkar, runestone, iceShard }) => {
    const { x, z } = place(-0.2, 6.2);
    drakkar(x, z, 0.5, 1.0);
    for (let i = 0; i < 4; i += 1) {
      const p = place(-1.05 + i * 0.6 + random() * 0.1, 4.8 + random() * 1.2);
      runestone(p.x, p.z, 1 + random() * 0.6);
    }
    for (let i = 0; i < 5; i += 1) {
      const p = place(-1.2 + i * 0.55 + random() * 0.1, 6.8 + random() * 1.5);
      iceShard(p.x, p.z, 1 + random() * 1.2);
    }
    for (let i = 0; i < 3; i += 1) {
      const p = place(-0.8 + i * 0.7, 8 + random());
      const s = 0.5 + random() * 0.5;
      kit.rock(m.ice, p.x, 0.1, p.z, [s * 1.4, s, s * 1.2], random() * 3);   // icebergs
    }
    const loup = place(0.95, 5.0);
    kit.sphere(m.snow, loup.x, 0.18, loup.z, [0.2, 0.14, 0.3]);      // loup des neiges
    kit.sphere(m.snow, loup.x, 0.3, loup.z + 0.26, [0.1, 0.09, 0.12]);
    kit.mesh(new THREE.ConeGeometry(0.03, 0.1, 4), m.snow, [loup.x - 0.05, 0.42, loup.z + 0.28]);
    kit.mesh(new THREE.ConeGeometry(0.03, 0.1, 4), m.snow, [loup.x + 0.05, 0.42, loup.z + 0.28]);
  },
  // Le soleil levant : torii écarlates, pagode à toits courbes, bannières, cèdres.
  'tour-du-soleil-rouge': ({ kit, m, place, random, roof }) => {
    for (let i = 0; i < 3; i += 1) {
      const p = place(-0.8 + i * 0.7, 5 + i * 0.7);
      kit.cylinder(m.red, p.x - 0.5, 0.7, p.z, 0.08, 1.5, 0.9, 8);
      kit.cylinder(m.red, p.x + 0.5, 0.7, p.z, 0.08, 1.5, 0.9, 8);
      kit.box(m.red, p.x, 1.5, p.z, 1.5, 0.12, 0.2);
      kit.box(m.dark, p.x, 1.62, p.z, 1.7, 0.1, 0.26);
      kit.box(m.red, p.x, 1.15, p.z, 1.1, 0.08, 0.16);
    }
    const { x, z } = place(0.9, 6.6);
    kit.squareTier(0, 1.2, 0.8, { x, z });
    roof(x, 0.8, z, 1.0);
    kit.squareTier(0.9, 0.85, 0.7, { x, z });
    roof(x, 1.6, z, 0.75);
    kit.finial(x, 1.9, z, 0.6);
    for (let i = 0; i < 3; i += 1) {
      const p = place(-1.1 + i * 0.9, 4.5 + random() * 0.4);
      kit.cylinder(m.wood, p.x, 0.7, p.z, 0.04, 1.4, 1, 6);
      kit.ribbon(m.red, p.x + 0.15, 1.1, p.z, 0.3, 0.7, 0, true);   // bannière
      kit.box(m.stone, p.x, 0.2, p.z, 0.2, 0.4, 0.2);
      kit.sphere(m.window, p.x, 0.5, p.z, [0.1, 0.12, 0.1]);
    }
  },
  // La pesée des âmes : chacals, obélisques, colonnes de lotus, sarcophage, pyramide.
  'tour-de-la-necropole': ({ kit, m, place, random, jackal, balance }) => {
    const { x, z } = place(0.35, 7.0);
    kit.mesh(new THREE.ConeGeometry(1.3, 1.6, 4), m.stone, [x, 0.8, z], [1, 1, 1], [0, Math.PI / 4, 0]);
    kit.mesh(new THREE.ConeGeometry(0.32, 0.42, 4), m.gold, [x, 1.75, z], [1, 1, 1], [0, Math.PI / 4, 0]);
    for (let i = 0; i < 3; i += 1) {
      const p = place(-1 + i * 0.65 + random() * 0.1, 5 + random() * 1.2);
      const h = 1.3 + random() * 0.8;
      kit.box(m.stone, p.x, h / 2, p.z, 0.3, h, 0.3);
      kit.mesh(new THREE.ConeGeometry(0.22, 0.35, 4), m.gold, [p.x, h + 0.17, p.z], [1, 1, 1], [0, Math.PI / 4, 0]);
      kit.box(m.tile, p.x, 0.12, p.z, 0.44, 0.24, 0.44);
    }
    const j = place(-0.75, 5.4); jackal(j.x, j.z, 0.5);
    const j2 = place(0.95, 5.6); jackal(j2.x, j2.z, -0.5);
    const b = place(0.1, 4.7); balance(b.x, b.z);
    // Temple mortuaire : étage à fenêtres, terrasse sombre, colonnes de lotus.
    const t = place(-0.3, 6.4);
    kit.squareTier(0, 1.5, 0.9, { x: t.x, z: t.z });
    kit.box(m.dark, t.x, 1.0, t.z, 1.7, 0.12, 1.7);
    for (const [dx, dz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) {
      kit.cylinder(m.stone, t.x + dx, 0.55, t.z + dz, 0.11, 1.1, 0.85, 10);
      kit.sphere(m.tile, t.x + dx, 1.15, t.z + dz, [0.18, 0.15, 0.18]);
    }
    kit.box(m.dark, t.x + 1.6, 0.3, t.z + 0.4, 1.0, 0.5, 0.5, 0.3);
    kit.box(m.gold, t.x + 1.6, 0.58, t.z + 0.4, 0.9, 0.08, 0.4, 0.3);
  },
  // Les corbeaux d'Odin : arbre mort, neige noire, cercle de pierres levées.
  'tour-du-corbeau': ({ kit, m, place, random, raven, standingStone }) => {
    const { x, z } = place(0.1, 5.8);
    kit.cylinder(m.dark, x, 1.0, z, 0.13, 2.1, 0.6, 7);
    const branches = [];
    for (let b = 0; b < 5; b += 1) {
      const angle = b * 1.25 + random();
      const bx = x + Math.sin(angle) * 0.4, bz = z + Math.cos(angle) * 0.4, by = 1.6 + b * 0.14;
      kit.cylinder(m.dark, bx, by, bz, 0.03, 0.8, 0.3, 5);
      branches.push([bx, by + 0.35, bz]);
    }
    raven(branches[0][0], branches[0][1], branches[0][2], 0.5);
    raven(branches[2][0], branches[2][1], branches[2][2], -0.8);
    raven(x, 2.2, z, 0.2);
    for (let i = 0; i < 7; i += 1) {
      const angle = -1.1 + i * 0.36;
      const p = place(angle, 4.7);
      standingStone(p.x, p.z, 0.6 + random() * 0.5);
    }
    for (let i = 0; i < 5; i += 1) {
      const p = place(-1 + i * 0.5, 6.6 + random());
      kit.sphere(m.dark, p.x, -0.05, p.z, [1 + random() * 0.6, 0.18, 0.9 + random() * 0.5]); // neige noire
    }
    const r = place(0.9, 4.9); raven(r.x, 0.75, r.z, -0.4);
    kit.box(m.stone, r.x, 0.3, r.z, 0.25, 0.6, 0.2);
  },
  // Le temps renversé : sablier géant, chambres inversées, anneau des cinq couleurs.
  'tour-du-sablier-renverse': ({ kit, m, place, random, hourglass }) => {
    const { x, z } = place(0.1, 6.2);
    hourglass(x, 1.15, z, 1.1, 0.35);                    // sablier géant, penché
    const couleurs = [m.gold, m.red, m.teal, m.ice, m.dark];
    const anneau = place(0.1, 6.2);
    kit.ring(m.gold, anneau.x, 0.15, anneau.z, 1.7, 0.04, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      kit.sphere(couleurs[i], anneau.x + Math.sin(a) * 1.7, 0.2, anneau.z + Math.cos(a) * 1.7, [0.12, 0.12, 0.12]);
    }
    for (let i = 0; i < 3; i += 1) {
      const p = place(-0.9 + i * 0.85, 4.8 + random() * 0.6);
      hourglass(p.x, 0.6, p.z, 0.4, (random() - 0.5) * 0.6);
    }
    for (let i = 0; i < 3; i += 1) {
      const p = place(-0.5 + i * 0.5, 7.4 + random());
      kit.box(m.stone, p.x, 0.5, p.z, 0.6, 1.0, 0.6, random());
      kit.box(m.tile, p.x, 1.05, p.z, 0.66, 0.1, 0.66, random());
    }
  },
  // La tour effacée : fosse sans fond, chaînes rompues, cloche fêlée, encre.
  'tour-oubliee': ({ kit, m, place, random, bell, chainLinks }) => {
    const { x, z } = place(0.1, 5.8);
    kit.cylinder(m.dark, x, 0.02, z, 1.1, 0.1, 1, 24);   // la fosse (sombre)
    kit.ring(m.stone, x, 0.1, z, 1.15, 0.08, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 5; i += 1) {
      const p = place(-1.1 + i * 0.5 + random() * 0.1, 4.8 + random() * 1.4);
      const h = 0.5 + random() * 1.0;
      kit.cylinder(m.stone, p.x, h / 2, p.z, 0.16, h, 0.9, 10);
      kit.box(m.dark, p.x, 0.02, p.z, 0.42, 0.12, 0.42);
    }
    const c = place(-0.7, 5.0); bell(c.x, c.z, 0.9);
    const ch = place(0.8, 5.2); chainLinks(ch.x, ch.z);
    const ch2 = place(-0.2, 6.8); chainLinks(ch2.x, ch2.z);
    for (let i = 0; i < 4; i += 1) {
      const p = place(-0.9 + i * 0.6, 6.8 + random());
      kit.sphere(m.dark, p.x, -0.05, p.z, [0.7 + random() * 0.5, 0.12, 0.6 + random() * 0.4]); // taches d'encre
    }
    const mur = place(0.4, 7.4);
    kit.box(m.stone, mur.x, 0.6, mur.z, 1.8, 1.2, 0.35, 0.2);
    kit.box(m.dark, mur.x + 0.4, 1.3, mur.z, 0.6, 0.3, 0.35, 0.2);
  },
};

export function createStoryTowerDecor(tourId, theme = RPG_STORY_TOWER_THEMES[tourId]) {
  const batisseur = BATISSEURS[tourId];
  if (!theme || !batisseur) return null;
  const random = randomFrom(seedFromId(tourId));
  const kit = makeKit(theme, tourId);
  const m = kit.materials;
  const place = (spread, radius) => {
    const a = BACK + spread;
    return { x: Math.sin(a) * radius, z: Math.cos(a) * radius };
  };

  // ── Aides de folklore, construites avec le kit de la tour ─────────────────
  const hourglass = (x, y, z, s = 1, tilt = 0) => {
    const g = kit.group(x, y, z, 0);
    if (tilt) g.rotation.z = tilt;
    kit.mesh(new THREE.ConeGeometry(s * 0.5, s * 0.8, 16), m.glass, [0, s * 0.4, 0], [1, 1, 1], [Math.PI, 0, 0], g);
    kit.mesh(new THREE.ConeGeometry(s * 0.5, s * 0.8, 16), m.glass, [0, -s * 0.4, 0], [1, 1, 1], [0, 0, 0], g);
    kit.cylinder(m.gold, 0, s * 0.8, 0, s * 0.55, 0.07, 1, 16, g);
    kit.cylinder(m.gold, 0, -s * 0.8, 0, s * 0.55, 0.07, 1, 16, g);
    for (const a of [0, 2.09, 4.19]) kit.cylinder(m.gold, Math.sin(a) * s * 0.5, 0, Math.cos(a) * s * 0.5, 0.025, s * 1.6, 1, 6, g);
  };
  const scroll = (x, y, z, yaw = 0) => {
    const g = kit.group(x, y, z, yaw);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), m.cream, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2], g);
    kit.ribbon(m.cream, 0.22, -0.15, 0, 0.4, 0.35, 0, false, g);
  };
  const astrolabe = (x, y, z, r = 0.4) => {
    const g = kit.group(x, y, z, 0);
    kit.ring(m.gold, 0, 0, 0, r, 0.025, [0, 0, 0], g);
    kit.ring(m.gold, 0, 0, 0, r * 0.7, 0.02, [Math.PI / 3, 0, 0], g);
    kit.ring(m.gold, 0, 0, 0, r * 0.45, 0.02, [0, Math.PI / 3, 0], g);
    kit.sphere(m.gold, 0, 0, 0, [0.05, 0.05, 0.05], g);
    kit.cylinder(m.gold, 0, -r - 0.2, 0, 0.03, 0.4, 1, 6, g);
  };
  const raven = (x, y, z, yaw = 0) => {
    const g = kit.group(x, y, z, yaw);
    kit.sphere(m.dark, 0, 0.07, 0, [0.09, 0.08, 0.14], g);
    kit.sphere(m.dark, 0, 0.14, 0.11, [0.055, 0.05, 0.06], g);
    kit.mesh(new THREE.ConeGeometry(0.02, 0.07, 4), m.dark, [0, 0.13, 0.18], [1, 1, 1], [Math.PI / 2, 0, 0], g);
    kit.box(m.dark, 0, 0.09, -0.16, 0.04, 0.02, 0.14, 0, g);
  };
  const runestone = (x, z, h = 1.2) => {
    kit.box(m.stone, x, h / 2, z, 0.4, h, 0.18, random() * 0.3);
    kit.box(m.gold, x, h * 0.55, z + 0.1, 0.05, h * 0.4, 0.02, 0);
  };
  const standingStone = (x, z, h = 1) => kit.box(m.stone, x, h / 2, z, 0.25, h, 0.15, random() * 0.4);
  const drakkar = (x, z, yaw = 0, s = 1) => {
    const g = kit.group(x, 0, z, yaw);
    kit.box(m.wood, 0, 0.3 * s, 0, 2.4 * s, 0.4 * s, 0.6 * s, 0, g);
    kit.mesh(new THREE.ConeGeometry(0.3 * s, 0.7 * s, 6), m.wood, [1.3 * s, 0.5 * s, 0], [1, 1, 1], [0, 0, -0.9], g);
    kit.sphere(m.wood, 1.6 * s, 0.85 * s, 0, [0.12 * s, 0.16 * s, 0.12 * s], g);
    kit.mesh(new THREE.ConeGeometry(0.06 * s, 0.2 * s, 4), m.wood, [1.72 * s, 0.9 * s, 0], [1, 1, 1], [0, 0, -1.2], g);
    kit.cylinder(m.wood, 0, 1.1 * s, 0, 0.05 * s, 1.8 * s, 0.8, 6, g);
    kit.ribbon(m.red, 0, 1.3 * s, 0.02, 1.0 * s, 1.0 * s, 0, false, g);
    for (let i = -2; i <= 2; i += 1) kit.sphere(m.gold, i * 0.4 * s, 0.5 * s, 0.32 * s, [0.11 * s, 0.11 * s, 0.04 * s], g);
  };
  const fennec = (x, z, yaw = 0) => {
    const g = kit.group(x, 0, z, yaw);
    kit.sphere(m.ground, 0, 0.13, 0, [0.15, 0.11, 0.22], g);
    kit.sphere(m.ground, 0, 0.2, 0.2, [0.09, 0.08, 0.09], g);
    kit.mesh(new THREE.ConeGeometry(0.035, 0.14, 4), m.ground, [-0.05, 0.32, 0.18], [1, 1, 1], [0, 0, 0.2], g);
    kit.mesh(new THREE.ConeGeometry(0.035, 0.14, 4), m.ground, [0.05, 0.32, 0.18], [1, 1, 1], [0, 0, -0.2], g);
    kit.sphere(m.ground, 0, 0.12, -0.26, [0.05, 0.05, 0.12], g);
  };
  const jackal = (x, z, yaw = 0) => {
    const g = kit.group(x, 0, z, yaw);
    kit.box(m.dark, 0, 0.35, 0, 0.3, 0.7, 0.4, 0, g);
    kit.box(m.dark, 0, 0.85, 0.05, 0.22, 0.25, 0.3, 0, g);
    kit.box(m.dark, 0, 0.82, 0.25, 0.12, 0.12, 0.25, 0, g);
    kit.mesh(new THREE.ConeGeometry(0.05, 0.22, 4), m.dark, [-0.08, 1.05, 0], [1, 1, 1], [0, 0, 0.15], g);
    kit.mesh(new THREE.ConeGeometry(0.05, 0.22, 4), m.dark, [0.08, 1.05, 0], [1, 1, 1], [0, 0, -0.15], g);
    kit.ring(m.gold, 0, 0.62, 0.05, 0.16, 0.025, [Math.PI / 2, 0, 0], g);
  };
  const balance = (x, z) => {
    const g = kit.group(x, 0, z, 0);
    kit.cylinder(m.gold, 0, 0.6, 0, 0.04, 1.2, 1, 8, g);
    kit.box(m.gold, 0, 1.2, 0, 1.0, 0.05, 0.05, 0, g);
    for (const dx of [-0.45, 0.45]) {
      kit.cylinder(m.gold, dx, 1.0, 0, 0.012, 0.4, 1, 4, g);
      kit.cylinder(m.gold, dx, 0.78, 0, 0.14, 0.04, 1, 12, g);
    }
    kit.sphere(m.gold, 0, 1.28, 0, [0.05, 0.05, 0.05], g);
  };
  const tentacle = (x, z, h = 1.5) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x + 0.2, h * 0.4, z + 0.1),
      new THREE.Vector3(x - 0.15, h * 0.7, z + 0.2),
      new THREE.Vector3(x + 0.1, h, z + 0.05),
    ]);
    kit.mesh(new THREE.TubeGeometry(curve, 12, 0.09, 6, false), m.leaf, [0, 0, 0]);
  };
  const bell = (x, z, s = 1) => {
    const g = kit.group(x, 0, z, 0);
    kit.mesh(new THREE.SphereGeometry(0.4 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), m.dark, [0, 0.5 * s, 0], [1, 1.2, 1], [0, 0, 0.2], g);
    kit.cylinder(m.gold, 0, 0.95 * s, 0, 0.03 * s, 0.2 * s, 1, 6, g);
  };
  const chainLinks = (x, z) => {
    // Maillons légers (le tore du kit, 6×48, serait trop coûteux pour si petit).
    const link = new THREE.TorusGeometry(0.1, 0.03, 4, 12);
    for (let i = 0; i < 4; i += 1) {
      kit.mesh(link, m.dark, [x + i * 0.18, 0.1 + (i % 2) * 0.05, z], [1, 1, 1], [Math.PI / 2 + (i % 2) * 0.5, 0, i * 0.3]);
    }
  };
  const dune = (x, z, s = 1) => kit.sphere(m.ground, x, -0.1, z, [1.6 * s, 0.35 * s, 1.1 * s]);
  const iceShard = (x, z, h = 1) => kit.mesh(new THREE.OctahedronGeometry(0.3), m.ice, [x, h * 0.5, z], [0.6, h, 0.6], [0, random() * 3, 0.1]);
  const roof = (x, y, z, r) => {
    const profile = [[0, 0.4], [0.35, 0.32], [0.65, 0.18], [0.9, 0.05], [1, 0], [1.06, 0.04]];
    kit.mesh(new THREE.LatheGeometry(profile.map(([a, b]) => new THREE.Vector2(a * r, b * r)), 4), m.dark, [x, y, z], [1, 1, 1], [0, Math.PI / 4, 0]);
  };
  const ksour = (x, z, w = 2) => {
    kit.box(m.stone, x, 0.5, z, w, 1.0, 0.4);
    for (let i = 0; i < 4; i += 1) kit.box(m.stone, x - w / 2 + 0.2 + i * (w - 0.4) / 3, 1.1, z, 0.2, 0.2, 0.4);
  };
  const pavilion = (spread, radius, s = 1, opts = {}) => {
    const { x, z } = place(spread, radius);
    kit.squareTier(0, 1.15 * s, 0.95 * s, { x, z, snow: opts.snow });
    kit.dome(x, 0.95 * s, z, 0.5 * s, 0.55 * s, opts.snow);
  };

  // Le sol : île-diorama texturée comme le socle des tours, au bord fondu.
  const solGeo = new THREE.CircleGeometry(14, 48);
  solGeo.rotateX(-Math.PI / 2);
  m.sol = new THREE.MeshStandardMaterial({
    name: 'sol', color: new THREE.Color(theme.ground).multiplyScalar(0.55),
    map: m.ground.map, roughness: 1, transparent: true, alphaMap: solTexture(), depthWrite: false,
  });
  kit.mesh(solGeo, m.sol, [0, 0, 0]);

  batisseur({ kit, m, place, random, theme, hourglass, scroll, astrolabe, raven, runestone, standingStone, drakkar, fennec, jackal, balance, tentacle, bell, chainLinks, dune, iceShard, roof, ksour, pavilion });

  // Tout est bâti au niveau y=0 puis enfoncé de 0.2 : les structures reposent
  // sur le sol (y=-0.2), lui-même sous le plan d'ombre de la scène (y=-0.1).
  kit.root.position.y = -0.2;
  const root = kit.finish();
  root.position.y = 0;
  root.name = `decor-${tourId}`;
  return { group: root, dispose: () => disposeStoryTowerModel(root) };
}
