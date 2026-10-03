import { MAX_PIXEL_RATIO, MAX_RENDER_PIXELS } from './miragePixelBudget.js';

/**
 * `mirageGraphics` — l'option « Graphismes baissés » de Mirage Rush.
 *
 * Deux niveaux, au choix du joueur (jamais imposés) :
 *
 *   - `normal` : le rendu habituel, celui du jeu depuis toujours (défaut) ;
 *   - `low`    : « graphismes baissés » — le même jeu, la même piste, les mêmes
 *                obstacles et la même vitesse, mais une image moins coûteuse à
 *                dessiner : moins de pixels, moins d'effets décoratifs. Ce qui
 *                se joue (voies, distances de visibilité, brouillard, collisions,
 *                chronos) n'est jamais touché : seul l'habillage change.
 *
 * Le choix est mémorisé sur l'appareil (`localStorage`) et **se change en
 * direct** — même en pleine course : le monde 3D relit le profil sans être
 * reconstruit, la course continue.
 *
 * Ce fichier ne contient aucun DOM ni React : les profils (ce que chaque niveau
 * change), la lecture/écriture du choix et un petit état partagé que la page,
 * la course en ligne et le moteur 3D écoutent. Le hook React est dans
 * `useMirageGraphics.js`, le moteur applique le profil dans `MirageWorld.jsx`.
 */

export const GRAPHICS_NORMAL = 'normal';
export const GRAPHICS_LOW = 'low';
export const GRAPHICS_QUALITIES = Object.freeze([GRAPHICS_NORMAL, GRAPHICS_LOW]);

/** Clé `localStorage` du choix (même famille que `letsplay_mirage_*_v1`). */
export const GRAPHICS_STORAGE_KEY = 'letsplay_mirage_graphics_v1';

/**
 * Ce que change chaque niveau. Les champs sont lus par le moteur à chaque
 * (ré)application — rien n'est copié ailleurs.
 *
 *   - `maxPixelRatio` / `maxRenderPixels` : résolution de rendu (voir
 *     `miragePixelBudget.js`) — le levier le plus efficace, le coût d'une image
 *     suit le nombre de pixels. Bas : 1 pixel par pixel CSS et au plus
 *     921 600 pixels (1280 × 720), le navigateur étirant le résultat.
 *   - `antialias` : lissage MSAA des arêtes, réservé au Château de l'Infini. Il
 *     se décide à la création du contexte WebGL : un changement en cours de
 *     course ne s'y applique qu'à la course suivante.
 *   - `sceneryEffects` : effets décoratifs du décor (nuages et mirage animés,
 *     rides du sable, voile d'eau, poussière). Ils ne portent aucun élément de
 *     jeu : les retirer ne change ni la lisibilité de la piste ni la difficulté.
 *   - `glowHalos` : les halos de lumière **peints** devant les cristaux (voir
 *     mirageGlow.js). C'est la seule dépense réellement liée au nombre de pixels
 *     transparents : sur un appareil juste, ce sont eux qu'on éteint d'abord.
 *     La gemme, elle, ne change pas d'un pixel — elle brille simplement moins.
 *   - `sceneryRangeRatio` : part de la portée du brouillard (sa distance « far »)
 *     au-delà de laquelle les blocs de décor (champs, façades, tribunes…) ne sont plus
 *     dessinés. À 0,85 le brouillard les a déjà fondus à près de 90 %, et sur les
 *     terrains les plus chargés (jusqu'à 1 600 appels de dessin par image) c'est le
 *     nombre d'objets, et non les pixels, qui limite le processeur. Seul le décor est
 *     concerné : pistes, obstacles et cristaux restent visibles à leur distance
 *     habituelle. `Infinity` = tout le décor.
 *   - `gemBurstRatio` : part des éclats projetés quand on ramasse un cristal.
 *   - `hudInterval` : délai minimal (ms) entre deux mises à jour du HUD React
 *     (score, chrono…) — chacune refait le rendu de toute la page.
 *   - `idleFrameInterval` : délai minimal (ms) entre deux images quand la
 *     course n'est pas lancée (menu, compte à rebours, pause) : la piste est
 *     alors presque immobile, inutile de la redessiner 60 fois par seconde.
 *     0 = à chaque image.
 */
