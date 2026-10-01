// ════════════════════════════════════════════════════════════════════
// LA CENDRE — assets 3D externes (CC0) préchargés avant le monde.
// Source : pack nature de Quaternius (CC0, via miroir GitHub) — arbres
// morts, rochers moussus, bûche. En cas d'échec (hors-ligne, 404), le
// monde retombe sur les modèles procéduraux : le jeu démarre toujours.
// ════════════════════════════════════════════════════════════════════
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FILES = {
  treeDead1: 'CommonTree_Dead_2.glb',
  treeDead2: 'CommonTree_Dead_4.glb',
  rock1: 'Rock_Moss_1.glb',
  rock2: 'Rock_Moss_4.glb',
  log: 'WoodLog_Moss.glb',
};

let cache = null;
let pending = null;

/**
 * Précharge les GLB (6 s de garde-fou max) avant la construction du monde.
 * @param {string} baseUrl racine publique (import.meta.env.BASE_URL en dev/site)
 * @returns {Promise<Record<string, THREE.Object3D|null>>}
 */
export function preloadGameAssets(baseUrl = import.meta.env.BASE_URL || '/') {
  if (pending) return pending;
  pending = (async () => {
    const loader = new GLTFLoader();
    const out = {};
    const jobs = Object.entries(FILES).map(async ([key, file]) => {
      try {
        const res = await fetch(`${baseUrl}assets/la-cendre/${file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        const gltf = await loader.parseAsync(buffer, '');
        out[key] = gltf.scene;
      } catch (error) {
        console.warn(`[la-cendre] asset ${file} indisponible (repli procédural) :`, error);
      }
    });
    await Promise.race([
      Promise.all(jobs),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
    cache = out;
    return out;
  })();
  return pending;
}

/** Assets déjà chargés (null tant que le preload n'est pas terminé). */
export function getGameAssets() {
  return cache;
}
