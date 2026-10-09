// Modèles 3D des onze voitures de Vice City Rush. Les silhouettes sont
// échantillonnées en courbes lisses et reçoivent une finition contemporaine :
// vitrage panoramique, signatures LED, jantes aérodynamiques et détails affleurants.
// L'habitacle reste sombre et vide pour ne pas afficher de personnage.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBatch, makeCanvasTexture } from './cityRushBuilder.js';
import { makeCarPlateTexture } from './cityRushTextures.js';

// ── Reflets studio ──────────────────────────────────────────────────────────
// Une carte d'environnement générée à la volée (RoomEnvironment, aucun fichier
// à charger) donne à la peinture, au chrome et aux optiques les reflets qui
// font la « vraie » carrosserie : le vernis des miniatures du garage vient de
// là, et non plus des seuls 4 éclairages de la scène. Le PMREM est calculé une
// seule fois pour toute la partie, puis partagé par les onze modèles et par le
// trafic.
let carEnvironment = null;
let carRenderer = null;

/**
 * Branche les reflets sur le moteur de rendu du monde. Appelé une fois par
 * `ViceCityWorld` juste après la création du renderer ; sans renderer (tests
 * Node, outils de contrôle), les matériaux gardent simplement leur rendu
 * actuel — aucune image, aucun contexte WebGL à créer en avance.
 */
export function configureCarReflections(renderer) {
  carRenderer = renderer || null;
  carEnvironment = null;
}

function carEnvironmentMap() {
  if (carEnvironment) return carEnvironment;
  if (!carRenderer) return null;
  try {
    const pmrem = new THREE.PMREMGenerator(carRenderer);
    const room = new RoomEnvironment();
    carEnvironment = pmrem.fromScene(room, 0.035).texture;
    room.dispose?.();
    pmrem.dispose();
  } catch {
    // Contexte de test (renderer factice) ou WebGL sans cibles flottantes : la
    // carrosserie garde son rendu sans reflets, le jeu ne s'arrête pas.
    carRenderer = null;
    return null;
  }
  return carEnvironment;
}

