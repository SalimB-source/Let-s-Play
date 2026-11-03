/**
 * Décor 3D de fond pour chaque tour de la Conquête — un environnement, pas une
 * seconde peinture. Tout est procédural (aucune image à charger) : un sol
 * teinté, des silhouettes thématiques posées derrière la tour (côté opposé à la
 * caméra) et une lueur d'accent discrète. Les pièces sont fusionnées par
 * matériau pour le mobile, le dessin est déterministe (même graine = même
 * décor), et chaque montage possède ses propres géométries/matériaux.
 *
 * Le décor ne tourne pas avec la tour : c'est le paysage, la tour pivote
 * devant lui. Il n'est jamais rogné par les plans de coupe de la ruine (groupe
 * séparé du modèle), et il reste sous la tour en hauteur pour qu'elle demeure
 * le sujet.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RPG_STORY_TOWER_THEMES } from './rpgStoryTowerModels.js';

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

// Primitives indexées (position/normale/uv cohérents) pour la fusion.
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);
const sph = (r) => new THREE.SphereGeometry(r, 8, 6);

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

/**
 * Chaque bâtisseur dépose ses silhouettes sur l'arc arrière via `place`
 * (spread en radians autour de l'axe arrière, rayon en unités de scène).
 * `add` range la géométrie dans le bon matériau : « pres » (proche, sombre),
 * « loin » (lointain, brumeux) ou « lueur » (accent lumineux).
 */
