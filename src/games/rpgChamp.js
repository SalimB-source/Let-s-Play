/**
 * Le Sablier — le **champ partagé** : une seule grille pour les deux camps.
 *
 * Les lignes (`rpgLignes.js`) disent à quelle ligne d'un camp appartient une
 * case. Les portées (`rpgPortees.js`) ont besoin d'autre chose : d'une
 * **position absolue**, comparable entre deux créatures qui ne sont pas du
 * même camp — et, depuis que les créatures avancent, entre une créature et la
 * case qu'elle occupe parfois **chez l'adversaire**.
 *
 * ## Les quatre rangées
 *
 * Le champ se lit de haut en bas, du fond du sorcier au fond du joueur :
 *
 *     rangée 0   fond du sorcier        (cases locales 5-9 du camp sorcier)
 *     rangée 1   front du sorcier       (cases locales 0-4)
 *     ------- la ligne neutre -------
 *     rangée 2   front du joueur        (cases locales 0-4)
 *     rangée 3   fond du joueur         (cases locales 5-9)
 *
 * Une créature peut **avancer d'une case** et franchir la ligne neutre par une
 * trouée : elle occupe alors une case du camp adverse. Sa position ne se lit
 * donc plus dans le camp de son propriétaire, mais dans le camp dont elle
 * occupe la case : c'est ce que dit `campPose`, absent tant qu'elle n'a pas
 * bougé (elle occupe alors les cases de son propre camp).
 *
 * ## Les deux sorciers
 *
 * Chaque sorcier se tient **derrière le fond** de son camp : rangée `-1` pour
 * celui du sorcier, rangée `4` pour le vôtre. Une mêlée doit donc atteindre le
 * fond adverse pour le frapper (`distance 1`), et un tireur le frappe depuis le
 * front adverse (`distance 2`) — c'est la règle demandée : « les créatures à
 * distance doivent être à deux cases pour frapper une créature, et le sorcier
 * aussi ».
 *
 * ## La distance
 *
 * **Tchebychev** : `max(|Δrangée|, |Δcolonne|)`. Une case adjacente — devant,
 * en diagonale ou derrière — vaut donc `1`, et deux cases valent `2` dans
 * toutes les directions. C'est exactement la règle de la mêlée « devant, à sa
 * diagonale ou derrière, tant qu'elle est à une case ».
 */

// Aucune importation de `rpgLignes.js` : ce module est le socle géométrique,
// et les lignes s'appuient sur lui (`attaqueDirecteSurLesLignes`). La constante
// est répétée plutôt que d'ouvrir un cycle entre les deux fichiers.
const CASES_PAR_LIGNE = 5;

/** Les quatre rangées du champ, du fond du sorcier au fond du joueur. */
export const RPG_RANGEE_SORCIER_FOND = 0;
export const RPG_RANGEE_SORCIER_FRONT = 1;
export const RPG_RANGEE_JOUEUR_FRONT = 2;
export const RPG_RANGEE_JOUEUR_FOND = 3;
export const RPG_RANGEES = Object.freeze([
  RPG_RANGEE_SORCIER_FOND, RPG_RANGEE_SORCIER_FRONT,
  RPG_RANGEE_JOUEUR_FRONT, RPG_RANGEE_JOUEUR_FOND,
]);

/** Le sorcier du camp adverse se tient derrière le fond de ce camp. */
const RANGEE_SORCIER_ADVERSE = Object.freeze({ sorcier: -1, joueur: 4 });

/** Le camp dont cette créature occupe la grille. Tant qu'elle n'a pas
 *  avancé chez l'adversaire, c'est le sien. */
export function campPoseDe(entite, coteProprietaire) {
  return entite?.campPose === 'joueur' || entite?.campPose === 'sorcier'
    ? entite.campPose
    : coteProprietaire;
}

/** La profondeur d'une case locale : 0 pour le front, 1 pour le fond. */
function profondeur(index) {
  return Number.isInteger(index) && index >= CASES_PAR_LIGNE ? 1 : 0;
}

/** La colonne d'une case locale (0 à 4). */
export function colonneDeCaseLocale(index) {
  return Number.isInteger(index) && index >= 0 ? index % CASES_PAR_LIGNE : 0;
}

/** La rangée absolue d'une case locale d'un camp. */
export function rangeeDeCase(camp, index) {
  const avant = profondeur(index) === 0;
  if (camp === 'sorcier') return avant ? RPG_RANGEE_SORCIER_FRONT : RPG_RANGEE_SORCIER_FOND;
  return avant ? RPG_RANGEE_JOUEUR_FRONT : RPG_RANGEE_JOUEUR_FOND;
}