/** Peinture de carrosserie : vernis + reflets de l'environnement. */
function applyPaintFinish(material) {
  const environment = carEnvironmentMap();
  if (!environment) return material;
  material.envMap = environment;
  material.envMapIntensity = 1.15;
  material.needsUpdate = true;
  return material;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const FLAME_OUTER = new THREE.ConeGeometry(0.16, 0.9, 10);
FLAME_OUTER.rotateX(Math.PI / 2);
FLAME_OUTER.translate(0, 0, 0.45);
const FLAME_INNER = new THREE.ConeGeometry(0.09, 0.62, 8);
FLAME_INNER.rotateX(Math.PI / 2);
FLAME_INNER.translate(0, 0, 0.31);
const HEADLIGHT_CONE = new THREE.ConeGeometry(1.7, 9, 12, 1, true);
HEADLIGHT_CONE.rotateX(Math.PI / 2);
HEADLIGHT_CONE.translate(0, 0, -4.5);

// Sections longitudinales : [z, demi-largeur, bas de caisse, épaule,
// sommet de la carrosserie, demi-largeur du toit]. Le profil donne à chaque
// voiture son capot, son pavillon et son arrière propres.
const CAR_MODELS = {
  'city-hatch': {
    // Citadine cinq portes contemporaine : capot court, pare-brise incliné,
    // vitrage panoramique sombre et hayon compact, sans badge constructeur.
    wheelX: 0.88, wheelZ: [-1.20, 1.13], wheelRadius: 0.305, wheelWidth: 0.23, wheelStyle: 'aero-five',
    doorSeams: [-0.12, 0.78], grilleWidth: 0.76, frontStyle: 'retro',
    stations: [
      [-2.00, 0.25, 0.37, 0.48, 0.55, 0.11], [-1.84, 0.58, 0.38, 0.65, 0.75, 0.38],
      [-1.61, 0.78, 0.39, 0.76, 0.82, 0.59], [-1.34, 0.87, 0.40, 0.82, 0.86, 0.69],
      [-1.04, 0.90, 0.40, 0.84, 0.90, 0.71], [-0.82, 0.90, 0.41, 0.85, 1.00, 0.70],
      [-0.53, 0.90, 0.41, 0.86, 1.40, 0.66], [-0.27, 0.89, 0.41, 0.85, 1.49, 0.69],
      [0.16, 0.89, 0.41, 0.85, 1.51, 0.70], [0.57, 0.90, 0.41, 0.84, 1.48, 0.71],
      [0.91, 0.90, 0.40, 0.83, 1.40, 0.70], [1.18, 0.88, 0.40, 0.81, 1.25, 0.67],
      [1.45, 0.83, 0.39, 0.76, 1.04, 0.62], [1.69, 0.68, 0.38, 0.65, 0.83, 0.51],
      [1.90, 0.42, 0.37, 0.54, 0.65, 0.28], [2.00, 0.24, 0.36, 0.47, 0.53, 0.11],
    ],
    windshield: [[-0.72, 0.98, -0.84], [0.72, 0.98, -0.84], [0.59, 1.39, -0.49], [-0.59, 1.39, -0.49]],
    rearGlass: [[-0.58, 1.39, 0.68], [0.58, 1.39, 0.68], [0.69, 1.04, 1.48], [-0.69, 1.04, 1.48]],
    sideWindows: [
      [[0.85, 1.03, -0.76], [0.62, 1.40, -0.45], [0.63, 1.42, -0.06], [0.86, 1.04, 0.00]],
      [[0.86, 1.04, 0.08], [0.64, 1.42, 0.02], [0.65, 1.39, 0.72], [0.85, 1.07, 0.84]],
      [[0.84, 1.07, 0.92], [0.66, 1.38, 0.78], [0.67, 1.25, 1.19], [0.80, 1.05, 1.38]],
    ],
  },
  'nova-hatch': {
    // Compacte GT cinq portes actuelle : pavillon panoramique, hayon incliné
    // et épaules plus tendues, sans badge ni logo de constructeur.
    wheelX: 0.92, wheelZ: [-1.18, 1.17], wheelRadius: 0.325, wheelWidth: 0.25, wheelStyle: 'split-five',
    doorSeams: [-0.08, 0.77], grilleWidth: 0.78, frontStyle: 'led',
    stations: [
      [-2.00, 0.28, 0.37, 0.49, 0.56, 0.13], [-1.84, 0.63, 0.38, 0.66, 0.74, 0.41],
      [-1.57, 0.84, 0.39, 0.77, 0.85, 0.62], [-1.28, 0.91, 0.40, 0.83, 0.93, 0.71],
      [-1.03, 0.93, 0.40, 0.85, 1.01, 0.74], [-0.80, 0.92, 0.41, 0.86, 1.13, 0.73],
      [-0.58, 0.91, 0.41, 0.86, 1.37, 0.72], [-0.34, 0.90, 0.41, 0.86, 1.43, 0.70],
      [0.02, 0.91, 0.41, 0.86, 1.45, 0.72], [0.43, 0.92, 0.41, 0.85, 1.45, 0.74],
      [0.78, 0.93, 0.40, 0.84, 1.41, 0.75], [1.08, 0.92, 0.40, 0.83, 1.35, 0.73],
      [1.32, 0.89, 0.40, 0.80, 1.20, 0.68], [1.52, 0.84, 0.39, 0.76, 1.04, 0.63],
      [1.72, 0.78, 0.38, 0.69, 0.90, 0.61], [1.90, 0.70, 0.37, 0.66, 0.79, 0.55],
      [2.00, 0.48, 0.36, 0.54, 0.65, 0.36],
    ],
    windshield: [[-0.75, 1.02, -1.15], [0.75, 1.02, -1.15], [0.64, 1.39, -0.50], [-0.64, 1.39, -0.50]],
    rearGlass: [[-0.67, 1.34, 1.06], [0.67, 1.34, 1.06], [0.74, 0.84, 1.82], [-0.74, 0.84, 1.82]],
    sideWindows: [
      [[0.89, 0.96, -0.79], [0.66, 1.38, -0.46], [0.67, 1.39, -0.06], [0.90, 0.96, -0.05]],
      [[0.90, 0.96, 0.08], [0.68, 1.39, 0.08], [0.69, 1.37, 0.73], [0.90, 0.94, 0.78]],
      [[0.90, 0.94, 0.84], [0.69, 1.35, 0.78], [0.67, 1.25, 1.20], [0.82, 1.03, 1.43]],
    ],
  },
  ferrari: {
    wheelX: 0.93, wheelZ: [-1.16, 1.15], wheelRadius: 0.35, wheelWidth: 0.27, wheelStyle: 'split-five',
    doorSeams: [-0.18], grilleWidth: 1.08, frontStyle: 'led',
    stations: [
      [-2.00, 0.28, 0.38, 0.50, 0.55, 0.13], [-1.82, 0.62, 0.38, 0.66, 0.73, 0.43],
      [-1.48, 0.86, 0.39, 0.78, 0.88, 0.67], [-1.12, 0.94, 0.40, 0.83, 0.94, 0.75],
      [-0.82, 0.91, 0.41, 0.84, 1.00, 0.71], [-0.55, 0.85, 0.42, 0.84, 1.24, 0.59],
      [-0.20, 0.81, 0.42, 0.84, 1.34, 0.57], [0.22, 0.81, 0.42, 0.84, 1.34, 0.57],
      [0.49, 0.87, 0.42, 0.84, 1.20, 0.63], [0.80, 0.93, 0.41, 0.83, 1.00, 0.70],
      [1.13, 0.96, 0.40, 0.82, 0.86, 0.76], [1.50, 0.85, 0.40, 0.78, 0.80, 0.68],
      [1.82, 0.64, 0.39, 0.65, 0.68, 0.52], [2.00, 0.31, 0.38, 0.51, 0.54, 0.18],
    ],
    windshield: [[-0.71, 1.00, -0.82], [0.71, 1.00, -0.82], [0.56, 1.29, -0.29], [-0.56, 1.29, -0.29]],
    rearGlass: [[-0.57, 1.29, 0.34], [0.57, 1.29, 0.34], [0.72, 0.96, 0.88], [-0.72, 0.96, 0.88]],
    sideWindows: [
      [[0.83, 0.90, -0.72], [0.59, 1.27, -0.31], [0.59, 1.27, 0.18], [0.83, 0.90, 0.39]],
      [[0.84, 0.90, 0.43], [0.60, 1.23, 0.38], [0.68, 1.00, 0.86], [0.86, 0.88, 0.78]],
    ],
  },
  porsche: {
    wheelX: 0.94, wheelZ: [-1.13, 1.20], wheelRadius: 0.35, wheelWidth: 0.28, wheelStyle: 'classic-five',
    doorSeams: [-0.16], grilleWidth: 0.92, frontStyle: 'retro',
    stations: [
      [-2.00, 0.30, 0.39, 0.50, 0.56, 0.14], [-1.82, 0.61, 0.39, 0.65, 0.74, 0.40],
      [-1.50, 0.82, 0.39, 0.76, 0.86, 0.62], [-1.15, 0.90, 0.40, 0.82, 0.94, 0.70],
      [-0.82, 0.92, 0.41, 0.84, 1.04, 0.71], [-0.54, 0.88, 0.42, 0.85, 1.22, 0.61],
      [-0.22, 0.82, 0.42, 0.86, 1.30, 0.58], [0.16, 0.83, 0.42, 0.87, 1.30, 0.59],
      [0.48, 0.90, 0.42, 0.86, 1.19, 0.67], [0.84, 0.96, 0.42, 0.85, 1.00, 0.76],
      [1.20, 0.98, 0.41, 0.84, 0.90, 0.79], [1.53, 0.89, 0.41, 0.82, 0.90, 0.73],
      [1.82, 0.68, 0.39, 0.70, 0.76, 0.54], [2.00, 0.34, 0.38, 0.52, 0.57, 0.19],
    ],
    windshield: [[-0.72, 1.00, -0.85], [0.72, 1.00, -0.85], [0.58, 1.25, -0.39], [-0.58, 1.25, -0.39]],
    rearGlass: [[-0.58, 1.25, 0.33], [0.58, 1.25, 0.33], [0.75, 0.98, 0.99], [-0.75, 0.98, 0.99]],
    sideWindows: [
      [[0.84, 0.90, -0.76], [0.61, 1.21, -0.38], [0.61, 1.21, 0.10], [0.86, 0.91, 0.36]],
      [[0.87, 0.91, 0.41], [0.63, 1.16, 0.33], [0.74, 0.96, 0.91], [0.89, 0.88, 0.83]],
    ],
  },
  audi: {
    wheelX: 0.95, wheelZ: [-1.16, 1.15], wheelRadius: 0.35, wheelWidth: 0.29, wheelStyle: 'split-five',
    doorSeams: [-0.16], grilleWidth: 1.16, frontStyle: 'led',
    stations: [
      [-2.00, 0.27, 0.38, 0.50, 0.55, 0.12], [-1.82, 0.62, 0.38, 0.65, 0.72, 0.41],
      [-1.50, 0.86, 0.39, 0.78, 0.87, 0.66], [-1.12, 0.93, 0.40, 0.82, 0.93, 0.74],
      [-0.79, 0.90, 0.41, 0.84, 1.02, 0.69], [-0.52, 0.85, 0.42, 0.84, 1.21, 0.59],
      [-0.19, 0.80, 0.42, 0.85, 1.29, 0.56], [0.24, 0.80, 0.42, 0.85, 1.30, 0.56],
      [0.52, 0.88, 0.42, 0.85, 1.20, 0.64], [0.82, 0.94, 0.42, 0.84, 1.03, 0.72],
      [1.14, 0.96, 0.41, 0.83, 0.92, 0.78], [1.49, 0.89, 0.40, 0.79, 0.84, 0.72],
      [1.82, 0.70, 0.39, 0.67, 0.71, 0.55], [2.00, 0.32, 0.38, 0.51, 0.55, 0.17],
    ],
    windshield: [[-0.71, 0.99, -0.82], [0.71, 0.99, -0.82], [0.55, 1.24, -0.35], [-0.55, 1.24, -0.35]],
    rearGlass: [[-0.55, 1.24, 0.34], [0.55, 1.24, 0.34], [0.74, 0.99, 0.92], [-0.74, 0.99, 0.92]],
    sideWindows: [
      [[0.84, 0.90, -0.72], [0.58, 1.22, -0.32], [0.58, 1.22, 0.16], [0.85, 0.90, 0.42]],
      [[0.86, 0.90, 0.46], [0.60, 1.19, 0.38], [0.72, 0.98, 0.94], [0.89, 0.88, 0.84]],
    ],
  },
  volkswagen: {
    // Hot hatch 2020s : nez bas, épaules musclées, pare-brise incliné et toit
    // fuyant vers un hayon court. Aucun badge ou détail de constructeur.
    wheelX: 0.96, wheelZ: [-1.18, 1.15], wheelRadius: 0.36, wheelWidth: 0.28, wheelStyle: 'aero-five',
    doorSeams: [-0.10, 0.80], grilleWidth: 0.90, frontStyle: 'led',
    stations: [
      [-2.00, 0.28, 0.37, 0.49, 0.54, 0.12], [-1.84, 0.60, 0.38, 0.63, 0.69, 0.38],
      [-1.60, 0.84, 0.39, 0.75, 0.83, 0.62], [-1.30, 0.94, 0.40, 0.81, 0.92, 0.72],
      [-1.02, 0.97, 0.40, 0.84, 1.01, 0.76], [-0.78, 0.96, 0.41, 0.85, 1.12, 0.75],
      [-0.52, 0.94, 0.41, 0.86, 1.31, 0.73], [-0.25, 0.92, 0.41, 0.86, 1.36, 0.71],
      [0.12, 0.92, 0.41, 0.85, 1.37, 0.71], [0.48, 0.94, 0.41, 0.84, 1.35, 0.73],
      [0.82, 0.96, 0.41, 0.83, 1.31, 0.75], [1.10, 0.95, 0.40, 0.81, 1.23, 0.75],
      [1.38, 0.91, 0.40, 0.77, 1.11, 0.71], [1.62, 0.84, 0.39, 0.72, 0.97, 0.66],
      [1.82, 0.70, 0.38, 0.66, 0.83, 0.55], [2.00, 0.46, 0.37, 0.55, 0.68, 0.34],
    ],
    windshield: [[-0.75, 1.00, -1.10], [0.75, 1.00, -1.10], [0.62, 1.31, -0.38], [-0.62, 1.31, -0.38]],
    rearGlass: [[-0.63, 1.31, 0.43], [0.63, 1.31, 0.43], [0.72, 0.82, 1.72], [-0.72, 0.82, 1.72]],
    sideWindows: [
      [[0.88, 0.85, -0.78], [0.68, 1.30, -0.42], [0.69, 1.32, 0.00], [0.84, 0.85, 0.04]],
      [[0.84, 0.85, 0.12], [0.69, 1.32, 0.05], [0.70, 1.30, 0.72], [0.87, 0.83, 0.82]],
      [[0.87, 0.83, 0.89], [0.70, 1.27, 0.78], [0.68, 1.17, 1.18], [0.81, 0.77, 1.48]],
    ],
  },
  bmw: {
    wheelX: 0.94, wheelZ: [-1.20, 1.16], wheelRadius: 0.34, wheelWidth: 0.26, wheelStyle: 'wire',
    doorSeams: [-0.16], grilleWidth: 0.58, frontStyle: 'classic',
    stations: [
      [-2.00, 0.28, 0.39, 0.48, 0.52, 0.13], [-1.82, 0.61, 0.39, 0.61, 0.70, 0.37],
      [-1.52, 0.81, 0.39, 0.73, 0.81, 0.60], [-1.18, 0.90, 0.40, 0.79, 0.88, 0.69],
      [-0.85, 0.92, 0.40, 0.82, 0.96, 0.72], [-0.56, 0.90, 0.41, 0.84, 1.15, 0.67],
      [-0.28, 0.84, 0.41, 0.85, 1.28, 0.60], [0.08, 0.83, 0.41, 0.85, 1.30, 0.59],
      [0.38, 0.85, 0.41, 0.83, 1.24, 0.61], [0.68, 0.91, 0.40, 0.82, 1.12, 0.68],
      [1.02, 0.96, 0.40, 0.80, 0.94, 0.76], [1.34, 0.94, 0.39, 0.77, 0.83, 0.74],
      [1.62, 0.85, 0.39, 0.69, 0.71, 0.65], [1.85, 0.62, 0.38, 0.58, 0.61, 0.44],
      [2.00, 0.34, 0.37, 0.51, 0.53, 0.20],
    ],
    windshield: [[-0.73, 0.97, -0.72], [0.73, 0.97, -0.72], [0.59, 1.23, -0.23], [-0.59, 1.23, -0.23]],
    rearGlass: [[-0.59, 1.23, 0.38], [0.59, 1.23, 0.38], [0.74, 0.98, 0.96], [-0.74, 0.98, 0.96]],
    sideWindows: [
      [[0.86, 0.89, -0.65], [0.61, 1.20, -0.20], [0.61, 1.20, 0.18], [0.86, 0.90, 0.39]],
      [[0.87, 0.90, 0.42], [0.62, 1.16, 0.34], [0.74, 0.97, 0.92], [0.89, 0.87, 0.80]],
    ],
  },
  lamborghini: {
    wheelX: 0.95, wheelZ: [-1.16, 1.17], wheelRadius: 0.35, wheelWidth: 0.29, wheelStyle: 'turbofan',
    doorSeams: [-0.12], grilleWidth: 1.20, frontStyle: 'retro',
    stations: [
      [-2.00, 0.27, 0.38, 0.50, 0.54, 0.12], [-1.82, 0.64, 0.38, 0.67, 0.73, 0.41],
      [-1.49, 0.88, 0.39, 0.78, 0.84, 0.68], [-1.13, 0.95, 0.40, 0.83, 0.92, 0.76],
      [-0.81, 0.92, 0.41, 0.84, 1.00, 0.72], [-0.53, 0.84, 0.42, 0.84, 1.18, 0.61],
      [-0.20, 0.78, 0.42, 0.84, 1.26, 0.56], [0.18, 0.78, 0.42, 0.84, 1.28, 0.56],
      [0.48, 0.86, 0.42, 0.84, 1.18, 0.62], [0.80, 0.94, 0.41, 0.83, 1.02, 0.70],
      [1.14, 0.97, 0.40, 0.82, 0.91, 0.77], [1.49, 0.90, 0.40, 0.79, 0.83, 0.72],
      [1.82, 0.72, 0.39, 0.67, 0.71, 0.56], [2.00, 0.34, 0.38, 0.51, 0.54, 0.18],
    ],
    windshield: [[-0.71, 0.99, -0.81], [0.71, 0.99, -0.81], [0.56, 1.21, -0.36], [-0.56, 1.21, -0.36]],
    rearGlass: [[-0.56, 1.20, 0.35], [0.56, 1.20, 0.35], [0.74, 0.98, 0.94], [-0.74, 0.98, 0.94]],
    sideWindows: [
      [[0.84, 0.89, -0.72], [0.58, 1.20, -0.33], [0.58, 1.20, 0.12], [0.85, 0.90, 0.40]],
      [[0.87, 0.90, 0.44], [0.61, 1.16, 0.33], [0.72, 0.96, 0.91], [0.90, 0.86, 0.81]],
    ],
  },
  // Trois silhouettes originales inspirées des tendances modernes : GT
  // électrique, crossover sportif et roadster électrique. Les bases de coque
  // sont volontairement retouchées pour éviter trois clones de géométrie.
  'electric-gt': {
    wheelX: 0.96, wheelZ: [-1.18, 1.18], wheelRadius: 0.36, wheelWidth: 0.28, wheelStyle: 'split-five',
    doorSeams: [-0.15], grilleWidth: 0.68,
    stations: [
      [-2.00,0.27,0.38,0.49,0.52,0.12],[-1.80,0.62,0.38,0.65,0.70,0.40],[-1.48,0.87,0.39,0.77,0.83,0.66],
      [-1.12,0.96,0.40,0.82,0.90,0.74],[-0.76,0.94,0.41,0.84,1.00,0.71],[-0.42,0.88,0.42,0.85,1.16,0.62],
      [-0.08,0.84,0.42,0.85,1.24,0.58],[0.32,0.84,0.42,0.85,1.25,0.59],[0.72,0.91,0.42,0.84,1.12,0.68],
      [1.14,0.98,0.41,0.82,0.94,0.76],[1.52,0.88,0.40,0.76,0.79,0.68],[1.68,0.78,0.39,0.70,0.70,0.58],[1.84,0.62,0.38,0.63,0.62,0.45],[2.00,0.30,0.37,0.50,0.52,0.16],
    ],
    windshield: [[-0.72,0.99,-0.78],[0.72,0.99,-0.78],[0.57,1.23,-0.28],[-0.57,1.23,-0.28]],
    rearGlass: [[-0.57,1.23,0.34],[0.57,1.23,0.34],[0.75,0.96,0.92],[-0.75,0.96,0.92]],
    sideWindows: [[[0.84,0.91,-0.68],[0.59,1.21,-0.27],[0.59,1.21,0.18],[0.85,0.91,0.40]],[[0.86,0.91,0.44],[0.61,1.16,0.35],[0.73,0.97,0.92],[0.89,0.87,0.81]]],
  },
  'sport-crossover': {
    wheelX: 0.98, wheelZ: [-1.20, 1.18], wheelRadius: 0.37, wheelWidth: 0.29, wheelStyle: 'split-five',
    doorSeams: [-0.16, 0.72], grilleWidth: 0.92,
    stations: [
      [-2.00,0.34,0.42,0.58,0.65,0.20],[-1.82,0.72,0.42,0.76,0.86,0.51],[-1.52,0.92,0.43,0.86,1.02,0.70],
      [-1.18,0.99,0.43,0.90,1.14,0.79],[-0.82,1.00,0.44,0.92,1.40,0.78],[-0.48,0.98,0.44,0.93,1.52,0.76],
      [-0.08,0.98,0.44,0.93,1.55,0.77],[0.38,0.99,0.44,0.92,1.54,0.78],[0.78,1.00,0.43,0.90,1.48,0.79],
      [1.18,0.98,0.43,0.87,1.36,0.75],[1.53,0.93,0.42,0.82,1.20,0.69],[1.68,0.86,0.41,0.77,1.08,0.63],[1.82,0.78,0.41,0.72,0.96,0.57],[2.00,0.48,0.40,0.58,0.78,0.36],
    ],
    windshield: [[-0.78,1.10,-1.10],[0.78,1.10,-1.10],[0.67,1.48,-0.50],[-0.67,1.48,-0.50]],
    rearGlass: [[-0.69,1.45,0.98],[0.69,1.45,0.98],[0.78,0.90,1.75],[-0.78,0.90,1.75]],
    sideWindows: [[[0.92,1.00,-0.80],[0.68,1.46,-0.47],[0.68,1.46,-0.05],[0.93,1.00,-0.04]],[[0.93,1.00,0.08],[0.69,1.46,0.06],[0.70,1.43,0.72],[0.93,0.98,0.79]],[[0.93,0.98,0.84],[0.70,1.40,0.78],[0.69,1.25,1.23],[0.84,0.98,1.44]]],
  },
  'neo-roadster': {
    wheelX: 0.94, wheelZ: [-1.16, 1.15], wheelRadius: 0.35, wheelWidth: 0.28, wheelStyle: 'turbofan',
    doorSeams: [-0.18], grilleWidth: 1.02,
    stations: [
      [-2.00,0.25,0.37,0.47,0.50,0.10],[-1.84,0.59,0.37,0.63,0.67,0.38],[-1.52,0.84,0.38,0.75,0.77,0.62],
      [-1.16,0.94,0.39,0.80,0.84,0.71],[-0.80,0.91,0.40,0.82,0.94,0.67],[-0.45,0.80,0.41,0.82,1.08,0.54],
      [-0.10,0.76,0.41,0.81,1.15,0.49],[0.28,0.78,0.41,0.82,1.16,0.51],[0.64,0.86,0.40,0.81,1.06,0.59],
      [1.03,0.94,0.39,0.79,0.88,0.70],[1.42,0.86,0.38,0.73,0.72,0.62],[1.60,0.76,0.38,0.66,0.65,0.52],[1.78,0.60,0.37,0.59,0.58,0.40],[2.00,0.28,0.36,0.48,0.50,0.12],
    ],
    windshield: [[-0.70,0.96,-0.70],[0.70,0.96,-0.70],[0.54,1.16,-0.25],[-0.54,1.16,-0.25]],
    rearGlass: [[-0.54,1.16,0.30],[0.54,1.16,0.30],[0.70,0.91,0.76],[-0.70,0.91,0.76]],
    sideWindows: [[[0.81,0.86,-0.62],[0.56,1.14,-0.22],[0.56,1.14,0.18],[0.82,0.87,0.38]],[[0.83,0.87,0.42],[0.58,1.10,0.35],[0.68,0.92,0.77],[0.86,0.84,0.70]]],
  },
};

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.18, ...extra });
}

