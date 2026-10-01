/**
 * LA CENDRE — niveau « Le Chemin du Roi » — logique PURE (aucun rendu).
 *
 *   camp (feu) → porte nord → route ─┬─ chapelle : 2 gardes + COFFRE (clé)
 *                                    └─ forêt → château → GRAND PORTAIL
 *                                       (ouvert par la clé) → salle des
 *                                       piliers → ROI DE CENDRE sur son trône
 *
 * Repère : le joueur marche vers −Z (nord). Le camp reste centré en (0,0).
 * Ce module ne dépend d'aucun moteur : positions, colliders, zones,
 * arbres (déterministes), quête de la clé et interactions sont testables
 * sous Node (npm run check:souls-stage).
 */

export const STAGE = Object.freeze({
  camp: Object.freeze({ half: 17, gateHalf: 2.2 }),

  // Route principale : de la porte nord du camp au pied du château.
  road: Object.freeze([
    [0, -17], [0, -24], [0.5, -32], [3, -40], [8, -48], [11, -56],
    [10, -64], [6, -72], [2, -79], [0, -87],
  ]),
  // Chemin de traverse vers la porte de la chapelle.
  spur: Object.freeze([[0.5, -31], [-5, -31], [-11.8, -31]]),

  // Chapelle en ruine : 14 × 12 m, porte côté route (est).
  room: Object.freeze({
    minX: -27, maxX: -13, minZ: -37, maxZ: -25,
    doorZ: -31, doorHalf: 1.5, wallT: 0.8, height: 3.6,
  }),
  chest: Object.freeze({ x: -26.2, z: -31, reach: 2.4 }),
  // Décor solide de la chapelle (type, x, z, rayon de collision).
  roomProps: Object.freeze([
    Object.freeze({ t: 'pillar', x: -17.5, z: -26.6, r: 0.55 }),
    Object.freeze({ t: 'pillar', x: -17.5, z: -35.4, r: 0.55 }),
    Object.freeze({ t: 'barrel', x: -25.7, z: -26.3, r: 0.5 }),
    Object.freeze({ t: 'barrel', x: -14.6, z: -35.8, r: 0.5 }),
    Object.freeze({ t: 'brazier', x: -26, z: -28.1, r: 0.6 }),
    Object.freeze({ t: 'brazier', x: -26, z: -33.9, r: 0.6 }),
  ]),

  // Château : façade (z −91,5 → −88,5), grand portail, tours.
  castle: Object.freeze({
    zFront: -88.5, zBack: -91.5, halfWidth: 22, height: 10,
    portalHalf: 3.4, portalHeight: 7.6, towerR: 4.4,
  }),
  portal: Object.freeze({ x: 0, z: -88.5, reach: 5.4 }),

  // Salle du trône : grande nef à piliers, estrade au fond.
  hall: Object.freeze({
    minX: -9.5, maxX: 9.5, minZ: -126, maxZ: -91.5,
    wallT: 1.5, height: 10,
    pillarX: 5.4, pillarZ: Object.freeze([-98, -104.5, -111, -117]),
    pillarR: 1.55, pillarScale: 3,
    braziers: Object.freeze([[-8.2, -96], [8.2, -96], [-8.2, -108], [8.2, -108], [-8.2, -120], [8.2, -120]]),
  }),
  dais: Object.freeze({
    a: Object.freeze({ halfX: 7, zMax: -119.5, y: 0.16 }),
    b: Object.freeze({ halfX: 3.6, zMax: -121.5, y: 0.32 }),
  }),
  throne: Object.freeze({ x: 0, z: -123.4, yaw: Math.PI }),

  // Limites de la carte (murs invisibles doublés d'une lisière dense).
  bounds: Object.freeze({ minX: -35, maxX: 47, southZ: -17, northZ: -94 }),
});

/** Feux de camp : le second n'est allumé qu'à la première visite. */
export const BONFIRES = Object.freeze([
  Object.freeze({ id: 'camp', name: 'LE CAMP', x: 0, z: 0, respawn: Object.freeze({ x: 0, z: 2.15 }), lit: true }),
  Object.freeze({ id: 'seuil', name: 'LE SEUIL DU CHÂTEAU', x: -10, z: -82.5, respawn: Object.freeze({ x: -10, z: -80.2 }), lit: false }),
]);

/** Feu de camp à portée de repos (ou null). */
export function nearestBonfire(x, z, radius = 2.6) {
  let best = null;
  let bestD = radius;
  for (const f of BONFIRES) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d <= bestD) { bestD = d; best = f; }
  }
  return best;
}

