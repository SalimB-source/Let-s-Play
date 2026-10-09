// Scène de garage 3D de Vice City Rush — l'écran de préparation type Need for
// Speed : la voiture sélectionnée est modélisée en trois.js dans une salle
// d'exposition de concessionnaire. Sol poli, façade vitrée sur la ville, mur de
// marque rétroéclairé, tapis cerise sous le plateau tournant, comptoir
// d'accueil, présentoir de jantes, coupe alignées — et le reste du catalogue
// garé au fond, étiquette de prix au poteau. La voiture du plateau porte son
// nœud de livraison. Les menus de la page (étapes, modes, villes, garage) sont
// posés par-dessus cette scène : elle ne sert que de décor.
//
// La scène sert deux écrans, et se règle sur `framing` : « garage » (plan
// serré sur la voiture qu'on choisit) et « vitrine » (plan large dézoomé, posé
// derrière l'écran-titre — voir `GARAGE_FRAMINGS`).
//
// La scène est volontairement autonome et défensive :
//   • sans contexte WebGL (vieux appareil, bac à sable de test), elle se retire
//     et la page affiche la photo du modèle à la place — aucune exception ;
//   • `prefers-reduced-motion` coupe la rotation du plateau ;
//   • la boucle de rendu se met en pause quand l'onglet est caché ou que la
//     scène sort de l'écran (batterie) ;
//   • chaque matériau et géométrie créé ici est rendu à la fermeture.
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeRacerCar, configureCarReflections } from './cityRushCars.js';
import { makeCanvasTexture, neonText, seededRandom } from './cityRushBuilder.js';
import { CITY_RUSH_CARS } from './cityRushRules.js';

/* ── La salle, en mètres ──────────────────────────────────────────────────── */
// Une salle d'exposition : le plateau occupe l'essentiel du cadre, la voiture
// est le sujet. Le décor (vitrine, enseigne, lot) l'entoure sans jamais le
// réduire.
// La salle est assez grande pour que la caméra y reste toujours, même quand le
// cadrage recule pour faire passer une voiture entière sur un écran de téléphone.
const ROOM_WIDTH = 22; // x : −11 → 11
const ROOM_DEPTH = 22; // z : −11 → 11
const ROOM_HEIGHT = 6.4;
const BACK_WALL_Z = -ROOM_DEPTH / 2;
const TURNTABLE_RADIUS = 3.6;
const TURNTABLE_TOP = 0.16; // épaisseur du plateau
const CAMERA_TARGET = new THREE.Vector3(0, 0.7, 0);
// Direction du regard : trois-quarts avant, légèrement plongeant sur la voiture.
const CAMERA_DIRECTION = new THREE.Vector3(0.738, 0.226, 0.636).normalize();
const CAMERA_FOV = 40;
// Le cadre se règle sur le plateau : il doit occuper ~92 % de la largeur visible,
// quelle que soit la forme de l'écran. Sur une fenêtre large, la caméra se
// rapproche (gros plan) ; sur un téléphone, elle recule jusqu'à ce que la
// voiture entière passe dans le cadre.
const FRAME_PLATFORM_FILL = 0.92;
const FRAME_MIN_DISTANCE = 4.4;
// Recul maximal : assez pour qu'une voiture entière (diagonale comprise, car le
// plateau tourne) passe dans le cadre d'un écran de téléphone.
const FRAME_MAX_DISTANCE = 13;
// Décalage de caméra offert par la page : à l'étape MODE, la bannière Histoire
// occupe la colonne de droite (fond opaque), donc la caméra se range à droite
// et la voiture se lit à gauche du cadre, dans le prolongement du chapeau.
// Exporté pour que la page et la scène partagent le même réglage.
export const CAMERA_SHIFT_MODE = 1.6;
const TURNTABLE_SPEED = 0.17; // rad/s : un tour en ~37 secondes

/* ── Deux cadrages, une seule scène ─────────────────────────────────────────
   · `garage`  — l'écran de préparation : le plateau remplit le cadre, la
     voiture est au nez du joueur (c'est elle qu'on choisit) ;
   · `vitrine` — l'écran-titre : on dézoome d'un gros tiers, la salle
     d'exposition entière entre dans le champ et la voiture devient un sujet dans
     un décor. Le plateau y tourne un cran plus vite, la brume de studio est
     repoussée (sans quoi un plan large ne montrerait qu'un mur délavé),
     l'objectif est ouvert à 50° pour qu'un téléphone en portrait avale la
     voiture entière sans sortir de la salle, et la résolution est bornée plus bas : un décor ne paie pas le même pixel qu'un
     écran qu'on choisit.

   Le recul reste borné : au-delà de 13 m, la caméra sortirait de la salle
   (les murs sont simples face) et le cadre ne montrerait plus que le noir. */
export const GARAGE_FRAMINGS = Object.freeze({
  garage: Object.freeze({
    fill: FRAME_PLATFORM_FILL, min: FRAME_MIN_DISTANCE, max: FRAME_MAX_DISTANCE,
    fov: CAMERA_FOV, spin: TURNTABLE_SPEED, fog: [14, 38], pixelRatio: 2,
  }),
  vitrine: Object.freeze({
    fill: 0.5, min: 5.6, max: 13, fov: 50, spin: 0.2, fog: [19, 54], pixelRatio: 1.5,
  }),
});
const POINTER_YAW = 0.14; // rad : léger déport du regard à la souris
const POINTER_PITCH = 0.26; // m : idem à la verticale
const UP = new THREE.Vector3(0, 1, 0);

/** Distance caméra ↔ plateau pour que le plateau remplisse le cadre. */
function frameDistance(fovDegrees, aspect, framing = GARAGE_FRAMINGS.garage) {
  const half = Math.tan((fovDegrees * Math.PI) / 180 / 2);
  const wanted = (TURNTABLE_RADIUS * 2) / framing.fill;
  const fitted = wanted / (2 * half * Math.max(aspect, 0.4));
  return Math.min(framing.max, Math.max(framing.min, fitted));
}