// Peinture de carrosserie : vernis brillant et reflets studio, comme les
// miniatures du garage. Le chrome et les optiques reçoivent aussi la carte
// d'environnement (voir makeRacerCar).
function paint(color, extra = {}) {
  return applyPaintFinish(new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.38,
    clearcoat: 0.98,
    clearcoatRoughness: 0.09,
    emissive: color,
    emissiveIntensity: 0.025,
    ...extra,
  }));
}

function mesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = null) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(position[0], position[1], position[2]);
  object.scale.set(scale[0], scale[1], scale[2]);
  if (rotation) object.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  parent.add(object);
  return object;
}

// Le profil de série donne des pavillons hauts et étroits : une fois lissés, ils
// font « tente ». Ces deux réglages d'échelle ramènent les onze silhouettes vers
// les proportions d'une carrosserie réelle : habitacle écrasé de 12 % et
// pavillon élargi, donc épaulements plus larges, vitrage plus tendu et une
// voiture plus large que haute à l'œil.
const GREENHOUSE_SQUASH = 1.0;
const ROOF_WIDTH_GAIN = 1.06;

function sampleCarStation(model, z) {
  const stations = model.stations;
  if (z <= stations[0][0]) return shapeStation(stations[0]);
  if (z >= stations[stations.length - 1][0]) return shapeStation(stations[stations.length - 1]);

  let index = 0;
  while (index < stations.length - 2 && stations[index + 1][0] < z) index += 1;
  const left = stations[index];
  const right = stations[index + 1];
  const previous = stations[Math.max(0, index - 1)];
  const next = stations[Math.min(stations.length - 1, index + 2)];
  const span = right[0] - left[0];
  const t = (z - left[0]) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const result = [z];

  for (let channel = 1; channel < left.length; channel += 1) {
    const leftSlope = (right[channel] - previous[channel]) / (right[0] - previous[0]);
    const rightSlope = (next[channel] - left[channel]) / (next[0] - left[0]);
    const value = h00 * left[channel] + h10 * span * leftSlope
      + h01 * right[channel] + h11 * span * rightSlope;
    // Prevent a high-curvature station pair from creating pinched fenders or
    // a roof that rises above the designed silhouette.
    const margin = Math.abs(right[channel] - left[channel]) * 0.12 + 0.004;
    result.push(clamp(value, Math.min(left[channel], right[channel]) - margin, Math.max(left[channel], right[channel]) + margin));
  }
  return shapeStation(result);
}

/** Applique les réglages de proportions à une station échantillonnée. */
function shapeStation(sample) {
  const shaped = [...sample];
  shaped[4] = shaped[3] + (shaped[4] - shaped[3]) * GREENHOUSE_SQUASH;
  shaped[5] = Math.min(shaped[1] * 0.94, shaped[5] * ROOF_WIDTH_GAIN);
  return shaped;
}

// ── Coque : sections transversales galbées, sommets partagés ────────────────
// Le profil transversal est déduit des six canaux de chaque station
// (z, demi-largeur, bas de caisse, épaule, toit, demi-largeur de toit) : le
// galbe des flancs (tumblehome), le repli du seuil et la couronne de pavillon
// sont calculés, donc la carrosserie est une **surface continue** — plus
// d'empilement de rectangles en escalier. Les sections partagent leurs sommets
// avec leurs voisines : les normales sont lissées le long de la voiture et les
// facettes disparaissent.
const RING_SIZE = 32;

/** Points de la section transversale, du sommet de pavillon au plancher (demi-profil). */
function ringHalfProfile([, width, lower, shoulder, roof, roofWidth]) {
  const crown = Math.max(0.008, (roof - shoulder) * 0.07);
  const waist = lower + (shoulder - lower) * 0.62;
  return [
    [0, roof + crown],
    [roofWidth, roof],
    [lerp(roofWidth, width * 0.78, 0.45), lerp(roof, shoulder, 0.48)],
    [width * 0.955, shoulder],
    [width, waist],
    [width * 0.972, lerp(waist, lower, 0.62)],
    [width * 0.90, lower],
    [width * 0.44, lower - 0.03],
    [0, lower - 0.052],
  ];
}

/**
 * Ré-échantillonne le demi-profil en `RING_SIZE / 2` points réguliers : le
 * pavillon et les flancs reçoivent assez de sommets pour que la découpe du
 * vitrage et le galbe de la carrosserie restent fins.
 */