// ── Zones & hauteurs ──────────────────────────────────────────────────

/** Zone nommée du point (camp, chapelle, salle du trône, extérieur). */
export function zoneAt(x, z) {
  const { hall, room, camp } = STAGE;
  if (x >= hall.minX && x <= hall.maxX && z >= hall.minZ && z <= hall.maxZ) return 'hall';
  if (x >= room.minX && x <= room.maxX + room.wallT && z >= room.minZ && z <= room.maxZ) return 'room';
  if (Math.abs(x) <= camp.half + 0.5 && z >= -camp.half - 0.5 && z <= camp.half + 0.5) return 'camp';
  return 'outside';
}

export const ZONE_LABELS = Object.freeze({
  camp: 'LE CAMP', room: 'LA CHAPELLE EN RUINE', hall: 'LA SALLE DU TRÔNE', outside: 'LE CHEMIN DU ROI',
});

/** Hauteur du sol : plate, sauf les deux marches de l'estrade du trône. */
export function stageHeight(x, z) {
  const { dais } = STAGE;
  if (Math.abs(x) <= dais.b.halfX && z <= dais.b.zMax) return dais.b.y;
  if (Math.abs(x) <= dais.a.halfX && z <= dais.a.zMax) return dais.a.y;
  return 0;
}

// ── Colliders 2D ──────────────────────────────────────────────────────

const box = (minX, maxX, minZ, maxZ, extra = {}) => ({ kind: 'aabb', minX, maxX, minZ, maxZ, ...extra });

/** Chapelle : 4 murs (la porte est libre) + le coffre. */
export function roomColliders() {
  const { room, chest, roomProps } = STAGE;
  const t = room.wallT;
  const dz0 = room.doorZ - room.doorHalf;
  const dz1 = room.doorZ + room.doorHalf;
  return [
    box(room.minX - t, room.minX, room.minZ - t, room.maxZ + t),       // ouest (fond)
    box(room.minX - t, room.maxX + t, room.minZ - t, room.minZ),       // nord
    box(room.minX - t, room.maxX + t, room.maxZ, room.maxZ + t),       // sud
    box(room.maxX, room.maxX + t, room.minZ - t, dz0),                 // est, nord de la porte
    box(room.maxX, room.maxX + t, dz1, room.maxZ + t),                 // est, sud de la porte
    box(chest.x - 0.5, chest.x + 0.5, chest.z - 0.85, chest.z + 0.85), // coffre
    ...roomProps.map((p) => ({ kind: 'circle', x: p.x, z: p.z, r: p.r })),
  ];
}

/** Portail scellé : bloque l'ouverture tant que la clé n'a pas servi. */
export function portalCollider() {
  const { castle } = STAGE;
  return box(-castle.portalHalf, castle.portalHalf, castle.zBack, castle.zFront);
}

/** Château (façade, tours), salle (murs, piliers), trône, bornes de carte. */
export function castleColliders() {
  const { castle, hall, throne, bounds } = STAGE;
  const list = [
    // façade de part et d'autre du portail
    box(-castle.halfWidth, -castle.portalHalf, castle.zBack, castle.zFront),
    box(castle.portalHalf, castle.halfWidth, castle.zBack, castle.zFront),
    // tours de façade
    { kind: 'circle', x: -castle.halfWidth, z: (castle.zFront + castle.zBack) / 2, r: castle.towerR },
    { kind: 'circle', x: castle.halfWidth, z: (castle.zFront + castle.zBack) / 2, r: castle.towerR },
    // murs de la salle : flancs + fond
    box(hall.minX - hall.wallT, hall.minX, hall.minZ - hall.wallT, castle.zBack),
    box(hall.maxX, hall.maxX + hall.wallT, hall.minZ - hall.wallT, castle.zBack),
    box(hall.minX - hall.wallT, hall.maxX + hall.wallT, hall.minZ - hall.wallT, hall.minZ),
  ];
  // piliers (2 rangées)
  for (const sx of [-1, 1]) {
    for (const z of hall.pillarZ) {
      list.push({ kind: 'circle', x: sx * hall.pillarX, z, r: hall.pillarR });
    }
  }
  for (const sx of [-1, 1]) list.push({ kind: 'circle', x: sx * 6.4, z: -86, r: 0.8 }); // braseros du portail
  for (const [bx, bz] of hall.braziers) list.push({ kind: 'circle', x: bx, z: bz, r: 0.9 });
  // trône : bloque le joueur, jamais le boss (qui s'en lève)
  // jusqu'au mur du fond : pas de recoin derrière le trône
  list.push(box(throne.x - 1.8, throne.x + 1.8, hall.minZ - 0.5, throne.z + 0.9, { playerOnly: true }));
  // bornes de la carte (invisibles)
  const b = bounds;
  list.push(
    box(b.minX - 2, b.minX, b.northZ - 2, b.southZ + 1.2),
    box(b.maxX, b.maxX + 2, b.northZ - 2, b.southZ + 1.2),
    box(b.minX - 2, -STAGE.camp.half - 0.5, b.southZ, b.southZ + 1.2),
    box(STAGE.camp.half + 0.5, b.maxX + 2, b.southZ, b.southZ + 1.2),
    box(b.minX - 2, hall.minX - hall.wallT, b.northZ - 2, b.northZ),
    box(hall.maxX + hall.wallT, b.maxX + 2, b.northZ - 2, b.northZ),
  );
  return list;
}

