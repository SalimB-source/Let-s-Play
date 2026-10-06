// Modèles 3D des onze voitures de Vice City Rush. Chaque carrosserie possède
// son propre profil de caisse, sa verrière, ses phares et ses détails latéraux ;
// l'habitacle reste sombre et vide pour ne pas afficher de personnage.
import * as THREE from 'three';
import { createBatch } from './cityRushBuilder.js';
import { makeCarPlateTexture } from './cityRushTextures.js';

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
    // Petite citadine française cinq portes, calée sur la miniature Mistral :
    // capot presque horizontal, pare-brise redressé, pavillon haut et hayon
    // très court. La silhouette reste volontairement sans badge constructeur.
    wheelX: 0.88, wheelZ: [-1.20, 1.13], wheelRadius: 0.305, wheelWidth: 0.23, wheelStyle: 'eight-hole',
    doorSeams: [-0.12, 0.78], grilleWidth: 0.76,
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
    // Compacte 5 portes du début des années 2000 : capot court, toit haut,
    // hayon incliné, montants arrière épais et vitrage en trois parties.
    // Sa silhouette et ses feux ronds dans des optiques rectangulaires suivent
    // la nouvelle miniature de garage, sans badge ni logo de constructeur.
    wheelX: 0.92, wheelZ: [-1.18, 1.17], wheelRadius: 0.325, wheelWidth: 0.25, wheelStyle: 'classic-five',
    doorSeams: [-0.08, 0.77], grilleWidth: 0.78,
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
    doorSeams: [-0.18], grilleWidth: 1.08,
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
    doorSeams: [-0.16], grilleWidth: 0.92,
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
    doorSeams: [-0.16], grilleWidth: 1.16,
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
    wheelX: 0.94, wheelZ: [-1.17, 1.17], wheelRadius: 0.33, wheelWidth: 0.25, wheelStyle: 'eight-hole',
    doorSeams: [-0.08, 0.78], grilleWidth: 0.80,
    stations: [
      [-2.00, 0.39, 0.40, 0.59, 0.62, 0.22], [-1.82, 0.72, 0.40, 0.75, 0.82, 0.52],
      [-1.55, 0.90, 0.40, 0.84, 0.95, 0.69], [-1.20, 0.94, 0.40, 0.87, 1.08, 0.75],
      [-0.90, 0.93, 0.41, 0.88, 1.34, 0.73], [-0.55, 0.92, 0.41, 0.89, 1.43, 0.73],
      [0.00, 0.93, 0.41, 0.90, 1.44, 0.74], [0.48, 0.94, 0.41, 0.89, 1.43, 0.75],
      [0.84, 0.95, 0.41, 0.88, 1.40, 0.76], [1.18, 0.94, 0.40, 0.86, 1.34, 0.74],
      [1.50, 0.90, 0.40, 0.83, 1.22, 0.70], [1.72, 0.82, 0.40, 0.77, 1.00, 0.65],
      [1.90, 0.72, 0.39, 0.68, 0.83, 0.58], [2.00, 0.52, 0.38, 0.57, 0.66, 0.41],
    ],
    windshield: [[-0.74, 1.08, -1.20], [0.74, 1.08, -1.20], [0.64, 1.38, -0.49], [-0.64, 1.38, -0.49]],
    rearGlass: [[-0.67, 1.34, 1.08], [0.67, 1.34, 1.08], [0.74, 0.84, 1.82], [-0.74, 0.84, 1.82]],
    sideWindows: [
      [[0.89, 0.93, -0.83], [0.66, 1.37, -0.45], [0.67, 1.37, -0.07], [0.90, 0.93, -0.07]],
      [[0.90, 0.93, 0.03], [0.68, 1.37, 0.03], [0.69, 1.35, 0.74], [0.90, 0.92, 0.80]],
      [[0.90, 0.92, 0.84], [0.69, 1.33, 0.78], [0.68, 1.27, 1.25], [0.84, 0.86, 1.48]],
    ],
  },
  bmw: {
    wheelX: 0.94, wheelZ: [-1.20, 1.16], wheelRadius: 0.34, wheelWidth: 0.26, wheelStyle: 'wire',
    doorSeams: [-0.16], grilleWidth: 0.58,
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
    doorSeams: [-0.12], grilleWidth: 1.20,
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
    wheelX: 0.98, wheelZ: [-1.20, 1.18], wheelRadius: 0.37, wheelWidth: 0.29, wheelStyle: 'eight-hole',
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

function paint(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.27,
    metalness: 0.34,
    clearcoat: 0.92,
    clearcoatRoughness: 0.14,
    emissive: color,
    emissiveIntensity: 0.025,
    ...extra,
  });
}

function mesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = null) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(position[0], position[1], position[2]);
  object.scale.set(scale[0], scale[1], scale[2]);
  if (rotation) object.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  parent.add(object);
  return object;
}

function makeCarShell(model) {
  const positions = [];
  const indices = [];
  const ringSize = 11;
  const rings = model.stations.map(([z, width, lower, shoulder, roof, roofWidth]) => {
    const sideDrop = lower + (shoulder - lower) * 0.28;
    const belly = lower - 0.055;
    return [
      [roofWidth, roof], [width * 0.91, shoulder], [width, sideDrop],
      [width * 0.92, lower], [width * 0.48, belly], [0, belly - 0.014],
      [-width * 0.48, belly], [-width * 0.92, lower], [-width, sideDrop],
      [-width * 0.91, shoulder], [-roofWidth, roof],
    ].map(([x, y]) => { positions.push(x, y, z); return positions.length / 3 - 1; });
  });
  for (let section = 0; section < rings.length - 1; section += 1) {
    for (let edge = 0; edge < ringSize; edge += 1) {
      const a = rings[section][edge];
      const b = rings[section][(edge + 1) % ringSize];
      const c = rings[section + 1][edge];
      const d = rings[section + 1][(edge + 1) % ringSize];
      // Sections progress from the nose to the tail; this winding faces out.
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
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

function addWheelArch(batch, material, model) {
  const geometry = new THREE.TorusGeometry(model.wheelRadius + 0.055, 0.024, 5, 22, Math.PI);
  // Le demi-tore passe par le haut de la roue, dans le plan YZ.
  geometry.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of model.wheelZ) batch.custom(material, geometry, [side * model.wheelX, model.wheelRadius, z]);
  }
  geometry.dispose();
}

/**
 * Roue fusionnée par matériau : pneus, jante, disque, étrier et dessin de jante
 * spécifique à chaque voiture (dont les rayons fins de la GT classique).
 */
export function makeWheel({ radius, width, side, material, accent = 0xffffff, racing = true, style = 'split-five' }) {
  const batch = createBatch();
  const axle = [0, 0, Math.PI / 2];
  batch.cylinder(material, [0, 0, 0], radius, radius, width, racing ? 20 : 12, axle, { tint: [0.055, 0.06, 0.075] });
  const rimRadius = radius * (style === 'wire' ? 0.68 : 0.64);
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
    const spokeCount = !racing ? 4 : style === 'eight-hole' ? 8 : style === 'classic-five' || style === 'turbofan' ? 5 : 10;
    const spokeWidth = style === 'eight-hole' ? 0.064 : style === 'classic-five' ? 0.088 : 0.068;
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = (index / spokeCount) * Math.PI * 2;
      const y = Math.cos(angle) * rimRadius * 0.42;
      const z = Math.sin(angle) * rimRadius * 0.42;
      batch.box(material, [side * width * 0.49, y, z], [0.045, rimRadius * 0.82, spokeWidth], [angle, 0, 0], bright);
      if (racing && style === 'split-five') {
        batch.box(material, [side * width * 0.49, y * 0.75, z * 0.75], [0.038, rimRadius * 0.66, 0.035], [angle + 0.12, 0, 0], bright);
      }
    }
    batch.cylinder(material, [side * width * 0.53, 0, 0], rimRadius * 0.23, rimRadius * 0.23, width * 0.14, 10, axle, { tint: [0.91, 0.93, 0.97] });
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

function makeSteeringLights(profile, spec, batch, materials) {
  const { black, carbon, chrome, trim, lightWhite, lightAmber, tailLight, tailGlow, headGlow } = materials;
  const grilleZ = -1.88;
  batch.box(black, [0, 0.535, grilleZ], [spec.grilleWidth, 0.20, 0.07]);
  batch.box(carbon, [0, 0.405, -1.92], [1.82, 0.105, 0.16]);
  batch.box(black, [0, 0.325, -1.94], [1.88, 0.045, 0.17]);

  if (profile.archetype === 'city-hatch') {
    // Bouclier noir en trois niveaux et optiques rectangulaires légèrement
    // enveloppantes, comme sur la citadine turquoise de la miniature.
    batch.box(black, [0, 0.625, -1.885], [0.72, 0.075, 0.07]); // fente de calandre
    batch.box(carbon, [0, 0.515, -1.925], [1.76, 0.105, 0.13]); // baguette de pare-chocs
    batch.box(black, [0, 0.405, -1.955], [1.08, 0.105, 0.10]); // entrée d'air basse
    for (const side of [-1, 1]) {
      const x = side * 0.60;
      batch.box(black, [x, 0.745, -1.845], [0.43, 0.19, 0.055]);
      batch.box(lightWhite, [x, 0.755, -1.88], [0.34, 0.115, 0.035]);
      batch.box(lightAmber, [side * 0.80, 0.735, -1.885], [0.07, 0.11, 0.035]);
      batch.box(black, [side * 0.68, 0.405, -1.96], [0.20, 0.12, 0.035]);
      batch.sphere(lightWhite, [side * 0.68, 0.415, -1.985], 0.065, 10);
    }
    return;
  }

  if (profile.archetype === 'nova-hatch') {
    // Doubles optiques rondes dans de grands blocs rectangulaires, petite
    // calandre horizontale et antibrouillards bas : la face reste celle d'une
    // compacte de série, pas d'une sportive extrême.
    for (const side of [-1, 1]) {
      const x = side * 0.60;
      batch.box(black, [x, 0.755, -1.835], [0.49, 0.22, 0.065]);
      batch.box(lightWhite, [x, 0.755, -1.875], [0.40, 0.15, 0.035]);
      batch.sphere(lightWhite, [x - side * 0.075, 0.755, -1.905], 0.054, 12);
      batch.sphere(lightWhite, [x + side * 0.075, 0.755, -1.905], 0.054, 12);
      batch.box(lightAmber, [side * 0.83, 0.72, -1.84], [0.10, 0.10, 0.04]);
      batch.box(black, [side * 0.67, 0.46, -1.91], [0.18, 0.09, 0.04]);
    }
    batch.box(black, [0, 0.635, -1.89], [0.57, 0.12, 0.045]);
    for (const y of [0.61, 0.65]) batch.box(carbon, [0, y, -1.92], [0.48, 0.012, 0.015]);
    batch.box(black, [0, 0.475, -1.94], [1.45, 0.11, 0.055]);
    batch.box(carbon, [0, 0.385, -1.945], [0.94, 0.075, 0.045]);
    for (const side of [-1, 1]) batch.sphere(lightWhite, [side * 0.62, 0.40, -1.97], 0.052, 10);
    return;
  }

  if (profile.archetype === 'bmw') {
    for (const side of [-1, 1]) {
      const x = side * 0.61;
      batch.torus(chrome, [x, 0.725, -1.82], 0.16, 0.028, 7, 24);
      batch.sphere(lightWhite, [x, 0.725, -1.84], 0.118, 12);
      batch.sphere(lightAmber, [side * 0.82, 0.61, -1.86], 0.035, 8);
    }
    const oval = new THREE.TorusGeometry(0.30, 0.025, 7, 28);
    batch.custom(chrome, oval, [0, 0.555, -1.91], null, [1, 0.62, 1]);
    oval.dispose();
    batch.box(black, [0, 0.555, -1.89], [0.54, 0.22, 0.055]);
    batch.box(chrome, [0, 0.555, -1.935], [0.028, 0.21, 0.022]);
    batch.box(chrome, [0, 0.445, -1.95], [1.82, 0.035, 0.025]);
    return;
  }

  if (profile.archetype === 'volkswagen') {
    for (const side of [-1, 1]) {
      const x = side * 0.61;
      batch.box(chrome, [x, 0.72, -1.82], [0.39, 0.22, 0.045]);
      batch.box(lightWhite, [x, 0.72, -1.85], [0.33, 0.16, 0.035]);
      batch.box(lightAmber, [side * 0.83, 0.58, -1.86], [0.11, 0.07, 0.035]);
      batch.box(lightWhite, [side * 0.46, 0.47, -1.86], [0.14, 0.07, 0.035]);
    }
    batch.box(black, [0, 0.665, -1.83], [0.46, 0.20, 0.05]);
    for (const y of [0.62, 0.67, 0.72]) batch.box(chrome, [0, y, -1.86], [0.42, 0.012, 0.018]);
    return;
  }

  if (profile.archetype === 'porsche') {
    for (const side of [-1, 1]) {
      const x = side * 0.60;
      batch.box(black, [x, 0.755, -1.77], [0.38, 0.15, 0.05]);
      batch.box(lightWhite, [x, 0.755, -1.80], [0.31, 0.08, 0.035]);
      batch.box(lightAmber, [side * 0.84, 0.60, -1.85], [0.11, 0.055, 0.035]);
    }
    batch.box(carbon, [0, 0.46, -1.90], [1.72, 0.035, 0.025]);
    batch.box(trim, [0, 0.435, -1.925], [1.68, 0.018, 0.018]);
    return;
  }

  for (const side of [-1, 1]) {
    const x = side * (profile.archetype === 'lamborghini' ? 0.60 : 0.62);
    if (profile.archetype === 'lamborghini') {
      batch.box(black, [x, 0.765, -1.75], [0.37, 0.15, 0.05]);
      batch.box(lightWhite, [x, 0.765, -1.78], [0.29, 0.075, 0.032]);
      batch.box(lightAmber, [side * 0.83, 0.57, -1.85], [0.12, 0.06, 0.035]);
    } else if (profile.archetype === 'audi') {
      batch.box(black, [x, 0.755, -1.75], [0.46, 0.13, 0.05]);
      batch.box(lightWhite, [x, 0.765, -1.78], [0.39, 0.065, 0.03]);
      batch.box(lightAmber, [side * 0.86, 0.57, -1.84], [0.09, 0.045, 0.03]);
    } else {
      batch.box(black, [x, 0.765, -1.75], [0.48, 0.13, 0.05]);
      batch.box(lightWhite, [x, 0.775, -1.78], [0.41, 0.065, 0.03]);
      batch.box(lightAmber, [side * 0.85, 0.57, -1.84], [0.1, 0.045, 0.03]);
    }
    batch.plane(headGlow, [x, 0.76, -1.805], 0.55, 0.23, [0, Math.PI, 0]);
  }
}

function addRearDetails(profile, spec, batch, materials) {
  const { black, carbon, chrome, body, lightWhite, tailLight, plate } = materials;
  batch.box(carbon, [0, 0.425, 1.91], [1.82, 0.15, 0.16]);
  batch.box(black, [0, 0.335, 1.94], [1.78, 0.08, 0.15]);
  for (const x of [-0.58, -0.22, 0.22, 0.58]) batch.box(black, [x, 0.335, 1.94], [0.045, 0.10, 0.18]);

  if (profile.archetype === 'nova-hatch') {
    // Feux arrière verticaux aux coins du hayon compact et poignée discrète.
    for (const side of [-1, 1]) {
      batch.box(tailLight, [side * 0.68, 0.74, 1.89], [0.14, 0.34, 0.06]);
      batch.box(lightWhite, [side * 0.68, 0.56, 1.91], [0.08, 0.09, 0.045]);
      batch.box(body, [side * 0.68, 0.93, 1.85], [0.12, 0.06, 0.055]);
    }
    batch.box(carbon, [0, 0.99, 1.84], [1.12, 0.028, 0.045]);
  } else if (profile.archetype === 'city-hatch') {
    // Feux verticaux aux coins du hayon et ligne de vitre arrière, sans badge.
    for (const side of [-1, 1]) {
      batch.box(tailLight, [side * 0.76, 0.87, 1.88], [0.13, 0.42, 0.055]);
      batch.box(lightWhite, [side * 0.76, 0.55, 1.89], [0.07, 0.10, 0.045]);
    }
    batch.box(carbon, [0, 1.00, 1.89], [1.17, 0.025, 0.035]);
  } else if (profile.archetype === 'bmw') {
    for (const side of [-1, 1]) {
      batch.box(tailLight, [side * 0.70, 0.69, 1.91], [0.20, 0.13, 0.045]);
      batch.box(chrome, [side * 0.49, 0.40, 1.95], [0.19, 0.075, 0.10]);
    }
    batch.box(chrome, [0, 0.46, 1.965], [1.80, 0.055, 0.04]);
  } else if (profile.archetype === 'volkswagen') {
    for (const side of [-1, 1]) {
      batch.box(tailLight, [side * 0.78, 0.69, 1.86], [0.16, 0.36, 0.06]);
      batch.box(lightWhite, [side * 0.78, 0.49, 1.87], [0.08, 0.07, 0.04]);
    }
    batch.box(body, [0, 0.82, 1.88], [0.72, 0.035, 0.045]);
  } else if (profile.archetype === 'porsche') {
    for (const side of [-1, 1]) {
      batch.box(tailLight, [side * 0.70, 0.70, 1.91], [0.30, 0.16, 0.05]);
      batch.box(black, [side * 0.70, 0.78, 1.90], [0.30, 0.035, 0.055]);
    }
  } else if (profile.archetype === 'audi') {
    batch.box(tailLight, [0, 0.72, 1.92], [1.38, 0.075, 0.045]);
  } else if (profile.archetype === 'lamborghini') {
    for (const side of [-1, 1]) {
      batch.box(tailLight, [side * 0.66, 0.72, 1.92], [0.38, 0.12, 0.045]);
      batch.box(black, [side * 0.30, 0.70, 1.92], [0.16, 0.12, 0.05]);
    }
  } else {
    for (const side of [-1, 1]) batch.box(tailLight, [side * 0.62, 0.74, 1.92], [0.48, 0.075, 0.045]);
  }

  batch.plane(plate, [0, 0.49, 1.975], 0.55, 0.22);
  for (const side of [-1, 1]) {
    batch.cylinder(chrome, [side * 0.52, 0.35, 1.92], 0.06, 0.06, 0.14, 10, [Math.PI / 2, 0, 0]);
    batch.cylinder(black, [side * 0.52, 0.35, 1.995], 0.04, 0.04, 0.02, 10, [Math.PI / 2, 0, 0]);
  }

  if (profile.archetype === 'porsche') {
    // Becquet arrière bas, typique du coupé turbo à moteur arrière.
    batch.box(carbon, [0, 0.98, 1.57], [1.72, 0.075, 0.33], [-0.08, 0, 0]);
    for (const side of [-1, 1]) batch.box(carbon, [side * 0.64, 0.89, 1.48], [0.055, 0.17, 0.11]);
  } else if (profile.archetype === 'ferrari') {
    batch.box(body, [0, 0.80, 1.70], [1.18, 0.045, 0.16], [-0.04, 0, 0]);
  } else if (profile.archetype === 'volkswagen') {
    batch.box(body, [0, 1.37, 1.70], [1.52, 0.065, 0.25], [-0.08, 0, 0]);
    for (const side of [-1, 1]) batch.box(carbon, [side * 0.57, 1.31, 1.65], [0.055, 0.16, 0.12]);
  } else if (profile.archetype === 'lamborghini') {
    batch.box(carbon, [0, 1.02, 1.62], [1.76, 0.07, 0.24], [-0.06, 0, 0]);
    for (const side of [-1, 1]) batch.box(carbon, [side * 0.59, 0.91, 1.54], [0.055, 0.20, 0.10]);
  }
}

function addModelSpecificDetails(profile, spec, batch, materials) {
  const { archetype } = profile;
  const { black, carbon, chrome, body, trim, livery, lightWhite, lightAmber, tailLight } = materials;
  const sideLineX = spec.wheelX - 0.015;

  if (archetype === 'nova-hatch') {
    // Baguettes de protection de série, deux portes et petites répétitions
    // orange : les détails suivent les bandes noires de la miniature studio.
    for (const side of [-1, 1]) {
      batch.box(carbon, [side * 0.918, 0.625, -0.28], [0.038, 0.062, 0.66]);
      batch.box(carbon, [side * 0.918, 0.625, 0.57], [0.038, 0.062, 0.78]);
      batch.box(carbon, [side * 0.902, 0.435, 0.10], [0.05, 0.075, 2.94]);
      batch.box(lightAmber, [side * 0.93, 0.80, -0.96], [0.025, 0.055, 0.11]);
      batch.box(black, [side * 0.94, 0.765, -0.36], [0.03, 0.042, 0.16]);
      batch.box(black, [side * 0.94, 0.765, 0.53], [0.03, 0.042, 0.16]);
    }
    for (const side of [-1, 1]) batch.box(black, [side * 0.60, 0.925, -1.27], [0.016, 0.012, 0.42]);
    batch.box(body, [0, 1.045, 1.54], [1.24, 0.035, 0.11], [-0.03, 0, 0]);
  }

  if (archetype === 'city-hatch') {
    // Grosses baguettes noires, deux portes bien découpées et bas de caisse
    // sobres : ce sont les signes les plus lisibles de la miniature de profil.
    for (const side of [-1, 1]) {
      batch.box(carbon, [side * 0.895, 0.655, -0.36], [0.045, 0.075, 0.70]);
      batch.box(carbon, [side * 0.895, 0.655, 0.54], [0.045, 0.075, 0.82]);
      batch.box(carbon, [side * 0.88, 0.405, 0.10], [0.055, 0.085, 2.92]);
      // Petit répétiteur orange sur l'aile avant et poignées noires de série.
      batch.box(lightAmber, [side * 0.902, 0.80, -0.93], [0.025, 0.055, 0.10]);
      batch.box(black, [side * 0.915, 0.765, -0.37], [0.03, 0.045, 0.17]);
      batch.box(black, [side * 0.915, 0.765, 0.53], [0.03, 0.045, 0.17]);
    }
    // Deux lignes fines donnent au capot plat ses joints sans ajouter de logo.
    for (const side of [-1, 1]) batch.box(black, [side * 0.62, 0.895, -1.27], [0.018, 0.014, 0.55]);
    batch.box(black, [0, 0.925, -0.91], [1.22, 0.014, 0.018]);
    // Lèvre peinte au-dessus du hayon, très courte comme sur la photo studio.
    batch.box(body, [0, 1.19, 1.49], [1.34, 0.055, 0.16], [-0.08, 0, 0]);
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
    // Coupé turbo des années 80 : capot plongeant, ouïes arrière et large aileron.
    for (const side of [-1, 1]) {
      batch.box(trim, [side * 0.92, 0.62, 0.38], [0.024, 0.026, 1.45]);
      addSidePanel(batch, black, [[0.89, 0.56, 0.81], [0.92, 0.78, 0.78], [0.92, 0.78, 1.25], [0.89, 0.56, 1.28]], side);
      for (let slot = 0; slot < 3; slot += 1) batch.box(carbon, [side * 0.92, 0.59 + slot * 0.055, 1.00], [0.025, 0.018, 0.30]);
    }
    for (const side of [-1, 1]) {
      batch.box(black, [side * 0.53, 0.87, -1.35], [0.23, 0.018, 0.23]); // capots de phares escamotables
      batch.box(chrome, [side * 0.53, 0.86, -1.36], [0.19, 0.012, 0.17]);
      batch.box(lightWhite, [side * 0.53, 0.865, -1.38], [0.14, 0.016, 0.12]);
    }
    batch.box(carbon, [0, 0.84, 1.22], [1.38, 0.06, 0.43]); // grille moteur arrière
    for (let slat = 0; slat < 5; slat += 1) batch.box(black, [0, 0.875, 1.06 + slat * 0.075], [1.10, 0.018, 0.025]);
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
    // Compacte 5 portes carrée, vitres hautes et bande rouge le long des flancs.
    for (const side of [-1, 1]) {
      batch.box(livery, [side * sideLineX, 0.61, 0.02], [0.025, 0.045, 2.55]);
      batch.box(carbon, [side * 0.90, 0.40, 0.02], [0.06, 0.08, 3.25]);
      batch.box(chrome, [side * 0.94, 0.76, -0.42], [0.035, 0.035, 0.14]);
      batch.box(chrome, [side * 0.94, 0.76, 0.43], [0.035, 0.035, 0.14]);
    }
    batch.box(carbon, [0, 0.34, -1.88], [1.72, 0.14, 0.12]);
    batch.box(carbon, [0, 0.33, 1.91], [1.76, 0.14, 0.12]);
    batch.box(black, [0, 0.96, 1.76], [1.14, 0.045, 0.075]); // hayon arrière
  }

  if (archetype === 'bmw') {
    // Grand tourisme classique : doubles bandes rouges et éléments chromés.
    addRacingStripes(batch, livery, spec.stations, -1.48, 1.62);
    for (const side of [-1, 1]) {
      batch.box(livery, [side * sideLineX, 0.57, 0.08], [0.02, 0.018, 2.25]);
      batch.box(chrome, [side * 0.94, 0.72, 0.40], [0.032, 0.032, 0.17]);
      batch.box(chrome, [side * 0.97, 0.92, -0.62], [0.18, 0.055, 0.14]); // petit rétro chromé
    }
    batch.box(chrome, [0, 0.42, -1.94], [1.78, 0.075, 0.08]);
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
    for (const side of [-1, 1]) batch.box(black, [side * 0.53, 0.87, -1.33], [0.28, 0.016, 0.25]); // phares escamotables
  }

  // Le toit est une vraie coque peinte ; ces vitres opaques et fumées masquent
  // complètement l'habitacle, aucun mesh de visage ou de pilote n'est ajouté.
  if (spec.windshield) addPanel(batch, materials.glass, spec.windshield);
  if (spec.rearGlass) addPanel(batch, materials.glass, spec.rearGlass);
  for (const pane of spec.sideWindows) {
    addSidePanel(batch, materials.glass, pane, 1);
    addSidePanel(batch, materials.glass, pane, -1);
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
    chrome: standard(0xcbd3dc, { roughness: 0.24, metalness: 0.78 }),
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
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.46 }),
    plate: new THREE.MeshBasicMaterial({ map: makeCarPlateTexture(profile, number), toneMapped: false }),
  };

  const details = createBatch();
  const box = (material, position, size, rotation = null) => details.box(material, position, size, rotation);
  const shell = new THREE.Mesh(makeCarShell(spec), materials.body);
  shell.name = `${profile.id}-coachwork-shell`;
  shell.castShadow = true;
  body.add(shell);

  // Plancher bas, jupes latérales, poignées et rétroviseurs.
  box(materials.black, [0, 0.285, 0], [1.68, 0.14, 3.78]);
  for (const side of [-1, 1]) {
    box(materials.carbon, [side * 0.89, 0.385, 0], [0.075, 0.10, 3.38]);
    box(materials.body, [side * 0.985, 0.99, -0.63], [0.17, 0.105, 0.17]);
    box(materials.black, [side * 1.045, 0.995, -0.63], [0.018, 0.055, 0.11]);
    for (const z of spec.doorSeams) box(materials.carbon, [side * (spec.wheelX - 0.055), 0.64, z], [0.018, 0.28, 0.018]);
  }
  for (const side of [-1, 1]) {
    for (const z of spec.doorSeams.length > 1 ? [-0.45, 0.40] : [0.38]) {
      const handleMaterial = ['city-hatch', 'nova-hatch'].includes(profile.archetype) ? materials.black : materials.chrome;
      box(handleMaterial, [side * (spec.wheelX + 0.005), 0.745, z], [0.03, 0.032, 0.15]);
    }
  }

  addWheelArch(details, materials.body, spec);
  addModelSpecificDetails(profile, spec, details, materials);
  makeSteeringLights(profile, spec, details, materials);
  addRearDetails(profile, spec, details, materials);

  const staticDetails = details.build(`${profile.id}-coachwork-details`);
  staticDetails.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = !(object.material.transparent);
    if (object.material === materials.glass) object.name = `${profile.id}-dark-glazing`;
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
      pivot.position.set(side * spec.wheelX, spec.wheelRadius, wheelZ);
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
    rearWheelOffsets: [[-spec.wheelX, 0.08, spec.wheelZ[1]], [spec.wheelX, 0.08, spec.wheelZ[1]]],
    materials,
    anim: { roll: 0, pitch: 0, lastSpeed: 0 },
  };
  return group;
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
    skidding = false,
    idle = false,
    braking = false,
  } = state;
  const anim = data.anim;
  const acceleration = dt > 0 ? (speed - anim.lastSpeed) / dt : 0;
  anim.lastSpeed = speed;

  data.wheels.forEach((wheel) => { wheel.rotation.x += speed * dt * 0.95; });
  data.frontWheels.forEach((pivot) => { pivot.rotation.y = steer; });

  const targetRoll = clamp(-lateral * 0.075 + (skidding ? Math.sin(elapsed * 21) * 0.05 : 0), -0.11, 0.11);
  const targetPitch = clamp(-acceleration * 0.0045 + (boosting ? -0.025 : 0) + (braking ? 0.02 : 0), -0.06, 0.06);
  anim.roll = lerp(anim.roll, targetRoll, Math.min(1, dt * 9));
  anim.pitch = lerp(anim.pitch, targetPitch, Math.min(1, dt * 7));
  const vibration = idle ? Math.sin(elapsed * 38) * 0.003 : Math.sin(elapsed * 46) * 0.0022 * Math.min(1, speed / 8);
  const impactRoll = impacting ? Math.sin(elapsed * 31) * 0.075 : 0;
  const impactPitch = impacting ? Math.sin(elapsed * 24) * 0.035 : 0;
  data.body.rotation.z = anim.roll + impactRoll + (stunned ? Math.sin(elapsed * 19) * 0.03 : 0);
  data.body.rotation.x = anim.pitch + impactPitch;
  data.body.position.y = vibration + (slowed ? Math.sin(elapsed * 27) * 0.02 : 0) + (impacting ? Math.abs(Math.sin(elapsed * 22)) * 0.035 : 0) + (idle ? Math.sin(elapsed * 2.2) * 0.006 : 0);

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