function resampleHalfProfile(sample) {
  const control = ringHalfProfile(sample);
  const lengths = [0];
  for (let index = 1; index < control.length; index += 1) {
    lengths.push(lengths[index - 1] + Math.hypot(control[index][0] - control[index - 1][0], control[index][1] - control[index - 1][1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const points = [];
  const half = RING_SIZE / 2 + 1;
  for (let step = 0; step < half; step += 1) {
    const target = (step / (half - 1)) * total;
    let index = 1;
    while (index < lengths.length - 1 && lengths[index] < target) index += 1;
    const span = lengths[index] - lengths[index - 1] || 1;
    const t = (target - lengths[index - 1]) / span;
    points.push([
      lerp(control[index - 1][0], control[index][0], t),
      lerp(control[index - 1][1], control[index][1], t),
    ]);
  }
  return points;
}

function ringProfile(sample) {
  const points = [];
  const half = resampleHalfProfile(sample);
  for (const point of half) points.push(point);
  for (let index = half.length - 2; index > 0; index -= 1) points.push([-half[index][0], half[index][1]]);
  return points;
}

/** Indice signé : 0 = sommet de pavillon, ±(RING_SIZE/2) = bas de plancher, ±(RING_SIZE/4) ≈ épaule. */
function signedRingIndex(edge) {
  return edge <= RING_SIZE / 2 ? edge : edge - RING_SIZE;
}

/** Découpe longitudinale adaptative : les zones courbées reçoivent plus de sections. */
function shellSections(model, maxStep = 0.05, minSteps = 2, maxSteps = 8) {
  const stations = model.stations;
  const rows = [];
  for (let index = 0; index < stations.length - 1; index += 1) {
    const start = stations[index][0];
    const end = stations[index + 1][0];
    let delta = 0;
    for (let channel = 1; channel < stations[index].length; channel += 1) {
      delta = Math.max(delta, Math.abs(stations[index + 1][channel] - stations[index][channel]));
    }
    const steps = clamp(Math.ceil(delta / maxStep), minSteps, maxSteps);
    for (let step = 0; step < steps; step += 1) rows.push(sampleCarStation(model, start + (end - start) * (step / steps)));
  }
  rows.push([...stations[stations.length - 1]]);
  return rows;
}

// ── Vitrage conforme ────────────────────────────────────────────────────────
// Les vitres ne sont plus des plans rapportés : chaque ouverture est projetée
// dans l'espace (z, indice de section) puis re-projetée **sur la carrosserie**,
// décalée de quelques millimètres le long de la normale de surface. Le
// pare-brise, la lunette et les panneaux latéraux épousent donc exactement le
// galbe du pavillon, du capot et des flancs, comme une vraie vitre posée dans
// sa baie — sans facettes en escalier ni scintillement avec la coque.

/** Point de la surface de carrosserie à (z, s), s = indice signé de section. */
function surfacePoint(model, z, s) {
  const half = resampleHalfProfile(sampleCarStation(model, z));
  const a = clamp(Math.abs(s), 0, half.length - 1);
  const index = Math.min(Math.floor(a), half.length - 2);
  const t = a - index;
  const sign = s < 0 ? -1 : 1;
  return [
    sign * lerp(half[index][0], half[index + 1][0], t),
    lerp(half[index][1], half[index + 1][1], t),
    z,
  ];
}

function surfaceNormal(model, z, s) {
  const step = 0.02;
  const along = 0.20;
  const point = surfacePoint(model, z, s);
  const alongZ = surfacePoint(model, z + step, s);
  const alongS = surfacePoint(model, z, s + along);
  const nx = (alongZ[1] - point[1]) * (alongS[2] - point[2]) - (alongZ[2] - point[2]) * (alongS[1] - point[1]);
  const ny = (alongZ[2] - point[2]) * (alongS[0] - point[0]) - (alongZ[0] - point[0]) * (alongS[2] - point[2]);
  const nz = (alongZ[0] - point[0]) * (alongS[1] - point[1]) - (alongZ[1] - point[1]) * (alongS[0] - point[0]);
  // Orientation vers l'extérieur : on s'écarte du cœur de la voiture.
  const core = sampleCarStation(model, z);
  const outward = [point[0], point[1] - (core[2] + core[4]) / 2, point[2] - z];
  const sign = nx * outward[0] + ny * outward[1] + nz * outward[2] >= 0 ? 1 : -1;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [(sign * nx) / length, (sign * ny) / length, (sign * nz) / length];
}

/** Hauteur de la carrosserie à (x, z) : sert à poser feux, ouïes et baguettes. */
function surfaceYAt(model, z, x) {
  const half = resampleHalfProfile(sampleCarStation(model, z));
  const target = Math.abs(x);
  let best = half[half.length - 1][1];
  let widest = 0;
  for (let index = 1; index < half.length; index += 1) if (half[index][0] > half[widest][0]) widest = index;
  for (let index = 0; index < widest; index += 1) {
    const [x0, y0] = half[index];
    const [x1, y1] = half[index + 1];
    if (target < Math.min(x0, x1) - 1e-6 || target > Math.max(x0, x1) + 1e-6) continue;
    const span = x1 - x0 || 1;
    best = lerp(y0, y1, (target - x0) / span);
  }
  return best;
}

/**
 * Élément posé au bord du pavillon (barre de toit, rail, galerie) : il suit la
 * vraie largeur et la vraie hauteur du toit d'une station à l'autre au lieu de
 * flotter au-dessus de la carrosserie.
 */
function addRoofEdgeRail(batch, material, model, { startZ, endZ, edge = 0.86, height = 0.05, width = 0.055, lift = 0.02 }) {
  // Une barre continue par côté, calée sur la **largeur minimale** du pavillon
  // (elle ne dépasse jamais) et sur sa hauteur moyenne (elle ne flotte pas).
  let narrowest = Infinity;
  const steps = 6;
  for (let index = 0; index <= steps; index += 1) {
    const z = lerp(startZ, endZ, index / steps);
    const [, , , , , roofWidth] = sampleCarStation(model, z);
    narrowest = Math.min(narrowest, Math.min(roofWidth * edge, halfWidthAt(model, z) * 0.94));
  }
  // Le rail suit la ligne de pavillon : chaque tronçon se pose sur la hauteur
  // réelle du toit à sa station, avec un léger recouvrement pour rester continu.
  const span = Math.abs(endZ - startZ);
  const segments = 6;
  for (const side of [-1, 1]) {
    for (let index = 0; index < segments; index += 1) {
      const z = lerp(startZ, endZ, (index + 0.5) / segments);
      const roof = sampleCarStation(model, z)[4];
      batch.box(
        material,
        [side * narrowest, roof + lift + height / 2, z],
        [width, height, (span / segments) * 1.2],
      );
    }
  }
}

/** Demi-largeur de la carrosserie à une station. */
function halfWidthAt(model, z) {
  return sampleCarStation(model, z)[1];
}

/** Projette un point 3D du modèle sur la surface : renvoie sa coordonnée `s`. */
function projectToSurface(model, x, y, z) {
  const half = resampleHalfProfile(sampleCarStation(model, z));
  const sign = x < 0 ? -1 : 1;
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < half.length - 1; index += 1) {
    const ax = sign * half[index][0];
    const ay = half[index][1];
    const bx = sign * half[index + 1][0];
    const by = half[index + 1][1];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / lengthSquared, 0, 1);
    const distance = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index + t;
    }
  }
  return sign * best;
}

/**
 * Panneau de vitrage : le contour du profil (quatre points, dans l'ordre) est
 * projeté en (z, s), resserré vers son centre pour laisser un entourage peint,
 * puis échantillonné en grille sur la surface, décalé de `offset` vers
 * l'extérieur.
 */
function addConformingGlass(batch, material, model, polygon, offset = 0.011, inset = 0.035) {
  const corners = polygon.map(([x, y, z]) => {
    const s = projectToSurface(model, x, y, z);
    return [z, s];
  });
  const centerZ = corners.reduce((sum, [z]) => sum + z, 0) / corners.length;
  const centerS = corners.reduce((sum, [, s]) => sum + s, 0) / corners.length;
  const shaped = corners.map(([z, s]) => [lerp(centerZ, z, 1 - inset), lerp(centerS, s, 1 - inset)]);

  const columns = 5;
  const rows = 4;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    const startZ = lerp(shaped[0][0], shaped[3][0], v);
    const startS = lerp(shaped[0][1], shaped[3][1], v);
    const endZ = lerp(shaped[1][0], shaped[2][0], v);
    const endS = lerp(shaped[1][1], shaped[2][1], v);
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const z = lerp(startZ, endZ, u);
      const s = lerp(startS, endS, u);
      const point = surfacePoint(model, z, s);
      const normal = surfaceNormal(model, z, s);
      positions.push(point[0] + normal[0] * offset, point[1] + normal[1] * offset, point[2] + normal[2] * offset);
      uvs.push(u, v);
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  batch.custom(material, geometry);
  geometry.dispose();
}

function addGlazing(spec, batch, material) {
  if (spec.windshield) addConformingGlass(batch, material, spec, spec.windshield, 0.011, 0.045);
  if (spec.rearGlass) addConformingGlass(batch, material, spec, spec.rearGlass, 0.011, 0.05);
  for (const pane of spec.sideWindows) {
    addConformingGlass(batch, material, spec, pane.map(([x, y, z]) => [x, y, z]), 0.010, 0.06);
    addConformingGlass(batch, material, spec, pane.map(([x, y, z]) => [-x, y, z]), 0.010, 0.06);
  }
}

/**
 * Centre de roue : le pneu affleure le plan de flanc de la carrosserie (à
 * quelques millimètres près) au lieu de dépasser comme un disque rapporté.
 */
function wheelCenterX(model, z) {
  const [, halfWidth] = sampleCarStation(model, z);
  return Math.max(0.1, Math.min(model.wheelX, halfWidth - model.wheelWidth * 0.5 - 0.006));
}

/** Rayon de l'ouverture d'aile : le pneu garde un jeu constant sous la coque. */
function archRadius(model) {
  return model.wheelRadius + 0.04;
}

/**
 * Vrai si le point (x, y, z) tombe dans une ouverture d'aile. L'ouverture est
 * volontairement un **demi-cercle au-dessus de l'axe de roue** : le bas de
 * caisse (seuil) reste plein derrière la roue, comme sur une vraie carrosserie —
 * creuser plus bas ouvrait la voiture sur toute sa hauteur.
 */
function insideWheelArch(model, x, y, z, radius = archRadius(model)) {
  const side = x < 0 ? -1 : 1;
  const dy = y - model.wheelRadius;
  if (dy < -0.015) return false;
  for (const wheelZ of model.wheelZ) {
    if (Math.abs(z - wheelZ) > radius) continue;
    const centerX = wheelCenterX(model, wheelZ);
    if (x * side < centerX - 0.16) continue;
    const dx = x - side * centerX;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** Coque : une seule surface lissée, du nez à la queue. */
function buildShellGeometries(model) {
  const rows = shellSections(model);
  const positions = [];
  const indices = [];
  const grid = rows.map((sample) => {
    const z = sample[0];
    return ringProfile(sample).map(([x, y]) => { positions.push(x, y, z); return positions.length / 3 - 1; });
  });

  // Les facettes qui tombent dans une ouverture d'aile sont retirées : la coque
  // est réellement percée au-dessus des roues, comme une carrosserie posée sur
  // ses passages de roue. Les sommets restent partagés, donc le lissage des
  // normales ne bouge pas.
  const centroid = (a, b, c) => [
    (positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3,
    (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1]) / 3,
    (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2]) / 3,
  ];
  const pushFace = (a, b, c) => {
    const [x, y, z] = centroid(a, b, c);
    if (insideWheelArch(model, x, y, z)) return;
    indices.push(a, b, c);
  };

  for (let section = 0; section < grid.length - 1; section += 1) {
    for (let edge = 0; edge < RING_SIZE; edge += 1) {
      const a = grid[section][edge];
      const b = grid[section][(edge + 1) % RING_SIZE];
      const c = grid[section + 1][edge];
      const d = grid[section + 1][(edge + 1) % RING_SIZE];
      // Les sections vont du nez à la queue : ce sens de rotation sort vers l'extérieur.
      pushFace(a, c, b);
      pushFace(c, d, b);
    }
  }

  // Nez et queue fermés par un éventail : plus de trou visible de face.
  for (const [section, flip] of [[0, false], [grid.length - 1, true]]) {
    const ring = grid[section];
    let centerX = 0;
    let centerY = 0;
    for (const vertex of ring) {
      centerX += positions[vertex * 3];
      centerY += positions[vertex * 3 + 1];
    }
    const center = positions.length / 3;
    positions.push(centerX / RING_SIZE, centerY / RING_SIZE, rows[section][0]);
    for (let edge = 0; edge < RING_SIZE; edge += 1) {
      const a = ring[edge];
      const b = ring[(edge + 1) % RING_SIZE];
      pushFace(...(flip ? [center, a, b] : [center, b, a]));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { body: geometry, sectionCount: rows.length };
}
function polygonGeometry(points) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const uvs = points.map((_, index) => {
    const angle = (index / points.length) * Math.PI * 2;
    return [0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5];
  });
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2));
  const indices = [];
  for (let point = 1; point < points.length - 1; point += 1) indices.push(0, point, point + 1);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addPanel(batch, material, points) {
  const geometry = polygonGeometry(points);
  batch.custom(material, geometry);
  geometry.dispose();
}

function addSidePanel(batch, material, positiveXPoints, side) {
  const points = positiveXPoints.map(([x, y, z]) => [side * x, y, z]);
  if (side < 0) points.reverse();
  addPanel(batch, material, points);
}

function addRacingStripes(batch, material, stations, startZ, endZ, centers = [-0.115, 0.115]) {
  for (let index = 0; index < stations.length - 1; index += 1) {
    const start = stations[index];
    const end = stations[index + 1];
    if (start[0] < startZ || end[0] > endZ) continue;
    if (Math.min(start[5], end[5]) < 0.18) continue;
    for (const center of centers) {
      const half = 0.038;
      if (Math.abs(center) + half > Math.min(start[5], end[5])) continue;
      addPanel(batch, material, [
        [center - half, start[4] + 0.012, start[0]],
        [center - half, end[4] + 0.012, end[0]],
        [center + half, end[4] + 0.012, end[0]],
        [center + half, start[4] + 0.012, start[0]],
      ]);
    }
  }
}

/**
 * Passage de roue : un demi-tube sombre tapisse chaque ouverture d'aile.
 * Sans lui, la coque percée laisserait voir l'intérieur de la voiture.
 */
function addWheelWells(batch, material, model) {
  const radius = archRadius(model) - 0.006;
  for (const side of [-1, 1]) {
    for (const z of model.wheelZ) {
      const centerX = wheelCenterX(model, z);
      const outer = sampleCarStation(model, z)[1];
      const inner = Math.max(0.05, centerX - 0.26);
      const length = outer + 0.02 - inner;
      batch.cylinder(
        material,
        [side * (inner + length / 2), model.wheelRadius, z],
        radius,
        radius,
        length,
        14,
        [0, 0, Math.PI / 2],
      );
    }
  }
}

function addWheelArch(batch, material, model) {
  const geometry = new THREE.TorusGeometry(model.wheelRadius + 0.042, 0.02, 5, 22, Math.PI);
  // Le demi-tore passe par le haut de la roue, dans le plan YZ.
  geometry.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of model.wheelZ) batch.custom(material, geometry, [side * model.wheelX, model.wheelRadius, z]);
  }
  geometry.dispose();
}