/** Tous les colliders fixes du niveau (hors camp, hors portail). */
export function stageColliders() {
  return [...roomColliders(), ...castleColliders()];
}

// ── Ennemis ───────────────────────────────────────────────────────────

/** Emplacements : camp ×2, chapelle ×2, route ×2, le Roi sur son trône. */
export const SPAWNS = Object.freeze([
  Object.freeze({ x: -6.2, z: -4.8 }),                                  // camp — ouest du feu
  Object.freeze({ x: 6.4, z: -4.2 }),                                   // camp — est du feu
  Object.freeze({ x: -19.5, z: -28.6, yaw: -Math.PI / 2, tag: 'room' }), // chapelle — garde nord
  Object.freeze({ x: -19.5, z: -33.4, yaw: -Math.PI / 2, tag: 'room' }), // chapelle — garde sud
  Object.freeze({ x: 6.1, z: -45 }),                                    // route — premier guetteur
  Object.freeze({ x: 10.4, z: -61.5 }),                                 // route — second guetteur
  Object.freeze({ x: 0, z: -123.4, yaw: Math.PI, name: 'ROI DE CENDRE', boss: true }),
]);

/** Paramètres communs des gardiens. */
export const MOB_AGGRO = Object.freeze({ aggroRange: 7.5, deaggroRange: 11 });

/**
 * Un ennemi ne s'éveille que si le joueur est dans SA zone : la chapelle
 * n'entend pas la route, le Roi n'entend pas la forêt.
 */
export function blockAggro(spawn, player) {
  return zoneAt(spawn.x, spawn.z) !== zoneAt(player.x, player.z);
}

// ── Quête de la clé & interactions (touche E) ─────────────────────────

export function createQuest() {
  return { hasKey: false, chestOpen: false, portalOpen: false, lit: { camp: true, seuil: false } };
}

const near = (x, z, p, r) => Math.hypot(x - p.x, z - p.z) <= r;

/** Le coffre est à portée (et fermé). */
export function atChest(q, x, z) {
  return !q.chestOpen && near(x, z, STAGE.chest, STAGE.chest.reach)
    && zoneAt(x, z) === 'room';
}

/** Le portail est à portée, côté route (devant la façade). */
export function atPortal(q, x, z) {
  return !q.portalOpen && z > STAGE.portal.z && near(x, z, STAGE.portal, STAGE.portal.reach);
}

/** Invite affichée : { kind, text } ou null. */
export function interactionPrompt(q, x, z) {
  if (atChest(q, x, z)) return { kind: 'chest', text: 'E · ouvrir le coffre' };
  if (atPortal(q, x, z)) {
    return q.hasKey
      ? { kind: 'portal', text: 'E · ouvrir le grand portail' }
      : { kind: 'portal', text: 'Le portail est scellé — il faut une clé' };
  }
  const fire = nearestBonfire(x, z);
  if (fire && !q.lit[fire.id]) return { kind: 'light', text: `E · allumer le feu — ${fire.name}` };
  return null;
}

/**
 * Touche E : coffre → clé, portail → consomme la clé, feu → allumé.
 * @returns {{kind:string, ok:boolean, message?:string}|null}
 */
