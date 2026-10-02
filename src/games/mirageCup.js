// Coupes de Mirage Rush — règles pures (aucun DOM, aucun three.js), pour que
// `node --test` puisse les exercer directement.
//
// Une coupe enchaîne plusieurs courses DUEL à quatre cavaliers (le joueur +
// L’Ombre, Sauge et Améthyste) sur des terrains imposés, dans un ordre fixe.
// Sur une piste à trois voies (le téléphone, navigateur comme application —
// voir `mirageLanes.js`), il n’y a de place que pour trois cavaliers : la
// coupe suit le duel et n’aligne alors que L’Ombre et Sauge.
// Chaque arrivée rapporte des points selon la place — plus on finit haut, plus
// on en gagne —, les points s’additionnent d’une course à l’autre, et le
// meilleur total soulève le trophée après la dernière course. Chaque victoire
// de course rapporte 10 OR ; le maximum de chaque coupe correspond donc à
// toutes ses courses remportées (voir `cupGoldMaximum()`).
//
// Le moteur 3D ne connaît pas la coupe : chaque course est un duel ordinaire
// (mêmes pouvoirs, mêmes rivaux) et la page n’a qu’à nourrir `recordCupRace`
// avec le résultat que `MirageWorld` émet à l’arrivée du joueur.
import { CHARACTER_PALETTES } from './mirageCharacters.js';
import { DUEL_DISTANCE, duelRivalsForTrack } from './mirageRules.js';

/** Points par place : 1ᵉʳ, 2ᵉ, 3ᵉ, 4ᵉ — strictement décroissant. */
export const CUP_POINTS = Object.freeze([10, 7, 4, 2]);
/** Le joueur + les trois rivaux PNJ de piste à quatre voies (grand écran). */
export const CUP_RIDER_COUNT = CUP_POINTS.length;
export const PLAYER_RIDER_ID = 'player';
export const MAX_RIDER_NAME = 20;
export const DEFAULT_RIDER_NAME = 'Cavalier';

/**
 * Catalogue des coupes. Pour en ajouter une : un nouvel objet ici, avec des
 * identifiants de terrain déjà connus de `MirageCoursePicker` (`desert`,
 * `western`, `prairie`, `sardinia`, `alger`, `japan`, `ramparts`,
 * `infinity`, `airbase`, `snakeway`) et son maximum d’or (`maxCoins`). Le
 * sélecteur de coupe, l’enchaînement des courses et l’écran du trophée suivent
 * tout seuls. Ajouter aussi le design propre à son identifiant dans
 * `mirageTrophy.js` (forme 3D et icône SVG partagées).
 */
export const CUPS = Object.freeze([
  Object.freeze({
    id: 'desert',
    name: 'Coupe du Désert',
    trophyDesign: 'desert',
    tagline: 'Trois courses, un seul trophée',
    // Maximum de pièces en remportant les trois courses.
    maxCoins: 30,
    // Dunes de l’Écho → Dust Creek → Plaines d’Or
    stages: Object.freeze(['desert', 'western', 'prairie']),
  }),
  Object.freeze({
    id: 'winds',
    name: 'Coupe des Vents',
    trophyDesign: 'winds',
    tagline: 'De la baie aux nuages',
    maxCoins: 30,
    // Costa Omertà → Alger la Blanche → Chemin du Serpent
    stages: Object.freeze(['sardinia', 'alger', 'snakeway']),
  }),
  Object.freeze({
    id: 'worldtour',
    name: 'Coupe Grand Tour',
    trophyDesign: 'worldtour',
    tagline: 'Quatre cartes, un seul trophée',
    maxCoins: 40,
    // Costa Omertà → Alger la Blanche → Plaines de Yōtei → Thunder Airbase
    stages: Object.freeze(['sardinia', 'alger', 'japan', 'airbase']),
  }),
  Object.freeze({
    id: 'legends',
    name: 'Coupe des Légendes',
    trophyDesign: 'legends',
    tagline: 'Cinq courses, un seul trophée',
    maxCoins: 50,
    // Remparts d’Ocre (Counter-Strike) → Château de l’Infini (Demon Slayer) → Thunder Airbase (Street Fighter)
    // → Costa Omertà → Plaines de Yōtei (Ghost of Yōtei)
    stages: Object.freeze(['ramparts', 'infinity', 'airbase', 'sardinia', 'japan']),
  }),
]);
export const DEFAULT_CUP_ID = CUPS[0].id;