/**
 * Roue fusionnée par matériau : pneus, jante, disque, étrier et dessin de jante
 * spécifique à chaque voiture : branches doubles, turbines et jantes aero.
 */
export function makeWheel({ radius, width, side, material, accent = 0xffffff, racing = true, style = 'split-five' }) {
  const batch = createBatch();
  const axle = [0, 0, Math.PI / 2];
  batch.cylinder(material, [0, 0, 0], radius, radius, width, racing ? 20 : 12, axle, { tint: [0.055, 0.06, 0.075] });
  const rimRadius = radius * (style === 'wire' ? 0.68 : style === 'aero-five' ? 0.70 : 0.64);
  const bright = { tint: [0.83, 0.87, 0.92] };
  batch.cylinder(material, [side * width * 0.08, 0, 0], rimRadius, rimRadius, width * 0.88, 14, axle, bright);
  if (style === 'wire') {
    batch.torus(material, [side * width * 0.52, 0, 0], rimRadius * 0.93, 0.018, 5, 24, [0, Math.PI / 2, 0], bright);
    const spokeCount = 14;
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = (index / spokeCount) * Math.PI * 2;
      const y = Math.cos(angle);
      const z = Math.sin(angle);
      batch.box(material, [side * width * 0.45, y * rimRadius * 0.48, z * rimRadius * 0.48], [0.018, rimRadius * 0.92, 0.026], [angle, 0, 0], bright);
    }
    batch.cylinder(material, [side * width * 0.53, 0, 0], rimRadius * 0.17, rimRadius * 0.17, width * 0.13, 12, axle, { tint: [0.92, 0.94, 0.97] });
  } else {
    const modernAero = style === 'aero-five';
    const spokeCount = !racing ? 4 : modernAero || style === 'classic-five' || style === 'turbofan' ? 5 : style === 'eight-hole' ? 8 : 10;
    const spokeWidth = modernAero ? rimRadius * 0.17 : style === 'eight-hole' ? 0.064 : style === 'classic-five' ? 0.088 : 0.068;
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = (index / spokeCount) * Math.PI * 2;
      const y = Math.cos(angle) * rimRadius * 0.42;
      const z = Math.sin(angle) * rimRadius * 0.42;
      batch.box(material, [side * width * 0.49, y, z], [0.045, rimRadius * 0.82, spokeWidth], [angle, 0, 0], bright);
      if (racing && (style === 'split-five' || modernAero)) {
        const splitScale = modernAero ? 0.67 : 0.75;
        const splitAngle = angle + (modernAero ? 0.18 : 0.12);
        batch.box(material, [side * width * 0.49, y * splitScale, z * splitScale], [0.034, rimRadius * 0.62, modernAero ? 0.035 : 0.035], [splitAngle, 0, 0], bright);
      }
    }
    if (modernAero) {
      batch.torus(material, [side * width * 0.52, 0, 0], rimRadius * 0.91, 0.016, 5, 24, [0, Math.PI / 2, 0], bright);
    }
    const hubRadius = modernAero ? 0.29 : 0.23;
    batch.cylinder(material, [side * width * 0.53, 0, 0], rimRadius * hubRadius, rimRadius * hubRadius, width * 0.14, 10, axle, { tint: [0.91, 0.93, 0.97] });
    if (racing) {
      batch.cylinder(material, [side * width * 0.10, 0, 0], rimRadius * 0.86, rimRadius * 0.86, width * 0.28, 14, axle, { tint: [0.25, 0.27, 0.31] });
      if (style !== 'wire') batch.box(material, [side * width * 0.22, rimRadius * 0.48, 0.03], [width * 0.3, rimRadius * 0.35, rimRadius * 0.42], null, { tint: new THREE.Color(accent).toArray() });
    }
  }
  const wheel = batch.build('wheel').children[0];
  wheel.matrixAutoUpdate = true;
  wheel.castShadow = true;
  return wheel;
}

/** Driver selection still updates race/HUD metadata; the closed cars stay empty. */
export function setRacerDriver(car, driver) {
  const data = car?.userData;
  if (!data || data.kind !== 'racer') return false;
  const driverId = driver?.driverId ?? driver?.id ?? null;
  if (driverId === data.driverId) return false;
  data.driverId = driverId;
  return true;
}

function makeSteeringLights(spec, batch, materials) {
  const { black, carbon, chrome, lightWhite, lightAmber, headGlow } = materials;
  const style = spec.frontStyle || 'led';
  // Toutes les cotes partent de la vraie largeur et de la vraie hauteur de la
  // coque à hauteur du nez : aucun feu ni écope ne dépasse du flanc.
  const noseZ = -1.87;
  const halfWidth = halfWidthAt(spec, noseZ);
  const fasciaWidth = Math.min(spec.grilleWidth * 1.12, halfWidth * 1.72);
  const lampX = halfWidth * 0.56;
  const lampY = surfaceYAt(spec, noseZ, lampX) - 0.035;
  const lampWidth = Math.min(0.40, halfWidth * 0.74);

  if (style === 'classic') {
    // GT des années 60 : calandre chromée à nid d'abeille, deux optiques rondes
    // par côté, pare-chocs chromés. Aucun logo.
    batch.box(chrome, [0, lampY - 0.17, -1.915], [Math.min(halfWidth * 1.94, 1.90), 0.075, 0.13]);
    batch.box(chrome, [0, lampY - 0.015, -1.875], [Math.min(halfWidth * 1.36, 1.34), 0.20, 0.05]);
    batch.box(black, [0, lampY - 0.015, -1.902], [Math.min(halfWidth * 1.18, 1.16), 0.15, 0.03]);
    for (const side of [-1, 1]) {
      // Optiques encastrées dans le nez : la couronne chromée dépasse d'un
      // millimètre, la lentille affleure la carrosserie.
      for (const offset of [0.56, 0.82]) {
        const x = side * halfWidth * offset;
        batch.cylinder(chrome, [x, lampY + 0.03, -1.902], 0.088, 0.088, 0.05, 14, [Math.PI / 2, 0, 0]);
        batch.cylinder(lightWhite, [x, lampY + 0.03, -1.922], 0.068, 0.068, 0.02, 14, [Math.PI / 2, 0, 0]);
      }
      batch.box(lightAmber, [side * halfWidth * 0.62, lampY - 0.20, -1.905], [0.075, 0.05, 0.03]);
    }
    return;
  }

  if (style === 'retro') {
    // Huitième de siècle : optiques rectangulaires fumées, calandre à lamelles,
    // bandeau de pare-chocs noir et longue prise d'air basse.
    batch.box(black, [0, lampY - 0.13, -1.882], [Math.min(fasciaWidth, halfWidth * 1.5), 0.17, 0.05]);
    for (let slat = 0; slat < 4; slat += 1) {
      batch.box(carbon, [0, lampY - 0.06 - slat * 0.05, -1.905], [Math.min(fasciaWidth * 0.94, halfWidth * 1.42), 0.016, 0.02]);
    }
    batch.box(black, [0, lampY - 0.31, -1.895], [Math.min(halfWidth * 1.86, 1.78), 0.075, 0.075]);
    for (const side of [-1, 1]) {
      const x = side * lampX;
      batch.box(black, [x, lampY, -1.868], [Math.min(lampWidth * 1.08, 0.44), 0.115, 0.05]);
      batch.box(lightWhite, [x, lampY + 0.012, -1.900], [Math.min(lampWidth * 0.92, 0.38), 0.032, 0.022]);
      batch.box(lightAmber, [side * halfWidth * 0.94, lampY - 0.05, -1.898], [0.05, 0.022, 0.022]);
      if (headGlow) batch.plane(headGlow, [x, lampY, -1.916], lampWidth * 1.5, 0.20, [0, Math.PI, 0]);
      batch.box(black, [side * halfWidth * 0.9, lampY - 0.235, -1.885], [halfWidth * 0.2, 0.14, 0.05]);
    }
    return;
  }

  // Signature contemporaine : nez bas sans badge, prise d'air active sombre et
  // optiques matricielles à LED.
  batch.box(black, [0, lampY - 0.10, -1.86], [fasciaWidth, 0.16, 0.055]);
  batch.box(carbon, [0, lampY - 0.19, -1.89], [Math.min(fasciaWidth + 0.36, halfWidth * 1.94), 0.075, 0.10]);
  batch.box(black, [0, lampY - 0.28, -1.91], [Math.min(1.30, halfWidth * 1.6), 0.045, 0.08]);

  for (const side of [-1, 1]) {
    const x = side * lampX;
    batch.box(black, [x, lampY, -1.862], [lampWidth, 0.105, 0.055]);
    batch.box(lightWhite, [x - side * 0.012, lampY + 0.009, -1.899], [lampWidth * 0.8, 0.025, 0.022], [0, 0, side * 0.035]);
    batch.box(lightWhite, [side * halfWidth * 0.82, lampY - 0.024, -1.900], [lampWidth * 0.26, 0.022, 0.022], [0, 0, -side * 0.24]);
    batch.box(lightAmber, [side * halfWidth * 0.93, lampY - 0.055, -1.897], [0.045, 0.02, 0.02]);
    if (headGlow) batch.plane(headGlow, [x, lampY, -1.918], lampWidth * 1.5, 0.19, [0, Math.PI, 0]);
    batch.box(black, [side * halfWidth * 0.90, lampY - 0.26, -1.88], [halfWidth * 0.22, 0.19, 0.055]);
    batch.box(carbon, [side * halfWidth * 0.90, lampY - 0.26, -1.914], [halfWidth * 0.06, 0.12, 0.02]);
  }
}