/** Le plateau ne tourne plus si l'appareil demande moins de mouvement. */
function detectReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

/** Dalles polies du showroom : un reflet net, des joints d'un cheveu, et aucune
 *  tache d'huile — on vend des voitures ici, on ne les démonte pas. */
function makeShowroomFloorTexture() {
  const floorTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0b0f16';
    ctx.fillRect(0, 0, width, height);
    const random = seededRandom(1986);
    // Quatre dalles, chacune dans sa nuance : la lumière du plafond y bavole.
    for (let tileY = 0; tileY < 2; tileY += 1) {
      for (let tileX = 0; tileX < 2; tileX += 1) {
        const x = (tileX * width) / 2;
        const y = (tileY * height) / 2;
        const tone = 10 + Math.round(random() * 9);
        const gradient = ctx.createLinearGradient(x, y, x + width / 2, y + height / 2);
        gradient.addColorStop(0, `rgb(${tone + 13},${tone + 19},${tone + 29})`);
        gradient.addColorStop(0.55, `rgb(${tone + 4},${tone + 7},${tone + 12})`);
        gradient.addColorStop(1, `rgb(${tone + 15},${tone + 21},${tone + 32})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width / 2, height / 2);
      }
    }
    // Le polissage : des traînées de reflet, verticales, plus claires que le fond.
    for (let index = 0; index < 30; index += 1) {
      ctx.fillStyle = `rgba(214,232,255,${0.018 + random() * 0.05})`;
      ctx.fillRect(random() * width, 0, 1 + random() * 3, height);
    }
    ctx.strokeStyle = 'rgba(150,180,220,.17)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, 512, 512, { smooth: true, repeat: true });
  floorTexture.repeat.set(5, 4);
  return floorTexture;
}

/** Lames sombres du mur de marque : le panneau derrière le plateau. */
function makeSlatWallTexture() {
  const slatTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0a0d13';
    ctx.fillRect(0, 0, width, height);
    const random = seededRandom(64);
    for (let x = 0; x < width; x += width / 16) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + (x / width) * 0.02})`;
      ctx.fillRect(x, 0, 2, height);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(x + 2, 0, width / 16 - 4, height);
      ctx.fillStyle = `rgba(160,195,235,${0.03 + random() * 0.03})`;
      ctx.fillRect(x + 3, height * 0.08, 1, height * 0.84);
    }
  }, 256, 256, { smooth: true, repeat: true });
  slatTexture.repeat.set(8, 1);
  return slatTexture;
}

/** La ville, vue de la vitrine : trois étages de tours et leurs fenêtres. */
function makeCityBackdropTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#04060a');
    sky.addColorStop(0.58, '#0a1119');
    sky.addColorStop(1, '#16202e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const random = seededRandom(86);
    for (let layer = 0; layer < 3; layer += 1) {
      const baseY = height * (0.66 + layer * 0.05);
      const tone = 7 + layer * 8;
      let x = -18;
      while (x < width) {
        const towerWidth = 24 + random() * 58;
        const towerHeight = (0.12 + random() * (0.4 - layer * 0.09)) * height;
        ctx.fillStyle = `rgb(${tone},${tone + 4},${tone + 11})`;
        ctx.fillRect(x, baseY - towerHeight, towerWidth, towerHeight + 40);
        for (let y = baseY - towerHeight + 6; y < baseY - 5; y += 9) {
          for (let wx = x + 4; wx < x + towerWidth - 4; wx += 8) {
            if (random() <= 0.7) continue;
            ctx.fillStyle = random() > 0.8 ? 'rgba(255,210,62,.7)' : 'rgba(160,205,255,.42)';
            ctx.fillRect(wx, y, 3, 4);
          }
        }
        x += towerWidth + 5 + random() * 14;
      }
    }
    // La rue, deux phares au loin : le concessionnaire donne sur une artère.
    ctx.fillStyle = 'rgba(180,205,240,.1)';
    ctx.fillRect(0, height * 0.9, width, 2);
    for (const [x, glow] of [[width * 0.22, 10], [width * 0.71, 7]]) {
      ctx.fillStyle = 'rgba(255,238,200,.5)';
      ctx.fillRect(x, height * 0.88, glow, 3);
    }
  }, 1024, 384, { smooth: true });
}

/** Enseigne du concessionnaire : la marque, puis ce qui tourne au plateau. */
function makeDealerSignTexture(accent, carName) {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    neonText(ctx, 'VICE CITY RUSH', width / 2, height * 0.3, `900 ${Math.round(height * 0.28)}px "Orbitron", Arial, sans-serif`, accent, 26);
    neonText(ctx, 'M O T O R S · CONCESSION 1986', width / 2, height * 0.55, `700 ${Math.round(height * 0.1)}px "Orbitron", Arial, sans-serif`, '#ffd23e', 12);
    neonText(ctx, `${carName} · SUR LE PLATEAU`, width / 2, height * 0.8, `800 ${Math.round(height * 0.12)}px "Orbitron", Arial, sans-serif`, '#eaf2ff', 14);
  }, 1024, 256, { smooth: true });
}

/** L'étiquette du vendeur : le modèle garé sur le lot, et son prix. */
function makePlacardTexture(name, price) {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(0, height - 18, width, 18);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4f6fb';
    ctx.font = `900 ${Math.round(height * 0.26)}px "Orbitron", Arial, sans-serif`;
    ctx.fillText(name, width / 2, height * 0.34);
    if (price) {
      ctx.fillStyle = '#8fd8ff';
      ctx.font = `800 ${Math.round(height * 0.22)}px "Orbitron", Arial, sans-serif`;
      ctx.fillText(`${price} $`, width / 2, height * 0.63);
    }
  }, 512, 256, { smooth: true });
}