export const GRAPHICS_PROFILES = Object.freeze({
  [GRAPHICS_NORMAL]: Object.freeze({
    quality: GRAPHICS_NORMAL,
    maxPixelRatio: MAX_PIXEL_RATIO,
    maxRenderPixels: MAX_RENDER_PIXELS,
    antialias: true,
    sceneryEffects: true,
    glowHalos: true,
    sceneryRangeRatio: Infinity,
    gemBurstRatio: 1,
    hudInterval: 125,
    idleFrameInterval: 0,
  }),
  [GRAPHICS_LOW]: Object.freeze({
    quality: GRAPHICS_LOW,
    maxPixelRatio: 1,
    maxRenderPixels: 921_600,
    antialias: false,
    sceneryEffects: false,
    glowHalos: false,
    sceneryRangeRatio: 0.85,
    gemBurstRatio: 0.5,
    hudInterval: 200,
    idleFrameInterval: 66,
  }),
});

/** Toute valeur inconnue (ancienne version, stockage corrompu) vaut `normal`. */
export function normalizeGraphics(value) {
  return value === GRAPHICS_LOW ? GRAPHICS_LOW : GRAPHICS_NORMAL;
}

export function isLowGraphics(value) {
  return normalizeGraphics(value) === GRAPHICS_LOW;
}

/** Le profil d'un niveau (le profil normal pour une valeur inconnue). */
export function graphicsProfile(value) {
  return GRAPHICS_PROFILES[normalizeGraphics(value)];
}

/**
 * Nombre d'éclats d'un jet de cristal pour un total `full` : au moins 3 pour
 * que le jet reste lisible, jamais plus que `full`.
 */
export function gemBurstShardCount(full, profile) {
  const ratio = Number.isFinite(profile?.gemBurstRatio) ? profile.gemBurstRatio : 1;
  return Math.max(Math.min(3, full), Math.min(full, Math.round(full * ratio)));
}

/**
 * Faut-il sauter le dessin de cette image ? Seulement quand la piste est à l'arrêt
 * (`running` faux : menu, compte à rebours, pause), qu'aucune image n'est exigée
 * (`pending` : taille ou réglage changé) et que le profil ralentit ce rythme
 * (`interval` > 0 ms) alors que la dernière image est trop récente. En course, jamais :
 * chaque image est dessinée. `now` et `last` sont des horloges en millisecondes ; une
 * horloge qui recule (`now` < `last`) ne fait jamais sauter d'image.
 */
export function shouldSkipRender({ running, pending, interval, now, last }) {
  if (running || pending || !(interval > 0)) return false;
  const elapsed = now - last;
  return elapsed >= 0 && elapsed < interval;
}

/** `localStorage` s'il est utilisable (mode privé, iframe sandboxée : `null`). */
function defaultStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readGraphics(storage = defaultStorage()) {
  try {
    return normalizeGraphics(storage?.getItem(GRAPHICS_STORAGE_KEY));
  } catch {
    return GRAPHICS_NORMAL;
  }
}

/** Mémorise le choix. Retourne `false` si le stockage est indisponible (le jeu continue). */
export function writeGraphics(value, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(GRAPHICS_STORAGE_KEY, normalizeGraphics(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Petit état partagé : la page, la course en ligne, les boutons et chaque monde
 * 3D lisent et écoutent le même choix. `getStorage` est injectable pour les tests.
 *
 *   - `get()` : le niveau courant (lu dans le stockage au premier appel) ;
 *   - `set(valeur)` : change, mémorise et prévient les abonnés — sans rien faire
 *     si le niveau ne change pas ;
 *   - `sync()` : relit le stockage (autre onglet) et prévient si le niveau a changé ;
 *   - `subscribe(fn)` : `fn(niveau)` à chaque changement ; retourne le désabonnement.
 */
export function createGraphicsStore(getStorage = defaultStorage) {
  let current = null;
  const listeners = new Set();

  const get = () => {
    if (current === null) current = readGraphics(getStorage());
    return current;
  };
  const publish = (next) => {
    current = next;
    for (const listener of [...listeners]) listener(next);
    return next;
  };
  const set = (value) => {
    const next = normalizeGraphics(value);
    if (next === get()) return next;
    writeGraphics(next, getStorage());
    return publish(next);
  };
  const sync = () => {
    const next = readGraphics(getStorage());
    return next === get() ? next : publish(next);
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  return { get, set, sync, subscribe };
}

/** L'état partagé de la page (un seul par onglet). */
export const graphicsStore = createGraphicsStore();