function addRearDetails(profile, spec, batch, materials) {
  const { black, carbon, chrome, body, lightWhite, tailLight, tailGlow, plate } = materials;
  const rear = sampleCarStation(spec, 1.72);
  const rearWidth = rear[1];
  const lampY = lerp(rear[2], rear[3], 0.78);
  const lampWidth = clamp(rearWidth * 1.78, 0.82, Math.min(1.52, rearWidth * 1.9));
  const lampZ = 1.81;

  // Wide smoked panel and a thin, animated full-width LED blade modernize the
  // rear of every silhouette while preserving its individual body proportions.
  batch.box(black, [0, lampY, lampZ], [lampWidth, 0.13, 0.055]);
  batch.box(tailLight, [0, lampY + 0.008, lampZ + 0.036], [lampWidth * 0.91, 0.035, 0.018]);
  for (const side of [-1, 1]) {
    batch.box(tailLight, [side * lampWidth * 0.445, lampY - 0.01, lampZ + 0.037], [0.027, 0.075, 0.02]);
    batch.box(lightWhite, [side * rearWidth * 0.28, 0.48, 1.94], [0.15, 0.025, 0.02]);
  }
  batch.plane(tailGlow, [0, lampY + 0.005, lampZ + 0.052], lampWidth * 1.06, 0.24);

  // Number plate, floating diffuser and four compact vertical fins.
  batch.box(carbon, [0, 0.405, 1.90], [Math.min(1.76, rearWidth * 2.15), 0.16, 0.15]);
  batch.box(black, [0, 0.325, 1.92], [Math.min(1.72, rearWidth * 2.1), 0.075, 0.15]);
  for (const x of [-0.58, -0.22, 0.22, 0.58]) {
    batch.box(black, [x, 0.335, 1.93], [0.035, 0.105, 0.16]);
  }
  batch.plane(plate, [0, 0.49, 1.975], 0.55, 0.22);

  const electric = ['electric-gt', 'neo-roadster'].includes(profile.archetype);
  if (!electric) {
    for (const side of [-1, 1]) {
      batch.cylinder(chrome, [side * 0.52, 0.35, 1.92], 0.055, 0.055, 0.11, 10, [Math.PI / 2, 0, 0]);
      batch.cylinder(black, [side * 0.52, 0.35, 1.985], 0.036, 0.036, 0.018, 10, [Math.PI / 2, 0, 0]);
    }
  }

  // Sport models keep a small integrated lip instead of the dated tall whale-tail.
  if (['porsche', 'ferrari', 'lamborghini', 'electric-gt', 'neo-roadster'].includes(profile.archetype)) {
    const lipWidth = Math.min(1.62, rearWidth * 1.94);
    batch.box(body, [0, rear[4] + 0.012, 1.49], [lipWidth, 0.035, 0.13], [-0.05, 0, 0]);
  }
}

function addModelSpecificDetails(profile, spec, batch, materials) {
  const { archetype } = profile;
  const { black, carbon, body, trim, livery, lightAmber } = materials;
  const sideLineX = spec.wheelX - 0.015;

  if (archetype === 'nova-hatch') {
    // Jupes discrètes, répétiteurs à LED et petit spoiler de hayon affleurant.
    for (const side of [-1, 1]) {
      batch.box(carbon, [side * 0.902, 0.425, 0.10], [0.045, 0.06, 2.92]);
      batch.box(trim, [side * 0.918, 0.61, 0.10], [0.022, 0.022, 2.28]);
      batch.box(lightAmber, [side * 0.91, 0.80, -0.96], [0.018, 0.03, 0.09]);
    }
    batch.box(body, [0, 1.045, 1.54], [1.24, 0.035, 0.11], [-0.03, 0, 0]);
  }

  if (archetype === 'city-hatch') {
    // Jupes affinées et ligne de caisse tendue : la petite voiture partage les
    // codes de la gamme récente sans perdre son format urbain.
    for (const side of [-1, 1]) {
      batch.box(carbon, [side * 0.88, 0.405, 0.10], [0.045, 0.065, 2.92]);
      batch.box(trim, [side * 0.895, 0.645, 0.08], [0.018, 0.022, 2.26]);
      batch.box(lightAmber, [side * 0.895, 0.80, -0.93], [0.018, 0.03, 0.08]);
    }
    // Le capot reçoit deux nervures très discrètes au lieu de panneaux épais.
    for (const side of [-1, 1]) batch.box(black, [side * 0.62, 0.895, -1.27], [0.012, 0.01, 0.48]);
    batch.box(body, [0, 1.19, 1.49], [1.34, 0.04, 0.13], [-0.08, 0, 0]);
  }

  if (archetype === 'ferrari') {
    // Berlinette italienne contemporaine : doubles prises d'air arrière et filet doré.
    for (const side of [-1, 1]) {
      batch.box(trim, [side * 0.92, 0.69, 0.22], [0.025, 0.025, 1.35]);
      addSidePanel(batch, black, [[0.88, 0.61, 0.54], [0.91, 0.79, 0.50], [0.91, 0.79, 1.06], [0.88, 0.61, 1.10]], side);
      batch.box(carbon, [side * 0.93, 0.63, 0.84], [0.035, 0.025, 0.34]);
    }
    for (const side of [-1, 1]) batch.box(carbon, [side * 0.40, 0.89, -1.00], [0.08, 0.025, 0.45], [0.03, 0, 0]);
  }

  if (archetype === 'porsche') {
    // Fastback turbo actuel : vitrages bas, ouïes latérales intégrées et aileron discret.
    for (const side of [-1, 1]) {
      batch.box(trim, [side * 0.92, 0.62, 0.38], [0.024, 0.026, 1.45]);
      addSidePanel(batch, black, [[0.89, 0.56, 0.81], [0.92, 0.78, 0.78], [0.92, 0.78, 1.25], [0.89, 0.56, 1.28]], side);
      for (let slot = 0; slot < 3; slot += 1) batch.box(carbon, [side * 0.92, 0.59 + slot * 0.055, 1.00], [0.025, 0.018, 0.30]);
    }
    for (const side of [-1, 1]) {
      // Écope de frein verticale inspirée des GT modernes ; les phares sont
      // désormais les signatures LED affleurantes de makeSteeringLights().
      batch.box(carbon, [side * 0.76, 0.54, -1.55], [0.08, 0.22, 0.14]);
    }
    batch.box(carbon, [0, 0.84, 1.22], [1.28, 0.045, 0.35]); // extracteur moteur discret
    for (let slat = 0; slat < 4; slat += 1) batch.box(black, [0, 0.87, 1.08 + slat * 0.075], [1.02, 0.014, 0.022]);
  }

  if (archetype === 'audi') {
    // Supercar bleue à moteur central : longues ouïes derrière les portes.
    for (const side of [-1, 1]) {
      addSidePanel(batch, black, [[0.89, 0.55, 0.35], [0.93, 0.78, 0.31], [0.93, 0.78, 0.93], [0.89, 0.55, 1.00]], side);
      for (let slat = 0; slat < 3; slat += 1) batch.box(carbon, [side * 0.94, 0.60 + slat * 0.065, 0.65], [0.02, 0.018, 0.43]);
      batch.box(trim, [side * 0.91, 0.48, 0.52], [0.025, 0.025, 0.72]);
    }
    batch.box(carbon, [0, 0.84, 1.32], [1.42, 0.055, 0.36]); // capot moteur à lamelles
    for (let slat = 0; slat < 5; slat += 1) batch.box(black, [0, 0.875, 1.17 + slat * 0.07], [1.16, 0.016, 0.022]);
    for (const side of [-1, 1]) batch.box(black, [side * 0.44, 0.90, -1.02], [0.05, 0.02, 0.42]);
  }

  if (archetype === 'volkswagen') {
    // Finitions de hot hatch récente : accent rouge bas, jupes fines, prises
    // d'air de frein et becquet de toit intégré.
    for (const side of [-1, 1]) {
      batch.box(livery, [side * sideLineX, 0.49, 0.02], [0.022, 0.022, 2.42]);
      batch.box(carbon, [side * 0.93, 0.405, 0.02], [0.055, 0.065, 3.12]);
      batch.box(black, [side * 0.90, 0.50, -1.42], [0.055, 0.14, 0.20]);
      batch.box(carbon, [side * 0.932, 0.50, -1.42], [0.018, 0.09, 0.12]);
    }
    batch.box(carbon, [0, 0.35, -1.90], [1.76, 0.055, 0.13]); // splitter avant
    batch.box(carbon, [0, 0.34, 1.91], [1.72, 0.11, 0.13]); // diffuseur arrière
    batch.box(body, [0, 1.02, 1.57], [1.38, 0.035, 0.13], [-0.06, 0, 0]); // becquet affleurant
  }

  if (archetype === 'bmw') {
    // Coupé de grand tourisme moderne : livrée sportive et détails assombris.
    addRacingStripes(batch, livery, spec.stations, -1.48, 1.62);
    for (const side of [-1, 1]) {
      batch.box(livery, [side * sideLineX, 0.57, 0.08], [0.02, 0.018, 2.25]);
      batch.box(carbon, [side * 0.94, 0.72, 0.40], [0.018, 0.02, 0.13]);
    }
    batch.box(carbon, [0, 0.36, -1.91], [1.7, 0.055, 0.08]);
  }

  if (archetype === 'lamborghini') {
    // Supercar en coin : prises d'air latérales, persiennes et portes anguleuses.
    for (const side of [-1, 1]) {
      addSidePanel(batch, black, [[0.88, 0.57, 0.38], [0.94, 0.82, 0.33], [0.94, 0.82, 0.99], [0.88, 0.57, 1.04]], side);
      for (let slat = 0; slat < 4; slat += 1) batch.box(carbon, [side * 0.95, 0.62 + slat * 0.055, 0.67], [0.022, 0.018, 0.49]);
      batch.box(carbon, [side * 0.92, 0.40, 0.18], [0.07, 0.09, 1.8]);
      batch.box(black, [side * 0.91, 0.65, -0.08], [0.025, 0.24, 0.025], [0, 0, -side * 0.16]); // joint de porte
    }
    batch.box(black, [0, 0.54, 1.25], [1.10, 0.06, 0.58]);
    for (let slat = 0; slat < 6; slat += 1) batch.box(carbon, [0, 0.585, 1.02 + slat * 0.085], [1.18, 0.022, 0.025]);
    batch.box(carbon, [0, 0.39, -1.96], [1.90, 0.055, 0.14]);
  }

  // Le vitrage fait partie de la coque (voir buildShellGeometries) : aucune
  // vitre rapportée, donc aucun scintillement ni montant qui bâille.
}