/** Le nœud de livraison, posé sur le capot : la voiture sort de l'atelier du
 *  peintre, elle n'attend qu'un acheteur. Deux bandes, un nœud, deux boucles. */
function makeDeliveryRibbon(materials) {
  const group = new THREE.Group();
  group.name = 'vice-city-garage-ribbon';
  const band = (rotation) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.02, 0.19), materials.ribbon);
    mesh.rotation.y = rotation;
    mesh.position.y = 0.012;
    mesh.castShadow = false;
    return mesh;
  };
  group.add(band(0.34), band(-0.34));
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), materials.ribbon);
  knot.position.y = 0.06;
  group.add(knot);
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 20, Math.PI * 1.25), materials.ribbon);
    loop.position.set(side * 0.2, 0.1, 0);
    loop.rotation.set(Math.PI / 2, 0, side * 0.5);
    loop.scale.set(1, 1, 0.6);
    group.add(loop);
  }
  return group;
}

/** Le comptoir d'accueil : caisson laqué, plateau d'acier, bandeau de marque et
 *  fronton lumineux — `brandTexture` est dessiné par l'appelant, qui connaît le
 *  nom de la salle. */
function makeReceptionDesk(materials, brandTexture) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.02, 0.86), materials.desk);
  body.position.y = 0.51;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.34, 0.07, 1.02), materials.brushed);
  top.position.y = 1.06;
  top.castShadow = true;
  group.add(top);
  // Le bandeau cerise qui fait le tour du comptoir.
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.1, 0.9), materials.accent);
  band.position.y = 0.86;
  group.add(band);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.02, 1.5), materials.desk);
    wing.position.set(side * 1.66, 0.51, 0.3);
    wing.castShadow = true;
    group.add(wing);
  }
  if (brandTexture) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.46), new THREE.MeshBasicMaterial({
      map: brandTexture, transparent: true, toneMapped: false,
    }));
    plate.position.set(0, 1.42, 0.45);
    group.add(plate);
  }
  return group;
}

/** Pot de palmier : la plante du showroom, six feuilles et un tronc. */
function makePlanter(materials) {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.42, 16), materials.brushed);
  pot.position.y = 0.21;
  pot.castShadow = true;
  group.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 16), materials.rubber);
  soil.position.y = 0.43;
  group.add(soil);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 8), materials.slatDark);
  trunk.position.y = 0.88;
  group.add(trunk);
  for (let index = 0; index < 6; index += 1) {
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.82), materials.palm);
    frond.position.set(0, 1.32, 0);
    frond.rotation.set(-0.42, (index / 6) * Math.PI * 2, 0);
    frond.translateZ(0.36);
    group.add(frond);
  }
  return group;
}

/** Présentoir de jantes : une tablette d'acier, trois roues debout. */
function makeWheelRack(materials) {
  const group = new THREE.Group();
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.07, 0.6), materials.brushed);
  shelf.position.y = 0.92;
  shelf.receiveShadow = true;
  group.add(shelf);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 0.5), materials.mullion);
    leg.position.set(side * 1.1, 0.46, 0);
    group.add(leg);
  }
  for (const offset of [-0.76, 0, 0.76]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 20), materials.rubber);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(offset, 1.28, 0);
    tire.castShadow = true;
    group.add(tire);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 14), materials.chrome);
    face.rotation.z = Math.PI / 2;
    face.position.set(offset, 1.28, 0);
    group.add(face);
  }
  return group;
}

/** Tabouret de vendeur : piétement gazelle, assise rondelle. */
function makeStool(materials) {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 18), materials.desk);
  seat.position.y = 0.66;
  seat.castShadow = true;
  group.add(seat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 10), materials.chrome);
  stem.position.y = 0.33;
  group.add(stem);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 22), materials.brushed);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = 0.03;
  group.add(foot);
  return group;
}

/** La tablette des coupes : deux étagères rétroéclairées, trois trophées. */
function makeTrophyShelf(materials) {
  const group = new THREE.Group();
  for (const y of [0, 0.78]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.36), materials.brushed);
    shelf.position.y = y;
    group.add(shelf);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 0.3), materials.lamp);
    glow.position.set(0, y - 0.04, 0.02);
    group.add(glow);
  }
  for (const offset of [-0.66, 0, 0.66]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.05, 0.2, 14), materials.chrome);
    cup.position.set(offset, 0.13, 0);
    group.add(cup);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.chrome);
    bowl.position.set(offset, 0.23, 0);
    group.add(bowl);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.16), materials.slatDark);
    base.position.set(offset, 0.025, 0);
    group.add(base);
  }
  return group;
}

/** Tôles peintes du garage : bandes et joints verticaux. */
function makeWallTexture() {
  const texture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, width, height);
    const random = seededRandom(64);
    for (let index = 0; index < 900; index += 1) {
      ctx.fillStyle = `rgba(255,255,255,${random() * 0.02})`;
      ctx.fillRect(random() * width, random() * height, 2, 2);
    }
    ctx.fillStyle = 'rgba(150,175,210,.055)';
    for (let x = 0; x < width; x += width / 4) ctx.fillRect(x, 0, 2, height);
    ctx.fillStyle = 'rgba(255,255,255,.016)';
    for (let y = 0; y < height; y += height / 6) ctx.fillRect(0, y, width, 2);
  }, 256, 256, { smooth: true, repeat: true });
  texture.repeat.set(6, 2);
  return texture;
}

/** Halo radial réutilisé pour le néon et les poussières. */
function makeGlowTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,.42)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, 128, 128, { smooth: true });
}

