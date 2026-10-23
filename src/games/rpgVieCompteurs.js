/**
 * La vie et les compteurs du Sablier — les calculs, sans rendu.
 * ---------------------------------------------------------------
 * Deux animations livrées ensemble parce qu'elles disent la même chose : ce
 * qui compte dans une partie **coule comme du sable**.
 *
 *  - **La vie** est une jauge de sable, pleine à la vie de base (25 PV).
 *    Les PV bonus restent dans le chiffre, sans agrandir ni vider la jauge.
 *    Le nombre roule jusqu'à sa nouvelle valeur ; ce roulage est décoratif,
 *    le texte accessible reste la valeur vraie (voir `RpgVieCompteurs.jsx`).
 *  - **Les compteurs** posés sur les cartes (les Heures d'un effet, le sable
 *    d'une arme) se vident d'un grain : une variation de valeur allume un geste
 *    court, et la **dernière Heure** se met à veiller — c'est le moment où le
 *    joueur doit savoir, sans lire le journal, que l'effet va tomber.
 *
 * Aucune de ces fonctions ne touche au DOM : le rendu, les minuteries et les
 * `prefers-reduced-motion` vivent dans le composant, et tout ce qui se calcule
 * se vérifie dans `tests/rpg-vie-compteurs.test.js`.
 */

/** Durée du geste d'un compteur de carte qui change (ms) — court, la carte est petite. */
export const RPG_COMPTEUR_DUREE = 420;
/** Durée du geste de la jauge de vie quand elle perd ou gagne (ms). */
export const RPG_VIE_DUREE = 540;
/** Le roulage du nombre : bornes, et millisecondes par point d'écart. */
export const RPG_VIE_ROULAGE_MIN = 220;
export const RPG_VIE_ROULAGE_MAX = 780;
export const RPG_VIE_ROULAGE_PAR_POINT = 34;
/** Sous ce seuil de vie, la jauge veille : elle pulse, la table ne crie pas. */
export const RPG_VIE_SEUIL_CRITIQUE = 5;
/** Nombre de grains qui quittent la plaque à chaque perte de vie. */
export const RPG_VIE_GRAINS = 6;

/**
 * Le mouvement réduit demandé par le système. Sans `matchMedia` (rendu hors
 * navigateur, jsdom nu), on répond « non » : rien ne doit planter pour une
 * préférence qu'on ne peut pas lire.
 */
export function prefererMouvementReduit(win = globalThis.window) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  return Boolean(win.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
}

const borne = (valeur, min, max) => Math.min(max, Math.max(min, valeur));

/** Un nombre utilisable, ou le repli. Les états d'un duel peuvent être partiels. */
const nombre = (valeur, repli = 0) => {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : repli;
};

/**
 * La durée du roulage d'un nombre de vie : un petit écart se règle vite, un
 * gros coup prend le temps de se lire. Toujours entre les deux bornes.
 */
export function dureeRoulageVie(ecart) {
  const points = Math.abs(nombre(ecart));
  return Math.round(borne(RPG_VIE_ROULAGE_MIN + points * RPG_VIE_ROULAGE_PAR_POINT,
    RPG_VIE_ROULAGE_MIN, RPG_VIE_ROULAGE_MAX));
}

/** L'assouplissement du roulage : ça part vite, ça se pose doucement. */
export function assouplirVie(t) {
  const x = borne(nombre(t), 0, 1);
  return 1 - (1 - x) ** 3;
}

/**
 * La valeur affichée par l'overlay de roulage à l'instant `t` (0 → 1), entre
 * deux entiers. Elle est toujours arrondie : une vie s'affiche en PV entiers.
 */
export function valeurRouleeVie(depart, arrivee, t) {
  const de = nombre(depart);
  const vers = nombre(arrivee);
  if (de === vers) return vers;
  return Math.round(de + (vers - de) * assouplirVie(t));
}

/**
 * L'état d'une jauge de vie, prêt pour le CSS.
 *
 * - `part` : `pv / base` borné à [0, 1], indépendamment du record `pvMax` ;
 * - `basePart` / `reserve` : repères CSS conservés à 1 / 0 : aucun bonus
 *   ne transforme le visuel plein en une nouvelle réserve ;
 * - `critique` : la vie est au seuil ou en dessous ; la jauge veille.
 */
export function etatJaugeVie({ pv, base = 25 } = {}) {
  const vie = Math.max(0, nombre(pv));
  const origine = Math.max(1, nombre(base, 25));
  return {
    part: borne(vie / origine, 0, 1),
    basePart: 1,
    reserve: 0,
    critique: vie <= RPG_VIE_SEUIL_CRITIQUE,
    vide: vie <= 0,
  };
}

/**
 * Le sens d'une variation : `perte`, `gain`, ou `stable`. Ce qui n'est pas
 * comparable est stable — une animation ne doit jamais inventer un mouvement.
 */
export function sensVariation(avant, apres) {
  const de = Number(avant);
  const vers = Number(apres);
  if (!Number.isFinite(de) || !Number.isFinite(vers) || de === vers) return 'stable';
  return vers < de ? 'perte' : 'gain';
}

/**
 * La variante `a` / `b` d'un geste, alternée par le jeton de la page. Deux
 * coups reçus coup sur coup changent de nom d'animation : le second rejoue son
 * geste au lieu de le voir ignoré, comme le battement des soins.
 */
export function varianteVariation(token) {
  return Math.abs(Math.trunc(nombre(token))) % 2 ? 'b' : 'a';
}

/**
 * Les classes CSS d'une variation : `is-perte is-perte--b`. `stable` ne pose
 * rien — l'absence de classe est l'état de repos, ce qui évite d'écrire une
 * animation « immobile » dans la feuille.
 */
export function classesVariation(sens, token) {
  if (sens !== 'perte' && sens !== 'gain' && sens !== 'pose') return '';
  const variante = sens === 'pose' ? '' : ` is-${sens}--${varianteVariation(token)}`;
  return `is-${sens}${variante}`;
}