/** La coupe demandée, ou `null` si l’identifiant est inconnu. */
export function getCup(cupId) {
  return CUPS.find((cup) => cup.id === cupId) || null;
}

/**
 * Maximum d’or disponible sur l’ensemble d’une coupe (identifiant ou entrée
 * de `CUPS`). Il est gagné au fil des victoires de course : 10 OR par victoire,
 * sans prime supplémentaire au podium. Zéro pour une coupe inconnue.
 */
export function cupGoldMaximum(cup) {
  const entry = typeof cup === 'string' ? getCup(cup) : cup;
  return Math.max(0, Math.floor(Number(entry?.maxCoins) || 0));
}

/** Points d’une place (1 = vainqueur de la course). Hors barème : 0. */
export function pointsForPlace(place) {
  return CUP_POINTS[Number(place) - 1] ?? 0;
}

/** « 1ᵉʳ », « 2ᵉ »… comme dans le HUD de la course. */
export function placeLabel(place) {
  return Number(place) === 1 ? '1ᵉʳ' : `${Number(place)}ᵉ`;
}

/** Nom affichable : sans balise ni caractère de contrôle, sur une ligne. */
export function cleanRiderName(raw, fallback = DEFAULT_RIDER_NAME) {
  const text = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const clipped = Array.from(text).slice(0, MAX_RIDER_NAME).join('').trim();
  return clipped || fallback;
}

// Palette de `mirageExplorer.js` : 5 couleurs de base, plus le chapeau et les
// balzanes quand le skin en a (sinon le modèle les déduit de la robe).
function paletteOf(colors, fallback) {
  const valid = Array.isArray(colors) && colors.length >= 5 && colors.slice(0, 5).every(Number.isFinite);
  const source = valid ? colors : fallback;
  const base = source.slice(0, 5);
  const extra = source.slice(5, 7);
  return extra.every(Number.isFinite) ? [...base, ...extra] : base;
}

/**
 * Démarre une coupe : le joueur (toujours en tête de liste) et les rivaux de
 * la piste — trois par défaut, `duelRivalsForTrack()` — et aucune course
 * courue. Renvoie `null` si la coupe n’existe pas. L’objet est de la donnée
 * pure : chaque étape en produit un nouveau.
 */
export function createCupRun(cupId, { playerName, playerColors, rivals = duelRivalsForTrack() } = {}) {
  const cup = getCup(cupId);
  if (!cup) return null;
  return {
    cupId: cup.id,
    stages: [...cup.stages],
    riders: [
      {
        id: PLAYER_RIDER_ID,
        name: cleanRiderName(playerName),
        isPlayer: true,
        slot: 0,
        colors: paletteOf(playerColors, CHARACTER_PALETTES[0]),
      },
      ...rivals.map((rival, index) => ({
        id: rival.id,
        name: rival.name,
        isPlayer: false,
        slot: index + 1,
        colors: paletteOf(CHARACTER_PALETTES[rival.paletteIndex], CHARACTER_PALETTES[0]),
      })),
    ],
    races: [],
  };
}

export function isCupComplete(run) {
  return Boolean(run) && run.races.length >= run.stages.length;
}

/** Numéro (à partir de 0) de la prochaine course à courir ; borné à la dernière. */
export function cupRaceIndex(run) {
  return Math.min(run.races.length, run.stages.length - 1);
}

/** Terrain de la prochaine course (ou de la dernière, une fois la coupe finie). */
export function cupCurrentStage(run) {
  return run.stages[cupRaceIndex(run)];
}