export default function ViceCityGarageStage({
  carId,
  carName,
  accent = '#48edc2',
  fallbackSrc = '',
  fallbackLabel = 'GARAGE 3D INDISPONIBLE SUR CET APPAREIL',
  cameraShift = 0,
  framing = 'garage',
}) {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    // Bac à sable de test ou appareil sans WebGL : la photo du modèle prend le
    // relais, posée par la page sous forme de repli.
    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return undefined;
    }

    const frame = GARAGE_FRAMINGS[framing] || GARAGE_FRAMINGS.garage;
    const reducedMotion = detectReducedMotion();
    // Appareil tactile (ou écran à pointeur grossier) : la scène reste entière
    // mais sans carte d'ombres — le décor, lui, ne bouge pas.
    const lite = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
    const accentColor = new THREE.Color(accent);
    const profile = CITY_RUSH_CARS.find((car) => car.id === carId) || CITY_RUSH_CARS[0];

    // Tout ce que la scène fabrique elle-même est rendu à la fermeture.
    const ownGeometries = new Set();
    const ownMaterials = new Set();
    const ownTextures = new Set();
    const geometry = (build) => {
      const item = build();
      ownGeometries.add(item);
      return item;
    };
    const material = (build) => {
      const item = build();
      ownMaterials.add(item);
      return item;
    };
    const texture = (build) => {
      const item = build();
      ownTextures.add(item);
      return item;
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.Fog(0x04060a, frame.fog[0], frame.fog[1]);

    const camera = new THREE.PerspectiveCamera(frame.fov, 1, 0.1, 60);
    // Distance de cadrage : réglée à chaque changement de taille pour que le
    // plateau remplisse le cadre (voir `frameDistance`). La boucle de rendu
    // replace ensuite la caméra à chaque image (parallasse, décalage de page).
    let distance = frame.min;
    const applyCameraBase = () => {
      camera.position.copy(CAMERA_DIRECTION).multiplyScalar(distance).add(CAMERA_TARGET);
      camera.position.x += Number(cameraShift) || 0;
      camera.lookAt(CAMERA_TARGET);
    };

    // Le plafond de résolution suit le cadrage : l'écran qu'on choisit se rend
    // net, le décor de l'écran-titre rend juste assez net — la salle entière,
    // ses trois voitures garées et ses vingt dalles lumineuses tournent en
    // continu derrière un menu.
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, frame.pixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'city-rush-hub-stage-canvas-element';
    mount.appendChild(renderer.domElement);

    /* ── Matériaux du décor ───────────────────────────────────────────────── */
    const materials = {
      concrete: material(() => new THREE.MeshStandardMaterial({
        map: texture(makeShowroomFloorTexture), color: 0xffffff, roughness: 0.17, metalness: 0.62, envMapIntensity: 1.05,
      })),
      wall: material(() => new THREE.MeshStandardMaterial({
        map: texture(makeWallTexture), color: 0xffffff, roughness: 0.92, metalness: 0.04,
      })),
      ceiling: material(() => new THREE.MeshStandardMaterial({ color: 0x0a0d13, roughness: 0.95, metalness: 0.05 })),
      /* Le mobilier de la concession. Tout est partagé entre les objets d'un
         même montage et rendu au démontage — un showroom ne se monte deux fois. */
      lamp: material(() => new THREE.MeshBasicMaterial({ color: 0xaebdd2, toneMapped: false })),
      mullion: material(() => new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.52, metalness: 0.62 })),
      brushed: material(() => new THREE.MeshStandardMaterial({ color: 0x93a1b6, roughness: 0.26, metalness: 0.88 })),
      glass: material(() => new THREE.MeshPhysicalMaterial({
        color: 0x9dc0dd, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.14,
        side: THREE.DoubleSide, depthWrite: false,
      })),
      night: material(() => new THREE.MeshBasicMaterial({ map: texture(makeCityBackdropTexture), color: 0x93a6c2, toneMapped: false })),
      asphalt: material(() => new THREE.MeshStandardMaterial({ color: 0x131820, roughness: 0.94, metalness: 0.02 })),
      slat: material(() => new THREE.MeshStandardMaterial({ map: texture(makeSlatWallTexture), color: 0xffffff, roughness: 0.66, metalness: 0.22 })),
      slatDark: material(() => new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.8, metalness: 0.1 })),
      carpet: material(() => new THREE.MeshStandardMaterial({ color: 0x2d0e1a, roughness: 0.98, metalness: 0 })),
      desk: material(() => new THREE.MeshStandardMaterial({ color: 0x161d27, roughness: 0.36, metalness: 0.34 })),
      ribbon: material(() => new THREE.MeshPhysicalMaterial({ color: 0xd8203c, roughness: 0.26, metalness: 0.08, clearcoat: 0.85, clearcoatRoughness: 0.14 })),
      palm: material(() => new THREE.MeshStandardMaterial({ color: 0x2f6b46, roughness: 0.78, metalness: 0.02 })),
      grate: material(() => new THREE.MeshStandardMaterial({ color: 0x1b222c, roughness: 0.62, metalness: 0.6 })),
      steel: material(() => new THREE.MeshStandardMaterial({ color: 0x232b36, roughness: 0.4, metalness: 0.7 })),
      steelDark: material(() => new THREE.MeshStandardMaterial({ color: 0x161c25, roughness: 0.5, metalness: 0.55 })),
      chrome: material(() => new THREE.MeshStandardMaterial({ color: 0xc6cfdb, roughness: 0.22, metalness: 0.85 })),
      rubber: material(() => new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.96, metalness: 0.03 })),
      red: material(() => new THREE.MeshStandardMaterial({ color: 0xa11d2b, roughness: 0.45, metalness: 0.4 })),
      strip: material(() => new THREE.MeshBasicMaterial({ color: 0xeaf4ff, toneMapped: false })),
      accent: material(() => new THREE.MeshBasicMaterial({ color: accentColor, toneMapped: false })),
      mark: material(() => new THREE.MeshBasicMaterial({ color: 0xf2c14e, toneMapped: false, transparent: true, opacity: 0.55 })),
      platform: material(() => new THREE.MeshStandardMaterial({ color: 0x171d26, roughness: 0.34, metalness: 0.72 })),
      sign: material(() => new THREE.MeshBasicMaterial({
        map: texture(() => makeDealerSignTexture(accent, carName || profile.name)),
        transparent: true, toneMapped: false, depthWrite: false,
      })),
      glow: material(() => new THREE.MeshBasicMaterial({
        map: texture(makeGlowTexture), color: accentColor, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })),
      dust: material(() => new THREE.PointsMaterial({
        size: 0.055, map: texture(makeGlowTexture), color: 0xbfd4ff, transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false,
      })),
    };

    /* ── La concession ────────────────────────────────────────────────────── */
    // Plus un atelier, un **showroom**. Trois murs et une vitrine :
    //   · à gauche, là où regarde la caméra — la façade vitrée d'une concession :
    //     menuiseries noires, verre teinté, et la ville de 1986 derrière ;
    //   · au fond — le mur de marque : lames sombres, enseigne rétroéclairée,
    //     tablette des coupes ;
    //   · à droite et devant — la tôle peinte du service, sobre, pour que le
    //     regard revienne toujours au plateau.
    // Le sol est poli : il renvoie le néon et les phares. Sous le plateau, un
    // tapis cerise de trois mètres et quatre poteaux à cordon tiennent la
    // distance du client.
    const room = new THREE.Group();
    room.name = 'vice-city-garage-room';
    scene.add(room);

    // Les objets forgés ici — et par personne d'autre — rendent leurs géométries
    // et leurs matériaux au démontage de la scène.
    const own = (object) => {
      object.traverse((child) => {
        if (child.geometry) ownGeometries.add(child.geometry);
        ownMaterialsOf(child);
      });
      return object;
    };
    // Une voiture du lot, elle, sort du constructeur de la course : ses
    // géométries sont pour beaucoup des constantes du module (`UNIT_BOX`,
    // `HEADLIGHT_CONE`…) partagées avec le plateau de course. Elles se
    // gardent bien d'être rendues — seuls ses matériaux sont à nous, comme
    // pour la voiture montée au plateau.
    const materialsOf = (child) => (Array.isArray(child.material) ? child.material : child.material ? [child.material] : []);
    const ownMaterialsOf = (child) => materialsOf(child).forEach((item) => ownMaterials.add(item));
    const ownModelMaterials = (object) => {
      object.traverse((child) => ownMaterialsOf(child));
      return object;
    };

    const floor = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH)), materials.concrete);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    const ceiling = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH)), materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    room.add(ceiling);

    // Le plafond de showroom : un damier de dalles lumineuses, pas trois
    // néons d'atelier. Elles sont émissives — la lumière vraie vient des
    // projecteurs, les dalles donnent la raison.
    const panelGeometry = geometry(() => new THREE.BoxGeometry(1.5, 0.06, 0.62));
    for (const row of [-1, 0, 1]) {
      for (const column of [-2, -1, 0, 1, 2]) {
        const panel = new THREE.Mesh(panelGeometry, materials.lamp);
        panel.position.set(column * 2.1, ROOM_HEIGHT - 0.06, row * 3.4);
        room.add(panel);
        const frame = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(1.66, 0.04, 0.78)), materials.mullion);
        frame.position.set(column * 2.1, ROOM_HEIGHT - 0.11, row * 3.4);
        room.add(frame);
      }
    }

    const wallPanels = [
      // Le mur de gauche tombe : c'est la vitrine.
      { size: [ROOM_DEPTH, ROOM_HEIGHT], position: [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0], material: 'wall' },
      { size: [ROOM_WIDTH, ROOM_HEIGHT], position: [0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2], rotation: [0, Math.PI, 0], material: 'wall' },
    ];
    for (const panel of wallPanels) {
      const wall = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(panel.size[0], panel.size[1])), materials[panel.material]);
      wall.position.set(...panel.position);
      wall.rotation.set(...panel.rotation);
      wall.receiveShadow = true;
      room.add(wall);
    }

    /* ── La façade vitrée ─────────────────────────────────────────────────── */
    const STOREFRONT_X = -ROOM_WIDTH / 2 + 0.06;
    const glass = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(ROOM_DEPTH - 1.6, 3.9)), materials.glass);
    glass.name = 'vice-city-garage-storefront';
    glass.position.set(STOREFRONT_X, 2.05, 0);
    glass.rotation.y = Math.PI / 2;
    room.add(glass);

    // Menuiseries : montants tous les 2,2 m, traverse haute, allège au sol.
    for (let index = -4; index <= 4; index += 1) {
      const mullion = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.12, 4.3, 0.16)), materials.mullion);
      mullion.position.set(STOREFRONT_X, 2.15, index * 2.2);
      mullion.castShadow = true;
      room.add(mullion);
    }
    for (const y of [0.2, 4.28]) {
      const rail = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.16, 0.14, ROOM_DEPTH - 1.4)), materials.mullion);
      rail.position.set(STOREFRONT_X, y, 0);
      room.add(rail);
    }
    const transom = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.14, 0.1, ROOM_DEPTH - 1.4)), materials.accent);
    transom.position.set(STOREFRONT_X, 3.05, 0);
    room.add(transom);

    // La ville, dehors : un plan lointain, éclairé pour lui seul. Sans lui, la
    // vitrine ne serait qu'un trou noir.
    const city = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(30, 11)), materials.night);
    city.name = 'vice-city-garage-city';
    city.position.set(STOREFRONT_X - 6.4, 3.4, 0.6);
    city.rotation.y = Math.PI / 2;
    room.add(city);
    const street = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(8, ROOM_DEPTH)), materials.asphalt);
    street.rotation.x = -Math.PI / 2;
    street.rotation.z = Math.PI / 2;
    street.position.set(STOREFRONT_X - 4.2, 0.01, 0);
    room.add(street);

    /* ── Le mur de marque ─────────────────────────────────────────────────── */
    const brandWall = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT)), materials.slat);
    brandWall.name = 'vice-city-garage-brand-wall';
    brandWall.position.set(0, ROOM_HEIGHT / 2, BACK_WALL_Z + 0.05);
    brandWall.receiveShadow = true;
    room.add(brandWall);

    // L'enseigne, à plat sur le mur, et son halo : la salle entière la doit.
    const signGlow = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(11, 4)), materials.glow);
    signGlow.position.set(0, 3.34, BACK_WALL_Z + 0.14);
    room.add(signGlow);
    const sign = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(8.6, 2.15)), materials.sign);
    sign.name = 'vice-city-garage-sign';
    sign.position.set(0, 3.3, BACK_WALL_Z + 0.2);
    room.add(sign);

    // Au pied du mur, la tablette des coupes : ce que la concession a gagné.
    const trophies = own(makeTrophyShelf(materials));
    trophies.position.set(-3.1, 1.05, BACK_WALL_Z + 0.5);
    room.add(trophies);
    const plantBack = own(makePlanter(materials));
    plantBack.position.set(4.4, 0, BACK_WALL_Z + 0.9);
    room.add(plantBack);

    /* ── Plateau tournant, sur son podium ─────────────────────────────────── */
    const turntable = new THREE.Group();
    turntable.name = 'vice-city-garage-turntable';
    scene.add(turntable);

    // Le tapis cerise descend du plateau jusqu'au client : la moquette du
    // showroom, avec son liseré.
    const carpet = new THREE.Mesh(geometry(() => new THREE.CircleGeometry(TURNTABLE_RADIUS + 2.1, 56)), materials.carpet);
    carpet.name = 'vice-city-garage-carpet';
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.008;
    carpet.receiveShadow = true;
    room.add(carpet);
    const carpetEdge = new THREE.Mesh(geometry(() => new THREE.TorusGeometry(TURNTABLE_RADIUS + 2.1, 0.02, 8, 72)), materials.accent);
    carpetEdge.rotation.x = Math.PI / 2;
    carpetEdge.position.y = 0.012;
    room.add(carpetEdge);

    const riser = new THREE.Mesh(geometry(() => new THREE.CylinderGeometry(TURNTABLE_RADIUS + 0.34, TURNTABLE_RADIUS + 0.5, 0.1, 56)), materials.brushed);
    riser.position.y = 0.05;
    riser.receiveShadow = true;
    turntable.add(riser);

    const platform = new THREE.Mesh(geometry(() => new THREE.CylinderGeometry(TURNTABLE_RADIUS, TURNTABLE_RADIUS + 0.12, TURNTABLE_TOP, 48)), materials.platform);
    platform.position.y = TURNTABLE_TOP / 2;
    platform.receiveShadow = true;
    platform.castShadow = true;
    turntable.add(platform);

    const ring = new THREE.Mesh(geometry(() => new THREE.TorusGeometry(TURNTABLE_RADIUS - 0.02, 0.035, 10, 64)), materials.accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = TURNTABLE_TOP + 0.005;
    turntable.add(ring);

    const innerRing = new THREE.Mesh(geometry(() => new THREE.TorusGeometry(TURNTABLE_RADIUS - 0.55, 0.014, 8, 64)), materials.mark);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = TURNTABLE_TOP + 0.006;
    turntable.add(innerRing);

    // Quatre poteaux à cordon, à un mètre du tapis : la ligne qu'on ne franchit
    // pas, comme devant une vitrine d'occasion de luxe.
    for (const corner of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const post = new THREE.Mesh(geometry(() => new THREE.CylinderGeometry(0.045, 0.055, 0.92, 12)), materials.brushed);
      post.position.set(corner[0] * (TURNTABLE_RADIUS + 2.5), 0.46, corner[1] * (TURNTABLE_RADIUS + 2.5));
      post.castShadow = true;
      room.add(post);
      const cap = new THREE.Mesh(geometry(() => new THREE.SphereGeometry(0.06, 12, 8)), materials.accent);
      cap.position.set(post.position.x, 0.95, post.position.z);
      room.add(cap);
    }

    /* ── Le lot : les autres voitures du catalogue ────────────────────────── */
    // Un concessionnaire se reconnaît à ce qu'il a EN rayon. Trois modèles du
    // catalogue sont garés au fond, chacun sur son tapis et son étiquette de
    // prix ; ils viennent du même constructeur que la voiture de course, au
    // détail près — pas d'ombres portées, pas de pilote, pas de reflets.
    // Sur un appareil tactile (et sous `prefers-reduced-motion`, l'écran reste
    // beau mais moins cher), le lot rentre au garage : le plateau suffit.
    const LOT_SPOTS = [
      { position: [-5.4, 0, -6.6], rotation: 0.46 },
      { position: [1.4, 0, -7.9], rotation: -0.16 },
      { position: [7.1, 0, -5.9], rotation: -0.62 },
    ];
    // Le rayon montre ce qu'on vise ensuite : les modèles les plus chers du
    // catalogue, moins celui qui est déjà monté au plateau.
    const lotProfiles = [...CITY_RUSH_CARS]
      .filter((item) => item.id !== profile.id)
      .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
      .slice(0, LOT_SPOTS.length);
    if (!lite) {
      const lot = new THREE.Group();
      lot.name = 'vice-city-garage-lot';
      room.add(lot);
      lotProfiles.forEach((profile2, index) => {
        const spot = LOT_SPOTS[index];
        const parked = makeRacerCar(profile2, { player: false, daylight: false, number: index + 2 });
        parked.traverse((child) => {
          child.castShadow = false;
          child.receiveShadow = false;
        });
        parked.name = `vice-city-garage-lot-${profile2.id}`;
        parked.position.set(spot.position[0], 0, spot.position[2]);
        parked.rotation.y = spot.rotation;
        ownModelMaterials(parked);
        lot.add(parked);

        const mat = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(5, 2.6)), materials.carpet);
        mat.rotation.x = -Math.PI / 2;
        mat.position.set(spot.position[0], 0.006, spot.position[2]);
        mat.rotation.z = -spot.rotation;
        lot.add(mat);

        const placardTexture = texture(() => makePlacardTexture(profile2.name, profile2.price));
        const placard = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(0.86, 0.43)), material(() => new THREE.MeshBasicMaterial({
          map: placardTexture, transparent: true, toneMapped: false,
        })));
        placard.position.set(spot.position[0] + 2.2, 0.9, spot.position[2] + 2.1);
        placard.rotation.y = spot.rotation + 0.3;
        lot.add(placard);
        const placardLeg = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.05, 0.72, 0.05)), materials.brushed);
        placardLeg.position.set(placard.position.x, 0.36, placard.position.z);
        lot.add(placardLeg);
      });
    }

    /* ── Le comptoir ──────────────────────────────────────────────────────── */
    const showroom = new THREE.Group();
    showroom.name = 'vice-city-garage-showroom';
    room.add(showroom);

    // Le comptoir est adossé au mur de service, à droite : on le lit de trois
    // quarts au large, il ne se glisse jamais entre la caméra et le plateau —
    // même au recul maximal de la vitrine, où la caméra frôle ce coin de salle.
    const deskBrand = texture(() => makePlacardTexture('VICE CITY RUSH MOTORS · EST. 1986', ''));
    const desk = own(makeReceptionDesk(materials, deskBrand));
    desk.position.set(8.0, 0, -2.2);
    desk.rotation.y = Math.PI * 0.86;
    showroom.add(desk);
    for (const offset of [-0.9, 0.9]) {
      const stool = own(makeStool(materials));
      stool.position.set(8.9, 0, -2.2 + offset);
      showroom.add(stool);
    }

    const rack = own(makeWheelRack(materials));
    rack.position.set(ROOM_WIDTH / 2 - 0.7, 0, 2.6);
    rack.rotation.y = -Math.PI / 2;
    showroom.add(rack);
    const plantService = own(makePlanter(materials));
    plantService.position.set(9.4, 0, 0.6);
    showroom.add(plantService);
    const plantCorner = own(makePlanter(materials));
    plantCorner.position.set(STOREFRONT_X + 0.9, 0, 6.9);
    showroom.add(plantCorner);
    // Le caillebotis du service, derrière la caméra : l'entrée des voitures
    // livrées, vue seulement quand le hub laisse voir les bords du cadre.
    const grate = new THREE.Mesh(geometry(() => new THREE.PlaneGeometry(2.4, 4.4)), materials.grate);
    grate.rotation.x = -Math.PI / 2;
    grate.rotation.z = Math.PI / 2;
    grate.position.set(ROOM_WIDTH / 2 - 1.5, 0.012, 7.4);
    showroom.add(grate);

    // Poteaux d'angle : le regard accroche un volume, pas un décor plat.
    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        const post = new THREE.Mesh(geometry(() => new THREE.BoxGeometry(0.34, ROOM_HEIGHT, 0.34)), materials.steelDark);
        post.position.set(side * (ROOM_WIDTH / 2 - 0.17), ROOM_HEIGHT / 2, depth * (ROOM_DEPTH / 2 - 0.17));
        post.castShadow = true;
        room.add(post);
      }
    }

    /* ── Lumière : l'éclairage d'une salle d'exposition ────────────────────── */
    // Une concession ne théâtralise pas la voiture, elle la montre : salle
    // haute et régulière, plus un projecteur qui découpe la carrosserie et un
    // lavage doux sur le lot. Sept sources, dont une seule projette des ombres.
    scene.add(new THREE.AmbientLight(0x31415a, 0.82));
    scene.add(new THREE.HemisphereLight(0x5d7595, 0x0b0e14, 0.78));

    const key = new THREE.SpotLight(0xfff6ea, 420, 20, 0.66, 0.7, 2);
    key.position.set(3.6, ROOM_HEIGHT - 0.25, 3.6);
    key.target.position.copy(CAMERA_TARGET);
    key.castShadow = !lite;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1.2;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.0006;
    key.shadow.radius = 3;
    scene.add(key, key.target);

    const fill = new THREE.SpotLight(0xdce8ff, 250, 22, 0.86, 0.9, 2);
    fill.position.set(-4.4, ROOM_HEIGHT - 0.5, 2.2);
    fill.target.position.copy(CAMERA_TARGET);
    scene.add(fill, fill.target);

    const rim = new THREE.SpotLight(accentColor.getHex(), 300, 18, 0.8, 0.9, 2);
    rim.position.set(-1.0, 3.6, BACK_WALL_Z + 2.4);
    rim.target.position.set(0, 0.7, 0.3);
    scene.add(rim, rim.target);

    // Le mur de marque est rétroéclairé : l'enseigne rend la salle, pas l'inverse.
    const signLight = new THREE.PointLight(accentColor.getHex(), 46, 16, 2);
    signLight.position.set(0, 3.4, BACK_WALL_Z + 1.6);
    scene.add(signLight);

    // Le lavage du lot : une seule lumière pour les trois voitures garées,
    // posée au plafond derrière le plateau.
    const lotWash = new THREE.SpotLight(0xf2f7ff, 210, 26, 1.05, 1, 2);
    lotWash.position.set(0.8, ROOM_HEIGHT - 0.4, -6.4);
    lotWash.target.position.set(0.8, 0.4, -6.8);
    scene.add(lotWash, lotWash.target);

    
    /* ── La voiture, sur le plateau ───────────────────────────────────────── */
    // Les reflets de carrosserie viennent d'une carte d'environnement générée
    // à la volée par le moteur de rendu du garage (`configureCarReflections`).
    configureCarReflections(renderer);
    const car = makeRacerCar(profile, { player: true, daylight: false, number: 86 });
    car.position.y = TURNTABLE_TOP;
    car.name = `vice-city-garage-car-${profile.id}`;
    turntable.add(car);

    // Le nœud de livraison sur le capot : dans une concession, la voiture au
    // plateau n'est pas exposée, elle est READY — elle attend son acheteur.
    // Attaché au modèle, il tourne avec lui et ne pèse pas sur le cadrage
    // (1,86 m de ruban, dans l'emprise de la carrosserie).
    const ribbon = makeDeliveryRibbon(materials);
    // Le capot se déduit du gabarit réel du modèle : le nez regarde vers −z, le
    // ruban se pose à un tiers de la longueur, à 62 % de la hauteur de caisse —
    // assez bas pour un roadster, assez haut pour un coupé. Et il se retrousse
    // sur la largeur, pour ne jamais déborder d'un aile.
    const bodyBox = new THREE.Box3().setFromObject(car);
    const bodyLength = Math.max(0.001, bodyBox.max.z - bodyBox.min.z);
    const bodyHeight = Math.max(0.001, bodyBox.max.y - bodyBox.min.y);
    const bodyWidth = Math.max(0.001, bodyBox.max.x - bodyBox.min.x);
    ribbon.position.set(0, bodyBox.min.y + bodyHeight * 0.62, bodyBox.min.z + bodyLength * 0.3);
    ribbon.rotation.y = 0.12;
    ribbon.scale.setScalar(Math.min(1, bodyWidth / 2.15));
    own(ribbon);
    car.add(ribbon);

    // Les matériaux de la voiture sont fabriqués par le modèle à chaque appel
    // et ne sont partagés avec personne : eux seuls sont rendus au changement
    // de voiture (géométries et textures peuvent l'être avec d'autres scènes).
    const carMaterials = new Set();
    car.traverse((object) => {
      const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      list.forEach((item) => carMaterials.add(item));
    });

    /* ── Poussières dans les faisceaux ────────────────────────────────────── */
    const dustCount = 170;
    const dustPositions = new Float32Array(dustCount * 3);
    const random = seededRandom(21);
    for (let index = 0; index < dustCount; index += 1) {
      dustPositions[index * 3] = (random() - 0.5) * 12;
      dustPositions[index * 3 + 1] = 0.2 + random() * 4.4;
      dustPositions[index * 3 + 2] = (random() - 0.5) * 9.5;
    }
    const dustGeometry = geometry(() => {
      const item = new THREE.BufferGeometry();
      item.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      return item;
    });
    const dust = new THREE.Points(dustGeometry, materials.dust);
    scene.add(dust);

    /* ── Regard : cadrage, parallasse, Plateau ────────────────────────────── */
    const resize = () => {
      const width = Math.max(1, mount.clientWidth || 1);
      const height = Math.max(1, mount.clientHeight || 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Le plateau doit remplir le cadre : la caméra se rapproche ou recule
      // selon la forme de la fenêtre (large → gros plan, téléphone → recul
      // jusqu'à ce que la voiture entière passe).
      distance = frameDistance(camera.fov, camera.aspect, frame);
      camera.updateProjectionMatrix();
      applyCameraBase();
    };
    resize();

    let resizeObserver = null;
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
    } else {
      globalThis.addEventListener?.('resize', resize);
    }

    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let dragging = false;

    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const onPointerDown = (event) => {
      dragging = true;
      onPointerMove(event);
      mount.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp = () => { dragging = false; };
    const onPointerLeave = () => {
      dragging = false;
      pointerX = 0;
      pointerY = 0;
    };
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);
    mount.addEventListener('pointerleave', onPointerLeave);
    globalThis.addEventListener?.('pointerup', onPointerUp);

    let running = true;
    const onVisibility = () => {
      running = !document.hidden;
      last = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    let observer = null;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        running = entries[0]?.isIntersecting !== false && !document.hidden;
        last = 0;
      }, { threshold: 0.02 });
      observer.observe(mount);
    }

    const offset = new THREE.Vector3();
    const placeCamera = () => {
      // La caméra tourne autour du plateau (regard à la souris / au doigt) en
      // gardant la distance de cadrage.
      offset.copy(CAMERA_DIRECTION).applyAxisAngle(UP, smoothX * POINTER_YAW).multiplyScalar(distance).add(CAMERA_TARGET);
      offset.x += (Number(cameraShift) || 0) * Math.cos(smoothX * POINTER_YAW);
      offset.y += smoothY * POINTER_PITCH;
      camera.position.copy(offset);
      camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y + smoothY * 0.06, CAMERA_TARGET.z);
    };

    let raf = 0;
    let last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      if (!reducedMotion && !dragging) turntable.rotation.y += dt * frame.spin;
      if (!reducedMotion) dust.rotation.y += dt * 0.012;
      const ease = Math.min(1, dt * 6);
      smoothX += (pointerX - smoothX) * ease;
      smoothY += (pointerY - smoothY) * ease;
      placeCamera();
      renderer.render(scene, camera);
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      observer?.disconnect();
      globalThis.removeEventListener?.('resize', resize);
      globalThis.removeEventListener?.('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      mount.removeEventListener('pointerleave', onPointerLeave);
      carMaterials.forEach((item) => item.dispose());
      ownGeometries.forEach((item) => item.dispose());
      ownMaterials.forEach((item) => item.dispose());
      ownTextures.forEach((item) => item.dispose());
      scene.traverse((object) => {
        if (object.isLight) {
          object.dispose?.();
          if (object.shadow) object.shadow.dispose?.();
        }
      });
      renderer.dispose();
      try {
        renderer.forceContextLoss();
      } catch {
        // Certains contextes refusent la libération forcée : sans conséquence.
      }
      renderer.domElement.remove();
    };
  }, [carId, carName, accent, cameraShift, framing]);

  if (failed) {
    return (
      <div className="city-rush-hub-stage-fallback">
        {fallbackSrc && <img src={fallbackSrc} alt="" loading="lazy" decoding="async" />}
        {fallbackLabel && <span>{fallbackLabel}</span>}
      </div>
    );
  }

  return <div className="city-rush-hub-stage-canvas" ref={mountRef} />;
}