// Signatures de miniature : accents très lisibles à distance qui reprennent
// les contrastes des cartes du garage, sans ajouter de logo constructeur.
function addThumbnailSignature(profile, spec, batch, materials) {
  const { archetype } = profile;
  const { black, trim, chrome, livery } = materials;
  if (archetype === 'city-hatch') {
    for (const side of [-1, 1]) {
      batch.box(black, [side * halfWidthAt(spec, -1.02) * 0.64, surfaceYAt(spec, -1.02, halfWidthAt(spec, -1.02) * 0.64) + 0.005, -1.02], [0.035, 0.016, 0.44]);
      batch.box(trim, [side * (halfWidthAt(spec, 0.08) - 0.008), 0.51, 0.08], [0.028, 0.028, 2.24]);
    }
  } else if (archetype === 'nova-hatch') {
    for (const side of [-1, 1]) {
      batch.box(trim, [side * (halfWidthAt(spec, 0.10) - 0.006), 0.67, 0.10], [0.025, 0.035, 2.18]);
      addRoofEdgeRail(batch, black, spec, { startZ: -0.5, endZ: 0.72, edge: 0.66, height: 0.026, width: 0.026, lift: 0.006 });
    }
  } else if (archetype === 'ferrari') {
    addRacingStripes(batch, trim, spec.stations, -1.58, -0.38, [-0.10, 0.10]);
    for (const side of [-1, 1]) batch.box(trim, [side * 0.91, 0.51, 0.22], [0.028, 0.028, 1.58]);
  } else if (archetype === 'porsche') {
    for (const side of [-1, 1]) {
      batch.box(trim, [side * 0.92, 0.54, 0.48], [0.028, 0.035, 1.44]);
      batch.box(trim, [side * 0.58, 0.96, -1.30], [0.045, 0.018, 0.42]);
    }
  } else if (archetype === 'audi') {
    for (const side of [-1, 1]) {
      batch.box(trim, [side * 0.94, 0.68, 0.16], [0.032, 0.032, 1.82]);
      batch.box(chrome, [side * 0.70, 1.00, -0.54], [0.026, 0.028, 0.52]);
    }
  } else if (archetype === 'volkswagen') {
    for (const side of [-1, 1]) batch.box(livery, [side * 0.94, 0.49, 0.02], [0.024, 0.025, 2.44]);
  } else if (archetype === 'electric-gt') {
    addRacingStripes(batch, trim, spec.stations, -1.55, 1.45, [-0.11, 0.11]);
    for (const side of [-1, 1]) batch.box(trim, [side * 0.94, 0.50, 0.18], [0.032, 0.034, 1.58]);
  } else if (archetype === 'sport-crossover') {
    // Rails de toit réellement posés sur le pavillon, qui suivent sa largeur.
    addRoofEdgeRail(batch, trim, spec, { startZ: -0.95, endZ: 1.12, edge: 0.80, height: 0.055, width: 0.07, lift: 0.012 });
    for (const side of [-1, 1]) {
      batch.box(black, [side * (halfWidthAt(spec, 0.2) - 0.03), 0.52, 0.20], [0.035, 0.035, 2.52]);
    }
  } else if (archetype === 'neo-roadster') {
    addRacingStripes(batch, trim, spec.stations, -1.30, 1.36, [-0.10, 0.10]);
    batch.box(black, [0, 0.57, 1.34], [1.42, 0.04, 0.38]);
  } else if (archetype === 'bmw') {
    addRacingStripes(batch, livery, spec.stations, -0.72, 0.72, [-0.115, 0.115]);
  } else if (archetype === 'lamborghini') {
    batch.box(trim, [0, 0.57, -0.08], [0.20, 0.026, 1.72]);
    for (const side of [-1, 1]) batch.box(trim, [side * 0.93, 0.64, 0.58], [0.025, 0.025, 0.72]);
  }
}