export function interact(q, x, z) {
  if (atChest(q, x, z)) {
    q.chestOpen = true;
    q.hasKey = true;
    return { kind: 'chest', ok: true, message: 'Coffre ouvert — CLÉ DU ROI DE CENDRE' };
  }
  if (atPortal(q, x, z)) {
    if (!q.hasKey) return { kind: 'portal', ok: false, message: 'Le portail est scellé — il faut une clé' };
    q.hasKey = false;
    q.portalOpen = true;
    return { kind: 'portal', ok: true, message: 'La clé tourne — le grand portail s’ouvre' };
  }
  const fire = nearestBonfire(x, z);
  if (fire && !q.lit[fire.id]) {
    q.lit[fire.id] = true;
    return { kind: 'light', ok: true, message: `Feu allumé — ${fire.name}` };
  }
  return null;
}

// ── Forêt (déterministe) ──────────────────────────────────────────────

const lcg = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Distance d'un point à une polyligne. */
export function distToPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
    best = Math.min(best, Math.hypot(x - (x0 + dx * u), z - (z0 + dz * u)));
  }
  return best;
}

/** Zone interdite aux arbres : on ne bouche jamais un passage utile. */
function treeForbidden(x, z) {
  const { room, castle } = STAGE;
  if (distToPolyline(x, z, STAGE.road) < 3.7) return true;
  if (distToPolyline(x, z, STAGE.spur) < 3.2) return true;
  if (x > room.minX - 2.5 && x < room.maxX + 2.8 && z > room.minZ - 2.5 && z < room.maxZ + 2.5) return true;
  if (Math.abs(x) < castle.halfWidth + 5 && z < -76) return true; // parvis + château
  if (Math.abs(x) <= 19 && z > -20) return true; // camp
  if (Math.hypot(x - BONFIRES[1].x, z - BONFIRES[1].z) < 4) return true;
  for (const s of SPAWNS) {
    if (Math.hypot(x - s.x, z - s.z) < 3) return true;
  }
  return false;
}

/**
 * Arbres de la forêt : intérieur (avec collider) + lisière dense
 * (sans collider, les murs invisibles font le travail).
 * @returns {{x:number,z:number,s:number,kind:'pine'|'oak',yaw:number,solid:boolean}[]}
 */
export function forestTrees() {
  const { bounds } = STAGE;
  const rnd = lcg(20261001);
  const trees = [];
  const cell = 4.2;
  for (let x = bounds.minX + 2; x < bounds.maxX - 1; x += cell) {
    for (let z = bounds.northZ + 2; z < bounds.southZ - 3; z += cell) {
      const tx = x + (rnd() - 0.5) * 3.4;
      const tz = z + (rnd() - 0.5) * 3.4;
      const kind = rnd() < 0.72 ? 'pine' : 'oak';
      const s = 0.85 + rnd() * 0.7;
      const yaw = rnd() * Math.PI * 2;
      if (treeForbidden(tx, tz)) continue;
      trees.push({ x: tx, z: tz, s, kind, yaw, solid: true });
    }
  }
  // Lisière : épaisse et haute, pour fermer le monde.
  const ring = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 2.3));
    for (let i = 0; i < n; i++) {
      const u = (i + rnd() * 0.6) / n;
      const tx = x0 + (x1 - x0) * u + (rnd() - 0.5) * 1.2;
      const tz = z0 + (z1 - z0) * u + (rnd() - 0.5) * 1.2;
      if (Math.abs(tx) < STAGE.camp.half + 1 && tz > -22) continue;
      if (tz < bounds.northZ + 3 && Math.abs(tx) < STAGE.hall.maxX + 3) continue;
      trees.push({
        x: tx, z: tz, s: 1.3 + rnd() * 0.6,
        kind: rnd() < 0.8 ? 'pine' : 'oak', yaw: rnd() * Math.PI * 2, solid: false,
      });
    }
  };
  ring(bounds.minX + 1, bounds.southZ - 1.4, bounds.minX + 1, bounds.northZ + 1);
  ring(bounds.maxX - 1, bounds.southZ - 1.4, bounds.maxX - 1, bounds.northZ + 1);
  ring(bounds.minX + 1, bounds.northZ + 1, -STAGE.hall.maxX - 2, bounds.northZ + 1);
  ring(STAGE.hall.maxX + 2, bounds.northZ + 1, bounds.maxX - 1, bounds.northZ + 1);
  ring(bounds.minX + 1, bounds.southZ - 1.4, -STAGE.camp.half - 1, bounds.southZ - 1.4);
  ring(STAGE.camp.half + 1, bounds.southZ - 1.4, bounds.maxX - 1, bounds.southZ - 1.4);
  return trees;
}

/** Colliders cercles des arbres solides. */
export function treeColliders(trees = forestTrees()) {
  return trees.filter((t) => t.solid).map((t) => ({ kind: 'circle', x: t.x, z: t.z, r: 0.42 * t.s }));
}
