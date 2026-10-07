/**
 * Doublure de `three` pour les vérifications sans GPU : tout three.js réel,
 * sauf `WebGLRenderer`, remplacé par un renderer factice. La scène de garage se
 * construit donc pour de vrai (géométries, matériaux, lumières, voiture) et
 * chaque image rendue est consignée dans `globalThis.__renders`, ce qui permet
 * d'inspecter la scène et la caméra là où jsdom n'a pas de WebGL.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Le renderer factice, fichier séparé pour rester hors de l'alias. */
const rendererPath = path.join(here, 'vice-city-garage-3d-fake-renderer.mjs');

export { WebGLRenderer } from './vice-city-garage-3d-fake-renderer.mjs';
export * from 'three';

export const GARAGE_STUB_RENDERER = rendererPath;