/** Construit une voiture fermée, dédiée au modèle sélectionné dans le garage. */
export function makeRacerCar(profile, options = {}) {
  const { player = false, number = 1, daylight = false, driver = null } = options;
  const spec = CAR_MODELS[profile.archetype] || CAR_MODELS.ferrari;
  const group = new THREE.Group();
  group.name = `racer-${profile.id}`;
  const body = new THREE.Group();
  body.name = 'body';
  group.add(body);

  const bodyColor = profile.bodyColor;
  const trimColor = profile.trimColor;
  const liveryColor = profile.liveryColor ?? (profile.archetype === 'bmw' ? 0xc62232 : trimColor);
  const materials = {
    body: paint(bodyColor, { emissiveIntensity: player ? 0.045 : 0.018 }),
    trim: standard(trimColor, { roughness: 0.35, metalness: 0.54 }),
    livery: paint(liveryColor, { roughness: 0.36, metalness: 0.24, emissiveIntensity: 0.008 }),
    black: standard(0x10141b, { roughness: 0.78, metalness: 0.12 }),
    carbon: standard(0x1a1f27, { roughness: 0.62, metalness: 0.28 }),
    chrome: applyPaintFinish(standard(0xcbd3dc, { roughness: 0.24, metalness: 0.78 })),
    // Très sombre et opaque : le cockpit ne laisse jamais apparaître de pilote.
    glass: new THREE.MeshPhysicalMaterial({
      name: `${profile.id}-opaque-tinted-glass`,
      color: 0x0b1420,
      roughness: 0.13,
      metalness: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    lightWhite: new THREE.MeshBasicMaterial({ color: 0xfff5dc, toneMapped: false }),
    lightAmber: new THREE.MeshBasicMaterial({ color: 0xffae47, toneMapped: false }),
    tailLight: new THREE.MeshBasicMaterial({ color: 0xff3449, toneMapped: false }),
    tailGlow: new THREE.MeshBasicMaterial({ color: 0xff263f, transparent: true, opacity: daylight ? 0.14 : 0.30, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    headGlow: new THREE.MeshBasicMaterial({ color: 0xffeec4, transparent: true, opacity: daylight ? 0.12 : 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    headCone: new THREE.MeshBasicMaterial({ color: 0xffefc2, transparent: true, opacity: daylight ? 0 : player ? 0.065 : 0.03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    underglow: new THREE.MeshBasicMaterial({ color: profile.accent, transparent: true, opacity: daylight ? (player ? 0.08 : 0.035) : player ? 0.20 : 0.09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    flameOuter: new THREE.MeshBasicMaterial({ color: profile.accent, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    flameInner: new THREE.MeshBasicMaterial({ color: 0xfff2ad, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    // Passage de roue : mat, très sombre, visible depuis l'intérieur du tube.
    well: standard(0x0a0d12, { roughness: 0.96, metalness: 0.04, side: THREE.DoubleSide }),
    wheel: applyPaintFinish(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.46 })),
    plate: new THREE.MeshBasicMaterial({ map: makeCarPlateTexture(profile, number), toneMapped: false }),
  };

  const details = createBatch();
  const box = (material, position, size, rotation = null) => details.box(material, position, size, rotation);
  const surfaces = buildShellGeometries(spec);
  const shell = new THREE.Mesh(surfaces.body, materials.body);
  shell.name = `${profile.id}-coachwork-shell`;
  shell.castShadow = true;
  body.add(shell);

  // Plancher bas, jupes latérales, poignées et rétroviseurs.
  box(materials.black, [0, 0.285, 0], [1.68, 0.14, 3.78]);
  for (const side of [-1, 1]) {
    box(materials.carbon, [side * 0.89, 0.385, 0], [0.075, 0.10, 3.38]);
    // Compact, body-coloured mirror pods on a short black mounting stem.
    box(materials.black, [side * 0.96, 0.94, -0.63], [0.08, 0.045, 0.08]);
    box(materials.body, [side * 1.015, 0.99, -0.63], [0.14, 0.075, 0.14]);
    box(materials.lightWhite, [side * 1.086, 0.99, -0.63], [0.012, 0.022, 0.075]);
    for (const z of spec.doorSeams) box(materials.carbon, [side * (spec.wheelX - 0.055), 0.64, z], [0.018, 0.28, 0.018]);
  }
  for (const side of [-1, 1]) {
    for (const z of spec.doorSeams.length > 1 ? [-0.45, 0.40] : [0.38]) {
      // Current flush handles: subtle painted inserts rather than chrome bars.
      box(materials.body, [side * (spec.wheelX + 0.008), 0.755, z], [0.016, 0.028, 0.13]);
      box(materials.carbon, [side * (spec.wheelX + 0.017), 0.755, z], [0.018, 0.008, 0.055]);
    }
  }

  addWheelArch(details, materials.body, spec);
  addWheelWells(details, materials.well, spec);
  // Vitrage conforme à la carrosserie, puis détails du modèle.
  addGlazing(spec, details, materials.glass);
  addModelSpecificDetails(profile, spec, details, materials);
  addThumbnailSignature(profile, spec, details, materials);
  makeSteeringLights(spec, details, materials);
  addRearDetails(profile, spec, details, materials);

  const staticDetails = details.build(`${profile.id}-coachwork-details`);
  staticDetails.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = !(object.material.transparent);
    if (object.material === materials.glass) object.name = `${profile.id}-dark-glazing`;
    if (object.material === materials.tailLight) object.name = `${profile.id}-modern-led-tailbar`;
    if (object.material === materials.lightWhite) object.name = `${profile.id}-modern-led-headlights`;
  });
  body.add(staticDetails);

  const headlightCones = [];
  for (const side of [-1, 1]) {
    const cone = new THREE.Mesh(HEADLIGHT_CONE, materials.headCone);
    cone.position.set(side * 0.62, 0.72, -1.80);
    cone.rotation.x = -0.045;
    cone.visible = player && !daylight;
    body.add(cone);
    headlightCones.push(cone);
  }

  const wheels = [];
  const frontWheels = [];
  for (const side of [-1, 1]) {
    for (let axle = 0; axle < spec.wheelZ.length; axle += 1) {
      const wheelZ = spec.wheelZ[axle];
      const pivot = new THREE.Group();
      pivot.name = `${profile.id}-${axle === 0 ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}-wheel-pivot`;
      pivot.position.set(side * wheelCenterX(spec, wheelZ), spec.wheelRadius, wheelZ);
      const wheel = makeWheel({
        radius: spec.wheelRadius,
        width: spec.wheelWidth,
        side,
        material: materials.wheel,
        accent: trimColor,
        style: spec.wheelStyle,
      });
      pivot.add(wheel);
      group.add(pivot);
      wheels.push(wheel);
      if (axle === 0) frontWheels.push(pivot);
    }
  }

  const underglow = mesh(group, UNIT_PLANE, materials.underglow, [0, 0.105, 0], [1.9, 3.7, 1], [-Math.PI / 2, 0, 0]);
  const boostFlames = [];
  for (const side of [-1, 1]) {
    const flame = new THREE.Group();
    flame.position.set(side * 0.48, 0.35, 1.94);
    const outer = new THREE.Mesh(FLAME_OUTER, materials.flameOuter);
    const inner = new THREE.Mesh(FLAME_INNER, materials.flameInner);
    flame.add(outer, inner);
    flame.visible = false;
    body.add(flame);
    boostFlames.push({ group: flame, outer, inner });
  }

  const viewScale = player ? 1 : 0.92;
  group.scale.set(viewScale * (profile.widthScale || 1), viewScale * (profile.heightScale || 1), viewScale * (profile.lengthScale || 1));
  const driverId = driver?.driverId ?? driver?.id ?? null;
  group.userData = {
    kind: 'racer',
    profileId: profile.id,
    archetype: profile.archetype,
    wheelStyle: spec.wheelStyle,
    player,
    driverId,
    body,
    wheels,
    frontWheels,
    underglow,
    headlightCones,
    boostFlames,
    exhaustOffsets: [[-0.52, 0.35, 1.90], [0.52, 0.35, 1.90]],
    rearWheelOffsets: [
      [-wheelCenterX(spec, spec.wheelZ[spec.wheelZ.length - 1]), 0.08, spec.wheelZ[spec.wheelZ.length - 1]],
      [wheelCenterX(spec, spec.wheelZ[spec.wheelZ.length - 1]), 0.08, spec.wheelZ[spec.wheelZ.length - 1]],
    ],
    materials,
    anim: { roll: 0, pitch: 0, lastSpeed: 0 },
  };
  return group;
}

/** Ajoute une livrée d'interception à une voiture de course sans changer son modèle animé. */
export function applyPoliceRacerLivery(car) {
  if (!car || car.userData?.kind !== 'racer' || car.userData.policeLivery) return car;

  const livery = new THREE.Group();
  livery.name = 'police-interceptor-livery';
  const dark = new THREE.MeshStandardMaterial({ color: 0x142947, roughness: 0.52, metalness: 0.16 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f3ec, roughness: 0.48, metalness: 0.1 });
  const red = new THREE.MeshBasicMaterial({
    color: 0xff304f, transparent: true, opacity: 1, depthWrite: false, toneMapped: false,
  });
  const blue = new THREE.MeshBasicMaterial({
    color: 0x39bfff, transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false,
  });
  const bodyPaint = car.userData.materials?.body;
  if (bodyPaint?.color?.setHex) {
    bodyPaint.color.setHex(0xf3f2eb);
    bodyPaint.emissive?.setHex(0x17202d);
    bodyPaint.needsUpdate = true;
  }
  // Le liseré d'origine est accordé à la peinture verte de la citadine ; le
  // bleu nuit le transforme avec la bande des portes en livrée de patrouille.
  car.userData.materials?.trim?.color?.setHex?.(0x243b5a);

  const box = (material, position, size) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    object.position.set(...position);
    object.castShadow = true;
    livery.add(object);
    return object;
  };

  // Barre lumineuse posée au-dessus du pavillon : les deux couleurs alternent
  // pour être identifiables même depuis la caméra de poursuite.
  const shell = car.userData.body.getObjectByName(`${car.userData.profileId}-coachwork-shell`);
  shell.geometry.computeBoundingBox();
  const roofHeight = shell.geometry.boundingBox.max.y;
  box(dark, [0, roofHeight + 0.07, -0.06], [0.98, 0.09, 0.28]);
  box(red, [-0.25, roofHeight + 0.16, -0.06], [0.4, 0.12, 0.27]);
  box(blue, [0.25, roofHeight + 0.16, -0.06], [0.4, 0.12, 0.27]);
  for (const side of [-1, 1]) {
    // Bandeau bleu nuit, liseré blanc et marquage POLICE de chaque côté :
    // même de profil, la voiture se lit comme un intercepteur et non une GT.
    box(dark, [side * 0.93, 0.63, 0.05], [0.035, 0.2, 1.08]);
    box(white, [side * 0.952, 0.72, 0.05], [0.018, 0.035, 0.74]);
    box(red, [side * 0.98, 0.65, -0.07], [0.016, 0.12, 0.13]);
    const labelTexture = makeCanvasTexture((ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 86px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POLICE', width / 2, height / 2);
    }, 512, 128, { smooth: true });
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture, transparent: true, side: THREE.DoubleSide, toneMapped: false,
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.15), labelMaterial);
    label.position.set(side * 0.965, 0.63, 0.05);
    label.rotation.y = side * Math.PI / 2;
    livery.add(label);
  }
  // Marquage arrière visible depuis la caméra de poursuite.
  const rearTexture = makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#142947';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 86px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POLICE', width / 2, height / 2);
  }, 512, 128, { smooth: true });
  const rearLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.23),
    new THREE.MeshBasicMaterial({ map: rearTexture, toneMapped: false }));
  rearLabel.name = 'police-rear-marking';
  rearLabel.position.set(0, 0.58, 2.03);
  livery.add(rearLabel);
  livery.userData.beacons = { red, blue };
  // Les accessoires suivent le roulis et le tangage de la carrosserie.
  car.userData.body.add(livery);
  car.userData.policeLivery = livery;
  return car;
}

/** Animation de caisse, pneus, feux et flammes ; aucun mouvement de personnage. */
export function animateRacerCar(car, state, dt, elapsed) {
  const data = car.userData;
  if (!data || data.kind !== 'racer') return;
  const {
    speed = 0,
    maxSpeed = 1,
    steer = 0,
    lateral = 0,
    boosting = false,
    slowed = false,
    impacting = false,
    stunned = false,
    violentImpact = 0,
    skidding = false,
    idle = false,
    braking = false,
  } = state;
  const anim = data.anim;
  const impactForce = clamp(Number(violentImpact) || 0, 0, 1);
  const acceleration = dt > 0 ? (speed - anim.lastSpeed) / dt : 0;
  anim.lastSpeed = speed;

  const beacons = data.policeLivery?.userData?.beacons;
  if (beacons) {
    const redFirst = Math.floor(elapsed * 4) % 2 === 0;
    beacons.red.opacity = redFirst ? 1 : 0.14;
    beacons.blue.opacity = redFirst ? 0.14 : 1;
  }

  data.wheels.forEach((wheel) => { wheel.rotation.x += speed * dt * 0.95; });
  data.frontWheels.forEach((pivot) => { pivot.rotation.y = steer; });

  const targetRoll = clamp(-lateral * 0.075 + (skidding ? Math.sin(elapsed * 21) * 0.05 : 0), -0.11, 0.11);
  const targetPitch = clamp(-acceleration * 0.0045 + (boosting ? -0.025 : 0) + (braking ? 0.02 : 0), -0.06, 0.06);
  anim.roll = lerp(anim.roll, targetRoll, Math.min(1, dt * 9));
  anim.pitch = lerp(anim.pitch, targetPitch, Math.min(1, dt * 7));
  const vibration = idle ? Math.sin(elapsed * 38) * 0.003 : Math.sin(elapsed * 46) * 0.0022 * Math.min(1, speed / 8);
  const impactRoll = impacting ? Math.sin(elapsed * 31) * 0.075 : 0;
  const impactPitch = impacting ? Math.sin(elapsed * 24) * 0.035 : 0;
  // Un coup de SUV fait rebondir la caisse et la secoue de droite à gauche,
  // sans imposer de stun ni modifier la vitesse du pilote.
  const violentRoll = Math.sin(elapsed * 58) * 0.17 * impactForce;
  const violentPitch = Math.sin(elapsed * 47 + 0.8) * 0.1 * impactForce;
  const violentBounce = Math.abs(Math.sin(elapsed * 54)) * 0.11 * impactForce;
  data.body.rotation.z = anim.roll + impactRoll + violentRoll + (stunned ? Math.sin(elapsed * 19) * 0.03 : 0);
  data.body.rotation.x = anim.pitch + impactPitch + violentPitch;
  data.body.position.y = vibration + (slowed ? Math.sin(elapsed * 27) * 0.02 : 0) + (impacting ? Math.abs(Math.sin(elapsed * 22)) * 0.035 : 0) + violentBounce + (idle ? Math.sin(elapsed * 2.2) * 0.006 : 0);

  const brake = braking || slowed || stunned;
  data.materials.tailLight.color.setHex(stunned ? 0xfff0b0 : brake ? 0xff5a6a : 0xff3449);
  data.materials.tailGlow.opacity = brake ? 0.7 : 0.3;
  const glowBase = data.player ? 0.22 : 0.09;
  data.materials.underglow.opacity = boosting ? 0.66 : slowed ? glowBase * 0.4 : glowBase + Math.sin(elapsed * 6) * 0.02;

  data.boostFlames.forEach((flame, index) => {
    flame.group.visible = boosting;
    if (!boosting) return;
    const pulse = 0.8 + Math.sin(elapsed * 36 + index * Math.PI) * 0.2;
    const thrust = clamp((speed / Math.max(1, maxSpeed)) * pulse, 0.6, 1.5);
    flame.group.scale.set(0.9 + pulse * 0.2, 0.9 + pulse * 0.2, thrust);
    flame.outer.material.opacity = 0.6 + pulse * 0.3;
    flame.inner.material.opacity = 0.7 + pulse * 0.3;
  });
}
