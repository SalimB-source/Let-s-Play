/**
 * Le Sablier — les **zones** du plateau.
 *
 * Les effets de masse ne balaient plus la table entière : le lanceur désigne
 * une zone, et seules les créatures qui s'y tiennent sont atteintes — les
 * alliées comprises, c'est le prix d'un sort qui ne choisit pas ses victimes.
 *
 * Trois formes, lues sur les deux lignes de chaque camp (front 0-4, fond 5-9) :
 *
 * - `rangee` : une des **quatre rangées** de la table — front ou fond d'un camp
 *   —, cinq cases (voir `RPG_RANGEES`) ;
 * - `colonne` : une des **cinq colonnes**, qui traverse les deux camps —
 *   quatre cases, deux chez chacun. C'est la forme des sorts symétriques (Le
 *   Grand Hiver, Tempête de foudre et de givre) ;
 * - `carre` : **2 colonnes × 2 lignes** d'un même camp — quatre cases.
 *
 * Une zone se décrit par un objet sérialisable (PvP, IA, sauvegarde) :
 *
 * ```js
 * { forme: 'rangee', camp: 'joueur', ligne: 'front' }
 * { forme: 'colonne', colonne: 2 }
 * { forme: 'carre', camp: 'sorcier', colonne: 1 }   // colonnes 1 et 2
 * ```
 *
 * `zoneDepuisAncre` fabrique la zone qu'un clic sur une case désigne : c'est le
 * seul chemin entre la table et le moteur, pour que l'écran et la résolution
 * lisent exactement la même géométrie.
 */
import { positionDe, RPG_RANGEES } from './rpgChamp.js';
import { ligneDeCase, RPG_LIGNE_FOND, RPG_LIGNE_FRONT, RPG_LIGNES_CASES } from './rpgLignes.js';

/** Les trois formes, dans l'ordre de la fiche. */
export const RPG_ZONES_FORMES = Object.freeze(['rangee', 'colonne', 'carre']);

/** Nombre de cases couvertes par chaque forme (indicatif : la table décide). */
export const RPG_ZONE_TAILLE = Object.freeze({ rangee: RPG_LIGNES_CASES, colonne: 4, carre: 4 });

/** Les deux lignes d'un camp, dans l'ordre du plateau (front puis fond). */
const LIGNES_CAMP = [RPG_LIGNE_FRONT, RPG_LIGNE_FOND];

/** La rangée absolue d'une case : 0-1 chez le sorcier, 2-3 chez le joueur. */
export function rangeeZone(camp, index) {
  const position = positionDe({ emplacement: index }, camp);
  return position ? position.rangee : (camp === 'sorcier' ? 1 : 2);
}

/** Les cases d'une ligne de camp, de la colonne 0 à la colonne 4. */
function casesLigne(camp, ligne) {
  const base = ligne === RPG_LIGNE_FOND ? RPG_LIGNES_CASES : 0;
  return Array.from({ length: RPG_LIGNES_CASES }, (_, colonne) => ({
    camp, ligne, colonne, index: base + colonne,
  }));
}

/** Cette zone est-elle bien formée ? Un objet inconnu ne couvre rien. */
export function zoneValide(zone) {
  if (!zone || typeof zone !== 'object') return false;
  if (zone.forme === 'rangee') {
    return (zone.camp === 'joueur' || zone.camp === 'sorcier') && LIGNES_CAMP.includes(zone.ligne);
  }
  if (zone.forme === 'colonne') {
    return Number.isInteger(zone.colonne) && zone.colonne >= 0 && zone.colonne < RPG_LIGNES_CASES;
  }
  if (zone.forme === 'carre') {
    return (zone.camp === 'joueur' || zone.camp === 'sorcier')
      && Number.isInteger(zone.colonne) && zone.colonne >= 0 && zone.colonne < RPG_LIGNES_CASES;
  }
  return false;
}

/** Les cases d'une zone, en positions absolues `{ camp, index, ligne, colonne }`. */
export function casesDeZone(zone) {
  if (!zoneValide(zone)) return [];
  if (zone.forme === 'rangee') return casesLigne(zone.camp, zone.ligne);
  if (zone.forme === 'colonne') {
    return ['joueur', 'sorcier'].flatMap((camp) => LIGNES_CAMP.map((ligne) => {
      const base = ligne === RPG_LIGNE_FOND ? RPG_LIGNES_CASES : 0;
      return { camp, ligne, colonne: zone.colonne, index: base + zone.colonne };
    }));
  }
  // carré : deux colonnes voisines, les deux lignes du camp. Une ancre sur la
  // dernière colonne recule d'une case : le carré tient toujours dans le camp.
  const gauche = Math.min(zone.colonne, RPG_LIGNES_CASES - 2);
  return LIGNES_CAMP.flatMap((ligne) => [gauche, gauche + 1].map((colonne) => ({
    camp: zone.camp,
    ligne,
    colonne,
    index: (ligne === RPG_LIGNE_FOND ? RPG_LIGNES_CASES : 0) + colonne,
  })));
}