/** La case locale d'un camp pour une rangée et une colonne — `null` quand la
 *  rangée n'appartient pas à ce camp. */
export function caseLocale(camp, rangee, colonne) {
  if (!Number.isInteger(colonne) || colonne < 0 || colonne >= CASES_PAR_LIGNE) return null;
  if (camp === 'sorcier') {
    if (rangee === RPG_RANGEE_SORCIER_FRONT) return colonne;
    if (rangee === RPG_RANGEE_SORCIER_FOND) return CASES_PAR_LIGNE + colonne;
    return null;
  }
  if (rangee === RPG_RANGEE_JOUEUR_FRONT) return colonne;
  if (rangee === RPG_RANGEE_JOUEUR_FOND) return CASES_PAR_LIGNE + colonne;
  return null;
}

/** Le camp qui possède cette rangée. */
export function campDeRangee(rangee) {
  return rangee <= RPG_RANGEE_SORCIER_FRONT ? 'sorcier' : 'joueur';
}

/** La position absolue d'une créature — `null` quand sa case est inconnue. */
export function positionDe(entite, coteProprietaire) {
  const index = entite?.emplacement;
  if (!Number.isInteger(index) || index < 0 || index >= CASES_PAR_LIGNE * 2) return null;
  const camp = campPoseDe(entite, coteProprietaire);
  return {
    camp,
    index,
    rangee: rangeeDeCase(camp, index),
    colonne: colonneDeCaseLocale(index),
  };
}

/** La ligne (front/fond) d'une position absolue, du point de vue du camp qui
 *  l'occupe. */
export function ligneDePosition(position) {
  if (!position) return 'front';
  return profondeur(position.index) === 1 ? 'fond' : 'front';
}

/** Tchebychev : une case adjacente vaut 1, dans les huit directions. */
export function distanceDeGrille(a, b) {
  if (!a || !b) return null;
  return Math.max(Math.abs(a.rangee - b.rangee), Math.abs(a.colonne - b.colonne));
}

/** La distance entre deux créatures, chacune avec son camp propriétaire. */
export function distanceEntreCreatures(a, coteA, b, coteB) {
  return distanceDeGrille(positionDe(a, coteA), positionDe(b, coteB));
}

/** La distance entre une créature et le **sorcier adverse**. */
export function distanceAuSorcierAdverse(entite, coteProprietaire) {
  const position = positionDe(entite, coteProprietaire);
  if (!position) return null;
  const rangeeSorcier = RANGEE_SORCIER_ADVERSE[coteProprietaire === 'joueur' ? 'sorcier' : 'joueur'];
  return Math.abs(position.rangee - rangeeSorcier);
}

/** Le camp propriétaire d'une créature du duel (`null` si elle n'y est pas). */
export function campDeLaCreature(duel, entite) {
  if (!entite) return null;
  if ((duel?.joueur?.creatures ?? []).includes(entite)) return 'joueur';
  if ((duel?.sorcier?.creatures ?? []).includes(entite)) return 'sorcier';
  return null;
}

/** Le camp du sorcier adverse, pour une créature de ce camp. */
export function campAdverse(cote) {
  return cote === 'joueur' ? 'sorcier' : 'joueur';
}

/** Toutes les cases occupées du champ : la clé est `camp:index`. Une créature
 *  avancée chez l'adversaire y occupe une case du camp adverse. */
export function casesOccupees(duel) {
  const occupees = new Map();
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel?.[cote]?.creatures ?? []) {
      const index = entite?.emplacement;
      if (!Number.isInteger(index) || index < 0 || index >= CASES_PAR_LIGNE * 2) continue;
      occupees.set(`${campPoseDe(entite, cote)}:${index}`, { cote, entite });
    }
  }
  return occupees;
}

/** Les créatures **étrangères** qui occupent la grille de ce camp. */
export function envahisseurs(duel, camp) {
  const adversaire = campAdverse(camp);
  return (duel?.[adversaire]?.creatures ?? [])
    .filter((entite) => campPoseDe(entite, adversaire) === camp);
}

/** Les occupants d'un camp, les siens **et** les envahisseurs, triés par case.
 *  C'est la liste que la rangée dessine : une carte avancée chez l'adversaire
 *  s'affiche dans la rangée qu'elle occupe, pas dans la sienne. */
export function occupantsDeCamp(duel, camp) {
  const occupants = [];
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel?.[cote]?.creatures ?? []) {
      const index = entite?.emplacement;
      if (!Number.isInteger(index) || index < 0 || index >= 10) continue;
      if (campPoseDe(entite, cote) !== camp) continue;
      occupants.push({ entite, cote, index });
    }
  }
  return occupants.sort((a, b) => a.index - b.index);
}
