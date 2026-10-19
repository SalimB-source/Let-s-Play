/**
 * Le Sablier — piles de cartes (présentation tactile et équipement).
 *
 * Au doigt, la zone de jeu est étroite : deux exemplaires de la même carte
 * prennent deux emplacements pour une seule information. On regroupe donc les
 * cartes identiques — exactement comme `rpgTerrainStacks.js` le fait déjà pour
 * les terrains — en conservant l'ordre d'arrivée et les index réels, pour que
 * le jeu (pioche, vol de carte, cible) continue de viser un exemplaire précis.
 *
 * Une créature équipée d'une arme ne se regroupe avec personne : son arme
 * fait partie de son état, deux exemplaires ne se confondent donc pas. Elle
 * forme sa propre pile d'exemplaires ; l'équipement, lui, se lit sur son
 * cadre d'acier (voir `armesPortees`).
 */

/**
 * Regroupe les exemplaires identiques d'une main.
 * @param {string[]} main identifiants de cartes, dans l'ordre de la main
 * @returns {{ carteId: string, indices: number[] }[]} une pile par nom, dans
 *   l'ordre de première apparition ; `indices[0]` sert d'index représentant.
 */
export function groupCartesMain(main = []) {
  const piles = new Map();
  (main ?? []).forEach((carteId, index) => {
    let pile = piles.get(carteId);
    if (!pile) {
      pile = { carteId, indices: [] };
      piles.set(carteId, pile);
    }
    pile.indices.push(index);
  });
  return [...piles.values()];
}

/**
 * Les cartes d'arme attachées à une créature en jeu, dans l'ordre où elles
 * ont été portées : l'arme du prototype (`entite.arme`, une seule) puis les
 * armes de l'effet « arme » des magies (`entite.armes`, une liste).
 * @param {{ arme?: { carteId: string } | null, armes?: string[] }} entite
 * @returns {string[]} identifiants de cartes ; vide si la créature est nue.
 */
export function armesPortees(entite) {
  return [
    ...(entite?.arme?.carteId ? [entite.arme.carteId] : []),
    ...(entite?.armes ?? []),
  ];
}

/**
 * Regroupe les entités en jeu qui partagent la même carte. Appelé par camp :
 * deux créatures identiques ne fusionnent jamais d'un côté à l'autre, et une
 * créature armée reste seule dans sa pile. Les exemplaires engagés et
 * dégagés restent dans des piles distinctes.
 * @param {{ id: string, carteId: string }[]} entites créatures d'un camp
 * @returns {{ carteId: string, entites: object[] }[]} une pile par nom, dans
 *   l'ordre du champ de bataille ; `entites[0]` est la carte de tête.
 */
export function groupEntitesParCarte(entites = []) {
  const piles = new Map();
  for (const entite of entites ?? []) {
    const cle = armesPortees(entite).length ? `arme:${entite.id}` : `${entite.carteId}:${entite.attaquee ? "engagee" : "degagee"}`;
    let pile = piles.get(cle);
    if (!pile) {
      pile = { carteId: entite.carteId, entites: [] };
      piles.set(cle, pile);
    }
    pile.entites.push(entite);
  }
  return [...piles.values()];
}