/** Le libellé d'une zone, pour le journal et les bulles de la table. */
export function libelleZone(zone) {
  if (!zoneValide(zone)) return 'aucune zone';
  const camp = zone.camp === 'joueur' ? 'votre camp' : 'du camp adverse';
  if (zone.forme === 'rangee') return `la rangée ${zone.ligne === RPG_LIGNE_FOND ? 'du fond' : 'du front'} ${zone.camp === 'joueur' ? 'de votre camp' : 'du camp adverse'}`;
  if (zone.forme === 'colonne') return `la colonne ${zone.colonne + 1}`;
  const gauche = Math.min(zone.colonne, RPG_LIGNES_CASES - 2);
  return `la zone des colonnes ${gauche + 1} et ${gauche + 2} ${zone.camp === 'joueur' ? 'de votre camp' : 'du camp adverse'}`;
}

/**
 * La zone qu'un clic sur la case (`camp`, `index`) désigne pour cette forme.
 * C'est **le** point de traduction entre la table et le moteur.
 */
export function zoneDepuisAncre(forme, camp, index) {
  if (!Number.isInteger(index) || index < 0 || index >= RPG_LIGNES_CASES * 2) return null;
  const ligne = ligneDeCase(index);
  const colonne = index % RPG_LIGNES_CASES;
  if (forme === 'rangee') return { forme, camp, ligne };
  if (forme === 'colonne') return { forme, colonne };
  if (forme === 'carre') {
    // La colonne cliquée est celle de gauche, sauf sur la dernière : on recule
    // d'une colonne pour que le carré tienne toujours dans le camp.
    const gauche = Math.min(colonne, RPG_LIGNES_CASES - 2);
    return { forme, camp, colonne: gauche };
  }
  return null;
}

/**
 * Toutes les ancres légales d'une forme, dans l'ordre du plateau — le camp
 * adverse d'abord, puis le nôtre : c'est l'ordre dans lequel l'IA et la table
 * les essaient. `camp` restreint la liste à un seul camp.
 */
export function ancresDeZone(forme, camp = null) {
  const camps = camp ? [camp] : ['sorcier', 'joueur'];
  const cases = [];
  if (forme === 'rangee') {
    for (const proprietaire of camps) {
      for (const ligne of LIGNES_CAMP) {
        cases.push({ camp: proprietaire, ligne, index: ligne === RPG_LIGNE_FOND ? RPG_LIGNES_CASES : 0 });
      }
    }
    return cases;
  }
  if (forme === 'colonne') {
    for (let colonne = 0; colonne < RPG_LIGNES_CASES; colonne += 1) cases.push({ colonne, index: colonne });
    return cases;
  }
  if (forme === 'carre') {
    for (const proprietaire of camps) {
      for (let colonne = 0; colonne < RPG_LIGNES_CASES; colonne += 1) {
        cases.push({ camp: proprietaire, colonne, index: colonne });
      }
    }
    return cases;
  }
  return cases;
}

/** La créature est-elle dans cette zone ? `camp` = le camp de pose. */
export function entiteDansZone(zone, camp, entite, indexSecours = null) {
  if (!zoneValide(zone) || !entite || !camp) return false;
  const pose = entite.emplacement;
  // Un duel d'avant les lignes n'a pas d'emplacement : l'ordre du champ tient
  // lieu de case (`indexSecours`), pour que la zone ne rate pas tout le monde.
  const index = Number.isInteger(pose) ? pose : indexSecours;
  if (!Number.isInteger(index) || index < 0 || index >= RPG_LIGNES_CASES * 2) return false;
  return casesDeZone(zone).some((c) => c.camp === camp && c.index === index);
}

/** Une rangée absolue (0-3), pour les animations et l'IA. */
export function rangeesDeZone(zone) {
  return [...new Set(casesDeZone(zone).map((c) => rangeeZone(c.camp, c.index)))].sort();
}

export { RPG_RANGEES };

/** Toutes les zones d'une forme, le camp adverse d'abord (le plus menaçant). */
export function zonesPossibles(forme, cote = 'joueur') {
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  if (forme === 'rangee') {
    return [adv, cote].flatMap((camp) => LIGNES_CAMP.map((ligne) => ({ forme, camp, ligne })));
  }
  if (forme === 'colonne') {
    return Array.from({ length: RPG_LIGNES_CASES }, (_, colonne) => ({ forme, colonne }));
  }
  if (forme === 'carre') {
    return [adv, cote].flatMap((camp) => Array.from({ length: RPG_LIGNES_CASES - 1 },
      (_, colonne) => ({ forme, camp, colonne })));
  }
  return [];
}

/**
 * La meilleure zone pour ce lanceur : celle qui pèse le plus lourd.
 *
 * `pesee(entite, camp)` rend le poids d'une créature (positive pour une proie,
 * négative pour une alliée qu'on sacrifierait). Sans pesée, chaque adversaire
 * vaut 1 et chaque alliée −1 : on ne balaie pas son propre camp pour rien.
 * Les égalités se règlent dans l'ordre du plateau — deux parties identiques
 * jouent la même zone.
 */
export function meilleureZone(duel, cote, forme, pesee = null) {
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  const poids = pesee ?? ((entite, camp) => (camp === adv ? 1 : -1));
  let meilleure = null;
  let meilleurScore = -Infinity;
  for (const zone of zonesPossibles(forme, cote)) {
    let score = 0;
    for (const camp of ['joueur', 'sorcier']) {
      for (const entite of duel[camp]?.creatures ?? []) {
        if (entiteDansZone(zone, camp, entite)) score += poids(entite, camp);
      }
    }
    if (score > meilleurScore) { meilleurScore = score; meilleure = zone; }
  }
  return meilleure;
}