/**
 * Classe les quatre cavaliers d’une course à partir du résultat que
 * `MirageWorld` émet quand le joueur franchit la ligne :
 *
 *   • les rivaux déjà arrivés, du plus rapide au plus lent ;
 *   • à égalité de chrono, le rival passe devant le joueur — c’est la règle
 *     du moteur (`rank` = 1 + rivaux déjà arrivés) ;
 *   • les rivaux encore en piste, du plus avancé au moins avancé.
 *
 * Chaque ligne : { riderId, slot, place, points, finished, duration, distance }.
 * `duration` est `null` pour un rival pas encore arrivé ; `distance` est alors
 * sa position en mètres. Renvoie `null` si le résultat n’est pas celui d’un
 * duel complet.
 */
export function classifyRace(result, riders) {
  if (!result || result.mode !== 'duel' || !Array.isArray(result.rivals) || !Array.isArray(riders)) return null;
  const duration = Number(result.duration);
  const player = riders.find((rider) => rider.isPlayer);
  if (!player || !Number.isFinite(duration) || duration <= 0) return null;

  const entries = riders.map((rider) => {
    if (rider.isPlayer) {
      return { riderId: rider.id, slot: rider.slot, finished: true, duration, distance: DUEL_DISTANCE };
    }
    const raw = result.rivals.find((entry) => entry && entry.id === rider.id);
    const time = raw && raw.duration != null ? Number(raw.duration) : NaN;
    const finished = Number.isFinite(time) && time > 0;
    const travelled = Math.max(0, Math.min(DUEL_DISTANCE, Number(raw?.distance) || 0));
    return {
      riderId: rider.id,
      slot: rider.slot,
      finished,
      duration: finished ? time : null,
      distance: finished ? DUEL_DISTANCE : travelled,
    };
  });

  const playerFirst = (entry) => (entry.riderId === player.id ? 1 : 0);
  const finished = entries
    .filter((entry) => entry.finished)
    .sort((a, b) => a.duration - b.duration || playerFirst(a) - playerFirst(b) || a.slot - b.slot);
  const racing = entries
    .filter((entry) => !entry.finished)
    .sort((a, b) => b.distance - a.distance || a.slot - b.slot);

  return [...finished, ...racing].map((entry, index) => ({
    ...entry,
    place: index + 1,
    points: pointsForPlace(index + 1),
  }));
}

/**
 * Enregistre la course qui vient de se terminer et renvoie la coupe mise à
 * jour (l’originale n’est jamais modifiée). Un résultat inexploitable, arrivé
 * en double ou venant d’un autre terrain que celui attendu est ignoré : la
 * coupe ne peut donc pas avancer deux fois pour une même arrivée.
 */
export function recordCupRace(run, result) {
  if (!run || isCupComplete(run)) return run;
  const stage = run.stages[run.races.length];
  if (result?.stage && result.stage !== stage) return run;
  const placements = classifyRace(result, run.riders);
  if (!placements) return run;
  return { ...run, races: [...run.races, { stage, placements }] };
}

// Points, puis nombre de victoires, puis place dans la dernière course — elle
// est forcément différente d’un cavalier à l’autre, donc plus aucune égalité —,
// et enfin l’ordre de départ (avant la 1ʳᵉ course, tout le monde est à 0).
function compareStandings(a, b) {
  return (
    b.points - a.points
    || b.wins - a.wins
    || (a.lastPlace ?? Infinity) - (b.lastPlace ?? Infinity)
    || a.slot - b.slot
  );
}

/**
 * Classement général après les courses courues : un objet par cavalier, du
 * premier au dernier, avec `rank`, `points` (total), `wins`, `places` et
 * `gained` (points de chaque course, dans l’ordre) et `lastPlace`.
 */
export function cupStandings(run) {
  if (!run) return [];
  const rows = run.riders.map((rider) => {
    const lines = run.races.map((race) => race.placements.find((line) => line.riderId === rider.id));
    const places = lines.map((line) => line?.place ?? null);
    const gained = lines.map((line) => line?.points ?? 0);
    return {
      ...rider,
      places,
      gained,
      points: gained.reduce((sum, value) => sum + value, 0),
      wins: places.filter((place) => place === 1).length,
      lastPlace: places.length ? places[places.length - 1] : null,
    };
  });
  return rows.sort(compareStandings).map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Le vainqueur de la coupe — `null` tant que la dernière course n’est pas courue. */
export function cupWinner(run) {
  return isCupComplete(run) ? cupStandings(run)[0] : null;
}