const BATISSEURS = {
  'tour-des-listes': ({ add, place, random }) => {
    for (let i = 0; i < 7; i += 1) {
      const { x, z, r } = place(-1.1 + i * 0.36 + random() * 0.1, 4.6 + random() * 3);
      const h = 1.3 + random() * 1.3, bucket = r > 6.4 ? 'loin' : 'pres';
      add(cyl(0.16, 0.2, h, 6), bucket, x, h / 2 - 0.15, z);
      if (i % 2 === 0) add(box(0.7, 0.14, 0.3), bucket, x, h - 0.1, z, { ry: random() });
    }
  },
  'tour-du-souk': ({ add, place, random }) => {
    for (let i = 0; i < 6; i += 1) {
      const { x, z, r } = place(-1 + i * 0.4 + random() * 0.12, 4.7 + random() * 3);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 0.6 + random() * 0.3;
      add(box(0.9, h, 0.7), bucket, x, h / 2 - 0.15, z, { ry: random() * 0.6 });
      add(cone(0.75, 0.45, 4), bucket, x, h + 0.1, z, { ry: Math.PI / 4 });
      add(sph(0.07), 'lueur', x + 0.4, h + 0.35, z + 0.2);
    }
  },
  'tour-des-sables': ({ add, place, random }) => {
    for (let i = 0; i < 7; i += 1) {
      const { x, z, r } = place(-1.15 + i * 0.38 + random() * 0.1, 4.8 + random() * 3.4);
      const s = 1 + random() * 1.4;
      add(sph(s), r > 6.4 ? 'loin' : 'pres', x, -0.3, z, { sy: 0.28, sx: 1.3 });
    }
    const { x, z } = place(0.3, 5.4);
    add(box(0.3, 1.6, 0.3), 'pres', x, 0.65, z, { rz: 0.12 });
  },
  'tour-des-abysses': ({ add, place, random }) => {
    for (let i = 0; i < 7; i += 1) {
      const { x, z, r } = place(-1.1 + i * 0.36 + random() * 0.1, 4.6 + random() * 3.2);
      const h = 1.2 + random() * 1.8, bucket = r > 6.4 ? 'loin' : 'pres';
      add(cone(0.35 + random() * 0.2, h, 5), bucket, x, h / 2 - 0.2, z, { rz: (random() - 0.5) * 0.2 });
      add(sph(0.06 + random() * 0.05), 'lueur', x + 0.3, h + 0.4 + random(), z);
    }
  },
  'tour-des-corsaires': ({ add, place, random }) => {
    for (let i = 0; i < 5; i += 1) {
      const { x, z, r } = place(-0.95 + i * 0.47 + random() * 0.1, 4.8 + random() * 3);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 1.8 + random() * 1.2;
      add(box(1.3, 0.35, 0.5), bucket, x, 0.05, z, { ry: random() * 0.5 });
      add(cyl(0.05, 0.06, h, 5), bucket, x, h / 2, z);
      add(box(0.8, 0.9, 0.04), bucket, x, h * 0.6, z, { ry: random() * 0.4 });
    }
  },
  'tour-du-fjord': ({ add, place, random }) => {
    for (let i = 0; i < 7; i += 1) {
      const { x, z, r } = place(-1.1 + i * 0.36 + random() * 0.1, 4.6 + random() * 3.2);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 1 + random() * 1.2;
      add(cyl(0.06, 0.08, 0.4, 5), bucket, x, 0.05, z);
      add(cone(0.45, h, 6), bucket, x, h / 2 + 0.2, z);
      add(cone(0.3, h * 0.7, 6), bucket, x, h + 0.1, z);
      if (i % 2 === 0) add(cone(0.16, 0.7, 4), 'lueur', x + 0.5, 0.2, z + 0.3);
    }
  },
  'tour-du-soleil-rouge': ({ add, place, random }) => {
    for (let i = 0; i < 5; i += 1) {
      const { x, z, r } = place(-0.95 + i * 0.47 + random() * 0.1, 4.8 + random() * 3);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 1.4 + random() * 0.5;
      add(cyl(0.08, 0.09, h, 6), bucket, x - 0.5, h / 2 - 0.15, z);
      add(cyl(0.08, 0.09, h, 6), bucket, x + 0.5, h / 2 - 0.15, z);
      add(box(1.5, 0.12, 0.18), bucket, x, h - 0.1, z);
      add(box(1.15, 0.09, 0.15), bucket, x, h - 0.4, z);
    }
  },
  'tour-de-la-necropole': ({ add, place, random }) => {
    for (let i = 0; i < 6; i += 1) {
      const { x, z, r } = place(-1 + i * 0.4 + random() * 0.12, 4.7 + random() * 3);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 1.4 + random() * 1.2;
      add(box(0.3, h, 0.3), bucket, x, h / 2 - 0.15, z);
      add(cone(0.22, 0.35, 4), bucket, x, h + 0.02, z, { ry: Math.PI / 4 });
      if (i % 2 === 0) add(sph(0.05), 'lueur', x, h + 0.25, z);
    }
  },
  'tour-du-corbeau': ({ add, place, random }) => {
    for (let i = 0; i < 6; i += 1) {
      const { x, z, r } = place(-1 + i * 0.4 + random() * 0.12, 4.7 + random() * 3);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 1.2 + random() * 0.9;
      add(cyl(0.06, 0.1, h, 5), bucket, x, h / 2 - 0.15, z, { rz: (random() - 0.5) * 0.15 });
      for (let b = 0; b < 3; b += 1) {
        add(cyl(0.02, 0.04, 0.5, 4), bucket, x + (random() - 0.5) * 0.4, h * 0.6 + b * 0.2, z, { rz: (random() - 0.5) * 1.2 });
      }
    }
  },
  'tour-du-sablier-renverse': ({ add, place, random }) => {
    for (let i = 0; i < 5; i += 1) {
      const { x, z, r } = place(-0.95 + i * 0.47 + random() * 0.1, 4.9 + random() * 3);
      const bucket = r > 6.4 ? 'loin' : 'pres', s = 0.7 + random() * 0.5;
      add(cone(s, s * 1.4, 6), bucket, x, s * 0.7 - 0.15, z, { rz: 0.3 });
      add(cone(s, s * 1.4, 6), bucket, x, s * 2.1 - 0.15, z, { rx: Math.PI, rz: 0.3 });
    }
    const { x, z } = place(-0.2, 5.2);
    add(sph(0.08), 'lueur', x, 1.4, z);
  },
  'tour-oubliee': ({ add, place, random }) => {
    for (let i = 0; i < 7; i += 1) {
      const { x, z, r } = place(-1.1 + i * 0.36 + random() * 0.1, 4.6 + random() * 3.2);
      const bucket = r > 6.4 ? 'loin' : 'pres', h = 0.5 + random() * 1.2;
      add(cyl(0.18, 0.22, h, 6), bucket, x, h / 2 - 0.15, z, { rz: (random() - 0.5) * 0.2 });
      if (i % 3 === 0) add(box(0.8, 0.16, 0.3), bucket, x + 0.4, 0.05, z + 0.3, { ry: random(), rz: 0.3 });
    }
  },
};

