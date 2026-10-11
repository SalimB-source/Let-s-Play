/**
 * Le Sablier du temps — piles de cartes homonymes (présentation tactile).
 *
 * Au doigt, la zone de jeu est étroite : deux exemplaires de la même carte
 * prennent deux emplacements pour une seule information. On regroupe donc les
 * cartes identiques — exactement comme `rpgTerrainStacks.js` le fait déjà pour
 * les terrains — en conservant l'ordre d'arrivée et les index réels, pour que
 * le jeu (pioche, vol de carte, cible) continue de viser un exemplaire précis.
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
 * Regroupe les entités en jeu qui partagent la même carte. Appelé par camp :
 * deux créatures identiques ne fusionnent jamais d'un côté à l'autre.
 * @param {{ id: string, carteId: string }[]} entites créatures d'un camp
 * @returns {{ carteId: string, entites: object[] }[]} une pile par nom, dans
 *   l'ordre du champ de bataille ; `entites[0]` est la carte de tête.
 */
export function groupEntitesParCarte(entites = []) {
  const piles = new Map();
  for (const entite of entites ?? []) {
    let pile = piles.get(entite.carteId);
    if (!pile) {
      pile = { carteId: entite.carteId, entites: [] };
      piles.set(entite.carteId, pile);
    }
    pile.entites.push(entite);
  }
  return [...piles.values()];
}
