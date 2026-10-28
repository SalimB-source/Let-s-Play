/**
 * Les réglages d'animation du Sablier, purs et sans React.
 *
 * Deux préférences mémorisées sur l'appareil (même convention que le son :
 * accès `localStorage` tolérant, qui ne plante pas en navigation privée ou dans
 * une iframe qui l'interdit) :
 *
 *   - le **mode réduit forcé** : une case dans les paramètres qui supprime les
 *     gestes sans dépendre du réglage système `prefers-reduced-motion` ;
 *   - la **vitesse des animations** : ×0,5 · ×1 · ×2, exposée à la feuille via
 *     la variable `--rpg-anim-scale` et aux minuteurs de la page via
 *     {@link dureeAnimation}.
 *
 * Les sons ne sont jamais concernés : ces réglages ne touchent que le geste.
 */

export const RPG_VITESSES_ANIMATION = Object.freeze([
  Object.freeze({ id: 'lente', facteur: 0.5, label: '×0,5' }),
  Object.freeze({ id: 'normale', facteur: 1, label: '×1' }),
  Object.freeze({ id: 'rapide', facteur: 2, label: '×2' }),
]);

const RPG_REDUCED_KEY = 'letsplay_sablier_anim_reduite_v1';
const RPG_VITESSE_KEY = 'letsplay_sablier_anim_vitesse_v1';

const FACTEURS_VALIDES = RPG_VITESSES_ANIMATION.map((vitesse) => vitesse.facteur);

function stockage() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Le mode réduit forcé par le joueur (indépendant du système). */
export function readRpgReducedPref() {
  try {
    return stockage()?.getItem(RPG_REDUCED_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeRpgReducedPref(value) {
  try {
    stockage()?.setItem(RPG_REDUCED_KEY, value ? 'on' : 'off');
  } catch { /* stockage indisponible : le réglage ne vit que la session */ }
}

/** Le facteur de vitesse mémorisé, ramené à ×1 si la valeur est illisible. */
export function readRpgVitessePref() {
  let brut = null;
  try {
    brut = stockage()?.getItem(RPG_VITESSE_KEY);
  } catch {
    brut = null;
  }
  if (brut === null || brut === '') return 1;
  const facteur = Number(brut);
  return FACTEURS_VALIDES.includes(facteur) ? facteur : 1;
}

export function writeRpgVitessePref(facteur) {
  const valeur = FACTEURS_VALIDES.includes(facteur) ? facteur : 1;
  try {
    stockage()?.setItem(RPG_VITESSE_KEY, String(valeur));
  } catch { /* stockage indisponible */ }
}

/** Le système demande-t-il le mouvement réduit ? Toujours faux sans `window`. */
export function systemeMotionReduite() {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

/**
 * Mode réduit effectif : le réglage forcé du joueur OU la préférence système.
 * @param {boolean} [force] la préférence forcée lue par la page (par défaut
 *   celle du stockage), pour garder une fonction purifiable en test.
 */
export function rpgAnimationsReduites(force = readRpgReducedPref()) {
  return Boolean(force) || systemeMotionReduite();
}

/**
 * Durée d'un minuteur visuel après application du réglage de vitesse. Le mode
 * réduit, lui, est traité en amont (les effets ne sont pas créés) ; cette
 * fonction ne met donc pas les durées à zéro.
 * @param {number} millisecondes la durée nominale du geste
 * @returns {number} la durée réellement programmée, jamais inférieure à 16 ms
 */
export function dureeAnimation(millisecondes) {
  const facteur = readRpgVitessePref();
  return Math.max(16, Math.round(Number(millisecondes) * facteur));
}