export function createStoryTowerDecor(tourId, theme = RPG_STORY_TOWER_THEMES[tourId]) {
  const batisseur = BATISSEURS[tourId];
  if (!theme || !batisseur) return null;
  const random = randomFrom(seedFromId(tourId));
  const group = new THREE.Group();
  group.name = `decor-${tourId}`;

  const seaux = { pres: [], loin: [], lueur: [] };
  const add = (geo, seau, x, y, z, opts = {}) => {
    const mat = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0)),
      new THREE.Vector3(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1),
    );
    geo.applyMatrix4(mat);
    seaux[seau].push(geo);
  };
  const place = (spread, radius) => {
    const a = BACK + spread;
    return { x: Math.sin(a) * radius, z: Math.cos(a) * radius, r: radius };
  };

  // Le sol : une île-diorama teintée, juste sous le socle de la tour, au bord
  // fondu pour se fondre dans le ciel du dégradé CSS plutôt qu'une arête dure.
  const solGeo = new THREE.CircleGeometry(14, 48);
  solGeo.rotateX(-Math.PI / 2);
  const solMat = new THREE.MeshStandardMaterial({
    name: `sol-${tourId}`, color: new THREE.Color(theme.ground).multiplyScalar(0.5),
    roughness: 1, metalness: 0, transparent: true, alphaMap: solTexture(), depthWrite: false,
  });
  const sol = new THREE.Mesh(solGeo, solMat);
  sol.name = `sol-${tourId}`;
  sol.position.y = -0.22;
  group.add(sol);

  // Une ligne de collines lointaines, commune à toutes les tours, pour la profondeur.
  for (let i = 0; i < 5; i += 1) {
    const { x, z } = place(-1.2 + i * 0.6 + random() * 0.15, 9 + random() * 2);
    const r = 1.8 + random() * 1.6, h = 1.4 + random() * 1.8;
    add(cone(r, h, 5), 'loin', x, h * 0.3 - 0.3, z, { sy: 0.7 });
  }

  batisseur({ add, place, random, theme });

  const materiaux = {
    pres: new THREE.MeshStandardMaterial({ name: `decor-pres-${tourId}`, color: new THREE.Color(theme.dark).multiplyScalar(0.85), roughness: 0.95, flatShading: true }),
    loin: new THREE.MeshStandardMaterial({ name: `decor-loin-${tourId}`, color: new THREE.Color(theme.dark).lerp(new THREE.Color(theme.fill), 0.35).multiplyScalar(0.6), roughness: 1, flatShading: true }),
    lueur: new THREE.MeshBasicMaterial({ name: `decor-lueur-${tourId}`, color: theme.accent, transparent: true, opacity: 0.55, depthWrite: false }),
  };
  for (const seau of ['pres', 'loin', 'lueur']) {
    if (!seaux[seau].length) { materiaux[seau].dispose(); continue; }
    const fusion = mergeGeometries(seaux[seau], false);
    seaux[seau].forEach((geo) => geo.dispose());
    const mesh = new THREE.Mesh(fusion, materiaux[seau]);
    mesh.name = `decor-${seau}-${tourId}`;
    group.add(mesh);
  }

  let libere = false;
  const dispose = () => {
    if (libere) return;
    libere = true;
    group.traverse((part) => {
      part.geometry?.dispose();
      for (const material of [].concat(part.material ?? [])) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
    group.clear();
  };
  return { group, dispose };
}
