import { EFFET_LIBELLES, pastillesPourCarte } from './effetIcons.js';

/** Les capacités visibles sur les cartes, et seulement elles : la liste du
 * filtre suit le catalogue (y compris les nouveaux sets) sans entretenir une
 * deuxième liste de mots-clés qui risquerait de diverger des icônes. */
export function capacitesDuCatalogue(cartes) {
  const cles = new Set(cartes.flatMap((carte) => pastillesPourCarte(carte).map(({ cle }) => cle)));
  return [...cles]
    .map((cle) => ({
      cle,
      // Deux pierres distinctes portent « Bouclier » : l'une protège d'une
      // couleur, l'autre absorbe un effet. Garder les choix distinguables.
      label: cle === 'protection' ? 'Bouclier élémentaire' : EFFET_LIBELLES[cle] ?? cle,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr') || a.cle.localeCompare(b.cle, 'fr'));
}

/** Même clé que l'icône imprimée, pas une recherche floue dans le texte :
 * « Envol (furie) » correspond à Envol, mais un mot cité sans capacité ne
 * suffit pas à faire apparaître une carte dans le résultat. */
export function carteACapacite(carte, cle) {
  return cle === 'toutes' || pastillesPourCarte(carte).some((pastille) => pastille.cle === cle);
}
